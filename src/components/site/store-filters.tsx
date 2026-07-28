"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { FUEL_LABELS, TRANSMISSION_LABELS } from "@/lib/domain/vehicle";
import { Button } from "@/components/ui/button";
import { InputWithIcon } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SORTS = [
  { value: "recent", label: "Mais recentes" },
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "mileage_asc", label: "Menor quilometragem" },
  { value: "year_desc", label: "Ano mais novo" },
];

/** Shopper-facing filters. Deliberately fewer knobs than the back office. */
export function StoreFilters({ brands }: { brands: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = React.useState(searchParams.get("q") ?? "");
  const [, startTransition] = React.useTransition();

  const commit = React.useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      params.delete("page");
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

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

  const hasFilters = ["brand", "transmission", "fuel", "q"].some((key) =>
    searchParams.get(key),
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <InputWithIcon
        icon={<Search />}
        placeholder="Buscar por marca ou modelo"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-xs"
        trailing={
          search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Limpar busca"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          ) : null
        }
      />

      <Select
        value={searchParams.get("brand") ?? "all"}
        onValueChange={(value) =>
          setParam("brand", value === "all" ? null : value)
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Marca" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as marcas</SelectItem>
          {brands.map((brand) => (
            <SelectItem key={brand} value={brand}>
              {brand}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("transmission") ?? "all"}
        onValueChange={(value) =>
          setParam("transmission", value === "all" ? null : value)
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Câmbio" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Qualquer câmbio</SelectItem>
          {Object.entries(TRANSMISSION_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("fuel") ?? "all"}
        onValueChange={(value) =>
          setParam("fuel", value === "all" ? null : value)
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Combustível" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Qualquer combustível</SelectItem>
          {Object.entries(FUEL_LABELS).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={searchParams.get("sort") ?? "recent"}
        onValueChange={(value) => setParam("sort", value)}
      >
        <SelectTrigger className="ml-auto w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORTS.map((sort) => (
            <SelectItem key={sort.value} value={sort.value}>
              {sort.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            startTransition(() => router.replace(pathname, { scroll: false }))
          }
        >
          Limpar
        </Button>
      ) : null}
    </div>
  );
}
