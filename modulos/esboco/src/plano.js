/* O `plano` estruturado do esboço: nível de detalhe, medidas nomeadas conferidas contra o esboço e contrato de relações
   (o que deve tocar, o que deve ficar livre, o que deve ser simétrico). O campo `plano` continua podendo ser só um texto
   (o "Pare e planeje" copiado para o manifesto, ignorado no desenho); como objeto ele tem `texto`, `nivel`, `medidas` e
   `contrato`. O módulo não conhece o assunto do esboço: uma medida é um número, uma unidade, uma origem e a expressão
   que o mede (a caixa que envolve as formas em um eixo, ou a distância entre dois pontos), e o contrato fala de ids.
   Puro: não lê nem grava arquivo. */
import { ancorasDe, ErroDeEsboco, resolverOpcao } from './index.js';
import { lerContato, medirPar, padroesDoContato, pecasDe } from './contato.js';
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
const CHAVES_DO_CONTRATO = ['tocam', 'livres', 'simetricas'];
const CHAVES_DA_SIMETRIA = ['a', 'b', 'eixo', 'pos', 'tolerancia'];
/* Abaixo disto a cópia de um espelho já não conta como deslocada (mm). */
export const RUIDO_DA_SIMETRIA = 0.05;
const TOLERANCIA_DA_SIMETRIA = 1;

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const r1 = (x) => Math.round(x * 10) / 10;
const mm1 = (x) => r1(x).toString().replace('.', ',');
const sinal = (x) => `${x >= 0 ? '+' : '-'}${mm1(Math.abs(x))}`;

const EXEMPLO_DA_MEDIDA = '{ "nome": "alturaTotal", "valor": 1100, "unidade": "mm", "origem": "ficha", "tolerancia": 20, "mede": "alturaTotal" }';

/* Campos exatos de um objeto, com "quis dizer" para o nome parecido. */
function campos(o, validos, onde) {
  for (const k of Object.keys(o)) exigir(validos.includes(k), `${onde}: o campo "${k}" não existe${quisDizer(k, validos)}; campos válidos: ${validos.join(', ')}`);
}

function lerMede(m, onde) {
  const validos = Object.keys(MEDIDAS_TOTAIS);
  if (typeof m === 'string') {
    exigir(validos.includes(m), `${onde}: "mede" com o valor "${m}" não é uma expressão de medida${quisDizer(m, validos)}; valores válidos: ${validos.map((v) => `"${v}"`).join(', ')}, { "caixa": "y", "formas": ["id", "padrão.*"] } (a caixa que envolve as formas no eixo) ou { "distancia": [A, B], "eixo": "z" } (a distância entre dois pontos, no eixo ou em linha reta)`);
    return { caixa: MEDIDAS_TOTAIS[m] };
  }
  exigir(objeto(m), `${onde}: "mede" deve ser ${validos.map((v) => `"${v}"`).join(', ')}, { "caixa": "y", "formas": [...] } ou { "distancia": [A, B], "eixo": "z" }`);
  const chaves = Object.keys(m);
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
  throw new ErroDeEsboco(`${onde}: "mede" com o campo "${chaves[0] ?? ''}" não é uma expressão de medida${quisDizer(chaves[0], ['caixa', 'distancia'])}; use { "caixa": "y" } ou { "distancia": [A, B] }`);
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
      exigir(typeof m.valor === 'number' && Number.isFinite(m.valor) && m.valor > 0, `${onde}: "valor" com o valor ${JSON.stringify(m.valor)} deve ser um número positivo`);
      exigir(Object.hasOwn(UNIDADES, m.unidade), `${onde}: "unidade" com o valor ${JSON.stringify(m.unidade)} deve ser uma de ${Object.keys(UNIDADES).join(', ')}${quisDizer(m.unidade, Object.keys(UNIDADES))}`);
      exigir(ORIGENS.includes(m.origem), `${onde}: "origem" com o valor ${JSON.stringify(m.origem)} deve ser uma de ${ORIGENS.join(', ')} (ficha técnica, foto, conhecimento da IA ou medida tirada de um contorno de referência)${quisDizer(m.origem, ORIGENS)}`);
      exigir(m.tolerancia === undefined || (typeof m.tolerancia === 'number' && Number.isFinite(m.tolerancia) && m.tolerancia >= 0), `${onde}: "tolerancia" (em mm) deve ser um número maior ou igual a zero`);
      exigir(m.mede !== undefined, `${onde}: falta "mede", a expressão que mede o esboço (por exemplo "alturaTotal"). Exemplo: ${EXEMPLO_DA_MEDIDA}`);
      exigir(m.opcoes === undefined || (Array.isArray(m.opcoes) && m.opcoes.length > 0 && m.opcoes.every((q) => typeof q === 'string' || Number.isInteger(q))), `${onde}: "opcoes" deve listar títulos ou números (a partir de 1) das opções a que a medida vale`);
      medidas.push({ nome: m.nome, valor: m.valor, unidade: m.unidade, origem: m.origem, ...(m.tolerancia === undefined ? {} : { tolerancia: m.tolerancia }), mede: lerMede(m.mede, onde), ...(m.opcoes ? { opcoes: m.opcoes } : {}) });
    }
  }
  let contrato = null;
  if (plano.contrato !== undefined) {
    exigir(objeto(plano.contrato), 'esboço: "plano.contrato" deve ser { tocam: [[a, b]], livres: [[a, b]], simetricas: [[a, b]] }');
    campos(plano.contrato, CHAVES_DO_CONTRATO, 'esboço: plano.contrato');
    contrato = { tocam: [], livres: [], simetricas: [] };
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
   deslocados. */
export function conferirPlano(esboco, visiveis, { referencias } = {}) {
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
    const medidas = [];
    const contrato = [];
    const novo = (a) => { achados.push({ opcao: titulo, ...a }); };
    for (const [k, m0] of (lido?.medidas ?? []).entries()) {
      /* `o.medidas` traz os pontos "<instancia>.<ancora>" já reescritos para as formas reais desta opção */
      const reescrita = o.medidas?.[k]?.mede?.distancia;
      const m = reescrita && m0.mede.distancia ? { ...m0, mede: { ...m0.mede, distancia: reescrita } } : m0;
      if (!valeParaOpcao(m, titulo, i)) continue;
      const onde = `opção ${i + 1} (${titulo}): plano.medidas "${m.nome}"`;
      const { mm, pecas } = medir(m.mede, rs, pontos, onde, brutos);
      const esperado = m.valor * UNIDADES[m.unidade];
      const tolerancia = m.tolerancia ?? Math.max(1, esperado * 0.02);
      const desvio = mm - esperado;
      const ok = Math.abs(desvio) <= tolerancia + 1e-9;
      medidas.push({ nome: m.nome, origem: m.origem, esperado_mm: r1(esperado), medido_mm: r1(mm), desvio_mm: r1(desvio), tolerancia_mm: r1(tolerancia), ok });
      if (!ok) novo({ tipo: 'medida-fora', nome: m.nome, pecas, mm: r1(Math.abs(desvio)), desvio_mm: r1(desvio), texto: `medida "${m.nome}" fora da tolerância: o esboço mede ${mm1(mm)} mm e o plano declara ${mm1(esperado)} mm (origem: ${m.origem}), desvio de ${sinal(desvio)} mm com tolerância de ${mm1(tolerancia)} mm` });
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
  const relacoes = lido?.contrato ? lido.contrato.tocam.length + lido.contrato.livres.length + lido.contrato.simetricas.length : 0;
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
