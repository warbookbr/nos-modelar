/* caminho-repositorio.mjs — resolução portátil e confinada de repo://. */
import { existsSync, lstatSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

function falhar(mensagem) { throw new Error(`caminho-repositorio: ${mensagem}`); }

function internoDe(localizador) {
  if (typeof localizador !== 'string' || !localizador.startsWith('repo://')) {
    falhar('localizador precisa começar com repo://.');
  }
  const interno = localizador.slice('repo://'.length);
  if (!interno || interno.startsWith('/') || interno.includes('\\') || interno.split('/').includes('..')
    || !/^[A-Za-z0-9._/-]+$/.test(interno)) {
    falhar('localizador repo:// precisa ser caminho relativo canônico.');
  }
  return interno;
}

function dentroDaRaiz(raiz, candidato) {
  const relativo = relative(raiz, candidato);
  return relativo !== '' && !relativo.startsWith('..') && !isAbsolute(relativo);
}

/**
 * Resolve uma evidência `repo://` sem depender do separador do sistema.
 * Rejeita travessia lexical, escape após resolução de symlink/junction e tudo
 * que não seja arquivo regular. O caminho devolvido é sempre o realpath.
 */
export function resolverEvidenciaDoRepositorio(localizador, raizRepositorio) {
  const interno = internoDe(localizador);
  let raiz;
  try { raiz = realpathSync(raizRepositorio); } catch { falhar('não conseguiu resolver a raiz do repositório.'); }
  const candidato = resolve(raiz, interno);
  if (!dentroDaRaiz(raiz, candidato)) falhar('evidência escapa da raiz do repositório.');
  if (!existsSync(candidato)) falhar('evidência ausente.');
  let real;
  try { real = realpathSync(candidato); } catch { falhar('evidência não pode ser resolvida.'); }
  if (!dentroDaRaiz(raiz, real)) falhar('evidência aponta symlink ou junction fora da raiz.');
  try {
    if (!lstatSync(candidato).isFile() && !statSync(real).isFile()) falhar('evidência precisa ser arquivo regular.');
  } catch { falhar('evidência precisa ser arquivo regular.'); }
  return real;
}
