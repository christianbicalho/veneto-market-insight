import snapshot from "@/data/dashboard.json";
import type { Frescor, Painel, Serie } from "./market-types";

/** Dias úteis (aprox.) entre uma data e hoje — ignora sábados e domingos. */
function diasUteisDesde(iso: string, hoje: Date): number {
  const inicio = new Date(`${iso}T00:00:00Z`);
  let dias = 0;
  const cursor = new Date(inicio);
  while (cursor < hoje) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) dias += 1;
  }
  return dias;
}

/** Tolerância por frequência: diárias podem atrasar 3 dias úteis; IPCA é mensal e sai com defasagem. */
function classificar(serie: Serie, hoje: Date): { frescor: Frescor; dias: number | null } {
  if (serie.status !== "ok" || !serie.ultima_data) {
    return { frescor: "indisponivel", dias: null };
  }
  const dias = diasUteisDesde(serie.ultima_data, hoje);
  const limite = serie.frequencia === "diaria" ? 3 : 45;
  return { frescor: dias > limite ? "desatualizada" : "atualizada", dias };
}

export function montarPainel(): Painel {
  const hoje = new Date();
  const base = snapshot as unknown as Painel;

  const series = base.series.map((serie) => {
    const { frescor, dias } = classificar(serie, hoje);
    return { ...serie, frescor, dias_desde_ultima: dias };
  });

  const frescor: Frescor = series.some((s) => s.frescor === "indisponivel")
    ? "indisponivel"
    : series.some((s) => s.frescor === "desatualizada")
      ? "desatualizada"
      : "atualizada";

  return { ...base, series, frescor, avaliado_em: hoje.toISOString() };
}
