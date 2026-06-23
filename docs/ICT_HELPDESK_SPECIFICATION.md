# ICT Directorate University Helpdesk Ticketing System

**Version:** 3.0 with Push Notifications  
**Technology Stack:** HTML5 + CSS3 + Vanilla JavaScript + Firebase (optional)  
**Target Users:** University Students, Staff, ICT Technicians, ICT Admin  
**University Location:** Nigeria  
**Status:** Production Ready  

---

## 📋 Project Overview

A comprehensive IT helpdesk ticketing system for a university's ICT Directorate that allows students, staff, and faculty to submit technical support requests, track their status, and communicate with IT technicians. Features hybrid authentication, role-based access control, real-time push notifications, and admin management capabilities.

---

## 👥 User Roles & Access Control

### Role 1: Student
- **Who:** University students (verified by @university.edu.ng email)
- **Can Do:**
  - Self-register with matric number + university email
  - Submit IT support tickets
  - View only their own tickets
  - Filter own tickets by status (Open, In Progress, Resolved, Closed)
  - Add comments to their tickets
  - Receive notifications on ticket status changes
  - Rate/close resolved tickets
- **Cannot Do:**
  - See other students' tickets
  - Assign tickets
  - Change ticket status (except marking as resolved)
  - Access admin panel

### Role 2: Staff/Lecturer
- **Who:** University staff, lecturers, administrative personnel
- **Can Do:**
  - Self-register with staff ID + university email
  - Submit tickets with higher priority options
  - View only their own tickets
  - Add comments
  - Receive notifications
- **Cannot Do:**
  - See other people's tickets
  - Admin functions

### Role 3: ICT Technician
- **Who:** IT support staff (created by Admin only)
- **Can Do:**
  - View only tickets assigned to them
  - Update ticket status (Open → In Progress → Resolved → Closed)
  - Add internal notes and comments
  - See ticket submission details
  - View work queue (assigned tickets)
  - Update ticket resolution notes
- **Cannot Do:**
  - Create their own account (must be created by Admin)
  - View unassigned tickets
  - Assign tickets to others
  - Access full admin panel

### Role 4: Unit Head/Team Lead
- **Who:** Senior technician overseeing a unit (Network, Software, Hardware, etc.)
- **Can Do:**
  - View all tickets in their unit
  - Assign unassigned tickets to technicians
  - Update any ticket status
  - View team performance metrics
  - Manage their team members
- **Cannot Do:**
  - Create user accounts
  - Suspend users
  - Access system-wide reports

### Role 5: ICT Admin/Director
- **Who:** ICT Directorate head/administrator
- **Can Do:**
  - See all tickets across all units and departments
  - Assign tickets to any technician
  - Create technician and admin accounts
  - Force password changes on admin-created accounts
  - Approve/reject student registrations
  - Suspend or delete user accounts
  - View system-wide analytics and reports
  - Manage all user accounts
  - View SLA compliance reports
  - Generate audit logs
