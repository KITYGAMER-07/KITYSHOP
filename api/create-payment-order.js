import { dbPut, randomId, resolvePaidSelection, isValidEmail, publicError, sendJson } from '../server/commerce.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });
  try {
    const body = request.body || {};
    if (!isValidEmail(body.customerEmail)) return sendJson(response, 400, { error: 'Enter a valid email address to receive the license key.' });

    const selection = await resolvePaidSelection(body);
    const keySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (!selection.razorpayKeyId || !keySecret) {
      return sendJson(response, 503, { error: 'Secure Razorpay checkout is not configured. Ask the store owner to add RAZORPAY_KEY_SECRET in Vercel.' });
    }

    const receipt = randomId('pk_').slice(0, 40);
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${selection.razorpayKeyId}:${keySecret}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: Math.round(selection.finalAmount * 100), currency: 'INR', receipt, notes: { source: 'peakesp-auto-api', product: selection.productName, quantity: String(selection.quantity), keyType: selection.keyType } }),
    });
    const razorpayOrder = await razorpayResponse.json();
    if (!razorpayResponse.ok || !razorpayOrder?.id) throw new Error('Razorpay could not create a secure payment order.');

    const session = {
      ...selection,
      customerEmail: String(body.customerEmail).trim().toLowerCase(),
      razorpayOrderId: razorpayOrder.id,
      receipt,
      status: 'created',
      createdAt: Date.now(),
    };
    await dbPut(`apiCheckoutSessions/${razorpayOrder.id}`, session);
    return sendJson(response, 200, { orderId: razorpayOrder.id, amount: razorpayOrder.amount, currency: 'INR', keyId: selection.razorpayKeyId, displayAmount: selection.finalAmount });
  } catch (error) {
    console.error('Create payment order failed:', error?.message);
    return sendJson(response, 400, { error: publicError(error, 'Unable to start secure payment. Please try again.') });
  }
}
