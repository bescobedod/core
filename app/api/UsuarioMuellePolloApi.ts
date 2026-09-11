import { authFetch } from '../utils/auth-fetch';
import { UsuarioMuelle } from '../types/UsuarioMuellePolloModel';

export async function getUsuariosPorMuelle(whsCodeOrigen: string): Promise<UsuarioMuelle[]> {
  const params = new URLSearchParams({ whs_code_origen: whsCodeOrigen });

  const response = await authFetch(`/usuario-muelle-pollo/getUsuariosPorMuelle?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || "Error al obtener los usuarios del muelle");
  }
  return data.usuarios;
}

export async function buscarUsuarios(query: string): Promise<UsuarioMuelle[]> {
  const params = new URLSearchParams({ query });

  const response = await authFetch(`/usuario-muelle-pollo/buscarUsuarios?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || "Error al obtener los usuarios");
  }
  return data.usuarios;
}

export async function asignarMuelle(
  idUsuario: number,
  whsCodeOrigen: string,
  nombreMuelle?: string
): Promise<void> {
  const response = await authFetch(`/usuario-muelle-pollo/asignarMuelle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_usuario: idUsuario, whs_code_origen: whsCodeOrigen, nombre_muelle: nombreMuelle }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || "Error al asignar el muelle");
  }
}

export async function quitarMuelle(idUsuario: number): Promise<void> {
  const response = await authFetch(`/usuario-muelle-pollo/quitarMuelle/${idUsuario}`, {
    method: 'DELETE',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || "Error al quitar el muelle");
  }
}
