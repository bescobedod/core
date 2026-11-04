"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { cn } from "./utils";

function Popover({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root {...props} />;
}

function PopoverTrigger({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger {...props} />;
}

// El Header es fijo (z-30, unos 100px de alto). El contenido del popover va en
// un portal con z-50, así que al hacer scroll con el menú abierto se dibujaba
// encima del Header. collisionPadding reserva esa franja y, con
// hideWhenDetached, el menú se oculta cuando su campo queda tapado por el
// Header (y reaparece al volver a verlo).
const ALTO_HEADER_FIJO = 112;

function PopoverContent({
  className,
  align = "center",
  sideOffset = 4,
  collisionPadding = { top: ALTO_HEADER_FIJO },
  hideWhenDetached = true,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        hideWhenDetached={hideWhenDetached}
        className={cn(
          "bg-popover text-popover-foreground z-50 w-[var(--radix-popover-trigger-width)] rounded-md border shadow-md outline-hidden max-h-90 overflow-auto p-0",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}

function PopoverAnchor({
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor {...props} />;
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };