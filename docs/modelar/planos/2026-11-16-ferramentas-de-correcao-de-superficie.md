# Ferramentas de correção de superfície: alisar as curvas pela medida, cortar com simetria e emendar com continuidade declarada, rumo ao G2 de produção

**Estado:** ativo

**Território:** `procedural/nucleo/gaiola-por-rede.js`, `procedural/nucleo/gaiola-por-rede-liso.js`, `procedural/nucleo/curva-da-gaiola.js`, `procedural/nucleo/operacoes/abertura-por-contorno.js`, `procedural/nucleo/subdivisao.js`, `procedural/nucleo/operacoes/subdivisao.js`, `procedural/nucleo/uso-operacoes.js`, `src/autoria/molduras-do-vao.js`, `procedural/nucleo/operacoes/friso.js`, `procedural/nucleo/operacoes/abertura-por-contorno-simetria.test.ts`, `procedural/nucleo/alisar-curvas.js`, `tools/fixtures/correcao-de-superficie/`, `docs/modelar/banco-de-provas/correcao-de-superficie-2026-11-16/`, e os testes desses arquivos.

Ativado pela pessoa em 2026-11-16, no lugar do plano do robô humanoide, que foi congelado. A lataria do carro não entra: ela é do plano do carro, que roda a rodada 3 com as ferramentas novas.

**Responsável:** a IA da sessão implementa e mede; a pessoa julga a forma por imagem e decide entre os caminhos do G2.

**Repositório e base:** `warbookbr/nos-modelar`, main na ativação.

Escrito em 2026-11-16 pelo gatilho do backlog ("logo depois da rodada 2 do quarto traseiro"), com a meta decidida pela pessoa no mesmo dia: superfície de produção, G2 com inspeção por reflexo, sem aceitar a subdivisão como teto.

## Problema observado

A rodada 2 do quarto traseiro (commit 8e085dcc, no ramo carro) levou a ondulação de 25 falhas e 1,40 mm para 11 e 0,79 mm, sem face fina, e o índice de suavidade da chapa de 406 para 349 1/m², mas a zebra ainda serpenteia na quina do degrau, na tampa e no canto de trás, e a pintura mostra a ondulação fina ao longo do degrau. O que o modelador mais ganhou foi aproximar as curvas por mínimos quadrados (`pesoDasCurvas`) e alisar à mão as tabelas lidas por pixel, isto é, alisar as curvas declaradas na receita, que a ferramenta não faz: `alisarMioloNaNormal` alisa só o miolo dos retalhos e mantém as curvas fixas. A rodada registrou mais dois limites da ferramenta. `aberturaPorContorno` não segue a `simetria: 'x'` da rede, e o vidro lateral e a lanterna saem só no lado +x; o `espelha` não resolve porque a costura da chapa simétrica tem metade dos vértices a menos de 1e-6 de x 0 sem ser 0 (repro em `tmp/carro-r2/repro-espelho.mjs`, no ramo carro). E nenhuma ferramenta controla a continuidade entre trechos: o vinco declarado é a única escolha, e a emenda suave sai como sair.

A pesquisa do mesmo dia (`modulos/pesquisa/novidades-2026-11/alisamento-de-superficie.md`) dá o caminho: a curva de variação mínima linearizada (Moreton e Séquin, 1992) é um sistema em banda pequeno que o gradiente conjugado do núcleo resolve, com os pontos duros como restrição e a silhueta como peso; e a subdivisão Catmull-Clark é C2 fora dos vértices extraordinários, mas só G1 neles, com curvatura que diverge, o que nenhum alisamento corrige.

## Resultado

Na peça de prova e depois na rodada 3 do quarto traseiro (pelo plano do carro): as curvas declaradas da gaiola são alisadas pela ferramenta, guiada pelo índice de suavidade e pelo pente, sem sair dos pontos duros nem da silhueta da prancha; os vãos por contorno saem nos dois lados da chapa simétrica; a emenda entre trechos declara G1 ou G2 e `npm run emendas` confere; e o relatório mede o G2 que a subdivisão alcança e, onde não alcança, a pessoa decide o caminho com a medida.

## Filtro Agent-First

Alisar as curvas declaradas: CRIAR no núcleo, como opção declarada da rede (`alisarCurvas: { energia, pontosDuros, silhueta, tolerancia }`) e como passo que a receita pode chamar, a curva de variação mínima linearizada sobre os pontos de cada curva antes de montar a gaiola, com os pontos duros fixos, a silhueta da prancha como peso ou limite, e o relatório do quanto cada ponto andou. A intenção do autor é "estas curvas, lisas, sem sair destes pontos e desta silhueta"; hoje ele faz isso à mão com médias gaussianas e pesos.

Corte com simetria: REFATORAR `aberturaPorContorno` para seguir a `simetria` declarada da chapa (o vão declarado num lado sai no outro), e a costura da subdivisão simétrica sair em x 0 exato, que é a causa de o `espelha` não soldar.

Emenda com continuidade declarada: CRIAR a declaração de G1 ou G2 na curva compartilhada por dois retalhos, aplicada como condição sobre as duas linhas de pontos da gaiola ao longo dela (plano tangente comum para G1, curvatura normal igual para G2), com os vértices extraordinários marcados como "no máximo G1" e `npm run emendas` como verificador. É proposta a validar em protótipo, como a pesquisa diz.

