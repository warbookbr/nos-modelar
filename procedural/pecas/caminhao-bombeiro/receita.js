/* caminhao-bombeiro — caminhão de bombeiros estilizado: cabine vermelha curta e baixa na frente, com para-brisa e vidro lateral azul
 * claros, faróis amarelos, teto cinza com barra de luzes azul e frente cinza de para-choque alto; atrás da cabine, a carroceria
 * vermelha, mais larga e mais alta, com três compartimentos laterais de persiana em cada lado, teto com painel elevado entre duas
 * hastes cinza (a escada) e uma barra de luzes azul na ponta de trás. As rodas têm pneu escuro e aro cinza. Sem texto nem marca: só
 * cores, a escada e as luzes.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "firetruck" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/firetruck.glb, que o git ignora. O que entra
 * aqui são as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765) e as vistas (referencias/fonte-vistas.png).
 * O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do caminhão em +z, x para a direita de quem olha de frente, centrado
 * em x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve, por parte, a
 * forma e a `parte` com o `material`. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita: o perfil lateral (z, y) é extrudado em x (eixo 'x': [u, v] vai para y = -u e z = v), a seção frontal (x, y)
 * em z (eixo 'z': [u, v] vai para x = u e y = -v) e a planta (x, z) em y (eixo 'y': [u, v] vai para x = u e z = v). A carroceria é a
 * interseção do perfil lateral com a planta de quinas de trás chanfradas, menos seis caixas de corte que abrem os compartimentos, e
 * cada persiana é uma seção em dente de serra extrudada em z dentro do compartimento. Os arcos das rodas da frente e de trás são
 * recortados no próprio perfil lateral, sem booleana, e cada roda tem uma caixa de roda escura entre as faces de dentro dos pneus.
 */

export const TABELA = {
  lados: 32,
  passos_arco: 16,

  // rodas: eixo em y = 530, pneu de 1060 mm de diâmetro e 530 mm de largura, face de dentro em x 706
  roda_raio: 530,
  roda_largura: 530,
  roda_x_dentro: 706,
  roda_z_frente: 1694,
  roda_z_tras: -1165,
  aro_raio: 270,
  aro_espessura: 30,
  folga_anel: 15,
  anel_raio: 690,

  // largura da carroceria e dos trilhos: 2648 mm; a cabine tem 2294 mm
  meia_largura: 1324,
  cab_meia_largura: 1147,

  // trilho cinza escuro: a faixa de baixo, de y 353 ao eixo das rodas, só entre as rodas
  chassi_base_y: 353,
  chassi_topo_y: 530,

  // carroceria: de z 701 a -2912, de y 530 a 2824, quinas de trás chanfradas; barra de trás de y 530 a 706
  bau_z_frente: 701,
  bau_z_tras: -2912,
  bau_base_y: 530,
  bau_topo_y: 2824,
  bau_chanfro_x: 89,
  bau_chanfro_z: 88,
  tras_barra_y1: 706,
  // a carroceria sai em três trechos, partidos nos pilares entre os compartimentos, para a face lateral não ganhar triângulos longos
  bau_corte1_z: -389,
  bau_corte2_z: -1389,

  // nariz cinza, na frente da roda da frente: de y 353 a 706, quinas da frente chanfradas
  nariz_y1: 706,
  nariz_z_lado: 2559,
  nariz_x_chanfro: 1272,
  nariz_z_chanfro: 2684,
  nariz_z_ponta: 2736,

  // saia cinza da cabine, de y 530 a 1387, e a face da frente dela em z 2559
  saia_cab_topo_y: 1387,
  saia_cab_z_frente: 2559,

  // cabine vermelha: frente inclinada de z 2511 (y 1387) a 2394 (y 2557), quina de cima chanfrada a 45 graus, teto em y 2635
  cab_frente_base_z: 2511,
  cab_frente_topo_y: 2557,
  cab_frente_topo_z: 2394,
  cab_topo_y: 2635,
  cab_chanfro: 78,
  teto_cab_espessura: 12,
  teto_cab_meia_largura: 971,
  teto_cab_z1: 2215,

  // para-brisa e faróis: placas de 12 mm sobre a frente inclinada da cabine
  vidro_espessura: 12,
  parabrisa_meia_largura: 971,
  parabrisa_y0: 1747,
  parabrisa_y1: 2463,
  farol_x0: 618,
  farol_x1: 971,
  farol_y1: 1579,

  // vidro lateral da cabine: placa de 10 mm em x 1147
  vidro_lado_espessura: 10,
  vidro_lado_z_frente_base: 2330,
  vidro_lado_z_frente_topo: 2290,
  vidro_lado_z_tras: 1660,
  vidro_lado_y0: 1750,
  vidro_lado_y1: 2488,

  // retrovisores vermelhos e pilares vermelhos ao lado da grade
  retrovisor_x1: 1324,
  retrovisor_y0: 1387,
  retrovisor_y1: 1916,
  retrovisor_z0: 2335,
  retrovisor_z1: 2461,
  pilar_x0: 971,
  pilar_y0: 883,
  pilar_espessura: 12,

  // barras de luzes: o centro cinza tem meia-largura de 396 mm e cada ponta azul vai a 971 mm na base e 881 em cima
  barra_meio_x: 396,
  barra_base_x: 971,
  barra_topo_x: 881,
  barra_altura: 177,
  giroflex_cab_z0: 1686,
  giroflex_cab_z1: 2039,
  giroflex_tras_z0: -2736,
  giroflex_tras_z1: -2383,

  // teto da carroceria: painel elevado entre as duas hastes da escada
  painel_meia_largura: 618,
  painel_z_frente_base: 701,
  painel_z_frente_topo: 524,
  painel_z_tras_topo: -1770,
  painel_z_tras_base: -1947,
  painel_topo_y: 3001,
  escada_x0: 794,
  escada_x1: 971,
  escada_z_frente: 524,
  escada_z_chanfro: 436,
  escada_y_chanfro: 2912,
  escada_z_tras: -2123,

  // compartimentos laterais: fundo em x 1147; o primeiro tem quatro persianas, os outros dois têm três
  comp_x_fundo: 1147,
  comp_y1: 2647,
  comp1_z0: -300,
  comp1_z1: 524,
  comp1_y0: 706,
  comp1_linhas: 4,
  comp2_z0: -1301,
  comp2_z1: -477,
  comp3_z0: -2301,
  comp3_z1: -1477,
  comp23_y0: 1387,
  comp23_linhas: 3,
  persiana_vale_x: 1170,
  persiana_vale_alt_x: 1175,
  persiana_pico_x: 1235,

  // estribo cinza atrás da roda da frente, de x 1147 a 1324
  estribo_y1: 883,

  // para-choque da frente: viga baixa de y 484 a 706, viga alta de y 706 a 1059 e postes até y 1236
  para_choque_y0: 484,
  para_choque_meia_larg: 1059,
  para_choque_x_chanfro: 1007,
  para_choque_z_chanfro: 2861,
  para_choque_x_ponta: 883,
  para_choque_z1: 2912,
  alto_y1: 1059,
  alto_meia_larg: 883,
  alto_z1: 2736,
  poste_x0: 530,
  poste_x1: 706,
  poste_y1: 1236,
  poste_z_frente_baixo: 2912,
  poste_z_frente_topo: 2868,

  // placas octogonais de 618 mm, chanfro de 88 mm
  placa_meia_larg: 309,
  placa_chanfro: 88,
  placa_frente_y0: 485,
  placa_frente_y1: 794,
  placa_frente_z1: 3001,
  placa_tras_y0: 376,
  placa_tras_y1: 685,
  placa_tras_z0: -3001,
};

