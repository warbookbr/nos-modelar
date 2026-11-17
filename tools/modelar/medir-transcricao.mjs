#!/usr/bin/env node
/* medir-transcricao.mjs — onde vão os tokens de um agente: `npm run medir:transcricao -- <transcrição.jsonl> [...]`.
 *
 * Lê a transcrição JSONL de um agente (a que o Claude Code grava por subagente) e reparte o que entrou no contexto por
 * etapa: leitura da skill, do README do esboço e de outros arquivos, escrita do JSON, cada comando do esboço, imagens
 * abertas, texto da própria IA. Imprime também os turnos, a entrada somada (o que se paga, porque cada turno relê o
 * contexto) e o contexto final. Com várias transcrições, soma as partes no fim. Foi a medição de 2026-10-07
 * (`docs/modelar/banco-de-provas/MEDICAO-DE-TOKENS-2026-10.md`), e a fatia 6 do caminho curto a repete para comparar.
 *
 * As partes são estimadas: texto vale um token a cada 3,5 caracteres e cada imagem vale TOKENS_POR_IMAGEM. Os turnos e a
 * entrada somada vêm do `usage` da API e são exatos, e a entrada vem também dividida em nova, gravada no cache e lida do
 * cache, porque a leitura de cache custa uma fração da entrada nova e a mesma soma de tokens pode custar bem diferente.
 *
 * O primeiro passo é a primeira chamada que escreve um arquivo: Write, Edit, NotebookEdit ou um comando de shell que edita no
 * lugar (`sed -i`, `perl -i`, `git apply`) ou redireciona para um caminho relativo ou dentro da raiz dada por `--raiz`. Até ele, a medição soma os bytes
 * de texto que voltaram das ferramentas, as imagens e as chamadas, e guarda o contexto do turno que deu o passo, que inclui o
 * que o agente recebe sem pedir (instruções, `CLAUDE.md`, skills listadas). É a medida de leitura do plano da leitura por
 * demanda. Sem `--raiz`, o redirecionamento conta para todo caminho fora de `/tmp` e `/dev`.
 *
 * `--atritos[=N]` troca a medida de tokens pela contagem de atritos por comando ao fim de um trabalho, sobre a transcrição e as dos
 * subagentes dela (`<sessão>/subagents/agent-*.jsonl`, como o Claude Code as grava): os comandos chamados mais de N vezes (padrão
 * REPETICOES_PADRAO), os que falharam, os scripts criados em `tmp/` e as opções de Node fora do padrão do projeto. A leitura dos registros
 * é a do `contar-comandos.mjs` da linha de base do plano de comparar com a referência, que passou a importá-la daqui. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const CARACTERES_POR_TOKEN = 3.5;
/* Uma vista de 1100 px de largura, como as do esboço, custa por volta disso. */
export const TOKENS_POR_IMAGEM = 1600;

const FLAGS_DO_ESBOCO = ['--ajuda', '--composta', '--analise', '--descrever', '--condutor', '--medidas', '--ligacoes', '--editar', '--vista', '--unidade'];

/* A etapa de uma chamada de ferramenta. */
export function etapaDaChamada(nome, entrada = {}) {
  if (nome === 'Read') {
    const p = entrada.file_path ?? '';
    if (p.endsWith('.png')) return 'imagem aberta';
    if (p.includes('/skills/')) return 'leitura: skill';
    if (p.endsWith('modulos/esboco/README.md')) return 'leitura: README do esboço';
    if (p.endsWith('.esboco.json')) return 'leitura: o próprio JSON';
    return 'leitura: outros arquivos';
  }
  if (nome === 'Write' || nome === 'Edit') return (entrada.file_path ?? '').includes('.esboco.json') ? 'escrita do JSON' : 'escrita: outros';
  if (nome === 'Bash') {
    const c = entrada.command ?? '';
    const flag = FLAGS_DO_ESBOCO.find((f) => c.includes(f));
    if (flag) return `comando esboco ${flag}`;
    if (c.includes('esboco')) return 'comando esboco (gate e leitura padrão)';
    return 'bash: outros';
  }
  return `ferramenta: ${nome}`;
}

