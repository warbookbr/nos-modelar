/* jipe-aberto — jipe aberto de poucos polígonos: banheira verde baixa sem teto nem portas, para-brisa inclinado com moldura e vidro, arco de
 * segurança em barras grossas, dois bancos de assento e encosto, para-lamas planos e escuros em faixa, grade com faróis hexagonais, para-choques
 * escuros e quatro rodas octogonais de pneu escuro com calota cinza.
 *
 * Origem: recriação em primitivas do modelo "Jipe" do pacote D (autor D, repositório de modelos livres, licença livre sem exigência de crédito,
 * endereço omitido). A malha original (Jipe.fbx) NÃO está no repositório: fica em
 * importados/veiculos-livres/pacote-d/Jipe.fbx, ignorada pelo git. O que está em referencias/ são as vistas (fonte-vistas.png) e as silhuetas em
 * fatias (fonte-partes.json). As medidas desta TABELA foram lidas das vistas e dos vértices da malha (escala de 3900 mm de comprimento).
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do jipe em +z, x para a direita de quem olha o jipe de frente, origem no chão
 * e centrada em x e em z. A TABELA é em milímetro e é a única fonte de medida; `derivar` calcula as partes, `gerarPassos` escreve forma, corte,
 * `parte` e `material`, e a conversão para metro fica só em `m`.
 *
 * Técnica: cada volume da carroceria é a interseção de prismas. O perfil lateral (z, y) é extrudado em x; a planta (x, z), extrudada em y,
 * recorta a largura (o casco recua até a face de dentro dos pneus nos vãos das rodas, e os para-lamas afinam em planta); a seção frontal
 * (x, y), extrudada em z, dá o afunilamento do para-brisa. As partes que se encontram saem dos mesmos números da TABELA, e por isso as faces
 * de encontro são o mesmo plano. Não há booleana de subtração nem `unir`: o interior da banheira, o vão do arco e o recuo do casco saem do
 * contorno. O mapeamento do núcleo, medido: eixo 'x' leva [u, v] a y = -u e z = v; eixo 'z' leva [u, v] a x = u e y = -v; eixo 'y' leva
 * [u, v] a x = u e z = v. */

export const TABELA = {
  // larguras e níveis da carroceria
  corpo_meia: 1020, // meia largura do casco, do capô e das paredes
  base_y: 340, // fundo do casco
  piso_y: 652, // face de cima do piso, entre o painel do capô e o painel atrás dos bancos
  capo_base_y: 933, // face de baixo do capô; é também o topo do pneu
  capo_frente_y: 1275, // topo do capô na face da frente
  capo_cowl_y: 1312, // topo do capô junto do para-brisa
  capo_z1: 1821, // face da frente do capô e do casco
  capo_z0: 535, // painel de trás do capô (a frente do vão dos bancos)
  capo_cowl_z: 637, // onde o topo do capô chega ao pé de trás do para-brisa

  // vãos das rodas: o casco recua até a face de dentro dos pneus entre estes limites em z
  casco_meia_roda: 892,
  vao_frente_z0: 810,
  vao_tras_z1: -578,
  vao_tras_z0: -1621,

  // banheira de trás: piso da caçamba, paredes e painel atrás dos bancos
  piso_tras_y: 1038,
  tras_topo_y: 1316,
  parede_meia_dentro: 874, // as paredes laterais vão de x 874 até a lateral do casco
  fundo_z: -1789, // face de dentro do painel de trás
  painel_tras_z: -652, // face de trás do painel atrás dos bancos
  painel_inclinado: [[-365, 652], [-529, 1324]], // a face da frente do painel atrás dos bancos, inclinada para trás
  traseira_face: [[-1928, 985], [-1895, 1312]], // a face de trás, que recua em cima e embaixo
  traseira_fundo: [[-1928, 985], [-1862, 340]],
  traseira_base_y: 628, // o para-choque de trás sobe até aqui

  // para-brisa: laje inclinada para trás, de largura que afina para cima; o vidro é uma placa na face da frente
  pb_frente: [[637, 1312], [428, 1880]], // a face da frente da laje
  pb_tras: [[535, 1301], [337, 1898]], // a face de trás da laje
  pb_meia_base: 1006,
  pb_meia_topo: 920,
  pb_vidro_esp: 12,
  pb_vidro_folga: 55, // moldura em volta do vidro, em x e em y

  // bancos: um por lado, perfil em L com assento e encosto inclinado
  banco_x0: 234,
  banco_x1: 910,
  banco_perfil: [[314, 652], [314, 834], [-191, 834], [-354, 1502], [-524, 1494], [-362, 652]],

  // arco de segurança: dois postes, uma travessa e duas barras que descem para trás até o topo das paredes
  arco_x0: 644,
  arco_x1: 843,
  arco_z0: -652,
  arco_z1: -828,
  arco_topo_y: 1891,
  travessa_y0: 1725,
  arco_diag_sup: [[-837, 1891], [-1666, 1311]], // a reta de cima da barra inclinada, em (z, y)
  arco_diag_inf: [[-837, 1725], [-1517, 1247]], // a reta de baixo
  arco_diag_planta: [[644, -661], [843, -661], [997, -1719], [892, -1719]], // a planta da barra, de x e z, do lado direito

  // para-lamas planos: uma faixa escura por lado que liga o para-lama da frente, o estribo e o para-lama de trás; perfil lateral em (z, y)
  faixa_x1: 1293,
  faixa_perfil: [[1881, 1083], [865, 1083], [731, 447], [-471, 447], [-603, 1067], [-1566, 1062], [-1650, 628],
    [-1591, 628], [-1510, 990], [-660, 996], [-528, 375], [771, 375], [906, 1012], [1881, 1012]],
  faixa_planta: [[1020, 1881], [1293, 1881], [1293, 731], [1203, -471], [1238, -603], [1238, -1566], [1040, -1667], [1020, -1667]], // a ponta de trás desce até o topo do para-choque, y 628

  // grade (quadro escuro sobre a face da frente), para-choques e faróis
  grade_meia: 550,
  grade_vao_meia: 351,
  grade_vao_y1: 830,
  grade_topo_y: 1028,
  grade_prof: 85,
  pc_y0: 280,
  pc_y1: 628,
  pc_frente_meia: 1086,
  pc_frente_z1: 1950,
  pc_tras_meia: 1159,
  pc_tras_z1: -1950,
  farol_x: 775,
  farol_y: 1107,
  farol_meia_larg: 115,
  farol_meia_alt: 124,
  farol_meia_lado: 41,
  farol_prof: 30,
  lanterna_x0: 642,
  lanterna_x1: 1006,
  lanterna_y0: 1104,
  lanterna_y1: 1304,
  lanterna_esp: 12,

  // rodas octogonais de vértice para cima: o raio é o do círculo que passa pelos vértices; a face de dentro do pneu fica em x 892
  roda_raio: 466.5,
  roda_yc: 466.5,
  roda_largura: 366,
  roda_x_dentro: 892,
  roda_z_frente: 1339,
  roda_z_tras: -1090,
  roda_lados: 8,
  calota_raio: 329,
  calota_esp: 12,
};

