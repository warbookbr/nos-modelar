/* vista-da-cena.js — como a peça é olhada: a projeção, a grade e o chão, a visão escolhida e a câmera restaurada da URL na subida.
 *
 * Saiu de `main.js` sem mudar de comportamento. O módulo não toca a página: escreve `projecao`, `preferenciasCena`,
 * `visao`, `menuVisoesAberto`, `vista` e `inicializando` no estado central, e a barra das vistas e o painel de inspeção
 * desenham. */
import { lerEstadoDaUrl } from '../estado-bancada.js';

export function criarVistaDaCena({ ambiente, estado, cena, seletorDeVisao, preferenciasBancada, avisar, parametros }) {
  function alternarProjecao() {
    ambiente.definirProjecao(ambiente.projecao === 'ortografica' ? 'perspectiva' : 'ortografica');
    estado.definir({ projecao: ambiente.projecao });
    if (cena.controlador) cena.salvarEstadoNaUrl(cena.controlador.estado());
  }

  function aplicarPreferenciasCena(parcial) {
    const proximo = preferenciasBancada.salvar(parcial);
    ambiente.definirPreferenciasCena(proximo);
    estado.definir({ preferenciasCena: proximo });
    return proximo;
  }

  function alternarPreferenciaCena(qual) {
    const atual = preferenciasBancada.ler();
    aplicarPreferenciasCena({ [qual]: !atual[qual] });
  }

  /* A mesma porta para o clique na lista das visões e para o atalho: a visão
     que ainda não funciona responde com a dica, e a que funciona fecha a lista. */
  function escolherVisao(id) {
    const resultado = seletorDeVisao.escolher(id);
    if (resultado.ok) {
      estado.definir({ menuVisoesAberto: false });
      return true;
    }
    if (resultado.dica) avisar(resultado.dica);
    return false;
  }

  /* Restaura estado inicial de câmera da URL e encerra a subida. */
  function restaurarCameraDaUrl() {
    const inicial = lerEstadoDaUrl(parametros, cena.controlador ? cena.controlador.nomes : []);
    ambiente.definirProjecao(inicial.projecao);
    estado.definir({ projecao: ambiente.projecao });
    ambiente.definirVista(inicial.vista, { instantaneo: true });
    if (inicial.cameraLivre) ambiente.restaurarCameraLivre(inicial.cameraLivre);
    estado.definir({ vista: ambiente.vista });
    estado.definir({ inicializando: false });
  }

  return {
    alternarProjecao, aplicarPreferenciasCena, alternarPreferenciaCena, escolherVisao, restaurarCameraDaUrl,
  };
}
