/* onibus-rodoviario — ônibus de viagem de 12 m, de carroceria branca, fileira de nove vidros escuros com colunas finas, para-brisa grande de frente
 * quase vertical, teto de cantos arredondados, bagageiros marcados na saia, arcos de roda recortados com caixa de roda, quatro rodas com aro e cubo,
 * para-choques, faróis e lanternas.
 *
 * Origem: recriado em primitivas do núcleo a partir do modelo "pacote C" de autor C (repositório de modelos livres, licença livre sem exigência de crédito; página
 * endereço omitido, arquivo BUS.obj). A malha de origem NÃO está no repositório: ela fica em importados/veiculos-livres/pacote-c/,
 * que o git ignora. Entram aqui só as medidas lidas dela (referencias/fonte-partes.json, em milímetro) e a imagem de referência. As diferenças
 * para a fonte estão em referencias/alvo.md.
 *
 * Orientação: a malha de origem tem a frente em -z; referencias/fonte-partes.json foi gerado com --girar 180 e traz a frente em +z, que é a do acervo.
 * Referencial do acervo: Y para cima, chão em y = 0, frente do ônibus em +z, centrado em x e z. A TABELA é em milímetro e é a única fonte das
 * medidas; `m()` é a única conversão para metro; nenhuma posição é digitada fora da tabela.
 *
 * Como a forma é feita: a carroceria é a INTERSEÇÃO de três sólidos por parte, o perfil lateral (z, y) extrudado em x, a seção frontal (x, y)
 * extrudada em z e uma caixa que recorta a faixa de y e de z daquela parte. Todas as partes (saia, cintura, nove vidros, nove colunas, teto e
 * para-brisa) saem dos mesmos dois prismas, então as faces em que se encontram são o mesmo plano de corte, e o contato fecha exato sem `unir`.
 * A seção frontal dá o afunilamento da estufa e o canto arredondado do teto; o arco de cada roda é recortado no próprio perfil lateral, sem booleana,
 * e a caixa de roda é o mesmo arco extrudado entre as faces de dentro dos pneus.
 */

export const TABELA = {
  comprimento: 12000,
  meia_largura: 1326,              // saia e estufa; as placas de bagageiro levam o total a ±1331, como na fonte
  base_y: 327,                     // fundo da carroceria; só as rodas descem até o chão
  teto_y: 2954,

  /* perfil lateral (z, y) pela frente: base do nariz, frente quase vertical, para-brisa quase em pé, quina do teto, teto e traseira */
  frente_z: 5900,
  frente_base: [5600, 327], frente_pe_y: 431,
  frente_vidro_base_y: 1785,
  parabrisa_meio: [5743, 2646],
  parabrisa_topo: [5598, 2892],
  teto_frente: [5375, 2940],
  teto_tras: [-5875, 2954],
  traseira_z: -5970, traseira_topo_y: 2892, traseira_base_z: -4600,

  /* seção frontal (meia largura, y), de baixo para cima: saia, vinco da cintura, estufa que afunila e cantos arredondados do teto */
  secao: [[1290, 327], [1326, 431], [1326, 1538], [1236, 2769], [1195, 2880], [1100, 2930], [900, 2954]],

  /* faixas de y */
  cintura_y0: 1490, janela_y0: 1788, janela_y1: 2700,
  /* fileira de vidros: colunas de 90 mm centradas nestes z; o vidro vai da traseira da estufa até a frente do último vidro (a porta) */
  coluna_larg: 90,
  colunas_z: [-5000, -3522, -2006, -681, 826, 2286, 3750, 4706],
  vidro_tras_z: -5642, vidro_frente_z: 5494,
  /* o para-brisa começa em z = vidro_frente_z e na altura da cintura */

  /* bagageiros na saia: placas de 5 mm na lateral, em pares de z (de, até) */
  bag_esp: 5, bag_y0: 440, bag_y1: 1040,
  bagageiros: [[-4392, -3702], [30, 781], [885, 1636], [1680, 2564], [3803, 4669]],

  /* rodas: eixo em x, pneu de 24 lados, aro e cubo saindo da face de fora */
  roda_raio: 448, roda_largura: 337, roda_x_dentro: 928, roda_z_frente: 3203, roda_z_tras: -2889, roda_lados: 24,
  arco_folga: 40, arco_passos: 14,
  aro_raio: 300, aro_esp: 20, cubo_raio: 100, cubo_esp: 20,

  /* para-choques, faróis, lanternas e vidro traseiro */
  parachoque_x: 1230, parachoque_y0: 480, parachoque_y1: 830, parachoque_frente_esp: 100, parachoque_tras_esp: 30,
  parachoque_tras_y1: 700,
  farol_x: 993, farol_larg: 386, farol_y0: 928, farol_y1: 1128, farol_esp: 15,
  lanterna_x: 857, lanterna_larg: 486, lanterna_y0: 740, lanterna_y1: 855, lanterna_esp: 10,
  vidro_tras_x: 1080, vidro_tras_y0: 1800, vidro_tras_y1: 2630, vidro_tras_esp: 12,
};

