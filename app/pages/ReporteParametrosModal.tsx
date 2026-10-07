"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Loader2, FileText, FileSpreadsheet, X as XIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { DivisionReporte, FormatoReporte, ProductoReporte, getProductosReporte } from "../api/PedidoPosApi";

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
  // Solo con "Búsqueda avanzada" activada: fecha de inicio (o el día único),
  // fecha final si es un rango, y productos elegidos (vacío = todos).
  fechaDesde?: string;
  fechaHasta?: string;
  productos?: string[];
}

const MAX_DIAS_RANGO = 31;

function diasDelRango(desde: string, hasta: string): number {
  return (Date.parse(hasta) - Date.parse(desde)) / 86400000 + 1;
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

  // Búsqueda avanzada: un día o un rango de fechas, y productos.
  const [avanzada, setAvanzada] = useState(false);
  const [modoFecha, setModoFecha] = useState<"dia" | "rango">("dia");
  const [fechaDia, setFechaDia] = useState(fecha);
  const [fechaDesde, setFechaDesde] = useState(fecha);
  const [fechaHasta, setFechaHasta] = useState(fecha);
  const [productos, setProductos] = useState<ProductoReporte[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);
  const [todosLosProductos, setTodosLosProductos] = useState(true);
  const [productosSeleccionados, setProductosSeleccionados] = useState<string[]>([]);
  const [busquedaProducto, setBusquedaProducto] = useState("");

  const mostrarMuelles = tipoPedido === "POLLO";
  const sinMuelleElegido = mostrarMuelles && !todosLosMuelles && muellesSeleccionados.length === 0;

  // Los productos se cargan la primera vez que se activa la búsqueda avanzada.
  useEffect(() => {
    if (!avanzada || productos.length > 0 || cargandoProductos) return;

    setCargandoProductos(true);
    setErrorProductos(null);

    getProductosReporte(tipoPedido)
      .then(setProductos)
      .catch((err) => setErrorProductos(err instanceof Error ? err.message : "Error al obtener los productos"))
      .finally(() => setCargandoProductos(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avanzada, tipoPedido]);

  const toggleMuelle = (whsCode: string) => {
    setMuellesSeleccionados((prev) =>
      prev.includes(whsCode) ? prev.filter((m) => m !== whsCode) : [...prev, whsCode]
    );
  };

  const toggleProducto = (codigo: string) => {
    setProductosSeleccionados((prev) =>
      prev.includes(codigo) ? prev.filter((c) => c !== codigo) : [...prev, codigo]
    );
  };

  const textoBusqueda = busquedaProducto.trim().toLowerCase();
  const productosVisibles = textoBusqueda
    ? productos.filter(
        (p) =>
          p.descripcion_producto.toLowerCase().includes(textoBusqueda) ||
          p.codigo_producto.toLowerCase().includes(textoBusqueda)
      )
    : productos;

  const sinProductoElegido = avanzada && !todosLosProductos && productosSeleccionados.length === 0;

  let errorFechas: string | null = null;
  if (avanzada) {
    if (modoFecha === "dia") {
      if (!fechaDia) errorFechas = "Elige una fecha.";
    } else if (!fechaDesde || !fechaHasta) {
      errorFechas = "Elige la fecha inicial y la final.";
    } else if (fechaHasta < fechaDesde) {
      errorFechas = "La fecha final no puede ser anterior a la inicial.";
    } else if (diasDelRango(fechaDesde, fechaHasta) > MAX_DIAS_RANGO) {
      errorFechas = `El rango no puede pasar de ${MAX_DIAS_RANGO} días.`;
    }
  }

  const handleGenerar = () => {
    const base: ParametrosReporte = {
      division: mostrarDivision ? division : undefined,
      muelles: mostrarMuelles && !todosLosMuelles ? muellesSeleccionados : [],
      formato,
    };

    if (!avanzada) {
      onGenerar(base);
      return;
    }

    onGenerar({
      ...base,
      fechaDesde: modoFecha === "rango" ? fechaDesde : fechaDia,
      fechaHasta: modoFecha === "rango" ? fechaHasta : undefined,
      productos: todosLosProductos ? [] : productosSeleccionados,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={cargando ? undefined : onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Generar reporte</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {avanzada ? "Búsqueda avanzada: elige fechas y productos" : `Pedidos con fecha requerida ${fecha}`}
            </p>
          </div>
          <button onClick={onClose} disabled={cargando} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <XIcon size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto min-h-0">
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
            <label className="flex items-center gap-2 text-sm font-medium text-gray-800 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={avanzada}
                onChange={(e) => setAvanzada(e.target.checked)}
                className="h-4 w-4 accent-[#2183AE]"
              />
              Búsqueda avanzada
            </label>

            <AnimatePresence initial={false}>
              {avanzada && (
                <motion.div
                  key="busqueda-avanzada"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 space-y-5">
                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2">Fechas</p>
                      <div className="flex border border-gray-300 rounded-lg overflow-hidden w-fit mb-3">
                        {(["dia", "rango"] as const).map((modo) => (
                          <button
                            key={modo}
                            type="button"
                            onClick={() => setModoFecha(modo)}
                            className={`px-4 h-9 text-sm font-medium transition-colors ${
                              modoFecha === modo ? "bg-[#2183AE] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {modo === "dia" ? "Una fecha" : "Rango de fechas"}
                          </button>
                        ))}
                      </div>

                      {modoFecha === "dia" ? (
                        <Input type="date" value={fechaDia} onChange={(e) => setFechaDia(e.target.value)} className="w-44" />
                      ) : (
                        <div className="flex items-end gap-3 flex-wrap">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Desde</label>
                            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} className="w-40" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
                            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} className="w-40" />
                          </div>
                        </div>
                      )}

                      {modoFecha === "rango" && !errorFechas && (
                        <p className="text-[11px] text-gray-400 mt-2">
                          Máximo {MAX_DIAS_RANGO} días. El reporte por rango es un documento distinto: agrupa los pedidos por fecha.
                        </p>
                      )}
                      {errorFechas && <p className="text-xs text-amber-600 mt-2">{errorFechas}</p>}
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-800 mb-2">Productos</p>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer w-fit">
                        <input
                          type="checkbox"
                          checked={todosLosProductos}
                          onChange={(e) => setTodosLosProductos(e.target.checked)}
                          className="h-4 w-4 accent-[#2183AE]"
                        />
                        Todos los productos
                      </label>

                      {!todosLosProductos && (
                        <div className="mt-2">
                          {cargandoProductos ? (
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Loader2 size={13} className="animate-spin" /> Cargando productos…
                            </p>
                          ) : errorProductos ? (
                            <p className="text-xs text-red-600">{errorProductos}</p>
                          ) : (
                            <>
                              <Input
                                placeholder="Buscar producto por nombre o código…"
                                value={busquedaProducto}
                                onChange={(e) => setBusquedaProducto(e.target.value)}
                              />
                              <div className="mt-2 border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-50">
                                {productosVisibles.length === 0 ? (
                                  <p className="text-xs text-gray-400 px-3 py-3">Ningún producto coincide.</p>
                                ) : (
                                  productosVisibles.map((p) => (
                                    <label
                                      key={p.codigo_producto}
                                      className="flex items-start gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={productosSeleccionados.includes(p.codigo_producto)}
                                        onChange={() => toggleProducto(p.codigo_producto)}
                                        className="h-4 w-4 mt-0.5 accent-[#2183AE] shrink-0"
                                      />
                                      <span className="min-w-0">
                                        {p.descripcion_producto}
                                        <span className="block text-[11px] text-gray-400">{p.codigo_producto}</span>
                                      </span>
                                    </label>
                                  ))
                                )}
                              </div>
                              <p className="text-[11px] text-gray-400 mt-1.5">
                                {productosSeleccionados.length} seleccionado{productosSeleccionados.length !== 1 ? "s" : ""}
                              </p>
                              {sinProductoElegido && (
                                <p className="text-xs text-amber-600 mt-1">
                                  Selecciona al menos un producto o marca "Todos los productos".
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
          <Button onClick={onClose} disabled={cargando} variant="cancel" size="sm">
            Cancelar
          </Button>
          <Button
            onClick={handleGenerar}
            disabled={cargando || sinMuelleElegido || sinProductoElegido || errorFechas !== null}
            variant="submit"
            size="sm"
          >
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
