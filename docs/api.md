# Serviço central de consultas

Arquitetura: `server.js` → `queue/processQueue.js` (um worker) →
`services/processService.js` → `Automations/Auto_Ceara.js` com lista unitária.
Após a consulta, o worker guarda o resultado em memória e chama
`services/callbackService.js`. `services/validationService.js` concentra a validação.

## Inicialização

Use Node.js 20 ou superior, com as dependências e o Chromium do projeto instalados.
Na raiz do projeto, execute `npm start`. O servidor escuta exclusivamente
`127.0.0.1:3000`; configure `PORT=3000` no `.env` para trocar a porta.
`HEADLESS` continua sendo lido pela automação e `HISTORICO` é repassado como no runner existente.
Não execute outra instância, o runner antigo ou agendamentos da automação ao mesmo
tempo: a exclusão é interna a esta instância Node, não entre processos do sistema operacional.
Nenhum cron é configurado ou alterado por esta implementação.

## Requisições (curl em shell Bash)

```bash
curl -X POST http://127.0.0.1:3000/api/processos/lote \
  -H 'Content-Type: application/json' \
  -d '{"sistema":"sistema_a","processos":["02012637720228060064","30005904820238060010","02406182120248060001"]}'

curl -X POST http://127.0.0.1:3000/api/processos/consulta \
  -H 'Content-Type: application/json' \
  -d '{"sistema":"sistema_b","processo":"30005904820238060010"}'

curl http://127.0.0.1:3000/api/fila/status
```

Os POSTs retornam 202 sem aguardar a consulta. O lote retorna `adicionados`,
`duplicados`, `invalidos`, detalhes dos erros por índice e IDs em `itens`.
Lotes mistos aceitam os válidos e informam os inválidos; lote sem nenhum válido,
array vazio, JSON malformado ou origem inválida retorna 400 sem enfileirar.
O limite do corpo é 1 MB (413 se excedido).
CNJ deve ser string: remove-se tudo que não for dígito e exige-se comprimento 20;
não se verifica dígito verificador nem existência no tribunal nesta validação.

A chave de deduplicação é `[sistema, processo normalizado]`, apenas enquanto pendente
ou processando. Sistemas diferentes podem consultar o mesmo CNJ. Uma consulta manual
duplicada retorna 202 com `duplicado: true`, ID, status e prioridade do item existente;
não promove, troca callback ou reordena esse item. Após término, nova consulta é aceita.

Fila alta tem preferência a cada escolha do próximo item, com FIFO dentro de cada
prioridade. O item atual nunca é interrompido. Falhas de consulta não param a fila.

## Resultados e callback

O adaptador não altera a automação: aguarda `autoCeara([numero], HISTORICO)` e lê
`Andamento.json` e `Historico.json` em `Evidencias/CE/<numero>`.
A automação atual não retorna dados; falha na automação ou leitura dos arquivos
marca o item como `erro`. As evidências continuam sendo gravadas pela rotina existente.

O campo opcional `callback_url` aceita HTTP/HTTPS sem credenciais embutidas.
Quando informado, recebe POST JSON com `id`, `sistema`, `processo`, `status`,
`resultado` (andamento/histórico em sucesso) ou `erro`.
O envio ocorre também para consulta com erro. Não há autenticação, retry ou redirects.
O timeout é 10 segundos; falhas ficam em `callback_status`/`callback_erro` e
não alteram o status da consulta nem impedem o próximo item.
O worker aguarda o callback antes de escolher o próximo item; durante esse intervalo,
o status da fila pode mostrar o item atual já concluído ou com erro.
Os logs novos não incluem URLs de callback, conteúdo de respostas ou erros brutos.
Os logs internos da automação existente permanecem inalterados.

## Validação sem acessar TJCE/STJ

Execute `npm run test:api`. Os testes usam `node:test`, servidor HTTP local em porta
efêmera e uma consulta injetada; não carregam nem executam a automação real e mockam
os callbacks. Cobrem prioridades, deduplicação, falhas, execução única, validações,
resposta imediata, timeout de callback e leitura do adaptador com arquivos temporários.
`npm test` continua sendo o runner original, que acessa os tribunais.

## Limitações

A fila, a deduplicação e os resultados são voláteis. Reiniciar o Node perde itens
pendentes e resultados em memória, sem recuperação de consultas em execução.
São retidos os últimos 1.000 resultados em `fila.resultados`, sem endpoint de consulta
individual nesta etapa; o consumidor recebe resultados por callback. As evidências
em disco mantêm o comportamento anterior. Não há limite de itens pendentes nem
garantia de justiça para lotes sob entrada contínua de alta prioridade.

Execute a partir da raiz, pois a automação usa caminhos relativos. Não há trava
distribuída, persistência, autenticação ou CORS aberto. A API permanece local.
Para futura persistência, substitua o armazenamento em `ProcessQueue`, preservando
as operações de adição, deduplicação, escolha do próximo e atualização de status;
o serviço de consulta e os contratos HTTP permanecem separados.
