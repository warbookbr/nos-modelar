/* painel-parametros.js — gera sliders e campos numéricos interativos para ajuste fino pelo humano. */

/* Exportada para a prova da ponte do gesto ao parâmetro: é ela que decide
   quais controles a bancada oferece hoje, e o plano ativo precisa desse retrato
   medido para poder mostrar que mudou. */
export function extrairParametrosDeReceita(receita, valoresAtuais = {}) {
  const parametros = {};
  if (!receita || !Array.isArray(receita.PASSOS)) return valoresAtuais;

  // Procura por parâmetros e dimensões comuns nos passos procedurais
  for (const passo of receita.PASSOS) {
    if (!Array.isArray(passo) || passo.length < 2) continue;
    const [, args] = passo;
    if (!args || typeof args !== 'object') continue;

    const chavesRelevantes = ['larg', 'alt', 'prof', 'raio', 'raioMaior', 'raioMenor', 'espessura', 'chanfro', 'passo', 'dentes'];
    for (const chave of chavesRelevantes) {
      if (typeof args[chave] === 'number') {
        const nomeParam = `${chave}_${args.origemId || args.id || 'dim'}`;
        parametros[nomeParam] = {
          rotulo: formatarRotuloParametro(`${chave} (${args.origemId || args.id || ''})`),
          valor: valoresAtuais[nomeParam] ?? args[chave],
          min: Math.max(0.01, Number((args[chave] * 0.2).toFixed(2))),
          max: Number((args[chave] * 3).toFixed(2)),
          passo: args[chave] > 5 ? 0.5 : 0.05,
        };
      }
    }
  }

  // Mescla com parâmetros explícitos do estado da sessão
  for (const [k, v] of Object.entries(valoresAtuais)) {
    if (!parametros[k] && typeof v === 'number') {
      parametros[k] = {
        rotulo: formatarRotuloParametro(k),
        valor: v,
        min: Math.max(0.01, Number((v * 0.2).toFixed(2))),
        max: Number((v * 3).toFixed(2)),
        passo: v > 5 ? 0.5 : 0.05,
      };
    }
  }

  return parametros;
}

function formatarRotuloParametro(chave) {
  return chave
    .replace(/([a-zá-ú])([A-Z])/g, '$1 $2')
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/^./, (l) => l.toUpperCase());
}

export function criarPainelParametros({
  container,
  aoMudarParametro = () => {},
}) {
  if (!container) return null;

  const formatarRotulo = formatarRotuloParametro;

  function renderizar({ receita, parametros: valoresAtuais = {} }) {
    container.replaceChildren();

    const mapaParametros = extrairParametrosDeReceita(receita, valoresAtuais);
    const chaves = Object.keys(mapaParametros);

    if (chaves.length === 0) {
      const msg = document.createElement('p');
      msg.className = 'sem-parametros';
      msg.textContent = 'Nenhuma dimensão ajustável exposta no modelo atual.';
      container.appendChild(msg);
      return;
    }

    const form = document.createElement('form');
    form.className = 'form-parametros';
    form.onsubmit = (e) => e.preventDefault();

    for (const chave of chaves) {
      const def = mapaParametros[chave];
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

      const atualizar = (novoValor) => {
        const val = Number(novoValor);
        slider.value = String(val);
        numInput.value = String(val);
        aoMudarParametro(chave, val);
      };

      slider.addEventListener('input', (e) => atualizar(e.target.value));
      numInput.addEventListener('change', (e) => atualizar(e.target.value));

      form.appendChild(linha);
    }

    container.appendChild(form);
  }

  return {
    renderizar,
  };
}
