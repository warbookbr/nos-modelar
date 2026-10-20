/* trator-pa — trator de brinquedo verde com pá frontal: rodas traseiras grandes e dianteiras pequenas (pneu escuro, aro laranja, cubo
 * cinza), capô verde estreito e longo com escapamento vertical, cabine alta de moldura cinza com vidros e teto verde saliente,
 * para-lamas em arco sobre as quatro rodas, e à frente a pá verde inclinada, com dentes e dois braços até o capô.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "tractor-shovel" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/tractor-shovel.glb, que o git ignora. O que
 * entra aqui são as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765, ponto médio do comprimento em z 0)
 * e as vistas (referencias/fonte-vistas.png). O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do trator em +z, x para a direita de quem olha de frente, centrado
 * em x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve, por parte,
 * a forma, a `parte` e o `material`. A conversão para metro está em `m`, num lugar só. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita: não há carroceria contínua. A viga central, o bloco sob a cabine, os para-lamas, os braços e a placa da pá
 * são extrusões em x de um perfil lateral (z, y). O capô é a extrusão em z da seção frontal; o focinho do capô (a moldura em volta
 * da grade) e a cabine são a INTERSEÇÃO do perfil lateral extrudado em x com a seção frontal extrudada em z, e por isso a cabine
 * afunila para o teto sem nenhum vértice calculado em 3D. Uma extrusão com `eixo: 'x'` leva o perfil [u, v] a y = -u e z = v; com
 * `eixo: 'z'`, a x = u e y = -v. Os vidros são placas de 12 mm sobre as faces da cabine, com a face de dentro nos mesmos vértices
 * dela. As rodas são revoluções em torno de x (`lathe`): o pneu com o ombro chanfrado e o vão cônico do aro, o aro laranja que forra
 * esse vão e o cubo cinza. As rodas ficam inteiras para fora do corpo, sem arco recortado nem caixa de roda: a traseira se apoia no
 * bloco da cabine e a dianteira, em dois eixos curtos presos à viga, e o para-lama é um arco que abraça o pneu com folga.
 */

export const TABELA = {
  lados: 24, // contagem de lados das revoluções (pneu, aro, cubo, escapamento) e dos cilindros
  passo_arco: 15, // graus entre os vértices dos arcos dos para-lamas

  // viga central cinza: faixa de baixo de y 303 a 501, com o bloco de trás até y 897 e a ponta da frente chanfrada
  viga_meia_largura: 495,
  viga_base_y: 303,
  base_y: 501, // topo da viga e base do capô e do bloco da cabine
  viga_tras_z: -2003,
  viga_frente_base_z: 1082,
  viga_frente_z: 1170,
  bloco_tras_z: -1827,
  bloco_tras_topo_y: 897,
  barra_meia_largura: 198,
  barra_z: -2180,

  // engates: caixas de quinas chanfradas, uma atrás (barra de reboque) e outra na frente, sob o focinho
  engate_meia_largura: 309,
  engate_chanfro: 88,
  engate_tras_y0: 677,
  engate_tras_y1: 985,
  engate_tras_z: -2092,
  engate_frente_y0: 347,
  engate_frente_y1: 656,
  engate_frente_z: 1258,

  // bloco cinza sob a cabine, entre os para-lamas de trás: a face de fora é o plano onde assenta a roda de trás
  bloco_meia_largura: 861,
  bloco_topo_y: 1392,
  bloco_frente_z: -45,

  // capô verde: seção com os ombros chanfrados; o focinho (z 1170 a 1346) é uma moldura em U em volta da grade e de baixo chanfrado
  capo_meia_largura: 693,
  capo_ombro_y: 1293,
  capo_topo_meia_largura: 594,
  capo_topo_y: 1392,
  capo_tras_z: -45,
  focinho_z: 1170,
  capo_frente_z: 1346,
  focinho_base_y: 678, // y da quina de baixo do focinho, em z 1346 (a base chanfrada sobe de y 501, em z 1170, até aqui)
  grade_meia_largura: 495,
  grade_y0: 678,
  grade_y1: 1194,
  grade_espessura: 20,

  // cabine: casca cinza que afunila da base ao teto, com a frente e a traseira inclinadas
  cabine_meia_largura_topo: 759,
  cabine_topo_y: 2580,
  cabine_frente_topo_z: -409,
  cabine_tras_base_z: -1827,
  cabine_tras_topo_z: -1650,

  // teto verde saliente: laje de 89 mm com a viseira da frente cortada em chanfro
  teto_y: 2669,
  teto_tras_z: -1739,
  teto_frente_z: -232,
  teto_viseira_y: 2625,

  // vidros: placas de 12 mm sobre as faces da cabine
  vidro_espessura: 12,
  parabrisa_meia_largura_base: 693,
  parabrisa_ombro_y: 1582,
  parabrisa_meia_largura_ombro: 671,
  parabrisa_topo_y: 2391,
  parabrisa_meia_largura_topo: 581,
  vidro_lateral_y0: 1560,
  vidro_lateral_z0: -1632,
  vidro_lateral_z1: -548,
  vidro_lateral_ponta_z: -352,
  vidro_lateral_ponta_y: 1822,
  vidro_lateral_y1: 2413,
  vidro_lateral_topo_z0: -1505,
  vidro_lateral_topo_z1: -534,
  vidro_tras_y0: 1535,
  vidro_tras_meia_largura_y0: 730,
  vidro_tras_y1: 2438,
  vidro_tras_meia_largura_y1: 630,

  // retrovisores: caixas verdes ao lado da frente da cabine
  retrovisor_x1: 1089,
  retrovisor_y0: 1194,
  retrovisor_y1: 1590,
  retrovisor_z0: -243,

  // escapamento (base larga, tubo fino e boca) e tampa do filtro, sobre o capô
  escapamento_x: 321,
  escapamento_z: 258,
  escapamento_raio_base: 153,
  escapamento_altura_base: 127,
  escapamento_raio_tubo: 58,
  escapamento_raio_boca: 82,
  escapamento_altura: 634,
  escapamento_altura_boca: 36,
  filtro_x: 225,
  filtro_z: 588,
  filtro_raio: 102,
  filtro_altura_base: 84,
  filtro_raio_topo: 55,
  filtro_altura: 154,

  // pá: pivô redondo na lateral do capô, braço diagonal até a placa e placa verde com tampo cinza e sete dentes
  pivo_x0: 693,
  pivo_x1: 867,
  pivo_z: 1114,
  pivo_y: 1205,
  pivo_raio: 145,
  braco_x0: 867,
  braco_x1: 1011,
  braco_lado: [[1100, 1147], [1258, 1147], [1489, 468], [1551, 424], [1717, 424], [1717, 561], [1602, 561], [1375, 1219], [1313, 1263], [1100, 1263]],
  pa_meia_largura: 1156,
  pa_z0: 1717,
  pa_z1: 1894,
  pa_topo_y: 1257,
  pa_tampo_espessura: 20,
  pa_base_tras_y: 338,
  pa_base_frente_y: 411,
  pa_ponta_z: 2108,
  pa_ponta_y: 197,
  pa_pe_z: 1983,
  pa_pe_y: 72,
  dente_fundo_z: 2055,
  dente_ponta_z: 2180,
  dente_ponta_y: 125,
  dentes_x: [[0, 105], [315, 525], [736, 946], [946, 1156]], // metade direita; o primeiro é o dente do centro (de -105 a 105)

  // para-lamas: arco de 199 mm de espessura sobre cada roda; o de trás é de x 861 a 1287, com a cauda inclinada; o da frente é de x 693 a 1089
  pl_tras_x0: 861,
  pl_tras_x1: 1287,
  pl_tras_raio_interno: 780,
  pl_tras_espessura: 199,
  pl_tras_frente_z: -243,
  pl_tras_frente_y: 798,
  pl_tras_fundo_z: -431, // fica no arco: o raio interno vai até y 772 e desce reto até a base
  pl_tras_cauda: 390,
  pl_frente_x0: 693,
  pl_frente_x1: 1089,
  pl_frente_raio_interno: 482,
  pl_frente_espessura: 199,
  pl_frente_tras_z: -45,
  pl_frente_saia_z: 137,
  pl_frente_saia_y: 798,
  degrau_x1: 1089, // o degrau entre o para-lama de trás e o da frente vai de x 861 (face do bloco) a 1089
  degrau_y1: 798,
  degrau_z0: -243,

  // rodas de trás: pneu de 1544 mm de diâmetro e 604 de largura; de frente: 948 e 436
  roda_tras_x0: 861,
  roda_tras_z: -1211,
  roda_tras_raio: 772,
  roda_tras_largura: 604,
  roda_tras_raio_face: 657,
  roda_tras_ombro_dentro: 176,
  roda_tras_ombro_fora: 347,
  roda_tras_raio_aro: 516,
  roda_tras_fundo: 476,
  roda_tras_raio_fundo: 330,
  roda_tras_cubo_base: 201,
  roda_tras_cubo_topo: 156,
  roda_frente_x0: 732,
  roda_frente_z: 728,
  roda_frente_raio: 474,
  roda_frente_largura: 436,
  roda_frente_raio_face: 402,
  roda_frente_ombro_dentro: 176,
  roda_frente_ombro_fora: 278,
  roda_frente_raio_aro: 261,
  roda_frente_fundo: 278,
  roda_frente_raio_fundo: 150,
  roda_frente_cubo_base: 132,
  roda_frente_cubo_topo: 174,
  aro_folga: 30, // espessura radial e axial do forro laranja do vão do pneu
  eixo_raio: 22,
};

