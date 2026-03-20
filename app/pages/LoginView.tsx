import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ParticleBackground } from "./ParticleBackground";
import { login } from "../api/LoginApi";

interface LoginViewProps {
  onMicrosoftLogin: () => void;
  onAuthenticated: () => void;
  onRegister?: () => void;
}

const MicrosoftLogo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <rect x="2" y="2" width="9" height="9" fill="#F25022" />
    <rect x="13" y="2" width="9" height="9" fill="#7FBA00" />
    <rect x="2" y="13" width="9" height="9" fill="#00A4EF" />
    <rect x="13" y="13" width="9" height="9" fill="#FFB900" />
  </svg>
);

export function LoginView({ onMicrosoftLogin, onAuthenticated }: LoginViewProps) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleInternalLogin();
  };

  async function handleInternalLogin() {
    if (!identifier || !password) {
      setError("Debe ingresar usuario y contraseña");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      await login(identifier, password);
      onAuthenticated();
    } catch (err: any) {
      setError(err.message || "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#2183AE] flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <ParticleBackground />
      <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 lg:p-10 w-full max-w-md relative z-10 pointer-events-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-block p-3 sm:p-4 bg-[#2183AE] rounded-2xl mb-4">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-gray-900 mb-2">Bienvenido</h1>
          <p className="text-gray-600 text-sm sm:text-base">
            Ingresa tus credenciales para continuar
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <Label htmlFor="identifier" className="text-gray-900 mb-2 text-xs xs:text-base">
              Correo o Nombre de Usuario
            </Label>
            <Input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Ingrese su correo o nombre de usuario"
              className="bg-white border-gray-300 h-10 sm:h-12 focus:border-[#2183AE] focus:ring-[#2183AE] text-sm sm:text-base text-gray-700"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="password" className="text-gray-900 mb-2 text-xs xs:text-base">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingrese su contraseña"
              className="bg-white border-gray-300 h-10 sm:h-12 focus:border-[#2183AE] focus:ring-[#2183AE] text-sm sm:text-base text-gray-700"
              disabled={isLoading}
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
              {error}
            </div>
          )}
          <Button
            type="button"
            onClick={onMicrosoftLogin}
            disabled={isLoading}
            className="w-full h-10 sm:h-12 sm:mt-6 bg-[#1e213d] border hover:bg-white hover:border-[#1e213d] hover:text-[#1e213d] mb-0"
          >
            <MicrosoftLogo className="size-5 mr-2" />
            Iniciar sesión con Microsoft
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full h-10 sm:h-12 sm:mt-2 bg-[#1e213d] border hover:bg-white hover:border-[#1e213d] hover:text-[#1e213d] mb-0"
          >
            {isLoading ? "Ingresando..." : "Iniciar Sesión"}
          </Button>
        </form>
      </div>
    </div>
  );
}