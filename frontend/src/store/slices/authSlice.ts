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

export const login = createAsyncThunk(
  'auth/login',
  async (loginData: LoginData, { rejectWithValue }) => {
    try {
      const response = await authService.login(loginData);
      return response;
    } catch (error: any) {
      // Возвращаем удобочитаемое сообщение
      const msg = error?.message ?? 'Login failed';
      return rejectWithValue(msg);
    }
  }
);

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
		state.error = (action.payload as string) ?? action.error?.message ?? 'Login failed';
	  });

  }
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
