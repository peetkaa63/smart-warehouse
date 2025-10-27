import '@testing-library/jest-dom';

// Мокаем window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Мокаем ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Мокаем IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Мокаем window.URL для тестов экспорта
Object.defineProperty(window, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn(),
  },
});

// Мокаем document.createElement для тестов экспорта
const mockLink = {
  href: '',
  setAttribute: jest.fn(),
  click: jest.fn(),
};
const mockCreateElement = jest.fn(() => mockLink);
Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
});

// Мокаем console.error для тестов
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Очищаем моки после каждого теста
afterEach(() => {
  jest.clearAllMocks();
});
