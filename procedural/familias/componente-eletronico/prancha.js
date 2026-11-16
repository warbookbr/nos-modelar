/* prancha.js — a peça de prova da família `componente-eletronico`: os cinco encapsulamentos da fatia 1 lado a lado numa placa,
 * para a prancha que a pessoa aprova (fatia 1 do plano `docs/modelar/planos/2026-11-16-familia-componentes-eletronicos.md`).
 *
 *   npm run -s bancada -- procedural/familias/componente-eletronico/prancha.js --vistas=isometrica,topo --sem-contatos --saida=<pasta>
 *
 * Da esquerda para a direita: o resistor de 1/4 W de 10 kΩ (marrom, preto, laranja, dourado), o eletrolítico de 6,3 por 11 mm,
 * o TO-220 em pé, o DIP de 8 pinos e a barra de 8 vias. Cada um é uma chamada da família com o perfil dele e o material de cada
 * elemento escolhido aqui, como a receita que usar a família fará. A placa de baixo é só fundo da prancha (a placa declarada, com
 * furos, é a fatia 3): os terminais a atravessam sem furo. As cores dos corpos e da placa são as da tabela `BODIES` e da `PALETTE`
 * de `eletrifica/modulos/pcb/render_3d.py` (linhas 33 a 68); as das faixas, as do código de cores de resistor.
 *
 * Cada chamada da família numera os ids de origem a partir de 1, então os passos de cada componente somam uma base própria aos
 * ids (como a roda da empilhadeira faz no rascunho da máquina) e cada elemento é transladado até a posição do componente. */
import { chamar, criarRegistroDeFamilias } from '../index.js';
import { expandirChamadasDeComposicao } from '../../nucleo/composicoes.js';
import { COMPONENTE_ELETRONICO, comMateriais } from './index.js';

const MM = 0.001;
const m = (mm) => Number((mm * MM).toPrecision(12));

export const TABELA = {
  /* o vão entre dois componentes vizinhos e a margem da placa em volta deles: largos, para a vista de cada um não pegar o vizinho */
  vao: 30,
  margem: 10,
  espessuraDaPlaca: 1.6,
  profundidadeDaPlaca: 30,
  componentes: [
    { id: 'resistor', perfil: 'resistor-1-4w', largura: 11.2, materiais: { corpo: 'bege', terminal: 'estanho', faixas: ['marrom', 'preto', 'laranja', 'dourado'] } },
    { id: 'eletrolitico', perfil: 'eletrolitico-6-3x11', largura: 6.4, materiais: { corpo: 'azul', topo: 'aluminio', marca: 'cinza-claro', terminal: 'estanho' } },
    { id: 'to-220', perfil: 'to-220', largura: 10, materiais: { corpo: 'preto', aba: 'aluminio', terminal: 'estanho' } },
    { id: 'dip', perfil: 'dip-8', largura: 9.3, materiais: { corpo: 'preto', terminal: 'estanho' } },
    { id: 'barra', perfil: 'barra-1x8', largura: 20.4, materiais: { corpo: 'preto', terminal: 'estanho' } },
  ],
};

export const MATERIAIS = {
  placa: { cor: '#1f6b3a', aspereza: 0.7 },
  bege: { cor: '#c8a06a', aspereza: 0.6 },
  azul: { cor: '#2b3a8c', aspereza: 0.5 },
  preto: { cor: '#23272b', aspereza: 0.6 },
  'cinza-claro': { cor: '#d9dde3', aspereza: 0.5 },
  aluminio: { cor: '#a9adb3', aspereza: 0.35 },
  estanho: { cor: '#9a9ea3', aspereza: 0.3 },
  marrom: { cor: '#6b3a1e', aspereza: 0.5 },
  laranja: { cor: '#e07020', aspereza: 0.5 },
  dourado: { cor: '#c9a43a', aspereza: 0.4 },
};

let registro = null;
const familias = () => { registro ??= criarRegistroDeFamilias(); return registro; };

/* a posição em x do centro de cada componente, da esquerda para a direita */
export function posicoes(T = TABELA) {
  const total = T.componentes.reduce((soma, { largura }) => soma + largura, 0) + T.vao * (T.componentes.length - 1);
  let x = -total / 2;
  return T.componentes.map(({ largura }) => { const centro = x + largura / 2; x += largura + T.vao; return centro; });
}

/* soma `base` a cada id de origem dos passos de um componente */
const comBase = (v, base) => {
  if (Array.isArray(v)) return v.map((x) => comBase(x, base));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'origemId' || (k === 'id' && typeof v.op === 'string') ? x + base : comBase(x, base)]));
  return v;
};

/** As chamadas da família, uma por componente, com o material de cada elemento escolhido. */
export const chamadas = (T = TABELA) => T.componentes.map(({ id, perfil, materiais }) => comMateriais(chamar(COMPONENTE_ELETRONICO, id, { perfil }), materiais));

export function gerarPassos(T = TABELA) {
  const passos = [
    ['cubo', { origemId: 1, larg: m(T.componentes.reduce((s, c) => s + c.largura, 0) + T.vao * (T.componentes.length - 1) + 2 * T.margem), alt: m(T.espessuraDaPlaca), prof: m(T.profundidadeDaPlaca), em: [0, m(-T.espessuraDaPlaca), 0] }],
    ['parte', { nome: 'placa', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['material', { usa: 'placa', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['solido', { sel: { origem: { op: 'cubo', id: 1 } } }],
  ];
  const xs = posicoes(T);
  chamadas(T).forEach((chamada, k) => {
    const base = 100 * (k + 1);
    const elementos = [];
    for (const passo of expandirChamadasDeComposicao(familias().registroComposicoes, [chamada]).passos) {
      const [op, args] = comBase(passo, base);
      passos.push([op, args]);
      if (op === 'parte') elementos.push(args.sel);
    }
    for (const sel of elementos) passos.push(['transladar', { d: [m(xs[k]), 0, 0], sel }]);
  });
  return passos;
}

const receita = {
  meta: { nome: 'componente-eletronico/prancha', desc: 'prova da família componente-eletronico: resistor axial, eletrolítico radial, TO-220, DIP-8 e barra de 8 vias lado a lado numa placa' },
  PARAMS: TABELA,
  MATERIAIS,
  TOPO: { origem: 'centro da face de cima da placa; y para cima, os componentes em fila ao longo de x' },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