const m = (mm) => mm / 1000;

/* ---------- geometria 2D em milímetro ---------- */

const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* o núcleo gira a extrusão em x de y para x: [u, v] vai a y = -u, z = v. Entra [z, y]. */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z]));
/* a extrusão em z leva [u, v] a x = u, y = -v. Entra [x, y]. */
const secaoFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y]));

/* x ao longo de y pela reta que passa por (y0, x0) e (y1, x1), válida também fora do intervalo. */
const reta = (y0, x0, y1, x1) => (y) => x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
/* O paralelogramo da aresta P-Q deslocado `e` para fora, na direção da normal `n`; a face de dentro usa os mesmos vértices. */
function placaSobre(P, Q, e, n) {
  const k = e / Math.hypot(...n);
  return [P, Q, [Q[0] + n[0] * k, Q[1] + n[1] * k], [P[0] + n[0] * k, P[1] + n[1] * k]];
}
const arredonda = (v) => Math.round(v * 100) / 100;
/* O ponto [z, y] do círculo de centro (zc, yc) e raio r, a `grau` graus da frente (+z) para cima. */
const noArco = (zc, yc, r, grau) => {
  const a = (grau * Math.PI) / 180;
  return [arredonda(zc + r * Math.cos(a)), arredonda(yc + r * Math.sin(a))];
};
const graus = (de, ate, passo) => {
  const saida = [];
  for (let g = de; de <= ate ? g <= ate + 1e-9 : g >= ate - 1e-9; g += de <= ate ? passo : -passo) saida.push(g);
  return saida;
};

/* O perfil de revolução do pneu: ombro chanfrado dos dois lados e, na face de fora, o vão cônico onde entra o aro. `w` é o conjunto
 * de medidas da roda (largura, raio, raio da face, ombros, aro e fundo). Devolve [raio, axial] do pneu, do aro e do cubo, com o eixo
 * axial crescendo da face de dentro para a de fora. */
function perfisDaRoda(w, folga) {
  const aB = w.fundo - folga;
  const rB = w.raio_fundo + folga;
  const rC = w.raio_aro + folga;
  return {
    pneu: [[0, 0], [w.raio_face, 0], [w.raio, w.ombro_dentro], [w.raio, w.ombro_fora], [w.raio_face, w.largura], [rC, w.largura], [rB, aB], [0, aB]],
    aro: [[0, aB], [rB, aB], [rC, w.largura], [w.raio_aro, w.largura], [w.raio_fundo, w.fundo], [0, w.fundo]],
    cubo: [[0, w.fundo], [w.cubo_base, w.fundo], [w.cubo_topo, w.largura], [0, w.largura]],
  };
}
/* A roda do lado esquerdo é o espelho da direita: o axial vira largura menos o axial. */
const espelhaAxial = (perfil, largura) => perfil.map(([r, a]) => [r, largura - a]);

/* ---------- derivar ---------- */

