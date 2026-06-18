# Administrator Guide

This guide covers the administrative functions of the ICT Helpdesk System. Admins have complete control over users, staff accounts, system tickets, and configuration.

## Account Management

### 1. Approving New Users
When a student or staff member registers, their account is "Pending" by default.
- Go to the **Manage Users** tab.
- Look at the "Pending Approvals" section.
- Verify the user's details and click **Approve** to activate the account or **Reject** to delete the registration request.

### 2. Managing Active Users
- In the **Manage Users** tab, all active accounts are listed.
- Use the **Suspend** button to temporarily revoke access if needed.
- Use the **Delete** button to permanently remove an account.

### 3. Creating Staff / Technician Accounts
Technicians and Unit Heads cannot self-register.
- Click **+ Add Staff** in the Manage Users page.
- Fill in their details (Name, Staff ID, Role, Unit, Email).
- Set a default password.
- *Note: In production, technicians are forced to change this default password upon their first login.*

---

## Ticket Management

Admins can view and manage all tickets across the entire university.

### Global Ticket View
- Go to the **All Tickets** tab.
- You can filter, search, and sort tickets.
- Overdue tickets are highlighted.

### Ticket Assignment
- Open any ticket.
- In the right sidebar, use the **Assign Tech** dropdown to select a technician from the appropriate unit.
- Click **Assign Ticket**. The technician will receive an immediate push notification and the ticket status will change to "In Progress".

### Overriding Settings
- Admins can manually override a ticket's status at any point using the **Update Status** dropdown on the ticket detail page.
- You can add comments to any ticket. You can also mark a comment as an **Internal Note** so that students cannot see it.

---

## Analytics & Reporting

The Admin **Dashboard** shows system-wide statistics:
- System Volume: Total tickets, open tickets, and resolved counts.
- SLA Compliance and Resolution Times (when connected to Firebase).
