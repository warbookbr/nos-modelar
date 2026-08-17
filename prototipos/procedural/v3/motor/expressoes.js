/* expressoes.js — aritmética determinística e fechada para parâmetros da Oficina.
   A expressão só existe em um campo numérico e sempre começa com `=`. Ela aceita
   números, nomes próprios de PARAMS/TOPO, parênteses e + - * /. Não avalia JS,
   não acessa propriedades e não chama funções. */

const INICIO_NOME = /[A-Za-z_]/;
const CORPO_NOME = /[A-Za-z0-9_]/;

function erro(texto) { throw new Error(`oficina: expressão inválida: ${texto}`); }

export function criarResolverNumerico(dict) {
  const cache = new Map();
  const resolvendo = [];
  const finito = (valor) => {
    if (!Number.isFinite(valor)) throw new Error(`oficina: valor numérico não-finito: ${valor}`);
    return valor;
  };

  function nome(nomeParam) {
    if (cache.has(nomeParam)) return cache.get(nomeParam);
    if (!Object.hasOwn(dict, nomeParam)) throw new Error(`oficina: parâmetro '${nomeParam}' não existe em PARAMS/TOPO`);
    const inicioCiclo = resolvendo.indexOf(nomeParam);
    if (inicioCiclo >= 0) throw new Error(`oficina: ciclo de parâmetros: ${[...resolvendo.slice(inicioCiclo), nomeParam].join(' -> ')}`);
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
        return nome(fonte.slice(inicio, i));
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
    throw new Error(`oficina: valor numérico inválido: ${JSON.stringify(valor)}`);
  }

  return { num };
}
