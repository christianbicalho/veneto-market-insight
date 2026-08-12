# Vêneto Inteligência de Mercado — Painel de Mercado

## Validação já feita nas fontes oficiais
Consultei a API SGS do Banco Central agora:
- **12 — CDI diário** (% ao dia): último ponto 10/08/2026 = 0,051660
- **433 — IPCA mensal** (% no mês): último ponto 07/2026 = 0,07
- **1 — Dólar PTAX venda diário** (R$/US$): 11/08/2026 = 5,1285

Códigos confirmados. O Yahoo Finance respondeu "Too Many Requests" na primeira tentativa a partir do sandbox — o ETL usa `yfinance` com retry e, se o Yahoo bloquear, registra a série como indisponível em vez de inventar dados.

## Arquitetura
```
Fontes oficiais            ETL Python (etl/)            Camadas               App React/TS
BCB SGS 12/433/1     ->   extract -> transform ->  data/raw/  (bruto)   ->  server fn lê o
Yahoo ^BVSP                load                   data/curated/         ->  snapshot curado
                                                  csv|parquet|sqlite|json   + refresh ao vivo
```
- ETL em Python (`pandas`, `requests`, `yfinance`) é a fonte de verdade dos dados tratados.
- O dashboard (TanStack Start + React + TS) lê o JSON curado gerado pelo ETL e, em tempo de requisição, tenta atualizar as séries do BCB direto da API (server function), caindo para o snapshot se a rede falhar.

## Transformações
- Janela de 5 anos dinâmica a partir da data de execução.
- Datas normalizadas para ISO, valores para float; deduplicação por `(serie, data)`.
- Sem preenchimento de fins de semana/feriados e sem substituir faltantes por zero.
- Camada canônica preserva frequência original; camada analítica mensal: CDI por composição geométrica dos dias úteis do mês, IPCA valor do mês, dólar e Ibovespa último pregão do mês.
- Índices base 100 recalculados a partir do primeiro ponto do período selecionado (no front, ao trocar 1/3/5 anos).
- CDI anualizado = `(1 + cdi_dia)^252 - 1`; IPCA 12m e CDI 12m por composição geométrica.
- Retorno real ex post = `((1+CDI_acum)/(1+IPCA_acum)) - 1`.
- Comparações só em meses presentes em todas as séries envolvidas.

## Visualizações
1. Quatro cards: CDI anualizado, IPCA 12m, PTAX venda, Ibovespa — valor, unidade, data, comparação temporal, seta discreta.
2. Gráfico de linhas base 100 (CDI, IPCA, dólar, Ibovespa) com filtros 1/3/5 anos, toggle de séries, tooltip com data/índice/retorno acumulado.
3. CDI × Inflação: barras/linhas com CDI 12m, IPCA 12m e retorno real ex post + explicação curta.
4. Tabela de rastreabilidade: indicador, valor, data, frequência, fonte, código/ticker, status.
5. Até três leituras executivas automáticas, puramente descritivas.
6. Exportação CSV dos dados tratados.

## Estrutura do projeto
```
etl/            extract.py transform.py load.py pipeline.py sources.py
data/raw/       respostas brutas por série (json)
data/curated/   indicadores.csv .parquet, veneto.sqlite, dashboard.json
src/            app React (rotas, componentes, hooks)
README.md  IA.md  requirements.txt  .gitignore
.github/workflows/etl-daily.yml
```

## Identidade visual
Azul-marinho #0B1D2C dominante, fundo marfim #F4F2EC, dourado #D8B52A em detalhes, serifada nos títulos e sem serifa nos números, linhas finas, muito respiro. Tokens em `src/styles.css`, sem cores hardcoded nos componentes.

## Riscos e limitações
- Yahoo Finance pode bloquear o sandbox; nesse caso o Ibovespa aparece com status "indisponível" (nunca dado fictício).
- Agendamento diário: crio o workflow do GitHub Actions, mas ativá-lo depende de você publicar o repositório — passo externo documentado, não simulado.
- IPCA é divulgado com defasagem: o painel mostra explicitamente a data da última observação.
- O painel é informativo e não emite recomendação de investimento.
