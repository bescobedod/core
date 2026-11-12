"use client";

import { useRef, useState } from "react";
import { Camera, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { cancelarPedidoArtesano, getUrlEvidenciaArtesano, rechazarPedidoArtesano, subirEvidenciaArtesano } from "../api/PedidoEspecialApi";
import { PedidoArtesano } from "../types/PedidoEspecialModel";
import { BannerMensaje, ModalBase } from "./PedidoEspecialComun";

// Piezas que usan tanto la vista del rastro como la de Pollo Artesano.

// Visor del PDF del envío
export function VisorPdf({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <ModalBase titulo="Envío listo para imprimir" subtitulo="Imprímelo desde el visor o ábrelo en una pestaña" ancho="max-w-3xl" onClose={onClose}>
      <div className="px-4 py-3 flex-1 min-h-0">
        <iframe src={url} title="Envío" className="w-full h-[68vh] border border-gray-200 rounded-lg" />
      </div>
      <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2">
        <a href={url} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm" type="button">
            <ExternalLink size={14} className="mr-1.5" />
            Abrir en pestaña
          </Button>
        </a>
        <Button onClick={onClose} variant="submit" size="sm">
          Cerrar
        </Button>
      </div>
    </ModalBase>
  );
}

// Evidencia de entrega: foto (o PDF) de la hoja firmada
export function EvidenciaEntrega({
  pedido,
  puedeAdjuntar,
  onCambio,
}: {
  pedido: PedidoArtesano;
  puedeAdjuntar: boolean;
  onCambio: () => void;
}) {
  const entrada = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ver = async () => {
    setAbriendo(true);
    setError(null);

    try {
      window.open(await getUrlEvidenciaArtesano(pedido.id), "_blank", "noopener");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo abrir la evidencia");
    } finally {
      setAbriendo(false);
    }
  };

  const alElegir = async (archivo: File | undefined) => {
    if (!archivo) return;

    setSubiendo(true);
    setError(null);

    try {
      await subirEvidenciaArtesano(pedido.id, archivo);
      onCambio();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo adjuntar la evidencia");
    } finally {
      setSubiendo(false);
      if (entrada.current) entrada.current.value = "";
    }
  };

  const puedeVer = pedido.tiene_evidencia_entrega;
  const aplica = pedido.estado === "CARGADO" || pedido.estado === "ENTREGADO";

  if (!aplica || (!puedeVer && !puedeAdjuntar)) return null;

  return (
    <div className="border border-gray-100 rounded-lg px-3 py-3">
      <div className="flex items-center gap-2 text-gray-500 mb-2">
        <Camera size={14} />
        <p className="text-[11px] font-medium uppercase tracking-wide">Hoja firmada</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {puedeVer ? (
          <Button onClick={ver} disabled={abriendo} variant="outline" size="sm">
            {abriendo ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <ExternalLink size={14} className="mr-1.5" />}
            Ver foto
          </Button>
        ) : (
          <span className="text-xs text-gray-400">Sin foto adjunta</span>
        )}
        {puedeAdjuntar && (
          <>
            <input
              ref={entrada}
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              className="hidden"
              onChange={(e) => alElegir(e.target.files?.[0])}
            />
            <Button onClick={() => entrada.current?.click()} disabled={subiendo} variant="outline" size="sm">
              {subiendo ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Camera size={14} className="mr-1.5" />}
              {puedeVer ? "Reemplazar foto" : "Adjuntar foto"}
            </Button>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
    </div>
  );
}


// Modal: ajustar las cantidades a cargar (autorización parcial)
export function AjustarCantidadesModal({
  pedido,
  cantidadesActuales,
  onClose,
  onAplicar,
}: {
  pedido: PedidoArtesano;
  // Lo que ya se había ajustado de este pedido (si no, lo solicitado).
  cantidadesActuales?: Record<string, number>;
  onClose: () => void;
  // Devuelve null si las cantidades quedaron iguales a lo solicitado (sin ajuste).
  onAplicar: (cantidades: Record<string, number> | null) => void;
}) {
  const [cantidades, setCantidades] = useState<Record<string, string>>(() =>
    Object.fromEntries(pedido.items.map((i) => [i.codigo_producto, String(cantidadesActuales?.[i.codigo_producto] ?? i.cantidad)]))
  );

  const valores = pedido.items.map((item) => {
    const texto = cantidades[item.codigo_producto] ?? "";
    const numero = texto.trim() === "" ? NaN : Number(texto);

    return { item, numero, valida: Number.isFinite(numero) && numero >= 0 && numero <= item.cantidad };
  });

  const todoValido = valores.every((v) => v.valida);
  const hayCantidad = valores.some((v) => v.valida && v.numero > 0);
  const hayRecorte = valores.some((v) => v.valida && v.numero < v.item.cantidad);

  const aplicar = () => {
    onAplicar(hayRecorte ? Object.fromEntries(valores.map((v) => [v.item.codigo_producto, v.numero])) : null);
  };

  return (
    <ModalBase
      titulo="Ajustar cantidades"
      subtitulo={`${pedido.serie} ${pedido.numero_pedido} · ${pedido.cliente_nombre}`}
      ancho="max-w-lg"
      onClose={onClose}
    >
      <div className="px-6 py-4 space-y-3 overflow-y-auto">
        <p className="text-xs text-gray-500">
          Baja la cantidad de los productos que no se puedan enviar completos (0 si no se envía). Se aplica al cargar el pedido.
        </p>

        <div className="space-y-2">
          {valores.map(({ item, valida }) => (
            <div key={item.codigo_producto} className="border border-gray-100 rounded-lg px-3 py-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-gray-800">{item.descripcion_producto}</p>
                  <p className="text-xs text-gray-400">Solicitado: {item.cantidad}</p>
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={item.cantidad}
                  step="any"
                  value={cantidades[item.codigo_producto] ?? ""}
                  onChange={(e) => setCantidades((c) => ({ ...c, [item.codigo_producto]: e.target.value }))}
                  className="w-24 text-right shrink-0"
                />
              </div>
              {!valida && <p className="text-xs text-red-600 mt-1">Debe estar entre 0 y {item.cantidad}.</p>}
            </div>
          ))}
        </div>

        {todoValido && !hayCantidad && (
          <p className="text-xs text-red-600">No hay nada que cargar. Si no se puede enviar el pedido, recházalo con su motivo.</p>
        )}
      </div>

      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
        <Button onClick={onClose} variant="outline" size="sm">
          Cancelar
        </Button>
        <Button onClick={aplicar} disabled={!todoValido || !hayCantidad} variant="success" size="sm">
          {hayRecorte ? "Aplicar ajuste" : "Dejar completo"}
        </Button>
      </div>
    </ModalBase>
  );
}

// Modal: rechazar
export function RechazarModal({
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

// Modal: cancelar (lo usa la asistente en pedidos creados)
export function CancelarModal({
  pedido,
  onClose,
  onCancelado,
}: {
  pedido: PedidoArtesano;
  onClose: () => void;
  onCancelado: (pedido: PedidoArtesano) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const motivoValido = motivo.trim().length >= 5;

  const handleCancelar = async () => {
    setGuardando(true);
    setError(null);

    try {
      onCancelado(await cancelarPedidoArtesano(pedido.id, motivo.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cancelar el pedido");
      setGuardando(false);
    }
  };

  return (
    <ModalBase
      titulo="Cancelar pedido"
      subtitulo={`${pedido.serie} ${pedido.numero_pedido} · ${pedido.cliente_nombre}`}
      deshabilitarCierre={guardando}
      onClose={onClose}
    >
      <div className="px-6 py-4 space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Motivo de la cancelación *</label>
          <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} maxLength={500} rows={3} placeholder="Mínimo 5 caracteres" />
        </div>
        {error && <BannerMensaje tipo="error" texto={error} />}
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
        <Button onClick={onClose} disabled={guardando} variant="outline" size="sm">
          Volver
        </Button>
        <Button onClick={handleCancelar} disabled={guardando || !motivoValido} variant="destructive" size="sm">
          {guardando && <Loader2 size={14} className="animate-spin mr-1.5" />}
          Cancelar pedido
        </Button>
      </div>
    </ModalBase>
  );
}
