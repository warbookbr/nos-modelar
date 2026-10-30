/* furgao-realista — cópia do `furgao` do acervo, ponto de partida do furgão realista (plano
 * docs/modelar/planos/2026-10-30-furgao-realista.md, alinhamento no banco de provas furgao-realista-2026-10-30). Até a
 * etapa 1 da modelagem a forma é a do `furgao`, igual em cada medida: furgão (van) estilizado, azul, de volume único alto e longo, capô curto inclinado, para-brisa grande, cabine que afunila
 * para o teto, painel de teto, janela lateral só na frente, vidro traseiro, faixa cinza de chassi mais larga que a carroceria,
 * para-lamas em cápsula em volta das rodas, faróis amarelos, grade cinza, para-choques e placas claras.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "van" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/van.glb, que o git ignora. O que entra aqui
 * são as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765) e as vistas (referencias/fonte-vistas.png).
 * O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do furgão em +z, x para a direita de quem olha de frente, centrado
 * em x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve, por parte,
 * a forma, a `parte` e o `material`. A conversão para metro está em `m`, num lugar só. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita (estrutura do carro-taxi, que vem do carro-sedan-compacto): a carroceria é uma extrusão em x do perfil
 * lateral, com os arcos das rodas recortados no próprio perfil. A cabine, o painel de teto, o chassi e os vidros são a INTERSEÇÃO
 * de duas extrusões, o perfil lateral (z, y) em x e a seção frontal (x, y) em z, e por isso afunilam e têm a saia inclinada sem
 * nenhum vértice calculado em 3D; os vidros usam o mesmo plano da face que cobrem, e o contato fecha exato. Uma extrusão com
 * `eixo: 'x'` leva o perfil [u, v] a y = -u e z = v; com `eixo: 'z'`, a x = u e y = -v. As rodas são revoluções em torno de x
 * (`lathe`), o pneu com o chanfro e o aro faceado com ele. A caixa de roda é o próprio arco do perfil, fechado e extrudado entre
 * as faces de dentro dos dois pneus.
 */

