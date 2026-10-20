/* carro-policia — viatura estilizada de brinquedo: carroceria azul acinzentada com as portas claras, anéis de para-lama e soleira
 * lavanda, cabine que afunila com vidros azul claros e painel branco no teto, barra de sirene azul, preta e vermelha sobre o teto,
 * defensa dianteira de barras e rodas grandes de pneu escuro com aro cinza. Sem texto, marca nem brasão: só cores e a barra de luzes.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "police" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/police.glb, que o git ignora. O que entra
 * aqui são as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765) e as vistas (referencias/fonte-vistas.png).
 * O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente da viatura em +z, x para a direita de quem olha de frente, centrado
 * em x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve, por parte,
 * a forma, a `parte` e o `material`. A conversão para metro está em `m`, num lugar só. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita (estrutura do carro-taxi): a carroceria, a cabine, a soleira, os blocos de ponta, os vidros e a barra de luzes
 * são a INTERSEÇÃO do perfil lateral (z, y) extrudado em x com a seção frontal (x, y) extrudada em z, e por isso afunilam, têm a saia
 * inclinada e o degrau sem nenhum vértice calculado em 3D. Uma extrusão com `eixo: 'x'` leva o perfil [u, v] a y = -u e z = v; com
 * `eixo: 'z'`, a x = u e y = -v; com `eixo: 'y'`, a x = u e z = v. A carroceria sai em três trechos de z (frente, porta e trás) do mesmo
 * perfil, com os arcos das rodas recortados no próprio perfil. Os anéis de para-lama e as caixas de roda usam o mesmo polígono de arco
 * do perfil. As rodas são revoluções em torno de x (`lathe`) com o chanfro do pneu no perfil.
 */

export const TABELA = {
  lados: 24, // contagem de lados dos pneus e dos arcos (a mesma, para os arcos coincidirem com as caixas de roda)

  // carroceria: perfil lateral de y 530 (piso entre as rodas) à cintura, com capô que desce até o nariz e tampa de trás plana
  meia_largura: 971,
  cintura_y: 1412,
  piso_y: 530,
  balanco_y: 706,
  saia_y: 882,
  saia_meia_largura: 853,
  nariz_z: 2294,
  nariz_topo_y: 1236,
  nariz_chanfro_z: 2236,
  capo_fim_z: 1236,
  traseira_z: -2648,
  traseira_topo_y: 1324,
  traseira_chanfro_z: -2559,
  porta_z0: -971,
  porta_z1: 1011,

  // cabine: a estufa sobre a cintura, com a lateral inclinada até o teto plano e a traseira em duas rampas
  teto_y: 2118,
  teto_meia_largura: 794,
  teto_frente_z: 530,
  teto_tras_z: -1137,
  quebra_tras_z: -1280,
  quebra_tras_y: 2030,
  base_tras_z: -1588,
  painel_teto_meia_largura: 618,
  painel_teto_z0: -1059,
  painel_teto_espessura: 6,

  // barra de sirene sobre o teto: três lentes, de z 0 a 353, com a lateral inclinada de 618 na base a 528 no topo
  sirene_z0: 1,
  sirene_z1: 353,
  sirene_topo_y: 2294,
  sirene_base_meia_largura: 618,
  sirene_topo_meia_largura: 528,
  sirene_centro_meia_largura: 254,

  // vidros azul claros: placas sobre as faces da cabine
  vidro_espessura: 20,
  parabrisa_y1: 1988,
  parabrisa_meia_largura_y0: 791,
  parabrisa_meia_largura_y1: 656,
  vidro_traseiro_y0: 1570,
  vidro_traseiro_y1: 1960,
  vidro_traseiro_meia_largura_y0: 750,
  vidro_traseiro_meia_largura_y1: 680,
  vidro_lateral_espessura: 12,
  vidro_lateral_frente_z: 990,
  vidro_lateral_topo_frente_z: 452,
  vidro_lateral_tras_z: -355,
  vidro_lateral_topo_y: 1950,

  // soleira e blocos de ponta lavanda, de 1147 de meia largura
  chassi_meia_largura: 1147,
  chassi_base_y: 353,
  bloco_frente_z1: 2383,
  bloco_tras_z1: -2648,
  planta_quina1_x: 1096,
  planta_frente_quina0_z: 2206,
  planta_frente_quina1_z: 2331,
  planta_tras_quina0_z: -2471,
  planta_tras_quina1_z: -2596,

  // rodas: pneu de 1060 mm de diâmetro e 529 de largura, com chanfro; aro cinza com cubo saindo da face de fora
  roda_raio: 530,
  roda_x_dentro: 530,
  roda_x_fora: 1059,
  roda_z_frente: 1430,
  roda_z_tras: -1430,
  roda_chanfro: 50,
  aro_raio: 300,
  aro_espessura: 20,
  cubo_raio: 180,
  cubo_saliencia: 15,

  // arcos: o do perfil (a caixa de roda enche o mesmo arco) e o anel do para-lama em volta dele
  arco_raio: 540,
  para_lama_raio: 688,

  // faróis amarelos e lanternas vermelhas, rentes às faces de frente e de trás
  farol_x0: 618,
  farol_y0: 882,
  farol_y1: 1059,
  farol_espessura: 12,
  lanterna_y0: 1147,
  lanterna_y1: 1324,
  lanterna_espessura: 12,

  // retrovisores: do lado da carroceria a x 1324, de y 1236 a 1412, com o canto de baixo chanfrado
  retrovisor_x1: 1324,
  retrovisor_y0: 1236,
  retrovisor_chanfro: 88,
  retrovisor_z0: 1011,
  retrovisor_z1: 1236,

  // defensa dianteira: barra baixa de planta curva, dois postes, dois braços, travessa e as duas luzes de ponta
  barra_y0: 484,
  barra_y1: 706,
  barra_z0: 2471,
  barra_z1: 2648,
  barra_meia_largura: 882,
  poste_x0: 353,
  poste_x1: 530,
  poste_topo_y: 1236,
  poste_chanfro_z: 2603,
  poste_chanfro_y: 1059,
  braco_y0: 882,
  braco_y1: 1059,
  travessa_z0: 2515,
  travessa_z1: 2603,
  luz_x1: 706,
  luz_chanfro_z: 2559,

  // placas claras de 618 por 308 mm, com as quinas chanfradas de 88 mm
  placa_meia_largura: 309,
  placa_chanfro: 88,
  placa_frente_y0: 330,
  placa_frente_y1: 638,
  placa_frente_z1: 2736,
  placa_tras_y0: 441,
  placa_tras_y1: 750,
  placa_tras_z1: -2736,
};

