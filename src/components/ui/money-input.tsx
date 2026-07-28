"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { inputBaseClasses } from "@/components/ui/input";

/**
 * Currency field that keeps integer cents in form state while showing a
 * localised decimal to the user.
 *
 * Typing is digit-driven: every keystroke shifts the value by a decimal place,
 * the way a POS terminal behaves. That removes every ambiguity around where the
 * separator goes and makes it impossible to submit a half-parsed number.
 */
export function MoneyInput({
  value,
  onChange,
  className,
  currency = "R$",
  ...props
}: Omit<React.ComponentProps<"input">, "value" | "onChange" | "type"> & {
  value: number;
  onChange: (cents: number) => void;
  currency?: string;
}) {
  const display = React.useMemo(
    () =>
      new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format((value || 0) / 100),
    [value],
  );

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const digits = event.target.value.replace(/\D/g, "");
    // Cap at ~10M currency units to stay inside a 32-bit cents column.
    const cents = Math.min(Number(digits || "0"), 999_999_999);
    onChange(cents);
  }

  return (
    <div className="relative flex items-center">
      <span className="text-muted-foreground pointer-events-none absolute left-3 text-sm">
        {currency}
      </span>
      <input
        {...props}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        // Selecting all on focus makes overwriting a value a single action.
        onFocus={(event) => event.currentTarget.select()}
        className={cn(inputBaseClasses, "tabular h-9.5 pl-10 text-right", className)}
      />
    </div>
  );
}
