/* barra-de-estado.js — a barra de estado de baixo no tema Foco: a dica do que o ponteiro faz agora, a seleção, a peça em números e os interruptores da grade e do chão.
 *
 * Lê do estado central `selecao`, `partes`, `juntas`, `malhaEmEdicao`, `preferenciasCena` e `atalhos`. A escala é a
 * régua de sempre (`referencia-metrica.js`), que o tema traz para dentro da barra. A dica muda com o modo: a pessoa lê
 * embaixo o que o gesto vai fazer, sem abrir a janela dos controles. */
import { formatarTecla } from '../formatar.js';
import { textoDasMedidas } from './cartao-da-selecao.js';

/** A dica da barra para o modo em vigor, com as teclas de agora. */
export function dicaDoModo({ selecao, juntas, malhaEmEdicao, atalhos }) {
  if (malhaEmEdicao) return '1 2 3 vértice, aresta e face · G move · E extruda · X apaga · Tab sai';
  if (juntas?.modo) return 'Arraste um punho para mover a junta · Ctrl Z desfaz · Esc limpa a seleção';
  if (selecao?.selecionadas.length) {
    return `Duplo clique foca · Shift soma à seleção · ${formatarTecla(atalhos?.isolar ?? 'i')} isola · Esc limpa`;
  }
  return 'Arraste para girar · roda aproxima · duplo clique foca · Ctrl K comandos';
}

export function montarBarraDeEstado({ elementos, estado, medidasDaPeca, acoes }) {
  const { barra, dica, selecao: textoSelecao, peca, btnGrade, btnChao, btnAtalhos } = elementos;
  if (!barra) return;

  estado.assinar(['selecao', 'partes', 'juntas', 'malhaEmEdicao', 'preferenciasCena', 'atalhos'], (valores, mudadas) => {
    if (dica) dica.textContent = dicaDoModo(valores);
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
  btnAtalhos?.addEventListener('click', () => acoes.abrirControles());
}
