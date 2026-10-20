/* picape-compacta — picape de brinquedo, de carroceria verde, cabine curta e afunilada na frente, caçamba aberta atrás de paredes
 * grossas, chassi cinza mais largo que a carroceria, para-lamas em arco saliente, rodas grandes de pneu escuro com cubo cinza
 * azulado, faróis amarelos nos cantos do nariz, lanternas vermelhas nos cantos da tampa traseira e para-choques com placa clara.
 *
 * Origem: recriada em primitivas do núcleo a partir do modelo "truck" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A malha
 * de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/truck.glb, que o git ignora. O que entra aqui são
 * as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765) e as vistas (referencias/fonte-vistas.png). O que
 * não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente da picape em +z, x para a direita de quem olha de frente, centrada
 * em x e z. A TABELA é em milímetro e é a única fonte das medidas; `m` é a única conversão para metro; `derivar` calcula as formas e
 * `gerarPassos` escreve, por parte, a forma, a `parte` e o `material`. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita (estrutura do carro-taxi): a carroceria, a cabine, a tampa traseira e os vidros são a INTERSEÇÃO de
 * extrusões, o perfil lateral (z, y) em x, a seção frontal (x, y) em z e, quando a planta importa, a planta (x, z) em y. A cabine
 * afunila para o teto pela seção frontal e pelas duas faces inclinadas do perfil; os cantos do nariz (onde ficam os faróis) e os da
 * tampa traseira (onde ficam as lanternas) saem de entalhes na planta e na seção. Os arcos das rodas são recortados no próprio
 * perfil lateral, antes de extrudar, e cada caixa de roda enche o mesmo arco entre as faces de dentro dos pneus; nenhuma booleana
 * corta a peça. A caçamba é montada por partes (base sob o assoalho, assoalho, duas paredes laterais e a tampa traseira), e não por
 * um corte no interior de um bloco. Uma extrusão com `eixo: 'x'` leva o perfil [u, v] a y = -u e z = v; com `eixo: 'z'`, a x = u e
 * y = -v; com `eixo: 'y'`, a x = u e z = v. Os pneus e os cubos são revoluções em torno de x (`lathe`).
 */

export const TABELA = {
  lados: 32, // contagem de lados dos pneus e dos arcos (a mesma, para os arcos acompanharem o pneu)

  // carroceria verde: do chassi (y 882) à base da cabine (y 1412); capô em rampa leve até o pé do para-brisa
  carroceria_meia_largura: 971,
  topo_chassi_y: 882,
  cintura_y: 1412,
  nariz_z: 2427,
  nariz_topo_y: 1236,
  capo_fim_z: 1368,
  traseira_z: -2515,
  cacamba_frente_z: -397,

  // faróis nos cantos do nariz: o canto sai da planta e o farol enche o recuo
  farol_x0: 728,
  farol_recuo_z: 2339,

  // grade escura entre os faróis
  grade_meia_largura: 484,
  grade_y1: 1059,
  grade_prof: 10,

  // caçamba: paredes de 177 mm, assoalho a y 1059 com 16 mm de espessura, tampa de trás de 176 mm
  parede_x0: 794,
  assoalho_y: 1059,
  assoalho_espessura: 16,
  tampa_z: -2339,
  tampa_chanfro_x: 883,
  tampa_chanfro_z: -2427,

  // lanternas nos cantos da tampa traseira
  lanterna_x0: 485,
  lanterna_y0: 1059,
  lanterna_y1: 1236,

  // cabine: perfil de teto plano com a frente e a traseira inclinadas, e a seção que afunila de 971 na base a 794 no teto
  teto_y: 2294,
  teto_meia_largura: 794,
  teto_frente_z: 662,
  teto_tras_z: -44,

  // vidros azul claros: placas sobre as faces da cabine
  parabrisa_y1: 2157,
  parabrisa_meia_largura_y0: 792,
  parabrisa_meia_largura_y1: 643,
  parabrisa_espessura: 20,
  vidro_traseiro_y0: 1576,
  vidro_traseiro_y1: 2131,
  vidro_traseiro_meia_largura_y0: 758,
  vidro_traseiro_meia_largura_y1: 648,
  vidro_traseiro_espessura: 20,
  vidro_lateral_frente_z: 967,
  vidro_lateral_topo_z: 576,
  vidro_lateral_tras_z: 150,
  vidro_lateral_topo_y: 2121,
  vidro_lateral_espessura: 12,

  // retrovisores: caixas verdes que saem da lateral até x 1324, ao lado do pé do para-brisa
  retrovisor_x1: 1324,
  retrovisor_y0: 1236,
  retrovisor_z0: 967,
  retrovisor_z1: 1144,

  // chassi cinza escuro: a faixa de baixo, de y 353 a 882, mais larga que a carroceria; vai de z -2339 a 2339
  chassi_meia_largura: 1147,
  chassi_base_y: 353,
  chassi_z: 2339,

  // para-choques: de y 353 a 706, com a planta das quinas fechadas (1147 em z 2339, 1096 em 2463 e 971 na ponta, em 2515)
  para_choque_y1: 706,
  para_choque_z1: 2515,
  planta_x0: 1147,
  planta_x1: 1096,
  planta_z1: 2463,
  planta_x2: 971,

  // placas claras de ponta octogonal, de y 265 a 574, saindo 88 mm do para-choque
  placa_meia_largura: 309,
  placa_meia_largura_ponta: 221,
  placa_y0: 265,
  placa_y1: 574,
  placa_chanfro: 88,
  placa_z1: 2603,

  // rodas: pneu de 1059 mm de diâmetro e 618 mm de largura, com o cubo embutido na face de fora
  roda_raio: 529.5,
  roda_x_dentro: 441,
  roda_x_fora: 1059,
  roda_z_frente: 1562,
  roda_z_tras: -1297,
  pneu_furo_raio: 320,
  pneu_chanfro_raio: 450,
  pneu_chanfro_largura: 177,
  cubo_profundidade: 88,
  cubo_recesso_raio: 213,
  cubo_recesso_fundo_raio: 159,
  cubo_recesso_profundidade: 22,

  // arcos: o do perfil (a caixa de roda enche o mesmo arco) e o anel do para-lama em volta dele
  arco_raio: 590,
  para_lama_raio: 688,
};

const m = (mm) => mm / 1000;

/* ---------- geometria 2D em milímetro ---------- */

const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* o núcleo gira a extrusão em x de y para x: [u, v] vai a y = -u, z = v. Entra [z, y]. */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z]));
/* a extrusão em z leva [u, v] a x = u, y = -v. Entra [x, y]. */
const secaoFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y]));

