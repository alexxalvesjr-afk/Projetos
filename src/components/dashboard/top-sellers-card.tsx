import Link from "next/link";
import { Trophy, Users } from "lucide-react";

import { cn, percent } from "@/lib/utils";
import { formatCurrencyShort } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserAvatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/empty-state";

export type SellerRow = {
  sellerId: string;
  name: string;
  image: string | null;
  jobTitle: string | null;
  unitsSold: number;
  revenueCents: number;
  profitCents: number;
};

/** Medal tints for the podium; everyone else gets a plain rank number. */
const PODIUM = [
  "bg-[oklch(0.85_0.13_85)]/18 text-[oklch(0.62_0.14_85)]",
  "bg-muted text-muted-foreground",
  "bg-[oklch(0.72_0.11_45)]/18 text-[oklch(0.55_0.12_45)]",
];

export function TopSellersCard({ sellers }: { sellers: SellerRow[] }) {
  const leader = sellers[0]?.revenueCents ?? 0;

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Top vendedores</CardTitle>
        <CardAction>
          <Button asChild variant="ghost" size="sm">
            <Link href="/goals">Ver ranking</Link>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="flex-1">
        {sellers.length === 0 ? (
          <EmptyState
            compact
            icon={Users}
            title="Nenhuma venda no mês"
            description="Assim que a primeira venda for registrada, o ranking aparece aqui."
          />
        ) : (
          <ol className="space-y-3.5">
            {sellers.map((seller, index) => (
              <li key={seller.sellerId} className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                    PODIUM[index] ?? "bg-muted text-muted-foreground",
                  )}
                >
                  {index === 0 ? <Trophy className="size-3.5" /> : index + 1}
                </span>

                <UserAvatar
                  name={seller.name}
                  image={seller.image}
                  className="size-8 shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {seller.name}
                    </p>
                    <p className="tabular shrink-0 text-sm font-semibold">
                      {formatCurrencyShort(seller.revenueCents)}
                    </p>
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    {/* Bar is relative to the leader, so the gap is legible. */}
                    <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
                      <div
                        className="bg-primary h-full rounded-full transition-[width] duration-700"
                        style={{
                          width: `${percent(seller.revenueCents, leader)}%`,
                        }}
                      />
                    </div>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {seller.unitsSold}{" "}
                      {seller.unitsSold === 1 ? "venda" : "vendas"}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
