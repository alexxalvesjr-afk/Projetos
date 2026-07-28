"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Check, Save, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  ACCESSORY_OPTIONS,
  BODY_TYPE_LABELS,
  FUEL_LABELS,
  TRANSMISSION_LABELS,
  VEHICLE_STATUS_LABELS,
} from "@/lib/domain/vehicle";
import { vehicleSchema, type VehicleInput } from "@/lib/validations/vehicle";
import { createVehicle, updateVehicle } from "@/server/actions/vehicle.actions";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { MoneyInput } from "@/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageManager, type GalleryImage } from "@/components/inventory/image-manager";
import { ProfitSummary } from "@/components/inventory/profit-summary";

type SellerOption = { id: string; name: string };

export function VehicleForm({
  vehicle,
  sellers,
  expensesCents = 0,
}: {
  vehicle?: (VehicleInput & { id: string }) | null;
  sellers: SellerOption[];
  expensesCents?: number;
}) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [images, setImages] = React.useState<GalleryImage[]>(
    () =>
      vehicle?.images.map((image, index) => ({
        key: image.id ?? `existing-${index}`,
        url: image.url,
        fileKey: image.fileKey,
        alt: image.alt,
      })) ?? [],
  );

  const form = useForm<VehicleInput>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle ?? {
      brand: "",
      model: "",
      version: "",
      year: new Date().getFullYear(),
      modelYear: null,
      mileage: 0,
      transmission: "MANUAL",
      fuel: "FLEX",
      bodyType: null,
      color: "",
      doors: 4,
      engine: "",
      plate: "",
      vin: "",
      description: "",
      accessories: [],
      costCents: 0,
      minPriceCents: 0,
      priceCents: 0,
      status: "AVAILABLE",
      featured: false,
      published: true,
      assignedToId: "",
      images: [],
    },
  });

  // Watched so the margin panel updates as the dealer types.
  const priceCents = form.watch("priceCents");
  const costCents = form.watch("costCents");
  const minPriceCents = form.watch("minPriceCents");
  const accessories = form.watch("accessories");

  async function onSubmit(values: VehicleInput) {
    setFormError(null);

    const payload: VehicleInput = {
      ...values,
      images: images.map((image) => ({
        url: image.url,
        fileKey: image.fileKey ?? null,
        alt: image.alt ?? null,
      })),
    };

    const result = vehicle
      ? await updateVehicle({ id: vehicle.id, data: payload })
      : await createVehicle(payload);

    if (!result.ok) {
      setFormError(result.error);
      if (result.fieldErrors) {
        for (const [field, messages] of Object.entries(result.fieldErrors)) {
          form.setError(field as keyof VehicleInput, {
            message: messages?.[0],
          });
        }
      }
      toast.error(result.error);
      return;
    }

    toast.success(vehicle ? "Veículo atualizado" : "Veículo cadastrado");
    router.push(`/inventory/${result.data.id}`);
    router.refresh();
  }

  function toggleAccessory(item: string) {
    const current = form.getValues("accessories");
    form.setValue(
      "accessories",
      current.includes(item)
        ? current.filter((value) => value !== item)
        : [...current, item],
      { shouldDirty: true },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {formError ? (
          <Alert variant="destructive">
            <TriangleAlert />
            <AlertDescription className="text-foreground">
              {formError}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main column ------------------------------------------------- */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Identificação</CardTitle>
                <CardDescription>
                  Marca, modelo e versão aparecem no anúncio do site.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marca</FormLabel>
                      <FormControl>
                        <Input placeholder="Honda" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Modelo</FormLabel>
                      <FormControl>
                        <Input placeholder="Civic" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="version"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Versão</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="2.0 EXL CVT"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ano de fabricação</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(event) =>
                            field.onChange(Number(event.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="modelYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ano do modelo</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          value={field.value ?? ""}
                          onChange={(event) =>
                            field.onChange(
                              event.target.value
                                ? Number(event.target.value)
                                : null,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mileage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quilometragem</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(event) =>
                            field.onChange(Number(event.target.value))
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <FormControl>
                        <Input placeholder="Preto" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="transmission"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Câmbio</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(TRANSMISSION_LABELS).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Combustível</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(FUEL_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bodyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Carroceria</FormLabel>
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
                          {Object.entries(BODY_TYPE_LABELS).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Placa</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="ABC1D23"
                          maxLength={8}
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormDescription>
                        Uso interno — não aparece no site.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fotos</CardTitle>
                <CardDescription>
                  Arraste para reordenar. A primeira imagem é a capa do anúncio.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ImageManager value={images} onChange={setImages} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Descrição e opcionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          rows={5}
                          placeholder="Estado de conservação, histórico de revisões, diferenciais…"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel asChild>
                    <p>Opcionais</p>
                  </FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {ACCESSORY_OPTIONS.map((item) => {
                      const active = accessories.includes(item);
                      return (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleAccessory(item)}
                          aria-pressed={active}
                          className={cn(
                            "flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "text-muted-foreground hover:border-ring/50 hover:text-foreground",
                          )}
                        >
                          {active ? (
                            <Check className="size-3.5" strokeWidth={3} />
                          ) : null}
                          {item}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar ----------------------------------------------------- */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Precificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="costCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custo de aquisição</FormLabel>
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
                  name="priceCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço de venda</FormLabel>
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
                  name="minPriceCents"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço mínimo</FormLabel>
                      <FormControl>
                        <MoneyInput
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormDescription>
                        Piso de negociação para a equipe.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <ProfitSummary
                  priceCents={priceCents}
                  costCents={costCents}
                  minPriceCents={minPriceCents}
                  expensesCents={expensesCents}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Publicação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(VEHICLE_STATUS_LABELS).map(
                            ([value, label]) => (
                              <SelectItem key={value} value={value}>
                                {label}
                              </SelectItem>
                            ),
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="assignedToId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consultor responsável</FormLabel>
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sem responsável" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {sellers.map((seller) => (
                            <SelectItem key={seller.id} value={seller.id}>
                              {seller.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="published"
                  render={({ field }) => (
                    <FormItem className="flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5 pr-3">
                        <FormLabel>Publicar no site</FormLabel>
                        <FormDescription>
                          Veículos vendidos saem do ar automaticamente.
                        </FormDescription>
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

                <FormField
                  control={form.control}
                  name="featured"
                  render={({ field }) => (
                    <FormItem className="flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5 pr-3">
                        <FormLabel>Destaque</FormLabel>
                        <FormDescription>
                          Aparece primeiro na home do site.
                        </FormDescription>
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
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Sticky action bar keeps save reachable on long forms. */}
        <div className="glass-strong sticky bottom-0 -mx-4 flex items-center justify-end gap-2 border-t px-4 py-3 sm:-mx-6 sm:px-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={form.formState.isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={form.formState.isSubmitting}>
            <Save />
            {vehicle ? "Salvar alterações" : "Cadastrar veículo"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