/* O polígono de `n` lados de uma roda, em [z, y], percorrido no sentido horário a partir da esquerda (z menor). */
function circuloHorario(zc, yc, r, n) {
  return Array.from({ length: n }, (_, k) => {
    const a = Math.PI - (2 * Math.PI * k) / n;
    return [zc + r * Math.cos(a), yc + r * Math.sin(a)];
  });
}

/* Insere no anel os pontos em que as arestas cruzam o nível y; os pontos inseridos têm o y exato do nível. */
function comNivel(anel, y) {
  const saida = [];
  anel.forEach((a, i) => {
    const b = anel[(i + 1) % anel.length];
    saida.push(a);
    if ((a[1] - y) * (b[1] - y) < 0) { const t = (y - a[1]) / (b[1] - a[1]); saida.push([a[0] + t * (b[0] - a[0]), y]); }
  });
  return saida;
}
const anelCortado = (zc, yc, r, n, niveis) => niveis.reduce((anel, y) => comNivel(anel, y), circuloHorario(zc, yc, r, n));

/* O trecho do anel que vai do ponto `de` ao ponto `ate`, no sentido horário. */
function percorrer(anel, de, ate) {
  const saida = [];
  for (let i = de; ; i = (i + 1) % anel.length) { saida.push(anel[i]); if (i === ate) break; }
  return saida;
}

/* A parte do arco acima do nível y: da esquerda, por cima, até a direita, em ordem crescente de z, cortada em y. */
function capaAcima(zc, yc, r, n, y) {
  const anel = anelCortado(zc, yc, r, n, [y]);
  return percorrer(anel, anel.findIndex((p) => p[1] === y && p[0] < zc), anel.findIndex((p) => p[1] === y && p[0] > zc));
}

/* O trecho de um lado do arco entre os níveis yBaixo e yAlto: no lado direito vai de cima para baixo; no esquerdo, de baixo para cima. */
function trechoDoArco(zc, yc, r, n, lado, yBaixo, yAlto) {
  const anel = anelCortado(zc, yc, r, n, [yBaixo, yAlto]);
  const no = (y) => anel.findIndex((p) => p[1] === y && (lado > 0 ? p[0] > zc : p[0] < zc));
  return lado > 0 ? percorrer(anel, no(yAlto), no(yBaixo)) : percorrer(anel, no(yBaixo), no(yAlto));
}

/* x ao longo de y pela reta que passa por (y0, x0) e (y1, x1), válida também fora do intervalo. */
const reta = (y0, x0, y1, x1) => (y) => x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);

/* O paralelogramo da aresta P-Q deslocado `e` para fora, na direção da normal `n`; a face de dentro usa os mesmos vértices da aresta. */
function placaSobre(P, Q, e, n) {
  const k = e / Math.hypot(...n);
  return [P, Q, [Q[0] + n[0] * k, Q[1] + n[1] * k], [P[0] + n[0] * k, P[1] + n[1] * k]];
}

/* O polígono [x, z] da metade da direita, espelhado para a esquerda. */
const espelho = (pts) => [...pts, ...[...pts].reverse().map(([x, z]) => [-x, z])];

/* A altura do capô em z, pela reta do nariz ao pé do para-brisa. */
const yDoCapo = (T, z) => T.nariz_topo_y + ((z - T.nariz_z) * (T.cintura_y - T.nariz_topo_y)) / (T.capo_fim_z - T.nariz_z);

/* ---------- derivar ---------- */

