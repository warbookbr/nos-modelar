/* ambulancia — ambulância estilizada: cabine de picape na frente e baú alto, mais largo e mais alto, atrás. O baú é branco com faixa
 * vermelha e faixa cinza, tem janela lateral, teto com painel elevado e duas barras de luzes azuis; a cabine é vermelha, com
 * para-brisa e vidros azul claros e outra barra de luzes no teto; o capô é cinza lavanda, com faróis amarelos e grade escura; as
 * rodas têm pneu escuro e aro cinza. Sem texto nem marca: só cores e as barras de luzes.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "ambulance" do pacote A, de autor A (pacote A, endereço omitido,
 * endereço da página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A
 * malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-a/ambulance.glb, que o git ignora. O que entra
 * aqui são as medidas tiradas dela (referencias/fonte-partes.json, em metro, escala 1,765) e as vistas (referencias/fonte-vistas.png).
 * O que não ficou igual à referência está em referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente da ambulância em +z, x para a direita de quem olha de frente,
 * centrada em x e z. A TABELA é em milímetro e é a única fonte das medidas; `derivar` calcula as formas e `gerarPassos` escreve, por
 * parte, a forma e a `parte` com o `material`. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita: cada volume da carroceria é a INTERSEÇÃO de prismas, e as faces onde duas partes se encontram saem do
 * mesmo plano de corte, sem `unir` e sem booleana de subtração. O perfil lateral (z, y) é extrudado em x (eixo 'x': [u, v] vai
 * para y = -u e z = v), a seção frontal (x, y) é extrudada em z (eixo 'z': [u, v] vai para x = u e y = -v) e a planta (x, z) é
 * extrudada em y (eixo 'y': [u, v] vai para x = u e z = v). A cabine é perfil lateral com seção frontal que afunila para o teto;
 * o baú é perfil lateral com a planta de quinas da frente chanfradas, empilhado em quatro camadas de cor. Os arcos das rodas são
 * recortados no próprio perfil lateral, e cada roda tem uma caixa de roda escura entre as faces de dentro dos dois pneus.
 *
 * Simplificações em relação à fonte, também em referencias/alvo.md: o pneu sai liso, sem chanfro; a janela do baú é uma placa de
 * 10 mm sobre a parede, e não um vão rebaixado; as portas de trás, que a fonte guarda dentro do baú, não existem; a traseira é
 * lisa, porque nenhuma vista da fonte a mostra.
 */

