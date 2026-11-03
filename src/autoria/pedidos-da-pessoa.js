/* pedidos-da-pessoa.js — os pedidos de alteração que a pessoa fez ao ver uma etapa, e a contagem por etapa.
 *
 * Cada pedido da pessoa depois de ver as imagens é um defeito que o alinhamento, a prancha e o crítico não pegaram. O registro guarda,
 * por pedido, o texto, a etapa em que a pessoa o fez, o id da regra que faltou (uma regra de `procedural/criterios/<família>.json`) e
 * onde a regra passou a morar. O número de pedidos por etapa é a medida de quanto o processo deixou passar: ele cai de um objeto para
 * o seguinte quando as regras estão no catálogo.
 *
 * Puro: não lê arquivo. O arquivo `pedidos.json` mora na pasta da peça, ao lado da receita, e é lido por
 * `tools/modelar/pedidos-da-pessoa.mjs`. */

export const FORMATO_PEDIDOS = 'mecanifica.pedidos-da-pessoa@1';
export const LIMITE_DO_PEDIDO = 300;

const NOME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const ABSOLUTO = /^(?:[a-z]:\\|\\\\|\/|data:)/i;
const plano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

export class ErroDePedidos extends Error {
  constructor({ onde, valor, aceito }) {
    super(`pedidos da pessoa: ${onde} recebeu ${JSON.stringify(valor)}; aceito: ${aceito}`);
    this.name = 'ErroDePedidos';
    this.onde = onde;
    this.valor = valor;
    this.aceito = aceito;
  }
}
const recusar = (onde, valor, aceito) => { throw new ErroDePedidos({ onde, valor, aceito }); };

/* Um pedido: { texto, etapa, regra, ondeMora }. `etapa` é o nome da etapa como o plano da peça a chama (um número ou uma palavra,
   sempre guardada como texto); `regra` é o id da regra que faltou; `ondeMora` é o arquivo do repositório (e, depois de "#", o id) em
   que a regra passou a morar. */
export function lerPedido(p, onde = 'pedido') {
  if (!plano(p)) recusar(onde, p, 'objeto { "texto", "etapa", "regra", "ondeMora" }');
  for (const chave of Object.keys(p)) if (!['texto', 'etapa', 'regra', 'ondeMora'].includes(chave)) recusar(`${onde}.${chave}`, p[chave], 'campo conhecido: texto, etapa, regra, ondeMora');
  if (typeof p.texto !== 'string' || p.texto.trim() === '') recusar(`${onde}.texto`, p.texto, 'o pedido da pessoa, em uma frase');
  const texto = p.texto.trim().replace(/\s+/g, ' ');
  if (texto.length > LIMITE_DO_PEDIDO) recusar(`${onde}.texto`, `${texto.slice(0, 40)}... (${texto.length} caracteres)`, `pedido de no máximo ${LIMITE_DO_PEDIDO} caracteres`);
  const etapa = typeof p.etapa === 'number' && Number.isInteger(p.etapa) && p.etapa > 0 ? String(p.etapa) : p.etapa;
  if (typeof etapa !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9-]*$/.test(etapa)) recusar(`${onde}.etapa`, p.etapa, 'etapa como número inteiro positivo ou palavra sem espaço ("3", "rodas")');
  if (typeof p.regra !== 'string' || !NOME.test(p.regra)) recusar(`${onde}.regra`, p.regra, 'id da regra que faltou, em minúsculas e com hífen');
  if (typeof p.ondeMora !== 'string' || p.ondeMora.trim() === '' || ABSOLUTO.test(p.ondeMora.trim()) || /\s/.test(p.ondeMora.trim())) {
    recusar(`${onde}.ondeMora`, p.ondeMora, 'caminho relativo ao repositório onde a regra passou a morar, sem espaço (e, depois de "#", o id da regra)');
  }
  return Object.freeze({ texto, etapa, regra: p.regra, ondeMora: p.ondeMora.trim() });
}

/* O arquivo de pedidos de uma peça: { formato, peca, pedidos: [...] }, sem repetir o mesmo texto na mesma etapa. */
export function lerPedidos(bruto) {
  if (!plano(bruto)) recusar('pedidos', bruto, 'objeto { "formato", "peca", "pedidos" }');
  for (const chave of Object.keys(bruto)) if (!['formato', 'peca', 'pedidos'].includes(chave)) recusar(chave, bruto[chave], 'campo conhecido: formato, peca, pedidos');
  if (bruto.formato !== FORMATO_PEDIDOS) recusar('formato', bruto.formato, `"${FORMATO_PEDIDOS}"`);
  if (typeof bruto.peca !== 'string' || bruto.peca.trim() === '') recusar('peca', bruto.peca, 'nome da peça');
  if (!Array.isArray(bruto.pedidos)) recusar('pedidos', bruto.pedidos, 'lista de pedidos (pode ser vazia)');
  const vistos = new Set();
  const pedidos = bruto.pedidos.map((p, i) => {
    const lido = lerPedido(p, `pedidos[${i}]`);
    const chave = `${lido.etapa}\u0000${lido.texto}`;
    if (vistos.has(chave)) recusar(`pedidos[${i}].texto`, lido.texto, 'pedido que ainda não foi registrado nesta etapa');
    vistos.add(chave);
    return lido;
  });
  return Object.freeze({ formato: FORMATO_PEDIDOS, peca: bruto.peca.trim(), pedidos: Object.freeze(pedidos) });
}

const porEtapa = (a, b) => {
  const x = Number(a); const y = Number(b);
  if (Number.isFinite(x) && Number.isFinite(y)) return x - y;
  if (Number.isFinite(x)) return -1;
  if (Number.isFinite(y)) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
};

/* A contagem: { total, porEtapa: { [etapa]: n }, porRegra: { [regra]: n } }, as etapas em ordem (números primeiro). */
export function contarPedidos(pedidos) {
  const etapas = {};
  const regras = {};
  for (const p of pedidos) {
    etapas[p.etapa] = (etapas[p.etapa] ?? 0) + 1;
    regras[p.regra] = (regras[p.regra] ?? 0) + 1;
  }
  const ordenado = (o, cmp) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => cmp(a, b)));
  return { total: pedidos.length, porEtapa: ordenado(etapas, porEtapa), porRegra: ordenado(regras, (a, b) => (a < b ? -1 : a > b ? 1 : 0)) };
}
