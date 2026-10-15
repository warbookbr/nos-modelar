#!/usr/bin/env node
/* receita-planejada.mjs — grava a receita planejada de uma peça a partir de uma unidade do esboço aprovado.
 *
 * POR QUE ELE EXISTE. No avião, cada peça começou de uma receita planejada que quem conduz escreveu à mão (`meta`, `PLANO`, `REFINA`,
 * contatos, formas e `PASSOS: []`), e o modelador dos trens principais gastou perto de cem dos 110 comandos de terminal em `ls`, `grep`,
 * `sed`, `cat` e scripts para garimpar no JSON do esboço as medidas, os parâmetros e os pontos de cada forma e copiá-los para a `TABELA`
 * e os `PONTOS`. Esse trabalho é mecânico, igual em toda peça e todo objeto, e quem o faz à mão erra de transcrição. Este comando lê a
 * unidade do esboço pelo módulo `modulos/esboco` (as formas resolvidas, a mesma leitura do `REFINA.esboco`) e escreve o que o esboço diz.
 *
 * O QUE ELE ESCREVE, e de onde vem cada coisa.
 *  - `TABELA`, em milímetro e no quadro do esboço: os parâmetros e os pontos nomeados que a unidade usa (com o fecho de quem depende de quem),
 *    as medidas e a posição de cada forma, as chamadas de família (`roda-pneu`, `superficie-aerodinamica`) com os parâmetros resolvidos, os
 *    cortadores e o espelho. O comentário ao lado de cada número é o parâmetro, o ponto ou a expressão do esboço de onde ele veio.
 *  - `PONTOS`, no formato de `conferir-pontos`: o mínimo e o máximo da caixa de cada parte, como o esboço a resolve.
 *  - `REFINA`: o volume do andaime e a forma do esboço de cada parte, o arquivo, a opção e o mínimo de 0,95.
 *  - `contatos`: os pares de formas da unidade que se tocam no esboço, medidos sobre o sólido (a mesma medida que `contatosDaPeca` aplica).
 *  - `formas` (a topologia prometida), só onde o esboço a diz: caixa, cilindro e o resto sem furo e sem recorte são `solido`, o anel é um
 *    furo. O que vem de família, de recorte ou de casca fica sem declaração.
 *  - `PLANO`: as partes, uma por forma da unidade, com a forma e a técnica que o esboço permite dizer, e a escala (o maior lado da unidade).
 *  - `PASSOS: []`.
 *  - o alvo: a composta da unidade, gerada agora pela ferramenta do esboço (`gerarCompostaDaUnidade`, de `vistas-para-critica.mjs`, o
 *    mesmo código do pacote do crítico), em `alvo/` ao lado da receita.
 *
 * O QUE ELE NÃO INVENTA. O texto do objeto, as referências (imagens que só quem conduz escolhe) e os critérios de reprovação saem VAZIOS.
 * Vazio é o jeito de marcar: o normalizador do `PLANO` (`normalizarPlanoDeModelagem`) recusa `objeto` vazio e lista vazia, e por isso a
 * receita não passa por `descrever` enquanto quem conduz não escrever os três. Um texto de preencher que passasse na validação
 * (`'A ESCREVER'`) deixaria a receita correr limpa com o plano por fazer. A função que o esboço dá à unidade (`unidades.<u>.funcao`) vai
 * em comentário acima do campo, como ponto de partida, e não como texto do plano.
 *
 * O QUE ELE RECUSA. Gravar sobre uma receita que já tem passos. Uma receita planejada anterior (`PASSOS: []`) é regravada, e o comando
 * diz que o fez. Com `--saida` ele escreve numa árvore espelho (`<saida>/<objeto>/partes/<peça>/receita.js`) e não toca `procedural/pecas`.
 *
 *   npm run receita:planejada -- <esboço.esboco.json> --unidade <unidade> --peca <objeto>/<peça> [--saida <pasta>] [--opcao <n>]
 *       [--andaime <andaime.json>] [--referencia <imagem[,imagem]>] [--minimo 0.95] [--tolerancia-pontos 1] [--sem-alvo]
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { lerArgumentos } from './argumentos.mjs';
import { formasDoEsboco } from './esboco-solido.mjs';
import { gerarCompostaDaUnidade } from './vistas-para-critica.mjs';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { resolverOpcao } from '../../modulos/esboco/src/index.js';
import { medirPar, pecasDe } from '../../modulos/esboco/src/contato.js';
import { slugDe } from '../../src/autoria/tradutor-nivel-zero.js';
import { criarResolverNumerico } from '../../procedural/nucleo/expressoes.js';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export const MINIMO_PADRAO = 0.95;
export const TOLERANCIA_DOS_PONTOS_PADRAO = 1;
export const TOLERANCIA_DO_ENVELOPE = 5;
export const TOLERANCIA_DA_PORTA = 0.5;
/* Duas formas se tocam quando a folga entre os sólidos é esta ou menor, a mesma lei de `contatosDaPeca` (que mede a tolerância numérica
   de 1e-9 m) e do gate de contato do esboço (`distanciaConvexa > 1e-7` é folga). */
const FOLGA_DE_CONTATO = 1e-7;
const LARGURA_DA_LINHA = 118;
const LIMITE_DO_TEXTO = 240;

const falhar = (mensagem) => { throw new Error(`receita-planejada: ${mensagem}`); };

/* ---------- números e texto ---------- */

const arredondar = (x) => { const v = Number(Number(x).toPrecision(12)); return Object.is(v, -0) ? 0 : v; };
const virgula = (x) => String(arredondar(x)).replace('.', ',');
const mm1 = (x) => virgula(Math.round(x * 10) / 10);
const limitar = (texto) => (texto.length <= LIMITE_DO_TEXTO ? texto : `${texto.slice(0, LIMITE_DO_TEXTO - 1).trimEnd()}…`);

/** O nome de uma parte a partir do id da forma: o id do passo `parte` não leva ponto, hífen nem sublinhado (`deriva.fin` vira `derivaFin`). */
export function nomeDaParte(id) {
  const nome = String(id).replace(/[^A-Za-z0-9]+([A-Za-z0-9])/g, (_, c) => c.toUpperCase()).replace(/[^A-Za-z0-9]/g, '');
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(nome)) falhar(`o id de forma '${id}' não dá um nome de parte (letras e dígitos, começando por letra)`);
  return nome;
}

/* ---------- a escrita do JavaScript ---------- */

/** Um valor com a nota que vai ao lado dele, em comentário. */
class Nota {
  constructor(valor, nota) { this.valor = valor; this.nota = nota; }
}
export const comNota = (valor, nota) => (nota ? new Nota(valor, String(nota).replace(/\s+/g, ' ')) : valor);
/** Um trecho de JavaScript escrito como está (o nome de uma constante do arquivo). */
class Cru {
  constructor(js) { this.js = js; }
}

