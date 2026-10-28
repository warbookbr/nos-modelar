/* cadeira_ripada_simples.receita.mjs — cadeira de madeira simples (4 pernas, assento, saia, 2 postes de encosto, travessa alta e baixa, 5 ripas), remodelada do zero em PASSOS.

   Quadro do núcleo: y para cima, z para a frente, x para a direita de quem olha a cadeira de frente. A frente da cadeira é +z; o encosto fica em -z.

   A TABELA está em milímetro e é a única fonte das medidas. derivar() transforma a tabela em caixas (mm), e gerarPassos() converte para metro e escreve os passos. Nenhuma posição é digitada no passo: cada encaixe vem de uma medida da tabela, e a simetria em x e em z sai da própria construção (um mesmo valor, com sinal oposto).

   Encaixes: a perna topa na face de baixo do assento (y 440); a saia cabe entre as pernas e encosta nelas por face, sem entrar; o poste assenta na face de cima do assento (y 490); a travessa baixa assenta sobre o poste, a alta fecha o topo; as ripas encostam na face de cima da travessa baixa (y 530) e na face de baixo da travessa alta (y 1020). */

export const PARAMS = {
  perna_lado: 55,
  perna_x_externo: 245,
  perna_z_frente: 260,
  perna_chanfro: 3,

  assento_meia_x: 255,
  assento_meia_z: 270,
  assento_espessura: 50,
  assento_chanfro: 8,

  saia_meia_x: 190,
  saia_meia_z: 250,
  saia_altura: 60,
  saia_chanfro: 5,

  poste_lado: 55,
  poste_x_externo: 245,
  poste_z_tras: -260,
  poste_topo: 1120,
  poste_chanfro: 3,

  travessa_meia_x: 190,
  travessa_z_tras: -260,
  travessa_profundidade: 30,
  travessa_baixa_altura: 40,
  travessa_alta_altura: 100,
  travessa_chanfro: 3,

  ripa_largura: 15,
  ripa_z_tras: -253,
  ripa_profundidade: 17,
  ripa_chanfro: 2,
  ripa_centros_x: [0, 60.5, 120.5],

  altura_do_assento: 440,
};

