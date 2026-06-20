/* =========================================
   ICT HELPDESK - DEMO DATABASE
   Mock data for demonstration purposes
   ========================================= */

const DEMO_MODE = true;

// Mock LocalStorage wrapper for persistence in demo mode
const DemoDB = {
    get: (key, defaultValue) => {
        try {
            const val = localStorage.getItem(`ict_helpdesk_${key}`);
            return val ? JSON.parse(val) : defaultValue;
        } catch(e) {
            return defaultValue;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(`ict_helpdesk_${key}`, JSON.stringify(value));
        } catch(e) {}
    },
    clear: () => {
        Object.keys(localStorage).forEach(key => {
            if(key.startsWith('ict_helpdesk_')) localStorage.removeItem(key);
        });
    }
};

// Initial Data Seed
const SEED_USERS = [
    { id: 'u_sadmin', name: 'Director ICT', email: 'director@unijos.edu.ng', role: 'super-admin', authPw: 'director123', status: 'active', uid: 'ICT/DIR/01' },
    { id: 'u_admin', name: 'System Admin', email: 'admin@unijos.edu.ng', role: 'admin', authPw: 'admin123', status: 'active', uid: 'ICT/ADM/01' },
    { id: 'u_student1', name: 'Amina Ibrahim', email: 'amina@unijos.edu.ng', role: 'student', authPw: 'pass123', status: 'active', uid: 'MAT/2023/1234' },
    { id: 'u_staff1', name: 'Dr. Bello', email: 'bello@unijos.edu.ng', role: 'staff', authPw: 'pass123', status: 'active', department: 'Computer Science' },
    { id: 'u_tech1', name: 'Musa Technician', email: 'musa@unijos.edu.ng', role: 'technician', authPw: 'ICT@2026', status: 'active', unit: 'Network' },
    { id: 'u_tech2', name: 'Chukwuemeka Obi', email: 'emeka@unijos.edu.ng', role: 'technician', authPw: 'ICT@2026', status: 'active', unit: 'Hardware' },
    { id: 'u_unithead1', name: 'Fatima Al-Amin', email: 'fatima@unijos.edu.ng', role: 'unit-head', authPw: 'ICT@2026', status: 'active', unit: 'Network' },
    { id: 'u_dispatcher', name: 'Hauwa Ibrahim', email: 'hauwa@unijos.edu.ng', role: 'dispatcher', authPw: 'ICT@2026', status: 'active' },
    { id: 'u_student_pending', name: 'Joy Essien', email: 'joy@unijos.edu.ng', role: 'student', authPw: 'pass123', status: 'pending', uid: 'BIO/2024/5678' }
];

const SEED_TICKETS = [
    {
        id: 'TKT-2026-0001',
        title: 'Cannot access portal to pay fees',
        category: 'Account & Access',
        subCategory: 'Portal Login',
        priority: 'high',
        status: 'open',
        description: 'When I try to login to portal.unijos.edu.ng, it says invalid credentials, but my password is correct. I need to pay my fees before Friday.',
        submittedById: 'u_student1',
        submittedBy: 'Amina Ibrahim',
        createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(), // 2 days ago
        updatedAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
        comments: []
    },
    {
        id: 'TKT-2026-0002',
        title: 'WiFi is very slow in Computer Science block',
        category: 'Network & WiFi',
        subCategory: 'Slow Connection',
        priority: 'medium',
        status: 'in-progress',
        assignedId: 'u_tech1',
        assignedTo: 'Musa Technician',
        description: 'The student WiFi in the CS block has been unbearably slow since morning. Pages barely load.',
        location: 'CS Block 2',
        submittedById: 'u_staff1',
        submittedBy: 'Dr. Bello',
        createdAt: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
        updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        comments: [
            { author: 'Musa Technician', authorId: 'u_tech1', text: 'We are looking into this. It seems to be an issue with one of the access points.', time: new Date(Date.now() - 3600000 * 2).toISOString(), isInternal: false }
        ]
    },
    {
        id: 'TKT-2026-0003',
        title: 'Projector not coming on in Lecture Hall A',
        category: 'Hardware',
        subCategory: 'Projector Fault',
        priority: 'critical',
        status: 'resolved',
        assignedId: 'u_tech1',
        assignedTo: 'Musa Technician',
        description: 'I have a class in 30 minutes and the projector won\'t power on.',
        location: 'Lecture Hall A',
        submittedById: 'u_staff1',
        submittedBy: 'Dr. Bello',
        createdAt: new Date(Date.now() - 3600000 * 48).toISOString(), 
        updatedAt: new Date(Date.now() - 3600000 * 45).toISOString(),
        comments: [
            { author: 'Musa Technician', authorId: 'u_tech1', text: 'Replaced the blown fuse in the power cable. Working fine now.', time: new Date(Date.now() - 3600000 * 45).toISOString(), isInternal: false }
        ]
    }
];

