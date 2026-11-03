/* perguntas-do-critico.js — as perguntas de forma que o brief do crítico traz depois das cinco fixas.
 *
 * Há duas fontes. A pergunta de componente mora no componente (o campo `perguntas` do JSON do componente do esboço, ou
 * `perguntas` do `familia.json` na peça) e diz o que olhar naquela parte. A pergunta de família de objeto mora num arquivo de
 * `procedural/criterios/` (assento, veículo, móvel de caixa) e cada uma traz a condição para entrar: o componente ou a forma que
 * precisa existir no objeto. Sem a condição, a pergunta sobre rodas entraria no esboço que ainda não tem rodas.
 *
 * O arquivo de família pode trazer também `regras` de desenho: cada uma é uma frase literal sobre como o objeto é desenhado, com a pergunta do
 * alinhamento, a pergunta de forma que vai ao crítico pelo mesmo caminho das perguntas da família, a condição de existir a parte a que
 * ela se refere, a conferência que a mede (quando há) e a origem. O campo é opcional e aditivo, por isso o formato continua `@1`: todo
 * arquivo antigo é válido e dá o mesmo resultado, e só quem lê `regras` (o alinhamento) vê a diferença. Mudar o sentido de um campo que
 * já existe é que pediria `@2`.
 *
 * O módulo só trata de forma, e só do que as vistas mostram: de que lado, preso a quê, apoiado onde, virado para onde.
 * Proporção vai para o `--medidas`, onde o crítico não precisa julgar um número, e parte que as vistas não mostram recebe "não
 * consigo responder". O validador recusa a pergunta sem palavra de pergunta ou que começa por verbo (a que se responde com sim ou não
 * convida o crítico a confirmar o que leu) e a que fala de proporção. O teto de perguntas por componente e por família existe para o
 * brief não crescer sem limite.
 *
 * Puro: não lê arquivo e não conhece Three.js nem o domínio. */

export const FORMATO_CRITERIOS = 'mecanifica.criterios-do-objeto@1';
export const TETO_POR_COMPONENTE = 4;
export const TETO_POR_FAMILIA = 6;
export const LIMITE_DO_TEXTO = 260;
/* O teto de regras de desenho por família de objeto. As regras entram no brief do crítico só quando a condição vale, mas o catálogo
   também alimenta o alinhamento, e uma lista longa demais deixa de ser lida pela pessoa. */
export const TETO_DE_REGRAS_POR_FAMILIA = 12;
export const LIMITE_DA_REGRA = 200;

/* A pergunta aberta que fecha a lista quando há perguntas específicas. */
export const PERGUNTA_ABERTA = 'O que mais, nas imagens, parece estranho na forma e não foi coberto pelas perguntas acima?';

const PALAVRA_DE_PERGUNTA = /\b(que|qual|quais|onde|como|quantos|quantas|quem)\b/;
const COMECA_COM_VERBO = /^(esta|estao|e|sao|ha|existe|existem|tem|fica|ficam)\b/;
const PROPORCAO = /\b(propor[cç][aã]o|raz[aã]o entre|se compara|compara[cç][aã]o|vezes (maior|menor|mais)|mais (largo|larga|alto|alta|baixo|baixa|estreito|estreita|fino|fina|grosso|grossa|comprido|curto|curta) que|menos (largo|larga|alto|alta|estreito|estreita|fino|fina|grosso|grossa) que)\b/i;
const NOME = /^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/;

export class ErroDePerguntas extends Error {
  constructor({ onde, valor, aceito }) {
    super(`perguntas do crítico: ${onde} recebeu ${JSON.stringify(valor)}; aceito: ${aceito}`);
    this.name = 'ErroDePerguntas';
    this.onde = onde;
    this.valor = valor;
    this.aceito = aceito;
  }
}

