"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Clock,
  Search,
  Eraser,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  X as XIcon,
  ExternalLink,
  WifiOff,
  ImageIcon,
  LogIn,
  LogOut,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  buscarMarcajes,
  exportarMarcajes,
  getMarcaje,
  getUsuariosConMarcajes,
  getZonasMarcaje,
} from "../api/MarcajeApi";
import {
  EstadoZonaMarcaje,
  FiltrosMarcajes,
  Marcaje,
  MarcajeDetalle,
  ResumenMarcajes,
  TipoMarcaje,
  UsuarioConMarcajes,
  ZonaMarcaje,
} from "../types/MarcajeModel";

// El mapa se carga sin SSR porque la API de Google Maps necesita `window`.
const MarcajeMap = dynamic(() => import("./MarcajeMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">Cargando mapa…</div>
  ),
});

const ZONA_HORARIA = "America/Guatemala";

function formatearFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-GT", { timeZone: ZONA_HORARIA, dateStyle: "short", timeStyle: "short" });
}

function enlaceGoogleMaps(lat: number, lng: number): string {
  return `https://www.google.com/maps?q=${lat},${lng}`;
}

function formatearDistancia(metros: number): string {
  return metros >= 1000 ? `${(metros / 1000).toFixed(1)} km` : `${metros} m`;
}

function BadgeTipo({ tipo }: { tipo: TipoMarcaje }) {
  const esEntrada = tipo === "ENTRADA";
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
        esEntrada ? "bg-blue-50 text-[#2183AE] border-blue-200" : "bg-gray-100 text-gray-600 border-gray-200"
      }`}
    >
      {esEntrada ? <LogIn size={11} /> : <LogOut size={11} />}
      {esEntrada ? "Entrada" : "Salida"}
    </span>
  );
}

function BadgeZona({ estado, zona, distancia }: { estado: EstadoZonaMarcaje; zona: string | null; distancia: number | null }) {
  if (estado === "SIN_RESTRICCION") {
    return <span className="text-xs text-gray-400">Sin restricción</span>;
  }

  const estilos: Record<Exclude<EstadoZonaMarcaje, "SIN_RESTRICCION">, string> = {
    DENTRO: "bg-green-50 text-green-700 border-green-200",
    FUERA: "bg-red-50 text-red-700 border-red-200",
    SIN_GPS: "bg-amber-50 text-amber-700 border-amber-200",
  };
  const textos = { DENTRO: "Dentro de zona", FUERA: "Fuera de zona", SIN_GPS: "Sin GPS" };

  return (
    <div>
      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${estilos[estado]}`}>
        {textos[estado]}
      </span>
      {zona && (
        <p className="text-xs text-gray-400 mt-0.5">
          {zona}
          {estado === "FUERA" && distancia !== null ? ` · a ${formatearDistancia(distancia)}` : ""}
        </p>
      )}
    </div>
  );
}

