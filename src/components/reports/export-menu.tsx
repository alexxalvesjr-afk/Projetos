"use client";

import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const REPORTS = [
  { id: "sales", label: "Vendas" },
  { id: "inventory", label: "Estoque" },
  { id: "leads", label: "Leads" },
  { id: "sellers", label: "Vendedores" },
] as const;

/**
 * Export actions.
 *
 * CSV is generated server-side (UTF-8 BOM + `;` separator so Excel opens it
 * cleanly in pt-BR) and PDF goes through the browser's own print pipeline,
 * which renders the real page under the print stylesheet rather than a
 * second, drifting layout.
 */
export function ExportMenu() {
  function download(report: string) {
    toast.promise(
      fetch(`/api/reports/export?report=${report}`).then(async (response) => {
        if (!response.ok) throw new Error("Falha na exportação");

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download =
          response.headers
            .get("Content-Disposition")
            ?.match(/filename="(.+)"/)?.[1] ?? `${report}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
      }),
      {
        loading: "Gerando arquivo…",
        success: "Download iniciado",
        error: "Não foi possível exportar",
      },
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="print:hidden">
          <Download />
          Exportar
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Planilha (Excel/CSV)</DropdownMenuLabel>
        {REPORTS.map((report) => (
          <DropdownMenuItem
            key={report.id}
            onSelect={() => download(report.id)}
          >
            <FileSpreadsheet />
            {report.label}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem onSelect={() => window.print()}>
          <Printer />
          Imprimir / salvar PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
