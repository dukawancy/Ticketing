const fs = require('fs');
const path = require('path');
const vm = require('vm');

describe('TicketService guest follow-up', () => {
  let TicketService;
  let savedTicket;

  beforeEach(() => {
    const context = {
      console,
      Date,
      Math,
      setTimeout,
      clearTimeout,
    };
    context.window = context;

    const script = fs.readFileSync(path.join(__dirname, '..', 'js', 'tickets.js'), 'utf8');
    vm.createContext(context);
    vm.runInContext(script, context);

    TicketService = context.TicketService;
    savedTicket = null;

    context.window.DataService = {
      getTickets: () => [
        {
          id: 'TKT-2026-0001',
          guestEmail: 'guest@example.com',
          guestName: 'Jane Doe',
          submittedById: 'guest_abc',
          comments: [],
          status: 'in-progress',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z'
        }
      ],
      saveTicket: (ticket) => {
        savedTicket = ticket;
      },
      logAction: jest.fn()
    };

    context.window.AuthService = {
      getCurrentUser: () => null
    };

    context.window.NotificationService = {
      notifyNewComment: jest.fn(),
      notifyStatusChange: jest.fn(),
      createNotification: jest.fn(),
      notifyAssignment: jest.fn()
    };

    context.window.Utils = {
      showToast: jest.fn()
    };
  });

  test('adds a follow-up comment to an existing guest ticket', () => {
    const updated = TicketService.addGuestReply('TKT-2026-0001', 'guest@example.com', 'Thanks for the update', 'Jane Doe');

    expect(updated).not.toBeNull();
    expect(savedTicket.comments).toHaveLength(1);
    expect(savedTicket.comments[0].text).toBe('Thanks for the update');
    expect(savedTicket.comments[0].authorRole).toBe('guest');
  });
});
