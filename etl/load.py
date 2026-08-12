"""Carga (L) — CSV, Parquet, SQLite e JSON otimizado para o dashboard."""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

import pandas as pd

CURATED = Path(__file__).resolve().parents[1] / "data" / "curated"
APP_JSON = Path(__file__).resolve().parents[1] / "src" / "data" / "dashboard.json"


def salvar_tabelas(canon: pd.DataFrame, mensal: pd.DataFrame) -> None:
    CURATED.mkdir(parents=True, exist_ok=True)
    canon_out = canon.copy()
    canon_out["data"] = canon_out["data"].dt.strftime("%Y-%m-%d")

    canon_out.to_csv(CURATED / "indicadores_diarios.csv", index=False)
    mensal_out = mensal.copy()
    mensal_out["data_ref"] = pd.to_datetime(mensal_out["data_ref"]).dt.strftime("%Y-%m-%d")
    mensal_out.to_csv(CURATED / "indicadores_mensais.csv", index=False)

    try:
        canon_out.to_parquet(CURATED / "indicadores_diarios.parquet", index=False)
        mensal_out.to_parquet(CURATED / "indicadores_mensais.parquet", index=False)
    except Exception as exc:  # noqa: BLE001
        print(f"  ! Parquet não gerado ({exc}). Instale pyarrow para habilitar.")

    with sqlite3.connect(CURATED / "veneto.sqlite") as con:
        canon_out.to_sql("indicadores_diarios", con, if_exists="replace", index=False)
        mensal_out.to_sql("indicadores_mensais", con, if_exists="replace", index=False)
        con.execute(
            "CREATE UNIQUE INDEX IF NOT EXISTS ix_diarios ON indicadores_diarios(serie, data)"
        )


def salvar_dashboard(payload: dict) -> None:
    CURATED.mkdir(parents=True, exist_ok=True)
    texto = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    (CURATED / "dashboard.json").write_text(texto, encoding="utf-8")
    APP_JSON.parent.mkdir(parents=True, exist_ok=True)
    APP_JSON.write_text(texto, encoding="utf-8")


def carregar_canon_existente() -> pd.DataFrame | None:
    """Base canônica anterior, usada na atualização incremental."""
    caminho = CURATED / "indicadores_diarios.csv"
    if not caminho.exists():
        return None
    df = pd.read_csv(caminho)
    if df.empty:
        return None
    df["data"] = pd.to_datetime(df["data"])
    return df