const m = (mm) => mm / 1000;
const r9 = (v) => Math.round(v * 1e9) / 1e9;

const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);

/* Tira os pontos repetidos e os colineares do contorno: vértice sem dobra vira triângulo sem área no exportador. */
function limpar(pontos) {
  let p = pontos.map(([a, b]) => [r9(a), r9(b)]);
  for (;;) {
    const n = p.length;
    let achou = -1;
    for (let i = 0; i < n && achou < 0; i += 1) {
      const a = p[(i + n - 1) % n]; const b = p[i]; const c = p[(i + 1) % n];
      const igual = Math.abs(b[0] - a[0]) < 1e-7 && Math.abs(b[1] - a[1]) < 1e-7;
      const cruz = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (igual || Math.abs(cruz) < 1e-6) achou = i;
    }
    if (achou < 0) return p;
    p = p.filter((_, i) => i !== achou);
  }
}

/* Prismas em milímetro. `perfil` já está no plano [u, v] do núcleo, em sentido anti-horário, com `altura` e `em` na unidade do eixo. */
const prismaX = (zy, x0, x1) => ({ eixo: 'x', perfil: antihorario(limpar(zy).map(([z, y]) => [-y, z])), altura: x1 - x0, em: [x0, 0, 0] });
const prismaZ = (xy, z0, z1) => ({ eixo: 'z', perfil: antihorario(limpar(xy).map(([x, y]) => [x, -y])), altura: z1 - z0, em: [0, 0, z0] });
const prismaY = (xz, y0, y1) => ({ eixo: 'y', perfil: antihorario(limpar(xz).map(([x, z]) => [x, z])), altura: y1 - y0, em: [0, y0, 0] });

const solido = (nome, material, ...prismas) => ({ tipo: prismas.length > 1 ? 'intersecao' : 'extrusao', nome, material, prismas });
const cubo = (nome, material, [x0, x1], [y0, y1], [z0, z1]) => ({
  tipo: 'cubo', nome, material, larg: x1 - x0, alt: y1 - y0, prof: z1 - z0, em: [(x0 + x1) / 2, y0, (z0 + z1) / 2],
});
const cilindro = (nome, material, raio, altura, lados, em) => ({ tipo: 'cilindro', nome, material, raio, altura, lados, em });

/* Meio círculo poligonal de n lados por meia volta, da direita (ângulo 0) para a esquerda (ângulo pi), em volta de (zc, yc). */
function semicirculo(zc, yc, R, n) {
  const v = [];
  for (let k = 0; k <= n; k += 1) {
    const a = (Math.PI * k) / n;
    v.push([r9(zc + R * Math.cos(a)), k === 0 || k === n ? yc : r9(yc + R * Math.sin(a))]);
  }
  return v;
}

/* Meio círculo poligonal cortado em y = yCorte só do lado da frente (ângulos de 0 a pi/2), com o pé de trás inteiro, da direita para a esquerda. */
function semicirculoCortadoNaFrente(zc, yc, R, n, yCorte) {
  const v = semicirculo(zc, yc, R, n);
  const saida = [];
  for (let i = 0; i < n; i += 1) {
    const a = v[i]; const b = v[i + 1];
    if (i < n / 2) {
      if (i === 0 && a[1] >= yCorte) saida.push(a);
      if (a[1] < yCorte && b[1] >= yCorte) saida.push([r9(a[0] + ((yCorte - a[1]) * (b[0] - a[0])) / (b[1] - a[1])), yCorte]);
      if (b[1] >= yCorte) saida.push(b);
    } else saida.push(b);
  }
  return saida;
}

/* Normal externa, unitária, de uma reta do perfil (z, y) que sobe para trás: aponta para a frente (+z). */
const normalFrente = ([z0, y0], [z1, y1]) => {
  const dz = z1 - z0; const dy = y1 - y0; const L = Math.hypot(dz, dy);
  return [Math.abs(dy) / L, (dz < 0 ? Math.abs(dz) : -Math.abs(dz)) / L];
};

/* Caixas, perfis e cilindros em milímetro. Cada forma tem `nome`, `tipo` (cubo, extrusao, intersecao, subtracao ou cilindro),
 * `material` e as medidas dela. Todo número aqui sai da tabela. */