const m = (mm) => mm / 1000;
/* Arredonda a 1e-6 mm: as coordenadas que vêm de trigonometria ou de interpolação ficam exatas onde duas formas se encontram. */
const arred = (v) => Math.round(v * 1e6) / 1e6;

/* ---------- geometria 2D em milímetro ---------- */

const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* o núcleo gira a extrusão em x de y para x: [u, v] vai a y = -u, z = v. Entra [z, y]. */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z]));
/* a extrusão em z leva [u, v] a x = u, y = -v. Entra [x, y]. */
const secaoFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y]));

/* Tira os vértices repetidos e os colineares, que viram triângulo sem área. */
function semColineares(pts) {
  let p = pts.filter((q, i) => { const r = pts[(i + 1) % pts.length]; return Math.hypot(q[0] - r[0], q[1] - r[1]) > 1e-6; });
  let mudou = true;
  while (mudou && p.length > 3) {
    mudou = false;
    for (let i = 0; i < p.length; i += 1) {
      const a = p[(i + p.length - 1) % p.length];
      const b = p[i];
      const c = p[(i + 1) % p.length];
      const cruz = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (Math.abs(cruz) < 1e-6) { p = p.filter((_, j) => j !== i); mudou = true; break; }
    }
  }
  return p;
}

/* Recorta o polígono [z, y] à faixa z0 <= z <= z1 (Sutherland-Hodgman); o resultado é conexo porque os arcos não chegam ao topo. */
function recortarZ(poly, z0, z1) {
  const corta = (entrada, dentro, cruza) => {
    const saida = [];
    entrada.forEach((a, i) => {
      const b = entrada[(i + 1) % entrada.length];
      if (dentro(a)) { saida.push(a); if (!dentro(b)) saida.push(cruza(a, b)); } else if (dentro(b)) saida.push(cruza(a, b));
    });
    return saida;
  };
  const em = (zc) => (a, b) => [zc, arred(a[1] + ((zc - a[0]) * (b[1] - a[1])) / (b[0] - a[0]))];
  const meio = corta(poly, (p) => p[0] >= z0, em(z0));
  return semColineares(corta(meio, (p) => p[0] <= z1, em(z1)));
}

/* O polígono de `n` lados de uma roda, em [z, y], no sentido horário a partir da esquerda; os vértices horizontais e verticais ficam exatos. */
function circulo(zc, yc, r, n) {
  return Array.from({ length: n }, (_, k) => {
    const a = Math.PI - (2 * Math.PI * k) / n;
    return [arred(zc + r * Math.cos(a)), arred(yc + r * Math.sin(a))];
  });
}

/* Leva o anel ao nível y, só do lado `lado` (+1: z maior que zc; -1: menor): o vértice a menos de 3 mm do nível vai para o nível, e onde uma
 * aresta cruza o nível entra um ponto com o y exato dele. Isso evita aresta de poucos milímetros, que vira triângulo fino. */
function comNivel(anel, y, zc, lado) {
  const doLado = (p) => (lado > 0 ? p[0] > zc : p[0] < zc);
  const preso = anel.map((p) => (doLado(p) && Math.abs(p[1] - y) <= 3 ? [p[0], y] : p));
  const saida = [];
  preso.forEach((a, i) => {
    const b = preso[(i + 1) % preso.length];
    saida.push(a);
    if ((a[1] - y) * (b[1] - y) < 0) {
      const t = (y - a[1]) / (b[1] - a[1]);
      const z = arred(a[0] + t * (b[0] - a[0]));
      if (doLado([z])) saida.push([z, y]);
    }
  });
  return saida;
}

/* O arco por cima da roda, da esquerda (z menor) à direita, cortado nos níveis yEsq e yDir: os pontos vão em ordem crescente de z. */
function arcoSup(zc, yc, r, n, yEsq, yDir) {
  const anel = comNivel(comNivel(circulo(zc, yc, r, n), yEsq, zc, -1), yDir, zc, 1);
  const de = anel.findIndex((p) => p[1] === yEsq && p[0] < zc);
  const ate = anel.findIndex((p) => p[1] === yDir && p[0] > zc);
  const saida = [];
  for (let i = de; ; i = (i + 1) % anel.length) { saida.push(anel[i]); if (i === ate) break; }
  return saida;
}

/* O trecho do arco de um lado da roda, do nível `nivel` até o vértice horizontal (y = yc), em ordem decrescente de y. */
function trechoDoLado(zc, yc, r, n, nivel, lado) {
  return comNivel(circulo(zc, yc, r, n), nivel, zc, lado).filter((p) => (lado > 0 ? p[0] > zc : p[0] < zc) && p[1] <= nivel && p[1] >= yc).sort((a, b) => b[1] - a[1]);
}

/* x ao longo de y pela reta que passa por (y0, x0) e (y1, x1), válida também fora do intervalo. */
const reta = (y0, x0, y1, x1) => (y) => x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
/* O paralelogramo da aresta P-Q deslocado `e` para fora, na direção da normal `n`; a face de dentro usa os mesmos vértices da aresta. */
function placaSobre(P, Q, e, n) {
  const k = e / Math.hypot(...n);
  return [P, Q, [Q[0] + n[0] * k, Q[1] + n[1] * k], [P[0] + n[0] * k, P[1] + n[1] * k]];
}
const trapezio = (xDe, y0, y1) => [[-xDe(y0), y0], [xDe(y0), y0], [xDe(y1), y1], [-xDe(y1), y1]];
/* Retângulo de quinas chanfradas, em [x, y], de meia largura w. */
const chanfrado = (w, y0, y1, c) => [[-(w - c), y0], [w - c, y0], [w, y0 + c], [w, y1 - c], [w - c, y1], [-(w - c), y1], [-w, y1 - c], [-w, y0 + c]];
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, z]) => [-x, z])];

/* ---------- derivar ---------- */

