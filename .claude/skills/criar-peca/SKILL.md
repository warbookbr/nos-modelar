---
name: criar-peca
description: Criar ou refinar uma peça 3D procedural da Mecanifica como IA, escrevendo PASSOS e provando o resultado na bancada neutra com medidas, vistas e crítica objetiva.
---

# Criar peça

Esta skill diz como escrever UMA receita. Um objeto de várias partes é
construído parte por parte pelo laço, em
[`../laco-de-modelagem/SKILL.md`](../laco-de-modelagem/SKILL.md), sobre uma
montagem que deriva medida e posição de cada parte das vizinhas. O porquê de
cada regra abaixo está em [`references/por-que.md`](references/por-que.md), para
consultar quando uma regra parecer arbitrária.

Depois de mudar silhueta, encontro, corte, união ou arredondamento, e antes de declarar pronto ou pedir o aceite, faça o passo de
[`PARE-E-ANALISE.md`](../../../docs/mecanifica/usar/PARE-E-ANALISE.md) (`olhar-bancada --analise`) e abra as imagens.


## Antes do primeiro passo

1. A peça nova passa pela rodada de alinhamento,
   [`../alinhar-modelagem/SKILL.md`](../alinhar-modelagem/SKILL.md), e só então
   tem `PLANO`.
2. A peça é uma pasta: `procedural/pecas/<peça>/receita.js`, com `referencias/`
   e `rodadas/` ao lado. A parte de um objeto de várias partes mora em
   `procedural/pecas/<objeto>/partes/<parte>/`, com a montagem na pasta do
   objeto, e os comandos a chamam por `<objeto>/<parte>`.
3. A receita segue a cadeia do contrato
   [`AUTORIA-DE-PECA.md`](../../../docs/mecanifica/usar/AUTORIA-DE-PECA.md):
   `TABELA` em milímetros exportada como `PARAMS`, `derivar()` que converte
   para metro, `gerarPassos()` que escreve os passos, e
   `get PASSOS() { return gerarPassos(this.PARAMS); }`. Nenhuma posição é
   digitada no passo; `npm run parametros -- <peça>` diz quais parâmetros
   estão ligados.
4. Toda operação usada vem do
   [catálogo gerado](../../../docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md),
   lida por `descrever_capacidade` no MCP procedural. Receita antiga não é
   molde: o acervo hoje não tem receita, e a peça de prova em
   `tools/fixtures/acervo/peca-de-prova/` é ferramenta de teste, não exemplo de
   forma.

## Identidade

Nomes semânticos sempre: `origemId`, `ALIASES`, `parte`, `publicarPorta`.
Identidade persistida nunca é índice nem posição de passo. `sel:{alias:...}` é
nome de seleção, não nome de parte.

<!-- operacoes-com-origem: arranja, arredondarAresta, arredondarCostura, chamferBox, cilindro, cone, cubo, esfera, espelha, extrusao, filete, furo, inflate, intersectar, lathe, loft, plano, subtrair, unir -->

As operações que publicam `origem` aceitam endereçamento estrutural conforme
[`references/operacoes-procedurais.md`](references/operacoes-procedurais.md),
que é consulta, e não leitura de partida.

**ID LITERAL:** `moveV`, `moveF`, `moveA`, `vira`, `extruda`, `mescla` e
`pesar` não aceitam `sel`; `sel` não é atalho e deve falhar de forma explícita.
Escolher uma delas é assumir dívida posicional, e ela é relatada. Para
identidade estável, prefira uma primitiva com `origemId` seguida de
`transladar`, `rotaciona` ou `espelha`.

`apagaFace` é a exceção importante: aceita `sel: {...}`, exige exatamente uma
face e é a forma semântica de abrir um vão.

## Orientação

Rotação usa a regra destrógira medida pelo núcleo. Com pivô em `[0,0,0]`:

