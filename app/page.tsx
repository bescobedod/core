"use client"
import { useState, useEffect } from "react";
import { Header } from "./pages/Header";
import { HomeView } from "./pages/HomeView";
import { PendingOrdersView } from "./pages/PendingOrdersView";
import { RegisterView } from "./pages/RegisterView";
import { Home, LogOut, X, ChevronLeft } from "lucide-react";
import { OrderView } from "./pages/OrderView";
import { LoginView } from "./pages/LoginView";
import { useMsal } from "@azure/msal-react"
import { loginRequest } from "../authConfig";
import { validateLogin } from "./api/LoginApi";

type View = "login" | "home" | "visitas" | "agregar" | "emergencias" | "emergencia-detalle" | "pedidos" | "gestionar-pedidos";

export default function App() {

  const [isClient, setIsClient] = useState(false);
  const [loginMethod, setLoginMethod] = useState<string | null>(null);

  const [viewHistory, setViewHistory] = useState<View[]>(["home"]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { instance, accounts } = useMsal();
  const [userData, setUserData] = useState<{nombre: string | null}>({nombre: null});
  const [isValidated, setIsValidated] = useState<boolean | null>(null);

  const currentView = viewHistory[viewHistory.length - 1];

  useEffect(() => {
    setIsClient(true);
    const method = localStorage.getItem("login_method");
    setLoginMethod(method);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    if (accounts.length > 0) {
      const email = accounts[0].username;

      validateLogin(email)
        .then((data) => {
          if (data.ok) {
            setUserData({ nombre: data.user.nombre });
            setIsValidated(true);
            setLoginMethod("microsoft");
          } else {
            setIsValidated(false);
          }
        })
        .catch(() => {
          setIsValidated(false);
        });
    }
  }, [accounts, isClient]);

  useEffect(() => {
    if (!isClient) return;

    if (loginMethod === "internal") {
      const token = localStorage.getItem("token");

      if (token) {
        setUserData({ nombre: localStorage.getItem("nombre") });
        setIsValidated(true);
      } else {
        setIsValidated(false);
      }
    }
  }, [loginMethod, isClient]);

  const saveCleanSession = (account: any) => {
    const userPayload = {
      name: account.name,
      email: account.username,
      localId: account.localAccountId,
      tenantId: account.tenantId,
      lastLogin: new Date().toISOString()
    };
    localStorage.setItem("user_session", JSON.stringify(userPayload));
    localStorage.setItem("login_method", "microsoft");
    setLoginMethod("microsoft");
  };

  useEffect(() => {
    if (accounts.length > 0) {
      saveCleanSession(accounts[0]);
    }
  }, [accounts]);

  const navigateTo = (newView: View) => {
    setViewHistory([...viewHistory, newView]);
  };

  const goBack = () => {
    if (viewHistory.length > 1) {
      setViewHistory(viewHistory.slice(0, -1));
    }
  };

  const handleLogout = () => {
    const method = localStorage.getItem("login_method");

    if (method === "microsoft") {
      localStorage.clear();
      instance.logoutRedirect({
        account: accounts[0],
        postLogoutRedirectUri: "http://localhost:3000"
      });
    } else {
      localStorage.clear();
      window.location.reload();
    }
  };

  if (!isClient) return null;

  if (!loginMethod) {
    return (
      <LoginView
        onMicrosoftLogin={() => instance.loginRedirect(loginRequest)}
        onAuthenticated={() => {
          const method = localStorage.getItem("login_method");
          setLoginMethod(method);
        }}
      />
    );
  }

  if (isValidated === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        Validando sesión...
      </div>
    );
  }

  if (isValidated === false) {
    return <RegisterView />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <Header 
        onViewChange={navigateTo} 
        onLogout={handleLogout}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        isMobileMenuOpen={isMobileMenuOpen}
        userName={userData.nombre}
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
            {currentView === "home" && <HomeView onNavigate={navigateTo} />}
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
                onClick={() => handleLogout()}
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