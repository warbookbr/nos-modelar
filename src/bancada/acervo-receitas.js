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

/* AS RECEITAS DE ENSAIO TAMBÉM ENTRAM, e é por elas que as guardas de navegador
   abrem a bancada. O resolvedor da CLI já busca em `tools/fixtures/acervo/` pelo
   mesmo motivo escrito lá: essas receitas existem para dar assunto estável aos
   testes, e ficam fora do acervo justamente para que trabalho de peça não mexa
   no que a suíte mede. A varredura da bancada não as via, então guarda de
   navegador só tinha conteúdo do acervo para abrir, e passou a depender dele.
   Elas vêm marcadas, para quem listar poder separar ensaio de acervo. */
const ENSAIOS = import.meta.glob('../../tools/fixtures/acervo/**/*.js');

/* Três formas convivem no acervo: peça de arquivo único, `quadro.js`, peça em
   pasta, `peca-de-prova/receita.js`, e montagem em pasta,
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

/* DUAS LISTAS, E NÃO UMA. `listarAcervo` continua sendo o ACERVO, porque é o
   que as ferramentas que medem o acervo esperam dela — juntar ensaio aqui fez a
   varredura de parâmetros saltar de 96 declarados para 102, contando requisito
   de fixture como parâmetro de peça. Quem precisa dos dois é só a bancada, que
   tem de poder abrir a peça de prova, e por isso quem junta é
   `listarParaBancada`. */
export function listarParaBancada(modulos = MODULOS, ensaios = ENSAIOS) {
  return ordenar([...listarAcervo(modulos), ...listarAcervo(ensaios, { ensaio: true })]);
}

function ordenar(entradas) {
  return entradas.sort((a, b) => a.id.localeCompare(b.id, 'pt-BR'));
}

export function listarAcervo(modulos = MODULOS, { ensaio = false } = {}) {
  const entradas = [];
  for (const [caminho, importar] of Object.entries(modulos ?? {})) {
    if (/\.(test|spec)\.js$/.test(caminho)) continue;
    const { id, montagem } = identificar(caminho);
    entradas.push({
      id,
      montagem,
      ensaio,
      caminho,
      carregar: () => importar().then((modulo) => modulo.default ?? modulo),
    });
  }
  return ordenar(entradas);
}
