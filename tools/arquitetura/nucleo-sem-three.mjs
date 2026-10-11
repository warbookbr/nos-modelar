/* nucleo-sem-three.mjs — o núcleo de autoria é independente de Three.js.
 *
 * É o primeiro invariante do CLAUDE.md que virou teste. A regra vale para o que roda headless, em terminal e em
 * integração contínua: o núcleo procedural (`procedural/nucleo/`), as receitas (`procedural/pecas/`), as extensões e os
 * serviços de `procedural/`, os módulos (`modulos/`) e a autoria (`src/autoria/`). Three.js entra só no adaptador de
 * inspeção, que converte o neutro para a bancada, e na bancada (`src/bancada/`), que a fronteira da bancada
 * (`npm run bancada:fronteira:check`) já separa da autoria. O texto de `docs/mecanifica/ARQUITETURA.md` diz o mesmo: o
 * núcleo "resolve parâmetros, topologia, identidades, portas, materiais declarados e malha neutra sem conhecer Three.js".
 *
 * A metade "e do domínio automotivo" do invariante não se confere por máquina: o que é caso especial de carro depende do
 * sentido do código, não de um import.
 *
 * Uma importação fora da lista de exceções reprova, e a mensagem diz o arquivo, a linha e a regra. A lista de exceções
 * guarda o motivo de cada arquivo, e o teste recusa a exceção que não existe mais ou que deixou de importar Three.js,
 * para ela não virar passe livre.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(fileURLToPath(new URL('../..', import.meta.url)));

export const PASTAS_DO_NUCLEO = [
  'procedural/nucleo', 'procedural/pecas', 'procedural/extensoes', 'procedural/familias', 'procedural/servicos', 'modulos', 'src/autoria',
];

/* Os arquivos dessas pastas que conhecem Three.js de propósito, e por quê. */
export const EXCECOES = new Map([
  ['src/autoria/adaptar-three.js', 'o adaptador de inspeção: converte a malha neutra para a cena do Three.js'],
  ['src/autoria/adaptar-montagem-three.js', 'o adaptador de inspeção da montagem: o mesmo papel, para a árvore de instâncias'],
  ['src/autoria/cor-de-auditoria.test.mjs', 'confere a cor de auditoria contra a conversão HSL do próprio Three.js'],
]);

const EXTENSOES = /\.(?:[cm]?js|jsx|tsx?)$/;
const IMPORTA_THREE = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]three(?:\/[^'"]*)?['"]/;

function arquivosDe(pasta, raiz) {
  const saida = [];
  if (!existsSync(pasta)) return saida;
  for (const entrada of readdirSync(pasta, { withFileTypes: true })) {
    if (entrada.name === 'node_modules') continue;
    const caminho = join(pasta, entrada.name);
    if (entrada.isDirectory()) saida.push(...arquivosDe(caminho, raiz));
    else if (EXTENSOES.test(entrada.name)) saida.push(relative(raiz, caminho).split('\\').join('/'));
  }
  return saida;
}

/* As linhas do texto que importam Three.js, fora de comentário: [{ linha, trecho }]. */
export function importacoesDeThree(texto) {
  const achadas = [];
  texto.split('\n').forEach((linha, i) => {
    const t = linha.trim();
    if (t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return;
    if (IMPORTA_THREE.test(linha)) achadas.push({ linha: i + 1, trecho: t });
  });
  return achadas;
}

/* Os arquivos do núcleo que importam Three.js sem estar na lista de exceções, cada um com a regra que quebra. */
export function verificarNucleoSemThree(raiz = RAIZ, { pastas = PASTAS_DO_NUCLEO, excecoes = EXCECOES } = {}) {
  const problemas = [];
  for (const arquivo of pastas.flatMap((p) => arquivosDe(join(raiz, p), raiz))) {
    if (excecoes.has(arquivo)) continue;
    for (const { linha, trecho } of importacoesDeThree(readFileSync(join(raiz, arquivo), 'utf8'))) {
      problemas.push(`${arquivo}:${linha}: importa Three.js (${trecho}). O núcleo de autoria é independente de Three.js: leve o que precisa dele para o adaptador (src/autoria/adaptar-three.js) ou para a bancada (src/bancada/), ou, se o arquivo é um adaptador, registre-o em EXCECOES de tools/arquitetura/nucleo-sem-three.mjs com o motivo.`);
    }
  }
  return problemas;
}

/* As exceções que não valem mais: o arquivo sumiu ou deixou de importar Three.js. */
export function excecoesVelhas(raiz = RAIZ, excecoes = EXCECOES) {
  return [...excecoes.keys()].filter((arquivo) => !existsSync(join(raiz, arquivo)) || importacoesDeThree(readFileSync(join(raiz, arquivo), 'utf8')).length === 0);
}
