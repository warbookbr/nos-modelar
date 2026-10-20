/* carro-suv-luxo — SUV de brinquedo, de carroceria laranja de uma cor, teto longo e quase plano com teto solar, para-brisa em rampa, estufa que afunila
 * para dentro, faixa lateral cinza com os arcos das rodas em volta de pneus grandes de aro cinza, grade escura, faróis amarelos que dobram a
 * quina, lanternas vermelhas nos cantos de trás, retrovisores na base das colunas e para-choques cinza com placa na frente. Sem estepe.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "suv-luxury" do pacote A, de autor A (pacote A, endereço omitido, endereço da
 * página: endereço omitido), licença livre sem exigência de crédito (declarada no License.txt do pacote). A malha de origem NÃO está no
 * repositório: ela fica em importados/veiculos-livres/pacote-a/suv-luxury.glb, que o git ignora. O que entra aqui são as medidas tiradas dela
 * (referencias/fonte-partes.json, em metro, com a escala 1,765) e as vistas (referencias/fonte-vistas.png). As diferenças estão em
 * referencias/alvo.md.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do carro em +z, x para a direita de quem olha de frente, centrado em x e z. A
 * TABELA é em milímetro e é a única fonte das medidas; `m` é a única conversão para metro, `derivar` calcula as formas e `gerarPassos` escreve,
 * por parte, a forma e o `material`. Nenhuma posição é digitada no passo.
 *
 * Como a forma é feita: a carroceria (de baixo da cintura), a cabine (a estufa) e o teto saem da interseção de três sólidos, o perfil lateral
 * (z, y) extrudado em x, a seção frontal (x, y) extrudada em z e uma caixa de recorte em y. A seção frontal tem 971 mm de meia largura até a
 * cintura e afunila em reta até 794 mm no teto, e é ela que dá o afunilamento da cabine. Os arcos das rodas são recortados no próprio perfil
 * lateral, antes da extrusão, e cada caixa de roda fecha o arco entre as faces de dentro dos pneus. Os vidros são placas de 12 mm por fora das
 * faces da cabine: cada uma é a interseção de uma faixa fina que segue a face (extrudada em x ou em z) com o contorno do vidro, recuado da borda
 * pela moldura. O contorno de cada prisma sai no sentido anti-horário. Na extrusão em x o núcleo põe [u, v] em y = -u e z = v; na extrusão em z
 * põe em x = u e y = -v; na extrusão em y põe em x = u e z = v.
 *
 * Sem booleana no corpo: os recortes do arco são vértices do perfil, o que evita as lascas que `subtrair` deixa em peça grande.
 *
 * Não modelado: a face de baixo do carro e as nervuras do pneu, que a fonte não separa em partes.
 */

const m = (mm) => mm / 1000;

/* Área com sinal (cadarço): positiva quando o contorno anda no sentido anti-horário. */
const areaComSinal = (lista) => lista.reduce((soma, [a, b], i) => {
  const [c, d] = lista[(i + 1) % lista.length];
  return soma + (a * d - c * b);
}, 0) / 2;
const antihorario = (lista) => (areaComSinal(lista) < 0 ? [...lista].reverse() : lista);
/* Tira os pontos repetidos e os colineares, que viram triângulo sem área no exportador. */
const semColineares = (lista) => {
  const unicos = lista.filter((p, i) => { const q = lista[(i + 1) % lista.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-6; });
  return unicos.filter((p, i) => {
    const a = unicos[(i + unicos.length - 1) % unicos.length]; const b = unicos[(i + 1) % unicos.length];
    return Math.abs((p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])) > 1e-3;
  });
};
const limpo = (lista) => antihorario(semColineares(lista));
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];

export const TABELA = {
  lados: 24,
  comprimento: 5030,

  /* carroceria laranja: meia largura 971 até a cintura (y 1412), perfil lateral da frente para trás pelo topo */
  meia_largura: 971,
  y_cintura: 1412, y_vidro_topo: 2145, y_teto: 2283,
  nariz_z: 2250, capo_frente_z: 2074,
  parabrisa_base_z: 1191, parabrisa_topo_z: 662,
  teto_tras_z: -2067,
  chanfro_tras_z: -2197, chanfro_tras_y: 2206,
  traseira_z: -2503,
  /* a cabine afunila em reta, de 971 na cintura a 794 mm de meia largura no teto */
  meia_teto: 794,

  /* rodas: pneu de 24 lados, centro em x 750, face de dentro em x 441 e de fora em x 1059; o aro sai 30 mm da face de fora */
  roda_x: 750, roda_largura: 618, roda_raio: 529.5, roda_z_frente: 1386, roda_z_tras: -1297,
  aro_raio: 330, aro_espessura: 30,
  /* arco da roda recortado no perfil lateral (raio 688, de 24 lados, cortado a 30 graus acima do eixo) e furo do pneu na faixa cinza */
  arco_raio: 688, furo_folga: 6,

  /* faixa lateral cinza: de x 441 (face de dentro do pneu) a 1147; fundo em y 353, ponta em y 706 */
  faixa_x1: 1147, faixa_fundo_y: 353, faixa_ponta_y: 706, faixa_tras_z: -1962, faixa_frente_z: 2250, faixa_rampa_frente_z: 2051,

  /* para-choque da frente (planta chanfrada, de y 353 a 706), fáscia sob o nariz, para-choque de trás (perfil lateral), placa octogonal */
  pc_frente_z: 2427, pc_frente_quina_x: 1096, pc_frente_quina_z: 2375, pc_frente_meia: 971,
  pc_tras_meia: 912, pc_tras_perfil: [[-1962, 353], [-2071, 353], [-2071, 574], [-2307, 621], [-2500, 813]], pc_tras_z: -2500,
  /* engate sob o para-choque de trás: octógono de x ±309 de y 221 a 353, de z -2051 a -1962 */
  engate_meia: 309, engate_chanfro: 88, engate_y0: 221, engate_z0: -2051, engate_z1: -1962,
  placa_meia: 309, placa_chanfro: 88, placa_y0: 265, placa_y1: 574, placa_prof: 88,

  /* vidros: placas de 12 mm por fora das faces; moldura de 176 mm; o vidro lateral vai de z -131 até a rampa do para-brisa recuada */
  vidro_espessura: 12, moldura: 176, vidro_lateral_tras_z: -131,
  parabrisa_y0: 1561, vidro_tras_y0: 1853, vidro_tras_y1: 2131,
  /* teto solar branco: contorno em planta (meia largura, z) de um lado, de trás para a frente, 12 mm sobre o teto */
  solario: [[441, -131], [574, -87], [618, 46], [618, 309], [574, 441], [441, 486]], solario_espessura: 12,

  /* grade escura no nariz e faróis amarelos que dobram a quina (a placa da frente e a lateral de 176 mm) */
  grade_meia: 364, grade_y1: 1147, grade_espessura: 10,
  farol_x0: 490, farol_y0: 1147, farol_y1: 1280, farol_espessura: 10, farol_lateral_prof: 176,
  /* lanternas nos cantos de trás: placa em x 618 a 971 e lateral de 176 mm */
  lanterna_x0: 618, lanterna_y0: 1235, lanterna_espessura: 12, lanterna_lateral_prof: 176,

  /* retrovisores: de x 971 a 1324, z 791 a 967, y 1235 a 1588 */
  retrovisor_x1: 1324, retrovisor_y0: 1235, retrovisor_y_meio: 1412, retrovisor_x_topo: 1147, retrovisor_y1: 1588, retrovisor_z0: 791, retrovisor_z1: 967,
};