const m = (mm) => mm / 1000;

const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* Perfis do núcleo, em metro, no sentido anti-horário de [u, v]. */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]); // eixo 'x'
const perfilFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y])).map(([u, v]) => [m(u), m(v)]); // eixo 'z'
const perfilPlanta = (xz) => antihorario(xz.map(([x, z]) => [x, z])).map(([u, v]) => [m(u), m(v)]); // eixo 'y'

/* A reta que passa por dois pontos (z, y): o y em um z, e o z em um y. */
const yNaReta = ([[z0, y0], [z1, y1]], z) => y0 + ((z - z0) * (y1 - y0)) / (z1 - z0);
const zNaReta = ([[z0, y0], [z1, y1]], y) => z0 + ((y - y0) * (z1 - z0)) / (y1 - y0);

/* Espelha o intervalo de x e os pontos de planta para o lado esquerdo. */
const intervalo = (s, [a, b]) => (s > 0 ? [a, b] : [-b, -a]);
const plantaDoLado = (s, pts) => pts.map(([x, z]) => [s * x, z]);
const retangulo = (z0, z1, y0, y1) => [[z0, y0], [z0, y1], [z1, y1], [z1, y0]];

/* Partes em milímetro. `prisma`: perfil lateral extrudado de x0 a x1, opcionalmente cortado pela planta (extrudada em y) ou pela seção frontal
 * (extrudada em z) e por uma faixa de y; `extrusaoZ`: perfil (x, y) extrudado em z; `roda`: cilindro de eixo x. */
