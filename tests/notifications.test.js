/**
 * @jest-environment jsdom
 */

require('./setup');
const notifCode = require('fs').readFileSync('./js/notifications.js', 'utf8');
eval(notifCode);

describe('Notification Service', () => {
    beforeEach(() => {
        window.DataService.clear();
        window.AuthService = {
            getCurrentUser: () => ({ id: 'u_tester', name: 'Tester User' })
        };
    });

    test('should create a notification for a user', () => {
        window.NotificationService.createNotification('u_target', 'status-change', 'Title', 'Msg', 'TKT-1');
        
        const notifs = window.DataService.getNotifications('u_target');
        expect(notifs.length).toBe(1);
        expect(notifs[0].title).toBe('Title');
        expect(notifs[0].read).toBe(false);
    });

    test('should calculate unread count correctly', () => {
        window.DataService.set('notifications', {
            'u_target': [
                { id: 'n1', read: false },
                { id: 'n2', read: true },
                { id: 'n3', read: false }
            ]
        });

        const unread = window.NotificationService.getUnreadCount('u_target');
        expect(unread).toBe(2);
    });

    test('notifyStatusChange should notify involved parties', () => {
        const ticket = {
            id: 'TKT-1',
            submittedById: 'u_submitter',
            assignedId: 'u_tech'
        };

        window.NotificationService.notifyStatusChange(ticket, 'open', 'in-progress');

        const submitterNotifs = window.DataService.getNotifications('u_submitter');
        const techNotifs = window.DataService.getNotifications('u_tech');

        expect(submitterNotifs.length).toBe(1);
        expect(techNotifs.length).toBe(1);
    });
});
