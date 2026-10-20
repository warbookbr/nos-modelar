/* carro-sedan-angular — sedã de faces retas e angulares, recriado em primitivas do núcleo a partir do modelo "Sedan" do pacote D.
 *
 * Origem: modelo "Sedan" do pacote D (repositório de modelos livres, pacote-d, Sedan.fbx), de autor D, licença livre sem exigência de crédito
 * (domínio público), página endereço omitido. A malha original NÃO está no repositório: fica em
 * importados/veiculos-livres/pacote-d/Sedan.fbx, ignorada pelo git. O que entra aqui é a forma, lida de referencias/fonte-vistas.png e de
 * referencias/fonte-partes.json (gerados por modelo-de-referencia.mjs, em metro, escalados para 4,5 m de comprimento) e das listas de
 * medidas-da-fonte.mjs. Ver referencias/alvo.md para a lista do que não ficou igual.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, a frente do carro em +z e x para a direita de quem olha de frente. Centrado em x e
 * em z. A TABELA, em milímetro, é a única fonte das medidas; `derivar` transforma a tabela em itens (perfis e sólidos) e `gerarPassos`
 * escreve, por parte, a forma, a `parte` e o `material`. A conversão para metro está só em `m()`.
 *
 * Técnica. A carroceria de baixo, a estufa (vidros e coluna B) e o teto são, cada um, a INTERSEÇÃO de dois prismas: o perfil lateral
 * (z, y) da parte, extrudado em x, e a seção frontal (x, y) do carro, extrudada em z. A seção frontal dá o afunilamento da cabine (de
 * 962 mm de meia largura no vinco a 820 mm no teto) e a saia que recolhe embaixo; o perfil lateral dá o nariz, o capô, o para-brisa, o
 * teto e a traseira. Como todas as partes saem do mesmo prisma de seção, as faces em que se encontram são o mesmo plano e o contato fecha
 * sem folga. Os arcos de roda são recortados no próprio perfil lateral da carroceria (sem booleana) e cada eixo tem uma caixa de roda
 * escura, o mesmo arco extrudado entre as faces de dentro dos pneus. Rodas são cilindros de 8 lados com eixo em x (vértice em cima e
 * embaixo, como na fonte), com um disco cinza de 12 mm na face de fora. Faróis e lanternas são placas finas sobre as faces inclinadas do
 * nariz e da traseira. Nada é arredondado: a fonte é facetada.
 */

export const TABELA = {
  /* medidas gerais, lidas da fonte */
  comprimento_meia: 2250,          // z de -2250 (traseira) a 2250 (frente)
  cintura_y: 1064,                 // topo da carroceria de baixo, onde o para-brisa e a traseira assentam
  teto_y: 1513,

  /* seção frontal (meia largura por altura): saia, vinco e topo do teto; o prisma passa além, pela mesma reta, para que nenhum plano y
   * de corte de uma parte coincida com a face do prisma */
  secao_base: [897, 190],          // [x, y] da saia, no chão da carroceria
  secao_vinco: [962, 765],         // [x, y] do ponto mais largo da carroceria
  secao_topo_x: 820,               // x do teto, em y 1513
  secao_folga_y: 100,              // quanto o prisma passa abaixo da saia e acima do teto

  /* perfil lateral da carroceria de baixo, em z e y: nariz, capô, base do para-brisa, porta-malas, traseira */
  nariz_base: [2190, 190],
  nariz_ponta: [2250, 725],        // topo do para-choque, ponto mais à frente
  capo_frente: [2168, 943],        // quina entre a face inclinada do nariz e o capô
  parabrisa_base_z: 1065,          // z do pé do para-brisa, em y = cintura
  traseira_cima_z: -2224,          // z da quina de cima da traseira, em y = cintura
  traseira_ponta: [-2250, 725],
  traseira_base: [-2202, 190],

  /* estufa: o teto é uma placa de 40 mm; para-brisa e vidro traseiro são a face inclinada da estufa */
  teto_frente_z: 417,              // z da quina de cima do para-brisa, em y 1513
  teto_tras_z: -976,               // z da quina de cima do vidro traseiro, em y 1513
  vidro_tras_base_z: -1365,        // z do pé do vidro traseiro, em y = cintura
  teto_espessura: 40,
  colunaB_z_base: -235,            // z do eixo da coluna B na cintura
  colunaB_z_topo: -285,            // z do eixo da coluna B na base do teto
  colunaB_largura: 65,

  /* rodas: o centro no chão é o raio (o vértice de baixo do octógono encosta no chão) */
  roda_raio: 328,
  roda_largura: 188,
  aro_espessura: 12,
  aro_raio: 235,
  roda_x_fora: 974,                // face de fora do disco, em x
  roda_z_frente: 1266,
  roda_z_tras: -1266,
  arco_folga: 45,                  // folga entre o pneu e a borda do arco, no raio

  /* faróis, na face inclinada do nariz, e lanternas, na face de trás */
  farol_x_dentro: 570,
  farol_x_fora: 920,
  farol_y0: 802,
  farol_y1: 943,
  lanterna_x_dentro: 650,
  lanterna_x_fora: 900,
  lanterna_y0: 880,
  lanterna_y1: 1030,
  placa_espessura: 10,
};