/* Cada forma tem `nome`, `forma` (vistas, lateral, planta, frente, cubo ou lathe), `material` e as medidas da forma, em milímetro. */
export function derivar(T) {
  const M = T.carroceria_meia_largura;
  const C = T.chassi_meia_largura;
  const yR = T.roda_raio;
  const zF = T.roda_z_frente;
  const zT = T.roda_z_tras;
  const y0 = T.chassi_base_y;
  const y1 = T.topo_chassi_y;
  const yA = T.assoalho_y;
  const rodas = [];
  for (const s of [1, -1]) {
    for (const [ponta, zc] of [['Frente', zF], ['Tras', zT]]) rodas.push({ s, lado: s > 0 ? 'Dir' : 'Esq', ponta, zc });
  }
  const arco = (zc, y) => capaAcima(zc, yR, T.arco_raio, T.lados, y);
  const arcoDir = (zc, yb, ya) => trechoDoArco(zc, yR, T.arco_raio, T.lados, 1, yb, ya);
  const arcoEsq = (zc, yb, ya) => trechoDoArco(zc, yR, T.arco_raio, T.lados, -1, yb, ya);
  const retangulo = (xa, xb, ya, yb) => [[xa, ya], [xb, ya], [xb, yb], [xa, yb]];
  const folga = 100; // a seção frontal passa desta folga acima e abaixo do corpo, para o perfil lateral fixar os planos de corte
  const formas = [];

  /* carroceria: do chassi à base da cabine, da traseira da cabine ao nariz; o capô desce em rampa; o arco da roda da frente no
   * perfil; a planta recua os cantos do nariz para os faróis */
  formas.push({
    nome: 'carroceria', forma: 'vistas', material: 'verde',
    lado: [[T.nariz_z, y1], [T.nariz_z, T.nariz_topo_y], [T.capo_fim_z, T.cintura_y], [T.cacamba_frente_z, T.cintura_y], [T.cacamba_frente_z, y1], ...arco(zF, y1)],
    frontal: retangulo(-M, M, y1 - folga, T.cintura_y + folga),
    planta: [[M, T.cacamba_frente_z], [M, T.farol_recuo_z], [T.farol_x0, T.farol_recuo_z], [T.farol_x0, T.nariz_z],
      [-T.farol_x0, T.nariz_z], [-T.farol_x0, T.farol_recuo_z], [-M, T.farol_recuo_z], [-M, T.cacamba_frente_z]],
  });

  /* base da caçamba, sob o assoalho (y 882 a 1059), em dois trechos separados pelo arco da roda de trás; a planta chanfra os cantos */
  const plantaTras = [[M, T.cacamba_frente_z], [M, T.tampa_chanfro_z], [T.tampa_chanfro_x, T.traseira_z],
    [-T.tampa_chanfro_x, T.traseira_z], [-M, T.tampa_chanfro_z], [-M, T.cacamba_frente_z]];
  formas.push({
    nome: 'baseCacambaFrente', forma: 'vistas', material: 'verde',
    lado: [...arcoDir(zT, y1, yA), [T.cacamba_frente_z, y1], [T.cacamba_frente_z, yA]],
    frontal: retangulo(-M, M, y1 - folga, yA + folga), planta: plantaTras,
  });
  formas.push({
    nome: 'baseCacambaTras', forma: 'vistas', material: 'verde',
    lado: [...arcoEsq(zT, y1, yA), [T.traseira_z, yA], [T.traseira_z, y1]],
    frontal: retangulo(-M, M, y1 - folga, yA + folga), planta: plantaTras,
  });

  /* assoalho cinza da caçamba: placa de 16 mm sobre a base, entre as paredes */
  formas.push({
    nome: 'assoalho', forma: 'cubo', material: 'cinza', larg: 2 * T.parede_x0, alt: T.assoalho_espessura, prof: T.cacamba_frente_z - T.tampa_z,
    em: [0, yA, (T.cacamba_frente_z + T.tampa_z) / 2],
  });

  /* paredes laterais da caçamba: de x 794 a 971, de y 1059 à borda em 1412, de z -397 a -2339 */
  for (const s of [1, -1]) {
    formas.push({
      nome: `paredeCacamba${s > 0 ? 'Dir' : 'Esq'}`, forma: 'cubo', material: 'verde', larg: M - T.parede_x0, alt: T.cintura_y - yA,
      prof: T.cacamba_frente_z - T.tampa_z, em: [(s * (M + T.parede_x0)) / 2, yA, (T.cacamba_frente_z + T.tampa_z) / 2],
    });
  }

  /* tampa traseira: parede de z -2515 a -2339, de y 1059 a 1412, com o entalhe dos cantos para as lanternas (x 485 a 971, y 1059 a 1236) */
  const yL = T.lanterna_y1;
  const xL = T.lanterna_x0;
  formas.push({
    nome: 'tampaTraseira', forma: 'vistas', material: 'verde',
    lado: [[T.traseira_z, yA], [T.tampa_z, yA], [T.tampa_z, T.cintura_y], [T.traseira_z, T.cintura_y]],
    frontal: [[-xL, yA], [xL, yA], [xL, yL], [M, yL], [M, T.cintura_y], [-M, T.cintura_y], [-M, yL], [-xL, yL]],
    planta: [[M, T.tampa_z], [M, T.tampa_chanfro_z], [T.tampa_chanfro_x, T.traseira_z], [-T.tampa_chanfro_x, T.traseira_z],
      [-M, T.tampa_chanfro_z], [-M, T.tampa_z]],
  });

  /* lanternas: o canto da tampa, com a traseira, o chanfro e a lateral, de y 1059 a 1236 */
  for (const s of [1, -1]) {
    formas.push({
      nome: `lanterna${s > 0 ? 'Dir' : 'Esq'}`, forma: 'planta', material: 'lanterna', y0: T.lanterna_y0, altura: T.lanterna_y1 - T.lanterna_y0,
      planta: [[s * xL, T.tampa_z], [s * M, T.tampa_z], [s * M, T.tampa_chanfro_z], [s * T.tampa_chanfro_x, T.traseira_z], [s * xL, T.traseira_z]],
    });
  }

  /* faróis: o canto do nariz, de x 728 a 971, de z 2339 a 2427, sob a rampa do capô */
  for (const s of [1, -1]) {
    formas.push({
      nome: `farol${s > 0 ? 'Dir' : 'Esq'}`, forma: 'lateral', material: 'amarelo', largura: M - T.farol_x0, x0: s > 0 ? T.farol_x0 : -M,
      lado: [[T.farol_recuo_z, y1], [T.nariz_z, y1], [T.nariz_z, T.nariz_topo_y], [T.farol_recuo_z, yDoCapo(T, T.farol_recuo_z)]],
    });
  }

  /* grade escura entre os faróis, saindo 10 mm do nariz */
  formas.push({
    nome: 'grade', forma: 'cubo', material: 'grade', larg: 2 * T.grade_meia_largura, alt: T.grade_y1 - y1, prof: T.grade_prof,
    em: [0, y1, T.nariz_z + T.grade_prof / 2],
  });

  /* cabine: o perfil lateral do pé do para-brisa à base da traseira, e a seção frontal que afunila de 971 na base a 794 no teto */
  const xCabine = reta(T.cintura_y, M, T.teto_y, T.teto_meia_largura);
  const trapezio = (xDe, ya, yb) => [[-xDe(ya), ya], [xDe(ya), ya], [xDe(yb), yb], [-xDe(yb), yb]];
  const zFrenteEm = reta(T.teto_y, T.teto_frente_z, T.cintura_y, T.capo_fim_z);
  const zTrasEm = reta(T.teto_y, T.teto_tras_z, T.cintura_y, T.cacamba_frente_z);
  formas.push({
    nome: 'cabine', forma: 'vistas', material: 'verde',
    lado: [[T.capo_fim_z, T.cintura_y], [T.teto_frente_z, T.teto_y], [T.teto_tras_z, T.teto_y], [T.cacamba_frente_z, T.cintura_y]],
    frontal: trapezio(xCabine, T.cintura_y - 110, T.teto_y + 105),
  });

  /* para-brisa e vidro traseiro: placas sobre as faces inclinadas da cabine, com o trapézio frontal mais estreito que a cabine */
  const pilarFrente = [[T.capo_fim_z, T.cintura_y], [T.teto_frente_z, T.teto_y]];
  const pilarTras = [[T.teto_tras_z, T.teto_y], [T.cacamba_frente_z, T.cintura_y]];
  const xParabrisa = reta(T.cintura_y, T.parabrisa_meia_largura_y0, T.parabrisa_y1, T.parabrisa_meia_largura_y1);
  formas.push({
    nome: 'parabrisa', forma: 'vistas', material: 'vidro',
    lado: placaSobre(...pilarFrente, T.parabrisa_espessura, [T.teto_y - T.cintura_y, T.capo_fim_z - T.teto_frente_z]),
    frontal: trapezio(xParabrisa, T.cintura_y, T.parabrisa_y1),
  });
  const xTraseiro = reta(T.vidro_traseiro_y0, T.vidro_traseiro_meia_largura_y0, T.vidro_traseiro_y1, T.vidro_traseiro_meia_largura_y1);
  formas.push({
    nome: 'vidroTraseiro', forma: 'vistas', material: 'vidro',
    lado: placaSobre(...pilarTras, T.vidro_traseiro_espessura, [-(T.teto_y - T.cintura_y), T.teto_tras_z - T.cacamba_frente_z]),
    frontal: trapezio(xTraseiro, T.vidro_traseiro_y0, T.vidro_traseiro_y1),
  });

  /* vidros laterais: a janela em cada lado, uma casca de 12 mm sobre a lateral inclinada da cabine */
  const janela = [[T.vidro_lateral_frente_z, T.cintura_y], [T.vidro_lateral_topo_z, T.vidro_lateral_topo_y],
    [T.vidro_lateral_tras_z, T.vidro_lateral_topo_y], [T.vidro_lateral_tras_z, T.cintura_y]];
  const ya = T.cintura_y - 110;
  const yb = T.teto_y + 105;
  const e = T.vidro_lateral_espessura;
  for (const s of [1, -1]) {
    formas.push({
      nome: `vidroLateral${s > 0 ? 'Dir' : 'Esq'}`, forma: 'vistas', material: 'vidro', lado: janela,
      frontal: [[s * xCabine(ya), ya], [s * (xCabine(ya) + e), ya], [s * (xCabine(yb) + e), yb], [s * xCabine(yb), yb]],
    });
  }

  /* retrovisores: caixas verdes da lateral da carroceria a x 1324, de y 1236 à base da cabine */
  for (const s of [1, -1]) {
    const larg = T.retrovisor_x1 - M;
    formas.push({
      nome: `retrovisor${s > 0 ? 'Dir' : 'Esq'}`, forma: 'cubo', material: 'verde', larg, alt: T.cintura_y - T.retrovisor_y0,
      prof: T.retrovisor_z1 - T.retrovisor_z0, em: [s * (M + larg / 2), T.retrovisor_y0, (T.retrovisor_z0 + T.retrovisor_z1) / 2],
    });
  }

  /* chassi em três trechos (frente, centro e trás), separados pelos arcos: o perfil lateral de y 353 a 882, de 1147 de meia largura */
  formas.push({
    nome: 'chassiFrente', forma: 'lateral', material: 'cinzaEscuro', x0: -C, largura: 2 * C,
    lado: [...arcoDir(zF, y0, y1), [T.chassi_z, y0], [T.chassi_z, y1]],
  });
  formas.push({
    nome: 'chassiCentro', forma: 'lateral', material: 'cinzaEscuro', x0: -C, largura: 2 * C,
    lado: [...arcoDir(zT, y0, y1), ...arcoEsq(zF, y0, y1)],
  });
  formas.push({
    nome: 'chassiTras', forma: 'lateral', material: 'cinzaEscuro', x0: -C, largura: 2 * C,
    lado: [[-T.chassi_z, y0], ...arcoEsq(zT, y0, y1), [-T.chassi_z, y1]],
  });

  /* para-choques de y 353 a 706, com a planta das quinas fechadas, encostados nas pontas do chassi */
  const zPC = T.para_choque_z1;
  const bordaF = [[T.planta_x0, T.chassi_z], [T.planta_x1, T.planta_z1], [T.planta_x2, zPC]];
  formas.push({
    nome: 'paraChoqueFrente', forma: 'planta', material: 'cinza', y0: y0, altura: T.para_choque_y1 - y0, planta: espelho(bordaF),
  });
  const bordaT = bordaF.map(([x, z]) => [x, -z]);
  formas.push({
    nome: 'paraChoqueTras', forma: 'planta', material: 'cinza', y0: y0, altura: T.para_choque_y1 - y0, planta: espelho(bordaT),
  });

  /* placas claras de ponta octogonal, saindo do para-choque até z 2603 e -2603 */
  const pl = T.placa_meia_largura;
  const pp = T.placa_meia_largura_ponta;
  const octogono = [[-pp, T.placa_y0], [pp, T.placa_y0], [pl, T.placa_y0 + T.placa_chanfro], [pl, T.placa_y1 - T.placa_chanfro],
    [pp, T.placa_y1], [-pp, T.placa_y1], [-pl, T.placa_y1 - T.placa_chanfro], [-pl, T.placa_y0 + T.placa_chanfro]];
  formas.push({ nome: 'placaFrente', forma: 'frente', material: 'cinzaClaro', z0: zPC, altura: T.placa_z1 - zPC, frontal: octogono });
  formas.push({ nome: 'placaTras', forma: 'frente', material: 'cinzaClaro', z0: -T.placa_z1, altura: T.placa_z1 - zPC, frontal: octogono });

  /* para-lamas: anel de 590 a 688 de raio sobre o chassi (y 882), de x 971 a 1147 */
  for (const r of rodas) {
    const ext = capaAcima(r.zc, yR, T.para_lama_raio, T.lados, y1);
    const int = capaAcima(r.zc, yR, T.arco_raio, T.lados, y1);
    formas.push({
      nome: `paraLama${r.ponta}${r.lado}`, forma: 'lateral', material: 'cinza', x0: r.s > 0 ? M : -C, largura: C - M, lado: [...ext, ...[...int].reverse()],
    });
  }

  /* caixas de roda: o arco do perfil, fechado em y 353, entre as faces de dentro dos dois pneus; a de trás fecha em y 1059, no
   * assoalho, e a da frente sobe até o cume do arco */
  formas.push({
    nome: 'caixaRodaFrente', forma: 'lateral', material: 'caixaRoda', x0: -T.roda_x_dentro, largura: 2 * T.roda_x_dentro,
    lado: arco(zF, y0),
  });
  formas.push({
    nome: 'caixaRodaTras', forma: 'lateral', material: 'caixaRoda', x0: -T.roda_x_dentro, largura: 2 * T.roda_x_dentro,
    lado: [...arcoEsq(zT, y0, yA), ...arcoDir(zT, y0, yA)],
  });

  /* rodas: pneu com chanfro e furo para o cubo, e cubo com recesso, revoluções em torno de x */
  const R = T.roda_raio;
  const L = T.roda_x_fora - T.roda_x_dentro;
  const cl = T.pneu_chanfro_largura;
  const pneu = [[T.pneu_furo_raio, 0], [T.pneu_chanfro_raio, 0], [R, cl], [R, L - cl], [T.pneu_chanfro_raio, L], [T.pneu_furo_raio, L]];
  const a0 = L - T.cubo_profundidade;
  const cuboDir = [[0, a0], [T.pneu_furo_raio, a0], [T.pneu_furo_raio, L], [T.cubo_recesso_raio, L],
    [T.cubo_recesso_fundo_raio, L - T.cubo_recesso_profundidade], [0, L - T.cubo_recesso_profundidade]];
  const cuboEsq = cuboDir.map(([r, a]) => [r, L - a]);
  for (const r of rodas) {
    formas.push({
      nome: `roda${r.ponta}${r.lado}`, forma: 'lathe', material: 'pneu', liso: true, secao: true, lados: T.lados, perfil: pneu,
      em: [r.s > 0 ? T.roda_x_dentro : -T.roda_x_fora, yR, r.zc],
    });
    formas.push({
      nome: `cubo${r.ponta}${r.lado}`, forma: 'lathe', material: 'cubo', liso: true, lados: T.lados, perfil: r.s > 0 ? cuboDir : cuboEsq,
      em: [r.s > 0 ? T.roda_x_dentro : -T.roda_x_fora, yR, r.zc],
    });
  }
  return formas;
}

