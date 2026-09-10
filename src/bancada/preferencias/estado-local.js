/* estado-local.js — preferências persistentes e locais da apresentação da bancada. */

const CHAVE_PREFERENCIAS = 'mecanifica.bancada.preferencias';
const PADRAO = Object.freeze({ grade: true, chao: true });

function normalizar(valor) {
  if (!valor || typeof valor !== 'object') return { ...PADRAO };
  return {
    grade: typeof valor.grade === 'boolean' ? valor.grade : PADRAO.grade,
    chao: typeof valor.chao === 'boolean' ? valor.chao : PADRAO.chao,
  };
}

export function criarPreferenciasBancada({ armazenamento = globalThis.localStorage } = {}) {
  function ler() {
    try {
      return normalizar(JSON.parse(armazenamento?.getItem(CHAVE_PREFERENCIAS) ?? 'null'));
    } catch {
      return { ...PADRAO };
    }
  }

  function salvar(parcial) {
    const proximo = normalizar({ ...ler(), ...parcial });
    armazenamento?.setItem(CHAVE_PREFERENCIAS, JSON.stringify(proximo));
    return proximo;
  }

  return { ler, salvar };
}
