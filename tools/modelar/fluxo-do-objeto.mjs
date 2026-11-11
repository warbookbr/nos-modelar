#!/usr/bin/env node
/* fluxo-do-objeto.mjs — em que passo um objeto está, da referência à etapa fixa, e o comando exato que vem agora.
 *
 * POR QUE ELE EXISTE. Na empilhadeira (2026-11-09) quem conduzia encadeava à mão `rodada-de-modelagem --acao`, `vistas:critica` e
 * `etapas` para cada uma das dezenove peças, e o estado do objeto vivia na conversa. O plano do núcleo para qualquer mecanismo
 * (fatia 1) pede um comando que leia a pasta do objeto e diga o passo e o que falta, peça por peça. Ele não decide nada novo: a ação de
 * cada peça é a de `acaoDaReceita` (a mesma de `--acao`) e a próxima etapa é a de `proximaEtapa` (a mesma de `npm run etapas`).
 *
 * OS SEIS PASSOS, na ordem em que o objeto é produzido, cada um pelo que deixa na pasta:
 *   1. alinhamento: `ALINHAMENTO.md` com a tabela de medidas e a seção das partes;
 *   2. referências: `referencias/` (ou a pasta que `referencias.json` aponta) com imagem, contorno ou prancha;
 *   3. rascunho: `referencias/*.esboco.mjs` ou `.esboco.json`, a configuração da conferência em `*.conferir.json` e o `resumo.json` que
 *      `npm run conferir:vistas` grava em `<objeto>/conferencia/<esboço>/` (fora do versionamento) ou na pasta de `--conferencia`;
 *   4. receitas: `partes/<peça>/receita.js` ou `receita.js`, com a ação de cada peça, e as peças da seção das partes do alinhamento;
 *   5. montagem: `montagem.json`, com as etapas abertas e fixas pelo registro `montagem.etapas.json`;
 *   6. fechamento: todas as etapas fixas; ficam a auditoria e o custo por peça.
 * Cada passo se avalia por si, feito, em falta ou feito com ressalva (a conferência configurada e não rodada, ou rodada com sobra acima
 * da tolerância), e o objeto está no primeiro passo em falta; "agora" traz só o que falta dele. O objeto que já tem receita está no
 * passo 4 ou adiante, e o que faltar dos passos 1 a 3 sai como falta, sem prender o passo. No passo das receitas, a próxima peça a
 * criar é a primeira sem receita na ordem de montagem do alinhamento, com o roteiro de `comecar` (o da família, quando ele cita uma).
 *
 * O ACEITE DA PESSOA. O alinhamento e o rascunho só valem como feitos com o aceite dela registrado no `ALINHAMENTO.md`, na seção "Aceite":
 *   ## Aceite
 *   - alinhamento: aceito pela pessoa em 2026-11-11, "as palavras dela".
 *   - rascunho: aceito pela pessoa em 2026-11-11, "as palavras dela".
 *   - delegação: pela pessoa em 2026-11-11, "as palavras dela" (vale para os dois, como a do carrinho de mão).
 * Cada linha leva a data. O alinhamento que traz decisões pendentes (seção "Decisões que dependem da pessoa") e nenhum aceite sai como
 * "proposto, aguardando a pessoa", com as decisões listadas, e não manda criar receita. Os objetos que já têm receita não ficam presos: o
 * registro anterior ao formato (delegação, "combinado com a pessoa", "aprovado por ela") vale como aceite, e sem registro nenhum o fluxo só avisa.
 *
 * O MÓDULO COMUM. `partes/_comum/` guarda o que várias peças dividem (a superfície e as linhas de vão de uma lataria, as ferramentas de um
 * chassi). Não é peça: o fluxo lista as receitas que o importam e avisa quando ele mudou depois da última rodada de uma peça que depende dele.
 *
 * A AÇÃO BARATA. Medir cada peça (`descrever`, guardas, pontos) leva segundos por peça. Por padrão a ação sai das rodadas gravadas e da
 * impressão do texto da receita: com o texto igual ao da última rodada, vale a medição que ela gravou; com o texto mudado, a medição é
 * presumida aprovada e a ação diz que não mediu. `--medir` mede cada peça de verdade, pela `acaoDaPeca` de `--acao`.
 *
 * O OBJETO NOVO. O primeiro passo de um objeto vem antes de a pasta existir: a pasta que ainda não existe, ou está vazia, dentro de
 * `procedural/pecas/` está no passo 1, com o que criar. Fora do acervo, a pasta tem de existir; o caminho que é arquivo é recusado.
 *
 * Uso: npm run fluxo:objeto -- <pasta do objeto ou nome> [--json] [--medir] [--conferencia=<pasta com o resumo.json>]
 * Sai 2 em argumento ruim, caminho que é arquivo, ou pasta que não existe fora de procedural/pecas/. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { acaoDaReceita, defeitosAbertos } from '../../src/autoria/laco-de-modelagem.js';
import { proximaEtapa } from '../../src/autoria/etapas-de-construcao.js';
import { acaoDaPeca, lerRodadas, limiteDaPeca } from './rodada-de-modelagem.mjs';
import { pastaDasReferencias } from './objeto.mjs';

const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const ACERVO = join(REPO, 'procedural/pecas');

export const PASSOS = Object.freeze(['alinhamento', 'referencias', 'rascunho', 'receitas', 'montagem', 'fechamento']);
const IMAGEM = /\.(png|jpe?g|webp|svg)$/i;
const ehPasta = (p) => existsSync(p) && statSync(p).isDirectory();
const lerJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const ordenados = (pasta) => (ehPasta(pasta) ? readdirSync(pasta).sort() : []);
const sha = (texto) => `sha256:${createHash('sha256').update(texto).digest('hex')}`;

const DATA = /\d{4}-\d{2}-\d{2}/;
const colapsar = (t) => t.replace(/\s+/g, ' ');

/**
 * O aceite da pessoa e as decisões pendentes de um `ALINHAMENTO.md`. O aceite é a linha `alinhamento:`, `rascunho:` ou `delegação:` com data
 * na seção "Aceite" (`origem: 'registrado'`); sem ela vale o registro anterior ao formato (`origem: 'anterior'`): a delegação da pessoa, o
 * combinado ou aprovado com ela. As decisões pendentes são os parágrafos da seção "Decisões que dependem da pessoa" (ou "pendentes").
 */
