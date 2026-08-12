import type { Painel, Serie } from "./market-types";

export const MESES_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

export function rotuloMes(m: string): string {
  const [ano, mes] = m.split("-");
  return `${MESES_PT[Number(mes) - 1]}/${ano.slice(2)}`;
}

export function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

export function pct(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return `${(valor * 100).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

export function numero(valor: number | null | undefined, casas = 2): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "—";
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export type IdSerie = Serie["id"];

export const CORES_SERIE: Record<IdSerie, string> = {
  cdi: "var(--serie-cdi)",
  ipca: "var(--serie-ipca)",
  usdbrl: "var(--serie-usd)",
  ibovespa: "var(--serie-ibov)",
};

export interface LinhaBase100 {
  m: string;
  rotulo: string;
  cdi?: number;
  ipca?: number;
  usdbrl?: number;
  ibovespa?: number;
}

/**
 * Índices base 100 recalculados a partir do primeiro mês do período selecionado.
 * Só usa meses presentes em todas as séries ativas, evitando comparar janelas diferentes.
 */
export function base100(painel: Painel, anos: number, ativas: IdSerie[]): LinhaBase100[] {
  const series = painel.series.filter((s) => ativas.includes(s.id) && s.mensal.length > 0);
  if (series.length === 0) return [];

  const fim = painel.periodo.fim ?? new Date().toISOString().slice(0, 10);
  const corte = new Date(`${fim}T00:00:00Z`);
  corte.setUTCFullYear(corte.getUTCFullYear() - anos);
  const mesCorte = corte.toISOString().slice(0, 7);

  const mapas = new Map<IdSerie, Map<string, number>>();
  let comuns: string[] | null = null;
  for (const s of series) {
    const mapa = new Map(s.mensal.filter((p) => p.m >= mesCorte).map((p) => [p.m, p.v]));
    mapas.set(s.id, mapa);
    const meses = [...mapa.keys()];
    comuns = comuns === null ? meses : comuns.filter((m) => mapa.has(m));
  }
  const meses = (comuns ?? []).sort();
  if (meses.length === 0) return [];

  const indices = new Map<IdSerie, number>();
  const bases = new Map<IdSerie, number>();
  for (const s of series) {
    indices.set(s.id, 100);
    bases.set(s.id, mapas.get(s.id)!.get(meses[0])!);
  }

  return meses.map((m, i) => {
    const linha: LinhaBase100 = { m, rotulo: rotuloMes(m) };
    for (const s of series) {
      const valor = mapas.get(s.id)!.get(m)!;
      if (s.natureza === "taxa") {
        if (i > 0) indices.set(s.id, indices.get(s.id)! * (1 + valor));
        linha[s.id] = Number(indices.get(s.id)!.toFixed(2));
      } else {
        linha[s.id] = Number(((valor / bases.get(s.id)!) * 100).toFixed(2));
      }
    }
    return linha;
  });
}

/** Recorte de N anos da série CDI × IPCA em 12 meses. */
export function recorteCdiIpca(painel: Painel, anos: number) {
  const fim = painel.periodo.fim ?? new Date().toISOString().slice(0, 10);
  const corte = new Date(`${fim}T00:00:00Z`);
  corte.setUTCFullYear(corte.getUTCFullYear() - anos);
  const mesCorte = corte.toISOString().slice(0, 7);
  return painel.cdi_vs_ipca
    .filter((p) => p.m >= mesCorte)
    .map((p) => ({ ...p, rotulo: rotuloMes(p.m) }));
}

/** Leituras estritamente descritivas — no máximo três, sempre derivadas dos dados carregados. */
export function leiturasExecutivas(painel: Painel): string[] {
  const leituras: string[] = [];
  const serie = (id: IdSerie) => painel.series.find((s) => s.id === id);

  const hist = painel.cdi_vs_ipca;
  if (hist.length >= 4) {
    const atual = hist[hist.length - 1];
    const tres = hist[hist.length - 4];
    const delta = atual.ipca - tres.ipca;
    const direcao = delta > 0.001 ? "subiu" : delta < -0.001 ? "recuou" : "ficou estável";
    leituras.push(
      `O IPCA acumulado em 12 meses ${direcao} de ${pct(tres.ipca)} (${rotuloMes(tres.m)}) para ${pct(
        atual.ipca,
      )} (${rotuloMes(atual.m)}) — variação de ${(delta * 100).toFixed(2)} ponto(s) percentual(is) no período.`,
    );
  }

  const { cdi_12m, ipca_12m, retorno_real_12m } = painel.kpis;
  if (cdi_12m !== null && ipca_12m !== null && retorno_real_12m !== null) {
    leituras.push(
      `Nos últimos 12 meses o CDI acumulou ${pct(cdi_12m)} contra ${pct(
        ipca_12m,
      )} do IPCA, o que corresponde a um retorno real ex post de ${pct(retorno_real_12m)}.`,
    );
  }

  const ibov = serie("ibovespa");
  if (ibov?.var_12m !== null && ibov?.var_12m !== undefined && cdi_12m !== null) {
    const comparacao = ibov.var_12m > cdi_12m ? "acima" : "abaixo";
    leituras.push(
      `O Ibovespa variou ${pct(ibov.var_12m)} em 12 meses, ${comparacao} do CDI acumulado no mesmo intervalo (${pct(
        cdi_12m,
      )}). A comparação é descritiva e não considera risco, liquidez ou tributação.`,
    );
  }

  return leituras.slice(0, 3);
}

/** CSV longo com a base tratada: diários na frequência original e a camada mensal. */
export function montarCsv(painel: Painel): string {
  const linhas = ["serie;nome;camada;data;valor;unidade;fonte;codigo"];
  for (const s of painel.series) {
    for (const p of s.diario) {
      linhas.push(
        `${s.id};${s.nome};diaria;${p.d};${p.v};${s.unidade};${s.fonte};${s.codigo}`.replace(
          /\u00a0/g,
          " ",
        ),
      );
    }
    for (const p of s.mensal) {
      const unidade = s.natureza === "taxa" ? "retorno decimal no mês" : s.unidade;
      linhas.push(`${s.id};${s.nome};mensal;${p.m};${p.v};${unidade};${s.fonte};${s.codigo}`);
    }
  }
  return linhas.join("\n");
}

export function baixarCsv(painel: Painel): void {
  const blob = new Blob([`\ufeff${montarCsv(painel)}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `veneto-indicadores-${painel.periodo.fim ?? "base"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
