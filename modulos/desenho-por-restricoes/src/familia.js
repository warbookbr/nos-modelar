/* familia.js — a família de desenho: um desenho `mecanifica.desenho@3` parametrizado, com a faixa de cada parâmetro e a prova de que
   ele resolve nos extremos e no médio.

   O arquivo (`mecanifica.familia-de-desenho@1`) segue a régua das famílias 3D (`procedural/familias`): `parametros` com `unidade`,
   `padrao`, `minimo`, `medio` e `maximo`, `restricoes` (relações de ordem entre os parâmetros), `perfis` nomeados (conjuntos de
   valores) e um `desenho` que lê os parâmetros por nome. O parâmetro da família é escrito uma vez, aqui; o `parametros` do desenho
   guarda só o que deriva deles (uma expressão) ou é constante, e repetir ali o nome de um parâmetro da família é recusado. Um
   parâmetro que nenhum campo do desenho lê é recusado, porque a faixa dele não mudaria nada. `catalogo` diz, em caminho relativo ao
   arquivo da família, o catálogo de peças que o desenho usa, de modo que quem lê a família não precisa saber qual é.

   Relação de ordem: `{ "id": "capo-abaixo-do-painel", "expressao": "capo < painel - 5", "motivo": "..." }`. A expressão compara duas
   somas por `<`, `<=`, `>` ou `>=`, com números, parâmetros da família, `+ - * /`, parênteses e as funções de
   `procedural/nucleo/expressoes.js` (`min`, `max`, `sqrt`...). Ela vale para o padrão, o médio e cada perfil, e um conjunto de valores
   que a fere é recusado antes de desenhar: `valoresDaFamilia` o recusa e a prova o pula dizendo qual relação ele fere.

   Especializar a família para um conjunto de valores dá um desenho `@3` comum, com os valores escritos em `parametros` e as peças
   usadas dentro dele, de modo que o arquivo se resolve sozinho. A prova (`provarFamilia`) desenha a família com todos os parâmetros
   no mínimo, no médio e no máximo, com cada parâmetro no mínimo, no médio e no máximo e os outros no padrão, com cada par de
   parâmetros nos extremos cruzados (o mínimo de um com o máximo do outro, os outros no padrão) e com cada perfil, e
   exige que cada desenho resolva (zero grau de liberdade, nenhum conflito, nenhum lado trocado), que nenhum polígono se cruze, que
   nenhuma parte fique toda escondida e que nenhuma peça esteja virada contra o lado que o uso deu a ela. É a prova que pega
   amarração errada: um valor de uma relação que só vale perto do padrão resolve no padrão e quebra no extremo. Puro, sem ler nem
   gravar arquivo. */
import { criarResolverNumerico } from '../../../procedural/nucleo/expressoes.js';
import { desenhar } from './desenhar.js';
import { ErroDeDesenho, FORMATO_DO_DESENHO, validarDescricao } from './formato.js';
import { IDENTIFICADOR, expandirDescricao, nomesCitados } from './expandir.js';

export const FORMATO_DA_FAMILIA_DE_DESENHO = 'mecanifica.familia-de-desenho@1';
export const UNIDADES_DA_FAMILIA = ['mm', 'graus', 'razao'];
const CHAVES_DA_FAMILIA = ['formato', 'id', 'versao', 'descricao', 'catalogo', 'parametros', 'restricoes', 'perfis', 'desenho'];
const CHAVES_DO_PARAMETRO = ['unidade', 'padrao', 'minimo', 'medio', 'maximo', 'descricao'];
const CHAVES_DA_RESTRICAO = ['id', 'expressao', 'motivo'];
const CHAVES_DO_PERFIL = ['descricao', 'parametros'];
const EXTREMOS = [['minimo', 'mínimo'], ['medio', 'médio'], ['maximo', 'máximo']];
/* Os perfis que toda família tem sem declarar: todos os parâmetros no mínimo, no médio ou no máximo da faixa. */
export const PERFIS_DA_FAIXA = EXTREMOS.map(([campo]) => campo);
const COMPARADORES = { '<': (a, b) => a < b, '<=': (a, b) => a <= b, '>': (a, b) => a > b, '>=': (a, b) => a >= b };

const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const numero = (v) => typeof v === 'number' && Number.isFinite(v);
const q = (s) => JSON.stringify(s);
const lista = (nomes) => nomes.map(q).join(', ');
const porNome = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