const plano = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const recusar = (onde, valor, aceito) => { throw new ErroDePerguntas({ onde, valor, aceito }); };
const semAcento = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/* Uma pergunta de forma, limpa: texto de uma linha, com palavra de pergunta, terminado em `?`, sem tratar de proporção. */
export function lerPergunta(valor, onde) {
  if (typeof valor !== 'string' || valor.trim() === '') recusar(onde, valor, 'texto com a pergunta');
  const texto = valor.trim().replace(/\s+/g, ' ');
  if (texto.length > LIMITE_DO_TEXTO) recusar(onde, `${texto.slice(0, 40)}... (${texto.length} caracteres)`, `pergunta de no máximo ${LIMITE_DO_TEXTO} caracteres`);
  if (!texto.endsWith('?')) recusar(onde, texto, 'pergunta terminada em "?"');
  const inicio = semAcento(texto.toLowerCase());
  if (!PALAVRA_DE_PERGUNTA.test(inicio) || COMECA_COM_VERBO.test(inicio)) {
    recusar(onde, texto, 'pergunta aberta, com uma palavra de pergunta (que, qual, quais, onde, como, quantos) e sem começar por verbo; a que se responde com sim ou não convida o crítico a confirmar o que leu em vez de olhar');
  }
  if (PROPORCAO.test(texto)) recusar(onde, texto, 'pergunta de forma (de que lado, preso a quê, apoiado onde, virado para onde); a proporção entre dimensões vai para o `plano.medidas` e o `--medidas`');
  return texto;
}

/* As perguntas de um componente do esboço (`perguntas` no JSON do componente ou do módulo): lista de uma a `TETO_POR_COMPONENTE`
   perguntas de forma, sem repetir. */
export function lerPerguntasDoComponente(valor, onde) {
  if (!Array.isArray(valor) || valor.length === 0) recusar(onde, valor, 'lista com ao menos uma pergunta');
  if (valor.length > TETO_POR_COMPONENTE) recusar(onde, `${valor.length} perguntas`, `no máximo ${TETO_POR_COMPONENTE} perguntas por componente; corte as que o \`--medidas\` ou as cinco fixas já cobrem, ou as que as vistas não mostram`);
  const vistas = new Set();
  return Object.freeze(valor.map((p, i) => {
    const texto = lerPergunta(p, `${onde}[${i}]`);
    if (vistas.has(texto)) recusar(`${onde}[${i}]`, texto, 'pergunta que ainda não foi feita sobre este componente');
    vistas.add(texto);
    return texto;
  }));
}

/* Padrão com `*` contra um nome, sem distinguir maiúscula nem acento. */
export function casaNome(padrao, nome) {
  const re = new RegExp(`^${semAcento(padrao).split('*').map((t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`, 'i');
  return re.test(semAcento(nome));
}

function lerLista(valor, onde) {
  const itens = typeof valor === 'string' ? [valor] : valor;
  if (!Array.isArray(itens) || itens.length === 0 || !itens.every((x) => typeof x === 'string' && x.trim() !== '' && !/\s/.test(x.trim()))) recusar(onde, valor, 'nome, ou lista de nomes, sem espaço (o nome pode ter "*")');
  return itens.map((x) => x.trim());
}

/* A condição de uma pergunta de família: o componente (nome do componente ou módulo usado no esboço, ou nome de parte do PLANO)
   ou a forma (padrão do id da forma no esboço, ou da parte no PLANO) que precisa existir. Basta uma das duas coisas citadas existir. */
function lerCondicao(valor, onde) {
  if (!plano(valor)) recusar(onde, valor, 'objeto { "componente": [...], "forma": [...] } com ao menos um dos dois');
  for (const chave of Object.keys(valor)) if (!['componente', 'forma'].includes(chave)) recusar(`${onde}.${chave}`, valor[chave], 'campo conhecido: componente, forma');
  if (valor.componente === undefined && valor.forma === undefined) recusar(onde, valor, 'ao menos um de "componente" e "forma": a pergunta só entra quando o objeto tem a parte a que ela se refere');
  return Object.freeze({
    ...(valor.componente === undefined ? {} : { componente: Object.freeze(lerLista(valor.componente, `${onde}.componente`)) }),
    ...(valor.forma === undefined ? {} : { forma: Object.freeze(lerLista(valor.forma, `${onde}.forma`)) }),
  });
}

