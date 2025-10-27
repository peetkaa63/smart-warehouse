import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { BrowserRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import userEvent from '@testing-library/user-event';
import Login from '../../pages/Login';
import authReducer from '../../store/slices/authSlice';

// Создаем тестовый store
const createTestStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      auth: authReducer
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        loading: false,
        error: null,
        ...initialState.auth
      }
    }
  });
};

// Мокаем authService
jest.mock('../../services/authService', () => ({
  authService: {
    login: jest.fn(),
    getCurrentUser: jest.fn(),
    getToken: jest.fn(),
    logout: jest.fn()
  }
}));

// Мокаем framer-motion для тестов
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => children
}));

const renderWithProviders = (component: React.ReactElement, initialState = {}) => {
  const store = createTestStore(initialState);
  return render(
    <Provider store={store}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </Provider>
  );
};

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render login form', () => {
      renderWithProviders(<Login />);
      
      expect(screen.getByText('Умный склад')).toBeInTheDocument();
      expect(screen.getByText('Вход в систему')).toBeInTheDocument();
      expect(screen.getByLabelText('Email адрес')).toBeInTheDocument();
      expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
    });

    it('should render logo', () => {
      renderWithProviders(<Login />);
      
      const logo = screen.getByAltText('Ростелеком');
      expect(logo).toBeInTheDocument();
      expect(logo).toHaveAttribute('src', '/logo.png');
    });

    it('should render remember me checkbox', () => {
      renderWithProviders(<Login />);
      
      expect(screen.getByLabelText('Запомнить меня')).toBeInTheDocument();
    });
  });

  describe('Form Interaction', () => {
    it('should update email field when user types', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const emailInput = screen.getByLabelText('Email адрес');
      await user.type(emailInput, 'test@example.com');
      
      expect(emailInput).toHaveValue('test@example.com');
    });

    it('should update password field when user types', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const passwordInput = screen.getByLabelText('Пароль');
      await user.type(passwordInput, 'password123');
      
      expect(passwordInput).toHaveValue('password123');
    });

    it('should toggle remember me checkbox', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const checkbox = screen.getByLabelText('Запомнить меня');
      await user.click(checkbox);
      
      expect(checkbox).toBeChecked();
    });
  });

  describe('Form Validation', () => {
    it('should show error for empty fields', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const submitButton = screen.getByRole('button', { name: /войти/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Заполните все поля')).toBeInTheDocument();
      });
    });

    it('should show error for short password', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const emailInput = screen.getByLabelText('Email адрес');
      const passwordInput = screen.getByLabelText('Пароль');
      const submitButton = screen.getByRole('button', { name: /войти/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, '123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Пароль должен содержать минимум 8 символов')).toBeInTheDocument();
      });
    });

    it('should clear error when user starts typing', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />);
      
      const submitButton = screen.getByRole('button', { name: /войти/i });
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Заполните все поля')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByLabelText('Email адрес');
      await user.type(emailInput, 'test@example.com');
      
      await waitFor(() => {
        expect(screen.queryByText('Заполните все поля')).not.toBeInTheDocument();
      });
    });
  });

  describe('Login Process', () => {
    it('should show loading state during login', async () => {
      const user = userEvent.setup();
      const { authService } = require('../../services/authService');
      
      // Мокаем асинхронный login
      authService.login.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ user: { id: 1, email: 'test@example.com' }, token: 'token' }), 100))
      );
      
      renderWithProviders(<Login />);
      
      const emailInput = screen.getByLabelText('Email адрес');
      const passwordInput = screen.getByLabelText('Пароль');
      const submitButton = screen.getByRole('button', { name: /войти/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      expect(screen.getByText('Вход...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('should handle successful login', async () => {
      const user = userEvent.setup();
      const { authService } = require('../../services/authService');
      
      const mockUser = { id: 1, email: 'test@example.com' };
      const mockToken = 'jwt-token';
      
      authService.login.mockResolvedValue({ user: mockUser, token: mockToken });
      
      renderWithProviders(<Login />);
      
      const emailInput = screen.getByLabelText('Email адрес');
      const passwordInput = screen.getByLabelText('Пароль');
      const submitButton = screen.getByRole('button', { name: /войти/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: false
        });
      });
    });

    it('should handle login error', async () => {
      const user = userEvent.setup();
      const { authService } = require('../../services/authService');
      
      authService.login.mockRejectedValue(new Error('Invalid credentials'));
      
      renderWithProviders(<Login />);
      
      const emailInput = screen.getByLabelText('Email адрес');
      const passwordInput = screen.getByLabelText('Пароль');
      const submitButton = screen.getByRole('button', { name: /войти/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    it('should include rememberMe in login data', async () => {
      const user = userEvent.setup();
      const { authService } = require('../../services/authService');
      
      authService.login.mockResolvedValue({ user: {}, token: 'token' });
      
      renderWithProviders(<Login />);
      
      const emailInput = screen.getByLabelText('Email адрес');
      const passwordInput = screen.getByLabelText('Пароль');
      const checkbox = screen.getByLabelText('Запомнить меня');
      const submitButton = screen.getByRole('button', { name: /войти/i });
      
      await user.type(emailInput, 'test@example.com');
      await user.type(passwordInput, 'password123');
      await user.click(checkbox);
      await user.click(submitButton);
      
      await waitFor(() => {
        expect(authService.login).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123',
          rememberMe: true
        });
      });
    });
  });

  describe('Animation States', () => {
    it('should show initial animation state', () => {
      renderWithProviders(<Login />);
      
      // Проверяем, что логотип присутствует в начальном состоянии
      expect(screen.getByAltText('Ростелеком')).toBeInTheDocument();
    });

    it('should show form after animation', async () => {
      renderWithProviders(<Login />);
      
      // Ждем завершения анимации
      await waitFor(() => {
        expect(screen.getByLabelText('Email адрес')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Error Display', () => {
    it('should display Redux error state', () => {
      renderWithProviders(<Login />, {
        auth: {
          error: 'Network error',
          loading: false
        }
      });
      
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('should clear error when user interacts with form', async () => {
      const user = userEvent.setup();
      renderWithProviders(<Login />, {
        auth: {
          error: 'Network error',
          loading: false
        }
      });
      
      expect(screen.getByText('Network error')).toBeInTheDocument();
      
      const emailInput = screen.getByLabelText('Email адрес');
      await user.type(emailInput, 'test@example.com');
      
      // Ошибка должна исчезнуть при взаимодействии с формой
      await waitFor(() => {
        expect(screen.queryByText('Network error')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderWithProviders(<Login />);
      
      expect(screen.getByLabelText('Email адрес')).toBeInTheDocument();
      expect(screen.getByLabelText('Пароль')).toBeInTheDocument();
      expect(screen.getByLabelText('Запомнить меня')).toBeInTheDocument();
    });

    it('should have proper button text', () => {
      renderWithProviders(<Login />);
      
      expect(screen.getByRole('button', { name: /войти/i })).toBeInTheDocument();
    });

    it('should show password helper text', () => {
      renderWithProviders(<Login />);
      
      expect(screen.getByText('Пароль должен содержать минимум 8 символов')).toBeInTheDocument();
    });
  });
});
