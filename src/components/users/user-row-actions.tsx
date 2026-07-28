"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { MoreHorizontal, Power, UserCog } from "lucide-react";
import { toast } from "sonner";

import {
  ASSIGNABLE_ROLES,
  canAssignRole,
  ROLE_LABELS,
  type AssignableRole,
} from "@/lib/rbac";
import { updateUser } from "@/server/actions/settings.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Member = {
  id: string;
  name: string;
  role: Role;
  jobTitle: string | null;
  commissionRate: number;
  isActive: boolean;
};

export function UserRowActions({
  member,
  actorRole,
}: {
  member: Member;
  actorRole: Role;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [draft, setDraft] = React.useState(member);

  // The owner's account is only editable by the owner.
  const locked = member.role === "OWNER" && actorRole !== "OWNER";

  const assignable = ASSIGNABLE_ROLES.filter((role) =>
    canAssignRole(actorRole, role),
  );

  function save(next: Partial<Member> = {}) {
    const payload = { ...draft, ...next };

    startTransition(async () => {
      const result = await updateUser({
        id: payload.id,
        name: payload.name,
        role: payload.role as AssignableRole,
        jobTitle: payload.jobTitle ?? "",
        commissionRate: payload.commissionRate,
        isActive: payload.isActive,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      toast.success("Usuário atualizado");
      setOpen(false);
      router.refresh();
    });
  }

  if (locked) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Ações do usuário">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              setDraft(member);
              setOpen(true);
            }}
          >
            <UserCog />
            Editar
          </DropdownMenuItem>

          <DropdownMenuItem
            variant={member.isActive ? "destructive" : "default"}
            onSelect={(event) => {
              event.preventDefault();
              save({ isActive: !member.isActive });
            }}
          >
            <Power />
            {member.isActive ? "Desativar" : "Reativar"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar {member.name}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-name">Nome</Label>
              <Input
                id="member-name"
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={draft.role}
                onValueChange={(value) =>
                  setDraft({ ...draft, role: value as Role })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignable.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="member-title">Cargo</Label>
                <Input
                  id="member-title"
                  value={draft.jobTitle ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, jobTitle: event.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="member-commission">Comissão (%)</Label>
                <Input
                  id="member-commission"
                  type="number"
                  step="0.1"
                  min={0}
                  max={100}
                  value={draft.commissionRate}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      commissionRate: Number(event.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Conta ativa</p>
                <p className="text-muted-foreground text-xs">
                  Contas inativas não conseguem entrar no sistema.
                </p>
              </div>
              <Switch
                checked={draft.isActive}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, isActive: checked })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => save()} loading={pending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
