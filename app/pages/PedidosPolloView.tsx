import { useState, useEffect, useMemo, ReactNode } from "react";
import {
  ChevronDown, ChevronUp,
  Truck, Store,
  ShoppingCart,
  XIcon,
  Package,
  Loader2,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Scale,
  ListOrdered,
  Save,
  Lock,
  Unlock,
  Anchor,
  User,
  Pencil,
  Check,
  Send,
  FileText,
} from "lucide-react";
import { format, addDays } from "date-fns";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { motion, AnimatePresence } from "motion/react";
import { getPedidosPos, getComparativoStockPollo, enviarTransferenciaPollo, previsualizarTicketPollo, firmarTicketPollo } from "../api/PedidoPosApi";
import { guardarAsignacionCantidades } from "../api/AsignacionApi";
import { PedidoPosRuta, PedidoPosTienda } from "../types/PedidoPosModel";
import { ComparativoStockItem } from "../types/StockModel";
import { GrupoArticuloFifo } from "../types/AsignacionModel";
import { getPilotos, getAsignacionesTransporte, asignarTransporte } from "../api/TrasporteApi";
import { getAllCamiones } from "../api/CamionApi";
import { PilotoUsuario, AsignacionTransporte } from "../types/TransporteModel";
import { CamionModel } from "../types/CamionModel";
import {
  getRutasPollo,
  getMuelleUsuario,
  getCandadoActivo,
  tomarCandado,
  liberarCandado,
} from "../api/RutaPolloApi";
import { RutaPollo, MuelleUsuario, CandadoRutaPollo } from "../types/RutaPolloModel";

function nombrePiloto(p: PilotoUsuario) {
  return [p.first_name, p.second_name, p.first_last_name, p.second_last_name].filter(Boolean).join(" ");
}

function estadoItemStock(item: ComparativoStockItem): "ok" | "parcial" | "sin_stock" | "no_encontrado" {
  if (!item.encontrado_en_sap) return "no_encontrado";
  if (item.diferencia >= 0) return "ok";
  if (item.stock_disponible > 0) return "parcial";
  return "sin_stock";
}

const ESTADO_STOCK_CFG = {
  ok:            { label: "Cubierto",        chip: "bg-green-50 text-green-700 border-green-200",  icon: <CheckCircle2 size={13} /> },
  parcial:       { label: "Parcial",         chip: "bg-amber-50 text-amber-700 border-amber-200",  icon: <AlertTriangle size={13} /> },
  sin_stock:     { label: "Sin stock",       chip: "bg-red-50 text-red-700 border-red-200",        icon: <XCircle size={13} /> },
  no_encontrado: { label: "No existe en SAP", chip: "bg-gray-100 text-gray-500 border-gray-200",    icon: <AlertCircle size={13} /> },
};

const ESTADO_PEDIDO_CFG: Record<string, { label: string; chip: string; icon: ReactNode }> = {
  PENDIENTE_ENRIQUECIMIENTO: { label: "Pendiente enriquecimiento", chip: "bg-gray-100 text-gray-500 border-gray-200", icon: <AlertCircle size={12} /> },
  RECIBIDO:       { label: "Recibido",       chip: "bg-gray-100 text-gray-600 border-gray-200",   icon: <CheckCircle2 size={12} /> },
  VALIDADO:       { label: "Validado",       chip: "bg-amber-50 text-amber-700 border-amber-200", icon: <CheckCircle2 size={12} /> },
  EN_TRANSITO:    { label: "En tránsito",    chip: "bg-green-50 text-green-700 border-green-200", icon: <Truck size={12} /> },
  ERROR_ENVIO_SAP: { label: "Error al enviar", chip: "bg-red-50 text-red-700 border-red-200",       icon: <XCircle size={12} /> },
  MIXTO:          { label: "Mixto",          chip: "bg-purple-50 text-purple-700 border-purple-200", icon: <AlertTriangle size={12} /> },
};

function EstadoPedidoBadge({ estado }: { estado: string }) {
  const cfg = ESTADO_PEDIDO_CFG[estado] || { label: estado, chip: "bg-gray-100 text-gray-500 border-gray-200", icon: <AlertCircle size={12} /> };
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.chip}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

interface TicketPreviewModalProps {
  ticketUrl: string;
  firmando: boolean;
  firmado: boolean;
  error: string | null;
  onClose: () => void;
  onFirmar: () => void;
}

