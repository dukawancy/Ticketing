# CLAUDE.md — ICT Helpdesk Ticketing System

## Project Overview

UNIJOS ICT Helpdesk — a production-ready IT support ticketing system for Nigerian universities (University of Jos). Handles the full lifecycle of support requests submitted by students and staff, managed by technicians, unit heads, and admins.

**Key constraint:** Vanilla HTML5 + CSS3 + ES6 JS — no build tools, no frameworks. Single `index.html` SPA loaded as a static file. All pages live inside `index.html` and are shown/hidden via JS.

---

## How to Run

```bash
# Option 1: Python (simplest)
python -m http.server 8000
# Open http://127.0.0.1:8000

# Option 2: Node HTTP server on port 5500 (use if 8000/3000 taken)
node -e "
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
http.createServer((req, res) => {
  const pathname = url.parse(req.url).pathname;
  let file = pathname === '/' ? '/index.html' : pathname;
  const fp = path.join(process.cwd(), file);
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200);
    res.end(data);
  });
}).listen(5500, () => console.log('http://localhost:5500'));
"
```

**Note:** Port 3000 is typically occupied by a VendHive Next.js project on this machine.

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Student | amina@unijos.edu.ng | pass123 |
| Staff | bello@unijos.edu.ng | pass123 |
| Technician (Network) | musa@unijos.edu.ng | ICT@2026 |
| Technician (Hardware) | emeka@unijos.edu.ng | ICT@2026 |
| Unit Head (Network) | fatima@unijos.edu.ng | ICT@2026 |
| Admin | admin@unijos.edu.ng | admin123 |
| Super Admin | director@unijos.edu.ng | director123 |

Dev shortcut: `http://127.0.0.1:5500/?dev=1` — auto-logins as admin.

---

## File Structure

```
/
├── index.html              # Single-page app — all pages live here
├── css/
│   └── main.css            # All styles (complete rewrite with new design system)
├── js/
│   ├── ui.js               # DOM manipulation, navigation, page rendering
│   ├── tickets.js          # Ticket CRUD, comments, assignment, routing
│   ├── utils.js            # timeAgo(), formatDate(), escapeHtml(), getStatusColor()
│   └── data.js             # DataService (localStorage), AuthService, NotificationService
├── firebase-config.example.js
├── firebase-messaging-sw.js
├── firestore.rules
├── functions/              # Firebase Cloud Functions (optional)
├── tests/
└── docs/                   # Role-specific user guides
```

---

## Tech Stack

- **Frontend:** Vanilla HTML5, CSS3, ES6+ JavaScript — no framework, no bundler
- **Storage (demo):** `localStorage` via `DataService` in `js/data.js`
- **Storage (prod):** Firebase Firestore — enable by setting `DEMO_MODE = false` in `js/data.js`
- **Auth (prod):** Firebase Auth (email/password)
- **Hosting options:** Firebase Hosting, Netlify, Vercel, or any static file server
- **Charts:** Built-in (no Chart.js — native canvas or CSS-based)
- **Fonts:** Plus Jakarta Sans (headings/body) + JetBrains Mono (IDs/code) — loaded from Google Fonts

---

## Design System (Current Theme)

The UI was redesigned with an OLED dark + glassmorphism theme. **The user has indicated they do not like this theme.** Before making further design changes, confirm the preferred theme with the user.

### CSS Custom Properties (in `css/main.css`)

```css
/* Surfaces */
--bg: #030712;        /* OLED black base */
--surface-1: #0D1117;
--surface-2: #161B22;
--surface-3: #1C2333;

/* Accents */
--accent: #4f7cff;    /* Primary blue */
--accent-2: #7c5cfc;  /* Purple */
--success: #22c55e;
--warning: #f59e0b;
--danger: #ef4444;
--info: #38bdf8;
--muted: #6b7280;

/* Layout */
--sidebar-width: 240px;
--topbar-height: 64px;

/* Fonts */
--font-head: 'Plus Jakarta Sans';
--font-body: 'Plus Jakarta Sans';
--font-mono: 'JetBrains Mono';
```

### Original Spec Colors (from `ICT_HELPDESK_SPECIFICATION.md`)
If reverting to spec: Primary `#4f7cff`, Secondary `#7c5cfc`, Background `#0f1117`, Surface `#1a1d27`. Fonts: Space Grotesk (headings) + DM Sans (body).

---

## Navigation & Layout

- **Sidebar:** 240px fixed sidebar (`<aside class="sidebar" id="mainSidebar">`), hidden via `transform: translateX(-100%)` below 1024px
- **Hamburger toggle:** `document.getElementById('mainSidebar').classList.toggle('open')`
- **Sidebar overlay:** `<div class="sidebar-overlay" id="sidebarOverlay">` closes sidebar on mobile tap
- **Topbar:** 64px fixed height, contains user info + notification bell

