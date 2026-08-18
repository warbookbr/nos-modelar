#!/usr/bin/env node
/* Resumo mensurável da sonda, sem depender da bancada publicada. */
import { auditarIntersecoesMontagem } from '../../../src/autoria/auditar-intersecoes-montagem.js';
import { descreverMontagemResolvida } from '../../../src/autoria/descrever-montagem-resolvida.js';
import { carregarEstudoSupercarro } from './carregar-estudo.mjs';

const { pecas, montagem } = await carregarEstudoSupercarro();
const contexto = descreverMontagemResolvida(montagem);
const auditoriaRoda = auditarIntersecoesMontagem(montagem, {
  caminho: ['roda-dianteira-esquerda'],
  modoFoco: 'interno',
});

const metricas = [...pecas.values()].map(({ ref, medida, exportacao }) => ({
  id: ref,
  vertices: exportacao.dado.V.length,
  faces: exportacao.dado.F.length,
  partes: exportacao.dado.partes,
  portas: exportacao.dado.portas.map(({ id, nome }) => id ?? nome).sort(),
  facesSemParte: medida.resultado.descricao.totais.facesSemParte,
  chamadasComposicao: exportacao.expansao?.chamadas.length ?? 0,
  bytes: Buffer.byteLength(exportacao.texto),
}));

process.stdout.write(`${JSON.stringify({
  estudo: montagem.id,
  pecas: metricas,
  totaisGeometria: metricas.reduce((soma, item) => ({
    vertices: soma.vertices + item.vertices,
    faces: soma.faces + item.faces,
    bytes: soma.bytes + item.bytes,
  }), { vertices: 0, faces: 0, bytes: 0 }),
  montagem: contexto.totais,
  auditoriaRoda,
}, null, 2)}\n`);