/* Cada forma tem `nome`, `forma` (lateral, secaoZ, vistas, cubo, cilindro ou lathe), `material` e as medidas da forma, em milímetro. */
export function derivar(T) {
  const formas = [];
  const lados = [['Dir', 1], ['Esq', -1]];
  const retangulo = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  const octogono = (meia, c, y0, y1) => [[-(meia - c), y0], [meia - c, y0], [meia, y0 + c], [meia, y1 - c], [meia - c, y1],
    [-(meia - c), y1], [-meia, y1 - c], [-meia, y0 + c]];

  /* viga central: perfil em L de y 303 a 501, com o bloco de trás até y 897 e a ponta da frente chanfrada */
  formas.push({
    nome: 'chassi', forma: 'lateral', material: 'cinza', x0: -T.viga_meia_largura, largura: 2 * T.viga_meia_largura,
    lado: [[T.viga_tras_z, T.viga_base_y], [T.viga_frente_base_z, T.viga_base_y], [T.viga_frente_z, T.base_y], [T.bloco_tras_z, T.base_y],
      [T.bloco_tras_z, T.bloco_tras_topo_y], [T.viga_tras_z, T.bloco_tras_topo_y]],
  });
  formas.push({
    nome: 'barraDeTracao', forma: 'cubo', material: 'cinza', larg: 2 * T.barra_meia_largura, alt: T.base_y - T.viga_base_y, prof: T.viga_tras_z - T.barra_z,
    em: [0, T.viga_base_y, (T.viga_tras_z + T.barra_z) / 2],
  });
  formas.push({
    nome: 'engateTras', forma: 'secaoZ', material: 'cinza', z0: T.engate_tras_z, z1: T.viga_tras_z,
    secao: octogono(T.engate_meia_largura, T.engate_chanfro, T.engate_tras_y0, T.engate_tras_y1),
  });
  formas.push({
    nome: 'engateFrente', forma: 'secaoZ', material: 'cinza', z0: T.viga_frente_z, z1: T.engate_frente_z,
    secao: octogono(T.engate_meia_largura, T.engate_chanfro, T.engate_frente_y0, T.engate_frente_y1),
  });

  /* bloco sob a cabine: caixa cinza da viga até o fundo da cabine, de z -1827 a -45 */
  formas.push({
    nome: 'blocoCabine', forma: 'cubo', material: 'cinza', larg: 2 * T.bloco_meia_largura, alt: T.bloco_topo_y - T.base_y,
    prof: T.bloco_frente_z - T.bloco_tras_z, em: [0, T.base_y, (T.bloco_frente_z + T.bloco_tras_z) / 2],
  });

  /* capô: seção frontal de ombros chanfrados extrudada de z -45 a 1170; o focinho é a moldura em U (aberta embaixo, em volta da grade)
   * cortada pelo perfil lateral de baixo chanfrado */
  const M = T.capo_meia_largura;
  const secaoCapo = (yBase) => [[-M, yBase], [M, yBase], [M, T.capo_ombro_y], [T.capo_topo_meia_largura, T.capo_topo_y],
    [-T.capo_topo_meia_largura, T.capo_topo_y], [-M, T.capo_ombro_y]];
  formas.push({ nome: 'capo', forma: 'secaoZ', material: 'verde', secao: secaoCapo(T.base_y), z0: T.capo_tras_z, z1: T.focinho_z });
  const G = T.grade_meia_largura;
  const inclinacaoFocinho = (T.focinho_base_y - T.base_y) / (T.capo_frente_z - T.focinho_z);
  const yFocinho = (z) => T.base_y + (z - T.focinho_z) * inclinacaoFocinho;
  const baixoU = T.base_y - 50;
  formas.push({
    nome: 'focinhoDoCapo', forma: 'vistas', material: 'verde', z0: T.focinho_z, z1: T.capo_frente_z,
    lado: [[T.focinho_z - 100, yFocinho(T.focinho_z - 100)], [T.capo_frente_z + 100, yFocinho(T.capo_frente_z + 100)],
      [T.capo_frente_z + 100, T.capo_topo_y + 100], [T.focinho_z - 100, T.capo_topo_y + 100]],
    frontal: [[-M, baixoU], [-G, baixoU], [-G, T.grade_y1], [G, T.grade_y1], [G, baixoU], [M, baixoU], [M, T.capo_ombro_y],
      [T.capo_topo_meia_largura, T.capo_topo_y], [-T.capo_topo_meia_largura, T.capo_topo_y], [-M, T.capo_ombro_y]],
  });
  formas.push({
    nome: 'grade', forma: 'cubo', material: 'cinza', larg: 2 * G, alt: T.grade_y1 - T.grade_y0, prof: T.grade_espessura,
    em: [0, T.grade_y0, T.focinho_z + T.grade_espessura / 2],
  });

  /* cabine: o perfil lateral de pilar a pilar e a seção frontal que afunila da base ao teto */
  const xCabine = reta(T.bloco_topo_y, T.bloco_meia_largura, T.cabine_topo_y, T.cabine_meia_largura_topo);
  const yA = T.bloco_topo_y - 100;
  const yB = T.cabine_topo_y + 100;
  const zFrente = reta(T.bloco_topo_y, T.bloco_frente_z, T.cabine_topo_y, T.cabine_frente_topo_z); // z da face inclinada da frente
  const zTras = reta(T.bloco_topo_y, T.cabine_tras_base_z, T.cabine_topo_y, T.cabine_tras_topo_z); // z da face inclinada de trás
  formas.push({
    nome: 'cabine', forma: 'vistas', material: 'cinza',
    lado: [[T.bloco_frente_z, T.bloco_topo_y], [T.cabine_frente_topo_z, T.cabine_topo_y], [T.cabine_tras_topo_z, T.cabine_topo_y],
      [T.cabine_tras_base_z, T.bloco_topo_y]],
    frontal: [[-xCabine(yA), yA], [xCabine(yA), yA], [xCabine(yB), yB], [-xCabine(yB), yB]],
  });
  formas.push({
    nome: 'teto', forma: 'lateral', material: 'verde', x0: -T.cabine_meia_largura_topo, largura: 2 * T.cabine_meia_largura_topo,
    lado: [[T.teto_tras_z, T.cabine_topo_y], [T.teto_frente_z, T.cabine_topo_y], [T.teto_frente_z, T.teto_viseira_y],
      [T.cabine_frente_topo_z, T.teto_y], [T.teto_tras_z, T.teto_y]],
  });

  /* vidros: placas de 12 mm sobre as faces da cabine, com a face de dentro nos mesmos vértices da face que cobrem */
  const e = T.vidro_espessura;
  const Pp = [zFrente(T.bloco_topo_y), T.bloco_topo_y];
  const Qp = [zFrente(T.parabrisa_topo_y), T.parabrisa_topo_y];
  const xPara = (y) => (y <= T.parabrisa_ombro_y
    ? reta(T.bloco_topo_y, T.parabrisa_meia_largura_base, T.parabrisa_ombro_y, T.parabrisa_meia_largura_ombro)(y)
    : reta(T.parabrisa_ombro_y, T.parabrisa_meia_largura_ombro, T.parabrisa_topo_y, T.parabrisa_meia_largura_topo)(y));
  const yPa = T.bloco_topo_y - 40;
  const yPb = T.parabrisa_topo_y + 100;
  formas.push({
    nome: 'parabrisa', forma: 'vistas', material: 'vidro',
    lado: placaSobre(Pp, Qp, e, [Qp[1] - Pp[1], Pp[0] - Qp[0]]),
    frontal: [[-xPara(yPa), yPa], [xPara(yPa), yPa], [xPara(T.parabrisa_ombro_y), T.parabrisa_ombro_y], [xPara(yPb), yPb],
      [-xPara(yPb), yPb], [-xPara(T.parabrisa_ombro_y), T.parabrisa_ombro_y]],
  });
  const Pt = [zTras(T.vidro_tras_y1), T.vidro_tras_y1];
  const Qt = [zTras(T.vidro_tras_y0), T.vidro_tras_y0];
  const xTras = reta(T.vidro_tras_y0, T.vidro_tras_meia_largura_y0, T.vidro_tras_y1, T.vidro_tras_meia_largura_y1);
  formas.push({
    nome: 'vidroTraseiro', forma: 'vistas', material: 'vidro',
    lado: placaSobre(Pt, Qt, e, [Qt[1] - Pt[1], Pt[0] - Qt[0]]),
    frontal: [[-xTras(T.vidro_tras_y0 - 100), T.vidro_tras_y0 - 100], [xTras(T.vidro_tras_y0 - 100), T.vidro_tras_y0 - 100],
      [xTras(T.vidro_tras_y1 + 100), T.vidro_tras_y1 + 100], [-xTras(T.vidro_tras_y1 + 100), T.vidro_tras_y1 + 100]],
  });
  const janela = [[T.vidro_lateral_z0, T.vidro_lateral_y0], [T.vidro_lateral_z1, T.vidro_lateral_y0],
    [T.vidro_lateral_ponta_z, T.vidro_lateral_ponta_y], [T.vidro_lateral_topo_z1, T.vidro_lateral_y1],
    [T.vidro_lateral_topo_z0, T.vidro_lateral_y1]];
  for (const [lado, s] of lados) {
    const Pa = [xCabine(yA), yA];
    const Pb = [xCabine(yB), yB];
    const placa = placaSobre(Pa, Pb, e, [Pb[1] - Pa[1], Pa[0] - Pb[0]]);
    formas.push({
      nome: `vidroLateral${lado}`, forma: 'vistas', material: 'vidro', lado: janela,
      frontal: placa.map(([x, y]) => [s * x, y]),
    });
  }

  /* retrovisores: caixas verdes ao lado da frente da cabine, de x 861 a 1089, de y 1194 a 1590 */
  for (const [lado, s] of lados) {
    const larg = T.retrovisor_x1 - T.bloco_meia_largura;
    formas.push({
      nome: `retrovisor${lado}`, forma: 'cubo', material: 'verde', larg, alt: T.retrovisor_y1 - T.retrovisor_y0, prof: T.bloco_frente_z - T.retrovisor_z0,
      em: [s * (T.bloco_meia_largura + larg / 2), T.retrovisor_y0, (T.retrovisor_z0 + T.bloco_frente_z) / 2],
    });
  }

  /* escapamento e tampa do filtro: revoluções em torno de y, sobre o topo do capô */
  formas.push({
    nome: 'escapamento', forma: 'lathe', material: 'cinza', liso: true, eixo: 'y',
    perfil: [[0, 0], [T.escapamento_raio_base, 0], [T.escapamento_raio_base, T.escapamento_altura_base],
      [T.escapamento_raio_tubo, T.escapamento_altura_base], [T.escapamento_raio_tubo, T.escapamento_altura - T.escapamento_altura_boca],
      [T.escapamento_raio_boca, T.escapamento_altura - T.escapamento_altura_boca], [T.escapamento_raio_boca, T.escapamento_altura],
      [0, T.escapamento_altura]],
    em: [T.escapamento_x, T.capo_topo_y, T.escapamento_z],
  });
  formas.push({
    nome: 'tampaDoFiltro', forma: 'lathe', material: 'cinza', liso: true, eixo: 'y',
    perfil: [[0, 0], [T.filtro_raio, 0], [T.filtro_raio, T.filtro_altura_base], [T.filtro_raio_topo, T.filtro_altura_base],
      [T.filtro_raio_topo, T.filtro_altura], [0, T.filtro_altura]],
    em: [T.filtro_x, T.capo_topo_y, T.filtro_z],
  });

  /* pá: pivô redondo na lateral do capô, braço diagonal até a placa */
  for (const [lado, s] of lados) {
    formas.push({
      nome: `pivo${lado}`, forma: 'cilindro', material: 'cinza', liso: true, raio: T.pivo_raio, altura: T.pivo_x1 - T.pivo_x0,
      em: [s > 0 ? T.pivo_x0 : -T.pivo_x1, T.pivo_y, T.pivo_z],
    });
    formas.push({
      nome: `braco${lado}`, forma: 'lateral', material: 'cinza', x0: s > 0 ? T.braco_x0 : -T.braco_x1, largura: T.braco_x1 - T.braco_x0,
      lado: T.braco_lado,
    });
  }
  /* placa da pá: perfil em cunha (de trás, y 338 a 1237; a frente em z 1894, a ponta em 45 graus) com tampo cinza de 20 mm; dentes de
   * 45 graus, cada um um paralelogramo que sai da face de baixo da cunha */
  const yTopoPa = T.pa_topo_y - T.pa_tampo_espessura;
  const P = T.pa_meia_largura;
  formas.push({
    nome: 'placaDaPa', forma: 'lateral', material: 'verde', x0: -P, largura: 2 * P,
    lado: [[T.pa_z0, T.pa_base_tras_y], [T.pa_z0, yTopoPa], [T.pa_z1, yTopoPa], [T.pa_z1, T.pa_base_frente_y], [T.pa_ponta_z, T.pa_ponta_y],
      [T.pa_pe_z, T.pa_pe_y]],
  });
  formas.push({
    nome: 'tampoDaPa', forma: 'lateral', material: 'cinza', x0: -P, largura: 2 * P,
    lado: [[T.pa_z0, yTopoPa], [T.pa_z1, yTopoPa], [T.pa_z1, T.pa_topo_y], [T.pa_z0, T.pa_topo_y]],
  });
  const denteLado = [[T.pa_pe_z, T.pa_pe_y], [T.dente_fundo_z, 0], [T.dente_ponta_z, T.dente_ponta_y], [T.pa_ponta_z, T.pa_ponta_y]];
  T.dentes_x.forEach(([x0, x1], k) => {
    if (k === 0) {
      formas.push({ nome: 'denteCentro', forma: 'lateral', material: 'cinza', x0: -x1, largura: 2 * x1, lado: denteLado });
      return;
    }
    for (const [lado, s] of lados) {
      formas.push({ nome: `dente${lado}${k}`, forma: 'lateral', material: 'cinza', x0: s > 0 ? x0 : -x1, largura: x1 - x0, lado: denteLado });
    }
  });

  /* para-lamas de trás: arco de 15 em 15 graus sobre a roda, de x 861 a 1287, com a cauda inclinada a 45 graus e a ponta da frente que
   * desce reto até a base */
  const rT = T.roda_tras_raio;
  const zT = T.roda_tras_z;
  const rInt = T.pl_tras_raio_interno;
  const rExt = rInt + T.pl_tras_espessura;
  const cauda = T.pl_tras_cauda / Math.SQRT2;
  const ext135 = noArco(zT, rT, rExt, 135);
  const int135 = noArco(zT, rT, rInt, 135);
  const [zIntFim] = noArco(zT, rT, rInt, 0);
  formas.push({
    nome: 'paraLamaTrasDir', forma: 'lateral', material: 'cinza', x0: T.pl_tras_x0, largura: T.pl_tras_x1 - T.pl_tras_x0,
    lado: [[T.pl_tras_frente_z, T.base_y], [T.pl_tras_frente_z, T.pl_tras_frente_y],
      ...graus(15, 135, T.passo_arco).map((g) => noArco(zT, rT, rExt, g)),
      [arredonda(ext135[0] - cauda), arredonda(ext135[1] - cauda)], [arredonda(int135[0] - cauda), arredonda(int135[1] - cauda)],
      ...graus(135, 0, T.passo_arco).map((g) => noArco(zT, rT, rInt, g)),
      [zIntFim, T.base_y]],
  });
  formas.push({
    nome: 'paraLamaTrasEsq', forma: 'lateral', material: 'cinza', x0: -T.pl_tras_x1, largura: T.pl_tras_x1 - T.pl_tras_x0,
    lado: formas[formas.length - 1].lado,
  });

  /* para-lamas da frente: saia de y 501 a 798 que sobe até o arco de 15 em 15 graus (de 45 a 135 graus por fora, de 45 a 165 por dentro) */
  const rF = T.roda_frente_raio;
  const zF = T.roda_frente_z;
  const rIntF = T.pl_frente_raio_interno;
  const rExtF = rIntF + T.pl_frente_espessura;
  const zFimF = arredonda(zF - Math.sqrt(rIntF ** 2 - (T.base_y - rF) ** 2));
  const arcoFrente = [
    [T.pl_frente_tras_z, T.base_y], [zFimF, T.base_y],
    ...graus(165, 45, T.passo_arco).map((g) => noArco(zF, rF, rIntF, g)),
    ...graus(45, 135, T.passo_arco).map((g) => noArco(zF, rF, rExtF, g)),
    [T.pl_frente_saia_z, T.pl_frente_saia_y], [T.pl_frente_tras_z, T.pl_frente_saia_y],
  ];
  formas.push({
    nome: 'paraLamaFrenteDir', forma: 'lateral', material: 'cinza', x0: T.pl_frente_x0, largura: T.pl_frente_x1 - T.pl_frente_x0, lado: arcoFrente,
  });
  formas.push({
    nome: 'paraLamaFrenteEsq', forma: 'lateral', material: 'cinza', x0: -T.pl_frente_x1, largura: T.pl_frente_x1 - T.pl_frente_x0, lado: arcoFrente,
  });
  for (const [lado, s] of lados) {
    const larg = T.degrau_x1 - T.bloco_meia_largura;
    formas.push({
      nome: `degrau${lado}`, forma: 'cubo', material: 'cinza', larg, alt: T.degrau_y1 - T.base_y, prof: T.pl_frente_tras_z - T.degrau_z0,
      em: [s * (T.bloco_meia_largura + larg / 2), T.base_y, (T.degrau_z0 + T.pl_frente_tras_z) / 2],
    });
  }

  /* eixos curtos da frente, da viga até a face de dentro do pneu (a roda de trás assenta no bloco da cabine) */
  for (const [lado, s] of lados) {
    formas.push({
      nome: `eixoFrente${lado}`, forma: 'cilindro', material: 'cinza', liso: true, raio: T.eixo_raio, altura: T.roda_frente_x0 - T.viga_meia_largura,
      em: [s > 0 ? T.viga_meia_largura : -T.roda_frente_x0, T.roda_frente_raio, T.roda_frente_z],
    });
  }

  /* rodas: pneu, aro e cubo, revoluções em torno de x */
  const medidasRoda = {
    Tras: {
      x0: T.roda_tras_x0, zc: zT, yc: T.roda_tras_raio,
      w: {
        largura: T.roda_tras_largura, raio: T.roda_tras_raio, raio_face: T.roda_tras_raio_face, ombro_dentro: T.roda_tras_ombro_dentro,
        ombro_fora: T.roda_tras_ombro_fora, raio_aro: T.roda_tras_raio_aro, fundo: T.roda_tras_fundo, raio_fundo: T.roda_tras_raio_fundo,
        cubo_base: T.roda_tras_cubo_base, cubo_topo: T.roda_tras_cubo_topo,
      },
    },
    Frente: {
      x0: T.roda_frente_x0, zc: zF, yc: T.roda_frente_raio,
      w: {
        largura: T.roda_frente_largura, raio: T.roda_frente_raio, raio_face: T.roda_frente_raio_face, ombro_dentro: T.roda_frente_ombro_dentro,
        ombro_fora: T.roda_frente_ombro_fora, raio_aro: T.roda_frente_raio_aro, fundo: T.roda_frente_fundo, raio_fundo: T.roda_frente_raio_fundo,
        cubo_base: T.roda_frente_cubo_base, cubo_topo: T.roda_frente_cubo_topo,
      },
    },
  };
  for (const [ponta, r] of Object.entries(medidasRoda)) {
    const perfis = perfisDaRoda(r.w, T.aro_folga);
    for (const [lado, s] of lados) {
      const L = r.w.largura;
      const adapta = (p) => (s > 0 ? p : espelhaAxial(p, L));
      const x = s > 0 ? r.x0 : -(r.x0 + L);
      formas.push({ nome: `roda${ponta}${lado}`, forma: 'lathe', material: 'pneu', liso: true, eixo: 'x', perfil: adapta(perfis.pneu), em: [x, r.yc, r.zc] });
      formas.push({ nome: `aro${ponta}${lado}`, forma: 'lathe', material: 'aro', liso: true, eixo: 'x', perfil: adapta(perfis.aro), em: [x, r.yc, r.zc] });
      formas.push({ nome: `cubo${ponta}${lado}`, forma: 'lathe', material: 'cubo', liso: true, eixo: 'x', perfil: adapta(perfis.cubo), em: [x, r.yc, r.zc] });
    }
  }
  return formas;
}

