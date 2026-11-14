/* mesa-de-centro-oval — mesa de centro de luxo: tampo de mármore oval de pista (1200 por 600 mm), quatro pés de latão com capitel e
 * sapata em degrau, aro inferior e aro superior em fita de latão, prateleira de vidro e ornamentos de latão (faixas em degrau e
 * alças em arco nas pontas).
 *
 * Referencial do acervo: Y para cima, o chão em y = 0, o eixo comprido da pista em x, a largura em z, centro da planta na origem.
 * A TABELA, em milímetro, é a única fonte das medidas. A `derivar` calcula, em milímetro, as medidas que seriam parâmetro de uma
 * família de mesa (contorno do tampo, pés, aros, prateleira) e escreve as operações como dados; `gerarPassos` converte para metro
 * com `m()` num lugar só.
 *
 * Pista: dois semicírculos de raio meia-largura ligados por retas de comprimento `pista_comprimento - pista_largura`. Todos os
 * contornos (tampo, aros, prateleira, alças) são a mesma pista com o raio diminuído: as retas têm o mesmo comprimento e só o raio
 * muda, de modo que os contornos são paralelos.
 *
 * Encaixes (y em mm): pé do chão a y 375; aro superior de y 375 a 415 (a face de cima do pé topa na de baixo do aro); tampo de
 * 415 a 450; aro inferior de y 60 a 100, por dentro dos pés (a face de fora do aro encosta na face de dentro do pé); prateleira de
 * 8 mm dentro do aro, de y 76 a 84, com o contorno igual ao da face de dentro do aro.
 */

export const TABELA = {
  altura_total: 450,

  /* contorno do tampo (parâmetros de família: pista) */
  pista_comprimento: 1200,
  pista_largura: 600,
  tampo_espessura: 35,
  tampo_balanco: 15, /* o tampo passa 15 mm além da face de fora do aro superior */
  tampo_borda_raio: 8,
  tampo_borda_paineis: 4,

  /* aros em fita */
  aro_espessura: 8,
  aro_superior_altura: 40,
  aro_inferior_altura: 40,
  aro_inferior_y: 60,

  /* pés */
  pe_lado: 30,
  pe_centro_x: 280, /* centro do pé, a partir do meio da mesa; as retas da pista vão até x 300 */
  pe_capitel_lado: 6, /* quanto o bloco do capitel passa do lado do pé, no total */
  pe_capitel_alt: 10,
  pe_capitel_degrau_lado: 3,
  pe_capitel_degrau_alt: 8,
  pe_sapata_lado: 6,
  pe_sapata_alt: 8,
  pe_sapata_degrau_lado: 3,
  pe_sapata_degrau_alt: 8,

  /* prateleira */
  prateleira_espessura: 8,
  prateleira_y: 76,

  /* ornamentos */
  faixa_altura: 10, /* altura da fita da faixa, medida na vertical */
  faixa_espessura: 8,
  faixa_y_alta: 370, /* eixo da faixa junto ao pé: a face de cima toca o aro superior em y 375 */
  faixa_y_baixa: 345,
  faixa_degrau_x: 25, /* comprimento do trecho inclinado, em x */
  alca_altura: 30,
  alca_espessura: 8,
  alca_recuo: 4, /* a alça fica 4 mm para dentro da face de fora do aro superior */
  alca_meio_angulo: 50, /* graus de cada lado do eixo da pista */
};

/* Contorno de pista em milímetro, como `contorno` de `extrusao`: começa no meio da reta de baixo (z negativo), vai em x crescente
 * (anti-horário em x-z), contorna a ponta de x positivo, volta pela reta de cima e contorna a ponta de x negativo. */
function pista(raio, meiaReta) {
  const R = raio;
  const L = meiaReta;
  return {
    contorno: {
      inicio: [0, -R],
      trechos: [
        { reto: [L, -R] },
        { arco: { por: [L + R, 0], ate: [L, R] } },
        { reto: [-L, R] },
        { arco: { por: [-L - R, 0], ate: [-L, -R] } },
      ],
    },
  };
}

/* Anel de pista de raio externo `re` e fita `esp`: contorno externo e um furo de raio re - esp. */
function anelDePista(re, esp, meiaReta) {
  return { perfil: pista(re, meiaReta), furos: [pista(re - esp, meiaReta)] };
}