/* Meia largura da seção frontal da carroceria na altura y: 971 até a cintura, depois reta até o teto. */
const meiaLarguraEm = (T, y) => (y <= T.y_cintura ? T.meia_largura
  : T.meia_largura + ((T.meia_teto - T.meia_largura) * (y - T.y_cintura)) / (T.y_teto - T.y_cintura));
/* z da face da frente do nariz (de nariz_z em y_base até capo_frente_z na cintura), do para-brisa e da face inclinada de trás, na altura y. */
const zNarizEm = (T, yBase, y) => T.nariz_z + ((T.capo_frente_z - T.nariz_z) * (y - yBase)) / (T.y_cintura - yBase);
const zParabrisaEm = (T, y) => T.parabrisa_base_z + ((T.parabrisa_topo_z - T.parabrisa_base_z) * (y - T.y_cintura)) / (T.y_teto - T.y_cintura);
const zTrasEm = (T, y) => T.traseira_z + ((T.chanfro_tras_z - T.traseira_z) * (y - T.y_cintura)) / (T.chanfro_tras_y - T.y_cintura);

/* Arco de uma circunferência de N lados com um vértice no topo, só a parte com y >= y0, de trás para a frente (z crescente). Se o corte
 * cai entre dois vértices, entram os dois pontos de corte; se cai num vértice, ele fica como está. */
function arco(zc, yc, r, N, y0) {
  const V = (k) => { const a = Math.PI - (k * 2 * Math.PI) / N; return [zc + r * Math.cos(a), yc + r * Math.sin(a)]; };
  const dentro = (k) => V(k)[1] >= y0 - 1e-6;
  const sobre = (k) => V(k)[1] > y0 + 1e-6;
  const corta = (p, q) => { const t = (y0 - p[1]) / (q[1] - p[1]); return [p[0] + t * (q[0] - p[0]), y0]; };
  const topo = N / 4;
  let a = topo; let b = topo;
  while (dentro(a - 1)) a -= 1;
  while (dentro(b + 1)) b += 1;
  const pts = [];
  if (sobre(a)) pts.push(corta(V(a - 1), V(a)));
  for (let k = a; k <= b; k += 1) { const [z, y] = V(k); pts.push([z, Math.abs(y - y0) < 1e-6 ? y0 : y]); }
  if (sobre(b)) pts.push(corta(V(b + 1), V(b)));
  return pts;
}

/* Uma extrusão em milímetro nas coordenadas naturais: eixo x leva (z, y), eixo z leva (x, y), eixo y leva (x, z); `base` é a posição da face inicial. */
const ext = (eixo, base, altura, pontos) => ({ eixo, base, altura, pontos });

