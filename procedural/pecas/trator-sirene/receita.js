/* trator-sirene — trator de brinquedo da viatura: capô estreito e branco, cabine alta de vidro com teto branco saliente e barra de
 * sirene azul, preta e vermelha, rodas traseiras grandes sob para-lamas em arco, rodas dianteiras pequenas sob suportes
 * dobrados, escapamento vertical e defensa dianteira de barras com luzes azul e vermelha. Sem texto, marca nem brasão: só cores e
 * as lentes da sirene.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "tractor-police" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/tractor-police.glb, que o git ignora. O que
 * entra aqui são as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765, com o centro da caixa em z 0) e as
 * vistas (referencias/fonte-vistas.png). O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do trator em +z, x para a direita de quem olha de frente, centrado em
 * x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve, por parte, a
 * forma, a `parte` e o `material`. A conversão para metro está em `m`, num lugar só. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita: não há carroceria contínua. O capô, a base da cabine, o chassi, o teto e os vidros são prismas retos; a
 * cabine é a INTERSEÇÃO do perfil lateral (z, y) extrudado em x com a seção frontal (x, y) extrudada em z, e por isso afunila de 775
 * a 622 mm de meia largura. Uma extrusão com `eixo: 'x'` leva o perfil [u, v] a y = -u e z = v; com `eixo: 'z'`, a x = u e y = -v;
 * com `eixo: 'y'`, a x = u e z = v. As rodas são revoluções em torno de x (`lathe`) de 24 lados, com o chanfro do pneu e o rebaixo do
 * aro no perfil. O para-lama traseiro é um anel em arco (15 a 120 graus) com o raio de dentro igual ao do pneu, e as flancos da base
 * da cabine têm o arco da roda traseira recortado no próprio perfil, com os mesmos vértices do pneu. O para-lama dianteiro é uma
 * extrusão em x do perfil dobrado que desce até a espinha. As rodas não têm caixa de roda: ficam inteiras para fora, e o contato
 * delas é com a espinha, com o anel e com o suporte dianteiro.
 */

