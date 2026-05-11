import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from 'react';
import { MessageSquare, Clock, CheckCircle, XCircle, FileText, Calendar, User, Package, AlertCircle, Eye, Filter, X as XIcon, Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { VwSolicitudCompra, VwAprobadoresSolicitudCompra } from "../types/SolicitudModel";
import { getSolicitudesCompraByUser, getSolicitudesCompra, getAprobacionSolicitud } from "../api/SolicitudApi";
import { getPermiso } from "../api/MenuApi";

interface PurchasesProps {
  onBack: () => void;
}

export function PurchasesView({ onBack } : PurchasesProps ) {
  const [solicitudes, setSolicitudes] = useState<VwSolicitudCompra[]>([]);
  const [selectedSolicitud, setSelectedSolicitud] = useState<VwSolicitudCompra | null>(null);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDIENTE" | "APROBADO" | "AUTO_APROBADO" | "APROBADO_COMPRAS">("all");
  const [dateFilterType, setDateFilterType] = useState<"all" | "single" | "range">("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingAprobaciones, setLoadingAprobaciones] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [aprobaciones, setAprobaciones] = useState<VwAprobadoresSolicitudCompra[]>([])
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [permiso, setPermiso] = useState(false);

  const fetchSolicitudes = async (filters?: any) => {
    try {
      const requestSolicitudes = permiso ? getSolicitudesCompra : getSolicitudesCompraByUser;
      const response = await requestSolicitudes(
        filters?.inicio,
        filters?.fin,
        filters?.estado,
        filters?.page || page,
        20
      );
      
      setSolicitudes(response.data);
      setTotalPages(response.pagination.totalPages);
      setTotalRecords(response.pagination.total);

      if (response.data.length === 0) {
        alert("No se encontraron solicitudes con los parámetros seleccionados");
      }

    } catch (err: any) {
      if (
        ['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED']
        .includes(err?.message)
      ) {
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
      setLoadingAprobaciones(true);

      const data = await getAprobacionSolicitud(id_solicitud);
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
  }

  const fetchPermiso = async () => {
    try {
      const data = await getPermiso();
      setPermiso(data);
      console.log(data)
    } catch (err: any) {
      if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
        localStorage.clear();
        setIsAuthenticated(false);
        return;
      }
      setError((err as Error).message);
    }
  }

  const handleOpenDetailDialog = (solicitud: VwSolicitudCompra) => {
    setSelectedSolicitud(solicitud);
    fetchAprobaciones(solicitud.id)
    setShowDetailDialog(true);
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchPermiso()
  }, []);

  const handleClearFilters = () => {
    setStatusFilter("all");
    setDateFilterType("all");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = statusFilter !== "all" || dateFilterType !== "all";
  const filteredRequests = solicitudes.filter(req => {
  if (statusFilter === "all") return true;
  return req.estado === statusFilter;
});

const pendingRequests = filteredRequests.filter(req => req.estado === "PENDIENTE");

const reviewedRequests = filteredRequests.filter(req => 
  req.estado !== "PENDIENTE"
);
  
  const handleSearch = async (newPage?: number) => {

    const targetPage = newPage ?? 1;

    setPage(targetPage);

    const estadoFiltro =
      permiso && statusFilter === "all"
        ? ["APROBADO", "APROBADO_COMPRAS"]
        : statusFilter;

    await fetchSolicitudes({
      inicio: dateFilterType === "single" ? singleDate : startDate,
      fin: dateFilterType === "range" ? endDate : null,
      estado: estadoFiltro,
      page: targetPage
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
      case "AUTO_APROBADO":
        return (
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Auto Aprobada
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

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-white mb-0">Solicitudes de Compras</h2>
              <p className="text-sm text-white/90">
                Lleva el control de tus solicitudes de compra y visualiza el estado en el que se encuentran
              </p>
            </div>
          </div>
        </div>
        {!permiso && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-md border border-gray-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-700 mb-1 font-medium">En Proceso</p>
                <p className="text-3xl font-bold text-gray-600">
                  {solicitudes?.filter(r => r.estado === "PENDIENTE").length}
                </p>
              </div>
              <div className="w-14 h-14 bg-gray-200 rounded-xl flex items-center justify-center shadow-inner">
                <AlertCircle className="h-7 w-7 text-gray-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md border border-green-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-green-700 mb-1 font-medium">Aprobadas</p>
                <p className="text-3xl font-bold text-green-600">
                  {solicitudes?.filter(r => ["APROBADO", "AUTO_APROBADO", "APROBADO_COMPRAS"].includes(r.estado)).length}
                </p>
              </div>
              <div className="w-14 h-14 bg-green-200 rounded-xl flex items-center justify-center shadow-inner">
                <CheckCircle className="h-7 w-7 text-green-700" />
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-md border border-red-200 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-red-700 mb-1 font-medium">Rechazadas</p>
                <p className="text-3xl font-bold text-red-600">
                  {solicitudes?.filter(r => r.estado === "RECHAZADO").length}
                </p>
              </div>
              <div className="w-14 h-14 bg-red-200 rounded-xl flex items-center justify-center shadow-inner">
                <XCircle className="h-7 w-7 text-red-700" />
              </div>
            </div>
          </div>
        </div>
        )}
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
                {!permiso && (
                  <>
                    <option value="PENDIENTE">Pendientes</option>
                  </>
                )}
                <option value="APROBADO">Aprobadas</option>
                <option value="APROBADO_COMPRAS">Aprobadas por Compras</option>
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
                  setSingleDate("");
                  setStartDate("");
                  setEndDate("");
                } else if (type === "single") {
                  setSingleDate(format(new Date(), "yyyy-MM-dd"));
                  setStartDate("");
                  setEndDate("");
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
              onChange={(e) => {
                  if (dateFilterType === "single") {
                      setSingleDate(e.target.value);
                  } else {
                      setStartDate(e.target.value);
                  }
              }}
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
            >
              <Filter className="h-3 w-3" />
              Buscar
            </Button>
            {hasActiveFilters && (
              <Button
              onClick={handleClearFilters}
              variant="outline"
              size="sm"
              className="border-gray-300 text-gray-700 hover:bg-gray-100"
              >
                <XIcon className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}
            {statusFilter !== "all" && (
              <span className="px-3 py-1.5 bg-[#2183AE]/10 text-[#2183AE] text-xs rounded-lg flex items-center gap-1">
                {statusFilter === "PENDIENTE" && "Pendientes"}
                {statusFilter === "APROBADO" && "Aprobadas"}
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
        {filteredRequests?.length !== solicitudes?.length && statusFilter === "all" && (
          <div className="mb-4 px-2">
            <p className="text-sm text-gray-600">
              Mostrando
              <span className="font-bold text-gray-900">{filteredRequests?.length}</span> de{" "}
              <span className="font-bold text-gray-900">{solicitudes?.length}</span> solicitudes
            </p>
          </div>
        )}
        {!hasSearched && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center mb-8">
            <div className="w-16 h-16 bg-[#2183AE]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="h-8 w-8 text-[#2183AE]" />
            </div>
            <h3 className="text-gray-900 mb-2">Utiliza los filtros para buscar solicitudes</h3>
            <p className="text-gray-600 text-sm">
              Selecciona los filtros deseados y presiona el botón "Buscar"
            </p>
          </div>
        )}
        {hasSearched && pendingRequests.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-yellow-500 rounded-full"></div>
              <h3 className="text-gray-900">Solicitudes Pendientes</h3>
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
                      <h4 className="font-bold">{request.numero_requisicion}</h4>
                      {getStatusBadge(request.estado)}
                    </div>
                    <div className="text-xs opacity-90">
                      <div className="flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" />
                        <span>{request.solicitado_por}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(request.fecha_creacion, "dd/MM/yyyy HH:mm", { locale: es })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-1">Total de Artículos</p>
                      <p className="text-2xl font-bold text-gray-900">{request.items?.length ?? 0}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleOpenDetailDialog(request)}
                        variant="outline"
                        size="sm"
                        className="flex-1 border-[#2183AE] text-[#2183AE] hover:bg-[#2183AE]/10"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Ver Detalle
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        {hasSearched && pendingRequests.length === 0 && reviewedRequests.length === 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center mb-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-gray-900 mb-2">No se encontraron solicitudes</h3>
            <p className="text-gray-600 text-sm">
              No hay solicitudes que coincidan con los filtros seleccionados
            </p>
          </div>
        )}
        {hasSearched && reviewedRequests.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-gray-500 rounded-full"></div>
              <h3 className="text-gray-900">Solicitudes Revisadas</h3>
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
                      <h4 className="font-bold text-white">{request.numero_requisicion}</h4>
                      {getStatusBadge(request.estado)}
                    </div>
                    <div className="text-sm text-white">
                      <div className="flex items-center gap-1 mb-1">
                        <User className="h-3 w-3" />
                        <span>{request.solicitado_por}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(request.fecha_creacion, "dd/MM/yyyy", { locale: es })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-4">
                      <p className="text-xs text-gray-600 mb-1">Total de Artículos</p>
                      <p className="text-2xl font-bold text-gray-900">{request.cantidad_articulos}</p>
                    </div>
                    <Button
                      onClick={() => handleOpenDetailDialog(request)}
                      variant="outline"
                      size="sm"
                      className="w-full border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver Detalle
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
        {hasSearched && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">

            <Button
              variant="outline"
              disabled={page === 1}
              onClick={() => handleSearch(page - 1)}
            >
              Anterior
            </Button>

            <div className="text-sm text-gray-600">
              Página <strong>{page}</strong> de <strong>{totalPages}</strong>
            </div>

            <Button
              variant="outline"
              disabled={page === totalPages}
              onClick={() => handleSearch(page + 1)}
            >
              Siguiente
            </Button>

          </div>
        )}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="!max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedSolicitud && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="flex items-center gap-3">
                      <FileText className="h-6 w-6 text-[#2183AE]" />
                      {selectedSolicitud.numero_requisicion} {getStatusBadge(selectedSolicitud.estado)}
                    </DialogTitle>
                  </div>
                  <DialogDescription asChild>
                    <div className="flex flex-col gap-2 mt-2">
                        <div className="flex items-center gap-2 text-sm">
                            <User className="h-4 w-4" />
                            <span>Solicitado por: <strong>{selectedSolicitud.solicitado_por}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span>
                                {format(selectedSolicitud.fecha_creacion, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                            </span>
                        </div>
                        {selectedSolicitud.DocNum && (
                          <div className="flex items-center gap-2 text-sm">
                            <Check className="h-4 w-4" />
                            <span>Id de SAP: <strong>{selectedSolicitud.DocNum}</strong></span>
                          </div>
                        )}
                    </div>
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#2183AE]" />
                      Justificación de la Solicitud
                    </h4>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                      {selectedSolicitud.justificacion}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Package className="h-4 w-4 text-[#2183AE]" />
                      Artículos Solicitados ({selectedSolicitud.items?.length ?? 0})
                    </h4>
                    <div className="space-y-2">
                      {selectedSolicitud.items.map((item, idx) => {
                        const key = `${selectedSolicitud.id}-${idx}`;
                        const isOpen = expandedArticles.has(key);

                        return (
                          <div
                            key={key}
                            className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden"
                          >
                            <div
                            className="p-4 flex justify-between items-start cursor-pointer"
                            onClick={() => toggleArticle(key)}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900">
                                  {item.nombre_articulo}
                                </p>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Código: {item.codigo_articulo}
                                </p>
                                <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md bg-[#2183AE]/10 text-[#2183AE] text-xs font-medium">
                                  Cantidad: {Math.trunc(item.cantidad)}
                                </div>
                              </div>
                              <div className="text-xs text-gray-500">
                                {isOpen ? "▲" : "▼"}
                              </div>
                            </div>
                            <AnimatePresence initial={false}>
                              {isOpen && (
                                <motion.div
                                key="content"
                                initial={{
                                  height: 0,
                                  opacity: 0,
                                  clipPath: "inset(0 0 100% 0)"
                                }}
                                animate={{
                                  height: "auto",
                                  opacity: 1,
                                  clipPath: "inset(0 0 0% 0)"
                                }}
                                exit={{
                                  height: 0,
                                  opacity: 0,
                                  clipPath: "inset(0 0 100% 0)"
                                }}
                                transition={{ duration: 0.35, ease: "easeInOut" }}
                                className="px-4 pb-4"
                                >
                                  {item.notas && (
                                    <div className="mt-4 border-t pt-3">
                                      <div className="flex items-start gap-2">
                                        <MessageSquare className="h-4 w-4 text-[#2183AE] mt-0.5" />
                                        <div className="flex-1">
                                          <p className="text-xs font-semibold text-gray-700 mb-1">
                                            Comentarios / Especificaciones
                                          </p>
                                          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                                            <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                              {item.notas}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  {item.imagen_nombre && (
                                    <div className="mt-4 border-t pt-3">
                                      <p className="text-xs font-semibold text-gray-700 mb-2">
                                        Imagen de Referencia
                                      </p>
                                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                                        <img
                                          src={item.imagen_s3_key}
                                          alt={item.imagen_nombre || item.nombre_articulo}
                                          className="w-full max-h-72 object-contain bg-white"
                                        />
                                      </div>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4 text-[#2183AE]" />
                      Tracking de Aprobación
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
                          <p className="text-xs text-gray-600">{format(selectedSolicitud.fecha_creacion, "dd/MM/yyyy HH:mm", { locale: es })}</p>
                          <p className="text-xs text-gray-500 mt-1">Por {selectedSolicitud.solicitado_por}</p>
                        </div>
                      </div>
                      {aprobaciones.map((approver, index) => (
                        <div key={index} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              approver.estado === "APROBADO"
                                ? 'bg-green-100'
                                : 'bg-gray-100'
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
                              <>
                                <div className="mt-2 text-xs">
                                  <p className="text-green-600 font-medium">
                                    ✓ Aprobado el {format(approver.fecha_aprobacion, "dd/MM/yyyy HH:mm", { locale: es })}
                                  </p>
                                  {approver.comentarios && (
                                    <p className="text-gray-600 mt-1 italic">
                                      "{approver.comentarios}"
                                    </p>
                                  )}
                                </div>
                              </>
                            ) : approver.estado === "RECHAZADO" && approver.fecha_aprobacion ? (
                              <>
                                <div className="mt-2 text-xs">
                                  <p className="text-red-600 font-medium">
                                    ✗ Denegado el {format(approver.fecha_aprobacion, "dd/MM/yyyy HH:mm", { locale: es })}
                                  </p>
                                  {approver.comentarios && (
                                    <p className="text-gray-600 mt-1 italic">
                                      "{approver.comentarios}"
                                    </p>
                                  )}
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-gray-500 mt-1">Pendiente de aprobación</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}