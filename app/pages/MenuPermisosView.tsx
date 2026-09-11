"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Plus, Trash2, Loader2, AlertCircle, FolderPlus, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  getAllMenusAdmin,
  crearMenu,
  actualizarVisibilidadMenu,
  getRolesDeMenu,
  asignarRolAMenu,
  quitarRolDeMenu,
} from "../api/MenuApi";
import { getAllRoles } from "../api/RolApi";
import { MenuModel, MenuRolAsignacion } from "../types/MenuModel";
import { RolModel } from "../types/RolModel";

export function MenuPermisosView() {
  const [menus, setMenus] = useState<MenuModel[]>([]);
  const [cargandoMenus, setCargandoMenus] = useState(true);
  const [errorMenus, setErrorMenus] = useState<string | null>(null);
  const [menuSeleccionado, setMenuSeleccionado] = useState<number | null>(null);
  const [mostrarFormMenu, setMostrarFormMenu] = useState(false);
  const [nombreNuevoMenu, setNombreNuevoMenu] = useState("");
  const [iconoNuevoMenu, setIconoNuevoMenu] = useState("");
  const [codigoNuevoMenu, setCodigoNuevoMenu] = useState("");
  const [descripcionNuevoMenu, setDescripcionNuevoMenu] = useState("");
  const [creandoMenu, setCreandoMenu] = useState(false);
  const [errorCrearMenu, setErrorCrearMenu] = useState<string | null>(null);
  const [rolesDelMenu, setRolesDelMenu] = useState<MenuRolAsignacion[]>([]);
  const [cargandoRoles, setCargandoRoles] = useState(false);
  const [errorRoles, setErrorRoles] = useState<string | null>(null);
  const [todosLosRoles, setTodosLosRoles] = useState<RolModel[]>([]);
  const [rolParaAgregar, setRolParaAgregar] = useState("");
  const [agregandoRol, setAgregandoRol] = useState(false);
  const [errorAgregarRol, setErrorAgregarRol] = useState<string | null>(null);

  const cargarMenus = (seleccionarId?: number) => {
    setCargandoMenus(true);
    setErrorMenus(null);

    getAllMenusAdmin()
      .then((data) => {
        setMenus(data);
        const idAUsar = seleccionarId ?? (data.length > 0 ? data[0].id_menu : null);
        setMenuSeleccionado(idAUsar);
      })
      .catch((err) => setErrorMenus(err instanceof Error ? err.message : "Error al obtener los menús"))
      .finally(() => setCargandoMenus(false));
  };

  useEffect(() => {
    cargarMenus();
    getAllRoles().then(setTodosLosRoles).catch(() => setTodosLosRoles([]));
  }, []);

  const cargarRolesDelMenu = (id_menu: number | null) => {
    if (id_menu === null) {
      setRolesDelMenu([]);
      return;
    }

    setCargandoRoles(true);
    setErrorRoles(null);

    getRolesDeMenu(id_menu)
      .then(setRolesDelMenu)
      .catch((err) => setErrorRoles(err instanceof Error ? err.message : "Error al obtener los roles del menú"))
      .finally(() => setCargandoRoles(false));
  };

  useEffect(() => {
    cargarRolesDelMenu(menuSeleccionado);
    setRolParaAgregar("");
  }, [menuSeleccionado]);

  const handleCrearMenu = async () => {
    if (!nombreNuevoMenu.trim() || !iconoNuevoMenu.trim() || !codigoNuevoMenu.trim() || !descripcionNuevoMenu.trim()) return;

    setCreandoMenu(true);
    setErrorCrearMenu(null);

    try {
      const nuevo = await crearMenu({
        nombre: nombreNuevoMenu.trim(),
        icono: iconoNuevoMenu.trim(),
        nombre_menu: codigoNuevoMenu.trim(),
        descripcion: descripcionNuevoMenu.trim(),
      });
      setNombreNuevoMenu("");
      setIconoNuevoMenu("");
      setCodigoNuevoMenu("");
      setDescripcionNuevoMenu("");
      setMostrarFormMenu(false);
      cargarMenus(nuevo.id_menu);
    } catch (err) {
      setErrorCrearMenu(err instanceof Error ? err.message : "Error al crear el menú");
    } finally {
      setCreandoMenu(false);
    }
  };

  const handleToggleVisible = async (menu: MenuModel) => {
    const nuevoVisible = !menu.visible;

    setMenus((prev) => prev.map((m) => (m.id_menu === menu.id_menu ? { ...m, visible: nuevoVisible } : m)));

    try {
      await actualizarVisibilidadMenu(menu.id_menu, nuevoVisible);
    } catch (err) {
      setMenus((prev) => prev.map((m) => (m.id_menu === menu.id_menu ? { ...m, visible: menu.visible } : m)));
      setErrorMenus(err instanceof Error ? err.message : "Error al actualizar el menú");
    }
  };

  const handleAgregarRol = async () => {
    if (!rolParaAgregar || menuSeleccionado === null) return;

    setAgregandoRol(true);
    setErrorAgregarRol(null);

    try {
      await asignarRolAMenu(menuSeleccionado, Number(rolParaAgregar));
      setRolParaAgregar("");
      cargarRolesDelMenu(menuSeleccionado);
    } catch (err) {
      setErrorAgregarRol(err instanceof Error ? err.message : "Error al asignar el rol");
    } finally {
      setAgregandoRol(false);
    }
  };

  const handleQuitarRol = async (id_menu_rol: number) => {
    try {
      await quitarRolDeMenu(id_menu_rol);
      setRolesDelMenu((prev) => prev.filter((r) => r.id_menu_rol !== id_menu_rol));
    } catch (err) {
      setErrorRoles(err instanceof Error ? err.message : "Error al quitar el rol");
    }
  };

  const menuActual = menus.find((m) => m.id_menu === menuSeleccionado) || null;
  const rolesDisponibles = todosLosRoles.filter(
    (r) => !rolesDelMenu.some((asignado) => asignado.id_rol_core === r.id_rol)
  );

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm shrink-0">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-white text-lg font-semibold leading-tight">Permisos de Menús</h2>
            <p className="text-sm text-white/90 mt-0.5">
              Crea menús, muéstralos u ocúltalos, y define qué roles pueden acceder a cada uno
            </p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-800">Menús</h3>
            <Button size="sm" variant="submit" onClick={() => setMostrarFormMenu((v) => !v)}>
              <FolderPlus size={14} className="mr-1" /> Nuevo
            </Button>
          </div>
          {mostrarFormMenu && (
            <div className="mb-3 p-3 border border-gray-200 rounded-lg space-y-2 bg-gray-50">
              <Input
              placeholder="Nombre para mostrar"
              value={nombreNuevoMenu}
              onChange={(e) => setNombreNuevoMenu(e.target.value)}
              className="h-8 text-xs"
              />
              <Input
              placeholder="Nombre de Archivo"
              value={codigoNuevoMenu}
              onChange={(e) => setCodigoNuevoMenu(e.target.value)}
              className="h-8 text-xs"
              />
              <Input
              placeholder="Ícono (nombre de lucide-react, ej. Truck)"
              value={iconoNuevoMenu}
              onChange={(e) => setIconoNuevoMenu(e.target.value)}
              className="h-8 text-xs"
              />
              <Input
              placeholder="Descripción"
              value={descripcionNuevoMenu}
              onChange={(e) => setDescripcionNuevoMenu(e.target.value)}
              className="h-8 text-xs"
              />
              {errorCrearMenu && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={12} /> {errorCrearMenu}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                size="sm"
                variant="submit"
                onClick={handleCrearMenu}
                disabled={
                  creandoMenu ||
                  !nombreNuevoMenu.trim() ||
                  !codigoNuevoMenu.trim() ||
                  !iconoNuevoMenu.trim() ||
                  !descripcionNuevoMenu.trim()
                }
                >
                  {creandoMenu ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                  Crear
                </Button>
                <Button
                size="sm"
                variant="cancel"
                onClick={() => setMostrarFormMenu(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
          {errorMenus && (
            <p className="text-xs text-red-600 mb-2 flex items-center gap-1">
              <AlertCircle size={12} /> {errorMenus}
            </p>
          )}
          {cargandoMenus ? (
            <div className="flex justify-center py-6">
              <Loader2 size={20} className="animate-spin text-[#2183AE]" />
            </div>
          ) : menus.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No hay menús todavía. Crea el primero.</p>
          ) : (
            <div className="space-y-1.5">
              {menus.map((m) => (
                <div
                key={m.id_menu}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border transition-colors ${
                  menuSeleccionado === m.id_menu
                    ? "border-[#2183AE] bg-[#2183AE]/5"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
                >
                  <button
                  onClick={() => setMenuSeleccionado(m.id_menu)}
                  className="flex-1 min-w-0 text-left">
                    <p className={`text-sm truncate ${m.visible ? "text-gray-800" : "text-gray-400"}`}>{m.nombre}</p>
                    <p className="text-xs text-gray-400 truncate">{m.nombre_menu}</p>
                  </button>
                  <button
                  onClick={() => handleToggleVisible(m)}
                  className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                    m.visible
                      ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                      : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                  }`}
                  title={m.visible ? "Ocultar menú" : "Mostrar menú"}
                  >
                    {m.visible ? <Eye size={12} /> : <EyeOff size={12} />}
                    {m.visible ? "Visible" : "Oculto"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="lg:col-span-3 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          {!menuActual ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <ShieldCheck size={28} className="text-gray-300 mb-2" />
              <p className="text-sm text-gray-400">Selecciona o crea un menú para configurar sus roles.</p>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-medium text-gray-800">{menuActual.nombre}</h3>
              <p className="text-xs text-gray-400 mb-3">{menuActual.descripcion}</p>
              <div className="flex flex-col sm:flex-row gap-2 mt-3">
                <select
                value={rolParaAgregar}
                onChange={(e) => setRolParaAgregar(e.target.value)}
                className="sm:flex-1 h-9 rounded-md border border-gray-200 bg-transparent px-3 text-sm"
                >
                  <option value="">Seleccionar rol…</option>
                  {rolesDisponibles.map((r) => (
                    <option key={r.id_rol} value={r.id_rol}>{r.nombre}</option>
                  ))}
                </select>
                <Button
                variant="submit"
                onClick={handleAgregarRol}
                disabled={agregandoRol || !rolParaAgregar}>
                  {agregandoRol ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Plus size={14} className="mr-1.5" />}
                  Agregar
                </Button>
              </div>
              {errorAgregarRol && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1.5">
                  <AlertCircle size={13} className="shrink-0" /> {errorAgregarRol}
                </p>
              )}
              <div className="mt-4">
                {errorRoles && (
                  <p className="text-xs text-red-600 mb-3 flex items-center gap-1.5">
                    <AlertCircle size={13} className="shrink-0" /> {errorRoles}
                  </p>
                )}
                {cargandoRoles ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-10">
                    <Loader2 size={18} className="animate-spin" /> Cargando roles…
                  </div>
                ) : rolesDelMenu.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-10">Ningún rol tiene acceso a este menú todavía.</p>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {rolesDelMenu.map((r) => (
                      <div key={r.id_menu_rol} className="flex items-center justify-between gap-3 py-3">
                        <p className="text-sm text-gray-800 truncate">{r.nombre_rol || `Rol #${r.id_rol_core}`}</p>
                        <button
                        onClick={() => handleQuitarRol(r.id_menu_rol)}
                        className="p-1.5 text-gray-400 enabled:hover:text-red-500 enabled:hover:bg-red-50 rounded-lg transition-colors shrink-0"
                        title="Quitar acceso"
                        disabled={r.id_rol_core === 1}
                        >
                          <Trash2 size={14} />
                        </button>
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