/* ---------- passos ---------- */

const emMetro = (v) => v.map(m);
const perfilM = (pontos) => pontos.map(([u, v]) => [m(u), m(v)]);
const LARGURA_MAX = 1400; // meia largura que os prismas lateral e de planta cobrem, e meio comprimento dos prismas frontal e de planta
const COMPRIMENTO_MAX = 2700;

/* Os passos de uma forma, com os ids do bloco `base`: a forma leva base + 1 (e +2, +3 nas extrusões da interseção) e a interseção, base + 10. */
function passosDaForma(f, base) {
  const passos = [];
  let sel;
  if (f.forma === 'vistas') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * LARGURA_MAX), em: [m(-LARGURA_MAX), 0, 0], perfil: perfilM(perfilLateral(f.lado)) }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * COMPRIMENTO_MAX), em: [0, 0, m(-COMPRIMENTO_MAX)], perfil: perfilM(secaoFrontal(f.frontal)) }]);
    const solidos = [{ origem: { op: 'extrusao', id: base + 1 } }, { origem: { op: 'extrusao', id: base + 2 } }];
    if (f.planta) {
      passos.push(['extrusao', { origemId: base + 3, eixo: 'y', altura: m(3200), em: [0, m(-100), 0], perfil: perfilM(antihorario(f.planta)) }]);
      solidos.push({ origem: { op: 'extrusao', id: base + 3 } });
    }
    passos.push(['intersectar', { origemId: base + 10, solidos }]);
    sel = { origem: { op: 'intersectar', id: base + 10 } };
  } else if (f.forma === 'lateral') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(f.largura), em: [m(f.x0), 0, 0], perfil: perfilM(perfilLateral(f.lado)) }]);
    sel = { origem: { op: 'extrusao', id: base + 1 } };
  } else if (f.forma === 'frente') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'z', altura: m(f.altura), em: [0, 0, m(f.z0)], perfil: perfilM(secaoFrontal(f.frontal)) }]);
    sel = { origem: { op: 'extrusao', id: base + 1 } };
  } else if (f.forma === 'cubo') {
    passos.push(['cubo', { origemId: base + 1, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: emMetro(f.em) }]);
    sel = { origem: { op: 'cubo', id: base + 1 } };
  } else if (f.forma === 'planta') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'y', altura: m(f.altura), em: [0, m(f.y0), 0], perfil: perfilM(antihorario(f.planta)) }]);
    sel = { origem: { op: 'extrusao', id: base + 1 } };
  } else {
    /* um perfil que não toca o eixo (o pneu, com o furo do cubo) só fecha como seção: `furos: []` liga esse modo */
    passos.push(['lathe', { origemId: base + 1, eixo: 'x', perfil: perfilM(f.perfil), ...(f.secao ? { furos: [] } : {}), lados: f.lados, em: emMetro(f.em) }]);
    sel = { origem: { op: 'lathe', id: base + 1 } };
  }
  passos.push(['parte', { nome: f.nome, sel }]);
  passos.push(['material', { sel, usa: f.material }]);
  if (f.liso) passos.push(['liso', { angulo: 30, sel }]);
  return passos;
}