// Initialize if empty
let currentUsers = DemoDB.get('users', null);
if (!currentUsers) {
    DemoDB.set('users', SEED_USERS);
} else {
    // Ensure seed users added in later updates exist for sessions already initialised
    const seedIds = ['u_sadmin', 'u_tech2', 'u_unithead1', 'u_dispatcher'];
    let changed = false;
    seedIds.forEach(id => {
        if (!currentUsers.find(u => u.id === id)) {
            const user = SEED_USERS.find(u => u.id === id);
            if (user) { currentUsers.push(user); changed = true; }
        }
    });
    if (changed) DemoDB.set('users', currentUsers);
}

if (!DemoDB.get('tickets', null)) {
    DemoDB.set('tickets', SEED_TICKETS);
}
if (!DemoDB.get('notifications', null)) {
    DemoDB.set('notifications', {});
}
if (!DemoDB.get('audit_log', null)) {
    DemoDB.set('audit_log', []);
}

// Data Access Service
const DataService = {
    getUsers: () => DemoDB.get('users', []),
    saveUser: (user) => {
        let users = DataService.getUsers();
        const idx = users.findIndex(u => u.id === user.id);
        if (idx >= 0) users[idx] = user;
        else users.push(user);
        DemoDB.set('users', users);
        return user;
    },
    deleteUser: (id) => {
        let users = DataService.getUsers();
        users = users.filter(u => u.id !== id);
        DemoDB.set('users', users);
    },
    getTickets: () => DemoDB.get('tickets', []),
    saveTicket: (ticket) => {
        let tickets = DataService.getTickets();
        const idx = tickets.findIndex(t => t.id === ticket.id);
        if (idx >= 0) {
            ticket.updatedAt = new Date().toISOString();
            tickets[idx] = ticket;
        } else {
            ticket.createdAt = new Date().toISOString();
            ticket.updatedAt = ticket.createdAt;
            tickets.push(ticket);
        }
        DemoDB.set('tickets', tickets);
        return ticket;
    },
    getNotifications: (userId) => {
        const notifs = DemoDB.get('notifications', {});
        return notifs[userId] || [];
    },
    saveNotification: (userId, notification) => {
        const notifs = DemoDB.get('notifications', {});
        if (!notifs[userId]) notifs[userId] = [];
        notifs[userId].unshift(notification); // Add to beginning
        DemoDB.set('notifications', notifs);
    },
    clearNotifications: (userId) => {
        const notifs = DemoDB.get('notifications', {});
        notifs[userId] = [];
        DemoDB.set('notifications', notifs);
    },
    markAllNotificationsRead: (userId) => {
        const notifs = DemoDB.get('notifications', {});
        if (notifs[userId]) {
             notifs[userId] = notifs[userId].map(n => ({...n, read: true}));
             DemoDB.set('notifications', notifs);
        }
    },
    markNotificationRead: (userId, notifId) => {
        const notifs = DemoDB.get('notifications', {});
        if (notifs[userId]) {
             const idx = notifs[userId].findIndex(n => n.id === notifId);
             if (idx !== -1) {
                  notifs[userId][idx] = { ...notifs[userId][idx], read: true };
                  DemoDB.set('notifications', notifs);
             }
        }
    },
    removeNotification: (userId, notifId) => {
        const notifs = DemoDB.get('notifications', {});
        if (notifs[userId]) {
             notifs[userId] = notifs[userId].filter(n => n.id !== notifId);
             DemoDB.set('notifications', notifs);
        }
    },

    getAuditLog: () => DemoDB.get('audit_log', []),

    logAction: (action, performedBy, performedById, target, detail) => {
        const log = DataService.getAuditLog();
        log.unshift({
            id: 'al_' + Math.random().toString(36).substr(2, 9),
            action,
            performedBy,
            performedById,
            target,
            detail,
            time: new Date().toISOString()
        });
        DemoDB.set('audit_log', log.slice(0, 500));
    }
};

window.DataService = DataService;
window.DEMO_MODE = DEMO_MODE;