export function derivar(T) {
  const L = [];
  const prisma = (nome, material, lado, x, extra, forma, tecnica) => L.push({ nome, material, tipo: 'prisma', lado, x, ...extra, forma, tecnica });
  const zFundo = (y) => zNaReta(T.traseira_face, y);
  const zPainel = (y) => zNaReta(T.painel_inclinado, y);
  const M = T.corpo_meia;
  const R = T.casco_meia_roda;

  // capô: laje de y 933 ao topo, de z 535 a 1821
  prisma('capo', 'verde',
    [[T.capo_z1, T.capo_base_y], [T.capo_z1, T.capo_frente_y], [T.capo_cowl_z, T.capo_cowl_y], [T.capo_z0, T.pb_tras[0][1]], [T.capo_z0, T.capo_base_y]],
    [-M, M], {},
    'capô de 2040 mm de largura, de y 933 ao topo (1275 na frente, 1312 junto do para-brisa), de z 535 a 1821, com a face da frente plana',
    'extrusão em x de um perfil lateral que sobe da frente para o para-brisa');

  // casco: o fundo, a frente baixa, o piso entre os bancos e o fundo da caçamba, recuado até x 892 nos vãos das rodas
  const casco = [
    [T.capo_z1, T.base_y], [T.capo_z1, T.capo_base_y], [T.capo_z0, T.capo_base_y], [T.capo_z0, T.piso_y],
    [T.painel_inclinado[0][0], T.piso_y], [zPainel(T.piso_tras_y), T.piso_tras_y],
    [zFundo(T.piso_tras_y), T.piso_tras_y], [T.traseira_face[0][0], T.traseira_face[0][1]],
    [zNaReta(T.traseira_fundo, T.traseira_base_y), T.traseira_base_y], [T.vao_tras_z0, T.traseira_base_y], [T.vao_tras_z0, T.base_y],
  ];
  const plantaCasco = [
    [-R, T.capo_z1], [R, T.capo_z1], [R, T.vao_frente_z0], [M, T.vao_frente_z0], [M, T.vao_tras_z1], [R, T.vao_tras_z1], [R, T.vao_tras_z0],
    [M, T.vao_tras_z0], [M, -1935], [-M, -1935], [-M, T.vao_tras_z0], [-R, T.vao_tras_z0], [-R, T.vao_tras_z1], [-M, T.vao_tras_z1],
    [-M, T.vao_frente_z0], [-R, T.vao_frente_z0],
  ];
  prisma('casco', 'verde', casco, [-M, M], { planta: plantaCasco },
    'casco baixo de y 340 ao piso (652 entre os bancos, 1038 no fundo da caçamba), com a frente de 1821, sem portas, que recua a x 892 nos vãos das rodas',
    'extrusão em x do perfil lateral, interseção com a planta que recua a largura nos vãos das rodas');

  // painel atrás dos bancos: inclinado para trás, de y 1038 ao topo
  prisma('paredeBancos', 'verde',
    [[zPainel(T.piso_tras_y), T.piso_tras_y], [zPainel(T.tras_topo_y), T.tras_topo_y], [T.painel_tras_z, T.tras_topo_y], [T.painel_tras_z, T.piso_tras_y]],
    [-M, M], {},
    'painel de 2040 mm de largura atrás dos bancos, com a face da frente inclinada para trás, de y 1038 a 1316',
    'extrusão em x de um quadrilátero lateral');

  // paredes da caçamba, uma por lado, e o painel de fundo
  const perfilParede = (zi) => [[zi, T.piso_tras_y], [zi, T.tras_topo_y], [zFundo(T.tras_topo_y), T.tras_topo_y], [zFundo(T.piso_tras_y), T.piso_tras_y]];
  for (const s of [1, -1]) {
    prisma(`paredeTras${s > 0 ? 'Dir' : 'Esq'}`, 'verde', perfilParede(T.painel_tras_z), intervalo(s, [T.parede_meia_dentro, M]), {},
      `parede ${s > 0 ? 'direita' : 'esquerda'} da caçamba, de 146 mm de espessura, de x 874 a 1020, de y 1038 a 1316 e de z -652 à face de trás`,
      'extrusão em x de um quadrilátero lateral');
  }
  prisma('paredeTrasFundo', 'verde', perfilParede(T.fundo_z), [-T.parede_meia_dentro, T.parede_meia_dentro], {},
    'painel de fundo da caçamba entre as paredes, de z -1789 à face de trás, de y 1038 a 1316',
    'extrusão em x de um quadrilátero lateral');

  // para-brisa: moldura em laje inclinada, afinando para cima, e o vidro azul claro na face da frente
  const lajePB = [T.pb_tras[0], T.pb_frente[0], T.pb_frente[1], T.pb_tras[1]];
  const secaoPB = (folga) => [
    [-(T.pb_meia_base - folga), T.pb_tras[0][1] - 1], [T.pb_meia_base - folga, T.pb_tras[0][1] - 1],
    [T.pb_meia_topo - folga, T.pb_tras[1][1] + 1], [-(T.pb_meia_topo - folga), T.pb_tras[1][1] + 1],
  ];
  prisma('parabrisaMoldura', 'verde', lajePB, [-T.pb_meia_base, T.pb_meia_base], { secao: secaoPB(0) },
    'laje de moldura da cor do carro, inclinada para trás, de y 1301 a 1898, 100 mm de espessura, de 2012 mm de largura embaixo e 1840 em cima',
    'extrusão em x do perfil lateral, interseção com a seção frontal trapezoidal');
  const e = T.pb_vidro_esp;
  const f = T.pb_vidro_folga;
  prisma('parabrisaVidro', 'vidro',
    [T.pb_frente[0], T.pb_frente[1], [T.pb_frente[1][0] + e, T.pb_frente[1][1]], [T.pb_frente[0][0] + e, T.pb_frente[0][1]]],
    [-T.pb_meia_base, T.pb_meia_base], { secao: secaoPB(f), caixaY: [T.pb_frente[0][1] + f, T.pb_frente[1][1] - f] },
    'placa de vidro azul clara de 12 mm sobre a face da frente da moldura, recuada 55 mm em volta',
    'extrusão em x do perfil lateral, interseção com a seção frontal recuada e com uma faixa de y');

  // bancos: perfil em L, um por lado
  for (const s of [1, -1]) {
    prisma(`banco${s > 0 ? 'Dir' : 'Esq'}`, 'marrom', T.banco_perfil, intervalo(s, [T.banco_x0, T.banco_x1]), {},
      `banco ${s > 0 ? 'direito' : 'esquerdo'} de 676 mm de largura, de x 234 a 910, com assento de y 652 a 834 e encosto inclinado até y 1502`,
      'extrusão em x de um perfil lateral em L');
  }

  // arco de segurança
  const zA0 = T.arco_z0;
  const zA1 = T.arco_z1;
  for (const s of [1, -1]) {
    prisma(`arcoPoste${s > 0 ? 'Dir' : 'Esq'}`, 'arco', retangulo(zA1, zA0, T.piso_tras_y, T.travessa_y0), intervalo(s, [T.arco_x0, T.arco_x1]), {},
      `poste ${s > 0 ? 'direito' : 'esquerdo'} do arco, de 199 mm em x e 176 em z, do piso da caçamba (y 1038) até a travessa (y 1725)`,
      'extrusão em x de um retângulo lateral');
  }
  prisma('arcoTravessa', 'arco', retangulo(zA1, zA0, T.travessa_y0, T.arco_topo_y), [-T.arco_x1, T.arco_x1], {},
    'travessa do arco, de 1686 mm, de y 1725 a 1891, ligando as duas pontas dos postes',
    'extrusão em x de um retângulo lateral');
  // a barra inclinada: reta de cima e de baixo, cortadas na face de trás do poste e no topo das paredes
  const yTopo = T.tras_topo_y;
  const barra = [
    [zA1, yNaReta(T.arco_diag_sup, zA1)], [zNaReta(T.arco_diag_sup, yTopo), yTopo], [zNaReta(T.arco_diag_inf, yTopo), yTopo], [zA1, yNaReta(T.arco_diag_inf, zA1)],
  ];
  for (const s of [1, -1]) {
    prisma(`arcoDiag${s > 0 ? 'Dir' : 'Esq'}`, 'arco', barra, intervalo(s, [T.arco_x0, 1000]), { planta: plantaDoLado(s, T.arco_diag_planta) },
      `barra ${s > 0 ? 'direita' : 'esquerda'} do arco, de 100 a 200 mm de seção, descendo da travessa para trás até o topo da parede da caçamba, em z -1605`,
      'extrusão em x do perfil lateral, interseção com a planta que afasta a barra para fora');
  }

  // para-lamas planos: a faixa escura lateral
  for (const s of [1, -1]) {
    prisma(`paraLama${s > 0 ? 'Dir' : 'Esq'}`, 'ferro', T.faixa_perfil, intervalo(s, [M, T.faixa_x1]), { planta: plantaDoLado(s, T.faixa_planta) },
      `faixa escura plana ${s > 0 ? 'direita' : 'esquerda'} de 70 mm de espessura, de x 1020 a 1293, sobre a roda da frente, descendo ao estribo (y 375 a 447) e subindo sobre a roda de trás`,
      'extrusão em x do perfil lateral, interseção com a planta que afina a faixa para trás');
  }

  // grade, para-choques
  const g = T.grade_meia;
  const v = T.grade_vao_meia;
  L.push({
    nome: 'grade', material: 'ferro', tipo: 'extrusaoZ',
    perfil: [[-g, T.pc_y1], [-g, T.grade_topo_y], [g, T.grade_topo_y], [g, T.pc_y1], [v, T.pc_y1], [v, T.grade_vao_y1], [-v, T.grade_vao_y1], [-v, T.pc_y1]],
    z: [T.capo_z1, T.capo_z1 + T.grade_prof],
    forma: 'quadro escuro em U invertido de 1100 mm de largura, de y 628 a 1028, com vão central de 702 por 202 mm, saindo 85 mm da face da frente',
    tecnica: 'extrusão em z de um perfil frontal em U',
  });
  prisma('paraChoqueFrente', 'ferro', retangulo(T.capo_z1, T.pc_frente_z1, T.pc_y0, T.pc_y1), [-T.pc_frente_meia, T.pc_frente_meia], {},
    'barra escura de 2172 mm, de y 280 a 628, de z 1821 a 1950, na frente do casco',
    'extrusão em x de um retângulo lateral');
  prisma('paraChoqueTras', 'ferro', retangulo(T.pc_tras_z1, T.vao_tras_z0, T.pc_y0, T.pc_y1), [-T.pc_tras_meia, T.pc_tras_meia], {},
    'bloco escuro de 2318 mm, de y 280 a 628, de z -1950 a -1621, sob a traseira',
    'extrusão em x de um retângulo lateral');

  // faróis hexagonais
  for (const s of [1, -1]) {
    const a = T.farol_meia_larg;
    const b = T.farol_meia_alt;
    const c = T.farol_meia_lado;
    const x = s * T.farol_x;
    L.push({
      nome: `farol${s > 0 ? 'Dir' : 'Esq'}`, material: 'branco', tipo: 'extrusaoZ',
      perfil: [[x - a, T.farol_y - c], [x, T.farol_y - b], [x + a, T.farol_y - c], [x + a, T.farol_y + c], [x, T.farol_y + b], [x - a, T.farol_y + c]],
      z: [T.capo_z1, T.capo_z1 + T.farol_prof],
      forma: `farol hexagonal branco de 230 por 248 mm, de 30 mm de espessura, na face da frente do capô, ${s > 0 ? 'à direita' : 'à esquerda'}`,
      tecnica: 'extrusão em z de um hexágono',
    });
  }
  // lanternas: placas na face de trás
  for (const s of [1, -1]) {
    prisma(`lanterna${s > 0 ? 'Dir' : 'Esq'}`, 'vermelho',
      [[zFundo(T.lanterna_y0), T.lanterna_y0], [zFundo(T.lanterna_y1), T.lanterna_y1], [zFundo(T.lanterna_y1) - T.lanterna_esp, T.lanterna_y1], [zFundo(T.lanterna_y0) - T.lanterna_esp, T.lanterna_y0]],
      intervalo(s, [T.lanterna_x0, T.lanterna_x1]), {},
      `lanterna vermelha ${s > 0 ? 'direita' : 'esquerda'}, placa de 364 por 200 mm e 12 mm de espessura na face de trás, de x 642 a 1006`,
      'extrusão em x de um paralelogramo lateral sobre a face de trás');
  }

  // rodas e calotas
  const rodas = [];
  for (const s of [1, -1]) for (const [ponta, zc] of [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]]) rodas.push({ s, lado: s > 0 ? 'Dir' : 'Esq', ponta, zc });
  const xFora = T.roda_x_dentro + T.roda_largura;
  for (const r of rodas) {
    L.push({
      nome: `roda${r.ponta}${r.lado}`, material: 'pneu', tipo: 'roda', raio: T.roda_raio, altura: T.roda_largura,
      x0: r.s > 0 ? T.roda_x_dentro : -xFora, yc: T.roda_yc, zc: r.zc,
      forma: `pneu escuro octogonal de vértice para cima, 933 mm de diâmetro e 366 mm de largura, de x ${r.s > 0 ? '892 a 1258' : '-1258 a -892'}, na ${r.ponta === 'Frente' ? 'frente' : 'trás'}`,
      tecnica: 'cilindro de eixo x com 8 lados',
    });
  }
  for (const r of rodas) {
    L.push({
      nome: `calota${r.ponta}${r.lado}`, material: 'calota', tipo: 'roda', raio: T.calota_raio, altura: T.calota_esp,
      x0: r.s > 0 ? xFora : -(xFora + T.calota_esp), yc: T.roda_yc, zc: r.zc,
      forma: `calota cinza octogonal de 658 mm de diâmetro e 12 mm de espessura sobre a face de fora do pneu ${r.ponta === 'Frente' ? 'da frente' : 'de trás'} ${r.s > 0 ? 'direito' : 'esquerdo'}`,
      tecnica: 'cilindro de eixo x com 8 lados sobre a face de fora do pneu',
    });
  }
  return L;
}