const absoluto = (caminho) => /^([\\/]|[A-Za-z]:)/.test(caminho);

/* Os catálogos de peças que o arquivo da família declara em "catalogo": um caminho ou uma lista de caminhos, relativos ao arquivo da
   família. Devolve `{ erros, caminhos }` sem ler nada do resto do arquivo, para quem lê o disco saber quais catálogos carregar antes de
   conferir a família inteira. */
export function catalogosDaFamilia(json) {
  const caminhos = [];
  const erros = [];
  if (!objeto(json) || json.catalogo === undefined) return { erros, caminhos };
  const itens = typeof json.catalogo === 'string' ? [json.catalogo] : json.catalogo;
  const ajuda = '"catalogo" deve ser o caminho de um arquivo de catálogo de peças, relativo ao arquivo da família (por exemplo "pecas.json"), ou uma lista deles';
  if (!Array.isArray(itens) || itens.length === 0 || !itens.every((c) => typeof c === 'string' && c.trim() !== '' && c === c.trim())) erros.push(`${ajuda}; veio ${JSON.stringify(json.catalogo)}`);
  else {
    const fora = itens.filter(absoluto);
    const repetidos = itens.filter((c, i) => itens.indexOf(c) !== i);
    if (fora.length) erros.push(`o "catalogo" ${lista(fora)} é um caminho absoluto; use um caminho relativo ao arquivo da família, para a família se mover com a pasta`);
    else if (repetidos.length) erros.push(`o "catalogo" repete ${lista([...new Set(repetidos)])}; cada catálogo entra uma vez`);
    else caminhos.push(...itens);
  }
  return { erros, caminhos };
}

/* Uma relação de ordem: o texto `esquerda <comparador> direita`, com um comparador só. Devolve `{ erro }` ou as duas somas e o
   comparador. Os nomes e as funções quem confere é o chamador, ao avaliar. */
function partirOrdem(fonte) {
  const comparadores = [...fonte.matchAll(/[<>=!]+/g)].map((m) => m[0]);
  if (comparadores.length === 0) return { erro: 'falta o comparador; a relação compara duas somas por "<", "<=", ">" ou ">="' };
  if (comparadores.length > 1) return { erro: `tem ${comparadores.length} comparadores (${lista(comparadores)}); a relação tem um só, entre duas somas` };
  if (!Object.hasOwn(COMPARADORES, comparadores[0])) return { erro: `o comparador ${q(comparadores[0])} não existe; use "<", "<=", ">" ou ">="` };
  const i = fonte.indexOf(comparadores[0]);
  const esquerda = fonte.slice(0, i).trim();
  const direita = fonte.slice(i + comparadores[0].length).trim();
  if (!esquerda || !direita) return { erro: 'falta uma das duas somas, a da esquerda ou a da direita do comparador' };
  return { esquerda, comparador: comparadores[0], direita };
}

/* Avalia uma relação de ordem com os valores dos parâmetros. `indefinida` quando a conta não existe nesses valores (raiz de negativo,
   divisão por zero), que conta como ferida. */
function avaliarOrdem(r, valores) {
  const { num } = criarResolverNumerico(valores);
  try {
    const esquerda = num(`=${r.esquerda}`);
    const direita = num(`=${r.direita}`);
    return { id: r.id, expressao: r.expressao, ...(r.motivo !== undefined ? { motivo: r.motivo } : {}), esquerda, direita, vale: COMPARADORES[r.comparador](esquerda, direita) };
  } catch (e) {
    return { id: r.id, expressao: r.expressao, ...(r.motivo !== undefined ? { motivo: r.motivo } : {}), esquerda: null, direita: null, vale: false, indefinida: e.message.replace(/^oficina: (expressão inválida: )?/, '') };
  }
}

/* As relações de ordem da família que os valores ferem, em ordem de id, cada uma com o lado esquerdo e o direito. */
export function restricoesFeridas(familia, valores) {
  return (familia.restricoes ?? []).map((r) => avaliarOrdem(r, valores)).filter((a) => !a.vale);
}

const arredondado = (x) => Math.round(x * 1000) / 1000;

/* A frase de uma relação ferida: qual é, quanto cada lado vale e o motivo que a família deu. */
export function fraseDaRestricao(f) {
  const lados = f.indefinida ? `a conta não existe com esses valores (${f.indefinida})` : `o lado esquerdo vale ${arredondado(f.esquerda)} e o direito ${arredondado(f.direita)}`;
  return `a relação de ordem ${q(f.id)} (${f.expressao}) não vale: ${lados}${f.motivo ? `; ${f.motivo}` : ''}`;
}