const tokensDeTexto = (texto) => String(texto ?? '').length / CARACTERES_POR_TOKEN;
const ESCRITAS = new Set(['Write', 'Edit', 'NotebookEdit']);
const EDITA_NO_LUGAR = /\b(?:sed\s+(?:-[a-zA-Z]*\s+)*-[a-zA-Z]*i|perl\s+-[a-zA-Z]*i|git\s+(?:-C\s+\S+\s+)?apply)\b/;

/* Se um comando de shell escreve arquivo: edição no lugar, ou redirecionamento (`>`, `>>`, `tee`) para um caminho relativo ou
   dentro da raiz; sem raiz, para todo caminho fora de /tmp e /dev. */
export function comandoEscreve(comando, raiz = null) {
  if (EDITA_NO_LUGAR.test(comando)) return true;
  for (const m of String(comando).matchAll(/(?:(?:^|[^0-9&>\-])>{1,2}|\btee(?:\s+-a)?)\s*([^\s;&|<>()]+)/g)) {
    const alvo = m[1].replace(/^['"]|['"]$/g, '');
    if (alvo.startsWith('&') || alvo.startsWith('/dev/')) continue;
    if (!alvo.startsWith('/')) return true;
    if (raiz ? alvo === raiz || alvo.startsWith(`${raiz.replace(/\/$/, '')}/`) : !alvo.startsWith('/tmp/')) return true;
  }
  return false;
}

/* A medição de uma transcrição, dada como texto JSONL: { turnos, entradaSomada, entradaNova, cacheGravado, cacheLido,
   saida, contextoFinal, etapas: { etapa: { tokens, chamadas } }, primeiroPasso }, com primeiroPasso nulo quando nada foi escrito
   e, quando houve escrita, { turno, contexto, bytes, imagens, chamadas, arquivos: { caminho: bytes } }. Uma mensagem da API que aparece em várias linhas (uma por bloco) conta uma vez. */
export function medirTranscricao(jsonl, { raiz = null } = {}) {
  const vistos = new Set();
  const etapaPorChamada = new Map();
  const etapas = new Map();
  const somar = (etapa, tokens, chamadas = 0) => {
    const e = etapas.get(etapa) ?? { tokens: 0, chamadas: 0 };
    e.tokens += tokens; e.chamadas += chamadas;
    etapas.set(etapa, e);
  };
  let turnos = 0; let entradaSomada = 0; let saida = 0; let contextoFinal = 0;
  let entradaNova = 0; let cacheGravado = 0; let cacheLido = 0;
  let primeiroPasso = null; let contextoDoTurno = 0;
  const ate = { bytes: 0, imagens: 0, chamadas: 0, arquivos: {} };
  const leituraPorChamada = new Map();
  for (const linha of jsonl.split('\n')) {
    if (!linha.trim()) continue;
    const d = JSON.parse(linha);
    const m = d.message;
    if (!m || typeof m !== 'object') continue;
    if (d.type === 'assistant') {
      if (m.id && !vistos.has(m.id)) {
        vistos.add(m.id);
        const u = m.usage ?? {};
        const total = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
        turnos += 1; entradaSomada += total; saida += u.output_tokens ?? 0; contextoFinal = total; contextoDoTurno = total;
        entradaNova += u.input_tokens ?? 0; cacheGravado += u.cache_creation_input_tokens ?? 0; cacheLido += u.cache_read_input_tokens ?? 0;
      }
      for (const b of Array.isArray(m.content) ? m.content : []) {
        if (b?.type === 'tool_use') {
          const etapa = etapaDaChamada(b.name, b.input);
          etapaPorChamada.set(b.id, etapa);
          somar(etapa, etapa.startsWith('escrita') ? tokensDeTexto(JSON.stringify(b.input ?? {})) : 0, 1);
          const escreve = ESCRITAS.has(b.name) || (b.name === 'Bash' && comandoEscreve(b.input?.command ?? '', raiz));
          if (!primeiroPasso && escreve) primeiroPasso = { turno: turnos, contexto: contextoDoTurno, ...ate, arquivos: { ...ate.arquivos } };
          else if (!primeiroPasso) { ate.chamadas += 1; if (b.name === 'Read' && b.input?.file_path) leituraPorChamada.set(b.id, b.input.file_path); }
        } else if (b?.type === 'text') {
          somar('texto da IA', tokensDeTexto(b.text));
        }
      }
    } else if (d.type === 'user') {
      if (typeof m.content === 'string') {
        if (turnos === 0) somar('pedido', tokensDeTexto(m.content));
        continue;
      }
      for (const b of Array.isArray(m.content) ? m.content : []) {
        if (b?.type !== 'tool_result') continue;
        const etapa = etapaPorChamada.get(b.tool_use_id) ?? 'resultado sem chamada';
        const partes = Array.isArray(b.content) ? b.content : [{ type: 'text', text: String(b.content ?? '') }];
        for (const p of partes) somar(etapa, p?.type === 'image' ? TOKENS_POR_IMAGEM : tokensDeTexto(p?.text));
        if (primeiroPasso) continue;
        for (const p of partes) {
          if (p?.type === 'image') { ate.imagens += 1; continue; }
          const bytes = Buffer.byteLength(String(p?.text ?? ''));
          ate.bytes += bytes;
          const caminho = leituraPorChamada.get(b.tool_use_id);
          if (caminho) ate.arquivos[caminho] = (ate.arquivos[caminho] ?? 0) + bytes;
        }
      }
    }
  }
  return { turnos, entradaSomada, entradaNova, cacheGravado, cacheLido, saida, contextoFinal, primeiroPasso, etapas: Object.fromEntries([...etapas].sort((a, b) => b[1].tokens - a[1].tokens)) };
}

const inteiro = (n) => Math.round(n).toLocaleString('pt-BR');

export function textoDaMedicao(medicoes) {
  const linhas = [];
  const soma = new Map();
  for (const { nome, medicao: m } of medicoes) {
    linhas.push(`== ${nome}: ${m.turnos} turnos, contexto final ${inteiro(m.contextoFinal)}, entrada somada ${inteiro(m.entradaSomada)}, saída ${inteiro(m.saida)}`);
    linhas.push(`   entrada: nova ${inteiro(m.entradaNova ?? 0)}, gravada no cache ${inteiro(m.cacheGravado ?? 0)}, lida do cache ${inteiro(m.cacheLido ?? 0)}`);
    const pp = m.primeiroPasso;
    if (pp) {
      linhas.push(`   até o primeiro passo (turno ${pp.turno}): ${inteiro(pp.bytes)} bytes de texto, ${pp.imagens} imagens, ${pp.chamadas} chamadas, contexto ${inteiro(pp.contexto)}`);
      for (const [caminho, bytes] of Object.entries(pp.arquivos).sort((a, b) => b[1] - a[1])) linhas.push(`      ${inteiro(bytes).padStart(9)} B  ${caminho}`);
    } else if (pp === null) linhas.push('   sem primeiro passo: nenhuma chamada escreveu arquivo');
    for (const [etapa, { tokens, chamadas }] of Object.entries(m.etapas)) {
      linhas.push(`   ${etapa.padEnd(40)} ${inteiro(tokens).padStart(9)} tok  (${chamadas} chamadas)`);
      soma.set(etapa, (soma.get(etapa) ?? 0) + tokens);
    }
  }
  if (medicoes.length > 1) {
    const total = [...soma.values()].reduce((a, b) => a + b, 0) || 1;
    linhas.push(`== soma das ${medicoes.length} transcrições`);
    for (const [etapa, tokens] of [...soma].sort((a, b) => b[1] - a[1])) {
      linhas.push(`   ${etapa.padEnd(40)} ${inteiro(tokens).padStart(9)} tok ${(100 * tokens / total).toFixed(1).padStart(5)}%`);
    }
  }
  return `${linhas.join('\n')}\n`;
}

/* ---------- Os atritos por comando (`--atritos[=N]`) ----------
 *
 * POR QUE EXISTE. A análise dos atritos de 2026-11-17 achou à mão o que custou tempo nos registros: a bancada chamada 36 vezes para uma
 * prancha de várias miras, a opção de memória do Node repetida em comandos que não precisavam dela, os scripts de uma vez em `tmp/`. O
 * gate 5 do plano de comparar com a referência já contava comandos pelo `contar-comandos.mjs` da pasta do plano, com os padrões daquela
 * análise; aqui a contagem é por comando, sem padrão escolhido antes, para a lista sair do registro e não de quem já sabe o que procurar. */

export const REPETICOES_PADRAO = 10;
/* Ler, navegar e versionar: o trabalho normal que o "Problema observado" do plano separa do atrito. Ficam fora das listas de repetidos e
   de falhas, e a contagem total os inclui. */
export const COMANDOS_DE_ROTINA = new Set(['cd', 'ls', 'cat', 'sed', 'grep', 'rg', 'head', 'tail', 'wc', 'echo', 'printf', 'sort', 'uniq', 'cut',
  'awk', 'tr', 'true', 'false', 'pwd', 'which', 'test', '[', '[[', 'date', 'basename', 'dirname', 'find', 'xargs', 'jq', 'diff', 'stat',
  'file', 'du', 'tee', 'read', 'set', 'export', 'source', '.', 'exit', 'git', 'cmp', 'md5sum', 'sha256sum', 'column', 'nl', 'less', 'type', 'for', 'done', 'fi', 'esac', 'case', 'in']);
/* As opções de Node do padrão do projeto: as de rodar código dado na linha (`-e`, `-p`, `--input-type`, `--check`) e a `--import` que o
   `package.json` usa. Qualquer outra (`--max-old-space-size`, `--test`, `--expose-gc`) e o `NODE_OPTIONS` são contados. */
export const OPCOES_DE_NODE_PADRAO = new Set(['-e', '--eval', '-p', '--print', '--input-type', '--import', '-c', '--check']);
const OPCOES_DE_NODE_COM_VALOR = new Set(['--import', '-r', '--require', '--loader', '--experimental-loader', '--env-file', '--input-type']);
const EXTENSOES_DE_SCRIPT = new Set(['.mjs', '.js', '.cjs', '.ts', '.py', '.sh']);
const PREFIXOS = new Set(['sudo', 'time', 'nohup', 'env', 'exec', 'command', 'nice', 'do', 'then', 'else', 'elif', 'if', 'while', 'until', '!', '{', '}']);
/* `tmp/` do repositório, o `/tmp` do sistema e o scratchpad da sessão, que fica dentro dele */
const EM_TMP = /(?:^|\/)(?:tmp|scratchpad)\//;

const falhou = (bloco) => {
  const txt = typeof bloco.content === 'string' ? bloco.content : JSON.stringify(bloco.content);
  return Boolean(bloco.is_error) || txt.includes('Traceback') || txt.slice(0, 40).includes('Exit code');
};

/* Um registro, dado como texto JSONL: { inicio, comandos: [{ comando, horario, falha, segundos, pasta }], escritas: [{ caminho, horario }] }.
   `segundos` vai da chamada ao resultado (null sem resultado), `pasta` é o `cwd` da linha e `escritas` são as chamadas de Write. */
export function lerRegistro(jsonl) {
  let inicio = null;
  const comandos = [];
  const escritas = [];
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
        const c = { comando: b.input?.command ?? '', horario: o.timestamp, falha: false, segundos: null, pasta: o.cwd ?? null };
        porId.set(b.id, c); comandos.push(c);
      } else if (b.type === 'tool_use' && b.name === 'Write' && b.input?.file_path) {
        escritas.push({ caminho: b.input.file_path, horario: o.timestamp });
      } else if (b.type === 'tool_result' && porId.has(b.tool_use_id)) {
        const c = porId.get(b.tool_use_id);
        if (falhou(b)) c.falha = true;
        if (c.segundos === null && o.timestamp && c.horario) c.segundos = Math.max(0, (Date.parse(o.timestamp) - Date.parse(c.horario)) / 1000);
      }
    }
  }
  return { inicio, comandos, escritas };
}

