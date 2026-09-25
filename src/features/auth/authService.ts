import { apiPost } from '../../lib/api';

export type Role = 'admin' | 'student';

export type AuthUser = {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  is_active: boolean;
};

export type LoginResult = {
  access: string;
  refresh: string;
  user: AuthUser;
};

export function login(email: string, password: string): Promise<LoginResult> {
  return apiPost<LoginResult>('/auth/login/', { email, password });
}
