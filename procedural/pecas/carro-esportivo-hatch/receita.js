/* carro-esportivo-hatch — hatch esportivo estilizado, verde, baixo e comprido, com capô em rampa, teto reto até um aerofólio
 * cinza na ponta do teto, traseira em rampa sem vidro, saias laterais verde claras entre as rodas, para-lamas cinza em arco
 * saliente e rodas grandes de pneu escuro com aro cinza.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "hatchback-sports" do pacote A, de autor A (autor A,
 * endereço omitido, endereço da página: endereço omitido), licença livre sem exigência de crédito ( declarada no
 * License.txt do pacote). A malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/hatchback-sports.glb,
 * que o git ignora. O que entra aqui são as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765) e as vistas
 * (referencias/fonte-vistas.png). O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do carro em +z, x para a direita de quem olha de frente, centrado
 * em x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve, por parte,
 * a forma, a `parte` e o `material`. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita: a carroceria, a cabine, o aerofólio e as placas de vidro e de luz são a INTERSEÇÃO de prismas das vistas
 * (o perfil lateral extrudado em x, a seção frontal extrudada em z e, no para-choque, a planta extrudada em y). Assim a cabine
 * afunila para o teto, o para-brisa e os vidros laterais seguem esse plano, e as partes se encontram em faces do mesmo plano, sem
 * booleana. Os arcos de roda são recortados no próprio perfil lateral (carroceria, caixa de roda e para-lama usam o mesmo arco),
 * então nenhuma subtração corta a malha. As rodas são cilindros de eixo x.
 *
 * Simplificações em relação à fonte, também em referencias/alvo.md: o pneu sai liso, sem chanfro nem cubo; o fundo do carro entre
 * as rodas fica aberto como na fonte; o vidro dos retrovisores e o recorte das placas não existem; a traseira da fonte não tem vidro,
 * e a receita também não.
 */

export const TABELA = {
  lados: 32,

  // carroceria de baixo: de y 883 à cintura (y 1412), com meia-largura 971; o capô desce em rampa da cintura ao nariz
  corpo_meia_largura: 971,
  corpo_base_y: 883,
  cintura_y: 1412,
  nariz_z: 2339,
  nariz_topo_y: 1059,
  para_brisa_base_z: 1055,
  traseira_z: -2250,

  // cabine: do plano da cintura ao teto, afunilando de 971 a 794 de meia-largura; o teto é plano de z 349 a -1249 e a traseira desce em rampa
  teto_y: 1942,
  teto_meia_largura: 794,
  teto_frente_z: 349,
  teto_tras_z: -1249,

  // aerofólio cinza: a cunha sobre a rampa da traseira, de z -1249 a -1602, com a face de trás vertical
  aerofolio_tras_z: -1602,

  // vidros azul claros: placas de 12 mm sobre os planos da cabine
  vidro_espessura: 12,
  para_brisa_topo_z: 632,
  para_brisa_recuo_x: 180,
  friso_topo_z: 490,
  vidro_lateral_frente_z: 771,
  vidro_lateral_topo_frente_z: 288,
  vidro_lateral_tras_z: -626,
  vidro_lateral_topo_y: 1774,

  // lanternas vermelhas: placas de 6 mm sobre a rampa da traseira, nos cantos de baixo
  lanterna_espessura: 6,
  lanterna_x0: 767,
  lanterna_z_topo: -1938,
  lanterna_folga: 10,

  // rodas: centro em x 750, pneu de 1059 mm de diâmetro e 618 mm de largura; o aro sai 30 mm da face de fora
  roda_x: 750,
  roda_largura: 618,
  roda_raio: 530,
  roda_z_frente: 1474,
  roda_z_tras: -1385,
  aro_raio: 330,
  aro_espessura: 30,

  // arco da roda: o vão recortado no perfil tem 545 mm de raio (15 mm de folga em volta do pneu); o para-lama é um anel de 688 mm de raio
  // externo, de x 971 a 1147, cortado em y 530, na altura do eixo
  passagem_raio: 545,
  para_lama_raio: 688,
  para_lama_base_y: 530,
  para_lama_x1: 1147,
  arco_lados: 12,

  // saia lateral verde clara entre os para-lamas: perfil (x, y) de x 853 a 1147, de y 353 a 883, com o canto de cima chanfrado
  saia_x0: 853,
  saia_base_y: 353,
  saia_chanfro_x: 1059,
  saia_chanfro_y: 795,
  saia_encaixe: 0.001,

  // para-choques cinza: o da frente de z 2162 a 2427 e y 353 a 883; o de trás de z -2427 a -2100 e y 530 a 883, com os cantos da planta cortados
  para_choque_frente_z0: 2162,
  para_choque_frente_z1: 2427,
  para_choque_frente_y0: 353,
  para_choque_frente_y1: 706,
  para_choque_frente_degrau_z: 2280,
  para_choque_tras_z0: -2100,
  para_choque_tras_z1: -2427,
  para_choque_tras_y0: 530,
  para_choque_tras_y1: 706,
  para_choque_tras_degrau_z: -2309,
  para_choque_meia_largura: 1147,
  para_choque_canto_x: 1096,
  para_choque_canto_z: 2375,
  para_choque_frente_x: 971,

  // placas claras: a da frente de y 265 a 574 saindo 88 mm do para-choque; a de trás de y 442 a 750
  placa_meia_largura: 309,
  placa_frente_y0: 265,
  placa_frente_y1: 574,
  placa_tras_y0: 442,
  placa_tras_y1: 750,
  placa_prof: 88,

  // faróis amarelos nos cantos da face da frente do nariz
  farol_x0: 618,
  farol_y0: 883,
  farol_y1: 1059,
  farol_espessura: 6,

  // retrovisores verdes: caixas de 176 mm que saem da lateral da carroceria, ao lado do pé do para-brisa
  retrovisor_x1: 1147,
  retrovisor_y0: 1236,
  retrovisor_z0: 879,
  retrovisor_z1: 1055,
};

