/* =========================================
   ICT HELPDESK - TICKET MANAGEMENT
   Handles CRUD operations for tickets
   ========================================= */

const TicketService = {
    // Generate an ID like TKT-2026-0001
    generateId: () => {
        const year = new Date().getFullYear();
        const tickets = window.DataService.getTickets();
        const count = tickets.length + 1;
        return `TKT-${year}-${count.toString().padStart(4, '0')}`;
    },

    submitTicket: (ticketData) => {
        return new Promise((resolve) => {
            const user = window.AuthService.getCurrentUser();
            const ticket = {
                id: TicketService.generateId(),
                status: 'open',
                submittedById: user.id,
                submittedBy: user.name,
                comments: [],
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

              ticket.status = newStatus;
              
              if(newStatus === 'resolved') {
                  ticket.resolvedAt = new Date().toISOString();
              } else if (newStatus === 'closed') {
                  ticket.closedAt = new Date().toISOString();
              }

              window.DataService.saveTicket(ticket);
              window.NotificationService.notifyStatusChange(ticket, oldStatus, newStatus);
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
              window.DataService.saveTicket(ticket);
              
              if(!isInternal) {
                   window.NotificationService.notifyNewComment(ticket, comment);
              }
              return ticket;
         }
         return null;
    },
    
    assignTicket: (ticketId, techId) => {
         const ticket = TicketService.getTicketById(ticketId);
         const tech = window.DataService.getUsers().find(u => u.id === techId);
         
         if(ticket && tech) {
              ticket.assignedId = tech.id;
              ticket.assignedTo = tech.name;
              if (ticket.status === 'open') {
                   ticket.status = 'in-progress';
              }
              window.DataService.saveTicket(ticket);
              window.NotificationService.notifyAssignment(ticket, tech.id);
              return ticket;
         }
         return null;
    }
};

window.TicketService = TicketService;
