/*
 * PeakLoader Shop – free Gmail license delivery
 *
 * SETUP (run setup() one time from script.google.com):
 * 1. Create a new Google Apps Script project using the Gmail account you want
 *    to send from.
 * 2. Paste this complete file and save it.
 * 3. Select setup from the function dropdown, click Run, and authorize access.
 * 4. The script creates a secure one-minute timer. Do not deploy it as a web app.
 *
 * This script reads only paid, normal orders marked emailDeliveryStatus: "pending"
 * from Firebase and then changes each successfully sent order to "sent".
 */

const FIREBASE_DATABASE_URL = 'https://novaespstore-default-rtdb.asia-southeast1.firebasedatabase.app';
const BRAND_ROOT = 'brands/peakloader-shop';
const MAX_EMAILS_PER_RUN = 10;

function setup() {
  removeExistingTriggers_();
  ScriptApp.newTrigger('sendPendingLicenseEmails')
    .timeBased()
    .everyMinutes(1)
    .create();

  // Requests Gmail permission now, rather than failing on the first timer run.
  MailApp.getRemainingDailyQuota();
  Logger.log('PeakLoader Shop email delivery is ready. Pending orders are checked every minute.');
}

function sendPendingLicenseEmails() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(5000)) return;

  try {
    const remainingQuota = MailApp.getRemainingDailyQuota();
    if (remainingQuota < 1) {
      Logger.log('Daily Gmail quota reached. Pending orders will retry after the quota resets.');
      return;
    }

    const settings = getFirebaseJson_('settings/website') || {};
    const orders = getFirebaseJson_('orders') || {};
    const pendingOrders = Object.entries(orders)
      .map(([id, order]) => ({ id: id, order: order || {} }))
      .filter(({ order }) => isReadyForDelivery_(order))
      .sort((a, b) => Number(a.order.createdAt || 0) - Number(b.order.createdAt || 0))
      .slice(0, Math.min(MAX_EMAILS_PER_RUN, remainingQuota));

    pendingOrders.forEach(({ id, order }) => {
      try {
        const brand = getBrand_(settings);
        const recipient = String(order.customerEmail || '').trim();
        const subject = `${brand.storeName} License Key — ${String(order.orderId || 'Order')}`;
        const inlineImages = getInlineLogo_(brand.logoUrl);

        const emailOptions = {
          htmlBody: buildHtml_(order, brand, Boolean(inlineImages.store_logo)),
          name: brand.storeName
        };
        if (brand.replyTo) emailOptions.replyTo = brand.replyTo;
        if (inlineImages.store_logo) emailOptions.inlineImages = inlineImages;
        GmailApp.sendEmail(recipient, subject, buildPlainText_(order, brand), emailOptions);

        patchFirebaseJson_(`orders/${id}`, {
          emailDeliveryStatus: 'sent',
          emailSentAt: Date.now()
        });
      } catch (error) {
        Logger.log(`Email failed for order ${id}: ${error}`);
        patchFirebaseJson_(`orders/${id}`, { emailDeliveryStatus: 'failed' });
      }
    });
  } finally {
    lock.releaseLock();
  }
}

function testFirebaseConnection() {
  const settings = getFirebaseJson_('settings/website') || {};
  Logger.log(`Firebase connected. Store: ${getBrand_(settings).storeName}`);
}

function removeExistingTriggers_() {
  ScriptApp.getProjectTriggers()
    .filter(trigger => trigger.getHandlerFunction() === 'sendPendingLicenseEmails')
    .forEach(trigger => ScriptApp.deleteTrigger(trigger));
}

function getFirebaseJson_(path) {
  const scopedPath = `${BRAND_ROOT}/${String(path).replace(/^\/+/, '')}`;
  const response = UrlFetchApp.fetch(`${FIREBASE_DATABASE_URL}/${scopedPath}.json`, {
    method: 'get',
    muteHttpExceptions: true
  });
  assertFirebaseResponse_(response, `read ${scopedPath}`);
  return JSON.parse(response.getContentText() || 'null');
}

function patchFirebaseJson_(path, data) {
  const scopedPath = `${BRAND_ROOT}/${String(path).replace(/^\/+/, '')}`;
  const response = UrlFetchApp.fetch(`${FIREBASE_DATABASE_URL}/${scopedPath}.json`, {
    method: 'patch',
    contentType: 'application/json',
    payload: JSON.stringify(data),
    muteHttpExceptions: true
  });
  assertFirebaseResponse_(response, `update ${scopedPath}`);
}

function assertFirebaseResponse_(response, action) {
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error(`Firebase ${action} failed (${status}): ${response.getContentText()}`);
  }
}

