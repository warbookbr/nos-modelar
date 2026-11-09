#!/usr/bin/env node
/* mapa-da-receita.mjs — o mapa de uma receita do acervo, para ler só o trecho que se precisa.
 *
 * `npm run receita:mapa -- <peça>` imprime, numa tela, as seções da `TABELA` (cada uma pela primeira chave e pela frase do
 * comentário que a abre), as funções de cada arquivo da receita agrupadas pelos cabeçalhos `---------- x ----------`, os blocos
 * internos `---- x ----` das funções longas, as entradas de `PLANO.partes` e os blocos de `gerarPassos`, cada item com a linha
 * em que começa. A receita dividida por assunto (`receita.js` mais `receita/<assunto>.js`) entra inteira: o mapa segue os imports
 * relativos que ficam dentro da pasta da peça.
 *
 * Não há segunda fonte. A estrutura vem do texto da receita, lido por um leitor léxico pequeno (comentários, cadeias, modelos,
 * expressões regulares e a profundidade de chaves), e as contagens vêm da receita carregada: as chaves da `TABELA`, as partes do
 * `PLANO` e os `PASSOS` executados, por operação. Cada item citado é um par (linha, nome) em que o nome está escrito na linha, e o
 * teste confere isso para toda receita do acervo, junto com o limite de linhas da saída.
 *
 * Uso: npm run receita:mapa -- <peça>   (node tools/modelar/mapa-da-receita.mjs <peça> [--ajuda]) */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { importarReceita, receitaDoModulo } from './importar-receita.mjs';
import { resolverCaminhoReceita } from './resolver-caminho-receita.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** A saída cabe numa tela: no máximo esta altura e esta largura. */
export const LIMITE_DE_LINHAS = 80;
export const LARGURA = 120;
/** Função com menos linhas que isto vai para a linha compacta do grupo; função com pelo menos LONGA mostra os blocos internos. */
const CURTA = 20;
const LONGA = 100;

const AJUDA = `npm run receita:mapa -- <peça>  (node tools/modelar/mapa-da-receita.mjs)
O mapa da receita numa tela: as seções da TABELA, as funções de cada arquivo (as curtas numa linha por grupo e os blocos
internos das longas), as entradas do PLANO e os blocos de gerarPassos, cada item com a linha onde começa e a frase do
comentário que o antecede. As contagens vêm da receita carregada.

  <peça>    o nome da peça no acervo (furgao-realista, aviao/asas) ou o caminho da receita
  --ajuda   este texto

Leia a receita pelo mapa: abra só o trecho do item que interessa, pela linha que o mapa dá.
`;

/* ---------- o leitor léxico ---------- */

const ANTES_DE_REGEX = new Set(['return', 'typeof', 'case', 'do', 'else', 'in', 'of', 'new', 'delete', 'void', 'throw', 'instanceof', 'yield', 'await']);
const ABRE = { '(': ')', '[': ']', '{': '}' };

/**
 * Os itens léxicos do texto: { tipo: 'comentario' | 'id' | 'num' | 'str' | 'regex' | 'p', valor, linha, prof } e, no comentário,
 * `fim` (a última linha) e `bloco`. `prof` é quantos parênteses, colchetes e chaves estão abertos; o que abre e o que fecha o
 * mesmo par têm a mesma `prof`. Cada parte fixa de um modelo `...` é um `str`, e o `${` dele conta como uma chave aberta.
 */
