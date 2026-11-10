/* empilhadeira/correntes — as correntes de elevação da torre da empilhadeira, na pose de transporte: as duas do cilindro de
 * elevação, da cabeça dele à travessa do carro, e as duas do canal interno, da travessa de cima dele ao topo dos montantes do carro,
 * numa peça.
 *
 * Etapa da montagem `../../montagem.json` depois dos garfos (fatia 4 do plano `docs/modelar/planos/2026-11-09-empilhadeira.md`, item 4
 * das partes do `../../ALINHAMENTO.md`, segunda metade da torre). A forma é a do rascunho que a pessoa aprovou por imagem em
 * 2026-11-10 (`../../referencias/torre-garfos.esboco.mjs`), levada para cá sem mudança de medida; o rascunho passou a chamar
 * `montarCorrentes` daqui. As quatro fitas são as do rascunho: as duas do cilindro, que levam o carro na elevação livre, e as duas do
 * canal, que a vista de frente mostra à frente dos canais.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho). A vista de frente (`frente.ia.png`) mostra as correntes nas colunas 497 a 503 e 585 a 593,
 * a 149 mm do centro, descendo à frente dos canais até a placa: a fita de 15 x 12 mm de x 143 a 158, de pé na frente da travessa de
 * cima do canal interno (a face da frente dela, z 350) até o topo dos montantes do carro (y 640). As do cilindro, de 12 x 12 mm em x 54
 * a 66, descem da face da frente da cabeça do cilindro de elevação (z 250) até a travessa do carro (y 640), dos dois lados da cabeça,
 * que a vista de frente mostra com uma corrente de cada lado. As faces e as alturas de onde elas saem e onde chegam vêm das receitas
 * do canal interno, do cilindro de elevação, da torre e do carro.
 *
 * O ENCAIXE. A origem é a da máquina, a mesma da torre: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à
 * esquerda de quem dirige e a frente em +z. A montagem põe as correntes na cabeça do cilindro pela porta `naCabeca` (o plano da face de
 * trás das correntes do cilindro, no meio da cabeça) sobre a porta `cabeca` do cilindro de elevação (a face da frente da cabeça).
 *
 * AS JUNTAS QUE A MONTAGEM AINDA NÃO TEM. As correntes passam pelas polias da cabeça e da travessa do canal e o carro sobe o dobro do
 * que a cabeça e o canal sobem (2:1, no rascunho); a montagem v5 não tem articulação nem plano sobre plano medido (ela mede encaixe
 * cilíndrico e assento anular), e a posição sai das duas faces planas, sem relação medida. A corrente não tem elos: é a fita do rascunho.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula as caixas e a porta em mm; `montarCorrentes` escreve os passos em mm num estado
 * { passos, topo, origem } (o mesmo que o rascunho da máquina usa); `gerarPassos` converte para metro com `m()`, campo de medida a
 * campo de medida, num lugar só. */
import { TABELA as CARCACA } from '../carcaca/receita.js';
import { ferramentas } from '../carcaca/receita/ferramentas.js';
import { derivar as derivarTorre } from '../torre/receita.js';
import { TABELA as INTERNO, derivar as derivarInterno } from '../canal-interno/receita.js';
import { TABELA as CILINDRO } from '../cilindro-elevacao/receita.js';
import { TABELA as CARRO } from '../carro/receita.js';

export const TABELA = {
  /* A cor do rascunho: o escuro da carcaça. */
  cores: { corrente: CARCACA.cores.escuro },
  /* As do canal: de x 143 a 158, 12 mm de fundo à frente da travessa de cima do canal interno. */
  doCanal: { x: [143, 158], fundo: 12 },
  /* As do cilindro: de x 54 a 66, 12 mm de fundo à frente da cabeça do cilindro de elevação. */
  doCilindro: { x: [54, 66], fundo: 12 },
};

const m = (mm) => mm / 1000;

