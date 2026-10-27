#!/usr/bin/env node
/* comecar.mjs — a entrada por intenção: `npm run comecar -- [roteiro] [--arquivo <x.esboco.json>]`.
 *
 * Os roteiros de `docs/mecanifica/roteiros/roteiros.json` formam uma árvore pelos nomes (`modelar/peca/familia`). Sem roteiro,
 * ou com o nome de um grupo (`modelar`, `modelar/peca`), o comando faz a pergunta do grupo e lista os ramos, e a resposta é o
 * argumento da chamada seguinte. Com uma folha (ou só o último nome, quando é único), devolve a leitura antes de começar, com
 * as seções `arquivo#âncora` entregues ali mesmo, o que abrir só quando a condição aparecer, a skill, os comandos, a lista
 * gerada na hora (famílias, peças do acervo ou operações) e o passo seguinte lido do estado: o plano ativo e a tarefa de
 * `comunicacao.md` para quem muda o projeto, e a situação do Condutor para o esboço com `--arquivo`. Um nome que não é nó
 * busca o tópico nos títulos dos documentos de uso, das skills e de `docs/mecanifica/`, e `arquivo#âncora` entrega a seção.
 *
 * O comando só lê. O Condutor só é consultado quando o estado dele já existe, porque a situação do Condutor cria o estado
 * (com o estado existente, ela o regrava com o mesmo conteúdo). A
 * ferramenta MCP `comecar` chama a mesma função `comecar`, e as duas respondem igual. */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ancoraDe, carregarRoteiros, filhosDoNo, medirRoteiro, partesDaLeitura, RAIZ, textoDaLeitura } from '../mapa/roteiros.mjs';
import { lerTopicos, README_DO_ESBOCO } from './esboco-ajuda.mjs';
import { registrarUso } from './uso.mjs';
import { COMPONENTES } from '../../modulos/esboco/componentes/index.js';

const milhar = (n) => n.toLocaleString('pt-BR');

/* O plano ativo de `docs/mecanifica/planos/` (o arquivo com `**Estado:** ativo`) e a primeira fatia que não diz "Feita". */
export function planoAtivo(raiz = RAIZ) {
  const pasta = join(raiz, 'docs/mecanifica/planos');
  for (const nome of readdirSync(pasta).filter((n) => n.endsWith('.md')).sort()) {
    const texto = readFileSync(join(pasta, nome), 'utf8');
    if (!/^\*\*Estado:\*\* ativo\s*$/m.test(texto)) continue;
    const titulo = /^# (.+)$/m.exec(texto)?.[1] ?? nome;
    const secao = /^## Fatias\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(texto)?.[1] ?? '';
    const fatias = [];
    for (const linha of secao.split('\n')) {
      const m = /^(\d+)\. (.*)$/.exec(linha);
      if (m) fatias.push({ numero: Number(m[1]), texto: m[2] });
      else if (fatias.length > 0 && /^\s+\S/.test(linha)) fatias[fatias.length - 1].texto += ` ${linha.trim()}`;
    }
    const aberta = fatias.find((f) => !/\bFeita\b/.test(f.texto)) ?? null;
    return { arquivo: `docs/mecanifica/planos/${nome}`, titulo, fatiaAberta: aberta && { numero: aberta.numero, texto: aberta.texto.split(/(?<=\.) /)[0] } };
  }
  return null;
}

/* As tarefas da seção "Tarefas" de `comunicacao.md`: [{ id, titulo, status }]. */
export function tarefasAbertas(raiz = RAIZ) {
  const caminho = join(raiz, 'comunicacao.md');
  if (!existsSync(caminho)) return [];
  const secao = readFileSync(caminho, 'utf8').split(/^## Tarefas\s*$/m)[1] ?? '';
  return [...secao.matchAll(/^### (T\d+)\s*[—-]\s*(.+)$([\s\S]*?)(?=^### |(?![\s\S]))/gm)].map((m) => ({
    id: m[1],
    titulo: m[2].trim(),
    status: /\*\*Status:\*\*\s*([^\n]+)/.exec(m[3])?.[1].trim() ?? 'sem status',
  }));
}

