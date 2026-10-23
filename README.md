# Shopwise — Ecommerce Storefront Demo

A responsive shopping storefront inspired by familiar ecommerce patterns, built as a front-end project for the `logicwise-in/Test-` repository.

## Features
- Responsive desktop and mobile layout
- Product cards with category filters and live search
- Demo cart with subtotal, favorites, and product details
- Floating shopping assistant with guided responses
- Accessible labels and reduced-width layouts

## Run locally
Open `index.html` in a modern browser for the storefront UI. Google sign-in uses JavaScript modules and requires the Firebase setup below; test it from a local web server or your deployed HTTPS site rather than opening the file directly.

## Enable Google sign-in (required before it works)
1. Open the [Firebase Console](https://console.firebase.google.com/) and create a project (or use an existing project).
2. In **Project settings → General**, register a Web app and copy its Firebase configuration.
3. Open `auth.js` and replace `YOUR_FIREBASE_API_KEY`, `YOUR_PROJECT_ID`, and `YOUR_FIREBASE_APP_ID` with the values from your Firebase Web App config. Keep `authDomain` consistent with your project.
4. In Firebase Console, open **Authentication → Sign-in method** and enable **Google**.
5. Under **Authentication → Settings → Authorized domains**, add the exact hostname where the site is deployed (for example, your GitHub Pages hostname or your own custom domain).
6. Commit the changes and redeploy/reload the site, then test the Account → **Continue with Google** flow.

Firebase's web configuration is not a password or private server key, but it must be paired with authorized domains and sensible Firebase security rules. Do not put service-account credentials or private keys in this repository. Google sign-in authenticates the user; it does not by itself create a customer database, save carts across devices, or enable checkout/payments.

## About the shopping assistant
The current assistant is a **rule-based front-end demo**. It is not connected to an AI model, product database, account system, checkout, shipping, or payments. To add real AI chat, connect a secure backend endpoint to an AI provider; never put a private API key in browser JavaScript.

## Publish with GitHub Pages
1. Open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select branch `main` and folder `/ (root)`, then save.
4. After the deployment finishes, GitHub will show the published site URL in the Pages section.

This is a demo storefront and is not affiliated with Flipkart or any other retailer.

## Website-service checkout (setup required before taking real payments)

The service configurator uses a Netlify Function at `/.netlify/functions/checkout`, Firebase ID-token verification, Razorpay Orders API, a Netlify Postgres migration, and optional transactional email through Resend. The browser never receives the Razorpay secret. Prices and coupon validity are recalculated server-side.

### Required deployment configuration

In Netlify → **Project configuration → Environment variables**, add these variables for the **Functions** scope, then trigger a production deploy:

- `FIREBASE_SERVICE_ACCOUNT_JSON`: the complete JSON contents of a Firebase service account credential for the same project used by `auth.js`. Create/download it from Firebase Console → Project settings → Service accounts. Store only in Netlify secrets; never commit it or send it in chat.
- `RAZORPAY_KEY_ID`: Razorpay API key ID from the Razorpay Dashboard.
- `RAZORPAY_KEY_SECRET`: matching Razorpay API key secret. Keep private.
- `RAZORPAY_WEBHOOK_SECRET`: a strong webhook secret you choose when creating a Razorpay webhook. In Razorpay Dashboard → Account & Settings → Webhooks, add `https://logicwise.in/.netlify/functions/razorpay-webhook` and subscribe to `payment.captured` (and optionally `order.paid`). Use the exact same secret in Netlify.
- `ADMIN_EMAIL`: the exact Google sign-in email allowed to view the admin order list.
- `RESEND_API_KEY`: optional until email notifications are configured; create an API key in Resend.
- `ORDER_FROM_EMAIL`: optional until email notifications are configured; a sender address verified in Resend.

Use Razorpay **Test Mode** keys first. Keep live keys out of GitHub and only switch to live mode after test payments and verification have passed. If Firebase service-account JSON plus other environment variables exceed Netlify's environment variable limits, use a secret manager/runtime secret storage option instead of putting private credentials in source control.

### Database and email

The migration in `netlify/database/migrations/` creates the persistent `service_orders` table. The deploy needs Netlify Database support enabled for this site/plan. If the deploy reports that the database feature is unavailable, enable/provision a supported database before testing checkout. The backend saves an order before opening Razorpay Checkout and only marks it paid after validating the Razorpay signature.

Email delivery requires a verified sender domain/address and a valid Resend API key. When email settings are absent, orders can still be recorded and verified, but email notifications are skipped. The admin list is available from the website-service configurator and is server-authorized against `ADMIN_EMAIL`.

### Before launch

- Add `logicwise.in` (and `www.logicwise.in` if used) to Firebase Authentication → Settings → Authorized domains.
- Enable Google under Firebase Authentication → Sign-in providers.
- Confirm `ADMIN_EMAIL` matches the Google account used for the admin dashboard.
- Test a complete order with Razorpay Test Mode, verify order persistence and email delivery, and inspect Netlify Function logs.
- The signed Razorpay webhook endpoint is included for payment reconciliation if customers close the browser. Add the endpoint in Razorpay and set `RAZORPAY_WEBHOOK_SECRET` before considering the webhook active.
- Publish clear service scope, delivery timelines, refund/cancellation terms, privacy notice, and contact details before accepting real customer payments.

**Current state:** backend code and configuration instructions are committed, but checkout is not considered production-ready until the Netlify environment variables and database are configured and a full test payment is verified.