/* Formas em milímetro: cada uma é de um tipo (vistas, duas, extrusao, cilindro) e leva `nome` e `material`. Todo número sai da tabela. */
export function derivar(T) {
  const M = T.meia_largura;
  const L = M + 50; const C = T.comprimento / 2 + 50;
  const yRoda = T.roda_raio;
  const yBase = yRoda + T.arco_raio * Math.sin(Math.PI / 6);
  const zRodas = [['Tras', T.roda_z_tras], ['Frente', T.roda_z_frente]];
  const xDentro = T.roda_x - T.roda_largura / 2;
  const xFora = T.roda_x + T.roda_largura / 2;
  const e = T.vidro_espessura;
  const arcos = zRodas.map(([, zc]) => arco(zc, yRoda, T.arco_raio, T.lados, yBase));
  const rFuro = yRoda + T.furo_folga;
  const furos = zRodas.map(([, zc]) => [[zc - rFuro, T.faixa_fundo_y], ...arco(zc, yRoda, rFuro, T.lados, yRoda), [zc + rFuro, T.faixa_fundo_y]]);
  const formas = [];

  /* o perfil lateral da carroceria, com os arcos das rodas na borda de baixo, e a seção frontal que afunila a cabine */
  const lado = [
    [T.nariz_z, yBase], [T.capo_frente_z, T.y_cintura], [T.parabrisa_base_z, T.y_cintura], [T.parabrisa_topo_z, T.y_teto],
    [T.teto_tras_z, T.y_teto], [T.chanfro_tras_z, T.chanfro_tras_y], [T.traseira_z, T.y_cintura], [T.traseira_z, yBase],
    ...arcos[0], ...arcos[1],
  ];
  const yFundoPrisma = yBase - 100;
  const secao = espelhar([[M, yFundoPrisma], [M, T.y_cintura], [T.meia_teto, T.y_teto]]);
  const caixa = (y0, y1) => ({ larg: 2 * L + 100, alt: y1 - y0, prof: 2 * C, y0, zMeio: 0 });
  const vistas = (nome, material, y0, y1) => ({
    tipo: 'vistas', nome, material, lateral: ext('x', -L, 2 * L, lado), frontal: ext('z', -C, 2 * C, secao), caixa: caixa(y0, y1),
  });
  formas.push(vistas('carroceria', 'laranja', yFundoPrisma, T.y_cintura));
  formas.push(vistas('cabine', 'laranjaCabine', T.y_cintura, T.y_vidro_topo));
  formas.push(vistas('teto', 'laranjaTeto', T.y_vidro_topo, T.y_teto + 50));

  /* para-brisa e a faixa escura da base: faixa fina que segue a rampa (x) com o trapézio do vidro (z), recuado pela moldura */
  const rampa = (z0, z1, y0, y1, sentido) => [[z0, y0], [z0 + sentido * e, y0], [z1 + sentido * e, y1], [z1, y1]];
  const trapezio = (T2, ya, yb) => espelhar([[meiaLarguraEm(T2, ya) - T2.moldura, ya], [meiaLarguraEm(T2, yb) - T2.moldura, yb]]);
  const rampaPb = rampa(zParabrisaEm(T, T.y_cintura), zParabrisaEm(T, T.y_teto), T.y_cintura, T.y_teto, 1);
  formas.push({
    tipo: 'duas', nome: 'parabrisa', material: 'vidro',
    a: ext('x', -L, 2 * L, rampaPb), b: ext('z', -C, 2 * C, trapezio(T, T.parabrisa_y0, T.y_vidro_topo)),
  });
  formas.push({
    tipo: 'duas', nome: 'faixaParaBrisa', material: 'faixaEscura',
    a: ext('x', -L, 2 * L, rampaPb), b: ext('z', -C, 2 * C, trapezio(T, T.y_cintura, T.parabrisa_y0)),
  });

  /* vidros laterais: faixa fina sobre a face lateral inclinada da cabine (z) com o contorno da janela (x) */
  for (const s of [1, -1]) {
    const lad = s > 0 ? 'Dir' : 'Esq';
    const banda = [[s * meiaLarguraEm(T, T.y_cintura), T.y_cintura], [s * (meiaLarguraEm(T, T.y_cintura) + e), T.y_cintura],
      [s * (meiaLarguraEm(T, T.y_vidro_topo) + e), T.y_vidro_topo], [s * meiaLarguraEm(T, T.y_vidro_topo), T.y_vidro_topo]];
    /* o contorno contorna o retrovisor: recua até a face de trás dele (z 791) e só volta à rampa acima do topo dele (y 1588) */
    const janela = [[T.vidro_lateral_tras_z, T.y_cintura], [T.retrovisor_z0, T.y_cintura], [T.retrovisor_z0, T.retrovisor_y1],
      [zParabrisaEm(T, T.retrovisor_y1) - T.moldura, T.retrovisor_y1],
      [zParabrisaEm(T, T.y_vidro_topo) - T.moldura, T.y_vidro_topo], [T.vidro_lateral_tras_z, T.y_vidro_topo]];
    formas.push({ tipo: 'duas', nome: `vidroLateral${lad}`, material: 'vidro', a: ext('z', -C, 2 * C, banda), b: ext('x', -L, 2 * L, janela) });
  }

  /* vidro de trás: faixa fina sobre a face inclinada de trás (x) com o trapézio do vidro (z) */
  formas.push({
    tipo: 'duas', nome: 'vidroTras', material: 'vidro',
    a: ext('x', -L, 2 * L, rampa(zTrasEm(T, T.y_cintura), zTrasEm(T, T.chanfro_tras_y), T.y_cintura, T.chanfro_tras_y, -1)),
    b: ext('z', -C, 2 * C, trapezio(T, T.vidro_tras_y0, T.vidro_tras_y1)),
  });

  /* teto solar: placa branca sobre o teto plano */
  formas.push({ tipo: 'extrusao', nome: 'solario', material: 'branco', ...ext('y', T.y_teto, T.solario_espessura, espelhar(T.solario).map(([x, z]) => [x, z])) });

  /* retrovisores: pentágono em (x, y) que cola na lateral da carroceria e na face inclinada da cabine, extrudado de z 791 a 967 */
  for (const s of [1, -1]) {
    const lad = s > 0 ? 'Dir' : 'Esq';
    const pol = [[M, T.retrovisor_y0], [T.retrovisor_x1, T.retrovisor_y0], [T.retrovisor_x1, T.retrovisor_y_meio], [T.retrovisor_x_topo, T.retrovisor_y1],
      [meiaLarguraEm(T, T.retrovisor_y1), T.retrovisor_y1], [M, T.retrovisor_y_meio]].map(([x, y]) => [s * x, y]);
    formas.push({ tipo: 'extrusao', nome: `retrovisor${lad}`, material: 'laranja', ...ext('z', T.retrovisor_z0, T.retrovisor_z1 - T.retrovisor_z0, pol) });
  }

  /* faixa lateral cinza (para-lama, saia e borda dos arcos): extrusão em x de x 441 a 1147, com os furos dos pneus */
  const topoFaixa = [
    [T.faixa_tras_z, T.faixa_fundo_y], [T.faixa_tras_z, T.faixa_ponta_y], ...arcos[0], ...arcos[1],
    [T.faixa_rampa_frente_z, T.faixa_ponta_y], [T.faixa_frente_z, T.faixa_ponta_y], [T.faixa_frente_z, T.faixa_fundo_y],
  ];
  const faixa = [...topoFaixa, ...[...furos[1]].reverse(), ...[...furos[0]].reverse()];
  for (const s of [1, -1]) {
    const lad = s > 0 ? 'Dir' : 'Esq';
    formas.push({ tipo: 'extrusao', nome: `paraLama${lad}`, material: 'cinza', ...ext('x', s > 0 ? xDentro : -T.faixa_x1, T.faixa_x1 - xDentro, faixa) });
  }

  /* caixas de roda: o arco da carroceria fechado na linha da base, entre as faces de dentro dos pneus */
  zRodas.forEach(([ponta], j) => {
    formas.push({ tipo: 'extrusao', nome: `caixaRoda${ponta}`, material: 'caixaRoda', ...ext('x', -xDentro, 2 * xDentro, arcos[j]) });
  });

  /* para-choque da frente: planta chanfrada, de y 353 a 706; fáscia escura sob o nariz; para-choque de trás de perfil lateral */
  const planta = [[-T.faixa_x1, T.faixa_frente_z], [T.faixa_x1, T.faixa_frente_z], [T.pc_frente_quina_x, T.pc_frente_quina_z], [T.pc_frente_meia, T.pc_frente_z],
    [-T.pc_frente_meia, T.pc_frente_z], [-T.pc_frente_quina_x, T.pc_frente_quina_z]];
  formas.push({ tipo: 'extrusao', nome: 'paraChoqueFrente', material: 'cinza', ...ext('y', T.faixa_fundo_y, T.faixa_ponta_y - T.faixa_fundo_y, planta) });
  formas.push({
    tipo: 'extrusao', nome: 'fasciaFrente', material: 'cinzaEscuro',
    ...ext('y', T.faixa_ponta_y, yBase - T.faixa_ponta_y, [[-M, T.faixa_rampa_frente_z], [M, T.faixa_rampa_frente_z], [M, T.faixa_frente_z], [-M, T.faixa_frente_z]]),
  });
  /* o perfil de trás sobe pela face inclinada até y 813 e fecha na base da carroceria, em y 873,5 */
  const pcTras = [...T.pc_tras_perfil, [T.pc_tras_z, yBase], [T.faixa_tras_z, yBase]];
  formas.push({ tipo: 'extrusao', nome: 'paraChoqueTras', material: 'cinza', ...ext('x', -T.pc_tras_meia, 2 * T.pc_tras_meia, pcTras) });

  const gm = T.engate_meia;
  formas.push({
    tipo: 'extrusao', nome: 'engate', material: 'placa',
    ...ext('z', T.engate_z0, T.engate_z1 - T.engate_z0, espelhar([[gm - T.engate_chanfro, T.engate_y0], [gm, T.engate_y0 + T.engate_chanfro], [gm, T.faixa_fundo_y]])),
  });

  /* placa octogonal da frente, saindo do para-choque */
  const pm = T.placa_meia; const ch = T.placa_chanfro;
  const placa = espelhar([[pm - ch, T.placa_y0], [pm, T.placa_y0 + ch], [pm, T.placa_y1 - ch], [pm - ch, T.placa_y1]]);
  formas.push({ tipo: 'extrusao', nome: 'placaFrente', material: 'placa', ...ext('z', T.pc_frente_z, T.placa_prof, placa) });

  /* grade e faróis: placas finas que seguem a face inclinada do nariz (x) */
  const faceNariz = (y0, y1) => [[zNarizEm(T, yBase, y0), y0], [zNarizEm(T, yBase, y0) + T.farol_espessura, y0], [zNarizEm(T, yBase, y1) + T.farol_espessura, y1], [zNarizEm(T, yBase, y1), y1]];
  formas.push({ tipo: 'extrusao', nome: 'grade', material: 'faixaEscura', ...ext('x', -T.grade_meia, 2 * T.grade_meia, faceNariz(yBase, T.grade_y1)) });
  for (const s of [1, -1]) {
    const lad = s > 0 ? 'Dir' : 'Esq';
    const x0 = s > 0 ? T.farol_x0 : -M;
    formas.push({ tipo: 'extrusao', nome: `farol${lad}`, material: 'amarelo', ...ext('x', x0, M - T.farol_x0, faceNariz(T.farol_y0, T.farol_y1)) });
    const zf0 = zNarizEm(T, yBase, T.farol_y0); const zf1 = zNarizEm(T, yBase, T.farol_y1);
    const lateral = [[zf0 - T.farol_lateral_prof, T.farol_y0], [zf0, T.farol_y0], [zf1, T.farol_y1], [zf0 - T.farol_lateral_prof, T.farol_y1]];
    formas.push({ tipo: 'extrusao', nome: `farolLateral${lad}`, material: 'amarelo', ...ext('x', s > 0 ? M : -M - T.farol_espessura, T.farol_espessura, lateral) });
  }

  /* lanternas: placa na face de trás (x 618 a 971) e a lateral que dobra o canto, em y 1235 a 1412 */
  for (const s of [1, -1]) {
    const lad = s > 0 ? 'Dir' : 'Esq';
    const rect = [[T.lanterna_x0, T.lanterna_y0], [M, T.lanterna_y0], [M, T.y_cintura], [T.lanterna_x0, T.y_cintura]].map(([x, y]) => [s * x, y]);
    formas.push({ tipo: 'extrusao', nome: `lanterna${lad}`, material: 'lanterna', ...ext('z', T.traseira_z - T.lanterna_espessura, T.lanterna_espessura, rect) });
    const lat = [[T.traseira_z, T.lanterna_y0], [T.traseira_z + T.lanterna_lateral_prof, T.lanterna_y0], [T.traseira_z + T.lanterna_lateral_prof, T.y_cintura], [T.traseira_z, T.y_cintura]];
    formas.push({ tipo: 'extrusao', nome: `lanternaLateral${lad}`, material: 'lanterna', ...ext('x', s > 0 ? M : -M - T.lanterna_espessura, T.lanterna_espessura, lat) });
  }

  /* pneus e aros: cilindros de eixo x; o aro sai 30 mm da face de fora do pneu */
  for (const s of [1, -1]) {
    const lad = s > 0 ? 'Dir' : 'Esq';
    for (const [ponta, zc] of [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]]) {
      formas.push({ tipo: 'cilindro', nome: `roda${ponta}${lad}`, material: 'pneu', raio: yRoda, altura: T.roda_largura, x0: s > 0 ? xDentro : -xFora, y: yRoda, z: zc });
    }
  }
  for (const s of [1, -1]) {
    const lad = s > 0 ? 'Dir' : 'Esq';
    for (const [ponta, zc] of [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]]) {
      formas.push({
        tipo: 'cilindro', nome: `aro${ponta}${lad}`, material: 'aro', raio: T.aro_raio, altura: T.aro_espessura,
        x0: s > 0 ? xFora : -(xFora + T.aro_espessura), y: yRoda, z: zc,
      });
    }
  }
  return { formas, yBase, L, C };
}

