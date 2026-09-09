import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getDatabase, 
  ref, 
  get, 
  set, 
  push, 
  update, 
  remove, 
  onValue, 
  off,
  runTransaction
} from 'firebase/database';
import { Product, Duration, Price, LicenseKey, Coupon, Order, Settings } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyDKupV0toRbcPDDW8sLd9JNrbVVMDkfb2E",
  authDomain: "novaespstore.firebaseapp.com",
  projectId: "novaespstore",
  storageBucket: "novaespstore.firebasestorage.app",
  messagingSenderId: "1087211684495",
  appId: "1:1087211684495:web:5dd3025e9aa29340d626fa",
  databaseURL: "https://novaespstore-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);
export const BRAND_ID = 'peakloader-shop';
export const BRAND_ROOT = `brands/${BRAND_ID}`;
const BRAND_STORAGE_ROOT = `brands/${BRAND_ID}`;
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'website-assets';

function scopedPath(path: string): string {
  const normalizedPath = path.replace(/^\/+|\/+$/g, '');
  return normalizedPath ? `${BRAND_ROOT}/${normalizedPath}` : BRAND_ROOT;
}

function scopedStoragePath(path: string): string {
  return `${BRAND_STORAGE_ROOT}/${path.replace(/^\/+/, '')}`;
}

function assertSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your GitHub/Vite environment variables.');
  }
}

async function uploadImageToSupabase(path: string, file: File): Promise<string> {
  assertSupabaseConfig();
  if (!file) throw new Error('Logo file is missing.');
  if (!file.type.startsWith('image/')) throw new Error('Please select an image file.');
  if (file.size > 5 * 1024 * 1024) throw new Error('Logo image must be 5 MB or smaller.');

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': file.type,
      'x-upsert': 'true',
      'cache-control': '31536000',
    },
    body: file,
  });

  if (!response.ok) {
    let message = `Supabase Storage upload failed (${response.status}).`;
    try {
      const body = await response.json();
      message = body?.message || body?.error || message;
    } catch { /* keep fallback message */ }
    throw new Error(message);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${path}`;
}

export async function uploadWebsiteLogo(file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return uploadImageToSupabase(scopedStoragePath(`website/logo/${Date.now()}-${safeName}`), file);
}

export async function uploadProductLogo(productId: string, file: File): Promise<string> {
  if (!productId) throw new Error('Product id is missing.');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  return uploadImageToSupabase(scopedStoragePath(`website/product-logos/${productId}/${Date.now()}-${safeName}`), file);
}


const APK_MAX_SIZE = 50 * 1024 * 1024;

export async function uploadApkToSupabase(file: File): Promise<{ url: string; path: string; fileName: string; fileSize: number }> {
  assertSupabaseConfig();
  if (!file) throw new Error('APK file is missing.');
  if (!file.name.toLowerCase().endsWith('.apk')) throw new Error('Please select an .apk file.');
  if (file.size > APK_MAX_SIZE) throw new Error('APK file must be 50 MB or smaller.');

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = scopedStoragePath(`apk-files/${Date.now()}-${safeName}`);
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/vnd.android.package-archive',
      'cache-control': '31536000',
    },
    body: file,
  });

  if (!response.ok) {
    let message = `APK upload failed (${response.status}).`;
    try {
      const body = await response.json();
      message = body?.message || body?.error || message;
    } catch { /* keep fallback message */ }
    throw new Error(message);
  }

  return {
    url: `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${path}`,
    path,
    fileName: file.name,
    fileSize: file.size,
  };
}

export async function deleteApkFromSupabase(path: string): Promise<void> {
  assertSupabaseConfig();
  if (!path) throw new Error('APK storage path is missing.');
  if (!path.startsWith(`${BRAND_STORAGE_ROOT}/`)) {
    throw new Error('This APK does not belong to PeakLoader Shop.');
  }
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${path}`, {
    method: 'DELETE',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
    },
  });

  if (!response.ok) {
    let message = `APK delete failed (${response.status}).`;
    try {
      const body = await response.json();
      message = body?.message || body?.error || message;
    } catch { /* keep fallback message */ }
    throw new Error(message);
  }
}

