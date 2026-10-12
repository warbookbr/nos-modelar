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
   - `quando` e `exceto` numa forma ou num par do componente (um parâmetro, "!parametro" ou uma lista deles) ligam a forma ao
     valor dos parâmetros: `quando` exige que todos valham ("nome" é parâmetro diferente de zero, "!nome" é zero) e `exceto` tira a
     forma quando todos valem. Duas formas podem ter o mesmo id se só uma entra (a `roda` troca o disco pelos raios assim).
   - `ponta: true` na instância (ou `{ inicio: true, fim: true }`) declara livres de propósito as pontas das hastes e dos tubos
     dela (o achado de ponta livre do gate); o espelho a herda da fonte.
   - `unidade` na instância (ou no espelho dela) declara a Unidade de detalhe de todas as formas dela; o espelho sem
     `unidade` herda a da fonte.
   - Cada forma sai marcada com `daInstancia: { id, principal }`, que o conserto e o `--ajustar` usam para saber que só a
     principal se move pela edição da instância.
   - `rotacao` na instância (como a das formas: `[rx, ry, rz]`, `{ eixo, angulo }`, `{ x, y, z }` ou um número, que gira em y;
     aceita parâmetro e expressão) gira o componente inteiro, como um corpo só, em torno do centro da forma principal: as
     formas dele se posicionam como se não girasse (`ponta` e `sobre` do componente valem na pose de repouso) e o resto do
     esboço enxerga a pose girada. Saem em `giros` (ver `giro.js`). O componente que declara uma entrada `rotacao` a recebe
     como entrada, como antes. A roda do trem principal do avião, que recolhe girando em torno de z, precisou de um módulo
     `rodaGira` que repetia o desenho da `roda` com seno e cosseno de `ang` (atrito 43).

   Puro: não lê arquivo (a biblioteca é importada como dados). */
import { ErroDeEsboco } from './index.js';
import { COMPONENTES } from '../componentes/index.js';
import { validarForma } from './esquema.js';
import { quisDizer } from './parecido.js';
import { fontesDoArranjo, nomesDasCopias } from './arranjo.js';
import { traduzirLigacoes } from './ligar.js';
import { lerPerguntasDoComponente } from '../../../src/autoria/perguntas-do-critico.js';
import { angulosDaRotacao } from './giro.js';

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
const clone = (v) => JSON.parse(JSON.stringify(v));
const RESERVADAS = ['id', 'usa', 'parametros', 'cor', 'rotulo', 'oculto', 'opacidade', 'unidade', 'ponta', 'lado', 'rotacao'];
const ANCORAS_DA_FORMA = ['centro', 'inicio', 'fim', '+x', '-x', '+y', '-y', '+z', '-z'];

export const NOMES_DOS_COMPONENTES = Object.keys(COMPONENTES);

/* Componente pelo nome no catálogo (os de arquivo, mais os módulos do esboço quando `catalogo` vem de `catalogoDe`), ou
   ErroDeEsboco com os nomes válidos. */
export function componente(nome, onde, catalogo = COMPONENTES) {
  if (typeof nome === 'string' && Object.hasOwn(catalogo, nome)) return catalogo[nome];
  const modulos = Object.keys(catalogo).filter((n) => !NOMES_DOS_COMPONENTES.includes(n) || catalogo[n].origem === 'modulo');
  const arquivos = NOMES_DOS_COMPONENTES.filter((n) => catalogo[n]?.origem !== 'modulo');
  throw new ErroDeEsboco(`${onde}: o componente "${nome}" não existe${typeof nome === 'string' ? quisDizer(nome, Object.keys(catalogo)) : ''} (componentes: ${arquivos.join(', ')}${modulos.length ? `; módulos: ${modulos.join(', ')}` : ''})`);
}

const CAMPOS_DO_MODULO = ['descricao', 'principal', 'parametros', 'entradas', 'formas', 'ancoras', 'pares', 'substitui', 'perguntas'];
const entradasCitadas = (v, achadas = new Set()) => {
  if (typeof v === 'string' && v.startsWith('@')) achadas.add(v.slice(1));
  else if (Array.isArray(v)) v.forEach((x) => entradasCitadas(x, achadas));
  else if (objeto(v)) Object.values(v).forEach((x) => entradasCitadas(x, achadas));
  return achadas;
};

