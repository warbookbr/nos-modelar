/* recusas-exercitadas.mjs — confere que cada recusa de entrada das fontes vigiadas tem um teste que a exercita.
 *
 * Medido em 2026-11-14 (revisão das verificações, passo 2): 49 recusas e `throw` de entrada de `subdivisao`, `friso`, `espelha` e
 * `contatos-da-peca` foram tirados, um a um, sem que nenhum teste reprovasse, e mais 30 linhas de `parametros.mjs` e `procedural.mjs`
 * (limites do schema, códigos de saída, paginação). Uma recusa que nenhum teste exercita é uma recusa que o próximo refator tira sem
 * ninguém ver, e o processo não tinha como acusar a recusa nova sem teste.
 *
 * COMO CONFERE, SEM RODAR TESTE. Cada fonte vigiada é lida por texto. Uma recusa é a mensagem de um `grita(...)`, de um `throw new X(...)`,
 * de um `erro: ...` ou de um `erroAcionavel(...)`; o texto fixo da mensagem (o que sobra dela sem os `${...}`) é a identidade da recusa.
 * Ela está exercitada quando algum arquivo de teste do repositório traz um trecho de 14 caracteres desse texto fixo (o pedaço inteiro, se
 * for mais curto), que é o que um teste escreve quando confere a mensagem por `toMatch`, `toBe` ou `toThrow`. O gate não prova que o
 * teste reprova sem a recusa (isso é a medida por estrago, que custa minutos por arquivo); prova que a recusa não ficou sem teste que
 * a cite, e é o que falta para uma recusa nova não entrar calada.
 *
 * EXCEÇÕES. A recusa sem entrada que a alcance (defesa que outra recusa mais cedo já cobre) entra em `SEM_ENTRADA_QUE_ALCANCE`, com o
 * motivo escrito; a exceção que deixa de fazer falta (a recusa já tem teste) também falha, para a lista não envelhecer.
 * Uso: `node tools/gates/recusas-exercitadas.mjs`; sai com 1 e lista cada recusa sem teste. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** As fontes vigiadas. `trecho` limita a leitura a um intervalo de linhas pelo texto de abertura e o de fechamento (a operação `espelha` mora num arquivo de muitas operações). */