/* Um cilindro inteiro é a lateral mais as duas tampas. */
const cilindroInteiro = (id) => ({
  unir: [
    { origem: { op: 'cilindro', id } },
    { origem: { op: 'cilindro', id, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id, tampa: 'topo' } },
  ],
});

/* Os ids de bloco: a parte `k` leva 100 * (k + 1); os sólidos dela levam os seguintes e a interseção leva o 10º. */
const baseDe = (k) => 100 * (k + 1);

export const ALIASES = derivar(TABELA).flatMap((p, k) => (p.tipo === 'roda' ? [[`${p.nome}Inteiro`, cilindroInteiro(baseDe(k) + 1)]] : []));

/** Os PASSOS: cada parte com os sólidos que a geram, a `parte` e o `material` logo depois. */
export function gerarPassos(T) {
  const passos = [];
  const C = 2200; // o prisma de planta e o de seção atravessam o jipe inteiro
  derivar(T).forEach((p, k) => {
    const b = baseDe(k);
    let sel;
    if (p.tipo === 'prisma') {
      const [x0, x1] = p.x;
      passos.push(['extrusao', { origemId: b + 1, eixo: 'x', altura: m(x1 - x0), em: [m(x0), 0, 0], perfil: perfilLateral(p.lado) }]);
      const solidos = [{ origem: { op: 'extrusao', id: b + 1 } }];
      if (p.planta) {
        passos.push(['extrusao', { origemId: b + 2, eixo: 'y', altura: m(2 * C), em: [0, m(-C / 2), 0], perfil: perfilPlanta(p.planta) }]);
        solidos.push({ origem: { op: 'extrusao', id: b + 2 } });
      }
      if (p.secao) {
        passos.push(['extrusao', { origemId: b + 3, eixo: 'z', altura: m(2 * C), em: [0, 0, m(-C)], perfil: perfilFrontal(p.secao) }]);
        solidos.push({ origem: { op: 'extrusao', id: b + 3 } });
      }
      if (p.caixaY) {
        const [y0, y1] = p.caixaY;
        passos.push(['cubo', { origemId: b + 4, larg: m(2 * C), alt: m(y1 - y0), prof: m(2 * C), em: [0, m((y0 + y1) / 2 - (y1 - y0) / 2), 0] }]);
        solidos.push({ origem: { op: 'cubo', id: b + 4 } });
      }
      if (solidos.length > 1) {
        passos.push(['intersectar', { origemId: b + 10, solidos }]);
        sel = { origem: { op: 'intersectar', id: b + 10 } };
      } else {
        sel = { origem: { op: 'extrusao', id: b + 1 } };
      }
    } else if (p.tipo === 'extrusaoZ') {
      passos.push(['extrusao', { origemId: b + 1, eixo: 'z', altura: m(p.z[1] - p.z[0]), em: [0, 0, m(p.z[0])], perfil: perfilFrontal(p.perfil) }]);
      sel = { origem: { op: 'extrusao', id: b + 1 } };
    } else {
      passos.push(['cilindro', { origemId: b + 1, raio: m(p.raio), altura: m(p.altura), lados: T.roda_lados, eixo: 'x', em: [m(p.x0), m(p.yc), m(p.zc)] }]);
      sel = { alias: `${p.nome}Inteiro` };
    }
    passos.push(['parte', { nome: p.nome, sel }]);
    passos.push(['material', { sel, usa: p.material }]);
  });
  return passos;
}

