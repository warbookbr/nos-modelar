/* caixa-da-visao.js — a caixa pequena sobre a cena com o que a visão ligada pede (a legenda da curvatura, a largura das listras da
 * zebra, a direção da luz rasante), e os dois ganchos da página de que as visões precisam: saber quando o ponteiro ou a tecla
 * soltam, e rodar algo a cada quadro.
 *
 * As visões (`src/bancada/visoes/`) não tocam a página: recebem este componente no contexto, como `pagina`, e descrevem o que a
 * caixa mostra (`mostrar(visao, descricao)`), sem montar elemento. A caixa existe só enquanto a visão dura: a visão a mostra ao
 * aplicar e a fecha ao desfazer, e a troca de uma visão por outra passa pelo desfazer da anterior, por isso nunca há duas. Mora
 * no mesmo pai do canvas da cena.
 *
 * A DESCRIÇÃO: `{ titulo, barra, linhas, controle, botao, estado, dados }`, todos opcionais menos o título. `barra` é
 * `{ cores, marcas }`, um degradê das cores (RGB linear de 0 a 1, como as da cena) com as marcas embaixo; `linhas` são
 * `{ cor, texto }`, com a amostra da cor quando há; `controle` é um deslizante `{ nome, rotulo, min, max, passo, valor, formatar,
 * aoMudar }`, que continua o mesmo elemento entre uma descrição e a seguinte, para o arrasto dele não se perder; `botao` é
 * `{ rotulo, titulo, aoClicar }`; `estado` é uma linha miúda no fim; `dados` vira `data-*` da caixa, para as provas lerem. */
import { aCadaQuadro } from './ciclo-da-pagina.js';

const ID = 'painelVisao';

/* A cor linear da cena no espaço da tela, pela curva do sRGB, para a amostra da legenda sair igual ao pixel da peça. */
function paraTela(c) {
  const v = Math.min(1, Math.max(0, c));
  return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055));
}
export const corCss = (cor) => `rgb(${cor.map(paraTela).join(' ')})`;

export function montarCaixaDaVisao({ canvas, documento = globalThis.document, janela = globalThis }) {
  let caixa = null;
  let controle = null;

  function criar(visao) {
    caixa = documento.createElement('section');
    caixa.id = ID;
    caixa.className = 'painel-visao';
    caixa.dataset.visao = visao;
    (canvas?.parentElement ?? documento.body).append(caixa);
    controle = null;
  }

  function deslizante(descricao) {
    if (controle?.nome === descricao.nome) {
      controle.aoMudar = descricao.aoMudar;
      controle.formatar = descricao.formatar;
      if (documento.activeElement !== controle.entrada) {
        controle.entrada.value = String(descricao.valor);
        controle.saida.textContent = descricao.formatar(descricao.valor);
      }
      return controle.linha;
    }
    const linha = documento.createElement('label');
    linha.className = 'controle-visao';
    const texto = documento.createElement('span');
    texto.textContent = descricao.rotulo;
    const entrada = documento.createElement('input');
    entrada.type = 'range';
    entrada.name = descricao.nome;
    entrada.min = String(descricao.min);
    entrada.max = String(descricao.max);
    entrada.step = String(descricao.passo);
    entrada.value = String(descricao.valor);
    const saida = documento.createElement('output');
    saida.textContent = descricao.formatar(descricao.valor);
    controle = { nome: descricao.nome, linha, entrada, saida, aoMudar: descricao.aoMudar, formatar: descricao.formatar };
    const atual = controle;
    entrada.addEventListener('input', () => {
      const valor = Number(entrada.value);
      saida.textContent = atual.formatar(valor);
      atual.aoMudar(valor);
    });
    /* a tecla no controle não vira atalho da bancada (o 1 da vista de frente, a letra da própria visão) */
    entrada.addEventListener('keydown', (evento) => evento.stopPropagation());
    linha.append(texto, entrada, saida);
    return linha;
  }

  function mostrar(visao, descricao) {
    if (caixa && caixa.dataset.visao !== visao) fechar();
    if (!caixa) criar(visao);
    const filhos = [];
    const titulo = documento.createElement('h2');
    titulo.textContent = descricao.titulo;
    filhos.push(titulo);
    if (descricao.barra) {
      const barra = documento.createElement('div');
      barra.className = 'barra-curvatura';
      barra.style.background = `linear-gradient(90deg, ${descricao.barra.cores.map(corCss).join(', ')})`;
      const marcas = documento.createElement('div');
      marcas.className = 'marcas-curvatura';
      for (const texto of descricao.barra.marcas) {
        const marca = documento.createElement('span');
        marca.textContent = texto;
        marcas.append(marca);
      }
      filhos.push(barra, marcas);
    }
    if (descricao.controle) filhos.push(deslizante(descricao.controle));
    else controle = null;
    if (descricao.botao) {
      const botao = documento.createElement('button');
      botao.type = 'button';
      botao.className = 'botao texto';
      botao.textContent = descricao.botao.rotulo;
      botao.title = descricao.botao.titulo ?? '';
      botao.addEventListener('click', () => descricao.botao.aoClicar());
      filhos.push(botao);
    }
    for (const linha of descricao.linhas ?? []) {
      const p = documento.createElement('p');
      if (linha.cor) {
        const amostra = documento.createElement('i');
        amostra.className = 'amostra';
        amostra.style.background = corCss(linha.cor);
        p.append(amostra);
      }
      p.append(linha.texto);
      filhos.push(p);
    }
    if (descricao.estado !== undefined) {
      const estado = documento.createElement('p');
      estado.className = 'estado-visao';
      estado.textContent = descricao.estado;
      filhos.push(estado);
    }
    caixa.replaceChildren(...filhos);
    caixa.setAttribute('aria-label', descricao.titulo);
    for (const [chave, valor] of Object.entries(descricao.dados ?? {})) {
      if (valor !== undefined && valor !== null) caixa.dataset[chave] = String(valor);
    }
  }

  function fechar(visao = null) {
    if (!caixa || (visao && caixa.dataset.visao !== visao)) return;
    caixa.remove();
    caixa = null;
    controle = null;
  }

  /* O ponteiro apertado (um arrasto de junta, uma órbita) e a soltura dele ou de uma tecla, ouvidos na captura da janela. */
  function aoSoltar(funcao) {
    let apertado = false;
    const descer = () => { apertado = true; };
    const soltar = () => { apertado = false; funcao(); };
    janela.addEventListener('pointerdown', descer, true);
    janela.addEventListener('pointerup', soltar, true);
    janela.addEventListener('pointercancel', soltar, true);
    janela.addEventListener('keyup', funcao, true);
    return {
      apertado: () => apertado,
      desligar() {
        janela.removeEventListener('pointerdown', descer, true);
        janela.removeEventListener('pointerup', soltar, true);
        janela.removeEventListener('pointercancel', soltar, true);
        janela.removeEventListener('keyup', funcao, true);
      },
    };
  }

  return {
    mostrar,
    fechar,
    aoSoltar,
    aCadaQuadro: (funcao) => aCadaQuadro(funcao, janela),
    /** A caixa em vigor, ou null; só para os testes. */
    get elemento() { return caixa; },
  };
}
