/* aba-anotacoes.js — a aba Anotações do painel da direita: a lista das anotações da sessão, com editar e excluir, e os dois jeitos de anotar, geral e no ponto da malha.
 *
 * Lê do estado central `anotacoes`, que a sessão escreve a cada entrega. Quem guarda e envia a anotação é o
 * sincronizador da sessão, e quem põe o ponto na malha é o gerenciador das anotações 3D; os dois chegam aqui prontos. */

export function montarAbaAnotacoes({
  elementos, estado, canvas, anotacoes3D, sincronizador, modeloEmCena, avisar, perguntar = (texto) => globalThis.prompt(texto),
}) {
  const { lista, btnAdicionarGeral, btnAdicionarNaMalha } = elementos;

  function renderizarListaAnotacoes(anotacoes) {
    const listaEl = lista;
    if (!listaEl) return;
    listaEl.replaceChildren();
    const documento = listaEl.ownerDocument;

    if (!Array.isArray(anotacoes) || anotacoes.length === 0) {
      const msg = documento.createElement('p');
      msg.className = 'sem-parametros';
      msg.textContent = 'Nenhuma anotação registrada nesta sessão.';
      listaEl.appendChild(msg);
      return;
    }

    for (const an of anotacoes) {
      const item = documento.createElement('div');
      item.className = 'item-anotacao';
      item.dataset.id = an.id;

      const temPonto3D = Array.isArray(an.posicao) && an.posicao.length === 3;
      const tipoTag = temPonto3D
        ? '<span class="tag-anotacao tag-3d">3D</span>'
        : '<span class="tag-anotacao tag-geral">Geral</span>';

      item.innerHTML = `
        <div class="item-anotacao-cabecalho">
          <div class="item-anotacao-info">
            ${tipoTag}
            <span>${an.autor || 'Operador'} · ${an.componente || 'Geral'}</span>
          </div>
          <div class="item-anotacao-acoes">
            <button type="button" class="btn-acao-anotacao btn-editar-anotacao" title="Editar anotação">Editar</button>
            <button type="button" class="btn-acao-anotacao excluir btn-excluir-anotacao" title="Excluir anotação">✕</button>
          </div>
        </div>
        <p class="item-anotacao-texto"></p>
        <div class="item-anotacao-editor" hidden>
          <textarea></textarea>
          <div class="item-anotacao-editor-botoes">
            <button type="button" class="botao texto btn-cancelar-edicao">Cancelar</button>
            <button type="button" class="botao primaria btn-salvar-edicao">Salvar</button>
          </div>
        </div>
      `;

      const textoEl = item.querySelector('.item-anotacao-texto');
      textoEl.textContent = an.texto;

      const editorEl = item.querySelector('.item-anotacao-editor');
      const textareaEl = editorEl.querySelector('textarea');
      const btnEditar = item.querySelector('.btn-editar-anotacao');
      const btnExcluir = item.querySelector('.btn-excluir-anotacao');
      const btnSalvar = item.querySelector('.btn-salvar-edicao');
      const btnCancelar = item.querySelector('.btn-cancelar-edicao');

      btnEditar.addEventListener('click', () => {
        textareaEl.value = an.texto;
        textoEl.hidden = true;
        editorEl.hidden = false;
        textareaEl.focus();
      });

      btnCancelar.addEventListener('click', () => {
        editorEl.hidden = true;
        textoEl.hidden = false;
      });

      btnSalvar.addEventListener('click', () => {
        const novoTexto = textareaEl.value.trim();
        if (novoTexto && novoTexto !== an.texto) {
          sincronizador()?.editarAnotacao(an.id, novoTexto);
          avisar('Anotação atualizada.');
        } else {
          editorEl.hidden = true;
          textoEl.hidden = false;
        }
      });

      btnExcluir.addEventListener('click', () => {
        sincronizador()?.excluirAnotacao(an.id);
        avisar('Anotação excluída.');
      });

      listaEl.appendChild(item);
    }
  }

  /* A sessão escreve um invólucro novo a cada entrega, e a lista é redesenhada
     em toda entrega, mesmo com as mesmas anotações. */
  estado.assinar(['anotacoes'], (valores) => renderizarListaAnotacoes(valores.anotacoes?.lista));

  btnAdicionarGeral?.addEventListener('click', () => {
    const texto = perguntar('Digite sua anotação ou instrução geral para a IA:');
    if (texto && texto.trim()) {
      sincronizador()?.enviarAnotacao({
        texto: texto.trim(),
        componente: 'Geral',
        posicao: null,
      });
      avisar('Anotação geral registrada para a IA.');
    }
  });

  btnAdicionarNaMalha?.addEventListener('click', () => {
    anotacoes3D.ativarModoAdicionar(true);
    avisar('Clique na superfície 3D onde deseja adicionar a nota.');
  });

  canvas.addEventListener('click', (evento) => {
    const modelo = modeloEmCena();
    if (anotacoes3D.isModoAdicionar() && modelo) {
      anotacoes3D.tratarCliqueCanvas(evento, [modelo.raiz]);
    }
  });

  return { renderizarListaAnotacoes };
}
