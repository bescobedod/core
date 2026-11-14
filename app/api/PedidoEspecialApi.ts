import { authFetch } from "../utils/auth-fetch";
import {
  AsignacionEspecial,
  ClienteAvicola,
  CrearClienteAvicolaPayload,
  CrearPedidoArtesanoPayload,
  EditarPedidoArtesanoPayload,
  FiltrosPedidosArtesano,
  FiltrosPedidosEspeciales,
  ItemStockEspecial,
  PaginaPedidos,
  PedidoArtesano,
  PedidoEspecial,
  PilotoArtesano,
  ProductoArtesano,
  StockArtesano,
  UsuarioArtesano,
} from "../types/PedidoEspecialModel";

async function leerRespuesta(response: Response, mensajePorDefecto: string) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.details || data.error || mensajePorDefecto);
  }

  return data;
}

async function enviar(ruta: string, cuerpo: object, mensajePorDefecto: string) {
  const response = await authFetch(ruta, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(cuerpo),
  });

  return leerRespuesta(response, mensajePorDefecto);
}

// ---------------------------------------------------------------------------
// Pedidos especiales
// ---------------------------------------------------------------------------

async function accionPedidoEspecial(accion: string, cuerpo: object, mensajePorDefecto: string): Promise<PedidoEspecial> {
  return (await enviar(`/pedidoEspecial/${accion}`, cuerpo, mensajePorDefecto)).pedido;
}

// El backend decide qué pedidos puede ver el usuario (una asistente de
// división solo ve los de las tiendas de su división).
export async function getPedidosEspeciales(filtros: FiltrosPedidosEspeciales = {}): Promise<PaginaPedidos<PedidoEspecial>> {
  const params = new URLSearchParams();
  if (filtros.estados && filtros.estados.length > 0) params.set("estados", filtros.estados.join(","));
  if (filtros.fechaDesde) params.set("fecha_desde", filtros.fechaDesde);
  if (filtros.fechaHasta) params.set("fecha_hasta", filtros.fechaHasta);
  if (filtros.page) params.set("page", String(filtros.page));

  const response = await authFetch(`/pedidoEspecial/getPedidos?${params.toString()}`);
  const data = await leerRespuesta(response, "Error al obtener los pedidos especiales");

  return { pedidos: data.pedidos, paginacion: data.paginacion };
}

// items: cantidades que la asistente de avícola dejó al autorizar.
export function autorizarPedidoEspecial(
  id: string,
  items: { item_id: string; cantidad_solicitada: number }[]
): Promise<PedidoEspecial> {
  return accionPedidoEspecial("autorizar", { id, items }, "Error al autorizar el pedido");
}

export function rechazarPedidoEspecial(id: string, motivo: string): Promise<PedidoEspecial> {
  return accionPedidoEspecial("rechazar", { id, motivo }, "Error al rechazar el pedido");
}

// Stock del muelle Central para los artículos del pedido.
export async function getStockPedidoEspecial(id: string): Promise<ItemStockEspecial[]> {
  const params = new URLSearchParams({ id });
  const response = await authFetch(`/pedidoEspecial/getStock?${params.toString()}`);

  return (await leerRespuesta(response, "Error al calcular el stock")).stock;
}

// Guarda lo asignado a cada línea; el pedido pasa a EN_PREPARACION.
export function guardarAsignacionPedidoEspecial(id: string, asignaciones: AsignacionEspecial[]): Promise<PedidoEspecial> {
  return accionPedidoEspecial("guardarAsignacion", { id, asignaciones }, "Error al guardar la asignación");
}

export function marcarPedidoEspecialListo(id: string): Promise<PedidoEspecial> {
  return accionPedidoEspecial("marcarListo", { id }, "Error al marcar el pedido como listo");
}

// ---------------------------------------------------------------------------
// Pollo artesano
// ---------------------------------------------------------------------------

export async function getProductosArtesano(): Promise<ProductoArtesano[]> {
  const response = await authFetch("/pedidoArtesano/getProductos");

  return (await leerRespuesta(response, "Error al obtener los productos")).productos;
}

export async function getUsuariosArtesano(): Promise<UsuarioArtesano[]> {
  const response = await authFetch("/pedidoArtesano/getUsuarios");

  return (await leerRespuesta(response, "Error al obtener los usuarios")).usuarios;
}