/* Os contatos: cada par se toca pela face dita no motivo, em milímetro. */
export const CONTATOS = [
  { par: ['capo', 'casco'], motivo: 'a face de baixo do capô, em y 933, assenta na face de cima do casco, entre z 535 e 1821' },
  { par: ['casco', 'paredeBancos'], motivo: 'o painel atrás dos bancos assenta no fundo da caçamba, em y 1038, no casco' },
  { par: ['casco', 'paredeTrasEsq'], motivo: 'a parede esquerda da caçamba assenta no casco em y 1038, na faixa de x -892 a -874 e atrás da roda' },
  { par: ['casco', 'paredeTrasDir'], motivo: 'a parede direita da caçamba assenta no casco em y 1038, na faixa de x 874 a 892 e atrás da roda' },
  { par: ['casco', 'paredeTrasFundo'], motivo: 'o painel de fundo assenta no casco em y 1038' },
  { par: ['paredeBancos', 'paredeTrasEsq'], motivo: 'a parede esquerda encosta na face de trás do painel atrás dos bancos, em z -652' },
  { par: ['paredeBancos', 'paredeTrasDir'], motivo: 'a parede direita encosta na face de trás do painel atrás dos bancos, em z -652' },
  { par: ['paredeTrasFundo', 'paredeTrasEsq'], motivo: 'o painel de fundo encosta na face de dentro da parede esquerda, em x -874' },
  { par: ['paredeTrasFundo', 'paredeTrasDir'], motivo: 'o painel de fundo encosta na face de dentro da parede direita, em x 874' },
  { par: ['parabrisaMoldura', 'capo'], motivo: 'a base inclinada da moldura assenta no topo do capô, entre z 535 e 637' },
  { par: ['parabrisaVidro', 'parabrisaMoldura'], motivo: 'a face de trás do vidro encosta na face da frente da moldura, no plano inclinado do para-brisa' },
  { par: ['bancoEsq', 'casco'], motivo: 'o banco esquerdo assenta no piso, em y 652' },
  { par: ['bancoDir', 'casco'], motivo: 'o banco direito assenta no piso, em y 652' },
  { par: ['arcoPosteEsq', 'casco'], motivo: 'o pé do poste esquerdo assenta no fundo da caçamba, em y 1038' },
  { par: ['arcoPosteDir', 'casco'], motivo: 'o pé do poste direito assenta no fundo da caçamba, em y 1038' },
  { par: ['arcoPosteEsq', 'paredeBancos'], motivo: 'a face da frente do poste esquerdo encosta na face de trás do painel atrás dos bancos, em z -652' },
  { par: ['arcoPosteDir', 'paredeBancos'], motivo: 'a face da frente do poste direito encosta na face de trás do painel atrás dos bancos, em z -652' },
  { par: ['arcoPosteEsq', 'arcoTravessa'], motivo: 'a travessa assenta no topo do poste esquerdo, em y 1725' },
  { par: ['arcoPosteDir', 'arcoTravessa'], motivo: 'a travessa assenta no topo do poste direito, em y 1725' },
  { par: ['arcoDiagEsq', 'arcoTravessa'], motivo: 'a barra esquerda encosta na face de trás da travessa, em z -828' },
  { par: ['arcoDiagDir', 'arcoTravessa'], motivo: 'a barra direita encosta na face de trás da travessa, em z -828' },
  { par: ['arcoDiagEsq', 'paredeTrasEsq'], motivo: 'o pé da barra esquerda assenta no topo da parede da caçamba, em y 1316' },
  { par: ['arcoDiagDir', 'paredeTrasDir'], motivo: 'o pé da barra direita assenta no topo da parede da caçamba, em y 1316' },
  { par: ['paraLamaEsq', 'casco'], motivo: 'a face de dentro da faixa esquerda, em x -1020, encosta na lateral do casco, no estribo' },
  { par: ['paraLamaDir', 'casco'], motivo: 'a face de dentro da faixa direita, em x 1020, encosta na lateral do casco, no estribo' },
  { par: ['paraLamaEsq', 'capo'], motivo: 'a faixa esquerda sobre a roda da frente encosta na lateral do capô, em x -1020' },
  { par: ['paraLamaDir', 'capo'], motivo: 'a faixa direita sobre a roda da frente encosta na lateral do capô, em x 1020' },
  { par: ['paraLamaEsq', 'paredeTrasEsq'], motivo: 'a faixa esquerda sobre a roda de trás encosta na lateral da parede da caçamba, em x -1020' },
  { par: ['paraLamaDir', 'paredeTrasDir'], motivo: 'a faixa direita sobre a roda de trás encosta na lateral da parede da caçamba, em x 1020' },
  { par: ['capo', 'rodaFrenteEsq'], motivo: 'o topo do pneu da frente esquerdo, em y 933, toca a face de baixo do capô, na aresta do octógono' },
  { par: ['capo', 'rodaFrenteDir'], motivo: 'o topo do pneu da frente direito, em y 933, toca a face de baixo do capô, na aresta do octógono' },
  { par: ['paraLamaEsq', 'paredeBancos'], motivo: 'a subida de trás da faixa esquerda encosta na lateral do painel atrás dos bancos, em x -1020' },
  { par: ['paraLamaDir', 'paredeBancos'], motivo: 'a subida de trás da faixa direita encosta na lateral do painel atrás dos bancos, em x 1020' },
  { par: ['paraLamaEsq', 'paraChoqueTras'], motivo: 'a ponta de trás da faixa esquerda assenta no topo do para-choque de trás, em y 628' },
  { par: ['paraLamaDir', 'paraChoqueTras'], motivo: 'a ponta de trás da faixa direita assenta no topo do para-choque de trás, em y 628' },
  { par: ['grade', 'casco'], motivo: 'a face de trás da grade encosta na face da frente do casco, em z 1821' },
  { par: ['grade', 'capo'], motivo: 'a face de trás da grade encosta na face da frente do capô, em z 1821' },
  { par: ['grade', 'paraChoqueFrente'], motivo: 'os pés da grade assentam no topo do para-choque, em y 628' },
  { par: ['paraChoqueFrente', 'casco'], motivo: 'a face de trás do para-choque encosta na face da frente do casco, em z 1821' },
  { par: ['paraChoqueTras', 'casco'], motivo: 'o topo do bloco traseiro, em y 628, assenta sob o casco, e a face da frente encosta em z -1621' },
  { par: ['farolEsq', 'capo'], motivo: 'a face de trás do farol esquerdo encosta na face da frente do capô, em z 1821' },
  { par: ['farolDir', 'capo'], motivo: 'a face de trás do farol direito encosta na face da frente do capô, em z 1821' },
  { par: ['lanternaEsq', 'paredeTrasFundo'], motivo: 'a face da lanterna esquerda encosta na face de trás do painel de fundo, na parte de x -874 a -642' },
  { par: ['lanternaDir', 'paredeTrasFundo'], motivo: 'a face da lanterna direita encosta na face de trás do painel de fundo, na parte de x 642 a 874' },
  { par: ['lanternaEsq', 'paredeTrasEsq'], motivo: 'a face da lanterna esquerda encosta na face de trás da parede esquerda, de x -1006 a -874' },
  { par: ['lanternaDir', 'paredeTrasDir'], motivo: 'a face da lanterna direita encosta na face de trás da parede direita, de x 874 a 1006' },
  ...['Frente', 'Tras'].flatMap((ponta) => ['Esq', 'Dir'].flatMap((lado) => [
    { par: [`roda${ponta}${lado}`, 'casco'], motivo: 'a face de dentro do pneu, em x 892 ou -892, encosta na lateral do casco recuado no vão da roda' },
    { par: [`calota${ponta}${lado}`, `roda${ponta}${lado}`], motivo: 'a calota encosta na face de fora do pneu, em x 1258 ou -1258' },
  ])),
];

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const tol = 0.5;
  const xc = T.roda_x_dentro + T.roda_largura / 2;
  const xFora = T.roda_x_dentro + T.roda_largura;
  const M = T.corpo_meia;
  return [
    { nome: 'centro da roda dianteira esquerda', parte: 'rodaFrenteEsq', medida: 'centro', em: [-xc, T.roda_yc, T.roda_z_frente], toleranciaMm: tol },
    { nome: 'centro da roda dianteira direita', parte: 'rodaFrenteDir', medida: 'centro', em: [xc, T.roda_yc, T.roda_z_frente], toleranciaMm: tol },
    { nome: 'centro da roda traseira esquerda', parte: 'rodaTrasEsq', medida: 'centro', em: [-xc, T.roda_yc, T.roda_z_tras], toleranciaMm: tol },
    { nome: 'centro da roda traseira direita', parte: 'rodaTrasDir', medida: 'centro', em: [xc, T.roda_yc, T.roda_z_tras], toleranciaMm: tol },
    { nome: 'ponta alta da travessa do arco', parte: 'arcoTravessa', medida: 'maximo', em: [T.arco_x1, T.arco_topo_y, T.arco_z0], toleranciaMm: tol },
    { nome: 'canto de cima do para-brisa, na frente', parte: 'parabrisaMoldura', medida: 'maximo', em: [T.pb_meia_base, T.pb_tras[1][1], T.pb_frente[0][0]], toleranciaMm: tol },
    { nome: 'canto da frente e em cima do capô', parte: 'capo', medida: 'maximo', em: [M, T.capo_cowl_y, T.capo_z1], toleranciaMm: tol },
    { nome: 'canto de trás e embaixo do para-choque de trás', parte: 'paraChoqueTras', medida: 'minimo', em: [-T.pc_tras_meia, T.pc_y0, T.pc_tras_z1], toleranciaMm: tol },
    { nome: 'ponta da frente do para-choque da frente', parte: 'paraChoqueFrente', medida: 'maximo', em: [T.pc_frente_meia, T.pc_y1, T.pc_frente_z1], toleranciaMm: tol },
    { nome: 'ponta da faixa do para-lama direito sobre a roda da frente', parte: 'paraLamaDir', medida: 'maximo', em: [T.faixa_x1, 1083, 1881], toleranciaMm: tol },
    { nome: 'topo do encosto do banco direito', parte: 'bancoDir', medida: 'maximo', em: [T.banco_x1, 1502, 314], toleranciaMm: tol },
    { nome: 'face de fora da calota dianteira direita', parte: 'calotaFrenteDir', medida: 'maximo', em: [xFora + T.calota_esp, T.roda_yc + T.calota_raio, T.roda_z_frente + T.calota_raio], toleranciaMm: tol },
  ];
}

