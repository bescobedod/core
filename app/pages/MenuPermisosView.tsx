"use client";

import { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { ShieldCheck, Plus, Trash2, Loader2, AlertCircle, AlertTriangle, FolderPlus, Eye, EyeOff, Pencil } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  getAllMenusAdmin,
  crearMenu,
  actualizarMenu,
  actualizarVisibilidadMenu,
  getRolesDeMenu,
  asignarRolAMenu,
  actualizarNivelPermiso,
  quitarRolDeMenu,
} from "../api/MenuApi";
import { getAllRoles } from "../api/RolApi";
import { MenuModel, MenuRolAsignacion, NivelPermisoMenu } from "../types/MenuModel";
import { RolModel } from "../types/RolModel";

const NIVELES_PERMISO: { value: NivelPermisoMenu; label: string }[] = [
  { value: "escritura", label: "Escritura" },
  { value: "lectura", label: "Lectura" },
  { value: "lectura_division", label: "Lectura (su división)" },
];

// Mismo criterio que HomeView: si el nombre no existe en lucide-react, se
// muestra un círculo. Sirve para previsualizar el ícono al editar.
function iconoLucide(nombre: string) {
  if (nombre in Icons) {
    // @ts-expect-error clave dinámica
    return Icons[nombre];
  }
  return Icons.Circle;
}

