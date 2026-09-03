/* caminho-simetrico.js — utilitário declarativo para construção de caminhos bilaterais
   simétricos para a primitiva `loft` no motor procedural da Mecanifica. */

/**
 * Constrói uma sequência simétrica bilateral de seções para 'loft' a partir
 * de um meio-perfil declarado do centro até uma extremidade.
 *
 * Elimina discrepâncias e erros angulares manuais em peças que atravessam o
 * plano de simetria (encostos, arcos, guidões, espadas, carcaças).
 *
 * @param {Object} opcoes
 * @param {Array<{ x?: number, y?: number, z?: number, pos?: [number, number, number], contorno?: Array<[number, number]>, raio?: number }>} opcoes.meioPerfil
 * @param {'x' | 'y' | 'z'} [opcoes.eixo='x'] Eixo ao longo do qual a simetria se aplica (padrão: 'x')
 * @returns {Array<{ pos: [number, number, number], contorno?: Array<[number, number]>, raio?: number }>}
 */
export function criarCaminhoSimetrico({
  meioPerfil,
  eixo = 'x',
}) {
  if (!Array.isArray(meioPerfil) || meioPerfil.length < 2) {
    throw new Error('criarCaminhoSimetrico: meioPerfil precisa ser um array com ao menos 2 pontos (centro e extremidade).');
  }

  const idxEixo = eixo === 'x' ? 0 : eixo === 'y' ? 1 : eixo === 'z' ? 2 : -1;
  if (idxEixo === -1) {
    throw new Error(`criarCaminhoSimetrico: eixo inválido '${eixo}', esperado 'x', 'y' ou 'z'.`);
  }

  const normalizarPonto = (p) => {
    let pos;
    if (Array.isArray(p.pos) && p.pos.length === 3) {
      pos = [p.pos[0], p.pos[1], p.pos[2]];
    } else {
      const x = p.x ?? 0;
      const y = p.y ?? 0;
      const z = p.z ?? 0;
      pos = [x, y, z];
    }

    const item = { pos };
    if (Array.isArray(p.contorno)) {
      item.contorno = p.contorno.map((pt) => [pt[0], pt[1]]);
    }
    if (p.raio != null) item.raio = p.raio;
    return item;
  };

  const lista = meioPerfil.map(normalizarPonto);
  const centro = lista[0];

  if (Math.abs(centro.pos[idxEixo]) > 1e-4) {
    throw new Error(
      `criarCaminhoSimetrico: o primeiro ponto do meioPerfil precisa estar no centro ` +
      `(eixo ${eixo} = 0, recebido ${centro.pos[idxEixo]}).`
    );
  }

  // Lado oposto espelhado: do extremo oposto até o ponto imediatamente anterior ao centro
  const ladoOposto = lista.slice(1).reverse().map((p) => {
    const posEspelhada = [p.pos[0], p.pos[1], p.pos[2]];
    posEspelhada[idxEixo] = -posEspelhada[idxEixo];
    const item = { pos: posEspelhada };
    if (p.contorno) item.contorno = p.contorno.map((pt) => [pt[0], pt[1]]);
    if (p.raio != null) item.raio = p.raio;
    return item;
  });

  return [...ladoOposto, centro, ...lista.slice(1)];
}