/* Setor de coroa em volta do centro da ponta [cx, 0], de raio interno ri a externo re, entre -a e +a graus do eixo (lado = +1 para
 * a ponta de x positivo, -1 para a de x negativo). Contorno por três pontos em cada arco. */
function setorDeAlca(cx, lado, ri, re, a) {
  const rad = (g) => (g * Math.PI) / 180;
  const p = (r, g) => [cx + lado * r * Math.cos(rad(g)), r * Math.sin(rad(g))];
  return {
    contorno: {
      inicio: p(re, -a),
      trechos: [
        { arco: { por: p(re, 0), ate: p(re, a) } },
        { reto: p(ri, a) },
        { arco: { por: p(ri, 0), ate: p(ri, -a) } },
      ],
    },
  };
}

/* Tudo em milímetro. Devolve as formas como dados: `extrusoes` (tampo, aros, prateleira), `pes` (pilhas de caixas), `faixas` e
 * `alcas`. */
export function derivar(T) {
  const meiaReta = (T.pista_comprimento - T.pista_largura) / 2;
  const R = T.pista_largura / 2;
  const tampoY1 = T.altura_total;
  const tampoY0 = tampoY1 - T.tampo_espessura;
  const aroSupY1 = tampoY0;
  const aroSupY0 = aroSupY1 - T.aro_superior_altura;
  const aroSupRaio = R - T.tampo_balanco; /* raio externo do aro superior */
  const peMeio = T.pe_lado / 2;
  const peZ = aroSupRaio - peMeio; /* a face de fora do pé alinha com a de fora do aro superior */
  const peFaceDentroZ = peZ - peMeio;
  const aroInfRaio = peFaceDentroZ; /* o aro inferior fica por dentro dos pés */
  const aroInfY0 = T.aro_inferior_y;
  const aroInfY1 = aroInfY0 + T.aro_inferior_altura;
  const prateleiraRaio = aroInfRaio - T.aro_espessura;

  const extrusoes = [];
  extrusoes.push({
    parte: 'tampo', material: 'marmore', y0: tampoY0, altura: T.tampo_espessura,
    perfil: pista(R, meiaReta), borda: { raio: T.tampo_borda_raio, paineis: T.tampo_borda_paineis },
  });
  extrusoes.push({ parte: 'aroSuperior', material: 'latao', y0: aroSupY0, altura: T.aro_superior_altura, ...anelDePista(aroSupRaio, T.aro_espessura, meiaReta) });
  extrusoes.push({ parte: 'aroInferior', material: 'latao', y0: aroInfY0, altura: T.aro_inferior_altura, ...anelDePista(aroInfRaio, T.aro_espessura, meiaReta) });
  extrusoes.push({ parte: 'prateleira', material: 'vidro', y0: T.prateleira_y, altura: T.prateleira_espessura, perfil: pista(prateleiraRaio, meiaReta) });

  /* pés: cada pé é uma pilha de caixas (sapata, degrau, fuste, degrau do capitel, capitel) fundidas num sólido */
  const pes = [];
  for (const sx of [+1, -1]) {
    for (const sz of [+1, -1]) {
      const cx = sx * T.pe_centro_x;
      const cz = sz * peZ;
      const caixa = (lado, y0, y1) => ({ cx, cz, lado, y0, y1 });
      const ySapata1 = T.pe_sapata_alt;
      const ySapataDegrau1 = ySapata1 + T.pe_sapata_degrau_alt;
      const yCapitel0 = aroSupY0 - T.pe_capitel_alt;
      const yCapitelDegrau0 = yCapitel0 - T.pe_capitel_degrau_alt;
      pes.push([
        caixa(T.pe_lado + T.pe_sapata_lado, 0, ySapata1),
        caixa(T.pe_lado + T.pe_sapata_degrau_lado, ySapata1, ySapataDegrau1),
        caixa(T.pe_lado, ySapataDegrau1, yCapitelDegrau0),
        caixa(T.pe_lado + T.pe_capitel_degrau_lado, yCapitelDegrau0, yCapitel0),
        caixa(T.pe_lado + T.pe_capitel_lado, yCapitel0, aroSupY0),
      ]);
    }
  }

  /* faixas: perfil no plano x-y, extrudado em z. Cada lado longo leva duas metades, uma de cada pé até o meio, com o degrau
   * inclinado junto ao pé. As pontas encostam na face de dentro do capitel, e o ponto alto toca a face de baixo do aro superior. */
  const capitelFaceX = T.pe_centro_x - (T.pe_lado + T.pe_capitel_lado) / 2;
  const hm = T.faixa_altura / 2;
  const caminho = [
    [capitelFaceX, T.faixa_y_alta],
    [capitelFaceX - 6, T.faixa_y_alta],
    [capitelFaceX - 6 - T.faixa_degrau_x, T.faixa_y_baixa],
    [0, T.faixa_y_baixa],
  ];
  const faixas = [];
  const zFaixa0 = aroSupRaio - T.faixa_espessura; /* a faixa ocupa a espessura do aro superior, logo abaixo dele */
  for (const sx of [+1, -1]) {
    for (const sz of [+1, -1]) {
      const pts = caminho.map(([x, y]) => [sx * x, y]);
      const cima = pts.map(([x, y]) => [x, y + hm]);
      const baixo = pts.map(([x, y]) => [x, y - hm]).reverse();
      let contorno = [...cima, ...baixo];
      if (sx < 0) contorno = contorno.reverse(); /* mantém o sentido depois do espelho em x */
      /* na extrusão em z o eixo v do perfil aponta para -y: o contorno vai com y negado e o sentido invertido */
      contorno = contorno.map(([x, y]) => [x, -y]).reverse();
      faixas.push({ sx, sz, contorno, z0: sz > 0 ? zFaixa0 : -aroSupRaio, espessura: T.faixa_espessura });
    }
  }

  /* alças em arco: setor de coroa nas pontas da pista, sob o aro superior, ligadas a ele pela face de cima */
  const alcas = [];
  for (const lado of [+1, -1]) {
    const re = aroSupRaio - T.alca_recuo;
    const s = setorDeAlca(lado * meiaReta, lado, re - T.alca_espessura, re, T.alca_meio_angulo);
    alcas.push({ lado, perfil: s, y0: aroSupY0 - T.alca_altura, altura: T.alca_altura });
  }

  return { meiaReta, extrusoes, pes, faixas, alcas, medidas: { aroSupRaio, aroInfRaio, prateleiraRaio, peZ, aroSupY0, aroInfY0, aroInfY1, tampoY0 } };
}

