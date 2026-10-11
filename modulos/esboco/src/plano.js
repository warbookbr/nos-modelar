/* O `plano` estruturado do esboço: nível de detalhe, medidas nomeadas conferidas contra o esboço e contrato de relações
   (o que deve tocar, o que deve ficar livre, o que deve ser simétrico). O campo `plano` continua podendo ser só um texto
   (o "Pare e planeje" copiado para o manifesto, ignorado no desenho); como objeto ele tem `texto`, `nivel`, `medidas` e
   `contrato`. O módulo não conhece o assunto do esboço: uma medida é um número, uma unidade, uma origem e a expressão
   que o mede (a caixa que envolve as formas em um eixo, ou a distância entre dois pontos), e o contrato fala de ids. Uma medida
   também pode ser a razão entre duas dessas expressões, com a faixa em que a razão vale (`mede: { razao: [A, B], faixa: [min,
   max] }`), para a proporção que a ficha ou a foto dão sem dar o tamanho.
   Puro: não lê nem grava arquivo. */
import { ancorasDe, ErroDeEsboco, resolverOpcao } from './index.js';
import { agruparPontos, lerContato, medirPar, padroesDoContato, pecasDe, pontosDeContato, unidadesDeclaradas } from './contato.js';
import { quisDizer } from './parecido.js';
import { conferirReferencia, exigirVista } from './referencia.js';

export const NIVEIS = ['esquematico', 'medio', 'detalhado'];
export const ORIGENS = ['ficha', 'foto', 'ia', 'referencia'];
export const UNIDADES = { mm: 1, cm: 10, m: 1000 };
export const MEDIDAS_TOTAIS = { alturaTotal: 'y', larguraTotal: 'x', profundidadeTotal: 'z' };
const EIXOS = ['x', 'y', 'z'];
const CHAVES_DO_PLANO = ['texto', 'nivel', 'medidas', 'contrato', 'referencia', 'envelope', 'pecas'];
const CHAVES_DA_PECA = ['nome', 'formas', 'obrigatoria', 'opcoes'];
const EXEMPLO_DA_PECA = '{ "nome": "para-lama traseiro", "formas": ["paralamaT*"], "obrigatoria": true }';
const CHAVES_DA_REFERENCIA = ['arquivo', 'vista', 'tolerancia', 'iou_min', 'partes', 'opcoes', 'ancoras', 'recorte', 'limiar'];
const CHAVES_DA_MEDIDA = ['nome', 'valor', 'unidade', 'origem', 'tolerancia', 'mede', 'opcoes'];
const CHAVES_DO_CONTRATO = ['tocam', 'livres', 'simetricas', 'fixa'];
const CHAVES_DA_FIXA = ['a', 'b', 'pontos', 'peca', 'em'];
const EXEMPLO_DA_FIXA = '{ "a": "motor", "b": "quadro*", "pontos": 2 }';
export const PONTOS_PADRAO_DA_FIXA = 2;
const CHAVES_DA_SIMETRIA = ['a', 'b', 'eixo', 'pos', 'tolerancia'];
/* Abaixo disto a cópia de um espelho já não conta como deslocada (mm). */
export const RUIDO_DA_SIMETRIA = 0.05;
const TOLERANCIA_DA_SIMETRIA = 1;

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const r1 = (x) => Math.round(x * 10) / 10;
const mm1 = (x) => r1(x).toString().replace('.', ',');
const sinal = (x) => `${x >= 0 ? '+' : '-'}${mm1(Math.abs(x))}`;
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const num4 = (x) => r4(x).toString().replace('.', ',');

const EXEMPLO_DA_MEDIDA = '{ "nome": "alturaTotal", "valor": 1100, "unidade": "mm", "origem": "ficha", "tolerancia": 20, "mede": "alturaTotal" }';

/* Campos exatos de um objeto, com "quis dizer" para o nome parecido. */
function campos(o, validos, onde) {
  for (const k of Object.keys(o)) exigir(validos.includes(k), `${onde}: o campo "${k}" não existe${quisDizer(k, validos)}; campos válidos: ${validos.join(', ')}`);
}

const EXEMPLO_DA_RAZAO = '{ "nome": "alturaPeloComprimento", "origem": "ficha", "mede": { "razao": ["alturaTotal", "profundidadeTotal"], "faixa": [0.30, 0.40] } }';

/* A expressão de medida lida e validada. Uma razão é [A, B] de duas expressões em milímetro (a caixa de um eixo ou a distância),
   com a `faixa` em que A/B vale; `dentroDeRazao` recusa uma razão dentro de outra. */
