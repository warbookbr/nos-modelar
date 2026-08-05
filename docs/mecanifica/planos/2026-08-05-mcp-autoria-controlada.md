# MCP — autoria controlada de pacotes

**Estado:** ativo

**Responsáveis:** GPT (estratégia, arquitetura, revisão e decisão) e Claude (implementação e prova como operador)

**Repositório e base:** `warbookbr/nos-mecanifica`, `main` em `99dd2fe86056e6a205c8b3198d2db295683053b4`

**Canal durável:** issue #23 — `MCP — autoria controlada de pacotes`

**Arquivos reservados:** `tools/modelagem/preparar-pacote.mjs`, eventual serviço compartilhado estritamente necessário em `tools/modelagem/`, `tools/mcp/servidor.mjs`, `tools/mcp/contratos.mjs`, `tools/mcp/perfis/autoria.mjs`, testes focados em `tools/modelagem/` e `tools/mcp/`, `package.json` somente se um gate precisar ser adicionado, e os documentos deste plano.

## Problema observado

O Módulo 1 foi aprovado e permite descoberta, inspeção, validação, comparação e prova visual somente leitura. O fluxo de autoria já possui contrato canônico de pacote e uma CLI que prepara `briefing.json` e `referencias.json`, mas essa operação escreve imediatamente. Um agente MCP ainda não consegue revisar previamente o resultado normalizado, confirmar exatamente aqueles bytes e só então aplicar uma criação confinada e atômica.

A ausência desse protocolo impede abrir escrita com segurança. Expor a CLI diretamente também seria incorreto: o adaptador não pode executar shell, duplicar defaults, aceitar sobrescrita ou deixar um pacote parcial quando a segunda gravação falha.

## Resultado

Um perfil MCP separado, `autoria`, permite a um agente planejar e depois criar um pacote canônico novo em duas fases verificáveis, com confirmação vinculada aos bytes planejados, escrita confinada e atômica, nenhuma sobrescrita e zero alteração de receita, revisão, material ou Git.

## Hipótese

Separar planejamento e aplicação reduz o risco de escrita acidental sem inventar outro formato: o mesmo serviço compartilhado produz o preview canônico, calcula a confirmação e aplica exatamente aqueles bytes. A fatia só é aprovada se um consumidor novo concluir o fluxo sem shell, leitura interna ou correção manual dos JSONs.

## Contrato da fatia

### Perfil

O perfil `revisao` permanece inalterado e somente leitura. O novo perfil `autoria` anuncia exatamente duas ferramentas:

1. `planejar_pacote`
2. `criar_pacote`

Nenhuma ferramenta de escrita entra no perfil `revisao`.

### `planejar_pacote`

Entrada mínima:

- `id` em slug canônico;
- `peca` semântica;
- `modo`: `refinamento` ou `criacao`;
- `partesEsperadas` somente quando `modo=criacao`.

Comportamento:

- não escreve nenhum arquivo ou diretório;
- reutiliza integralmente validação, defaults, descrição do alvo e serialização canônica de `tools/modelagem/`;
- devolve preview estruturado de `briefing.json` e `referencias.json`, caminhos relativos previstos, lista de arquivos e uma confirmação `sha256:` derivada da versão do contrato, da entrada normalizada e dos bytes canônicos;
- não expõe caminho absoluto, variável de ambiente, Temp, stdout de subprocesso ou conteúdo fora do pacote planejado;
- informa de forma estruturada se o pacote ou alvo já impede a futura aplicação.

A confirmação não é credencial secreta. Ela é prova determinística de que o agente viu e aprovou exatamente o plano que pretende aplicar.

### `criar_pacote`

Entrada: os mesmos campos de autoria mais a `confirmacao` produzida por `planejar_pacote`.

Comportamento:

- recalcula o plano pelo mesmo serviço compartilhado;
- recusa confirmação ausente, malformada ou divergente;
- recusa pacote existente, destino parcial, symlink em qualquer componente, traversal ou saída de `autoria-assistida/pacotes/`;
- grava os dois JSONs em diretório temporário irmão, com criação exclusiva;
- publica o pacote por rename atômico somente depois de ambos os arquivos terem sido gravados e conferidos byte a byte;
- remove a temporária em falha antes da publicação;
- nunca altera ou remove pacote existente;
- retorna somente id, caminhos relativos, hashes/bytes e estado da aplicação.

Uma segunda aplicação com o mesmo id deve falhar como `pacote_existente`; não deve ser tratada como sucesso idempotente nem tocar o pacote original.

## Piloto

A prova funcional usa um pacote novo de refinamento para `_mancal-de-mesa` em workspace descartável, com id estável escolhido pelo operador a partir do cenário. O agente deve:

