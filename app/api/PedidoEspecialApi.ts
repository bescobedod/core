import { authFetch } from "../utils/auth-fetch";
import {
  AsignacionEspecial,
  AutorizarPedidoArtesanoPayload,
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

export async function editarPedidoArtesano(payload: EditarPedidoArtesanoPayload): Promise<PedidoArtesano> {
  return (await enviar("/pedidoArtesano/editarPedido", payload, "Error al modificar el pedido")).pedido;
}

// Rastro: pedidos CREADO por autorizar, los de entrega más próxima primero.
export async function getPedidosPendientesArtesano(fechaDesde?: string, fechaHasta?: string): Promise<PedidoArtesano[]> {
  const params = new URLSearchParams();
  if (fechaDesde) params.set("fecha_desde", fechaDesde);
  if (fechaHasta) params.set("fecha_hasta", fechaHasta);

  const response = await authFetch(`/pedidoArtesano/getPendientes?${params.toString()}`);

  return (await leerRespuesta(response, "Error al obtener los pedidos por autorizar")).pedidos;
}

// Stock de la bodega del artesano; lanza error si SAP no responde.
export async function getStockArtesano(): Promise<StockArtesano[]> {
  const response = await authFetch("/pedidoArtesano/getStock");

  return (await leerRespuesta(response, "Error al consultar el stock")).stock;
}

export async function autorizarPedidoArtesano(payload: AutorizarPedidoArtesanoPayload): Promise<PedidoArtesano> {
  return (await enviar("/pedidoArtesano/autorizar", payload, "Error al autorizar el pedido")).pedido;
}

export async function rechazarPedidoArtesano(id: string, motivo: string): Promise<PedidoArtesano> {
  return (await enviar("/pedidoArtesano/rechazar", { id, motivo }, "Error al rechazar el pedido")).pedido;
}