const m = (v) => v / 1000;
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* Mapeamento do núcleo, medido: eixo x leva [u,v] a (y=-u, z=v); eixo z leva [u,v] a (x=u, y=-v). */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);
const secaoFrontal = (xy) => antihorario(xy.map(([x, y]) => [x, -y])).map(([u, v]) => [m(u), m(v)]);
const espelhar = (meia) => [...meia, ...[...meia].reverse().map(([x, y]) => [-x, y])];

/* Arco da roda no perfil: o polígono de raio R em volta do eixo, só acima da base, de trás para a frente, começando e acabando na linha da base. */
export function arcoDaRoda(T, zc) {
  const R = T.roda_raio + T.arco_folga;
  const th = Math.asin((T.roda_raio - T.base_y) / R);
  const pts = [];
  for (let i = 0; i <= T.arco_passos; i += 1) {
    const a = Math.PI + th - (i * (Math.PI + 2 * th)) / T.arco_passos;
    const ponta = i === 0 || i === T.arco_passos;
    pts.push([zc + R * Math.cos(a), ponta ? T.base_y : T.roda_raio + R * Math.sin(a)]);
  }
  return pts;
}

/* O perfil lateral completo, em (z, y): base, arcos, frente, para-brisa, teto e traseira. */
export function perfilDoLado(T) {
  return [
    [T.traseira_base_z, T.base_y],
    ...arcoDaRoda(T, T.roda_z_tras),
    ...arcoDaRoda(T, T.roda_z_frente),
    T.frente_base,
    [T.frente_z, T.frente_pe_y],
    [T.frente_z, T.frente_vidro_base_y],
    T.parabrisa_meio, T.parabrisa_topo, T.teto_frente, T.teto_tras,
    [T.traseira_z, T.traseira_topo_y],
    [T.traseira_z, T.frente_pe_y],
  ];
}