/* O núcleo gira a extrusão de eixo x de y para x, então o [u, v] vai para y = -u e z = v; o de eixo z leva [u, v] a x = u e y = -v;
 * o de eixo y leva [u, v] a x = u e z = v. Cada perfil entra na ordem natural do eixo e sai com o sentido anti-horário. */
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
const paraUV = {
  x: (zy) => zy.map(([z, y]) => [-y, z]),
  z: (xy) => xy.map(([x, y]) => [x, -y]),
  y: (xz) => xz,
};
const perfilDoEixo = (eixo, pontos) => antihorario(paraUV[eixo](pontos));
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];

/* Retas da cabine, todas calculadas da TABELA. */
const xDaCabine = (T, y) => T.corpo_meia_largura - ((T.corpo_meia_largura - T.teto_meia_largura) * (y - T.cintura_y)) / (T.teto_y - T.cintura_y);
const yDaFrente = (T, z) => T.cintura_y + ((T.para_brisa_base_z - z) * (T.teto_y - T.cintura_y)) / (T.para_brisa_base_z - T.teto_frente_z);
const yDaTraseira = (T, z) => T.cintura_y + ((z - T.traseira_z) * (T.teto_y - T.cintura_y)) / (T.teto_tras_z - T.traseira_z);
const yDoCapo = (T, z) => T.cintura_y + ((z - T.para_brisa_base_z) * (T.nariz_topo_y - T.cintura_y)) / (T.nariz_z - T.para_brisa_base_z);

/* Arco de raio r em volta do eixo (zc, yc), da ponta de z maior à de z menor passando por cima, cortado na linha yBase. */
function arco(zc, yc, r, yBase, n) {
  const fi0 = Math.asin((yBase - yc) / r);
  const pts = [];
  for (let k = 0; k <= n; k += 1) {
    const fi = fi0 + ((Math.PI - 2 * fi0) * k) / n;
    pts.push([zc + r * Math.cos(fi), yc + r * Math.sin(fi)]);
  }
  return pts;
}

/* Prismas das vistas, em milímetro: `eixo` e os pontos na ordem natural do eixo. */
const prismaX = (T, pontos, meia = T.para_choque_meia_largura + 100) => ({ eixo: 'x', pontos, altura: 2 * meia, em: [-meia, 0, 0] });
const prismaZ = (T, pontos) => ({ eixo: 'z', pontos, altura: T.comprimento_prisma, em: [0, 0, -T.comprimento_prisma / 2] });

/* Caixas, perfis e cilindros em milímetro. Cada forma tem `nome`, `forma` (cubo, extrusao, cilindro ou vistas), `material` e as medidas
 * da forma, com `em` em milímetro. Todo número aqui sai da tabela. */
