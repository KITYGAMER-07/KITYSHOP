import { dbPut, isValidEmail, publicError, randomId, resolveStoreSelection, sendJson } from './reseller-commerce.js';

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*'); response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS'); response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });
  try {
    const body = request.body || {}; if (!isValidEmail(body.customerEmail)) return sendJson(response, 400, { error: 'Enter a valid email address for the order receipt.' });
    const selection = await resolveStoreSelection(body); const keyId = String(process.env.RAZORPAY_KEY_ID || selection.platform?.razorpayKeyId || '').trim(); const secret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
    if (!keyId || !secret) return sendJson(response, 503, { error: 'Secure checkout is not configured. Contact the store owner.' });
    const receipt = randomId('osh_').slice(0, 40); const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', { method: 'POST', headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${secret}`).toString('base64')}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: Math.round(selection.finalAmount * 100), currency: 'INR', receipt, notes: { source: 'online-shop-reseller', store_code: selection.storeCode, product: selection.productName, quantity: String(selection.quantity) } }) });
    const razorpayOrder = await razorpayResponse.json().catch(() => ({})); if (!razorpayResponse.ok || !razorpayOrder?.id) throw new Error('Razorpay could not create a secure payment order.');
    await dbPut(`checkoutSessions/${razorpayOrder.id}`, { ...selection, customerEmail: String(body.customerEmail).trim().toLowerCase(), razorpayOrderId: razorpayOrder.id, receipt, status: 'created', createdAt: Date.now() });
    return sendJson(response, 200, { orderId: razorpayOrder.id, amount: razorpayOrder.amount, currency: 'INR', keyId, displayAmount: selection.finalAmount });
  } catch (error) { console.error('Create reseller checkout failed:', error?.message); return sendJson(response, 400, { error: publicError(error, 'Unable to start checkout. Please try again.') }); }
}