export function lerItens(texto) {
  const itens = [];
  const pilha = [];
  let i = 0;
  let linha = 1;
  let ultimo = null;
  const n = texto.length;
  const guardar = (item) => { itens.push(item); if (item.tipo !== 'comentario') ultimo = item; };
  const contarLinhas = (de, ate) => { for (let k = de; k < ate; k += 1) if (texto[k] === '\n') linha += 1; };
  /* lê a parte fixa de um modelo a partir de `de` (logo depois do acento grave ou do `}` do `${`) */
  const lerModelo = (de, abre) => {
    let k = de;
    const l0 = linha;
    while (k < n && texto[k] !== '`' && !(texto[k] === '$' && texto[k + 1] === '{')) k += texto[k] === '\\' ? 2 : 1;
    guardar({ tipo: 'str', valor: texto.slice(de, k), linha: l0, prof: pilha.length, modelo: true, abre, fecha: texto[k] === '`' });
    contarLinhas(de, k);
    if (texto[k] === '`') return k + 1;
    pilha.push('${');
    return k + 2;
  };
  while (i < n) {
    const c = texto[i];
    if (c === '\n') { linha += 1; i += 1; continue; }
    if (c === ' ' || c === '\t' || c === '\r') { i += 1; continue; }
    const prof = pilha.length;
    if (c === '/' && texto[i + 1] === '/') {
      const f = texto.indexOf('\n', i) < 0 ? n : texto.indexOf('\n', i);
      guardar({ tipo: 'comentario', valor: texto.slice(i + 2, f), linha, fim: linha, prof, bloco: false });
      i = f;
      continue;
    }
    if (c === '/' && texto[i + 1] === '*') {
      const f = texto.indexOf('*/', i + 2) < 0 ? n : texto.indexOf('*/', i + 2) + 2;
      const l0 = linha;
      contarLinhas(i, f);
      guardar({ tipo: 'comentario', valor: texto.slice(i + 2, f - 2), linha: l0, fim: linha, prof, bloco: true });
      i = f;
      continue;
    }
    if (c === '"' || c === "'") {
      let k = i + 1;
      while (k < n && texto[k] !== c && texto[k] !== '\n') k += texto[k] === '\\' ? 2 : 1;
      guardar({ tipo: 'str', valor: texto.slice(i + 1, k), linha, prof });
      contarLinhas(i, k);
      i = k + 1;
      continue;
    }
    if (c === '`') { i = lerModelo(i + 1, true); continue; }
    if (c === '/') {
      const regex = ultimo === null
        || (ultimo.tipo === 'p' && !')]}'.includes(ultimo.valor))
        || (ultimo.tipo === 'id' && ANTES_DE_REGEX.has(ultimo.valor));
      if (regex) {
        let k = i + 1;
        let classe = false;
        while (k < n && texto[k] !== '\n') {
          if (texto[k] === '\\') { k += 2; continue; }
          if (texto[k] === '[') classe = true;
          else if (texto[k] === ']') classe = false;
          else if (texto[k] === '/' && !classe) break;
          k += 1;
        }
        k += 1;
        while (k < n && /[a-z]/i.test(texto[k])) k += 1;
        guardar({ tipo: 'regex', valor: texto.slice(i, k), linha, prof });
        i = k;
        continue;
      }
    }
    const id = /^[A-Za-z_$À-￿][\w$À-￿]*/.exec(texto.slice(i, i + 200));
    if (id) { guardar({ tipo: 'id', valor: id[0], linha, prof }); i += id[0].length; continue; }
    const num = /^(?:0[xX][\da-fA-F_]+|\d[\d_]*(?:\.\d[\d_]*)?(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)n?/.exec(texto.slice(i, i + 60));
    if (num) { guardar({ tipo: 'num', valor: num[0], linha, prof }); i += num[0].length; continue; }
    if (ABRE[c]) { guardar({ tipo: 'p', valor: c, linha, prof }); pilha.push(c); i += 1; continue; }
    if (c === ')' || c === ']' || c === '}') {
      const topo = pilha.pop();
      if (topo === '${' && c === '}') { i = lerModelo(i + 1, false); continue; }
      guardar({ tipo: 'p', valor: c, linha, prof: pilha.length });
      i += 1;
      continue;
    }
    if (c === '=' && texto[i + 1] === '>') { guardar({ tipo: 'p', valor: '=>', linha, prof }); i += 2; continue; }
    if (c === '.' && texto[i + 1] === '.' && texto[i + 2] === '.') { guardar({ tipo: 'p', valor: '...', linha, prof }); i += 3; continue; }
    guardar({ tipo: 'p', valor: c, linha, prof });
    i += 1;
  }
  return itens;
}

/* ---------- as frases ---------- */

const CABECALHO = /^\s*-{3,}\s*(.+?)\s*(?:-{3,}\s*)?$/;

/** O texto do comentário numa linha só, sem o `*` de cada linha nem o `*` do `/**`. */
function textoDoComentario(c) {
  return c.valor.split('\n').map((l) => l.replace(/^\s*\*+\s?/, '')).join(' ').replace(/\s+/g, ' ').trim();
}

/** A primeira frase de um texto. */
function primeiraFrase(texto) {
  const m = /^(.*?[.;])(?:\s|$)/.exec(texto);
  return (m ? m[1] : texto).trim();
}

/** O nome de um cabeçalho `---- x ----`, até o primeiro dois-pontos ou vírgula quando `curto`. */
function nomeDoCabecalho(c, curto = false) {
  const primeira = c.valor.split('\n')[0];
  const m = CABECALHO.exec(primeira);
  if (!m) return null;
  return curto ? m[1].split(/[:,]/)[0].trim() : m[1];
}

/** Os comentários colados antes do item de índice `k` (sem item de código entre eles e com a última linha logo acima). */
function comentariosAntes(itens, k) {
  const achados = [];
  let linhaSeguinte = itens[k].linha;
  for (let j = k - 1; j >= 0 && itens[j].tipo === 'comentario'; j -= 1) {
    const c = itens[j];
    if (c.fim < linhaSeguinte - 1) break;
    if (j > 0 && itens[j - 1].tipo !== 'comentario' && itens[j - 1].linha === c.linha) break;
    if (nomeDoCabecalho(c)) break;
    achados.unshift(c);
    linhaSeguinte = c.linha;
  }
  return achados;
}

const fraseDe = (comentarios) => primeiraFrase(comentarios.map(textoDoComentario).join(' '));

/* ---------- a estrutura de um arquivo ---------- */

/** O índice do item que fecha o par aberto em `k`. */
function fechamento(itens, k) {
  const fecha = ABRE[itens[k].valor];
  for (let j = k + 1; j < itens.length; j += 1) {
    if (itens[j].tipo === 'p' && itens[j].valor === fecha && itens[j].prof === itens[k].prof) return j;
  }
  return itens.length - 1;
}

/** O próximo item que não é comentário a partir de `k`. */
function proximo(itens, k) {
  let j = k;
  while (j < itens.length && itens[j].tipo === 'comentario') j += 1;
  return j;
}

const ehP = (item, valor) => item?.tipo === 'p' && item.valor === valor;
const ehId = (item, valor) => item?.tipo === 'id' && (valor === undefined || item.valor === valor);

/**
 * As declarações do nível de cima: { nome, linha, fim, funcao, exportada, k (índice do primeiro item), corpo (índice do `{` do
 * corpo da função, quando há), valor (índice do primeiro item depois do `=`) } e os cabeçalhos `---------- x ----------`.
 */
function declaracoes(itens) {
  const lista = [];
  const cabecalhos = [];
  let anterior = null;
  for (let k = 0; k < itens.length; k += 1) {
    const it = itens[k];
    if (it.prof !== 0) continue;
    if (it.tipo === 'comentario') {
      const nome = nomeDoCabecalho(it);
      if (nome) cabecalhos.push({ nome, linha: it.linha, k });
      continue;
    }
    const inicio = anterior === null || ehP(anterior, ';') || ehP(anterior, '}') || anterior.linha < it.linha;
    anterior = it;
    if (!inicio || it.tipo !== 'id') continue;
    let j = k;
    let exportada = false;
    if (ehId(itens[j], 'export')) { exportada = true; j = proximo(itens, j + 1); if (ehId(itens[j], 'default')) continue; }
    if (ehId(itens[j], 'async')) j = proximo(itens, j + 1);
    if (ehId(itens[j], 'function')) {
      j = proximo(itens, j + 1);
      if (ehP(itens[j], '*')) j = proximo(itens, j + 1);
      if (!ehId(itens[j])) continue;
      const nome = itens[j].valor;
      let a = j + 1;
      while (a < itens.length && !ehP(itens[a], '(')) a += 1;
      let corpo = fechamento(itens, a) + 1;
      while (corpo < itens.length && !(ehP(itens[corpo], '{') && itens[corpo].prof === 0)) corpo += 1;
      const fim = fechamento(itens, corpo);
      lista.push({ nome, linha: it.linha, fim: itens[fim].linha, funcao: true, exportada, k, corpo });
      k = fim;
      anterior = itens[fim];
      continue;
    }
    if (!['const', 'let', 'var'].some((p) => ehId(itens[j], p))) continue;
    j = proximo(itens, j + 1);
    if (!ehId(itens[j])) continue;
    const nome = itens[j].valor;
    const igual = proximo(itens, j + 1);
    if (!ehP(itens[igual], '=')) continue;
    const valor = proximo(itens, igual + 1);
    let fim = valor;
    while (fim < itens.length && !(itens[fim].prof === 0 && ehP(itens[fim], ';'))) {
      if (itens[fim].tipo === 'p' && ABRE[itens[fim].valor]) fim = fechamento(itens, fim);
      fim += 1;
    }
    fim = Math.min(fim, itens.length - 1);
    let v = valor;
    if (ehId(itens[v], 'async')) v = proximo(itens, v + 1);
    const funcao = ehId(itens[v], 'function')
      || (ehId(itens[v]) && ehP(itens[proximo(itens, v + 1)], '=>'))
      || (ehP(itens[v], '(') && ehP(itens[proximo(itens, fechamento(itens, v) + 1)], '=>'));
    let corpo = null;
    if (funcao) {
      for (let a = v; a < fim; a += 1) {
        if (ehP(itens[a], '=>') && ehP(itens[proximo(itens, a + 1)], '{')) { corpo = proximo(itens, a + 1); break; }
        if (ehId(itens[a], 'function')) { let b = a; while (!ehP(itens[b], '{')) b += 1; corpo = b; break; }
      }
    }
    lista.push({ nome, linha: it.linha, fim: itens[fim].linha, funcao, exportada, k, corpo, valor });
    k = fim;
    anterior = itens[fim];
  }
  return { lista, cabecalhos };
}

/** Os imports relativos do arquivo que ficam dentro da pasta `raiz`, em ordem. */
function importsLocais(texto, caminho, raiz) {
  const achados = [];
  for (const m of texto.matchAll(/^\s*(?:import|export)\s[^;]*?from\s+['"](\.[^'"]+)['"]/gm)) {
    const alvo = resolve(dirname(caminho), m[1]);
    const rel = relative(raiz, alvo);
    if (!rel.startsWith('..') && existsSync(alvo)) achados.push(alvo);
  }
  return achados;
}

/** Os arquivos da receita: o de entrada e os que ele importa, direta ou indiretamente, de dentro da pasta da peça. */
function arquivosDaReceita(entrada) {
  const raiz = dirname(entrada);
  const ordem = [];
  const fila = [entrada];
  while (fila.length) {
    const caminho = fila.shift();
    if (ordem.includes(caminho)) continue;
    ordem.push(caminho);
    const texto = readFileSync(caminho, 'utf8');
    fila.push(...importsLocais(texto, caminho, raiz));
  }
  return ordem.map((caminho) => {
    const texto = readFileSync(caminho, 'utf8');
    const itens = lerItens(texto);
    const linhas = texto.split('\n');
    if (linhas.at(-1) === '') linhas.pop();
    return { caminho, rel: relative(raiz, caminho).replaceAll('\\', '/'), texto, linhas, itens, ...declaracoes(itens) };
  });
}

/* ---------- as seções ---------- */

/** As chaves de um objeto literal aberto no item `a`: [{ nome, linha, k }] e os comentários do mesmo nível que não são de fim de linha. */
function chavesDoObjeto(itens, a) {
  const fim = fechamento(itens, a);
  const p = itens[a].prof + 1;
  const chaves = [];
  const comentarios = [];
  let anterior = itens[a];
  for (let k = a + 1; k < fim; k += 1) {
    const it = itens[k];
    if (it.prof !== p) continue;
    if (it.tipo === 'comentario') {
      if (anterior.linha !== it.linha || anterior === itens[a]) comentarios.push(k);
      continue;
    }
    if ((it.tipo === 'id' || it.tipo === 'str') && (anterior === itens[a] || ehP(anterior, ','))) {
      const dois = proximo(itens, k + 1);
      if (ehP(itens[dois], ':')) chaves.push({ nome: it.valor, linha: it.linha, k });
    }
    anterior = it;
  }
  return { chaves, comentarios, fim };
}

/** As seções da TABELA: cada grupo de chaves com o comentário que o abre. */
function secoesDaTabela(arquivo, tabelaCarregada) {
  const decl = arquivo.lista.find((d) => d.nome === 'TABELA' && !d.funcao);
  if (!decl || !ehP(arquivo.itens[decl.valor], '{')) return null;
  const { itens } = arquivo;
  const { chaves, comentarios, fim } = chavesDoObjeto(itens, decl.valor);
  const secoes = [];
  let pendentes = [];
  let ci = 0;
  for (const chave of chaves) {
    const antes = [];
    while (ci < comentarios.length && comentarios[ci] < chave.k) { antes.push(itens[comentarios[ci]]); ci += 1; }
    if (antes.length) pendentes = antes;
    if (pendentes.length || !secoes.length) {
      secoes.push({ linha: chave.linha, nome: chave.nome, frase: pendentes.length ? fraseDe(pendentes) : '', chaves: [] });
      pendentes = [];
    }
    secoes.at(-1).chaves.push(chave.nome);
  }
  const doTexto = new Set(chaves.map((c) => c.nome));
  const carregadas = Object.keys(tabelaCarregada ?? {});
  return {
    linha: decl.linha,
    fim: itens[fim].linha,
    secoes,
    chavesNoTexto: chaves.length,
    chavesCarregadas: carregadas.length,
    soCarregadas: carregadas.filter((c) => !doTexto.has(c)).length,
  };
}

/** O que um trecho de itens nomeia: os textos de `nome:` dele (literais e modelos), como expressões regulares de nome de parte. */
function padroesDeNome(itens, de, ate) {
  const padroes = [];
  for (let k = de; k < ate; k += 1) {
    const it = itens[k];
    if (it.tipo !== 'str') continue;
    if (!it.modelo) { padroes.push(it.valor); continue; }
    if (!it.abre) continue;
    /* o modelo `a${x}b` vem em partes fixas, da que abre à que fecha, no mesmo nível: o `${x}` vira o separador */
    const partes = [it.valor];
    let j = k;
    while (!itens[j].fecha && j + 1 < itens.length) {
      j += 1;
      if (itens[j].tipo === 'str' && itens[j].modelo && itens[j].prof === it.prof) partes.push(itens[j].valor);
    }
    padroes.push(partes.join('\u0000'));
    k = j;
  }
  return padroes;
}

const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const casador = (padroes) => {
  const alternativas = padroes.filter(Boolean).map((p) => p.split('\u0000').map(escapar).join('.+'));
  return alternativas.length ? new RegExp(`^(?:${alternativas.join('|')})$`) : null;
};

/** As entradas de `PLANO.partes`, cada uma com o nome escrito e a linha, e as partes carregadas que cada uma dá. */
function entradasDoPlano(arquivos, planoCarregado) {
  for (const arquivo of arquivos) {
    const { itens } = arquivo;
    const kPlano = itens.findIndex((it, k) => ehId(it, 'PLANO') && ehP(itens[proximo(itens, k + 1)], ':')
      && ehP(itens[proximo(itens, proximo(itens, k + 1) + 1)], '{'));
    if (kPlano < 0) continue;
    const aPlano = proximo(itens, proximo(itens, kPlano + 1) + 1);
    const { chaves } = chavesDoObjeto(itens, aPlano);
    const partes = chaves.find((c) => c.nome === 'partes')
      ?? (() => {
        /* `get partes() { ... }`: o getter conta como a chave */
        const k = itens.findIndex((it, j) => j > aPlano && ehId(it, 'partes') && ehId(itens[j - 1], 'get') && it.prof === itens[aPlano].prof + 1);
        return k < 0 ? null : { nome: 'partes', linha: itens[k].linha, k, getter: true };
      })();
    const nomes = (planoCarregado?.partes ?? []).map((pt) => pt?.nome).filter(Boolean);
    const entradas = [];
    if (partes) {
      const aLista = proximo(itens, proximo(itens, partes.k + 1) + 1);
      if (partes.getter || !ehP(itens[aLista], '[')) {
        /* a lista vem de uma expressão (`NOMES.map(...)`, um getter): a chave é a entrada de todas as partes */
        entradas.push({ arquivo: arquivo.rel, linha: partes.linha, nome: 'partes', escrito: 'partes', mais: 0, casa: /^/, n: 0 });
      } else {
        const fimLista = fechamento(itens, aLista);
        const p = itens[aLista].prof + 1;
        let de = aLista + 1;
        for (let k = aLista + 1; k <= fimLista; k += 1) {
          if (k < fimLista && !(itens[k].prof === p && ehP(itens[k], ','))) continue;
          const a = proximo(itens, de);
          if (a < k) entradas.push(entradaDoPlano(arquivo, a, k, new Set(nomes), arquivos));
          de = k + 1;
        }
      }
    }
    /* as partes carregadas, em ordem, vão para a entrada cujo nome casa, sem voltar atrás */
    let atual = 0;
    let semEntrada = 0;
    for (const nome of nomes) {
      let j = atual;
      while (j < entradas.length && !entradas[j].casa?.test(nome)) j += 1;
      if (j < entradas.length) { entradas[j].n += 1; atual = j; } else semEntrada += 1;
    }
    const empurrar = arquivos.flatMap((a) => a.linhas.map((l, i) => ({ arquivo: a.rel, linha: i + 1, l })))
      .find(({ l }) => /PLANO\.partes\.push/.test(l));
    return {
      arquivo: arquivo.rel,
      linha: itens[kPlano].linha,
      partes: nomes.length,
      entradas,
      semEntrada,
      empurrar: empurrar ? { arquivo: empurrar.arquivo, linha: empurrar.linha, nome: 'PLANO.partes.push' } : null,
    };
  }
  return null;
}

/** Uma entrada da lista de partes, de `a` até antes de `b`: o nome literal, o modelo ou a lista espalhada. */
function entradaDoPlano(arquivo, a, b, carregados, arquivos) {
  const { itens } = arquivo;
  /* os `nome:` da entrada */
  const nomes = [];
  for (let k = a; k < b; k += 1) {
    if (!ehId(itens[k], 'nome') || !ehP(itens[proximo(itens, k + 1)], ':')) continue;
    const v = proximo(itens, proximo(itens, k + 1) + 1);
    if (itens[v].tipo === 'str') nomes.push({ k: v, fim: itens[v].modelo ? b : v + 1 });
  }
  if (nomes.length) {
    const padroes = nomes.flatMap(({ k, fim }) => padroesDeNome(itens, k, itens[k].modelo ? fim : k + 1).slice(0, 1));
    const primeiro = itens[nomes[0].k];
    const nome = padroes[0].replaceAll('\u0000', '${…}');
    const escrito = (primeiro.modelo ? padroes[0].split('\u0000')[0] : padroes[0]) || 'nome';
    return { arquivo: arquivo.rel, linha: primeiro.linha, nome, escrito, mais: nomes.length - 1, casa: casador(padroes), n: 0 };
  }
  /* a lista espalhada: `...LISTA.map(...)` com o nome curto `{ nome, ... }`; o que a LISTA nomeia está na declaração dela */
  if (ehP(itens[a], '...') && ehId(itens[proximo(itens, a + 1)])) {
    const id = itens[proximo(itens, a + 1)];
    /* a declaração da LISTA, neste arquivo ou noutro da receita */
    const dono = [arquivo, ...arquivos].find((x) => x.lista.some((d) => d.nome === id.valor && !d.funcao));
    let casa = null;
    if (dono) {
      const decl = dono.lista.find((d) => d.nome === id.valor && !d.funcao);
      const fim = dono.itens.findIndex((it, k) => k > decl.k && it.linha > decl.fim);
      casa = casador(padroesDeNome(dono.itens, decl.valor ?? decl.k, fim < 0 ? dono.itens.length : fim));
    }
    if (casa) return { arquivo: arquivo.rel, linha: id.linha, nome: id.valor, escrito: id.valor, mais: 0, casa, n: 0 };
  }
  /* o resto (`...[['a', 'x'], ['b', 'y']].map(...)`): os textos da entrada, e o primeiro que é nome de parte carregada */
  const literal = itens.slice(a, b).find((it) => it.tipo === 'str' && !it.modelo && carregados.has(it.valor));
  const casa = casador(padroesDeNome(itens, a, b));
  if (literal) return { arquivo: arquivo.rel, linha: literal.linha, nome: literal.valor, escrito: literal.valor, mais: 0, casa, n: 0 };
  return { arquivo: arquivo.rel, linha: itens[a].linha, nome: itens[a].valor, escrito: itens[a].valor, mais: 0, casa, n: 0 };
}

/** A cabeça de uma instrução: o nome declarado, ou o primeiro nome com o método chamado (`plastico.forEach`). */
function cabecaDaInstrucao(itens, k) {
  let j = k;
  if (['const', 'let', 'var'].some((p) => ehId(itens[j], p))) {
    j = proximo(itens, j + 1);
    /* na desestruturação, o que é desestruturado: `const { a, b } = derivar(T)` dá `derivar` */
    if (ehP(itens[j], '{') || ehP(itens[j], '[')) {
      j = proximo(itens, proximo(itens, fechamento(itens, j) + 1) + 1);
      if (ehId(itens[j])) return itens[j].valor;
    }
    while (j < itens.length && !ehId(itens[j])) j += 1;
    return itens[j]?.valor ?? itens[k].valor;
  }
  if (ehId(itens[j]) && ehP(itens[j + 1], '.') && ehId(itens[j + 2]) && itens[j + 2].linha === itens[j].linha) {
    return `${itens[j].valor}.${itens[j + 2].valor}`;
  }
  return itens[j].valor;
}

/** Os blocos do corpo de uma função (o `{` em `corpo`): um a cada comentário, e um a cada laço depois de outro laço. */
function blocosDoCorpo(arquivo, corpo) {
  const { itens } = arquivo;
  const fim = fechamento(itens, corpo);
  const p = itens[corpo].prof + 1;
  const blocos = [];
  let inicio = true;
  for (let k = corpo + 1; k < fim; k += 1) {
    const it = itens[k];
    if (it.prof !== p) continue;
    if (it.tipo === 'comentario') continue;
    if (ehP(it, ';')) { inicio = true; continue; }
    if (ehP(it, '}')) { inicio = true; continue; }
    if (!inicio) continue;
    inicio = false;
    if (ehId(it, 'else') || ehId(it, 'return')) continue;
    /* o fim da instrução: o `;` ou o `}` do mesmo nível */
    let f = k;
    while (f < fim && !(itens[f].prof === p && (ehP(itens[f], ';') || (ehP(itens[f], '}') && f > k)))) f += 1;
    /* laço é o `for`, o `while` ou a instrução que chama `forEach`, `map` ou `flatMap` sem guardar o resultado */
    const declara = ['const', 'let', 'var'].some((d) => ehId(it, d));
    const laco = ehId(it, 'for') || ehId(it, 'while')
      || (!declara && itens.slice(k, f).some((x) => x.prof === p && ehId(x) && ['forEach', 'map', 'flatMap'].includes(x.valor)));
    const comentarios = comentariosAntes(itens, k).filter((c) => c.prof === p);
    if (comentarios.length || !blocos.length || (laco && blocos.at(-1).laco)) {
      blocos.push({ arquivo: arquivo.rel, linha: it.linha, nome: cabecaDaInstrucao(itens, k), frase: comentarios.length ? fraseDe(comentarios) : '', laco });
    } else if (laco) {
      blocos.at(-1).laco = true;
    }
  }
  return blocos;
}

/** Os cabeçalhos `---- x ----` dentro do corpo de uma função. */
function cabecalhosDoCorpo(arquivo, corpo) {
  const { itens } = arquivo;
  const fim = fechamento(itens, corpo);
  const p = itens[corpo].prof + 1;
  const achados = [];
  for (let k = corpo + 1; k < fim; k += 1) {
    if (itens[k].tipo !== 'comentario' || itens[k].prof !== p) continue;
    const nome = nomeDoCabecalho(itens[k], true);
    if (nome) achados.push({ arquivo: arquivo.rel, linha: itens[k].linha, nome });
  }
  return achados;
}

/* ---------- o mapa ---------- */

/** As funções de um arquivo por grupo de cabeçalho, com a frase de cada uma e os blocos internos das longas. */
function funcoesDoArquivo(arquivo) {
  const grupos = [{ nome: '', linha: 0, funcoes: [] }];
  const cabecalhos = [...arquivo.cabecalhos];
  for (const d of arquivo.lista) {
    while (cabecalhos.length && cabecalhos[0].linha < d.linha) {
      const c = cabecalhos.shift();
      grupos.push({ nome: c.nome, linha: c.linha, funcoes: [] });
    }
    if (!d.funcao) continue;
    const tamanho = d.fim - d.linha + 1;
    const funcao = {
      arquivo: arquivo.rel,
      linha: d.linha,
      nome: d.nome,
      tamanho,
      frase: fraseDe(comentariosAntes(arquivo.itens, d.k)),
      blocos: tamanho >= LONGA && d.corpo !== null ? cabecalhosDoCorpo(arquivo, d.corpo) : [],
    };
    grupos.at(-1).funcoes.push(funcao);
  }
  return grupos.filter((g) => g.funcoes.length);
}

/** Os valores exportados do nível de cima que não são a TABELA nem função, e o objeto da receita. */
function valoresDoArquivo(arquivo) {
  const exportaPadrao = /^export default (\w+)/m.exec(arquivo.texto)?.[1];
  return arquivo.lista
    .filter((d) => !d.funcao && d.nome !== 'TABELA' && (d.exportada || d.nome === exportaPadrao))
    .map((d) => ({ arquivo: arquivo.rel, linha: d.linha, nome: d.nome }));
}

/** Os PASSOS carregados, por operação. */
function resumoDosPassos(passos) {
  const porOperacao = new Map();
  for (const passo of passos) {
    const op = Array.isArray(passo) ? passo[0] : passo?.op;
    porOperacao.set(op, (porOperacao.get(op) ?? 0) + 1);
  }
  return { total: passos.length, porOperacao: [...porOperacao].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]))) };
}

