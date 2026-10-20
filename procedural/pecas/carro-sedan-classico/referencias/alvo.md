# Alvo: pacote B

Origem: modelo "pacote B", de autor B, publicado em repositório de modelos livres em endereço omitido, sob licença livre sem exigência de crédito. Pacote de origem: `pacote-b` da tabela `docs/mecanifica/veiculos-referencias.json`, com a malha `pacote-b.obj` (dois objetos: "Cylinder", as quatro rodas, e "Cube", a carroceria). A malha fica em `importados/veiculos-livres/pacote-b/pacote-b.obj`, ignorada pelo git, e não entra no repositório.

A pasta guarda `fonte-vistas.png` (isométrica frente-direita, lateral direita com a frente à esquerda, frontal e de cima com a frente embaixo) e `fonte-partes.json` (caixas e silhuetas em fatias, em metro, frente em +z, chão em y = 0, escala 4,4 m). A orientação foi conferida: frente em +z, à esquerda na lateral e embaixo na planta, sem giro. `vistas.png` e `vistas-textura.png` são da receita.

Técnica: carroceria de baixo, para-lamas, tomada de ar e cabine são interseções dos prismas do perfil lateral (x), da seção frontal (z) e da planta (y), com uma caixa de corte; os arcos das rodas são recortados no perfil lateral e fechados por caixas de roda; os vidros são placas de 12 mm por fora das faces da cabine, com moldura de 70 mm.

Desvios deliberados:

- A fonte é toda vermelha. A receita usa vidro escuro, pneu preto, aro cinza, faróis claros, grade e lanternas escuros, e a caixa de roda escura, para o carro ficar legível. O vidro escuro é a escolha recomendada para fonte monocromática e depende da pessoa.
- As lanternas de trás são suposição: a fonte não traz vista da traseira.

Diferenças que restam (folha comparativa na mesma câmera, `tmp/carro-sedan-classico/folha3/folha.png`, cópia em `tmp/carro-sedan-classico/lado-a-lado.png`):

- Isométrica: sobra 2,5% da área, na frente embaixo e no canto de trás; a fonte tem o bico inferior da frente levantado e a receita tem o para-choque reto.
- Lateral: sobra 1,5%, na rampa do capô e no fundo da carroceria entre z 414 e 646; a fonte tem o flanco ondulado.
- Frontal: sobra 0,13% e falta 0,15%; a seção coincide, só as pontas dos retrovisores diferem.
- De cima: sobra 0,8% nos cantos do para-choque da frente e falta 0,14% nos retrovisores; a fonte arredonda a frente em arco e a receita a chanfra.
- Não há na receita: o vinco de ombro arredondado do capô e do porta-malas, a borda do arco como friso próprio, os raios em relevo suave (a receita tem oito vazios no aro), a borda e a abertura escura da tomada de ar, e a coluna B como peça própria (ela aparece como a faixa da cabine entre as duas janelas).
- Os para-lamas terminam em cunha na frente das portas, onde a fonte tem uma rampa mais longa.
