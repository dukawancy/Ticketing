# Troubleshooting Guide

## Users

### "Invalid email or password"
- Ensure you used your correct official university address.
- Ensure your account has not been suspended.
- Did an admin just create your account? You must use the temporary password provided by the ICT department.

### Push Notifications are not appearing
1. Check if you granted the browser permission to show notifications. Look for a bell/lock icon in your browser URL bar.
2. In-app notifications require you to be logged into the same browser session.

## System Administrators

### No tickets are showing in 'All Tickets'
- Ensure Firebase Firestore rules are deployed correctly (`firebase deploy --only firestore:rules`).
- Check browser console for `Missing or insufficient permissions`.

### Cloud Functions failing to send emails
- If you integrated Mailgun/SendGrid, verify the API keys are correct using `firebase functions:config:get`.
- Check the Firebase Functions logs in the Google Cloud Console for stack traces.

### Demo Mode Data Disappears
- If `DEMO_MODE = true`, data is stored in your browser's `localStorage`. Clearing browser cache/cookies will delete the data. It will also not sync between different browsers (e.g., Chrome and Firefox) on the same machine.
