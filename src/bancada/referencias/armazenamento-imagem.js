/* armazenamento-imagem.js — persistência local de uma imagem de referência por alvo. */

function criarBancoDoNavegador(indexedDB = globalThis.indexedDB) {
  let abertura = null;

  function abrir() {
    if (!abertura) {
      abertura = new Promise((resolve, reject) => {
        const pedido = indexedDB.open('mecanifica-bancada', 1);
        pedido.onupgradeneeded = () => pedido.result.createObjectStore('imagens-referencia');
        pedido.onsuccess = () => resolve(pedido.result);
        pedido.onerror = () => reject(pedido.error);
      });
    }
    return abertura;
  }

  async function transacionar(modo, acao) {
    const banco = await abrir();
    return new Promise((resolve, reject) => {
      const transacao = banco.transaction('imagens-referencia', modo);
      const pedido = acao(transacao.objectStore('imagens-referencia'));
      pedido.onsuccess = () => resolve(pedido.result ?? null);
      pedido.onerror = () => reject(pedido.error);
    });
  }

  return {
    put: (chave, valor) => transacionar('readwrite', (store) => store.put(valor, chave)),
    get: (chave) => transacionar('readonly', (store) => store.get(chave)),
    delete: (chave) => transacionar('readwrite', (store) => store.delete(chave)),
  };
}

export function criarArmazenamentoImagem({ banco = criarBancoDoNavegador() } = {}) {
  return {
    async salvar(alvoId, registro) {
      if (!alvoId) throw new TypeError('imagem de referência: alvo obrigatório.');
      await banco.put(alvoId, registro);
      return registro;
    },
    async ler(alvoId) {
      if (!alvoId) return null;
      return (await banco.get(alvoId)) ?? null;
    },
    async remover(alvoId) {
      if (!alvoId) return;
      await banco.delete(alvoId);
    },
  };
}
