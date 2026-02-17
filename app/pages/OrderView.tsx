import { useEffect, useState } from "react";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Combobox } from "../ui/combobox";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { CalendarIcon, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { format, set } from "date-fns";
import { es } from "date-fns/locale";
import { getAllTiendas } from "../api/TiendaApi";
import { getAllTipoPedidoEnvio } from "../api/PedidoEnvioApi";
import { TiendaModulo } from "../types/TiendaModel";
import { TipoPedidoEnvioModel } from "../types/TipoPedidoEnvio";
import { validarYObtenerPedido, createPedido } from "../api/PedidoApi";
import { ValidarPedidoResponse } from "../types/SapModels";

// Categorías de Pollo
interface ChickenCategory {
  id: string;
  name: string;
  products: string[];
}

const chickenCategories: ChickenCategory[] = [
  {
    id: "pollo-grande",
    name: "Pollo Grande",
    products: ["Pollo Grande Tradicional", "Pollo Grande Picante"]
  },
  {
    id: "pollo-estandar",
    name: "Pollo Estándar",
    products: ["Pollo Estándar Tradicional", "Pollo Estándar Picante", "Pollo Estándar Artesanal"]
  },
  {
    id: "visceras-especialidades",
    name: "Vísceras y Especialidades",
    products: ["Molleja", "Hígado", "Patitas", "Pescuezo", "Cuadrilla", "Alitas"]
  },
  {
    id: "piezas-especiales",
    name: "Piezas Especiales",
    products: ["Lasaña", "Pechuga sin Ala"]
  },
  {
    id: "cortesia",
    name: "Cortesía",
    products: ["Hígado de Cortesía", "Cuadrilito Cortesía", "Patitas Cortesía"]
  },
];

// Categorías de Insumos
interface SupplyProduct {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  lastOrderDate: string;
}

interface SupplyCategory {
  id: string;
  name: string;
  products: SupplyProduct[];
}

type OrderQuantities = Record<string, number>;

interface OrderViewProps {
  onBack: () => void;
}

export function OrderView({ onBack }: OrderViewProps) {
  const [stores, setStores] = useState<TiendaModulo []>([]);
  const [selectedStore, setSelectedStore] = useState<TiendaModulo | null>(null);
  const [selectedOrderType, setSelectedOrderType] = useState<TipoPedidoEnvioModel | null>(null);
  const [orderTypes, setOrderTypes] = useState<TipoPedidoEnvioModel[]>([]);
  const [orderDate, setOrderDate] = useState<Date>();
  const [showTable, setShowTable] = useState(false);
  const [chickenQuantities, setChickenQuantities] = useState<OrderQuantities>({});
  const [supplyQuantities, setSupplyQuantities] = useState<OrderQuantities>({});
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [supplyCategories, setSupplyCategories] = useState<ValidarPedidoResponse>();
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTiendas = async () => {
    const data = await getAllTiendas();
    setStores(data);
  }

  const fetchOrderTypes = async () => {
    const data = await getAllTipoPedidoEnvio();
    setOrderTypes(data);
  }

  const fetchInsumos = async () => {
    setLoading(true);
    if(!selectedStore || !orderDate || !selectedOrderType) return;

    try {
      const fechaFormateada = format(orderDate, "yyyy-MM-dd");

      const data = await validarYObtenerPedido(
        selectedStore.id_departamento.toString(),
        fechaFormateada,
        selectedOrderType.id_tipo
      );

      setPedidoId(data.id_pedido);
      setSupplyCategories(data);

      const nuevasCantidades: OrderQuantities = {};
      data.categorias.forEach((cat: any) => {
        cat.products.forEach((prod: any) => {
          nuevasCantidades[prod.id] = prod.cantidad || 0;
        });
      });
      setSupplyQuantities(nuevasCantidades);
      setLoading(false);
      return data.categorias;
    } catch (error: any) {
      setLoading(false);
      alert(`Error al validar: ${error.message}`);
      return null;
    }
  }

  useEffect(() => {
    try {
      fetchTiendas();
      fetchOrderTypes();
    } catch (error: any) {
      alert(`Error al cargar las información: ${error.message}`);
    }
  }, []);

  const handleChickenQuantityChange = (product: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setChickenQuantities(prev => ({
      ...prev,
      [product]: numValue
    }));
  };

  const handleSupplyQuantityChange = (productId: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setSupplyQuantities(prev => ({...prev, [productId]: numValue}));
  };

  const handleValidate = async () => {
    const categorias = await fetchInsumos()
    
    if (categorias) {
      setShowTable(true);
      const collapsed: Record<string, boolean> = {};
      categorias.forEach(cat => {
        collapsed[cat.id] = false;
      });
      setExpandedCategories(collapsed);
    }
  };

  const handleSubmit = async () => {
    if (selectedStore && selectedOrderType && orderDate) {
      const isPollo = selectedOrderType.nombre === "Pedido de Pollo";
      const sourceQuantities = isPollo ? chickenQuantities : supplyQuantities;

      //Se filtran solo los articulos con cantidad mayor a 0
      const detallePedido = Object.entries(sourceQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([id, qty]) => {
        let name = id;
        let unit = "UND";

        if(!isPollo) {
          const productosData = supplyCategories?.categorias
          .flatMap(cat => cat.products)
          .find(p => p.id === id);
  
          if(productosData) {
            name = productosData.name;
            unit = productosData.salesUnit;
          }

          return {
            codigo_articulo: id,
            nombre_articulo: name,
            cantidad: qty,
            unidad_medida: unit
          }
        }
      })

      const pedidoCompleto = {
        header: {
          ...(pedidoId ? {id_pedido: pedidoId} : {}),
          id_tienda: selectedStore.id_departamento.toString(),
          id_tipo: selectedOrderType.id_tipo.toString(),
          fecha_requerida: format(orderDate, "yyyy-MM-dd"),
          id_supervisor: '742cf436-2d88-40bc-a656-191ade65ecf0',
          total_productos: detallePedido.length,
          id_estado_pedido: 1
        },
        items: detallePedido
      };

      try {
        setLoading(true);
        const response = await createPedido(pedidoCompleto);

        setPedidoId(response.id_pedido);
        setShowSuccessModal(true);
      } catch (error: any) {
       alert(`Error al enviar pedido:  ${error.message}`);
      }
      finally{
        setLoading(false);
      }
    }
  };

  const handleReset = () => {
    setSelectedStore(null);
    setSelectedOrderType(null);
    setOrderDate(undefined);
    setShowTable(false);
    setChickenQuantities({});
    setSupplyQuantities({});
    setExpandedCategories({});
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => ({...prev, [categoryId]: !prev[categoryId]}));
  };

  const canValidate = selectedStore && selectedOrderType && orderDate;
  const canSubmit = showTable && (
    (selectedOrderType?.nombre === "Pedido de Pollo" && 
      Object.values(chickenQuantities).some(qty => qty > 0)) ||
    (selectedOrderType?.nombre === "Pedido de Insumos" && 
      Object.values(supplyQuantities).some(qty => qty > 0))
  );

  return (
    <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-gray-900 mb-2">Crear Pedido</h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Selecciona la tienda, tipo de pedido y completa los detalles
            </p>
          </div>
          <div className="space-y-4 sm:space-y-5 mb-6">
            <div>
              <Label htmlFor="store" className="text-gray-900 mb-2 block">Tienda</Label>
              <Combobox
                options={stores.map(store => ({ id: store.id_departamento.toString(), name: store.nombre_tienda }))}
                value={selectedStore?.id_departamento.toString() || ""}
                onChange={(value) => {
                  setSelectedStore(stores.find(store => store.id_departamento.toString() === value) || null);
                  setShowTable(false);
                }}
                placeholder="Seleccionar tienda"
                searchPlaceholder="Buscar tienda..."
                emptyMessage="No se encontró la tienda"
              />
            </div>
            <div>
              <Label htmlFor="orderType" className="text-gray-900 mb-2 block">Tipo de Pedido</Label>
              <Combobox
                options={orderTypes.map(type => ({ id: type.id_tipo.toString(), name: type.nombre }))}
                value={selectedOrderType?.id_tipo.toString() || ""}
                onChange={(value) => {
                  setSelectedOrderType(orderTypes.find(type => type.id_tipo.toString() === value) || null);
                  setShowTable(false);
                  setChickenQuantities({});
                  setSupplyQuantities({});
                }}
                placeholder="Seleccionar tipo de pedido"
                searchPlaceholder="Buscar tipo..."
                emptyMessage="No se encontró el tipo"
              />
            </div>
            <div>
              <Label className="text-gray-900 mb-2 block">
                {selectedOrderType?.nombre === "Pedido de Pollo" ? "Fecha de Entrega" : "Fecha del Pedido"}
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className="w-full justify-start text-left bg-white border border-gray-300 hover:bg-gray-50 text-gray-900"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {orderDate ? (
                      format(orderDate, "PPP", { locale: es })
                    ) : (
                      <span className="text-gray-500">Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    selected={orderDate}
                    onSelect={setOrderDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          {canValidate && !showTable && (
            <div className="border-t border-gray-200 pt-6">
              <Button
                onClick={handleValidate}
                className="bg-[#2183AE] text-white hover:bg-[#1a6a8f] w-full"
                disabled={loading}
              >
                {loading ? "Cargando" : "Validar Pedido"}
              </Button>
            </div>
          )}
          {showTable && selectedOrderType?.nombre === "Pedido de Pollo" && (
            <div className="border-t border-gray-200 pt-6">
              <div className="mb-4">
                <h3 className="text-white text-center p-4 bg-gradient-to-br from-[#2183AE] to-[#1a6a8f] rounded-xl">
                  {selectedOrderType?.nombre} - {selectedStore?.nombre_tienda}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="hidden lg:block">
                  {chickenCategories.map((category) => (
                    <Collapsible
                      key={category.id}
                      open={expandedCategories[category.id]}
                      onOpenChange={() => toggleCategory(category.id)}
                      className="border border-gray-200 rounded-xl mb-3 overflow-hidden"
                    >
                      <CollapsibleTrigger className="w-full bg-gray-100 hover:bg-gray-200 transition-colors">
                        <div className="flex items-center justify-between p-4">
                          <span className="text-gray-900">{category.name}</span>
                          {expandedCategories[category.id] ? (
                            <ChevronUp className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-gray-300 p-3 text-left text-gray-900">Producto</th>
                                <th className="border border-gray-300 p-3 text-center text-gray-900">Cantidad</th>
                              </tr>
                            </thead>
                            <tbody>
                              {category.products.map((product, idx) => (
                                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                  <td className="border border-gray-300 p-3 text-gray-900">
                                    {product}
                                  </td>
                                  <td className="border border-gray-300 p-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={chickenQuantities[product] || ""}
                                      onChange={(e) => handleChickenQuantityChange(product, e.target.value)}
                                      className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2183AE] focus:border-transparent text-gray-900"
                                      placeholder="0"
                                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
                <div className="lg:hidden space-y-3">
                  {chickenCategories.map((category) => (
                    <Collapsible
                      key={category.id}
                      open={expandedCategories[category.id]}
                      onOpenChange={() => toggleCategory(category.id)}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      <CollapsibleTrigger className="w-full bg-gray-100 hover:bg-gray-200 transition-colors">
                        <div className="flex items-center justify-between p-4">
                          <span className="text-gray-900">{category.name}</span>
                          {expandedCategories[category.id] ? (
                            <ChevronUp className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 space-y-2">
                          {category.products.map((product, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2">
                              <label className="text-gray-700 text-sm flex-1">
                                {product}
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={chickenQuantities[product] || ""}
                                onChange={(e) => handleChickenQuantityChange(product, e.target.value)}
                                className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2183AE] focus:border-transparent text-gray-900"
                                placeholder="0"
                                onWheel={(e) => (e.target as HTMLInputElement).blur()}
                              />
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            </div>
          )}
          {showTable && selectedOrderType?.nombre === "Pedido de Insumos" && (
            <div className="border-t border-gray-200 pt-6">
              <div className="mb-4">
                <h3 className="text-white text-center p-4 bg-gradient-to-br from-[#2183AE] to-[#1a6a8f] rounded-xl">
                  {selectedOrderType?.nombre} - {selectedStore?.nombre_tienda}
                </h3>
              </div>
              <div className="space-y-3">
                <div className="hidden lg:block">
                  {supplyCategories?.categorias.map((category) => (
                    <Collapsible
                      key={category.id}
                      open={expandedCategories[category.id]}
                      onOpenChange={() => toggleCategory(category.id)}
                      className="border border-gray-200 rounded-xl mb-3 overflow-hidden"
                    >
                      <CollapsibleTrigger className="w-full bg-gray-100 hover:bg-gray-200 transition-colors">
                        <div className="flex items-center justify-between p-4">
                          <span className="text-gray-900">{category.name}</span>
                          {expandedCategories[category.id] ? (
                            <ChevronUp className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-gray-300 p-3 text-left text-gray-900">Producto</th>
                                <th className="border border-gray-300 p-3 text-center text-gray-900">Unidad de Medida</th>
                                <th className="border border-gray-300 p-3 text-center text-gray-900">Cantidad</th>
                              </tr>
                            </thead>
                            <tbody>
                              {category.products.map((product, idx) => (
                                <tr key={product.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                  <td className="border border-gray-300 p-3 text-gray-900">
                                    {product.name}
                                  </td>
                                  <td className="border border-gray-300 p-3 text-center text-gray-900">
                                    {product.salesUnit}
                                  </td>
                                  <td className="border border-gray-300 p-2">
                                    <input
                                      type="number"
                                      min="0"
                                      value={supplyQuantities[product.id] || ""}
                                      onChange={(e) => handleSupplyQuantityChange(product.id, e.target.value)}
                                      className="w-full px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2183AE] focus:border-transparent text-gray-900"
                                      placeholder="0"
                                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
                <div className="lg:hidden space-y-3">
                  {supplyCategories?.categorias.map((category) => (
                    <Collapsible
                      key={category.id}
                      open={expandedCategories[category.id]}
                      onOpenChange={() => toggleCategory(category.id)}
                      className="border border-gray-200 rounded-xl overflow-hidden"
                    >
                      <CollapsibleTrigger className="w-full bg-gray-100 hover:bg-gray-200 transition-colors">
                        <div className="flex items-center justify-between p-4">
                          <span className="text-gray-900">{category.name}</span>
                          {expandedCategories[category.id] ? (
                            <ChevronUp className="h-5 w-5 text-gray-600" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-600" />
                          )}
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-3 space-y-3">
                          {category.products.map((product) => (
                            <div key={product.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                              <h4 className="text-gray-900 mb-2">{product.name}</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Unidad:</span>
                                  <span className="text-gray-900">{product.salesUnit}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                                  <label className="text-gray-700">Cantidad:</label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={supplyQuantities[product.id] || ""}
                                    onChange={(e) => handleSupplyQuantityChange(product.id, e.target.value)}
                                    className="w-24 px-2 py-1 text-center border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-[#2183AE] focus:border-transparent text-gray-900"
                                    placeholder="0"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </div>
            </div>
          )}
          {showTable && (
            <div className="mt-6">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="bg-[#2183AE] text-white hover:bg-[#1a6a8f] w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Enviar Pedido
              </Button>
            </div>
          )}
        </div>
        <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <DialogTitle className="text-center text-gray-900">
                ¡Pedido Enviado!
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600">
                El pedido se ha registrado correctamente
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <p className="text-gray-500 text-xs mb-1">Tipo de Pedido</p>
                <p className="text-gray-900">{selectedOrderType?.nombre}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <p className="text-gray-500 text-xs mb-1">Tienda</p>
                <p className="text-gray-900">{selectedStore?.nombre_tienda}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <p className="text-gray-500 text-xs mb-1">Fecha</p>
                <p className="text-gray-900">
                  {orderDate && format(orderDate, "PPP", { locale: es })}
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <p className="text-gray-500 text-xs mb-1">Total de Productos</p>
                <p className="text-gray-900">
                  {selectedOrderType?.nombre === "Pedido de Pollo" 
                    ? Object.values(chickenQuantities).filter(qty => qty > 0).length
                    : Object.values(supplyQuantities).filter(qty => qty > 0).length} productos
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}