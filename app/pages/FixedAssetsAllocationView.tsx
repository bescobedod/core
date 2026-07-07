import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from 'react';
import {
  ListCheck,
  CheckCircle,
  ShoppingBag,
  X,
  Edit3,
  Save,
  Loader2,
  Search
} from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Card } from "../ui/card";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { VwSolicitudCompra } from "../types/SolicitudModel";
import {
    getSolicitudCompraAF,
    getArticulosBySolicitud,
    updateArticulosCodes,
    verificarArticulosSAP
} from "../api/SolicitudApi";

interface FixedAssetsAllocationProps {
  onBack: () => void;
}

export function FixedAssetsAllocationView({ onBack } : FixedAssetsAllocationProps) {
  const [searchCodes, setSearchCodes] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<VwSolicitudCompra | null>(null);
  const [showTracking, setShowTracking] = useState(false);
  const [editingCodes, setEditingCodes] = useState(false);
  const [tempCodes, setTempCodes] = useState<{ [key: string]: string }>({});
  const [solicitudes, setSolicitudes] = useState<VwSolicitudCompra[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loadingSolicitudes, setLoadingSolicitudes] = useState<boolean>(false);
  const [loadingCodes, setLoadingCodes] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sapSuccessData, setSapSuccessData] = useState<{docNum: number, requisicion: string} | null>(null);
  const [validatedCodes, setValidatedCodes] = useState<Set<string>>(new Set());

  const fetchSolicitudes = async () => {
    try {
      setLoadingSolicitudes(true)
      const data = await getSolicitudCompraAF();
      setSolicitudes(data);
    } catch (err: any) {
      if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
        localStorage.clear();
        setIsAuthenticated(false);
        return;
      }
      setError((err as Error).message);
    } finally {
      setLoadingSolicitudes(false);
    }
  }

  const fetchArticulos = async (solicitud: VwSolicitudCompra) => {
    const solicitudId = solicitud.id;
    try {
      const articulos = await getArticulosBySolicitud(solicitud.id);
      if (solicitudId !== solicitud.id) return;
      setSelectedPurchase({
        ...solicitud,
        items: articulos
      });
    } catch (err) {
      console.error("Error cargando artículos: ", err);
      setError("No se pudieron obtener los aretículos de la solicitud");
    }
  }

  useEffect(() => {
    // fetchSolicitudes se ejecuta solamente cuando el usuario presiona Buscar
    // o al confirmar el modal de éxito de SAP.
  }, [])

  const handleStartEditingCodes = () => {
    if (!selectedPurchase?.items?.length) return;

    const codes: { [key: string]: string } = {};

    selectedPurchase.items.forEach((item) => {
      codes[item.id] =
        item.codigo_articulo === "--"
          ? ""
          : (item.codigo_articulo || "");
    });

    setTempCodes(codes);
    setValidatedCodes(new Set());
    setEditingCodes(true);
  };

  const handleSaveCodes = async () => {
    if (loadingCodes) return;
    if (!selectedPurchase) return;

    const hasEmptyCodes = selectedPurchase.items.some((item) => {
      return !tempCodes[item.id]?.trim();
    });

    if (hasEmptyCodes) {
      alert("Todos los items deben tener un código asignado");
      return;
    }

    const itemsToUpdate = selectedPurchase.items
    .filter(item => tempCodes[item.id]?.trim())
    .map(item => ({
      id: item.id,
      codigo_articulo: tempCodes[item.id]?.trim(),
      nombre_articulo: item.nombre_articulo,
      originalCode: item.codigo_articulo
    }));

    if (itemsToUpdate.length === 0) {
      setEditingCodes(false);
      return;
    }

    const allValidated =
      validatedCodes.size === selectedPurchase.items.length;

    if (!allValidated) {
      try {
        setLoadingCodes(true);

        const articulos = await verificarArticulosSAP(itemsToUpdate);
        const validatedSet = new Set<string>();

        const updatedItems = selectedPurchase.items.map((item) => {
          const sapItems = Array.isArray(articulos.items)
          ? articulos.items
          : [];

          const sapData = sapItems.find(
            (s: any) =>
              s.codigo_articulo === tempCodes[item.id]?.trim()
          );

          if (sapData) {
            validatedSet.add(item.id);

            return {
              ...item,
              codigo_articulo: sapData.codigo_articulo,
              nombre_articulo: sapData.nombre_articulo,
              esValidadoTemporal: true
            };
          }

          return {
            ...item,
            esValidadoTemporal: false
          };
        });

        setValidatedCodes(validatedSet);

        setSelectedPurchase({
          ...selectedPurchase,
          items: updatedItems
        });

        if (articulos.status === "incomplete") {

          alert(`Atención: ${articulos.message}`);
          return;
        }

        alert("Todos los códigos fueron validados correctamente en SAP.");
      } catch (err: any) {
        alert(
          err?.response?.data?.error ||
          err?.message ||
          "Error al validar artículos"
        );
      } finally {
        setLoadingCodes(false);
      }
      return;
    }

    try {
      setLoadingCodes(true);

      const response = await updateArticulosCodes(itemsToUpdate);

      setSapSuccessData({
        docNum: response.DocNum,
        requisicion: selectedPurchase.numero_requisicion
      });

      setEditingCodes(false);
      setValidatedCodes(new Set());
      setTempCodes({});
      setSelectedPurchase(null);
    } catch (err: any) {
    } finally {
      setLoadingCodes(false);
    }
  };

  const handleCancelEditingCodes = () => {
    setEditingCodes(false);
    setTempCodes({});
    setValidatedCodes(new Set());
  };

  const handleCodeChange = (itemId: string, value: string) => {
    setTempCodes((prev) => ({
      ...prev,
      [itemId]: value
    }));

    setValidatedCodes((prev) => {
      const updated = new Set(prev);
      updated.delete(itemId);
      return updated;
    });

    setSelectedPurchase((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                esValidadoTemporal: false
              }
            : item
        )
      };
    });
  };

  return (
    <div className="py-1 sm:py-2 lg:py-0 px-2 sm:px-4">
      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-2 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <ListCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-white mb-0 text-lg">Asignación de Artículos</h2>
              <p className="text-sm text-white/90">
                Consulta las solicitudes de compra y asigna su código de artículo de SAP
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
          <Button
            onClick={() => fetchSolicitudes()}
            className="mb-2 border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE] flex items-center gap-2"
            size="sm"
            >
              <Search className="h-3 w-3" />
              Buscar
            </Button>
          <div className="space-y-2">
            {loadingSolicitudes ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 animate-spin text-[#2183AE] mb-3" />
                <p className="text-gray-500 text-sm">Cargando solicitudes...</p>
              </div>
            ) : solicitudes.length === 0 ? (
              <Card className="p-12 text-center border-2 border-dashed border-gray-300">
                <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No se encontraron solicitudes aprobadas</p>
              </Card>
            ) : (
              solicitudes.map((purchase) => {
                return (
                  <div
                  key={purchase.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-[#2183AE] transition-colors cursor-pointer"
                  onClick={() => {
                    setValidatedCodes(new Set());
                    setTempCodes({});
                    setEditingCodes(false);
                    fetchArticulos(purchase);
                  }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">{purchase.numero_requisicion}</span>
                      </div>
                      <span className="text-xs text-gray-600">
                        {format(purchase.fecha_creacion, "dd/MM/yyyy", { locale: es })}
                      </span>
                    </div>
                    <div className="flex items-end justify-between pb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-medium text-gray-400 uppercase">
                          Solicitado Por
                        </span>
                        <span className="text-xs text-gray-600">
                          {purchase.solicitado_por}
                        </span>
                        {purchase.empresa && (
                          <span className="text-[11px] text-[#2183AE] font-semibold mt-0.5">
                            {purchase.empresa.nombre}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-600">
                          {purchase.items.length} {purchase.items.length === 1 ? "Artículo" : "Artículos"}
                        </span>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2 border">
                      <p className="text-gray-500 text-sm mb-1">Justificación</p>
                      <p className="text-gray-700">{purchase.justificacion}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      {selectedPurchase && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-gray-900 font-semibold">{selectedPurchase.numero_requisicion}</h3>
              </div>
              <Button
              onClick={() => {
                setSelectedPurchase(null);
                setEditingCodes(false);
                setValidatedCodes(new Set());
                setTempCodes({});
              }}
              variant="ghost"
              size="sm"
              className="text-gray-600"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600 text-xs">Usuario</p>
                  <p className="text-gray-900 font-medium">{selectedPurchase.solicitado_por}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-xs">Fecha</p>
                  <p className="text-gray-900 font-medium">
                    {format(selectedPurchase.fecha_creacion, "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-600">Artículos</p>
                  <p className="text-xl font-bold text-gray-900">{selectedPurchase.cantidad_articulos}</p>
                </div>
              </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900">Items de Activos Fijos</h4>
                    {!editingCodes && (
                      <Button
                      onClick={handleStartEditingCodes}
                      size="sm"
                      className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                      >
                        <Edit3 className="h-3 w-3 mr-1" />
                        Asignar Códigos
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    {selectedPurchase.items.map((item) => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{item.nombre_articulo}</p>
                            <p className="text-xs text-gray-600 mt-1">Cantidad: {Math.round(item.cantidad)}</p>
                          </div>
                        </div>
                        {editingCodes ? (
                          <div className="mt-2">
                            <div className="flex justify-between items-center mb-1">
                              <Label className="text-xs text-gray-700">Código de Artículo *</Label>
                              {item.esValidadoTemporal && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full animate-pulse font-medium border border-blue-200">
                                  Pendiente de guardar
                                </span>
                              )}
                            </div>
                            <Input
                            value={tempCodes[item.id] || ""}
                            onChange={(e) => {
                              handleCodeChange(item.id, e.target.value);
                            }}
                            placeholder="Ej: AF-2026-001"
                            className={`mt-1 h-8 text-sm transition-all ${
                              (item.codigo_articulo !== "--" &&
                              !item.esValidadoTemporal)
                              ? "bg-gray-100 border-gray-200" 
                              : "border-blue-300 ring-1 ring-blue-100"
                            }`}
                            />
                          </div>
                        ) : (
                          <div className="mt-2 space-y-1">
                            {item.codigo_articulo !== "--" && !item.esValidadoTemporal && (
                              <div className="bg-green-50 border border-green-200 rounded px-2 py-1 flex items-center justify-between">
                                <p className="text-xs text-green-800">
                                  <span className="font-medium">Código: </span>
                                  {item.codigo_articulo}
                                </p>
                                <CheckCircle className="h-3 w-3 text-green-600" />
                              </div>
                            )}
                            {item.esValidadoTemporal && (
                              <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1 flex items-center justify-between">
                                <p className="text-xs text-blue-800">
                                  <span className="font-medium">Validado: </span>
                                  {item.codigo_articulo}
                                </p>
                                <span className="text-[9px] font-bold text-blue-600 uppercase">Sin Guardar</span>
                              </div>
                            )}
                            {!item.esValidadoTemporal && item.codigo_articulo === "--" && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                                <p className="text-xs text-yellow-800">Pendiente de asignar código</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {editingCodes && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={handleSaveCodes}
                        className="flex-1 border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                        size="sm"
                        disabled={loadingCodes}
                      >
                        {loadingCodes ? (
                          "Procesando..."
                        ) : (
                          <>
                            {
                              validatedCodes.size === selectedPurchase.items.length
                                ? <CheckCircle className="h-3 w-3 mr-1" />
                                : <Save className="h-3 w-3 mr-1" />
                            }
                            {
                              validatedCodes.size === selectedPurchase.items.length
                                ? "Confirmar y Guardar"
                                : "Validar códigos en SAP"
                            }
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={handleCancelEditingCodes}
                        variant="outline"
                        size="sm"
                        className="border border-gray-900 bg-gray-900 text-white hover:bg-white hover:text-gray-900"
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-600 mb-1">Justificación</p>
                <p className="text-sm text-gray-900">{selectedPurchase.justificacion}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {sapSuccessData && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center border border-gray-100"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-12 w-12 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">¡Enviado a SAP!</h3>
              <p className="text-gray-600 mb-6">
                La solicitud <span className="font-bold text-gray-800">{sapSuccessData.requisicion}</span> ha sido procesada correctamente.
              </p>
              <div className="bg-gray-50 rounded-2xl p-4 mb-8 border border-gray-100">
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Número de Documento SAP</p>
                <p className="text-3xl font-black text-[#2183AE]">{sapSuccessData.docNum}</p>
              </div>
              <Button 
              onClick={async () => {
                setSapSuccessData(null);
                await fetchSolicitudes();
              }}
              className="w-full bg-gray-900 text-white hover:bg-gray-800 py-6 rounded-xl font-semibold text-lg"
              >
                Entendido
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}