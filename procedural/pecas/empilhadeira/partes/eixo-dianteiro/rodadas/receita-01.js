/* empilhadeira/eixo-dianteiro — o eixo dianteiro motriz da empilhadeira: o tubo de Ø 150 de flange a flange com o bojo do
 * diferencial no meio e os dois assentos que sobem até o teto do entalhe das chapas do chassi, e os dois cubos (o flange de Ø 220,
 * onde a roda assenta, e a tampa de Ø 100, que passa pelo furo do disco da roda), numa peça rígida.
 *
 * Segunda etapa da montagem `../../montagem.json` (fatia 3 do plano `docs/modelar/planos/2026-11-09-empilhadeira.md`, item 2 das
 * partes do `../../ALINHAMENTO.md`). A forma é a do rascunho que a pessoa aprovou por imagem em 2026-11-10
 * (`../../referencias/eixos-rodas.esboco.mjs`), levada para cá sem mudança de forma; o rascunho passou a chamar `montarEixoDianteiro`
 * daqui, de modo que a geometria tem uma fonte só.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho, que as tirou das vistas da carcaça isolada). A vista de frente da carcaça
 * (`carcaca-frente.ia.png`, 3,385 mm/px na largura e 4,296 na altura): a tampa cinza do cubo nas colunas 393 a 408 (516 a 463 mm),
 * Ø 90 nas linhas 442 a 462, levada a Ø 100; o flange escuro nas colunas 408 a 425 (463 a 404 mm), Ø 220 nas linhas 425 a 476; o tubo
 * de Ø 150 nas linhas 432 a 467. A lateral da carcaça (`carcaca-lado.ia.png`, 4,28 mm/px) confere o flange (223 mm) e a tampa (111).
 * O diferencial é o tambor escuro entre as chapas na vista de frente (colunas 510 a 580), atrás do pé da torre: um bojo de Ø 300 de
 * -120 a 120 mm, que é caráter e não medida. O assento de cada lado ocupa a espessura da chapa do chassi (de `larguras.chapas` da
 * carcaça, 4 mm para dentro de cada face) e sobe do tubo até 0,5 mm do teto do entalhe das chapas (o contorno lateral `chassi` da
 * carcaça: a parede da frente em z 98 a 100 e o teto pelos vértices (87,3, 437,6), (60,5, 429) e (27,3, 462,8), em mm do chão);
 * rente ao teto, a face inclinada coincidente saía como travessia no relato de contatos.
 *
 * O ENCAIXE. A origem é o centro do eixo, no meio da máquina; y para cima, +x à esquerda de quem dirige e a frente em +z. A montagem
 * põe o eixo na carcaça pela porta `passagemNoChassi` (o tubo na passagem entre as paredes dos dois poços dianteiros, que a carcaça
 * publica como `passagemDoEixoDianteiro`), e o vínculo `entreAsParedes` traz a distância entre as paredes, onde o tubo leva um anel
 * de vértices para a porta ter plano na malha. As rodas assentam nas portas `cuboEsquerdo` e `cuboDireito`, a face de fora do flange.
 * Os assentos dependem do entalhe das chapas, que a carcaça não publica como porta: a altura vem do chão em mm, como no rascunho, e
 * cai no referencial do eixo pela altura do cubo dianteiro de `rodas` da carcaça.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis e as portas em mm; `montarEixoDianteiro` escreve os passos em mm num estado
 * { passos, topo, origem } (o mesmo que o rascunho da máquina usa, com `em` levando a origem ao lugar dela); `gerarPassos` converte
 * para metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { TABELA as CARCACA } from '../../carcaca/receita.js';

export const TABELA = {
  /* A distância entre as paredes de dentro dos dois poços dianteiros da carcaça (2 x 377). Vem da porta `passagemDoEixoDianteiro`
     pelo vínculo da montagem; este valor só vale para ver a peça sozinha. */
  entreAsParedes: 754,
  /* As cores do rascunho: o escuro do eixo e o cinza do cubo (as da carcaça). */
  cores: { eixo: CARCACA.cores.escuro, cubo: CARCACA.cores.cinza },
  /* Lados das revoluções, os do rascunho aprovado. */
  lados: 48,
  /* O sombreamento suave, com a quina acima deste ângulo nítida (o da carcaça). */
  anguloDoLiso: 35,
  /* O tubo do eixo, de Ø 150, de um flange ao outro (o flange começa a 404 mm do centro). */
  tubo: { raio: 75, ate: 404 },
  /* O bojo do diferencial: Ø 300 de -120 a 120 mm, afinando em cone até o tubo a 190. */
  diferencial: { raio: 150, meio: 120, ateOTubo: 190 },
  /* O cubo de cada lado: o flange de Ø 220 de 404 a 463 mm (a face de fora recebe a roda) e a tampa de Ø 100 até 516. */
  cubo: { raioDoFlange: 110, face: 463, raioDaTampa: 50, ateATampa: 516 },
  /* O assento de cada lado, em [z, y] com y do chão (mm), na espessura da chapa recuada 4 mm de cada face. */
  assento: { perfil: [[30, 380], [72, 380], [72, 432.2], [60.5, 428.5], [30, 459.5]], recuoDaChapa: 4 },
};

