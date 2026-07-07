import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from 'react';
import { Hash, MapPin, CheckCircle, ChevronDown, ChevronUp, FileText, Calendar, User, AlertCircle, Eye, Filter, X as XIcon, Loader2, X, Truck, Fuel } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '../ui/dialog';
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChecklistItem, VwCamionInspeccion } from "../types/CamionModel";
import { ValesCombustible } from "../types/ValesCombustibleModel";
import { getValesCombustible } from "../api/ValesCombustibleApi";
import { getInspecciones } from "../api/CamionApi";
import { MediaViewer, MediaFile } from "./MediaViewer";
import truckFront from "../../assets/truck/truck_front.jpg";
import truckBack from "../../assets/truck/truck_back.jpg";
import truckLeft from "../../assets/truck/truck_left.jpg";
import truckRight from "../../assets/truck/truck_right.jpg";
import { exportInspeccionesExcel } from "../utils/exportInspeccionesExcel";

interface TruckInspectionHistoryViewProps {
  onBack: () => void;
}

function getScore(items: ChecklistItem[]) {
  if (!items || items.length === 0) return { good: 0, total: 0, pct: 0 };
  const good = items.filter(i => i.estado === "BUENO").length;
  return { good, total: items.length, pct: Math.round((good / items.length) * 100) };
}

function StatusBadge({ estado }: { estado: 'BUENO' | 'MALO' }) {
  return estado === "BUENO" ? (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">BUENO</span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">MALO</span>
  );
}

function CleanBadge({ items }: { items?: ChecklistItem[] }) {
  if (!items || items.length === 0) return <span className="text-xs text-gray-400">—</span>;
  const allGood = items.every(i => i.estado === "BUENO");
  return allGood ? (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">BUENO</span>
  ) : (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">MALO</span>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">{icon} {label}</div>
      <span className="text-xs text-gray-800">{value}</span>
    </div>
  );
}

function formatFechaInspeccion(fecha: string | Date) {
  if (!fecha) return "—";
  const fechaStr = typeof fecha === "string" ? fecha : fecha.toISOString();
  const [year, month, day] = fechaStr.split("T")[0].split("-");
  return `${day}/${month}/${year}`;
}

function getFechaInspeccionISO(fecha: string | Date) {
  if (!fecha) return "";
  return typeof fecha === "string" ? fecha.split("T")[0] : fecha.toISOString().split("T")[0];
}