const ABSOLUTO = /^(?:[a-z]:\\|\\\\|\/|data:)/i;
const CONFERENCIA = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

function lerTextoCurto(valor, onde, aceito, limite = LIMITE_DO_TEXTO) {
  if (typeof valor !== 'string' || valor.trim() === '') recusar(onde, valor, aceito);
  const texto = valor.trim().replace(/\s+/g, ' ');
  if (texto.length > limite) recusar(onde, `${texto.slice(0, 40)}... (${texto.length} caracteres)`, `${aceito}, de no máximo ${limite} caracteres`);
  return texto;
}

/* Uma regra de desenho da família: { id, texto, perguntaDoAlinhamento, perguntaDeForma, condicao, conferencia?, origem }.
   `texto` é a regra em uma frase terminada em ponto; `perguntaDoAlinhamento` é o que se pergunta à pessoa antes de modelar;
   `perguntaDeForma` vai ao crítico e passa pelo mesmo validador das perguntas da família; `conferencia` é o nome da conferência que mede
   a regra, quando existe. */
function lerRegra(r, onde) {
  const id = plano(r) && typeof r.id === 'string' ? r.id : '?';
  const aqui = (campo) => `${onde} ('${id}').${campo}`;
  if (!plano(r)) recusar(onde, r, 'objeto { "id", "texto", "perguntaDoAlinhamento", "perguntaDeForma", "condicao", "origem" } e, se houver, "conferencia"');
  for (const chave of Object.keys(r)) {
    if (!['id', 'texto', 'perguntaDoAlinhamento', 'perguntaDeForma', 'condicao', 'conferencia', 'origem'].includes(chave)) recusar(aqui(chave), r[chave], 'campo conhecido: id, texto, perguntaDoAlinhamento, perguntaDeForma, condicao, conferencia, origem');
  }
  if (typeof r.id !== 'string' || !NOME.test(r.id)) recusar(aqui('id'), r.id, 'id em minúsculas, com hífen entre as palavras');
  const texto = lerTextoCurto(r.texto, aqui('texto'), 'a regra em uma frase', LIMITE_DA_REGRA);
  if (!texto.endsWith('.')) recusar(aqui('texto'), texto, 'a regra em uma frase só, terminada em "."');
  if (/[.;!?]\s+\S/.test(texto)) recusar(aqui('texto'), texto, 'a regra em uma frase só: sem ponto final no meio nem ponto e vírgula');
  const alinhamento = lerTextoCurto(r.perguntaDoAlinhamento, aqui('perguntaDoAlinhamento'), 'a pergunta que se faz à pessoa no alinhamento');
  if (!alinhamento.endsWith('?')) recusar(aqui('perguntaDoAlinhamento'), alinhamento, 'pergunta terminada em "?"');
  const forma = lerPergunta(r.perguntaDeForma, aqui('perguntaDeForma'));
  if (r.condicao === undefined) recusar(aqui('condicao'), undefined, 'o componente ou a forma que precisa existir no objeto para a regra entrar');
  const condicao = lerCondicao(r.condicao, aqui('condicao'));
  if (r.conferencia !== undefined && (typeof r.conferencia !== 'string' || !CONFERENCIA.test(r.conferencia))) recusar(aqui('conferencia'), r.conferencia, 'nome da conferência que mede a regra, em minúsculas e com hífen (ou o campo ausente)');
  const origem = lerTextoCurto(r.origem, aqui('origem'), 'de onde a regra veio (pedido da pessoa, atrito, documento)', LIMITE_DA_REGRA);
  if (ABSOLUTO.test(origem)) recusar(aqui('origem'), origem, 'origem sem caminho absoluto');
  return Object.freeze({
    id: r.id, texto, perguntaDoAlinhamento: alinhamento, perguntaDeForma: forma, condicao,
    ...(r.conferencia === undefined ? {} : { conferencia: r.conferencia }),
    origem,
  });
}

