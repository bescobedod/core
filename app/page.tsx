"use client"
import { useState, useEffect } from "react";
import { Header } from "./pages/Header";
import { HomeView } from "./pages/HomeView";
import { PendingOrdersView } from "./pages/PendingOrdersView";
import { RegisterView } from "./pages/RegisterView";
import { Home, LogOut, X, ChevronLeft } from "lucide-react";
import { PedidosPolloView } from "./pages/PedidosPolloView";
import { LoginView } from "./pages/LoginView";
import { useMsal } from "@azure/msal-react"
import { loginRequest, msalConfig } from "../authConfig";
import { validateLogin } from "./api/LoginApi";
import { PurchaseRequestView } from "./pages/PurchaseRequestView";
import { FixedAssetsAllocationView } from "./pages/FixedAssetsAllocationView";
import { PurchasesView } from "./pages/PurchasesView";
import { AcquisitionStrategiesView } from "./pages/AcquisitionStrategiesView";
import { DepartmentsView } from "./pages/DepartmentsView";
import { ExternalPersonnelView } from "./pages/ExternalPersonnelView";
import { UserModel } from "./types/UserModel";
import { OrderListView } from "./pages/OrderListView";
import { TruckInspectionHistoryView } from "./pages/TruckInspectionHistoryView";
import { RoutesPolloView } from "./pages/RoutesPolloView";
import { RoutesInsumoView } from "./pages/RoutesInsumoView";
import { PedidosInsumosView } from "./pages/PedidosInsumoView";
import { FixedAssetsView } from "./pages/FixedAssetsView";
import { CamionesEnRutaPolloView } from "./pages/CamionesEnRutaPolloView";
import { CamionesEnRutaInsumoView } from "./pages/CamionesEnRutaInsumoView";
import { NotificacionDestinatariosView } from "./pages/NotificacionDestinatariosView";
import { PilotoClienteSapPolloView } from "./pages/PilotoClienteSapPolloView";
import { PilotoClienteSapInsumoView } from "./pages/PilotoClienteSapInsumoView";

type View =
  "login"
  | "home"
  | "compras"
  | "pedidos"
  | "gestionar-pedidos"
  | "asignacion-af"
  | "solicitudes"
  | "estrategias"
  | "departamentos"
  | "personal"
  | "ordenes-compra"
  | "inspecciones-camiones"
  | "rutas-pollo"
  | "rutas-insumo"
  | "pedidos-insumo"
  | "pedidos-af"
  | "camiones-en-ruta-pollo"
  | "camiones-en-ruta-insumos"
  | "destinatarios-notificacion"
  | "piloto-cliente-sap-pollo"
  | "piloto-cliente-sap-insumos";

