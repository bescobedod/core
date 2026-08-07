"use client";

import { MenuModel } from "../types/MenuModel";
import * as Icons from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useEffect, useState, useMemo } from "react";
import { getAllMenus } from "../api/MenuApi";
import { updateUser } from "../api/UserApi";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";

// Mapa BD.nombre_menu → Vista en tu app
const viewMap: Record<string, string> = {
  PedidosPolloView: "pedidos",
  PendingOrdersView: "gestionar-pedidos",
  HomeView: "home",
  PurchaseRequestView: "compras",
  FixedAssetsAllocationView: 'asignacion-af',
  PurchasesView: 'solicitudes',
  AcquisitionStrategiesView: 'estrategias',
  DepartmentsView: 'departamentos',
  ExternalPersonnelView: 'personal',
  OrderListView: 'ordenes-compra',
  TruckInspectionHistoryView: 'inspecciones-camiones',
  RoutesPolloView: 'rutas-pollo',
  RoutesInsumoView: 'rutas-insumo',
  PedidosInsumosView: 'pedidos-insumo'
};

// Función para obtener el ícono desde lucide-react
function getIcon(name: string) {
  if (name in Icons) {
    // @ts-expect-error clave dinámica
    return Icons[name];
  }
  return Icons.Circle;
}

export function HomeView({ onNavigate }: { onNavigate: (v: any) => void;}) {
  const [menus, setMenus] = useState<MenuModel[]>([]);
  const [actualizaInfo, setActualizaInfo] = useState<boolean>(true);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [showUpdateErrorModal, setShowUpdateErrorModal] = useState(false);

  const PUBLIC_EMAIL_DOMAINS = [
    "gmail.com",
    "outlook.com",
    "outlook.es",
    "hotmail.com",
    "yahoo.com",
    "live.com",
    "icloud.com",
    "msn.com"
  ];

  const isCorporateEmail = (email: string) => {
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!basicEmailRegex.test(email)) return false;

    const domain = email.split("@")[1].toLowerCase();

    return !PUBLIC_EMAIL_DOMAINS.includes(domain);
  };

  const canUpdate = useMemo(
    () => isCorporateEmail(email),
    [email]
  );

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    if (!value) {
      setEmailError("El correo es requerido");
    } else if (!isCorporateEmail(value)) {
      setEmailError(
        "No se permiten correos personales (Gmail, Outlook, Yahoo, etc.)"
      );
    } else {
      setEmailError("");
    }
  };

  const handleActualizar = async () => {
    try {
      if (!isCorporateEmail(email)) {
        setEmailError("Debes ingresar un correo corporativo");
        return;
      }

      await updateUser(email);

      localStorage.setItem("email_office", "1");

      setActualizaInfo(true);
      setShowUpdateModal(false);
    } catch (error: any) {
      console.error(error);
      setUpdateError(error?.message || "Error al actualizar el usuario");
      setShowUpdateErrorModal(true);
    }
  };

  useEffect(() => {
    if (localStorage.getItem("email_office") === "0") {
      setActualizaInfo(false);
      setShowUpdateModal(true);
    }

    getAllMenus()
      .then(setMenus)
      .catch(console.error);
  }, []);
  
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-12rem)] py-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-gray-900 mb-3">Bienvenido al Sistema</h1>
          <p className="text-gray-600 text-base sm:text-lg">
            Selecciona una opción para comenzar
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-6 sm:gap-8">
            {menus
            .filter(m => m.visible)
            .map(m => {
              const Icon = getIcon(m.icono);
              const view = viewMap[m.nombre_menu ?? ""] ?? "home";
              return (
                <button
                  key={m.id_menu}
                  onClick={() => onNavigate(view)}
                  className="group bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-gray-200 hover:shadow-2xl hover:border-[#2183AE] transition-all duration-300 transform hover:-translate-y-1 w-full sm:w-[calc(50%-1rem)]"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] rounded-2xl flex items-center justify-center mb-4 sm:mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-900" />
                    </div>
                    <h2 className="text-gray-900 mb-2 sm:mb-3">{m.nombre}</h2>
                    <p className="text-gray-600 text-sm sm:text-base">
                      {m.descripcion}
                    </p>
                  </div>
                </button>
              );
            })}
        </div>
      </div>
      {!actualizaInfo && (
        <Dialog
        open={showUpdateModal}
        onOpenChange={setShowUpdateModal}
        >
          <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="sm:max-w-md bg-white"
          >
            <DialogHeader>
              <DialogTitle className="text-center">
                Actualiza tu información
              </DialogTitle>
              <DialogDescription className="text-center">
                Por favor ingresa tu correo corporativo
              </DialogDescription>
            </DialogHeader>
            <div>
              <Label htmlFor="correo">
                Correo
              </Label>
              <input
              id="correo"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="Escribe tu correo..."
              className={`w-full px-4 py-3 rounded-lg border ${
                emailError
                  ? "border-red-500"
                  : "border-gray-300"
              }`}
              />
              {emailError && (
                <p className="mt-2 text-sm text-red-600">
                  {emailError}
                </p>
              )}
            </div>
            <Button
            disabled={!canUpdate}
            onClick={handleActualizar}
            className="w-full"
            >
              Actualizar
            </Button>
            <AnimatePresence>
              {showUpdateErrorModal && (
                <motion.div key="update-error-modal" className="fixed inset-0 flex items-center justify-center z-[60] p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-gray-100">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Icons.AlertCircle className="h-12 w-12 text-red-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Error al actualizar</h3>
                    <p className="text-gray-600 mb-6">{updateError}</p>
                    <Button onClick={() => setShowUpdateErrorModal(false)} className="w-full bg-[#2183AE] text-white">Entendido</Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}