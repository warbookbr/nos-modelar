/* carro-taxi — táxi estilizado, amarelo, de frente alta e vertical, chassi cinza mais largo que a carroceria, para-lamas em cápsula
 * em volta das rodas, cabine que afunila para o teto com luminoso claro, vidros azul claros, grade cinza entre os faróis amarelos,
 * para-choque e placas claras.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "taxi" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/taxi.glb, que o git ignora. O que entra aqui
 * são as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765) e as vistas (referencias/fonte-vistas.png). O
 * que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do táxi em +z, x para a direita de quem olha de frente, centrado em
 * x. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve, por parte, a
 * forma, a `parte` e o `material`. A conversão para metro está em `m`, num lugar só. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita (estrutura do carro-sedan-compacto, com a técnica das três vistas na cabine e no chassi): a carroceria é uma
 * extrusão em x do perfil lateral, com os arcos das rodas recortados no próprio perfil. A cabine, o chassi, o luminoso e os vidros
 * são a INTERSEÇÃO de duas extrusões, o perfil lateral (z, y) em x e a seção frontal (x, y) em z, e por isso afunilam e têm degrau
 * sem nenhum vértice calculado em 3D; os vidros usam o mesmo plano da face que cobrem, e o contato fecha exato. Uma extrusão com
 * `eixo: 'x'` leva o perfil [u, v] a y = -u e z = v; com `eixo: 'z'`, a x = u e y = -v. As rodas são revoluções em torno de x
 * (`lathe`) com o chanfro do pneu no perfil. A caixa de roda é o próprio arco do perfil, fechado e extrudado entre as faces de
 * dentro dos dois pneus.
 */