/* A sessão: o registro principal e os dos subagentes, cada um { arquivo, tipo, descricao, inicio, comandos, escritas }. */
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

/* O comando sem o corpo dos heredocs (o código de um `python3 - <<'EOF'` não é comando de shell). */
function semHeredoc(comando) {
  const saida = [];
  let fim = null;
  for (const linha of String(comando).split('\n')) {
    if (fim !== null) { if (linha.trim() === fim) fim = null; continue; }
    saida.push(linha);
    const m = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1/.exec(linha);
    if (m) fim = m[2];
  }
  return saida.join('\n');
}

/* Os trechos de um comando de shell, partidos fora de aspas por `&&`, `||`, `|`, `;`, `&` (fora de `2>&1`), quebra de linha, parênteses
   e crase. */
export function trechosDoComando(comando) {
  const texto = semHeredoc(comando);
  const trechos = [];
  let atual = '';
  let aspa = null;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspa) {
      atual += c;
      if (c === '\\' && aspa === '"') { atual += texto[i + 1] ?? ''; i += 1; } else if (c === aspa) aspa = null;
      continue;
    }
    if (c === "'" || c === '"') { aspa = c; atual += c; continue; }
    if (c === '\\' && texto[i + 1] === '\n') { i += 1; atual += ' '; continue; }
    /* `2>&1`, `&>` e `>&` são redirecionamento, e não separam */
    if (c === '&' && (texto[i - 1] === '>' || texto[i + 1] === '>')) { atual += c; continue; }
    if ('&|;\n()`'.includes(c)) { if (atual.trim()) trechos.push(atual.trim()); atual = ''; continue; }
    atual += c;
  }
  if (atual.trim()) trechos.push(atual.trim());
  return trechos;
}