/* Caixas em milímetro: { nome, x0, x1, y0, y1, z0, z1, chanfro }. */
export function derivar(T) {
  const assentoY0 = T.altura_do_assento;
  const assentoY1 = assentoY0 + T.assento_espessura;

  const pernaX1 = T.perna_x_externo;
  const pernaX0 = pernaX1 - T.perna_lado;
  const pernaZ1 = T.perna_z_frente;
  const pernaZ0 = pernaZ1 - T.perna_lado;

  const posteX1 = T.poste_x_externo;
  const posteX0 = posteX1 - T.poste_lado;
  const posteZ0 = T.poste_z_tras;
  const posteZ1 = posteZ0 + T.poste_lado;
  const posteY0 = assentoY1;

  const travessaZ0 = T.travessa_z_tras;
  const travessaZ1 = travessaZ0 + T.travessa_profundidade;
  const travessaBaixaY0 = posteY0;
  const travessaBaixaY1 = travessaBaixaY0 + T.travessa_baixa_altura;
  const travessaAltaY1 = T.poste_topo;
  const travessaAltaY0 = travessaAltaY1 - T.travessa_alta_altura;

  const ripaZ0 = T.ripa_z_tras;
  const ripaZ1 = ripaZ0 + T.ripa_profundidade;
  const ripaY0 = travessaBaixaY1;
  const ripaY1 = travessaAltaY0;

  const caixas = [];

  /* pernas: x externo ±245 e interno ±190; z na frente +260..+205 e atrás -260..-205; y 0..440 */
  const ladoX = (lado) => (lado < 0 ? { x0: -pernaX1, x1: -pernaX0 } : { x0: pernaX0, x1: pernaX1 });
  const pernas = [
    ['perna_frente_esq', -1, pernaZ0, pernaZ1],
    ['perna_frente_dir', +1, pernaZ0, pernaZ1],
    ['perna_tras_esq', -1, -pernaZ1, -pernaZ0],
    ['perna_tras_dir', +1, -pernaZ1, -pernaZ0],
  ];
  for (const [nome, lado, z0, z1] of pernas) {
    caixas.push({ nome, ...ladoX(lado), y0: 0, y1: assentoY0, z0, z1, chanfro: T.perna_chanfro });
  }

  /* saia: entre as pernas, com as faces de x em ±190, que são as faces internas das pernas */
  caixas.push({
    nome: 'saia',
    x0: -T.saia_meia_x, x1: T.saia_meia_x,
    y0: assentoY0 - T.saia_altura, y1: assentoY0,
    z0: -T.saia_meia_z, z1: T.saia_meia_z,
    chanfro: T.saia_chanfro,
  });

  /* assento: balanço de 10 mm sobre as pernas em x e em z */
  caixas.push({
    nome: 'assento',
    x0: -T.assento_meia_x, x1: T.assento_meia_x,
    y0: assentoY0, y1: assentoY1,
    z0: -T.assento_meia_z, z1: T.assento_meia_z,
    chanfro: T.assento_chanfro,
  });

  /* postes: assentam na face de cima do assento, na seção das pernas de trás */
  for (const [nome, lado] of [['poste_esq', -1], ['poste_dir', +1]]) {
    const { x0, x1 } = lado < 0 ? { x0: -posteX1, x1: -posteX0 } : { x0: posteX0, x1: posteX1 };
    caixas.push({ nome, x0, x1, y0: posteY0, y1: T.poste_topo, z0: posteZ0, z1: posteZ1, chanfro: T.poste_chanfro });
  }

  /* travessas: entre os postes, com as faces internas em ±190 */
  caixas.push({
    nome: 'travessa_baixa',
    x0: -T.travessa_meia_x, x1: T.travessa_meia_x,
    y0: travessaBaixaY0, y1: travessaBaixaY1,
    z0: travessaZ0, z1: travessaZ1,
    chanfro: T.travessa_chanfro,
  });
  caixas.push({
    nome: 'travessa_alta',
    x0: -T.travessa_meia_x, x1: T.travessa_meia_x,
    y0: travessaAltaY0, y1: travessaAltaY1,
    z0: travessaZ0, z1: travessaZ1,
    chanfro: T.travessa_chanfro,
  });

  /* ripas: 5 peças de 15 mm, encostadas por baixo na travessa baixa e por cima na travessa alta */
  const [c3, c4, c5] = T.ripa_centros_x;
  const centros = [
    ['ripa_1', -c5], ['ripa_2', -c4], ['ripa_3', c3], ['ripa_4', c4], ['ripa_5', c5],
  ];
  const meia = T.ripa_largura / 2;
  for (const [nome, cx] of centros) {
    caixas.push({
      nome,
      x0: cx - meia, x1: cx + meia,
      y0: ripaY0, y1: ripaY1,
      z0: ripaZ0, z1: ripaZ1,
      chanfro: T.ripa_chanfro,
    });
  }

  return caixas;
}

const m = (mm) => mm / 1000;

/** Os PASSOS: uma caixa `chamferBox` por parte, em metro. `em` é o centro em x e z e a base em y. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((c, i) => {
    const id = i + 1;
    passos.push(['chamferBox', {
      origemId: id,
      larg: m(c.x1 - c.x0),
      alt: m(c.y1 - c.y0),
      prof: m(c.z1 - c.z0),
      chanfro: m(c.chanfro),
      em: [m((c.x0 + c.x1) / 2), m(c.y0), m((c.z0 + c.z1) / 2)],
    }]);
    passos.push(['parte', { nome: c.nome, sel: { origem: { op: 'chamferBox', id } } }]);
  });
  return passos;
}

export const PASSOS = gerarPassos(PARAMS);