export const TABELA = {
  lados: 24, // contagem de lados dos pneus e dos arcos (a mesma, para os arcos coincidirem com a caixa de roda)
  prisma_meia_largura: 1500, // os prismas de corte passam do furgão em x e em z; só a interseção com o outro prisma vira parte
  prisma_meia_profundidade: 2530,

  // carroceria azul: perfil lateral de y 883 (sobre o chassi) à cintura; nariz vertical, capô inclinado, traseira vertical
  carroceria_meia_largura: 971,
  topo_chassi_y: 883,
  cintura_y: 1412,
  nariz_z: 2250,
  nariz_topo_y: 1145,
  capo_z: 2162,
  capo_y: 1258,
  capo_fim_z: 1544,
  traseira_z: -2339,

  // chassi cinza: a soleira (mais larga, de y 353 a 530) e a saia inclinada de 853 a 971 de meia largura, de y 530 a 883
  chassi_meia_largura: 1147,
  chassi_base_y: 353,
  soleira_topo_y: 530,
  saia_x_base: 853,
  chassi_frente_z: 2162,
  chassi_tras_z: -2162,
  chanfro_frente_z: 2191, // pé do chanfro de baixo do nariz, sobre o para-choque
  chanfro_tras_z: -2222, // pé do chanfro de baixo da traseira, sobre o para-choque

  // cabine: afunila de 971 de meia largura na cintura a 794 no teto; o para-brisa e o vidro de trás são as faces inclinadas
  cabine_meia_largura_topo: 794,
  teto_y: 2295,
  pilar_topo_z: 1191,
  teto_tras_z: -1986,

  // painel de teto: faixa mais escura sobre o teto, com as pontas inclinadas
  painel_meia_largura: 529,
  painel_topo_y: 2383,
  painel_frente_base_z: 926,
  painel_frente_topo_z: 859,
  painel_tras_topo_z: -1655,
  painel_tras_base_z: -1721,

  // vidros azul claros: placas sobre as faces da cabine
  vidro_espessura: 10,
  parabrisa_y1: 2131,
  parabrisa_meia_largura_y0: 791,
  parabrisa_meia_largura_y1: 648,
  vidro_traseiro_y0: 1576,
  vidro_traseiro_y1: 2131,
  vidro_traseiro_meia_largura_y0: 758,
  vidro_traseiro_meia_largura_y1: 648,
  vidro_lateral_espessura: 12,
  vidro_lateral_frente_z: 1354,
  vidro_lateral_topo_frente_z: 1070,
  vidro_lateral_tras_z: 391,
  vidro_lateral_topo_y: 2121,

  // rodas: pneu de 1060 mm de diâmetro e 618 de largura, com chanfro; o aro cinza é faceado com a face de fora do pneu
  roda_raio: 530,
  roda_x_dentro: 441,
  roda_x_fora: 1059,
  roda_z_frente: 1386,
  roda_z_tras: -1297,
  pneu_face_raio: 450,
  pneu_chanfro: 177,
  aro_raio: 321,
  aro_espessura: 120, // o aro enche um bolsão de 120 mm na face de fora do pneu
  cubo_raio: 213,
  cubo_fundo_raio: 160,
  cubo_fundo_prof: 88,

  // arcos: o do perfil (a caixa de roda enche o mesmo arco) e a cápsula do para-lama em volta dele
  arco_raio: 575,
  para_lama_raio: 688,

  // para-choques: de y 353 a 706, com a planta de quinas cortadas em duas retas; placas octogonais saindo deles
  para_choque_y1: 706,
  planta_x0: 1147,
  planta_x1: 1096,
  planta_z1: 2286,
  planta_x2: 971,
  planta_z2: 2338,
  placa_x0: 309,
  placa_x1: 221,
  placa_y0: 265,
  placa_y1: 353,
  placa_y2: 485,
  placa_y3: 574,
  placa_z_frente: 2427,
  placa_z_tras: -2427,

  // frente: grade cinza entre os faróis, faróis em casca sobre o nariz e o capô
  grade_meia_largura: 376,
  grade_y1: 1059,
  grade_prof: 12,
  farol_x0: 607,
  farol_y0: 1059,
  farol_prof: 12,

  // traseira, retrovisores
  lanterna_x0: 485,
  lanterna_y0: 1059,
  lanterna_y1: 1236,
  lanterna_espessura: 12,
  retrovisor_x1: 1324,
  retrovisor_y0: 1236,
  retrovisor_y1: 1590,
  retrovisor_z0: 966,
  retrovisor_z1: 1143,
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
    return [Math.round((zc + r * Math.cos(a)) * 1e6) / 1e6, Math.round((yc + r * Math.sin(a)) * 1e6) / 1e6]; // arredonda o ruído de ponto flutuante: sen(180°) deixa de ser 1e-16
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

/* x (ou z) ao longo de y pela reta que passa por (y0, x0) e (y1, x1), válida também fora do intervalo. */
const reta = (y0, x0, y1, x1) => (y) => x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
/* O paralelogramo da aresta P-Q da cabine deslocado `e` para fora, na direção da normal `n`; a face de dentro usa os mesmos vértices da cabine. */
function placaSobre(P, Q, e, n) {
  const k = e / Math.hypot(...n);
  return [P, Q, [Q[0] + n[0] * k, Q[1] + n[1] * k], [P[0] + n[0] * k, P[1] + n[1] * k]];
}
const espelho = (pts) => [...pts, ...[...pts].reverse().map(([x, z]) => [-x, z])];

/* ---------- derivar ---------- */

/* Cada forma tem `nome`, `forma` (vistas, lateral, planta, secaoZ, cubo ou lathe), `material` e as medidas da forma, em milímetro. */
export function derivar(T) {
  const M = T.carroceria_meia_largura;
  const C = T.chassi_meia_largura;
  const yR = T.roda_raio;
  const zF = T.roda_z_frente;
  const zT = T.roda_z_tras;
  const y0 = T.chassi_base_y;
  const y1 = T.topo_chassi_y;
  const rodas = [];
  for (const s of [1, -1]) {
    for (const [ponta, zc] of [['Frente', zF], ['Tras', zT]]) rodas.push({ s, lado: s > 0 ? 'Dir' : 'Esq', ponta, zc });
  }
  const arco = (zc, y) => capaAcima(zc, yR, T.arco_raio, T.lados, y);
  const xCabine = reta(T.cintura_y, M, T.teto_y, T.cabine_meia_largura_topo);
  const trapezio = (xDe, ya, yb) => [[-xDe(ya), ya], [xDe(ya), ya], [xDe(yb), yb], [-xDe(yb), yb]];
  const zPilarFrente = reta(T.cintura_y, T.capo_fim_z, T.teto_y, T.pilar_topo_z);
  const zPilarTras = reta(T.cintura_y, T.traseira_z, T.teto_y, T.teto_tras_z);
  const formas = [];

  /* carroceria: extrusão em x do perfil lateral, com os arcos das rodas no perfil (de trás para a frente na borda de baixo) */
  formas.push({
    nome: 'carroceria', forma: 'lateral', material: 'azul', x0: -M, largura: 2 * M,
    lado: [
      [T.nariz_z, y1], [T.nariz_z, T.nariz_topo_y], [T.capo_z, T.capo_y], [T.capo_fim_z, T.cintura_y], [T.traseira_z, T.cintura_y],
      [T.traseira_z, y1], ...arco(zT, y1), ...arco(zF, y1),
    ],
  });

  /* chassi em três trechos (frente, centro e trás), separados pelos arcos: o perfil lateral de y 353 a 883, e a seção frontal em
   * degrau (soleira de 1147 de meia largura até y 530, saia inclinada de 853 a 971 até y 883) */
  const xS = T.saia_x_base;
  const degrau = [[-C, y0 - 50], [C, y0 - 50], [C, T.soleira_topo_y], [xS, T.soleira_topo_y], [M, y1], [M, y1 + 70],
    [-M, y1 + 70], [-M, y1], [-xS, T.soleira_topo_y], [-C, T.soleira_topo_y]];
  const arcoDir = (zc) => trechoDoArco(zc, yR, T.arco_raio, T.lados, 1, y0, y1);
  const arcoEsq = (zc) => trechoDoArco(zc, yR, T.arco_raio, T.lados, -1, y0, y1);
  formas.push({
    nome: 'chassiFrente', forma: 'vistas', material: 'cinza', frontal: degrau,
    lado: [...arcoDir(zF), [T.chassi_frente_z, y0], [T.chassi_frente_z, T.para_choque_y1], [T.chanfro_frente_z, T.para_choque_y1], [T.nariz_z, y1]],
  });
  formas.push({ nome: 'chassiCentro', forma: 'vistas', material: 'cinza', frontal: degrau, lado: [...arcoDir(zT), ...arcoEsq(zF)] });
  formas.push({
    nome: 'chassiTras', forma: 'vistas', material: 'cinza', frontal: degrau,
    lado: [[T.chassi_tras_z, y0], ...arcoEsq(zT), [T.traseira_z, y1], [T.chanfro_tras_z, T.para_choque_y1], [T.chassi_tras_z, T.para_choque_y1]],
  });

  /* cabine: o perfil lateral de pilar a pilar sobre a cintura, e a seção frontal que afunila da largura da carroceria ao teto */
  formas.push({
    nome: 'cabine', forma: 'vistas', material: 'azul',
    lado: [[T.capo_fim_z, T.cintura_y], [T.pilar_topo_z, T.teto_y], [T.teto_tras_z, T.teto_y], [T.traseira_z, T.cintura_y]],
    frontal: trapezio(xCabine, T.cintura_y - 110, T.teto_y + 105),
  });

  /* painel de teto: faixa de 1058 mm de largura, de y 2295 a 2383, com as duas pontas inclinadas */
  const P = T.painel_meia_largura;
  formas.push({
    nome: 'painelTeto', forma: 'vistas', material: 'azulPainel',
    lado: [[T.painel_frente_base_z, T.teto_y], [T.painel_frente_topo_z, T.painel_topo_y], [T.painel_tras_topo_z, T.painel_topo_y], [T.painel_tras_base_z, T.teto_y]],
    frontal: [[-P, T.teto_y - 100], [P, T.teto_y - 100], [P, T.painel_topo_y + 50], [-P, T.painel_topo_y + 50]],
  });

  /* para-brisa e vidro traseiro: placas sobre as arestas inclinadas da cabine, com o trapézio frontal mais estreito que a cabine */
  const yB0 = T.cintura_y;
  const xParabrisa = reta(yB0, T.parabrisa_meia_largura_y0, T.parabrisa_y1, T.parabrisa_meia_largura_y1);
  formas.push({
    nome: 'parabrisa', forma: 'vistas', material: 'vidro',
    lado: placaSobre([zPilarFrente(yB0), yB0], [zPilarFrente(T.parabrisa_y1), T.parabrisa_y1], T.vidro_espessura, [T.teto_y - T.cintura_y, T.capo_fim_z - T.pilar_topo_z]),
    frontal: trapezio(xParabrisa, yB0, T.parabrisa_y1),
  });
  const xTraseiro = reta(T.vidro_traseiro_y0, T.vidro_traseiro_meia_largura_y0, T.vidro_traseiro_y1, T.vidro_traseiro_meia_largura_y1);
  formas.push({
    nome: 'vidroTraseiro', forma: 'vistas', material: 'vidro',
    lado: placaSobre([zPilarTras(T.vidro_traseiro_y0), T.vidro_traseiro_y0], [zPilarTras(T.vidro_traseiro_y1), T.vidro_traseiro_y1],
      T.vidro_espessura, [-(T.teto_y - T.cintura_y), T.teto_tras_z - T.traseira_z]),
    frontal: trapezio(xTraseiro, T.vidro_traseiro_y0, T.vidro_traseiro_y1),
  });

  /* vidros laterais: a janela da frente em cada lado, uma casca de 12 mm sobre a face inclinada da cabine, com o recorte do retrovisor */
  const janela = [
    [T.vidro_lateral_tras_z, T.cintura_y], [T.retrovisor_z0, T.cintura_y], [T.retrovisor_z0, T.retrovisor_y1], [T.retrovisor_z1, T.retrovisor_y1],
    [T.retrovisor_z1, T.cintura_y], [T.vidro_lateral_frente_z, T.cintura_y], [T.vidro_lateral_topo_frente_z, T.vidro_lateral_topo_y],
    [T.vidro_lateral_tras_z, T.vidro_lateral_topo_y],
  ];
  const yA = T.cintura_y - 110;
  const yB = T.teto_y + 105;
  const e = T.vidro_lateral_espessura;
  for (const s of [1, -1]) {
    formas.push({
      nome: `vidroLateral${s > 0 ? 'Dir' : 'Esq'}`, forma: 'vistas', material: 'vidro', lado: janela,
      frontal: [[s * xCabine(yA), yA], [s * (xCabine(yA) + e), yA], [s * (xCabine(yB) + e), yB], [s * xCabine(yB), yB]],
    });
  }

  /* para-choques: de y 353 a 706, com as quinas da planta cortadas em duas retas; placas octogonais saindo da face de fora */
  const bordaF = [[T.planta_x0, T.chassi_frente_z], [T.planta_x1, T.planta_z1], [T.planta_x2, T.planta_z2]];
  const bordaT = [[T.planta_x0, T.chassi_tras_z], [T.planta_x1, -T.planta_z1], [T.planta_x2, -T.planta_z2]];
  const altPC = T.para_choque_y1 - y0;
  formas.push({ nome: 'paraChoqueFrente', forma: 'planta', material: 'cinza', y0, altura: altPC, planta: espelho(bordaF) });
  formas.push({ nome: 'paraChoqueTras', forma: 'planta', material: 'cinza', y0, altura: altPC, planta: espelho(bordaT) });
  const octogono = [[-T.placa_x1, T.placa_y0], [T.placa_x1, T.placa_y0], [T.placa_x0, T.placa_y1], [T.placa_x0, T.placa_y2],
    [T.placa_x1, T.placa_y3], [-T.placa_x1, T.placa_y3], [-T.placa_x0, T.placa_y2], [-T.placa_x0, T.placa_y1]];
  formas.push({ nome: 'placaFrente', forma: 'secaoZ', material: 'cinzaClaro', z0: T.planta_z2, z1: T.placa_z_frente, secao: octogono });
  formas.push({ nome: 'placaTras', forma: 'secaoZ', material: 'cinzaClaro', z0: T.placa_z_tras, z1: -T.planta_z2, secao: octogono });

  /* grade cinza entre os faróis, na face da frente do nariz, sobre o para-choque */
  formas.push({
    nome: 'grade', forma: 'cubo', material: 'grade', larg: 2 * T.grade_meia_largura, alt: T.grade_y1 - T.para_choque_y1, prof: T.grade_prof,
    em: [0, T.para_choque_y1, T.nariz_z + T.grade_prof / 2],
  });

  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    /* farol: casca amarela sobre a quina do nariz, com a mesma inclinação do capô; a face de dentro usa os vértices do perfil da carroceria */
    const f = T.farol_prof;
    formas.push({
      nome: `farol${lado}`, forma: 'lateral', material: 'amarelo', x0: s > 0 ? T.farol_x0 : -M, largura: M - T.farol_x0,
      lado: [[T.nariz_z, T.farol_y0], [T.nariz_z + f, T.farol_y0], [T.nariz_z + f, T.nariz_topo_y], [T.capo_z + f, T.capo_y], [T.capo_z, T.capo_y], [T.nariz_z, T.nariz_topo_y]],
    });
    formas.push({
      nome: `lanterna${lado}`, forma: 'cubo', material: 'lanterna', larg: M - T.lanterna_x0, alt: T.lanterna_y1 - T.lanterna_y0,
      prof: T.lanterna_espessura, em: [(s * (T.lanterna_x0 + M)) / 2, T.lanterna_y0, T.traseira_z - T.lanterna_espessura / 2],
    });
    const larg = T.retrovisor_x1 - M;
    formas.push({
      nome: `retrovisor${lado}`, forma: 'cubo', material: 'azul', larg, alt: T.retrovisor_y1 - T.retrovisor_y0, prof: T.retrovisor_z1 - T.retrovisor_z0,
      em: [s * (M + larg / 2), T.retrovisor_y0, (T.retrovisor_z0 + T.retrovisor_z1) / 2],
    });
  }

  /* para-lamas: anel de 575 a 688 de raio sobre a soleira, de x 971 a 1147 */
  for (const r of rodas) {
    const ext = capaAcima(r.zc, yR, T.para_lama_raio, T.lados, T.soleira_topo_y);
    const int = capaAcima(r.zc, yR, T.arco_raio, T.lados, T.soleira_topo_y);
    formas.push({
      nome: `paraLama${r.ponta}${r.lado}`, forma: 'lateral', material: 'cinza', x0: r.s > 0 ? M : -C, largura: C - M, lado: [...ext, ...[...int].reverse()],
    });
  }

  /* caixas de roda: o arco do perfil, fechado em y 353, entre as faces de dentro dos dois pneus */
  for (const [ponta, zc] of [['Frente', zF], ['Tras', zT]]) {
    formas.push({
      nome: `caixaRoda${ponta}`, forma: 'lateral', material: 'caixaRoda', x0: -T.roda_x_dentro, largura: 2 * T.roda_x_dentro,
      lado: capaAcima(zc, yR, T.arco_raio, T.lados, y0),
    });
  }

  /* rodas: pneu com chanfro e bolsão na face de fora, e o aro que enche o bolsão faceado com o pneu; revoluções em torno de x (perfil
   * [raio, posição ao longo de x]); o lado esquerdo é o espelho do direito */
  const R = T.roda_raio;
  const L = T.roda_x_fora - T.roda_x_dentro;
  const B = T.aro_espessura;
  const pneuDir = [[0, 0], [T.pneu_face_raio, 0], [R, T.pneu_chanfro], [R, L - T.pneu_chanfro], [T.pneu_face_raio, L], [T.aro_raio, L],
    [T.aro_raio, L - B], [0, L - B]];
  const aroDir = [[0, 0], [T.aro_raio, 0], [T.aro_raio, B], [T.cubo_raio, B], [T.cubo_fundo_raio, B - T.cubo_fundo_prof], [0, B - T.cubo_fundo_prof]];
  const espelharEixo = (perfil, comprimento) => perfil.map(([r, a]) => [r, comprimento - a]);
  for (const r of rodas) {
    const dir = r.s > 0;
    formas.push({
      nome: `roda${r.ponta}${r.lado}`, forma: 'lathe', material: 'pneu', liso: true, lados: T.lados,
      perfil: dir ? pneuDir : espelharEixo(pneuDir, L), em: [dir ? T.roda_x_dentro : -T.roda_x_fora, yR, r.zc],
    });
    formas.push({
      nome: `aro${r.ponta}${r.lado}`, forma: 'lathe', material: 'aro', liso: true, lados: T.lados,
      perfil: dir ? aroDir : espelharEixo(aroDir, B), em: [dir ? T.roda_x_fora - B : -T.roda_x_fora, yR, r.zc],
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
    const L = T.prisma_meia_largura;
    const Cz = T.prisma_meia_profundidade;
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilM(perfilLateral(f.lado)) }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * Cz), em: [0, 0, m(-Cz)], perfil: perfilM(secaoFrontal(f.frontal)) }]);
    passos.push(['intersectar', {
      origemId: base + 10,
      solidos: [{ origem: { op: 'extrusao', id: base + 1 } }, { origem: { op: 'extrusao', id: base + 2 } }],
    }]);
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
    par: ['carroceria', c], motivo: 'a face de baixo da carroceria, em y 883, assenta na face de cima do chassi, de x -971 a 971',
  })),
  { par: ['carroceria', 'cabine'], motivo: 'a face de baixo da cabine, em y 1412, assenta no tampo da carroceria, de z -2339 a 1544' },
  { par: ['cabine', 'painelTeto'], motivo: 'a face de baixo do painel, em y 2295, assenta no teto plano da cabine' },
  { par: ['cabine', 'parabrisa'], motivo: 'a face de trás do para-brisa é o mesmo plano da face inclinada da frente da cabine' },
  { par: ['carroceria', 'parabrisa'], motivo: 'a aresta de baixo do para-brisa assenta sobre o capô, na linha da cintura em y 1412' },
  { par: ['cabine', 'vidroTraseiro'], motivo: 'a face da frente do vidro traseiro é o mesmo plano da face inclinada de trás da cabine' },
  { par: ['cabine', 'vidroLateralDir'], motivo: 'a face de dentro do vidro lateral direito é o mesmo plano da lateral inclinada da cabine' },
  { par: ['cabine', 'vidroLateralEsq'], motivo: 'a face de dentro do vidro lateral esquerdo é o mesmo plano da lateral inclinada da cabine' },
  { par: ['chassiFrente', 'paraChoqueFrente'], motivo: 'a face de trás do para-choque encosta na face da frente do chassi, em z 2162' },
  { par: ['paraChoqueFrente', 'placaFrente'], motivo: 'a face de trás da placa encosta na face da frente do para-choque, em z 2338' },
  { par: ['chassiTras', 'paraChoqueTras'], motivo: 'a face da frente do para-choque de trás encosta na face de trás do chassi, em z -2162' },
  { par: ['paraChoqueTras', 'placaTras'], motivo: 'a face da frente da placa de trás encosta na face de trás do para-choque, em z -2338' },
  { par: ['paraChoqueFrente', 'grade'], motivo: 'a face de baixo da grade assenta na face de cima do para-choque da frente, em y 706' },
  { par: ['chassiFrente', 'grade'], motivo: 'o canto de cima da frente do chassi, em y 883 e z 2250, toca a face de trás da grade, só pela aresta' },
  { par: ['carroceria', 'grade'], motivo: 'a face de trás da grade encosta na face da frente do nariz, em z 2250' },
  ...LADOS.flatMap((l) => [
    { par: ['carroceria', `farol${l}`], motivo: 'a face de dentro do farol encosta na face da frente do nariz e na face inclinada do capô' },
    { par: ['cabine', `retrovisor${l}`], motivo: 'o canto de baixo da cabine, em x 971 e y 1412, toca a face de dentro do retrovisor, só pela aresta' },
    { par: ['carroceria', `vidroLateral${l}`], motivo: 'a face de baixo da casca do vidro, em y 1412, toca o canto de cima da lateral da carroceria, só pela aresta' },
    { par: ['carroceria', `lanterna${l}`], motivo: 'a face da frente da lanterna encosta na face de trás da carroceria, em z -2339' },
    { par: ['carroceria', `retrovisor${l}`], motivo: 'a face de dentro do retrovisor encosta na lateral da carroceria, em x 971 ou -971' },
    { par: [`retrovisor${l}`, `vidroLateral${l}`], motivo: 'o retrovisor encaixa no recorte da janela e encosta nas faces do recorte, em z 966 e 1143' },
  ]),
  ...PONTAS.flatMap((p) => [
    { par: [`caixaRoda${p}`, 'carroceria'], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco da carroceria' },
    ...chassiDe[p].map((c) => ({ par: [`caixaRoda${p}`, c], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco do chassi' })),
    ...LADOS.flatMap((l) => [
      { par: [`caixaRoda${p}`, `roda${p}${l}`], motivo: 'a face de dentro do pneu, em x 441 ou -441, encosta na face da caixa de roda' },
      { par: [`aro${p}${l}`, `roda${p}${l}`], motivo: 'o aro enche o bolsão da face de fora do pneu e encosta nas faces do bolsão, no raio de 321 mm e no fundo' },
      { par: [`paraLama${p}${l}`, 'carroceria'], motivo: 'a face de dentro do para-lama encosta na lateral da carroceria, em x 971 ou -971' },
      ...chassiDe[p].map((c) => ({ par: [`paraLama${p}${l}`, c], motivo: 'a base do para-lama assenta na soleira do chassi, em y 530' })),
    ]),
  ]),
];

/* ---------- pontos declarados ---------- */

export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  return [
    { nome: 'canto de trás, embaixo, da placa de trás', parte: 'placaTras', medida: 'minimo', em: [-T.placa_x0, T.placa_y0, T.placa_z_tras], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da placa da frente', parte: 'placaFrente', medida: 'maximo', em: [T.placa_x0, T.placa_y3, T.placa_z_frente], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, do para-choque da frente', parte: 'paraChoqueFrente', medida: 'maximo', em: [T.planta_x0, T.para_choque_y1, T.planta_z2], toleranciaMm: tol },
    { nome: 'topo do painel de teto, na frente', parte: 'painelTeto', medida: 'maximo', em: [T.painel_meia_largura, T.painel_topo_y, T.painel_frente_base_z], toleranciaMm: tol },
    { nome: 'canto da frente da cabine, na cintura, e teto', parte: 'cabine', medida: 'maximo', em: [T.carroceria_meia_largura, T.teto_y, T.capo_fim_z], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.retrovisor_y1, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-T.roda_x_fora, 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente e em cima', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.roda_x_fora, 2 * T.roda_raio, T.roda_z_frente + T.roda_raio], toleranciaMm: tol },
    { nome: 'cume do para-lama da frente à direita', parte: 'paraLamaFrenteDir', medida: 'maximo', em: [T.chassi_meia_largura, T.roda_raio + T.para_lama_raio, T.roda_z_frente + T.para_lama_raio], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'furgao-realista', desc: 'cópia do furgão estilizado, ponto de partida do furgão realista: azul, de volume único alto, cabine que afunila com painel de teto, vidros azuis, chassi cinza mais largo, para-lamas, grade e rodas com aro' },
  PARAMS: TABELA,
  MATERIAIS: {
    azul: { tipo: 'liso', cor: '#5d75c9' },
    azulPainel: { tipo: 'liso', cor: '#5573c3' },
    cinza: { tipo: 'liso', cor: '#6a6b80' },
    caixaRoda: { tipo: 'liso', cor: '#39393f' },
    vidro: { tipo: 'liso', cor: '#d4ecff' },
    grade: { tipo: 'liso', cor: '#7a7c92' },
    cinzaClaro: { tipo: 'liso', cor: '#c1c1d8' },
    amarelo: { tipo: 'liso', cor: '#ffd22e' },
    lanterna: { tipo: 'liso', cor: '#d3363d' },
    pneu: { tipo: 'liso', cor: '#26262b' },
    aro: { tipo: 'metal', cor: '#868ba3', acabamento: 'escovado' },
  },
  TOPO: { origem: 'chão, no meio do furgão em x e em z; y para cima e a frente do furgão em +z' },
  PLANO: {
    objeto: 'furgão estilizado de 4854 mm de comprimento, 2648 mm de largura com os espelhos e 2383 mm de altura, azul, volume único alto com capô curto, cabine que afunila, chassi cinza mais largo, para-lamas e rodas grandes',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do furgão, de z -2427 a 2427, com as placas', milimetros: 4854 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'corpo azul de 1942 mm de largura, de y 883 a 1412, com nariz vertical em z 2250, capô inclinado até y 1258 e depois até a cintura em z 1544, traseira vertical em z -2339 e os arcos das quatro rodas no perfil', tecnica: 'extrusao com eixo x do perfil lateral, com os arcos recortados no perfil' },
      { nome: 'chassiFrente', forma: 'trecho do chassi cinza à frente do arco dianteiro, de y 353 a 883, com soleira de 2294 mm de largura até y 530, saia inclinada acima e chanfro sob o nariz', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal em degrau extrudada em z' },
      { nome: 'chassiCentro', forma: 'trecho do chassi cinza entre os arcos, de y 353 a 883, com soleira de 2294 mm e saia inclinada de 1706 a 1942 mm de largura', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal em degrau extrudada em z' },
      { nome: 'chassiTras', forma: 'trecho do chassi cinza atrás do arco traseiro, de y 353 a 883, com soleira de 2294 mm, saia inclinada e chanfro sob a traseira', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal em degrau extrudada em z' },
      { nome: 'cabine', forma: 'cabine azul de y 1412 a 2295, de z -2339 a 1544 na base, com o para-brisa e a traseira inclinados e a largura afunilando de 1942 na cintura a 1588 no teto', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal trapezoidal extrudada em z' },
      { nome: 'painelTeto', forma: 'faixa azul mais escura sobre o teto, de 1058 mm de largura, de y 2295 a 2383 e z -1721 a 926, com as pontas inclinadas', tecnica: 'intersecao do trapézio lateral extrudado em x com o retângulo frontal extrudado em z' },
      { nome: 'parabrisa', forma: 'placa de vidro azul clara de 20 mm sobre a face inclinada da frente da cabine, de y 1412 a 2131, de 1582 mm de largura embaixo e 1296 em cima', tecnica: 'intersecao da faixa lateral paralela à face extrudada em x com o trapézio frontal extrudado em z' },
      { nome: 'vidroTraseiro', forma: 'placa de vidro azul clara de 20 mm sobre a face inclinada de trás da cabine, de y 1576 a 2131', tecnica: 'intersecao da faixa lateral paralela à face extrudada em x com o trapézio frontal extrudado em z' },
      { nome: 'vidroLateralDir', forma: 'janela da frente em casca de vidro de 12 mm sobre a lateral inclinada direita da cabine, de z 391 a 1354 na base, com o recorte do retrovisor', tecnica: 'intersecao do polígono lateral extrudado em x com a casca frontal inclinada extrudada em z' },
      { nome: 'vidroLateralEsq', forma: 'janela da frente em casca de vidro de 12 mm sobre a lateral inclinada esquerda da cabine, de z 391 a 1354 na base, com o recorte do retrovisor', tecnica: 'intersecao do polígono lateral extrudado em x com a casca frontal inclinada extrudada em z' },
      { nome: 'paraChoqueFrente', forma: 'caixa cinza de 2294 por 353 por 176 mm, de y 353 a 706 e z 2162 a 2338, com as quinas da planta cortadas até 971 de meia largura', tecnica: 'extrusao com eixo y da planta de quinas cortadas, encostada na face da frente do chassi' },
      { nome: 'paraChoqueTras', forma: 'caixa cinza de 2294 por 353 por 176 mm, de y 353 a 706 e z -2338 a -2162, com as quinas da planta cortadas até 971 de meia largura', tecnica: 'extrusao com eixo y da planta de quinas cortadas, encostada na face de trás do chassi' },
      { nome: 'placaFrente', forma: 'placa clara octogonal de 618 mm de largura, de y 265 a 574, saindo do para-choque da frente até z 2427', tecnica: 'extrusao com eixo z do octógono, encostada na face da frente do para-choque' },
      { nome: 'placaTras', forma: 'placa clara octogonal de 618 mm de largura, de y 265 a 574, saindo do para-choque de trás até z -2427', tecnica: 'extrusao com eixo z do octógono, encostada na face de trás do para-choque' },
      { nome: 'grade', forma: 'placa cinza azulada de 752 por 353 mm, de y 706 a 1059, entre os faróis, saindo 12 mm do nariz', tecnica: 'cubo assentado no para-choque e encostado no nariz' },
      { nome: 'farolDir', forma: 'casca amarela de 12 mm sobre a quina do nariz à direita, de x 607 a 971 e y 1059 a 1258, com o capô inclinado', tecnica: 'extrusao com eixo x de um polígono encostado no nariz e no capô' },
      { nome: 'farolEsq', forma: 'casca amarela de 12 mm sobre a quina do nariz à esquerda, de x -971 a -607 e y 1059 a 1258, com o capô inclinado', tecnica: 'extrusao com eixo x de um polígono encostado no nariz e no capô' },
      { nome: 'lanternaDir', forma: 'placa vermelha de 486 por 177 por 12 mm na face de trás à direita, de x 485 a 971 e y 1059 a 1236', tecnica: 'cubo encostado na face de trás da carroceria' },
      { nome: 'lanternaEsq', forma: 'placa vermelha de 486 por 177 por 12 mm na face de trás à esquerda, de x -971 a -485 e y 1059 a 1236', tecnica: 'cubo encostado na face de trás da carroceria' },
      { nome: 'retrovisorDir', forma: 'caixa azul de 353 por 352 por 177 mm, da lateral da carroceria a x 1324, de y 1236 a 1588 e z 966 a 1143', tecnica: 'cubo encostado na lateral da carroceria, no recorte da janela' },
      { nome: 'retrovisorEsq', forma: 'caixa azul de 353 por 352 por 177 mm, da lateral da carroceria a x -1324, de y 1236 a 1588 e z 966 a 1143', tecnica: 'cubo encostado na lateral da carroceria, no recorte da janela' },
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `paraLama${p}${l}`,
        forma: `cápsula de 176 mm de espessura sobre a roda ${p === 'Frente' ? 'da frente' : 'de trás'} ${l === 'Dir' ? 'à direita' : 'à esquerda'}, anel de 575 a 688 mm de raio sobre a soleira, de x 971 a 1147`,
        tecnica: 'extrusao com eixo x de um anel em arco, cortado na face de cima da soleira',
      }))),
      ...PONTAS.map((p) => ({
        nome: `caixaRoda${p}`,
        forma: `caixa escura do arco ${p === 'Frente' ? 'dianteiro' : 'traseiro'}, de 882 mm de largura entre as faces de dentro dos pneus, com 575 mm de raio, fechada em y 353`,
        tecnica: 'extrusao com eixo x do próprio arco do perfil, fechado na base',
      })),
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `roda${p}${l}`,
        forma: `pneu escuro de 1060 mm de diâmetro e 618 mm de largura, com chanfro de 177 mm, centro em y 530 e z ${p === 'Frente' ? '1386' : '-1297'}, ${l === 'Dir' ? 'à direita' : 'à esquerda'}`,
        tecnica: 'lathe em torno de x, com o chanfro e o bolsão de 321 mm de raio no perfil',
      }))),
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `aro${p}${l}`,
        forma: `aro cinza de 642 mm de diâmetro e 120 mm de espessura, faceado com a face de fora do pneu ${p === 'Frente' ? 'da frente' : 'de trás'} ${l === 'Dir' ? 'à direita' : 'à esquerda'}, com o cubo rebaixado 88 mm`,
        tecnica: 'lathe em torno de x, com o rebaixo do cubo no perfil',
      }))),
    ],
    criteriosDeReprovacao: [
      'a caixa total não fica em x -1324 a 1324, y 0 a 2383 e z -2427 a 2427, ou alguma roda não toca o chão',
      'um lado do furgão difere do outro em medida ou posição de peça simétrica',
      'o furgão não é um volume único alto: o capô não é curto e inclinado, ou a traseira não é vertical',
      'a cabine tem largura constante, e não afunila de 1942 mm na cintura a 1588 mm no teto',
      'o chassi não é mais largo que a carroceria, ou as rodas ficam escondidas, sem arco recortado e sem caixa de roda',
      'o painel de teto não assenta no teto plano da cabine, ou não é mais estreito que ele',
      'um para-lama não é saliente em volta da roda, ou fica colado no pneu',
      'a lateral tem janela atrás da porta da frente, ou falta o vidro traseiro',
      'a silhueta lateral, frontal ou de cima difere da referência, vista na folha comparativa, em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
