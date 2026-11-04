"use client";

import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  Loader2,
  Store,
  Package,
  ChevronDown,
  ChevronUp,
  Check,
  X as XIcon,
  Filter,
  Inbox,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { autorizarPedidoEspecial, getPedidosEspeciales, rechazarPedidoEspecial } from "../api/PedidoEspecialApi";
import { EstadoPedidoEspecial, Paginacion, PedidoEspecial } from "../types/PedidoEspecialModel";
import {
  BannerMensaje,
  ComentarioPedido,
  EstadoEspecialBadge,
  ControlesPaginacion,
  ModalBase,
  fechaManana,
  formatearFechaCorta,
} from "./PedidoEspecialComun";

// estados undefined = todos los estados.
const FILTROS_ESTADO: { id: string; label: string; estados?: EstadoPedidoEspecial[] }[] = [
  { id: "todos", label: "Todos" },
  { id: "pendientes", label: "Pendientes", estados: ["PENDIENTE_APROBACION"] },
  { id: "rechazados", label: "Rechazados", estados: ["RECHAZADO"] },
  { id: "autorizados", label: "Autorizados", estados: ["AUTORIZADO", "EN_PREPARACION", "LISTO_PARA_RECOGER", "ENTREGADO"] },
];

interface FiltrosBusqueda {
  estado: string;
  fechaDesde: string;
  fechaHasta: string;
}

type Accion = { tipo: "autorizar" | "rechazar"; pedido: PedidoEspecial; cantidades: Record<string, number> };

