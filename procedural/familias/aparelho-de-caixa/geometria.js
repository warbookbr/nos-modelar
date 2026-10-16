/* geometria.js — as medidas do aparelho de caixa a partir dos parâmetros da família, em milímetro.

   Função pura sobre números. O corpo é uma caixa com a frente aberta, fechada pela porta, que tem o visor (uma janela
   com moldura e o vidro recuado atrás dela). O painel de comando fica à direita (painelDeComando 1) ou no topo (2), na
   frente do corpo, e os botões giratórios e de pressão ficam numa coluna ou numa linha dentro dele. O eixo x é a largura
   (o centro do corpo é x = 0), o eixo y sobe do chão (y = 0 é a face de baixo dos pés) e o eixo z é a profundidade, com
   a frente em +z. Os valores ficam em milímetro; a composição recebe metro (`composicoes.js`).

   As constantes de folga estão aqui e nas restrições de `familia.json`: se mudar uma, mude a outra. */

export const MARGEM_DA_PORTA = 3; // mm entre a porta e a lateral, o topo e o fundo do corpo
export const FOLGA_DO_PAINEL = 2; // mm entre a porta e o painel
export const RECUO_DO_PAINEL = 3; // mm que a face da frente do painel fica à frente da face do corpo
export const MARGEM_DO_PAINEL_NA_LATERAL = 1; // mm entre o painel à direita e a lateral do corpo: fica dentro da parede, sem face no plano da cavidade
export const CHANFRO_DO_CORPO = 1; // mm das quinas do corpo: menor que a parede mínima (2 mm), para sobrar um anel plano na frente
export const RAIO_DO_PE = 12; // mm
export const RECUO_DO_PE = 30; // mm do pé até a lateral e até a frente do corpo
export const RAIO_DO_GIRATORIO = 15; // mm: diâmetro de 30 mm, o de um botão de forno
export const ALTURA_DO_GIRATORIO = 15; // mm do cilindro que sai do painel
export const RAIO_DO_BOTAO_DE_PRESSAO = 9; // mm
export const ALTURA_DO_BOTAO_DE_PRESSAO = 6; // mm
export const PASSO_DOS_BOTOES = 50; // mm entre dois botões no painel (o diâmetro e a folga)
export const LADOS_DO_BOTAO = 24;
export const LADOS_DO_PE = 16;
export const FRACAO_DO_VISOR = 0.72; // a largura do visor como fração da porta, com o puxador horizontal
export const MOLDURA_DO_VISOR_EM_CIMA = 48; // mm entre o topo da porta e o topo do visor (com o puxador acima dele)
export const MOLDURA_DO_VISOR_EMBAIXO = 24; // mm entre a base da porta e a base do visor
export const ALTURA_DO_PUXADOR = 14; // mm da barra
export const PROFUNDIDADE_DO_PUXADOR = 14; // mm da barra, para fora da porta
export const SUPORTE_DO_PUXADOR = 12; // mm de largura de cada suporte
export const RECUO_DO_PUXADOR_EM_CIMA = 36; // mm entre o topo da porta e a base da barra horizontal
export const RECUO_DO_PUXADOR_NA_BORDA = 24; // mm entre a borda esquerda da porta e a barra vertical
export const VAO_DA_GRELHA = 6; // mm de altura de cada barra da grelha
export const ESPESSURA_DA_GRELHA = 10; // mm de profundidade de cada barra da grelha

/* Compõe a porta e o painel a partir do lado do painel (k: à direita; s: em cima), que a restrição de `familia.json` espelha. */
export function geometriaDoAparelho(parametros) {
  const W = parametros.largura;
  const H = parametros.altura;
  const D = parametros.profundidade;
  const pes = parametros.alturaDosPes;
  const esp = parametros.espessuraDaPorta;
  const rec = parametros.recessoDoVidro;
  const parede = parametros.parede;
  const faixa = parametros.faixaDoPainel;
  const painel = parametros.painelDeComando;
  const giratorios = parametros.botoesGiratorios;
  const pressao = parametros.botoesDePressao;
  const puxador = parametros.tipoDePuxador;
  const visor = parametros.comVisor;

  const k = Math.min(1, painel) * (2 - painel); // 1 com o painel à direita
  const s = Math.max(0, painel - 1); // 1 com o painel em cima
  const botoes = giratorios + pressao;
  const zF = D / 2 + esp; // a face da frente da porta

  const x0 = -W / 2 + MARGEM_DA_PORTA;
  const x1 = W / 2 - k * (faixa + FOLGA_DO_PAINEL) - (1 - k) * MARGEM_DA_PORTA;
  const y0 = pes + MARGEM_DA_PORTA;
  const y1 = H - MARGEM_DA_PORTA - s * (faixa + FOLGA_DO_PAINEL - MARGEM_DA_PORTA);
  const Dx = x1 - x0;
  const Dy = y1 - y0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;

  const visorLargo = puxador === 2;
  const Vw = visor ? (visorLargo ? Dx - 2 * 60 : FRACAO_DO_VISOR * Dx) : 0;
  const Vh = Dy - MOLDURA_DO_VISOR_EM_CIMA - MOLDURA_DO_VISOR_EMBAIXO;
  const vy0 = y0 + MOLDURA_DO_VISOR_EMBAIXO;

  const painelMm = k
    ? { x0: W / 2 - faixa, x1: W / 2 - MARGEM_DO_PAINEL_NA_LATERAL, y0: pes + MARGEM_DA_PORTA, y1: H - MARGEM_DA_PORTA }
    : s
      ? { x0: -W / 2 + MARGEM_DA_PORTA, x1: W / 2 - MARGEM_DA_PORTA, y0: H - faixa, y1: H - MARGEM_DA_PORTA }
      : null;

  const grelhas = visor
    ? [1, 2].map((j) => ({ yBase: vy0 + (j * Vh) / 3 - VAO_DA_GRELHA / 2 }))
    : [];

  return Object.freeze({
    W, H, D, pes, esp, rec, parede, faixa, painel, giratorios, pressao, puxador, visor, k, s, botoes, zF,
    x0, x1, y0, y1, Dx, Dy, cx, cy, Vw, Vh, vy0, visorLargo, painelMm, grelhas,
    yTopoDoPainel: painelMm && k ? painelMm.y1 : 0,
    faixaDoPuxadorHorizontal: 0.55 * Dx,
    alturaDoPuxadorVertical: 0.5 * Dy,
    xDoPuxadorVertical: x0 + RECUO_DO_PUXADOR_NA_BORDA,
  });
}

/** O centro (x, y) em mm do botão `i` no painel: de cima para baixo à direita, da esquerda para a direita em cima. */
export function posicaoDoBotao(g, i) {
  if (g.k) {
    const passo = (g.painelMm.y1 - g.painelMm.y0) / g.botoes;
    return [(g.painelMm.x0 + g.painelMm.x1) / 2, g.painelMm.y1 - (i + 0.5) * passo];
  }
  const passo = (g.painelMm.x1 - g.painelMm.x0) / g.botoes;
  return [g.painelMm.x0 + (i + 0.5) * passo, (g.painelMm.y0 + g.painelMm.y1) / 2];
}
