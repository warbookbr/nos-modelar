/* Componentes parametrizados: `{ "id": "rodaFrente", "usa": "roda", "parametros": {...}, "centro": [...] }` numa lista
   de formas vira as formas do componente, lidas de `modulos/esboco/componentes/<nome>.json`, antes de qualquer outra
   leitura (o gate, o desenho e a leitura em texto veem só formas simples). O que o componente faz:

   - Os ids das formas ganham o prefixo da instância (`rodaFrente.pneu`), e toda referência interna do componente
     (`sobre`, `ponta`, `encosta`, `alinha`, `centro`, `de`, `para`, `caminho`, `espelha`) é reescrita com o prefixo.
   - Os `parametros` do componente têm valores padrão; a instância sobrepõe com número, nome de parâmetro do esboço ou
     `"=expressão"` do esboço, e o componente os usa nas suas formas com o escopo dele (o nome `diametro` do componente
     não colide com um parâmetro do esboço).
   - As `entradas` do componente (`centro`, `de`, `para`, `desloca`...) entram nas formas pelo texto `"@nome"`. A
     instância as escreve no mesmo nível de `usa`; uma entrada com padrão `null` que a instância não escreve some da
     forma que a usa, e se estiver dentro de uma lista ou de um `entre` a instância é obrigada a escrevê-la.
   - As `ancoras` do componente ficam expostas como `<instancia>.<ancora>` em toda referência de fora (`centro`, `de`,
     `para`, `alinha.com`, `caminho`, `entre`, `ancora`), e também `<instancia>.<parte>` (o centro de qualquer forma do
     componente, inclusive a principal, como `rodaFrente.pneu`); o id da instância sozinho (em `sobre`, `ponta`, `encosta`,
     `alinha` e nos pares do gate) é a forma principal dela. Qualquer âncora da forma principal também vale.
   - Os `pares` do componente (`encosta`, `atravessa` com `max` e `motivo`) entram no `contato.pares` da opção com os ids
     prefixados, a menos que o esboço já declare o mesmo par.
   - `{ "id": "garfoD", "usa": ... }` não existe para a cópia: `{ "id": "garfoD", "espelha": { "forma": "garfoE", "eixo": "x" } }`
     com uma instância em `forma` espelha todas as formas dela.
   - `unidade` na instância (ou no espelho dela) declara a Unidade de detalhe de todas as formas dela; o espelho sem
     `unidade` herda a da fonte.
   - Cada forma sai marcada com `daInstancia: { id, principal }`, que o conserto e o `--ajustar` usam para saber que só a
     principal se move pela edição da instância.

   Puro: não lê arquivo (a biblioteca é importada como dados). */
import { ErroDeEsboco } from './index.js';
import { COMPONENTES } from '../componentes/index.js';

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const clone = (v) => JSON.parse(JSON.stringify(v));
const RESERVADAS = ['id', 'usa', 'parametros', 'cor', 'rotulo', 'oculto', 'opacidade', 'unidade'];
const ANCORAS_DA_FORMA = ['centro', 'inicio', 'fim', '+x', '-x', '+y', '-y', '+z', '-z'];

export const NOMES_DOS_COMPONENTES = Object.keys(COMPONENTES);

/* Componente pelo nome, ou ErroDeEsboco com os nomes válidos. */
export function componente(nome, onde) {
  exigir(typeof nome === 'string' && Object.hasOwn(COMPONENTES, nome), `${onde}: o componente "${nome}" não existe (componentes: ${NOMES_DOS_COMPONENTES.join(', ')})`);
  return COMPONENTES[nome];
}

/* Percorre os campos de referência de uma forma: chama `ponto(valor)` para cada ponto ("<id>.<ancora>", ponto nomeado,
   vetor ou `entre`) e `id(valor)` para cada id de forma, e troca o valor pelo que devolverem. */
