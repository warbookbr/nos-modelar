#!/usr/bin/env node
/* registro-de-ferramentas.mjs — o registro único das ferramentas de linha de comando de `tools/`, conferido.
 *
 * `tools/registro-de-ferramentas.json` lista cada ferramenta de linha de comando: o arquivo, os comandos de `package.json`
 * que a chamam, uma frase do que ela faz e se é de uso (quem trabalha a chama), de gate (a bateria ou o CI a chama) ou interna
 * (outra ferramenta a chama). O `tools/README.md` é gerado dele. A conferência recusa:
 *
 *   - arquivo de `tools/` que é linha de comando (tem `#!/usr/bin/env node`, a guarda de execução direta com `process.argv[1]`
 *     ou `import.meta.main`, lê `process.argv.slice(2)`, ou é alvo de um comando de `package.json`) e não tem entrada;
 *   - entrada cujo arquivo não existe, sem frase, com tipo desconhecido ou com os comandos diferentes dos de `package.json`;
 *   - módulo de `tools/` sem chamador (nenhum comando, CI, import, skill nem configuração o chama, nem direto nem por um módulo
 *     vivo que o importe) que o registro não declara: em `apoioDeTeste`, quando algum teste o importa, ou em `semChamador`, com
 *     o motivo; o carregado por caminho calculado declara o carregador vivo no campo `por`;
 *   - declaração que sobrou (o arquivo sumiu ou ganhou chamador) e declaração por pasta com a lista de arquivos fora de dia;
 *   - registro que não lê como JSON ou sem a lista `ferramentas`;
 *   - `tools/README.md` diferente do que o registro gera.
 *
 * Só importa `node:`: o `--gerar` roda no passo de juntar à main do CI, antes do `npm ci`.
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
                                         lista quem importa e quem cita cada módulo de tools/, ou um só
  --ajuda                                esta mensagem

O registro é ${REGISTRO}. A frase (\`faz\`) e o tipo (${TIPOS.join(', ')}) de cada entrada se escrevem à mão;
os comandos vêm de package.json e o README é gerado.`;

/* O que é módulo de ferramenta: código de `tools/`, fora de `tools/fixtures/`, de teste e de declaração de tipo. A pasta
   `fixtures/` de dentro de outra pasta de `tools/` conta: o que mora nela é apoio de teste e é declarado como tal. */
const EXTENSOES = 'mjs|js|cjs|jsx|ts|tsx|mts|py|sh';
const EXTENSOES_DE_CODIGO = new RegExp(`\\.(${EXTENSOES})$`);
const E_JS = /\.(mjs|js|cjs|jsx|ts|tsx|mts)$/;
const E_TESTE = /\.test\.[a-z]+$/;
const CAMINHO_DE_FERRAMENTA = new RegExp(`tools/[\\w./-]+\\.(?:${EXTENSOES})`, 'g');
export function ehModuloDeFerramenta(arquivo) {
  return arquivo.startsWith('tools/') && !arquivo.startsWith('tools/fixtures/') && EXTENSOES_DE_CODIGO.test(arquivo) && !E_TESTE.test(arquivo) && !/\.d\.[a-z]+$/.test(arquivo);
}

/* Linha de comando: o arquivo declara que roda sozinho (o cabeçalho de execução, a guarda com `process.argv[1]` ou com
   `import.meta.main`, ou a leitura dos argumentos com `process.argv.slice(2)`). Shell roda sempre sozinho. */
export function ehLinhaDeComando(arquivo, texto) {
  if (arquivo.endsWith('.sh')) return true;
  if (arquivo.endsWith('.py')) return /^#!/.test(texto) || /__name__\s*==\s*['"]__main__['"]/.test(texto);
  return /^#!\/usr\/bin\/env node/.test(texto) || /process\.argv\[1\]|import\.meta\.main|process\.argv\.slice\(2\)/.test(semComentarios(texto));
}

/* Os comandos de `package.json` que citam cada arquivo de `tools/`: { arquivo: [comando, ...] }. */
export function comandosPorArquivo(scripts) {
  const mapa = {};
  for (const [nome, linha] of Object.entries(scripts ?? {})) {
    for (const m of String(linha).matchAll(CAMINHO_DE_FERRAMENTA)) (mapa[m[0]] ??= []).push(nome);
  }
  for (const lista of Object.values(mapa)) lista.sort();
  return mapa;
}

