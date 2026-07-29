import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { hasPermission } from "@/lib/rbac";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { safeFileName, sanitizeCsvCell } from "@/lib/sanitize";
import { daysBetween } from "@/lib/format";
import {
  metricsRepository,
  monthPeriod,
} from "@/server/repositories/metrics.repository";
import { calculateProfit, VEHICLE_STATUS_LABELS } from "@/lib/domain/vehicle";
import { LEAD_SOURCE_LABELS, STAGE_LABELS } from "@/lib/domain/lead";

type Row = (string | number)[];

/**
 * Serialises rows as CSV.
 *
 * A UTF-8 BOM is prepended so Excel on Windows detects the encoding and renders
 * accented characters correctly; `;` is the separator because that is what
 * pt-BR locales expect. Every cell goes through `sanitizeCsvCell`, which
 * neutralises formula injection (`=`, `+`, `-`, `@`).
 */
function toCsv(header: Row, rows: Row[]): string {
  const lines = [header, ...rows].map((row) =>
    row.map(sanitizeCsvCell).join(";"),
  );
  return `﻿${lines.join("\r\n")}`;
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasPermission(user.role, "report:export")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const limited = checkRateLimit(`export:${user.id}`, RATE_LIMITS.export);
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(limited.retryAfter) } },
    );
  }

  const url = new URL(request.url);
  const report = url.searchParams.get("report") ?? "sales";
  const org = user.organizationId;
  const period = monthPeriod();

  let header: Row = [];
  let rows: Row[] = [];
  let name = "relatorio";

  switch (report) {
    case "inventory": {
      const vehicles = await db.vehicle.findMany({
        where: { organizationId: org },
        include: { expenses: { select: { amountCents: true } } },
        orderBy: { createdAt: "desc" },
      });

      name = "estoque";
      header = [
        "Marca", "Modelo", "Versão", "Ano", "Km", "Cor", "Status",
        "Custo", "Despesas", "Preço", "Lucro previsto", "Margem %",
        "Dias em estoque",
      ];
      rows = vehicles.map((vehicle) => {
        const expenses = vehicle.expenses.reduce(
          (sum, expense) => sum + expense.amountCents,
          0,
        );
        const { profitCents, marginPercent } = calculateProfit({
          priceCents: vehicle.priceCents,
          costCents: vehicle.costCents,
          expensesCents: expenses,
        });

        return [
          vehicle.brand,
          vehicle.model,
          vehicle.version ?? "",
          vehicle.year,
          vehicle.mileage,
          vehicle.color,
          VEHICLE_STATUS_LABELS[vehicle.status],
          (vehicle.costCents / 100).toFixed(2),
          (expenses / 100).toFixed(2),
          (vehicle.priceCents / 100).toFixed(2),
          (profitCents / 100).toFixed(2),
          marginPercent.toFixed(1),
          daysBetween(vehicle.purchasedAt, vehicle.soldAt ?? new Date()),
        ];
      });
      break;
    }

    case "leads": {
      const leads = await db.lead.findMany({
        where: { organizationId: org },
        include: {
          assignedTo: { select: { name: true } },
          interestVehicle: { select: { brand: true, model: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      name = "leads";
      header = [
        "Nome", "Telefone", "E-mail", "Origem", "Etapa", "Score",
        "Consultor", "Veículo de interesse", "Criado em", "Último contato",
      ];
      rows = leads.map((lead) => [
        lead.name,
        lead.phone ?? "",
        lead.email ?? "",
        LEAD_SOURCE_LABELS[lead.source],
        STAGE_LABELS[lead.stage],
        lead.score,
        lead.assignedTo?.name ?? "",
        lead.interestVehicle
          ? `${lead.interestVehicle.brand} ${lead.interestVehicle.model}`
          : "",
        lead.createdAt.toISOString().slice(0, 10),
        lead.lastContactAt?.toISOString().slice(0, 10) ?? "",
      ]);
      break;
    }

    case "sellers": {
      const sellers = await metricsRepository.topSellers(org, period, 100);

      name = "vendedores";
      header = ["Vendedor", "Vendas", "Faturamento", "Lucro", "Comissão"];
      rows = sellers.map((seller) => [
        seller.name,
        seller.unitsSold,
        (seller.revenueCents / 100).toFixed(2),
        (seller.profitCents / 100).toFixed(2),
        (seller.commissionCents / 100).toFixed(2),
      ]);
      break;
    }

    default: {
      const sales = await db.sale.findMany({
        where: { organizationId: org },
        include: {
          vehicle: { select: { brand: true, model: true, year: true } },
          seller: { select: { name: true } },
        },
        orderBy: { soldAt: "desc" },
      });

      name = "vendas";
      header = [
        "Data", "Veículo", "Ano", "Cliente", "Vendedor", "Pagamento",
        "Valor", "Custo", "Desconto", "Lucro", "Comissão",
      ];
      rows = sales.map((sale) => [
        sale.soldAt.toISOString().slice(0, 10),
        `${sale.vehicle.brand} ${sale.vehicle.model}`,
        sale.vehicle.year,
        sale.customerName,
        sale.seller?.name ?? "",
        sale.paymentMethod,
        (sale.salePriceCents / 100).toFixed(2),
        (sale.costCents / 100).toFixed(2),
        (sale.discountCents / 100).toFixed(2),
        ((sale.salePriceCents - sale.costCents) / 100).toFixed(2),
        (sale.commissionCents / 100).toFixed(2),
      ]);
    }
  }

  const filename = safeFileName(
    `mypremium-${name}-${new Date().toISOString().slice(0, 10)}.csv`,
  );

  return new NextResponse(toCsv(header, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      // Reports contain commercial data; never let a proxy cache them.
      "Cache-Control": "no-store, must-revalidate",
    },
  });
}
