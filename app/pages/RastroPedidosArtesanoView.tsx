"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eraser,
  Inbox,
  Loader2,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Truck,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { getAllMenus } from "../api/MenuApi";
import {
  autorizarPedidoArtesano,
  getPedidosPendientesArtesano,
  getStockArtesano,
  rechazarPedidoArtesano,
} from "../api/PedidoEspecialApi";
import { PedidoArtesano, StockArtesano } from "../types/PedidoEspecialModel";
import { BannerMensaje, ModalBase, formatearFechaCorta } from "./PedidoEspecialComun";
import { EtiquetaPago, HistorialPedido } from "./PedidosArtesanoView";

const MENU_RASTRO = "AvicolaPedidosArtesanoView";

// El stock puede faltar (SAP caído o producto sin código en SAP): en ese caso se
// muestra "sin dato" y no se bloquea la autorización.
type EstadoStock = "ok" | "insuficiente" | "sin_dato";

function estadoStock(pedido: number, stock: StockArtesano | undefined, stockDisponible: boolean): EstadoStock {
  if (!stockDisponible || !stock || !stock.encontrado_en_sap) return "sin_dato";
  return pedido <= stock.stock_disponible ? "ok" : "insuficiente";
}

function EtiquetaStock({ estado }: { estado: EstadoStock }) {
  if (estado === "ok") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
        <CheckCircle2 size={12} /> Alcanza
      </span>
    );
  }

  if (estado === "insuficiente") {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-red-50 text-red-700 border-red-200 whitespace-nowrap">
        <AlertTriangle size={12} /> No alcanza
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border bg-gray-50 text-gray-500 border-gray-200 whitespace-nowrap">
      Sin dato
    </span>
  );
}

function sumar(pedidos: PedidoArtesano[]): Map<string, { descripcion: string; cantidad: number }> {
  const totales = new Map<string, { descripcion: string; cantidad: number }>();

  for (const pedido of pedidos) {
    for (const item of pedido.items) {
      const actual = totales.get(item.codigo_producto);

      totales.set(item.codigo_producto, {
        descripcion: item.descripcion_producto,
        cantidad: (actual?.cantidad ?? 0) + item.cantidad,
      });
    }
  }

  return totales;
}