// Helper: Read raw snapshot data
export async function getData<T = any>(path: string): Promise<T | null> {
  try {
    const snapshot = await get(ref(db, scopedPath(path)));
    return snapshot.exists() ? snapshot.val() as T : null;
  } catch (error) {
    console.warn(`Firebase get error at path ${path}:`, error);
    return null;
  }
}

// Helper: Get formatted list from object node
export async function getList<T extends { id: string }>(path: string): Promise<T[]> {
  const data = await getData<Record<string, Omit<T, 'id'>>>(path);
  if (!data) return [];
  return Object.entries(data).map(([id, val]) => ({ id, ...val } as unknown as T));
}

// Helper: Set data
export async function setData(path: string, data: any): Promise<void> {
  await set(ref(db, scopedPath(path)), data);
}

// Helper: Push data
export async function pushData(path: string, data: any): Promise<string> {
  const newRef = push(ref(db, scopedPath(path)));
  const generatedId = newRef.key || `id_${Date.now()}`;
  await set(newRef, { ...data, id: generatedId });
  return generatedId;
}

// Helper: Update data
export async function updateData(path: string, data: any): Promise<void> {
  await update(ref(db, scopedPath(path)), data);
}

// Helper: Delete data
export async function deleteData(path: string): Promise<void> {
  await remove(ref(db, scopedPath(path)));
}


// Atomically increments the number of times a reusable trial code has been
// activated. The code itself stays active and can be redeemed by unlimited users.
export async function recordTrialActivation(trialId: string, email?: string): Promise<number> {
  if (!trialId) throw new Error('Trial key id is missing.');

  const trialRef = ref(db, scopedPath(`trialKeys/${trialId}`));
  const result = await runTransaction(trialRef, (current) => {
    if (!current) return current;
    const usageCount = Number(current.usageCount || 0);
    return {
      ...current,
      used: false,
      usageCount: usageCount + 1,
      lastUsedByEmail: email?.trim() || 'Trial User',
      lastUsedAt: Date.now()
    };
  });

  if (!result.committed || !result.snapshot.exists()) {
    throw new Error('Trial code could not be activated.');
  }

  return Number(result.snapshot.val()?.usageCount || 0);
}

// Trial Key Delete Helper
// Deletes by the Firebase Realtime Database child id used by App.tsx.
// After deleting, it verifies the child is actually gone so the admin UI
// cannot silently report success when Firebase rejected the operation.
export async function deleteTrialKeyFromDb(k: { id?: string; trialCode?: string; key?: string }): Promise<void> {
  if (!k?.id && !k?.trialCode && !k?.key) {
    throw new Error('Trial key is missing its Firebase id/code.');
  }

  try {
    // Normal case: the UI id is the actual Firebase child key.
    if (k.id) {
      const directRef = ref(db, scopedPath(`trialKeys/${k.id}`));
      const directSnapshot = await get(directRef);
      if (directSnapshot.exists()) {
        await remove(directRef);
        if ((await get(directRef)).exists()) {
          throw new Error('Firebase did not remove the trial key.');
        }
        return;
      }
    }

    // Backward-compatible fallback for older/migrated records where the
    // stored `id`, trialCode, or key does not equal the Firebase child key.
    const snapshot = await get(ref(db, scopedPath('trialKeys')));
    if (!snapshot.exists()) {
      throw new Error('Trial key was not found in Firebase.');
    }

    const idsToDelete: string[] = [];
    snapshot.forEach((child) => {
      const value = child.val() || {};
      const matches =
        (k.id && (child.key === k.id || value.id === k.id)) ||
        (k.trialCode && value.trialCode === k.trialCode) ||
        (k.key && value.key === k.key) ||
        (k.trialCode && value.key === k.trialCode) ||
        (k.key && value.trialCode === k.key);

      if (matches && child.key) idsToDelete.push(child.key);
    });

    if (!idsToDelete.length) {
      throw new Error('Trial key was not found in Firebase.');
    }

    const updates: Record<string, null> = {};
    idsToDelete.forEach((id) => {
      updates[`trialKeys/${id}`] = null;
    });
    await update(ref(db, scopedPath('')), updates);

    const remaining = await Promise.all(
      idsToDelete.map(async (id) => (await get(ref(db, scopedPath(`trialKeys/${id}`)))).exists())
    );
    if (remaining.some(Boolean)) {
      throw new Error('Firebase did not remove the trial key.');
    }
  } catch (err) {
    console.error('Error deleting trial key:', err);
    throw err;
  }
}

