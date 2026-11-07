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

## Andamento

Fatia 1, a linha de base, medida em 2026-11-06 na máquina local, antes de mudar: o perfil de CPU da receita do furgão deu 84,4 s de execução (86,1 s de perfil), dos quais 50,9 s em `aberturaPorContorno` nas sete aberturas, 31,4 s dentro de `nucleoBooleano`, e 10,9 s em `retratarEntradas`; o teste do acervo real, para o furgão sozinho (duas execuções e a conta), levou 193,6 s. Na peça `chapa-grande` (250 mil faces, um vão) o passo do vão levou 34,4 s contra 3,6 s da subdivisão, com 3,5 GB de memória. O retrato do acervo foi gravado antes (56 peças, 98,6 s; o furgão com 210.020 faces).

Fatia 2, o recorte, feita em 2026-11-07. O caminho escolhido é recortar a vizinhança e fechá-la, e não cortar sem booleana no plano da vista: a booleana existente, a limpeza da costura e a lei de identidade ficam como estão e só mudam de entrada, enquanto cortar cada face no plano da vista pediria reescrever a política de pedaços, de ids e de vértices novos que a booleana já tem. `vizinhancaDoVao` toma as faces da chapa cuja caixa toca a do prisma do vão, mais as que dividem um vértice com elas (assim as faces da borda do recorte não tocam o prisma); `bandaDaVizinhanca` fecha o trecho com uma banda entre a volta de borda da pele de fora e a da de dentro; a booleana corta esse sólido fechado, e a banda sai da peça depois. A medida na fatia 2 mostrou que a booleana e a Manifold medem seus limiares (grade, solda dos vértices novos, piso de área, tolerância) na caixa dos sólidos que recebem: sem mais nada, a grade do furgão saía 5 mm diferente e a lente do farol 0,5% maior. Por isso o sólido recortado leva dois tetraedros pequenos, nos cantos da caixa da chapa inteira (`andaimeDaCaixa`), que só alargam a caixa e saem da peça com a banda; a lente recebe o mesmo andaime e a caixa da chapa. O recorte recusa-se, e a booleana vê a chapa inteira como antes, quando a borda do trecho não é de duas voltas (o vão junto da borda da chapa, onde as peles se juntam, e a lente de um farol que recebe o pisca), quando o trecho passa de metade das faces e quando a banda sai torcida. O registro de cada abertura ganhou `vizinhanca` (`recortada`, `faces`, `daChapa` e, na recusa, o `motivo`), e `limpeza.finasRestantes` passa a contar as faces finas do trecho cortado e da lente, e não as da chapa inteira, que incluíam faces finas de antes do vão. Na chapa grande o passo do vão caiu de 34,4 s para 4,3 a 4,6 s e a memória de 3,5 para 1,8 GB; na cúpula de 60 mil faces do teste novo (`vizinhanca.test.ts`) o vão leva 1,6 s contra 0,85 s da subdivisão.

Fatia 3, o furgão e o acervo, em 2026-11-07. As sete aberturas do furgão caíram de 50,9 s para 3,7 s no mesmo perfil (cinco recortam a vizinhança de 340 a 930 faces das 101 mil da chapa; os dois piscas, que cortam a lente do farol, de 263 faces, a veem inteira), a execução de 84,4 s para 30 s, e o teste do acervo real, para o furgão, de 193,6 s para 86,1 s; o teto dele voltou de 450 s para 230 s (1,7 vez os 136 s que o CI deve medir, pela razão de 305 s no CI para 193,6 s locais) e o prazo do teste de 600 s para 400 s. A bancada abriu o furgão sem `--prazo` (1 min 41 s do comando inteiro, com o servidor, o navegador e a captura). O retrato do acervo comparado com o de antes dá 55 peças iguais; o furgão não: tem 209.983 faces em vez de 210.020, e três de suas partes mudaram de forma muito pouco, sem mudar de caixa: a carroceria (volume +5,2e-5 em relação, +0,32 cm³; 100.259 faces em vez de 100.260), o farol esquerdo (−2,6e-4; 926 faces em vez de 938) e a lanterna direita (+1,9e-5; 1.707 faces em vez de 1.731). A causa está medida: a booleana devolve os mesmos vértices novos na mesma posição, mas numerados em outra ordem, porque a Manifold ordena a saída pela malha que recebe, e a limpeza da costura desempata fusões por id, de modo que uma fusão a mais ou a menos, de uns décimos de milímetro, muda a triangulação ao lado do vão. O gate 2 pede que a pessoa aprove o furgão por imagem.

## Fechamento

A preencher ao concluir ou cancelar.