const m = (mm) => mm / 1000;
const r1 = (v) => Math.round(v * 10) / 10;

/** Os perfis e as portas, em mm, no referencial do eixo. */
export function derivar(T = TABELA) {
  const { tubo: TU, diferencial: DI, cubo: CU } = T;
  const parede = T.entreAsParedes / 2;
  /* o tubo com o bojo; o anel em ± parede é colinear com o tubo e não muda a forma: é o plano da porta da passagem */
  const perfilDoEixo = [
    [0, -TU.ate], [TU.raio, -TU.ate], [TU.raio, -parede], [TU.raio, -DI.ateOTubo], [DI.raio, -DI.meio],
    [DI.raio, DI.meio], [TU.raio, DI.ateOTubo], [TU.raio, parede], [TU.raio, TU.ate], [0, TU.ate],
  ];
  /* o do lado direito é o espelho em x, com a ordem invertida para a revolução manter a face de fora para fora */
  const perfilDoCubo = (s) => {
    const p = [[0, TU.ate], [CU.raioDoFlange, TU.ate], [CU.raioDoFlange, CU.face], [CU.raioDaTampa, CU.face],
      [CU.raioDaTampa, CU.ateATampa], [0, CU.ateATampa]].map(([r, x]) => [r, s * x]);
    return s > 0 ? p : p.reverse();
  };
  const yDoCubo = CARCACA.rodas.dianteira.y;
  const [c0, c1] = CARCACA.larguras.chapas;
  const assento = T.assento.perfil.map(([z, y]) => [z, y - yDoCubo]);
  const xDoAssento = [c0 + T.assento.recuoDaChapa, c1 - T.assento.recuoDaChapa];
  const portas = {
    passagemNoChassi: { forma: 'cilindro', papel: 'externa', eixo: [1, 0, 0], centro: [-parede, 0, 0], raio: TU.raio, inicio: 0, fim: T.entreAsParedes, referencia: [0, 1, 0] },
    cuboEsquerdo: { forma: 'anel', papel: 'ocupa', eixo: [-1, 0, 0], centro: [CU.face, 0, 0], raioInterno: CU.raioDaTampa, raioExterno: CU.raioDoFlange, inicio: 0, fim: CU.face - TU.ate },
    cuboDireito: { forma: 'anel', papel: 'ocupa', eixo: [1, 0, 0], centro: [-CU.face, 0, 0], raioInterno: CU.raioDaTampa, raioExterno: CU.raioDoFlange, inicio: 0, fim: CU.face - TU.ate },
  };
  return { perfilDoEixo, perfilDoCubo, assento, xDoAssento, portas };
}

/** Monta o eixo dianteiro no estado { passos, topo, origem }, em mm, com a origem do eixo levada a `em`, e devolve as origens das
 *  partes e das portas. O rascunho da máquina inteira chama esta função com o centro do cubo dianteiro da carcaça. */
export function montarEixoDianteiro(estado, T = TABELA, em = [0, 0, 0]) {
  const D = derivar(T);
  const novo = () => { estado.origem += 1; return estado.origem; };
  const torno = (perfil) => {
    const id = novo();
    estado.passos.push(['lathe', { origemId: id, perfil: perfil.map(([r, x]) => [r1(r), r1(x)]), eixo: 'x', lados: T.lados, em: em.map(r1) }]);
    return { origem: { op: 'lathe', id } };
  };
  /* o assento [z, y] extrudado em x de x0 a x1: o perfil da `extrusao` em x é [-y, z] e a altura corre em +x */
  const assento = (x0, x1) => {
    const id = novo();
    let perfil = D.assento.map(([z, y]) => [r1(-(y + em[1])), r1(z + em[2])]);
    const area = perfil.reduce((s, q, i) => s + q[0] * perfil[(i + 1) % perfil.length][1] - perfil[(i + 1) % perfil.length][0] * q[1], 0);
    if (area < 0) perfil = perfil.reverse();
    estado.passos.push(['extrusao', { origemId: id, eixo: 'x', altura: r1(x1 - x0), perfil, em: [r1(x0 + em[0]), 0, 0] }]);
    return { origem: { op: 'extrusao', id } };
  };
  const unir = (...solidos) => { const id = novo(); estado.passos.push(['unir', { origemId: id, solidos }]); return { origem: { op: 'unir', id } }; };
  const parte = (nome, sel, cor) => estado.passos.push(['parte', { nome, sel }], ['pincel', { modo: 'face', sel, cor }], ['liso', { sel, angulo: T.anguloDoLiso }]);

  const [a0, a1] = D.xDoAssento;
  const tubo = torno(D.perfilDoEixo);
  const eixo = unir(tubo, assento(a0, a1), assento(-a1, -a0));
  parte('eixoDianteiro', eixo, T.cores.eixo);
  const cuboE = torno(D.perfilDoCubo(1));
  const cuboD = torno(D.perfilDoCubo(-1));
  const cubos = unir(cuboE, cuboD);
  parte('cubosDianteiros', cubos, T.cores.cubo);
  return { tubo, eixo, cuboE, cuboD, cubos };
}

