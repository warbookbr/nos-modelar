/* instalacao-solar/perfil — o trilho de alumínio extrudado de 1,35 m que leva os grampos dos painéis.
 *
 * Peça avulsa do kit da instalação solar (plano `docs/modelar/planos/2026-11-12-instalacao-solar-no-telhado.md`, "Medidas e
 * quantidades da obra"). A obra corta 4 destes em linha para cerca de 4,55 m; a receita é o perfil inteiro de 1,35 m.
 *
 * Referencial do acervo: Y para cima, o chão em y = 0 (a face de baixo do trilho), o trilho ao longo de x, de 0 a `comprimento`,
 * centrado em z. A seção é a mesma em todo o comprimento: um tubo quadrado oco com o canal aberto no topo (por onde entra o
 * parafuso do grampo) e um rasgo raso em cada lado (onde o suporte em L prende).
 *
 * MEDIDAS A CONFIRMAR (a pessoa ainda não mediu o perfil visto de ponta): a seção de 40 por 40 mm, a parede de 2,5 mm, o canal de
 * 14 mm e os rasgos laterais de 10 mm por 4 mm são valores típicos de kits desse tipo. O comprimento de 1350 mm é do kit.
 *
 * Técnica: uma `extrusao` de eixo x do contorno da seção, escrito em `derivar` como um laço só (a seção é uma chapa em C, sem
 * ilha), com as quinas externas quebradas.
 */

export const TABELA = {
  /* Comprimento do perfil do kit. */
  comprimento: 1350,
  /* A CONFIRMAR: seção típica de 40 por 40 mm. */
  largura: 40,
  altura: 40,
  /* A CONFIRMAR: parede do tubo. */
  parede: 2.5,
  /* A CONFIRMAR: abertura do canal de cima, para o parafuso do grampo, e a espessura da tampa em cada lado dela. */
  canalDeCima: 14,
  espessuraDoLabio: 3,
  /* A CONFIRMAR: rasgo raso de cada lado, para o suporte em L: altura, fundura e a altura do centro dele. */
  rasgoLateralAltura: 10,
  rasgoLateralFundura: 4,
  rasgoLateralCentro: 20,
  /* Acabamento: quina externa quebrada. */
  quina: 1.5,
  /* A CONFIRMAR: onde o primeiro suporte em L encosta e onde o primeiro painel começa, a partir da ponta de x = 0. Na montagem os dois
     valores vêm das portas do telhado (a primeira haste e o início dos painéis); o valor daqui só vale para ver a peça sozinha. */
  posicaoDoSuporte: 151,
  posicaoDoPrimeiroPainel: 89,
};

export const MATERIAIS = { aluminio: { cor: '#b9bec4', metalicidade: 0.85, aspereza: 0.35 } };

const m = (mm) => mm / 1000;
const ID = { corpo: 100 };

export function derivar(t = TABELA) {
  const W = t.largura / 2;
  const Wi = W - t.parede;
  const H = t.altura;
  const s = t.canalDeCima / 2;
  const q = t.quina;
  const d = t.rasgoLateralFundura;
  const ya = t.rasgoLateralCentro + t.rasgoLateralAltura / 2;
  const yb = t.rasgoLateralCentro - t.rasgoLateralAltura / 2;
  /* A parede dobra para dentro no rasgo: por dentro o degrau fica uma parede acima e uma abaixo do degrau de fora. */
  const ia = ya + t.parede;
  const ib = yb - t.parede;
  /* Contorno da seção em (z, y), anti-horário visto de +x: o externo da fresta direita do canal ao redor até a esquerda, e o
     interno de volta, sem cruzar: o tubo aberto é um laço só. */
  const zy = [
    [s, H], [W - q, H], [W, H - q], [W, ya], [W - d, ya], [W - d, yb], [W, yb], [W, q], [W - q, 0],
    [-W + q, 0], [-W, q], [-W, yb], [-W + d, yb], [-W + d, ya], [-W, ya], [-W, H - q], [-W + q, H], [-s, H],
    [-s, H - t.espessuraDoLabio], [-Wi, H - t.espessuraDoLabio], [-Wi, ia], [-Wi + d, ia], [-Wi + d, ib], [-Wi, ib],
    [-Wi, t.parede], [Wi, t.parede], [Wi, ib], [Wi - d, ib], [Wi - d, ia], [Wi, ia], [Wi, H - t.espessuraDoLabio], [s, H - t.espessuraDoLabio],
  ];
  return { L: t.comprimento, zy };
}


