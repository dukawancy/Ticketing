# Firebase Setup Guide for ICT Helpdesk System

Complete step-by-step guide to set up Firebase for the production helpdesk system.

---

## 📋 Prerequisites

- Google account (gmail.com or organization account)
- Node.js installed (for Firebase CLI)
- Terminal/Command Prompt access
- Domain name (optional, for custom domain)

---

## 🚀 Step 1: Create Firebase Project

### 1.1 Go to Firebase Console
```
URL: https://console.firebase.google.com
Click: "+ Add project"
```

### 1.2 Create New Project
```
Project Name: ICT-Directorate-Helpdesk
Analytics: Enable (recommended)
Region: Africa (South Africa) or closest to Nigeria
Click: "Create project"
Wait: 1-2 minutes for creation
```

### 1.3 Copy Project Configuration
```
Click: ⚙️ Project Settings
Tab: "Your apps"
Select: Web (</> icon)
Register app: Name it "ICT Helpdesk Web"
Copy: firebaseConfig object
```

**Example Config:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyDxxx...",
  authDomain: "ict-helpdesk.firebaseapp.com",
  projectId: "ict-helpdesk-prod",
  storageBucket: "ict-helpdesk-prod.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

Save this somewhere safe — you'll need it in the HTML file.

---

## 🔐 Step 2: Enable Authentication

### 2.1 Enable Email/Password Auth
```
Left sidebar: "Authentication"
Click: "Get started"
Tab: "Sign-in method"
Click: "Email/Password"
Toggle: Enable both options
- Email/password
- Email link (optional)
Click: "Save"
```

### 2.2 Add Authorized Domains
```
Tab: "Settings" → "Authorized domains"
Add your deployment domain:
- If Netlify: yoursite.netlify.app
- If custom: yourdomain.com
```

### 2.3 Configure Email Templates (Optional)
```
Tab: "Templates"
Customize:
- Verify email
- Reset password
- Change email
- Sign-in confirmation
Click: "Save"
```

---

## 💾 Step 3: Set Up Firestore Database

### 3.1 Create Database
```
Left sidebar: "Firestore Database"
Click: "Create database"
Select: "Start in test mode" (for development)
Location: Nearest to Nigeria (South Africa or Europe)
Click: "Create"
Wait: 2-3 minutes
```

### 3.2 Create Collections

Open Firestore and create these collections:

#### Collection 1: tickets
```
Click: "+ Add collection"
Name: tickets
Document ID: Auto-generate
Fields:
  - id: string
  - title: string
  - description: string
  - category: string
  - priority: string
  - status: string
  - submittedBy: string
  - submittedId: string
  - assignedTo: string (nullable)
  - assignedId: string (nullable)
  - location: string
  - createdAt: timestamp
  - updatedAt: timestamp
  - closedAt: timestamp (nullable)
  - comments: array
```

#### Collection 2: users
```
Click: "+ Add collection"
Name: users
Document ID: {userId} from Firebase Auth
Fields:
  - id: string
  - name: string
  - email: string
  - role: string (student|staff|technician|unit-head|admin)
  - status: string (pending|active|suspended)
  - uid: string (matric/staff number)
  - department: string
  - unit: string
  - initials: string
  - createdAt: timestamp
  - mustChangePw: boolean
  - notificationPrefs: map
```

#### Collection 3: notifications
```
Click: "+ Add collection"
Name: notifications (with auto-subcollection)
Document: userId
Subcollection: items
Fields:
  - id: string
  - type: string (status-change|comment|assignment)
  - title: string
  - message: string
  - ticketId: string
  - read: boolean
  - createdAt: timestamp
```

#### Collection 4: settings
```
Click: "+ Add collection"
Name: settings
Document ID: sla
Fields:
  - low: number (72)
  - medium: number (24)
  - high: number (4)
  - critical: number (1)
```

---

## 🔒 Step 4: Set Security Rules

### 4.1 Update Firestore Security Rules

Go to: **Firestore Database** → **Rules** tab