/* ---------- passos ---------- */

const emMetro = (v) => v.map(m);
const perfilM = (pontos) => pontos.map(([u, v]) => [m(u), m(v)]);

/* Os passos de uma forma, com os ids do bloco `base`: a forma leva base + 1 (e base + 2 na segunda extrusão) e a interseção, base + 10. */
function passosDaForma(f, base, T) {
  const passos = [];
  let sel;
  if (f.forma === 'vistas') {
    const L = T.pa_meia_largura + 200;
    const z0 = f.z0 ?? -2400;
    const z1 = f.z1 ?? 2400;
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilM(perfilLateral(f.lado)) }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: m(z1 - z0), em: [0, 0, m(z0)], perfil: perfilM(secaoFrontal(f.frontal)) }]);
    passos.push(['intersectar', { origemId: base + 10, solidos: [{ origem: { op: 'extrusao', id: base + 1 } }, { origem: { op: 'extrusao', id: base + 2 } }] }]);
    sel = { origem: { op: 'intersectar', id: base + 10 } };
  } else if (f.forma === 'lateral') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(f.largura), em: [m(f.x0), 0, 0], perfil: perfilM(perfilLateral(f.lado)) }]);
    sel = { origem: { op: 'extrusao', id: base + 1 } };
  } else if (f.forma === 'secaoZ') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'z', altura: m(f.z1 - f.z0), em: [0, 0, m(f.z0)], perfil: perfilM(secaoFrontal(f.secao)) }]);
    sel = { origem: { op: 'extrusao', id: base + 1 } };
  } else if (f.forma === 'cubo') {
    passos.push(['cubo', { origemId: base + 1, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: emMetro(f.em) }]);
    sel = { origem: { op: 'cubo', id: base + 1 } };
  } else if (f.forma === 'cilindro') {
    passos.push(['cilindro', { origemId: base + 1, raio: m(f.raio), altura: m(f.altura), lados: T.lados, eixo: 'x', em: emMetro(f.em) }]);
    sel = { alias: `${f.nome}Inteiro` };
  } else {
    const passo = { origemId: base + 1, perfil: perfilM(f.perfil), lados: T.lados, em: emMetro(f.em) };
    if (f.eixo === 'x') passo.eixo = 'x';
    passos.push(['lathe', passo]);
    sel = { origem: { op: 'lathe', id: base + 1 } };
  }
  passos.push(['parte', { nome: f.nome, sel }]);
  passos.push(['material', { sel, usa: f.material }]);
  if (f.liso) passos.push(['liso', { angulo: 30, sel }]);
  return passos;
}

