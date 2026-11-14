/* expressoes.js — aritmética determinística e fechada para parâmetros da Oficina.
   A expressão só existe em um campo numérico e sempre começa com `=`. Ela aceita
   números, nomes próprios de PARAMS/TOPO, parênteses, + - * / e as funções da
   lista fechada FUNCOES. Não avalia JS, não acessa propriedades e não chama outra
   função. */

const INICIO_NOME = /[A-Za-z_]/;
const CORPO_NOME = /[A-Za-z0-9_]/;

/* A lista fechada de funções: o nome, quantos argumentos e o cálculo. Os ângulos entram e saem em graus, como `graus`
   das operações e `rotacao` do esboço; `atan2(y, x)` dá o ângulo do vetor (x, y) entre -180 e 180, e `sqrt` recusa
   número negativo em vez de devolver NaN. `min` e `max` aceitam dois ou mais argumentos (`variadica`): `aridade` é então
   o mínimo, e o menor ou o maior de uma lista de medidas dispensa escrever a raiz do quadrado da diferença. */
const GRAUS = 180 / Math.PI;
const FUNCOES = {
  atan: { aridade: 1, calcular: (x) => Math.atan(x) * GRAUS },
  atan2: { aridade: 2, calcular: (y, x) => Math.atan2(y, x) * GRAUS },
  sin: { aridade: 1, calcular: (a) => Math.sin(a / GRAUS) },
  cos: { aridade: 1, calcular: (a) => Math.cos(a / GRAUS) },
  tan: { aridade: 1, calcular: (a) => Math.tan(a / GRAUS) },
  sqrt: { aridade: 1, calcular: (x) => { if (x < 0) erro(`sqrt de ${x}, que é negativo`); return Math.sqrt(x); } },
  min: { aridade: 2, variadica: true, calcular: (...xs) => Math.min(...xs) },
  max: { aridade: 2, variadica: true, calcular: (...xs) => Math.max(...xs) },
};

/** Distância de edição, para sugerir o nome certo diante de um erro de digitação. */
export function distanciaDeEdicao(a, b) {
  const linha = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = linha[0];
    linha[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const anterior = linha[j];
      linha[j] = Math.min(linha[j] + 1, linha[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = anterior;
    }
  }
  return linha[b.length];
}

/** Os nomes de `candidatos` a até duas edições de `nome`, do mais próximo ao mais distante, e em ordem alfabética no empate. A distância vale no máximo metade do menor dos dois nomes: '2' não sugere 'k'. */
export function nomesProximos(nome, candidatos, quantos = 3) {
  return candidatos
    .map((candidato) => ({ candidato, d: distanciaDeEdicao(String(nome), candidato) }))
    .filter(({ d, candidato }) => d <= 2 && d * 2 <= Math.min(String(nome).length, candidato.length))
    .sort((x, y) => x.d - y.d || (x.candidato < y.candidato ? -1 : 1))
    .slice(0, quantos)
    .map(({ candidato }) => candidato);
}

/** O erro do resolvedor numérico, com o que faltou para o despacho dizer onde: `nome` (parâmetro que não existe) ou `valor` (o que não é número). */
export class ErroDeResolucao extends Error {
  constructor(mensagem, detalhes) {
    super(mensagem);
    this.name = 'ErroDeResolucao';
    Object.assign(this, detalhes);
  }
}

function erro(texto) { throw new ErroDeResolucao(`oficina: expressão inválida: ${texto}`, { tipo: 'expressao' }); }

export function criarResolverNumerico(dict) {
  const cache = new Map();
  const resolvendo = [];
  const finito = (valor) => {
    if (!Number.isFinite(valor)) throw new ErroDeResolucao(`oficina: valor numérico não-finito: ${valor}`, { tipo: 'valor', valor });
    return valor;
  };

  function nome(nomeParam) {
    if (cache.has(nomeParam)) return cache.get(nomeParam);
    if (!Object.hasOwn(dict, nomeParam)) {
      const proximos = nomesProximos(nomeParam, Object.keys(dict));
      const dica = proximos.length ? `; você quis dizer ${proximos.map((p) => `'${p}'`).join(' ou ')}?` : '';
      throw new ErroDeResolucao(`oficina: parâmetro '${nomeParam}' não existe em PARAMS/TOPO${dica}`, { tipo: 'nome', nome: nomeParam, proximos });
    }
    const inicioCiclo = resolvendo.indexOf(nomeParam);
    if (inicioCiclo >= 0) throw new ErroDeResolucao(`oficina: ciclo de parâmetros: ${[...resolvendo.slice(inicioCiclo), nomeParam].join(' -> ')}`, { tipo: 'ciclo' });
    resolvendo.push(nomeParam);
    try {
      const valor = num(dict[nomeParam]);
      cache.set(nomeParam, valor);
      return valor;
    } finally {
      resolvendo.pop();
    }
  }

  function expressao(texto) {
    let i = 0;
    const fonte = texto.slice(1);
    const pular = () => { while (/\s/.test(fonte[i] ?? '')) i += 1; };
    const consumir = (simbolo) => {
      pular();
      if (fonte[i] !== simbolo) return false;
      i += 1;
      return true;
    };
    const primario = () => {
      pular();
      if (consumir('(')) {
        const valor = soma();
        if (!consumir(')')) erro(`faltou ')' em '${texto}'`);
        return valor;
      }
      if (consumir('+')) return primario();
      if (consumir('-')) return -primario();
      const numero = fonte.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
      if (numero) { i += numero[0].length; return finito(Number(numero[0])); }
      if (INICIO_NOME.test(fonte[i] ?? '')) {
        const inicio = i;
        i += 1;
        while (CORPO_NOME.test(fonte[i] ?? '')) i += 1;
        const lido = fonte.slice(inicio, i);
        pular();
        if (fonte[i] !== '(') return nome(lido);
        if (!Object.hasOwn(FUNCOES, lido)) erro(`função '${lido}' não existe em '${texto}' (há ${Object.keys(FUNCOES).join(', ')})`);
        i += 1;
        const argumentos = [soma()];
        while (consumir(',')) argumentos.push(soma());
        if (!consumir(')')) erro(`faltou ')' em '${texto}'`);
        const { aridade, variadica, calcular } = FUNCOES[lido];
        if (variadica ? argumentos.length < aridade : argumentos.length !== aridade) erro(`'${lido}' recebe ${variadica ? `${aridade} ou mais` : aridade} argumento(s), não ${argumentos.length}, em '${texto}'`);
        return finito(calcular(...argumentos));
      }
      erro(`esperava número, nome ou '(' em '${texto}' na posição ${i + 1}`);
    };
    const produto = () => {
      let valor = primario();
      while (true) {
        if (consumir('*')) valor *= primario();
        else if (consumir('/')) valor /= primario();
        else return finito(valor);
      }
    };
    const soma = () => {
      let valor = produto();
      while (true) {
        if (consumir('+')) valor += produto();
        else if (consumir('-')) valor -= produto();
        else return finito(valor);
      }
    };
    const valor = soma();
    pular();
    if (i !== fonte.length) erro(`símbolo '${fonte[i]}' não permitido em '${texto}'`);
    return finito(valor);
  }

  function num(valor) {
    if (typeof valor === 'number') return finito(valor);
    if (typeof valor === 'string') return valor.startsWith('=') ? expressao(valor) : nome(valor);
    throw new ErroDeResolucao(`oficina: valor numérico inválido: ${JSON.stringify(valor) ?? String(valor)}`, { tipo: 'valor', valor });
  }

  return { num };
}
