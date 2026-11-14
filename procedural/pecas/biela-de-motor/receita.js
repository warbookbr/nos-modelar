/* biela-de-motor — biela de motor com bucha, capa e dois parafusos, peça inteira.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a parte de baixo da capa), a biela de pé com a cabeça grande embaixo e o
 * olhal pequeno em cima, e o eixo dos dois furos em z (o pino do virabrequim e o pino do pistão). Origem em x = 0 e z = 0, no
 * meio da largura; o centro da cabeça grande fica a um raio de altura, de modo que a capa pouse no chão.
 *
 * O corpo é uma extrusão em z de um contorno por trechos só: a metade de cima da cabeça grande com as duas orelhas dos
 * parafusos, a haste que afina em retas e concordâncias e o olhal pequeno, ligados sem quina viva (as retas da haste saem
 * tangentes ao círculo do olhal, e as junções côncavas são concordâncias de raio declarado). A seção em I da haste vem de dois
 * rebaixos, um em cada face em z, subtraídos do corpo, que deixam as bordas de cada lado e a alma no meio; a borda dos
 * rebaixos é arredondada por `arredondarCostura`. A capa é outra extrusão em z, a metade de baixo da cabeça com as orelhas, e a
 * bucha é um anel de bronze no furo do olhal. Os dois parafusos são cilindros de cabeça sextavada, furados no corpo (cego) e na
 * capa (passante) com folga de uma décima de milímetro. O corte entre corpo e capa é o plano do centro da cabeça grande.
 */

export const TABELA = {
  /* Escala do alvo. */
  entreCentros: 145,
  /* Cabeça grande: furo, raio externo, e a largura (em z) de corpo, capa. */
  furoCabeca: 53,
  raioCabeca: 40,
  largura: 24,
  /* Orelhas dos parafusos: semilargura em x, quanto a orelha do corpo sobe acima do corte e quanto a da capa desce abaixo. */
  orelhaSemilargura: 47,
  orelhaCorpoAltura: 20,
  orelhaCapaAltura: 24,
  /* Parafuso: posição em x, raio da haste, folga do furo, cabeça sextavada (raio circunscrito e altura). */
  parafusoX: 39.5,
  parafusoRaio: 4,
  parafusoFolga: 0.1,
  parafusoCabecaRaio: 6.9,
  parafusoCabecaAltura: 6,
  /* O furo do corpo é cego: termina esta distância acima do corte. */
  parafusoProfundidadeNoCorpo: 17,
  /* Olhal pequeno: furo, raio externo, bucha (furo interno e quanto sobra de cada lado da largura). */
  furoOlhal: 22,
  raioOlhal: 17,
  buchaFuro: 19,
  buchaSobra: 1,
  /* Haste: o ponto onde a orelha encontra a haste (semilargura e altura acima do centro da cabeça), a semilargura no pescoço do
     olhal e o quanto o pescoço fica abaixo do centro do olhal. */
  hasteBaseSemilargura: 22,
  hasteBaseAltura: 34,
  hastePescocoSemilargura: 9.5,
  hastePescocoAbaixo: 17,
  /* Concordâncias da haste: junção com a orelha (côncava), pescoço do olhal (côncava) e quina da orelha (convexa). */
  concordanciaBase: 14,
  concordanciaPescoco: 6,
  concordanciaOrelha: 4,
  /* Seção em I: bordas de cada lado, espessura da alma, onde o rebaixo começa e termina, e o raio dos cantos dele. */
  bordaDoI: 4,
  almaDoI: 6,
  rebaixoInicio: 48,
  rebaixoFim: 112,
  rebaixoCanto: 4,
  arredondamentoDoRebaixo: 1.2,
  paineisDoArredondamento: 4,
  segmentosArco: 12,
};

const m = (mm) => mm / 1000;

/* Tangente de um ponto externo a um círculo, do lado direito (x > 0), em mm. */
function tangenteDireita(p, c, r) {
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  const d = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx) + Math.acos(r / d);
  return [c[0] + r * Math.cos(ang), c[1] + r * Math.sin(ang)];
}