const literal = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`;
const chaveDe = (k) => (/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(k) ? k : literal(k));
const crua = (v) => (v instanceof Nota ? v.valor : v);

/** O JavaScript de um valor, em `nivel` de recuo (dois espaços por nível). Objeto com nota, ou comprido, ocupa uma linha por campo. */
export function escrever(valor, nivel = 0, largura = LARGURA_DA_LINHA) {
  const v = crua(valor);
  const recuo = '  '.repeat(nivel);
  if (v === null) return 'null';
  if (v instanceof Cru) return v.js;
  if (typeof v === 'number') return String(arredondar(v));
  if (typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return literal(v);
  if (Array.isArray(v)) {
    const itens = v.map((x) => escrever(x, nivel + 1, largura));
    const tudoSimples = v.every((x) => ['number', 'string', 'boolean'].includes(typeof crua(x)) || crua(x) === null);
    const linha = `[${itens.join(', ')}]`;
    if (!linha.includes('\n') && (tudoSimples || recuo.length + linha.length <= largura) && !v.some((x) => x instanceof Nota)) return linha;
    return `[\n${v.map((x, i) => `${recuo}  ${itens[i]},${x instanceof Nota ? ` // ${x.nota}` : ''}`).join('\n')}\n${recuo}]`;
  }
  const entradas = Object.entries(v).filter(([, x]) => x !== undefined);
  const textos = entradas.map(([k, x]) => `${chaveDe(k)}: ${escrever(x, nivel + 1, largura)}`);
  const linha = `{ ${textos.join(', ')} }`;
  if (entradas.length === 0) return '{}';
  if (!linha.includes('\n') && recuo.length + linha.length <= largura && !entradas.some(([, x]) => x instanceof Nota)) return linha;
  const linhas = entradas.map(([, x], i) => {
    const texto = textos[i];
    if (!(x instanceof Nota)) return `${recuo}  ${texto},`;
    const [primeira, ...resto] = texto.split('\n');
    if (resto.length === 0) return `${recuo}  ${primeira}, // ${x.nota}`;
    return [`${recuo}  ${primeira} // ${x.nota}`, ...resto.slice(0, -1), `${resto.at(-1)},`].join('\n');
  });
  return `{\n${linhas.join('\n')}\n${recuo}}`;
}

/* ---------- a leitura da unidade ---------- */

const ehObjeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const FUNCOES_DA_EXPRESSAO = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sqrt', 'abs', 'min', 'max', 'pow', 'exp', 'log', 'floor', 'ceil', 'round', 'pi']);

function coletarNomes(valor, saida) {
  if (typeof valor === 'string') for (const m of valor.matchAll(/[A-Za-z_][A-Za-z0-9_]*/g)) saida.add(m[0]);
  else if (Array.isArray(valor)) for (const x of valor) coletarNomes(x, saida);
  else if (ehObjeto(valor)) for (const x of Object.values(valor)) coletarNomes(x, saida);
  return saida;
}

/** A expressão crua de um ponto do esboço, em texto: o nome, a lista de coordenadas ou o `entre` com o recuo. */
export function descreverPontoCru(cru) {
  if (typeof cru === 'string') return cru;
  if (Array.isArray(cru)) return `[${cru.map(descreverPontoCru).join(', ')}]`;
  if (ehObjeto(cru) && Array.isArray(cru.entre)) {
    const extras = [cru.mmAntes !== undefined ? `${cru.mmAntes} mm antes` : null, cru.t !== undefined ? `t ${cru.t}` : null].filter(Boolean);
    return `entre(${cru.entre.join(', ')})${extras.length ? `, ${extras.join(', ')}` : ''}`;
  }
  return typeof cru === 'number' ? String(cru) : JSON.stringify(cru);
}

const temTexto = (cru) => (typeof cru === 'string') || (Array.isArray(cru) && cru.some(temTexto)) || (ehObjeto(cru) && Object.values(cru).some(temTexto));

/**
 * Lê a unidade do esboço: as formas resolvidas (a leitura do `REFINA.esboco`), o esboço expandido e o escrito. `bruto` é o JSON lido.
 * Devolve `{ dados, opcao, indice, unidade, partes, cortadores, espelhos, escritas, expandidas, parametrosCrus, pontosCrus, unidades }`.
 */
export function lerUnidade({ bruto, unidade, opcao = 1 }) {
  const dados = formasDoEsboco(bruto, opcao);
  const indice = dados.opcao.numero - 1;
  const expandido = expandirEsboco(bruto);
  const o = expandido.opcoes[indice];
  const escritas = new Map((bruto.opcoes?.[indice]?.formas ?? bruto.formas ?? []).filter((f) => ehObjeto(f) && typeof f.id === 'string').map((f) => [f.id, f]));
  const expandidas = new Map((o.formas ?? []).filter((f) => ehObjeto(f) && typeof f.id === 'string').map((f) => [f.id, f]));
  const unidades = [...new Set(dados.formas.map((f) => f.unidade).filter(Boolean))];
  const daUnidade = dados.formas.filter((f) => f.unidade === unidade);
  if (!daUnidade.length) {
    falhar(`a unidade '${unidade}' não tem forma na opção ${dados.opcao.numero} do esboço; as unidades são ${unidades.join(', ') || '(nenhuma: o esboço não declara unidade)'}`);
  }
  const cortadores = daUnidade.filter((f) => f.cortador === true);
  const formas = daUnidade.filter((f) => f.cortador !== true);
  if (!formas.length) falhar(`a unidade '${unidade}' só tem cortadores, e uma receita precisa de ao menos uma forma`);
  const nomes = new Map();
  const partes = formas.map((f) => {
    const nome = nomeDaParte(f.id);
    if (nomes.has(nome)) falhar(`as formas '${nomes.get(nome)}' e '${f.id}' dão o mesmo nome de parte '${nome}'`);
    nomes.set(nome, f.id);
    return { nome, id: f.id, forma: f, espelhoDe: f.origem?.espelho?.forma ?? null };
  });
  return {
    dados, opcao: dados.opcao, indice, unidade, partes, cortadores, escritas, expandidas, unidades,
    parametrosCrus: { ...(o.parametros ?? {}), ...(bruto.parametros ?? {}), ...(bruto.opcoes?.[indice]?.parametros ?? {}) },
    pontosCrus: { ...(o.pontos ?? {}), ...(bruto.pontos ?? {}), ...(bruto.opcoes?.[indice]?.pontos ?? {}) },
    funcao: typeof bruto.unidades?.[unidade]?.funcao === 'string' ? bruto.unidades[unidade].funcao.trim() : null,
    expandido: o,
  };
}

/**
 * Os parâmetros e os pontos nomeados que a unidade usa, com o fecho: um parâmetro cuja expressão cita outro leva o outro, e um ponto cujas
 * coordenadas citam parâmetros ou pontos leva todos. Valores resolvidos em milímetro (o ângulo, em grau, como o esboço).
 */
export function parametrosEPontosDaUnidade(lida) {
  const { dados, escritas, expandidas, parametrosCrus, pontosCrus, partes, cortadores } = lida;
  const nomesDasFormas = new Set();
  for (const f of [...partes.map((p) => p.forma), ...cortadores]) {
    coletarNomes(escritas.get(f.id), nomesDasFormas);
    coletarNomes(expandidas.get(f.id), nomesDasFormas);
  }
  const parametros = new Set();
  const pontos = new Set();
  const fila = [...nomesDasFormas];
  while (fila.length) {
    const nome = fila.pop();
    if (FUNCOES_DA_EXPRESSAO.has(nome)) continue;
    if (Object.hasOwn(dados.parametros, nome) && !parametros.has(nome)) {
      parametros.add(nome);
      fila.push(...coletarNomes(parametrosCrus[nome], new Set()));
    }
    if (Object.hasOwn(dados.pontos, nome) && !pontos.has(nome)) {
      pontos.add(nome);
      fila.push(...coletarNomes(pontosCrus[nome], new Set()));
    }
  }
  return {
    parametros: Object.keys(dados.parametros).filter((n) => parametros.has(n)).map((nome) => ({
      nome, valor: dados.parametros[nome], expressao: typeof parametrosCrus[nome] === 'string' && parametrosCrus[nome].startsWith('=') ? parametrosCrus[nome] : null,
    })),
    pontos: Object.keys(dados.pontos).filter((n) => pontos.has(n)).map((nome) => ({
      nome, valor: dados.pontos[nome], cru: temTexto(pontosCrus[nome]) ? descreverPontoCru(pontosCrus[nome]) : null,
    })),
  };
}

/* ---------- a TABELA: as medidas e a posição de cada forma ---------- */

/* Os campos da geometria resolvida que cada tipo de forma leva à TABELA, e o nome que o esboço escrito dá ao mesmo campo. */
const CAMPOS_DO_TIPO = {
  caixa: ['largura', 'altura', 'profundidade', 'raio', 'chanfro', 'furos'],
  cilindro: ['diametro', 'comprimento', 'lados', 'achatado'],
  anel: ['diametroExterno', 'diametroInterno', 'espessura', 'lados'],
  cone: ['diametro', 'diametroTopo', 'comprimento'],
  esfera: ['diametro'],
  extrusao: ['comprimento', 'eixosDoPerfil', 'convexo', 'perfil'],
  loft: ['comprimento', 'eixosDoPerfil', 'suave', 'secoes', 'casca'],
  revolucao: ['comprimento', 'lados', 'suave', 'perfil'],
  tubo: ['diametro', 'raioCurva', 'caminho'],
  envolve: ['largura', 'espessura', 'fechado', 'trilha'],
};
const SINONIMOS = { profundidade: ['profundidade', 'espessura'], largura: ['largura'], raio: ['raio', 'cantos'] };

const identidade = (m) => m.every((linha, i) => linha.every((x, j) => Math.abs(x - (i === j ? 1 : 0)) < 1e-9));
const mesmoPonto = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-6);

