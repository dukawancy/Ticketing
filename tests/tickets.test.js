/**
 * @jest-environment jsdom
 */

require('./setup');
const authCode = require('fs').readFileSync('./js/auth.js', 'utf8');
const ticketsCode = require('fs').readFileSync('./js/tickets.js', 'utf8');
eval(authCode);
eval(ticketsCode);

describe('Ticket Service', () => {
    beforeEach(() => {
        window.DataService.clear();
        window.AuthService.setCurrentUser({
            id: 'u_tester',
            name: 'Tester User',
            role: 'student',
            email: 'tester@university.edu.ng'
        });
    });

    test('should generate properly formatted ticket IDs', () => {
        const id = window.TicketService.generateId();
        expect(id).toMatch(/^TKT-\d{4}-\d{4}$/);
    });

    test('should successfully submit a new ticket', async () => {
        const ticketData = {
            title: 'Test Issue',
            category: 'Software',
            priority: 'low',
            description: 'Testing the creation logic'
        };
        
        const ticket = await window.TicketService.submitTicket(ticketData);
        expect(ticket.title).toBe('Test Issue');
        expect(ticket.status).toBe('open');
        expect(ticket.submittedById).toBe('u_tester');
    });

    test('should fetch only user tickets', async () => {
        // Mock data
        window.DataService.set('tickets', [
            { id: 'TKT-1', submittedById: 'u_tester' },
            { id: 'TKT-2', submittedById: 'u_other' }
        ]);

        const myTickets = window.TicketService.getUserTickets();
        expect(myTickets.length).toBe(1);
        expect(myTickets[0].id).toBe('TKT-1');
    });

    test('should add comment to ticket', () => {
        window.DataService.set('tickets', [
            { id: 'TKT-1', comments: [], status: 'open' }
        ]);

        const updated = window.TicketService.addComment('TKT-1', 'New comment');
        expect(updated.comments.length).toBe(1);
        expect(updated.comments[0].text).toBe('New comment');
        expect(updated.comments[0].authorId).toBe('u_tester');
    });
});