function passoDaTarefa(t) {
  if (t.status === 'feita') return `Revise o relatório da ${t.id} em comunicacao.md e limpe a tarefa depois.`;
  if (t.status === 'bloqueada') return `Resolva o bloqueio da ${t.id} registrado em comunicacao.md.`;
  return `A ${t.id} está com a outra IA (${t.status}); não mexa nos arquivos dela até o relatório.`;
}

/* A situação do Condutor de um esboço, só quando o estado já existe: { texto, passo }. */
export function situacaoDoCondutor(arquivo, raiz = RAIZ) {
  if (!existsSync(arquivo)) return { texto: null, passo: `O arquivo ${arquivo} não existe; confira o caminho.` };
  if (!existsSync(`${arquivo}.condutor.json`)) {
    return { texto: null, passo: `O esboço ainda não tem Condutor: rode npm run esboco -- --condutor ${arquivo} para começar pela Maquete.` };
  }
  const r = spawnSync(process.execPath, [join(raiz, 'tools/mecanifica/esboco.mjs'), '--condutor', arquivo], { encoding: 'utf8', cwd: raiz });
  const texto = (r.stdout || r.stderr || '').trim();
  const portao = /^Portão de (.+?): (passa|não passa)/m.exec(texto);
  let passo = 'Siga o que o Condutor diz acima.';
  if (/Concluído/.test(texto) && !portao) passo = 'O fluxo do Condutor está concluído: registre o custo no banco de provas, se o objeto for de lá.';
  else if (portao?.[2] === 'passa') passo = `O Portão de ${portao[1]} passa: rode npm run esboco -- --condutor ${arquivo} --proximo.`;
  else if (portao) passo = `O Portão de ${portao[1]} não passa: resolva o que falta acima e rode --proximo.`;
  return { texto, passo };
}

/* As famílias registradas, do `familia.json` de cada uma: `id versão: perfis`. */
export function listaDeFamilias(raiz = RAIZ) {
  const pasta = join(raiz, 'procedural/familias');
  return readdirSync(pasta, { withFileTypes: true }).filter((e) => e.isDirectory() && existsSync(join(pasta, e.name, 'familia.json'))).map((e) => {
    const f = JSON.parse(readFileSync(join(pasta, e.name, 'familia.json'), 'utf8'));
    const perfis = Object.keys(f.perfis ?? {});
    return `${f.id} ${f.versao}: ${perfis.length > 0 ? `perfis ${perfis.join(', ')}` : 'sem perfil gravado'}`;
  }).sort();
}

/* As peças do acervo, cada pasta de `procedural/pecas/` com `receita.js`, e as partes de um objeto como `objeto/parte`. */
export function listaDePecas(raiz = RAIZ) {
  const pasta = join(raiz, 'procedural/pecas');
  const nomes = [];
  for (const e of readdirSync(pasta, { withFileTypes: true }).filter((x) => x.isDirectory())) {
    if (existsSync(join(pasta, e.name, 'receita.js'))) nomes.push(e.name);
    const partes = join(pasta, e.name, 'partes');
    if (existsSync(partes)) for (const p of readdirSync(partes, { withFileTypes: true })) if (p.isDirectory() && existsSync(join(partes, p.name, 'receita.js'))) nomes.push(`${e.name}/${p.name}`);
  }
  return nomes.sort();
}

/* O que o roteiro de modelar tem disponível, sem carregar referência inteira. */
function disponivel(roteiro, raiz) {
  if (roteiro.lista === 'familias') return listaDeFamilias(raiz).map((l) => `família ${l}`);
  if (roteiro.lista === 'pecas') return [`${listaDePecas(raiz).length} peças no acervo: ${listaDePecas(raiz).join(', ')}`];
  if (roteiro.id === 'modelar/esboco' || roteiro.id === 'modelar/laco-do-esboco') {
    const topicos = lerTopicos(readFileSync(README_DO_ESBOCO, 'utf8'));
    const k = topicos.findIndex((t) => t.id === 'formas');
    const formas = [];
    for (let i = k + 1; i < topicos.length && topicos[i].nivel === 3; i++) formas.push(topicos[i].id);
    return [
      `formas ${formas.join(', ')} (npm run esboco -- --ajuda <forma>)`,
      `componentes ${Object.keys(COMPONENTES).join(', ')} (npm run esboco -- --ajuda catalogo)`,
    ];
  }
  if (roteiro.id.startsWith('modelar/')) {
    const caminho = join(raiz, 'docs/mecanifica/gerado/catalogo-capacidades.json');
    const operacoes = existsSync(caminho) ? JSON.parse(readFileSync(caminho, 'utf8')).operacoes ?? [] : [];
    return [`${operacoes.length} operações do motor em docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md (no MCP, buscar_capacidades)`];
  }
  return [];
}

