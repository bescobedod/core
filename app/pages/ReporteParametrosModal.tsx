"use client";

import { useState } from "react";
import { Loader2, FileText, FileSpreadsheet, X as XIcon } from "lucide-react";
import { Button } from "../ui/button";
import { DivisionReporte, FormatoReporte } from "../api/PedidoPosApi";

// Mismos muelles que RoutesPolloView/UsuarioMuellePolloView.
export const MUELLES_POLLO = [
  { whs_code: "RAS-002", nombre: "Central" },
  { whs_code: "RAS-003", nombre: "Zacapa" },
  { whs_code: "RAS-004", nombre: "Xela" },
];

const OPCIONES_DIVISION: { value: DivisionReporte; label: string }[] = [
  { value: "1", label: "División 1" },
  { value: "2", label: "División 2" },
  { value: "1,2", label: "Ambas" },
];

export interface ParametrosReporte {
  // undefined cuando el modal no muestra división (el llamador decide cuál usar).
  division?: DivisionReporte;
  // Vacío = todos los muelles.
  muelles: string[];
  formato: FormatoReporte;
}

const OPCIONES_FORMATO: { value: FormatoReporte; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
];

interface ReporteParametrosModalProps {
  tipoPedido: "POLLO" | "INSUMOS";
  fecha: string;
  mostrarDivision: boolean;
  cargando: boolean;
  error: string | null;
  onGenerar: (parametros: ParametrosReporte) => void;
  onClose: () => void;
}

// Parámetros del reporte de pedidos por fecha: muelles (solo Pollo, Insumos no
// tiene) y división (se oculta para usuarios lectura_division, que solo pueden
// ver la suya).
export function ReporteParametrosModal({
  tipoPedido,
  fecha,
  mostrarDivision,
  cargando,
  error,
  onGenerar,
  onClose,
}: ReporteParametrosModalProps) {
  const [todosLosMuelles, setTodosLosMuelles] = useState(true);
  const [muellesSeleccionados, setMuellesSeleccionados] = useState<string[]>([]);
  const [division, setDivision] = useState<DivisionReporte>("1,2");
  const [formato, setFormato] = useState<FormatoReporte>("pdf");

  const mostrarMuelles = tipoPedido === "POLLO";
  const sinMuelleElegido = mostrarMuelles && !todosLosMuelles && muellesSeleccionados.length === 0;

  const toggleMuelle = (whsCode: string) => {
    setMuellesSeleccionados((prev) =>
      prev.includes(whsCode) ? prev.filter((m) => m !== whsCode) : [...prev, whsCode]
    );
  };

  const handleGenerar = () => {
    onGenerar({
      division: mostrarDivision ? division : undefined,
      muelles: mostrarMuelles && !todosLosMuelles ? muellesSeleccionados : [],
      formato,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={cargando ? undefined : onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Generar reporte</h3>
            <p className="text-xs text-gray-500 mt-0.5">Pedidos con fecha requerida {fecha}</p>
          </div>
          <button onClick={onClose} disabled={cargando} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <XIcon size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {mostrarMuelles && (
            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">Muelles</p>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={todosLosMuelles}
                    onChange={(e) => setTodosLosMuelles(e.target.checked)}
                    className="h-4 w-4 accent-[#2183AE]"
                  />
                  Todos los muelles
                </label>
                <div className="pl-6 space-y-2">
                  {MUELLES_POLLO.map((m) => (
                    <label
                      key={m.whs_code}
                      className={`flex items-center gap-2 text-sm cursor-pointer ${todosLosMuelles ? "text-gray-400" : "text-gray-700"}`}
                    >
                      <input
                        type="checkbox"
                        disabled={todosLosMuelles}
                        checked={todosLosMuelles || muellesSeleccionados.includes(m.whs_code)}
                        onChange={() => toggleMuelle(m.whs_code)}
                        className="h-4 w-4 accent-[#2183AE]"
                      />
                      {m.nombre} <span className="text-xs text-gray-400">({m.whs_code})</span>
                    </label>
                  ))}
                </div>
                {sinMuelleElegido && (
                  <p className="text-xs text-amber-600">Selecciona al menos un muelle o marca "Todos los muelles".</p>
                )}
              </div>
            </div>
          )}

          {mostrarDivision && (
            <div>
              <p className="text-sm font-medium text-gray-800 mb-2">División</p>
              <div className="flex border border-gray-300 rounded-lg overflow-hidden w-fit">
                {OPCIONES_DIVISION.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setDivision(o.value)}
                    className={`px-4 h-9 text-sm font-medium transition-colors ${
                      division === o.value ? "bg-[#2183AE] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-800 mb-2">Formato</p>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden w-fit">
              {OPCIONES_FORMATO.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setFormato(o.value)}
                  className={`px-4 h-9 text-sm font-medium transition-colors ${
                    formato === o.value ? "bg-[#2183AE] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2">
          <Button onClick={onClose} disabled={cargando} variant="cancel" size="sm">
            Cancelar
          </Button>
          <Button onClick={handleGenerar} disabled={cargando || sinMuelleElegido} variant="submit" size="sm">
            {cargando ? (
              <Loader2 size={14} className="animate-spin mr-1.5" />
            ) : formato === "excel" ? (
              <FileSpreadsheet size={14} className="mr-1.5" />
            ) : (
              <FileText size={14} className="mr-1.5" />
            )}
            {formato === "excel" ? "Descargar Excel" : "Generar reporte"}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface FormatoReporteModalProps {
  titulo: string;
  cargando: boolean;
  error: string | null;
  onElegir: (formato: FormatoReporte) => void;
  onClose: () => void;
}

// Ventana emergente para elegir cómo obtener un reporte que no tiene más
// parámetros: verlo como PDF o descargarlo en Excel.
export function FormatoReporteModal({ titulo, cargando, error, onElegir, onClose }: FormatoReporteModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={cargando ? undefined : onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{titulo}</h3>
            <p className="text-xs text-gray-500 mt-0.5">¿En qué formato quieres el reporte?</p>
          </div>
          <button onClick={onClose} disabled={cargando} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <XIcon size={18} />
          </button>
        </div>

        <div className="px-6 py-5 grid grid-cols-2 gap-3">
          <Button onClick={() => onElegir("pdf")} disabled={cargando} variant="outline" className="h-20 flex-col gap-1.5">
            <FileText size={22} />
            Generar PDF
          </Button>
          <Button onClick={() => onElegir("excel")} disabled={cargando} variant="outline" className="h-20 flex-col gap-1.5">
            <FileSpreadsheet size={22} />
            Descargar Excel
          </Button>
        </div>

        {(cargando || error) && (
          <div className="px-6 pb-4">
            {cargando && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <Loader2 size={13} className="animate-spin" /> Generando reporte…
              </p>
            )}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
