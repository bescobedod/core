import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import { createPortal } from "react-dom";
import {
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  Calendar,
  User,
  Package,
  AlertCircle,
  Eye,
  Filter,
  X as XIcon,
  Check,
  Loader2,
  X,
  Search,
  Building2,
  ShoppingCart,
  Plus,
  Calculator,
  CalendarArrowDown
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { VwSolicitudCompra, VwAprobadoresSolicitudCompra, LineaSolicitudCompraModel } from "../types/SolicitudModel";
import { getSolicitudesCompraByUser, getSolicitudesCompra, getAprobacionSolicitud } from "../api/SolicitudApi";
import { crearOrdenCompra } from "../api/OrdenApi";
import { getPermiso } from "../api/MenuApi";
import { getProveedores } from "../api/SapApi";
import { ProveedorCombobox, type ProveedorState } from "./ProveedorCombobox";

interface ProveedorLineaState {
  id: string;
  proveedorState: ProveedorState;
  cantidad: number;
  precio_unitario: number;
  moneda: 'GTQ' | 'USD';
  esSeleccionada: boolean;
  imagen: File | null;
}

interface PurchasesProps {
  onBack: () => void;
}

type ItemsAction =
  | { type: 'INIT'; payload: Record<string, ProveedorLineaState[]> }
  | { type: 'ADD_LINEA'; itemKey: string; linea: ProveedorLineaState }
  | { type: 'REMOVE_LINEA'; itemKey: string; lineaId: string }
  | { type: 'UPDATE_FIELD'; itemKey: string; lineaId: string; field: keyof Omit<ProveedorLineaState, 'id' | 'proveedorState'>; value: string | number }
  | { type: 'UPDATE_PROVEEDOR'; itemKey: string; lineaId: string; patch: Partial<ProveedorState> }
  | { type: 'SELECCIONAR'; itemKey: string; lineaId: string }
  | { type: 'SET_IMAGEN'; itemKey: string; lineaId: string; file: File | null };

function itemsReducer( state: Record<string, ProveedorLineaState[]>, action: ItemsAction ): Record<string, ProveedorLineaState[]> {
  switch (action.type) {
    case 'INIT':
      return action.payload;
    case 'ADD_LINEA':
      return { ...state, [action.itemKey]: [...(state[action.itemKey] ?? []), action.linea] };
    case 'REMOVE_LINEA': {
      const lineas = (state[action.itemKey] ?? []).filter(l => l.id !== action.lineaId);
      const algunaSeleccionada = lineas.some(l => l.esSeleccionada);
      return {
        ...state,
        [action.itemKey]: algunaSeleccionada
          ? lineas
          : lineas.map((l, i) => ({ ...l, esSeleccionada: i === 0 })),
      };
    }
    case 'UPDATE_FIELD':
      return {
        ...state,
        [action.itemKey]: (state[action.itemKey] ?? []).map(l =>
          l.id === action.lineaId
            ? { ...l, [action.field]: action.field === 'moneda' ? action.value : Number(action.value) }
            : l
        ),
      };
    case 'UPDATE_PROVEEDOR':
      return {
        ...state,
        [action.itemKey]: (state[action.itemKey] ?? []).map(l =>
          l.id === action.lineaId
            ? { ...l, proveedorState: { ...l.proveedorState, ...action.patch } }
            : l
        ),
      };
    case 'SELECCIONAR':
      return {
        ...state,
        [action.itemKey]: (state[action.itemKey] ?? []).map(l => ({
          ...l,
          esSeleccionada: l.id === action.lineaId,
        })),
      };

    case 'SET_IMAGEN':
      return {
        ...state,
        [action.itemKey]: (state[action.itemKey] ?? []).map(l =>
          l.id === action.lineaId ? { ...l, imagen: action.file } : l
        ),
      };
    default:
      return state;
  }
}

function ImagenProveedorInput({ imagen, onChange }: {
  imagen: File | null;
  onChange: (file: File | null) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mostrarGrande, setMostrarGrande] = useState(false);

  useEffect(() => {
    if (!imagen) {
      setPreviewUrl(null);
      setMostrarGrande(false);
      return;
    }
    const url = URL.createObjectURL(imagen);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [imagen]);

  return (
    <div>
      <Label className="text-[11px] font-medium text-gray-600 mb-1 block">
        Imagen de referencia (opcional)
      </Label>
      {imagen && previewUrl ? (
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-md p-2">
          <button
          type="button"
          onClick={() => setMostrarGrande(true)}
          className="shrink-0 rounded-md overflow-hidden border border-gray-200 hover:border-[#2183AE] transition-colors"
          >
            <img
            src={previewUrl}
            alt={imagen.name}
            className="w-10 h-10 object-cover"
            />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-gray-700 truncate">{imagen.name}</p>
            <p className="text-[10px] text-gray-400">{(imagen.size / 1024).toFixed(1)} KB</p>
          </div>
          <button
          type="button"
          onClick={() => onChange(null)}
          className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 h-8 text-xs text-gray-500 border border-dashed border-gray-300 rounded-md cursor-pointer hover:border-[#2183AE] hover:text-[#2183AE] transition-colors">
          <Plus className="h-3 w-3" />
          Agregar imagen
          <input
          type="file"
          accept="image/jpeg,image/jpg,image/png"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            onChange(file);
            e.target.value = '';
          }}
          />
        </label>
      )}
      <AnimatePresence>
        {mostrarGrande && previewUrl && (
          <motion.div
          key="lightbox-backdrop"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setMostrarGrande(false)}
          >
            <motion.div
            key="lightbox-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative max-w-3xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
            >
              <img
              src={previewUrl}
              alt={imagen?.name}
              className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain"
              />
              <button
              type="button"
              onClick={() => setMostrarGrande(false)}
              className="absolute -top-3 -right-3 w-8 h-8 flex items-center justify-center rounded-full bg-white text-gray-600 hover:text-red-500 shadow-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
              {imagen && (
                <p className="text-center text-white/80 text-xs mt-2">{imagen.name}</p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface LineaArticuloOrdenProps {
  item: LineaSolicitudCompraModel;
  itemKey: string;
  lineas: ProveedorLineaState[];
  isOpen: boolean;
  calculo: { total: number; monedas: string[] } | null;
  idEmpresa: string;
  mostrarCotizacion: boolean;
  onToggle: (key: string) => void;
  onSeleccionarLinea: (itemKey: string, lineaId: string) => void;
  onRemoveLinea: (itemKey: string, lineaId: string) => void;
  onAddLinea: (itemKey: string) => void;
  onLineaFieldChange: (itemKey: string, lineaId: string, field: keyof Omit<ProveedorLineaState, 'id' | 'proveedorState'>, value: string | number) => void;
  onProveedorChange: (itemKey: string, lineaId: string, patch: Partial<ProveedorState>) => void;
  onImagenChange: (itemKey: string, lineaId: string, file: File | null) => void;
  onTokenExpired: () => void;
}

const LineaArticuloOrden = React.memo(({
  item, itemKey, lineas, isOpen, calculo, idEmpresa, mostrarCotizacion,
  onToggle, onSeleccionarLinea, onRemoveLinea, onAddLinea,
  onLineaFieldChange, onProveedorChange, onImagenChange, onTokenExpired,
}: LineaArticuloOrdenProps) => {
  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm">
      <div
      className="p-4 flex justify-between items-start cursor-pointer hover:bg-gray-50/50 transition-colors"
      onClick={() => onToggle(itemKey)}
      >
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">{item.nombre_articulo}</p>
          <p className="text-xs text-gray-500 mt-0.5">Artículo solicitado: {item.descripcion}</p>
          <p className="text-xs text-gray-500 mt-0.5">Código: {item.codigo_articulo}</p>
          <div className="mt-2 inline-flex items-center px-2 py-1 rounded-md bg-[#2183AE]/10 text-[#2183AE] text-xs font-medium">
            Cantidad solicitada: {Math.trunc(item.cantidad)}
          </div>
        </div>
        <div className="text-xs text-gray-500 ml-2">{isOpen ? '▲' : '▼'}</div>
      </div>
      {mostrarCotizacion && (
        <div className="border-t border-gray-100 bg-gray-50/40 px-4 pb-4 pt-3 space-y-3">
          <p className="text-xs text-gray-500">
            Proveedores cotizados — cada fila es una cotización independiente
          </p>
          {lineas.map((linea, lineaIdx) => {
            const subtotal = linea.cantidad * linea.precio_unitario;
            return (
              <div key={linea.id} className="bg-white border border-gray-200 rounded-xl p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <button
                  type="button"
                  onClick={() => onSeleccionarLinea(itemKey, linea.id)}
                  className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    linea.esSeleccionada
                      ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 bg-white text-gray-400 hover:border-[#2183AE]/50 hover:text-[#2183AE]'
                  }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      linea.esSeleccionada ? 'border-emerald-500' : 'border-gray-300'
                    }`}>
                      {linea.esSeleccionada && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </div>
                    {linea.esSeleccionada ? 'Cotización principal' : `Cotización #${lineaIdx + 1}`}
                  </button>
                  {lineas.length > 1 && (
                    <button
                    type="button"
                    onClick={() => onRemoveLinea(itemKey, linea.id)}
                    className="w-6 h-6 flex items-center justify-center rounded-md border border-gray-200 text-gray-400 hover:border-red-200 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div>
                  <Label className="text-[11px] font-medium text-gray-600 mb-1 block" />
                  <ProveedorCombobox
                  itemKey={`${itemKey}-${linea.id}`}
                  idEmpresa={idEmpresa}
                  state={linea.proveedorState}
                  onChange={(_k, patch) => onProveedorChange(itemKey, linea.id, patch)}
                  getProveedores={getProveedores}
                  getToken={onTokenExpired}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <Label className="text-[11px] font-medium text-gray-600 mb-1 block">
                      Cantidad <span className="text-red-500">*</span>
                    </Label>
                    <Input
                    type="number"
                    min="1"
                    value={linea.cantidad || ''}
                    placeholder="0"
                    onChange={e => onLineaFieldChange(itemKey, linea.id, 'cantidad', e.target.value)}
                    className="text-xs h-8 rounded-md border-gray-300"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-medium text-gray-600 mb-1 block">Moneda</Label>
                    <select
                    value={linea.moneda}
                    onChange={e => onLineaFieldChange(itemKey, linea.id, 'moneda', e.target.value)}
                    className="w-full px-2 h-8 text-xs border border-gray-300 rounded-md bg-white focus:ring-1 focus:ring-[#2183AE] focus:border-transparent"
                    >
                      <option value="GTQ">GTQ</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-[11px] font-medium text-gray-600 mb-1 block">
                      Costo unitario <span className="text-red-500">*</span>
                    </Label>
                    <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={linea.precio_unitario || ''}
                    onChange={e => onLineaFieldChange(itemKey, linea.id, 'precio_unitario', e.target.value)}
                    className="font-semibold text-xs h-8 rounded-md border-gray-300"
                    />
                  </div>
                </div>
                <ImagenProveedorInput
                imagen={linea.imagen}
                onChange={(file) => onImagenChange(itemKey, linea.id, file)}
                />
                {calculo !== null && subtotal > 0 && (
                  <p className="text-xs font-semibold text-emerald-600 text-right">
                    {linea.moneda}{' '}
                    {subtotal.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>
            );
          })}
          <button
          type="button"
          onClick={() => onAddLinea(itemKey)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-[#2183AE] border border-dashed border-[#2183AE]/50 rounded-xl hover:bg-[#2183AE]/5 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Agregar proveedor
          </button>
        </div>
      )}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
          key="content"
          initial={{ height: 0, opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
          animate={{ height: 'auto', opacity: 1, clipPath: 'inset(0 0 0% 0)' }}
          exit={{ height: 0, opacity: 0, clipPath: 'inset(0 0 100% 0)' }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="px-4 pb-4"
          >
            {item.notas && (
              <div className="mt-4 border-t pt-3">
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-4 w-4 text-[#2183AE] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Comentarios / Especificaciones</p>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{item.notas}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {item.imagen_nombre && (
              <div className="mt-4 border-t pt-3">
                <p className="text-xs font-semibold text-gray-700 mb-2">Imagen de referencia</p>
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
});

interface LineaArticuloOrdenContainerProps {
  item: LineaSolicitudCompraModel;
  itemKey: string;
  itemsForm: Record<string, ProveedorLineaState[]>;
  isOpen: boolean;
  calculo: { total: number; monedas: string[] } | null;
  idEmpresa: string;
  mostrarCotizacion: boolean;
  onToggle: (key: string) => void;
  onSeleccionarLinea: (itemKey: string, lineaId: string) => void;
  onRemoveLinea: (itemKey: string, lineaId: string) => void;
  onAddLinea: (itemKey: string) => void;
  onLineaFieldChange: (itemKey: string, lineaId: string, field: keyof Omit<ProveedorLineaState, 'id' | 'proveedorState'>, value: string | number) => void;
  onProveedorChange: (itemKey: string, lineaId: string, patch: Partial<ProveedorState>) => void;
  onImagenChange: (itemKey: string, lineaId: string, file: File | null) => void;
  onTokenExpired: () => void;
}

const LineaArticuloOrdenContainer = React.memo(
  ({
    item,
    itemKey,
    itemsForm,
    isOpen,
    calculo,
    idEmpresa,
    mostrarCotizacion,
    onToggle,
    onSeleccionarLinea,
    onRemoveLinea,
    onAddLinea,
    onLineaFieldChange,
    onProveedorChange,
    onImagenChange,
    onTokenExpired,
  }: LineaArticuloOrdenContainerProps) => {
    const lineas = itemsForm[itemKey] ?? [];

    return (
      <LineaArticuloOrden
      item={item}
      itemKey={itemKey}
      lineas={lineas}
      isOpen={isOpen}
      calculo={calculo}
      idEmpresa={idEmpresa}
      mostrarCotizacion={mostrarCotizacion}
      onToggle={onToggle}
      onSeleccionarLinea={onSeleccionarLinea}
      onRemoveLinea={onRemoveLinea}
      onAddLinea={onAddLinea}
      onLineaFieldChange={onLineaFieldChange}
      onProveedorChange={onProveedorChange}
      onImagenChange={onImagenChange}
      onTokenExpired={onTokenExpired}
      />
    );
  },
  (prev, next) => {
    return (
      prev.itemsForm[prev.itemKey] === next.itemsForm[next.itemKey] &&
      prev.isOpen === next.isOpen &&
      prev.calculo === next.calculo &&
      prev.idEmpresa === next.idEmpresa &&
      prev.mostrarCotizacion === next.mostrarCotizacion &&
      prev.onToggle === next.onToggle &&
      prev.onSeleccionarLinea === next.onSeleccionarLinea &&
      prev.onRemoveLinea === next.onRemoveLinea &&
      prev.onAddLinea === next.onAddLinea &&
      prev.onLineaFieldChange === next.onLineaFieldChange &&
      prev.onProveedorChange === next.onProveedorChange &&
      prev.onImagenChange === next.onImagenChange &&
      prev.onTokenExpired === next.onTokenExpired
    );
  }
);

export function PurchasesView({ onBack }: PurchasesProps) {
  const [solicitudes, setSolicitudes] = useState<VwSolicitudCompra[]>([]);
  const [selectedSolicitud, setSelectedSolicitud] = useState<VwSolicitudCompra | null>(null);
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<"all" | "PENDIENTE" | "APROBADO" | "AUTO_APROBADO" | "APROBADO_COMPRAS">("all");
  const [dateFilterType, setDateFilterType] = useState<"all" | "single" | "range">("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingAprobaciones, setLoadingAprobaciones] = useState(false);
  const [loadingOrden, setLoadingOrden] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [showNoResultsModal, setShowNoResultsModal] = useState(false);
  const [messageModal, setMessageModal] = useState<{ title: string; message: string; type: 'success' | 'error'; refreshOnClose?: boolean } | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [aprobaciones, setAprobaciones] = useState<VwAprobadoresSolicitudCompra[]>([]);
  const [calculo, setCalculo] = useState<{ total: number; monedas: string[] } | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [permiso, setPermiso] = useState(true);
  const [archivoExcel, setArchivoExcel] = useState<File | null>(null);
  const [loadingDetalleId, setLoadingDetalleId] = useState<string | null>(null);
  const [itemsForm, dispatch] = useReducer(itemsReducer, {});
  const hasActiveFilters = statusFilter !== "all" || dateFilterType !== "all";

  const showMessageModal = (message: string, type: 'success' | 'error' = 'error', title?: string, refreshOnClose?: boolean) => {
    setMessageModal({
      title: title ?? (type === 'success' ? '¡Listo!' : 'Atención'),
      message,
      type,
      refreshOnClose,
    });
  };

  function crearLineaVacia(esSeleccionada = false): ProveedorLineaState {
    return {
      id: crypto.randomUUID(),
      proveedorState: { searchTerm: '', loading: false, lista: [], seleccionado: null },
      cantidad: 0,
      precio_unitario: 0,
      moneda: 'GTQ',
      esSeleccionada,
      imagen: null,
    };
  }

  const initItemsForm = useCallback(
    (items: LineaSolicitudCompraModel[], solicitudId: string) => {
      const initial: Record<string, ProveedorLineaState[]> = {};
      items.forEach((_item, idx) => {
        const key = `${solicitudId}-${idx}`;
        initial[key] = [crearLineaVacia(true)];
      });
      dispatch({ type: 'INIT', payload: initial });
    },
    []
  );

  const handleAddLinea = useCallback((itemKey: string) => {
    dispatch({ type: 'ADD_LINEA', itemKey, linea: crearLineaVacia(false) });
  }, []);

  const handleRemoveLinea = useCallback((itemKey: string, lineaId: string) => {
    dispatch({ type: 'REMOVE_LINEA', itemKey, lineaId });
  }, []);

  const handleLineaFieldChange = useCallback(
    (itemKey: string, lineaId: string, field: keyof Omit<ProveedorLineaState, 'id' | 'proveedorState'>, value: string | number) => {
      setCalculo(null);
      dispatch({ type: 'UPDATE_FIELD', itemKey, lineaId, field, value });
    },
    []
  );

  const handleProveedorLineaChange = useCallback(
    (itemKey: string, lineaId: string, patch: Partial<ProveedorState>) => {
      dispatch({ type: 'UPDATE_PROVEEDOR', itemKey, lineaId, patch });
    },
    []
  );

  const handleSeleccionarLinea = useCallback((itemKey: string, lineaId: string) => {
    setCalculo(null);
    dispatch({ type: 'SELECCIONAR', itemKey, lineaId });
  }, []);

  const handleImagenLineaChange = useCallback((itemKey: string, lineaId: string, file: File | null) => {
    dispatch({ type: 'SET_IMAGEN', itemKey, lineaId, file });
  }, []);

  const handleTokenExpired = useCallback(() => {
    localStorage.clear();
    setIsAuthenticated(false);
  }, []);

  const fetchSolicitudes = async (filters?: any) => {
    try {
      setLoading(true);
      const requestSolicitudes = permiso ? getSolicitudesCompra : getSolicitudesCompraByUser;
      const response = await requestSolicitudes(
        filters?.inicio,
        filters?.fin,
        filters?.estado,
        filters?.page || page,
        10
      );
      setSolicitudes(response.data);
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

  const handleOpenDetailDialog = async (solicitud: VwSolicitudCompra) => {
    try {
      setLoadingDetalleId(solicitud.id);
      setSelectedSolicitud(solicitud);
      setArchivoExcel(null);
      initItemsForm(solicitud.items, solicitud.id);
      await fetchAprobaciones(solicitud.id);
      setShowDetailDialog(true);
    } catch (error: any) {
      showMessageModal(error?.message ?? String(error));
    } finally {
      setLoadingDetalleId(null);
    }
  };

  const formularioValido = useMemo(() => {
    if (!archivoExcel) return false;
    return Object.values(itemsForm).every(lineas =>
      lineas.length > 0 &&
      lineas.every(
        l => l.proveedorState.seleccionado !== null &&
          l.cantidad > 0 &&
          l.precio_unitario > 0
      )
    );
  }, [archivoExcel, itemsForm]);

  const handleCalcularTotales = () => {
    const lineasSeleccionadas = Object.values(itemsForm)
      .map(lineas => lineas.find(l => l.esSeleccionada) ?? null)
      .filter(Boolean) as ProveedorLineaState[];

    const total = lineasSeleccionadas.reduce(
      (acc, linea) => acc + linea.cantidad * linea.precio_unitario, 0
    );
    const monedas = [...new Set(lineasSeleccionadas.map(l => l.moneda))];
    setCalculo({ total, monedas });
  };

  const handleCrearOrden = async () => {
    if (!selectedSolicitud || !formularioValido) return;
    try {
      setLoadingOrden(true);
      const imagenesProveedor: { itemIndex: number; proveedor_id: string; file: File }[] = [];
      const items = selectedSolicitud.items.map((item, idx) => {
        const key = `${selectedSolicitud.id}-${idx}`;
        const lineas = itemsForm[key] ?? [];
        const lineaSeleccionada = lineas.find(l => l.esSeleccionada) ?? lineas[0];

        lineas.forEach(linea => {
          if (linea.imagen) {
            imagenesProveedor.push({
              itemIndex: idx,
              proveedor_id: linea.proveedorState.seleccionado!.CardCode,
              file: linea.imagen,
            });
          }
        });

        return {
          linea_solicitud_id: item.id,
          codigo_articulo: item.codigo_articulo,
          nombre_articulo: item.nombre_articulo,
          descripcion: item.descripcion,
          cantidad: lineaSeleccionada.cantidad,
          centro_costo: selectedSolicitud.id_empresa,
          cuenta_contable: item.cuenta_contable,
          proveedores: lineas.map(linea => ({
            proveedor_id: linea.proveedorState.seleccionado!.CardCode,
            nombre_proveedor: linea.proveedorState.seleccionado!.CardName,
            precio_unitario: linea.precio_unitario,
            es_seleccionado: linea.esSeleccionada,
          })),
        };
      });

      await crearOrdenCompra({
        header: { solicitud_id: selectedSolicitud.id },
        items,
        cotizacion: archivoExcel ?? undefined,
        imagenesProveedor,
      });

      setShowDetailDialog(false);
      showMessageModal(
        `Orden de compra creada correctamente para ${selectedSolicitud.numero_requisicion}`,
        'success',
        '¡Orden creada!',
        true
      );
    } catch (err: any) {
      if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
        localStorage.clear();
        setIsAuthenticated(false);
        return;
      }
      showMessageModal(err?.message ?? 'Error al crear la orden de compra');
    } finally {
      setLoadingOrden(false);
    }
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

  const filteredRequests = solicitudes.filter(req => {
    if (statusFilter === "all") return true;
    return req.estado === statusFilter;
  });

  const pendingRequests = filteredRequests.filter(req => req.estado === "PENDIENTE");
  const reviewedRequests = filteredRequests.filter(req => req.estado !== "PENDIENTE");

  const handleSearch = async (newPage?: number) => {
    const targetPage = newPage ?? 1;
    setPage(targetPage);
    setShowNoResultsModal(false);
    const estadoFiltro =
      permiso && statusFilter === "all"
        ? ["APROBADO", "APROBADO_COMPRAS"]
        : statusFilter;

    await fetchSolicitudes({
      inicio: dateFilterType === "single" ? singleDate : startDate,
      fin: dateFilterType === "range" ? endDate : null,
      estado: estadoFiltro,
      page: targetPage,
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

  const toggleArticle = useCallback((key: string) => {
    setExpandedArticles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
  }, []);

  const renderTracking = () => (
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
            <p className="text-xs text-gray-600">{format(selectedSolicitud!.fecha_creacion, "dd/MM/yyyy HH:mm", { locale: es })}</p>
            <p className="text-xs text-gray-500 mt-1">Por {selectedSolicitud!.solicitado_por}</p>
          </div>
        </div>
        {aprobaciones.map((approver, index) => (
          <div key={index} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${approver.estado === "APROBADO" ? 'bg-green-100' : 'bg-gray-100'}`}>
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
              ) : approver.estado === "NO APLICA" ? (
                <div className="mt-2 text-xs">
                  <p className="text-gray-600 font-medium">
                    ? NO APLICA APROBACIÓN
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
  );

  const renderResumenMonto = () => {
    const monedaMixta = calculo !== null && calculo.monedas.length > 1;
    return (
      <div className={`rounded-xl p-4 border ${calculo !== null ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-900">Monto Total Estimado</span>
          <div className="text-right">
            {calculo === null ? (
              <p className="text-sm text-gray-400">Presiona "Calcular Totales" para ver el monto</p>
            ) : monedaMixta ? (
              <p className="text-xs text-amber-600 font-medium">Monedas mixtas — revisar</p>
            ) : (
              <p className="text-lg font-bold text-emerald-700">
                {calculo.monedas[0] ?? 'GTQ'}{' '}
                {calculo.total.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const handleCloseDetailDialog = () => {
    setShowDetailDialog(false);
    setArchivoExcel(null);
    dispatch({ type: 'INIT', payload: {} });
    setCalculo(null);
  };

  const renderDetailDialogContent = () => {
    if (!selectedSolicitud) return null;

    if (!permiso || selectedSolicitud.estado !== "APROBADO_COMPRAS") {
      return (
        <>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-6 w-6 text-[#2183AE]" />
                <h2 className="text-lg font-bold text-gray-900">{selectedSolicitud.numero_requisicion}</h2>
                {getStatusBadge(selectedSolicitud.estado)}
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2 text-sm text-gray-600"><User className="h-4 w-4" /><span><strong>Solicitado por:</strong> {selectedSolicitud.solicitado_por}</span></div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Building2 className="h-4 w-4" /><span><strong>Empresa: </strong>{selectedSolicitud.empresa?.nombre}</span></div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="h-4 w-4" /><span><strong>Fecha de creación: </strong>{format(selectedSolicitud.fecha_creacion, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</span></div>
                <div className="flex items-center gap-2 text-sm text-gray-600"><CalendarArrowDown className="h-4 w-4" /><span><strong>Fecha requerida: </strong>{format(selectedSolicitud.fecha_requerida, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</span></div>
                {selectedSolicitud.DocNum && (
                  <div className="flex items-center gap-2 text-sm text-gray-600"><Check className="h-4 w-4" /><span><strong>Id de SAP:</strong> {selectedSolicitud.DocNum}</span></div>
                )}
              </div>
            </div>
            <button
            type="button"
            onClick={handleCloseDetailDialog}
            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#2183AE]" />
                Justificación de la Solicitud
              </h4>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedSolicitud.justificacion}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Package className="h-4 w-4 text-[#2183AE]" />
                Artículos Solicitados ({selectedSolicitud.items?.length ?? 0})
              </h4>
              <div className="space-y-2">
                {selectedSolicitud.items.map((item, idx) => {
                  const key = `${selectedSolicitud.id}-${idx}`;
                  return (
                    <LineaArticuloOrdenContainer
                    key={key}
                    item={item}
                    itemKey={key}
                    itemsForm={itemsForm}
                    isOpen={expandedArticles.has(key)}
                    calculo={calculo}
                    idEmpresa={selectedSolicitud.id_empresa}
                    mostrarCotizacion={false}
                    onToggle={toggleArticle}
                    onSeleccionarLinea={handleSeleccionarLinea}
                    onRemoveLinea={handleRemoveLinea}
                    onAddLinea={handleAddLinea}
                    onLineaFieldChange={handleLineaFieldChange}
                    onProveedorChange={handleProveedorLineaChange}
                    onImagenChange={handleImagenLineaChange}
                    onTokenExpired={handleTokenExpired}
                    />
                  );
                })}
              </div>
            </div>
            {renderTracking()}
          </div>
        </>
      );
    }

    return (
      <>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <ShoppingCart className="h-6 w-6 text-[#2183AE]" />
              <h2 className="text-lg font-bold text-gray-900">Iniciar Orden de Compra — {selectedSolicitud.numero_requisicion}</h2>
              {getStatusBadge(selectedSolicitud.estado)}
            </div>
            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2 text-sm text-gray-600"><User className="h-4 w-4" /><span><strong>Solicitado por:</strong> {selectedSolicitud.solicitado_por}</span></div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><Building2 className="h-4 w-4" /><span><strong>Empresa:</strong> {selectedSolicitud.empresa?.nombre}</span></div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="h-4 w-4" /><span><strong>Fecha de creación: </strong>{format(selectedSolicitud.fecha_creacion, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</span></div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><CalendarArrowDown className="h-4 w-4" /><span><strong>Fecha requerida: </strong>{format(selectedSolicitud.fecha_requerida, "dd 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}</span></div>
              {selectedSolicitud.DocNum && (
                <div className="flex items-center gap-2 text-sm text-gray-600"><Check className="h-4 w-4" /><span><strong>Id de SAP: </strong>{selectedSolicitud.DocNum}</span></div>
              )}
            </div>
          </div>
          <button
          type="button"
          onClick={handleCloseDetailDialog}
          className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 hover:bg-gray-50 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#2183AE]" />
              Justificación de la Solicitud
            </h4>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{selectedSolicitud.justificacion}</p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package className="h-4 w-4 text-[#2183AE]" />
              Artículos Solicitados ({selectedSolicitud.items?.length ?? 0})
            </h4>
            <div className="space-y-2">
              {selectedSolicitud.items.map((item, idx) => {
                const key = `${selectedSolicitud.id}-${idx}`;
                return (
                  <LineaArticuloOrdenContainer
                  key={key}
                  item={item}
                  itemKey={key}
                  itemsForm={itemsForm}
                  isOpen={expandedArticles.has(key)}
                  calculo={calculo}
                  idEmpresa={selectedSolicitud.id_empresa}
                  mostrarCotizacion={true}
                  onToggle={toggleArticle}
                  onSeleccionarLinea={handleSeleccionarLinea}
                  onRemoveLinea={handleRemoveLinea}
                  onAddLinea={handleAddLinea}
                  onLineaFieldChange={handleLineaFieldChange}
                  onProveedorChange={handleProveedorLineaChange}
                  onImagenChange={handleImagenLineaChange}
                  onTokenExpired={handleTokenExpired}
                  />
                );
              })}
            </div>
          </div>
          {renderResumenMonto()}
          {renderTracking()}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4 text-[#2183AE]" />
              Cotización / Archivo Excel
              <span className="text-red-500">*</span>
            </h4>
            <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              archivoExcel
                ? "border-emerald-300 bg-emerald-50"
                : "border-gray-300 bg-gray-50 hover:border-[#2183AE] hover:bg-blue-50/30"
            }`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file && (file.name.endsWith(".xlsx") || file.name.endsWith(".xls"))) {
                setArchivoExcel(file);
              } else {
                showMessageModal("Solo se permiten archivos Excel (.xlsx o .xls)");
              }
            }}
            >
              {archivoExcel ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
                      <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-sm font-medium text-gray-900 truncate">{archivoExcel.name}</p>
                      <p className="text-xs text-gray-500">{(archivoExcel.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setArchivoExcel(null)}
                  className="shrink-0 border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <FileText className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Arrastra tu archivo Excel aquí</p>
                  <p className="text-xs text-gray-500 mb-3">o haz clic para seleccionarlo</p>
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 bg-[#2183AE] text-white text-xs rounded-lg hover:bg-[#1a6a8f] transition-colors">
                      Seleccionar archivo
                    </span>
                    <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setArchivoExcel(file);
                      e.target.value = "";
                    }}
                    />
                  </label>
                  <p className="text-xs text-gray-400 mt-3">Solo archivos .xlsx o .xls</p>
                </div>
              )}
            </div>
            <Button
            type="button"
            disabled={!formularioValido || loadingOrden}
            onClick={handleCalcularTotales}
            className="w-full mt-4 bg-white border border-[#2183AE] text-[#2183AE] hover:bg-[#2183AE] hover:text-white disabled:opacity-50 flex items-center justify-center gap-2 py-5"
            >
              <Calculator className="h-4 w-4" />
              Calcular Totales
            </Button>
            {calculo !== null && (
              <Button
              type="button"
              disabled={loadingOrden}
              onClick={handleCrearOrden}
              className="w-full mt-2 bg-[#2183AE] hover:bg-[#1a6a8f] disabled:opacity-50 text-white flex items-center justify-center gap-2 py-5"
              >
                {loadingOrden ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Creando Orden...</>
                ) : (
                  <><CheckCircle className="h-4 w-4" />Iniciar Proceso de Orden de Compra</>
                )}
              </Button>
            )}
            {!formularioValido && (
              <p className="text-xs text-gray-400 text-center mt-2">
                {!archivoExcel
                  ? "Adjunta el archivo de cotización para continuar"
                  : "Completa proveedor, cantidad y costo unitario en todos los artículos"}
              </p>
            )}
          </div>
        </div>
      </>
    );
  };

  return (
    <div className="py-4 sm:py-6 lg:py-2 px-2 sm:px-4">
      {createPortal(
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
                onClick={async () => {
                  const shouldRefresh = messageModal.refreshOnClose;
                  setMessageModal(null);
                  if (shouldRefresh) {
                    await handleSearch(page);
                  }
                }}
                className="w-full bg-[#2183AE] text-white hover:bg-[#1a6a8f] py-4 rounded-xl font-semibold"
                >
                  Entendido
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
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
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-md border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-700 mb-1 font-medium">Total</p>
                  <p className="text-3xl font-bold text-gray-600">{solicitudes?.length}</p>
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
                    {solicitudes?.filter(r => r.estado === "PENDIENTE").length}
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
                    {solicitudes?.filter(r => ["APROBADO", "AUTO_APROBADO", "APROBADO_COMPRAS"].includes(r.estado)).length}
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
                {!permiso && <option value="PENDIENTE">Pendientes</option>}
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
              (dateFilterType === "range" && (!startDate || !endDate)) ||
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
        {loading && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center mb-8">
            <div className="w-16 h-16 bg-[#2183AE]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 text-[#2183AE] animate-spin" />
            </div>
            <h3 className="text-gray-900 mb-2">Buscando Solicitudes</h3>
            <p className="text-gray-600 text-sm">Espera un Momento</p>
          </div>
        )}
        {!hasSearched && !loading && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center mb-8">
            <div className="w-16 h-16 bg-[#2183AE]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="h-8 w-8 text-[#2183AE]" />
            </div>
            <h3 className="text-gray-900 mb-2">Utiliza los filtros para buscar solicitudes</h3>
            <p className="text-gray-600 text-sm">Selecciona los filtros deseados y presiona el botón "Buscar"</p>
          </div>
        )}
        {hasSearched && pendingRequests.length > 0 && !loading && (
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
        {hasSearched && pendingRequests.length === 0 && reviewedRequests.length === 0 && !loading && !showNoResultsModal && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center mb-8">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-gray-900 mb-2">No se encontraron solicitudes</h3>
            <p className="text-gray-600 text-sm">No hay solicitudes que coincidan con los filtros seleccionados</p>
          </div>
        )}
        {hasSearched && reviewedRequests.length > 0 && !loading && (
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
        {hasSearched && totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-8">
            <Button variant="outline" disabled={page === 1} onClick={() => handleSearch(page - 1)}>Anterior</Button>
            <div className="text-sm text-gray-600">Página <strong>{page}</strong> de <strong>{totalPages}</strong></div>
            <Button variant="outline" disabled={page === totalPages} onClick={() => handleSearch(page + 1)}>Siguiente</Button>
          </div>
        )}
      </div>
      {createPortal(
        <AnimatePresence>
          {showDetailDialog && !loadingAprobaciones && selectedSolicitud && (
            <motion.div
            key="detail-backdrop"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseDetailDialog}
            >
              <motion.div
              key="detail-panel"
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
              >
                <div className="overflow-y-auto flex-1 px-6 pt-6 pb-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300">
                  {renderDetailDialogContent()}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}