const m = (mm) => mm / 1000;

/* O tampo é o primeiro sólido da receita: a extrusão é o id 1 e o arredondamento da borda, o 2. */
const ID_TAMPO = 1;
const ID_TAMPO_BORDA = 2;

/* O tampo arredondado é a união da extrusão com as faixas que o arredondamento cria. */
export const ALIASES = [
  ['tampoInteiro', { unir: [{ origem: { op: 'extrusao', id: ID_TAMPO } }, { origem: { op: 'arredondarAresta', id: ID_TAMPO_BORDA } }] }],
];

/* mm -> metro nos perfis por trechos ou em lista de pontos */
function perfilEmMetro(p) {
  const pt = ([u, v]) => [m(u), m(v)];
  if (Array.isArray(p)) return p.map(pt);
  const c = p.contorno;
  return {
    contorno: {
      inicio: pt(c.inicio),
      trechos: c.trechos.map((t) => {
        if (t.reto) return { reto: pt(t.reto) };
        if (t.arco) return { arco: { por: pt(t.arco.por), ate: pt(t.arco.ate) } };
        throw new Error('trecho desconhecido');
      }),
    },
  };
}

/** Os PASSOS, em metro: extrusões de contorno (tampo, aros, prateleira, alças, faixas), os pés em caixas fundidas, e a `parte` e o
 *  `material` de cada parte. */
