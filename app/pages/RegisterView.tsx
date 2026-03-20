"use client"

import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface RegisterViewProps {
  onRegisterSuccess?: () => void;
}

export function RegisterView({ onRegisterSuccess }: RegisterViewProps) {
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    password: "",
    id_rol: 2,
    id_departamento: 1
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.nombre || !formData.apellido || !formData.email || !formData.password) {
      setError("Todos los campos son obligatorios");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Error al registrar usuario");
      }

      setLoading(false);

      if (onRegisterSuccess) {
        onRegisterSuccess();
      }

    } catch (err: any) {
      setLoading(false);
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#2183AE] flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 lg:p-10 w-full max-w-md">
        
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-[#2183AE] rounded-2xl mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9l-6 6-6-6" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Registro de Usuario</h1>
          <p className="text-gray-600 text-sm">Completa la información para crear tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              type="text"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Ingrese su nombre"
            />
          </div>

          <div>
            <Label htmlFor="apellido">Apellido</Label>
            <Input
              id="apellido"
              type="text"
              value={formData.apellido}
              onChange={handleChange}
              placeholder="Ingrese su apellido"
            />
          </div>

          <div>
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="correo@empresa.com"
            />
          </div>

          <div>
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="********"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm bg-red-50 p-2 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#1e213d] hover:bg-white hover:border-[#1e213d] hover:text-[#1e213d]"
          >
            {loading ? "Registrando..." : "Crear Cuenta"}
          </Button>

        </form>
      </div>
    </div>
  );
}