import { apiClient, setAuthToken, clearAuthToken } from '../../lib/apiClient';

const USER_STORAGE_KEY = 'auth_user';

export const login = async ({ email, password }) => {
  const data = await apiClient.post('/login', { email, password }, { unauthenticatedOn401: false });

  setAuthToken(data.token);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(data.user));

  return data.user;
};

export const logout = async () => {
  try {
    await apiClient.post('/logout');
  } catch {
    // Best-effort: si la llamada al servidor falla (token ya vencido, sin red, etc.)
    // igual queremos terminar la sesion localmente.
  } finally {
    clearAuthToken();
    localStorage.removeItem(USER_STORAGE_KEY);
  }
};

export const getStoredUser = () => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
