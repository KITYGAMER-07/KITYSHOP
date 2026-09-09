import { Order } from '../types';

export function downloadInvoiceTxt(order: Partial<Order> & { productName?: string; durationName?: string; licenseKey?: string }) {
  const orderId = order.orderId || 'ORD-' + Date.now();
  const paymentId = order.paymentId || 'PAY-N/A';
  const productName = order.productName || 'Digital Key';
  const durationName = order.durationName || 'Standard Access';
  const licenseKey = order.licenseKey || 'N/A';
  const originalPrice = order.originalPrice || 0;
  const discountAmount = order.discountAmount || 0;
  const finalAmount = order.finalAmount || 0;
  const couponCode = order.couponCode || null;
  const dateStr = order.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString();
  const customerEmail = order.customerEmail || 'Guest Customer';
  const isPreBooking = order.orderType === 'prebooking';

  const invoiceContent = `
================================================================
                 PEAKLOADER SHOP - OFFICIAL INVOICE              
================================================================
Store            : PeakLoader Shop
Website          : Store Portal
Date             : ${dateStr}
----------------------------------------------------------------
TRANSACTION DETAILS
----------------------------------------------------------------
Order Reference  : ${orderId}
${isPreBooking ? `Booking ID       : ${order.bookingId || orderId}
Booking Status   : ${(order.bookingStatus || 'confirmed').toUpperCase()}
Release Date     : ${order.releaseDate ? new Date(order.releaseDate).toLocaleString() : 'TBA'}
` : ''}
Payment ID       : ${paymentId}
Customer Email   : ${customerEmail}
Status           : PAID / VERIFIED
----------------------------------------------------------------
PURCHASED ITEM
----------------------------------------------------------------
Product          : ${productName}
Duration / Unit  : ${durationName}
Digital License  : ${isPreBooking ? 'Reserved for Release' : licenseKey}
----------------------------------------------------------------
PAYMENT SUMMARY
----------------------------------------------------------------
Subtotal         : ₹${originalPrice.toFixed(2)}
${discountAmount > 0 ? `Discount Applied  : -₹${discountAmount.toFixed(2)}${couponCode ? ` (Coupon: ${couponCode})` : ''}\n` : ''}Grand Total Paid : ₹${finalAmount.toFixed(2)}
================================================================
${isPreBooking ? 'Thank you for your pre-booking! Your full payment has been received and your reservation is secured.' : 'Thank you for your purchase! Your digital license key is active and ready to be used.'}
Need support? Visit our Telegram or Contact us via Store Portal.
================================================================
  `.trim();

  const blob = new Blob([invoiceContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice_${orderId}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