export function gerarPassos(T) {
  const d = derivar(T);
  const passos = [];
  let id = 0;
  const proximo = () => (id += 1);

  for (const e of d.extrusoes) {
    const eid = proximo();
    const passo = { origemId: eid, altura: m(e.altura), perfil: perfilEmMetro(e.perfil), em: [0, m(e.y0), 0], segmentosArco: 12 };
    if (e.furos) passo.furos = e.furos.map(perfilEmMetro);
    passos.push(['extrusao', passo]);
    let sel = { origem: { op: 'extrusao', id: eid } };
    if (e.borda) {
      const bid = proximo();
      if (eid !== ID_TAMPO || bid !== ID_TAMPO_BORDA) throw new Error('o tampo precisa ser o primeiro sólido');
      passos.push(['arredondarAresta', {
        origemId: bid,
        sel: { origem: { op: 'extrusao', id: eid }, onde: { alvo: 'aresta', normal: { dir: [0, 1, 0], ate: 5 }, extremo: { eixo: 'z', lado: 'max' } } },
        raio: m(e.borda.raio), paineis: e.borda.paineis, cadeia: true,
      }]);
      sel = { alias: 'tampoInteiro' };
    }
    passos.push(['parte', { nome: e.parte, sel }], ['material', { sel, usa: e.material }]);
  }

  const solidosPes = [];
  d.pes.forEach((pe) => {
    const ids = pe.map((c) => {
      const cid = proximo();
      passos.push(['cubo', { origemId: cid, larg: m(c.lado), alt: m(c.y1 - c.y0), prof: m(c.lado), em: [m(c.cx), m(c.y0), m(c.cz)] }]);
      return { origem: { op: 'cubo', id: cid } };
    });
    const uid = proximo();
    passos.push(['unir', { origemId: uid, solidos: ids }]);
    solidosPes.push({ origem: { op: 'unir', id: uid } });
  });
  const pesId = proximo();
  const selPes = { origem: { op: 'unir', id: pesId } };
  passos.push(['unir', { origemId: pesId, solidos: solidosPes }]);
  passos.push(['parte', { nome: 'pes', sel: selPes }], ['material', { sel: selPes, usa: 'latao' }]);

  const solidosOrn = [];
  d.faixas.forEach((f) => {
    const fid = proximo();
    passos.push(['extrusao', { origemId: fid, eixo: 'z', altura: m(f.espessura), perfil: perfilEmMetro(f.contorno), em: [0, 0, m(f.z0)] }]);
    solidosOrn.push({ origem: { op: 'extrusao', id: fid } });
  });
  d.alcas.forEach((a) => {
    const aid = proximo();
    passos.push(['extrusao', { origemId: aid, altura: m(a.altura), perfil: perfilEmMetro(a.perfil), em: [0, m(a.y0), 0], segmentosArco: 12 }]);
    solidosOrn.push({ origem: { op: 'extrusao', id: aid } });
  });
  const ornId = proximo();
  const selOrn = { origem: { op: 'unir', id: ornId } };
  passos.push(['unir', { origemId: ornId, solidos: solidosOrn }]);
  passos.push(['parte', { nome: 'ornamento', sel: selOrn }], ['material', { sel: selOrn, usa: 'latao' }]);
  return passos;
}

export const CONTATOS = [
  { par: ['pes', 'aroSuperior'], motivo: 'a face de cima do capitel de cada pé topa na face de baixo do aro superior, em y 375' },
  { par: ['pes', 'aroInferior'], motivo: 'a face de fora do aro inferior encosta na face de dentro de cada pé, em z 255 (aro por dentro dos pés)' },
  { par: ['prateleira', 'aroInferior'], motivo: 'o contorno do vidro é o da face de dentro do aro inferior, e o vidro fica entre y 60 e 100, dentro da altura do aro' },
  { par: ['ornamento', 'pes'], motivo: 'a ponta de cada faixa encosta na face de dentro do capitel do pé, entre y 365 e 375' },
  { par: ['ornamento', 'aroSuperior'], motivo: 'a face de cima das faixas altas e das alças topa na face de baixo do aro superior, em y 375' },
  { par: ['tampo', 'aroSuperior'], motivo: 'o tampo apoia a face de baixo, em y 415, na face de cima do aro superior' },
];

