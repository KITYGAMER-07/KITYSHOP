import crypto from 'node:crypto';

const DEFAULT_DATABASE_URL = 'https://novaespstore-default-rtdb.asia-southeast1.firebasedatabase.app';
const DEFAULT_BRAND_ROOT = 'brands/peakloader-shop';

export function sendJson(response, status, body) { response.status(status).json(body); }
export function getDatabaseUrl() { return String(process.env.FIREBASE_DATABASE_URL || DEFAULT_DATABASE_URL).replace(/\/$/, ''); }
export function getBrandRoot() { return String(process.env.FIREBASE_BRAND_ROOT || DEFAULT_BRAND_ROOT).replace(/^\/+|\/+$/g, ''); }

function firebaseUrl(path) { return `${getDatabaseUrl()}/${getBrandRoot()}/${String(path).replace(/^\/+|\/+$/g, '')}.json`; }
async function firebaseRequest(path, options = {}) {
  const { headers: extraHeaders = {}, ...requestOptions } = options;
  const response = await fetch(firebaseUrl(path), { ...requestOptions, headers: { 'Content-Type': 'application/json', ...extraHeaders } });
  const raw = await response.text();
  let value = null;
  try { value = raw ? JSON.parse(raw) : null; } catch { value = raw; }
  if (!response.ok) { const error = new Error(`Firebase ${options.method || 'GET'} failed (${response.status}).`); error.status = response.status; error.detail = value; throw error; }
  return { value, headers: response.headers };
}
export async function dbGet(path) { return (await firebaseRequest(path)).value; }
export async function dbPut(path, value, headers = {}) { return (await firebaseRequest(path, { method: 'PUT', headers, body: JSON.stringify(value) })).value; }
export async function dbPatch(path, value) { return (await firebaseRequest(path, { method: 'PATCH', body: JSON.stringify(value) })).value; }
export async function dbPost(path, value) { return (await firebaseRequest(path, { method: 'POST', body: JSON.stringify(value) })).value; }
export async function dbGetWithEtag(path) { return firebaseRequest(path, { headers: { 'X-Firebase-ETag': 'true' } }); }
export function randomId(prefix = '') { return `${prefix}${crypto.randomBytes(10).toString('hex')}`; }
export function isValidEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }

