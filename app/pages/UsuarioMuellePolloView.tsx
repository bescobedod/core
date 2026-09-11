"use client";

import { useEffect, useState } from "react";
import { Anchor, Search, Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { getUsuariosPorMuelle, buscarUsuarios, asignarMuelle, quitarMuelle } from "../api/UsuarioMuellePolloApi";
import { UsuarioMuelle } from "../types/UsuarioMuellePolloModel";

// Muelles de Pollo — misma lista fija que usa RoutesPolloView.
const MUELLES = [
  { whs_code: "RAS-002", nombre: "Central" },
  { whs_code: "RAS-003", nombre: "Zacapa" },
  { whs_code: "RAS-004", nombre: "Xela" },
];

export function UsuarioMuellePolloView() {
  const [muelleSeleccionado, setMuelleSeleccionado] = useState(MUELLES[0].whs_code);

  const [usuariosDelMuelle, setUsuariosDelMuelle] = useState<UsuarioMuelle[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);
  const [errorUsuarios, setErrorUsuarios] = useState<string | null>(null);

  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<UsuarioMuelle[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null);
  const [asignando, setAsignando] = useState(false);

  const cargarUsuariosDelMuelle = (whsCode: string) => {
    setCargandoUsuarios(true);
    setErrorUsuarios(null);

    getUsuariosPorMuelle(whsCode)
      .then(setUsuariosDelMuelle)
      .catch((err) => setErrorUsuarios(err instanceof Error ? err.message : "Error al obtener los usuarios del muelle"))
      .finally(() => setCargandoUsuarios(false));
  };

  useEffect(() => {
    cargarUsuariosDelMuelle(muelleSeleccionado);
    setBusqueda("");
    setResultados([]);
  }, [muelleSeleccionado]);

  const handleBuscar = async () => {
    if (busqueda.trim().length < 2) return;

    setBuscando(true);
    setErrorBusqueda(null);

    try {
      const data = await buscarUsuarios(busqueda.trim());
      setResultados(data);
    } catch (err) {
      setErrorBusqueda(err instanceof Error ? err.message : "Error al buscar usuarios");
    } finally {
      setBuscando(false);
    }
  };

  const handleAsignar = async (usuario: UsuarioMuelle) => {
    setAsignando(true);
    setErrorBusqueda(null);

    try {
      const muelle = MUELLES.find((m) => m.whs_code === muelleSeleccionado);
      await asignarMuelle(usuario.id_usuario, muelleSeleccionado, muelle?.nombre);
      setResultados([]);
      setBusqueda("");
      cargarUsuariosDelMuelle(muelleSeleccionado);
    } catch (err) {
      setErrorBusqueda(err instanceof Error ? err.message : "Error al asignar el muelle");
    } finally {
      setAsignando(false);
    }
  };

  const handleQuitar = async (idUsuario: number) => {
    try {
      await quitarMuelle(idUsuario);
      setUsuariosDelMuelle((prev) => prev.filter((u) => u.id_usuario !== idUsuario));
    } catch (err) {
      setErrorUsuarios(err instanceof Error ? err.message : "Error al quitar el usuario del muelle");
    }
  };

  const idsYaAsignados = new Set(usuariosDelMuelle.map((u) => u.id_usuario));

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <Anchor className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">Usuarios de Muelle (Pollo)</h2>
            <p className="text-sm text-white/90 mt-0.5">
              Selecciona un muelle y asígnale los usuarios (rol 5) que lo operan
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Columna izquierda: muelles */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-800 mb-3">Muelles</h3>
          <div className="space-y-1.5">
            {MUELLES.map((m) => (
              <button
                key={m.whs_code}
                onClick={() => setMuelleSeleccionado(m.whs_code)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                  muelleSeleccionado === m.whs_code
                    ? "border-[#2183AE] bg-[#2183AE]/5"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <p className="text-sm text-gray-800">{m.nombre}</p>
                <p className="text-xs text-gray-400">{m.whs_code}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Columna derecha: usuarios del muelle seleccionado */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-medium text-gray-800">
            {MUELLES.find((m) => m.whs_code === muelleSeleccionado)?.nombre}
          </h3>
          <p className="text-xs text-gray-400 mb-3">{muelleSeleccionado}</p>

          <div className="flex gap-2">
            <Input
              placeholder="Buscar usuario (rol 5) por nombre o código de empleado…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBuscar()}
              className="flex-1"
            />
            <Button onClick={handleBuscar} disabled={buscando || busqueda.trim().length < 2}>
              {buscando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Search size={14} className="mr-1.5" />}
              Buscar
            </Button>
          </div>

          {errorBusqueda && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
              <AlertCircle size={13} className="shrink-0" /> {errorBusqueda}
            </p>
          )}

          {resultados.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg divide-y divide-gray-50 max-h-52 overflow-y-auto bg-gray-50">
              {resultados.map((u) => {
                const yaAsignado = idsYaAsignados.has(u.id_usuario);
                return (
                  <button
                    key={u.id_usuario}
                    onClick={() => !yaAsignado && handleAsignar(u)}
                    disabled={asignando || yaAsignado}
                    className="w-full text-left px-3 py-2 flex items-center justify-between gap-2 hover:bg-white transition-colors disabled:opacity-50"
                  >
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 truncate">{u.nombre || u.codigo_user}</p>
                      <p className="text-[11px] text-gray-400">{u.codigo_user}</p>
                    </div>
                    {yaAsignado ? (
                      <span className="text-[11px] text-gray-400 shrink-0">Ya asignado aquí</span>
                    ) : (
                      <Plus size={14} className="text-[#2183AE] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-4">
            {errorUsuarios && (
              <p className="text-xs text-red-600 mb-3 flex items-center gap-1.5">
                <AlertCircle size={13} className="shrink-0" /> {errorUsuarios}
              </p>
            )}

            {cargandoUsuarios ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-10">
                <Loader2 size={18} className="animate-spin" /> Cargando usuarios…
              </div>
            ) : usuariosDelMuelle.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10">Ningún usuario asignado a este muelle todavía.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {usuariosDelMuelle.map((u) => (
                  <div key={u.id_usuario} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm text-gray-800 truncate">{u.nombre || u.codigo_user}</p>
                      <p className="text-xs text-gray-400 truncate">{u.codigo_user}{u.email_office ? ` · ${u.email_office}` : ""}</p>
                    </div>
                    <button
                      onClick={() => handleQuitar(u.id_usuario)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                      title="Quitar del muelle"
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
  );
}
