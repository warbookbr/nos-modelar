# Importar objeto de código — um objeto descrito em OpenSCAD chega ao esboço e à receita por importação

**Estado:** concluído

**Responsável:** Claude, com a pessoa aprovando forma

**Repositório e base:** `warbookbr/nos-mecanifica`, ramo `claude/revisar-plano-ativo-cyj8c3`

## Problema observado

Cada peça do avião custou entre 400 mil e 1,5 milhão de tokens até o aceite. O motor custou cerca de 876 mil e a fuselagem cerca de 1,54 milhão
([plano do avião](2026-10-15-o-aviao-do-esboco-a-receita.md)), e a lista de objetos e famílias a modelar é longa. Dos 110 comandos que o
modelador dos trens principais rodou, uns 95 garimpavam medidas e pontos no JSON do esboço. A receita planejada gerada do esboço tirou esse
garimpo da receita, mas o esboço continua sendo desenhado à mão, unidade por unidade, pelo esbocista.

Há acervos grandes de objetos já descritos em código, como os arquivos OpenSCAD de licença aberta, que são árvores de primitivas, transformações
e booleanas. Se um deles chegar ao formato do esboço por um importador, o caminho que já existe, da receita planejada ao crítico, leva o objeto
à receita sem desenhá-lo do zero. A pessoa pediu, em 2026-10-15, que o objetivo seja agilizar e baratear a lista, e não comparar caminhos.

## Resultado

Um objeto descrito em OpenSCAD, de licença aberta e sem marca, chega a um `.esboco.json` pelo importador, com partes e relações nomeadas, e dele
à receita aprovada pela pessoa. O custo em tokens de cada etapa fica medido.

## Filtro Agent-First

- **OpenSCAD, para exportar a árvore `.csg`:** USAR DIRETO. A árvore exportada já é explícita: primitivas, matrizes e booleanas, sem laço nem
  função. O executável vem do apt ou do pacote WASM, e a ferramenta diz qual está em uso.
- **Importador de `.csg` para `.esboco.json`:** ENVOLVER, como comando do módulo do esboço. É determinístico e testável por fixture, e a saída
  passa pelas conferências do esboço que já existem.
- **Nomes de parte e relações:** ENVOLVER. O `.csg` perde os nomes de módulo, e quem nomeia é o esbocista sobre o esboço importado, com o
  custo medido à parte. Se o nome puder vir do `.scad` por comentário ou módulo, o importador o usa.
- **URDF, Infinigen e malhas:** ADIAR. O URDF fica para depois da prova, se a conta fechar. Infinigen depende do Blender, e malha não é
  receita.

## Incluído

- o importador `.csg` → `.esboco.json` (cubo, cilindro e cone, esfera, polígono, extrusão linear e rotacional, união, diferença,
  interseção, matriz), com teste em fixture sintética;
- um objeto-prova: o carrinho de mão, de um `.scad` com licença que permita guardar a fonte, registrada com o endereço;
  na fatia 1 não houve carrinho de licença aberta, e o objeto-prova foi um caminhão basculante de brinquedo; a fonte e os derivados
  saíram do repositório depois, e [`FONTE.md`](../../banco-de-provas/importar-objeto-2026-10-15/FONTE.md) registra o que houve;
- a nomeação das partes e relações sobre o esboço importado, a receita planejada gerada e o laço de modelagem até o aceite;
- a medição em tokens de cada etapa, ao lado do custo das peças do avião.

## Excluído

- importar malha de cascas coladas (STL, OBJ) ou cena do Blender; o STEP com sólidos separados entrou em 2026-10-16;
- arquivo de marca ou de licença que não permita guardar a fonte;
- corrigir a forma do `.scad` além do que a referência e a pessoa pedirem para o objeto-prova.

## Gate de saída

1. o importador converte a fixture sintética e o objeto-prova, de forma determinística, e as conferências do esboço passam;
2. o objeto-prova chega à receita com o `REFINA` passando e o crítico fechando, e a pessoa aprova a forma;
3. o custo de cada etapa (importar, nomear, revisar, receita) medido e comparado ao do caminho atual;
4. a decisão registrada: seguir para o URDF e para a lista, ajustar o importador, ou parar;
5. `npm run gates` verde.

## Fatias

1. **O importador e o esboço.** O `.csg` da fixture e o do carrinho viram `.esboco.json`. O esbocista nomeia partes e relações, e o
   crítico do esboço julga contra a referência. Corre em paralelo com a rodada de ajustes do avião, com um agente, por autorização da pessoa
   em 2026-10-15.