const receita = {
  meta: { nome: 'jipe-aberto', desc: 'jipe aberto de poucos polígonos: banheira verde sem teto, para-brisa inclinado, arco de segurança, bancos, para-lamas planos, grade e quatro rodas octogonais' },
  PARAMS: TABELA,
  MATERIAIS: {
    verde: { tipo: 'liso', cor: '#25cc00' },
    ferro: { tipo: 'liso', cor: '#2e2e2e' },
    arco: { tipo: 'liso', cor: '#2e2e2e' },
    vidro: { tipo: 'liso', cor: '#7cdbff' },
    marrom: { tipo: 'liso', cor: '#a07115' },
    pneu: { tipo: 'liso', cor: '#0d0d0d' },
    calota: { tipo: 'liso', cor: '#acacac' },
    branco: { tipo: 'liso', cor: '#f2f2f2' },
    vermelho: { tipo: 'liso', cor: '#cc0e03' },
  },
  TOPO: { origem: 'chão, no meio do jipe em x e em z; y para cima e a frente do jipe em +z' },
  PLANO: {
    objeto: 'jipe aberto de 2586 mm de largura, 1898 mm de altura e 3900 mm de comprimento, sem teto nem portas: banheira verde, para-brisa, arco, dois bancos, para-lamas planos, grade e quatro rodas octogonais',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento do jipe, de z -1950 a 1950', milimetros: 3900 },
    familia: 'veiculo',
    partes: derivar(TABELA).map((p) => ({ nome: p.nome, forma: p.forma, tecnica: p.tecnica })),
    criteriosDeReprovacao: [
      'o conjunto não mede 2586 por 1898 por 3900 mm, ou as rodas não tocam o chão em y 0',
      'o jipe não é simétrico em x, ou uma parte de um lado difere da do outro em medida ou posição',
      'o jipe tem teto, portas ou vidro lateral, ou a banheira está fechada sem piso baixo entre o painel do capô e o painel atrás dos bancos',
      'o para-brisa não é inclinado para trás, com moldura da cor do carro e vidro azul claro dentro, ou não afina para cima',
      'o arco de segurança não tem dois postes, uma travessa e duas barras inclinadas que descem para trás até o topo das paredes da caçamba',
      'os bancos são uma tábua de lado a lado, em vez de um por lado com assento e encosto inclinado',
      'os para-lamas são blocos, em vez de faixas escuras planas sobre as rodas, com estribo entre elas',
      'as rodas não são octogonais de vértice para cima, com a face de dentro do pneu encostada no casco',
      'uma parte prometida no plano não existe, ou uma parte existe sem promessa no plano',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
