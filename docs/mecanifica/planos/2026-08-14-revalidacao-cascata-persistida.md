# Revalidação em cascata persistida v1

**Estado:** ativo

R00–R05 concluídas com decisão `prosseguir`; R06 é o próximo passo.

**Responsável:** Codex (investigação, arquitetura, implementação e prova)

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/mcp-montagens-leitura` em `b23d65a`.

## Problema observado

O mapa canônico identifica dependentes e produz um roteiro mínimo, mas não
preserva a revisão causadora, as pendências ou a validade de resultados antigos.
Sem estado persistido, a IA reconstrói a campanha fora do produto e pode
confundir uma aprovação antiga com a revisão atual.

## Resultado verificável

Dada uma revisão causadora e um snapshot canônico completo, o sistema deriva uma
campanha persistida cujos itens vinculam identidade, revisão e proveniência.

Uma nova sessão deve retomar a campanha sem reconstituir memória de conversa.
Nenhum resultado pode aprovar revisão diferente daquela efetivamente validada.

## Hipótese

O impacto global v1 e o armazenamento transacional existente bastam para criar
um registro pequeno, derivado e auditável. A persistência pode acrescentar
coordenação sem substituir mapa, autoria, validadores ou formatos de montagem.

## Autorização progressiva

R00 fixa o contrato antes de persistência e decide `prosseguir`, `corrigir` ou
`interromper`. Uma decisão `prosseguir` autoriza as fatias seguintes sem criar
segunda fonte de verdade.

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

## Decisão da R00 — prosseguir

A R00 foi executada em `src/autoria/protocolo-revalidacao.js` e provada por
`tools/mecanifica/revalidacao-cascata-r00.test.ts`, usando o mapa e o impacto
globais reais da fixture de dependências. A decisão é `prosseguir` para R01.

O contrato mínimo sustentado é:

- identidade: causa, revisão/hash da causa, universo e hash canônico do mapa;
  não usa UUID, relógio ou posição;
- item: montagem com chave semântica; ordem é apenas execução derivada;
- revisão/hash observado acompanha item e resultado final;
- estados: `pendente`, `em-validacao`, `aprovado`, `reprovado`, `obsoleto`;
- revisão diferente só pode concluir em `obsoleto`; `versao` é apenas CAS;
- repetição idêntica é idempotente; outro resultado para a mesma revisão conflita.

As provas também confirmaram as fronteiras: a R00 não persiste, não executa
validadores, não corrige autoria e não promove dependentes. A R01 está autorizada
a materializar esse contrato em armazenamento transacional, preservando o mapa,
as revisões e os validadores como fontes de verdade separadas.

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

**Resultado:** concluída com decisão `prosseguir`. Cinco testes passaram:
identidade semântica determinística, recusa de snapshot misto, transições e
obsolescência, concorrência fail-closed e resultado idempotente/conflitante.

### R01 — modelo persistido e leitura pura

- persistir campanha completa com commit/revisão e conteúdo canônico;
- reler por identidade, provar determinismo e recusar corrupção/conflito.

**Resultado:** concluída com persistência transacional sobre o repositório de autoria; oito provas R00/R01 passaram.

### R02 — derivação da campanha

- transformar impacto global em itens mínimos e ordenados;
- provar multi-raiz, compartilhamento, ramo isolado e proveniência.

**Resultado:** concluída com ponte impacto→persistência; 11 provas acumuladas passaram.

### R03 — resultados e obsolescência

- registrar resultado vinculado à revisão efetivamente validada;
- invalidar por mudança incompatível sem apagar histórico;
- provar repetição idempotente e concorrência fail-closed. **Resultado:** concluída; 14 provas acumuladas passaram.

### R04 — consumo Agent-First

- expor resumo, pendências e registro seguro por MCP usando IDs;
- manter documentos internos e caminhos fora da resposta;
- provar retomada por consumidor caixa-preta em nova sessão. **Resultado:** concluída; 19 provas acumuladas passaram.

### R05 — estudo de campo

- alterar uma entidade compartilhada e derivar campanha multi-raiz;
- executar validadores existentes, registrar falha/aprovação e nova revisão;
- medir contexto, retomada e ausência de promoção automática. **Resultado:** concluída com estudo multi-raiz, troca de identidade, obsolescência de campanha e retomada MCP; relatório em `docs/mecanifica/RELATORIO-R05-REVALIDACAO-CAMPO.md`.

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
