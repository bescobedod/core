import {
  RutaPollo,
  TiendaPdvBusqueda,
  TiendaRutaPollo,
  CrearRutaPolloPayload,
  AsignarTiendaRutaPayload,
  MuelleUsuario,
  CandadoRutaPollo,
} from '../types/RutaPolloModel';
import { authFetch } from '../utils/auth-fetch';

export async function getRutasPollo(whsCodeOrigen?: string): Promise<RutaPollo[]> {
  const params = whsCodeOrigen ? `?whs_code_origen=${encodeURIComponent(whsCodeOrigen)}` : '';
  const response = await authFetch(`/rutaPollo/getRutas${params}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener las rutas de pollo");
  }
  const data = await response.json();
  return data.rutas;
}

export async function crearRutaPollo(payload: CrearRutaPolloPayload): Promise<RutaPollo> {
  const response = await authFetch(`/rutaPollo/crearRuta`, {
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

export async function actualizarRutaPollo(rutaId: string, nombreRuta: string, whsCodeDestino: string): Promise<RutaPollo> {
  const response = await authFetch(`/rutaPollo/actualizarRuta`, {
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
  const response = await authFetch(`/rutaPollo/buscarTiendasPdv?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al buscar tiendas");
  }
  const data = await response.json();
  return data.tiendas;
}

export async function getTiendasDeRuta(rutaId: string): Promise<TiendaRutaPollo[]> {
  const response = await authFetch(`/rutaPollo/getTiendasDeRuta/${rutaId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener las tiendas de la ruta");
  }
  const data = await response.json();
  return data.tiendas;
}

export async function asignarTiendaRuta(payload: AsignarTiendaRutaPayload): Promise<void> {
  const response = await authFetch(`/rutaPollo/asignarTiendaRuta`, {
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
  const response = await authFetch(`/rutaPollo/quitarTiendaDeRuta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_tienda_simphony: idTiendaSimphony })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al quitar la tienda");
  }
}

export async function getMuelleUsuario(): Promise<MuelleUsuario> {
  const response = await authFetch(`/rutaPollo/getMuelleUsuario`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener el muelle del usuario");
  }
  return response.json();
}

export async function getCandadoActivo(whsCodeOrigen: string): Promise<CandadoRutaPollo | null> {
  const params = new URLSearchParams({ whs_code_origen: whsCodeOrigen });
  const response = await authFetch(`/rutaPollo/getCandadoActivo?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al consultar el candado");
  }
  const data = await response.json();
  return data.candado;
}

export async function tomarCandado(rutaId: string, fecha: string): Promise<CandadoRutaPollo> {
  const response = await authFetch(`/rutaPollo/tomarCandado`, {
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
  const response = await authFetch(`/rutaPollo/liberarCandado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ruta_id: rutaId, fecha })
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al liberar el candado");
  }
}