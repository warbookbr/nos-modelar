/* empilhadeira/cilindro-inclinacao — um cilindro de inclinação da torre da empilhadeira, deitado ao longo do comprimento da máquina:
 * a camisa de Ø 90, que entra no rebaixo do painel da carcaça, e a haste de Ø 44, cuja ponta encosta na orelha do canal externo da
 * torre, numa peça na pose de transporte (a torre de pé). Uma receita, duas instâncias na montagem (a esquerda e a direita).
 *
 * Etapa da montagem `../../montagem.json` depois das correntes (fatia 4 do plano `docs/modelar/planos/encerrados/2026-11-09-empilhadeira.md`,
 * item 4 das partes do `../../ALINHAMENTO.md`, segunda metade da torre). A forma é a do rascunho que a pessoa aprovou por imagem em
 * 2026-11-10 (`../../referencias/torre-garfos.esboco.mjs`), levada para cá sem mudança de medida; o rascunho passou a chamar
 * `montarCilindroInclinacao` daqui, uma vez de cada lado. Mudou só a construção: os círculos com 96 lados no lugar de 40, e o cilindro
 * de cada lado é a mesma peça transladada, no lugar do espelho do esquerdo.
 *
 * POR QUE NÃO A FAMÍLIA `cilindro-hidraulico`. A família faz o cilindro de dupla ação com olhal nas duas pontas, a camisa oca com a
 * cabeça e o êmbolo dentro, o eixo em x e 32 lados fixos, e exige do pino de trás ao da frente o curso mais 2,25 êmbolos e a parede:
 * com a camisa de Ø 90 (êmbolo de 78 com parede de 6) e o curso de 159 mm do rascunho (53 para a frente e 106 para trás), são 341 mm
 * entre os pinos, e o cilindro do rascunho tem 210 de ponta a ponta, sem olhal. Faltam à família o número de lados, o cilindro sem
 * olhal (a camisa que só entra no rebaixo e a haste que acaba em ponta reta) e o comprimento curto; com ela o cilindro teria dois
 * olhais que nenhuma vista mostra e mais de uma vez e meia o comprimento.
 *
 * DE ONDE VEM CADA MEDIDA (do rascunho). A lateral mostra o cilindro de z -34 a 73 em y 775 a 907, e a carcaça isolada de lado de z -36
 * a 75 em y 812 a 912, entrando no painel; a vista de frente da carcaça isolada põe os pinos nas colunas 445 e 645 (338 mm do centro)
 * na linha 332 (879 mm), e a de cima as hastes nas linhas 194 e 392 (325 mm). Adotado no rascunho: o eixo em x 355 e y 860, a camisa de
 * Ø 90 de z -150 a 15 (mais atrás ela sairia por cima da descida do painel, que a z -260 está a 861 mm) e a haste de Ø 44 de 15 a 60,
 * até a face de trás da orelha do canal externo. A carcaça tem o rebaixo no painel e no piso para a camisa (x 305 a 405, y 810 a 910,
 * z 10 a -160), com 5 mm de folga em volta e 10 atrás.
 *
 * O ENCAIXE. A origem fica sob a ponta da haste, no fundo da camisa: o eixo do cilindro em x 0 e y igual ao raio da camisa, ao longo de
 * z, com a ponta da haste em z 0 e a camisa para trás; y para cima, +x à esquerda de quem dirige e a frente em +z. A montagem põe o
 * cilindro na torre pela porta `naOrelha` (a ponta da haste) sobre a porta `orelhaEsquerda` ou `orelhaDireita` da torre (a face de trás
 * da orelha, no meio dela). A camisa no rebaixo da carcaça é folga, e não contato.
 *
 * AS JUNTAS QUE A MONTAGEM AINDA NÃO TEM. A haste corre na camisa (53 mm para a frente e 106 para trás, no rascunho) e as duas pontas
 * articulam, na carcaça e na orelha, quando a torre inclina em torno do eixo dianteiro; a montagem v5 não tem articulação nem plano sobre
 * plano medido (ela mede encaixe cilíndrico e assento anular), e a posição sai das duas faces planas, sem relação medida. O rascunho não
 * tem pino em nenhuma das pontas.
 *
 * A cadeia: a TABELA em mm; `derivar` calcula os perfis e a porta em mm; `montarCilindroInclinacao` escreve os passos em mm num estado
 * { passos, topo, origem }, com `em` levando a origem ao lugar dela (o rascunho da máquina a põe na orelha da torre); `gerarPassos`
 * converte para metro com `m()`, campo de medida a campo de medida, num lugar só. */
import { TABELA as CARCACA } from '../../carcaca/receita.js';
import { ferramentas } from '../../carcaca/receita/ferramentas.js';
import { TABELA as ELEVACAO } from '../../cilindro-elevacao/receita.js';

export const TABELA = {
  /* As cores do rascunho: a camisa cinza da carcaça e a haste cromada (a do cilindro de elevação). */
  cores: { camisa: CARCACA.cores.cinza, haste: ELEVACAO.cores.haste },
  /* Lados dos círculos extrudados. */
  lados: 96,
  /* A camisa: Ø 90 e 165 mm, atrás da haste. */
  camisa: { raio: 45, comprimento: 165 },
  /* A haste: Ø 44 e 45 mm, da frente da camisa à ponta. */
  haste: { raio: 22, comprimento: 45 },
};

const m = (mm) => mm / 1000;

