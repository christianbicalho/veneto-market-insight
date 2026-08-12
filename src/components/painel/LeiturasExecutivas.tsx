import type { Painel } from "@/lib/market-types";
import { leiturasExecutivas } from "@/lib/analytics";

export function LeiturasExecutivas({ painel }: { painel: Painel }) {
  const leituras = leiturasExecutivas(painel);
  if (leituras.length === 0) return null;

  return (
    <section aria-labelledby="leituras-titulo" className="mx-auto max-w-6xl px-6 pb-14">
      <div className="rounded-sm border border-border bg-secondary/60 p-6 md:p-8">
        <h2 id="leituras-titulo" className="font-serif text-2xl">
          Leituras executivas
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Observações geradas automaticamente a partir dos dados carregados. São descritivas — não
          atribuem causas econômicas nem constituem recomendação de investimento.
        </p>
        <ol className="mt-6 space-y-4">
          {leituras.map((texto, i) => (
            <li key={texto} className="flex gap-4 text-sm leading-relaxed">
              <span className="tabular pt-0.5 text-xs text-accent-foreground/70">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{texto}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