/* O desenho da família para um conjunto de valores: os parâmetros da família viram os primeiros de `parametros`, as peças que o
   desenho usa e que vieram do catálogo entram em `pecas`, e o resto fica na ordem do arquivo. */
export function especializarFamilia(familia, valores, { pecas = {} } = {}) {
  const d = familia.desenho;
  const nomes = Object.keys(familia.parametros).sort(porNome);
  const parametros = { ...Object.fromEntries(nomes.filter((n) => valores[n] !== undefined).map((n) => [n, valores[n]])), ...(objeto(d.parametros) ? d.parametros : {}) };
  const internas = objeto(d.pecas) ? d.pecas : {};
  const usadas = [...new Set(Object.values(objeto(d.usos) ? d.usos : {}).map((u) => u?.peca).filter((n) => typeof n === 'string'))].sort(porNome);
  const doCatalogo = Object.fromEntries(usadas.filter((n) => !Object.hasOwn(internas, n) && Object.hasOwn(pecas, n)).map((n) => [n, pecas[n]]));
  const todas = { ...internas, ...doCatalogo };
  const { formato, objeto: nomeDoObjeto, vista, olhando, parametros: _parametros, pecas: _pecas, ...resto } = d;
  return {
    formato, objeto: nomeDoObjeto, vista, ...(olhando !== undefined ? { olhando } : {}), parametros,
    ...(Object.keys(todas).length ? { pecas: todas } : {}), ...resto,
  };
}

/* Lê e confere o arquivo da família. Devolve `{ erros, familia }`, com `familia` nulo quando há erro. O desenho é conferido com os
   valores padrão: tem de validar e tem de ler todos os parâmetros. */
