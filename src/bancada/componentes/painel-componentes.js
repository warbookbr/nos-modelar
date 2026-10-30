/* painel-componentes.js — o painel da esquerda: a árvore das partes da peça com a marca da seleção, o isolar e o ocultar de cada linha, o filtro, o nome da peça e o recolher.
 *
 * Lê do estado central `partes` (a lista, refeita a cada modelo), `selecao` (a fotografia do controlador), `ocultas`,
 * `rotuloPeca` e `aguardandoModelo`. Escreve na peça só pelas ações que recebe: `selecionar`, `limpar`, `isolar` e
 * `alternarOculta`. A árvore é plana, como as receitas a declaram, e não mostra contagens internas como o número de
 * faces de cada parte: isso é medida, e a medida da parte escolhida aparece no cartão da seleção. */
import { formatarNome } from '../formatar.js';

export function montarPainelComponentes({
  elementos, estado, selecionar, limpar, isolar = () => {}, alternarOculta = () => {}, aoRecolher, janela = globalThis,
}) {
  const { lista, filtro, resumoFiltro, resumoSelecao, fixtureAtual, contagem, btnLimpar, recolher } = elementos;

  function aplicarFiltroPartes() {
    const termo = filtro?.value.trim().toLocaleLowerCase('pt-BR') ?? '';
    let visiveis = 0;
    const linhas = lista.querySelectorAll('.parte-linha');
    for (const linha of linhas) {
      const nome = linha.querySelector('.parte-nome')?.textContent?.toLocaleLowerCase('pt-BR') ?? '';
      const corresponde = !termo || nome.includes(termo);
      linha.hidden = !corresponde;
      if (corresponde) visiveis += 1;
    }
    if (resumoFiltro) {
      resumoFiltro.textContent = termo ? `${visiveis} de ${linhas.length} partes` : `${linhas.length} partes`;
    }
  }

  function desenharPartes(partes) {
    lista.replaceChildren();
    for (const { nome, pai } of partes) {
      const linha = lista.ownerDocument.createElement('div');
      linha.className = 'parte-linha';
      linha.dataset.parte = nome;
      linha.innerHTML = `
        <button type="button" class="parte-nome" aria-pressed="false">${formatarNome(nome)}${pai ? ` <small>de ${formatarNome(pai)}</small>` : ''}</button>
        <button type="button" class="acao-linha" data-acao="isolar" aria-pressed="false" title="Isolar"><svg class="icone" aria-hidden="true"><use href="#i-isolar"></use></svg></button>
        <button type="button" class="acao-linha" data-acao="ocultar" aria-pressed="false" title="Ocultar"><svg class="icone" aria-hidden="true"><use href="#i-olho"></use></svg></button>
      `;
      linha.querySelector('.parte-nome').addEventListener('click', () => selecionar(nome));
      linha.querySelector('[data-acao="isolar"]').addEventListener('click', () => isolar(nome));
      linha.querySelector('[data-acao="ocultar"]').addEventListener('click', () => alternarOculta(nome));
      lista.append(linha);
    }
    /* O contador redondo do cabeçalho dizia o mesmo número que "N componentes"
       logo abaixo. Some da bancada; o harness de captura ainda tem o elemento e
       continua sendo alimentado. */
    if (contagem) contagem.textContent = String(partes.length);
    if (filtro) filtro.value = '';
    aplicarFiltroPartes();
  }

  function marcarSelecao(selecao, ocultas) {
    const selecionadas = new Set(selecao?.selecionadas ?? []);
    const escondidas = new Set(ocultas);
    const isolada = selecao?.modo === 'isolar';
    for (const linha of lista.querySelectorAll('.parte-linha')) {
      const nome = linha.dataset.parte;
      const ativa = selecionadas.has(nome);
      linha.classList.toggle('ativa', ativa);
      linha.classList.toggle('oculta', escondidas.has(nome));
      linha.querySelector('.parte-nome').setAttribute('aria-pressed', String(ativa));
      linha.querySelector('[data-acao="isolar"]').setAttribute('aria-pressed', String(ativa && isolada));
      const ocultar = linha.querySelector('[data-acao="ocultar"]');
      ocultar.setAttribute('aria-pressed', String(escondidas.has(nome)));
      ocultar.title = escondidas.has(nome) ? 'Mostrar' : 'Ocultar';
      ocultar.querySelector('use')?.setAttribute('href', escondidas.has(nome) ? '#i-olho-fechado' : '#i-olho');
    }
    if (resumoSelecao) {
      const quantas = selecionadas.size;
      resumoSelecao.textContent = `${quantas} ${quantas === 1 ? 'selecionada' : 'selecionadas'}`;
    }
  }

  estado.assinar(['partes', 'selecao', 'ocultas', 'rotuloPeca', 'aguardandoModelo'], (valores, mudadas) => {
    if (mudadas.includes('rotuloPeca') || mudadas.includes('aguardandoModelo')) {
      const texto = valores.rotuloPeca ?? (valores.aguardandoModelo ? 'Aguardando modelo…' : null);
      if (texto !== null) fixtureAtual.textContent = texto;
    }
    if (mudadas.includes('partes') && valores.partes) desenharPartes(valores.partes);
    if (['partes', 'selecao', 'ocultas'].some((chave) => mudadas.includes(chave))) marcarSelecao(valores.selecao, valores.ocultas);
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
