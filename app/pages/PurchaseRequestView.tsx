import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState } from 'react';
import {
    ChevronUp,
    ChevronDown,
    Plus,
    Package,
    CheckCircle,
    Trash2,
    FileText,
    Loader2,
    CalendarIcon,
    Search,
    PackagePlus,
    Upload,
    ImageIcon,
    X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover'
import { Calendar } from '../ui/calendar'
import { format } from "date-fns";
import { Item } from "../types/SapModels";
import { crearSolicitudCompra } from "../api/SolicitudApi";
import { buscarProductosPorNombre } from "../api/SapApi";
import { EmpresaModel } from "../types/EmpresaModel";
import { getEmpresasActivas } from "../api/EmpresaApi";
import { es } from "date-fns/locale";

interface SelectedItem {
  article: Item;
  quantity: number;
  comment: string;
  image?: File;
  imagePreview?: string;
  imageName?: string;
}

interface PurchaseRequest {
  id: string;
  date: Date;
  user: string;
  justification: string;
  articles: SelectedItem[];
  totalItems: number;
}

interface PurchaseRequestProps {
  onBack: () => void;
}

export function PurchaseRequestView({ onBack }: PurchaseRequestProps) {
    const [selectedArticles, setSelectedArticles] = useState<SelectedItem[]>([]);
    const [justification, setJustification] = useState("");
    const [showSummary, setShowSummary] = useState(false);
    const [currentRequest, setCurrentRequest] = useState<PurchaseRequest | null>(null);
    const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());
    const [items, setItems] = useState<Item[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [newItemName, setNewItemName] = useState("");
    const [newItemQuantity, setNewItemQuantity] = useState(1);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [paginationInfo, setPaginationInfo] = useState<any>(null);
    const [orderDate, setOrderDate] = useState<Date>();
    const userName = localStorage.getItem("nombre");
    const hasFixedAsset = selectedArticles.some(a => a.article.ItemCode === '--');
    const [empresas, setEmpresas] = useState<EmpresaModel[] | []>([]);
    const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaModel | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const fetchEmpresas = async () => {
        try {
            const data = await getEmpresasActivas();
            setEmpresas(data);
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
        fetchEmpresas();
    }, [])

    const handleSearch = async (pageToLoad: number = 1) => {
        if (!searchTerm.trim()) return;
        setLoading(true);
        try {
            const data = await buscarProductosPorNombre(searchTerm, pageToLoad, selectedEmpresa?.id || "");
            setItems(data.items);
            setPaginationInfo(data.pagination);
            setCurrentPage(pageToLoad);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddArticle = (article: Item) => {
        const articleToProcess = { ...article };

        if (articleToProcess.ItemCode && articleToProcess.ItemCode.startsWith('AF')) {
            articleToProcess.ItemCode = '--'
            articleToProcess.SalesUnit = 'Unidad';
        }

        const alreadySelected = selectedArticles.find(
            (item) => item.article.ItemCode === articleToProcess.ItemCode
        );

        if (alreadySelected && articleToProcess.ItemCode !== '--') {
            alert("Este artículo ya fue agregado a la solicitud");
            return;
        }

        setSelectedArticles([
            ...selectedArticles,
            {
                article: articleToProcess,
                quantity: 1,
                comment: ""
            }
        ]);
    };

    const handleRemoveArticle = (articleId: string, index: number) => {
        setSelectedArticles(selectedArticles.filter((_, i) => i !== index));
    };

    const handleUpdateArticle = (
        index: number,
        field: keyof SelectedItem,
        value: any
    ) => {
        setSelectedArticles(selectedArticles.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        let es_activo = false;

        if (!selectedEmpresa) {
            alert("Debe seleccionar una empresa");
            return;
        }

        if (selectedArticles.length === 0) {
            alert("Debe seleccionar al menos un artículo");
            return;
        }
        if (!justification.trim()) {
            alert("Debe proporcionar una justificación");
            return;
        }
        if (!orderDate) {
            alert("Debe seleccionar una fecha de entrega");
            return;
        }

        setLoading(true);

        try {
            if (hasFixedAsset) {
                es_activo = true;
            }

            const payload = {
                header: {
                    empresa: selectedEmpresa,
                    justificacion: justification,
                    fecha_requerida: orderDate ? format(orderDate, "yyyy-MM-dd") : null,
                    estrategia_adquisicion_id: null,
                    es_activo_fijo: es_activo
                },
                items: selectedArticles.map((item) => ({
                    codigo_articulo: item.article.ItemCode,
                    nombre_articulo: item.article.ItemName,
                    unidad_medida: item.article.SalesUnit,
                    descripcion: item.article.ItemName,
                    cantidad: item.quantity,
                    notas: item.comment
                }))
            };

            const formData = new FormData();

            formData.append('header', JSON.stringify(payload.header));
            formData.append('items', JSON.stringify(payload.items));

            selectedArticles.forEach((item, index) => {
                if (item.image) {
                    formData.append(`imagen_${index}`, item.image);
                }
            });

            const result = await crearSolicitudCompra(formData);

            const requestConfirmed: PurchaseRequest = {
                id: result.numero_requisicion,
                date: new Date(),
                user: userName || "Desconocido",
                justification,
                articles: selectedArticles,
                totalItems: selectedArticles.length
            };

            setCurrentRequest(requestConfirmed);
            setShowSummary(true);

        } catch (err: any) {
            alert("Error al guardar: " + err.message);
        } finally {
            setLoading(false);
            window.scrollTo(0, 0);
        }
    };

    const handleNewRequest = () => {
        setSelectedArticles([]);
        setJustification("");
        setShowSummary(false);
        setCurrentRequest(null);
        setItems([]);
        setSearchTerm("");
    };

    const handleAddManualItem = () => {
        if (!newItemName.trim()) {
            alert("Debe ingresar un nombre para el item");
            return;
        }

        const newItem: Item = {
            ItemCode: '--',
            ItemName: newItemName,
            SalesUnit: 'Unidad'
        };

        setSelectedArticles([...selectedArticles, {
            article: newItem,
            quantity: newItemQuantity,
            comment: ""
        }]);
        setNewItemName("");
        setNewItemQuantity(1);
    };

    const handleImageUpload = (
        articleCode: string,
        index: number,
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Por favor selecciona un archivo de imagen válido');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert('La imagen no debe superar los 5MB');
            return;
        }

        const previewUrl = URL.createObjectURL(file);

        setSelectedArticles(prev =>
            prev.map((item, i) =>
                i === index && item.article.ItemCode === articleCode
                ? {
                    ...item,
                    image: file,
                    imagePreview: previewUrl,
                    imageName: file.name
                }
                : item
            )
        );
    };

    const handleRemoveImage = (articleCode: string, index: number) => {
        setSelectedArticles(prev =>
            prev.map((item, i) =>
                i === index && item.article.ItemCode === articleCode
                ? {
                    ...item,
                    image: undefined,
                    imagePreview: undefined,
                    imageName: undefined
                }
                : item
            )
        );
    };

    if (showSummary && currentRequest) {
        return (
            <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
                <div className="w-full max-w-3xl mx-auto">
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                        
                        <div className="text-center mb-6">
                            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                            <h2 className="text-gray-900 mb-1">Solicitud Creada</h2>
                            <p className="text-sm text-gray-600">{currentRequest.id}</p>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Usuario</span>
                                <span className="text-gray-900 font-medium">{currentRequest.user}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Fecha</span>
                                <span className="text-gray-900 font-medium">
                                    {format(currentRequest.date, "dd/MM/yyyy HH:mm", { locale: es })}
                                </span>
                            </div>
                            <div className="pt-4 border-t">
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-600">Artículos</p>
                                        <p className="text-2xl font-bold text-gray-900">{currentRequest.totalItems}</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <p className="text-xs text-gray-600">Total de Artículos</p>
                                        <p className="text-2xl font-bold text-gray-900">{currentRequest.articles.reduce((acc, item) => acc + item.quantity, 0)}</p>
                                    </div>
                                </div>
                            </div>
                            {currentRequest.articles.map((item, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{item.article.ItemName}</p>
                                            <p className="text-xs text-gray-500">Código de Artículo: {item.article.ItemCode}</p>
                                            <p className="text-xs text-gray-500">Cantidad: {item.quantity}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <Button
                            onClick={handleNewRequest}
                            className="w-full mt-6 bg-[#2183AE] text-white hover:bg-[#1a6a8f]"
                        >
                            Nueva Solicitud
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
            <div className="w-full max-w-4xl mx-auto">
                <div className="mb-2 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl shadow-lg p-6 text-white">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <PackagePlus className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-white mb-0 text-lg">Nueva Solicitud de Compra</h2>
                            <p className="text-sm text-white/90">
                                Agrega artículos manualmente o búscalos en el catálogo
                            </p>
                        </div>
                    </div>
                </div>
                <div className="mb-2">
                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-lg">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-[#2183AE] flex items-center justify-center shadow-md">
                                <Package className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">
                                    Seleccionar Empresa
                                </h3>
                                <p className="text-xs text-gray-600">
                                    Primero selecciona la empresa para habilitar la creación de artículos
                                </p>
                            </div>
                        </div>
                        <div className="relative">
                            <select
                            value={selectedEmpresa?.id}
                            onChange={(e) => {
                                const empresaSeleccionada = empresas.find(
                                    (empresa) => empresa.id === e.target.value
                                ) || null;

                                setSelectedEmpresa(empresaSeleccionada);
                            }}
                            className="
                                w-full
                                h-11
                                rounded-xl
                                border
                                border-gray-300
                                bg-white
                                px-4
                                text-sm
                                font-medium
                                text-gray-900
                                shadow-sm
                                transition-all
                                focus:border-[#2183AE]
                                focus:ring-2
                                focus:ring-[#2183AE]/20
                                outline-none"
                            >
                                <option value="">Seleccione una empresa</option>
                                {empresas.map((company) => (
                                    <option key={company.id} value={company.id}>
                                        {company.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {!selectedEmpresa && (
                            <motion.div
                                initial={{ opacity: 0, y: -5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
                            >
                                Debes seleccionar una empresa antes de agregar artículos
                            </motion.div>
                        )}
                    </div>
                </div>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6">
                    <div className={!selectedEmpresa ? "opacity-50 pointer-events-none select-none" : ""}>
                    <div className="mb-8 bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Plus className="h-4 w-4 text-[#2183AE]" /> Agregar Artículo Manual (No catálogo)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                            <div className="sm:col-span-2">
                                <Label className="text-xs text-gray-700">Nombre del Artículo</Label>
                                <Input
                                    value={newItemName}
                                    onChange={(e) => setNewItemName(e.target.value)}
                                    placeholder="Ej: Computadora Dell"
                                    className="mt-1 h-9 bg-white"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-gray-700">Cantidad</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={newItemQuantity}
                                    onChange={(e) => setNewItemQuantity(parseInt(e.target.value) || 1)}
                                    className="mt-1 h-9 bg-white"
                                />
                            </div>
                            <div className="flex items-end">
                                <Button
                                    onClick={handleAddManualItem}
                                    className="w-full mt-3 border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                                    disabled={!newItemName.trim()}
                                >
                                    Agregar
                                </Button>
                            </div>
                        </div>
                    </div>
                    <div className="mb-6">
                        <Label className="text-sm font-medium text-gray-900 mb-2 block">Buscar en Catálogo SAP</Label>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
                                    placeholder="Buscar por nombre de producto..."
                                    className="pl-10"
                                />
                            </div>
                            <Button 
                                onClick={() => handleSearch(1)} 
                                disabled={loading || !searchTerm.trim()}
                                className="border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                            >
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Buscar"}
                            </Button>
                        </div>
                    </div>
                    <div className="mb-8">
                        {items.length > 0 && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="p-3 bg-gray-50 border-b flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Resultados de búsqueda</span>
                                    {paginationInfo && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{paginationInfo.totalCount} encontrados</span>}
                                </div>
                                <div className="p-2 space-y-1 max-h-[300px] overflow-y-auto relative">
                                    {items.map((item) => (
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
                                                onClick={() => handleAddArticle(item)}
                                                disabled={selectedArticles.some(a => a.article.ItemCode === item.ItemCode)}
                                                size="sm"
                                                variant="outline"
                                                className="border-[#2183AE] text-[#2183AE] hover:bg-blue-50"
                                            >
                                                <Plus className="h-4 w-4 mr-1" /> Seleccionar
                                            </Button>
                                        </motion.div>
                                    ))}
                                </div>
                                {paginationInfo && paginationInfo.totalCount > paginationInfo.pageSize && (
                                    <div className="flex items-center justify-between p-3 border-t bg-white">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={currentPage === 1 || loading}
                                            onClick={() => handleSearch(currentPage - 1)}
                                            className="text-xs"
                                        >
                                            Anterior
                                        </Button>
                                        <span className="text-[10px] text-gray-500">Pág. {currentPage}</span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={!paginationInfo.nextPage || loading}
                                            onClick={() => handleSearch(currentPage + 1)}
                                            className="text-xs"
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    </div>
                    {selectedArticles.length > 0 && (
                        <form onSubmit={handleSubmit} className="border-t pt-6">
                            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Package className="h-4 w-4 text-[#2183AE]" /> Artículos en la Solicitud
                            </h3>
                            <div className="space-y-2 mb-6">
                                {selectedArticles.map((item, index) => {
                                    const isExpanded = expandedArticles.has(`${item.article.ItemCode}-${index}`);
                                    const itemKey = `${item.article.ItemCode}-${index}`;
                                    
                                    return (
                                        <div key={itemKey} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                                            <div className="flex items-center justify-between p-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newExpanded = new Set(expandedArticles);
                                                        if (newExpanded.has(itemKey)) newExpanded.delete(itemKey);
                                                        else newExpanded.add(itemKey);
                                                        setExpandedArticles(newExpanded);
                                                    }}
                                                    className="flex-1 flex items-center justify-between text-left"
                                                >
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-gray-900">{item.article.ItemName}</p>
                                                        <p className="text-[10px] text-gray-500">Cant: {item.quantity} | {item.article.ItemCode}</p>
                                                    </div>
                                                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                                                </button>
                                                <Button
                                                    type="button"
                                                    onClick={() => handleRemoveArticle(item.article.ItemCode, index)}
                                                    variant="ghost"
                                                    size="sm"
                                                    className="ml-2 text-red-500 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden bg-gray-50 border-t"
                                                    >
                                                        <div className="p-3 space-y-3 bg-gray-100">
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div>
                                                                    <Label className="text-[10px] uppercase font-bold text-gray-500">Cantidad</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        value={item.quantity}
                                                                        onChange={(e) => handleUpdateArticle(index, "quantity", parseInt(e.target.value) || 1)}
                                                                        className="h-8 text-sm mt-1 bg-white"
                                                                    />
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <Label className="text-[10px] uppercase font-bold text-gray-500">Comentarios / Especificaciones</Label>
                                                                <Textarea
                                                                    value={item.comment}
                                                                    onChange={(e) => handleUpdateArticle(index, "comment", e.target.value)}
                                                                    placeholder="Notas adicionales..."
                                                                    className="text-sm mt-1 bg-white"
                                                                    rows={2}
                                                                />
                                                            </div>
                                                            <div>
                                  <Label className="text-xs text-gray-700">Imagen de Referencia (Opcional)</Label>
                                  {!item.image ? (
                                    <div className="mt-1">
                                      <label htmlFor={`image-${item.article.ItemCode}`} className="cursor-pointer">
                                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-3 hover:border-[#2183AE] hover:bg-[#2183AE]/5 transition-colors">
                                          <div className="flex items-center justify-center gap-2 text-gray-600">
                                            <Upload className="h-4 w-4" />
                                            <span className="text-xs">Cargar imagen (máx. 5MB)</span>
                                          </div>
                                        </div>
                                      </label>
                                      <input
                                        id={`image-${item.article.ItemCode}`}
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => handleImageUpload(item.article.ItemCode, index, e)}
                                        className="hidden"
                                      />
                                    </div>
                                  ) : (
                                    <div className="mt-1 relative">
                                      <div className="border border-gray-300 rounded-lg p-2 bg-white">
                                        <div className="flex items-start gap-3">
                                          <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                            <img
                                              src={item.imagePreview}
                                              alt={item.imageName || 'Imagen del artículo'}
                                              className="w-full h-full object-cover"
                                            />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                              <div className="flex-1 min-w-0">
                                                <p className="text-xs text-gray-900 font-medium truncate flex items-center gap-1">
                                                  <ImageIcon className="h-3 w-3 text-[#2183AE]" />
                                                  {item.imageName || 'Imagen'}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-0.5">Imagen adjunta</p>
                                              </div>
                                              <Button
                                                type="button"
                                                onClick={() => handleRemoveImage(item.article.ItemCode, index)}
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                              >
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <Label className="text-sm text-gray-900 mb-2 flex items-center gap-2">
                                        <FileText className="h-4 w-4 text-[#2183AE]" /> Justificación *
                                    </Label>
                                    <Textarea
                                        value={justification}
                                        onChange={(e) => setJustification(e.target.value)}
                                        placeholder="Razón de la solicitud..."
                                        className="h-[100px]"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label className="text-sm text-gray-900 mb-2 block">Fecha de Entrega Requerida *</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start text-left font-normal h-10 bg-white"
                                            >
                                                <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                                {orderDate ? format(orderDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                // mode="single"
                                                selected={orderDate}
                                                onSelect={setOrderDate}
                                                // initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full border border-[#2183AE] bg-[#2183AE] text-white hover:bg-white hover:text-[#2183AE]"
                                disabled={loading}
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : "Enviar Solicitud de Compra"}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}