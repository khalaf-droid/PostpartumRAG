export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: AuthUser;
}
