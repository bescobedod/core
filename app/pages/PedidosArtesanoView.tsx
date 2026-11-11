"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Egg,
  Search,
  Plus,
  Minus,
  Loader2,
  Eraser,
  ChevronDown,
  ChevronUp,
  Package,
  MapPin,
  User,
  Inbox,
  Trash2,
  UserPlus,
  Truck,
  CreditCard,
  Clock,
  PackageCheck,
  Download,
  Pencil,
  Phone,
  Printer,
  XCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Combobox } from "../ui/combobox";
import { getAllMenus } from "../api/MenuApi";
import { getRutasPollo, getTiendasDeRuta } from "../api/RutaPolloApi";
import {
  buscarClientesAvicola,
  crearClienteAvicola,
  completarPagoArtesano,
  crearPedidoArtesano,
  editarPedidoArtesano,
  exportarPedidosArtesano,
  getPdfEnviosArtesano,
  getPedidosArtesano,
  getProductosArtesano,
  getUsuariosArtesano,
} from "../api/PedidoEspecialApi";
import {
  ClienteAvicola,
  CondicionPagoArtesano,
  EstadoPedidoArtesano,
  Paginacion,
  PedidoArtesano,
  ProductoArtesano,
  UsuarioArtesano,
} from "../types/PedidoEspecialModel";
import { RutaPollo, TiendaRutaPollo } from "../types/RutaPolloModel";
import { MUELLES_POLLO } from "./ReporteParametrosModal";
import { BannerMensaje, ControlesPaginacion, ModalBase, formatearFechaCorta } from "./PedidoEspecialComun";
import { VisorPdf } from "./ComponentesEnvioArtesano";

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

function nombreMuelle(whsCode: string): string {
  return MUELLES_POLLO.find((m) => m.whs_code === whsCode)?.nombre ?? whsCode;
}

export const ESTADOS_ARTESANO: EstadoPedidoArtesano[] = ["CREADO", "RECHAZADO", "CARGADO", "ENTREGADO"];

export const ESTADO_ARTESANO_CFG: Record<EstadoPedidoArtesano, { label: string; chip: string; icon: ReactNode }> = {
  CREADO: { label: "Creado", chip: "bg-sky-50 text-sky-700 border-sky-200", icon: <Clock size={12} /> },
  RECHAZADO: { label: "Rechazado", chip: "bg-red-50 text-red-700 border-red-200", icon: <XCircle size={12} /> },
  CARGADO: { label: "Cargado", chip: "bg-violet-50 text-violet-700 border-violet-200", icon: <Truck size={12} /> },
  ENTREGADO: { label: "Entregado", chip: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <PackageCheck size={12} /> },
};

