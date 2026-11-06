/* controle-de-corte.js — o controle da vista de corte na aba Inspeção: o eixo, a posição em milímetro e o lado que fica translúcido.
 *
 * Os campos nascem aqui, depois do controle de opacidade, para a página não precisar de marcação própria; quem muda o corte é a
 * ação `definirCorte`, que recusa pedido inválido com a mesma mensagem da linha de comando, e o controle a mostra no campo. */
import { EIXOS_DO_CORTE, LADOS_DO_CORTE } from '../../autoria/corte-de-plano.js';

export function montarControleDeCorte({ ancora, acoes }) {
  if (!ancora?.parentNode || typeof acoes?.definirCorte !== 'function') return null;
  const documento = ancora.ownerDocument;
  const bloco = documento.createElement('div');
  bloco.className = 'controle-explosao controle-corte';
  bloco.innerHTML = `
    <span><b>Corte</b><output class="corte-aviso" aria-live="polite"></output></span>
    <span class="corte-campos">
      <select class="corte-eixo" aria-label="Eixo do corte">
        <option value="">Sem corte</option>
        ${EIXOS_DO_CORTE.map((eixo) => `<option value="${eixo}">Eixo ${eixo}</option>`).join('')}
      </select>
      <input class="corte-posicao" type="number" step="any" value="0" aria-label="Posição do corte em milímetros" title="Posição do plano em milímetros" />
      <select class="corte-lado" aria-label="Lado translúcido">
        ${LADOS_DO_CORTE.map((lado) => `<option value="${lado}">Translúcido: ${lado}</option>`).join('')}
      </select>
    </span>`;
  const irmaos = [...ancora.parentNode.childNodes];
  ancora.parentNode.insertBefore(bloco, irmaos[irmaos.indexOf(ancora) + 1] ?? null);
  const eixo = bloco.querySelector('.corte-eixo');
  const posicao = bloco.querySelector('.corte-posicao');
  const lado = bloco.querySelector('.corte-lado');
  const aviso = bloco.querySelector('.corte-aviso');
  function aplicar() {
    aviso.textContent = '';
    posicao.disabled = !eixo.value;
    lado.disabled = !eixo.value;
    try {
      acoes.definirCorte(eixo.value ? { eixo: eixo.value, posicao: posicao.value, lado: lado.value } : null);
      posicao.removeAttribute('aria-invalid');
    } catch (erro) {
      posicao.setAttribute('aria-invalid', 'true');
      aviso.textContent = erro.message;
    }
  }
  for (const campo of [eixo, posicao, lado]) {
    campo.addEventListener('input', aplicar);
    campo.addEventListener('change', aplicar);
  }
  posicao.disabled = true;
  lado.disabled = true;
  return { elemento: bloco, eixo, posicao, lado, aviso };
}
