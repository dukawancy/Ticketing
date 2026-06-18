/* =========================================
   ICT HELPDESK - NOTIFICATIONS
   Handles in-app and browser notifications
   ========================================= */

const NotificationService = {
    initialized: false,
    permissionGranted: false,

    init: () => {
        if (!NotificationService.initialized) {
            if ('Notification' in window) {
                NotificationService.permissionGranted = Notification.permission === 'granted';
            }
            NotificationService.initialized = true;
        }
    },

    requestPermission: async () => {
        if (!('Notification' in window)) return false;
        
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            const permission = await Notification.requestPermission();
            NotificationService.permissionGranted = permission === 'granted';
        } else {
             NotificationService.permissionGranted = Notification.permission === 'granted';
        }
        return NotificationService.permissionGranted;
    },

    createNotification: (userId, type, title, message, ticketId) => {
        const notif = {
            id: 'n_' + Math.random().toString(36).substr(2, 9),
            type, // status-change, comment, assignment, escalation
            title,
            message,
            ticketId,
            read: false,
            time: new Date().toISOString()
        };

        window.DataService.saveNotification(userId, notif);
        
        // Trigger event for UI to update if the user receiving is currently logged in
        const current = window.AuthService.getCurrentUser();
        if (current && current.id === userId) {
            window.dispatchEvent(new CustomEvent('notification:new', { detail: notif }));
            
            // Browser push
             NotificationService.sendBrowserPush(title, message);
        }
    },

    sendBrowserPush: (title, body) => {
        if (!NotificationService.permissionGranted) return;
        
        try {
            const notif = new Notification(title, {
                body,
                icon: 'https://cdn-icons-png.flaticon.com/512/3233/3233483.png' // Generic notification icon
            });
            notif.onclick = function() {
                window.focus();
                this.close();
            };
        } catch(e) {
            console.warn('Browser push failed', e);
        }
    },

    getUnreadCount: (userId) => {
        return window.DataService.getNotifications(userId).filter(n => !n.read).length;
    },
    
    // Notification logic helpers for specific events
    notifyStatusChange: (ticket, oldStatus, newStatus) => {
        const title = 'Ticket Status Updated';
        const msg = `Ticket ${ticket.id}: Status changed to ${newStatus}`;
        
        // Notify submitter
        if (ticket.submittedById !== window.AuthService.getCurrentUser().id) {
            NotificationService.createNotification(ticket.submittedById, 'status-change', title, msg, ticket.id);
        }
        
        // Notify assigned tech (if assigned and not the one making the change)
        if (ticket.assignedId && ticket.assignedId !== window.AuthService.getCurrentUser().id) {
             NotificationService.createNotification(ticket.assignedId, 'status-change', title, msg, ticket.id);
        }
    },
    
    notifyNewComment: (ticket, comment) => {
         const title = 'New Comment';
         const msg = `${comment.author} commented on ${ticket.id}`;
         
          // Notify submitter
         if (ticket.submittedById !== comment.authorId) {
             NotificationService.createNotification(ticket.submittedById, 'comment', title, msg, ticket.id);
         }
         
         // Notify assigned tech (if assigned and not the one making comment)
         if (ticket.assignedId && ticket.assignedId !== comment.authorId) {
              NotificationService.createNotification(ticket.assignedId, 'comment', title, msg, ticket.id);
         }
    },
    
    notifyAssignment: (ticket, assignedTechId) => {
         NotificationService.createNotification(
             assignedTechId, 
             'assignment', 
             'Ticket Assigned', 
             `You have been assigned ticket ${ticket.id}`, 
             ticket.id
         );
    }
};

window.NotificationService = NotificationService;
