/* barra-de-estado.js — a barra de estado de baixo no tema Foco: a seleção, a peça em números e os interruptores da grade e do chão.
 *
 * Lê do estado central `selecao`, `partes`, `juntas`, `malhaEmEdicao`, `preferenciasCena` e `atalhos`. A escala é a
 * régua de sempre (`referencia-metrica.js`), que o tema traz para dentro da barra. */
import { textoDasMedidas } from './cartao-da-selecao.js';

export function montarBarraDeEstado({ elementos, estado, medidasDaPeca, acoes }) {
  const { barra, selecao: textoSelecao, peca, btnGrade, btnChao, btnAtalhos } = elementos;
  if (!barra) return;

  estado.assinar(['selecao', 'partes', 'juntas', 'malhaEmEdicao', 'preferenciasCena', 'atalhos'], (valores, mudadas) => {
    const total = valores.partes?.length ?? 0;
    if (textoSelecao) textoSelecao.textContent = `Seleção ${valores.selecao?.selecionadas.length ?? 0} de ${total}`;
    if (peca && mudadas.includes('partes')) {
      const medidas = medidasDaPeca();
      peca.textContent = medidas ? `${total} partes · ${textoDasMedidas(medidas).split(' · ').reverse().join(' · ')}` : '';
    }
    if (valores.preferenciasCena) {
      btnGrade?.setAttribute('aria-pressed', String(valores.preferenciasCena.grade));
      btnChao?.setAttribute('aria-pressed', String(valores.preferenciasCena.chao));
    }
  });

  btnGrade?.addEventListener('click', () => acoes.alternarPreferenciaCena('grade'));
  btnChao?.addEventListener('click', () => acoes.alternarPreferenciaCena('chao'));
  btnAtalhos?.addEventListener('click', () => acoes.abrirConfiguracoes());
}
