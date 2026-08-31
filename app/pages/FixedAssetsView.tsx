"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Plus,
  Trash2,
  Eye,
  Loader2,
  Package,
  Landmark,
  Calendar,
  Building2,
  User,
  Filter,
  X as XIcon,
  CheckCircle,
  AlertCircle,
  Truck,
  PackageCheck,
  ClipboardList
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Combobox } from "../ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "../ui/dialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TiendaModulo } from "../types/TiendaModel";
import { getAllTiendas } from "../api/TiendaApi";
import { Item } from "../types/SapModels";
import { buscarActivosFijos } from "../api/SapApi";
import { crearPedidoActivoFijo, buscarPedidosActivoFijo } from "../api/PedidoPosApi";

type EstadoPedidoAF = "RECIBIDO" | "VALIDADO" | "EN_TRANSITO" | "ENTREGADO" | "ENTREGADO_PARCIAL";

interface PedidoActivoFijoItem {
  codigo_articulo: string;
  nombre_articulo: string;
  unidad_medida: string;
  cantidad_pedida: number;
  cantidad_entregada: number;
}

interface PedidoActivoFijo {
  id: string;
  numero_pedido: string;
  tienda: TiendaModulo;
  fecha_creacion: Date;
  solicitado_por: string;
  estado: EstadoPedidoAF;
  items: PedidoActivoFijoItem[];
}

interface SelectedArticulo {
  article: Item;
  cantidad: number;
}

const ESTADO_CFG: Record<EstadoPedidoAF, { label: string; chip: string; icon: React.ReactNode; barColor: string }> = {
  RECIBIDO: { label: "Recibido", chip: "bg-gray-100 text-gray-700 border-gray-200", icon: <ClipboardList className="h-3 w-3" />, barColor: "bg-gray-400" },
  VALIDADO: { label: "Validado", chip: "bg-amber-50 text-amber-700 border-amber-200", icon: <CheckCircle className="h-3 w-3" />, barColor: "bg-amber-500" },
  EN_TRANSITO: { label: "En Tránsito", chip: "bg-blue-50 text-blue-700 border-blue-200", icon: <Truck className="h-3 w-3" />, barColor: "bg-blue-500" },
  ENTREGADO: { label: "Entregado", chip: "bg-green-50 text-green-700 border-green-200", icon: <PackageCheck className="h-3 w-3" />, barColor: "bg-green-500" },
  ENTREGADO_PARCIAL: { label: "Entregado Parcial", chip: "bg-orange-50 text-orange-700 border-orange-200", icon: <AlertCircle className="h-3 w-3" />, barColor: "bg-orange-500" }
};

const ESTADOS_ORDEN: EstadoPedidoAF[] = ["RECIBIDO", "VALIDADO", "EN_TRANSITO", "ENTREGADO_PARCIAL", "ENTREGADO"];

const PAGE_SIZE = 9;

function EstadoBadge({ estado }: { estado: EstadoPedidoAF }) {
  const cfg = ESTADO_CFG[estado];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.chip}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function ValidationErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-gray-100"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-9 w-9 text-red-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">No se pudo continuar</h3>
          <p className="text-gray-600 text-sm mb-6">{message}</p>
          <Button onClick={onClose} className="w-full bg-[#2183AE] text-white hover:bg-[#1a6a8f]">
            Entendido
          </Button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

interface FixedAssetsViewProps {
  onBack: () => void;
}

