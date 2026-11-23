# Ponte com a mecatrônica: a ficha do braço e o pedido de prova

Evidência do plano da ponte com a mecatrônica, ativado em 2026-11-23. Os comandos são `npm run exportar:ficha -- braco-robotico` e `npm run conferir:pedido -- <pedido>`, e o módulo é `modulos/ficha-do-objeto/`.

## A ficha do braço

A ficha sai na versão 1.1 do contrato, com 39 peças (as 12 instâncias da montagem e as 27 peças da placa de controle, cada uma com nó próprio na malha), 7 conjuntos, 6 juntas e 161 portas elétricas. Duas exportações saem iguais byte a byte, e o `ponte:conferir` da mecatrônica, rodado numa cópia local do outro repositório, a aceita. Os 22 pinos do microcontrolador que nenhuma rede da lista de exemplo usa ficam fora da ficha, e o comando os lista.

Os eixos das juntas, medidos nas portas dos anéis: a cintura em torno de +y no ponto [0, 220, 0]; o ombro em +z por [0, 360, 153]; o cotovelo em -z por [0, 884, 133]; o punho 4 em +z por [443, 884, 108]; o punho 5 em -y por [443, 684, 200,5]; e o punho 6 em +z por [443, 591,5, 268,05]. O eixo do punho 4 aponta para a frente, paralelo ao ombro e ao cotovelo, e não ao longo do antebraço, que é o comum num braço de seis eixos; é o que a montagem aprovada tem, e fica para a pessoa olhar.

A massa sai da malha de cada peça com as densidades que a pessoa aceitou: o braço inteiro tem 47,0 kg, dos quais 13,4 na coluna e 13,5 no antebraço. A ficha convertida pelo `ponte:mjcf` de lá carregou no MuJoCo, instalado só para a prova e fora dos dois repositórios, com 47 corpos e 6 juntas; o torque de gravidade na pose de repouso é de 56,6 N·m no ombro e no cotovelo e zero nas outras juntas.

## O pedido de prova

[`pedido-de-prova.json`](pedido-de-prova.json) foi escrito à mão para o braço, com um item de cada tipo, e o `conferir:pedido` o responde assim: o espaço de 10 × 20 × 20 mm entre a placa e a parede da caixa lateral cabe; o de 30 mm no meio do corpo não cabe, porque o corpo da base é maciço; o driver da junta 1 está onde o pedido diz; o microcontrolador está 30 mm longe do ponto pedido; a saída de ar na face de fora da caixa não existe, porque a janela é fechada pela tampa de vidro; a passagem volta não cumprida, porque o Modelar não modela chicote; e as ligações cumprem, porque o cobre da placa foi traçado com a mesma lista de 47 redes. [`pedido-recusado.json`](pedido-recusado.json) cita uma peça que a ficha não tem e é recusado sem resposta, com o caminho do campo e o identificador.
