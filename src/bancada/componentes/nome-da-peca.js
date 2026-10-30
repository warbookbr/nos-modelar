/* nome-da-peca.js — o nome da peça e o estado da sessão no grupo do alto à esquerda do tema Foco.
 *
 * Lê do estado central `rotuloPeca`, `aguardandoModelo` e `sessao`. O texto da sessão é o mesmo da janela Estado
 * (`ROTULOS_DE_SESSAO`), e o ponto muda de cor só quando algo pede atenção: sincronizando ou com erro. */
import { ROTULOS_DE_SESSAO } from './menu-estado.js';

export function montarNomeDaPeca({ elementos, estado }) {
  const { nome, sessao } = elementos;
  if (!nome) return;
  estado.assinar(['rotuloPeca', 'aguardandoModelo', 'sessao'], (valores) => {
    const texto = valores.rotuloPeca ?? (valores.aguardandoModelo ? 'Aguardando modelo…' : null);
    if (texto !== null) nome.textContent = texto;
    if (sessao) {
      sessao.dataset.sessao = valores.sessao;
      const rotulo = sessao.querySelector('span');
      if (rotulo) rotulo.textContent = ROTULOS_DE_SESSAO[valores.sessao] ?? valores.sessao;
    }
  });
}