type DatosMenu = { nombre: string; icono: string; nombre_menu: string; descripcion: string };

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
  const [nivelPermisoParaAgregar, setNivelPermisoParaAgregar] = useState<NivelPermisoMenu>("escritura");
  const [agregandoRol, setAgregandoRol] = useState(false);
  const [errorAgregarRol, setErrorAgregarRol] = useState<string | null>(null);
  const [cambiandoNivelId, setCambiandoNivelId] = useState<number | null>(null);
  const [edicionMenu, setEdicionMenu] = useState<DatosMenu | null>(null);
  const [guardandoMenu, setGuardandoMenu] = useState(false);
  const [errorEditarMenu, setErrorEditarMenu] = useState<string | null>(null);

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
    setNivelPermisoParaAgregar("escritura");
    setEdicionMenu(null);
    setErrorEditarMenu(null);
  }, [menuSeleccionado]);

  const handleEmpezarEdicion = (menu: MenuModel) => {
    setEdicionMenu({
      nombre: menu.nombre,
      icono: menu.icono,
      nombre_menu: menu.nombre_menu,
      descripcion: menu.descripcion,
    });
    setErrorEditarMenu(null);
  };

  const handleGuardarEdicion = async (menu: MenuModel) => {
    if (!edicionMenu) return;

    const datos = {
      nombre: edicionMenu.nombre.trim(),
      icono: edicionMenu.icono.trim(),
      nombre_menu: edicionMenu.nombre_menu.trim(),
      descripcion: edicionMenu.descripcion.trim(),
    };

    if (datos.nombre_menu !== menu.nombre_menu &&
        !window.confirm(`¿Cambiar el nombre de archivo de "${menu.nombre_menu}" a "${datos.nombre_menu}"? El sistema usa ese valor para abrir la vista y leer los permisos; si no coincide con una vista existente, el menú dejará de funcionar.`)) {
      return;
    }

    setGuardandoMenu(true);
    setErrorEditarMenu(null);

    try {
      const actualizado = await actualizarMenu(menu.id_menu, datos);
      setMenus((prev) => prev.map((m) => (m.id_menu === menu.id_menu ? { ...m, ...actualizado } : m)));
      setEdicionMenu(null);
    } catch (err) {
      setErrorEditarMenu(err instanceof Error ? err.message : "Error al actualizar el menú");
    } finally {
      setGuardandoMenu(false);
    }
  };

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
      await asignarRolAMenu(menuSeleccionado, Number(rolParaAgregar), nivelPermisoParaAgregar);
      setRolParaAgregar("");
      setNivelPermisoParaAgregar("escritura");
      cargarRolesDelMenu(menuSeleccionado);
    } catch (err) {
      setErrorAgregarRol(err instanceof Error ? err.message : "Error al asignar el rol");
    } finally {
      setAgregandoRol(false);
    }
  };

  const handleCambiarNivelPermiso = async (id_menu_rol: number, nuevoNivel: NivelPermisoMenu) => {
    const anterior = rolesDelMenu.find((r) => r.id_menu_rol === id_menu_rol)?.nivel_permiso;

    setCambiandoNivelId(id_menu_rol);
    setRolesDelMenu((prev) =>
      prev.map((r) => (r.id_menu_rol === id_menu_rol ? { ...r, nivel_permiso: nuevoNivel } : r))
    );

    try {
      await actualizarNivelPermiso(id_menu_rol, nuevoNivel);
    } catch (err) {
      setRolesDelMenu((prev) =>
        prev.map((r) => (r.id_menu_rol === id_menu_rol ? { ...r, nivel_permiso: anterior || r.nivel_permiso } : r))
      );
      setErrorRoles(err instanceof Error ? err.message : "Error al actualizar el nivel de permiso");
    } finally {
      setCambiandoNivelId(null);
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
              {edicionMenu ? (
                <div className="p-3 border border-gray-200 rounded-lg space-y-2.5 bg-gray-50">
                  <p className="text-xs font-medium text-gray-700">Editar menú</p>
                  <div>
                    <label htmlFor="editar-menu-nombre" className="text-[11px] text-gray-500 mb-1 block">Nombre para mostrar</label>
                    <Input
                    id="editar-menu-nombre"
                    value={edicionMenu.nombre}
                    maxLength={50}
                    onChange={(e) => setEdicionMenu({ ...edicionMenu, nombre: e.target.value })}
                    className="h-8 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="editar-menu-archivo" className="text-[11px] text-gray-500 mb-1 block">Nombre de Archivo</label>
                    <Input
                    id="editar-menu-archivo"
                    value={edicionMenu.nombre_menu}
                    maxLength={50}
                    onChange={(e) => setEdicionMenu({ ...edicionMenu, nombre_menu: e.target.value })}
                    className="h-8 text-xs bg-white"
                    />
                    {edicionMenu.nombre_menu.trim() !== menuActual.nombre_menu && (
                      <p className="text-[11px] text-amber-700 mt-1 flex items-start gap-1">
                        <AlertTriangle size={12} className="shrink-0 mt-px" />
                        El sistema usa este valor para abrir la vista y leer sus permisos. Cámbialo solo si la vista también cambió de nombre.
                      </p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="editar-menu-icono" className="text-[11px] text-gray-500 mb-1 block">Ícono (nombre de lucide-react, ej. Truck)</label>
                    <div className="flex items-center gap-2">
                      <Input
                      id="editar-menu-icono"
                      value={edicionMenu.icono}
                      maxLength={20}
                      onChange={(e) => setEdicionMenu({ ...edicionMenu, icono: e.target.value })}
                      className="h-8 text-xs bg-white flex-1"
                      />
                      {(() => {
                        const IconoPrevia = iconoLucide(edicionMenu.icono.trim());
                        return (
                          <span className="w-8 h-8 rounded-md border border-gray-200 bg-white flex items-center justify-center shrink-0" title="Vista previa">
                            <IconoPrevia size={16} className="text-[#2183AE]" />
                          </span>
                        );
                      })()}
                    </div>
                    {edicionMenu.icono.trim() && !(edicionMenu.icono.trim() in Icons) && (
                      <p className="text-[11px] text-amber-700 mt-1">Ese ícono no existe en lucide-react; se mostrará un círculo.</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="editar-menu-descripcion" className="text-[11px] text-gray-500 mb-1 block">Descripción</label>
                    <Input
                    id="editar-menu-descripcion"
                    value={edicionMenu.descripcion}
                    maxLength={255}
                    onChange={(e) => setEdicionMenu({ ...edicionMenu, descripcion: e.target.value })}
                    className="h-8 text-xs bg-white"
                    />
                  </div>
                  {errorEditarMenu && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle size={12} /> {errorEditarMenu}
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button
                    size="sm"
                    variant="submit"
                    onClick={() => handleGuardarEdicion(menuActual)}
                    disabled={
                      guardandoMenu ||
                      !edicionMenu.nombre.trim() ||
                      !edicionMenu.nombre_menu.trim() ||
                      !edicionMenu.icono.trim() ||
                      !edicionMenu.descripcion.trim()
                    }
                    >
                      {guardandoMenu ? <Loader2 size={12} className="animate-spin mr-1" /> : null}
                      Guardar
                    </Button>
                    <Button
                    size="sm"
                    variant="cancel"
                    onClick={() => { setEdicionMenu(null); setErrorEditarMenu(null); }}
                    disabled={guardandoMenu}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-800">{menuActual.nombre}</h3>
                    <p className="text-xs text-gray-400">{menuActual.descripcion}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Archivo: <span className="text-gray-500">{menuActual.nombre_menu}</span> · Ícono: <span className="text-gray-500">{menuActual.icono}</span>
                    </p>
                  </div>
                  <button
                  onClick={() => handleEmpezarEdicion(menuActual)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#2183AE] hover:bg-[#2183AE]/10 rounded-lg transition-colors shrink-0"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                </div>
              )}
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
                <select
                value={nivelPermisoParaAgregar}
                onChange={(e) => setNivelPermisoParaAgregar(e.target.value as NivelPermisoMenu)}
                className="h-9 rounded-md border border-gray-200 bg-transparent px-3 text-sm"
                >
                  {NIVELES_PERMISO.map((n) => (
                    <option key={n.value} value={n.value}>{n.label}</option>
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
                        <p className="text-sm text-gray-800 truncate flex-1 min-w-0">{r.nombre_rol || `Rol #${r.id_rol_core}`}</p>
                        <select
                        value={r.nivel_permiso}
                        onChange={(e) => handleCambiarNivelPermiso(r.id_menu_rol, e.target.value as NivelPermisoMenu)}
                        disabled={cambiandoNivelId === r.id_menu_rol}
                        className="h-8 rounded-md border border-gray-200 bg-transparent px-2 text-xs shrink-0"
                        >
                          {NIVELES_PERMISO.map((n) => (
                            <option key={n.value} value={n.value}>{n.label}</option>
                          ))}
                        </select>
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