// ---------------------------------------------------------------------------
// Modal: autorizar (total o parcial)
// ---------------------------------------------------------------------------
function AutorizarModal({
  pedido,
  stock,
  stockDisponible,
  onClose,
  onAutorizado,
}: {
  pedido: PedidoArtesano;
  stock: Map<string, StockArtesano>;
  stockDisponible: boolean;
  onClose: () => void;
  onAutorizado: (pedido: PedidoArtesano) => void;
}) {
  const [cantidades, setCantidades] = useState<Record<string, string>>(
    () => Object.fromEntries(pedido.items.map((i) => [i.codigo_producto, String(i.cantidad)]))
  );
  const [comentario, setComentario] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valores = pedido.items.map((item) => {
    const texto = cantidades[item.codigo_producto] ?? "";
    const numero = texto.trim() === "" ? NaN : Number(texto);

    return { item, numero, valida: Number.isFinite(numero) && numero >= 0 && numero <= item.cantidad };
  });

  const todoValido = valores.every((v) => v.valida);
  const hayCantidad = valores.some((v) => v.valida && v.numero > 0);
  const esParcial = valores.some((v) => v.valida && v.numero < v.item.cantidad);

  const handleAutorizar = async () => {
    setGuardando(true);
    setError(null);

    try {
      const actualizado = await autorizarPedidoArtesano({
        id: pedido.id,
        items: valores.map((v) => ({ codigo_producto: v.item.codigo_producto, cantidad_autorizada: v.numero })),
        comentario: comentario.trim() || null,
      });

      onAutorizado(actualizado);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al autorizar el pedido");
      setGuardando(false);
    }
  };

  return (
    <ModalBase
      titulo="Autorizar pedido"
      subtitulo={`${pedido.serie} ${pedido.numero_pedido} · ${pedido.cliente_nombre}`}
      ancho="max-w-lg"
      deshabilitarCierre={guardando}
      onClose={onClose}
    >
      <div className="px-6 py-4 space-y-3 overflow-y-auto">
        <p className="text-xs text-gray-500">
          Deja lo solicitado para autorizar el pedido completo, o baja la cantidad de los productos que no se puedan enviar completos.
        </p>

        <div className="space-y-2">
          {valores.map(({ item, numero, valida }) => {
            const info = stock.get(item.codigo_producto);
            const estado = estadoStock(Number.isFinite(numero) ? numero : item.cantidad, info, stockDisponible);

            return (
              <div key={item.codigo_producto} className="border border-gray-100 rounded-lg px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">{item.descripcion_producto}</p>
                    <p className="text-xs text-gray-400">
                      Solicitado: {item.cantidad}
                      {info?.encontrado_en_sap && stockDisponible ? ` · Stock: ${info.stock_disponible}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <EtiquetaStock estado={estado} />
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      max={item.cantidad}
                      step="any"
                      value={cantidades[item.codigo_producto] ?? ""}
                      onChange={(e) => setCantidades((c) => ({ ...c, [item.codigo_producto]: e.target.value }))}
                      className="w-24 text-right"
                    />
                  </div>
                </div>
                {!valida && <p className="text-xs text-red-600 mt-1">Debe estar entre 0 y {item.cantidad}.</p>}
              </div>
            );
          })}
        </div>

        {todoValido && !hayCantidad && (
          <p className="text-xs text-red-600">No hay nada que autorizar. Si no se puede enviar el pedido, recházalo con su motivo.</p>
        )}

        <div>
          <label className="block text-xs text-gray-500 mb-1">Observación {esParcial ? "(recomendada en una autorización parcial)" : "(opcional)"}</label>
          <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} maxLength={500} rows={2} placeholder="Ej. Solo hay stock de 10 unidades" />
        </div>

        {error && <BannerMensaje tipo="error" texto={error} />}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
        <Button onClick={onClose} disabled={guardando} variant="outline" size="sm">
          Cancelar
        </Button>
        <Button onClick={handleAutorizar} disabled={guardando || !todoValido || !hayCantidad} variant="success" size="sm">
          {guardando && <Loader2 size={14} className="animate-spin mr-1.5" />}
          {esParcial ? "Autorizar parcialmente" : "Autorizar"}
        </Button>
      </div>
    </ModalBase>
  );
}

// ---------------------------------------------------------------------------
// Modal: rechazar
// ---------------------------------------------------------------------------
function RechazarModal({
  pedido,
  onClose,
  onRechazado,
}: {
  pedido: PedidoArtesano;
  onClose: () => void;
  onRechazado: (pedido: PedidoArtesano) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const motivoValido = motivo.trim().length >= 5;

  const handleRechazar = async () => {
    setGuardando(true);
    setError(null);

    try {
      onRechazado(await rechazarPedidoArtesano(pedido.id, motivo.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al rechazar el pedido");
      setGuardando(false);
    }
  };

  return (
    <ModalBase
      titulo="Rechazar pedido"
      subtitulo={`${pedido.serie} ${pedido.numero_pedido} · ${pedido.cliente_nombre}`}
      deshabilitarCierre={guardando}
      onClose={onClose}
    >
      <div className="px-6 py-4 space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Motivo del rechazo *</label>
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} rows={3} placeholder="Mínimo 5 caracteres" />
        </div>
        {error && <BannerMensaje tipo="error" texto={error} />}
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
        <Button onClick={onClose} disabled={guardando} variant="outline" size="sm">
          Cancelar
        </Button>
        <Button onClick={handleRechazar} disabled={guardando || !motivoValido} variant="destructive" size="sm">
          {guardando && <Loader2 size={14} className="animate-spin mr-1.5" />}
          Rechazar pedido
        </Button>
      </div>
    </ModalBase>
  );
}

// ---------------------------------------------------------------------------
// Tarjeta de un pedido por autorizar
// ---------------------------------------------------------------------------
function TarjetaPendiente({
  pedido,
  seleccionado,
  puedeResolver,
  onSeleccionar,
  onAutorizar,
  onRechazar,
}: {
  pedido: PedidoArtesano;
  seleccionado: boolean;
  puedeResolver: boolean;
  onSeleccionar: () => void;
  onAutorizar: () => void;
  onRechazar: () => void;
}) {
  const [abierta, setAbierta] = useState(false);

  return (
    <div className={`border rounded-xl overflow-hidden ${seleccionado ? "border-[#2183AE]" : "border-gray-200"}`}>
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
        {puedeResolver && (
          <input
            type="checkbox"
            checked={seleccionado}
            onChange={onSeleccionar}
            aria-label={`Seleccionar ${pedido.numero_pedido}`}
            className="h-4 w-4 accent-[#2183AE] shrink-0"
          />
        )}
        <button onClick={() => setAbierta((v) => !v)} className="flex-1 min-w-0 flex items-center gap-3 text-left">
          <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
            <User size={14} className="text-gray-500" />
          </span>
          <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{pedido.cliente_nombre}</span>
          <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">
            {pedido.serie} {pedido.numero_pedido}
          </span>
          <span className="text-xs text-gray-500 shrink-0">{formatearFechaCorta(pedido.fecha_requerida)}</span>
          <EtiquetaPago pedido={pedido} />
          {abierta ? <ChevronUp size={15} className="text-gray-400 shrink-0" /> : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
        </button>
      </div>

      {abierta && (
        <div className="px-4 py-3 space-y-3 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Dirección de entrega</p>
              <p className="text-gray-800 flex items-start gap-1.5">
                <MapPin size={13} className="text-[#2183AE] mt-1 shrink-0" /> {pedido.direccion_entrega}
              </p>
              {pedido.telefono_contacto && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Phone size={11} /> {pedido.telefono_contacto}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">Ruta</p>
              <p className="text-gray-800">{pedido.nombre_ruta}</p>
              {pedido.nombre_tienda_referencia && (
                <p className="text-xs text-gray-400">Tienda de referencia: {pedido.nombre_tienda_referencia}</p>
              )}
              <p className="text-xs text-gray-400">Creado por {pedido.creado_por}</p>
            </div>
          </div>

          {pedido.comentario && (
            <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Comentario</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.comentario}</p>
            </div>
          )}

          <div className="space-y-1.5">
            {pedido.items.map((item) => (
              <div key={item.codigo_producto} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-start gap-3 min-w-0">
                  <Package size={14} className="text-sky-500 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800">{item.descripcion_producto}</p>
                    <p className="text-xs text-gray-400">
                      {item.codigo_producto} · {item.unidad_medida}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 tabular-nums shrink-0">{item.cantidad}</p>
              </div>
            ))}
          </div>

          <HistorialPedido historial={pedido.historial} />
        </div>
      )}

      {puedeResolver && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-white flex justify-end gap-2">
          <Button onClick={onRechazar} variant="outline" size="sm" className="text-red-600 hover:text-red-700">
            <XCircle size={14} className="mr-1.5" />
            Rechazar
          </Button>
          <Button onClick={onAutorizar} variant="success" size="sm">
            <CheckCircle2 size={14} className="mr-1.5" />
            Autorizar
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vista
// ---------------------------------------------------------------------------
export function RastroPedidosArtesanoView() {
  const [puedeResolver, setPuedeResolver] = useState(false);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [recarga, setRecarga] = useState(0);
  const [pedidos, setPedidos] = useState<PedidoArtesano[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [stock, setStock] = useState<Map<string, StockArtesano>>(new Map());
  const [stockDisponible, setStockDisponible] = useState(false);
  const [cargandoStock, setCargandoStock] = useState(true);
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const [autorizando, setAutorizando] = useState<PedidoArtesano | null>(null);
  const [rechazando, setRechazando] = useState<PedidoArtesano | null>(null);
  const [confirmandoLote, setConfirmandoLote] = useState(false);
  const [procesandoLote, setProcesandoLote] = useState(false);

  const fechasInvertidas = fechaDesde !== "" && fechaHasta !== "" && fechaDesde > fechaHasta;

  useEffect(() => {
    getAllMenus()
      .then((menus) => {
        const propio = menus.find((m) => m.nombre_menu === MENU_RASTRO);
        setPuedeResolver((propio?.nivel_permiso || "escritura") === "escritura");
      })
      .catch(() => setPuedeResolver(false));
  }, []);

  // Carga los pedidos pendientes y el stock; si SAP falla se sigue sin stock.
  useEffect(() => {
    if (fechasInvertidas) return;

    let vigente = true;

    getPedidosPendientesArtesano(fechaDesde || undefined, fechaHasta || undefined)
      .then((lista) => {
        if (!vigente) return;
        setPedidos(lista);
        setError(null);
        // Solo se conserva la selección de pedidos que siguen pendientes.
        setSeleccion((previa) => new Set([...previa].filter((id) => lista.some((p) => p.id === id))));
      })
      .catch((err) => {
        if (vigente) setError(err instanceof Error ? err.message : "Error al obtener los pedidos por autorizar");
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });

    getStockArtesano()
      .then((filas) => {
        if (!vigente) return;
        setStock(new Map(filas.map((f) => [f.codigo_producto, f])));
        setStockDisponible(true);
      })
      .catch(() => {
        if (!vigente) return;
        setStock(new Map());
        setStockDisponible(false);
      })
      .finally(() => {
        if (vigente) setCargandoStock(false);
      });

    return () => {
      vigente = false;
    };
  }, [fechaDesde, fechaHasta, fechasInvertidas, recarga]);

  const recargar = useCallback(() => {
    setCargando(true);
    setCargandoStock(true);
    setRecarga((n) => n + 1);
  }, []);

  const seleccionados = useMemo(() => pedidos.filter((p) => seleccion.has(p.id)), [pedidos, seleccion]);
  // Sin selección, el resumen es de todos los pendientes visibles.
  const baseResumen = seleccionados.length > 0 ? seleccionados : pedidos;
  const resumen = useMemo(() => [...sumar(baseResumen).entries()], [baseResumen]);

  const alternar = (id: string) =>
    setSeleccion((previa) => {
      const nueva = new Set(previa);
      if (nueva.has(id)) nueva.delete(id);
      else nueva.add(id);
      return nueva;
    });

  const alResolver = (mensaje: string) => {
    setAutorizando(null);
    setRechazando(null);
    setAviso(mensaje);
    recargar();
  };

  // Autoriza completos los pedidos seleccionados, uno a uno; si alguno falla
  // (por ejemplo, lo resolvió otra persona) se informa y se sigue con los demás.
  const autorizarSeleccionados = async () => {
    setProcesandoLote(true);

    let correctos = 0;
    const fallidos: string[] = [];

    for (const pedido of seleccionados) {
      try {
        await autorizarPedidoArtesano({
          id: pedido.id,
          items: pedido.items.map((i) => ({ codigo_producto: i.codigo_producto, cantidad_autorizada: i.cantidad })),
        });
        correctos += 1;
      } catch (err) {
        fallidos.push(`${pedido.numero_pedido}: ${err instanceof Error ? err.message : "error"}`);
      }
    }

    setProcesandoLote(false);
    setConfirmandoLote(false);
    setSeleccion(new Set());
    setError(fallidos.length > 0 ? `No se pudieron autorizar ${fallidos.length} pedido(s). ${fallidos.join(" · ")}` : null);
    setAviso(correctos > 0 ? `${correctos} pedido(s) autorizado(s) completos.` : null);
    recargar();
  };

  return (
    <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold leading-tight">Avícola · Pollo Artesano</h2>
              <p className="text-sm text-white/90">Autoriza o rechaza los pedidos según el stock disponible</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Requerido desde</label>
              <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Requerido hasta</label>
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
            </div>
            <Button
              onClick={() => {
                setFechaDesde("");
                setFechaHasta("");
              }}
              disabled={cargando || (fechaDesde === "" && fechaHasta === "")}
              size="sm"
              variant="outline"
            >
              <Eraser size={14} className="mr-1.5" />
              Limpiar
            </Button>
            <Button onClick={recargar} disabled={cargando || fechasInvertidas} size="sm" variant="submit">
              {cargando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <RefreshCw size={14} className="mr-1.5" />}
              Actualizar
            </Button>
          </div>
          {fechasInvertidas && <p className="text-xs text-red-600 mt-2">La fecha inicial no puede ser mayor que la final.</p>}
        </div>

        {aviso && <BannerMensaje tipo="ok" texto={aviso} onCerrar={() => setAviso(null)} />}
        {error && <BannerMensaje tipo="error" texto={error} onCerrar={() => setError(null)} />}

        {!cargandoStock && !stockDisponible && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 text-sm mb-4">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <p>No se pudo consultar el stock en SAP. Puedes autorizar igual, pero sin ver si alcanza.</p>
          </div>
        )}

        {pedidos.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <p className="text-sm font-medium text-gray-700">
                {seleccionados.length > 0
                  ? `Resumen de ${seleccionados.length} pedido(s) seleccionado(s)`
                  : `Resumen de los ${pedidos.length} pedido(s) por autorizar`}
              </p>
              <p className="text-xs text-gray-400">Stock de la bodega RAS-002</p>
            </div>
            <div className="divide-y divide-gray-100">
              {resumen.map(([codigo, total]) => {
                const info = stock.get(codigo);

                return (
                  <div key={codigo} className="flex items-center justify-between gap-3 py-1.5 text-sm">
                    <div className="min-w-0">
                      <p className="text-gray-800 truncate">{total.descripcion}</p>
                      <p className="text-xs text-gray-400">{codigo}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 tabular-nums">
                      <span className="text-gray-600">Pedido: {total.cantidad}</span>
                      <span className="text-gray-400 hidden sm:inline">
                        Stock: {info?.encontrado_en_sap && stockDisponible ? info.stock_disponible : "—"}
                      </span>
                      <EtiquetaStock estado={estadoStock(total.cantidad, info, stockDisponible)} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {puedeResolver && seleccionados.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-sky-50 border border-sky-200 rounded-xl px-4 py-2.5 mb-4">
            <p className="text-sm text-sky-800">{seleccionados.length} pedido(s) seleccionado(s)</p>
            <div className="flex gap-2">
              <Button onClick={() => setSeleccion(new Set())} size="sm" variant="outline">
                Quitar selección
              </Button>
              <Button onClick={() => setConfirmandoLote(true)} size="sm" variant="success">
                <CheckCircle2 size={14} className="mr-1.5" />
                Autorizar seleccionados
              </Button>
            </div>
          </div>
        )}

        {cargando && pedidos.length === 0 && (
          <div className="flex items-center justify-center py-14 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
          </div>
        )}

        {!cargando && !error && pedidos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <Inbox size={24} className="text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No hay pedidos por autorizar.</p>
          </div>
        )}

        {pedidos.length > 0 && (
          <div className="space-y-2.5">
            {pedidos.map((pedido) => (
              <TarjetaPendiente
                key={pedido.id}
                pedido={pedido}
                seleccionado={seleccion.has(pedido.id)}
                puedeResolver={puedeResolver}
                onSeleccionar={() => alternar(pedido.id)}
                onAutorizar={() => setAutorizando(pedido)}
                onRechazar={() => setRechazando(pedido)}
              />
            ))}
          </div>
        )}
      </div>

      {autorizando && (
        <AutorizarModal
          pedido={autorizando}
          stock={stock}
          stockDisponible={stockDisponible}
          onClose={() => setAutorizando(null)}
          onAutorizado={(p) => alResolver(`Pedido ${p.numero_pedido} autorizado.`)}
        />
      )}

      {rechazando && (
        <RechazarModal
          pedido={rechazando}
          onClose={() => setRechazando(null)}
          onRechazado={(p) => alResolver(`Pedido ${p.numero_pedido} rechazado.`)}
        />
      )}

      {confirmandoLote && (
        <ModalBase
          titulo="Autorizar seleccionados"
          subtitulo={`${seleccionados.length} pedido(s), con las cantidades completas`}
          deshabilitarCierre={procesandoLote}
          onClose={() => setConfirmandoLote(false)}
        >
          <div className="px-6 py-4 space-y-2">
            <p className="text-sm text-gray-600">
              Se autorizará cada pedido por lo que se solicitó. Si alguno necesita una cantidad menor, autorízalo por separado.
            </p>
            {resumen.some(([codigo, total]) => estadoStock(total.cantidad, stock.get(codigo), stockDisponible) === "insuficiente") && (
              <p className="text-sm text-red-600 flex items-start gap-1.5">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                Hay productos cuyo stock no alcanza para todo lo seleccionado.
              </p>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <Button onClick={() => setConfirmandoLote(false)} disabled={procesandoLote} variant="outline" size="sm">
              Cancelar
            </Button>
            <Button onClick={autorizarSeleccionados} disabled={procesandoLote} variant="success" size="sm">
              {procesandoLote && <Loader2 size={14} className="animate-spin mr-1.5" />}
              Autorizar
            </Button>
          </div>
        </ModalBase>
      )}
    </div>
  );
}
