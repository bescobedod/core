const TOKEN_KEY = 'token'; // <-- ajusta esto al nombre real de tu key en localStorage

export function getUserRole(): number | null {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    try {
        const payload = token.split('.')[1];
        const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(normalized));
        return decoded?.rol ?? null;
    } catch {
        return null;
    }
}