export const TABELA = {
  lados: 24, // contagem de lados dos pneus, dos arcos dos flancos e dos anéis (a mesma, para os vértices coincidirem)

  // espinha: o chassi de baixo, a base da cabine entre as rodas e o capô, todos de 936 mm de largura
  espinha_meia_largura: 468,
  chassi_base_y: 371,
  chassi_topo_y: 831,
  chassi_tras_z: -1231,
  chassi_frente_base_z: 1548,
  chassi_frente_topo_z: 1701,

  // capô: caixa de y 831 a 1522 com o painel claro da frente e o tampo branco chanfrado até y 1599
  capo_tras_z: 319,
  capo_frente_z: 1701,
  capo_lateral_topo_y: 1522,
  capo_topo_y: 1599,
  capo_topo_meia_largura: 391,
  grade_espessura: 40,
  farol_x0: 161,
  farol_x1: 315,
  farol_y0: 1139,
  farol_y1: 1446,
  farol_espessura: 12,

  // base da cabine: o bloco central entre as rodas (z -1231 a 319) e os flancos que chegam a 775 mm, com o arco da roda recortado
  base_cabine_topo_y: 1599,
  base_cabine_meia_largura: 775,

  // cabine: perfil lateral de pilar a pilar e seção frontal trapezoidal, de 775 mm de meia largura na base a 622 no topo
  cabine_topo_y: 2674,
  cabine_frente_topo_z: 12,
  cabine_topo_meia_largura: 622,

  // vidros azul claros: placas sobre as faces da cabine
  vidro_espessura: 12,
  parabrisa_y0: 1747,
  parabrisa_y1: 2526,
  parabrisa_meia_largura_y0: 599,
  parabrisa_meia_largura_y1: 488,
  vidro_tras_y0: 2000,
  vidro_tras_y1: 2505,
  vidro_tras_meia_largura_y0: 547,
  vidro_tras_meia_largura_y1: 475,
  vidro_lateral_base_y: 1769,
  vidro_lateral_topo_y: 2505,
  vidro_lateral_meio_y: 2123,
  vidro_lateral_base_frente_z: -279,
  vidro_lateral_meio_frente_z: -8,
  vidro_lateral_topo_frente_z: -117,
  vidro_lateral_tras_z: -1060,

  // teto branco saliente, com a quina da frente chanfrada, e barra de sirene de três lentes
  teto_meia_largura: 699,
  teto_base_y: 2674,
  teto_topo_y: 2828,
  teto_frente_z: 166,
  teto_chanfro_y: 2751,
  teto_chanfro_z: 89,
  teto_tras_z: -1385,
  sirene_z0: -441,
  sirene_z1: -88,
  sirene_topo_y: 3004,
  sirene_base_meia_largura: 618,
  sirene_topo_meia_largura: 528,
  sirene_centro_meia_largura: 255,

  // retrovisores: placas claras no canto da frente da base da cabine
  espelho_x1: 1018,
  espelho_y0: 1446,
  espelho_y1: 1835,
  espelho_z0: 185,

  // rodas traseiras: 1856 mm de diâmetro e 716 mm de largura, rebaixo do aro de 154 mm e cubo claro
  rt_z: -1103.5,
  rt_raio: 927.5,
  rt_x_fora: 1184,
  rt_ombro_dentro_r: 790,
  rt_banda_x0: 670,
  rt_banda_x1: 875,
  rt_ombro_fora_r: 790,
  rt_aro_ext_r: 620,
  rt_aro_int_r: 438,
  rt_piso_x: 1030,
  rt_piso_r: 396,
  rt_cubo_base_r: 242,
  rt_cubo_topo_r: 188,

  // rodas dianteiras: 1150 mm de diâmetro e 528 mm de largura, rebaixo do aro de 191 mm
  rf_z: 1201,
  rf_raio: 575,
  rf_x_fora: 996,
  rf_ombro_dentro_r: 486,
  rf_banda_x0: 682,
  rf_banda_x1: 805,
  rf_ombro_fora_r: 488,
  rf_aro_ext_r: 316,
  rf_aro_int_r: 210,
  rf_piso_x: 805,
  rf_piso_r: 156,

  // para-lama traseiro: anel em arco sobre a roda, do raio do pneu a 1082 mm, de 15 a 120 graus, de x 468 a 1184
  pl_tras_raio_ext: 1082.5,
  pl_tras_ang0: 15,
  pl_tras_ang1: 120,
  pl_tras_passo: 15,

  // suporte e para-lama dianteiro: perfil dobrado de x 468 a 967
  pl_frente_x1: 967,
  pl_frente_topo_y: 1303,
  pl_frente_base_y: 1150,
  pl_frente_z1: 1478,
  pl_frente_dobra_z: 861,
  pl_frente_dobra_base_z: 925,
  pl_frente_pe_z0: 431,
  pl_frente_pe_z1: 585,
  pl_frente_pe_y0: 583,
  pl_frente_pe_topo_y: 873,
  pl_frente_pe_topo2_y: 809,

  // defensa dianteira (a mesma do pacote A): barra baixa de planta curva, dois postes, dois braços, travessa e as luzes de ponta
  barra_y0: 478,
  barra_y1: 700,
  barra_z0: 1855,
  barra_z1: 2031,
  barra_meia_largura: 883,
  poste_x0: 353,
  poste_x1: 530,
  poste_topo_y: 1230,
  poste_chanfro_z: 1987,
  poste_chanfro_y: 1053,
  braco_y0: 877,
  braco_y1: 1053,
  travessa_z0: 1900,
  travessa_z1: 1985,
  luz_x1: 706,
  luz_chanfro_z: 1943,

  // escapamento e bocal, ambos de oito lados sobre o tampo do capô
  escape_x: -199,
  escape_z: 564,
  escape_base_r: 133,
  escape_degrau_y: 110,
  escape_degrau_r: 115,
  escape_haste_base_r: 59,
  escape_haste_topo_r: 71,
  escape_altura: 552,
  bocal_x: 230,
  bocal_z: 1469,
  bocal_base_r: 102,
  bocal_degrau_y: 84,
  bocal_degrau_r: 87,
  bocal_pescoco_r: 54,
  bocal_topo_r: 32,
  bocal_altura: 154,

  // engate traseiro (contrapeso e barra de tração) e gancho dianteiro
  contrapeso_y1: 1139,
  contrapeso_meia_largura: 384,
  contrapeso_quina_z: -1462,
  contrapeso_fundo_meia_largura: 307,
  contrapeso_z1: -1538,
  barra_tracao_y0: 409,
  barra_tracao_y1: 678,
  barra_tracao_meia_largura: 269,
  barra_tracao_chanfro: 77,
  barra_tracao_z1: -1308,
  gancho_y0: 332,
  gancho_y1: 601,
  gancho_z1: 1625,
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

/* O polígono de `n` lados de uma roda, em [z, y], no sentido horário a partir da esquerda; os vértices horizontais e verticais ficam exatos. */
function circulo(zc, yc, r, n) {
  return Array.from({ length: n }, (_, k) => {
    const a = Math.PI - (2 * Math.PI * k) / n;
    return [arred(zc + r * Math.cos(a)), arred(yc + r * Math.sin(a))];
  });
}

/* Leva o anel ao nível y, só do lado `lado` (+1: z maior que zc; -1: menor): o vértice a menos de 3 mm do nível vai para o nível, e onde
 * uma aresta cruza o nível entra um ponto com o y exato dele. Isso evita aresta de poucos milímetros, que vira triângulo fino. */
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

/* x ao longo de y pela reta que passa por (y0, x0) e (y1, x1), válida também fora do intervalo. */
const reta = (y0, x0, y1, x1) => (y) => x0 + ((x1 - x0) * (y - y0)) / (y1 - y0);
/* O paralelogramo da aresta P-Q deslocado `e` para fora, na direção da normal `n`; a face de dentro usa os mesmos vértices da aresta. */
function placaSobre(P, Q, e, n) {
  const k = e / Math.hypot(...n);
  return [P, Q, [Q[0] + n[0] * k, Q[1] + n[1] * k], [P[0] + n[0] * k, P[1] + n[1] * k]];
}
const trapezio = (xDe, y0, y1) => [[-xDe(y0), y0], [xDe(y0), y0], [xDe(y1), y1], [-xDe(y1), y1]];
/* Octógono de quinas chanfradas, em [x, y], de meia largura w. */
const chanfrado = (w, y0, y1, c) => [[-(w - c), y0], [w - c, y0], [w, y0 + c], [w, y1 - c], [w - c, y1], [-(w - c), y1], [-w, y1 - c], [-w, y0 + c]];

/* Perfil [raio, ao longo do eixo] do pneu de uma roda, com o chanfro, a banda e o rebaixo do aro. `x0` é a face de dentro. */
function perfilDoPneu(T, p, x0) {
  const L = p.xFora - x0;
  return [[0, 0], [p.ombroDentro, 0], [p.raio, p.banda0 - x0], [p.raio, p.banda1 - x0], [p.ombroFora, L], [p.aroExt, L], [p.aroExt, p.piso - x0], [0, p.piso - x0]];
}
const rodaTras = (T) => ({
  raio: T.rt_raio, xFora: T.rt_x_fora, ombroDentro: T.rt_ombro_dentro_r, banda0: T.rt_banda_x0, banda1: T.rt_banda_x1,
  ombroFora: T.rt_ombro_fora_r, aroExt: T.rt_aro_ext_r, aroInt: T.rt_aro_int_r, piso: T.rt_piso_x, pisoR: T.rt_piso_r,
});
const rodaFrente = (T) => ({
  raio: T.rf_raio, xFora: T.rf_x_fora, ombroDentro: T.rf_ombro_dentro_r, banda0: T.rf_banda_x0, banda1: T.rf_banda_x1,
  ombroFora: T.rf_ombro_fora_r, aroExt: T.rf_aro_ext_r, aroInt: T.rf_aro_int_r, piso: T.rf_piso_x, pisoR: T.rf_piso_r,
});
/* Espelha um perfil [raio, ao longo do eixo] de comprimento L para a roda do lado esquerdo, mantendo o sentido dos pontos. */
const espelharPerfil = (perfil, L) => [...perfil].reverse().map(([r, a]) => [r, L - a]);

/* ---------- derivar ---------- */

/* Cada forma tem `nome`, `forma` (vistas, lateral, frontal, planta, cubo ou lathe), `material` e as medidas da forma, em milímetro. */
export function derivar(T) {
  const E = T.espinha_meia_largura;
  const formas = [];
  const zSlant = reta(T.chassi_base_y, T.chassi_frente_base_z, T.chassi_topo_y, T.chassi_frente_topo_z);

  /* espinha: o chassi de baixo, com a frente inclinada, de lado a lado entre as faces de dentro dos pneus */
  formas.push({
    nome: 'chassi', forma: 'lateral', material: 'cinzaEscuro', x0: -E, largura: 2 * E,
    lado: [[T.chassi_tras_z, T.chassi_base_y], [T.chassi_frente_base_z, T.chassi_base_y], [T.chassi_frente_topo_z, T.chassi_topo_y], [T.chassi_tras_z, T.chassi_topo_y]],
  });

  /* capô: a caixa cinza, o painel claro da frente (dentro da caixa, rente à face da frente) e o tampo branco chanfrado */
  const zGrade = T.capo_frente_z - T.grade_espessura;
  formas.push({
    nome: 'capo', forma: 'cubo', material: 'cinza', larg: 2 * E, alt: T.capo_lateral_topo_y - T.chassi_topo_y, prof: zGrade - T.capo_tras_z,
    em: [0, T.chassi_topo_y, (T.capo_tras_z + zGrade) / 2],
  });
  formas.push({
    nome: 'grade', forma: 'cubo', material: 'claro', larg: 2 * E, alt: T.capo_lateral_topo_y - T.chassi_topo_y, prof: T.grade_espessura,
    em: [0, T.chassi_topo_y, (zGrade + T.capo_frente_z) / 2],
  });
  formas.push({
    nome: 'capoTopo', forma: 'frontal', material: 'branco', z0: T.capo_tras_z, z1: T.capo_frente_z,
    frontal: [[-E, T.capo_lateral_topo_y], [E, T.capo_lateral_topo_y], [T.capo_topo_meia_largura, T.capo_topo_y], [-T.capo_topo_meia_largura, T.capo_topo_y]],
  });
  for (const s of [1, -1]) {
    formas.push({
      nome: `farol${s > 0 ? 'Dir' : 'Esq'}`, forma: 'cubo', material: 'vidro', larg: T.farol_x1 - T.farol_x0, alt: T.farol_y1 - T.farol_y0, prof: T.farol_espessura,
      em: [(s * (T.farol_x0 + T.farol_x1)) / 2, T.farol_y0, T.capo_frente_z + T.farol_espessura / 2],
    });
  }

  /* O anel do para-lama traseiro e o arco de fora dele: a cabine, os flancos e o vidro lateral nascem recortados por ele, para nenhum
   * sólido atravessar o anel nem o pneu. Os pontos vão do ângulo menor (frente) ao maior (trás), em [z, y]. */
  const arcoDoAnel = (r) => {
    const pts = [];
    for (let a = T.pl_tras_ang0; a <= T.pl_tras_ang1; a += T.pl_tras_passo) {
      const rad = (a * Math.PI) / 180;
      pts.push([arred(T.rt_z + r * Math.cos(rad)), arred(T.rt_raio + r * Math.sin(rad))]);
    }
    return pts;
  };
  const arcoFora = arcoDoAnel(T.pl_tras_raio_ext);
  const arcoDentro = arcoDoAnel(T.rt_raio);
  /* o ponto do arco de fora no nível y (do lado da frente do cume) ou na posição z, com o outro valor interpolado */
  const noNivelY = (y) => {
    for (let i = 0; i + 1 < arcoFora.length; i += 1) {
      const [a, b] = [arcoFora[i], arcoFora[i + 1]];
      if (a[1] < b[1] && (a[1] - y) * (b[1] - y) <= 0) return [arred(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1])), y];
    }
    throw new Error(`o arco de fora não cruza y ${y}`);
  };
  const noZ = (z) => {
    for (let i = 0; i + 1 < arcoFora.length; i += 1) {
      const [a, b] = [arcoFora[i], arcoFora[i + 1]];
      if ((a[0] - z) * (b[0] - z) <= 0) return [z, arred(a[1] + ((z - a[0]) * (b[1] - a[1])) / (b[0] - a[0]))];
    }
    throw new Error(`o arco de fora não cruza z ${z}`);
  };

  /* base da cabine: o bloco central entre as rodas (z -1231 a 319) e os flancos, de 468 a 775 mm. O flanco acompanha o arco de fora do
   * anel acima de y 1208, a face da ponta do anel e o arco do pneu abaixo dela, tudo no perfil, com os mesmos vértices do anel e do pneu. */
  const B = T.base_cabine_meia_largura;
  formas.push({
    nome: 'baseCabine', forma: 'cubo', material: 'cinza', larg: 2 * E, alt: T.base_cabine_topo_y - T.chassi_topo_y, prof: T.capo_tras_z - T.chassi_tras_z,
    em: [0, T.chassi_topo_y, (T.chassi_tras_z + T.capo_tras_z) / 2],
  });
  const anelRt = comNivel(circulo(T.rt_z, T.rt_raio, T.rt_raio, T.lados), T.chassi_topo_y, T.rt_z, 1);
  const pontaDentro = arcoDentro[0];
  const baixoDoArco = anelRt.filter((p) => p[0] > T.rt_z && p[1] >= T.chassi_topo_y && p[1] <= pontaDentro[1]).sort((a, b) => b[1] - a[1]);
  const cruzaTopo = noNivelY(T.base_cabine_topo_y);
  const ladoFlancoBase = [[T.capo_tras_z, T.chassi_topo_y], [T.capo_tras_z, T.base_cabine_topo_y], cruzaTopo,
    ...arcoFora.filter((p) => p[1] < T.base_cabine_topo_y && p[0] > T.rt_z).reverse(), ...baixoDoArco];
  for (const s of [1, -1]) {
    formas.push({
      nome: `flancoBase${s > 0 ? 'Dir' : 'Esq'}`, forma: 'lateral', material: 'cinza', x0: s > 0 ? E : -B, largura: B - E, lado: ladoFlancoBase,
    });
  }

  /* cabine: o perfil lateral de pilar a pilar (frente inclinada, traseira vertical) e a seção frontal que afunila de 775 a 622 mm. O
   * centro (936 mm) é inteiro; os flancos perdem o canto de baixo que o anel e o pneu ocupam. */
  const xCabine = reta(T.base_cabine_topo_y, B, T.cabine_topo_y, T.cabine_topo_meia_largura);
  const zFrenteCabine = reta(T.base_cabine_topo_y, T.capo_tras_z, T.cabine_topo_y, T.cabine_frente_topo_z);
  const yA = T.base_cabine_topo_y - 100;
  const yB = T.cabine_topo_y + 100;
  const frenteLado = [[T.capo_tras_z, T.base_cabine_topo_y], [T.cabine_frente_topo_z, T.cabine_topo_y], [T.chassi_tras_z, T.cabine_topo_y]];
  formas.push({
    nome: 'cabineCentro', forma: 'vistas', material: 'cinza', frontal: [[-E, yA], [E, yA], [E, yB], [-E, yB]],
    lado: [...frenteLado, [T.chassi_tras_z, T.base_cabine_topo_y]],
  });
  const cruzaTras = noZ(T.chassi_tras_z);
  const ladoFlancoCabine = [...frenteLado, cruzaTras, ...arcoFora.filter((p) => p[0] > T.chassi_tras_z && p[1] > T.base_cabine_topo_y).reverse(), cruzaTopo];
  for (const s of [1, -1]) {
    formas.push({
      nome: `flancoCabine${s > 0 ? 'Dir' : 'Esq'}`, forma: 'vistas', material: 'cinza', lado: ladoFlancoCabine,
      frontal: [[s * E, yA], [s * xCabine(yA), yA], [s * xCabine(yB), yB], [s * E, yB]],
    });
  }

  /* para-brisa: placa sobre a face inclinada da frente da cabine, mais estreita que ela; vidro de trás: placa sobre a face de trás */
  const xParabrisa = reta(T.parabrisa_y0, T.parabrisa_meia_largura_y0, T.parabrisa_y1, T.parabrisa_meia_largura_y1);
  formas.push({
    nome: 'parabrisa', forma: 'vistas', material: 'vidro',
    lado: placaSobre([zFrenteCabine(T.parabrisa_y0), T.parabrisa_y0], [zFrenteCabine(T.parabrisa_y1), T.parabrisa_y1], T.vidro_espessura,
      [T.cabine_topo_y - T.base_cabine_topo_y, T.capo_tras_z - T.cabine_frente_topo_z]),
    frontal: trapezio(xParabrisa, T.parabrisa_y0, T.parabrisa_y1),
  });
  const xTraseiro = reta(T.vidro_tras_y0, T.vidro_tras_meia_largura_y0, T.vidro_tras_y1, T.vidro_tras_meia_largura_y1);
  formas.push({
    nome: 'vidroTraseiro', forma: 'frontal', material: 'vidro', z0: T.chassi_tras_z - T.vidro_espessura, z1: T.chassi_tras_z,
    frontal: trapezio(xTraseiro, T.vidro_tras_y0, T.vidro_tras_y1),
  });

  /* vidros laterais: janela em placa de 12 mm sobre a lateral inclinada da cabine, com a frente em duas rampas e o canto de baixo, de trás,
   * recortado pelo arco de fora do anel do para-lama */
  const cruzaVidroY = noNivelY(T.vidro_lateral_base_y);
  const cruzaVidroZ = noZ(T.vidro_lateral_tras_z);
  const janela = [[T.vidro_lateral_base_frente_z, T.vidro_lateral_base_y], cruzaVidroY,
    ...arcoFora.filter((p) => p[1] > T.vidro_lateral_base_y && p[0] > T.vidro_lateral_tras_z && p[0] < cruzaVidroY[0]),
    cruzaVidroZ, [T.vidro_lateral_tras_z, T.vidro_lateral_topo_y], [T.vidro_lateral_topo_frente_z, T.vidro_lateral_topo_y], [T.vidro_lateral_meio_frente_z, T.vidro_lateral_meio_y]];
  const e = T.vidro_espessura;
  for (const s of [1, -1]) {
    formas.push({
      nome: `vidroLateral${s > 0 ? 'Dir' : 'Esq'}`, forma: 'vistas', material: 'vidro', lado: janela,
      frontal: [[s * xCabine(T.vidro_lateral_base_y), T.vidro_lateral_base_y], [s * (xCabine(T.vidro_lateral_base_y) + e), T.vidro_lateral_base_y],
        [s * (xCabine(T.vidro_lateral_topo_y) + e), T.vidro_lateral_topo_y], [s * xCabine(T.vidro_lateral_topo_y), T.vidro_lateral_topo_y]],
    });
  }

  /* teto branco saliente: perfil lateral com a quina da frente chanfrada, extrudado de -699 a 699 */
  formas.push({
    nome: 'teto', forma: 'lateral', material: 'branco', x0: -T.teto_meia_largura, largura: 2 * T.teto_meia_largura,
    lado: [[T.teto_frente_z, T.teto_base_y], [T.teto_frente_z, T.teto_chanfro_y], [T.teto_chanfro_z, T.teto_topo_y], [T.teto_tras_z, T.teto_topo_y], [T.teto_tras_z, T.teto_base_y]],
  });

  /* barra de sirene: três lentes de seção trapezoidal sobre o teto; azul à esquerda, vermelha à direita */
  const xB = T.sirene_base_meia_largura;
  const xT = T.sirene_topo_meia_largura;
  const xK = T.sirene_centro_meia_largura;
  const yS0 = T.teto_topo_y;
  const yS1 = T.sirene_topo_y;
  const lente = (nome, material, pontos) => ({ nome, forma: 'frontal', material, frontal: pontos, z0: T.sirene_z0, z1: T.sirene_z1 });
  formas.push(lente('sirenaAzul', 'azul', [[-xB, yS0], [-xK, yS0], [-xK, yS1], [-xT, yS1]]));
  formas.push(lente('sirenaPreta', 'preto', [[-xK, yS0], [xK, yS0], [xK, yS1], [-xK, yS1]]));
  formas.push(lente('sirenaVermelha', 'vermelho', [[xK, yS0], [xB, yS0], [xT, yS1], [xK, yS1]]));

  /* retrovisores: placas claras de 243 mm no canto da frente da base da cabine, ao lado do pilar */
  for (const s of [1, -1]) {
    formas.push({
      nome: `espelho${s > 0 ? 'Dir' : 'Esq'}`, forma: 'cubo', material: 'claro', larg: T.espelho_x1 - B, alt: T.espelho_y1 - T.espelho_y0, prof: T.capo_tras_z - T.espelho_z0,
      em: [(s * (B + T.espelho_x1)) / 2, T.espelho_y0, (T.espelho_z0 + T.capo_tras_z) / 2],
    });
  }

  /* para-lamas traseiros: anel em arco sobre a roda traseira, do raio do pneu ao raio de fora, de 15 a 120 graus, de x 468 a 1184 */
  const anel = [...arcoFora, ...[...arcoDentro].reverse()];
  for (const s of [1, -1]) {
    formas.push({
      nome: `paraLamaTras${s > 0 ? 'Dir' : 'Esq'}`, forma: 'lateral', material: 'cinza', x0: s > 0 ? E : -T.rt_x_fora, largura: T.rt_x_fora - E, lado: anel,
    });
  }

  /* para-lamas dianteiros: o perfil dobrado, com a placa de cima sobre o pneu e o pé que desce até a espinha, de x 468 a 967 */
  const ladoFrente = [[T.pl_frente_z1, T.pl_frente_base_y], [T.pl_frente_z1, T.pl_frente_topo_y], [T.pl_frente_dobra_z, T.pl_frente_topo_y],
    [T.pl_frente_pe_z0, T.pl_frente_pe_topo_y], [T.pl_frente_pe_z0, T.pl_frente_pe_y0], [T.pl_frente_pe_z1, T.pl_frente_pe_y0],
    [T.pl_frente_pe_z1, T.pl_frente_pe_topo2_y], [T.pl_frente_dobra_base_z, T.pl_frente_base_y]];
  for (const s of [1, -1]) {
    formas.push({
      nome: `paraLamaFrente${s > 0 ? 'Dir' : 'Esq'}`, forma: 'lateral', material: 'cinza', x0: s > 0 ? E : -T.pl_frente_x1, largura: T.pl_frente_x1 - E, lado: ladoFrente,
    });
  }

  /* rodas: pneu com chanfro e rebaixo, aro cinza no rebaixo e, atrás, cubo claro; revoluções em torno de x, de 468 mm para fora */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    for (const [ponta, p, zc] of [['Frente', rodaFrente(T), T.rf_z], ['Tras', rodaTras(T), T.rt_z]]) {
      const L = p.xFora - E;
      const orienta = (perfil) => (s > 0 ? perfil : espelharPerfil(perfil, L));
      const x0 = s > 0 ? E : -p.xFora;
      const pisoRel = p.piso - E;
      formas.push({
        nome: `roda${ponta}${lado}`, forma: 'lathe', material: 'pneu', liso: true, lados: T.lados, eixo: 'x',
        perfil: orienta(perfilDoPneu(T, p, E)), em: [x0, p.raio, zc],
      });
      formas.push({
        nome: `aro${ponta}${lado}`, forma: 'lathe', material: 'aro', liso: true, fechar: true, lados: T.lados, eixo: 'x',
        perfil: orienta([[ponta === 'Frente' ? p.pisoR : p.pisoR, pisoRel], [p.aroExt, pisoRel], [p.aroExt, L], [p.aroInt, L]]), em: [x0, p.raio, zc],
      });
      if (ponta === 'Tras') {
        formas.push({
          nome: `cubo${ponta}${lado}`, forma: 'lathe', material: 'cubo', liso: true, lados: T.lados, eixo: 'x',
          perfil: orienta([[0, pisoRel], [T.rt_cubo_base_r, pisoRel], [T.rt_cubo_topo_r, L], [0, L]]), em: [x0, p.raio, zc],
        });
      }
    }
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
      nome: `bracoDefensa${lado}`, forma: 'cubo', material: 'defensa', larg, alt: T.braco_y1 - T.braco_y0, prof: zB0 - T.capo_frente_z,
      em: [(s * (T.poste_x0 + T.poste_x1)) / 2, T.braco_y0, (T.capo_frente_z + zB0) / 2],
    });
  }
  formas.push({
    nome: 'travessaDefensa', forma: 'cubo', material: 'defensa', larg: 2 * T.poste_x0, alt: T.braco_y1 - T.braco_y0, prof: T.travessa_z1 - T.travessa_z0,
    em: [0, T.braco_y0, (T.travessa_z0 + T.travessa_z1) / 2],
  });
  for (const [nome, material, s] of [['luzDefensaAzul', 'azul', -1], ['luzDefensaVermelha', 'vermelho', 1]]) {
    formas.push({
      nome, forma: 'planta', material, y0: T.braco_y0, altura: T.braco_y1 - T.braco_y0,
      planta: [[s * T.poste_x1, zB0], [s * T.luz_x1, zB0], [s * T.luz_x1, T.luz_chanfro_z], [s * T.poste_x1, zB1]],
    });
  }

  /* escapamento (haste que alarga para cima, sobre uma base em degrau) e bocal (três degraus), de oito lados, sobre o tampo do capô */
  formas.push({
    nome: 'escapamento', forma: 'lathe', material: 'cinzaEscuro', lados: 8, eixo: 'y', em: [T.escape_x, T.capo_topo_y, T.escape_z],
    perfil: [[0, 0], [T.escape_base_r, 0], [T.escape_degrau_r, T.escape_degrau_y], [T.escape_haste_base_r, T.escape_degrau_y], [T.escape_haste_topo_r, T.escape_altura], [0, T.escape_altura]],
  });
  formas.push({
    nome: 'bocal', forma: 'lathe', material: 'cinzaEscuro', lados: 8, eixo: 'y', em: [T.bocal_x, T.capo_topo_y, T.bocal_z],
    perfil: [[0, 0], [T.bocal_base_r, 0], [T.bocal_degrau_r, T.bocal_degrau_y], [T.bocal_pescoco_r, T.bocal_degrau_y], [T.bocal_topo_r, T.bocal_altura], [0, T.bocal_altura]],
  });

  /* engate de trás: o contrapeso de planta chanfrada atrás da base da cabine e a barra de tração octogonal atrás do chassi */
  formas.push({
    nome: 'contrapeso', forma: 'planta', material: 'cinza', y0: T.chassi_topo_y, altura: T.contrapeso_y1 - T.chassi_topo_y,
    planta: [[-T.contrapeso_meia_largura, T.chassi_tras_z], [T.contrapeso_meia_largura, T.chassi_tras_z], [T.contrapeso_meia_largura, T.contrapeso_quina_z],
      [T.contrapeso_fundo_meia_largura, T.contrapeso_z1], [-T.contrapeso_fundo_meia_largura, T.contrapeso_z1], [-T.contrapeso_meia_largura, T.contrapeso_quina_z]],
  });
  formas.push({
    nome: 'barraTracao', forma: 'frontal', material: 'claro', z0: T.barra_tracao_z1, z1: T.chassi_tras_z,
    frontal: chanfrado(T.barra_tracao_meia_largura, T.barra_tracao_y0, T.barra_tracao_y1, T.barra_tracao_chanfro),
  });

  /* gancho da frente: o octógono sai do chassi pela frente inclinada, e o perfil lateral usa o mesmo plano inclinado do chassi */
  formas.push({
    nome: 'ganchoFrente', forma: 'vistas', material: 'claro',
    lado: [[T.chassi_frente_base_z, T.gancho_y0], [T.gancho_z1, T.gancho_y0], [zSlant(T.gancho_y1), T.gancho_y1], [T.chassi_frente_base_z, T.chassi_base_y]],
    frontal: chanfrado(T.barra_tracao_meia_largura, T.gancho_y0, T.gancho_y1, T.barra_tracao_chanfro),
  });
  return formas;
}