/* Descritores de cada parte, em milímetro. */
export function derivar(T) {
  const Z = T.comprimento / 2 + 50;
  const partes = [];
  const faixa = (nome, y0, y1, z0, z1, material) => partes.push({ nome, forma: 'vistas', y0, y1, z0, z1, material });
  faixa('carroceria', T.base_y - 10, T.cintura_y0, -Z, Z, 'branco');
  faixa('cintura', T.cintura_y0, T.janela_y0, -Z, T.vidro_frente_z, 'branco');
  faixa('teto', T.janela_y1, T.teto_y + 10, -Z, Z, 'branco');
  faixa('parabrisa', T.cintura_y0, T.janela_y1, T.vidro_frente_z, Z, 'vidro');
  /* a fileira: coluna 0 é a parede da traseira; depois vidro e coluna alternados, e o último vidro é o da porta */
  const meia = T.coluna_larg / 2;
  const cortes = [-Z, T.vidro_tras_z, ...T.colunas_z.flatMap((c) => [c - meia, c + meia]), T.vidro_frente_z];
  for (let i = 0; i + 1 < cortes.length; i += 1) {
    const coluna = i % 2 === 0;
    const k = Math.floor(i / 2) + 1;
    faixa(coluna ? `coluna${k}` : `vidro${k}`, T.janela_y0, T.janela_y1, cortes[i], cortes[i + 1], coluna ? 'branco' : 'vidro');
  }
  /* bagageiros */
  for (const [lado, s] of [['Dir', 1], ['Esq', -1]]) {
    T.bagageiros.forEach(([z0, z1], j) => partes.push({
      nome: `bagageiro${j + 1}${lado}`, forma: 'cubo', xc: s * (T.meia_largura + T.bag_esp / 2), y0: T.bag_y0, altura: T.bag_y1 - T.bag_y0,
      zc: (z0 + z1) / 2, larg: T.bag_esp, prof: z1 - z0, material: 'cinza',
    }));
  }
  partes.push({ nome: 'parachoqueDianteiro', forma: 'cubo', xc: 0, y0: T.parachoque_y0, altura: T.parachoque_y1 - T.parachoque_y0, zc: T.frente_z + T.parachoque_frente_esp / 2, larg: 2 * T.parachoque_x, prof: T.parachoque_frente_esp, material: 'cinza' });
  partes.push({ nome: 'parachoqueTraseiro', forma: 'cubo', xc: 0, y0: T.parachoque_y0, altura: T.parachoque_tras_y1 - T.parachoque_y0, zc: T.traseira_z - T.parachoque_tras_esp / 2, larg: 2 * T.parachoque_x, prof: T.parachoque_tras_esp, material: 'cinza' });
  for (const [lado, s] of [['Dir', 1], ['Esq', -1]]) {
    partes.push({ nome: `farol${lado}`, forma: 'cubo', xc: s * T.farol_x, y0: T.farol_y0, altura: T.farol_y1 - T.farol_y0, zc: T.frente_z + T.farol_esp / 2, larg: T.farol_larg, prof: T.farol_esp, material: 'farol' });
    partes.push({ nome: `lanterna${lado}`, forma: 'cubo', xc: s * T.lanterna_x, y0: T.lanterna_y0, altura: T.lanterna_y1 - T.lanterna_y0, zc: T.traseira_z - T.lanterna_esp / 2, larg: T.lanterna_larg, prof: T.lanterna_esp, material: 'lanterna' });
  }
  partes.push({ nome: 'vidroTraseiro', forma: 'cubo', xc: 0, y0: T.vidro_tras_y0, altura: T.vidro_tras_y1 - T.vidro_tras_y0, zc: T.traseira_z - T.vidro_tras_esp / 2, larg: 2 * T.vidro_tras_x, prof: T.vidro_tras_esp, material: 'vidro' });
  /* caixas de roda */
  for (const [eixo, zc] of [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]]) partes.push({ nome: `caixaRoda${eixo}`, forma: 'caixaRoda', zc, material: 'preto' });
  /* rodas */
  for (const [eixo, zc] of [['Frente', T.roda_z_frente], ['Tras', T.roda_z_tras]]) {
    for (const [lado, s] of [['Dir', 1], ['Esq', -1]]) {
      const xd = T.roda_x_dentro; const xf = xd + T.roda_largura;
      const cil = (nome, raio, x0, x1, material) => partes.push({ nome, forma: 'cilindro', x0: s > 0 ? x0 : -x1, comprimento: x1 - x0, y: T.roda_raio, zc, raio, lados: T.roda_lados, material });
      cil(`roda${eixo}${lado}`, T.roda_raio, xd, xf, 'preto');
      cil(`aro${eixo}${lado}`, T.aro_raio, xf, xf + T.aro_esp, 'aco');
      cil(`cubo${eixo}${lado}`, T.cubo_raio, xf + T.aro_esp, xf + T.aro_esp + T.cubo_esp, 'aco');
    }
  }
  return partes;
}

const idDe = (i) => (i + 1) * 100;

