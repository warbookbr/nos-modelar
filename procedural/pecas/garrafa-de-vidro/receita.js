/* garrafa-de-vidro — garrafa de boca larga, sem tampa, uma parte (`garrafa`).
 * O alvo está em referencias/alvo.md. O perfil de revolução (raio, altura) é uma
 * lista de pontos escrita na `derivar`, separada da operação que o gira (`lathe`);
 * a rosca não é revolução pura e entra como um tubo helicoidal (`loft`) unido ao corpo.
 */

export const TABELA = {
  /* Corpo e proporções, em mm. */
  altura: 160,
  raio_corpo: 37.5,
  parede: 2.5,
  raio_gargalo: 22.5, /* núcleo do gargalo; com 2,5 de parede o furo da boca fica com 40 de diâmetro */
  altura_corpo: 100, /* onde o cilindro acaba e o ombro começa */
  altura_gargalo: 122, /* onde o ombro chega ao gargalo */
  /* Fundo: cúpula para dentro e anel de apoio. */
  cupula: 10,
  raio_apoio_interno: 30,
  raio_apoio_externo: 37.5,
  /* Colar saliente. */
  colar_y: 128,
  colar_altura: 5,
  colar_raio: 26.5,
  /* Rosca: tubo helicoidal. */
  rosca_y0: 140,
  rosca_passo: 7,
  rosca_voltas: 2,
  rosca_raio_fio: 1.2,
  rosca_raio_centro: 23.1, /* crista em 24,3: diâmetro externo do gargalo com rosca = 48 */
  rosca_secoes_por_volta: 24,
  /* Acabamento. */
  raio_canto: 3,
  raio_boca: 0.8,
  lados: 48,
  segmentos_curva: 4,
  angulo_liso: 50,
};

const m = (mm) => mm / 1000;

/* Deslocamento de uma polilinha [r, y, concordancia?] para a esquerda do sentido,
   por meia-esquadria; a concordância encolhe com a distância. */
function deslocarPerfil(pts, d) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(i - 1, 0)];
    const b = pts[i];
    const c = pts[Math.min(i + 1, pts.length - 1)];
    const norm = (p, q) => {
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const L = Math.hypot(dx, dy) || 1;
      return [-dy / L, dx / L];
    };
    const n1 = i === 0 ? norm(b, c) : norm(a, b);
    const n2 = i === pts.length - 1 ? norm(a, b) : norm(b, c);
    let nx = n1[0] + n2[0];
    let ny = n1[1] + n2[1];
    const L = Math.hypot(nx, ny) || 1;
    nx /= L;
    ny /= L;
    const k = Math.min(1 / Math.max(nx * n1[0] + ny * n1[1], 0.5), 2);
    const r = b[2] ? Math.max(b[2] - d, 0) : 0;
    out.push([b[0] + nx * d * k, b[1] + ny * d * k, ...(r > 0.05 ? [r] : [])]);
  }
  return out;
}

/** Perfil externo (raio, altura) em mm, do eixo no fundo até a borda da boca. */
export function perfilExterno(T) {
  const p = [];
  /* Cúpula: do centro (y = cupula) descendo ao anel de apoio, curva suave. */
  const nC = 6;
  for (let i = 0; i <= nC; i++) {
    const t = i / nC;
    p.push([T.raio_apoio_interno * t, T.cupula * (1 - t * t * (3 - 2 * t))]);
  }
  p.push([T.raio_apoio_externo - T.raio_canto, 0]);
  p.push([T.raio_corpo, T.raio_canto * 2, 0]);
  p.push([T.raio_corpo, T.altura_corpo]);
  /* Ombro: quarto de elipse de (raio_corpo, altura_corpo) a (raio_gargalo, altura_gargalo), tangente vertical nas pontas. */
  const a = T.raio_corpo - T.raio_gargalo;
  const b = T.altura_gargalo - T.altura_corpo;
  const nO = 10;
  for (let i = 1; i <= nO; i++) {
    const t = (i / nO) * (Math.PI / 2);
    p.push([T.raio_gargalo + a * Math.cos(t), T.altura_corpo + b * Math.sin(t)]);
  }
  p.push([T.raio_gargalo, T.altura]);
  return p;
}

/** Perfil fechado da seção: parede externa subindo, borda da boca, parede interna descendo ao eixo. */
export function perfilSecao(T) {
  const ext = perfilExterno(T);
  const interno = deslocarPerfil(ext, T.parede);
  const topoExt = ext[ext.length - 1];
  /* O colar é um ressalto só da face externa; a parede interna segue lisa. */
  const subida = ext.slice(0, -1);
  subida.push(
    [T.raio_gargalo, T.colar_y],
    [T.colar_raio, T.colar_y, 1],
    [T.colar_raio, T.colar_y + T.colar_altura, 1],
    [T.raio_gargalo, T.colar_y + T.colar_altura + 2],
    [topoExt[0], topoExt[1], T.raio_boca],
  );
  const descendo = interno.slice().reverse();
  descendo[0] = [descendo[0][0], T.altura, T.raio_boca];
  descendo[descendo.length - 1] = [0, descendo[descendo.length - 1][1]];
  return [...subida, ...descendo];
}

