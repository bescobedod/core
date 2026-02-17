
// utils/menuHelpers.ts
import * as Icons from "lucide-react";

// Ajusta este tipo a tus Views actuales
export type View = "home" | "visitas" | "agregar" | "emergencias" | "emergencia-detalle" | "pedidos" | "gestionar-pedidos";

// Mapa de nombre_menu (BD) a View del front
export const viewMap: Record<string, View> = {
  // Ajusta estas equivalencias a tu app real:
  OrderView: "pedidos",
  PendingOrdersView: "gestionar-pedidos",
  HomeView: "home",
  // VisitsView: "visitas",
  // DeliveryView: "agregar",
  // EmergencyVisitsView: "emergencias",
  // EmergencyVisitDetail: "emergencia-detalle",
};

// Devuelve el componente de icono según el nombre que viene de BD
export function getLucideIconByName(name?: string) {
  const key = (name || "").trim();
  if (key && key in Icons) {
    // @ts-expect-error: index access on Icons
    return Icons[key];
  }
  return Icons.Circle; // Fallback
}