/* ---------- passos ---------- */

const emMetro = (v) => v.map(m);
const perfilM = (pontos) => pontos.map(([u, v]) => [m(u), m(v)]);

/* Os passos de uma forma, com os ids do bloco `base`: a forma leva base + 1 (e base + 2 na seção das vistas) e a interseção, base + 10. */
function passosDaForma(f, base) {
  const passos = [];
  let sel;
  if (f.forma === 'vistas') {
    const L = 1400;
    const Cz = 2200;
    passos.push(['extrusao', { origemId: base + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilM(perfilLateral(semColineares(f.lado))) }]);
    passos.push(['extrusao', { origemId: base + 2, eixo: 'z', altura: m(2 * Cz), em: [0, 0, m(-Cz)], perfil: perfilM(secaoFrontal(f.frontal)) }]);
    passos.push(['intersectar', { origemId: base + 10, solidos: [{ origem: { op: 'extrusao', id: base + 1 } }, { origem: { op: 'extrusao', id: base + 2 } }] }]);
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
    passos.push(['lathe', { origemId: base + 1, eixo: f.eixo, perfil: perfilM(f.perfil), lados: f.lados, em: emMetro(f.em), ...(f.fechar ? { furos: [] } : {}) }]);
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

const LADOS = ['Dir', 'Esq'];
const PONTAS = ['Frente', 'Tras'];
const c = (a, b, motivo) => ({ par: [a, b], motivo });

export const CONTATOS = [
  /* espinha: chassi, base da cabine e capô, de 936 mm de largura, assentados uns nos outros */
  c('baseCabine', 'chassi', 'a face de baixo da base da cabine, em y 831, assenta no topo do chassi, em toda a largura de 936 mm'),
  c('capo', 'chassi', 'a face de baixo do capô, em y 831, assenta no topo do chassi, de z 319 a 1661'),
  c('grade', 'chassi', 'a face de baixo do painel claro da frente, em y 831, assenta no topo do chassi, de z 1661 a 1701'),
  c('baseCabine', 'capo', 'a face de trás do capô e a face da frente da base da cabine são o mesmo plano, em z 319'),
  c('capo', 'grade', 'a face de trás do painel claro e a face da frente do capô são o mesmo plano, em z 1661'),
  c('capo', 'capoTopo', 'a face de baixo do tampo branco, em y 1522, assenta no topo do capô, na largura de 936 mm'),
  c('capoTopo', 'grade', 'a face de baixo do tampo branco, em y 1522, assenta no topo do painel claro da frente'),
  c('baseCabine', 'capoTopo', 'a face de trás do tampo branco, em z 319, encosta na face da frente da base da cabine, de y 1522 a 1599'),
  c('farolDir', 'grade', 'a face de trás do farol direito encosta na face da frente do painel claro, em z 1701'),
  c('farolEsq', 'grade', 'a face de trás do farol esquerdo encosta na face da frente do painel claro, em z 1701'),
  c('capoTopo', 'escapamento', 'a base do escapamento assenta no tampo do capô, em y 1599'),
  c('capoTopo', 'bocal', 'a base do bocal assenta no tampo do capô, em y 1599'),
  c('baseCabine', 'contrapeso', 'a face da frente do contrapeso encosta na face de trás da base da cabine, em z -1231'),
  c('chassi', 'contrapeso', 'a face de baixo do contrapeso, em y 831, assenta no topo do chassi'),
  c('barraTracao', 'chassi', 'a face da frente da barra de tração encosta na face de trás do chassi, em z -1231'),
  c('chassi', 'ganchoFrente', 'o gancho sai da face da frente inclinada do chassi e usa o mesmo plano inclinado'),

  /* cabine: o centro assenta na base, os flancos no topo dos flancos da base, e o teto sobre os três */
  c('baseCabine', 'cabineCentro', 'a face de baixo do centro da cabine, em y 1599, assenta no topo da base, de x -468 a 468'),
  c('cabineCentro', 'capoTopo', 'o pé da frente da cabine, em z 319 e y 1599, toca a quina de trás do tampo do capô, só pela aresta'),
  ...LADOS.flatMap((l) => [
    c(`flancoBase${l}`, `flancoCabine${l}`, 'a face de baixo do flanco da cabine, em y 1599, assenta no topo do flanco da base, do arco a z 319'),
    c('baseCabine', `flancoBase${l}`, 'a face de fora da base da cabine, em x 468 ou -468, encosta na face de dentro do flanco'),
    c('baseCabine', `flancoCabine${l}`, 'a aresta de cima da base, em x 468 ou -468 e y 1599, toca o canto de baixo do flanco da cabine, só pela aresta'),
    c('cabineCentro', `flancoCabine${l}`, 'a face de fora do centro da cabine, em x 468 ou -468, encosta na face de dentro do flanco da cabine'),
    c('cabineCentro', `flancoBase${l}`, 'a aresta de baixo do centro da cabine, em x 468 ou -468 e y 1599, toca o canto de cima do flanco da base, só pela aresta'),
    c('capo', `flancoBase${l}`, 'a aresta da frente do flanco da base, em x 468 ou -468 e z 319, toca a lateral do capô, só pela aresta'),
    c('capoTopo', `flancoBase${l}`, 'a aresta da frente do flanco da base, em x 468 ou -468 e z 319, toca a quina de trás do tampo, só pela aresta'),
    c('chassi', `flancoBase${l}`, 'a aresta de baixo do flanco da base, em x 468 ou -468 e y 831, toca a quina de cima do chassi, só pela aresta'),
    c(`flancoCabine${l}`, 'teto', 'a face de cima do flanco da cabine, em y 2674, sustenta o teto branco'),
    c(`flancoCabine${l}`, 'vidroTraseiro', 'a face da frente do vidro de trás encosta na face de trás do flanco da cabine, em z -1231'),
    c(`espelho${l}`, `flancoBase${l}`, 'a face de dentro do retrovisor, em x 775 ou -775, encosta na lateral do flanco da base, de y 1446 a 1599'),
    c(`espelho${l}`, `flancoCabine${l}`, 'o canto de baixo do flanco da cabine, em x 775 ou -775 e y 1599, toca a face de dentro do retrovisor, só pela aresta'),
    c(`flancoCabine${l}`, 'parabrisa', 'a face de trás do para-brisa é o mesmo plano da face inclinada da frente do flanco da cabine'),
    c(`flancoCabine${l}`, `vidroLateral${l}`, 'a face de dentro do vidro lateral é o mesmo plano da lateral inclinada do flanco da cabine'),
  ]),
  c('cabineCentro', 'teto', 'a face de cima do centro da cabine, em y 2674, sustenta o teto branco'),
  c('cabineCentro', 'parabrisa', 'a face de trás do para-brisa é o mesmo plano da face inclinada da frente do centro da cabine'),
  c('cabineCentro', 'vidroTraseiro', 'a face da frente do vidro de trás encosta na face de trás do centro da cabine, em z -1231'),
  ...['sirenaAzul', 'sirenaPreta', 'sirenaVermelha'].map((n) => c('teto', n, 'a base da lente da sirene assenta no teto plano, em y 2828')),
  c('sirenaAzul', 'sirenaPreta', 'a face de dentro da lente azul encosta na face da lente preta, em x -255'),
  c('sirenaPreta', 'sirenaVermelha', 'a face de dentro da lente vermelha encosta na face da lente preta, em x 255'),

  /* anel do para-lama traseiro: o raio de dentro é o do pneu, e o arco de fora é o recorte do flanco e do vidro */
  ...LADOS.flatMap((l) => [
    c(`paraLamaTras${l}`, `rodaTras${l}`, 'o raio de dentro do anel é o do pneu: as facetas do anel e as da banda do pneu são os mesmos planos'),
    c(`paraLamaTras${l}`, `flancoBase${l}`, 'o arco de fora e a face da ponta do anel são os mesmos planos do perfil do flanco da base'),
    c(`paraLamaTras${l}`, `flancoCabine${l}`, 'o arco de fora do anel e o arco do perfil do flanco da cabine são os mesmos planos'),
    c(`paraLamaTras${l}`, `vidroLateral${l}`, 'o arco de fora do anel e o arco do canto de baixo do vidro lateral são os mesmos planos'),
    c('baseCabine', `paraLamaTras${l}`, 'a face de dentro do anel, em x 468 ou -468, encosta na lateral da base da cabine'),
    c('cabineCentro', `paraLamaTras${l}`, 'a face de dentro do anel, em x 468 ou -468, encosta na lateral do centro da cabine'),
    c(`flancoBase${l}`, `rodaTras${l}`, 'o arco do flanco abaixo da ponta do anel é o polígono do pneu: as facetas da banda coincidem'),
  ]),

  /* rodas: a face de dentro do pneu encosta na espinha; aro e cubo assentam no rebaixo do pneu */
  ...LADOS.flatMap((l) => [
    c('baseCabine', `rodaTras${l}`, 'a face de dentro do pneu traseiro, em x 468 ou -468, encosta na lateral da base da cabine'),
    c('cabineCentro', `rodaTras${l}`, 'a face de dentro do pneu traseiro, em x 468 ou -468, encosta na lateral do centro da cabine, de y 1599 a 1718'),
    c('chassi', `rodaTras${l}`, 'a face de dentro do pneu traseiro, em x 468 ou -468, encosta na lateral do chassi'),
    c('chassi', `rodaFrente${l}`, 'a face de dentro do pneu dianteiro, em x 468 ou -468, encosta na lateral do chassi'),
    c('capo', `rodaFrente${l}`, 'a face de dentro do pneu dianteiro, em x 468 ou -468, encosta na lateral do capô'),
    c('chassi', `paraLamaFrente${l}`, 'o pé do suporte dianteiro, de y 583 a 831, encosta na lateral do chassi, em x 468 ou -468'),
    c('capo', `paraLamaFrente${l}`, 'a placa do suporte dianteiro, de y 831 a 873, encosta na lateral do capô, em x 468 ou -468'),
    c(`paraLamaFrente${l}`, `rodaFrente${l}`, 'a face de baixo da placa do suporte, em y 1150, toca o topo do pneu dianteiro, só pela aresta'),
    c(`cuboTras${l}`, `rodaTras${l}`, 'a base do cubo assenta no piso do rebaixo do pneu, em x 1030 ou -1030'),
    ...PONTAS.map((p) => c(`aro${p}${l}`, `roda${p}${l}`, 'o aro assenta no piso e na parede do rebaixo do pneu, em y e x iguais aos do aro')),
  ]),

  /* defensa dianteira: barra, postes, braços, travessa e luzes de ponta */
  ...LADOS.flatMap((l) => [
    c('defensaBarra', `posteDefensa${l}`, 'a base do poste, em y 700, assenta na face de cima da barra baixa'),
    c(`bracoDefensa${l}`, 'grade', 'a face de trás do braço encosta na face da frente do painel claro do capô, em z 1701'),
    c(`bracoDefensa${l}`, `posteDefensa${l}`, 'a face da frente do braço encosta na face de trás do poste, em z 1855'),
    c('travessaDefensa', `posteDefensa${l}`, 'a ponta da travessa encosta na face de dentro do poste, em x 353 ou -353'),
  ]),
  c('bracoDefensaEsq', 'luzDefensaAzul', 'o canto de trás da luz azul, em x -530 e z 1855, toca o canto da frente do braço esquerdo, só pela aresta'),
  c('bracoDefensaDir', 'luzDefensaVermelha', 'o canto de trás da luz vermelha, em x 530 e z 1855, toca o canto da frente do braço direito, só pela aresta'),
  c('luzDefensaAzul', 'posteDefensaEsq', 'a face de dentro da luz azul encosta na face de fora do poste esquerdo, em x -530'),
  c('luzDefensaVermelha', 'posteDefensaDir', 'a face de dentro da luz vermelha encosta na face de fora do poste direito, em x 530'),
];

/* ---------- pontos declarados ---------- */

export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  return [
    { nome: 'canto da frente, embaixo, da barra baixa da defensa', parte: 'defensaBarra', medida: 'maximo', em: [T.barra_meia_largura, T.barra_y1, T.barra_z1], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da barra de sirene', parte: 'sirenaVermelha', medida: 'maximo', em: [T.sirene_base_meia_largura, T.sirene_topo_y, T.sirene_z1], toleranciaMm: tol },
    { nome: 'canto de trás, embaixo, da barra de sirene', parte: 'sirenaAzul', medida: 'minimo', em: [-T.sirene_base_meia_largura, T.teto_topo_y, T.sirene_z0], toleranciaMm: tol },
    { nome: 'canto de trás do teto, em cima', parte: 'teto', medida: 'minimo', em: [-T.teto_meia_largura, T.teto_base_y, T.teto_tras_z], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo e atrás', parte: 'rodaTrasEsq', medida: 'minimo', em: [-T.rt_x_fora, 0, T.rt_z - T.rt_raio], toleranciaMm: tol },
    { nome: 'pneu de trás, à direita, em cima', parte: 'rodaTrasDir', medida: 'maximo', em: [T.rt_x_fora, 2 * T.rt_raio, T.rt_z + T.rt_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente e em cima', parte: 'rodaFrenteDir', medida: 'maximo', em: [T.rf_x_fora, 2 * T.rf_raio, T.rf_z + T.rf_raio], toleranciaMm: tol },
    { nome: 'pneu da frente, à esquerda, embaixo e atrás', parte: 'rodaFrenteEsq', medida: 'minimo', em: [-T.rf_x_fora, 0, T.rf_z - T.rf_raio], toleranciaMm: tol },
    { nome: 'cume do para-lama traseiro direito', parte: 'paraLamaTrasDir', medida: 'maximo', em: [T.rt_x_fora, T.rt_raio + T.pl_tras_raio_ext, T.rt_z + T.pl_tras_raio_ext * Math.cos(Math.PI / 12)], toleranciaMm: tol },
    { nome: 'canto de cima do escapamento, na caixa da parte', parte: 'escapamento', medida: 'maximo', em: [T.escape_x + T.escape_base_r, T.capo_topo_y + T.escape_altura, T.escape_z + T.escape_base_r], toleranciaMm: tol },
    { nome: 'canto de trás, embaixo, do contrapeso', parte: 'contrapeso', medida: 'minimo', em: [-T.contrapeso_meia_largura, T.chassi_topo_y, T.contrapeso_z1], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'espelhoDir', medida: 'maximo', em: [T.espelho_x1, T.espelho_y1, T.capo_tras_z], toleranciaMm: tol },
  ];
}

/* As partes prometidas pelo plano, uma entrada por parte de `derivar`, com o mesmo nome. */
function PARTES_DO_PLANO() {
  const D = {
    chassi: ['espinha cinza escura de 936 mm de largura, de y 371 a 831 e z -1231 a 1701, com a frente inclinada até z 1548 embaixo', 'extrusao com eixo x do perfil lateral inclinado na frente'],
    capo: ['caixa cinza de 936 mm de largura, de y 831 a 1522 e z 319 a 1661, o capô estreito e longo', 'cubo assentado no chassi'],
    grade: ['painel claro de 936 por 691 por 40 mm na frente do capô, de z 1661 a 1701', 'cubo encostado na frente do capô'],
    capoTopo: ['tampo branco do capô, de z 319 a 1701, com a seção chanfrada de 936 a 782 mm de largura entre y 1522 e 1599', 'extrusao com eixo z da seção chanfrada'],
    farolDir: ['faixa de vidro azul claro de 154 por 307 por 12 mm na frente do capô, de x 161 a 315 e y 1139 a 1446', 'cubo encostado na frente do painel'],
    farolEsq: ['faixa de vidro azul claro de 154 por 307 por 12 mm na frente do capô, de x -315 a -161 e y 1139 a 1446', 'cubo encostado na frente do painel'],
    baseCabine: ['bloco cinza de 936 mm de largura, de y 831 a 1599 e z -1231 a 319, sob a cabine e entre as rodas de trás', 'cubo assentado no chassi'],
    flancoBaseDir: ['flanco de 307 mm, de x 468 a 775, de y 831 a 1599 e z até 319, com o arco do anel e da roda de trás recortado no perfil', 'extrusao com eixo x do perfil com arco'],
    flancoBaseEsq: ['flanco de 307 mm, de x -775 a -468, de y 831 a 1599 e z até 319, com o arco do anel e da roda de trás recortado no perfil', 'extrusao com eixo x do perfil com arco'],
    cabineCentro: ['centro da cabine de 936 mm de largura, de y 1599 a 2674, com a frente inclinada de z 319 a 12 e a traseira vertical em z -1231', 'intersecao do perfil lateral extrudado em x com a seção retangular extrudada em z'],
    flancoCabineDir: ['flanco direito da cabine, de x 468 até a lateral que afunila de 775 a 622 mm, sem o canto de baixo que o anel ocupa', 'intersecao do perfil lateral com arco extrudado em x com a seção trapezoidal extrudada em z'],
    flancoCabineEsq: ['flanco esquerdo da cabine, de x -468 até a lateral que afunila de -775 a -622 mm, sem o canto de baixo que o anel ocupa', 'intersecao do perfil lateral com arco extrudado em x com a seção trapezoidal extrudada em z'],
    parabrisa: ['placa de vidro azul clara de 12 mm sobre a face inclinada da frente da cabine, de 1198 mm de largura embaixo a 976 em cima, de y 1747 a 2526', 'intersecao da faixa lateral paralela à face extrudada em x com o trapézio frontal extrudado em z'],
    vidroTraseiro: ['placa de vidro azul clara de 12 mm sobre a face de trás da cabine, de y 2000 a 2505, de 1094 a 950 mm de largura', 'extrusao com eixo z do trapézio'],
    vidroLateralDir: ['janela direita em placa de vidro de 12 mm sobre a lateral inclinada da cabine, de z -1060 a -8, com a frente em duas rampas e o canto de trás recortado pelo anel', 'intersecao do polígono lateral extrudado em x com a casca frontal inclinada extrudada em z'],
    vidroLateralEsq: ['janela esquerda em placa de vidro de 12 mm sobre a lateral inclinada da cabine, de z -1060 a -8, com a frente em duas rampas e o canto de trás recortado pelo anel', 'intersecao do polígono lateral extrudado em x com a casca frontal inclinada extrudada em z'],
    teto: ['teto branco saliente de 1398 mm de largura, de y 2674 a 2828 e z -1385 a 166, com a quina da frente chanfrada', 'extrusao com eixo x do perfil lateral'],
    sirenaAzul: ['lente azul da barra de sirene, de x -618 a -255 na base e -528 no topo, y 2828 a 3004 e z -441 a -88', 'extrusao com eixo z da seção trapezoidal'],
    sirenaPreta: ['lente preta central da barra de sirene, de x -255 a 255, y 2828 a 3004 e z -441 a -88', 'extrusao com eixo z da seção retangular'],
    sirenaVermelha: ['lente vermelha da barra de sirene, de x 255 a 618 na base e 528 no topo, y 2828 a 3004 e z -441 a -88', 'extrusao com eixo z da seção trapezoidal'],
    espelhoDir: ['placa clara de 243 por 389 por 134 mm, de x 775 a 1018 e y 1446 a 1835, no canto da frente da base da cabine', 'cubo encostado no flanco'],
    espelhoEsq: ['placa clara de 243 por 389 por 134 mm, de x -1018 a -775 e y 1446 a 1835, no canto da frente da base da cabine', 'cubo encostado no flanco'],
    paraLamaTrasDir: ['anel cinza em arco de 15 a 120 graus sobre a roda de trás, de 927,5 a 1082,5 mm de raio e de x 468 a 1184', 'extrusao com eixo x do anel em arco'],
    paraLamaTrasEsq: ['anel cinza em arco de 15 a 120 graus sobre a roda de trás, de 927,5 a 1082,5 mm de raio e de x -1184 a -468', 'extrusao com eixo x do anel em arco'],
    paraLamaFrenteDir: ['suporte cinza dobrado de 499 mm de largura, de x 468 a 967, com a placa sobre o pneu da frente em y 1150 a 1303 e o pé que desce até y 583', 'extrusao com eixo x do perfil dobrado'],
    paraLamaFrenteEsq: ['suporte cinza dobrado de 499 mm de largura, de x -967 a -468, com a placa sobre o pneu da frente em y 1150 a 1303 e o pé que desce até y 583', 'extrusao com eixo x do perfil dobrado'],
    defensaBarra: ['barra baixa escura de 1766 mm de largura, y 478 a 700 e z 1855 a 2031, com as pontas da planta curvas de 176 mm de raio', 'extrusao com eixo y da planta de pontas curvas'],
    posteDefensaDir: ['poste escuro de 177 mm de espessura, de x 353 a 530, y 700 a 1230 e z 1855 a 2031, com a quina de cima da frente chanfrada', 'extrusao com eixo x do perfil lateral chanfrado'],
    posteDefensaEsq: ['poste escuro de 177 mm de espessura, de x -530 a -353, y 700 a 1230 e z 1855 a 2031, com a quina de cima da frente chanfrada', 'extrusao com eixo x do perfil lateral chanfrado'],
    bracoDefensaDir: ['braço escuro de 177 por 176 mm ligando o poste direito à frente do capô, de z 1701 a 1855 e y 877 a 1053', 'cubo entre o capô e o poste'],
    bracoDefensaEsq: ['braço escuro de 177 por 176 mm ligando o poste esquerdo à frente do capô, de z 1701 a 1855 e y 877 a 1053', 'cubo entre o capô e o poste'],
    travessaDefensa: ['travessa escura de 706 por 176 por 85 mm entre os postes, de y 877 a 1053 e z 1900 a 1985', 'cubo entre os postes'],
    luzDefensaAzul: ['luz azul de ponta da defensa, de x -706 a -530, y 877 a 1053 e z 1855 a 2031, com a frente inclinada', 'extrusao com eixo y da planta com a quina da frente chanfrada'],
    luzDefensaVermelha: ['luz vermelha de ponta da defensa, de x 530 a 706, y 877 a 1053 e z 1855 a 2031, com a frente inclinada', 'extrusao com eixo y da planta com a quina da frente chanfrada'],
    escapamento: ['escapamento vertical de oito lados em y 1599 a 2151, sobre base em degrau de 266 mm, em x -199 e z 564', 'lathe em torno de y com perfil de degrau'],
    bocal: ['bocal de oito lados em três degraus, de y 1599 a 1753, de 204 mm na base, em x 230 e z 1469', 'lathe em torno de y com perfil de degraus'],
    contrapeso: ['bloco cinza de planta chanfrada de 768 mm de largura, de y 831 a 1139 e z -1538 a -1231, atrás da base da cabine', 'extrusao com eixo y da planta chanfrada'],
    barraTracao: ['barra clara octogonal de 538 por 269 por 77 mm, de y 409 a 678 e z -1308 a -1231, atrás do chassi', 'extrusao com eixo z do octógono'],
    ganchoFrente: ['gancho claro octogonal de 538 mm de largura, de y 332 a 601, que sai da frente inclinada do chassi até z 1625', 'intersecao do octógono extrudado em z com o perfil lateral inclinado extrudado em x'],
  };
  const roda = (ponta, lado, diam, larg, ext) => [`pneu escuro de ${diam} mm de diâmetro e ${larg} mm de largura, com chanfro, banda e ${ext}, ${ponta === 'Frente' ? 'da frente' : 'de trás'} ${lado === 'Dir' ? 'à direita' : 'à esquerda'}`, 'lathe em torno de x, de 24 lados, com o chanfro e o rebaixo no perfil'];
  for (const l of LADOS) {
    D[`rodaFrente${l}`] = roda('Frente', l, '1150', '528', 'rebaixo do aro de 191 mm');
    D[`rodaTras${l}`] = roda('Tras', l, '1855', '716', 'rebaixo do aro de 154 mm');
    D[`aroFrente${l}`] = [`aro cinza no rebaixo do pneu da frente ${l === 'Dir' ? 'à direita' : 'à esquerda'}, de 312 a 632 mm de diâmetro e 191 mm de fundo`, 'lathe em torno de x do anel, com a parede cônica no perfil'];
    D[`aroTras${l}`] = [`aro cinza no rebaixo do pneu de trás ${l === 'Dir' ? 'à direita' : 'à esquerda'}, de 792 a 1240 mm de diâmetro e 154 mm de fundo`, 'lathe em torno de x do anel, com a parede cônica no perfil'];
    D[`cuboTras${l}`] = [`cubo claro cônico no fundo do rebaixo do pneu de trás ${l === 'Dir' ? 'à direita' : 'à esquerda'}, de 484 a 376 mm de diâmetro`, 'lathe em torno de x do perfil cônico'];
  }
  const nomes = derivar(TABELA).map((f) => f.nome);
  return nomes.map((nome) => {
    if (!D[nome]) throw new Error(`PLANO sem descrição para a parte ${nome}`);
    return { nome, forma: D[nome][0], tecnica: D[nome][1] };
  });
}

const receita = {
  meta: { nome: 'trator-sirene', desc: 'trator de brinquedo da viatura, de capô branco, cabine de vidro com teto saliente e barra de sirene azul, preta e vermelha, rodas traseiras grandes e defensa dianteira com luzes azul e vermelha' },
  PARAMS: TABELA,
  MATERIAIS: {
    cinza: { tipo: 'liso', cor: '#6f7185' },
    cinzaEscuro: { tipo: 'liso', cor: '#4f5163' },
    claro: { tipo: 'liso', cor: '#d3d3e3' },
    branco: { tipo: 'liso', cor: '#eeeef5' },
    vidro: { tipo: 'liso', cor: '#c3dcec' },
    azul: { tipo: 'liso', cor: '#4d63cf' },
    preto: { tipo: 'liso', cor: '#3f3f4b' },
    vermelho: { tipo: 'liso', cor: '#ee543f' },
    defensa: { tipo: 'liso', cor: '#62647a' },
    pneu: { tipo: 'liso', cor: '#2e2e36' },
    aro: { tipo: 'metal', cor: '#7a7d93', acabamento: 'escovado' },
    cubo: { tipo: 'liso', cor: '#c4c4da' },
  },
  TOPO: { origem: 'chão, no meio do trator em x e em z (centro da caixa); y para cima e a frente do trator em +z' },
  PLANO: {
    objeto: 'trator estilizado de 4062 mm de comprimento, 2368 mm de largura e 3004 mm de altura, de capô branco, cabine de vidro com barra de sirene, rodas traseiras grandes e defensa dianteira',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do trator, de z -2031 a 2031', milimetros: 4062 },
    familia: 'veiculo',
    partes: PARTES_DO_PLANO(),
    criteriosDeReprovacao: [
      'a caixa total não fica em x -1184 a 1184, y 0 a 3004 e z -2031 a 2031, ou alguma roda não toca o chão',
      'um lado do trator difere do outro em medida ou posição de peça simétrica',
      'as rodas de trás não têm quase o dobro do diâmetro das da frente (1856 contra 1150 mm), ou ficam escondidas em caixa de roda em vez de inteiras para fora',
      'a cabine tem largura constante, e não afunila de 1550 mm na base a 1244 mm no topo, ou não tem teto branco saliente sobre ela',
      'a barra de sirene não assenta no teto com as lentes azul, preta e vermelha da esquerda para a direita',
      'o para-lama traseiro não é um anel em arco sobre a roda, ou o dianteiro não é o suporte dobrado que desce até a espinha',
      'o capô não é estreito, branco no tampo, com o escapamento vertical e o bocal sobre ele',
      'a defensa dianteira não tem barra baixa de pontas curvas, dois postes, travessa e as luzes azul e vermelha nas pontas',
      'a silhueta lateral, frontal ou de cima difere da referência, vista na folha comparativa, em mais de dois por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
