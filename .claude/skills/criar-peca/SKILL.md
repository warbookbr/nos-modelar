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

1. Leia um exemplo próximo, começando por `pecas/_tampa-de-caixa.js`, e defina
   `PARAMS`, `TOPO`, `PASSOS` exportado e `construir = executar(...)`.
2. Escreva nomes semânticos (`origemId`, `ALIASES`, `parte`, `publicarPorta`)
   quando o contrato permitir. Não grave identidade por índice ou UUID.
3. Rode a descrição estrita e a bancada neutra. Esse é o laço oficial de
   inspeção visual:

   ```bash
   npm run descrever -- <peça> --estrito
   npm run bancada -- <peça> --vistas=isometrica,frontal,direita,superior
   ```

4. Leia as quatro imagens, registre pelo menos uma medida/gate e itere sobre
   defeitos concretos. A bancada confirma enquadramento; não decide sozinha se
   a forma atende ao briefing.
5. Rode `npm run criar -- minha-peca` para o estado do núcleo, manifesto,
   compatibilidade e gabarito, quando a peça tiver esses artefatos.

`npm run peca` e `porteiro` permanecem diagnósticos do visor v3. Não são
substitutos da descrição e das vistas da bancada. A peça mora em
`prototipos/procedural/v3/pecas/`; prefixo `_` indica exemplo/fixture.

## Contrato mínimo

Comece copiando `prototipos/procedural/v3/pecas/_modelo-procedural.js`. A peça precisa abrir com
o selo de peça de exemplo, byte a byte igual ao dele — toda peça daqui é
exemplo para provar capacidade do núcleo, nenhuma é referência de engenharia ou
base de produto. Peça sem selo, ou com selo reescrito, reprova em
`tools/bancadas/pecas-sao-exemplos.test.ts`. O texto longo está em
"Peças são exemplos" no `README.md`.

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
npm run gabarito:selecao:check
npm run id-cru:check
npm run guarda:portas
npm run guarda:camera
npm run guarda:par
npm run mapa:check
npm run docs:toc:check
npm run docs:links:check
npm run planos:check
npm run exportar:check
npm run criar -- _viga
```

O fluxo de commit e decisão segue `AGENTS.md` e `docs/mecanifica/INDEX.md`.
