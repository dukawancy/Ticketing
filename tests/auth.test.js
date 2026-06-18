/**
 * @jest-environment jsdom
 */

// Mock the DataService and setup testing env
require('./setup');
const authCode = require('fs').readFileSync('./js/auth.js', 'utf8');
eval(authCode);

describe('Authentication Service', () => {
    beforeEach(() => {
        // Reset state before each test
        window.DataService.clear();
        window.DataService.set('users', [
            { id: 'u_1', email: 'test@university.edu.ng', authPw: 'password123', status: 'active', role: 'student' },
            { id: 'u_2', email: 'pending@university.edu.ng', authPw: 'password123', status: 'pending', role: 'student' }
        ]);
        window.AuthService.logout();
    });

    test('should login active user successfully', async () => {
        const result = await window.AuthService.login('test@university.edu.ng', 'password123');
        expect(result.status).toBe('success');
        expect(result.user.id).toBe('u_1');
    });

    test('should reject invalid credentials', async () => {
        await expect(window.AuthService.login('test@university.edu.ng', 'wrongpass'))
            .rejects.toThrow('Invalid email or password');
    });

    test('should return pending status for unapproved accounts', async () => {
        const result = await window.AuthService.login('pending@university.edu.ng', 'password123');
        expect(result.status).toBe('pending');
    });

    test('should register new user and set status to pending', async () => {
        const newUser = {
            name: 'New Student',
            email: 'new@university.edu.ng',
            authPw: 'pass123',
            role: 'student'
        };
        const result = await window.AuthService.register(newUser);
        expect(result.status).toBe('pending');
        expect(result.email).toBe('new@university.edu.ng');
    });

    test('should prevent duplicate email registration', async () => {
        const existingUser = {
            name: 'Existing',
            email: 'test@university.edu.ng',
            authPw: 'pass123',
            role: 'student'
        };
        await expect(window.AuthService.register(existingUser))
            .rejects.toThrow('Email already registered');
    });
});