export const TABELA = {
  lados: 24, // contagem de lados dos pneus e dos arcos (a mesma, para os arcos coincidirem com a caixa de roda)

  // carroceria amarela: perfil lateral, de y 880 (sobre o chassi) à cintura; capô plano, tampa de trás em rampa
  carroceria_meia_largura: 975,
  topo_chassi_y: 880,
  cintura_y: 1412,
  nariz_z: 2260,
  traseira_z: -2339,
  porta_malas_z: -1450,
  traseira_topo_y: 1250,

  // chassi cinza escuro: a soleira (mais larga, de y 350 a 520) e o painel (da largura da carroceria, de 520 a 880)
  chassi_meia_largura: 1147,
  chassi_base_y: 350,
  soleira_topo_y: 520,

  // cabine: perfil lateral de pilar a pilar, e a seção frontal que afunila da largura da carroceria até o teto
  cabine_meia_largura_topo: 805,
  teto_y: 2295,
  pilar_frente_z: 1190,
  pilar_topo_z: 657,
  pilar_topo_y: 2143,
  canto_frente_z: 455,
  canto_frente_y: 2279,
  teto_frente_z: 253,
  teto_tras_z: -860,
  canto_tras_z: -1062,
  canto_tras_y: 2292,
  pilar_tras_topo_z: -1163,
  pilar_tras_topo_y: 2224,
  pilar_tras_base_z: -1450,

  // luminoso claro sobre o teto: retângulo na lateral, trapézio na frente
  luminoso_z0: -758,
  luminoso_z1: 152,
  luminoso_topo_y: 2648,
  luminoso_meia_largura_base: 185,
  luminoso_meia_largura_topo: 100,

  // vidros azul claros: placas sobre as faces da cabine
  vidro_espessura: 10,
  parabrisa_y0: 1500,
  parabrisa_y1: 2140,
  parabrisa_meia_largura_y0: 794,
  parabrisa_meia_largura_y1: 666,
  vidro_traseiro_y0: 1508,
  vidro_traseiro_y1: 2173,
  vidro_traseiro_meia_largura_y0: 757,
  vidro_traseiro_meia_largura_y1: 653,
  vidro_lateral_espessura: 12,
  vidro_lateral_frente_z: 950,
  vidro_lateral_topo_z: 425,
  vidro_lateral_tras_z: -33,
  vidro_lateral_base_y: 1440,
  vidro_lateral_topo_y: 2129,

  // rodas: pneu de 1060 mm de diâmetro e 529 de largura, com chanfro; aro cinza com cubo saindo da face de fora
  roda_raio: 530,
  roda_x_dentro: 530,
  roda_x_fora: 1059,
  roda_z_frente: 1386,
  roda_z_tras: -1297,
  roda_chanfro: 50,
  aro_raio: 330,
  aro_espessura: 20,
  cubo_raio: 170,
  cubo_saliencia: 15,

  // arcos: o do perfil (a caixa de roda enche o mesmo arco) e a cápsula do para-lama em volta dele
  arco_raio: 590,
  para_lama_raio: 680,

  // frente: para-choque, placas, grade e faróis
  para_choque_z1: 2376,
  para_choque_y1: 705,
  para_choque_tras_z: -2376,

  // planta das pontas (igual na frente e atrás): meia largura 1147 até |z| 2174, 1121 em 2275 e 1002 em 2376
  planta_z0: 2174,
  planta_x0: 1147,
  planta_z1: 2275,
  planta_x1: 1121,
  planta_z2: 2376,
  planta_x2: 1002,
  placa_meia_largura: 310,
  placa_y0: 264,
  placa_y1: 570,
  placa_z_frente: 2427,
  placa_z_tras: -2427,
  grade_meia_largura: 493,
  grade_y1: 1234,
  grade_prof: 8,
  farol_x1: 969,
  farol_prof: 15,
  bloco_prof: 15,

  // friso claro na lateral da carroceria, retrovisores e lanternas
  friso_z0: -476,
  friso_z1: 580,
  friso_y1: 1142,
  friso_saliencia: 10,
  retrovisor_x1: 1324,
  retrovisor_y0: 1230,
  retrovisor_y1: 1405,
  retrovisor_z0: 758,
  retrovisor_z1: 961,
  lanterna_x0: 480,
  lanterna_x1: 950,
  lanterna_y0: 1000,
  lanterna_y1: 1150,
  lanterna_espessura: 12,
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
/* O paralelogramo da aresta P-Q da cabine deslocado `e` para fora, na direção da normal `n`; a face de dentro usa os mesmos vértices da cabine. */
function placaSobre(P, Q, e, n) {
  const k = e / Math.hypot(...n);
  return [P, Q, [Q[0] + n[0] * k, Q[1] + n[1] * k], [P[0] + n[0] * k, P[1] + n[1] * k]];
}

/* ---------- derivar ---------- */

/* A meia largura da planta das pontas na distância |z| do centro: 1147 até planta_z0, depois as duas retas até a ponta. */
function larguraDaPlanta(T, zAbs) {
  if (zAbs <= T.planta_z0) return T.planta_x0;
  if (zAbs <= T.planta_z1) return reta(T.planta_z0, T.planta_x0, T.planta_z1, T.planta_x1)(zAbs);
  return reta(T.planta_z1, T.planta_x1, T.planta_z2, T.planta_x2)(zAbs);
}

/* Cada forma tem `nome`, `forma` (vistas, lateral, planta, cubo ou lathe), `material` e as medidas da forma, em milímetro. */
export function derivar(T) {
  const M = T.carroceria_meia_largura;
  const C = T.chassi_meia_largura;
  const yR = T.roda_raio;
  const zF = T.roda_z_frente;
  const zT = T.roda_z_tras;
  const rodas = [];
  for (const s of [1, -1]) {
    for (const [ponta, zc] of [['Frente', zF], ['Tras', zT]]) rodas.push({ s, lado: s > 0 ? 'Dir' : 'Esq', ponta, zc });
  }
  const arco = (zc, y) => capaAcima(zc, yR, T.arco_raio, T.lados, y);
  const xCabine = reta(T.cintura_y, M, T.teto_y, T.cabine_meia_largura_topo);
  const trapezio = (xDe, y0, y1) => [[-xDe(y0), y0], [xDe(y0), y0], [xDe(y1), y1], [-xDe(y1), y1]];
  const formas = [];

  /* carroceria: extrusão em x do perfil lateral, com os arcos das rodas no perfil (de trás para a frente na borda de baixo) */
  formas.push({
    nome: 'carroceria', forma: 'lateral', material: 'amarelo', x0: -M, largura: 2 * M,
    lado: [
      [T.nariz_z, T.topo_chassi_y], [T.nariz_z, T.cintura_y], [T.porta_malas_z, T.cintura_y], [T.traseira_z, T.traseira_topo_y],
      [T.traseira_z, T.topo_chassi_y], ...arco(zT, T.topo_chassi_y), ...arco(zF, T.topo_chassi_y),
    ],
  });

  /* chassi em três trechos (frente, centro e trás), separados pelos arcos: o perfil lateral de y 350 a 880, e a seção frontal em degrau
   * (soleira de 1147 de meia largura até y 520, painel da largura da carroceria acima) */
  const y0 = T.chassi_base_y;
  const y1 = T.topo_chassi_y;
  const degrau = [[-C, y0 - 50], [C, y0 - 50], [C, T.soleira_topo_y], [M, T.soleira_topo_y], [M, y1 + 70],
    [-M, y1 + 70], [-M, T.soleira_topo_y], [-C, T.soleira_topo_y]];
  const meio = [[T.planta_x0, -T.planta_z0], [T.planta_x0, T.planta_z0]];
  const plantaChassi = [[T.planta_x2, -T.planta_z2], [T.planta_x1, -T.planta_z1], ...meio, [T.planta_x1, T.planta_z1], [T.planta_x2, T.planta_z2]];
  const espelho = (pts) => [...pts, ...[...pts].reverse().map(([x, z]) => [-x, z])];
  const arcoDir = (zc) => trechoDoArco(zc, yR, T.arco_raio, T.lados, 1, y0, y1);
  const arcoEsq = (zc) => trechoDoArco(zc, yR, T.arco_raio, T.lados, -1, y0, y1);
  formas.push({ nome: 'chassiFrente', forma: 'vistas', material: 'cinzaEscuro', frontal: degrau, planta: espelho(plantaChassi), lado: [...arcoDir(zF), [T.nariz_z, y0], [T.nariz_z, y1]] });
  formas.push({ nome: 'chassiCentro', forma: 'vistas', material: 'cinzaEscuro', frontal: degrau, planta: espelho(plantaChassi), lado: [...arcoDir(zT), ...arcoEsq(zF)] });
  formas.push({ nome: 'chassiTras', forma: 'vistas', material: 'cinzaEscuro', frontal: degrau, planta: espelho(plantaChassi), lado: [[T.traseira_z, y0], ...arcoEsq(zT), [T.traseira_z, y1]] });

  /* cabine: o perfil lateral de pilar a pilar sobre a cintura, e a seção frontal que afunila da largura da carroceria ao teto */
  const lateralCabine = [
    [T.pilar_frente_z, T.cintura_y], [T.pilar_topo_z, T.pilar_topo_y], [T.canto_frente_z, T.canto_frente_y], [T.teto_frente_z, T.teto_y],
    [T.teto_tras_z, T.teto_y], [T.canto_tras_z, T.canto_tras_y], [T.pilar_tras_topo_z, T.pilar_tras_topo_y], [T.pilar_tras_base_z, T.cintura_y],
  ];
  formas.push({ nome: 'cabine', forma: 'vistas', material: 'amarelo', lado: lateralCabine, frontal: trapezio(xCabine, T.cintura_y - 110, T.teto_y + 105) });

  /* luminoso: retângulo na lateral, trapézio na frente */
  const xLuminoso = reta(T.teto_y, T.luminoso_meia_largura_base, T.luminoso_topo_y, T.luminoso_meia_largura_topo);
  formas.push({
    nome: 'luminoso', forma: 'vistas', material: 'luminoso',
    lado: [[T.luminoso_z1, T.teto_y], [T.luminoso_z1, T.luminoso_topo_y], [T.luminoso_z0, T.luminoso_topo_y], [T.luminoso_z0, T.teto_y]],
    frontal: trapezio(xLuminoso, T.teto_y - 100, T.luminoso_topo_y + 50),
  });

  /* para-brisa e vidro traseiro: placas sobre as arestas inclinadas da cabine, com o trapézio frontal mais estreito que a cabine */
  const pilarFrente = [[T.pilar_frente_z, T.cintura_y], [T.pilar_topo_z, T.pilar_topo_y]];
  const pilarTras = [[T.pilar_tras_topo_z, T.pilar_tras_topo_y], [T.pilar_tras_base_z, T.cintura_y]];
  const xParabrisa = reta(T.parabrisa_y0, T.parabrisa_meia_largura_y0, T.parabrisa_y1, T.parabrisa_meia_largura_y1);
  formas.push({
    nome: 'parabrisa', forma: 'vistas', material: 'vidro',
    lado: placaSobre(...pilarFrente, T.vidro_espessura, [T.pilar_topo_y - T.cintura_y, T.pilar_frente_z - T.pilar_topo_z]),
    frontal: trapezio(xParabrisa, T.parabrisa_y0, T.parabrisa_y1),
  });
  const xTraseiro = reta(T.vidro_traseiro_y0, T.vidro_traseiro_meia_largura_y0, T.vidro_traseiro_y1, T.vidro_traseiro_meia_largura_y1);
  formas.push({
    nome: 'vidroTraseiro', forma: 'vistas', material: 'vidro',
    lado: placaSobre(...pilarTras, T.vidro_espessura, [-(T.pilar_tras_topo_y - T.cintura_y), T.pilar_tras_topo_z - T.pilar_tras_base_z]),
    frontal: trapezio(xTraseiro, T.vidro_traseiro_y0, T.vidro_traseiro_y1),
  });

  /* vidros laterais: a janela da frente em cada lado, uma casca de 12 mm sobre a face inclinada da cabine */
  const janela = [[T.vidro_lateral_frente_z, T.vidro_lateral_base_y], [T.vidro_lateral_topo_z, T.vidro_lateral_topo_y],
    [T.vidro_lateral_tras_z, T.vidro_lateral_topo_y], [T.vidro_lateral_tras_z, T.vidro_lateral_base_y]];
  const yA = T.cintura_y - 110;
  const yB = T.teto_y + 105;
  const e = T.vidro_lateral_espessura;
  for (const s of [1, -1]) {
    formas.push({
      nome: `vidroLateral${s > 0 ? 'Dir' : 'Esq'}`, forma: 'vistas', material: 'vidro', lado: janela,
      frontal: [[s * xCabine(yA), yA], [s * (xCabine(yA) + e), yA], [s * (xCabine(yB) + e), yB], [s * xCabine(yB), yB]],
    });
  }

  /* frente: para-choque de 1147 de meia largura, placas e grade */
  const zPC = T.para_choque_z1;
  /* os para-choques têm a planta com as quinas fechadas: 1147 de meia largura no chassi, 1121 logo adiante e 1002 na ponta */
  const zN = T.nariz_z;
  const zR = T.traseira_z;
  const bordaF = [[larguraDaPlanta(T, zN), zN], [T.planta_x1, T.planta_z1], [T.planta_x2, zPC]];
  formas.push({
    nome: 'paraChoqueFrente', forma: 'planta', material: 'cinza', y0: T.chassi_base_y, altura: T.para_choque_y1 - T.chassi_base_y,
    planta: espelho(bordaF),
  });
  const zPlF = T.placa_z_frente;
  formas.push({
    nome: 'placaFrente', forma: 'cubo', material: 'cinzaClaro', larg: 2 * T.placa_meia_largura, alt: T.placa_y1 - T.placa_y0, prof: zPlF - zPC,
    em: [0, T.placa_y0, (zPlF + zPC) / 2],
  });
  const zPT = T.para_choque_tras_z;
  const bordaT = [[larguraDaPlanta(T, -zR), zR], [T.planta_x2, zPT]];
  formas.push({
    nome: 'paraChoqueTras', forma: 'planta', material: 'cinza', y0: T.chassi_base_y, altura: T.para_choque_y1 - T.chassi_base_y,
    planta: espelho(bordaT),
  });
  const zPlT = T.placa_z_tras;
  formas.push({
    nome: 'placaTras', forma: 'cubo', material: 'cinzaClaro', larg: 2 * T.placa_meia_largura, alt: T.placa_y1 - T.placa_y0, prof: zPT - zPlT,
    em: [0, T.placa_y0, (zPlT + zPT) / 2],
  });
  formas.push({
    nome: 'grade', forma: 'cubo', material: 'grade', larg: 2 * T.grade_meia_largura, alt: T.grade_y1 - T.topo_chassi_y, prof: T.grade_prof,
    em: [0, T.topo_chassi_y, T.nariz_z + T.grade_prof / 2],
  });
  const xF0 = T.grade_meia_largura;
  const xF1 = T.farol_x1;
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `blocoFarol${lado}`, forma: 'cubo', material: 'amarelo', larg: xF1 - xF0, alt: T.grade_y1 - T.topo_chassi_y, prof: T.bloco_prof,
      em: [(s * (xF0 + xF1)) / 2, T.topo_chassi_y, T.nariz_z + T.bloco_prof / 2],
    });
    formas.push({
      nome: `farol${lado}`, forma: 'cubo', material: 'farol', larg: xF1 - xF0, alt: T.cintura_y - T.grade_y1, prof: T.farol_prof,
      em: [(s * (xF0 + xF1)) / 2, T.grade_y1, T.nariz_z + T.farol_prof / 2],
    });
    formas.push({
      nome: `lanterna${lado}`, forma: 'cubo', material: 'lanterna', larg: T.lanterna_x1 - T.lanterna_x0, alt: T.lanterna_y1 - T.lanterna_y0,
      prof: T.lanterna_espessura, em: [(s * (T.lanterna_x0 + T.lanterna_x1)) / 2, T.lanterna_y0, T.traseira_z - T.lanterna_espessura / 2],
    });
    formas.push({
      nome: `friso${lado}`, forma: 'cubo', material: 'cinzaClaro', larg: T.friso_saliencia, alt: T.friso_y1 - T.topo_chassi_y, prof: T.friso_z1 - T.friso_z0,
      em: [s * (M + T.friso_saliencia / 2), T.topo_chassi_y, (T.friso_z0 + T.friso_z1) / 2],
    });
    const larg = T.retrovisor_x1 - M;
    formas.push({
      nome: `retrovisor${lado}`, forma: 'cubo', material: 'amarelo', larg, alt: T.retrovisor_y1 - T.retrovisor_y0, prof: T.retrovisor_z1 - T.retrovisor_z0,
      em: [s * (M + larg / 2), T.retrovisor_y0, (T.retrovisor_z0 + T.retrovisor_z1) / 2],
    });
  }

  /* para-lamas: anel de 590 a 680 de raio sobre a soleira, de x 975 a 1147 */
  for (const r of rodas) {
    const ext = capaAcima(r.zc, yR, T.para_lama_raio, T.lados, T.soleira_topo_y);
    const int = capaAcima(r.zc, yR, T.arco_raio, T.lados, T.soleira_topo_y);
    formas.push({
      nome: `paraLama${r.ponta}${r.lado}`, forma: 'lateral', material: 'cinza', x0: r.s > 0 ? M : -C, largura: C - M, lado: [...ext, ...[...int].reverse()],
    });
  }

  /* caixas de roda: o arco do perfil, fechado em y 350, entre as faces de dentro dos dois pneus */
  for (const [ponta, zc] of [['Frente', zF], ['Tras', zT]]) {
    formas.push({
      nome: `caixaRoda${ponta}`, forma: 'lateral', material: 'caixaRoda', x0: -T.roda_x_dentro, largura: 2 * T.roda_x_dentro,
      lado: capaAcima(zc, yR, T.arco_raio, T.lados, T.chassi_base_y),
    });
  }

  /* rodas: pneu com chanfro e aro com cubo, revoluções em torno de x */
  const R = T.roda_raio;
  const c = T.roda_chanfro;
  const L = T.roda_x_fora - T.roda_x_dentro;
  const aroDir = [[0, 0], [T.aro_raio, 0], [T.aro_raio, T.aro_espessura], [T.cubo_raio, T.aro_espessura],
    [T.cubo_raio, T.aro_espessura + T.cubo_saliencia], [0, T.aro_espessura + T.cubo_saliencia]];
  const aroEsq = aroDir.map(([r, a]) => [r, T.aro_espessura + T.cubo_saliencia - a]);
  for (const r of rodas) {
    formas.push({
      nome: `roda${r.ponta}${r.lado}`, forma: 'lathe', material: 'pneu', liso: true, lados: T.lados,
      perfil: [[0, 0], [R - c, 0], [R, c], [R, L - c], [R - c, L], [0, L]], em: [r.s > 0 ? T.roda_x_dentro : -T.roda_x_fora, yR, r.zc],
    });
    formas.push({
      nome: `aro${r.ponta}${r.lado}`, forma: 'lathe', material: 'aro', liso: true, lados: T.lados, perfil: r.s > 0 ? aroDir : aroEsq,
      em: [r.s > 0 ? T.roda_x_fora : -(T.roda_x_fora + T.aro_espessura + T.cubo_saliencia), yR, r.zc],
    });
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
    const L = T.chassi_meia_largura + T.retrovisor_x1;
    const Cz = Math.abs(T.placa_z_frente) + 100;
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilM(perfilLateral(f.lado)) }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * Cz), em: [0, 0, m(-Cz)], perfil: perfilM(secaoFrontal(f.frontal)) }]);
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
  } else if (f.forma === 'cubo') {
    passos.push(['cubo', { origemId: base + 1, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: emMetro(f.em) }]);
    sel = { origem: { op: 'cubo', id: base + 1 } };
  } else if (f.forma === 'planta') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'y', altura: m(f.altura), em: [0, m(f.y0), 0], perfil: perfilM(antihorario(f.planta)) }]);
    sel = { origem: { op: 'extrusao', id: base + 1 } };
  } else {
    passos.push(['lathe', { origemId: base + 1, eixo: 'x', perfil: perfilM(f.perfil), lados: f.lados, em: emMetro(f.em) }]);
    sel = { origem: { op: 'lathe', id: base + 1 } };
  }
  passos.push(['parte', { nome: f.nome, sel }]);
  passos.push(['material', { sel, usa: f.material }]);
  if (f.liso) passos.push(['liso', { angulo: 30, sel }]);
  return passos;
}

