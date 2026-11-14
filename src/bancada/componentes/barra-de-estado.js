/* barra-de-estado.js — a barra de estado de baixo no tema Foco: a seleção, a peça em números e os interruptores da grade e do chão.
 *
 * Lê do estado central `selecao`, `partes`, `juntas`, `malhaEmEdicao`, `preferenciasCena` e `atalhos`. A escala é a
 * régua de sempre (`referencia-metrica.js`), que o tema traz para dentro da barra. */
import { textoDasMedidas } from './cartao-da-selecao.js';

export function montarBarraDeEstado({ elementos, estado, medidasDaPeca, acoes }) {
  const { barra, selecao: textoSelecao, peca, btnGrade, btnChao, btnAmbiente, btnAtalhos } = elementos;
  if (!barra) return;

  estado.assinar(['selecao', 'partes', 'juntas', 'malhaEmEdicao', 'preferenciasCena', 'atalhos', 'execucao'], (valores, mudadas) => {
    const total = valores.partes?.length ?? 0;
    if (textoSelecao) textoSelecao.textContent = `Seleção ${valores.selecao?.selecionadas.length ?? 0} de ${total}`;
    if (peca && (mudadas.includes('partes') || mudadas.includes('execucao'))) {
      const medidas = medidasDaPeca();
      const medida = medidas ? `${total} partes · ${textoDasMedidas(medidas).split(' · ').reverse().join(' · ')}` : '';
      /* de onde veio a malha e quanto custou, ao lado das medidas da peça */
      peca.textContent = valores.execucao && medida ? `${medida} · ${valores.execucao.texto}` : medida;
    }
    if (valores.preferenciasCena) {
      btnGrade?.setAttribute('aria-pressed', String(valores.preferenciasCena.grade));
      btnChao?.setAttribute('aria-pressed', String(valores.preferenciasCena.chao));
    }
  });

  btnGrade?.addEventListener('click', () => acoes.alternarPreferenciaCena('grade'));
  btnChao?.addEventListener('click', () => acoes.alternarPreferenciaCena('chao'));
  /* O AMBIENTE DE REFLEXO gira entre estúdio, céu aberto e nenhum; o botão mostra o que está valendo. */
  const NOMES_DO_AMBIENTE = { estudio: 'Estúdio', ceu: 'Céu aberto', nenhum: 'Sem ambiente' };
  const mostrarAmbiente = (nome) => {
    if (btnAmbiente) btnAmbiente.lastChild.textContent = NOMES_DO_AMBIENTE[nome] ?? nome;
  };
  if (btnAmbiente && acoes.ambienteDeReflexo) mostrarAmbiente(acoes.ambienteDeReflexo());
  btnAmbiente?.addEventListener('click', () => mostrarAmbiente(acoes.girarAmbienteDeReflexo()));
  btnAtalhos?.addEventListener('click', () => acoes.abrirConfiguracoes());
}