Replace entire rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to get user role
    function getUserRole(uid) {
      return get(/databases/$(database)/documents/users/$(uid)).data.role;
    }
    
    function isAdmin(uid) {
      return getUserRole(uid) == 'admin';
    }
    
    function isAdmin_or_UnitHead(uid) {
      return getUserRole(uid) in ['admin', 'unit-head'];
    }
    
    // USERS COLLECTION
    match /users/{userId} {
      // User can read their own profile
      allow read: if request.auth.uid == userId;
      // Admin can read all user profiles
      allow read: if isAdmin(request.auth.uid);
      
      // User can update their own profile
      allow update: if request.auth.uid == userId && 
                       !request.resource.data.role.changed;
      // Admin can update any profile
      allow update: if isAdmin(request.auth.uid);
      
      // Only admin can create users
      allow create: if isAdmin(request.auth.uid);
      // Only admin can delete
      allow delete: if isAdmin(request.auth.uid);
    }
    
    // TICKETS COLLECTION
    match /tickets/{ticketId} {
      // Read: Student sees own tickets, tech sees assigned, admin sees all
      allow read: if 
        request.auth.uid == resource.data.submittedId ||
        request.auth.uid == resource.data.assignedId ||
        isAdmin_or_UnitHead(request.auth.uid);
      
      // Create: Student/Staff can submit tickets
      allow create: if 
        request.auth.uid == request.resource.data.submittedId &&
        getUserRole(request.auth.uid) in ['student', 'staff'];
      
      // Update: Submitter can add comments, tech can update status, admin can do anything
      allow update: if 
        isAdmin(request.auth.uid) ||
        (getUserRole(request.auth.uid) == 'technician' && 
         request.auth.uid == resource.data.assignedId) ||
        (request.resource.data.comments.size() > resource.data.comments.size());
    }
    
    // NOTIFICATIONS SUBCOLLECTION
    match /notifications/{userId}/items/{notificationId} {
      // Users can only see their own notifications
      allow read: if request.auth.uid == userId;
      allow update: if request.auth.uid == userId;
      allow delete: if request.auth.uid == userId;
      // Only server (via cloud function) can create
      allow create: if false;
    }
    
    // SETTINGS COLLECTION
    match /settings/{document=**} {
      // Anyone can read settings
      allow read: if request.auth != null;
      // Only admin can modify
      allow write: if isAdmin(request.auth.uid);
    }
    
    // Deny all by default
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Click: **Publish**

---

## 🔧 Step 5: Set Up Cloud Functions (Optional but Recommended)

Cloud Functions automate notifications and SLA checking.

### 5.1 Install Firebase CLI

```bash
npm install -g firebase-tools
firebase login
firebase init functions
```

### 5.2 Create Function: Send Notification on Ticket Update

