# MCP — encerramento da Fatia 1A somente leitura

**Estado:** concluído

**Encerramento documental:** 2026-08-05

**Plano de origem:** `docs/mecanifica/planos/2026-08-04-mcp-para-agentes.md`

## Resultado

O piloto local do perfil `revisao` foi aprovado. O servidor MCP stdio expõe os
dois recursos previstos e três ferramentas somente leitura, preserva os
serviços existentes, devolve resultados e erros estruturados e não depende de
shell ou fallback externo no fluxo homologado.

## Evidências reais do piloto

| Medida | Resultado |
|---|---:|
| Agente consumidor | zerado |
| Recursos lidos | 2 |
| Chamadas de ferramentas | 6 |
| Falhas inesperadas | 0 |
| Fallback externo | 0 |
| Casos homologados | 1 e 2 concluídos |
| Traversal `../segredo` | recusado |
| Decisão | MCP aprovado |

A comparação histórica do mancal ficou limitada porque parte dos artefatos
anteriores ao contrato v4 não contém a evidência necessária para uma comparação
integral. Essa limitação não foi escondida nem compensada por inferência.

## Capacidades comprovadas

- handshake real por stdio e catálogo exato do perfil;
- recursos `mecanifica://estado` e
  `mecanifica://capacidades/modelagem`;
- ferramentas `descrever_peca`, `validar_pacote` e
  `comparar_revisoes`;
- schemas públicos e `structuredContent` validados pelo cliente oficial;
- paridade com os serviços e CLIs existentes no recorte coberto;
- stdout exclusivamente protocolar e stderr separado;
- entradas por identificador, com caminhos e traversal recusados;
- encerramento limpo do processo MCP.

## Limite descoberto

O perfil ainda não produz nem transporta imagens. Portanto, ele consegue medir,
validar e comparar revisões, mas não permite que o agente consumidor leia as
quatro vistas oficiais sem recorrer ao fluxo externo de bancada.

## Decisão de encerramento

A Fatia 1A está concluída e não deve permanecer como plano ativo. O único próximo
recorte autorizado é a Fatia 1B visual, limitada a uma ferramenta somente
leitura para as quatro vistas oficiais. Autoria, promoção, materiais, Git,
servidor remoto e escrita de artefatos voltam ao painel como candidatos, sem
autorização de implementação.

## Gates e fontes

A prova permanece nos contratos e testes de `tools/mcp/`, no serviço reutilizável
de descrição e nos pacotes oficiais dos Casos 1 e 2. O gate dedicado é
`npm run mcp:check`, acompanhado pelos gates completos do repositório.
