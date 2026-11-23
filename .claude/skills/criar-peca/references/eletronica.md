# Placa de circuito e componentes eletrônicos

Uma placa de circuito com componentes vem da família `componente-eletronico`
(`procedural/familias/componente-eletronico/`). A receita declara a placa (id,
contorno, espessura, furos de fixação e a lista `pecas`, cada uma com `id` do
designador em minúsculas, `perfil` do encapsulamento, `posicao: [x, z]` em mm no
plano da placa, `giro` em graus em torno de +y, `lado` `cima` ou `baixo` e
`materiais` por elemento) e chama `placaDeclarada(declaracao, { base })`, que
devolve os passos, as peças com posição e orientação, os furos, as ilhas e os contatos. A placa é uma parte e cada componente
é outra, com a placa como pai, então a montagem e a ficha da ponte citam cada
peça pelo id. A pose da placa na peça hospedeira (`pose: { rotacoes, posicao }`)
leva a placa com os componentes ao referencial da peça. Os encapsulamentos
(resistor axial, eletrolítico, cerâmico de disco, LED de 3 e 5 mm, TO-220 com ou
sem dissipador, TO-92, DIP, SOIC, barra de pinos, borne, jack, módulo de placa)
têm medidas típicas declaradas como estimativa, com a fonte em `familia.json` e
`procedural/familias/componente-eletronico/geometria.js`; um componente de medida própria entra como parâmetro com faixa
da família, e não como forma feita à mão na receita. Exemplos executados: a placa
de prova (`procedural/familias/componente-eletronico/placa-de-prova.js`) e a placa de controle do braço robótico
(`procedural/pecas/braco-robotico/partes/base/receita.js`).

O cobre traçado entra pelo campo `cobre: { tracado, redes }` da placa declarada:
`redes` é a lista de ligações no formato do item `ligacoes` do pedido da ponte, e
`tracado` é o arquivo salvo que `node tools/modelar/tracar-placa.mjs` escreve a
partir da placa, da lista e das regras de `PLACA`. A placa recusa o traçado cuja
chave não é a das entradas de agora (trace de novo depois de mover componente) e o
que o conferidor de cobre recusa (rede aberta, curto, trilha estreita, cobre perto
da borda). `node tools/modelar/conferir-placa.mjs` dá o relatório e o mapa das
redes das duas faces para a pessoa aprovar. A netlist e o circuito são da
mecatrônica; a família só traça e confere o cobre que a lista pede.
