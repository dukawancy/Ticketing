# Database Schema (Firebase Firestore)

This document outlines the NoSQL structure used in Cloud Firestore.

## Collections

### 1. `users/{userId}`

```json
{
  "id": "u_abc123",
  "name": "Jane Doe",
  "email": "jane@university.edu.ng",
  "role": "student", // student, staff, technician, unit-head, admin
  "status": "active", // pending, active, suspended
  "uid": "MAT/2023/123", // Matric Number or Staff ID
  "department": "Mathematics",
  "createdAt": "2026-06-15T12:00:00.000Z",
  "notificationToken": "firebase-messaging-token-string"
}
```

### 2. `tickets/{ticketId}`

```json
{
  "id": "TKT-2026-0001",
  "title": "Cannot login to portal",
  "category": "Account & Access",
  "priority": "high", // low, medium, high, critical
  "status": "open", // open, in-progress, resolved, closed, escalated
  "location": "Library",
  "description": "Full text of the issue...",
  "submittedById": "u_abc123",
  "submittedBy": "Jane Doe",
  "assignedId": "u_tech01", // null if unassigned
  "assignedTo": "Musa Technician",
  "createdAt": "2026-06-15T12:00:00.000Z",
  "updatedAt": "2026-06-15T14:30:00.000Z",
  "comments": [
    {
      "id": "c_xyz789",
      "author": "Musa Technician",
      "authorId": "u_tech01",
      "authorRole": "technician",
      "text": "Looking into this server issue.",
      "time": "2026-06-15T14:30:00.000Z",
      "isInternal": false
    }
  ]
}
```

### 3. `notifications/{userId}/items/{notifId}`

```json
{
  "id": "n_123456",
  "type": "status-change", // status-change, comment, assignment, escalation
  "title": "Ticket Status Updated",
  "message": "Ticket TKT-2026-0001 changed to In Progress",
  "ticketId": "TKT-2026-0001",
  "read": false,
  "createdAt": "2026-06-15T14:30:00.000Z"
}
```

## Security Note

- The `authPw` field seen in the Demo mode is **not** stored in Firebase. Firebase Authentication securely handles password hashing and salt via its Auth Service.
- The `comments` array is embedded in the ticket document to reduce read costs, as comment threads usually stay below 1MB in size.
