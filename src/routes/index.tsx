import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getPainel } from "@/lib/market.functions";
import { CardsIndicadores } from "@/components/painel/CardsIndicadores";
import { CdiVsInflacao } from "@/components/painel/CdiVsInflacao";
import { GraficoBase100 } from "@/components/painel/GraficoBase100";
import { LeiturasExecutivas } from "@/components/painel/LeiturasExecutivas";
import { PainelHeader } from "@/components/painel/PainelHeader";
import { TabelaRastreabilidade } from "@/components/painel/TabelaRastreabilidade";
import { formatarData } from "@/lib/analytics";

const painelQuery = queryOptions({
  queryKey: ["painel"],
  queryFn: () => getPainel(),
  staleTime: 5 * 60_000,
});

const TITULO = "Painel de Mercado — Vêneto Inteligência de Mercado";
const DESCRICAO =
  "Leitura executiva de CDI, IPCA, dólar PTAX e Ibovespa, com base tratada por pipeline ETL a partir do Banco Central e do Yahoo Finance.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITULO },
      { name: "description", content: DESCRICAO },
      { property: "og:title", content: TITULO },
      { property: "og:description", content: DESCRICAO },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(painelQuery),
  pendingComponent: Carregando,
  errorComponent: ErroConexao,
  notFoundComponent: SemDados,
  component: Painel,
});

function Carregando() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-24" aria-busy="true" aria-live="polite">
      <p className="text-xs tracking-[0.42em] text-muted-foreground uppercase">
        Vêneto — Family Office
      </p>
      <h1 className="mt-6 font-serif text-4xl">Carregando o painel…</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Lendo a base tratada pelo pipeline de indicadores.
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-sm border border-border bg-card" />
        ))}
      </div>
    </main>
  );
}

function ErroConexao({ error }: { error: Error }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24" role="alert">
      <h1 className="font-serif text-3xl">Não foi possível carregar a base</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        O painel não conseguiu ler os dados tratados. Verifique a conexão e recarregue a página; se
        persistir, rode novamente o pipeline (<span className="tabular">python etl/pipeline.py</span>
        ).
      </p>
      <p className="mt-4 text-xs text-muted-foreground">Detalhe técnico: {error.message}</p>
    </main>
  );
}

function SemDados() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <h1 className="font-serif text-3xl">Sem dados disponíveis</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        A base tratada está vazia. Execute o pipeline ETL para gerar as séries.
      </p>
    </main>
  );
}

function Painel() {
  const { data: painel } = useSuspenseQuery(painelQuery);

  if (!painel || painel.series.length === 0) return <SemDados />;

  const indisponiveis = painel.series.filter((s) => s.status !== "ok");

  return (
    <>
      <PainelHeader painel={painel} />
      <main>
        {indisponiveis.length > 0 && (
          <div
            role="status"
            className="mx-auto mt-8 max-w-6xl rounded-sm border border-border bg-card px-6 py-4 text-sm"
          >
            Série(s) indisponível(is) nesta execução:{" "}
            {indisponiveis.map((s) => s.nome).join(", ")}. Nenhum valor foi estimado ou preenchido
            artificialmente.
          </div>
        )}
        <CardsIndicadores painel={painel} />
        <GraficoBase100 painel={painel} />
        <CdiVsInflacao painel={painel} />
        <LeiturasExecutivas painel={painel} />
        <TabelaRastreabilidade painel={painel} />
      </main>
      <footer className="border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-10 text-xs text-muted-foreground">
          <p>
            Período coberto: {formatarData(painel.periodo.inicio)} a{" "}
            {formatarData(painel.periodo.fim)} · janela dinâmica de {painel.janela_anos} anos.
          </p>
          <p className="mt-2 max-w-3xl">
            Conteúdo meramente informativo, produzido a partir de fontes públicas (API SGS do Banco
            Central e Yahoo Finance). Não constitui recomendação de investimento, oferta ou análise
            de valores mobiliários. Rentabilidade passada não representa garantia de resultado
            futuro.
          </p>
          <p className="mt-4 tracking-[0.3em] uppercase">Vêneto — Family Office</p>
        </div>
      </footer>
    </>
  );
}