function MarcajeDetalleModal({
  marcaje,
  cargando,
  error,
  onClose,
}: {
  marcaje: MarcajeDetalle | Marcaje;
  cargando: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const detalle = "zonas" in marcaje ? marcaje : null;

  const punto = useMemo(
    () => (marcaje.latitud !== null && marcaje.longitud !== null ? { lat: marcaje.latitud, lng: marcaje.longitud } : null),
    [marcaje.latitud, marcaje.longitud]
  );
  const zonas = useMemo(() => detalle?.zonas ?? [], [detalle]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <h3 className="text-base font-semibold text-gray-900">Detalle del marcaje</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400">
            <XIcon size={18} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-400">Usuario</p>
              <p className="text-gray-800">{marcaje.usuario_nombre}</p>
              <p className="text-xs text-gray-400">
                {[marcaje.codigo_user, marcaje.puesto_trabajo].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Fecha y hora</p>
              <p className="text-gray-800 flex items-center gap-2 flex-wrap">
                {formatearFechaHora(marcaje.fecha_hora)}
                <BadgeTipo tipo={marcaje.tipo} />
                {marcaje.is_offline && (
                  <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <WifiOff size={11} /> Sin conexión
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Validez</p>
              {marcaje.es_valido ? (
                <p className="text-green-700 flex items-center gap-1.5">
                  <ShieldCheck size={14} /> Marcaje válido
                </p>
              ) : (
                <>
                  <p className="text-red-700 flex items-center gap-1.5">
                    <ShieldAlert size={14} /> Marcaje inválido
                  </p>
                  {marcaje.razon_invalido && <p className="text-xs text-gray-500 mt-0.5">{marcaje.razon_invalido}</p>}
                </>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">Zona</p>
              <BadgeZona estado={marcaje.zona_estado} zona={marcaje.zona_nombre} distancia={marcaje.zona_distancia_m} />
              {marcaje.zonas_asignadas.length > 0 && (
                <p className="text-xs text-gray-400 mt-0.5">Asignadas: {marcaje.zonas_asignadas.join(", ")}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-400">Dispositivo</p>
              <p className="text-gray-800 break-words">{marcaje.dispositivo_info || "—"}</p>
              {marcaje.ip_address && <p className="text-xs text-gray-400">IP {marcaje.ip_address}</p>}
            </div>
            <div>
              <p className="text-xs text-gray-400">Sincronizado</p>
              <p className="text-gray-800">{formatearFechaHora(marcaje.fecha_sincronizacion)}</p>
            </div>
          </div>

          {cargando && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-10">
              <Loader2 size={18} className="animate-spin" /> Cargando detalle…
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 flex items-center gap-1.5">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </p>
          )}

          {!cargando && !error && (
            <>
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <p className="text-xs text-gray-400">Ubicación</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#2183AE]" /> Marcaje
                    </span>
                    {zonas.length > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-green-600" /> Zona permitida
                      </span>
                    )}
                  </div>
                </div>

                {punto ? (
                  <>
                    <div className="h-72 rounded-xl overflow-hidden border border-gray-200">
                      <MarcajeMap marcaje={punto} zonas={zonas} />
                    </div>
                    <a
                      href={enlaceGoogleMaps(punto.lat, punto.lng)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-[#2183AE] hover:underline"
                    >
                      <ExternalLink size={12} /> {punto.lat.toFixed(6)}, {punto.lng.toFixed(6)}
                    </a>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-xl py-8 text-center">
                    Este marcaje no tiene coordenadas GPS registradas.
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs text-gray-400 mb-2">Foto del marcaje</p>
                {detalle?.foto_url ? (
                  <a href={detalle.foto_url} target="_blank" rel="noreferrer" className="inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={detalle.foto_url}
                      alt="Foto del marcaje"
                      className="max-h-72 rounded-xl border border-gray-200 object-contain bg-gray-50"
                    />
                  </a>
                ) : (
                  <div className="h-24 flex flex-col items-center justify-center gap-1 text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl">
                    <ImageIcon size={18} /> No disponible
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

const TAMANO_PAGINA = 50;

function Resumen({ resumen }: { resumen: ResumenMarcajes }) {
  const tarjetas = [
    { etiqueta: "Entradas", valor: resumen.entradas, color: "text-[#2183AE]" },
    { etiqueta: "Salidas", valor: resumen.salidas, color: "text-gray-700" },
    { etiqueta: "Fuera de zona", valor: resumen.fuera_zona, color: "text-red-600" },
    { etiqueta: "Sin conexión", valor: resumen.offline, color: "text-amber-600" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      {tarjetas.map((t) => (
        <div key={t.etiqueta} className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3">
          <p className="text-xs text-gray-500">{t.etiqueta}</p>
          <p className={`text-xl font-semibold ${t.color}`}>{t.valor}</p>
        </div>
      ))}
    </div>
  );
}

export function MarcajeView() {
  const [usuarios, setUsuarios] = useState<UsuarioConMarcajes[]>([]);
  const [zonas, setZonas] = useState<ZonaMarcaje[]>([]);

  const [idUsuario, setIdUsuario] = useState("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [tipo, setTipo] = useState("");
  const [estado, setEstado] = useState("");
  const [idZona, setIdZona] = useState("");

  const [marcajes, setMarcajes] = useState<Marcaje[]>([]);
  const [total, setTotal] = useState(0);
  const [resumen, setResumen] = useState<ResumenMarcajes | null>(null);
  const [pagina, setPagina] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [tamano, setTamano] = useState(TAMANO_PAGINA);
  const [buscando, setBuscando] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Filtros de la última búsqueda: los usan la paginación y la exportación.
  const [filtrosAplicados, setFiltrosAplicados] = useState<FiltrosMarcajes>({});

  const [exportando, setExportando] = useState(false);
  const [errorExportar, setErrorExportar] = useState<string | null>(null);

  const [marcajeAbierto, setMarcajeAbierto] = useState<MarcajeDetalle | Marcaje | null>(null);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null);

  useEffect(() => {
    getUsuariosConMarcajes()
      .then(setUsuarios)
      .catch(() => setUsuarios([]));
    getZonasMarcaje()
      .then(setZonas)
      .catch(() => setZonas([]));
  }, []);

  const cargarPagina = async (filtros: FiltrosMarcajes, paginaDestino: number, esBusquedaNueva = false) => {
    setBuscando(true);
    setError(null);
    setErrorExportar(null);

    try {
      const resultado = await buscarMarcajes(filtros, paginaDestino, TAMANO_PAGINA, esBusquedaNueva);
      if (resultado.resumen) setResumen(resultado.resumen);
      setMarcajes(resultado.marcajes);
      setTotal(resultado.total);
      setPagina(resultado.pagina);
      setTotalPaginas(resultado.total_paginas);
      setTamano(resultado.tamano);
      setFiltrosAplicados(filtros);
      setHasSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al buscar los marcajes");
    } finally {
      setBuscando(false);
    }
  };

  const handleBuscar = () =>
    cargarPagina(
      {
        id_usuario: idUsuario || undefined,
        fecha_desde: fechaDesde || undefined,
        fecha_hasta: fechaHasta || undefined,
        tipo: (tipo as TipoMarcaje) || undefined,
        estado: (estado as "valido" | "invalido") || undefined,
        id_zona: idZona || undefined,
      },
      1,
      true
    );

  const handleCambiarPagina = (paginaDestino: number) => cargarPagina(filtrosAplicados, paginaDestino);

  const handleLimpiar = () => {
    setIdUsuario("");
    setFechaDesde("");
    setFechaHasta("");
    setTipo("");
    setEstado("");
    setIdZona("");
    setMarcajes([]);
    setTotal(0);
    setResumen(null);
    setPagina(1);
    setTotalPaginas(1);
    setHasSearched(false);
    setError(null);
    setErrorExportar(null);
  };

  const handleExportar = async () => {
    setExportando(true);
    setErrorExportar(null);

    try {
      await exportarMarcajes(filtrosAplicados);
    } catch (err) {
      setErrorExportar(err instanceof Error ? err.message : "Error al exportar los marcajes");
    } finally {
      setExportando(false);
    }
  };

  const handleAbrirMarcaje = async (marcaje: Marcaje) => {
    setMarcajeAbierto(marcaje);
    setErrorDetalle(null);
    setCargandoDetalle(true);

    try {
      setMarcajeAbierto(await getMarcaje(marcaje.id_marcaje));
    } catch (err) {
      setErrorDetalle(err instanceof Error ? err.message : "Error al obtener el marcaje");
    } finally {
      setCargandoDetalle(false);
    }
  };

  const fechasInvertidas = fechaDesde !== "" && fechaHasta !== "" && fechaDesde > fechaHasta;
  const claseSelect =
    "w-full h-9 px-3 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-[#2183AE] focus:border-transparent";

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">Reporte de Marcaje</h2>
            <p className="text-sm text-white/90 mt-0.5">
              Consulta las entradas y salidas, su validez y si se hicieron dentro de la zona asignada
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Usuario</label>
            <select value={idUsuario} onChange={(e) => setIdUsuario(e.target.value)} className={claseSelect}>
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
            <label className="block text-xs text-gray-500 mb-1">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={claseSelect}>
              <option value="">Entradas y salidas</option>
              <option value="ENTRADA">Entradas</option>
              <option value="SALIDA">Salidas</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Estado</label>
            <select value={estado} onChange={(e) => setEstado(e.target.value)} className={claseSelect}>
              <option value="">Válidos e inválidos</option>
              <option value="valido">Solo válidos</option>
              <option value="invalido">Solo inválidos</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Zona</label>
            <select value={idZona} onChange={(e) => setIdZona(e.target.value)} className={claseSelect}>
              <option value="">Todas las zonas</option>
              {zonas.map((z) => (
                <option key={z.id_zona} value={z.id_zona}>
                  {z.nombre}
                  {z.activo ? "" : " (inactiva)"} · {z.usuarios_activos} asignado{z.usuarios_activos !== 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-[11px] text-gray-400 mt-2">
          Para un solo día, usa la misma fecha en &quot;desde&quot; y &quot;hasta&quot;. El filtro de zona muestra los
          marcajes de las personas que han estado asignadas a ella.
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

          <div className="sm:ml-auto">
            <Button onClick={handleExportar} disabled={exportando || marcajes.length === 0} size="sm" variant="outline">
              {exportando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <FileSpreadsheet size={14} className="mr-1.5" />}
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
          <Clock size={24} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">Define los filtros y presiona Buscar para ver los marcajes.</p>
        </div>
      )}

      {hasSearched && marcajes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <Clock size={24} className="text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No se encontraron marcajes con esos filtros.</p>
        </div>
      )}

      {marcajes.length > 0 && (
        <>
          {resumen && <Resumen resumen={resumen} />}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-gray-100 text-xs text-gray-500">
              {`${total} marcaje${total !== 1 ? "s" : ""}`}
              {total > tamano &&
                ` · mostrando ${(pagina - 1) * tamano + 1}–${(pagina - 1) * tamano + marcajes.length}`}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 bg-gray-50">
                    <th className="px-4 py-2 font-medium whitespace-nowrap">Fecha y hora</th>
                    <th className="px-4 py-2 font-medium">Usuario</th>
                    <th className="px-4 py-2 font-medium">Tipo</th>
                    <th className="px-4 py-2 font-medium">Zona</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {marcajes.map((m) => (
                    <tr key={m.id_marcaje} className="hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                        {formatearFechaHora(m.fecha_hora)}
                        {m.is_offline && (
                          <WifiOff size={12} className="inline ml-1.5 text-amber-500" aria-label="Registrado sin conexión" />
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="text-gray-800">{m.usuario_nombre}</p>
                        {m.codigo_user && <p className="text-xs text-gray-400">{m.codigo_user}</p>}
                      </td>
                      <td className="px-4 py-2.5">
                        <BadgeTipo tipo={m.tipo} />
                      </td>
                      <td className="px-4 py-2.5">
                        <BadgeZona estado={m.zona_estado} zona={m.zona_nombre} distancia={m.zona_distancia_m} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button onClick={() => handleAbrirMarcaje(m)} size="sm" variant="outline">
                          Ver
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPaginas > 1 && (
              <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between gap-2">
                <Button
                  onClick={() => handleCambiarPagina(pagina - 1)}
                  disabled={buscando || pagina <= 1}
                  size="sm"
                  variant="outline"
                >
                  <ChevronLeft size={14} className="mr-1" />
                  Anterior
                </Button>
                <span className="text-xs text-gray-500">
                  Página {pagina} de {totalPaginas}
                </span>
                <Button
                  onClick={() => handleCambiarPagina(pagina + 1)}
                  disabled={buscando || pagina >= totalPaginas}
                  size="sm"
                  variant="outline"
                >
                  Siguiente
                  <ChevronRight size={14} className="ml-1" />
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {marcajeAbierto && (
        <MarcajeDetalleModal
          marcaje={marcajeAbierto}
          cargando={cargandoDetalle}
          error={errorDetalle}
          onClose={() => setMarcajeAbierto(null)}
        />
      )}
    </div>
  );
}