export const TABELA = {
  lados: 32,
  passos_arco: 16,

  // rodas: eixo em y = 530, pneu de 1060 mm de diâmetro e 530 mm de largura, face de dentro em x 530
  roda_raio: 530,
  roda_largura: 530,
  roda_x_dentro: 530,
  roda_z_frente: 1827,
  roda_z_tras: -1562,
  aro_raio: 270,
  aro_espessura: 30,
  folga_anel: 15,
  anel_raio: 690,

  // largura do baú e dos trilhos: 2294 mm
  meia_largura: 1147,

  // trilho cinza escuro: a faixa de baixo, de y 355 ao eixo das rodas, só entre as rodas
  trilho_base_y: 355,
  trilho_topo_y: 530,

  // para-choques: barras de y 530 a 705 que vão do vão da roda à ponta do carro; placas octogonais de 620 mm, chanfro de 90 mm
  para_choque_y0: 530,
  para_choque_y1: 705,
  para_choque_frente_z1: 2780,
  para_choque_tras_z0: -2780,
  placa_meia_larg: 310,
  placa_chanfro: 90,
  placa_frente_y0: 440,
  placa_frente_y1: 750,
  placa_frente_z1: 2868,
  placa_tras_y0: 375,
  placa_tras_y1: 685,
  placa_tras_z0: -2868,

  // nariz, capô e saia da cabine: meia-largura de 970 mm, nariz em z 2690
  cab_meia_largura: 970,
  nariz_z: 2690,
  saia_y0: 530,
  capo_base_y: 885,
  nariz_y: 1145,
  nariz_chanfro_z: 2605,
  nariz_chanfro_y: 1260,
  capo_fim_z: 1985,
  capo_topo_y: 1410,

  // cabine vermelha: da face da frente do baú ao para-brisa, de y 1410 a 2295, afunilando de 970 a 795 de meia-largura
  cab_z_tras: 835,
  cab_topo_y: 2295,
  cab_meia_largura_topo: 795,
  cab_z_frente_topo: 1635,
  parabrisa_y_topo: 2130,
  parabrisa_meia_base: 790,
  parabrisa_meia_topo: 650,
  vidro_espessura: 12,
  vidro_lado_z_frente_base: 1795,
  vidro_lado_z_frente_topo: 1510,
  vidro_lado_y_topo: 2120,

  // baú: de z -2780 a 835, quinas da frente chanfradas, quatro camadas de cor
  bau_z_frente: 835,
  bau_z_tras: -2780,
  bau_chanfro_x: 87,
  bau_chanfro_z: 90,
  bau_degrau_tras_y: 705,
  bau_faixa_cinza_y0: 1410,
  bau_faixa_cinza_y1: 1590,
  bau_faixa_vermelha_y1: 1940,
  bau_topo_y: 2825,

  // teto do baú: painel elevado de y 2825 a 3177, mais estreito em cima, e as barras de luzes nas duas pontas
  painel_z0: -2075,
  painel_z1: 125,
  painel_meia_base: 970,
  painel_meia_topo: 875,
  painel_topo_y: 3177,
  barra_bau_y1: 3000,
  barra_frente_z1: 480,
  barra_tras_z0: -2425,

  // barras de luzes: o centro cinza tem meia-largura de 395 mm e cada ponta azul vai a 705 mm na base e 615 mm em cima
  barra_meio_x: 395,
  barra_base_x: 705,
  barra_topo_x: 615,
  giroflex_cab_z0: 1105,
  giroflex_cab_z1: 1455,
  giroflex_cab_y1: 2470,

  // janela do baú: placa de 10 mm na lateral, com os cantos de cima chanfrados
  janela_z0: -2135,
  janela_z1: -725,
  janela_y0: 1590,
  janela_y1: 2120,
  janela_chanfro: 90,
  janela_espessura: 10,

  // refletores vermelhos: quadrados de 175 mm e 2 mm de espessura, na face da frente do baú e na lateral, perto da traseira
  refletor_x0: 795,
  refletor_x1: 970,
  refletor_y0: 2470,
  refletor_y1: 2645,
  refletor_lado_z0: -2605,
  refletor_lado_z1: -2425,
  refletor_espessura: 2,

  // faróis amarelos e grade escura sobre a face da frente do capô
  grade_y1: 1060,
  grade_meio_x: 485,
  frente_placa_espessura: 12,

  // retrovisores cinza claros: da lateral da cabine a x 1324
  retrovisor_x1: 1324,
  retrovisor_y0: 1235,
  retrovisor_y1: 1587,
  retrovisor_z0: 1410,
  retrovisor_z1: 1585,

  // estribos escuros ao lado dos trilhos, atrás da roda da frente
  estribo_z0: 480,
  estribo_z1: 1295,
  estribo_x1: 1324,
  estribo_y1: 596,
  estribo_y_alto: 728,
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

/* A parte do meio círculo poligonal que fica em y >= yCorte, da direita para a esquerda, com os pontos de corte nas cordas. */
function arcoAcima(zc, yc, R, n, yCorte = yc) {
  const v = semicirculo(zc, yc, R, n);
  const saida = [];
  const corte = ([z0, y0], [z1, y1]) => [r9(z0 + ((yCorte - y0) * (z1 - z0)) / (y1 - y0)), yCorte];
  if (v[0][1] >= yCorte) saida.push(v[0]);
  for (let i = 0; i + 1 < v.length; i += 1) {
    const a = v[i]; const b = v[i + 1];
    if (a[1] < yCorte && b[1] >= yCorte) saida.push(corte(a, b));
    if (b[1] >= yCorte) saida.push(b);
    if (a[1] >= yCorte && b[1] < yCorte) saida.push(corte(a, b));
  }
  return saida;
}

/* Normal externa, unitária, de uma reta que sobe para a frente: a da seção (z, y) ou a do plano lateral (x, y). */
const normalDe = ([a0, b0], [a1, b1]) => {
  const da = a1 - a0; const db = b1 - b0; const L = Math.hypot(da, db);
  return [Math.abs(db) / L, (da < 0 ? Math.abs(da) : -Math.abs(da)) / L];
};

/* Pontos sobre a reta que passa por p0 e p1, na altura y (em v). */
const sobreReta = ([a0, b0], [a1, b1], y) => [a0 + ((y - b0) * (a1 - a0)) / (b1 - b0), y];

/* Caixas, perfis e cilindros em milímetro. Cada forma tem `nome`, `tipo` (cubo, extrusao, intersecao ou cilindro), `material` e as
 * medidas dela. Todo número aqui sai da tabela. */
export function derivar(T) {
  const W = T.meia_largura;
  const Ro = T.roda_raio;
  const yEixo = Ro;
  const R1 = Ro + T.folga_anel;
  const R2 = T.anel_raio;
  const zF = T.roda_z_frente;
  const zT = T.roda_z_tras;
  const N = T.passos_arco;
  const C = T.cab_meia_largura;
  const LX = W + 100;
  const ZZ = 3000;
  /* alturas além da cabine, a um quinto da altura dela acima e abaixo: com a tabela atual (cabine de 1410 a 2295) são 1233 e 2472,
     e nelas a reta inclinada da lateral e a do para-brisa passam por números exatos em milímetro, o que faz a face das placas
     coincidir com a da cabine dentro da tolerância de contato (1e-9 m) */
  const passo = (T.cab_topo_y - T.capo_topo_y) / 5;
  const Y_LONGE_BAIXO = T.capo_topo_y - passo;
  const Y_LONGE_CIMA = T.cab_topo_y + passo;
  const formas = [];

  /* trilho: só entre os vãos das rodas, e os para-choques: barras que vão do vão da roda à ponta, com as placas na ponta */
  formas.push(cubo('chassiMeio', 'cinzaEscuro', [-W, W], [T.trilho_base_y, T.trilho_topo_y], [zT + R1, zF - R1]));
  formas.push(cubo('paraChoqueFrente', 'cinzaEscuro', [-W, W], [T.para_choque_y0, T.para_choque_y1], [zF + R1, T.para_choque_frente_z1]));
  formas.push(cubo('paraChoqueTras', 'cinzaEscuro', [-W, W], [T.para_choque_y0, T.para_choque_y1], [T.para_choque_tras_z0, zT - R2]));
  const octogono = (y0, y1) => {
    const a = T.placa_meia_larg; const c = T.placa_chanfro;
    return [[-(a - c), y0], [a - c, y0], [a, y0 + c], [a, y1 - c], [a - c, y1], [-(a - c), y1], [-a, y1 - c], [-a, y0 + c]];
  };
  formas.push(solido('placaFrente', 'cinzaClaro', prismaZ(octogono(T.placa_frente_y0, T.placa_frente_y1), T.para_choque_frente_z1, T.placa_frente_z1)));
  formas.push(solido('placaTras', 'cinzaClaro', prismaZ(octogono(T.placa_tras_y0, T.placa_tras_y1), T.placa_tras_z0, T.para_choque_tras_z0)));

  /* saia da cabine em dois blocos, antes e depois da roda da frente, e o capô lavanda por cima, com o arco no perfil */
  formas.push(cubo('saiaCabineTras', 'vermelho', [-C, C], [T.saia_y0, T.capo_base_y], [T.cab_z_tras, zF - R1]));
  formas.push(cubo('saiaCabineFrente', 'vermelho', [-C, C], [T.para_choque_y1, T.capo_base_y], [zF + R1, T.nariz_z]));
  const arcoCapo = arcoAcima(zF, yEixo, R1, N, T.capo_base_y);
  formas.push(solido('capo', 'lavanda', prismaX([
    [T.cab_z_tras, T.capo_base_y], ...[...arcoCapo].reverse(), [T.nariz_z, T.capo_base_y], [T.nariz_z, T.nariz_y],
    [T.nariz_chanfro_z, T.nariz_chanfro_y], [T.capo_fim_z, T.capo_topo_y], [T.cab_z_tras, T.capo_topo_y],
  ], -C, C)));

  /* caixas de roda: o vão da frente (retângulo da saia mais o arco do capô) e o da traseira (meio círculo do baú), entre as faces
     de dentro dos pneus */
  const xi = T.roda_x_dentro;
  formas.push(solido('caixaRodaFrente', 'cinzaEscuro', prismaX([
    [zF - R1, yEixo], [zF + R1, yEixo], [zF + R1, T.capo_base_y], ...arcoCapo, [zF - R1, T.capo_base_y],
  ], -xi, xi)));
  const arcoBau = semicirculo(zT, yEixo, R2, N);
  formas.push(solido('caixaRodaTras', 'cinzaEscuro', prismaX(arcoBau, -xi, xi)));

  /* cabine: perfil lateral com seção frontal que afunila de 970 a 795 de meia-largura */
  const larguraEm = (y) => sobreReta([C, T.capo_topo_y], [T.cab_meia_largura_topo, T.cab_topo_y], y)[0];
  const lateralCabine = [[T.cab_z_tras, T.capo_topo_y], [T.capo_fim_z, T.capo_topo_y], [T.cab_z_frente_topo, T.cab_topo_y], [T.cab_z_tras, T.cab_topo_y]];
  const frontalCabine = (y0, y1) => [[-larguraEm(y0), y0], [larguraEm(y0), y0], [larguraEm(y1), y1], [-larguraEm(y1), y1]];
  formas.push(solido('cabine', 'vermelho', prismaX(lateralCabine, -LX, LX), prismaZ(frontalCabine(Y_LONGE_BAIXO, Y_LONGE_CIMA), -ZZ, ZZ)));

  /* para-brisa: placa de 12 mm sobre a face inclinada da frente da cabine, com o contorno em trapézio (790 embaixo, 650 em cima) */
  const pA = [T.capo_fim_z, T.capo_topo_y];
  const pB = [T.cab_z_frente_topo, T.cab_topo_y];
  const nP = normalDe(pA, pB);
  const esp = T.vidro_espessura;
  const lamina = (y0, y1) => {
    const a = sobreReta(pA, pB, y0); const b = sobreReta(pA, pB, y1);
    return [a, b, [b[0] + esp * nP[0], b[1] + esp * nP[1]], [a[0] + esp * nP[0], a[1] + esp * nP[1]]];
  };
  const halfPB = (y) => T.parabrisa_meia_base + ((y - T.capo_topo_y) * (T.parabrisa_meia_topo - T.parabrisa_meia_base)) / (T.parabrisa_y_topo - T.capo_topo_y);
  const trapezioPB = [[-halfPB(T.capo_topo_y), T.capo_topo_y], [halfPB(T.capo_topo_y), T.capo_topo_y], [halfPB(T.parabrisa_y_topo), T.parabrisa_y_topo], [-halfPB(T.parabrisa_y_topo), T.parabrisa_y_topo]];
  formas.push(solido('parabrisa', 'vidro', prismaX(lamina(Y_LONGE_BAIXO, Y_LONGE_CIMA), -LX, LX), prismaZ(trapezioPB, -ZZ, ZZ)));

  /* vidros laterais da cabine: tira de 12 mm sobre a lateral inclinada, recortada pelo contorno do vidro e pelo retrovisor */
  const nL = normalDe([C, T.capo_topo_y], [T.cab_meia_largura_topo, T.cab_topo_y]);
  const tiraLado = (s) => {
    const a = [larguraEm(Y_LONGE_BAIXO), Y_LONGE_BAIXO]; const b = [larguraEm(Y_LONGE_CIMA), Y_LONGE_CIMA];
    return [[s * a[0], a[1]], [s * b[0], b[1]], [s * (b[0] + esp * nL[0]), b[1] + esp * nL[1]], [s * (a[0] + esp * nL[0]), a[1] + esp * nL[1]]];
  };
  const contornoVidroLado = [
    [T.cab_z_tras, T.capo_topo_y], [T.retrovisor_z0, T.capo_topo_y], [T.retrovisor_z0, T.retrovisor_y1], [T.retrovisor_z1, T.retrovisor_y1],
    [T.retrovisor_z1, T.capo_topo_y], [T.vidro_lado_z_frente_base, T.capo_topo_y], [T.vidro_lado_z_frente_topo, T.vidro_lado_y_topo],
    [T.cab_z_tras, T.vidro_lado_y_topo],
  ];
  for (const s of [1, -1]) {
    formas.push(solido(`vidroCabine${s > 0 ? 'Dir' : 'Esq'}`, 'vidro', prismaX(contornoVidroLado, -LX, LX), prismaZ(tiraLado(s), -ZZ, ZZ)));
  }

  /* baú: quatro camadas, cada uma é a interseção do perfil lateral com a planta de quinas chanfradas na frente */
  const cx = T.bau_chanfro_x; const cz = T.bau_chanfro_z;
  const plantaBau = [
    [W, -ZZ], [W, T.bau_z_frente - cz], [W - 2 * cx, T.bau_z_frente + cz], [-(W - 2 * cx), T.bau_z_frente + cz], [-W, T.bau_z_frente - cz], [-W, -ZZ],
  ];
  const plantaPrisma = prismaY(plantaBau, 400, 3400);
  const yBaixo = T.trilho_topo_y;
  const camada = (nome, material, y0, y1) => solido(nome, material,
    prismaX([[T.bau_z_frente, y0], [T.bau_z_frente, y1], [T.bau_z_tras, y1], [T.bau_z_tras, y0]], -LX, LX), plantaPrisma);
  formas.push(solido('bauBase', 'vermelho', prismaX([
    [T.bau_z_frente, yBaixo], ...arcoBau, [zT - R2, T.bau_degrau_tras_y],
    [T.bau_z_tras, T.bau_degrau_tras_y], [T.bau_z_tras, T.bau_faixa_cinza_y0], [T.bau_z_frente, T.bau_faixa_cinza_y0],
  ], -LX, LX), plantaPrisma));
  formas.push(camada('bauFaixaCinza', 'cinzaFaixa', T.bau_faixa_cinza_y0, T.bau_faixa_cinza_y1));
  formas.push(camada('bauFaixaVermelha', 'vermelho', T.bau_faixa_cinza_y1, T.bau_faixa_vermelha_y1));
  formas.push(camada('bauTopo', 'branco', T.bau_faixa_vermelha_y1, T.bau_topo_y));

  /* teto do baú: painel elevado, mais estreito em cima */
  formas.push(solido('tetoBau', 'brancoPainel', prismaZ([
    [-T.painel_meia_base, T.bau_topo_y], [T.painel_meia_base, T.bau_topo_y], [T.painel_meia_topo, T.painel_topo_y], [-T.painel_meia_topo, T.painel_topo_y],
  ], T.painel_z0, T.painel_z1)));

  /* barras de luzes: centro cinza e duas pontas azuis em trapézio, uma na cabine e uma em cada ponta do teto do baú */
  const barra = (sufixo, y0, y1, z0, z1) => {
    formas.push(cubo(`giroflex${sufixo}Meio`, 'cinzaMedio', [-T.barra_meio_x, T.barra_meio_x], [y0, y1], [z0, z1]));
    for (const s of [1, -1]) {
      const ponta = [[T.barra_meio_x, y0], [T.barra_base_x, y0], [T.barra_topo_x, y1], [T.barra_meio_x, y1]].map(([x, y]) => [s * x, y]);
      formas.push(solido(`giroflex${sufixo}${s > 0 ? 'Dir' : 'Esq'}`, 'azul', prismaZ(ponta, z0, z1)));
    }
  };
  barra('Cabine', T.cab_topo_y, T.giroflex_cab_y1, T.giroflex_cab_z0, T.giroflex_cab_z1);
  barra('Frente', T.bau_topo_y, T.barra_bau_y1, T.painel_z1, T.barra_frente_z1);
  barra('Tras', T.bau_topo_y, T.barra_bau_y1, T.barra_tras_z0, T.painel_z0);

  /* janelas do baú: placas de 10 mm sobre a parede, com os cantos de cima chanfrados */
  const jc = T.janela_chanfro;
  const contornoJanela = [
    [T.janela_z0, T.janela_y0], [T.janela_z1, T.janela_y0], [T.janela_z1, T.janela_y1 - jc], [T.janela_z1 - jc, T.janela_y1],
    [T.janela_z0 + jc, T.janela_y1], [T.janela_z0, T.janela_y1 - jc],
  ];
  for (const s of [1, -1]) {
    const x0 = s > 0 ? W : -(W + T.janela_espessura);
    formas.push(solido(`janelaBau${s > 0 ? 'Dir' : 'Esq'}`, 'vidroBau', prismaX(contornoJanela, x0, x0 + T.janela_espessura)));
  }

  /* refletores vermelhos: dois na face da frente do baú, um em cada lateral perto da traseira */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const xs = [s * T.refletor_x0, s * T.refletor_x1].sort((a, b) => a - b);
    formas.push(cubo(`refletorFrente${lado}`, 'vermelho', xs, [T.refletor_y0, T.refletor_y1], [T.bau_z_frente, T.bau_z_frente + T.refletor_espessura]));
    const xl = s > 0 ? [W, W + T.refletor_espessura] : [-(W + T.refletor_espessura), -W];
    formas.push(cubo(`refletorLado${lado}`, 'vermelho', xl, [T.refletor_y0, T.refletor_y1], [T.refletor_lado_z0, T.refletor_lado_z1]));
  }

  /* para-lamas: meia coroa de 545 a 690 mm de raio, de x 970 a 1147; na frente fica ao lado do capô, com o pé da frente sobre a barra do para-choque (y 705), atrás dentro do arco do baú */
  const coroa = (zc, yFrente) => [...semicirculoCortadoNaFrente(zc, yEixo, R2, N, yFrente), ...semicirculoCortadoNaFrente(zc, yEixo, R1, N, yFrente).reverse()];
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    const [x0, x1] = s > 0 ? [C, W] : [-W, -C];
    formas.push(solido(`paraLamaFrente${lado}`, 'cinzaEscuro', prismaX(coroa(zF, T.para_choque_y1), x0, x1)));
    formas.push(solido(`paraLamaTras${lado}`, 'cinzaEscuro', prismaX(coroa(zT, yEixo), x0, x1)));
  }

  /* rodas: pneu, aro e o par de ponta */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    for (const [ponta, zc] of [['Frente', zF], ['Tras', zT]]) {
      const xp = s > 0 ? T.roda_x_dentro : -(T.roda_x_dentro + T.roda_largura);
      formas.push(cilindro(`roda${ponta}${lado}`, 'pneu', Ro, T.roda_largura, T.lados, [xp, yEixo, zc]));
      const xa = s > 0 ? T.roda_x_dentro + T.roda_largura : -(T.roda_x_dentro + T.roda_largura + T.aro_espessura);
      formas.push(cilindro(`aro${ponta}${lado}`, 'aro', T.aro_raio, T.aro_espessura, T.lados, [xa, yEixo, zc]));
    }
  }

  /* estribos e retrovisores */
  for (const s of [1, -1]) {
    const lado = s > 0 ? 'Dir' : 'Esq';
    formas.push(solido(`estribo${lado}`, 'cinzaEscuro', prismaZ([
      [s * W, T.trilho_base_y], [s * T.estribo_x1, T.trilho_base_y], [s * T.estribo_x1, T.estribo_y1], [s * W, T.estribo_y_alto],
    ], T.estribo_z0, T.estribo_z1)));
    formas.push(solido(`retrovisor${lado}`, 'cinzaClaro', prismaZ([
      [s * C, T.retrovisor_y0], [s * T.retrovisor_x1, T.retrovisor_y0], [s * T.retrovisor_x1, T.retrovisor_y1], [s * larguraEm(T.retrovisor_y1), T.retrovisor_y1], [s * C, T.capo_topo_y],
    ], T.retrovisor_z0, T.retrovisor_z1)));
  }

  /* faróis e grade sobre a face da frente do capô: a grade é a placa escura, e cada farol cobre a face vertical e o chanfro */
  const ep = T.frente_placa_espessura;
  const zN = T.nariz_z;
  formas.push(solido('grade', 'cinzaEscuro', prismaZ([[-C, T.capo_base_y], [C, T.capo_base_y], [C, T.grade_y1], [-C, T.grade_y1]], zN, zN + ep)));
  formas.push(solido('gradeMeio', 'cinzaEscuro', prismaZ([
    [-T.grade_meio_x, T.grade_y1], [T.grade_meio_x, T.grade_y1], [T.grade_meio_x, T.nariz_y], [-T.grade_meio_x, T.nariz_y],
  ], zN, zN + ep)));
  const nFarol = normalDe([zN, T.nariz_y], [T.nariz_chanfro_z, T.nariz_chanfro_y]);
  const A = [zN, T.grade_y1]; const B = [zN, T.nariz_y]; const Q = [T.nariz_chanfro_z, T.nariz_chanfro_y];
  const nAB = [1, 0];
  const nBQ = [nFarol[0], nFarol[1]];
  const miter = (n1, n2) => { const k = 1 + n1[0] * n2[0] + n1[1] * n2[1]; return [(n1[0] + n2[0]) / k, (n1[1] + n2[1]) / k]; };
  const mB = miter(nAB, nBQ);
  const contornoFarol = [A, B, Q, [Q[0] + ep * nBQ[0], Q[1] + ep * nBQ[1]], [B[0] + ep * mB[0], B[1] + ep * mB[1]], [A[0] + ep * nAB[0], A[1] + ep * nAB[1]]];
  for (const s of [1, -1]) {
    const [x0, x1] = s > 0 ? [T.grade_meio_x, C] : [-C, -T.grade_meio_x];
    formas.push(solido(`farol${s > 0 ? 'Dir' : 'Esq'}`, 'amarelo', prismaX(contornoFarol, x0, x1)));
  }

  return formas;
}

