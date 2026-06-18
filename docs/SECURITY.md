# Security Implementation

This system employs several layers of security to protect university data.

## 1. Authentication Security

- **Domain Restriction:** Standard user registration is restricted via regex to emails ending in `@university.edu.ng`.
- **Hybrid Approval Model:** Even if someone creates an email, they cannot access the system until an ICT Administrator manually verifies their Matric/Staff ID and clicks "Approve".
- **Password Hashes:** Handled automatically by Firebase Auth in production. Passwords are never stored in plaintext. (In Demo mode, passwords are only kept in local testing memory).

## 2. Infrastructure Security (Firestore Rules)

Access control logic is enforced at the database layer (see `firestore.rules`):

- **Data Isolation:** Students can only `read` ticket documents where `resource.data.submittedById == request.auth.uid`.
- **Write Prevention:** Malicious users cannot alter ticket statuses via API abuse because `update` permissions are strictly restricted to `admin` or the specifically assigned `technician` ID.
- **Admin Lockdown:** Admin users get full `read/write` access globally, verified via a token claim or custom role lookup function embedded in the rules.

## 3. Frontend Security

- **XSS Prevention:** All user-submitted text (ticket titles, descriptions, comments) goes through the `Utils.escapeHtml()` function before being injected into the DOM via `innerHTML`.
- **Route Guarding:** User Interface navigation buttons and views are dynamically generated based on role.

## 4. HTTP Headers

When deployed via Netlify or Vercel, the configuration files enforce:
- `X-Frame-Options: DENY` (Prevents clickjacking)
- `X-XSS-Protection: 1; mode=block`
- `X-Content-Type-Options: nosniff`
