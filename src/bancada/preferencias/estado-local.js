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

  /* A escrita também é protegida: numa janela privada ou com o armazenamento
     cheio o `setItem` lança, e a preferência vale para a página aberta mesmo
     sem ficar guardada. */
  function salvar(parcial) {
    const proximo = normalizar({ ...ler(), ...parcial });
    try {
      armazenamento?.setItem(CHAVE_PREFERENCIAS, JSON.stringify(proximo));
    } catch {
      /* fica só nesta página */
    }
    return proximo;
  }

  return { ler, salvar };
}

const CHAVE_VISAO = 'mecanifica.bancada.visao';
const CHAVE_TEMA = 'mecanifica.bancada.tema';

/* Uma escolha entre opções conhecidas, guardada numa chave própria: o que foi
   guardado e deixou de valer volta ao padrão, em vez de prender a bancada numa
   opção que ela não sabe mais desenhar. */
function criarPreferenciaDeEscolha({ chave, armazenamento, conhecidas, padrao }) {
  const validas = new Set(conhecidas);
  const normalizar = (valor) => (typeof valor === 'string' && validas.has(valor) ? valor : padrao);

  function ler() {
    try {
      return normalizar(JSON.parse(armazenamento?.getItem(chave) ?? 'null'));
    } catch {
      return padrao;
    }
  }

  function salvar(valor) {
    const proxima = normalizar(valor);
    try {
      armazenamento?.setItem(chave, JSON.stringify(proxima));
    } catch {
      /* fica só nesta página */
    }
    return proxima;
  }

  return { ler, salvar };
}

/* A VISÃO ESCOLHIDA (sólida, arame, raio X...) volta na próxima vez que a
   bancada abrir. Fica numa chave própria, e não junto da grade e do chão,
   porque quem decide se uma visão existe é o registro de visões: `conhecidas`
   diz quais valem, e um nome guardado que deixou de valer volta ao padrão em
   vez de prender a bancada numa visão que ela não sabe desenhar. */
export function criarPreferenciaDeVisao({
  armazenamento = globalThis.localStorage,
  conhecidas = [],
  padrao = 'solida',
} = {}) {
  return criarPreferenciaDeEscolha({ chave: CHAVE_VISAO, armazenamento, conhecidas, padrao });
}

/* O TEMA ESCOLHIDO (Foco, Bancada ou Revisão) também volta entre sessões, pela
   mesma regra: quem diz quais temas existem é `temas/temas.js`. */
export function criarPreferenciaDeTema({
  armazenamento = globalThis.localStorage,
  conhecidos = [],
  padrao = 'foco',
} = {}) {
  return criarPreferenciaDeEscolha({ chave: CHAVE_TEMA, armazenamento, conhecidas: conhecidos, padrao });
}
