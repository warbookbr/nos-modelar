# Revalidação em cascata persistida v1

**Estado:** ativo

**Responsável:** Codex (investigação, arquitetura, implementação e prova)

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/mcp-montagens-leitura` em `b23d65a`.

## Problema observado

O mapa canônico identifica dependentes e produz um roteiro mínimo depois de uma
alteração, mas esse diagnóstico termina com a resposta. O sistema não preserva
qual revisão causou o impacto, quais revisões dependentes ainda precisam ser
verificadas nem se um resultado anterior continua aplicável.

Sem estado persistido, uma IA precisa reconstruir e lembrar a campanha fora do
produto. Isso aumenta contexto e permite confundir uma aprovação antiga com a
revisão atual.

## Resultado verificável

Dada uma revisão causadora e um snapshot canônico completo, o sistema deriva
uma campanha persistida de revalidação. Cada item vincula identidades semânticas,
revisões e proveniência suficientes para decidir se está pendente, aprovado,
reprovado ou obsoleto.

Uma nova sessão deve retomar a campanha sem reconstituir memória de conversa.
Nenhum resultado pode aprovar revisão diferente daquela efetivamente validada.

## Hipótese

O impacto global v1 e o armazenamento transacional existente bastam para criar
um registro pequeno, derivado e auditável. A persistência pode acrescentar
coordenação sem substituir mapa, autoria, validadores ou formatos de montagem.

## Autorização progressiva

R00 é investigativa e fixa o contrato antes de persistência de produto. Ela
precisa decidir `prosseguir`, `corrigir` ou `interromper`. R01 só começa se a
identidade, as transições e a concorrência se sustentarem sem segunda fonte de
verdade.

Essa barreira não veta a capacidade: evita cristalizar um modelo ambíguo. Uma
decisão `prosseguir` autoriza as fatias seguintes deste plano.

## Incluído

- identidade e ciclo de vida de campanha e item de revalidação;
- vínculo exato entre causa, mapa, dependente e revisões observadas;
- derivação a partir de `mecanifica.impacto-global` v1;
- persistência transacional, retomada e obsolescência explícita;
- registro de resultado produzido pelos validadores existentes;
- leitura e operações MCP por IDs, se o serviço interno estiver provado;
- estudo multi-raiz, concorrência e nova sessão.

## Excluído

- corrigir, publicar ou promover dependentes automaticamente;
- executar JavaScript, shell, Git remoto, HTTP ou varredura de disco;
- solver, colisão geral, cinemática ou inferência geométrica;
- alterar núcleo, geometria, materiais, câmera ou receitas;
- tratar fila, posição, UUID ou timestamp como identidade de domínio;
- substituir revisão ativa, mapa canônico ou autoria como fonte de verdade.

## Invariantes

1. A campanha é derivada de causa e snapshot completos; não edita o mapa.
2. Identidade salva é semântica e estável, nunca índice ou posição na fila.
3. Aprovação vale somente para a revisão dependente realmente observada.
4. Mudança de causa, mapa ou dependente torna resultado incompatível explícito;
   nunca o reaproveita silenciosamente.
5. Concorrência usa comparação de revisão e falha fechadamente.
6. Persistência registra fatos e estado derivável, não documentos geométricos.
7. Planejar, executar validação e publicar autoria continuam ações separadas.
8. MCP é uma porta sobre serviço neutro; não define o modelo interno.

## Perguntas obrigatórias da R00

- Qual composição mínima identifica uma campanha sem UUID ou relógio?
- Um item representa montagem, relação, gate ou revisão dependente?
- Quais transições são válidas e quais fatos precisam ser imutáveis?
- Como distinguir `pendente`, `falhou`, `aprovado` e `obsoleto` sem ambiguidade?
- O que acontece quando causa, universo, mapa ou dependente muda?
- A campanha nasce inteira numa transação ou pode ser materializada por partes?
- Como repetir validação sem apagar histórico nem duplicar aprovação?
- Quais campos são derivados e nunca devem ser editados manualmente?

## Contratos candidatos

- `mecanifica.campanha-revalidacao` v1: identidade, causa, universo, hash do
  mapa, snapshot observado, itens e cobertura;
- `mecanifica.resultado-revalidacao` v1: item, revisão validada, gates,
  diagnóstico, proveniência e vínculo com a campanha;
- serviço de derivação puro; repositório transacional e adaptadores separados.

Os nomes e campos são hipóteses da R00, não contratos aprovados antecipadamente.

## Filtro Agent-First

- **USAR DIRETO:** mapa/impacto v1, revisões ativas, validadores e transações.
- **ENVOLVER:** persistência append-only e consulta compacta por campanha/alvo.
- **REFATORAR:** somente costuras que hoje perdem revisão ou proveniência.
- **ADIAR:** correção automática, promoção em lote, scheduler e distribuição.

## Arquivos previstos

Previstos após R00: serviços e contratos em `src/autoria/`, persistência e
fixtures em `tools/mecanifica/`, adaptadores em `tools/mcp/` e fontes de verdade
em `docs/mecanifica/`. Cada fatia reserva arquivos exatos antes de editar.

## Fatias

### R00 — investigação e contrato executável

- comparar impacto, repositório de autoria e roteiros existentes;
- modelar identidade, estados, obsolescência e concorrência;
- construir fixture adversarial e testes de contrato sem persistência real;
- decidir `prosseguir`, `corrigir` ou `interromper`.

**Saída:** contrato mínimo sustentado ou parada explícita antes de produção.

### R01 — modelo persistido e leitura pura

- persistir campanha completa com commit/revisão e conteúdo canônico;
- reler por identidade, provar determinismo e recusar corrupção/conflito.

### R02 — derivação da campanha

- transformar impacto global em itens mínimos e ordenados;
- provar multi-raiz, compartilhamento, ramo isolado e proveniência.

### R03 — resultados e obsolescência

- registrar resultado vinculado à revisão efetivamente validada;
- invalidar por mudança incompatível sem apagar histórico;
- provar repetição idempotente e concorrência fail-closed.

### R04 — consumo Agent-First

- expor resumo, pendências e registro seguro por MCP usando IDs;
- manter documentos internos e caminhos fora da resposta;
- provar retomada por consumidor caixa-preta em nova sessão.

### R05 — estudo de campo

- alterar uma entidade compartilhada e derivar campanha multi-raiz;
- executar validadores existentes, registrar falha/aprovação e nova revisão;
- medir contexto, retomada e ausência de promoção automática.

### R06 — fechamento

- revisar contratos, documentação e gates completos;
- decidir `aprovar`, `corrigir` ou `interromper`;
- recomendar próximo recorte sem abri-lo por implicação.

## Gates e evidências

- IDs independem de ordem, relógio, UUID e posição;
- campanha não nasce de mapa incompleto ou snapshot misto;
- revisão diferente nunca herda aprovação silenciosamente;
- conflito não sobrescreve campanha ou resultado concorrente;
- repetição equivalente preserva bytes e não duplica fatos;
- nova sessão retoma pendências e proveniência sem shell;
- resposta pública não contém paths, malha ou documentos de autoria;
- testes focados e gates de `docs/mecanifica/INDEX.md` passam.

## Critérios de parada

- Parar se o estado precisar duplicar montagem, mapa ou geometria como verdade.
- Parar se a identidade depender de tempo, UUID, índice ou ordem de execução.
- Parar se aprovação não puder ser vinculada a revisões exatas.
- Parar se persistência exigir corrigir ou promover autoria automaticamente.
- Preferir adaptar contratos existentes a criar um segundo executor de gates.

## Encerramento

O plano encerra somente com campanha retomável, concorrência e obsolescência
provadas sobre revisões reais, ou com uma decisão explícita de parada na R00.