export function derivar(T) {
  const W = T.meia_largura;
  const WC = T.cab_meia_largura;
  const Ro = T.roda_raio;
  const yEixo = Ro;
  const R1 = Ro + T.folga_anel;
  const R2 = T.anel_raio;
  const zF = T.roda_z_frente;
  const zT = T.roda_z_tras;
  const N = T.passos_arco;
  const LX = W + 100;
  const ZZ = 3000;
  const yTopoSaiaTras = yEixo + R2;
  const xi = T.roda_x_dentro;
  const formas = [];

  /* trilho do meio, entre os vãos das rodas, e a barra de trás, com as quinas de trás chanfradas como as da carroceria */
  formas.push(cubo('chassiMeio', 'cinzaEscuro', [-W, W], [T.chassi_base_y, T.chassi_topo_y], [zT + R1, zF - R1]));
  const cx = T.bau_chanfro_x; const cz = T.bau_chanfro_z;
  const plantaTras = [
    [W, ZZ], [W, T.bau_z_tras + cz], [W - cx, T.bau_z_tras], [-(W - cx), T.bau_z_tras], [-W, T.bau_z_tras + cz], [-W, ZZ],
  ];
  formas.push(solido('chassiTras', 'cinzaEscuro',
    prismaX([[zT - R2, T.bau_base_y], [zT - R2, T.tras_barra_y1], [T.bau_z_tras, T.tras_barra_y1], [T.bau_z_tras, T.bau_base_y]], -LX, LX),
    prismaY(plantaTras, 300, 3300)));

  /* nariz: bloco cinza de y 353 a 706 na frente da roda da frente, com as quinas chanfradas */
  formas.push(solido('narizFrente', 'cinzaEscuro', prismaY([
    [-W, zF + R1], [W, zF + R1], [W, T.nariz_z_lado], [T.nariz_x_chanfro, T.nariz_z_chanfro], [WC, T.nariz_z_ponta],
    [-WC, T.nariz_z_ponta], [-T.nariz_x_chanfro, T.nariz_z_chanfro], [-W, T.nariz_z_lado],
  ], T.chassi_base_y, T.nariz_y1)));

  /* saia cinza da cabine: perfil lateral com o arco da roda da frente recortado, de z 701 à face da frente em z 2559 */
  const arcoFrente = semicirculo(zF, yEixo, R1, N);
  formas.push(solido('saiaCabine', 'cinzaEscuro', prismaX([
    [T.bau_z_frente, T.bau_base_y], [zF - R1, yEixo], ...[...arcoFrente].reverse(), [zF + R1, T.nariz_y1],
    [T.saia_cab_z_frente, T.nariz_y1], [T.saia_cab_z_frente, T.saia_cab_topo_y], [T.bau_z_frente, T.saia_cab_topo_y],
  ], -WC, WC)));

  /* saia cinza de trás: retângulo em volta da roda de trás menos o arco, de lado a lado; a carroceria vermelha tem o mesmo retângulo recortado */
  const arcoTras = semicirculo(zT, yEixo, R1, N);
  formas.push(solido('saiaTras', 'cinzaEscuro', prismaX([
    [zT - R2, yEixo], [zT - R2, yTopoSaiaTras], [zT + R2, yTopoSaiaTras], [zT + R2, yEixo], [zT + R1, yEixo], ...arcoTras, [zT - R2, yEixo],
  ], -W, W)));

  /* estribos cinza ao lado das saias, atrás do para-lama da frente */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const xs = s > 0 ? [WC, W] : [-W, -WC];
    formas.push(cubo(`estribo${lado}`, 'cinzaEscuro', xs, [T.chassi_topo_y, T.estribo_y1], [T.bau_z_frente, zF - R2]));
  }

  /* para-lamas da frente: meia coroa de 545 a 690 mm de raio, de x 1147 a 1324, com o pé da frente sobre o nariz (y 706) */
  const coroa = (zc, yFrente) => [...semicirculoCortadoNaFrente(zc, yEixo, R2, N, yFrente), ...semicirculoCortadoNaFrente(zc, yEixo, R1, N, yFrente).reverse()];
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const [x0, x1] = s > 0 ? [WC, W] : [-W, -WC];
    formas.push(solido(`paraLamaFrente${lado}`, 'cinzaEscuro', prismaX(coroa(zF, T.nariz_y1), x0, x1)));
  }

  /* caixas de roda: o meio círculo do arco, entre as faces de dentro dos pneus */
  formas.push(solido('caixaRodaFrente', 'preto', prismaX(arcoFrente, -xi, xi)));
  formas.push(solido('caixaRodaTras', 'preto', prismaX(arcoTras, -xi, xi)));

  /* para-choque da frente: viga baixa chanfrada, viga alta atrás dela, dois postes e a placa */
  formas.push(solido('paraChoqueFrente', 'cinzaEscuro', prismaY([
    [-T.para_choque_meia_larg, T.nariz_z_ponta], [T.para_choque_meia_larg, T.nariz_z_ponta], [T.para_choque_x_chanfro, T.para_choque_z_chanfro],
    [T.para_choque_x_ponta, T.para_choque_z1], [-T.para_choque_x_ponta, T.para_choque_z1], [-T.para_choque_x_chanfro, T.para_choque_z_chanfro],
  ], T.para_choque_y0, T.nariz_y1)));
  formas.push(cubo('paraChoqueAlto', 'cinzaMedio', [-T.alto_meia_larg, T.alto_meia_larg], [T.nariz_y1, T.alto_y1], [T.saia_cab_z_frente, T.alto_z1]));
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const xs = s > 0 ? [T.poste_x0, T.poste_x1] : [-T.poste_x1, -T.poste_x0];
    formas.push(solido(`poste${lado}`, 'cinzaMedio', prismaX([
      [T.alto_z1, T.nariz_y1], [T.poste_z_frente_baixo, T.nariz_y1], [T.poste_z_frente_baixo, T.alto_y1], [T.poste_z_frente_topo, T.poste_y1], [T.alto_z1, T.poste_y1],
    ], xs[0], xs[1])));
  }
  const octogono = (y0, y1) => {
    const a = T.placa_meia_larg; const c = T.placa_chanfro;
    return [[-(a - c), y0], [a - c, y0], [a, y0 + c], [a, y1 - c], [a - c, y1], [-(a - c), y1], [-a, y1 - c], [-a, y0 + c]];
  };
  formas.push(solido('placaFrente', 'cinzaClaro', prismaZ(octogono(T.placa_frente_y0, T.placa_frente_y1), T.para_choque_z1, T.placa_frente_z1)));
  formas.push(solido('placaTras', 'cinzaClaro', prismaZ(octogono(T.placa_tras_y0, T.placa_tras_y1), T.placa_tras_z0, T.bau_z_tras)));

  /* cabine vermelha: perfil lateral da frente inclinada, com a quina de cima chanfrada; o teto cinza é uma placa por cima */
  const pA = [T.cab_frente_base_z, T.saia_cab_topo_y];
  const pB = [T.cab_frente_topo_z, T.cab_frente_topo_y];
  const pC = [T.cab_frente_topo_z - T.cab_chanfro, T.cab_topo_y];
  formas.push(solido('cabine', 'vermelho', prismaX([
    [T.bau_z_frente, T.saia_cab_topo_y], pA, pB, pC, [T.bau_z_frente, T.cab_topo_y],
  ], -WC, WC)));
  formas.push(cubo('tetoCabine', 'cinzaMedio', [-T.teto_cab_meia_largura, T.teto_cab_meia_largura],
    [T.cab_topo_y, T.cab_topo_y + T.teto_cab_espessura], [T.bau_z_frente, T.teto_cab_z1]));

  /* para-brisa e faróis: lâminas de 12 mm sobre a frente inclinada, recortadas pelo retângulo de cada um */
  const nF = normalFrente(pA, pB);
  const esp = T.vidro_espessura;
  const lamina = [pA, pB, [pB[0] + esp * nF[0], pB[1] + esp * nF[1]], [pA[0] + esp * nF[0], pA[1] + esp * nF[1]]];
  const retangulo = (x0, x1, y0, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
  formas.push(solido('parabrisa', 'vidro', prismaX(lamina, -LX, LX),
    prismaZ(retangulo(-T.parabrisa_meia_largura, T.parabrisa_meia_largura, T.parabrisa_y0, T.parabrisa_y1), -ZZ, ZZ)));
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const [x0, x1] = s > 0 ? [T.farol_x0, T.farol_x1] : [-T.farol_x1, -T.farol_x0];
    formas.push(solido(`farol${lado}`, 'amarelo', prismaX(lamina, -LX, LX), prismaZ(retangulo(x0, x1, T.saia_cab_topo_y, T.farol_y1), -ZZ, ZZ)));
  }

  /* vidro lateral da cabine: placa de 10 mm sobre a lateral; retrovisores e pilares vermelhos */
  const contornoVidroLado = [
    [T.vidro_lado_z_frente_base, T.vidro_lado_y0], [T.vidro_lado_z_tras, T.vidro_lado_y0], [T.vidro_lado_z_tras, T.vidro_lado_y1],
    [T.vidro_lado_z_frente_topo, T.vidro_lado_y1],
  ];
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const x0 = s > 0 ? WC : -(WC + T.vidro_lado_espessura);
    formas.push(solido(`vidroCabine${lado}`, 'vidro', prismaX(contornoVidroLado, x0, x0 + T.vidro_lado_espessura)));
    const xr = s > 0 ? [WC, T.retrovisor_x1] : [-T.retrovisor_x1, -WC];
    formas.push(cubo(`retrovisor${lado}`, 'vermelho', xr, [T.retrovisor_y0, T.retrovisor_y1], [T.retrovisor_z0, T.retrovisor_z1]));
    const xp = s > 0 ? [T.pilar_x0, WC] : [-WC, -T.pilar_x0];
    formas.push(cubo(`pilarFrente${lado}`, 'vermelho', xp, [T.pilar_y0, T.saia_cab_topo_y],
      [T.saia_cab_z_frente, T.saia_cab_z_frente + T.pilar_espessura]));
  }

  /* barras de luzes: centro cinza e duas pontas azuis em trapézio, uma no teto da cabine e uma na ponta de trás da carroceria */
  const barra = (sufixo, y0, z0, z1) => {
    const y1 = y0 + T.barra_altura;
    formas.push(cubo(`giroflex${sufixo}Meio`, 'cinzaMedio', [-T.barra_meio_x, T.barra_meio_x], [y0, y1], [z0, z1]));
    for (const s of [1, -1]) {
      const ponta = [[T.barra_meio_x, y0], [T.barra_base_x, y0], [T.barra_topo_x, y1], [T.barra_meio_x, y1]].map(([x, y]) => [s * x, y]);
      formas.push(solido(`giroflex${sufixo}${s > 0 ? 'Dir' : 'Esq'}`, 'azul', prismaZ(ponta, z0, z1)));
    }
  };
  barra('Cabine', T.cab_topo_y + T.teto_cab_espessura, T.giroflex_cab_z0, T.giroflex_cab_z1);

  /* carroceria: perfil lateral com o retângulo da saia de trás recortado e planta de quinas de trás chanfradas, em três trechos
     partidos nos pilares entre os compartimentos; cada trecho tem o seu compartimento aberto por caixas de corte de x 1147 para fora */
  const compartimentos = [
    { id: 'Frente', z0: T.comp1_z0, z1: T.comp1_z1, y0: T.comp1_y0, linhas: T.comp1_linhas },
    { id: 'Meio', z0: T.comp2_z0, z1: T.comp2_z1, y0: T.comp23_y0, linhas: T.comp23_linhas },
    { id: 'Tras', z0: T.comp3_z0, z1: T.comp3_z1, y0: T.comp23_y0, linhas: T.comp23_linhas },
  ];
  const zA = T.bau_corte1_z; const zB = T.bau_corte2_z;
  const perfisBau = {
    Frente: [[T.bau_z_frente, T.bau_base_y], [zA, T.bau_base_y], [zA, T.bau_topo_y], [T.bau_z_frente, T.bau_topo_y]],
    Meio: [[zA, T.bau_base_y], [zT + R2, T.bau_base_y], [zT + R2, yTopoSaiaTras], [zB, yTopoSaiaTras], [zB, T.bau_topo_y], [zA, T.bau_topo_y]],
    Tras: [[zB, yTopoSaiaTras], [zT - R2, yTopoSaiaTras], [zT - R2, T.tras_barra_y1], [T.bau_z_tras, T.tras_barra_y1], [T.bau_z_tras, T.bau_topo_y], [zB, T.bau_topo_y]],
  };
  for (const cp of compartimentos) {
    const cortes = [];
    for (const s of [1, -1]) {
      const xs = s > 0 ? [T.comp_x_fundo, LX] : [-LX, -T.comp_x_fundo];
      cortes.push({ larg: xs[1] - xs[0], alt: T.comp_y1 - cp.y0, prof: cp.z1 - cp.z0, em: [(xs[0] + xs[1]) / 2, cp.y0, (cp.z0 + cp.z1) / 2] });
    }
    formas.push({
      tipo: 'subtracao',
      nome: `bau${cp.id}`,
      material: 'vermelho',
      prismas: [prismaX(perfisBau[cp.id], -LX, LX), prismaY(plantaTras, 300, 3300)],
      cortes,
    });
  }

  /* persianas: seção em dente de serra (x, y) extrudada em z dentro de cada compartimento, com o fundo da base em x 1147 */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    for (const c of compartimentos) {
      const passo = (T.comp_y1 - c.y0) / c.linhas;
      const vale = (k) => (k % 2 === 0 ? T.persiana_vale_x : T.persiana_vale_alt_x);
      const lado1 = [[T.comp_x_fundo, c.y0], [vale(0), c.y0]];
      for (let k = 0; k < c.linhas; k += 1) {
        lado1.push([T.persiana_pico_x, c.y0 + passo * (k + 0.5)]);
        lado1.push([vale(k + 1), c.y0 + passo * (k + 1)]);
      }
      lado1.push([T.comp_x_fundo, T.comp_y1]);
      formas.push(solido(`persiana${c.id}${lado}`, 'persiana', prismaZ(lado1.map(([x, y]) => [s * x, y]), c.z0, c.z1)));
    }
  }

  /* teto da carroceria: painel elevado entre as duas hastes da escada */
  formas.push(solido('painelTeto', 'vermelho', prismaX([
    [T.painel_z_frente_base, T.bau_topo_y], [T.painel_z_frente_topo, T.painel_topo_y], [T.painel_z_tras_topo, T.painel_topo_y], [T.painel_z_tras_base, T.bau_topo_y],
  ], -T.painel_meia_largura, T.painel_meia_largura)));
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const [x0, x1] = s > 0 ? [T.escada_x0, T.escada_x1] : [-T.escada_x1, -T.escada_x0];
    formas.push(solido(`escada${lado}`, 'cinzaMedio', prismaX([
      [T.escada_z_frente, T.bau_topo_y], [T.escada_z_frente, T.escada_y_chanfro], [T.escada_z_chanfro, T.painel_topo_y],
      [T.escada_z_tras, T.painel_topo_y], [T.escada_z_tras, T.bau_topo_y],
    ], x0, x1)));
  }
  barra('Tras', T.bau_topo_y, T.giroflex_tras_z0, T.giroflex_tras_z1);

  /* rodas: pneu e aro */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    for (const [ponta, zc] of [['Frente', zF], ['Tras', zT]]) {
      const xp = s > 0 ? T.roda_x_dentro : -(T.roda_x_dentro + T.roda_largura);
      formas.push(cilindro(`roda${ponta}${lado}`, 'pneu', Ro, T.roda_largura, T.lados, [xp, yEixo, zc]));
      const xa = s > 0 ? T.roda_x_dentro + T.roda_largura : -(T.roda_x_dentro + T.roda_largura + T.aro_espessura);
      formas.push(cilindro(`aro${ponta}${lado}`, 'aro', T.aro_raio, T.aro_espessura, T.lados, [xa, yEixo, zc]));
    }
  }

  return formas;
}

