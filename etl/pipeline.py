"""Orquestração do pipeline ETL.

Uso:
    python etl/pipeline.py              # execução completa (5 anos dinâmicos)
    python etl/pipeline.py --incremental  # reextrai apenas os últimos 45 dias e faz merge
"""

from __future__ import annotations

import argparse
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))

import transform as T  # noqa: E402
from extract import extrair_tudo, janela  # noqa: E402
from load import carregar_canon_existente, salvar_dashboard, salvar_tabelas  # noqa: E402
from sources import ANOS_JANELA, SERIES  # noqa: E402

JANELA_INCREMENTAL_DIAS = 45


def _serie_json(canon: pd.DataFrame, serie_id: str) -> list[dict]:
    s = canon[canon["serie"] == serie_id]
    return [
        {"d": d.strftime("%Y-%m-%d"), "v": round(float(v), 6)}
        for d, v in zip(s["data"], s["valor"])
    ]


def _mensal_json(mensal: pd.DataFrame, serie_id: str) -> list[dict]:
    s = mensal[mensal["serie"] == serie_id]
    return [
        {"m": m, "v": round(float(v), 8), "n": int(n)}
        for m, v, n in zip(s["mes"], s["valor"], s["observacoes"])
    ]


def _rolling_12m(mensal: pd.DataFrame) -> list[dict]:
    """CDI 12m, IPCA 12m e retorno real ex post, mês a mês, só em meses comparáveis."""
    meses = T.janela_comparavel(mensal, ["cdi", "ipca"])
    cdi = mensal[mensal["serie"] == "cdi"].set_index("mes")["valor"]
    ipca = mensal[mensal["serie"] == "ipca"].set_index("mes")["valor"]
    saida = []
    for i, mes in enumerate(meses):
        if i < 11:
            continue
        recorte = meses[i - 11 : i + 1]
        cdi_12 = float((1 + cdi.loc[recorte]).prod() - 1)
        ipca_12 = float((1 + ipca.loc[recorte]).prod() - 1)
        saida.append(
            {
                "m": mes,
                "cdi": round(cdi_12, 6),
                "ipca": round(ipca_12, 6),
                "real": round((1 + cdi_12) / (1 + ipca_12) - 1, 6),
            }
        )
    return saida


def montar_payload(canon: pd.DataFrame, mensal: pd.DataFrame, status: dict[str, str]) -> dict:
    agora = datetime.now(timezone.utc)
    series_payload = []
    for serie_id, meta in SERIES.items():
        s = canon[canon["serie"] == serie_id]
        ok = status.get(serie_id) == "ok" and not s.empty
        ultimo = s.iloc[-1] if not s.empty else None
        series_payload.append(
            {
                **meta.to_dict(),
                "status": "ok" if ok else "indisponivel",
                "erro": None if ok else status.get(serie_id, "sem dados"),
                "ultima_data": ultimo["data"].strftime("%Y-%m-%d") if ultimo is not None else None,
                "ultimo_valor": float(ultimo["valor"]) if ultimo is not None else None,
                "observacoes": int(len(s)),
                "var_30d": T.retorno_periodo(s, 30) if meta.natureza != "taxa" else None,
                "var_12m": T.retorno_periodo(s, 365) if meta.natureza != "taxa" else None,
                "diario": _serie_json(canon, serie_id) if meta.frequencia == "diaria" else [],
                "mensal": _mensal_json(mensal, serie_id),
            }
        )

    cdi_12m = T.cdi_acumulado(canon, dias=365)
    ipca_12m = T.ipca_acumulado_12m(canon)
    return {
        "gerado_em": agora.isoformat(),
        "janela_anos": ANOS_JANELA,
        "periodo": {
            "inicio": canon["data"].min().strftime("%Y-%m-%d") if not canon.empty else None,
            "fim": canon["data"].max().strftime("%Y-%m-%d") if not canon.empty else None,
        },
        "series": series_payload,
        "kpis": {
            "cdi_anualizado": T.cdi_anualizado(canon),
            "cdi_12m": cdi_12m,
            "ipca_12m": ipca_12m,
            "retorno_real_12m": T.retorno_real(cdi_12m, ipca_12m),
        },
        "cdi_vs_ipca": _rolling_12m(mensal),
        "demo": False,
    }


def executar(incremental: bool = False) -> dict:
    hoje = date.today()
    if incremental:
        inicio = hoje - timedelta(days=JANELA_INCREMENTAL_DIAS)
        fim = hoje
        print(f"Modo incremental: rejanela {inicio} → {fim}")
    else:
        inicio, fim = janela(ANOS_JANELA, hoje)
        print(f"Carga completa: {inicio} → {fim}")

    frames, status = extrair_tudo(inicio, fim)
    canon_novo = T.canonizar(frames)

    anterior = carregar_canon_existente()
    if anterior is not None:
        combinado = pd.concat([anterior, canon_novo], ignore_index=True)
        # merge pela chave (serie, data): a extração mais recente prevalece (captura revisões)
        canon = (
            combinado.drop_duplicates(subset=["serie", "data"], keep="last")
            .sort_values(["serie", "data"])
            .reset_index(drop=True)
        )
        for serie_id in canon["serie"].unique():
            status.setdefault(serie_id, "ok")
    else:
        canon = canon_novo

    corte = pd.Timestamp(janela(ANOS_JANELA, hoje)[0])
    canon = canon[canon["data"] >= corte].reset_index(drop=True)

    mensal = T.mensalizar(canon)
    salvar_tabelas(canon, mensal)
    payload = montar_payload(canon, mensal, status)
    salvar_dashboard(payload)

    print("\nResumo:")
    for s in payload["series"]:
        print(
            f"  {s['nome']:<20} {s['status']:<12} última: {s['ultima_data']} "
            f"valor: {s['ultimo_valor']} ({s['observacoes']} obs)"
        )
    return payload


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ETL de indicadores de mercado — Vêneto")
    parser.add_argument("--incremental", action="store_true", help="reextrai só a janela recente")
    args = parser.parse_args()
    executar(incremental=args.incremental)
