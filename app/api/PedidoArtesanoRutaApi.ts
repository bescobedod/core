import { authFetch } from "../utils/auth-fetch";
import { PedidoPosRuta, PedidoPosTienda } from "../types/PedidoPosModel";
import { ComparativoStockPolloResponse } from "../types/StockModel";

// Misma forma que los pedidos de tienda; el cliente va donde iría la tienda.
export interface ClienteRutaArtesano extends PedidoPosTienda {
  serie: string;
  direccion_entrega: string | null;
  condicion_pago: string;
}

export interface RutaArtesano extends Omit<PedidoPosRuta, "tiendas"> {
  tiendas: ClienteRutaArtesano[];
}

export interface PedidosRutaArtesanoResponse {
  success: boolean;
  fecha_requerida: string;
  rutas: RutaArtesano[];
}

async function leer<T>(response: Response, mensaje: string): Promise<T> {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.details || data.error || mensaje);

  return data;
}

export async function getPedidosRutaArtesano(rutaId: string, fecha: string): Promise<PedidosRutaArtesanoResponse> {
  const params = new URLSearchParams({ ruta_id: rutaId, fecha_requerida: fecha });

  return leer(await authFetch(`/pedidoArtesano/getPedidosRuta?${params.toString()}`), "Error al obtener los pedidos de la ruta");
}

export async function getComparativoRutaArtesano(fecha: string, rutaId: string): Promise<ComparativoStockPolloResponse> {
  const params = new URLSearchParams({ ruta_id: rutaId, fecha });

  return leer(await authFetch(`/pedidoArtesano/getComparativoRuta?${params.toString()}`), "Error al obtener el comparativo de stock");
}

export interface AsignacionRutaArtesano {
  detalle_id: string;
  cantidad_asignada: number;
  ajustado_manual: boolean;
}

export interface GuardarAsignacionRutaArtesanoResponse {
  success: boolean;
  pedidos_validados: number;
  pedidos_sin_asignar: number;
  lineas_actualizadas: number;
}

export async function guardarAsignacionRutaArtesano(
  rutaId: string,
  fecha: string,
  asignaciones: AsignacionRutaArtesano[]
): Promise<GuardarAsignacionRutaArtesanoResponse> {
  return leer(
    await authFetch("/pedidoArtesano/guardarAsignacionRuta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruta_id: rutaId, fecha, asignaciones }),
    }),
    "Error al guardar la asignación"
  );
}

export interface EnviarRutaArtesanoResponse {
  success: boolean;
  sap_docnum: number;
  pedidos_cargados: number;
  pedidos_sin_validar: number;
}

export async function enviarRutaArtesano(rutaId: string, fecha: string): Promise<EnviarRutaArtesanoResponse> {
  return leer(
    await authFetch("/pedidoArtesano/enviarRuta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ruta_id: rutaId, fecha }),
    }),
    "Error al enviar la ruta"
  );
}

export interface ResumenRutaArtesano {
  ruta_id: string;
  total: number;
  por_validar: number;
  validados: number;
}

export async function getResumenRutasArtesano(fecha: string): Promise<ResumenRutaArtesano[]> {
  const params = new URLSearchParams({ fecha });
  const data = await leer<{ rutas: ResumenRutaArtesano[] }>(await authFetch(`/pedidoArtesano/getResumenRutas?${params.toString()}`), "Error al obtener el resumen de rutas");

  return data.rutas;
}

// ---- Reportes: detalle de pedidos y pedidos en tránsito (PDF o Excel) ----

export type FormatoReporteArtesano = "pdf" | "excel";

export interface OpcionesReporteArtesano {
  // Si es posterior a la fecha inicial, el reporte es por rango.
  fechaHasta?: string;
  // Vacío u omitido = todos.
  estados?: string[];
  rutas?: string[];
  productos?: string[];
}

function paramsReporteDetalle(fecha: string, opciones: OpcionesReporteArtesano, formato: FormatoReporteArtesano): URLSearchParams {
  const params = new URLSearchParams({ fecha, formato });

  if (opciones.fechaHasta) params.set("fecha_hasta", opciones.fechaHasta);
  if (opciones.estados && opciones.estados.length > 0) params.set("estados", opciones.estados.join(","));
  if (opciones.rutas && opciones.rutas.length > 0) params.set("rutas", opciones.rutas.join(","));
  if (opciones.productos && opciones.productos.length > 0) params.set("productos", opciones.productos.join(","));

  return params;
}

async function pedirReporte(ruta: string, params: URLSearchParams, mensaje: string): Promise<Blob> {
  const response = await authFetch(`${ruta}?${params.toString()}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.details || data.error || mensaje);
  }

  return response.blob();
}

function guardarArchivo(blob: Blob, nombre: string) {
  const url = window.URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

// Devuelve la URL del PDF para mostrarlo en pantalla.
export async function previsualizarReporteDetalleArtesano(fecha: string, opciones: OpcionesReporteArtesano = {}): Promise<string> {
  const blob = await pedirReporte("/pedidoArtesano/generarReporteDetalle", paramsReporteDetalle(fecha, opciones, "pdf"), "Error al generar el reporte");

  return window.URL.createObjectURL(blob);
}

export async function descargarExcelReporteDetalleArtesano(fecha: string, opciones: OpcionesReporteArtesano = {}): Promise<void> {
  const blob = await pedirReporte("/pedidoArtesano/generarReporteDetalle", paramsReporteDetalle(fecha, opciones, "excel"), "Error al generar el Excel");
  const sufijo = opciones.fechaHasta && opciones.fechaHasta > fecha ? `_a_${opciones.fechaHasta}` : "";

  guardarArchivo(blob, `pollo_artesano_detalle_${fecha}${sufijo}.xlsx`);
}

export async function previsualizarReporteEnTransitoArtesano(): Promise<string> {
  const blob = await pedirReporte("/pedidoArtesano/generarReporteEnTransito", new URLSearchParams({ formato: "pdf" }), "Error al generar el reporte de pedidos en tránsito");

  return window.URL.createObjectURL(blob);
}

export async function descargarExcelReporteEnTransitoArtesano(): Promise<void> {
  const blob = await pedirReporte("/pedidoArtesano/generarReporteEnTransito", new URLSearchParams({ formato: "excel" }), "Error al generar el Excel");

  guardarArchivo(blob, "pollo_artesano_en_transito.xlsx");
}