/**
 * mapaDaReceita(peça) -> { peca, entrada, arquivos, tabela, funcoes, valores, plano, passos, citacoes }. `citacoes` lista todo item
 * citado como { arquivo, linha, nome }, em que `nome` está escrito na linha (o teste confere).
 */
export async function mapaDaReceita(peca, { raiz = REPO } = {}) {
  const entrada = resolverCaminhoReceita(peca, { raiz });
  const modulo = await importarReceita(entrada);
  const receita = receitaDoModulo(modulo);
  const tabelaCarregada = modulo.TABELA ?? receita?.PARAMS ?? null;
  const passosCarregados = receita?.PASSOS ?? [];
  const arquivos = arquivosDaReceita(entrada);

  const tabela = arquivos.map((a) => ({ arquivo: a.rel, ...secoesDaTabela(a, tabelaCarregada) })).find((t) => t.secoes) ?? null;
  const funcoes = arquivos.map((a) => ({ arquivo: a.rel, linhas: a.linhas.length, grupos: funcoesDoArquivo(a) }));
  const valores = arquivos.flatMap(valoresDoArquivo);
  const plano = entradasDoPlano(arquivos, receita?.PLANO);
  let passos = null;
  for (const a of arquivos) {
    const gerar = a.lista.find((d) => d.funcao && d.nome === 'gerarPassos' && d.corpo !== null);
    if (gerar) { passos = { arquivo: a.rel, linha: gerar.linha, nome: gerar.nome, blocos: blocosDoCorpo(a, gerar.corpo) }; break; }
  }
  const resumo = resumoDosPassos(Array.isArray(passosCarregados) ? passosCarregados : []);
  const partesNosPassos = new Set((Array.isArray(passosCarregados) ? passosCarregados : [])
    .filter((p) => Array.isArray(p) && p[0] === 'parte').map((p) => p[1]?.nome)).size;

  const citacoes = [];
  const citar = (arquivo, linha, nome) => citacoes.push({ arquivo, linha, nome });
  if (tabela) for (const s of tabela.secoes) citar(tabela.arquivo, s.linha, s.nome);
  for (const f of funcoes) {
    for (const g of f.grupos) {
      if (g.nome) citar(f.arquivo, g.linha, g.nome);
      for (const fn of g.funcoes) { citar(fn.arquivo, fn.linha, fn.nome); for (const b of fn.blocos) citar(b.arquivo, b.linha, b.nome); }
    }
  }
  for (const v of valores) citar(v.arquivo, v.linha, v.nome);
  if (plano) {
    citar(plano.arquivo, plano.linha, 'PLANO');
    for (const e of plano.entradas) citar(e.arquivo, e.linha, e.escrito);
    if (plano.empurrar) citar(plano.empurrar.arquivo, plano.empurrar.linha, plano.empurrar.nome);
  }
  if (passos) { citar(passos.arquivo, passos.linha, passos.nome); for (const b of passos.blocos) citar(b.arquivo, b.linha, b.nome); }

  return {
    peca,
    entrada: relative(raiz, entrada).replaceAll('\\', '/'),
    arquivos: arquivos.map((a) => ({ rel: a.rel, caminho: a.caminho, linhas: a.linhas.length })),
    tabela,
    funcoes,
    valores,
    plano,
    passos: passos ? { ...passos, ...resumo, partes: partesNosPassos } : { ...resumo, partes: partesNosPassos, blocos: [] },
    citacoes,
  };
}

