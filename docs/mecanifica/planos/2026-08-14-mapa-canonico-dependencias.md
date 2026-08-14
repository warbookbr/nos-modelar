# Mapa canônico de dependências v1

**Estado:** ativo

**Responsável:** Codex (arquitetura, implementação, prova e revisão)

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/mcp-montagens-leitura` em `c07e25c`.

## Problema observado

A Mecanifica deriva impacto local e cataloga raízes escolhidas, mas não possui
uma fonte estruturada que declare o universo completo sob gestão. A IA não
consegue provar se há outros consumidores autorizados. Varredura implícita do
disco misturaria arquivos acidentais, não provaria completude e exporia detalhes
do host.

## Resultado verificável

Dado um universo explícito de peças, montagens e raízes, o sistema produz mapa
determinístico de usos, dependentes, relações, caminhos, revalidação mínima e
fontes/revisões que sustentam a cobertura.

Uma consulta direcionada deve entregar somente o contexto necessário ao alvo.
Nenhum caminho local, malha, UUID ou índice de array cruza a interface pública.

## Definição de “global”

Neste plano, **global** significa completo dentro de um universo canônico
declarado pelo host. Não significa procurar qualquer JSON existente na máquina.

O universo v1 enumera peças, montagens e raízes por ID. O mapa só declara
cobertura completa quando todas as referências foram validadas no mesmo
snapshot lógico; ausência, duplicidade, ciclo, divergência ou concorrência
impedem essa alegação.

## Hipótese

Um índice derivado de autoria persistida e revisões ativas permite localizar
impacto global com baixo custo de contexto sem introduzir solver, correção
automática ou uma segunda fonte de verdade. A consulta direcionada deve ser
mais segura e menor que carregar todas as montagens na sessão da IA.

## Contratos previstos

- `mecanifica.universo-autoria` v1: manifesto confiável do host com peças,
  montagens, raízes e referências confinadas; não duplica composição.
- `mecanifica.mapa-dependencias` v1: entidades, composição, relações, usos
  reversos, raízes/caminhos, proveniência, cobertura, revisões e hashes.
- `mecanifica.impacto-global` v1: consulta por `{ tipo, id }` com dependentes,
  relações, raízes, caminhos e roteiro mínimo; não executa gates nem escreve.

## Incluído

- universo explícito, leitura confinada estática + ativa e snapshot otimista;
- mapa puro, usos reversos e consulta de impacto para peça e montagem;
- diagnóstico de ausência, duplicidade, ciclo, divergência e concorrência;
- resumo e consulta MCP sobre serviço neutro;
- prova multi-raiz, continuidade ativa e medição de contexto.

## Excluído

- executar a cascata, corrigir ou publicar dependentes;
- inferir relação por geometria, proximidade, arquivo ou domínio automotivo;
- colisão, solver, cinemática, varredura de disco, Git ou HTTP;
- alterar núcleo, geometria, materiais, câmera ou receitas;
- manter um mapa manual que possa divergir da autoria.

## Invariantes

1. Autoria e revisões ativas são fonte de verdade; o mapa é derivado.
2. Identidade pública usa IDs semânticos, nunca arquivo, índice ou UUID.
3. Toda aresta informa a montagem, instância ou relação que a declarou.
4. Ordem equivalente produz bytes canônicos idênticos.
5. Cobertura completa exige universo explícito integralmente validado.
6. Mudança concorrente recusa snapshot misto e orienta repetição.
7. Consulta de impacto não implica validação aprovada nem correção automática.
8. O serviço interno não conhece MCP, Three.js, caminhos do cliente ou domínio
   automotivo.

## Filtro Agent-First

- **USAR DIRETO:** leitores v1/v2/v3, revisão ativa e identidade persistida.
- **ENVOLVER:** carregadores confinados em um universo explícito e consultável.
- **REFATORAR:** o catálogo derivado atual, limitado a raízes já resolvidas, não
  pode afirmar completude global; sua lógica útil será reaproveitada em um
  serviço com contrato de universo e proveniência.
- **ADIAR:** execução da cascata, correção automática, solver e distribuição.

## Arquivos previstos

Previstos: contrato, serviços/testes em `src/autoria/`, carregadores/fixtures em
`tools/mecanifica/`, adaptadores MCP e documentos de estado; a responsabilidade
não pode migrar para o núcleo procedural.

Cada fatia deve reservar os arquivos exatos antes da edição.

## Fatias

### R00 — contrato, baseline e fixture adversarial — concluída

- fixar `mecanifica.universo-autoria` v1, mapa/impacto v1 e universo neutro com
  duas raízes, submontagem compartilhada, peça reutilizada e ramo isolado;
- registrar o limite do catálogo atual e provar duplicidade, ausência e ciclo.

**Saída:** contratos executáveis e baseline reproduzível, sem MCP.

Evidência: contrato, validador, fixture compartilhada/isolada e recusas de
ausência, duplicidade, divergência e ciclo.

### R01 — snapshot completo e confinado — concluída

- carregar somente entradas enumeradas, combinando fontes estáticas e revisões
  ativas pelo contrato aprovado;
- calcular hashes sem caminhos, reler identidade/revisão e recusar concorrência.

**Saída:** snapshot lógico completo ou diagnóstico fail-closed.

Evidência: serviço puro `snapshot-universo-autoria`, adaptador confinado,
fallback estático/revisão ativa, hashes sem caminhos e oito entidades; provas
cobrem completude, sobreposição, mutação e revisão. A derivação permanece na R02.

### R02 — derivação canônica

- construir entidades, composição, relações, usos reversos e proveniência;
- ordenar e deduplicar deterministicamente;
- distinguir montagem declarada, instância e ocorrência por caminho;
- provar determinismo sob permutação do manifesto e instâncias repetidas.

**Saída:** `mecanifica.mapa-dependencias` v1 puro e reproduzível.

### R03 — consulta de impacto global

- consultar peça ou montagem por ID;
- calcular dependentes diretos e transitivos, raízes, caminhos e relações;
- derivar o roteiro mínimo de revalidação sem executar gates;
- declarar ramo não afetado, limites e cobertura do universo.

**Saída:** `mecanifica.impacto-global` v1 compacto e acionável.

### R04 — consumo Agent-First

- anunciar resumo, hash e cobertura do universo por recurso MCP;
- expor consulta de impacto por ferramenta de leitura usando somente IDs;
- manter mapa completo fora da resposta quando a consulta reduzida bastar;
- versionar o contrato MCP se a superfície pública mudar.

**Saída:** consumidor caixa-preta descobre e consulta impacto sem shell ou
caminhos locais.

### R05 — prova de continuidade e escala

- publicar uma montagem ativa que acrescente ou remova um uso;
- reconstruir o mapa e provar mudança de hash e impacto em nova sessão;
- injetar alteração concorrente durante a leitura e provar recusa do snapshot
  misto;
- medir bytes do impacto direcionado contra a soma dos contextos completos.

**Saída:** evidência de continuidade, consistência e economia de contexto.

### R06 — fechamento

- revisar o contrato e documentação de estado;
- executar gates completos;
- registrar decisão `aprovar`, `corrigir` ou `interromper`;
- se aprovado, recomendar plano separado de revalidação em cascata persistida.

## Gates e evidências

- contrato recusa universo vazio, IDs duplicados, alvo ausente e referência não
  enumerada;
- ciclo, identidade divergente e origem ambígua falham com diagnóstico;
- permutações equivalentes produzem mapa byte-idêntico;
- peça compartilhada encontra todas as raízes e caminhos, sem incluir ramo não
  afetado;
- montagem dependente aparece direta e transitivamente uma única vez por
  ocorrência sem perder proveniência;
- revisão ativa modifica o mapa observado e sobrevive a nova sessão;
- mudança concorrente nunca publica snapshot logicamente misto;
- resposta pública não contém paths, malha, índices posicionais ou UUIDs;
- impacto direcionado tem orçamento medido e cobertura explícita;
- testes focados, consumidor MCP e gates completos de
  `docs/mecanifica/INDEX.md` passam.

## Critérios de parada

- Parar se “global” depender de varredura arbitrária ou não puder provar o
  universo ao qual se refere.
- Parar se o mapa precisar ser editado manualmente para permanecer correto.
- Parar se consistência exigir bloquear ou reescrever o repositório de autoria;
  preferir observação otimista e repetição.
- Não ampliar o recorte para execução da cascata, solver ou correção automática.
- Não expor o mapa inteiro por MCP apenas por ele existir; medir antes.

## Encerramento

O plano encerra somente com mapa e consulta provados sobre o universo
adversarial, continuidade por revisão ativa, consistência concorrente, consumo
caixa-preta e gates completos. Até lá, este é o único plano ativo.
