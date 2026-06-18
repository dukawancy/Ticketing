/* =========================================
   ICT HELPDESK - UI CONTROLLER
   Handles DOM manipulation and page routing
   ========================================= */

const UI = {
    init: () => {
        UI.bindEvents();
        UI.checkAuth();
        
        // Listen for new notifications to update badge and panel if open
        window.addEventListener('notification:new', () => {
             UI.updateNotificationBadge();
             if (document.getElementById('notifPanel').classList.contains('open')) {
                 UI.renderNotifications();
             }
        });
    },

    bindEvents: () => {
        // Auth Forms
        const loginForm = document.getElementById('loginForm');
        if (loginForm) loginForm.addEventListener('submit', UI.handleLogin);
        
        const registerForm = document.getElementById('registerForm');
        if (registerForm) registerForm.addEventListener('submit', UI.handleRegister);
        
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

    checkAuth: () => {
        const user = window.AuthService.getCurrentUser();
        if (user) {
            document.getElementById('auth-wrapper').style.display = 'none';
            document.getElementById('app-wrapper').style.display = 'flex';
            UI.setupUserInterface(user);
            UI.navigateTo('dashboard-page');
            window.NotificationService.init();
            window.NotificationService.requestPermission();
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

        // Basic validation
        if(!email.endsWith('@unijos.edu.ng')) {
             window.Utils.showToast('Error', 'Must use @unijos.edu.ng email', 'error');
             return;
        }

        const btn = e.target.querySelector('button[type="submit"]');
        const origText = btn.innerHTML;

        try {
            btn.innerHTML = 'Creating Account...';
            btn.disabled = true;
            await window.AuthService.register({ name, uid, role, email, authPw: pass });
            UI.showAuthPage('pending-view');
        } catch(err) {
             window.Utils.showToast('Error', err.message, 'error');
        } finally {
            btn.innerHTML = origText;
            btn.disabled = false;
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
        
        window.scrollTo(0,0);
    },

    loadPageData: (pageId) => {
        const user = window.AuthService.getCurrentUser();
        switch(pageId) {
            case 'dashboard-page':
                UI.renderDashboard(user);
                break;
            case 'mytickets-page':
                UI.renderMyTickets(user);
                break;
            case 'alltickets-page':
                UI.renderAllTickets(user);
                break;
            case 'users-page':
                UI.renderUsersAdmin();
                break;
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
        } else if (user.role === 'admin' || user.role === 'super-admin') {
             title = 'System Dashboard';
             tickets = window.TicketService.getAllTickets();
             renderTickets = tickets.slice(0, 5);
        }

        document.getElementById('dashTitle').textContent = title;

        const openCount = tickets.filter(t => t.status === 'open').length;
        const ipCount = tickets.filter(t => t.status === 'in-progress').length;
        const resCount = tickets.filter(t => t.status === 'resolved').length;
        const totalCount = tickets.length;

        document.getElementById('dashOpenCount').textContent = openCount;
        document.getElementById('dashInprogCount').textContent = ipCount;
        document.getElementById('dashResCount').textContent = resCount;
        document.getElementById('dashTotalCount').textContent = totalCount;

        UI.renderTicketList('dashRecentTickets', renderTickets);
    },

    // --- TICKET LISTS ---
    renderTicketList: (containerId, tickets) => {
         const container = document.getElementById(containerId);
         if(!container) return;

         if (tickets.length === 0) {
              container.innerHTML = `
                   <div class="empty-state">
                        <div class="empty-icon">📁</div>
                        <div class="empty-title">No tickets found</div>
                        <div class="empty-desc">There are no tickets matching this view.</div>
                   </div>
              `;
              return;
         }

         // Sort by date DESC
         tickets.sort((a,b) => new Date(b.updatedAt) - new Date(a.updatedAt));

         container.innerHTML = tickets.map(t => UI.buildTicketHtml(t)).join('');
    },

    buildTicketHtml: (t) => {
         const timeStr = window.Utils.timeAgo(t.updatedAt);
         return `
              <div class="ticket-item" onclick="UI.openTicketDetail('${t.id}')">
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
                        <span class="badge badge-${t.priority}">${t.priority}</span>
                        <span class="badge badge-${t.status}">${t.status.replace('-',' ')}</span>
                   </div>
              </div>
         `;
    },

    renderMyTickets: (user) => {
         const tickets = window.TicketService.getUserTickets();
         // Save for filtering
         document.getElementById('mytickets-page')._tickets = tickets;
         UI.filterTickets('mytickets-page', 'all');
    },

    renderAllTickets: (user) => {
         const tickets = window.TicketService.getAllTickets();
         document.getElementById('alltickets-page')._tickets = tickets;
         UI.filterTickets('alltickets-page', 'all');
    },

    filterTickets: (pageId, filterValue) => {
         const tickets = document.getElementById(pageId)._tickets || [];
         let filtered = tickets;
         const valStr = String(filterValue).toLowerCase();

         if (valStr !== 'all') {
              filtered = tickets.filter(t => t.status === valStr);
         }
         
         // simple search text
         const searchInput = document.querySelector(`#${pageId} .search-bar input`);
         if(searchInput && searchInput.value) {
              const query = searchInput.value.toLowerCase();
              filtered = filtered.filter(t => 
                   t.id.toLowerCase().includes(query) || 
                   t.title.toLowerCase().includes(query)
              );
         }

         const listId = pageId === 'mytickets-page' ? 'myTicketsList' : 'allTicketsList';
         UI.renderTicketList(listId, filtered);
    },

    // --- TICKET DETAIL ---
    openTicketDetail: (ticketId) => {
         const ticket = window.TicketService.getTicketById(ticketId);
         if (!ticket) return;
         
         const user = window.AuthService.getCurrentUser();
         
         // Update UI
         document.getElementById('detailTicketId').textContent = ticket.id;
         document.getElementById('detailTitle').textContent = ticket.title;
         
         const badgeStatus = document.getElementById('detailBadgeStatus');
         badgeStatus.textContent = ticket.status.replace('-',' ');
         badgeStatus.className = `badge badge-${ticket.status}`;

         const badgePriority = document.getElementById('detailBadgePriority');
         badgePriority.textContent = ticket.priority;
         badgePriority.className = `badge badge-${ticket.priority}`;

         document.getElementById('detailBadgeCategory').textContent = ticket.category;
         
         document.getElementById('detailSubmitter').textContent = ticket.submittedBy;
         document.getElementById('detailDate').textContent = window.Utils.formatDate(ticket.createdAt);
         document.getElementById('detailLocation').textContent = ticket.location || 'N/A';
         document.getElementById('detailAssigned').textContent = ticket.assignedTo || 'Unassigned';
         
         const attachBox = document.getElementById('detailAttachment');
         if(attachBox) {
             if (ticket.attachment) {
                  attachBox.innerHTML = `<a href="${ticket.attachment.dataUrl}" download="${ticket.attachment.name}" target="_blank" class="ticket-id-copy" style="font-size:0.75rem;">📎 ${window.Utils.escapeHtml(ticket.attachment.name)}</a>`;
             } else {
                  attachBox.innerHTML = 'None';
             }
         }

         document.getElementById('detailDescription').textContent = ticket.description;

         // Render Comments
         UI.renderComments(ticket.comments);

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
                         UI.renderComments(updated.comments);
                         document.getElementById('commentText').value = '';
                     }
                 }
             };
         }

         // Only admin, super-admin, unit-head, or assigned tech can update status
         if (statusDiv) {
              if (user.role === 'admin' || user.role === 'super-admin' || user.role === 'unit-head' || (user.role === 'technician' && ticket.assignedId === user.id)) {
                   statusDiv.style.display = 'block';
                   const select = document.getElementById('updateStatusSelect');
                   select.value = ticket.status;
                   document.getElementById('updateStatusBtn').onclick = () => {
                        const updated = window.TicketService.updateTicketStatus(ticket.id, select.value);
                        if(updated) {
                            window.Utils.showToast('Success', 'Status updated successfully', 'success');
                            UI.openTicketDetail(updated.id); // Refresh
                        }
                   };
              } else {
                   statusDiv.style.display = 'none';
              }
         }

         // Assignment controls (Admin / Super Admin / Unit Head only)
         const assignDiv = document.getElementById('detailAssignBox');
         if (assignDiv) {
              if ((user.role === 'admin' || user.role === 'super-admin' || user.role === 'unit-head') && !ticket.closedAt) {
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

         UI.navigateTo('ticket-detail-page');
    },

    renderComments: (comments) => {
         const container = document.getElementById('detailComments');
         if (!container) return;

         if (!comments || comments.length === 0) {
              container.innerHTML = '<div style="color:var(--muted); font-size:0.875rem; text-align:center; padding:1rem;">No comments yet.</div>';
              return;
         }

         container.innerHTML = comments.map(c => `
              <div class="comment-item">
                   <div class="comment-avatar">${c.author.charAt(0)}</div>
                   <div class="comment-body ${c.isInternal ? 'comment-internal' : ''}">
                        <div class="comment-header">
                             <span class="comment-author">${window.Utils.escapeHtml(c.author)}</span>
                             <span class="badge badge-${c.authorRole}">${c.authorRole}</span>
                             <span class="comment-time">${window.Utils.timeAgo(c.time)}</span>
                             ${c.isInternal ? '<span class="badge" style="background:var(--warning); color:#000;">Internal Note</span>' : ''}
                        </div>
                        <div class="comment-text">${window.Utils.escapeHtml(c.text)}</div>
                   </div>
              </div>
         `).join('');
    },

    // --- FORM LOGIC ---
    exportCSV: () => {
         const tickets = window.TicketService.getAllTickets();
         let csvContent = "data:text/csv;charset=utf-8,";
         csvContent += "ID,Title,Category,Priority,Status,Submitted By,Assigned To,Date\n";
         
         tickets.forEach(t => {
              const row = [
                   t.id,
                   `"${(t.title || '').replace(/"/g, '""')}"`,
                   t.category,
                   t.priority,
                   t.status,
                   `"${(t.submittedBy || '').replace(/"/g, '""')}"`,
                   `"${(t.assignedTo || 'Unassigned').replace(/"/g, '""')}"`,
                   t.createdAt
              ].join(",");
              csvContent += row + "\r\n";
         });

         const encodedUri = encodeURI(csvContent);
         const link = document.createElement("a");
         link.setAttribute("href", encodedUri);
         link.setAttribute("download", `ict_tickets_${new Date().toISOString().split('T')[0]}.csv`);
         document.body.appendChild(link);
         link.click();
         document.body.removeChild(link);
    },

    handleCategoryChange: (e) => {
         const cat = e.target.value;
         const subSelect = document.getElementById('ticketSubCategory');
         subSelect.innerHTML = '<option value="">Select Specific Issue</option>';
         
         if (cat && window.Utils.SUBCATEGORIES[cat]) {
              window.Utils.SUBCATEGORIES[cat].forEach(sub => {
                   subSelect.insertAdjacentHTML('beforeend', `<option value="${sub}">${sub}</option>`);
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
                        <div class="notif-empty-icon">📭</div>
                        <div class="notif-empty-text">No notifications yet</div>
                   </div>
              `;
              return;
         }

         const icons = {
              'status-change': '📋',
              'comment': '💬',
              'assignment': '👤',
              'escalation': '⚠️'
         };

         list.innerHTML = notifs.map(n => `
              <div class="notif-item ${n.read ? '' : 'unread'}" onclick="UI.notifClick('${n.ticketId}')">
                   <div class="notif-icon">${icons[n.type] || '🔔'}</div>
                   <div class="notif-content">
                        <div class="notif-title">${window.Utils.escapeHtml(n.title)}</div>
                        <div class="notif-msg">${window.Utils.escapeHtml(n.message)}</div>
                        <div class="notif-time">${window.Utils.timeAgo(n.time)}</div>
                   </div>
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

    // --- ADMIN USER MANAGER ---
    renderUsersAdmin: () => {
         const currentUser = window.AuthService.getCurrentUser();
         const users = window.DataService.getUsers();
         const pending = users.filter(u => u.status === 'pending');
         const active = users.filter(u => u.status !== 'pending');

         const pendingGrid = document.getElementById('pendingUsersGrid');
         const activeGrid = document.getElementById('activeUsersGrid');

         const addStaffBtn = document.getElementById('addStaffBtn');
         if (addStaffBtn) {
             addStaffBtn.style.display = currentUser.role === 'super-admin' ? 'inline-block' : 'none';
         }

         if(pendingGrid) {
              if (pending.length === 0) pendingGrid.innerHTML = '<div class="text-muted">No pending approvals.</div>';
              else pendingGrid.innerHTML = pending.map(u => UI.buildUserCardHtml(u, true, currentUser)).join('');
         }

         if(activeGrid) {
              activeGrid.innerHTML = active.map(u => UI.buildUserCardHtml(u, false, currentUser)).join('');
         }
    },

    buildUserCardHtml: (u, isPending, currentUser) => {
         const isSuperAdmin = currentUser && currentUser.role === 'super-admin';
         let actions = '';

         if (isPending) {
             actions = `
                 <button class="btn btn-sm btn-success" onclick="UI.approveUser('${u.id}')">Approve</button>
                 <button class="btn btn-sm btn-danger" onclick="UI.rejectUser('${u.id}')">Reject</button>
             `;
         } else {
             if (u.role === 'super-admin' && !isSuperAdmin) {
                 actions = '<span class="text-muted text-sm">Protected</span>';
             } else if (u.id === currentUser.id) {
                 actions = '<span class="text-muted text-sm">You</span>';
             } else {
                 actions += u.status === 'suspended' ? 
                     `<button class="btn btn-sm btn-success" onclick="UI.toggleUserSuspend('${u.id}', 'active')">Unsuspend</button>` : 
                     `<button class="btn btn-sm btn-warning" onclick="UI.toggleUserSuspend('${u.id}', 'suspended')">Suspend</button>`;
                 
                 if (isSuperAdmin) {
                     actions += ` <button class="btn btn-sm btn-danger" onclick="UI.deleteUser('${u.id}')">Delete</button>`;
                 }
             }
         }

         return `
              <div class="user-card">
                   <div class="user-card-header">
                        <div class="user-card-avatar" style="background:var(--surface3)">${u.name.charAt(0)}</div>
                        <div>
                             <div class="user-card-name">${window.Utils.escapeHtml(u.name)} <span class="badge badge-${u.role}">${u.role}</span></div>
                             <div class="user-card-email">${window.Utils.escapeHtml(u.email)}</div>
                        </div>
                   </div>
                   <div class="user-card-meta">
                        <div>ID/UID: ${u.uid || 'N/A'}</div>
                        <div>Status: <span class="status-dot ${u.status}"></span>${u.status}</div>
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
              window.Utils.showToast('Approved', `${user.name} approved.`, 'success');
              UI.renderUsersAdmin();
         }
    },
    rejectUser: (id) => {
         window.DataService.deleteUser(id);
         window.Utils.showToast('Rejected', 'User request rejected and deleted.', 'info');
         UI.renderUsersAdmin();
    },
    toggleUserSuspend: (id, newStatus) => {
         const users = window.DataService.getUsers();
         const user = users.find(u => u.id === id);
         if(user) {
              user.status = newStatus;
              window.DataService.saveUser(user);
              window.Utils.showToast('Updated', `User status changed to ${newStatus}.`, 'success');
              UI.renderUsersAdmin();
         }
    },
    deleteUser: (id) => {
         if(confirm('Are you sure you want to delete this user?')) {
              window.DataService.deleteUser(id);
              window.Utils.showToast('Deleted', 'User deleted.', 'success');
              UI.renderUsersAdmin();
         }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => UI.init());