2. **Do esboço à receita.** A receita planejada gerada, o modelador e o crítico, até o aceite da pessoa, com o custo medido.
3. **A decisão.** Com os números, segue para o URDF e o braço robótico, ou o importador muda, ou o plano para.
4. **Fechamento.**

## Achados de 2026-10-16 e propostas à espera da pessoa

As [sondas de 2026-10-16](../../banco-de-provas/importar-objeto-2026-10-15/sondas-2026-10-16/SONDAS.md) e as pesquisas registradas na
[pesquisa aberta](../../PESQUISA-ABERTA-2026-10.md) mostraram que o código aberto se concentra em elementos de máquina e em bibliotecas
paramétricas, que objetos inteiros da lista quase não existem com licença aberta, e que o importador de `.csg` recusa construções comuns em
`.scad` reais. Três propostas esperam a decisão da pessoa antes de entrar no Incluído: corrigir o importador para `offset`, diferença 2D com
furo e `linear_extrude` com `scale`, consertar o `--conferir` que lança exceção, e provar o importador num conjunto pequeno de `.scad` reais
para que a recusa apareça num teste; transformar a sonda do STEP num importador que tome a maior face plana de cada sólido como perfil
extrudado; e traduzir uma amostra do BlendNet (Apache-2.0) em esboço, medindo quantos objetos saem certos.

A pessoa aprovou as três em 2026-10-16, e elas entram no Incluído: a correção do importador de `.csg` com o corpus real, o importador de
STEP por perfil extrudado, que tira a importação de STEP do Excluído, e a sonda do BlendNet. Importar STL de malha única continua excluído.

## Riscos e parada

Para e volta à pessoa se: importar e nomear custar mais da metade do caminho atual por objeto; os `.scad` de licença aberta para os objetos
da lista não tiverem forma que sirva à referência; ou o formato do esboço não expressar o que o `.csg` traz sem perder a forma.

## Fechamento

Concluído em 2026-10-16 por decisão da pessoa, sem a fatia 2. A pergunta do plano, se objetos descritos em código chegam ao esboço por
importação de forma barata, ficou respondida pelas sondas e pelos importadores, e a pessoa decidiu não seguir com a importação como caminho
principal da lista.

O que entrou no repositório: o importador de `.csg` do OpenSCAD, com `offset`, diferença 2D com furo, extrusão com `scale`, `hull` e
`minkowski` comuns, provado no teste pela fixture sintética escrita à mão (o corpus real de terceiros, com licença que exige crédito, e o objeto-prova de licença copyleft saíram do repositório depois, por decisão da pessoa); o importador de STEP de sólidos separados e o de STL por
peça, sobre a mesma classificação por malha (`tools/modelar/malha-para-esboco.mjs`), em que cada peça vira revolução, extrusão com
furos ou caixa, com nome e contatos; e as [sondas de 2026-10-16](../../banco-de-provas/importar-objeto-2026-10-15/sondas-2026-10-16/SONDAS.md),
com os scripts que as refazem.

O que se mediu, antes de o corpus sair do repositório: um quadro de drone saiu do `.scad` com 97 a 99,97% de fidelidade de volume por peça; o tradutor do BlendNet aceita 77,7% dos 12.059
scripts, a menos de 1 ms cada, e acerta 41 de 60 numa amostra conferida contra o Blender; uma mesa do Infinigen virou família com as
medidas da original por 250 a 300 mil tokens; o STEP e o STL de peças impressas saem exatos em peças limpas e só aproximados em peças com
chanfro, cavidade ou detalhe interno; e STL de malha única colada não se traduz. As pesquisas, em [pesquisa
aberta](../../PESQUISA-ABERTA-2026-10.md), mostraram que o código aberto se concentra em elementos de máquina, mecanismos e móveis
simples, e que os objetos grandes da lista (picape, empilhadeira, carrinho de mão, máquinas) não existem prontos com licença aberta.

Ficou de fora: a fatia 2, do esboço importado à receita aprovada, e a medida do custo de nomear partes; a família da mesa do Infinigen,
descartada porque a mesa deles é básica demais; o tradutor do BlendNet como ferramenta e o toro no esboço, que foram ao
[backlog](../BACKLOG.md). Os importadores continuam em uso para peças e objetos simples, quando ajudarem a modelar o próximo objeto da
lista.