function numberFromName(value) { const match = String(value || '').match(/\d+(?:\.\d+)?/); return match ? Number(match[0]) : NaN; }
export function defaultProviderDuration(duration) {
  const amount = numberFromName(duration?.name);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('The selected duration needs a number in its name, for example 5 Hours.');
  switch (duration?.unit) { case 'hours': return `${amount}h`; case 'days': return `${amount}d`; case 'weeks': return `${amount * 7}d`; case 'months': return `${amount * 30}d`; case 'years': return `${amount * 365}d`; default: throw new Error('The selected duration has an invalid unit.'); }
}
export function validateProviderDuration(value) { if (!/^\d+(?:\.\d+)?(?:h|d)$/i.test(String(value || '').trim())) throw new Error('API duration must be written like 5h, 1d, or 7d.'); return String(value).trim().toLowerCase(); }
function normalizedQuantityList(value) { const source = Array.isArray(value) ? value : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]; return [...new Set(source.map(Number).filter(number => Number.isInteger(number) && number >= 1 && number <= 10))].sort((a, b) => a - b); }
function getMatchingCoupon(coupons, code, prebooking = false) {
  const normalized = String(code || '').trim().toUpperCase(); if (!normalized) return null;
  const coupon = Object.entries(coupons || {}).map(([id, value]) => ({ id, ...(value || {}) })).find(value => String(value.code || '').trim().toUpperCase() === normalized);
  if (!coupon || coupon.active === false) throw new Error('This coupon is not available.');
  if (coupon.prebookingOnly && !prebooking) throw new Error('This coupon is valid for pre-booking only.');
  if (Number(coupon.usageLimit || 0) > 0 && Number(coupon.usageCount || 0) >= Number(coupon.usageLimit)) throw new Error('This coupon has reached its usage limit.');
  if (coupon.expiryDate && new Date(`${coupon.expiryDate}T23:59:59`).getTime() < Date.now()) throw new Error('This coupon has expired.');
  return coupon;
}
export async function resolvePaidSelection(input) {
  const [products, durations, prices, websiteSettings, coupons, razorpaySettings] = await Promise.all([dbGet('products'), dbGet('durations'), dbGet('prices'), dbGet('settings/website'), dbGet('coupons'), dbGet('settings/razorpay')]);
  const product = products?.[input.productId], duration = durations?.[input.durationId];
  if (!product || product.enabled === false) throw new Error('The selected product is unavailable.');
  if (!duration || duration.productId !== input.productId) throw new Error('The selected duration is unavailable.');
  const settings = websiteSettings || {}, auto = settings.autoKeyDelivery || {};
  if (auto.enabled === false) throw new Error('API key delivery is temporarily disabled by the store.');
  const perDuration = auto.durationConfigs?.[input.durationId] || {};
  if (perDuration.enabled === false) throw new Error('API key delivery is disabled for this duration.');
  const keyType = input.keyType === 'trial' ? 'trial' : 'prime';
  const typeEnabled = keyType === 'prime' ? (perDuration.primeEnabled ?? auto.primeEnabled ?? true) : (perDuration.trialEnabled ?? auto.trialEnabled ?? true);
  if (!typeEnabled) throw new Error(`${keyType === 'prime' ? 'Prime' : 'Trial'} keys are not available for this duration.`);
  const quantity = Number(input.quantity), allowedQuantities = normalizedQuantityList(perDuration.allowedQuantities ?? auto.allowedQuantities);
  if (!allowedQuantities.includes(quantity)) throw new Error('The selected key quantity is not available.');
  const maxDevices = Math.max(1, Math.floor(Number(perDuration.maxDevices ?? auto.defaultMaxDevices ?? 1))), game = String(perDuration.game || auto.defaultGame || 'BGMI').trim();
  if (!game) throw new Error('Choose a game name in Auto API Delivery settings.');
  const priceRecord = Object.values(prices || {}).find(value => value?.productId === input.productId && value?.durationId === input.durationId);
  const typePrice = keyType === 'prime' ? perDuration.primePrice : perDuration.trialPrice, singleKeyPrice = Number(typePrice ?? priceRecord?.price);
  if (!Number.isFinite(singleKeyPrice) || singleKeyPrice <= 0) throw new Error('Set a valid price for this key type in the admin panel.');
  const originalPrice = Math.round(singleKeyPrice * quantity * 100) / 100, coupon = getMatchingCoupon(coupons, input.couponCode);
  if (coupon?.minOrderValue && originalPrice < Number(coupon.minOrderValue)) throw new Error(`Coupon requires a minimum order of ₹${coupon.minOrderValue}.`);
  const rawDiscount = coupon?.type === 'percentage' ? Math.round((originalPrice * Number(coupon.value || 0)) * 100) / 100 : Number(coupon?.value || 0);
  const discountAmount = Math.min(originalPrice, Math.max(0, rawDiscount)), finalAmount = Math.round((originalPrice - discountAmount) * 100) / 100;
  if (finalAmount <= 0) throw new Error('The final amount must be greater than ₹0.');
  return { productId: input.productId, productName: String(product.name || 'Digital Key'), durationId: input.durationId, durationName: `${duration.name} (${duration.unit})`, keyType, quantity, maxDevices, game, requestedDuration: validateProviderDuration(perDuration.apiDuration || defaultProviderDuration(duration)), singleKeyPrice, originalPrice, discountAmount, finalAmount, coupon: coupon ? { id: coupon.id, code: coupon.code, usageCount: Number(coupon.usageCount || 0) } : null, emailDeliveryEnabled: settings.emailDeliveryEnabled === true, razorpayKeyId: String(process.env.RAZORPAY_KEY_ID || razorpaySettings?.keyId || '').trim() };
}
export function publicError(error, fallback = 'Something went wrong. Please contact support.') { const message = String(error?.message || ''); return message.startsWith('The selected') || message.includes('coupon') || message.includes('Coupon') || message.includes('price') || message.includes('Price') || message.includes('duration') || message.includes('Duration') || message.includes('key delivery') || message.includes('keys are not') || message.includes('game') || message.includes('Game') ? message : fallback; }
