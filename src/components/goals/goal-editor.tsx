"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Target } from "lucide-react";
import { toast } from "sonner";

import { goalSchema, type GoalInput } from "@/lib/validations/agenda";
import { upsertGoal } from "@/server/actions/agenda.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function GoalEditor({
  team,
  period,
}: {
  team: { id: string; name: string }[];
  period: Date;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  const form = useForm<GoalInput>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      period,
      type: "ORGANIZATION",
      userId: "",
      targetRevenueCents: 0,
      targetProfitCents: 0,
      targetUnits: 0,
    },
  });

  const type = form.watch("type");

  async function onSubmit(values: GoalInput) {
    const result = await upsertGoal(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success("Meta salva");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Target />
          Definir meta
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Definir meta</DialogTitle>
          <DialogDescription>
            Salvar novamente o mesmo mês atualiza a meta existente.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de meta</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ORGANIZATION">Loja inteira</SelectItem>
                      <SelectItem value="USER">Vendedor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {type === "USER" ? (
              <FormField
                control={form.control}
                name="userId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vendedor</FormLabel>
                    <Select
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {team.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="period"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês</FormLabel>
                  <FormControl>
                    <Input
                      type="month"
                      value={new Date(field.value).toISOString().slice(0, 7)}
                      onChange={(event) =>
                        // Parse as UTC midnight of day 1 to match how goals are keyed.
                        field.onChange(new Date(`${event.target.value}-01T00:00:00Z`))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="targetRevenueCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Faturamento</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="targetProfitCents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lucro</FormLabel>
                    <FormControl>
                      <MoneyInput
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="targetUnits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veículos vendidos</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      {...field}
                      onChange={(event) =>
                        field.onChange(Number(event.target.value))
                      }
                    />
                  </FormControl>
                  <FormDescription>
                    Quantidade de unidades no mês.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" loading={form.formState.isSubmitting}>
                Salvar meta
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