/* O arquivo de critérios de uma família de objeto: { formato, id, cobre, perguntas: [{ texto, condicao }], regras? }, até
   `TETO_POR_FAMILIA` perguntas e `TETO_DE_REGRAS_POR_FAMILIA` regras. `regras` é opcional e o arquivo sem ela continua no formato @1. */
export function lerCriterios(bruto) {
  const id = plano(bruto) && typeof bruto.id === 'string' ? bruto.id : '?';
  const onde = (campo) => `critérios '${id}', ${campo}`;
  if (!plano(bruto)) recusar('critérios', bruto, 'objeto com formato, id, cobre e perguntas');
  for (const chave of Object.keys(bruto)) if (!['formato', 'id', 'cobre', 'perguntas', 'regras'].includes(chave)) recusar(onde(chave), bruto[chave], 'campo conhecido: formato, id, cobre, perguntas, regras');
  if (bruto.formato !== FORMATO_CRITERIOS) recusar(onde('formato'), bruto.formato, `"${FORMATO_CRITERIOS}"`);
  if (typeof bruto.id !== 'string' || !NOME.test(bruto.id)) recusar(onde('id'), bruto.id, 'id em minúsculas, com hífen entre as palavras');
  if (!Array.isArray(bruto.cobre) || bruto.cobre.length === 0 || !bruto.cobre.every((x) => typeof x === 'string' && x.trim() !== '')) recusar(onde('cobre'), bruto.cobre, 'lista dos objetos que a família cobre (cadeira, picape, guarda-roupa...)');
  if (!Array.isArray(bruto.perguntas) || bruto.perguntas.length === 0) recusar(onde('perguntas'), bruto.perguntas, 'lista com ao menos uma pergunta');
  if (bruto.perguntas.length > TETO_POR_FAMILIA) recusar(onde('perguntas'), `${bruto.perguntas.length} perguntas`, `no máximo ${TETO_POR_FAMILIA} perguntas por família de objeto; corte as que o \`--medidas\` ou as cinco fixas já cobrem, ou divida a família`);
  const vistas = new Set();
  const perguntas = bruto.perguntas.map((p, i) => {
    const campo = `perguntas[${i}]`;
    if (!plano(p)) recusar(onde(campo), p, 'objeto { "texto": "...", "condicao": {...} }');
    for (const chave of Object.keys(p)) if (!['texto', 'condicao'].includes(chave)) recusar(onde(`${campo}.${chave}`), p[chave], 'campo conhecido: texto, condicao');
    const texto = lerPergunta(p.texto, onde(`${campo}.texto`));
    if (vistas.has(texto)) recusar(onde(`${campo}.texto`), texto, 'pergunta que ainda não foi feita nesta família');
    vistas.add(texto);
    if (p.condicao === undefined) recusar(onde(`${campo}.condicao`), undefined, 'o componente ou a forma que precisa existir no objeto para a pergunta entrar');
    return Object.freeze({ texto, condicao: lerCondicao(p.condicao, onde(`${campo}.condicao`)) });
  });
  let regras = [];
  if (bruto.regras !== undefined) {
    if (!Array.isArray(bruto.regras) || bruto.regras.length === 0) recusar(onde('regras'), bruto.regras, 'lista com ao menos uma regra (ou o campo ausente)');
    if (bruto.regras.length > TETO_DE_REGRAS_POR_FAMILIA) recusar(onde('regras'), `${bruto.regras.length} regras`, `no máximo ${TETO_DE_REGRAS_POR_FAMILIA} regras por família de objeto; junte as que se medem do mesmo jeito ou divida a família`);
    const ids = new Set();
    const formas = new Set(perguntas.map((p) => p.texto));
    regras = bruto.regras.map((r, i) => {
      const lida = lerRegra(r, onde(`regras[${i}]`));
      if (ids.has(lida.id)) recusar(onde(`regras[${i}].id`), lida.id, 'id que ainda não foi usado nesta família');
      ids.add(lida.id);
      if (formas.has(lida.perguntaDeForma)) recusar(onde(`regras[${i}].perguntaDeForma`), lida.perguntaDeForma, 'pergunta que ainda não foi feita nesta família, nem por outra regra');
      formas.add(lida.perguntaDeForma);
      return lida;
    });
  }
  return Object.freeze({ formato: FORMATO_CRITERIOS, id: bruto.id, cobre: Object.freeze([...bruto.cobre]), perguntas: Object.freeze(perguntas), regras: Object.freeze(regras) });
}

