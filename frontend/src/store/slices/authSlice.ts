import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { authService, LoginData, User } from '../../services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: authService.getCurrentUser(),
  token: authService.getToken(),
  loading: false,
  error: null
};

/**
 * Async thunk: логин пользователя через `authService`.
 *
 * Почему так:
 * - Держим побочные эффекты (HTTP, хранение токена) внутри сервиса, а не в компонентах.
 * - Возвращаем удобочитаемое сообщение ошибки — UX важнее деталей транспорта.
 */
export const login = createAsyncThunk(
  'auth/login',
  async (loginData: LoginData, { rejectWithValue }) => {
    try {
      const response = await authService.login(loginData);
      return response;
    } catch (error: any) {
      // Возвращаем удобочитаемое сообщение
      let errorMessage = 'Login failed';
      
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      
      console.error('❌ Auth slice login error:', errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);

/**
 * Redux slice аутентификации.
 *
 * Почему так:
 * - Инициализация из `authService` даёт «тёплый старт» после перезагрузки.
 * - Локальный `error` управляется тут, чтобы UI оставался декларативным.
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      authService.logout();
      state.user = null;
      state.token = null;
      state.error = null;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.error = null;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        
        // Более надежная обработка ошибок
        let errorMessage = 'Login failed';
        
        if (action.payload && typeof action.payload === 'string') {
          errorMessage = action.payload;
        } else if (action.error?.message) {
          errorMessage = action.error.message;
        }
        
        state.error = errorMessage;
        console.error('❌ Login rejected with error:', errorMessage);
      });

  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