1. descobrir o perfil e os schemas;
2. executar `planejar_pacote`;
3. registrar os dois previews, arquivos previstos e confirmação;
4. executar `criar_pacote` com a mesma entrada e confirmação;
5. validar o pacote criado pelo MCP de revisão;
6. repetir a aplicação e observar recusa sem alteração;
7. alterar um campo mantendo a confirmação antiga e observar recusa;
8. confirmar ausência de escrita antes da aplicação e ausência de resíduo após falhas.

O workspace da prova não é commitado. Nenhum pacote piloto permanente entra em `main` por esta fatia.

## Incluído

- extração do planejamento puro a partir do serviço atual de preparação;
- criação atômica do par `briefing.json` e `referencias.json`;
- perfil MCP separado de autoria;
- duas ferramentas e seus schemas/resultados estruturados;
- confirmação determinística do dry-run;
- confinamento físico e lógico, incluindo symlinks;
- paridade da CLI existente com o serviço compartilhado;
- testes unitários, MCP real e prova caixa-preta pós-merge.

## Excluído

- editar ou criar `prototipos/fps/v3/pecas/*.js`;
- aceitar código JavaScript, patches ou texto livre como entrada MCP;
- gerar, promover ou comparar revisões novas;
- renderização adicional;
- contrato genérico ou ferramentas de materiais;
- montagem persistida, solver, PBR ou paleta aberta;
- Git, branch, commit, push, PR, merge ou publicação;
- HTTP, autenticação, múltiplos workspaces ou servidor remoto;
- sobrescrita, atualização ou remoção de pacote existente.

## Invariantes

- `validarPacote`, `serializarCanonico`, descrição headless e defaults continuam sendo as fontes canônicas;
- o adaptador MCP não executa CLI ou shell e não replica regra de negócio;
- `revisao` mantém exatamente suas quatro ferramentas e três recursos;
- a autoria não escreve fora de `autoria-assistida/pacotes/`;
- nenhuma falha deixa pacote parcial visível;
- um pacote existente nunca é tocado;
- stdout continua exclusivo do protocolo MCP;
- materiais permanecem fora mesmo que o briefing cite os guias canônicos existentes.

## Gates de saída

1. `planejar_pacote` é comprovadamente sem escrita em sucesso e falha;
2. preview e aplicação usam bytes canônicos idênticos;
3. `criar_pacote` exige confirmação válida e vinculada à entrada normalizada;
4. criação é atômica e sem sobrescrita, inclusive sob falha injetada entre os dois arquivos e corrida no destino;
5. traversal, caminho absoluto, symlink interno/externo e raiz inválida são recusados;
6. o pacote criado passa pelo validador canônico e por `validar_pacote` do perfil de revisão;
7. a CLI `preparar:modelagem` preserva diagnósticos e comportamento público, mas usa o mesmo núcleo;
8. nenhuma resposta MCP expõe caminhos absolutos;
9. catálogos dos perfis são exatos e a escrita não aparece em `revisao`;
10. testes focados, `npm test`, `npm run mcp:check`, build, mapa, índices, links e `planos:check` passam;
11. prova caixa-preta pós-merge registra ferramentas, entradas, confirmação, bytes, recusa de repetição, falhas, fallback, escrita e duração.

## Casos obrigatórios de teste

- refinamento válido de peça existente;
- criação válida com `partesEsperadas`, sem criar a receita alvo;
- refinamento de peça inexistente;
- criação quando o alvo já existe;
- pacote já existente;
- confirmação ausente, inválida, de outra entrada e de preview adulterado;
- falha injetada antes e depois da primeira gravação;
- corrida em que o destino aparece antes do rename;
- symlink na raiz, pasta temporária, destino e arquivo;
- serialização, hashes e ordenação determinísticos;
- importação silenciosa e encerramento limpo do servidor.

## Fatias

1. baseline e testes de planejamento sem escrita;
2. serviço compartilhado de plano/confirmacão;
3. aplicação atômica e paridade da CLI;
4. perfil MCP `autoria`, schemas e testes reais;
5. prova caixa-preta pós-merge;
6. fechamento com decisão `aprovar`, `corrigir` ou `interromper`.

## Riscos e paradas

- parar se o dry-run e a aplicação puderem usar regras ou defaults diferentes;
- parar se a confirmação puder ser reutilizada para bytes diferentes;
- parar se qualquer falha deixar diretório parcial em `pacotes/`;
- parar se for necessário aceitar caminho fornecido pelo cliente;
- parar se a mudança exigir editar receita, revisão, material, Git ou servidor remoto;
- corrigir antes de ampliar caso o perfil `autoria` precise de mais de duas ferramentas nesta fatia.

## Fechamento

Preencher somente após a prova pós-merge: estado final, PR/commit, gates, resultado caixa-preta, decisão e candidatos devolvidos ao painel. A aprovação desta fatia não autoriza automaticamente edição de receitas, revisões ou materiais.