export function gerarPassos(T) {
  const passos = [];
  const L = T.meia_largura + 50; const C = T.comprimento / 2 + 50;
  derivar(T).forEach((p, i) => {
    const id = idDe(i);
    let sel;
    if (p.forma === 'vistas') {
      passos.push(['extrusao', { origemId: id + 1, eixo: 'x', altura: m(2 * L), em: [m(-L), 0, 0], perfil: perfilLateral(perfilDoLado(T)) }]);
      passos.push(['extrusao', { origemId: id + 2, eixo: 'z', altura: m(2 * C), em: [0, 0, m(-C)], perfil: secaoFrontal(espelhar(T.secao)) }]);
      passos.push(['cubo', { origemId: id + 3, larg: m(2 * L + 100), alt: m(p.y1 - p.y0), prof: m(p.z1 - p.z0), em: [0, m(p.y0), m((p.z0 + p.z1) / 2)] }]);
      passos.push(['intersectar', { origemId: id + 10, solidos: [
        { origem: { op: 'extrusao', id: id + 1 } }, { origem: { op: 'extrusao', id: id + 2 } }, { origem: { op: 'cubo', id: id + 3 } }] }]);
      sel = { origem: { op: 'intersectar', id: id + 10 } };
    } else if (p.forma === 'caixaRoda') {
      const xi = T.roda_x_dentro;
      passos.push(['extrusao', { origemId: id, eixo: 'x', altura: m(2 * xi), em: [m(-xi), 0, 0], perfil: perfilLateral(arcoDaRoda(T, p.zc)) }]);
      sel = { origem: { op: 'extrusao', id } };
    } else if (p.forma === 'cubo') {
      passos.push(['cubo', { origemId: id, larg: m(p.larg), alt: m(p.altura), prof: m(p.prof), em: [m(p.xc), m(p.y0), m(p.zc)] }]);
      sel = { origem: { op: 'cubo', id } };
    } else {
      passos.push(['cilindro', { origemId: id, raio: m(p.raio), altura: m(p.comprimento), lados: p.lados, eixo: 'x', em: [m(p.x0), m(p.y), m(p.zc)] }]);
      sel = { alias: `${p.nome}Inteiro` };
    }
    passos.push(['parte', { nome: p.nome, sel }]);
    passos.push(['material', { sel, usa: p.material }]);
  });
  return passos;
}

export const ALIASES = derivar(TABELA).flatMap((p, i) => (p.forma !== 'cilindro' ? [] : [[`${p.nome}Inteiro`, { unir: [
  { origem: { op: 'cilindro', id: idDe(i) } },
  { origem: { op: 'cilindro', id: idDe(i), tampa: 'fundo' } },
  { origem: { op: 'cilindro', id: idDe(i), tampa: 'topo' } },
] }]]));

/* Contatos: declarados pela construção. Os planos de encontro saem dos mesmos prismas, então cada par abaixo divide uma face. */
export function contatos(T = TABELA) {
  const lista = [];
  const nomes = derivar(T).map((p) => p.nome);
  const fileira = nomes.filter((n) => /^(coluna|vidro)\d+$/.test(n));
  const c = (a, b, motivo) => lista.push({ par: [a, b], motivo });
  c('carroceria', 'cintura', `a face de cima da saia, em y ${T.cintura_y0}, é o plano de baixo da cintura, no mesmo prisma`);
  c('carroceria', 'parabrisa', `a face de cima da saia, em y ${T.cintura_y0}, é a base do para-brisa, na frente de z ${T.vidro_frente_z}`);
  c('cintura', 'parabrisa', `a face da frente da cintura, em z ${T.vidro_frente_z}, encosta na face de trás do para-brisa`);
  c('teto', 'parabrisa', `a face de baixo do teto, em y ${T.janela_y1}, assenta sobre o topo do para-brisa`);
  for (const n of fileira) {
    c('cintura', n, `a face de cima da cintura, em y ${T.janela_y0}, é a base de ${n}, no mesmo prisma`);
    c('teto', n, `a face de baixo do teto, em y ${T.janela_y1}, assenta no topo de ${n}`);
  }
  for (let i = 0; i + 1 < fileira.length; i += 1) {
    c(fileira[i], fileira[i + 1], `o plano de corte em z entre ${fileira[i]} e ${fileira[i + 1]} é a mesma face dos dois`);
  }
  c(fileira[fileira.length - 1], 'parabrisa', `a face da frente do último vidro, em z ${T.vidro_frente_z}, encosta no para-brisa`);
  for (const lado of ['Dir', 'Esq']) {
    T.bagageiros.forEach((_, j) => c('carroceria', `bagageiro${j + 1}${lado}`, `a face de dentro do bagageiro encosta na lateral da saia, em x ${T.meia_largura}`));
    c('carroceria', `farol${lado}`, `a face de trás do farol encosta na frente da saia, em z ${T.frente_z}`);
    c('carroceria', `lanterna${lado}`, `a face da frente da lanterna encosta na traseira da saia, em z ${T.traseira_z}`);
  }
  c('carroceria', 'parachoqueDianteiro', `a face de trás do para-choque encosta na frente da saia, em z ${T.frente_z}`);
  c('carroceria', 'parachoqueTraseiro', `a face da frente do para-choque encosta na traseira da saia, em z ${T.traseira_z}`);
  c('coluna1', 'vidroTraseiro', `a face de trás do vidro traseiro encosta na traseira da parede de trás, em z ${T.traseira_z}`);
  for (const eixo of ['Frente', 'Tras']) {
    c('carroceria', `caixaRoda${eixo}`, 'as faces do arco da caixa de roda são as mesmas do recorte do perfil da saia');
    for (const lado of ['Dir', 'Esq']) {
      c(`caixaRoda${eixo}`, `roda${eixo}${lado}`, `a face de dentro do pneu encosta na face da caixa de roda, em x ${T.roda_x_dentro}`);
      c(`roda${eixo}${lado}`, `aro${eixo}${lado}`, 'a face de fora do pneu encosta na face de dentro do aro, no disco do centro');
      c(`aro${eixo}${lado}`, `cubo${eixo}${lado}`, 'a face de fora do aro encosta na face de dentro do cubo, no disco do centro');
    }
  }
  return lista;
}
export const CONTATOS = contatos(TABELA);