/* Passos de uma extrusão: a conversão de milímetro para metro é a de `m` e o perfil sai do natural para o do núcleo. */
function passoExtrusao(id, x) {
  const { eixo, base, altura, pontos } = x;
  if (eixo === 'x') {
    return ['extrusao', { origemId: id, eixo: 'x', altura: m(altura), em: [m(base), 0, 0], perfil: limpo(pontos.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]) }];
  }
  if (eixo === 'z') {
    return ['extrusao', { origemId: id, eixo: 'z', altura: m(altura), em: [0, 0, m(base)], perfil: limpo(pontos.map(([px, y]) => [px, -y])).map(([u, v]) => [m(u), m(v)]) }];
  }
  return ['extrusao', { origemId: id, eixo: 'y', altura: m(altura), em: [0, m(base), 0], perfil: limpo(pontos).map(([u, v]) => [m(u), m(v)]) }];
}

/* IDs: a forma k ocupa o bloco de 1000 que começa em 1000 * (k + 1): primitivas em +1, +2 e +3, e a interseção em +10. */
export function gerarPassos(T) {
  const { formas } = derivar(T);
  const passos = [];
  formas.forEach((f, k) => {
    const base = 1000 * (k + 1);
    let sel;
    if (f.tipo === 'vistas') {
      passos.push(passoExtrusao(base + 1, f.lateral));
      passos.push(passoExtrusao(base + 2, f.frontal));
      const c = f.caixa;
      passos.push(['cubo', { origemId: base + 3, larg: m(c.larg), alt: m(c.alt), prof: m(c.prof), em: [0, m(c.y0), m(c.zMeio)] }]);
      passos.push(['intersectar', { origemId: base + 10, solidos: [
        { origem: { op: 'extrusao', id: base + 1 } }, { origem: { op: 'extrusao', id: base + 2 } }, { origem: { op: 'cubo', id: base + 3 } }] }]);
      sel = { origem: { op: 'intersectar', id: base + 10 } };
    } else if (f.tipo === 'duas') {
      passos.push(passoExtrusao(base + 1, f.a));
      passos.push(passoExtrusao(base + 2, f.b));
      passos.push(['intersectar', { origemId: base + 10, solidos: [{ origem: { op: 'extrusao', id: base + 1 } }, { origem: { op: 'extrusao', id: base + 2 } }] }]);
      sel = { origem: { op: 'intersectar', id: base + 10 } };
    } else if (f.tipo === 'extrusao') {
      passos.push(passoExtrusao(base + 1, f));
      sel = { origem: { op: 'extrusao', id: base + 1 } };
    } else {
      passos.push(['cilindro', { origemId: base + 1, raio: m(f.raio), altura: m(f.altura), lados: T.lados, eixo: 'x', em: [m(f.x0), m(f.y), m(f.z)] }]);
      sel = { alias: `cil${base + 1}` };
    }
    passos.push(['parte', { nome: f.nome, sel }]);
    passos.push(['material', { sel, usa: f.material }]);
  });
  return passos;
}

