/* registro-de-visoes.js — as visões de conferência da bancada e o seletor que as alterna sobre a peça carregada.
 *
 * Uma visão é um jeito de desenhar a MESMA peça para conferir outra coisa nela: a sólida mostra a forma, o arame mostra as
 * arestas da malha escondendo o que fica atrás, o raio X mostra as arestas de trás também, e a curvatura, a zebra e a luz
 * rasante mostram a superfície. Todas moram aqui, num registro só, e cada uma diz duas coisas: como se APLICA sobre a peça e
 * como se DESFAZ. A visão que ainda não tem as duas funções aparece no seletor desabilitada, com a dica dela; a que ganha as
 * duas passa a funcionar sem ninguém mexer no seletor, nos atalhos nem na preferência guardada.
 *
 * O contexto que as funções recebem é o da peça na cena: `grupo` é a raiz da peça, `controlador` é o controlador das partes
 * (`controlar-partes.js`, de onde vem o `definirArame`), `ambiente` é o estúdio, para a visão que mexe em luz, e `modelo` é a
 * peça convertida, com a malha neutra, para a visão que calcula sobre a superfície. Uma peça nova, uma junta arrastada ou
 * uma operação de malha refazem o modelo e o controlador, e a bancada prende a visão escolhida no contexto novo; por isso ela
 * continua valendo depois de cada uma. A peça velha sai da cena levando o que a visão fez nela, sem passar pelo `desfazer`;
 * o que uma visão fizer fora da peça, na luz do estúdio, precisa aceitar ser aplicado de novo sem ter sido desfeito.
 *
 * O seletor não conhece o DOM nem o Three: guarda qual visão está escolhida e chama as funções do registro na ordem certa. As
 * visões de superfície moram cada uma no seu arquivo, com o material, a luz e a caixa pequena sobre a cena que precisam
 * (`visao-curvatura.js`, `visao-zebra.js`, `visao-luz-rasante.js`). */
import { aplicarCurvatura, desfazerCurvatura } from './visao-curvatura.js';
import { aplicarLuzRasante, desfazerLuzRasante } from './visao-luz-rasante.js';
import { aplicarZebra, desfazerZebra } from './visao-zebra.js';

export const VISAO_PADRAO = 'solida';

/* A ordem é a do seletor na tela. `atalho` é a tecla de fábrica, que a pessoa troca no menu Controles como as outras.
   As teclas fogem das que a edição de malha usa enquanto está ligada (1, 2, 3, A, L, E, D, X, F, R, S, G e os eixos), para
   trocar de visão no meio de uma edição não virar uma operação na malha. */
export const VISOES = Object.freeze([
  {
    id: 'solida',
    rotulo: 'Sólida',
    atalho: 'o',
    /* A peça nasce sólida no controlador, e cada visão desfaz o que fez; a sólida não tem o que aplicar. */
    aplicar: () => {},
    desfazer: () => {},
  },
  {
    id: 'arame',
    rotulo: 'Arame',
    atalho: 'm',
    /* O arame que esconde o que fica atrás: o sólido continua lá, e as arestas vêm por cima. */
    aplicar: ({ controlador }) => controlador?.definirArame(true),
    desfazer: ({ controlador }) => controlador?.definirArame(false),
  },
  {
    id: 'raio-x',
    rotulo: 'Raio X',
    atalho: 'Shift+m',
    aplicar: ({ controlador }) => controlador?.definirArame('raio-x'),
    desfazer: ({ controlador }) => controlador?.definirArame(false),
  },
  {
    id: 'curvatura',
    rotulo: 'Curvatura',
    atalho: 'k',
    /* A curvatura média nos vértices, com a escala, as cores e a faixa ocre dos vincos das vistas obrigatórias do crítico. */
    aplicar: aplicarCurvatura,
    desfazer: desfazerCurvatura,
  },
  {
    id: 'zebra',
    rotulo: 'Zebra',
    atalho: 'b',
    /* Listras pelo vetor refletido, que andam com a câmera, com a largura no controle da visão. */
    aplicar: aplicarZebra,
    desfazer: desfazerZebra,
  },
  {
    id: 'luz-rasante',
    rotulo: 'Luz rasante',
    atalho: 'j',
    /* Um sol a 10 graus do plano da imagem, com sombra e o resto da luz apagado, com a direção no controle da visão. */
    aplicar: aplicarLuzRasante,
    desfazer: desfazerLuzRasante,
  },
]);

export function visaoDisponivel(visao) {
  return typeof visao?.aplicar === 'function' && typeof visao?.desfazer === 'function';
}

/* O seletor guarda a visão escolhida e o contexto em que ela está aplicada.
 *
 * `prender(contexto)` aplica a visão escolhida numa peça que acabou de entrar na cena. `escolher(id)` troca a visão: desfaz a atual e aplica a nova no contexto preso. `suspender()` e `retomar()` existem
 * para a captura automática: ela escolhe o arame por conta própria, pela ponte da bancada, e não pode herdar a visão que a
 * pessoa deixou escolhida; enquanto a captura dura, o seletor não aplica nada, nem numa peça nova que chegue.
 *
 * `pagina` é o que as visões de superfície usam da página sem tocá-la (`componentes/caixa-da-visao.js`): a caixa sobre a cena, a
 * soltura do ponteiro e o relógio de quadros. O seletor a junta ao contexto de cada peça; sem ela (nos testes), as visões
 * funcionam sem caixa e refazem a conta só quando a peça é refeita. */
export function criarSeletorDeVisao({ visoes = VISOES, inicial = VISAO_PADRAO, aoMudar, pagina = null } = {}) {
  const porId = new Map(visoes.map((visao) => [visao.id, visao]));
  const valida = (id) => visaoDisponivel(porId.get(id));
  let atual = valida(inicial) ? inicial : VISAO_PADRAO;
  let contexto = null;
  let suspenso = false;
  /* A visão que está de fato aplicada no contexto, que pode diferir da escolhida enquanto o seletor está suspenso. */
  let aplicada = null;

  function aplicar() {
    if (!contexto || suspenso) return;
    porId.get(atual).aplicar(contexto);
    aplicada = atual;
  }

  function desfazer() {
    if (!contexto || aplicada === null) return;
    porId.get(aplicada).desfazer(contexto);
    aplicada = null;
  }

  return {
    get atual() { return atual; },
    get suspenso() { return suspenso; },
    visoes,
    disponivel: (id) => valida(id),
    escolher(id) {
      const visao = porId.get(id);
      if (!visao) return { ok: false, motivo: 'desconhecida' };
      if (!visaoDisponivel(visao)) return { ok: false, motivo: 'indisponivel', dica: visao.dica ?? null };
      if (id !== atual || aplicada === null) {
        desfazer();
        atual = id;
        aplicar();
      }
      aoMudar?.(atual);
      return { ok: true, visao: atual };
    },
    prender(novo) {
      contexto = novo ? { ...novo, ...(pagina ? { pagina } : {}) } : null;
      aplicada = null;
      aplicar();
    },
    suspender() {
      desfazer();
      suspenso = true;
    },
    retomar() {
      suspenso = false;
      aplicar();
    },
  };
}
