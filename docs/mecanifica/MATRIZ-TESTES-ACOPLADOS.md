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
| Publicação | `exportar-peca`, `exportar-gate`, `mcp/mcp` | dois artefatos atuais | R05 |
| Integridade | `freio-disco`, `roda-dianteira`, `jardineira`, `drone`, `flange`, `gabarito`, `prateleira`, `rasgo`, `tampa`, `vao`, `corrimao` | capacidade ou remoção | R06 |
| Arranjo | `arranjo-em-peca` | fixture neutra de `arranja` | R02 |
| Referência | `referencia-posicional`, `criar-aliases`, `oficina` | separar contratos das demos | R02 |
| Modelagem | `modelagem/revisao`, `modelagem/pacote` | pacote explícito | R04 |

Testes de montagem persistida usam fixtures próprias em
`tools/mecanifica/fixtures`; não são dependência das peças sem importar uma
receita de `prototipos/procedural/v3/pecas`.

## Regra de saída

Nenhuma migração pode ser cópia da mesma receita em outra pasta. Cada linha
vira prova menor da capacidade geral, fixture nomeada por capacidade ou remoção
explícita da afirmação de conteúdo.
