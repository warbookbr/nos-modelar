/* acervo-receitas.js — lista as receitas do acervo para a bancada abrir.
 *
 * Isto NÃO é o catálogo homologado. `catalogo-pecas.js` guarda o que foi
 * validado e publicado, e continua sendo decisão escrita à mão. O acervo é o
 * que está em trabalho: toda receita que existe em
 * `prototipos/procedural/v3/pecas/`, que é justamente o que alguém quer abrir
 * enquanto modela. Peça nova aparece aqui sozinha, sem ninguém registrar.
 *
 * A varredura é do Vite e acontece na construção, então cada receita vira um
 * importador preguiçoso: nenhuma delas entra no pacote inicial da página, e só
 * é baixada quando alguém escolhe abri-la.
 */

const MODULOS = import.meta.glob('../../prototipos/procedural/v3/pecas/**/*.js');

/* Três formas convivem no acervo: peça de arquivo único, `quadro.js`, peça em
   pasta, `bicicleta-quadro/receita.js`, e montagem em pasta,
   `prensa/montagem.js`. Nos três casos o nome que a pessoa reconhece é o mesmo
   que o resolvedor de receita aceita, e nos dois últimos ele é o nome da PASTA
   — a identidade da peça deixa de ser o nome do arquivo. */
const ENTRADAS_DE_PASTA = new Set(['receita', 'montagem', 'index']);

function identificar(caminho) {
  const partes = caminho.split('/');
  const arquivo = partes[partes.length - 1].replace(/\.js$/, '');
  if (ENTRADAS_DE_PASTA.has(arquivo) && partes.length >= 2) {
    return { id: partes[partes.length - 2], montagem: arquivo === 'montagem' };
  }
  return { id: arquivo, montagem: false };
}

export function listarAcervo(modulos = MODULOS) {
  const entradas = [];
  for (const [caminho, importar] of Object.entries(modulos)) {
    if (/\.(test|spec)\.js$/.test(caminho)) continue;
    const { id, montagem } = identificar(caminho);
    entradas.push({
      id,
      montagem,
      caminho,
      carregar: () => importar().then((modulo) => modulo.default ?? modulo),
    });
  }
  entradas.sort((a, b) => a.id.localeCompare(b.id, 'pt-BR'));
  return entradas;
}