/* Os campos de medida de cada operação deste eixo e das portas: neles todo número é milímetro. */
const MEDIDAS = { lathe: ['perfil', 'em'], extrusao: ['perfil', 'em', 'altura'] };
const MEDIDAS_DA_PORTA = ['centro', 'raio', 'raioInterno', 'raioExterno', 'inicio', 'fim'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, as três portas. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { tubo, cuboE, cuboD } = montarEixoDianteiro(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  const porta = (id, de) => ['publicarPorta', { id, de: de.origem, interface: Object.fromEntries(Object.entries(portas[id]).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];
  return [...forma, porta('passagemNoChassi', tubo), porta('cuboEsquerdo', cuboE), porta('cuboDireito', cuboD)];
}

export const CONTATOS = [
  { par: ['cubosDianteiros', 'eixoDianteiro'], motivo: 'a face de dentro de cada flange encosta na ponta do tubo, a 404 mm do centro' },
];

const receita = {
  meta: { nome: 'empilhadeira/eixo-dianteiro', desc: 'eixo dianteiro motriz da empilhadeira: tubo de Ø 150 com o bojo do diferencial e os assentos no chassi, e os dois cubos com flange e tampa' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro do eixo, no meio da máquina, sobre o eixo dos cubos; y para cima, +x à esquerda de quem dirige e a frente em +z' },
  PLANO: {
    objeto: 'eixo dianteiro motriz de empilhadeira de contrapeso de 2,5 t: o tubo com o diferencial, preso sob as chapas do chassi, e os dois cubos onde as rodas dianteiras giram',
    referencias: ['../../referencias/carcaca-frente.ia.png', '../../referencias/carcaca-lado.ia.png', '../../referencias/frente.ia.png'],
    escala: { medida: 'distância entre as faces de fora dos dois flanges dos cubos (bitola do assento das rodas)', milimetros: 926 },
    partes: [
      { nome: 'eixoDianteiro', forma: 'tubo escuro de Ø 150 de -404 a 404 mm com o bojo do diferencial de Ø 300 (de -120 a 120, em cone até 190) e, de cada lado, o assento de 270 a 323 mm que sobe do tubo até 0,5 mm do teto do entalhe do chassi', tecnica: 'revolução em torno de x (48 lados) unida aos dois assentos extrudados em x' },
      { nome: 'cubosDianteiros', forma: 'de cada lado, o flange cinza de Ø 220 de 404 a 463 mm do centro e a tampa de Ø 100 de 463 a 516', tecnica: 'revolução em torno de x (48 lados), uma por lado, unidas' },
    ],
    criteriosDeReprovacao: [
      'o eixo fora do eixo dos poços dianteiros da carcaça, ou as rodas que ele leva cruzando o poço ou a aba do paralama',
      'o assento atravessando o teto do entalhe das chapas do chassi, ou o tubo cruzando as chapas',
      'cubo sem o flange largo onde a roda assenta, ou sem a tampa saindo pelo furo do disco da roda',
      'o bojo do diferencial fora do meio, entre as chapas do chassi',
      'cor trocada: o tubo cinza ou o cubo escuro',
    ],
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm: a ponta da tampa de cada lado e o fundo do bojo do diferencial. */
  get PONTOS() {
    const T = this.PARAMS; const CU = T.cubo; const DI = T.diferencial;
    return [
      { nome: 'ponta da tampa do cubo esquerdo', parte: 'cubosDianteiros', medida: 'maximo', em: [CU.ateATampa, CU.raioDoFlange, CU.raioDoFlange], toleranciaMm: 1 },
      { nome: 'ponta da tampa do cubo direito', parte: 'cubosDianteiros', medida: 'minimo', em: [-CU.ateATampa, -CU.raioDoFlange, -CU.raioDoFlange], toleranciaMm: 1 },
      { nome: 'fundo do bojo do diferencial', parte: 'eixoDianteiro', medida: 'minimo', em: [-T.tubo.ate, -DI.raio, -DI.raio], toleranciaMm: 1 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