/* Os ids de bloco: a forma `k` leva 100 * (k + 1). */
const blocoDe = (k) => 100 * (k + 1);

/* Um cilindro inteiro é a lateral mais as duas tampas; sem as tampas a seleção deixa as faces sem parte. */
const cilindroInteiro = (id) => ({
  unir: [
    { origem: { op: 'cilindro', id } },
    { origem: { op: 'cilindro', id, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id, tampa: 'topo' } },
  ],
});

export const ALIASES = derivar(TABELA).flatMap((f, k) => (f.forma === 'cilindro' ? [[`${f.nome}Inteiro`, cilindroInteiro(blocoDe(k) + 1)]] : []));

/** Os PASSOS: cada forma, a `parte` e o `material` logo depois. */
export function gerarPassos(T) {
  return derivar(T).flatMap((f, k) => passosDaForma(f, blocoDe(k), T));
}

/* ---------- contatos ---------- */

const LADOS = ['Dir', 'Esq'];
const PONTAS = ['Frente', 'Tras'];
const DENTES = ['denteCentro', ...[1, 2, 3].flatMap((k) => LADOS.map((l) => `dente${l}${k}`))];

export const CONTATOS = [
  { par: ['chassi', 'blocoCabine'], motivo: 'a face de baixo do bloco da cabine, em y 501, assenta na face de cima da viga, entre z -1827 e -45' },
  { par: ['chassi', 'capo'], motivo: 'a face de baixo do capô, em y 501, assenta na face de cima da viga, entre z -45 e 1170' },
  { par: ['chassi', 'barraDeTracao'], motivo: 'a face da frente da barra de reboque encosta na face de trás da viga, em z -2003' },
  { par: ['chassi', 'engateTras'], motivo: 'a face da frente do engate de trás encosta na face de trás do bloco da viga, em z -2003' },
  { par: ['engateFrente', 'capo'], motivo: 'a face de trás do engate da frente encosta na face da frente do capô, em z 1170' },
  { par: ['blocoCabine', 'capo'], motivo: 'a face de trás do capô, em z -45, encosta na face da frente do bloco da cabine' },
  { par: ['blocoCabine', 'cabine'], motivo: 'a face de baixo da cabine, em y 1392, assenta na face de cima do bloco, de x -861 a 861' },
  { par: ['cabine', 'teto'], motivo: 'a face de baixo do teto, em y 2580, assenta na face de cima da cabine, de x -759 a 759' },
  { par: ['cabine', 'parabrisa'], motivo: 'a face de dentro do para-brisa é o mesmo plano da face inclinada da frente da cabine' },
  { par: ['cabine', 'vidroTraseiro'], motivo: 'a face de dentro do vidro traseiro é o mesmo plano da face inclinada de trás da cabine' },
  { par: ['cabine', 'vidroLateralDir'], motivo: 'a face de dentro do vidro lateral direito é o mesmo plano da lateral inclinada da cabine' },
  { par: ['cabine', 'vidroLateralEsq'], motivo: 'a face de dentro do vidro lateral esquerdo é o mesmo plano da lateral inclinada da cabine' },
  { par: ['capo', 'parabrisa'], motivo: 'a aresta de baixo do para-brisa, em y 1392 e z -45, toca o topo do capô, só pela aresta' },
  { par: ['capo', 'cabine'], motivo: 'a aresta de baixo da face da frente da cabine, em y 1392 e z -45, toca o canto de trás do capô, só pela aresta' },
  { par: ['capo', 'focinhoDoCapo'], motivo: 'a face de trás do focinho encosta na face da frente do capô, em z 1170, nos dois braços do U' },
  { par: ['capo', 'grade'], motivo: 'a face de trás da grade encosta na face da frente do capô, em z 1170, de x -495 a 495' },
  { par: ['blocoCabine', 'parabrisa'], motivo: 'a aresta de baixo do para-brisa toca a aresta de cima da frente do bloco, em y 1392 e z -45, só pela aresta' },
  { par: ['capo', 'escapamento'], motivo: 'a face de baixo do escapamento, em y 1392, assenta no topo do capô' },
  { par: ['capo', 'tampaDoFiltro'], motivo: 'a face de baixo da tampa do filtro, em y 1392, assenta no topo do capô' },
  { par: ['chassi', 'focinhoDoCapo'], motivo: 'a quina de baixo do focinho, em y 501 e z 1170, toca a quina da frente da viga, só pela aresta' },
  { par: ['chassi', 'engateFrente'], motivo: 'a quina da frente da viga, em y 501 e z 1170, toca a face de trás do engate da frente, só pela aresta' },
  { par: ['focinhoDoCapo', 'grade'], motivo: 'as faces de dentro do U do focinho, em x 495 e -495 e em y 1194, encostam nas bordas da grade' },
  ...LADOS.flatMap((l) => [
    { par: [`retrovisor${l}`, 'blocoCabine'], motivo: 'a face de dentro do retrovisor encosta na lateral do bloco da cabine, em x 861 ou -861, de y 1194 a 1392' },
    { par: [`retrovisor${l}`, 'cabine'], motivo: 'a face de dentro do retrovisor toca a aresta de baixo da lateral da cabine, em x 861 e y 1392, só pela aresta' },
    { par: [`pivo${l}`, 'capo'], motivo: 'a face de dentro do pivô encosta na lateral do capô, em x 693 ou -693' },
    { par: [`pivo${l}`, 'focinhoDoCapo'], motivo: 'a face de dentro do pivô encosta na lateral do focinho, em x 693 ou -693, de z 1170 a 1259' },
    { par: [`pivo${l}`, `braco${l}`], motivo: 'a face de fora do pivô encosta na face de dentro do braço, em x 867 ou -867' },
    { par: [`braco${l}`, 'placaDaPa'], motivo: 'a ponta do braço, em z 1717, encosta na face de trás da placa da pá' },
    { par: [`paraLamaTras${l}`, 'blocoCabine'], motivo: 'a face de dentro do para-lama de trás encosta na lateral do bloco da cabine, em x 861 ou -861' },
    { par: [`paraLamaTras${l}`, `degrau${l}`], motivo: 'a face da frente do para-lama de trás encosta na face de trás do degrau, em z -243' },
    { par: [`paraLamaFrente${l}`, 'capo'], motivo: 'a face de dentro do para-lama da frente encosta na lateral do capô, em x 693 ou -693' },
    { par: [`paraLamaFrente${l}`, `degrau${l}`], motivo: 'a face de trás do para-lama da frente encosta na face da frente do degrau, em z -45' },
    { par: [`paraLamaFrente${l}`, 'blocoCabine'], motivo: 'a face de trás do para-lama da frente encosta na face da frente do bloco da cabine, em z -45' },
    { par: [`degrau${l}`, 'blocoCabine'], motivo: 'a face de dentro do degrau encosta na lateral do bloco da cabine, em x 861 ou -861' },
    { par: [`eixoFrente${l}`, 'chassi'], motivo: 'a ponta de dentro do eixo encosta na lateral da viga, em x 495 ou -495' },
    { par: [`eixoFrente${l}`, `rodaFrente${l}`], motivo: 'a ponta de fora do eixo encosta na face de dentro do pneu da frente, em x 732 ou -732' },
    ...PONTAS.flatMap((p) => [
      { par: [`aro${p}${l}`, `roda${p}${l}`], motivo: 'as faces cônicas do vão do pneu e do forro do aro são as mesmas, com os mesmos vértices' },
      { par: [`cubo${p}${l}`, `aro${p}${l}`], motivo: 'a face de dentro do cubo assenta no fundo do aro, no disco do centro' },
    ]),
    { par: [`paraLamaFrente${l}`, 'focinhoDoCapo'], motivo: 'a face de dentro do para-lama da frente encosta na lateral do focinho, em x 693 ou -693, de z 1170 a 1209' },
    { par: [`rodaTras${l}`, 'cabine'], motivo: 'a face de dentro do pneu de trás, em x 861 ou -861, toca a aresta de baixo da lateral da cabine, em y 1392, só pela aresta' },
    { par: [`paraLamaTras${l}`, 'cabine'], motivo: 'a face de dentro do para-lama de trás, em x 861 ou -861, toca a aresta de baixo da lateral da cabine, em y 1392, só pela aresta' },
    { par: [`rodaTras${l}`, 'blocoCabine'], motivo: 'a face de dentro do pneu de trás, em x 861 ou -861, encosta na lateral do bloco da cabine' },
  ]),
  { par: ['denteDir2', 'denteDir3'], motivo: 'a face de fora do dente, em x 946, encosta na face de dentro do dente da ponta, como na fonte' },
  { par: ['denteEsq2', 'denteEsq3'], motivo: 'a face de fora do dente, em x -946, encosta na face de dentro do dente da ponta, como na fonte' },
  ...DENTES.map((d) => ({ par: [d, 'placaDaPa'], motivo: 'a face de trás do dente é o mesmo plano da face de baixo da cunha da placa, de y 72 a 197' })),
  { par: ['placaDaPa', 'tampoDaPa'], motivo: 'a face de baixo do tampo da pá, em y 1237, assenta na face de cima da placa' },
];

