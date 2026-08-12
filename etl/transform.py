"""Transformação (T) — camada canônica, camada mensal e métricas derivadas."""

from __future__ import annotations

import pandas as pd

from sources import DIAS_UTEIS_ANO, SERIES


def canonizar(frames: dict[str, pd.DataFrame]) -> pd.DataFrame:
    """Padroniza datas/tipos, remove duplicidades por (serie, data) e descarta nulos.

    Nunca cria observações para fins de semana/feriados e nunca troca faltante por zero.
    """
    partes = []
    for serie_id, bruto in frames.items():
        df = bruto.copy()
        df["data"] = pd.to_datetime(df["data"], format="%d/%m/%Y", errors="coerce")
        df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
        df = df.dropna(subset=["data", "valor"])
        df["serie"] = serie_id
        df["frequencia"] = SERIES[serie_id].frequencia
        df["unidade"] = SERIES[serie_id].unidade
        partes.append(df[["serie", "data", "valor", "frequencia", "unidade"]])

    if not partes:
        return pd.DataFrame(columns=["serie", "data", "valor", "frequencia", "unidade"])

    canon = pd.concat(partes, ignore_index=True)
    canon = canon.drop_duplicates(subset=["serie", "data"], keep="last")
    return canon.sort_values(["serie", "data"]).reset_index(drop=True)


def mensalizar(canon: pd.DataFrame) -> pd.DataFrame:
    """Camada analítica mensal.

    CDI: composição geométrica dos retornos diários dentro do mês.
    IPCA: valor mensal divulgado.
    Dólar e Ibovespa: último pregão disponível do mês.
    """
    linhas = []
    for serie_id, grupo in canon.groupby("serie"):
        g = grupo.copy()
        g["mes"] = g["data"].dt.to_period("M")
        if serie_id == "cdi":
            agg = g.groupby("mes").apply(
                lambda x: pd.Series(
                    {
                        "valor": (1 + x["valor"] / 100).prod() - 1,
                        "data_ref": x["data"].max(),
                        "observacoes": len(x),
                    }
                ),
                include_groups=False,
            )
        elif serie_id == "ipca":
            agg = g.groupby("mes").agg(
                valor=("valor", lambda s: s.iloc[-1] / 100),
                data_ref=("data", "max"),
                observacoes=("valor", "size"),
            )
        else:
            agg = g.groupby("mes").agg(
                valor=("valor", "last"),
                data_ref=("data", "max"),
                observacoes=("valor", "size"),
            )
        agg = agg.reset_index()
        agg["serie"] = serie_id
        linhas.append(agg)

    mensal = pd.concat(linhas, ignore_index=True)
    mensal["mes"] = mensal["mes"].astype(str)
    return mensal.sort_values(["serie", "mes"]).reset_index(drop=True)


def retorno_periodo(serie: pd.DataFrame, dias: int) -> float | None:
    """Variação percentual entre a última observação e a mais próxima de N dias atrás."""
    if serie.empty:
        return None
    fim = serie.iloc[-1]
    alvo = fim["data"] - pd.Timedelta(days=dias)
    anteriores = serie[serie["data"] <= alvo]
    if anteriores.empty:
        return None
    ini = anteriores.iloc[-1]
    if ini["valor"] == 0:
        return None
    return float(fim["valor"] / ini["valor"] - 1)


def cdi_acumulado(canon: pd.DataFrame, dias: int | None = None) -> float | None:
    cdi = canon[canon["serie"] == "cdi"]
    if cdi.empty:
        return None
    if dias is not None:
        corte = cdi["data"].max() - pd.Timedelta(days=dias)
        cdi = cdi[cdi["data"] > corte]
    return float((1 + cdi["valor"] / 100).prod() - 1)


def ipca_acumulado_12m(canon: pd.DataFrame) -> float | None:
    ipca = canon[canon["serie"] == "ipca"].tail(12)
    if len(ipca) < 12:
        return None
    return float((1 + ipca["valor"] / 100).prod() - 1)


def cdi_anualizado(canon: pd.DataFrame) -> float | None:
    cdi = canon[canon["serie"] == "cdi"]
    if cdi.empty:
        return None
    diario = cdi.iloc[-1]["valor"] / 100
    return float((1 + diario) ** DIAS_UTEIS_ANO - 1)


def retorno_real(cdi_acum: float | None, ipca_acum: float | None) -> float | None:
    if cdi_acum is None or ipca_acum is None:
        return None
    return (1 + cdi_acum) / (1 + ipca_acum) - 1


def janela_comparavel(mensal: pd.DataFrame, series: list[str]) -> list[str]:
    """Meses presentes em todas as séries pedidas — evita comparar períodos incompletos."""
    conjuntos = [set(mensal[mensal["serie"] == s]["mes"]) for s in series]
    conjuntos = [c for c in conjuntos if c]
    if not conjuntos:
        return []
    return sorted(set.intersection(*conjuntos))