export const FONTES_VIGIADAS = [
  { arquivo: 'procedural/nucleo/operacoes/subdivisao.js' },
  { arquivo: 'procedural/nucleo/operacoes/friso.js' },
  { arquivo: 'procedural/nucleo/operacoes/transformacoes.js', trecho: { de: /^ {2}espelha\(st, a, i\) \{/, ate: /^ {2}\/\* arranja \(O-13\)/ } },
  { arquivo: 'src/autoria/contatos-da-peca.js' },
  { arquivo: 'tools/mcp/perfis/parametros.mjs' },
  { arquivo: 'tools/mcp/perfis/procedural.mjs' },
];

/** `arquivo`, depois o texto fixo da mensagem (o mesmo que o gate imprime): o motivo de cada exceção é obrigatório. */
export const SEM_ENTRADA_QUE_ALCANCE = {
  'procedural/nucleo/operacoes/friso.js: graus a perna atravessa a dobra; reduza o ângulo ou a largura': 'as duas recusas (a da aba na chapa e a da variação) guardam o perfil de aba que se cruza, e `perfilDaAba` recusa antes, por baixo da chapa: dos 2238 perfis válidos varridos em 2026-11-14 (espessura, raio, largura e ângulo), nenhum se cruza',
  'procedural/nucleo/operacoes/transformacoes.js: não foi possível criar a cópia estrutural: face ou vértice-fonte inexistente': 'a origem resolvida só devolve faces vivas com os vértices vivos; a defesa fica para o dia em que a resolução deixar de garantir isso',
  'procedural/nucleo/operacoes/friso.js: ; o friso lê a borda como o passo da abertura a deixou': 'ainda sem teste: exige uma abertura por contorno cuja borda de fora `ladoDaBorda` não resolve, e as fixtures de abertura do repositório têm todas a borda resolvida',
  'procedural/nucleo/operacoes/friso.js: não cita nenhum ponto desta linha': 'ainda sem teste: exige uma variação cujo ponto está na linha mas não em nenhuma das cadeias que a simetria separa, e a conferência anterior (o ponto precisa estar na linha) recusa antes nas fixtures de hoje',
};

const PASTAS_DE_TESTE = ['procedural', 'src', 'tools', 'modulos'];
const JANELA = 20;
const MINIMO_DO_TEXTO = 12;

function arquivosDeTeste(raiz, pasta, achados = []) {
  const dir = join(raiz, pasta);
  if (!existsSync(dir)) return achados;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const caminho = join(pasta, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules' && e.name !== '.git') arquivosDeTeste(raiz, caminho, achados); }
    else if (/\.test\.(m?js|ts)$/.test(e.name)) achados.push(caminho);
  }
  return achados;
}

/** Os literais de texto de um trecho, com o texto fixo de cada um: os `${...}` de um template saem e quebram o texto em pedaços. */
function literaisDe(texto) {
  const achados = [];
  let k = 0;
  while (k < texto.length) {
    const c = texto[k];
    if (c === "'" || c === '"' || c === '`') {
      let j = k + 1; let atual = ''; const pedacos = [];
      while (j < texto.length && texto[j] !== c) {
        if (texto[j] === '\\') { atual += texto[j + 1] ?? ''; j += 2; continue; }
        if (c === '`' && texto[j] === '$' && texto[j + 1] === '{') {
          pedacos.push(atual); atual = '';
          j = ateFecharChave(texto, j + 1);
          continue;
        }
        atual += texto[j]; j += 1;
      }
      pedacos.push(atual);
      achados.push({ inicio: k, pedacos });
      k = j + 1;
    } else if (c === '/' && texto[k + 1] === '/') { while (k < texto.length && texto[k] !== '\n') k += 1; }
    else if (c === '/' && texto[k + 1] === '*') { const f = texto.indexOf('*/', k + 2); k = f < 0 ? texto.length : f + 2; }
    else k += 1;
  }
  return achados;
}

/** A posição logo depois da chave que fecha a que abre em `abre`, pulando os literais de dentro. */
function ateFecharChave(texto, abre) {
  let nivel = 0; let j = abre;
  while (j < texto.length) {
    const c = texto[j];
    if (c === "'" || c === '"' || c === '`') {
      const q = c; j += 1;
      while (j < texto.length && texto[j] !== q) {
        if (texto[j] === '\\') j += 2;
        else if (q === '`' && texto[j] === '$' && texto[j + 1] === '{') j = ateFecharChave(texto, j + 1);
        else j += 1;
      }
      j += 1; continue;
    }
    if (c === '{') nivel += 1;
    else if (c === '}') { nivel -= 1; if (nivel === 0) return j + 1; }
    j += 1;
  }
  return j;
}

/** O texto entre os parênteses que abrem em `abre`, pulando literais e comentários; null se não fecham. */
function ateFecharParenteses(texto, abre) {
  let nivel = 0; let k = abre;
  while (k < texto.length) {
    const c = texto[k];
    if (c === "'" || c === '"' || c === '`') {
      const q = c; k += 1;
      while (k < texto.length && texto[k] !== q) {
        if (texto[k] === '\\') k += 2;
        else if (q === '`' && texto[k] === '$' && texto[k + 1] === '{') k = ateFecharChave(texto, k + 1);
        else k += 1;
      }
      k += 1; continue;
    }
    if (c === '(') nivel += 1;
    else if (c === ')') { nivel -= 1; if (nivel === 0) return texto.slice(abre + 1, k); }
    k += 1;
  }
  return null;
}

/** As recusas de um texto de fonte: `{ linha, texto }`, em que `texto` é o maior pedaço fixo da maior mensagem da chamada. */
export function recusasDoTexto(fonte) {
  const recusas = [];
  const gatilhos = /\b(?:grita|erroAcionavel)\(|\bthrow new \w+\(|\berro:\s*\[?|\bmensagem:\s*/g;
  for (const m of fonte.matchAll(gatilhos)) {
    const antes = fonte.slice(fonte.lastIndexOf('\n', m.index) + 1, m.index);
    if (/^\s*(\/\*|\*|\/\/)/.test(antes)) continue;
    if (/\bfunction\s+\w*$/.test(antes)) continue;
    const abre = m[0].endsWith('(') ? m.index + m[0].length - 1 : null;
    let corpo;
    if (abre !== null) corpo = ateFecharParenteses(fonte, abre);
    else { const fim = fonte.indexOf('\n', m.index); corpo = fonte.slice(m.index + m[0].length, fim < 0 ? fonte.length : fim); }
    if (corpo === null) continue;
    const pedacos = literaisDe(corpo).flatMap((l) => l.pedacos).map((p) => p.trim());
    const textos = [...new Set(pedacos.filter((p) => p.length >= MINIMO_DO_TEXTO))].sort((a, b) => b.length - a.length);
    if (!textos.length) continue;
    recusas.push({ linha: fonte.slice(0, m.index).split('\n').length, texto: textos[0], textos });
  }
  return recusas;
}

/** Algum pedaço fixo da mensagem aparece em algum teste? Um trecho de `JANELA` caracteres basta; pedaço mais curto vale inteiro. */
function citada(textos, testes) {
  for (const texto of textos) {
    const janela = Math.min(JANELA, texto.length);
    for (let k = 0; k + janela <= texto.length; k += 1) {
      const trecho = texto.slice(k, k + janela);
      if (testes.some((t) => t.includes(trecho))) return true;
    }
  }
  return false;
}

export function conferirRecusasExercitadas({ raiz = RAIZ, fontes = FONTES_VIGIADAS, excecoes = SEM_ENTRADA_QUE_ALCANCE } = {}) {
  const falhas = [];
  const testes = PASTAS_DE_TESTE.flatMap((p) => arquivosDeTeste(raiz, p)).map((a) => readFileSync(join(raiz, a), 'utf8'));
  const vistas = new Set();
  for (const { arquivo, trecho } of fontes) {
    const caminho = join(raiz, arquivo);
    if (!existsSync(caminho)) { falhas.push(`${arquivo}: fonte vigiada não existe; tire-a de FONTES_VIGIADAS ou corrija o caminho`); continue; }
    let texto = readFileSync(caminho, 'utf8');
    let deslocamento = 0;
    if (trecho) {
      const linhas = texto.split('\n');
      const de = linhas.findIndex((l) => trecho.de.test(l));
      const ate = de < 0 ? -1 : linhas.findIndex((l, k) => k > de && trecho.ate.test(l));
      if (de < 0 || ate < 0) { falhas.push(`${arquivo}: o trecho vigiado não foi achado; ajuste \`trecho\` em FONTES_VIGIADAS`); continue; }
      texto = linhas.slice(de, ate).join('\n'); deslocamento = de;
    }
    for (const { linha, texto: fixo, textos } of recusasDoTexto(texto)) {
      const chave = `${arquivo}: ${fixo}`;
      vistas.add(chave);
      const exercitada = citada(textos, testes);
      if (Object.hasOwn(excecoes, chave)) {
        if (exercitada) falhas.push(`${arquivo}:${linha + deslocamento}: a exceção "${fixo}" já tem teste que a cita; tire-a de SEM_ENTRADA_QUE_ALCANCE`);
        else if (!String(excecoes[chave]).trim()) falhas.push(`${arquivo}:${linha + deslocamento}: a exceção "${fixo}" não diz o motivo`);
        continue;
      }
      if (!exercitada) falhas.push(`${arquivo}:${linha + deslocamento}: a recusa "${fixo.length > 90 ? `${fixo.slice(0, 87)}...` : fixo}" não tem teste que a exercite; escreva o teste que passa a entrada ruim e confere a mensagem`);
    }
  }
  for (const chave of Object.keys(excecoes)) if (!vistas.has(chave)) falhas.push(`${chave}: a exceção não corresponde a nenhuma recusa das fontes vigiadas; tire-a de SEM_ENTRADA_QUE_ALCANCE`);
  return falhas;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const falhas = conferirRecusasExercitadas();
  if (falhas.length) {
    console.error(`recusas-exercitadas: ${falhas.length} falha(s)\n${falhas.map((f) => `  - ${f}`).join('\n')}`);
    process.exitCode = 1;
  } else {
    const n = FONTES_VIGIADAS.length;
    console.log(`recusas-exercitadas: ${n} fontes vigiadas, toda recusa tem teste que a cita (${Object.keys(SEM_ENTRADA_QUE_ALCANCE).length} exceções)`);
  }
}
