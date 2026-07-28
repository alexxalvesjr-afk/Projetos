"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, ListFilter, Search, Table2, X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
} from "@/lib/domain/vehicle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const SORT_OPTIONS = [
  { value: "recent", label: "Mais recentes" },
  { value: "oldest", label: "Mais antigos" },
  { value: "price_desc", label: "Maior preço" },
  { value: "price_asc", label: "Menor preço" },
  { value: "mileage_asc", label: "Menor km" },
  { value: "year_desc", label: "Ano mais novo" },
  { value: "aging_desc", label: "Mais tempo em estoque" },
];

/**
 * Filters live in the URL rather than component state, so a filtered view is
 * shareable, survives a refresh, and lets the server render the exact result
 * set instead of shipping everything and hiding rows on the client.
 */
export function InventoryFilters({ brands }: { brands: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(searchParams.get("q") ?? "");
  const [isPending, startTransition] = React.useTransition();

  const commit = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      // Any filter change invalidates the current page offset.
      params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  // Debounce the text field so typing does not fire a request per keystroke.
  React.useEffect(() => {
    const current = searchParams.get("q") ?? "";
    if (search === current) return;

    const timer = setTimeout(() => {
      commit((params) => {
        if (search) params.set("q", search);
        else params.delete("q");
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [search, searchParams, commit]);

  function setParam(key: string, value: string | null) {
    commit((params) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
  }

  const view = searchParams.get("view") ?? "grid";
  const sort = searchParams.get("sort") ?? "recent";

  const activeFilters = [
    ["status", VEHICLE_STATUS_LABELS[searchParams.get("status") as never]],
    ["brand", searchParams.get("brand")],
    [
      "transmission",
      TRANSMISSION_LABELS[searchParams.get("transmission") as never],
    ],
    ["fuel", FUEL_LABELS[searchParams.get("fuel") as never]],
    [
      "maxMileage",
      searchParams.get("maxMileage")
        ? `até ${Number(searchParams.get("maxMileage")).toLocaleString("pt-BR")} km`
        : null,
    ],
    [
      "minYear",
      searchParams.get("minYear") ? `a partir de ${searchParams.get("minYear")}` : null,
    ],
  ].filter(([, label]) => Boolean(label)) as [string, string][];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputWithIcon
          icon={<Search />}
          placeholder="Buscar por marca, modelo, placa…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-xs"
          trailing={
            search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="size-4" />
              </button>
            ) : null
          }
        />

        {/* Advanced filters */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <ListFilter />
              Filtros
              {activeFilters.length > 0 ? (
                <Badge size="sm" className="ml-0.5">
                  {activeFilters.length}
                </Badge>
              ) : null}
            </Button>
          </PopoverTrigger>

          <PopoverContent align="start" className="w-80 space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={searchParams.get("status") ?? "all"}
                onValueChange={(value) =>
                  setParam("status", value === "all" ? null : value)
                }
              >
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {Object.entries(VEHICLE_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Marca</Label>
              <Select
                value={searchParams.get("brand") ?? "all"}
                onValueChange={(value) =>
                  setParam("brand", value === "all" ? null : value)
                }
              >
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Câmbio</Label>
                <Select
                  value={searchParams.get("transmission") ?? "all"}
                  onValueChange={(value) =>
                    setParam("transmission", value === "all" ? null : value)
                  }
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(TRANSMISSION_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ),
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Combustível</Label>
                <Select
                  value={searchParams.get("fuel") ?? "all"}
                  onValueChange={(value) =>
                    setParam("fuel", value === "all" ? null : value)
                  }
                >
                  <SelectTrigger size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(FUEL_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="minYear">Ano mínimo</Label>
                <input
                  id="minYear"
                  type="number"
                  defaultValue={searchParams.get("minYear") ?? ""}
                  onBlur={(event) =>
                    setParam("minYear", event.target.value || null)
                  }
                  className="border-input bg-card h-8 w-full rounded-md border px-2 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxMileage">Km máxima</Label>
                <input
                  id="maxMileage"
                  type="number"
                  defaultValue={searchParams.get("maxMileage") ?? ""}
                  onBlur={(event) =>
                    setParam("maxMileage", event.target.value || null)
                  }
                  className="border-input bg-card h-8 w-full rounded-md border px-2 text-sm"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <Select value={sort} onValueChange={(value) => setParam("sort", value)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="bg-muted ml-auto flex items-center gap-0.5 rounded-lg p-1">
          {[
            { value: "grid", icon: LayoutGrid, label: "Grade" },
            { value: "table", icon: Table2, label: "Tabela" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setParam("view", option.value)}
              aria-label={option.label}
              aria-pressed={view === option.value}
              className={cn(
                "flex size-7 items-center justify-center rounded-md transition-colors",
                view === option.value
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <option.icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {/* Active filter chips */}
      {activeFilters.length > 0 ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-1.5 transition-opacity",
            isPending && "opacity-60",
          )}
        >
          {activeFilters.map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setParam(key, null)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/70 flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors"
            >
              {label}
              <X className="size-3" />
            </button>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              startTransition(() => router.replace(pathname, { scroll: false }))
            }
            className="text-muted-foreground h-7 text-xs"
          >
            Limpar tudo
          </Button>
        </div>
      ) : null}
    </div>
  );
}
