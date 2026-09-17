/* imagens-da-peca.js — as imagens que moram na pasta da peça, servidas pelo Vite.
 *
 * O PROBLEMA QUE ISTO RESOLVE. A foto que a bancada sobrepõe ao modelo morava em
 * `public/`, copiada para lá porque é a única pasta que o Vite publica sem
 * ninguém importar. Isso a desligava da peça: o único arquivo que a citava era
 * `sessao-ativa.json`, que é estado local e não é versionado, então a imagem
 * existia no repositório sem que nada dissesse de quem era.
 *
 * Com a peça em pasta, a imagem mora ao lado da receita. Para o navegador
 * enxergá-la, o Vite precisa saber que ela existe em tempo de construção — é o
 * que `import.meta.glob` com `?url` faz: ele emite cada arquivo como recurso e
 * devolve o endereço final, com hash, tanto no servidor de desenvolvimento
 * quanto no pacote publicado. Sem isso a página funcionaria em desenvolvimento e
 * quebraria no endereço publicado, que é o defeito que teste de unidade não
 * pega.
 */

const IMAGENS = import.meta.glob(
  '../../../prototipos/procedural/v3/pecas/**/referencias/*.{png,jpg,jpeg,webp,svg}',
  { query: '?url', import: 'default', eager: true },
);

/* AS RECEITAS DE ENSAIO TAMBÉM TÊM IMAGEM, e precisam ter: `guarda:referencia`
   confere que a imagem declarada pela peça vira plano na cena, com textura e
   tamanho, e sem uma peça de ensaio com imagem própria essa guarda só teria
   conteúdo do acervo para provar em cima. Duas raízes, a mesma regra de chave. */
const IMAGENS_DE_ENSAIO = import.meta.glob(
  '../../../tools/fixtures/acervo/**/referencias/*.{png,jpg,jpeg,webp,svg}',
  { query: '?url', import: 'default', eager: true },
);

const RAIZES = [
  '../../../prototipos/procedural/v3/pecas/',
  '../../../tools/fixtures/acervo/',
];

/* A chave é o caminho da imagem a partir da PASTA DA PEÇA, que é exatamente
   como a receita a declara em `PLANO.referencias`. */
function indexar(entradas) {
  const porPeca = new Map();
  for (const [caminho, url] of Object.entries(entradas)) {
    const raiz = RAIZES.find((r) => caminho.startsWith(r));
    if (!raiz) continue;
    const resto = caminho.slice(raiz.length);
    const barra = resto.indexOf('/');
    if (barra < 0) continue;
    const peca = resto.slice(0, barra);
    const relativo = resto.slice(barra + 1);
    if (!porPeca.has(peca)) porPeca.set(peca, new Map());
    porPeca.get(peca).set(relativo, url);
  }
  return porPeca;
}

/* As duas raízes juntas, e num lugar só: deixar cada função montar a sua fazia
   `urlDaReferencia` continuar enxergando apenas o acervo depois de
   `imagensDaPeca` já enxergar as duas, e a peça de ensaio abria sem imagem sem
   ninguém errar nada visível. */
const TODAS = { ...IMAGENS, ...IMAGENS_DE_ENSAIO };

export function imagensDaPeca(peca, entradas = TODAS) {
  return indexar(entradas).get(peca) ?? new Map();
}

/**
 * O endereço servível de uma referência declarada, ou `null` quando a peça não
 * está em pasta ou a imagem não é imagem. Devolver `null` em silêncio é
 * proposital: referência ausente já reprova em `guarda:acervo`, e a bancada não
 * deve inventar um segundo veredito sobre o mesmo arquivo.
 */
export function urlDaReferencia(peca, referencia, entradas = TODAS) {
  return imagensDaPeca(peca, entradas).get(String(referencia ?? '').trim()) ?? null;
}
