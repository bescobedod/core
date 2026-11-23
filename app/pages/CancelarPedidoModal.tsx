"use client";

import { useEffect, useState } from "react";
import { Ban, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { cancelarPedido } from "../api/PedidoPosApi";

// Cancelación de un pedido, compartida por Pedidos de Pollo, de Insumos y la
// vista de lectura por división. El pedido no se borra: pasa a CANCELADO y
// deja de aparecer en vistas y reportes. El backend valida permiso, división,
// estado y candado; esto solo evita ofrecer el botón donde seguro no aplica.
// Solo se cancelan pedidos en estado RECIBIDO.
export const ESTADOS_CANCELABLES = ["RECIBIDO"];

const MOTIVO_MIN = 5;
const MOTIVO_MAX = 500;

export function puedeCancelar(estado: string) {
  return ESTADOS_CANCELABLES.includes(estado);
}

export interface PedidoCancelacion {
  pedido_id: string;
  numero_pedido: string;
  nombre_tienda: string | null;
  estado: string;
  // "Insumos" / "Activo Fijo" / "Verduras" en la vista de insumos; vacío en pollo.
  etiqueta?: string;
}

export function BotonCancelarPedido({ pedido, onClick }: { pedido: PedidoCancelacion; onClick: (pedido: PedidoCancelacion) => void }) {
  if (!puedeCancelar(pedido.estado)) return null;

  return (
    <button
      type="button"
      onClick={() => onClick(pedido)}
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
    >
      <Ban size={12} />
      Cancelar pedido
    </button>
  );
}

type Resultado = { ok: true; mensaje: string } | { ok: false; mensaje: string };

interface CancelarPedidoModalProps {
  pedido: PedidoCancelacion | null;
  onClose: () => void;
  // Se llama apenas se cancela, para volver a buscar los pedidos.
  onCancelado: () => void | Promise<void>;
}

export function CancelarPedidoModal({ pedido, onClose, onCancelado }: CancelarPedidoModalProps) {
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  useEffect(() => {
    setMotivo("");
    setGuardando(false);
    setResultado(null);
  }, [pedido?.pedido_id]);

  if (!pedido) return null;

  const motivoValido = motivo.trim().length >= MOTIVO_MIN && motivo.trim().length <= MOTIVO_MAX;

  const handleConfirmar = async () => {
    if (!motivoValido) return;

    setGuardando(true);

    try {
      const r = await cancelarPedido(pedido.pedido_id, motivo.trim());
      setResultado({ ok: true, mensaje: `El pedido ${r.numero_pedido} fue cancelado.` });
      await onCancelado();
    } catch (err) {
      setResultado({ ok: false, mensaje: err instanceof Error ? err.message : "Error al cancelar el pedido" });
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
              <DialogTitle>{resultado.ok ? "Pedido cancelado" : "No se pudo cancelar el pedido"}</DialogTitle>
              <DialogDescription className="text-gray-600">{resultado.mensaje}</DialogDescription>
            </DialogHeader>
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
                <Ban size={18} className="text-red-600" /> Cancelar pedido
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {pedido.nombre_tienda || "Tienda sin identificar"} · {pedido.numero_pedido}
                {pedido.etiqueta ? ` · ${pedido.etiqueta}` : ""}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start gap-1.5">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                El pedido pasará a estado Cancelado: no se borra, pero dejará de aparecer en todas las vistas y reportes. Esta acción no se puede deshacer desde Core.
              </p>
              <div>
                <Label htmlFor="motivo-cancelacion" className="text-xs text-gray-700 mb-1.5 block">Motivo de la cancelación</Label>
                <Textarea
                  id="motivo-cancelacion"
                  value={motivo}
                  maxLength={MOTIVO_MAX}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="Ej.: la tienda pidió anular el pedido por duplicado"
                  rows={3}
                />
                <p className="text-[11px] text-gray-400 mt-1">Obligatorio (mínimo {MOTIVO_MIN} caracteres). Queda en el historial del pedido.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="cancel" size="sm" onClick={cerrar} disabled={guardando}>Volver</Button>
              <Button
                size="sm"
                onClick={handleConfirmar}
                disabled={!motivoValido || guardando}
                className="border border-red-600 bg-red-600 text-white hover:bg-white hover:text-red-600"
              >
                {guardando ? <Loader2 size={14} className="animate-spin mr-1" /> : null}
                Cancelar pedido
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