const interpola = (pts, y, iu, iv) => {
  for (let i = 0; i + 1 < pts.length; i += 1) {
    const [a, b] = [pts[i], pts[i + 1]];
    if ((a[1] - y) * (b[1] - y) <= 0 && a[1] !== b[1]) return a[iu] + ((y - a[1]) * (b[iu] - a[iu])) / (b[1] - a[1]);
  }
  throw new Error(`y ${y} fora do perfil`);
};

/* Pontos declarados em milímetro, tirados da mesma tabela que a malha. */
export function pontosDeclarados(T = TABELA) {
  const xf = T.roda_x_dentro + T.roda_largura;
  const tol = 1;
  return [
    { nome: 'pneu da frente, à direita, embaixo', parte: 'rodaFrenteDir', medida: 'minimo', em: [T.roda_x_dentro, 0, T.roda_z_frente - T.roda_raio], toleranciaMm: tol },
    { nome: 'pneu de trás, à esquerda, na face de fora', parte: 'rodaTrasEsq', medida: 'minimo', em: [-xf, 0, T.roda_z_tras - T.roda_raio], toleranciaMm: tol },
    { nome: 'canto do teto, à frente, à direita, na base do teto', parte: 'teto', medida: 'maximo', em: [interpola(T.secao, T.janela_y1, 0, 1), T.teto_y, interpola([[T.frente_z, T.frente_vidro_base_y], T.parabrisa_meio, T.parabrisa_topo], T.janela_y1, 0, 1)], toleranciaMm: tol },
    { nome: 'ponta da frente do para-choque dianteiro', parte: 'parachoqueDianteiro', medida: 'maximo', em: [T.parachoque_x, T.parachoque_y1, T.frente_z + T.parachoque_frente_esp], toleranciaMm: tol },
    { nome: 'ponta de trás do para-choque traseiro', parte: 'parachoqueTraseiro', medida: 'minimo', em: [-T.parachoque_x, T.parachoque_y0, T.traseira_z - T.parachoque_tras_esp], toleranciaMm: tol },
    { nome: 'face de fora do bagageiro dianteiro direito', parte: 'bagageiro5Dir', medida: 'maximo', em: [T.meia_largura + T.bag_esp, T.bag_y1, T.bagageiros[4][1]], toleranciaMm: tol },
  ];
}

