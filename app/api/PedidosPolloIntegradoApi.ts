import { PedidoPosRuta, PedidoPosTienda } from "../types/PedidoPosModel";
import { ComparativoStockItem } from "../types/StockModel";
import { getPedidosPos, getComparativoStockPollo, enviarTransferenciaPollo } from "./PedidoPosApi";
import { guardarAsignacionCantidades } from "./AsignacionApi";
import { asignarTransporte, trasladarPiloto } from "./TrasporteApi";
import {
  ClienteRutaArtesano,
  enviarRutaArtesano,
  getComparativoRutaArtesano,
  getPedidosRutaArtesano,
  guardarAsignacionRutaArtesano,
  sincronizarPilotoRutaArtesano,
} from "./PedidoArtesanoRutaApi";

// Pedidos de Pollo con clientes externos (pollo artesano) junto a las tiendas.
// Las tiendas siguen usando sus mismos servicios; los clientes usan los suyos, y aquí se combinan. Si la ruta no tiene
// pedidos de clientes, todo se comporta exactamente como antes (solo tiendas).

export const esCliente = (t: PedidoPosTienda) => t.origen === "CLIENTE";

// Un cliente se puede validar y cargar mientras esté creado o validado (no en tránsito ni entregado).
export const clientePendiente = (t: PedidoPosTienda) => esCliente(t) && ["CREADO", "VALIDADO"].includes(t.estado_origen || "");