/** O texto da origem de um campo no esboço escrito (ou no expandido): o nome, a expressão, ou nada quando o esboço dá o número seco. */
function origemDoCampo(campo, { escrita, expandida }) {
  for (const nome of SINONIMOS[campo] ?? [campo]) {
    for (const fonte of [escrita, escrita?.ligar, expandida]) {
      const cru = fonte?.[nome];
      if (cru !== undefined && temTexto(cru)) return descreverPontoCru(cru);
      if (cru !== undefined && fonte !== expandida) return null;
    }
  }
  return null;
}

/** Um valor do esboço escrito em número: `=expressão` e nome de parâmetro viram o valor resolvido, o resto (rótulo, lista, objeto) segue como está. */
export function resolverCru(valor, dados) {
  const { num } = criarResolverNumerico(dados.parametros);
  const ir = (v) => {
    if (typeof v === 'number') return v;
    if (typeof v === 'string') {
      if (v.startsWith('=') || Object.hasOwn(dados.parametros, v)) {
        try { return num(v); } catch { return v; }
      }
      return v;
    }
    if (Array.isArray(v)) return v.map(ir);
    if (ehObjeto(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, ir(x)]));
    return v;
  };
  return ir(valor);
}

/* Os campos de seção e de perfil que a TABELA leva como o esboço os escreve (as seções com `tamanho` e `cantos`, o perfil em pontos), resolvidos
   em número, em vez do contorno já expandido em dezenas de pontos que a geometria resolvida traz. */
const CAMPOS_ESCRITOS = { loft: ['secoes'], revolucao: ['perfil'], extrusao: ['perfil'], tubo: ['caminho'], envolve: ['trilha'] };

/**
 * As medidas e a posição de uma forma que não é de família, em milímetro e no quadro do esboço: o centro, o eixo, as medidas do tipo, as
 * pontas (`de`, `para`) quando o esboço liga dois pontos e a rotação quando a declara. Cada número leva ao lado o parâmetro ou o ponto do esboço.
 */
export function entradaDaForma(forma, { escrita, expandida, dados }) {
  const g = forma.geometria;
  const campos = {};
  const origens = { escrita, expandida };
  const deCru = escrita?.ligar?.de ?? escrita?.de ?? expandida?.de;
  const paraCru = escrita?.ligar?.para ?? escrita?.para ?? expandida?.para;
  const entrePontos = deCru !== undefined && paraCru !== undefined && g.ancoras?.inicio && g.ancoras?.fim;
  /* Entre dois pontos o eixo da forma é o da reta, e o `eixo` da geometria é só o do referencial local dela antes de girar. */
  if (g.eixo !== undefined && forma.tipo !== 'esfera' && !entrePontos) campos.eixo = g.eixo;
  const centroCru = escrita?.centro ?? expandida?.centro;
  campos.centro = comNota(g.centro, temTexto(centroCru) ? descreverPontoCru(centroCru) : null);
  for (const campo of CAMPOS_DO_TIPO[forma.tipo] ?? []) {
    if (g[campo] === undefined) continue;
    campos[campo] = comNota(g[campo], origemDoCampo(campo, origens));
  }
  if (entrePontos) {
    let [inicio, fim] = [g.ancoras.inicio, g.ancoras.fim];
    const nomeDe = typeof deCru === 'string' ? dados.pontos[deCru] : undefined;
    if (nomeDe && !mesmoPonto(nomeDe, inicio) && mesmoPonto(nomeDe, fim)) [inicio, fim] = [fim, inicio];
    campos.de = comNota(inicio, temTexto(deCru) ? descreverPontoCru(deCru) : null);
    campos.para = comNota(fim, temTexto(paraCru) ? descreverPontoCru(paraCru) : null);
  } else {
    const rotacao = expandida?.rotacao ?? escrita?.rotacao;
    if (Array.isArray(rotacao) && rotacao.some((x) => x !== 0)) {
      campos.rotacao = comNota(rotacao.map((x) => (typeof x === 'number' ? x : 0)), temTexto(escrita?.rotacao) ? descreverPontoCru(escrita.rotacao) : null);
    } else if (!identidade(g.matriz)) {
      campos.matriz = g.matriz;
    }
  }
  for (const campo of CAMPOS_ESCRITOS[forma.tipo] ?? []) {
    if (Array.isArray(expandida?.[campo])) campos[campo] = resolverCru(expandida[campo], dados);
  }
  if (expandida?.encaixa) campos.encaixa = resolverCru(expandida.encaixa, dados);
  if (expandida?.subtrai) campos.subtrai = resolverCru(expandida.subtrai, dados);
  return campos;
}

