"""Extração (E) — API SGS do Banco Central e Yahoo Finance (yfinance)."""

from __future__ import annotations

import json
import time
from datetime import date, datetime, timedelta
from pathlib import Path

import pandas as pd
import requests

from sources import SERIES, SGS_SERIES, ANOS_JANELA

RAW_DIR = Path(__file__).resolve().parents[1] / "data" / "raw"
SGS_URL = "https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados"
TIMEOUT = 30
TENTATIVAS = 4


def janela(anos: int = ANOS_JANELA, fim: date | None = None) -> tuple[date, date]:
    """Janela dinâmica de N anos a partir da data de execução."""
    fim = fim or date.today()
    inicio = fim - timedelta(days=365 * anos + anos // 4)
    return inicio, fim


def _get(url: str, params: dict) -> list | dict:
    erro: Exception | None = None
    for tentativa in range(1, TENTATIVAS + 1):
        try:
            resp = requests.get(
                url,
                params=params,
                timeout=TIMEOUT,
                headers={"User-Agent": "veneto-market-etl/1.0"},
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:  # noqa: BLE001
            erro = exc
            espera = 2**tentativa
            print(f"  ! tentativa {tentativa}/{TENTATIVAS} falhou ({exc}); aguardando {espera}s")
            time.sleep(espera)
    raise RuntimeError(
        f"Não foi possível obter dados de {url}. Verifique a conexão ou a disponibilidade da fonte. "
        f"Último erro: {erro}"
    )


def _salvar_raw(serie_id: str, payload) -> None:
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    (RAW_DIR / f"{serie_id}.json").write_text(
        json.dumps(payload, ensure_ascii=False), encoding="utf-8"
    )


def extrair_sgs(serie_id: str, inicio: date, fim: date) -> pd.DataFrame:
    serie = SERIES[serie_id]
    print(f"» SGS {serie.codigo} — {serie.nome} ({inicio} → {fim})")
    dados = _get(
        SGS_URL.format(codigo=serie.codigo),
        {
            "formato": "json",
            "dataInicial": inicio.strftime("%d/%m/%Y"),
            "dataFinal": fim.strftime("%d/%m/%Y"),
        },
    )
    if not isinstance(dados, list) or not dados:
        raise RuntimeError(f"A série {serie.codigo} retornou vazia para o período pedido.")
    _salvar_raw(serie_id, dados)
    df = pd.DataFrame(dados)
    df["serie"] = serie_id
    return df


def extrair_ibovespa(inicio: date, fim: date) -> pd.DataFrame:
    """yfinance é a fonte primária; o Yahoo chart API é o fallback direto."""
    print(f"» yfinance ^BVSP ({inicio} → {fim})")
    try:
        import yfinance as yf

        hist = yf.Ticker("^BVSP").history(
            start=inicio.isoformat(), end=(fim + timedelta(days=1)).isoformat(), interval="1d"
        )
        if hist is None or hist.empty:
            raise RuntimeError("yfinance retornou histórico vazio")
        df = hist.reset_index()[["Date", "Close"]].rename(columns={"Date": "data", "Close": "valor"})
        df["data"] = pd.to_datetime(df["data"]).dt.tz_localize(None).dt.strftime("%d/%m/%Y")
        df["serie"] = "ibovespa"
        _salvar_raw("ibovespa", df.to_dict(orient="records"))
        return df
    except Exception as exc:  # noqa: BLE001
        print(f"  ! yfinance indisponível ({exc}); tentando Yahoo chart API")

    payload = _get(
        "https://query2.finance.yahoo.com/v8/finance/chart/%5EBVSP",
        {
            "period1": int(datetime.combine(inicio, datetime.min.time()).timestamp()),
            "period2": int(datetime.combine(fim, datetime.max.time()).timestamp()),
            "interval": "1d",
        },
    )
    result = payload["chart"]["result"][0]
    closes = result["indicators"]["quote"][0]["close"]
    stamps = result["timestamp"]
    linhas = [
        {
            "data": datetime.utcfromtimestamp(ts).strftime("%d/%m/%Y"),
            "valor": close,
            "serie": "ibovespa",
        }
        for ts, close in zip(stamps, closes)
        if close is not None
    ]
    if not linhas:
        raise RuntimeError("O Yahoo Finance não devolveu fechamentos para ^BVSP.")
    _salvar_raw("ibovespa", linhas)
    return pd.DataFrame(linhas)


def extrair_tudo(inicio: date, fim: date) -> tuple[dict[str, pd.DataFrame], dict[str, str]]:
    """Retorna os dataframes brutos e o status de cada série (ok / mensagem de erro)."""
    frames: dict[str, pd.DataFrame] = {}
    status: dict[str, str] = {}
    for serie_id in SGS_SERIES:
        try:
            frames[serie_id] = extrair_sgs(serie_id, inicio, fim)
            status[serie_id] = "ok"
        except Exception as exc:  # noqa: BLE001
            status[serie_id] = str(exc)
            print(f"  x {serie_id}: {exc}")
    try:
        frames["ibovespa"] = extrair_ibovespa(inicio, fim)
        status["ibovespa"] = "ok"
    except Exception as exc:  # noqa: BLE001
        status["ibovespa"] = str(exc)
        print(f"  x ibovespa: {exc}")
    return frames, status