export async function getPedidosArtesano(filtros: FiltrosPedidosArtesano = {}): Promise<PaginaPedidos<PedidoArtesano>> {
  const params = new URLSearchParams();
  if (filtros.id_usuario) params.set("id_usuario", filtros.id_usuario);
  if (filtros.estados && filtros.estados.length > 0) params.set("estado", filtros.estados.join(","));
  if (filtros.numero) params.set("numero", filtros.numero);
  if (filtros.cliente) params.set("cliente", filtros.cliente);
  if (filtros.fechaDesde) params.set("fecha_desde", filtros.fechaDesde);
  if (filtros.fechaHasta) params.set("fecha_hasta", filtros.fechaHasta);
  if (filtros.page) params.set("page", String(filtros.page));

  const response = await authFetch(`/pedidoArtesano/getPedidos?${params.toString()}`);
  const data = await leerRespuesta(response, "Error al obtener los pedidos de pollo artesano");

  return { pedidos: data.pedidos, paginacion: data.paginacion };
}

export async function buscarClientesAvicola(texto: string): Promise<ClienteAvicola[]> {
  const params = new URLSearchParams({ texto });
  const response = await authFetch(`/pedidoArtesano/buscarClientes?${params.toString()}`);

  return (await leerRespuesta(response, "Error al buscar los clientes")).clientes;
}

export async function crearClienteAvicola(payload: CrearClienteAvicolaPayload): Promise<ClienteAvicola> {
  return (await enviar("/pedidoArtesano/crearCliente", payload, "Error al crear el cliente")).cliente;
}

export async function crearPedidoArtesano(payload: CrearPedidoArtesanoPayload): Promise<PedidoArtesano> {
  return (await enviar("/pedidoArtesano/crearPedido", payload, "Error al crear el pedido")).pedido;
}

// Registra el pago de un pedido que estaba pendiente.
export async function completarPagoArtesano(
  id: string,
  condicionPago: "DEPOSITO" | "PLANILLA",
  numeroBoleta: string | null
): Promise<PedidoArtesano> {
  return (
    await enviar(
      "/pedidoArtesano/completarPago",
      { id, condicion_pago: condicionPago, numero_boleta: numeroBoleta },
      "Error al completar el pago del pedido"
    )
  ).pedido;
}

export async function editarPedidoArtesano(payload: EditarPedidoArtesanoPayload): Promise<PedidoArtesano> {
  return (await enviar("/pedidoArtesano/editarPedido", payload, "Error al modificar el pedido")).pedido;
}

// Rastro: pedidos CREADO (por cargar) o EN_TRANSITO, los de entrega más próxima primero.
export async function getPedidosPendientesArtesano(
  fechaDesde?: string,
  fechaHasta?: string,
  estado: "CREADO" | "EN_TRANSITO" = "CREADO"
): Promise<PedidoArtesano[]> {
  const params = new URLSearchParams({ estado });
  if (fechaDesde) params.set("fecha_desde", fechaDesde);
  if (fechaHasta) params.set("fecha_hasta", fechaHasta);

  const response = await authFetch(`/pedidoArtesano/getPendientes?${params.toString()}`);

  return (await leerRespuesta(response, "Error al obtener los pedidos")).pedidos;
}

// Stock de la bodega del artesano; lanza error si SAP no responde.
export async function getStockArtesano(): Promise<StockArtesano[]> {
  const response = await authFetch("/pedidoArtesano/getStock");

  return (await leerRespuesta(response, "Error al consultar el stock")).stock;
}

export async function rechazarPedidoArtesano(id: string, motivo: string): Promise<PedidoArtesano> {
  return (await enviar("/pedidoArtesano/rechazar", { id, motivo }, "Error al rechazar el pedido")).pedido;
}

// La asistente cancela un pedido que sigue CREADO.
export async function cancelarPedidoArtesano(id: string, motivo: string): Promise<PedidoArtesano> {
  return (await enviar("/pedidoArtesano/cancelar", { id, motivo }, "Error al cancelar el pedido")).pedido;
}

// Resultado de cargar o entregar: pedidos procesados y errores del resto.
export interface ResultadoLoteArtesano {
  pedidos: PedidoArtesano[];
  errores: string[];
}

function resultadoLote(data: { pedidos: PedidoArtesano[]; errores?: { mensaje: string }[] }): ResultadoLoteArtesano {
  return { pedidos: data.pedidos, errores: (data.errores ?? []).map((e) => e.mensaje) };
}

export async function getPilotosArtesano(): Promise<PilotoArtesano[]> {
  const response = await authFetch("/pedidoArtesano/getPilotos");

  return (await leerRespuesta(response, "Error al obtener los pilotos")).pilotos;
}