export function derivar(T) {
  const P = { ...T, comprimento_prisma: 2 * (T.para_choque_tras_z1 * -1 + 200) };
  const M = T.corpo_meia_largura;
  const rodas = [];
  for (const s of [1, -1]) {
    for (const [ponta, zc] of [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]]) {
      rodas.push({ s, lado: s > 0 ? 'Dir' : 'Esq', ponta, zc });
    }
  }
  const xDentro = T.roda_x - T.roda_largura / 2;
  const xFora = T.roda_x + T.roda_largura / 2;
  const yRoda = T.roda_raio;
  const arcoCorpo = (zc) => arco(zc, yRoda, T.passagem_raio, T.corpo_base_y, T.arco_lados);
  const formas = [];

  /* carroceria: perfil lateral com o capô em rampa, o tampo na cintura e os dois arcos de roda recortados na borda de baixo */
  formas.push({
    nome: 'carroceria', forma: 'extrusao', material: 'verde', eixo: 'x', altura: 2 * M, em: [-M, 0, 0],
    pontos: [
      [T.traseira_z, T.cintura_y], [T.para_brisa_base_z, T.cintura_y], [T.nariz_z, T.nariz_topo_y], [T.nariz_z, T.corpo_base_y],
      ...arcoCorpo(T.roda_z_frente), ...arcoCorpo(T.roda_z_tras), [T.traseira_z, T.corpo_base_y],
    ],
  });

  /* cabine: perfil lateral (para-brisa, teto, rampa da traseira) cruzado com a seção frontal que afunila de 971 a 794 */
  const secaoCabine = espelhar([[M, T.cintura_y], [T.teto_meia_largura, T.teto_y]]);
  const lateralCabine = [
    [T.para_brisa_base_z, T.cintura_y], [T.teto_frente_z, T.teto_y], [T.teto_tras_z, T.teto_y], [T.traseira_z, T.cintura_y],
  ];
  formas.push({
    nome: 'cabine', forma: 'vistas', material: 'verde',
    prismas: [prismaX(T, lateralCabine), prismaZ(P, secaoCabine)],
  });

  /* aerofólio: a cunha entre o teto reto e a face vertical de trás, sobre a rampa da traseira, com a mesma seção da cabine */
  const yAero = yDaTraseira(T, T.aerofolio_tras_z);
  formas.push({
    nome: 'aerofolio', forma: 'vistas', material: 'cinza',
    prismas: [
      prismaX(T, [[T.teto_tras_z, T.teto_y], [T.aerofolio_tras_z, T.teto_y], [T.aerofolio_tras_z, yAero]]),
      prismaZ(P, secaoCabine),
    ],
  });

  /* placa sobre o plano inclinado da frente da cabine, de z `zA` a `zB` (zA > zB); o recuo em x dá a moldura de 180 mm */
  const placaNaFrente = (nome, material, zA, zB) => {
    const t = T.vidro_espessura;
    const yA = zA === T.para_brisa_base_z ? T.cintura_y : yDaFrente(T, zA);
    const yB = yDaFrente(T, zB);
    const yBase = zA === T.para_brisa_base_z ? yDoCapo(T, zA + t) : yA;
    const lateral = [[zA, yA], [zB, yB], [zB + t, yB], [zA + t, yBase]];
    const y0 = T.cintura_y - 50;
    const y1 = T.teto_y;
    const w = (y) => xDaCabine(T, y) - T.para_brisa_recuo_x;
    return { nome, forma: 'vistas', material, prismas: [prismaX(T, lateral), prismaZ(P, espelhar([[w(y0), y0], [w(y1), y1]]))] };
  };
  formas.push(placaNaFrente('parabrisa', 'vidro', T.para_brisa_base_z, T.para_brisa_topo_z));
  formas.push(placaNaFrente('frisoParabrisa', 'cinza', T.para_brisa_topo_z, T.friso_topo_z));

  /* vidros laterais: tira de 12 mm sobre o plano inclinado da lateral da cabine, cortada pelo trapézio da janela */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const yb = T.cintura_y;
    const yt = T.vidro_lateral_topo_y;
    const tira = [[xDaCabine(T, yb), yb], [xDaCabine(T, yt), yt], [xDaCabine(T, yt) + T.vidro_espessura, yt], [xDaCabine(T, yb) + T.vidro_espessura, yb]];
    formas.push({
      nome: `vidroLateral${lado}`, forma: 'vistas', material: 'vidro',
      prismas: [
        prismaX(T, [[T.vidro_lateral_frente_z, yb], [T.vidro_lateral_topo_frente_z, yt], [T.vidro_lateral_tras_z, yt], [T.vidro_lateral_tras_z, yb]]),
        prismaZ(P, tira.map(([x, y]) => [s * x, y])),
      ],
    });
  }

  /* lanternas: placas de 6 mm sobre a rampa da traseira, do canto de baixo, cruzando a rampa com a faixa em x até o plano da lateral */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const t = T.lanterna_espessura;
    const yTopo = yDaTraseira(T, T.lanterna_z_topo);
    const f = T.lanterna_folga;
    const y0 = T.cintura_y - f;
    const y1 = yTopo + t + f;
    const faixa = [[T.lanterna_x0, y0], [xDaCabine(T, y0), y0], [xDaCabine(T, y1), y1], [T.lanterna_x0, y1]];
    formas.push({
      nome: `lanterna${lado}`, forma: 'vistas', material: 'vermelho',
      prismas: [
        prismaX(T, [[T.traseira_z, T.cintura_y], [T.lanterna_z_topo, yTopo], [T.lanterna_z_topo, yTopo + t], [T.traseira_z, T.cintura_y + t]]),
        prismaZ(P, faixa.map(([x, y]) => [s * x, y])),
      ],
    });
  }

  /* saias laterais: perfil (x, y) extrudado em z, de uma ponta de para-lama à outra */
  const anelFora = (zc) => arco(zc, yRoda, T.para_lama_raio, T.para_lama_base_y, T.arco_lados * 2);
  const zSaia1 = Math.min(...anelFora(T.roda_z_frente).map(([z]) => z)) + T.saia_encaixe;
  const zSaia0 = Math.max(...anelFora(T.roda_z_tras).map(([z]) => z)) - T.saia_encaixe;
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `saia${lado}`, forma: 'extrusao', material: 'verdeClaro', eixo: 'z', altura: zSaia1 - zSaia0, em: [0, 0, zSaia0],
      pontos: [
        [T.saia_x0, T.saia_base_y], [T.para_lama_x1, T.saia_base_y], [T.para_lama_x1, T.saia_chanfro_y],
        [T.saia_chanfro_x, T.corpo_base_y], [T.saia_x0, T.corpo_base_y],
      ].map(([x, y]) => [s * x, y]),
    });
  }

  /* para-lamas: anel de 688 mm de raio externo e o raio do vão por dentro, de x 971 a 1147, cortado em y 530 */
  const larguraPL = T.para_lama_x1 - M;
  for (const r of rodas) {
    const fora = anelFora(r.zc);
    const dentro = arco(r.zc, yRoda, T.passagem_raio, T.para_lama_base_y, T.arco_lados * 2).reverse();
    /* a perna que desce até a base da saia fica do lado do centro do carro: atrás da roda da frente, na frente da roda de trás */
    const perna = r.ponta === 'Frente' ? -1 : 1;
    const pontos = perna < 0
      ? [...fora, [fora[fora.length - 1][0], T.saia_base_y], [dentro[0][0], T.saia_base_y], ...dentro]
      : [[fora[0][0], T.saia_base_y], ...fora, ...dentro, [dentro[dentro.length - 1][0], T.saia_base_y]];
    formas.push({
      nome: `paraLama${r.ponta}${r.lado}`, forma: 'extrusao', material: 'cinza', eixo: 'x', altura: larguraPL,
      em: [r.s > 0 ? M : -T.para_lama_x1, 0, 0], pontos,
    });
  }

  /* caixas de roda: o mesmo arco da carroceria, fechado na borda de baixo, entre as faces de dentro dos dois pneus */
  for (const [ponta, zc] of [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]]) {
    formas.push({
      nome: `caixaRoda${ponta}`, forma: 'extrusao', material: 'cinzaEscuro', eixo: 'x', altura: 2 * xDentro, em: [-xDentro, 0, 0],
      pontos: arcoCorpo(zc),
    });
  }

  /* para-choques: perfil lateral cruzado com a planta de cantos cortados */
  const plantaFrente = [
    [-T.para_choque_meia_largura, T.para_choque_frente_z0 - 150], [T.para_choque_meia_largura, T.para_choque_frente_z0 - 150],
    [T.para_choque_meia_largura, T.para_choque_frente_z0], [T.para_choque_canto_x, T.para_choque_canto_z],
    [T.para_choque_frente_x, T.para_choque_frente_z1], [-T.para_choque_frente_x, T.para_choque_frente_z1],
    [-T.para_choque_canto_x, T.para_choque_canto_z], [-T.para_choque_meia_largura, T.para_choque_frente_z0],
  ];
  const plantaTras = [
    [-T.para_choque_meia_largura, T.para_choque_tras_z0], [T.para_choque_meia_largura, T.para_choque_tras_z0],
    [T.para_choque_meia_largura, T.traseira_z], [T.para_choque_canto_x, -T.para_choque_canto_z],
    [T.para_choque_frente_x, T.para_choque_tras_z1], [-T.para_choque_frente_x, T.para_choque_tras_z1],
    [-T.para_choque_canto_x, -T.para_choque_canto_z], [-T.para_choque_meia_largura, T.traseira_z],
  ];
  const caixaY = { eixo: 'y', altura: 1000, em: [0, 0, 0] };
  formas.push({
    nome: 'paraChoqueFrente', forma: 'vistas', material: 'cinza',
    prismas: [
      prismaX(T, [
        [T.para_choque_frente_z0, T.para_choque_frente_y0], [T.para_choque_frente_z1, T.para_choque_frente_y0],
        [T.para_choque_frente_z1, T.para_choque_frente_y1], [T.para_choque_frente_degrau_z, T.para_choque_frente_y1], [T.nariz_z, T.corpo_base_y], [T.para_choque_frente_z0, T.corpo_base_y],
      ]),
      { ...caixaY, pontos: plantaFrente },
    ],
  });
  formas.push({
    nome: 'paraChoqueTras', forma: 'vistas', material: 'cinza',
    prismas: [
      prismaX(T, [
        [T.para_choque_tras_z0, T.para_choque_tras_y0], [T.para_choque_tras_z1, T.para_choque_tras_y0],
        [T.para_choque_tras_z1, T.para_choque_tras_y1], [T.para_choque_tras_degrau_z, T.para_choque_tras_y1],
        [T.traseira_z, T.corpo_base_y], [T.para_choque_tras_z0, T.corpo_base_y],
      ]),
      { ...caixaY, pontos: plantaTras },
    ],
  });

  /* placas: caixas claras que saem do para-choque */
  formas.push({
    nome: 'placaFrente', forma: 'cubo', material: 'cinzaClaro', larg: 2 * T.placa_meia_largura,
    alt: T.placa_frente_y1 - T.placa_frente_y0, prof: T.placa_prof,
    em: [0, T.placa_frente_y0, T.para_choque_frente_z1 + T.placa_prof / 2],
  });
  formas.push({
    nome: 'placaTras', forma: 'cubo', material: 'cinzaClaro', larg: 2 * T.placa_meia_largura,
    alt: T.placa_tras_y1 - T.placa_tras_y0, prof: T.placa_prof,
    em: [0, T.placa_tras_y0, T.para_choque_tras_z1 - T.placa_prof / 2],
  });

  /* faróis: placas amarelas na face da frente do nariz, entre y 883 e 1059 */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `farol${lado}`, forma: 'cubo', material: 'amarelo', larg: M - T.farol_x0, alt: T.farol_y1 - T.farol_y0, prof: T.farol_espessura,
      em: [(s * (T.farol_x0 + M)) / 2, T.farol_y0, T.nariz_z + T.farol_espessura / 2],
    });
  }

  /* retrovisores: caixas verdes ao lado do pé do para-brisa */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const larg = T.retrovisor_x1 - M;
    formas.push({
      nome: `retrovisor${lado}`, forma: 'cubo', material: 'verde', larg, alt: T.cintura_y - T.retrovisor_y0,
      prof: T.retrovisor_z1 - T.retrovisor_z0,
      em: [s * (M + larg / 2), T.retrovisor_y0, (T.retrovisor_z0 + T.retrovisor_z1) / 2],
    });
  }

  /* pneus e aros: cilindros de eixo x com o pé no chão */
  for (const r of rodas) {
    formas.push({
      nome: `roda${r.ponta}${r.lado}`, forma: 'cilindro', material: 'pneu', raio: yRoda, altura: T.roda_largura, lados: T.lados,
      em: [r.s * T.roda_x - T.roda_largura / 2, yRoda, r.zc],
    });
  }
  for (const r of rodas) {
    formas.push({
      nome: `aro${r.ponta}${r.lado}`, forma: 'cilindro', material: 'aro', raio: T.aro_raio, altura: T.aro_espessura, lados: T.lados,
      em: [r.s > 0 ? xFora : -(xFora + T.aro_espessura), yRoda, r.zc],
    });
  }

  return formas;
}