/* ---------- pontos declarados ---------- */

/* Os pontos, em milímetro, saem da mesma tabela que a malha. Todos são cantos da caixa de uma parte. */
export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  const rExt = T.pl_tras_raio_interno + T.pl_tras_espessura;
  const xFora = T.roda_frente_x0 + T.roda_frente_largura;
  return [
    { nome: 'canto da frente, em cima, do teto', parte: 'teto', medida: 'maximo', em: [T.cabine_meia_largura_topo, T.teto_y, T.teto_frente_z], toleranciaMm: tol },
    { nome: 'canto de trás, embaixo, do teto', parte: 'teto', medida: 'minimo', em: [-T.cabine_meia_largura_topo, T.cabine_topo_y, T.teto_tras_z], toleranciaMm: tol },
    { nome: 'ponta da frente, em cima, do dente do centro', parte: 'denteCentro', medida: 'maximo', em: [T.dentes_x[0][1], T.pa_ponta_y, T.dente_ponta_z], toleranciaMm: tol },
    { nome: 'canto de trás, embaixo, da placa da pá', parte: 'placaDaPa', medida: 'minimo', em: [-T.pa_meia_largura, T.pa_pe_y, T.pa_z0], toleranciaMm: tol },
    { nome: 'ponta de trás, embaixo, da barra de reboque', parte: 'barraDeTracao', medida: 'minimo', em: [-T.barra_meia_largura, T.viga_base_y, T.barra_z], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo e atrás', parte: 'rodaTrasEsq', medida: 'minimo', em: [-(T.roda_tras_x0 + T.roda_tras_largura), 0, T.roda_tras_z - T.roda_tras_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, em cima e na frente', parte: 'rodaFrenteDir', medida: 'maximo', em: [xFora, 2 * T.roda_frente_raio, T.roda_frente_z + T.roda_frente_raio], toleranciaMm: tol },
    { nome: 'topo do escapamento', parte: 'escapamento', medida: 'maximo', em: [T.escapamento_x + T.escapamento_raio_base, T.capo_topo_y + T.escapamento_altura, T.escapamento_z + T.escapamento_raio_base], toleranciaMm: tol },
    { nome: 'ponta de cima do para-lama de trás, à direita', parte: 'paraLamaTrasDir', medida: 'maximo', em: [T.pl_tras_x1, T.roda_tras_raio + rExt, T.pl_tras_frente_z], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.retrovisor_y1, T.bloco_frente_z], toleranciaMm: tol },
  ];
}

