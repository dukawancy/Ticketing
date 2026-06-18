/**
 * @jest-environment jsdom
 */

describe('UI Validation Basics', () => {
    // Basic test to verify jest is configured correctly
    test('DOM operations should work in JSDOM', () => {
        document.body.innerHTML = '<div id="test">Hello</div>';
        const el = document.getElementById('test');
        expect(el.textContent).toBe('Hello');
    });
});
