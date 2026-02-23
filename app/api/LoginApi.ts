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
    localStorage.setItem("token", data.token);
    localStorage.setItem("rol", data.user.rol);
    localStorage.setItem("nombre", data.user.nombre);

  return data;
}