/* =========================================
   ICT HELPDESK - UI CONTROLLER
   Handles DOM manipulation and page routing
   ========================================= */

const UI = {
    init: () => {
        UI.bindEvents();
        UI.populateCategorySelects();
        UI.checkAuth();

        // Keyboard shortcuts (only when app is active and no input focused)
        document.addEventListener('keydown', (e) => {
             if (!window.AuthService?.getCurrentUser()) return;
             const tag = document.activeElement?.tagName;
             if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;
             if (document.querySelector('.notif-overlay.open')) return;
             if ((e.key === 'n' || e.key === 'N') && !e.ctrlKey && !e.metaKey) {
                  e.preventDefault(); UI.navigateTo('newticket-page');
             }
             if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                  e.preventDefault(); document.getElementById('globalSearchInput')?.focus();
             }
             if (e.key === 'Escape') UI.closeGlobalSearch();
        });
        
        // Listen for new notifications to update badge and panel if open
        window.addEventListener('notification:new', () => {
             UI.updateNotificationBadge();
             if (document.getElementById('notifPanel').classList.contains('open')) {
                 UI.renderNotifications();
             }
        });
    },

    isSuperAdmin: () => window.AuthService.getCurrentUser()?.role === 'super-admin',
    isProtectedRole: (roleId) => roleId === 'role_super_admin',

    bindEvents: () => {
        // Auth Forms
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.addEventListener('submit', UI.handleLogin);
        
        const registerForm = document.getElementById('registerForm');
        if (registerForm) registerForm.addEventListener('submit', UI.handleRegister);

        const guestEnquiryForm = document.getElementById('guestEnquiryForm');
        if (guestEnquiryForm) guestEnquiryForm.addEventListener('submit', UI.handleGuestEnquiry);
        
        // Navigation Switcher (Top & Mobile)
        document.querySelectorAll('.nav-tab, .mobile-nav-item').forEach(el => {
            el.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-target');
                if(targetId) UI.navigateTo(targetId);
            });
        });

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if(logoutBtn) logoutBtn.addEventListener('click', UI.handleLogout);

         // Notifications
        const notifBtn = document.getElementById('notifBtn');
        if(notifBtn) notifBtn.addEventListener('click', UI.toggleNotifPanel);

        const closeNotifBtn = document.getElementById('closeNotifBtn');
        if(closeNotifBtn) closeNotifBtn.addEventListener('click', UI.toggleNotifPanel);

        const notifOverlay = document.getElementById('notifOverlay');
        if(notifOverlay) notifOverlay.addEventListener('click', UI.toggleNotifPanel);

        const clearNotifBtn = document.getElementById('clearNotifsBtn');
        if(clearNotifBtn) clearNotifBtn.addEventListener('click', UI.clearNotifications);

        // Export CSV
        const exportCsvBtn = document.getElementById('exportCsvBtn');
        if (exportCsvBtn) exportCsvBtn.addEventListener('click', UI.exportCSV);

        // Forms
        const newTicketForm = document.getElementById('newTicketForm');
        if(newTicketForm) {
             newTicketForm.addEventListener('submit', UI.handleNewTicket);
             document.getElementById('ticketCategory')?.addEventListener('change', UI.handleCategoryChange);
        }

        // Filters
        document.querySelectorAll('.filter-btn').forEach(btn => {
             btn.addEventListener('click', (e) => {
                  const view = e.currentTarget.closest('[id$="-page"]').id;
                  document.querySelectorAll(`#${view} .filter-btn`).forEach(b => b.classList.remove('active'));
                  e.currentTarget.classList.add('active');
                  UI.filterTickets(view, e.currentTarget.dataset.filter);
             });
        });
    },

    populateCategorySelects: () => {
         const categories = window.DataService.getCategories();
         const categoryOptions = categories.map(c => `<option value="${window.Utils.escapeHtml(c.name)}">${window.Utils.escapeHtml(c.name)}</option>`).join('');

         document.querySelectorAll('.category-filter').forEach(select => {
              const previous = select.value || 'all';
              select.innerHTML = `<option value="all">All Categories</option>${categoryOptions}`;
              if (previous && previous !== 'all' && categories.some(c => c.name === previous)) {
                   select.value = previous;
              }
         });

         const ticketCategory = document.getElementById('ticketCategory');
         if (ticketCategory) {
              const previous = ticketCategory.value || '';
              ticketCategory.innerHTML = `<option value="">Select category…</option>${categoryOptions}`;
              if (previous && categories.some(c => c.name === previous)) {
                   ticketCategory.value = previous;
              }
         }
    },

    checkAuth: () => {
        // Dev shortcut: ?dev=1 auto-logs in as admin
        if (new URLSearchParams(location.search).get('dev') === '1') {
            const devUser = window.DataService.getUsers().find(u => u.role === 'admin');
            if (devUser && !window.AuthService.getCurrentUser()) {
                window.AuthService.setCurrentUser(devUser);
                history.replaceState(null, '', location.pathname);
            }
        }
        const user = window.AuthService.getCurrentUser();
        if (user) {
            document.getElementById('auth-wrapper').style.display = 'none';
            document.getElementById('app-wrapper').style.display = 'flex';
            UI.setupUserInterface(user);
            UI.navigateTo('dashboard-page');
            window.NotificationService.init();
            window.NotificationService.requestPermission();
            UI.startSLAMonitor();
            UI.startAutoRefresh();
            UI.updateNavBadges();
            if (user.mustChangePw) {
                setTimeout(() => UI.openChangePwModal(true), 300);
            }
        } else {
            document.getElementById('auth-wrapper').style.display = 'block';
            document.getElementById('app-wrapper').style.display = 'none';
            UI.showAuthPage('login-view');
        }
    },

    showAuthPage: (viewId) => {
        document.querySelectorAll('.auth-page').forEach(page => page.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    },

    handleLogin: async (e) => {
        e.preventDefault();
        const email = document.getElementById('loginEmail').value;
        const pass = document.getElementById('loginPass').value;
        const btn = e.target.querySelector('button[type="submit"]');
        const origText = btn.innerHTML;
        
        try {
            btn.innerHTML = 'Logging in...';
            btn.disabled = true;
            
            const res = await window.AuthService.login(email, pass);
            if (res.status === 'pending') {
                UI.showAuthPage('pending-view');
            } else {
                window.AuthService.setCurrentUser(res.user);
                UI.checkAuth();
            }
        } catch(err) {
            window.Utils.showToast('Login Failed', err.message, 'error');
        } finally {
            btn.innerHTML = origText;
            btn.disabled = false;
        }
    },

    handleRegister: async (e) => {
        e.preventDefault();
        const name = document.getElementById('regName').value;
        const uid = document.getElementById('regUid').value;
        const role = document.getElementById('regRole').value;
        const email = document.getElementById('regEmail').value;
        const pass = document.getElementById('regPass').value;
        const pass2 = document.getElementById('regPass2').value;

        if (pass !== pass2) {
             window.Utils.showToast('Error', 'Passwords do not match', 'error');
             return;
        }

        // Warn on non-institutional email (don't block — allows demo testing)
        if(!email.endsWith('@unijos.edu.ng')) {
             window.Utils.showToast('Note', 'University accounts should use @unijos.edu.ng email.', 'warning');
        }

        const btn = e.target.querySelector('button[type="submit"]');
        const origText = btn.innerHTML;

        try {
            btn.innerHTML = 'Creating Account...';
            btn.disabled = true;
            const dept = document.getElementById('regDept')?.value?.trim();
            const userData = { name, uid, role, email, authPw: pass };
            if (dept && role === 'staff') userData.department = dept;
            await window.AuthService.register(userData);
            UI.showAuthPage('pending-view');
        } catch(err) {
             window.Utils.showToast('Error', err.message, 'error');
        } finally {
            btn.innerHTML = origText;
            btn.disabled = false;
        }
    },

    handleGuestEnquiry: async (e) => {
        e.preventDefault();

        const name = document.getElementById('guestName').value.trim();
        const email = document.getElementById('guestEmail').value.trim();
        const subject = document.getElementById('guestSubject').value.trim();
        const description = document.getElementById('guestDescription').value.trim();
        const contact = document.getElementById('guestContact').value.trim();
        const existingTicketId = document.getElementById('guestExistingTicketId')?.value?.trim();

        if (!name || !email || !subject || !description) {
            window.Utils.showToast('Error', 'Please complete all required enquiry fields.', 'error');
            return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        const origText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = 'Submitting...';

        try {
            if (existingTicketId) {
                const updated = window.TicketService.addGuestReply(existingTicketId, email, description, name);
                if (updated) {
                    window.Utils.showToast('Success', `Your message was added to ticket ${updated.id}.`, 'success');
                    e.target.reset();
                    document.getElementById('guestExistingTicketId').value = '';
                    UI.showAuthPage('login-view');
                    return;
                }
                window.Utils.showToast('Error', 'The requested ticket could not be found.', 'error');
                return;
            }

            const ticketData = {
                title: subject,
                category: 'Enquiry',
                subCategory: 'General Enquiry',
                priority: 'low',
                location: contact,
                description,
                guestName: name,
                guestEmail: email,
                guestContact: contact
            };

            const ticket = await window.TicketService.submitTicket(ticketData);
            window.Utils.showToast('Success', `Enquiry submitted as ${ticket.id}. We will send an email update when it is resolved.`, 'success');
            e.target.reset();
            UI.showAuthPage('login-view');
        } catch(err) {
            window.Utils.showToast('Error', err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    },

    handleLogout: () => {
        window.AuthService.logout();
        UI.checkAuth();
    },

    setupUserInterface: (user) => {
        // Set user info
        document.getElementById('topUserName').textContent = user.name;
        document.getElementById('topUserAvatar').textContent = user.name.charAt(0);
        
        const roleBadge = document.getElementById('topUserRole');
        roleBadge.textContent = user.role.replace('-', ' ');
        roleBadge.className = `user-role-badge badge-${user.role}`;

        // Configure Navigation based on role
        document.querySelectorAll('.nav-tab[data-roles], .mobile-nav-item[data-roles]').forEach(el => {
             const roles = el.getAttribute('data-roles').split(',');
             if (roles.includes(user.role)) {
                  el.style.display = 'flex';
             } else {
                  el.style.display = 'none';
             }
        });

        UI.updateNotificationBadge();
    },

    navigateTo: (pageId) => {
        // RBAC guard: check that the current user has a nav tab for this page
        const user = window.AuthService.getCurrentUser();
        if (user && pageId !== 'ticket-detail-page' && pageId !== 'newticket-page') {
             const allowed = document.querySelector(`.nav-tab[data-target="${pageId}"][data-roles]`);
             if (allowed) {
                  const roles = allowed.getAttribute('data-roles').split(',');
                  if (!roles.includes(user.role)) {
                       window.Utils.showToast('Access Denied', 'You do not have permission to view that page.', 'error');
                       return;
                  }
             }
        }

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        // Show target page
        const page = document.getElementById(pageId);
        if(page) {
             page.classList.add('active');
             // Load data for page if needed
             UI.loadPageData(pageId);
        }

        // Update nav active states
        document.querySelectorAll('.nav-tab, .mobile-nav-item').forEach(el => {
            if(el.getAttribute('data-target') === pageId) el.classList.add('active');
            else el.classList.remove('active');
        });
        
        // Close sidebar on mobile after navigation
        document.getElementById('mainSidebar')?.classList.remove('open');
        document.getElementById('sidebarOverlay')?.classList.remove('open');

        window.scrollTo(0,0);
    },

    loadPageData: (pageId) => {
        const user = window.AuthService.getCurrentUser();
        switch(pageId) {
            case 'dashboard-page':   UI.renderDashboard(user); break;
            case 'mytickets-page':   UI.renderMyTickets(user); break;
            case 'myqueue-page':     UI.renderMyQueue(user); break;
            case 'triage-page':      UI.renderTriageQueue(); break;
            case 'alltickets-page':  UI.renderAllTickets(user); break;
            case 'myteam-page':      UI.renderMyTeam(user); break;
            case 'users-page':       UI.renderUsersAdmin(); break;
            case 'admin-page':       UI.renderAdminConsole(); break;
            case 'roles-page':       UI.renderRoles(); break;
            case 'units-page':       UI.renderUnits(); break;
            case 'reports-page':     UI.renderReports(); break;
        }
    },

    // --- CANVAS CHARTS ---
    drawDoughnut: (canvasId, items, colors) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H / 2;
        const outerR = Math.min(cx, cy) - 4;
        const innerR = outerR * 0.56;
        const total = items.reduce((s, d) => s + d.value, 0);

        ctx.clearRect(0, 0, W, H);

        if (total === 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.05)';
            ctx.fill();
            return;
        }

        let angle = -Math.PI / 2;
        items.forEach((item, i) => {
            if (!item.value) return;
            const sweep = (item.value / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.arc(cx, cy, outerR, angle, angle + sweep);
            ctx.arc(cx, cy, innerR, angle + sweep, angle, true);
            ctx.closePath();
            ctx.fillStyle = colors[i];
            ctx.fill();
            angle += sweep;
        });

        ctx.fillStyle = '#F0F6FC';
        ctx.font = `bold ${Math.round(outerR * 0.38)}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(total, cx, cy);
    },

    drawBars: (canvasId, items, colors) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const maxVal = Math.max(...items.map(d => d.value), 1);
        const padL = 8, padR = 8, padTop = 24, padBottom = 28;
        const count = items.length;
        const slotW = (W - padL - padR) / count;
        const barW = slotW - 8;

        ctx.clearRect(0, 0, W, H);

        items.forEach((item, i) => {
            const barH = Math.max(item.value > 0 ? 4 : 0, (item.value / maxVal) * (H - padTop - padBottom));
            const x = padL + i * slotW + 4;
            const y = H - padBottom - barH;
            const r = Math.min(4, barW / 2);

            ctx.fillStyle = colors[i];
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + barW - r, y);
            ctx.arcTo(x + barW, y, x + barW, y + r, r);
            ctx.lineTo(x + barW, y + barH);
            ctx.lineTo(x, y + barH);
            ctx.arcTo(x, y, x + r, y, r);
            ctx.closePath();
            ctx.fill();

            if (item.value > 0) {
                ctx.fillStyle = '#F0F6FC';
                ctx.font = 'bold 11px monospace';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(item.value, x + barW / 2, y - 2);
            }

            ctx.fillStyle = '#6B7280';
            ctx.font = '10px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(item.label, x + barW / 2, H - padBottom + 5);
        });
    },

    drawRing: (canvasId, pct) => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const W = canvas.width, H = canvas.height;
        const cx = W / 2, cy = H / 2;
        const r = Math.min(cx, cy) - 8;
        const lw = Math.round(r * 0.2);

        ctx.clearRect(0, 0, W, H);

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = lw;
        ctx.stroke();

        const color = pct >= 80 ? '#22C55E' : pct >= 60 ? '#F59E0B' : '#EF4444';
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (pct / 100) * Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = lw;
        ctx.lineCap = 'round';
        ctx.stroke();
    },

    renderCharts: (tickets) => {
        const statusList = ['open', 'in-progress', 'resolved', 'closed', 'escalated'];
        const statusColors = ['#F59E0B', '#06B6D4', '#22C55E', '#6B7280', '#EF4444'];
        const statusData = statusList.map((s, i) => ({ label: s, value: tickets.filter(t => t.status === s).length }));
        UI.drawDoughnut('statusChart', statusData, statusColors);

        const legend = document.getElementById('statusLegend');
        if (legend) {
            legend.innerHTML = statusData
                .filter(d => d.value > 0)
                .map(d => {
                    const color = statusColors[statusList.indexOf(d.label)];
                    return `<div class="chart-legend-item">
                        <span class="chart-legend-dot" style="background:${color}"></span>
                        <span>${d.label.replace('-', ' ')} (${d.value})</span>
                    </div>`;
                }).join('');
        }

        const priorities = ['low', 'medium', 'high', 'critical'];
        const priorityColors = ['#4ADE80', '#93C5FD', '#FCD34D', '#EF4444'];
        const priorityLabels = ['Low', 'Med', 'High', 'Crit'];
        const priorityData = priorities.map((p, i) => ({ label: priorityLabels[i], value: tickets.filter(t => t.priority === p).length }));
        UI.drawBars('priorityChart', priorityData, priorityColors);

        const sla = window.Utils.slaCompliancePct(tickets);
        UI.drawRing('slaChart', sla);
        const slaPctEl = document.getElementById('slaPct');
        if (slaPctEl) slaPctEl.textContent = `${sla}%`;

        const allUsers = window.DataService.getUsers();
        const techStats = allUsers
            .filter(u => u.role === 'technician')
            .map(u => ({
                ...u,
                resolved: tickets.filter(t => t.assignedId === u.id && (t.status === 'resolved' || t.status === 'closed')).length,
                total: tickets.filter(t => t.assignedId === u.id).length
            }))
            .filter(u => u.total > 0)
            .sort((a, b) => b.resolved - a.resolved)
            .slice(0, 5);

        const techList = document.getElementById('topTechList');
        if (techList) {
            if (!techStats.length) {
                techList.innerHTML = '<div style="padding:1rem; color:var(--text-muted); font-size:0.875rem;">No technician data yet.</div>';
            } else {
                techList.innerHTML = techStats.map((t, i) => `
                    <div class="top-tech-item">
                        <div class="top-tech-rank">#${i + 1}</div>
                        <div class="top-tech-avatar">${t.name.charAt(0)}</div>
                        <div class="flex-1">
                            <div class="top-tech-name">${window.Utils.escapeHtml(t.name)}</div>
                            <div class="top-tech-unit">${window.Utils.escapeHtml(t.unit || '—')} · ${t.total} assigned</div>
                        </div>
                        <div class="top-tech-count">${t.resolved} resolved</div>
                    </div>
                `).join('');
            }
        }
    },

    // --- DASHBOARD ---
    renderDashboard: (user) => {
        let title = 'Dashboard';
        let tickets = [];
        let renderTickets = [];

        if (user.role === 'student' || user.role === 'staff') {
             title = 'My Dashboard';
             tickets = window.TicketService.getUserTickets();
             renderTickets = tickets.slice(0, 5); // 5 recent
        } else if (user.role === 'technician') {
             title = 'Technician Dashboard';
             tickets = window.TicketService.getAssignedTickets();
             renderTickets = tickets;
        } else if (user.role === 'unit-head') {
             title = 'Unit Dashboard';
             tickets = window.TicketService.getAllTickets();
             renderTickets = tickets.slice(0, 5);
        } else if (user.role === 'dispatcher') {
             title = 'Dispatcher Dashboard';
             tickets = window.TicketService.getAllTickets();
             renderTickets = tickets.filter(t => t.status === 'open').slice(0, 5);
        } else if (user.role === 'admin' || user.role === 'super-admin') {
             title = 'System Dashboard';
             tickets = window.TicketService.getAllTickets();
             renderTickets = tickets.slice(0, 5);
        }

        document.getElementById('dashTitle') && (document.getElementById('dashTitle').textContent = title);

        // Greeting
        const hour = new Date().getHours();
        const greetWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        const greetEl = document.getElementById('dashGreetingText');
        const greetSub = document.getElementById('dashGreetingSubtext');
        if (greetEl) greetEl.textContent = `${greetWord}, ${user.name.split(' ')[0]} 👋`;
        if (greetSub) greetSub.textContent = user.role === 'student' || user.role === 'staff'
            ? "Here's an overview of your support tickets."
            : user.role === 'technician'
            ? "Here are the tickets assigned to you."
            : user.role === 'dispatcher'
            ? "Review and route incoming tickets to the right unit."
            : "Here's the system-wide ticket overview.";

        const openCount = tickets.filter(t => t.status === 'open').length;
        const ipCount = tickets.filter(t => t.status === 'in-progress').length;
        const resCount = tickets.filter(t => t.status === 'resolved').length;
        const totalCount = tickets.length;

        document.getElementById('dashOpenCount').textContent = openCount;
        document.getElementById('dashInprogCount').textContent = ipCount;
        document.getElementById('dashResCount').textContent = resCount;
        document.getElementById('dashTotalCount').textContent = totalCount;

        const dashCharts = document.getElementById('dashCharts');
        if (dashCharts) {
            const showCharts = user.role !== 'student' && user.role !== 'staff';
            dashCharts.style.display = showCharts ? 'block' : 'none';
            if (showCharts) UI.renderCharts(tickets);
        }

        // Role-specific alert banners
        const alertsEl = document.getElementById('dashAlerts');
        if (alertsEl) {
            const alerts = [];
            if (user.role === 'dispatcher') {
                const unrouted = tickets.filter(t => t.status === 'open');
                const critical = unrouted.filter(t => t.priority === 'critical' || t.priority === 'high');
                if (unrouted.length > 0) {
                    alerts.push(`<div class="dash-alert dash-alert-warning">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                        <span><strong>${unrouted.length}</strong> ticket${unrouted.length !== 1 ? 's' : ''} awaiting triage${critical.length > 0 ? ` — <strong style="color:var(--danger)">${critical.length} high/critical</strong>` : ''}.</span>
                        <button class="btn btn-xs" onclick="UI.navigateTo('triage-page')">Triage →</button>
                    </div>`);
                } else {
                    alerts.push(`<div class="dash-alert dash-alert-info">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        <span>All incoming tickets have been triaged.</span>
                    </div>`);
                }
            } else if (user.role === 'admin' || user.role === 'super-admin' || user.role === 'unit-head') {
                const pendingUsers = window.DataService.getUsers().filter(u => u.status === 'pending');
                if (pendingUsers.length > 0 && (user.role === 'admin' || user.role === 'super-admin')) {
                    alerts.push(`<div class="dash-alert dash-alert-warning">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span><strong>${pendingUsers.length}</strong> user registration${pendingUsers.length !== 1 ? 's' : ''} awaiting approval.</span>
                        <button class="btn btn-xs" onclick="UI.navigateTo('users-page')">Review →</button>
                    </div>`);
                }
                const unassigned = tickets.filter(t => !t.assignedId && (t.status === 'open' || t.status === 'in-progress'));
                if (unassigned.length > 0) {
                    alerts.push(`<div class="dash-alert dash-alert-info">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                        <span><strong>${unassigned.length}</strong> ticket${unassigned.length !== 1 ? 's' : ''} unassigned.</span>
                        <button class="btn btn-xs" onclick="UI.navigateTo('alltickets-page')">View →</button>
                    </div>`);
                }
            }
            alertsEl.innerHTML = alerts.join('');
        }

        // "View All" button: route to the correct tickets page for this role
        const viewAllBtn = document.getElementById('dashViewAllBtn');
        if (viewAllBtn) {
            const targetPage = user.role === 'dispatcher'
                ? 'triage-page'
                : (user.role === 'admin' || user.role === 'super-admin' || user.role === 'unit-head')
                ? 'alltickets-page' : 'mytickets-page';
            viewAllBtn.onclick = () => UI.navigateTo(targetPage);
        }

        renderTickets.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        UI.renderTicketList('dashRecentTickets', renderTickets);
    },

    // --- TICKET LISTS ---
    renderTicketList: (containerId, tickets, selectable = false) => {
         const container = document.getElementById(containerId);
         if(!container) return;

         if (tickets.length === 0) {
              container.innerHTML = `
                   <div class="empty-state">
                        <div class="empty-icon">
                             <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                        </div>
                        <div class="empty-title">No tickets found</div>
                        <div class="empty-desc">There are no tickets matching this view.</div>
                   </div>
              `;
              return;
         }

         container.innerHTML = tickets.map(t => UI.buildTicketHtml(t, selectable)).join('');
    },

    buildTicketHtml: (t, selectable = false) => {
         const timeStr = window.Utils.timeAgo(t.updatedAt || t.createdAt);
         const overdue = window.Utils.isOverdue(t);
         const timeLeft = !overdue && (t.status === 'open' || t.status === 'in-progress')
              ? window.Utils.timeUntilDeadline(t) : null;
         const isStale = !overdue && (t.status === 'open' || t.status === 'in-progress') &&
              t.updatedAt && (Date.now() - new Date(t.updatedAt).getTime()) > 172800000; // 48h
         const isSelected = selectable && UI._selectedTickets.has(t.id);
         const checkBox = selectable ? `<label class="ticket-select-box" onclick="event.stopPropagation()" aria-label="Select ticket">
              <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="UI.toggleTicketSelect('${t.id}', this.checked)">
         </label>` : '';
         return `
              <div class="ticket-item${isSelected ? ' ticket-selected' : ''}" onclick="UI.openTicketDetail('${t.id}')">
                   ${checkBox}
                   <div class="ticket-item-id">${t.id}</div>
                   <div class="ticket-item-body">
                        <div class="ticket-item-title">${window.Utils.escapeHtml(t.title)}</div>
                        <div class="ticket-item-meta">
                             <span>By ${window.Utils.escapeHtml(t.submittedBy)}</span>
                             <span>•</span>
                             <span>Updated ${timeStr}</span>
                             ${t.assignedTo ? `<span>•</span><span>Assigned to: ${window.Utils.escapeHtml(t.assignedTo)}</span>` : ''}
                        </div>
                   </div>
                   <div class="ticket-item-badges">
                        ${overdue ? '<span class="badge-overdue">Overdue</span>' : ''}
                        ${isStale ? '<span class="badge-stale">Stale</span>' : ''}
                        ${timeLeft ? `<span class="sla-time-left">${timeLeft}</span>` : ''}
                        <span class="badge badge-${t.priority}">${t.priority}</span>
                        <span class="badge badge-${t.status}">${t.status.replace('-',' ')}</span>
                   </div>
              </div>
         `;
    },

    renderMyTickets: (user) => {
         const tickets = user.role === 'technician'
              ? window.TicketService.getAssignedTickets()
              : window.TicketService.getUserTickets();
         document.getElementById('mytickets-page')._tickets = tickets;
         UI.filterTickets('mytickets-page', 'all');
    },

    renderAllTickets: (user) => {
         const tickets = window.TicketService.getAllTickets();
         document.getElementById('alltickets-page')._tickets = tickets;
         const assigneeSelect = document.querySelector('#alltickets-page .assignee-filter');
         if (assigneeSelect) {
              const techs = window.DataService.getUsers().filter(u => u.role === 'technician' || u.role === 'unit-head');
              assigneeSelect.innerHTML = '<option value="all">All Assignees</option><option value="unassigned">Unassigned</option>' +
                   techs.map(t => `<option value="${t.id}">${window.Utils.escapeHtml(t.name)}</option>`).join('');
         }
         UI.filterTickets('alltickets-page', 'all');
    },

    getCategoryUnitMap: () => {
         return window.DataService.getCategories().reduce((map, category) => {
              if (category?.name) {
                   map[category.name] = category.unit || '';
              }
              return map;
         }, {});
    },

    getCategoryUnit: (categoryName) => {
         const map = UI.getCategoryUnitMap();
         return map[categoryName] || '';
    },

    renderMyQueue: (user) => {
         const allTickets = window.TicketService.getAllTickets();
         const unitCats = window.DataService.getCategories()
              .filter(cat => cat.unit === user.unit)
              .map(cat => cat.name);

         const unitTickets = allTickets.filter(t =>
              (t.unit === user.unit || unitCats.includes(t.category)) &&
              t.status !== 'resolved' && t.status !== 'closed'
         );

         const unassigned = unitTickets.filter(t => !t.assignedId).length;
         const myAssigned = unitTickets.filter(t => t.assignedId === user.id).length;
         const overdue    = unitTickets.filter(t => window.Utils.isOverdue(t)).length;

         const statsEl = document.getElementById('queueStats');
         if (statsEl) {
              statsEl.innerHTML = `
                   <div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--warning)">${unassigned}</div><div class="admin-stat-label">Unassigned</div></div>
                   <div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--accent)">${myAssigned}</div><div class="admin-stat-label">My Assigned</div></div>
                   <div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--danger)">${overdue}</div><div class="admin-stat-label">Overdue</div></div>
                   <div class="admin-stat-card"><div class="admin-stat-value">${unitTickets.length}</div><div class="admin-stat-label">Unit Total</div></div>
              `;
         }

         document.getElementById('myqueue-page')._tickets = unitTickets;
         UI.filterTickets('myqueue-page', 'all');
    },

    renderTriageQueue: () => {
         const all = window.TicketService.getAllTickets();
         const pending = all.filter(t => t.status === 'open');
         const routed  = all.filter(t => t.status === 'routed');
         const overdue = pending.filter(t => window.Utils.isOverdue(t));
         const critical = pending.filter(t => t.priority === 'critical' || t.priority === 'high');

         const statsEl = document.getElementById('triageStats');
         if (statsEl) {
              statsEl.innerHTML = `
                   <div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--warning)">${pending.length}</div><div class="admin-stat-label">Awaiting Triage</div></div>
                   <div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--danger)">${critical.length}</div><div class="admin-stat-label">High / Critical</div></div>
                   <div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--danger)">${overdue.length}</div><div class="admin-stat-label">Overdue</div></div>
                   <div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--accent-2)">${routed.length}</div><div class="admin-stat-label">Routed Today</div></div>
              `;
         }
         document.getElementById('triage-page')._tickets = pending;
         UI.filterTriageQueue();
    },

    filterTriageQueue: () => {
         const page = document.getElementById('triage-page');
         let tickets = [...(page._tickets || [])];

         const activeFilter = document.querySelector('#triage-page .filter-btn.active')?.dataset.filter || 'all';
         if (activeFilter === 'critical') tickets = tickets.filter(t => t.priority === 'critical');
         else if (activeFilter === 'high') tickets = tickets.filter(t => t.priority === 'high');

         const dateVal = document.querySelector('#triage-page .date-range-filter')?.value || 'all';
         if (dateVal !== 'all') {
              const cutoff = Date.now() - parseInt(dateVal) * 86400000;
              tickets = tickets.filter(t => t.createdAt && new Date(t.createdAt).getTime() >= cutoff);
         }

         const q = (document.querySelector('#triage-page .search-bar input')?.value || '').toLowerCase();
         if (q) tickets = tickets.filter(t =>
              t.id.toLowerCase().includes(q) || t.title.toLowerCase().includes(q) || (t.submittedBy || '').toLowerCase().includes(q));

         const PRIO = { critical: 0, high: 1, medium: 2, low: 3 };
         tickets.sort((a, b) => {
              const pd = (PRIO[a.priority] ?? 3) - (PRIO[b.priority] ?? 3);
              if (pd !== 0) return pd;
              return new Date(a.createdAt) - new Date(b.createdAt);
         });

         const container = document.getElementById('triageTicketsList');
         if (!container) return;
         if (!tickets.length) {
              container.innerHTML = `<div class="empty-state">
                   <div class="empty-icon"><svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg></div>
                   <div class="empty-title">Triage queue is clear</div>
                   <div class="empty-desc">All tickets have been routed to their units.</div>
              </div>`;
              return;
         }
         container.innerHTML = tickets.map(t => UI.buildTicketHtml(t)).join('');
    },

    renderQueueList: (listId, tickets) => {
         const container = document.getElementById(listId);
         if (!container) return;
         if (!tickets || tickets.length === 0) {
              container.innerHTML = `
                   <div class="empty-state">
                        <div class="empty-icon">
                             <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>
                        </div>
                        <div class="empty-title">No tickets in queue</div>
                        <div class="empty-desc">Your unit has no active tickets right now.</div>
                   </div>`;
              return;
         }
         const user = window.AuthService.getCurrentUser();
         container.innerHTML = tickets.map(t => UI.buildQueueTicketHtml(t, user)).join('');
    },

    buildQueueTicketHtml: (t, user) => {
         const timeStr = window.Utils.timeAgo(t.updatedAt || t.createdAt);
         const overdue = window.Utils.isOverdue(t);
         const timeLeft = !overdue && (t.status === 'open' || t.status === 'in-progress')
              ? window.Utils.timeUntilDeadline(t) : null;
         const isUnassigned = !t.assignedId;
         const isMine = t.assignedId === user.id;

         const pickupBtn = isUnassigned
              ? `<button class="btn btn-sm btn-outline queue-pickup-btn" onclick="event.stopPropagation(); UI.pickUpTicket('${t.id}')">Pick Up</button>`
              : isMine
              ? `<span class="queue-mine-tag">Mine</span>`
              : '';

         return `
              <div class="ticket-item" onclick="UI.openTicketDetail('${t.id}')">
                   <div class="ticket-item-id">${t.id}</div>
                   <div class="ticket-item-body">
                        <div class="ticket-item-title">${window.Utils.escapeHtml(t.title)}</div>
                        <div class="ticket-item-meta">
                             <span>By ${window.Utils.escapeHtml(t.submittedBy)}</span>
                             <span>•</span>
                             <span>${timeStr}</span>
                             ${isUnassigned
                                  ? '<span>•</span><span style="color:var(--warning);font-weight:600">Unassigned</span>'
                                  : `<span>•</span><span>${window.Utils.escapeHtml(t.assignedTo)}</span>`}
                        </div>
                   </div>
                   <div class="ticket-item-badges">
                        ${overdue ? '<span class="badge-overdue">Overdue</span>' : ''}
                        ${timeLeft ? `<span class="sla-time-left">${timeLeft}</span>` : ''}
                        <span class="badge badge-${t.priority}">${t.priority}</span>
                        <span class="badge badge-${t.status}">${t.status.replace('-', ' ')}</span>
                        ${pickupBtn}
                   </div>
              </div>
         `;
    },

    pickUpTicket: (ticketId) => {
         const user   = window.AuthService.getCurrentUser();
         const ticket = window.TicketService.getTicketById(ticketId);
         if (!ticket) return;
         if (ticket.assignedId && ticket.assignedId !== user.id) {
              if (!confirm(`This ticket is already assigned to ${ticket.assignedTo}. Re-assign to yourself?`)) return;
         }
         const updated = window.TicketService.assignTicket(ticketId, user.id);
         if (updated) {
              window.Utils.showToast('Picked up', 'Ticket assigned to you.', 'success');
              UI.renderMyQueue(user);
         }
    },

    renderMyTeam: (user) => {
         const allUsers   = window.DataService.getUsers();
         const allTickets = window.TicketService.getAllTickets();
         const unitCats   = window.DataService.getCategories()
              .filter(cat => cat.unit === user.unit)
              .map(cat => cat.name);

         // Include tickets routed to this unit by dispatcher OR matching by category
         const unitTickets = allTickets.filter(t => t.unit === user.unit || unitCats.includes(t.category));
         const techs       = allUsers.filter(u => u.unit === user.unit && u.role === 'technician');

         const open       = unitTickets.filter(t => t.status === 'open').length;
         const inProgress = unitTickets.filter(t => t.status === 'in-progress').length;
         const sla        = window.Utils.slaCompliancePct(unitTickets);
         const slaColor   = sla >= 80 ? 'var(--success)' : sla >= 60 ? 'var(--warning)' : 'var(--danger)';

         const statRow = document.getElementById('teamStatRow');
         if (statRow) {
              statRow.innerHTML = `
                   <div class="admin-stat-card"><div class="admin-stat-value">${unitTickets.length}</div><div class="admin-stat-label">Unit Total</div></div>
                   <div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--warning)">${open}</div><div class="admin-stat-label">Open</div></div>
                   <div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--info)">${inProgress}</div><div class="admin-stat-label">In Progress</div></div>
                   <div class="admin-stat-card"><div class="admin-stat-value" style="color:${slaColor}">${sla}%</div><div class="admin-stat-label">SLA</div></div>
              `;
         }

         const membersList = document.getElementById('teamMembersList');
         if (membersList) {
              if (!techs.length) {
                   membersList.innerHTML = `<div style="padding:1rem;color:var(--text-muted);font-size:0.875rem;">No technicians assigned to the ${user.unit || 'your'} unit yet.</div>`;
              } else {
                   membersList.innerHTML = techs.map(tech => {
                        const active   = unitTickets.filter(t => t.assignedId === tech.id && (t.status === 'open' || t.status === 'in-progress')).length;
                        const resolved = unitTickets.filter(t => t.assignedId === tech.id && (t.status === 'resolved' || t.status === 'closed')).length;
                        const tSla     = window.Utils.slaCompliancePct(unitTickets.filter(t => t.assignedId === tech.id));
                        const tSlaCol  = tSla >= 80 ? 'var(--success)' : tSla >= 60 ? 'var(--warning)' : 'var(--danger)';
                        return `
                        <div class="team-member-row">
                             <div class="team-member-avatar">${tech.name.charAt(0)}</div>
                             <div class="team-member-info">
                                  <div class="team-member-name">${window.Utils.escapeHtml(tech.name)}</div>
                                  <div class="team-member-meta">${tech.email}</div>
                             </div>
                             <div class="team-member-stats">
                                  <div class="team-stat"><span class="team-stat-val" style="color:var(--warning)">${active}</span><span class="team-stat-label">Active</span></div>
                                  <div class="team-stat"><span class="team-stat-val" style="color:var(--success)">${resolved}</span><span class="team-stat-label">Resolved</span></div>
                                  <div class="team-stat"><span class="team-stat-val" style="color:${tSlaCol}">${tSla}%</span><span class="team-stat-label">SLA</span></div>
                             </div>
                             <span class="badge badge-${tech.status}">${tech.status}</span>
                        </div>`;
                   }).join('');
              }
         }

         document.getElementById('myteam-page')._tickets = unitTickets;
         UI.filterTickets('myteam-page', 'all');
    },

    filterTickets: (pageId, filterValue) => {
         const tickets = document.getElementById(pageId)._tickets || [];
         let filtered = tickets;
         const valStr = String(filterValue || 'all').toLowerCase();

         if (valStr !== 'all') {
              filtered = filtered.filter(t => t.status === valStr);
         }

         const priorityVal = document.querySelector(`#${pageId} .priority-filter`)?.value || 'all';
         if (priorityVal !== 'all') filtered = filtered.filter(t => t.priority === priorityVal);

         const categoryVal = document.querySelector(`#${pageId} .category-filter`)?.value || 'all';
         if (categoryVal !== 'all') filtered = filtered.filter(t => t.category === categoryVal);

         const assigneeVal = document.querySelector(`#${pageId} .assignee-filter`)?.value;
         if (assigneeVal && assigneeVal !== 'all') {
              filtered = assigneeVal === 'unassigned'
                   ? filtered.filter(t => !t.assignedId)
                   : filtered.filter(t => t.assignedId === assigneeVal);
         }

         const dateRangeVal = document.querySelector(`#${pageId} .date-range-filter`)?.value || 'all';
         if (dateRangeVal !== 'all') {
              const cutoff = Date.now() - parseInt(dateRangeVal) * 86400000;
              filtered = filtered.filter(t => t.createdAt && new Date(t.createdAt).getTime() >= cutoff);
         }

         const searchInput = document.querySelector(`#${pageId} .search-bar input`);
         if (searchInput && searchInput.value) {
              const query = searchInput.value.toLowerCase();
              filtered = filtered.filter(t =>
                   t.id.toLowerCase().includes(query) ||
                   t.title.toLowerCase().includes(query) ||
                   (t.submittedBy || '').toLowerCase().includes(query)
              );
         }

         // Apply sort
         const sortVal = document.querySelector(`#${pageId} .sort-select`)?.value || 'newest';
         const PRIO = { critical: 0, high: 1, medium: 2, low: 3 };
         if (sortVal === 'oldest') {
              filtered.sort((a, b) => new Date(a.updatedAt) - new Date(b.updatedAt));
         } else if (sortVal === 'priority') {
              filtered.sort((a, b) => (PRIO[a.priority] ?? 3) - (PRIO[b.priority] ?? 3));
         } else if (sortVal === 'sla') {
              const SLA = window.Utils.SLA_HOURS;
              filtered.sort((a, b) => {
                   const dA = a.createdAt ? new Date(a.createdAt).getTime() + (SLA[a.priority] || 72) * 3600000 : Infinity;
                   const dB = b.createdAt ? new Date(b.createdAt).getTime() + (SLA[b.priority] || 72) * 3600000 : Infinity;
                   return dA - dB;
              });
         } else {
              filtered.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
         }

         const listIdMap = {
              'mytickets-page':  'myTicketsList',
              'alltickets-page': 'allTicketsList',
              'myqueue-page':    'queueTicketsList',
              'myteam-page':     'teamTicketsList',
              'triage-page':     'triageTicketsList'
         };
         const listId = listIdMap[pageId];
         if (!listId) return;

         // Pagination: reset to page 1 on filter change, preserve on explicit page change
         const pageEl = document.getElementById(pageId);
         if (!pageEl._preservePage) pageEl._currentPage = 1;
         pageEl._preservePage = false;

         const totalCount = filtered.length;
         const currentPage = pageEl._currentPage || 1;
         const totalPages = Math.ceil(totalCount / UI.PAGE_SIZE) || 1;
         const paged = filtered.slice((currentPage - 1) * UI.PAGE_SIZE, currentPage * UI.PAGE_SIZE);

         const selectable = pageId === 'alltickets-page';
         if (pageId === 'myqueue-page') {
              UI.renderQueueList(listId, paged);
         } else {
              UI.renderTicketList(listId, paged, selectable);
         }
         UI.renderPagination(listId, currentPage, totalPages, totalCount);
         if (selectable) UI.updateBulkBar();

         // Update "Showing X of Y" context line
         const totalAll = (document.getElementById(pageId)._tickets || []).length;
         const countLineId = listId + 'Count';
         let countEl = document.getElementById(countLineId);
         if (!countEl) {
              countEl = document.createElement('div');
              countEl.id = countLineId;
              countEl.className = 'ticket-list-count';
              const listContainer = document.getElementById(listId);
              listContainer?.parentNode?.insertBefore(countEl, listContainer);
         }
         if (totalCount === totalAll) {
              countEl.textContent = `${totalCount} ticket${totalCount !== 1 ? 's' : ''}`;
         } else {
              countEl.textContent = `Showing ${totalCount} of ${totalAll} tickets`;
         }
    },

    PAGE_SIZE: 10,
    _selectedTickets: new Set(),

    goToPage: (pageId, page) => {
         const pageEl = document.getElementById(pageId);
         pageEl._currentPage = page;
         pageEl._preservePage = true;
         const activeBtn = document.querySelector(`#${pageId} .filter-btn.active`);
         UI.filterTickets(pageId, activeBtn?.dataset.filter || 'all');
    },

    renderPagination: (listId, page, totalPages, totalCount) => {
         const list = document.getElementById(listId);
         if (!list) return;
         const old = document.getElementById(`pg-${listId}`);
         if (old) old.remove();
         if (totalPages <= 1) return;

         const pageId = list.closest('.page')?.id;
         const el = document.createElement('div');
         el.id = `pg-${listId}`;
         el.className = 'pagination-row';

         const start = Math.max(1, page - 2);
         const end   = Math.min(totalPages, page + 2);
         const pages = [];
         for (let i = start; i <= end; i++) pages.push(i);

         el.innerHTML = `
              <button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} onclick="UI.goToPage('${pageId}', 1)" title="First">«</button>
              <button class="pagination-btn" ${page <= 1 ? 'disabled' : ''} onclick="UI.goToPage('${pageId}', ${page - 1})">‹ Prev</button>
              ${pages.map(p => `<button class="pagination-btn ${p === page ? 'pagination-active' : ''}" onclick="UI.goToPage('${pageId}', ${p})">${p}</button>`).join('')}
              <button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} onclick="UI.goToPage('${pageId}', ${page + 1})">Next ›</button>
              <button class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} onclick="UI.goToPage('${pageId}', ${totalPages})" title="Last">»</button>
              <span class="pagination-info">${totalCount} ticket${totalCount !== 1 ? 's' : ''} · page ${page}/${totalPages}</span>
         `;
         list.insertAdjacentElement('afterend', el);
    },

    // --- TICKET DETAIL ---
    goBack: () => {
        UI.navigateTo(UI._previousPage || 'dashboard-page');
    },

    openTicketDetail: (ticketId) => {
        const activePage = document.querySelector('.page.active')?.id;
        if (activePage && activePage !== 'ticket-detail-page') {
            UI._previousPage = activePage;
        }
        UI._currentTicketId = ticketId;
         const ticket = window.TicketService.getTicketById(ticketId);
         if (!ticket) return;
         
         const user = window.AuthService.getCurrentUser();
         
         // Update UI
         document.getElementById('detailTicketId').textContent = ticket.id;
         document.getElementById('detailTitle').textContent = ticket.title;
         const editedTagEl = document.getElementById('detailEditedTag');
         if (editedTagEl) editedTagEl.style.display = ticket.editedAt ? 'inline' : 'none';
         
         const badgeStatus = document.getElementById('detailBadgeStatus');
         badgeStatus.textContent = ticket.status.replace('-',' ');
         badgeStatus.className = `badge badge-${ticket.status}`;

         const badgePriority = document.getElementById('detailBadgePriority');
         badgePriority.textContent = ticket.priority;
         badgePriority.className = `badge badge-${ticket.priority}`;

         document.getElementById('detailBadgeCategory').textContent = ticket.category;
         const subCatField = document.getElementById('detailSubCatField');
         const subCatEl    = document.getElementById('detailSubCategory');
         if (subCatField && subCatEl) {
              if (ticket.subCategory) {
                   subCatEl.textContent = ticket.subCategory;
                   subCatField.style.display = '';
              } else {
                   subCatField.style.display = 'none';
              }
         }
         // Reset related-ticket link input so revisiting doesn't show stale value
         const relInput = document.getElementById('relatedTicketInput');
         if (relInput) relInput.value = '';
         
         document.getElementById('detailSubmitter').textContent = ticket.submittedBy;
         document.getElementById('detailDate').textContent = window.Utils.formatDate(ticket.createdAt);
         document.getElementById('detailLocation').textContent = ticket.location || 'N/A';
         document.getElementById('detailAssigned').textContent = ticket.assignedTo || 'Unassigned';

         const routedField = document.getElementById('detailRoutedField');
         const routedByEl  = document.getElementById('detailRoutedBy');
         if (routedField && routedByEl) {
              if (ticket.routedBy) {
                   routedByEl.textContent = `${ticket.routedBy} → ${ticket.unit || ''}`;
                   routedField.style.display = '';
              } else {
                   routedField.style.display = 'none';
              }
         }
         
         const attachBox = document.getElementById('detailAttachment');
         if(attachBox) {
             if (ticket.attachment) {
                  attachBox.innerHTML = `<a href="${ticket.attachment.dataUrl}" download="${ticket.attachment.name}" target="_blank" class="ticket-id-copy" style="font-size:0.75rem;">📎 ${window.Utils.escapeHtml(ticket.attachment.name)}</a>`;
             } else {
                  attachBox.innerHTML = 'None';
             }
         }

         document.getElementById('detailDescription').textContent = ticket.description;

         const replyEmailField = document.getElementById('detailReplyEmailField');
         const replyEmailEl = document.getElementById('detailReplyEmail');
         if (replyEmailField && replyEmailEl) {
              const contactEmail = ticket.guestEmail || ticket.contactEmail || ticket.replyEmail || ticket.submittedByEmail || '';
              const shouldShowReplyEmail = Boolean(contactEmail) && (ticket.status === 'resolved' || ticket.status === 'closed');
              if (shouldShowReplyEmail) {
                   replyEmailEl.innerHTML = `<a href="mailto:${contactEmail}" class="ticket-id-copy" style="font-size:0.875rem;">${window.Utils.escapeHtml(contactEmail)}</a>`;
                   replyEmailField.style.display = '';
              } else {
                   replyEmailField.style.display = 'none';
              }
         }

         // SLA deadline
         const slaValEl = document.getElementById('detailSlaValue');
         const slaFieldEl = document.getElementById('detailSlaField');
         if (slaValEl && slaFieldEl && ticket.createdAt) {
              const SLA = window.Utils.SLA_HOURS;
              const deadlineMs = new Date(ticket.createdAt).getTime() + (SLA[ticket.priority] || 72) * 3600000;
              const isPast = ticket.status === 'resolved' || ticket.status === 'closed';
              const overdue = window.Utils.isOverdue(ticket);
              const timeLeft = window.Utils.timeUntilDeadline(ticket);
              if (isPast) {
                   slaValEl.innerHTML = `<span style="color:var(--success)">Met — ${window.Utils.formatDate(ticket.resolvedAt || ticket.updatedAt)}</span>`;
              } else if (overdue) {
                   slaValEl.innerHTML = `<span style="color:var(--danger); font-weight:600;">Overdue — due ${window.Utils.formatDate(new Date(deadlineMs).toISOString())}</span>`;
              } else {
                   slaValEl.innerHTML = `${window.Utils.formatDate(new Date(deadlineMs).toISOString())} <span style="color:var(--success); font-size:0.75rem;">(${timeLeft})</span>`;
              }
              slaFieldEl.style.display = '';
         } else if (slaFieldEl) {
              slaFieldEl.style.display = 'none';
         }

         // Render Comments, history, related tickets
         UI.renderComments(ticket.comments, ticket.id);
         UI.renderTicketHistory(ticket);
         UI.renderRelatedTickets(ticket);

         // Show/hide controls based on role/assignment
         const statusDiv = document.getElementById('detailStatusUpdate');
         const commentForm = document.getElementById('commentForm');

         // Everyone can comment
         if(commentForm) {
             commentForm.onsubmit = (e) => {
                 e.preventDefault();
                 const text = document.getElementById('commentText').value;
                 const isInternal = document.getElementById('commentInternal')?.checked || false;
                 if(text.trim()) {
                     const updated = window.TicketService.addComment(ticket.id, text, isInternal);
                     if(updated) {
                         UI.renderComments(updated.comments, ticket.id);
                         document.getElementById('commentText').value = '';
                     }
                 }
             };
         }

         // Dispatcher: show route panel for open tickets, hide generic status update
         const routeBox = document.getElementById('detailRouteBox');
         if (routeBox) {
              const canRoute = user.role === 'dispatcher' && ticket.status === 'open';
              routeBox.style.display = canRoute ? 'block' : 'none';
              if (canRoute) {
                   const suggestedUnit = UI.getCategoryUnit(ticket.category);
                   const routeSelect = document.getElementById('routeUnitSelect');
                   if (routeSelect && suggestedUnit) routeSelect.value = suggestedUnit;
                   const routeNotes = document.getElementById('routeNotes');
                   if (routeNotes) routeNotes.value = '';
                   document.getElementById('triage-page')._currentRoutingTicketId = ticket.id;
              }
         }

         // Only admin, super-admin, unit-head, or assigned tech can update status
         // Dispatcher uses the Route panel instead
         if (statusDiv) {
              if ((user.role === 'admin' || user.role === 'super-admin' || user.role === 'unit-head' || (user.role === 'technician' && ticket.assignedId === user.id)) && user.role !== 'dispatcher') {
                   statusDiv.style.display = 'block';
                   const select = document.getElementById('updateStatusSelect');
                   select.value = ticket.status;
                   const validNext = window.TicketService.VALID_TRANSITIONS[ticket.status] || [];
                   [...select.options].forEach(opt => {
                        const valid = opt.value === ticket.status || validNext.includes(opt.value);
                        opt.disabled = !valid;
                        opt.style.opacity = valid ? '' : '0.4';
                   });
                   document.getElementById('updateStatusBtn').onclick = () => {
                        const newStatus = select.value;
                        if (newStatus === 'escalated') { UI.openEscalateModal(ticket.id); return; }
                        const updated = window.TicketService.updateTicketStatus(ticket.id, newStatus);
                        if (updated) {
                            window.Utils.showToast('Success', 'Status updated successfully', 'success');
                            UI.openTicketDetail(updated.id);
                                 // If Firebase functions are available, request server to send transactional email
                                 if (newStatus === 'resolved' || newStatus === 'closed') {
                                      try {
                                           if (window.firebase && firebase.functions) {
                                                const sendFn = firebase.functions().httpsCallable('sendResolveEmail');
                                                sendFn({ ticketId: updated.id })
                                                     .then(() => {
                                                          window.Utils.showToast('Email', 'Resolution email sent to submitter', 'success');
                                                     })
                                                     .catch(err => {
                                                          console.warn('sendResolveEmail error', err);
                                                          window.Utils.showToast('Email Error', err.message || 'Could not send email', 'warning');
                                                     });
                                           }
                                      } catch (e) {
                                           console.warn('Error invoking sendResolveEmail', e);
                                      }
                                 }
                        }
                   };
              } else {
                   statusDiv.style.display = 'none';
              }
         }

         // Assignment controls (Admin / Super Admin / Unit Head only — not dispatcher)
         const assignDiv = document.getElementById('detailAssignBox');
         if (assignDiv) {
              if ((user.role === 'admin' || user.role === 'super-admin' || user.role === 'unit-head') && !ticket.closedAt && user.role !== 'dispatcher') {
                   assignDiv.style.display = 'block';
                   const select = document.getElementById('assignTechSelect');
                   // populate techs
                   const techs = window.DataService.getUsers().filter(u => u.role === 'technician');
                   select.innerHTML = '<option value="">Select Technician...</option>' + 
                                     techs.map(t => `<option value="${t.id}">${t.name} (${t.unit})</option>`).join('');
                   if(ticket.assignedId) select.value = ticket.assignedId;

                   document.getElementById('assignBtn').onclick = () => {
                       if(select.value) {
                           const updated = window.TicketService.assignTicket(ticket.id, select.value);
                           if(updated) {
                               window.Utils.showToast('Assigned', 'Ticket assigned successfully', 'success');
                               UI.openTicketDetail(updated.id);
                           }
                       }
                   };
              } else {
                   assignDiv.style.display = 'none';
              }
         }

         // Edit ticket button
         const editBtnEl = document.getElementById('detailEditBtn');
         if (editBtnEl) {
              const canEdit = (user.id === ticket.submittedById && (ticket.status === 'open' || ticket.status === 'in-progress')) ||
                              user.role === 'admin' || user.role === 'super-admin';
              editBtnEl.style.display = canEdit ? 'inline-flex' : 'none';
              editBtnEl.onclick = () => UI.openEditTicketModal(ticket.id);
         }

         // Escalation reason
         const escField = document.getElementById('detailEscalationField');
         const escReason = document.getElementById('detailEscalationReason');
         if (escField && escReason) {
              if (ticket.escalationReason) {
                   escField.style.display = '';
                   escReason.textContent = ticket.escalationReason;
              } else {
                   escField.style.display = 'none';
              }
         }

         // Escalate box
         const escBox = document.getElementById('detailEscalateBox');
         if (escBox) {
              const canEscalate = (user.role !== 'student' && user.role !== 'staff' && user.role !== 'dispatcher') &&
                   ticket.status !== 'escalated' && ticket.status !== 'closed' && ticket.status !== 'resolved';
              escBox.style.display = canEscalate ? 'block' : 'none';
         }

         UI.navigateTo('ticket-detail-page');
    },

    renderComments: (comments, ticketId) => {
         const container = document.getElementById('detailComments');
         if (!container) return;
         const currentUser = window.AuthService.getCurrentUser();

         if (!comments || comments.length === 0) {
              container.innerHTML = '<div style="color:var(--text-muted); font-size:0.875rem; text-align:center; padding:1rem;">No comments yet.</div>';
              return;
         }

         container.innerHTML = comments.map(c => {
              const canEdit = currentUser && currentUser.id === c.authorId;
              const canDelete = canEdit || (currentUser && (currentUser.role === 'admin' || currentUser.role === 'super-admin'));
              const actionBtns = (canEdit || canDelete) ? `
                   <div class="comment-action-btns" id="comment-btns-${c.id}">
                        ${canEdit ? `<button class="btn-xs" onclick="UI.startEditComment('${ticketId}','${c.id}')">Edit</button>` : ''}
                        ${canDelete ? `<button class="btn-xs btn-xs-danger" onclick="UI.deleteComment('${ticketId}','${c.id}')">Delete</button>` : ''}
                   </div>` : '';
              return `
              <div class="comment-item" id="comment-${c.id}">
                   <div class="comment-avatar">${c.author.charAt(0)}</div>
                   <div class="comment-body ${c.isInternal ? 'comment-internal' : ''}">
                        <div class="comment-header">
                             <span class="comment-author">${window.Utils.escapeHtml(c.author)}</span>
                             <span class="badge badge-${c.authorRole}">${c.authorRole}</span>
                             <span class="comment-time">${window.Utils.timeAgo(c.time)}</span>
                             ${c.isInternal ? '<span class="badge" style="background:var(--warning); color:#000;">Internal Note</span>' : ''}
                             ${c.editedAt ? '<span style="font-size:0.65rem;color:var(--muted);margin-left:0.25rem">(edited)</span>' : ''}
                        </div>
                        <div class="comment-text" id="comment-text-${c.id}" data-raw="${window.Utils.escapeHtml(c.text)}">${window.Utils.escapeHtml(c.text)}</div>
                        ${actionBtns}
                   </div>
              </div>
              `;
         }).join('');
    },

    // --- FORM LOGIC ---
    exportCSV: () => UI.exportTicketsCSV(),

    handleCategoryChange: (e) => {
         const cat = e.target.value;
         const subSelect = document.getElementById('ticketSubCategory');
         subSelect.innerHTML = '<option value="">Select Specific Issue</option>';
         const subcategories = window.Utils.getCategorySubcategories(cat);
         if (cat && subcategories.length) {
              subcategories.forEach(sub => {
                   subSelect.insertAdjacentHTML('beforeend', `<option value="${window.Utils.escapeHtml(sub)}">${window.Utils.escapeHtml(sub)}</option>`);
              });
              subSelect.disabled = false;
         } else {
              subSelect.disabled = true;
         }
    },

    handleNewTicket: async (e) => {
         e.preventDefault();
         const btn = document.getElementById('submitTicketBtn');
         btn.disabled = true;
         btn.innerHTML = 'Submitting...';

         const ticketData = {
              title: document.getElementById('ticketTitle').value,
              category: document.getElementById('ticketCategory').value,
              subCategory: document.getElementById('ticketSubCategory').value,
              priority: document.getElementById('ticketPriority').value,
              location: document.getElementById('ticketLocation').value,
              description: document.getElementById('ticketDesc').value
         };

         const fileInput = document.getElementById('ticketAttachment');
         if (fileInput && fileInput.files.length > 0) {
             const file = fileInput.files[0];
             if (file.size <= 5 * 1024 * 1024) { // max 5MB
                 ticketData.attachment = await new Promise((resolve) => {
                     const reader = new FileReader();
                     reader.onload = (ev) => resolve({ name: file.name, type: file.type, dataUrl: ev.target.result });
                     reader.readAsDataURL(file);
                 });
             } else {
                 window.Utils.showToast('Error', 'Attachment exceeds 5MB limit', 'error');
                 btn.disabled = false;
                 btn.innerHTML = 'Submit Ticket';
                 return;
             }
         }

         try {
             const ticket = await window.TicketService.submitTicket(ticketData);
             window.Utils.showToast('Success', `Ticket ${ticket.id} submitted`, 'success');
             e.target.reset();
             document.getElementById('ticketSubCategory').disabled = true;
             UI.navigateTo('mytickets-page');
         } catch(err) {
             window.Utils.showToast('Error', err.message, 'error');
         } finally {
             btn.disabled = false;
             btn.innerHTML = 'Submit Ticket';
         }
    },

    // --- NOTIFICATIONS PANEL ---
    updateNotificationBadge: () => {
         const user = window.AuthService.getCurrentUser();
         if(!user) return;
         
         const badge = document.getElementById('notifBadge');
         if(!badge) return;

         const unread = window.NotificationService.getUnreadCount(user.id);
         if (unread > 0) {
              badge.textContent = unread > 9 ? '9+' : unread;
              badge.classList.remove('hidden');
         } else {
              badge.classList.add('hidden');
         }
    },

    toggleNotifPanel: () => {
         const panel = document.getElementById('notifPanel');
         const overlay = document.getElementById('notifOverlay');
         
         if(panel.classList.contains('open')) {
              panel.classList.remove('open');
              overlay.classList.remove('open');
              document.body.style.overflow = '';
         } else {
              panel.classList.add('open');
              overlay.classList.add('open');
              document.body.style.overflow = 'hidden';
              UI.renderNotifications();
              
              // mark all as read when opened
              const user = window.AuthService.getCurrentUser();
              if(user) {
                   window.DataService.markAllNotificationsRead(user.id);
                   UI.updateNotificationBadge();
              }
         }
    },

    renderNotifications: () => {
         const user = window.AuthService.getCurrentUser();
         if(!user) return;

         const notifs = window.DataService.getNotifications(user.id);
         const list = document.getElementById('notifList');
         
         if(notifs.length === 0) {
              list.innerHTML = `
                   <div class="notif-empty">
                        <div class="notif-empty-icon">
                             <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/><line x1="12" y1="2" x2="12" y2="4"/></svg>
                        </div>
                        <div class="notif-empty-text">No notifications yet</div>
                   </div>
              `;
              return;
         }

         const iconSvg = {
              'status-change': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
              'comment': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
              'assignment': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
              'escalation': '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
         };
         const defaultIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';

         list.innerHTML = notifs.map(n => `
              <div class="notif-item ${n.read ? '' : 'unread'}" onclick="UI.notifClick(${n.ticketId ? `'${n.ticketId}'` : 'null'})">
                   <div class="notif-icon-svg">${iconSvg[n.type] || defaultIcon}</div>
                   <div class="notif-content">
                        <div class="notif-title">${window.Utils.escapeHtml(n.title)}</div>
                        <div class="notif-msg">${window.Utils.escapeHtml(n.message)}</div>
                        <div class="notif-time">${window.Utils.timeAgo(n.time)}</div>
                   </div>
                   <button class="notif-dismiss-btn" title="Dismiss" aria-label="Dismiss notification" onclick="event.stopPropagation(); UI.dismissNotification('${n.id}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                   </button>
              </div>
         `).join('');
    },

    notifClick: (ticketId) => {
         UI.toggleNotifPanel(); // close panel
         if(ticketId) UI.openTicketDetail(ticketId);
    },

    clearNotifications: () => {
         const user = window.AuthService.getCurrentUser();
         if(user) {
              window.DataService.clearNotifications(user.id);
              UI.renderNotifications();
              UI.updateNotificationBadge();
         }
    },

    dismissNotification: (notifId) => {
         const user = window.AuthService.getCurrentUser();
         if (!user) return;
         window.DataService.removeNotification(user.id, notifId);
         UI.renderNotifications();
         UI.updateNotificationBadge();
    },

    // --- ADMIN USER MANAGER ---
    renderUsersAdmin: () => {
         const currentUser = window.AuthService.getCurrentUser();
         const addStaffBtn = document.getElementById('addStaffBtn');
         if (addStaffBtn) {
             addStaffBtn.style.display = (currentUser.role === 'admin' || currentUser.role === 'super-admin' || currentUser.role === 'unit-head') ? 'inline-flex' : 'none';
         }
         
         // Hide irrelevant role filter options for unit-heads
         if (currentUser.role === 'unit-head') {
              const roleFilter = document.getElementById('userRoleFilter');
              if (roleFilter) {
                   Array.from(roleFilter.options).forEach(opt => {
                        if (['student', 'admin', 'super-admin', 'dispatcher', 'unit-head'].includes(opt.value)) {
                             opt.style.display = 'none';
                        }
                   });
                   roleFilter.value = 'all';
              }
         }
         
         UI.filterUsers();
    },

    filterUsers: () => {
         const currentUser = window.AuthService.getCurrentUser();
         const query      = (document.getElementById('userSearchInput')?.value || '').toLowerCase();
         const roleFilter = document.getElementById('userRoleFilter')?.value || 'all';
         let users = window.DataService.getUsers();

         // Unit-heads can only see staff/technicians under their unit
         if (currentUser.role === 'unit-head') {
              users = users.filter(u => 
                   u.unit === currentUser.unit && 
                   (u.role === 'staff' || u.role === 'technician')
              );
         }

         if (query) {
              users = users.filter(u =>
                   u.name.toLowerCase().includes(query) ||
                   u.email.toLowerCase().includes(query) ||
                   (u.uid || '').toLowerCase().includes(query)
              );
         }
         if (roleFilter !== 'all') {
              users = users.filter(u => u.role === roleFilter);
         }

         const pending = users.filter(u => u.status === 'pending');
         const active  = users.filter(u => u.status !== 'pending');

         const pendingGrid = document.getElementById('pendingUsersGrid');
         const activeGrid  = document.getElementById('activeUsersGrid');
         if (pendingGrid) {
              pendingGrid.innerHTML = pending.length
                   ? pending.map(u => UI.buildUserCardHtml(u, true, currentUser)).join('')
                   : '<div class="text-muted" style="font-size:0.875rem">No pending approvals.</div>';
         }
         if (activeGrid) {
              activeGrid.innerHTML = active.length
                   ? active.map(u => UI.buildUserCardHtml(u, false, currentUser)).join('')
                   : '<div class="text-muted" style="font-size:0.875rem">No users match this filter.</div>';
         }
    },

    buildUserCardHtml: (u, isPending, currentUser) => {
         const isSuperAdmin = currentUser && currentUser.role === 'super-admin';
         const isUnitHead = currentUser && currentUser.role === 'unit-head';
         let actions = '';

         if (isPending) {
             // Unit-heads cannot approve users
             if (!isUnitHead) {
                 actions = `
                     <button class="btn btn-sm btn-success" onclick="UI.approveUser('${u.id}')">Approve</button>
                     <button class="btn btn-sm btn-danger" onclick="UI.rejectUser('${u.id}')">Reject</button>
                 `;
             }
         } else {
             if (u.role === 'super-admin' && !isSuperAdmin) {
                 actions = '<span class="text-muted text-sm">Protected</span>';
             } else if (u.role === 'admin' && !isSuperAdmin) {
                 actions = '<span class="text-muted text-sm">Protected</span>';
             } else if (u.id === currentUser.id) {
                 actions = '<span class="text-muted text-sm">You</span>';
             } else if (isUnitHead && u.unit !== currentUser.unit) {
                 actions = '<span class="text-muted text-sm">Not your unit</span>';
             } else {
                 actions += u.status === 'suspended' ?
                     `<button class="btn btn-sm btn-success" onclick="UI.toggleUserSuspend('${u.id}', 'active')">Unsuspend</button>` :
                     `<button class="btn btn-sm btn-warning" onclick="UI.toggleUserSuspend('${u.id}', 'suspended')">Suspend</button>`;
                 actions += ` <button class="btn btn-sm btn-outline" onclick="UI.forcePasswordChange('${u.id}')">Force PW</button>`;
                 if (isSuperAdmin) {
                     actions += ` <button class="btn btn-sm btn-danger" onclick="UI.deleteUser('${u.id}')">Delete</button>`;
                 }
             }
         }

         const allTickets = window.DataService.getTickets();
         const isStaffer = u.role === 'student' || u.role === 'staff';
         const isTech = u.role === 'technician' || u.role === 'unit-head';
         let statsHtml = '';
         if (isStaffer) {
              const submitted = allTickets.filter(t => t.submittedById === u.id).length;
              statsHtml = `<div>${submitted} ticket${submitted !== 1 ? 's' : ''} submitted</div>`;
         } else if (isTech) {
              const assigned = allTickets.filter(t => t.assignedId === u.id).length;
              const resolved = allTickets.filter(t => t.assignedId === u.id && (t.status === 'resolved' || t.status === 'closed')).length;
              statsHtml = `<div>${assigned} assigned · ${resolved} resolved</div>`;
         }

         return `
              <div class="user-card">
                   <div class="user-card-header">
                        <div class="user-card-avatar" style="background:var(--surface3); color:var(--text)">${u.name.charAt(0)}</div>
                        <div>
                             <div class="user-card-name">${window.Utils.escapeHtml(u.name)} <span class="badge badge-${u.role}">${u.role}</span></div>
                             <div class="user-card-email">${window.Utils.escapeHtml(u.email)}</div>
                        </div>
                   </div>
                   <div class="user-card-meta">
                        <div>ID/UID: ${u.uid || 'N/A'}</div>
                        ${u.unit ? `<div>Unit: ${window.Utils.escapeHtml(u.unit)}</div>` : ''}
                        ${u.department ? `<div>Dept: ${window.Utils.escapeHtml(u.department)}</div>` : ''}
                        <div>Status: <span class="status-dot ${u.status}"></span>${u.status}</div>
                        ${statsHtml}
                        ${u.lastLogin ? `<div>Last login: ${window.Utils.timeAgo(u.lastLogin)}</div>` : ''}
                   </div>
                   <div class="user-card-actions">
                        ${actions}
                   </div>
              </div>
         `;
    },

    approveUser: (id) => {
         const users = window.DataService.getUsers();
         const user = users.find(u => u.id === id);
         if(user) {
              user.status = 'active';
              window.DataService.saveUser(user);
              const p = window.AuthService.getCurrentUser();
              window.DataService.logAction('approve_user', p.name, p.id, user.name, `Approved ${user.role} account — ${user.email}`);
              window.Utils.showToast('Approved', `${user.name} approved.`, 'success');
              UI.renderUsersAdmin();
         }
    },
    rejectUser: (id) => {
         const users = window.DataService.getUsers();
         const user = users.find(u => u.id === id);
         if (!user) return;
         if (!confirm(`Reject and delete the account request from ${user.name}? This cannot be undone.`)) return;
         const p = window.AuthService.getCurrentUser();
         window.DataService.logAction('reject_user', p.name, p.id, user.name, `Rejected ${user.role} account — ${user.email}`);
         window.DataService.deleteUser(id);
         window.Utils.showToast('Rejected', 'User request rejected and deleted.', 'info');
         UI.renderUsersAdmin();
    },
    toggleUserSuspend: (id, newStatus) => {
         const users = window.DataService.getUsers();
         const user = users.find(u => u.id === id);
         if (!user) return;
         if (newStatus === 'suspended' && !confirm(`Suspend ${user.name}? They will not be able to log in.`)) return;
         user.status = newStatus;
         window.DataService.saveUser(user);
         const p = window.AuthService.getCurrentUser();
         window.DataService.logAction(newStatus === 'suspended' ? 'suspend_user' : 'unsuspend_user', p.name, p.id, user.name, `Status set to ${newStatus}`);
         window.Utils.showToast('Updated', `User status changed to ${newStatus}.`, 'success');
         UI.renderUsersAdmin();
    },

    forcePasswordChange: (id) => {
         const users = window.DataService.getUsers();
         const user = users.find(u => u.id === id);
         if (!user) return;
         if (!confirm(`Force password reset for ${user.name}?\n\nThey will be required to set a new password on their next login.`)) return;
         user.mustChangePw = true;
         window.DataService.saveUser(user);
         const p = window.AuthService.getCurrentUser();
         window.DataService.logAction('force_password', p.name, p.id, user.name, `Forced password reset for ${user.email}`);
         window.Utils.showToast('Done', `${user.name} must change password on next login.`, 'info');
    },
    deleteUser: (id) => {
         if(confirm('Are you sure you want to delete this user?')) {
              window.DataService.deleteUser(id);
              window.Utils.showToast('Deleted', 'User deleted.', 'success');
              UI.renderUsersAdmin();
         }
    },

    openAddStaffModal: () => {
         document.getElementById('addStaffModal').style.display = 'block';
         document.getElementById('addStaffOverlay').classList.add('open');
         document.getElementById('addStaffForm').reset();
         
         // If unit-head, lock unit field to their unit
         const currentUser = window.AuthService.getCurrentUser();
         const staffUnitSelect = document.getElementById('staffUnit');
         const staffRoleSelect = document.getElementById('staffRole');
         
         if (currentUser.role === 'unit-head') {
              staffUnitSelect.value = currentUser.unit || '';
              staffUnitSelect.disabled = true;
              // Limit role options for unit-heads
              Array.from(staffRoleSelect.options).forEach(opt => {
                   if (opt.value === 'admin' || opt.value === 'unit-head') {
                        opt.style.display = 'none';
                   } else {
                        opt.style.display = '';
                   }
              });
         } else {
              staffUnitSelect.disabled = false;
              Array.from(staffRoleSelect.options).forEach(opt => opt.style.display = '');
         }
         
         document.getElementById('addStaffForm').onsubmit = async (e) => {
              e.preventDefault();
              const btn = e.target.querySelector('button[type="submit"]');
              btn.disabled = true;
              try {
                   const selectedUnit = document.getElementById('staffUnit').value || undefined;
                   const selectedRole = document.getElementById('staffRole').value;
                   
                   // Validate unit-head can only create staff for their unit
                   if (currentUser.role === 'unit-head') {
                        if (selectedUnit && selectedUnit !== currentUser.unit) {
                             throw new Error('You can only add staff to your own unit');
                        }
                        if (selectedRole === 'admin' || selectedRole === 'unit-head') {
                             throw new Error('You cannot create admin or unit-head accounts');
                        }
                   }
                   
                   await window.AuthService.adminCreateUser({
                        name: document.getElementById('staffName').value,
                        email: document.getElementById('staffEmail').value,
                        uid: document.getElementById('staffUid').value,
                        role: selectedRole,
                        unit: selectedUnit,
                        authPw: document.getElementById('staffPw').value
                   });
                   const creator = window.AuthService.getCurrentUser();
                   window.DataService.logAction('create_user', creator.name, creator.id, document.getElementById('staffName').value, `Created ${selectedRole} account`);
                   window.Utils.showToast('Created', 'Staff account created successfully.', 'success');
                   UI.closeAddStaffModal();
                   UI.renderUsersAdmin();
              } catch(err) {
                   window.Utils.showToast('Error', err.message, 'error');
              } finally {
                   btn.disabled = false;
              }
         };
    },

    closeAddStaffModal: () => {
         document.getElementById('addStaffModal').style.display = 'none';
         document.getElementById('addStaffOverlay').classList.remove('open');
    },

    // --- ADMIN CONSOLE ---
    renderAdminConsole: () => {
        const users = window.DataService.getUsers();
        const tickets = window.TicketService.getAllTickets();
        const statRow = document.getElementById('adminStatRow');
        if (statRow) {
            const active    = users.filter(u => u.status === 'active').length;
            const pending   = users.filter(u => u.status === 'pending').length;
            const suspended = users.filter(u => u.status === 'suspended').length;
            statRow.innerHTML = `
                <div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--success)">${active}</div><div class="admin-stat-label">Active Users</div></div>
                <div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--warning)">${pending}</div><div class="admin-stat-label">Pending Approval</div></div>
                <div class="admin-stat-card"><div class="admin-stat-value" style="color:var(--danger)">${suspended}</div><div class="admin-stat-label">Suspended</div></div>
                <div class="admin-stat-card"><div class="admin-stat-value">${tickets.length}</div><div class="admin-stat-label">Total Tickets</div></div>
            `;
        }
        UI.renderCategoryAdmin();
        UI.filterAuditLog();
    },

    renderCategoryAdmin: () => {
         const categories = window.DataService.getCategories();
         const html = categories.length
              ? `<table class="admin-table"><thead><tr><th>Category</th><th>Unit</th><th>Subcategories</th><th>Actions</th></tr></thead><tbody>${categories.map(cat => `
                    <tr>
                         <td>${window.Utils.escapeHtml(cat.name)}</td>
                         <td>${window.Utils.escapeHtml(cat.unit || '—')}</td>
                         <td>${window.Utils.escapeHtml((cat.subcategories || []).join(', '))}</td>
                         <td>
                              <button class="btn btn-xs" onclick="UI.openCategoryModal('${window.Utils.escapeHtml(cat.name).replace(/'/g, "\\'")}')">Edit</button>
                              <button class="btn btn-xs btn-xs-danger" onclick="UI.deleteCategory('${window.Utils.escapeHtml(cat.name).replace(/'/g, "\\'")}')">Delete</button>
                         </td>
                    </tr>
              `).join('')}</tbody></table>`
              : '<div class="text-muted" style="padding:1rem;">No categories defined yet. Add one to start.</div>';
         const container = document.getElementById('categoryAdminTable');
         if (container) container.innerHTML = html;
    },

    openCategoryModal: (categoryName) => {
         const overlay = document.getElementById('categoryModalOverlay');
         const modal = document.getElementById('categoryModal');
         if (!overlay || !modal) return;
         const nameInput = document.getElementById('categoryName');
         const unitInput = document.getElementById('categoryUnit');
         const subsInput = document.getElementById('categorySubcategories');
         const saveBtn = modal.querySelector('button[type="submit"]');
         const title = document.getElementById('categoryModalTitle');

         UI._editingCategoryName = null;
         if (categoryName) {
              const category = window.DataService.getCategoryByName(categoryName);
              if (category) {
                   title.textContent = 'Edit Category';
                   nameInput.value = category.name;
                   nameInput.disabled = true;
                   UI._editingCategoryName = category.name;
                   unitInput.value = category.unit || '';
                   subsInput.value = (category.subcategories || []).join(', ');
              }
         } else {
              title.textContent = 'Add Category';
              nameInput.disabled = false;
              nameInput.value = '';
              unitInput.value = '';
              subsInput.value = '';
         }

         overlay.classList.add('open');
         modal.style.display = 'block';
         const form = document.getElementById('categoryForm');
         if (form) {
              form.onsubmit = UI.saveCategory;
         }
    },

    closeCategoryModal: () => {
         document.getElementById('categoryModalOverlay')?.classList.remove('open');
         const modal = document.getElementById('categoryModal');
         if (modal) modal.style.display = 'none';
    },

    saveCategory: (e) => {
         e.preventDefault();
         const nameInput = document.getElementById('categoryName');
         const unitInput = document.getElementById('categoryUnit');
         const subsInput = document.getElementById('categorySubcategories');
         const name = nameInput?.value?.trim();
         const unit = unitInput?.value?.trim();
         const subcategories = (subsInput?.value || '').split(',').map(s => s.trim()).filter(Boolean);

         if (!name) {
              window.Utils.showToast('Validation Error', 'Category name is required.', 'error');
              return;
         }
         if (!unit) {
              window.Utils.showToast('Validation Error', 'Unit is required for routing.', 'error');
              return;
         }

         const existingName = UI._editingCategoryName;
         if (existingName && existingName !== name) {
              window.Utils.showToast('Error', 'Cannot rename category while it is in use.', 'error');
              return;
         }

         const category = { name, unit, subcategories };
         window.DataService.saveCategory(category);
         const performer = window.AuthService.getCurrentUser();
         if (existingName) {
              window.DataService.logAction('update_category', performer.name, performer.id, name, `Updated unit and subcategories`);
              window.Utils.showToast('Saved', 'Category updated successfully.', 'success');
         } else {
              window.DataService.logAction('create_category', performer.name, performer.id, name, `Created category for ${unit}`);
              window.Utils.showToast('Saved', 'Category created successfully.', 'success');
         }
         UI.closeCategoryModal();
         UI.renderCategoryAdmin();
         UI.populateCategorySelects();
    },

    deleteCategory: (name) => {
         if (!confirm(`Delete the category "${name}"? Tickets already using this category will keep their existing value but the category will no longer appear in lists.`)) return;
         const tickets = window.DataService.getTickets();
         const inUse = tickets.some(t => t.category === name);
         if (inUse) {
              window.Utils.showToast('Error', 'Cannot delete a category that is already used by tickets.', 'error');
              return;
         }
         window.DataService.deleteCategory(name);
         const performer = window.AuthService.getCurrentUser();
         window.DataService.logAction('delete_category', performer.name, performer.id, name, `Deleted category`);
         window.Utils.showToast('Deleted', 'Category removed.', 'success');
         UI.renderCategoryAdmin();
         UI.populateCategorySelects();
    },

    filterAuditLog: () => {
        const log = window.DataService.getAuditLog();
        const q = (document.getElementById('auditSearch')?.value || '').toLowerCase();
        const filtered = q ? log.filter(e =>
            (e.action || '').includes(q) ||
            (e.performedBy || '').toLowerCase().includes(q) ||
            (e.target || '').toLowerCase().includes(q) ||
            (e.detail || '').toLowerCase().includes(q)
        ) : log;

        const tbody = document.getElementById('auditTableBody');
        if (!tbody) return;

        if (!filtered.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;font-size:0.875rem;">No audit entries found.</td></tr>`;
            return;
        }

        const actionColor = {
            create_ticket:   'var(--accent)',
            update_status:   'var(--info)',
            assign_ticket:   'var(--warning)',
            edit_ticket:     'var(--text-muted)',
            escalate_ticket: 'var(--danger)',
            approve_user:    'var(--success)',
            reject_user:     'var(--danger)',
            suspend_user:    'var(--warning)',
            unsuspend_user:  'var(--success)',
            create_user:     'var(--accent2)',
            force_password:  'var(--text-muted)'
        };

        tbody.innerHTML = filtered.map(e => {
            const c = actionColor[e.action] || 'var(--text-muted)';
            return `<tr>
                <td style="white-space:nowrap;font-family:var(--font-mono);font-size:0.7rem;color:var(--text-muted)">${window.Utils.timeAgo(e.time)}</td>
                <td><span style="display:inline-block;padding:0.15rem 0.5rem;border-radius:var(--radius-pill);background:${c}22;color:${c};border:1px solid ${c}44;font-size:0.68rem;font-weight:700;letter-spacing:0.02em;white-space:nowrap">${e.action.replace(/_/g,' ')}</span></td>
                <td style="font-size:0.82rem">${window.Utils.escapeHtml(e.performedBy || '—')}</td>
                <td style="font-family:var(--font-mono);font-size:0.75rem;color:var(--accent)">${window.Utils.escapeHtml(e.target || '—')}</td>
                <td style="font-size:0.78rem;color:var(--text-muted)">${window.Utils.escapeHtml(e.detail || '—')}</td>
            </tr>`;
        }).join('');
    },

    exportAuditLog: () => {
        const log = window.DataService.getAuditLog();
        const blob = new Blob([JSON.stringify(log, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_log_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.Utils.showToast('Exported', 'Audit log downloaded as JSON.', 'success');
    },

    // --- REPORTS ---
    renderReports: () => {
        const allTickets = window.TicketService.getAllTickets();
        const dateVal    = document.getElementById('reportDateFilter')?.value || 'all';
        const tickets    = dateVal === 'all' ? allTickets : allTickets.filter(t => {
            const cutoff = Date.now() - parseInt(dateVal) * 86400000;
            return t.createdAt && new Date(t.createdAt).getTime() >= cutoff;
        });
        const countEl = document.getElementById('reportTicketCount');
        if (countEl) countEl.textContent = dateVal === 'all'
            ? `${tickets.length} tickets total`
            : `${tickets.length} of ${allTickets.length} tickets`;
        const users = window.DataService.getUsers();
        const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
        const sla = window.Utils.slaCompliancePct(tickets);
        const openRate = tickets.length ? Math.round(tickets.filter(t => t.status === 'open').length / tickets.length * 100) : 0;

        const avgMs = resolved.reduce((sum, t) => {
            if (!t.createdAt) return sum;
            return sum + Math.max(0, new Date(t.resolvedAt || t.updatedAt || Date.now()).getTime() - new Date(t.createdAt).getTime());
        }, 0);
        const avgHrs = resolved.length ? (Math.round(avgMs / resolved.length / 360000) / 10) : 0;

        const statsEl = document.getElementById('reportStatsGrid');
        if (statsEl) {
            const mkSvg = (d) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
            statsEl.innerHTML = `
                <div class="stat-card total">
                    <div class="stat-icon">${mkSvg('<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>')}</div>
                    <div class="stat-value">${tickets.length}</div>
                    <div class="stat-label">Total Tickets</div>
                </div>
                <div class="stat-card resolved">
                    <div class="stat-icon">${mkSvg('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>')}</div>
                    <div class="stat-value">${avgHrs}h</div>
                    <div class="stat-label">Avg Resolution</div>
                </div>
                <div class="stat-card ${sla >= 80 ? 'resolved' : sla >= 60 ? 'in-progress' : 'open'}">
                    <div class="stat-icon">${mkSvg('<polyline points="20 6 9 17 4 12"/>')}</div>
                    <div class="stat-value">${sla}%</div>
                    <div class="stat-label">SLA Compliance</div>
                </div>
                <div class="stat-card open">
                    <div class="stat-icon">${mkSvg('<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>')}</div>
                    <div class="stat-value">${openRate}%</div>
                    <div class="stat-label">Open Rate</div>
                </div>
            `;
        }

        // Category bar chart
        const categories = window.DataService.getCategories();
        const cats = categories.map(c => c.name);
        const catLbls = categories.map(c => c.name.split(' ').map(part => part[0]).join('').slice(0, 4));
        const catClrs = ['#3B82F6','#06B6D4','#8B5CF6','#22C55E','#F59E0B','#EF4444','#EC4899','#6B7280','#14B8A6','#8B5CF6'];
        UI.drawBars('categoryChart', cats.map((c, i) => ({ label: catLbls[i] || c, value: tickets.filter(t => t.category === c).length })), catClrs.slice(0, cats.length));

        // Avg resolution hours by priority
        const prios    = ['low','medium','high','critical'];
        const prioLbls = ['Low','Med','High','Crit'];
        const prioClrs = ['#4ADE80','#93C5FD','#FCD34D','#EF4444'];
        UI.drawBars('resolutionChart', prios.map((p, i) => {
            const pr = resolved.filter(t => t.priority === p);
            if (!pr.length) return { label: prioLbls[i], value: 0 };
            const ms = pr.reduce((s, t) => s + Math.max(0, new Date(t.resolvedAt || t.updatedAt || Date.now()).getTime() - new Date(t.createdAt || Date.now()).getTime()), 0);
            return { label: prioLbls[i], value: Math.round(ms / pr.length / 3600000) };
        }), prioClrs);

        // SLA compliance by priority
        UI.drawBars('slaPriorityChart', prios.map((p, i) => ({
            label: prioLbls[i],
            value: window.Utils.slaCompliancePct(tickets.filter(t => t.priority === p))
        })), prioClrs);

        // Unit performance table
        const UNITS = ['Network','Hardware','Software','Database','CBT','Web'];
        const unitRows = UNITS.map(unit => {
            const techIds = users.filter(u => u.unit === unit).map(u => u.id);
            const ut = tickets.filter(t => techIds.includes(t.assignedId));
            const ur = ut.filter(t => t.status === 'resolved' || t.status === 'closed');
            const uSla = window.Utils.slaCompliancePct(ut);
            const uMs = ur.reduce((s, t) => s + Math.max(0, new Date(t.resolvedAt || t.updatedAt || Date.now()).getTime() - new Date(t.createdAt || Date.now()).getTime()), 0);
            const uAvg = ur.length ? (Math.round(uMs / ur.length / 360000) / 10) : 0;
            return { unit, total: ut.length, resolved: ur.length, sla: uSla, avgHrs: uAvg };
        }).filter(r => r.total > 0);

        const unitBody = document.getElementById('unitPerfBody');
        if (unitBody) {
            if (!unitRows.length) {
                unitBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;font-size:0.875rem;">No unit data yet.</td></tr>`;
            } else {
                unitBody.innerHTML = unitRows.map(r => {
                    const sc = r.sla >= 80 ? 'var(--success)' : r.sla >= 60 ? 'var(--warning)' : 'var(--danger)';
                    return `<tr>
                        <td><strong>${r.unit}</strong></td>
                        <td style="font-family:var(--font-mono)">${r.total}</td>
                        <td style="font-family:var(--font-mono)">${r.resolved}</td>
                        <td><span style="color:${sc};font-weight:700;font-family:var(--font-mono)">${r.sla}%</span></td>
                        <td style="font-family:var(--font-mono)">${r.avgHrs}h</td>
                    </tr>`;
                }).join('');
            }
        }

        // Top technicians leaderboard
        const techLeaderBody = document.getElementById('techLeaderBody');
        if (techLeaderBody) {
            const techs = users.filter(u => u.role === 'technician' || u.role === 'unit-head');
            const techStats = techs.map(t => {
                const assigned = tickets.filter(tk => tk.assignedId === t.id);
                const res = assigned.filter(tk => tk.status === 'resolved' || tk.status === 'closed');
                const slaComp = window.Utils.slaCompliancePct(assigned);
                const ms = res.reduce((s, tk) => s + Math.max(0,
                    new Date(tk.resolvedAt || tk.updatedAt || Date.now()).getTime() - new Date(tk.createdAt || Date.now()).getTime()
                ), 0);
                const avgHrs = res.length ? Math.round(ms / res.length / 360000) / 10 : 0;
                return { name: t.name, unit: t.unit || '—', resolved: res.length, total: assigned.length, sla: slaComp, avgHrs };
            }).filter(t => t.total > 0).sort((a, b) => b.resolved - a.resolved || b.sla - a.sla).slice(0, 5);

            if (!techStats.length) {
                techLeaderBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;font-size:0.875rem;">No technician data yet.</td></tr>`;
            } else {
                const medals = ['🥇', '🥈', '🥉'];
                techLeaderBody.innerHTML = techStats.map((t, i) => {
                    const rankDisplay = i < 3
                        ? `<span style="margin-right:0.4rem;">${medals[i]}</span>`
                        : `<span style="color:var(--text-muted);font-family:var(--font-mono);margin-right:0.4rem;">#${i+1}</span>`;
                    const sc = t.sla >= 80 ? 'var(--success)' : t.sla >= 60 ? 'var(--warning)' : 'var(--danger)';
                    return `<tr>
                        <td>${rankDisplay}${window.Utils.escapeHtml(t.name)}</td>
                        <td style="color:var(--text-muted)">${window.Utils.escapeHtml(t.unit)}</td>
                        <td style="font-weight:700;color:var(--success);font-family:var(--font-mono)">${t.resolved}</td>
                        <td><span style="color:${sc};font-weight:600;font-family:var(--font-mono)">${t.sla}%</span></td>
                        <td style="font-family:var(--font-mono)">${t.avgHrs}h</td>
                    </tr>`;
                }).join('');
            }
        }
    },

    // --- EDIT TICKET MODAL ---
    openEditTicketModal: (ticketId) => {
         const ticket = window.TicketService.getTicketById(ticketId);
         if (!ticket) return;
         document.getElementById('editTicketTitle').value       = ticket.title;
         document.getElementById('editTicketDesc').value        = ticket.description;
         document.getElementById('editTicketOverlay').classList.add('open');
         document.getElementById('editTicketModal').style.display = 'block';
         document.getElementById('editTicketForm').onsubmit = (e) => {
              e.preventDefault();
              const title       = document.getElementById('editTicketTitle').value.trim();
              const description = document.getElementById('editTicketDesc').value.trim();
              if (!title || !description) return;
              const updated = window.TicketService.editTicket(ticketId, { title, description });
              if (updated) {
                   window.Utils.showToast('Updated', 'Ticket updated successfully.', 'success');
                   UI.closeEditTicketModal();
                   UI.openTicketDetail(ticketId);
              }
         };
    },

    closeEditTicketModal: () => {
         document.getElementById('editTicketModal').style.display = 'none';
         document.getElementById('editTicketOverlay').classList.remove('open');
    },

    // --- ESCALATION MODAL ---
    openEscalateModal: (ticketId) => {
         UI._escalatingTicketId = ticketId || UI._currentTicketId;
         document.getElementById('escalateReason').value = '';
         document.getElementById('escalateOverlay').classList.add('open');
         document.getElementById('escalateModal').style.display = 'block';
         document.getElementById('escalateForm').onsubmit = (e) => {
              e.preventDefault();
              const reason = document.getElementById('escalateReason').value.trim();
              if (!reason) return;
              const updated = window.TicketService.escalateTicket(UI._escalatingTicketId, reason);
              if (updated) {
                   window.Utils.showToast('Escalated', 'Ticket has been escalated.', 'warning');
                   UI.closeEscalateModal();
                   UI.openTicketDetail(updated.id);
              }
         };
    },

    closeEscalateModal: () => {
         document.getElementById('escalateModal').style.display = 'none';
         document.getElementById('escalateOverlay').classList.remove('open');
         // Reset dropdown if it was changed to "escalated" but then cancelled
         const sel = document.getElementById('updateStatusSelect');
         if (sel && sel.value === 'escalated') {
              const ticket = window.TicketService.getTicketById(UI._currentTicketId);
              if (ticket) sel.value = ticket.status;
         }
    },

    // --- TICKET HISTORY ---
    renderTicketHistory: (ticket) => {
         const histCard = document.getElementById('detailHistory');
         const histList = document.getElementById('detailHistoryList');
         if (!histCard || !histList) return;
         const history = ticket.history || [];
         if (!history.length) { histCard.style.display = 'none'; return; }
         histCard.style.display = 'block';
         histList.innerHTML = [...history].reverse().map(h => {
              let text = '';
              if (h.action === 'status_change') {
                   text = `Status changed from <strong>${h.from.replace('-',' ')}</strong> to <strong>${h.to.replace('-',' ')}</strong>`;
              } else if (h.action === 'assigned') {
                   text = `Assigned to <strong>${window.Utils.escapeHtml(h.to)}</strong>`;
              }
              return `
              <div class="history-item">
                   <div class="history-dot"></div>
                   <div class="history-content">
                        <span class="history-text">${text} — ${window.Utils.escapeHtml(h.by || 'System')}</span>
                        <span class="history-time">${window.Utils.timeAgo(h.time)}</span>
                   </div>
              </div>`;
         }).join('');
    },

    // --- COMMENT EDIT / DELETE ---
    startEditComment: (ticketId, commentId) => {
         const textEl = document.getElementById(`comment-text-${commentId}`);
         const btnsEl = document.getElementById(`comment-btns-${commentId}`);
         if (!textEl) return;
         const raw = textEl.getAttribute('data-raw') || textEl.textContent;
         textEl.innerHTML = `
              <textarea class="form-control comment-edit-area" id="comment-edit-input-${commentId}"></textarea>
              <div style="display:flex;gap:0.5rem;margin-top:0.35rem;">
                   <button class="btn btn-sm btn-primary" onclick="UI.saveEditComment('${ticketId}','${commentId}')">Save</button>
                   <button class="btn btn-sm btn-ghost" onclick="UI.cancelEditComment()">Cancel</button>
              </div>`;
         const ta = document.getElementById(`comment-edit-input-${commentId}`);
         if (ta) { ta.value = raw; ta.focus(); }
         if (btnsEl) btnsEl.style.display = 'none';
    },

    saveEditComment: (ticketId, commentId) => {
         const ta = document.getElementById(`comment-edit-input-${commentId}`);
         if (!ta || !ta.value.trim()) return;
         const updated = window.TicketService.editComment(ticketId, commentId, ta.value.trim());
         if (updated) UI.renderComments(updated.comments, ticketId);
    },

    cancelEditComment: () => {
         const ticket = window.TicketService.getTicketById(UI._currentTicketId);
         if (ticket) UI.renderComments(ticket.comments, ticket.id);
    },

    deleteComment: (ticketId, commentId) => {
         if (!confirm('Delete this comment? This cannot be undone.')) return;
         const updated = window.TicketService.deleteComment(ticketId, commentId);
         if (updated) UI.renderComments(updated.comments, ticketId);
    },

    startSLAMonitor: () => {
         const NOTIFIED_KEY = 'ict_sla_notified';
         const check = () => {
              const user = window.AuthService.getCurrentUser();
              if (!user) return;
              let tickets;
              if (user.role === 'student' || user.role === 'staff') {
                   tickets = window.TicketService.getUserTickets();
              } else if (user.role === 'technician') {
                   tickets = window.TicketService.getAssignedTickets();
              } else {
                   tickets = window.TicketService.getAllTickets();
              }
              const notified = new Set(JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '[]'));
              const active = tickets.filter(t => t.status === 'open' || t.status === 'in-progress');
              const newBreaches = active.filter(t => window.Utils.isOverdue(t) && !notified.has(t.id));
              if (newBreaches.length > 0) {
                   newBreaches.forEach(t => {
                        window.NotificationService.createNotification(
                             user.id, 'status-change', 'SLA Breach',
                             `${t.id} "${t.title.substring(0, 50)}" has exceeded its ${window.Utils.SLA_HOURS[t.priority]}h SLA.`,
                             t.id
                        );
                        notified.add(t.id);
                   });
                   localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notified].slice(-300)));
                   UI.updateNotificationBadge && UI.updateNotificationBadge();
              }
         };
         check(); // run once immediately on login
         setInterval(check, 60000);
    },

    // --- AUTO-REFRESH ---
    startAutoRefresh: () => {
         setInterval(() => {
              const user = window.AuthService.getCurrentUser();
              if (!user) return;
              const activePage = document.querySelector('.page.active');
              if (!activePage || activePage.id === 'ticket-detail-page') return;
              if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
              if (document.querySelector('.notif-overlay.open')) return;
              const pageId = activePage.id;
              const currentFilter = document.querySelector(`#${pageId} .filter-btn.active`)?.dataset.filter || 'all';
              const allTickets = window.TicketService.getAllTickets();
              const categoryUnits = UI.getCategoryUnitMap();
              if (pageId === 'mytickets-page') {
                   activePage._tickets = user.role === 'technician'
                        ? allTickets.filter(t => t.assignedId === user.id)
                        : allTickets.filter(t => t.submittedById === user.id);
              } else if (pageId === 'alltickets-page') {
                   activePage._tickets = allTickets;
              } else if (pageId === 'myqueue-page') {
                   activePage._tickets = allTickets.filter(t => {
                        const u = categoryUnits[t.category];
                        return (u === user.unit || t.assignedId === user.id) &&
                               (t.status === 'open' || t.status === 'in-progress');
                   });
              } else if (pageId === 'myteam-page') {
                   activePage._tickets = allTickets.filter(t => categoryUnits[t.category] === user.unit);
              } else if (pageId === 'dashboard-page') {
                   UI.renderDashboard(user); return;
              } else { return; }
              activePage._preservePage = true;
              UI.filterTickets(pageId, currentFilter);
              UI.updateNavBadges();
         }, 60000);
    },

    // --- NAV COUNT BADGES ---
    routeTicket: () => {
         const ticketId = document.getElementById('triage-page')?._currentRoutingTicketId;
         const unit = document.getElementById('routeUnitSelect')?.value;
         const notes = document.getElementById('routeNotes')?.value?.trim();
         if (!ticketId) { window.Utils.showToast('Error', 'No ticket selected.', 'error'); return; }
         if (!unit) { window.Utils.showToast('Error', 'Please select a unit.', 'error'); return; }
         const updated = window.TicketService.routeTicket(ticketId, unit, notes);
         if (updated) {
              window.Utils.showToast('Routed', `Ticket routed to ${unit} unit successfully.`, 'success');
              UI.updateNavBadges();
              UI.openTicketDetail(updated.id);
         }
    },

    updateNavBadges: () => {
         const user = window.AuthService.getCurrentUser();
         if (!user) return;
         const allTickets = window.DataService.getTickets();
         const active = allTickets.filter(t => t.status === 'open' || t.status === 'in-progress');
         const setCount = (ids, n) => ids.forEach(id => {
              const el = document.getElementById(id);
              if (!el) return;
              el.textContent = n > 0 ? (n > 99 ? '99+' : String(n)) : '';
              el.style.display = n > 0 ? 'inline-flex' : 'none';
         });
         if (user.role === 'dispatcher') {
              const unrouted = allTickets.filter(t => t.status === 'open').length;
              setCount(['navCountTriage', 'sidebarCountTriage'], unrouted);
         }
         if (user.role === 'technician') {
              const categoryUnits = UI.getCategoryUnitMap();
              const unassigned = active.filter(t => !t.assignedId && categoryUnits[t.category] === user.unit).length;
              setCount(['navCountQueue', 'sidebarCountQueue'], unassigned);
         }
         if (user.role === 'admin' || user.role === 'super-admin' || user.role === 'unit-head') {
              const unassigned = active.filter(t => !t.assignedId).length;
              setCount(['navCountAll', 'sidebarCountAll'], unassigned);
         }
    },

    // --- GLOBAL SEARCH ---
    globalSearch: (query) => {
         const q = (query || '').trim().toLowerCase();
         if (!q) { UI.closeGlobalSearch(); return; }
         const user = window.AuthService.getCurrentUser();
         if (!user) return;
         const pool = (user.role === 'student' || user.role === 'staff')
              ? window.TicketService.getUserTickets()
              : window.TicketService.getAllTickets();
         const results = pool.filter(t =>
              t.id.toLowerCase().includes(q) ||
              t.title.toLowerCase().includes(q) ||
              (t.submittedBy || '').toLowerCase().includes(q) ||
              (t.category || '').toLowerCase().includes(q)
         ).slice(0, 8);
         let dd = document.getElementById('globalSearchDropdown');
         if (!dd) {
              dd = document.createElement('div');
              dd.id = 'globalSearchDropdown';
              dd.className = 'global-search-dropdown';
              document.body.appendChild(dd);
         }
         dd.innerHTML = results.length
              ? results.map(t => `
                   <div class="global-search-item" onmousedown="UI.openTicketDetail('${t.id}'); UI.closeGlobalSearch();">
                        <span class="global-search-id">${t.id}</span>
                        <span class="global-search-title">${window.Utils.escapeHtml(t.title)}</span>
                        <span class="badge badge-${t.status}" style="font-size:0.6rem;flex-shrink:0;">${t.status.replace('-',' ')}</span>
                   </div>`).join('')
              : '<div class="global-search-empty">No tickets found</div>';
         const input = document.getElementById('globalSearchInput');
         if (input) {
              const r = input.getBoundingClientRect();
              dd.style.top = `${r.bottom + window.scrollY + 4}px`;
              dd.style.left = `${r.left + window.scrollX}px`;
              dd.style.minWidth = `${Math.max(340, r.width)}px`;
         }
         dd.style.display = 'block';
    },

    closeGlobalSearch: () => {
         const dd = document.getElementById('globalSearchDropdown');
         if (dd) dd.style.display = 'none';
    },

    globalSearchKeydown: (e) => {
         if (e.key === 'Escape') { UI.closeGlobalSearch(); e.target.blur(); }
         if (e.key === 'Enter') {
              const first = document.querySelector('#globalSearchDropdown .global-search-item');
              if (first) first.dispatchEvent(new MouseEvent('mousedown'));
         }
    },

    // --- PRINT TICKET ---
    printTicket: () => { window.print(); },

    dashStatClick: (status) => {
        const user = window.AuthService.getCurrentUser();
        if (!user) return;
        const targetPage = (user.role === 'admin' || user.role === 'super-admin' || user.role === 'unit-head')
            ? 'alltickets-page'
            : (user.role === 'technician' ? 'myqueue-page' : 'mytickets-page');
        UI.navigateTo(targetPage);
        // After navigation, activate the matching filter button
        setTimeout(() => {
            const btn = document.querySelector(`#${targetPage} .filter-btn[data-filter="${status}"]`);
            if (btn) {
                document.querySelectorAll(`#${targetPage} .filter-btn`).forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                UI.filterTickets(targetPage, status);
            }
        }, 50);
    },

    copyTicketId: () => {
        const id = document.getElementById('detailTicketId')?.textContent;
        if (!id) return;
        navigator.clipboard?.writeText(id).then(() => {
            window.Utils.showToast('Copied', `${id} copied to clipboard.`, 'success');
        }).catch(() => {
            window.Utils.showToast('ID', id, 'info');
        });
    },

    togglePwVisibility: (inputId, btn) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        const isHidden = input.type === 'password';
        input.type = isHidden ? 'text' : 'password';
        btn.querySelector('.pw-eye-show').style.display = isHidden ? 'none' : '';
        btn.querySelector('.pw-eye-hide').style.display = isHidden ? '' : 'none';
    },

    // --- BULK TICKET ACTIONS ---
    toggleTicketSelect: (ticketId, checked) => {
         if (checked) {
              UI._selectedTickets.add(ticketId);
         } else {
              UI._selectedTickets.delete(ticketId);
         }
         UI.updateBulkBar();
         // Keep the select-all checkbox in sync
         const allTickets = document.getElementById('alltickets-page')._tickets || [];
         const selectAllCb = document.getElementById('selectAllTickets');
         if (selectAllCb) selectAllCb.checked = allTickets.length > 0 && allTickets.every(t => UI._selectedTickets.has(t.id));
    },

    selectAllTickets: (checked) => {
         const allTickets = document.getElementById('alltickets-page')._tickets || [];
         allTickets.forEach(t => {
              if (checked) UI._selectedTickets.add(t.id);
              else UI._selectedTickets.delete(t.id);
         });
         UI.updateBulkBar();
         const activeBtn = document.querySelector('#alltickets-page .filter-btn.active');
         UI.filterTickets('alltickets-page', activeBtn?.dataset.filter || 'all');
    },

    updateBulkBar: () => {
         const bar = document.getElementById('bulkBar');
         if (!bar) return;
         const count = UI._selectedTickets.size;
         bar.style.display = count > 0 ? 'flex' : 'none';
         const countEl = document.getElementById('bulkCount');
         if (countEl) countEl.textContent = `${count} ticket${count !== 1 ? 's' : ''} selected`;
    },

    clearBulkSelection: () => {
         UI._selectedTickets.clear();
         const selectAllCb = document.getElementById('selectAllTickets');
         if (selectAllCb) selectAllCb.checked = false;
         UI.updateBulkBar();
         const activeBtn = document.querySelector('#alltickets-page .filter-btn.active');
         UI.filterTickets('alltickets-page', activeBtn?.dataset.filter || 'all');
    },

    bulkClose: () => {
         if (!UI._selectedTickets.size) return;
         if (!confirm(`Close ${UI._selectedTickets.size} selected ticket(s)? This cannot be undone.`)) return;
         [...UI._selectedTickets].forEach(id => window.TicketService.updateTicketStatus(id, 'closed'));
         window.Utils.showToast('Done', `${UI._selectedTickets.size} tickets closed.`, 'success');
         UI.clearBulkSelection();
    },

    openBulkAssignModal: () => {
         if (!UI._selectedTickets.size) return;
         const techs = window.DataService.getUsers().filter(u => u.role === 'technician' || u.role === 'unit-head');
         const select = document.getElementById('bulkAssignSelect');
         if (select) {
              select.innerHTML = '<option value="">— Choose technician —</option>' +
                   techs.map(t => `<option value="${t.id}">${window.Utils.escapeHtml(t.name)} (${t.unit || t.role})</option>`).join('');
         }
         const info = document.getElementById('bulkAssignInfo');
         if (info) info.textContent = `${UI._selectedTickets.size} ticket${UI._selectedTickets.size !== 1 ? 's' : ''} will be assigned to the selected technician.`;
         document.getElementById('bulkAssignModal').style.display = 'block';
         document.getElementById('bulkAssignOverlay').classList.add('open');
    },

    closeBulkAssignModal: () => {
         document.getElementById('bulkAssignModal').style.display = 'none';
         document.getElementById('bulkAssignOverlay').classList.remove('open');
    },

    confirmBulkAssign: () => {
         const techId = document.getElementById('bulkAssignSelect')?.value;
         if (!techId) { window.Utils.showToast('Error', 'Please select a technician.', 'error'); return; }
         const count = UI._selectedTickets.size;
         [...UI._selectedTickets].forEach(id => window.TicketService.assignTicket(id, techId));
         const tech = window.DataService.getUsers().find(u => u.id === techId);
         window.Utils.showToast('Done', `${count} ticket${count !== 1 ? 's' : ''} assigned to ${tech?.name}.`, 'success');
         UI.closeBulkAssignModal();
         UI.clearBulkSelection();
    },

    // --- RELATED TICKETS ---
    renderRelatedTickets: (ticket) => {
         const card = document.getElementById('detailRelated');
         if (!card) return;
         const user = window.AuthService.getCurrentUser();
         const canManage = user && (user.role === 'admin' || user.role === 'super-admin' || user.role === 'unit-head' || user.role === 'technician');
         const related = (ticket.relatedTicketIds || []).map(id => window.TicketService.getTicketById(id)).filter(Boolean);

         if (!related.length && !canManage) { card.style.display = 'none'; return; }
         card.style.display = 'block';

         const listEl = document.getElementById('detailRelatedList');
         if (listEl) {
              listEl.innerHTML = related.length === 0
                   ? '<p style="color:var(--text-muted);font-size:0.82rem;margin:0;">No related tickets yet.</p>'
                   : related.map(r => `
                        <div class="related-chip" onclick="UI.openTicketDetail('${r.id}')">
                             <span class="related-chip-id">${r.id}</span>
                             <span class="related-chip-title">${window.Utils.escapeHtml(r.title.length > 50 ? r.title.slice(0,50)+'…' : r.title)}</span>
                             <span class="badge badge-${r.status}" style="font-size:0.6rem;">${r.status.replace('-',' ')}</span>
                             ${canManage ? `<button class="related-unlink" title="Unlink" onclick="event.stopPropagation(); UI.unlinkRelatedTicket('${ticket.id}','${r.id}')">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                             </button>` : ''}
                        </div>`).join('');
         }
         const linkEl = document.getElementById('detailRelatedLink');
         if (linkEl) linkEl.style.display = canManage ? 'block' : 'none';
    },

    linkRelatedTicket: () => {
         const input = document.getElementById('relatedTicketInput');
         const relatedId = (input?.value || '').trim().toUpperCase();
         if (!relatedId) return;
         if (!/^TKT-\d{4}-\d{4}$/.test(relatedId)) {
              window.Utils.showToast('Error', 'Use format TKT-YYYY-NNNN', 'error'); return;
         }
         const currentId = UI._currentTicketId;
         if (relatedId === currentId) { window.Utils.showToast('Error', 'Cannot link a ticket to itself.', 'error'); return; }
         if (!window.TicketService.getTicketById(relatedId)) { window.Utils.showToast('Error', `Ticket ${relatedId} not found.`, 'error'); return; }
         const ok = window.TicketService.linkTickets(currentId, relatedId);
         if (ok) {
              if (input) input.value = '';
              UI.renderRelatedTickets(window.TicketService.getTicketById(currentId));
              window.Utils.showToast('Linked', `${relatedId} linked.`, 'success');
         }
    },

    unlinkRelatedTicket: (ticketId, relatedId) => {
         if (!confirm(`Unlink ${relatedId} from this ticket?`)) return;
         window.TicketService.unlinkTickets(ticketId, relatedId);
         UI.renderRelatedTickets(window.TicketService.getTicketById(ticketId));
         window.Utils.showToast('Unlinked', `${relatedId} unlinked.`, 'info');
    },

    // --- CHANGE PASSWORD (forced + optional) ---
    openChangePwModal: (forced = false) => {
         const modal = document.getElementById('changePwModal');
         const overlay = document.getElementById('changePwOverlay');
         if (!modal) return;
         document.getElementById('changePwForcedNotice').style.display = forced ? 'block' : 'none';
         overlay.onclick = forced ? null : UI.closeChangePwModal;
         modal.style.display = 'block';
         overlay.classList.add('open');
         document.getElementById('changePwForm').reset();
    },

    closeChangePwModal: () => {
         document.getElementById('changePwModal').style.display = 'none';
         document.getElementById('changePwOverlay').classList.remove('open');
    },

    handleChangePw: (e) => {
         e.preventDefault();
         const newPw = document.getElementById('changePwNew').value;
         const confirmPw = document.getElementById('changePwConfirm').value;
         if (newPw.length < 6) {
              window.Utils.showToast('Error', 'Password must be at least 6 characters.', 'error');
              return;
         }
         if (newPw !== confirmPw) {
              window.Utils.showToast('Error', 'Passwords do not match.', 'error');
              return;
         }
         const sessionUser = window.AuthService.getCurrentUser();
         const users = window.DataService.getUsers();
         const userRec = users.find(u => u.id === sessionUser.id);
         if (!userRec) return;
         userRec.authPw = newPw;
         userRec.mustChangePw = false;
         window.DataService.saveUser(userRec);
         window.AuthService.setCurrentUser({ ...userRec });
         window.DataService.logAction('change_password', sessionUser.name, sessionUser.id, sessionUser.id, 'Password changed by user');
         window.Utils.showToast('Success', 'Password changed.', 'success');
         UI.closeChangePwModal();
    },

    // --- FORGOT PASSWORD MODAL ---
    openForgotPasswordModal: () => {
         const modal = document.getElementById('forgotPwModal');
         const overlay = document.getElementById('forgotPwOverlay');
         if (!modal) return;
         modal.style.display = 'block';
         overlay.classList.add('open');
         document.getElementById('forgotPwForm').reset();
         setTimeout(() => {
             const emailInput = document.getElementById('forgotPwEmail');
             if (emailInput) emailInput.focus();
         }, 100);
    },

    closeForgotPasswordModal: () => {
         document.getElementById('forgotPwModal').style.display = 'none';
         document.getElementById('forgotPwOverlay').classList.remove('open');
    },

    handleForgotPasswordSubmit: (e) => {
         e.preventDefault();
         const email = document.getElementById('forgotPwEmail').value;
         if (!email) return;
         
         const btn = document.getElementById('forgotPwSubmitBtn');
         if (btn) {
             btn.disabled = true;
             btn.style.opacity = '0.7';
             btn.innerHTML = `<svg style="margin-right: 0.5rem;" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"/><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"/><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"/></svg>Sending...`;
         }

         window.AuthService.resetPassword(email).then(() => {
              window.Utils.showToast('Success', 'If this email is registered, a reset link will be sent.', 'success');
              UI.closeForgotPasswordModal();
         }).catch(err => {
              window.Utils.showToast('Info', err.message, 'info');
              UI.closeForgotPasswordModal();
         }).finally(() => {
              if (btn) {
                  btn.disabled = false;
                  btn.style.opacity = '1';
                  btn.textContent = 'Send Reset Link';
              }
         });
    },

    // --- ACCOUNT SETTINGS MODAL ---
    openAccountModal: () => {
         const user = window.AuthService.getCurrentUser();
         if (!user) return;
         const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
         set('acctName',      user.name);
         set('acctEmail',     user.email);
         set('acctRole',      user.role);
         set('acctDept',      user.department || user.unit || '—');
         set('acctUID',       user.uid || '—');
         set('acctLastLogin', user.lastLogin ? window.Utils.timeAgo(user.lastLogin) : 'This session');
         document.getElementById('accountModal').style.display = 'block';
         document.getElementById('accountOverlay').classList.add('open');
    },

    closeAccountModal: () => {
         document.getElementById('accountModal').style.display = 'none';
         document.getElementById('accountOverlay').classList.remove('open');
    },

    // --- CSV EXPORT ---
    exportTicketsCSV: () => {
         const tickets = window.TicketService.getAllTickets();
         const headers = ['ID','Title','Status','Priority','Category','Submitted By','Assigned To','Unit','Created','Updated','Resolved'];
         const esc = v => `"${String(v || '').replace(/"/g, '""')}"`;
         const fmt = iso => iso ? new Date(iso).toLocaleString() : '';
         const rows = tickets.map(t => [
              t.id, esc(t.title), t.status, t.priority, esc(t.category),
              esc(t.submittedBy), esc(t.assignedTo || ''), t.unit || '',
              fmt(t.createdAt), fmt(t.updatedAt), fmt(t.resolvedAt)
         ].join(','));
         const csv = [headers.join(','), ...rows].join('\n');
         const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
         const a = document.createElement('a');
         a.href = url;
         a.download = `tickets-${new Date().toISOString().slice(0,10)}.csv`;
         document.body.appendChild(a);
         a.click();
         document.body.removeChild(a);
         URL.revokeObjectURL(url);
         window.Utils.showToast('Exported', `${tickets.length} tickets downloaded as CSV.`, 'success');
    },

    updateCharCount: (el) => {
         const count = el.value.length;
         const counter = document.getElementById('ticketDescCount');
         if (!counter) return;
         if (count < 20) {
              counter.textContent = `${count} / 20 minimum`;
              counter.style.color = 'var(--danger)';
         } else if (count > 1800) {
              counter.textContent = `${count} / 2000`;
              counter.style.color = 'var(--warning)';
         } else {
              counter.textContent = `${count} characters`;
              counter.style.color = '';
         }
    },

    // ===== ROLES MANAGEMENT =====
    renderRoles: () => {
        const roles = window.DataService.getRoles();
        const tbody = document.getElementById('rolesTableBody');
        if (!tbody) return;
        
        if (!roles.length) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:2rem;">No roles found.</td></tr>`;
            return;
        }

        tbody.innerHTML = roles.map(role => {
            const perms = (role.permissions || []).slice(0, 3).join(', ');
            const showMore = role.permissions?.length > 3 ? ` +${role.permissions.length - 3} more` : '';
            const locked = UI.isProtectedRole(role.id) && !UI.isSuperAdmin();
            const actions = locked
                ? `<span class="text-muted text-sm">Protected</span>`
                : `
                    <button class="btn btn-icon btn-sm" onclick="UI.editRole('${role.id}')" title="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    ${role.id.startsWith('role_') ? `<button class="btn btn-icon btn-sm" onclick="UI.deleteRole('${role.id}')" title="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>` : ''}
                `;
            return `
                <tr>
                    <td><strong>${role.name}</strong></td>
                    <td><span style="color:var(--text-dim);">${role.description || '—'}</span></td>
                    <td><span style="font-size:0.8rem; color:var(--text-muted);">${perms}${showMore}</span></td>
                    <td style="text-align:right;">${actions}</td>
                </tr>
            `;
        }).join('');
    },

    openRoleModal: (roleId = null) => {
        if (roleId && UI.isProtectedRole(roleId) && !UI.isSuperAdmin()) {
            window.Utils.showToast('Access Denied', 'Only Super Admin can modify the Super Admin role.', 'error');
            return;
        }
        document.getElementById('roleForm').reset();
        const modal = document.getElementById('roleModal');
        const title = document.getElementById('roleModalTitle');
        UI._editingRoleId = roleId;

        if (roleId) {
            const role = window.DataService.getRoleById(roleId);
            if (role) {
                document.getElementById('roleName').value = role.name;
                document.getElementById('roleDescription').value = role.description || '';
                
                // Set permissions checkboxes
                document.querySelectorAll('.rolePermission').forEach(cb => {
                    cb.checked = (role.permissions || []).includes(cb.value);
                });
                
                title.textContent = 'Edit Role';
            }
        } else {
            title.textContent = 'Add Role';
        }

        modal.style.display = 'block';
        document.getElementById('roleModalOverlay').classList.add('open');
    },

    closeRoleModal: () => {
        document.getElementById('roleModal').style.display = 'none';
        document.getElementById('roleModalOverlay').classList.remove('open');
        UI._editingRoleId = null;
    },

    saveRole: (e) => {
        e.preventDefault();
        if (UI._editingRoleId && UI.isProtectedRole(UI._editingRoleId) && !UI.isSuperAdmin()) {
            window.Utils.showToast('Access Denied', 'Only Super Admin can modify the Super Admin role.', 'error');
            UI.closeRoleModal();
            return;
        }
        const name = document.getElementById('roleName')?.value?.trim();
        const description = document.getElementById('roleDescription')?.value?.trim();
        const permissions = Array.from(document.querySelectorAll('.rolePermission:checked')).map(cb => cb.value);

        if (!name) {
            window.Utils.showToast('Validation Error', 'Role name is required.', 'error');
            return;
        }

        const role = {
            id: UI._editingRoleId || 'role_' + Math.random().toString(36).substr(2, 9),
            name,
            description,
            permissions
        };

        try {
            window.DataService.saveRole(role);
        } catch (err) {
            window.Utils.showToast('Access Denied', err.message, 'error');
            UI.closeRoleModal();
            return;
        }
        const performer = window.AuthService.getCurrentUser();
        
        if (UI._editingRoleId) {
            window.DataService.logAction('update_role', performer.name, performer.id, name, `Updated role permissions`);
            window.Utils.showToast('Saved', 'Role updated successfully.', 'success');
        } else {
            window.DataService.logAction('create_role', performer.name, performer.id, name, `Created role with ${permissions.length} permissions`);
            window.Utils.showToast('Created', 'Role created successfully.', 'success');
        }

        UI.closeRoleModal();
        UI.renderRoles();
    },

    editRole: (roleId) => {
        UI.openRoleModal(roleId);
    },

    deleteRole: (roleId) => {
        if (UI.isProtectedRole(roleId) && !UI.isSuperAdmin()) {
            window.Utils.showToast('Access Denied', 'Only Super Admin can delete the Super Admin role.', 'error');
            return;
        }
        const role = window.DataService.getRoleById(roleId);
        if (!role) return;
        
        if (!confirm(`Delete the role "${role.name}"?`)) return;
        
        try {
            window.DataService.deleteRole(roleId);
        } catch (err) {
            window.Utils.showToast('Access Denied', err.message, 'error');
            return;
        }
        const performer = window.AuthService.getCurrentUser();
        window.DataService.logAction('delete_role', performer.name, performer.id, role.name, `Deleted role`);
        window.Utils.showToast('Deleted', 'Role removed.', 'success');
        UI.renderRoles();
    },

    // ===== UNITS MANAGEMENT =====
    renderUnits: () => {
        const units = window.DataService.getUnits();
        const tbody = document.getElementById('unitsTableBody');
        if (!tbody) return;
        
        if (!units.length) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:2rem;">No units found.</td></tr>`;
            return;
        }

        const users = window.DataService.getUsers();
        
        tbody.innerHTML = units.map(unit => {
            const head = unit.head ? users.find(u => u.id === unit.head)?.name : '—';
            const techCount = (unit.technicians || []).length;
            return `
                <tr>
                    <td>
                        <div style="display:flex; align-items:center; gap:0.5rem;">
                            <span style="width:12px; height:12px; background:${unit.color || '#6366f1'}; border-radius:50%;"></span>
                            <strong>${unit.name}</strong>
                        </div>
                    </td>
                    <td><span style="color:var(--text-dim);">${unit.description || '—'}</span></td>
                    <td><span style="font-size:0.85rem;">${head}</span></td>
                    <td><span style="font-size:0.85rem;">${techCount} technician${techCount !== 1 ? 's' : ''}</span></td>
                    <td style="text-align:right;">
                        <button class="btn btn-icon btn-sm" onclick="UI.editUnit('${unit.id}')" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button class="btn btn-icon btn-sm" onclick="UI.deleteUnit('${unit.id}')" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    },

    openUnitModal: (unitId = null) => {
        document.getElementById('unitForm').reset();
        const modal = document.getElementById('unitModal');
        const title = document.getElementById('unitModalTitle');
        UI._editingUnitId = unitId;

        // Populate unit head dropdown
        const users = window.DataService.getUsers();
        const unitHeads = users.filter(u => u.role === 'unit-head' || u.role === 'admin');
        const headSelect = document.getElementById('unitHead');
        headSelect.innerHTML = '<option value="">Unassigned</option>' +
            unitHeads.map(u => `<option value="${u.id}">${u.name}</option>`).join('');

        if (unitId) {
            const unit = window.DataService.getUnitById(unitId);
            if (unit) {
                document.getElementById('unitName').value = unit.name;
                document.getElementById('unitDescription').value = unit.description || '';
                document.getElementById('unitColor').value = unit.color || '#6366f1';
                document.getElementById('unitHead').value = unit.head || '';
                title.textContent = 'Edit Unit';
            }
        } else {
            title.textContent = 'Add Unit';
        }

        modal.style.display = 'block';
        document.getElementById('unitModalOverlay').classList.add('open');
    },

    closeUnitModal: () => {
        document.getElementById('unitModal').style.display = 'none';
        document.getElementById('unitModalOverlay').classList.remove('open');
        UI._editingUnitId = null;
    },

    saveUnit: (e) => {
        e.preventDefault();
        const name = document.getElementById('unitName')?.value?.trim();
        const description = document.getElementById('unitDescription')?.value?.trim();
        const color = document.getElementById('unitColor')?.value;
        const head = document.getElementById('unitHead')?.value || null;

        if (!name) {
            window.Utils.showToast('Validation Error', 'Unit name is required.', 'error');
            return;
        }

        const unit = {
            id: UI._editingUnitId || 'unit_' + Math.random().toString(36).substr(2, 9),
            name,
            description,
            color,
            head: head || null,
            technicians: UI._editingUnitId ? (window.DataService.getUnitById(UI._editingUnitId)?.technicians || []) : []
        };

        window.DataService.saveUnit(unit);
        const performer = window.AuthService.getCurrentUser();
        
        if (UI._editingUnitId) {
            window.DataService.logAction('update_unit', performer.name, performer.id, name, `Updated unit configuration`);
            window.Utils.showToast('Saved', 'Unit updated successfully.', 'success');
        } else {
            window.DataService.logAction('create_unit', performer.name, performer.id, name, `Created new unit`);
            window.Utils.showToast('Created', 'Unit created successfully.', 'success');
        }

        UI.closeUnitModal();
        UI.renderUnits();
        UI.populateCategorySelects();
    },

    editUnit: (unitId) => {
        UI.openUnitModal(unitId);
    },

    deleteUnit: (unitId) => {
        const unit = window.DataService.getUnitById(unitId);
        if (!unit) return;
        
        if (!confirm(`Delete the unit "${unit.name}"?`)) return;
        
        window.DataService.deleteUnit(unitId);
        const performer = window.AuthService.getCurrentUser();
        window.DataService.logAction('delete_unit', performer.name, performer.id, unit.name, `Deleted unit`);
        window.Utils.showToast('Deleted', 'Unit removed.', 'success');
        UI.renderUnits();
    }

};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => UI.init());