---

## JavaScript Architecture

All services are globals on `window`:

| Global | File | Purpose |
|--------|------|---------|
| `window.DataService` | `js/data.js` | localStorage CRUD for tickets/users/notifications |
| `window.AuthService` | `js/data.js` | Login, logout, getCurrentUser(), session |
| `window.NotificationService` | `js/data.js` | createNotification(), notifyStatusChange(), etc. |
| `window.TicketService` | `js/tickets.js` | submitTicket(), updateTicketStatus(), addComment(), assignTicket() |
| `window.UIService` | `js/ui.js` | navigateTo(), setupUserInterface(), buildTicketHtml(), showAuthPage() |
| `window.Utils` | `js/utils.js` | timeAgo(), formatDate(), escapeHtml(), getStatusColor() |

### Key patterns in `js/ui.js`

- `navigateTo(pageId)` — queries `.nav-tab, .mobile-nav-item` so sidebar items auto-work
- `setupUserInterface(user)` — queries `.nav-tab[data-roles]` to show/hide nav per role
- `showAuthPage(viewId)` — uses `classList.add/remove('active')` on `.auth-page` elements
- `buildTicketHtml(t)` — renders `<span class="badge badge-${t.status}">` enabling CSS `:has()` for status-colored borders

---

## Role-Based Access Control (RBAC)

5 roles controlled by `data-roles` attribute on `.nav-tab` elements:

| Role | Access |
|------|--------|
| `student` | Dashboard, My Tickets, New Ticket |
| `staff` | Dashboard, My Tickets, New Ticket |
| `technician` | Dashboard, My Queue, My Tickets, New Ticket |
| `unit-head` | Dashboard, All Tickets, My Team, Reports |
| `admin` | Dashboard, All Tickets, Users, Admin Console |

Registration: Students/Staff self-register (pending → admin approves). Technicians/Unit Heads/Admins created by admin only.

---

## Ticket System

### Ticket ID format
`TKT-{YEAR}-{NNNN}` (e.g. `TKT-2026-0001`) — generated in `TicketService.generateId()`

### Status flow
`open` → `in-progress` → `resolved` → `closed` (+ `escalated` branch)

### Auto-routing
On ticket submit, `tickets.js` maps category → unit and auto-assigns to the matching unit-head/technician:
```js
const categoryToUnit = {
  'Network & WiFi': 'Network',
  'Hardware': 'Hardware',
  'Software': 'Software',
  'Account & Access': 'Database',
  'CBT / E-Learning': 'CBT',
  'University Website': 'Web',
  'Email': 'Network'
};
```

### SLA hours by priority
- Critical: 1h
- High: 4h
- Medium: 24h
- Low: 72h

---

## CSS Patterns to Know

### Auth page fix (bug was pre-existing)
All `.auth-page` divs had `display: flex` — fixed with:
```css
.auth-page { display: none; }
.auth-page.active { display: flex; }
```

### Status-colored ticket borders (no JS needed)
```css
.ticket-item:has(.badge-open)::before { background: var(--warning); }
.ticket-item:has(.badge-in-progress)::before { background: var(--info); }
.ticket-item:has(.badge-resolved)::before { background: var(--success); }
```

### Sidebar responsive
```css
/* Desktop ≥1024px: always visible */
/* Mobile <1024px: hidden by default, shown via .open class */
.sidebar { transform: translateX(-100%); }
.sidebar.open { transform: translateX(0); }
```

---

## Firebase (Production Mode)

1. Follow `FIREBASE_SETUP_GUIDE.md` to create project
2. Copy config into `index.html` where `firebaseConfig` is declared
3. Set `DEMO_MODE = false` in `js/data.js`
4. Deploy rules: `firebase deploy --only firestore:rules`
5. Deploy app: `firebase deploy --only hosting`

Firestore collections: `tickets`, `users`, `notifications/{userId}/items`, `settings`

Security rules: `firestore.rules` — role-checked via Firestore user doc reads

---

## Testing

```bash
npm install
npm test                    # Jest unit tests in /tests/
node test-admin-simple.js   # Admin flow smoke test
```

See `ADMIN_TESTING_GUIDE.md` for full manual test checklist.

---

## Known Issues / Notes

- **User dislikes current OLED dark/glassmorphism theme** — confirm preferred theme before redesigning
- `backdrop-filter: blur()` (glassmorphism) requires a modern browser; degrades gracefully
- CSS `:has()` requires Chrome 105+, Firefox 121+, Safari 15.4+
- No build step — edit files directly; browser reload to see changes
- `package.json` exists for Jest tests only, not for bundling