export function lerMede(m, onde, { dentroDeRazao = false } = {}) {
  const validos = Object.keys(MEDIDAS_TOTAIS);
  if (typeof m === 'string') {
    exigir(validos.includes(m), `${onde}: "mede" com o valor "${m}" não é uma expressão de medida${quisDizer(m, validos)}; valores válidos: ${validos.map((v) => `"${v}"`).join(', ')}, { "caixa": "y", "formas": ["id", "padrão.*"] } (a caixa que envolve as formas no eixo), { "distancia": [A, B], "eixo": "z" } (a distância entre dois pontos, no eixo ou em linha reta) ou { "razao": [A, B], "faixa": [min, max] } (a razão entre duas dessas medidas)`);
    return { caixa: MEDIDAS_TOTAIS[m] };
  }
  exigir(objeto(m), `${onde}: "mede" deve ser ${validos.map((v) => `"${v}"`).join(', ')}, { "caixa": "y", "formas": [...] }, { "distancia": [A, B], "eixo": "z" } ou { "razao": [A, B], "faixa": [min, max] }`);
  const chaves = Object.keys(m);
  if (m.razao !== undefined) {
    exigir(!dentroDeRazao, `${onde}: uma razão não entra em outra razão; A e B são medidas ("alturaTotal", { "caixa": ... } ou { "distancia": ... })`);
    campos(m, ['razao', 'faixa'], `${onde}: mede`);
    exigir(Array.isArray(m.razao) && m.razao.length === 2, `${onde}: "mede.razao" deve ser [A, B], duas medidas (a razão é A dividido por B). Exemplo: ${EXEMPLO_DA_RAZAO}`);
    const operandos = m.razao.map((q, i) => lerMede(q, `${onde}: mede.razao[${i}]`, { dentroDeRazao: true }));
    exigir(Array.isArray(m.faixa) && m.faixa.length === 2 && m.faixa.every((x) => typeof x === 'number' && Number.isFinite(x)) && m.faixa[0] >= 0 && m.faixa[0] < m.faixa[1], `${onde}: "mede.faixa" deve ser [min, max], dois números com 0 <= min < max (a razão A/B vale dentro dela). Exemplo: ${EXEMPLO_DA_RAZAO}`);
    return { razao: operandos, faixa: [...m.faixa] };
  }
  if (m.caixa !== undefined) {
    campos(m, ['caixa', 'formas'], `${onde}: mede`);
    exigir(EIXOS.includes(m.caixa), `${onde}: "mede.caixa" com o valor ${JSON.stringify(m.caixa)} deve ser um eixo: "x", "y" ou "z"`);
    exigir(m.formas === undefined || (Array.isArray(m.formas) && m.formas.length > 0 && m.formas.every((q) => typeof q === 'string' && q)), `${onde}: "mede.formas" deve ser uma lista de ids ou padrões ("garfoE.*"), ou faltar para medir todas as formas`);
    return { caixa: m.caixa, ...(m.formas ? { formas: m.formas } : {}) };
  }
  if (m.distancia !== undefined) {
    campos(m, ['distancia', 'eixo'], `${onde}: mede`);
    exigir(Array.isArray(m.distancia) && m.distancia.length === 2 && m.distancia.every((q) => typeof q === 'string' || (Array.isArray(q) && q.length === 3 && q.every(Number.isFinite))), `${onde}: "mede.distancia" deve ser [A, B] com cada ponto "<id>.<ancora>", ponto nomeado ou [x, y, z]`);
    exigir(m.eixo === undefined || EIXOS.includes(m.eixo), `${onde}: "mede.eixo" com o valor ${JSON.stringify(m.eixo)} deve ser "x", "y" ou "z" (sem ele a distância é em linha reta)`);
    return { distancia: m.distancia, ...(m.eixo ? { eixo: m.eixo } : {}) };
  }
  throw new ErroDeEsboco(`${onde}: "mede" com o campo "${chaves[0] ?? ''}" não é uma expressão de medida${quisDizer(chaves[0], ['caixa', 'distancia', 'razao'])}; use { "caixa": "y" }, { "distancia": [A, B] } ou { "razao": [A, B], "faixa": [min, max] }`);
}

function lerPar(p, onde) {
  if (Array.isArray(p)) {
    exigir(p.length === 2 && p.every((q) => typeof q === 'string' && q) && p[0] !== p[1], `${onde}: um par do contrato deve ser [idA, idB], dois ids diferentes`);
    return { a: p[0], b: p[1] };
  }
  exigir(objeto(p), `${onde}: um par do contrato deve ser [idA, idB]`);
  return null;
}

