# Alvo: furgao-realista

## O alvo de medida

O alvo é a prancha ortográfica cotada `quatro-vistas.prancha.png`, aprovada pela pessoa em 2026-10-31, com a especificação em `quatro-vistas.prancha.mjs` e o relatório do motor em `quatro-vistas.prancha.relatorio.json`. Ela é derivada das medidas de classe do [alinhamento](../../../../docs/modelar/banco-de-provas/furgao-realista-2026-10-30/ALINHAMENTO.md): furgão médio de teto alto com 5.400 mm de comprimento, 2.000 mm de largura sem os retrovisores, 2.500 mm de altura, 3.300 mm entre os eixos, balanços de 980 mm na frente e 1.120 mm atrás, bitola de 1.700 mm, pneu 225/65 aro 16 com 710 mm de diâmetro e 225 mm de largura, arcos de raio 420 mm no centro da roda e soleira em 300 mm. Quando a prancha e o alinhamento divergem, o alinhamento e a `TABELA` da receita mandam. A silhueta lateral, frontal e de cima da peça se mede contra a da prancha, com 15 mm em média e 40 mm no pior ponto, pelo critério do alinhamento.

## A referência de caráter

O `fonte-vistas.png` são as vistas do `furgao` do acervo, de que esta peça nasceu como cópia. Valem só como caráter da forma, porque as medidas do `furgao` (rodas de 1.060 mm numa carroceria de 4.854 mm, cabine que afunila para o teto) deixaram de valer pelo alinhamento. A origem do `furgao` é o modelo "van" do pacote A, de autor A, com licença livre sem exigência de crédito; a malha não está no repositório, e as medidas tiradas dela ficam só no `furgao`, em `procedural/pecas/furgao/referencias/fonte-partes.json`.

## Na etapa 1

A receita entrega a lataria base, uma chapa contínua só com a silhueta da prancha, os arcos das quatro rodas e as quinas arredondadas, e quatro rodas provisórias em cilindro no tamanho do pneu da prancha. Ficam de fora, para as etapas seguintes, os vãos de janela, as frestas das portas, o vinco de cintura, as nervuras do teto e as abas dos arcos (etapa 2), o corpo de baixo e os para-choques (etapa 3), as rodas da família e o forro dos arcos (etapa 4), os vidros e o interior (etapa 5), as luzes e a grade (etapa 6) e o acabamento (etapa 7).

## O que não ficou igual à prancha

- O degrau do para-choque traseiro, que a prancha desenha horizontal em 570 mm, virou uma rampa de 20 mm de altura, porque cada anel da gaiola é uma fatia horizontal da carroceria.
- O raio da testa, cotado em 300 mm na especificação, sai com cerca de 200 mm no desenho, porque o filete da prancha fica limitado à metade do trecho antes dele; a receita segue o desenho.
- A chapa não passa exatamente pelos pontos da gaiola nos raios: onde ela é plana a superfície fica no plano desenhado, e nos raios fica alguns milímetros para dentro. A silhueta medida contra a prancha em 2026-10-31 dá, em média e no pior ponto, 1,0 e 7,2 mm na lateral, 0,2 e 11,3 mm na frontal e 0,4 e 7,2 mm de cima.
- O raio das quinas verticais da frente na planta só é cotado na prancha no nível do para-choque (280 mm) e na borda do teto (100 mm); entre os dois, na coluna do para-brisa, a receita fecha de 280 mm na boca do capô para 160 mm no pé do para-brisa e 120 mm no topo dele, por escolha desta etapa.