/* Tira os comentários de um texto JavaScript sem abrir comentário dentro de aspas: percorre o texto sabendo se está numa
   string. A string de aspa simples ou dupla acaba no fim da linha, o que limita o estrago de uma aspa solta numa expressão
   regular. */
export function semComentarios(texto) {
  let saida = '';
  let aspa = null;
  for (let k = 0; k < texto.length; k += 1) {
    const c = texto[k];
    if (aspa) {
      saida += c;
      if (c === '\\') { saida += texto[k + 1] ?? ''; k += 1; }
      else if (c === aspa || (c === '\n' && aspa !== '`')) aspa = null;
    } else if (c === '"' || c === "'" || c === '`') { aspa = c; saida += c; }
    else if (c === '/' && texto[k + 1] === '*') { const fim = texto.indexOf('*/', k + 2); k = fim < 0 ? texto.length : fim + 1; saida += ' '; }
    else if (c === '/' && texto[k + 1] === '/' && texto[k - 1] !== '\\') { const fim = texto.indexOf('\n', k); k = fim < 0 ? texto.length : fim - 1; }
    else saida += c;
  }
  return saida;
}

/* Quem chama cada módulo. `arquivos` é { caminho: texto }; devolve, por módulo,
   { comando, ci, importa, cita, skill, config, teste, doc }, cada um a lista de quem chama.
   `importa` é o import de verdade (`import`, `from`, `import()`, `require`, e o `import` entre scripts Python da mesma pasta).
   `cita` é a string de código cujo texto inteiro é o caminho do módulo: `'tools/x/y.mjs'`, o relativo `'./y.mjs'` que resolve
   a partir de quem cita, e o nome solto `'y.mjs'` (o caso de `join(RAIZ, 'tools', 'x', 'y.mjs')`), este só em `tools/` e em
   teste. O caminho no meio de uma mensagem não é chamada. Em texto que não é código (yml, md, json, toml, sh), vale o caminho
   desde `tools/` em qualquer lugar. Comentário não chama ninguém. */