const parte = (nome, forma, tecnica) => ({ nome, forma, tecnica });

const receita = {
  meta: { nome: 'trator-pa', desc: 'trator de brinquedo verde com pá frontal inclinada de dentes, rodas de trás grandes e da frente pequenas, cabine de vidro e escapamento' },
  PARAMS: TABELA,
  MATERIAIS: {
    verde: { tipo: 'liso', cor: '#3ea87a' },
    cinza: { tipo: 'liso', cor: '#6f7187' },
    vidro: { tipo: 'liso', cor: '#d4ecff' },
    pneu: { tipo: 'liso', cor: '#2b2b30' },
    aro: { tipo: 'liso', cor: '#f39a35' },
    cubo: { tipo: 'metal', cor: '#65657a', acabamento: 'escovado' },
  },
  TOPO: { origem: 'chão, no meio do trator em x e em z; y para cima e a frente do trator (a pá) em +z' },
  PLANO: {
    objeto: 'trator verde com pá frontal de 4360 mm de comprimento, 2931 mm de largura e 2669 mm de altura: rodas de trás grandes, as da frente pequenas, capô, cabine e pá com dentes',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do trator, da barra de reboque (z -2180) à ponta dos dentes da pá (z 2180)', milimetros: 4360 },
    familia: 'veiculo',
    partes: [
      parte('chassi', 'viga central cinza de 990 mm de largura, de y 303 a 501, com o bloco de trás até y 897 e a ponta da frente chanfrada', 'extrusao em x de perfil lateral em L'),
      parte('barraDeTracao', 'caixa cinza de 396 mm de largura saindo atrás da viga, de y 303 a 501 e de z -2180 a -2003', 'cubo encostado na face de trás da viga'),
      parte('engateTras', 'barra de reboque cinza de 618 por 308 mm, de quinas chanfradas, de z -2092 a -2003', 'extrusao em z de seção octogonal'),
      parte('engateFrente', 'caixa cinza de 618 por 309 mm, de quinas chanfradas, de z 1170 a 1258, sob o focinho', 'extrusao em z de seção octogonal'),
      parte('blocoCabine', 'bloco cinza de 1722 mm de largura, de y 501 a 1392 e de z -1827 a -45, sob a cabine', 'cubo assentado na viga'),
      parte('capo', 'capô verde de 1386 mm de largura de y 501 a 1392, com ombros chanfrados, de z -45 a 1170', 'extrusao em z da seção frontal'),
      parte('focinhoDoCapo', 'moldura verde em U em volta da grade, de z 1170 a 1346, de baixo chanfrado, aberta embaixo', 'interseção do perfil lateral com a seção frontal em U'),
      parte('grade', 'placa cinza de 990 por 516 mm no fundo do vão do focinho', 'cubo encostado na face da frente do capô'),
      parte('cabine', 'cabine cinza alta, de 1722 mm de largura na base e 1518 no topo, de y 1392 a 2580, de frente e traseira inclinadas', 'interseção do perfil lateral com a seção frontal'),
      parte('teto', 'teto verde de 89 mm de espessura, saliente à frente e atrás, de z -1739 a -232', 'extrusao em x de perfil lateral com viseira chanfrada'),
      parte('parabrisa', 'placa de vidro de 12 mm sobre a face inclinada da frente da cabine, de 1386 mm na base e 1162 no topo', 'interseção de uma placa lateral com uma seção frontal trapezoidal'),
      parte('vidroTraseiro', 'placa de vidro de 12 mm sobre a face de trás da cabine, de y 1535 a 2438', 'interseção de uma placa lateral com uma seção frontal trapezoidal'),
      parte('vidroLateralDir', 'placa de vidro de 12 mm sobre a lateral direita da cabine, de y 1560 a 2413', 'interseção do contorno da janela com uma placa frontal inclinada'),
      parte('vidroLateralEsq', 'placa de vidro de 12 mm sobre a lateral esquerda da cabine, de y 1560 a 2413', 'interseção do contorno da janela com uma placa frontal inclinada'),
      parte('retrovisorDir', 'caixa verde de 228 por 396 por 198 mm ao lado da frente da cabine, à direita', 'cubo encostado na lateral do bloco'),
      parte('retrovisorEsq', 'caixa verde de 228 por 396 por 198 mm ao lado da frente da cabine, à esquerda', 'cubo encostado na lateral do bloco'),
      parte('escapamento', 'tubo vertical cinza de 634 mm, com base larga de 306 mm de diâmetro e boca saliente, à direita do capô', 'lathe em torno de y'),
      parte('tampaDoFiltro', 'tampa cinza de 154 mm de altura, de 204 mm de diâmetro na base, sobre o capô', 'lathe em torno de y'),
      parte('pivoDir', 'disco cinza de 290 mm de diâmetro e 174 mm na lateral direita do capô, onde o braço da pá se prende', 'cilindro com eixo x'),
      parte('pivoEsq', 'disco cinza de 290 mm de diâmetro e 174 mm na lateral esquerda do capô, onde o braço da pá se prende', 'cilindro com eixo x'),
      parte('bracoDir', 'braço cinza diagonal de 144 mm de largura do pivô até a placa da pá, descendo de y 1263 a 424', 'extrusao em x de perfil lateral'),
      parte('bracoEsq', 'braço cinza diagonal de 144 mm de largura do pivô até a placa da pá, descendo de y 1263 a 424', 'extrusao em x de perfil lateral'),
      parte('placaDaPa', 'placa verde de 2312 mm de largura, de y 72 a 1237, em cunha de 45 graus embaixo, de z 1717 a 2108', 'extrusao em x de perfil lateral'),
      parte('tampoDaPa', 'faixa cinza de 20 mm sobre a placa da pá, de z 1717 a 1894', 'extrusao em x de perfil lateral'),
      parte('denteCentro', 'dente cinza de 210 mm de largura na borda de baixo da pá, de 45 graus, até z 2180', 'extrusao em x de paralelogramo'),
      parte('denteDir1', 'dente cinza de 210 mm de largura na borda de baixo da pá, à direita do centro', 'extrusao em x de paralelogramo'),
      parte('denteEsq1', 'dente cinza de 210 mm de largura na borda de baixo da pá, à esquerda do centro', 'extrusao em x de paralelogramo'),
      parte('denteDir2', 'dente cinza de 210 mm de largura na borda de baixo da pá, à direita, o segundo', 'extrusao em x de paralelogramo'),
      parte('denteEsq2', 'dente cinza de 210 mm de largura na borda de baixo da pá, à esquerda, o segundo', 'extrusao em x de paralelogramo'),
      parte('denteDir3', 'dente cinza de 210 mm de largura na ponta direita da pá', 'extrusao em x de paralelogramo'),
      parte('denteEsq3', 'dente cinza de 210 mm de largura na ponta esquerda da pá', 'extrusao em x de paralelogramo'),
      parte('paraLamaTrasDir', 'arco cinza de 199 mm de espessura sobre a roda de trás direita, de x 861 a 1287, com a cauda inclinada atrás e a ponta da frente que desce até y 501', 'extrusao em x de arco de 15 em 15 graus'),
      parte('paraLamaTrasEsq', 'arco cinza de 199 mm de espessura sobre a roda de trás esquerda, de x -1287 a -861, com a cauda inclinada atrás e a ponta da frente que desce até y 501', 'extrusao em x de arco de 15 em 15 graus'),
      parte('paraLamaFrenteDir', 'saia cinza de y 501 a 798 que sobe em arco de 199 mm de espessura sobre a roda da frente direita, de x 693 a 1089', 'extrusao em x de arco de 15 em 15 graus'),
      parte('paraLamaFrenteEsq', 'saia cinza de y 501 a 798 que sobe em arco de 199 mm de espessura sobre a roda da frente esquerda, de x -1089 a -693', 'extrusao em x de arco de 15 em 15 graus'),
      parte('degrauDir', 'bloco cinza de 228 mm entre o para-lama de trás e o da frente, à direita, de y 501 a 798', 'cubo encostado no bloco da cabine'),
      parte('degrauEsq', 'bloco cinza de 228 mm entre o para-lama de trás e o da frente, à esquerda, de y 501 a 798', 'cubo encostado no bloco da cabine'),
      parte('eixoFrenteDir', 'haste cinza de 44 mm de diâmetro da viga à face de dentro do pneu da frente direita', 'cilindro com eixo x'),
      parte('eixoFrenteEsq', 'haste cinza de 44 mm de diâmetro da viga à face de dentro do pneu da frente esquerda', 'cilindro com eixo x'),
      parte('rodaTrasDir', 'pneu escuro de 1544 mm de diâmetro e 604 de largura, de ombros chanfrados e vão cônico na face de fora, de trás à direita', 'lathe em torno de x'),
      parte('rodaTrasEsq', 'pneu escuro de 1544 mm de diâmetro e 604 de largura, de ombros chanfrados e vão cônico na face de fora, de trás à esquerda', 'lathe em torno de x'),
      parte('rodaFrenteDir', 'pneu escuro de 948 mm de diâmetro e 436 de largura, de ombros chanfrados e vão cônico na face de fora, da frente à direita', 'lathe em torno de x'),
      parte('rodaFrenteEsq', 'pneu escuro de 948 mm de diâmetro e 436 de largura, de ombros chanfrados e vão cônico na face de fora, da frente à esquerda', 'lathe em torno de x'),
      parte('aroTrasDir', 'forro laranja do vão do pneu de trás direito, de 1032 mm de diâmetro na boca', 'lathe em torno de x'),
      parte('aroTrasEsq', 'forro laranja do vão do pneu de trás esquerdo, de 1032 mm de diâmetro na boca', 'lathe em torno de x'),
      parte('aroFrenteDir', 'forro laranja do vão do pneu da frente direito, de 522 mm de diâmetro na boca', 'lathe em torno de x'),
      parte('aroFrenteEsq', 'forro laranja do vão do pneu da frente esquerdo, de 522 mm de diâmetro na boca', 'lathe em torno de x'),
      parte('cuboTrasDir', 'cubo cinza cônico de 402 mm de diâmetro na base, saindo do fundo do aro de trás direito', 'lathe em torno de x'),
      parte('cuboTrasEsq', 'cubo cinza cônico de 402 mm de diâmetro na base, saindo do fundo do aro de trás esquerdo', 'lathe em torno de x'),
      parte('cuboFrenteDir', 'cubo cinza cônico de 264 mm de diâmetro na base, saindo do fundo do aro da frente direito', 'lathe em torno de x'),
      parte('cuboFrenteEsq', 'cubo cinza cônico de 264 mm de diâmetro na base, saindo do fundo do aro da frente esquerdo', 'lathe em torno de x'),
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 4360 mm de comprimento, 2931 mm de largura ou 2669 mm de altura, ou alguma roda não toca o chão',
      'um lado do trator difere do outro em medida ou posição de peça simétrica',
      'as rodas de trás não são bem maiores que as da frente (1544 contra 948 mm de diâmetro), ou alguma está dentro de um arco recortado no corpo',
      'a cabine não afunila da base ao teto, não tem teto verde saliente ou os vidros não são placas sobre as faces',
      'o capô não é estreito e longo na frente da cabine, sem grade no focinho, escapamento vertical ou tampa de filtro',
      'a pá não é uma placa inclinada em cunha de 45 graus embaixo, com sete dentes na borda e dois braços diagonais até o capô',
      'os para-lamas não são arcos sobre as quatro rodas, ou o da frente não tem a saia baixa que o liga ao degrau',
      'a silhueta lateral, frontal ou de cima não confere com a referência em mais de cinco por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
