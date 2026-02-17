"use client"
import { useState, useEffect } from "react";
import { Header } from "./pages/Header";
import { HomeView } from "./pages/HomeView";
import { PendingOrdersView } from "./pages/PendingOrdersView";
import { Home, LogOut, X, ClipboardList, ChevronLeft } from "lucide-react";
import { MenuModel } from "./types/MenuModel";
import { getAllMenus } from "./api/MenuApi";
import { OrderView } from "./pages/OrderView";

type View = "home" | "visitas" | "agregar" | "emergencias" | "emergencia-detalle" | "pedidos" | "gestionar-pedidos";

interface EmergencyVisit {
  id: string;
  supervisor: string;
  store: string;
  visitType: string;
  assignedDate: Date;
  comments: string;
  status: "pending" | "in-progress";
  lastVisit: {
    lat: number;
    lng: number;
    storeName: string;
  };
  newVisit: {
    lat: number;
    lng: number;
    storeName: string;
  };
}

export default function App() {
  const [viewHistory, setViewHistory] = useState<View[]>(["home"]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedEmergencyVisit, setSelectedEmergencyVisit] = useState<EmergencyVisit | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [menus, setMenus] = useState<MenuModel[]>([]);

  const currentView = viewHistory[viewHistory.length - 1];

  useEffect(() => {
    getAllMenus().then(setMenus).catch(console.error);
  }, []);

  // Funciones de navegación con historial
  const navigateTo = (newView: View) => {
    setViewHistory([...viewHistory, newView]);
  };

  const goBack = () => {
    if (viewHistory.length > 1) {
      setViewHistory(viewHistory.slice(0, -1));
    }
  };

  const handleLogin = () => {
    setIsAuthenticated(true);
    navigateTo("home");
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setViewHistory(["home"]);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header 
        // currentView={currentView} 
        onViewChange={navigateTo} 
        onLogout={handleLogout}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
        // user={currentUser}
      />
      <div className="flex pt-[80px]">
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 lg:mr-64">
          <div className="max-w-6xl mx-auto">
            {currentView !== "home" && (
              <button
                onClick={goBack}
                className="mb-6 flex items-center text-[#2183AE] hover:text-[#1a6391] transition-colors"
              >
                <ChevronLeft size={20} className="mr-2" />
                <span className="font-medium">Atrás</span>
              </button>
            )}
            {currentView === "home" && <HomeView menus={menus} onNavigate={navigateTo} />}
            {currentView === "pedidos" && <OrderView onBack={goBack} />}
            {currentView === "gestionar-pedidos" && <PendingOrdersView />}
          </div>
        </div>
        <div className="hidden lg:block w-64 bg-white shadow-2xl border-l border-gray-200 flex-shrink-0 fixed top-[100px] right-0 bottom-0 h-[calc(100vh-80px)]">
          <div className="p-6 flex flex-col h-full">
            <div className="mb-8 pb-4 border-b border-gray-200">
              <h2 className="text-gray-900">Menú</h2>
            </div>
            <nav className="space-y-3">
              <button
                onClick={() => navigateTo("home")}
                className="w-full text-left px-5 py-4 rounded-xl transition-all text-gray-700 hover:bg-gray-100 flex items-center group"
              >
                <Home size={20} className="mr-3 text-gray-600 group-hover:text-[#2183AE]" />
                <span>Inicio</span>
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-5 py-4 rounded-xl transition-all text-red-600 hover:bg-red-50 flex items-center group"
              >
                <LogOut size={20} className="mr-3" />
                <span>Cerrar Sesión</span>
              </button>
            </nav>
          </div>
        </div>
        {isMobileMenuOpen && (
          <>
            <div 
              className="lg:hidden fixed inset-0 bg-black/50 z-40 top-[80px]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="lg:hidden fixed top-[80px] right-0 bottom-0 w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300">
              <div className="p-6 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                  <h2 className="text-gray-900">Menú</h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X size={20} className="text-gray-600" />
                  </button>
                </div>
                <nav className="space-y-3">
                  <button
                    onClick={() => {
                      navigateTo("home");
                      setIsMobileMenuOpen(false);
                    }} 
                    className="w-full text-left px-5 py-4 rounded-xl transition-all text-gray-700 hover:bg-gray-100 flex items-center group"
                  >
                    <Home size={20} className="mr-3 text-gray-600 group-hover:text-[#2183AE]" />
                    <span>Inicio</span>
                  </button>
                  <button 
                    onClick={() => {
                      handleLogout();
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full text-left px-5 py-4 rounded-xl transition-all text-red-600 hover:bg-red-50 flex items-center group"
                  >
                    <LogOut size={20} className="mr-3" />
                    <span>Cerrar Sesión</span>
                  </button>
                </nav>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}