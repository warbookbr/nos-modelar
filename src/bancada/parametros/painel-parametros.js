/* painel-parametros.js — gera sliders e campos numéricos interativos para ajuste fino pelo humano. */

/* painel-parametros.js — controles do que a receita DECLARA como parâmetro.
 *
 * Até a ponte do gesto ao parâmetro, este painel adivinhava: varria os
 * argumentos dos passos atrás de nomes como `raio` e `alt` e montava um
 * controle para cada um. Numa receita que deriva os passos de uma tabela
 * medida, esses argumentos são RESULTADOS da derivação, então o painel oferecia
 * número de saída como se fosse de entrada, e mexer nele não correspondia a
 * decisão nenhuma. A fonte agora é `listarParametrosDeclarados`, e peça que não
 * declara parâmetro mostra isso escrito em vez de ganhar controle inventado. */
import { listarParametrosDeclarados } from '../../autoria/parametros-declarados.js';

function formatarRotuloParametro(chave) {
  return chave
    .replace(/([a-zá-ú])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/^./, (l) => l.toUpperCase());
}

/* O valor mostrado é o da sessão quando existe, e o declarado na receita quando
   não existe: enquanto a escrita na receita não entra, o que a pessoa mexeu
   vive só na sessão e não pode ser sobrescrito a cada redesenho. */
export function parametrosDoPainel(receita, valoresAtuais = {}) {
  return listarParametrosDeclarados(receita).map((p) => ({
    ...p,
    rotulo: formatarRotuloParametro(p.id),
    valor: typeof valoresAtuais[p.id] === 'number' ? valoresAtuais[p.id] : p.valor,
  }));
}

export function criarPainelParametros({
  container,
  aoArrastar = () => {},
  aoSoltar = () => {},
}) {
  if (!container) return null;

  function renderizar({ receita, parametros: valoresAtuais = {} }) {
    container.replaceChildren();

    const parametros = parametrosDoPainel(receita, valoresAtuais);

    if (parametros.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'sem-parametros';
      msg.textContent = 'Esta peça não declara parâmetros em PARAMS.';
      container.appendChild(msg);
      return;
    }

    const form = document.createElement('form');
    form.className = 'form-parametros';
    form.onsubmit = (e) => e.preventDefault();

    for (const def of parametros) {
      const chave = def.id;
      const linha = document.createElement('div');
      linha.className = 'linha-parametro';

      linha.innerHTML = `
        <div class="param-cabecalho">
          <label for="param-${chave}">${def.rotulo}</label>
          <input type="number" id="num-${chave}" step="${def.passo}" min="${def.min}" max="${def.max}" value="${def.valor}">
        </div>
        <div class="param-slider-wrapper">
          <input type="range" id="param-${chave}" min="${def.min}" max="${def.max}" step="${def.passo}" value="${def.valor}">
        </div>
      `;

      const slider = linha.querySelector('input[type="range"]');
      const numInput = linha.querySelector('input[type="number"]');

      /* Arrastar é PRÉVIA e soltar é GRAVAÇÃO. Sem essa separação, cada quadro
         do arrasto escreveria no arquivo: dezenas de escritas por gesto, cada
         uma reexecutando e conferindo a receita, e um histórico de trabalho
         cheio de valores intermediários que ninguém escolheu. */
      const mostrar = (val) => {
        slider.value = String(val);
        numInput.value = String(val);
      };

      slider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        mostrar(val);
        aoArrastar(chave, val);
      });
      slider.addEventListener('change', (e) => aoSoltar(chave, Number(e.target.value)));
      numInput.addEventListener('change', (e) => {
        const val = Number(e.target.value);
        mostrar(val);
        aoArrastar(chave, val);
        aoSoltar(chave, val);
      });

      form.appendChild(linha);
    }

    container.appendChild(form);
  }

  return {
    renderizar,
  };
}
