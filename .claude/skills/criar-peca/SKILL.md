---
name: criar-peca
description: Criar ou refinar uma peça 3D procedural da Mecanifica como IA, escrevendo PASSOS e provando o resultado na bancada neutra com medidas, vistas e crítica objetiva.
---

# Criar peça

Use esta skill quando o alvo for uma peça geométrica editável. Se o alvo for
uma árvore de composição, relações entre peças ou revalidação de conjunto,
use também `../auditar-montagem/SKILL.md`; não transforme uma montagem em uma
receita monolítica.

## Caminho curto

1. Descubra capacidades no [catálogo gerado](../../../docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md)
   ou, pelo MCP procedural, em `mecanifica://procedural/catalogo` e
   `mecanifica://procedural/schemas`. Busque, descreva e combine/valide a
   cadeia antes de definir o alvo, `PARAMS`, `TOPO` e `PASSOS`; não replique
   tabelas por regex nem invente uma operação ausente.
2. Escreva nomes semânticos (`origemId`, `ALIASES`, `parte`, `publicarPorta`)
   quando o contrato permitir. Não grave identidade por índice ou UUID.
3. Rode a descrição estrita e obtenha vistas por uma bancada/harness privado
   explicitamente configurado. Esse é o laço oficial de inspeção visual:

   ```bash
   npm run descrever -- <peça> --estrito
   npm run bancada -- <peça> --vistas=isometrica,frontal,direita,superior
   ```

   O catálogo homologado da bancada publicada pode estar vazio; isso não
   publica uma receita privada. Se a peça ainda não estiver num catálogo ou
   harness autorizado, use o pacote de modelagem (`preparar:modelagem`,
   `validar:modelagem`, `revisar:modelagem`) ou o perfil MCP de autoria, e
   registre a captura como bloqueada até existir um adaptador privado explícito.

4. Leia as quatro imagens, registre pelo menos uma medida/gate e itere sobre
   defeitos concretos. A bancada confirma enquadramento; não decide sozinha se
   a forma atende ao briefing.
5. Rode `npm run criar -- minha-peca` para o estado do núcleo, manifesto,
   compatibilidade e gabarito, quando a receita local e esses artefatos forem
   autorizados. Esse visor legado é diagnóstico; não transforma a peça em
   entrada publicada.

`npm run peca` e `porteiro` permanecem diagnósticos do visor v3. Não são
substitutos da descrição e das vistas da bancada. A peça mora em
`prototipos/procedural/v3/pecas/`; prefixo `_` indica exemplo/fixture.

O catálogo público de peças está vazio de propósito: receitas anteriores não
são modelos homologados. Não cite nem tente copiar nomes históricos. Só crie
uma receita quando houver alvo e pacote de modelagem autorizados; o catálogo de
**capacidades** do motor continua disponível mesmo sem nenhuma peça publicada.

Quando uma capacidade faltar, consulte primeiro `buscar_capacidades`,
`descrever_capacidade`, `combinar_capacidades`, `validar_composicao` e
`analisar_lacuna` pela descoberta procedural. Só depois diagnostique uma
extensão; nunca instale código ou esconda JavaScript na receita.

## Contrato mínimo

Não existe modelo de receita no acervo atual e não se deve recriar uma cópia
histórica. Para uma receita nova, use o contrato declarativo em
`docs/mecanifica/AUTORIA-RECEITA-DECLARATIVA.md`, declare que ela é exemplo e
não referência de engenharia, e registre o pacote que autorizou a modelagem.

`PARAMS` guarda dimensões; `TOPO` guarda decisões que podem reconstruir a
topologia; `PASSOS` é a lista `[['op', {...}], ...]`. Não escreva `id:` em um
passo: o núcleo calcula o bloco pela posição (`BLOCO=1000`). `origemId` é uma
identidade estrutural diferente e pode ser escolhida pelo autor.

Números precisam ser finitos e pontos precisam ter exatamente `[x,y,z]`.
`NaN`, `Infinity` e aridade errada devem lançar erro. Determinismo exige
semente explícita; nunca use `Date.now()` ou `Math.random()` cru.

`meta.colisao`, `colisaoDe` e `solido` são compatibilidade opcionais para
consumidores v3, não requisitos universais da bancada atual. Quando a peça
exportar `ALIASES`, encaminhe-os tanto a `colisaoDe` quanto a `executar`; caso
contrário, as citações podem virar órfãs mesmo quando a definição está correta.

## Seleção e operações

A referência completa de operações, argumentos e armadilhas está em
[`references/operacoes-procedurais.md`](references/operacoes-procedurais.md).
Leia-a quando precisar escolher uma operação ou depurar uma seleção; não
carregue a tabela inteira para uma tarefa simples.

<!-- operacoes-com-origem: arranja, arredondarAresta, chamferBox, cilindro, cone, cubo, esfera, espelha, filete, furo, inflate, lathe, loft, plano -->

As operações que publicam `origem` aceitam endereçamento estrutural conforme a
referência. `sel:{alias:...}` é nome de seleção, não nome de parte. Alias não
encadeia, é resolvido no momento da citação e falha de forma total; componha
listas de origens em JavaScript quando necessário.

As operações `moveV`, `moveF`, `moveA`, `vira`, `extruda`, `mescla` e `pesar`
continuam endereçadas por ID literal. Escolher uma delas é assumir essa dívida
posicional e ela deve ser relatada:

**ID LITERAL:** `moveV`, `moveF`, `moveA`, `vira`, `extruda`, `mescla` e
`pesar` não aceitam `sel`; `sel` não é atalho e deve falhar de forma explícita.
Para identidade estável, prefira uma primitiva com
`origemId` seguida de `transladar`, `rotaciona`, `espelha` ou outra operação
semântica documentada.

`apagaFace` é a exceção importante: aceita `sel: {...}`, exige exatamente uma face e é
a forma semântica de abrir um vão. Não misture `face` e `sel` no mesmo passo.

## Orientação e casos recorrentes

Rotação usa a regra destrógira medida pelo núcleo. Com pivô explícito em
`[0,0,0]`, a tabela abaixo é a referência rápida:

| eixo | `graus` | leva | para |
|---|---:|---|---|
| `x` | `+90` | `+Y` | `+Z` |
| `x` | `-90` | `+Y` | `-Z` |
| `y` | `+90` | `+X` | `-Z` |
| `y` | `-90` | `+X` | `+Z` |
| `z` | `+90` | `+Y` | `-X` |
| `z` | `-90` | `+Y` | `+X` |

Primitivas de revolução nascem em torno de Y. Para pôr disco, cubo ou pistão
no eixo X, use `rotaciona z -90` com pivô explícito; o pivô padrão é o
centroide da seleção e pode girar a peça no próprio lugar.

Prefira `PASSOS` para peças determinísticas e editáveis. Use `construir(ctx)`
com `ctx.{TS,tex,geo,m4}` apenas quando o vocabulário não cobrir a forma e
registre essa lacuna como evidência para uma futura operação.

## Entrega e gates

Peça nova precisa de cabeçalho no primeiro comentário, pois `mapa:check` o
exige. Para uma iteração local, execute descrição, bancada e `criar`. Antes de
publicar uma mudança, use os gates aplicáveis do índice:

```bash
npm test
npm run typecheck
npm run build
npm run porteiro
npm run guarda:portas
npm run guarda:camera
npm run guarda:par
npm run mapa:check
npm run docs:toc:check
npm run docs:links:check
npm run planos:check
npm run exportar:check
npm run catalogo:check
npm run mcp:check
```

O fluxo de commit e decisão segue `AGENTS.md` e `docs/mecanifica/INDEX.md`.
