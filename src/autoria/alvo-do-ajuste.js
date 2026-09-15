/* alvo-do-ajuste.js — o que a pessoa deixou na bancada, escrito como medida.
 *
 * A bancada exige hoje que todo gesto caia num parâmetro nomeado no instante do
 * arrasto, e num quadro em treliça não existe número que empurre um tubo
 * inteiro sem descolar as juntas: medido na bicicleta, a seta de z de
 * `balancoInferiorEsq` move o centro da caixa 0,0126 e faz a parte crescer
 * 0,0252, o dobro exato, porque uma ponta está presa e a outra estica. O gesto
 * que a pessoa quer fazer não cabe no parâmetro no momento em que ela o faz.
 *
 * Este módulo tira a escrita do parâmetro do caminho do gesto. O que sai da
 * bancada é ALVO: onde cada parte, por nome, passou a estar e que tamanho passou
 * a ter. Não é malha, não carrega vértice nem face, e por isso não carrega id
 * interno, índice de array nem posição de passo — só nome de parte e dois
 * cantos de caixa. Quem transforma esse alvo em receita organizada é a rodada de
 * absorção, depois, com tempo de perguntar o que ficou ambíguo.
 *
 * A medida é a mesma de `descrever-partes.js`, que o laço de modelagem já usa
 * para julgar forma. Uma verdade só sobre a mesma pergunta.
 *
 * UNIDADE. O estado neutro vem em metro e o alvo guarda metro, arredondado a
 * seis casas — um milésimo de milímetro, abaixo do que qualquer receita daqui
 * escreve. A comparação devolve milímetro, que é a unidade em que a `TABELA` é
 * medida. */

import { descreverPeca } from './descrever-partes.js';

export const FORMATO_DO_ALVO = 'mecanifica.alvo-do-ajuste/1';

/* TOLERÂNCIA. Meio milímetro, e o motivo é a própria tabela: todos os números
 * medidos da bicicleta são inteiros em milímetro — 502 de balanço, 17 de raio
 * do tubo do selim, 622 de aro. Um parâmetro inteiro em milímetro não consegue
 * expressar nada mais fino que meio milímetro para cada lado, então exigir
 * menos que isso seria reprovar a receita por uma casa que ela não tem como
 * escrever. Quem quiser mais fino declara o valor na captura; o que não se faz
 * é afrouxar depois para uma rodada passar. */
export const TOLERANCIA_PADRAO_MM = 0.5;

const CASAS = 6;
const arredondar = (v) => Number(v.toFixed(CASAS));
const emMilimetro = (v) => v * 1000;

function medirPorNome(neutro) {
  const partes = descreverPeca(neutro).partes;
  return new Map(partes.map((p) => [p.nome, p]));
}

/**
 * Escreve o estado atual da peça como alvo.
 *
 * `peca` é o nome da peça de onde o ajuste saiu, e `base` identifica a receita
 * que estava aberta quando a pessoa começou a mexer — a rodada de absorção
 * precisa dos dois para saber o que reescrever.
 */
export function capturarAlvo(neutro, { peca, base = null, toleranciaMm = TOLERANCIA_PADRAO_MM } = {}) {
  if (typeof peca !== 'string' || !peca) throw new Error('capturarAlvo: `peca` é obrigatório');
  if (!(toleranciaMm > 0)) throw new Error('capturarAlvo: `toleranciaMm` precisa ser positivo');

  const medidas = [...medirPorNome(neutro).values()]
    .sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0))
    .map((p) => ({ parte: p.nome, min: p.min.map(arredondar), max: p.max.map(arredondar) }));

  return { formato: FORMATO_DO_ALVO, peca, base, toleranciaMm, partes: medidas };
}

function centroEDimensao({ min, max }) {
  const centro = [0, 1, 2].map((i) => (min[i] + max[i]) / 2);
  const dimensao = [0, 1, 2].map((i) => max[i] - min[i]);
  return { centro, dimensao };
}

/**
 * Compara a peça reexecutada com o alvo, parte a parte.
 *
 * Devolve `{ dentro, piorMm, partes, ausentes, sobrando }`. `piorMm` é a maior
 * diferença encontrada em qualquer eixo, de centro ou de dimensão: é o número
 * único que decide se a receita reescrita chegou onde a pessoa deixou.
 *
 * Parte que o alvo declara e a receita não produz mais é falha, não empate:
 * some da lista e leva `piorMm` a infinito, porque uma reescrita que apaga uma
 * parte não acertou o alvo por mais perto que as outras tenham ficado.
 */
export function compararComAlvo(neutro, alvo) {
  if (alvo?.formato !== FORMATO_DO_ALVO) throw new Error(`compararComAlvo: formato desconhecido: ${alvo?.formato}`);
  const atual = medirPorNome(neutro);
  const tolerancia = alvo.toleranciaMm ?? TOLERANCIA_PADRAO_MM;

  const partes = [];
  const ausentes = [];
  for (const esperada of alvo.partes) {
    const obtida = atual.get(esperada.parte);
    if (!obtida) { ausentes.push(esperada.parte); continue; }
    const alvoDa = centroEDimensao(esperada);
    const obtidaDa = centroEDimensao(obtida);
    const centroMm = [0, 1, 2].map((i) => emMilimetro(obtidaDa.centro[i] - alvoDa.centro[i]));
    const dimensaoMm = [0, 1, 2].map((i) => emMilimetro(obtidaDa.dimensao[i] - alvoDa.dimensao[i]));
    const pior = Math.max(...centroMm.map(Math.abs), ...dimensaoMm.map(Math.abs));
    partes.push({ parte: esperada.parte, centroMm, dimensaoMm, piorMm: pior, dentro: pior <= tolerancia });
  }

  const declaradas = new Set(alvo.partes.map((p) => p.parte));
  const sobrando = [...atual.keys()].filter((nome) => !declaradas.has(nome)).sort();

  const piorMm = ausentes.length ? Infinity : Math.max(0, ...partes.map((p) => p.piorMm));
  const dentro = ausentes.length === 0 && sobrando.length === 0 && piorMm <= tolerancia;
  return { dentro, piorMm, toleranciaMm: tolerancia, partes, ausentes, sobrando };
}
