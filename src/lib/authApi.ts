import { supabase } from './supabase';

const AUTH_API = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-api`;

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
};

export interface AppUser {
  id: string;
  username: string;
  email: string;
  is_active: boolean;
  must_change_password: boolean;
}

async function callApi<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${AUTH_API}/${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export async function loginWithPassword(identifier: string, password: string): Promise<{ user: AppUser }> {
  return callApi('login', { identifier, password });
}

export async function sendOtp(identifier: string, purpose: 'login' | 'reset' = 'login'): Promise<{ message: string; email: string; otp?: string }> {
  return callApi('send-otp', { identifier, purpose });
}

export async function verifyOtpLogin(identifier: string, otp: string): Promise<{ user: AppUser }> {
  return callApi('verify-otp', { identifier, otp, purpose: 'login' });
}

export async function verifyOtpReset(identifier: string, otp: string): Promise<{ reset_token: string; email: string }> {
  return callApi('verify-otp', { identifier, otp, purpose: 'reset' });
}

export async function resetPassword(reset_token: string, new_password: string): Promise<{ message: string }> {
  return callApi('reset-password', { reset_token, new_password });
}

export async function changePassword(user_id: string, current_password: string, new_password: string): Promise<{ message: string }> {
  return callApi('change-password', { user_id, current_password, new_password });
}

export async function getUser(user_id: string): Promise<{ user: AppUser }> {
  return callApi('get-user', { user_id });
}

export async function updateUser(user_id: string, updates: { username?: string; email?: string; is_active?: boolean }): Promise<{ user: AppUser }> {
  return callApi('update-user', { user_id, ...updates });
}

export async function logoutApi(username: string): Promise<void> {
  try {
    await callApi('logout', { username });
  } catch {
    // non-blocking
  }
}
