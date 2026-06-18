# Deployment Guide

The web application is built as a static application (HTML/CSS/JS) and can be deployed anywhere.

## 1. Firebase Deploy (Recommended)

This provides hosting, database, and cloud functions in one package.

1. Ensure the Firebase CLI is installed: `npm i -g firebase-tools`.
2. Login: `firebase login`.
3. In the project root, run `firebase init`.
   - Select **Firestore**, **Functions**, and **Hosting**.
   - Choose your project.
   - For public directory, type `.` (current directory) or move the app files to `public/`.
   - Do not overwrite `index.html`.
4. Update your Firebase Config variable inside `index.html` (uncomment the config block at the bottom).
5. Set `DEMO_MODE = false` in `js/data.js`.
6. Run `firebase deploy`.

## 2. Netlify Deployment

1. Set `DEMO_MODE = true` (or integrate an external database via REST).
2. Connect your GitHub repository to Netlify.
3. The `netlify.toml` file in the root directory will automatically handle routing headers.

## 3. Cloud Functions (Notifications)

If using Firebase, you must deploy the Node.js Cloud Functions separately to enable Push Notifications and automated SLAs to trigger.

```bash
cd functions
npm install
firebase deploy --only functions
```
