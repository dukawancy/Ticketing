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
         return (unsafe||'').replace(/[&<"']/g, function(m) {
              switch (m) {
                   case '&': return '&amp;';
                   case '<': return '&lt;';
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
         
         let icon = 'ℹ️';
         if (type === 'success') icon = '✅';
         if (type === 'error') icon = '❌';
         if (type === 'warning') icon = '⚠️';

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

    // Subcategory mapping
    SUBCATEGORIES: {
         'Account & Access': ['Portal Login', 'Email Access', 'Password Reset', 'New Account Request'],
         'Network & WiFi': ['No Internet', 'Slow Connection', 'WiFi Not Showing', 'VPN Issues'],
         'Hardware': ['Computer Not Working', 'Printer Issue', 'Projector Fault', 'Mouse/Keyboard Problems'],
         'Software': ['Software Installation', 'System Crash', 'License Issue', 'Update Problem'],
         'CBT / E-Learning': ['Exam Portal Error', 'Submission Failed', 'LMS Login Issues', 'Course Not Showing'],
         'University Website': ['Page Not Loading', 'Wrong Information', 'Form Not Working'],
         'Email': ['Email Setup', 'Cannot Send', 'Cannot Receive', 'Spam Issues'],
         'Other': ['Miscellaneous issues']
    }
};

window.Utils = Utils;