| eixo | `graus` | leva | para |
|---|---:|---|---|
| `x` | `+90` | `+Y` | `+Z` |
| `x` | `-90` | `+Y` | `-Z` |
| `y` | `+90` | `+X` | `-Z` |
| `y` | `-90` | `+X` | `+Z` |
| `z` | `+90` | `+Y` | `-X` |
| `z` | `-90` | `+Y` | `+X` |

`cilindro`, `cone` e `lathe` nascem em torno de Y; para o eixo X, prefira
`eixo:'x'` no gerador. O pivô padrão é o centroide da seleção. No `loft`,
`orientacao` diz para onde aponta o `+u` de cada seção, e não o eixo do
caminho: confira frente, lateral e superior, porque trocar `u` e `w` preserva
uma vista e estraga as outras.

## Duas armadilhas de código

`PASSOS` é getter. Para testar outro valor, copie a receita por descritores
(`Object.defineProperties({}, Object.getOwnPropertyDescriptors(receita))`) e só
então troque `PARAMS`; `{...receita}` avalia o getter com a tabela velha e o
número novo não tem efeito.

`meta.colisao`, `colisaoDe` e `solido` são compatibilidade opcionais para
consumidores v3, e não requisito. Quando a peça exporta `ALIASES`, eles vão para
`colisaoDe` e para `executar`.

## Ver e medir

A bancada é o laço oficial de inspeção, e sai sem interface por padrão:

```bash
npm run descrever -- <peça>
npm run bancada -- <peça> --vistas=isometrica,frontal,direita,superior --cores
```

Cada imagem responde uma pergunta: `--modo=isolar` para a superfície,
`--modo=contexto` para caber e encaixar, `--par a,b` para uma junta, e todas as
partes para a leitura geral, que você não decide sozinho. A bancada serve para
investigar; o pacote que vai ao crítico sai de `npm run vistas:critica`.
`npm run malha:conferir -- <peça>` pega fechamento e face de área nula, e
`npm run conferir:referencia` mede a borda da peça contra a foto quando não há
prancha.

Foto de produto de terceiro nunca entra no repositório; entra a prancha
desenhada com `desenhar-prancha` ou as coordenadas derivadas dela.

`npm run peca` e `porteiro` permanecem diagnósticos do visor legado; não
substituem a descrição nem as vistas da bancada.

O laço visual (olhar o PNG, sobrepor ao alvo, despachar o crítico sem contexto)
mora em [`LACO-VISUAL.md`](../../../docs/mecanifica/usar/LACO-VISUAL.md).

## Consulta

Documentos para quando a tarefa pedir, e não para ler de partida:
[`GUIA-AUTORIA-IA.md`](../../../docs/mecanifica/usar/GUIA-AUTORIA-IA.md), a
anatomia da receita e a esteira de comandos;
[`GOTCHAS-AUTORIA-VISUAL.md`](../../../docs/mecanifica/usar/GOTCHAS-AUTORIA-VISUAL.md),
o que já falhou ao gerar forma;
[`INTENCAO-PECA-V1.md`](../../../docs/mecanifica/usar/INTENCAO-PECA-V1.md), o
contrato opcional `INTENCAO` para quando a função não é óbvia pela geometria;
[`AUTORIA-RECEITA-DECLARATIVA.md`](../../../docs/mecanifica/usar/AUTORIA-RECEITA-DECLARATIVA.md),
a receita como dado JSON, usada pela autoria por MCP; e
[`CONFERIR-CONTRA-REFERENCIA.md`](../../../docs/mecanifica/usar/CONFERIR-CONTRA-REFERENCIA.md),
o desvio medido entre a borda da peça e a foto. Para curva bilateral contínua,
`criarCaminhoSimetrico()` em `src/autoria/caminho-simetrico.js` garante a
simetria sem fresta nas pontas.

## Entrega

A peça nova tem cabeçalho no primeiro comentário, porque `mapa:check` o exige.
Antes de publicar, `npm run gates`, que roda todos e relata todos; enquanto
conserta um gate, `npm run gates -- --parar-no-primeiro`.
