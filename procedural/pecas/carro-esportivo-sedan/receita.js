/* carro-esportivo-sedan — sedã esportivo estilizado, laranja, baixo e longo, de cabine rebaixada e afunilada, nariz inclinado com
 * faróis amarelos sobre o capô, para-lamas salientes em arco sobre as quatro rodas, para-choques e chassi cinza, placas claras e
 * aerofólio traseiro em duas hastes.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "sedan-sports" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/sedan-sports.glb, que o git ignora. O que
 * entra aqui são as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765, com o ponto médio do comprimento
 * em z 0) e as vistas (referencias/fonte-vistas.png). O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do carro em +z, x para a direita de quem olha de frente, centrado em
 * x. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve, por parte, a forma,
 * a `parte` e o `material`. A conversão para metro está em `m`, num lugar só. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita (técnica das três vistas): a carroceria é uma extrusão em x do perfil lateral, com os arcos das rodas
 * recortados no próprio perfil. A cabine, o chassi, os vidros, os faróis, as lanternas e as hastes do aerofólio são a INTERSEÇÃO
 * do perfil lateral (z, y) extrudado em x com a seção frontal (x, y) extrudada em z, e por isso afunilam sem nenhum vértice
 * calculado em 3D; as placas usam os mesmos vértices da face que cobrem. Uma extrusão com `eixo: 'x'` leva o perfil [u, v] a
 * y = -u e z = v; com `eixo: 'z'`, a x = u e y = -v; com `eixo: 'y'`, a x = u e z = v. As rodas são revoluções em torno de x
 * (`lathe`), com o chanfro do pneu no perfil. A caixa de roda é o próprio arco do perfil, fechado e extrudado entre as faces de
 * dentro dos dois pneus.
 */