export function derivar(t = TABELA) {
  const yCabeca = t.raioCabeca;
  const yOlhal = yCabeca + t.entreCentros;
  const meia = t.largura / 2;
  const base = [t.hasteBaseSemilargura, yCabeca + t.hasteBaseAltura];
  const pescoco = [t.hastePescocoSemilargura, yOlhal - t.hastePescocoAbaixo];
  const tangente = tangenteDireita(pescoco, [0, yOlhal], t.raioOlhal);
  /* Semilargura da haste a uma altura v acima do centro da cabeça, na reta entre a base e o pescoço. */
  const semilarguraDaHaste = (v) => {
    const k = (v - t.hasteBaseAltura) / ((pescoco[1] - yCabeca) - t.hasteBaseAltura);
    return base[0] + (pescoco[0] - base[0]) * k;
  };
  const pocket = (v) => semilarguraDaHaste(v) - t.bordaDoI;
  const profRebaixo = (t.largura - t.almaDoI) / 2;
  const ox = t.orelhaSemilargura;
  /* A orelha da capa encontra o círculo externo da cabeça em x = sqrt(R^2 - h^2). */
  const xOrelhaNoCirculo = Math.sqrt(t.raioCabeca ** 2 - t.orelhaCapaAltura ** 2);
  return { yCabeca, yOlhal, meia, base, pescoco, tangente, pocket, profRebaixo, ox, xOrelhaNoCirculo };
}

/* Identidade estrutural dos passos, escolhida aqui. */
const ID = {
  corpo: 1, rebaixoFrente: 2, rebaixoTras: 3, furoCorpoE: 4, furoCorpoD: 5, corpoFurado: 6, costuraRebaixo: 7,
  capa: 10, furoCapaE: 11, furoCapaD: 12, capaFurada: 13,
  bucha: 20,
  hasteParafusoE: 30, hasteParafusoD: 31, cabecaParafusoE: 32, cabecaParafusoD: 33, parafusoE: 34, parafusoD: 35,
};

/* Um cilindro inteiro (lateral e as duas tampas) para a booleana. */
const cilindroInteiro = (id) => [`cil${id}`, {
  unir: [
    { origem: { op: 'cilindro', id } },
    { origem: { op: 'cilindro', id, tampa: 'fundo' } },
    { origem: { op: 'cilindro', id, tampa: 'topo' } },
  ],
}];

export const ALIASES = [
  ...[ID.furoCorpoE, ID.furoCorpoD, ID.furoCapaE, ID.furoCapaD, ID.hasteParafusoE, ID.hasteParafusoD, ID.cabecaParafusoE, ID.cabecaParafusoD].map(cilindroInteiro),
  ['corpo', { unir: [{ origem: { op: 'subtrair', id: ID.corpoFurado } }, { origem: { op: 'arredondarCostura', id: ID.costuraRebaixo } }] }],
  ['costuraDoRebaixo', { origem: { op: 'arredondarCostura', id: ID.costuraRebaixo } }],
  ['capa', { origem: { op: 'subtrair', id: ID.capaFurada } }],
  ['bucha', { origem: { op: 'extrusao', id: ID.bucha } }],
  ['parafusos', { unir: [{ origem: { op: 'unir', id: ID.parafusoE } }, { origem: { op: 'unir', id: ID.parafusoD } }] }],
];

