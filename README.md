# Vêneto Inteligência de Mercado

Pipeline ETL + painel executivo de indicadores do mercado brasileiro (CDI, IPCA, dólar PTAX e Ibovespa).

## 1. Objetivo e público

O painel é usado pela equipe de **Inteligência Comercial da Vêneto Family Office** para preparar conversas com clientes. Ele responde, em poucos segundos:

- qual é o valor mais recente de cada indicador;
- como cada série se comportou em 1, 3 e 5 anos;
- qual foi o retorno acumulado de cada referência;
- como o CDI se compara à inflação (retorno real ex post);
- quais movimentos recentes merecem atenção;
- quando cada série foi atualizada e de onde ela veio.

O conteúdo é **informativo**. Não há recomendação de investimento em nenhuma tela.

## 2. Arquitetura

```
Fontes públicas          ETL Python (etl/)                Camadas de dados             Dashboard (React/TS)
─────────────────        ─────────────────────────        ────────────────────         ─────────────────────
BCB · API SGS 12    ┐    extract.py  → data/raw/*.json    data/curated/
BCB · API SGS 433   ├──► transform.py → canônica+mensal   ├── indicadores_diarios.csv/.parquet
BCB · API SGS 1     │    load.py     → CSV/Parquet/       ├── indicadores_mensais.csv/.parquet
Yahoo ^BVSP (yfin.) ┘                  SQLite/JSON        ├── veneto.sqlite
                                                          └── dashboard.json ──► src/data/dashboard.json
                                                                                   │
                                                        server function getPainel ─┘ (classifica frescor)
                                                                                   │
                                                              rota / (TanStack Start + Recharts)
```

O ETL é a **única fonte de verdade** dos números. O front não recalcula agregados do pipeline; ele apenas recorta janelas e recalcula a base 100 do gráfico (que depende do período escolhido pelo usuário).

## 3. Fontes e códigos (validados)

| Indicador | Fonte | Código / ticker | Frequência | Unidade | Validação |
|---|---|---|---|---|---|
| CDI | BCB · API SGS | `12` | diária (dias úteis) | % ao dia | consultado em 12/08/2026: 10/08/2026 = 0,051660 |
| IPCA | BCB · API SGS (IBGE) | `433` | mensal | % no mês | consultado em 12/08/2026: 07/2026 = 0,07 |
| Dólar PTAX venda | BCB · API SGS | `1` | diária (dias úteis) | R$/US$ | consultado em 12/08/2026: 11/08/2026 = 5,1285 |
| Ibovespa | Yahoo Finance (`yfinance`) | `^BVSP` | diária (pregões) | pontos | fechamento de 11/08/2026 = 167.875 |

