/* artefatos.js — contrato neutro e procedência determinística da execução procedural. */
export const TIPO_MALHA_POLIGONAL = 'mecanifica.malha-poligonal@1';

export function criarEstadoDeProcedencia() {
  return { passos: [], vertices: new Map(), faces: new Map(), portas: new Map(), partes: new Map() };
}

function anexar(mapa, id, evento) {
  const historico = mapa.get(id) ?? [];
  historico.push(evento);
  mapa.set(id, historico);
}

export function registrarProcedencia(estado, evento) {
  estado.passos.push(evento);
  for (const id of evento.saidas.vertices) anexar(estado.vertices, id, evento);
  for (const id of evento.saidas.faces) anexar(estado.faces, id, evento);
  for (const id of evento.saidas.portas) anexar(estado.portas, id, evento);
  for (const id of evento.saidas.partes) anexar(estado.partes, id, evento);
}

function historicos(mapa) {
  return [...mapa.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
    .map(([id, eventos]) => [id, eventos.map(({ passo, operacao }) => ({ passo, operacao }))]);
}

export function procedenciaCanonica(estado) {
  return {
    formato: 'mecanifica.procedencia@1',
    passos: estado.passos.map((evento) => ({ passo: evento.passo, operacao: evento.operacao, saidas: evento.saidas })),
    vertices: historicos(estado.vertices), faces: historicos(estado.faces),
    portas: historicos(estado.portas), partes: historicos(estado.partes),
  };
}

/* Grafo derivado: nós são passos reais; uma aresta existe somente quando a
   mesma entidade final foi tocada por passos consecutivos. Não infere intenção. */
export function grafoDaProcedencia(procedencia) {
  const entidades = [...procedencia.vertices, ...procedencia.faces, ...procedencia.portas, ...procedencia.partes];
  const arestas = new Map();
  for (const [, eventos] of entidades) for (let i = 1; i < eventos.length; i++) {
    const de = eventos[i - 1].passo, para = eventos[i].passo, chave = `${de}>${para}`;
    arestas.set(chave, { de, para });
  }
  return {
    formato: 'mecanifica.grafo-procedencia@1',
    nos: procedencia.passos.map(({ passo, operacao }) => ({ id: passo, operacao })),
    arestas: [...arestas.values()].sort((a, b) => a.de - b.de || a.para - b.para),
  };
}

export function artefatoDaMalha(neutro) {
  return Object.freeze({ tipo: TIPO_MALHA_POLIGONAL, versao: 1, entidade: 'malha-neutra' });
}