// Clears only the currently selected Trial Keys filter.
// We delete the exact Firebase child nodes, then verify that the selected
// nodes are gone. This avoids relying on trialCode/key text matching.
export async function clearTrialKeysFromDb(
  filter: 'active' | 'used'
): Promise<{ deleted: number }> {
  try {
    const snapshot = await get(ref(db, scopedPath('trialKeys')));
    if (!snapshot.exists()) {
      return { deleted: 0 };
    }

    const ids: string[] = [];

    snapshot.forEach((childSnap) => {
      const val = childSnap.val();
      const usageCount = Number(val?.usageCount || 0);
      const isUsed = !!val?.used || usageCount > 0;

      // Reusable trial codes are active regardless of usage count.
      // 'used' filter is kept as a management view for codes that have been activated.
      if ((filter === 'active') || (filter === 'used' && isUsed)) {
        if (childSnap.key) ids.push(childSnap.key);
      }
    });

    if (ids.length === 0) {
      return { deleted: 0 };
    }

    // One atomic multi-location update is safer/faster than many individual
    // requests and guarantees all selected child paths are targeted.
    const updates: Record<string, null> = {};
    ids.forEach((id) => {
      updates[`trialKeys/${id}`] = null;
    });

    await update(ref(db, scopedPath('')), updates);

    // Verify every requested child was removed.
    const remainingChecks = await Promise.all(
      ids.map(async (id) => {
        const child = await get(ref(db, scopedPath(`trialKeys/${id}`)));
        return child.exists() ? id : null;
      })
    );

    const failedIds = remainingChecks.filter(Boolean);
    if (failedIds.length > 0) {
      throw new Error(
        `Firebase did not remove ${failedIds.length} trial key(s).`
      );
    }

    return { deleted: ids.length };
  } catch (err) {
    console.error(`Error clearing ${filter} trial keys:`, err);
    throw err;
  }
}

// Realtime Subscriber
export function subscribeToPath<T>(path: string, callback: (data: T | null) => void): () => void {
  const dbRef = ref(db, scopedPath(path));
  const listener = onValue(
    dbRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.val());
      } else {
        callback(null);
      }
    },
    (error) => {
      console.warn(`Realtime subscription error on ${path}:`, error);
      callback(null);
    }
  );

  return () => off(dbRef, 'value', listener);
}

// Default Seed Data Generator (populates initial store data if DB is blank)

export async function incrementCouponUsage(couponId: string): Promise<number> {
  const couponRef = ref(db, scopedPath(`coupons/${couponId}`));
  const result = await runTransaction(couponRef, (current) => {
    if (!current) return current;
    const usageLimit = Number(current.usageLimit || 0);
    const usageCount = Number(current.usageCount || 0);
    if (usageLimit > 0 && usageCount >= usageLimit) return;
    return { ...current, usageCount: usageCount + 1 };
  });
  if (!result.committed) throw new Error('Coupon usage limit reached or coupon unavailable.');
  return Number(result.snapshot.val()?.usageCount || 0);
}

export async function reservePreBookingSlot(preBookingId: string): Promise<number> {
  const bookingRef = ref(db, scopedPath(`preBookings/${preBookingId}`));
  const result = await runTransaction(bookingRef, (current) => {
    if (!current || current.enabled === false) return;
    const slots = Number(current.slots || 0);
    const booked = Number(current.bookedCount || 0);
    if (slots > 0 && booked >= slots) return;
    return { ...current, bookedCount: booked + 1 };
  });
  if (!result.committed) throw new Error('Pre-booking is closed or sold out.');
  return Number(result.snapshot.val()?.bookedCount || 0);
}