Endpoint SGS usado: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json&dataInicial=dd/MM/yyyy&dataFinal=dd/MM/yyyy`.

## 4. Como executar o ETL do zero

```bash
python -m venv .venv && source .venv/bin/activate
python -m pip install -r requirements.txt
python etl/pipeline.py                 # carga completa: 5 anos dinâmicos a partir de hoje
python etl/pipeline.py --incremental   # atualização incremental (últimos 45 dias + merge)
```

Saídas em `data/raw/` (bruto, como veio da fonte) e `data/curated/`. O `dashboard.json` é gravado também em `src/data/dashboard.json`, que é o arquivo lido pelo painel.

## 5. Como iniciar o dashboard

```bash
npm install    # ou bun install
npm run dev    # http://localhost:8080
```

## 6. Decisões de transformação

- **Janela dinâmica de 5 anos** calculada a partir da data de execução (`date.today()`), nunca fixa.
- **Datas** convertidas de `dd/MM/yyyy` para `datetime` e persistidas em ISO `YYYY-MM-DD`; **valores** convertidos para float com `errors="coerce"`.
- **Deduplicação** pela chave `(serie, data)`, mantendo a observação mais recente — é isso que permite capturar revisões na atualização incremental.
- **Dias sem dado não são inventados.** Fins de semana, feriados e pregões ausentes simplesmente não existem na base. Nada é preenchido com zero, média ou último valor. A camada canônica preserva a frequência original de cada série.
- **Camada analítica mensal** (`indicadores_mensais`):
  - CDI: composição geométrica dos retornos diários do mês — `∏(1 + taxa_dia/100) − 1`;
  - IPCA: variação percentual mensal divulgada, convertida para decimal;
  - dólar e Ibovespa: valor do **último pregão disponível do mês**.
  - A coluna `observacoes` registra quantos dias entraram em cada mês, para auditoria.
- **Comparações só em meses compatíveis**: o gráfico base 100 e a série CDI × IPCA usam a interseção dos meses das séries envolvidas.

## 7. Fórmulas

| Métrica | Fórmula |
|---|---|
| CDI anualizado | `(1 + taxa_diária)^252 − 1` |
| CDI acumulado no período | `∏(1 + taxa_diária) − 1` |
| IPCA 12 meses | `∏(1 + ipca_mês) − 1` sobre os 12 últimos meses (nunca soma simples) |
| Retorno real ex post | `((1 + CDI_acum) / (1 + IPCA_acum)) − 1` |
| Variação de 30 dias / 12 meses | último valor ÷ valor da observação mais próxima anterior a `hoje − N dias` − 1 |
| Índice base 100 (taxas) | `100 × ∏(1 + retorno_mensal)` a partir do primeiro mês da janela |
| Índice base 100 (níveis) | `100 × valor_t / valor_0` |

## 8. Tratamento de ausências e integridade

- Série que falha na extração entra no painel com status **indisponível** e mensagem de erro; nenhum número é estimado.
- O painel classifica o frescor por série: diárias toleram até 3 dias úteis de atraso; o IPCA, 45 dias (divulgação mensal com defasagem). O cabeçalho mostra o pior status entre as séries.
- Existe uma flag `demo` no payload. Ela é `false` na base real; se algum dia uma amostra for usada, o painel exibe permanentemente o selo "Dados demonstrativos".

## 9. Atualização incremental

`python etl/pipeline.py --incremental` reextrai apenas os últimos **45 dias** de cada série, concatena com a base canônica anterior (`data/curated/indicadores_diarios.csv`) e resolve a chave `(serie, data)` mantendo a extração mais recente — assim revisões do BCB e ajustes de fechamento substituem o valor antigo. Em seguida a janela de 5 anos é reaplicada, descartando o que saiu do período.

## 10. Por que essas visualizações

- **Quatro cards**: respondem "quanto está agora?" sem exigir leitura de gráfico — é o que o time usa no início da conversa.
- **Base 100**: única forma honesta de colocar taxa, cotação e índice de pontos no mesmo eixo. A base é recalculada ao trocar o período porque "quanto rendeu nos últimos 3 anos" é uma pergunta diferente de "nos últimos 5".
- **CDI × inflação**: a pergunta comercial mais frequente é "meu dinheiro está ganhando da inflação?". O retorno real ex post responde isso com uma fórmula explícita na própria tela.
- **Rastreabilidade**: quem leva um número para o cliente precisa saber a data e a fonte daquele número.
- **Leituras executivas**: no máximo três frases, estritamente descritivas, sem atribuição de causa.

## 11. Testes e verificações realizadas

- Códigos 12, 433 e 1 conferidos diretamente na API SGS (respostas registradas na seção 3).
- `python etl/pipeline.py` executado de ponta a ponta: 1.254 observações de CDI, 59 de IPCA, 1.255 de PTAX e 1.247 de Ibovespa na janela 2021-08-12 → 2026-08-11.
- Painel carregado em navegador headless (desktop 1280px e mobile 390px) sem erros ou avisos no console.
- Conferência cruzada: CDI 12m 14,69% × IPCA 12m 4,44% ⇒ retorno real 9,81%, consistente com `((1,1469)/(1,0444)) − 1`.

## 12. Limitações conhecidas

- O painel lê um **snapshot** gerado pelo ETL; ele não consulta as APIs a cada acesso. A frescura depende de rodar o pipeline (ver seção 13).
- `yfinance` depende do Yahoo Finance, que aplica limites de requisição; há fallback para o endpoint `chart` do Yahoo e, se ambos falharem, a série fica marcada como indisponível.
- O IPCA é divulgado com defasagem de algumas semanas; o card sempre mostra a data da última observação para evitar leitura equivocada.
- Variações de 30 dias e 12 meses usam a observação disponível mais próxima do corte (dias sem pregão não são interpolados).
- As comparações não ajustam risco, liquidez, custos ou tributação.

## 13. Passo externo pendente (não simulado)

O arquivo `.github/workflows/etl-daily.yml` está pronto, com agendamento diário às 22h UTC e commit automático das saídas. **Ele só passa a rodar depois que este repositório for publicado no GitHub e o Actions habilitado** — isso não pode ser feito a partir do ambiente de desenvolvimento e não foi executado.

## 14. Estrutura do repositório

```
etl/            sources.py · extract.py · transform.py · load.py · pipeline.py
data/raw/       respostas brutas por série
data/curated/   csv · parquet · sqlite · dashboard.json
src/            aplicação React/TypeScript (rotas, componentes, libs)
src/data/       dashboard.json consumido pelo painel
README.md · IA.md · requirements.txt · .gitignore
.github/workflows/etl-daily.yml
```