export function lerFamiliaDeDesenho(json, { pecas = {} } = {}) {
  const erros = [];
  const falha = (m) => erros.push(m);
  if (!objeto(json)) return { erros: [`a família deve ser um objeto JSON { "formato": ${q(FORMATO_DA_FAMILIA_DE_DESENHO)}, "id", "versao", "parametros", "desenho" }`], familia: null };
  for (const k of Object.keys(json)) if (!CHAVES_DA_FAMILIA.includes(k)) falha(`campo desconhecido ${q(k)} na família; os aceitos são ${lista(CHAVES_DA_FAMILIA)}`);
  if (json.formato !== FORMATO_DA_FAMILIA_DE_DESENHO) falha(`"formato" deve ser ${q(FORMATO_DA_FAMILIA_DE_DESENHO)} e veio ${q(json.formato)}`);
  if (typeof json.id !== 'string' || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(json.id)) falha('"id" deve ser um nome em minúsculas separado por hífen (por exemplo "carcaca-de-empilhadeira")');
  if (typeof json.versao !== 'string' || !/^\d+\.\d+\.\d+$/.test(json.versao)) falha('"versao" deve ser "<maior>.<menor>.<correção>" (por exemplo "1.0.0")');
  if (json.descricao !== undefined && typeof json.descricao !== 'string') falha('"descricao" deve ser um texto');

  const parametros = {};
  const invalidos = new Set();
  if (!objeto(json.parametros) || Object.keys(json.parametros).length === 0) falha('"parametros" deve ser um objeto { nome: { "unidade", "padrao", "minimo", "medio", "maximo" } } com ao menos um parâmetro');
  for (const nome of Object.keys(objeto(json.parametros) ? json.parametros : {}).sort(porNome)) {
    const p = json.parametros[nome];
    const onde = `o parâmetro ${q(nome)}`;
    invalidos.add(nome);
    if (!IDENTIFICADOR.test(nome)) { falha(`${onde} deve ter nome de identificador (letras, dígitos e _, sem começar por dígito), para o desenho poder citá-lo`); continue; }
    if (!objeto(p)) { falha(`${onde} deve ser { "unidade", "padrao", "minimo", "medio", "maximo" }`); continue; }
    for (const k of Object.keys(p)) if (!CHAVES_DO_PARAMETRO.includes(k)) falha(`${onde} tem o campo desconhecido ${q(k)}; os aceitos são ${lista(CHAVES_DO_PARAMETRO)}`);
    if (!UNIDADES_DA_FAMILIA.includes(p.unidade)) { falha(`${onde} precisa de "unidade" entre ${lista(UNIDADES_DA_FAMILIA)} e veio ${q(p.unidade)}`); continue; }
    const faltam = ['padrao', 'minimo', 'medio', 'maximo'].filter((k) => !numero(p[k]));
    if (faltam.length) { falha(`${onde} precisa de ${lista(faltam)} como número${faltam.length > 1 ? 's' : ''}`); continue; }
    if (!(p.minimo <= p.medio && p.medio <= p.maximo && p.minimo < p.maximo)) falha(`${onde} deve ter mínimo <= médio <= máximo e mínimo < máximo; veio ${p.minimo}, ${p.medio} e ${p.maximo} ${p.unidade}`);
    else if (p.padrao < p.minimo || p.padrao > p.maximo) falha(`${onde} tem o padrão ${p.padrao} fora da faixa de ${p.minimo} a ${p.maximo} ${p.unidade}`);
    else { invalidos.delete(nome); parametros[nome] = { unidade: p.unidade, padrao: p.padrao, minimo: p.minimo, medio: p.medio, maximo: p.maximo, ...(typeof p.descricao === 'string' ? { descricao: p.descricao } : {}) }; }
  }

  const perfis = {};
  if (json.perfis !== undefined && !objeto(json.perfis)) falha('"perfis" deve ser um objeto { nome: { "parametros": { parâmetro: valor } } }');
  for (const nome of Object.keys(objeto(json.perfis) ? json.perfis : {}).sort(porNome)) {
    const f = json.perfis[nome];
    const onde = `o perfil ${q(nome)}`;
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(nome)) falha(`${onde} deve ter nome em minúsculas separado por hífen`);
    if (PERFIS_DA_FAIXA.includes(nome)) { falha(`${onde} tem nome reservado: toda família já tem os perfis ${lista(PERFIS_DA_FAIXA)}, com todos os parâmetros no mínimo, no médio e no máximo da faixa; dê outro nome ao perfil`); continue; }
    if (!objeto(f) || !objeto(f.parametros) || Object.keys(f.parametros).length === 0) { falha(`${onde} deve ser { "parametros": { parâmetro: valor } } com ao menos um valor`); continue; }
    for (const k of Object.keys(f)) if (!CHAVES_DO_PERFIL.includes(k)) falha(`${onde} tem o campo desconhecido ${q(k)}; os aceitos são ${lista(CHAVES_DO_PERFIL)}`);
    const valores = {};
    for (const [n, v] of Object.entries(f.parametros).sort(([a], [b]) => porNome(a, b))) {
      if (invalidos.has(n)) continue;
      if (!Object.hasOwn(parametros, n)) falha(`${onde} cita o parâmetro ${q(n)}, que a família não tem`);
      else if (!numero(v) || v < parametros[n].minimo || v > parametros[n].maximo) falha(`${onde} dá ${JSON.stringify(v)} ao parâmetro ${q(n)}, fora da faixa de ${parametros[n].minimo} a ${parametros[n].maximo} ${parametros[n].unidade}`);
      else valores[n] = v;
    }
    perfis[nome] = { ...(typeof f.descricao === 'string' ? { descricao: f.descricao } : {}), parametros: valores };
  }

  const { erros: errosDoCatalogo, caminhos: catalogo } = catalogosDaFamilia(json);
  errosDoCatalogo.forEach(falha);

  /* As relações de ordem entre os parâmetros. Cada uma cita só parâmetros da família, avalia nos valores padrão e vale para o padrão,
     o médio e cada perfil. */
  const restricoes = [];
  const padroesValidos = Object.fromEntries(Object.entries(parametros).map(([n, p]) => [n, p.padrao]));
  if (json.restricoes !== undefined && !Array.isArray(json.restricoes)) falha('"restricoes" deve ser uma lista de relações de ordem { "id", "expressao", "motivo" } (pode ser vazia)');
  const ids = new Set();
  (Array.isArray(json.restricoes) ? json.restricoes : []).forEach((r, i) => {
    const onde = `a relação de ordem na posição ${i + 1}`;
    if (!objeto(r)) { falha(`${onde} deve ser { "id", "expressao", "motivo" }`); return; }
    for (const k of Object.keys(r)) if (!CHAVES_DA_RESTRICAO.includes(k)) falha(`${onde} tem o campo desconhecido ${q(k)}; os aceitos são ${lista(CHAVES_DA_RESTRICAO)}`);
    if (typeof r.id !== 'string' || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(r.id)) { falha(`${onde} precisa de "id" em minúsculas separado por hífen (por exemplo "capo-abaixo-do-painel")`); return; }
    const aqui = `a relação de ordem ${q(r.id)}`;
    if (ids.has(r.id)) { falha(`${aqui} aparece duas vezes; o id vale um só`); return; }
    ids.add(r.id);
    if (r.motivo !== undefined && (typeof r.motivo !== 'string' || r.motivo.trim() === '')) falha(`${aqui} tem "motivo" que não é um texto`);
    if (typeof r.expressao !== 'string' || r.expressao.trim() === '') { falha(`${aqui} precisa de "expressao", o texto que compara duas somas (por exemplo "capo < painel - 5")`); return; }
    const partida = partirOrdem(r.expressao);
    if (partida.erro) { falha(`${aqui} (${r.expressao}) ${partida.erro}`); return; }
    const nomes = [...new Set([...nomesCitados(`=${partida.esquerda}`), ...nomesCitados(`=${partida.direita}`)])].sort(porNome);
    const alheios = nomes.filter((n) => !Object.hasOwn(parametros, n) && !invalidos.has(n));
    if (alheios.length) { falha(`${aqui} (${r.expressao}) cita ${alheios.length === 1 ? 'o nome' : 'os nomes'} ${lista(alheios)}, que ${alheios.length === 1 ? 'não é parâmetro' : 'não são parâmetros'} da família; ela compara só parâmetros da família (${lista(Object.keys(parametros).sort(porNome))})`); return; }
    if (nomes.some((n) => invalidos.has(n))) return;
    const lida = { id: r.id, expressao: r.expressao.trim(), ...(typeof r.motivo === 'string' ? { motivo: r.motivo } : {}), comparador: partida.comparador, esquerda: partida.esquerda, direita: partida.direita };
    const sonda = avaliarOrdem(lida, padroesValidos);
    if (sonda.indefinida) { falha(`${aqui} (${r.expressao}) não é uma expressão válida: ${sonda.indefinida}`); return; }
    restricoes.push(lida);
  });
  restricoes.sort((a, b) => porNome(a.id, b.id));
  const valoresDe = (campo) => Object.fromEntries(Object.entries(parametros).map(([n, p]) => [n, p[campo]]));
  const conferidos = [['o padrão', padroesValidos], ['o médio', valoresDe('medio')], ...Object.entries(perfis).map(([n, f]) => [`o perfil ${q(n)}`, { ...padroesValidos, ...f.parametros }])];
  for (const [quem, valores] of conferidos) for (const f of restricoesFeridas({ restricoes }, valores)) falha(`${quem} fere ${fraseDaRestricao(f)}`);

  if (!objeto(json.desenho)) falha('"desenho" deve ser o desenho `mecanifica.desenho@3` que lê os parâmetros por nome');
  else if (json.desenho.formato !== FORMATO_DO_DESENHO) falha(`o "formato" do desenho da família deve ser ${q(FORMATO_DO_DESENHO)} (parâmetros e peças existem a partir dele) e veio ${q(json.desenho.formato)}`);
  else {
    const repetidos = Object.keys(parametros).filter((n) => objeto(json.desenho.parametros) && Object.hasOwn(json.desenho.parametros, n));
    if (repetidos.length) falha(`${repetidos.length === 1 ? 'o parâmetro' : 'os parâmetros'} ${lista(repetidos)} ${repetidos.length === 1 ? 'está' : 'estão'} na família e em "parametros" do desenho; escreva o valor uma vez, na família`);
  }
  if (erros.length) return { erros, familia: null };

  const familia = {
    id: json.id, versao: json.versao, ...(json.descricao !== undefined ? { descricao: json.descricao } : {}),
    catalogo, parametros, restricoes, perfis, desenho: json.desenho,
  };
  const padroes = Object.fromEntries(Object.entries(parametros).map(([n, p]) => [n, p.padrao]));
  const sonda = especializarFamilia(familia, padroes, { pecas });
  /* O desenho especializado já traz as peças que usa, então vale sozinho. */
  const { erros: doDesenho } = validarDescricao(sonda);
  for (const e of doDesenho) falha(`o desenho da família, com os valores padrão, não vale: ${e}`);
  if (!doDesenho.length) {
    const { usados } = expandirDescricao(sonda);
    const soltos = Object.keys(parametros).filter((n) => !usados.has(n));
    if (soltos.length) falha(`${soltos.length === 1 ? 'o parâmetro' : 'os parâmetros'} ${lista(soltos)} ${soltos.length === 1 ? 'não é lido' : 'não são lidos'} por nenhum campo do desenho; a faixa ${soltos.length === 1 ? 'dele' : 'deles'} não mudaria nada. Use o nome num campo numérico do desenho ou tire o parâmetro da família`);
  }
  return erros.length ? { erros, familia: null } : { erros: [], familia };
}