function isReadyForDelivery_(order) {
  const email = String(order.customerEmail || '').trim();
  return order.status === 'paid' &&
    order.orderType !== 'prebooking' &&
    order.emailDeliveryStatus === 'pending' &&
    order.licenseKey !== 'NO-KEY-AVAILABLE-CONTACT-ADMIN' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getBrand_(settings) {
  return {
    storeName: String(settings.emailSenderName || settings.websiteName || 'PeakLoader Shop').trim(),
    logoUrl: String(settings.emailLogoUrl || settings.websiteLogoUrl || '').trim(),
    replyTo: String(settings.emailReplyTo || '').trim()
  };
}

// Gmail can block or defer loading a remote <img> URL. Fetching the public logo
// in the private script and attaching it as cid:store_logo makes it display
// reliably in the delivered email.
function getInlineLogo_(logoUrl) {
  if (!/^https:\/\//i.test(logoUrl)) return {};

  try {
    const response = UrlFetchApp.fetch(logoUrl, { muteHttpExceptions: true });
    const status = response.getResponseCode();
    const headers = response.getHeaders();
    const contentType = String(headers['Content-Type'] || headers['content-type'] || response.getBlob().getContentType() || '').toLowerCase();
    if (status < 200 || status >= 300 || !contentType.startsWith('image/')) return {};

    return {
      store_logo: response.getBlob().setName('peakloader-logo')
    };
  } catch (error) {
    Logger.log(`Logo could not be embedded: ${error}`);
    return {};
  }
}

function buildPlainText_(order, brand) {
  return [
    `Hi ${customerName_(order.customerEmail)},`,
    '',
    `Thank you for your ${brand.storeName} purchase.`,
    `Product: ${order.productName || '—'}`,
    `Duration: ${order.durationName || '—'}`,
    `Amount paid: ${formatAmount_(order.finalAmount)}`,
    `License key: ${order.licenseKey || '—'}`,
    `Order ID: ${order.orderId || '—'}`,
    '',
    'Keep your license key private.'
  ].join('\n');
}

function buildHtml_(order, brand, hasInlineLogo) {
  const logo = hasInlineLogo
    ? `<img src="cid:store_logo" width="52" height="52" alt="${escapeHtml_(brand.storeName)}" style="display:block;width:52px;height:52px;border-radius:14px;object-fit:cover;border:1px solid #334155;" />`
    : `<div style="width:52px;height:52px;border-radius:14px;background:#10b981;color:#020617;font-size:23px;line-height:52px;text-align:center;font-weight:800;">${escapeHtml_(brand.storeName.charAt(0).toUpperCase() || 'N')}</div>`;

  return `<!doctype html><html><body style="margin:0;padding:0;background:#020617;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#020617;margin:0;padding:28px 12px;"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:620px;background:#0f172a;border:1px solid #1e293b;border-radius:20px;overflow:hidden;"><tr><td style="height:5px;background:#10b981;font-size:0;line-height:0;">&nbsp;</td></tr><tr><td style="padding:28px 30px 18px;background:#111827;"><table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td valign="middle" style="padding-right:14px;">${logo}</td><td valign="middle"><div style="font-size:20px;line-height:25px;font-weight:800;color:#ffffff;">${escapeHtml_(brand.storeName)}</div><div style="margin-top:3px;font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.5px;color:#34d399;">DIGITAL LICENSE DELIVERY</div></td></tr></table></td></tr><tr><td style="padding:14px 30px 30px;"><div style="display:inline-block;padding:7px 11px;border-radius:999px;background:#064e3b;color:#6ee7b7;font-size:11px;line-height:14px;font-weight:700;letter-spacing:.8px;">PAYMENT CONFIRMED</div><h1 style="margin:18px 0 8px;font-size:26px;line-height:34px;color:#ffffff;">Your license key is ready</h1><p style="margin:0 0 24px;font-size:14px;line-height:22px;color:#94a3b8;">Hi ${escapeHtml_(customerName_(order.customerEmail))}, thank you for your purchase. Your original digital license details are below.</p><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#020617;border:1px solid #1e293b;border-radius:14px;"><tr><td style="padding:18px 18px 10px;color:#94a3b8;font-size:12px;">Product</td><td align="right" style="padding:18px 18px 10px;color:#ffffff;font-size:13px;font-weight:700;">${escapeHtml_(order.productName || '—')}</td></tr><tr><td style="padding:8px 18px 10px;color:#94a3b8;font-size:12px;">Access duration</td><td align="right" style="padding:8px 18px 10px;color:#ffffff;font-size:13px;font-weight:700;">${escapeHtml_(order.durationName || '—')}</td></tr><tr><td style="padding:8px 18px 18px;color:#94a3b8;font-size:12px;">Amount paid</td><td align="right" style="padding:8px 18px 18px;color:#6ee7b7;font-size:14px;font-weight:800;">${escapeHtml_(formatAmount_(order.finalAmount))}</td></tr></table><div style="margin-top:20px;padding:18px;border-radius:14px;background:#052e2b;border:1px solid #0f766e;"><div style="margin-bottom:8px;color:#5eead4;font-size:11px;font-weight:700;letter-spacing:1px;">YOUR LICENSE KEY</div><div style="padding:13px 12px;border-radius:9px;background:#020617;border:1px dashed #2dd4bf;color:#ffffff;font-family:Consolas,Monaco,monospace;font-size:15px;font-weight:700;letter-spacing:.4px;word-break:break-all;">${escapeHtml_(order.licenseKey || '—')}</div><div style="margin-top:10px;color:#99f6e4;font-size:11px;line-height:17px;">Keep this key private. Copy it exactly as shown when activating your product.</div></div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:22px;"><tr><td style="padding:0 0 8px;color:#64748b;font-size:11px;">Order ID</td><td align="right" style="padding:0 0 8px;color:#cbd5e1;font-family:Consolas,Monaco,monospace;font-size:11px;">${escapeHtml_(order.orderId || '—')}</td></tr><tr><td colspan="2" style="border-top:1px solid #1e293b;font-size:0;line-height:0;">&nbsp;</td></tr></table><p style="margin:22px 0 0;color:#64748b;font-size:11px;line-height:18px;">This email was sent to ${escapeHtml_(order.customerEmail || '')} because a purchase was completed at ${escapeHtml_(brand.storeName)}.${brand.replyTo ? ` For help, reply to ${escapeHtml_(brand.replyTo)}.` : ''}</p></td></tr></table></td></tr></table></body></html>`;
}

function customerName_(email) {
  return String(email || 'Customer').split('@')[0] || 'Customer';
}

function formatAmount_(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`;
}

function escapeHtml_(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
