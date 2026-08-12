"""Catálogo de séries do pipeline.

Códigos validados na API SGS do Banco Central em 12/08/2026 consultando
https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados/ultimos/3?formato=json
"""

from dataclasses import dataclass, asdict
from typing import Literal


@dataclass(frozen=True)
class Serie:
    id: str
    nome: str
    fonte: str
    codigo: str
    frequencia: Literal["diaria", "mensal"]
    unidade: str
    natureza: Literal["taxa", "indice", "cotacao"]
    descricao: str

    def to_dict(self) -> dict:
        return asdict(self)


SERIES: dict[str, Serie] = {
    "cdi": Serie(
        id="cdi",
        nome="CDI",
        fonte="BCB · API SGS",
        codigo="12",
        frequencia="diaria",
        unidade="% ao dia",
        natureza="taxa",
        descricao=(
            "Taxa média dos depósitos interfinanceiros, divulgada em dias úteis. "
            "Série 12 do SGS: taxa diária em percentual."
        ),
    ),
    "ipca": Serie(
        id="ipca",
        nome="IPCA",
        fonte="BCB · API SGS (IBGE)",
        codigo="433",
        frequencia="mensal",
        unidade="% no mês",
        natureza="taxa",
        descricao="Índice oficial de inflação. Série 433 do SGS: variação percentual mensal.",
    ),
    "usdbrl": Serie(
        id="usdbrl",
        nome="Dólar PTAX venda",
        fonte="BCB · API SGS",
        codigo="1",
        frequencia="diaria",
        unidade="R$/US$",
        natureza="cotacao",
        descricao="Taxa de câmbio livre, dólar americano (venda), apurada em dias úteis.",
    ),
    "ibovespa": Serie(
        id="ibovespa",
        nome="Ibovespa",
        fonte="Yahoo Finance · yfinance",
        codigo="^BVSP",
        frequencia="diaria",
        unidade="pontos",
        natureza="indice",
        descricao="Fechamento diário do principal índice de ações da B3.",
    ),
}

SGS_SERIES = ["cdi", "ipca", "usdbrl"]
ANOS_JANELA = 5
DIAS_UTEIS_ANO = 252
