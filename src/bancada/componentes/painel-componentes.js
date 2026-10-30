/* painel-componentes.js — o painel da esquerda: a lista das partes da peça com a marca da seleção, o filtro, o nome da peça e o recolher.
 *
 * Lê do estado central `partes` (a lista, refeita a cada modelo), `selecao` (a fotografia do controlador), `rotuloPeca`
 * e `aguardandoModelo`. Escreve na peça só pelas ações que recebe: `selecionar` e `limpar`. */
import { formatarNome } from '../formatar.js';

export function montarPainelComponentes({
  elementos, estado, selecionar, limpar, aoRecolher, janela = globalThis,
}) {
  const { lista, filtro, resumoFiltro, fixtureAtual, contagem, btnLimpar, recolher } = elementos;

  function aplicarFiltroPartes() {
    const termo = filtro?.value.trim().toLocaleLowerCase('pt-BR') ?? '';
    let visiveis = 0;
    const linhas = lista.querySelectorAll('.parte-linha');
    for (const linha of linhas) {
      const nome = linha.querySelector('.nome')?.textContent?.toLocaleLowerCase('pt-BR') ?? '';
      const corresponde = !termo || nome.includes(termo);
      linha.hidden = !corresponde;
      if (corresponde) visiveis += 1;
    }
    if (resumoFiltro) {
      resumoFiltro.textContent = termo ? `${visiveis} de ${linhas.length} componentes` : `${linhas.length} componentes`;
    }
  }

  function desenharPartes(partes) {
    lista.replaceChildren();
    for (const { nome, pai, faces } of partes) {
      const botao = lista.ownerDocument.createElement('button');
      botao.type = 'button';
      botao.className = 'parte-linha';
      botao.dataset.parte = nome;
      botao.setAttribute('aria-pressed', 'false');
      botao.innerHTML = `
        <span class="check" aria-hidden="true"></span>
        <span class="nome">${formatarNome(nome)}${pai ? ` <small>de ${formatarNome(pai)}</small>` : ''}</span>
        <span class="faces">${faces}F</span>
      `;
      botao.addEventListener('click', () => selecionar(nome));
      lista.append(botao);
    }
    /* O contador redondo do cabeçalho dizia o mesmo número que "N componentes"
       logo abaixo. Some da bancada; o harness de captura ainda tem o elemento e
       continua sendo alimentado. */
    if (contagem) contagem.textContent = String(partes.length);
    if (filtro) filtro.value = '';
    aplicarFiltroPartes();
  }

  function marcarSelecao(selecao) {
    const selecionadas = new Set(selecao.selecionadas);
    for (const linha of lista.querySelectorAll('.parte-linha')) {
      const ativa = selecionadas.has(linha.dataset.parte);
      linha.classList.toggle('ativa', ativa);
      linha.setAttribute('aria-pressed', String(ativa));
      linha.querySelector('.check').textContent = ativa ? '✓' : '';
    }
  }

  estado.assinar(['partes', 'selecao', 'rotuloPeca', 'aguardandoModelo'], (valores, mudadas) => {
    if (mudadas.includes('rotuloPeca') || mudadas.includes('aguardandoModelo')) {
      const texto = valores.rotuloPeca ?? (valores.aguardandoModelo ? 'Aguardando modelo…' : null);
      if (texto !== null) fixtureAtual.textContent = texto;
    }
    if (mudadas.includes('partes') && valores.partes) desenharPartes(valores.partes);
    if (mudadas.includes('selecao') && valores.selecao) marcarSelecao(valores.selecao);
  });

  filtro?.addEventListener('input', aplicarFiltroPartes);
  /* `/` leva ao filtro de qualquer lugar da bancada que não seja um campo de texto. */
  janela.addEventListener('keydown', (evento) => {
    const alvo = evento.target;
    const campoEditavel = alvo instanceof janela.HTMLInputElement
      || alvo instanceof janela.HTMLTextAreaElement
      || alvo instanceof janela.HTMLSelectElement
      || alvo?.isContentEditable;
    if (evento.key === '/' && !campoEditavel) {
      evento.preventDefault();
      filtro?.focus();
    }
  });
  btnLimpar.addEventListener('click', () => limpar());
  montarRecolher(recolher, { aoRecolher });

  return { aplicarFiltroPartes };
}

/* Recolher esconde o corpo do painel e deixa a aba de borda. Nada do estado
   do painel é reinicializado: seleção, aba ativa e listas continuam onde
   estavam, e reabrir devolve a mesma tela. A seta aponta para onde o painel
   vai, e o painel da esquerda recolhe para a esquerda. */
export function montarRecolher({ botao, painel }, { aoRecolher }) {
  if (!botao || !painel) return;
  const seta = botao.querySelector('[aria-hidden="true"]');
  const paraDentro = painel.classList.contains('painel-partes') ? '‹' : '›';
  const paraFora = painel.classList.contains('painel-partes') ? '›' : '‹';
  botao.addEventListener('click', () => {
    const recolhido = painel.classList.toggle('recolhido');
    botao.setAttribute('aria-expanded', String(!recolhido));
    if (seta) seta.textContent = recolhido ? paraFora : paraDentro;
    aoRecolher?.();
  });
}
