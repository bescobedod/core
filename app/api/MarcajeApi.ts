import { authFetch } from '../utils/auth-fetch';
import {
  FiltrosMarcajes,
  MarcajeDetalle,
  ResultadoBusquedaMarcajes,
  UsuarioConMarcajes,
  ZonaMarcaje,
} from '../types/MarcajeModel';

function paramsDeFiltros(filtros: FiltrosMarcajes): URLSearchParams {
  const params = new URLSearchParams();
  if (filtros.id_usuario) params.set('id_usuario', filtros.id_usuario);
  if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
  if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
  if (filtros.tipo) params.set('tipo', filtros.tipo);
  if (filtros.estado) params.set('estado', filtros.estado);
  if (filtros.id_zona) params.set('id_zona', filtros.id_zona);
  return params;
}

export async function getUsuariosConMarcajes(): Promise<UsuarioConMarcajes[]> {
  const response = await authFetch('/marcaje/getUsuarios');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || 'Error al obtener los usuarios');
  }
  return data.usuarios;
}

export async function getZonasMarcaje(): Promise<ZonaMarcaje[]> {
  const response = await authFetch('/marcaje/getZonas');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || 'Error al obtener las zonas');
  }
  return data.zonas;
}

export async function buscarMarcajes(filtros: FiltrosMarcajes): Promise<ResultadoBusquedaMarcajes> {
  const response = await authFetch(`/marcaje/buscarMarcajes?${paramsDeFiltros(filtros).toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || 'Error al buscar los marcajes');
  }
  return { total: data.total, limite: data.limite, marcajes: data.marcajes };
}

export async function getMarcaje(idMarcaje: string): Promise<MarcajeDetalle> {
  const params = new URLSearchParams({ id_marcaje: idMarcaje });
  const response = await authFetch(`/marcaje/getMarcaje?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || 'Error al obtener el marcaje');
  }
  return data.marcaje;
}

function guardarArchivo(blob: Blob, nombre: string) {
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

export async function exportarMarcajes(filtros: FiltrosMarcajes): Promise<void> {
  const response = await authFetch(`/marcaje/exportarMarcajes?${paramsDeFiltros(filtros).toString()}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.details || data.error || 'Error al exportar los marcajes');
  }

  const marcaDeTiempo = new Date().toISOString().slice(0, 10);
  guardarArchivo(await response.blob(), `marcajes_${marcaDeTiempo}.xlsx`);
}