export default function App() {

  const [isClient, setIsClient] = useState(false);
  const [loginMethod, setLoginMethod] = useState<string | null>(null);

  const [viewHistory, setViewHistory] = useState<View[]>(["home"]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { instance, accounts } = useMsal();
  const [userData, setUserData] = useState<{nombre: string | null}>({nombre: null});
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [isValidated, setIsValidated] = useState<boolean | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [msLoginAttempted, setMsLoginAttempted] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<UserModel | null>(null);

  const getMsErrorMessage = (errorMessage?: string | null) => {
    if (!errorMessage) return "Error en el inicio de sesión con Microsoft";

    const normalized = errorMessage.toLowerCase();
    if (/token|permiso|autorizado|unauthorized|denied|invalid|expired/.test(normalized)) {
      return "No autorizado por Microsoft";
    }

    return "Error en el inicio de sesión con Microsoft";
  };

  const currentView = viewHistory[viewHistory.length - 1];

  useEffect(() => {
    setIsClient(true);
    const method = localStorage.getItem("login_method");
    setLoginMethod(method);
    try {
      const cachedError = localStorage.getItem("ms_login_error");
      if (cachedError) {
        setLoginError(cachedError);
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;

    if (accounts.length > 0) {
      const email = accounts[0].username;
      const attemptedMsLogin = msLoginAttempted || localStorage.getItem("ms_login_attempted") === "1";

      validateLogin(email)
        .then((data) => {
          if (data.ok) {
            setUserData({ nombre: data.user.nombre });
            setIsValidated(true);
            setLoginMethod("microsoft");
            setMsLoginAttempted(false);
            try {
              localStorage.removeItem("ms_login_attempted");
            } catch {}
            setLoginError(null);
          } else {
            localStorage.clear();
            setLoginMethod(null);
            if (attemptedMsLogin) {
              const message = getMsErrorMessage(data.error ?? null);
              setLoginError(message);
              try { localStorage.setItem("ms_login_error", message); } catch {}
            }
            setIsValidated(null);
          }
        })
        .catch((err: any) => {
          localStorage.clear();
          setLoginMethod(null);
          if (attemptedMsLogin) {
            const message = getMsErrorMessage(err?.message ?? null);
            setLoginError(message);
            try { localStorage.setItem("ms_login_error", message); } catch {}
          }
          setIsValidated(null);
        });
    }
  }, [accounts, isClient, msLoginAttempted]);

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

  // The MS login session should only be persisted after a successful validation.
  // This avoids bouncing into a Microsoft session state while the validation is still pending.

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadProfilePhoto = async () => {
      if (accounts.length === 0 || loginMethod !== "microsoft") {
        setUserPhotoUrl(null);
        return;
      }

      try {
        const response = await instance.acquireTokenSilent({
          scopes: loginRequest.scopes,
          account: accounts[0],
        });

        const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
          headers: {
            Authorization: `Bearer ${response.accessToken}`,
          },
        });

        if (!graphResponse.ok) {
          setUserPhotoUrl(null);
          return;
        }

        const blob = await graphResponse.blob();
        objectUrl = URL.createObjectURL(blob);
        setUserPhotoUrl(objectUrl);
      } catch (error) {
        console.error("Error cargando la foto de perfil de Microsoft Graph:", error);
        setUserPhotoUrl(null);
      }
    };

    loadProfilePhoto();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [accounts, loginMethod, instance]);

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
        postLogoutRedirectUri: msalConfig.auth.postLogoutRedirectUri
      });
    } else {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleSelectEmployee = (employee: UserModel) => {
    setSelectedEmployee(employee);
  };

  if (!isClient) return null;

  if (!loginMethod) {
    return (
      <LoginView
        onMicrosoftLogin={() => {
          setMsLoginAttempted(true);
          try {
            localStorage.setItem("ms_login_attempted", "1");
          } catch {}
          setLoginError(null);
          instance.loginRedirect(loginRequest);
        }}
        onAuthenticated={() => {
          const method = localStorage.getItem("login_method");
          setLoginMethod(method);
        }}
        errorMessage={loginError}
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
        userPhotoUrl={userPhotoUrl}
      />
      <div className="flex pt-[80px]">
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 lg:mr-64">
          <div className="max-w-6xl mx-auto">
            {currentView !== "home" && (
              <button
                onClick={goBack}
                className="mb-6 flex items-center text-[#2183AE] hover:text-[#1a6391] transition-colors py-2"
              >
                <ChevronLeft size={20} className="mr-2" />
                <span className="font-medium">Atrás</span>
              </button>
            )}
            {currentView === "home" && <HomeView onNavigate={navigateTo} />}
            {currentView === "pedidos" && <PedidosPolloView/>}
            {currentView === "gestionar-pedidos" && <PendingOrdersView />}
            {currentView === "compras" && <PurchaseRequestView onBack={goBack} />}
            {currentView === "asignacion-af" && <FixedAssetsAllocationView onBack={goBack} />}
            {currentView === "solicitudes" && <PurchasesView onBack={goBack} />}
            {currentView === "estrategias" && <AcquisitionStrategiesView onBack={goBack} />}
            {currentView === "departamentos" && <DepartmentsView onBack={goBack} />}
            {currentView === "personal" && <ExternalPersonnelView onBack={goBack}  />}
            {currentView === "ordenes-compra" && <OrderListView onBack={goBack}  />}
            {currentView === "inspecciones-camiones" && <TruckInspectionHistoryView onBack={goBack}  />}
            {currentView === "rutas-pollo" && <RoutesPolloView/>}
            {currentView === "rutas-insumo" && <RoutesInsumoView/>}
            {currentView === "pedidos-insumo" && <PedidosInsumosView/>}
            {currentView === "pedidos-af" && <FixedAssetsView onBack={goBack} />}
            {currentView === "camiones-en-ruta-pollo" && <CamionesEnRutaPolloView />}
            {currentView === "camiones-en-ruta-insumos" && <CamionesEnRutaInsumoView />}
            {currentView === "destinatarios-notificacion" && <NotificacionDestinatariosView />}
            {currentView === "piloto-cliente-sap-pollo" && <PilotoClienteSapPolloView />}
            {currentView === "piloto-cliente-sap-insumos" && <PilotoClienteSapInsumoView />}
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
              className="lg:hidden fixed inset-0 bg-black/50 z-40 top-[109px]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <div className="lg:hidden fixed top-[109px] right-0 bottom-0 w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300">
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