# One Vercel Project: PeakEsp Shop + Reseller Network

Deploy this **single `PeakLoader Shop` folder** to the existing PeakEsp Shop Vercel project. Do not create a second Vercel project for Reseller Network.

## What this one deployment provides

* Public PeakEsp customer shop website
* PeakEsp Admin login and all existing control-panel options
* Master-only **Reseller Network** workspace after the same admin login
* Reseller Owner and Online Shop mobile apps' secure checkout APIs

## Vercel environment variables

Keep the existing variables, then ensure these are available in Production:

```text
RAZORPAY_KEY_ID=rzp_live_or_test_key_id
RAZORPAY_KEY_SECRET=razorpay_secret
AIMX_BOT_API_TOKEN=your_provider_token
# BOT_API_KEY is also supported if that is the name you already use.
FIREBASE_DATABASE_URL=https://novaespstore-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
VITE_SUPABASE_STORAGE_BUCKET=website-assets
```

## Final setup

1. Redeploy the existing PeakEsp Shop Vercel project with this folder.
2. Log in to its existing Admin panel.
3. Select **Reseller Network** from the workspace switch at the top.
4. In **Checkout**, set the Vercel API URL to this same deployed website URL and save the Razorpay public Key ID.
5. Use that same deployed website URL in the Online Shop customer's app checkout configuration.

Legacy PeakEsp Shop orders continue through the original flow. Requests containing a reseller Store Code automatically use the separate reseller order flow inside the same Vercel project.