/* O `plano` do esboço lido e validado: { texto, nivel, medidas, contrato }, ou null sem plano. Aceita o texto de sempre. */
export function lerPlano(plano) {
  if (plano === undefined || plano === null) return null;
  if (typeof plano === 'string') return { texto: plano, nivel: undefined, medidas: [], contrato: null, referencia: [], estruturado: false };
  exigir(objeto(plano), 'esboço: "plano" deve ser um texto ou um objeto { texto, nivel, medidas, contrato }');
  campos(plano, CHAVES_DO_PLANO, 'esboço: plano');
  exigir(plano.texto === undefined || typeof plano.texto === 'string', 'esboço: "plano.texto" deve ser um texto');
  exigir(plano.nivel === undefined || NIVEIS.includes(plano.nivel), `esboço: "plano.nivel" com o valor ${JSON.stringify(plano.nivel)} deve ser um de ${NIVEIS.join(', ')}${quisDizer(plano.nivel, NIVEIS)}`);
  const medidas = [];
  if (plano.medidas !== undefined) {
    exigir(Array.isArray(plano.medidas), `esboço: "plano.medidas" deve ser uma lista. Exemplo: ${EXEMPLO_DA_MEDIDA}`);
    const nomes = new Set();
    for (const [i, m] of plano.medidas.entries()) {
      const onde = `esboço: plano.medidas[${i}]${objeto(m) && typeof m.nome === 'string' ? ` ("${m.nome}")` : ''}`;
      exigir(objeto(m), `${onde} deve ser um objeto. Exemplo: ${EXEMPLO_DA_MEDIDA}`);
      campos(m, CHAVES_DA_MEDIDA, onde);
      exigir(typeof m.nome === 'string' && m.nome, `${onde}: falta o "nome" (um texto curto que identifica a medida). Exemplo: ${EXEMPLO_DA_MEDIDA}`);
      exigir(!nomes.has(m.nome), `${onde}: o nome "${m.nome}" está repetido`);
      nomes.add(m.nome);
      const ehRazao = objeto(m.mede) && m.mede.razao !== undefined;
      if (ehRazao) {
        exigir(m.valor === undefined && m.unidade === undefined && m.tolerancia === undefined, `${onde}: uma razão não tem "valor", "unidade" nem "tolerancia": quem diz o que vale é a "faixa" de "mede". Exemplo: ${EXEMPLO_DA_RAZAO}`);
      } else {
        exigir(typeof m.valor === 'number' && Number.isFinite(m.valor) && m.valor > 0, `${onde}: "valor" com o valor ${JSON.stringify(m.valor)} deve ser um número positivo`);
        exigir(Object.hasOwn(UNIDADES, m.unidade), `${onde}: "unidade" com o valor ${JSON.stringify(m.unidade)} deve ser uma de ${Object.keys(UNIDADES).join(', ')}${quisDizer(m.unidade, Object.keys(UNIDADES))}`);
      }
      exigir(ORIGENS.includes(m.origem), `${onde}: "origem" com o valor ${JSON.stringify(m.origem)} deve ser uma de ${ORIGENS.join(', ')} (ficha técnica, foto, conhecimento da IA ou medida tirada de um contorno de referência)${quisDizer(m.origem, ORIGENS)}`);
      exigir(m.tolerancia === undefined || (typeof m.tolerancia === 'number' && Number.isFinite(m.tolerancia) && m.tolerancia >= 0), `${onde}: "tolerancia" (em mm) deve ser um número maior ou igual a zero`);
      exigir(m.mede !== undefined, `${onde}: falta "mede", a expressão que mede o esboço (por exemplo "alturaTotal"). Exemplo: ${EXEMPLO_DA_MEDIDA}`);
      exigir(m.opcoes === undefined || (Array.isArray(m.opcoes) && m.opcoes.length > 0 && m.opcoes.every((q) => typeof q === 'string' || Number.isInteger(q))), `${onde}: "opcoes" deve listar títulos ou números (a partir de 1) das opções a que a medida vale`);
      medidas.push({ nome: m.nome, ...(ehRazao ? {} : { valor: m.valor, unidade: m.unidade }), origem: m.origem, ...(m.tolerancia === undefined ? {} : { tolerancia: m.tolerancia }), mede: lerMede(m.mede, onde), ...(m.opcoes ? { opcoes: m.opcoes } : {}) });
    }
  }
  let contrato = null;
  if (plano.contrato !== undefined) {
    exigir(objeto(plano.contrato), 'esboço: "plano.contrato" deve ser { tocam: [[a, b]], livres: [[a, b]], simetricas: [[a, b]], fixa: [{ a, b, pontos }] }');
    campos(plano.contrato, CHAVES_DO_CONTRATO, 'esboço: plano.contrato');
    contrato = { tocam: [], livres: [], simetricas: [], fixa: [] };
    for (const chave of ['tocam', 'livres']) {
      const lista = plano.contrato[chave] ?? [];
      exigir(Array.isArray(lista), `esboço: "plano.contrato.${chave}" deve ser uma lista de pares [idA, idB]`);
      lista.forEach((p, i) => { contrato[chave].push(lerPar(p, `esboço: plano.contrato.${chave}[${i}]`)); });
    }
    const sim = plano.contrato.simetricas ?? [];
    exigir(Array.isArray(sim), 'esboço: "plano.contrato.simetricas" deve ser uma lista de [idA, idB] ou { a, b, eixo, pos, tolerancia }');
    sim.forEach((p, i) => {
      const onde = `esboço: plano.contrato.simetricas[${i}]`;
      const par = lerPar(p, onde);
      if (par) { contrato.simetricas.push(par); return; }
      campos(p, CHAVES_DA_SIMETRIA, onde);
      exigir(typeof p.a === 'string' && p.a && typeof p.b === 'string' && p.b && p.a !== p.b, `${onde}: "a" e "b" devem ser dois ids diferentes`);
      exigir(p.eixo === undefined || EIXOS.includes(p.eixo), `${onde}: "eixo" com o valor ${JSON.stringify(p.eixo)} deve ser "x", "y" ou "z" (o plano de simetria é perpendicular a ele; sem o campo o eixo é o de maior distância entre os centros)`);
      exigir(p.pos === undefined || Number.isFinite(p.pos), `${onde}: "pos" deve ser um número em mm`);
      exigir(p.tolerancia === undefined || (Number.isFinite(p.tolerancia) && p.tolerancia >= 0), `${onde}: "tolerancia" deve ser um número em mm, maior ou igual a zero`);
      contrato.simetricas.push({ a: p.a, b: p.b, ...(p.eixo ? { eixo: p.eixo } : {}), ...(p.pos !== undefined ? { pos: p.pos } : {}), ...(p.tolerancia !== undefined ? { tolerancia: p.tolerancia } : {}) });
    });
    const fixa = plano.contrato.fixa ?? [];
    exigir(Array.isArray(fixa), `esboço: "plano.contrato.fixa" deve ser uma lista de { "a", "b", "pontos" } (a peça, a peça em que ela é presa e o mínimo de pontos de contato distintos). Exemplo: ${EXEMPLO_DA_FIXA}`);
    fixa.forEach((p, i) => {
      const onde = `esboço: plano.contrato.fixa[${i}]`;
      const q = Array.isArray(p) ? { a: p[0], b: p[1], ...(p[2] === undefined ? {} : { pontos: p[2] }) } : p;
      exigir(objeto(q), `${onde} deve ser { "a", "b", "pontos" } ou [a, b, pontos]. Exemplo: ${EXEMPLO_DA_FIXA}`);
      campos(q, CHAVES_DA_FIXA, onde);
      exigir(q.a === undefined || q.peca === undefined, `${onde}: use "a" ou "peca" (são o mesmo campo), não os dois`);
      exigir(q.b === undefined || q.em === undefined, `${onde}: use "b" ou "em" (são o mesmo campo), não os dois`);
      const a = q.a ?? q.peca;
      const b = q.b ?? q.em;
      exigir(typeof a === 'string' && a && typeof b === 'string' && b && a !== b, `${onde}: "a" e "b" devem ser dois ids diferentes (uma forma, uma instância, um padrão como "quadro*" ou o nome de uma unidade). Exemplo: ${EXEMPLO_DA_FIXA}`);
      const pontos = q.pontos ?? PONTOS_PADRAO_DA_FIXA;
      exigir(Number.isInteger(pontos) && pontos >= 1, `${onde}: "pontos" deve ser um inteiro de 1 ou mais, o mínimo de pontos de contato distintos entre as duas peças (veio ${JSON.stringify(q.pontos)}; padrão ${PONTOS_PADRAO_DA_FIXA})`);
      contrato.fixa.push({ a, b, pontos });
    });
  }
  const referencia = plano.referencia === undefined ? [] : (Array.isArray(plano.referencia) ? plano.referencia : [plano.referencia]).map((r, i) => lerReferencia(r, `esboço: plano.referencia${Array.isArray(plano.referencia) ? `[${i}]` : ''}`));
  const pecas = [];
  if (plano.pecas !== undefined) {
    exigir(Array.isArray(plano.pecas), `esboço: "plano.pecas" deve ser a lista das partes que o objeto precisa ter. Exemplo: ${EXEMPLO_DA_PECA}`);
    const nomes = new Set();
    for (const [i, p] of plano.pecas.entries()) {
      const onde = `esboço: plano.pecas[${i}]${objeto(p) && typeof p.nome === 'string' ? ` ("${p.nome}")` : ''}`;
      exigir(objeto(p), `${onde} deve ser um objeto. Exemplo: ${EXEMPLO_DA_PECA}`);
      campos(p, CHAVES_DA_PECA, onde);
      exigir(typeof p.nome === 'string' && p.nome, `${onde}: falta o "nome" da parte. Exemplo: ${EXEMPLO_DA_PECA}`);
      exigir(!nomes.has(p.nome), `${onde}: o nome "${p.nome}" está repetido`);
      nomes.add(p.nome);
      exigir(Array.isArray(p.formas) && p.formas.length > 0 && p.formas.every((q) => typeof q === 'string' && q), `${onde}: "formas" deve listar os ids, padrões ("paralamaT*") ou instâncias que fazem a parte. Exemplo: ${EXEMPLO_DA_PECA}`);
      exigir(p.obrigatoria === undefined || typeof p.obrigatoria === 'boolean', `${onde}: "obrigatoria" deve ser true ou false (veio ${JSON.stringify(p.obrigatoria)})`);
      exigir(p.opcoes === undefined || (Array.isArray(p.opcoes) && p.opcoes.length > 0 && p.opcoes.every((q) => typeof q === 'string' || Number.isInteger(q))), `${onde}: "opcoes" deve listar títulos ou números (a partir de 1) das opções a que a parte vale`);
      pecas.push({ nome: p.nome, formas: p.formas, obrigatoria: p.obrigatoria === true, ...(p.opcoes ? { opcoes: p.opcoes } : {}) });
    }
  }
  let envelope;
  if (plano.envelope !== undefined) {
    exigir(objeto(plano.envelope), 'esboço: "plano.envelope" deve ser um objeto { tolerancia } (o objeto vazio liga a conferência com a tolerância padrão)');
    campos(plano.envelope, ['tolerancia'], 'esboço: plano.envelope');
    exigir(plano.envelope.tolerancia === undefined || (Number.isFinite(plano.envelope.tolerancia) && plano.envelope.tolerancia >= 0), 'esboço: "plano.envelope.tolerancia" deve ser um número em mm, maior ou igual a zero');
    envelope = { ...(plano.envelope.tolerancia === undefined ? {} : { tolerancia: plano.envelope.tolerancia }) };
  }
  return { texto: plano.texto, nivel: plano.nivel, medidas, contrato, referencia, ...(envelope ? { envelope } : {}), ...(pecas.length ? { pecas } : {}), estruturado: true };
}

