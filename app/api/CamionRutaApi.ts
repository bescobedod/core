import { authFetch } from '../utils/auth-fetch';
import {
  TipoRuta,
  RutaActivaBackend,
  ProductoInventarioCamion,
  TiendaRutaEnCurso,
  BodegaCuartoFrio,
  TrasladoCuartoFrioPayload,
  TrasladoCuartoFrio,
  EntregarProductoPayload,
} from '../types/CamionRutaModel';

export async function getRutasActivas(tipo: TipoRuta, fecha?: string): Promise<RutaActivaBackend[]> {
  const params = new URLSearchParams({ tipo });
  if (fecha) params.set('fecha', fecha);

  const response = await authFetch(`/camionesRuta/getRutasActivas?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener las rutas activas");
  }
  const data = await response.json();
  return data.rutas;
}

export async function getInventarioCamion(
  tipo: TipoRuta,
  rutaId: string,
  whsCode: string,
  fecha?: string
): Promise<ProductoInventarioCamion[]> {
  const params = new URLSearchParams({ tipo, ruta_id: rutaId, whs_code: whsCode });
  if (fecha) params.set('fecha', fecha);

  const response = await authFetch(`/camionesRuta/getInventarioCamion?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener el inventario del camión");
  }
  const data = await response.json();
  return data.inventario;
}

export async function getDetalleTiendas(
  tipo: TipoRuta,
  rutaId: string,
  fecha?: string
): Promise<TiendaRutaEnCurso[]> {
  const params = new URLSearchParams({ tipo, ruta_id: rutaId });
  if (fecha) params.set('fecha', fecha);

  const response = await authFetch(`/camionesRuta/getDetalleTiendas?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener el detalle por tienda");
  }
  const data = await response.json();
  return data.tiendas;
}

export async function getBodegasCuartoFrio(tipo: TipoRuta): Promise<BodegaCuartoFrio[]> {
  const params = new URLSearchParams({ tipo });

  const response = await authFetch(`/camionesRuta/getBodegasCuartoFrio?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener las bodegas de cuarto frío");
  }
  const data = await response.json();
  return data.bodegas;
}

export async function trasladarACuartoFrio(
  payload: TrasladoCuartoFrioPayload
): Promise<{ traslado_id?: string; sap_docentry: number; sap_docnum: number; warning?: string }> {
  const response = await authFetch(`/camionesRuta/trasladarACuartoFrio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || "Error al trasladar a cuarto frío");
  }
  return data;
}

export async function getTrasladosCuartoFrio(tipo: TipoRuta, fecha?: string): Promise<TrasladoCuartoFrio[]> {
  const params = new URLSearchParams({ tipo });
  if (fecha) params.set('fecha', fecha);

  const response = await authFetch(`/camionesRuta/getTrasladosCuartoFrio?${params.toString()}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.details || errorData.error || "Error al obtener el historial de traslados");
  }
  const data = await response.json();
  return data.traslados;
}

export async function entregarProducto(
  payload: EntregarProductoPayload
): Promise<{ sap_docentry: number; sap_docnum: number; notificados?: string[]; warning?: string }> {
  const response = await authFetch(`/camionesRuta/entregarProducto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.details || data.error || "Error al entregar el producto");
  }
  return data;
}
