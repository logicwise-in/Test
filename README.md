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
