/* chamar-familia.js — a porta de entrada de uma família: `chamar(familia, id, parametros)`.

   Uma família carregada (`definirFamilia`) junta o contrato lido por `lerFamilia`, as composições procedurais que ela
   usa e o `derivar`, uma função pura. `chamar` completa os parâmetros com os padrões, recusa parâmetro desconhecido,
   valor fora do tipo ou da faixa e restrição violada (com o motivo que a família declara), chama o `derivar` e devolve
   a chamada de composição que a receita põe em `CHAMADAS_COMPOSICOES`: `{ id, composicao, argumentos }`.

   Os parâmetros entram em milímetro, graus ou contagem, como o contrato declara. O `derivar` recebe esses valores já
   completos e devolve `{ composicao, argumentos }` com os argumentos em metro, porque a composição v1 só substitui
   valores e não converte unidade. A recusa acontece antes de qualquer passo existir, então uma chamada recusada não
   gera malha. O arquivo só depende do contrato da família. */
import { ErroFamilia, avaliarRestricao, lerFamilia } from './familia.js';

const ID_DA_CHAMADA = /^[a-z][a-z0-9-]*$/;
const plano = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);
const lista = (itens) => itens.join(', ');
const comparar = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

/* Recusa de uma chamada. É um `ErroFamilia`, então quem já trata o contrato trata também a chamada; `restricao` e
   `motivo` só existem quando a causa é uma restrição da família. */
export class ErroChamadaDeFamilia extends ErroFamilia {
  constructor({ familia, campo, valor, aceito, restricao = null, motivo = null }) {
    super({ familia, campo, valor, aceito });
    this.name = 'ErroChamadaDeFamilia';
    this.restricao = restricao;
    this.motivo = motivo;
  }
}

function congelarFundo(valor) {
  if (valor && typeof valor === 'object' && !Object.isFrozen(valor)) { Object.values(valor).forEach(congelarFundo); Object.freeze(valor); }
  return valor;
}
const copiar = (valor) => JSON.parse(JSON.stringify(valor));

/**
 * Carrega uma família: valida o contrato (`lerFamilia`) e confere que as composições e o `derivar` existem.
 * `composicoes` são as composições procedurais da família (formato `mecanifica.composicao-procedural@1`); o `derivar`
 * só pode escolher entre elas. Devolve `{ contrato, composicoes, derivar }`, congelada.
 */
export function definirFamilia({ contrato, composicoes, derivar }, opcoes = {}) {
  const lido = lerFamilia(contrato, opcoes);
  const recusar = (campo, valor, aceito) => { throw new ErroFamilia({ familia: lido.id, campo, valor, aceito }); };
  if (!Array.isArray(composicoes) || !composicoes.length) recusar('composicoes', composicoes, 'lista com ao menos uma composição procedural da família');
  const ids = new Set();
  for (const composicao of composicoes) {
    if (!plano(composicao) || typeof composicao.id !== 'string' || !plano(composicao.parametros ?? {})) recusar('composicoes', composicao, 'composição procedural com id e parâmetros');
    if (ids.has(composicao.id)) recusar('composicoes', composicao.id, 'composição citada uma vez só');
    ids.add(composicao.id);
  }
  if (typeof derivar !== 'function') recusar('derivar', derivar, 'função pura (parametros em mm) => { composicao, argumentos em metro }');
  return Object.freeze({ contrato: lido, composicoes: Object.freeze([...composicoes]), derivar });
}