/* Passo de um prisma: o `origemId` dado, perfil em metro. */
function passoDoPrisma(p, id) {
  return ['extrusao', { origemId: id, eixo: p.eixo, altura: m(p.altura), perfil: p.perfil.map(([u, v]) => [m(u), m(v)]), em: p.em.map((v) => m(v)) }];
}

/* Os ids de bloco: a forma `k` leva 100 * (k + 1); os prismas dela levam os ids seguintes e a interseção leva o 50º. */
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
      passos.push(['cubo', { origemId: base, larg: m(f.larg), alt: m(f.alt), prof: m(f.prof), em: f.em.map((v) => m(v)) }]);
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
    }
    passos.push(['parte', { nome: f.nome, sel }]);
    passos.push(['material', { sel, usa: f.material }]);
  });
  return passos;
}

const DE = ['Dir', 'Esq'];
const c = (a, b, motivo) => ({ par: [a, b], motivo });

/* Os contatos: cada par se toca pela face indicada no motivo. As medidas são as da TABELA, em milímetro. */
function contatosDeclarados() {
  const lista = [
    c('chassiMeio', 'saiaCabineTras', 'a face de cima do trilho do meio, em y 530, sustenta o bloco da saia atrás da roda da frente'),
    c('chassiMeio', 'bauBase', 'a face de cima do trilho do meio, em y 530, sustenta o fundo do baú'),
    c('chassiMeio', 'caixaRodaTras', 'a face de cima do trilho do meio, em y 530, sustenta a ponta da frente da caixa da roda de trás'),
    c('paraChoqueFrente', 'saiaCabineFrente', 'a face de cima da barra do para-choque, em y 705, sustenta a saia da cabine na frente da roda'),
    c('paraChoqueFrente', 'caixaRodaFrente', 'a face de trás da barra do para-choque, em z 2372, encosta na ponta da frente da caixa da roda'),
    c('paraChoqueFrente', 'placaFrente', 'a face da frente do para-choque, em z 2780, encosta na placa da frente'),
    c('paraChoqueTras', 'bauBase', 'a face de cima do para-choque de trás, em y 705, assenta sob o degrau do baú'),
    c('paraChoqueTras', 'placaTras', 'a face de trás do para-choque, em z -2780, encosta na placa de trás'),
    c('paraChoqueTras', 'caixaRodaTras', 'a aresta de baixo da ponta de trás da caixa da roda, em z -2252 e y 530, toca a face da frente da barra do para-choque'),
    c('saiaCabineFrente', 'capo', 'a face de cima da saia, em y 885, assenta sob o capô'),
    c('saiaCabineFrente', 'caixaRodaFrente', 'a face de trás do bloco da saia, em z 2372, encosta na ponta da frente da caixa da roda'),
    c('saiaCabineTras', 'capo', 'a face de cima da saia, em y 885, assenta sob o capô'),
    c('saiaCabineTras', 'caixaRodaFrente', 'a face da frente do bloco da saia, em z 1282, encosta na ponta de trás da caixa da roda'),
    c('saiaCabineTras', 'bauBase', 'a face de trás da saia, em z 835, encosta na face da frente do baú'),
    c('capo', 'caixaRodaFrente', 'o arco do capô e o arco da caixa da roda saem dos mesmos pontos do círculo de 545 mm'),
    c('capo', 'bauBase', 'a face de trás do capô, em z 835, encosta na face da frente do baú, de y 885 a 1410'),
    c('capo', 'cabine', 'a face de baixo da cabine, em y 1410, assenta no tampo do capô, de z 835 a 1985'),
    c('capo', 'grade', 'a grade escura é uma placa de 12 mm sobre a face da frente do capô, em z 2690'),
    c('capo', 'gradeMeio', 'o centro da grade é uma placa de 12 mm sobre a face da frente do capô, em z 2690'),
    c('grade', 'gradeMeio', 'a face de cima da grade, em y 1060, sustenta o centro da grade, com 970 mm de largura'),
    c('cabine', 'bauFaixaCinza', 'a face de trás da cabine, em z 835, encosta na face da frente do baú, de y 1410 a 1587'),
    c('cabine', 'bauFaixaVermelha', 'a face de trás da cabine, em z 835, encosta na face da frente do baú, de y 1590 a 1940'),
    c('cabine', 'bauTopo', 'a face de trás da cabine, em z 835, encosta na face da frente do baú, de y 1940 a 2295'),
    c('cabine', 'parabrisa', 'a face de trás do para-brisa encosta na face inclinada da frente da cabine'),
    c('bauBase', 'bauFaixaCinza', 'a face de cima do fundo do baú, em y 1410, assenta sob a faixa cinza, com o mesmo contorno'),
    c('bauFaixaCinza', 'bauFaixaVermelha', 'a face de cima da faixa cinza, em y 1590, assenta sob a faixa vermelha, com o mesmo contorno'),
    c('bauFaixaVermelha', 'bauTopo', 'a face de cima da faixa vermelha, em y 1940, assenta sob a camada branca, com o mesmo contorno'),
    c('bauTopo', 'tetoBau', 'a face de cima do baú, em y 2825, sustenta o painel elevado do teto'),
    c('tetoBau', 'giroflexFrenteMeio', 'a face da frente do painel, em z 125, encosta na face de trás da barra de luzes da frente'),
    c('tetoBau', 'giroflexTrasMeio', 'a face de trás do painel, em z -2075, encosta na face da frente da barra de luzes de trás'),
    c('cabine', 'giroflexCabineMeio', 'a face de cima da cabine, em y 2295, sustenta a barra de luzes da cabine'),
    c('bauBase', 'cabine', 'a aresta de baixo da face de trás da cabine, em z 835 e y 1410, toca a aresta de cima do fundo do baú'),
    c('bauFaixaCinza', 'capo', 'a aresta de trás do tampo do capô, em z 835 e y 1410, toca a aresta de baixo da faixa cinza do baú'),
    c('caixaRodaFrente', 'chassiMeio', 'a aresta de baixo da ponta de trás da caixa da roda, em z 1282 e y 530, toca a aresta do trilho do meio'),
    c('capo', 'parabrisa', 'a aresta de baixo do para-brisa, em y 1410, toca o canto em que a face inclinada da cabine sai do tampo do capô'),
    c('grade', 'saiaCabineFrente', 'a aresta de baixo da grade, em y 885 e z 2690, toca a aresta de cima da face da frente da saia'),
    c('giroflexFrenteDir', 'tetoBau', 'a face de trás da ponta azul direita, em z 125, encosta na face da frente do painel do teto'),
    c('giroflexFrenteEsq', 'tetoBau', 'a face de trás da ponta azul esquerda, em z 125, encosta na face da frente do painel do teto'),
    c('giroflexTrasDir', 'tetoBau', 'a face da frente da ponta azul direita, em z -2075, encosta na face de trás do painel do teto'),
    c('giroflexTrasEsq', 'tetoBau', 'a face da frente da ponta azul esquerda, em z -2075, encosta na face de trás do painel do teto'),
    c('bauBase', 'caixaRodaTras', 'o arco do fundo do baú e a caixa da roda de trás saem dos mesmos pontos do círculo de 690 mm'),
  ];
  const sem = lista;
  for (const lado of DE) {
    sem.push(c('cabine', `vidroCabine${lado}`, `o vidro lateral ${lado === 'Dir' ? 'direito' : 'esquerdo'} encosta na lateral inclinada da cabine, sem folga`));
    sem.push(c('cabine', `retrovisor${lado}`, 'a face de dentro do retrovisor encosta na lateral inclinada da cabine, de y 1410 a 1587'));
    sem.push(c('bauBase', `vidroCabine${lado}`, 'a aresta de baixo da face de trás do vidro lateral, em z 835 e y 1410, toca a aresta de cima do fundo do baú'));
    sem.push(c('bauFaixaCinza', `vidroCabine${lado}`, 'a face de trás do vidro lateral, em z 835, encosta na face da frente da faixa cinza do baú'));
    sem.push(c('bauFaixaVermelha', `vidroCabine${lado}`, 'a face de trás do vidro lateral, em z 835, encosta na face da frente da faixa vermelha do baú'));
    sem.push(c('bauTopo', `vidroCabine${lado}`, 'a face de trás do vidro lateral, em z 835, encosta na face da frente da camada branca do baú'));
    sem.push(c('capo', `vidroCabine${lado}`, 'a aresta de baixo do vidro lateral, em y 1410, toca a aresta de fora do tampo do capô, em x 970'));
    sem.push(c('bauFaixaCinza', `janelaBau${lado}`, 'a aresta de baixo da janela, em y 1590, toca a aresta de cima da faixa cinza do baú'));
    sem.push(c('capo', `retrovisor${lado}`, 'a face de dentro do retrovisor encosta na lateral do capô, em x 970, de y 1235 a 1410'));
    sem.push(c(`vidroCabine${lado}`, `retrovisor${lado}`, 'o recorte do vidro lateral abraça o retrovisor, nos planos z 1410 e 1585'));
    sem.push(c('capo', `farol${lado}`, 'a face de trás do farol encosta na face da frente e no chanfro do nariz do capô'));
    sem.push(c('grade', `farol${lado}`, 'a face de cima da grade, em y 1060, sustenta o farol, que cobre a face da frente do capô'));
    sem.push(c('gradeMeio', `farol${lado}`, 'a lateral do centro da grade, em x 485, encosta na face de dentro do farol'));
    sem.push(c('bauBase', `estribo${lado}`, 'a face de dentro do estribo, em x 1147, encosta na lateral do fundo do baú, de z 480 a 745'));
    sem.push(c('chassiMeio', `estribo${lado}`, 'a face de dentro do estribo, em x 1147, encosta na lateral do trilho do meio'));
    sem.push(c(`estribo${lado}`, `paraLamaFrente${lado}`, 'a face de dentro do estribo, em x 1147, encosta na face de fora do para-lama da frente'));
    sem.push(c('bauFaixaVermelha', `janelaBau${lado}`, 'a janela encosta na lateral da faixa vermelha do baú, em x 1147, de y 1590 a 1940'));
    sem.push(c('bauTopo', `janelaBau${lado}`, 'a janela encosta na lateral da camada branca do baú, em x 1147, de y 1940 a 2120'));
    sem.push(c('bauTopo', `refletorFrente${lado}`, 'o refletor encosta na face da frente do baú, em z 835, de y 2470 a 2645'));
    sem.push(c('bauTopo', `refletorLado${lado}`, 'o refletor encosta na lateral do baú, em x 1147, perto da traseira'));
    sem.push(c('paraChoqueFrente', `paraLamaFrente${lado}`, 'o pé da frente do para-lama assenta na face de cima da barra do para-choque, em y 705'));
    sem.push(c('chassiMeio', `paraLamaFrente${lado}`, 'o pé de trás do para-lama da frente assenta na face de cima do trilho do meio, em y 530'));
    sem.push(c('capo', `paraLamaFrente${lado}`, 'a face de dentro do para-lama encosta na lateral do capô, em x 970'));
    sem.push(c('saiaCabineFrente', `paraLamaFrente${lado}`, 'a face de dentro do para-lama encosta na lateral do bloco da saia, em x 970'));
    sem.push(c('saiaCabineTras', `paraLamaFrente${lado}`, 'a face de dentro do para-lama encosta na lateral do bloco da saia, em x 970'));
    sem.push(c('chassiMeio', `paraLamaTras${lado}`, 'o pé da frente do para-lama de trás assenta na face de cima do trilho do meio, em y 530'));
    sem.push(c('paraChoqueTras', `paraLamaTras${lado}`, 'a aresta do pé de trás do para-lama, em z -2252 e y 530, toca a face da frente da barra do para-choque'));
    sem.push(c('bauBase', `paraLamaTras${lado}`, 'a face de fora do para-lama de trás encosta no arco de 690 mm do fundo do baú, de x 970 a 1147'));
    for (const ponta of ['Frente', 'Tras']) {
      sem.push(c(`roda${ponta}${lado}`, `caixaRoda${ponta}`, 'a face de dentro do pneu, em x 530, encosta na face de fora da caixa da roda'));
      sem.push(c(`aro${ponta}${lado}`, `roda${ponta}${lado}`, 'a face de dentro do aro encosta na face de fora do pneu, no disco do centro'));
    }
  }
  for (const s of ['Cabine', 'Frente', 'Tras']) {
    for (const lado of DE) sem.push(c(`giroflex${s}Meio`, `giroflex${s}${lado}`, 'a lateral do centro da barra, em x 395, encosta na ponta azul'));
  }
  for (const s of ['Frente', 'Tras']) {
    for (const lado of DE) sem.push(c('bauTopo', `giroflex${s}${lado}`, 'a face de baixo da ponta azul assenta no teto do baú, em y 2825'));
    sem.push(c('bauTopo', `giroflex${s}Meio`, 'a face de baixo do centro da barra assenta no teto do baú, em y 2825'));
  }
  for (const lado of DE) sem.push(c('cabine', `giroflexCabine${lado}`, 'a face de baixo da ponta azul assenta no teto da cabine, em y 2295'));
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
    { nome: 'topo do painel do teto, na frente', parte: 'tetoBau', medida: 'maximo', em: [T.painel_meia_base, T.painel_topo_y, T.painel_z1], toleranciaMm: tol },
    { nome: 'teto da cabine, na frente', parte: 'cabine', medida: 'maximo', em: [T.cab_meia_largura, T.cab_topo_y, T.capo_fim_z], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.retrovisor_y1, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'ponta do estribo direito', parte: 'estriboDir', medida: 'maximo', em: [T.estribo_x1, T.estribo_y_alto, T.estribo_z1], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-xFora, 0, T.roda_z_tras - yR], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente', parte: 'rodaFrenteDir', medida: 'maximo', em: [xFora, 2 * yR, T.roda_z_frente + yR], toleranciaMm: tol },
    { nome: 'quina de trás, em cima, do baú', parte: 'bauTopo', medida: 'minimo', em: [-T.meia_largura, T.bau_faixa_vermelha_y1, T.bau_z_tras], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'ambulancia', desc: 'ambulância estilizada, de cabine vermelha e baú branco alto com faixa vermelha, barras de luzes azuis, vidros azul claros e rodas de aro cinza' },
  PARAMS: TABELA,
  MATERIAIS: {
    branco: { tipo: 'liso', cor: '#e4e5ea' },
    brancoPainel: { tipo: 'liso', cor: '#d9dbe6' },
    cinzaFaixa: { tipo: 'liso', cor: '#a9a9b4' },
    vermelho: { tipo: 'liso', cor: '#dd5a3c' },
    lavanda: { tipo: 'liso', cor: '#d3d3e0' },
    vidro: { tipo: 'liso', cor: '#c3dcef' },
    vidroBau: { tipo: 'liso', cor: '#b4c3cf' },
    cinzaEscuro: { tipo: 'liso', cor: '#4a4e5b' },
    cinzaMedio: { tipo: 'liso', cor: '#7b8095' },
    cinzaClaro: { tipo: 'liso', cor: '#c4c7ce' },
    pneu: { tipo: 'liso', cor: '#1f2125' },
    aro: { tipo: 'metal', cor: '#9aa3b5', acabamento: 'escovado' },
    amarelo: { tipo: 'liso', cor: '#f2c12e' },
    azul: { tipo: 'liso', cor: '#3f6fd8' },
  },
  TOPO: { origem: 'chão, no meio da ambulância em x e em z; y para cima e a frente da ambulância em +z' },
  PLANO: {
    objeto: 'ambulância estilizada de 5736 mm de comprimento, 2648 mm de largura com espelhos e 3177 mm de altura, com cabine vermelha baixa na frente, baú branco alto atrás e barras de luzes azuis',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total da ambulância, de z -2868 a 2868', milimetros: 5736 },
    familia: 'veiculo',
    partes: [
      { nome: 'chassiMeio', forma: 'trilho cinza escuro de 2294 mm de largura, de y 355 a 530, só entre as rodas, de z -1017 a 1282', tecnica: 'cubo sob o fundo do baú e a saia da cabine' },
      { nome: 'paraChoqueFrente', forma: 'barra cinza escura de 2294 por 175 mm, de y 530 a 705, da roda da frente à ponta, de z 2372 a 2780', tecnica: 'cubo sob a saia da cabine, na frente do vão da roda' },
      { nome: 'paraChoqueTras', forma: 'barra cinza escura de 2294 por 175 mm, de y 530 a 705, da ponta ao vão da roda de trás, de z -2780 a -2252', tecnica: 'cubo sob o degrau de trás do baú' },
      { nome: 'placaFrente', forma: 'placa clara octogonal de 620 por 310 por 88 mm, de y 440 a 750, saindo do para-choque da frente', tecnica: 'extrusao com eixo z de um octógono de cantos chanfrados' },
      { nome: 'placaTras', forma: 'placa clara octogonal de 620 por 310 por 88 mm, de y 375 a 685, saindo do para-choque de trás', tecnica: 'extrusao com eixo z de um octógono de cantos chanfrados' },
      { nome: 'saiaCabineTras', forma: 'bloco vermelho de 1940 mm de largura, de y 530 a 885, entre a face da frente do baú e a roda da frente', tecnica: 'cubo encostado na face da frente do baú' },
      { nome: 'saiaCabineFrente', forma: 'bloco vermelho de 1940 mm de largura, de y 705 a 885, entre a roda da frente e o nariz em z 2690', tecnica: 'cubo sobre a barra do para-choque da frente' },
      { nome: 'capo', forma: 'capô lavanda de 1940 mm de largura, de y 885 ao topo, com nariz chanfrado, capô inclinado até y 1410 e arco da roda da frente no perfil', tecnica: 'extrusao com eixo x de perfil lateral com arco de 545 mm recortado' },
      { nome: 'caixaRodaFrente', forma: 'vão escuro da roda da frente, de 1060 mm de largura entre as faces de dentro dos pneus, com o contorno do arco do capô', tecnica: 'extrusao com eixo x do contorno do arco, sem booleana' },
      { nome: 'caixaRodaTras', forma: 'vão escuro da roda de trás, de 1060 mm de largura entre as faces de dentro dos pneus, com o contorno do arco de 690 mm do baú', tecnica: 'extrusao com eixo x de um meio círculo de 32 lados' },
      { nome: 'cabine', forma: 'cabine vermelha de y 1410 a 2295, de 1940 mm de meia largura embaixo e 1590 mm em cima, com frente inclinada até z 1635', tecnica: 'interseção do perfil lateral com a seção frontal que afunila' },
      { nome: 'parabrisa', forma: 'placa azul clara de 12 mm sobre a face inclinada da cabine, em trapézio de 1580 mm embaixo e 1300 mm em cima', tecnica: 'interseção de uma lâmina do perfil lateral com um trapézio frontal' },
      { nome: 'vidroCabineDir', forma: 'placa azul clara de 12 mm sobre a lateral inclinada direita da cabine, recortada em torno do retrovisor', tecnica: 'interseção de uma tira da seção frontal com o contorno lateral do vidro' },
      { nome: 'vidroCabineEsq', forma: 'placa azul clara de 12 mm sobre a lateral inclinada esquerda da cabine, recortada em torno do retrovisor', tecnica: 'interseção de uma tira da seção frontal com o contorno lateral do vidro' },
      { nome: 'bauBase', forma: 'fundo vermelho do baú, de y 530 a 1410, de 2294 mm de largura, com degrau de trás, arco da roda de trás de 690 mm e quinas da frente chanfradas', tecnica: 'interseção do perfil lateral com a planta de quinas chanfradas' },
      { nome: 'bauFaixaCinza', forma: 'faixa cinza do baú, de y 1410 a 1590, de 2294 mm de largura', tecnica: 'interseção do perfil lateral com a planta de quinas chanfradas' },
      { nome: 'bauFaixaVermelha', forma: 'faixa vermelha do baú, de y 1590 a 1940, de 2294 mm de largura', tecnica: 'interseção do perfil lateral com a planta de quinas chanfradas' },
      { nome: 'bauTopo', forma: 'camada branca do baú, de y 1940 a 2825, de 2294 mm de largura, até z -2780 atrás e 835 na frente', tecnica: 'interseção do perfil lateral com a planta de quinas chanfradas' },
      { nome: 'tetoBau', forma: 'painel branco elevado do teto do baú, de y 2825 a 3177, de 1940 mm de largura embaixo e 1750 mm em cima, de z -2075 a 125', tecnica: 'extrusao com eixo z de um trapézio' },
      { nome: 'giroflexCabineMeio', forma: 'centro cinza da barra de luzes da cabine, de 790 mm de largura, de y 2295 a 2470, de z 1105 a 1455', tecnica: 'cubo sobre o teto da cabine' },
      { nome: 'giroflexCabineDir', forma: 'ponta azul direita da barra de luzes da cabine, em trapézio de x 395 a 705 embaixo e 615 em cima', tecnica: 'extrusao com eixo z de um trapézio' },
      { nome: 'giroflexCabineEsq', forma: 'ponta azul esquerda da barra de luzes da cabine, em trapézio de x -395 a -705 embaixo e -615 em cima', tecnica: 'extrusao com eixo z de um trapézio' },
      { nome: 'giroflexFrenteMeio', forma: 'centro cinza da barra de luzes da frente do teto do baú, de y 2825 a 3000, de z 125 a 480', tecnica: 'cubo sobre o teto do baú' },
      { nome: 'giroflexFrenteDir', forma: 'ponta azul direita da barra de luzes da frente do teto do baú', tecnica: 'extrusao com eixo z de um trapézio' },
      { nome: 'giroflexFrenteEsq', forma: 'ponta azul esquerda da barra de luzes da frente do teto do baú', tecnica: 'extrusao com eixo z de um trapézio' },
      { nome: 'giroflexTrasMeio', forma: 'centro cinza da barra de luzes de trás do teto do baú, de y 2825 a 3000, de z -2425 a -2075', tecnica: 'cubo sobre o teto do baú' },
      { nome: 'giroflexTrasDir', forma: 'ponta azul direita da barra de luzes de trás do teto do baú', tecnica: 'extrusao com eixo z de um trapézio' },
      { nome: 'giroflexTrasEsq', forma: 'ponta azul esquerda da barra de luzes de trás do teto do baú', tecnica: 'extrusao com eixo z de um trapézio' },
      { nome: 'janelaBauDir', forma: 'placa azul acinzentada de 10 mm na lateral direita do baú, de z -2135 a -725 e y 1590 a 2120, com os cantos de cima chanfrados', tecnica: 'extrusao com eixo x de um hexágono fino' },
      { nome: 'janelaBauEsq', forma: 'placa azul acinzentada de 10 mm na lateral esquerda do baú, de z -2135 a -725 e y 1590 a 2120, com os cantos de cima chanfrados', tecnica: 'extrusao com eixo x de um hexágono fino' },
      { nome: 'refletorFrenteDir', forma: 'quadrado vermelho de 175 mm e 2 mm de espessura na face da frente do baú, de x 795 a 970 e y 2470 a 2645', tecnica: 'cubo encostado na face da frente do baú' },
      { nome: 'refletorFrenteEsq', forma: 'quadrado vermelho de 175 mm e 2 mm de espessura na face da frente do baú, de x -970 a -795 e y 2470 a 2645', tecnica: 'cubo encostado na face da frente do baú' },
      { nome: 'refletorLadoDir', forma: 'quadrado vermelho de 175 mm e 2 mm de espessura na lateral direita do baú, de z -2605 a -2425 e y 2470 a 2645', tecnica: 'cubo encostado na lateral do baú' },
      { nome: 'refletorLadoEsq', forma: 'quadrado vermelho de 175 mm e 2 mm de espessura na lateral esquerda do baú, de z -2605 a -2425 e y 2470 a 2645', tecnica: 'cubo encostado na lateral do baú' },
      { nome: 'paraLamaFrenteDir', forma: 'meia coroa cinza escura de 545 a 690 mm de raio em volta da roda da frente direita, de x 970 a 1147', tecnica: 'extrusao com eixo x de uma meia coroa de 32 lados' },
      { nome: 'paraLamaFrenteEsq', forma: 'meia coroa cinza escura de 545 a 690 mm de raio em volta da roda da frente esquerda, de x -1147 a -970', tecnica: 'extrusao com eixo x de uma meia coroa de 32 lados' },
      { nome: 'paraLamaTrasDir', forma: 'meia coroa cinza escura de 545 a 690 mm de raio em volta da roda de trás direita, de x 970 a 1147, dentro do arco do baú', tecnica: 'extrusao com eixo x de uma meia coroa de 32 lados' },
      { nome: 'paraLamaTrasEsq', forma: 'meia coroa cinza escura de 545 a 690 mm de raio em volta da roda de trás esquerda, de x -1147 a -970, dentro do arco do baú', tecnica: 'extrusao com eixo x de uma meia coroa de 32 lados' },
      { nome: 'rodaFrenteDir', forma: 'pneu escuro de 1060 mm de diâmetro e 530 mm de largura, de x 530 a 1060, na roda da frente direita', tecnica: 'cilindro com eixo x, 32 lados, sem chanfro' },
      { nome: 'rodaFrenteEsq', forma: 'pneu escuro de 1060 mm de diâmetro e 530 mm de largura, de x -1060 a -530, na roda da frente esquerda', tecnica: 'cilindro com eixo x, 32 lados, sem chanfro' },
      { nome: 'rodaTrasDir', forma: 'pneu escuro de 1060 mm de diâmetro e 530 mm de largura, de x 530 a 1060, na roda de trás direita', tecnica: 'cilindro com eixo x, 32 lados, sem chanfro' },
      { nome: 'rodaTrasEsq', forma: 'pneu escuro de 1060 mm de diâmetro e 530 mm de largura, de x -1060 a -530, na roda de trás esquerda', tecnica: 'cilindro com eixo x, 32 lados, sem chanfro' },
      { nome: 'aroFrenteDir', forma: 'disco cinza de 540 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu da frente direita', tecnica: 'cilindro com eixo x' },
      { nome: 'aroFrenteEsq', forma: 'disco cinza de 540 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu da frente esquerda', tecnica: 'cilindro com eixo x' },
      { nome: 'aroTrasDir', forma: 'disco cinza de 540 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu de trás direita', tecnica: 'cilindro com eixo x' },
      { nome: 'aroTrasEsq', forma: 'disco cinza de 540 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu de trás esquerda', tecnica: 'cilindro com eixo x' },
      { nome: 'estriboDir', forma: 'estribo escuro direito, de x 1147 a 1324, de y 355 a 596 na borda e 728 junto ao trilho, de z 480 a 1295', tecnica: 'extrusao com eixo z de um quadrilátero' },
      { nome: 'estriboEsq', forma: 'estribo escuro esquerdo, de x -1324 a -1147, de y 355 a 596 na borda e 728 junto ao trilho, de z 480 a 1295', tecnica: 'extrusao com eixo z de um quadrilátero' },
      { nome: 'retrovisorDir', forma: 'retrovisor cinza claro direito, da lateral da cabine a x 1324, de y 1235 a 1587, de z 1410 a 1585', tecnica: 'extrusao com eixo z de um pentágono' },
      { nome: 'retrovisorEsq', forma: 'retrovisor cinza claro esquerdo, da lateral da cabine a x -1324, de y 1235 a 1587, de z 1410 a 1585', tecnica: 'extrusao com eixo z de um pentágono' },
      { nome: 'grade', forma: 'grade escura de 1940 por 175 mm e 12 mm de espessura, de y 885 a 1060, sobre a face da frente do capô', tecnica: 'extrusao com eixo z de um retângulo' },
      { nome: 'gradeMeio', forma: 'centro da grade, escuro, de 970 por 85 mm e 12 mm de espessura, de y 1060 a 1145, sobre a face da frente do capô', tecnica: 'extrusao com eixo z de um retângulo' },
      { nome: 'farolDir', forma: 'placa amarela direita de 12 mm sobre a face da frente e o chanfro do nariz, de x 485 a 970 e y 1060 a 1260', tecnica: 'extrusao com eixo x de um contorno em L' },
      { nome: 'farolEsq', forma: 'placa amarela esquerda de 12 mm sobre a face da frente e o chanfro do nariz, de x -970 a -485 e y 1060 a 1260', tecnica: 'extrusao com eixo x de um contorno em L' },
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 5736 mm de comprimento, 2648 mm de largura com espelhos ou 3177 mm de altura, ou alguma roda não toca o chão',
      'um lado da ambulância difere do outro em medida ou posição de peça simétrica',
      'o baú não é uma caixa mais alta e mais larga que a cabine, com o degrau visível sobre a cabine, ou não encosta na traseira dela',
      'a cabine não afunila para o teto, ou o para-brisa e os vidros não são placas azul claras encostadas na cabine',
      'o baú não tem a faixa vermelha, a faixa cinza, a janela lateral, o painel elevado no teto e as duas barras de luzes azuis',
      'a cabine não tem a barra de luzes azul no teto, e o capô não tem faróis amarelos e grade escura',
      'uma roda não tem pneu escuro com aro cinza, ou não aparece no arco recortado com a caixa de roda escura atrás',
      'a silhueta lateral, frontal ou de cima não confere com a referência em mais de cinco por cento do comprimento',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