/* O bloco `modulos` da raiz do esboço: cada módulo tem o formato de um componente de arquivo (parametros, entradas,
   formas, ancoras, pares e principal), sem o campo `componente`. As `entradas` que o módulo não declara saem das
   referências "@nome" das formas (todas com padrão nulo) e a `principal` padrão é a primeira forma com id. Devolve o
   catálogo `{ nome: componente }` com os componentes de arquivo e, por cima, os módulos: um módulo com o nome de um
   componente de arquivo só entra com `"substitui": true`. Recusa módulo mal formado, colisão de nome e ciclo. */
export function catalogoDe(modulos) {
  if (modulos === undefined) return COMPONENTES;
  exigir(objeto(modulos), 'esboço: "modulos" deve ser um objeto { nome: { parametros, formas, ancoras } }');
  const catalogo = { ...COMPONENTES };
  const usos = new Map();
  /* módulo dentro de módulo: o ciclo tem a mensagem dele, e o aninhamento sem ciclo fica para depois */
  for (const [nome, m] of Object.entries(modulos)) {
    if (objeto(m) && Array.isArray(m.formas)) for (const f of m.formas) if (objeto(f) && typeof f.usa === 'string') usos.set(nome, [...(usos.get(nome) ?? []), f.usa]);
  }
  const visitar = (nome, trilha) => {
    for (const alvo of usos.get(nome) ?? []) {
      if (trilha.includes(alvo)) throw new ErroDeEsboco(`esboço: ciclo de módulos: ${[...trilha.slice(trilha.indexOf(alvo)), alvo].join(' -> ')}; um módulo não pode usar a si mesmo, direta ou indiretamente`);
      if (usos.has(alvo)) visitar(alvo, [...trilha, alvo]);
    }
  };
  for (const nome of usos.keys()) visitar(nome, [nome]);
  for (const [nome, alvos] of usos) {
    const alvo = alvos[0];
    exigir(false, `esboço: o módulo "${nome}" usa ${Object.hasOwn(modulos, alvo) ? 'o módulo' : 'o componente'} "${alvo}" dentro de si, e isso ainda não é suportado: o módulo é só formas e âncoras; use as duas instâncias lado a lado no esboço, posicionadas por âncora`);
  }

  for (const [nome, m] of Object.entries(modulos)) {
    const onde = `esboço: o módulo "${nome}"`;
    exigir(nome && !nome.includes('.') && !nome.includes('@'), `${onde}: o nome não pode ter ponto nem arroba, e deve ser um texto não vazio (ele é o prefixo das âncoras "<instancia>.<ancora>")`);
    exigir(objeto(m), `${onde} deve ser { "parametros": {...}, "formas": [...], "ancoras": {...} }`);
    for (const k of Object.keys(m)) exigir(CAMPOS_DO_MODULO.includes(k), `${onde}: o campo "${k}" não existe${quisDizer(k, CAMPOS_DO_MODULO)}; campos válidos: ${CAMPOS_DO_MODULO.join(', ')}`);
    exigir(Array.isArray(m.formas) && m.formas.length > 0 && m.formas.every(objeto), `${onde}: "formas" deve ser uma lista não vazia de formas`);
    const formasDoModulo = traduzirLigacoes(m.formas, `esboço: módulo "${nome}"`);
    exigir(m.parametros === undefined || objeto(m.parametros), `${onde}: "parametros" deve ser um objeto { nome: número | "=expressão" }`);
    exigir(m.substitui === undefined || typeof m.substitui === 'boolean', `${onde}: "substitui" deve ser true ou false`);
    const colide = Object.hasOwn(COMPONENTES, nome);
    exigir(!colide || m.substitui === true, `${onde} tem o nome de um componente de arquivo; declare "substitui": true no módulo para usá-lo no lugar do componente, ou renomeie o módulo`);
    exigir(colide || m.substitui !== true, `${onde} declara "substitui": true, mas não existe componente de arquivo com esse nome (componentes: ${NOMES_DOS_COMPONENTES.join(', ')}); tire o "substitui"`);
    const ids = formasDoModulo.filter((f) => typeof f.id === 'string' && f.usa === undefined).map((f) => f.id);
    for (const [i, f] of formasDoModulo.entries()) {
      exigir(typeof f.id === 'string' && f.id ? !f.id.includes('.') : objeto(f.arranja), `${onde}, forma ${i + 1}: falta o "id" (sem ponto), que só uma entrada "arranja" dispensa`);
    }
    for (const f of formasDoModulo) {
      if (f.usa !== undefined) continue;
      if (objeto(f.arranja)) for (const fonte of fontesDoArranjo(f.arranja)) exigir(ids.includes(fonte), `${onde}: o arranja cita a forma "${fonte}", que não é forma do módulo (formas: ${ids.join(', ')})`);
      const { quando, exceto, ...limpa } = f;
      void quando; void exceto;
      validarForma(limpa, `módulo "${nome}", forma "${f.id ?? 'arranja'}"`);
    }
    const principal = m.principal ?? ids[0];
    exigir(ids.includes(principal), `${onde}: a forma principal "${principal}" não é forma do módulo (formas: ${ids.join(', ') || 'nenhuma'})`);
    for (const [a, alvo] of Object.entries(m.ancoras ?? {})) {
      const forma = typeof alvo === 'string' ? alvo.slice(0, Math.max(alvo.lastIndexOf('.'), 0)) : '';
      exigir(ids.includes(forma), `${onde}: a âncora "${a}" aponta para ${JSON.stringify(alvo)}, e "${forma}" não é forma do módulo; escreva "<forma>.<ancora>" (formas: ${ids.join(', ')})`);
    }
    for (const p of m.pares ?? []) exigir(objeto(p) && ids.includes(p.a) && ids.includes(p.b), `${onde}: o par ${JSON.stringify([p?.a, p?.b])} cita forma que não é do módulo (formas: ${ids.join(', ')})`);
    const entradas = m.entradas ?? Object.fromEntries([...entradasCitadas(formasDoModulo)].map((k) => [k, null]));
    let perguntas;
    if (m.perguntas !== undefined) {
      try { perguntas = lerPerguntasDoComponente(m.perguntas, `modulos.${nome}.perguntas`); } catch (e) { throw new ErroDeEsboco(`${onde}: ${e.message}`); }
    }
    catalogo[nome] = { componente: nome, origem: 'modulo', principal, parametros: m.parametros ?? {}, entradas, formas: formasDoModulo, ancoras: m.ancoras ?? {}, pares: m.pares ?? [], ...(perguntas ? { perguntas } : {}) };
  }
  return catalogo;
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
  else if (objeto(g.ponta) && g.ponta.id !== undefined) g.ponta = { ...g.ponta, id: id(g.ponta.id) };
  else if (typeof g.ponta === 'string') g.ponta = id(g.ponta);
  if (objeto(g.encosta) && typeof g.encosta.referencia === 'string') g.encosta = { ...g.encosta, referencia: id(g.encosta.referencia) };
  if (objeto(g.alinha) && g.alinha.com !== undefined) g.alinha = { ...g.alinha, com: typeof g.alinha.com === 'string' ? ponto(g.alinha.com, true) : pt(g.alinha.com) };
  for (const k of ['centro', 'de', 'para']) if (g[k] !== undefined) g[k] = pt(g[k]);
  if (Array.isArray(g.caminho)) g.caminho = g.caminho.map(pt);
  if (Array.isArray(g.circulos)) g.circulos = g.circulos.map((c) => (objeto(c) && c.centro !== undefined ? { ...c, centro: pt(c.centro) } : c));
  if (objeto(g.espelha) && typeof g.espelha.forma === 'string') g.espelha = { ...g.espelha, forma: id(g.espelha.forma) };
  if (Array.isArray(g.subtrai)) g.subtrai = g.subtrai.map((e) => (typeof e === 'string' ? id(e) : objeto(e) && typeof e.forma === 'string' ? { ...e, forma: id(e.forma) } : e));
  if (objeto(g.encaixa)) g.encaixa = { ...g.encaixa, ...(g.encaixa.em === undefined ? {} : { em: pt(g.encaixa.em) }), ...(typeof g.encaixa.ancora === 'string' ? { ancora: ponto(g.encaixa.ancora) } : {}) };
  if (objeto(g.arranja)) {
    g.arranja = { ...g.arranja };
    if (typeof g.arranja.forma === 'string') g.arranja.forma = id(g.arranja.forma);
    else if (Array.isArray(g.arranja.forma)) g.arranja.forma = g.arranja.forma.map((x) => (typeof x === 'string' ? id(x) : x));
    if (typeof g.arranja.caminho === 'string') g.arranja.caminho = id(g.arranja.caminho);
    if (g.arranja.centro !== undefined) g.arranja.centro = pt(g.arranja.centro);
  }
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
    dadosDe.set(f.id, { comp: componente(f.usa, `${onde}, instância "${f.id}"`, ctx.catalogo), nome: f.usa, espelho: false });
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
    if (objeto(f?.arranja)) for (const fonte of fontesDoArranjo(f.arranja)) if (dadosDe.has(fonte)) throw new ErroDeEsboco(`${onde}: "arranja" não repete um componente ("${fonte}"); declare uma instância por cópia`);
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
    const partes = [...new Set(comp.formas.map((g) => g.id))];
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
  const giros = [];
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
    /* `rotacao` da instância: o componente inteiro gira em torno do centro da principal (a menos que o componente a declare como entrada) */
    if (f.rotacao !== undefined && !declaradas.includes('rotacao')) {
      const rotacao = angulosDaRotacao(ctx.numerosDaForma({ rotacao: f.rotacao }, ctx.num, contexto).rotacao);
      giros.push({ instancia: f.id, principal: `${f.id}.${comp.principal}`, rotacao });
    }
    const locais = new Set(comp.formas.map((g) => g.id));
    const prefixa = (v) => (typeof v === 'string' && locais.has(v) ? `${f.id}.${v}` : v);
    const prefixaPonto = (v) => {
      if (typeof v !== 'string' || v.startsWith('@')) return v;
      const i = v.indexOf('.');
      return locais.has(v) ? `${f.id}.${v}` : (i > 0 && locais.has(v.slice(0, i)) ? `${f.id}.${v}` : v);
    };
    /* `quando` (um parâmetro, "!parametro" ou uma lista deles, todos valendo) e `exceto` (o mesmo, a forma sai se todos valem):
       a forma ou o par só entra na instância conforme os parâmetros do componente; "nome" vale quando o parâmetro é diferente
       de zero e "!nome" quando é zero */
    const valem = (c) => (c === undefined ? null : (Array.isArray(c) ? c : [c]).every((q) => (typeof q === 'string' && q.startsWith('!') ? escopo.num(q.slice(1), `quando`, contexto) === 0 : escopo.num(q, 'quando', contexto) !== 0)));
    const entra = (g) => valem(g.quando) !== false && valem(g.exceto) !== true;
    const formas = comp.formas.filter(entra).map(({ quando, exceto, ...g }) => {
      void quando; void exceto;
      /* referências internas ganham o prefixo antes de as entradas entrarem (as entradas já são de fora) */
      let h = reescreverForma(clone(g), { ponto: prefixaPonto, id: prefixa });
      h = substituir(h, entradas, contexto, nome);
      h = ctx.numerosDaForma(h, escopo.num, `${contexto}, forma ${g.id === undefined ? 'de arranja' : `"${g.id}"`}`);
      /* a entrada `arranja` do componente não tem id: as cópias dela nascem na expansão dos arranjos, com a fonte prefixada */
      if (g.id === undefined && objeto(h.arranja)) {
        if (Array.isArray(h.arranja.nomes)) h.arranja = { ...h.arranja, nomes: h.arranja.nomes.map((n) => `${f.id}.${n}`) };
        /* o grupo (`forma` em lista) leva os nomes por fonte: a fonte e cada nome ganham o prefixo da instância */
        else if (objeto(h.arranja.nomes)) h.arranja = { ...h.arranja, nomes: Object.fromEntries(Object.entries(h.arranja.nomes).map(([fonte, lista]) => [prefixa(fonte), Array.isArray(lista) ? lista.map((n) => `${f.id}.${n}`) : lista])) };
        /* as cópias são da instância (unidade do Condutor, mapa de ligações), mas não são a forma principal dela */
        /* o `oculto` e a `opacidade` da instância vão junto: a entrada de arranjo não os aceita no campo próprio */
        h.daInstancia = { id: f.id, principal: false, ...(f.oculto === undefined ? {} : { oculto: f.oculto }), ...(f.opacidade === undefined ? {} : { opacidade: f.opacidade }) };
        return h;
      }
      h.id = `${f.id}.${g.id}`;
      const principal = g.id === comp.principal;
      h.daInstancia = { id: f.id, principal };
      if (f.cor !== undefined) h.cor = f.cor;
      if (f.oculto !== undefined) h.oculto = f.oculto;
      if (f.opacidade !== undefined) h.opacidade = f.opacidade;
      if (f.unidade !== undefined) h.unidade = f.unidade;
      /* `ponta: true` na instância declara livres de propósito as pontas das hastes e dos tubos dela */
      if (f.ponta !== undefined && (h.tipo === 'tubo' || (['cilindro', 'caixa'].includes(h.tipo) && h.de !== undefined))) h.ponta = f.ponta;
      if (principal && f.rotulo !== undefined) h.rotulo = f.rotulo;
      return h;
    });
    for (const { quando, exceto, ...p } of (comp.pares ?? []).filter(entra)) { void quando; void exceto; pares.push({ ...p, a: `${f.id}.${p.a}`, b: `${f.id}.${p.b}` }); }
    return formas;
  };

  const copiaDaInstancia = (f) => {
    const { comp, fonte } = dadosDe.get(f.id);
    const e = f.espelha;
    const contexto = `${onde}, espelho "${f.id}"`;
    const extras = Object.keys(f).filter((k) => !['id', 'espelha', 'cor', 'rotulo', 'oculto', 'opacidade', 'unidade'].includes(k));
    exigir(extras.length === 0, `${contexto}: o espelho de um componente só aceita "id", "espelha", "cor", "rotulo", "oculto", "opacidade" e "unidade"; retire "${extras[0]}"`);
    return expandidas.get(fonte).flatMap((g) => {
      /* a entrada `arranja` do módulo não tem id: o espelho dela é o espelho de cada cópia que ela vai gerar */
      if (g.id === undefined && objeto(g.arranja)) {
        const a = g.arranja;
        if (!Number.isInteger(a.total) || a.total < 2) return [];
        const nomes = nomesDasCopias(a).flatMap((c) => c.nomes);
        return nomes.map((nome) => {
          const h = { id: `${f.id}.${nome.slice(fonte.length + 1)}`, espelha: { ...e, forma: nome }, daInstancia: { id: f.id, principal: false } };
          const oculto = f.oculto ?? g.daInstancia?.oculto;
          const opacidade = f.opacidade ?? g.daInstancia?.opacidade;
          if (oculto !== undefined) h.oculto = oculto;
          if (opacidade !== undefined) h.opacidade = opacidade;
          if (f.cor !== undefined) h.cor = f.cor;
          if (f.unidade !== undefined) h.unidade = f.unidade;
          return h;
        });
      }
      const local = g.id.slice(fonte.length + 1);
      const principal = local === comp.principal;
      const h = { id: `${f.id}.${local}`, espelha: { ...e, forma: g.id }, daInstancia: { id: f.id, principal } };
      const cor = f.cor ?? g.cor;
      if (cor !== undefined) h.cor = cor;
      if (f.oculto !== undefined) h.oculto = f.oculto; else if (g.oculto !== undefined) h.oculto = g.oculto;
      if (f.opacidade !== undefined) h.opacidade = f.opacidade; else if (g.opacidade !== undefined) h.opacidade = g.opacidade;
      if (f.unidade !== undefined) h.unidade = f.unidade; else if (g.unidade !== undefined) h.unidade = g.unidade;
      if (principal && f.rotulo !== undefined) h.rotulo = f.rotulo;
      return [h];
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
  return { formas: saida, pares, giros, aliasDeId: (id) => (dadosDe.has(id) ? principalDe(id) : undefined), instancias: dadosDe.size, ponto: (v) => (typeof v === 'string' ? fora.ponto(v, true) : v) };
}