export function EtiquetaEstado({ estado }: { estado: EstadoPedidoArtesano }) {
  // El historial de pedidos viejos puede traer el estado AUTORIZADO, que ya no existe.
  const cfg = ESTADO_ARTESANO_CFG[estado] ?? { label: String(estado).charAt(0) + String(estado).slice(1).toLowerCase(), chip: "bg-gray-50 text-gray-600 border-gray-200", icon: <Clock size={12} /> };

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${cfg.chip}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// Mismo formato de chip que EstadoPedidoBadge de las vistas de pedidos.
const PAGO_CFG: Record<CondicionPagoArtesano, { label: string; chip: string }> = {
  DEPOSITO: { label: "Depósito", chip: "bg-green-50 text-green-700 border-green-200" },
  PLANILLA: { label: "Descuento de planilla", chip: "bg-amber-50 text-amber-700 border-amber-200" },
  PENDIENTE: { label: "Pago pendiente", chip: "bg-red-50 text-red-700 border-red-200" },
};

export function EtiquetaPago({ pedido }: { pedido: PedidoArtesano }) {
  const cfg = PAGO_CFG[pedido.condicion_pago];

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${cfg.chip}`}>
      <CreditCard size={12} /> {cfg.label}
    </span>
  );
}

function SeguimientoPedido({ pedido }: { pedido: PedidoArtesano }) {
  const datos: { titulo: string; valor: string }[] = [];

  if (pedido.rechazado_por) {
    datos.push({
      titulo: "Rechazado por",
      valor: `${pedido.rechazado_por} · ${formatearFechaCorta(pedido.fecha_rechazo)}`,
    });
  }
  if (pedido.nombre_piloto) {
    datos.push({ titulo: "Piloto", valor: pedido.codigo_piloto ? `${pedido.nombre_piloto} (${pedido.codigo_piloto})` : pedido.nombre_piloto });
  }
  if (pedido.cargado_por) {
    datos.push({ titulo: "Cargado por", valor: `${pedido.cargado_por} · ${formatearFechaCorta(pedido.fecha_carga)}` });
  }
  if (pedido.entregado_por) {
    datos.push({ titulo: "Entregado por", valor: `${pedido.entregado_por} · ${formatearFechaCorta(pedido.fecha_entrega)}` });
  }

  return (
    <div className="space-y-3">
      {pedido.estado === "RECHAZADO" && pedido.motivo_rechazo && (
        <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-red-700">Motivo del rechazo</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{pedido.motivo_rechazo}</p>
        </div>
      )}
      {datos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {datos.map((d) => (
            <div key={d.titulo}>
              <p className="text-xs text-gray-400">{d.titulo}</p>
              <p className="text-gray-800">{d.valor}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Registra el pago de un pedido que se creó con pago pendiente.
function CompletarPagoModal({
  pedido,
  onClose,
  onCompletado,
}: {
  pedido: PedidoArtesano;
  onClose: () => void;
  onCompletado: () => void;
}) {
  const [condicion, setCondicion] = useState<"DEPOSITO" | "PLANILLA">("DEPOSITO");
  const [boleta, setBoleta] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const guardar = async () => {
    setGuardando(true);
    setError(null);

    try {
      await completarPagoArtesano(pedido.id, condicion, condicion === "DEPOSITO" ? boleta.trim() || null : null);
      onCompletado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar el pago");
      setGuardando(false);
    }
  };

  return (
    <ModalBase
      titulo="Completar pago"
      subtitulo={`${pedido.serie} ${pedido.numero_pedido} · ${pedido.cliente_nombre}`}
      deshabilitarCierre={guardando}
      onClose={onClose}
    >
      <div className="px-6 py-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(["DEPOSITO", "PLANILLA"] as const).map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => setCondicion(opcion)}
              className={`h-11 rounded-md border text-sm font-medium transition-colors ${
                condicion === opcion ? "border-[#2183AE] bg-[#2183AE] text-white shadow" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {PAGO_CFG[opcion].label}
            </button>
          ))}
        </div>

        {condicion === "DEPOSITO" ? (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Número de boleta (opcional)</label>
            <Input value={boleta} onChange={(e) => setBoleta(e.target.value)} maxLength={50} />
          </div>
        ) : (
          <p className="text-xs text-gray-500">El descuento de planilla es solo para clientes con código de empleado.</p>
        )}

        {error && <BannerMensaje tipo="error" texto={error} />}
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
        <Button onClick={onClose} disabled={guardando} variant="outline" size="sm">
          Cancelar
        </Button>
        <Button onClick={guardar} disabled={guardando} variant="success" size="sm">
          {guardando && <Loader2 size={14} className="animate-spin mr-1.5" />}
          Registrar pago
        </Button>
      </div>
    </ModalBase>
  );
}