function reescreverForma(f, { ponto, id }) {
  const g = { ...f };
  const pt = (v) => {
    if (typeof v === 'string') return ponto(v);
    if (objeto(v) && Array.isArray(v.entre)) return { ...v, entre: v.entre.map(pt) };
    if (objeto(v) && typeof v.ancora === 'string') return { ...v, ancora: ponto(v.ancora) };
    if (objeto(v) && v.nome !== undefined && v.ponto !== undefined) return { ...v, ponto: pt(v.ponto) };
    return v;
  };
  if (typeof g.sobre === 'string') g.sobre = id(g.sobre);
  if (Array.isArray(g.ponta)) g.ponta = [id(g.ponta[0]), ...g.ponta.slice(1)];
  else if (objeto(g.ponta)) g.ponta = { ...g.ponta, id: id(g.ponta.id) };
  else if (typeof g.ponta === 'string') g.ponta = id(g.ponta);
  if (objeto(g.encosta) && typeof g.encosta.referencia === 'string') g.encosta = { ...g.encosta, referencia: id(g.encosta.referencia) };
  if (objeto(g.alinha) && g.alinha.com !== undefined) g.alinha = { ...g.alinha, com: typeof g.alinha.com === 'string' ? ponto(g.alinha.com, true) : pt(g.alinha.com) };
  for (const k of ['centro', 'de', 'para']) if (g[k] !== undefined) g[k] = pt(g[k]);
  if (Array.isArray(g.caminho)) g.caminho = g.caminho.map(pt);
  if (objeto(g.arranja) && g.arranja.centro !== undefined) g.arranja = { ...g.arranja, centro: pt(g.arranja.centro) };
  return g;
}

/* Troca `"@nome"` pelas entradas, em qualquer profundidade. Uma entrada nula numa propriedade de objeto remove a
   propriedade; em outro lugar é erro. */
function substituir(v, entradas, onde, nome) {
  const troca = (x, podeOmitir) => {
    if (typeof x === 'string' && x.startsWith('@')) {
      const chave = x.slice(1);
      exigir(Object.hasOwn(entradas, chave), `${onde}: o componente "${nome}" usa a entrada "${x}" que ele não declara (entradas: ${Object.keys(entradas).join(', ') || 'nenhuma'})`);
      const valor = entradas[chave];
      if (valor === null || valor === undefined) {
        exigir(podeOmitir, `${onde}: o componente "${nome}" precisa da entrada "${chave}" (escreva "${chave}" na instância)`);
        return undefined;
      }
      return clone(valor);
    }
    if (Array.isArray(x)) return x.map((y) => troca(y, false));
    if (objeto(x)) {
      const saida = {};
      for (const [k, y] of Object.entries(x)) { const t = troca(y, true); if (t !== undefined) saida[k] = t; }
      return saida;
    }
    return x;
  };
  return troca(v, false);
}

/* Expande as instâncias de `formas`. `ctx`: { num, resolvedor, numerosDaForma, onde }, em que `num` resolve um valor no
   escopo da opção, `resolvedor(dict, onde)` cria o escopo do componente e `numerosDaForma(f, num, contexto)` resolve
   os campos numéricos de uma forma. Devolve { formas, pares, aliasDeId }; sem nenhuma instância devolve as formas
   como vieram. */
