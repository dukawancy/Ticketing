const fs = require('fs');
const path = require('path');

// Mock localStorage for tests
const localStorageMock = (function() {
    let store = {};
    return {
      getItem: function(key) {
        return store[key] || null;
      },
      setItem: function(key, value) {
        store[key] = value.toString();
      },
      removeItem: function(key) {
        delete store[key];
      },
      clear: function() {
        store = {};
      }
    };
  })();
  
Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

Object.defineProperty(window, 'sessionStorage', {
    value: localStorageMock
});

// Load the data module to set up DataService mock backend
const dataCode = fs.readFileSync(path.resolve(__dirname, '../js/data.js'), 'utf8');
eval(dataCode);

// Mock window.dispatchEvent
window.dispatchEvent = jest.fn();
