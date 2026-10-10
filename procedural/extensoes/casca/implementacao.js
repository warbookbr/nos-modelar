/* implementacao.js — lê o sólido pela seleção, calcula a parede e emite só o que se soma a ele. */
import { calcularCasca } from '../../nucleo/casca.js';

export function implementar(contexto, argumentos = {}) {
  if (argumentos.solido == null) throw new Error('solido: obrigatório, uma seleção das faces do sólido (por exemplo {origem:{op:"cubo",id:1}})');
  if (argumentos.espessura == null) throw new Error('espessura: obrigatória, um número maior que zero e menor que a metade da menor medida do sólido');
  if (argumentos.origemId == null) throw new Error('origemId: obrigatório, a identidade do resultado');
  const espessura = contexto.numero(argumentos.espessura);
  const solido = contexto.selecionar(argumentos.solido, 'solido');
  const abertas = argumentos.abertas == null ? [] : contexto.selecionar(argumentos.abertas, 'abertas').faces.map(([id]) => id);
  const casca = calcularCasca({ vertices: solido.vertices, faces: solido.faces, abertas, espessura, limiteDeIds: contexto.limiteDeIds });

  casca.internos.forEach(([k, ponto]) => contexto.emitirVertice(k, ponto));
  const ref = ([tipo, id]) => (tipo === 'e' ? contexto.vertice(id) : id);
  casca.internas.forEach(({ de, vs }, k) => contexto.emitirFace(k, vs, { herda: de }));
  casca.bordas.forEach(({ de, vs }, k) => contexto.emitirFace(casca.internas.length + k, vs.map(ref), { herda: de }));

  const fechadas = solido.faces.map(([id]) => id).filter((id) => !abertas.includes(id));
  const externa = fechadas.map((id) => contexto.face(id));
  const interna = casca.internas.map((_, k) => k);
  const borda = casca.bordas.map((_, k) => casca.internas.length + k);
  contexto.declararOrigem(argumentos.origemId, { faces: [...externa, ...interna, ...borda], externa, interna, borda });
  for (const id of abertas) contexto.consumirFace(id);
}
