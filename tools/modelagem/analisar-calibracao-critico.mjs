/* Estatística P0-C: mede respostas já ingeridas; não chama nem simula um crítico externo. */
import { validarCorpusAvaliacaoP0 } from './validar-corpus-avaliacao.mjs';

const DECISOES = new Set(['A', 'B', 'empate', 'indeterminado']);
const BASELINES = ['A', 'B', 'empate', 'indeterminado'];
function falhar(mensagem) { throw new Error(`analisar-calibracao-critico: ${mensagem}`); }
function media(valores) { return valores.reduce((total, valor) => total + valor, 0) / valores.length; }
function intervalo95(valores) {
  const ordenados = [...valores].sort((a, b) => a - b);
  const quantil = (p) => ordenados[Math.floor((ordenados.length - 1) * p)];
  return Object.freeze({ inferior: quantil(0.025), superior: quantil(0.975) });
}
function aleatorio(semente) {
  let estado = (semente >>> 0) || 1;
  return () => { estado = (estado * 1664525 + 1013904223) >>> 0; return estado / 2 ** 32; };
}
function prepararItens(manifesto, julgamentos) {
  if (!Array.isArray(julgamentos)) falhar('julgamentos precisam ser lista.');
  const porItem = new Map(manifesto.itens.map((item) => [item.id, []]));
  for (const julgamento of julgamentos) {
    if (!julgamento || typeof julgamento.item !== 'string' || !DECISOES.has(julgamento.decisaoSemantica)) falhar('julgamento sem item ou decisão semântica válida.');
    const grupo = porItem.get(julgamento.item);
    if (!grupo) falhar('julgamento refere item fora do manifesto.');
    grupo.push(julgamento.decisaoSemantica);
  }
  return manifesto.itens.map((item) => {
    const respostas = porItem.get(item.id);
    if (respostas.length !== 4) falhar(`item ${item.id} precisa de quatro julgamentos.`);
    const unanime = new Set(respostas).size === 1;
    const decisao = unanime ? respostas[0] : 'inconsistente';
    return Object.freeze({ ...item, repetivel: unanime ? 1 : 0, decisao, acerto: unanime && decisao === item.respostaConhecida ? 1 : 0, promocaoGrosseira: item.tipo === 'decisivo' && item.severidade === 'grosseiro' && unanime && decisao !== item.respostaConhecida ? 1 : 0 });
  });
}
function selecionarBaseline(calibracao) {
  return BASELINES.map((decisao) => ({ decisao, acerto: media(calibracao.map((item) => item.respostaConhecida === decisao ? 1 : 0)) }))
    .sort((a, b) => b.acerto - a.acerto || BASELINES.indexOf(a.decisao) - BASELINES.indexOf(b.decisao))[0];
}
function medir(itens, decisaoBaseline) {
  const acertoBaseline = media(itens.map((item) => item.respostaConhecida === decisaoBaseline ? 1 : 0));
  const matriz = Object.fromEntries([...DECISOES, 'inconsistente'].map((esperada) => [esperada, Object.fromEntries([...DECISOES, 'inconsistente'].map((obtida) => [obtida, 0]))]));
  for (const item of itens) matriz[item.respostaConhecida][item.decisao] += 1;
  return Object.freeze({ itens: itens.length, objetos: new Set(itens.map(({ objeto }) => objeto)).size, repetibilidade: media(itens.map(({ repetivel }) => repetivel)), acerto: media(itens.map(({ acerto }) => acerto)), acertoBaseline, diferencaAcerto: media(itens.map(({ acerto, respostaConhecida }) => acerto - (respostaConhecida === decisaoBaseline ? 1 : 0))), promocoesGrosseiras: itens.reduce((total, { promocaoGrosseira }) => total + promocaoGrosseira, 0), matrizConfusao: matriz });
}
function bootstrapPorObjeto(itens, decisaoBaseline, reamostras, semente) {
  const porObjeto = new Map();
  for (const item of itens) porObjeto.set(item.objeto, [...(porObjeto.get(item.objeto) ?? []), item]);
  const objetos = [...porObjeto.keys()]; const sortear = aleatorio(semente);
  const repetibilidade = []; const diferencaAcerto = [];
  for (let rodada = 0; rodada < reamostras; rodada += 1) {
    const amostra = Array.from({ length: objetos.length }, () => porObjeto.get(objetos[Math.floor(sortear() * objetos.length)])).flat();
    const medida = medir(amostra, decisaoBaseline);
    repetibilidade.push(medida.repetibilidade); diferencaAcerto.push(medida.diferencaAcerto);
  }
  return Object.freeze({ repetibilidade: intervalo95(repetibilidade), diferencaAcerto: intervalo95(diferencaAcerto) });
}

export function analisarCalibracaoCriticoP0(manifesto, julgamentos, opcoes = {}) {
  validarCorpusAvaliacaoP0(manifesto);
  const reamostras = opcoes.reamostras ?? 1000;
  if (!Number.isInteger(reamostras) || reamostras < 200) falhar('reamostras precisa ser inteiro >= 200.');
  const itens = prepararItens(manifesto, julgamentos);
  const calibracao = itens.filter(({ split }) => split === 'calibracao');
  const holdout = itens.filter(({ split }) => split === 'holdout');
  const baselineEscolhido = selecionarBaseline(calibracao);
  const medidaHoldout = medir(holdout, baselineEscolhido.decisao);
  const intervalos95 = bootstrapPorObjeto(holdout, baselineEscolhido.decisao, reamostras, opcoes.semente ?? 1);
  const execucaoIndependente = opcoes.origem === 'critico-independente';
  const gatesSemFechar = { repetibilidade: intervalos95.repetibilidade.inferior >= 0.8, superaBaseline: intervalos95.diferencaAcerto.inferior > 0, zeroPromocaoGrosseira: medidaHoldout.promocoesGrosseiras === 0, execucaoIndependente };
  const gates = Object.freeze({ ...gatesSemFechar, elegivelParaP0C: gatesSemFechar.repetibilidade && gatesSemFechar.superaBaseline && gatesSemFechar.zeroPromocaoGrosseira && gatesSemFechar.execucaoIndependente });
  const decisao = execucaoIndependente ? (gates.elegivelParaP0C ? 'aprovar-critico' : 'reprovar') : 'indeterminado';
  return Object.freeze({ formato: 'mecanifica.analise-calibracao-critico-p0@1', origem: opcoes.origem ?? 'nao-declarada', reamostras, baseline: Object.freeze({ escolhidoNaCalibracao: `sempre-${baselineEscolhido.decisao}`, acertoCalibracao: baselineEscolhido.acerto, acertoHoldout: medidaHoldout.acertoBaseline, diferencaAcertoHoldout: medidaHoldout.diferencaAcerto }), holdout: medidaHoldout, intervalos95, gates: Object.freeze(gates), decisao });
}
