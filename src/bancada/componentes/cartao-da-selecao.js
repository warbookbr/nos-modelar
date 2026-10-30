/* cartao-da-selecao.js — o cartão da seleção no tema Foco: o nome e as medidas da parte escolhida, as ações de uma parte e o caminho para os detalhes, ancorado ao lado da parte na tela.
 *
 * Lê do estado central `selecao`, `temHierarquia`, `visao`, `juntas`, `malhaEmEdicao` e `paineis`. Aparece com a
 * seleção e some no modo de edição, quando o painel da direita está aberto (ele mostra o mesmo) e sem nada escolhido.
 * As ações são as mesmas do painel da direita (`acoes`), e não uma segunda cópia: focar, isolar, fantasma (o contexto),
 * arame só da seleção, ocultar, opacidade e selecionar o conjunto.
 *
 * A posição sai de `caixaNaTela()`, a caixa da seleção em coordenadas normalizadas da cena, a cada quadro enquanto o
 * cartão está à vista: a câmera gira e o cartão acompanha a parte. A conta é `posicaoDoCartao`, pura. A cena é o retângulo
 * do canvas (`cena`), que no tema Bancada fica entre os painéis fixos e no Revisão é só o lado da peça, e não começa na
 * borda da janela; sem ele vale a janela inteira. */
import { formatarNome } from '../formatar.js';

/** As margens da tela que o cartão não cobre: a barra do alto, a barra de estado e os lados. */
export const MARGENS_DO_CARTAO = Object.freeze({ topo: 72, base: 48, esquerda: 16, direita: 16 });
const AFASTAMENTO = 24;

/**
 * Onde o canto de cima e da esquerda do cartão fica, em pixels: à direita da caixa da parte, na altura do meio dela, ou
 * à esquerda quando à direita não cabe, e sempre dentro das margens.
 */
export function posicaoDoCartao({ caixa, tela, cartao, cena = tela, margens = MARGENS_DO_CARTAO }) {
  const paraX = (ndc) => (cena.esquerda ?? 0) + ((ndc + 1) / 2) * cena.largura;
  const paraY = (ndc) => (cena.topo ?? 0) + ((1 - ndc) / 2) * cena.altura;
  const esquerda = paraX(caixa.esquerda);
  const direita = paraX(caixa.direita);
  const meio = (paraY(caixa.topo) + paraY(caixa.base)) / 2;
  const limiteDireito = tela.largura - margens.direita - cartao.largura;
  let x = direita + AFASTAMENTO;
  if (x > limiteDireito) x = esquerda - AFASTAMENTO - cartao.largura;
  x = Math.min(Math.max(x, margens.esquerda), Math.max(margens.esquerda, limiteDireito));
  /* O cartão não sobe acima do alto da cena, que no Revisão começa abaixo do cabeçalho da peça. */
  const topo = Math.max(margens.topo, (cena.topo ?? 0) + AFASTAMENTO / 3);
  const y = Math.min(Math.max(meio - cartao.altura / 2, topo), Math.max(topo, tela.altura - margens.base - cartao.altura));
  return { x: Math.round(x), y: Math.round(y) };
}

const formatoDaMedida = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatoDasFaces = new Intl.NumberFormat('pt-BR');

/** '0,62 × 1,06 × 1,06 m · 288 faces' */
export function textoDasMedidas(medidas) {
  if (!medidas) return '';
  const [x, y, z] = medidas.tamanho;
  return `${[x, y, z].map((valor) => formatoDaMedida.format(valor)).join(' × ')} m · ${formatoDasFaces.format(medidas.faces)} faces`;
}

export function montarCartaoDaSelecao({
  elementos, estado, acoes, caixaNaTela, medidas, margens = () => MARGENS_DO_CARTAO, janela = globalThis,
}) {
  const { cartao, titulo, medidasTexto, botoes, opacidade, valorOpacidade, cena } = elementos;
  if (!cartao) return { posicionar() {} };
  let quadro = 0;

  function visivel({ selecao, juntas, malhaEmEdicao, paineis }) {
    return Boolean(selecao?.selecionadas.length) && !juntas.modo && !malhaEmEdicao && !paineis?.inspecao;
  }

  function posicionar() {
    const caixa = caixaNaTela();
    if (!caixa) {
      cartao.style.visibility = 'hidden';
      return;
    }
    const tela = { largura: janela.innerWidth ?? 1400, altura: janela.innerHeight ?? 900 };
    const retangulo = cena?.getBoundingClientRect?.();
    const { x, y } = posicaoDoCartao({
      caixa,
      tela,
      cena: retangulo?.width
        ? { esquerda: retangulo.left, topo: retangulo.top, largura: retangulo.width, altura: retangulo.height }
        : tela,
      cartao: { largura: cartao.offsetWidth || 304, altura: cartao.offsetHeight || 200 },
      margens: margens(),
    });
    cartao.style.visibility = 'visible';
    cartao.style.transform = `translate(${x}px, ${y}px)`;
  }

  function acompanhar() {
    posicionar();
    quadro = janela.requestAnimationFrame(acompanhar);
  }

  function refletir(valores) {
    const mostrar = visivel(valores);
    const mudouVisibilidade = cartao.hidden === mostrar;
    cartao.hidden = !mostrar;
    if (!mostrar) {
      janela.cancelAnimationFrame(quadro);
      quadro = 0;
      return;
    }
    const { selecao, temHierarquia, visao } = valores;
    const nomes = selecao.selecionadas;
    titulo.textContent = nomes.length === 1 ? formatarNome(nomes[0]) : `${nomes.length} partes`;
    medidasTexto.textContent = textoDasMedidas(medidas());
    botoes.isolar?.setAttribute('aria-pressed', String(selecao.modo === 'isolar'));
    botoes.fantasma?.setAttribute('aria-pressed', String(selecao.modo === 'contexto'));
    botoes.arame?.setAttribute('aria-pressed', String(Boolean(selecao.wireframeSelecao)));
    if (botoes.arame) botoes.arame.disabled = visao === 'raio-x';
    if (botoes.conjunto) {
      botoes.conjunto.hidden = !temHierarquia;
      botoes.conjunto.disabled = !selecao.temDescendentes;
    }
    const porcento = Math.round(selecao.opacidadeSelecao * 100);
    if (opacidade) opacidade.value = String(porcento);
    if (valorOpacidade) valorOpacidade.value = `${porcento}%`;
    if (mudouVisibilidade || !quadro) {
      janela.cancelAnimationFrame(quadro);
      acompanhar();
    }
  }

  estado.assinar(['selecao', 'temHierarquia', 'visao', 'juntas', 'malhaEmEdicao', 'paineis'], refletir);

  const modo = () => estado.obter('selecao')?.modo;
  botoes.fechar?.addEventListener('click', () => acoes.limpar());
  botoes.focar?.addEventListener('click', () => acoes.focarSelecao());
  botoes.isolar?.addEventListener('click', () => acoes.definirModo(modo() === 'isolar' ? 'todas' : 'isolar'));
  botoes.fantasma?.addEventListener('click', () => acoes.definirModo(modo() === 'contexto' ? 'todas' : 'contexto'));
  botoes.arame?.addEventListener('click', () => acoes.alternarWireframeSelecao());
  botoes.ocultar?.addEventListener('click', () => acoes.ocultarSelecao());
  botoes.conjunto?.addEventListener('click', () => acoes.selecionarConjunto());
  botoes.detalhes?.addEventListener('click', () => acoes.abrirDetalhes());
  opacidade?.addEventListener('input', () => acoes.definirOpacidadeSelecao(Number(opacidade.value) / 100));

  return { posicionar };
}
