/* derivar-catalogo-montagens.js — índice determinístico limitado às raízes dadas. */

export class ErroCatalogoMontagens extends Error {
  constructor(codigo, campo, mensagem, acao) {
    super(`${campo}: ${mensagem}`);
    this.name = 'ErroCatalogoMontagens';
    this.codigo = codigo;
    this.campo = campo;
    this.acao = acao;
  }
}

const comparar = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const chave = (caminho) => JSON.stringify(caminho);

function falhar(codigo, campo, mensagem, acao) {
  throw new ErroCatalogoMontagens(codigo, campo, mensagem, acao);
}

function endpoint(endpoint) {
  return {
    caminho: endpoint.instancia.caminho.slice(),
    ...(endpoint.porta !== undefined ? { porta: endpoint.porta } : {}),
    ...(endpoint.parte !== undefined ? { parte: endpoint.parte } : {}),
  };
}

export function derivarCatalogoMontagens(raizes) {
  if (!Array.isArray(raizes) || raizes.length === 0) {
    falhar('raizes-invalidas', 'raizes', 'informe ao menos uma raiz resolvida.', 'Passe uma lista explícita de montagens resolvidas.');
  }
  const vistas = new Set();
  const usos = new Map();
  const relacoes = [];
  for (const [indice, raiz] of raizes.entries()) {
    if (!raiz?.id || !Array.isArray(raiz.instancias)) {
      falhar('raiz-invalida', `raizes[${indice}]`, 'precisa ser montagem resolvida.', 'Resolva cada raiz antes de catalogar.');
    }
    if (vistas.has(raiz.id)) falhar('raiz-duplicada', `raizes[${indice}].id`, `raiz '${raiz.id}' repetida.`, 'Use IDs de raiz distintos.');
    vistas.add(raiz.id);
    const visitar = (montagem, caminhoMontagem = []) => {
      for (const instancia of montagem.instancias) {
        const referencia = `${instancia.alvo.tipo}:${instancia.alvo.ref}`;
        const lista = usos.get(referencia) ?? [];
        lista.push({ raiz: { id: raiz.id }, caminho: instancia.caminho.slice(), alvo: { ...instancia.alvo } });
        usos.set(referencia, lista);
        if (instancia.alvo.tipo === 'montagem') visitar(instancia.montagem, instancia.caminho);
      }
      for (const relacao of montagem.relacoes ?? []) relacoes.push({
        raiz: { id: raiz.id }, montagem: { caminho: caminhoMontagem.slice() }, id: relacao.id, tipo: relacao.tipo,
        referencia: endpoint(relacao.referencia), movel: endpoint(relacao.movel), satisfeita: relacao.satisfeita,
      });
    };
    visitar(raiz);
  }
  const usosOrdenados = [...usos.entries()].map(([referencia, instancias]) => ({
    referencia, instancias: instancias.sort((a, b) => comparar(a.raiz.id, b.raiz.id) || comparar(chave(a.caminho), chave(b.caminho))),
  })).sort((a, b) => comparar(a.referencia, b.referencia));
  relacoes.sort((a, b) => comparar(a.raiz.id, b.raiz.id) || comparar(chave(a.montagem.caminho), chave(b.montagem.caminho)) || comparar(a.id, b.id));
  return {
    formato: 'mecanifica.catalogo-montagens', versao: 1,
    raizes: [...vistas].sort(comparar).map((id) => ({ id })), usos: usosOrdenados, relacoes,
    limitacoes: ['somente-raizes-explicitamente-fornecidas', 'uso-fora-do-catalogo-nao-verificado'],
  };
}