/* ---------- geometria em milímetro ---------- */

const lerpEm = (p, q, y) => [p[0] + ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]), y];   // ponto da reta pq na altura y, em [z, y]
const xNaReta = (p, q, y) => p[0] + ((q[0] - p[0]) * (y - p[1])) / (q[1] - p[1]);       // idem, para a seção em [x, y]

/* Meia seção frontal, em [x, y], de baixo para cima. A saia (secao_base) cai sobre a reta do primeiro trecho e não é vértice. */
function meiaSecao(T) {
  const yBaixo = T.secao_base[1] - T.secao_folga_y;
  const yAlto = T.teto_y + T.secao_folga_y;
  const topo = [T.secao_topo_x, T.teto_y];
  return [[xNaReta(T.secao_base, T.secao_vinco, yBaixo), yBaixo], T.secao_vinco, [xNaReta(T.secao_vinco, topo, yAlto), yAlto]];
}

/* O arco de roda no perfil lateral: o octógono de 8 lados (vértices nos múltiplos de 45 graus, como o pneu) de raio r em volta do
 * eixo, só a parte acima da linha da base, de trás para a frente. */
function arcoNoPerfil(zc, yc, r, yBase) {
  const V = [];
  for (let k = 0; k <= 6; k += 1) { const a = ((225 - 45 * k) * Math.PI) / 180; V.push([zc + r * Math.cos(a), yc + r * Math.sin(a)]); }
  const pts = [];
  for (let i = 0; i + 1 < V.length; i += 1) {
    const [z0, y0] = V[i]; const [z1, y1] = V[i + 1];
    if ((y0 - yBase) * (y1 - yBase) < 0) pts.push([z0 + ((yBase - y0) * (z1 - z0)) / (y1 - y0), yBase]);
    if (y1 >= yBase) pts.push([z1, y1]);
  }
  return pts;
}

/* Quatro cantos de uma placa fina assentada na aresta PQ, afastada t para o lado de fora (o que não tem o ponto `dentro`). */
function placaFora(P, Q, t, dentro) {
  const dz = Q[0] - P[0]; const dy = Q[1] - P[1]; const L = Math.hypot(dz, dy);
  let n = [-dy / L, dz / L];
  if (((P[0] + Q[0]) / 2 - dentro[0]) * n[0] + ((P[1] + Q[1]) / 2 - dentro[1]) * n[1] < 0) n = [-n[0], -n[1]];
  return [P, Q, [Q[0] + n[0] * t, Q[1] + n[1] * t], [P[0] + n[0] * t, P[1] + n[1] * t]];
}