/** A chamada de uma família: o nome dela, o perfil e os parâmetros resolvidos, o centro e a rotação, prontos para `chamar` nos PASSOS. */
export function chamadaDaFamilia(forma, { escrita, expandida, dados }) {
  const g = forma.geometria;
  const parametrosCrus = escrita?.parametros ?? {};
  const chamada = {};
  if (g.perfil !== undefined) chamada.perfil = g.perfil;
  for (const [nome, valor] of Object.entries(g.parametros ?? {})) {
    const cru = parametrosCrus[nome];
    chamada[nome] = comNota(valor, temTexto(cru) ? descreverPontoCru(cru) : null);
  }
  const centroCru = escrita?.centro ?? expandida?.centro;
  const rotacao = expandida?.rotacao ?? escrita?.rotacao;
  const encaixa = expandida?.encaixa ?? escrita?.encaixa;
  return {
    familia: g.familia,
    chamada,
    ...(encaixa?.em ? { encaixa: { ancora: encaixa.ancora, em: comNota(encaixa.em, temTexto(escrita?.encaixa?.em) ? descreverPontoCru(escrita.encaixa.em) : null) } } : { centro: comNota(g.centro, temTexto(centroCru) ? descreverPontoCru(centroCru) : null) }),
    ...(Array.isArray(rotacao) && rotacao.some((x) => x !== 0) ? { rotacao: comNota(rotacao.map((x) => (typeof x === 'number' ? x : 0)), temTexto(escrita?.rotacao) ? descreverPontoCru(escrita.rotacao) : null) } : {}),
    ...(expandida?.subtrai ? { subtrai: resolverCru(expandida.subtrai, dados) } : {}),
    ...(g.partes?.length ? { partes: g.partes } : {}),
  };
}

const notaDaOrigem = (forma) => {
  const o = forma.origem;
  if (!o) return null;
  if (o.componente) return `do componente ${o.componente.usa ?? o.componente.instancia}, instância ${o.componente.instancia}`;
  if (o.arranjo) return `cópia do arranjo de ${o.arranjo.fonte ?? 'outra forma'}`;
  if (o.ligacao) return `ligação ${o.ligacao.tipo ?? ''} criada por \`ligar\``.replace('  ', ' ');
  return null;
};

/**
 * A `TABELA` da unidade como árvore para `escrever`: `parametros`, `pontos`, `formas` (as que não são de família nem espelho), `familias`,
 * `cortadores` e `espelhos` (a forma que o esboço espelha e o plano do espelho). Devolve `{ tabela }`.
 */
export function tabelaDaUnidade(lida) {
  const { partes, cortadores, escritas, expandidas, dados } = lida;
  const { parametros, pontos } = parametrosEPontosDaUnidade(lida);
  const formas = {};
  const familias = {};
  const espelhos = {};
  const entradaDe = (f) => ({ escrita: escritas.get(f.id), expandida: expandidas.get(f.id), dados });
  for (const { nome, forma, espelhoDe } of partes) {
    if (espelhoDe) {
      const fonte = partes.find((p) => p.id === espelhoDe);
      espelhos[nome] = comNota({ de: fonte ? fonte.nome : nomeDaParte(espelhoDe), eixo: forma.origem.espelho.eixo, pos: forma.origem.espelho.pos ?? 0 }, null);
      continue;
    }
    const nota = notaDaOrigem(forma);
    if (forma.tipo === 'familia') familias[nome] = comNota(chamadaDaFamilia(forma, entradaDe(forma)), nota);
    else formas[nome] = comNota({ tipo: forma.tipo, ...entradaDaForma(forma, entradaDe(forma)) }, nota);
  }
  const cortadoresTabela = {};
  for (const f of cortadores) {
    if (f.origem?.espelho) {
      espelhos[nomeDaParte(f.id)] = { de: nomeDaParte(f.origem.espelho.forma), eixo: f.origem.espelho.eixo, pos: f.origem.espelho.pos ?? 0 };
      continue;
    }
    cortadoresTabela[nomeDaParte(f.id)] = f.tipo === 'familia'
      ? chamadaDaFamilia(f, entradaDe(f))
      : { tipo: f.tipo, ...entradaDaForma(f, entradaDe(f)) };
  }
  const tabela = {
    parametros: Object.fromEntries(parametros.map(({ nome, valor, expressao }) => [nome, comNota(valor, expressao)])),
    pontos: Object.fromEntries(pontos.map(({ nome, valor, cru }) => [nome, comNota(valor, cru)])),
    formas,
    ...(Object.keys(familias).length ? { familias } : {}),
    ...(Object.keys(cortadoresTabela).length ? { cortadores: cortadoresTabela } : {}),
    ...(Object.keys(espelhos).length ? { espelhos } : {}),
  };
  return { tabela };
}

/* ---------- os PONTOS ---------- */

/** O mínimo e o máximo da caixa de cada parte (a caixa que o esboço resolve), no formato de `conferir-pontos`. */
export function pontosDaUnidade(partes, tolerancia = TOLERANCIA_DOS_PONTOS_PADRAO) {
  return partes.flatMap(({ nome, forma }) => {
    const { min, max } = forma.geometria.caixa;
    return [
      { nome: `${nome}, o mínimo da caixa`, parte: nome, medida: 'minimo', em: min.map(arredondar), toleranciaMm: tolerancia },
      { nome: `${nome}, o máximo da caixa`, parte: nome, medida: 'maximo', em: max.map(arredondar), toleranciaMm: tolerancia },
    ];
  });
}

/* ---------- os contatos ---------- */

/**
 * Os pares de formas da unidade que se tocam no esboço, medidos sobre o sólido (a folga entre as peças convexas de cada forma), com a
 * penetração em milímetro. Os cortadores não são partes e ficam de fora. Ordem estável: a das partes.
 */
