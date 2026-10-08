#!/usr/bin/env node
/* comecar.mjs — a entrada por intenção: `npm run comecar -- [roteiro] [--arquivo <x.esboco.json>]`.
 *
 * Sem roteiro, lista os roteiros com a frase de cada um e o estado do trabalho. Com um roteiro (`mudar`, `modelar/esboco`,
 * ou só `esboco` quando o nome é único), devolve o que ler antes, o que abrir só quando a condição aparecer, a skill, os
 * comandos, o que o roteiro tem disponível para modelar e o passo seguinte lido do estado: o plano ativo e a tarefa de
 * `comunicacao.md` para quem muda o projeto, e a situação do Condutor para o esboço com `--arquivo`. Uma intenção que agrupa
 * roteiros (`modelar`) devolve só a lista deles. Os roteiros são os de `docs/mecanifica/roteiros/roteiros.json`.
 *
 * O comando só lê. O Condutor só é consultado quando o estado dele já existe, porque a situação do Condutor cria o estado
 * (com o estado existente, ela o regrava com o mesmo conteúdo). A
 * ferramenta MCP `comecar` chama a mesma função `comecar`, e as duas respondem igual. */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { carregarRoteiros, medirRoteiro, RAIZ } from '../mapa/roteiros.mjs';
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

/* O que o roteiro de modelar tem disponível, sem carregar referência inteira. */
function disponivel(roteiro, raiz) {
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

/* O estado do trabalho que vale para a lista e para o roteiro `mudar`. */
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

/* Resolve a consulta: { roteiro }, { grupo: [roteiros] } quando é uma intenção ou um prefixo, ou { desconhecido: true }. */
export function resolverRoteiro(roteiros, consulta) {
  const q = String(consulta).trim().toLowerCase();
  const exato = roteiros.find((r) => r.id === q);
  if (exato) return { roteiro: exato };
  const grupo = roteiros.filter((r) => r.id.startsWith(`${q}/`) || r.intencao === q);
  if (grupo.length === 1) return { roteiro: grupo[0] };
  if (grupo.length > 1) return { grupo };
  const ultimo = roteiros.filter((r) => r.id.split('/').pop() === q);
  if (ultimo.length === 1) return { roteiro: ultimo[0] };
  return { desconhecido: true };
}

const linhaDoRoteiro = (r, largura) => `  ${r.id.padEnd(largura)}${r.intencao}: ${r.quando}`;

function textoDaLista(roteiros, titulo) {
  const largura = Math.max(...roteiros.map((r) => r.id.length)) + 2;
  return [`${titulo} (npm run comecar -- <roteiro>):`, ...roteiros.map((r) => linhaDoRoteiro(r, largura))].join('\n');
}

/* A resposta da entrada: { ok, codigo, texto, resultado }. `arquivo` é o esboço cujo Condutor dá o passo seguinte. */
export function comecar({ roteiro: consulta = null, arquivo = null, raiz = RAIZ } = {}) {
  const dados = carregarRoteiros(raiz);
  const estado = estadoGeral(raiz);
  if (consulta === null || String(consulta).trim() === '') {
    const passo = 'Escolha o roteiro da tarefa e rode npm run comecar -- <roteiro>.';
    const texto = [textoDaLista(dados.roteiros, 'Roteiros'), '', 'Estado:', ...estado.linhas.map((l) => `  ${l}`), '', `Passo seguinte: ${passo}`].join('\n');
    return { ok: true, codigo: 0, texto: `${texto}\n`, resultado: { roteiros: dados.roteiros.map(({ id, intencao, quando }) => ({ id, intencao, quando })), estado: estado.linhas, passo } };
  }
  const achado = resolverRoteiro(dados.roteiros, consulta);
  registrarUso({ evento: 'comecar', roteiro: String(consulta).trim().toLowerCase(), achado: achado.desconhecido !== true });
  if (achado.grupo) {
    const passo = 'Escolha um destes roteiros e rode npm run comecar -- <roteiro>.';
    return {
      ok: true, codigo: 0,
      texto: `${textoDaLista(achado.grupo, `Roteiros de "${consulta}"`)}\n\nPasso seguinte: ${passo}\n`,
      resultado: { roteiros: achado.grupo.map(({ id, intencao, quando }) => ({ id, intencao, quando })), passo },
    };
  }
  if (achado.desconhecido) {
    return {
      ok: false, codigo: 1,
      texto: `roteiro "${consulta}" não existe.\n\n${textoDaLista(dados.roteiros, 'Roteiros')}\n`,
      resultado: { roteiros: dados.roteiros.map(({ id }) => id) },
      erro: { codigo: 'roteiro_desconhecido', mensagem: `roteiro "${consulta}" não existe.`, acao: 'Use um dos roteiros listados, ou chame sem roteiro para a lista.' },
    };
  }

  const r = achado.roteiro;
  const { total } = medirRoteiro(r, raiz);
  const recursos = disponivel(r, raiz);
  let estadoTexto = [];
  let passo = r.passo;
  let condutor = null;
  if (r.id === 'mudar') {
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
  const partes = [
    `roteiro ${r.id}: ${r.titulo}`,
    r.quando,
    '',
    `Ler antes (${milhar(total)} bytes, orçamento ${milhar(r.orcamentoBytes)}):`,
    ...r.ler.map((a) => `  ${a}`),
  ];
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
