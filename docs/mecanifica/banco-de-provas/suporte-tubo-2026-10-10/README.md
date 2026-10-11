# Suporte de tubo sem identificador numérico

Prova do item 4 do gate de saída do [plano das ferramentas de
modelagem](../../planos/2026-10-07-as-ferramentas-de-modelagem.md): a
[receita](receita.js), escrita por um modelador em 2026-10-10 a partir do
[alvo](alvo.md), usa perfil com furo (`extrusao` com `furos` oblongos), contorno
por trechos com arco tangente e concordância, e seleção por propriedade
geométrica (`sel.onde`) para escolher faces e arestas, sem nenhum identificador
numérico de vértice, face ou aresta. A [composta](composta.png) mostra as quatro
vistas da bancada.

A peça não entrou no acervo por decisão da pessoa, porque a forma tem defeitos
que vêm do núcleo e não da receita: o `arredondarAresta` não arredonda o vértice
onde três arestas se encontram, e recusa a aresta da tampa de um perfil com furo,
que a triangulação deixa em leque. Para contornar isso, o modelador montou cada
aba como interseção do perfil com caixas arredondadas, o que deixou chanfros
grandes no topo da aba de parede e na junção das abas. A concordância do contorno
só liga dois retos, então o recorte do tubo tem trechos retos antes do arco. As
duas limitações do arredondamento ficam como tarefa da camada de features antes
de qualquer peça de chapa com furo, e o suporte é refeito depois dela.

O suporte foi refeito em 2026-10-11, sem a interseção com caixas, em
[`procedural/pecas/suporte-tubo/`](../../../../procedural/pecas/suporte-tubo/receita.js);
esta pasta fica como o registro da primeira versão.

A [composta](composta.png) desta pasta foi refeita em 2026-10-11 com a peça nova (as quatro vistas: isométrica, frontal, direita e superior), em que as duas bordas livres de cima da aba do tubo, as concordâncias e o recorte saem arredondados por uma `cadeia`, sem degrau. A [receita](receita.js) desta pasta continua sendo a da primeira versão.
