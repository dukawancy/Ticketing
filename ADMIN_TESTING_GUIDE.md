# Admin Flows Manual Testing Guide

## Prerequisites
- App running on http://127.0.0.1:8000
- Python HTTP server: `cd ict-helpdesk && python -m http.server 8000`

## Automated Validation
Run the automated tests first:
```bash
cd ict-helpdesk
node test-admin-simple.js
```
All tests should pass ✅

## Manual Testing Steps

### 1. **Login as Admin**
- Navigate to http://127.0.0.1:8000
- Click "Login" button (top right)
- Select role: **admin**
- Click "Login"
- Expected: Dashboard shows, admin user is logged in

### 2. **Verify Admin Navigation** 
- Check top navigation bar
- **Expected**: New "Admin" nav button is visible (only for admins)
- For non-admin users: Admin button should be hidden

### 3. **Auto-Login Demo** (Dev Feature)
- Navigate to http://127.0.0.1:8000/?dev=1
- Click "Auto Assign" button (top right, dev-only)
- Expected: 
  - Admin auto-logs in
  - First ticket is assigned to a technician
  - Notification shows: "Auto assign"

### 4. **User Management - Suspend User**
- Go to "Users" page
- Find "Amina Ibrahim" (student user)
- Click "Suspend" button next to her name
- Confirmation modal appears: "Are you sure you want to suspend this user?"
- Click "Confirm"
- Expected:
  - User status changes to "suspended"
  - Audit log entry created
  - Notification appears: "User suspende"

### 5. **User Management - Force Password Change**
- Stay on "Users" page
- Find any user (e.g., "John Tech")
- Click "Force PW Change" button
- Confirmation modal appears
- Click "Confirm"
- Expected:
  - Notification shows action was taken
  - Audit log entry created

### 6. **Verify Suspended User Cannot Login**
- Logout (if you implemented logout)
- OR: Open private/incognito window
- Go to http://127.0.0.1:8000
- Click "Login", select "Amina Ibrahim" (suspended)
- Expected: Alert appears: "This user account is suspended"

### 7. **Access Admin Console**
- Login as admin again
- Click "Admin" in navigation bar
- Expected:
  - Admin Console page loads
  - Displays:
    - Audit Log section with all admin actions
    - User Management summary (active/suspended counts)

### 8. **Audit Log Viewer**
- On Admin page, scroll down to "Audit Log"
- Expected entries to include:
  - ✓ `suspend_user` when you suspended a user
  - ✓ `force_password` when you forced password change
  - ✓ `create_ticket` (from ticket creation)
  - ✓ `assign_ticket` (from ticket assignment)
  - ✓ `update_ticket` (from status changes)

### 9. **Audit Log Search**
- On Admin page, in "Audit Log" section
- Type in search box: "suspend"
- Expected: Only suspend-related entries show
- Clear search: All entries should return

### 10. **Audit Log Export**
- On Admin page, click "Export" button
- Expected:
  - JSON file downloads: `audit-log.json`
  - Contains all audit entries with actions, timestamps, user who performed action

### 11. **Notifications System**
- Perform an action (create ticket, assign ticket, update status)
- Expected:
  - Toast notification appears (bottom right, auto-disappears after 7s)
  - Notification badge with count appears (top right bell icon)
  - Can click notification to open related ticket
  - Notification persists in notification panel

### 12. **Notification Panel**
- Click bell icon (top right)
- Expected:
  - Panel slides open showing all notifications
  - Unread count badge visible on bell
  - Clicking "Clear" removes all notifications
  - Unread count resets

### 13. **Dashboard & Analytics**
- Go to Dashboard page
- Expected charts/metrics visible:
  - ✓ Tickets by Status (doughnut chart)
  - ✓ Tickets by Priority (bar chart)
  - ✓ Tickets by Category (pie chart)
  - ✓ SLA Compliance percentage
  - ✓ Average resolution time
  - ✓ Top Technicians list
  - ✓ Recent Tickets list

### 14. **Ticket Management**
- Go to "Tickets" page
- Search tickets by ID or title
- Filter by status
- Click a ticket to open detail modal
- Expected:
  - Modal opens with ticket details
  - Can add comments
  - Can change status
  - Admin can assign to technician
  - SLA indicator shows time remaining

### 15. **Accessibility Features**
- Press Tab key on any page
- Expected:
  - Focus indicators visible (blue outline)
  - Can navigate all interactive elements
  - Can submit forms via keyboard (Enter)
- Press Escape on modal
- Expected: Modal closes

### 16. **Role-Based Access Control**
- **Admin user**: Can see Admin button, suspend users, force password
- **Technician user**: Cannot see suspend/force password buttons
- **Student user**: Cannot see admin controls

## Performance Checks

- [ ] Page loads in <2 seconds (http://127.0.0.1:8000)
- [ ] Charts update smoothly when data changes
- [ ] Modals open/close smoothly
- [ ] Notifications appear/disappear smoothly
- [ ] No console errors (check DevTools Console)

## Browser Compatibility

Test in:
- [ ] Chrome/Brave
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Edge

## Final Verification Checklist

- [ ] All pages load correctly
- [ ] Admin features hidden for non-admins
- [ ] Audit log captures all admin actions
- [ ] Notifications show for ticket events
- [ ] Charts display and update
- [ ] Modal focus traps work
- [ ] Keyboard navigation works
- [ ] No JavaScript errors in console
- [ ] localStorage persists data across page reloads

---

**Test Result**: If all above tests pass ✅, the admin panel and user management system is fully functional.