export function FixedAssetsView({ onBack }: FixedAssetsViewProps) {
  const [tab, setTab] = useState<"buscar" | "crear">("buscar");
  const [validationError, setValidationError] = useState<string | null>(null);

  // ---------------- Tiendas (backend real) ----------------
  const [tiendas, setTiendas] = useState<TiendaModulo[]>([]);
  const [loadingTiendas, setLoadingTiendas] = useState(true);
  const [tiendasError, setTiendasError] = useState<string | null>(null);

  useEffect(() => {
    getAllTiendas()
      .then(setTiendas)
      .catch((err: any) => setTiendasError(err?.message || "Error al cargar las tiendas"))
      .finally(() => setLoadingTiendas(false));
  }, []);

  // Durante pruebas se incluyen tiendas inactivas a propósito.
  // Para producción: descomentar el filtro para mostrar solo tiendas activas.
  const tiendasActivasOTodas = tiendas; // .filter((t) => !t.inactiva);

  // vwTiendasModulo devuelve una fila por cada relación tienda-departamento
  // (la primary key real de la vista es id_departamento, no id_tienda), así
  // que una misma tienda puede repetirse varias veces. Para el selector solo
  // interesa una entrada por tienda.
  const tiendasDisponibles = useMemo(() => {
    const vistas = new Set<string>();
    return tiendasActivasOTodas.filter((t) => {
      const id = String(t.id_tienda);
      if (vistas.has(id)) return false;
      vistas.add(id);
      return true;
    });
  }, [tiendasActivasOTodas]);

  const opcionesTiendas = useMemo(
    () => tiendasDisponibles.map((t) => ({ id: String(t.id_tienda), name: t.nombre_tienda })),
    [tiendasDisponibles]
  );

  // ---------------- Buscar ----------------
  const [tiendaBusqueda, setTiendaBusqueda] = useState("");
  const [dateFilterType, setDateFilterType] = useState<"all" | "single" | "range">("all");
  const [singleDate, setSingleDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingBusqueda, setLoadingBusqueda] = useState(false);
  const [resultados, setResultados] = useState<PedidoActivoFijo[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<PedidoActivoFijo | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const handleBuscar = async (targetPage: number = 1) => {
    if (!tiendaBusqueda) {
      setValidationError("Debes seleccionar una tienda para buscar pedidos.");
      return;
    }
    if (dateFilterType === "single" && !singleDate) {
      setValidationError("Debes seleccionar una fecha.");
      return;
    }
    if (dateFilterType === "range" && (!startDate || !endDate)) {
      setValidationError("Debes seleccionar la fecha de inicio y la fecha final del rango.");
      return;
    }

    const tienda = tiendasDisponibles.find((t) => String(t.id_tienda) === tiendaBusqueda);

    if (!tienda) {
      setValidationError("La tienda seleccionada ya no está disponible.");
      return;
    }

    setLoadingBusqueda(true);

    try {
      const respuesta = await buscarPedidosActivoFijo({
        codigo_tienda: tienda.codigo_tienda,
        fecha: dateFilterType === "single" ? singleDate : undefined,
        fecha_inicio: dateFilterType === "range" ? startDate : undefined,
        fecha_fin: dateFilterType === "range" ? endDate : undefined,
        page: targetPage,
        pageSize: PAGE_SIZE
      });

      const pedidosMapeados: PedidoActivoFijo[] = respuesta.data.map((p) => ({
        id: p.pedido_id,
        numero_pedido: p.numero_pedido,
        tienda,
        fecha_creacion: new Date(p.fecha_pedido),
        // La cabecera no guarda quién solicitó el pedido, solo queda en el
        // historial (no lo trae este endpoint). Pendiente si se necesita mostrar.
        solicitado_por: "—",
        estado: p.estado as EstadoPedidoAF,
        items: p.items.map((item) => ({
          codigo_articulo: item.codigo_producto,
          nombre_articulo: item.descripcion_producto,
          unidad_medida: item.unidad_medida,
          cantidad_pedida: Number(item.cantidad_solicitada),
          cantidad_entregada: Number(item.cantidad_asignada) || 0
        }))
      }));

      setResultados(pedidosMapeados);
      setTotalRecords(respuesta.pagination.total);
      setTotalPages(respuesta.pagination.totalPages);
      setPage(respuesta.pagination.page);
      setHasSearched(true);
    } catch (err: any) {
      setValidationError(err?.message || "Error al buscar los pedidos.");
    } finally {
      setLoadingBusqueda(false);
    }
  };

  const handleClearFilters = () => {
    setTiendaBusqueda("");
    setDateFilterType("all");
    setSingleDate("");
    setStartDate("");
    setEndDate("");
    setHasSearched(false);
    setResultados([]);
    setPage(1);
    setTotalPages(1);
    setTotalRecords(0);
  };

  const hasActiveFilters = tiendaBusqueda !== "" || dateFilterType !== "all";
  const pedidosPorEstado = (estado: EstadoPedidoAF) => resultados.filter((p) => p.estado === estado);

  // ---------------- Crear ----------------
  const [tiendaCreacion, setTiendaCreacion] = useState("");
  const [fechaRequerida, setFechaRequerida] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingSap, setLoadingSap] = useState(false);
  const [sapResultados, setSapResultados] = useState<Item[]>([]);
  const [selectedArticulos, setSelectedArticulos] = useState<SelectedArticulo[]>([]);
  const [creando, setCreando] = useState(false);
  const [pedidoCreado, setPedidoCreado] = useState<PedidoActivoFijo | null>(null);

  const tiendaCreacionSeleccionada = tiendasDisponibles.find((t) => String(t.id_tienda) === tiendaCreacion) || null;

  const handleBuscarSap = async () => {
    const term = searchTerm.trim();
    if (!term) return;

    if (term.length < 3) {
      setValidationError("Escribe al menos 3 caracteres para buscar en SAP.");
      return;
    }

    setLoadingSap(true);
    try {
      const data = await buscarActivosFijos(term, 1);
      setSapResultados(data.items);
    } catch (err: any) {
      setValidationError(err?.message || "Error al buscar artículos en SAP.");
    } finally {
      setLoadingSap(false);
    }
  };

  const handleAgregarArticulo = (item: Item) => {
    setSelectedArticulos((prev) => [...prev, { article: item, cantidad: 1 }]);
    setSearchTerm("");
    setSapResultados([]);
  };

  const handleQuitarArticulo = (codigo: string) => {
    setSelectedArticulos((prev) => prev.filter((a) => a.article.ItemCode !== codigo));
  };

  const handleUpdateCantidad = (codigo: string, cantidad: number) => {
    setSelectedArticulos((prev) =>
      prev.map((a) => (a.article.ItemCode === codigo ? { ...a, cantidad } : a))
    );
  };

  const handleCrearPedido = async () => {
    if (!tiendaCreacionSeleccionada) {
      setValidationError("Debes seleccionar una tienda para crear el pedido.");
      return;
    }
    if (selectedArticulos.length === 0) {
      setValidationError("Debes agregar al menos un artículo al pedido.");
      return;
    }
    if (!fechaRequerida) {
      setValidationError("Debes seleccionar la fecha en la que se requiere el pedido.");
      return;
    }

    setCreando(true);

    try {
      const respuesta = await crearPedidoActivoFijo({
        id_tienda: Number(tiendaCreacionSeleccionada.id_tienda),
        codigo_tienda: tiendaCreacionSeleccionada.codigo_tienda,
        nombre_tienda: tiendaCreacionSeleccionada.nombre_tienda,
        codigo_empresa: tiendaCreacionSeleccionada.codigo_empresa,
        fecha_requerida: fechaRequerida,
        items: selectedArticulos.map((a) => ({
          codigo_articulo: a.article.ItemCode,
          nombre_articulo: a.article.ItemName,
          unidad_medida: a.article.SalesUnit,
          cantidad: a.cantidad
        }))
      });

      const nuevo: PedidoActivoFijo = {
        id: respuesta.id_pedido,
        numero_pedido: respuesta.numero_pedido,
        tienda: tiendaCreacionSeleccionada,
        fecha_creacion: new Date(),
        solicitado_por: localStorage.getItem("nombre") || "Usuario",
        estado: (respuesta.estado as EstadoPedidoAF) || "RECIBIDO",
        items: selectedArticulos.map((a) => ({
          codigo_articulo: a.article.ItemCode,
          nombre_articulo: a.article.ItemName,
          unidad_medida: a.article.SalesUnit,
          cantidad_pedida: a.cantidad,
          cantidad_entregada: 0
        }))
      };

      setPedidoCreado(nuevo);
    } catch (err: any) {
      setValidationError(err?.message || "Error al crear el pedido de activo fijo.");
    } finally {
      setCreando(false);
    }
  };

  const handleNuevoPedido = () => {
    setPedidoCreado(null);
    setTiendaCreacion("");
    setFechaRequerida("");
    setSearchTerm("");
    setSapResultados([]);
    setSelectedArticulos([]);
  };

  if (pedidoCreado) {
    return (
      <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
            <div className="text-center mb-6">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h2 className="text-gray-900 mb-1">Pedido de Activo Fijo Creado</h2>
              <p className="text-sm text-gray-600">{pedidoCreado.numero_pedido}</p>
            </div>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tienda</span>
                <span className="text-gray-900 font-medium">{pedidoCreado.tienda.nombre_tienda}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Solicitado por</span>
                <span className="text-gray-900 font-medium">{pedidoCreado.solicitado_por}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fecha</span>
                <span className="text-gray-900 font-medium">
                  {format(pedidoCreado.fecha_creacion, "dd/MM/yyyy HH:mm", { locale: es })}
                </span>
              </div>
            </div>
            <div className="space-y-2 mb-6">
              {pedidoCreado.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">{item.nombre_articulo}</p>
                  <p className="text-xs text-gray-500">Código: {item.codigo_articulo}</p>
                  <p className="text-xs text-gray-500">Cantidad: {item.cantidad_pedida}</p>
                </div>
              ))}
            </div>
            <Button
              onClick={() => {
                handleNuevoPedido();
                setTab("buscar");
              }}
              className="w-full bg-[#2183AE] text-white hover:bg-[#1a6a8f]"
            >
              Volver a la Búsqueda
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-6 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <Landmark className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-white text-lg font-semibold leading-tight">Pedidos de Activos Fijos</h2>
              <p className="text-sm text-white/90">Crea los pedidos de activos fijos para la operación en tiendas</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6 bg-white border border-gray-200 rounded-xl p-1.5 shadow-sm w-fit">
          <button
            onClick={() => setTab("buscar")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === "buscar" ? "bg-[#2183AE] text-white shadow" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Search className="h-4 w-4" /> Buscar Pedidos
          </button>
          <button
            onClick={() => setTab("crear")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              tab === "crear" ? "bg-[#2183AE] text-white shadow" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            <Plus className="h-4 w-4" /> Crear Pedido
          </button>
        </div>

        {tiendasError && (
          <div className="mb-6 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            No se pudieron cargar las tiendas: {tiendasError}
          </div>
        )}

        {tab === "buscar" && (
          <div>
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-4 mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div>
                  <Label className="text-xs text-gray-700 mb-1.5 block">Tienda *</Label>
                  <Combobox
                    options={opcionesTiendas}
                    value={tiendaBusqueda}
                    onChange={setTiendaBusqueda}
                    disabled={loadingTiendas}
                    placeholder={loadingTiendas ? "Cargando tiendas..." : "Seleccione una tienda"}
                    searchPlaceholder="Buscar tienda por nombre..."
                    emptyMessage="No se encontraron tiendas"
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
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#2183AE] focus:border-transparent h-9"
                  >
                    <option value="all">Sin filtro de fecha</option>
                    <option value="single">Una Fecha</option>
                    <option value="range">Rango de fechas</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-gray-700 mb-1.5 block">
                    {dateFilterType === "range" ? "Desde" : "Fecha"}
                  </Label>
                  <Input
                    type="date"
                    value={dateFilterType === "single" ? singleDate : startDate}
                    onChange={(e) => (dateFilterType === "single" ? setSingleDate(e.target.value) : setStartDate(e.target.value))}
                    disabled={dateFilterType === "all"}
                    className="h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700 mb-1.5 block">{dateFilterType === "range" ? "Hasta" : ""}</Label>
                  {dateFilterType === "range" && (
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 text-xs"
                    />
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => handleBuscar(1)}
                  disabled={loadingBusqueda}
                  className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE] flex items-center gap-2"
                  size="sm"
                >
                  {loadingBusqueda ? <Loader2 className="h-3 w-3 animate-spin" /> : <Filter className="h-3 w-3" />}
                  Buscar
                </Button>
                {hasActiveFilters && (
                  <Button onClick={handleClearFilters}
                  variant="outline"
                  size="sm"
                  className="border border-gray-900 bg-gray-900 text-white hover:bg-white hover:text-gray-900"
                  >
                    <XIcon className="h-3 w-3 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
            </div>

            {loadingBusqueda && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center mb-8">
                <div className="w-16 h-16 bg-[#2183AE]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Loader2 className="h-8 w-8 text-[#2183AE] animate-spin" />
                </div>
                <h3 className="text-gray-900 mb-2">Buscando Pedidos</h3>
                <p className="text-gray-600 text-sm">Espera un momento</p>
              </div>
            )}

            {!hasSearched && !loadingBusqueda && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center mb-8">
                <div className="w-16 h-16 bg-[#2183AE]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="h-8 w-8 text-[#2183AE]" />
                </div>
                <h3 className="text-gray-900 mb-2">Selecciona una tienda para buscar</h3>
                <p className="text-gray-600 text-sm">Opcionalmente agrega un filtro de fecha y presiona el botón "Buscar"</p>
              </div>
            )}

            {hasSearched && !loadingBusqueda && resultados.length === 0 && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center mb-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-gray-900 mb-2">No se encontraron pedidos</h3>
                <p className="text-gray-600 text-sm">Ajusta los filtros e intenta nuevamente</p>
              </div>
            )}

            {hasSearched &&
              !loadingBusqueda &&
              ESTADOS_ORDEN.map((estado) => {
                const pedidos = pedidosPorEstado(estado);
                if (pedidos.length === 0) return null;
                const cfg = ESTADO_CFG[estado];

                return (
                  <div key={estado} className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className={`w-1 h-6 rounded-full ${cfg.barColor}`}></div>
                      <h3 className="text-gray-900">{cfg.label}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${cfg.chip}`}>{pedidos.length}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pedidos.map((pedido, index) => (
                        <motion.div
                          key={pedido.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.3 }}
                          className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                        >
                          <div className="p-4 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] text-white">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-bold">{pedido.numero_pedido}</h4>
                            </div>
                            <div className="text-xs opacity-90">
                              <div className="flex items-center gap-1 mb-1">
                                <Building2 className="h-3 w-3" />
                                <span>{pedido.tienda.nombre_tienda}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                <span>{format(pedido.fecha_creacion, "dd/MM/yyyy HH:mm", { locale: es })}</span>
                              </div>
                            </div>
                          </div>
                          <div className="p-4">
                            <div className="mb-4 flex items-center justify-between">
                              <div>
                                <p className="text-xs text-gray-600 mb-1">Artículos</p>
                                <p className="text-2xl font-bold text-gray-900">{pedido.items.length}</p>
                              </div>
                              <EstadoBadge estado={pedido.estado} />
                            </div>
                            <Button
                              onClick={() => setSelectedPedido(pedido)}
                              variant="outline"
                              size="sm"
                              className="w-full border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                            >
                              <Eye className="h-3 w-3 mr-1" /> Ver Detalle
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })}

            {hasSearched && totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-4">
                <Button variant="outline" disabled={page === 1} onClick={() => handleBuscar(page - 1)}>
                  Anterior
                </Button>
                <div className="text-sm text-gray-600">
                  Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalRecords} pedidos)
                </div>
                <Button variant="outline" disabled={page === totalPages} onClick={() => handleBuscar(page + 1)}>
                  Siguiente
                </Button>
              </div>
            )}
          </div>
        )}

        {tab === "crear" && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-[#2183AE] flex items-center justify-center shadow-md">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Seleccionar Tienda</h3>
                  <p className="text-xs text-gray-600">Primero selecciona la tienda para habilitar la búsqueda de artículos</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-gray-700 mb-1.5 block">Tienda *</Label>
                  <Combobox
                    options={opcionesTiendas}
                    value={tiendaCreacion}
                    onChange={setTiendaCreacion}
                    disabled={loadingTiendas}
                    placeholder={loadingTiendas ? "Cargando tiendas..." : "Seleccione una tienda"}
                    searchPlaceholder="Buscar tienda por nombre..."
                    emptyMessage="No se encontraron tiendas"
                    className="h-11"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-700 mb-1.5 block">Fecha Requerida *</Label>
                  <Input
                    type="date"
                    value={fechaRequerida}
                    onChange={(e) => setFechaRequerida(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                    className="h-11"
                  />
                </div>
              </div>
              {!tiendaCreacionSeleccionada && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                >
                  Debes seleccionar una tienda antes de buscar artículos
                </motion.div>
              )}
            </div>

            <div className={!tiendaCreacionSeleccionada ? "opacity-50 pointer-events-none select-none" : ""}>
              <div className="mb-6">
                <Label className="text-sm font-medium text-gray-900 mb-2 block">Buscar Activo Fijo en SAP</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleBuscarSap()}
                      placeholder="Buscar por nombre del artículo..."
                      className="pl-10"
                    />
                  </div>
                  <Button
                    onClick={handleBuscarSap}
                    disabled={loadingSap || !searchTerm.trim()}
                    className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                  >
                    {loadingSap ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                  </Button>
                </div>
              </div>

              {sapResultados.length > 0 && (
                <div className="mb-8 border border-gray-200 rounded-lg overflow-hidden">
                  <div className="p-3 bg-gray-50 border-b">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Resultados de búsqueda</span>
                  </div>
                  <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto">
                    {sapResultados.map((item) => (
                      <motion.div
                        key={item.ItemCode}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{item.ItemName}</p>
                          <p className="text-xs text-gray-500 font-mono">{item.ItemCode}</p>
                        </div>
                        <Button
                          onClick={() => handleAgregarArticulo(item)}
                          disabled={selectedArticulos.some((a) => a.article.ItemCode === item.ItemCode)}
                          size="sm"
                          variant="outline"
                          className="border-[#2183AE] text-[#2183AE] hover:bg-[#2183AE] hover:text-white"
                        >
                          <Plus className="h-4 w-4 mr-1" /> Agregar
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {selectedArticulos.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Package className="h-4 w-4 text-[#2183AE]" /> Artículos del Pedido
                </h3>
                <div className="space-y-2 mb-6">
                  {selectedArticulos.map((item) => (
                    <div key={item.article.ItemCode} className="border border-gray-200 rounded-lg p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.article.ItemName}</p>
                        <p className="text-xs text-gray-500 font-mono">{item.article.ItemCode}</p>
                      </div>
                      <div className="w-24">
                        <Label className="text-[10px] uppercase font-bold text-gray-500">Cantidad</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.cantidad}
                          onChange={(e) => handleUpdateCantidad(item.article.ItemCode, parseInt(e.target.value) || 1)}
                          className="h-8 text-sm mt-1"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleQuitarArticulo(item.article.ItemCode)}
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={handleCrearPedido}
                  disabled={creando}
                  className="w-full border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                >
                  {creando ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Crear Pedido de Activo Fijo"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={!!selectedPedido} onOpenChange={(open) => !open && setSelectedPedido(null)}>
        <DialogContent className="sm:max-w-lg bg-white">
          {selectedPedido && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  {selectedPedido.numero_pedido}
                  <EstadoBadge estado={selectedPedido.estado} />
                </DialogTitle>
                <DialogDescription>
                  {selectedPedido.tienda.nombre_tienda} · Solicitado por {selectedPedido.solicitado_por} ·{" "}
                  {format(selectedPedido.fecha_creacion, "dd/MM/yyyy HH:mm", { locale: es })}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {selectedPedido.items.map((item, index) => {
                  const completo = item.cantidad_entregada >= item.cantidad_pedida;
                  return (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900">{item.nombre_articulo}</p>
                      <p className="text-xs text-gray-500 font-mono mb-2">{item.codigo_articulo}</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-[10px] text-gray-500 uppercase font-bold">Pedido</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {item.cantidad_pedida} {item.unidad_medida}
                          </p>
                        </div>
                        <div className={`rounded-lg p-2 ${completo ? "bg-green-50" : "bg-orange-50"}`}>
                          <p className={`text-[10px] uppercase font-bold ${completo ? "text-green-700" : "text-orange-700"}`}>
                            Entregado
                          </p>
                          <p className={`text-sm font-semibold ${completo ? "text-green-800" : "text-orange-800"}`}>
                            {item.cantidad_entregada} {item.unidad_medida}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {validationError && <ValidationErrorModal message={validationError} onClose={() => setValidationError(null)} />}
    </div>
  );
}
