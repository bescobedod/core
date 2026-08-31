import { useState, useEffect } from "react";
import { Anchor, Plus, Store, Search, X, Loader2, AlertCircle, MapPin, Trash2, Pencil, Check } from "lucide-react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { getRutasPollo, crearRutaPollo, actualizarRutaPollo, buscarTiendasPdv, getTiendasDeRuta, asignarTiendaRuta, quitarTiendaDeRuta } from "../api/RutaPolloApi";
import { RutaPollo, TiendaPdvBusqueda, TiendaRutaPollo } from "../types/RutaPolloModel";

interface Muelle {
  whs_code: string;
  nombre: string;
}

const MUELLES: Muelle[] = [
  { whs_code: "RAS-002", nombre: "Central" },
  { whs_code: "RAS-003", nombre: "Zacapa" },
  { whs_code: "RAS-004", nombre: "Xela" },
];

export function RoutesPolloView() {
  const [muelle, setMuelle] = useState<string>(MUELLES[0].whs_code);
  const [rutas, setRutas] = useState<RutaPollo[]>([]);
  const [loadingRutas, setLoadingRutas] = useState(false);
  const [errorRutas, setErrorRutas] = useState<string | null>(null);

  const [rutaSeleccionada, setRutaSeleccionada] = useState<RutaPollo | null>(null);
  const [tiendasDeRuta, setTiendasDeRuta] = useState<TiendaRutaPollo[]>([]);
  const [loadingTiendas, setLoadingTiendas] = useState(false);

  const [mostrarFormRuta, setMostrarFormRuta] = useState(false);
  const [nombreNuevaRuta, setNombreNuevaRuta] = useState("");
  const [whsDestinoNuevaRuta, setWhsDestinoNuevaRuta] = useState("");
  const [creandoRuta, setCreandoRuta] = useState(false);

  // Edición de una ruta existente
  const [editandoRutaId, setEditandoRutaId] = useState<string | null>(null);
  const [editNombreRuta, setEditNombreRuta] = useState("");
  const [editWhsDestino, setEditWhsDestino] = useState("");
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<TiendaPdvBusqueda[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [errorAccion, setErrorAccion] = useState<string | null>(null);

  const cargarRutas = async (whsCodeOrigen: string) => {
    setLoadingRutas(true);
    setErrorRutas(null);
    setRutaSeleccionada(null);
    setTiendasDeRuta([]);

    try {
      const data = await getRutasPollo(whsCodeOrigen);
      setRutas(data);
    } catch (err) {
      setErrorRutas(err instanceof Error ? err.message : "Error al obtener las rutas");
    } finally {
      setLoadingRutas(false);
    }
  };

  useEffect(() => {
    cargarRutas(muelle);
  }, [muelle]);

  const seleccionarRuta = async (ruta: RutaPollo) => {
    setRutaSeleccionada(ruta);
    setLoadingTiendas(true);
    setErrorAccion(null);
    setBusqueda("");
    setResultadosBusqueda([]);

    try {
      const data = await getTiendasDeRuta(ruta.id);
      setTiendasDeRuta(data);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : "Error al obtener las tiendas de la ruta");
    } finally {
      setLoadingTiendas(false);
    }
  };

  const handleCrearRuta = async () => {
    if (!nombreNuevaRuta.trim() || !whsDestinoNuevaRuta.trim()) return;

    setCreandoRuta(true);
    setErrorRutas(null);

    try {
      await crearRutaPollo({
        nombre_ruta: nombreNuevaRuta.trim(),
        whs_code_origen: muelle,
        whs_code_destino: whsDestinoNuevaRuta.trim(),
      });

      setNombreNuevaRuta("");
      setWhsDestinoNuevaRuta("");
      setMostrarFormRuta(false);
      await cargarRutas(muelle);
    } catch (err) {
      setErrorRutas(err instanceof Error ? err.message : "Error al crear la ruta");
    } finally {
      setCreandoRuta(false);
    }
  };

  const handleAbrirEdicion = (e: React.MouseEvent, ruta: RutaPollo) => {
    e.stopPropagation();
    setEditandoRutaId(ruta.id);
    setEditNombreRuta(ruta.nombre_ruta);
    setEditWhsDestino(ruta.whs_code_destino);
    setErrorEdicion(null);
  };

  const handleCancelarEdicion = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditandoRutaId(null);
  };

  const handleGuardarEdicion = async (e: React.MouseEvent, rutaId: string) => {
    e.stopPropagation();
    if (!editNombreRuta.trim() || !editWhsDestino.trim()) return;

    setGuardandoEdicion(true);
    setErrorEdicion(null);

    try {
      await actualizarRutaPollo(rutaId, editNombreRuta.trim(), editWhsDestino.trim());
      setEditandoRutaId(null);
      await cargarRutas(muelle);

      if (rutaSeleccionada?.id === rutaId) {
        setRutaSeleccionada(prev => prev ? { ...prev, nombre_ruta: editNombreRuta.trim(), whs_code_destino: editWhsDestino.trim() } : prev);
      }
    } catch (err) {
      setErrorEdicion(err instanceof Error ? err.message : "Error al actualizar la ruta");
    } finally {
      setGuardandoEdicion(false);
    }
  };

  const handleBuscar = async () => {
    if (busqueda.trim().length < 2) return;

    setBuscando(true);
    setErrorAccion(null);

    try {
      const data = await buscarTiendasPdv(busqueda.trim());
      setResultadosBusqueda(data);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : "Error al buscar tiendas");
    } finally {
      setBuscando(false);
    }
  };

  const handleAsignar = async (tienda: TiendaPdvBusqueda) => {
    if (!rutaSeleccionada) return;

    setErrorAccion(null);

    try {
      await asignarTiendaRuta({
        ruta_id: rutaSeleccionada.id,
        id_tienda_simphony: tienda.id_tienda_simphony,
        id_tienda_pdv: tienda.id_tienda_pdv,
        codigo_tienda: tienda.codigo_tienda,
        nombre_tienda: tienda.nombre_tienda,
        codigo_empresa: tienda.codigo_empresa,
        whs_code: tienda.whs_code,
      });

      await seleccionarRuta(rutaSeleccionada);
      await cargarRutas(muelle);
      setResultadosBusqueda(prev => prev.filter(t => t.id_tienda_simphony !== tienda.id_tienda_simphony));
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : "Error al asignar la tienda");
    }
  };

  const handleQuitar = async (idTiendaSimphony: string) => {
    if (!rutaSeleccionada) return;

    setErrorAccion(null);

    try {
      await quitarTiendaDeRuta(idTiendaSimphony);
      await seleccionarRuta(rutaSeleccionada);
      await cargarRutas(muelle);
    } catch (err) {
      setErrorAccion(err instanceof Error ? err.message : "Error al quitar la tienda");
    }
  };

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <Anchor className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">Maestro de Rutas — Pollo</h2>
            <p className="text-sm text-white/90 mt-0.5">Define las rutas por muelle y asigna las tiendas de cada una</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <Label className="text-xs text-gray-700 mb-1.5 block">Muelle</Label>
        <div className="flex gap-2">
          {MUELLES.map(m => (
            <Button
              key={m.whs_code}
              onClick={() => setMuelle(m.whs_code)}
              variant="submit"
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                muelle === m.whs_code
                  ? "bg-[#2183AE] text-white border-[#2183AE]"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {m.nombre} <span className="text-xs opacity-70">({m.whs_code})</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-800">Rutas</h3>
            <Button size="sm" variant="submit" onClick={() => setMostrarFormRuta(v => !v)}>
              <Plus size={14} className="mr-1" /> Nueva
            </Button>
          </div>

          {mostrarFormRuta && (
            <div className="mb-3 p-3 border border-gray-200 rounded-lg space-y-2 bg-gray-50">
              <Input
                placeholder="Nombre de la ruta"
                value={nombreNuevaRuta}
                onChange={e => setNombreNuevaRuta(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Bodega destino (bodega móvil SAP)"
                value={whsDestinoNuevaRuta}
                onChange={e => setWhsDestinoNuevaRuta(e.target.value)}
                className="h-8 text-xs"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleCrearRuta}
                  disabled={creandoRuta || !nombreNuevaRuta.trim() || !whsDestinoNuevaRuta.trim()}
                  variant="submit"
                >
                  {creandoRuta ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                  Crear
                </Button>
                <Button size="sm" variant="cancel" onClick={() => setMostrarFormRuta(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {errorRutas && (
            <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertCircle size={12} /> {errorRutas}</p>
          )}

          {loadingRutas ? (
            <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-[#2183AE]" /></div>
          ) : rutas.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No hay rutas para este muelle todavía.</p>
          ) : (
            <div className="space-y-1.5">
              {rutas.map(r => (
                <div
                  key={r.id}
                  onClick={() => editandoRutaId !== r.id && seleccionarRuta(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors cursor-pointer ${
                    rutaSeleccionada?.id === r.id
                      ? "border-[#2183AE] bg-[#2183AE]/5"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  {editandoRutaId === r.id ? (
                    <div className="space-y-2" onClick={e => e.stopPropagation()}>
                      <Input
                        value={editNombreRuta}
                        onChange={e => setEditNombreRuta(e.target.value)}
                        placeholder="Nombre de la ruta"
                        className="h-8 text-xs"
                      />
                      <Input
                        value={editWhsDestino}
                        onChange={e => setEditWhsDestino(e.target.value)}
                        placeholder="WhsCode destino"
                        className="h-8 text-xs"
                      />
                      {errorEdicion && <p className="text-xs text-red-600">{errorEdicion}</p>}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={e => handleGuardarEdicion(e, r.id)}
                          disabled={guardandoEdicion || !editNombreRuta.trim() || !editWhsDestino.trim()}
                          variant="submit"
                        >
                          {guardandoEdicion ? <Loader2 size={12} className="animate-spin mr-1" /> : <Check size={12} className="mr-1" />}
                          Guardar
                        </Button>
                        <Button size="sm" variant="cancel" onClick={handleCancelarEdicion}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800">{r.nombre_ruta}</p>
                        <p className="text-xs text-gray-400">Destino: {r.whs_code_destino} · {r.total_tiendas} tienda{r.total_tiendas !== 1 ? "s" : ""}</p>
                      </div>
                      <button
                        onClick={e => handleAbrirEdicion(e, r)}
                        className="p-1.5 text-gray-400 hover:text-[#2183AE] hover:bg-[#2183AE]/10 rounded-lg transition-colors shrink-0"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha: detalle de la ruta seleccionada */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {!rutaSeleccionada ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MapPin size={28} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Selecciona una ruta para ver y asignar sus tiendas.</p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-medium text-gray-800 mb-3">{rutaSeleccionada.nombre_ruta}</h3>

              {errorAccion && (
                <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertCircle size={12} /> {errorAccion}</p>
              )}

              <div className="mb-4">
                <Label className="text-xs text-gray-700 mb-1.5 block">Buscar tienda en PDV</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Nombre, código o ID Simphony…"
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleBuscar()}
                    className="h-8 text-xs"
                  />
                  <Button size="sm" onClick={handleBuscar} disabled={buscando || busqueda.trim().length < 2}>
                    {buscando ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                  </Button>
                </div>

                {resultadosBusqueda.length > 0 && (
                  <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-50 max-h-52 overflow-y-auto">
                    {resultadosBusqueda.map(t => (
                      <div key={t.id_tienda_simphony} className="px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs text-gray-700 truncate">{t.nombre_tienda}</p>
                          <p className="text-[11px] text-gray-400">
                            {t.codigo_tienda} · Simphony {t.id_tienda_simphony} · WhsCode {t.whs_code || "—"}
                            {t.ya_asignada && <span className="text-amber-600"> · ya asignada a otra ruta</span>}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => handleAsignar(t)} className="shrink-0">
                          {t.ya_asignada ? "Reasignar" : "Asignar"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Label className="text-xs text-gray-700 mb-1.5 block">Tiendas asignadas</Label>
              {loadingTiendas ? (
                <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-[#2183AE]" /></div>
              ) : tiendasDeRuta.length === 0 ? (
                <p className="text-xs text-gray-400 py-3">Esta ruta todavía no tiene tiendas asignadas.</p>
              ) : (
                <div className="space-y-1.5">
                  {tiendasDeRuta.map(t => (
                    <div key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 border border-gray-100 rounded-lg">
                      <div className="flex items-center gap-2 min-w-0">
                        <Store size={14} className="text-gray-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-gray-700 truncate">{t.nombre_tienda}</p>
                          <p className="text-xs text-gray-400">{t.codigo_tienda} · WhsCode {t.whs_code || "—"}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleQuitar(t.id_tienda_simphony)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}