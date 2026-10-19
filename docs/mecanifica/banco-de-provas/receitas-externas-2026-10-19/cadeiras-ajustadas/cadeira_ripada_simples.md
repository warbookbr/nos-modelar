# cadeira_ripada_simples: ajustes de construção

Folhas: `cadeira_ripada_simples-antes.png` (conversão com alinhamento, sem ajustes) e `cadeira_ripada_simples-depois.png` (com `cadeira_ripada_simples.ajustes.json`). Medidas em milímetro, na tabela de peças da folha. Este relato não aprova a forma; quem julga é a pessoa.

| Defeito | Decisão | Evidência | Ajuste |
|---|---|---|---|
| D1: ripa_3 com 16 mm, as outras com 15 mm | corrigido | ripa_3 x -8..8; as demais 15 mm; centros em ±120,5, ±60,5 e 0 | ripa_3 x min -7,5 e max 7,5 |
| D1b: ponta amarela e filete ciano no canto da frente do assento | falso alarme | pes_x x 190..245, z 205..260 e saia_base x ±235, z ±250 estão dentro da pegada do assento (x ±255, z ±270) e abaixo de y 490; a vista superior não mostra nenhuma delas. O desenho da ponta vem da ordem de pintura das faces e continua na folha depois | nenhum |
| D1c: face de trás das ripas 7 mm recuada das travessas | falso alarme (intencional) | ripas z -253..-230, travessas z -260..-230; o recuo é maior que 5 mm e a face da frente coincide (-230, já alinhada pelo degrau) | nenhum |
| Ponto da pessoa: topo da perna com o assento nos cantos | corrigido | pernas da frente com topo em 450 e traseiras em 480 (o alinhamento as subiu até a base do poste), contra a face de baixo do assento em 440: entravam 10 e 40 mm. Embutidos antes: 10, depois: 4 | topo das quatro pernas em y 440 |
| Ponto da pessoa: base do poste | corrigido | poste y 480..1120 começava 10 mm dentro do assento (440..490) | base dos dois postes em y 490, apoiada no assento |
| Ponto da pessoa: topo das ripas junto ao poste | já resolvido | ripas y 530..1020 encostam na face de baixo da travessa_alta (1020..1120) e as faces da frente coincidem em z -230 (o alinhamento moveu de -236 para -230). A travessa fica 25 mm atrás da face da frente do poste (z -230 contra -205), de propósito | nenhum |

## Conferência

Passantes: 0 antes e 0 depois. Embutidos: 10 antes (perna/assento 4, perna/saia 4, poste/assento 2) e 4 depois (as quatro pernas dentro de saia_base, 45 mm, que é o bloco sob o assento que a receita desenha entre as pernas e recuado 10 mm das faces externas delas). Caixa envolvente total antes e depois: x ±255, y 0..1120, z ±270, sem mudança.

## O que ficou como está

Preservado: proporção, altura do assento (440..490), balanço de 10 mm do assento sobre as pernas, saia_base maciça de 60 mm, recuo das ripas e da travessa alta, simetria esquerda e direita (todos os pares espelham em x e z). Não tratável: o desenho das pontas nos cantos da folha é efeito do ordenamento por profundidade da ferramenta de vistas, sem correspondência na geometria.
