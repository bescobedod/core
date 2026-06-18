"use client";

// import logo from "@/assets/img/LOGOPINULITOORIGINAL.png";
import { Menu, User } from "lucide-react";
import Image from "next/image";
import logo from "@/assets/img/imagen (4).png";

type View =
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
  | "inspecciones-camiones";

interface HeaderProps {
  userName: string | null;
  userPhotoUrl?: string | null;
  onViewChange: (view: View) => void;
  onLogout: () => void;
  onMenuToggle: () => void;
  isMobileMenuOpen: boolean;
}

const date = new Date().toLocaleDateString("es-ES");

export function Header({
  userName,
  userPhotoUrl,
  onViewChange,
  onLogout,
  onMenuToggle,
  isMobileMenuOpen,
}: HeaderProps) {

  const navigateTo = (view: View) => {
    onViewChange(view);
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-gradient-to-r from-[#2183AE] to-[#1a6a8f] shadow-lg border-b border-blue-600/20 z-30 mb-10">
      <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex justify-between items-center gap-4">
          <button
          onClick={() => navigateTo("home")}
          className="flex items-center gap-4 cursor-pointer group"
          >
            <div className="relative w-12 h-12 sm:w-16 sm:h-16 flex-shrink-0">
              <Image
              src={logo}
              alt="Logo Pinulito"
              fill
              className="object-contain"
              priority
              />
            </div>
            <div className="flex flex-col justify-center text-left border-l border-white/20 pl-4">
              <h1 className="text-xl sm:text-2xl md:text-3xl text-white font-bold leading-none">
                Administrador Core
              </h1>
              <p className="text-xs sm:text-sm md:text-base text-white/80 font-medium mt-1">
                Sistema de Gestión Administrativa
              </p>
            </div>
          </button>
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-xl border border-blue-600/30 cursor-pointer">
            <div className="w-9 h-9 bg-white rounded-full overflow-hidden flex items-center justify-center">
              {userPhotoUrl ? (
                <img
                  src={userPhotoUrl}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={18} className="text-[#2183AE]" />
              )}
            </div>
            <div className="text-right leading-tight">
              <p className="text-white text-sm font-semibold">
                {userName || localStorage.getItem("nombre")}
              </p>
              <p className="text-white text-xs">{localStorage.getItem("puesto")}</p>
              <p className="text-white text-xs">{date}</p>
            </div>
          </div>
          <div className="md:hidden flex items-center gap-2 px-3 py-2 bg-white/20 backdrop-blur-sm rounded-lg border border-blue-600/30">
            <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-900 flex items-center justify-center">
              {userPhotoUrl ? (
                <img
                  src={userPhotoUrl}
                  alt="Foto de perfil"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={14} className="text-white" />
              )}
            </div>
            <div className="text-right leading-tight">
              <p className="text-gray-900 text-xs font-semibold">
                {userName || localStorage.getItem("nombre")}
              </p>
              <p className="text-gray-800 text-[10px]">{localStorage.getItem("puesto")}</p>
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