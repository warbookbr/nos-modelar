/* instalacao-solar/perfil — o trilho de alumínio extrudado de 1,35 m que leva os grampos dos painéis.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`, "Medidas e
 * quantidades da obra"). A obra corta 4 destes em linha para cerca de 4,55 m; a receita é o perfil inteiro de 1,35 m.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a face de baixo do trilho), o trilho ao longo de x, de 0 a `comprimento`, e
 * o eixo do canal de cima em z = 0. A seção é a mesma em todo o comprimento, vista de ponta com +z para a face estriada: 45 mm de altura
 * por 30 de largura, oca e assimétrica. Em cima, um canal em T aberto para cima (a cabeça ou a porca do parafuso dos grampos entra
 * por baixo das duas abas finas de cima, o pescoço fica livre); o lado de +z é uma face inteira estriada ao longo do comprimento,
 * com um rasgo lateral que abre para uma câmara por dentro, onde entram a porca do parafuso do suporte em L e, na junta entre dois
 * perfis, a barra da emenda, em pé (fotos da pessoa, 2026-11-12, fora do repositório); embaixo, uma aba que abre para o lado de -z com a borda virada
 * para cima; por dentro, uma parede inclinada liga o fundo ao piso do canal de cima e parte o vazio em dois.
 *
 * MEDIDAS REAIS (a pessoa mediu): comprimento de 1350 mm, altura de 45 mm, largura de 30 mm, paredes de uns 2 mm. A CONFIRMAR: o
 * pescoço de 10 mm do canal, a altura de 10 mm da câmara do T, o rasgo lateral de 10 mm a 21 mm do fundo e a câmara de 14 por 6 mm atrás dele, o friso de 0,6 mm a
 * cada 3 mm, a borda de 7 mm da aba de baixo e o corte da parede inclinada: valores lidos das fotos, sem a pessoa ter medido.
 *
 * Técnica: uma `extrusao` de eixo x do contorno externo da seção (com o T do canal, o rasgo lateral, os frisos e a aba de baixo) e dois
 * `furos` para o vazio dos dois lados da parede inclinada, tudo escrito em `derivar`. Quinas externas quebradas.
 */

export const TABELA = {
  /* Medidas do documento da pessoa: comprimento, altura e largura da seção. */
  comprimento: 1350,
  altura: 45,
  largura: 30,
  /* A pessoa deu "uns 2 mm" de parede. */
  parede: 2,
  /* A CONFIRMAR: meia-largura do corpo (a face estriada em +z, o outro lado do corpo em -z); o que sobra da largura é a aba de baixo, para -z. */
  corpoMeio: 13,
  /* A CONFIRMAR: o pescoço do canal (a abertura de cima), a espessura de cada aba de cima e a altura da câmara do T, sob as abas. */
  canalDeCima: 10,
  espessuraDaAba: 2,
  alturaDoT: 10,
  /* A CONFIRMAR: rasgo lateral da face estriada (a abertura e a altura do centro dele) e a câmara atrás dele, mais alta que o rasgo e com as
     bordas da parede por cima e por baixo da abertura, onde a barra da emenda fica em pé e a porca do parafuso do L encosta. */
  rasgoLateralAltura: 10,
  rasgoLateralCentro: 21,
  camaraAltura: 14,
  camaraLargura: 6,
  /* A CONFIRMAR: frisos horizontais da face de +z: crista, vale, fundura. */
  frisoCrista: 1.5,
  frisoVale: 1.5,
  frisoFundura: 0.6,
  /* A CONFIRMAR: a altura da borda virada para cima na ponta da aba de baixo. */
  bordaDaAba: 7,
  /* A CONFIRMAR: a parede inclinada, de onde sai no fundo (z do centro dela) a onde chega no piso do T. */
  almaNoFundo: 5,
  almaNoPiso: -5,
  /* Acabamento: quina externa quebrada. */
  quina: 1,
  /* A CONFIRMAR: onde o primeiro suporte em L encosta e onde o primeiro painel começa, a partir da ponta de x = 0. Na montagem os dois
     valores vêm das portas do telhado (a primeira haste e o início dos painéis); o valor daqui só vale para ver a peça sozinha. */
  posicaoDoSuporte: 151,
  posicaoDoPrimeiroPainel: 89,
};