export async function seedInitialDataIfEmpty() {
  try {
    const existingProducts = await getList<Product>('products');
    if (existingProducts.length > 0) return; // already seeded

    console.log('Seeding initial products, durations, and prices...');

    // 1. Add Default Products
    const prod1Id = await pushData('products', {
      name: 'PeakLoader Premium',
      enabled: true,
      category: 'Gaming ESP',
      icon: 'Shield',
      description: 'Undetected ESP visual hack, smooth aimbot, radar, and memory safe features.',
      createdAt: Date.now()
    });

    const prod2Id = await pushData('products', {
      name: 'PeakLoader Pro Access',
      enabled: true,
      category: 'Gaming ESP',
      icon: 'Zap',
      description: 'Premium loader access with fast activation and secure key delivery.',
      createdAt: Date.now()
    });

    const prod3Id = await pushData('products', {
      name: 'Windows 11 Pro Lifetime Key',
      enabled: true,
      category: 'Software Keys',
      icon: 'KeyRound',
      description: 'Genuine digital activation key for Windows 11 Professional edition.',
      createdAt: Date.now()
    });

    // 2. Add Durations for Products
    const dur1Id = await pushData('durations', {
      productId: prod1Id,
      name: '1 Day Pass',
      unit: 'days',
      createdAt: Date.now()
    });

    const dur2Id = await pushData('durations', {
      productId: prod1Id,
      name: '7 Days Pass',
      unit: 'days',
      createdAt: Date.now()
    });

    const dur3Id = await pushData('durations', {
      productId: prod1Id,
      name: '30 Days VIP',
      unit: 'days',
      createdAt: Date.now()
    });

    const dur4Id = await pushData('durations', {
      productId: prod2Id,
      name: '7 Days Pro',
      unit: 'days',
      createdAt: Date.now()
    });

    const dur5Id = await pushData('durations', {
      productId: prod3Id,
      name: 'Lifetime License',
      unit: 'years',
      createdAt: Date.now()
    });

    // 3. Add Prices
    await pushData('prices', { productId: prod1Id, durationId: dur1Id, price: 99, createdAt: Date.now() });
    await pushData('prices', { productId: prod1Id, durationId: dur2Id, price: 399, createdAt: Date.now() });
    await pushData('prices', { productId: prod1Id, durationId: dur3Id, price: 999, createdAt: Date.now() });
    await pushData('prices', { productId: prod2Id, durationId: dur4Id, price: 499, createdAt: Date.now() });
    await pushData('prices', { productId: prod3Id, durationId: dur5Id, price: 699, createdAt: Date.now() });

    // 4. Add Sample Stock Keys
    const sampleKeys1 = [
      'PEAK-1D-894A-22BF-9001',
      'PEAK-1D-11CC-44EE-8822',
      'PEAK-1D-77AA-9988-3311'
    ];
    for (const key of sampleKeys1) {
      await pushData('licenseKeys', { productId: prod1Id, durationId: dur1Id, key, used: false, createdAt: Date.now() });
    }

    const sampleKeys2 = [
      'PEAK-7D-X992-K881-P002',
      'PEAK-7D-Q771-M442-W333'
    ];
    for (const key of sampleKeys2) {
      await pushData('licenseKeys', { productId: prod1Id, durationId: dur2Id, key, used: false, createdAt: Date.now() });
    }

    const sampleKeys3 = [
      'PEAK-WIN11-PRO-X889-7721-KEY9'
    ];
    for (const key of sampleKeys3) {
      await pushData('licenseKeys', { productId: prod3Id, durationId: dur5Id, key, used: false, createdAt: Date.now() });
    }

    // 5. Add Coupons
    await pushData('coupons', {
      code: 'WELCOME10',
      type: 'percentage',
      value: 10,
      minOrderValue: 100,
      expiryDate: null,
      createdAt: Date.now()
    });

    await pushData('coupons', {
      code: 'PEAK50',
      type: 'fixed',
      value: 50,
      minOrderValue: 200,
      expiryDate: null,
      createdAt: Date.now()
    });

    // 6. Settings
    await setData('settings/razorpay', { keyId: 'rzp_test_5dd3025e9aa2' });
    await setData('settings/admin', { username: 'admin', password: 'password123' });
    await setData('settings/apk', { 
      url: '',
      appName: 'PeakLoader Shop',
      version: 'v1.0.0'
    });

    console.log('Seed data successfully populated!');
  } catch (err) {
    console.error('Error seeding initial data:', err);
  }
}
