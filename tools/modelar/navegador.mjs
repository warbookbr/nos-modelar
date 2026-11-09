/* navegador.mjs — os argumentos e o lançamento do Chromium sem tela que as capturas da bancada, do esboço e do contorno usam.
 *
 * OS ARGUMENTOS. `--use-gl=swiftshader` é o que o Chromium fixado pelo Playwright do projeto (headless shell 1194) aceita para
 * desenhar WebGL sem placa de vídeo. O 1243, o que vem instalado nos contêineres de sessão em /opt/pw-browsers, ignora esse
 * argumento e só cria o contexto WebGL pelo ANGLE com o SwiftShader liberado: medido em 2026-11-09, quatro lançamentos com os
 * argumentos antigos deram 0 contextos de 4, e com `--use-angle=swiftshader --enable-unsafe-swiftshader` deram 4 de 4, no headless
 * shell 1243 e no Chromium completo 1243. Era a causa da captura do esboço que falhava "de forma intermitente" (atrito 2 da
 * empilhadeira): a página só desenhava quando o Chromium caía sozinho num contexto de software. Os dois conjuntos vão juntos,
 * e com eles os dois Chromium desenham.
 *
 * O LANÇAMENTO. O Playwright procura o Chromium da versão que ele fixa; quando ela não está instalada (o contêiner tem outra), o
 * lançamento recusa com "Executable doesn't exist" e quem conduz precisava montar um apelido com PLAYWRIGHT_BROWSERS_PATH.
 * `lancarChromium` tenta o lançamento normal e, só nessa recusa, o Chromium de `PLAYWRIGHT_CHROMIUM`, o headless shell de
 * /opt/pw-browsers ou /opt/pw-browsers/chromium, o primeiro que existir. No CI, que instala a versão fixada, o lançamento é o mesmo de antes. */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export const ARGUMENTOS_DO_CHROMIUM = Object.freeze([
  '--use-gl=swiftshader', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-webgl', '--ignore-gpu-blocklist',
]);

export const CHROMIUM_ALTERNATIVO = '/opt/pw-browsers/chromium';

/* O headless shell do contêiner vem antes do Chromium completo: com o completo, `page.screenshot` recusou a captura sob a carga
   dos testes rápidos ("Unable to capture screenshot"), e o headless shell é o que o Playwright usa sem tela. */
function alternativos() {
  const lista = [];
  if (process.env.PLAYWRIGHT_CHROMIUM) lista.push(process.env.PLAYWRIGHT_CHROMIUM);
  try {
    for (const pasta of readdirSync('/opt/pw-browsers').filter((n) => n.startsWith('chromium_headless_shell-')).sort().reverse()) {
      lista.push(join('/opt/pw-browsers', pasta, 'chrome-headless-shell-linux64', 'chrome-headless-shell'));
    }
  } catch { /* sem /opt/pw-browsers */ }
  lista.push(CHROMIUM_ALTERNATIVO);
  return lista.filter((c) => existsSync(c));
}

/** Lança o Chromium com os argumentos das capturas; sem a versão fixada instalada, usa o Chromium do contêiner. */
export async function lancarChromium(chromium, opcoes = {}) {
  const pedido = { ...opcoes, args: [...ARGUMENTOS_DO_CHROMIUM, ...(opcoes.args ?? [])] };
  try {
    return await chromium.launch(pedido);
  } catch (erro) {
    const [alternativo] = alternativos();
    if (opcoes.executablePath || !/Executable doesn't exist/i.test(String(erro?.message)) || !alternativo) throw erro;
    return chromium.launch({ ...pedido, executablePath: alternativo });
  }
}