export const MATERIAIS = { aluminio: { cor: '#b9bec4', metalicidade: 0.85, aspereza: 0.35 } };

const m = (mm) => mm / 1000;
const ID = { corpo: 100 };

/* Os frisos de uma face reta: de `a` a `b`, a crista no traçado, o vale `fundura` para o lado `dentro`. Começa na crista em `a`. */
export function frisos(a, b, dentro, crista, vale, fundura) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const u = [(b[0] - a[0]) / len, (b[1] - a[1]) / len];
  const em = (pos, prof = 0) => [a[0] + u[0] * pos + dentro[0] * prof, a[1] + u[1] * pos + dentro[1] * prof];
  const pts = [a];
  for (let pos = 0; pos + crista + vale < len - 0.2; pos += crista + vale) {
    pts.push(em(pos + crista), em(pos + crista, fundura), em(pos + crista + vale, fundura), em(pos + crista + vale));
  }
  pts.push(b);
  return pts;
}

export function derivar(t = TABELA) {
  const W = t.corpoMeio;
  const aba = t.largura - 2 * W;
  const H = t.altura;
  const e = t.parede;
  const q = t.quina;
  const s = t.canalDeCima / 2;
  const Ti = W - e;
  const yDoPiso = H - t.espessuraDaAba - t.alturaDoT;
  const yDoForro = yDoPiso - e;
  const ya = t.rasgoLateralCentro + t.rasgoLateralAltura / 2;
  const yb = t.rasgoLateralCentro - t.rasgoLateralAltura / 2;
  const yca = t.rasgoLateralCentro + t.camaraAltura / 2;
  const ycb = t.rasgoLateralCentro - t.camaraAltura / 2;
  const zc = Ti - t.camaraLargura;
  const fr = (a, b) => frisos(a, b, [-1, 0], t.frisoCrista, t.frisoVale, t.frisoFundura);
  /* Contorno externo em (z, y), do pescoço de +z para baixo pela face estriada: o T do canal, a face com o rasgo, a aba de baixo (que abre
     para -z, com a borda para cima), a parede de -z e de novo o T. */
  const zy = [
    [s, H], [W - q, H], [W, H - q],
    ...fr([W, H - q], [W, ya]).slice(1),
    [Ti, ya], [Ti, yca], [zc, yca], [zc, ycb], [Ti, ycb], [Ti, yb],
    ...fr([W, yb], [W, q]),
    [W - q, 0], [-W - aba + q, 0], [-W - aba, q], [-W - aba, t.bordaDaAba], [-W - aba + e, t.bordaDaAba], [-W - aba + e, e], [-W, e],
    [-W, H - q], [-W + q, H], [-s, H],
    [-s, H - t.espessuraDaAba], [-Ti, H - t.espessuraDaAba], [-Ti, yDoPiso], [Ti, yDoPiso], [Ti, H - t.espessuraDaAba], [s, H - t.espessuraDaAba],
  ];
  /* A parede inclinada: eixo do fundo (almaNoFundo) ao piso (almaNoPiso), com `parede` de largura medida na horizontal. */
  const meia = e * 0.55;
  const xAlma = (y, lado) => t.almaNoFundo + ((t.almaNoPiso - t.almaNoFundo) * (y - e)) / (yDoForro - e) + lado * meia;
  /* O vazio em dois: à esquerda (lado de -z) da parede inclinada, e à direita, abaixo da câmara do rasgo e ao lado dela, a uma parede dela. */
  const vazioEsq = [[-Ti, e], [xAlma(e, -1), e], [xAlma(yDoForro, -1), yDoForro], [-Ti, yDoForro]];
  const vazioDir = [
    [xAlma(e, 1), e], [Ti, e], [Ti, ycb - e], [zc - e, ycb - e], [zc - e, yDoForro], [xAlma(yDoForro, 1), yDoForro],
  ];
  return { L: t.comprimento, zy, furos: [vazioEsq, vazioDir], yDoT: (yDoPiso + H - t.espessuraDaAba) / 2, zFace: W, zDaCamara: zc + t.camaraLargura / 2 };
}


