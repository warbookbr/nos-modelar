# Matriz de testes acoplados ao acervo

Esta matriz separa cobertura do motor de dependência acidental de receita.

## Critério

- **genérico**: receita inline ou fixture mínima de capacidade;
- **integração**: fixture privada explícita, fora do catálogo e do bundle;
- **conteúdo**: decisão de uma peça; sai com ela ou vira prova de capacidade;
- **publicação**: permanece enquanto consumidor e manifesto exigirem artefato.

## Estado atual

| Grupo | Testes | Tratamento | Estado |
|---|---|---|---|
| Serviço puro | `executar-receita.test.ts`, `catalogo-pecas.test.ts` | inline e catálogo vazio | migrado |
| Bancada visual | `guarda:camera`, `guarda:par`, `guarda:portas`, `porteiro` | harness privado | migrado |
| Publicação | `exportar-peca`, `mcp/mcp` | manifesto vazio e serviços explícitos | migrado |
| Revisão MCP | `mcp/ensaio-ponta-a-ponta` | peças privadas válidas, encaixe correto e caso desalinhado | migrado |
| Integridade | provas nomeadas do acervo | conteúdo removido; capacidades gerais preservadas | removido |
| Arranjo | `oficina/arranja-contrato`, `portas-espelho-arranja` | fixtures e contratos neutros | migrado |
| Referência | `referencia-posicional`, aliases e oficina | regra única e provas inline | migrado |
| Modelagem | serviços e contratos sob `tools/modelagem` | pacote explícito; provas de conteúdo removidas | migrado |

Testes de montagem persistida usam fixtures próprias em
`tools/mecanifica/fixtures`; não são dependência das peças sem importar uma
receita de `prototipos/procedural/v3/pecas`.

Os testes que só afirmavam contagem, aparência ou medidas de receitas removidas
foram apagados. O único teste condicional restante é a rodada visual real do
MCP, que depende de navegador/ambiente externo e não é um gate de catálogo.

## Regra de saída

Nenhuma migração pode ser cópia da mesma receita em outra pasta. Cada linha
vira prova menor da capacidade geral, fixture nomeada por capacidade ou remoção
explícita da afirmação de conteúdo.