/* Os valores de todos os parâmetros: o padrão, depois os do perfil, depois os dados. Um valor fora da faixa é recusado, e o conjunto
   que fere uma relação de ordem da família também, antes de qualquer desenho. O perfil pode ser um da família ou um dos que toda
   família tem (`minimo`, `medio`, `maximo`: todos os parâmetros naquele ponto da faixa). */
export function valoresDaFamilia(familia, { perfil = null, valores = {} } = {}) {
  const erros = [];
  const saida = Object.fromEntries(Object.entries(familia.parametros).map(([n, p]) => [n, p.padrao]));
  if (perfil !== null) {
    if (Object.hasOwn(familia.perfis, perfil)) Object.assign(saida, familia.perfis[perfil].parametros);
    else if (PERFIS_DA_FAIXA.includes(perfil)) for (const n of Object.keys(saida)) saida[n] = familia.parametros[n][perfil];
    else erros.push(`o perfil ${q(perfil)} não existe na família (${Object.keys(familia.perfis).length ? `os perfis são ${lista(Object.keys(familia.perfis))}` : 'ela não tem perfis'}; ${lista(PERFIS_DA_FAIXA)} existem em toda família e põem todos os parâmetros no mínimo, no médio ou no máximo)`);
  }
  for (const [n, v] of Object.entries(valores)) {
    if (!Object.hasOwn(familia.parametros, n)) { erros.push(`o parâmetro ${q(n)} não existe na família (os parâmetros são ${lista(Object.keys(familia.parametros))})`); continue; }
    const p = familia.parametros[n];
    if (!numero(v)) erros.push(`o parâmetro ${q(n)} deve ser um número em ${p.unidade}, e veio ${JSON.stringify(v)}`);
    else if (v < p.minimo || v > p.maximo) erros.push(`o parâmetro ${q(n)} vale ${v} ${p.unidade}, fora da faixa da família (de ${p.minimo} a ${p.maximo} ${p.unidade}); a faixa vem das referências medidas, então um valor fora dela é extrapolação: amplie a faixa na família e prove de novo`);
    else saida[n] = v;
  }
  if (!erros.length) for (const f of restricoesFeridas(familia, saida)) erros.push(`esses valores ferem ${fraseDaRestricao(f)}`);
  return { erros, valores: saida };
}

