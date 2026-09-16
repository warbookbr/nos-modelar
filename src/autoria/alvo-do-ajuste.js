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
 * bancada é ALVO: onde cada parte, por nome, passou a estar, seus dois cantos
 * de caixa envolvente e sua nuvem canônica de coordenadas de pontos ordenadas
 * lexicograficamente. Ele não persiste identificadores internos de vértices,
 * índices de arrays nem posições de passos. Quem transforma esse alvo em
 * receita organizada é a rodada de absorção, depois, com tempo de perguntar o
 * que ficou ambíguo.
 *
 * A medida de caixa vem de `descrever-partes.js`, e a medida de pontos calcula
 * a distância euclidiana máxima bidirecional entre as nuvens de pontos.
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
const arredondar = (v) => {
  const n = Number(v.toFixed(CASAS));
  return Object.is(n, -0) ? 0 : n;
};
const emMilimetro = (v) => v * 1000;

function medirPorNome(neutro) {
  const partes = descreverPeca(neutro).partes;
  return new Map(partes.map((p) => [p.nome, p]));
}

function extrairPontosPorParte(neutro) {
  const porParte = new Map();
  if (!neutro?.F || !neutro?.V) return porParte;

  for (const face of neutro.F.values()) {
    if (typeof face.parte !== 'string' || !face.parte) continue;
    let conjunto = porParte.get(face.parte);
    if (!conjunto) {
      conjunto = new Set();
      porParte.set(face.parte, conjunto);
    }
    if (Array.isArray(face.vs)) {
      for (const idV of face.vs) {
        conjunto.add(idV);
      }
    }
  }

  const resultado = new Map();
  for (const [nome, conjunto] of porParte) {
    const vistos = new Set();
    const pontos = [];
    for (const idV of conjunto) {
      const p = neutro.V.get(idV);
      if (!p || p.length < 3) continue;
      const x = arredondar(p[0]);
      const y = arredondar(p[1]);
      const z = arredondar(p[2]);
      const chave = `${x},${y},${z}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      pontos.push([x, y, z]);
    }
    pontos.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    resultado.set(nome, pontos);
  }
  return resultado;
}

function desvioEntrePontos(esperados, obtidos) {
  if (!esperados?.length || !obtidos?.length) return 0;

  let piorD2 = 0;
  for (const p of esperados) {
    let minD2 = Infinity;
    for (const q of obtidos) {
      const dx = p[0] - q[0];
      const dy = p[1] - q[1];
      const dz = p[2] - q[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < minD2) minD2 = d2;
    }
    if (minD2 > piorD2) piorD2 = minD2;
  }

  for (const q of obtidos) {
    let minD2 = Infinity;
    for (const p of esperados) {
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const dz = q[2] - p[2];
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < minD2) minD2 = d2;
    }
    if (minD2 > piorD2) piorD2 = minD2;
  }

  return Math.sqrt(piorD2);
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

  const pontosPorNome = extrairPontosPorParte(neutro);
  const medidas = [...medirPorNome(neutro).values()]
    .sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0))
    .map((p) => ({
      parte: p.nome,
      min: p.min.map(arredondar),
      max: p.max.map(arredondar),
      pontos: pontosPorNome.get(p.nome) ?? [],
    }));

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
 * diferença encontrada em qualquer eixo (centro, dimensão ou desvio interno de
 * pontos): é o número único que decide se a receita reescrita chegou onde a
 * pessoa deixou.
 *
 * Parte a mais ou a menos é falha, não empate, e nos DOIS sentidos. Parte que o
 * alvo declara e a receita não produz leva `piorMm` a infinito; parte que a
 * receita produz e o alvo não declara também. Medido: apagar o tubo superior na
 * bancada e comparar com a receita intacta dava `piorMm` de 0,000916 — um número
 * que qualquer leitura entende como "praticamente certo" — enquanto um tubo
 * inteiro sobrava. Só `dentro` acusava, e quem olha o número antes da bandeira
 * era enganado.
 */
export function compararComAlvo(neutro, alvo) {
  if (alvo?.formato !== FORMATO_DO_ALVO) throw new Error(`compararComAlvo: formato desconhecido: ${alvo?.formato}`);
  const atual = medirPorNome(neutro);
  const pontosAtuais = extrairPontosPorParte(neutro);
  const tolerancia = alvo.toleranciaMm ?? TOLERANCIA_PADRAO_MM;

  const partes = [];
  const ausentes = [];
  for (const esperada of alvo.partes) {
    const obtida = atual.get(esperada.parte);
    if (!obtida) { ausentes.push(esperada.parte); continue; }
    const alvoDa = centroEDimensao(esperada);
    const obtidaDa = centroEDimensao(obtida);
    const centroMm = [0, 1, 2].map((i) => arredondar(emMilimetro(obtidaDa.centro[i] - alvoDa.centro[i])));
    const dimensaoMm = [0, 1, 2].map((i) => arredondar(emMilimetro(obtidaDa.dimensao[i] - alvoDa.dimensao[i])));
    const desvioMm = esperada.pontos && esperada.pontos.length > 0
      ? arredondar(emMilimetro(desvioEntrePontos(esperada.pontos, pontosAtuais.get(esperada.parte) ?? [])))
      : 0;
    const pior = Math.max(...centroMm.map(Math.abs), ...dimensaoMm.map(Math.abs), desvioMm);
    partes.push({
      parte: esperada.parte,
      centroMm,
      dimensaoMm,
      desvioMm,
      piorMm: pior,
      dentro: pior <= tolerancia,
    });
  }

  const declaradas = new Set(alvo.partes.map((p) => p.parte));
  const sobrando = [...atual.keys()].filter((nome) => !declaradas.has(nome)).sort();

  const piorMm = (ausentes.length || sobrando.length)
    ? Infinity
    : Math.max(0, ...partes.map((p) => p.piorMm));
  const dentro = ausentes.length === 0 && sobrando.length === 0 && piorMm <= tolerancia;
  return { dentro, piorMm, toleranciaMm: tolerancia, partes, ausentes, sobrando };
}