/* Os itens do carro em milímetro. */
export function derivar(T) {
  const itens = [];
  const B = T.cintura_y; const yTi = T.teto_y - T.teto_espessura;
  const rArco = T.roda_raio + T.arco_folga;

  /* retas da estufa: o para-brisa de (parabrisa_base_z, B) a (teto_frente_z, teto_y) e o vidro traseiro de (vidro_tras_base_z, B) a
   * (teto_tras_z, teto_y); a placa do teto começa onde elas cruzam y = teto_y - espessura */
  const pbBase = [T.parabrisa_base_z, B]; const pbTopo = [T.teto_frente_z, T.teto_y];
  const vtBase = [T.vidro_tras_base_z, B]; const vtTopo = [T.teto_tras_z, T.teto_y];
  const pbI = lerpEm(pbBase, pbTopo, yTi);
  const vtI = lerpEm(vtBase, vtTopo, yTi);
  const w = T.colunaB_largura / 2;
  const bB = T.colunaB_z_base; const bT = T.colunaB_z_topo;

  /* carroceria de baixo: nariz, capô, pé do para-brisa, convés do porta-malas, traseira e, pela base de trás para a frente, os arcos */
  const arcoTras = arcoNoPerfil(T.roda_z_tras, T.roda_raio, rArco, T.nariz_base[1]);
  const arcoFrente = arcoNoPerfil(T.roda_z_frente, T.roda_raio, rArco, T.nariz_base[1]);
  const carroceria = [
    T.nariz_base, T.nariz_ponta, T.capo_frente, pbBase, [T.traseira_cima_z, B], T.traseira_ponta, T.traseira_base, ...arcoTras, ...arcoFrente,
  ];
  itens.push({ nome: 'carroceria', forma: 'vistas', lado: carroceria, material: 'verde' });

  itens.push({ nome: 'teto', forma: 'vistas', lado: [pbI, pbTopo, vtTopo, vtI], material: 'verde' });
  itens.push({ nome: 'parabrisa', forma: 'vistas', lado: [pbBase, pbI, [bT + w, yTi], [bB + w, B]], material: 'vidro' });
  itens.push({ nome: 'colunaB', forma: 'vistas', lado: [[bB - w, B], [bB + w, B], [bT + w, yTi], [bT - w, yTi]], material: 'verde' });
  itens.push({ nome: 'vidroTraseiro', forma: 'vistas', lado: [[bB - w, B], [bT - w, yTi], vtI, vtBase], material: 'vidro' });

  /* caixas de roda: o arco fechado na linha da base, extrudado em x entre as faces de dentro dos pneus */
  const xDentro = T.roda_x_fora - T.aro_espessura - T.roda_largura;
  itens.push({ nome: 'caixaRodaFrente', forma: 'extrusaoX', x0: -xDentro, x1: xDentro, perfil: arcoFrente, material: 'pneu' });
  itens.push({ nome: 'caixaRodaTras', forma: 'extrusaoX', x0: -xDentro, x1: xDentro, perfil: arcoTras, material: 'pneu' });

  /* rodas: o pneu vai da face de dentro até o disco; o disco (aro) é o cilindro de 12 mm na face de fora */
  const xPneuFora = T.roda_x_fora - T.aro_espessura;
  for (const [pos, z] of [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]]) {
    for (const lado of ['Esq', 'Dir']) {
      const s = lado === 'Dir' ? 1 : -1;
      itens.push({ nome: `roda${pos}${lado}`, forma: 'cilindroX', x0: s > 0 ? xDentro : -xPneuFora, altura: T.roda_largura, raio: T.roda_raio, cy: T.roda_raio, cz: z, material: 'pneu' });
      itens.push({ nome: `aro${pos}${lado}`, forma: 'cilindroX', x0: s > 0 ? xPneuFora : -T.roda_x_fora, altura: T.aro_espessura, raio: T.aro_raio, cy: T.roda_raio, cz: z, material: 'aro' });
    }
  }

  /* faróis na face inclinada do nariz (de nariz_ponta a capo_frente) e lanternas na face de trás (de traseira_ponta à quina de cima) */
  const dentro = [0, 600];
  const noseP = lerpEm(T.nariz_ponta, T.capo_frente, T.farol_y0); const noseQ = lerpEm(T.nariz_ponta, T.capo_frente, T.farol_y1);
  const traP = lerpEm(T.traseira_ponta, [T.traseira_cima_z, B], T.lanterna_y0); const traQ = lerpEm(T.traseira_ponta, [T.traseira_cima_z, B], T.lanterna_y1);
  for (const lado of ['Esq', 'Dir']) {
    const s = lado === 'Dir' ? 1 : -1;
    itens.push({ nome: `farol${lado}`, forma: 'extrusaoX', x0: s > 0 ? T.farol_x_dentro : -T.farol_x_fora, x1: s > 0 ? T.farol_x_fora : -T.farol_x_dentro, perfil: placaFora(noseP, noseQ, T.placa_espessura, dentro), material: 'farol' });
    itens.push({ nome: `lanterna${lado}`, forma: 'extrusaoX', x0: s > 0 ? T.lanterna_x_dentro : -T.lanterna_x_fora, x1: s > 0 ? T.lanterna_x_fora : -T.lanterna_x_dentro, perfil: placaFora(traP, traQ, T.placa_espessura, dentro), material: 'lanterna' });
  }
  return itens;
}

