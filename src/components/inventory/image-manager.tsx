"use client";

import * as React from "react";
import Image from "next/image";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDropzone } from "react-dropzone";
import { GripVertical, ImagePlus, Link2, Loader2, Star, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { isUploadConfigured, useUploadThing } from "@/lib/uploadthing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type GalleryImage = {
  /** Stable client id — new uploads have no database row yet. */
  key: string;
  url: string;
  fileKey?: string | null;
  alt?: string | null;
};

function SortableTile({
  image,
  index,
  onRemove,
  onMakeCover,
}: {
  image: GalleryImage;
  index: number;
  onRemove: () => void;
  onMakeCover: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: image.key });

  const isCover = index === 0;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group bg-muted relative aspect-4/3 overflow-hidden rounded-xl border",
        isDragging && "z-10 opacity-80 shadow-lg",
      )}
    >
      <Image
        src={image.url}
        alt={image.alt ?? ""}
        fill
        sizes="(max-width: 768px) 50vw, 200px"
        className="object-cover"
        // Remote hosts can vanish; a broken tile should not break the grid.
        onError={(event) => {
          (event.currentTarget as HTMLImageElement).style.opacity = "0.15";
        }}
      />

      {isCover ? (
        <span className="bg-primary text-primary-foreground absolute top-2 left-2 rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
          Capa
        </span>
      ) : null}

      {/* Controls stay hidden until hover/focus so the grid reads as photos. */}
      <div className="absolute inset-0 flex items-start justify-end gap-1 bg-black/45 p-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="rounded-md bg-white/90 p-1.5 text-neutral-900 hover:bg-white"
          aria-label="Reordenar"
        >
          <GripVertical className="size-3.5" />
        </button>

        {!isCover ? (
          <button
            type="button"
            onClick={onMakeCover}
            className="rounded-md bg-white/90 p-1.5 text-neutral-900 hover:bg-white"
            aria-label="Definir como capa"
          >
            <Star className="size-3.5" />
          </button>
        ) : null}

        <button
          type="button"
          onClick={onRemove}
          className="bg-destructive text-destructive-foreground rounded-md p-1.5 hover:opacity-90"
          aria-label="Remover imagem"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
    </li>
  );
}

/**
 * Vehicle gallery editor: drag-and-drop upload, drag-to-reorder, and cover
 * selection. Position 0 is always the cover, so reordering and "make cover" are
 * the same operation — one concept for the user instead of two.
 */
export function ImageManager({
  value,
  onChange,
  max = 20,
}: {
  value: GalleryImage[];
  onChange: (images: GalleryImage[]) => void;
  max?: number;
}) {
  const [urlDraft, setUrlDraft] = React.useState("");
  const [showUrlInput, setShowUrlInput] = React.useState(!isUploadConfigured);

  const sensors = useSensors(
    // A small activation distance keeps clicks on the tile buttons working.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const { startUpload, isUploading } = useUploadThing("vehicleImage", {
    onClientUploadComplete: (files) => {
      onChange([
        ...value,
        ...files.map((file) => ({
          key: file.key,
          url: file.url,
          fileKey: file.key,
        })),
      ]);
      toast.success(
        files.length === 1
          ? "Imagem enviada"
          : `${files.length} imagens enviadas`,
      );
    },
    onUploadError: (error) => {
      toast.error(error.message || "Falha no envio da imagem");
    },
  });

  const onDrop = React.useCallback(
    (files: File[]) => {
      if (!isUploadConfigured) {
        toast.error(
          "Envio de arquivos não configurado. Adicione a imagem por URL.",
        );
        setShowUrlInput(true);
        return;
      }
      const room = max - value.length;
      if (room <= 0) {
        toast.error(`Máximo de ${max} imagens.`);
        return;
      }
      void startUpload(files.slice(0, room));
    },
    [max, startUpload, value.length],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp", ".avif"] },
    maxSize: 8 * 1024 * 1024,
    disabled: isUploading || value.length >= max,
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = value.findIndex((image) => image.key === active.id);
    const to = value.findIndex((image) => image.key === over.id);
    if (from === -1 || to === -1) return;

    onChange(arrayMove(value, from, to));
  }

  function addByUrl() {
    const url = urlDraft.trim();
    if (!url) return;

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new Error("protocol");
      }
    } catch {
      toast.error("Informe uma URL de imagem válida (https://…).");
      return;
    }

    if (value.length >= max) {
      toast.error(`Máximo de ${max} imagens.`);
      return;
    }

    onChange([...value, { key: `url-${Date.now()}`, url }]);
    setUrlDraft("");
  }

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-ring/50 hover:bg-accent/40",
          (isUploading || value.length >= max) &&
            "pointer-events-none opacity-60",
        )}
      >
        <input {...getInputProps()} />

        {isUploading ? (
          <>
            <Loader2 className="text-primary size-6 animate-spin" />
            <p className="text-sm font-medium">Enviando imagens…</p>
          </>
        ) : (
          <>
            <div className="bg-muted flex size-11 items-center justify-center rounded-xl">
              <Upload className="text-muted-foreground size-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                {isDragActive
                  ? "Solte as imagens aqui"
                  : "Arraste as fotos ou clique para escolher"}
              </p>
              <p className="text-muted-foreground text-xs">
                PNG, JPG ou WebP até 8 MB · {value.length}/{max} imagens
              </p>
            </div>
          </>
        )}
      </div>

      {/* URL fallback */}
      {showUrlInput ? (
        <div className="flex gap-2">
          <Input
            value={urlDraft}
            onChange={(event) => setUrlDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addByUrl();
              }
            }}
            placeholder="https://exemplo.com/foto.jpg"
          />
          <Button type="button" variant="outline" onClick={addByUrl}>
            Adicionar
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowUrlInput(true)}
          className="text-muted-foreground"
        >
          <Link2 />
          Adicionar por URL
        </Button>
      )}

      {/* Gallery */}
      {value.length > 0 ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={value.map((image) => image.key)}
            strategy={rectSortingStrategy}
          >
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {value.map((image, index) => (
                <SortableTile
                  key={image.key}
                  image={image}
                  index={index}
                  onRemove={() =>
                    onChange(value.filter((item) => item.key !== image.key))
                  }
                  onMakeCover={() => onChange(arrayMove(value, index, 0))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed px-4 py-6 text-sm">
          <ImagePlus className="size-4" />
          A primeira imagem será usada como capa no site.
        </div>
      )}
    </div>
  );
}
