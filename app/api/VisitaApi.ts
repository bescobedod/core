import { authFetch } from '../utils/auth-fetch';
import {
  EvidenciaVisita,
  FiltrosVisitas,
  ResultadoBusquedaVisitas,
  UsuarioConVisitas,
  VisitaDetalle,
} from '../types/VisitaModel';

export type FormatoExportacionVisitas = 'pdf' | 'excel';

function paramsDeFiltros(filtros: FiltrosVisitas): URLSearchParams {
  const params = new URLSearchParams();
  if (filtros.id_usuario) params.set('id_usuario', filtros.id_usuario);
  if (filtros.fecha_desde) params.set('fecha_desde', filtros.fecha_desde);
  if (filtros.fecha_hasta) params.set('fecha_hasta', filtros.fecha_hasta);
  if (filtros.whs_name && filtros.whs_name.trim()) params.set('whs_name', filtros.whs_name.trim());
  return params;
}

export async function getUsuariosConVisitas(): Promise<UsuarioConVisitas[]> {
  const response = await authFetch('/visita/getUsuarios');
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || 'Error al obtener los usuarios');
  }
  return data.usuarios;
}

export async function buscarVisitas(filtros: FiltrosVisitas): Promise<ResultadoBusquedaVisitas> {
  const response = await authFetch(`/visita/buscarVisitas?${paramsDeFiltros(filtros).toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || 'Error al buscar las visitas');
  }
  return { total: data.total, limite: data.limite, visitas: data.visitas };
}

export async function getVisita(
  idVisita: string
): Promise<{ visita: VisitaDetalle; evidencias: EvidenciaVisita[] }> {
  const params = new URLSearchParams({ id_visita: idVisita });
  const response = await authFetch(`/visita/getVisita?${params.toString()}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || 'Error al obtener la visita');
  }
  return { visita: data.visita, evidencias: data.evidencias };
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

export async function exportarVisitas(
  filtros: FiltrosVisitas,
  formato: FormatoExportacionVisitas
): Promise<void> {
  const params = paramsDeFiltros(filtros);
  params.set('formato', formato);

  const response = await authFetch(`/visita/exportarVisitas?${params.toString()}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.details || data.error || 'Error al exportar las visitas');
  }

  const marcaDeTiempo = new Date().toISOString().slice(0, 10);
  guardarArchivo(await response.blob(), `visitas_${marcaDeTiempo}.${formato === 'excel' ? 'xlsx' : 'pdf'}`);
}