function ChecklistSection({ title, items, defaultOpen = false }: { title: string; items: ChecklistItem[]; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const score = getScore(items);
  if (!items || items.length === 0) return null;
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-800">{title}</span>
          <span className="text-xs text-gray-500">{score.good}/{score.total} BUENO ({score.pct}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${score.pct}%`, backgroundColor: score.pct >= 70 ? "#16a34a" : score.pct >= 40 ? "#ca8a04" : "#dc2626" }} />
          </div>
          {open ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
        </div>
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-start justify-between px-4 py-2.5 gap-3">
              <span className="text-xs text-gray-700 flex-1 leading-relaxed">{item.item}</span>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <StatusBadge estado={item.estado} />
                {item.observaciones && <span className="text-xs text-gray-500 italic">{item.observaciones}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

type TruckView = "frente" | "trasera" | "lateral-izq" | "lateral-der";
interface DamagePoint { x: number; y: number; }
interface DamageByView { frente: DamagePoint[]; trasera: DamagePoint[]; "lateral-izq": DamagePoint[]; "lateral-der": DamagePoint[]; }

const VIEW_LABELS: { key: TruckView; label: string }[] = [
  { key: "frente", label: "Frente" },
  { key: "lateral-izq", label: "Lateral Izq." },
  { key: "lateral-der", label: "Lateral Der." },
  { key: "trasera", label: "Trasera" },
];

const imageByView: Record<TruckView, string> = {
  frente: truckFront.src as unknown as string,
  trasera: truckBack.src as unknown as string,
  "lateral-izq": truckLeft.src as unknown as string,
  "lateral-der": truckRight.src as unknown as string,
};

function TruckDiagram({ daniosPorVista }: { daniosPorVista: DamageByView }) {
  const [activeView, setActiveView] = useState<TruckView>("frente");
  const points = daniosPorVista[activeView];
  const totalDamages = Object.values(daniosPorVista).reduce((s, arr) => s + arr.length, 0);
  const imagen = imageByView[activeView];
  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-500">Diagrama de daños — selecciona la vista</p>
        {totalDamages > 0 && (
          <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 rounded-full">
            {totalDamages} daño{totalDamages !== 1 ? "s" : ""} total{totalDamages !== 1 ? "es" : ""}
          </span>
        )}
      </div>
      <div className="flex gap-1 mb-3 bg-white rounded-lg border border-gray-200 p-1">
        {VIEW_LABELS.map(({ key, label }) => {
          const count = daniosPorVista[key].length;
          return (
            <button key={key} onClick={() => setActiveView(key)} className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-xs transition-all ${activeView === key ? "bg-[#2183AE] text-white shadow-sm" : "text-gray-600 hover:bg-gray-100"}`}>
              {label}
              {count > 0 && <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] leading-none ${activeView === key ? "bg-white/30 text-white" : "bg-red-100 text-red-600"}`}>{count}</span>}
            </button>
          );
        })}
      </div>
      <div className="relative bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="relative w-full">
          <img src={imagen} alt={`Vista ${activeView}`} className="w-full h-auto object-contain select-none" draggable={false} />
          {points.map((pt, idx) => (
            <div key={idx} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${pt.x}%`, top: `${pt.y}%` }}>
              <div className="relative flex items-center justify-center">
                <div className="absolute w-8 h-8 rounded-full bg-red-500/20 border border-red-600" />
                <div className="relative w-5 h-5 rounded-full bg-red-500 border border-red-700 text-white text-[10px] flex items-center justify-center font-bold">{idx + 1}</div>
              </div>
            </div>
          ))}
          {points.length === 0 && (
            <div className="absolute inset-0 flex items-end justify-center pb-3 pointer-events-none">
              <span className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-full px-3 py-1">Sin daños en esta vista</span>
            </div>
          )}
        </div>
      </div>
      {points.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {points.map((pt, idx) => (
            <div key={idx} className="flex items-center gap-1.5 text-xs text-gray-600 bg-red-50 border border-red-100 rounded-full px-2 py-0.5">
              <span className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center text-white text-[9px] shrink-0">{idx + 1}</span>
              x:{pt.x.toFixed(1)} y:{pt.y.toFixed(1)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function TruckInspectionHistoryView({ onBack }: TruckInspectionHistoryViewProps) {
  const [inspecciones, setInspecciones]         = useState<VwCamionInspeccion[]>([]);
  const [selectedInspeccion, setSelectedInspeccion] = useState<VwCamionInspeccion | null>(null);
  const [selectedVales, setSelectedVales]       = useState<VwCamionInspeccion | null>(null);
  const [dateFilterType, setDateFilterType]     = useState<"all" | "single" | "range">("all");
  const [singleDate, setSingleDate]             = useState(format(new Date(), "yyyy-MM-dd"));
  const [startDate, setStartDate]               = useState("");
  const [endDate, setEndDate]                   = useState("");
  const [loading, setLoading]                   = useState(false);
  const [isAuthenticated, setIsAuthenticated]   = useState(true);
  const [error, setError]                       = useState<string | null>(null);
  const [hasSearched, setHasSearched]           = useState(false);
  const [showNoResultsModal, setShowNoResultsModal] = useState(false);
  const [loadingDetalleId, setLoadingDetalleId] = useState<string | null>(null);
  const [page, setPage]                         = useState(1);
  const [totalPages, setTotalPages]             = useState(1);
  const [totalRecords, setTotalRecords]         = useState(0);
  const [showInspeccionDialog, setShowInspeccionDialog] = useState(false);
  const [showValesDialog, setShowValesDialog]   = useState(false);
  const [vales, setVales]                       = useState<ValesCombustible[]>([]);
  const [loadingVales, setLoadingVales]         = useState(false);
  const [errorVales, setErrorVales]             = useState<string | null>(null);
  const [expandedVale, setExpandedVale]         = useState<string | null>(null);
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [totalVales, setTotalVales]             = useState(0);
  const inspeccionScore = selectedInspeccion ? getScore([
    ...(selectedInspeccion.niveles ?? []),
    ...(selectedInspeccion.chequeo_funcionamiento ?? []),
    ...(selectedInspeccion.equipo_basico ?? []),
    ...(selectedInspeccion.varios ?? []),
  ]) : { good: 0, total: 0, pct: 0 };
  const daniosPorVista: DamageByView = selectedInspeccion ? {
    frente:        selectedInspeccion.puntos_frontal      ?? selectedInspeccion.marcas_danos?.frente          ?? [],
    trasera:       selectedInspeccion.puntos_trasero      ?? selectedInspeccion.marcas_danos?.trasera         ?? [],
    "lateral-izq": selectedInspeccion.puntos_lateral_izq  ?? selectedInspeccion.marcas_danos?.["lateral-izq"] ?? [],
    "lateral-der": selectedInspeccion.puntos_lateral_der  ?? selectedInspeccion.marcas_danos?.["lateral-der"] ?? [],
  } : { frente: [], trasera: [], "lateral-izq": [], "lateral-der": [] };
  const totalMontoVales = vales.reduce((sum, v) => sum + Number(v.monto), 0);
  const [placaFilter, setPlacaFilter] = useState("");
  const [conductorFilter, setConductorFilter] = useState("");
  const hasActiveFilters = dateFilterType !== "all" || placaFilter.trim() !== "" || conductorFilter.trim() !== "";

  const fetchInspecciones = async (filters?: any) => {
    try {
      setLoading(true);
      const response = await getInspecciones(
        filters?.placa,
        filters?.nombre_conductor,
        filters?.inicio,
        filters?.fin,
        filters?.page || page,
        10
      );
      setInspecciones(response.data);
      console.log(response.data)
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

  const fetchVales = async (inspeccion: VwCamionInspeccion) => {
    const fecha = getFechaInspeccionISO(inspeccion.fecha_inspeccion);
    try {
      setLoadingVales(true);
      setErrorVales(null);
      const res = await getValesCombustible(inspeccion.placa_vehiculo, fecha);
      setVales(res.data);
      setTotalVales(res.data.length);
    } catch (err: any) {
      setErrorVales(err.message);
    } finally {
      setLoadingVales(false);
    }
  };

  const handleOpenInspeccion = (inspeccion: VwCamionInspeccion) => {
    setSelectedInspeccion(inspeccion);
    setShowInspeccionDialog(true);
  };

  const handleOpenVales = async (inspeccion: VwCamionInspeccion) => {
    setSelectedVales(inspeccion);
    setVales([]);
    setExpandedVale(null);
    setShowValesDialog(true);
    await fetchVales(inspeccion);
  };

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const handleClearFilters = () => {
    setDateFilterType("all");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
    setPlacaFilter("");
    setConductorFilter("");
    setShowNoResultsModal(false);
  };

  const handleSearch = async (newPage?: number) => {
    const targetPage = newPage ?? 1;
    setPage(targetPage);
    setShowNoResultsModal(false);
    await fetchInspecciones({
      placa: placaFilter.trim() !== "" ? placaFilter : undefined,
      nombre_conductor: conductorFilter.trim() !== "" ? conductorFilter : undefined,
      inicio: dateFilterType === "single" ? singleDate : dateFilterType === "range" ? startDate : undefined,
      fin: dateFilterType === "range"  ? endDate : undefined,
      page: targetPage,
    });
    setHasSearched(true);
  };

  const openMediaViewer = (
    vale: ValesCombustible,
    startIndex: number
  ) => {
    const files: MediaFile[] = [];

    if (vale.foto_vale_url) {
      files.push({
        id: `${vale.id_vale}-vale`,
        name: "Vale de combustible",
        url_archivo: vale.foto_vale_url,
        type: "image",
      });
    }

    if (vale.foto_bomba_url) {
      files.push({
        id: `${vale.id_vale}-bomba`,
        name: "Fotografía de bomba",
        url_archivo: vale.foto_bomba_url,
        type: "image",
      });
    }

    setMediaFiles(files);
    setMediaIndex(startIndex);
    setShowMediaViewer(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ENVIADO":
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Enviado</span>;
      case "PENDIENTE":
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Pendiente</span>;
      case "APROBADO":
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Aprobada</span>;
      case "RECHAZADO":
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 flex items-center gap-1"><X className="h-3 w-3" /> Rechazado</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 flex items-center gap-1">{status}</span>;
    }
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
              <h2 className="text-white mb-0">Historial de Inspecciones de Camiones</h2>
              <p className="text-sm text-white/90">Visualiza todas las inspecciones realizadas a los camiones de la corporación</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <div>
              <Label className="text-xs text-gray-700 mb-1.5 block">Placa del Vehículo</Label>
              <Input 
              type="text" 
              placeholder="Ej: P-123ABC" 
              value={placaFilter} 
              onChange={(e) => setPlacaFilter(e.target.value)} 
              className="h-9 text-xs" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-700 mb-1.5 block">Nombre del Conductor</Label>
              <Input 
              type="text" 
              placeholder="Buscar conductor..." 
              value={conductorFilter} 
              onChange={(e) => setConductorFilter(e.target.value)} 
              className="h-9 text-xs" 
              />
            </div>
            <div>
              <Label className="text-xs text-gray-700 mb-1.5 block">Tipo de Fecha</Label>
              <select
              value={dateFilterType}
              onChange={(e) => {
                const type = e.target.value as typeof dateFilterType;
                setDateFilterType(type);
                if (type === "all") { setSingleDate(""); setStartDate(""); setEndDate(""); }
                else if (type === "single") { setSingleDate(format(new Date(), "yyyy-MM-dd")); setStartDate(""); setEndDate(""); }
                else { setSingleDate(""); }
              }}
              className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent"
              >
                <option value="all">Sin filtro de fecha</option>
                <option value="single">Una Fecha</option>
                <option value="range">Rango de fechas</option>
              </select>
            </div>
            <div>
              <Label className="text-xs text-gray-700 mb-1.5 block">{dateFilterType === "range" ? "Desde" : "Fecha"}</Label>
              <Input type="date" value={dateFilterType === "single" ? singleDate : startDate} onChange={(e) => dateFilterType === "single" ? setSingleDate(e.target.value) : setStartDate(e.target.value)} disabled={dateFilterType === "all"} className="h-9 text-xs" />
            </div>
            {dateFilterType === "range" && (
              <div>
                <Label className="text-xs text-gray-700 mb-1.5 block">Hasta</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 text-xs" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => handleSearch()} className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE] flex items-center gap-2" size="sm" disabled={(dateFilterType === "range" && (!startDate || !endDate)) || (dateFilterType === "single" && !singleDate)}>
              <Filter className="h-3 w-3" /> Buscar
            </Button>
            <Button
            onClick={async () => {
              await exportInspeccionesExcel(
                inspecciones,
                getValesCombustible
              );
            }}
            variant="outline"
            size="sm"
            disabled={inspecciones.length === 0}
            >
              Exportar Excel
            </Button>
            {hasActiveFilters && (
              <Button onClick={handleClearFilters} variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-100">
                <XIcon className="h-3 w-3 mr-1" /> Limpiar
              </Button>
            )}
            {dateFilterType === "single" && singleDate && (
              <span className="px-3 py-1.5 bg-[#2183AE]/10 text-[#2183AE] text-xs rounded-lg flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {singleDate.split("-").reverse().join("/")}
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
            <h3 className="text-gray-900 mb-2">Buscando Inspecciones</h3>
            <p className="text-gray-600 text-sm">Espera un momento…</p>
          </div>
        )}
        {!hasSearched && !loading && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center mb-8">
            <div className="w-16 h-16 bg-[#2183AE]/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="h-8 w-8 text-[#2183AE]" />
            </div>
            <h3 className="text-gray-900 mb-2">Utiliza los filtros para buscar inspecciones de camiones</h3>
            <p className="text-gray-600 text-sm">Selecciona los filtros deseados y presiona el botón "Buscar"</p>
          </div>
        )}
        {hasSearched && inspecciones.length > 0 && !loading && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-yellow-500 rounded-full"></div>
              <h3 className="text-gray-900">Inspecciones Realizadas</h3>
              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-full font-medium">{totalRecords}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {inspecciones.map((i, index) => (
                <motion.div key={i.id_checklist} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1, duration: 0.3 }} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="p-4 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] text-white">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold">INSPECCIONADO POR {i.tipo_checklist}</h4>
                      {getStatusBadge(i.estado_checklist)}
                    </div>
                    <div className="text-xs opacity-90">
                      <div className="flex items-center gap-1 mb-1"><User className="h-3 w-3" /><span><strong>Conductor:</strong> {i.nombre_conductor ?? "—"}</span></div>
                      <div className="flex items-center gap-1 mb-1"><Truck className="h-3 w-3" /><span><strong>Placa:</strong> {i.placa_vehiculo ?? "—"}</span></div>
                      <div className="flex items-center gap-1"><Calendar className="h-3 w-3" /><span><strong>Fecha de Inspección:</strong> {formatFechaInspeccion(i.fecha_inspeccion)}</span></div>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <Button onClick={() => handleOpenInspeccion(i)} variant="outline" size="sm" className="w-full border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]" disabled={loadingDetalleId === i.id_checklist}>
                      {loadingDetalleId === i.id_checklist ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cargando...</> : <><Eye className="h-3 w-3 mr-1" />Ver Detalle</>}
                    </Button>
                    {i.tiene_vale_combustible && (
                      <Button onClick={() => handleOpenVales(i)} variant="outline" size="sm" className="w-full border-yellow-600 bg-yellow-600 text-white hover:bg-white hover:text-yellow-600" disabled={loadingDetalleId === i.id_checklist}>
                        {loadingDetalleId === i.id_checklist ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Cargando...</> : <><Fuel className="h-3 w-3 mr-1" />Ver Vales</>}
                      </Button>
                    )}
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
        <Dialog open={showInspeccionDialog} onOpenChange={setShowInspeccionDialog}>
          <DialogContent className="!max-w-3xl max-h-[90vh] overflow-hidden flex flex-col p-0">
            <div className="overflow-y-auto flex-1 px-6 pt-6 pb-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300">
              {selectedInspeccion && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-gray-900">
                      Inspección registrada por: {selectedInspeccion.usuario?.nombre}
                    </DialogTitle>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${selectedInspeccion.tipo_checklist === "SUPERVISOR" ? "bg-[#2183AE]/10 text-[#2183AE]" : "bg-purple-100 text-purple-700"}`}>
                        {selectedInspeccion.tipo_checklist}
                      </span>
                      <span className="text-xs text-gray-500">{formatFechaInspeccion(selectedInspeccion.fecha_inspeccion)}</span>
                    </div>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="bg-gradient-to-r from-[#2183AE]/10 to-[#1e213d]/5 rounded-xl p-4 flex items-center gap-4">
                      <div className="text-center shrink-0">
                        <div className="text-3xl text-[#2183AE]">{inspeccionScore.pct}%</div>
                        <div className="text-xs text-gray-500 mt-0.5">Estado general</div>
                      </div>
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${inspeccionScore.pct}%`, backgroundColor: inspeccionScore.pct >= 70 ? "#16a34a" : inspeccionScore.pct >= 40 ? "#ca8a04" : "#dc2626" }} />
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{inspeccionScore.good} de {inspeccionScore.total} ítems en estado BUENO</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-3"><Truck size={16} className="text-[#2183AE]" /><span className="text-sm text-gray-700">Información del Camión</span></div>
                        <InfoRow icon={<Hash size={13} />} label="Placa" value={selectedInspeccion.placa_vehiculo} />
                        <InfoRow icon={<MapPin size={13} />} label="Kilometraje" value={selectedInspeccion.kilometraje ? `${selectedInspeccion.kilometraje} km` : "—"} />
                        <InfoRow icon={<FileText size={13} />} label="Licencia" value={selectedInspeccion.licencia_conducir ?? "—"} />
                        <InfoRow icon={<User size={13} />} label="Inspector" value={selectedInspeccion.nombre_conductor ?? "—"} />
                      </div>
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-3"><User size={16} className="text-[#2183AE]" /><span className="text-sm text-gray-700">Información del Conductor</span></div>
                        <InfoRow icon={<User size={13} />} label="Nombre" value={selectedInspeccion.nombre_conductor ?? "—"} />
                        <div className="pt-2 space-y-2">
                          <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Limpieza Exterior</span><CleanBadge items={selectedInspeccion.limpieza_exterior} /></div>
                          <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Limpieza Cabina</span><CleanBadge items={selectedInspeccion.limpieza_cabina} /></div>
                          <div className="flex items-center justify-between"><span className="text-xs text-gray-500">Limpieza Furgón</span><CleanBadge items={selectedInspeccion.limpieza_furgon} /></div>
                        </div>
                      </div>
                    </div>
                    <TruckDiagram daniosPorVista={daniosPorVista} />
                    <div className="space-y-3">
                      <h3 className="text-gray-800 text-sm mb-2">Checklists de Inspección</h3>
                      <ChecklistSection title="Niveles" items={selectedInspeccion.niveles ?? []} defaultOpen />
                      <ChecklistSection title="Funcionamiento" items={selectedInspeccion.chequeo_funcionamiento ?? []} />
                      <ChecklistSection title="Equipo Básico" items={selectedInspeccion.equipo_basico ?? []} />
                      <ChecklistSection title="Varios" items={selectedInspeccion.varios ?? []} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-dashed border-gray-300 rounded-xl p-4 text-center">
                        <div className="text-xs text-gray-500 mb-2">Firma Supervisor</div>
                        {selectedInspeccion.firma_supervisor ? <img src={selectedInspeccion.firma_supervisor} alt="Firma supervisor" className="max-h-16 mx-auto object-contain" /> : <div className="text-sm text-gray-400 italic max-h-16">—</div>}
                        <div className="mt-2 h-px bg-gray-300 w-3/4 mx-auto" />
                      </div>
                      <div className="border border-dashed border-gray-300 rounded-xl p-4 text-center">
                        <div className="text-xs text-gray-500 mb-2">Firma Piloto</div>
                        {selectedInspeccion.firma_canvas_base64 ? <img src={selectedInspeccion.firma_canvas_base64} alt="Firma piloto" className="max-h-16 mx-auto object-contain" /> : <div className="text-sm text-gray-400 italic max-h-16">—</div>}
                        <div className="mt-2 h-px bg-gray-300 w-3/4 mx-auto" />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog
        open={showValesDialog}
        onOpenChange={(open) => {
          setShowValesDialog(open);
          
          if (!open) {
            setExpandedVale(null);
          }
        }}
        >
          <DialogContent 
          className="!max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0"
          >
            <div className="overflow-y-auto flex-1 px-6 pt-6 pb-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-300">
              {selectedVales && (
                <>
                  <DialogHeader>
                    <DialogTitle className="text-gray-900">
                      Vales de Combustible — {selectedVales.placa_vehiculo}
                    </DialogTitle>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">COMBUSTIBLE</span>
                      <span className="text-xs text-gray-500">{formatFechaInspeccion(selectedVales.fecha_inspeccion)}</span>
                    </div>
                  </DialogHeader>
                  <div className="space-y-6 py-4">
                    <div className="bg-gradient-to-r from-yellow-500/10 to-yellow-600/5 rounded-xl p-4 flex items-center gap-4">
                      <div className="text-center shrink-0">
                        <div className="text-2xl text-yellow-600 font-semibold">{loadingVales ? "—" : `Q ${totalMontoVales.toFixed(2)}`}</div>
                        <div className="text-xs text-gray-500 mt-0.5">Total del día</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mt-1">
                          {loadingVales ? "Cargando..." : `${totalVales} vale${totalVales !== 1 ? "s" : ""} registrado${totalVales !== 1 ? "s" : ""}`}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 mb-3"><Truck size={16} className="text-yellow-600" /><span className="text-sm text-gray-700">Información del Camión</span></div>
                        <InfoRow icon={<Hash size={13} />} label="Placa" value={selectedVales.placa_vehiculo} />
                        <InfoRow icon={<FileText size={13} />} label="Licencia" value={selectedVales.licencia_conducir ?? "—"} />
                        <InfoRow icon={<User size={13} />} label="Conductor" value={selectedVales.nombre_conductor ?? "—"} />
                      </div>
                    </div>
                    {loadingVales ? (
                      <div className="py-10 text-center">
                        <Loader2 className="h-8 w-8 text-yellow-500 animate-spin mx-auto mb-3" />
                        <p className="text-sm text-gray-500">Cargando vales...</p>
                      </div>
                    ) : errorVales ? (
                      <div className="py-10 text-center">
                        <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
                        <p className="text-sm text-red-500">{errorVales}</p>
                      </div>
                    ) : vales.length === 0 ? (
                      <div className="border border-dashed border-yellow-300 rounded-xl p-8 text-center bg-yellow-50/40">
                        <Fuel className="h-10 w-10 text-yellow-400 mx-auto mb-3" />
                        <p className="text-sm text-gray-500">No hay vales registrados para esta fecha y placa.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {vales.map((vale) => {
                          const isOpen = expandedVale === vale.id_vale;
                            return (
                              <div key={vale.id_vale} className="border border-gray-200 rounded-xl overflow-hidden">
                                <button onClick={() => setExpandedVale(isOpen ? null : vale.id_vale)} className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                                  <div className="flex items-center gap-3">
                                    {isOpen ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                                    <div className="text-left">
                                      <div className="text-sm font-semibold text-yellow-600">Q {Number(vale.monto).toFixed(2)}</div>
                                      <div className="text-xs text-gray-500">{format(new Date(vale.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}</div>
                                    </div>
                                  </div>
                                </button>
                              <AnimatePresence>
                                {isOpen && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                                    <div className="p-4 space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      </div>
                                      {(vale.foto_vale_url || vale.foto_bomba_url) && (
                                        <div>
                                          <div className="text-xs text-gray-500 mb-2">Fotografías</div>
                                          <div className="flex gap-3 flex-wrap">
                                            {vale.foto_vale_url && (
                                              <div>
                                                <img
                                                src={vale.foto_vale_url}
                                                alt="Vale"
                                                onClick={() => openMediaViewer(vale, 0)}
                                                className="w-48 h-48 object-cover rounded-xl border cursor-pointer hover:scale-105 transition-transform"
                                                />
                                                <p className="text-xs text-center mt-1 text-gray-500">Vale</p>
                                              </div>
                                            )}
                                            {vale.foto_bomba_url && (
                                              <div>
                                                <img 
                                                src={vale.foto_bomba_url}
                                                alt="Bomba"
                                                onClick={() => openMediaViewer(
                                                  vale,
                                                  vale.foto_vale_url ? 1 : 0
                                                )}
                                                className="w-48 h-48 object-cover rounded-xl border cursor-pointer hover:scale-105 transition-transform"
                                                />
                                                <p className="text-xs text-center mt-1 text-gray-500">Bomba</p>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                      {vale.coordenadas && (
                                        <div>
                                          <div className="text-xs text-gray-500 mb-2">Ubicación del vale</div>
                                          <iframe title={`map-${vale.id_vale}`} width="100%" height="220" loading="lazy" className="rounded-lg border" src={`https://maps.google.com/maps?q=${vale.coordenadas.latitude},${vale.coordenadas.longitude}&z=16&output=embed`} />
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <MediaViewer
          isOpen={showMediaViewer}
          onClose={() => setShowMediaViewer(false)}
          files={mediaFiles}
          initialIndex={mediaIndex}
          autoEnterFullscreen={false}
          disableFullscreen={false}
        />
      </div>
    </div>
  );
}