
import * as React from "react";
import { Search } from "lucide-react";

const CommandContext = React.createContext<{
  search: string;
  setSearch: (search: string) => void;
}>({
  search: "",
  setSearch: () => {},
});

const Command = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    const [search, setSearch] = React.useState("");

    return (
      <CommandContext.Provider value={{ search, setSearch }}>
        <div
          ref={ref}
          className={`flex h-full w-full flex-col overflow-hidden rounded-md bg-white text-gray-950 ${className}`}
          {...props}
        >
          {children}
        </div>
      </CommandContext.Provider>
    );
  }
);
Command.displayName = "Command";

const CommandInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => {
    const { search, setSearch } = React.useContext(CommandContext);

    return (
      <div className="flex items-center border-b border-gray-200 px-3">
        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
        <input
          ref={ref}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-gray-500 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
          {...props}
        />
      </div>
    );
  }
);
CommandInput.displayName = "CommandInput";

const CommandList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    const { search } = React.useContext(CommandContext);

    const hasVisibleItems = React.useMemo(() => {
      let hasItems = false;
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child) && child.type === CommandGroup) {
          const groupChildren = React.Children.toArray(child);
          const visibleGroupItems = groupChildren.filter((item) => {
            if (!React.isValidElement(item)) return false;
            const value = (item.props as { value?: string }).value || "";
            if (!search) return true;
            return value.toLowerCase().includes(search.toLowerCase());
          });
          if (visibleGroupItems.length > 0) hasItems = true;
        }
      });
      return hasItems;
    }, [children, search]);

    const renderedChildren = React.Children.map(children, (child) => {
      if (React.isValidElement(child) && child.type === CommandEmpty) {
        return hasVisibleItems ? null : child;
      }
      return child;
    });

    return (
      <div
        ref={ref}
        className={`max-h-[300px] overflow-y-auto overflow-x-hidden ${className}`}
        {...props}
      >
        {renderedChildren}
      </div>
    );
  }
);
CommandList.displayName = "CommandList";

const CommandEmpty = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  (props, ref) => (
    <div
      ref={ref}
      className="py-6 text-center text-sm text-gray-500"
      {...props}
    />
  )
);
CommandEmpty.displayName = "CommandEmpty";

const CommandGroup = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className = "", children, ...props }, ref) => {
    const { search } = React.useContext(CommandContext);

    const filteredChildren = React.Children.toArray(children).filter((child) => {
      if (!React.isValidElement(child)) return true;
      const value = (child.props as { value?: string }).value || "";
      if (!search) return true;
      return value.toLowerCase().includes(search.toLowerCase());
    });

    if (filteredChildren.length === 0) return null;

    return (
      <div
        ref={ref}
        className={`overflow-hidden p-1 text-gray-950 ${className}`}
        {...props}
      >
        {filteredChildren}
      </div>
    );
  }
);
CommandGroup.displayName = "CommandGroup";

interface CommandItemProps {
  value?: string;
  onSelect?: (value: string) => void;
  className?: string;
  children?: React.ReactNode;
}

const CommandItem = React.forwardRef<HTMLDivElement, CommandItemProps>(
  ({ className = "", value = "", onSelect, children, ...props }, ref) => {
    const handleClick = () => {
      if (onSelect && value) {
        onSelect(value);
      }
    };

    return (
      <div
        ref={ref}
        className={`relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 ${className}`}
        onClick={handleClick}
        {...props}
      >
        {children}
      </div>
    );
  }
);
CommandItem.displayName = "CommandItem";

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
};