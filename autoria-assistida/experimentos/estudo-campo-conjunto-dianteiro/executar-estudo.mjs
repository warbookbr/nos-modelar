#!/usr/bin/env node
/* Executa a montagem do estudo sem criar uma porta nova no produto. */
import { readFileSync } from 'node:fs';
import { nucleo, neutroCanonico } from '../../../prototipos/procedural/v3/motor/oficina.js';
import {
  FORMATO, VERSAO, parteDaFace,
} from '../../../src/autoria/ler-peca-resolvida.js';
import { descreverMontagemResolvida } from '../../../src/autoria/descrever-montagem-resolvida.js';
import { derivarImpactoMontagem } from '../../../src/autoria/derivar-impacto-montagem.js';
import { resolverMontagemPersistida } from '../../../src/autoria/resolver-montagem-persistida.js';

const argumentos = new Map(process.argv.slice(2).map((item) => {
  const [chave, valor = ''] = item.split('=', 2);
  return [chave, valor];
}));
const discoRaioTexto = argumentos.get('--disco-raio');
const discoRaio = discoRaioTexto === undefined ? 0.140 : Number(discoRaioTexto);
if (!Number.isFinite(discoRaio) || discoRaio <= 0.050) {
  throw new Error('--disco-raio precisa ser finito e maior que 0.050.');
}

const lerJson = (caminho) => JSON.parse(readFileSync(new URL(caminho, import.meta.url), 'utf8'));
const montagens = new Map([
  ['freio', lerJson('./montagens/freio.json')],
  ['roda', lerJson('./montagens/roda.json')],
]);
const raiz = lerJson('./montagens/conjunto.json');

async function exportarReceitaDoEstudo(ref, paramsExtra = null) {
  const modulo = await import(new URL(`./receitas/${ref}.js`, import.meta.url));
  const params = paramsExtra ? { ...(modulo.PARAMS ?? {}), ...paramsExtra } : (modulo.PARAMS ?? {});
  const bruto = nucleo(
    modulo.PASSOS,
    params,
    modulo.TOPO ?? {},
    modulo.MATERIAIS ?? {},
    modulo.ESQUELETO ?? null,
    modulo.ALIASES ?? [],
  );
  if (bruto.orfaos.length > 0) {
    throw new Error(`receita experimental '${ref}' produziu ${bruto.orfaos.length} órfão(s).`);
  }
  const canonico = neutroCanonico(bruto);
  return {
    formato: FORMATO,
    versao: VERSAO,
    peca: ref,
    receita: 'estudo-campo-conjunto-dianteiro',
    meta: { nome: modulo.meta?.nome ?? ref },
    materiais: modulo.MATERIAIS ?? {},
    partes: [...new Set(canonico.F.map(parteDaFace).filter(Boolean))].sort(),
    portas: [...bruto.portas.values()].map((porta) => JSON.parse(JSON.stringify(porta))),
    V: canonico.V,
    F: canonico.F,
  };
}

const carregarPeca = async (ref) => {
  const paramsExtra = ref === '_estudo-disco-dianteiro' ? { raioExterno: discoRaio } : null;
  return exportarReceitaDoEstudo(ref, paramsExtra);
};
const carregarMontagem = async (ref) => montagens.get(ref);
const resolvida = await resolverMontagemPersistida(raiz, { carregarPeca, carregarMontagem });

const instancias = [];
const nosDePeca = [];
const relacoes = [];
function percorrer(montagem, caminho = []) {
  for (const instancia of montagem.instancias) {
    instancias.push({
      caminho: [...caminho, instancia.id],
      tipo: instancia.alvo.tipo,
      ref: instancia.alvo.ref,
      poseMundo: instancia.poseMundo,
    });
    if (instancia.alvo.tipo === 'peca') nosDePeca.push(instancia);
    if (instancia.montagem) percorrer(instancia.montagem, [...caminho, instancia.id]);
  }
  for (const relacao of montagem.relacoes ?? []) {
    relacoes.push({
      montagem: caminho,
      id: relacao.id,
      tipo: relacao.tipo,
      referencia: relacao.referencia.caminho,
      movel: relacao.movel.caminho,
      satisfeita: relacao.satisfeita,
      medidas: relacao.medidas,
      diagnosticos: relacao.diagnosticos,
    });
  }
}
percorrer(resolvida);