export function contatosDaUnidade(lida) {
  const { expandido, partes, indice } = lida;
  const resolvidas = resolverOpcao(expandido, `opção ${indice + 1}`, expandido.pontos);
  const porId = new Map(resolvidas.map((r) => [r.id, r]));
  const solidos = partes.map((p) => ({ p, pecas: pecasDe(porId.get(p.id)) }));
  const pares = [];
  for (let i = 0; i < solidos.length; i += 1) {
    for (let j = i + 1; j < solidos.length; j += 1) {
      const medida = medirPar(solidos[i].pecas, solidos[j].pecas);
      if (medida.folga <= FOLGA_DE_CONTATO) pares.push({ par: [solidos[i].p.nome, solidos[j].p.nome], penetracaoMm: arredondar(medida.penetracao) });
    }
  }
  return pares.map(({ par, penetracaoMm }) => ({
    par,
    motivo: penetracaoMm > 0.05 ? `se tocam no esboço, com ${mm1(penetracaoMm)} mm de penetração` : 'se encostam no esboço, sem penetração',
  }));
}

/* ---------- as formas (a topologia prometida) ---------- */

/** A forma topológica que o esboço permite prometer: sólido sem furo, o anel (um furo) e a caixa furada. Família, recorte e casca ficam de fora. */
export function formaPrometida(forma) {
  const g = forma.geometria;
  if (forma.tipo === 'familia' || g.recorte || g.casca) return null;
  if (forma.tipo === 'anel') return { furos: 1 };
  if (forma.tipo === 'caixa' && Array.isArray(g.furos) && g.furos.length) return { furos: g.furos.length };
  if (['caixa', 'cilindro', 'cone', 'esfera', 'extrusao', 'loft', 'revolucao'].includes(forma.tipo)) return 'solido';
  return null;
}

/* ---------- o PLANO ---------- */

const tamanho = (g) => [g.largura, g.altura, g.profundidade].map(mm1).join(' por ');

/** O que a forma é, em uma frase, com as medidas do esboço. */
export function descreverForma(forma) {
  const g = forma.geometria;
  const entrePontos = Boolean(forma.origem?.ligacao || g.haste);
  const eixo = g.eixo && !entrePontos ? `, com o eixo em ${g.eixo}` : '';
  const frase = {
    caixa: () => `caixa de ${tamanho(g)} mm${g.raio ? `, de cantos de ${mm1(g.raio)} mm` : ''}${entrePontos ? ', entre dois pontos' : ''}`,
    cilindro: () => `cilindro de ${mm1(g.diametro)} mm de diâmetro e ${mm1(g.comprimento)} mm de comprimento${entrePontos ? ', entre dois pontos' : eixo}`,
    anel: () => `anel de ${mm1(g.diametroExterno)} mm por fora e ${mm1(g.diametroInterno)} mm por dentro, de ${mm1(g.espessura)} mm de espessura${eixo}`,
    cone: () => `cone de ${mm1(g.diametro)} mm na base e ${mm1(g.diametroTopo)} mm no topo, de ${mm1(g.comprimento)} mm de comprimento${eixo}`,
    esfera: () => `esfera de ${mm1(g.diametro)} mm de diâmetro`,
    extrusao: () => `extrusão de ${mm1(g.comprimento)} mm de um perfil de ${g.perfil?.length ?? '?'} pontos${eixo}`,
    loft: () => `loft de ${g.secoes?.length ?? '?'} seções ao longo de ${mm1(g.comprimento)} mm${eixo}${g.suave ? ', de transição lisa' : ''}`,
    revolucao: () => `revolução de um perfil de ${g.perfil?.length ?? '?'} pontos ao longo de ${mm1(g.comprimento)} mm${eixo}`,
    tubo: () => `tubo de ${mm1(g.diametro)} mm de diâmetro por um caminho de ${g.caminho?.length ?? '?'} pontos`,
    envolve: () => `faixa de ${mm1(g.largura)} mm de largura e ${mm1(g.espessura)} mm de espessura em volta de uma trilha`,
    familia: () => `forma da família ${g.familia}${g.perfil ? `, perfil ${g.perfil}` : ''}`,
  }[forma.tipo];
  const texto = frase ? frase() : `forma do tipo ${forma.tipo}`;
  return limitar(texto);
}

/** A técnica que o esboço permite dizer, no vocabulário das receitas do avião. */
export function tecnicaDaForma(forma) {
  const g = forma.geometria;
  const base = {
    caixa: g.raio ? 'caixa de canto arredondado do esboço' : 'caixa do esboço',
    cilindro: forma.origem?.ligacao || g.haste ? 'cilindro entre os pontos do esboço' : 'cilindro do esboço',
    anel: 'anel do esboço',
    cone: 'cone do esboço',
    esfera: 'esfera do esboço',
    extrusao: 'extrusão do perfil do esboço',
    loft: g.suave ? 'loft liso por seções do esboço' : 'loft por seções do esboço',
    revolucao: g.suave ? 'revolução lisa do perfil do esboço' : 'revolução do perfil do esboço',
    tubo: 'tubo pelo caminho do esboço',
    envolve: 'faixa em volta da trilha do esboço',
    familia: `a família ${g.familia}${g.perfil ? `, perfil ${g.perfil}` : ''}, com os parâmetros do esboço, expandida nos PASSOS`,
  }[forma.tipo] ?? `forma ${forma.tipo} do esboço`;
  const recorte = g.recorte ? `, recortada por ${g.recorte.cortadores.map((c) => c.id).join(' e ')}` : '';
  return limitar(`${base}${recorte}`);
}

const NOME_DO_EIXO = { x: 'largura', y: 'altura', z: 'comprimento' };

/** A escala: o maior lado da caixa de todas as partes da unidade no esboço. */
export function escalaDaUnidade(partes) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const { forma } of partes) {
    for (let k = 0; k < 3; k += 1) {
      min[k] = Math.min(min[k], forma.geometria.caixa.min[k]);
      max[k] = Math.max(max[k], forma.geometria.caixa.max[k]);
    }
  }
  const extensao = max.map((v, k) => v - min[k]);
  const k = extensao.indexOf(Math.max(...extensao));
  const eixo = 'xyz'[k];
  return { medida: `${NOME_DO_EIXO[eixo]} da unidade no esboço, em ${eixo}, de ${mm1(min[k])} a ${mm1(max[k])} mm`, milimetros: arredondar(extensao[k]) };
}

/* ---------- o REFINA ---------- */

/** Os volumes do andaime (`andaime.volumes[].id`), ou null se o arquivo não existe. */
export function volumesDoAndaime(arquivo) {
  if (!arquivo || !existsSync(arquivo)) return null;
  const ids = JSON.parse(readFileSync(arquivo, 'utf8')).volumes?.map((v) => v.id) ?? [];
  return new Set(ids);
}