const semAspas = (t) => t.replace(/^['"]|['"]$/g, '');
/* O caminho sem a pasta de trabalho da linha nem a da cópia isolada (`.claude/worktrees/<nome>/`), para o mesmo script ter uma chave só. */
export function caminhoCurto(caminho, pasta = null) {
  let c = semAspas(caminho).replace(/^(?:.*\/)?\.claude\/worktrees\/[^/]+\//, '');
  if (pasta && c.startsWith(`${pasta.replace(/\/$/, '')}/`)) c = c.slice(pasta.replace(/\/$/, '').length + 1);
  c = c.replace(/^\/tmp\/claude-[^/]+\/[^/]+\/[^/]+\/scratchpad\//, 'scratchpad/');
  return c;
}

/* O que um trecho chama: { chave, programa, script, opcoesDeNode: [[nome, valor]] }, ou null para o trecho vazio. A chave é o programa
   com o que o distingue: `node <script>`, `node -e`, `npm run <x>`, `npx <ferramenta>`, `python3 <script>`, `git <subcomando>`. */
export function chamadaDoTrecho(trecho, pasta = null) {
  const tokens = trecho.split(/\s+/).filter(Boolean);
  const opcoesDeNode = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];
    const atribuicao = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(t);
    if (atribuicao) {
      if (atribuicao[1] === 'NODE_OPTIONS') {
        let valor = atribuicao[2];
        /* o valor entre aspas pode ter espaço: junta os tokens até a aspa fechar */
        const aspa = valor[0] === '"' || valor[0] === "'" ? valor[0] : null;
        while (aspa && !(valor.length > 1 && valor.endsWith(aspa)) && i + 1 < tokens.length) { i += 1; valor += ` ${tokens[i]}`; }
        for (const o of semAspas(valor).split(/\s+/).filter(Boolean)) opcoesDeNode.push(['NODE_OPTIONS', o]);
      }
      i += 1; continue;
    }
    if (PREFIXOS.has(t)) { i += 1; continue; }
    if (t === 'timeout') { i += 1; while (i < tokens.length && /^-/.test(tokens[i])) i += tokens[i] === '-s' || tokens[i] === '-k' ? 2 : 1; i += 1; continue; }
    break;
  }
  if (i >= tokens.length) return opcoesDeNode.length ? { chave: null, programa: null, script: null, opcoesDeNode } : null;
  const programa = basename(semAspas(tokens[i]));
  const resto = tokens.slice(i + 1);
  let chave = programa;
  let script = null;
  if (/^node(js)?$/.test(programa)) {
    let j = 0;
    while (j < resto.length && resto[j].startsWith('-')) {
      const [nome, valor] = resto[j].split(/=(.*)/s);
      if (['-e', '--eval', '-p', '--print'].includes(nome)) { chave = 'node -e'; break; }
      if (!OPCOES_DE_NODE_PADRAO.has(nome)) opcoesDeNode.push([nome, valor ?? null]);
      j += valor === undefined && OPCOES_DE_NODE_COM_VALOR.has(nome) ? 2 : 1;
    }
    if (chave !== 'node -e') {
      if (j < resto.length) { script = caminhoCurto(resto[j], pasta); chave = `node ${script}`; } else chave = 'node';
    }
  } else if (programa === 'npm' || programa === 'pnpm' || programa === 'yarn') {
    const args = resto.filter((t) => !t.startsWith('-'));
    chave = args[0] === 'run' || args[0] === 'run-script' ? `${programa} run ${args[1] ?? ''}`.trim() : `${programa} ${args[0] ?? ''}`.trim();
  } else if (programa === 'npx') {
    const ferramenta = resto.find((t) => !t.startsWith('-'));
    chave = `npx ${ferramenta ?? ''}`.trim();
  } else if (/^python3?(\.\d+)?$/.test(programa) || programa === 'bash' || programa === 'sh') {
    const arg = resto.find((t) => !/^-[A-Za-z]+$/.test(t) || t === '-' || t === '-c');
    if (arg === '-' || arg === undefined) chave = `${programa} -`;
    else if (arg === '-c') chave = `${programa} -c`;
    else { script = caminhoCurto(arg, pasta); chave = `${programa} ${script}`; }
  } else if (programa === 'git') {
    let j = 0;
    while (j < resto.length && resto[j].startsWith('-')) j += ['-C', '-c'].includes(resto[j]) ? 2 : 1;
    chave = `git ${resto[j] ?? ''}`.trim();
  }
  return { chave, programa, script, opcoesDeNode };
}

/* Os scripts que um comando de shell grava em `tmp/` por redirecionamento (`cat > tmp/x.mjs <<EOF`, `tee tmp/x.py`). */
function scriptsGravados(comando, pasta) {
  const achados = [];
  for (const m of String(semHeredoc(comando)).matchAll(/(?:(?:^|[^0-9&>\-])>{1,2}|\btee(?:\s+-a)?)\s*([^\s;&|<>()]+)/g)) {
    const alvo = semAspas(m[1]);
    if (EM_TMP.test(alvo) && EXTENSOES_DE_SCRIPT.has(extname(alvo))) achados.push(caminhoCurto(alvo, pasta));
  }
  return achados;
}

/* Os atritos por comando dos registros (os de `lerSessao`): { registros, comandos, falhas, limite, repetidos: [{ chave, vezes, falhas,
   segundos }] (os chamados mais de `limite` vezes, fora os de rotina), falharam: [{ chave, falhas, vezes }], scripts: { arquivos, escritas,
   rodadas, maisRodados: [{ nome, vezes }] }, opcoesDeNode: [{ opcao, vezes, pelaVariavel, valores }] }, com `pelaVariavel` as vezes em que a
   opção veio pelo `NODE_OPTIONS`. Uma chamada conta uma vez para cada chave que
   ela chama, e o tempo dela vai inteiro para cada uma. */
export function contarAtritos(registros, { limite = REPETICOES_PADRAO } = {}) {
  const porChave = new Map();
  const opcoes = new Map();
  const criados = new Map();
  let comandos = 0; let falhas = 0; let rodadas = 0;
  const rodadasPorScript = new Map();
  const anotar = (mapa, chave, vazio) => { if (!mapa.has(chave)) mapa.set(chave, vazio()); return mapa.get(chave); };
  for (const r of registros) {
    for (const e of r.escritas ?? []) {
      const c = caminhoCurto(e.caminho);
      if (EM_TMP.test(e.caminho) && EXTENSOES_DE_SCRIPT.has(extname(e.caminho))) anotar(criados, c, () => ({ escritas: 0 })).escritas += 1;
    }
    for (const cmd of r.comandos) {
      comandos += 1;
      if (cmd.falha) falhas += 1;
      for (const s of scriptsGravados(cmd.comando, cmd.pasta)) anotar(criados, s, () => ({ escritas: 0 })).escritas += 1;
      const chaves = new Set();
      const scripts = new Set();
      for (const trecho of trechosDoComando(cmd.comando)) {
        const chamada = chamadaDoTrecho(trecho, cmd.pasta);
        if (!chamada) continue;
        for (const [nome, valor] of chamada.opcoesDeNode) {
          const pelaVariavel = nome === 'NODE_OPTIONS';
          const [opcao, v] = pelaVariavel ? valor.split(/=(.*)/s) : [nome, valor];
          const o = anotar(opcoes, opcao, () => ({ vezes: 0, pelaVariavel: 0, valores: new Set() }));
          o.vezes += 1;
          if (pelaVariavel) o.pelaVariavel += 1;
          if (v) o.valores.add(v);
        }
        if (chamada.chave) chaves.add(chamada.chave);
        if (chamada.script && EM_TMP.test(chamada.script)) scripts.add(chamada.script);
      }
      for (const s of scripts) { rodadas += 1; rodadasPorScript.set(s, (rodadasPorScript.get(s) ?? 0) + 1); }
      for (const chave of chaves) {
        const k = anotar(porChave, chave, () => ({ vezes: 0, falhas: 0, segundos: 0, programa: chave.split(' ')[0] }));
        k.vezes += 1; if (cmd.falha) k.falhas += 1; k.segundos += cmd.segundos ?? 0;
      }
    }
  }
  const foraDaRotina = [...porChave].filter(([, k]) => !COMANDOS_DE_ROTINA.has(k.programa));
  const linha = ([chave, k]) => ({ chave, vezes: k.vezes, falhas: k.falhas, segundos: Math.round(k.segundos) });
  return {
    registros: registros.length, comandos, falhas, limite,
    repetidos: foraDaRotina.filter(([, k]) => k.vezes > limite).sort((a, b) => b[1].vezes - a[1].vezes).map(linha),
    falharam: foraDaRotina.filter(([, k]) => k.falhas > 0).sort((a, b) => b[1].falhas - a[1].falhas).map(linha),
    scripts: {
      arquivos: criados.size, escritas: [...criados.values()].reduce((a, b) => a + b.escritas, 0), rodadas,
      maisRodados: [...rodadasPorScript].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([nome, vezes]) => ({ nome: basename(nome), vezes })),
    },
    opcoesDeNode: [...opcoes].sort((a, b) => b[1].vezes - a[1].vezes || a[0].localeCompare(b[0]))
      .map(([opcao, o]) => ({ opcao, vezes: o.vezes, pelaVariavel: o.pelaVariavel, valores: [...o.valores].sort() })),
  };
}

const duracao = (s) => (s >= 3600 ? `${(s / 3600).toFixed(1).replace('.', ',')} h` : s >= 60 ? `${Math.round(s / 60)} min` : `${s} s`);

export function textoDosAtritos(nome, a, { maximo = 15 } = {}) {
  const pct = (n, d) => `${(100 * n / (d || 1)).toFixed(1).replace('.', ',')}%`;
  const L = [`== atritos por comando em ${nome}: ${a.registros} registro(s) (o principal e os subagentes), ${inteiro(a.comandos)} comandos de shell, ${inteiro(a.falhas)} falharam (${pct(a.falhas, a.comandos)})`];
  const tabela = (itens) => itens.slice(0, maximo).map((k) => `   ${String(k.vezes).padStart(6)} vezes  ${String(k.falhas).padStart(4)} falhas  ${duracao(k.segundos).padStart(8)}  ${k.chave}`);
  L.push(`   chamados mais de ${a.limite} vezes, fora ler, navegar e versionar (vezes, falhas, tempo somado das chamadas):`);
  L.push(...(a.repetidos.length ? tabela(a.repetidos) : ['   nenhum']));
  if (a.repetidos.length > maximo) L.push(`   e mais ${a.repetidos.length - maximo}`);
  L.push('   os que mais falharam, fora ler, navegar e versionar:');
  L.push(...(a.falharam.length ? tabela(a.falharam) : ['   nenhum']));
  if (a.falharam.length > maximo) L.push(`   e mais ${a.falharam.length - maximo}`);
  const s = a.scripts;
  L.push(`   scripts criados em tmp/: ${s.arquivos} arquivo(s) em ${s.escritas} escrita(s), rodados ${s.rodadas} vez(es)${s.maisRodados.length ? `; os mais rodados: ${s.maisRodados.map((x) => `${x.nome} ${x.vezes}`).join(', ')}` : ''}`);
  L.push(`   opções de Node fora do padrão (${[...OPCOES_DE_NODE_PADRAO].join(', ')}):${a.opcoesDeNode.length ? '' : ' nenhuma'}`);
  for (const o of a.opcoesDeNode) L.push(`   ${String(o.vezes).padStart(6)} vezes  ${o.opcao}${o.valores.length ? ` (${o.valores.join(', ')})` : ''}${o.pelaVariavel ? `, ${o.pelaVariavel} pelo NODE_OPTIONS` : ''}`);
  return `${L.join('\n')}\n`;
}

export const AJUDA = `uso: npm run medir:transcricao -- [--raiz=<cópia>] <transcrição.jsonl> [...]
       npm run medir:transcricao -- --atritos[=N] <sessão.jsonl> [...]

Sem opção, reparte os tokens de cada transcrição por etapa (leituras, escritas, comandos, imagens) e mede até o primeiro passo, a
primeira chamada que escreve arquivo.

  --raiz=<cópia>    o redirecionamento para dentro desta pasta conta como escrita (sem ela, todo caminho fora de /tmp e /dev)
  --atritos[=N]     conta os atritos por comando da transcrição e das dos subagentes dela (<sessão>/subagents/): os comandos chamados
                    mais de N vezes (padrão ${REPETICOES_PADRAO}) e os que falharam, fora ler, navegar e versionar, com o tempo somado; os
                    scripts criados em tmp/ e quantas vezes rodaram; e as opções de Node fora do padrão (${[...OPCOES_DE_NODE_PADRAO].join(', ')}) e o NODE_OPTIONS
  --ajuda           esta ajuda

A transcrição do Claude Code fica em ~/.claude/projects/<pasta>/<sessão>.jsonl.
`;

export function comoCLI(args) {
  if (args.includes('--ajuda') || args.includes('--help') || args.includes('-h')) return { codigo: 0, stdout: AJUDA, stderr: '' };
  const arquivos = [];
  let raiz = null;
  let atritos = null;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--raiz') { raiz = args[i + 1] ?? ''; i += 1; } else if (a.startsWith('--raiz=')) raiz = a.slice(7);
    else if (a === '--atritos') atritos = REPETICOES_PADRAO;
    else if (a.startsWith('--atritos=')) {
      atritos = Number(a.slice(10));
      if (!Number.isInteger(atritos) || atritos < 1) return { codigo: 2, stdout: '', stderr: `--atritos pede um número inteiro de vezes, 1 ou mais; veio "${a.slice(10)}". Exemplo: --atritos=10.\n${AJUDA}` };
    } else if (a.startsWith('--')) return { codigo: 2, stdout: '', stderr: `não conheço '${a}'.\n${AJUDA}` };
    else arquivos.push(a);
  }
  if (arquivos.length === 0 || raiz === '') return { codigo: 1, stdout: '', stderr: AJUDA };
  for (const a of arquivos) if (!existsSync(a)) return { codigo: 2, stdout: '', stderr: `a transcrição '${a}' não existe.\n` };
  if (atritos !== null) {
    return { codigo: 0, stdout: arquivos.map((a) => textoDosAtritos(basename(a), contarAtritos(lerSessao(a), { limite: atritos }))).join(''), stderr: '' };
  }
  const medicoes = arquivos.map((a) => ({ nome: basename(a), medicao: medirTranscricao(readFileSync(a, 'utf8'), { raiz }) }));
  return { codigo: 0, stdout: textoDaMedicao(medicoes), stderr: '' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = comoCLI(process.argv.slice(2));
  process.stdout.write(r.stdout);
  process.stderr.write(r.stderr);
  process.exitCode = r.codigo;
}
