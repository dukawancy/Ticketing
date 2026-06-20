# Gap Analysis — UNIJOS ICT Helpdesk

## Missing Pages (0% implemented)

| Page | Roles | What it should have |
|------|-------|---------------------|
| Admin Console | admin | Audit log of all actions, export to JSON, search by action type, user stats summary |
| Reports | unit-head, admin | Charts — tickets by status/priority/category, SLA compliance %, avg resolution time, top technicians leaderboard |
| My Team | unit-head | Team workload view, assigned tickets per technician, performance metrics |
| My Queue | technician | Open/unassigned tickets in their unit — separate from "My Tickets" (assigned-to-me) |

The sidebar shows 5 nav items. The HTML has 6 page divs (including ticket-detail). The spec describes 9+ distinct views. **3–4 full pages are completely absent.**

---

## Dashboard — Hollow Shell

**What exists:** 4 number cards + a flat recent-ticket list.

**What is missing:**

- No charts — spec calls for doughnut (by status), bar (by priority), pie (by category)
- No SLA compliance % — e.g. "87% of tickets resolved within SLA this month"
- No average resolution time — e.g. "Avg 3.2 hrs"
- No top technicians leaderboard — who resolved the most tickets
- No overdue / SLA breach badges on any ticket anywhere
- No admin quick-action alerts — pending approvals count, unassigned ticket count

---

## Ticket List Views — No Power Features

| Feature | Status |
|---------|--------|
| Filter by priority | Missing |
| Filter by category | Missing |
| Filter by assignee | Missing |
| Date range filter | Missing |
| Sort by priority / SLA deadline | Missing |
| Pagination (degrades badly beyond ~50 tickets) | Missing |
| Overdue / SLA breach badge on each row | Missing |
| Bulk actions — bulk close, bulk assign | Missing |
| Admin table view with sortable columns | Missing — admin sees same flat card list as students |

---

## Ticket Detail — Missing Key Elements

| Feature | Status |
|---------|--------|
| SLA countdown timer (e.g. "4h 23m remaining") | Missing |
| Ticket history / change log — who changed what, when | Missing |
| Escalation button with mandatory reason field | Missing — only a status dropdown option exists |
| Edit ticket title / description after submission | Missing |
| Comment edit / delete (own comments) | Missing — spec says authors can edit/delete their own |
| Back button returns to originating list | Bug — always navigates to Dashboard regardless of where you came from |
| Live character counter on description | Bug — shows static "Minimum 20 characters", never updates |
| Related tickets | Missing |

---

## User Management — Incomplete

| Feature | Status |
|---------|--------|
| Force password change button per user | Missing — ADMIN_TESTING_GUIDE step 5 expects it |
| Search / filter the users list | Missing |
| Department / unit shown on user cards | Missing |
| Last login date on user cards | Missing |
| Add Staff button visible to `admin` role | Bug — code restricts it to `super-admin` only (ui.js line 675) |
| User activity summary (tickets submitted, resolved) | Missing |

---

## Notifications — Partially Hollow

| Feature | Status |
|---------|--------|
| In-app slide-in panel | Exists |
| Unread badge counter on bell | Exists |
| Click notification → jumps to ticket | Exists |
| Toast auto-dismiss | Exists |
| Notify on assignment | Exists |
| Mark individual notification as read (not just clear-all) | Missing |
| Escalation notification type | Icon mapped in code, never triggered |
| SLA breach / overdue alert | Missing entirely |

---

## Data & State Bugs

| Issue | Detail |
|-------|--------|
| `updatedAt` never stamped | `tickets.js` does not set `updatedAt` on status change or comment add — "Updated X ago" sorting is broken |
| Add Staff restricted to super-admin | `ui.js` line 675: `currentUser.role === 'super-admin'` — should include `admin` |
| No pagination | All tickets rendered at once — will degrade at scale |
| No real-time refresh | Must navigate away and back to see changes made elsewhere |
| Empty states use emoji (`📁`, `📭`) | Should use inline SVGs per design system rules |
| Destructive actions lack confirmation | Only "delete user" uses `confirm()` — reject user, status wipe, etc. do not |

---

## Priority Ranking

### Quick Wins (< 30 min each)

1. Fix `updatedAt` stamping in `tickets.js`
2. Fix Add Staff button — show for `admin` not just `super-admin`
3. Live character counter on description textarea
4. Replace emoji empty states with SVGs
5. Add confirmation dialogs for reject user and other destructive actions
6. Fix back button — return to originating list page

### Medium Effort, High Visible Value

1. SLA countdown badge on ticket cards and detail sidebar
2. Dashboard charts — status doughnut, priority bar, SLA % ring
3. Admin Console page — audit log table with search + JSON export
4. Force password change on user cards
5. Filter by priority / category / assignee in ticket lists
6. Ticket change history section in detail view

### Larger Features

1. Reports page — full analytics dashboard for unit-head / admin
2. My Team page — technician workload view for unit-head
3. My Queue page — unit-based open ticket queue for technicians
4. SLA breach detection loop + auto-escalation notification
5. Comment edit / delete
6. Pagination or virtual scroll for ticket lists
7. Bulk ticket actions (assign, close, export selection)
