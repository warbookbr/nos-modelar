/* atalhos.js — catálogo de comandos de teclado da bancada, com persistência
   local e recusa de colisão.
 *
 * A regra que sustenta o módulo é uma só: atalho ocupado não muda de dono em
 * silêncio. Quem tenta atribuir recebe o nome do comando que já usa a tecla e
 * nenhuma associação se move. Sem isso, remapear uma vista desliga o
 * enquadramento sem aviso, e quem usa conclui que a bancada travou.
 *
 * O módulo não conhece Three.js nem o DOM da página: ele guarda a tabela de
 * comando para combinação, resolve o caminho inverso e diz quando um evento de
 * teclado não deve virar atalho. Quem liga isso a botão e a cena é o `main`. */

const CHAVE_ATALHOS = 'mecanifica.bancada.atalhos';

/* Tecla que sozinha não é atalho: segurar Shift não pode disparar comando. */
const SO_MODIFICADOR = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock']);

/* Dígito com Shift chega como símbolo dependente do layout — `!` num teclado e
   outra coisa em outro. `code` é estável, então a combinação com Shift usa o
   dígito de `code` e não o caractere que o navegador entregou. */
function teclaEstavel(evento) {
  const { key, code } = evento ?? {};
  if (typeof code === 'string' && /^Digit[0-9]$/.test(code)) return code.slice(5);
  return typeof key === 'string' ? key : '';
}

export function normalizarCombinacao(evento) {
  if (!evento || typeof evento !== 'object') return null;
  const { key, shiftKey } = evento;
  if (typeof key !== 'string' || key.length === 0) return null;
  if (SO_MODIFICADOR.has(key)) return null;

  const base = teclaEstavel(evento);
  if (base.length === 0) return null;
  const normal = base.length === 1 ? base.toLowerCase() : base;
  return shiftKey ? `Shift+${normal}` : normal;
}

/* Texto vindo da interface, e não de evento: aceita 'q', 'F' ou 'Shift+1'. */
function normalizarTexto(valor) {
  if (typeof valor !== 'string') return null;
  const limpo = valor.trim();
  if (limpo.length === 0) return null;
  const [prefixo, resto] = limpo.startsWith('Shift+')
    ? ['Shift+', limpo.slice('Shift+'.length)]
    : ['', limpo];
  if (resto.length === 0 || SO_MODIFICADOR.has(resto)) return null;
  return `${prefixo}${resto.length === 1 ? resto.toLowerCase() : resto}`;
}

function normalizarCombinacaoQualquer(valor) {
  return typeof valor === 'string' ? normalizarTexto(valor) : normalizarCombinacao(valor);
}

export function criarRegistroAtalhos({ padrao = {}, armazenamento = globalThis.localStorage } = {}) {
  const base = Object.freeze({ ...padrao });
  let capturando = false;

  function guardado() {
    try {
      const bruto = JSON.parse(armazenamento?.getItem(CHAVE_ATALHOS) ?? 'null');
      if (!bruto || typeof bruto !== 'object') return {};
      /* Só sobrevive o que ainda é comando conhecido: comando removido do
         código não pode continuar segurando uma tecla. */
      const limpo = {};
      for (const [comando, combinacao] of Object.entries(bruto)) {
        if (!(comando in base)) continue;
        const normal = normalizarTexto(combinacao);
        if (normal) limpo[comando] = normal;
      }
      return limpo;
    } catch {
      return {};
    }
  }

  function obter() {
    return { ...base, ...guardado() };
  }

  function comandoDaCombinacao(valor) {
    const alvo = normalizarCombinacaoQualquer(valor);
    if (!alvo) return null;
    const atual = obter();
    for (const [comando, combinacao] of Object.entries(atual)) {
      if (combinacao === alvo) return comando;
    }
    return null;
  }

  function atribuir(comando, valor) {
    if (!(comando in base)) return { ok: false, motivo: 'comando-desconhecido', comando };
    const combinacao = normalizarCombinacaoQualquer(valor);
    if (!combinacao) return { ok: false, motivo: 'combinacao-invalida' };

    const ocupante = comandoDaCombinacao(combinacao);
    if (ocupante && ocupante !== comando) {
      return { ok: false, motivo: 'ocupado', comandoOcupante: ocupante };
    }

    const proximo = { ...guardado(), [comando]: combinacao };
    armazenamento?.setItem(CHAVE_ATALHOS, JSON.stringify(proximo));
    return { ok: true, combinacao };
  }

  function restaurarPadroes() {
    armazenamento?.setItem(CHAVE_ATALHOS, JSON.stringify({}));
    return { ...base };
  }

  /* Enquanto a captura está aberta, a tecla pertence a ela e não à cena. O
     mesmo vale para campo de texto: digitar 'f' numa busca não pode enquadrar. */
  function deveIgnorar(alvo) {
    if (capturando) return true;
    if (!alvo || typeof alvo !== 'object') return false;
    if (alvo.isContentEditable === true) return true;
    const tag = typeof alvo.tagName === 'string' ? alvo.tagName.toUpperCase() : '';
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
  }

  return {
    obter,
    atribuir,
    restaurarPadroes,
    comandoDaCombinacao,
    deveIgnorar,
    iniciarCaptura() { capturando = true; },
    cancelarCaptura() { capturando = false; },
    get capturando() { return capturando; },
  };
}