File: `functions/index.js`

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Trigger when ticket status changes
exports.notifyOnStatusChange = functions.firestore
  .document('tickets/{ticketId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    
    // Check if status changed
    if (newData.status !== oldData.status) {
      const message = {
        notification: {
          title: 'Ticket Status Updated',
          body: `${newData.id}: Status changed to ${newData.status}`
        }
      };
      
      // Notify submitter
      const submitter = await db.collection('users')
        .doc(newData.submittedId).get();
      
      if (submitter.data().notificationToken) {
        await admin.messaging().sendToDevice(
          submitter.data().notificationToken,
          message
        );
      }
      
      // Create notification record
      await db.collection('notifications')
        .doc(newData.submittedId)
        .collection('items')
        .add({
          type: 'status-change',
          title: 'Ticket Status Updated',
          message: `Ticket ${newData.id}: Status changed to ${newData.status}`,
          ticketId: newData.id,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
    }
  });

// Trigger when comment is added
exports.notifyOnComment = functions.firestore
  .document('tickets/{ticketId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    
    // Check if comment was added
    if (newData.comments.length > oldData.comments.length) {
      const newComment = newData.comments[newData.comments.length - 1];
      
      // Notify involved users
      const notifyUsers = [newData.submittedId, newData.assignedId];
      
      for (const userId of notifyUsers) {
        await db.collection('notifications')
          .doc(userId)
          .collection('items')
          .add({
            type: 'comment',
            title: 'New Comment',
            message: `${newComment.author} commented on ${newData.id}`,
            ticketId: newData.id,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
      }
    }
  });
```

Deploy:
```bash
firebase deploy --only functions
```

---

## 📧 Step 6: Set Up Email Notifications (Optional)

### 6.1 Enable Cloud Functions Emails

Install Mailgun or SendGrid integration:

```bash
npm install --save mailgun.js
```

### 6.2 Add Environment Variables

```bash
firebase functions:config:set mailgun.api_key="your_key" mailgun.domain="your_domain"
firebase functions:config:set sendgrid.api_key="your_key"
```

### 6.3 Create Email Cloud Function

```javascript
const mailgun = require('mailgun.js');

exports.sendEmailNotification = functions.firestore
  .document('tickets/{ticketId}')
  .onUpdate(async (change, context) => {
    const newData = change.after.data();
    const oldData = change.before.data();
    
    if (newData.status !== oldData.status) {
      const submitter = await db.collection('users')
        .doc(newData.submittedId).get();
      
      const mg = mailgun.client({
        username: 'api',
        key: functions.config().mailgun.api_key
      });
      
      await mg.messages.create(functions.config().mailgun.domain, {
        from: 'ICT Helpdesk <noreply@ict.university.edu.ng>',
        to: submitter.data().email,
        subject: `Ticket ${newData.id} Status Update`,
        html: `
          <h2>Ticket Status Updated</h2>
          <p>Your ticket has been updated.</p>
          <p><strong>Status:</strong> ${newData.status}</p>
          <p><a href="https://helpdesk.university.edu.ng/tickets/${newData.id}">View Ticket</a></p>
        `
      });
    }
  });
```

---

## 🚀 Step 7: Deploy to Firebase Hosting

### 7.1 Initialize Hosting

```bash
firebase init hosting
```

Choose:
```
? What do you want to use as your public directory? public
? Configure as single-page app? Yes
? File public/404.html already exists. Overwrite? Yes
? File public/index.html already exists. Overwrite? Yes
```

### 7.2 Place HTML File

Copy `ict_helpdesk_v3_notifications.html` to `public/index.html`

### 7.3 Update Firebase Config in HTML

In the HTML file, find:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

Replace with your copied config from step 1.3

Change demo mode:
```javascript
const DEMO_MODE = false; // Set to false
```

### 7.4 Deploy

```bash
firebase deploy
```

Your app is now live at: `https://YOUR_PROJECT.web.app`

---

## 🔧 Step 8: Configure Custom Domain (Optional)

### 8.1 Add Domain to Firebase Hosting

```
Firebase Console → Hosting → Custom Domain
Add your domain
Follow DNS instructions
Wait: 24-48 hours for propagation
```

### 8.2 DNS Setup Example (for GoDaddy, Namecheap, etc.)

```
CNAME: your-domain.com → your-project.web.app
A Record: your-domain.com → Firebase IP
```

---

## 📱 Step 9: Set Up Cloud Messaging (Push Notifications)

### 9.1 Create Service Worker

File: `public/firebase-messaging-sw.js`

```javascript
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging.js');

const firebaseConfig = {
  // Your config here
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('Background message:', payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/icon-192x192.png'
  });
});
```

### 9.2 Enable Cloud Messaging in HTML

Add to `<head>`:

```html
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js"></script>
<script src="https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging.js"></script>
```

Add to `<body>` after Firebase init:

```javascript
// Request permission for notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js');
}

if (Notification.permission === 'granted') {
  const messaging = firebase.messaging();
  messaging.getToken({ vapidKey: 'YOUR_VAPID_KEY' })
    .then(token => {
      // Save token to user profile in Firestore
      db.collection('users').doc(currentUser.id).update({
        notificationToken: token
      });
    });
}
```

---

## ✅ Verification Checklist

After setup, verify each component:

```
☐ Firebase project created
☐ Authentication enabled (email/password)
☐ Firestore collections created (tickets, users, notifications, settings)
☐ Security rules deployed
☐ Cloud functions deployed (optional)
☐ Hosting configured
☐ Custom domain working (optional)
☐ Push notifications enabled
☐ Test user created and can login
☐ Test ticket creation works
☐ Test notifications appear
☐ Admin user created
☐ Admin panel working
```

---

## 🧪 Testing After Setup

### Test User 1: Admin
```
Email: admin@university.edu.ng
Password: AdminTest@2026
Role: admin
Status: active
```

Create via Firebase Console:
1. Authentication → Users → Add user
2. Create above user
3. Create corresponding Firestore user doc

### Test User 2: Student
```
Email: student@university.edu.ng
Password: StudentTest@2026
Role: student
Status: active
```

### Test Flows

1. **Student Registration:**
   - Register new student
   - Verify account status shows "pending"
   - Login as admin and approve
   - Verify student can now login

2. **Ticket Submission:**
   - Login as student
   - Create ticket
   - Verify ticket appears in Firestore
   - Verify ticket ID increments

3. **Status Update:**
   - Login as admin
   - Update ticket status
   - Verify notification created
   - Verify student sees notification

4. **Comments:**
   - Add comment from student
   - Add comment from admin
   - Verify both see comments
   - Verify notification sent

---

## 🔐 Production Security Checklist

Before going live:

```
☐ Change security rules from test mode to strict
☐ Enable 2FA on Firebase account
☐ Set up Cloud Audit Logs
☐ Enable backup and recovery
☐ Review all user roles and permissions
☐ Test authentication thoroughly
☐ Verify HTTPS enabled
☐ Set up monitoring alerts
☐ Create admin account
☐ Test data deletion policies
☐ Document all configurations
☐ Create backup procedure
```

---

## 📊 Monitoring & Maintenance

### Firebase Console Tabs to Monitor

1. **Overview**
   - Real-time connections
   - Read/write rates
   - Usage by region

2. **Firestore Database**
   - Collection sizes
   - Document counts
   - Storage used

3. **Authentication**
   - Active users
   - Sign-in methods
   - User creation trends

4. **Cloud Functions**
   - Execution count
   - Errors
   - Performance

5. **Hosting**
   - Request count
   - Bandwidth used
   - Error rates

### Set Up Alerts

```
Firebase Console → Alerts
Create alerts for:
- Firestore reads/writes exceed threshold
- Authentication errors spike
- Function errors increase
- Hosting errors occur
```

---

## 🆘 Troubleshooting

### Issue: "Permission denied" errors
**Solution:** Check Firestore security rules, update rules for user role

### Issue: Notifications not sending
**Solution:** 
- Verify Cloud Functions are deployed
- Check Cloud Function logs for errors
- Verify user has notification permission

### Issue: Authentication fails after deployment
**Solution:**
- Add domain to authorized domains
- Update firebaseConfig in HTML
- Clear browser cache
- Check browser console for errors

### Issue: Firestore quota exceeded
**Solution:**
- Review security rules for inefficient queries
- Batch operations where possible
- Upgrade Firebase plan if needed
- Archive old notifications

---

**Setup Complete!** 🎉 Your ICT Helpdesk system is now live on Firebase.
