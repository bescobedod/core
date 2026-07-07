"use client"

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle } from "lucide-react";
import { Button } from "../ui/button";
import { useMsal } from "@azure/msal-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

const getTitleForStatus = (status: number) => {
  switch (status) {
    case 401:
      return "Error de Autenticación";
    case 403:
      return "Acceso Denegado";
    case 404:
      return "Mensaje del Servidor";
    case 500:
      return "Error Interno del Servidor";
    default:
      return "Error del servidor";
  }
};

export default function GlobalBackendErrorModal() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("Error del servidor");
  const [shouldLogout, setShouldLogout] = useState(false);
  const { instance, accounts } = useMsal();

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);

    const showBackendError = async (status: number, rawMsg: string, code?: string) => {
      const normalized = String(rawMsg || "").trim();
      const msg = normalized || `Error ${status}`;
      const msgLower = msg.toLowerCase();
      const isAuthError = status === 401 || ['TOKEN_EXPIRED','TOKEN_INVALID','TOKEN_REQUIRED'].includes((code || "").toUpperCase()) || msgLower.includes('sesión expirada') || msgLower.includes('token expirado') || msgLower.includes('token requerido') || msgLower.includes('token inválido') || msgLower.includes('jwt expired') || msgLower.includes('invalid signature');

      setMessage(msg);
      setTitle(getTitleForStatus(status));
      setShouldLogout(Boolean(isAuthError));
      setOpen(true);
    };

    const handler = (e: Event) => {
      const custom = e as CustomEvent;
      const detail = custom?.detail || {};
      const status = Number(detail.status || 0) || 0;
      const msg = detail.message || detail.raw || `Error ${status}`;
      showBackendError(status, String(msg), detail.code);
    };

    const patchedFetch: typeof window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const requestUrl = typeof args[0] === 'string'
        ? args[0]
        : args[0] instanceof Request
          ? args[0].url
          : args[0] instanceof URL
            ? args[0].toString()
            : "";
      const isApiRequest = API_BASE_URL && requestUrl?.startsWith(API_BASE_URL);

      if (isApiRequest && !response.ok) {
        let body: any = null;
        try {
          body = await response.clone().json();
        } catch {
          try {
            body = { error: await response.clone().text() };
          } catch {
            body = null;
          }
        }

        const rawMsg = body?.error || body?.message || body?.error_description || response.statusText || "";
        const status = response.status;
        showBackendError(status, String(rawMsg), body?.code);
      }

      return response;
    };

    window.fetch = patchedFetch;
    window.addEventListener("backend-error", handler as EventListener);

    return () => {
      window.fetch = originalFetch;
      window.removeEventListener("backend-error", handler as EventListener);
    };
  }, [instance, accounts]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="global-backend-error" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} transition={{ duration: 0.25, ease: "easeOut" }} className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-8 text-center border border-gray-100">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-12 w-12 text-red-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>
            <p className="text-gray-600 mb-6">{message ?? "Ocurrió un error al conectar con el servidor."}</p>
            <Button
              onClick={() => {
                if (shouldLogout) {
                  try { localStorage.clear(); } catch {}
                  const method = localStorage.getItem("login_method");
                  if (method === "microsoft" && instance && accounts && accounts.length > 0) {
                    try { instance.logoutRedirect({ account: accounts[0], postLogoutRedirectUri: window.location.origin }); return; } catch {}
                  }
                  window.location.href = "/";
                } else {
                  setOpen(false);
                }
              }}
              className="w-full bg-[#2183AE] text-white hover:bg-[#1a6a8f] py-4 rounded-xl font-semibold"
            >
              Entendido
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