/* A condição vale para o que o objeto tem? `presentes`: { componentes: [nomes], formas: [ids] }. */
export function condicaoVale(condicao, presentes) {
  const componentes = presentes.componentes ?? [];
  const formas = presentes.formas ?? [];
  return (condicao.componente ?? []).some((p) => componentes.some((n) => casaNome(p, n)))
    || (condicao.forma ?? []).some((p) => formas.some((n) => casaNome(p, n)));
}

/* As regras de desenho de uma família cuja condição vale para o que o objeto tem, na ordem do arquivo. `presentes` ausente (o
   alinhamento ainda sem partes) devolve todas. */
export function regrasDaFamilia(criterios, presentes = null) {
  return (criterios.regras ?? []).filter((r) => presentes === null || condicaoVale(r.condicao, presentes));
}

/* As perguntas de uma família de objeto que entram, na ordem em que o arquivo as escreve: as perguntas da família e, depois, a pergunta
   de forma de cada regra de desenho cuja condição vale. */
export function perguntasDaFamiliaDeObjeto(criterios, presentes) {
  return juntarPerguntas(
    criterios.perguntas.filter((p) => condicaoVale(p.condicao, presentes)).map((p) => p.texto),
    regrasDaFamilia(criterios, presentes).map((r) => r.perguntaDeForma),
  );
}

/* Junta as perguntas de componente e de família, sem repetir texto. */
export function juntarPerguntas(...listas) {
  const vistas = new Set();
  const saida = [];
  for (const lista of listas) for (const p of lista) if (!vistas.has(p)) { vistas.add(p); saida.push(p); }
  return saida;
}

/* As linhas numeradas de uma lista de perguntas: as fixas, depois as específicas e, só havendo específicas, a aberta no fim. Sem
   específicas devolve exatamente as linhas que as fixas davam sozinhas. */
export function linhasDasPerguntas(fixas, especificas, recuo = '  ') {
  const todas = especificas.length === 0 ? fixas : [...fixas, ...especificas, PERGUNTA_ABERTA];
  return todas.map((p, i) => `${recuo}${i + 1}. ${p}`);
}

/* As perguntas específicas de uma peça: `perguntasDaFamilia` é o `perguntas` do `familia.json` que gerou a peça (componente ->
   lista, na ordem alfabética que `lerFamilia` devolve) e `criterios` é o arquivo de `PLANO.familia`. Na peça, o "componente" e a
   "forma" da condição são os nomes das partes do `PLANO`. As da família procedural já passaram por `lerFamilia`, que aplica o
   teto por componente; aqui só se junta. */
export function perguntasDaPeca(plano, { criterios = null, perguntasDaFamilia = null } = {}) {
  const componente = juntarPerguntas(...Object.values(perguntasDaFamilia ?? {}));
  const nomes = (plano?.partes ?? []).map((p) => p.nome);
  const familia = criterios === null ? [] : perguntasDaFamiliaDeObjeto(criterios, { componentes: nomes, formas: nomes });
  return { componente, familia, todas: juntarPerguntas(componente, familia) };
}
