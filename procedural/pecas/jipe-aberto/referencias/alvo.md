# Alvo do jipe-aberto

Origem: modelo "Jipe" (Jipe.fbx) do pacote D, de autor D, publicado em repositório de modelos livres sob licença livre sem exigência de crédito, em endereço omitido. O pacote é o pacote-d, conforme docs/mecanifica/veiculos-referencias.json. A malha fica fora do repositório, em importados/veiculos-livres/pacote-d/Jipe.fbx, ignorada pelo git. Em referencias/ ficam fonte-vistas.png (quatro vistas ortográficas) e fonte-partes.json (caixa e silhuetas em fatias, em metro, com 3,9 m de comprimento). A frente da fonte está em +z, conferida na lateral (frente à esquerda) e na planta (frente embaixo), sem giro.

A caixa da receita é de 2586 por 1898 por 3900 mm, com diferença de 0 mm nos três eixos. As medidas da TABELA vêm dos vértices da malha, lidos fora do repositório: casco e capô de meia largura 1020, pneus de x 892 a 1258, faixas dos para-lamas até x 1293, arco de segurança em x 644 a 843.

Técnica: perfil lateral extrudado em x, em interseção com a planta (o casco recua a x 892 nos vãos das rodas, as faixas dos para-lamas afinam para trás e as barras do arco se afastam para fora) e com a seção frontal (o para-brisa afina de 1006 para 920 de meia largura). Sem subtração booleana e sem `unir`.

Diferenças contra a fonte, por vista, lidas na folha comparativa:

Lateral: a lanterna da fonte dobra a quina de trás e aparece também na lateral da traseira; na receita é uma placa só na face de trás. O pneu de trás da fonte fica 14 mm acima do chão e a receita o apoia no chão, como o da frente. O resto do contorno coincide (interseção sobre união de 0,984).

Frontal: a fonte tem o capô com 1006 de meia largura e a lateral baixa com 1020; a receita usa 1020 nos dois. A fonte tem o vidro cobrindo a laje inteira, e a receita deixa 55 mm de moldura verde em volta do vidro. Grade, faróis, para-choque e rodas coincidem (interseção sobre união de 0,998).

Topo: a fonte mostra uma faixa verde mais escura entre os dois bancos e na borda do painel atrás deles, que são tons de superfícies sem espessura; na receita essas faces têm a mesma cor. As barras inclinadas do arco seguem a planta da fonte com poucos milímetros de diferença no pé (interseção sobre união de 0,997).

Isométrica: a fonte tem superfícies finas (vidro em duas faces, paredes sem espessura); a receita fecha o capô, o casco e as paredes da caçamba como sólidos, e o vidro tem só a face da frente. O pé das barras do arco termina no topo da parede da caçamba (y 1316) e não afunda nela, como na fonte.

Desvios declarados: cada banco é um sólido em L (assento mais encosto inclinado), como na fonte. A fonte não tem retrovisores, e a receita também não. As rodas da frente tocam o capô por uma aresta do octógono em y 933, declarada em `contatos`.
