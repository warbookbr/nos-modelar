#!/usr/bin/env node
/* comecar.mjs — a entrada por intenção: `npm run comecar -- [roteiro]`.
 *
 * Os roteiros de `docs/modelar/roteiros/roteiros.json` formam uma árvore pelos nomes (`modelar/peca/familia`). Sem roteiro,
 * ou com o nome de um grupo (`modelar`, `modelar/peca`), o comando faz a pergunta do grupo e lista os ramos, e a resposta é o
 * argumento da chamada seguinte. Com uma folha (ou só o último nome, quando é único), devolve a leitura antes de começar, com
 * as seções `arquivo#âncora` entregues ali mesmo, o que abrir só quando a condição aparecer, a skill, os comandos, a lista
 * gerada na hora (famílias, peças do acervo ou operações) e o passo seguinte lido do estado: os planos ativos e a tarefa de
 * `comunicacao.md` para quem muda o projeto. Um nome que não é nó busca o tópico nos títulos dos documentos de uso, das skills e
 * de `docs/modelar/`, e `arquivo#âncora` entrega a seção. Até 2026-11-05 o `--arquivo` lia o Condutor de um esboço detalhado; o
 * esboço antigo saiu, e com ele o Condutor. Antes dos títulos, um nome que é de ficha de capacidade, de operação do núcleo, de extensão ou de
 * script do `package.json` recebe o comando que o explica (`capacidade`, ou o próprio comando com a opção de ajuda).
 *
 * O comando só lê. A ferramenta MCP `comecar` chama a mesma função `comecar`, e as duas respondem igual. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { classificarNome } from './capacidade.mjs';
import { ancoraDe, carregarRoteiros, filhosDoNo, medirRoteiro, partesDaLeitura, RAIZ, textoDaLeitura } from '../mapa/roteiros.mjs';
import { ativosDoIndice } from '../mapa/planos.mjs';
import { registrarUso } from './uso.mjs';

const milhar = (n) => n.toLocaleString('pt-BR');

/* Os planos ativos de `docs/modelar/planos/` (os arquivos com `**Estado:** ativo`), cada um com o território e a primeira
   fatia que não diz "Feita". A ordem é a da lista "Planos ativos" do índice de planos (a prioridade); o que o índice não
   lista vem depois, pelo nome. */
