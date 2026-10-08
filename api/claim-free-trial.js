import { dbGet, dbGetWithEtag, dbPut, dbPatch, randomId, sendJson, validateProviderDuration } from '../server/commerce.js';

const MAX_RESERVATION_RETRIES = 5;

function freeTrialUnavailable(response) {
  return sendJson(response, 429, { error: 'Free trial is currently unavailable. Please try again later.' });
}

async function reserveFreeTrialSlot(limit, reservationId) {
  for (let attempt = 0; attempt < MAX_RESERVATION_RETRIES; attempt += 1) {
    const snapshot = await dbGetWithEtag('freeTrialApiCounter');
    const current = snapshot.value || {};
    const issued = Math.max(0, Number(current.issued || 0));
    const reserved = Math.max(0, Number(current.reserved || 0));
    if (issued + reserved >= limit) return false;

    const next = {
      ...current,
      issued,
      reserved: reserved + 1,
      updatedAt: Date.now(),
      reservations: { ...(current.reservations || {}), [reservationId]: Date.now() }
    };
    try {
      await dbPut('freeTrialApiCounter', next, { 'if-match': snapshot.headers.get('etag') || '*' });
      return true;
    } catch {
      // A simultaneous claim changed the counter. Read the current version and retry.
    }
  }
  return false;
}

async function finishFreeTrialReservation(reservationId, succeeded) {
  for (let attempt = 0; attempt < MAX_RESERVATION_RETRIES; attempt += 1) {
    const snapshot = await dbGetWithEtag('freeTrialApiCounter');
    const current = snapshot.value || {};
    const reservations = { ...(current.reservations || {}) };
    if (!Object.prototype.hasOwnProperty.call(reservations, reservationId)) return;
    delete reservations[reservationId];
    const next = {
      ...current,
      issued: Math.max(0, Number(current.issued || 0)) + (succeeded ? 1 : 0),
      failed: Math.max(0, Number(current.failed || 0)) + (succeeded ? 0 : 1),
      reserved: Math.max(0, Number(current.reserved || 0) - 1),
      reservations,
      updatedAt: Date.now()
    };
    try {
      await dbPut('freeTrialApiCounter', next, { 'if-match': snapshot.headers.get('etag') || '*' });
      return;
    } catch {
      // Retry without ever double-counting the reservation.
    }
  }
}

export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (request.method === 'OPTIONS') return response.status(204).end();
  if (request.method !== 'POST') return sendJson(response, 405, { error: 'Method not allowed.' });

  const claimId = randomId('trl_');
  let hasReservation = false;

  try {
    const websiteSettings = await dbGet('settings/website') || {};
    const config = websiteSettings.freeTrialApi || {};
    const totalLimit = Math.floor(Number(config.totalLimit || 50));
    if (websiteSettings.freeTrialEnabled === false || config.enabled === false || totalLimit < 1) {
      return freeTrialUnavailable(response);
    }

    const duration = validateProviderDuration(config.apiDuration || '2h');
    const game = String(config.game || websiteSettings.autoKeyDelivery?.defaultGame || 'BGMI').trim();
    const maxDevices = Math.max(1, Math.floor(Number(config.maxDevices || 1)));
    if (!game) return freeTrialUnavailable(response);

    const products = await dbGet('products') || {};
    const requestedProduct = products[config.productId];
    const productEntry = requestedProduct && requestedProduct.enabled !== false
      ? [config.productId, requestedProduct]
      : Object.entries(products).find(([, product]) => product && product.enabled !== false);
    if (!productEntry) return freeTrialUnavailable(response);
    const [productId, product] = productEntry;

    hasReservation = await reserveFreeTrialSlot(totalLimit, claimId);
    if (!hasReservation) return freeTrialUnavailable(response);

    const token = String(process.env.AIMX_BOT_API_TOKEN || process.env.BOT_API_KEY || '').trim();
    if (!token) throw new Error('Bot API token is not configured.');
    const providerResponse = await fetch(process.env.AIMX_BOT_API_URL || 'https://aimx.live/api/v1/bot/keys', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, max_devices: maxDevices, duration, quantity: 1, type: 'trial' })
    });
    const provider = await providerResponse.json().catch(() => ({}));
    const key = String(provider?.keys?.[0]?.user_key || '').trim();
    if (!providerResponse.ok || provider?.success !== true || !key) {
      throw new Error(String(provider?.message || provider?.error || 'Provider did not return a free trial key.'));
    }

    const claim = {
      id: claimId,
      key,
      productId,
      productName: String(product.name || 'Digital Key'),
      game,
      duration,
      maxDevices,
      status: 'success',
      createdAt: Date.now()
    };
    await dbPut(`freeTrialClaims/${claimId}`, claim);
    await finishFreeTrialReservation(claimId, true);
    hasReservation = false;
    return sendJson(response, 200, { claim });
  } catch (error) {
    console.error('Free trial claim failed:', error?.message);
    if (hasReservation) {
      try { await finishFreeTrialReservation(claimId, false); } catch { /* Preserve the public response. */ }
    }
    try {
      await dbPatch(`freeTrialClaims/${claimId}`, {
        id: claimId,
        status: 'failed',
        error: 'Provider request failed',
        createdAt: Date.now()
      });
    } catch { /* Stats are optional when Firebase itself is unavailable. */ }
    return freeTrialUnavailable(response);
  }
}