const produto = (a, b) => a.reduce((soma, valor, indice) => soma + valor * b[indice], 0);
const transformar = (ponto, pose) => pose.rotacao.map((linha) => produto(linha, ponto))
  .map((valor, indice) => valor + pose.deslocamento[indice]);
function caixaDaInstancia(instancia, parte = null) {
  const neutro = instancia.definicao.neutro;
  const ids = parte === null
    ? [...neutro.V.keys()]
    : [...new Set([...neutro.F.values()]
      .filter((face) => face.parte === parte)
      .flatMap((face) => face.vs))];
  const pontos = ids.map((id) => transformar(neutro.V.get(id), instancia.poseMundo));
  return {
    min: [0, 1, 2].map((eixo) => Math.min(...pontos.map((ponto) => ponto[eixo]))),
    max: [0, 1, 2].map((eixo) => Math.max(...pontos.map((ponto) => ponto[eixo]))),
  };
}
const disco = nosDePeca.find((instancia) => instancia.caminho.join('/') === 'freio/disco');
const pinca = nosDePeca.find((instancia) => instancia.caminho.join('/') === 'freio/pinca');
const caixaDisco = caixaDaInstancia(disco);
const caixaPonte = caixaDaInstancia(pinca, 'pinca');
const medidasExperimentais = {
  aviso: 'medida independente do estudo para conferir a relação persistida de separação direcional',
  discoRaioMaximoY: caixaDisco.max[1],
  ponteMinimoY: caixaPonte.min[1],
  folgaRadialDiscoPonte: caixaPonte.min[1] - caixaDisco.max[1],
};

const resultado = {
  estudo: resolvida.id,
  discoRaio,
  instancias,
  relacoes,
  medidasExperimentais,
  resumo: {
    pecas: instancias.filter((item) => item.tipo === 'peca').length,
    montagensFilhas: instancias.filter((item) => item.tipo === 'montagem').length,
    relacoes: relacoes.length,
    satisfeitas: relacoes.filter((item) => item.satisfeita).length,
  },
};
let saida = argumentos.has('--resumo')
  ? {
    estudo: resultado.estudo,
    discoRaio: resultado.discoRaio,
    resumo: resultado.resumo,
    relacoes: resultado.relacoes.map(({ id, tipo, satisfeita, diagnosticos }) => ({ id, tipo, satisfeita, diagnosticos })),
    medidasExperimentais: resultado.medidasExperimentais,
  }
  : resultado;
if (argumentos.has('--contexto')) {
  const caminho = argumentos.get('--caminho');
  const profundidadeTexto = argumentos.get('--profundidade');
  const profundidade = profundidadeTexto === undefined ? undefined : Number(profundidadeTexto);
  if (profundidadeTexto !== undefined && (!Number.isSafeInteger(profundidade) || profundidade < 0)) {
    throw new Error('--profundidade precisa ser inteiro não negativo.');
  }
  saida = descreverMontagemResolvida(resolvida, {
    ...(caminho !== undefined ? { caminho: caminho.split('/') } : {}),
    ...(profundidade !== undefined ? { profundidade } : {}),
    ...(argumentos.has('--incluir-relacionados') ? { incluirRelacionados: true } : {}),
  });
}
if (argumentos.has('--impacto')) {
  const caminho = argumentos.get('--impacto');
  if (!caminho) throw new Error('--impacto precisa receber um caminho semântico.');
  saida = derivarImpactoMontagem(resolvida, { caminho: caminho.split('/') });
}
process.stdout.write(`${JSON.stringify(saida, null, 2)}\n`);