const EXEMPLO_DA_REFERENCIA = '{ "arquivo": "referencias/lateral.contornos.json", "vista": "lateral", "tolerancia": 25, "iou_min": 0.85 }';

/* Uma entrada de `plano.referencia`: o arquivo (um JSON de contornos ou uma imagem com `ancoras`), a vista que ele mostra e
   os limites da conferência. */
function lerReferencia(r, onde) {
  exigir(objeto(r), `${onde} deve ser um objeto. Exemplo: ${EXEMPLO_DA_REFERENCIA}`);
  campos(r, CHAVES_DA_REFERENCIA, onde);
  exigir(typeof r.arquivo === 'string' && r.arquivo, `${onde}: falta o "arquivo" (o caminho do JSON de contornos ou da imagem, relativo ao esboço). Exemplo: ${EXEMPLO_DA_REFERENCIA}`);
  exigir(typeof r.vista === 'string', `${onde}: falta a "vista" que o arquivo mostra (frontal, lateral ou superior). Exemplo: ${EXEMPLO_DA_REFERENCIA}`);
  exigirVista(r.vista, onde);
  exigir(r.tolerancia === undefined || (Number.isFinite(r.tolerancia) && r.tolerancia > 0), `${onde}: "tolerancia" (em mm) deve ser um número maior que zero`);
  exigir(r.iou_min === undefined || (Number.isFinite(r.iou_min) && r.iou_min > 0 && r.iou_min <= 1), `${onde}: "iou_min" deve ser uma fração maior que 0 e no máximo 1, por exemplo 0.85`);
  if (r.partes !== undefined) {
    exigir(objeto(r.partes) && Object.values(r.partes).every((l) => Array.isArray(l) && l.length > 0 && l.every((q) => typeof q === 'string' && q)), `${onde}: "partes" deve ser { "<região do arquivo>": ["id", "padrão.*"] }, cada região com as formas do esboço que a representam`);
  }
  exigir(r.opcoes === undefined || (Array.isArray(r.opcoes) && r.opcoes.length > 0 && r.opcoes.every((q) => typeof q === 'string' || Number.isInteger(q))), `${onde}: "opcoes" deve listar títulos ou números (a partir de 1) das opções a que a referência vale`);
  exigir(r.ancoras === undefined || (typeof r.ancoras === 'string' && r.ancoras), `${onde}: "ancoras" deve ser o caminho do JSON de âncoras (as duas âncoras de pixel para milímetro, o formato de conferir:referencia), só para imagem`);
  exigir(r.recorte === undefined || (Array.isArray(r.recorte) && r.recorte.length === 4 && r.recorte.every(Number.isFinite)), `${onde}: "recorte" deve ser [x0, y0, x1, y1] em pixels`);
  exigir(r.limiar === undefined || Number.isFinite(r.limiar), `${onde}: "limiar" deve ser um número de 0 a 255 (a imagem mais escura que ele é silhueta)`);
  return { arquivo: r.arquivo, vista: r.vista, ...(r.tolerancia === undefined ? {} : { tolerancia: r.tolerancia }), ...(r.iou_min === undefined ? {} : { iou_min: r.iou_min }), ...(r.partes ? { partes: r.partes } : {}), ...(r.opcoes ? { opcoes: r.opcoes } : {}), ...(r.ancoras ? { ancoras: r.ancoras } : {}), ...(r.recorte ? { recorte: r.recorte } : {}), ...(r.limiar === undefined ? {} : { limiar: r.limiar }) };
}