/** O volume do andaime de cada parte: o slug do id da forma (a regra do tradutor do andaime). Sem andaime lido, a regra vale sem conferência. */
export function volumesDasPartes(partes, volumes) {
  const ligadas = {};
  const semVolume = [];
  for (const { nome, id } of partes) {
    const volume = slugDe(id);
    if (volumes === null || volumes.has(volume)) ligadas[nome] = volume;
    else semVolume.push(nome);
  }
  return { ligadas, semVolume };
}

/* ---------- o arquivo ---------- */

/** Uma lista de objetos com um objeto por linha, por mais comprido que seja, como as receitas do avião escrevem partes, pontos e contatos. */
export function listaEmLinhas(itens, nivel) {
  if (!itens.length) return '[]';
  const recuo = '  '.repeat(nivel + 1);
  return `[\n${itens.map((item) => `${recuo}${escrever(item, nivel + 1, Infinity)},`).join('\n')}\n${'  '.repeat(nivel)}]`;
}

/** Quebra o texto em linhas de até `largura` colunas, nos espaços. */
export function quebrar(texto, largura = 136) {
  const linhas = [];
  let atual = '';
  for (const palavra of texto.split(' ')) {
    if (atual && atual.length + 1 + palavra.length > largura) { linhas.push(atual); atual = palavra; } else atual = atual ? `${atual} ${palavra}` : palavra;
  }
  if (atual || !linhas.length) linhas.push(atual);
  return linhas;
}

/** Um comentário de bloco: cada item de `paragrafos` quebrado em linhas, com o recuo, e a linha vazia onde o item é vazio. */
const comentarioDeBloco = (paragrafos, recuo = '') => {
  const linhas = paragrafos.flatMap((p) => quebrar(p, 136 - recuo.length));
  const corpo = linhas.map((linha, i) => (i === 0 ? `${recuo}/* ${linha}` : `${recuo} *${linha ? ` ${linha}` : ''}`));
  corpo[corpo.length - 1] += ' */';
  return corpo.join('\n');
};

/**
 * Tudo o que a receita planejada leva, como dado, e o texto do arquivo. `caminhos` diz de onde a receita enxerga o esboço e o andaime
 * (relativos à pasta dela); o resto vem de `lida`.
 */
export function receitaPlanejada({ lida, peca, esboco, caminhos, referencias = [], minimo = MINIMO_PADRAO, toleranciaDosPontos = TOLERANCIA_DOS_PONTOS_PADRAO, volumes = null, contatos, geradaPor = null, alvo = null }) {
  const { partes, unidade, opcao, funcao, cortadores } = lida;
  const { tabela } = tabelaDaUnidade(lida);
  const pontos = pontosDaUnidade(partes, toleranciaDosPontos);
  const { ligadas, semVolume } = volumesDasPartes(partes, volumes);
  const escala = escalaDaUnidade(partes);
  const formas = {};
  const semFormaPrometida = [];
  for (const { nome, forma } of partes) {
    const prometida = formaPrometida(forma);
    if (prometida === null) semFormaPrometida.push(nome);
    else formas[nome] = prometida;
  }
  const familias = partes.filter((p) => p.forma.tipo === 'familia' && !p.espelhoDe).map((p) => p.nome);
  const pendencias = [
    'o texto do objeto (PLANO.objeto)',
    ...(referencias.length ? [] : ['as imagens de referência (PLANO.referencias)']),
    'os critérios de reprovação (PLANO.criteriosDeReprovacao)',
    ...(semVolume.length ? [`o volume do andaime das partes ${semVolume.join(', ')}, que o andaime não traduz (REFINA.partes)`] : []),
  ];
  const nome = peca;
  const objetoDoPlano = {
    objeto: '',
    referencias,
    escala,
    partes: partes.map((p) => ({ nome: p.nome, forma: descreverForma(p.forma), tecnica: tecnicaDaForma(p.forma) })),
    criteriosDeReprovacao: [],
  };
  const refina = {
    andaime: caminhos.andaime,
    partes: ligadas,
    tolerancia: { envelope: TOLERANCIA_DO_ENVELOPE, porta: TOLERANCIA_DA_PORTA },
    esboco: { arquivo: caminhos.esboco, opcao: opcao.numero, formas: Object.fromEntries(partes.map((p) => [p.nome, p.id])), minimo },
  };
  return {
    nome, unidade, tabela, pontos, plano: objetoDoPlano, refina, contatos, formas, semFormaPrometida, semVolume, pendencias, familias,
    cortadores: cortadores.map((c) => c.id),
    texto: textoDaReceita({ nome, unidade, funcao, opcao, esboco, tabela, pontos, plano: objetoDoPlano, refina, contatos, formas, semFormaPrometida, pendencias, familias, cortadores, geradaPor, caminhos, alvo }),
  };
}

