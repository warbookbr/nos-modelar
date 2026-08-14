# Relatório — experimento de autoria geométrica do zero

**Data:** 2026-08-14
**Decisão:** `corrigir`

## Evidência

Três receitas confinadas criaram suporte de eixo, eixo-guia e anel-tampa, sem
órfãos. A montagem v3 satisfez `encaixaCilindrico`, `assentaAnular` e
`mantemSeparacaoDirecional`. As vistas isométrica e direita mostraram as três
instâncias, com enquadramento válido e sem corte.

Ao aumentar o fim do eixo de 0,015 m para 0,035 m, somente
`ombroAntesDaTampa` falhou: separação −0,010 m diante do mínimo de 0,005 m.
Encaixe e assento continuaram válidos. A relação mede fronteira declarada, não
colisão geral.

## Resultado Agent-First

- **USAR DIRETO:** receita confinada, portas, relações v2/v3, montagem e vistas.
- **ENVOLVER:** impacto local e revalidação assistida.
- **REFATORAR:** autoria de receita com proposta, confirmação e publicação.
- **ADIAR:** novas relações, solver, mapa global, materiais e catálogo público.

## Limite que impede aprovação

O perfil MCP `autoria` materializa somente `montagem.json`. O erro é uma mudança
de `PARAMS`/`PASSOS` da receita `eixo-guia`; a porta não pode aplicá-la. Publicar
uma montagem já corrigida seria prova falsa de autoria geométrica. O catálogo
temporário confirmou que a fronteira é de contrato, não de localização.

## Próximo recorte recomendado

Abrir plano separado de autoria segura de receitas: proposta de bytes, execução
isolada, descrição estrita, vistas, confirmação, revisão imutável e revalidação
das montagens explicitamente catalogadas. Não ampliar o MCP de montagem por atalho.