/* O estado do trabalho que vale para a lista e para o roteiro `mudar/plano`. */
function estadoGeral(raiz) {
  const plano = planoAtivo(raiz);
  const tarefas = tarefasAbertas(raiz);
  const linhas = [];
  linhas.push(plano
    ? `plano ativo "${plano.titulo}" (${plano.arquivo})${plano.fatiaAberta ? `, fatia ${plano.fatiaAberta.numero} em aberto: ${plano.fatiaAberta.texto}` : ', sem fatia em aberto'}`
    : 'nenhum plano ativo: o backlog não autoriza implementação');
  linhas.push(tarefas.length > 0
    ? `tarefas em comunicacao.md: ${tarefas.map((t) => `${t.id} (${t.status})`).join(', ')}`
    : 'nenhuma tarefa em comunicacao.md');
  return { plano, tarefas, linhas };
}

function passoDeMudar(estado, roteiro) {
  if (estado.tarefas.length > 0) return passoDaTarefa(estado.tarefas[0]);
  if (!estado.plano) return 'Sem plano ativo, proponha um plano em docs/mecanifica/planos/ antes de implementar.';
  if (!estado.plano.fatiaAberta) return `O plano "${estado.plano.titulo}" não tem fatia em aberto: confira o gate de saída e escreva o fechamento.`;
  return `Trabalhe na fatia ${estado.plano.fatiaAberta.numero} de ${estado.plano.arquivo}.`;
}

/* Resolve a consulta: { roteiro }, { grupo: id, filhos } quando é um nó da árvore, ou { desconhecido: true }. */
export function resolverRoteiro(roteiros, consulta) {
  const q = String(consulta).trim().toLowerCase();
  const exato = roteiros.find((r) => r.id === q);
  if (exato) return { roteiro: exato };
  const filhos = filhosDoNo(roteiros, q);
  if (filhos.length === 1 && filhos[0].roteiro) return { roteiro: filhos[0].roteiro };
  if (filhos.length > 0) return { grupo: q, filhos };
  const ultimo = roteiros.filter((r) => r.id.split('/').pop() === q);
  if (ultimo.length === 1) return { roteiro: ultimo[0] };
  return { desconhecido: true };
}

/* As linhas de um nó: cada ramo com a frase da folha, ou com a pergunta do grupo, que leva a outra chamada. */
function linhasDosFilhos(filhos, perguntas) {
  const largura = Math.max(...filhos.map((f) => f.id.length)) + 2;
  return filhos.map((f) => `  ${f.id.padEnd(largura)}${f.roteiro ? f.roteiro.quando : `${perguntas?.[f.id] ?? ''} (npm run comecar -- ${f.id})`}`);
}

const resumoDosFilhos = (filhos, perguntas) => filhos.map((f) => (f.roteiro
  ? { id: f.id, intencao: f.roteiro.intencao, quando: f.roteiro.quando }
  : { id: f.id, grupo: true, pergunta: perguntas?.[f.id] ?? null }));

function textoDaLista(roteiros, titulo) {
  const largura = Math.max(...roteiros.map((r) => r.id.length)) + 2;
  return [`${titulo} (npm run comecar -- <roteiro>):`, ...roteiros.map((r) => `  ${r.id.padEnd(largura)}${r.quando}`)].join('\n');
}

