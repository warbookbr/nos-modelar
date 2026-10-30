/* barra-das-vistas.js — a fileira das vistas da câmera, a projeção, o enquadrar e o seletor de visão.
 *
 * Lê do estado central `vista`, `projecao`, `visao`, `menuVisoesAberto`, `atalhos` e `inicializando`. O seletor de visão é um botão com o
 * nome da visão em vigor, que abre a lista das visões do registro com a tecla de cada uma. As que ainda não funcionam
 * ficam na lista, marcadas e com a dica, e escolhê-las só mostra a dica: a lista diz o que a bancada vai ter sem fingir
 * que já tem. A escolha passa por `escolherVisao`, que é a mesma porta do atalho de teclado. */
import { formatarTecla } from '../formatar.js';
import { VISAO_PADRAO, VISOES, visaoDisponivel } from '../visoes/registro-de-visoes.js';

export function montarBarraDasVistas({
  elementos, estado, definirVista, alternarProjecao, enquadrar, escolherVisao, aoRefletirVisao = () => {}, janela = globalThis,
}) {
  const { botoesDeVista, btnProjecao, btnEnquadrar, btnVisao, nomeVisao, menuVisoes } = elementos;

  function atualizarBotoesVista(vista) {
    for (const botao of botoesDeVista) {
      botao.classList.toggle('ativa', botao.dataset.vista === vista);
    }
  }

  function refletirProjecao(projecao) {
    btnProjecao.querySelector('span').textContent =
      projecao === 'ortografica' ? 'Ortográfica' : 'Perspectiva';
    btnProjecao.classList.toggle('ativa', projecao === 'ortografica');
  }

  function desenharMenuVisoes(teclas) {
    menuVisoes.replaceChildren(...VISOES.map((visao) => {
      const documento = menuVisoes.ownerDocument;
      const item = documento.createElement('button');
      item.type = 'button';
      item.className = 'item-visao';
      item.dataset.visao = visao.id;
      item.setAttribute('role', 'menuitemradio');
      const rotulo = documento.createElement('span');
      rotulo.textContent = visao.rotulo;
      item.append(rotulo);
      if (!visaoDisponivel(visao)) {
        /* `aria-disabled`, e não `disabled`: o botão desabilitado de verdade
           não recebe clique nem mostra a dica ao passar o ponteiro. */
        item.setAttribute('aria-disabled', 'true');
        item.title = visao.dica ?? '';
        const breve = documento.createElement('small');
        breve.textContent = 'em breve';
        item.append(breve);
      }
      const tecla = documento.createElement('kbd');
      tecla.textContent = formatarTecla(teclas[`visao-${visao.id}`]);
      item.append(tecla);
      item.addEventListener('click', () => escolherVisao(visao.id));
      return item;
    }));
  }

  function refletirVisao(visao) {
    const atual = VISOES.find((candidata) => candidata.id === visao);
    if (nomeVisao) nomeVisao.textContent = atual?.rotulo ?? '';
    for (const item of menuVisoes?.querySelectorAll('[data-visao]') ?? []) {
      item.setAttribute('aria-checked', String(item.dataset.visao === visao));
    }
    btnVisao?.classList.toggle('ativa', visao !== VISAO_PADRAO);
    aoRefletirVisao(visao);
  }

  function refletirMenuAberto(aberto) {
    if (!menuVisoes || !btnVisao) return;
    menuVisoes.hidden = !aberto;
    btnVisao.setAttribute('aria-expanded', String(aberto));
  }

  estado.assinar(['vista', 'projecao', 'visao', 'menuVisoesAberto', 'atalhos', 'inicializando'], (valores, mudadas) => {
    /* O fim da subida redesenha a fileira mesmo sem troca de vista: a câmera
       pode ter mudado de vista antes de a barra existir. */
    if (mudadas.includes('vista') || (mudadas.includes('inicializando') && !valores.inicializando)) {
      atualizarBotoesVista(valores.vista);
    }
    if (mudadas.includes('projecao') && valores.projecao) refletirProjecao(valores.projecao);
    /* A lista das visões mostra as mesmas teclas do menu Controles, então
       trocar ou restaurar uma tecla redesenha as duas. */
    if (mudadas.includes('visao')) refletirVisao(valores.visao);
    else if (mudadas.includes('atalhos') && valores.atalhos && menuVisoes) {
      desenharMenuVisoes(valores.atalhos);
      refletirVisao(valores.visao);
    }
    if (mudadas.includes('menuVisoesAberto')) refletirMenuAberto(valores.menuVisoesAberto);
  });

  for (const botao of botoesDeVista) {
    botao.addEventListener('click', () => definirVista(botao.dataset.vista));
  }
  btnProjecao.addEventListener('click', () => alternarProjecao());
  btnEnquadrar.addEventListener('click', () => enquadrar());

  btnVisao?.addEventListener('click', () => {
    if (menuVisoes) estado.definir({ menuVisoesAberto: menuVisoes.hidden });
  });
  /* Fecha ao clicar fora e por Esc. O Esc é ouvido na captura para fechar a
     lista sem também limpar a seleção da peça, que é o que ele faz na cena. */
  janela.addEventListener('pointerdown', (evento) => {
    if (menuVisoes && !menuVisoes.hidden && !evento.target?.closest?.('.seletor-visao')) {
      estado.definir({ menuVisoesAberto: false });
    }
  });
  janela.addEventListener('keydown', (evento) => {
    if (evento.key !== 'Escape' || !menuVisoes || menuVisoes.hidden) return;
    evento.stopImmediatePropagation();
    estado.definir({ menuVisoesAberto: false });
    btnVisao?.focus();
  }, true);

  return { refletirVisao };
}