/* Os conjuntos de valores da prova, sem repetir um conjunto que já saiu: o padrão, todos no mínimo, no médio e no máximo, cada
   parâmetro nos três com os outros no padrão, cada par de parâmetros nos extremos cruzados (o mínimo de um com o máximo do outro,
   dos dois jeitos, com os outros no padrão) e cada perfil. Os pares são o que a prova de um parâmetro por vez não vê: dois
   parâmetros que andam juntos na referência e se contradizem quando um vai a um extremo e o outro ao oposto. */
export function casosDaProva(familia) {
  const nomes = Object.keys(familia.parametros).sort(porNome);
  const padroes = Object.fromEntries(nomes.map((n) => [n, familia.parametros[n].padrao]));
  const casos = [{ rotulo: 'padrão', valores: padroes }];
  for (const [campo, rotulo] of EXTREMOS) casos.push({ rotulo: `todos no ${rotulo}`, valores: Object.fromEntries(nomes.map((n) => [n, familia.parametros[n][campo]])) });
  for (const n of nomes) for (const [campo, rotulo] of EXTREMOS) casos.push({ rotulo: `${n} no ${rotulo}`, valores: { ...padroes, [n]: familia.parametros[n][campo] } });
  nomes.forEach((a, i) => nomes.slice(i + 1).forEach((b) => {
    casos.push({ rotulo: `${a} no mínimo e ${b} no máximo`, valores: { ...padroes, [a]: familia.parametros[a].minimo, [b]: familia.parametros[b].maximo } });
    casos.push({ rotulo: `${a} no máximo e ${b} no mínimo`, valores: { ...padroes, [a]: familia.parametros[a].maximo, [b]: familia.parametros[b].minimo } });
  }));
  for (const perfil of Object.keys(familia.perfis).sort(porNome)) casos.push({ rotulo: `perfil ${perfil}`, valores: { ...padroes, ...familia.perfis[perfil].parametros } });
  const vistos = new Set();
  return casos.filter((c) => { const chave = JSON.stringify(nomes.map((n) => c.valores[n])); if (vistos.has(chave)) return false; vistos.add(chave); return true; });
}

