"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { editarDepositoArtesano, eliminarDepositoArtesano, registrarDepositoArtesano } from "../api/PedidoEspecialApi";
import { DatosDeposito, DepositoArtesano, PedidoArtesano } from "../types/PedidoEspecialModel";
import { BannerMensaje, ModalBase, formatearFechaCorta } from "./PedidoEspecialComun";

// Depósitos de un pedido de pollo artesano: campos, resumen y registro.

export function formatearQuetzales(monto: number): string {
  return `Q${monto.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Fecha local en formato YYYY-MM-DD.
function hoyLocal(): string {
  return new Date().toLocaleDateString("en-CA");
}

export interface FormDeposito {
  boleta: string;
  fecha: string;
  monto: string;
  banco: string;
}

export function depositoVacio(monto: number | null = null): FormDeposito {
  return { boleta: "", fecha: hoyLocal(), monto: monto !== null && monto > 0 ? monto.toFixed(2) : "", banco: "" };
}

export function problemaDeposito(form: FormDeposito): string | null {
  if (form.boleta.trim() === "") return "Escribe el número de boleta del depósito.";
  if (!form.fecha) return "Elige la fecha del depósito.";
  if (form.fecha > hoyLocal()) return "La fecha del depósito no puede ser futura.";
  if (!(Number(form.monto) > 0)) return "Escribe la cantidad depositada.";
  return null;
}

export function datosDeposito(form: FormDeposito): DatosDeposito {
  return {
    numero_boleta: form.boleta.trim(),
    fecha_deposito: form.fecha,
    monto: Number(form.monto),
    banco: form.banco.trim() || null,
  };
}

// porCubrir: lo que falta pagar, para avisar cuánto quedará pendiente.
export function CamposDeposito({
  form,
  onChange,
  porCubrir = null,
}: {
  form: FormDeposito;
  onChange: (cambios: Partial<FormDeposito>) => void;
  porCubrir?: number | null;
}) {
  const monto = Number(form.monto);
  const quedaria = porCubrir !== null && monto > 0 ? Math.round((porCubrir - monto) * 100) / 100 : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <Label className="text-xs text-gray-700 mb-1.5 block">Número de boleta *</Label>
        <Input value={form.boleta} onChange={(e) => onChange({ boleta: e.target.value })} maxLength={50} className="h-11" />
      </div>
      <div>
        <Label className="text-xs text-gray-700 mb-1.5 block">Fecha del depósito *</Label>
        <Input type="date" max={hoyLocal()} value={form.fecha} onChange={(e) => onChange({ fecha: e.target.value })} className="h-11" />
      </div>
      <div>
        <Label className="text-xs text-gray-700 mb-1.5 block">Cantidad depositada (Q) *</Label>
        <Input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          value={form.monto}
          onChange={(e) => onChange({ monto: e.target.value })}
          className="h-11"
        />
        {quedaria > 0 && <p className="text-xs text-amber-700 mt-1">Quedará un saldo de {formatearQuetzales(quedaria)}.</p>}
      </div>
      <div>
        <Label className="text-xs text-gray-700 mb-1.5 block">Banco (opcional)</Label>
        <Input value={form.banco} onChange={(e) => onChange({ banco: e.target.value })} maxLength={100} className="h-11" />
      </div>
    </div>
  );
}

// deposito: si viene, el modal corrige ese depósito; si no, registra uno nuevo.
function DepositoModal({
  pedido,
  deposito,
  onClose,
  onGuardado,
}: {
  pedido: PedidoArtesano;
  deposito: DepositoArtesano | null;
  onClose: () => void;
  onGuardado: () => void;
}) {
  const [form, setForm] = useState<FormDeposito>(() =>
    deposito
      ? { boleta: deposito.numero_boleta, fecha: deposito.fecha_deposito, monto: deposito.monto.toFixed(2), banco: deposito.banco ?? "" }
      : depositoVacio(pedido.saldo)
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Al corregir, lo que falta por cubrir no cuenta el depósito que se está cambiando.
  const porCubrir = pedido.saldo === null ? null : pedido.saldo + (deposito?.monto ?? 0);

  const guardar = async () => {
    setGuardando(true);
    setError(null);

    try {
      if (deposito) await editarDepositoArtesano(pedido.id, deposito.id, datosDeposito(form));
      else await registrarDepositoArtesano(pedido.id, datosDeposito(form));
      onGuardado();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el depósito");
      setGuardando(false);
    }
  };

  return (
    <ModalBase
      titulo={deposito ? "Modificar depósito" : "Registrar depósito"}
      subtitulo={`${pedido.serie} ${pedido.numero_pedido} · ${pedido.cliente_nombre}`}
      deshabilitarCierre={guardando}
      onClose={onClose}
    >
      <div className="px-6 py-4 space-y-3">
        {!deposito && pedido.saldo !== null && pedido.saldo > 0 && (
          <p className="text-sm text-gray-700">
            Saldo pendiente: <span className="font-semibold">{formatearQuetzales(pedido.saldo)}</span>
          </p>
        )}
        <CamposDeposito form={form} onChange={(cambios) => setForm((prev) => ({ ...prev, ...cambios }))} porCubrir={porCubrir} />
        {error && <BannerMensaje tipo="error" texto={error} />}
      </div>
      <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
        <Button onClick={onClose} disabled={guardando} variant="outline" size="sm">
          Cancelar
        </Button>
        <Button onClick={guardar} disabled={guardando || problemaDeposito(form) !== null} variant="success" size="sm">
          {guardando && <Loader2 size={14} className="animate-spin mr-1.5" />}
          {deposito ? "Guardar cambios" : "Registrar depósito"}
        </Button>
      </div>
    </ModalBase>
  );
}

// Total, depositado y saldo del pedido con la lista de sus depósitos.
export function ResumenDepositos({
  pedido,
  editable,
  onCambio,
}: {
  pedido: PedidoArtesano;
  editable: boolean;
  onCambio?: () => void;
}) {
  const [registrando, setRegistrando] = useState(false);
  const [editando, setEditando] = useState<DepositoArtesano | null>(null);
  // Depósito que espera confirmación para quitarse.
  const [porQuitar, setPorQuitar] = useState<string | null>(null);
  const [quitando, setQuitando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (pedido.condicion_pago !== "DEPOSITO" || !pedido.depositos) return null;

  const { total, depositado, saldo, depositos } = pedido;
  const faltaPagar = saldo === null || saldo > 0 || depositos.length === 0;

  const quitar = async (idDeposito: string) => {
    setQuitando(true);
    setError(null);

    try {
      await eliminarDepositoArtesano(pedido.id, idDeposito);
      setPorQuitar(null);
      onCambio?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar el depósito");
    } finally {
      setQuitando(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg px-3 py-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Depósitos</p>
        <p className="text-xs text-gray-600">
          Total <span className="font-semibold text-gray-900">{total === null ? "—" : formatearQuetzales(total)}</span>
          {" · "}Depositado <span className="font-semibold text-gray-900">{formatearQuetzales(depositado ?? 0)}</span>
          {saldo !== null && saldo > 0 && <span className="font-semibold text-red-700"> · Falta {formatearQuetzales(saldo)}</span>}
          {saldo !== null && saldo < 0 && <span className="font-semibold text-amber-700"> · De más {formatearQuetzales(-saldo)}</span>}
          {saldo === 0 && <span className="font-semibold text-green-700"> · Pagado</span>}
        </p>
      </div>

      {depositos.length === 0 && <p className="text-xs text-gray-400">Todavía no hay depósitos registrados.</p>}

      {depositos.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 text-sm border-t border-gray-100 pt-2">
          <p className="text-gray-700 min-w-0 break-words">
            {formatearFechaCorta(d.fecha_deposito)} · Boleta {d.numero_boleta}
            {d.banco ? ` · ${d.banco}` : ""}
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <span className="font-medium text-gray-900 tabular-nums">{formatearQuetzales(d.monto)}</span>
            {editable && porQuitar !== d.id && (
              <>
                <button type="button" onClick={() => setEditando(d)} className="p-1 text-[#2183AE] hover:bg-sky-50 rounded" aria-label="Modificar depósito" title="Modificar depósito">
                  <Pencil size={14} />
                </button>
                <button type="button" onClick={() => setPorQuitar(d.id)} className="p-1 text-red-500 hover:bg-red-50 rounded" aria-label="Quitar depósito" title="Quitar depósito">
                  <Trash2 size={14} />
                </button>
              </>
            )}
            {editable && porQuitar === d.id && (
              <span className="flex items-center gap-2 text-xs">
                ¿Quitar?
                <button type="button" onClick={() => quitar(d.id)} disabled={quitando} className="font-semibold text-red-700 hover:underline">
                  {quitando ? "Quitando…" : "Sí"}
                </button>
                <button type="button" onClick={() => setPorQuitar(null)} disabled={quitando} className="text-gray-600 hover:underline">
                  No
                </button>
              </span>
            )}
          </div>
        </div>
      ))}

      {error && <p className="text-xs text-red-600">{error}</p>}

      {editable && faltaPagar && (
        <div className="flex justify-end">
          <Button onClick={() => setRegistrando(true)} variant="outline" size="sm">
            <Plus size={14} className="mr-1.5" />
            Registrar depósito
          </Button>
        </div>
      )}

      {(registrando || editando) && (
        <DepositoModal
          pedido={pedido}
          deposito={editando}
          onClose={() => {
            setRegistrando(false);
            setEditando(null);
          }}
          onGuardado={() => {
            setRegistrando(false);
            setEditando(null);
            onCambio?.();
          }}
        />
      )}
    </div>
  );
}
