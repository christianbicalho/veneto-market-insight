import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import type { Painel } from "@/lib/market-types";
import { formatarData, numero, pct } from "@/lib/analytics";

interface CardDados {
  titulo: string;
  valor: string;
  unidade: string;
  data: string | null;
  comparacao: string;
  direcao: number | null;
  indisponivel: boolean;
  nota: string;
}

function Seta({ direcao }: { direcao: number | null }) {
  if (direcao === null) return <Minus className="size-3.5 text-muted-foreground" aria-hidden />;
  if (direcao > 0)
    return <ArrowUpRight className="size-3.5 text-positive" aria-hidden />;
  if (direcao < 0)
    return <ArrowDownRight className="size-3.5 text-negative" aria-hidden />;
  return <Minus className="size-3.5 text-muted-foreground" aria-hidden />;
}

export function CardsIndicadores({ painel }: { painel: Painel }) {
  const serie = (id: string) => painel.series.find((s) => s.id === id);
  const cdi = serie("cdi");
  const ipca = serie("ipca");
  const usd = serie("usdbrl");
  const ibov = serie("ibovespa");
  const hist = painel.cdi_vs_ipca;
  const ipcaAnterior = hist.length >= 2 ? hist[hist.length - 2]!.ipca : null;

  const cards: CardDados[] = [
    {
      titulo: "CDI anualizado",
      valor: pct(painel.kpis.cdi_anualizado),
      unidade: "% a.a. (252 dias úteis)",
      data: cdi?.ultima_data ?? null,
      comparacao: `Acumulado em 12 meses: ${pct(painel.kpis.cdi_12m)}`,
      direcao: null,
      indisponivel: cdi?.status !== "ok",
      nota: "Anualização da última taxa diária divulgada.",
    },
    {
      titulo: "IPCA acumulado 12 meses",
      valor: pct(painel.kpis.ipca_12m),
      unidade: "% em 12 meses",
      data: ipca?.ultima_data ?? null,
      comparacao:
        ipcaAnterior !== null
          ? `Mês anterior: ${pct(ipcaAnterior)}`
          : "Sem mês anterior comparável",
      direcao:
        ipcaAnterior !== null && painel.kpis.ipca_12m !== null
          ? painel.kpis.ipca_12m - ipcaAnterior
          : null,
      indisponivel: ipca?.status !== "ok",
      nota: "Composição geométrica dos 12 últimos índices mensais.",
    },
    {
      titulo: "Dólar PTAX venda",
      valor: `R$ ${numero(usd?.ultimo_valor, 4)}`,
      unidade: "R$/US$",
      data: usd?.ultima_data ?? null,
      comparacao: `30 dias: ${pct(usd?.var_30d)} · 12 meses: ${pct(usd?.var_12m)}`,
      direcao: usd?.var_30d ?? null,
      indisponivel: usd?.status !== "ok",
      nota: "Taxa de referência apurada pelo Banco Central em dias úteis.",
    },
    {
      titulo: "Ibovespa",
      valor: numero(ibov?.ultimo_valor, 0),
      unidade: "pontos (fechamento)",
      data: ibov?.ultima_data ?? null,
      comparacao: `30 dias: ${pct(ibov?.var_30d)} · 12 meses: ${pct(ibov?.var_12m)}`,
      direcao: ibov?.var_30d ?? null,
      indisponivel: ibov?.status !== "ok",
      nota: "Fechamento diário do índice da B3.",
    },
  ];

  return (
    <section aria-labelledby="cards-titulo" className="mx-auto max-w-6xl px-6 py-12">
      <h2 id="cards-titulo" className="sr-only">
        Indicadores principais
      </h2>
      <div className="grid gap-px overflow-hidden rounded-sm border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.titulo} className="bg-card p-6">
            <h3 className="font-sans text-[0.7rem] tracking-[0.18em] text-muted-foreground uppercase">
              {card.titulo}
            </h3>
            {card.indisponivel ? (
              <p className="mt-5 text-sm text-muted-foreground">
                Série indisponível nesta execução do pipeline.
              </p>
            ) : (
              <>
                <p className="tabular mt-5 text-3xl leading-none font-light">{card.valor}</p>
                <p className="mt-2 text-xs text-muted-foreground">{card.unidade}</p>
                <div className="mt-5 flex items-start gap-2 border-t border-border pt-4 text-xs text-foreground/80">
                  <Seta direcao={card.direcao} />
                  <span>{card.comparacao}</span>
                </div>
                <p className="mt-3 text-[0.7rem] text-muted-foreground">
                  Última observação: {formatarData(card.data)}
                </p>
                <p className="mt-1 text-[0.7rem] text-muted-foreground">{card.nota}</p>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
