const BASIC_URL = process.env.NEXT_PUBLIC_API_URL;

export async function validateLogin(email: string) {
  const response = await fetch(`${BASIC_URL}/validateLogin/${email}`, {
    method: 'POST',
    headers: {"Content-Type": "application/json"}
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error desconocido en el servidor");
  }

  const data = await response.json();

  if (data.ok) {
    localStorage.setItem("token", data.token);
    localStorage.setItem("nombre", data.user.nombre);
    localStorage.setItem("login_method", "microsoft");
  }

  return data;
}

export async function login(identifier: string, password: string) {
  const response = await fetch(`${BASIC_URL}/login`, {
    method: 'POST',
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({ identifier, password })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error desconocido en el servidor");
  }

  const data = await response.json();

  localStorage.setItem("token", data.token);
  localStorage.setItem("nombre", data.user.nombre);
  localStorage.setItem("login_method", "internal");

  return data;
}