/* ---------- o texto ---------- */

const cortar = (texto, largura) => (texto.length <= largura ? texto : `${texto.slice(0, Math.max(0, largura - 1))}…`);

/** Uma lista de itens curtos, quebrada em linhas de no máximo LARGURA, a primeira com `prefixo` e as outras recuadas. */
function linhasCompactas(prefixo, itens, recuo = '      ') {
  const saida = [];
  let atual = prefixo;
  for (const [i, item] of itens.entries()) {
    const peca = (i === 0 ? '' : ' · ') + item;
    if (atual.length + peca.length > LARGURA && atual.trim().length) {
      saida.push(atual.trimEnd());
      atual = recuo + item;
    } else {
      atual += peca;
    }
  }
  if (atual.trim().length) saida.push(atual.trimEnd());
  return saida;
}

const comFrase = (inicio, frase) => cortar(frase ? `${inicio}: ${frase}` : inicio, LARGURA);

/**
 * O mapa em texto, numa tela. Quando a forma completa passa de LIMITE_DE_LINHAS, a seguinte junta mais funções na linha das curtas
 * e põe numa linha só os blocos de PASSOS sem comentário, a seguinte lista as seções da TABELA corridas, sem a frase de cada uma,
 * e a última conta os valores de cada arquivo em vez de listá-los e põe todos os blocos de PASSOS corridos, sem a frase (o furgão
 * realista, com 111 partes, passou das outras em 2026-11-09); a primeira que cabe é a que sai.
 */