Caminho do G2 onde a subdivisão não alcança: MEDIR e depois a pessoa decide. Os candidatos, em ordem de custo: a posição dos vértices extraordinários fora das zonas de reflexo, a regra de face melhorada de 2021 (muda o primeiro refinamento), a subdivisão guiada (retalhos de grau 4 a 5) e uma superfície NURBS própria no núcleo para os painéis. Este plano não implementa nenhum deles além da medida e de um protótipo do mais barato; o escolhido vira plano próprio.

Resolver a gaiola inteira por energia (Halstead, Kass e DeRose, 1993): ADIAR, só se ainda sobrar ondulação medida depois do alisamento das curvas e das emendas.

## Incluído

- as chapas de prova em `tools/fixtures/correcao-de-superficie/`: uma rede com curvas digitadas com ruído conhecido, uma chapa simétrica com vão lateral, e duas chapas emendadas com G0, G1 e G2 declarados;
- o alisamento das curvas, com teste que mede o índice de suavidade e o pente antes e depois, e que os pontos duros e a silhueta ficam na tolerância;
- o corte com simetria e a costura em x 0 exato, com teste nas chapas de prova e no repro da rodada 2;
- a emenda com continuidade declarada, com `emendas` acusando G1 e G2 dentro do declarado fora dos vértices extraordinários;
- a medida do G2 que a subdivisão alcança nas chapas de prova e no quarto traseiro, por região, com os vértices extraordinários marcados, e o relatório dos caminhos com custo, para a pessoa decidir;
- a guarda das peças que usam `gaiolaPorRede` e `aberturaPorContorno` e o retrato do acervo, provando que nada muda sem a opção nova.

## Excluído

- a lataria do carro, que é do plano do carro;
- a superfície NURBS própria e a subdivisão guiada como implementação (só a medida e a decisão);
- o espelhamento de outras operações além do corte por contorno, salvo se a peça de prova pedir.

## Gate de saída

1. Na rede de prova com ruído, o alisamento tira mais de nove décimos do excesso do índice de suavidade sobre o controle sem ruído nos retalhos regulares, leva o desvio do pente ao controle a menos da metade e não cria salto que o controle não tenha, com os pontos duros fixos e o deslocamento dentro da tolerância declarada, por teste. Reescrito em 2026-11-16 na fatia 3: o índice bruto e a contagem de saltos não caem à metade onde vêm do preenchimento e do vértice extraordinário, que o controle sem ruído já tem.
2. Na chapa simétrica, o vão declarado num lado sai nos dois, com a malha fechada e a costura em x 0 exato, por teste; o repro da rodada 2 passa.
3. Nas chapas emendadas, `emendas` mede o ângulo e a razão de curvatura dentro do declarado (G1 abaixo de 0,5 grau; G2 com a razão abaixo de 1,2) fora dos vértices extraordinários, por teste.
4. O relatório do G2 alcançável, por região, nas chapas e no quarto traseiro, com a decisão da pessoa sobre o caminho escrita aqui.
5. O acervo idêntico sem as opções novas, pelo retrato, e as guardas das peças afetadas sem reprovação nova.
6. A nota de uso no catálogo e na skill de criar peça, e a revisão adversarial, por ser mudança de núcleo.

## Fatias

1. Feita: as chapas de prova e a linha de base medida (índice, pente, emendas, G2 por região), incluindo o quarto traseiro da rodada 2.
2. Feita: o corte com simetria e a costura em x 0 exato (opções `costuraExata` da subdivisão e `simetria` da abertura, sem mudar o acervo), que destrava a rodada 3 mais cedo.
3. Feita: o alisamento das curvas declaradas (`alisarCurvas` em `gaiolaPorRede`, energia pelo resíduo do ajuste polinomial local, com os pontos duros fixos, o deslocamento limitado por curva e aviso na curva que anda), depois de três revisões adversariais; o limite aceito é a feição na escala do espaçamento dos pontos e o canto a menos de 20 tolerâncias de outro ou da ponta, que arredondam até a tolerância e se resolvem com o ponto declarado como nó em `cantos`; achar o canto pela forma fica para a fatia 4.
4. Feita: a emenda com continuidade declarada (`continuidade: 'G1' | 'G2'` na curva da `gaiolaPorRede`): as curvas que atravessam a emenda se juntam no nó com a mesma tangente, a faixa de duas fileiras ganha a cota da curva, e o alisamento do miolo põe a tangente comum (G1, cada lado com a sua curvatura) ou a curvatura igual (G2); o item 3 do gate passa por teste (a G1 de 0,83 a 0,04 grau, a G2 de 0,39 a 0,03 com a razão 1). Limites medidos: a G2 sobre curvaturas diferentes muda a forma e não iguala a curvatura nas pontas, onde a curva que atravessa traz o salto nos pontos-chave; no quarto traseiro, declarada em todas as curvas lisas, a G1 solta saltos de curvatura que o alisamento de antes espalhava e a G2 muda a forma, e a declaração ali fica por curva, para a rodada 3 do plano do carro. Achar o canto pela forma, deixado pela fatia 3, não coube.
5. A medida do G2 alcançável e a decisão da pessoa sobre o caminho.
6. Revisão adversarial, documentação e fechamento.

## Riscos e parada

Se o alisamento das curvas tirar a forma da prancha além da tolerância em qualquer peça de prova, ele para e volta à pessoa com a medida. Se a costura em x 0 exato mudar a malha de alguma peça do acervo que usa simetria, a mudança vira opção e a peça antiga fica como está. Se a emenda G2 não convergir na gaiola de subdivisão, o plano registra o limite medido e leva a decisão do caminho do G2 para a fatia 5 mais cedo.

## Fechamento

A preencher.
