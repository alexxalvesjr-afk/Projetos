import * as React from "react";

import { cn } from "@/lib/utils";

const inputBaseClasses = [
  "flex w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2",
  "text-sm text-foreground shadow-xs transition-[color,box-shadow,border-color]",
  "placeholder:text-muted-foreground/70",
  "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:outline-none",
  "disabled:cursor-not-allowed disabled:opacity-60",
  "aria-invalid:border-destructive aria-invalid:ring-destructive/20",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium",
].join(" ");

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(inputBaseClasses, "h-9.5", className)}
      {...props}
    />
  );
}

/** Input with a leading icon slot — used by search fields. */
function InputWithIcon({
  className,
  icon,
  trailing,
  ...props
}: React.ComponentProps<"input"> & {
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center">
      {icon ? (
        <span className="text-muted-foreground pointer-events-none absolute left-3 flex items-center [&_svg]:size-4">
          {icon}
        </span>
      ) : null}
      <input
        data-slot="input"
        className={cn(
          inputBaseClasses,
          "h-9.5",
          icon && "pl-9",
          trailing && "pr-9",
          className,
        )}
        {...props}
      />
      {trailing ? (
        <span className="absolute right-2.5 flex items-center">{trailing}</span>
      ) : null}
    </div>
  );
}

export { Input, InputWithIcon, inputBaseClasses };
