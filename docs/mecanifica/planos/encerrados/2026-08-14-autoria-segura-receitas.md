# Autoria segura de receitas declarativas

**Estado:** concluído

**Responsável:** GPT (arquitetura, execução e revisão)

**Repositório e base:** `warbookbr/nos-mecanifica`, branch
`implementacao/mcp-montagens-leitura` em `6421fcc`.

## Problema observado

O experimento geométrico criou, inspecionou e revalidou peças novas, mas o MCP
de autoria publica somente montagens. Aceitar JavaScript arbitrário para fechar
essa lacuna ampliaria execução e acesso ao host sem uma fronteira confiável.

## Resultado verificável

Uma IA planeja, inspeciona e publica uma receita procedural como dado JSON
declarativo, sem enviar código executável ou caminho local. O serviço executa o
núcleo sobre os dados, valida identidade, portas e geometria, produz duas vistas
e publica exatamente os bytes confirmados em revisão imutável. A correção do
eixo do experimento completa o ciclo por MCP opt-in.

## Decisão de segurança

O contrato de autoria aceita `PARAMS`, `TOPO`, `PASSOS`, `MATERIAIS`, `ALIASES`
e metadados como JSON. Não aceita import, função, expressão JavaScript, acesso a
processo, filesystem ou rede. Um adaptador pode gerar módulo JavaScript depois,
mas o artefato salvo e validado permanece declarativo.

## Incluído

- contrato `mecanifica.receita-declarativa` v1;
- planejamento puro, confirmação, revisão observada e snapshot imutável;
- execução direta pelo núcleo e exportação de peça resolvida em memória;
- inspeção em duas vistas por adaptador privado;
- perfil MCP de autoria opt-in com IDs, nunca caminhos do cliente;
- prova com `eixo-guia` e recusa de receita/geometria inválida.

## Excluído

- executar JavaScript fornecido pelo agente;
- publicar diretamente em `prototipos/procedural/v3/pecas/`;
- imports, plugins, materiais genéricos, Git, HTTP ou host remoto;
- corrigir automaticamente montagens dependentes ou descobrir usos implícitos.

## Invariantes

1. Planejamento não escreve e confirmação cobre exatamente os bytes.
2. A execução recebe apenas valores JSON e operações já aceitas pelo núcleo.
3. Revisão velha, candidato inválido ou captura incompleta nunca ativa.
4. Receita e peça usam identidade semântica; índice e UUID não persistem.
5. Perfil de leitura e autoria de montagem permanecem compatíveis.

## Fatias

1. Contrato declarativo, executor e validação interna.
2. Planejamento, confirmação e publicação imutável.
3. Inspeção visual e diagnóstico de candidato inválido.
4. Porta MCP opt-in e consumidor caixa-preta.
5. Repetição do experimento, gates e encerramento.

## Gates

- testes focados do serviço e perfil MCP;
- planejamento sem escrita, concorrência e confirmação divergente;
- duas vistas reais da receita candidata;
- alteração inválida recusada e correção publicada/reobservada;
- gates completos de `docs/mecanifica/INDEX.md`.

## Riscos e parada

- Parar se validar exigir avaliar string como código.
- Não chamar o JSON declarativo de compatível com todo módulo histórico.
- Não publicar quando uma operação do núcleo gera órfão ou identidade ausente.
- Manter a porta opt-in se configuração do host estiver incompleta.

## Fechamento

O contrato declarativo, serviço interno, revalidação confinada e quatro tools
MCP foram implementados. O cliente caixa-preta recusou o eixo longo, aprovou a
correção após duas vistas, publicou e releu a revisão sem código ou paths do
cliente. Os gates fecharam com 70 arquivos, 1.215 testes aprovados e 2
ignorados. **Decisão: aprovar.** Módulos JS históricos, publicação no catálogo,
Git, mapa implícito e execução hostil permanecem fora.
