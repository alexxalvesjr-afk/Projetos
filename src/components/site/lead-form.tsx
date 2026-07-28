"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

import {
  publicLeadSchema,
  type PublicLeadInput,
} from "@/lib/validations/lead";
import { submitPublicLead } from "@/server/actions/public.actions";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function SiteLeadForm({
  organizationSlug,
  vehicleId,
  vehicleName,
  compact = false,
}: {
  organizationSlug: string;
  vehicleId?: string;
  vehicleName?: string;
  compact?: boolean;
}) {
  const [sent, setSent] = React.useState(false);

  const form = useForm<PublicLeadInput>({
    resolver: zodResolver(publicLeadSchema),
    defaultValues: {
      organizationSlug,
      name: "",
      phone: "",
      email: "",
      message: vehicleName ? `Tenho interesse no ${vehicleName}.` : "",
      vehicleId: vehicleId ?? "",
      website: "",
    },
  });

  async function onSubmit(values: PublicLeadInput) {
    const result = await submitPublicLead(values);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    setSent(true);
    form.reset();
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed p-8 text-center">
        <div className="bg-success/12 text-success flex size-12 items-center justify-center rounded-full">
          <CheckCircle2 className="size-6" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">Recebemos seu contato!</p>
          <p className="text-muted-foreground text-sm">
            Um consultor vai te chamar em instantes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSent(false)}>
          Enviar outra mensagem
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Honeypot: hidden from humans, irresistible to bots. */}
        <div aria-hidden className="hidden">
          <label htmlFor="website">Não preencha este campo</label>
          <input
            id="website"
            tabIndex={-1}
            autoComplete="off"
            {...form.register("website")}
          />
        </div>

        <div className={compact ? "space-y-4" : "grid gap-4 sm:grid-cols-2"}>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome</FormLabel>
                <FormControl>
                  <Input placeholder="Seu nome" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>WhatsApp</FormLabel>
                <FormControl>
                  <Input
                    inputMode="tel"
                    placeholder="(11) 98765-4321"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail (opcional)</FormLabel>
              <FormControl>
                <Input type="email" placeholder="voce@email.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Mensagem</FormLabel>
              <FormControl>
                <Textarea
                  rows={compact ? 3 : 4}
                  placeholder="Conte o que você procura…"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={form.formState.isSubmitting}
        >
          <Send />
          Quero mais informações
        </Button>

        <p className="text-muted-foreground text-center text-xs">
          Seus dados são usados apenas para este atendimento.
        </p>
      </form>
    </Form>
  );
}
