/* resolver-caminho-receita.mjs — localizador flexível de receitas com confinamento seguro */
import { existsSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const REPO = resolve(HERE, '../..');

const PASTAS_BUSCA = [
  '',
  'prototipos/procedural/v3/pecas',
  'prototipos/procedural/v3/maquinas',
];

function caminhoArquivoValido(p) {
  try {
    if (!existsSync(p)) return null;
    const st = statSync(p);
    if (st.isFile()) return p;
    if (st.isDirectory()) {
      const montagem = join(p, 'montagem.js');
      if (existsSync(montagem) && statSync(montagem).isFile()) return montagem;
      const index = join(p, 'index.js');
      if (existsSync(index) && statSync(index).isFile()) return index;
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