/** As caixas e a porta, em mm, no referencial da máquina. */
export function derivar(T = TABELA) {
  const [, yAssento, zAssento] = derivarTorre().portas.assentoDoCilindro.centro;
  /* a cabeça do cilindro de elevação, no referencial da máquina: a face da frente e as alturas de baixo e de cima */
  const cabeca = { z: zAssento + CILINDRO.cabeca.z[1], y: [yAssento + CILINDRO.haste.ate, yAssento + CILINDRO.haste.ate + CILINDRO.cabeca.altura] };
  const doCanal = { x: T.doCanal.x, z: [INTERNO.travessa.frente, INTERNO.travessa.frente + T.doCanal.fundo], y: [CARRO.barraCima[1], derivarInterno().y[1]] };
  const doCilindro = { x: T.doCilindro.x, z: [cabeca.z, cabeca.z + T.doCilindro.fundo], y: [CARRO.travessa.y[1], cabeca.y[1]] };
  const portas = {
    naCabeca: { forma: 'plano', papel: 'apoia', ponto: [0, (cabeca.y[0] + cabeca.y[1]) / 2, cabeca.z], normal: [0, 0, -1], extensao: [2 * T.doCilindro.x[1], cabeca.y[1] - cabeca.y[0]], referencia: [0, 1, 0] },
  };
  return { cabeca, doCanal, doCilindro, portas };
}

/** Monta as correntes no estado { passos, topo, origem }, em mm, no referencial da máquina, e devolve a origem da porta. */
export function montarCorrentes(estado, T = TABELA) {
  const D = derivar(T);
  const { extY, booleana, parte } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const novo = () => { estado.origem += 1; return estado.origem; };
  const espelho = (sel) => {
    const id = novo();
    estado.passos.push(['espelha', { origemId: id, eixo: 'x', pos: 0, derivaDe: sel.origem, sel: { origem: sel.origem } }]);
    return { origem: { op: 'espelha', id, de: sel.origem } };
  };
  const par = (sel) => unir(sel, espelho(sel));
  const caixaY = ({ x, z, y }) => extY([[x[0], z[0]], [x[1], z[0]], [x[1], z[1]], [x[0], z[1]]], y[0], y[1]);
  const doCanal = caixaY(D.doCanal);
  const ladoDoCanal = par(doCanal);
  const doCilindro = caixaY(D.doCilindro);
  parte('correntes', unir(ladoDoCanal, par(doCilindro)), T.cores.corrente);
  return { doCilindro };
}

const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'], espelha: ['pos'] };
const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, a porta da cabeça. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { doCilindro } = montarCorrentes(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  const porta = (id, de) => ['publicarPorta', { id, de: de.origem, interface: Object.fromEntries(Object.entries(portas[id]).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];
  return [...forma, porta('naCabeca', doCilindro)];
}

/* Uma parte só: as quatro fitas. */
export const CONTATOS = [];

const receita = {
  meta: { nome: 'empilhadeira/correntes', desc: 'correntes de elevação da torre da empilhadeira: duas da cabeça do cilindro de elevação ao carro e duas da travessa do canal interno ao carro, na pose de transporte' },
  PARAMS: TABELA,
  TOPO: { origem: 'a da máquina: o chão sob o centro do eixo dianteiro, no meio da largura; y para cima, +x à esquerda de quem dirige e a frente em +z; na pose de transporte' },
  PLANO: {
    objeto: 'as correntes de elevação da torre duplex de uma empilhadeira de 2,5 t, com o carro embaixo, na pose de transporte: as do cilindro de elevação livre e as do canal interno, de pé, até o carro',
    referencias: ['../../referencias/frente.ia.png'],
    escala: { medida: 'comprimento das correntes do canal, da travessa de cima do canal interno ao topo dos montantes do carro', milimetros: 1460 },
    partes: [
      { nome: 'correntes', forma: 'quatro fitas escuras de pé: duas de 15 x 12 mm em x 143 a 158 de cada lado, de y 640 a 2.100, na frente da travessa do canal interno (z 350), e duas de 12 x 12 mm em x 54 a 66, de y 640 a 1.440, na frente da cabeça do cilindro (z 250)', tecnica: 'caixas extrudadas em y, cada uma unida ao espelho dela, e os dois pares unidos' },
    ],
    criteriosDeReprovacao: [
      'as correntes soltas do carro, da cabeça do cilindro ou da travessa do canal interno',
      'as correntes atravessando os canais, o cilindro ou a grade',
      'as correntes fora do centro da largura, ou grossas como uma barra',
      'cor trocada: as correntes claras ou laranja',
    ],
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm. */
  get PONTOS() {
    const D = derivar(this.PARAMS);
    return [
      { nome: 'topo da frente das correntes do canal', parte: 'correntes', medida: 'maximo', em: [D.doCanal.x[1], D.doCanal.y[1], D.doCanal.z[1]], toleranciaMm: 0.5 },
      { nome: 'pé de trás das correntes do cilindro', parte: 'correntes', medida: 'minimo', em: [-D.doCanal.x[1], D.doCilindro.y[0], D.doCilindro.z[0]], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