/** Os PASSOS: cada forma, a `parte` e o `material` logo depois. */
export function gerarPassos(T) {
  return derivar(T).flatMap((f, k) => passosDaForma(f, 100 * (k + 1)));
}

/* ---------- contatos ---------- */

const PONTAS = ['Frente', 'Tras'];
const LADOS = ['Dir', 'Esq'];

/* Os contatos, declarados antes de medir: cada par se toca pela face ou pela aresta que o motivo diz. */
export const CONTATOS = [
  { par: ['carroceria', 'chassiFrente'], motivo: 'a face de baixo da carroceria, em y 882, assenta na face de cima do chassi da frente' },
  { par: ['carroceria', 'chassiCentro'], motivo: 'a face de baixo da carroceria, em y 882, assenta na face de cima do chassi do centro' },
  { par: ['baseCacambaFrente', 'chassiCentro'], motivo: 'a face de baixo da base da caçamba, em y 882, assenta na face de cima do chassi do centro' },
  { par: ['baseCacambaTras', 'chassiTras'], motivo: 'a face de baixo da base da caçamba, em y 882, assenta na face de cima do chassi de trás' },
  { par: ['carroceria', 'baseCacambaFrente'], motivo: 'a face de trás da carroceria, em z -397, encosta na face da frente da base da caçamba' },
  { par: ['carroceria', 'cabine'], motivo: 'a face de baixo da cabine, em y 1412, assenta no tampo da carroceria, de z -397 a 1368' },
  { par: ['carroceria', 'grade'], motivo: 'a face de trás da grade encosta na face da frente do nariz, em z 2427' },
  { par: ['assoalho', 'baseCacambaFrente'], motivo: 'a face de baixo do assoalho, em y 1059, assenta na face de cima da base da caçamba' },
  { par: ['assoalho', 'baseCacambaTras'], motivo: 'a face de baixo do assoalho, em y 1059, assenta na face de cima da base da caçamba' },
  { par: ['assoalho', 'caixaRodaTras'], motivo: 'a face de baixo do assoalho, em y 1059, assenta no tampo da caixa de roda de trás' },
  { par: ['assoalho', 'carroceria'], motivo: 'a face da frente do assoalho encosta na face de trás da carroceria, em z -397, de y 1059 a 1075' },
  { par: ['assoalho', 'tampaTraseira'], motivo: 'a face de trás do assoalho encosta na face da frente da tampa traseira, em z -2339' },
  ...LADOS.flatMap((l) => [
    { par: ['assoalho', `paredeCacamba${l}`], motivo: 'a lateral do assoalho, em x 794 ou -794, encosta na face de dentro da parede da caçamba' },
    { par: [`paredeCacamba${l}`, 'baseCacambaFrente'], motivo: 'a face de baixo da parede, em y 1059, assenta na face de cima da base da caçamba' },
    { par: [`paredeCacamba${l}`, 'baseCacambaTras'], motivo: 'a face de baixo da parede, em y 1059, assenta na face de cima da base da caçamba' },
    { par: [`paredeCacamba${l}`, 'carroceria'], motivo: 'a face da frente da parede, em z -397, encosta na face de trás da carroceria' },
    { par: [`paredeCacamba${l}`, 'tampaTraseira'], motivo: 'a face de trás da parede, em z -2339, encosta na face da frente da tampa traseira' },
    { par: [`paredeCacamba${l}`, `lanterna${l}`], motivo: 'a face de trás da parede, em z -2339, encosta na face da frente da lanterna, de y 1059 a 1236' },
    { par: ['tampaTraseira', `lanterna${l}`], motivo: 'a lanterna enche o entalhe do canto da tampa e encosta nas faces dele' },
    { par: ['baseCacambaTras', `lanterna${l}`], motivo: 'a face de baixo da lanterna, em y 1059, assenta na face de cima da base da caçamba' },
    { par: ['carroceria', `farol${l}`], motivo: 'o farol enche o recuo do canto do nariz e encosta nas faces dele, em x 728 ou -728 e z 2339' },
    { par: ['chassiFrente', `farol${l}`], motivo: 'o canto de cima da frente do chassi, em y 882 e z 2339, toca o canto de baixo do farol, só pela aresta' },
    { par: ['carroceria', `retrovisor${l}`], motivo: 'a face de dentro do retrovisor encosta na lateral da carroceria, em x 971 ou -971' },
    { par: ['cabine', `vidroLateral${l}`], motivo: 'a face de dentro do vidro lateral é o mesmo plano da lateral inclinada da cabine' },
    { par: ['cabine', `paredeCacamba${l}`], motivo: 'o canto de trás da base da cabine, em y 1412 e z -397, toca o canto de cima da parede da caçamba, só pela aresta' },
    { par: ['cabine', `retrovisor${l}`], motivo: 'o canto de cima do retrovisor, em y 1412 e x 971 ou -971, toca a aresta da base da cabine, só pela aresta' },
    { par: [`retrovisor${l}`, `vidroLateral${l}`], motivo: 'a face de trás do retrovisor, em z 967 ou o canto do vidro lateral, toca o vidro na quina da janela, em y 1412' },
    { par: ['assoalho', `lanterna${l}`], motivo: 'a face da frente do assoalho, em z -2339, encosta na lanterna, de y 1059 a 1075' },
    { par: ['assoalho', `rodaTras${l}`], motivo: 'o topo do pneu de trás, em y 1059, toca a face de baixo do assoalho numa linha, só pela aresta' },
    { par: [`paredeCacamba${l}`, `rodaTras${l}`], motivo: 'o topo do pneu de trás, em y 1059, toca a face de baixo da parede da caçamba numa linha, só pela aresta' },
    { par: ['carroceria', `vidroLateral${l}`], motivo: 'a aresta de baixo do vidro lateral, em y 1412, toca o canto da lateral da carroceria, só pela aresta' },
  ]),
  { par: ['baseCacambaTras', 'tampaTraseira'], motivo: 'a face de baixo da tampa, em y 1059, assenta na face de cima da base da caçamba' },
  { par: ['carroceria', 'parabrisa'], motivo: 'o canto de baixo do para-brisa, em y 1412, assenta sobre o capô, na linha em que a cabine começa' },
  { par: ['cabine', 'parabrisa'], motivo: 'a face de trás do para-brisa é o mesmo plano da face inclinada da frente da cabine' },
  { par: ['cabine', 'vidroTraseiro'], motivo: 'a face da frente do vidro traseiro é o mesmo plano da face inclinada de trás da cabine' },
  { par: ['chassiFrente', 'paraChoqueFrente'], motivo: 'a face de trás do para-choque encosta na face da frente do chassi, em z 2339' },
  { par: ['chassiTras', 'paraChoqueTras'], motivo: 'a face da frente do para-choque de trás encosta na face de trás do chassi, em z -2339' },
  { par: ['paraChoqueFrente', 'placaFrente'], motivo: 'a face de trás da placa encosta na face da frente do para-choque, em z 2515' },
  { par: ['paraChoqueTras', 'placaTras'], motivo: 'a face da frente da placa de trás encosta na face de trás do para-choque, em z -2515' },
  ...PONTAS.flatMap((p) => [
    { par: [`caixaRoda${p}`, 'chassiCentro'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco do chassi' },
    { par: [`caixaRoda${p}`, p === 'Frente' ? 'chassiFrente' : 'chassiTras'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco do chassi' },
    ...LADOS.flatMap((l) => [
      { par: [`caixaRoda${p}`, `roda${p}${l}`], motivo: 'a face de dentro do pneu, em x 441 ou -441, encosta na face da caixa de roda' },
      { par: [`cubo${p}${l}`, `roda${p}${l}`], motivo: 'o cubo enche o furo de 320 mm de raio na face de fora do pneu e encosta na parede do furo' },
      { par: [`paraLama${p}${l}`, p === 'Frente' ? 'chassiFrente' : 'chassiTras'], motivo: 'a base do para-lama assenta na face de cima do chassi, em y 882' },
      { par: [`paraLama${p}${l}`, 'chassiCentro'], motivo: 'a base do para-lama assenta na face de cima do chassi, em y 882' },
    ]),
  ]),
  { par: ['caixaRodaFrente', 'carroceria'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco da carroceria' },
  { par: ['caixaRodaTras', 'baseCacambaFrente'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco da base da caçamba' },
  { par: ['caixaRodaTras', 'baseCacambaTras'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco da base da caçamba' },
  ...LADOS.flatMap((l) => [
    { par: [`paraLamaFrente${l}`, 'carroceria'], motivo: 'a face de dentro do para-lama encosta na lateral da carroceria, em x 971 ou -971' },
    { par: [`paraLamaTras${l}`, 'baseCacambaFrente'], motivo: 'a face de dentro do para-lama encosta na lateral da base da caçamba, em x 971 ou -971' },
    { par: [`paraLamaTras${l}`, 'baseCacambaTras'], motivo: 'a face de dentro do para-lama encosta na lateral da base da caçamba, em x 971 ou -971' },
    { par: [`paraLamaTras${l}`, `paredeCacamba${l}`], motivo: 'a face de dentro do para-lama encosta na lateral da parede da caçamba, em x 971 ou -971' },
  ]),
];

/* ---------- pontos declarados ---------- */

export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  const cumePL = Math.max(...capaAcima(T.roda_z_frente, T.roda_raio, T.para_lama_raio, T.lados, T.topo_chassi_y).map((p) => p[0]));
  return [
    { nome: 'canto de trás, embaixo, do para-choque de trás', parte: 'paraChoqueTras', medida: 'minimo', em: [-T.planta_x0, T.chassi_base_y, -T.para_choque_z1], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, do para-choque da frente', parte: 'paraChoqueFrente', medida: 'maximo', em: [T.planta_x0, T.para_choque_y1, T.para_choque_z1], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da placa da frente', parte: 'placaFrente', medida: 'maximo', em: [T.placa_meia_largura, T.placa_y1, T.placa_z1], toleranciaMm: tol },
    { nome: 'canto de trás, embaixo, da placa de trás', parte: 'placaTras', medida: 'minimo', em: [-T.placa_meia_largura, T.placa_y0, -T.placa_z1], toleranciaMm: tol },
    { nome: 'teto da cabine, na frente', parte: 'cabine', medida: 'maximo', em: [T.carroceria_meia_largura, T.teto_y, T.capo_fim_z], toleranciaMm: tol },
    { nome: 'borda de trás da tampa traseira, em cima', parte: 'tampaTraseira', medida: 'minimo', em: [-T.carroceria_meia_largura, T.assoalho_y, T.traseira_z], toleranciaMm: tol },
    { nome: 'borda de cima da parede direita da caçamba', parte: 'paredeCacambaDir', medida: 'maximo', em: [T.carroceria_meia_largura, T.cintura_y, T.cacamba_frente_z], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.cintura_y, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-T.roda_x_fora, 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente e em cima', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.roda_x_fora, 2 * T.roda_raio, T.roda_z_frente + T.roda_raio], toleranciaMm: tol },
    { nome: 'cume do para-lama da frente à direita', parte: 'paraLamaFrenteDir', medida: 'maximo', em: [T.chassi_meia_largura, T.roda_raio + T.para_lama_raio, cumePL], toleranciaMm: tol },
    { nome: 'centro do farol direito', parte: 'farolDir', medida: 'centro', em: [(T.farol_x0 + T.carroceria_meia_largura) / 2, (T.topo_chassi_y + T.nariz_topo_y) / 2 + 3.5, (T.farol_recuo_z + T.nariz_z) / 2], toleranciaMm: 10 },
  ];
}

const receita = {
  meta: { nome: 'picape-compacta', desc: 'picape de brinquedo, verde, de cabine curta afunilada e caçamba aberta, chassi cinza, para-lamas em arco e rodas grandes, recriada do modelo truck do pacote A, de autor A' },
  PARAMS: TABELA,
  MATERIAIS: {
    verde: { tipo: 'liso', cor: '#3ea97a', acabamento: 'pintado' },
    vidro: { tipo: 'liso', cor: '#cfe6fb', acabamento: 'pintado' },
    cinza: { tipo: 'liso', cor: '#6d6f84', acabamento: 'pintado' },
    cinzaEscuro: { tipo: 'liso', cor: '#585a6e', acabamento: 'pintado' },
    cinzaClaro: { tipo: 'liso', cor: '#d1d1e2', acabamento: 'pintado' },
    caixaRoda: { tipo: 'liso', cor: '#2c2d35', acabamento: 'pintado' },
    grade: { tipo: 'liso', cor: '#4d4e60', acabamento: 'pintado' },
    amarelo: { tipo: 'liso', cor: '#f5c01b', acabamento: 'pintado' },
    lanterna: { tipo: 'liso', cor: '#d3363d', acabamento: 'pintado' },
    pneu: { tipo: 'liso', cor: '#3a3a40', acabamento: 'pintado' },
    cubo: { tipo: 'metal', cor: '#959cbb', acabamento: 'escovado' },
  },
  TOPO: { origem: 'chão, no meio da picape em x e em z; y para cima e a frente da picape em +z' },
  PLANO: {
    objeto: 'picape de brinquedo de 5206 mm de comprimento com as placas, 2648 mm de largura com os espelhos e 2294 mm de altura, de carroceria verde, cabine curta afunilada, caçamba aberta atrás, chassi cinza, para-lamas e rodas grandes',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total da picape, de z -2603 a 2603, com as placas', milimetros: 5206 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'bloco verde de 1942 mm de largura, de y 882 a 1412, da traseira da cabine em z -397 ao nariz em z 2427, com o capô em rampa de y 1236 a 1412, o arco da roda da frente e os cantos do nariz recuados para os faróis', tecnica: 'interseção do perfil lateral com o arco no perfil, da seção frontal e da planta com os recuos dos cantos' },
      { nome: 'baseCacambaFrente', forma: 'bloco verde sob o assoalho da caçamba, de y 882 a 1059, entre a carroceria em z -397 e o arco da roda de trás', tecnica: 'interseção do perfil lateral com o arco da roda de trás, da seção frontal e da planta chanfrada' },
      { nome: 'baseCacambaTras', forma: 'bloco verde sob o assoalho da caçamba, de y 882 a 1059, do arco da roda de trás à traseira em z -2515, com os cantos chanfrados', tecnica: 'interseção do perfil lateral com o arco da roda de trás, da seção frontal e da planta chanfrada' },
      { nome: 'assoalho', forma: 'placa cinza de 1588 por 16 mm, de y 1059 a 1075, entre as paredes, de z -397 a -2339', tecnica: 'cubo assentado na base da caçamba' },
      { nome: 'paredeCacambaDir', forma: 'parede verde direita da caçamba, de 177 mm de espessura, de x 794 a 971, de y 1059 a 1412, de z -397 a -2339', tecnica: 'cubo assentado na base da caçamba' },
      { nome: 'paredeCacambaEsq', forma: 'parede verde esquerda da caçamba, de 177 mm de espessura, de x -971 a -794, de y 1059 a 1412, de z -397 a -2339', tecnica: 'cubo assentado na base da caçamba' },
      { nome: 'tampaTraseira', forma: 'parede verde de trás da caçamba, de 176 mm de espessura, de z -2515 a -2339, de y 1059 a 1412, com os cantos chanfrados e entalhados para as lanternas', tecnica: 'interseção do retângulo lateral, da seção frontal entalhada e da planta chanfrada' },
      { nome: 'lanternaDir', forma: 'lanterna vermelha do canto direito da tampa, de x 485 a 971, de y 1059 a 1236, com a traseira, o chanfro e a lateral', tecnica: 'extrusao com eixo y da planta do canto' },
      { nome: 'lanternaEsq', forma: 'lanterna vermelha do canto esquerdo da tampa, de x -971 a -485, de y 1059 a 1236, com a traseira, o chanfro e a lateral', tecnica: 'extrusao com eixo y da planta do canto' },
      { nome: 'farolDir', forma: 'farol amarelo do canto direito do nariz, de x 728 a 971, de z 2339 a 2427, de y 882 à rampa do capô', tecnica: 'extrusao com eixo x do perfil lateral do canto' },
      { nome: 'farolEsq', forma: 'farol amarelo do canto esquerdo do nariz, de x -971 a -728, de z 2339 a 2427, de y 882 à rampa do capô', tecnica: 'extrusao com eixo x do perfil lateral do canto' },
      { nome: 'grade', forma: 'placa escura de 968 por 177 mm, de y 882 a 1059, entre os faróis, saindo 10 mm do nariz', tecnica: 'cubo encostado no nariz' },
      { nome: 'cabine', forma: 'cabine verde de y 1412 a 2294, com a frente inclinada do pé do para-brisa em z 1368 ao teto em z 662, o teto plano até z -44, a traseira inclinada até z -397 e a largura afunilando de 1942 na base a 1588 no teto', tecnica: 'interseção do perfil lateral com a seção frontal trapezoidal' },
      { nome: 'parabrisa', forma: 'placa de vidro azul clara de 20 mm sobre a face inclinada da frente da cabine, de y 1412 a 2157, de 1584 mm de largura embaixo e 1286 em cima', tecnica: 'interseção da faixa lateral paralela à face com o trapézio frontal' },
      { nome: 'vidroTraseiro', forma: 'placa de vidro azul clara de 20 mm sobre a face inclinada de trás da cabine, de y 1576 a 2131, de 1516 mm de largura embaixo e 1296 em cima', tecnica: 'interseção da faixa lateral paralela à face com o trapézio frontal' },
      { nome: 'vidroLateralDir', forma: 'janela em placa de vidro de 12 mm sobre a lateral inclinada direita da cabine, de z 150 a 967 na base, com a frente inclinada até z 576 em y 2121', tecnica: 'interseção do trapézio lateral com a casca frontal inclinada' },
      { nome: 'vidroLateralEsq', forma: 'janela em placa de vidro de 12 mm sobre a lateral inclinada esquerda da cabine, de z 150 a 967 na base, com a frente inclinada até z 576 em y 2121', tecnica: 'interseção do trapézio lateral com a casca frontal inclinada' },
      { nome: 'retrovisorDir', forma: 'caixa verde de 353 por 176 por 177 mm, da lateral da carroceria a x 1324, de y 1236 a 1412, de z 967 a 1144', tecnica: 'cubo encostado na lateral da carroceria' },
      { nome: 'retrovisorEsq', forma: 'caixa verde de 353 por 176 por 177 mm, da lateral da carroceria a x -1324, de y 1236 a 1412, de z 967 a 1144', tecnica: 'cubo encostado na lateral da carroceria' },
      { nome: 'chassiFrente', forma: 'trecho do chassi cinza escuro à frente do arco dianteiro, de y 353 a 882, de 2294 mm de largura, até z 2339', tecnica: 'extrusao com eixo x do perfil lateral com o arco' },
      { nome: 'chassiCentro', forma: 'trecho do chassi cinza escuro entre os arcos, de y 353 a 882, de 2294 mm de largura', tecnica: 'extrusao com eixo x do perfil lateral com os dois arcos' },
      { nome: 'chassiTras', forma: 'trecho do chassi cinza escuro atrás do arco traseiro, de y 353 a 882, de 2294 mm de largura, até z -2339', tecnica: 'extrusao com eixo x do perfil lateral com o arco' },
      { nome: 'paraChoqueFrente', forma: 'caixa cinza de 2294 mm de largura, de y 353 a 706 e z 2339 a 2515, com as quinas da planta fechadas até 971 de meia largura', tecnica: 'extrusao com eixo y da planta de quinas fechadas, encostada na face da frente do chassi' },
      { nome: 'paraChoqueTras', forma: 'caixa cinza de 2294 mm de largura, de y 353 a 706 e z -2515 a -2339, com as quinas da planta fechadas até 971 de meia largura', tecnica: 'extrusao com eixo y da planta de quinas fechadas, encostada na face de trás do chassi' },
      { nome: 'placaFrente', forma: 'placa clara de 618 por 309 por 88 mm, de ponta octogonal, de y 265 a 574, saindo do para-choque até z 2603', tecnica: 'extrusao com eixo z do octógono, encostada no para-choque' },
      { nome: 'placaTras', forma: 'placa clara de 618 por 309 por 88 mm, de ponta octogonal, de y 265 a 574, saindo do para-choque de trás até z -2603', tecnica: 'extrusao com eixo z do octógono, encostada no para-choque' },
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `paraLama${p}${l}`,
        forma: `anel de para-lama de 177 mm de espessura sobre a roda ${p === 'Frente' ? 'da frente' : 'de trás'} ${l === 'Dir' ? 'à direita' : 'à esquerda'}, de 590 a 688 mm de raio, sobre o chassi, de x 971 a 1147`,
        tecnica: 'extrusao com eixo x de um anel em arco, cortado na face de cima do chassi',
      }))),
      { nome: 'caixaRodaFrente', forma: 'caixa escura do arco dianteiro, de 882 mm de largura entre as faces de dentro dos pneus, com 590 mm de raio, fechada em y 353', tecnica: 'extrusao com eixo x do próprio arco do perfil, fechado na base' },
      { nome: 'caixaRodaTras', forma: 'caixa escura do arco traseiro, de 882 mm de largura entre as faces de dentro dos pneus, com 590 mm de raio, de y 353 ao assoalho em y 1059', tecnica: 'extrusao com eixo x do arco do perfil, fechado na base e no assoalho' },
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `roda${p}${l}`,
        forma: `pneu escuro de 1059 mm de diâmetro e 618 mm de largura com chanfro e furo de 640 mm para o cubo, centro em y 529,5 e z ${p === 'Frente' ? '1562' : '-1297'}, ${l === 'Dir' ? 'à direita' : 'à esquerda'}`,
        tecnica: 'lathe em torno de x, com o chanfro e o furo no perfil',
      }))),
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `cubo${p}${l}`,
        forma: `cubo cinza azulado de 640 mm de diâmetro e 88 mm de profundidade, embutido na face de fora do pneu ${p === 'Frente' ? 'da frente' : 'de trás'} ${l === 'Dir' ? 'à direita' : 'à esquerda'}, com recesso cônico no centro`,
        tecnica: 'lathe em torno de x, com o recesso no perfil',
      }))),
    ],
    criteriosDeReprovacao: [
      'a caixa total não fica em x -1324 a 1324, y 0 a 2294 e z -2603 a 2603, ou alguma roda não toca o chão',
      'um lado da picape difere do outro em medida ou posição de peça simétrica',
      'a cabine tem largura constante, e não afunila de 1942 mm na base a 1588 mm no teto, ou não é curta, só sobre a frente da caçamba',
      'a caçamba é uma laje maciça ou tem paredes altas soltas: ela deve ter assoalho a y 1059 e paredes de 177 mm que saem da borda em y 1412, com a tampa traseira de 176 mm',
      'as rodas ficam escondidas, sem arco recortado no perfil, sem caixa de roda e sem anel de para-lama saliente em volta do pneu',
      'os faróis não ficam nos cantos do nariz e as lanternas nos cantos da tampa, ou o chassi cinza não é mais largo que a carroceria',
      'a silhueta lateral, frontal ou de cima difere da referência, vista na folha comparativa, em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
