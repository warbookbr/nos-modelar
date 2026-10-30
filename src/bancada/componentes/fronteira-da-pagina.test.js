/* fronteira-da-pagina.test.js — só os componentes tocam a página: `main.js` e os módulos de estado, cena e sessão não procuram elemento, não ouvem a janela nem leem o endereço.
 *
 * É a régua do gate 7 do plano das visões e da interface da bancada. O que ela procura, fora dos comentários, é o acesso
 * direto à página: `document`, `window`, `location`, `history`, `navigator` e `globalThis`, ouvir ou parar de ouvir
 * evento, pedir quadro ao navegador, `prompt` e `new Image`. Quem precisa disso recebe de um componente uma função que
 * o faz. Os módulos antigos da bancada que já eram componentes de uma área (o painel das referências, os punhos, a
 * edição de malha, o ambiente) ficam fora desta lista. */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const BANCADA = join(dirname(fileURLToPath(import.meta.url)), '..');

const SEM_ACESSO_A_PAGINA = [
  'main.js',
  'formatar.js',
  'estado/estado-central.js',
  'cena/peca-em-cena.js',
  'cena/edicao-da-peca.js',
  'cena/vista-da-cena.js',
  'controles/comandos.js',
  'sessao/sessao-da-bancada.js',
  'referencias/imagem-na-cena.js',
];

const ACESSO = /\b(?:document|window|location|history|navigator|globalThis)\b|\b(?:addEventListener|removeEventListener|requestAnimationFrame|cancelAnimationFrame|prompt)\s*\(|\bnew\s+Image\s*\(/g;

/** O código sem os comentários, para a régua não acusar a palavra dita em prosa. */
function semComentarios(texto) {
  return texto.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

function acessosDiretos(texto) {
  return [...semComentarios(texto).matchAll(ACESSO)].map(([trecho]) => trecho);
}

describe('fronteira da página', () => {
  it('a régua acha o acesso no código e ignora o que está em comentário', () => {
    expect(acessosDiretos("/* window.__x */ const a = 1; // document.body\nlocation.href;")).toEqual(['location']);
    expect(acessosDiretos('canvas.addEventListener("click", f); requestAnimationFrame(f);')).toEqual(['addEventListener(', 'requestAnimationFrame(']);
  });

  it.each(SEM_ACESSO_A_PAGINA)('%s não toca a página', (arquivo) => {
    expect(acessosDiretos(readFileSync(join(BANCADA, arquivo), 'utf8'))).toEqual([]);
  });
});
