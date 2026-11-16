#!/usr/bin/env node
/* contar-comandos.mjs — a linha de base do plano de comparar com a referência (fatia 1): os comandos de shell dos registros de uma
 * sessão do Claude Code, contados por tipo de agente e por padrão de comando.
 *
 * O QUE FAZ. Lê o registro da sessão principal (`<sessão>.jsonl`) e os dos subagentes (`<sessão>/subagents/agent-*.jsonl`, com o
 * tipo de agente no `.meta.json` ao lado), junta cada chamada de Bash com o horário dela e diz em que padrões ela cai. Os padrões são
 * os da análise que deu o "Problema observado" do plano, copiados como estavam, e um comando pode cair em mais de um; o que não cai em
 * nenhum conta como `outro`. Um comando conta como falha quando o resultado veio com erro, com `Traceback` ou com "Exit code" no começo.
 *
 * Os registros contados são os que começaram dentro da janela (`--desde`, `--ate`, em ISO), e os comandos, os que foram chamados nela;
 * a análise do plano foi tirada às 11:50:22 de 2026-11-16, e `--ate=2026-11-16T11:50:22Z` a refaz. `--tipo` e `--descricao` (uma
 * expressão regular sobre a descrição do subagente) restringem os registros, e `alvo` soma os comandos que caem em pelo menos um
 * dos padrões que o plano quer tirar do script (prancha, conferência do motor, apagar a saída e medir a foto), ou que roda o script
 * auxiliar dessas tarefas, que é a medida do gate 5.
 *
 * Uso: node docs/modelar/banco-de-provas/comparar-com-a-referencia-2026-11-16/contar-comandos.mjs <sessão.jsonl>
 *        [--desde=<ISO>] [--ate=<ISO>] [--tipo=<agente>] [--descricao=<regex>] [--exemplos=<padrão>] [--json] */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

