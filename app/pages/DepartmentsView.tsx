import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, X, Building2, Users, Grid3x3, User, Loader2, UserCog, Check, UserMinus, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { DepartamentoModel } from "../types/DepartamentoModel";
import { AreasUsuariosModel } from "../types/AreaModel";
import { UserModel, UserTemporalModel } from "../types/UserModel";
import { getDepartamentos, updateDepartamento } from "../api/DepartamentoApi";
import { getAreasYEmpleadosByDepartamento } from "../api/AreaApi";
import { getUsersByDepartamento2, searchUsers } from "../api/UserApi";

interface DepartmentsProps {
  onBack: () => void;
}

export function DepartmentsView({ onBack } : DepartmentsProps ) {
    const [isEditing, setIsEditing] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [departmentToDelete, setDepartmentToDelete] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isAddingArea, setIsAddingArea] = useState(false);
    const [tempAreas, setTempAreas] = useState<any[]>([]);
    const [areasAInactivar, setAreasAInactivar] = useState<string[]>([]);
    const [isAddingUser, setIsAddingUser] = useState(false);
    const [newUser, setNewUser] = useState<{
        id_users: number | null;
        name: string;
        email: string;
        areaId: string;
    }>({
        id_users: null,
        name: "",
        email: "",
        areaId: ""
    });
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [departamentos, setDepartamentos] = useState<DepartamentoModel[] | []>([]);
    const [selectedDepartamento, setSelectedDepartamento] = useState<DepartamentoModel | null>(null);
    const [areasUsuarios, setAreasUsuarios] = useState<AreasUsuariosModel>({
        Areas: [],
        Usuarios: []
    });
    const [usuarios, setUsuarios] = useState<UserModel[] | []>([]);
    const [loadingDepartamentos, setLoadingDepartamentos] = useState(true);
    const [loadingAreas, setLoadingAreas] = useState(false);
    const [loadingUpdate, setLoadingUpdate] = useState(false);
    const [showUpdateDialog, setShowUpdateDialog] = useState(false);
    const [openAssignArea, setOpenAssignArea] = useState<string | null>(null);
    const [usersSearched, setUsersSearched] = useState<UserModel[] | []>([]);
    const [usuariosNuevos, setUsuariosNuevos] = useState<UserTemporalModel[]>([]);
    const [jefesAEliminar, setJefesAEliminar] = useState<string[]>([]);
    const [jefesActualizados, setJefesActualizados] = useState<Record<string, string | null>>({});
    const [messageModal, setMessageModal] = useState<{ title: string; message: string; type: 'success' | 'error' } | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    const showMessageModal = (message: string, type: 'success' | 'error' = 'error', title?: string) => {
        setMessageModal({
            title: title ?? (type === 'success' ? '¡Listo!' : 'Atención'),
            message,
            type,
        });
    };

    const [loadingSearch, setLoadingSearch] = useState(false);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const nameRef = useRef<HTMLInputElement>(null);
    const descRef = useRef<HTMLInputElement>(null);

    const fetchDepartamentos = async () => {
        try {
            const data = await getDepartamentos();
            setDepartamentos(data);
        } catch (err: any) {
            if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
                localStorage.clear();
                setIsAuthenticated(false);
                return;
            }
            setError((err as Error).message);
        } finally {
            setLoadingDepartamentos(false);
        }
    }

    const fetchAreas = async () => {
        if(!selectedDepartamento?.id_departamento) {
            return;
        }

        try {
            setLoadingAreas(true);

            const data = await getAreasYEmpleadosByDepartamento(selectedDepartamento.id_departamento);
            setAreasUsuarios(data);
        } catch(err: any) {
            if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
                localStorage.clear();
                setIsAuthenticated(false);
                return;
            }
            setError((err as Error).message);
        } finally {
            setLoadingAreas(false);
        }
    }

    const fetchUsers = async () => {
        if(selectedDepartamento === null) return
        try {
            const data = await getUsersByDepartamento2(selectedDepartamento?.id_departamento || "");
            setUsuarios(data);
        } catch (err: any) {
            if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
                localStorage.clear();
                setIsAuthenticated(false);
                return;
            }
            setError((err as Error).message);
        }
    }

    useEffect(() => {
        fetchDepartamentos();
    }, [])

    useEffect(() => {
        fetchAreas();
        fetchUsers();
    }, [selectedDepartamento])

    const handleCreateDepartment = () => {
        
    };

    const handleUpdateDepartment = async () => {
        if(!selectedDepartamento) return;

        try {
            setLoadingUpdate(true);
            const payload = {
                departamento: {
                    nombre: selectedDepartamento.nombre,
                    descripcion: selectedDepartamento.descripcion
                },
                areas_nuevas: tempAreas,
                areas_inactivar: areasAInactivar,
                jefes_eliminar: jefesAEliminar,
                jefes_actualizar: jefesActualizados,
                usuarios_nuevos: usuariosNuevos
            };

            await updateDepartamento(selectedDepartamento.id_departamento, payload);
            await fetchDepartamentos();
            await fetchAreas();

            setAreasAInactivar([]);
            setTempAreas([]);
            setIsEditing(false);
            setShowUpdateDialog(true);
        } catch (err: any) {
            if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
                localStorage.clear();
                setIsAuthenticated(false);
                return;
            }
            setError((err as Error).message);
        } finally {
            setLoadingUpdate(false);
        }
    };

    const handleDeleteDepartment = (id: string) => {
        setDepartmentToDelete(id);
        setShowDeleteDialog(true);
    };

    const handleSearchUsers = (value: string) => {
        setSearchTerm(value);

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            if (!value || value.trim().length < 2) {
                setUsersSearched([]);
                return;
            }

            try {
                setLoadingSearch(true);

                const results = await searchUsers(
                    value,
                    selectedDepartamento?.id_departamento
                );

                setUsersSearched(results);
            } catch (err: any) {
                showMessageModal(err?.message ?? String(err));
            } finally {
                setLoadingSearch(false);
            }
        }, 300);
    };

    const confirmDelete = () => {
        
    };

    const handleAddArea = async () => {
        const nombre = nameRef.current?.value;
        const descripcion = descRef.current?.value;

        if (!nombre?.trim() || !descripcion?.trim()) return;        

        const nuevaArea = {
            nombre: nombre,
            descripcion: descripcion
        };

        setTempAreas([...tempAreas, nuevaArea]);

        if (nameRef.current) nameRef.current.value = "";
        if (descRef.current) descRef.current.value = "";
        setIsAddingArea(false);
    };

    const handleInactivarArea = (areaId: string, nombreArea: string) => {
        const tieneEmpleados = areasUsuarios.Usuarios.some(u => u.id_area === areaId);

        if(tieneEmpleados) {
            showMessageModal(`No se puede inactivar el área ${nombreArea} porque tiene empleados asignados`);
            return;
        }

        setAreasAInactivar(prev => [...prev, areaId]);
    };

    const handleAddUser = () => {
    if (!newUser.id_users || !newUser.areaId) {
        showMessageModal("Selecciona un usuario y un área");
        return;
    }

    const existeEnBD = areasUsuarios.Usuarios.some(
        u => Number(u.id_users) === newUser.id_users
    );

    const existeTemporal = usuariosNuevos.some(
        u => Number(u.id_users) === newUser.id_users
    );

    if (existeEnBD || existeTemporal) {
        showMessageModal("El usuario ya está asignado al departamento");
        return;
    }

    const nuevoUsuario: UserTemporalModel = {
        id_users: newUser.id_users, // ✅ number real
        first_name: newUser.name,
        first_last_name: "",
        email: newUser.email,
        id_area: newUser.areaId,
        nombre_area:
            areasUsuarios.Areas.find(a => a.id_area === newUser.areaId)?.nombre || ""
    };

    setUsuariosNuevos(prev => [...prev, nuevoUsuario]);

    setNewUser({
        id_users: null,
        name: "",
        email: "",
        areaId: ""
    });

    setSearchTerm("");
    setIsAddingUser(false);
};

    const handleDeleteUser = (userId: string) => {
        
    };

    const handleRemoveJefe = (areaId: string) => {
        setAreasUsuarios(prev => ({
            ...prev,
            Areas: prev.Areas.map(area =>
                area.id_area === areaId
                    ? {
                        ...area,
                        nombre_jefe_inmediato: "",
                        id_jefe_inmediato: null
                    }
                    : area
            )
        }));

        setJefesAEliminar(prev =>
            prev.includes(areaId) ? prev : [...prev, areaId]
        );
    };

    return (
        <div className="py-2 sm:py-6 lg:py-1 px-2 sm:px-4">
            <AnimatePresence>
              {messageModal && (
                <motion.div
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center border border-gray-100"
                  >
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${messageModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'}`}>
                      {messageModal.type === 'success' ? (
                        <CheckCircle className="h-12 w-12 text-green-600" />
                      ) : (
                        <AlertCircle className="h-12 w-12 text-red-600" />
                      )}
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{messageModal.title}</h3>
                    <p className="text-gray-600 mb-6">{messageModal.message}</p>
                    <Button
                      onClick={() => setMessageModal(null)}
                      className="w-full bg-[#2183AE] text-white hover:bg-[#1a6a8f] py-4 rounded-xl font-semibold"
                    >
                      Entendido
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
            <div className="w-full max-w-7xl mx-auto">
                <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-white mb-0 text-lg">Gestión de Departamentos</h2>
                            <p className="text-sm text-white/90">
                                Administra departamentos, áreas y usuarios de la organización
                            </p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-gray-900">Departamentos</h3>
                                <Button
                                onClick={() => setIsCreating(true)}
                                size="sm"
                                className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                            </div>
                            <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                                {loadingDepartamentos ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                        <Loader2 className="h-8 w-8 animate-spin text-[#2183AE] mb-2" />
                                        <p className="text-sm font-medium">Cargando departamentos...</p>
                                    </div>
                                ) : (
                                    departamentos.map((departamento) => (
                                        <motion.div
                                        key={departamento.id_departamento}
                                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                            selectedDepartamento?.id_departamento === departamento.id_departamento
                                            ? 'border-[#2183AE] bg-[#2183AE]/5'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                        }`}
                                        onClick={() => {
                                            setSelectedDepartamento(departamento);
                                            setIsCreating(false);
                                            setIsEditing(false);
                                        }}
                                        >
                                            <h4 className="font-medium text-sm text-gray-900">{departamento.nombre}</h4>
                                            <p className="text-xs text-gray-600 line-clamp-2">
                                                {departamento.descripcion}
                                            </p>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        {isCreating ? (
                            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                                <h3 className="font-semibold text-gray-900 mb-4">Nuevo Departamento</h3>
                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm text-gray-700 mb-1.5 block">Nombre *</Label>
                                        <Input
                                        // value={newDepartment.name}
                                        // onChange={(e) => setNewDepartment({ ...newDepartment, name: e.target.value })}
                                        placeholder="Nombre del departamento"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-sm text-gray-700 mb-1.5 block">Descripción *</Label>
                                        <Textarea
                                        // value={newDepartment.description}
                                        // onChange={(e) => setNewDepartment({ ...newDepartment, description: e.target.value })}
                                        placeholder="Descripción del departamento"
                                        rows={3}
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-4 border-t border-gray-200">
                                        <Button
                                        onClick={() => setIsCreating(false)}
                                        variant="outline"
                                        className="flex-1 border border-gray-900 bg-gray-900 text-white hover:bg-white hover:text-gray-900"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button
                                        onClick={handleCreateDepartment}
                                        className="flex-1 border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                                        >
                                            Crear Departamento
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ) : selectedDepartamento ? (
                            <div className="space-y-4">
                                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900">Información del Departamento</h3>
                                        <div className="flex gap-2">
                                            {!isEditing ? (
                                                <>
                                                    <Button
                                                    onClick={() => setIsEditing(true)}
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                                                    >
                                                        <Edit2 className="h-3 w-3 mr-1" />
                                                        Editar
                                                    </Button>
                                                    <Button
                                                    onClick={() => handleDeleteDepartment(selectedDepartamento.id_departamento)}
                                                    size="sm"
                                                    variant="outline"
                                                    className="border-red-600 bg-red-600 text-white hover:bg-white hover:text-red-600"
                                                    >
                                                        <Trash2 className="h-3 w-3 mr-1" />
                                                        Eliminar
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                    onClick={() => {
                                                        setIsEditing(false);
                                                        setSelectedDepartamento(departamentos.find(d => d.id_departamento === selectedDepartamento.id_departamento) || selectedDepartamento);
                                                    }}
                                                    size="sm"
                                                    variant="outline"
                                                    className="border border-gray-900 bg-gray-900 text-white hover:bg-white hover:text-gray-900"
                                                    >
                                                        <X className="h-3 w-3 mr-1" />
                                                        Cancelar
                                                    </Button>
                                                    <Button
                                                    onClick={handleUpdateDepartment}
                                                    size="sm"
                                                    className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                                                    >
                                                        <Save className="h-3 w-3 mr-1" />
                                                        Guardar
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    {isEditing ? (
                                        <div className="space-y-4">
                                            <div>
                                                <Label className="text-sm text-gray-700 mb-1.5 block">Nombre</Label>
                                                <Input
                                                value={selectedDepartamento.nombre}
                                                onChange={(e) => setSelectedDepartamento({ ...selectedDepartamento, nombre: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <Label className="text-sm text-gray-700 mb-1.5 block">Descripción</Label>
                                                <Textarea
                                                value={selectedDepartamento.descripcion}
                                                onChange={(e) => setSelectedDepartamento({ ...selectedDepartamento, descripcion: e.target.value })}
                                                rows={3}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div>
                                                <Label className="text-xs text-gray-600">Nombre</Label>
                                                <p className="text-sm text-gray-900">{selectedDepartamento.nombre}</p>
                                            </div>
                                            <div>
                                                <Label className="text-xs text-gray-600">Descripción</Label>
                                                <p className="text-sm text-gray-900">{selectedDepartamento.descripcion}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                            <Grid3x3 className="h-5 w-5 text-[#2183AE]" />
                                            Áreas del Departamento
                                        </h3>
                                        {isEditing && (
                                            <Button
                                                onClick={() => setIsAddingArea(true)}
                                                size="sm"
                                                className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Agregar Área
                                            </Button>
                                        )}
                                    </div>
                                    {isAddingArea && (
                                        <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
                                            <div className="space-y-3">
                                                <div>
                                                    <Label className="text-sm text-gray-700 mb-1 block">Nombre del Área</Label>
                                                    <Input
                                                    ref={nameRef}
                                                    placeholder="Ej: Desarrollo"
                                                    />
                                                </div>
                                            <div>
                                                <Label className="text-sm text-gray-700 mb-1 block">Descripción (Opcional)</Label>
                                                <Input
                                                    ref={descRef}
                                                    placeholder="Breve descripción del área..."
                                                />
                                            </div>
                                            <div className="flex gap-2 justify-end">
                                                <Button
                                                onClick={handleAddArea}
                                                size="sm"
                                                className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                                                >
                                                    Añadir a la lista
                                                </Button>
                                                <Button
                                                onClick={() => {
                                                    setIsAddingArea(false);
                                                    if (nameRef.current) nameRef.current.value = "";
                                                    if (descRef.current) descRef.current.value = "";
                                                }}
                                                size="sm"
                                                variant="outline"
                                                className="border border-gray-900 bg-gray-900 text-white hover:bg-white hover:text-gray-900"
                                                >
                                                    Cancelar
                                                </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        {areasUsuarios.Areas.length > 0 ? (
                                            areasUsuarios.Areas
                                            .filter(a => a.activo && !areasAInactivar.includes(a.id_area))
                                            .map((area) => (
                                                <div key={area.id_area} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-[#2183AE] text-white rounded-full flex items-center justify-center">
                                                            <Grid3x3 className="h-4 w-4" />
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <h4 className="font-medium text-sm text-gray-900">{area.nombre}</h4>
                                                            <p className="text-xs text-gray-600 line-clamp-2">Jefe Inmediato: {area.nombre_jefe_inmediato || "Sin asignar"}</p>
                                                        </div>
                                                    </div>
                                                    {isEditing && (
                                                        <div className="flex items-center gap-1">
                                                            <div className="relative w-[32px] h-[32px]">
                                                                {openAssignArea !== area.id_area && (
                                                                    <motion.div
                                                                    initial={{ width: 32, opacity: 1 }}
                                                                    animate={{ width: 32, opacity: 1 }}
                                                                    >
                                                                        <Button
                                                                        onClick={() => setOpenAssignArea(area.id_area)}
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-blue-600 hover:text-blue-700 p-0 w-8 h-8"
                                                                        >
                                                                            <UserCog className="h-4 w-4" />
                                                                        </Button>
                                                                    </motion.div>
                                                                )}
                                                                {openAssignArea === area.id_area && (
                                                                    <motion.select
                                                                    value={jefesActualizados[area.id_area] ?? area.jefe_inmediato ?? ""}
                                                                    initial={{ width: 0, opacity: 0 }}
                                                                    animate={{ width: 180, opacity: 1 }}
                                                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                                                    onChange={(e) => {
                                                                        setJefesActualizados(prev => ({
                                                                            ...prev,
                                                                            [area.id_area]: e.target.value || null
                                                                        }));
                                                                    }}
                                                                    className="absolute right-0 top-0 h-8 text-xs border border-gray-300 rounded-md px-2"
                                                                    >
                                                                        <option value="">Sin jefe</option>
                                                                        {usuarios.map((usuario) => (
                                                                            <option key={usuario.id_users} value={usuario.id_users}>
                                                                                {usuario.first_name} {usuario.first_last_name}
                                                                            </option>
                                                                        ))}
                                                                    </motion.select>
                                                                )}
                                                            </div>
                                                            <Button
                                                            onClick={() => handleRemoveJefe(area.id_area)}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700"
                                                            >
                                                                <UserMinus className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                            onClick={() => handleInactivarArea(area.id_area, area.nombre)}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <Grid3x3 className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                                <p className="text-sm">No hay áreas configuradas</p>
                                            </div>
                                        )}
                                        {areasAInactivar.length > 0 && (
                                            <details className="mt-4 border border-red-200 rounded-lg overflow-hidden">
                                                <summary className="bg-red-50 p-2 text-red-700 text-sm font-medium cursor-pointer">
                                                    Áreas para inactivar ({areasAInactivar.length})
                                                </summary>
                                                <div className="p-2 space-y-1 bg-white">
                                                    {areasAInactivar.map(id => {
                                                        const area = areasUsuarios.Areas.find(a => a.id_area === id);
                                                        return (
                                                            <div key={id} className="flex justify-between text-xs text-gray-500">
                                                                <span>{area?.nombre}</span>
                                                                <button 
                                                                    onClick={() => setAreasAInactivar(prev => prev.filter(i => i !== id))}
                                                                    className="text-blue-500 hover:underline"
                                                                >
                                                                    Restaurar
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </details>
                                        )}
                                        {tempAreas.length > 0 && (
                                            <div className="mt-2 space-y-1">
                                                <p className="text-xs font-semibold text-gray-500">Áreas por agregar:</p>
                                                {tempAreas.map((area, index) => (
                                                    <div key={index} className="flex items-center justify-between bg-blue-50 p-2 rounded">
                                                        <span className="text-sm text-blue-800">{area.nombre}</span>
                                                        <button 
                                                        onClick={() => setTempAreas(tempAreas.filter((_, i) => i !== index))}
                                                        className="text-red-500 text-xs hover:underline"
                                                        >
                                                            Quitar
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                                            <Users className="h-5 w-5 text-[#2183AE]" />
                                            Usuarios del Departamento
                                        </h3>
                                        {isEditing && areasUsuarios.Areas.length > 0 && !isAddingUser && (
                                            <Button
                                            onClick={() => setIsAddingUser(true)}
                                            size="sm"
                                            className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Agregar Usuario
                                            </Button>
                                        )}
                                    </div>
                                    {isAddingUser && (
                                        <div className="border border-gray-200 rounded-lg p-4 mb-4">
                                            <Label className="text-sm text-gray-700 mb-2 block">Información del Usuario</Label>
                                            <div className="space-y-3">
                                                <div className="relative">
                                                    <Input
                                                    value={searchTerm}
                                                    onChange={(e) => handleSearchUsers(e.target.value)}
                                                    placeholder="Buscar por nombre o código"
                                                    onBlur={() => {
                                                        setTimeout(() => setUsersSearched([]), 200);
                                                    }}
                                                    />
                                                    {loadingSearch && (
                                                        <div className="absolute right-2 top-2">
                                                            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                                        </div>
                                                    )}
                                                    {usersSearched.length > 0 && (
                                                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                                            {usersSearched.map((user) => (
                                                                <div
                                                                    key={user.id_users}
                                                                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                                                    onClick={() => {
                                                                        setNewUser({
                                                                            id_users: Number(user.id_users),
                                                                            name: user.first_name,
                                                                            email: user.email,
                                                                            areaId: ""
                                                                        });
                                                                        setSearchTerm(user.first_name);
                                                                        setUsersSearched([]);
                                                                    }}
                                                                >
                                                                    <div className="font-medium">{user.first_name}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {user.codigo_user} • {user.email}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <select
                                                    value={newUser.areaId}
                                                    onChange={(e) => setNewUser({ ...newUser, areaId: e.target.value })}
                                                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
                                                >
                                                    <option value="">Seleccionar área</option>
                                                    {areasUsuarios.Areas.map(area => (
                                                        <option key={area.id_area} value={area.id_area}>
                                                            {area.nombre}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                    onClick={handleAddUser}
                                                    size="sm"
                                                    className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                                                    >
                                                        Agregar
                                                    </Button>
                                                    <Button
                                                    onClick={() => {
                                                        setIsAddingUser(false);
                                                        setNewUser({ id_users: null, name: "", email: "", areaId: "" });
                                                    }}
                                                    variant="outline"
                                                    size="sm"
                                                    className="border border-gray-900 bg-gray-900 text-white hover:bg-white hover:text-gray-900"
                                                    >
                                                        Cancelar
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {areasUsuarios.Areas.length === 0 && (
                                        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-xs text-yellow-800">
                                                Debes crear al menos un área antes de agregar usuarios
                                            </p>
                                        </div>
                                    )}
                                    <div className="space-y-2">
                                        {areasUsuarios.Usuarios.length > 0 ? (
                                            areasUsuarios.Usuarios.map((user) => (
                                                <div key={user.id_users} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-[#2183AE] text-white rounded-full flex items-center justify-center">
                                                            <User className="h-5 w-5" />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-gray-900">{user.nombre}</p>
                                                            <p className="text-xs text-gray-600">{user.email}</p>
                                                            <p className="text-xs text-[#2183AE] font-medium mt-0.5">
                                                                {user.nombre_area}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {isEditing && (
                                                        <div className="flex items-center gap-1">
                                                            <div className="relative w-[32px] h-[32px]">
                                                                {openAssignArea !== user.id_users.toString() && (
                                                                    <motion.div
                                                                    initial={{ width: 32, opacity: 1 }}
                                                                    animate={{ width: 32, opacity: 1 }}
                                                                    >
                                                                        <Button
                                                                        onClick={() => setOpenAssignArea(user.id_users.toString())}
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="text-blue-600 hover:text-blue-700 p-0 w-8 h-8"
                                                                        >
                                                                            <UserCog className="h-4 w-4" />
                                                                        </Button>
                                                                    </motion.div>
                                                                )}
                                                                {openAssignArea === user.id_users.toString() && (
                                                                    <motion.select
                                                                    value={jefesActualizados[user.id_users] ?? user.nombre ?? ""}
                                                                    initial={{ width: 0, opacity: 0 }}
                                                                    animate={{ width: 180, opacity: 1 }}
                                                                    transition={{ duration: 0.25, ease: "easeInOut" }}
                                                                    onChange={(e) => {
                                                                        setJefesActualizados(prev => ({
                                                                            ...prev,
                                                                            [user.id_users]: Number(e.target.value) || null
                                                                        }));
                                                                    }}
                                                                    className="absolute right-0 top-0 h-8 text-xs border border-gray-300 rounded-md px-2"
                                                                    >
                                                                        <option value="">Sin área</option>
                                                                        {areasUsuarios.Areas.map((area) => (
                                                                            <option key={area.id_area} value={area.id_area}>
                                                                                {area.nombre}
                                                                            </option>
                                                                        ))}
                                                                    </motion.select>
                                                                )}
                                                            </div>
                                                            <Button
                                                            onClick={() => handleRemoveJefe(user.id_users.toString())}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700"
                                                            >
                                                                <UserMinus className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                            onClick={() => handleInactivarArea(user.id_users.toString(), user.nombre)}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                <Users className="h-12 w-12 mx-auto mb-2 opacity-30" />
                                                <p className="text-sm">No hay usuarios asignados</p>
                                            </div>
                                        )}
                                        {usuariosNuevos.length > 0 && (
                                            <div className="mt-4 space-y-2">
                                                <p className="text-xs font-semibold text-blue-600">
                                                    Usuarios por agregar ({usuariosNuevos.length})
                                                </p>
                                                {usuariosNuevos.map((user) => (
                                                    <div key={user.id_users} className="flex items-center justify-between bg-blue-50 rounded-lg p-3 border border-blue-200">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center">
                                                                <User className="h-5 w-5" />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium text-blue-900">{user.first_name} {user.first_last_name}</p>
                                                                <p className="text-xs text-blue-700">{user.email}</p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            onClick={() => {
                                                                setUsuariosNuevos(prev =>
                                                                    prev.filter(u => u.id_users !== user.id_users)
                                                                );
                                                            }}
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                                <Building2 className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                                <h3 className="text-gray-900 mb-2">Selecciona un departamento</h3>
                                <p className="text-gray-600 text-sm">
                                    Selecciona un departamento de la lista para ver y editar sus detalles
                                </p>
                            </div>
                        )}
                    </div>
                </div>
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-red-600">
                                <Trash2 className="h-5 w-5" />
                                Eliminar Departamento
                            </DialogTitle>
                            <DialogDescription>
                                ¿Estás seguro de que deseas eliminar este departamento? Esta acción no se puede deshacer.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                            onClick={confirmDelete}
                            className="bg-red-600 text-white hover:bg-red-700"
                            >
                                Eliminar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
                    <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none shadow-2xl">
                        <div className="h-4 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f]" />
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                                <div className="rounded-full bg-green-100 p-3">
                                    <Check className="h-8 w-8 text-green-600" strokeWidth={3} />
                                </div>
                            </div>
                            <DialogHeader className="gap-1">
                                <DialogTitle className="text-2xl font-bold text-gray-800 text-center">
                                    ¡Todo listo!
                                </DialogTitle>
                                <DialogDescription className="text-base text-gray-500 text-center">
                                    El departamento <span className="font-semibold text-[#2183AE]">{selectedDepartamento?.nombre}</span> y sus áreas se han actualizado correctamente.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="mt-8 w-full sm:justify-center">
                                <Button
                                onClick={() => setShowUpdateDialog(false)}
                                className="w-full sm:w-32 bg-[#2183AE] text-white hover:bg-[#1a6a8f] transition-all duration-200 shadow-md hover:shadow-lg"
                                >
                                    Aceptar
                                </Button>
                            </DialogFooter>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}