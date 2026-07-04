/* =========================================
   ICT HELPDESK - UTILITIES
   Helper functions for formatting, etc.
   ========================================= */

const Utils = {
    // Format ISO date to relative time (e.g. "2 hours ago")
    timeAgo: (dateString) => {
        if (!dateString) return '';
        const now = new Date();
        const date = new Date(dateString);
        const seconds = Math.floor((now - date) / 1000);
        
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " minutes ago";
        
        if (seconds < 10) return "Just now";
        return Math.floor(seconds) + " seconds ago";
    },

    // Format ISO date to readable string
    formatDate: (dateString) => {
         if (!dateString) return '';
         const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' };
         return new Date(dateString).toLocaleDateString(undefined, options);
    },

    // Escape HTML to prevent XSS
    escapeHtml: (unsafe) => {
         return (unsafe||'').replace(/[&<>"']/g, function(m) {
              switch (m) {
                   case '&': return '&amp;';
                   case '<': return '&lt;';
                   case '>': return '&gt;';
                   case '"': return '&quot;';
                   default: return '&#039;';
              }
         });
    },

    // Get color code for status
    getStatusColor: (status) => {
         const colors = {
              'open': 'var(--warning)',
              'in-progress': 'var(--info)',
              'resolved': 'var(--success)',
              'closed': 'var(--muted)',
              'escalated': 'var(--danger)'
         };
         return colors[status] || 'var(--text)';
    },

    // Show toast message
    showToast: (title, message, type = 'info') => {
         let container = document.getElementById('toast-container');
         if (!container) {
              container = document.createElement('div');
              container.id = 'toast-container';
              container.className = 'toast-container';
              document.body.appendChild(container);
         }

         const toast = document.createElement('div');
         toast.className = `toast ${type}`;
         
         const icons = {
              success: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
              error:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
              warning: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
              info:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#06B6D4" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
         };
         const icon = icons[type] || icons.info;

         toast.innerHTML = `
              <div class="toast-icon">${icon}</div>
              <div class="toast-body">
                   <div class="toast-title">${Utils.escapeHtml(title)}</div>
                   <div class="toast-msg">${Utils.escapeHtml(message)}</div>
              </div>
         `;

         container.appendChild(toast);

         // Auto remove after animation
         setTimeout(() => {
              if (container.contains(toast)) {
                   container.removeChild(toast);
              }
         }, 3000);
    },

    // SLA hours per priority
    SLA_HOURS: { critical: 1, high: 4, medium: 24, low: 72 },

    isOverdue: (ticket) => {
        if (!ticket.createdAt) return false;
        if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
        const slaMs = (Utils.SLA_HOURS[ticket.priority] || 72) * 3600000;
        return Date.now() > new Date(ticket.createdAt).getTime() + slaMs;
    },

    slaCompliancePct: (tickets) => {
        const closed = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');
        if (!closed.length) return 100;
        const ok = closed.filter(t => {
            if (!t.createdAt) return true;
            const slaMs = (Utils.SLA_HOURS[t.priority] || 72) * 3600000;
            const deadline = new Date(t.createdAt).getTime() + slaMs;
            const resolvedAt = new Date(t.resolvedAt || t.closedAt || t.updatedAt || t.createdAt).getTime();
            return resolvedAt <= deadline;
        });
        return Math.round((ok.length / closed.length) * 100);
    },

    timeUntilDeadline: (ticket) => {
        if (!ticket.createdAt) return null;
        const slaMs = (Utils.SLA_HOURS[ticket.priority] || 72) * 3600000;
        const ms = new Date(ticket.createdAt).getTime() + slaMs - Date.now();
        if (ms <= 0) return null;
        const h = Math.floor(ms / 3600000);
        const m = Math.floor((ms % 3600000) / 60000);
        if (h >= 48) return `${Math.floor(h / 24)}d left`;
        if (h >= 1) return `${h}h ${m}m left`;
        return `${m}m left`;
    },

    getCategories: () => {
         return window.DataService ? window.DataService.getCategories() : [];
    },

    getCategoryByName: (name) => {
         if (!window.DataService) return undefined;
         return window.DataService.getCategoryByName(name);
    },

    getCategorySubcategories: (name) => {
         const category = Utils.getCategoryByName(name);
         return category ? category.subcategories || [] : [];
    }
};

window.Utils = Utils;