export function planosAtivos(raiz = RAIZ) {
  const pasta = join(raiz, 'docs/modelar/planos');
  const prioridade = existsSync(join(pasta, 'README.md')) ? (ativosDoIndice(readFileSync(join(pasta, 'README.md'), 'utf8')) ?? []) : [];
  const ativos = [];
  for (const nome of readdirSync(pasta).filter((n) => n.endsWith('.md')).sort()) {
    const texto = readFileSync(join(pasta, nome), 'utf8');
    if (!/^\*\*Estado:\*\* ativo\s*$/m.test(texto)) continue;
    const titulo = (/^# (.+)$/m.exec(texto)?.[1] ?? nome).split(' — ')[0];
    const territorio = /^\*\*Território:\*\*\s*(.+?)\s*$/m.exec(texto)?.[1] ?? 'não declarado';
    const secao = /^## Fatias\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(texto)?.[1] ?? '';
    const fatias = [];
    for (const linha of secao.split('\n')) {
      const m = /^(\d+)\. (.*)$/.exec(linha);
      if (m) fatias.push({ numero: Number(m[1]), texto: m[2] });
      else if (fatias.length > 0 && /^\s+\S/.test(linha)) fatias[fatias.length - 1].texto += ` ${linha.trim()}`;
    }
    const aberta = fatias.find((f) => !/\bFeita\b/.test(f.texto)) ?? null;
    ativos.push({ nome, arquivo: `docs/modelar/planos/${nome}`, titulo, territorio, fatiaAberta: aberta && { numero: aberta.numero, texto: aberta.texto.replace(/\*\*/g, '').split(/(?<=\.) /)[0] } });
  }
  const posicao = (a) => { const i = prioridade.indexOf(a.nome); return i < 0 ? prioridade.length : i; };
  return ativos.sort((x, y) => posicao(x) - posicao(y)).map(({ nome, ...resto }) => resto);
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
  if (roteiro.id.startsWith('modelar/')) {
    const caminho = join(raiz, 'docs/modelar/gerado/catalogo-capacidades.json');
    const operacoes = existsSync(caminho) ? JSON.parse(readFileSync(caminho, 'utf8')).operacoes ?? [] : [];
    return [`${operacoes.length} operações do motor em docs/modelar/gerado/CATALOGO-CAPACIDADES.md (no MCP, buscar_capacidades)`];
  }
  return [];
}

/* O estado do trabalho que vale para a lista e para o roteiro `mudar/plano`. */
function estadoGeral(raiz) {
  const planos = planosAtivos(raiz);
  const tarefas = tarefasAbertas(raiz);
  const linhas = [];
  if (planos.length === 0) linhas.push('nenhum plano ativo: o backlog não autoriza implementação');
  else {
    linhas.push(`${planos.length} ${planos.length === 1 ? 'plano ativo' : 'planos ativos'}, em ordem de prioridade:`);
    planos.forEach((p, i) => linhas.push(`${i + 1}. "${p.titulo}" (${p.arquivo}); território: ${p.territorio}; ${p.fatiaAberta ? `fatia ${p.fatiaAberta.numero} em aberto: ${p.fatiaAberta.texto}` : 'sem fatia em aberto'}`));
  }
  linhas.push(tarefas.length > 0
    ? `tarefas em comunicacao.md: ${tarefas.map((t) => `${t.id} (${t.status})`).join(', ')}`
    : 'nenhuma tarefa em comunicacao.md');
  return { planos, tarefas, linhas };
}

function passoDeMudar(estado, roteiro) {
  if (estado.tarefas.length > 0) return passoDaTarefa(estado.tarefas[0]);
  if (estado.planos.length === 0) return 'Sem plano ativo, proponha um plano em docs/modelar/planos/ antes de implementar.';
  return 'Escolha um dos planos ativos, o que cobre a mudança pelo território; o território do plano é o que ele pode mudar, e a fatia em aberto é onde trabalhar. Se nenhum cobrir, proponha um plano ou peça à pessoa que mude um território.';
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

/* Os documentos onde a busca por tópico procura títulos: os de uso, as skills e os de `docs/modelar/` na raiz dela. */
function documentosDaBusca(raiz) {
  const lista = [];
  const pastaDe = (rel) => (existsSync(join(raiz, rel)) ? readdirSync(join(raiz, rel)).filter((n) => n.endsWith('.md')).map((n) => `${rel}/${n}`) : []);
  lista.push(...pastaDe('docs/modelar/usar'), ...pastaDe('docs/modelar'));
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

/* Um script de `package.json` responde a `--ajuda` quando o arquivo que ele roda traz a opção de ajuda entre aspas; com comando composto ou arquivo que não achamos, não se sabe. */
function respondeAjuda(comando, raiz) {
  if (/&&|\|\||;|\|/.test(comando)) return false;
  const arquivo = /(?:^|\s)([\w./-]+\.(?:mjs|js))(?:\s|$)/.exec(comando)?.[1];
  return Boolean(arquivo) && existsSync(join(raiz, arquivo)) && /['"`]--ajuda['"`]/.test(readFileSync(join(raiz, arquivo), 'utf8'));
}

/* O nome que não é roteiro mas é de uma ficha, operação, extensão ou comando: { tipo, nome, frase, comando } ou null. */
export function buscarNome(consulta, raiz = RAIZ) {
  const nome = String(consulta).trim();
  if (raiz === RAIZ) {
    const achado = classificarNome(nome);
    if (achado) {
      const comando = `npm run capacidade -- ${achado.nome}`;
      const frase = { ficha: `é uma ficha de capacidade: rode \`${comando}\``, operacao: `é uma operação do núcleo: rode \`${comando}\``, extensao: `é uma extensão (só existe no registro com extensões): rode \`${comando}\`` }[achado.tipo];
      return { tipo: achado.tipo, nome: achado.nome, frase, comando };
    }
  }
  const caminho = join(raiz, 'package.json');
  const scripts = existsSync(caminho) ? JSON.parse(readFileSync(caminho, 'utf8')).scripts ?? {} : {};
  const script = Object.keys(scripts).find((n) => n.toLowerCase() === nome.toLowerCase());
  if (!script) return null;
  const ajuda = respondeAjuda(scripts[script], raiz);
  const comando = ajuda ? `npm run ${script} -- --ajuda` : `npm run ${script}`;
  return { tipo: 'comando', nome: script, frase: ajuda ? `é um comando: rode \`${comando}\`` : `é um comando: \`${comando}\``, comando };
}

/* A resposta da entrada: { ok, codigo, texto, resultado }. */
export function comecar({ roteiro: consulta = null, raiz = RAIZ } = {}) {
  const dados = carregarRoteiros(raiz);
  const estado = estadoGeral(raiz);
  if (consulta === null || String(consulta).trim() === '') {
    const filhos = filhosDoNo(dados.roteiros, '');
    const passo = 'Escolha o ramo da tarefa e rode npm run comecar -- <ramo>; para outra coisa, npm run comecar -- <tópico>.';
    const folhas = dados.roteiros.map((r) => r.id).sort();
    const texto = ['Qual é a tarefa? (npm run comecar -- <ramo>)', ...linhasDosFilhos(filhos, dados.perguntas), '', `Quem já sabe o caminho vai direto: npm run comecar -- <roteiro>, com o roteiro entre ${folhas.join(', ')}.`, '', 'Estado:', ...estado.linhas.map((l) => `  ${l}`), '', `Passo seguinte: ${passo}`].join('\n');
    return { ok: true, codigo: 0, texto: `${texto}\n`, resultado: { roteiros: resumoDosFilhos(filhos, dados.perguntas), atalhos: folhas, estado: estado.linhas, passo } };
  }
  const q = String(consulta).trim();
  if (q.includes('#')) {
    const secao = textoDaLeitura(q, raiz);
    if (secao !== null) return { ok: true, codigo: 0, texto: `${secao}\n`, resultado: { secao: q, bytes: Buffer.byteLength(secao) } };
  }
  const achado = resolverRoteiro(dados.roteiros, q);
  const porNome = achado.desconhecido ? buscarNome(q, raiz) : null;
  registrarUso({ evento: 'comecar', roteiro: q.toLowerCase(), achado: achado.desconhecido !== true || porNome !== null });
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
    const ok = topicos.length > 0 || porNome !== null;
    const linhas = [];
    if (porNome) linhas.push(`"${q}" ${porNome.frase}.`);
    if (topicos.length > 0) linhas.push(`${porNome ? '\n' : ''}"${q}" não é um ramo; os títulos mais perto (npm run comecar -- '<arquivo#âncora>' entrega a seção):`, ...topicos.map((t) => `  ${t.item} (${milhar(t.bytes)} bytes)`));
    if (!ok) linhas.push(`"${q}" não é um ramo nem um título de documento, nem o nome de uma operação, extensão, ficha de capacidade ou comando.`);
    return {
      ok, codigo: ok ? 0 : 1,
      texto: `${linhas.join('\n')}\n\n${textoDaLista(dados.roteiros, 'Ramos')}\n`,
      resultado: { roteiros: dados.roteiros.map(({ id }) => id), topicos, ...(porNome ? { nome: { tipo: porNome.tipo, nome: porNome.nome, comando: porNome.comando } } : {}) },
      ...(ok ? {} : { erro: { codigo: 'roteiro_desconhecido', mensagem: `"${q}" não é um ramo nem um título de documento, nem o nome de uma operação, extensão, ficha de capacidade ou comando.`, acao: 'Use um dos ramos listados, ou chame sem argumento para a pergunta inicial.' } }),
    };
  }

  const r = achado.roteiro;
  const { total } = medirRoteiro(r, raiz);
  const recursos = disponivel(r, raiz);
  let estadoTexto = [];
  let passo = r.passo;
  if (r.id === 'mudar/plano') {
    estadoTexto = estado.linhas;
    passo = passoDeMudar(estado, r);
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

const AJUDA = `npm run comecar [-- <roteiro | tópico | nome>]  (node tools/modelar/comecar.mjs)
Sem argumento, a pergunta inicial e o estado do trabalho. Com um roteiro ou grupo, a leitura ou os ramos. Com outro nome: o título de documento mais perto, ou, se for
nome de operação, de extensão, de ficha de capacidade ou de script de package.json, o comando que o explica. arquivo#âncora entrega a seção.
`;

function executar(argv) {
  const args = [...argv];
  if (args.includes('--ajuda')) { process.stdout.write(AJUDA); return; }
  const r = comecar({ roteiro: args[0] ?? null });
  (r.ok ? process.stdout : process.stderr).write(r.texto);
  process.exitCode = r.codigo;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) executar(process.argv.slice(2));