function TarjetaArtesano({
  pedido,
  onEditar,
  puedeCompletarPago = false,
  onCambio,
}: {
  pedido: PedidoArtesano;
  onEditar?: (pedido: PedidoArtesano) => void;
  puedeCompletarPago?: boolean;
  onCambio?: () => void;
}) {
  const [abierta, setAbierta] = useState(false);
  const [completandoPago, setCompletandoPago] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [urlPdf, setUrlPdf] = useState<string | null>(null);
  const [errorPdf, setErrorPdf] = useState<string | null>(null);

  // El envío se imprime solo cuando el pedido ya se cargó.
  const puedeImprimir = pedido.estado === "CARGADO" || pedido.estado === "ENTREGADO";

  const imprimir = async () => {
    setGenerandoPdf(true);
    setErrorPdf(null);

    try {
      setUrlPdf(await getPdfEnviosArtesano([pedido.id], true));
    } catch (err) {
      setErrorPdf(err instanceof Error ? err.message : "Error al generar el PDF del envío");
    } finally {
      setGenerandoPdf(false);
    }
  };

  const cerrarPdf = () => {
    if (urlPdf) window.URL.revokeObjectURL(urlPdf);
    setUrlPdf(null);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setAbierta((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
          <User size={14} className="text-gray-500" />
        </span>
        <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{pedido.cliente_nombre}</span>
        <span className="text-xs text-gray-400 shrink-0 hidden sm:inline">
          {pedido.serie} {pedido.numero_pedido}
        </span>
        <EtiquetaEstado estado={pedido.estado} />
        <EtiquetaPago pedido={pedido} />
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
                Pedido: <span className="font-medium text-gray-700">{pedido.serie} {pedido.numero_pedido}</span>
              </span>
              <span>
                Entrega: <span className="font-medium text-gray-700">{formatearFechaCorta(pedido.fecha_requerida)}</span>
              </span>
              <span>{pedido.nombre_ruta}</span>
              {pedido.condicion_pago === "DEPOSITO" && pedido.numero_boleta && <span>Boleta {pedido.numero_boleta}</span>}
              <span className="sm:hidden">{pedido.items.length} ítems</span>
            </div>

            <div className="px-4 py-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {pedido.direccion_entrega && (
                  <div>
                    <p className="text-xs text-gray-400">Dirección de entrega</p>
                    <p className="text-gray-800 flex items-start gap-1.5">
                      <MapPin size={13} className="text-[#2183AE] mt-1 shrink-0" /> {pedido.direccion_entrega}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400">Cliente</p>
                  <p className="text-gray-800">{pedido.cliente_nombre}</p>
                  {pedido.cliente_nit && <p className="text-xs text-gray-400">NIT {pedido.cliente_nit}</p>}
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
                </div>
                <div>
                  <p className="text-xs text-gray-400">Fecha de creación</p>
                  <p className="text-gray-800">{formatearFechaCorta(pedido.creado_en)}</p>
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
                    <p className="text-sm text-gray-600 tabular-nums shrink-0 text-right">
                      {item.cantidad_autorizada !== null && item.cantidad_autorizada !== item.cantidad ? (
                        <>
                          <span className="line-through text-gray-400 mr-1.5">{item.cantidad}</span>
                          <span className="font-medium text-amber-700">{item.cantidad_autorizada}</span>
                        </>
                      ) : (
                        item.cantidad
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <SeguimientoPedido pedido={pedido} />

              {errorPdf && <p className="text-xs text-red-600">{errorPdf}</p>}

              {((pedido.estado === "CREADO" && onEditar) || puedeImprimir || (puedeCompletarPago && pedido.condicion_pago === "PENDIENTE" && pedido.estado !== "RECHAZADO")) && (
                <div className="flex flex-wrap justify-end gap-2">
                  {pedido.estado === "CREADO" && onEditar && (
                    <Button onClick={() => onEditar(pedido)} variant="outline" size="sm">
                      <Pencil size={14} className="mr-1.5" />
                      Modificar pedido
                    </Button>
                  )}
                  {puedeCompletarPago && pedido.condicion_pago === "PENDIENTE" && pedido.estado !== "RECHAZADO" && (
                    <Button onClick={() => setCompletandoPago(true)} variant="outline" size="sm">
                      <CreditCard size={14} className="mr-1.5" />
                      Completar pago
                    </Button>
                  )}
                  {puedeImprimir && (
                    <Button onClick={imprimir} disabled={generandoPdf} variant="outline" size="sm">
                      {generandoPdf ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Printer size={14} className="mr-1.5" />}
                      Imprimir envío
                    </Button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {urlPdf && <VisorPdf url={urlPdf} onClose={cerrarPdf} />}
      {completandoPago && (
        <CompletarPagoModal
          pedido={pedido}
          onClose={() => setCompletandoPago(false)}
          onCompletado={() => {
            setCompletandoPago(false);
            onCambio?.();
          }}
        />
      )}
    </div>
  );
}

function NuevoClienteModal({
  onCreado,
  onClose,
}: {
  onCreado: (cliente: ClienteAvicola) => void;
  onClose: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [codigoEmpleado, setCodigoEmpleado] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Los empleados no tienen dirección de entrega: basta con su código de empleado.
  const incompleto = nombre.trim() === "" || (direccion.trim() === "" && codigoEmpleado.trim() === "");

  const handleGuardar = async () => {
    setGuardando(true);
    setError(null);

    try {
      onCreado(
        await crearClienteAvicola({
          nombre: nombre.trim(),
          nit: nit.trim() || null,
          direccion: direccion.trim(),
          telefono: telefono.trim() || null,
          codigo_empleado: codigoEmpleado.trim() || null,
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear el cliente");
      setGuardando(false);
    }
  };

  return (
    <ModalBase titulo="Nuevo cliente" deshabilitarCierre={guardando} onClose={onClose}>
      <div className="px-6 py-5 space-y-3 overflow-y-auto min-h-0">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={250} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">NIT</label>
          <Input value={nit} onChange={(e) => setNit(e.target.value)} maxLength={20} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Dirección de entrega {codigoEmpleado.trim() === "" ? "*" : ""}</label>
          <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={250} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Teléfono de contacto</label>
          <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={30} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Código de empleado (solo si es empleado de la empresa)</label>
          <Input value={codigoEmpleado} onChange={(e) => setCodigoEmpleado(e.target.value)} maxLength={20} placeholder="AL 8641" />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
        <Button onClick={onClose} disabled={guardando} variant="cancel" size="sm">
          Cancelar
        </Button>
        <Button onClick={handleGuardar} disabled={guardando || incompleto} variant="submit" size="sm">
          {guardando && <Loader2 size={14} className="animate-spin mr-1.5" />}
          Guardar cliente
        </Button>
      </div>
    </ModalBase>
  );
}

interface FiltrosBusqueda {
  usuario: string;
  estado: "" | EstadoPedidoArtesano;
  numero: string;
  fechaDesde: string;
  fechaHasta: string;
}

// numeroInicial: si viene, busca ese pedido al abrir (el que se acaba de crear o modificar).
function BuscarPedidos({
  numeroInicial,
  onEditar,
}: {
  numeroInicial: string;
  onEditar?: (pedido: PedidoArtesano) => void;
}) {
  const [usuarios, setUsuarios] = useState<UsuarioArtesano[]>([]);
  const [usuario, setUsuario] = useState("");
  const [estado, setEstado] = useState<"" | EstadoPedidoArtesano>("");
  const [numero, setNumero] = useState(numeroInicial);
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  // Filtros con los que se hizo la última búsqueda: al cambiar de página se
  // usan estos, no lo que se esté editando en los campos.
  const [aplicados, setAplicados] = useState<FiltrosBusqueda>({
    usuario: "",
    estado: "",
    numero: numeroInicial,
    fechaDesde: "",
    fechaHasta: "",
  });
  const [pedidos, setPedidos] = useState<PedidoArtesano[]>([]);
  const [paginacion, setPaginacion] = useState<Paginacion>({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
  const [buscando, setBuscando] = useState(numeroInicial !== "");
  const [yaBusco, setYaBusco] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fechasInvertidas = fechaDesde !== "" && fechaHasta !== "" && fechaDesde > fechaHasta;

  useEffect(() => {
    getUsuariosArtesano()
      .then(setUsuarios)
      .catch(() => setUsuarios([]));
  }, []);

  const buscar = async (pagina: number, filtros: FiltrosBusqueda) => {
    setBuscando(true);
    setError(null);

    try {
      const resultado = await getPedidosArtesano({
        id_usuario: filtros.usuario || undefined,
        estados: filtros.estado ? [filtros.estado] : undefined,
        numero: filtros.numero.trim() || undefined,
        fechaDesde: filtros.fechaDesde || undefined,
        fechaHasta: filtros.fechaHasta || undefined,
        page: pagina,
      });

      setPedidos(resultado.pedidos);
      setPaginacion(resultado.paginacion);
      setYaBusco(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar los pedidos");
    } finally {
      setBuscando(false);
    }
  };

  // Al abrir con un número (el pedido que se acaba de crear o modificar), lo busca.
  useEffect(() => {
    if (!numeroInicial) return;

    let vigente = true;

    getPedidosArtesano({ numero: numeroInicial })
      .then((resultado) => {
        if (!vigente) return;
        setPedidos(resultado.pedidos);
        setPaginacion(resultado.paginacion);
        setYaBusco(true);
      })
      .catch((err) => {
        if (vigente) setError(err instanceof Error ? err.message : "Error al buscar los pedidos");
      })
      .finally(() => {
        if (vigente) setBuscando(false);
      });

    return () => {
      vigente = false;
    };
  }, [numeroInicial]);

  const handleBuscar = () => {
    const filtros: FiltrosBusqueda = { usuario, estado, numero, fechaDesde, fechaHasta };
    setAplicados(filtros);
    buscar(1, filtros);
  };

  // Exporta los pedidos de la última búsqueda (con sus mismos filtros).
  const handleExportar = async () => {
    setExportando(true);
    setError(null);

    try {
      await exportarPedidosArtesano({
        id_usuario: aplicados.usuario || undefined,
        estados: aplicados.estado ? [aplicados.estado] : undefined,
        numero: aplicados.numero.trim() || undefined,
        fechaDesde: aplicados.fechaDesde || undefined,
        fechaHasta: aplicados.fechaHasta || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar los pedidos");
    } finally {
      setExportando(false);
    }
  };

  const handleLimpiar = () => {
    setUsuario("");
    setEstado("");
    setNumero("");
    setFechaDesde("");
    setFechaHasta("");
    setPedidos([]);
    setPaginacion({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
    setYaBusco(false);
    setError(null);
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Usuario</label>
            <select
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
            >
              <option value="">Todos los usuarios</option>
              {usuarios.map((u) => (
                <option key={u.id_usuario} value={u.id_usuario}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Estado</label>
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as "" | EstadoPedidoArtesano)}
              className="w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
            >
              <option value="">Todos los estados</option>
              {ESTADOS_ARTESANO.map((e) => (
                <option key={e} value={e}>
                  {ESTADO_ARTESANO_CFG[e].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Número de pedido</label>
            <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="PA-2026-000001" maxLength={30} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Requerido desde</label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Requerido hasta</label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
        </div>
        {fechasInvertidas && <p className="text-xs text-red-600 mt-2">La fecha inicial no puede ser mayor que la final.</p>}

        <div className="flex gap-2 mt-3">
          <Button onClick={handleBuscar} disabled={buscando || fechasInvertidas} size="sm" variant="submit">
            {buscando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Search size={14} className="mr-1.5" />}
            Buscar
          </Button>
          <Button onClick={handleLimpiar} disabled={buscando} size="sm" variant="outline">
            <Eraser size={14} className="mr-1.5" />
            Limpiar
          </Button>
          <Button onClick={handleExportar} disabled={exportando || buscando || !yaBusco || pedidos.length === 0} size="sm" variant="outline">
            {exportando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Download size={14} className="mr-1.5" />}
            Descargar Excel
          </Button>
        </div>
      </div>

      {error && <BannerMensaje tipo="error" texto={error} />}

      {!yaBusco && !buscando && !error && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <Egg size={24} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Define los filtros y presiona Buscar para ver los pedidos.</p>
        </div>
      )}

      {yaBusco && pedidos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <Inbox size={24} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No se encontraron pedidos con esos filtros.</p>
        </div>
      )}

      {pedidos.length > 0 && (
        <div className="space-y-2.5">
          {pedidos.map((pedido) => (
            <TarjetaArtesano
              key={pedido.id}
              pedido={pedido}
              onEditar={onEditar}
              puedeCompletarPago={!!onEditar}
              onCambio={() => buscar(paginacion.page, aplicados)}
            />
          ))}
        </div>
      )}

      <ControlesPaginacion
        paginacion={paginacion}
        cargando={buscando}
        onCambiar={(pagina) => buscar(pagina, aplicados)}
      />
    </>
  );
}

interface LineaPedido {
  codigo_producto: string;
  cantidad: string;
}

function EncabezadoSeccion({ icono, titulo, subtitulo }: { icono: ReactNode; titulo: string; subtitulo: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <div className="w-10 h-10 rounded-xl bg-[#2183AE] flex items-center justify-center shadow-md shrink-0">{icono}</div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{titulo}</h3>
        <p className="text-xs text-gray-600">{subtitulo}</p>
      </div>
    </div>
  );
}

// pedido: si viene, el formulario modifica ese pedido (solo posible en estado CREADO).
function NuevoPedido({
  pedido,
  onGuardado,
  onCancelarEdicion,
}: {
  pedido: PedidoArtesano | null;
  onGuardado: (mensaje: string, pedido: PedidoArtesano) => void;
  onCancelarEdicion: () => void;
}) {
  const [rutas, setRutas] = useState<RutaPollo[]>([]);
  // Tiendas asignadas a la ruta elegida (tbl_tiendas_rutas_pollo, asignación vigente).
  const [tiendasRuta, setTiendasRuta] = useState<TiendaRutaPollo[]>([]);
  const [cargandoTiendas, setCargandoTiendas] = useState(false);
  const [errorTiendas, setErrorTiendas] = useState<string | null>(null);
  const [clientes, setClientes] = useState<ClienteAvicola[]>([]);
  const [productos, setProductos] = useState<ProductoArtesano[]>([]);
  const [cargandoDatos, setCargandoDatos] = useState(true);
  const [errorDatos, setErrorDatos] = useState<string | null>(null);

  const [fechaRequerida, setFechaRequerida] = useState(pedido ? pedido.fecha_requerida.slice(0, 10) : "");
  const [rutaId, setRutaId] = useState(pedido?.ruta_id ?? "");
  const [tiendaId, setTiendaId] = useState("");
  const [clienteId, setClienteId] = useState(pedido?.cliente_id ?? "");
  const [direccion, setDireccion] = useState(pedido?.direccion_entrega ?? "");
  const [telefono, setTelefono] = useState(pedido?.telefono_contacto ?? "");
  const [lineas, setLineas] = useState<LineaPedido[]>(
    pedido ? pedido.items.map((i) => ({ codigo_producto: i.codigo_producto, cantidad: String(i.cantidad) })) : []
  );
  const [condicionPago, setCondicionPago] = useState<CondicionPagoArtesano>(pedido?.condicion_pago ?? "DEPOSITO");
  const [numeroBoleta, setNumeroBoleta] = useState(pedido?.numero_boleta ?? "");
  const [comentario, setComentario] = useState(pedido?.comentario ?? "");
  const [mostrarNuevoCliente, setMostrarNuevoCliente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getRutasPollo(), buscarClientesAvicola(""), getProductosArtesano()])
      .then(([listaRutas, listaClientes, listaProductos]) => {
        setRutas(listaRutas.filter((r) => r.activo));
        setClientes(listaClientes);
        setProductos(listaProductos);
        // Si solo hay un código de artesano, la línea ya viene lista (al crear).
        if (!pedido && listaProductos.length === 1) setLineas([{ codigo_producto: listaProductos[0].codigo_producto, cantidad: "1" }]);
      })
      .catch((err) => setErrorDatos(err instanceof Error ? err.message : "Error al cargar los datos del formulario"))
      .finally(() => setCargandoDatos(false));
  }, [pedido]);

  const opcionesRutas = useMemo(
    () => rutas.map((r) => ({ id: r.id, name: `${r.nombre_ruta} · ${nombreMuelle(r.whs_code_origen)}` })),
    [rutas]
  );

  // Al cambiar de ruta se cargan sus tiendas; se ignora la respuesta si mientras
  // tanto se eligió otra ruta.
  useEffect(() => {
    // Al modificar un pedido, la tienda de referencia vuelve a elegirse con su ruta original.
    setTiendaId(pedido && rutaId === pedido.ruta_id ? (pedido.codigo_tienda_referencia ?? "") : "");
    setTiendasRuta([]);
    setErrorTiendas(null);

    if (!rutaId) return;

    let vigente = true;
    setCargandoTiendas(true);

    getTiendasDeRuta(rutaId)
      .then((lista) => {
        if (vigente) setTiendasRuta(lista);
      })
      .catch((err) => {
        if (vigente) setErrorTiendas(err instanceof Error ? err.message : "Error al cargar las tiendas de la ruta");
      })
      .finally(() => {
        if (vigente) setCargandoTiendas(false);
      });

    return () => {
      vigente = false;
    };
  }, [rutaId, pedido]);

  const opcionesTiendas = useMemo(
    () =>
      tiendasRuta.map((t) => ({
        id: t.id_tienda_simphony,
        name: t.nombre_tienda || t.codigo_tienda || t.id_tienda_simphony,
      })),
    [tiendasRuta]
  );

  const opcionesClientes = useMemo(
    () => clientes.map((c) => ({ id: c.id, name: c.nit ? `${c.nombre} · ${c.nit}` : c.nombre })),
    [clientes]
  );

  const cliente = clientes.find((c) => c.id === clienteId) ?? null;
  const productosDisponibles = productos.filter((p) => !lineas.some((l) => l.codigo_producto === p.codigo_producto));

  const seleccionarCliente = (id: string) => {
    setClienteId(id);
    setDireccion(clientes.find((c) => c.id === id)?.direccion ?? "");
    setTelefono(clientes.find((c) => c.id === id)?.telefono ?? "");
  };

  const actualizarLinea = (indice: number, cambios: Partial<LineaPedido>) => {
    setLineas((prev) => prev.map((l, i) => (i === indice ? { ...l, ...cambios } : l)));
  };

  const problemas: string[] = [];
  if (!fechaRequerida) problemas.push("Elige la fecha requerida.");
  else if (fechaRequerida < hoy()) problemas.push("La fecha requerida no puede ser anterior a hoy.");
  if (!rutaId) problemas.push("Elige la ruta.");
  else if (!tiendaId) problemas.push("Elige la tienda de referencia.");
  if (!clienteId) problemas.push("Elige el cliente.");
  else if (direccion.trim() === "" && !cliente?.codigo_empleado) problemas.push("El cliente necesita una dirección de entrega.");
  if (lineas.length === 0 || lineas.some((l) => !(Number(l.cantidad) > 0))) problemas.push("Cada producto necesita una cantidad mayor a 0.");
  if (condicionPago === "PLANILLA" && cliente && !cliente.codigo_empleado) problemas.push("El descuento de planilla es solo para clientes con código de empleado.");

  const handleGuardar = async () => {
    setEnviando(true);
    setErrorEnvio(null);

    try {
      const datos = {
        fecha_requerida: fechaRequerida,
        ruta_id: rutaId,
        id_tienda_simphony_referencia: tiendaId,
        cliente_id: clienteId,
        direccion: direccion.trim(),
        telefono_contacto: telefono.trim() || null,
        condicion_pago: condicionPago,
        numero_boleta: condicionPago === "DEPOSITO" ? numeroBoleta.trim() || null : null,
        comentario: comentario.trim() || null,
        items: lineas.map((l) => ({ codigo_producto: l.codigo_producto, cantidad: Number(l.cantidad) })),
      };

      const guardado = pedido ? await editarPedidoArtesano({ id: pedido.id, ...datos }) : await crearPedidoArtesano(datos);

      onGuardado(
        pedido
          ? `Pedido ${guardado.numero_pedido} modificado.`
          : `Pedido ${guardado.numero_pedido} creado para ${guardado.cliente_nombre}.`,
        guardado
      );
    } catch (err) {
      setErrorEnvio(err instanceof Error ? err.message : pedido ? "No se pudo modificar el pedido" : "No se pudo crear el pedido");
      setEnviando(false);
    }
  };

  if (cargandoDatos) {
    return (
      <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-14">
        <Loader2 size={18} className="animate-spin" /> Cargando formulario…
      </div>
    );
  }

  if (errorDatos) return <BannerMensaje tipo="error" texto={errorDatos} />;

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
      <div className="mb-6">
        <EncabezadoSeccion icono={<Truck className="h-5 w-5 text-white" />} titulo="Datos del pedido" subtitulo="Fecha requerida y ruta por la que sale" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-700 mb-1.5 block">Fecha Requerida *</Label>
            <Input type="date" min={hoy()} value={fechaRequerida} onChange={(e) => setFechaRequerida(e.target.value)} className="h-11" />
          </div>
          <div>
            <Label className="text-xs text-gray-700 mb-1.5 block">Ruta *</Label>
            <Combobox
              options={opcionesRutas}
              value={rutaId}
              onChange={setRutaId}
              placeholder="Seleccione una ruta"
              searchPlaceholder="Buscar ruta por nombre..."
              emptyMessage="No se encontraron rutas"
              className="h-11"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs text-gray-700 block mb-1.5">Tienda de referencia (solo para saber la ruta, no es la entrega)</Label>
            <Combobox
              options={opcionesTiendas}
              value={tiendaId}
              onChange={setTiendaId}
              disabled={!rutaId || cargandoTiendas}
              placeholder={
                !rutaId
                  ? "Primero selecciona una ruta"
                  : cargandoTiendas
                    ? "Cargando tiendas..."
                    : opcionesTiendas.length === 0
                      ? "La ruta no tiene tiendas asignadas"
                      : "Selecciona una tienda"
              }
              searchPlaceholder="Buscar tienda por nombre..."
              emptyMessage="No se encontraron tiendas"
              className="h-11"
            />
            {errorTiendas && <p className="text-xs text-red-600 mt-1.5">{errorTiendas}</p>}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <EncabezadoSeccion icono={<User className="h-5 w-5 text-white" />} titulo="Cliente" subtitulo="A quién se le entrega el pedido y en qué dirección" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs text-gray-700 block">Cliente *</Label>
              <button
                type="button"
                onClick={() => setMostrarNuevoCliente(true)}
                className="text-xs text-[#2183AE] hover:underline inline-flex items-center gap-1"
              >
                <UserPlus className="h-3 w-3" /> Nuevo cliente
              </button>
            </div>
            <Combobox
              options={opcionesClientes}
              value={clienteId}
              onChange={seleccionarCliente}
              placeholder="Seleccione un cliente"
              searchPlaceholder="Buscar por nombre o NIT..."
              emptyMessage="No se encontraron clientes"
              className="h-11"
            />
          </div>

          {cliente && (
            <div className="sm:col-span-2">
              <p className="text-xs text-gray-500 mb-3">
                {cliente.nit ? `NIT ${cliente.nit}` : "Sin NIT"}
                {cliente.codigo_empleado ? ` · Empleado ${cliente.codigo_empleado}` : ""}
              </p>
              <Label className="text-xs text-gray-700 mb-1.5 block">Dirección de entrega {cliente.codigo_empleado ? "" : "*"}</Label>
              <Input value={direccion} onChange={(e) => setDireccion(e.target.value)} maxLength={250} className="h-11" />
              {!cliente.direccion && !cliente.codigo_empleado && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
                  Este cliente no tenía dirección de entrega: se guardará la que escribas.
                </p>
              )}
              <Label className="text-xs text-gray-700 mt-3 mb-1.5 block">Teléfono de contacto</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} maxLength={30} className="h-11" />
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <EncabezadoSeccion icono={<Package className="h-5 w-5 text-white" />} titulo="Productos del pedido" subtitulo="Producto y cantidad que se despacha" />
        <div className="space-y-2">
          {lineas.map((linea, indice) => {
            const producto = productos.find((p) => p.codigo_producto === linea.codigo_producto);
            const cantidad = Math.max(0, Number(linea.cantidad) || 0);

            return (
              <div key={linea.codigo_producto} className="border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 break-words">{producto?.descripcion_producto ?? linea.codigo_producto}</p>
                  <p className="text-xs text-gray-500 font-mono break-words">{linea.codigo_producto}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div>
                    <Label className="text-[10px] uppercase font-bold text-gray-500 block mb-1">Cantidad</Label>
                    <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden w-fit">
                      <button
                        type="button"
                        onClick={() => actualizarLinea(indice, { cantidad: String(Math.max(1, cantidad - 1)) })}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 shrink-0"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        value={linea.cantidad}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => actualizarLinea(indice, { cantidad: e.target.value })}
                        className="w-14 h-9 text-center text-sm border-x border-gray-300 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => actualizarLinea(indice, { cantidad: String(cantidad + 1) })}
                        className="w-9 h-9 flex items-center justify-center text-gray-600 hover:bg-gray-100 active:bg-gray-200 shrink-0"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {lineas.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => setLineas((prev) => prev.filter((_, i) => i !== indice))}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-red-50 shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {productosDisponibles.length > 0 && (
          <div className="mt-3 w-full sm:w-72">
            <Combobox
              options={productosDisponibles.map((p) => ({ id: p.codigo_producto, name: p.descripcion_producto }))}
              value=""
              onChange={(codigo) => setLineas((prev) => [...prev, { codigo_producto: codigo, cantidad: "1" }])}
              placeholder="+ Agregar producto"
              searchPlaceholder="Buscar producto..."
              emptyMessage="No hay más productos"
              className="h-11"
            />
          </div>
        )}
      </div>

      <div className="mb-6">
        <EncabezadoSeccion icono={<CreditCard className="h-5 w-5 text-white" />} titulo="Pago y comentario" subtitulo="Depósito, descuento de planilla o pago pendiente" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-gray-700 mb-1.5 block">Condición de pago *</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(["DEPOSITO", "PLANILLA", "PENDIENTE"] as const).map((condicion) => (
                <button
                  key={condicion}
                  type="button"
                  onClick={() => setCondicionPago(condicion)}
                  className={`h-11 rounded-md border text-sm font-medium transition-colors ${
                    condicionPago === condicion
                      ? "border-[#2183AE] bg-[#2183AE] text-white shadow"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {PAGO_CFG[condicion].label}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence initial={false}>
            {condicionPago === "DEPOSITO" && (
              <motion.div
                key="boleta"
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
              >
                <Label className="text-xs text-gray-700 mb-1.5 block">Número de boleta (opcional)</Label>
                <Input value={numeroBoleta} onChange={(e) => setNumeroBoleta(e.target.value)} maxLength={50} className="h-11" />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="sm:col-span-2">
            <Label className="text-xs text-gray-700 mb-1.5 block">Comentario</Label>
            <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} rows={3} maxLength={500} placeholder="Indicaciones de la entrega..." />
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        {problemas.length > 0 && (
          <ul className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-4 space-y-0.5 list-disc pl-8">
            {problemas.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}
        {errorEnvio && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 mb-4">{errorEnvio}</p>}

        <div className="flex flex-col sm:flex-row gap-2">
          {pedido && (
            <Button onClick={onCancelarEdicion} disabled={enviando} variant="outline" className="sm:w-40">
              Cancelar
            </Button>
          )}
          <Button
            onClick={handleGuardar}
            disabled={enviando || problemas.length > 0}
            className="flex-1 border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
          >
            {enviando ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : pedido ? (
              "Guardar cambios del pedido"
            ) : (
              "Crear Pedido de Pollo Artesano"
            )}
          </Button>
        </div>
      </div>

      {mostrarNuevoCliente && (
        <NuevoClienteModal
          onClose={() => setMostrarNuevoCliente(false)}
          onCreado={(nuevo) => {
            setClientes((prev) => [...prev, nuevo]);
            setClienteId(nuevo.id);
            setDireccion(nuevo.direccion ?? "");
            setTelefono(nuevo.telefono ?? "");
            setMostrarNuevoCliente(false);
          }}
        />
      )}
    </div>
  );
}

export function PedidosArtesanoView() {
  const [tab, setTab] = useState<"buscar" | "crear">("buscar");
  const [aviso, setAviso] = useState<string | null>(null);
  // Crear pedidos pide el nivel 'escritura' del menú; con otro nivel solo se busca.
  const [puedeCrear, setPuedeCrear] = useState(false);

  // Pedido que se está modificando (solo los CREADO) y la búsqueda que se hace al
  // volver de guardar, para que se vea el pedido con sus cambios.
  const [pedidoEnEdicion, setPedidoEnEdicion] = useState<PedidoArtesano | null>(null);
  const [busquedaInicial, setBusquedaInicial] = useState<{ id: number; numero: string } | null>(null);

  const irABuscar = () => {
    setPedidoEnEdicion(null);
    setBusquedaInicial(null);
    setTab("buscar");
  };

  const irACrear = () => {
    setPedidoEnEdicion(null);
    setBusquedaInicial(null);
    setAviso(null);
    setTab("crear");
  };

  const modificarPedido = (pedido: PedidoArtesano) => {
    setPedidoEnEdicion(pedido);
    setAviso(null);
    setTab("crear");
  };

  const terminarGuardado = (mensaje: string, pedido: PedidoArtesano) => {
    setAviso(mensaje);
    setPedidoEnEdicion(null);
    setBusquedaInicial({ id: Date.now(), numero: pedido.numero_pedido });
    setTab("buscar");
  };

  useEffect(() => {
    getAllMenus()
      .then((menus) => {
        const propio = menus.find((m) => m.nombre_menu === "PedidosArtesanoView");
        setPuedeCrear((propio?.nivel_permiso || "escritura") === "escritura");
      })
      .catch(() => setPuedeCrear(false));
  }, []);

  return (
    <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Egg className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold leading-tight">Pollo Artesano</h2>
              <p className="text-sm text-white/90">Busca los pedidos realizados o crea uno nuevo para un cliente</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm w-fit">
          <button
            onClick={irABuscar}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === "buscar" ? "bg-[#2183AE] text-white shadow" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Search className="h-4 w-4" /> Buscar Pedidos
          </button>
          {puedeCrear && (
            <button
              onClick={irACrear}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                tab === "crear" ? "bg-[#2183AE] text-white shadow" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {pedidoEnEdicion ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {pedidoEnEdicion ? "Modificar Pedido" : "Crear Pedido"}
            </button>
          )}
        </div>

        {aviso && <BannerMensaje tipo="ok" texto={aviso} onCerrar={() => setAviso(null)} />}

        {tab === "crear" && puedeCrear ? (
          <NuevoPedido
            key={pedidoEnEdicion?.id ?? "nuevo"}
            pedido={pedidoEnEdicion}
            onGuardado={terminarGuardado}
            onCancelarEdicion={irABuscar}
          />
        ) : (
          <BuscarPedidos
            key={busquedaInicial?.id ?? 0}
            numeroInicial={busquedaInicial?.numero ?? ""}
            onEditar={puedeCrear ? modificarPedido : undefined}
          />
        )}
      </div>
    </div>
  );
}
