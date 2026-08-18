/* registro.js — configuração explícita, determinística e sem estado global de operações. */
const VERSAO = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export class ErroRegistroOperacoes extends Error {
  constructor(mensagem) { super(`registro de operações: ${mensagem}`); this.name = 'ErroRegistroOperacoes'; }
}

function versaoValida(versao, onde) {
  if (typeof versao !== 'string' || !VERSAO.test(versao)) throw new ErroRegistroOperacoes(`${onde} exige versão semântica x.y.z`);
  return versao;
}

function maior(versao) { return Number(versao.split('.')[0]); }
function textoCanonico(valor) { return JSON.stringify(valor); }
function compararTexto(a, b) { return a < b ? -1 : a > b ? 1 : 0; }

/* Não há autorregistro: o chamador entrega a configuração completa. A ordem de
   entrada nunca muda o resultado porque módulos e operações são ordenados por ID. */
export function criarRegistroOperacoes({ modulos } = {}) {
  if (!Array.isArray(modulos) || !modulos.length) throw new ErroRegistroOperacoes('configuração exige módulo(s) explícito(s)');
  const porModulo = new Map();
  for (const modulo of modulos) {
    if (!modulo || typeof modulo !== 'object' || !modulo.id) throw new ErroRegistroOperacoes('módulo sem id');
    if (porModulo.has(modulo.id)) throw new ErroRegistroOperacoes(`módulo duplicado '${modulo.id}'`);
    versaoValida(modulo.versao, `módulo '${modulo.id}'`);
    if (!Array.isArray(modulo.operacoes)) throw new ErroRegistroOperacoes(`módulo '${modulo.id}' exige lista de operações`);
    porModulo.set(modulo.id, modulo);
  }
  for (const modulo of porModulo.values()) for (const requisito of modulo.requer ?? []) {
    const encontrado = porModulo.get(requisito.id);
    if (!encontrado) throw new ErroRegistroOperacoes(`módulo '${modulo.id}' exige '${requisito.id}', que está ausente`);
    if (requisito.versao && maior(encontrado.versao) !== maior(versaoValida(requisito.versao, `requisito '${requisito.id}'`))) {
      throw new ErroRegistroOperacoes(`módulo '${modulo.id}' exige '${requisito.id}' em major compatível`);
    }
  }
  const porNome = new Map(), porId = new Map();
  const manifesto = [];
  for (const modulo of [...porModulo.values()].sort((a, b) => compararTexto(a.id, b.id))) {
    const operacoes = [];
    for (const operacao of modulo.operacoes) {
      if (!operacao || typeof operacao !== 'object' || !operacao.id || !operacao.nome) throw new ErroRegistroOperacoes(`operação inválida no módulo '${modulo.id}'`);
      versaoValida(operacao.versao, `operação '${operacao.id}'`);
      if (typeof operacao.executar !== 'function') throw new ErroRegistroOperacoes(`operação '${operacao.id}' não tem executor`);
      if (porId.has(operacao.id)) throw new ErroRegistroOperacoes(`id de operação duplicado '${operacao.id}'`);
      if (porNome.has(operacao.nome)) throw new ErroRegistroOperacoes(`nome de operação duplicado '${operacao.nome}'`);
      const registrada = Object.freeze({ ...operacao, modulo: modulo.id });
      porId.set(registrada.id, registrada); porNome.set(registrada.nome, registrada);
      operacoes.push({ id: registrada.id, nome: registrada.nome, versao: registrada.versao, categoria: registrada.categoria ?? 'geral' });
    }
    manifesto.push({ id: modulo.id, versao: modulo.versao, requer: [...(modulo.requer ?? [])].sort((a, b) => compararTexto(a.id, b.id)), operacoes: operacoes.sort((a, b) => compararTexto(a.id, b.id)) });
  }
  const assinatura = textoCanonico({ formato: 'mecanifica.registro-operacoes@1', modulos: manifesto });
  return Object.freeze({
    formato: 'mecanifica.registro-operacoes@1', assinatura, manifesto: Object.freeze(manifesto),
    resolver(nome, versao = null) {
      const operacao = porNome.get(nome) ?? porId.get(nome);
      if (!operacao) return null;
      if (versao !== null && operacao.versao !== versao) return null;
      return operacao;
    },
    listar() { return Object.freeze([...porId.values()].sort((a, b) => compararTexto(a.id, b.id))); },
  });
}