const m = (mm) => mm / 1000;
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* Mapeamento do núcleo: eixo x leva [u, v] a (y = -u, z = v); eixo z leva [u, v] a (x = u, y = -v). */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);
const perfilSecao = (xy) => antihorario(xy.map(([x, y]) => [x, -y])).map(([u, v]) => [m(u), m(v)]);

/** Os PASSOS: uma forma por parte, em metro, com a `parte` e o `material` logo depois. */
export function gerarPassos(T) {
  const passos = [];
  const meia = meiaSecao(T);
  const secao = [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];
  const L = T.secao_vinco[0] + 200;         // meia largura do prisma lateral, além da seção
  const C = T.comprimento_meia + 50;        // meio comprimento do prisma da seção, além do carro
  derivar(T).forEach((it, i0) => {
    const id = (i0 + 1) * 100;
    let sel;
    if (it.forma === 'vistas') {
      passos.push(['extrusao', { origemId: id + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilLateral(it.lado) }]);
      passos.push(['extrusao', { origemId: id + 2, eixo: 'z', altura: m(2 * C), em: [0, 0, m(-C)], perfil: perfilSecao(secao) }]);
      passos.push(['intersectar', { origemId: id + 10, solidos: [{ origem: { op: 'extrusao', id: id + 1 } }, { origem: { op: 'extrusao', id: id + 2 } }] }]);
      sel = { origem: { op: 'intersectar', id: id + 10 } };
    } else if (it.forma === 'extrusaoX') {
      passos.push(['extrusao', { origemId: id, eixo: 'x', altura: m(it.x1 - it.x0), perfil: perfilLateral(it.perfil), em: [m(it.x0), 0, 0] }]);
      sel = { origem: { op: 'extrusao', id } };
    } else {
      passos.push(['cilindro', { origemId: id, raio: m(it.raio), altura: m(it.altura), lados: 8, eixo: 'x', em: [m(it.x0), m(it.cy), m(it.cz)] }]);
      sel = { alias: `${it.nome}Inteiro` };
    }
    passos.push(['parte', { nome: it.nome, sel }]);
    passos.push(['material', { sel, usa: it.material }]);
  });
  return passos;
}

