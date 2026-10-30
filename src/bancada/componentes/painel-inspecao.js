/* painel-inspecao.js — o painel da direita: as abas, a aba Inspeção com os modos, a opacidade, a explosão, as ações, o botão das juntas, o diagnóstico e as portas, e o recolher.
 *
 * Lê do estado central `selecao`, `temHierarquia`, `diagnostico`, `portas`, `juntas` e `preferenciasCena`, recebe a
 * visão em vigor por `refletirVisao`, e age sobre a peça só pelas ações que recebe. A aba "Imagem REF" é o painel das referências (`painel-referencias.js`),
 * montado pela imagem na cena no contêiner dela, e a aba Anotações é `aba-anotacoes.js`. */
import { formatarNome } from '../formatar.js';
import { montarRecolher } from './painel-componentes.js';

export const TITULO_DO_WIREFRAME = Object.freeze({
  /* O "Wireframe" da Inspeção é o raio X só da seleção; com a peça inteira
     em raio X ele não tem o que acrescentar, e o título diz por quê. */
  'raio-x': 'A visão Raio X já mostra a peça inteira assim.',
  outras: 'Raio X só nas peças selecionadas.',
});

export function montarPainelInspecao({ elementos, estado, acoes, aoRecolher }) {
  const {
    abas, conteudosDasAbas, prefGrade, prefChao, resumo, botoesModo, btnWireframeSelecao, opacidadeSelecao,
    valorOpacidadeSelecao, explosao, valorExplosao, btnSelecionarConjunto, btnFocarSelecao, btnCopiarEstado,
    btnJuntas, diagnostico, portas, resumoPortas, listaPortas, recolher,
  } = elementos;

  // Navegação de Abas do Painel Direito
  abas.forEach((btn) => {
    btn.addEventListener('click', () => {
      const abaAlvo = btn.dataset.aba;
      abas.forEach((b) => {
        const ativa = b.dataset.aba === abaAlvo;
        b.classList.toggle('ativa', ativa);
        b.setAttribute('aria-selected', String(ativa));
      });
      Object.entries(conteudosDasAbas).forEach(([nome, el]) => {
        if (!el) return;
        el.hidden = nome !== abaAlvo;
        el.classList.toggle('ativa', nome === abaAlvo);
      });
    });
  });

  function refletirSelecao(selecao, visao) {
    const temSelecao = selecao.selecionadas.length > 0;
    resumo.textContent = temSelecao
      ? selecao.selecionadas.length === 1
        ? formatarNome(selecao.selecionadas[0])
        : `${selecao.selecionadas.length} componentes: ${selecao.selecionadas.map(formatarNome).join(', ')}`
      : 'Selecione componentes para inspecionar.';
    botoesModo.contexto.disabled = !temSelecao;
    botoesModo.isolar.disabled = !temSelecao;
    btnFocarSelecao.disabled = !temSelecao;
    btnWireframeSelecao.disabled = !temSelecao || visao === 'raio-x';
    opacidadeSelecao.disabled = !temSelecao;
    btnWireframeSelecao.classList.toggle('ativa', selecao.wireframeSelecao);
    btnSelecionarConjunto.disabled = !temSelecao || !selecao.temDescendentes;
    for (const [nome, botao] of Object.entries(botoesModo)) {
      botao.classList.toggle('ativa', nome === selecao.modo);
    }
    explosao.value = String(Math.round(selecao.explosao * 100));
    valorExplosao.value = `${Math.round(selecao.explosao * 100)}%`;
    opacidadeSelecao.value = String(Math.round(selecao.opacidadeSelecao * 100));
    valorOpacidadeSelecao.value = `${Math.round(selecao.opacidadeSelecao * 100)}%`;
  }

  function refletirVisao(visao, selecao) {
    if (selecao) {
      btnWireframeSelecao.disabled = !selecao.selecionadas.length || visao === 'raio-x';
    }
    btnWireframeSelecao.title = visao === 'raio-x' ? TITULO_DO_WIREFRAME['raio-x'] : TITULO_DO_WIREFRAME.outras;
  }

  function refletirDiagnostico({ semParte, componentes }) {
    if (semParte) {
      diagnostico.classList.remove('ok');
      diagnostico.classList.add('alerta');
      diagnostico.querySelector('p').textContent =
        `${semParte} faces não pertencem a uma parte semântica.`;
    } else {
      diagnostico.classList.remove('alerta');
      diagnostico.classList.add('ok');
      diagnostico.querySelector('p').textContent =
        `${componentes} componentes: nenhuma superfície sem identidade.`;
    }
  }

  function refletirPortas(lista) {
    if (!portas) return;
    portas.hidden = lista.length === 0;
    if (!lista.length) return;
    resumoPortas.textContent = `${lista.length} ${lista.length === 1 ? 'publicada' : 'publicadas'}`;
    listaPortas.replaceChildren(...lista.map((porta) => {
      const item = listaPortas.ownerDocument.createElement('li');
      const nome = listaPortas.ownerDocument.createElement('b');
      nome.textContent = porta.rotulo;
      const origem = listaPortas.ownerDocument.createElement('small');
      origem.textContent = `${porta.id} · ${porta.origem}`;
      item.append(nome, origem);
      return item;
    }));
  }

  estado.assinar(
    ['selecao', 'temHierarquia', 'diagnostico', 'portas', 'juntas', 'preferenciasCena'],
    (valores, mudadas) => {
      if (mudadas.includes('temHierarquia') && valores.temHierarquia !== null) {
        btnSelecionarConjunto.hidden = !valores.temHierarquia;
      }
      if (mudadas.includes('selecao') && valores.selecao) refletirSelecao(valores.selecao, valores.visao);
      if (mudadas.includes('diagnostico') && valores.diagnostico) refletirDiagnostico(valores.diagnostico);
      if (mudadas.includes('portas') && valores.portas) refletirPortas(valores.portas);
      if (mudadas.includes('juntas')) {
        btnJuntas?.setAttribute('aria-pressed', String(valores.juntas.modo));
        btnJuntas?.classList.toggle('ativo', valores.juntas.modo);
      }
      if (mudadas.includes('preferenciasCena') && valores.preferenciasCena) {
        if (prefGrade) prefGrade.checked = valores.preferenciasCena.grade;
        if (prefChao) prefChao.checked = valores.preferenciasCena.chao;
      }
    },
  );
  btnFocarSelecao.addEventListener('click', () => acoes.focarSelecao());
  btnSelecionarConjunto.addEventListener('click', () => acoes.selecionarConjunto());
  for (const [modo, botao] of Object.entries(botoesModo)) {
    botao.addEventListener('click', () => acoes.definirModo(modo));
  }
  explosao.addEventListener('input', () => acoes.definirExplosao(Number(explosao.value) / 100));
  btnWireframeSelecao.addEventListener('click', () => acoes.alternarWireframeSelecao());
  opacidadeSelecao.addEventListener('input', () => acoes.definirOpacidadeSelecao(Number(opacidadeSelecao.value) / 100));
  btnCopiarEstado.addEventListener('click', () => acoes.copiarVista());
  btnJuntas?.addEventListener('click', () => acoes.alternarModoJuntas());
  prefGrade?.addEventListener('change', () => acoes.aplicarPreferenciasCena({ grade: prefGrade.checked }));
  prefChao?.addEventListener('change', () => acoes.aplicarPreferenciasCena({ chao: prefChao.checked }));
  montarRecolher(recolher, { aoRecolher });

  /* A visão em vigor chega pela barra das vistas, que a reflete junto com o
     seletor: na troca de visão e quando a lista das visões é desenhada. */
  return { refletirVisao: (visao) => refletirVisao(visao, estado.obter('selecao')) };
}
