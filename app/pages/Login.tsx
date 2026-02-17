"use client";

import { useState } from "react";
import Image from "next/image";
import logo from "@/assets/img/LOGOPINULITOORIGINAL.png";
import { useAuth } from "../context/AuthContext";

interface LoginViewProps {
  onLogin: () => void;
}

export function LoginView({ onLogin }: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Validar campos
      if (!username || !password) {
        setError("Por favor completa todos los campos");
        setIsLoading(false);
        return;
      }

      // Llamar a la función login del contexto
      await login(username, password);
      setUsername("");
      setPassword("");
      onLogin();
    } catch (err: any) {
      console.error("Login error:", err);
      setError(err.message || "Error al iniciar sesión. Intenta nuevamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#fcb900] to-[#e5a700] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-block p-4 rounded-2xl mb-4">
            <Image
              src={logo}
              width={85}
              height={90}
              alt="Logo Pinulito"
              loading="eager"
              style={{ width: "100%", height: "auto" }}
            />
          </div>
          <h1 className="text-gray-900 mb-2">Bienvenido</h1>
          <p className="text-gray-600">Ingresa tus credenciales para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="text-gray-900 mb-2 block text-sm font-medium">
              Código de Empleado
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ingrese su código"
              disabled={isLoading}
              className="w-full bg-white border border-gray-300 h-12 rounded-lg px-4 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-900 placeholder-gray-500 disabled:bg-gray-100 transition-colors"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-gray-900 mb-2 block text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              disabled={isLoading}
              className="w-full bg-white border border-gray-300 h-12 rounded-lg px-4 focus:border-red-500 focus:ring-2 focus:ring-red-200 text-gray-900 placeholder-gray-500 disabled:bg-gray-100 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 text-white border border-transparent rounded-lg h-12 mt-6 font-medium hover:bg-white hover:text-red-600 hover:border-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
          >
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>
      </div>
    </div>
  );
}