/* Texto do `plano` (o de sempre, ou `plano.texto`), para o manifesto. */
export function textoDoPlano(plano) {
  if (typeof plano === 'string') return plano;
  return objeto(plano) && typeof plano.texto === 'string' ? plano.texto : null;
}

/* As medidas do plano valem para a opção? (`opcoes` opcional: títulos ou números a partir de 1.) */
function valeParaOpcao(m, titulo, indice) {
  return m.opcoes === undefined || m.opcoes.some((q) => q === titulo || q === indice + 1);
}

const casa = (padrao, id) => new RegExp(`^${padrao.split('*').map((t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`).test(id);

/* Formas de `rs` que um id, um padrão ou o id de uma instância de componente designa. */
function selecionar(entrada, rs, onde, brutos) {
  const achadas = rs.filter((r) => (entrada.includes('*') ? casa(entrada, r.id) : (r.id === entrada || brutos.get(r.id)?.daInstancia?.id === entrada)));
  exigir(achadas.length > 0, `${onde}: "${entrada}" não é uma forma visível da opção${quisDizer(entrada, rs.map((r) => r.id))} (ids: ${rs.map((r) => r.id).join(', ')})`);
  return achadas;
}

/* As formas que um lado do `contrato.fixa` designa: um id, um padrão (`quadro*`), uma instância de componente ou o nome de uma unidade.
   Um nome que é ao mesmo tempo o id de uma forma e o nome de uma unidade com outras formas é recusado, com as duas leituras:
   `unidade:<nome>` designa a unidade e `forma:<id>` designa só a forma. */
function selecionarPeca(entrada, rs, onde, brutos, unidadeDe) {
  const porUnidade = (nome) => rs.filter((r) => unidadeDe.get(r.id) === nome);
  const porForma = (q) => rs.filter((r) => (q.includes('*') ? casa(q, r.id) : (r.id === q || brutos.get(r.id)?.daInstancia?.id === q)));
  const nomes = [...new Set(unidadeDe.values())];
  if (entrada.startsWith('unidade:')) {
    const nome = entrada.slice('unidade:'.length);
    const formas = porUnidade(nome);
    exigir(formas.length > 0, `${onde}.fixa: "${entrada}" não é uma unidade visível da opção${quisDizer(nome, nomes)} (unidades: ${nomes.join(', ') || 'nenhuma'})`);
    return formas;
  }
  if (entrada.startsWith('forma:')) return selecionar(entrada.slice('forma:'.length), rs, `${onde}.fixa`, brutos);
  const formas = porForma(entrada);
  const daUnidade = entrada.includes('*') ? [] : porUnidade(entrada);
  if (formas.length > 0 && daUnidade.length > 0 && (formas.length !== daUnidade.length || formas.some((r) => !daUnidade.includes(r)))) {
    throw new ErroDeEsboco(`${onde}.fixa: "${entrada}" é o id de uma forma (${formas.map((r) => r.id).join(', ')}) e também o nome de uma unidade (${daUnidade.length} ${daUnidade.length === 1 ? 'forma' : 'formas'}: ${daUnidade.map((r) => r.id).join(', ')}), e as duas leituras dão peças diferentes; escreva "unidade:${entrada}" para a unidade inteira ou "forma:${entrada}" para só a forma`);
  }
  if (formas.length > 0) return formas;
  exigir(daUnidade.length > 0, `${onde}.fixa: "${entrada}" não é uma forma nem uma unidade visível da opção${quisDizer(entrada, [...rs.map((r) => r.id), ...nomes])} (ids: ${rs.map((r) => r.id).join(', ')}; unidades: ${nomes.join(', ') || 'nenhuma'})`);
  return daUnidade;
}

/* O id de uma forma visível: o id exato, ou o da forma principal de uma instância de componente. */
function idDaForma(entrada, rs, onde, brutos) {
  const exata = rs.find((r) => r.id === entrada);
  if (exata) return exata;
  const principal = rs.find((r) => brutos.get(r.id)?.daInstancia?.id === entrada && brutos.get(r.id).daInstancia.principal);
  exigir(principal, `${onde}: "${entrada}" não é uma forma visível da opção${quisDizer(entrada, rs.map((r) => r.id))} (ids: ${rs.map((r) => r.id).join(', ')})`);
  return principal;
}

function pontoDaMedida(ref, rs, pontos, onde) {
  if (Array.isArray(ref)) return ref;
  if (Object.hasOwn(pontos, ref)) return pontos[ref];
  const i = ref.lastIndexOf('.');
  exigir(i > 0, `${onde}: "${ref}" não é um ponto nomeado${quisDizer(ref, Object.keys(pontos))} nem "<id>.<ancora>" (pontos nomeados: ${Object.keys(pontos).join(', ') || 'nenhum'})`);
  const forma = rs.find((r) => r.id === ref.slice(0, i));
  exigir(forma, `${onde}: "${ref}" aponta para a forma "${ref.slice(0, i)}", que não é visível na opção${quisDizer(ref.slice(0, i), rs.map((r) => r.id))} (ids: ${rs.map((r) => r.id).join(', ')})`);
  const ancoras = ancorasDe(forma);
  exigir(Object.hasOwn(ancoras, ref.slice(i + 1)), `${onde}: a forma "${forma.id}" não tem a âncora "${ref.slice(i + 1)}"${quisDizer(ref.slice(i + 1), Object.keys(ancoras))} (âncoras: ${Object.keys(ancoras).join(', ')})`);
  return ancoras[ref.slice(i + 1)];
}

