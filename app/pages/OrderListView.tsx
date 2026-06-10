import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useCallback, useRef } from 'react';
import { MessageSquare, Clock, CheckCircle, XCircle, FileText, Calendar, User, Package, AlertCircle, Eye, Filter, X as XIcon, Check, Loader2, X, SearchX, Building2, ShoppingCart, DollarSign, Truck, CalendarArrowDown, CornerDownRight } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { VwAprobadoresSolicitudCompra } from "../types/SolicitudModel";
import { getAprobacionSolicitud } from "../api/SolicitudApi";
import { VwOrdenCompra, LineaOrdenCompraModel, VwAprobadoresOrdenCompra } from "../types/OrdenModel";
import { getOrdenesCompraByUser, getOrdenesCompra, getAprobacionOrden } from "../api/OrdenApi";
import { getPermiso } from "../api/MenuApi";
import { getProveedores } from "../api/SapApi";
import { ProveedorCombobox, type ProveedorState } from "./ProveedorCombobox";

interface ItemFormState {
  cantidad: number;
  precio_unitario: number;
  moneda: 'GTQ' | 'USD';
}

interface OrderListViewProps {
  onBack: () => void;
}

export function OrderListView({ onBack }: OrderListViewProps) {
  const [ordenes, setOrdenes] = useState<VwOrdenCompra[]>([]);
  const [selectedOrden, setSelectedOrden] = useState<VwOrdenCompra | null>(null);
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDIENTE" | "APROBADO" | "AUTO_APROBADO" | "APROBADO_COMPRAS">("all");
  const [dateFilterType, setDateFilterType] = useState<"all" | "single" | "range">("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAprobaciones, setLoadingAprobaciones] = useState(true);
  const [loadingOrden, setLoadingOrden] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showNoResultsModal, setShowNoResultsModal] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [aprobaciones, setAprobaciones] = useState<VwAprobadoresSolicitudCompra[]>([]);
  const [aprobacionesOrden, setAprobacionesOrden] = useState<VwAprobadoresOrdenCompra[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [permiso, setPermiso] = useState(true);
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [loadingDetalleId, setLoadingDetalleId] = useState<string | null>(null);

  const [proveedorOrden, setProveedorOrden] = useState<ProveedorState>({
    searchTerm: "",
    loading: false,
    lista: [],
    seleccionado: null,
  });

  const [itemsForm, setItemsForm] = useState<Record<string, ItemFormState>>({});

  const hasActiveFilters = statusFilter !== "all" || dateFilterType !== "all";

  // ── Al abrir el dialog resetea los estados del formulario de orden ───────────
  const initItemsForm = useCallback((items: LineaOrdenCompraModel[], ordenId: string) => {
    const initial: Record<string, ItemFormState> = {};
    items.forEach((item, idx) => {
      const key = `${ordenId}-${idx}`;
      initial[key] = {
        cantidad: Math.trunc(item.cantidad),
        precio_unitario: 0,
        moneda: 'GTQ',
      };
    });
    setItemsForm(initial);
  }, []);

  const handleProveedorOrdenChange = useCallback(
    (_key: string, patch: Partial<ProveedorState>) => {
      setProveedorOrden(prev => ({ ...prev, ...patch }));
    },
    []
  );

  const handleItemFormChange = useCallback(
    (key: string, field: keyof ItemFormState, value: string | number) => {
      setItemsForm(prev => ({
        ...prev,
        [key]: {
          ...prev[key],
          [field]: field === 'moneda' ? value : Number(value),
        },
      }));
    },
    []
  );

  const handleTokenExpired = useCallback(() => {
    localStorage.clear();
    setIsAuthenticated(false);
  }, []);

  const fetchSolicitudes = async (filters?: any) => {
    try {
      setLoading(true);
      const requestOrdenes = permiso ? getOrdenesCompra : getOrdenesCompraByUser;
      const response = await requestOrdenes(
        filters?.inicio,
        filters?.fin,
        filters?.estado,
        filters?.page || page,
        10
      );

      setOrdenes(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalRecords(response.pagination.total);

      setShowNoResultsModal(response.data.length === 0);
    } catch (err: any) {
      if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
        localStorage.clear();
        setIsAuthenticated(false);
        return;
      }
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const fetchAprobaciones = async (id_solicitud: string) => {
    try {
      const data = await getAprobacionSolicitud(id_solicitud);
      console.log(data)
      setAprobaciones(data);
    } catch (err: any) {
      if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
        localStorage.clear();
        setIsAuthenticated(false);
        return;
      }
      setError((err as Error).message);
    } finally {
      setLoadingAprobaciones(false);
    }
  };

  const fetchAprobacionesOrden = async (id_orden: string) => {
    try {
      setLoadingAprobaciones(true);
      const data = await getAprobacionOrden(id_orden);
      setAprobacionesOrden(data);
    } catch (err: any) {
      if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
        localStorage.clear();
        setIsAuthenticated(false);
        return;
      }
      setError((err as Error).message);
    } finally {
      setLoadingAprobaciones(false);
    }
  };

  const fetchPermiso = async () => {
    try {
      const data = await getPermiso();
      setPermiso(data);
    } catch (err: any) {
      if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
        localStorage.clear();
        setIsAuthenticated(false);
        return;
      }
      setError((err as Error).message);
    }
  };

  const handleOpenDetailDialog = async (orden: VwOrdenCompra) => {
    try {
      setLoadingDetalleId(orden.id);
      setSelectedOrden(orden);
      setProveedorOrden({ searchTerm: "", loading: false, lista: [], seleccionado: null });
      setArchivoExcel(null);
      initItemsForm(orden.items, orden.id);
      await fetchAprobaciones(orden.solicitud_id);
      await fetchAprobacionesOrden(orden.id);
      setShowDetailDialog(true);
    } catch (error) {
      alert(error);
    } finally {
      setLoadingDetalleId(null);
    }
  };

  // ── Calcular monto total en tiempo real ──────────────────────────────────────
  const calcularMontoTotal = (): number => {
    return Object.values(itemsForm).reduce((acc, item) => {
      return acc + (item.cantidad * item.precio_unitario);
    }, 0);
  };

  // ── Validar que el formulario esté completo antes de enviar ──────────────────
  const formularioValido = (): boolean => {
    if (!proveedorOrden.seleccionado) return false;
    if (!archivoExcel) return false;
    return Object.values(itemsForm).every(
      item => item.cantidad > 0 && item.precio_unitario > 0
    );
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPermiso();
  }, []);

  const handleClearFilters = () => {
    setStatusFilter("all");
    setDateFilterType("all");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
    setShowNoResultsModal(false);
  };

  const filteredRequests = ordenes.filter(req => {
    if (statusFilter === "all") return true;
    return req.estado === statusFilter;
  });

  const pendingRequests  = filteredRequests.filter(req => req.estado === "PENDIENTE");
  const reviewedRequests = filteredRequests.filter(req => req.estado !== "PENDIENTE");

  const handleSearch = async (newPage?: number) => {
    const targetPage = newPage ?? 1;
    setPage(targetPage);
    setShowNoResultsModal(false);

    await fetchSolicitudes({
      inicio: dateFilterType === "single" ? singleDate : startDate,
      fin:    dateFilterType === "range"  ? endDate    : null,
      estado: statusFilter,
      page:   targetPage,
    });

    setHasSearched(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDIENTE":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Pendiente
          </span>
        );
      case "APROBADO":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Aprobada
          </span>
        );
      case "RECHAZADO":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1">
            <X className="h-3 w-3" />
            Rechazado
          </span>
        );
      case "APROBADO_COMPRAS":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Aprobada por Compras
          </span>
        );
      default:
        return null;
    }
  };

  const toggleArticle = (key: string) => {
    setExpandedArticles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
  };

  const renderTracking = () => (
    <>
    
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-[#2183AE]" />
        Tracking de Aprobación Solicitud de Compra
      </h4>
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium text-gray-900">Solicitud Creada</p>
            <p className="text-xs text-gray-600">{format(aprobaciones[0].fecha_aprobacion, "dd/MM/yyyy HH:mm", { locale: es })}</p>
            <p className="text-xs text-gray-500 mt-1">Por {selectedOrden!.solicitado_por}</p>
          </div>
        </div>
        {aprobaciones.map((approver, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                approver.estado === "APROBADO" ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {approver.estado === "APROBADO" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : approver.estado === "DELEGADO" ? (
                    <CornerDownRight className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-400" />
                )}
              </div>
              {index < aprobaciones.length - 1 && (
                <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
              )}
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium text-gray-900">{approver.aprobador}</p>
              <p className="text-xs text-gray-600">{approver.puesto}</p>
              {approver.estado === "APROBADO" && approver.fecha_aprobacion ? (
                <div className="mt-2 text-xs">
                  <p className="text-green-600 font-medium">
                    ✓ Aprobado el {format(approver.fecha_aprobacion, "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                  {approver.comentarios && (
                    <p className="text-gray-600 mt-1 italic">"{approver.comentarios}"</p>
                  )}
                </div>
              ) : approver.estado === "RECHAZADO" && approver.fecha_aprobacion ? (
                <div className="mt-2 text-xs">
                  <p className="text-red-600 font-medium">
                    ✗ Denegado el {format(approver.fecha_aprobacion, "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                  {approver.comentarios && (
                    <p className="text-gray-600 mt-1 italic">"{approver.comentarios}"</p>
                  )}
                </div>
              ) : approver.estado === "DELEGADO" && approver.fecha_aprobacion ? (
                <div className="mt-2 text-xs">
                  <p className="text-green-600 font-medium">
                    Delegado el {format(approver.fecha_aprobacion, "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                  {approver.comentarios && (
                    <p className="text-gray-600 mt-1 italic">"{approver.comentarios}"</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Pendiente de aprobación</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <Clock className="h-4 w-4 text-[#2183AE]" />
        Tracking de Aprobación Orden de Compra
      </h4>
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
            <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
          </div>
          <div className="flex-1 pb-4">
            <p className="text-sm font-medium text-gray-900">Orden Creada</p>
            <p className="text-xs text-gray-600">{format(selectedOrden!.fecha_creacion, "dd/MM/yyyy HH:mm", { locale: es })}</p>
            <p className="text-xs text-gray-500 mt-1">Por {selectedOrden!.solicitado_por}</p>
          </div>
        </div>
        {aprobacionesOrden.map((approver, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                approver.estado === "APROBADO" ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {approver.estado === "APROBADO" ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-400" />
                )}
              </div>
              {index < aprobaciones.length - 1 && (
                <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
              )}
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm font-medium text-gray-900">{approver.puesto}</p>
              <p className="text-xs text-gray-600">{approver.aprobador}</p>
              {approver.estado === "APROBADO" && approver.fecha_aprobacion ? (
                <div className="mt-2 text-xs">
                  <p className="text-green-600 font-medium">
                    ✓ Aprobado el {format(approver.fecha_aprobacion, "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                  {approver.comentarios && (
                    <p className="text-gray-600 mt-1 italic">"{approver.comentarios}"</p>
                  )}
                </div>
              ) : approver.estado === "RECHAZADO" && approver.fecha_aprobacion ? (
                <div className="mt-2 text-xs">
                  <p className="text-red-600 font-medium">
                    ✗ Denegado el {format(approver.fecha_aprobacion, "dd/MM/yyyy HH:mm", { locale: es })}
                  </p>
                  {approver.comentarios && (
                    <p className="text-gray-600 mt-1 italic">"{approver.comentarios}"</p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-500 mt-1">Pendiente de aprobación</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
    </>
  );

  // ── Sección de proveedor único + resumen de monto ────────────────────────────
  const renderProveedorOrden = () => (
    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
        <Building2 className="h-4 w-4 text-[#2183AE]" />
        Proveedor de la Orden
        <span className="text-red-500">*</span>
      </h4>
      <p className="text-xs text-gray-500">
        Se asignará un único proveedor para todos los artículos de esta orden de compra.
      </p>
      <ProveedorCombobox
        itemKey="orden-proveedor"
        idEmpresa={selectedOrden!.id_empresa}
        state={proveedorOrden}
        onChange={handleProveedorOrdenChange}
        getProveedores={getProveedores}
        getToken={handleTokenExpired}
      />
    </div>
  );

  // ── Resumen financiero calculado en tiempo real ──────────────────────────────
  const renderResumenMonto = () => {
    const total = calcularMontoTotal();
    const todasConPrecio = Object.values(itemsForm).every(i => i.precio_unitario > 0);
    const monedas = [...new Set(Object.values(itemsForm).map(i => i.moneda))];
    const monedaMixta = monedas.length > 1;

    return (
      <div className={`rounded-xl p-4 border ${todasConPrecio ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">Monto Total Estimado</span>
          </div>
          <div className="text-right">
            {monedaMixta ? (
              <p className="text-xs text-amber-600 font-medium">Monedas mixtas — revisar</p>
            ) : (
              <p className={`text-lg font-bold ${todasConPrecio ? 'text-emerald-700' : 'text-gray-400'}`}>
                {monedas[0] ?? 'GTQ'} {total.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>
        {!todasConPrecio && (
          <p className="text-xs text-gray-500 mt-2">Completa los costos unitarios para ver el total</p>
        )}
      </div>
    );
  };

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-white mb-0">Órdenes de Compras</h2>
              <p className="text-sm text-white/90">
                Lleva el control de las órdenes de compra y visualiza el estado en el que se encuentran
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-md border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-gray-700 mb-1 font-medium">Total</p>
                        <p className="text-3xl font-bold text-gray-600">{ordenes?.length}</p>
                    </div>
                    <div className="w-14 h-14 bg-gray-200 rounded-xl flex items-center justify-center shadow-inner">
                        <AlertCircle className="h-7 w-7 text-gray-700" />
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md border border-blue-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-blue-700 mb-1 font-medium">Pendientes</p>
                        <p className="text-3xl font-bold text-blue-600">
                            {ordenes?.filter(r => r.estado === "PENDIENTE").length}
                        </p>
                    </div>
                    <div className="w-14 h-14 bg-blue-200 rounded-xl flex items-center justify-center shadow-inner">
                        <CheckCircle className="h-7 w-7 text-blue-700" />
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md border border-green-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-green-700 mb-1 font-medium">Aprobadas</p>
                        <p className="text-3xl font-bold text-green-600">
                            {ordenes?.filter(r => ["APROBADO", "AUTO_APROBADO", "APROBADO_COMPRAS"].includes(r.estado)).length}
                        </p>
                    </div>
                    <div className="w-14 h-14 bg-green-200 rounded-xl flex items-center justify-center shadow-inner">
                        <CheckCircle className="h-7 w-7 text-green-700" />
                    </div>
                </div>
            </div>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-md border border-red-200 p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-xs text-red-700 mb-1 font-medium">Rechazadas</p>
                        <p className="text-3xl font-bold text-red-600">
                            {ordenes?.filter(r => r.estado === "RECHAZADO").length}
                        </p>
                    </div>
                    <div className="w-14 h-14 bg-red-200 rounded-xl flex items-center justify-center shadow-inner">
                        <XCircle className="h-7 w-7 text-red-700" />
                    </div>
                </div>
            </div>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div>
                    <Label className="text-xs text-gray-700 mb-1.5 block">Estado</Label>
                    <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
                    >
                        <option value="all">Todas</option>
                        <option value="PENDIENTE">Pendientes</option>
                        <option value="APROBADO">Aprobadas</option>
                        <option value="RECHAZADO">Rechazadas</option>
                    </select>
                </div>
                <div>
                    <Label className="text-xs text-gray-700 mb-1.5 block">Tipo de Fecha</Label>
                    <select
                    value={dateFilterType}
                    onChange={(e) => {
                        const type = e.target.value as typeof dateFilterType;
                        setDateFilterType(type);
                        if (type === "all") {
                            setSingleDate(""); setStartDate(""); setEndDate("");
                        } else if (type === "single") {
                            setSingleDate(format(new Date(), "yyyy-MM-dd")); setStartDate(""); setEndDate("");
                        } else {
                            setSingleDate("");
                        }
                    }}
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
                    >
                        <option value="single">Una Fecha</option>
                        <option value="range">Rango de fechas</option>
                        <option value="all">Sin filtro de fecha</option>
                    </select>
                </div>
                <div>
                    <Label className="text-xs text-gray-700 mb-1.5 block">
                        {dateFilterType === "range" ? "Desde" : "Fecha"}
                    </Label>
                    <Input
                    type="date"
                    value={dateFilterType === "single" ? singleDate : startDate}
                    onChange={(e) => dateFilterType === "single" ? setSingleDate(e.target.value) : setStartDate(e.target.value)}
                    disabled={dateFilterType === "all"}
                    className="h-9 text-xs w-min"
                    />
                </div>
                <div>
                    <Label className="text-xs text-gray-700 mb-1.5 block">
                        {dateFilterType === "range" ? "Hasta" : ""}
                    </Label>
                    {dateFilterType === "range" && (
                        <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-9 text-xs w-min"
                        />
                    )}
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button
                onClick={() => handleSearch()}
                className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE] flex items-center gap-2"
                size="sm"
                disabled={
                    (dateFilterType === "range"  && (!startDate || !endDate)) ||
                    (dateFilterType === "single" && !singleDate)
                }
                >
                    <Filter className="h-3 w-3" />
                    Buscar
                </Button>
                {hasActiveFilters && (
                    <Button onClick={handleClearFilters} variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                        <XIcon className="h-3 w-3 mr-1" />
                        Limpiar
                    </Button>
                )}
                {statusFilter !== "all" && (
                    <span className="px-3 py-1.5 bg-[#2183AE]/10 text-[#2183AE] text-xs rounded-lg flex items-center gap-1">
                        {statusFilter === "PENDIENTE" && "Pendientes"}
                        {statusFilter === "APROBADO"  && "Aprobadas"}
                    </span>
                )}
                {dateFilterType === "single" && singleDate && (
                    <span className="px-3 py-1.5 bg-[#2183AE]/10 text-[#2183AE] text-xs rounded-lg flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {singleDate.split("-").reverse().join("/")}
                    </span>
                )}
                {dateFilterType === "range" && (startDate || endDate) && (
                    <span className="px-3 py-1.5 bg-[#2183AE]/10 text-[#2183AE] text-xs rounded-lg flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {startDate && format(new Date(startDate), "dd/MM/yyyy")}
                        {startDate && endDate && " - "}
                        {endDate && format(new Date(endDate), "dd/MM/yyyy")}
                    </span>
                )}
            </div>
        </div>
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center mb-8">
            <div className="w-16 h-16 bg-[#2183AE]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 text-[#2183AE] animate-spin" />
            </div>
            <h3 className="text-gray-900 mb-2">Buscando Órdenes</h3>
            <p className="text-gray-600 text-sm">Espera un Momento</p>
          </div>
        )}
        {!hasSearched && !loading && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center mb-8">
            <div className="w-16 h-16 bg-[#2183AE]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="h-8 w-8 text-[#2183AE]" />
            </div>
            <h3 className="text-gray-900 mb-2">Utiliza los filtros para buscar órdenes</h3>
            <p className="text-gray-600 text-sm">Selecciona los filtros deseados y presiona el botón "Buscar"</p>
          </div>
        )}

        {/* ── Órdenes Pendientes ───────────────────────────────────────────── */}
        {hasSearched && pendingRequests.length > 0 && !loading && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-yellow-500 rounded-full"></div>
              <h3 className="text-gray-900">Órdenes Pendientes</h3>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">
                {pendingRequests.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-4 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold">{request.numero_orden}</h4>
                      {getStatusBadge(request.estado)}
                    </div>
                    <div className="text-xs opacity-90">
                      <div className="flex items-center gap-1 mb-1"><User className="h-3 w-3" /><span>{request.solicitado_por}</span></div>
                      <div className="flex items-center gap-1 mb-1"><Building2 className="h-3 w-3" /><span>{request.empresa?.nombre}</span></div>
                      <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /><span>{format(request.fecha_creacion, "dd/MM/yyyy HH:mm", { locale: es })}</span></div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-1">Total de Artículos</p>
                      <p className="text-2xl font-bold text-gray-900">{request.items?.length ?? 0}</p>
                    </div>
                    <Button
                      onClick={() => handleOpenDetailDialog(request)}
                      variant="outline"
                      size="sm"
                      className="w-full border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                    >
                      {loadingDetalleId === request.id ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cargando...</>
                      ) : (
                        <><Eye className="h-3 w-3 mr-1" />Ver Detalle</>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {showNoResultsModal && (
            <motion.div
              key="no-results-modal"
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
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="h-12 w-12 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No se encontraron órdenes</h3>
                <p className="text-gray-600 mb-6">
                  No hay órdenes de compra que coincidan con los parámetros seleccionados.
                </p>
                <Button
                  onClick={() => setShowNoResultsModal(false)}
                  className="w-full bg-[#2183AE] text-white hover:bg-[#1a6a8f] py-4 rounded-xl font-semibold"
                >
                  Entendido
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {hasSearched && pendingRequests.length === 0 && reviewedRequests.length === 0 && !loading && !showNoResultsModal && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center mb-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SearchX className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-gray-900 mb-2">No se encontraron órdenes</h3>
            <p className="text-gray-600 text-sm">No hay órdenes que coincidan con los filtros seleccionados</p>
          </div>
        )}

        {/* ── Órdenes Revisadas ────────────────────────────────────────────── */}
        {hasSearched && reviewedRequests.length > 0 && !loading && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gray-500 rounded-full"></div>
              <h3 className="text-gray-900">Órdenes Revisadas</h3>
              <span className="px-2 py-0.5 bg-gray-100 text-gray-800 text-xs rounded-full font-medium">
                {reviewedRequests.length}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reviewedRequests.map((request, index) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.3 }}
                  className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow opacity-75"
                >
                  <div className="p-4 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-white">{request.numero_orden}</h4>
                      {getStatusBadge(request.estado)}
                    </div>
                    <div className="text-sm text-white">
                      <div className="flex items-center gap-1 mb-1"><User className="h-3 w-3" /><span>{request.solicitado_por}</span></div>
                      <div className="flex items-center gap-1 mb-1"><Building2 className="h-3 w-3" /><span>{request.empresa?.nombre}</span></div>
                      <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /><span>{format(request.fecha_creacion, "dd/MM/yyyy", { locale: es })}</span></div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-1">Total de Artículos</p>
                      <p className="text-2xl font-bold text-gray-900">{request.items?.length ?? 0}</p>
                    </div>
                    <Button
                      onClick={() => handleOpenDetailDialog(request)}
                      variant="outline"
                      size="sm"
                      className="w-full border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                    >
                      {loadingDetalleId === request.id ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cargando...</>
                      ) : (
                        <><Eye className="h-3 w-3 mr-1" />Ver Detalle</>
                      )}
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── Paginación ───────────────────────────────────────────────────────── */}
        {hasSearched && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button variant="outline" disabled={page === 1} onClick={() => handleSearch(page - 1)}>Anterior</Button>
            <div className="text-sm text-gray-600">Página <strong>{page}</strong> de <strong>{totalPages}</strong></div>
            <Button variant="outline" disabled={page === totalPages} onClick={() => handleSearch(page + 1)}>Siguiente</Button>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            Dialog detalle / iniciar orden de compra
        ══════════════════════════════════════════════════════════════════════ */}
        <Dialog
          open={showDetailDialog && !loadingAprobaciones}
          onOpenChange={(open) => {
            setShowDetailDialog(open);
            if (!open) {
              setArchivoExcel(null);
              setProveedorOrden({ searchTerm: "", loading: false, lista: [], seleccionado: null });
              setItemsForm({});
            }
          }}
        >
        <DialogContent className="!max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <div className="overflow-y-auto flex-1 px-6 pt-6 pb-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300">
              {selectedOrden && (
                  <>
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-3">
                        <FileText className="h-6 w-6 text-[#2183AE]" />
                        {selectedOrden.numero_orden} {getStatusBadge(selectedOrden.estado)}
                      </DialogTitle>
                      <DialogDescription asChild>
                        <div className="flex flex-col gap-2 mt-2">
                          <div className="flex items-center gap-2 text-sm"><User className="h-4 w-4" /><span><strong>Solicitado por:</strong> {selectedOrden.solicitado_por}</span></div>
                          <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4" /><span><strong>Empresa:</strong> {selectedOrden.empresa?.nombre}</span></div>
                          <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4" /><span><strong>Fecha de creación:</strong> {format(selectedOrden.fecha_creacion, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</span></div>
                          <div className="flex items-center gap-2 text-sm"><CalendarArrowDown className="h-4 w-4" /><span><strong>Fecha requerida:</strong> {format(selectedOrden.fecha_requerida, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</span></div>
                          <div className="flex items-center gap-2 text-sm"><Truck className="h-4 w-4" /><span><strong>Proveedor:</strong></span></div>
                          <div className="flex items-center gap-2 text-sm"><span>{selectedOrden.proveedor}</span></div>
                          {selectedOrden.sap_doc_num && (
                            <div className="flex items-center gap-2 text-sm"><Check className="h-4 w-4" /><span>Id de SAP: <strong>{selectedOrden.sap_doc_num}</strong></span></div>
                          )}
                          <div className="flex items-center gap-2 text-sm"><Building2 className="h-4 w-4" /><span><strong>Numero de Requisición:</strong> {selectedOrden.solicitud?.numero_requisicion}</span></div>
                        </div>
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <Package className="h-4 w-4 text-[#2183AE]" />
                          Artículos Solicitados ({selectedOrden.items?.length ?? 0})
                        </h4>
                        <div className="space-y-2">
                          {selectedOrden.items.map((item, idx) => {
                            const key = `${selectedOrden.id}-${idx}`;
                            const isOpen = expandedArticles.has(key);
                            return (
                              <div key={key} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
                                <div className="p-4 flex justify-between items-start cursor-pointer" onClick={() => toggleArticle(key)}>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">{item.nombre_articulo}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">Código: {item.codigo_articulo}</p>
                                    <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md bg-[#2183AE]/10 text-[#2183AE] text-xs font-medium">
                                      Cantidad: {Math.trunc(item.cantidad)}
                                    </div>
                                  </div>
                                  {parseFloat(item.total_linea) > 0 && (
                                  <div className="text-right mr-3">
                                    <p className="text-xs text-gray-400 mb-0.5">Subtotal</p>
                                    <p className="text-sm font-bold text-emerald-600 whitespace-nowrap">
                                      {selectedOrden.moneda} {parseFloat(item.total_linea).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                    </p>
                                  </div>
                                )}
                                  <div className="text-xs text-gray-500">{isOpen ? "▲" : "▼"}</div>
                                </div>
                                <AnimatePresence initial={false}>
                                  {isOpen && (
                                    <motion.div
                                      key="content"
                                      initial={{ height: 0, opacity: 0, clipPath: "inset(0 0 100% 0)" }}
                                      animate={{ height: "auto", opacity: 1, clipPath: "inset(0 0 0% 0)" }}
                                      exit={{ height: 0, opacity: 0, clipPath: "inset(0 0 100% 0)" }}
                                      transition={{ duration: 0.35, ease: "easeInOut" }}
                                      className="px-4 pb-4"
                                    >
                                        <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 pt-2">
                                            <div>
                                              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-1">Precio Unitario</p>
                                              <p className="font-semibold text-gray-800">
                                                {selectedOrden.moneda} {parseFloat(item.precio_unitario).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                              </p>
                                            </div>
                                            <div>
                                              <p className="text-[11px] text-gray-400 font-medium uppercase tracking-wide mb-1">Total Línea</p>
                                              <p className="font-bold text-emerald-600">
                                                {selectedOrden.moneda} {parseFloat(item.total_linea).toLocaleString('es-GT', { minimumFractionDigits: 2 })}
                                              </p>
                                            </div>
                                        </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })}
                        </div>
                    </div>
                    {selectedOrden.monto_total > 0 && (
                      <div className="flex items-center justify-between bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl px-5 py-4 shadow-md">
                        <div className="flex items-center gap-2 text-white">
                          <DollarSign className="h-5 w-5 opacity-80" />
                          <span className="text-sm font-semibold">Monto Total de la Orden</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-extrabold text-white tracking-tight">
                            {selectedOrden.moneda}{" "}
                            {selectedOrden.monto_total.toLocaleString("es-GT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    )}
                      {!loadingAprobaciones && renderTracking()}
                    </div>
                  </>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}