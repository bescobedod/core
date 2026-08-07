import {
  RutaInsumos,
  TiendaPdvBusqueda,
  TiendaRutaInsumos,
  CrearRutaInsumosPayload,
  AsignarTiendaRutaInsumosPayload,
  CandadoRutaInsumos,
} from '../types/RutaInsumoModel';
import { authFetch } from '../utils/auth-fetch';

export async function getRutasInsumos(): Promise<RutaInsumos[]> {
  const response = await authFetch(`/rutaInsumos/getRutas`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener las rutas de insumos");
  }
  const data = await response.json();
  return data.rutas;
}

export async function crearRutaInsumos(payload: CrearRutaInsumosPayload): Promise<RutaInsumos> {
  const response = await authFetch(`/rutaInsumos/crearRuta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al crear la ruta");
  }
  const data = await response.json();
  return data.ruta;
}

export async function actualizarRutaInsumos(rutaId: string, nombreRuta: string, whsCodeDestino: string): Promise<RutaInsumos> {
  const response = await authFetch(`/rutaInsumos/actualizarRuta`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ruta_id: rutaId, nombre_ruta: nombreRuta, whs_code_destino: whsCodeDestino })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al actualizar la ruta");
  }
  const data = await response.json();
  return data.ruta;
}

export async function buscarTiendasPdv(query: string): Promise<TiendaPdvBusqueda[]> {
  const params = new URLSearchParams({ query });
  const response = await authFetch(`/rutaInsumos/buscarTiendasPdv?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al buscar tiendas");
  }
  const data = await response.json();
  return data.tiendas;
}

export async function getTiendasDeRuta(rutaId: string): Promise<TiendaRutaInsumos[]> {
  const response = await authFetch(`/rutaInsumos/getTiendasDeRuta/${rutaId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener las tiendas de la ruta");
  }
  const data = await response.json();
  return data.tiendas;
}

export async function asignarTiendaRuta(payload: AsignarTiendaRutaInsumosPayload): Promise<void> {
  const response = await authFetch(`/rutaInsumos/asignarTiendaRuta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al asignar la tienda");
  }
}

export async function quitarTiendaDeRuta(idTiendaSimphony: string): Promise<void> {
  const response = await authFetch(`/rutaInsumos/quitarTiendaDeRuta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_tienda_simphony: idTiendaSimphony })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al quitar la tienda");
  }
}

export async function getCandadoActivo(): Promise<CandadoRutaInsumos | null> {
  const response = await authFetch(`/rutaInsumos/getCandadoActivo`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al consultar el candado");
  }
  const data = await response.json();
  return data.candado;
}

export async function tomarCandado(rutaId: string, fecha: string): Promise<CandadoRutaInsumos> {
  const response = await authFetch(`/rutaInsumos/tomarCandado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ruta_id: rutaId, fecha })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(data.details || data.error || "Error al tomar el candado");
    (err as any).candado = data.candado || null;
    throw err;
  }
  return data.candado;
}

export async function liberarCandado(rutaId: string, fecha: string): Promise<void> {
  const response = await authFetch(`/rutaInsumos/liberarCandado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ruta_id: rutaId, fecha })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al liberar el candado");
  }
}