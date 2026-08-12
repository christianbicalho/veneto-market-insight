# IA.md

> Relatório gerado pela própria IA (Lovable, modelo Claude) a partir do histórico real desta conversa, conforme o prompt definido no case. Conversa única — não houve outras ferramentas ou sessões.

## 1. Como fui direcionada

O direcionamento foi **muito detalhado e prescritivo**, em uma única mensagem inicial longa, acompanhada do PDF do case anexado. As características do direcionamento:

- **Contexto explícito**: o PDF do case foi anexado como especificação funcional e o site oficial (venetomfo.com.br) foi indicado como referência visual.
- **Restrições fortes e nominais**: códigos SGS esperados (12, 433, 1), ticker `^BVSP`, uso de 252 dias úteis, exigência de composição geométrica em vez de soma simples, proibição de preencher fins de semana/feriados e de substituir faltantes por zero, proibição de apresentar dados demonstrativos como reais, proibição de recomendação de investimento.
- **Plano antes do código**: foi pedido explicitamente um plano curto com arquitetura, fontes, transformações, visualizações, estrutura do projeto e riscos — e que, depois de aprovado, eu implementasse tudo sem parar para novas decisões.
- **Instrução de validação**: "valide os códigos e metadados das séries nas fontes oficiais" e "não invente requisitos ausentes".
- **Critérios de aceite listados um a um**, funcionando como checklist de entrega.
- **Instrução anti-simulação**: se algo externo (publicação/agendamento) não pudesse ser concluído no ambiente, eu deveria documentar o passo pendente em vez de fingir conclusão.

O nível de autonomia concedido foi alto na execução, mas baixo na definição: praticamente todas as regras de negócio e de apresentação vieram do usuário.

## 2. Pedidos principais

1. **Construir a aplicação completa "Vêneto Inteligência de Mercado"** — não um protótipo visual, mas ETL real, dados tratados, dashboard interativo, documentação e estrutura de repositório reproduzível.
2. **Apresentar um plano antes de implementar**, com arquitetura, fontes, transformações, visualizações, estrutura e riscos — e validar os códigos das séries nas fontes oficiais antes de usá-los.
3. **Implementar o pipeline ETL em Python** (pandas/requests/yfinance) com janela dinâmica de 5 anos, extração com timeout e retry, camada canônica preservando frequências, camada analítica mensal, cargas em CSV/Parquet/SQLite/JSON e atualização incremental por merge na chave data+série.
4. **Construir o dashboard em React/TypeScript** com cabeçalho institucional, quatro cards, gráfico base 100 com filtros de 1/3/5 anos e recálculo da base, comparação CDI × inflação com retorno real ex post, tabela de rastreabilidade, até três leituras executivas descritivas, exportação CSV e estados de carregamento/erro/ausência.
5. **Aplicar a identidade visual da Vêneto** (azul-marinho, marfim, dourado, serifada nos títulos, aparência patrimonial e sóbria) e **gerar README.md e IA.md** honestos ao final.

## 3. Correções e questionamentos

**Não houve correções, questionamentos ou rejeições por parte do usuário nesta conversa.** O plano apresentado foi aprovado sem alterações e a implementação seguiu em uma única sequência, sem intervenções intermediárias. Registrar isso é mais fiel do que inventar um vaivém que não aconteceu.

O que houve foram **correções minhas sobre meu próprio trabalho**, forçadas pelo ambiente:

- A primeira tentativa de acesso ao Yahoo Finance a partir do sandbox retornou `Too Many Requests`; incluí isso no plano como risco e implementei fallback para o endpoint `chart` do Yahoo. Na execução real do pipeline, o `yfinance` funcionou e trouxe 1.247 observações.
- O TypeScript do projeto usa `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`; três rodadas de erros de tipo (acessos indexados possivelmente indefinidos e `Record<string, string>` em props do Recharts) tiveram de ser corrigidas antes de o build passar.

## 4. Divisão das decisões

**Decidido pelo usuário (e seguido sem alteração):**
- escopo do produto e público-alvo;
- as quatro séries, suas fontes e códigos esperados;
- todas as fórmulas obrigatórias (252 dias úteis, composição geométrica, retorno real ex post);
- as regras de tratamento (sem preenchimento artificial, sem zero para faltante, dedupe por data+série, camada mensal com regra por série);
- os formatos de carga (CSV, Parquet, SQLite, JSON);
- a composição do dashboard, seção por seção, e o texto do cabeçalho;
- a paleta de cores e a direção tipográfica;
- as exigências de acessibilidade, estados e honestidade dos dados;
- a estrutura do repositório e o conteúdo do README.

**Sugerido por mim e aceito sem alteração:**
- separar o ETL em `sources.py` / `extract.py` / `transform.py` / `load.py` / `pipeline.py`, com o catálogo de séries tipado como fonte única de metadados;
- janela incremental de 45 dias como padrão para capturar revisões;
- fallback do Yahoo `chart` API quando o `yfinance` falha, e status "indisponível" em vez de dado estimado;
- classificação de frescor por série (3 dias úteis para diárias, 45 dias para o IPCA) em uma server function, em vez de recalcular no cliente;
- base 100 construída apenas sobre meses presentes em **todas** as séries ativas, com base no primeiro mês comparável;
- área de retorno real ex post sobreposta às linhas de CDI 12m e IPCA 12m na visualização de inflação;
- tipografia Cormorant Garamond + IBM Plex Sans e tokens `oklch` no design system;
- rodapé com disclaimer de conteúdo informativo;
- workflow de GitHub Actions com cron 22h UTC em dias úteis.

## 5. Pontos de atenção (o que merece verificação humana)

- **Conversão de cores**: a paleta foi convertida de hexadecimal para `oklch` por aproximação. Os tons estão visualmente próximos dos hex sugeridos, mas não são idênticos — vale conferir contra a marca.
- **Frescor do painel**: o dashboard lê um snapshot JSON gerado pelo ETL, não consulta as APIs a cada acesso. Se o pipeline não rodar, a base envelhece (o painel sinaliza, mas o dado não se atualiza sozinho).
- **GitHub Actions não foi executado nem agendado.** O arquivo existe; habilitar o Actions no repositório público é um passo humano pendente.
- **Variações de 30 dias e 12 meses** usam a observação disponível mais próxima anterior ao corte de calendário. É uma escolha defensável, mas difere de "30 pregões" — confira se é a convenção que a equipe usa.
- **Anualização do CDI** parte da última taxa diária divulgada elevada a 252. É a convenção usual, mas expressa a taxa do dia, não uma média do período; a leitura ao lado do cliente deve ser essa.
- **IPCA como "% no mês"**: a série 433 foi validada e interpretada como variação percentual mensal. A conferência foi feita contra a documentação e contra os valores retornados; uma verificação humana adicional no site do SGS é barata e recomendável.
- **Dependência do Yahoo Finance**: sem contrato de estabilidade. Mudanças de resposta podem quebrar a extração do Ibovespa — nesse caso o painel marca a série como indisponível, o que é o comportamento desejado, mas exige atenção humana.
- **Leituras executivas automáticas**: são geradas por regras fixas sobre os dados. Elas descrevem, não explicam. Vale ler antes de reproduzir em uma conversa com cliente.
- **Não foram escritos testes automatizados** (pytest/vitest). A verificação foi feita por execução real do pipeline, conferência dos valores contra as APIs e inspeção do painel em navegador headless.