export const TABELA = {
  lados: 24, // contagem de lados dos pneus e dos arcos (a mesma, para os arcos coincidirem com a caixa de roda)

  // carroceria: perfil lateral de y 882 (sobre o chassi) ao topo; nariz inclinado em duas retas, capô longo, tampa de trás em rampa
  carroceria_meia_largura: 971,
  topo_chassi_y: 882,
  nariz_z: 2074,
  nariz_topo_y: 1059,
  capo_z: 1633,
  capo_y: 1324,
  cintura_z: 1015,
  cintura_y: 1412,
  porta_malas_z: -1456,
  traseira_z: -2162,
  traseira_topo_y: 1059,

  // chassi cinza escuro: a soleira (mais larga, de y 353 a 706) e o painel (da largura da carroceria, de 706 a 882)
  chassi_meia_largura: 1147,
  chassi_base_y: 353,
  soleira_topo_y: 706,
  chassi_z: 1986,

  // cabine: perfil lateral de pilar a pilar e seção frontal em dois trechos (971 na cintura, 850 em y 1774, 794 no teto)
  teto_y: 1941,
  teto_frente_z: 309,
  teto_tras_z: -927,
  cabine_meio_y: 1774,
  cabine_meio_meia_largura: 850,
  cabine_topo_meia_largura: 794,

  // vidros azul claros: placas sobre as faces da cabine
  vidro_espessura: 10,
  parabrisa_y1: 1836,
  parabrisa_meia_largura_y0: 791,
  parabrisa_meia_largura_y1: 650,
  vidro_traseiro_y0: 1537,
  vidro_traseiro_y1: 1817,
  vidro_traseiro_meia_largura_y0: 748,
  vidro_traseiro_meia_largura_y1: 655,
  vidro_lateral_frente_z: 730,
  vidro_lateral_topo_frente_z: 247,
  vidro_lateral_tras_z: -302,

  // rodas: pneu de 1059 mm de diâmetro e 618 de largura, com chanfro; aro cinza com cubo saindo da face de fora
  roda_raio: 530,
  roda_x_dentro: 441,
  roda_x_fora: 1059,
  roda_z_frente: 1209,
  roda_z_tras: -1121,
  roda_chanfro: 50,
  aro_raio: 330,
  aro_espessura: 20,
  cubo_raio: 170,
  cubo_saliencia: 15,

  // arcos: o do perfil (a caixa de roda enche o mesmo arco) e a cápsula do para-lama em volta dele
  arco_raio: 600,
  para_lama_raio: 688,

  // para-choques (planta das pontas, igual na frente e atrás) e placas
  para_choque_z0: 1986,
  para_choque_x0: 1147,
  para_choque_z1: 2110,
  para_choque_x1: 1096,
  para_choque_z2: 2162,
  para_choque_x2: 971,
  para_choque_y1: 706,
  placa_z: 2250,
  placa_meia_largura: 309,
  placa_y0: 265,
  placa_y1: 574,
  placa_chanfro: 88,

  // faróis amarelos no capô e lanternas vermelhas na rampa de trás
  farol_x0: 485,
  farol_z1: 1853,
  farol_espessura: 12,
  lanterna_x0: 745,
  lanterna_z1: -2050,
  lanterna_espessura: 12,

  // retrovisores e aerofólio
  retrovisor_x1: 1147,
  retrovisor_y0: 1236,
  retrovisor_z0: 614,
  retrovisor_z1: 790,
  asa_z0: -1633,
  asa_z1: -2052,
  asa_y0: 1412,
  asa_y_frente: 1500,
  asa_quebra_z: -1842,
  asa_y1: 1589,
  perna_x0: 376,
  perna_x1: 552,
  perna_z0: -1737,
  perna_z1: -1947,
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
/* O paralelogramo da aresta P-Q deslocado `e` para fora, na direção da normal `n`; a face de dentro usa os mesmos vértices. */
function placaSobre(P, Q, e, n) {
  const k = e / Math.hypot(...n);
  return [P, Q, [Q[0] + n[0] * k, Q[1] + n[1] * k], [P[0] + n[0] * k, P[1] + n[1] * k]];
}
const retangulo = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

/* ---------- derivar ---------- */

/* Cada forma tem `nome`, `forma` (vistas, lateral, planta, secaoZ, cubo ou lathe), `material` e as medidas da forma, em milímetro. */
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
  const formas = [];

  /* retas que dão os planos inclinados: capô, para-brisa, vidro traseiro e rampa de trás */
  const yDoCapo = (z) => T.nariz_topo_y + ((T.nariz_z - z) * (T.capo_y - T.nariz_topo_y)) / (T.nariz_z - T.capo_z);
  const yDaRampa = (z) => T.traseira_topo_y + ((z - T.traseira_z) * (T.cintura_y - T.traseira_topo_y)) / (T.porta_malas_z - T.traseira_z);
  const zDoParabrisa = (y) => T.cintura_z + ((y - T.cintura_y) * (T.teto_frente_z - T.cintura_z)) / (T.teto_y - T.cintura_y);
  const zDoTraseiro = (y) => T.teto_tras_z + ((y - T.teto_y) * (T.porta_malas_z - T.teto_tras_z)) / (T.cintura_y - T.teto_y);

  /* carroceria: extrusão em x do perfil lateral, com os arcos das rodas no perfil (de trás para a frente na borda de baixo) */
  formas.push({
    nome: 'carroceria', forma: 'lateral', material: 'laranja', x0: -M, largura: 2 * M,
    lado: [
      [T.nariz_z, T.topo_chassi_y], [T.nariz_z, T.nariz_topo_y], [T.capo_z, T.capo_y], [T.cintura_z, T.cintura_y],
      [T.porta_malas_z, T.cintura_y], [T.traseira_z, T.traseira_topo_y], [T.traseira_z, T.topo_chassi_y],
      ...arco(zT, T.topo_chassi_y), ...arco(zF, T.topo_chassi_y),
    ],
  });

  /* chassi em três trechos (frente, centro e trás), separados pelos arcos: o perfil lateral de y 353 a 882, e a seção frontal em
   * degrau (soleira de 1147 de meia largura até y 706, painel da largura da carroceria acima) */
  const y0 = T.chassi_base_y;
  const y1 = T.topo_chassi_y;
  const degrau = [[-C, y0 - 50], [C, y0 - 50], [C, T.soleira_topo_y], [M, T.soleira_topo_y], [M, y1 + 70],
    [-M, y1 + 70], [-M, T.soleira_topo_y], [-C, T.soleira_topo_y]];
  const arcoDir = (zc) => trechoDoArco(zc, yR, T.arco_raio, T.lados, 1, y0, y1);
  const arcoEsq = (zc) => trechoDoArco(zc, yR, T.arco_raio, T.lados, -1, y0, y1);
  formas.push({ nome: 'chassiFrente', forma: 'vistas', material: 'cinzaEscuro', frontal: degrau, lado: [...arcoDir(zF), [T.chassi_z, y0], [T.chassi_z, y1]] });
  formas.push({ nome: 'chassiCentro', forma: 'vistas', material: 'cinzaEscuro', frontal: degrau, lado: [...arcoDir(zT), ...arcoEsq(zF)] });
  formas.push({ nome: 'chassiTras', forma: 'vistas', material: 'cinzaEscuro', frontal: degrau, lado: [[-T.chassi_z, y0], ...arcoEsq(zT), [-T.chassi_z, y1]] });

  /* painéis do nariz e da traseira: o painel escuro entre o para-choque e a carroceria, de y 706 a 882 */
  formas.push({
    nome: 'painelFrente', forma: 'cubo', material: 'cinzaEscuro', larg: 2 * M, alt: y1 - T.soleira_topo_y, prof: T.nariz_z - T.chassi_z,
    em: [0, T.soleira_topo_y, (T.nariz_z + T.chassi_z) / 2],
  });
  formas.push({
    nome: 'painelTras', forma: 'cubo', material: 'cinzaEscuro', larg: 2 * M, alt: y1 - T.soleira_topo_y, prof: T.chassi_z + T.traseira_z,
    em: [0, T.soleira_topo_y, (-T.chassi_z + T.traseira_z) / 2],
  });

  /* cabine: o perfil lateral de pilar a pilar sobre a cintura, e a seção frontal que afunila em dois trechos até o teto */
  const xCabine = (y) => (y <= T.cabine_meio_y
    ? reta(T.cintura_y, M, T.cabine_meio_y, T.cabine_meio_meia_largura)(y)
    : reta(T.cabine_meio_y, T.cabine_meio_meia_largura, T.teto_y, T.cabine_topo_meia_largura)(y));
  const yA = T.cintura_y - 110;
  const yB = T.teto_y + 105;
  const trapezio = (xDe, ya, yb) => [[-xDe(ya), ya], [xDe(ya), ya], [xDe(T.cabine_meio_y), T.cabine_meio_y], [xDe(yb), yb],
    [-xDe(yb), yb], [-xDe(T.cabine_meio_y), T.cabine_meio_y]];
  formas.push({
    nome: 'cabine', forma: 'vistas', material: 'laranja',
    lado: [[T.cintura_z, T.cintura_y], [T.teto_frente_z, T.teto_y], [T.teto_tras_z, T.teto_y], [T.porta_malas_z, T.cintura_y]],
    frontal: trapezio(xCabine, yA, yB),
  });

  /* para-brisa e vidro traseiro: placas sobre as faces inclinadas da cabine, mais estreitas que ela */
  const e = T.vidro_espessura;
  const Pp = [T.cintura_z, T.cintura_y];
  const Qp = [zDoParabrisa(T.parabrisa_y1), T.parabrisa_y1];
  const xParabrisa = reta(T.cintura_y, T.parabrisa_meia_largura_y0, T.parabrisa_y1, T.parabrisa_meia_largura_y1);
  formas.push({
    nome: 'parabrisa', forma: 'vistas', material: 'vidro',
    lado: placaSobre(Pp, Qp, e, [Qp[1] - Pp[1], Pp[0] - Qp[0]]),
    frontal: [[-xParabrisa(T.cintura_y - 100), T.cintura_y - 100], [xParabrisa(T.cintura_y - 100), T.cintura_y - 100],
      [xParabrisa(T.parabrisa_y1 + 100), T.parabrisa_y1 + 100], [-xParabrisa(T.parabrisa_y1 + 100), T.parabrisa_y1 + 100]],
  });
  const Pt = [zDoTraseiro(T.vidro_traseiro_y1), T.vidro_traseiro_y1];
  const Qt = [zDoTraseiro(T.vidro_traseiro_y0), T.vidro_traseiro_y0];
  const xTraseiro = reta(T.vidro_traseiro_y0, T.vidro_traseiro_meia_largura_y0, T.vidro_traseiro_y1, T.vidro_traseiro_meia_largura_y1);
  formas.push({
    nome: 'vidroTraseiro', forma: 'vistas', material: 'vidro',
    lado: placaSobre(Pt, Qt, e, [-(Pt[1] - Qt[1]), Pt[0] - Qt[0]]),
    frontal: [[-xTraseiro(T.vidro_traseiro_y0 - 100), T.vidro_traseiro_y0 - 100], [xTraseiro(T.vidro_traseiro_y0 - 100), T.vidro_traseiro_y0 - 100],
      [xTraseiro(T.vidro_traseiro_y1 + 100), T.vidro_traseiro_y1 + 100], [-xTraseiro(T.vidro_traseiro_y1 + 100), T.vidro_traseiro_y1 + 100]],
  });

  /* vidros laterais: uma casca de 10 mm sobre a lateral inclinada da cabine, de y 1412 a 1774, com a frente paralela ao pilar */
  const janela = [[T.vidro_lateral_frente_z, T.cintura_y], [T.vidro_lateral_topo_frente_z, T.cabine_meio_y],
    [T.vidro_lateral_tras_z, T.cabine_meio_y], [T.vidro_lateral_tras_z, T.cintura_y]];
  const yC = T.cabine_meio_y + 26;
  for (const s of [1, -1]) {
    formas.push({
      nome: `vidroLateral${s > 0 ? 'Dir' : 'Esq'}`, forma: 'vistas', material: 'vidro', lado: janela,
      frontal: [[s * xCabine(yA), yA], [s * (xCabine(yA) + e), yA], [s * (xCabine(yC) + e), yC], [s * xCabine(yC), yC]],
    });
  }

  /* para-choques: planta de quinas fechadas (1147 de meia largura, 1096 e 971 na ponta), de y 353 a 706; placas em seção octogonal */
  const bordaF = [[T.para_choque_x0, T.para_choque_z0], [T.para_choque_x1, T.para_choque_z1], [T.para_choque_x2, T.para_choque_z2]];
  const bordaT = [[T.para_choque_x0, -T.para_choque_z0], [T.para_choque_x1, -T.para_choque_z1], [T.para_choque_x2, -T.para_choque_z2]];
  const espelho = (pts) => [...pts, ...[...pts].reverse().map(([x, z]) => [-x, z])];
  formas.push({
    nome: 'paraChoqueFrente', forma: 'planta', material: 'cinza', y0: T.chassi_base_y, altura: T.para_choque_y1 - T.chassi_base_y,
    planta: espelho(bordaF),
  });
  formas.push({
    nome: 'paraChoqueTras', forma: 'planta', material: 'cinza', y0: T.chassi_base_y, altura: T.para_choque_y1 - T.chassi_base_y,
    planta: espelho(bordaT),
  });
  const w = T.placa_meia_largura;
  const c = T.placa_chanfro;
  const secaoPlaca = [[-(w - c), T.placa_y0], [w - c, T.placa_y0], [w, T.placa_y0 + c], [w, T.placa_y1 - c], [w - c, T.placa_y1],
    [-(w - c), T.placa_y1], [-w, T.placa_y1 - c], [-w, T.placa_y0 + c]];
  formas.push({ nome: 'placaFrente', forma: 'secaoZ', material: 'cinzaClaro', secao: secaoPlaca, z0: T.para_choque_z2, z1: T.placa_z });
  formas.push({ nome: 'placaTras', forma: 'secaoZ', material: 'cinzaClaro', secao: secaoPlaca, z0: -T.placa_z, z1: -T.para_choque_z2 });

  /* faróis sobre a primeira metade da rampa do nariz e lanternas na ponta da rampa de trás, placas de 12 mm sobre a face */
  const Pf = [T.nariz_z, T.nariz_topo_y];
  const Qf = [T.farol_z1, yDoCapo(T.farol_z1)];
  const Pl = [T.traseira_z, T.traseira_topo_y];
  const Ql = [T.lanterna_z1, yDaRampa(T.lanterna_z1)];
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const [xa, xb] = s > 0 ? [T.farol_x0, M] : [-M, -T.farol_x0];
    formas.push({
      nome: `farol${lado}`, forma: 'vistas', material: 'amarelo',
      lado: placaSobre(Pf, Qf, T.farol_espessura, [Qf[1] - Pf[1], Pf[0] - Qf[0]]), frontal: retangulo(xa, xb, 900, 1600),
    });
    const [la, lb] = s > 0 ? [T.lanterna_x0, M] : [-M, -T.lanterna_x0];
    formas.push({
      nome: `lanterna${lado}`, forma: 'vistas', material: 'lanterna',
      lado: placaSobre(Pl, Ql, T.lanterna_espessura, [-(Ql[1] - Pl[1]), Ql[0] - Pl[0]]), frontal: retangulo(la, lb, 900, 1600),
    });
    formas.push({
      nome: `retrovisor${lado}`, forma: 'cubo', material: 'laranja', larg: T.retrovisor_x1 - M, alt: T.cintura_y - T.retrovisor_y0,
      prof: T.retrovisor_z1 - T.retrovisor_z0, em: [s * (M + T.retrovisor_x1) / 2, T.retrovisor_y0, (T.retrovisor_z0 + T.retrovisor_z1) / 2],
    });
  }

  /* aerofólio: a asa, de lado a lado, e duas hastes escuras que descem dela até a rampa de trás */
  formas.push({
    nome: 'asa', forma: 'lateral', material: 'laranja', x0: -M, largura: 2 * M,
    lado: [[T.asa_z0, T.asa_y0], [T.asa_z0, T.asa_y_frente], [T.asa_quebra_z, T.asa_y1], [T.asa_z1, T.asa_y1], [T.asa_z1, T.asa_y0]],
  });
  for (const s of [1, -1]) {
    formas.push({
      nome: `perna${s > 0 ? 'Dir' : 'Esq'}`, forma: 'lateral', material: 'cinzaEscuro', x0: s > 0 ? T.perna_x0 : -T.perna_x1,
      largura: T.perna_x1 - T.perna_x0,
      lado: [[T.perna_z0, yDaRampa(T.perna_z0)], [T.perna_z1, yDaRampa(T.perna_z1)], [T.perna_z1, T.asa_y0], [T.perna_z0, T.asa_y0]],
    });
  }

  /* para-lamas: anel de 600 a 688 de raio sobre a soleira, de x 971 a 1147 */
  for (const r of rodas) {
    const ext = capaAcima(r.zc, yR, T.para_lama_raio, T.lados, T.soleira_topo_y);
    const int = capaAcima(r.zc, yR, T.arco_raio, T.lados, T.soleira_topo_y);
    formas.push({
      nome: `paraLama${r.ponta}${r.lado}`, forma: 'lateral', material: 'cinzaAzul', x0: r.s > 0 ? M : -C, largura: C - M, lado: [...ext, ...[...int].reverse()],
    });
  }

  /* caixas de roda: o arco do perfil, fechado em y 353, entre as faces de dentro dos dois pneus */
  for (const [ponta, zc] of [['Frente', zF], ['Tras', zT]]) {
    formas.push({
      nome: `caixaRoda${ponta}`, forma: 'lateral', material: 'caixaRoda', x0: -T.roda_x_dentro, largura: 2 * T.roda_x_dentro,
      lado: capaAcima(zc, yR, T.arco_raio, T.lados, T.chassi_base_y),
    });
  }

  /* rodas: pneu com chanfro e aro com cubo, revoluções em torno de x */
  const R = T.roda_raio;
  const ch = T.roda_chanfro;
  const L = T.roda_x_fora - T.roda_x_dentro;
  const aroDir = [[0, 0], [T.aro_raio, 0], [T.aro_raio, T.aro_espessura], [T.cubo_raio, T.aro_espessura],
    [T.cubo_raio, T.aro_espessura + T.cubo_saliencia], [0, T.aro_espessura + T.cubo_saliencia]];
  const aroEsq = aroDir.map(([r, a]) => [r, T.aro_espessura + T.cubo_saliencia - a]);
  for (const r of rodas) {
    formas.push({
      nome: `roda${r.ponta}${r.lado}`, forma: 'lathe', material: 'pneu', liso: true, lados: T.lados,
      perfil: [[0, 0], [R - ch, 0], [R, ch], [R, L - ch], [R - ch, L], [0, L]], em: [r.s > 0 ? T.roda_x_dentro : -T.roda_x_fora, yR, r.zc],
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
    const L = T.chassi_meia_largura + 100;
    const Cz = T.placa_z + 100;
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilM(perfilLateral(f.lado)) }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * Cz), em: [0, 0, m(-Cz)], perfil: perfilM(secaoFrontal(f.frontal)) }]);
    passos.push(['intersectar', { origemId: base + 10, solidos: [{ origem: { op: 'extrusao', id: base + 1 } }, { origem: { op: 'extrusao', id: base + 2 } }] }]);
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
  } else if (f.forma === 'secaoZ') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'z', altura: m(f.z1 - f.z0), em: [0, 0, m(f.z0)], perfil: perfilM(secaoFrontal(f.secao)) }]);
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
  ...['chassiFrente', 'chassiCentro', 'chassiTras'].map((ch) => ({
    par: ['carroceria', ch], motivo: 'a face de baixo da carroceria, em y 882, assenta na face de cima do painel do chassi, de x -971 a 971',
  })),
  { par: ['carroceria', 'cabine'], motivo: 'a face de baixo da cabine, em y 1412, assenta no tampo da carroceria, de z -1456 a 1015' },
  { par: ['cabine', 'parabrisa'], motivo: 'a face de trás do para-brisa é o mesmo plano da face inclinada da frente da cabine' },
  { par: ['cabine', 'vidroTraseiro'], motivo: 'a face da frente do vidro traseiro é o mesmo plano da face inclinada de trás da cabine' },
  { par: ['cabine', 'vidroLateralDir'], motivo: 'a face de dentro do vidro lateral direito é o mesmo plano da lateral inclinada da cabine' },
  { par: ['cabine', 'vidroLateralEsq'], motivo: 'a face de dentro do vidro lateral esquerdo é o mesmo plano da lateral inclinada da cabine' },
  { par: ['carroceria', 'parabrisa'], motivo: 'a aresta de baixo do para-brisa, em y 1412 e z 1015, toca o canto do capô com a cabine, só pela aresta' },
  { par: ['chassiFrente', 'paraChoqueFrente'], motivo: 'a face de trás do para-choque encosta na face da frente do chassi, em z 1986' },
  { par: ['chassiTras', 'paraChoqueTras'], motivo: 'a face da frente do para-choque de trás encosta na face de trás do chassi, em z -1986' },
  { par: ['painelFrente', 'chassiFrente'], motivo: 'a face de trás do painel do nariz encosta na face da frente do painel do chassi, em z 1986' },
  { par: ['painelFrente', 'paraChoqueFrente'], motivo: 'a face de baixo do painel do nariz assenta na face de cima do para-choque, em y 706' },
  { par: ['painelFrente', 'carroceria'], motivo: 'a face de cima do painel do nariz, em y 882, assenta sob a carroceria' },
  { par: ['painelTras', 'chassiTras'], motivo: 'a face da frente do painel de trás encosta na face de trás do painel do chassi, em z -1986' },
  { par: ['painelTras', 'paraChoqueTras'], motivo: 'a face de baixo do painel de trás assenta na face de cima do para-choque, em y 706' },
  { par: ['painelTras', 'carroceria'], motivo: 'a face de cima do painel de trás, em y 882, assenta sob a carroceria' },
  { par: ['paraChoqueFrente', 'placaFrente'], motivo: 'a face de trás da placa encosta na face da frente do para-choque, em z 2162' },
  { par: ['paraChoqueTras', 'placaTras'], motivo: 'a face da frente da placa de trás encosta na face de trás do para-choque, em z -2162' },
  ...LADOS.flatMap((l) => [
    { par: ['carroceria', `farol${l}`], motivo: 'a face de trás do farol é o mesmo plano da rampa do nariz, de z 1853 a 2074' },
    { par: ['carroceria', `lanterna${l}`], motivo: 'a face de baixo da lanterna é o mesmo plano da rampa de trás, de z -2162 a -2050' },
    { par: ['carroceria', `retrovisor${l}`], motivo: 'a face de dentro do retrovisor encosta na lateral da carroceria, em x 971 ou -971' },
    { par: ['carroceria', `vidroLateral${l}`], motivo: 'a aresta de baixo da casca do vidro lateral, em y 1412 e x 971, toca o canto de cima da lateral da carroceria' },
    { par: [`retrovisor${l}`, `vidroLateral${l}`], motivo: 'a face de baixo da casca do vidro lateral, em y 1412, assenta sobre a face de cima do retrovisor' },
    { par: [`perna${l}`, 'carroceria'], motivo: 'a base da haste do aerofólio assenta na rampa de trás, de z -1947 a -1737' },
    { par: [`perna${l}`, 'asa'], motivo: 'a face de cima da haste, em y 1412, sustenta a face de baixo da asa' },
  ]),
  ...PONTAS.flatMap((p) => [
    { par: [`caixaRoda${p}`, 'carroceria'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco da carroceria' },
    ...chassiDe[p].map((ch) => ({ par: [`caixaRoda${p}`, ch], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco do chassi' })),
    ...LADOS.flatMap((l) => [
      { par: [`caixaRoda${p}`, `roda${p}${l}`], motivo: 'a face de dentro do pneu, em x 441 ou -441, encosta na face da caixa de roda' },
      { par: [`aro${p}${l}`, `roda${p}${l}`], motivo: 'a face de dentro do aro encosta na face de fora do pneu, no disco do centro' },
      { par: [`paraLama${p}${l}`, 'carroceria'], motivo: 'a face de dentro do para-lama encosta na lateral da carroceria, em x 971 ou -971' },
      ...chassiDe[p].map((ch) => ({ par: [`paraLama${p}${l}`, ch], motivo: 'a base do para-lama assenta na soleira do chassi, em y 706, e a face de dentro no painel' })),
    ]),
  ]),
];

/* ---------- pontos declarados ---------- */

export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  return [
    { nome: 'canto de trás, embaixo, da placa de trás', parte: 'placaTras', medida: 'minimo', em: [-T.placa_meia_largura, T.placa_y0, -T.placa_z], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da placa da frente', parte: 'placaFrente', medida: 'maximo', em: [T.placa_meia_largura, T.placa_y1, T.placa_z], toleranciaMm: tol },
    { nome: 'canto da frente, na ponta, do para-choque', parte: 'paraChoqueFrente', medida: 'maximo', em: [T.para_choque_x0, T.para_choque_y1, T.para_choque_z2], toleranciaMm: tol },
    { nome: 'teto da cabine, na frente (pé do para-brisa, na cintura)', parte: 'cabine', medida: 'maximo', em: [T.carroceria_meia_largura, T.teto_y, T.cintura_z], toleranciaMm: tol },
    { nome: 'canto de trás, em cima, da asa', parte: 'asa', medida: 'minimo', em: [-T.carroceria_meia_largura, T.asa_y0, T.asa_z1], toleranciaMm: tol },
    { nome: 'topo da asa, na ponta', parte: 'asa', medida: 'maximo', em: [T.carroceria_meia_largura, T.asa_y1, T.asa_z0], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.cintura_y, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-T.roda_x_fora, 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente e em cima', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.roda_x_fora, 2 * T.roda_raio, T.roda_z_frente + T.roda_raio], toleranciaMm: tol },
    { nome: 'cume do para-lama da frente à direita', parte: 'paraLamaFrenteDir', medida: 'maximo', em: [T.chassi_meia_largura, T.roda_raio + T.para_lama_raio, Math.max(...capaAcima(T.roda_z_frente, T.roda_raio, T.para_lama_raio, T.lados, T.soleira_topo_y).map(([z]) => z))], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'carro-esportivo-sedan', desc: 'sedã esportivo estilizado, laranja, baixo, cabine rebaixada e afunilada, faróis no capô, para-lamas em arco, chassi cinza e aerofólio traseiro' },
  PARAMS: TABELA,
  MATERIAIS: {
    laranja: { tipo: 'liso', cor: '#ea6540', acabamento: 'pintado' },
    cinzaEscuro: { tipo: 'liso', cor: '#42444f' },
    cinza: { tipo: 'liso', cor: '#5f6275' },
    cinzaAzul: { tipo: 'liso', cor: '#70758b' },
    caixaRoda: { tipo: 'liso', cor: '#26272e' },
    vidro: { tipo: 'liso', cor: '#c9e2f3' },
    cinzaClaro: { tipo: 'liso', cor: '#b9bbc8' },
    amarelo: { tipo: 'liso', cor: '#f6c92e' },
    lanterna: { tipo: 'liso', cor: '#b8282f' },
    pneu: { tipo: 'liso', cor: '#1c1d21' },
    aro: { tipo: 'metal', cor: '#8a90a8', acabamento: 'escovado' },
  },
  TOPO: { origem: 'chão, no meio do carro em x e em z; y para cima e a frente do carro em +z' },
  PLANO: {
    objeto: 'sedã esportivo estilizado de 4500 mm de comprimento, 2294 mm de largura e 1941 mm de altura, laranja, baixo, de cabine afunilada, nariz inclinado, para-lamas em arco, chassi cinza e aerofólio traseiro em duas hastes',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do carro, de z -2250 a 2250, com as placas', milimetros: 4500 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'corpo laranja de 1942 mm de largura, de y 882 a 1412, com nariz em duas retas, capô longo, tampa de trás em rampa até y 1059 e os arcos das quatro rodas no perfil', tecnica: 'extrusao com eixo x do perfil lateral, com os arcos recortados no perfil' },
      { nome: 'chassiFrente', forma: 'trecho do chassi cinza escuro à frente do arco dianteiro, de y 353 a 882, com soleira de 2294 mm de largura até y 706 e painel de 1942 acima', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal em degrau extrudada em z' },
      { nome: 'chassiCentro', forma: 'trecho do chassi cinza escuro entre os arcos, de y 353 a 882, com soleira de 2294 mm e painel de 1942', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal em degrau extrudada em z' },
      { nome: 'chassiTras', forma: 'trecho do chassi cinza escuro atrás do arco traseiro, de y 353 a 882, com soleira de 2294 mm e painel de 1942', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal em degrau extrudada em z' },
      { nome: 'painelFrente', forma: 'painel cinza escuro de 1942 por 176 por 88 mm, de y 706 a 882 e z 1986 a 2074, sob o nariz', tecnica: 'cubo entre o chassi, o para-choque e a carroceria' },
      { nome: 'painelTras', forma: 'painel cinza escuro de 1942 por 176 por 176 mm, de y 706 a 882 e z -2162 a -1986, sob a traseira', tecnica: 'cubo entre o chassi, o para-choque e a carroceria' },
      { nome: 'cabine', forma: 'cabine laranja rebaixada de y 1412 a 1941, com para-brisa e traseira inclinados a 37 graus, teto plano e a largura afunilando de 1942 na cintura a 1588 no teto', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal de dois trechos extrudada em z' },
      { nome: 'parabrisa', forma: 'placa de vidro azul clara de 10 mm sobre a face inclinada da frente da cabine, de y 1412 a 1836, mais estreita que a cabine', tecnica: 'intersecao da faixa lateral paralela à face extrudada em x com o trapézio frontal extrudado em z' },
      { nome: 'vidroTraseiro', forma: 'placa de vidro azul clara de 10 mm sobre a face inclinada de trás da cabine, de y 1537 a 1817', tecnica: 'intersecao da faixa lateral paralela à face extrudada em x com o trapézio frontal extrudado em z' },
      { nome: 'vidroLateralDir', forma: 'janela em placa de vidro de 10 mm sobre a lateral inclinada direita da cabine, de z -302 a 730 na base e a 247 no alto', tecnica: 'intersecao do trapézio lateral extrudado em x com a casca frontal inclinada extrudada em z' },
      { nome: 'vidroLateralEsq', forma: 'janela em placa de vidro de 10 mm sobre a lateral inclinada esquerda da cabine, de z -302 a 730 na base e a 247 no alto', tecnica: 'intersecao do trapézio lateral extrudado em x com a casca frontal inclinada extrudada em z' },
      { nome: 'paraChoqueFrente', forma: 'caixa cinza de 2294 por 353 por 176 mm, de y 353 a 706 e z 1986 a 2162, com as quinas da planta fechadas até 1942 de largura', tecnica: 'extrusao com eixo y da planta de quinas fechadas, encostada na face da frente do chassi' },
      { nome: 'paraChoqueTras', forma: 'caixa cinza de 2294 por 353 por 176 mm, de y 353 a 706 e z -2162 a -1986, com as quinas da planta fechadas até 1942 de largura', tecnica: 'extrusao com eixo y da planta de quinas fechadas, encostada na face de trás do chassi' },
      { nome: 'placaFrente', forma: 'placa clara de 618 por 309 por 88 mm, de y 265 a 574, de seção octogonal, saindo do para-choque da frente até z 2250', tecnica: 'extrusao com eixo z de uma seção octogonal, encostada na face da frente do para-choque' },
      { nome: 'placaTras', forma: 'placa clara de 618 por 309 por 88 mm, de y 265 a 574, de seção octogonal, saindo do para-choque de trás até z -2250', tecnica: 'extrusao com eixo z de uma seção octogonal, encostada na face de trás do para-choque' },
      { nome: 'farolDir', forma: 'placa amarela de 486 por 12 mm sobre a rampa do nariz, de x 485 a 971 e z 1853 a 2074, à direita', tecnica: 'intersecao da faixa lateral paralela à rampa extrudada em x com o retângulo frontal extrudado em z' },
      { nome: 'farolEsq', forma: 'placa amarela de 486 por 12 mm sobre a rampa do nariz, de x -971 a -485 e z 1853 a 2074, à esquerda', tecnica: 'intersecao da faixa lateral paralela à rampa extrudada em x com o retângulo frontal extrudado em z' },
      { nome: 'lanternaDir', forma: 'placa vermelha de 226 por 12 mm sobre a rampa de trás, de x 745 a 971 e z -2162 a -2050, à direita, posição suposta pela vista de cima', tecnica: 'intersecao da faixa lateral paralela à rampa extrudada em x com o retângulo frontal extrudado em z' },
      { nome: 'lanternaEsq', forma: 'placa vermelha de 226 por 12 mm sobre a rampa de trás, de x -971 a -745 e z -2162 a -2050, à esquerda, posição suposta pela vista de cima', tecnica: 'intersecao da faixa lateral paralela à rampa extrudada em x com o retângulo frontal extrudado em z' },
      { nome: 'retrovisorDir', forma: 'caixa laranja de 176 por 176 por 176 mm, da lateral da carroceria a x 1147, de y 1236 a 1412', tecnica: 'cubo encostado na lateral da carroceria' },
      { nome: 'retrovisorEsq', forma: 'caixa laranja de 176 por 176 por 176 mm, da lateral da carroceria a x -1147, de y 1236 a 1412', tecnica: 'cubo encostado na lateral da carroceria' },
      { nome: 'asa', forma: 'asa laranja de 1942 mm de largura, de z -2052 a -1633, de y 1412 a 1500 na frente e 1589 atrás, com a metade da frente inclinada', tecnica: 'extrusao com eixo x do perfil lateral da asa' },
      { nome: 'pernaDir', forma: 'haste cinza escura de 176 mm de largura, de x 376 a 552 e z -1947 a -1737, da rampa de trás à asa', tecnica: 'extrusao com eixo x de um quadrilátero apoiado na rampa de trás' },
      { nome: 'pernaEsq', forma: 'haste cinza escura de 176 mm de largura, de x -552 a -376 e z -1947 a -1737, da rampa de trás à asa', tecnica: 'extrusao com eixo x de um quadrilátero apoiado na rampa de trás' },
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `paraLama${p}${l}`,
        forma: `cápsula de 176 mm de espessura sobre a roda ${p === 'Frente' ? 'da frente' : 'de trás'} ${l === 'Dir' ? 'à direita' : 'à esquerda'}, anel de 600 a 688 mm de raio sobre a soleira, de x 971 a 1147`,
        tecnica: 'extrusao com eixo x de um anel em arco, cortado na face de cima da soleira',
      }))),
      ...PONTAS.map((p) => ({
        nome: `caixaRoda${p}`,
        forma: `caixa escura do arco ${p === 'Frente' ? 'dianteiro' : 'traseiro'}, de 882 mm de largura entre as faces de dentro dos pneus, com 600 mm de raio, fechada em y 353`,
        tecnica: 'extrusao com eixo x do próprio arco do perfil, fechado na base',
      })),
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `roda${p}${l}`,
        forma: `pneu escuro de 1060 mm de diâmetro e 618 mm de largura com chanfro de 50 mm, centro em y 530 e z ${p === 'Frente' ? '1209' : '-1121'}, ${l === 'Dir' ? 'à direita' : 'à esquerda'}`,
        tecnica: 'lathe em torno de x, com o chanfro no perfil',
      }))),
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `aro${p}${l}`,
        forma: `aro cinza de 660 mm de diâmetro e 20 mm de espessura com cubo de 340 mm saindo 15 mm, na face de fora do pneu ${p === 'Frente' ? 'da frente' : 'de trás'} ${l === 'Dir' ? 'à direita' : 'à esquerda'}`,
        tecnica: 'lathe em torno de x, com o degrau do cubo no perfil',
      }))),
    ],
    criteriosDeReprovacao: [
      'a caixa total não fica em x -1147 a 1147, y 0 a 1941 e z -2250 a 2250, ou alguma roda não toca o chão',
      'um lado do carro difere do outro em medida ou posição de peça simétrica',
      'a cabine tem largura constante, e não afunila de 1942 mm na cintura a 1588 mm no teto, ou o teto não é plano',
      'o nariz é uma face vertical até o capô, e não uma rampa em duas retas com os faróis amarelos sobre ela',
      'o chassi não é mais largo que a carroceria, ou as rodas ficam escondidas, sem arco recortado e sem caixa de roda',
      'um para-lama não é saliente em volta da roda, ou fica colado no pneu',
      'o aerofólio não tem as duas hastes escuras sob a asa, ou a asa não fica acima da rampa de trás',
      'a silhueta lateral, frontal ou de cima difere da referência, vista na folha comparativa, em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