function AccionModal({
  accion,
  procesando,
  error,
  onConfirmar,
  onClose,
}: {
  accion: Accion;
  procesando: boolean;
  error: string | null;
  onConfirmar: (motivo: string) => void;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const { pedido, tipo, cantidades } = accion;

  const cambios = pedido.items.filter((i) => cantidades[i.id] !== i.cantidad_solicitada);
  const motivoInvalido = tipo === "rechazar" && motivo.trim().length < 5;

  return (
    <ModalBase
      titulo={tipo === "autorizar" ? "Autorizar pedido" : "Rechazar pedido"}
      subtitulo={`${pedido.numero_pedido} · ${pedido.nombre_tienda}`}
      deshabilitarCierre={procesando}
      onClose={onClose}
    >
      <div className="px-6 py-5 space-y-3 overflow-y-auto min-h-0">
        {tipo === "autorizar" ? (
          <>
            <p className="text-sm text-gray-700">
              El pedido pasará a <strong>Autorizado</strong> y podrá procesarse en la vista de despacho.
            </p>
            {cambios.length > 0 && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-800 space-y-1">
                <p className="font-medium">Cantidades que cambiaste:</p>
                {cambios.map((i) => (
                  <p key={i.id}>
                    {i.descripcion_producto}: {i.cantidad_solicitada} → {cantidades[i.id]}
                  </p>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm text-gray-700">Indica por qué se rechaza. Este motivo es obligatorio.</p>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo del rechazo…"
              rows={4}
              maxLength={500}
            />
            {motivo.length > 0 && motivoInvalido && <p className="text-xs text-amber-600">Escribe al menos 5 caracteres.</p>}
          </>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>

      <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
        <Button onClick={onClose} disabled={procesando} variant="cancel" size="sm">
          Cancelar
        </Button>
        <Button
          onClick={() => onConfirmar(motivo.trim())}
          disabled={procesando || motivoInvalido}
          variant={tipo === "autorizar" ? "success" : "destructive"}
          size="sm"
        >
          {procesando && <Loader2 size={14} className="animate-spin mr-1.5" />}
          {tipo === "autorizar" ? "Autorizar" : "Rechazar"}
        </Button>
      </div>
    </ModalBase>
  );
}

function TarjetaPedido({
  pedido,
  onAccion,
}: {
  pedido: PedidoEspecial;
  onAccion: (tipo: "autorizar" | "rechazar", pedido: PedidoEspecial, cantidades: Record<string, number>) => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [valores, setValores] = useState<Record<string, string>>(
    Object.fromEntries(pedido.items.map((i) => [i.id, String(i.cantidad_solicitada)]))
  );

  const pendiente = pedido.estado === "PENDIENTE_APROBACION";
  const numeros = pedido.items.map((i) => ({ id: i.id, valor: Number(valores[i.id]) }));
  const hayInvalidas = numeros.some((n) => !Number.isFinite(n.valor) || n.valor < 0);
  const sinCantidades = !hayInvalidas && numeros.every((n) => n.valor === 0);
  const cantidades = Object.fromEntries(numeros.map((n) => [n.id, n.valor]));

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setAbierta((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
          <Store size={14} className="text-gray-500" />
        </span>
        <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{pedido.nombre_tienda}</span>
        <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{pedido.numero_pedido}</span>
        <EstadoEspecialBadge estado={pedido.estado} />
        <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">{pedido.items.length} ítems</span>
        {abierta ? <ChevronUp size={15} className="text-gray-400 shrink-0" /> : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
      </button>
      <AnimatePresence>
        {abierta && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden bg-white"
          >
            <div className="px-4 sm:px-6 pt-3 text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
              <span>
                Pedido: <span className="font-medium text-gray-700">{pedido.numero_pedido}</span>
              </span>
              <span>
                Entrega: <span className="font-medium text-gray-700">{formatearFechaCorta(pedido.fecha_requerida)}</span>
              </span>
              {pedido.division && <span>División {pedido.division}</span>}
              <span className="sm:hidden">{pedido.items.length} ítems</span>
            </div>

            <div className="px-3 pt-3 space-y-3">
              <ComentarioPedido comentario={pedido.comentario} />

              {pedido.estado === "RECHAZADO" && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-red-700">Motivo del rechazo</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.motivo_rechazo}</p>
                </div>
              )}

              {!pendiente && pedido.autorizado_por && (
                <p className="text-xs text-gray-400">
                  {pedido.estado === "RECHAZADO" ? "Rechazado" : "Autorizado"} por {pedido.autorizado_por} el{" "}
                  {formatearFechaCorta(pedido.fecha_autorizacion)}
                </p>
              )}
            </div>

            <div className="space-y-1.5 px-3 py-3">
              <div className="space-y-1.5">
                {pedido.items.map((item) => (
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

                    {pendiente ? (
                      <div className="flex items-center gap-2 shrink-0">
                        {Number(valores[item.id]) !== item.cantidad_solicitada && (
                          <span className="text-[11px] text-gray-400">pidió {item.cantidad_solicitada}</span>
                        )}
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          value={valores[item.id]}
                          onChange={(e) => setValores((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          className="w-24 h-8 text-right"
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 tabular-nums shrink-0">{item.cantidad_solicitada}</p>
                    )}
                  </div>
                ))}
              </div>

              {pendiente && (
                <>
                  {(hayInvalidas || sinCantidades) && (
                    <p className="text-xs text-amber-600">
                      {hayInvalidas ? "Hay cantidades inválidas." : "Al menos una línea debe tener cantidad mayor a 0."}
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row sm:justify-end gap-2 pt-1">
                    <Button onClick={() => onAccion("rechazar", pedido, cantidades)} variant="destructive" size="sm" className="w-full sm:w-auto">
                      <XIcon size={14} className="mr-1" />
                      Rechazar
                    </Button>
                    <Button
                      onClick={() => onAccion("autorizar", pedido, cantidades)}
                      disabled={hayInvalidas || sinCantidades}
                      variant="success"
                      size="sm"
                      className="w-full sm:w-auto"
                    >
                      <Check size={14} className="mr-1" />
                      Autorizar
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const SIN_RESULTADOS: Paginacion = { page: 1, pageSize: 10, total: 0, totalPages: 1 };

export function AutorizarPedidosEspecialesView() {
  const [estadoFiltro, setEstadoFiltro] = useState("pendientes");
  // Por defecto una sola fecha: mañana, cada vez que se carga la vista.
  const [modoFecha, setModoFecha] = useState<"todas" | "una" | "rango">("una");
  const [fechaUnica, setFechaUnica] = useState(fechaManana);
  const [fechaDesde, setFechaDesde] = useState(fechaManana);
  const [fechaHasta, setFechaHasta] = useState(fechaManana);
  // Filtros con los que se hizo la última búsqueda: al cambiar de página se
  // usan estos, no lo que se esté editando en los campos.
  const [aplicados, setAplicados] = useState<FiltrosBusqueda>({ estado: "pendientes", fechaDesde: "", fechaHasta: "" });
  const [pedidos, setPedidos] = useState<PedidoEspecial[]>([]);
  const [paginacion, setPaginacion] = useState<Paginacion>(SIN_RESULTADOS);
  // No se busca nada hasta que se presiona Buscar.
  const [cargando, setCargando] = useState(false);
  const [yaBusco, setYaBusco] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [accion, setAccion] = useState<Accion | null>(null);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const fechasInvertidas = modoFecha === "rango" && fechaDesde !== "" && fechaHasta !== "" && fechaDesde > fechaHasta;
  const faltaFecha =
    modoFecha === "una" ? fechaUnica === "" : modoFecha === "rango" ? fechaDesde === "" || fechaHasta === "" : false;
  // Muestra "Limpiar" cuando hay algo distinto a los valores por defecto.
  const hayFiltrosActivos =
    yaBusco || estadoFiltro !== "pendientes" || modoFecha !== "una" || fechaUnica !== fechaManana();

  const cargar = useCallback(
    async (pagina: number, filtros: FiltrosBusqueda) => {
      const definicion = FILTROS_ESTADO.find((f) => f.id === filtros.estado) ?? FILTROS_ESTADO[0];

      setCargando(true);
      setError(null);

      try {
        const resultado = await getPedidosEspeciales({
          estados: definicion.estados,
          fechaDesde: filtros.fechaDesde || undefined,
          fechaHasta: filtros.fechaHasta || undefined,
          page: pagina,
        });

        setPedidos(resultado.pedidos);
        setPaginacion(resultado.paginacion);
        setYaBusco(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al obtener los pedidos");
      } finally {
        setCargando(false);
      }
    },
    []
  );

  const handleBuscar = () => {
    const filtros: FiltrosBusqueda =
      modoFecha === "una"
        ? { estado: estadoFiltro, fechaDesde: fechaUnica, fechaHasta: fechaUnica }
        : modoFecha === "rango"
          ? { estado: estadoFiltro, fechaDesde, fechaHasta }
          : { estado: estadoFiltro, fechaDesde: "", fechaHasta: "" };

    setAplicados(filtros);
    cargar(1, filtros);
  };

  // Vuelve a los filtros por defecto (pendientes, mañana) y vacía los resultados.
  const handleLimpiar = () => {
    setEstadoFiltro("pendientes");
    setModoFecha("una");
    setFechaUnica(fechaManana());
    setFechaDesde(fechaManana());
    setFechaHasta(fechaManana());
    setPedidos([]);
    setPaginacion(SIN_RESULTADOS);
    setYaBusco(false);
    setError(null);
  };

  const handleConfirmar = async (motivo: string) => {
    if (!accion) return;

    setProcesando(true);
    setErrorAccion(null);

    try {
      if (accion.tipo === "autorizar") {
        await autorizarPedidoEspecial(
          accion.pedido.id,
          accion.pedido.items.map((i) => ({ item_id: i.id, cantidad_solicitada: accion.cantidades[i.id] }))
        );
        setAviso(`Pedido ${accion.pedido.numero_pedido} autorizado.`);
      } else {
        await rechazarPedidoEspecial(accion.pedido.id, motivo);
        setAviso(`Pedido ${accion.pedido.numero_pedido} rechazado.`);
      }

      setAccion(null);
      await cargar(paginacion.page, aplicados);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : "No se pudo completar la acción");
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">Autorizar Pedidos Especiales</h2>
            <p className="text-sm text-white/90 mt-0.5">
              Pedidos especiales que llegan de Simphony: revisa el comentario, ajusta cantidades y autoriza o rechaza
            </p>
          </div>
        </div>
      </div>

      {aviso && <BannerMensaje tipo="ok" texto={aviso} onCerrar={() => setAviso(null)} />}

      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <div>
            <Label className="text-xs text-gray-700 mb-1.5 block">Estado</Label>
            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent h-9"
            >
              {FILTROS_ESTADO.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-700 mb-1.5 block">Tipo de Fecha</Label>
            <select
              value={modoFecha}
              onChange={(e) => setModoFecha(e.target.value as "todas" | "una" | "rango")}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent h-9"
            >
              <option value="todas">Sin filtro de fecha</option>
              <option value="una">Una Fecha</option>
              <option value="rango">Rango de fechas</option>
            </select>
          </div>
          <div>
            <Label className="text-xs text-gray-700 mb-1.5 block">{modoFecha === "rango" ? "Desde" : "Fecha"}</Label>
            <Input
              type="date"
              value={modoFecha === "una" ? fechaUnica : fechaDesde}
              onChange={(e) => (modoFecha === "una" ? setFechaUnica(e.target.value) : setFechaDesde(e.target.value))}
              disabled={modoFecha === "todas"}
              className="h-9 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs text-gray-700 mb-1.5 block">{modoFecha === "rango" ? "Hasta" : ""}</Label>
            {modoFecha === "rango" && (
              <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="h-9 text-xs" />
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleBuscar}
            disabled={cargando || fechasInvertidas || faltaFecha}
            className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE] flex items-center gap-2"
            size="sm"
          >
            {cargando ? <Loader2 className="h-3 w-3 animate-spin" /> : <Filter className="h-3 w-3" />}
            Buscar
          </Button>
          {hayFiltrosActivos && (
            <Button
              onClick={handleLimpiar}
              variant="outline"
              size="sm"
              className="border border-gray-900 bg-gray-900 text-white hover:bg-white hover:text-gray-900"
            >
              <XIcon className="h-3 w-3 mr-1" />
              Limpiar
            </Button>
          )}
          {fechasInvertidas && <p className="text-xs text-red-600">La fecha inicial no puede ser mayor que la final.</p>}
          {faltaFecha && !fechasInvertidas && <p className="text-xs text-amber-600">Elige la fecha para poder buscar.</p>}
        </div>
      </div>

      {error && <BannerMensaje tipo="error" texto={error} />}

      {cargando ? (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-14">
          <Loader2 size={18} className="animate-spin" /> Cargando pedidos…
        </div>
      ) : !yaBusco ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <Inbox size={24} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Elige el estado y la fecha, y presiona Buscar para ver los pedidos.</p>
        </div>
      ) : pedidos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <Inbox size={24} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No hay pedidos con esos filtros.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pedidos.map((pedido) => (
            <TarjetaPedido
              key={pedido.id}
              pedido={pedido}
              onAccion={(tipo, p, cantidades) => {
                setErrorAccion(null);
                setAccion({ tipo, pedido: p, cantidades });
              }}
            />
          ))}
        </div>
      )}

      <ControlesPaginacion
        paginacion={paginacion}
        cargando={cargando}
        onCambiar={(pagina) => cargar(pagina, aplicados)}
      />

      {accion && (
        <AccionModal
          accion={accion}
          procesando={procesando}
          error={errorAccion}
          onConfirmar={handleConfirmar}
          onClose={() => setAccion(null)}
        />
      )}
    </div>
  );
}
