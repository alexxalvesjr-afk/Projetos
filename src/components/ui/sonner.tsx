"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Toast host. Styling is driven by the design tokens rather than Sonner's
 * defaults so notifications match the rest of the surface in both themes.
 */
function Toaster(props: ToasterProps) {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast:
            "group rounded-xl border border-border bg-card text-card-foreground shadow-lg",
          title: "text-sm font-medium",
          description: "text-muted-foreground text-sm",
          actionButton:
            "bg-primary text-primary-foreground rounded-md px-2.5 py-1 text-xs font-medium",
          cancelButton:
            "bg-muted text-muted-foreground rounded-md px-2.5 py-1 text-xs font-medium",
          success: "[&_[data-icon]]:text-success",
          error: "[&_[data-icon]]:text-destructive",
          warning: "[&_[data-icon]]:text-warning",
          info: "[&_[data-icon]]:text-info",
        },
      }}
      style={
        {
          "--normal-bg": "var(--card)",
          "--normal-text": "var(--card-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