/* Mede `mede` no esboço da opção: { mm, pecas }. */
function medir(mede, rs, pontos, onde, brutos) {
  if (mede.caixa !== undefined) {
    const k = EIXOS.indexOf(mede.caixa);
    const sel = mede.formas ? [...new Set(mede.formas.flatMap((q) => selecionar(q, rs, onde, brutos)))] : rs;
    return { mm: Math.max(...sel.map((r) => r.max[k])) - Math.min(...sel.map((r) => r.min[k])), pecas: mede.formas ? sel.map((r) => r.id) : [] };
  }
  const [a, b] = mede.distancia.map((q) => pontoDaMedida(q, rs, pontos, onde));
  const d = mede.eixo ? Math.abs(b[EIXOS.indexOf(mede.eixo)] - a[EIXOS.indexOf(mede.eixo)]) : Math.hypot(...b.map((x, i) => x - a[i]));
  const dono = (q) => (typeof q === 'string' && q.includes('.') && !Object.hasOwn(pontos, q) ? rs.find((r) => r.id === q.slice(0, q.lastIndexOf('.')))?.id : undefined);
  return { mm: d, pecas: mede.distancia.map(dono).filter(Boolean) };
}

/* A medida lida do plano com os pontos "<instancia>.<ancora>" trocados pelos da forma real da opção. `bruta` é a medida que
   `expandirEsboco` guarda em `opcoes[i].medidas[k]`; vale o ponto dela na distância e nas distâncias dentro de uma razão. */
export function comPontosReais(m, bruta) {
  const mede = m.mede;
  const bruto = bruta?.mede;
  if (mede.distancia && bruto?.distancia) return { ...m, mede: { ...mede, distancia: bruto.distancia } };
  if (mede.razao && Array.isArray(bruto?.razao)) {
    return { ...m, mede: { ...mede, razao: mede.razao.map((q, j) => (q.distancia && bruto.razao[j]?.distancia ? { ...q, distancia: bruto.razao[j].distancia } : q)) } };
  }
  return m;
}

/* Mede uma razão A/B: { razao, a, b, pecas }, com `a` e `b` como `medir` os devolve. */
function medirRazao(mede, rs, pontos, onde, brutos) {
  const [a, b] = mede.razao.map((q) => medir(q, rs, pontos, onde, brutos));
  exigir(b.mm > 0, `${onde}: o denominador da razão mede 0 mm, e a razão não existe`);
  return { razao: a.mm / b.mm, a, b, pecas: [...new Set([...a.pecas, ...b.pecas])] };
}

/* Assimetria de um par em relação a um plano de simetria: o maior entre o desvio do centro da cópia refletida e a
   diferença de extensão nos três eixos (mm). Sem `eixo`, o eixo é o de maior distância entre os centros, e sem `pos` o
   plano passa no ponto médio dos centros. */
export function assimetriaDoPar(a, b, eixo, pos) {
  const k = eixo !== undefined ? EIXOS.indexOf(eixo) : [0, 1, 2].reduce((m, i) => (Math.abs(a.centro[i] - b.centro[i]) > Math.abs(a.centro[m] - b.centro[m]) ? i : m), 0);
  const p = pos ?? (a.centro[k] + b.centro[k]) / 2;
  const refletido = a.centro.map((c, i) => (i === k ? 2 * p - c : c));
  const desvio = Math.hypot(...refletido.map((c, i) => c - b.centro[i]));
  const ea = a.max.map((v, i) => v - a.min[i]);
  const eb = b.max.map((v, i) => v - b.min[i]);
  const extensao = Math.max(...ea.map((v, i) => Math.abs(v - eb[i])));
  return { eixo: EIXOS[k], pos: p, mm: Math.max(desvio, extensao) };
}

/* Confere o plano contra o esboço já expandido. `visiveis` são as formas resolvidas e visíveis de cada opção. Devolve
   { nivel, opcoes: [{ titulo, medidas, contrato }], achados, resumo }. Cada achado traz `tipo` (`medida-fora`,
   `contrato-toca`, `contrato-livre`, `assimetria`), `opcao`, `pecas` e `texto`. Sem plano estruturado só confere os espelhos
   deslocados. `medidasLidas` (opcional) traz, por opção (na ordem) e por nome de medida, o valor que outra leitura deu
   (`{ exato_mm, formas }`, o da blocagem do nível zero, que o Condutor recebe de fora): a medida lida assim usa esse valor no
   lugar da conta sobre as formas do esboço, com a mesma tolerância e o mesmo arredondamento; a que ficou sem leitura é medida
   no esboço como antes. */
