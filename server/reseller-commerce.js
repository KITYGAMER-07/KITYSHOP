import crypto from 'node:crypto';

const DATABASE_URL = 'https://novaespstore-default-rtdb.asia-southeast1.firebasedatabase.app';
const ROOT = 'brands/online-shop';
export const sendJson = (response, status, body) => response.status(status).json(body);
export const randomId = (prefix = '') => `${prefix}${crypto.randomBytes(10).toString('hex')}`;
export const isValidEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());
export const normalizeStoreCode = value => String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32);
export const getDatabaseUrl = () => String(process.env.FIREBASE_DATABASE_URL || DATABASE_URL).replace(/\/$/, '');
const firebaseUrl = path => `${getDatabaseUrl()}/${ROOT}/${String(path).replace(/^\/+|\/+$/g, '')}.json`;

async function request(path, options = {}) {
  const { headers: extraHeaders = {}, ...rest } = options;
  const response = await fetch(firebaseUrl(path), { ...rest, headers: { 'Content-Type': 'application/json', ...extraHeaders } });
  const raw = await response.text(); let value = null; try { value = raw ? JSON.parse(raw) : null; } catch { value = raw; }
  if (!response.ok) { const error = new Error(`Firebase ${options.method || 'GET'} failed (${response.status}).`); error.status = response.status; error.detail = value; throw error; }
  return { value, headers: response.headers };
}
export const dbGet = async path => (await request(path)).value;
export const dbPut = async (path, value, headers = {}) => (await request(path, { method: 'PUT', headers, body: JSON.stringify(value) })).value;
export const dbPatch = async (path, value) => (await request(path, { method: 'PATCH', body: JSON.stringify(value) })).value;
export const dbPost = async (path, value) => (await request(path, { method: 'POST', body: JSON.stringify(value) })).value;
export const dbGetWithEtag = path => request(path, { headers: { 'X-Firebase-ETag': 'true' } });

function numberFromName(value) { const match = String(value || '').match(/\d+(?:\.\d+)?/); return match ? Number(match[0]) : NaN; }
function defaultProviderDuration(duration) { const amount = numberFromName(duration?.name); if (!Number.isFinite(amount) || amount <= 0) throw new Error('The selected duration needs a number in its name.'); const unit = String(duration?.unit || '').toLowerCase(); if (unit === 'hours') return `${amount}h`; if (unit === 'days') return `${amount}d`; if (unit === 'weeks') return `${amount * 7}d`; if (unit === 'months') return `${amount * 30}d`; return `${amount}d`; }
function validApiDuration(value, duration) { const result = String(value || defaultProviderDuration(duration)).trim().toLowerCase(); if (!/^\d+(?:\.\d+)?(?:h|d)$/.test(result)) throw new Error('API duration must be in 6h or 1d format.'); return result; }
function plainList(value) { return Object.entries(value || {}).map(([id, item]) => ({ id, ...(item || {}) })); }
function collectionItem(collection, id) { const wanted = String(id || ''); if (!wanted) return null; if (collection && collection[wanted]) return { id: wanted, ...(collection[wanted] || {}) }; return plainList(collection).find(item => String(item.id) === wanted) || null; }
function sameId(left, right) { return String(left || '') === String(right || ''); }
function stockCount(keys, productId, durationId) { return plainList(keys).filter(key => sameId(key.productId, productId) && sameId(key.durationId, durationId) && key.used !== true).length; }