export function lerAceites(texto) {
  const linhas = texto.split(/\r?\n/);
  const aceites = { alinhamento: null, rascunho: null };
  let dentro = false;
  for (const l of linhas) {
    if (/^#+\s/.test(l)) { dentro = /^#+\s*(aceite|delega)/i.test(l); continue; }
    if (!dentro) continue;
    const m = /^\s*(?:[-*]\s*)?(alinhamento|rascunho|delega[cç][aã]o)(?:\s+e\s+(rascunho|alinhamento))?\s*:\s*(.{8,})$/i.exec(l);
    if (!m || !DATA.test(m[3])) continue;
    const quem = [m[1], m[2]].filter(Boolean).map((x) => x.toLowerCase());
    const aceite = { origem: 'registrado', texto: m[3].trim() };
    if (quem.includes('alinhamento') || quem.some((x) => x.startsWith('delega'))) aceites.alinhamento ??= aceite;
    if (quem.includes('rascunho') || quem.some((x) => x.startsWith('delega'))) aceites.rascunho ??= aceite;
  }
  const plano = colapsar(texto);
  const anterior = (re) => { const m = re.exec(plano); return m ? { origem: 'anterior', texto: m[0].trim() } : null; };
  const delegacao = anterior(/[^.]*(?:\bdeleg\p{L}+ d[ao] pessoa|\bpessoa (?:\p{L}+ ){0,3}deixou (?:a )?condu\p{L}+)[^.]*\./iu);
  const combinado = anterior(/[^.]*\b(?:combinad\w+|conduzid\w+|aprovad\w+|aceit\w+) (?:com a pessoa|pela pessoa|por ela)\b[^.]*\./i);
  aceites.alinhamento ??= delegacao ?? combinado;
  aceites.rascunho ??= delegacao ?? anterior(/[^.]*\brascunho\b[^.]*\b(?:aprovad\w+|aceit\w+)\b[^.]*\bpessoa\b[^.]*\./i);
  const decisoes = [];
  const inicio = linhas.findIndex((l) => /^#+.*\b(dependem da pessoa|decis[õo]es pendentes|pendentes? da pessoa|aguardando a pessoa)/i.test(l));
  if (inicio >= 0) {
    let paragrafo = [];
    const fecha = () => {
      if (paragrafo.length) decisoes.push(colapsar(paragrafo.join(' ')).replace(/^(?:[-*]|\d+[.)])\s+/, '').trim());
      paragrafo = [];
    };
    for (const l of linhas.slice(inicio + 1)) {
      if (/^#/.test(l)) break;
      if (l.trim() === '') fecha(); else paragrafo.push(l);
    }
    fecha();
  }
  return { ...aceites, decisoes: decisoes.filter(Boolean) };
}

/** O alinhamento: o arquivo, a tabela de medidas e a seção das partes (o que falta é estrutura; o aceite se julga no fluxo, que sabe das receitas). */
export function lerAlinhamento(pasta) {
  const arquivo = join(pasta, 'ALINHAMENTO.md');
  if (!existsSync(arquivo)) return { estado: 'falta', feito: false, falta: ['ALINHAMENTO.md'] };
  const texto = readFileSync(arquivo, 'utf8');
  const falta = [];
  const tabela = /^\s*\|.*\|\s*$/m.test(texto) && /^#+.*\b(medidas|escala|tabela|cotas)\b/im.test(texto);
  if (!tabela) falta.push('a tabela de medidas (seção de medidas ou escala com tabela)');
  if (!/^#+.*\bpartes\b/im.test(texto)) falta.push('a seção das partes');
  const { alinhamento, rascunho, decisoes } = lerAceites(texto);
  return { estado: falta.length ? 'falta' : 'feito', feito: falta.length === 0, falta, aceite: alinhamento, aceiteDoRascunho: rascunho, decisoes };
}

/**
 * O estado de um passo que depende da pessoa (o alinhamento e o rascunho) depois de pronto: com aceite, feito; sem aceite e com decisões
 * pendentes, "proposto, aguardando a pessoa" (preso) quando o objeto ainda não tem receita, e com ressalva quando já tem, para não travar o
 * objeto que já tem etapa; sem aceite nem decisões, a ressalva "sem registro de aceite".
 */
export function estadoComAceite(passo, { aceite, decisoes, comReceita, de }) {
  if (!passo.feito) return passo;
  const ressalvas = [...(passo.ressalvas ?? [])];
  if (aceite) return { ...passo, aceite, ressalvas, decisoes: [] };
  if (decisoes.length && !comReceita) {
    return { ...passo, estado: 'proposto', feito: false, aceite: null, decisoes, ressalvas, falta: [`o aceite da pessoa ao ${de}: proposto, aguardando a pessoa (${decisoes.length} decisão(ões) pendente(s))`] };
  }
  ressalvas.push(`sem registro de aceite da pessoa ao ${de}${decisoes.length ? ` (${decisoes.length} decisão(ões) pendente(s))` : ''}`);
  return { ...passo, estado: 'ressalva', aceite: null, decisoes: decisoes.length ? decisoes : [], ressalvas };
}

/** As referências: imagens, contornos e prancha na pasta delas. */
export function lerReferencias(pasta) {
  const refs = pastaDasReferencias(pasta);
  const nomes = ordenados(refs);
  const imagens = nomes.filter((n) => IMAGEM.test(n));
  const contornos = nomes.filter((n) => /\.contornos\.json$/.test(n));
  const pranchas = nomes.filter((n) => /prancha/i.test(n));
  const feito = imagens.length + contornos.length + pranchas.length > 0;
  return { estado: feito ? 'feito' : 'falta', feito, pasta: relative(pasta, refs) || '.', imagens: imagens.length, contornos: contornos.length, pranchas: pranchas.length, falta: feito ? [] : ['imagem, contorno ou prancha em referencias/'] };
}

/* O comando de ver o rascunho e o de conferi-lo, com os argumentos na forma que `esboco:nucleo` e `conferir:vistas` leem. A saída da
 * conferência vai para a pasta convencionada `<objeto>/conferencia/<nome do esboço>/`, fora do versionamento (`.gitignore`), de onde o
 * fluxo lê o `resumo.json` dela. A configuração só de vistas por contornos usa o mesmo comando. */
const verEsboco = (arquivo) => `npm run esboco:nucleo -- ${arquivo} --vista <v> --saida <png> --sem-cores`;
const conferirEsboco = (esboco, config, saida) => `npm run conferir:vistas -- ${esboco} --config=${config} --saida=${saida} --captura=rapida`;
const BASE_DO_ESBOCO = /\.esboco\.(mjs|json)$/;

/** Os resumos de conferência em `pasta` (o `resumo.json` dela e o de cada subpasta), o mais recente primeiro. */
export function resumosDaConferencia(pasta) {
  if (!ehPasta(pasta)) return [];
  const candidatos = [join(pasta, 'resumo.json'), ...ordenados(pasta).map((n) => join(pasta, n, 'resumo.json'))];
  return candidatos.filter((c) => existsSync(c)).map((arquivo) => ({ arquivo, dados: lerJson(arquivo), quando: statSync(arquivo).mtimeMs }))
    .filter((r) => typeof r.dados?.formato === 'string' && r.dados.formato.startsWith('modelar.conferir-vistas') && typeof r.dados.esboco === 'string')
    .sort((a, b) => b.quando - a.quando || a.arquivo.localeCompare(b.arquivo));
}

/**
 * O rascunho e a conferência de cada um: `X.esboco.mjs|json` com `X.conferir.json` ao lado e o `resumo.json` da conferência que rodou,
 * procurado em `conferencia` (a pasta de `--conferencia`) ou na pasta convencionada `<objeto>/conferencia/`. A conferência configurada
 * e não rodada, ou rodada com sobra acima da tolerância, deixa o passo feito com ressalva.
 */
export function lerRascunho(pasta, { conferencia = null } = {}) {
  const refs = pastaDasReferencias(pasta);
  const nomes = ordenados(refs);
  const esbocos = nomes.filter((n) => BASE_DO_ESBOCO.test(n));
  const configs = new Set(nomes.filter((n) => /\.conferir\.json$/.test(n)).map((n) => n.replace(/\.conferir\.json$/, '')));
  const semConferencia = esbocos.filter((n) => !configs.has(n.replace(BASE_DO_ESBOCO, '')));
  const resumos = resumosDaConferencia(conferencia ?? join(pasta, 'conferencia'));
  const p = rel(refs);
  const saidaDe = (base) => (conferencia ? rel(conferencia) : `${rel(pasta)}/conferencia/${base}`);
  const conferencias = esbocos.filter((e) => !semConferencia.includes(e)).map((e) => {
    const base = e.replace(BASE_DO_ESBOCO, '');
    const resumo = resumos.find((r) => basename(r.dados.esboco) === e) ?? null;
    /* `passa` é o do resumo da conferência: a sobra passa da tolerância, isto é, fica acima dela */
    const sobras = (resumo?.dados.sobras ?? []).filter((x) => x.passa === true);
    const comando = conferirEsboco(`${p}/${e}`, `${p}/${base}.conferir.json`, saidaDe(base));
    return { esboco: e, config: `${base}.conferir.json`, resumo: resumo ? rel(resumo.arquivo) : null, rodada: Boolean(resumo), sobrasAcima: sobras.length, comando,
      ...(resumo ? {} : { estado: 'configurada, não rodada' }), sobras: sobras.map((x) => `${x.contida} em ${x.continente} na vista ${x.vista} (${x.maxMm} mm)`) };
  });
  const falta = []; const comandos = []; const ressalvas = [];
  if (esbocos.length === 0) {
    falta.push('o rascunho (referencias/<nome>.esboco.mjs ou .esboco.json)');
    comandos.push(`escrever o rascunho em ${p}/<nome>.esboco.mjs, pelas formas do esboço 2.0 (skill esbocar-opcoes), visto vista a vista com ${verEsboco(`${p}/<nome>.esboco.mjs`)}`);
  } else if (conferencias.length === 0) {
    falta.push('a conferência do rascunho (referencias/<nome>.conferir.json, para npm run conferir:vistas)');
    for (const e of semConferencia) {
      const base = e.replace(BASE_DO_ESBOCO, '');
      const config = `${p}/${base}.conferir.json`;
      comandos.push(`escrever ${config} com "objeto", "cores", "partes" (a classe de cor de cada parte do esboço) e "vistas" (a referência de cada vista, com "caixaRef", ou o arquivo de contornos); o formato está no cabeçalho de tools/modelar/conferir-vistas.mjs`,
        `${conferirEsboco(`${p}/${e}`, config, saidaDe(base))}, e levar cada pedido.md da saída a um crítico`);
    }
  } else {
    for (const c of conferencias) {
      if (!c.rodada) ressalvas.push(`a conferência de ${c.esboco} está configurada, não rodada; rodar com ${c.comando}`);
      else if (c.sobrasAcima) ressalvas.push(`a conferência de ${c.esboco} (${c.resumo}) tem ${c.sobrasAcima} sobra(s) acima da tolerância: ${c.sobras.join('; ')}`);
    }
  }
  const estado = falta.length ? 'falta' : ressalvas.length ? 'ressalva' : 'feito';
  return { estado, feito: estado !== 'falta', esbocos, conferencias, semConferencia, falta, ressalvas, comandos };
}

/**
 * As partes do alinhamento, na ordem de montagem: os itens numerados da seção das partes, cada um pelo primeiro nome entre crases,
 * com a família quando o item cita `procedural/familias/<id>/` e o perfil quando diz perfil `<id>`. Sem a seção ou sem lista, nada.
 */
export function partesDoAlinhamento(pasta) {
  const arquivo = join(pasta, 'ALINHAMENTO.md');
  if (!existsSync(arquivo)) return [];
  const linhas = readFileSync(arquivo, 'utf8').split(/\r?\n/);
  const inicio = linhas.findIndex((l) => /^#+.*\bpartes\b/i.test(l));
  if (inicio < 0) return [];
  const itens = [];
  let continua = false;
  for (const l of linhas.slice(inicio + 1)) {
    if (/^#/.test(l)) break;
    const m = /^\s{0,3}\d+[.)]\s+(.*)$/.exec(l);
    if (m) { itens.push(m[1]); continua = true; } else if (continua && /^\s+\S/.test(l)) itens[itens.length - 1] += ` ${l.trim()}`; else continua = false;
  }
  const vistos = new Set();
  return itens.map((texto, i) => {
    let nome = /`([^`]+)`/.exec(texto)?.[1];
    if (nome && /^[a-z][a-zA-Z0-9]*$/.test(nome) && /[A-Z]/.test(nome)) {
      /* o item da lista é a peça, com nome de pasta; o camelCase é nome de parte, que vem dentro dela */
      const pasta = nome.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
      if (!ehPasta(join(arquivo, '..', 'partes', pasta))) {
        throw new Error(`o item ${i + 1} da lista de partes do ALINHAMENTO.md cita \`${nome}\`, e o item da lista é a peça, com nome de pasta em letras minúsculas, dígitos e hífen (por exemplo \`${pasta}\`); os nomes das partes de dentro da peça, em camelCase, vêm depois, na descrição do item.`);
      }
      nome = pasta;
    }
    if (!nome || vistos.has(nome)) return null;
    vistos.add(nome);
    const familia = /procedural\/familias\/([\w-]+)/.exec(texto)?.[1] ?? null;
    const perfil = familia ? /\bperfil\s+`([^`]+)`/.exec(texto)?.[1] ?? null : null;
    return { nome, familia, perfil };
  }).filter(Boolean);
}

/**
 * As peças do objeto: as partes do alinhamento na ordem de montagem, com a família que ele cita, depois `partes/<peça>/receita.js`, as
 * que a montagem cita sem receita, ou a receita única da pasta.
 */
export function pecasDoObjeto(pasta, montagem = null) {
  const objeto = basename(pasta);
  const pecas = new Map();
  const doAlinhamento = partesDoAlinhamento(pasta);
  doAlinhamento.forEach((a, i) => {
    const dir = join(pasta, 'partes', a.nome);
    pecas.set(a.nome, { nome: a.nome, ref: `${objeto}/${a.nome}`, dir, receita: existsSync(join(dir, 'receita.js')) ? join(dir, 'receita.js') : null,
      ordem: { numero: i + 1, de: doAlinhamento.length }, familia: a.familia, perfil: a.perfil });
  });
  for (const nome of ordenados(join(pasta, 'partes'))) {
    if (pecas.has(nome) || nome.startsWith('_')) continue;
    const dir = join(pasta, 'partes', nome);
    if (!ehPasta(dir)) continue;
    pecas.set(nome, { nome, ref: `${objeto}/${nome}`, dir, receita: existsSync(join(dir, 'receita.js')) ? join(dir, 'receita.js') : null });
  }
  for (const i of montagem?.instancias ?? []) {
    if (i?.alvo?.tipo !== 'peca' || typeof i.alvo.ref !== 'string') continue;
    const nome = i.alvo.ref.split('/').pop();
    if (!pecas.has(nome) && i.alvo.ref.startsWith(`${objeto}/`)) pecas.set(nome, { nome, ref: i.alvo.ref, dir: join(pasta, 'partes', nome), receita: null });
  }
  if (pecas.size === 0 && existsSync(join(pasta, 'receita.js'))) {
    pecas.set(objeto, { nome: objeto, ref: objeto, dir: pasta, receita: join(pasta, 'receita.js') });
  }
  return [...pecas.values()];
}

const FONTE = /\.(m?js|cjs)$/;
const arquivosDe = (dir, { semRodadas = false } = {}) => (ehPasta(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
  const caminho = join(dir, e.name);
  if (e.isDirectory()) return semRodadas && e.name === 'rodadas' || e.name === 'node_modules' ? [] : arquivosDe(caminho, { semRodadas });
  return [caminho];
}) : []);

/** Quando o módulo comum mudou, em ms: o último commit que o tocou, ou o mtime dos arquivos quando há alteração sem commit ou não há git. */
function quandoMudou(dir) {
  const mtime = Math.max(0, ...arquivosDe(dir).map((a) => statSync(a).mtimeMs));
  const git = (...args) => execFileSync('git', args, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  try {
    if (git('status', '--porcelain', '--', '.')) return mtime;
    const commit = git('log', '-1', '--format=%ct', '--', '.');
    if (commit) return Number(commit) * 1000;
  } catch { /* sem git: vale o mtime */ }
  return mtime;
}

/**
 * O módulo comum do objeto, `partes/_comum/`: o que as receitas das peças dividem (a superfície e as linhas de vão, as ferramentas), que
 * não é peça. Devolve `null` sem a pasta; com ela, os arquivos, a assinatura do conteúdo, as peças cujas fontes (a receita e o que ela
 * importa dentro da pasta da peça) o importam por caminho relativo, e as que dependem dele e foram julgadas antes da última mudança dele
 * (`mudouDepoisDe`, pela data da última rodada registrada).
 */
export function moduloComum(pasta, pecas, { rodadasDe = () => [], mudouEm = quandoMudou } = {}) {
  const dir = join(pasta, 'partes', '_comum');
  if (!ehPasta(dir)) return null;
  const arquivos = arquivosDe(dir).sort();
  const assinatura = sha(arquivos.map((a) => `${relative(dir, a)}\n${readFileSync(a, 'utf8')}`).join('\n--\n'));
  const importa = (fonte) => {
    const texto = readFileSync(fonte, 'utf8');
    return [...texto.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)(['"])(\.{1,2}\/[^'"]+)\1/g)]
      .some((m) => { const alvo = resolve(dirname(fonte), m[2]); return alvo === dir || alvo.startsWith(dir + sep); });
  };
  const usadaPor = pecas.filter((p) => p.dir.startsWith(join(pasta, 'partes') + sep) && arquivosDe(p.dir, { semRodadas: true }).filter((a) => FONTE.test(a)).some(importa)).map((p) => p.nome);
  const quando = mudouEm(dir);
  const mudouDepoisDe = usadaPor.map((nome) => ({ nome, rodada: rodadasDe(nome).at(-1) })).filter(({ rodada }) => rodada?.registradaEm && Date.parse(rodada.registradaEm) < quando)
    .map(({ nome, rodada }) => ({ peca: nome, rodada: rodada.numero, registradaEm: rodada.registradaEm }));
  return { pasta: relative(pasta, dir), arquivos: arquivos.length, assinatura, usadaPor, mudouDepoisDe };
}

/**
 * A ação da peça sem medir: a de `acaoDaReceita` sobre as rodadas gravadas, com a medição da última rodada quando o texto da receita é
 * o mesmo que ela julgou, e presumida aprovada quando o texto mudou (`medida: false` diz isso). A mesma forma com texto novo não é
 * reconhecida aqui (pede executar a receita), e sai como `revisar`.
 */
export function acaoSemMedir(rodadas, textoDaReceita, { limite } = {}) {
  const sha256 = sha(textoDaReceita);
  const ultima = rodadas.at(-1);
  const mesmoTexto = Boolean(ultima?.receita?.sha256) && ultima.receita.sha256 === sha256;
  const medicao = mesmoTexto ? { passou: ultima.medidas.passou, relatorio: ultima.medidas.relatorio } : { passou: true, relatorio: 'presumida' };
  return { ...acaoDaReceita(rodadas, { sha256, medicao }, { limite }), medida: mesmoTexto, mesmoTexto };
}

/** As etapas da montagem, na ordem dela, com o estado do registro (`aberta` quando o registro não a tem) e a próxima, por `proximaEtapa`. */
export function lerEtapas(pasta) {
  const arquivo = join(pasta, 'montagem.json');
  const montagem = lerJson(arquivo);
  if (!montagem) return null;
  const registro = lerJson(join(pasta, 'montagem.etapas.json'));
  const estado = new Map((registro?.etapas ?? []).map((e) => [e.instancia, e.estado]));
  const etapas = (Array.isArray(montagem.etapas) ? montagem.etapas : []).map((instancia) => ({ instancia, estado: estado.get(instancia) ?? 'aberta' }));
  const proxima = proximaEtapa({ etapas });
  return {
    arquivo, montagem, etapas, proxima: proxima?.instancia ?? null,
    fixas: etapas.filter((e) => e.estado === 'fixa').map((e) => e.instancia),
    abertas: etapas.filter((e) => e.estado !== 'fixa').map((e) => e.instancia),
    registro: Boolean(registro),
  };
}

const rel = (p) => relative(REPO, p) || '.';
const comandoRegistrar = (ref) => `node tools/modelar/rodada-de-modelagem.mjs ${ref} --registrar --modelador <arquivo do modelador> --critico <arquivo do crítico>`;

/* O próximo comando de uma peça, pela ação dela e pelo estado das etapas dela. */
function proximoDaPeca(p, etapas) {
  const montagemRel = etapas ? rel(etapas.arquivo) : null;
  if (p.estado === 'fixa') return null;
  if (!p.receita) {
    const ordem = p.ordem ? ` (${p.ordem.numero} de ${p.ordem.de} na ordem de montagem do ALINHAMENTO.md)` : '';
    const roteiro = p.familia
      ? `npm run comecar -- modelar/peca/familia, pela família procedural/familias/${p.familia}/${p.perfil ? `, perfil ${p.perfil}` : ''}`
      : 'npm run comecar -- modelar/peca/nova';
    return `criar a peça ${p.ref}${ordem}: ${roteiro}, e despachar o modelador (skill criar-peca) com o PLANO do ALINHAMENTO.md para ${rel(join(p.dir, 'receita.js'))}`;
  }
  if (p.acao === 'modelar') {
    const defeitos = p.defeitos.length ? `com os defeitos em aberto: ${p.defeitos.join('; ')}` : 'com o motivo acima';
    return `despachar o modelador (skill criar-peca) para ${p.ref}, ${defeitos}; depois registrar sem crítico: node tools/modelar/rodada-de-modelagem.mjs ${p.ref} --registrar --modelador <arquivo>`;
  }
  if (p.acao === 'revisar') return `npm run vistas:critica -- ${p.ref}, despachar o crítico com o pedido.md e registrar: ${comandoRegistrar(p.ref)}`;
  const instancias = p.instancias.filter((i) => etapas?.abertas.includes(i));
  if (!etapas || instancias.length === 0) {
    const fora = etapas && p.instancias.length === 0 ? `; a montagem ${montagemRel} não cita a peça` : '';
    if (p.acao === 'parar-fechou') return fora ? `pôr a peça em ${montagemRel}, nas instâncias e nas etapas${fora}` : null;
    return `decisão da pessoa (${p.acao}): estender o limite em rodadas/limite.json ou aceitar a peça como está${fora}`;
  }
  const fixar = `npm run etapas -- ${montagemRel} --fixar ${instancias[0]} --por "<quem aceitou, data>"`;
  const ordem = etapas.proxima && etapas.proxima !== instancias[0] ? ` (em ordem: antes, a etapa ${etapas.proxima})` : '';
  if (p.acao === 'parar-fechou') return `fixar: ${fixar}${ordem}`;
  return `decisão da pessoa (${p.acao}): fixar com ${fixar} --aceite-humano${ordem}, ou estender o limite em rodadas/limite.json`;
}

/**
 * O fluxo do objeto: o estado de cada passo, as peças com a ação e o próximo comando, as etapas e o passo em que o objeto está.
 * `medir(ref)` mede uma peça de verdade (a `acaoDaPeca` de `--acao`); sem ele a ação sai de `acaoSemMedir`.
 */
export async function fluxoDoObjeto(pastaDoObjeto, { medir = null, acervo = ACERVO, conferencia = null } = {}) {
  const pasta = resolve(pastaDoObjeto);
  const raizDoAcervo = resolve(acervo);
  const esperado = `espera-se a pasta de um objeto, existente ou a criar em ${rel(raizDoAcervo)}/<objeto>/`;
  if (existsSync(pasta) && !statSync(pasta).isDirectory()) throw new Error(`${pastaDoObjeto}: é um arquivo; ${esperado}.`);
  const existe = existsSync(pasta);
  if (!existe && !pasta.startsWith(raizDoAcervo + sep)) throw new Error(`${pastaDoObjeto}: a pasta não existe e está fora de ${rel(raizDoAcervo)}/; ${esperado}.`);
  const objeto = basename(pasta);
  const alinhamento = lerAlinhamento(pasta);
  const referencias = lerReferencias(pasta);
  if (conferencia && !ehPasta(conferencia)) throw new Error(`--conferencia=${conferencia}: a pasta não existe; espera-se a pasta de saída de npm run conferir:vistas, com o resumo.json.`);
  const rascunho = lerRascunho(pasta, { conferencia: conferencia ? resolve(conferencia) : null });
  const etapas = lerEtapas(pasta);
  const estadoDaInstancia = new Map((etapas?.etapas ?? []).map((e) => [e.instancia, e.estado]));
  const pecas = [];
  const rodadasPorPeca = new Map();
  for (const p of pecasDoObjeto(pasta, etapas?.montagem)) {
    const instancias = (etapas?.montagem.instancias ?? []).filter((i) => i?.alvo?.ref === p.ref || i?.alvo?.ref?.split('/').pop() === p.nome).map((i) => i.id)
      .filter((id) => estadoDaInstancia.has(id));
    const fixa = instancias.length > 0 && instancias.every((i) => estadoDaInstancia.get(i) === 'fixa');
    const pastaRodadas = join(p.dir, 'rodadas');
    const rodadas = lerRodadas(p.ref, { pasta: pastaRodadas });
    rodadasPorPeca.set(p.nome, rodadas);
    const linha = { peca: p.nome, ref: p.ref, receita: p.receita ? rel(p.receita) : null, rodadas: rodadas.length, instancias };
    if (fixa) Object.assign(linha, { estado: 'fixa', acao: null, motivo: 'todas as etapas da peça estão fixas.', defeitos: [] });
    else if (!p.receita) Object.assign(linha, { estado: 'sem receita', acao: 'modelar', motivo: 'a peça não tem receita.', defeitos: [] });
    else {
      const limite = limiteDaPeca(p.ref, { pasta: pastaRodadas });
      const d = medir ? { ...(await medir(p.ref, { rodadas, limite, pasta: pastaRodadas })), medida: true }
        : acaoSemMedir(rodadas, readFileSync(p.receita, 'utf8'), { limite });
      const abertos = defeitosAbertos(rodadas).map((x) => `${x.parte}: ${x.tipo} ${x.sentido} em ${x.onde}`);
      Object.assign(linha, { estado: 'em aberto', acao: d.acao, motivo: d.motivo, medida: d.medida, defeitos: d.acao === 'modelar' ? abertos : [] });
    }
    linha.proximo = proximoDaPeca({ ...p, ...linha }, etapas);
    pecas.push(linha);
  }
  const comReceita = pecas.some((p) => p.receita);
  const comum = moduloComum(pasta, pecasDoObjeto(pasta, etapas?.montagem), { rodadasDe: (nome) => rodadasPorPeca.get(nome) ?? [] });
  const decisoes = alinhamento.decisoes ?? [];
  const alinhamentoFinal = estadoComAceite(alinhamento, { aceite: alinhamento.aceite, decisoes, comReceita, de: 'alinhamento' });
  const rascunhoFinal = estadoComAceite(rascunho.estado === 'falta' ? { ...rascunho, feito: false } : rascunho,
    { aceite: alinhamento.aceiteDoRascunho, decisoes, comReceita, de: 'rascunho' });
  /* a peça sem receita espera o aceite da pessoa ao alinhamento (ou ao rascunho) proposto */
  const espera = !comReceita && (alinhamentoFinal.estado === 'proposto' || rascunhoFinal.estado === 'proposto')
    ? `o ${alinhamentoFinal.estado === 'proposto' ? 'alinhamento' : 'rascunho'} está proposto, aguardando a pessoa; sem receita até o aceite` : null;
  if (espera) for (const p of pecas) if (!p.receita) Object.assign(p, { proximo: null, espera });
  const noLaco = pecas.filter((p) => p.acao === 'modelar' || p.acao === 'revisar');
  const receitasFeitas = comReceita && noLaco.length === 0;
  const comAs = (feito, resto) => ({ estado: feito ? 'feito' : 'falta', feito, ...resto });
  const montagemFeita = etapas ? etapas.etapas.length > 0 && etapas.abertas.length === 0 : pecas.length === 1;
  const pendentes = pecas.filter((p) => p.proximo !== null || p.espera);
  const passos = [
    { nome: 'alinhamento', ...alinhamentoFinal },
    { nome: 'referencias', ...referencias },
    { nome: 'rascunho', ...(rascunho.estado === 'falta' ? rascunho : rascunhoFinal) },
    {
      nome: 'receitas', ...comAs(receitasFeitas, {}),
      falta: pecas.length ? noLaco.map((p) => `${p.peca} (${p.receita ? p.acao : 'sem receita'})`) : ['as receitas (partes/<peça>/receita.js ou receita.js)'],
    },
    {
      nome: 'montagem', ...comAs(montagemFeita, {}),
      falta: etapas ? etapas.abertas.map((i) => `a etapa ${i} (${estadoDaInstancia.get(i)})`) : pecas.length > 1 ? ['montagem.json'] : [],
      ...(etapas ? { arquivo: rel(etapas.arquivo), fixas: etapas.fixas.length, abertas: etapas.abertas, proxima: etapas.proxima }
        : { arquivo: null, nota: pecas.length === 1 ? 'peça única, sem montagem' : null }),
    },
  ];
  const fechado = receitasFeitas && montagemFeita && pendentes.length === 0;
  passos.push({ nome: 'fechamento', ...comAs(fechado, {}), falta: pendentes.map((p) => `${p.peca} (${p.acao ?? p.estado})`) });
  /* com receita, os passos 1 a 3 não prendem: o que falta deles sai como falta */
  const inicio = comReceita ? 3 : 0;
  const indice = fechado ? 5 : passos.findIndex((s, i) => i >= inicio && !s.feito);
  const atual = indice < 0 ? 5 : indice;
  const contexto = { pasta, existe, alinhamento: alinhamentoFinal, rascunho: rascunhoFinal.estado === 'proposto' ? rascunhoFinal : rascunho, etapas, pecas };
  for (const [i, s] of passos.entries()) s.comandos = s.feito ? [] : comandosDoPasso(i, contexto);
  /* o agora é só o que falta do passo em que o objeto está; o fechamento feito ainda dá a auditoria e o custo */
  const comandos = fechado ? comandosDoPasso(5, contexto) : passos[atual].comandos;
  const avisos = [];
  if (comum) {
    if (comum.usadaPor.length === 0) avisos.push(`o módulo comum ${comum.pasta}/ não é importado por nenhuma receita`);
    for (const m of comum.mudouDepoisDe) avisos.push(`o módulo comum ${comum.pasta}/ mudou depois da rodada ${m.rodada} de ${m.peca} (${m.registradaEm}), que depende dele: medir e registrar uma rodada nova da peça`);
  }
  return {
    formato: 'modelar.fluxo-do-objeto', versao: 1, objeto, pasta: rel(pasta), existe,
    passo: { numero: atual + 1, nome: PASSOS[atual] },
    passos: passos.map((s, i) => ({ numero: i + 1, ...s, ressalvas: s.ressalvas ?? [] })),
    pecas,
    ...(comum ? { comum } : {}),
    avisos,
    comandos,
  };
}

/* O passo proposto: o que levar à pessoa e onde registrar o aceite dela. Não manda criar receita. */
function propostaAPessoa(p, de, decisoes) {
  const resumo = (t) => (t.length > 150 ? `${t.slice(0, 147)}...` : t);
  return [
    `o ${de} está proposto, aguardando a pessoa: levar a ela as ${decisoes.length} decisão(ões) abaixo, com a recomendação de cada uma (skill alinhar-modelagem), e só com o aceite dela registrar em ${p}/ALINHAMENTO.md, na seção "Aceite", a linha "- ${de}: aceito pela pessoa em AAAA-MM-DD, \"<as palavras dela>\"" (ou "- delegação: pela pessoa em AAAA-MM-DD, \"<as palavras dela>\"" para os dois); sem esse registro não criar receita`,
    ...decisoes.map((d, i) => `decisão ${i + 1}: ${resumo(d)}`),
  ];
}

/* O que falta para completar um passo, sem instrução de outro passo. */
function comandosDoPasso(indice, { pasta, existe, alinhamento, rascunho, etapas, pecas }) {
  const p = rel(pasta);
  switch (PASSOS[indice]) {
    case 'alinhamento': if (alinhamento.estado === 'proposto') return propostaAPessoa(p, 'alinhamento', alinhamento.decisoes); return [
      ...(existe ? [] : [`criar a pasta ${p}/`]),
      existsSync(join(pasta, 'ALINHAMENTO.md'))
        ? `completar ${p}/ALINHAMENTO.md com ${alinhamento.falta.join(' e ')} (skill alinhar-modelagem)`
        : `conduzir o alinhamento com a pessoa (skill alinhar-modelagem) e escrever ${p}/ALINHAMENTO.md com o objeto e o recorte dele, as referências com a vista de cada uma, a medida da escala, a tabela de medidas (seção "Medidas") com a fonte de cada medida, a seção "Partes" com a ordem de montagem, as juntas com o eixo e o curso de cada movimento, os pares que se tocam e o que reprova o objeto`,
    ];
    case 'referencias': return [
      `pôr em ${p}/referencias/ as imagens de referência, uma por vista e sem marca nem logotipo; o contorno por parte, quando a conferência pedir, sai pela skill contorno-da-imagem (npm run contorno)`,
    ];
    case 'rascunho': return rascunho.estado === 'proposto' ? propostaAPessoa(p, 'rascunho', rascunho.decisoes) : rascunho.comandos;
    case 'receitas': {
      if (pecas.length === 0) return [
        `levar o rascunho conferido à receita, uma peça por vez: npm run comecar -- modelar/peca/nova, e despachar o modelador (skill criar-peca) com o PLANO do ALINHAMENTO.md para ${p}/partes/<peça>/receita.js`,
      ];
      /* as peças com receita no laço, e das sem receita só a próxima a criar */
      const comReceita = pecas.filter((x) => x.receita && x.proximo).map((x) => x.proximo);
      const proxima = pecas.find((x) => !x.receita && x.proximo);
      return [...comReceita, ...(proxima ? [proxima.proximo] : [])];
    }
    case 'montagem': {
      const daPeca = pecas.filter((x) => x.proximo).map((x) => x.proximo);
      if (daPeca.length) return daPeca;
      if (!etapas) return [`escrever ${p}/montagem.json com as instâncias e as etapas (skill auditar-montagem)`];
      return [`npm run etapas -- ${rel(etapas.arquivo)}`];
    }
    default: return [
      ...pecas.filter((x) => x.proximo).map((x) => x.proximo),
      ...(etapas ? [`npm run etapas -- ${rel(etapas.arquivo)} --auditar`] : []),
      ...(pecas.some((x) => x.rodadas > 0) ? [`npm run custo:peca -- ${p}`] : []),
    ];
  }
}

/** O fluxo em texto curto: o passo, o que falta, as peças em aberto com o próximo comando, e os comandos do passo. */
export function emTexto(f) {
  const linhas = [`objeto ${f.objeto} (${f.pasta}): passo ${f.passo.numero} de 6, ${f.passo.nome}`];
  for (const s of f.passos) {
    const extra = s.nome === 'montagem' && s.arquivo ? ` (${s.fixas} fixa(s), ${s.abertas.length} aberta(s)${s.proxima ? `, próxima ${s.proxima}` : ''})`
      : s.nota ? ` (${s.nota})` : '';
    const estado = s.estado === 'falta' ? `falta ${s.falta.join('; ') || '—'}` : s.estado === 'proposto' ? `proposto, aguardando a pessoa (${s.decisoes.length} decisão(ões) sem aceite)` : s.estado === 'ressalva' ? `feito, com ressalva: ${s.ressalvas.join('; ')}` : 'feito';
    linhas.push(`  ${s.numero}. ${s.nome}: ${estado}${extra}`);
  }
  const abertas = f.pecas.filter((p) => p.estado !== 'fixa');
  const fixas = f.pecas.length - abertas.length;
  linhas.push(`peças: ${f.pecas.length}, ${fixas} fixa(s)${abertas.length ? `, ${abertas.length} em aberto:` : ''}`);
  for (const p of abertas) {
    linhas.push(`  ${p.peca}: ${p.acao ?? p.estado}${p.medida === false ? ' (sem medir; confirme com --acao)' : ''} — ${p.motivo}`);
    if (p.proximo) linhas.push(`    próximo: ${p.proximo}`);
  }
  if (abertas.some((p) => p.espera)) linhas.push(`  (as peças sem receita esperam: ${abertas.find((p) => p.espera).espera})`);
  if (f.comum) linhas.push(`módulo comum ${f.comum.pasta}/ (${f.comum.arquivos} arquivo(s), ${f.comum.assinatura.slice(0, 15)}): importado por ${f.comum.usadaPor.join(', ') || 'nenhuma receita'}`);
  for (const a of f.avisos ?? []) linhas.push(`aviso: ${a}`);
  linhas.push(f.comandos.length ? `agora:\n${f.comandos.map((c) => `  ${c}`).join('\n')}` : 'agora: nada a rodar.');
  return linhas.join('\n');
}

/** A linha de comando: devolve `{ codigo, texto }` sem sair do processo. */
export async function rodar(args, { acervo = ACERVO } = {}) {
  const posicionais = args.filter((a) => !a.startsWith('--'));
  const opcoes = args.filter((a) => a.startsWith('--'));
  const desconhecida = opcoes.find((o) => o !== '--json' && o !== '--medir' && !/^--conferencia=./.test(o));
  if (posicionais.length !== 1 || desconhecida) {
    return { codigo: 2, texto: `uso: fluxo-do-objeto.mjs <pasta do objeto ou nome> [--json] [--medir] [--conferencia=<pasta>]${desconhecida ? ` (opção desconhecida: ${desconhecida})` : ''}` };
  }
  const alvo = posicionais[0];
  /* o nome solto (sem barra) é o do acervo, exista a pasta ou não */
  const pasta = existsSync(alvo) ? alvo : ehPasta(join(acervo, alvo)) || !/[\\/]/.test(alvo) ? join(acervo, alvo) : alvo;
  const medir = opcoes.includes('--medir') ? (ref, opcoesDaPeca) => acaoDaPeca(ref, opcoesDaPeca) : null;
  let fluxo;
  const conferencia = opcoes.find((o) => o.startsWith('--conferencia='))?.slice('--conferencia='.length) ?? null;
  try { fluxo = await fluxoDoObjeto(pasta, { medir, acervo, conferencia }); } catch (erro) { return { codigo: 2, texto: `fluxo-do-objeto: ${erro.message}` }; }
  return { codigo: 0, texto: opcoes.includes('--json') ? JSON.stringify(fluxo, null, 2) : emTexto(fluxo) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { codigo, texto } = await rodar(process.argv.slice(2));
  (codigo === 0 ? console.log : console.error)(texto);
  process.exitCode = codigo;
}
