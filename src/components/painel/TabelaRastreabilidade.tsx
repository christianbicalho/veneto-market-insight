import type { Painel } from "@/lib/market-types";
import { formatarData, numero } from "@/lib/analytics";

const ROTULO_FREQ = { diaria: "Diária (dias úteis)", mensal: "Mensal" } as const;

const ROTULO_STATUS = {
  atualizada: { texto: "Atualizada", classe: "text-positive" },
  desatualizada: { texto: "Desatualizada", classe: "text-accent-foreground" },
  indisponivel: { texto: "Indisponível", classe: "text-negative" },
} as const;

export function TabelaRastreabilidade({ painel }: { painel: Painel }) {
  return (
    <section aria-labelledby="rastreabilidade-titulo" className="mx-auto max-w-6xl px-6 pb-14">
      <h2 id="rastreabilidade-titulo" className="font-serif text-2xl">
        Rastreabilidade das séries
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Origem, código, frequência e data da última observação de cada indicador exibido acima.
      </p>

      <div className="mt-6 overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full min-w-[46rem] border-collapse text-sm">
          <caption className="sr-only">
            Indicadores, valores mais recentes, fontes e status de atualização
          </caption>
          <thead>
            <tr className="border-b border-border text-left text-[0.7rem] tracking-[0.14em] text-muted-foreground uppercase">
              <th scope="col" className="px-5 py-3 font-medium">
                Indicador
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Valor mais recente
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Observação
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Frequência
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Fonte
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Código / ticker
              </th>
              <th scope="col" className="px-5 py-3 font-medium">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {painel.series.map((serie) => {
              const status = ROTULO_STATUS[serie.frescor];
              return (
                <tr key={serie.id} className="border-b border-border last:border-0">
                  <th scope="row" className="px-5 py-4 text-left font-normal">
                    {serie.nome}
                    <span className="block text-xs text-muted-foreground">{serie.descricao}</span>
                  </th>
                  <td className="tabular px-5 py-4">
                    {serie.ultimo_valor === null
                      ? "—"
                      : `${numero(serie.ultimo_valor, serie.natureza === "indice" ? 0 : 4)} ${serie.unidade}`}
                  </td>
                  <td className="tabular px-5 py-4">{formatarData(serie.ultima_data)}</td>
                  <td className="px-5 py-4">{ROTULO_FREQ[serie.frequencia]}</td>
                  <td className="px-5 py-4">{serie.fonte}</td>
                  <td className="tabular px-5 py-4">{serie.codigo}</td>
                  <td className={`px-5 py-4 ${status.classe}`}>{status.texto}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
