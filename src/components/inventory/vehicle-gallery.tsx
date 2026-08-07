"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { PhotoPlaceholder } from "@/components/inventory/showroom-card";

/**
 * A galeria do anúncio: palco grande, contador e uma grade de miniaturas.
 *
 * As setas ficam sempre visíveis, como no site — escondê-las até o mouse
 * passar por cima economiza pixels e custa a descoberta, e em tela de toque
 * não há "passar por cima". As teclas de seta funcionam com o palco em foco.
 */
export function VehicleGallery({
  images,
  alt,
}: {
  images: { id: string; url: string; alt: string | null }[];
  alt: string;
}) {
  const [index, setIndex] = React.useState(0);
  const [direction, setDirection] = React.useState(0);

  const go = React.useCallback(
    (next: number) => {
      if (images.length === 0) return;
      setDirection(next > index ? 1 : -1);
      setIndex(((next % images.length) + images.length) % images.length);
    },
    [images.length, index],
  );

  if (images.length === 0) {
    return (
      <div className="bg-card ring-border/70 overflow-hidden rounded-2xl p-3 ring-1">
        <div className="aspect-4/3 overflow-hidden rounded-xl">
          <PhotoPlaceholder />
        </div>
      </div>
    );
  }

  const current = images[index];

  return (
    <div className="bg-card ring-border/70 space-y-3 rounded-2xl p-3 ring-1">
      <div
        tabIndex={0}
        role="group"
        aria-label="Galeria de fotos"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") go(index + 1);
          if (event.key === "ArrowLeft") go(index - 1);
        }}
        className="focus-visible:ring-ring relative aspect-4/3 overflow-hidden rounded-xl bg-neutral-100 focus-visible:ring-2 focus-visible:outline-none dark:bg-neutral-900"
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={current.id}
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={current.url}
              alt={current.alt ?? alt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 55vw"
              className="object-cover"
            />
          </motion.div>
        </AnimatePresence>

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => go(index - 1)}
              aria-label="Foto anterior"
              className="bg-background/90 text-foreground hover:bg-background absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md backdrop-blur-sm transition-colors"
            >
              <ChevronLeft className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Próxima foto"
              className="bg-background/90 text-foreground hover:bg-background absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full shadow-md backdrop-blur-sm transition-colors"
            >
              <ChevronRight className="size-4.5" />
            </button>
          </>
        ) : null}

        <span className="bg-foreground/80 text-background absolute bottom-3 left-3 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums backdrop-blur-sm">
          {index + 1} / {images.length}
        </span>
      </div>

      {images.length > 1 ? (
        <ul className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative aspect-4/3 w-full overflow-hidden rounded-lg border-2 bg-neutral-100 transition-all dark:bg-neutral-900",
                  i === index
                    ? "border-primary"
                    : "border-transparent opacity-70 hover:opacity-100",
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
