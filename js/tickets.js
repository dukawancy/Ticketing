/* =========================================
   ICT HELPDESK - TICKET MANAGEMENT
   Handles CRUD operations for tickets
   ========================================= */

const TicketService = {
    VALID_TRANSITIONS: {
        'open':        ['routed', 'in-progress', 'escalated', 'closed'],
        'routed':      ['in-progress', 'open', 'escalated', 'closed'],
        'in-progress': ['open', 'routed', 'resolved', 'escalated', 'closed'],
        'resolved':    ['in-progress', 'closed'],
        'closed':      [],
        'escalated':   ['in-progress', 'resolved', 'closed']
    },
    // Generate an ID like TKT-2026-0001
    generateId: () => {
        const year = new Date().getFullYear();
        const tickets = window.DataService.getTickets();
        const maxNum = tickets.reduce((max, t) => {
            const match = t.id.match(/TKT-\d+-(\d+)/);
            return match ? Math.max(max, parseInt(match[1], 10)) : max;
        }, 0);
        return `TKT-${year}-${(maxNum + 1).toString().padStart(4, '0')}`;
    },

    submitTicket: (ticketData) => {
        return new Promise((resolve) => {
            const user = window.AuthService.getCurrentUser();
            const now = new Date().toISOString();
            const ticket = {
                id: TicketService.generateId(),
                status: 'open',
                submittedById: user.id,
                submittedBy: user.name,
                comments: [],
                createdAt: now,
                updatedAt: now,
                ...ticketData
            };
            
            window.DataService.saveTicket(ticket);
            
            const users = window.DataService.getUsers();

            // Auto Routing Logic
            const categoryToUnit = {
                'Network & WiFi': 'Network',
                'Hardware': 'Hardware',
                'Software': 'Software',
                'Account & Access': 'Database',
                'CBT / E-Learning': 'CBT',
                'University Website': 'Web',
                'Email': 'Network'
            };
            
            const targetUnit = categoryToUnit[ticketData.category];
            if (targetUnit) {
                 const unitHead = users.find(u => (u.role === 'unit-head' || u.role === 'technician') && u.unit === targetUnit);
                 if (unitHead) {
                      ticket.assignedId = unitHead.id;
                      ticket.assignedTo = unitHead.name;
                      ticket.status = 'in-progress';
                      
                      // Notify assigned technician directly
                      window.NotificationService.notifyAssignment(ticket, unitHead.id);
                 }
            }
            
            // Re-save ticket if auto-assigned
            if (ticket.assignedId) {
                 window.DataService.saveTicket(ticket);
            }

            window.DataService.logAction('create_ticket', user.name, user.id, ticket.id, `${ticket.category} — ${ticket.priority} priority`);

            // Notify admins
            const admins = users.filter(u => u.role === 'admin');
            admins.forEach(admin => {
                window.NotificationService.createNotification(
                    admin.id, 
                    'status-change', 
                    'New Ticket Submitted', 
                    `Ticket ${ticket.id} (${ticket.category}) submitted. Assigned: ${ticket.assignedTo || 'Unassigned'}.`, 
                    ticket.id
                );
            });

            resolve(ticket);
        });
    },

    getUserTickets: () => {
         const user = window.AuthService.getCurrentUser();
         return window.DataService.getTickets().filter(t => t.submittedById === user.id);
    },

    getAssignedTickets: () => {
         const user = window.AuthService.getCurrentUser();
         return window.DataService.getTickets().filter(t => t.assignedId === user.id);
    },

    getAllTickets: () => {
         return window.DataService.getTickets();
    },

    getTicketById: (id) => {
         return window.DataService.getTickets().find(t => t.id === id);
    },

    updateTicketStatus: (id, newStatus) => {
         const ticket = TicketService.getTicketById(id);
         if(ticket) {
              const oldStatus = ticket.status;
              if (oldStatus === newStatus) return ticket;

              const validNext = TicketService.VALID_TRANSITIONS[oldStatus] || [];
              if (!validNext.includes(newStatus)) {
                   if (window.Utils?.showToast) window.Utils.showToast('Invalid Transition', `Cannot move from "${oldStatus}" to "${newStatus}".`, 'error');
                   return null;
              }

              ticket.status = newStatus;
              ticket.updatedAt = new Date().toISOString();

              if(newStatus === 'resolved') {
                  ticket.resolvedAt = new Date().toISOString();
              } else if (newStatus === 'closed') {
                  ticket.closedAt = new Date().toISOString();
              }

              ticket.history = ticket.history || [];
              const performer = window.AuthService.getCurrentUser();
              ticket.history.push({
                  action: 'status_change',
                  from: oldStatus,
                  to: newStatus,
                  by: performer ? performer.name : 'System',
                  time: new Date().toISOString()
              });
              window.DataService.saveTicket(ticket);
              window.NotificationService.notifyStatusChange(ticket, oldStatus, newStatus);
              if (performer) window.DataService.logAction('update_status', performer.name, performer.id, ticket.id, `${oldStatus} → ${newStatus}`);
              return ticket;
         }
         return null;
    },

    addComment: (ticketId, text, isInternal = false) => {
         const user = window.AuthService.getCurrentUser();
         const ticket = TicketService.getTicketById(ticketId);
         
         if(ticket) {
              const comment = {
                   id: 'c_' + Math.random().toString(36).substr(2, 9),
                   author: user.name,
                   authorId: user.id,
                   authorRole: user.role,
                   text: text,
                   time: new Date().toISOString(),
                   isInternal: isInternal
              };
              
              ticket.comments.push(comment);
              ticket.updatedAt = new Date().toISOString();
              window.DataService.saveTicket(ticket);
              
              if(!isInternal) {
                   window.NotificationService.notifyNewComment(ticket, comment);
              }
              return ticket;
         }
         return null;
    },
    
    editTicket: (ticketId, data) => {
         const ticket = TicketService.getTicketById(ticketId);
         if (!ticket) return null;
         if (data.title)       ticket.title       = data.title;
         if (data.description) ticket.description = data.description;
         ticket.editedAt   = new Date().toISOString();
         ticket.updatedAt  = new Date().toISOString();
         window.DataService.saveTicket(ticket);
         const user = window.AuthService.getCurrentUser();
         if (user) window.DataService.logAction('edit_ticket', user.name, user.id, ticket.id, 'Edited title/description');
         return ticket;
    },

    escalateTicket: (ticketId, reason) => {
         const ticket = TicketService.getTicketById(ticketId);
         if (!ticket) return null;
         const oldStatus = ticket.status;
         ticket.status            = 'escalated';
         ticket.escalationReason  = reason;
         ticket.updatedAt         = new Date().toISOString();
         ticket.history           = ticket.history || [];
         const user = window.AuthService.getCurrentUser();
         ticket.history.push({
              action: 'status_change',
              from: oldStatus, to: 'escalated',
              by: user ? user.name : 'System',
              time: new Date().toISOString()
         });
         window.DataService.saveTicket(ticket);
         window.NotificationService.notifyStatusChange(ticket, oldStatus, 'escalated');
         if (user) window.DataService.logAction('escalate_ticket', user.name, user.id, ticket.id, reason.substring(0, 80));
         return ticket;
    },

    editComment: (ticketId, commentId, newText) => {
         const ticket = TicketService.getTicketById(ticketId);
         if (!ticket) return null;
         const comment = ticket.comments.find(c => c.id === commentId);
         if (!comment) return null;
         comment.text = newText;
         comment.editedAt = new Date().toISOString();
         ticket.updatedAt = new Date().toISOString();
         window.DataService.saveTicket(ticket);
         return ticket;
    },

    deleteComment: (ticketId, commentId) => {
         const ticket = TicketService.getTicketById(ticketId);
         if (!ticket) return null;
         ticket.comments = ticket.comments.filter(c => c.id !== commentId);
         ticket.updatedAt = new Date().toISOString();
         window.DataService.saveTicket(ticket);
         return ticket;
    },

    linkTickets: (id1, id2) => {
         const t1 = TicketService.getTicketById(id1);
         const t2 = TicketService.getTicketById(id2);
         if (!t1 || !t2 || id1 === id2) return false;
         t1.relatedTicketIds = t1.relatedTicketIds || [];
         t2.relatedTicketIds = t2.relatedTicketIds || [];
         if (!t1.relatedTicketIds.includes(id2)) {
              t1.relatedTicketIds.push(id2);
              window.DataService.saveTicket(t1);
         }
         if (!t2.relatedTicketIds.includes(id1)) {
              t2.relatedTicketIds.push(id1);
              window.DataService.saveTicket(t2);
         }
         return true;
    },

    unlinkTickets: (id1, id2) => {
         const t1 = TicketService.getTicketById(id1);
         const t2 = TicketService.getTicketById(id2);
         if (t1) {
              t1.relatedTicketIds = (t1.relatedTicketIds || []).filter(id => id !== id2);
              window.DataService.saveTicket(t1);
         }
         if (t2) {
              t2.relatedTicketIds = (t2.relatedTicketIds || []).filter(id => id !== id1);
              window.DataService.saveTicket(t2);
         }
    },

    routeTicket: (ticketId, unit, notes) => {
         const ticket = TicketService.getTicketById(ticketId);
         const dispatcher = window.AuthService.getCurrentUser();
         if (!ticket || !unit || !dispatcher) return null;

         ticket.unit = unit;
         ticket.routedBy = dispatcher.name;
         ticket.routedById = dispatcher.id;
         ticket.routedAt = new Date().toISOString();
         ticket.updatedAt = new Date().toISOString();
         ticket.status = 'routed';

         ticket.history = ticket.history || [];
         ticket.history.push({
              action: 'routed',
              to: unit,
              by: dispatcher.name,
              notes: notes || '',
              time: new Date().toISOString()
         });

         window.DataService.saveTicket(ticket);
         window.DataService.logAction('route_ticket', dispatcher.name, dispatcher.id, ticket.id, `Routed to ${unit} unit`);

         const unitHead = window.DataService.getUsers().find(u => u.role === 'unit-head' && u.unit === unit);
         if (unitHead) {
              window.NotificationService.createNotification(
                   unitHead.id, 'assignment',
                   'Ticket Routed to Your Unit',
                   `${ticket.id}: "${ticket.title}" routed to ${unit} unit by ${dispatcher.name}.`,
                   ticket.id
              );
         }

         return ticket;
    },

    assignTicket: (ticketId, techId) => {
         const ticket = TicketService.getTicketById(ticketId);
         const tech = window.DataService.getUsers().find(u => u.id === techId);
         
         if(ticket && tech) {
              ticket.assignedId = tech.id;
              ticket.assignedTo = tech.name;
              ticket.updatedAt = new Date().toISOString();
              if (ticket.status === 'open' || ticket.status === 'routed') {
                   ticket.status = 'in-progress';
              }
              ticket.history = ticket.history || [];
              const assignPerformer = window.AuthService.getCurrentUser();
              ticket.history.push({
                  action: 'assigned',
                  to: tech.name,
                  by: assignPerformer ? assignPerformer.name : 'System',
                  time: new Date().toISOString()
              });
              window.DataService.saveTicket(ticket);
              window.NotificationService.notifyAssignment(ticket, tech.id);
              if (assignPerformer) window.DataService.logAction('assign_ticket', assignPerformer.name, assignPerformer.id, ticket.id, `Assigned to ${tech.name}`);
              return ticket;
         }
         return null;
    }
};

window.TicketService = TicketService;
