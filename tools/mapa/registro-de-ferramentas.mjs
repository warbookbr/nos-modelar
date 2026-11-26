#!/usr/bin/env node
/* registro-de-ferramentas.mjs — o registro único das ferramentas de linha de comando de `tools/`, conferido.
 *
 * `tools/registro-de-ferramentas.json` lista cada ferramenta de linha de comando: o arquivo, os comandos de `package.json`
 * que a chamam, uma frase do que ela faz e se é de uso (quem trabalha a chama), de gate (a bateria ou o CI a chama) ou interna
 * (outra ferramenta a chama). O `tools/README.md` é gerado dele. A conferência recusa:
 *
 *   - arquivo de `tools/` que é linha de comando (tem `#!/usr/bin/env node`, a guarda de execução direta com `process.argv[1]`,
 *     ou é alvo de um comando de `package.json`) e não tem entrada no registro;
 *   - entrada cujo arquivo não existe, sem frase, com tipo desconhecido ou com os comandos diferentes dos de `package.json`;
 *   - módulo de `tools/` sem chamador (nenhum comando, CI, import, skill nem configuração o cita; o que só teste alcança
 *     também conta como sem chamador) que o registro não declara em `semChamador`, por arquivo ou por pasta, com o motivo;
 *   - declaração de `semChamador` que sobrou (o arquivo sumiu ou ganhou chamador);
 *   - `tools/README.md` diferente do que o registro gera.
 *
 *   node tools/mapa/registro-de-ferramentas.mjs --check     confere e sai com 1 se houver recusa
 *   node tools/mapa/registro-de-ferramentas.mjs --gerar     acrescenta ao registro o que falta, acerta os comandos e regrava o README
 *   node tools/mapa/registro-de-ferramentas.mjs --chamadores[=arquivo]   lista quem chama cada módulo (ou um só)
 *   node tools/mapa/registro-de-ferramentas.mjs --ajuda */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const REGISTRO = 'tools/registro-de-ferramentas.json';
export const LEIAME = 'tools/README.md';
export const TIPOS = ['uso', 'gate', 'interna'];

const AJUDA = `registro-de-ferramentas: confere e gera o registro das ferramentas de linha de comando de tools/.

  npm run ferramentas:registro:check     confere o registro e o tools/README.md (sai com 1 na recusa)
  npm run ferramentas:registro:gerar     acrescenta o que falta ao registro e regrava o tools/README.md
  node tools/mapa/registro-de-ferramentas.mjs --chamadores[=tools/pasta/arquivo.mjs]
                                         lista quem chama cada módulo de tools/, ou um só
  --ajuda                                esta mensagem

O registro é ${REGISTRO}. A frase (\`faz\`) e o tipo (${TIPOS.join(', ')}) de cada entrada se escrevem à mão;
os comandos vêm de package.json e o README é gerado.`;

/* O que é módulo de ferramenta: código rastreado em `tools/`, fora de pasta `fixtures/`, de teste e de declaração de tipo. */
const EXTENSOES_DE_CODIGO = /\.(mjs|js|cjs|ts|py|sh)$/;
const E_TESTE = /\.test\.[a-z]+$/;
export function ehModuloDeFerramenta(arquivo) {
  return arquivo.startsWith('tools/') && !arquivo.includes('/fixtures/') && EXTENSOES_DE_CODIGO.test(arquivo) && !E_TESTE.test(arquivo) && !arquivo.endsWith('.d.ts');
}

/* Linha de comando: o arquivo declara que roda sozinho. Python e shell em `tools/` rodam sempre sozinhos. */
export function ehLinhaDeComando(arquivo, texto) {
  if (/\.(py|sh)$/.test(arquivo)) return /^#!/.test(texto) || /__name__\s*==\s*['"]__main__['"]/.test(texto) || arquivo.endsWith('.sh');
  return /^#!\/usr\/bin\/env node/.test(texto) || /process\.argv\[1\]/.test(texto);
}

