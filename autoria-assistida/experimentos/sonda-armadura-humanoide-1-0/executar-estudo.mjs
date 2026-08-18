#!/usr/bin/env node
/* Resumo mensurável de geometria, estados, contexto e auditoria estática. */
import { auditarIntersecoesMontagem } from '../../../src/autoria/auditar-intersecoes-montagem.js';
import { derivarImpactoDefinicaoMontagem } from '../../../src/autoria/derivar-impacto-montagem.js';
import { descreverMontagemResolvida } from '../../../src/autoria/descrever-montagem-resolvida.js';
import { carregarEstudoArmadura } from './carregar-estudo.mjs';

const estudo = await carregarEstudoArmadura();
const metricas = [...estudo.pecas.values()].map(({ ref, medida, exportacao }) => ({
  id: ref,
  vertices: exportacao.dado.V.length,
  faces: exportacao.dado.F.length,
  partes: exportacao.dado.partes,
  facesSemParte: medida.resultado.descricao.totais.facesSemParte,
  bytes: Buffer.byteLength(exportacao.texto),
}));
const estados = Object.fromEntries(Object.entries(estudo.estados).map(([nome, montagem]) => {
  const contexto = descreverMontagemResolvida(montagem);
  const auditoria = auditarIntersecoesMontagem(montagem);
  return [nome, {
    montagem: montagem.id,
    totais: contexto.totais,
    contextoBytes: Buffer.byteLength(JSON.stringify(contexto)),
    auditoria: {
      ...auditoria.cobertura,
      interpenetracoes: auditoria.pares.filter(({ estado }) => estado === 'interpenetram').length,
      contatos: auditoria.pares.filter(({ estado }) => estado === 'encostam').length,
    },
  }];
}));
const impactoJunta = derivarImpactoDefinicaoMontagem(estudo.estados.neutra, {
  tipo: 'peca', ref: 'junta-articulada',
});

process.stdout.write(`${JSON.stringify({
  estudo: 'sonda-armadura-humanoide-1-0',
  pecas: metricas,
  totaisGeometria: metricas.reduce((soma, item) => ({
    vertices: soma.vertices + item.vertices,
    faces: soma.faces + item.faces,
    bytes: soma.bytes + item.bytes,
    partes: soma.partes + item.partes.length,
  }), { vertices: 0, faces: 0, bytes: 0, partes: 0 }),
  estados,
  diferencasSemanticas: estudo.diferencas,
  impactoJunta: {
    consumidores: impactoJunta.consumidoresDefinicao.map(({ caminho }) => caminho),
    montagensARevalidar: impactoJunta.montagensARevalidar,
    limitacoes: impactoJunta.limitacoes,
  },
}, null, 2)}\n`);
