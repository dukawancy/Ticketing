/* =========================================
   ICT HELPDESK - AUTHENTICATION
   Handles login, registration, user session
   ========================================= */

let currentUser = null;

const AuthService = {
    login: (email, password) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = window.DataService.getUsers();
                const user = users.find(u => u.email === email && u.authPw === password);
                
                if (!user) {
                    reject(new Error('Invalid email or password'));
                    return;
                }
                
                if (user.status === 'pending') {
                    resolve({ status: 'pending' });
                    return;
                }

                if (user.status === 'suspended') {
                    reject(new Error('Account has been suspended. Contact Admin.'));
                    return;
                }

                user.lastLogin = new Date().toISOString();
                window.DataService.saveUser(user);
                resolve({ status: 'success', user: user });
            }, 500); // Simulate network
        });
    },

    register: (userData) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = window.DataService.getUsers();
                if (users.some(u => u.email === userData.email)) {
                    reject(new Error('Email already registered'));
                    return;
                }

                const newUser = {
                    id: 'u_' + Math.random().toString(36).substr(2, 9),
                    status: 'pending',
                    createdAt: new Date().toISOString(),
                    ...userData
                };

                window.DataService.saveUser(newUser);
                
                // Notify admin of new user
                const adminId = users.find(u=>u.role==='admin')?.id;
                if(adminId && window.NotificationService) {
                     window.NotificationService.createNotification(adminId, 'assignment', 'New User Registration', `${userData.name} has registered and awaits approval.`, null);
                }

                resolve(newUser);
            }, 600);
        });
    },

    logout: () => {
        currentUser = null;
        sessionStorage.removeItem('ict_session');
    },

    setCurrentUser: (user) => {
        currentUser = { ...user };
        delete currentUser.authPw; // Never store in session
        sessionStorage.setItem('ict_session', JSON.stringify(currentUser));
        window.dispatchEvent(new CustomEvent('auth:change', { detail: currentUser }));
    },

    getCurrentUser: () => {
        if (!currentUser) {
            const session = sessionStorage.getItem('ict_session');
            if (session) currentUser = JSON.parse(session);
        }
        return currentUser;
    },
    
    // Admin function
    adminCreateUser: (userData) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                const users = window.DataService.getUsers();
                if (users.some(u => u.email === userData.email)) {
                    reject(new Error('Email already used'));
                    return;
                }
                const newUser = {
                    id: 'u_' + Math.random().toString(36).substr(2, 9),
                    status: 'active',
                    createdAt: new Date().toISOString(),
                    mustChangePw: true,
                    ...userData
                };
                window.DataService.saveUser(newUser);
                resolve(newUser);
            }, 300);
        });
    }
};

window.AuthService = AuthService;
