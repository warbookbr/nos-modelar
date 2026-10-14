/* expandir.js — o `mecanifica.desenho@3` antes da validação: parâmetros com nome, expressões e peças de desenho.

   A etapa devolve uma descrição simples, do mesmo formato que a validação já lê, só com números e sem `parametros`, `pecas` nem
   `usos`. Uma descrição sem nenhum desses recursos sai como entrou.

   Parâmetro: `parametros` na raiz é `{ nome: número | "nome" | "=expressão" }`, e qualquer campo numérico do desenho (a
   coordenada de um chute, `mm`, `graus`, `espessura`, `raioDoCanto`, o `chute` do raio, o `v` e o `h` de uma referência) aceita um
   número, o nome de um parâmetro ou uma expressão. A gramática é a do esboço (`procedural/nucleo/expressoes.js`): `+ - * /`,
   parênteses e as funções `sin`, `cos`, `tan`, `atan`, `atan2` e `sqrt`, com ângulo em graus.

   Peça: um trecho do formato (pontos, partes, relações, geometria de construção) com `parametros` de entrada (`null` é
   obrigatório) e `ligacoes`, os nomes pelos quais o desenho de fora enxerga a peça. `pecas` na raiz declara peças, `usos` as chama:
   `{ "roda": { "peca": "arcoDeRoda", "parametros": { "raio": 350 }, "origem": [h, v] } }`. Cada nome interno da peça ganha o prefixo
   `<uso>.` (ponto, parte, construção e relação), de modo que dois usos da mesma peça não colidem e o relatório diz de qual uso
   a relação é. O desenho de fora cita a peça só por `<uso>.<ligação>`; um nome interno que a peça não expõe é recusado. `origem`
   desloca os chutes da peça (só o chute: a posição final vem das relações). `nomeiaPartes` troca o nome prefixado de uma parte por
   um nome final escolhido, para a região sair com o nome de uma referência. Em `frenteParaFundo` do desenho de fora, o nome de um
   uso vale pelas partes dele, na ordem da `frenteParaFundo` da peça (ou em ordem de nome). Uma peça não usa outra peça.

   Orientação: um parâmetro pode ser uma palavra (`"sentido": "abaixo"`) e o `lado`, o `eixo` e o `por` de uma relação, no desenho ou na
   peça, aceitam o nome de um parâmetro de palavra no lugar da palavra; assim a mesma peça serve virada para cima, para baixo ou
   para os lados, e o uso diz para onde. O `lado` de uma distância com `eixo` aceita também um sinal, o nome de um parâmetro numérico
   ou `"=expressão"` (positivo é a direita ou acima, negativo a esquerda ou abaixo), de modo que o mesmo número que espelha os
   chutes da peça (`"=sentido*comprimento"`) escolhe o lado da relação. A relação cujo lado ou eixo veio de parâmetro é devolvida em
   `orientadas`, com o uso e a peça, para o relatório conferir se o chute concorda (orientacao.js).

   Puro e determinístico: a mesma entrada dá a mesma saída. */
import { criarResolverNumerico } from '../../../procedural/nucleo/expressoes.js';
import { EIXOS, LADO_DO_SINAL, PALAVRAS } from './palavras.js';

const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const numero = (v) => typeof v === 'number' && Number.isFinite(v);
const texto = (v) => typeof v === 'string' && v.trim() !== '' && v === v.trim();
const q = (s) => JSON.stringify(s);
const lista = (nomes) => nomes.map(q).join(', ');
const porNome = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const mapear = (o, f) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, f(v, k)]));

export const IDENTIFICADOR = /^[A-Za-z_][A-Za-z0-9_]*$/;
export const CHAVES_DA_PECA = ['descricao', 'parametros', 'pontos', 'partes', 'construcao', 'relacoes', 'ligacoes', 'frenteParaFundo'];
const CHAVES_DO_USO = ['peca', 'parametros', 'origem', 'nomeiaPartes'];
/* Numa relação, tudo o que não é um destes campos é o tipo, e o valor do tipo só traz nomes. */
const CAMPOS_QUE_NAO_SAO_NOMES = ['nome', 'mm', 'graus', 'lado', 'por', 'eixo'];

/* Os nomes de parâmetro que um valor cita, sem olhar se existem: o nome sozinho, ou os identificadores de uma expressão que não
   são função nem fazem parte de um número (1e5). */