/* O cilindro sem tampas seleciona só as laterais; a roda inteira é a lateral mais as duas tampas, num alias. */
export const ALIASES = derivar(TABELA).flatMap((it, i0) => {
  if (it.forma !== 'cilindroX') return [];
  const id = (i0 + 1) * 100;
  return [[`${it.nome}Inteiro`, { unir: [
    { origem: { op: 'cilindro', id } },
    { origem: { op: 'cilindro', id, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id, tampa: 'topo' } },
  ] }]];
});

/* Os contatos, declarados antes de medir: cada par se toca por um plano que sai do mesmo prisma ou da mesma aresta de perfil. */
export const CONTATOS = [
  { par: ['carroceria', 'parabrisa'], motivo: 'o parabrisa assenta no plano y da cintura, que sai do mesmo prisma de seção da carroceria' },
  { par: ['carroceria', 'colunaB'], motivo: 'a coluna B assenta no plano y da cintura, que sai do mesmo prisma de seção da carroceria' },
  { par: ['carroceria', 'vidroTraseiro'], motivo: 'o vidro traseiro assenta no plano y da cintura, que sai do mesmo prisma de seção da carroceria' },
  { par: ['parabrisa', 'colunaB'], motivo: 'a face inclinada da frente da coluna B é o mesmo plano de corte do fundo do parabrisa' },
  { par: ['colunaB', 'vidroTraseiro'], motivo: 'a face inclinada de trás da coluna B é o mesmo plano de corte da frente do vidro traseiro' },
  { par: ['teto', 'parabrisa'], motivo: 'o teto assenta no plano y da base do teto, que sai do mesmo prisma de seção do parabrisa' },
  { par: ['teto', 'colunaB'], motivo: 'o teto assenta no plano y da base do teto, que sai do mesmo prisma de seção da coluna B' },
  { par: ['teto', 'vidroTraseiro'], motivo: 'o teto assenta no plano y da base do teto, que sai do mesmo prisma de seção do vidro traseiro' },
  ...['Frente', 'Tras'].flatMap((pos) => [
    { par: ['carroceria', `caixaRoda${pos}`], motivo: 'as faces do arco da caixa de roda são as mesmas do arco recortado no perfil da carroceria' },
    ...['Esq', 'Dir'].flatMap((lado) => [
      { par: [`caixaRoda${pos}`, `roda${pos}${lado}`], motivo: 'a face de dentro do pneu, em x 774 ou -774, encosta na ponta da caixa de roda' },
      { par: [`aro${pos}${lado}`, `roda${pos}${lado}`], motivo: 'o disco encosta na face de fora do pneu, no plano x de 962 ou -962, sem folga' },
    ]),
  ]),
  ...['Esq', 'Dir'].flatMap((lado) => [
    { par: ['carroceria', `farol${lado}`], motivo: 'a placa do farol assenta na face inclinada do nariz, entre o topo do para-choque e a quina do capô' },
    { par: ['carroceria', `lanterna${lado}`], motivo: 'a placa da lanterna assenta na face de trás da carroceria, acima do topo do para-choque' },
  ]),
];

export const PASSOS = gerarPassos(TABELA);

/* Os pontos declarados, em milímetro, medidos contra a malha; saem da TABELA para a medida e o ponto mudarem juntos. */
export const PONTOS = [
  /* o máximo do teto está na aresta de baixo da face inclinada da frente, em y = teto_y - espessura */
  { nome: 'quina da frente do teto, na base da placa', parte: 'teto', medida: 'maximo', em: [xNaReta(TABELA.secao_vinco, [TABELA.secao_topo_x, TABELA.teto_y], TABELA.teto_y - TABELA.teto_espessura), TABELA.teto_y, lerpEm([TABELA.parabrisa_base_z, TABELA.cintura_y], [TABELA.teto_frente_z, TABELA.teto_y], TABELA.teto_y - TABELA.teto_espessura)[0]], toleranciaMm: 15 },
  { nome: 'canto de cima da frente da carroceria', parte: 'carroceria', medida: 'maximo', em: [TABELA.secao_vinco[0], TABELA.cintura_y, TABELA.nariz_ponta[0]], toleranciaMm: 15 },
  { nome: 'canto de baixo de trás da carroceria', parte: 'carroceria', medida: 'minimo', em: [-TABELA.secao_vinco[0], TABELA.nariz_base[1], TABELA.traseira_ponta[0]], toleranciaMm: 15 },
  { nome: 'centro da roda dianteira direita', parte: 'rodaFrenteDir', medida: 'centro', em: [TABELA.roda_x_fora - TABELA.aro_espessura - TABELA.roda_largura / 2, TABELA.roda_raio, TABELA.roda_z_frente], toleranciaMm: 15 },
];

