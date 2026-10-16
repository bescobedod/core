"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { CalendarClock, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { cambiarFechaRequeridaPedido } from "../api/PedidoPosApi";

// Cambio de fecha de entrega de un pedido, compartido por las vistas de
// Pedidos de Pollo y de Insumos. El backend vuelve a validar todo; esto solo
// evita ofrecer el botón donde seguro no aplica.
export const ESTADOS_FECHA_EDITABLE = ["PENDIENTE_ENRIQUECIMIENTO", "RECIBIDO", "VALIDADO"];

export function puedeCambiarFecha(estado: string) {
  return ESTADOS_FECHA_EDITABLE.includes(estado);
}

export interface PedidoCambioFecha {
  pedido_id: string;
  numero_pedido: string;
  nombre_tienda: string | null;
  fecha_requerida: string;
  estado: string;
  // "Insumos" / "Activo Fijo" en la vista de insumos; vacío en pollo.
  etiqueta?: string;
}

function fechaDdMmAaaa(fechaIso: string) {
  const [anio, mes, dia] = String(fechaIso || "").split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fechaIso;
}

// Botón pequeño para el panel de cada pedido.
export function BotonCambiarFecha({ pedido, onClick }: { pedido: PedidoCambioFecha; onClick: (pedido: PedidoCambioFecha) => void }) {
  if (!puedeCambiarFecha(pedido.estado)) return null;

  return (
    <button
      type="button"
      onClick={() => onClick(pedido)}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#2183AE] hover:bg-[#2183AE]/10 rounded-lg transition-colors shrink-0"
    >
      <CalendarClock size={12} />
      Cambiar fecha
    </button>
  );
}

type Resultado = { ok: true; mensaje: string; aviso?: string } | { ok: false; mensaje: string };

interface CambiarFechaPedidoModalProps {
  pedido: PedidoCambioFecha | null;
  onClose: () => void;
  // Se llama apenas el cambio se guarda, para volver a buscar los pedidos.
  onActualizado: () => void | Promise<void>;
}

export function CambiarFechaPedidoModal({ pedido, onClose, onActualizado }: CambiarFechaPedidoModalProps) {
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    setNuevaFecha("");
    setGuardando(false);
    setResultado(null);
  }, [pedido?.pedido_id]);

  if (!pedido) return null;

  const hoy = format(new Date(), "yyyy-MM-dd");
  const fechaValida = !!nuevaFecha && nuevaFecha >= hoy && nuevaFecha !== pedido.fecha_requerida;

  const handleGuardar = async () => {
    if (!fechaValida) return;

    setGuardando(true);

    try {
      const r = await cambiarFechaRequeridaPedido(pedido.pedido_id, nuevaFecha);
      setResultado({
        ok: true,
        mensaje: `El pedido ${r.numero_pedido} ahora se entrega el ${fechaDdMmAaaa(r.fecha_requerida)}.`,
        aviso: r.asignacion_reiniciada
          ? "El pedido estaba validado: se quitó su asignación de cantidades y volvió a Recibido."
          : undefined,
      });
      await onActualizado();
    } catch (err) {
      setResultado({ ok: false, mensaje: err instanceof Error ? err.message : "Error al cambiar la fecha de entrega" });
    } finally {
      setGuardando(false);
    }
  };

  const cerrar = () => {
    if (!guardando) onClose();
  };

  return (
    <Dialog open onOpenChange={(abierto) => { if (!abierto) cerrar(); }}>
      <DialogContent className="sm:max-w-sm">
        {resultado ? (
          <>
            <DialogHeader className="items-center text-center sm:text-center">
              {resultado.ok
                ? <CheckCircle2 size={36} className="text-green-600" />
                : <XCircle size={36} className="text-red-600" />}
              <DialogTitle>{resultado.ok ? "Fecha actualizada" : "No se pudo cambiar la fecha"}</DialogTitle>
              <DialogDescription className="text-gray-600">{resultado.mensaje}</DialogDescription>
            </DialogHeader>
            {resultado.ok && resultado.aviso && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {resultado.aviso}
              </p>
            )}
            <DialogFooter>
              {!resultado.ok && (
                <Button variant="outline" size="sm" onClick={() => setResultado(null)}>Intentar de nuevo</Button>
              )}
              <Button variant={resultado.ok ? "submit" : "cancel"} size="sm" onClick={cerrar}>Aceptar</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock size={18} className="text-[#2183AE]" /> Cambiar fecha de entrega
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {pedido.nombre_tienda || "Tienda sin identificar"} · {pedido.numero_pedido}
                {pedido.etiqueta ? ` · ${pedido.etiqueta}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Fecha actual: <span className="font-medium text-gray-800">{fechaDdMmAaaa(pedido.fecha_requerida)}</span>
              </p>
              <div>
                <Label htmlFor="nueva-fecha-entrega" className="text-xs text-gray-700 mb-1.5 block">Nueva fecha de entrega</Label>
                <Input
                  id="nueva-fecha-entrega"
                  type="date"
                  min={hoy}
                  value={nuevaFecha}
                  onChange={(e) => setNuevaFecha(e.target.value)}
                />
                {nuevaFecha && nuevaFecha === pedido.fecha_requerida && (
                  <p className="text-xs text-gray-500 mt-1">Es la misma fecha que ya tiene el pedido.</p>
                )}
              </div>
              {pedido.estado === "VALIDADO" && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                  Este pedido ya tiene cantidades asignadas. Al cambiar la fecha se quitará la asignación y volverá a Recibido.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="cancel" size="sm" onClick={cerrar} disabled={guardando}>Cancelar</Button>
              <Button variant="submit" size="sm" onClick={handleGuardar} disabled={!fechaValida || guardando}>
                {guardando ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                Guardar
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
