const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function authFetch(path: string, init: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  // Prevención antes de llamar
  if (!token) {
    localStorage.clear();
    throw new Error('Token requerido');
  }

  const headers = new Headers(init.headers || {});
  
  if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });

  // Manejo por respuesta del backend
  if (!res.ok && res.status === 401) {
    const body = await res.clone().json().catch(() => null);
    const code = body?.code;
    const msg = (body?.error || body?.message || '').toLowerCase();

    const expired = code === 'TOKEN_EXPIRED' || msg.includes('token expirado') || msg.includes('jwt expired');
    const invalid = code === 'TOKEN_INVALID' || msg.includes('token inválido') || msg.includes('invalid signature');
    const required = code === 'TOKEN_REQUIRED' || msg.includes('token requerido');

    if (expired || invalid || required) {
      localStorage.clear();
      throw new Error(expired ? 'Sesión expirada' : invalid ? 'Token inválido' : 'Token requerido');
    }
  }

  return res;
}