/* Passo de um prisma: o `origemId` dado, perfil em metro. */
function passoDoPrisma(p, id) {
  return ['extrusao', { origemId: id, eixo: p.eixo, altura: m(p.altura), perfil: p.perfil.map(([u, v]) => [m(u), m(v)]), em: p.em.map((v) => m(v)) }];
}
const passoDoCubo = (f, id) => ['cubo', { origemId: id, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: f.em.map((v) => m(v)) }];

/* Os ids de bloco: a forma `k` leva 100 * (k + 1); os prismas dela levam os ids seguintes, a interseção leva o 50º, os cortes o 60º em
   diante e a subtração o 90º. */
function blocos(T) {
  return derivar(T).map((f, k) => ({ f, base: 100 * (k + 1) }));
}

/* Um cilindro inteiro é a lateral mais as duas tampas. */
const cilindroInteiro = (id) => ({
  unir: [
    { origem: { op: 'cilindro', id } },
    { origem: { op: 'cilindro', id, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id, tampa: 'topo' } },
  ],
});

export const ALIASES = blocos(TABELA).filter(({ f }) => f.tipo === 'cilindro').map(({ f, base }) => [`${f.nome}Inteiro`, cilindroInteiro(base)]);

/** Os PASSOS: cada forma e, logo depois, a `parte` com o `material`. */
export function gerarPassos(T) {
  const passos = [];
  blocos(T).forEach(({ f, base }) => {
    let sel;
    if (f.tipo === 'cubo') {
      passos.push(passoDoCubo(f, base));
      sel = { origem: { op: 'cubo', id: base } };
    } else if (f.tipo === 'cilindro') {
      passos.push(['cilindro', { origemId: base, raio: m(f.raio), altura: m(f.altura), lados: f.lados, eixo: 'x', em: f.em.map((v) => m(v)) }]);
      sel = { alias: `${f.nome}Inteiro` };
    } else if (f.tipo === 'extrusao') {
      passos.push(passoDoPrisma(f.prismas[0], base));
      sel = { origem: { op: 'extrusao', id: base } };
    } else {
      f.prismas.forEach((p, i) => passos.push(passoDoPrisma(p, base + 1 + i)));
      passos.push(['intersectar', { origemId: base + 50, solidos: f.prismas.map((_, i) => ({ origem: { op: 'extrusao', id: base + 1 + i } })) }]);
      sel = { origem: { op: 'intersectar', id: base + 50 } };
      if (f.tipo === 'subtracao') {
        f.cortes.forEach((c, j) => passos.push(passoDoCubo(c, base + 60 + j)));
        passos.push(['subtrair', {
          origemId: base + 90,
          solidos: [{ origem: { op: 'intersectar', id: base + 50 } }, ...f.cortes.map((_, j) => ({ origem: { op: 'cubo', id: base + 60 + j } }))],
        }]);
        sel = { origem: { op: 'subtrair', id: base + 90 } };
      }
    }
    passos.push(['parte', { nome: f.nome, sel }]);
    passos.push(['material', { sel, usa: f.material }]);
  });
  return passos;
}

