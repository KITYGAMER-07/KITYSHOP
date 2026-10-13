import crypto from 'node:crypto';
import { dbGetWithEtag, dbPatch, dbPost, dbPut, deliverKeys, publicError, sendJson } from './reseller-commerce.js';

async function claim(orderId) {
  const current = await dbGetWithEtag(`checkoutSessions/${orderId}`); const session = current.value; if (!session) throw new Error('Payment session was not found.');
  if (session.status === 'fulfilled') return { state: 'fulfilled', session }; if (session.status === 'issuing') return { state: 'issuing', session }; if (session.status !== 'created') return { state: 'review', session };
  try { const next = { ...session, status: 'issuing', issuingAt: Date.now() }; await dbPut(`checkoutSessions/${orderId}`, next, { 'if-match': current.headers.get('etag') || '*' }); return { state: 'claimed', session: next }; } catch { return { state: 'issuing', session }; }
}
export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*'); response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') return response.status(204).end(); if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });
  const body = request.body || {}; const razorpayOrderId = String(body.razorpay_order_id || '').trim(); const paymentId = String(body.razorpay_payment_id || '').trim(); const signature = String(body.razorpay_signature || '').trim();
  if (!razorpayOrderId || !paymentId || !signature) return sendJson(response, 400, { error: 'Payment verification details are missing.' });
  try {
    const secret = String(process.env.RAZORPAY_KEY_SECRET || '').trim(); const expected = crypto.createHmac('sha256', secret).update(`${razorpayOrderId}|${paymentId}`).digest('hex'); if (!secret || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return sendJson(response, 400, { error: 'Payment signature verification failed.' });
    const claimed = await claim(razorpayOrderId); if (claimed.state === 'fulfilled') return sendJson(response, 200, { order: claimed.session.order }); if (claimed.state === 'issuing') return sendJson(response, 409, { error: 'Your payment is already being delivered. Please wait a moment.' }); if (claimed.state === 'review') return sendJson(response, 409, { error: 'This paid order needs a manual review. Please contact the store owner.' });
    const session = claimed.session; const orderId = `ORD-${Math.floor(100000 + Math.random() * 900000)}`; const delivery = await deliverKeys(session, orderId); const order = { orderId, storeCode: session.storeCode, productId: session.productId, productName: session.productName, durationId: session.durationId, durationName: session.durationName, originalPrice: session.originalPrice, finalAmount: session.finalAmount, keyQuantity: session.quantity, licenseKey: delivery.keys[0], licenseKeys: delivery.keys, deliverySource: delivery.source, fallbackReason: delivery.fallbackReason, paymentId, razorpayOrderId, customerEmail: session.customerEmail, status: 'paid', createdAt: Date.now() };
    const stored = await dbPost(`${session.base}/orders`, order); const finalOrder = { ...order, id: stored?.name || '' }; await dbPost(`${session.base}/payments`, { orderId, paymentId, amount: session.finalAmount, gateway: 'razorpay', status: 'success', razorpayOrderId, createdAt: Date.now() }); await dbPatch(`checkoutSessions/${razorpayOrderId}`, { status: 'fulfilled', fulfilledAt: Date.now(), paymentId, order: finalOrder }); return sendJson(response, 200, { order: finalOrder });
  } catch (error) { console.error('Delivery error:', error?.message); try { if (razorpayOrderId) await dbPatch(`checkoutSessions/${razorpayOrderId}`, { status: 'needs_review', reviewReason: String(error?.message || 'Unknown delivery error'), reviewUpdatedAt: Date.now() }); } catch { /* preserve delivery error */ } return sendJson(response, 500, { error: publicError(error, 'Payment was verified but key delivery needs manual review. Do not pay again.') }); }
}