/** Os perfis e a porta, em mm, no referencial do cilindro. */
export function derivar(T = TABELA) {
  const y = T.camisa.raio;
  const circulo = (r) => Array.from({ length: T.lados }, (_, k) => [r * Math.cos(2 * Math.PI * k / T.lados), y + r * Math.sin(2 * Math.PI * k / T.lados)]);
  /* em z: a camisa e a haste, da ponta da haste (z 0) para trás */
  const haste = [-T.haste.comprimento, 0];
  const camisa = [haste[0] - T.camisa.comprimento, haste[0]];
  const portas = {
    naOrelha: { forma: 'plano', papel: 'apoia', ponto: [0, y, 0], normal: [0, 0, 1], extensao: [2 * T.haste.raio, 2 * T.haste.raio], referencia: [0, 1, 0] },
  };
  return { circulo, camisa, haste, portas };
}

/** Monta um cilindro no estado { passos, topo, origem }, em mm, com a origem levada a `em`, e devolve a origem da porta. `nomes` troca
 *  o nome das partes (o rascunho da máquina mantém os dele). */
export function montarCilindroInclinacao(estado, T = TABELA, em = [0, 0, 0], nomes = {}) {
  const D = derivar(T);
  const { extZ, parte } = ferramentas(estado);
  const [ex, ey, ez] = em;
  const xy = (p) => p.map(([x, y]) => [x + ex, y + ey]);
  const camisa = extZ(xy(D.circulo(T.camisa.raio)), D.camisa[0] + ez, D.camisa[1] + ez);
  parte(nomes.camisa ?? 'cilindroInclinacao', camisa, T.cores.camisa);
  const haste = extZ(xy(D.circulo(T.haste.raio)), D.haste[0] + ez, D.haste[1] + ez);
  parte(nomes.haste ?? 'hasteInclinacao', haste, T.cores.haste);
  return { haste };
}

const MEDIDAS = { extrusao: ['perfil', 'em', 'altura'] };
const MEDIDAS_DA_PORTA = ['ponto', 'extensao'];
const emMetro = (v) => (typeof v === 'number' ? m(v) : Array.isArray(v) ? v.map(emMetro) : v);

/** Os PASSOS, em metro: a forma e, no fim, a porta da ponta da haste. */
export function gerarPassos(T = TABELA) {
  const estado = { passos: [], topo: {}, origem: 0 };
  const { haste } = montarCilindroInclinacao(estado, T);
  const forma = estado.passos.map(([op, args]) => [op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, (MEDIDAS[op] ?? []).includes(k) ? emMetro(v) : v]))]);
  const { portas } = derivar(T);
  const porta = (id, de) => ['publicarPorta', { id, de: de.origem, interface: Object.fromEntries(Object.entries(portas[id]).map(([k, v]) => [k, MEDIDAS_DA_PORTA.includes(k) ? emMetro(v) : v])) }];
  return [...forma, porta('naOrelha', haste)];
}

export const CONTATOS = [
  { par: ['cilindroInclinacao', 'hasteInclinacao'], motivo: 'a haste sai da face da frente da camisa, a 45 mm da ponta' },
];

const receita = {
  meta: { nome: 'empilhadeira/cilindro-inclinacao', desc: 'cilindro de inclinação da torre da empilhadeira: camisa de Ø 90 no rebaixo do painel e haste de Ø 44 até a orelha do canal externo, deitado ao longo da máquina' },
  PARAMS: TABELA,
  TOPO: { origem: 'sob a ponta da haste, no fundo da camisa: o eixo do cilindro em z, a y igual ao raio da camisa; y para cima, +x à esquerda de quem dirige e a frente em +z' },
  PLANO: {
    objeto: 'um cilindro de inclinação da torre de uma empilhadeira de 2,5 t, deitado ao longo da máquina, da carcaça à orelha da torre, na pose de transporte: camisa e haste',
    referencias: ['../../referencias/carcaca-lado.ia.png', '../../referencias/carcaca-frente.ia.png', '../../referencias/cima.ia.png'],
    escala: { medida: 'comprimento do cilindro, do fundo da camisa à ponta da haste', milimetros: 210 },
    partes: [
      { nome: 'cilindroInclinacao', forma: 'a camisa cinza de Ø 90 e 165 mm, deitada ao longo de z, atrás da haste', tecnica: 'círculo de 96 lados extrudado em z' },
      { nome: 'hasteInclinacao', forma: 'a haste cromada de Ø 44 e 45 mm, no eixo da camisa, da face da frente dela à ponta reta', tecnica: 'círculo de 96 lados extrudado em z' },
    ],
    criteriosDeReprovacao: [
      'o cilindro fora do rebaixo do painel da carcaça, ou cruzando o painel, o piso ou a lateral',
      'a ponta da haste solta da orelha da torre, ou atravessando-a',
      'o cilindro inclinado ou fora do comprimento da máquina na pose de transporte',
      'a haste tão grossa quanto a camisa',
      'cor trocada: a camisa laranja ou a haste escura',
    ],
  },
  contatos: CONTATOS,
  /* Os extremos que a TABELA fixa, em mm. */
  get PONTOS() {
    const T = this.PARAMS; const C = T.camisa.raio; const H = T.haste;
    return [
      { nome: 'fundo de trás da camisa', parte: 'cilindroInclinacao', medida: 'minimo', em: [-C, 0, -H.comprimento - T.camisa.comprimento], toleranciaMm: 0.5 },
      { nome: 'ponta da haste', parte: 'hasteInclinacao', medida: 'maximo', em: [H.raio, C + H.raio, 0], toleranciaMm: 0.5 },
    ];
  },
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
