import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Painel } from "@/lib/market-types";
import { CORES_SERIE, base100, numero, pct, type IdSerie } from "@/lib/analytics";

const PERIODOS = [
  { anos: 1, rotulo: "1 ano" },
  { anos: 3, rotulo: "3 anos" },
  { anos: 5, rotulo: "5 anos" },
];

const NOMES: Record<IdSerie, string> = {
  cdi: "CDI acumulado",
  ipca: "IPCA acumulado",
  usdbrl: "Dólar PTAX",
  ibovespa: "Ibovespa",
};

const TODAS: IdSerie[] = ["cdi", "ipca", "usdbrl", "ibovespa"];

interface TooltipPayload {
  dataKey: IdSerie;
  value: number;
  color: string;
}

function ConteudoTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-border bg-popover p-3 text-xs shadow-sm">
      <p className="font-sans tracking-wider text-muted-foreground uppercase">{label}</p>
      <ul className="mt-2 space-y-1">
        {payload.map((item) => (
          <li key={item.dataKey} className="tabular flex items-center gap-2">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="text-foreground/80">{NOMES[item.dataKey]}</span>
            <span className="ml-auto pl-4">
              {numero(item.value)} · {pct(item.value / 100 - 1)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GraficoBase100({ painel }: { painel: Painel }) {
  const [anos, setAnos] = useState(5);
  const [ativas, setAtivas] = useState<IdSerie[]>(TODAS);

  const dados = useMemo(() => base100(painel, anos, ativas), [painel, anos, ativas]);

  const alternar = (id: IdSerie) =>
    setAtivas((atual) =>
      atual.includes(id)
        ? atual.length > 1
          ? atual.filter((s) => s !== id)
          : atual
        : [...atual, id],
    );

  return (
    <section aria-labelledby="grafico-titulo" className="mx-auto max-w-6xl px-6 pb-14">
      <div className="rounded-sm border border-border bg-card p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="grafico-titulo" className="font-serif text-2xl">
              Evolução comparada em base 100
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Todas as séries partem de 100 no primeiro mês do período escolhido. A base é
              recalculada a cada troca de período e só são usados meses presentes em todas as séries
              ativas.
            </p>
          </div>
          <div
            role="group"
            aria-label="Selecionar período do gráfico"
            className="flex overflow-hidden rounded-sm border border-border"
          >
            {PERIODOS.map((p) => (
              <button
                key={p.anos}
                type="button"
                aria-pressed={anos === p.anos}
                onClick={() => setAnos(p.anos)}
                className={`px-4 py-2 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                  anos === p.anos
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground/70 hover:bg-secondary"
                }`}
              >
                {p.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {TODAS.map((id) => {
            const ativa = ativas.includes(id);
            const serie = painel.series.find((s) => s.id === id);
            const disponivel = serie?.status === "ok";
            return (
              <button
                key={id}
                type="button"
                disabled={!disponivel}
                aria-pressed={ativa}
                onClick={() => alternar(id)}
                className={`inline-flex items-center gap-2 rounded-sm border px-3 py-1.5 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
                  ativa ? "border-foreground/30 bg-secondary" : "border-border text-muted-foreground"
                }`}
              >
                <span
                  className="inline-block h-0.5 w-4"
                  style={{ backgroundColor: CORES_SERIE[id] }}
                  aria-hidden="true"
                />
                {NOMES[id]}
              </button>
            );
          })}
        </div>

        <div className="mt-8 h-[22rem] w-full">
          {dados.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Não há meses comparáveis entre as séries selecionadas neste período.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="rotulo"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-border)" }}
                  minTickGap={24}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<ConteudoTooltip />} />
                {TODAS.filter((id) => ativas.includes(id)).map((id) => (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={NOMES[id]}
                    stroke={CORES_SERIE[id]}
                    strokeWidth={1.6}
                    dot={false}
                    activeDot={{ r: 3 }}
                    isAnimationActive={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Base 100 = primeiro mês comparável do período. CDI e IPCA entram como retorno acumulado;
          dólar e Ibovespa, como variação do nível. Valores nominais de unidades diferentes não são
          plotados no mesmo eixo.
        </p>
      </div>
    </section>
  );
}