/* Cada forma tem `nome`, `forma` (vistas, lateral, frontal, planta, cubo ou lathe), `material` e as medidas da forma, em milímetro. */
export function derivar(T) {
  const M = T.meia_largura;
  const C = T.chassi_meia_largura;
  const yR = T.roda_raio;
  const zF = T.roda_z_frente;
  const zT = T.roda_z_tras;
  const rodas = [];
  for (const s of [1, -1]) {
    for (const [ponta, zc] of [['Frente', zF], ['Tras', zT]]) rodas.push({ s, lado: s > 0 ? 'Dir' : 'Esq', ponta, zc });
  }
  const formas = [];

  /* carroceria: o perfil lateral inteiro, de y 530 a 706 embaixo (arcos recortados no perfil) até o capô, a cintura e a traseira */
  const arcoTras = arcoSup(zT, yR, T.arco_raio, T.lados, T.balanco_y, T.piso_y);
  const arcoFrente = arcoSup(zF, yR, T.arco_raio, T.lados, T.piso_y, T.balanco_y);
  const perfilCorpo = [
    [T.nariz_z, T.nariz_topo_y], [T.capo_fim_z, T.cintura_y], [T.traseira_chanfro_z, T.cintura_y], [T.traseira_z, T.traseira_topo_y],
    [T.traseira_z, T.balanco_y], ...arcoTras, ...arcoFrente, [T.nariz_chanfro_z, T.balanco_y], [T.nariz_z, T.saia_y],
  ];
  const xSaia = reta(T.piso_y, T.saia_meia_largura, T.saia_y, M);
  const yBaixo = T.piso_y - 50;
  const frontalCorpo = [[-xSaia(yBaixo), yBaixo], [xSaia(yBaixo), yBaixo], [M, T.saia_y], [M, T.cintura_y + 100], [-M, T.cintura_y + 100], [-M, T.saia_y]];
  formas.push({ nome: 'carroceriaFrente', forma: 'vistas', material: 'azul', lado: recortarZ(perfilCorpo, T.porta_z1, T.nariz_z), frontal: frontalCorpo });
  formas.push({ nome: 'porta', forma: 'vistas', material: 'prata', lado: recortarZ(perfilCorpo, T.porta_z0, T.porta_z1), frontal: frontalCorpo });
  formas.push({ nome: 'carroceriaTras', forma: 'vistas', material: 'azul', lado: recortarZ(perfilCorpo, T.traseira_z, T.porta_z0), frontal: frontalCorpo });

  /* cabine: o perfil lateral de pilar a pilar sobre a cintura, e a seção frontal que afunila de 971 na cintura a 794 no teto */
  const xCabine = reta(T.cintura_y, M, T.teto_y, T.teto_meia_largura);
  const yA = T.cintura_y - 100;
  const yB = T.teto_y + 100;
  formas.push({
    nome: 'cabine', forma: 'vistas', material: 'azul', frontal: trapezio(xCabine, yA, yB),
    lado: [[T.capo_fim_z, T.cintura_y], [T.teto_frente_z, T.teto_y], [T.teto_tras_z, T.teto_y], [T.quebra_tras_z, T.quebra_tras_y], [T.base_tras_z, T.cintura_y]],
  });
  formas.push({
    nome: 'painelTeto', forma: 'cubo', material: 'painel', larg: 2 * T.painel_teto_meia_largura, alt: T.painel_teto_espessura,
    prof: T.sirene_z0 - T.painel_teto_z0, em: [0, T.teto_y, (T.painel_teto_z0 + T.sirene_z0) / 2],
  });

  /* para-brisa e vidro traseiro: placas sobre as faces inclinadas da cabine, com o trapézio frontal mais estreito que a cabine */
  const zParabrisa = reta(T.cintura_y, T.capo_fim_z, T.teto_y, T.teto_frente_z);
  const xParabrisa = reta(T.cintura_y, T.parabrisa_meia_largura_y0, T.parabrisa_y1, T.parabrisa_meia_largura_y1);
  formas.push({
    nome: 'parabrisa', forma: 'vistas', material: 'vidro',
    lado: placaSobre([zParabrisa(T.cintura_y), T.cintura_y], [zParabrisa(T.parabrisa_y1), T.parabrisa_y1], T.vidro_espessura,
      [T.teto_y - T.cintura_y, T.capo_fim_z - T.teto_frente_z]),
    frontal: trapezio(xParabrisa, T.cintura_y, T.parabrisa_y1),
  });
  const zTraseiro = reta(T.cintura_y, T.base_tras_z, T.quebra_tras_y, T.quebra_tras_z);
  const xTraseiro = reta(T.vidro_traseiro_y0, T.vidro_traseiro_meia_largura_y0, T.vidro_traseiro_y1, T.vidro_traseiro_meia_largura_y1);
  formas.push({
    nome: 'vidroTraseiro', forma: 'vistas', material: 'vidro',
    lado: placaSobre([zTraseiro(T.vidro_traseiro_y0), T.vidro_traseiro_y0], [zTraseiro(T.vidro_traseiro_y1), T.vidro_traseiro_y1], T.vidro_espessura,
      [-(T.quebra_tras_y - T.cintura_y), T.quebra_tras_z - T.base_tras_z]),
    frontal: trapezio(xTraseiro, T.vidro_traseiro_y0, T.vidro_traseiro_y1),
  });

  /* vidros laterais: uma janela por lado, casca de 12 mm sobre a lateral inclinada da cabine, de z -355 a 990 na cintura */
  const janela = [[T.vidro_lateral_frente_z, T.cintura_y], [T.vidro_lateral_topo_frente_z, T.vidro_lateral_topo_y],
    [T.vidro_lateral_tras_z, T.vidro_lateral_topo_y], [T.vidro_lateral_tras_z, T.cintura_y]];
  const e = T.vidro_lateral_espessura;
  for (const s of [1, -1]) {
    formas.push({
      nome: `vidroLateral${s > 0 ? 'Dir' : 'Esq'}`, forma: 'vistas', material: 'vidro', lado: janela,
      frontal: [[s * xCabine(T.cintura_y), T.cintura_y], [s * (xCabine(T.cintura_y) + e), T.cintura_y],
        [s * (xCabine(T.vidro_lateral_topo_y) + e), T.vidro_lateral_topo_y], [s * xCabine(T.vidro_lateral_topo_y), T.vidro_lateral_topo_y]],
    });
  }

  /* barra de sirene: três lentes de seção trapezoidal, de z 0 a 353, sobre o teto; azul à esquerda, vermelha à direita */
  const xB = T.sirene_base_meia_largura;
  const xT = T.sirene_topo_meia_largura;
  const xK = T.sirene_centro_meia_largura;
  const yS0 = T.teto_y;
  const yS1 = T.sirene_topo_y;
  const lente = (nome, material, pontos) => ({ nome, forma: 'frontal', material, frontal: pontos, z0: T.sirene_z0, z1: T.sirene_z1 });
  formas.push(lente('sirenaAzul', 'azul2', [[-xB, yS0], [-xK, yS0], [-xK, yS1], [-xT, yS1]]));
  formas.push(lente('sirenaPreta', 'preto', [[-xK, yS0], [xK, yS0], [xK, yS1], [-xK, yS1]]));
  formas.push(lente('sirenaVermelha', 'vermelho', [[xK, yS0], [xB, yS0], [xT, yS1], [xK, yS1]]));

  /* retrovisores: seção frontal com o canto de baixo chanfrado, extrudada em z de 1011 a 1236 */
  for (const s of [1, -1]) {
    const x1 = T.retrovisor_x1;
    const c = T.retrovisor_chanfro;
    const y0 = T.retrovisor_y0;
    const lado = s > 0 ? 'Dir' : 'Esq';
    formas.push({
      nome: `retrovisor${lado}`, forma: 'frontal', material: 'azul', z0: T.retrovisor_z0, z1: T.retrovisor_z1,
      frontal: [[s * M, T.cintura_y], [s * M, y0], [s * (x1 - c), y0], [s * x1, y0 + c], [s * x1, T.cintura_y]],
    });
  }

  /* soleira e blocos de ponta lavanda: a soleira entre as rodas, e frente e trás pela interseção do perfil, da seção e da planta */
  formas.push({
    nome: 'chassiCentro', forma: 'cubo', material: 'lavanda', larg: 2 * C, alt: T.piso_y - T.chassi_base_y, prof: 2 * (T.roda_z_frente - T.arco_raio),
    em: [0, T.chassi_base_y, 0],
  });
  const zBlocoF = T.roda_z_frente + T.arco_raio;
  const arcoBlocoF = trechoDoLado(zF, yR, T.arco_raio, T.lados, T.balanco_y, 1);
  const bandaF = [T.chassi_base_y - 50, T.balanco_y + 50];
  formas.push({
    nome: 'chassiFrente', forma: 'vistas', material: 'lavanda',
    lado: [[zBlocoF, T.chassi_base_y], [T.bloco_frente_z1, T.chassi_base_y], [T.bloco_frente_z1, T.balanco_y], ...arcoBlocoF],
    frontal: [[-C, bandaF[0]], [C, bandaF[0]], [C, bandaF[1]], [-C, bandaF[1]]],
    planta: [[-C, zBlocoF - 100], [C, zBlocoF - 100], [C, T.planta_frente_quina0_z], [T.planta_quina1_x, T.planta_frente_quina1_z],
      [M, T.bloco_frente_z1], [-M, T.bloco_frente_z1], [-T.planta_quina1_x, T.planta_frente_quina1_z], [-C, T.planta_frente_quina0_z]],
  });
  const zBlocoT = T.roda_z_tras - T.arco_raio;
  const arcoBlocoT = trechoDoLado(zT, yR, T.arco_raio, T.lados, T.balanco_y, -1);
  formas.push({
    nome: 'chassiTras', forma: 'vistas', material: 'lavanda',
    lado: [[T.bloco_tras_z1, T.piso_y], [T.bloco_tras_z1, T.balanco_y], ...arcoBlocoT],
    frontal: [[-C, T.piso_y - 50], [C, T.piso_y - 50], [C, T.balanco_y + 50], [-C, T.balanco_y + 50]],
    planta: [[-C, zBlocoT + 100], [C, zBlocoT + 100], [C, T.planta_tras_quina0_z], [T.planta_quina1_x, T.planta_tras_quina1_z],
      [M, T.bloco_tras_z1], [-M, T.bloco_tras_z1], [-T.planta_quina1_x, T.planta_tras_quina1_z], [-C, T.planta_tras_quina0_z]],
  });

  /* para-lamas: anel de 530 a 688 de raio, de x 971 a 1147, assentado na soleira (y 530) do lado do meio e no bloco (y 706) do lado da ponta */
  for (const r of rodas) {
    const frente = r.ponta === 'Frente';
    const nivEsq = frente ? T.piso_y : T.balanco_y;
    const nivDir = frente ? T.balanco_y : T.piso_y;
    const ext = arcoSup(r.zc, yR, T.para_lama_raio, T.lados, nivEsq, nivDir);
    const int = arcoSup(r.zc, yR, T.arco_raio, T.lados, nivEsq, nivDir);
    formas.push({
      nome: `paraLama${r.ponta}${r.lado}`, forma: 'lateral', material: 'lavanda', x0: r.s > 0 ? M : -C, largura: C - M, lado: [...ext, ...[...int].reverse()],
    });
  }

  /* caixas de roda: o arco do perfil, fechado em y 530, entre as faces de dentro dos dois pneus */
  for (const [ponta, zc] of [['Frente', zF], ['Tras', zT]]) {
    formas.push({
      nome: `caixaRoda${ponta}`, forma: 'lateral', material: 'caixaRoda', x0: -T.roda_x_dentro, largura: 2 * T.roda_x_dentro,
      lado: arcoSup(zc, yR, T.arco_raio, T.lados, yR, yR),
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

  /* faróis amarelos rentes ao nariz e lanternas vermelhas rentes à traseira, de x 618 a 971 */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const larg = M - T.farol_x0;
    formas.push({
      nome: `farol${lado}`, forma: 'cubo', material: 'amarelo', larg, alt: T.farol_y1 - T.farol_y0, prof: T.farol_espessura,
      em: [s * (T.farol_x0 + larg / 2), T.farol_y0, T.nariz_z + T.farol_espessura / 2],
    });
    formas.push({
      nome: `lanterna${lado}`, forma: 'cubo', material: 'vermelho', larg, alt: T.lanterna_y1 - T.lanterna_y0, prof: T.lanterna_espessura,
      em: [s * (T.farol_x0 + larg / 2), T.lanterna_y0, T.traseira_z - T.lanterna_espessura / 2],
    });
  }

  /* defensa dianteira: a barra baixa tem a planta curva nas pontas (raio igual à profundidade), e os postes sobem dela */
  const zB0 = T.barra_z0;
  const zB1 = T.barra_z1;
  const rB = zB1 - zB0;
  const xB0 = T.barra_meia_largura - rB;
  const arcoPlanta = Array.from({ length: 7 }, (_, k) => {
    const a = (Math.PI / 2) * (k / 6);
    return [arred(xB0 + rB * Math.cos(a)), arred(zB0 + rB * Math.sin(a))];
  });
  formas.push({
    nome: 'defensaBarra', forma: 'planta', material: 'defensa', y0: T.barra_y0, altura: T.barra_y1 - T.barra_y0,
    planta: [...arcoPlanta, ...[...arcoPlanta].reverse().map(([x, z]) => [-x, z])],
  });
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const larg = T.poste_x1 - T.poste_x0;
    formas.push({
      nome: `posteDefensa${lado}`, forma: 'lateral', material: 'defensa', x0: s > 0 ? T.poste_x0 : -T.poste_x1, largura: larg,
      lado: [[zB0, T.barra_y1], [zB1, T.barra_y1], [zB1, T.poste_chanfro_y], [T.poste_chanfro_z, T.poste_topo_y], [zB0, T.poste_topo_y]],
    });
    formas.push({
      nome: `bracoDefensa${lado}`, forma: 'cubo', material: 'defensa', larg, alt: T.braco_y1 - T.braco_y0, prof: zB0 - T.nariz_z,
      em: [(s * (T.poste_x0 + T.poste_x1)) / 2, T.braco_y0, (T.nariz_z + zB0) / 2],
    });
  }
  formas.push({
    nome: 'travessaDefensa', forma: 'cubo', material: 'defensa', larg: 2 * T.poste_x0, alt: T.braco_y1 - T.braco_y0, prof: T.travessa_z1 - T.travessa_z0,
    em: [0, T.braco_y0, (T.travessa_z0 + T.travessa_z1) / 2],
  });
  for (const [nome, material, s] of [['luzDefensaAzul', 'azul2', -1], ['luzDefensaVermelha', 'vermelho', 1]]) {
    formas.push({
      nome, forma: 'planta', material, y0: T.braco_y0, altura: T.braco_y1 - T.braco_y0,
      planta: [[s * T.poste_x1, zB0], [s * T.luz_x1, zB0], [s * T.luz_x1, T.luz_chanfro_z], [s * T.poste_x1, zB1]],
    });
  }

  /* placas claras de quinas chanfradas: a da frente sai da barra até z 2736, a de trás sai da traseira até z -2736 */
  formas.push({
    nome: 'placaFrente', forma: 'frontal', material: 'placa', z0: T.barra_z1, z1: T.placa_frente_z1,
    frontal: chanfrado(T.placa_meia_largura, T.placa_frente_y0, T.placa_frente_y1, T.placa_chanfro),
  });
  formas.push({
    nome: 'placaTras', forma: 'frontal', material: 'placa', z0: T.placa_tras_z1, z1: T.traseira_z,
    frontal: chanfrado(T.placa_meia_largura, T.placa_tras_y0, T.placa_tras_y1, T.placa_chanfro),
  });
  return formas;
}

/* ---------- passos ---------- */

const emMetro = (v) => v.map(m);
const perfilM = (pontos) => pontos.map(([u, v]) => [m(u), m(v)]);

/* Os passos de uma forma, com os ids do bloco `base`: a forma leva base + 1 (e base + 2 e 3 nas outras extrusões) e a interseção, base + 10. */
function passosDaForma(f, base, T) {
  const passos = [];
  let sel;
  if (f.forma === 'vistas') {
    const L = T.retrovisor_x1 + 200;
    const Cz = T.placa_frente_z1 + 100;
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilM(perfilLateral(semColineares(f.lado))) }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * Cz), em: [0, 0, m(-Cz)], perfil: perfilM(secaoFrontal(f.frontal)) }]);
    const solidos = [{ origem: { op: 'extrusao', id: base + 1 } }, { origem: { op: 'extrusao', id: base + 2 } }];
    if (f.planta) {
      passos.push(['extrusao', { origemId: base + 3, eixo: 'y', altura: m(3200), em: [0, m(-100), 0], perfil: perfilM(antihorario(f.planta)) }]);
      solidos.push({ origem: { op: 'extrusao', id: base + 3 } });
    }
    passos.push(['intersectar', { origemId: base + 10, solidos }]);
    sel = { origem: { op: 'intersectar', id: base + 10 } };
  } else if (f.forma === 'lateral') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(f.largura), em: [m(f.x0), 0, 0], perfil: perfilM(perfilLateral(semColineares(f.lado))) }]);
    sel = { origem: { op: 'extrusao', id: base + 1 } };
  } else if (f.forma === 'frontal') {
    passos.push(['extrusao', { origemId: base + 1, eixo: 'z', altura: m(f.z1 - f.z0), em: [0, 0, m(f.z0)], perfil: perfilM(secaoFrontal(f.frontal)) }]);
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

export const CONTATOS = [
  { par: ['carroceriaFrente', 'porta'], motivo: 'a face de trás da carroceria da frente e a face da frente da porta são o mesmo plano, em z 1011' },
  { par: ['porta', 'carroceriaTras'], motivo: 'a face de trás da porta e a face da frente da carroceria de trás são o mesmo plano, em z -971' },
  ...['carroceriaFrente', 'porta', 'carroceriaTras'].map((c) => ({
    par: ['cabine', c], motivo: 'a face de baixo da cabine, em y 1412, assenta na cintura da carroceria, na largura de 1942 mm',
  })),
  { par: ['chassiCentro', 'porta'], motivo: 'a face de cima da soleira, em y 530, sustenta a face de baixo da porta, de x -853 a 853' },
  { par: ['chassiFrente', 'carroceriaFrente'], motivo: 'a face de cima do bloco da frente, em y 706, sustenta a carroceria da frente' },
  { par: ['chassiTras', 'carroceriaTras'], motivo: 'a face de cima do bloco de trás, em y 706, sustenta a carroceria de trás' },
  { par: ['cabine', 'painelTeto'], motivo: 'o painel branco assenta no teto plano da cabine, em y 2118' },
  { par: ['cabine', 'parabrisa'], motivo: 'a face de trás do para-brisa é o mesmo plano da face inclinada da frente da cabine' },
  { par: ['cabine', 'vidroTraseiro'], motivo: 'a face da frente do vidro traseiro é o mesmo plano da face inclinada de trás da cabine' },
  { par: ['cabine', 'vidroLateralDir'], motivo: 'a face de dentro do vidro lateral direito é o mesmo plano da lateral inclinada da cabine' },
  { par: ['cabine', 'vidroLateralEsq'], motivo: 'a face de dentro do vidro lateral esquerdo é o mesmo plano da lateral inclinada da cabine' },
  ...['sirenaAzul', 'sirenaPreta', 'sirenaVermelha'].map((s) => ({ par: ['cabine', s], motivo: 'a base da lente da sirene assenta no teto plano da cabine, em y 2118' })),
  { par: ['sirenaAzul', 'sirenaPreta'], motivo: 'a face de dentro da lente azul encosta na face da lente preta, em x -254' },
  { par: ['sirenaPreta', 'sirenaVermelha'], motivo: 'a face de dentro da lente vermelha encosta na face da lente preta, em x 254' },
  ...['sirenaAzul', 'sirenaPreta', 'sirenaVermelha'].map((s) => ({ par: ['painelTeto', s], motivo: 'a face de trás da lente da sirene, em z 0, encosta na ponta do painel branco' })),
  ...LADOS.flatMap((l) => [
    { par: [`retrovisor${l}`, 'porta'], motivo: 'o canto de trás do retrovisor, em x 971 ou -971 e z 1011, toca o canto da frente da porta, só pela aresta' },
    { par: [`vidroLateral${l}`, 'porta'], motivo: 'o canto de baixo do vidro lateral, em x 971 ou -971 e y 1412, toca a cintura da porta, só pela aresta' },
    { par: [`retrovisor${l}`, 'carroceriaFrente'], motivo: 'a face de dentro do retrovisor encosta na lateral da carroceria da frente, em x 971 ou -971' },
    { par: [`farol${l}`, 'carroceriaFrente'], motivo: 'a face de trás do farol encosta na face da frente do nariz, em z 2294' },
    { par: [`lanterna${l}`, 'carroceriaTras'], motivo: 'a face da frente da lanterna encosta na face de trás da carroceria, em z -2648' },
    { par: [`bracoDefensa${l}`, 'carroceriaFrente'], motivo: 'a face de trás do braço encosta na face da frente do nariz, em z 2294' },
    { par: [`bracoDefensa${l}`, `posteDefensa${l}`], motivo: 'a face da frente do braço encosta na face de trás do poste, em z 2471' },
    { par: [`posteDefensa${l}`, 'defensaBarra'], motivo: 'a base do poste, em y 706, assenta na face de cima da barra baixa' },
    { par: ['travessaDefensa', `posteDefensa${l}`], motivo: 'a ponta da travessa encosta na face de dentro do poste, em x 353 ou -353' },
  ]),
  { par: ['bracoDefensaEsq', 'luzDefensaAzul'], motivo: 'o canto de trás da luz azul, em x -530 e z 2471, toca o canto da frente do braço esquerdo, só pela aresta' },
  { par: ['bracoDefensaDir', 'luzDefensaVermelha'], motivo: 'o canto de trás da luz vermelha, em x 530 e z 2471, toca o canto da frente do braço direito, só pela aresta' },
  { par: ['carroceriaFrente', 'parabrisa'], motivo: 'o pé do para-brisa, em y 1412 e z 1236, toca o canto de trás do capô, só pela aresta' },
  { par: ['luzDefensaAzul', 'posteDefensaEsq'], motivo: 'a face de dentro da luz azul encosta na face de fora do poste esquerdo, em x -530' },
  { par: ['luzDefensaVermelha', 'posteDefensaDir'], motivo: 'a face de dentro da luz vermelha encosta na face de fora do poste direito, em x 530' },
  { par: ['placaFrente', 'defensaBarra'], motivo: 'a face de trás da placa encosta na face da frente da barra baixa, em z 2648' },
  { par: ['placaTras', 'carroceriaTras'], motivo: 'a face de trás da carroceria, em z -2648, sustenta a placa de trás na faixa de y 706 a 750' },
  { par: ['placaTras', 'chassiTras'], motivo: 'a face de trás do bloco, em z -2648, sustenta a placa de trás na faixa de y 530 a 706' },
  ...PONTAS.map((p) => ({ par: [`caixaRoda${p}`, 'chassiCentro'], motivo: 'o pé do arco da caixa, em y 530 e z 890 ou -890, toca o canto da soleira, só pela aresta' })),
  ...PONTAS.flatMap((p) => [
    ...(p === 'Frente' ? ['carroceriaFrente', 'porta', 'chassiFrente'] : ['carroceriaTras', 'porta', 'chassiTras']).map((c) => ({
      par: [`caixaRoda${p}`, c], motivo: 'a caixa de roda enche o arco do perfil e encosta nas faces do arco desta parte',
    })),
    ...LADOS.flatMap((l) => [
      { par: [`caixaRoda${p}`, `roda${p}${l}`], motivo: 'a face de dentro do pneu, em x 530 ou -530, encosta na face da caixa de roda' },
      { par: [`aro${p}${l}`, `roda${p}${l}`], motivo: 'a face de dentro do aro encosta na face de fora do pneu, no disco do centro' },
      { par: [`paraLama${p}${l}`, 'chassiCentro'], motivo: 'o pé do anel do lado do meio assenta na face de cima da soleira, em y 530' },
      { par: [`paraLama${p}${l}`, p === 'Frente' ? 'chassiFrente' : 'chassiTras'], motivo: 'o pé do anel do lado da ponta assenta na face de cima do bloco, em y 706' },
      { par: [`paraLama${p}${l}`, p === 'Frente' ? 'carroceriaFrente' : 'carroceriaTras'], motivo: 'a face de dentro do anel encosta na lateral da carroceria, em x 971 ou -971' },
      { par: [`paraLama${p}${l}`, 'porta'], motivo: 'a face de dentro do anel encosta na lateral da porta, em x 971 ou -971' },
    ]),
  ]),
];

/* ---------- pontos declarados ---------- */

export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  return [
    { nome: 'canto de trás, embaixo, da placa de trás', parte: 'placaTras', medida: 'minimo', em: [-T.placa_meia_largura, T.placa_tras_y0, T.placa_tras_z1], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da placa da frente', parte: 'placaFrente', medida: 'maximo', em: [T.placa_meia_largura, T.placa_frente_y1, T.placa_frente_z1], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da barra de sirene', parte: 'sirenaVermelha', medida: 'maximo', em: [T.sirene_base_meia_largura, T.sirene_topo_y, T.sirene_z1], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da cabine', parte: 'cabine', medida: 'maximo', em: [T.meia_largura, T.teto_y, T.capo_fim_z], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.cintura_y, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-T.roda_x_fora, 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente e em cima', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.roda_x_fora, 2 * T.roda_raio, T.roda_z_frente + T.roda_raio], toleranciaMm: tol },
    { nome: 'cume do anel do para-lama da frente à direita', parte: 'paraLamaFrenteDir', medida: 'maximo', em: [T.chassi_meia_largura, T.roda_raio + T.para_lama_raio, T.roda_z_frente + T.para_lama_raio * Math.cos((2 * Math.PI) / T.lados)], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, do bloco da frente', parte: 'chassiFrente', medida: 'maximo', em: [T.chassi_meia_largura, T.balanco_y, T.bloco_frente_z1], toleranciaMm: tol },
    { nome: 'ponta da frente da barra baixa da defensa', parte: 'defensaBarra', medida: 'maximo', em: [T.barra_meia_largura, T.barra_y1, T.barra_z1], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'carro-policia', desc: 'viatura estilizada de brinquedo, azul acinzentada com portas claras, anéis de para-lama lavanda, barra de sirene, defensa dianteira de barras, vidros azuis e rodas com aro' },
  PARAMS: TABELA,
  MATERIAIS: {
    azul: { tipo: 'liso', cor: '#707287' },
    prata: { tipo: 'liso', cor: '#cfcfe1' },
    lavanda: { tipo: 'liso', cor: '#c6c6db' },
    vidro: { tipo: 'liso', cor: '#d9ecfb' },
    painel: { tipo: 'liso', cor: '#f1f1f7' },
    azul2: { tipo: 'liso', cor: '#4a62cf' },
    preto: { tipo: 'liso', cor: '#45454f' },
    vermelho: { tipo: 'liso', cor: '#ea543d' },
    amarelo: { tipo: 'liso', cor: '#ffd32e' },
    defensa: { tipo: 'liso', cor: '#6a6b80' },
    placa: { tipo: 'liso', cor: '#d8d8e6' },
    caixaRoda: { tipo: 'liso', cor: '#2c2d35' },
    pneu: { tipo: 'liso', cor: '#36363a' },
    aro: { tipo: 'metal', cor: '#7a7d93', acabamento: 'escovado' },
  },
  TOPO: { origem: 'chão, no meio da viatura em x e em z; y para cima e a frente da viatura em +z' },
  PLANO: {
    objeto: 'viatura estilizada de 5472 mm de comprimento, 2648 mm de largura com os espelhos e 2294 mm de altura com a barra de sirene, de portas claras, cabine que afunila, defensa dianteira e rodas grandes',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total da viatura, de z -2736 a 2736, com as placas', milimetros: 5472 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceriaFrente', forma: 'trecho azul acinzentado de z 1011 a 2294, de 1942 mm de largura, com capô que desce de y 1412 a 1236 no nariz, saia inclinada e arcos da roda da frente', tecnica: 'intersecao do perfil lateral extrudado em x, com os arcos recortados no perfil, com a seção frontal da saia extrudada em z' },
      { nome: 'porta', forma: 'trecho prata de z -971 a 1011, de y 530 a 1412, com a saia inclinada de 1706 a 1942 mm de largura e os arcos das duas rodas', tecnica: 'intersecao do perfil lateral extrudado em x com a seção frontal da saia extrudada em z' },
      { nome: 'carroceriaTras', forma: 'trecho azul acinzentado de z -2648 a -971, com tampa de trás plana em y 1412, quina chanfrada em y 1324 e arcos da roda de trás', tecnica: 'intersecao do perfil lateral extrudado em x, com os arcos recortados no perfil, com a seção frontal da saia extrudada em z' },
      { nome: 'cabine', forma: 'cabine azul acinzentada de y 1412 a 2118, com a lateral afunilando de 1942 a 1588 mm de largura, para-brisa a 45 graus e vidro de trás em duas rampas', tecnica: 'intersecao do perfil lateral de pilar a pilar extrudado em x com a seção frontal trapezoidal extrudada em z' },
      { nome: 'painelTeto', forma: 'placa branca de 1236 por 6 mm no teto, de z -1059 a 0, atrás da barra de sirene', tecnica: 'cubo assentado no teto plano da cabine' },
      { nome: 'parabrisa', forma: 'placa de vidro azul clara de 20 mm sobre a face de 45 graus da cabine, de y 1412 a 1988, mais estreita que a cabine', tecnica: 'intersecao da faixa lateral paralela à face extrudada em x com o trapézio frontal extrudado em z' },
      { nome: 'vidroTraseiro', forma: 'placa de vidro azul clara de 20 mm sobre a rampa de trás da cabine, de y 1570 a 1960', tecnica: 'intersecao da faixa lateral paralela à face extrudada em x com o trapézio frontal extrudado em z' },
      { nome: 'vidroLateralDir', forma: 'janela em placa de vidro de 12 mm sobre a lateral inclinada direita da cabine, de z -355 a 990 na cintura, com a frente inclinada a 45 graus', tecnica: 'intersecao do trapézio lateral extrudado em x com a casca frontal inclinada extrudada em z' },
      { nome: 'vidroLateralEsq', forma: 'janela em placa de vidro de 12 mm sobre a lateral inclinada esquerda da cabine, de z -355 a 990 na cintura, com a frente inclinada a 45 graus', tecnica: 'intersecao do trapézio lateral extrudado em x com a casca frontal inclinada extrudada em z' },
      { nome: 'sirenaAzul', forma: 'lente azul da barra de sirene, de x -618 a -254 na base e -528 no topo, y 2118 a 2294 e z 0 a 353', tecnica: 'extrusao com eixo z da seção trapezoidal' },
      { nome: 'sirenaPreta', forma: 'lente preta central da barra de sirene, de x -254 a 254, y 2118 a 2294 e z 0 a 353', tecnica: 'extrusao com eixo z da seção retangular' },
      { nome: 'sirenaVermelha', forma: 'lente vermelha da barra de sirene, de x 254 a 618 na base e 528 no topo, y 2118 a 2294 e z 0 a 353', tecnica: 'extrusao com eixo z da seção trapezoidal' },
      { nome: 'retrovisorDir', forma: 'retrovisor azul acinzentado de x 971 a 1324, y 1236 a 1412 e z 1011 a 1236, com o canto de baixo chanfrado', tecnica: 'extrusao com eixo z da seção frontal chanfrada' },
      { nome: 'retrovisorEsq', forma: 'retrovisor azul acinzentado de x -1324 a -971, y 1236 a 1412 e z 1011 a 1236, com o canto de baixo chanfrado', tecnica: 'extrusao com eixo z da seção frontal chanfrada' },
      { nome: 'chassiFrente', forma: 'bloco lavanda de 2294 mm de largura, de y 353 a 706 e z 1960 a 2383, com as quinas da planta fechadas até 971 de meia largura', tecnica: 'intersecao do perfil lateral, da seção retangular e da planta de quinas fechadas' },
      { nome: 'chassiCentro', forma: 'soleira lavanda de 2294 por 177 por 1800 mm, de y 353 a 530 e z -900 a 900, entre as rodas', tecnica: 'cubo sob a porta' },
      { nome: 'chassiTras', forma: 'bloco lavanda de 2294 mm de largura, de y 530 a 706 e z -2648 a -1960, com as quinas da planta fechadas até 971 de meia largura', tecnica: 'intersecao do perfil lateral, da seção retangular e da planta de quinas fechadas' },
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `paraLama${p}${l}`,
        forma: `anel lavanda de 177 mm de espessura sobre a roda ${p === 'Frente' ? 'da frente' : 'de trás'} ${l === 'Dir' ? 'à direita' : 'à esquerda'}, de 530 a 688 mm de raio, de x 971 a 1147`,
        tecnica: 'extrusao com eixo x de um anel em arco, assentado na soleira e no bloco',
      }))),
      ...PONTAS.map((p) => ({
        nome: `caixaRoda${p}`,
        forma: `caixa escura do arco ${p === 'Frente' ? 'dianteiro' : 'traseiro'}, de 1060 mm de largura entre as faces de dentro dos pneus, com 530 mm de raio, fechada em y 530`,
        tecnica: 'extrusao com eixo x do próprio arco do perfil, fechado na base',
      })),
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `roda${p}${l}`,
        forma: `pneu escuro de 1060 mm de diâmetro e 529 mm de largura com chanfro de 50 mm, centro em y 530 e z ${p === 'Frente' ? '1430' : '-1430'}, ${l === 'Dir' ? 'à direita' : 'à esquerda'}`,
        tecnica: 'lathe em torno de x, com o chanfro no perfil',
      }))),
      ...PONTAS.flatMap((p) => LADOS.map((l) => ({
        nome: `aro${p}${l}`,
        forma: `aro cinza de 600 mm de diâmetro e 20 mm de espessura com cubo de 360 mm saindo 15 mm, na face de fora do pneu ${p === 'Frente' ? 'da frente' : 'de trás'} ${l === 'Dir' ? 'à direita' : 'à esquerda'}`,
        tecnica: 'lathe em torno de x, com o degrau do cubo no perfil',
      }))),
      { nome: 'farolDir', forma: 'faixa amarela de 353 por 177 por 12 mm, de x 618 a 971 e y 882 a 1059, rente ao nariz à direita', tecnica: 'cubo encostado na face da frente do nariz' },
      { nome: 'farolEsq', forma: 'faixa amarela de 353 por 177 por 12 mm, de x -971 a -618 e y 882 a 1059, rente ao nariz à esquerda', tecnica: 'cubo encostado na face da frente do nariz' },
      { nome: 'lanternaDir', forma: 'faixa vermelha de 353 por 177 por 12 mm, de x 618 a 971 e y 1147 a 1324, rente à traseira à direita', tecnica: 'cubo encostado na face de trás da carroceria' },
      { nome: 'lanternaEsq', forma: 'faixa vermelha de 353 por 177 por 12 mm, de x -971 a -618 e y 1147 a 1324, rente à traseira à esquerda', tecnica: 'cubo encostado na face de trás da carroceria' },
      { nome: 'defensaBarra', forma: 'barra baixa escura de 1764 mm de largura, y 484 a 706 e z 2471 a 2648, com as pontas da planta curvas de 177 mm de raio', tecnica: 'extrusao com eixo y da planta de pontas curvas' },
      { nome: 'posteDefensaDir', forma: 'poste escuro de 177 mm de espessura, de x 353 a 530, y 706 a 1236 e z 2471 a 2648, com a quina de cima da frente chanfrada', tecnica: 'extrusao com eixo x do perfil lateral chanfrado' },
      { nome: 'posteDefensaEsq', forma: 'poste escuro de 177 mm de espessura, de x -530 a -353, y 706 a 1236 e z 2471 a 2648, com a quina de cima da frente chanfrada', tecnica: 'extrusao com eixo x do perfil lateral chanfrado' },
      { nome: 'bracoDefensaDir', forma: 'braço escuro de 177 por 177 mm ligando o poste direito ao nariz, de z 2294 a 2471 e y 882 a 1059', tecnica: 'cubo entre o nariz e o poste' },
      { nome: 'bracoDefensaEsq', forma: 'braço escuro de 177 por 177 mm ligando o poste esquerdo ao nariz, de z 2294 a 2471 e y 882 a 1059', tecnica: 'cubo entre o nariz e o poste' },
      { nome: 'travessaDefensa', forma: 'travessa escura de 706 por 177 por 88 mm entre os postes, de y 882 a 1059 e z 2515 a 2603', tecnica: 'cubo entre os postes' },
      { nome: 'luzDefensaAzul', forma: 'luz azul de ponta da defensa, de x -706 a -530, y 882 a 1059 e z 2471 a 2648, com a frente inclinada', tecnica: 'extrusao com eixo y da planta com a quina da frente chanfrada' },
      { nome: 'luzDefensaVermelha', forma: 'luz vermelha de ponta da defensa, de x 530 a 706, y 882 a 1059 e z 2471 a 2648, com a frente inclinada', tecnica: 'extrusao com eixo y da planta com a quina da frente chanfrada' },
      { nome: 'placaFrente', forma: 'placa clara de 618 por 308 por 88 mm com as quinas chanfradas de 88 mm, de y 330 a 638, saindo da barra baixa até z 2736', tecnica: 'extrusao com eixo z da seção chanfrada, encostada na barra' },
      { nome: 'placaTras', forma: 'placa clara de 618 por 309 por 88 mm com as quinas chanfradas de 88 mm, de y 441 a 750, saindo da traseira até z -2736', tecnica: 'extrusao com eixo z da seção chanfrada, encostada na traseira' },
    ],
    criteriosDeReprovacao: [
      'a caixa total não fica em x -1324 a 1324, y 0 a 2294 e z -2736 a 2736, ou alguma roda não toca o chão',
      'um lado da viatura difere do outro em medida ou posição de peça simétrica',
      'a cabine tem largura constante, e não afunila de 1942 mm na cintura a 1588 mm no teto',
      'a carroceria não tem a porta clara entre as duas cores azuis, ou a saia não recolhe embaixo das portas',
      'as rodas ficam escondidas, sem arco recortado, anel de para-lama lavanda e caixa de roda',
      'a barra de sirene não assenta no teto plano com as lentes azul, preta e vermelha da esquerda para a direita',
      'a defensa dianteira não tem barra baixa, dois postes e a travessa, ou a placa não sai da barra',
      'a silhueta lateral, frontal ou de cima difere da referência, vista na folha comparativa, em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