export function conferirPlano(esboco, visiveis, { referencias, unidades, medidasLidas } = {}) {
  const lido = lerPlano(esboco?.plano);
  const opcoes = Array.isArray(esboco?.opcoes) ? esboco.opcoes : [];
  const raiz = lerContato(esboco?.contato, 'esboço');
  const achados = [];
  const porOpcao = [];
  const padrao = padroesDoContato(visiveis);
  opcoes.forEach((o, i) => {
    const titulo = o.titulo ?? `Opção ${i + 1}`;
    const rs = visiveis[i] ?? [];
    const daOpcao = lerContato(o.contato, `opção ${i + 1}`);
    const tol = daOpcao?.tolerancia ?? raiz?.tolerancia ?? padrao.padraoTol;
    const pontos = { ...(esboco.pontos ?? {}), ...(o.pontos ?? {}) };
    /* a forma resolvida de uma cópia de espelho não guarda `daInstancia` nem `desloca`: vêm do JSON da opção */
    const brutos = new Map((o.formas ?? []).filter((f) => f && typeof f.id === 'string').map((f) => [f.id, f]));
    /* a unidade de cada forma: a planejada (o Condutor) e, por cima, a declarada na forma, na instância ou herdada do espelho */
    const unidadeDe = new Map([...(unidades instanceof Map ? unidades : Object.entries(unidades ?? {})), ...unidadesDeclaradas(o.formas)]);
    const medidas = [];
    const contrato = [];
    const novo = (a) => { achados.push({ opcao: titulo, ...a }); };
    for (const [k, m0] of (lido?.medidas ?? []).entries()) {
      /* `o.medidas` traz os pontos "<instancia>.<ancora>" já reescritos para as formas reais desta opção */
      const m = comPontosReais(m0, o.medidas?.[k]);
      if (!valeParaOpcao(m, titulo, i)) continue;
      const onde = `opção ${i + 1} (${titulo}): plano.medidas "${m.nome}"`;
      const lida = medidasLidas?.[i]?.[m.nome];
      if (m.mede.razao) {
        const [min, max] = m.mede.faixa;
        const lidaRazao = lida?.tipo === 'razao' ? lida : null;
        const r = lidaRazao ? { razao: lidaRazao.exato, a: { mm: lidaRazao.a_mm }, b: { mm: lidaRazao.b_mm }, pecas: lidaRazao.formas ?? [] } : medirRazao(m.mede, rs, pontos, onde, brutos);
        const ok = r.razao >= min - 1e-9 && r.razao <= max + 1e-9;
        const desvio = r.razao < min ? r.razao - min : r.razao > max ? r.razao - max : 0;
        medidas.push({ nome: m.nome, origem: m.origem, tipo: 'razao', faixa: [min, max], medido: r4(r.razao), desvio: r4(desvio), a_mm: r1(r.a.mm), b_mm: r1(r.b.mm), ok, ...(lidaRazao ? { fonte: 'blocagem' } : {}) });
        if (!ok) novo({ tipo: 'medida-fora', nome: m.nome, pecas: r.pecas, mm: 0, desvio: r4(desvio), texto: `razão "${m.nome}" fora da faixa: ${lidaRazao ? 'a blocagem do andaime mede' : 'o esboço mede'} ${num4(r.razao)} (${mm1(r.a.mm)} mm sobre ${mm1(r.b.mm)} mm) e o plano declara de ${num4(min)} a ${num4(max)} (origem: ${m.origem}), ${r.razao < min ? 'abaixo' : 'acima'} da faixa por ${num4(Math.abs(desvio))}` });
        continue;
      }
      const { mm, pecas } = lida ? { mm: lida.exato_mm, pecas: lida.formas ?? [] } : medir(m.mede, rs, pontos, onde, brutos);
      const esperado = m.valor * UNIDADES[m.unidade];
      const tolerancia = m.tolerancia ?? Math.max(1, esperado * 0.02);
      const desvio = mm - esperado;
      const ok = Math.abs(desvio) <= tolerancia + 1e-9;
      medidas.push({ nome: m.nome, origem: m.origem, esperado_mm: r1(esperado), medido_mm: r1(mm), desvio_mm: r1(desvio), tolerancia_mm: r1(tolerancia), ok, ...(lida ? { fonte: 'blocagem' } : {}) });
      if (!ok) novo({ tipo: 'medida-fora', nome: m.nome, pecas, mm: r1(Math.abs(desvio)), desvio_mm: r1(desvio), texto: `medida "${m.nome}" fora da tolerância: ${lida ? 'a blocagem do andaime mede' : 'o esboço mede'} ${mm1(mm)} mm e o plano declara ${mm1(esperado)} mm (origem: ${m.origem}), desvio de ${sinal(desvio)} mm com tolerância de ${mm1(tolerancia)} mm` });
    }
    /* o inventário de partes: a obrigatória sem nenhuma forma correspondente (id, padrão ou instância) */
    for (const p of lido?.pecas ?? []) {
      if (!p.obrigatoria || !valeParaOpcao(p, titulo, i)) continue;
      const casam = rs.some((r) => p.formas.some((q) => (q.includes('*') ? casa(q, r.id) : (r.id === q || brutos.get(r.id)?.daInstancia?.id === q))));
      if (!casam) novo({ tipo: 'peca-ausente', nome: p.nome, pecas: [], mm: 0, texto: `a peça obrigatória "${p.nome}" não tem nenhuma forma no esboço (esperava ${p.formas.map((q) => `"${q}"`).join(' ou ')}): modele a parte ou tire-a de plano.pecas se o objeto não a tem` });
    }
    if (lido?.contrato) {
      const c = lido.contrato;
      const ondeC = `opção ${i + 1} (${titulo}): plano.contrato`;
      for (const p of c.tocam) {
        const a = idDaForma(p.a, rs, ondeC, brutos); const b = idDaForma(p.b, rs, ondeC, brutos);
        const { folga } = medirPar(pecasDe(a), pecasDe(b));
        const ok = folga <= tol;
        contrato.push({ relacao: 'toca', a: a.id, b: b.id, ok, folga_mm: r1(folga) });
        if (!ok) novo({ tipo: 'contrato-toca', pecas: [a.id, b.id], mm: r1(folga), texto: `${a.id} e ${b.id} deviam tocar (contrato) e há ${mm1(folga)} mm de folga` });
      }
      for (const p of c.livres) {
        const a = idDaForma(p.a, rs, ondeC, brutos); const b = idDaForma(p.b, rs, ondeC, brutos);
        const { folga } = medirPar(pecasDe(a), pecasDe(b));
        const ok = folga > tol;
        contrato.push({ relacao: 'livre', a: a.id, b: b.id, ok, folga_mm: r1(folga) });
        if (!ok) novo({ tipo: 'contrato-livre', pecas: [a.id, b.id], mm: r1(folga), texto: `${a.id} e ${b.id} deviam ficar livres (contrato) e se tocam (folga de ${mm1(folga)} mm, tolerância de ${mm1(tol)} mm)` });
      }
      for (const p of c.fixa) {
        const A = selecionarPeca(p.a, rs, ondeC, brutos, unidadeDe);
        const B = selecionarPeca(p.b, rs, ondeC, brutos, unidadeDe);
        const achados = [];
        for (const a of A) for (const b of B) {
          if (a.id === b.id) continue;
          for (const { ponto } of pontosDeContato(pecasDe(a), pecasDe(b), tol)) achados.push({ ponto, a: a.id, b: b.id });
        }
        const grupos = agruparPontos(achados.map((x) => x.ponto), tol);
        const ok = grupos.length >= p.pontos;
        const dosGrupos = grupos.map((g) => ({ ponto: g.ponto.map(r1), a: achados[g.itens[0]].a, b: achados[g.itens[0]].b }));
        contrato.push({ relacao: 'fixa', a: p.a, b: p.b, ok, pontos: grupos.length, pedidos: p.pontos, locais: dosGrupos.map((g) => ({ ponto: g.ponto, pecas: [g.a, g.b] })) });
        if (!ok) {
          const quais = dosGrupos.slice(0, 6).map((g) => `[${g.ponto.map(mm1).join(' ')}] (${g.a} e ${g.b})`).join('; ');
          const envolvidas = [...new Set(dosGrupos.flatMap((g) => [g.a, g.b]))];
          const pecas = (envolvidas.length > 0 ? envolvidas : [...A.slice(0, 4), ...B.slice(0, 4)].map((r) => r.id)).slice(0, 8);
          novo({ tipo: 'contrato-fixa', pecas, mm: p.pontos - grupos.length, texto: `${p.a} e ${p.b} deviam estar presos por pelo menos ${p.pontos} ${p.pontos === 1 ? 'ponto' : 'pontos'} de contato distintos (contrato; distintos são os separados por mais de ${mm1(tol)} mm) e o esboço achou ${grupos.length} ${grupos.length === 1 ? 'ponto' : 'pontos'}${grupos.length === 0 ? ': as duas peças não se tocam' : `: ${quais}`}; apoie a peça em mais ${p.pontos - grupos.length === 1 ? 'um lugar' : `${p.pontos - grupos.length} lugares`} da outra, ou baixe "pontos" se a ligação é de um ponto só` });
        }
      }
      for (const p of c.simetricas) {
        const a = idDaForma(p.a, rs, ondeC, brutos); const b = idDaForma(p.b, rs, ondeC, brutos);
        const s = assimetriaDoPar(a, b, p.eixo, p.pos);
        const limite = p.tolerancia ?? TOLERANCIA_DA_SIMETRIA;
        const ok = s.mm <= limite + 1e-9;
        contrato.push({ relacao: 'simetrica', a: a.id, b: b.id, ok, assimetria_mm: r1(s.mm), eixo: s.eixo });
        if (!ok) novo({ tipo: 'assimetria', pecas: [a.id, b.id], mm: r1(s.mm), texto: `${a.id} e ${b.id} deviam ser simétricos no eixo ${s.eixo} (contrato) e a assimetria é de ${mm1(s.mm)} mm, acima de ${mm1(limite)} mm` });
      }
    }
    /* o espelho que foi deslocado depois de refletir deixa de ser simétrico */
    for (const r of rs) {
      const bruto = brutos.get(r.id);
      const e = bruto?.espelha;
      if (!e || !Array.isArray(bruto.desloca)) continue;
      const d = Math.hypot(...bruto.desloca);
      if (d <= RUIDO_DA_SIMETRIA) continue;
      if (contrato.some((q) => q.relacao === 'simetrica' && ((q.a === r.id && q.b === e.forma) || (q.b === r.id && q.a === e.forma)))) continue;
      novo({ tipo: 'assimetria', pecas: [e.forma, r.id], mm: r1(d), texto: `${r.id} é o espelho de ${e.forma} no eixo ${e.eixo}, mas foi deslocado ${mm1(d)} mm depois de refletir` });
    }
    /* a silhueta contra a referência, por vista e por parte */
    const conferencias = [];
    for (const entrada of lido?.referencia ?? []) {
      if (!valeParaOpcao(entrada, titulo, i)) continue;
      const ref = referencias?.get(entrada.arquivo);
      if (!ref) {
        novo({ tipo: 'referencia-fora', pecas: [], mm: 0, texto: `a referência "${entrada.arquivo}" (vista ${entrada.vista}) não foi carregada: o esboço a declara em plano.referencia e ninguém a leu (a linha de comando lê o arquivo; pela API, passe { referencias })` });
        continue;
      }
      const c = conferirReferenciaNaOpcao(entrada, ref, esboco, visiveis, i);
      conferencias.push({ arquivo: entrada.arquivo, ...c });
      for (const r of c.resultados.filter((x) => !x.ok)) novo({ tipo: 'referencia-fora', pecas: r.parte === null ? [] : r.formas, mm: r.desvio_mm ?? 0, vista: c.vista, parte: r.parte, texto: r.texto });
    }
    porOpcao.push({ titulo, medidas, contrato, ...(conferencias.length ? { referencia: conferencias } : {}) });
  });
  const totalMedidas = lido?.medidas?.length ?? 0;
  const relacoes = lido?.contrato ? lido.contrato.tocam.length + lido.contrato.livres.length + lido.contrato.simetricas.length + lido.contrato.fixa.length : 0;
  return { nivel: lido?.nivel, opcoes: porOpcao, achados, resumo: { medidas: totalMedidas, relacoes, ...((lido?.referencia?.length ?? 0) > 0 ? { referencias: lido.referencia.length } : {}), ...((lido?.pecas?.length ?? 0) > 0 ? { pecas: lido.pecas.length } : {}) } };
}