function conferirParametros(contrato, brutos) {
  const recusar = (campo, valor, aceito, extra) => { throw new ErroChamadaDeFamilia({ familia: contrato.id, campo, valor, aceito, ...extra }); };
  if (!plano(brutos)) recusar('parametros', brutos, 'objeto { nome do parâmetro: valor }');
  const nomes = Object.keys(contrato.parametros);
  for (const nome of Object.keys(brutos).sort(comparar)) {
    if (!Object.hasOwn(contrato.parametros, nome)) recusar(`parametros.${nome}`, brutos[nome], `parâmetro conhecido da família: ${lista(nomes)}`);
  }
  const completos = {};
  for (const nome of nomes) {
    const { tipo, unidade, padrao, minimo, maximo } = contrato.parametros[nome];
    const valor = brutos[nome] === undefined ? padrao : brutos[nome];
    if (typeof valor !== 'number' || !Number.isFinite(valor)) recusar(`parametros.${nome}`, valor, `número finito em ${unidade}, entre ${minimo} e ${maximo}`);
    if (tipo === 'inteiro' && !Number.isInteger(valor)) recusar(`parametros.${nome}`, valor, `número inteiro (contagem), entre ${minimo} e ${maximo}`);
    if (valor < minimo || valor > maximo) recusar(`parametros.${nome}`, valor, `valor em ${unidade} dentro da faixa [${minimo}, ${maximo}]`);
    completos[nome] = Object.is(valor, -0) ? 0 : valor;
  }
  for (const restricao of contrato.restricoes) {
    const resultado = avaliarRestricao(restricao, completos);
    if (resultado.satisfeita) continue;
    const citados = Object.fromEntries(nomes.filter((nome) => new RegExp(`\\b${nome}\\b`).test(restricao.expressao)).map((nome) => [nome, completos[nome]]));
    recusar(`restricao '${restricao.id}'`, citados, `${restricao.expressao} (o lado esquerdo vale ${resultado.esquerda} e o direito ${resultado.direita}): ${restricao.motivo}`, { restricao: restricao.id, motivo: restricao.motivo });
  }
  return completos;
}

/**
 * Chama a família: devolve a chamada de composição `{ id, composicao, argumentos }` para `CHAMADAS_COMPOSICOES`.
 * `id` identifica a chamada dentro da receita (minúsculas, dígitos e hífen). `parametros` traz só o que difere dos
 * padrões, em milímetro, graus ou contagem. Recusa com `ErroChamadaDeFamilia` (campo, valor e o que é aceito) o
 * parâmetro desconhecido, o valor fora do tipo ou da faixa, a restrição violada e o `derivar` que devolve algo que a
 * família não declara. Determinística: os mesmos parâmetros dão a mesma chamada.
 */
export function chamar(familia, id, parametros = {}) {
  if (!plano(familia) || !plano(familia.contrato) || typeof familia.derivar !== 'function') {
    throw new ErroFamilia({ campo: 'familia', valor: familia, aceito: 'família carregada por definirFamilia' });
  }
  const { contrato, composicoes, derivar } = familia;
  const recusar = (campo, valor, aceito) => { throw new ErroChamadaDeFamilia({ familia: contrato.id, campo, valor, aceito }); };
  if (typeof id !== 'string' || !ID_DA_CHAMADA.test(id)) recusar('id', id, 'id da chamada em minúsculas, dígitos e hífen, começando por letra');
  const completos = conferirParametros(contrato, parametros);

  const derivado = derivar(congelarFundo({ ...completos }));
  if (!plano(derivado)) recusar('derivar', derivado, 'objeto { composicao, argumentos }');
  const alvo = composicoes.find((composicao) => composicao.id === derivado.composicao);
  if (!alvo) recusar('derivar.composicao', derivado.composicao, `uma composição da família: ${lista(composicoes.map((c) => c.id))}`);
  if (!plano(derivado.argumentos)) recusar('derivar.argumentos', derivado.argumentos, 'objeto com os argumentos da composição, em metro');
  const declarados = Object.keys(alvo.parametros ?? {});
  for (const nome of Object.keys(derivado.argumentos)) {
    if (!declarados.includes(nome)) recusar(`derivar.argumentos.${nome}`, derivado.argumentos[nome], `argumento de '${alvo.id}': ${lista(declarados)}`);
  }
  for (const nome of declarados) {
    if (!Object.hasOwn(derivado.argumentos, nome) && !Object.hasOwn(alvo.parametros[nome], 'padrao')) recusar(`derivar.argumentos.${nome}`, undefined, `o argumento '${nome}' de '${alvo.id}', obrigatório`);
  }
  return { id, composicao: alvo.id, argumentos: copiar(derivado.argumentos) };
}
