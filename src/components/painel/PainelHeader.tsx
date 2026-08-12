import { Download } from "lucide-react";
import type { Painel } from "@/lib/market-types";
import { baixarCsv, formatarDataHora } from "@/lib/analytics";

const ESTADO = {
  atualizada: { texto: "Base atualizada", cor: "bg-positive" },
  desatualizada: { texto: "Base desatualizada", cor: "bg-accent" },
  indisponivel: { texto: "Base parcialmente indisponível", cor: "bg-negative" },
} as const;

export function PainelHeader({ painel }: { painel: Painel }) {
  const estado = ESTADO[painel.frescor];

  return (
    <header className="border-b border-border bg-primary text-primary-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <p className="font-sans text-xs tracking-[0.42em] text-primary-foreground/70 uppercase">
          Vêneto — Family Office
        </p>
        <div className="mt-6 h-px w-16 bg-accent" aria-hidden="true" />
        <h1 className="mt-6 font-serif text-4xl md:text-5xl">Painel de Mercado</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-primary-foreground/80 md:text-base">
          Uma leitura executiva de juros, inflação, câmbio e bolsa para apoiar conversas com
          clientes.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs">
          <span className="inline-flex items-center gap-2">
            <span
              className={`inline-block size-2 rounded-full ${estado.cor}`}
              aria-hidden="true"
            />
            <span className="text-primary-foreground/85">{estado.texto}</span>
          </span>
          <span className="tabular text-primary-foreground/70">
            Última atualização da base: {formatarDataHora(painel.gerado_em)}
          </span>
          {painel.demo && (
            <span className="rounded-sm border border-accent px-2 py-1 text-accent">
              Dados demonstrativos
            </span>
          )}
          <button
            type="button"
            onClick={() => baixarCsv(painel)}
            className="inline-flex items-center gap-2 rounded-sm border border-primary-foreground/30 px-3 py-1.5 text-primary-foreground/90 transition-colors hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
          >
            <Download className="size-3.5" aria-hidden="true" />
            Baixar dados tratados (CSV)
          </button>
        </div>
      </div>
    </header>
  );
}
