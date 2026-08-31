import { authFetch } from '../utils/auth-fetch';
import { NotificacionDestinatario, NotificacionContexto } from '../types/NotificacionDestinatarioModel';

export async function getContextos(): Promise<NotificacionContexto[]> {
  const response = await authFetch(`/notificaciones/getContextos`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener los contextos");
  }
  const data = await response.json();
  return data.contextos;
}

export async function crearContexto(
  codigo: string,
  nombre: string,
  descripcion?: string
): Promise<NotificacionContexto> {
  const response = await authFetch(`/notificaciones/crearContexto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo, nombre, descripcion }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || "Error al crear el contexto");
  }
  return data.contexto;
}

export async function getDestinatarios(contexto: string): Promise<NotificacionDestinatario[]> {
  const params = new URLSearchParams({ contexto });

  const response = await authFetch(`/notificaciones/getDestinatarios?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener los destinatarios");
  }
  const data = await response.json();
  return data.destinatarios;
}

export async function crearDestinatario(
  contexto: string,
  email: string,
  nombre?: string
): Promise<NotificacionDestinatario> {
  const response = await authFetch(`/notificaciones/crearDestinatario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contexto, email, nombre }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || "Error al crear el destinatario");
  }
  return data.destinatario;
}

export async function actualizarDestinatario(
  id: number,
  cambios: { nombre?: string | null; activo?: boolean }
): Promise<NotificacionDestinatario> {
  const response = await authFetch(`/notificaciones/actualizarDestinatario/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cambios),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || "Error al actualizar el destinatario");
  }
  return data.destinatario;
}

export async function eliminarDestinatario(id: number): Promise<void> {
  const response = await authFetch(`/notificaciones/eliminarDestinatario/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al eliminar el destinatario");
  }
}
