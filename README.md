# ICT Helpdesk Ticketing System

A comprehensive, production-ready IT helpdesk ticketing system built for Nigerian universities. This system handles the entire lifecycle of support requests from students, staff, and faculty, providing a secure, role-based platform for the ICT Directorate to manage technical operations.

## Features

- **Hybrid Authentication:** 
  - Self-registration for Students and Staff (with domain validation)
  - Admin-only account creation for Technicians and Unit Heads
- **Role-Based Access Control (RBAC):**
  - **Student/Staff:** Submit tickets, track status, add comments
  - **Technician:** View assigned queue, update status, add internal notes
  - **Unit Head:** View department metrics, assign tickets
  - **Admin:** Manage users, system-wide metrics, security settings
- **Ticket Lifecycle Management:**
  - Dynamic categorization and priority assignment
  - Status tracking (Open → In Progress → Resolved → Closed)
  - Full comment threading with internal tech notes
- **Push Notifications:**
  - In-app notification center with unread badges
  - Real-time updates via Firebase Cloud Messaging
- **Analytics Dashboard:** Role-specific metrics and workload visualization
- **Dark Mode UI:** Modern, responsive design using Space Grotesk and DM Sans

## Tech Stack

- **Frontend:** HTML5, CSS3 (Vanilla), JavaScript (ES6+)
- **Backend:** Firebase Services
  - **Authentication:** Email/Password, User Management
  - **Database:** Cloud Firestore
  - **Cloud Functions:** Automated SLAs, notification triggers
  - **Hosting:** Firebase Hosting / Netlify / Vercel

## Quick Start (Demo Mode)

The system comes with a built-in completely functional demo mode that uses `localStorage` instead of Firebase. No setup required!

1. Clone the repository
2. Open `index.html` in your browser, or run `npx serve .`
3. Use the following demo credentials:
   - **Student:** amina@university.edu.ng / pass123
   - **Technician:** musa@university.edu.ng / ICT@2026
   - **Admin:** admin@university.edu.ng / admin123

## Production Setup (Firebase)

To deploy with real data persistence and push notifications:

1. Follow the [Firebase Setup Guide](FIREBASE_SETUP_GUIDE.md) to create your project.
2. Update `firebase-config.example.js` with your credentials and rename to `firebase-config.js`.
3. Set `DEMO_MODE = false` in `js/data.js`.
4. Deploy security rules: `firebase deploy --only firestore:rules`
5. Deploy application: `firebase deploy --only hosting`

## Documentation

Full documentation is available in the `docs/` directory:
- [Student/Staff Guide](docs/STUDENT_GUIDE.md)
- [Admin Guide](docs/ADMIN_GUIDE.md)
- [Technician Guide](docs/TECHNICIAN_GUIDE.md)
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Security Guidelines](docs/SECURITY.md)
- [Database Schema](docs/DATABASE_SCHEMA.md)

## Testing

To run the unit and integration tests:

```bash
npm install
npm test
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct, and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
