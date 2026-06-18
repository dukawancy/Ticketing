# API Reference (JavaScript Service Layer)

This document describes the core JavaScript service layer that interacts with the backend (or DemoDB LocalStorage).

## AuthService

Handles all user authentication and session management.

### `AuthService.login(email, password)`
Authenticates a user.
- **Returns:** Promise resolving to `{ status: 'success'|'pending', user: Object }`

### `AuthService.register(userData)`
Registers a new user (Student/Staff). Status is automatically set to "pending".
- **Parameters:** `userData` object containing `name, uid, role, email, authPw`
- **Returns:** Promise resolving to created User object.

### `AuthService.logout()`
Clears session and reloads UI state.

### `AuthService.getCurrentUser()`
- **Returns:** Current session user object or `null`.

## TicketService

Handles CRUD operations for support tickets.

### `TicketService.submitTicket(ticketData)`
Creates a new ticket.
- **Parameters:** `ticketData` object (title, category, subCategory, priority, description)
- **Returns:** Promise resolving to created Ticket object.

### `TicketService.getUserTickets()`
- **Returns:** Array of tickets submitted by the current user.

### `TicketService.getAssignedTickets()`
- **Returns:** Array of tickets assigned to the current technician.

### `TicketService.updateTicketStatus(ticketId, newStatus)`
Updates the status of a given ticket and triggers a notification.
- **Returns:** Updated Ticket object.

### `TicketService.addComment(ticketId, text, isInternal)`
Adds a comment to a ticket.
- **Parameters:** `isInternal` (boolean) - If true, hides from non-staff.

## NotificationService

Handles push notifications and Notification Panel updates.

### `NotificationService.requestPermission()`
Prompts the browser to allow push notifications.

### `NotificationService.createNotification(userId, type, title, message, ticketId)`
Saves a notification to the database and optionally pushes to the browser if online.

### `NotificationService.getUnreadCount(userId)`
- **Returns:** Integer count of unread notifications for a user.
