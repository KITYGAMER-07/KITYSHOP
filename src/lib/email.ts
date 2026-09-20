import emailjs from '@emailjs/browser';
import { Order, Settings } from '../types';

const isRealCustomerEmail = (email?: string) => {
  const value = email?.trim() ?? '';
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value !== 'Guest Customer';
};

export const isEmailDeliveryConfigured = (settings: Settings) => (
  settings.emailDeliveryEnabled === true &&
  Boolean(settings.emailJsServiceId?.trim()) &&
  Boolean(settings.emailJsTemplateId?.trim()) &&
  Boolean(settings.emailJsPublicKey?.trim())
);

export const sendLicenseKeyEmail = async (settings: Settings, order: Order): Promise<void> => {
  const recipient = order.customerEmail?.trim() ?? '';

  if (!isRealCustomerEmail(recipient)) {
    throw new Error('A valid customer email address is required for license delivery.');
  }
  if (!isEmailDeliveryConfigured(settings)) {
    throw new Error('Email delivery is enabled but EmailJS settings are incomplete.');
  }

  const storeName = settings.emailSenderName?.trim() || settings.websiteName?.trim() || 'License Shop';
  const recipientName = recipient.split('@')[0] || 'Customer';

  await emailjs.send(
    settings.emailJsServiceId!.trim(),
    settings.emailJsTemplateId!.trim(),
    {
      to_email: recipient,
      to_name: recipientName,
      product_name: order.productName,
      duration_name: order.durationName,
      license_key: order.licenseKey,
      order_id: order.orderId,
      amount: `₹${Number(order.finalAmount || 0).toFixed(2)}`,
      store_name: storeName,
      reply_to: settings.emailReplyTo?.trim() || '',
      from_name: storeName,
      store_logo: settings.emailLogoUrl?.trim() || settings.websiteLogoUrl?.trim() || ''
    },
    { publicKey: settings.emailJsPublicKey!.trim() }
  );
};
