"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { login } from "@/server/actions/auth.actions";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/**
 * One-click sign-in for reviewing the product.
 *
 * Shown in development, and in any deploy that opts in with
 * NEXT_PUBLIC_DEMO_MODE=true — a preview or a stakeholder demo needs these
 * far more than a local machine does. It stays off by default so a real
 * dealership never ships a login screen advertising shared passwords.
 */
const DEMO_ACCOUNTS = [
  { label: "Proprietária", email: "owner@mypremium.com" },
  { label: "Gerente", email: "gerente@mypremium.com" },
  { label: "Vendedor", email: "thiago@mypremium.com" },
];

const DEMO_PASSWORD = "Mypremium@2026";

const SHOW_DEMO =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const result = await login(values);

    if (!result.ok) {
      setFormError(result.error);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof LoginInput, {
            message: messages?.[0],
          });
        }
      }
      return;
    }

    toast.success("Bem-vindo de volta!");
    // `refresh` lets the new session cookie reach the server components
    // before the dashboard renders.
    router.refresh();
    router.push(searchParams.get("callbackUrl") ?? "/dashboard");
  }

  function fillDemo(email: string) {
    form.setValue("email", email);
    form.setValue("password", DEMO_PASSWORD);
    setFormError(null);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {formError ? (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription className="text-foreground">
              {formError}
            </AlertDescription>
          </Alert>
        ) : null}

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>E-mail</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="voce@revenda.com.br"
                  autoFocus
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Senha</FormLabel>
                <Link
                  href="/login"
                  className="text-muted-foreground hover:text-foreground text-xs"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pr-10"
                    {...field}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 flex w-10 items-center justify-center"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full"
          size="lg"
          loading={form.formState.isSubmitting}
        >
          Entrar
        </Button>

        {SHOW_DEMO ? (
          <div className="space-y-2 rounded-lg border border-dashed p-3">
            <p className="text-muted-foreground text-xs font-medium">
              Acesso de demonstração · senha {DEMO_PASSWORD}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {DEMO_ACCOUNTS.map((account) => (
                <Button
                  key={account.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fillDemo(account.email)}
                >
                  {account.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </form>
    </Form>
  );
}