const receita = {
  meta: { nome: 'carro-sedan-angular', desc: 'sedã de faces retas e angulares, com carroceria, estufa e teto pelas três vistas, arcos e caixas de roda, quatro rodas de 8 lados com disco, faróis e lanternas' },
  PARAMS: TABELA,
  MATERIAIS: {
    verde: { tipo: 'liso', cor: '#2bb52b' },
    vidro: { tipo: 'liso', cor: '#8fd3f0' },
    pneu: { tipo: 'liso', cor: '#17181b' },
    aro: { tipo: 'metal', cor: '#8c8c8c', acabamento: 'escovado' },
    farol: { tipo: 'liso', cor: '#f2f2f2' },
    lanterna: { tipo: 'liso', cor: '#c0392b' },
  },
  TOPO: { origem: 'chão, no centro do carro em x e em z; y para cima e a frente do carro em +z' },
  PLANO: {
    objeto: 'sedã de faces retas de 4500 mm de comprimento, 1948 mm de largura e 1513 mm de altura, com carroceria afunilada para o teto, para-brisa e vidro traseiro inclinados, coluna B, quatro rodas em arcos recortados, faróis e lanternas',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do carro, de z -2250 a 2250', milimetros: 4500 },
    familia: 'veiculo',
    partes: [
      { nome: 'carroceria', forma: 'volume de y 190 a 1064 mm com nariz inclinado, capô baixo, convés plano, traseira inclinada, saia que recolhe embaixo (897 mm de meia largura) até 962 mm no vinco, e dois arcos de roda recortados', tecnica: 'interseção do perfil lateral extrudado em x com a seção frontal extrudada em z; arcos no próprio perfil' },
      { nome: 'teto', forma: 'placa de 40 mm no alto da estufa, de z 417 a -976 mm, com 820 mm de meia largura em cima', tecnica: 'interseção do perfil lateral do teto com a seção frontal' },
      { nome: 'parabrisa', forma: 'volume de vidro da estufa na frente da coluna B, com a face da frente inclinada do pé (z 1065, y 1064) ao teto (z 417, y 1513)', tecnica: 'interseção de um perfil lateral de quatro pontos com a seção frontal' },
      { nome: 'colunaB', forma: 'faixa de 65 mm de largura entre os vidros, levemente inclinada para trás, da cintura ao teto', tecnica: 'interseção de um paralelogramo lateral com a seção frontal' },
      { nome: 'vidroTraseiro', forma: 'volume de vidro da estufa atrás da coluna B, com a face de trás inclinada do teto (z -976, y 1513) ao pé (z -1365, y 1064)', tecnica: 'interseção de um perfil lateral de quatro pontos com a seção frontal' },
      { nome: 'caixaRodaFrente', forma: 'o arco da roda da frente fechado na base, entre as faces de dentro dos pneus, escuro', tecnica: 'extrusao em x do mesmo arco do perfil da carroceria' },
      { nome: 'caixaRodaTras', forma: 'o arco da roda de trás fechado na base, entre as faces de dentro dos pneus, escuro', tecnica: 'extrusao em x do mesmo arco do perfil da carroceria' },
      { nome: 'rodaFrenteEsq', forma: 'pneu octogonal de 656 mm de diâmetro e 188 mm de largura, com eixo em x em z 1266, vértice de baixo no chão', tecnica: 'cilindro de eixo x com oito lados e as duas tampas' },
      { nome: 'rodaFrenteDir', forma: 'pneu octogonal de 656 mm de diâmetro e 188 mm de largura, com eixo em x em z 1266, vértice de baixo no chão', tecnica: 'cilindro de eixo x com oito lados e as duas tampas' },
      { nome: 'rodaTrasEsq', forma: 'pneu octogonal de 656 mm de diâmetro e 188 mm de largura, com eixo em x em z -1266, vértice de baixo no chão', tecnica: 'cilindro de eixo x com oito lados e as duas tampas' },
      { nome: 'rodaTrasDir', forma: 'pneu octogonal de 656 mm de diâmetro e 188 mm de largura, com eixo em x em z -1266, vértice de baixo no chão', tecnica: 'cilindro de eixo x com oito lados e as duas tampas' },
      { nome: 'aroFrenteEsq', forma: 'disco cinza octogonal de 470 mm de diâmetro e 12 mm de espessura, na face de fora do pneu', tecnica: 'cilindro de eixo x com oito lados, metal' },
      { nome: 'aroFrenteDir', forma: 'disco cinza octogonal de 470 mm de diâmetro e 12 mm de espessura, na face de fora do pneu', tecnica: 'cilindro de eixo x com oito lados, metal' },
      { nome: 'aroTrasEsq', forma: 'disco cinza octogonal de 470 mm de diâmetro e 12 mm de espessura, na face de fora do pneu', tecnica: 'cilindro de eixo x com oito lados, metal' },
      { nome: 'aroTrasDir', forma: 'disco cinza octogonal de 470 mm de diâmetro e 12 mm de espessura, na face de fora do pneu', tecnica: 'cilindro de eixo x com oito lados, metal' },
      { nome: 'farolEsq', forma: 'placa branca de 350 mm de largura sobre a face inclinada do nariz, em y 802 a 943, x -920 a -570', tecnica: 'extrusao em x de um paralelogramo assentado na face inclinada' },
      { nome: 'farolDir', forma: 'placa branca de 350 mm de largura sobre a face inclinada do nariz, em y 802 a 943, x 570 a 920', tecnica: 'extrusao em x de um paralelogramo assentado na face inclinada' },
      { nome: 'lanternaEsq', forma: 'placa vermelha de 250 mm de largura sobre a face de trás, em y 880 a 1030, x -900 a -650', tecnica: 'extrusao em x de um paralelogramo assentado na face de trás' },
      { nome: 'lanternaDir', forma: 'placa vermelha de 250 mm de largura sobre a face de trás, em y 880 a 1030, x 650 a 900', tecnica: 'extrusao em x de um paralelogramo assentado na face de trás' },
    ],
    criteriosDeReprovacao: [
      'o conjunto não mede 4500 mm de comprimento, cerca de 1948 mm de largura (com as rodas) e 1513 mm de altura, ou não toca o chão pelas quatro rodas',
      'o carro não é simétrico em x, ou uma roda e a do outro lado diferem em posição',
      'a estufa tem a largura da carroceria: a vista frontal precisa mostrar a cabine mais estreita no teto (1640 mm) que no vinco (1924 mm)',
      'as rodas ficam escondidas na carroceria: o arco precisa estar recortado e a roda aparecer inteira na lateral',
      'o perfil lateral não tem capô baixo e inclinado, para-brisa inclinado, teto plano, vidro traseiro inclinado e convés do porta-malas plano, sem entalhe na borda de cima',
      'a parte prometida na lista do PLANO não existe na peça, ou uma parte existe sem estar na lista',
    ],
  },
  contatos: CONTATOS,
  PONTOS,
  ALIASES,
  PASSOS,
};

export default receita;