const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);
const publicar = (passos, portasEmMm, de) => {
  for (const [nome, porta] of Object.entries(portasEmMm)) {
    passos.push(['publicarPorta', { nome, de, interface: Object.fromEntries(Object.entries(porta).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }]);
  }
};

/* As portas, em mm: a face de lado onde o suporte em L encosta, na altura do rasgo e a `posicaoDoSuporte` da ponta de x = 0; e as faces de ponta,
   no centro do vazio, onde a emenda entra; e o topo, onde o primeiro painel assenta, a `posicaoDoPrimeiroPainel` da ponta (a referência dele é -z). A
   referência das outras é +y, para cima. */
export function portas(t = TABELA) {
  const yDoVazio = (t.parede + t.altura - t.espessuraDoLabio) / 2;
  return {
    lateral: { forma: 'plano', papel: 'apoia', ponto: [t.posicaoDoSuporte, t.rasgoLateralCentro, t.largura / 2], normal: [0, 0, 1], extensao: [t.altura, 50], referencia: [0, 1, 0] },
    fim: { forma: 'plano', papel: 'recebe', ponto: [t.comprimento, yDoVazio, 0], normal: [1, 0, 0], extensao: [t.largura, t.altura], referencia: [0, 1, 0] },
    inicio: { forma: 'plano', papel: 'apoia', ponto: [0, yDoVazio, 0], normal: [-1, 0, 0], extensao: [t.largura, t.altura], referencia: [0, 1, 0] },
    topo: { forma: 'plano', papel: 'recebe', ponto: [t.posicaoDoPrimeiroPainel, t.altura, 0], normal: [0, 1, 0], extensao: [t.largura, 100], referencia: [0, 0, -1] },
  };
}

export function gerarPassos(t = TABELA) {
  const { L, zy } = derivar(t);
  const passos = [];
  /* Em eixo x o ponto [u, v] do perfil vai para y = -u e z = v. */
  passos.push(['extrusao', { origemId: ID.corpo, eixo: 'x', altura: m(L), perfil: zy.map(([z, y]) => [m(-y), m(z)]) }]);
  passos.push(['parte', { nome: 'corpo', sel: { origem: { op: 'extrusao', id: ID.corpo } } }]);
  passos.push(['material', { usa: 'aluminio', sel: { origem: { op: 'extrusao', id: ID.corpo } } }]);
  publicar(passos, portas(t), { op: 'extrusao', id: ID.corpo });
  return passos;
}

const receita = {
  meta: { nome: 'instalacao-solar/perfil', desc: 'trilho de alumínio extrudado de 1,35 m, seção oca de 40 por 40 mm com canal no topo e rasgo raso em cada lado' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'face de baixo do trilho, na ponta de x = 0, centrada em z; y para cima, o trilho ao longo de +x' },
  PLANO: {
    objeto: 'trilho de alumínio extrudado de 1,35 m, seção típica de 40 por 40 mm, oca, com o canal de cima para o parafuso do grampo e o rasgo lateral para o suporte em L',
    referencias: ['../../referencias/kit.md'],
    escala: { medida: 'comprimento do perfil do kit', milimetros: 1350 },
    partes: [
      { nome: 'corpo', forma: 'tubo quadrado de 40 por 40 mm e parede de 2,5 mm, 1350 mm ao longo de x, oco de ponta a ponta, com o canal de 14 mm aberto no topo e um rasgo raso de 10 por 4 mm em cada lado, quinas externas quebradas de 1,5 mm, cinza metálico de alumínio', tecnica: 'extrusão de eixo x do contorno da seção como laço único com o canal aberto' },
    ],
    criteriosDeReprovacao: [
      'comprimento diferente de 1350 mm',
      'seção maciça, sem o vazio por dentro do tubo',
      'sem o canal aberto no topo, ou canal fechado por tampa',
      'sem o rasgo raso em um dos dois lados',
      'seção que não é quadrada de cerca de 40 por 40 mm',
      'parte do perfil abaixo do chão (y negativo) ou deitado de lado',
      'quinas externas vivas, sem a quebra de 1,5 mm',
    ],
  },
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
