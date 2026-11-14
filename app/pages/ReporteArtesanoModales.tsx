"use client";

import { useState } from "react";
import { Loader2, FileText, FileSpreadsheet, X as XIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getProductosArtesano } from "../api/PedidoEspecialApi";
import { FormatoReporteArtesano } from "../api/PedidoArtesanoRutaApi";
import { ProductoArtesano } from "../types/PedidoEspecialModel";
import { RutaPollo } from "../types/RutaPolloModel";

const MAX_DIAS_RANGO = 31;

const ESTADOS_REPORTE = [
  { value: "CREADO", label: "Creado" },
  { value: "VALIDADO", label: "Validado" },
  { value: "EN_TRANSITO", label: "En tránsito" },
  { value: "ENTREGADO", label: "Entregado" },
  { value: "RECHAZADO", label: "Rechazado" },
  { value: "CANCELADO", label: "Cancelado" },
];

export interface ParametrosReporteArtesano {
  formato: FormatoReporteArtesano;
  fecha: string;
  fechaHasta?: string;
  // Vacío = todos.
  estados: string[];
  rutas: string[];
  productos: string[];
}

interface Props {
  fecha: string;
  rutas: RutaPollo[];
  cargando: boolean;
  error: string | null;
  onGenerar: (parametros: ParametrosReporteArtesano) => void;
  onClose: () => void;
}

function diasDelRango(desde: string, hasta: string): number {
  return (Date.parse(hasta) - Date.parse(desde)) / 86400000 + 1;
}

function alternar(lista: string[], valor: string): string[] {
  return lista.includes(valor) ? lista.filter((v) => v !== valor) : [...lista, valor];
}