const DE = ['Dir', 'Esq'];
const PERSIANAS = ['Frente', 'Meio', 'Tras'];
const c = (a, b, motivo) => ({ par: [a, b], motivo });

/* Os contatos: cada par se toca pela face indicada no motivo. As medidas são as da TABELA, em milímetro. */
function contatosDeclarados() {
  const sem = [
    c('chassiMeio', 'saiaCabine', 'a face de cima do trilho do meio, em y 530, sustenta a saia da cabine entre o baú e a roda da frente'),
    c('chassiMeio', 'bauFrente', 'a face de cima do trilho do meio, em y 530, sustenta o fundo do trecho da frente da carroceria, de z -389 a 701'),
    c('chassiMeio', 'bauMeio', 'a face de cima do trilho do meio, em y 530, sustenta o fundo do trecho do meio da carroceria, de z -475 a -389'),
    c('chassiMeio', 'saiaTras', 'a face de cima do trilho do meio, em y 530, sustenta a saia de trás, de z -620 a -475'),
    c('chassiTras', 'saiaTras', 'a face da frente da barra de trás, em z -1855, encosta na face de trás da saia de trás, de y 530 a 706'),
    c('chassiTras', 'bauTras', 'a face de cima da barra de trás, em y 706, sustenta o fundo do trecho de trás da carroceria'),
    c('chassiTras', 'placaTras', 'a face de trás da barra, em z -2912, encosta na placa de trás'),
    c('narizFrente', 'saiaCabine', 'a face de cima do nariz, em y 706, sustenta a saia da cabine, de z 2239 a 2559'),
    c('narizFrente', 'paraChoqueFrente', 'a face da frente do nariz, em z 2736, encosta na face de trás da viga baixa do para-choque'),
    c('narizFrente', 'paraChoqueAlto', 'a face de cima do nariz, em y 706, sustenta a viga alta, de z 2559 a 2736'),
    c('saiaCabine', 'caixaRodaFrente', 'o arco da saia e o arco da caixa da roda saem dos mesmos pontos do círculo de 545 mm'),
    c('saiaCabine', 'cabine', 'a face de cima da saia, em y 1387, sustenta a cabine vermelha'),
    c('saiaCabine', 'bauFrente', 'a face de trás da saia, em z 701, encosta na face da frente da carroceria'),
    c('saiaCabine', 'paraChoqueAlto', 'a face da frente da saia, em z 2559, encosta na face de trás da viga alta do para-choque'),
    c('saiaTras', 'bauMeio', 'o retângulo da saia de trás e o recorte do trecho do meio são o mesmo, de z -1389 a -475 e y 530 a 1220'),
    c('saiaTras', 'bauTras', 'o retângulo da saia de trás e o recorte do trecho de trás são o mesmo, de z -1855 a -1389 e y 530 a 1220'),
    c('bauFrente', 'bauMeio', 'a face de trás do trecho da frente, em z -389, encosta na face da frente do trecho do meio, com o mesmo contorno'),
    c('bauMeio', 'bauTras', 'a face de trás do trecho do meio, em z -1389, encosta na face da frente do trecho de trás, de y 1220 a 2824'),
    c('saiaTras', 'caixaRodaTras', 'o arco da saia e o arco da caixa da roda saem dos mesmos pontos do círculo de 545 mm'),
    c('bauFrente', 'cabine', 'a face da frente da carroceria, em z 701, encosta na face de trás da cabine'),
    c('cabine', 'tetoCabine', 'a face de cima da cabine, em y 2635, sustenta a placa cinza do teto'),
    c('cabine', 'parabrisa', 'a face de trás do para-brisa encosta na face inclinada da frente da cabine, sem folga'),
    c('bauFrente', 'painelTeto', 'a face de cima do trecho da frente, em y 2824, sustenta o painel elevado do teto'),
    c('bauMeio', 'painelTeto', 'a face de cima do trecho do meio, em y 2824, sustenta o painel elevado do teto'),
    c('bauTras', 'painelTeto', 'a face de cima do trecho de trás, em y 2824, sustenta o painel elevado do teto'),
    c('tetoCabine', 'giroflexCabineMeio', 'a face de cima do teto da cabine, em y 2647, sustenta o centro da barra de luzes'),
    c('bauTras', 'giroflexTrasMeio', 'a face de cima da carroceria, em y 2824, sustenta o centro da barra de luzes de trás'),
    c('chassiMeio', 'caixaRodaTras', 'a ponta de baixo da caixa da roda de trás encosta na aresta do trilho do meio, em z -620 e y 530'),
    c('bauFrente', 'tetoCabine', 'a face da frente da carroceria, em z 701, encosta na face de trás da placa cinza do teto da cabine, de y 2635 a 2647'),
    c('caixaRodaFrente', 'chassiMeio', 'a ponta de trás da caixa da roda da frente, em z 1149 e y 530, toca a aresta da frente do trilho do meio'),
    c('caixaRodaFrente', 'narizFrente', 'a ponta da frente da caixa da roda da frente, em z 2239 e y 530, toca a aresta de trás do nariz'),
    c('paraChoqueFrente', 'paraChoqueAlto', 'a face de cima da viga baixa, em y 706, sustenta a viga alta'),
    c('paraChoqueFrente', 'placaFrente', 'a face da frente da viga baixa, em z 2912, encosta na placa da frente'),
  ];
  for (const lado of DE) {
    sem.push(c('chassiMeio', `estribo${lado}`, 'a face de cima do trilho do meio, em y 530, sustenta o estribo, de z 701 a 1004'));
    sem.push(c('chassiMeio', `paraLamaFrente${lado}`, 'a face de cima do trilho do meio, em y 530, sustenta o pé de trás do para-lama da frente'));
    sem.push(c('narizFrente', `paraLamaFrente${lado}`, 'a face de cima do nariz, em y 706, sustenta o pé da frente do para-lama'));
    sem.push(c('saiaCabine', `estribo${lado}`, 'a face de fora da saia, em x 1147, encosta na face de dentro do estribo'));
    sem.push(c('saiaCabine', `paraLamaFrente${lado}`, 'a face de fora da saia, em x 1147, encosta na face de dentro do para-lama da frente'));
    sem.push(c('saiaCabine', `pilarFrente${lado}`, 'a face da frente da saia, em z 2559, encosta na face de trás do pilar vermelho'));
    sem.push(c('bauFrente', `estribo${lado}`, 'a face da frente da carroceria, em z 701, encosta na face de trás do estribo, de x 1147 a 1324'));
    sem.push(c('cabine', `vidroCabine${lado}`, `o vidro lateral ${lado === 'Dir' ? 'direito' : 'esquerdo'} encosta na lateral da cabine, em x 1147, sem folga`));
    sem.push(c('estribo'+lado, 'paraLamaFrente'+lado, 'a aresta da ponta do estribo, em z 1004 e y 530, toca o pé de trás do para-lama da frente'));
    sem.push(c('saiaCabine', `retrovisor${lado}`, 'a aresta de cima da saia, em x 1147 e y 1387, toca a face de baixo do retrovisor'));
    sem.push(c('cabine', `retrovisor${lado}`, 'a face de dentro do retrovisor encosta na lateral da cabine, em x 1147'));
    sem.push(c('cabine', `farol${lado}`, 'a face de trás do farol encosta na face inclinada da frente da cabine, sem folga'));
    sem.push(c('saiaCabine', `farol${lado}`, 'a face de cima da saia, em y 1387, sustenta a aresta de baixo do farol'));
    sem.push(c('paraChoqueAlto', `poste${lado}`, 'a face da frente do bloco alto, em z 2736, encosta na face de trás do poste, de x 530 a 706'));
    sem.push(c('paraChoqueFrente', `poste${lado}`, 'a face de cima da viga baixa, em y 706, sustenta o poste, de z 2736 a 2912'));
    sem.push(c('narizFrente', `poste${lado}`, 'a aresta de baixo da face de trás do poste, em z 2736 e y 706, toca a aresta de cima da face da frente do nariz'));
    sem.push(c('tetoCabine', `giroflexCabine${lado}`, 'a face de baixo da ponta azul assenta no teto cinza da cabine, em y 2647'));
    sem.push(c('bauTras', `giroflexTras${lado}`, 'a face de baixo da ponta azul assenta no teto da carroceria, em y 2824'));
    for (const t of ['Frente', 'Meio', 'Tras']) {
      sem.push(c(`bau${t}`, `escada${lado}`, 'a face de baixo da haste da escada assenta no teto da carroceria, em y 2824'));
    }
    for (const s of ['Cabine', 'Tras']) {
      sem.push(c(`giroflex${s}Meio`, `giroflex${s}${lado}`, 'a lateral do centro da barra, em x 396, encosta na ponta azul'));
    }
    for (const p of PERSIANAS) {
      sem.push(c(`bau${p}`, `persiana${p}${lado}`, 'a face de fundo do compartimento, em x 1147, encosta na base da persiana, com o mesmo contorno'));
    }
    for (const ponta of ['Frente', 'Tras']) {
      sem.push(c(`roda${ponta}${lado}`, `caixaRoda${ponta}`, 'a face de dentro do pneu, em x 706, encosta na face de fora da caixa da roda'));
      sem.push(c(`aro${ponta}${lado}`, `roda${ponta}${lado}`, 'a face de dentro do aro encosta na face de fora do pneu, no disco do centro'));
    }
  }
  return sem;
}
export const CONTATOS = contatosDeclarados();

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const yR = T.roda_raio;
  const xFora = T.roda_x_dentro + T.roda_largura;
  const tol = 1;
  return [
    { nome: 'canto de trás, embaixo, da placa de trás', parte: 'placaTras', medida: 'minimo', em: [-T.placa_meia_larg, T.placa_tras_y0, T.placa_tras_z0], toleranciaMm: tol },
    { nome: 'canto da frente, em cima, da placa da frente', parte: 'placaFrente', medida: 'maximo', em: [T.placa_meia_larg, T.placa_frente_y1, T.placa_frente_z1], toleranciaMm: tol },
    { nome: 'topo do painel do teto, na frente', parte: 'painelTeto', medida: 'maximo', em: [T.painel_meia_largura, T.painel_topo_y, T.painel_z_frente_base], toleranciaMm: tol },
    { nome: 'frente de cima da haste direita da escada', parte: 'escadaDir', medida: 'maximo', em: [T.escada_x1, T.painel_topo_y, T.escada_z_frente], toleranciaMm: tol },
    { nome: 'quina da frente, embaixo, da cabine', parte: 'cabine', medida: 'maximo', em: [T.cab_meia_largura, T.cab_topo_y, T.cab_frente_base_z], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.retrovisor_y1, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-xFora, 0, T.roda_z_tras - yR], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente', parte: 'rodaFrenteDir', medida: 'maximo', em: [xFora, 2 * yR, T.roda_z_frente + yR], toleranciaMm: tol },
    { nome: 'quina de trás, embaixo, da carroceria', parte: 'bauTras', medida: 'minimo', em: [-T.meia_largura, T.tras_barra_y1, T.bau_z_tras], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'caminhao-bombeiro', desc: 'caminhão de bombeiros estilizado, de cabine vermelha com teto cinza e barra de luzes azul, carroceria vermelha com persianas laterais, escada no teto e rodas de aro cinza' },
  PARAMS: TABELA,
  MATERIAIS: {
    vermelho: { tipo: 'liso', cor: '#dd5a3c' },
    cinzaEscuro: { tipo: 'liso', cor: '#4a4e5b' },
    cinzaMedio: { tipo: 'liso', cor: '#7b8095' },
    cinzaClaro: { tipo: 'liso', cor: '#c4c7ce' },
    persiana: { tipo: 'liso', cor: '#5d6277' },
    preto: { tipo: 'liso', cor: '#2c2f38' },
    vidro: { tipo: 'liso', cor: '#c3dcef' },
    pneu: { tipo: 'liso', cor: '#1f2125' },
    aro: { tipo: 'metal', cor: '#9aa3b5', acabamento: 'escovado' },
    amarelo: { tipo: 'liso', cor: '#f2c12e' },
    azul: { tipo: 'liso', cor: '#3f6fd8' },
  },
  TOPO: { origem: 'chão, no meio do caminhão em x e em z; y para cima e a frente do caminhão em +z' },
  PLANO: {
    objeto: 'caminhão de bombeiros estilizado de 6002 mm de comprimento, 2648 mm de largura e 3001 mm de altura, com cabine vermelha curta na frente e carroceria vermelha alta atrás',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do caminhão, de z -3001 a 3001', milimetros: 6002 },
    familia: 'veiculo',
    partes: [],
    criteriosDeReprovacao: [
      'o conjunto não mede 6002 mm de comprimento, 2648 mm de largura ou 3001 mm de altura, ou alguma roda não toca o chão',
      'um lado do caminhão difere do outro em medida ou posição de peça simétrica',
      'a cabine e a carroceria saem de um perfil só: a carroceria precisa ser mais larga e mais alta que a cabine, com o degrau visível sobre ela',
      'a carroceria não tem os três compartimentos laterais em cada lado, com persiana em dente de serra recuada em relação à parede',
      'o teto da carroceria não tem o painel elevado entre as duas hastes da escada e a barra de luzes de trás',
      'a cabine não tem o teto cinza com barra de luzes azul, o para-brisa e o vidro lateral azul claros, e os faróis amarelos sobre a grade cinza',
      'uma roda não tem pneu escuro com aro cinza, ou não aparece no arco recortado com a caixa de roda escura atrás',
      'a silhueta lateral, frontal ou de cima não confere com a referência em mais de cinco por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

/* O PLANO lista as partes pelo que `derivar` entrega, com a forma e a técnica de cada uma. */
const FORMA = {
  chassiMeio: ['trilho cinza escuro de 2648 mm de largura, de y 353 a 530, entre os vãos das rodas, de z -620 a 1149', 'cubo sob o fundo da carroceria e a saia da cabine'],
  chassiTras: ['barra cinza escura de y 530 a 706, de z -2912 a -1855, com as quinas de trás chanfradas', 'interseção do perfil lateral com a planta chanfrada'],
  narizFrente: ['bloco cinza escuro de y 353 a 706, de z 2239 a 2736, com as quinas da frente chanfradas', 'extrusao com eixo y da planta do nariz'],
  saiaCabine: ['saia cinza escura da cabine, de 2294 mm de largura, de y 530 a 1387 e de z 701 a 2559, com o arco da roda da frente de 545 mm recortado', 'extrusao com eixo x de perfil lateral com arco recortado, sem booleana'],
  saiaTras: ['saia cinza escura de trás, de 2648 mm de largura, retângulo de z -1855 a -475 e y 530 a 1220 menos o arco de 545 mm da roda', 'extrusao com eixo x de retângulo com arco recortado, sem booleana'],
  caixaRodaFrente: ['vão escuro da roda da frente, de 1412 mm de largura entre as faces de dentro dos pneus, com o contorno do arco de 545 mm', 'extrusao com eixo x de um meio círculo de 16 passos'],
  caixaRodaTras: ['vão escuro da roda de trás, de 1412 mm de largura entre as faces de dentro dos pneus, com o contorno do arco de 545 mm', 'extrusao com eixo x de um meio círculo de 16 passos'],
  paraChoqueFrente: ['viga baixa cinza escura de y 484 a 706, de z 2736 a 2912, de 2118 mm de largura com as quinas chanfradas', 'extrusao com eixo y de uma planta chanfrada'],
  paraChoqueAlto: ['viga alta cinza de 1766 mm de largura, de y 706 a 1059 e de z 2559 a 2824', 'cubo sobre o nariz, na frente da saia'],
  posteDir: ['poste cinza direito de x 530 a 706, de y 1059 a 1236, de z 2780 a 2824', 'cubo sobre a viga alta'],
  posteEsq: ['poste cinza esquerdo de x -706 a -530, de y 1059 a 1236, de z 2780 a 2824', 'cubo sobre a viga alta'],
  placaFrente: ['placa clara octogonal de 618 mm, de y 485 a 794, saindo da viga baixa da frente até z 3001', 'extrusao com eixo z de um octógono'],
  placaTras: ['placa clara octogonal de 618 mm, de y 375 a 684, saindo da barra de trás até z -3001', 'extrusao com eixo z de um octógono'],
  cabine: ['cabine vermelha de 2294 mm de largura, de y 1387 a 2635 e de z 701 a 2511, com frente inclinada e quina de cima chanfrada', 'extrusao com eixo x de perfil lateral'],
  tetoCabine: ['placa cinza de 12 mm sobre a cabine, de 1942 mm de largura, de z 701 a 2215', 'cubo sobre o teto da cabine'],
  parabrisa: ['placa azul clara de 12 mm sobre a frente inclinada da cabine, de 1942 mm de largura e y 1747 a 2463', 'interseção de uma lâmina do perfil lateral com um retângulo frontal'],
  vidroCabineDir: ['placa azul clara de 10 mm sobre a lateral direita da cabine, de z 1660 a 2330 e y 1750 a 2488', 'extrusao com eixo x de um quadrilátero'],
  vidroCabineEsq: ['placa azul clara de 10 mm sobre a lateral esquerda da cabine, de z 1660 a 2330 e y 1750 a 2488', 'extrusao com eixo x de um quadrilátero'],
  farolDir: ['placa amarela direita de 12 mm sobre a frente inclinada da cabine, de x 618 a 971 e y 1387 a 1579', 'interseção de uma lâmina do perfil lateral com um retângulo frontal'],
  farolEsq: ['placa amarela esquerda de 12 mm sobre a frente inclinada da cabine, de x -971 a -618 e y 1387 a 1579', 'interseção de uma lâmina do perfil lateral com um retângulo frontal'],
  retrovisorDir: ['retrovisor vermelho direito, de x 1147 a 1324, de y 1387 a 1916 e de z 2335 a 2461', 'cubo na lateral da cabine'],
  retrovisorEsq: ['retrovisor vermelho esquerdo, de x -1324 a -1147, de y 1387 a 1916 e de z 2335 a 2461', 'cubo na lateral da cabine'],
  pilarFrenteDir: ['pilar vermelho direito de 12 mm sobre a face da frente da saia, de x 971 a 1147 e y 883 a 1387', 'cubo sobre a face da frente da saia'],
  pilarFrenteEsq: ['pilar vermelho esquerdo de 12 mm sobre a face da frente da saia, de x -1147 a -971 e y 883 a 1387', 'cubo sobre a face da frente da saia'],
  giroflexCabineMeio: ['centro cinza da barra de luzes da cabine, de 792 mm de largura, de y 2647 a 2824, de z 1686 a 2039', 'cubo sobre o teto da cabine'],
  giroflexCabineDir: ['ponta azul direita da barra de luzes da cabine, em trapézio de x 396 a 971 embaixo e 881 em cima', 'extrusao com eixo z de um trapézio'],
  giroflexCabineEsq: ['ponta azul esquerda da barra de luzes da cabine, em trapézio de x -396 a -971 embaixo e -881 em cima', 'extrusao com eixo z de um trapézio'],
  bauFrente: ['trecho da frente da carroceria vermelha, de 2648 mm de largura, de y 530 a 2824 e de z 701 a -389, com o compartimento lateral de z -300 a 524 aberto 177 mm', 'interseção do perfil lateral com a planta, menos duas caixas de corte'],
  bauMeio: ['trecho do meio da carroceria vermelha, de 2648 mm de largura, de z -389 a -1389, com a saia de trás recortada e o compartimento lateral de z -1301 a -477 aberto 177 mm', 'interseção do perfil lateral com a planta, menos duas caixas de corte'],
  bauTras: ['trecho de trás da carroceria vermelha, de 2648 mm de largura, de z -1389 a -2912, com quinas de trás chanfradas e o compartimento lateral de z -2301 a -1477 aberto 177 mm', 'interseção do perfil lateral com a planta chanfrada, menos duas caixas de corte'],
  persianaFrenteDir: ['persiana direita do primeiro compartimento, de z -300 a 524 e y 706 a 2647, com quatro dentes de 65 mm', 'extrusao com eixo z de uma seção em dente de serra'],
  persianaFrenteEsq: ['persiana esquerda do primeiro compartimento, de z -300 a 524 e y 706 a 2647, com quatro dentes de 65 mm', 'extrusao com eixo z de uma seção em dente de serra'],
  persianaMeioDir: ['persiana direita do segundo compartimento, de z -1301 a -477 e y 1387 a 2647, com três dentes', 'extrusao com eixo z de uma seção em dente de serra'],
  persianaMeioEsq: ['persiana esquerda do segundo compartimento, de z -1301 a -477 e y 1387 a 2647, com três dentes', 'extrusao com eixo z de uma seção em dente de serra'],
  persianaTrasDir: ['persiana direita do terceiro compartimento, de z -2301 a -1477 e y 1387 a 2647, com três dentes', 'extrusao com eixo z de uma seção em dente de serra'],
  persianaTrasEsq: ['persiana esquerda do terceiro compartimento, de z -2301 a -1477 e y 1387 a 2647, com três dentes', 'extrusao com eixo z de uma seção em dente de serra'],
  painelTeto: ['painel vermelho elevado do teto da carroceria, de 1236 mm de largura, de y 2824 a 3001 e de z 701 a -1947, com as pontas chanfradas', 'extrusao com eixo x de um trapézio'],
  escadaDir: ['haste direita da escada, cinza, de x 794 a 971, de y 2824 a 3001 e de z 524 a -2123, com a ponta da frente chanfrada', 'extrusao com eixo x de perfil lateral'],
  escadaEsq: ['haste esquerda da escada, cinza, de x -971 a -794, de y 2824 a 3001 e de z 524 a -2123, com a ponta da frente chanfrada', 'extrusao com eixo x de perfil lateral'],
  giroflexTrasMeio: ['centro cinza da barra de luzes de trás, de 792 mm de largura, de y 2824 a 3001, de z -2736 a -2383', 'cubo sobre o teto da carroceria'],
  giroflexTrasDir: ['ponta azul direita da barra de luzes de trás, em trapézio de x 396 a 971 embaixo e 881 em cima', 'extrusao com eixo z de um trapézio'],
  giroflexTrasEsq: ['ponta azul esquerda da barra de luzes de trás, em trapézio de x -396 a -971 embaixo e -881 em cima', 'extrusao com eixo z de um trapézio'],
  paraLamaFrenteDir: ['meia coroa cinza escura de 545 a 690 mm de raio em volta da roda da frente direita, de x 1147 a 1324', 'extrusao com eixo x de uma meia coroa de 16 passos'],
  paraLamaFrenteEsq: ['meia coroa cinza escura de 545 a 690 mm de raio em volta da roda da frente esquerda, de x -1324 a -1147', 'extrusao com eixo x de uma meia coroa de 16 passos'],
  estriboDir: ['estribo cinza escuro direito, de x 1147 a 1324, de y 530 a 883 e de z 701 a 1004', 'cubo entre a carroceria e o para-lama'],
  estriboEsq: ['estribo cinza escuro esquerdo, de x -1324 a -1147, de y 530 a 883 e de z 701 a 1004', 'cubo entre a carroceria e o para-lama'],
};
for (const f of derivar(TABELA)) {
  if (f.tipo === 'cilindro') {
    const lado = f.nome.endsWith('Dir') ? 'direita' : 'esquerda';
    const ponta = f.nome.includes('Frente') ? 'da frente' : 'de trás';
    receita.PLANO.partes.push(f.nome.startsWith('roda')
      ? { nome: f.nome, forma: `pneu escuro de 1060 mm de diâmetro e 530 mm de largura, na roda ${ponta} ${lado}`, tecnica: 'cilindro com eixo x, 32 lados' }
      : { nome: f.nome, forma: `disco cinza de 540 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu ${ponta} ${lado}`, tecnica: 'cilindro com eixo x' });
  } else {
    const [forma, tecnica] = FORMA[f.nome];
    receita.PLANO.partes.push({ nome: f.nome, forma, tecnica });
  }
}

export default receita;