export function gerarPassos(t = TABELA) {
  const G = derivar(t);
  const passos = [];
  /* No perfil de uma extrusão em z, u vai para x e v vai para -y: o ponto (x, y) em mm vira [u, v] em metro. */
  const uv = (x, y) => [m(x), -m(y)];
  const meia = m(G.meia);
  const yC = G.yCabeca;

  /* Contorno do corpo, no sentido anti-horário visto de +z: da metade de baixo do furo da cabeça pelo corte, subindo pela
     orelha direita, pela haste e pelo olhal, e descendo pelo lado esquerdo. As retas da haste saem tangentes ao olhal. */
  const rb = t.furoCabeca / 2;
  const [bx, by] = G.base;
  const [px, py] = G.pescoco;
  const [tx, ty] = G.tangente;
  const corpoContorno = {
    inicio: uv(-t.orelhaSemilargura, yC),
    trechos: [
      { reto: uv(-rb, yC) },
      { arco: { por: uv(0, yC + rb), ate: uv(rb, yC) } },
      { reto: uv(t.orelhaSemilargura, yC) },
      { reto: uv(t.orelhaSemilargura, yC + t.orelhaCorpoAltura) },
      { concordancia: m(t.concordanciaOrelha) },
      { reto: uv(bx, by) },
      { concordancia: m(t.concordanciaBase) },
      { reto: uv(px, py) },
      { concordancia: m(t.concordanciaPescoco) },
      { reto: uv(tx, ty) },
      { arcoTangente: uv(-tx, ty) },
      { reto: uv(-px, py) },
      { concordancia: m(t.concordanciaPescoco) },
      { reto: uv(-bx, by) },
      { concordancia: m(t.concordanciaBase) },
      { reto: uv(-t.orelhaSemilargura, yC + t.orelhaCorpoAltura) },
      { concordancia: m(t.concordanciaOrelha) },
      { reto: uv(-t.orelhaSemilargura, yC) },
    ],
  };
  passos.push(['extrusao', {
    origemId: ID.corpo, eixo: 'z', altura: m(t.largura), em: [0, 0, -meia],
    perfil: { contorno: corpoContorno },
    furos: [{ circulo: { raio: m(t.furoOlhal / 2), centro: uv(0, G.yOlhal) } }],
    segmentosArco: t.segmentosArco,
  }]);

  /* Rebaixos da seção em I: o mesmo trapézio de cantos arredondados em cada face, com a profundidade que deixa a alma. */
  const vi = t.rebaixoInicio;
  const vf = t.rebaixoFim;
  const rebaixoContorno = {
    inicio: uv(-G.pocket(vi), yC + vi),
    trechos: [
      { reto: uv(G.pocket(vi), yC + vi) },
      { concordancia: m(t.rebaixoCanto) },
      { reto: uv(G.pocket(vf), yC + vf) },
      { concordancia: m(t.rebaixoCanto) },
      { reto: uv(-G.pocket(vf), yC + vf) },
      { concordancia: m(t.rebaixoCanto) },
      { reto: uv(-G.pocket(vi), yC + vi) },
      { concordancia: m(t.rebaixoCanto) },
    ],
  };
  const sobra = 2;
  for (const [id, lado] of [[ID.rebaixoFrente, 1], [ID.rebaixoTras, -1]]) {
    const zIni = lado > 0 ? G.meia - G.profRebaixo : -G.meia - sobra;
    passos.push(['extrusao', {
      origemId: id, eixo: 'z', altura: m(G.profRebaixo + sobra), em: [0, 0, m(zIni)],
      perfil: { contorno: rebaixoContorno }, segmentosArco: t.segmentosArco,
    }]);
  }

  /* Furos cegos dos parafusos no corpo: sobem do corte até a profundidade declarada. */
  const rFuro = t.parafusoRaio + t.parafusoFolga;
  const topoFuro = yC + t.parafusoProfundidadeNoCorpo;
  const alturaFuroCorpo = t.parafusoProfundidadeNoCorpo + 4;
  for (const [id, lado] of [[ID.furoCorpoE, -1], [ID.furoCorpoD, 1]]) {
    passos.push(['cilindro', {
      origemId: id, raio: m(rFuro), altura: m(alturaFuroCorpo), lados: 16,
      em: [m(lado * t.parafusoX), m(topoFuro - alturaFuroCorpo), 0],
    }]);
  }
  passos.push(['subtrair', {
    origemId: ID.corpoFurado,
    solidos: [
      { origem: { op: 'extrusao', id: ID.corpo } },
      { origem: { op: 'extrusao', id: ID.rebaixoFrente } },
      { origem: { op: 'extrusao', id: ID.rebaixoTras } },
      { alias: 'cil' + ID.furoCorpoE },
      { alias: 'cil' + ID.furoCorpoD },
    ],
  }]);
  passos.push(['arredondarCostura', {
    origemId: ID.costuraRebaixo, de: { op: 'subtrair', id: ID.corpoFurado },
    raio: m(t.arredondamentoDoRebaixo), paineis: t.paineisDoArredondamento, arestas: 'convexas',
    regiao: { min: [m(-G.ox), m(yC + vi - 5), m(-G.meia - 1)], max: [m(G.ox), m(yC + vf + 5), m(G.meia + 1)] },
  }]);

  /* Capa: a metade de baixo da cabeça, com as orelhas que descem abaixo do corte. */
  const R = t.raioCabeca;
  const hO = t.orelhaCapaAltura;
  const xO = G.xOrelhaNoCirculo;
  const ox = t.orelhaSemilargura;
  const capaContorno = {
    inicio: uv(-ox, yC),
    trechos: [
      { reto: uv(-ox, yC - hO) },
      { concordancia: m(t.concordanciaOrelha) },
      { reto: uv(-xO, yC - hO) },
      { arco: { por: uv(-xO / 2, yC - Math.sqrt(R * R - (xO / 2) ** 2)), ate: uv(0, yC - R) } },
      { arco: { por: uv(xO / 2, yC - Math.sqrt(R * R - (xO / 2) ** 2)), ate: uv(xO, yC - hO) } },
      { reto: uv(ox, yC - hO) },
      { concordancia: m(t.concordanciaOrelha) },
      { reto: uv(ox, yC) },
      { reto: uv(rb, yC) },
      { arco: { por: uv(0, yC - rb), ate: uv(-rb, yC) } },
    ],
  };
  passos.push(['extrusao', {
    origemId: ID.capa, eixo: 'z', altura: m(t.largura), em: [0, 0, -meia],
    perfil: { contorno: capaContorno }, segmentosArco: t.segmentosArco,
  }]);
  /* Furos passantes da capa: atravessam a orelha de ponta a ponta. */
  for (const [id, lado] of [[ID.furoCapaE, -1], [ID.furoCapaD, 1]]) {
    passos.push(['cilindro', {
      origemId: id, raio: m(rFuro), altura: m(hO + 4), lados: 16,
      em: [m(lado * t.parafusoX), m(yC - hO - 2), 0],
    }]);
  }
  passos.push(['subtrair', {
    origemId: ID.capaFurada,
    solidos: [
      { origem: { op: 'extrusao', id: ID.capa } },
      { alias: 'cil' + ID.furoCapaE },
      { alias: 'cil' + ID.furoCapaD },
    ],
  }]);

  /* Bucha de bronze no furo do olhal, um pouco mais larga que o olhal de cada lado. */
  passos.push(['extrusao', {
    origemId: ID.bucha, eixo: 'z', altura: m(t.largura + 2 * t.buchaSobra), em: [0, 0, m(-G.meia - t.buchaSobra)],
    perfil: { circulo: { raio: m(t.furoOlhal / 2), centro: uv(0, G.yOlhal) } },
    furos: [{ circulo: { raio: m(t.buchaFuro / 2), centro: uv(0, G.yOlhal) } }],
    segmentosArco: t.segmentosArco,
  }]);

  /* Parafusos: cabeça sextavada sob a orelha da capa e haste que sobe até o fim do furo cego; a haste entra 1 mm na cabeça. */
  const yCabecaBase = yC - hO - t.parafusoCabecaAltura;
  const topoHaste = topoFuro - 1;
  const hasteComp = topoHaste - (yC - hO - 1);
  for (const [idH, idC, idP, lado] of [
    [ID.hasteParafusoE, ID.cabecaParafusoE, ID.parafusoE, -1],
    [ID.hasteParafusoD, ID.cabecaParafusoD, ID.parafusoD, 1],
  ]) {
    passos.push(['cilindro', {
      origemId: idC, raio: m(t.parafusoCabecaRaio), altura: m(t.parafusoCabecaAltura), lados: 6,
      em: [m(lado * t.parafusoX), m(yCabecaBase), 0],
    }]);
    passos.push(['cilindro', {
      origemId: idH, raio: m(t.parafusoRaio), altura: m(hasteComp), lados: 16,
      em: [m(lado * t.parafusoX), m(yC - hO - 1), 0],
    }]);
    passos.push(['unir', {
      origemId: idP, solidos: [{ alias: 'cil' + idC }, { alias: 'cil' + idH }],
    }]);
  }

  for (const [nome, material] of [['corpo', 'aco'], ['capa', 'aco'], ['bucha', 'bronze'], ['parafusos', 'parafuso']]) {
    passos.push(['parte', { nome, sel: { alias: nome } }]);
    passos.push(['material', { usa: material, sel: { alias: nome } }]);
  }
  /* A seção arredondada sai em painéis e as facetas dos círculos também: o ângulo de 35 graus os liga numa superfície só e
     deixa nítidas as quinas retas do corte, das orelhas e dos rebaixos. */
  for (const nome of ['corpo', 'capa', 'bucha', 'parafusos']) {
    passos.push(['liso', { angulo: 35, sel: { alias: nome } }]);
  }

  return passos;
}

