#!/usr/bin/env node
/* Resumo causal e reproduzível da primeira sonda 1.0. */
import {
  buscarCapacidades,
  catalogoDeCapacidades,
  hipergrafoDeCapacidades,
  planejarCapacidades,
} from '../../../prototipos/procedural/v3/motor/oficina.js';
import { auditarIntersecoesMontagem } from '../../../src/autoria/auditar-intersecoes-montagem.js';
import { descreverMontagemResolvida } from '../../../src/autoria/descrever-montagem-resolvida.js';
import { carregarEstudoDobradica } from './carregar-estudo.mjs';

const { configuracao, pecas, montagem } = await carregarEstudoDobradica();
const catalogo = catalogoDeCapacidades(configuracao.registroOperacoes);
const hipergrafo = hipergrafoDeCapacidades(catalogo);
const busca = buscarCapacidades(catalogo, { efeito: 'publica-porta' });
const plano = planejarCapacidades(catalogo, {
  artefatos: { entra: [], sai: ['mecanifica.porta@1'] },
  interfaces: { entra: [], sai: [] },
  requisitos: [],
  maxCadeias: 3,
});
const contexto = descreverMontagemResolvida(montagem);
const auditoria = auditarIntersecoesMontagem(montagem);

process.stdout.write(`${JSON.stringify({
  estudo: montagem.id,
  descoberta: {
    operacoes: catalogo.operacoes.length,
    nosHipergrafo: hipergrafo.nos.length,
    publicadorasDePorta: busca.operacoes.map(({ id }) => id),
    cadeiasParaPorta: plano.cadeias.map(({ operacoes }) => operacoes.map(({ id }) => id)),
  },
  pecas: [...pecas.values()].map(({ ref, medida, exportacao }) => ({
    id: ref,
    vertices: exportacao.dado.V.length,
    faces: exportacao.dado.F.length,
    partes: exportacao.dado.partes,
    portas: exportacao.dado.portas.map(({ nome, id }) => id ?? nome).sort(),
    chamadas: exportacao.expansao.chamadas,
    caminhos: exportacao.expansao.procedencia.nos.map(({ caminho }) => caminho),
    facesSemParte: medida.resultado.descricao.totais.facesSemParte,
  })),
  montagem: { totais: contexto.totais, relacoes: montagem.relacoes },
  auditoria,
}, null, 2)}\n`);
