/* busca-de-comandos.js — a busca de comandos da bancada: abre com Ctrl+K (ou ⌘K) e pelo campo da barra, filtra as ações, os comandos de teclado e as partes pelo que a pessoa digita, e executa com Enter ou clique.
 *
 * A lista sai de `itensDaBusca` a cada tecla, com as fontes lidas na hora (`fontes()`), então o interruptor da grade e
 * o tema marcado mostram o valor de agora. O teclado é ouvido na captura da janela: com a busca aberta, as setas, o
 * Enter e o Esc são dela, e o Esc não chega à cena, onde ele limpa a seleção. O Ctrl+K também não chega ao teclado da
 * bancada, que leria nele o K da curvatura. */
import { formatarTecla } from '../formatar.js';
import { itensDaBusca } from '../controles/itens-da-busca.js';

export function montarBuscaDeComandos({ elementos, fontes, janela = globalThis }) {
  const { caixa, entrada, resultados, gatilhos = [] } = elementos;
  if (!caixa || !entrada || !resultados) return { abrir() {}, fechar() {}, get aberta() { return false; } };
  const documento = resultados.ownerDocument;
  let visiveis = [];
  let foco = 0;
  let quemAbriu = null;

  function desenhar() {
    const grupos = itensDaBusca({ termo: entrada.value, ...fontes() });
    visiveis = grupos.flatMap(({ itens }) => itens);
    foco = Math.min(foco, Math.max(0, visiveis.length - 1));
    let indice = 0;
    resultados.replaceChildren(...grupos.flatMap(({ grupo, itens }) => {
      const titulo = documento.createElement('h4');
      titulo.className = 'grupo-busca';
      titulo.textContent = grupo;
      return [titulo, ...itens.map((item) => {
        const meu = indice;
        indice += 1;
        const botao = documento.createElement('button');
        botao.type = 'button';
        botao.className = 'item-busca';
        botao.dataset.item = item.id;
        botao.setAttribute('role', 'option');
        botao.setAttribute('aria-selected', String(meu === foco));
        const nome = documento.createElement('span');
        nome.className = 'nome-item';
        nome.textContent = item.rotulo;
        botao.append(nome);
        if (item.valor !== null && item.valor !== undefined) {
          const valor = documento.createElement('span');
          valor.className = 'valor-item';
          valor.textContent = item.valor;
          botao.append(valor);
        }
        if (item.ligado !== null) {
          const interruptor = documento.createElement('span');
          interruptor.className = 'interruptor';
          interruptor.setAttribute('aria-checked', String(item.ligado));
          interruptor.setAttribute('role', 'switch');
          botao.append(interruptor);
        }
        if (item.escolhido !== null) {
          const marca = documento.createElement('span');
          marca.className = 'marca-escolha';
          marca.setAttribute('role', 'radio');
          marca.setAttribute('aria-checked', String(item.escolhido));
          marca.textContent = item.escolhido ? '✓' : '';
          botao.append(marca);
        }
        if (item.tecla) {
          const tecla = documento.createElement('kbd');
          tecla.textContent = formatarTecla(item.tecla);
          botao.append(tecla);
        }
        botao.addEventListener('click', () => executar(meu));
        return botao;
      })];
    }));
    if (!visiveis.length) {
      const vazio = documento.createElement('p');
      vazio.className = 'vazio-busca';
      vazio.textContent = 'Nada encontrado.';
      resultados.append(vazio);
    }
  }

  function marcarFoco() {
    resultados.querySelectorAll('.item-busca').forEach((botao, indice) => {
      botao.setAttribute('aria-selected', String(indice === foco));
      if (indice === foco) botao.scrollIntoView?.({ block: 'nearest' });
    });
  }

  function abrir() {
    quemAbriu = documento.activeElement ?? null;
    entrada.value = '';
    foco = 0;
    caixa.hidden = false;
    for (const gatilho of gatilhos) gatilho.setAttribute('aria-expanded', 'true');
    desenhar();
    entrada.focus();
  }

  function fechar() {
    if (caixa.hidden) return;
    caixa.hidden = true;
    for (const gatilho of gatilhos) gatilho.setAttribute('aria-expanded', 'false');
    entrada.blur?.();
    quemAbriu?.focus?.();
    quemAbriu = null;
  }

  /* Fecha antes de executar: o que o item abre (uma janela, um painel) não pode nascer debaixo da busca. */
  function executar(indice) {
    const item = visiveis[indice];
    fechar();
    item?.executar();
  }

  entrada.addEventListener('input', () => {
    foco = 0;
    desenhar();
  });
  for (const gatilho of gatilhos) gatilho.addEventListener('click', () => (caixa.hidden ? abrir() : fechar()));
  for (const fundo of caixa.querySelectorAll('[data-fechar-busca]')) fundo.addEventListener('click', () => fechar());

  janela.addEventListener('keydown', (evento) => {
    const tecla = typeof evento.key === 'string' ? evento.key.toLowerCase() : '';
    if (tecla === 'k' && (evento.ctrlKey || evento.metaKey) && !evento.altKey && !evento.shiftKey) {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      if (caixa.hidden) abrir(); else fechar();
      return;
    }
    if (caixa.hidden) return;
    if (evento.key === 'Escape') {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      fechar();
    } else if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      if (!visiveis.length) return;
      foco = (foco + (evento.key === 'ArrowDown' ? 1 : -1) + visiveis.length) % visiveis.length;
      marcarFoco();
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      executar(foco);
    }
  }, true);

  return { abrir, fechar, get aberta() { return !caixa.hidden; } };
}
