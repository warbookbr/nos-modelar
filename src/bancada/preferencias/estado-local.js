/* estado-local.js — preferências persistentes e locais da apresentação da bancada. */

const CHAVE_PREFERENCIAS = 'mecanifica.bancada.preferencias';
/* O CHÃO NASCE DESLIGADO. Ele é um plano opaco em y=0, e a imagem de referência
   é outro plano: vista de cima, a foto fica de perfil e o chão cobre o pouco que
   dela apareceria. Quem abre a bancada para conferir a peça contra uma foto
   perdia tempo descobrindo que o interruptor existia. A grade continua ligada
   porque ela é linha, não superfície, e não esconde nada. */
const PADRAO = Object.freeze({ grade: true, chao: false });

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
