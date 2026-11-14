# Revisão das verificações e dos testes: o que cada um pega, medido

**Estado:** concluído

**Território:** `docs/modelar/banco-de-provas/revisao-das-verificacoes-2026-11-13/`

**Responsável:** a IA da sessão do furgão; a pessoa pediu o plano em 2026-11-13 e decide o que sai. Ativo desde 2026-11-13, na vaga que o plano de revisão do projeto deixou ao fechar; as medidas ficam em [`revisao-das-verificacoes-2026-11-13`](../banco-de-provas/revisao-das-verificacoes-2026-11-13/README.md).

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-13.

## Problema observado

O projeto tem 516 arquivos de teste e 28 gates. A [revisão do projeto](../banco-de-provas/revisao-do-projeto-2026-11-13/RELATORIO.md) só avaliou os que reprovaram numa semana. A pessoa perguntou: "Esses testes, eles ajudam em algo? Se eles não existissem, o que realmente aconteceria?". Não há número para responder. Um teste que passa sempre pode estar certo ou pode não conferir nada que importe, e de fora os dois são iguais. Há sinais dos dois lados: testes que conferem uma contagem exata que muda quando o acervo cresce, e tetos de tempo que reprovaram peça certa; e, do outro lado, a auditoria e a guarda que pegaram defeito real.

## Resultado

Cada gate e cada grupo de testes tem um veredito com número: protege, protege mas é frágil, ou não pega nada. A pessoa decide por grupo o que sai, o que se conserta e onde falta teste.

## Método

1. O mapa do que existe: cada gate e cada arquivo de teste com o que ele confere, em uma linha, agrupado por área (ferramentas de medida e vista, núcleo, montagem e bancada, módulos, organização e documentos).
2. A medida central, estragar o código de propósito. Em cada arquivo de código de uma amostra, uma alteração pequena por vez (trocar um sinal, um limite, devolver cedo, tirar uma linha), e rodam os testes ligados àquele arquivo. Sai, por teste, quantos estragos ele percebeu, e, por arquivo de código, quantos estragos ninguém percebeu. A amostra começa pelo núcleo e pelas ferramentas de medida, onde um erro silencioso custa mais.
3. Os sinais de fragilidade, por busca: teste que compara contagem exata do acervo, teste com teto de tempo, teste que depende de arquivo de uma peça específica, teste que só confere que não lançou erro.
4. O histórico: quais testes mudaram junto com código sem que houvesse defeito, pelo registro do git, como medida de quanto custam.

## Filtro Agent-First

USAR DIRETO: o vitest com o seletor de testes ligados ao que mudou (`tools/gates/seletor.mjs`), o registro de durações e o git. ADIAR: adotar uma biblioteca de mutação; o script de estragar código é de rascunho, fora do repositório, e só entra se a medida for repetida.

## Incluído

O mapa, a medida por estrago na amostra, os sinais de fragilidade, o veredito por grupo e a decisão da pessoa.

## Excluído

Apagar ou reescrever teste dentro deste plano; a execução sai em plano ou correção pontual depois da decisão. Mudar os tetos de tempo, que é do [plano das melhorias de processo](../decisoes/PLANOS-ENCERRADOS.md).

## Invariantes

Nenhum estrago de teste entra no repositório: a medida roda numa cópia de trabalho e é desfeita. Uma carga pesada por vez na máquina de quatro núcleos.

## Gate de saída

1. Todo gate e todo grupo de testes tem veredito com o número que o sustenta.
2. Nenhum teste é recomendado para sair sem a lista dos estragos que ele não percebeu e do que ele já pegou no histórico.
3. Os arquivos de código em que nenhum teste percebeu estrago estão listados como falta de proteção.
4. A decisão da pessoa está registrada por grupo.

## Riscos e parada

A medida por estrago é cara: cada estrago roda testes. Por isso é por amostra, e o tamanho da amostra é dito no resultado. Um estrago que não muda o comportamento conta como não percebido sem ser falha do teste: os não percebidos são lidos um a um antes de virar veredito. Se a amostra do núcleo passar de um dia de máquina, a medida para e o que foi medido é relatado com o alcance.

## Fechamento

Concluído em 2026-11-14. Entregou o mapa dos gates e testes, a medida por estrago (273 estragos, 147 percebidos, somado o piloto), os sinais de fragilidade, o histórico e o veredito por gate e grupo, em [`revisao-das-verificacoes-2026-11-13`](../banco-de-provas/revisao-das-verificacoes-2026-11-13/VEREDITOS.md). A pessoa seguiu a recomendação para todos os grupos: nenhum teste sai, e o que faltava virou o plano dos testes das recusas, concluído no mesmo dia.