/** Eixo da rosca: seções {pos, raio} de um tubo que dá voltas no gargalo, em mm. */
export function secoesDaRosca(T) {
  const n = T.rosca_voltas * T.rosca_secoes_por_volta;
  const s = [];
  for (let i = 0; i <= n; i++) {
    const ang = (i / T.rosca_secoes_por_volta) * 2 * Math.PI;
    s.push({
      pos: [T.rosca_raio_centro * Math.cos(ang), T.rosca_y0 + T.rosca_passo * (i / T.rosca_secoes_por_volta), T.rosca_raio_centro * Math.sin(ang)],
      raio: T.rosca_raio_fio,
    });
  }
  /* loft só fecha com a ponta em raio 0: o fio começa e termina afinando num ponto. */
  s[0] = { pos: s[0].pos, raio: 0 };
  s[s.length - 1] = { pos: s[s.length - 1].pos, raio: 0 };
  return s;
}

export function derivar(T = TABELA) {
  return { perfil: perfilSecao(T), rosca: secoesDaRosca(T) };
}

const ID = { corpo: 1, rosca: 2, garrafa: 3 };

export function gerarPassos(T = TABELA) {
  const D = derivar(T);
  const passos = [];
  passos.push(['lathe', {
    origemId: ID.corpo,
    lados: T.lados,
    segmentosCurva: T.segmentos_curva,
    perfil: D.perfil.map(([r, y, c]) => (c ? [m(r), m(y), m(c)] : [m(r), m(y)])),
  }]);
  passos.push(['loft', {
    origemId: ID.rosca,
    lados: 8,
    secoes: D.rosca.map((s) => ({ pos: s.pos.map(m), raio: m(s.raio) })),
  }]);
  passos.push(['unir', {
    origemId: ID.garrafa,
    solidos: [{ origem: { op: 'lathe', id: ID.corpo } }, { origem: { op: 'loft', id: ID.rosca } }],
  }]);
  const sel = { origem: { op: 'unir', id: ID.garrafa } };
  passos.push(['parte', { nome: 'garrafa', sel }]);
  passos.push(['material', { usa: 'vidro', sel }]);
  passos.push(['liso', { sel, angulo: T.angulo_liso }]);
  return passos;
}

export const CONTATOS = [];

export const MATERIAIS = { vidro: { cor: '#b9d8d0', aspereza: 0.05, metalicidade: 0 } };

const receita = {
  meta: { nome: 'garrafa-de-vidro', desc: 'garrafa de vidro de boca larga, oca, com cúpula no fundo, colar e rosca no gargalo' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro do fundo, no chão; y para cima, eixo da garrafa em y' },
  PLANO: {
    objeto: 'garrafa de vidro de boca larga sem tampa, 160 mm de altura, corpo de 75 mm de diâmetro, gargalo curto com rosca e colar, parede de 2,5 mm',
    referencias: ['referencias/alvo.md'],
    escala: { medida: 'altura total da garrafa', milimetros: 160 },
    partes: [
      {
        nome: 'garrafa',
        forma: 'casca oca de revolução: corpo cilíndrico, ombro em curva até o gargalo, boca de 40 mm, colar saliente, duas voltas de rosca helicoidal, fundo com cúpula de 10 mm e anel de apoio',
        tecnica: 'lathe com o perfil da seção fechada (parede 2,5), unido por unir a um loft helicoidal da rosca; liso com ângulo',
        dePerto: [
          { ponto: [0, 140, 24], oQue: 'rosca helicoidal e colar no gargalo' },
          { ponto: [0, 5, 20], oQue: 'cúpula do fundo e anel de apoio' },
        ],
      },
    ],
    criteriosDeReprovacao: [
      'garrafa maciça, sem a cavidade de parede 2,5 mm aberta pela boca',
      'gargalo sem rosca ou sem colar saliente abaixo dela',
      'fundo plano, sem a cúpula que sobe uns 10 mm no meio',
      'ombro em degrau em vez de curva contínua do corpo ao gargalo',
    ],
  },
  contatos: CONTATOS,
  get PONTOS() {
    const T = this.PARAMS;
    return [
      { nome: 'topo da boca', parte: 'garrafa', medida: 'maximo', em: [T.raio_corpo, T.altura, T.raio_corpo], toleranciaMm: 0.5 },
      { nome: 'fundo no chão', parte: 'garrafa', medida: 'minimo', em: [-T.raio_corpo, 0, -T.raio_corpo], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