// Carga los pedidos CREADOS (incluye la autorización). Devuelve los cargados y los errores por ruta.
export async function cargarPedidosArtesano(
  ids: string[],
  codigoPiloto: number,
  ajustes: Record<string, { codigo_producto: string; cantidad: number }[]> = {},
  versiones: Record<string, string> = {}
): Promise<ResultadoLoteArtesano> {
  return resultadoLote(
    await enviar("/pedidoArtesano/cargar", { ids, codigo_piloto: codigoPiloto, ajustes, versiones }, "Error al cargar los pedidos")
  );
}

export async function cambiarPilotoArtesano(ids: string[], codigoPiloto: number): Promise<PedidoArtesano[]> {
  return (await enviar("/pedidoArtesano/cambiarPiloto", { ids, codigo_piloto: codigoPiloto }, "Error al cambiar el piloto")).pedidos;
}

// Descarga el PDF del envío y devuelve una URL local para mostrarlo (hay que
// liberarla con URL.revokeObjectURL cuando ya no se use).
// conCuadro: la versión de Pollo Artesano, que incluye el cuadro de cobro.
export async function getPdfEnviosArtesano(ids: string[], conCuadro = false): Promise<string> {
  const params = new URLSearchParams({ ids: ids.join(",") });
  if (conCuadro) params.set("cuadro", "1");
  const response = await authFetch(`/pedidoArtesano/pdf?${params.toString()}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.details || data.error || "Error al generar el PDF del envío");
  }

  return window.URL.createObjectURL(await response.blob());
}

// Entrega los pedidos cargados (una entrega en SAP por pedido). Devuelve los entregados y los errores.
export async function entregarPedidosArtesano(ids: string[]): Promise<ResultadoLoteArtesano> {
  return resultadoLote(await enviar("/pedidoArtesano/entregar", { ids }, "Error al entregar los pedidos"));
}

// Foto (o PDF) de la hoja firmada; si ya había una, la reemplaza.
export async function subirEvidenciaArtesano(id: string, archivo: File): Promise<PedidoArtesano> {
  const formData = new FormData();
  formData.append("id", id);
  formData.append("foto", archivo);

  const response = await authFetch("/pedidoArtesano/subirEvidencia", { method: "POST", body: formData });

  return (await leerRespuesta(response, "Error al adjuntar la evidencia de entrega")).pedido;
}

// URL firmada (válida 1 hora) para ver la evidencia.
export async function getUrlEvidenciaArtesano(id: string): Promise<string> {
  const params = new URLSearchParams({ id });
  const response = await authFetch(`/pedidoArtesano/getEvidencia?${params.toString()}`);

  return (await leerRespuesta(response, "Error al obtener la evidencia de entrega")).url;
}

function paramsBusqueda(filtros: FiltrosPedidosArtesano): URLSearchParams {
  const params = new URLSearchParams();
  if (filtros.id_usuario) params.set("id_usuario", filtros.id_usuario);
  if (filtros.estados && filtros.estados.length > 0) params.set("estado", filtros.estados.join(","));
  if (filtros.numero) params.set("numero", filtros.numero);
  if (filtros.cliente) params.set("cliente", filtros.cliente);
  if (filtros.fechaDesde) params.set("fecha_desde", filtros.fechaDesde);
  if (filtros.fechaHasta) params.set("fecha_hasta", filtros.fechaHasta);

  return params;
}

async function descargarExcelArtesano(ruta: string, prefijoArchivo: string, filtros: FiltrosPedidosArtesano, errorPorDefecto: string): Promise<void> {
  const response = await authFetch(`${ruta}?${paramsBusqueda(filtros).toString()}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.details || data.error || errorPorDefecto);
  }

  const url = window.URL.createObjectURL(await response.blob());
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `${prefijoArchivo}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
}

// Excel de los pedidos que cumplen los filtros de la búsqueda (una fila por producto).
export async function exportarPedidosArtesano(filtros: FiltrosPedidosArtesano = {}): Promise<void> {
  await descargarExcelArtesano("/pedidoArtesano/exportarPedidos", "pollo_artesano", filtros, "Error al exportar los pedidos");
}

// Excel con una hoja por cliente, con el formato del control de contabilidad.
export async function exportarPedidosArtesanoPorCliente(filtros: FiltrosPedidosArtesano = {}): Promise<void> {
  await descargarExcelArtesano("/pedidoArtesano/exportarPorCliente", "pollo_artesano_clientes", filtros, "Error al exportar el reporte por cliente");
}
