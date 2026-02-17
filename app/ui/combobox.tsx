
import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { Button } from "./button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./command";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

export interface ComboboxOption {
  id: string;
  name: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Seleccionar...",
  searchPlaceholder = "Buscar...",
  emptyMessage = "No se encontraron resultados",
  className = "text-gray-900",
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const selectedOption = options.find((option) => option.id === value);
  const [search, setSearch] = React.useState("");
  const filteredOptions = options.filter(option =>
  (option.name ?? "")
    .toLowerCase()
    .includes(search.toLowerCase())
);


  return (
    <Popover open={open} onOpenChange={(state) => !disabled && setOpen(state)}>
      <PopoverTrigger asChild>
        <Button
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={`w-full justify-between bg-gray-50 border border-gray-300 text-gray-900 hover:bg-gray-100 focus:ring-2 focus:ring-[#2183AE] ${className}`}
        >
          {selectedOption ? selectedOption.name : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 max-h-60 overflow-auto"
        align="start"
      >
        <div className="sticky top-0 bg-white z-10 p-2 border-b">
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-gray-900"
          />
        </div>
        <Command>
          <CommandList className="max-h-none overflow-visible">
            {filteredOptions.length === 0 ? (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map(option => (
                  <CommandItem
                    key={option.id}
                    value={option.name}
                    onSelect={() => {
                      onChange(option.id);
                      setOpen(false);
                    }}
                  >
                    {option.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}