/** Os PASSOS: cada forma, a `parte` e o `material` logo depois. */
export function gerarPassos(T) {
  return derivar(T).flatMap((f, k) => passosDaForma(f, 100 * (k + 1), T));
}

/* ---------- contatos ---------- */

const PONTAS = ['Frente', 'Tras'];
const LADOS = ['Dir', 'Esq'];
const chassiDe = { Frente: ['chassiFrente', 'chassiCentro'], Tras: ['chassiTras', 'chassiCentro'] };

export const CONTATOS = [
  ...['chassiFrente', 'chassiCentro', 'chassiTras'].map((c) => ({
    par: ['carroceria', c], motivo: 'a face de baixo da carroceria, em y 880, assenta na face de cima do painel do chassi, de x -975 a 975',
  })),
  { par: ['carroceria', 'cabine'], motivo: 'a face de baixo da cabine, em y 1412, assenta no tampo da carroceria, de z -1450 a 1190' },
  { par: ['cabine', 'luminoso'], motivo: 'a face de baixo do luminoso, em y 2295, assenta no teto plano da cabine' },
  { par: ['cabine', 'parabrisa'], motivo: 'a face de trás do para-brisa é o mesmo plano da face inclinada da frente da cabine' },
  { par: ['cabine', 'vidroTraseiro'], motivo: 'a face da frente do vidro traseiro é o mesmo plano da face inclinada de trás da cabine' },
  { par: ['cabine', 'vidroLateralDir'], motivo: 'a face de dentro do vidro lateral direito é o mesmo plano da lateral inclinada da cabine' },
  { par: ['cabine', 'vidroLateralEsq'], motivo: 'a face de dentro do vidro lateral esquerdo é o mesmo plano da lateral inclinada da cabine' },
  { par: ['chassiFrente', 'paraChoqueFrente'], motivo: 'a face de trás do para-choque encosta na face da frente do chassi, em z 2260' },
  { par: ['paraChoqueFrente', 'placaFrente'], motivo: 'a face de trás da placa encosta na face da frente do para-choque, em z 2376' },
  { par: ['chassiTras', 'paraChoqueTras'], motivo: 'a face da frente do para-choque de trás encosta na face de trás do chassi, em z -2339' },
  { par: ['paraChoqueTras', 'placaTras'], motivo: 'a face da frente da placa de trás encosta na face de trás do para-choque, em z -2376' },
  { par: ['carroceria', 'grade'], motivo: 'a face de trás da grade encosta na face da frente do nariz, em z 2260' },
  { par: ['chassiFrente', 'grade'], motivo: 'o canto de cima da frente do chassi, em y 880 e z 2260, toca o canto de baixo da grade, só pela aresta' },
  { par: ['grade', 'blocoFarolDir'], motivo: 'a lateral da grade, em x 493, encosta no bloco do farol direito' },
  { par: ['grade', 'blocoFarolEsq'], motivo: 'a lateral da grade, em x -493, encosta no bloco do farol esquerdo' },
  ...LADOS.flatMap((l) => [
    { par: ['chassiFrente', `blocoFarol${l}`], motivo: 'o canto de cima da frente do chassi, em y 880 e z 2260, toca o canto de baixo do bloco, só pela aresta' },
    { par: ['grade', `farol${l}`], motivo: 'o canto de cima da grade, em x 493 e y 1234, toca o canto de dentro do farol, só pela aresta' },
    { par: ['chassiCentro', `friso${l}`], motivo: 'o canto de cima do painel do chassi, em x 975 e y 880, toca o canto de baixo do friso, só pela aresta' },
    { par: ['carroceria', `blocoFarol${l}`], motivo: 'a face de trás do bloco encosta na face da frente do nariz, em z 2260' },
    { par: [`blocoFarol${l}`, `farol${l}`], motivo: 'a face de baixo do farol assenta na face de cima do bloco, em y 1234' },
    { par: ['carroceria', `farol${l}`], motivo: 'a face de trás do farol encosta na face da frente do nariz, em z 2260' },
    { par: ['carroceria', `lanterna${l}`], motivo: 'a face da frente da lanterna encosta na face de trás da carroceria, em z -2339' },
    { par: ['carroceria', `friso${l}`], motivo: 'a face de dentro do friso claro encosta na lateral da carroceria, em x 975 ou -975' },
    { par: ['carroceria', `retrovisor${l}`], motivo: 'a face de dentro do retrovisor encosta na lateral da carroceria, em x 975 ou -975' },
  ]),
  ...PONTAS.flatMap((p) => [
    { par: [`caixaRoda${p}`, 'carroceria'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco da carroceria' },
    ...chassiDe[p].map((c) => ({ par: [`caixaRoda${p}`, c], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco do chassi' })),
    ...LADOS.flatMap((l) => [
      { par: [`caixaRoda${p}`, `roda${p}${l}`], motivo: 'a face de dentro do pneu, em x 530 ou -530, encosta na face da caixa de roda' },
      { par: [`aro${p}${l}`, `roda${p}${l}`], motivo: 'a face de dentro do aro encosta na face de fora do pneu, no disco do centro' },
      { par: [`paraLama${p}${l}`, 'carroceria'], motivo: 'a face de dentro do para-lama encosta na lateral da carroceria, em x 975 ou -975' },
      ...chassiDe[p].map((c) => ({ par: [`paraLama${p}${l}`, c], motivo: 'a base do para-lama assenta na soleira do chassi, em y 520, e a face de dentro no painel' })),
    ]),
  ]),
];

/* ---------- pontos declarados ---------- */

export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  return [
    { nome: 'canto de trás, embaixo, da placa de trás', parte: 'placaTras', medida: 'minimo', em: [-T.placa_meia_largura, T.placa_y0, T.placa_z_tras], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da placa da frente', parte: 'placaFrente', medida: 'maximo', em: [T.placa_meia_largura, T.placa_y1, T.placa_z_frente], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, do para-choque', parte: 'paraChoqueFrente', medida: 'maximo', em: [larguraDaPlanta(T, T.nariz_z), T.para_choque_y1, T.para_choque_z1], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, do luminoso', parte: 'luminoso', medida: 'maximo', em: [T.luminoso_meia_largura_base, T.luminoso_topo_y, T.luminoso_z1], toleranciaMm: tol },
    { nome: 'teto da cabine, na frente', parte: 'cabine', medida: 'maximo', em: [T.carroceria_meia_largura, T.teto_y, T.pilar_frente_z], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.retrovisor_y1, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-T.roda_x_fora, 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente e em cima', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.roda_x_fora, 2 * T.roda_raio, T.roda_z_frente + T.roda_raio], toleranciaMm: tol },
    { nome: 'cume do para-lama da frente à direita', parte: 'paraLamaFrenteDir', medida: 'maximo', em: [T.chassi_meia_largura, T.roda_raio + T.para_lama_raio, T.roda_z_frente + T.para_lama_raio], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'carro-taxi', desc: 'táxi estilizado, amarelo, de frente alta, chassi cinza mais largo, para-lamas, cabine que afunila com luminoso, vidros azuis, grade, rodas com aro' },
  PARAMS: TABELA,
  MATERIAIS: {
    amarelo: { tipo: 'liso', cor: '#e9a23b' },
    cinzaEscuro: { tipo: 'liso', cor: '#474853' },
    cinza: { tipo: 'liso', cor: '#5b5c6c' },
    caixaRoda: { tipo: 'liso', cor: '#2c2d35' },
    luminoso: { tipo: 'liso', cor: '#d3d3d7' },
    vidro: { tipo: 'liso', cor: '#cfe3f2' },
    grade: { tipo: 'liso', cor: '#8a8fa8' },
    cinzaClaro: { tipo: 'liso', cor: '#c4c6ce' },
    farol: { tipo: 'liso', cor: '#d6b92c' },
    lanterna: { tipo: 'liso', cor: '#b3262e' },
    pneu: { tipo: 'liso', cor: '#222226' },
    aro: { tipo: 'metal', cor: '#767a8e', acabamento: 'escovado' },
  },
  TOPO: { origem: 'chão, no meio do táxi em x e em z; y para cima e a frente do táxi em +z' },
  PLANO: {
    objeto: 'táxi estilizado de 4854 mm de comprimento, 2648 mm de largura com os espelhos e 2648 mm de altura com o luminoso, de frente alta e vertical, chassi cinza mais largo que a carroceria, para-lamas em cápsula, cabine que afunila e rodas grandes',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do táxi, de z -2427 a 2427, com as placas', milimetros: 4854 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'corpo amarelo de 1950 mm de largura, de y 880 a 1412, com nariz vertical em z 2260, capô plano, tampa de trás em rampa até y 1250 e os arcos das quatro rodas no perfil', tecnica: 'extrusao com eixo x do perfil lateral, com os arcos recortados no perfil' },
      { nome: 'chassiFrente', forma: 'trecho do chassi cinza escuro à frente do arco dianteiro, de y 350 a 880, com soleira de 2294 mm de largura até y 520 e painel de 1950 acima', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal em degrau extrudada em z' },
      { nome: 'chassiCentro', forma: 'trecho do chassi cinza escuro entre os arcos, de y 350 a 880, com soleira de 2294 mm e painel de 1950', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal em degrau extrudada em z' },
      { nome: 'chassiTras', forma: 'trecho do chassi cinza escuro atrás do arco traseiro, de y 350 a 880, com soleira de 2294 mm e painel de 1950', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal em degrau extrudada em z' },
      { nome: 'cabine', forma: 'cabine amarela de y 1412 a 2295, com pilares inclinados, teto plano e a largura afunilando de 1950 na cintura a 1610 no teto', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal trapezoidal extrudada em z' },
      { nome: 'luminoso', forma: 'caixa clara sobre o teto, de y 2295 a 2648 e z -758 a 152, de 370 mm de largura na base e 200 no topo', tecnica: 'intersecao do retângulo lateral extrudado em x com o trapézio frontal extrudado em z' },
      { nome: 'parabrisa', forma: 'placa de vidro azul clara de 20 mm sobre a face inclinada da frente da cabine, de y 1500 a 2140, mais estreita que a cabine', tecnica: 'intersecao da faixa lateral paralela à face extrudada em x com o trapézio frontal extrudado em z' },
      { nome: 'vidroTraseiro', forma: 'placa de vidro azul clara de 20 mm sobre a face inclinada de trás da cabine, de y 1508 a 2173', tecnica: 'intersecao da faixa lateral paralela à face extrudada em x com o trapézio frontal extrudado em z' },
      { nome: 'vidroLateralDir', forma: 'janela da frente em placa de vidro de 12 mm sobre a lateral inclinada direita da cabine, de z -33 a 950', tecnica: 'intersecao do trapézio lateral extrudado em x com a casca frontal inclinada extrudada em z' },
      { nome: 'vidroLateralEsq', forma: 'janela da frente em placa de vidro de 12 mm sobre a lateral inclinada esquerda da cabine, de z -33 a 950', tecnica: 'intersecao do trapézio lateral extrudado em x com a casca frontal inclinada extrudada em z' },
      { nome: 'paraChoqueFrente', forma: 'caixa cinza de 2294 por 355 por 116 mm, de y 350 a 705 e z 2260 a 2376, com as quinas da planta fechadas até 1002 de meia largura', tecnica: 'extrusao com eixo y da planta de quinas fechadas, encostada na face da frente do chassi' },
      { nome: 'paraChoqueTras', forma: 'caixa cinza de 2294 por 355 por 37 mm, de y 350 a 705 e z -2376 a -2339, com as quinas da planta fechadas até 1002 de meia largura', tecnica: 'extrusao com eixo y da planta de quinas fechadas, encostada na face de trás do chassi' },
      { nome: 'placaFrente', forma: 'placa clara de 620 por 306 por 51 mm, de y 264 a 570, saindo do para-choque até z 2427', tecnica: 'cubo encostado na face da frente do para-choque' },
      { nome: 'placaTras', forma: 'placa clara de 620 por 306 por 88 mm, de y 264 a 570, saindo do para-choque de trás até z -2427', tecnica: 'cubo encostado na face de trás do chassi' },
      { nome: 'grade', forma: 'placa cinza azulada de 986 por 354 mm, de y 880 a 1234, entre os faróis, saindo 20 mm do nariz', tecnica: 'cubo encostado no nariz' },
      { nome: 'blocoFarolDir', forma: 'bloco amarelo de 476 por 354 por 50 mm, de x 493 a 969 e y 880 a 1234, saindo do nariz à direita', tecnica: 'cubo encostado no nariz' },
      { nome: 'blocoFarolEsq', forma: 'bloco amarelo de 476 por 354 por 50 mm, de x -969 a -493 e y 880 a 1234, saindo do nariz à esquerda', tecnica: 'cubo encostado no nariz' },
      { nome: 'farolDir', forma: 'faixa dourada de 476 por 178 por 50 mm, de y 1234 a 1412, sobre o bloco do farol direito', tecnica: 'cubo assentado no bloco' },
      { nome: 'farolEsq', forma: 'faixa dourada de 476 por 178 por 50 mm, de y 1234 a 1412, sobre o bloco do farol esquerdo', tecnica: 'cubo assentado no bloco' },
      { nome: 'lanternaDir', forma: 'caixa vermelha de 470 por 150 por 12 mm na face de trás à direita, posição suposta', tecnica: 'cubo encostado na face de trás da carroceria' },
      { nome: 'lanternaEsq', forma: 'caixa vermelha de 470 por 150 por 12 mm na face de trás à esquerda, posição suposta', tecnica: 'cubo encostado na face de trás da carroceria' },
      { nome: 'frisoDir', forma: 'friso claro de 10 mm sobre a lateral direita da carroceria, de y 880 a 1142 e z -476 a 580', tecnica: 'cubo encostado na lateral da carroceria' },
      { nome: 'frisoEsq', forma: 'friso claro de 10 mm sobre a lateral esquerda da carroceria, de y 880 a 1142 e z -476 a 580', tecnica: 'cubo encostado na lateral da carroceria' },
      { nome: 'retrovisorDir', forma: 'caixa amarela de 349 por 175 por 203 mm, da lateral da carroceria a x 1324, de y 1230 a 1405', tecnica: 'cubo encostado na lateral da carroceria' },
      { nome: 'retrovisorEsq', forma: 'caixa amarela de 349 por 175 por 203 mm, da lateral da carroceria a x -1324, de y 1230 a 1405', tecnica: 'cubo encostado na lateral da carroceria' },
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `paraLama${p}${l}`,
        forma: `cápsula de 172 mm de espessura sobre a roda ${p === 'Frente' ? 'da frente' : 'de trás'} ${l === 'Dir' ? 'à direita' : 'à esquerda'}, anel de 590 a 680 mm de raio sobre a soleira, de x 975 a 1147`,
        tecnica: 'extrusao com eixo x de um anel em arco, cortado na face de cima da soleira',
      }))),
      ...PONTAS.map((p) => ({
        nome: `caixaRoda${p}`,
        forma: `caixa escura do arco ${p === 'Frente' ? 'dianteiro' : 'traseiro'}, de 1060 mm de largura entre as faces de dentro dos pneus, com 590 mm de raio, fechada em y 350`,
        tecnica: 'extrusao com eixo x do próprio arco do perfil, fechado na base',
      })),
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `roda${p}${l}`,
        forma: `pneu escuro de 1060 mm de diâmetro e 529 mm de largura com chanfro de 50 mm, centro em y 530 e z ${p === 'Frente' ? '1386' : '-1297'}, ${l === 'Dir' ? 'à direita' : 'à esquerda'}`,
        tecnica: 'lathe em torno de x, com o chanfro no perfil',
      }))),
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `aro${p}${l}`,
        forma: `aro cinza de 660 mm de diâmetro e 20 mm de espessura com cubo de 340 mm saindo 15 mm, na face de fora do pneu ${p === 'Frente' ? 'da frente' : 'de trás'} ${l === 'Dir' ? 'à direita' : 'à esquerda'}`,
        tecnica: 'lathe em torno de x, com o degrau do cubo no perfil',
      }))),
    ],
    criteriosDeReprovacao: [
      'a caixa total não fica em x -1324 a 1324, y 0 a 2648 e z -2427 a 2427, ou alguma roda não toca o chão',
      'um lado do táxi difere do outro em medida ou posição de peça simétrica',
      'o nariz é uma rampa até o para-choque, e não uma face vertical em z 2260 com faróis, grade e bloco',
      'a cabine tem largura constante, e não afunila de 1950 mm na cintura a 1610 mm no teto',
      'o chassi não é mais largo que a carroceria, ou as rodas ficam escondidas, sem arco recortado e sem caixa de roda',
      'o luminoso não assenta no teto plano da cabine, ou não é mais estreito no topo que na base',
      'um para-lama não é saliente em volta da roda, ou fica colado no pneu',
      'a silhueta lateral, frontal ou de cima difere da referência, vista na folha comparativa, em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
