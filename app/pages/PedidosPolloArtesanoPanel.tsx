"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { format, addDays } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  AlertTriangle,
  Anchor,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Egg,
  FileText,
  ListOrdered,
  Loader2,
  Lock,
  MapPin,
  Package,
  Scale,
  Send,
  Truck,
  Unlock,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { ModalBase } from "./PedidoEspecialComun";
import { Input } from "../ui/input";
import {
  ComparativoStockModal,
  AsignacionFifoModal,
  TransporteSection,
  calcularAsignacionFifo,
  estadoItemStock,
  ESTADO_STOCK_CFG,
} from "./PedidosPolloView";
import {
  ClienteRutaArtesano,
  RutaArtesano,
  enviarRutaArtesano,
  getComparativoRutaArtesano,
  getPedidosRutaArtesano,
  getResumenRutasArtesano,
  guardarAsignacionRutaArtesano,
  ResumenRutaArtesano,
  descargarExcelReporteDetalleArtesano,
  descargarExcelReporteEnTransitoArtesano,
  previsualizarReporteDetalleArtesano,
  previsualizarReporteEnTransitoArtesano,
  FormatoReporteArtesano,
} from "../api/PedidoArtesanoRutaApi";
import { ReporteDetalleArtesanoModal, VistaPreviaReporteModal, ParametrosReporteArtesano } from "./ReporteArtesanoModales";
import { FormatoReporteModal } from "./ReporteParametrosModal";
import { getPilotos, getAsignacionesTransporte } from "../api/TrasporteApi";
import { getAllCamiones } from "../api/CamionApi";
import { getRutasPollo, getMuelleUsuario, getCandadoActivo, tomarCandado, liberarCandado } from "../api/RutaPolloApi";
import { ComparativoStockItem } from "../types/StockModel";
import { GrupoArticuloFifo } from "../types/AsignacionModel";
import { PilotoUsuario, AsignacionTransporte } from "../types/TransporteModel";
import { CamionModel } from "../types/CamionModel";
import { RutaPollo, MuelleUsuario, CandadoRutaPollo } from "../types/RutaPolloModel";

const ESTADO_CFG: Record<string, { label: string; chip: string; icon: ReactNode }> = {
  CREADO: { label: "Creado", chip: "bg-sky-50 text-sky-700 border-sky-200", icon: <CheckCircle2 size={12} /> },
  VALIDADO: { label: "Validado", chip: "bg-amber-50 text-amber-700 border-amber-200", icon: <CheckCircle2 size={12} /> },
  EN_TRANSITO: { label: "En tránsito", chip: "bg-violet-50 text-violet-700 border-violet-200", icon: <Truck size={12} /> },
  ENTREGADO: { label: "Entregado", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <CheckCircle2 size={12} /> },
  MIXTO: { label: "Mixto", chip: "bg-purple-50 text-purple-700 border-purple-200", icon: <AlertTriangle size={12} /> },
};

function EstadoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_CFG[estado] || { label: estado, chip: "bg-gray-100 text-gray-500 border-gray-200", icon: <AlertCircle size={12} /> };

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.chip}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

const PAGO_TEXTO: Record<string, string> = { DEPOSITO: "Depósito", PLANILLA: "Planilla", PENDIENTE: "Pago pendiente" };