/* Um cilindro inteiro é a lateral mais as duas tampas; sem as tampas a seleção deixa as faces sem parte. */
const cilindroInteiro = (id) => ({
  unir: [{ origem: { op: 'cilindro', id } }, { origem: { op: 'cilindro', id, tampa: 'fundo' } }, { origem: { op: 'cilindro', id, tampa: 'topo' } }],
});
export const ALIASES = derivar(TABELA).formas
  .map((f, k) => [f, 1000 * (k + 1) + 1]).filter(([f]) => f.tipo === 'cilindro').map(([, id]) => [`cil${id}`, cilindroInteiro(id)]);

/* Os contatos, declarados antes de medir: cada par se toca por uma face (ou por uma aresta, dita no motivo), com as medidas da TABELA. */
const LADOS = ['Dir', 'Esq'];
const PONTAS = ['Frente', 'Tras'];
export const CONTATOS = [
  { par: ['carroceria', 'cabine'], motivo: 'a cabine assenta no plano da cintura, em y 1412, que sai dos mesmos prismas da carroceria' },
  { par: ['cabine', 'teto'], motivo: 'o teto assenta no plano y 2145 da cabine, que sai dos mesmos prismas, sem folga' },
  { par: ['parabrisa', 'cabine'], motivo: 'a face de trás do para-brisa assenta na rampa da frente da cabine, no mesmo plano do prisma lateral' },
  { par: ['faixaParaBrisa', 'cabine'], motivo: 'a face de trás da faixa escura assenta na rampa da frente da cabine, abaixo do vidro' },
  { par: ['faixaParaBrisa', 'carroceria'], motivo: 'a aresta de baixo da faixa escura assenta no capô, em y 1412, no pé do para-brisa' },
  { par: ['parabrisa', 'faixaParaBrisa'], motivo: 'o vidro começa em y 1561, onde a faixa escura termina, na mesma rampa' },
  ...LADOS.flatMap((l) => [
    { par: [`vidroLateral${l}`, 'cabine'], motivo: 'a face de dentro do vidro assenta na face lateral inclinada da cabine, no mesmo plano da seção frontal' },
    { par: [`retrovisor${l}`, 'carroceria'], motivo: 'a face de dentro do retrovisor encosta na lateral da carroceria, em x 971 ou -971' },
    { par: [`retrovisor${l}`, 'cabine'], motivo: 'a face de dentro do retrovisor encosta na face lateral inclinada da cabine, na base da coluna' },
    { par: [`farol${l}`, 'carroceria'], motivo: 'a face de trás do farol assenta na face inclinada do nariz, no mesmo plano do prisma lateral' },
    { par: [`farolLateral${l}`, 'carroceria'], motivo: 'a face de dentro do farol lateral encosta na lateral da carroceria, em x 971 ou -971' },
    { par: [`farolLateral${l}`, `farol${l}`], motivo: 'o farol lateral e o da frente se encontram na quina do nariz, em x 971 ou -971' },
    { par: [`lanterna${l}`, 'carroceria'], motivo: 'a face da frente da lanterna encosta na face vertical de trás da carroceria, em z -2503' },
    { par: [`lanternaLateral${l}`, 'carroceria'], motivo: 'a face de dentro da lanterna lateral encosta na lateral da carroceria, em x 971 ou -971' },
    { par: [`lanternaLateral${l}`, `lanterna${l}`], motivo: 'a lanterna lateral e a de trás se encontram na quina de trás, em x 971 ou -971' },
    { par: [`paraLama${l}`, 'carroceria'], motivo: 'a face de cima da faixa cinza, em y 873,5, assenta sob a carroceria e o anel do arco encosta no arco recortado' },
    { par: [`paraLama${l}`, 'paraChoqueFrente'], motivo: 'a ponta da faixa, em z 2250, encosta na face de trás do para-choque da frente' },
    { par: [`paraLama${l}`, 'paraChoqueTras'], motivo: 'a ponta de trás da faixa, em z -1962, encosta na face da frente do para-choque de trás' },
    { par: [`paraLama${l}`, 'fasciaFrente'], motivo: 'a face de cima da faixa, em y 706, assenta sob a fáscia da frente' },
  ]),
  ...LADOS.flatMap((l) => [
    { par: [`vidroLateral${l}`, 'carroceria'], motivo: 'a aresta de baixo do vidro, em y 1412 e x 971, toca a aresta de cima da lateral da carroceria' },
    { par: [`vidroLateral${l}`, `retrovisor${l}`], motivo: 'o vidro contorna o retrovisor: a face de trás dele, em z 791, e o topo, em y 1588, encostam no recorte' },
    { par: ['cabine', `lanterna${l}`], motivo: 'a aresta de baixo da cabine, em y 1412 e z -2503, toca a aresta de cima da lanterna de trás' },
    { par: ['cabine', `lanternaLateral${l}`], motivo: 'a aresta de baixo da cabine, em y 1412, toca a aresta de cima da lanterna lateral, em x 971 ou -971' },
  ]),
  { par: ['parabrisa', 'teto'], motivo: 'a aresta de cima do para-brisa, em y 2145, toca a face de baixo do teto, na rampa' },
  { par: ['carroceria', 'paraChoqueTras'], motivo: 'a face de cima do para-choque de trás, em y 873,5, assenta sob a carroceria' },
  { par: ['engate', 'paraChoqueTras'], motivo: 'a face de cima do engate, em y 353, assenta sob o para-choque de trás, de z -2051 a -1962' },
  { par: ['fasciaFrente', 'grade'], motivo: 'a aresta de baixo da grade, em y 873,5, toca a face da frente da fáscia, em z 2250' },
  { par: ['grade', 'carroceria'], motivo: 'a face de trás da grade assenta na face inclinada do nariz, no mesmo plano do prisma lateral' },
  { par: ['placaFrente', 'paraChoqueFrente'], motivo: 'a face de trás da placa encosta na face da frente do para-choque, em z 2427' },
  { par: ['fasciaFrente', 'carroceria'], motivo: 'a face de cima da fáscia assenta sob o nariz da carroceria, em y 873,5' },
  { par: ['fasciaFrente', 'paraChoqueFrente'], motivo: 'a fáscia e o para-choque da frente se encontram pela aresta em y 706, z 2250' },
  { par: ['solario', 'teto'], motivo: 'a face de baixo do teto solar assenta no teto plano, em y 2283' },
  { par: ['vidroTras', 'cabine'], motivo: 'a face de dentro do vidro assenta na face inclinada de trás da cabine, no plano do prisma lateral' },
  ...PONTAS.flatMap((p) => [
    { par: ['carroceria', `caixaRoda${p}`], motivo: 'as faces do arco da caixa são as mesmas do recorte do arco no perfil da carroceria' },
    ...LADOS.flatMap((l) => [
      { par: [`caixaRoda${p}`, `paraLama${l}`], motivo: 'a face lateral da caixa, em x 441 ou -441, encosta na face de dentro da faixa cinza' },
      { par: [`caixaRoda${p}`, `roda${p}${l}`], motivo: 'a face de dentro do pneu, em x 441 ou -441, encosta na face lateral da caixa de roda' },
      { par: [`roda${p}${l}`, `aro${p}${l}`], motivo: 'a face de dentro do aro encosta na face de fora do pneu, no disco do centro' },
    ]),
  ]),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const tol = 1;
  const { yBase } = derivar(T);
  const xFora = T.roda_x + T.roda_largura / 2;
  return [
    { nome: 'canto de trás, embaixo, da carroceria', parte: 'carroceria', medida: 'minimo', em: [-T.meia_largura, yBase, T.traseira_z], toleranciaMm: tol },
    { nome: 'canto da frente, na cintura, da carroceria', parte: 'carroceria', medida: 'maximo', em: [T.meia_largura, T.y_cintura, T.nariz_z], toleranciaMm: tol },
    { nome: 'topo do teto, na frente', parte: 'teto', medida: 'maximo', em: [meiaLarguraEm(T, T.y_vidro_topo), T.y_teto, zParabrisaEm(T, T.y_vidro_topo)], toleranciaMm: tol },
    { nome: 'fim do teto, atrás, embaixo', parte: 'teto', medida: 'minimo', em: [-meiaLarguraEm(T, T.y_vidro_topo), T.y_vidro_topo, zTrasEm(T, T.y_vidro_topo)], toleranciaMm: tol },
    { nome: 'ponta da frente da placa', parte: 'placaFrente', medida: 'maximo', em: [T.placa_meia, T.placa_y1, T.pc_frente_z + T.placa_prof], toleranciaMm: tol },
    { nome: 'ponta do retrovisor direito', parte: 'retrovisorDir', medida: 'maximo', em: [T.retrovisor_x1, T.retrovisor_y1, T.retrovisor_z1], toleranciaMm: tol },
    { nome: 'ponta de trás do para-choque de trás', parte: 'paraChoqueTras', medida: 'minimo', em: [-T.pc_tras_meia, T.faixa_fundo_y, T.pc_tras_z], toleranciaMm: tol },
    { nome: 'canto da frente da faixa direita', parte: 'paraLamaDir', medida: 'maximo', em: [T.faixa_x1, T.roda_raio + T.arco_raio, T.faixa_frente_z], toleranciaMm: tol },
    { nome: 'pneu da frente, à direita, na frente', parte: 'rodaFrenteDir', medida: 'maximo', em: [xFora, 2 * T.roda_raio, T.roda_z_frente + T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, embaixo', parte: 'rodaTrasEsq', medida: 'minimo', em: [-xFora, 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'teto solar, canto da frente à direita', parte: 'solario', medida: 'maximo', em: [T.solario[2][0], T.y_teto + T.solario_espessura, T.solario[5][1]], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'carro-suv-luxo', desc: 'SUV laranja de brinquedo, com cabine afunilada, teto solar, faixa lateral cinza com arcos de roda, rodas grandes de aro cinza e para-choques, recriada do modelo suv-luxury do pacote A, de autor A em primitivas do núcleo' },
  PARAMS: TABELA,
  MATERIAIS: {
    laranja: { tipo: 'liso', cor: '#ffb040' },
    laranjaCabine: { tipo: 'liso', cor: '#ffc050' },
    laranjaTeto: { tipo: 'liso', cor: '#ffd060' },
    vidro: { tipo: 'liso', cor: '#e0f0ff' },
    faixaEscura: { tipo: 'liso', cor: '#707090' },
    branco: { tipo: 'liso', cor: '#f8f8f8' },
    cinza: { tipo: 'liso', cor: '#707080' },
    cinzaEscuro: { tipo: 'liso', cor: '#60606c' },
    caixaRoda: { tipo: 'liso', cor: '#303040' },
    placa: { tipo: 'liso', cor: '#d8d8e4' },
    pneu: { tipo: 'liso', cor: '#26262c' },
    aro: { tipo: 'metal', cor: '#8080a0', acabamento: 'escovado' },
    amarelo: { tipo: 'liso', cor: '#ffd030' },
    lanterna: { tipo: 'liso', cor: '#e84838' },
  },
  TOPO: { origem: 'chão, no meio do carro em x e em z; y para cima e a frente do carro em +z' },
  PLANO: {
    objeto: 'SUV de brinquedo de 5030 mm de comprimento, 2648 mm de largura com espelhos e 2295 mm de altura com o teto solar, laranja, cabine afunilada com teto solar, faixa lateral cinza com arcos, rodas grandes e para-choques',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do SUV, de z -2515 a 2515', milimetros: 5030 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'corpo laranja de y 873,5 à cintura em y 1412, 1942 mm de largura, com nariz inclinado, capô plano, traseira vertical e arcos de roda de raio 688', tecnica: 'interseção do perfil lateral extrudado em x, com os arcos no próprio perfil, da seção frontal extrudada em z e de uma caixa de recorte em y' },
      { nome: 'cabine', forma: 'estufa laranja de y 1412 a 2145, com o para-brisa em rampa e a traseira inclinada, que afunila de 971 para 824 de meia largura', tecnica: 'interseção do mesmo perfil lateral, da mesma seção frontal e de uma caixa de recorte em y' },
      { nome: 'teto', forma: 'faixa de y 2145 a 2283 em laranja mais claro, com chanfro atrás, afunilando de 824 para 794 de meia largura', tecnica: 'interseção do mesmo perfil lateral, da mesma seção frontal e de uma caixa de recorte em y' },
      { nome: 'parabrisa', forma: 'vidro azul claro de 12 mm sobre a rampa do para-brisa, de y 1561 a 2145, em trapézio recuado 176 mm da borda da cabine', tecnica: 'interseção de uma faixa fina em rampa extrudada em x com o trapézio extrudado em z' },
      { nome: 'faixaParaBrisa', forma: 'faixa escura de 12 mm no pé do para-brisa, de y 1412 a 1561, com a mesma moldura', tecnica: 'interseção de uma faixa fina em rampa extrudada em x com o trapézio extrudado em z' },
      { nome: 'vidroLateralDir', forma: 'janela azul clara de 12 mm na lateral direita da cabine, de z -131 até a rampa recuada, de y 1412 a 2145', tecnica: 'interseção de uma faixa fina sobre a face inclinada extrudada em z com o contorno da janela extrudado em x' },
      { nome: 'vidroLateralEsq', forma: 'janela azul clara de 12 mm na lateral esquerda da cabine, de z -131 até a rampa recuada, de y 1412 a 2145', tecnica: 'interseção de uma faixa fina sobre a face inclinada extrudada em z com o contorno da janela extrudado em x' },
      { nome: 'vidroTras', forma: 'vidro azul claro de 12 mm sobre a face inclinada de trás, de y 1853 a 2131, em trapézio recuado 176 mm', tecnica: 'interseção de uma faixa fina em rampa extrudada em x com o trapézio extrudado em z' },
      { nome: 'solario', forma: 'placa branca de 12 mm sobre o teto, de x -618 a 618 e z -131 a 486, com os cantos cortados', tecnica: 'extrusão em y do contorno em planta' },
      { nome: 'retrovisorDir', forma: 'caixa laranja de 176 mm em z, de z 791 a 967, que sai da lateral até x 1324 e sobe com o topo inclinado até y 1588', tecnica: 'extrusão em z de um pentágono (x, y) colado à carroceria e à cabine' },
      { nome: 'retrovisorEsq', forma: 'caixa laranja de 176 mm em z, de z 791 a 967, que sai da lateral até x -1324 e sobe com o topo inclinado até y 1588', tecnica: 'extrusão em z de um pentágono (x, y) colado à carroceria e à cabine' },
      { nome: 'paraLamaDir', forma: 'faixa cinza lateral de x 441 a 1147, de y 353 até os anéis dos arcos em y 1217, de z -1962 a 2250, com o furo de cada pneu', tecnica: 'extrusão em x de um perfil lateral com os anéis dos arcos e os furos dos pneus no próprio contorno' },
      { nome: 'paraLamaEsq', forma: 'faixa cinza lateral de x -1147 a -441, de y 353 até os anéis dos arcos em y 1217, de z -1962 a 2250, com o furo de cada pneu', tecnica: 'extrusão em x de um perfil lateral com os anéis dos arcos e os furos dos pneus no próprio contorno' },
      { nome: 'caixaRodaFrente', forma: 'fundo escuro do arco da roda da frente, entre as faces de dentro dos pneus, em x -441 a 441', tecnica: 'extrusão em x do mesmo polígono do arco recortado no perfil' },
      { nome: 'caixaRodaTras', forma: 'fundo escuro do arco da roda de trás, entre as faces de dentro dos pneus, em x -441 a 441', tecnica: 'extrusão em x do mesmo polígono do arco recortado no perfil' },
      { nome: 'paraChoqueFrente', forma: 'bloco cinza de y 353 a 706, de z 2250 a 2427, com as quinas chanfradas até x 1147', tecnica: 'extrusão em y da planta chanfrada' },
      { nome: 'fasciaFrente', forma: 'faixa cinza escura de y 706 a 873,5 sob o nariz, de z 2051 a 2250, 1942 mm de largura', tecnica: 'extrusão em y de um retângulo em planta' },
      { nome: 'paraChoqueTras', forma: 'bloco cinza de y 353 a 873,5 atrás, de z -1962 a -2500, de x -912 a 912, com a face de trás inclinada', tecnica: 'extrusão em x do perfil lateral' },
      { nome: 'engate', forma: 'octógono cinza claro de 618 mm de largura, de y 221 a 353 e z -2051 a -1962, sob o para-choque de trás', tecnica: 'extrusão em z do contorno em (x, y)' },
      { nome: 'placaFrente', forma: 'placa clara octogonal de 618 por 309 por 88 mm, de y 265 a 574, saindo do para-choque da frente até z 2515', tecnica: 'extrusão em z do octógono' },
      { nome: 'grade', forma: 'placa escura de x -364 a 364, de y 873,5 a 1147, sobre a face inclinada do nariz', tecnica: 'extrusão em x de uma faixa fina em rampa' },
      { nome: 'farolDir', forma: 'placa amarela de 10 mm, de x 490 a 971 e y 1147 a 1280, sobre a face inclinada do nariz à direita', tecnica: 'extrusão em x de uma faixa fina em rampa' },
      { nome: 'farolEsq', forma: 'placa amarela de 10 mm, de x -971 a -490 e y 1147 a 1280, sobre a face inclinada do nariz à esquerda', tecnica: 'extrusão em x de uma faixa fina em rampa' },
      { nome: 'farolLateralDir', forma: 'placa amarela de 10 mm na lateral direita, de x 971 a 981, que dobra a quina do farol por 176 mm em z', tecnica: 'extrusão em x de um trapézio' },
      { nome: 'farolLateralEsq', forma: 'placa amarela de 10 mm na lateral esquerda, de x -981 a -971, que dobra a quina do farol por 176 mm em z', tecnica: 'extrusão em x de um trapézio' },
      { nome: 'lanternaDir', forma: 'placa vermelha de 12 mm na face de trás, de x 618 a 971 e y 1235 a 1412', tecnica: 'extrusão em z de um retângulo' },
      { nome: 'lanternaEsq', forma: 'placa vermelha de 12 mm na face de trás, de x -971 a -618 e y 1235 a 1412', tecnica: 'extrusão em z de um retângulo' },
      { nome: 'lanternaLateralDir', forma: 'placa vermelha de 12 mm na lateral direita, de x 971 a 983, que dobra o canto de trás por 176 mm em z', tecnica: 'extrusão em x de um retângulo' },
      { nome: 'lanternaLateralEsq', forma: 'placa vermelha de 12 mm na lateral esquerda, de x -983 a -971, que dobra o canto de trás por 176 mm em z', tecnica: 'extrusão em x de um retângulo' },
      { nome: 'rodaFrenteEsq', forma: 'pneu escuro de 1059 mm de diâmetro e 618 mm de largura, de 24 lados, na frente à esquerda', tecnica: 'cilindro com eixo x' },
      { nome: 'rodaFrenteDir', forma: 'pneu escuro de 1059 mm de diâmetro e 618 mm de largura, de 24 lados, na frente à direita', tecnica: 'cilindro com eixo x' },
      { nome: 'rodaTrasEsq', forma: 'pneu escuro de 1059 mm de diâmetro e 618 mm de largura, de 24 lados, atrás à esquerda', tecnica: 'cilindro com eixo x' },
      { nome: 'rodaTrasDir', forma: 'pneu escuro de 1059 mm de diâmetro e 618 mm de largura, de 24 lados, atrás à direita', tecnica: 'cilindro com eixo x' },
      { nome: 'aroFrenteEsq', forma: 'disco cinza de 660 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu da frente à esquerda', tecnica: 'cilindro com eixo x' },
      { nome: 'aroFrenteDir', forma: 'disco cinza de 660 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu da frente à direita', tecnica: 'cilindro com eixo x' },
      { nome: 'aroTrasEsq', forma: 'disco cinza de 660 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu de trás à esquerda', tecnica: 'cilindro com eixo x' },
      { nome: 'aroTrasDir', forma: 'disco cinza de 660 mm de diâmetro e 30 mm de espessura, saindo da face de fora do pneu de trás à direita', tecnica: 'cilindro com eixo x' },
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 5030 mm de comprimento, 2648 mm de largura com espelhos ou 2295 mm de altura, ou alguma roda não toca o chão',
      'um lado do carro difere do outro em medida ou posição de peça simétrica',
      'a cabine tem a largura da carroceria em cima, sem afunilar de 971 para 794 mm de meia largura, ou não assenta na carroceria',
      'alguma roda não aparece dentro de um arco recortado, não tem a faixa cinza em volta ou não tem caixa de roda que a prenda à carroceria',
      'o para-brisa não é uma rampa, o teto não vai quase até a traseira ou a traseira não é inclinada em cima e vertical embaixo',
      'o para-brisa, os vidros e o teto solar não são placas claras sobre as faces, ou a janela lateral cobre a cabine inteira',
      'a grade, os faróis, as lanternas, a placa ou os para-choques não estão encostados nas faces de frente e de trás do carro',
      'a silhueta lateral ou frontal não confere com a referência, ou a folha comparativa mostra diferença visível de seção ou de perfil',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