export function formatarMapa(mapa) {
  const formas = [
    { curta: CURTA, passosCompactos: false },
    { curta: CURTA, passosCompactos: true },
    { curta: 2 * CURTA, passosCompactos: true },
    { curta: 2 * CURTA, passosCompactos: true, tabelaCompacta: true },
    { curta: 2 * CURTA, passosCompactos: true, tabelaCompacta: true, valoresContados: true, passosSemFrase: true },
  ];
  let texto = '';
  for (const forma of formas) {
    texto = formatarNaForma(mapa, forma);
    if (texto.split('\n').length - 1 <= LIMITE_DE_LINHAS) break;
  }
  return texto;
}

function formatarNaForma(mapa, { curta, passosCompactos, tabelaCompacta = false, valoresContados = false, passosSemFrase = false }) {
  const saida = [];
  const multi = mapa.arquivos.length > 1;
  const onde = (arquivo) => (multi ? `${arquivo} ` : '');
  const [principal, ...assuntos] = mapa.arquivos;
  const deAssunto = assuntos.length
    ? `, e ${assuntos.length} arquivos de assunto, ${assuntos.reduce((s, a) => s + a.linhas, 0)} linhas`
    : '';
  saida.push(cortar(`${mapa.peca}: ${mapa.entrada}, ${principal.linhas} linhas${deAssunto}`, LARGURA));

  if (mapa.tabela) {
    const t = mapa.tabela;
    const diferenca = t.soCarregadas ? `, ${t.soCarregadas} só na carregada` : '';
    saida.push(`TABELA ${onde(t.arquivo)}${t.linha}–${t.fim}: ${t.chavesCarregadas} chaves em ${t.secoes.length} seções${diferenca}`);
    const mais = (s) => (s.chaves.length > 1 ? ` +${s.chaves.length - 1}` : '');
    if (tabelaCompacta) saida.push(...linhasCompactas('  seções: ', t.secoes.map((s) => `${s.linha} ${s.nome}${mais(s)}`)));
    else for (const s of t.secoes) saida.push(comFrase(`${String(s.linha).padStart(6)} ${s.nome}${mais(s)}`, s.frase));
  }

  saida.push(`funções, por cabeçalho; as de menos de ${curta} linhas na linha dele`);
  for (const f of mapa.funcoes) {
    /* na receita dividida, o nome do arquivo abre a linha do primeiro grupo dele */
    const doArquivo = multi ? `  ${f.arquivo} (${f.linhas})` : '';
    if (multi && !f.grupos.length) saida.push(doArquivo);
    for (const [gi, g] of f.grupos.entries()) {
      const curtas = g.funcoes.filter((fn) => fn.tamanho < curta).map((fn) => `${fn.linha} ${fn.nome}`);
      const abre = gi === 0 && multi ? `${doArquivo} ──` : '  ──';
      const cabeca = g.nome ? `${abre} ${g.linha} ${cortar(g.nome, 50)}` : abre;
      if (curtas.length) saida.push(...linhasCompactas(`${cabeca}${g.nome ? ';' : ''} curtas: `, curtas));
      else saida.push(cabeca);
      for (const fn of g.funcoes.filter((x) => x.tamanho >= curta)) {
        saida.push(comFrase(`${String(fn.linha).padStart(6)} ${fn.nome} (${fn.tamanho})`, fn.frase));
        if (fn.blocos.length) saida.push(...linhasCompactas('         blocos: ', fn.blocos.map((b) => `${b.linha} ${cortar(b.nome, 36)}`), '         '));
      }
    }
    const valores = mapa.valores.filter((v) => v.arquivo === f.arquivo).map((v) => `${v.linha} ${v.nome}`);
    if (multi && valores.length && valoresContados) saida.push(`     valores: ${valores.length}, de ${valores[0]} a ${valores.at(-1)}`);
    else if (multi && valores.length) saida.push(...linhasCompactas('     valores: ', valores, '         '));
  }
  if (!multi && mapa.valores.length) saida.push(...linhasCompactas('valores: ', mapa.valores.map((v) => `${v.linha} ${v.nome}`)));

  if (mapa.plano) {
    const p = mapa.plano;
    const entradas = p.entradas.map((e) => `${e.linha} ${e.nome}${e.mais ? ` +${e.mais}` : ''}${e.n > 1 ? ` ×${e.n}` : ''}`);
    if (p.semEntrada && p.empurrar) entradas.push(`${p.empurrar.linha} ${p.empurrar.nome} ×${p.semEntrada}`);
    else if (p.semEntrada) entradas.push(`${p.semEntrada} sem entrada no texto`);
    saida.push(...linhasCompactas(`PLANO ${onde(p.arquivo)}${p.linha}, ${p.partes} partes: `, entradas));
  }

  const ps = mapa.passos;
  const ops = ps.porOperacao.slice(0, 6).map(([op, n]) => `${op} ${n}`).join(', ');
  const resto = ps.porOperacao.length > 6 ? ', …' : '';
  const cabecaPassos = ps.linha ? `PASSOS ${onde(ps.arquivo)}${ps.linha} ${ps.nome}` : 'PASSOS';
  saida.push(cortar(`${cabecaPassos}: ${ps.total} passos, ${ps.partes} partes (${ops}${resto})`, LARGURA));
  const semFrase = passosSemFrase ? ps.blocos : passosCompactos ? ps.blocos.filter((b) => !b.frase) : [];
  for (const b of ps.blocos.filter((x) => !semFrase.includes(x))) saida.push(comFrase(`${String(b.linha).padStart(6)} ${b.nome}`, b.frase));
  if (semFrase.length) saida.push(...linhasCompactas(passosSemFrase ? '  blocos: ' : '  sem comentário: ', semFrase.map((b) => `${b.linha} ${b.nome}`)));
  return `${saida.join('\n')}\n`;
}

/* ---------- a linha de comando ---------- */

export async function executar(argv) {
  let lido;
  try {
    lido = lerArgumentos(argv, { bandeiras: ['ajuda'], posicional: { nome: 'a peça', obrigatorio: false } });
  } catch (erro) {
    return { codigo: 2, stdout: '', stderr: `receita:mapa: ${erro.message}\n${AJUDA}` };
  }
  if (lido.bandeira('ajuda')) return { codigo: 0, stdout: AJUDA, stderr: '' };
  if (!lido.posicional) return { codigo: 2, stdout: '', stderr: `receita:mapa: diga a peça.\n${AJUDA}` };
  try {
    return { codigo: 0, stdout: formatarMapa(await mapaDaReceita(lido.posicional)), stderr: '' };
  } catch (erro) {
    return { codigo: 2, stdout: '', stderr: `receita:mapa: ${erro.message}\n` };
  }
}

const executadoComoCLI = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const r = await executar(process.argv.slice(2));
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  process.exitCode = r.codigo;
}

