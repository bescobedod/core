import { useRef, useCallback, useEffect } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Loader2, SearchX } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export type ProveedorState = {
  searchTerm: string;
  loading: boolean;
  lista: { CardCode: string; CardName: string }[];
  seleccionado: { CardCode: string; CardName: string } | null;
};

export interface ProveedorComboboxProps {
  itemKey: string;
  idEmpresa: string | number | undefined;
  state: {
    searchTerm: string;
    loading: boolean;
    lista: { CardCode: string; CardName: string }[];
    seleccionado: { CardCode: string; CardName: string } | null;
  } | undefined;
  onChange: (key: string, patch: Partial<{
    searchTerm: string;
    loading: boolean;
    lista: { CardCode: string; CardName: string }[];
    seleccionado: { CardCode: string; CardName: string } | null;
  }>) => void;
  getProveedores: (term: string, empresa: any) => Promise<any>;
  getToken: () => void;
}

export function ProveedorCombobox({ itemKey, idEmpresa, state, onChange, getProveedores, getToken }: ProveedorComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTerm = state?.searchTerm ?? "";
  const loading = state?.loading ?? false;
  const lista = state?.lista ?? [];
  const seleccionado = state?.seleccionado ?? null;

  const patch = useCallback((p: Parameters<typeof onChange>[1]) => {
    onChange(itemKey, p);
  }, [itemKey, onChange]);

  const fetchProveedores = async () => {
    if (!idEmpresa || !searchTerm.trim()) return;
    try {
      patch({ loading: true });
      const data = await getProveedores(searchTerm, idEmpresa);
      patch({ lista: data.proveedores || [] });
    } catch (err: any) {
      if (['TOKEN_EXPIRED', 'TOKEN_INVALID', 'TOKEN_REQUIRED'].includes(err?.message)) {
        getToken();
        return;
      }
    } finally {
      patch({ loading: false });
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        patch({ lista: [] });
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative lg:col-span-4" ref={containerRef}>
      <Label className="text-[11px] font-medium text-gray-600 mb-1 block">
        Proveedor *
      </Label>
      <div className="flex gap-1">
        <Input
          type="text"
          placeholder="Buscar proveedor..."
          value={searchTerm}
          onChange={(e) => patch({ searchTerm: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              fetchProveedores();
            }
          }}
          className="text-xs h-8 border border-gray-300 rounded-md focus:ring-1 focus:ring-[#2183AE]"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={fetchProveedores}
          disabled={loading || !searchTerm.trim()}
          className="h-8 w-8 shrink-0 border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 rounded-md"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[#2183AE]" />
          ) : (
            <SearchX className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <AnimatePresence>
        {lista.length > 0 && (
          <motion.ul
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-md shadow-lg divide-y divide-gray-100"
          >
            {lista.map((prov) => (
              <li key={prov.CardCode}>
                <button
                  type="button"
                  onClick={() => {
                    patch({
                      seleccionado: prov,
                      searchTerm: prov.CardName,
                      lista: [],
                    });
                  }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors flex flex-col"
                >
                  <span className="font-medium text-gray-900 truncate">{prov.CardName}</span>
                  <span className="text-gray-400 font-mono text-[10px]">{prov.CardCode}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
      {seleccionado && (
        <span className="text-[10px] text-emerald-600 mt-0.5 block font-medium truncate">
          ✓ {seleccionado.CardCode}
        </span>
      )}
    </div>
  );
}