function BotonesSegmentados<T extends string>({ opciones, valor, onChange }: { opciones: { value: T; label: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="flex border border-gray-300 rounded-lg overflow-hidden w-fit">
      {opciones.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-4 h-9 text-sm font-medium transition-colors ${valor === o.value ? "bg-[#2183AE] text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Grupo "Todos" + casillas individuales; si "Todos" está marcado las casillas quedan deshabilitadas.
function GrupoFiltro({
  titulo,
  textoTodos,
  todos,
  onTodos,
  opciones,
  seleccionados,
  onAlternar,
  aviso,
}: {
  titulo: string;
  textoTodos: string;
  todos: boolean;
  onTodos: (v: boolean) => void;
  opciones: { value: string; label: string }[];
  seleccionados: string[];
  onAlternar: (v: string) => void;
  aviso: string | null;
}) {
  return (
    <div>
      <p className="text-sm font-medium text-gray-800 mb-2">{titulo}</p>
      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer w-fit">
        <input type="checkbox" checked={todos} onChange={(e) => onTodos(e.target.checked)} className="h-4 w-4 accent-[#2183AE]" />
        {textoTodos}
      </label>
      <div className="pl-6 mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
        {opciones.map((o) => (
          <label key={o.value} className={`flex items-center gap-2 text-sm cursor-pointer ${todos ? "text-gray-400" : "text-gray-700"}`}>
            <input
              type="checkbox"
              disabled={todos}
              checked={todos || seleccionados.includes(o.value)}
              onChange={() => onAlternar(o.value)}
              className="h-4 w-4 accent-[#2183AE] shrink-0"
            />
            <span className="truncate">{o.label}</span>
          </label>
        ))}
      </div>
      {aviso && <p className="text-xs text-amber-600 mt-2">{aviso}</p>}
    </div>
  );
}

// Parámetros del reporte de detalle de pedidos de pollo artesano.
export function ReporteDetalleArtesanoModal({ fecha, rutas, cargando, error, onGenerar, onClose }: Props) {
  const [formato, setFormato] = useState<FormatoReporteArtesano>("pdf");
  const [modoFecha, setModoFecha] = useState<"dia" | "rango">("dia");
  const [fechaDia, setFechaDia] = useState(fecha);
  const [fechaDesde, setFechaDesde] = useState(fecha);
  const [fechaHasta, setFechaHasta] = useState(fecha);

  const [todosEstados, setTodosEstados] = useState(true);
  const [estados, setEstados] = useState<string[]>([]);
  const [todasRutas, setTodasRutas] = useState(true);
  const [rutasElegidas, setRutasElegidas] = useState<string[]>([]);

  const [todosProductos, setTodosProductos] = useState(true);
  const [productos, setProductos] = useState<ProductoArtesano[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [errorProductos, setErrorProductos] = useState<string | null>(null);
  const [productosElegidos, setProductosElegidos] = useState<string[]>([]);

  // Los productos se piden la primera vez que se desmarca "Todos los productos".
  const handleTodosProductos = (marcado: boolean) => {
    setTodosProductos(marcado);

    if (marcado || productos.length > 0 || cargandoProductos) return;

    setCargandoProductos(true);
    setErrorProductos(null);

    getProductosArtesano()
      .then(setProductos)
      .catch((err) => setErrorProductos(err instanceof Error ? err.message : "Error al obtener los productos"))
      .finally(() => setCargandoProductos(false));
  };

  let errorFechas: string | null = null;
  if (modoFecha === "dia") {
    if (!fechaDia) errorFechas = "Elige una fecha.";
  } else if (!fechaDesde || !fechaHasta) {
    errorFechas = "Elige la fecha inicial y la final.";
  } else if (fechaHasta < fechaDesde) {
    errorFechas = "La fecha final no puede ser anterior a la inicial.";
  } else if (diasDelRango(fechaDesde, fechaHasta) > MAX_DIAS_RANGO) {
    errorFechas = `El rango no puede pasar de ${MAX_DIAS_RANGO} días.`;
  }

  const sinEstado = !todosEstados && estados.length === 0;
  const sinRuta = !todasRutas && rutasElegidas.length === 0;
  const sinProducto = !todosProductos && productosElegidos.length === 0;

  const handleGenerar = () =>
    onGenerar({
      formato,
      fecha: modoFecha === "rango" ? fechaDesde : fechaDia,
      fechaHasta: modoFecha === "rango" ? fechaHasta : undefined,
      estados: todosEstados ? [] : estados,
      rutas: todasRutas ? [] : rutasElegidas,
      productos: todosProductos ? [] : productosElegidos,
    });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={cargando ? undefined : onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Generar reporte</h3>
            <p className="text-xs text-gray-500 mt-0.5">Detalle de pedidos de pollo artesano</p>
          </div>
          <button onClick={onClose} disabled={cargando} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <XIcon size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5 overflow-y-auto min-h-0">
          <div>
            <p className="text-sm font-medium text-gray-800 mb-2">Fecha requerida</p>
            <div className="mb-3">
              <BotonesSegmentados
                opciones={[
                  { value: "dia", label: "Una fecha" },
                  { value: "rango", label: "Rango de fechas" },
                ]}
                valor={modoFecha}
                onChange={setModoFecha}
              />
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
              <p className="text-[11px] text-gray-400 mt-2">Máximo {MAX_DIAS_RANGO} días. El reporte agrupa los pedidos por fecha.</p>
            )}
            {errorFechas && <p className="text-xs text-amber-600 mt-2">{errorFechas}</p>}
          </div>

          <GrupoFiltro
            titulo="Estados"
            textoTodos="Todos los estados"
            todos={todosEstados}
            onTodos={setTodosEstados}
            opciones={ESTADOS_REPORTE}
            seleccionados={estados}
            onAlternar={(v) => setEstados((prev) => alternar(prev, v))}
            aviso={sinEstado ? 'Selecciona al menos un estado o marca "Todos los estados".' : null}
          />

          <GrupoFiltro
            titulo="Rutas"
            textoTodos="Todas las rutas"
            todos={todasRutas}
            onTodos={setTodasRutas}
            opciones={rutas.map((r) => ({ value: r.id, label: r.nombre_ruta }))}
            seleccionados={rutasElegidas}
            onAlternar={(v) => setRutasElegidas((prev) => alternar(prev, v))}
            aviso={sinRuta ? 'Selecciona al menos una ruta o marca "Todas las rutas".' : null}
          />

          <div>
            <p className="text-sm font-medium text-gray-800 mb-2">Productos</p>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer w-fit">
              <input type="checkbox" checked={todosProductos} onChange={(e) => handleTodosProductos(e.target.checked)} className="h-4 w-4 accent-[#2183AE]" />
              Todos los productos
            </label>

            {!todosProductos && (
              <div className="mt-2">
                {cargandoProductos ? (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5">
                    <Loader2 size={13} className="animate-spin" /> Cargando productos…
                  </p>
                ) : errorProductos ? (
                  <p className="text-xs text-red-600">{errorProductos}</p>
                ) : (
                  <>
                    <div className="border border-gray-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-gray-50">
                      {productos.map((p) => (
                        <label key={p.codigo_producto} className="flex items-start gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                          <input
                            type="checkbox"
                            checked={productosElegidos.includes(p.codigo_producto)}
                            onChange={() => setProductosElegidos((prev) => alternar(prev, p.codigo_producto))}
                            className="h-4 w-4 mt-0.5 accent-[#2183AE] shrink-0"
                          />
                          <span className="min-w-0">
                            {p.descripcion_producto}
                            <span className="block text-[11px] text-gray-400">{p.codigo_producto}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {sinProducto && <p className="text-xs text-amber-600 mt-1.5">Selecciona al menos un producto o marca &quot;Todos los productos&quot;.</p>}
                  </>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-800 mb-2">Formato</p>
            <BotonesSegmentados
              opciones={[
                { value: "pdf", label: "PDF" },
                { value: "excel", label: "Excel" },
              ]}
              valor={formato}
              onChange={setFormato}
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0">
          <Button onClick={onClose} disabled={cargando} variant="cancel" size="sm">
            Cancelar
          </Button>
          <Button onClick={handleGenerar} disabled={cargando || sinEstado || sinRuta || sinProducto || errorFechas !== null} variant="submit" size="sm">
            {cargando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : formato === "excel" ? <FileSpreadsheet size={14} className="mr-1.5" /> : <FileText size={14} className="mr-1.5" />}
            {formato === "excel" ? "Descargar Excel" : "Generar reporte"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Muestra un PDF ya generado dentro de la pantalla.
export function VistaPreviaReporteModal({ url, titulo, onClose }: { url: string; titulo: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-base font-semibold text-gray-900">{titulo}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <XIcon size={18} />
          </button>
        </div>
        <div className="flex-1 min-h-0 bg-gray-100">
          <iframe src={url} title={titulo} className="w-full h-full border-0" style={{ minHeight: "70vh" }} />
        </div>
        <div className="px-6 py-3 border-t border-gray-100 flex justify-end shrink-0">
          <Button onClick={onClose} variant="cancel" size="sm">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