export async function resolveStoreSelection(input) {
  const storeCode = normalizeStoreCode(input.storeCode); if (storeCode.length < 3) throw new Error('A valid Store Code is required.');
  const base = `stores/${storeCode}`;
  const [meta, products, durations, prices, apiConfigs, licenseKeys, platform] = await Promise.all([dbGet(`${base}/meta`), dbGet(`${base}/products`), dbGet(`${base}/durations`), dbGet(`${base}/prices`), dbGet(`${base}/apiConfigs`), dbGet(`${base}/licenseKeys`), dbGet('platform')]);
  if (!meta || meta.active === false) throw new Error('This store is currently unavailable.');
  if (meta.maintenanceEnabled === true) throw new Error('This store is under maintenance. Please try again later.');
  const product = collectionItem(products, input.productId); const duration = collectionItem(durations, input.durationId); if (!product || product.enabled === false) throw new Error('The selected product is unavailable. Refresh the store and choose the product again.'); if (!duration || !sameId(duration.productId, product.id)) throw new Error('The selected duration is unavailable. Refresh the store and choose the duration again.');
  const price = plainList(prices).find(item => sameId(item.productId, product.id) && sameId(item.durationId, duration.id)); const singleKeyPrice = Number(price?.price || 0); if (!Number.isFinite(singleKeyPrice) || singleKeyPrice <= 0) throw new Error('The selected duration does not have a valid price.');
  const quantity = Math.max(1, Math.min(10, Math.floor(Number(input.quantity || 1)))); const apiConfig = collectionItem(apiConfigs, duration.id) || {}; const apiEnabled = apiConfig.enabled === true; const availableStock = stockCount(licenseKeys, product.id, duration.id);
  if (!apiEnabled && availableStock < quantity) throw new Error('This option is sold out. Please choose another duration or contact the store owner.');
  const finalAmount = Math.round(singleKeyPrice * quantity * 100) / 100;
  return { storeCode, base, productId: product.id, productName: String(product.name || 'Digital Key'), durationId: duration.id, durationName: String(duration.name || 'Access'), quantity, singleKeyPrice, originalPrice: finalAmount, finalAmount, apiEnabled, availableStock, game: String(apiConfig.game || 'BGMI'), maxDevices: Math.max(1, Math.floor(Number(apiConfig.maxDevices || 1))), requestedDuration: validApiDuration(apiConfig.apiDuration, duration), platform: platform || {}, storeName: String(meta.storeName || 'Online Shop') };
}

export async function reserveManualKeys(selection, orderId) {
  const path = `${selection.base}/licenseKeys`; const collection = await dbGet(path); const candidates = plainList(collection).filter(key => sameId(key.productId, selection.productId) && sameId(key.durationId, selection.durationId) && key.used !== true);
  const reserved = [];
  for (const candidate of candidates) {
    if (reserved.length >= selection.quantity) break;
    const keyPath = `${path}/${candidate.id}`; const latest = await dbGetWithEtag(keyPath); const key = latest.value;
    if (!key || key.used === true) continue;
    try { await dbPut(keyPath, { ...key, used: true, orderId, usedAt: Date.now() }, { 'if-match': latest.headers.get('etag') || '*' }); reserved.push(String(key.key)); } catch { /* another purchase reserved it; safely try the next one */ }
  }
  if (reserved.length !== selection.quantity) {
    for (const key of reserved) { const entry = plainList(await dbGet(path)).find(item => item.key === key && item.orderId === orderId); if (entry) await dbPatch(`${path}/${entry.id}`, { used: false, orderId: null, usedAt: null }); }
    throw new Error('Manual key stock changed during checkout. Your payment is safe; contact the store owner for delivery.');
  }
  return reserved;
}

async function requestProviderKeys(selection) {
  const token = String(process.env.AIMX_BOT_API_TOKEN || process.env.BOT_API_KEY || '').trim(); if (!token) throw new Error('Paid API token is not configured.');
  const url = new URL(process.env.AIMX_BOT_API_URL || 'https://aimx.live/public/api/v1/bot/keys'); url.searchParams.set('token', token); url.searchParams.set('game', selection.game); url.searchParams.set('max_devices', String(selection.maxDevices)); url.searchParams.set('duration', selection.requestedDuration); url.searchParams.set('quantity', String(selection.quantity));
  const response = await fetch(url, { method: 'GET' }); const data = await response.json().catch(() => ({})); const source = Array.isArray(data?.keys) ? data.keys : (Array.isArray(data?.data?.keys) ? data.data.keys : []); const keys = source.map(item => String(item?.user_key || item?.key || item || '').trim()).filter(Boolean);
  if (!response.ok || data?.success === false || keys.length !== selection.quantity) throw new Error(String(data?.message || data?.error || 'Paid API did not return the requested key.'));
  return keys;
}

export async function deliverKeys(selection, orderId) {
  if (selection.apiEnabled) {
    try { return { keys: await requestProviderKeys(selection), source: 'aimx-api', fallbackReason: null }; }
    catch (error) { if (selection.availableStock >= selection.quantity) return { keys: await reserveManualKeys(selection, orderId), source: 'manual-stock', fallbackReason: String(error?.message || 'API delivery failed') }; throw error; }
  }
  return { keys: await reserveManualKeys(selection, orderId), source: 'manual-stock', fallbackReason: null };
}

export function publicError(error, fallback = 'Something went wrong. Please contact the store owner.') { const message = String(error?.message || ''); return message.includes('Store Code') || message.includes('store') || message.includes('selected') || message.includes('valid price') || message.includes('sold out') || message.includes('Manual key') || message.includes('API duration') ? message : fallback; }