/* Os documentos onde a busca por tópico procura títulos: os de uso, as skills e os de `docs/mecanifica/` na raiz dela. */
function documentosDaBusca(raiz) {
  const lista = [];
  const pastaDe = (rel) => (existsSync(join(raiz, rel)) ? readdirSync(join(raiz, rel)).filter((n) => n.endsWith('.md')).map((n) => `${rel}/${n}`) : []);
  lista.push(...pastaDe('docs/mecanifica/usar'), ...pastaDe('docs/mecanifica'));
  const skills = join(raiz, '.claude/skills');
  if (existsSync(skills)) for (const s of readdirSync(skills)) if (existsSync(join(skills, s, 'SKILL.md'))) lista.push(`.claude/skills/${s}/SKILL.md`);
  return lista;
}

const semAcento = (t) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

/* A busca por tópico: os títulos que contêm mais palavras da consulta, como `arquivo#âncora`, com o tamanho da seção. */
export function buscarTopico(consulta, raiz = RAIZ, limite = 8) {
  const palavras = semAcento(consulta).split(/[^\p{L}\p{N}]+/u).filter((p) => p.length >= 3);
  if (palavras.length === 0) return [];
  const achados = [];
  for (const arquivo of documentosDaBusca(raiz)) {
    let cerca = false;
    for (const linha of readFileSync(join(raiz, arquivo), 'utf8').split('\n')) {
      if (/^```/.test(linha)) cerca = !cerca;
      const m = !cerca && /^#{1,4} (.+)$/.exec(linha);
      if (!m) continue;
      const titulo = semAcento(m[1]);
      const pontos = palavras.filter((p) => titulo.includes(p)).length;
      if (pontos === 0) continue;
      const item = `${arquivo}#${ancoraDe(m[1])}`;
      achados.push({ item, titulo: m[1].trim(), pontos, bytes: Buffer.byteLength(textoDaLeitura(item, raiz) ?? '') });
    }
  }
  return achados.sort((a, b) => b.pontos - a.pontos || a.bytes - b.bytes || a.item.localeCompare(b.item)).slice(0, limite);
}

/* A resposta da entrada: { ok, codigo, texto, resultado }. `arquivo` é o esboço cujo Condutor dá o passo seguinte. */
export function comecar({ roteiro: consulta = null, arquivo = null, raiz = RAIZ } = {}) {
  const dados = carregarRoteiros(raiz);
  const estado = estadoGeral(raiz);
  if (consulta === null || String(consulta).trim() === '') {
    const filhos = filhosDoNo(dados.roteiros, '');
    const passo = 'Escolha o ramo da tarefa e rode npm run comecar -- <ramo>; para outra coisa, npm run comecar -- <tópico>.';
    const texto = ['Qual é a tarefa? (npm run comecar -- <ramo>)', ...linhasDosFilhos(filhos, dados.perguntas), '', 'Estado:', ...estado.linhas.map((l) => `  ${l}`), '', `Passo seguinte: ${passo}`].join('\n');
    return { ok: true, codigo: 0, texto: `${texto}\n`, resultado: { roteiros: resumoDosFilhos(filhos, dados.perguntas), estado: estado.linhas, passo } };
  }
  const q = String(consulta).trim();
  if (q.includes('#')) {
    const secao = textoDaLeitura(q, raiz);
    if (secao !== null) return { ok: true, codigo: 0, texto: `${secao}\n`, resultado: { secao: q, bytes: Buffer.byteLength(secao) } };
  }
  const achado = resolverRoteiro(dados.roteiros, q);
  registrarUso({ evento: 'comecar', roteiro: q.toLowerCase(), achado: achado.desconhecido !== true });
  if (achado.grupo) {
    const pergunta = dados.perguntas?.[achado.grupo] ?? `Qual destes ramos de "${achado.grupo}"?`;
    const passo = 'Escolha o ramo e rode npm run comecar -- <ramo>.';
    return {
      ok: true, codigo: 0,
      texto: `${[pergunta, ...linhasDosFilhos(achado.filhos, dados.perguntas)].join('\n')}\n\nPasso seguinte: ${passo}\n`,
      resultado: { grupo: achado.grupo, pergunta, roteiros: resumoDosFilhos(achado.filhos, dados.perguntas), passo },
    };
  }
  if (achado.desconhecido) {
    const topicos = buscarTopico(q, raiz);
    const linhas = topicos.length > 0
      ? [`"${q}" não é um ramo; os títulos mais perto (npm run comecar -- '<arquivo#âncora>' entrega a seção):`, ...topicos.map((t) => `  ${t.item} (${milhar(t.bytes)} bytes)`)]
      : [`"${q}" não é um ramo nem um título de documento.`];
    return {
      ok: topicos.length > 0, codigo: topicos.length > 0 ? 0 : 1,
      texto: `${linhas.join('\n')}\n\n${textoDaLista(dados.roteiros, 'Ramos')}\n`,
      resultado: { roteiros: dados.roteiros.map(({ id }) => id), topicos },
      ...(topicos.length > 0 ? {} : { erro: { codigo: 'roteiro_desconhecido', mensagem: `"${q}" não é um ramo nem um título de documento.`, acao: 'Use um dos ramos listados, ou chame sem argumento para a pergunta inicial.' } }),
    };
  }

  const r = achado.roteiro;
  const { total } = medirRoteiro(r, raiz);
  const recursos = disponivel(r, raiz);
  let estadoTexto = [];
  let passo = r.passo;
  let condutor = null;
  if (r.id === 'mudar/plano') {
    estadoTexto = estado.linhas;
    passo = passoDeMudar(estado, r);
  } else if (r.id === 'modelar/esboco' || r.id === 'modelar/laco-do-esboco') {
    if (arquivo) {
      condutor = situacaoDoCondutor(arquivo, raiz);
      passo = condutor.passo;
      if (condutor.texto) estadoTexto = condutor.texto.split('\n');
    } else {
      estadoTexto = ['sem --arquivo: passe o esboço em andamento para ler o Condutor dele'];
    }
  }
  const inteiros = r.ler.filter((a) => partesDaLeitura(a).ancora === null);
  const secoes = r.ler.filter((a) => partesDaLeitura(a).ancora !== null);
  const partes = [
    `roteiro ${r.id}: ${r.titulo}`,
    r.quando,
    '',
    `Ler antes (${milhar(total)} bytes, orçamento ${milhar(r.orcamentoBytes)}, com as seções abaixo):`,
    ...inteiros.map((a) => `  ${a}`),
  ];
  for (const a of secoes) partes.push('', `--- ${a}`, textoDaLeitura(a, raiz) ?? '(seção não encontrada)');
  if (secoes.length > 0) partes.push('---');
  if ((r.sobDemanda ?? []).length > 0) partes.push('', 'Abrir só quando:', ...r.sobDemanda.map((s) => `  ${s.arquivo}: quando ${s.quando}`));
  if (r.skill) partes.push('', `Skill: ${r.skill}`);
  if ((r.comandos ?? []).length > 0) partes.push('', 'Comandos:', ...r.comandos.map((c) => `  ${c}`));
  if (recursos.length > 0) partes.push('', 'Disponível:', ...recursos.map((x) => `  ${x}`));
  if (estadoTexto.length > 0) partes.push('', 'Estado:', ...estadoTexto.map((l) => `  ${l}`));
  partes.push('', `Passo seguinte: ${passo}`, `Conferido no fim: ${r.conferido}`);
  return {
    ok: true, codigo: 0, texto: `${partes.join('\n')}\n`,
    resultado: {
      roteiro: r.id, titulo: r.titulo, ler: r.ler, leituraBytes: total, orcamentoBytes: r.orcamentoBytes,
      sobDemanda: r.sobDemanda ?? [], skill: r.skill, comandos: r.comandos ?? [], disponivel: recursos,
      estado: estadoTexto, passo, conferido: r.conferido,
    },
  };
}

function executar(argv) {
  const args = [...argv];
  let arquivo = null;
  const i = args.indexOf('--arquivo');
  if (i >= 0) {
    const bruto = args[i + 1];
    args.splice(i, 2);
    if (bruto) arquivo = relative(RAIZ, resolve(process.env.INIT_CWD ?? process.cwd(), bruto)) || bruto;
  }
  const r = comecar({ roteiro: args[0] ?? null, arquivo });
  (r.ok ? process.stdout : process.stderr).write(r.texto);
  process.exitCode = r.codigo;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar(process.argv.slice(2));
