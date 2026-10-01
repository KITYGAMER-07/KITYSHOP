import crypto from 'node:crypto';
import { dbGetWithEtag, dbPut, dbPatch, dbPost, publicError, sendJson } from '../server/commerce.js';

async function claimForIssuing(orderId) {
  const result = await dbGetWithEtag(`apiCheckoutSessions/${orderId}`);
  const session = result.value;
  if (!session) throw new Error('The payment session was not found.');
  if (session.status === 'fulfilled') return { state: 'fulfilled', session };
  if (session.status === 'issuing') return { state: 'issuing', session };
  if (session.status !== 'created') return { state: 'review', session };
  const next = { ...session, status: 'issuing', issuingAt: Date.now() };
  try {
    await dbPut(`apiCheckoutSessions/${orderId}`, next, { 'if-match': result.headers.get('etag') || '*' });
    return { state: 'claimed', session: next };
  } catch {
    return { state: 'issuing', session: next };
  }
}

export default async function handler(request, response) {
  // See create-payment-order: this allows the Android WebView to call the
  // Vercel endpoint. Razorpay signature verification still protects delivery.
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });
  const body = request.body || {};
  const razorpayOrderId = String(body.razorpay_order_id || '').trim();
  const razorpayPaymentId = String(body.razorpay_payment_id || '').trim();
  const signature = String(body.razorpay_signature || '').trim();
  if (!razorpayOrderId || !razorpayPaymentId || !signature) return sendJson(response, 400, { error: 'Payment verification details are missing.' });

  try {
    const secret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
    const expected = crypto.createHmac('sha256', secret).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
    if (!secret || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return sendJson(response, 400, { error: 'Payment signature verification failed.' });

    const claimed = await claimForIssuing(razorpayOrderId);
    if (claimed.state === 'fulfilled') return sendJson(response, 200, { order: claimed.session.order });
    if (claimed.state === 'issuing') return sendJson(response, 409, { error: 'Your payment is already being delivered. Do not pay again; contact support if the key does not appear shortly.' });
    if (claimed.state === 'review') return sendJson(response, 409, { error: 'This paid order needs a manual review. Please contact support with your Razorpay payment ID.' });
    const session = claimed.session;

    // AIMX_BOT_API_TOKEN is the documented name. BOT_API_KEY is accepted as
    // a compatibility name for an already-configured Vercel project.
    const token = String(process.env.AIMX_BOT_API_TOKEN || process.env.BOT_API_KEY || '').trim();
    if (!token) throw new Error('Bot API token is not configured.');
    const providerResponse = await fetch(process.env.AIMX_BOT_API_URL || 'https://aimx.live/public/api/v1/bot/keys', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ game: session.game, max_devices: session.maxDevices, duration: session.requestedDuration, quantity: session.quantity, type: session.keyType }),
    });
    const provider = await providerResponse.json().catch(() => ({}));
    const keys = Array.isArray(provider?.keys) ? provider.keys.map(item => String(item?.user_key || '').trim()).filter(Boolean) : [];
    if (!providerResponse.ok || provider?.success !== true || keys.length !== Number(session.quantity)) {
      await dbPatch(`apiCheckoutSessions/${razorpayOrderId}`, { status: 'needs_review', providerStatus: providerResponse.status, providerMessage: String(provider?.message || provider?.error || 'Provider did not return the requested keys.'), reviewedAt: null });
      return sendJson(response, 502, { error: 'Payment was verified, but key delivery needs a manual review. Please contact support with your payment ID. Do not pay again.' });
    }

    const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`;
    const order = {
      orderId,
      productId: session.productId,
      productName: session.productName,
      durationId: session.durationId,
      durationName: session.durationName,
      originalPrice: session.originalPrice,
      discountAmount: session.discountAmount,
      finalAmount: session.finalAmount,
      couponCode: session.coupon?.code || null,
      licenseKey: keys[0],
      licenseKeys: keys,
      keyType: session.keyType,
      keyQuantity: session.quantity,
      maxDevices: session.maxDevices,
      deliverySource: 'aimx-api',
      paymentId: razorpayPaymentId,
      status: 'paid',
      customerEmail: session.customerEmail,
      ...(session.emailDeliveryEnabled ? { emailDeliveryStatus: 'pending' } : {}),
      createdAt: Date.now(),
    };
    const storedOrder = await dbPost('orders', order);
    const finalOrder = { ...order, id: storedOrder?.name || '' };
    await dbPost('payments', { orderId, paymentId: razorpayPaymentId, amount: session.finalAmount, gateway: 'razorpay', status: 'success', razorpayOrderId, createdAt: Date.now() });
    if (session.coupon?.id) await dbPatch(`coupons/${session.coupon.id}`, { usageCount: Number(session.coupon.usageCount || 0) + 1 });
    await dbPatch(`apiCheckoutSessions/${razorpayOrderId}`, { status: 'fulfilled', fulfilledAt: Date.now(), paymentId: razorpayPaymentId, order: finalOrder, providerQuotaRemaining: provider.remaining_quota ?? null });
    return sendJson(response, 200, { order: finalOrder });
  } catch (error) {
    console.error('Verify and issue failed:', error?.message);
    if (razorpayOrderId) {
      try { await dbPatch(`apiCheckoutSessions/${razorpayOrderId}`, { status: 'needs_review', reviewReason: 'Unexpected delivery error', reviewUpdatedAt: Date.now() }); } catch { /* Preserve the original error. */ }
    }
    return sendJson(response, 500, { error: publicError(error, 'Payment was received but key delivery needs a manual review. Please contact support with your payment ID. Do not pay again.') });
  }
}