// Los nombres de SAP vienen en mayúsculas; se muestran como los de las tiendas: primera letra de cada palabra en mayúscula.
function formatoNombre(texto: string | null | undefined): string {
  return (texto ?? "").toLowerCase().replace(/(^|[\s(/-])(\p{L})/gu, (_, sep: string, letra: string) => sep + letra.toUpperCase());
}

function clienteComoTienda(c: ClienteRutaArtesano): PedidoPosTienda {
  // Con el estado de las tiendas: creado = recibido; validado sin stock se muestra aparte.
  const estado = c.sin_stock ? "SIN_STOCK" : c.estado === "CREADO" ? "RECIBIDO" : c.estado;

  return {
    ...c,
    origen: "CLIENTE",
    estado_origen: c.estado,
    estado,
    nombre_tienda: c.cliente_nombre,
    nombre_tienda_referencia: c.nombre_tienda_referencia ?? null,
    items: c.items.map((i) => ({ ...i, descripcion_producto: formatoNombre(i.descripcion_producto) })),
  };
}

// Estado de la ruta con tiendas y clientes. Los clientes sin stock no cuentan: se rechazan o se reprograman aparte.
// Si parte ya salió y parte sigue validada (el envío se cortó a la mitad), la ruta sigue como validada para poder terminarlo.
function estadoGeneral(tiendas: PedidoPosTienda[]): string {
  const estados = [...new Set(tiendas.filter((t) => t.estado !== "SIN_STOCK").map((t) => t.estado))];

  if (estados.length === 0) return "SIN_STOCK";
  if (estados.length === 1) return estados[0];
  if (estados.includes("VALIDADO") && estados.every((e) => e === "VALIDADO" || e === "EN_TRANSITO")) return "VALIDADO";

  return "MIXTO";
}

export interface RutaIntegrada {
  ruta: PedidoPosRuta | null;
  // Si los pedidos de clientes no se pudieron cargar, las tiendas se muestran igual y esto avisa del problema.
  avisoClientes: string | null;
}

export async function getPedidosPolloIntegrado(rutaId: string, fecha: string): Promise<RutaIntegrada> {
  const [tiendas, clientes] = await Promise.all([
    getPedidosPos("POLLO", { ruta_id: rutaId, fecha_requerida: fecha }),
    getPedidosRutaArtesano(rutaId, fecha).then(
      (r) => ({ data: r, error: null as string | null }),
      (e) => ({ data: null, error: e instanceof Error ? e.message : "Error al obtener los pedidos de clientes" })
    ),
  ]);

  const rutaTienda = tiendas.rutas[0] || null;

  if (clientes.error) {
    return { ruta: rutaTienda, avisoClientes: `No se pudieron cargar los pedidos de clientes externos: ${clientes.error}` };
  }

  const rutaCliente = clientes.data?.rutas[0] || null;

  // Sin clientes: exactamente lo de siempre.
  if (!rutaCliente) return { ruta: rutaTienda, avisoClientes: null };

  const delosClientes = rutaCliente.tiendas.map(clienteComoTienda);
  const delasTiendas = (rutaTienda?.tiendas || []).map((t) => ({ ...t, origen: "TIENDA" as const }));
  const todas = [...delasTiendas, ...delosClientes];

  const base: PedidoPosRuta = rutaTienda ?? {
    ruta_id: rutaCliente.ruta_id,
    nombre_ruta: rutaCliente.nombre_ruta,
    camion_id: rutaCliente.camion_id,
    camion_placa: rutaCliente.camion_placa,
    piloto_id: rutaCliente.piloto_id,
    piloto_nombre: rutaCliente.piloto_nombre,
    estado_general: "",
    sap_docnum: null,
    sap_docentry: null,
    tiendas: [],
  };

  return {
    ruta: {
      ...base,
      camion_id: base.camion_id ?? rutaCliente.camion_id,
      camion_placa: base.camion_placa ?? rutaCliente.camion_placa,
      piloto_id: base.piloto_id ?? rutaCliente.piloto_id,
      piloto_nombre: base.piloto_nombre ?? rutaCliente.piloto_nombre,
      sap_docnum: base.sap_docnum ?? rutaCliente.sap_docnum,
      sap_docentry: base.sap_docentry ?? rutaCliente.sap_docentry,
      estado_general: estadoGeneral(todas),
      tiendas: todas,
    },
    avisoClientes: null,
  };
}

// Stock contra lo pedido por tiendas y clientes juntos, todo en unidades de SAP (bolsas).
export async function getComparativoIntegrado(fecha: string, rutaId: string, ruta: PedidoPosRuta | null): Promise<ComparativoStockItem[]> {
  const hayTiendas = !ruta || ruta.tiendas.some((t) => !esCliente(t));
  const hayClientes = !!ruta && ruta.tiendas.some(clientePendiente);

  // Sin clientes por validar: el comparativo de siempre.
  if (!hayClientes) return (await getComparativoStockPollo(fecha, rutaId)).comparativo;

  const [tiendas, clientes] = await Promise.all([
    hayTiendas ? getComparativoStockPollo(fecha, rutaId).then((r) => r.comparativo) : Promise.resolve([] as ComparativoStockItem[]),
    getComparativoRutaArtesano(fecha, rutaId).then((r) => r.comparativo),
  ]);

  const porCodigo = new Map<string, ComparativoStockItem>(tiendas.filter((t) => t.codigo_producto).map((t) => [t.codigo_producto as string, t]));
  const resultado: ComparativoStockItem[] = tiendas.map((t) => ({ ...t }));

  for (const c of clientes) {
    const codigo = c.codigo_producto as string;
    const factor = c.unidades_sap || 1;
    const pedido = c.cantidad_solicitada_total * factor;
    const existente = porCodigo.get(codigo);

    if (existente) {
      const item = resultado.find((r) => r.codigo_producto === codigo)!;

      item.cantidad_solicitada_total += pedido;
      item.diferencia = item.stock_disponible - item.cantidad_solicitada_total;
    } else {
      const stock = c.stock_bolsas ?? c.stock_disponible;

      resultado.push({ ...c, descripcion_producto: formatoNombre(c.descripcion_producto), cantidad_solicitada_total: pedido, stock_disponible: stock, diferencia: stock - pedido });
    }
  }

  return resultado;
}

export interface AsignacionIntegrada {
  detalle_id: string;
  cantidad_asignada: number;
  ajustado_manual: boolean;
}

// Guarda lo asignado: las tiendas en su servicio y los clientes en el suyo (los clientes pasan a validados).
export async function guardarAsignacionIntegrada(rutaId: string, fecha: string, ruta: PedidoPosRuta, asignaciones: AsignacionIntegrada[]): Promise<void> {
  const idsClientes = new Set(ruta.tiendas.filter(esCliente).flatMap((t) => t.items.map((i) => i.id)));
  const deTiendas = asignaciones.filter((a) => !idsClientes.has(a.detalle_id));
  const deClientes = asignaciones.filter((a) => idsClientes.has(a.detalle_id));

  if (deTiendas.length > 0) await guardarAsignacionCantidades({ fecha, asignaciones: deTiendas });

  if (deClientes.length > 0) {
    try {
      await guardarAsignacionRutaArtesano(rutaId, fecha, deClientes);
    } catch (e) {
      const mensaje = e instanceof Error ? e.message : "Error al guardar la asignación de los clientes";

      throw new Error(deTiendas.length > 0 ? `Se guardó la asignación de las tiendas, pero la de los clientes no: ${mensaje}` : mensaje);
    }
  }
}

// Envía a SAP en un solo documento. Con clientes validados, su servicio envía en la misma transferencia las tiendas pendientes;
// sin clientes, el envío de tiendas de siempre.
export async function enviarPolloIntegrado(rutaId: string, fecha: string, ruta: PedidoPosRuta | null): Promise<number> {
  const clientesValidados = !!ruta && ruta.tiendas.some((t) => esCliente(t) && t.estado === "VALIDADO");

  if (clientesValidados) return (await enviarRutaArtesano(rutaId, fecha)).sap_docnum;

  return (await enviarTransferenciaPollo(rutaId, fecha)).sap_docnum;
}

// "Trasladar Envío": cambia piloto y camión de la ruta en tránsito y deja el piloto nuevo también en los pedidos de clientes.
export async function trasladarPilotoIntegrado(
  payload: { ruta_id: string; fecha: string; camion_id: string; piloto_id: number },
  ruta: PedidoPosRuta | null
): Promise<void> {
  const hayTiendas = !ruta || ruta.tiendas.some((t) => !esCliente(t));
  const hayClientes = !!ruta && ruta.tiendas.some(esCliente);

  // Se revisa primero que ningún cliente haya confirmado su entrega, para no dejar el cambio a medias.
  if (hayClientes) await sincronizarPilotoRutaArtesano(payload.ruta_id, payload.fecha, true);

  if (hayTiendas) await trasladarPiloto(payload);
  else await asignarTransporte(payload);

  if (hayClientes) await sincronizarPilotoRutaArtesano(payload.ruta_id, payload.fecha);
}