const receita = {
  meta: { nome: 'mesa-de-centro-oval', desc: 'mesa de centro oval de pista, tampo de mármore, quatro pés de latão, dois aros em fita, prateleira de vidro e ornamentos de latão' },
  PARAMS: TABELA,
  MATERIAIS: {
    latao: { cor: '#b08d57', metalicidade: 0.9, aspereza: 0.4 },
    marmore: { cor: '#ece9e4', metalicidade: 0, aspereza: 0.25 },
    vidro: { cor: '#cfe3e3', metalicidade: 0, aspereza: 0.05 },
  },
  TOPO: { origem: 'chão, no centro da planta em x e z; y para cima, o eixo comprido da pista em x e a frente da mesa em +z' },
  PLANO: {
    objeto: 'mesa de centro oval de luxo, 1200 por 600 mm em planta (pista de raio 300) e 450 mm de altura, com tampo de mármore, estrutura de latão escovado e prateleira de vidro',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total da mesa', milimetros: 450 },
    partes: [
      { nome: 'pes', forma: 'quatro pés de seção quadrada de 30 mm nas retas da pista, com capitel em degrau perto do topo e sapata em degrau embaixo', tecnica: 'cubos empilhados e fundidos por unir, do chão até a face de baixo do aro superior' },
      { nome: 'aroInferior', forma: 'aro de latão em fita, 40 mm de altura e 8 mm de espessura, a 60 mm do chão, seguindo a pista, por dentro dos pés', tecnica: 'extrusao de contorno de pista com furo de pista paralelo' },
      { nome: 'prateleira', forma: 'vidro de 8 mm com contorno de pista, encaixado dentro do aro inferior', tecnica: 'extrusao de contorno de pista' },
      { nome: 'aroSuperior', forma: 'aro de latão em fita, 40 mm de altura e 8 mm de espessura, logo abaixo do tampo, seguindo a pista', tecnica: 'extrusao de contorno de pista com furo de pista paralelo' },
      { nome: 'ornamento', forma: 'duas faixas de latão em cada lado longo, entre os pés, de perfil em degrau que sobe em ângulo junto ao pé, e uma alça em arco em cada ponta da pista, ligadas ao aro superior', tecnica: 'extrusao em z de contorno de polilinha para as faixas e extrusao de setor de coroa para as alças, fundidas por unir' },
      { nome: 'tampo', forma: 'mármore branco de 35 mm, oval de pista com balanço de 15 mm além do aro superior, borda em meia-cana', tecnica: 'extrusao de contorno de pista com arredondarAresta em cadeia na borda de cima' },
    ],
    criteriosDeReprovacao: [
      'tampo ou aros que não seguem a pista (retangulares ou elípticos)',
      'prateleira solta do aro inferior',
      'ornamento solto dos pés ou do aro superior',
      'pés sem capitel e sapata',
      'peças que se interpenetram',
    ],
  },
  ALIASES,
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    const d = derivar(T);
    const R = T.pista_largura / 2;
    const L = T.pista_comprimento / 2;
    const { aroSupRaio, aroInfRaio, prateleiraRaio } = d.medidas;
    const meia = d.meiaReta;
    return [
      { nome: 'canto do tampo', parte: 'tampo', medida: 'maximo', em: [L, T.altura_total, R], toleranciaMm: 0.5 },
      { nome: 'ponta do aro superior', parte: 'aroSuperior', medida: 'maximo', em: [meia + aroSupRaio, d.medidas.aroSupY0 + T.aro_superior_altura, aroSupRaio], toleranciaMm: 0.5 },
      { nome: 'ponta do aro inferior', parte: 'aroInferior', medida: 'maximo', em: [meia + aroInfRaio, d.medidas.aroInfY1, aroInfRaio], toleranciaMm: 0.5 },
      { nome: 'ponta da prateleira', parte: 'prateleira', medida: 'maximo', em: [meia + prateleiraRaio, T.prateleira_y + T.prateleira_espessura, prateleiraRaio], toleranciaMm: 0.5 },
      { nome: 'topo do capitel', parte: 'pes', medida: 'maximo', em: [T.pe_centro_x + (T.pe_lado + T.pe_capitel_lado) / 2, d.medidas.aroSupY0, d.medidas.peZ + (T.pe_lado + T.pe_capitel_lado) / 2], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() {
    return gerarPassos(this.PARAMS);
  },
};

export default receita;