const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);
const publicar = (passos, portasEmMm, de) => {
  for (const [nome, porta] of Object.entries(portasEmMm)) {
    passos.push(['publicarPorta', { nome, de, interface: Object.fromEntries(Object.entries(porta).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]);
  }
};

/* As portas, em mm: a face de lado onde o suporte em L encosta, na altura do rasgo e a `posicaoDoSuporte` da ponta de x = 0; e as faces de ponta,
   no centro da câmara do rasgo lateral, onde a emenda entra; e o topo, onde o primeiro painel assenta, a `posicaoDoPrimeiroPainel` da ponta (a referência dele é -z). A
   referência das outras é +y, para cima. */
export function portas(t = TABELA) {
  const { zFace, zDaCamara } = derivar(t);
  return {
    lateral: { forma: 'plano', papel: 'apoia', ponto: [t.posicaoDoSuporte, t.rasgoLateralCentro, zFace], normal: [0, 0, 1], extensao: [t.altura, 50], referencia: [0, 1, 0] },
    fim: { forma: 'plano', papel: 'recebe', ponto: [t.comprimento, t.rasgoLateralCentro, zDaCamara], normal: [1, 0, 0], extensao: [t.largura, t.altura], referencia: [0, 1, 0] },
    inicio: { forma: 'plano', papel: 'apoia', ponto: [0, t.rasgoLateralCentro, zDaCamara], normal: [-1, 0, 0], extensao: [t.largura, t.altura], referencia: [0, 1, 0] },
    topo: { forma: 'plano', papel: 'recebe', ponto: [t.posicaoDoPrimeiroPainel, t.altura, 0], normal: [0, 1, 0], extensao: [t.largura, 100], referencia: [0, 0, -1] },
  };
}

export function gerarPassos(t = TABELA) {
  const { L, zy, furos } = derivar(t);
  const passos = [];
  /* Em eixo x o ponto [u, v] do perfil vai para y = -u e z = v. */
  passos.push(['extrusao', { origemId: ID.corpo, eixo: 'x', altura: m(L), perfil: zy.map(([z, y]) => [m(-y), m(z)]), furos: furos.map((f) => f.map(([z, y]) => [m(-y), m(z)])) }]);
  passos.push(['parte', { nome: 'corpo', sel: { origem: { op: 'extrusao', id: ID.corpo } } }]);
  passos.push(['material', { usa: 'aluminio', sel: { origem: { op: 'extrusao', id: ID.corpo } } }]);
  publicar(passos, portas(t), { op: 'extrusao', id: ID.corpo });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/perfil', desc: 'trilho de alumínio extrudado de 1,35 m, seção oca de 45 por 30 mm com canal em T no topo, face lateral estriada com rasgo e aba de baixo com borda virada para cima' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'face de baixo do trilho, na ponta de x = 0, com o eixo do canal de cima em z = 0 (a face estriada em +z, a aba de baixo para -z); y para cima, o trilho ao longo de +x' },
  PLANO: {
    objeto: 'trilho de alumínio extrudado de 1,35 m, seção oca de 45 mm de altura por 30 de largura: canal em T aberto em cima, face lateral estriada com rasgo para o suporte em L, aba larga embaixo e parede inclinada por dentro',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'comprimento do perfil do kit', milimetros: 1350 },
    partes: [
      { nome: 'corpo', forma: 'tubo de alumínio de 45 por 30 mm, paredes de 2 mm, 1350 mm em x, oco: canal em T aberto em cima com abas finas; face de +z estriada com rasgo para uma câmara; aba de baixo aberta para -z com borda para cima; parede inclinada por dentro', tecnica: 'extrusão de eixo x do contorno externo (T, rasgo, frisos e aba escritos em derivar) com dois furos para o vazio dos dois lados da parede inclinada' },
    ],
    criteriosDeReprovacao: [
      'comprimento diferente de 1350 mm, altura diferente de 45 mm ou largura diferente de 30 mm',
      'seção maciça, sem o vazio por dentro, ou sem a parede inclinada dividindo o vazio',
      'sem o canal em T aberto no topo, ou canal fechado por tampa, ou sem as duas abas de cima sobre a câmara do T',
      'face lateral lisa, sem os frisos horizontais, ou sem o rasgo lateral com a câmara atrás dele, para a porca do parafuso do L e a barra da emenda',
      'aba de baixo simétrica ou sem a borda virada para cima',
      'parte do perfil abaixo do chão (y negativo) ou deitado de lado',
      'quinas externas vivas, sem a quebra de 1 mm',
    ],
  },
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
