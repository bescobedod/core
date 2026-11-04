"use client";

import { ReactNode, useEffect } from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  MessageSquare,
  PackageCheck,
  X as XIcon,
  XCircle,
} from "lucide-react";
import { EstadoPedidoEspecial, Paginacion } from "../types/PedidoEspecialModel";

// Mismos chips (forma, tamaño e íconos) que EstadoPedidoBadge de las vistas de
// pedidos de Pollo e Insumos.
export const ESTADO_ESPECIAL_CFG: Record<EstadoPedidoEspecial, { label: string; chip: string; icon: ReactNode }> = {
  PENDIENTE_APROBACION: { label: "Pendiente", chip: "bg-amber-50 text-amber-700 border-amber-200", icon: <Clock size={12} /> },
  RECHAZADO: { label: "Rechazado", chip: "bg-red-50 text-red-700 border-red-200", icon: <XCircle size={12} /> },
  AUTORIZADO: { label: "Autorizado", chip: "bg-blue-50 text-blue-700 border-blue-200", icon: <CheckCircle2 size={12} /> },
  EN_PREPARACION: { label: "En preparación", chip: "bg-orange-50 text-orange-700 border-orange-200", icon: <ClipboardList size={12} /> },
  LISTO_PARA_RECOGER: { label: "Listo para recoger", chip: "bg-green-50 text-green-700 border-green-200", icon: <PackageCheck size={12} /> },
  ENTREGADO: { label: "Entregado", chip: "bg-gray-100 text-gray-600 border-gray-200", icon: <CheckCircle2 size={12} /> },
};

export function EstadoEspecialBadge({ estado }: { estado: EstadoPedidoEspecial }) {
  const cfg = ESTADO_ESPECIAL_CFG[estado];

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${cfg.chip}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// Mañana (hoy + 1) en la fecha local del usuario, como YYYY-MM-DD. Es la fecha
// por defecto de los filtros de las vistas de pedidos especiales.
export function fechaManana(): string {
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);

  const mes = String(fecha.getMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getDate()).padStart(2, "0");

  return `${fecha.getFullYear()}-${mes}-${dia}`;
}

// "2026-10-20" -> "20/10/2026"
export function formatearFechaCorta(fecha: string | null): string {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.slice(0, 10).split("-");
  return `${dia}/${mes}/${anio}`;
}

export function ComentarioPedido({ comentario }: { comentario: string | null }) {
  return (
    <div className="flex items-start gap-2 bg-amber-50/60 border border-amber-100 rounded-lg px-3 py-2">
      <MessageSquare size={14} className="text-amber-600 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-amber-700">Comentario</p>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {comentario || <span className="text-gray-400">Sin comentario</span>}
        </p>
      </div>
    </div>
  );
}

// Espacio reservado para la evidencia y la información de la entrega que se
// registrará desde PioApp; por ahora no muestra nada.
export function EntregaPlaceholder() {
  return (
    <div className="border border-dashed border-gray-200 rounded-lg px-3 py-3">
      <div className="flex items-center gap-2 text-gray-400">
        <PackageCheck size={14} />
        <p className="text-[11px] font-medium uppercase tracking-wide">Entrega</p>
      </div>
      <p className="text-xs text-gray-300 mt-1">La evidencia y la información de la entrega se mostrarán aquí.</p>
    </div>
  );
}

// Páginas a mostrar: la primera, la última y las vecinas de la actual
// (null = "…").
function paginasVisibles(actual: number, total: number): (number | null)[] {
  const paginas = new Set([1, total, actual - 1, actual, actual + 1].filter((p) => p >= 1 && p <= total));
  const ordenadas = [...paginas].sort((a, b) => a - b);
  const resultado: (number | null)[] = [];

  ordenadas.forEach((pagina, i) => {
    if (i > 0 && pagina - ordenadas[i - 1] > 1) resultado.push(null);
    resultado.push(pagina);
  });

  return resultado;
}

export function ControlesPaginacion({
  paginacion,
  cargando,
  etiqueta = "pedidos",
  onCambiar,
}: {
  paginacion: Paginacion;
  cargando: boolean;
  etiqueta?: string;
  onCambiar: (pagina: number) => void;
}) {
  const { page, pageSize, total, totalPages } = paginacion;

  if (total === 0) return null;

  const desde = (page - 1) * pageSize + 1;
  const hasta = Math.min(page * pageSize, total);
  const botonBase =
    "h-8 min-w-8 px-2 text-sm rounded-md border transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-4">
      <p className="text-xs text-gray-500">
        Mostrando {desde}–{hasta} de {total} {etiqueta}
      </p>

      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onCambiar(page - 1)}
            disabled={cargando || page <= 1}
            className={`${botonBase} border-gray-300 bg-white text-gray-600 hover:bg-gray-50`}
            aria-label="Página anterior"
          >
            <ChevronLeft size={14} />
          </button>

          {paginasVisibles(page, totalPages).map((pagina, i) =>
            pagina === null ? (
              <span key={`puntos-${i}`} className="px-1 text-gray-400 text-sm">
                …
              </span>
            ) : (
              <button
                key={pagina}
                onClick={() => onCambiar(pagina)}
                disabled={cargando || pagina === page}
                className={`${botonBase} ${
                  pagina === page
                    ? "border-[#2183AE] bg-[#2183AE] text-white disabled:opacity-100"
                    : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {pagina}
              </button>
            )
          )}

          <button
            onClick={() => onCambiar(page + 1)}
            disabled={cargando || page >= totalPages}
            className={`${botonBase} border-gray-300 bg-white text-gray-600 hover:bg-gray-50`}
            aria-label="Página siguiente"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export function BannerMensaje({ tipo, texto, onCerrar }: { tipo: "ok" | "error"; texto: string; onCerrar?: () => void }) {
  const estilos =
    tipo === "ok"
      ? "bg-green-50 border-green-200 text-green-800"
      : "bg-red-50 border-red-200 text-red-700";

  return (
    <div className={`flex items-start justify-between gap-3 border rounded-xl px-4 py-3 text-sm mb-4 ${estilos}`}>
      <p>{texto}</p>
      {onCerrar && (
        <button onClick={onCerrar} className="shrink-0 opacity-60 hover:opacity-100">
          <XIcon size={14} />
        </button>
      )}
    </div>
  );
}

export function ModalBase({
  titulo,
  subtitulo,
  ancho = "max-w-md",
  deshabilitarCierre = false,
  onClose,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  ancho?: string;
  deshabilitarCierre?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deshabilitarCierre) onClose();
    };
    window.addEventListener("keydown", alPresionar);
    return () => window.removeEventListener("keydown", alPresionar);
  }, [onClose, deshabilitarCierre]);

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={deshabilitarCierre ? undefined : onClose}
    >
      <div
        className={`bg-white rounded-2xl shadow-2xl w-full ${ancho} max-h-[92vh] flex flex-col`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{titulo}</h3>
            {subtitulo && <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>}
          </div>
          <button
            onClick={onClose}
            disabled={deshabilitarCierre}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
          >
            <XIcon size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
