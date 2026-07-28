"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { MessageSquareQuote, Plus, Save, Sparkles, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  websiteSettingsSchema,
  type FaqInput,
  type ServiceInput,
  type TestimonialInput,
  type WebsiteSettingsInput,
} from "@/lib/validations/settings";
import {
  deleteCmsItem,
  updateWebsiteSettings,
  upsertFaq,
  upsertService,
  upsertTestimonial,
} from "@/server/actions/settings.actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";

type Testimonial = TestimonialInput & { id: string };
type Faq = FaqInput & { id: string };
type Service = ServiceInput & { id: string };

export function CmsEditor({
  settings,
  testimonials,
  faqs,
  services,
}: {
  settings: WebsiteSettingsInput;
  testimonials: Testimonial[];
  faqs: Faq[];
  services: Service[];
}) {
  return (
    <Tabs defaultValue="home" className="space-y-4">
      <TabsList>
        <TabsTrigger value="home">Home & SEO</TabsTrigger>
        <TabsTrigger value="testimonials">Depoimentos</TabsTrigger>
        <TabsTrigger value="services">Serviços</TabsTrigger>
        <TabsTrigger value="faq">FAQ</TabsTrigger>
      </TabsList>

      <TabsContent value="home">
        <HomeForm defaults={settings} />
      </TabsContent>

      <TabsContent value="testimonials">
        <TestimonialsPanel items={testimonials} />
      </TabsContent>

      <TabsContent value="services">
        <ServicesPanel items={services} />
      </TabsContent>

      <TabsContent value="faq">
        <FaqPanel items={faqs} />
      </TabsContent>
    </Tabs>
  );
}

// ---------------------------------------------------------------------------

function HomeForm({ defaults }: { defaults: WebsiteSettingsInput }) {
  const router = useRouter();

  const form = useForm<WebsiteSettingsInput>({
    resolver: zodResolver(websiteSettingsSchema),
    defaultValues: defaults,
  });

  const metaTitle = form.watch("metaTitle") ?? "";
  const metaDescription = form.watch("metaDescription") ?? "";

  async function onSubmit(values: WebsiteSettingsInput) {
    const result = await updateWebsiteSettings(values);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Site atualizado");
    router.refresh();
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Destaque da home</CardTitle>
            <CardDescription>
              A primeira coisa que o visitante lê.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="heroHeadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="heroSubheadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subtítulo</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="heroCtaLabel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto do botão</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="heroImageUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Imagem de fundo (URL)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://…"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sobre a loja</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="aboutTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="aboutBody"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Texto</FormLabel>
                  <FormControl>
                    <Textarea rows={6} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription>
                    Aceita HTML simples (parágrafos, negrito, listas). Tags
                    inseguras são removidas ao salvar.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SEO</CardTitle>
            <CardDescription>
              Como a loja aparece no Google e ao ser compartilhada.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="metaTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título da página</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription
                    className={cn(metaTitle.length > 60 && "text-warning")}
                  >
                    {metaTitle.length}/70 caracteres
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="metaDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormDescription
                    className={cn(metaDescription.length > 155 && "text-warning")}
                  >
                    {metaDescription.length}/160 caracteres
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Live SERP preview */}
            <div className="bg-muted/40 rounded-xl border p-4">
              <p className="text-muted-foreground mb-2 text-xs font-medium">
                Prévia no Google
              </p>
              <p className="text-[13px] text-[oklch(0.45_0.02_260)]">
                seudominio.com.br › loja
              </p>
              <p className="text-[18px] leading-snug text-[oklch(0.45_0.2_265)]">
                {metaTitle || "Título da sua loja"}
              </p>
              <p className="text-muted-foreground line-clamp-2 text-[13px] leading-relaxed">
                {metaDescription ||
                  "Escreva uma descrição que convença o visitante a clicar."}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seções visíveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(
              [
                ["published", "Site publicado", "Desative para tirar a loja do ar."],
                ["showServices", "Mostrar serviços", "Bloco de diferenciais."],
                ["showTestimonials", "Mostrar depoimentos", "Prova social."],
                ["showFaq", "Mostrar FAQ", "Perguntas frequentes."],
              ] as const
            ).map(([name, label, hint]) => (
              <FormField
                key={name}
                control={form.control}
                name={name}
                render={({ field }) => (
                  <FormItem className="flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5 pr-3">
                      <FormLabel>{label}</FormLabel>
                      <FormDescription>{hint}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            ))}
          </CardContent>
        </Card>

        <div className="glass-strong sticky bottom-0 -mx-4 flex justify-end border-t px-4 py-3 sm:-mx-6 sm:px-6">
          <Button type="submit" loading={form.formState.isSubmitting}>
            <Save />
            Publicar alterações
          </Button>
        </div>
      </form>
    </Form>
  );
}