export function expandirComponentes(formas, ctx) {
  const { onde } = ctx;
  if (!Array.isArray(formas)) return { formas, pares: [], aliasDeId: () => undefined, instancias: 0, ponto: (v) => v };
  const ehInstancia = (f) => objeto(f) && f.usa !== undefined;
  const ehEspelhoDeInstancia = (f, ids) => objeto(f) && f.usa === undefined && objeto(f.espelha) && typeof f.espelha.forma === 'string' && ids.has(f.espelha.forma);
  const instancias = formas.filter(ehInstancia);
  if (instancias.length === 0) return { formas, pares: [], aliasDeId: () => undefined, instancias: 0, ponto: (v) => v };

  const dadosDe = new Map();
  for (const f of instancias) {
    exigir(typeof f.id === 'string' && f.id, `${onde}: uma instância de componente ("usa": "${f.usa}") precisa de "id"`);
    exigir(!dadosDe.has(f.id), `${onde}: o id "${f.id}" está repetido entre as instâncias de componente`);
    dadosDe.set(f.id, { comp: componente(f.usa, `${onde}, instância "${f.id}"`), nome: f.usa, espelho: false });
  }
  const idsDasInstancias = new Set(dadosDe.keys());
  for (const f of formas) if (ehEspelhoDeInstancia(f, idsDasInstancias)) {
    exigir(typeof f.id === 'string' && f.id, `${onde}: o espelho de "${f.espelha.forma}" precisa de "id"`);
    exigir(!dadosDe.has(f.id), `${onde}: o id "${f.id}" está repetido entre as instâncias de componente`);
    const fonte = dadosDe.get(f.espelha.forma);
    dadosDe.set(f.id, { comp: fonte.comp, nome: fonte.nome, espelho: true, fonte: f.espelha.forma });
  }
  for (const f of formas) if (!ehInstancia(f) && !ehEspelhoDeInstancia(f, idsDasInstancias)) {
    if (typeof f?.id === 'string' && dadosDe.has(f.id)) throw new ErroDeEsboco(`${onde}: o id "${f.id}" é de uma instância de componente e de outra forma ao mesmo tempo`);
    if (objeto(f?.arranja) && dadosDe.has(f.arranja.forma)) throw new ErroDeEsboco(`${onde}: "arranja" não repete um componente ("${f.arranja.forma}"); declare uma instância por cópia`);
  }

  /* âncoras expostas: <instancia>.<ancora> -> <instancia>.<forma>.<ancora> */
  const principalDe = (id) => `${id}.${dadosDe.get(id).comp.principal}`;
  const ancoraDe = (inst, nome, contexto) => {
    const { comp } = dadosDe.get(inst);
    const declaradas = comp.ancoras ?? {};
    if (Object.hasOwn(declaradas, nome)) return `${inst}.${declaradas[nome]}`;
    if (ANCORAS_DA_FORMA.includes(nome)) return `${principalDe(inst)}.${nome}`;
    /* `<instancia>.<parte>` (inclusive a principal): o centro daquela forma do componente */
    if (comp.formas.some((g) => g.id === nome)) return `${inst}.${nome}.centro`;
    const partes = comp.formas.map((g) => g.id);
    throw new ErroDeEsboco(`${contexto}: o componente "${dadosDe.get(inst).nome}" (instância "${inst}") não tem a âncora "${nome}" (âncoras: ${[...Object.keys(declaradas), ...ANCORAS_DA_FORMA].join(', ')}; partes, que valem como "${inst}.<parte>": ${partes.join(', ')})`);
  };
  /* referência de fora: "inst.ancora" -> forma e âncora reais; "inst" sozinho (só onde vale um id) -> forma principal */
  const referenciaDeFora = (contexto) => ({
    ponto: (v, ehIdOuPonto = false) => {
      if (ehIdOuPonto && dadosDe.has(v)) return principalDe(v);
      const i = v.indexOf('.');
      if (i > 0 && dadosDe.has(v.slice(0, i)) && !v.slice(i + 1).includes('.')) return ancoraDe(v.slice(0, i), v.slice(i + 1), contexto);
      return v;
    },
    id: (v) => (typeof v === 'string' && dadosDe.has(v) ? principalDe(v) : v),
  });

  const saida = [];
  const pares = [];
  const expandidas = new Map();

  const formasDaInstancia = (inst) => {
    const f = inst;
    const { comp, nome } = dadosDe.get(f.id);
    const contexto = `${onde}, instância "${f.id}" (${nome})`;
    const declaradas = Object.keys(comp.entradas ?? {});
    const fora = Object.keys(f).filter((k) => !RESERVADAS.includes(k) && !declaradas.includes(k));
    exigir(fora.length === 0, `${contexto}: o campo "${fora[0]}" não é do componente (campos: ${[...RESERVADAS, ...declaradas].join(', ')})`);
    /* parâmetros: os da instância no escopo da opção, o resto no escopo do componente */
    exigir(f.parametros === undefined || objeto(f.parametros), `${contexto}: "parametros" deve ser um objeto { nome: valor }`);
    const validos = Object.keys(comp.parametros ?? {});
    for (const k of Object.keys(f.parametros ?? {})) exigir(validos.includes(k), `${contexto}: o parâmetro "${k}" não é do componente (parâmetros: ${validos.join(', ') || 'nenhum'})`);
    const doEsboco = Object.fromEntries(Object.entries(f.parametros ?? {}).map(([k, v]) => [k, ctx.num(v, `parametros.${k}`, contexto)]));
    const escopo = ctx.resolvedor({ ...(comp.parametros ?? {}), ...doEsboco }, `componente "${nome}"`);
    /* entradas: valor da instância (números no escopo da opção, referências de fora reescritas) ou o padrão */
    const entradas = {};
    for (const [k, padrao] of Object.entries(comp.entradas ?? {})) {
      if (f[k] === undefined) { entradas[k] = padrao; continue; }
      const resolvida = ctx.numerosDaForma({ [k]: f[k] }, ctx.num, contexto)[k];
      entradas[k] = reescreverForma({ [k]: resolvida }, referenciaDeFora(contexto))[k];
    }
    const locais = new Set(comp.formas.map((g) => g.id));
    const prefixa = (v) => (typeof v === 'string' && locais.has(v) ? `${f.id}.${v}` : v);
    const prefixaPonto = (v) => {
      if (typeof v !== 'string' || v.startsWith('@')) return v;
      const i = v.indexOf('.');
      return locais.has(v) ? `${f.id}.${v}` : (i > 0 && locais.has(v.slice(0, i)) ? `${f.id}.${v}` : v);
    };
    const formas = comp.formas.map((g) => {
      /* referências internas ganham o prefixo antes de as entradas entrarem (as entradas já são de fora) */
      let h = reescreverForma(clone(g), { ponto: prefixaPonto, id: prefixa });
      h = substituir(h, entradas, contexto, nome);
      h = ctx.numerosDaForma(h, escopo.num, `${contexto}, forma "${g.id}"`);
      h.id = `${f.id}.${g.id}`;
      const principal = g.id === comp.principal;
      h.daInstancia = { id: f.id, principal };
      if (f.cor !== undefined) h.cor = f.cor;
      if (f.oculto !== undefined) h.oculto = f.oculto;
      if (f.opacidade !== undefined) h.opacidade = f.opacidade;
      if (f.unidade !== undefined) h.unidade = f.unidade;
      if (principal && f.rotulo !== undefined) h.rotulo = f.rotulo;
      return h;
    });
    for (const p of comp.pares ?? []) pares.push({ ...p, a: `${f.id}.${p.a}`, b: `${f.id}.${p.b}` });
    return formas;
  };

  const copiaDaInstancia = (f) => {
    const { comp, fonte } = dadosDe.get(f.id);
    const e = f.espelha;
    const contexto = `${onde}, espelho "${f.id}"`;
    const extras = Object.keys(f).filter((k) => !['id', 'espelha', 'cor', 'rotulo', 'oculto', 'opacidade', 'unidade'].includes(k));
    exigir(extras.length === 0, `${contexto}: o espelho de um componente só aceita "id", "espelha", "cor", "rotulo", "oculto", "opacidade" e "unidade"; retire "${extras[0]}"`);
    return expandidas.get(fonte).map((g) => {
      const local = g.id.slice(fonte.length + 1);
      const principal = local === comp.principal;
      const h = { id: `${f.id}.${local}`, espelha: { ...e, forma: g.id }, daInstancia: { id: f.id, principal } };
      const cor = f.cor ?? g.cor;
      if (cor !== undefined) h.cor = cor;
      if (f.oculto !== undefined) h.oculto = f.oculto; else if (g.oculto !== undefined) h.oculto = g.oculto;
      if (f.opacidade !== undefined) h.opacidade = f.opacidade; else if (g.opacidade !== undefined) h.opacidade = g.opacidade;
      if (f.unidade !== undefined) h.unidade = f.unidade; else if (g.unidade !== undefined) h.unidade = g.unidade;
      if (principal && f.rotulo !== undefined) h.rotulo = f.rotulo;
      return h;
    });
  };

  const fora = referenciaDeFora(onde);
  for (const f of formas) {
    if (ehInstancia(f)) {
      const feitas = formasDaInstancia(f);
      expandidas.set(f.id, feitas);
      saida.push(...feitas);
    } else if (ehEspelhoDeInstancia(f, idsDasInstancias)) {
      exigir(expandidas.has(f.espelha.forma), `${onde}: o espelho "${f.id}" vem antes da instância "${f.espelha.forma}"; declare a instância primeiro`);
      const feitas = copiaDaInstancia(f);
      expandidas.set(f.id, feitas);
      saida.push(...feitas);
    } else {
      saida.push(objeto(f) ? reescreverForma(f, fora) : f);
    }
  }
  return { formas: saida, pares, aliasDeId: (id) => (dadosDe.has(id) ? principalDe(id) : undefined), instancias: dadosDe.size, ponto: (v) => (typeof v === 'string' ? fora.ponto(v, true) : v) };
}
