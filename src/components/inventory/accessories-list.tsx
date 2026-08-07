"use client";

import * as React from "react";

const VISIBLE = 11;

/**
 * Os opcionais como pastilhas, com o resto atrás de um link.
 *
 * Um carro bem equipado tem trinta itens, e uma parede deles empurra a
 * descrição para fora da tela. Mostrar a primeira dúzia e deixar o total no
 * link ("Ver todos os 30") diz de imediato quanto vem junto.
 */
export function AccessoriesList({ items }: { items: string[] }) {
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? items : items.slice(0, VISIBLE);

  return (
    <section className="bg-card ring-border/70 rounded-2xl p-6 ring-1">
      <h2 className="text-base font-semibold">Equipamentos e opcionais</h2>

      <ul className="mt-4 flex flex-wrap gap-2">
        {visible.map((item) => (
          <li
            key={item}
            className="ring-border/70 rounded-full px-3 py-1.5 text-[13px] ring-1"
          >
            {item}
          </li>
        ))}
      </ul>

      {items.length > VISIBLE ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="text-primary mt-4 text-[13px] font-medium underline underline-offset-4"
        >
          {expanded
            ? "Ver menos"
            : `Ver todos os ${items.length} equipamentos`}
        </button>
      ) : null}
    </section>
  );
}
