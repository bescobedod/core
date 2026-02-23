// import logo from "@/assets/img/LOGOPINULITOORIGINAL.png";
import { Menu, User } from "lucide-react";

type View =
  | "home"
  | "visitas"
  | "agregar"
  | "emergencias"
  | "emergencia-detalle";

interface HeaderProps {
  userName: string | null;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  onMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

const date = new Date().toLocaleDateString("es-ES");

export function Header({
//   currentView,
  onViewChange,
  onLogout,
  onMenuToggle,
  isMobileMenuOpen,
  // user,
}: HeaderProps) {

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#2183AE] shadow-lg border-b border-blue-600/20 z-30">
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex justify-between items-center gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="pl-3 text-white-600 font-bold truncate">
              <h2 className="text-3xl">Administrador Core</h2>
              <p className="text-lg">Sistema de Gestión Administrativa</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-blue-600/30">
            <div className="w-9 h-9 bg-gray-900 rounded-full flex items-center justify-center">
              <User size={18} className="text-blue" />
            </div>
            <div className="text-right leading-tight">
              <p className="text-gray-900 text-sm font-semibold">
                {localStorage.getItem("nombre")}
              </p>
              {/* <p className="text-gray-800 text-xs">{localStorage.getItem("puesto")}</p> */}
              <p className="text-gray-800 text-xs">{date}</p>
            </div>
          </div>
          <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-blue-600/30">
            <div className="w-7 h-7 bg-gray-900 rounded-full flex items-center justify-center">
              <User size={14} className="text-blue" />
            </div>
            <div className="text-right leading-tight">
              <p className="text-gray-900 text-xs font-semibold">
                {}
              </p>
              <p className="text-gray-800 text-[10px]">{}</p>
            </div>
          </div>
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-blue-600/20 rounded-lg transition-colors flex-shrink-0"
          >
            <Menu size={24} className="text-gray-900" />
          </button>
        </div>
      </div>
    </header>
  );
}