- **Cannot Do:**
  - Submit support tickets as a regular user (can but shouldn't)

---

## 🔐 Authentication System (Hybrid Model)

### Self-Registration Flow (Students & Staff)

```
1. User clicks "Register"
2. Fills form:
   - Full Name
   - Matric/Staff Number
   - Faculty/Department
   - Role (Student or Staff)
   - University Email (@university.edu.ng)
   - Password (min 6 chars)
3. Account created with status="pending"
4. Display message: "Your account is pending ICT Admin approval"
5. Email sent to student (optional, for demo shows message)
6. ICT Admin reviews in User Management panel
7. Admin clicks "Approve" → status="active"
8. Student can now login with their password
```

### Admin-Created Account Flow (Technicians & Admins)

```
1. Admin goes to "Users" → "+ Add Staff Account"
2. Fills form:
   - Full Name
   - Staff ID (e.g., ICT/TECH/001)
   - Role (Technician, Unit Head, or Admin)
   - Unit/Department (Network, Software, Hardware, CBT, Database, etc.)
   - Email (@university.edu.ng)
   - Default Password (e.g., ICT@2026)
3. Account created with status="active" + mustChangePw=true
4. Email sent with login credentials (demo: shows in UI)
5. Technician logs in with default password
6. Force Password Change overlay appears
7. Technician must set new password before proceeding
8. Can now use the system
```

### Login Flow

```
1. User enters email + password
2. System checks credentials
3. If pending: Show "Account Pending Approval" screen
4. If active:
   - If mustChangePw: Show force password change modal
   - If normal: Launch app
5. If credentials wrong: Show error "Invalid email or password"
6. If suspended: Show error "Account has been suspended"
```

### Password Requirements

- **Minimum length:** 6 characters
- **Must change on first login:** Admin-created accounts only
- **Reset password:** Send email with reset link (requires Firebase)
- **Demo mode:** Show password reset option without sending email

---

## 🎫 Ticket Management System

### Ticket Categories

```
1. Account & Access
   - Portal Login
   - Email Access
   - Password Reset
   - New Account Request

2. Network & WiFi
   - No Internet
   - Slow Connection
   - WiFi Not Showing
   - VPN Issues

3. Hardware
   - Computer Not Working
   - Printer Issue
   - Projector Fault
   - Mouse/Keyboard Problems

4. Software
   - Software Installation
   - System Crash
   - License Issue
   - Update Problem

5. CBT / E-Learning
   - Exam Portal Error
   - Submission Failed
   - LMS Login Issues
   - Course Not Showing

6. University Website
   - Page Not Loading
   - Wrong Information
   - Form Not Working

7. Email
   - Email Setup
   - Cannot Send
   - Cannot Receive
   - Spam Issues

8. Other
   - Miscellaneous issues
```

### Ticket Priority Levels

| Level | Color | Response Time | Auto-Escalate | Example |
|-------|-------|---|---|---|
| 🟢 **Low** | Green | 72 hours | 7 days | Software installation request |
| 🔵 **Medium** | Blue | 24 hours | 3 days | One lab PC not working |
| 🟠 **High** | Orange | 4 hours | 12 hours | Faculty internet down |
| 🔴 **Critical** | Red | 1 hour | 2 hours | CBT exam server down |

### Ticket Status Workflow

```
┌─────────────────────────────────────┐
│          OPEN (Created)             │
│     - Awaiting assignment           │
│     - Can be assigned to tech       │
└─────────────────────────────────────┘
              ↓ (Assigned)
┌─────────────────────────────────────┐
│       IN PROGRESS (Being worked)    │
│     - Tech is actively working      │
│     - Can add internal notes        │
└─────────────────────────────────────┘
              ↓ (Fixed)
┌─────────────────────────────────────┐
│       RESOLVED (Tech thinks fixed)  │
│     - Awaiting user confirmation    │
│     - User must verify              │
└─────────────────────────────────────┘
              ↓ (User confirms)
┌─────────────────────────────────────┐
│    CLOSED (Confirmed as fixed)      │
│     - Final rating from user        │
│     - Archived for records          │
└─────────────────────────────────────┘

ESCALATION PATH:
Open → ESCALATED (if unassigned >2hrs)
In Progress → ESCALATED (if no progress >4hrs)
Escalated → Reassigned to senior tech
```

### Ticket Form Fields

```
REQUIRED:
- Ticket Title (max 100 chars)
- Category (dropdown)
- Sub-Category (depends on category)
- Priority (dropdown)
- Description (min 20 chars, max 2000)

OPTIONAL:
- Location/Room Number
- Attachment/Screenshot (max 5MB, PNG/JPG)
- Phone Number for urgent callback
- Preferred resolution method (in-person, remote, both)

AUTO-FILLED:
- Submitted By (from current user)
- Submitted Date/Time
- Ticket ID (TKT-2026-0001, etc.)
- Department/Faculty (from user profile)
```

### Ticket Detail Page

Display:
- Ticket ID (clickable to copy)
- Title
- Status badge
- Priority badge
- Category badge
- Description (formatted, preserve line breaks)
- Submitted by + Date/Time
- Location
- Current assignment (if any)
- SLA timer (if configured)
- Full comment thread with timestamps
- Add comment textarea (everyone can comment)

---

## 🔔 Push Notification System

### Notification Types

#### 1. Status Change Notification
- **Trigger:** Ticket status changes (Open → In Progress, In Progress → Resolved, etc.)
- **Who Gets It:** Original submitter + assigned technician
- **Message:** "Ticket TKT-2026-0001: Status changed to In Progress"
- **Action:** Click to view ticket detail
- **Icon:** 📋

#### 2. Comment Notification
- **Trigger:** Someone adds a comment to a ticket you're involved with
- **Who Gets It:** All people who commented + submitter + assigned tech
- **Message:** "Amina Ibrahim commented on TKT-2026-0001"
- **Action:** Click to jump to that comment
- **Icon:** 💬

#### 3. Assignment Notification
- **Trigger:** Ticket is assigned to a technician
- **Who Gets It:** The assigned technician
- **Message:** "New ticket assigned to you: TKT-2026-0001 - Cannot login to portal"
- **Action:** Click to view work queue
- **Icon:** 👤

#### 4. Escalation Notification
- **Trigger:** Ticket is auto-escalated due to SLA breach
- **Who Gets It:** Unit Head + Assigned Tech + Admin
- **Message:** "ESCALATED: TKT-2026-0001 has been waiting for 2+ hours"
- **Action:** Click to prioritize
- **Icon:** ⚠️

#### 5. New Ticket Notification
- **Trigger:** Student/Staff submits a new ticket
- **Who Gets It:** Admin + Relevant Unit Head
- **Message:** "New ticket submitted: TKT-2026-0001 - Network issue in Block C"
- **Action:** Click to assign
- **Icon:** 🎫

### Notification Delivery Methods

#### Method 1: In-App Notifications
- **How:** Notification panel on right side of app
- **Visibility:** Bell icon with unread count badge
- **Features:**
  - Chronological list (newest first)
  - Mark as read on click
  - "Clear All" button
  - Hover shows full message
  - Click to jump to ticket

#### Method 2: Browser Push Notifications
- **How:** Desktop notification (requires permission)
- **When:** When browser notification is enabled in settings
- **Features:**
  - Works even if tab is in background
  - Shows icon + title + message
  - Click to focus tab and view ticket
  - Rich notifications with actions (mark as read, view)

#### Method 3: Toast Notifications (Real-time Feedback)
- **How:** Small popup at bottom-right of screen
- **When:** User performs action (submit ticket, add comment)
- **Duration:** 3 seconds, auto-dismisses
- **Types:** Success (green), Error (red), Warning (orange)

### Notification Preferences Panel

Users can customize which notifications they receive:
```
☑ Status Changes
☑ New Comments
☑ Ticket Assignments
☑ SLA Escalations
☑ New Ticket Alerts (admin only)
```

Toggles to enable/disable per notification type.

---

## 📊 Dashboard & Analytics

### Student/Staff Dashboard

Display:
- **Stats Cards:**
  - Open Tickets (warning color)
  - In Progress (info color)
  - Resolved (success color)
  - Total Tickets (neutral)
- **Recent Tickets List** (5 most recent)
  - ID, Title, Status, Priority, Date
  - Click to view detail
- **Quick Actions:**
  - "+ New Ticket" button
  - "View All My Tickets" link

### Technician Dashboard

Display:
- **Stats Cards:**
  - My Open (unassigned to me)
  - My In Progress (assigned to me)
  - My Resolved (completed by me)
  - Team Workload (if unit head)
- **Work Queue** (assigned tickets only)
  - Sortable by priority, date, SLA
  - Colored SLA indicators (green=ok, yellow=warning, red=overdue)
- **Recent Activity Feed**

### Admin Dashboard

Display:
- **System Stats:**
  - Total Tickets (all time)
  - Open Tickets (unassigned)
  - Average Resolution Time
  - SLA Compliance %
- **Unit Performance:**
  - Tickets by unit
  - Avg response time per unit
  - Tech utilization
- **User Management:**
  - Pending approvals
  - Active users
  - Suspended accounts
- **Charts (optional):**
  - Tickets by category (pie chart)
  - Tickets by priority (bar chart)
  - Resolution time trend (line chart)

---

## 📱 UI/UX Specifications

### Design System

**Colors:**
- Primary: #4f7cff (Blue)
- Secondary: #7c5cfc (Purple)
- Success: #22c55e (Green)
- Warning: #f59e0b (Orange)
- Danger: #ef4444 (Red)
- Background: #0f1117 (Dark)
- Surface: #1a1d27 (Dark Gray)
- Text: #f0f2f8 (Light)
- Muted: #8b90a7 (Gray)

**Typography:**
- Headings: Space Grotesk (600-700 weight)
- Body: DM Sans (400 weight)
- Monospace: System monospace (for IDs, codes)

**Spacing:** 8px base unit (8, 12, 16, 24, 32, 48px)
**Border Radius:** 12px (cards), 8px (inputs), 50px (pills/badges)
**Shadows:** Subtle elevation on hover

### Page Layout

**Navigation Bar (Sticky, Top)**
- Logo + App Name (left)
- Nav tabs for pages (center)
- User avatar + name + role badge + logout (right)

**Notification Panel (Slide-in, Right)**
- Only visible when user clicks 🔔 bell
- Overlays content, can close with ✕ button
- Shows notification history
- Settings toggle for notification types

**Main Content Area**
- Max-width: 980px, centered
- Responsive: 1 column on mobile, multi-column on desktop
- Padding: 1.5rem

### Responsive Design

- **Mobile (<600px):** Single column, full-width inputs, bottom sheet for panels
- **Tablet (600-1024px):** 2 columns, optimized spacing
- **Desktop (>1024px):** Full multi-column layout, side panels

---

## 🔗 API Integration (Firebase)

### When Connecting to Firebase

Replace the demo data structures with real Firebase calls:

#### Firestore Collections

```
universities/
  ├── {universityId}/
      ├── tickets/
      │   └── {ticketId}
      │       ├── id: string
      │       ├── title: string
      │       ├── description: string
      │       ├── category: string
      │       ├── priority: string (low|medium|high|critical)
      │       ├── status: string (open|in-progress|resolved|closed|escalated)
      │       ├── location: string
      │       ├── submittedBy: string (user name)
      │       ├── submittedById: string (user ID)
      │       ├── assignedTo: string (technician name)
      │       ├── assignedToId: string (technician ID)
      │       ├── createdAt: timestamp
      │       ├── updatedAt: timestamp
      │       ├── resolvedAt: timestamp (nullable)
      │       ├── escalatedAt: timestamp (nullable)
      │       ├── closedAt: timestamp (nullable)
      │       ├── slaBreached: boolean
      │       ├── comments: array
      │       │   ├── {
      │       │   │   ├── author: string
      │       │   │   ├── authorId: string
      │       │   │   ├── text: string
      │       │   │   ├── time: timestamp
      │       │   │   ├── isInternal: boolean (tech notes only)
      │       │   │   └── attachmentUrl: string (nullable)
      │       │   └── ...
      │       └── attachments: array
      │           └── { url, name, size, uploadedAt }
      │
      ├── users/
      │   └── {userId}
      │       ├── id: string
      │       ├── name: string
      │       ├── email: string
      │       ├── password: hashed (Firebase Auth handles this)
      │       ├── role: string (student|staff|technician|unit-head|admin)
      │       ├── status: string (pending|active|suspended)
      │       ├── uid: string (matric/staff number)
      │       ├── department: string
      │       ├── unit: string (for technicians)
      │       ├── initials: string
      │       ├── createdAt: timestamp
      │       ├── lastLogin: timestamp
      │       ├── mustChangePw: boolean
      │       ├── notificationPrefs: object
      │       │   ├── statusChange: boolean
      │       │   ├── comments: boolean
      │       │   ├── assignments: boolean
      │       │   └── escalations: boolean
      │       └── notificationToken: string (for push)
      │
      ├── notifications/
      │   └── {userId}
      │       └── {notificationId}
      │           ├── type: string (status-change|comment|assignment|escalation)
      │           ├── title: string
      │           ├── message: string
      │           ├── ticketId: string
      │           ├── read: boolean
      │           ├── createdAt: timestamp
      │           └── expiresAt: timestamp
      │
      └── settings/
          └── sla/
              ├── low: 72
              ├── medium: 24
              ├── high: 4
              └── critical: 1
```

#### Firebase Authentication

```javascript
// User registration (Student/Staff)
firebase.auth().createUserWithEmailAndPassword(email, password)
  .then(userCredential => {
    // Store additional user data in Firestore
    db.collection('users').doc(userCredential.user.uid).set({...})
  })

// User login
firebase.auth().signInWithEmailAndPassword(email, password)
  .then(userCredential => {
    // User logged in, load user data
    loadUserProfile(userCredential.user.uid)
  })

// Admin creates account
// Use Firebase Admin SDK or create user programmatically
// Then set mustChangePw = true
```

#### Real-time Updates (Firestore Listeners)

```javascript
// Listen for ticket updates
db.collection('tickets').where('id', '==', ticketId)
  .onSnapshot(doc => {
    // Update UI when ticket changes
    updateTicketDisplay(doc.data())
    // Trigger notification if status changed
    if(statusChanged) addNotification(...)
  })

// Listen for new comments
db.collection('tickets').doc(ticketId)
  .collection('comments')
  .orderBy('time', 'desc')
  .limit(50)
  .onSnapshot(snapshot => {
    // Update comments list
    displayComments(snapshot.docs)
  })

// Listen for user's notifications
db.collection('notifications').doc(currentUserId)
  .collection('items')
  .where('read', '==', false)
  .onSnapshot(snapshot => {
    // Update notification badge
    updateNotificationBadge(snapshot.size)
  })
```

---

## 📝 Feature Checklist

### Core Features
- ✅ User authentication (Email + Password)
- ✅ Self-registration (Students & Staff)
- ✅ Admin account creation (Technicians & Admins)
- ✅ Role-based access control
- ✅ Ticket submission form
- ✅ Ticket status tracking
- ✅ Ticket filtering and search
- ✅ Comments on tickets
- ✅ Real-time notifications (in-app)
- ✅ Browser push notifications
- ✅ User profile management
- ✅ Admin user management panel
- ✅ Dashboard with statistics

### Admin Features
- ✅ Approve/reject pending users
- ✅ Suspend/unsuspend accounts
- ✅ Delete user accounts
- ✅ Create technician accounts
- ✅ Assign tickets to technicians
- ✅ View all tickets system-wide
- ✅ Update any ticket status
- ✅ View system analytics

### Technician Features
- ✅ View assigned tickets
- ✅ Update ticket status
- ✅ Add internal notes
- ✅ Resolve tickets
- ✅ Close tickets

### User Features
- ✅ Submit support tickets
- ✅ Track ticket status
- ✅ Communicate via comments
- ✅ Receive notifications
- ✅ View ticket history
- ✅ Rate resolved tickets

---

## 🚀 Deployment Instructions

### Option 1: Netlify (Recommended for Quick Start)

```bash
1. Save the HTML file locally
2. Go to netlify.com
3. Drag and drop the HTML file
4. Get instant live URL
5. Share URL with university
```

**Pros:**
- Free
- Instant deployment
- No server needed
- No configuration

**Cons:**
- Demo data only (no real database)
- Data resets on refresh

### Option 2: Firebase Hosting

```bash
1. Create Firebase project (console.firebase.google.com)
2. Install Firebase CLI: npm install -g firebase-tools
3. Init project: firebase init
4. Deploy: firebase deploy
5. Get live URL
```

**Pros:**
- Free tier available
- Real database (Firestore)
- Real authentication
- Real-time updates

**Cons:**
- Requires setup
- Firebase configuration needed

### Option 3: Traditional Web Server (Advanced)

```bash
1. Deploy to any web host (Apache, Nginx, etc.)
2. Point domain to server
3. Connect to Firebase or own backend
4. Configure SSL certificate
```

---

## 🛠️ Development Notes

### File Structure

```
ict-helpdesk/
├── index.html (main single-file app)
├── styles/
│   └── main.css (or inline in HTML)
├── js/
│   ├── app.js (main logic)
│   ├── auth.js (authentication)
│   ├── notifications.js (push notifications)
│   └── firebase-config.js (Firebase setup)
├── assets/
│   ├── icons/
│   ├── images/
│   └── fonts/
└── README.md (documentation)
```

### Key JavaScript Classes/Objects

```javascript
// User object
{
  id: string,
  name: string,
  email: string,
  role: 'student'|'staff'|'technician'|'unit-head'|'admin',
  status: 'pending'|'active'|'suspended',
  initials: string,
  department: string,
  unit: string // for technicians
}

// Ticket object
{
  id: string,
  title: string,
  description: string,
  category: string,
  priority: 'low'|'medium'|'high'|'critical',
  status: 'open'|'in-progress'|'resolved'|'closed'|'escalated',
  submittedBy: string,
  submittedId: string,
  assignedTo: string,
  assignedId: string,
  location: string,
  createdAt: ISO8601,
  updatedAt: ISO8601,
  comments: [{author, text, time}],
  attachments: []
}

// Notification object
{
  id: string,
  type: 'status-change'|'comment'|'assignment'|'escalation',
  title: string,
  message: string,
  ticketId: string,
  read: boolean,
  time: ISO8601
}
```

### CSS Classes Used

- `.page` - Hidden by default, shown with `.page.active`
- `.btn` - Button styles (primary, secondary, danger)
- `.badge` - Status badges (open, resolved, critical, etc.)
- `.stat-card` - Dashboard stats
- `.ticket-item` - Ticket list items
- `.notif-item` - Notification items
- `.form-card` - Form containers
- `.detail-card` - Detail page cards
- `.filter-btn` - Filter buttons

### Browser Compatibility

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- IE11: ❌ Not supported (uses ES6+)
- Mobile browsers: ✅ Responsive design

### Performance Optimization

- Minify CSS and JavaScript in production
- Use service workers for offline support (optional)
- Cache notification history in localStorage
- Lazy load attachments
- Limit notification history to 100 items

---

## 📖 User Guide Snippets

### For Students

1. **Create Account:**
   - Click "Register"
   - Fill form with @university.edu.ng email
   - Wait for ICT Admin approval (notification sent to email)

2. **Submit Ticket:**
   - Click "+ New Ticket"
   - Fill Title, Category, Priority, Description
   - Click "Submit Ticket"
   - Get Ticket ID (e.g., TKT-2026-0001)

3. **Track Status:**
   - Go to "My Tickets"
   - See status: Open → In Progress → Resolved → Closed
   - Click ticket to see comments from technician

4. **Get Notified:**
   - Click 🔔 bell to see all notifications
   - You'll get notified when status changes
   - Click notification to jump to ticket

### For Technicians

1. **View Assigned Work:**
   - Go to "My Work Queue"
   - See all tickets assigned to you
   - Sorted by priority and SLA

2. **Update Ticket:**
   - Click ticket to open detail
   - Change status: Open → In Progress → Resolved
   - Add comment with resolution
   - Submit changes

3. **Communicate:**
   - Add comments visible to submitter
   - Add internal notes (tech-only)
   - Attach screenshots/documents

### For Admin

1. **Approve Registrations:**
   - Go to "Users"
   - See "Pending Approval" section
   - Click "Approve" or "Reject"
   - User gets notification

2. **Create Technician Account:**
   - Go to "+ Add Staff Account"
   - Fill technician details
   - Set default password
   - Tech must change on first login

3. **Manage Tickets:**
   - Go to "All Tickets"
   - Quick status update (dropdown)
   - Quick assign (dropdown)
   - View full ticket by clicking "View"

---

## 🔒 Security Considerations

### Client-Side Security (Demo Mode)
- Passwords stored in memory only (NOT localStorage)
- No sensitive data in URL parameters
- CSRF tokens for form submissions (when using backend)

### When Deploying with Firebase
- Enable Firebase Authentication
- Set Firestore security rules to enforce role-based access
- Use HTTPS only
- Implement rate limiting on API calls
- Hash passwords using Firebase Auth (automatic)
- Log all admin actions for audit trail
- Implement field-level encryption for sensitive data

### Security Rules Example (Firestore)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Students can only see their own tickets
    match /tickets/{ticketId} {
      allow read: if request.auth.uid == resource.data.submittedId || 
                     request.auth.uid == resource.data.assignedId ||
                     getUserRole(request.auth.uid) in ['admin', 'unit-head'];
      allow create: if getUserRole(request.auth.uid) in ['student', 'staff'];
      allow update: if getUserRole(request.auth.uid) == 'admin' ||
                       (getUserRole(request.auth.uid) == 'technician' && request.auth.uid == resource.data.assignedId);
    }
    
    // Admin only: user management
    match /users/{userId} {
      allow read: if request.auth.uid == userId || getUserRole(request.auth.uid) == 'admin';
      allow update: if request.auth.uid == userId || getUserRole(request.auth.uid) == 'admin';
    }
  }
  
  function getUserRole(uid) {
    return get(/databases/$(database)/documents/users/$(uid)).data.role;
  }
}
```

---

## 📞 Support & Maintenance

### Common Issues & Solutions

**Issue:** Notifications not appearing
- **Solution:** Check browser notification permission in settings
- **Solution:** Refresh page to reload notification listener

**Issue:** Cannot login after registration
- **Solution:** Check that email ends with @university.edu.ng
- **Solution:** Wait for admin approval if status is "pending"

**Issue:** Ticket not saving
- **Solution:** Check internet connection
- **Solution:** Ensure all required fields are filled
- **Solution:** Check browser console for errors

### Admin Maintenance Tasks

- Review pending user registrations weekly
- Monitor unassigned tickets (SLA breach risk)
- Archive closed tickets monthly
- Backup database weekly (Firebase automatic)
- Review tech performance metrics monthly
- Update SLA times based on capacity
- Clean up old notifications (>3 months)

---

## 🎯 Success Metrics

### User Adoption
- Target: 80% of students and staff registered within 3 months
- Target: 100% of support requests via system by month 6

### Performance
- Average ticket resolution time: <48 hours
- SLA compliance: >95%
- Ticket reopen rate: <5%

### Satisfaction
- User satisfaction rating: >4/5 stars
- Support response time: <2 hours for critical tickets
- System uptime: >99.5%

### Usage
- Average tickets per day: 10-20
- Peak hours: 9-11am, 2-3pm (during lectures)
- Response rate to comments: >90% within 24hrs

---

## 📚 Additional Resources

- Firebase Documentation: https://firebase.google.com/docs
- MDN Web Docs (JavaScript): https://developer.mozilla.org
- CSS Variables Guide: https://developer.mozilla.org/en-US/docs/Web/CSS/--*
- Responsive Design: https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Responsive_Design
- Web Notifications API: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API

---

## 📝 Changelog

### Version 3.0
- Added push notifications (in-app + browser)
- Added notification preferences panel
- Improved UI responsiveness
- Added notification history
- Added unread count badge
- Performance optimizations

### Version 2.0
- Added hybrid authentication system
- Added user management (admin only)
- Added role-based access control
- Added admin panel
- Full comment threading

### Version 1.0
- Initial release
- Basic ticketing system
- Ticket creation and tracking
- Status updates
- Simple authentication

---

**Last Updated:** June 2026  
**Created for:** Nigerian University ICT Directorate  
**License:** MIT (for deployment and modification)
