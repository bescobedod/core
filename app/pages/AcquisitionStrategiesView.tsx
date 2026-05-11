import { motion } from "motion/react";
import { useEffect, useState } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  Users,
  FileText,
  ShoppingCart,
  Combine,
  RefreshCcw,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { EstrategiaModel, Matrices } from "../types/EstrategiaModel";
import { UserModel } from "../types/UserModel";
import { MatrizAprobacionSolicitudModel } from "../types/MatricesAprobacionModel";
import { AreaModel } from "../types/AreaModel";
import { getUsersByDepartamento } from "../api/UserApi";
import {
  createEstrategiaByArea,
  getEstrategias,
  getMatrizAprobacion,
  updateEstrategiaAdquisicion,
  createMatrizAprobacionSolicitud,
  getJefeInmediatoByEstrategia
} from "../api/EstrategiaApi";
import { getAreasByDepartamento } from "../api/AreaApi";

interface AcquisitionStrategiesProps {
  onBack: () => void;
}

export function AcquisitionStrategiesView({ onBack } : AcquisitionStrategiesProps) {
  const [estrategias, setEstrategias] = useState<EstrategiaModel[]>([]);
  const [selectedEstrategia, setSelectedEstrategia] = useState<EstrategiaModel | null>(null);
  const [formEstrategia, setFormEstrategia] = useState<EstrategiaModel | null>(null);
  const [matrices, setMatrices] = useState<Matrices>({
      matrices_solicitud: null,
      matrices_orden: []
  });
  const [nivelAprobador, setNivelAprobador] = useState<{
    usuario_aprobador_id: number;
    aprobador?: string;
    puesto_aprobador?: string;
  } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingMatrix, setEditingMatrix] = useState<{ type: 'pr' | 'po', id?: string } | null>(null);
  const [newMatrixName, setNewMatrixName] = useState("");
  const [newLevel, setNewLevel] = useState({
    userId: "",
    roleId: "",
    userName: "",
    userRole: ""
  });
  const activeStrategy = estrategias.find(s => s.esta_activo);
  const hasActiveStrategy = !!activeStrategy;
  const [areas, setAreas] = useState<AreaModel[]>([]);
  const [selectedArea, setSelectedArea] = useState<AreaModel | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingEstrategias, setLoadingEstrategias] = useState<boolean>(true);
  const [loadingMatrices, setLoadingMatrices] = useState<boolean>(false);
  const [loadingAreas, setLoadingAreas] = useState<boolean>(false);
  const [showDeleteLevelDialog, setShowDeleteLevelDialog] = useState(false);
  const [levelToDelete, setLevelToDelete] = useState<{ matrixId: string; nivel: number } | null>(null);
  const [usuarios, setUsuarios] = useState<UserModel[]>([]);
  const [nuevaEstrategia, setNuevaEstrategia] = useState<EstrategiaModel>({
    nombre: "",
    descripcion: "",
    requiere_cotizaciones: false,
    esta_activo: false
  });

  const handleSetAprobador = (user: UserModel) => {
    setNivelAprobador({
      usuario_aprobador_id: user.id_users ?? 0,
      aprobador: user.first_name + ' ' + user.first_last_name,
      puesto_aprobador: user.puesto_trabajo
    });
  };

  const fetchEstrategias = async () => {
      try {
          const data = await getEstrategias();
          setEstrategias(data);
      } catch (err: any) {
          if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
              localStorage.clear();
              setIsAuthenticated(false);
              return;
          }
          setError((err as Error).message);
      } finally {
          setLoadingEstrategias(false);
      }
  }

  const fetchMatrices = async () => {
    if(!selectedEstrategia?.id) {
      return;
    }
      
    try {
      setLoadingMatrices(true)
      const data = await getMatrizAprobacion(selectedEstrategia.id);
      setMatrices({
        matrices_solicitud: data.matrices_solicitud,
              matrices_orden: data.matrices_orden ?? []
          });
          
          setNivelAprobador(data.matrices_solicitud?.niveles?.[0] || null);
      } catch (err: any) {
          if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
              localStorage.clear();
              setIsAuthenticated(false);
              return;
          }
          setError((err as Error).message);
      } finally {
          setLoadingMatrices(false);
      }
  }

  const fetchAreas = async () => {
    if(!isCreating) {
      return;
    }

    try {
      setLoadingAreas(true);
      const data = await getAreasByDepartamento();
      setAreas(data);
    } catch (err: any) {
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

  useEffect(() => {
    fetchEstrategias();
  }, [])

  useEffect(() => {
    if(selectedEstrategia?.id) {
      fetchMatrices();
    }
  }, [selectedEstrategia])

  useEffect(() => {
    fetchAreas();
  }, [isCreating]);

  const handleCreateStrategy = async () => {
    if (!nuevaEstrategia?.nombre || !nuevaEstrategia.descripcion || !selectedArea) {
      alert("Por favor complete todos los campos requeridos");
      return;
    }

    try {
      const data = await createEstrategiaByArea(
        selectedArea.id_area,
        nuevaEstrategia
      );

      await fetchEstrategias();

      setSelectedEstrategia(data);
      setIsCreating(false);
      setIsEditing(true);

      setNuevaEstrategia({
        nombre: "",
        descripcion: "",
        requiere_cotizaciones: false,
        esta_activo: false
      });
    } catch (error: any) {
      alert(error.message || "Error al crear la estrategia");
    }
  };

  const handleAddPRMatrix = async () => {
    if(!selectedEstrategia?.id) return;

      try {
        await createMatrizAprobacionSolicitud({
          id_estrategia: selectedEstrategia.id,
          nombre: newMatrixName
        });

        await fetchMatrices();

        setEditingMatrix(null);
        setNewMatrixName("");
      } catch (err: any) {
        alert(err.message || "Error al crear la matriz de aprobación de solicitud de compra");
      }
    }

  const handleUpdateStrategy = async () => {
    if (!formEstrategia || !matrices.matrices_solicitud) return;

    try {
      const payload = {
        estrategia: {
          id: formEstrategia.id,
          nombre: formEstrategia.nombre,
          descripcion: formEstrategia.descripcion,
          esta_activo: !!formEstrategia.esta_activo,
          requiere_cotizaciones: !!formEstrategia.requiere_cotizaciones
        },
        matriz_solicitud: {
          id: matrices.matrices_solicitud.id,
          niveles: [
            {
              usuario_aprobador_id: nivelAprobador?.usuario_aprobador_id
            }
          ]
        }
      };

      const updated = await updateEstrategiaAdquisicion(payload);

      setSelectedEstrategia(updated);
      setFormEstrategia(updated);

      await fetchEstrategias();
      await fetchMatrices();

      setIsEditing(false);

      alert("Estrategia actualizada correctamente");

    } catch (error: any) {
      alert(error.message || "Error al actualizar la estrategia");
    }
  };

  const renderApprovalMatrix = ( matriz: MatrizAprobacionSolicitudModel | null, type: 'pr' | 'po' ) => {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {type === 'pr' ? (
              <FileText className="h-4 w-4 text-[#2183AE]" />
            ) : (
              <ShoppingCart className="h-4 w-4 text-[#2183AE]" />
            )}
            <h5 className="font-medium text-gray-900">{matriz?.nombre}</h5>
          </div>
          {type === 'po' && isEditing && (
            <Button
            //   onClick={() => handleDeletePOMatrix(matrix.id)}
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="space-y-2 mb-3">
          {nivelAprobador ? (
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[#2183AE] text-white rounded-full flex items-center justify-center text-xs font-bold">
                  1
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {nivelAprobador.aprobador}
                  </p>
                  <p className="text-xs text-gray-600">
                    {nivelAprobador.puesto_aprobador}
                  </p>
                </div>
              </div>
              {isEditing && (
                <Button
                onClick={handleRefreshAprobador}
                variant="ghost"
                size="sm"
                className="text-blue-600 hover:text-blue-700 p-0 w-8 h-8"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              No hay aprobador configurado
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleRefreshAprobador = async () => {
    if (!selectedEstrategia?.id) return;

    try {
      const data = await getJefeInmediatoByEstrategia(selectedEstrategia.id);

      if (!data) return;

      setNivelAprobador({
        usuario_aprobador_id: data.usuario_aprobador_id,
        aprobador: data.aprobador,
        puesto_aprobador: data.puesto_aprobador
      });

    } catch (error: any) {
      alert(error.message || "Error al obtener el jefe inmediato");
    }
  };

  return (
    <div className="py-1 sm:py-2 lg:py-0 px-2 sm:px-4">
      <div className="w-full max-w-7xl mx-auto">
        <div className="mb-2 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Combine className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-white mb-0 text-lg">Estrategias de Adquisición</h2>
              <p className="text-sm text-white/90">
                Gestiona las matrices de aprobación para solicitudes y órdenes de compra
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Estrategias</h3>
                <Button
                  onClick={() => setIsCreating(true)}
                  size="sm"
                  className=" border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                  title={hasActiveStrategy ? "Ya existe una estrategia activa" : "Crear nueva estrategia"}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs text-yellow-800 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Solo puede haber una estrategia activa por área
                </p>
              </div>
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {loadingEstrategias ? (
                  <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                    <Loader2 className="h-8 w-8 animate-spin text-[#2183AE] mb-2" />
                    <p className="text-sm font-medium">Cargando estrategias...</p>
                  </div>
                ) : (
                  estrategias.map((estrategia) => (
                    <motion.div
                    key={estrategia.id}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedEstrategia?.id === estrategia.id
                      ? 'border-[#2183AE] bg-[#2183AE]/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => {
                      setSelectedEstrategia(estrategia);
                      setFormEstrategia(estrategia);
                      setIsCreating(false);
                      setIsEditing(false);
                    }}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <h4 className="font-medium text-sm text-gray-900">
                          {estrategia.codigo} - {estrategia.nombre}
                        </h4>
                        {estrategia.esta_activo && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Activa
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 line-clamp-2">
                        {estrategia.descripcion}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">
                          {estrategia.requiere_cotizaciones
                          ? "Requiere cotización"
                          : "Sin cotización"}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
          <div className="lg:col-span-2">
            {isCreating ? (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Nueva Estrategia</h3>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm text-gray-700 mb-1.5 block">Nombre *</Label>
                    <Input
                    value={nuevaEstrategia?.nombre}
                    onChange={(e) => setNuevaEstrategia(prev => ({ ...prev, nombre: e.target.value }))}
                    placeholder="Nombre de la estrategia"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-700 mb-1.5 block">Descripción *</Label>
                    <Textarea
                    value={nuevaEstrategia.descripcion}
                    onChange={(e) =>
                      setNuevaEstrategia(prev => ({
                        ...prev,
                        descripcion: e.target.value
                      }))
                    }
                    placeholder="Descripción de la estrategia"
                    rows={3}
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-gray-700 mb-1.5 block">Área *</Label>
                    <select
                    value={selectedArea?.id_area || ""}
                    onChange={(e) => {
                      const [areaId, departamentoId, jefe, nombre, descripcion] = e.target.value.split('|');
                      setSelectedArea({
                        id_area: areaId,
                        departamento_id: departamentoId,
                        jefe_inmediato: jefe,
                        nombre: nombre,
                        descripcion: descripcion
                      });
                    }}
                    className="px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
                    >
                      <option value="|">Seleccionar área</option>
                      {areas.map(area => (
                        <option key={area.id_area} value={`${area.id_area}`}>
                          {area.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                    type="checkbox"
                    checked={nuevaEstrategia.requiere_cotizaciones}
                    onChange={(e) =>
                      setNuevaEstrategia(prev => ({
                        ...prev,
                        requiere_cotizaciones: e.target.checked
                      }))
                    }
                    />
                    <Label htmlFor="requiresQuote" className="text-sm text-gray-700 cursor-pointer">
                      Requiere cotización
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                    type="checkbox"
                    checked={nuevaEstrategia.esta_activo}
                    onChange={(e) =>
                      setNuevaEstrategia(prev => ({
                        ...prev,
                        esta_activo: e.target.checked
                      }))
                    }
                    disabled={hasActiveStrategy}
                    />
                    <Label htmlFor="isActive" className="text-sm text-gray-700 cursor-pointer">
                      Activar estrategia
                    </Label>
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
                      onClick={handleCreateStrategy}
                      className="flex-1 border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                    >
                      Crear Estrategia
                    </Button>
                  </div>
                </div>
              </div>
            ) : selectedEstrategia ? (
              <div className="space-y-4">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Información de la Estrategia</h3>
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
                        </>
                      ) : (
                        <>
                          <Button
                            onClick={() => {
                              setIsEditing(false);
                              setSelectedEstrategia(estrategias.find(s => s.id === selectedEstrategia.id) || selectedEstrategia);
                            }}
                            size="sm"
                            variant="outline"
                            className="border-gray-900 text-white bg-gray-900 hover:bg-white hover:text-gray-900"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Cancelar
                          </Button>
                          <Button
                            onClick={handleUpdateStrategy}
                            size="sm"
                            variant="outline"
                            className="border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
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
                          value={formEstrategia?.nombre || ""}
                          onChange={(e) =>
                            setFormEstrategia(prev =>
                              prev ? { ...prev, nombre: e.target.value } : prev
                            )
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-sm text-gray-700 mb-1.5 block">Descripción</Label>
                        <Textarea
                          value={formEstrategia?.descripcion || ""}
                          onChange={(e) =>
                            setFormEstrategia(prev =>
                              prev ? { ...prev, descripcion: e.target.value } : prev
                            )
                          }
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-requiresQuote"
                          checked={formEstrategia?.requiere_cotizaciones || false}
                          onChange={(e) =>
                            setFormEstrategia(prev =>
                              prev ? { ...prev, requiere_cotizaciones: e.target.checked } : prev)}
                          className="w-4 h-4 text-[#2183AE] border-gray-300 rounded focus:ring-[#2183AE]"
                        />
                        <Label htmlFor="edit-requiresQuote" className="text-sm text-gray-700 cursor-pointer">
                          Requiere cotización
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="edit-isActive"
                          checked={formEstrategia?.esta_activo || false}
                          onChange={(e) =>
                            setFormEstrategia(prev =>
                              prev ? { ...prev, esta_activo: e.target.checked } : prev
                            )
                          }
                          className="w-4 h-4 text-[#2183AE] border-gray-300 rounded focus:ring-[#2183AE]"
                          disabled={!selectedEstrategia.esta_activo}
                        />
                        <Label htmlFor="edit-isActive" className="text-sm text-gray-700 cursor-pointer">
                          Activar estrategia
                        </Label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs text-gray-600">Nombre</Label>
                        <p className="text-sm text-gray-900">{selectedEstrategia.nombre}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-600">Descripción</Label>
                        <p className="text-sm text-gray-900">{selectedEstrategia.descripcion}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${selectedEstrategia.requiere_cotizaciones ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <span className="text-sm text-gray-700">
                            {selectedEstrategia.requiere_cotizaciones ? "Requiere cotización" : "Sin cotización"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${selectedEstrategia.esta_activo ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          <span className="text-sm text-gray-700">
                            {selectedEstrategia.esta_activo ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-[#2183AE]" />
                      Matriz de Aprobación de Solicitud de Compra
                    </h3>
                    {isEditing&& (
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => setEditingMatrix({ type: 'pr' })}
                          size="sm"
                          className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Crear Matriz
                        </Button>
                      </div>
                    )}
                  </div>
                  {editingMatrix?.type === 'pr' ? (
                    <div className="border border-gray-200 rounded-lg p-4">
                      <Label className="text-sm text-gray-700 mb-2 block">Nombre de la Matriz</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newMatrixName}
                          onChange={(e) => setNewMatrixName(e.target.value)}
                          placeholder="Ej: Matriz Solicitud - Estándar"
                          className="flex-1"
                        />
                        <Button
                          onClick={handleAddPRMatrix}
                          size="sm"
                          className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                        >
                          Crear
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingMatrix(null);
                            setNewMatrixName("");
                          }}
                          size="sm"
                          variant="outline"
                          className="border border-gray-900 bg-gray-900 text-white hover:bg-white hover:text-gray-900"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : matrices.matrices_solicitud ? (
                    renderApprovalMatrix(matrices.matrices_solicitud, 'pr')
                  ) : loadingMatrices ? (
                    <div className="text-center py-8 text-gray-500">
                      <Loader2 className="h-12 w-12 mx-auto mb-2 opacity-30 animate-spin" />
                      <p className="text-sm">Cargando</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No hay matriz de aprobación configurada</p>
                    </div>
                  )}
                </div>

                {/* Matrices de Órdenes de Compra */}
                {/* <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-[#2183AE]" />
                      Matrices de Aprobación de Órdenes de Compra
                    </h3>
                    {isEditing && (
                      <Button
                        onClick={() => setEditingMatrix({ type: 'po' })}
                        size="sm"
                        className="bg-[#2183AE] text-white hover:bg-[#1a6a8f]"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Agregar Matriz
                      </Button>
                    )}
                  </div>

                  {editingMatrix?.type === 'po' && (
                    <div className="border border-gray-200 rounded-lg p-4 mb-4">
                      <Label className="text-sm text-gray-700 mb-2 block">Nombre de la Matriz</Label>
                      <div className="flex gap-2">
                        <Input
                          value={newMatrixName}
                          onChange={(e) => setNewMatrixName(e.target.value)}
                          placeholder="Ej: Matriz OC - Menor a Q10,000"
                          className="flex-1"
                        />
                        <Button
                          onClick={handleAddPOMatrix}
                          size="sm"
                          className="bg-[#2183AE] text-white hover:bg-[#1a6a8f]"
                        >
                          Crear
                        </Button>
                        <Button
                          onClick={() => {
                            setEditingMatrix(null);
                            setNewMatrixName("");
                          }}
                          size="sm"
                          variant="outline"
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {selectedEstrategia.purchaseOrderMatrices.length > 0 ? (
                      selectedEstrategia.purchaseOrderMatrices.map((matrix) => (
                        <div key={matrix.id}>
                          {renderApprovalMatrix(matrix, 'po')}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">No hay matrices de órdenes de compra configuradas</p>
                      </div>
                    )}
                  </div>
                </div> */}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 p-12 text-center">
                <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-gray-900 mb-2">Selecciona una estrategia</h3>
                <p className="text-gray-600 text-sm">
                  Selecciona una estrategia de la lista para ver y editar sus detalles
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}