const nomesPartes = derivar(TABELA).map((p) => p.nome);
const forma = (nome) => {
  if (nome === 'carroceria') return 'saia de y 317 a 1490, de ponta a ponta, com seção frontal de meia largura 1326 e arcos de roda no perfil';
  if (nome === 'cintura') return 'faixa de y 1490 a 1788, da traseira até z 5494, de cor da carroceria, sob a fileira de vidros';
  if (nome === 'teto') return 'faixa de y 2700 a 2954 com os cantos arredondados da seção frontal';
  if (nome === 'parabrisa') return 'vidro escuro de z 5494 à frente, de y 1490 a 2700, sobre a frente quase vertical, em toda a largura';
  if (/^coluna/.test(nome)) return 'coluna branca da fileira da estufa, de y 1788 a 2700, com 90 mm em z (a primeira é a parede de trás)';
  if (/^vidro\d/.test(nome)) return 'vidro escuro de janela, de y 1788 a 2700, entre duas colunas, em toda a largura da estufa';
  if (/^bagageiro/.test(nome)) return 'placa cinza de 5 mm na lateral da saia, de y 440 a 1040';
  if (/^parachoque/.test(nome)) return 'caixa cinza de 2460 mm de largura encostada na face de frente ou de trás';
  if (/^farol/.test(nome)) return 'placa clara de 386 por 200 mm e 15 mm na frente, de y 928 a 1128';
  if (/^lanterna/.test(nome)) return 'placa vermelha de 486 por 115 mm e 10 mm na traseira, de y 740 a 855';
  if (nome === 'vidroTraseiro') return 'placa de vidro escuro de 2160 por 830 mm e 12 mm na traseira, de y 1800 a 2630';
  if (/^caixaRoda/.test(nome)) return 'o arco da roda fechado na base, extrudado entre as faces de dentro dos pneus, escuro';
  if (/^roda/.test(nome)) return 'pneu de 896 mm de diâmetro e 337 mm de largura, 24 lados, eixo em x';
  if (/^aro/.test(nome)) return 'disco de aço de 600 mm de diâmetro e 20 mm, na face de fora do pneu';
  return 'disco de aço de 200 mm de diâmetro e 20 mm, na face de fora do aro';
};
const tecnica = (nome) => {
  if (/^(carroceria|cintura|teto|parabrisa|coluna|vidro\d)/.test(nome)) return 'interseção do perfil lateral extrudado em x, da seção frontal extrudada em z e de uma caixa de corte';
  if (/^caixaRoda/.test(nome)) return 'extrusão em x do arco do perfil lateral';
  if (/^(roda|aro|cubo)/.test(nome)) return 'cilindro de eixo x';
  return 'caixa de faces planas encostada na face';
};

const receita = {
  meta: { nome: 'onibus-rodoviario', desc: 'ônibus de viagem de 12 m, branco, com fileira de vidros escuros e colunas, para-brisa grande, arcos de roda com caixa, bagageiros na saia e rodas com aro e cubo' },
  PARAMS: TABELA,
  MATERIAIS: {
    branco: { tipo: 'liso', cor: '#e9e9e6' },
    vidro: { tipo: 'liso', cor: '#2c3a46' },
    preto: { tipo: 'liso', cor: '#1a1b1e' },
    aco: { tipo: 'metal', cor: '#a7acb3', acabamento: 'escovado' },
    cinza: { tipo: 'liso', cor: '#a4a8af' },
    farol: { tipo: 'liso', cor: '#f2efe0' },
    lanterna: { tipo: 'liso', cor: '#a32222' },
  },
  TOPO: { origem: 'chão, no centro do ônibus em x e em z; y para cima e a frente do ônibus em +z' },
  PLANO: {
    objeto: 'ônibus de viagem de 12000 mm de comprimento, 2662 mm de largura e 2954 mm de altura, com fileira de nove vidros e colunas, para-brisa, teto arredondado, arcos de roda e quatro rodas',
    referencias: ['referencias/fonte-vistas.png', 'referencias/fonte-partes.json', 'referencias/alvo.md'],
    escala: { medida: 'comprimento total do ônibus, de z -6000 a 6000', milimetros: 12000 },
    familia: 'veiculo',
    partes: nomesPartes.map((nome) => ({ nome, forma: forma(nome), tecnica: tecnica(nome) })),
    criteriosDeReprovacao: [
      'a caixa total não fica em x ±1331, y 0 a 2954 e z ±6000, com tolerância de 2 por cento do comprimento',
      'a frente não é o lado de z positivo, ou o para-brisa não fica na frente',
      'alguma roda não toca o chão ou não aparece dentro de um arco recortado com caixa de roda',
      'a estufa não tem a fileira de vidros com colunas, ou a seção frontal não afunila da cintura ao teto',
      'o teto não tem cantos arredondados na seção frontal',
      'uma parte prometida no plano não existe, ou uma parte existe sem estar no plano',
      'o lado esquerdo e o direito diferem em medida ou posição de peça simétrica',
    ],
  },
  contatos: CONTATOS,
  PONTOS: pontosDeclarados(TABELA),
  ALIASES,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