const m = (mm) => mm / 1000;
const emM = (em) => em.map((v) => m(v));

/* Passos de criação de uma forma com o `origemId` dado; devolve os passos e a seleção da forma pronta. */
function passosDaForma(f, base) {
  if (f.forma === 'cubo') {
    return { passos: [['cubo', { origemId: base, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: emM(f.em) }]], sel: { origem: { op: 'cubo', id: base } } };
  }
  if (f.forma === 'cilindro') {
    return {
      passos: [['cilindro', { origemId: base, raio: m(f.raio), altura: m(f.altura), lados: f.lados, eixo: 'x', em: emM(f.em) }]],
      sel: { alias: `${f.nome}Inteiro` },
    };
  }
  const extrusao = (id, p) => ['extrusao', {
    origemId: id, eixo: p.eixo, altura: m(p.altura), em: emM(p.em),
    perfil: perfilDoEixo(p.eixo, p.pontos).map(([u, v]) => [m(u), m(v)]),
  }];
  if (f.forma === 'extrusao') {
    return { passos: [extrusao(base, f)], sel: { origem: { op: 'extrusao', id: base } } };
  }
  const passos = f.prismas.map((p, j) => extrusao(base + 1 + j, p));
  passos.push(['intersectar', { origemId: base + 50, solidos: f.prismas.map((_, j) => ({ origem: { op: 'extrusao', id: base + 1 + j } })) }]);
  return { passos, sel: { origem: { op: 'intersectar', id: base + 50 } } };
}

