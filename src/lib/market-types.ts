export type Frequencia = "diaria" | "mensal";
export type Natureza = "taxa" | "indice" | "cotacao";
export type StatusSerie = "ok" | "indisponivel";
export type Frescor = "atualizada" | "desatualizada" | "indisponivel";

export interface PontoDiario {
  d: string;
  v: number;
}

export interface PontoMensal {
  m: string;
  v: number;
  n: number;
}

export interface Serie {
  id: "cdi" | "ipca" | "usdbrl" | "ibovespa";
  nome: string;
  fonte: string;
  codigo: string;
  frequencia: Frequencia;
  unidade: string;
  natureza: Natureza;
  descricao: string;
  status: StatusSerie;
  erro: string | null;
  ultima_data: string | null;
  ultimo_valor: number | null;
  observacoes: number;
  var_30d: number | null;
  var_12m: number | null;
  diario: PontoDiario[];
  mensal: PontoMensal[];
  frescor: Frescor;
  dias_desde_ultima: number | null;
}

export interface PontoCdiIpca {
  m: string;
  cdi: number;
  ipca: number;
  real: number;
}

export interface Painel {
  gerado_em: string;
  janela_anos: number;
  periodo: { inicio: string | null; fim: string | null };
  series: Serie[];
  kpis: {
    cdi_anualizado: number | null;
    cdi_12m: number | null;
    ipca_12m: number | null;
    retorno_real_12m: number | null;
  };
  cdi_vs_ipca: PontoCdiIpca[];
  demo: boolean;
  avaliado_em: string;
  frescor: Frescor;
}
