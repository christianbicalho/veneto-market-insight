import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Painel } from "@/lib/market-types";
import { pct, recorteCdiIpca } from "@/lib/analytics";

const PERIODOS = [1, 3, 5];

const NOMES: Record<string, string> = {
  cdi: "CDI 12 meses",
  ipca: "IPCA 12 meses",
  real: "Retorno real ex post",
};

interface TooltipPayload {
  dataKey: string;
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
      <p className="tracking-wider text-muted-foreground uppercase">{label}</p>
      <ul className="mt-2 space-y-1">
        {payload.map((item) => (
          <li key={item.dataKey} className="tabular flex items-center gap-3">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
            <span className="text-foreground/80">{NOMES[item.dataKey]}</span>
            <span className="ml-auto">{pct(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CdiVsInflacao({ painel }: { painel: Painel }) {
  const [anos, setAnos] = useState(5);
  const dados = useMemo(() => recorteCdiIpca(painel, anos), [painel, anos]);

  return (
    <section aria-labelledby="cdi-ipca-titulo" className="mx-auto max-w-6xl px-6 pb-14">
      <div className="rounded-sm border border-border bg-card p-6 md:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="cdi-ipca-titulo" className="font-serif text-2xl">
              CDI versus inflação
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Comparação entre o CDI acumulado em 12 meses e o IPCA acumulado em 12 meses. A área
              mostra o retorno real ex post, calculado por{" "}
              <span className="tabular">((1 + CDI) ÷ (1 + IPCA)) − 1</span> — ou seja, quanto sobra
              do juro depois de descontada a inflação do mesmo intervalo. É uma medida descritiva do
              passado, não uma projeção.
            </p>
          </div>
          <div
            role="group"
            aria-label="Selecionar período da comparação"
            className="flex overflow-hidden rounded-sm border border-border"
          >
            {PERIODOS.map((p) => (
              <button
                key={p}
                type="button"
                aria-pressed={anos === p}
                onClick={() => setAnos(p)}
                className={`px-4 py-2 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                  anos === p
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground/70 hover:bg-secondary"
                }`}
              >
                {p} ano{p > 1 ? "s" : ""}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 h-80 w-full">
          {dados.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Não há 12 meses completos e comparáveis entre CDI e IPCA neste período.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={dados} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="var(--color-border)" vertical={false} />
                <XAxis
                  dataKey="rotulo"
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-border)" }}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
                  tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip content={<ConteudoTooltip />} />
                <Area
                  type="monotone"
                  dataKey="real"
                  name={NOMES.real}
                  stroke="var(--serie-ibov)"
                  fill="var(--serie-ibov)"
                  fillOpacity={0.12}
                  strokeWidth={1.2}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="cdi"
                  name={NOMES.cdi}
                  stroke="var(--serie-cdi)"
                  strokeWidth={1.6}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="ipca"
                  name={NOMES.ipca}
                  stroke="var(--serie-ipca)"
                  strokeWidth={1.6}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
          {[
            { cor: "var(--serie-cdi)", texto: NOMES.cdi },
            { cor: "var(--serie-ipca)", texto: NOMES.ipca },
            { cor: "var(--serie-ibov)", texto: NOMES.real },
          ].map((item) => (
            <li key={item.texto} className="inline-flex items-center gap-2">
              <span
                className="inline-block h-0.5 w-4"
                style={{ backgroundColor: item.cor }}
                aria-hidden="true"
              />
              {item.texto}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