function textoDaReceita({ nome, unidade, funcao, opcao, esboco, tabela, pontos, plano, refina, contatos, formas, semFormaPrometida, pendencias, familias, cortadores, geradaPor, caminhos, alvo }) {
  const arquivoDoEsboco = basename(esboco);
  const espelho = Object.values(tabela.espelhos ?? {})[0] ?? null;
  const L = [];
  L.push(comentarioDeBloco([
    `${nome} — receita planejada da unidade \`${unidade}\` do esboço \`${arquivoDoEsboco}\` (opção ${opcao.numero}${opcao.titulo ? `, ${opcao.titulo}` : ''}), ainda sem passos.`,
    '',
    `Gerada por \`${geradaPor ?? 'npm run receita:planejada'}\` a partir da unidade do esboço aprovado: a \`TABELA\` traz, em milímetro e no quadro do esboço, os parâmetros`
      + ' e os pontos que a unidade usa e as medidas e a posição de cada forma, com o parâmetro ou o ponto do esboço ao lado de cada número; os \`PONTOS\` são a caixa de'
      + ' cada parte como o esboço a resolve; o \`REFINA\` liga cada parte ao volume do andaime e à forma do esboço; os \`contatos\` são os pares que se tocam no esboço;'
      + ' os \`PASSOS\` ficam vazios, para o modelador escrever.',
    '',
    `Falta a quem conduz: ${pendencias.join('; ')}. O objeto e os critérios${plano.referencias.length ? '' : ' e as referências'} ficam vazios de propósito: o normalizador do`
      + ' `PLANO` recusa texto vazio e lista vazia, e por isso a receita só passa por `npm run descrever` depois de escritos.',
    ...(alvo ? ['', `O alvo da unidade, a composta gerada pela ferramenta do esboço no momento de gerar esta receita: \`${alvo}\`.`] : []),
    ...(familias.length ? ['', `Partes de família (${familias.join(', ')}): a chamada está em \`TABELA.familias\`, para expandir nos PASSOS com \`chamar\` e \`expandirChamadasDeComposicao\`.`] : []),
    ...(semFormaPrometida.length ? ['', `Sem forma prometida em \`formas\` (o esboço não diz a topologia): ${semFormaPrometida.join(', ')}.`] : []),
    ...(cortadores.length ? ['', `Cortadores da unidade, que não são partes: ${cortadores.map((c) => c.id).join(', ')} (em \`TABELA.cortadores\`).`] : []),
  ]));
  L.push('');
  L.push(`const ESBOCO = ${literal(caminhos.esboco)};`);
  L.push('');
  L.push(comentarioDeBloco([
    'A TABELA, em milímetro e no quadro do esboço (ângulos em grau, como o esboço). O comentário ao lado de um número é o parâmetro, o ponto ou a expressão'
      + ' do esboço de onde ele veio; sem comentário, o esboço dá o número seco. `formas` traz as que não são de família nem espelho, `familias` as chamadas'
      + ` de família${espelho ? `, e \`espelhos\` as partes que o esboço espelha em ${espelho.eixo} = ${espelho.pos} (a cópia herda o nome da fonte)` : ''}.`,
  ]));
  L.push(`export const TABELA = ${escrever(tabela, 0)};`);
  L.push('');
  L.push(comentarioDeBloco(['Os pontos do esboço: o mínimo e o máximo da caixa de cada parte, em milímetro, como `conferir-pontos` os lê.']));
  L.push(`const PONTOS = ${listaEmLinhas(pontos, 0)};`);
  L.push('');
  L.push('export default {');
  L.push(`  meta: { nome: ${literal(nome)}, desc: ${literal(`unidade ${unidade} do esboço ${arquivoDoEsboco}`)} },`);
  L.push('  PARAMS: TABELA,');
  L.push('  MATERIAIS: {},');
  L.push(`  TOPO: { origem: ${literal(`o quadro do esboço ${arquivoDoEsboco}, em milímetro, opção ${opcao.numero}${opcao.titulo ? ` (${opcao.titulo})` : ''}`)} },`);
  L.push('  PLANO: {');
  if (funcao) L.push(comentarioDeBloco([`A ESCREVER por quem conduz. A função que o esboço dá à unidade: ${funcao}`], '    '));
  else L.push(comentarioDeBloco(['A ESCREVER por quem conduz: o que é o objeto, em uma frase.'], '    '));
  L.push(`    objeto: ${literal(plano.objeto)},`);
  L.push(`    referencias: ${escrever(plano.referencias, 2)},${plano.referencias.length ? '' : ' // A ESCREVER: as imagens de referência, relativas à pasta da peça ou à raiz'}`);
  L.push(`    escala: ${escrever(plano.escala, 2)},`);
  L.push(`    partes: ${listaEmLinhas(plano.partes, 2)},`);
  L.push(comentarioDeBloco(['A ESCREVER por quem conduz: o que faz um revisor reprovar ESTE objeto, cada critério uma frase verificável.'], '    '));
  L.push('    criteriosDeReprovacao: [],');
  L.push('  },');
  L.push(`  contatos: ${listaEmLinhas(contatos, 1)},`);
  L.push(`  formas: ${escrever(formas, 1)},`);
  L.push(`  REFINA: ${escrever({ ...refina, esboco: { ...refina.esboco, arquivo: new Cru('ESBOCO') } }, 1)},`);
  L.push('  PONTOS,');
  L.push('  PASSOS: [],');
  L.push('};');
  return `${L.join('\n')}\n`;
}

/* ---------- a gravação ---------- */

/** Onde a receita mora: `<raiz>/<objeto>/partes/<peça>/receita.js` para `objeto/peça`, e `<raiz>/<peça>/receita.js` para uma peça sozinha. */
export function destinoDaReceita(peca, raiz) {
  const m = /^([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9-]*)$/.exec(peca);
  if (m) return join(raiz, m[1], 'partes', m[2], 'receita.js');
  if (/^[a-z0-9][a-z0-9-]*$/.test(peca)) return join(raiz, peca, 'receita.js');
  return falhar(`'${peca}' não é um nome de peça: use <objeto>/<peça> ou <peça>, em minúsculas com hífen`);
}

/** Uma receita que já tem passos não se regrava: só vale a que é exatamente `PASSOS: []`, a planejada. */
export function receitaTemPassos(texto) {
  const semComentarios = texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  return !/\bPASSOS\s*:\s*\[\s*\]/.test(semComentarios) || /\bget\s+PASSOS\b/.test(semComentarios);
}

function pastaDoObjeto(peca) {
  const m = /^([a-z0-9][a-z0-9-]*)(?:\/[a-z0-9][a-z0-9-]*)?$/.exec(peca);
  return m ? m[1] : null;
}

const relativoComBarra = (de, para) => {
  const r = relative(de, para).split('\\').join('/');
  return r.startsWith('.') ? r : `./${r}`;
};

/**
 * Gera e grava a receita planejada. `esboco` é o caminho do `.esboco.json`; `saida` (opcional) a raiz espelho em vez de `procedural/pecas`.
 * Devolve o relatório: o caminho gravado, as contagens, as pendências e o alvo. `dependencias.composta` injeta a composta nos testes.
 */
export async function gravarReceitaPlanejada({ esboco, unidade, peca, saida = null, opcao = 1, andaime = null, referencias = [], minimo = MINIMO_PADRAO, toleranciaDosPontos = TOLERANCIA_DOS_PONTOS_PADRAO, semAlvo = false, raiz = REPO, geradaPor = null, dependencias = {} }) {
  const arquivoDoEsboco = resolve(esboco);
  if (!existsSync(arquivoDoEsboco)) falhar(`não achei o esboço ${esboco}`);
  let bruto;
  try {
    bruto = JSON.parse(readFileSync(arquivoDoEsboco, 'utf8'));
  } catch (erro) {
    falhar(`não foi possível ler o esboço ${esboco}: ${erro.message}`);
  }
  const raizDasPecas = saida ? resolve(saida) : join(raiz, 'procedural/pecas');
  const destino = destinoDaReceita(peca, raizDasPecas);
  const regravou = existsSync(destino);
  if (regravou && receitaTemPassos(readFileSync(destino, 'utf8'))) {
    falhar(`${relative(raiz, destino) || destino} já tem passos; este comando só grava a receita planejada, sem passos. Passe --saida para gerar em outra pasta e comparar.`);
  }
  const pastaObjeto = pastaDoObjeto(peca);
  if (!saida && peca.includes('/') && !existsSync(join(raizDasPecas, pastaObjeto))) {
    falhar(`o objeto '${pastaObjeto}' não existe em procedural/pecas; crie a pasta dele (com a montagem) antes, ou passe --saida para gerar em outra pasta`);
  }
  const lida = lerUnidade({ bruto, unidade, opcao });
  const pastaDaReceita = dirname(destino);
  const arquivoDoAndaime = andaime ? resolve(andaime) : join(raiz, 'procedural/pecas', pastaObjeto ?? peca, 'andaime.json');
  const volumes = volumesDoAndaime(arquivoDoAndaime);
  const contatos = contatosDaUnidade(lida);
  /* O alvo vem antes da gravação: se a ferramenta do esboço não desenhar (sem navegador, por exemplo), nenhuma receita fica pela metade. */
  let alvo = null;
  if (!semAlvo) {
    mkdirSync(pastaDaReceita, { recursive: true });
    const feito = await gerarCompostaDaUnidade({ arquivo: arquivoDoEsboco, unidade, pasta: pastaDaReceita, dependencias });
    /* A cópia do esboço serve só para a ferramenta desenhar sem o estado do Condutor, como no pacote do crítico; a receita aponta o original. */
    rmSync(feito.copia, { force: true });
    alvo = feito.imagem;
  }
  const planejada = receitaPlanejada({
    lida, peca, esboco: arquivoDoEsboco,
    caminhos: { esboco: relativoComBarra(pastaDaReceita, arquivoDoEsboco), andaime: relativoComBarra(pastaDaReceita, arquivoDoAndaime) },
    referencias, minimo, toleranciaDosPontos, volumes, contatos, geradaPor, alvo: alvo ? relativoComBarra(pastaDaReceita, alvo) : null,
  });
  mkdirSync(pastaDaReceita, { recursive: true });
  writeFileSync(destino, planejada.texto, 'utf8');
  return {
    destino, regravou, alvo, avisoDoAndaime: volumes === null ? `o andaime ${arquivoDoAndaime} não existe: os volumes seguem a regra do slug, sem conferência` : null,
    partes: lida.partes.length, pontos: planejada.pontos.length, contatos: planejada.contatos.length, cortadores: planejada.cortadores,
    pendencias: planejada.pendencias, semFormaPrometida: planejada.semFormaPrometida, semVolume: planejada.semVolume, familias: planejada.familias,
    receita: planejada,
  };
}

/* ---------- a linha de comando ---------- */

const OPCOES = ['unidade', 'peca', 'saida', 'opcao', 'andaime', 'referencia', 'minimo', 'tolerancia-pontos'];
const BANDEIRAS = ['sem-alvo'];

/* `--nome valor` vale como `--nome=valor`, como no `npm run esboco`. */
function juntarOpcoes(argv) {
  const saida = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--') && !arg.includes('=') && OPCOES.includes(arg.slice(2)) && i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
      saida.push(`${arg}=${argv[i + 1]}`);
      i += 1;
    } else saida.push(arg);
  }
  return saida;
}

export function textoDoRelatorio(r) {
  const L = [
    `${r.regravou ? 'regravada' : 'gravada'} a receita planejada ${r.destino}`,
    `  ${r.partes} partes, ${r.pontos} pontos, ${r.contatos} contatos${r.cortadores.length ? `, ${r.cortadores.length} cortadores fora das partes (${r.cortadores.join(', ')})` : ''}`,
  ];
  if (r.familias.length) L.push(`  famílias na TABELA.familias: ${r.familias.join(', ')}`);
  if (r.semFormaPrometida.length) L.push(`  sem forma prometida em formas: ${r.semFormaPrometida.join(', ')}`);
  if (r.avisoDoAndaime) L.push(`  ATENÇÃO: ${r.avisoDoAndaime}`);
  L.push(`  alvo: ${r.alvo ?? 'não gerado (--sem-alvo)'}`);
  L.push('  fica para quem conduz:');
  for (const p of r.pendencias) L.push(`    - ${p}`);
  return `${L.join('\n')}\n`;
}

export async function comoCLI(argv, { raiz = REPO, dependencias = {} } = {}) {
  const uso = (mensagem) => ({ codigo: 2, stdout: '', stderr: `receita-planejada: ${mensagem}\n` });
  let lido;
  try {
    lido = lerArgumentos(juntarOpcoes(argv), { opcoes: OPCOES, bandeiras: BANDEIRAS, posicional: { nome: 'o esboço (.esboco.json)', obrigatorio: true } });
  } catch (erro) {
    return uso(erro.message);
  }
  const unidade = lido.opcao('unidade');
  const peca = lido.opcao('peca');
  if (!unidade?.trim()) return uso('diga a unidade do esboço: --unidade <unidade>');
  if (!peca?.trim()) return uso('diga a peça que recebe a receita: --peca <objeto>/<peça>');
  const opcaoTexto = lido.opcao('opcao', '1');
  const opcao = /^\d+$/.test(opcaoTexto) ? Number(opcaoTexto) : opcaoTexto;
  const minimo = Number(lido.opcao('minimo', String(MINIMO_PADRAO)));
  if (!(minimo > 0 && minimo <= 1)) return uso(`--minimo precisa ser a razão mínima, maior que 0 e até 1; recebi '${lido.opcao('minimo')}'`);
  const tolerancia = Number(lido.opcao('tolerancia-pontos', String(TOLERANCIA_DOS_PONTOS_PADRAO)));
  if (!(tolerancia > 0)) return uso(`--tolerancia-pontos precisa ser maior que zero, em milímetro; recebi '${lido.opcao('tolerancia-pontos')}'`);
  const referencias = (lido.opcao('referencia') ?? '').split(',').map((r) => r.trim()).filter(Boolean);
  const base = process.env.INIT_CWD ?? process.cwd();
  const doCWD = (caminho) => (caminho === null ? null : (isAbsolute(caminho) ? caminho : resolve(base, caminho)));
  try {
    const relatorio = await gravarReceitaPlanejada({
      esboco: doCWD(lido.posicional), unidade, peca, saida: doCWD(lido.opcao('saida')), opcao, andaime: doCWD(lido.opcao('andaime')),
      referencias, minimo, toleranciaDosPontos: tolerancia, semAlvo: lido.bandeira('sem-alvo'), raiz,
      geradaPor: `npm run receita:planejada -- ${basename(lido.posicional)} --unidade ${unidade} --peca ${peca}`, dependencias,
    });
    return { codigo: 0, stdout: textoDoRelatorio(relatorio), stderr: '', relatorio };
  } catch (erro) {
    return { codigo: 1, stdout: '', stderr: `${erro.message.startsWith('receita-planejada:') ? '' : 'receita-planejada: '}${erro.message}\n` };
  }
}

const executadoComoCLI = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (executadoComoCLI) {
  const saida = await comoCLI(process.argv.slice(2));
  process.stdout.write(saida.stdout);
  process.stderr.write(saida.stderr);
  process.exitCode = saida.codigo;
}
