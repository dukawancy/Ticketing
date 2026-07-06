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

const SEED_ROLES = [
    { id: 'role_student', name: 'Student', description: 'Can submit and track tickets', permissions: ['submit_ticket', 'view_own_tickets'] },
    { id: 'role_staff', name: 'Staff', description: 'University staff member', permissions: ['submit_ticket', 'view_own_tickets'] },
    { id: 'role_technician', name: 'Technician', description: 'Can resolve technical issues', permissions: ['assign_ticket', 'update_ticket', 'add_internal_notes', 'view_all_tickets'] },
    { id: 'role_unit_head', name: 'Unit Head', description: 'Manages a unit and assigns tickets', permissions: ['assign_ticket', 'view_unit_tickets', 'manage_technicians', 'view_metrics'] },
    { id: 'role_dispatcher', name: 'Dispatcher', description: 'Routes and dispatches tickets', permissions: ['assign_ticket', 'view_all_tickets', 'manage_routing'] },
    { id: 'role_admin', name: 'Admin', description: 'System administrator', permissions: ['manage_users', 'manage_config', 'view_audit', 'manage_roles', 'manage_units'] },
    { id: 'role_super_admin', name: 'Super Admin', description: 'Full system access', permissions: ['all'] }
];

const SEED_UNITS = [
    { id: 'unit_network', name: 'Network', description: 'Network infrastructure and connectivity', head: null, technicians: [], color: '#3b82f6' },
    { id: 'unit_hardware', name: 'Hardware', description: 'Hardware repairs and maintenance', head: null, technicians: [], color: '#ef4444' },
    { id: 'unit_database', name: 'Database', description: 'Database administration and access', head: null, technicians: [], color: '#8b5cf6' },
    { id: 'unit_software', name: 'Software', description: 'Software installation and support', head: null, technicians: [], color: '#ec4899' },
    { id: 'unit_cbt', name: 'CBT/E-Learning', description: 'Computer-based testing and LMS', head: null, technicians: [], color: '#f59e0b' },
    { id: 'unit_web', name: 'Web Services', description: 'Website and web application support', head: null, technicians: [], color: '#10b981' },
    { id: 'unit_helpdesk', name: 'Helpdesk', description: 'General support and miscellaneous', head: null, technicians: [], color: '#6366f1' }
];

const SEED_CATEGORIES = [
    {
        name: 'Account & Access',
        unit: 'Database',
        subcategories: ['Portal Login', 'Email Access', 'Password Reset', 'New Account Request']
    },
    {
        name: 'Network & WiFi',
        unit: 'Network',
        subcategories: ['No Internet', 'Slow Connection', 'WiFi Not Showing', 'VPN Issues']
    },
    {
        name: 'Hardware',
        unit: 'Hardware',
        subcategories: ['Computer Not Working', 'Printer Issue', 'Projector Fault', 'Mouse/Keyboard Problems']
    },
    {
        name: 'Software',
        unit: 'Software',
        subcategories: ['Software Installation', 'System Crash', 'License Issue', 'Update Problem']
    },
    {
        name: 'CBT / E-Learning',
        unit: 'CBT',
        subcategories: ['Exam Portal Error', 'Submission Failed', 'LMS Login Issues', 'Course Not Showing']
    },
    {
        name: 'University Website',
        unit: 'Web',
        subcategories: ['Page Not Loading', 'Wrong Information', 'Form Not Working']
    },
    {
        name: 'Email',
        unit: 'Network',
        subcategories: ['Email Setup', 'Cannot Send', 'Cannot Receive', 'Spam Issues']
    },
    {
        name: 'Other',
        unit: 'Helpdesk',
        subcategories: ['Miscellaneous issues']
    }
];

let currentRoles = DemoDB.get('roles', null);
if (!currentRoles) {
    DemoDB.set('roles', SEED_ROLES);
} else {
    // Ensure seed roles exist
    const existingIds = currentRoles.map(r => r.id);
    let added = false;
    SEED_ROLES.forEach(seed => {
        if (!existingIds.includes(seed.id)) {
            currentRoles.push(seed);
            added = true;
        }
    });
    if (added) DemoDB.set('roles', currentRoles);
}

let currentUnits = DemoDB.get('units', null);
if (!currentUnits) {
    DemoDB.set('units', SEED_UNITS);
} else {
    // Ensure seed units exist
    const existingIds = currentUnits.map(u => u.id);
    let added = false;
    SEED_UNITS.forEach(seed => {
        if (!existingIds.includes(seed.id)) {
            currentUnits.push(seed);
            added = true;
        }
    });
    if (added) DemoDB.set('units', currentUnits);
}

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

let currentCategories = DemoDB.get('categories', null);
if (!currentCategories) {
    DemoDB.set('categories', SEED_CATEGORIES);
} else {
    // Ensure seed categories are present when demo storage exists
    const existingNames = currentCategories.map(c => c.name);
    let added = false;
    SEED_CATEGORIES.forEach(seed => {
        if (!existingNames.includes(seed.name)) {
            currentCategories.push(seed);
            added = true;
        }
    });
    if (added) DemoDB.set('categories', currentCategories);
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

    getCategories: () => DemoDB.get('categories', []),
    saveCategory: (category) => {
         let categories = DataService.getCategories();
         const idx = categories.findIndex(c => c.name === category.name);
         if (idx >= 0) categories[idx] = category;
         else categories.push(category);
         DemoDB.set('categories', categories);
         return category;
    },
    deleteCategory: (name) => {
         let categories = DataService.getCategories();
         categories = categories.filter(c => c.name !== name);
         DemoDB.set('categories', categories);
    },
    getCategoryByName: (name) => {
         return DataService.getCategories().find(c => c.name === name);
    },

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
    },

    // ===== ROLES MANAGEMENT =====
    getRoles: () => DemoDB.get('roles', []),
    saveRole: (role) => {
        let roles = DataService.getRoles();
        const idx = roles.findIndex(r => r.id === role.id);
        if (idx >= 0) {
            roles[idx] = role;
        } else {
            if (!role.id) role.id = 'role_' + Math.random().toString(36).substr(2, 9);
            roles.push(role);
        }
        DemoDB.set('roles', roles);
        return role;
    },
    deleteRole: (roleId) => {
        let roles = DataService.getRoles();
        roles = roles.filter(r => r.id !== roleId);
        DemoDB.set('roles', roles);
    },
    getRoleById: (id) => {
        return DataService.getRoles().find(r => r.id === id);
    },

    // ===== UNITS MANAGEMENT =====
    getUnits: () => DemoDB.get('units', []),
    saveUnit: (unit) => {
        let units = DataService.getUnits();
        const idx = units.findIndex(u => u.id === unit.id);
        if (idx >= 0) {
            units[idx] = unit;
        } else {
            if (!unit.id) unit.id = 'unit_' + Math.random().toString(36).substr(2, 9);
            if (!unit.technicians) unit.technicians = [];
            if (!unit.color) unit.color = '#6366f1';
            units.push(unit);
        }
        DemoDB.set('units', units);
        return unit;
    },
    deleteUnit: (unitId) => {
        let units = DataService.getUnits();
        units = units.filter(u => u.id !== unitId);
        DemoDB.set('units', units);
    },
    getUnitById: (id) => {
        return DataService.getUnits().find(u => u.id === id);
    },
    getUnitByName: (name) => {
        return DataService.getUnits().find(u => u.name === name);
    }

};

window.DataService = DataService;
window.DEMO_MODE = DEMO_MODE;
