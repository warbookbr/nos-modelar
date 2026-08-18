/* Adaptador privado: peças oficiais, montagens recursivas e poses derivadas. */
import { readFileSync } from 'node:fs';
import { alterarMontagem, diferencaMontagem } from '../../../src/autoria/alterar-montagem.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';
import { descreverPecaReutilizavel } from '../../../tools/mecanifica/descrever-peca.mjs';
import { exportarPeca, lerPecaResolvida } from '../../../tools/mecanifica/exportar-peca.mjs';

export const REFERENCIAS_ARMADURA = Object.freeze([
  'abdomen', 'antebraco', 'braco-superior', 'canela', 'capacete', 'coxa',
  'junta-articulada', 'mao-direita', 'mao-esquerda', 'ombreira', 'pe', 'pelve', 'torax',
]);

const lerJson = (caminho) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'));
const MATRIZ_COTOVELO = Object.freeze([
  [1, 0, 0],
  [0, 0.3420201433, 0.9396926208],
  [0, -0.9396926208, 0.3420201433],
]);
const MATRIZ_JOELHO = Object.freeze([
  [1, 0, 0],
  [0, 0.7660444431, 0.6427876097],
  [0, -0.6427876097, 0.7660444431],
]);
const MATRIZ_OMBRO_DIREITO = Object.freeze([
  [1, 0, 0],
  [0, 0.9781476007, 0.2079116908],
  [0, -0.2079116908, 0.9781476007],
]);
const MATRIZ_QUADRIL_DIREITO = Object.freeze([
  [1, 0, 0],
  [0, 0.9848077530, -0.1736481777],
  [0, 0.1736481777, 0.9848077530],
]);

export async function carregarPecaArmadura(ref) {
  if (!REFERENCIAS_ARMADURA.includes(ref)) throw new Error(`peça da armadura desconhecida: ${ref}`);
  const modulo = await import(new URL(`./receitas/${ref}.js`, import.meta.url));
  const medida = await descreverPecaReutilizavel({ peca: ref, modulo, estrito: true });
  if (!medida.ok) throw new Error(`${ref}: ${medida.stderr.trim()}`);
  const exportacao = await exportarPeca(ref, { modulo });
  return { ref, modulo, medida, exportacao, neutroLido: lerPecaResolvida(exportacao.dado) };
}

function montagensBase() {
  return new Map([
    ['antebraco-esquerdo', lerJson('./montagens/antebraco-esquerdo.json')],
    ['antebraco-direito', lerJson('./montagens/antebraco-direito.json')],
    ['braco-esquerdo', lerJson('./montagens/braco-esquerdo.json')],
    ['braco-direito', lerJson('./montagens/braco-direito.json')],
    ['perna-inferior', lerJson('./montagens/perna-inferior.json')],
    ['perna', lerJson('./montagens/perna.json')],
  ]);
}

function derivarPoseArticulada(raiz, montagens) {
  const bracoBase = montagens.get('braco-direito');
  const pernaBase = montagens.get('perna');
  const braco = alterarMontagem(bracoBase, [
    { alvo: { instancia: 'segmento-inferior' }, campo: 'pose.rotacao', valor: MATRIZ_COTOVELO },
    { alvo: { raiz: true }, campo: 'id', valor: 'armadura-braco-direito-articulado' },
  ]).montagem;
  const perna = alterarMontagem(pernaBase, [
    { alvo: { instancia: 'segmento-inferior' }, campo: 'pose.rotacao', valor: MATRIZ_JOELHO },
    { alvo: { raiz: true }, campo: 'id', valor: 'armadura-perna-articulada' },
  ]).montagem;
  const articulada = alterarMontagem(raiz, [
    { alvo: { instancia: 'braco-direito' }, campo: 'alvo.ref', valor: 'braco-direito-articulado' },
    { alvo: { instancia: 'braco-direito' }, campo: 'pose.rotacao', valor: MATRIZ_OMBRO_DIREITO },
    { alvo: { instancia: 'perna-direita' }, campo: 'alvo.ref', valor: 'perna-articulada' },
    { alvo: { instancia: 'perna-direita' }, campo: 'pose.rotacao', valor: MATRIZ_QUADRIL_DIREITO },
    { alvo: { raiz: true }, campo: 'id', valor: 'sonda-armadura-humanoide-1-0-articulada' },
  ]).montagem;
  return {
    raiz: articulada,
    montagens: new Map([
      ...montagens,
      ['braco-direito-articulado', braco],
      ['perna-articulada', perna],
    ]),
    diferencas: {
      raiz: diferencaMontagem(raiz, articulada),
      bracoDireito: diferencaMontagem(bracoBase, braco),
      pernaDireita: diferencaMontagem(pernaBase, perna),
    },
  };
}

async function resolver(raiz, montagens, pecas) {
  return resolverMontagemPersistida(raiz, {
    carregarPeca: async (ref) => pecas.get(ref)?.exportacao.dado,
    carregarMontagem: async (ref) => montagens.get(ref),
  });
}

export async function carregarEstudoArmadura() {
  const pecas = new Map();
  for (const ref of REFERENCIAS_ARMADURA) pecas.set(ref, await carregarPecaArmadura(ref));
  const raizNeutra = lerJson('./montagens/armadura.json');
  const base = montagensBase();
  const estadoArticulado = derivarPoseArticulada(raizNeutra, base);
  const [neutra, articulada] = await Promise.all([
    resolver(raizNeutra, base, pecas),
    resolver(estadoArticulado.raiz, estadoArticulado.montagens, pecas),
  ]);
  return {
    pecas,
    estados: { neutra, articulada },
    autorias: { neutra: raizNeutra, articulada: estadoArticulado.raiz },
    montagens: { neutra: base, articulada: estadoArticulado.montagens },
    diferencas: estadoArticulado.diferencas,
  };
}