/* Os padrões da análise, na ordem em que ela os aplicou. */
export const PADROES = [
  ['conferir-motor', /nucleo\(gerarPassos|nucleo\(p|from .*entrada\.js|import\(.*receita\.js/m],
  ['bancada', /olhar-bancada\.mjs|npm run bancada|bancada:/m],
  ['apagar-saida', /rm -rf tmp\//m],
  ['prancha-por-script', /PIL|from PIL|Image\.open/m],
  ['medir-foto', /np\.asarray\(Image\.open\('tmp\/bicicleta|lateral\.jpg|frontal\.webp|referencia/m],
  ['blender', /blender/m],
  ['sonda-de-teste', /zz-|cp tmp\/.*test|tools\/zz/m],
  ['edicao-por-script', /python3 - <<'EOF'\np='|s\.replace\(|sed -i/m],
  ['leitura', /^\s*(cd [^&]*&& )?(sed -n|cat |head |tail |grep -n|wc -l)/m],
  ['teste', /vitest|npm test/m],
  ['gates', /npm run gates|gates\.log/m],
  ['git', /\bgit /m],
  ['descrever-medir', /descrever|conferir-pontos|rodada-de-modelagem|guarda:|retrato/m],
  ['catalogo-mapa', /catalogo|npm run mapa|planos:/m],
  ['saida-de-tarefa', /tasks\/|\.output/m],
];
export const ALVO = ['prancha-por-script', 'conferir-motor', 'apagar-saida', 'medir-foto'];
/* O alvo conta também o comando que roda ou edita o script auxiliar dessas tarefas (`tmp/prancha.*`, `tmp/chk.mjs`) e a busca de onde
   o motor devolve as recusas (`orfaos`), que os padrões da análise deixam em `outro` ou em `edicao-por-script`. */
export const ALVO_AUXILIAR = /tmp\/prancha\.|tmp\/chk\.mjs|orfaos/m;
/* Contagens à parte, citadas no plano entre o que fica de fora: a renderização de `.obj` pelo Blender, as esperas com `sleep` e a
   leitura da saída de uma tarefa em segundo plano. Não entram em `outro` nem no alvo. */
export const AVULSAS = [
  ['blender-com-obj', /blender[\s\S]*\.obj|\.obj[\s\S]*blender/],
  ['espera-com-sleep', /\bsleep\b/],
  ['saida-de-tarefa-lida', /tasks\/.*\.output/],
];
export const noAlvo = (comando, nomes = padroesDe(comando)) => nomes.some((n) => ALVO.includes(n)) || ALVO_AUXILIAR.test(comando);

export function padroesDe(comando) {
  const achados = PADROES.filter(([, re]) => re.test(comando)).map(([nome]) => nome);
  return achados.length ? achados : ['outro'];
}

const falhou = (bloco) => {
  const txt = typeof bloco.content === 'string' ? bloco.content : JSON.stringify(bloco.content);
  return Boolean(bloco.is_error) || txt.includes('Traceback') || txt.slice(0, 40).includes('Exit code');
};

/* Um registro, dado como texto JSONL: { inicio, comandos: [{ comando, horario, falha }] }. */
export function lerRegistro(jsonl) {
  let inicio = null;
  const comandos = [];
  const porId = new Map();
  for (const linha of jsonl.split('\n')) {
    if (!linha) continue;
    let o;
    try { o = JSON.parse(linha); } catch { continue; }
    if (o.timestamp && !inicio) inicio = o.timestamp;
    const conteudo = o.message?.content;
    if (!Array.isArray(conteudo)) continue;
    for (const b of conteudo) {
      if (b.type === 'tool_use' && b.name === 'Bash' && !porId.has(b.id)) {
        const c = { comando: b.input?.command ?? '', horario: o.timestamp, falha: false };
        porId.set(b.id, c); comandos.push(c);
      } else if (b.type === 'tool_result' && porId.has(b.tool_use_id) && falhou(b)) porId.get(b.tool_use_id).falha = true;
    }
  }
  return { inicio, comandos };
}

/* A sessão: o registro principal e os dos subagentes, cada um { arquivo, tipo, descricao, inicio, comandos }. */
export function lerSessao(arquivo) {
  const registros = [{ arquivo, tipo: 'principal', descricao: '', ...lerRegistro(readFileSync(arquivo, 'utf8')) }];
  const pasta = join(dirname(arquivo), basename(arquivo, '.jsonl'), 'subagents');
  if (existsSync(pasta)) {
    for (const nome of readdirSync(pasta).filter((n) => n.endsWith('.jsonl')).sort()) {
      let meta = {};
      try { meta = JSON.parse(readFileSync(join(pasta, nome.replace(/\.jsonl$/, '.meta.json')), 'utf8')); } catch { /* sem meta */ }
      registros.push({ arquivo: join(pasta, nome), tipo: meta.agentType ?? '?', descricao: meta.description ?? '',
        ...lerRegistro(readFileSync(join(pasta, nome), 'utf8')) });
    }
  }
  return registros;
}

const conta = (mapa, chave, n = 1) => { mapa[chave] = (mapa[chave] ?? 0) + n; };

/* A contagem na janela: { registros, registrosPorTipo, comandos, comandosPorTipo, padroes: { nome: { comandos, falhas, porTipo } },
   alvo, exemplos }. Só os registros que começaram na janela entram, e deles só os comandos chamados nela. */
export function contar(registros, { desde = null, ate = null, tipo = null, descricao = null, exemplosDe = null } = {}) {
  const t0 = desde ? Date.parse(desde) : -Infinity;
  const t1 = ate ? Date.parse(ate) : Infinity;
  if (Number.isNaN(t0) || Number.isNaN(t1)) throw new Error(`horário inválido em --desde ou --ate: ${desde ?? ''} ${ate ?? ''}`);
  const dentro = (h) => Boolean(h) && Date.parse(h) >= t0 && Date.parse(h) <= t1;
  const re = descricao ? new RegExp(descricao, 'i') : null;
  const escolhidos = registros.filter((r) => dentro(r.inicio) && (!tipo || r.tipo === tipo) && (!re || re.test(r.descricao)));
  const out = { registros: escolhidos.length, registrosPorTipo: {}, comandos: 0, comandosPorTipo: {}, padroes: {}, avulsas: {}, alvo: 0, exemplos: [],
    descricoes: [] };
  for (const r of escolhidos) {
    conta(out.registrosPorTipo, r.tipo);
    const cmds = r.comandos.filter((c) => dentro(c.horario));
    if (re || tipo) out.descricoes.push(`${r.inicio} ${r.tipo} (${cmds.length}) ${r.descricao}`);
    for (const c of cmds) {
      out.comandos += 1; conta(out.comandosPorTipo, r.tipo);
      const nomes = padroesDe(c.comando);
      if (noAlvo(c.comando, nomes)) out.alvo += 1;
      for (const [n, re] of AVULSAS) if (re.test(c.comando)) conta(out.avulsas, n);
      for (const n of nomes) {
        const p = out.padroes[n] ??= { comandos: 0, falhas: 0, porTipo: {} };
        p.comandos += 1; if (c.falha) p.falhas += 1; conta(p.porTipo, r.tipo);
        if (n === exemplosDe && out.exemplos.length < 10) out.exemplos.push(c.comando.replace(/\n/g, ' ⏎ ').slice(0, 240));
      }
    }
  }
  return out;
}

const ordenado = (m) => Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(', ');

export function relatorio(c) {
  const linhas = [
    `registros: ${c.registros} (${ordenado(c.registrosPorTipo)})`,
    `comandos de shell: ${c.comandos} (${ordenado(c.comandosPorTipo)})`,
    ...c.descricoes.map((d) => `  ${d}`),
    'por padrão (um comando pode cair em mais de um):',
    ...Object.entries(c.padroes).sort((a, b) => b[1].comandos - a[1].comandos)
      .map(([n, p]) => `  ${n.padEnd(20)} ${String(p.comandos).padStart(5)}  falhas ${String(p.falhas).padStart(3)}  ${ordenado(p.porTipo)}`),
    `à parte: ${AVULSAS.map(([n]) => `${n} ${c.avulsas[n] ?? 0}`).join(', ')}`,
    `alvo do plano (${ALVO.join(', ')}, com os scripts auxiliares): ${c.alvo} de ${c.comandos}`,
  ];
  if (c.exemplos.length) linhas.push('exemplos:', ...c.exemplos.map((e) => `  - ${e}`));
  return linhas.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const opcao = (nome) => args.find((a) => a.startsWith(`--${nome}=`))?.slice(nome.length + 3) ?? null;
  const arquivo = args.find((a) => !a.startsWith('--'));
  if (!arquivo || args.includes('--ajuda')) {
    console.log('uso: contar-comandos.mjs <sessão.jsonl> [--desde=<ISO>] [--ate=<ISO>] [--tipo=<agente>] [--descricao=<regex>] [--exemplos=<padrão>] [--json]');
    process.exit(arquivo ? 0 : 1);
  }
  const c = contar(lerSessao(arquivo), { desde: opcao('desde'), ate: opcao('ate'), tipo: opcao('tipo'), descricao: opcao('descricao'),
    exemplosDe: opcao('exemplos') });
  console.log(args.includes('--json') ? JSON.stringify(c, null, 2) : relatorio(c));
}
