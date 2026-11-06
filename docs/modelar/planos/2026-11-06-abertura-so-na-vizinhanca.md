# Abertura só na vizinhança do vão — o corte de um vão na chapa sem refazer a chapa inteira

**Estado:** ativo

**Território:** `procedural/nucleo/operacoes/abertura-por-contorno.js`, `procedural/nucleo/operacoes/abertura-por-contorno.test.ts`, `tools/fixtures/aberturas-em-teste/`, `tools/modelar/acervo-real.test.mjs`

**Responsável:** Claude, com a pessoa aprovando por imagem qualquer peça cuja malha mude

**Repositório e base:** `warbookbr/nos-modelar`, main depois da rodada das portas traseiras rente às lanternas do [furgão realista](2026-10-30-furgao-realista.md), que vem antes deste na ordem escolhida pela pessoa em 2026-11-06

## Problema observado

Cada `aberturaPorContorno` entrega à booleana a chapa inteira e o prisma do contorno, e a booleana solda, confere e remonta as centenas de milhares de faces da chapa para tirar um vão que ocupa um canto dela. No furgão realista, em 2026-11-06, as sete aberturas (dois faróis, dois piscas, a grade e as duas lanternas) levaram 67 dos 99 s de uma execução da receita no perfil local, 41 deles em `nucleoBooleano`; o teste do acervo real mediu 305 s no CI contra o teto de 260, que subiu a 450, e a bancada leva uns 2 min para mostrar a peça, o que obrigou a opção `--prazo` na bancada e no pacote do crítico. Cada vão novo soma outra passada na chapa inteira. O item "Booleana de um vão sem percorrer a chapa inteira" do [backlog](BACKLOG.md) guarda as medidas.

## Resultado

O tempo de cada abertura passa a depender do tamanho da vizinhança do vão e não da chapa: as sete aberturas do furgão caem de 67 s para menos de 15 s na mesma máquina, a peça entra na bancada no prazo padrão de 90 s, e toda peça do acervo sai com a forma igual à de antes, conferida pelo retrato do acervo.

## Filtro Agent-First

USAR DIRETO a booleana existente, a limpeza da costura e o retrato do acervo (`tools/modelar/retrato-do-acervo.mjs --gravar/--comparar`) como régua de forma. REFATORAR só a entrada da booleana dentro de `aberturaPorContorno`: o que vai a ela é o trecho da chapa em volta do vão, e o resto da chapa fica intocado, com os mesmos ids. ENVOLVER nada. ADIAR a booleana genérica de vários vãos numa passada só e o custo do retrato da procedência (`retratarEntradas`, 15 s no mesmo perfil), que voltam ao backlog com a medida se este plano não os resolver de passagem.

## Incluído

- a medida de linha de base: tempo por abertura no furgão e nas peças de `tools/fixtures/aberturas-em-teste/`, e o retrato do acervo gravado antes de mudar;
- o recorte da vizinhança do vão na chapa, a booleana sobre ele e a costura de volta na chapa sem mudar os vértices da borda do recorte;
- a recusa com medida quando o vão passa da vizinhança recortada, em vez de corte errado;
- os testes das peças de teste das aberturas e um teste de tempo que pega a volta da regressão;
- o teto do furgão em `acervo-real.test.mjs` de volta perto do medido.

## Excluído

- mudar a receita do furgão ou de qualquer peça;
- mudar `procedural/nucleo/operacoes/booleanas.js`, que é território do [braço](2026-09-26-as-partes-do-braco.md) no arredondamento da costura; se a solução pedir mudança nele, para e pede à pessoa que mude um dos territórios;
- o custo do `descrever` e da medida de contato do furgão.

## Gate de saída

1. As sete aberturas do furgão somam menos de 15 s numa execução local, medidas pelo mesmo perfil de CPU da linha de base, e o furgão abre na bancada sem `--prazo`.
2. O retrato do acervo comparado antes e depois dá forma igual em todas as peças; se a triangulação de alguma peça mudar sem mudar a forma, a pessoa aprova a peça por imagem.
3. A execução continua determinística: duas execuções iguais no teste do acervo real.
4. As peças de teste das aberturas passam, com um caso novo de vão que cruza a borda da vizinhança.
5. `npm run gates` passa e o CI fica verde com o teto do furgão abaixo de 260 s.

## Fatias

1. Linha de base: o perfil por abertura no furgão e nas peças de teste, e o retrato do acervo gravado.
2. O recorte da vizinhança e a costura de volta, provados nas peças de teste.
3. O furgão e o acervo inteiro pela régua do retrato, com o tempo medido e o teto ajustado.
4. Fechamento: o item do backlog atualizado ou retirado e o registro deste plano.

## Riscos e parada

Para se a costura de volta mudar ids fora da vizinhança ou abrir a malha em alguma peça do acervo, e se o ganho medido na fatia 2 ficar abaixo de metade do tempo das aberturas: nesse caso a pessoa decide entre seguir pela booleana de vários vãos numa passada só ou encerrar o plano.

## Fechamento

A preencher ao concluir ou cancelar.
