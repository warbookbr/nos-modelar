/* historico-parametros.js — o desfazer da sessão, limitado ao que a pessoa
   mexeu depois de abrir a peça.
 *
 * Duas regras sustentam o módulo. A primeira é o piso: o valor que veio do
 * arquivo no momento da abertura é o fundo da pilha, e desfazer além dele não
 * inventa estado anterior nenhum. Sem esse piso, Ctrl+Z repetido continuaria
 * mexendo em número que ninguém desta sessão tocou, e a receita sairia
 * diferente do que estava no disco sem que ninguém tivesse pedido. É por isso
 * também que o desfazer avisa quando o valor restaurado é o de origem: a
 * bancada precisa apagar a pendência nesse caso, senão salvar reescreveria o
 * mesmo número e o arquivo mudaria sem mudança de conteúdo.
 *
 * A segunda é o agrupamento por gesto. Arrastar uma seta chama a prévia a cada
 * quadro, e guardar um passo por quadro faria um arrasto virar centenas de
 * Ctrl+Z. Registros seguidos do MESMO parâmetro se fundem num passo só,
 * guardando o valor de antes do primeiro deles; `separar` fecha o gesto quando
 * a pessoa solta o controle, para que o toque seguinte comece outro passo.
 *
 * O módulo não conhece a cena nem a receita: recebe o valor de origem por
 * função e devolve, a cada desfazer, qual parâmetro volta para qual valor. */

export function criarHistoricoParametros({ valorDeOrigem }) {
  if (typeof valorDeOrigem !== 'function') {
    throw new TypeError('historico de parametros exige valorDeOrigem(chave)');
  }

  const passos = [];
  const atual = new Map();
  let aberto = null;

  function valorCorrente(chave) {
    return atual.has(chave) ? atual.get(chave) : valorDeOrigem(chave);
  }

  function registrar(chave, valor) {
    if (typeof chave !== 'string' || chave.length === 0) return;
    if (aberto && aberto.chave === chave) {
      aberto.depois = valor;
      atual.set(chave, valor);
      return;
    }
    const passo = { chave, antes: valorCorrente(chave), depois: valor };
    passos.push(passo);
    atual.set(chave, valor);
    aberto = passo;
  }

  function separar() {
    aberto = null;
  }

  function desfazer() {
    const passo = passos.pop();
    if (!passo) return null;
    aberto = null;
    atual.set(passo.chave, passo.antes);
    const origem = valorDeOrigem(passo.chave);
    return {
      chave: passo.chave,
      valor: passo.antes,
      naOrigem: Object.is(passo.antes, origem),
    };
  }

  return {
    registrar,
    separar,
    desfazer,
    get vazio() { return passos.length === 0; },
    get tamanho() { return passos.length; },
    limpar() { passos.length = 0; atual.clear(); aberto = null; },
  };
}