const cilindroInteiro = (id) => ({
  unir: [
    { origem: { op: 'cilindro', id } },
    { origem: { op: 'cilindro', id, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id, tampa: 'topo' } },
  ],
});

/* Os ids de bloco: a forma `k` leva 100 * (k + 1), os prismas e a interseção levam os 50 seguintes. */
export const ALIASES = derivar(TABELA).flatMap((f, k) => (f.forma === 'cilindro' ? [[`${f.nome}Inteiro`, cilindroInteiro(100 * (k + 1))]] : []));

/** Os PASSOS: cada forma com a `parte` e o `material` logo depois. */
export function gerarPassos(T) {
  const passos = [];
  derivar(T).forEach((f, k) => {
    const base = 100 * (k + 1);
    const { passos: ps, sel } = passosDaForma(f, base);
    passos.push(...ps);
    passos.push(['parte', { nome: f.nome, sel }]);
    passos.push(['material', { sel, usa: f.material }]);
  });
  return passos;
}

/* Os contatos: cada par se toca pela face indicada no motivo. As medidas são as da TABELA, em milímetro. */
const lados = ['Dir', 'Esq'];
const pontas = ['Frente', 'Tras'];
export const CONTATOS = [
  { par: ['carroceria', 'cabine'], motivo: 'a face de baixo da cabine, em y 1412, assenta no tampo da carroceria, que sai do mesmo plano da cintura' },
  { par: ['cabine', 'aerofolio'], motivo: 'a face de baixo da cunha do aerofólio assenta na rampa da traseira da cabine, no mesmo plano inclinado' },
  { par: ['cabine', 'parabrisa'], motivo: 'a face de dentro do para-brisa encosta no plano inclinado da frente da cabine, sem folga' },
  { par: ['carroceria', 'parabrisa'], motivo: 'a aresta de baixo do para-brisa assenta sobre o capô, na linha em que a cabine começa em z 1055' },
  { par: ['cabine', 'frisoParabrisa'], motivo: 'a face de dentro do friso encosta no plano inclinado da frente da cabine, sem folga' },
  { par: ['parabrisa', 'frisoParabrisa'], motivo: 'o friso continua o para-brisa para cima, na face horizontal em z 632 do plano inclinado' },
  ...lados.map((l) => ({ par: ['cabine', `vidroLateral${l}`], motivo: `a face de dentro do vidro lateral ${l === 'Dir' ? 'direito' : 'esquerdo'} encosta no plano inclinado da lateral da cabine` })),
  ...lados.map((l) => ({ par: ['cabine', `lanterna${l}`], motivo: `a face de baixo da lanterna ${l === 'Dir' ? 'direita' : 'esquerda'} assenta na rampa da traseira da cabine` })),
  ...lados.map((l) => ({ par: ['carroceria', `saia${l}`], motivo: 'a face de cima da saia, em y 883, encosta na face de baixo da carroceria' })),
  ...lados.flatMap((l) => pontas.map((p) => ({ par: ['carroceria', `paraLama${p}${l}`], motivo: 'a face de dentro do para-lama encosta na lateral da carroceria, em x 971 ou -971' }))),
  ...lados.flatMap((l) => pontas.map((p) => ({ par: [`saia${l}`, `paraLama${p}${l}`], motivo: 'a ponta da saia encosta na face da perna do para-lama, em z 786 ou -697, de y 353 a 530' }))),
  ...pontas.map((p) => ({ par: ['carroceria', `caixaRoda${p}`], motivo: 'as faces do arco da caixa de roda são as mesmas do arco recortado no perfil da carroceria' })),
  ...pontas.flatMap((p) => lados.map((l) => ({ par: [`caixaRoda${p}`, `roda${p}${l}`], motivo: 'a face de dentro do pneu, em x 441 ou -441, encosta na ponta da caixa de roda' }))),
  ...pontas.flatMap((p) => lados.map((l) => ({ par: [`aro${p}${l}`, `roda${p}${l}`], motivo: 'a face de dentro do aro encosta na face de fora do pneu, no disco do centro' }))),
  { par: ['carroceria', 'paraChoqueFrente'], motivo: 'a face de cima do para-choque da frente, em y 883, encosta na face de baixo do nariz' },
  { par: ['carroceria', 'paraChoqueTras'], motivo: 'a face de cima do para-choque de trás, em y 883, encosta na face de baixo da traseira' },
  { par: ['paraChoqueFrente', 'placaFrente'], motivo: 'a face de trás da placa encosta na face da frente do para-choque, em z 2427' },
  { par: ['paraChoqueTras', 'placaTras'], motivo: 'a face da frente da placa encosta na face de trás do para-choque, em z -2427' },
  ...lados.map((l) => ({ par: ['paraChoqueFrente', `paraLamaFrente${l}`], motivo: 'a aresta de fora do para-lama da frente, em z 2162 e y 530, toca a face de trás do para-choque da frente' })),
  ...lados.map((l) => ({ par: ['carroceria', `farol${l}`], motivo: 'a face de trás do farol encosta na face da frente do nariz, em z 2339' })),
  ...lados.map((l) => ({ par: ['cabine', `retrovisor${l}`], motivo: 'a aresta de cima do retrovisor, em y 1412 e x 971, toca a aresta de baixo da cabine na lateral' })),
  ...lados.map((l) => ({ par: ['carroceria', `lanterna${l}`], motivo: 'a aresta de baixo da lanterna, em z -2250 e y 1412, toca a aresta de cima da traseira da carroceria' })),
  ...lados.map((l) => ({ par: ['carroceria', `vidroLateral${l}`], motivo: 'a aresta de baixo da tira do vidro lateral, em y 1412, toca a aresta de cima da lateral da carroceria' })),
  ...lados.map((l) => ({ par: ['paraChoqueFrente', `farol${l}`], motivo: 'a aresta de baixo do farol, em y 883 e z 2339, toca a aresta de cima do para-choque da frente' })),
  ...lados.map((l) => ({ par: ['carroceria', `retrovisor${l}`], motivo: 'a face de dentro do retrovisor encosta na lateral da carroceria, em x 971 ou -971' })),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const xFora = T.roda_x + T.roda_largura / 2;
  const yRoda = T.roda_raio;
  const tol = 1;
  return [
    { nome: 'canto de trás, embaixo, do para-choque de trás', parte: 'paraChoqueTras', medida: 'minimo', em: [-T.para_choque_meia_largura, T.para_choque_tras_y0, T.para_choque_tras_z1], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, do nariz', parte: 'carroceria', medida: 'maximo', em: [T.corpo_meia_largura, T.cintura_y, T.nariz_z], toleranciaMm: tol },
    { nome: 'teto da cabine, na frente', parte: 'cabine', medida: 'maximo', em: [T.corpo_meia_largura, T.teto_y, T.para_brisa_base_z], toleranciaMm: tol },
    { nome: 'ponta de trás do aerofólio', parte: 'aerofolio', medida: 'minimo', em: [-xDaCabine(T, yDaTraseira(T, T.aerofolio_tras_z)), yDaTraseira(T, T.aerofolio_tras_z), T.aerofolio_tras_z], toleranciaMm: tol },
    { nome: 'ponta da frente da placa', parte: 'placaFrente', medida: 'maximo', em: [T.placa_meia_largura, T.placa_frente_y1, T.para_choque_frente_z1 + T.placa_prof], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-xFora, 0, T.roda_z_tras - yRoda], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente', parte: 'rodaFrenteDir', medida: 'maximo', em: [xFora, 2 * yRoda, T.roda_z_frente + yRoda], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.cintura_y, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'pneu da frente, à esquerda, embaixo', parte: 'rodaFrenteEsq', medida: 'minimo', em: [-xFora, 0, T.roda_z_frente - yRoda], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'carro-esportivo-hatch', desc: 'hatch esportivo estilizado, verde, baixo, com capô em rampa, aerofólio na ponta do teto, saias laterais claras, para-lamas cinza e rodas grandes' },
  PARAMS: TABELA,
  MATERIAIS: {
    verde: { tipo: 'liso', cor: '#46ad7c', acabamento: 'pintado' },
    verdeClaro: { tipo: 'liso', cor: '#58c088', acabamento: 'pintado' },
    vidro: { tipo: 'liso', cor: '#d4ecff' },
    cinza: { tipo: 'liso', cor: '#6d6e83' },
    cinzaEscuro: { tipo: 'liso', cor: '#3c3c43' },
    cinzaClaro: { tipo: 'liso', cor: '#d1d1e2' },
    pneu: { tipo: 'liso', cor: '#1f2125' },
    aro: { tipo: 'metal', cor: '#82879d', acabamento: 'escovado' },
    amarelo: { tipo: 'liso', cor: '#ffc61b' },
    vermelho: { tipo: 'liso', cor: '#d3363d' },
  },
  TOPO: { origem: 'chão, no meio do carro em x e em z; y para cima e a frente do carro em +z' },
  PLANO: {
    objeto: 'hatch esportivo estilizado de 5030 mm de comprimento, 2294 mm de largura e 1942 mm de altura, verde, baixo, com capô em rampa, aerofólio, saias claras e rodas grandes',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do hatch, de z -2515 a 2515, com as placas', milimetros: 5030 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'caixa de 1942 mm de largura de y 883 à cintura em y 1412, com capô em rampa até o nariz em y 1059 e os dois arcos de roda recortados embaixo', tecnica: 'extrusao em x do perfil lateral com os arcos no próprio perfil' },
      { nome: 'cabine', forma: 'cabine de y 1412 a 1942 que afunila de 971 a 794 de meia-largura, com para-brisa inclinado, teto reto e traseira em rampa até z -2250', tecnica: 'interseção do perfil lateral extrudado em x com a seção frontal extrudada em z' },
      { nome: 'aerofolio', forma: 'cunha cinza de z -1249 a -1602 sobre a rampa da traseira, com topo plano em y 1942 e face de trás vertical', tecnica: 'interseção de um triângulo lateral com a seção frontal da cabine' },
      { nome: 'parabrisa', forma: 'placa azul clara de 12 mm sobre a frente inclinada da cabine, de z 1055 a 632, recuada 180 mm da borda', tecnica: 'interseção de uma faixa lateral com um trapézio frontal' },
      { nome: 'frisoParabrisa', forma: 'faixa cinza escura de 12 mm acima do para-brisa, de z 632 a 490, no mesmo plano', tecnica: 'interseção de uma faixa lateral com um trapézio frontal' },
      { nome: 'vidroLateralDir', forma: 'tira azul clara de 12 mm sobre a lateral inclinada da cabine, janela trapezoidal de z -626 a 771, direita', tecnica: 'interseção de um trapézio lateral com uma tira frontal inclinada' },
      { nome: 'vidroLateralEsq', forma: 'tira azul clara de 12 mm sobre a lateral inclinada da cabine, janela trapezoidal de z -626 a 771, esquerda', tecnica: 'interseção de um trapézio lateral com uma tira frontal inclinada' },
      { nome: 'lanternaDir', forma: 'placa vermelha de 6 mm sobre a rampa da traseira, no canto de baixo direito, de x 767 à lateral', tecnica: 'interseção de uma faixa lateral com um trapézio frontal' },
      { nome: 'lanternaEsq', forma: 'placa vermelha de 6 mm sobre a rampa da traseira, no canto de baixo esquerdo, de x -767 à lateral', tecnica: 'interseção de uma faixa lateral com um trapézio frontal' },
      { nome: 'saiaDir', forma: 'saia verde clara entre os para-lamas direitos, de x 853 a 1147, de y 353 a 883, com o canto de cima chanfrado', tecnica: 'extrusao em z de perfil frontal' },
      { nome: 'saiaEsq', forma: 'saia verde clara entre os para-lamas esquerdos, de x -1147 a -853, de y 353 a 883, com o canto de cima chanfrado', tecnica: 'extrusao em z de perfil frontal' },
      { nome: 'paraLamaFrenteDir', forma: 'anel cinza de 688 mm de raio externo e 176 mm de largura, de x 971 a 1147, em volta da roda da frente direita', tecnica: 'extrusao em x de um arco com o furo no próprio perfil' },
      { nome: 'paraLamaFrenteEsq', forma: 'anel cinza de 688 mm de raio externo e 176 mm de largura, de x -1147 a -971, em volta da roda da frente esquerda', tecnica: 'extrusao em x de um arco com o furo no próprio perfil' },
      { nome: 'paraLamaTrasDir', forma: 'anel cinza de 688 mm de raio externo e 176 mm de largura, de x 971 a 1147, em volta da roda de trás direita', tecnica: 'extrusao em x de um arco com o furo no próprio perfil' },
      { nome: 'paraLamaTrasEsq', forma: 'anel cinza de 688 mm de raio externo e 176 mm de largura, de x -1147 a -971, em volta da roda de trás esquerda', tecnica: 'extrusao em x de um arco com o furo no próprio perfil' },
      { nome: 'caixaRodaFrente', forma: 'plugue escuro do arco da roda da frente, de x -441 a 441, fechado na borda de baixo da carroceria', tecnica: 'extrusao em x do mesmo arco recortado na carroceria' },
      { nome: 'caixaRodaTras', forma: 'plugue escuro do arco da roda de trás, de x -441 a 441, fechado na borda de baixo da carroceria', tecnica: 'extrusao em x do mesmo arco recortado na carroceria' },
      { nome: 'paraChoqueFrente', forma: 'para-choque cinza de z 2162 a 2427 e y 353 a 883, com topo inclinado e cantos da planta cortados, até 1147 de meia-largura', tecnica: 'interseção do perfil lateral com a planta' },
      { nome: 'paraChoqueTras', forma: 'para-choque cinza de z -2427 a -2100 e y 530 a 883, com degrau no topo e cantos da planta cortados', tecnica: 'interseção do perfil lateral com a planta' },
      { nome: 'placaFrente', forma: 'placa clara de 618 por 309 por 88 mm, de y 265 a 574, saindo do para-choque da frente', tecnica: 'cubo encostado na face da frente do para-choque' },
      { nome: 'placaTras', forma: 'placa clara de 618 por 308 por 88 mm, de y 442 a 750, saindo do para-choque de trás', tecnica: 'cubo encostado na face de trás do para-choque' },
      { nome: 'farolDir', forma: 'placa amarela de 353 por 176 por 6 mm, de y 883 a 1059, na face da frente do nariz à direita', tecnica: 'cubo encostado na face da frente do nariz' },
      { nome: 'farolEsq', forma: 'placa amarela de 353 por 176 por 6 mm, de y 883 a 1059, na face da frente do nariz à esquerda', tecnica: 'cubo encostado na face da frente do nariz' },
      { nome: 'retrovisorDir', forma: 'caixa verde de 176 mm, de x 971 a 1147, de y 1236 a 1412, ao lado do pé do para-brisa direito', tecnica: 'cubo encostado na lateral da carroceria' },
      { nome: 'retrovisorEsq', forma: 'caixa verde de 176 mm, de x -1147 a -971, de y 1236 a 1412, ao lado do pé do para-brisa esquerdo', tecnica: 'cubo encostado na lateral da carroceria' },
      { nome: 'rodaFrenteDir', forma: 'pneu escuro de 1059 mm de diâmetro e 618 mm de largura, no vão da frente direita', tecnica: 'cilindro com eixo x, 32 lados, sem chanfro' },
      { nome: 'rodaFrenteEsq', forma: 'pneu escuro de 1059 mm de diâmetro e 618 mm de largura, no vão da frente esquerda', tecnica: 'cilindro com eixo x, 32 lados, sem chanfro' },
      { nome: 'rodaTrasDir', forma: 'pneu escuro de 1059 mm de diâmetro e 618 mm de largura, no vão de trás direito', tecnica: 'cilindro com eixo x, 32 lados, sem chanfro' },
      { nome: 'rodaTrasEsq', forma: 'pneu escuro de 1059 mm de diâmetro e 618 mm de largura, no vão de trás esquerdo', tecnica: 'cilindro com eixo x, 32 lados, sem chanfro' },
      { nome: 'aroFrenteDir', forma: 'disco cinza de 660 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu da frente direita', tecnica: 'cilindro com eixo x' },
      { nome: 'aroFrenteEsq', forma: 'disco cinza de 660 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu da frente esquerda', tecnica: 'cilindro com eixo x' },
      { nome: 'aroTrasDir', forma: 'disco cinza de 660 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu de trás direito', tecnica: 'cilindro com eixo x' },
      { nome: 'aroTrasEsq', forma: 'disco cinza de 660 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu de trás esquerdo', tecnica: 'cilindro com eixo x' },
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 5030 mm de comprimento, 2294 mm de largura ou 1942 mm de altura, ou alguma roda não toca o chão',
      'um lado do carro difere do outro em medida ou posição de peça simétrica',
      'a cabine tem largura constante em vez de afunilar de 971 a 794 de meia-largura, ou não assenta na carroceria',
      'o capô não desce em rampa até um nariz baixo, ou a traseira não é uma rampa reta sem vidro até z -2250',
      'o aerofólio não é uma cunha cinza no fim do teto, com a face de trás vertical',
      'a roda não aparece no arco com o para-lama cinza em anel em volta, ou o pneu atravessa a carroceria',
      'as saias claras não ficam entre os para-lamas, de y 353 a 883',
      'a silhueta lateral ou frontal não confere com a referência em mais de cinco por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
