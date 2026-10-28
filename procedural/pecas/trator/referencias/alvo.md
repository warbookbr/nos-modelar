# trator — alvo

Origem: modelo "tractor" do pacote A, de autor A (endereço omitido), licença livre sem exigência de crédito. A malha original (`tractor.glb`) fica fora do repositório, em `importados/veiculos-livres/pacote-a/`. Aqui entram só as medidas (`fonte-partes.json`) e as vistas (`fonte-vistas.png`). O pacote está confirmado em `docs/modelar/veiculos-referencias.json`.

Escala: comprimento de 3886 mm (z -1943 a 1943), largura de 2368 mm (rodas traseiras), altura de 2828 mm. Frente em +z, conferida na lateral (frente à esquerda).

A fonte tem o capô laranja, a cabine cinza com teto saliente, rodas traseiras de 1856 mm e dianteiras de 1150 mm, para-lamas traseiros em setor de coroa (15 a 120 graus), para-lamas dianteiros de braço a 45 graus, pesos claros, escapamento à esquerda e tampa à direita. As partes saíram dos componentes da malha lidos em milímetro.

Diferenças contra a fonte, vistas na folha aberta:

- Isométrica e lateral: a fonte sombreia o capô em degradê de amarelo a laranja, e a receita usa laranja liso. A faixa de rodagem da fonte tem sulco sutil que a receita não tem. O cubo traseiro da receita é cônico e liso.
- Frontal: o chassi, o capô e a cabine coincidem. A fonte tem faces chanfradas na frente do capô (degraus ao redor da grelha) que a receita simplifica em fenda plana de 6 mm.
- De cima: coincide. O chanfro dos cantos de trás da cabine (171 mm) não foi modelado; a face de trás é plana e não aparece nas quatro vistas.
- Para-choque dianteiro: a base sobe de y 831 a 860 para não atravessar o pneu dianteiro, que na fonte o atravessa.
- Chassi e rodas: o miolo tem meia largura de 458 mm (a fonte usa 468 na frente) para a face de dentro das rodas encostar sem atravessar.
- Vidros: placas de 12 mm com 1 mm de encaixe no corpo, declaradas como contato, porque plano inclinado não fecha por vértice na malha em float32.
- A cabine é miolo mais asas recortadas pelo arco do para-lama traseiro, e na fonte o corpo é maciço sob o para-lama; o vão de 154 mm ao redor do pneu na frente do arco não aparece nas vistas.
