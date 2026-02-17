import { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { CheckCircle, AlertTriangle, PackageCheck, ChevronDown, ChevronUp, Printer } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface OrderProduct {
  name: string;
  requestedQuantity: number;
  availableStock: number;
  unit?: string;
}

interface Order {
  id: string;
  type: "pollo" | "insumos";
  date: Date;
  warehouse?: string;
  route?: string;
  store: string;
  products: OrderProduct[];
  status: "pending" | "validated" | "confirmed";
}

// Mock data de pedidos pendientes
const mockOrders: Order[] = [
  {
    id: "PO-001",
    type: "pollo",
    date: new Date(2024, 11, 10),
    warehouse: "Bodega Central Guatemala",
    route: "Ruta Norte",
    store: "Tienda Palencia",
    status: "pending",
    products: [
      { name: "Pollo Grande Tradicional", requestedQuantity: 50, availableStock: 45 },
      { name: "Pollo Grande Picante", requestedQuantity: 30, availableStock: 30 },
      { name: "Pollo Estándar Tradicional", requestedQuantity: 40, availableStock: 50 },
      { name: "Molleja", requestedQuantity: 20, availableStock: 15 },
      { name: "Alitas", requestedQuantity: 25, availableStock: 25 },
    ]
  },
  {
    id: "PO-002",
    type: "pollo",
    date: new Date(2024, 11, 11),
    warehouse: "Bodega Zona 12",
    route: "Ruta Sur",
    store: "Tienda Villa Nueva",
    status: "pending",
    products: [
      { name: "Pollo Estándar Picante", requestedQuantity: 60, availableStock: 40 },
      { name: "Pechuga sin Ala", requestedQuantity: 35, availableStock: 35 },
      { name: "Hígado", requestedQuantity: 15, availableStock: 10 },
    ]
  },
  {
    id: "PI-001",
    type: "insumos",
    date: new Date(2024, 11, 9),
    store: "Tienda Mixco",
    status: "pending",
    products: [
      { name: "Salsa de Tomate", requestedQuantity: 20, availableStock: 15, unit: "Litros" },
      { name: "Aderezo Ranch", requestedQuantity: 10, availableStock: 8, unit: "Litros" },
      { name: "Jabón Líquido", requestedQuantity: 15, availableStock: 10, unit: "Litros" },
      { name: "Cloro", requestedQuantity: 25, availableStock: 25, unit: "Litros" },
      { name: "Papel de Baño", requestedQuantity: 30, availableStock: 25, unit: "Paquetes" },
      { name: "Servilletas", requestedQuantity: 40, availableStock: 30, unit: "Paquetes" },
    ]
  },
  {
    id: "PI-002",
    type: "insumos",
    date: new Date(2024, 11, 10),
    store: "Tienda Antigua Guatemala",
    status: "pending",
    products: [
      { name: "Salsa BBQ", requestedQuantity: 12, availableStock: 12, unit: "Litros" },
      { name: "Guantes de Látex", requestedQuantity: 8, availableStock: 4, unit: "Cajas" },
      { name: "Aceite de Cocina", requestedQuantity: 50, availableStock: 40, unit: "Litros" },
    ]
  },
];

export function PendingOrdersView() {
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  const handleValidate = (order: Order) => {
    setSelectedOrder(order);
    setShowValidationModal(true);
  };

  const handleConfirm = (order: Order) => {
    setSelectedOrder(order);
    setShowConfirmModal(true);
  };

  const confirmValidation = () => {
    if (selectedOrder) {
      setOrders(orders.map(o => 
        o.id === selectedOrder.id ? { ...o, status: "validated" as const } : o
      ));
      setShowValidationModal(false);
      setSelectedOrder(null);
    }
  };

  const confirmOrder = () => {
    if (selectedOrder) {
      setOrders(orders.map(o => 
        o.id === selectedOrder.id ? { ...o, status: "confirmed" as const } : o
      ));
      setShowConfirmModal(false);
      setSelectedOrder(null);
    }
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }));
  };

  const getValidationSummary = (order: Order) => {
    const insufficient = order.products.filter(p => p.requestedQuantity > p.availableStock);
    const sufficient = order.products.filter(p => p.requestedQuantity <= p.availableStock);
    return { insufficient, sufficient };
  };

  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "validated": return "bg-blue-100 text-blue-800";
      case "confirmed": return "bg-green-100 text-green-800";
    }
  };

  const getStatusText = (status: Order["status"]) => {
    switch (status) {
      case "pending": return "Pendiente";
      case "validated": return "Validado";
      case "confirmed": return "Confirmado";
    }
  };

  const chickenOrders = orders.filter(o => o.type === "pollo");
  const suppliesOrders = orders.filter(o => o.type === "insumos");

  const renderOrderCard = (order: Order) => (
    <div key={order.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-2">
              <h3 className="text-gray-900">Pedido #{order.id}</h3>
              <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>
            {status == "confirmed" && (
              <div>
                <Printer></Printer>
              </div>
            )}
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Fecha:</span> {format(order.date, "dd 'de' MMMM, yyyy", { locale: es })}</p>
              {order.warehouse && <p><span className="font-medium">Bodega:</span> {order.warehouse}</p>}
              {order.route && <p><span className="font-medium">Ruta:</span> {order.route}</p>}
              <p><span className="font-medium">Tienda:</span> {order.store}</p>
            </div>
          </div>
        </div>
        <Collapsible
          open={expandedOrders[order.id]}
          onOpenChange={() => toggleOrder(order.id)}
          className="mb-4"
        >
          <CollapsibleTrigger className="w-full bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors">
            <div className="flex items-center justify-between p-3">
              <span className="text-gray-900 text-sm">
                Ver productos ({order.products.length})
              </span>
              {expandedOrders[order.id] ? (
                <ChevronUp className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-3 space-y-2">
              {order.products.map((product, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 bg-gray-50 rounded text-sm">
                  <span className="text-gray-700">{product.name}</span>
                  <span className="text-gray-900">
                    {product.requestedQuantity} {product.unit || "unidades"}
                  </span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={() => handleValidate(order)}
            disabled={order.status === "confirmed"}
            className="flex-1 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PackageCheck className="w-4 h-4 mr-2" />
            Validar Stock
          </Button>
          <Button
            onClick={() => handleConfirm(order)}
            disabled={order.status === "confirmed"}
            className="flex-1 bg-[#2183AE] text-white hover:bg-[#1a6a8f] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirmar Pedido
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="py-4 sm:py-6 lg:py-8 px-2 sm:px-4">
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 sm:p-6 lg:p-8">
          <div className="text-center mb-6 sm:mb-8">
            <h2 className="text-gray-900 mb-2">Gestión de Pedidos</h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Valida el stock y confirma los pedidos pendientes
            </p>
          </div>

          <Tabs defaultValue="pollo" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="pollo">
                Pedidos de Pollo ({chickenOrders.length})
              </TabsTrigger>
              <TabsTrigger value="insumos">
                Pedidos de Insumos ({suppliesOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pollo" className="space-y-4">
              {chickenOrders.length > 0 ? (
                chickenOrders.map(order => renderOrderCard(order))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No hay pedidos de pollo pendientes
                </div>
              )}
            </TabsContent>

            <TabsContent value="insumos" className="space-y-4">
              {suppliesOrders.length > 0 ? (
                suppliesOrders.map(order => renderOrderCard(order))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No hay pedidos de insumos pendientes
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Modal de Validación de Stock */}
        <Dialog open={showValidationModal} onOpenChange={setShowValidationModal}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <PackageCheck className="w-8 h-8 text-white" />
                </div>
              </div>
              <DialogTitle className="text-center text-gray-900">
                Validación de Stock
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600">
                Pedido #{selectedOrder?.id}
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-4">
                {/* Información del pedido */}
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <h4 className="text-gray-900 mb-2">Información del Pedido</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Tienda:</span> {selectedOrder.store}</p>
                    {selectedOrder.route && <p><span className="font-medium">Ruta:</span> {selectedOrder.route}</p>}
                    <p><span className="font-medium">Fecha:</span> {format(selectedOrder.date, "dd/MM/yyyy")}</p>
                  </div>
                </div>

                {/* Productos con stock suficiente */}
                {getValidationSummary(selectedOrder).sufficient.length > 0 && (
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <h4 className="text-green-900">Stock Suficiente</h4>
                    </div>
                    <div className="space-y-2">
                      {getValidationSummary(selectedOrder).sufficient.map((product, idx) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                          <span className="text-green-800">{product.name}</span>
                          <span className="text-green-900">
                            {product.requestedQuantity} {product.unit || "unidades"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Productos con stock insuficiente */}
                {getValidationSummary(selectedOrder).insufficient.length > 0 && (
                  <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <h4 className="text-orange-900">Stock Insuficiente</h4>
                    </div>
                    <div className="space-y-3">
                      {getValidationSummary(selectedOrder).insufficient.map((product, idx) => (
                        <div key={idx} className="bg-white rounded-lg p-3 border border-orange-200">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-orange-900 font-medium">{product.name}</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Solicitado:</span>
                              <span className="text-gray-900">{product.requestedQuantity} {product.unit || "unidades"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Se entregará:</span>
                              <span className="text-green-700 font-medium">{product.availableStock} {product.unit || "unidades"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Faltante:</span>
                              <span className="text-red-700 font-medium">
                                {product.requestedQuantity - product.availableStock} {product.unit || "unidades"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botones */}
                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowValidationModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmValidation}
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Confirmar Validación
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmación de Pedido */}
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <DialogTitle className="text-center text-gray-900">
                Confirmar Pedido
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600">
                ¿Estás seguro de confirmar este pedido?
              </DialogDescription>
            </DialogHeader>

            {selectedOrder && (
              <div className="space-y-3">
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-gray-500 text-xs mb-1">Pedido</p>
                  <p className="text-gray-900">#{selectedOrder.id}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-gray-500 text-xs mb-1">Tienda</p>
                  <p className="text-gray-900">{selectedOrder.store}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="text-gray-500 text-xs mb-1">Total de Productos</p>
                  <p className="text-gray-900">{selectedOrder.products.length} productos</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    onClick={() => setShowConfirmModal(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmOrder}
                    className="flex-1 bg-green-600 text-white hover:bg-green-700"
                  >
                    Confirmar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}