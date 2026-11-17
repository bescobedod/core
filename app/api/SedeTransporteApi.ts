import { authFetch } from '../utils/auth-fetch';

export interface PilotoSede {
  piloto_id: number;
  codigo_user: string | null;
  nombre: string;
}

export interface CamionSede {
  id_camion: string;
  placa: string;
  descripcion: string | null;
  estado: string | null;
}

export interface MapaSedes {
  pilotos: { piloto_id: number; whs_code_origen: string }[];
  camiones: { id_camion: string; whs_code_origen: string }[];
}

async function leer<T>(response: Response, mensaje: string): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || mensaje);
  }
  return data as T;
}

// Pilotos y camiones asignados a una sede (vista de mantenimiento).
export async function getAsignacionesSede(whsCodeOrigen: string): Promise<{ pilotos: PilotoSede[]; camiones: CamionSede[] }> {
  const params = new URLSearchParams({ whs_code_origen: whsCodeOrigen });
  const response = await authFetch(`/sedeTransporte/getAsignacionesSede?${params.toString()}`);
  return leer(response, "Error al obtener los pilotos y camiones de la sede");
}

// Todas las asignaciones vigentes piloto/camión -> sede (para los dropdowns).
export async function getMapaSedes(): Promise<MapaSedes> {
  const response = await authFetch(`/sedeTransporte/getMapaSedes`);
  return leer(response, "Error al obtener las sedes de pilotos y camiones");
}

async function postSede(ruta: string, body: Record<string, unknown>, mensaje: string): Promise<void> {
  const response = await authFetch(`/sedeTransporte/${ruta}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  await leer(response, mensaje);
}

export const asignarPilotoSede = (whsCodeOrigen: string, pilotoId: number) =>
  postSede('asignarPiloto', { whs_code_origen: whsCodeOrigen, piloto_id: pilotoId }, "Error al asignar el piloto a la sede");

export const quitarPilotoSede = (whsCodeOrigen: string, pilotoId: number) =>
  postSede('quitarPiloto', { whs_code_origen: whsCodeOrigen, piloto_id: pilotoId }, "Error al quitar el piloto de la sede");

export const asignarCamionSede = (whsCodeOrigen: string, idCamion: string) =>
  postSede('asignarCamion', { whs_code_origen: whsCodeOrigen, id_camion: idCamion }, "Error al asignar el camión a la sede");

export const quitarCamionSede = (whsCodeOrigen: string, idCamion: string) =>
  postSede('quitarCamion', { whs_code_origen: whsCodeOrigen, id_camion: idCamion }, "Error al quitar el camión de la sede");
