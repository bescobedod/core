"use client";

import { useEffect, useMemo, useState } from "react";
import { Warehouse, Plus, Trash2, Loader2, AlertCircle, User, Truck } from "lucide-react";
import { Button } from "../ui/button";
import { SelectBuscable } from "../ui/select-buscable";
import { getPilotos } from "../api/TrasporteApi";
import { getAllCamiones } from "../api/CamionApi";
import {
  getAsignacionesSede,
  asignarPilotoSede,
  quitarPilotoSede,
  asignarCamionSede,
  quitarCamionSede,
  PilotoSede,
  CamionSede,
} from "../api/SedeTransporteApi";
import { PilotoUsuario } from "../types/TransporteModel";
import { CamionModel } from "../types/CamionModel";
import { nombrePilotoTransporte } from "./transporteOpciones";

// Sedes de Pollo — misma lista fija que Usuarios de Muelle.
const SEDES = [
  { whs_code: "RAS-002", nombre: "Central" },
  { whs_code: "RAS-003", nombre: "Zacapa" },
  { whs_code: "RAS-004", nombre: "Xela" },
];

// Mantenimiento de a qué sede pertenece cada piloto y cada camión. En
// Pedidos de Pollo, los dropdowns de transporte muestran primero los de la
// sede que se despacha y aparte los que no tienen sede.
export function SedeTransporteView() {
  const [sedeSeleccionada, setSedeSeleccionada] = useState(SEDES[0].whs_code);

  const [todosPilotos, setTodosPilotos] = useState<PilotoUsuario[]>([]);
  const [todosCamiones, setTodosCamiones] = useState<CamionModel[]>([]);

  const [pilotosSede, setPilotosSede] = useState<PilotoSede[]>([]);
  const [camionesSede, setCamionesSede] = useState<CamionSede[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pilotoParaAgregar, setPilotoParaAgregar] = useState("");
  const [camionParaAgregar, setCamionParaAgregar] = useState("");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    getPilotos().then(setTodosPilotos).catch(() => setTodosPilotos([]));
    getAllCamiones().then(setTodosCamiones).catch(() => setTodosCamiones([]));
  }, []);

  const cargarSede = (whsCode: string) => {
    setCargando(true);
    setError(null);

    getAsignacionesSede(whsCode)
      .then((data) => {
        setPilotosSede(data.pilotos);
        setCamionesSede(data.camiones);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Error al obtener la sede"))
      .finally(() => setCargando(false));
  };

  useEffect(() => {
    cargarSede(sedeSeleccionada);
    setPilotoParaAgregar("");
    setCamionParaAgregar("");
  }, [sedeSeleccionada]);

  const opcionesPilotos = useMemo(() => {
    const yaEnSede = new Set(pilotosSede.map((p) => String(p.piloto_id)));
    return [{
      opciones: todosPilotos
        .filter((p) => !yaEnSede.has(String(p.id_users)))
        .map((p) => ({ value: String(p.id_users), label: `${nombrePilotoTransporte(p) || p.codigo_user} (${p.codigo_user})` }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }];
  }, [todosPilotos, pilotosSede]);

  const opcionesCamiones = useMemo(() => {
    const yaEnSede = new Set(camionesSede.map((c) => c.id_camion));
    return [{
      opciones: todosCamiones
        .filter((c) => !yaEnSede.has(c.id_camion))
        .map((c) => ({ value: c.id_camion, label: c.placa, detalle: [c.marca, c.linea].filter(Boolean).join(" ") || undefined }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    }];
  }, [todosCamiones, camionesSede]);

  const ejecutar = async (accion: () => Promise<void>, despues: () => void) => {
    setGuardando(true);
    setError(null);

    try {
      await accion();
      despues();
      cargarSede(sedeSeleccionada);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el cambio");
    } finally {
      setGuardando(false);
    }
  };

  const sede = SEDES.find((s) => s.whs_code === sedeSeleccionada);

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <Warehouse className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">Pilotos y Camiones por Sede</h2>
            <p className="text-sm text-white/90 mt-0.5">
              Define qué pilotos y qué camiones trabajan en cada sede. Un piloto o camión puede estar en varias sedes.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-fit">
          <h3 className="text-sm font-medium text-gray-800 mb-3">Sedes</h3>
          <div className="space-y-1.5">
            {SEDES.map((s) => (
              <button
                key={s.whs_code}
                onClick={() => setSedeSeleccionada(s.whs_code)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  sedeSeleccionada === s.whs_code ? "border-[#2183AE] bg-[#2183AE]/5" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <p className="text-sm text-gray-800">{s.nombre}</p>
                <p className="text-xs text-gray-400">{s.whs_code}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={13} className="shrink-0" /> {error}
            </p>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Pilotos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                <User size={15} className="text-gray-400" /> Pilotos de {sede?.nombre}
              </h3>
              <div className="flex gap-2 mt-3">
                <div className="flex-1 min-w-0">
                  <SelectBuscable
                    grupos={opcionesPilotos}
                    value={pilotoParaAgregar}
                    onChange={setPilotoParaAgregar}
                    placeholder="Seleccionar piloto…"
                    placeholderBusqueda="Buscar por nombre o código…"
                    mensajeVacio="No hay pilotos con ese nombre"
                  />
                </div>
                <Button
                  size="sm"
                  variant="submit"
                  disabled={guardando || !pilotoParaAgregar}
                  onClick={() => ejecutar(
                    () => asignarPilotoSede(sedeSeleccionada, Number(pilotoParaAgregar)),
                    () => setPilotoParaAgregar("")
                  )}
                >
                  <Plus size={14} className="mr-1" /> Agregar
                </Button>
              </div>

              {cargando ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-8">
                  <Loader2 size={16} className="animate-spin" /> Cargando…
                </div>
              ) : pilotosSede.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Ningún piloto asignado a esta sede.</p>
              ) : (
                <div className="divide-y divide-gray-100 mt-3">
                  {pilotosSede.map((p) => (
                    <div key={p.piloto_id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">{p.nombre}</p>
                        {p.codigo_user && <p className="text-xs text-gray-400">{p.codigo_user}</p>}
                      </div>
                      <button
                        onClick={() => ejecutar(() => quitarPilotoSede(sedeSeleccionada, p.piloto_id), () => {})}
                        disabled={guardando}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                        title="Quitar de la sede"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Camiones */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                <Truck size={15} className="text-gray-400" /> Camiones de {sede?.nombre}
              </h3>
              <div className="flex gap-2 mt-3">
                <div className="flex-1 min-w-0">
                  <SelectBuscable
                    grupos={opcionesCamiones}
                    value={camionParaAgregar}
                    onChange={setCamionParaAgregar}
                    placeholder="Seleccionar camión…"
                    placeholderBusqueda="Buscar placa…"
                    mensajeVacio="No hay camiones con esa placa"
                  />
                </div>
                <Button
                  size="sm"
                  variant="submit"
                  disabled={guardando || !camionParaAgregar}
                  onClick={() => ejecutar(
                    () => asignarCamionSede(sedeSeleccionada, camionParaAgregar),
                    () => setCamionParaAgregar("")
                  )}
                >
                  <Plus size={14} className="mr-1" /> Agregar
                </Button>
              </div>

              {cargando ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-8">
                  <Loader2 size={16} className="animate-spin" /> Cargando…
                </div>
              ) : camionesSede.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Ningún camión asignado a esta sede.</p>
              ) : (
                <div className="divide-y divide-gray-100 mt-3">
                  {camionesSede.map((c) => (
                    <div key={c.id_camion} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="text-sm text-gray-800 truncate">{c.placa}</p>
                        {(c.descripcion || c.estado) && (
                          <p className="text-xs text-gray-400 truncate">{[c.descripcion, c.estado].filter(Boolean).join(" · ")}</p>
                        )}
                      </div>
                      <button
                        onClick={() => ejecutar(() => quitarCamionSede(sedeSeleccionada, c.id_camion), () => {})}
                        disabled={guardando}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                        title="Quitar de la sede"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
