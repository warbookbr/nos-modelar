#!/usr/bin/env node
/* executar-estudo.mjs — mede as três receitas e valida as relações da fixture. */
import { parteDaFace } from '../../../src/autoria/ler-peca-resolvida.js';
import { carregarDefinicao, carregarMontagemDoEstudo, REFERENCIAS } from './carregar-estudo.mjs';

function contarComponentes(neutro) {
  const faces = neutro.F.map(([id, vs]) => [id, vs]);
  const porVertice = new Map();
  for (const [id, vertices] of faces) {
    for (const vertice of vertices) {
      if (!porVertice.has(vertice)) porVertice.set(vertice, []);
      porVertice.get(vertice).push(id);
    }
  }
  const porId = new Map(faces);
  const visitadas = new Set();
  let componentes = 0;
  for (const [inicial] of faces) {
    if (visitadas.has(inicial)) continue;
    componentes += 1;
    const fila = [inicial];
    visitadas.add(inicial);
    while (fila.length) {
      const atual = fila.pop();
      for (const vertice of porId.get(atual)) {
        for (const vizinha of porVertice.get(vertice)) {
          if (visitadas.has(vizinha)) continue;
          visitadas.add(vizinha);
          fila.push(vizinha);
        }
      }
    }
  }
  return componentes;
}

const pecas = [];
for (const ref of REFERENCIAS) {
  const definicao = await carregarDefinicao(ref);
  const faces = [...definicao.F.values()];
  pecas.push({
    id: ref,
    vertices: definicao.V.length,
    faces: definicao.F.length,
    partes: definicao.partes,
    facesSemParte: faces.filter((face) => !parteDaFace(face)).length,
    portas: definicao.portas.map((porta) => porta.nome ?? porta.id).sort(),
    componentesTopologicos: contarComponentes(definicao),
  });
}

const montagem = await carregarMontagemDoEstudo();
const relacoes = montagem.relacoes.map(({ id, tipo, satisfeita, medidas, diagnosticos }) => ({
  id,
  tipo,
  satisfeita,
  folgaRadial: medidas?.folgaRadial ?? null,
  sobreposicaoAxial: medidas?.sobreposicaoAxial ?? null,
  diagnosticos,
}));

process.stdout.write(`${JSON.stringify({
  estudo: montagem.id,
  pecas,
  relacoes,
  relacoesSatisfeitas: relacoes.filter((relacao) => relacao.satisfeita).length,
}, null, 2)}\n`);