function ClienteCard({ cliente }: { cliente: ClienteRutaArtesano }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left">
        <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
          <User size={14} className="text-gray-500" />
        </span>
        <span className="text-sm text-gray-700 flex-1 truncate">{cliente.nombre_tienda}</span>
        <span className="text-xs text-gray-400 shrink-0">{cliente.numero_pedido}</span>
        <EstadoBadge estado={cliente.estado} />
        <span className="text-xs text-gray-400 shrink-0">{cliente.items.length} ítems</span>
        {open ? <ChevronUp size={15} className="text-gray-400 shrink-0" /> : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-white"
          >
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 pt-3 text-xs text-gray-500">
              {cliente.direccion_entrega && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} className="text-[#2183AE]" /> {cliente.direccion_entrega}
                </span>
              )}
              <span>{PAGO_TEXTO[cliente.condicion_pago] ?? cliente.condicion_pago}</span>
            </div>
            <div className="space-y-1.5 px-3 py-3">
              {cliente.items.map((item) => {
                const solicitada = Number(item.cantidad_solicitada);
                const asignada = Number(item.cantidad_asignada);
                const mostrarAsignada = cliente.estado !== "CREADO" && asignada !== solicitada;

                return (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
                    <div className="flex items-start gap-3 min-w-0">
                      <Package size={14} className="text-sky-500 mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800">{item.descripcion_producto}</p>
                        <p className="text-xs text-gray-400">
                          {item.codigo_producto} · {item.unidad_medida}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 tabular-nums shrink-0">
                      {mostrarAsignada ? (
                        <>
                          <span className="line-through text-gray-400 mr-1.5">{solicitada}</span>
                          <span className="font-medium text-amber-700">{asignada}</span>
                        </>
                      ) : (
                        solicitada
                      )}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Pedidos de Pollo Artesano por ruta: mismo flujo que los pedidos de tienda (candado, transporte, stock, asignación y envío).
export function PedidosPolloArtesanoPanel({ selector }: { selector?: ReactNode }) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const defaultDate = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const [cargandoMuelle, setCargandoMuelle] = useState(true);
  const [muelle, setMuelle] = useState<MuelleUsuario | null>(null);
  const [errorMuelle, setErrorMuelle] = useState<string | null>(null);

  const [candado, setCandado] = useState<CandadoRutaPollo | null>(null);
  const [rutasDisponibles, setRutasDisponibles] = useState<RutaPollo[]>([]);
  const [rutaElegidaId, setRutaElegidaId] = useState("");
  // Pedidos que tiene cada ruta en la fecha elegida, para mostrarlos en el selector.
  const [resumenRutas, setResumenRutas] = useState<Map<string, ResumenRutaArtesano>>(new Map());
  const [fechaElegida, setFechaElegida] = useState(defaultDate);
  const [iniciando, setIniciando] = useState(false);
  const [errorIniciar, setErrorIniciar] = useState<string | null>(null);

  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [previewRuta, setPreviewRuta] = useState<RutaArtesano | null>(null);

  const [rutaActual, setRutaActual] = useState<RutaPollo | null>(null);
  const [pedidoRuta, setPedidoRuta] = useState<RutaArtesano | null>(null);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [errorPedidos, setErrorPedidos] = useState<string | null>(null);

  const [stockComparativo, setStockComparativo] = useState<ComparativoStockItem[] | null>(null);
  const [loadingStock, setLoadingStock] = useState(false);
  const [stockError, setStockError] = useState<string | null>(null);
  const [showStockModal, setShowStockModal] = useState(false);

  const [asignacionFifo, setAsignacionFifo] = useState<GrupoArticuloFifo[] | null>(null);
  const [showFifoModal, setShowFifoModal] = useState(false);
  const [guardandoAsignacion, setGuardandoAsignacion] = useState(false);
  const [errorGuardarAsignacion, setErrorGuardarAsignacion] = useState<string | null>(null);

  const [liberando, setLiberando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnviar, setErrorEnviar] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  // Confirmación propia (en lugar del cuadro del navegador).
  const [confirmacion, setConfirmacion] = useState<"ENVIAR" | "LIBERAR" | null>(null);

  // Reportes: detalle de pedidos y pedidos en tránsito.
  const [showParametrosReporte, setShowParametrosReporte] = useState(false);
  const [showFormatoEnTransito, setShowFormatoEnTransito] = useState(false);
  const [cargandoReporte, setCargandoReporte] = useState(false);
  const [errorReporte, setErrorReporte] = useState<string | null>(null);
  const [reporteUrl, setReporteUrl] = useState<string | null>(null);
  const [reporteTitulo, setReporteTitulo] = useState("");

  const [camiones, setCamiones] = useState<CamionModel[]>([]);
  const [pilotos, setPilotos] = useState<PilotoUsuario[]>([]);
  const [asignacionesDelDia, setAsignacionesDelDia] = useState<AsignacionTransporte[]>([]);

  const mostrarReporte = (url: string, titulo: string) => {
    setReporteTitulo(titulo);
    setReporteUrl(url);
  };

  const cerrarReporte = () => {
    if (reporteUrl) window.URL.revokeObjectURL(reporteUrl);
    setReporteUrl(null);
  };

  const handleGenerarReporte = async (parametros: ParametrosReporteArtesano) => {
    setCargandoReporte(true);
    setErrorReporte(null);

    try {
      const opciones = { fechaHasta: parametros.fechaHasta, estados: parametros.estados, rutas: parametros.rutas, productos: parametros.productos };

      if (parametros.formato === "excel") {
        await descargarExcelReporteDetalleArtesano(parametros.fecha, opciones);
      } else {
        const esRango = !!parametros.fechaHasta && parametros.fechaHasta > parametros.fecha;
        mostrarReporte(await previsualizarReporteDetalleArtesano(parametros.fecha, opciones), esRango ? "Detalle de pedidos por rango de fechas" : "Detalle de pedidos");
      }

      setShowParametrosReporte(false);
    } catch (err) {
      setErrorReporte(err instanceof Error ? err.message : "Error al generar el reporte");
    } finally {
      setCargandoReporte(false);
    }
  };

  const handleGenerarEnTransito = async (formato: FormatoReporteArtesano) => {
    setCargandoReporte(true);
    setErrorReporte(null);

    try {
      if (formato === "excel") {
        await descargarExcelReporteEnTransitoArtesano();
      } else {
        mostrarReporte(await previsualizarReporteEnTransitoArtesano(), "Pedidos en tránsito — Pollo Artesano");
      }

      setShowFormatoEnTransito(false);
    } catch (err) {
      setErrorReporte(err instanceof Error ? err.message : "Error al generar el reporte");
    } finally {
      setCargandoReporte(false);
    }
  };

  useEffect(() => {
    getAllCamiones().then(setCamiones).catch(() => setCamiones([]));
    getPilotos().then(setPilotos).catch(() => setPilotos([]));
  }, []);

  // Al elegir la fecha (y al volver a la pantalla de rutas) se cuentan los pedidos de cada ruta.
  useEffect(() => {
    if (candado || !fechaElegida) return;

    let vigente = true;

    getResumenRutasArtesano(fechaElegida)
      .then((lista) => {
        if (vigente) setResumenRutas(new Map(lista.map((r) => [r.ruta_id, r])));
      })
      .catch(() => {
        if (vigente) setResumenRutas(new Map());
      });

    return () => {
      vigente = false;
    };
  }, [candado, fechaElegida]);

  const textoRuta = (ruta: RutaPollo) => {
    const resumen = resumenRutas.get(ruta.id);

    if (!resumen) return `${ruta.nombre_ruta} · sin pedidos`;

    return `${ruta.nombre_ruta} · ${resumen.total} pedido${resumen.total !== 1 ? "s" : ""}${resumen.por_validar > 0 ? ` (${resumen.por_validar} por validar)` : ""}`;
  };

  const puedeEditarTransporte = useMemo(() => !!candado && candado.fecha >= todayStr, [candado, todayStr]);

  // Pedidos de la ruta que todavía se pueden validar o enviar.
  const pendientes = useMemo(() => (pedidoRuta ? pedidoRuta.tiendas.filter((t) => t.estado === "CREADO" || t.estado === "VALIDADO") : []), [pedidoRuta]);
  const validados = useMemo(() => pendientes.filter((t) => t.estado === "VALIDADO"), [pendientes]);

  // Al montar: muelle del usuario y candado activo, si lo hay.
  useEffect(() => {
    (async () => {
      setCargandoMuelle(true);
      setErrorMuelle(null);

      try {
        const m = await getMuelleUsuario();
        setMuelle(m);

        const candadoExistente = await getCandadoActivo(m.whs_code_origen);
        const rutas = await getRutasPollo(m.whs_code_origen);
        setRutasDisponibles(rutas);

        if (candadoExistente) {
          setCandado(candadoExistente);
          setRutaElegidaId(candadoExistente.ruta_id);
          setFechaElegida(candadoExistente.fecha);
        }
      } catch (err) {
        setErrorMuelle(err instanceof Error ? err.message : "Error al obtener el muelle asignado");
      } finally {
        setCargandoMuelle(false);
      }
    })();
  }, []);

  // Con candado activo se cargan los pedidos de esa ruta y fecha.
  useEffect(() => {
    if (!candado) return;

    (async () => {
      setRutaActual(rutasDisponibles.find((r) => r.id === candado.ruta_id) || null);
      setLoadingPedidos(true);
      setErrorPedidos(null);

      try {
        const [data, asignaciones] = await Promise.all([getPedidosRutaArtesano(candado.ruta_id, candado.fecha), getAsignacionesTransporte(candado.fecha)]);
        setPedidoRuta(data.rutas[0] || null);
        setAsignacionesDelDia(asignaciones);
      } catch (err) {
        setErrorPedidos(err instanceof Error ? err.message : "Error al obtener los pedidos de la ruta");
      } finally {
        setLoadingPedidos(false);
      }
    })();
  }, [candado, rutasDisponibles]);

  const limpiarBusqueda = () => {
    setBusquedaRealizada(false);
    setPreviewRuta(null);
    setErrorBusqueda(null);
  };

  const cambiarRuta = (id: string) => {
    setRutaElegidaId(id);
    limpiarBusqueda();
  };

  const cambiarFecha = (fecha: string) => {
    setFechaElegida(fecha);
    limpiarBusqueda();
  };

  const handleBuscarPreview = async () => {
    if (!rutaElegidaId || !fechaElegida) return;

    setLoadingBusqueda(true);
    setErrorBusqueda(null);
    setPreviewRuta(null);

    try {
      const data = await getPedidosRutaArtesano(rutaElegidaId, fechaElegida);
      setPreviewRuta(data.rutas[0] || null);
      setBusquedaRealizada(true);
    } catch (err) {
      setErrorBusqueda(err instanceof Error ? err.message : "Error al buscar pedidos");
    } finally {
      setLoadingBusqueda(false);
    }
  };

  const handleIniciar = async () => {
    if (!rutaElegidaId || !fechaElegida) return;

    setIniciando(true);
    setErrorIniciar(null);

    try {
      setCandado(await tomarCandado(rutaElegidaId, fechaElegida));
    } catch (err) {
      setErrorIniciar(err instanceof Error ? err.message : "Error al tomar el candado de la ruta");
    } finally {
      setIniciando(false);
    }
  };

  // Vuelve a la pantalla de elegir ruta.
  const salirDeLaRuta = async () => {
    setCandado(null);
    setRutaActual(null);
    setPedidoRuta(null);
    setStockComparativo(null);
    setAsignacionFifo(null);
    setRutaElegidaId("");
    limpiarBusqueda();

    if (muelle) setRutasDisponibles(await getRutasPollo(muelle.whs_code_origen));
  };

  const handleLiberar = async () => {
    if (!candado) return;

    setLiberando(true);

    try {
      await liberarCandado(candado.ruta_id, candado.fecha);
      await salirDeLaRuta();
    } catch (err) {
      setErrorIniciar(err instanceof Error ? err.message : "Error al liberar el candado");
    } finally {
      setLiberando(false);
      setConfirmacion(null);
    }
  };

  const recargarPedidos = async () => {
    if (!candado) return;

    const data = await getPedidosRutaArtesano(candado.ruta_id, candado.fecha);
    setPedidoRuta(data.rutas[0] || null);
  };

  const handleCalcularStock = async () => {
    if (!candado) return;

    setLoadingStock(true);
    setStockError(null);

    try {
      const data = await getComparativoRutaArtesano(candado.fecha, candado.ruta_id);
      setStockComparativo(data.comparativo);
      setAsignacionFifo(null);
      setShowStockModal(true);
    } catch (err) {
      setStockError(err instanceof Error ? err.message : "Error al calcular el stock");
    } finally {
      setLoadingStock(false);
    }
  };

  const handleAbrirAsignacionFifo = () => {
    if (!stockComparativo || !pedidoRuta) return;

    setAsignacionFifo(calcularAsignacionFifo({ ...pedidoRuta, tiendas: pendientes }, stockComparativo));
    setErrorGuardarAsignacion(null);
    setShowFifoModal(true);
  };

  const handleCambiarCantidadAsignada = (codigoProducto: string, detalleId: string, nuevaCantidad: number) => {
    setAsignacionFifo((prev) =>
      prev
        ? prev.map((grupo) =>
            grupo.codigo_producto !== codigoProducto
              ? grupo
              : { ...grupo, lineas: grupo.lineas.map((l) => (l.detalle_id === detalleId ? { ...l, cantidad_asignada: nuevaCantidad, ajustado_manual: true } : l)) }
          )
        : prev
    );
  };

  const handleGuardarAsignacionFifo = async () => {
    if (!asignacionFifo || !candado) return;

    setGuardandoAsignacion(true);
    setErrorGuardarAsignacion(null);

    try {
      const asignaciones = asignacionFifo.flatMap((g) =>
        g.lineas.map((l) => ({ detalle_id: l.detalle_id, cantidad_asignada: l.cantidad_asignada, ajustado_manual: l.ajustado_manual }))
      );
      const resultado = await guardarAsignacionRutaArtesano(candado.ruta_id, candado.fecha, asignaciones);

      setShowFifoModal(false);
      setAviso(
        `${resultado.pedidos_validados} pedido(s) validado(s).` +
          (resultado.pedidos_sin_asignar > 0 ? ` ${resultado.pedidos_sin_asignar} sin stock siguen creados: recházalos desde la vista de avícola.` : "")
      );
      await recargarPedidos();
    } catch (err) {
      setErrorGuardarAsignacion(err instanceof Error ? err.message : "Error al guardar la asignación");
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  const handleEnviar = async () => {
    if (!candado || !pedidoRuta) return;

    setEnviando(true);
    setErrorEnviar(null);

    try {
      const resultado = await enviarRutaArtesano(candado.ruta_id, candado.fecha);

      await salirDeLaRuta();
      setAviso(
        `Transferencia enviada. Documento SAP #${resultado.sap_docnum}.` +
          (resultado.pedidos_sin_validar > 0 ? ` Quedan ${resultado.pedidos_sin_validar} pedido(s) sin validar.` : "")
      );
    } catch (err) {
      setErrorEnviar(err instanceof Error ? err.message : "Error al enviar la ruta");
    } finally {
      setEnviando(false);
      setConfirmacion(null);
    }
  };

  const handleAsignado = (rutaId: string, camionId: string, camionPlaca: string, pilotoId: number, pilotoNombre: string) => {
    setPedidoRuta((prev) =>
      prev && prev.ruta_id === rutaId ? { ...prev, camion_id: camionId, camion_placa: camionPlaca, piloto_id: pilotoId, piloto_nombre: pilotoNombre } : prev
    );
    setAsignacionesDelDia((prev) => [
      ...prev.filter((a) => a.ruta_id !== rutaId),
      { id: "temp", ruta_id: rutaId, fecha: candado?.fecha || "", camion_id: camionId, camion_placa: camionPlaca, piloto_id: pilotoId, piloto_nombre: pilotoNombre },
    ]);
  };

  if (cargandoMuelle) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Loader2 className="h-8 w-8 text-[#2183AE] animate-spin mb-3" />
        <p className="text-sm text-gray-400">Cargando…</p>
      </div>
    );
  }

  if (errorMuelle || !muelle) {
    return (
      <div className="max-w-lg mx-auto mt-10 bg-red-50 border border-red-200 rounded-xl px-4 py-4 flex items-start gap-2.5">
        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-red-700 font-medium">No se pudo determinar tu muelle</p>
          <p className="text-xs text-red-600 mt-1">{errorMuelle || "Este usuario no tiene un muelle de pollo asignado."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <Egg className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">Pedidos de Pollo Artesano</h2>
            <p className="text-sm text-white/90 mt-0.5 flex items-center gap-1.5">
              <Anchor size={13} /> Muelle: {muelle.nombre_muelle} ({muelle.whs_code_origen})
            </p>
          </div>
        </div>
      </div>

      {selector}

      {aviso && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 mb-4 flex items-center justify-between gap-2">
          <p className="text-sm text-emerald-800">{aviso}</p>
          <button onClick={() => setAviso(null)} className="text-emerald-700 text-xs hover:underline shrink-0">
            Cerrar
          </button>
        </div>
      )}

      {!candado ? (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-800 mb-4 flex items-center gap-1.5">
            <Unlock size={15} className="text-gray-400" /> Elige la ruta a trabajar
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="sm:col-span-2">
              <Label className="text-xs text-gray-700 mb-1.5 block">Ruta</Label>
              <select
                value={rutaElegidaId}
                onChange={(e) => cambiarRuta(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
              >
                <option value="">Seleccionar ruta…</option>
                {rutasDisponibles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {textoRuta(r)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-700 mb-1.5 block">Fecha requerida</Label>
              <Input type="date" value={fechaElegida} onChange={(e) => cambiarFecha(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button onClick={handleBuscarPreview} disabled={loadingBusqueda || !rutaElegidaId || !fechaElegida} variant="submit" size="sm">
              {loadingBusqueda ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
              Buscar
            </Button>
            <Button
              onClick={() => {
                setErrorReporte(null);
                setShowParametrosReporte(true);
              }}
              disabled={!fechaElegida}
              variant="outline"
              size="sm"
            >
              <FileText size={14} className="mr-1.5" />
              Generar Reporte
            </Button>
            <Button
              onClick={() => {
                setErrorReporte(null);
                setShowFormatoEnTransito(true);
              }}
              variant="outline"
              size="sm"
            >
              <Truck size={14} className="mr-1.5" />
              Pedidos en tránsito
            </Button>
          </div>

          {errorBusqueda && (
            <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
              <AlertCircle size={12} /> {errorBusqueda}
            </p>
          )}

          {busquedaRealizada && (!previewRuta || previewRuta.tiendas.length === 0) && (
            <div className="flex flex-col items-center justify-center py-8 text-center border border-gray-100 rounded-xl mb-4">
              <Egg size={22} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No hay pedidos de pollo artesano para esta ruta en esta fecha.</p>
            </div>
          )}

          {previewRuta && previewRuta.tiendas.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className="text-xs text-gray-400">
                  {previewRuta.tiendas.length} cliente{previewRuta.tiendas.length !== 1 ? "s" : ""} encontrados
                </p>
                <EstadoBadge estado={previewRuta.estado_general} />
                {previewRuta.sap_docnum && (
                  <span className="text-xs text-gray-400">
                    Doc. SAP: <span className="text-gray-600 font-medium">{previewRuta.sap_docnum}</span>
                  </span>
                )}
              </div>
              {(previewRuta.piloto_nombre || previewRuta.camion_placa) && (
                <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <User size={12} className="text-gray-400" /> {previewRuta.piloto_nombre || "Sin piloto"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Truck size={12} className="text-gray-400" /> {previewRuta.camion_placa || "Sin camión"}
                  </span>
                </div>
              )}
              <div className="space-y-2">
                {previewRuta.tiendas.map((cliente) => (
                  <ClienteCard key={cliente.pedido_id} cliente={cliente} />
                ))}
              </div>
            </div>
          )}

          {errorIniciar && (
            <p className="text-xs text-red-600 mb-3 flex items-center gap-1">
              <AlertCircle size={12} /> {errorIniciar}
            </p>
          )}
          <Button
            onClick={handleIniciar}
            disabled={iniciando || !busquedaRealizada || !previewRuta || previewRuta.tiendas.length === 0}
            className="bg-[#2183AE] text-white hover:bg-[#1a6a8f]"
            size="sm"
          >
            {iniciando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Lock size={14} className="mr-1.5" />}
            Iniciar validación
          </Button>
          {rutasDisponibles.length === 0 && (
            <p className="text-xs text-gray-400 mt-3">No hay rutas configuradas para este muelle todavía.</p>
          )}
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Lock size={15} className="text-[#2183AE] shrink-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-gray-800 font-medium">{rutaActual?.nombre_ruta || pedidoRuta?.nombre_ruta || "Ruta"}</p>
                  {pedidoRuta?.estado_general && <EstadoBadge estado={pedidoRuta.estado_general} />}
                  {pedidoRuta?.sap_docnum && (
                    <span className="text-xs text-gray-400">
                      Doc. SAP: <span className="text-gray-600 font-medium">{pedidoRuta.sap_docnum}</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">Fecha requerida: {candado.fecha}</p>
              </div>
            </div>
            <Button onClick={() => setConfirmacion("LIBERAR")} disabled={liberando} variant="cancel" size="sm" className="border-gray-900 bg-gray-900 text-white hover:bg-white">
              {liberando ? <Loader2 size={13} className="animate-spin mr-1.5" /> : <Unlock size={13} className="mr-1.5" />}
              Liberar ruta
            </Button>
          </div>

          {pedidoRuta && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-4 overflow-hidden">
              <TransporteSection
                ruta={pedidoRuta}
                fecha={candado.fecha}
                puedeEditar={puedeEditarTransporte}
                camiones={camiones}
                pilotos={pilotos}
                asignacionesDelDia={asignacionesDelDia}
                onAsignado={handleAsignado}
              />
            </div>
          )}

          {loadingPedidos && (
            <div className="flex justify-center py-10">
              <Loader2 size={24} className="animate-spin text-[#2183AE]" />
            </div>
          )}

          {errorPedidos && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2.5 mb-4">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{errorPedidos}</p>
            </div>
          )}

          {!loadingPedidos && !errorPedidos && !pedidoRuta && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Egg size={24} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No hay pedidos de pollo artesano para esta ruta en esta fecha.</p>
            </div>
          )}

          {!loadingPedidos && pedidoRuta && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Scale size={16} className="text-[#2183AE] shrink-0" />
                  {pendientes.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay pedidos por validar en esta ruta.</p>
                  ) : !stockComparativo ? (
                    <p className="text-sm text-gray-500">Calcula el total solicitado vs. el stock disponible en SAP.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(["ok", "parcial", "sin_stock", "no_encontrado"] as const).map((clave) => {
                        const total = stockComparativo.filter((i) => estadoItemStock(i) === clave).length;
                        const cfg = ESTADO_STOCK_CFG[clave];

                        return total > 0 ? (
                          <span key={clave} className={`flex items-center gap-1 text-xs border px-2 py-0.5 rounded-full ${cfg.chip}`}>
                            {cfg.icon} {total} {cfg.label.toLowerCase()}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
                {stockError && <p className="text-xs text-red-600">{stockError}</p>}
                <div className="flex items-center gap-2 shrink-0">
                  {pendientes.length > 0 && (
                    <Button onClick={stockComparativo ? () => setShowStockModal(true) : handleCalcularStock} disabled={loadingStock} size="sm" variant="submit">
                      {loadingStock ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Scale size={14} className="mr-1.5" />}
                      {stockComparativo ? "Ver comparativo" : "Calcular stock"}
                    </Button>
                  )}
                  {stockComparativo && pendientes.length > 0 && (
                    <Button
                      onClick={asignacionFifo ? () => setShowFifoModal(true) : handleAbrirAsignacionFifo}
                      size="sm"
                      variant="outline"
                      className="border-[#2183AE] text-[#2183AE] hover:bg-[#2183AE]/10"
                    >
                      <ListOrdered size={14} className="mr-1.5" />
                      {asignacionFifo ? "Ver asignación" : "Asignar (FIFO)"}
                    </Button>
                  )}
                  {validados.length > 0 && (
                    <Button onClick={() => setConfirmacion("ENVIAR")} disabled={enviando || !pedidoRuta.piloto_id} size="sm" variant="success">
                      {enviando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Send size={14} className="mr-1.5" />}
                      Enviar a SAP
                    </Button>
                  )}
                </div>
              </div>

              {validados.length > 0 && (!pedidoRuta.camion_id || !pedidoRuta.piloto_id) && (
                <p className="text-xs text-amber-600 mb-4 flex items-center gap-1">
                  <AlertTriangle size={12} /> Asigna piloto y camión a esta ruta antes de poder enviarla a SAP.
                </p>
              )}
              {errorEnviar && (
                <p className="text-xs text-red-600 mb-4 flex items-center gap-1">
                  <XCircle size={12} /> {errorEnviar}
                </p>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-3">
                  {pedidoRuta.tiendas.length} cliente{pedidoRuta.tiendas.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-2.5">
                  {pedidoRuta.tiendas.map((cliente) => (
                    <ClienteCard key={cliente.pedido_id} cliente={cliente} />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {confirmacion && (
        <ModalBase
          titulo={confirmacion === "ENVIAR" ? "Enviar a SAP" : "Liberar ruta"}
          subtitulo={rutaActual?.nombre_ruta || pedidoRuta?.nombre_ruta}
          deshabilitarCierre={enviando || liberando}
          onClose={() => setConfirmacion(null)}
        >
          <div className="px-6 py-4">
            <p className="text-sm text-gray-600">
              {confirmacion === "ENVIAR"
                ? `Se enviarán a SAP los ${validados.length} pedido(s) validados. Esto mueve el inventario del muelle al camión y libera la ruta.`
                : "Podrás retomar la ruta después, pero otra persona podría tomar otra ruta de este muelle mientras tanto."}
            </p>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <Button onClick={() => setConfirmacion(null)} disabled={enviando || liberando} variant="outline" size="sm">
              Cancelar
            </Button>
            <Button
              onClick={confirmacion === "ENVIAR" ? handleEnviar : handleLiberar}
              disabled={enviando || liberando}
              variant={confirmacion === "ENVIAR" ? "success" : "submit"}
              size="sm"
            >
              {(enviando || liberando) && <Loader2 size={14} className="animate-spin mr-1.5" />}
              {confirmacion === "ENVIAR" ? "Enviar a SAP" : "Liberar ruta"}
            </Button>
          </div>
        </ModalBase>
      )}

      {showParametrosReporte && (
        <ReporteDetalleArtesanoModal
          fecha={fechaElegida}
          rutas={rutasDisponibles}
          cargando={cargandoReporte}
          error={errorReporte}
          onGenerar={handleGenerarReporte}
          onClose={() => setShowParametrosReporte(false)}
        />
      )}

      {showFormatoEnTransito && (
        <FormatoReporteModal
          titulo="Pedidos en tránsito — Pollo Artesano"
          cargando={cargandoReporte}
          error={errorReporte}
          onElegir={handleGenerarEnTransito}
          onClose={() => setShowFormatoEnTransito(false)}
        />
      )}

      {reporteUrl && <VistaPreviaReporteModal url={reporteUrl} titulo={reporteTitulo} onClose={cerrarReporte} />}

      {showStockModal && stockComparativo && <ComparativoStockModal comparativo={stockComparativo} fecha={candado?.fecha || ""} onClose={() => setShowStockModal(false)} />}
      {showFifoModal && asignacionFifo && (
        <AsignacionFifoModal
          grupos={asignacionFifo}
          fecha={candado?.fecha || ""}
          guardando={guardandoAsignacion}
          error={errorGuardarAsignacion}
          onClose={() => setShowFifoModal(false)}
          onCambiarCantidad={handleCambiarCantidadAsignada}
          onGuardar={handleGuardarAsignacionFifo}
        />
      )}
    </div>
  );
}