function TicketPreviewModal({ ticketUrl, firmando, firmado, error, onClose, onFirmar }: TicketPreviewModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-base font-semibold text-gray-900">Ticket de traslado</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <XIcon size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 bg-gray-100">
          <iframe src={ticketUrl} title="Vista previa del ticket" className="w-full h-full border-0" style={{ minHeight: "60vh" }} />
        </div>

        {firmado ? (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2 bg-green-50 shrink-0">
            <CheckCircle2 size={16} className="text-green-600" />
            <p className="text-sm text-green-700">Ticket firmado y enviado.</p>
          </div>
        ) : (
          <div className="px-6 py-4 border-t border-gray-100 shrink-0">
            {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button onClick={onClose} variant="cancel" size="sm" disabled={firmando}>Cerrar</Button>
              <Button onClick={onFirmar} disabled={firmando} size="sm" variant="success">
                {firmando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Check size={14} className="mr-1.5" />}
                Firmar y enviar Ticket
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function calcularAsignacionFifo(ruta: PedidoPosRuta, comparativo: ComparativoStockItem[]): GrupoArticuloFifo[] {
  const stockPorCodigo = new Map(comparativo.map(c => [c.codigo_producto, c]));
  const gruposMap = new Map<string, GrupoArticuloFifo>();

  for (const tienda of ruta.tiendas) {
    for (const item of tienda.items) {
      if (!item.codigo_producto) continue;

      if (!gruposMap.has(item.codigo_producto)) {
        const stockInfo = stockPorCodigo.get(item.codigo_producto);
        gruposMap.set(item.codigo_producto, {
          codigo_producto: item.codigo_producto,
          descripcion_producto: item.descripcion_producto,
          unidad_medida: item.unidad_medida,
          stock_original: stockInfo ? stockInfo.stock_disponible : 0,
          encontrado_en_sap: stockInfo ? stockInfo.encontrado_en_sap : false,
          lineas: []
        });
      }

      gruposMap.get(item.codigo_producto)!.lineas.push({
        detalle_id: item.id,
        codigo_producto: item.codigo_producto,
        descripcion_producto: item.descripcion_producto,
        unidad_medida: item.unidad_medida,
        numero_pedido: tienda.numero_pedido,
        nombre_tienda: tienda.nombre_tienda || tienda.codigo_tienda || "Tienda sin identificar",
        fecha_pedido: tienda.fecha_pedido,
        hora_pedido: tienda.hora_pedido,
        cantidad_solicitada: Number(item.cantidad_solicitada),
        cantidad_asignada: 0,
        ajustado_manual: false,
      });
    }
  }

  const grupos = Array.from(gruposMap.values());

  for (const grupo of grupos) {
    grupo.lineas.sort((a, b) => {
      const fechaCmp = a.fecha_pedido.localeCompare(b.fecha_pedido);
      if (fechaCmp !== 0) return fechaCmp;
      return (a.hora_pedido || "").localeCompare(b.hora_pedido || "");
    });

    let restante = grupo.stock_original;
    for (const linea of grupo.lineas) {
      const asignar = Math.max(0, Math.min(linea.cantidad_solicitada, restante));
      linea.cantidad_asignada = asignar;
      restante -= asignar;
    }
  }

  return grupos;
}

function estadoGrupoFifo(grupo: GrupoArticuloFifo): "ok" | "parcial" | "sin_stock" | "no_encontrado" {
  if (!grupo.encontrado_en_sap) return "no_encontrado";
  const totalSolicitado = grupo.lineas.reduce((s, l) => s + l.cantidad_solicitada, 0);
  const totalAsignado = grupo.lineas.reduce((s, l) => s + l.cantidad_asignada, 0);
  if (totalAsignado >= totalSolicitado) return "ok";
  if (totalAsignado > 0) return "parcial";
  return "sin_stock";
}

interface TransporteSectionProps {
  ruta: PedidoPosRuta;
  fecha: string;
  puedeEditar: boolean;
  camiones: CamionModel[];
  pilotos: PilotoUsuario[];
  asignacionesDelDia: AsignacionTransporte[];
  onAsignado: (rutaId: string, camionId: string, camionPlaca: string, pilotoId: number, pilotoNombre: string) => void;
}

function TransporteSection({ ruta, fecha, puedeEditar, camiones, pilotos, asignacionesDelDia, onAsignado }: TransporteSectionProps) {
  const [editando, setEditando] = useState(false);
  const [camionId, setCamionId] = useState(ruta.camion_id || "");
  const [pilotoId, setPilotoId] = useState(ruta.piloto_id ? String(ruta.piloto_id) : "");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tieneAsignacion = !!ruta.camion_placa && !!ruta.piloto_nombre;

  const camionesTomados = new Set(
    asignacionesDelDia.filter(a => a.ruta_id !== ruta.ruta_id).map(a => a.camion_id)
  );
  const pilotosTomados = new Set(
    asignacionesDelDia.filter(a => a.ruta_id !== ruta.ruta_id).map(a => a.piloto_id)
  );

  const handleGuardar = async () => {
    if (!camionId || !pilotoId || !ruta.ruta_id) return;

    setGuardando(true);
    setError(null);

    try {
      await asignarTransporte({
        ruta_id: ruta.ruta_id,
        fecha,
        camion_id: camionId,
        piloto_id: Number(pilotoId),
      });

      const camion = camiones.find(c => c.id_camion === camionId);
      const piloto = pilotos.find(p => String(p.id_users) === pilotoId);

      onAsignado(
        ruta.ruta_id,
        camionId,
        camion?.placa || "",
        Number(pilotoId),
        piloto ? nombrePiloto(piloto) : ""
      );

      setEditando(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al asignar transporte");
    } finally {
      setGuardando(false);
    }
  };

  if (!editando) {
    return (
      <div className="px-5 py-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center gap-2 bg-gray-50/60">
        <div className="flex items-center gap-4 flex-1 text-sm">
          <span className="flex items-center gap-1.5 text-gray-600">
            <User size={14} className="text-gray-400" />
            {ruta.piloto_nombre || <span className="text-gray-400 italic">Sin piloto asignado</span>}
          </span>
          <span className="flex items-center gap-1.5 text-gray-600">
            <Truck size={14} className="text-gray-400" />
            {ruta.camion_placa || <span className="text-gray-400 italic">Sin camión asignado</span>}
          </span>
        </div>
        {puedeEditar && (
          <button
            onClick={() => setEditando(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#2183AE] hover:bg-[#2183AE]/10 rounded-lg transition-colors self-start sm:self-auto"
          >
            <Pencil size={12} />
            {tieneAsignacion ? "Editar transporte" : "Asignar transporte"}
          </button>
        )}
        {!puedeEditar && !tieneAsignacion && (
          <span className="text-xs text-gray-400 italic">Fecha pasada, no editable</span>
        )}
      </div>
    );
  }

  return (
    <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={pilotoId}
          onChange={e => setPilotoId(e.target.value)}
          className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
        >
          <option value="">Seleccionar piloto…</option>
          {pilotos.map(p => (
            <option key={p.id_users} value={p.id_users} disabled={pilotosTomados.has(p.id_users)}>
              {nombrePiloto(p)}{pilotosTomados.has(p.id_users) ? " (ya asignado este día)" : ""}
            </option>
          ))}
        </select>
        <select
          value={camionId}
          onChange={e => setCamionId(e.target.value)}
          className="flex-1 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
        >
          <option value="">Seleccionar camión…</option>
          {camiones.map(c => (
            <option key={c.id_camion} value={c.id_camion} disabled={camionesTomados.has(c.id_camion)}>
              {c.placa}{camionesTomados.has(c.id_camion) ? " (ya asignado este día)" : ""}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2">
        <Button
          onClick={handleGuardar}
          disabled={guardando || !camionId || !pilotoId}
          size="sm"
          variant="submit"
        >
          {guardando ? <Loader2 size={13} className="animate-spin mr-1" /> : <Check size={13} className="mr-1" />}
          Guardar
        </Button>
        <Button
          onClick={() => setEditando(false)}
          disabled={guardando}
          variant="cancel"
          size="sm"
        >
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function StoreCard({ tienda }: { tienda: PedidoPosTienda }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center shrink-0">
          <Store size={14} className="text-gray-500" />
        </span>
        <span className="text-sm text-gray-700 flex-1 truncate">
          {tienda.nombre_tienda || tienda.codigo_tienda || "Tienda sin identificar"}
        </span>
        <EstadoPedidoBadge estado={tienda.estado} />
        <span className="text-xs text-gray-400 shrink-0">{tienda.items.length} ítems</span>
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
            <div className="space-y-1.5 px-3 py-3">
              {tienda.items.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-start gap-3 min-w-0">
                    <Package size={14} className="text-sky-500 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800">{item.descripcion_producto}</p>
                      <p className="text-xs text-gray-400">{item.codigo_producto} · {item.unidad_medida}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 tabular-nums shrink-0">{item.cantidad_solicitada}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface ComparativoStockModalProps {
  comparativo: ComparativoStockItem[];
  fecha: string;
  onClose: () => void;
}

function ComparativoStockModal({ comparativo, fecha, onClose }: ComparativoStockModalProps) {
  const resumen = useMemo(() => {
    let ok = 0, parcial = 0, sinStock = 0, noEncontrado = 0;
    comparativo.forEach(item => {
      const estado = estadoItemStock(item);
      if (estado === "ok") ok++;
      else if (estado === "parcial") parcial++;
      else if (estado === "sin_stock") sinStock++;
      else noEncontrado++;
    });
    return { ok, parcial, sinStock, noEncontrado };
  }, [comparativo]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Comparativo de stock — Pollo</h3>
            <p className="text-xs text-gray-500 mt-0.5">Fecha requerida: {fecha}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <XIcon size={18} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-2 shrink-0">
          {resumen.ok > 0 && <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full"><CheckCircle2 size={12} /> {resumen.ok} cubiertos</span>}
          {resumen.parcial > 0 && <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full"><AlertTriangle size={12} /> {resumen.parcial} parciales</span>}
          {resumen.sinStock > 0 && <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full"><XCircle size={12} /> {resumen.sinStock} sin stock</span>}
          {resumen.noEncontrado > 0 && <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full"><AlertCircle size={12} /> {resumen.noEncontrado} no existen en SAP</span>}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                <th className="py-2 font-medium">Artículo</th>
                <th className="py-2 font-medium text-right">Solicitado</th>
                <th className="py-2 font-medium text-right">Stock SAP</th>
                <th className="py-2 font-medium text-right">Estado</th>
              </tr>
            </thead>
            <tbody>
              {comparativo.map((item, idx) => {
                const estado = estadoItemStock(item);
                const cfg = ESTADO_STOCK_CFG[estado];
                return (
                  <tr key={item.codigo_producto || idx} className="border-b border-gray-50">
                    <td className="py-2.5">
                      <p className="text-gray-800">{item.descripcion_producto}</p>
                      <p className="text-xs text-gray-400">{item.codigo_producto || "Sin código"} · {item.unidad_medida}</p>
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-gray-600">{item.cantidad_solicitada_total}</td>
                    <td className="py-2.5 text-right tabular-nums text-gray-600">{item.stock_disponible}</td>
                    <td className="py-2.5 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.chip}`}>{cfg.icon} {cfg.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end shrink-0">
          <Button onClick={onClose} variant="cancel" size="sm">Cerrar</Button>
        </div>
      </div>
    </div>
  );
}

interface AsignacionFifoModalProps {
  grupos: GrupoArticuloFifo[];
  fecha: string;
  guardando: boolean;
  error: string | null;
  onClose: () => void;
  onCambiarCantidad: (codigoProducto: string, detalleId: string, nuevaCantidad: number) => void;
  onGuardar: () => void;
}

function AsignacionFifoModal({ grupos, fecha, guardando, error, onClose, onCambiarCantidad, onGuardar }: AsignacionFifoModalProps) {
  const resumen = useMemo(() => {
    let ok = 0, parcial = 0, sinStock = 0, noEncontrado = 0;
    grupos.forEach(g => {
      const estado = estadoGrupoFifo(g);
      if (estado === "ok") ok++;
      else if (estado === "parcial") parcial++;
      else if (estado === "sin_stock") sinStock++;
      else noEncontrado++;
    });
    return { ok, parcial, sinStock, noEncontrado };
  }, [grupos]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Asignación de cantidades (FIFO)</h3>
            <p className="text-xs text-gray-500 mt-0.5">Fecha requerida: {fecha} · Ajusta manualmente si lo necesitas antes de guardar</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <XIcon size={18} />
          </button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-2 shrink-0">
          {resumen.ok > 0 && <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full"><CheckCircle2 size={12} /> {resumen.ok} cubiertos</span>}
          {resumen.parcial > 0 && <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full"><AlertTriangle size={12} /> {resumen.parcial} parciales</span>}
          {resumen.sinStock > 0 && <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full"><XCircle size={12} /> {resumen.sinStock} sin stock</span>}
          {resumen.noEncontrado > 0 && <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2.5 py-1 rounded-full"><AlertCircle size={12} /> {resumen.noEncontrado} no existen en SAP</span>}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-3 space-y-4">
          {grupos.map(grupo => {
            const totalAsignado = grupo.lineas.reduce((s, l) => s + l.cantidad_asignada, 0);
            const stockRestante = grupo.stock_original - totalAsignado;
            const estado = estadoGrupoFifo(grupo);
            const cfg = ESTADO_STOCK_CFG[estado];

            return (
              <div key={grupo.codigo_producto} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-800">{grupo.descripcion_producto}</p>
                    <p className="text-xs text-gray-400">{grupo.codigo_producto} · {grupo.unidad_medida}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                      Stock disponible: <span className="tabular-nums font-medium text-gray-700">{stockRestante}</span> / {grupo.stock_original}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${cfg.chip}`}>{cfg.icon} {cfg.label}</span>
                  </div>
                </div>
                <div className="divide-y divide-gray-50">
                  {grupo.lineas.map(linea => {
                    const maxPermitido = Math.min(linea.cantidad_solicitada, linea.cantidad_asignada + stockRestante);
                    return (
                      <div key={linea.detalle_id} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 truncate">{linea.nombre_tienda}</p>
                          <p className="text-xs text-gray-400">{linea.numero_pedido} · {linea.fecha_pedido} {linea.hora_pedido}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-gray-400">Solicitó <span className="text-gray-600 tabular-nums">{linea.cantidad_solicitada}</span></span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400">Asignado</span>
                            <input
                              type="number"
                              min={0}
                              max={maxPermitido}
                              value={linea.cantidad_asignada}
                              onChange={e => {
                                const valor = Math.max(0, Math.min(maxPermitido, parseInt(e.target.value) || 0));
                                onCambiarCantidad(grupo.codigo_producto, linea.detalle_id, valor);
                              }}
                              className="w-16 text-sm text-center border border-gray-300 rounded-lg px-1.5 py-1 focus:outline-none focus:ring-2 focus:ring-[#2183AE]/40 focus:border-[#2183AE] tabular-nums"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {error && <p className="px-6 text-xs text-red-600 shrink-0">{error}</p>}

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
          <Button onClick={onClose} variant="cancel" size="sm" disabled={guardando}>Cancelar</Button>
          <Button onClick={onGuardar} disabled={guardando} size="sm" variant="submit">
            {guardando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Save size={14} className="mr-1.5" />}
            Guardar asignación
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PedidosPolloView() {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const defaultDate = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const [cargandoMuelle, setCargandoMuelle] = useState(true);
  const [muelle, setMuelle] = useState<MuelleUsuario | null>(null);
  const [errorMuelle, setErrorMuelle] = useState<string | null>(null);

  const [candado, setCandado] = useState<CandadoRutaPollo | null>(null);

  const [rutasDisponibles, setRutasDisponibles] = useState<RutaPollo[]>([]);
  const [loadingRutas, setLoadingRutas] = useState(false);
  const [rutaElegidaId, setRutaElegidaId] = useState("");
  const [fechaElegida, setFechaElegida] = useState(defaultDate);
  const [iniciando, setIniciando] = useState(false);
  const [errorIniciar, setErrorIniciar] = useState<string | null>(null);

  // Vista previa: buscar qué hay en esa ruta+fecha ANTES de tomar el candado
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [previewRuta, setPreviewRuta] = useState<PedidoPosRuta | null>(null);

  const [rutaActual, setRutaActual] = useState<RutaPollo | null>(null);
  const [pedidoRuta, setPedidoRuta] = useState<PedidoPosRuta | null>(null);
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

  const [enviandoSap, setEnviandoSap] = useState(false);
  const [errorEnviarSap, setErrorEnviarSap] = useState<string | null>(null);

  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [cargandoTicket, setCargandoTicket] = useState(false);
  const [errorTicket, setErrorTicket] = useState<string | null>(null);
  const [firmandoTicket, setFirmandoTicket] = useState(false);
  const [errorFirmarTicket, setErrorFirmarTicket] = useState<string | null>(null);
  const [ticketFirmado, setTicketFirmado] = useState(false);

  const [camiones, setCamiones] = useState<CamionModel[]>([]);
  const [pilotos, setPilotos] = useState<PilotoUsuario[]>([]);
  const [asignacionesDelDia, setAsignacionesDelDia] = useState<AsignacionTransporte[]>([]);

  useEffect(() => {
    getAllCamiones().then(setCamiones).catch(() => setCamiones([]));
    getPilotos().then(setPilotos).catch(() => setPilotos([]));
  }, []);

  const puedeEditarTransporte = useMemo(
    () => !!candado && candado.fecha >= todayStr,
    [candado, todayStr]
  );

  // Al montar: obtiene el muelle del usuario y revisa si ya tiene un candado activo
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

  // Cuando hay un candado activo (ruta+fecha ya tomada), carga el pedido de esa ruta
  useEffect(() => {
    if (!candado) return;

    const rutaInfo = rutasDisponibles.find(r => r.id === candado.ruta_id) || null;
    setRutaActual(rutaInfo);

    (async () => {
      setLoadingPedidos(true);
      setErrorPedidos(null);

      try {
        const [data, asignaciones] = await Promise.all([
          getPedidosPos("POLLO", {
            ruta_id: candado.ruta_id,
            fecha_requerida: candado.fecha,
          }),
          getAsignacionesTransporte(candado.fecha),
        ]);
        setPedidoRuta(data.rutas[0] || null);
        setAsignacionesDelDia(asignaciones);
      } catch (err) {
        setErrorPedidos(err instanceof Error ? err.message : "Error al obtener los pedidos de la ruta");
      } finally {
        setLoadingPedidos(false);
      }
    })();
  }, [candado, rutasDisponibles]);

  // Si cambia la ruta o la fecha elegida, invalida la búsqueda previa
  useEffect(() => {
    setBusquedaRealizada(false);
    setPreviewRuta(null);
    setErrorBusqueda(null);
  }, [rutaElegidaId, fechaElegida]);

  const handleBuscarPreview = async () => {
    if (!rutaElegidaId || !fechaElegida) return;

    setLoadingBusqueda(true);
    setErrorBusqueda(null);
    setPreviewRuta(null);

    try {
      const data = await getPedidosPos("POLLO", {
        ruta_id: rutaElegidaId,
        fecha_requerida: fechaElegida,
      });
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
      const nuevoCandado = await tomarCandado(rutaElegidaId, fechaElegida);
      setCandado(nuevoCandado);
    } catch (err) {
      setErrorIniciar(err instanceof Error ? err.message : "Error al tomar el candado de la ruta");
    } finally {
      setIniciando(false);
    }
  };

  const handleLiberar = async () => {
    if (!candado) return;
    if (!window.confirm("¿Liberar esta ruta? Podrás retomarla después, pero otra persona podría tomar otra ruta de este muelle mientras tanto.")) return;

    setLiberando(true);

    try {
      await liberarCandado(candado.ruta_id, candado.fecha);
      setCandado(null);
      setRutaActual(null);
      setPedidoRuta(null);
      setStockComparativo(null);
      setAsignacionFifo(null);
      setRutaElegidaId("");

      if (muelle) {
        const rutas = await getRutasPollo(muelle.whs_code_origen);
        setRutasDisponibles(rutas);
      }
    } catch (err) {
      setErrorIniciar(err instanceof Error ? err.message : "Error al liberar el candado");
    } finally {
      setLiberando(false);
    }
  };

  const handleCalcularStock = async () => {
    if (!candado) return;

    setLoadingStock(true);
    setStockError(null);

    try {
      const data = await getComparativoStockPollo(candado.fecha, candado.ruta_id);
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
    const grupos = calcularAsignacionFifo(pedidoRuta, stockComparativo);
    setAsignacionFifo(grupos);
    setErrorGuardarAsignacion(null);
    setShowFifoModal(true);
  };

  const handleCambiarCantidadAsignada = (codigoProducto: string, detalleId: string, nuevaCantidad: number) => {
    setAsignacionFifo(prev => {
      if (!prev) return prev;
      return prev.map(grupo => {
        if (grupo.codigo_producto !== codigoProducto) return grupo;
        return {
          ...grupo,
          lineas: grupo.lineas.map(l =>
            l.detalle_id === detalleId ? { ...l, cantidad_asignada: nuevaCantidad, ajustado_manual: true } : l
          )
        };
      });
    });
  };

  const handleGuardarAsignacionFifo = async () => {
    if (!asignacionFifo || !candado) return;

    setGuardandoAsignacion(true);
    setErrorGuardarAsignacion(null);

    try {
      const asignaciones = asignacionFifo.flatMap(g =>
        g.lineas.map(l => ({
          detalle_id: l.detalle_id,
          cantidad_asignada: l.cantidad_asignada,
          ajustado_manual: l.ajustado_manual,
        }))
      );

      await guardarAsignacionCantidades({ fecha: candado.fecha, asignaciones });

      setShowFifoModal(false);

      const data = await getPedidosPos("POLLO", { ruta_id: candado.ruta_id, fecha_requerida: candado.fecha });
      setPedidoRuta(data.rutas[0] || null);
    } catch (err) {
      setErrorGuardarAsignacion(err instanceof Error ? err.message : "Error al guardar la asignación");
    } finally {
      setGuardandoAsignacion(false);
    }
  };

  const handleEnviarTransferencia = async () => {
    if (!candado) return;
    if (!window.confirm("¿Enviar la transferencia a SAP? Esto mueve el inventario del muelle al camión y libera la ruta.")) return;

    setEnviandoSap(true);
    setErrorEnviarSap(null);

    try {
      const resultado = await enviarTransferenciaPollo(candado.ruta_id, candado.fecha);

      // Éxito: SAP liberó el candado del lado del backend, así que
      // volvemos a la pantalla de selección
      alert(`Transferencia enviada. Documento SAP #${resultado.sap_docnum}`);
      setCandado(null);
      setRutaActual(null);
      setPedidoRuta(null);
      setStockComparativo(null);
      setAsignacionFifo(null);
      setRutaElegidaId("");

      if (muelle) {
        const rutas = await getRutasPollo(muelle.whs_code_origen);
        setRutasDisponibles(rutas);
      }
    } catch (err) {
      setErrorEnviarSap(err instanceof Error ? err.message : "Error al enviar la transferencia");
    } finally {
      setEnviandoSap(false);
    }
  };

  const handlePrevisualizarTicket = async (rutaId: string, fecha: string) => {
    setCargandoTicket(true);
    setErrorTicket(null);
    setTicketFirmado(false);
    setErrorFirmarTicket(null);

    try {
      const url = await previsualizarTicketPollo(rutaId, fecha);
      setTicketUrl(url);
      setShowTicketModal(true);
    } catch (err) {
      setErrorTicket(err instanceof Error ? err.message : "Error al generar el ticket");
    } finally {
      setCargandoTicket(false);
    }
  };

  const handleCerrarTicketModal = () => {
    if (ticketUrl) window.URL.revokeObjectURL(ticketUrl);
    setTicketUrl(null);
    setShowTicketModal(false);
    setTicketFirmado(false);
  };

  const handleFirmarTicket = async () => {
    const rutaId = candado?.ruta_id || rutaElegidaId;
    const fecha = candado?.fecha || fechaElegida;
    if (!rutaId || !fecha) return;

    setFirmandoTicket(true);
    setErrorFirmarTicket(null);

    try {
      await firmarTicketPollo(rutaId, fecha);
      setTicketFirmado(true);
    } catch (err) {
      setErrorFirmarTicket(err instanceof Error ? err.message : "Error al firmar el ticket");
    } finally {
      setFirmandoTicket(false);
    }
  };

  const handleAsignado = (
    rutaId: string,
    camionId: string,
    camionPlaca: string,
    pilotoId: number,
    pilotoNombre: string
  ) => {
    setPedidoRuta(prev =>
      prev && prev.ruta_id === rutaId
        ? { ...prev, camion_id: camionId, camion_placa: camionPlaca, piloto_id: pilotoId, piloto_nombre: pilotoNombre }
        : prev
    );
    setAsignacionesDelDia(prev => {
      const sinEstaRuta = prev.filter(a => a.ruta_id !== rutaId);
      return [
        ...sinEstaRuta,
        {
          id: "temp",
          ruta_id: rutaId,
          fecha: candado?.fecha || "",
          camion_id: camionId,
          camion_placa: camionPlaca,
          piloto_id: pilotoId,
          piloto_nombre: pilotoNombre,
        },
      ];
    });
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
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">Pedidos de Pollo</h2>
            <p className="text-sm text-white/90 mt-0.5 flex items-center gap-1.5">
              <Anchor size={13} /> Muelle: {muelle.nombre_muelle} ({muelle.whs_code_origen})
            </p>
          </div>
        </div>
      </div>

      {!candado ? (
        // ------------------------------------------------------------
        // Sin candado activo: elegir ruta + fecha, buscar, y solo
        // entonces poder iniciar la validación
        // ------------------------------------------------------------
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
          <h3 className="text-sm font-medium text-gray-800 mb-4 flex items-center gap-1.5">
            <Unlock size={15} className="text-gray-400" /> Elige la ruta a trabajar
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="sm:col-span-2">
              <Label className="text-xs text-gray-700 mb-1.5 block">Ruta</Label>
              <select
                value={rutaElegidaId}
                onChange={e => setRutaElegidaId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
              >
                <option value="">Seleccionar ruta…</option>
                {rutasDisponibles.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre_ruta} ({r.total_tiendas} tiendas)</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-700 mb-1.5 block">Fecha requerida</Label>
              <Input type="date" value={fechaElegida} onChange={e => setFechaElegida(e.target.value)} className="h-9 text-xs" />
            </div>
          </div>

          <Button
            onClick={handleBuscarPreview}
            disabled={loadingBusqueda || !rutaElegidaId || !fechaElegida}
            variant="submit"
            size="sm"
            className="mb-4"
          >
            {loadingBusqueda ? <Loader2 size={14} className="animate-spin mr-1.5" /> : null}
            Buscar
          </Button>

          {errorBusqueda && (
            <p className="text-xs text-red-600 mb-3 flex items-center gap-1"><AlertCircle size={12} /> {errorBusqueda}</p>
          )}

          {busquedaRealizada && (!previewRuta || previewRuta.tiendas.length === 0) && (
            <div className="flex flex-col items-center justify-center py-8 text-center border border-gray-100 rounded-xl mb-4">
              <Truck size={22} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No hay pedidos de pollo para esta ruta en esta fecha.</p>
            </div>
          )}

          {previewRuta && previewRuta.tiendas.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <p className="text-xs text-gray-400">{previewRuta.tiendas.length} tienda{previewRuta.tiendas.length !== 1 ? "s" : ""} encontradas</p>
                <EstadoPedidoBadge estado={previewRuta.estado_general} />
                {previewRuta.sap_docnum && (
                  <span className="text-xs text-gray-400">Doc. SAP: <span className="text-gray-600 font-medium">{previewRuta.sap_docnum}</span></span>
                )}
              </div>
              {(previewRuta.piloto_nombre || previewRuta.camion_placa) && (
                <div className="flex items-center gap-4 mb-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><User size={12} className="text-gray-400" /> {previewRuta.piloto_nombre || "Sin piloto"}</span>
                  <span className="flex items-center gap-1"><Truck size={12} className="text-gray-400" /> {previewRuta.camion_placa || "Sin camión"}</span>
                </div>
              )}
              {previewRuta.estado_general === "EN_TRANSITO" && (
                <div className="mb-3">
                  <Button
                    onClick={() => handlePrevisualizarTicket(rutaElegidaId, fechaElegida)}
                    disabled={cargandoTicket}
                    size="sm"
                    variant="submit"
                  >
                    {cargandoTicket ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <FileText size={14} className="mr-1.5" />}
                    Ver ticket
                  </Button>
                  {errorTicket && <p className="text-xs text-red-600 mt-1.5">{errorTicket}</p>}
                </div>
              )}
              <div className="space-y-2">
                {previewRuta.tiendas.map(tienda => (
                  <StoreCard key={tienda.pedido_id} tienda={tienda} />
                ))}
              </div>
            </div>
          )}

          {errorIniciar && (
            <p className="text-xs text-red-600 mb-3 flex items-center gap-1"><AlertCircle size={12} /> {errorIniciar}</p>
          )}

          <Button
            onClick={handleIniciar}
            disabled={iniciando || !busquedaRealizada || !previewRuta || previewRuta.tiendas.length === 0 || previewRuta.estado_general === "EN_TRANSITO"}
            className="bg-[#2183AE] text-white hover:bg-[#1a6a8f]"
            size="sm"
          >
            {iniciando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Lock size={14} className="mr-1.5" />}
            Iniciar validación
          </Button>

          {rutasDisponibles.length === 0 && (
            <p className="text-xs text-gray-400 mt-3">No hay rutas configuradas para este muelle todavía — pídele a un administrador que las cree en el maestro de rutas.</p>
          )}
        </div>
      ) : (
        // ------------------------------------------------------------
        // Con candado activo: trabajando la ruta
        // ------------------------------------------------------------
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Lock size={15} className="text-[#2183AE] shrink-0" />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm text-gray-800 font-medium">{rutaActual?.nombre_ruta || "Ruta"}</p>
                  {pedidoRuta?.estado_general && <EstadoPedidoBadge estado={pedidoRuta.estado_general} />}
                  {pedidoRuta?.sap_docnum && (
                    <span className="text-xs text-gray-400">Doc. SAP: <span className="text-gray-600 font-medium">{pedidoRuta.sap_docnum}</span></span>
                  )}
                </div>
                <p className="text-xs text-gray-400">Fecha requerida: {candado.fecha}</p>
              </div>
            </div>
            <Button onClick={handleLiberar}
            disabled={liberando}
            variant="cancel"
            size="sm"
            className="border-gray-900 bg-gray-900 text-white hover:bg-white"
            >
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
            <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-[#2183AE]" /></div>
          )}

          {errorPedidos && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2.5 mb-4">
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-700">{errorPedidos}</p>
            </div>
          )}

          {!loadingPedidos && !errorPedidos && !pedidoRuta && (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Truck size={24} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">No hay pedidos de pollo para esta ruta en esta fecha.</p>
            </div>
          )}

          {!loadingPedidos && pedidoRuta && (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Scale size={16} className="text-[#2183AE] shrink-0" />
                  {!stockComparativo ? (
                    <p className="text-sm text-gray-500">Calcula el total solicitado vs. el stock disponible en SAP.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {(() => {
                        const conteo = { ok: 0, parcial: 0, sin_stock: 0, no_encontrado: 0 };
                        stockComparativo.forEach(i => { conteo[estadoItemStock(i)]++; });
                        return (
                          <>
                            {conteo.ok > 0 && <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> {conteo.ok} cubiertos</span>}
                            {conteo.parcial > 0 && <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full"><AlertTriangle size={11} /> {conteo.parcial} parciales</span>}
                            {conteo.sin_stock > 0 && <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full"><XCircle size={11} /> {conteo.sin_stock} sin stock</span>}
                            {conteo.no_encontrado > 0 && <span className="flex items-center gap-1 text-xs bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full"><AlertCircle size={11} /> {conteo.no_encontrado} no en SAP</span>}
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
                {stockError && <p className="text-xs text-red-600">{stockError}</p>}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={stockComparativo ? () => setShowStockModal(true) : handleCalcularStock}
                    disabled={loadingStock}
                    size="sm"
                    variant="submit"
                  >
                    {loadingStock ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Scale size={14} className="mr-1.5" />}
                    {stockComparativo ? "Ver comparativo" : "Calcular stock"}
                  </Button>
                  {stockComparativo && (
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
                  {pedidoRuta?.estado_general === "VALIDADO" && (
                    <Button
                      onClick={handleEnviarTransferencia}
                      disabled={enviandoSap || !pedidoRuta.camion_id || !pedidoRuta.piloto_id}
                      size="sm"
                      variant="success"
                    >
                      {enviandoSap ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Send size={14} className="mr-1.5" />}
                      Enviar a SAP
                    </Button>
                  )}
                </div>
              </div>

              {pedidoRuta?.estado_general === "VALIDADO" && (!pedidoRuta.camion_id || !pedidoRuta.piloto_id) && (
                <p className="text-xs text-amber-600 mb-4 flex items-center gap-1">
                  <AlertTriangle size={12} /> Asigna piloto y camión a esta ruta antes de poder enviarla a SAP.
                </p>
              )}

              {errorEnviarSap && (
                <p className="text-xs text-red-600 mb-4 flex items-center gap-1"><AlertCircle size={12} /> {errorEnviarSap}</p>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <p className="text-xs text-gray-400 mb-3">{pedidoRuta.tiendas.length} tienda{pedidoRuta.tiendas.length !== 1 ? "s" : ""}</p>
                <div className="space-y-2.5">
                  {pedidoRuta.tiendas.map(tienda => (
                    <StoreCard key={tienda.pedido_id} tienda={tienda} />
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {showStockModal && stockComparativo && (
        <ComparativoStockModal comparativo={stockComparativo} fecha={candado?.fecha || ""} onClose={() => setShowStockModal(false)} />
      )}

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

      {showTicketModal && ticketUrl && (
        <TicketPreviewModal
          ticketUrl={ticketUrl}
          firmando={firmandoTicket}
          firmado={ticketFirmado}
          error={errorFirmarTicket}
          onClose={handleCerrarTicketModal}
          onFirmar={handleFirmarTicket}
        />
      )}
    </div>
  );
}