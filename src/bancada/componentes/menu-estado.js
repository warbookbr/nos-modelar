/* menu-estado.js — a janela Estado da barra superior: o resumo do que está carregado e da ligação com a sessão, e a sequência de eventos desde que a página abriu.
 *
 * O painel de Estado é desenhado na abertura, e não a cada evento: manter uma
 * lista escondida em dia custa trabalho a cada quadro para ninguém ver. */

export const ROTULOS_DE_SESSAO = Object.freeze({
  desconectado: 'Sessão local',
  conectado: 'Sessão da IA conectada',
  sincronizando: 'Sincronizando…',
  erro: 'Erro de sincronia',
});

/** As linhas do resumo, como pares de nome e valor, a partir do estado central. */
export function linhasDoResumo({ rotuloPeca, origem, idNaUrl, sessao, faceSemIdentidade }, versao) {
  return [
    ['Versão', versao],
    ['Peça', rotuloPeca ?? 'nenhuma carregada'],
    ['Origem', origem ?? (idNaUrl ? `acervo: ${idNaUrl}` : 'sessão ativa')],
    ['Sessão', ROTULOS_DE_SESSAO[sessao] ?? sessao],
    ['Semântica', faceSemIdentidade
      ? `${faceSemIdentidade} faces sem identidade`
      : 'nenhuma face sem identidade'],
  ];
}

/* `__VERSAO_DA_BANCADA__` é trocado por texto na construção. O `typeof`
   existe porque o harness e os testes carregam este módulo sem passar
   pelo Vite, e ali o identificador não existe. */
const VERSAO = typeof __VERSAO_DA_BANCADA__ === 'string' ? __VERSAO_DA_BANCADA__ : 'fora de construção';

export function montarMenuEstado({
  resumoEstado, listaEventos, btnLimparEventos, estado, registroDeEventos, versao = VERSAO,
}) {
  function desenharEstado() {
    const resumo = resumoEstado;
    const lista = listaEventos;
    if (!resumo || !lista) return;
    const documento = resumo.ownerDocument;
    resumo.replaceChildren(...linhasDoResumo(estado.ler(), versao).map(([nome, valor]) => {
      const linha = documento.createElement('div');
      linha.className = 'linha';
      const rotulo = documento.createElement('span');
      rotulo.textContent = nome;
      const conteudo = documento.createElement('kbd');
      conteudo.textContent = valor;
      linha.append(rotulo, conteudo);
      return linha;
    }));

    const eventos = registroDeEventos.listarRecentesPrimeiro();
    if (eventos.length === 0) {
      const vazio = documento.createElement('p');
      vazio.className = 'modal-descricao';
      vazio.textContent = 'Nada aconteceu desde que a página abriu.';
      lista.replaceChildren(vazio);
      return;
    }
    lista.replaceChildren(...eventos.map((evento) => {
      const item = documento.createElement('div');
      item.className = `evento evento-${evento.gravidade}`;
      const hora = documento.createElement('time');
      hora.dateTime = evento.quando;
      hora.textContent = new Date(evento.quando).toLocaleTimeString('pt-BR');
      const texto = documento.createElement('span');
      texto.textContent = evento.detalhe ? `${evento.assunto} — ${evento.detalhe}` : evento.assunto;
      item.append(hora, texto);
      if (evento.repeticoes > 1) {
        const vezes = documento.createElement('small');
        vezes.textContent = `${evento.repeticoes}×`;
        item.append(vezes);
      }
      return item;
    }));
  }

  btnLimparEventos?.addEventListener('click', () => {
    registroDeEventos.limpar();
    desenharEstado();
  });

  return { desenharEstado };
}
