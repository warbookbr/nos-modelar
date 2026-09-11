/* resolver-caminho-receita.mjs — localizador flexível de receitas com confinamento seguro */
import { existsSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '../..');

/* Toda pasta de receita do repositorio, nao so as duas primeiras que alguem
   precisou. O acervo publicado vive em `prototipos/procedural/v3/`; as receitas
   de `tools/fixtures/acervo/` existem para dar assunto estavel aos testes de
   ferramenta, que precisam de cadeira parametrizada, chapa furada e prensa
   montada para provar sensibilidade, resolucao por nome e exportacao
   multiparte. Elas ficam fora do acervo justamente para que trabalho de peca
   nao mexa no que a suite mede, e ficam alcancaveis pelo nome curto porque
   varios desses testes exercitam a propria resolucao por nome. */
export const PASTAS_BUSCA = [
  '',
  'prototipos/procedural/v3/pecas',
  'prototipos/procedural/v3/maquinas',
  'prototipos/procedural/v3/armas',
  'prototipos/procedural/v3/extensoes',
  'tools/fixtures/acervo',
];

function caminhoArquivoValido(p) {
  try {
    if (!existsSync(p)) return null;
    const st = statSync(p);
    if (st.isFile()) return p;
    if (st.isDirectory()) {
      /* `receita.js` e a entrada da PASTA DA PECA: a peca passa a ser um
         diretorio com receita, referencias e rodadas juntas, e a identidade
         dela vira o nome da pasta. Vem primeiro porque uma peca que tambem
         publica montagem deve abrir pela receita, que e o que se modela.
         `montagem.js` e `index.js` continuam para as montagens em pasta que ja
         existem; duas formas convivem enquanto houver ocupante das duas. */
      for (const entrada of ['receita.js', 'montagem.js', 'index.js']) {
        const candidato = join(p, entrada);
        if (existsSync(candidato) && statSync(candidato).isFile()) return candidato;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function resolverCaminhoReceita(alvo, { raiz = REPO } = {}) {
  if (!alvo || typeof alvo !== 'string') {
    throw new Error('Informe o nome ou caminho da receita.');
  }

  const limpo = alvo.trim();
  const variacoesNome = limpo.endsWith('.js') ? [limpo] : [limpo, `${limpo}.js`];

  for (const pasta of PASTAS_BUSCA) {
    for (const nome of variacoesNome) {
      const candidato = isAbsolute(nome)
        ? resolve(nome)
        : resolve(raiz, pasta, nome);

      const rel = relative(raiz, candidato);
      if (rel.startsWith('..') || isAbsolute(rel)) {
        throw new Error(`Confinamento violado: o caminho '${alvo}' aponta para fora do repositório.`);
      }

      const arquivo = caminhoArquivoValido(candidato);
      if (arquivo) {
        return arquivo;
      }
    }
  }

  throw new Error(`Receita '${alvo}' não encontrada como arquivo direto ou em prototipos/procedural/v3/{pecas,maquinas}/.`);
}