export function chamadores(arquivos, scripts = {}) {
  const modulos = Object.keys(arquivos).filter(ehModuloDeFerramenta).sort();
  const conjunto = new Set(modulos);
  const porNome = new Map();
  for (const m of modulos) {
    const nome = path.posix.basename(m);
    if (!porNome.has(nome)) porNome.set(nome, []);
    porNome.get(nome).push(m);
  }
  const resultado = Object.fromEntries(modulos.map((m) => [m, { comando: [], ci: [], importa: [], cita: [], skill: [], config: [], teste: [], doc: [] }]));
  for (const [arquivo, lista] of Object.entries(comandosPorArquivo(scripts))) {
    if (resultado[arquivo]) resultado[arquivo].comando.push(...lista);
  }
  const resolver = (dir, especificador) => {
    const base = path.posix.normalize(path.posix.join(dir, especificador));
    if (conjunto.has(base)) return base;
    return ['.ts', '.tsx', '.mts', '.mjs', '.js', '.jsx'].map((ext) => base + ext).find((c) => conjunto.has(c)) ?? null;
  };
  for (const [quem, bruto] of Object.entries(arquivos)) {
    if (quem === 'package.json' || quem === REGISTRO || quem === LEIAME || quem === 'docs/MAPA.md') continue;
    const categoria = categoriaDe(quem);
    if (!categoria) continue;
    const dir = path.posix.dirname(quem);
    const importados = new Set();
    const citados = new Set();
    if (E_JS.test(quem) || quem.endsWith('.py')) {
      const texto = quem.endsWith('.py') ? bruto.replace(/^\s*#.*$/gm, '') : semComentarios(bruto);
      if (quem.endsWith('.py')) {
        for (const m of texto.matchAll(/^\s*(?:from|import)\s+(\w+)/gm)) {
          const irmao = `${dir}/${m[1]}.py`;
          if (conjunto.has(irmao)) importados.add(irmao);
        }
      } else {
        for (const m of texto.matchAll(/(?:\bfrom|\bimport|\brequire)\s*\(?\s*(['"`])(\.{1,2}\/[^'"`\n]+)\1/g)) {
          const alvo = resolver(dir, m[2]);
          if (alvo) importados.add(alvo);
        }
      }
      const nomeSoltoVale = quem.startsWith('tools/') || categoria === 'teste';
      for (const m of texto.matchAll(new RegExp(`(['"\`])([^'"\`\\n]*?[\\w-]+\\.(?:${EXTENSOES}))\\1`, 'g'))) {
        const literal = m[2];
        if (literal.startsWith('./') || literal.startsWith('../')) {
          const alvo = resolver(dir, literal);
          if (alvo) citados.add(alvo);
        } else if (conjunto.has(literal)) citados.add(literal);
        else if (!literal.includes('/') && nomeSoltoVale && porNome.has(literal)) {
          const candidatos = porNome.get(literal);
          const daPasta = candidatos.find((c) => path.posix.dirname(c) === dir);
          if (daPasta) citados.add(daPasta); else if (candidatos.length === 1) citados.add(candidatos[0]);
        }
      }
    } else {
      for (const m of bruto.matchAll(CAMINHO_DE_FERRAMENTA)) if (conjunto.has(m[0])) citados.add(m[0]);
    }
    importados.delete(quem);
    citados.delete(quem);
    for (const alvo of importados) { citados.delete(alvo); resultado[alvo][categoria === 'codigo' ? 'importa' : categoria].push(quem); }
    for (const alvo of citados) resultado[alvo][categoria === 'codigo' ? 'cita' : categoria].push(quem);
  }
  return resultado;
}

function categoriaDe(arquivo) {
  if (arquivo.startsWith('.github/')) return 'ci';
  if (arquivo.startsWith('.claude/') || /(^|\/)CLAUDE\.md$/.test(arquivo)) return 'skill';
  if (arquivo.startsWith('.codex/') || arquivo === '.mcp.json') return 'config';
  if (E_TESTE.test(arquivo)) return 'teste';
  if (arquivo.startsWith('tools/fixtures/')) return null;
  if (EXTENSOES_DE_CODIGO.test(arquivo) || arquivo.endsWith('.html')) return arquivo.includes('/') ? 'codigo' : 'config';
  if (arquivo.startsWith('docs/modelar/banco-de-provas/')) return null;
  if (arquivo.endsWith('.md')) return 'doc';
  return null;
}

/* Os módulos vivos: os que um comando, o CI, uma skill, uma configuração ou código de fora de `tools/` chama, e os que esses
   importam ou citam, em cadeia. Um grupo de ferramentas que só se importam entre si, sem nenhuma dessas entradas, não é vivo.
   `raizes` acrescenta módulos vivos por declaração (o carregado por caminho calculado, que o texto não mostra). */
export function modulosVivos(quem, raizes = []) {
  const deCodigo = (c) => [...c.importa, ...c.cita];
  const eRaiz = (c) => c.comando.length + c.ci.length + c.skill.length + c.config.length > 0 || deCodigo(c).some((de) => !(de in quem));
  const vivos = new Set([...Object.keys(quem).filter((m) => eRaiz(quem[m])), ...raizes.filter((m) => m in quem)]);
  for (let mudou = true; mudou;) {
    mudou = false;
    for (const [m, c] of Object.entries(quem)) {
      if (!vivos.has(m) && deCodigo(c).some((de) => vivos.has(de))) { vivos.add(m); mudou = true; }
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

/* A lista GATES de `tools/gates.mjs`, lida do texto: importar o arquivo puxaria os pacotes de quem ele importa, e este
   gerador roda no passo de juntar à main do CI, antes do `npm ci`. */
export function gatesDoTexto(texto) {
  const lista = semComentarios(texto ?? '').match(/export const GATES = \[([\s\S]*?)\];/)?.[1] ?? '';
  return [...lista.matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

/* Lê o registro do texto; o JSON quebrado e o registro sem a lista `ferramentas` voltam como recusa, sem estourar. */
export function lerRegistro(texto) {
  const conserto = `corrija o arquivo, ou apague-o e rode \`npm run ferramentas:registro:gerar\` para gerá-lo de novo`;
  if (texto === null || texto === undefined) return { registro: null, problema: `${REGISTRO}: recebido nenhum arquivo; esperado o registro das ferramentas; rode \`npm run ferramentas:registro:gerar\`.` };
  let registro;
  try { registro = JSON.parse(texto); } catch (erro) {
    return { registro: null, problema: `${REGISTRO}: recebido um JSON que não lê (${erro.message}); esperado um objeto com as listas \`ferramentas\`, \`apoioDeTeste\` e \`semChamador\`; ${conserto}.` };
  }
  if (!registro || !Array.isArray(registro.ferramentas)) {
    return { registro: null, problema: `${REGISTRO}: recebido um registro sem a lista \`ferramentas\` (${Array.isArray(registro) ? 'uma lista' : typeof registro} com ${registro && typeof registro === 'object' ? `os campos ${Object.keys(registro).join(', ') || 'nenhum'}` : 'nada'}); esperado um objeto com as listas \`ferramentas\`, \`apoioDeTeste\` e \`semChamador\`; ${conserto}.` };
  }
  return { registro, problema: null };
}

/* Os arquivos que uma declaração cobre: o `arquivo`, ou a lista `arquivos` da declaração por pasta. */
const arquivosDa = (d) => (d.pasta ? d.arquivos ?? [] : [d.arquivo]);

/* Os módulos sem chamador, contado o carregado por caminho calculado: a declaração com o campo `por` aponta o carregador, que
   precisa existir, não ser teste e estar vivo; aí o módulo continua declarado, e o que ele importa passa a viver. */
function modulosSemChamador(quem, arquivos, declarados) {
  const vivosSemDeclaracao = modulosVivos(quem);
  const carregadorVale = (por) => typeof por === 'string' && por in arquivos && !E_TESTE.test(por) && (!(por in quem) || vivosSemDeclaracao.has(por));
  const calculados = declarados.filter((d) => d.arquivo && d.por && carregadorVale(d.por)).map((d) => d.arquivo);
  const vivos = modulosVivos(quem, calculados);
  const semChamador = Object.keys(quem).filter((m) => !vivos.has(m) || (calculados.includes(m) && !vivosSemDeclaracao.has(m)));
  return { semChamador, carregadorVale };
}

/* O que cada declaração por pasta deve listar: os módulos sem chamador da pasta que nenhuma declaração por arquivo cobre; com
   uma pasta dentro da outra, o módulo é da mais funda. */
function listasDasPastas(declaracoes, semChamador) {
  const porArquivo = new Set(declaracoes.filter((d) => d.arquivo).map((d) => d.arquivo));
  const pastas = declaracoes.filter((d) => typeof d.pasta === 'string');
  const listas = new Map(pastas.map((d) => [d, []]));
  for (const m of semChamador) {
    if (porArquivo.has(m)) continue;
    const dona = pastas.filter((d) => m.startsWith(d.pasta)).sort((a, b) => b.pasta.length - a.pasta.length)[0];
    if (dona) listas.get(dona).push(m);
  }
  return listas;
}

/* A conferência. `arquivos` é { caminho: texto }; `registro` é o JSON lido; `leiame` é o texto do README (ou null para não
   conferir); `naoRastreados` são os arquivos que o git ainda não rastreia, que o CI não vê. Devolve as recusas, cada uma com
   o recebido, o esperado e o conserto. */
export function conferirRegistro({ arquivos, scripts = {}, registro, leiame = null, gates = [], naoRastreados = new Set() }) {
  const problemas = [];
  if (!registro || !Array.isArray(registro.ferramentas)) {
    return { problemas: [lerRegistro(registro === null || registro === undefined ? null : JSON.stringify(registro)).problema], linhasDeComando: [], modulos: [], semChamador: [], chamadores: {} };
  }
  const rotulo = (m) => (naoRastreados.has(m) ? `${m} (arquivo não rastreado: o CI não o vê; rode \`git add ${m}\` ou apague-o)` : m);
  const consertoGerar = 'rode `npm run ferramentas:registro:gerar` e escreva a frase e o tipo da entrada nova';
  const modulos = Object.keys(arquivos).filter(ehModuloDeFerramenta).sort();
  const comandos = comandosPorArquivo(scripts);
  const linhasDeComando = modulos.filter((m) => comandos[m] || ehLinhaDeComando(m, arquivos[m]));
  const entradas = registro.ferramentas;
  const porArquivo = new Map();
  for (const e of entradas) {
    if (porArquivo.has(e.arquivo)) problemas.push(`${REGISTRO}: recebido ${e.arquivo} em duas entradas; esperado uma entrada por arquivo; apague a repetida.`);
    porArquivo.set(e.arquivo, e);
  }
  for (const m of linhasDeComando) {
    if (!porArquivo.has(m)) {
      const sinal = comandos[m] ? `o comando \`${comandos[m][0]}\` de package.json` : 'a guarda de execução direta';
      problemas.push(`${rotulo(m)}: recebido uma linha de comando (tem ${sinal}) sem entrada em ${REGISTRO}; esperado uma entrada com arquivo, comandos, faz e tipo; ${consertoGerar}.`);
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
  const apoio = registro.apoioDeTeste ?? [];
  const declarados = registro.semChamador ?? [];
  const { semChamador, carregadorVale } = modulosSemChamador(quem, arquivos, declarados);
  const coberto = new Set([...apoio, ...declarados].flatMap(arquivosDa));
  const listas = listasDasPastas([...apoio, ...declarados], semChamador);
  for (const m of semChamador) {
    if (coberto.has(m)) continue;
    const c = quem[m];
    const daPasta = [...apoio, ...declarados].find((d) => d.pasta && m.startsWith(d.pasta));
    if (daPasta) {
      problemas.push(`${rotulo(m)}: recebido um módulo novo na pasta ${daPasta.pasta}, que o registro declara arquivo por arquivo, fora da lista dela; esperado o arquivo na lista \`arquivos\` da declaração; rode \`npm run ferramentas:registro:gerar\`, que refaz a lista, ou ligue o módulo a quem o usa.`);
      continue;
    }
    const deCodigo = [...c.importa, ...c.cita];
    const recebido = deCodigo.length ? `um módulo que só outro módulo sem chamador importa (${deCodigo.slice(0, 2).join(', ')})`
      : c.teste.length ? `um módulo que só teste alcança (${c.teste.slice(0, 2).join(', ')})` : 'um módulo que nada chama (nenhum comando, CI, import, skill, configuração nem teste o cita)';
    const linha = !deCodigo.length && c.teste.length
      ? `se é apoio de teste, escreva em \`apoioDeTeste\` de ${REGISTRO} a linha {"arquivo":"${m}"}; se não, em \`semChamador\` a linha {"arquivo":"${m}","motivo":"<por que fica>"}`
      : `escreva em \`semChamador\` de ${REGISTRO} a linha {"arquivo":"${m}","motivo":"<por que fica>"}, ou, se outro arquivo o carrega por caminho calculado, {"arquivo":"${m}","motivo":"carregado por caminho calculado","por":"<o carregador>"}`;
    problemas.push(`${rotulo(m)}: recebido ${recebido}; esperado um comando de package.json, um import de ferramenta viva, uma skill ou uma configuração que o chame; ligue-o a quem o usa, ou ${linha}. \`node tools/mapa/registro-de-ferramentas.mjs --chamadores=${m}\` mostra quem o importa e quem o cita.`);
  }
  const conferirDeclaracao = (d, lista) => {
    const alvo = d.arquivo ?? d.pasta;
    if (d.pasta) {
      const esperados = listas.get(d) ?? [];
      const recebidos = [...(d.arquivos ?? [])].sort();
      if (!d.pasta.endsWith('/') || !esperados.length) problemas.push(`${REGISTRO}: recebido a pasta ${d.pasta} em \`${lista}\`, e nenhum módulo sem chamador mora nela; esperado uma pasta terminada em / com ao menos um módulo sem chamador; apague a declaração.`);
      else if (JSON.stringify(recebidos) !== JSON.stringify(esperados)) {
        const sobram = recebidos.filter((m) => !esperados.includes(m));
        const faltam = esperados.filter((m) => !recebidos.includes(m));
        problemas.push(`${REGISTRO}: recebido a pasta ${d.pasta} em \`${lista}\` com a lista \`arquivos\` fora de dia (${[faltam.length ? `faltam ${faltam.join(', ')}` : '', sobram.length ? `sobram ${sobram.join(', ')}` : ''].filter(Boolean).join('; ')}); esperado os ${esperados.length} módulos sem chamador da pasta; rode \`npm run ferramentas:registro:gerar\`.`);
      }
      return esperados;
    }
    if (!(d.arquivo in arquivos)) { problemas.push(`${REGISTRO}: recebido ${alvo} em \`${lista}\`, e esse arquivo não existe; esperado só arquivo que existe; apague a declaração.`); return []; }
    if (!semChamador.includes(d.arquivo)) { problemas.push(`${REGISTRO}: recebido ${alvo} em \`${lista}\`, e ele tem chamador (${resumoDosChamadores(quem[d.arquivo] ?? {})}); esperado só módulo sem chamador; apague a declaração.`); return []; }
    return [d.arquivo];
  };
  for (const d of apoio) {
    const irmaos = arquivosDa(d);
    for (const m of conferirDeclaracao(d, 'apoioDeTeste')) {
      const porTeste = typeof d.por === 'string' && E_TESTE.test(d.por) && d.por in arquivos;
      if (d.por && !porTeste) problemas.push(`${REGISTRO}: recebido \`por\` ${JSON.stringify(d.por)} em ${d.arquivo ?? d.pasta}, de \`apoioDeTeste\`; esperado o arquivo de teste, existente, que carrega o apoio por caminho calculado; corrija o campo.`);
      else if (!porTeste && !quem[m].teste.length && !(d.pasta && [...quem[m].importa, ...quem[m].cita].some((de) => irmaos.includes(de)))) problemas.push(`${REGISTRO}: recebido ${m} em \`apoioDeTeste\`, e nenhum teste o importa nem o cita; esperado um teste que o importe (ou, na declaração por pasta, outro apoio da mesma pasta), ou o campo \`por\` com o teste que o carrega por caminho calculado; passe a declaração para \`semChamador\` com o motivo, ou escreva \`por\`.`);
    }
  }
  for (const d of declarados) {
    const alvo = d.arquivo ?? d.pasta;
    if (typeof d.motivo !== 'string' || d.motivo.trim().length < 8) problemas.push(`${REGISTRO}: recebido ${alvo} em \`semChamador\` sem motivo; esperado o motivo de ele ficar sem chamador; escreva o campo \`motivo\`.`);
    if (d.por !== undefined && !carregadorVale(d.por)) problemas.push(`${REGISTRO}: recebido \`por\` ${JSON.stringify(d.por)} em ${alvo}, de \`semChamador\`; esperado o caminho de um arquivo vivo (com chamador, e que não é teste) que carrega o módulo por caminho calculado; corrija o campo, ou tire-o e escreva outro motivo.`);
    if (/caminho calculado/.test(d.motivo ?? '') && d.por === undefined) problemas.push(`${REGISTRO}: recebido o motivo "carregado por caminho calculado" em ${alvo} sem o campo \`por\`; esperado \`por\` com o caminho do carregador vivo; escreva o campo.`);
    conferirDeclaracao(d, 'semChamador');
  }
  if (leiame !== null) {
    const esperado = gerarLeiame(registro);
    if (leiame.replace(/\r\n/g, '\n') !== esperado) problemas.push(`${LEIAME}: recebido um texto diferente do que ${REGISTRO} gera; esperado o arquivo gerado, sem edição à mão; rode \`npm run ferramentas:registro:gerar\`.`);
  }
  return { problemas, linhasDeComando, modulos, semChamador, chamadores: quem };
}

export function resumoDosChamadores(c) {
  const partes = [];
  if (c.comando?.length) partes.push(`comando ${c.comando.join(', ')}`);
  for (const [nome, chave] of [['CI', 'ci'], ['importa', 'importa'], ['cita', 'cita'], ['skill', 'skill'], ['configuração', 'config'], ['teste', 'teste'], ['documento', 'doc']]) {
    if (c[chave]?.length) partes.push(`${nome} ${c[chave].slice(0, 3).join(', ')}${c[chave].length > 3 ? ` e mais ${c[chave].length - 3}` : ''}`);
  }
  return partes.join('; ') || 'ninguém';
}

/* Acerta o registro com a árvore: entra o que falta (frase semeada do cabeçalho, para revisar), saem as entradas órfãs, os
   comandos seguem package.json, a declaração por pasta ganha a lista dos arquivos de agora e a declaração de arquivo que
   sumiu ou ganhou chamador sai. Frase, tipo e motivo já escritos não mudam. */
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
  const { semChamador: mortos } = modulosSemChamador(quem, arquivos, registro?.semChamador ?? []);
  const listas = listasDasPastas([...(registro?.apoioDeTeste ?? []), ...(registro?.semChamador ?? [])], mortos);
  const acertar = (lista) => (lista ?? [])
    .filter((d) => d.pasta || mortos.includes(d.arquivo))
    .map((d) => (d.pasta ? { ...d, arquivos: listas.get(d) } : d))
    .filter((d) => !d.pasta || d.arquivos.length);
  return { ferramentas, apoioDeTeste: acertar(registro?.apoioDeTeste), semChamador: acertar(registro?.semChamador) };
}

/* Uma entrada por linha, e na declaração por pasta um arquivo por linha: a junção de dois ramos que mexem em entradas
   diferentes não conflita. */
export function serializarRegistro(registro) {
  const linha = (o) => {
    if (!o.pasta) return `    ${JSON.stringify(o)}`;
    const { arquivos: lista = [], ...resto } = o;
    return `    ${JSON.stringify(resto).slice(0, -1)},"arquivos":[\n${lista.map((a) => `      ${JSON.stringify(a)}`).join(',\n')}\n    ]}`;
  };
  const bloco = (nome, lista) => `  "${nome}": [\n${(lista ?? []).map(linha).join(',\n')}\n  ]`;
  return `{\n${bloco('ferramentas', registro.ferramentas)},\n${bloco('apoioDeTeste', registro.apoioDeTeste)},\n${bloco('semChamador', registro.semChamador)}\n}\n`;
}

/* O README é curto de propósito: a tabela é só das ferramentas de uso, que é o que se procura; as de gate e as internas vão
   pelo nome, e a frase de cada uma está no registro. Os títulos não trazem contagem e cada lista tem um item por linha, para
   que dois ramos que acrescentam ferramentas diferentes não conflitem. */
export function gerarLeiame(registro) {
  const doTipo = (tipo) => registro.ferramentas.filter((e) => e.tipo === tipo);
  const curto = (caminho) => caminho.replace(/^tools\//, '');
  const comandoDe = (e) => (e.comandos.length ? e.comandos.map((c) => `\`${c}\``).join(', ') : `\`node ${e.arquivo}\``);
  const itens = (lista) => lista.map((e) => `- \`${curto(e.arquivo)}\``);
  const saida = [
    '# tools/ — as ferramentas do Modelar',
    '',
    `Gerado de \`${REGISTRO}\` por \`npm run ferramentas:registro:gerar\`; não edite à mão. O registro tem uma entrada por ferramenta de linha de comando desta pasta (o arquivo, os comandos de \`package.json\`, o que faz e o tipo), e \`npm run ferramentas:registro:check\` recusa a que ficar de fora, a entrada sem arquivo e o módulo sem chamador. Ferramenta nova nasce na pasta do assunto dela (\`tools/modelar/\` para peça e bancada, \`tools/mapa/\` para documento e processo, \`tools/gates/\` para a bateria), responde a \`--ajuda\` e ganha entrada no registro. As regras de quem muda esta pasta estão em \`tools/CLAUDE.md\`.`,
    '',
    '## De uso',
    '',
    'Quem trabalha chama, com `npm run <comando> -- <argumentos>`; a que não tem comando roda pelo arquivo.',
    '',
    '| Comando | O que faz |',
    '|---|---|',
    ...doTipo('uso').map((e) => `| ${comandoDe(e)} | ${e.faz.replace(/\|/g, '\\|')} |`),
    '',
    '## De gate',
    '',
    'A bateria (`npm run gates`) ou o CI chama, e cada uma roda sozinha para conferir uma coisa só.',
    '',
    ...itens(doTipo('gate')),
    '',
    '## Internas',
    '',
    'Outra ferramenta chama.',
    '',
    ...itens(doTipo('interna')),
    '',
  ];
  const declaracao = (d) => (d.pasta ? `- \`${curto(d.pasta)}\`, a pasta` : `- \`${curto(d.arquivo)}\``);
  if (registro.apoioDeTeste?.length) {
    saida.push('## Apoio de teste', '', 'Só os testes usam; a conferência exige que algum teste importe cada um.', '', ...registro.apoioDeTeste.map(declaracao), '');
  }
  if (registro.semChamador?.length) {
    saida.push('## Sem chamador, declarados', '', 'Nenhum comando, import de ferramenta viva, skill ou configuração chama o que está abaixo; o motivo de cada um ficar vem depois dos dois pontos.', '', ...registro.semChamador.map((d) => `${declaracao(d)}: ${d.motivo}${d.por ? `, por \`${curto(d.por)}\`` : ''}`), '');
  }
  return saida.join('\n');
}

/* A árvore de verdade: todo arquivo de texto que o git rastreia ou ainda não rastreia (fora o ignorado), com o conteúdo, e a
   lista dos não rastreados. Os nomes vêm separados por `\0`, que é como o git entrega sem escapar nome com acento ou espaço. */
export function lerArvore(raiz = REPO) {
  const listar = (...opcoes) => execFileSync('git', ['ls-files', '-z', ...opcoes], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).split('\0').filter(Boolean);
  const naoRastreados = new Set(listar('-o', '--exclude-standard'));
  const arquivos = {};
  for (const rel of [...listar('-c'), ...naoRastreados]) {
    if (!new RegExp(`\\.(${EXTENSOES}|html|md|yml|yaml|json|toml)$`).test(rel)) continue;
    if ((rel.startsWith('tools/fixtures/') && !E_TESTE.test(rel)) || rel.startsWith('docs/modelar/banco-de-provas/') || rel === 'package-lock.json') continue;
    if (rel.endsWith('.json') && !['package.json', '.mcp.json', REGISTRO].includes(rel) && !rel.startsWith('.claude/')) continue;
    const caminho = path.join(raiz, rel);
    if (!existsSync(caminho)) continue;
    arquivos[rel] = readFileSync(caminho, 'utf8');
  }
  return { arquivos, naoRastreados };
}

function executar(args) {
  if (args.includes('--ajuda') || args.includes('--help')) { console.log(AJUDA); return 0; }
  const { arquivos, naoRastreados } = lerArvore();
  const scripts = JSON.parse(arquivos['package.json']).scripts;
  const gates = gatesDoTexto(arquivos['tools/gates.mjs']);
  const caminhoDoRegistro = path.join(REPO, REGISTRO);
  const lido = existsSync(caminhoDoRegistro) ? lerRegistro(readFileSync(caminhoDoRegistro, 'utf8')) : { registro: { ferramentas: [], apoioDeTeste: [], semChamador: [] }, problema: null };
  const opcaoChamadores = args.find((a) => a === '--chamadores' || a.startsWith('--chamadores='));
  if (opcaoChamadores) {
    const quem = chamadores(arquivos, scripts);
    const alvo = opcaoChamadores.split('=')[1];
    if (alvo && !quem[alvo]) { console.error(`recebido ${alvo}; esperado um módulo de tools/ (fora de tools/fixtures/ e de teste); confira o caminho desde a raiz.`); return 1; }
    for (const m of alvo ? [alvo] : Object.keys(quem)) console.log(`${m}: ${resumoDosChamadores(quem[m])}`);
    return 0;
  }
  if (lido.problema) { console.error(`registro de ferramentas: 1 recusa(s)\n\n  - ${lido.problema}`); return 1; }
  const registro = lido.registro;
  if (args.includes('--gerar')) {
    const novo = atualizarRegistro({ arquivos, scripts, registro, gates });
    writeFileSync(caminhoDoRegistro, serializarRegistro(novo), 'utf8');
    writeFileSync(path.join(REPO, LEIAME), gerarLeiame(novo), 'utf8');
    const entraram = novo.ferramentas.filter((n) => !registro.ferramentas.some((e) => e.arquivo === n.arquivo)).length;
    console.log(`${REGISTRO}: ${novo.ferramentas.length} ferramentas (${entraram} novas), ${novo.apoioDeTeste.length} declarações de apoio de teste e ${novo.semChamador.length} de sem chamador; ${LEIAME} regravado.`);
    return 0;
  }
  if (args.includes('--check')) {
    const caminhoDoLeiame = path.join(REPO, LEIAME);
    const { problemas, linhasDeComando, modulos, semChamador } = conferirRegistro({ arquivos, scripts, registro, gates, naoRastreados, leiame: existsSync(caminhoDoLeiame) ? readFileSync(caminhoDoLeiame, 'utf8') : '' });
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
  process.exitCode = executar(process.argv.slice(2));
}