/* Os comandos de `package.json` que citam cada arquivo de `tools/`: { arquivo: [comando, ...] }. */
export function comandosPorArquivo(scripts) {
  const mapa = {};
  for (const [nome, linha] of Object.entries(scripts ?? {})) {
    for (const m of String(linha).matchAll(/tools\/[\w./-]+\.(?:mjs|js|cjs|ts|py|sh)/g)) {
      (mapa[m[0]] ??= []).push(nome);
    }
  }
  for (const lista of Object.values(mapa)) lista.sort();
  return mapa;
}

/* Quem cita cada módulo. `arquivos` é { caminho: texto } do repositório inteiro que interessa; devolve
   { modulo: { comando: [], ci: [], importa: [], skill: [], config: [], teste: [], doc: [] } }.
   Em código, vale a string entre aspas que resolve para o módulo (relativa a quem cita ou à raiz) ou que é só o nome do arquivo
   (o caso de `join(RAIZ, 'tools', 'x.mjs')`). Em texto (yml, md, json, toml), vale o caminho inteiro desde `tools/`. */
export function chamadores(arquivos, scripts = {}) {
  const modulos = Object.keys(arquivos).filter(ehModuloDeFerramenta).sort();
  const porNome = new Map();
  for (const m of modulos) {
    const nome = path.posix.basename(m);
    if (!porNome.has(nome)) porNome.set(nome, []);
    porNome.get(nome).push(m);
  }
  const vazio = () => ({ comando: [], ci: [], importa: [], skill: [], config: [], teste: [], doc: [] });
  const resultado = Object.fromEntries(modulos.map((m) => [m, vazio()]));
  for (const [arquivo, lista] of Object.entries(comandosPorArquivo(scripts))) {
    if (resultado[arquivo]) resultado[arquivo].comando.push(...lista);
  }
  const conjunto = new Set(modulos);
  for (const [quem, bruto] of Object.entries(arquivos)) {
    if (quem === 'package.json' || quem === REGISTRO || quem === LEIAME || quem === 'docs/MAPA.md') continue;
    const categoria = categoriaDe(quem);
    if (!categoria) continue;
    /* em código, o comentário não chama ninguém: citar uma ferramenta no cabeçalho de outra não a torna viva */
    const texto = /\.(mjs|js|cjs|ts|tsx)$/.test(quem) ? semComentarios(bruto) : quem.endsWith('.py') ? bruto.replace(/^\s*#.*$/gm, '') : bruto;
    const citados = new Set();
    for (const m of texto.matchAll(/tools\/[\w./-]+\.(?:mjs|js|cjs|ts|py|sh)/g)) if (conjunto.has(m[0])) citados.add(m[0]);
    if (categoria === 'importa' || categoria === 'teste' || categoria === 'config') {
      const dir = path.posix.dirname(quem);
      for (const m of texto.matchAll(/(['"`])([^'"`\n]*?[\w-]+\.(?:mjs|js|cjs|ts|py|sh))\1/g)) {
        const literal = m[2];
        const nome = path.posix.basename(literal);
        if (!porNome.has(nome)) continue;
        if (literal === nome && !literal.startsWith('.')) {
          /* só o nome: vale para o módulo de mesmo nome na pasta de quem cita, ou para o único com esse nome */
          const candidatos = porNome.get(nome);
          const daPasta = candidatos.find((c) => path.posix.dirname(c) === dir);
          if (daPasta) citados.add(daPasta); else if (candidatos.length === 1) citados.add(candidatos[0]);
          continue;
        }
        const relativo = path.posix.normalize(path.posix.join(dir, literal));
        if (conjunto.has(relativo)) citados.add(relativo);
        else {
          /* `join(RAIZ, 'modelar/x.mjs')` e `new URL('../modelar/x.mjs')`: o fim do caminho basta quando é único */
          const fim = literal.replace(/^(\.\.?\/)+/, '');
          const achados = porNome.get(nome).filter((c) => c === fim || c.endsWith(`/${fim}`));
          if (achados.length === 1) citados.add(achados[0]);
        }
      }
    }
    if (/\.(ts|tsx)$/.test(quem)) {
      /* o import do TypeScript vem sem extensão */
      for (const m of texto.matchAll(/(?:from|import)\s*\(?\s*['"](\.[^'"\n]+)['"]/g)) {
        const base = path.posix.normalize(path.posix.join(path.posix.dirname(quem), m[1]));
        for (const ext of ['.ts', '.mjs', '.js']) if (conjunto.has(base + ext)) citados.add(base + ext);
      }
    }
    if (quem.endsWith('.py')) {
      /* `import leitura` e `from perfil import x` entre os scripts Python da mesma pasta */
      for (const m of texto.matchAll(/^\s*(?:from|import)\s+([\w]+)/gm)) {
        const irmao = `${path.posix.dirname(quem)}/${m[1]}.py`;
        if (conjunto.has(irmao)) citados.add(irmao);
      }
    }
    for (const alvo of citados) if (alvo !== quem) resultado[alvo][categoria].push(quem);
  }
  return resultado;
}

/* Tira `/* ... *\/` e `// ...` (este só no começo da linha ou depois de espaço, para não comer `https://`). Aproximação: uma
   string que contenha a abertura de comentário perde o resto, o que só tira citação e nunca inventa uma. */
export function semComentarios(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/.*$/gm, '$1');
}

function categoriaDe(arquivo) {
  if (arquivo.startsWith('.github/')) return 'ci';
  if (arquivo.startsWith('.claude/') || /(^|\/)CLAUDE\.md$/.test(arquivo)) return 'skill';
  if (arquivo.startsWith('.codex/') || arquivo === '.mcp.json') return 'config';
  if (arquivo.includes('/fixtures/')) return E_TESTE.test(arquivo) ? 'teste' : null;
  if (E_TESTE.test(arquivo)) return 'teste';
  if (/\.(mjs|js|cjs|ts|tsx|py|sh|html)$/.test(arquivo)) return arquivo.includes('/') ? 'importa' : 'config';
  if (arquivo.startsWith('docs/modelar/banco-de-provas/')) return null;
  if (arquivo.endsWith('.md')) return 'doc';
  return null;
}

/* Os módulos vivos: os que um comando, o CI, uma skill, uma configuração ou código de fora de `tools/` chama, e os que esses
   importam, em cadeia. Um grupo de ferramentas que só se importam entre si, sem nenhuma dessas entradas, não é vivo. */
export function modulosVivos(quem) {
  const eRaiz = (c) => c.comando.length + c.ci.length + c.skill.length + c.config.length > 0 || c.importa.some((de) => !(de in quem));
  const vivos = new Set(Object.keys(quem).filter((m) => eRaiz(quem[m])));
  for (let mudou = true; mudou;) {
    mudou = false;
    for (const [m, c] of Object.entries(quem)) {
      if (!vivos.has(m) && c.importa.some((de) => vivos.has(de))) { vivos.add(m); mudou = true; }
    }
  }
  return vivos;
}

/* A frase do cabeçalho: `/* nome.mjs — frase.` ou a primeira linha do primeiro comentário. Só semeia o registro. */
export function fraseDoCabecalho(texto) {
  const semShebang = texto.replace(/^#!.*\n/, '');
  const bloco = semShebang.match(/^\s*\/\*+([\s\S]*?)\*\//) ?? semShebang.match(/^\s*((?:\/\/.*\n)+)/) ?? semShebang.match(/^\s*"""([\s\S]*?)"""/) ?? semShebang.match(/^\s*((?:#.*\n)+)/);
  if (!bloco) return '';
  const linhas = bloco[1].split('\n').map((l) => l.replace(/^\s*(\*|\/\/|#)?\s?/, '').trim());
  const paragrafo = [];
  for (const l of linhas) { if (!l && paragrafo.length) break; if (l) paragrafo.push(l); }
  let frase = paragrafo.join(' ').replace(/^[\w./-]+\.(mjs|js|py|sh|ts)\s*[—:-]\s*/, '');
  const fim = frase.search(/[.:](\s|$)/);
  if (fim > 20) frase = frase.slice(0, fim);
  frase = frase.replace(/`/g, '').trim();
  return frase ? frase[0].toUpperCase() + frase.slice(1) + '.' : '';
}

/* A conferência. `arquivos` é { caminho: texto }; `registro` é o JSON lido; `leiame` é o texto do README (ou null para não
   conferir). Devolve as recusas, cada uma com o recebido, o esperado e o conserto. */
export function conferirRegistro({ arquivos, scripts = {}, registro, leiame = null, gates = [] }) {
  const problemas = [];
  const consertoGerar = 'rode `npm run ferramentas:registro:gerar` e escreva a frase e o tipo da entrada nova';
  const modulos = Object.keys(arquivos).filter(ehModuloDeFerramenta).sort();
  const comandos = comandosPorArquivo(scripts);
  const linhasDeComando = modulos.filter((m) => comandos[m] || ehLinhaDeComando(m, arquivos[m]));
  const entradas = registro?.ferramentas ?? [];
  const porArquivo = new Map();
  for (const e of entradas) {
    if (porArquivo.has(e.arquivo)) problemas.push(`${REGISTRO}: recebido ${e.arquivo} em duas entradas; esperado uma entrada por arquivo; apague a repetida.`);
    porArquivo.set(e.arquivo, e);
  }
  for (const m of linhasDeComando) {
    if (!porArquivo.has(m)) {
      const sinal = comandos[m] ? `o comando \`${comandos[m][0]}\` de package.json` : 'a guarda de execução direta';
      problemas.push(`${m}: recebido uma linha de comando (tem ${sinal}) sem entrada em ${REGISTRO}; esperado uma entrada com arquivo, comandos, faz e tipo; ${consertoGerar}.`);
    }
  }
  for (const e of entradas) {
    if (!(e.arquivo in arquivos)) {
      problemas.push(`${REGISTRO}: recebido a entrada ${e.arquivo}, e esse arquivo não existe; esperado só arquivo que existe em tools/; apague a entrada ou corrija o caminho (\`npm run ferramentas:registro:gerar\` tira a entrada órfã).`);
      continue;
    }
    if (!linhasDeComando.includes(e.arquivo)) {
      problemas.push(`${REGISTRO}: recebido a entrada ${e.arquivo}, que não é linha de comando (sem \`#!/usr/bin/env node\`, sem guarda com \`process.argv[1]\` e sem comando em package.json); esperado só ferramenta que roda sozinha; apague a entrada ou dê ao arquivo a guarda de execução direta.`);
      continue;
    }
    if (typeof e.faz !== 'string' || e.faz.trim().length < 12) {
      problemas.push(`${REGISTRO}: recebido \`faz\` ${JSON.stringify(e.faz ?? null)} em ${e.arquivo}; esperado uma frase que diga o que a ferramenta faz; escreva-a na entrada.`);
    }
    if (!TIPOS.includes(e.tipo)) {
      problemas.push(`${REGISTRO}: recebido o tipo ${JSON.stringify(e.tipo ?? null)} em ${e.arquivo}; esperado um de ${TIPOS.join(', ')}; corrija o campo \`tipo\`.`);
    }
    const esperados = comandos[e.arquivo] ?? [];
    const recebidos = [...(e.comandos ?? [])].sort();
    if (JSON.stringify(recebidos) !== JSON.stringify(esperados)) {
      problemas.push(`${REGISTRO}: recebido os comandos [${recebidos.join(', ')}] em ${e.arquivo}; esperado [${esperados.join(', ')}], que é o que package.json tem; rode \`npm run ferramentas:registro:gerar\`.`);
    }
    if (e.tipo === 'gate' && gates.length && !esperados.some((c) => gates.includes(c)) && !e.gatePor) {
      problemas.push(`${REGISTRO}: recebido o tipo gate em ${e.arquivo}, e nenhum comando dele está na lista GATES de tools/gates.mjs; esperado um comando da bateria ou o campo \`gatePor\` dizendo que gate o roda; corrija o tipo ou escreva \`gatePor\`.`);
    }
  }
  const quem = chamadores(arquivos, scripts);
  const declarados = registro?.semChamador ?? [];
  const declaracaoDe = (m) => declarados.find((d) => d.arquivo === m || (d.pasta && m.startsWith(d.pasta)));
  const vivos = modulosVivos(quem);
  const semChamador = modulos.filter((m) => !vivos.has(m));
  for (const m of semChamador) {
    if (declaracaoDe(m)) continue;
    const c = quem[m];
    const recebido = c.importa.length ? `um módulo que só outro módulo sem chamador importa (${c.importa.slice(0, 2).join(', ')})`
      : c.teste.length ? `um módulo que só teste alcança (${c.teste.slice(0, 2).join(', ')})` : 'um módulo que nada chama (nenhum comando, CI, import, skill, configuração nem teste o cita)';
    problemas.push(`${m}: recebido ${recebido}; esperado um comando de package.json, um import de ferramenta viva, uma skill ou uma configuração que o chame; ligue-o a quem o usa, ou declare-o em \`semChamador\` de ${REGISTRO} com o motivo (apoio de teste, uso à mão, ou à espera da decisão da pessoa). \`node tools/mapa/registro-de-ferramentas.mjs --chamadores=${m}\` mostra quem o cita.`);
  }
  for (const d of declarados) {
    const alvo = d.arquivo ?? d.pasta;
    if (typeof d.motivo !== 'string' || d.motivo.trim().length < 8) problemas.push(`${REGISTRO}: recebido ${alvo} em \`semChamador\` sem motivo; esperado o motivo de ele ficar sem chamador; escreva o campo \`motivo\`.`);
    if (d.pasta) {
      if (!d.pasta.endsWith('/') || !semChamador.some((m) => m.startsWith(d.pasta))) problemas.push(`${REGISTRO}: recebido a pasta ${d.pasta} em \`semChamador\`, e nenhum módulo sem chamador mora nela; esperado uma pasta terminada em / com ao menos um módulo sem chamador; apague a declaração.`);
    } else if (!(d.arquivo in arquivos)) problemas.push(`${REGISTRO}: recebido ${d.arquivo} em \`semChamador\`, e esse arquivo não existe; esperado só arquivo que existe; apague a declaração.`);
    else if (!semChamador.includes(d.arquivo)) problemas.push(`${REGISTRO}: recebido ${d.arquivo} em \`semChamador\`, e ele tem chamador (${resumoDosChamadores(quem[d.arquivo] ?? {})}); esperado só módulo sem chamador; apague a declaração.`);
  }
  if (leiame !== null && registro) {
    const esperado = gerarLeiame(registro);
    if (leiame.replace(/\r\n/g, '\n') !== esperado) problemas.push(`${LEIAME}: recebido um texto diferente do que ${REGISTRO} gera; esperado o arquivo gerado, sem edição à mão; rode \`npm run ferramentas:registro:gerar\`.`);
  }
  return { problemas, linhasDeComando, modulos, semChamador, chamadores: quem };
}

export function resumoDosChamadores(c) {
  const partes = [];
  if (c.comando?.length) partes.push(`comando ${c.comando.join(', ')}`);
  for (const [rotulo, chave] of [['CI', 'ci'], ['import', 'importa'], ['skill', 'skill'], ['configuração', 'config'], ['teste', 'teste'], ['documento', 'doc']]) {
    if (c[chave]?.length) partes.push(`${rotulo} ${c[chave].slice(0, 3).join(', ')}${c[chave].length > 3 ? ` e mais ${c[chave].length - 3}` : ''}`);
  }
  return partes.join('; ') || 'ninguém';
}

/* Acerta o registro com a árvore: entra o que falta (frase semeada do cabeçalho, para revisar), saem as entradas órfãs e os
   comandos seguem package.json. Frase e tipo já escritos não mudam. */
export function atualizarRegistro({ arquivos, scripts = {}, registro, gates = [] }) {
  const modulos = Object.keys(arquivos).filter(ehModuloDeFerramenta).sort();
  const comandos = comandosPorArquivo(scripts);
  const anteriores = new Map((registro?.ferramentas ?? []).map((e) => [e.arquivo, e]));
  const quem = chamadores(arquivos, scripts);
  const ferramentas = [];
  for (const m of modulos) {
    if (!comandos[m] && !ehLinhaDeComando(m, arquivos[m])) continue;
    const antes = anteriores.get(m);
    const lista = comandos[m] ?? [];
    const tipo = antes?.tipo ?? (lista.some((c) => gates.includes(c)) || quem[m].ci.length ? 'gate' : lista.length ? 'uso' : 'interna');
    const entrada = { arquivo: m, comandos: lista, faz: antes?.faz ?? fraseDoCabecalho(arquivos[m]), tipo };
    if (antes?.gatePor) entrada.gatePor = antes.gatePor;
    ferramentas.push(entrada);
  }
  const vivos = modulosVivos(quem);
  const semChamador = (registro?.semChamador ?? []).filter((d) => d.pasta || (d.arquivo in arquivos && quem[d.arquivo] && !vivos.has(d.arquivo)));
  return { ferramentas, semChamador };
}

export function serializarRegistro(registro) {
  const linha = (o) => `    ${JSON.stringify(o)}`;
  return `{\n  "ferramentas": [\n${registro.ferramentas.map(linha).join(',\n')}\n  ],\n  "semChamador": [\n${(registro.semChamador ?? []).map(linha).join(',\n')}\n  ]\n}\n`;
}

/* O README é curto de propósito: a tabela é só das ferramentas de uso, que é o que se procura; as de gate e as internas vão
   pelo nome, e a frase de cada uma está no registro. */
export function gerarLeiame(registro) {
  const doTipo = (tipo) => registro.ferramentas.filter((e) => e.tipo === tipo);
  const curto = (e) => e.arquivo.replace(/^tools\//, '');
  const comandoDe = (e) => (e.comandos.length ? e.comandos.map((c) => `\`${c}\``).join(', ') : `\`node ${e.arquivo}\``);
  const saida = [
    '# tools/ — as ferramentas do Modelar',
    '',
    `Gerado de \`${REGISTRO}\` por \`npm run ferramentas:registro:gerar\`; não edite à mão. O registro tem uma entrada por ferramenta de linha de comando desta pasta (o arquivo, os comandos de \`package.json\`, o que faz e o tipo), e \`npm run ferramentas:registro:check\` recusa a que ficar de fora, a entrada sem arquivo e o módulo sem chamador. Ferramenta nova nasce na pasta do assunto dela (\`tools/modelar/\` para peça e bancada, \`tools/mapa/\` para documento e processo, \`tools/gates/\` para a bateria), responde a \`--ajuda\` e ganha entrada no registro. As regras de quem muda esta pasta estão em \`tools/CLAUDE.md\`.`,
    '',
    `## De uso (${doTipo('uso').length})`,
    '',
    'Quem trabalha chama, com `npm run <comando> -- <argumentos>`; a que não tem comando roda pelo arquivo.',
    '',
    '| Comando | O que faz |',
    '|---|---|',
    ...doTipo('uso').map((e) => `| ${comandoDe(e)} | ${e.faz.replace(/\|/g, '\\|')} |`),
    '',
    `## De gate (${doTipo('gate').length})`,
    '',
    `A bateria (\`npm run gates\`) ou o CI chama, e cada uma roda sozinha para conferir uma coisa só: ${doTipo('gate').map((e) => `\`${curto(e)}\``).join(', ')}.`,
    '',
    `## Internas (${doTipo('interna').length})`,
    '',
    `Outra ferramenta chama: ${doTipo('interna').map((e) => `\`${curto(e)}\``).join(', ')}.`,
    '',
  ];
  const pendentes = registro.semChamador ?? [];
  if (pendentes.length) {
    saida.push(`## Sem chamador, declarados (${pendentes.length})`, '', 'Nenhum comando, import de ferramenta viva, skill ou configuração chama o que está abaixo; o motivo de cada um ficar está no registro.', '', pendentes.map((d) => `\`${(d.arquivo ?? d.pasta).replace(/^tools\//, '')}\``).join(', ') + '.', '');
  }
  return saida.join('\n');
}

/* A árvore de verdade: todo arquivo rastreado de texto, com o conteúdo. */
export function lerArvore(raiz = REPO) {
  const lista = execFileSync('git', ['ls-files', '-co', '--exclude-standard'], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\n').filter(Boolean);
  const arquivos = {};
  for (const rel of lista) {
    if (!/\.(mjs|js|cjs|ts|tsx|py|sh|html|md|yml|yaml|json|toml)$/.test(rel)) continue;
    if ((rel.includes('/fixtures/') && !E_TESTE.test(rel)) || rel.startsWith('docs/modelar/banco-de-provas/') || rel === 'package-lock.json') continue;
    if (rel.endsWith('.json') && !['package.json', '.mcp.json', REGISTRO].includes(rel) && !rel.startsWith('.claude/')) continue;
    const caminho = path.join(raiz, rel);
    if (!existsSync(caminho)) continue;
    arquivos[rel] = readFileSync(caminho, 'utf8');
  }
  return arquivos;
}

async function executar(args) {
  if (args.includes('--ajuda') || args.includes('--help')) { console.log(AJUDA); return 0; }
  const arquivos = lerArvore();
  const scripts = JSON.parse(arquivos['package.json']).scripts;
  const { GATES } = await import('../gates.mjs');
  const caminhoDoRegistro = path.join(REPO, REGISTRO);
  const registro = existsSync(caminhoDoRegistro) ? JSON.parse(readFileSync(caminhoDoRegistro, 'utf8')) : { ferramentas: [], semChamador: [] };
  const opcaoChamadores = args.find((a) => a === '--chamadores' || a.startsWith('--chamadores='));
  if (opcaoChamadores) {
    const quem = chamadores(arquivos, scripts);
    const alvo = opcaoChamadores.split('=')[1];
    if (alvo && !quem[alvo]) { console.error(`recebido ${alvo}; esperado um módulo de tools/ (fora de fixtura e de teste); confira o caminho desde a raiz.`); return 1; }
    for (const m of alvo ? [alvo] : Object.keys(quem)) console.log(`${m}: ${resumoDosChamadores(quem[m])}`);
    return 0;
  }
  if (args.includes('--gerar')) {
    const novo = atualizarRegistro({ arquivos, scripts, registro, gates: GATES });
    writeFileSync(caminhoDoRegistro, serializarRegistro(novo), 'utf8');
    writeFileSync(path.join(REPO, LEIAME), gerarLeiame(novo), 'utf8');
    const entraram = novo.ferramentas.length - (registro.ferramentas ?? []).filter((e) => novo.ferramentas.some((n) => n.arquivo === e.arquivo)).length;
    console.log(`${REGISTRO}: ${novo.ferramentas.length} ferramentas (${entraram} novas), ${novo.semChamador.length} declarações em semChamador; ${LEIAME} regravado.`);
    return 0;
  }
  if (args.includes('--check')) {
    arquivos[REGISTRO] = JSON.stringify(registro);
    const caminhoDoLeiame = path.join(REPO, LEIAME);
    const { problemas, linhasDeComando, modulos, semChamador } = conferirRegistro({ arquivos, scripts, registro, gates: GATES, leiame: existsSync(caminhoDoLeiame) ? readFileSync(caminhoDoLeiame, 'utf8') : '' });
    if (problemas.length) {
      console.error(`registro de ferramentas: ${problemas.length} recusa(s)\n`);
      for (const p of problemas) console.error(`  - ${p}`);
      return 1;
    }
    console.log(`registro de ferramentas: ${linhasDeComando.length} linhas de comando registradas, ${modulos.length} módulos conferidos, ${semChamador.length} sem chamador e todos declarados.`);
    return 0;
  }
  console.error(`recebido ${args.join(' ') || 'nenhuma opção'}; esperado --check, --gerar, --chamadores ou --ajuda.\n\n${AJUDA}`);
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await executar(process.argv.slice(2));
}