/* Os pontos declarados, em milímetro, saem da mesma tabela que a malha. */
export function pontosDeclarados(t = TABELA) {
  const G = derivar(t);
  return [
    { nome: 'ponto mais baixo da capa', parte: 'capa', medida: 'minimo', em: [-t.orelhaSemilargura, 0, -G.meia], toleranciaMm: 0.5 },
    { nome: 'ponto mais alto do olhal', parte: 'corpo', medida: 'maximo', em: [t.orelhaSemilargura, G.yOlhal + t.raioOlhal, G.meia], toleranciaMm: 0.5 },
    { nome: 'bucha, ponta de trás do olhal', parte: 'bucha', medida: 'minimo', em: [-t.furoOlhal / 2, G.yOlhal - t.furoOlhal / 2, -G.meia - t.buchaSobra], toleranciaMm: 0.5 },
  ];
}

const receita = {
  meta: { nome: 'biela-de-motor', desc: 'biela de motor de 145 mm entre centros, com bucha de bronze no olhal pequeno, capa e dois parafusos de cabeça sextavada' },
  PARAMS: TABELA,
  ALIASES,
  MATERIAIS: {
    aco: { cor: '#7d8288', metalicidade: 0.85, aspereza: 0.45 },
    bronze: { cor: '#b8863a', metalicidade: 0.8, aspereza: 0.35 },
    parafuso: { cor: '#4a4f55', metalicidade: 0.85, aspereza: 0.5 },
  },
  TOPO: { origem: 'chão sob a cabeça grande, no meio da largura; y para cima, a biela de pé com o olhal pequeno em cima, x para o lado e eixo dos furos em z' },
  PLANO: {
    objeto: 'biela de motor de 145 mm entre centros, com bucha de bronze no olhal pequeno, capa na cabeça grande e dois parafusos de cabeça sextavada',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'distância entre os centros dos dois furos', milimetros: 145 },
    partes: [
      {
        nome: 'corpo',
        forma: 'olhal pequeno de 22 mm de furo, haste de seção em I (bordas e alma rebaixada nas duas faces) afinando para o olhal, e meia cabeça grande de furo de 53 mm com orelhas; haste e cabeças fundidas em curvas, sem quina viva',
        tecnica: 'extrusão em z de contorno por trechos (retas tangentes, arcos, concordâncias), rebaixos do I e furos cegos por subtrair, rebaixos arredondados por arredondarCostura, liso com angulo',
      },
      {
        nome: 'bucha',
        forma: 'anel de bronze de 22 mm de diâmetro externo e 19 mm de furo, um pouco mais largo que o olhal, dentro do furo do olhal pequeno',
        tecnica: 'extrusão em z de círculo com furo, de material próprio',
      },
      {
        nome: 'capa',
        forma: 'a outra metade da cabeça grande, em arco de furo de 53 mm, com as orelhas dos parafusos e dois furos passantes de parafuso, alinhada ao corpo no corte do centro do furo',
        tecnica: 'extrusão em z de contorno por trechos com concordâncias nas orelhas e furos passantes por subtrair',
      },
      {
        nome: 'parafusos',
        forma: 'dois parafusos de cabeça sextavada sob as orelhas da capa, atravessando os furos da capa até o furo cego do corpo, fora do furo grande',
        tecnica: 'cilindro de haste unido a cilindro de seis lados, um parafuso por unir',
      },
    ],
    criteriosDeReprovacao: [
      'haste retangular maciça sem a seção em I (rebaixo nas duas faces deixando alma e bordas)',
      'olhal pequeno sem a bucha de bronze dentro do furo',
      'parafuso fora dos furos ou atravessando o furo grande de 53 mm',
      'corpo e capa desalinhados em x, em z ou no plano do corte',
      'quina viva na fusão da haste com as cabeças',
      'a peça abaixo do chão ou deitada, fora do referencial de Y para cima',
    ],
  },
  contatos: [
    { par: ['corpo', 'capa'], motivo: 'a capa fecha a cabeça grande no plano do corte, no centro do furo de 53 mm' },
    { par: ['corpo', 'bucha'], motivo: 'a bucha está pressionada no furo do olhal pequeno' },
    { par: ['capa', 'parafusos'], motivo: 'a cabeça de cada parafuso assenta sob a orelha da capa' },
  ],
  get PONTOS() { return pontosDeclarados(this.PARAMS); },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
