export interface User {
  id: number;
  email: string;
  password_hash: string;
  name: string;
  role: 'operator' | 'admin' | 'viewer';
  created_at: Date;
}

export interface PublicUser {
  id: number;
  name: string;
  email: string;
  role: 'operator' | 'admin' | 'viewer';
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  token: string;
  user: PublicUser;
}

export interface JwtPayload {
  id: number;
  email: string;
  role: string;
}