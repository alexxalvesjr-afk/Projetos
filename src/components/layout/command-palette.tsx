"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Car,
  CircleUser,
  Loader2,
  Moon,
  Plus,
  Search,
  Sun,
  UserRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import type { Role } from "@prisma/client";

import { hasPermission } from "@/lib/rbac";
import { NAVIGATION } from "@/lib/navigation";
import type { SearchHit } from "@/app/api/search/route";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

const TYPE_ICONS = {
  vehicle: Car,
  lead: UserRound,
  user: CircleUser,
  appointment: Search,
} as const;

const TYPE_GROUPS: Record<SearchHit["type"], string> = {
  vehicle: "Veículos",
  lead: "Leads",
  user: "Equipe",
  appointment: "Agenda",
};

export function CommandPalette({ role }: { role: Role }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  // ⌘K / Ctrl+K anywhere in the app.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Debounce so a fast typist issues one request, not ten.
  const [debounced, setDebounced] = React.useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 220);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ["command-search", debounced],
    enabled: open && debounced.trim().length >= 2,
    staleTime: 30_000,
    queryFn: async (): Promise<{ results: SearchHit[] }> => {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(debounced)}`,
      );
      if (!response.ok) throw new Error("search failed");
      return response.json();
    },
  });

  const run = React.useCallback((action: () => void) => {
    setOpen(false);
    setQuery("");
    action();
  }, []);

  const navItems = React.useMemo(
    () =>
      NAVIGATION.flatMap((section) => section.items).filter(
        (item) => !item.permission || hasPermission(role, item.permission),
      ),
    [role],
  );

  const grouped = React.useMemo(() => {
    const map = new Map<SearchHit["type"], SearchHit[]>();
    for (const hit of data?.results ?? []) {
      const bucket = map.get(hit.type) ?? [];
      bucket.push(hit);
      map.set(hit.type, bucket);
    }
    return map;
  }, [data]);

  const hasResults = (data?.results.length ?? 0) > 0;
  const searching = debounced.trim().length >= 2;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground bg-card hover:border-ring/40 hover:text-foreground flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border px-3 text-sm shadow-xs transition-colors"
      >
        <Search className="size-4 shrink-0" />
        <span className="flex-1 truncate text-left">Buscar…</span>
        <kbd className="bg-muted text-muted-foreground hidden rounded px-1.5 py-0.5 font-mono text-[10px] font-medium sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {/* While a query is in flight the API has already ranked the hits, so
          cmdk's client-side filter is switched off to avoid double-filtering.
          With an empty query it stays on so the static lists remain typeable. */}
      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        shouldFilter={!searching}
      >
        <CommandInput
          placeholder="Buscar veículos, leads, páginas…"
          value={query}
          onValueChange={setQuery}
        />

        <CommandList>
          {searching && isFetching ? (
            <div className="text-muted-foreground flex items-center justify-center gap-2 py-8 text-sm">
              <Loader2 className="size-4 animate-spin" />
              Buscando…
            </div>
          ) : null}

          {searching && !isFetching && !hasResults ? (
            <CommandEmpty>
              Nada encontrado para &ldquo;{debounced}&rdquo;.
            </CommandEmpty>
          ) : null}

          {Array.from(grouped.entries()).map(([type, hits]) => {
            const Icon = TYPE_ICONS[type];
            return (
              <CommandGroup key={type} heading={TYPE_GROUPS[type]}>
                {hits.map((hit) => (
                  <CommandItem
                    key={hit.id}
                    value={`${hit.title} ${hit.subtitle ?? ""}`}
                    onSelect={() => run(() => router.push(hit.href))}
                  >
                    <Icon className="text-muted-foreground" />
                    <span className="flex-1 truncate">{hit.title}</span>
                    {hit.subtitle ? (
                      <span className="text-muted-foreground truncate text-xs">
                        {hit.subtitle}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}

          {!searching ? (
            <>
              <CommandGroup heading="Ir para">
                {navItems.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={item.label}
                    onSelect={() => run(() => router.push(item.href))}
                  >
                    <item.icon className="text-muted-foreground" />
                    {item.label}
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator />

              <CommandGroup heading="Ações">
                {hasPermission(role, "vehicle:create") ? (
                  <CommandItem
                    value="Cadastrar veículo"
                    onSelect={() => run(() => router.push("/inventory/new"))}
                  >
                    <Plus className="text-muted-foreground" />
                    Cadastrar veículo
                    <CommandShortcut>N</CommandShortcut>
                  </CommandItem>
                ) : null}

                <CommandItem
                  value="Tema claro"
                  onSelect={() => run(() => setTheme("light"))}
                >
                  <Sun className="text-muted-foreground" />
                  Tema claro
                </CommandItem>
                <CommandItem
                  value="Tema escuro"
                  onSelect={() => run(() => setTheme("dark"))}
                >
                  <Moon className="text-muted-foreground" />
                  Tema escuro
                </CommandItem>
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
