/* derivar-impacto-montagem.js — deriva dependências locais sem executar revalidação. */

export class ErroImpactoMontagem extends Error {
  constructor(codigo, campo, mensagem, acao) {
    super(`${campo}: ${mensagem}`);
    this.name = 'ErroImpactoMontagem';
    this.codigo = codigo;
    this.campo = campo;
    this.acao = acao;
  }
}

function falhar(codigo, campo, mensagem, acao) {
  throw new ErroImpactoMontagem(codigo, campo, mensagem, acao);
}

function chave(caminho) {
  return JSON.stringify(caminho);
}

function compararCaminhos(a, b) {
  const limite = Math.min(a.length, b.length);
  for (let indice = 0; indice < limite; indice += 1) {
    const ordem = a[indice].localeCompare(b[indice], 'pt-BR');
    if (ordem !== 0) return ordem;
  }
  return a.length - b.length;
}

function caminhoComecaCom(caminho, prefixo) {
  return prefixo.length <= caminho.length
    && prefixo.every((segmento, indice) => caminho[indice] === segmento);
}

function endpointPublico(endpoint) {
  return {
    caminho: endpoint.instancia.caminho.slice(),
    ...(endpoint.porta !== undefined ? { porta: endpoint.porta } : {}),
    ...(endpoint.parte !== undefined ? { parte: endpoint.parte } : {}),
  };
}

function relacaoPublica(item) {
  return {
    montagem: { caminho: item.montagem.slice() },
    id: item.relacao.id,
    tipo: item.relacao.tipo,
    referencia: endpointPublico(item.relacao.referencia),
    movel: endpointPublico(item.relacao.movel),
    satisfeita: item.relacao.satisfeita,
  };
}

function coletarArvore(raiz) {
  const instancias = [];
  const montagens = new Set([chave([])]);
  const relacoes = [];

  function visitar(montagem, caminhoMontagem) {
    for (const instancia of montagem.instancias) {
      instancias.push(instancia);
      if (instancia.alvo.tipo === 'montagem') {
        montagens.add(chave(instancia.caminho));
        visitar(instancia.montagem, instancia.caminho);
      }
    }
    for (const relacao of montagem.relacoes ?? []) {
      relacoes.push({ montagem: caminhoMontagem.slice(), relacao });
    }
  }

  visitar(raiz, []);
  relacoes.sort((a, b) => compararCaminhos(a.montagem, b.montagem)
    || a.relacao.id.localeCompare(b.relacao.id, 'pt-BR'));
  return { instancias, montagens, relacoes };
}

function validarEntrada(raiz, alvo) {
  if (!raiz || !Array.isArray(raiz.instancias)) {
    falhar('montagem-resolvida-invalida', 'raiz', 'a árvore resolvida precisa trazer instâncias.',
      'Resolva a montagem persistida antes de derivar impacto.');
  }
  if (!alvo || !Array.isArray(alvo.caminho) || alvo.caminho.length === 0
    || alvo.caminho.some((segmento) => typeof segmento !== 'string' || segmento.length === 0)) {
    falhar('caminho-alvo-invalido', 'alvo.caminho', 'informe um caminho semântico não vazio.',
      'Use os ids persistidos das instâncias desde a raiz.');
  }
}

function adicionarMontagemEAncestrais(destino, caminho, montagens) {
  destino.add(chave([]));
  for (let tamanho = 1; tamanho <= caminho.length; tamanho += 1) {
    const ancestral = caminho.slice(0, tamanho);
    if (montagens.has(chave(ancestral))) destino.add(chave(ancestral));
  }
}

export function derivarImpactoMontagem(raiz, alvo) {
  validarEntrada(raiz, alvo);
  const arvore = coletarArvore(raiz);
  const instanciaAlvo = arvore.instancias.find((instancia) =>
    compararCaminhos(instancia.caminho, alvo.caminho) === 0);
  if (!instanciaAlvo) {
    falhar('alvo-ausente', 'alvo.caminho', `a instância '${alvo.caminho.join('/')}' não existe.`,
      'Consulte os caminhos da árvore resolvida e escolha uma instância existente.');
  }

  const iniciais = new Set(arvore.instancias
    .filter((instancia) => caminhoComecaCom(instancia.caminho, alvo.caminho))
    .map((instancia) => chave(instancia.caminho)));
  const alcancadas = new Set(iniciais);
  const classificadas = new Set();
  const diretas = [];
  const indiretas = [];
  const origemPorInstancia = new Map();
  let fronteira = new Set(iniciais);
  let primeiraOnda = true;

  while (fronteira.size > 0) {
    const tocadas = arvore.relacoes.filter((item) => {
      if (classificadas.has(item)) return false;
      const endpoints = [item.relacao.referencia, item.relacao.movel];
      return endpoints.some((endpoint) => fronteira.has(chave(endpoint.instancia.caminho)));
    });
    if (tocadas.length === 0) break;

    const proxima = new Set();
    for (const item of tocadas) {
      classificadas.add(item);
      (primeiraOnda ? diretas : indiretas).push(item);
      for (const endpoint of [item.relacao.referencia, item.relacao.movel]) {
        const endpointChave = chave(endpoint.instancia.caminho);
        if (!alcancadas.has(endpointChave)) {
          alcancadas.add(endpointChave);
          proxima.add(endpointChave);
          origemPorInstancia.set(endpointChave, primeiraOnda ? 'direta' : 'indireta');
        }
      }
    }
    fronteira = proxima;
    primeiraOnda = false;
  }

  const montagensARevalidar = new Set();
  adicionarMontagemEAncestrais(montagensARevalidar, alvo.caminho, arvore.montagens);
  for (const item of [...diretas, ...indiretas]) {
    adicionarMontagemEAncestrais(montagensARevalidar, item.montagem, arvore.montagens);
  }

  const caminhosMontagem = [...montagensARevalidar].map((item) => JSON.parse(item));
  caminhosMontagem.sort(compararCaminhos);
  const relacionadas = arvore.instancias
    .filter((instancia) => origemPorInstancia.has(chave(instancia.caminho)))
    .map((instancia) => ({
      caminho: instancia.caminho.slice(),
      origem: origemPorInstancia.get(chave(instancia.caminho)),
    }))
    .sort((a, b) => compararCaminhos(a.caminho, b.caminho));

  return {
    formato: 'mecanifica.impacto-montagem',
    versao: 1,
    raiz: { id: raiz.id },
    alvo: { caminho: alvo.caminho.slice() },
    relacoesDiretas: diretas.map(relacaoPublica),
    relacoesIndiretas: indiretas.map(relacaoPublica),
    instanciasRelacionadas: relacionadas,
    montagensARevalidar: caminhosMontagem.map((caminho) => ({ caminho })),
    limitacoes: [
      'uso-global-fora-da-raiz-nao-verificado',
      'dependencia-interna-de-porta-nao-inferida',
    ],
  };
}