export function nomesCitados(valor) {
  if (typeof valor !== 'string') return [];
  if (!valor.startsWith('=')) return [valor];
  const fonte = valor.slice(1);
  return [...fonte.matchAll(/(?<![A-Za-z0-9_.])[A-Za-z_][A-Za-z0-9_]*/g)]
    .filter((m) => !/^\s*\(/.test(fonte.slice(m.index + m[0].length)))
    .map((m) => m[0]);
}

function fraseDoErro(e, quem, validos, palavras = {}) {
  const dica = `parâmetros declarados: ${validos.length ? validos.join(', ') : 'nenhum'}`;
  const ausente = /parâmetro '(.+)' não existe/.exec(e.message);
  if (ausente && Object.hasOwn(palavras, ausente[1])) return `${quem} usa o parâmetro ${q(ausente[1])}, que é a palavra ${q(palavras[ausente[1]])} e não um número; uma palavra só vale em "lado", "eixo" e "por" de uma relação`;
  if (ausente) return `${quem} usa o parâmetro ${q(ausente[1])}, que não existe (${dica})`;
  const ciclo = /ciclo de parâmetros: (.+)$/.exec(e.message);
  if (ciclo) return `${quem} cai num ciclo de parâmetros (${ciclo[1]})`;
  const detalhe = e.message.replace(/^oficina: (expressão inválida: )?/, '');
  return `${quem} não é um número, um parâmetro nem uma expressão válida (${detalhe}; ${dica}); use um número, o nome de um parâmetro ou "=expressão" com + - * / e parênteses`;
}

/* Um escopo de parâmetros: `num(valor, quem)` devolve o número de um valor (o próprio número, o parâmetro ou a expressão) e
   registra o erro, com `quem` dizendo onde, quando não dá. `citados` junta os nomes lidos, para a família saber o que o desenho usa.
   Um valor que é uma palavra (`"abaixo"`) e não o nome de outro parâmetro faz do parâmetro um parâmetro de palavra: ele não entra nas
   contas, e `palavraDoValor` e `palavraDoCampo` o devolvem. */
function criarEscopo(declarados, erros, onde) {
  const validos = Object.keys(declarados).sort(porNome);
  const ehPalavra = (v) => typeof v === 'string' && PALAVRAS.includes(v) && !Object.hasOwn(declarados, v);
  const palavras = {}; const numericos = {};
  for (const nome of validos) (ehPalavra(declarados[nome]) ? palavras : numericos)[nome] = declarados[nome];
  const resolvedor = criarResolverNumerico(numericos);
  const citados = new Set();
  const num = (valor, quem) => {
    if (typeof valor !== 'string') return valor;
    nomesCitados(valor).forEach((n) => citados.add(n));
    try { return resolvedor.num(valor); } catch (e) { erros.add(fraseDoErro(e, quem, validos, palavras)); return Number.NaN; }
  };
  /* Os parâmetros se resolvem todos de saída, para o ciclo e o nome que não existe aparecerem mesmo sem uso; essa leitura não conta como uso. */
  const valores = {};
  for (const nome of Object.keys(numericos).sort(porNome)) {
    try { valores[nome] = resolvedor.num(nome); } catch (e) { erros.add(fraseDoErro(e, `${onde}o parâmetro ${q(nome)}`, validos, palavras)); valores[nome] = Number.NaN; }
  }
  /* A palavra de um valor que se passa a um parâmetro: o nome de um parâmetro de palavra, ou a palavra solta que não é nome de parâmetro. */
  const palavraDoValor = (valor) => {
    if (typeof valor !== 'string') return undefined;
    if (Object.hasOwn(palavras, valor)) { citados.add(valor); return palavras[valor]; }
    return !Object.hasOwn(declarados, valor) && PALAVRAS.includes(valor) ? valor : undefined;
  };
  /* A palavra de um campo de relação (`lado`, `eixo`, `por`): a palavra solta, ou o nome de um parâmetro de palavra. */
  const palavraDoCampo = (valor) => {
    if (typeof valor !== 'string') return undefined;
    if (PALAVRAS.includes(valor)) return valor;
    if (Object.hasOwn(palavras, valor)) { citados.add(valor); return palavras[valor]; }
    return undefined;
  };
  const ehNumero = (valor) => typeof valor === 'string' && (valor.startsWith('=') || Object.hasOwn(numericos, valor));
  return { num, valores, citados, palavraDoValor, palavraDoCampo, ehNumero, onde, falha: (m) => erros.add(m) };
}

/* Valida o bloco `parametros` (nomes de identificador, número ou texto) e devolve o dicionário limpo. */
function lerParametros(p, erros, onde, { aceitaNulo = false } = {}) {
  const dicionario = {};
  if (p === undefined) return dicionario;
  if (!objeto(p)) { erros.add(`${onde}"parametros" deve ser um objeto { nome: número | "nome" | "=expressão" }`); return dicionario; }
  for (const nome of Object.keys(p).sort(porNome)) {
    const v = p[nome];
    if (!IDENTIFICADOR.test(nome)) erros.add(`${onde}o parâmetro ${q(nome)} deve ter nome de identificador (letras, dígitos e _, sem começar por dígito), para as expressões poderem citá-lo`);
    else if (numero(v) || typeof v === 'string' || (aceitaNulo && v === null)) dicionario[nome] = v;
    else erros.add(`${onde}o parâmetro ${q(nome)} deve ser um número, o nome de outro parâmetro ou "=expressão", e veio ${JSON.stringify(v)}${aceitaNulo ? ' (null marca o parâmetro obrigatório)' : ''}`);
  }
  return dicionario;
}

/* Os campos numéricos de uma parte, de uma construção, de uma relação, de um ponto e de uma referência, resolvidos. */
function numerosDaParte(p, nome, num) {
  if (!objeto(p)) return p;
  const g = { ...p };
  const onde = `a parte ${q(nome)}`;
  if (p.espessura !== undefined) g.espessura = num(p.espessura, `${onde}, campo "espessura"`);
  if (objeto(p.circulo) && p.circulo.chute !== undefined) g.circulo = { ...p.circulo, chute: num(p.circulo.chute, `${onde}, campo "chute"`) };
  const rc = p.raioDoCanto;
  if (typeof rc === 'string') g.raioDoCanto = num(rc, `${onde}, campo "raioDoCanto"`);
  else if (objeto(rc)) {
    g.raioDoCanto = mapear(rc, (v, ponto) => {
      const quem = `${onde}, "raioDoCanto" do ponto ${q(ponto)}`;
      if (objeto(v)) return v.raio !== undefined ? { ...v, raio: num(v.raio, quem) } : v;
      return num(v, quem);
    });
  }
  return g;
}

/* O `eixo`, o `por` e o `lado` de uma relação, com o que vem de parâmetro trocado pela palavra: o nome de um parâmetro de palavra,
   ou, no `lado` de uma distância com `eixo`, o sinal de um número (parâmetro ou "=expressão"). `doParametro` diz se algum dos três veio
   de parâmetro, que é o que faz a relação contar como orientada. */
function palavrasDaRelacao(r, quem, escopo) {
  const trocados = {};
  let doParametro = false;
  for (const campo of ['eixo', 'por']) {
    const w = escopo.palavraDoCampo(r[campo]);
    if (w !== undefined && w !== r[campo]) { trocados[campo] = w; doParametro = true; }
  }
  if (r.lado !== undefined) {
    const w = escopo.palavraDoCampo(r.lado);
    if (w !== undefined) {
      if (w !== r.lado) { trocados.lado = w; doParametro = true; }
    } else if (escopo.ehNumero(r.lado)) {
      const eixo = trocados.eixo ?? r.eixo;
      const sinal = escopo.num(r.lado, `${quem}, campo "lado"`);
      if (Number.isNaN(sinal)) return { trocados, doParametro };
      if (!EIXOS.includes(eixo)) escopo.falha(`${escopo.onde}${quem}: o "lado" vindo de um número (um sinal) só vale numa distância com "eixo" "h" ou "v", porque o sinal escolhe um dos dois lados do eixo`);
      else if (sinal === 0) escopo.falha(`${escopo.onde}${quem}: o sinal do "lado" é zero; use um número positivo (${LADO_DO_SINAL[eixo].positivo}) ou negativo (${LADO_DO_SINAL[eixo].negativo})`);
      else { trocados.lado = sinal > 0 ? LADO_DO_SINAL[eixo].positivo : LADO_DO_SINAL[eixo].negativo; doParametro = true; }
    }
  }
  return { trocados, doParametro };
}

function numerosDoCorpo(c, escopo, orientadas = new Set()) {
  const { num } = escopo;
  const g = { ...c };
  if (objeto(c.referencias)) {
    g.referencias = mapear(c.referencias, (r, nome) => {
      if (!objeto(r)) return r;
      const quem = `a referência ${q(nome)}`;
      return { ...r, ...(r.v !== undefined ? { v: num(r.v, `${quem}, campo "v"`) } : {}), ...(r.h !== undefined ? { h: num(r.h, `${quem}, campo "h"`) } : {}) };
    });
  }
  if (objeto(c.pontos)) g.pontos = mapear(c.pontos, (p, nome) => (Array.isArray(p) && p.length === 2 ? p.map((x, i) => num(x, `o ponto ${q(nome)}, coordenada ${i === 0 ? 'h' : 'v'}`)) : p));
  if (objeto(c.partes)) g.partes = mapear(c.partes, (p, nome) => numerosDaParte(p, nome, num));
  if (objeto(c.construcao)) {
    g.construcao = mapear(c.construcao, (k, nome) => (objeto(k) && objeto(k.circulo) && k.circulo.chute !== undefined ? { ...k, circulo: { ...k.circulo, chute: num(k.circulo.chute, `a construção ${q(nome)}, campo "chute"`) } } : k));
  }
  if (Array.isArray(c.relacoes)) {
    g.relacoes = c.relacoes.map((r, i) => {
      if (!objeto(r)) return r;
      const quem = texto(r.nome) ? `a relação ${q(r.nome)}` : `a relação na posição ${i + 1}`;
      const { trocados, doParametro } = palavrasDaRelacao(r, quem, escopo);
      if (doParametro && texto(r.nome)) orientadas.add(r.nome);
      return { ...r, ...(r.mm !== undefined ? { mm: num(r.mm, `${quem}, campo "mm"`) } : {}), ...(r.graus !== undefined ? { graus: num(r.graus, `${quem}, campo "graus"`) } : {}), ...trocados };
    });
  }
  return g;
}

/* Os nomes que uma parte cita, trocados por `citar`; os centros de canto que ela declara, trocados por `declarar`. */
function nomesDaParte(p, citar, declarar) {
  if (!objeto(p)) return p;
  const g = { ...p };
  if (Array.isArray(p.poligono)) g.poligono = p.poligono.map(citar);
  if (Array.isArray(p.barra)) g.barra = p.barra.map(citar);
  if (objeto(p.circulo)) g.circulo = { ...p.circulo, ...(p.circulo.centro !== undefined ? { centro: citar(p.circulo.centro) } : {}) };
  if (objeto(p.arco)) g.arco = mapear(p.arco, (v) => citar(v));
  if (objeto(p.raioDoCanto)) {
    g.raioDoCanto = Object.fromEntries(Object.entries(p.raioDoCanto).map(([ponto, v]) => [citar(ponto), objeto(v) && v.centro !== undefined ? { ...v, centro: declarar(v.centro) } : v]));
  }
  return g;
}

const nomesDaRelacao = (v, f) => (Array.isArray(v) ? v.map((x) => nomesDaRelacao(x, f)) : typeof v === 'string' ? f(v) : v);

function nomesDaConstrucao(k, citar) {
  if (!objeto(k)) return k;
  if (objeto(k.circulo)) return { ...k, circulo: { ...k.circulo, ...(k.circulo.centro !== undefined ? { centro: citar(k.circulo.centro) } : {}) } };
  if (Array.isArray(k.reta)) return { ...k, reta: k.reta.map(citar) };
  return k;
}

function nomesDaRelacaoInteira(r, citar) {
  if (!objeto(r)) return r;
  const g = { ...r };
  for (const k of Object.keys(r)) if (!CAMPOS_QUE_NAO_SAO_NOMES.includes(k)) g[k] = nomesDaRelacao(r[k], citar);
  return g;
}

/* Os nomes que a peça declara: pontos, partes, construções e centros de canto. */
function nomesDeclarados(peca) {
  const partes = objeto(peca.partes) ? Object.keys(peca.partes) : [];
  const construcao = objeto(peca.construcao) ? Object.keys(peca.construcao) : [];
  const centros = partes.flatMap((n) => (objeto(peca.partes[n]) && objeto(peca.partes[n].raioDoCanto) ? Object.values(peca.partes[n].raioDoCanto).filter((v) => objeto(v) && typeof v.centro === 'string').map((v) => v.centro) : []));
  return { pontos: objeto(peca.pontos) ? Object.keys(peca.pontos) : [], partes, construcao, centros };
}

function conferirForma(nome, peca, erros) {
  const onde = `a peça ${q(nome)}: `;
  if (!objeto(peca)) { erros.add(`${onde}deve ser um objeto com ${lista(CHAVES_DA_PECA)}`); return false; }
  const antes = erros.size;
  for (const k of Object.keys(peca)) {
    if (CHAVES_DA_PECA.includes(k)) continue;
    const motivo = k === 'referencias' ? ' (uma peça não tem referências fixas: o desenho de fora prende as ligações dela)' : k === 'usos' || k === 'pecas' ? ' (uma peça não usa outra peça)' : '';
    erros.add(`${onde}campo desconhecido ${q(k)}; os aceitos são ${lista(CHAVES_DA_PECA)}${motivo}`);
  }
  if (peca.descricao !== undefined && typeof peca.descricao !== 'string') erros.add(`${onde}"descricao" deve ser um texto`);
  if (!objeto(peca.ligacoes) || Object.keys(peca.ligacoes).length === 0) erros.add(`${onde}"ligacoes" deve ser um objeto { ligação: nome interno } com ao menos uma ligação, os nomes pelos quais o desenho de fora enxerga a peça`);
  if (!objeto(peca.partes) && !objeto(peca.pontos)) erros.add(`${onde}deve ter "pontos" e "partes"`);
  return erros.size === antes;
}

export const FORMATO_DAS_PECAS_DE_DESENHO = 'mecanifica.pecas-de-desenho@1';

/* Um arquivo de catálogo de peças, `{ "formato": "mecanifica.pecas-de-desenho@1", "pecas": { nome: peça } }`, lido para o
   `opcoes.pecas` de `desenhar`. Devolve `{ erros, pecas }`, com `pecas` nulo quando há erro. */
export function lerCatalogoDePecas(json, onde = 'o catálogo de peças') {
  const erros = new Set();
  if (!objeto(json) || json.formato !== FORMATO_DAS_PECAS_DE_DESENHO) erros.add(`${onde} deve ser { "formato": ${q(FORMATO_DAS_PECAS_DE_DESENHO)}, "pecas": { "<nome>": <peça> } }`);
  else {
    for (const k of Object.keys(json)) if (k !== 'formato' && k !== 'pecas') erros.add(`${onde} tem o campo desconhecido ${q(k)}; os aceitos são "formato" e "pecas"`);
    if (!objeto(json.pecas) || Object.keys(json.pecas).length === 0) erros.add(`${onde} deve trazer "pecas" com ao menos uma peça`);
    else for (const nome of Object.keys(json.pecas).sort(porNome)) { if (!texto(nome)) erros.add(`${onde} tem uma peça de nome vazio ou com espaço nas pontas`); conferirForma(nome, json.pecas[nome], erros); }
  }
  return { erros: [...erros], pecas: erros.size ? null : json.pecas };
}

/* Uma instância da peça: os nomes prefixados, os números resolvidos e os chutes deslocados pela origem. Devolve null com os erros
   registrados quando a peça ou o uso estão errados. */
function instanciar(nomeUso, uso, nomeDaPeca, peca, fora, erros) {
  const numFora = fora.num;
  const onde = `o uso ${q(nomeUso)} da peça ${q(nomeDaPeca)}: `;
  const antes = erros.size;
  for (const k of Object.keys(uso)) if (!CHAVES_DO_USO.includes(k)) erros.add(`${onde}campo desconhecido ${q(k)}; os aceitos são ${lista(CHAVES_DO_USO)}`);

  const padroes = lerParametros(peca.parametros, erros, `a peça ${q(nomeDaPeca)}: `, { aceitaNulo: true });
  const dados = uso.parametros === undefined ? {} : uso.parametros;
  const dict = {};
  if (!objeto(dados)) erros.add(`${onde}"parametros" deve ser um objeto { parâmetro: valor }`);
  else {
    const desconhecidos = Object.keys(dados).filter((k) => !Object.hasOwn(padroes, k));
    if (desconhecidos.length) erros.add(`${onde}${desconhecidos.length === 1 ? 'o parâmetro' : 'os parâmetros'} ${lista(desconhecidos)} ${desconhecidos.length === 1 ? 'não existe' : 'não existem'} na peça (os parâmetros dela são ${Object.keys(padroes).length ? lista(Object.keys(padroes)) : 'nenhum'})`);
    const faltam = Object.keys(padroes).filter((k) => padroes[k] === null && dados[k] === undefined);
    if (faltam.length) erros.add(`${onde}falta ${faltam.length === 1 ? 'o parâmetro obrigatório' : 'os parâmetros obrigatórios'} ${lista(faltam)}`);
    for (const k of Object.keys(padroes)) {
      if (dados[k] !== undefined) {
        /* Uma palavra (ou o nome de um parâmetro de palavra de fora) passa como palavra: é a orientação que o uso dá à peça. */
        const palavra = fora.palavraDoValor(dados[k]);
        if (palavra !== undefined) dict[k] = palavra;
        else { const v = numFora(dados[k], `${onde}o parâmetro ${q(k)}`); dict[k] = Number.isNaN(v) ? 0 : v; }
      } else if (padroes[k] !== null) dict[k] = padroes[k];
    }
  }
  /* Sem os parâmetros certos a peça não se avalia: o resto seria uma enxurrada de "o parâmetro não existe". */
  if (erros.size > antes) return null;
  const escopo = criarEscopo(dict, erros, onde);

  let origem = [0, 0];
  if (uso.origem !== undefined) {
    if (Array.isArray(uso.origem) && uso.origem.length === 2) origem = uso.origem.map((x, i) => numFora(x, `${onde}a origem, coordenada ${i === 0 ? 'h' : 'v'}`));
    else erros.add(`${onde}"origem" deve ser [h, v], o deslocamento dos chutes da peça em milímetro`);
  }

  const { pontos, partes, construcao, centros } = nomesDeclarados(peca);
  const todos = new Set([...pontos, ...partes, ...construcao, ...centros]);
  const soPartes = partes.filter((n) => !(objeto(peca.construcao) && Object.hasOwn(peca.construcao, n)));
  const renomeadas = {};
  if (uso.nomeiaPartes !== undefined) {
    if (!objeto(uso.nomeiaPartes)) erros.add(`${onde}"nomeiaPartes" deve ser { parte da peça: nome final }`);
    else {
      for (const [local, final] of Object.entries(uso.nomeiaPartes)) {
        if (!partes.includes(local)) erros.add(`${onde}"nomeiaPartes" cita ${q(local)}, que não é uma parte da peça (as partes são ${lista(partes)})`);
        else if (!texto(final)) erros.add(`${onde}o nome final de ${q(local)} deve ser um texto não vazio`);
        else renomeadas[local] = final;
      }
      const finais = Object.values(renomeadas);
      for (const f of finais.filter((x, i) => finais.indexOf(x) !== i)) erros.add(`${onde}o nome final ${q(f)} aparece duas vezes em "nomeiaPartes"`);
    }
  }
  const ren = (n) => (typeof n === 'string' ? (renomeadas[n] ?? `${nomeUso}.${n}`) : n);

  const desconhecidos = new Set();
  const citar = (n) => { if (typeof n === 'string' && !todos.has(n)) desconhecidos.add(n); return ren(n); };
  const orientadasLocais = new Set();
  const corpo = numerosDoCorpo({ pontos: peca.pontos, partes: peca.partes, construcao: peca.construcao, relacoes: peca.relacoes }, escopo, orientadasLocais);
  const pontosFinais = objeto(corpo.pontos) ? Object.fromEntries(Object.entries(corpo.pontos).map(([n, p]) => [ren(n), Array.isArray(p) && p.length === 2 && p.every(numero) && origem.every(numero) ? [p[0] + origem[0], p[1] + origem[1]] : p])) : {};
  const partesFinais = objeto(corpo.partes) ? Object.fromEntries(Object.entries(corpo.partes).map(([n, p]) => [ren(n), nomesDaParte(p, citar, ren)])) : {};
  const construcaoFinal = objeto(corpo.construcao) ? Object.fromEntries(Object.entries(corpo.construcao).map(([n, k]) => [ren(n), nomesDaConstrucao(k, citar)])) : {};
  const relacoesFinais = Array.isArray(corpo.relacoes)
    ? corpo.relacoes.map((r) => (objeto(r) ? { ...nomesDaRelacaoInteira(r, citar), ...(typeof r.nome === 'string' ? { nome: `${nomeUso}.${r.nome}` } : {}) } : r))
    : [];
  if (desconhecidos.size) erros.add(`${onde}a peça cita ${lista([...desconhecidos].sort(porNome))}, que ela não declara em "pontos", "partes" nem "construcao"; uma peça só enxerga os próprios nomes`);

  const ligacoes = {};
  for (const [lig, interno] of Object.entries(objeto(peca.ligacoes) ? peca.ligacoes : {})) {
    if (!texto(lig)) erros.add(`${onde}a ligação ${q(lig)} tem nome vazio ou com espaço nas pontas`);
    else if (!todos.has(interno)) erros.add(`${onde}a ligação ${q(lig)} aponta para ${q(interno)}, que a peça não declara`);
    else ligacoes[lig] = ren(interno);
  }

  let ordem = soPartes.map(ren).sort(porNome);
  if (peca.frenteParaFundo !== undefined) {
    const l = peca.frenteParaFundo;
    const ok = Array.isArray(l) && l.every((n) => soPartes.includes(n)) && new Set(l).size === l.length && l.length === soPartes.length;
    if (ok) ordem = l.map(ren);
    else erros.add(`${onde}"frenteParaFundo" da peça deve listar todas as partes dela, uma vez cada, da que fica à frente para a do fundo (as partes são ${lista(soPartes)})`);
  }

  if (erros.size > antes) return null;
  const orientadas = [...orientadasLocais].map((n) => [`${nomeUso}.${n}`, { uso: nomeUso, peca: nomeDaPeca }]);
  return { pontos: pontosFinais, partes: partesFinais, construcao: construcaoFinal, relacoes: relacoesFinais, ligacoes, ordem, declarados: [...pontos, ...partes, ...construcao, ...centros].map(ren), peca: nomeDaPeca, resolvidos: escopo.valores, orientadas };
}

/* A descrição `mecanifica.desenho@3` expandida. Devolve `{ erros, descricao, parametros, usados, orientadas }`: `parametros` são os
   valores resolvidos, `usados` os nomes de parâmetro que algum campo lê, direto ou por outro parâmetro, e `orientadas` o mapa das
   relações cujo lado ou eixo veio de parâmetro (nome final da relação para `{ uso, peca }`, nulos quando é do desenho de fora). */
export function expandirDescricao(d, { pecas: catalogo = {} } = {}) {
  const erros = new Set();
  const saida = () => ({ erros: [...erros], descricao: null, parametros: null, usados: new Set(), orientadas: new Map() });
  if (!objeto(d)) return { erros: [], descricao: d, parametros: null, usados: new Set(), orientadas: new Map() };

  const declarados = lerParametros(d.parametros, erros, '');
  const fora = criarEscopo(declarados, erros, '');

  if (d.pecas !== undefined && !objeto(d.pecas)) erros.add('"pecas" deve ser um objeto { nome da peça: peça }');
  if (d.usos !== undefined && !objeto(d.usos)) erros.add('"usos" deve ser um objeto { nome do uso: { "peca": "<peça>", "parametros": {...} } }');
  if (erros.size) return saida();

  const internas = objeto(d.pecas) ? d.pecas : {};
  const doCatalogo = objeto(catalogo) ? catalogo : {};
  for (const nome of Object.keys(internas)) {
    if (Object.hasOwn(doCatalogo, nome)) erros.add(`a peça ${q(nome)} está no desenho e no catálogo de peças; renomeie uma delas`);
    conferirForma(nome, internas[nome], erros);
  }
  const usos = objeto(d.usos) ? d.usos : {};
  const instancias = {};
  const ocupados = new Set([
    ...(objeto(d.referencias) ? Object.keys(d.referencias) : []), ...(objeto(d.pontos) ? Object.keys(d.pontos) : []),
    ...(objeto(d.partes) ? Object.keys(d.partes) : []), ...(objeto(d.construcao) ? Object.keys(d.construcao) : []),
    ...nomesDeclarados(d).centros,
  ]);
  for (const nomeUso of Object.keys(usos).sort(porNome)) {
    const uso = usos[nomeUso];
    const onde = `o uso ${q(nomeUso)}: `;
    if (!texto(nomeUso) || nomeUso.includes('.')) { erros.add(`${onde}o nome de um uso é um texto sem ponto, porque o ponto separa o uso da ligação em "<uso>.<ligação>"`); continue; }
    if (ocupados.has(nomeUso)) { erros.add(`${onde}o nome do uso já é o de um ponto, parte, referência ou construção do desenho; renomeie um dos dois`); continue; }
    ocupados.add(nomeUso);
    if (!objeto(uso) || !texto(uso.peca)) { erros.add(`${onde}deve ser { "peca": "<nome da peça>", "parametros": {...} }`); continue; }
    const peca = Object.hasOwn(internas, uso.peca) ? internas[uso.peca] : Object.hasOwn(doCatalogo, uso.peca) ? doCatalogo[uso.peca] : undefined;
    if (peca === undefined) { erros.add(`${onde}a peça ${q(uso.peca)} não existe; as peças são ${[...Object.keys(internas), ...Object.keys(doCatalogo)].sort(porNome).map(q).join(', ') || 'nenhuma'}`); continue; }
    if (Object.hasOwn(doCatalogo, uso.peca) && !conferirForma(uso.peca, peca, erros)) continue;
    if (!objeto(peca)) continue;
    const inst = instanciar(nomeUso, uso, uso.peca, peca, fora, erros);
    if (inst) instancias[nomeUso] = inst;
  }
  if (erros.size) return saida();

  /* O desenho de fora cita a peça só por <uso>.<ligação>. */
  const citacoes = new Set();
  const citarFora = (n) => {
    if (typeof n !== 'string') return n;
    const i = n.indexOf('.');
    if (i <= 0) return n;
    const uso = n.slice(0, i);
    if (!Object.hasOwn(usos, uso)) return n;
    if (!Object.hasOwn(instancias, uso)) return n;
    const lig = n.slice(i + 1);
    if (Object.hasOwn(instancias[uso].ligacoes, lig)) return instancias[uso].ligacoes[lig];
    citacoes.add(`${q(n)}: o uso ${q(uso)} da peça ${q(instancias[uso].peca)} não expõe ${q(lig)}; as ligações dela são ${lista(Object.keys(instancias[uso].ligacoes).sort(porNome))}`);
    return n;
  };

  const resto = Object.fromEntries(Object.entries(d).filter(([k]) => !['parametros', 'pecas', 'usos'].includes(k)));
  const orientadasFora = new Set();
  const corpo = numerosDoCorpo(resto, fora, orientadasFora);
  const orientadas = new Map([...orientadasFora].map((n) => [n, { uso: null, peca: null }]));
  const descricao = { ...corpo };
  if (objeto(corpo.partes)) descricao.partes = Object.fromEntries(Object.entries(corpo.partes).map(([n, p]) => [n, nomesDaParte(p, citarFora, (n) => n)]));
  if (objeto(corpo.construcao)) descricao.construcao = Object.fromEntries(Object.entries(corpo.construcao).map(([n, k]) => [n, nomesDaConstrucao(k, citarFora)]));
  if (Array.isArray(corpo.relacoes)) descricao.relacoes = corpo.relacoes.map((r) => nomesDaRelacaoInteira(r, citarFora));
  if (Array.isArray(corpo.frenteParaFundo)) descricao.frenteParaFundo = corpo.frenteParaFundo.flatMap((n) => (typeof n === 'string' && Object.hasOwn(instancias, n) ? instancias[n].ordem : [citarFora(n)]));
  for (const c of [...citacoes].sort(porNome)) erros.add(c);

  /* Junta o que cada uso trouxe; o nome que já existe é recusado logo abaixo, antes de a descrição seguir. */
  const juntar = (campo, doUso) => {
    if (!Object.keys(doUso).length) return;
    descricao[campo] = { ...(objeto(descricao[campo]) ? descricao[campo] : {}) };
    Object.assign(descricao[campo], doUso);
  };
  const nomesGlobais = new Map();
  for (const nomeUso of Object.keys(instancias).sort(porNome)) {
    const inst = instancias[nomeUso];
    juntar('pontos', inst.pontos);
    juntar('partes', inst.partes);
    juntar('construcao', inst.construcao);
    for (const [n, de] of inst.orientadas) orientadas.set(n, de);
    if (inst.relacoes.length) descricao.relacoes = [...(Array.isArray(descricao.relacoes) ? descricao.relacoes : []), ...inst.relacoes];
    for (const n of inst.declarados) {
      if (nomesGlobais.has(n)) erros.add(`o nome ${q(n)} aparece nos usos ${q(nomesGlobais.get(n))} e ${q(nomeUso)}; confira o "nomeiaPartes" deles`);
      else nomesGlobais.set(n, nomeUso);
    }
  }
  for (const n of nomesGlobais.keys()) if (ocupados.has(n)) erros.add(`o nome ${q(n)}, de uma peça usada, já é o de um ponto, parte ou construção do desenho; renomeie um dos dois`);
  if (erros.size) return saida();

  /* Os parâmetros que algum campo lê, direto ou por outro parâmetro. */
  const usados = new Set();
  const visitar = (n) => {
    if (usados.has(n) || !Object.hasOwn(declarados, n)) return;
    usados.add(n);
    nomesCitados(declarados[n]).forEach(visitar);
  };
  [...fora.citados].forEach(visitar);
  return { erros: [], descricao, parametros: fora.valores, usados, orientadas };
}
