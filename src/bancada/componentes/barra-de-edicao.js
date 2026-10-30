/* barra-de-edicao.js — a barra do modo de edição no tema Foco: escolher entre juntas e malha, desfazer e descartar, com o rodapé do ajuste (o resumo e o salvar) trazido para dentro dela pelo tema.
 *
 * Lê do estado central `juntas` e `malhaEmEdicao`. A barra aparece enquanto um dos dois modos está ligado e enquanto
 * há ajuste por salvar, que é quando o rodapé das juntas aparece; o salvar e o resumo continuam sendo o rodapé
 * (`rodape-juntas.js`), e não uma cópia dele. Com um modo ligado a página ganha a classe `editando`, que a folha de
 * estilo usa para a moldura da tela: o modo é explícito e se vê de longe. As ações são as da edição da peça.
 *
 * O botão Inspecionar (`btnInspecionar`), que o tema Bancada põe ao lado de Editar no alto, é a outra metade da troca
 * entre inspecionar e editar: fica marcado sem modo ligado e, clicado, desliga o modo que estiver ligado. */

export function montarBarraDeEdicao({ elementos, estado, corpo, acoes }) {
  const { barra, btnJuntas, btnMalha, btnDesfazer, btnDescartar, btnInspecionar } = elementos;
  if (!barra) return;

  estado.assinar(['juntas', 'malhaEmEdicao'], ({ juntas, malhaEmEdicao }) => {
    const editando = juntas.modo || malhaEmEdicao;
    barra.hidden = !(editando || juntas.rodapeVisivel);
    corpo?.classList.toggle('editando', editando);
    btnJuntas?.setAttribute('aria-pressed', String(juntas.modo));
    btnMalha?.setAttribute('aria-pressed', String(malhaEmEdicao));
    btnInspecionar?.setAttribute('aria-pressed', String(!editando));
    if (btnDescartar) btnDescartar.disabled = !juntas.mudou && juntas.quantas === 0;
  });

  btnJuntas?.addEventListener('click', () => acoes.alternarModoJuntas());
  btnMalha?.addEventListener('click', () => acoes.alternarEdicaoDeMalha());
  btnDesfazer?.addEventListener('click', () => acoes.desfazer());
  btnDescartar?.addEventListener('click', () => acoes.descartar());
  btnInspecionar?.addEventListener('click', () => {
    const { juntas, malhaEmEdicao } = estado.ler();
    if (malhaEmEdicao) acoes.alternarEdicaoDeMalha();
    if (juntas.modo) acoes.alternarModoJuntas();
  });
}