/* Confere uma entrada de `plano.referencia` contra a opção `i` do esboço já expandido (`visiveis` são as formas resolvidas e
   visíveis de cada opção). Ver `conferirReferencia`. */
export function conferirReferenciaNaOpcao(entrada, ref, esboco, visiveis, i) {
  const o = esboco.opcoes[i];
  const titulo = o.titulo ?? `Opção ${i + 1}`;
  const rs = visiveis[i] ?? [];
  const brutos = new Map((o.formas ?? []).filter((f) => f && typeof f.id === 'string').map((f) => [f.id, f]));
  const onde = `opção ${i + 1} (${titulo}): plano.referencia "${entrada.arquivo}"`;
  const tentar = (q) => rs.filter((r) => (q.includes('*') ? casa(q, r.id) : (r.id === q || brutos.get(r.id)?.daInstancia?.id === q)));
  return conferirReferencia(entrada, ref, rs, { selecionar: (q) => selecionar(q, rs, onde, brutos), tentar });
}

/* Formas resolvidas e visíveis de cada opção do esboço já expandido. */
export function visiveisDoEsboco(esboco) {
  return (Array.isArray(esboco?.opcoes) ? esboco.opcoes : []).map((o, i) => resolverOpcao(o, `opção ${i + 1}${o.titulo ? ` (${o.titulo})` : ''}`, esboco?.pontos).filter((r) => r.forma.oculto !== true));
}
