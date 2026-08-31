"use client";

import { useEffect, useState } from "react";
import { Mail, Plus, Trash2, Loader2, AlertCircle, FolderPlus } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  getContextos,
  crearContexto,
  getDestinatarios,
  crearDestinatario,
  actualizarDestinatario,
  eliminarDestinatario,
} from "../api/NotificacionDestinatarioApi";
import { NotificacionContexto, NotificacionDestinatario } from "../types/NotificacionDestinatarioModel";

export function NotificacionDestinatariosView() {
  const [contextos, setContextos] = useState<NotificacionContexto[]>([]);
  const [cargandoContextos, setCargandoContextos] = useState(true);
  const [errorContextos, setErrorContextos] = useState<string | null>(null);
  const [contextoSeleccionado, setContextoSeleccionado] = useState<string>("");

  const [mostrarFormContexto, setMostrarFormContexto] = useState(false);
  const [codigoNuevoContexto, setCodigoNuevoContexto] = useState("");
  const [nombreNuevoContexto, setNombreNuevoContexto] = useState("");
  const [descripcionNuevoContexto, setDescripcionNuevoContexto] = useState("");
  const [creandoContexto, setCreandoContexto] = useState(false);
  const [errorCrearContexto, setErrorCrearContexto] = useState<string | null>(null);

  const [destinatarios, setDestinatarios] = useState<NotificacionDestinatario[]>([]);
  const [cargandoDestinatarios, setCargandoDestinatarios] = useState(false);
  const [errorDestinatarios, setErrorDestinatarios] = useState<string | null>(null);

  const [nombreNuevo, setNombreNuevo] = useState("");
  const [emailNuevo, setEmailNuevo] = useState("");
  const [agregando, setAgregando] = useState(false);
  const [errorAgregar, setErrorAgregar] = useState<string | null>(null);

  const cargarContextos = (seleccionarCodigo?: string) => {
    setCargandoContextos(true);
    setErrorContextos(null);

    getContextos()
      .then((data) => {
        setContextos(data);
        const codigoAUsar = seleccionarCodigo || (data.length > 0 ? data[0].codigo : "");
        setContextoSeleccionado(codigoAUsar);
      })
      .catch((err) => setErrorContextos(err instanceof Error ? err.message : "Error al obtener los contextos"))
      .finally(() => setCargandoContextos(false));
  };

  useEffect(() => {
    cargarContextos();
  }, []);

  const cargarDestinatarios = (contexto: string) => {
    if (!contexto) {
      setDestinatarios([]);
      return;
    }

    setCargandoDestinatarios(true);
    setErrorDestinatarios(null);

    getDestinatarios(contexto)
      .then(setDestinatarios)
      .catch((err) => setErrorDestinatarios(err instanceof Error ? err.message : "Error al obtener los destinatarios"))
      .finally(() => setCargandoDestinatarios(false));
  };

  useEffect(() => {
    cargarDestinatarios(contextoSeleccionado);
  }, [contextoSeleccionado]);

  const handleCrearContexto = async () => {
    if (!codigoNuevoContexto.trim() || !nombreNuevoContexto.trim()) return;

    setCreandoContexto(true);
    setErrorCrearContexto(null);

    try {
      const nuevo = await crearContexto(
        codigoNuevoContexto.trim(),
        nombreNuevoContexto.trim(),
        descripcionNuevoContexto.trim() || undefined
      );
      setCodigoNuevoContexto("");
      setNombreNuevoContexto("");
      setDescripcionNuevoContexto("");
      setMostrarFormContexto(false);
      cargarContextos(nuevo.codigo);
    } catch (err) {
      setErrorCrearContexto(err instanceof Error ? err.message : "Error al crear el contexto");
    } finally {
      setCreandoContexto(false);
    }
  };

  const handleAgregarDestinatario = async () => {
    if (!emailNuevo.trim() || !contextoSeleccionado) return;

    setAgregando(true);
    setErrorAgregar(null);

    try {
      await crearDestinatario(contextoSeleccionado, emailNuevo.trim(), nombreNuevo.trim() || undefined);
      setEmailNuevo("");
      setNombreNuevo("");
      cargarDestinatarios(contextoSeleccionado);
    } catch (err) {
      setErrorAgregar(err instanceof Error ? err.message : "Error al agregar el destinatario");
    } finally {
      setAgregando(false);
    }
  };

  const handleToggleActivo = async (destinatario: NotificacionDestinatario) => {
    const nuevoActivo = !destinatario.activo;

    setDestinatarios((prev) =>
      prev.map((d) => (d.id === destinatario.id ? { ...d, activo: nuevoActivo } : d))
    );

    try {
      await actualizarDestinatario(destinatario.id, { activo: nuevoActivo });
    } catch (err) {
      setDestinatarios((prev) =>
        prev.map((d) => (d.id === destinatario.id ? { ...d, activo: destinatario.activo } : d))
      );
      setErrorDestinatarios(err instanceof Error ? err.message : "Error al actualizar el destinatario");
    }
  };

  const handleEliminar = async (id: number) => {
    try {
      await eliminarDestinatario(id);
      setDestinatarios((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      setErrorDestinatarios(err instanceof Error ? err.message : "Error al eliminar el destinatario");
    }
  };

  const contextoActual = contextos.find((c) => c.codigo === contextoSeleccionado) || null;

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <Mail className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">Destinatarios de Notificación</h2>
            <p className="text-sm text-white/90 mt-0.5">
              Correos que reciben aviso por cada contexto de notificación del sistema
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Columna izquierda: contextos */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-800">Contextos</h3>
            <Button size="sm" variant="submit" onClick={() => setMostrarFormContexto((v) => !v)}>
              <FolderPlus size={14} className="mr-1" /> Nuevo
            </Button>
          </div>

          {mostrarFormContexto && (
            <div className="mb-3 p-3 border border-gray-200 rounded-lg space-y-2 bg-gray-50">
              <Input
                placeholder="Código (ej. ENTREGA_PRODUCTO)"
                value={codigoNuevoContexto}
                onChange={(e) => setCodigoNuevoContexto(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Nombre para mostrar"
                value={nombreNuevoContexto}
                onChange={(e) => setNombreNuevoContexto(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                placeholder="Descripción (opcional)"
                value={descripcionNuevoContexto}
                onChange={(e) => setDescripcionNuevoContexto(e.target.value)}
                className="h-8 text-xs"
              />
              {errorCrearContexto && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} /> {errorCrearContexto}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="submit"
                  onClick={handleCrearContexto}
                  disabled={creandoContexto || !codigoNuevoContexto.trim() || !nombreNuevoContexto.trim()}
                >
                  {creandoContexto ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                  Crear
                </Button>
                <Button size="sm" variant="cancel" onClick={() => setMostrarFormContexto(false)}>Cancelar</Button>
              </div>
            </div>
          )}

          {errorContextos && (
            <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertCircle size={12} /> {errorContextos}</p>
          )}

          {cargandoContextos ? (
            <div className="flex justify-center py-6"><Loader2 size={20} className="animate-spin text-[#2183AE]" /></div>
          ) : contextos.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No hay contextos todavía. Crea el primero.</p>
          ) : (
            <div className="space-y-1.5">
              {contextos.map((c) => (
                <button
                  key={c.codigo}
                  onClick={() => setContextoSeleccionado(c.codigo)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    contextoSeleccionado === c.codigo
                      ? "border-[#2183AE] bg-[#2183AE]/5"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <p className="text-sm text-gray-800">{c.nombre}</p>
                  <p className="text-xs text-gray-400">{c.codigo}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Columna derecha: destinatarios del contexto seleccionado */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {!contextoActual ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Mail size={28} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Selecciona o crea un contexto para configurar sus destinatarios.</p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-medium text-gray-800">{contextoActual.nombre}</h3>
              {contextoActual.descripcion && (
                <p className="text-xs text-gray-400 mb-3">{contextoActual.descripcion}</p>
              )}

              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <Input
                  placeholder="Correo"
                  type="email"
                  value={emailNuevo}
                  onChange={(e) => setEmailNuevo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAgregarDestinatario()}
                  className="sm:flex-1"
                />
                <Input
                  placeholder="Nombre (opcional)"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAgregarDestinatario()}
                  className="sm:flex-1"
                />
                <Button variant="submit" onClick={handleAgregarDestinatario} disabled={agregando || !emailNuevo.trim()}>
                  {agregando ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Plus size={14} className="mr-1.5" />}
                  Agregar
                </Button>
              </div>

              {errorAgregar && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
                  <AlertCircle size={13} className="shrink-0" /> {errorAgregar}
                </p>
              )}

              <div className="mt-4">
                {errorDestinatarios && (
                  <p className="text-xs text-red-600 mb-3 flex items-center gap-1.5">
                    <AlertCircle size={13} className="shrink-0" /> {errorDestinatarios}
                  </p>
                )}

                {cargandoDestinatarios ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-10">
                    <Loader2 size={18} className="animate-spin" /> Cargando destinatarios…
                  </div>
                ) : destinatarios.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">Todavía no hay destinatarios para este contexto.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {destinatarios.map((d) => (
                      <div key={d.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="text-sm text-gray-800 truncate">{d.nombre || d.email}</p>
                          {d.nombre && <p className="text-xs text-gray-400 truncate">{d.email}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleActivo(d)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${
                              d.activo
                                ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                                : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                            }`}
                          >
                            {d.activo ? "Activo" : "Inactivo"}
                          </button>
                          <button
                            onClick={() => handleEliminar(d.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