// ---------------------------------------------------------------------------

/** Shared shell for the three repeatable content collections. */
function CollectionPanel({
  title,
  description,
  isEmpty,
  emptyTitle,
  emptyDescription,
  emptyIcon,
  onAdd,
  children,
}: {
  title: string;
  description: string;
  isEmpty: boolean;
  emptyTitle: string;
  emptyDescription: string;
  emptyIcon: React.ComponentProps<typeof EmptyState>["icon"];
  onAdd: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isEmpty ? (
          <EmptyState
            compact
            icon={emptyIcon}
            title={emptyTitle}
            description={emptyDescription}
            action={
              <Button size="sm" onClick={onAdd}>
                <Plus />
                Adicionar
              </Button>
            }
          />
        ) : (
          <>
            {children}
            <Button variant="outline" onClick={onAdd} className="w-full">
              <Plus />
              Adicionar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function useCmsCollection<T extends { id: string }>(initial: T[]) {
  const router = useRouter();
  const [items, setItems] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => setItems(initial), [initial]);

  function remove(id: string, entity: "testimonial" | "faq" | "service") {
    // Drafts have no server row yet, so drop them locally.
    if (id.startsWith("draft-")) {
      setItems((prev) => prev.filter((item) => item.id !== id));
      return;
    }

    startTransition(async () => {
      const result = await deleteCmsItem({ id, entity });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Removido");
      router.refresh();
    });
  }

  return { items, setItems, remove, pending, router };
}

function TestimonialsPanel({ items: initial }: { items: Testimonial[] }) {
  const { items, setItems, remove, router } = useCmsCollection(initial);

  function save(item: Testimonial) {
    void (async () => {
      const result = await upsertTestimonial({
        ...(item.id.startsWith("draft-") ? {} : { id: item.id }),
        authorName: item.authorName,
        authorRole: item.authorRole ?? "",
        content: item.content,
        rating: item.rating,
        published: item.published,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Depoimento salvo");
      router.refresh();
    })();
  }

  return (
    <CollectionPanel
      title="Depoimentos"
      description="Prova social exibida na home."
      isEmpty={items.length === 0}
      emptyTitle="Nenhum depoimento"
      emptyDescription="Depoimentos reais aumentam bastante a conversão da página."
      emptyIcon={MessageSquareQuote}
      onAdd={() =>
        setItems([
          ...items,
          {
            id: `draft-${Date.now()}`,
            authorName: "",
            authorRole: "",
            content: "",
            rating: 5,
            published: true,
          },
        ])
      }
    >
      {items.map((item, index) => (
        <div key={item.id} className="space-y-3 rounded-xl border p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={item.authorName}
                onChange={(event) =>
                  setItems(
                    items.map((row, i) =>
                      i === index
                        ? { ...row, authorName: event.target.value }
                        : row,
                    ),
                  )
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Contexto</Label>
              <Input
                placeholder="Comprou um Jeep Compass"
                value={item.authorRole ?? ""}
                onChange={(event) =>
                  setItems(
                    items.map((row, i) =>
                      i === index
                        ? { ...row, authorRole: event.target.value }
                        : row,
                    ),
                  )
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Depoimento</Label>
            <Textarea
              rows={3}
              value={item.content}
              onChange={(event) =>
                setItems(
                  items.map((row, i) =>
                    i === index ? { ...row, content: event.target.value } : row,
                  ),
                )
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setItems(
                      items.map((row, i) =>
                        i === index ? { ...row, rating: value } : row,
                      ),
                    )
                  }
                  aria-label={`${value} estrelas`}
                >
                  <Star
                    className={cn(
                      "size-4.5 transition-colors",
                      value <= item.rating
                        ? "fill-[oklch(0.8_0.15_85)] text-[oklch(0.8_0.15_85)]"
                        : "text-muted-foreground/40",
                    )}
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => save(item)}>
                <Save />
                Salvar
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => remove(item.id, "testimonial")}
                aria-label="Remover"
              >
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </CollectionPanel>
  );
}

function ServicesPanel({ items: initial }: { items: Service[] }) {
  const { items, setItems, remove, router } = useCmsCollection(initial);

  function save(item: Service) {
    void (async () => {
      const result = await upsertService({
        ...(item.id.startsWith("draft-") ? {} : { id: item.id }),
        title: item.title,
        description: item.description,
        icon: item.icon,
        published: item.published,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Serviço salvo");
      router.refresh();
    })();
  }

  return (
    <CollectionPanel
      title="Serviços"
      description="Diferenciais exibidos na home."
      isEmpty={items.length === 0}
      emptyTitle="Nenhum serviço"
      emptyDescription="Liste garantia, laudo cautelar, financiamento e outros diferenciais."
      emptyIcon={Sparkles}
      onAdd={() =>
        setItems([
          ...items,
          {
            id: `draft-${Date.now()}`,
            title: "",
            description: "",
            icon: "Sparkles",
            published: true,
          },
        ])
      }
    >
      {items.map((item, index) => (
        <div key={item.id} className="space-y-3 rounded-xl border p-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={item.title}
              onChange={(event) =>
                setItems(
                  items.map((row, i) =>
                    i === index ? { ...row, title: event.target.value } : row,
                  ),
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={item.description}
              onChange={(event) =>
                setItems(
                  items.map((row, i) =>
                    i === index
                      ? { ...row, description: event.target.value }
                      : row,
                  ),
                )
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => save(item)}>
              <Save />
              Salvar
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(item.id, "service")}
              aria-label="Remover"
            >
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </CollectionPanel>
  );
}

function FaqPanel({ items: initial }: { items: Faq[] }) {
  const { items, setItems, remove, router } = useCmsCollection(initial);

  function save(item: Faq) {
    void (async () => {
      const result = await upsertFaq({
        ...(item.id.startsWith("draft-") ? {} : { id: item.id }),
        question: item.question,
        answer: item.answer,
        published: item.published,
      });

      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Pergunta salva");
      router.refresh();
    })();
  }

  return (
    <CollectionPanel
      title="Perguntas frequentes"
      description="Reduza dúvidas repetidas no WhatsApp."
      isEmpty={items.length === 0}
      emptyTitle="Nenhuma pergunta"
      emptyDescription="Responda as dúvidas que a equipe mais ouve por telefone."
      emptyIcon={MessageSquareQuote}
      onAdd={() =>
        setItems([
          ...items,
          {
            id: `draft-${Date.now()}`,
            question: "",
            answer: "",
            published: true,
          },
        ])
      }
    >
      {items.map((item, index) => (
        <div key={item.id} className="space-y-3 rounded-xl border p-4">
          <div className="space-y-2">
            <Label>Pergunta</Label>
            <Input
              value={item.question}
              onChange={(event) =>
                setItems(
                  items.map((row, i) =>
                    i === index ? { ...row, question: event.target.value } : row,
                  ),
                )
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Resposta</Label>
            <Textarea
              rows={3}
              value={item.answer}
              onChange={(event) =>
                setItems(
                  items.map((row, i) =>
                    i === index ? { ...row, answer: event.target.value } : row,
                  ),
                )
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => save(item)}>
              <Save />
              Salvar
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => remove(item.id, "faq")}
              aria-label="Remover"
            >
              <Trash2 className="text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </CollectionPanel>
  );
}