function motivoDoEstado(r) {
  if (r.estado === 'conflito') {
    if (r.conflitantes.length) return `conflito: as relações ${lista(r.conflitantes)} não cabem juntas`;
    if (r.desvios.length) return `conflito: ${r.desvios.map((d) => `${q(d.relacao)} pede ${d.pedido} e mede ${d.medido}`).join('; ')}`;
    return `conflito: o resolvedor não convergiu (${r.statusDoResolvedor})`;
  }
  if (r.estado === 'solto') return `solto: ${r.grausDeLiberdade} grau(s) de liberdade${r.soltas?.partes?.length ? `, ainda se movem ${lista(r.soltas.partes)}` : ''}`;
  return `lado trocado: ${lista(r.ladosTrocados.map((t) => t.relacao))}`;
}

/* O que reprova um desenho da família: não resolver, um polígono que se cruza, uma parte toda escondida e uma peça virada contra o
   lado que o uso deu a ela. A prova e o ajuste a uma referência usam a mesma régua. */
export function problemasDoDesenho(rel) {
  const problemas = [];
  if (rel.estado !== 'resolvido') problemas.push(motivoDoEstado(rel));
  for (const n of rel.cruzadas) problemas.push(`a parte ${q(n)} se cruza em si mesma`);
  for (const n of rel.ocultas) problemas.push(`a parte ${q(n)} fica toda escondida`);
  for (const o of rel.orientacao ?? []) problemas.push(o.mensagem);
  return problemas;
}

async function provarCaso(familia, caso, pecas) {
  /* O conjunto que fere uma relação de ordem não é da família: não se desenha. Não é falha da prova, e sai com a relação que ele fere. */
  const feridas = restricoesFeridas(familia, caso.valores);
  if (feridas.length) {
    return {
      ...caso, ok: true, recusado: true, estado: 'recusado por relação de ordem', problemas: [], feridas: feridas.map((f) => f.id), restricoes: feridas.map(fraseDaRestricao),
      vista: null, redundantes: [], texto: null,
    };
  }
  try {
    const r = await desenhar(especializarFamilia(familia, caso.valores, { pecas }));
    const rel = r.relatorio;
    const problemas = problemasDoDesenho(rel);
    const vista = rel.medidas ? { larguraMm: rel.medidas.vista.larguraMm, alturaMm: rel.medidas.vista.alturaMm } : null;
    return { ...caso, ok: problemas.length === 0, recusado: false, estado: rel.estado, problemas, feridas: [], restricoes: [], vista, redundantes: rel.redundantes, texto: problemas.length ? r.texto : null };
  } catch (e) {
    if (!(e instanceof ErroDeDesenho)) throw e;
    return { ...caso, ok: false, recusado: false, estado: 'recusado', problemas: [`recusado: ${e.erros?.length ? e.erros.join('; ') : e.message}`], feridas: [], restricoes: [], vista: null, redundantes: [], texto: e.message };
  }
}

/* Desenha a família em cada conjunto de `casosDaProva` e diz quais resolvem. `ok` só é verdadeiro se nenhum conjunto desenhado
   falha; o que fere uma relação de ordem fica de fora, como `recusado`, e `desenhados` e `recusados` contam cada grupo. */
export async function provarFamilia(familia, { pecas = {} } = {}) {
  const casos = [];
  for (const caso of casosDaProva(familia)) casos.push(await provarCaso(familia, caso, pecas));
  const recusados = casos.filter((c) => c.recusado).length;
  return { id: familia.id, versao: familia.versao, ok: casos.every((c) => c.ok), desenhados: casos.length - recusados, recusados, casos };
}
