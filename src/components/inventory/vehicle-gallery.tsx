"use client";

import * as React from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Lightbox-free gallery: a large stage plus a thumbnail rail. Arrow keys work
 * when the stage has focus, and the direction of travel drives the slide
 * animation so navigation reads spatially.
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
      <div className="bg-muted text-muted-foreground flex aspect-16/10 items-center justify-center rounded-xl border">
        <div className="flex flex-col items-center gap-2">
          <Camera className="size-8" strokeWidth={1.5} />
          <p className="text-sm">Nenhuma foto cadastrada</p>
        </div>
      </div>
    );
  }

  const current = images[index];

  return (
    <div className="space-y-3">
      <div
        tabIndex={0}
        role="group"
        aria-label="Galeria de fotos"
        onKeyDown={(event) => {
          if (event.key === "ArrowRight") go(index + 1);
          if (event.key === "ArrowLeft") go(index - 1);
        }}
        className="group bg-muted relative aspect-16/10 overflow-hidden rounded-xl border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
              sizes="(max-width: 1024px) 100vw, 60vw"
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
              className="glass-strong absolute top-1/2 left-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full opacity-0 shadow-md transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronLeft className="size-4.5" />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Próxima foto"
              className="glass-strong absolute top-1/2 right-3 flex size-9 -translate-y-1/2 items-center justify-center rounded-full opacity-0 shadow-md transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            >
              <ChevronRight className="size-4.5" />
            </button>

            <span className="glass-strong absolute right-3 bottom-3 rounded-md px-2 py-0.5 text-xs font-medium tabular-nums">
              {index + 1} / {images.length}
            </span>
          </>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul className="scrollbar-thin flex gap-2 overflow-x-auto pb-1">
          {images.map((image, i) => (
            <li key={image.id}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-label={`Ver foto ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                  i === index
                    ? "border-primary opacity-100"
                    : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                <Image
                  src={image.url}
                  alt=""
                  fill
                  sizes="64px"
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
