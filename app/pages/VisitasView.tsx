"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Search,
  Eraser,
  Loader2,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  X as XIcon,
  ExternalLink,
  WifiOff,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  buscarVisitas,
  exportarVisitas,
  getUsuariosConVisitas,
  getVisita,
  FormatoExportacionVisitas,
} from "../api/VisitaApi";
import { EvidenciaVisita, FiltrosVisitas, UsuarioConVisitas, Visita } from "../types/VisitaModel";

// Mismos colores que los marcadores de VisitaMap.
const COLOR_GPS_TELEFONO = "#2183AE";
const COLOR_GPS_FOTO = "#f59e0b";

// El mapa se carga sin SSR porque la API de Google Maps necesita `window`.
const VisitaMap = dynamic(() => import("./VisitaMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">Cargando mapa…</div>
  ),
});

const ZONA_HORARIA = "America/Guatemala";

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", { timeZone: ZONA_HORARIA, dateStyle: "short", timeStyle: "short" });
}

function tieneUbicacion(v: Visita): boolean {
  return (v.phone_lat !== null && v.phone_lng !== null) || (v.photo_lat !== null && v.photo_lng !== null);
}

function enlaceGoogleMaps(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function VisitaDetalleModal({
  visita,
  evidencias,
  cargando,
  error,
  onClose,
}: {
  visita: Visita | null;
  evidencias: EvidenciaVisita[];
  cargando: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const detalle = visita;

  const telefono = useMemo(
    () => (detalle && detalle.phone_lat !== null && detalle.phone_lng !== null
      ? { lat: detalle.phone_lat, lng: detalle.phone_lng }
      : null),
    [detalle]
  );
  const foto = useMemo(
    () => (detalle && detalle.photo_lat !== null && detalle.photo_lng !== null
      ? { lat: detalle.photo_lat, lng: detalle.photo_lng }
      : null),
    [detalle]
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-base font-semibold text-gray-900">Detalle de la visita</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <XIcon size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          {cargando && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-16">
              <Loader2 size={18} className="animate-spin" /> Cargando visita…
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </p>
          )}

          {!cargando && !error && detalle && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Lugar</p>
                  <p className="text-gray-800">{detalle.whs_name || "—"}</p>
                  <p className="text-xs text-gray-400">{detalle.whs_code}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Fecha de la visita</p>
                  <p className="text-gray-800 flex items-center gap-2 flex-wrap">
                    {formatearFechaHora(detalle.fecha_visita)}
                    {detalle.is_offline && (
                      <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        <WifiOff size={11} /> Registrada sin conexión
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Usuario</p>
                  <p className="text-gray-800">{detalle.usuario_nombre}</p>
                  {detalle.codigo_user && <p className="text-xs text-gray-400">{detalle.codigo_user}</p>}
                </div>
                <div>
                  <p className="text-xs text-gray-400">Dispositivo</p>
                  <p className="text-gray-800">{detalle.device_model || "—"}</p>
                  {detalle.device_so && <p className="text-xs text-gray-400">{detalle.device_so}</p>}
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-1">Comentario</p>
                <p className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 border border-gray-100 rounded-lg p-3">
                  {detalle.comentario}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <p className="text-xs text-gray-400">Ubicación</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_GPS_TELEFONO }} /> GPS del teléfono
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLOR_GPS_FOTO }} /> GPS de la foto
                    </span>
                  </div>
                </div>

                {telefono || foto ? (
                  <>
                    <div className="h-72 rounded-xl overflow-hidden border border-gray-200">
                      <VisitaMap telefono={telefono} foto={foto} />
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-gray-500">
                      {telefono && (
                        <a
                          href={enlaceGoogleMaps(telefono.lat, telefono.lng)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#2183AE] hover:underline"
                        >
                          <ExternalLink size={12} /> Teléfono: {telefono.lat.toFixed(6)}, {telefono.lng.toFixed(6)}
                        </a>
                      )}
                      {foto && (
                        <a
                          href={enlaceGoogleMaps(foto.lat, foto.lng)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[#2183AE] hover:underline"
                        >
                          <ExternalLink size={12} /> Foto: {foto.lat.toFixed(6)}, {foto.lng.toFixed(6)}
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl py-8 text-center">
                    Esta visita no tiene coordenadas GPS registradas.
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-2">Evidencias ({evidencias.length})</p>
                {evidencias.length === 0 ? (
                  <p className="text-sm text-gray-400">Esta visita no tiene evidencias.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {evidencias.map((e) => (
                      <div key={e.id_evidencia} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                        {!e.url ? (
                          <div className="h-40 flex flex-col items-center justify-center gap-1 text-xs text-gray-400">
                            <ImageIcon size={18} /> No disponible
                          </div>
                        ) : e.tipo_archivo === "VIDEO" ? (
                          <video src={e.url} controls className="w-full h-40 bg-black" />
                        ) : (
                          <a href={e.url} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={e.url} alt={`Evidencia ${e.orden}`} className="w-full h-40 object-cover" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
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

export function VisitasView() {
  const [usuarios, setUsuarios] = useState<UsuarioConVisitas[]>([]);

  const [idUsuario, setIdUsuario] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [lugar, setLugar] = useState("");

  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [total, setTotal] = useState(0);
  const [limite, setLimite] = useState(0);
  const [buscando, setBuscando] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Filtros con los que se hizo la última búsqueda: la exportación usa estos,
  // no lo que se esté editando en los campos.
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosVisitas>({});

  const [exportando, setExportando] = useState<FormatoExportacionVisitas | null>(null);
  const [errorExportar, setErrorExportar] = useState<string | null>(null);

  const [visitaAbierta, setVisitaAbierta] = useState<Visita | null>(null);
  const [evidencias, setEvidencias] = useState<EvidenciaVisita[]>([]);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  useEffect(() => {
    getUsuariosConVisitas()
      .then(setUsuarios)
      .catch(() => setUsuarios([]));
  }, []);

  const handleBuscar = async () => {
    const filtros: FiltrosVisitas = {
      id_usuario: idUsuario || undefined,
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
      whs_name: lugar || undefined,
    };

    setBuscando(true);
    setError(null);
    setErrorExportar(null);

    try {
      const resultado = await buscarVisitas(filtros);
      setVisitas(resultado.visitas);
      setTotal(resultado.total);
      setLimite(resultado.limite);
      setFiltrosAplicados(filtros);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar las visitas");
    } finally {
      setBuscando(false);
    }
  };

  const handleLimpiar = () => {
    setIdUsuario("");
    setFechaDesde("");
    setFechaHasta("");
    setLugar("");
    setVisitas([]);
    setTotal(0);
    setHasSearched(false);
    setError(null);
    setErrorExportar(null);
  };

  const handleExportar = async (formato: FormatoExportacionVisitas) => {
    setExportando(formato);
    setErrorExportar(null);

    try {
      await exportarVisitas(filtrosAplicados, formato);
    } catch (err) {
      setErrorExportar(err instanceof Error ? err.message : "Error al exportar las visitas");
    } finally {
      setExportando(null);
    }
  };

  const handleAbrirVisita = async (visita: Visita) => {
    setVisitaAbierta(visita);
    setEvidencias([]);
    setErrorDetalle(null);
    setCargandoDetalle(true);

    try {
      const { visita: detalle, evidencias: lista } = await getVisita(visita.id_visita);
      setVisitaAbierta(detalle);
      setEvidencias(lista);
    } catch (err) {
      setErrorDetalle(err instanceof Error ? err.message : "Error al obtener la visita");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const fechasInvertidas = fechaDesde !== "" && fechaHasta !== "" && fechaDesde > fechaHasta;

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <MapPin className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">Visitas a Avícolas</h2>
            <p className="text-sm text-white/90 mt-0.5">
              Consulta las visitas registradas, su ubicación en el mapa y exporta los resultados
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Usuario</label>
            <select
              value={idUsuario}
              onChange={(e) => setIdUsuario(e.target.value)}
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
            <label className="block text-xs text-gray-500 mb-1">Fecha desde</label>
            <Input type="date" value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Fecha hasta</label>
            <Input type="date" value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lugar (nombre)</label>
            <Input
              placeholder="Ej. Avícola Central"
              value={lugar}
              onChange={(e) => setLugar(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !fechasInvertidas && handleBuscar()}
            />
          </div>
        </div>

        <p className="text-[11px] text-gray-400 mt-2">
          Para un solo día, usa la misma fecha en &quot;desde&quot; y &quot;hasta&quot;.
        </p>
        {fechasInvertidas && (
          <p className="text-xs text-red-600 mt-1">La fecha &quot;desde&quot; no puede ser mayor que la fecha &quot;hasta&quot;.</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Button onClick={handleBuscar} disabled={buscando || fechasInvertidas} size="sm" variant="submit">
            {buscando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Search size={14} className="mr-1.5" />}
            Buscar
          </Button>
          <Button onClick={handleLimpiar} disabled={buscando} size="sm" variant="outline">
            <Eraser size={14} className="mr-1.5" />
            Limpiar
          </Button>

          <div className="flex items-center gap-2 sm:ml-auto">
            <Button
              onClick={() => handleExportar("pdf")}
              disabled={exportando !== null || visitas.length === 0}
              size="sm"
              variant="outline"
            >
              {exportando === "pdf" ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <FileText size={14} className="mr-1.5" />}
              Exportar PDF
            </Button>
            <Button
              onClick={() => handleExportar("excel")}
              disabled={exportando !== null || visitas.length === 0}
              size="sm"
              variant="outline"
            >
              {exportando === "excel" ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <FileSpreadsheet size={14} className="mr-1.5" />}
              Exportar Excel
            </Button>
          </div>
        </div>

        {errorExportar && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
            <AlertCircle size={13} className="shrink-0" /> {errorExportar}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2.5 mb-4">
          <AlertCircle size={16} className="text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!hasSearched && !buscando && !error && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <MapPin size={24} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Define los filtros y presiona Buscar para ver las visitas.</p>
        </div>
      )}

      {hasSearched && visitas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <MapPin size={24} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No se encontraron visitas con esos filtros.</p>
        </div>
      )}

      {visitas.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500">
            {total > limite
              ? `Mostrando las ${visitas.length} visitas más recientes de ${total}. Acota los filtros para ver el resto.`
              : `${total} visita${total !== 1 ? "s" : ""}`}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 bg-gray-50">
                  <th className="px-4 py-2 font-medium whitespace-nowrap">Fecha</th>
                  <th className="px-4 py-2 font-medium">Usuario</th>
                  <th className="px-4 py-2 font-medium">Lugar</th>
                  <th className="px-4 py-2 font-medium">Comentario</th>
                  <th className="px-4 py-2 font-medium text-center">Evid.</th>
                  <th className="px-4 py-2 font-medium text-center">GPS</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visitas.map((v) => (
                  <tr key={v.id_visita} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{formatearFechaHora(v.fecha_visita)}</td>
                    <td className="px-4 py-2.5 text-gray-800">{v.usuario_nombre}</td>
                    <td className="px-4 py-2.5">
                      <p className="text-gray-800">{v.whs_name || "—"}</p>
                      <p className="text-xs text-gray-400">{v.whs_code}</p>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-xs">
                      <p className="line-clamp-2">{v.comentario}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-600">{v.total_evidencias}</td>
                    <td className="px-4 py-2.5 text-center">
                      {tieneUbicacion(v) ? (
                        <MapPin size={15} className="inline text-[#2183AE]" />
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button onClick={() => handleAbrirVisita(v)} size="sm" variant="outline">
                        Ver
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {visitaAbierta && (
        <VisitaDetalleModal
          visita={visitaAbierta}
          evidencias={evidencias}
          cargando={cargandoDetalle}
          error={errorDetalle}
          onClose={() => setVisitaAbierta(null)}
        />
      )}
    </div>
  );
}
