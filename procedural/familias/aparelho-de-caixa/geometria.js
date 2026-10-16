/* geometria.js — as medidas do aparelho de caixa a partir dos parâmetros da família, em milímetro.

   Função pura sobre números. O corpo é uma caixa de quinas arredondadas com a frente aberta, fechada pela porta, que tem um
   furo passante (a abertura do visor) com a moldura da própria porta em volta. O vidro é uma peça separada, fina, dentro da
   abertura e recuada atrás da frente. O painel de comando fica à direita (painelDeComando 1) ou no topo (2), na frente do
   corpo, e os botões giratórios e de pressão ficam numa coluna ou numa linha dentro dele, em uma ou mais fileiras que
   atravessam a faixa (`fileirasDosBotoes`). O eixo x é a largura (o centro do
   corpo é x = 0), o eixo y sobe do chão (y = 0 é a face de baixo dos pés) e o eixo z é a profundidade, com a frente em +z.
   Os valores ficam em milímetro; a composição recebe metro (`composicoes.js`).

   As constantes de folga estão aqui e nas restrições de `familia.json`: se mudar uma, mude a outra. */

export const MARGEM_DA_PORTA = 3; // mm entre a porta e a lateral, o topo e o fundo do corpo
export const FOLGA_DO_PAINEL = 2; // mm entre a porta e o painel
export const RECUO_DO_PAINEL = 3; // mm que a face da frente do painel fica à frente da face do corpo
export const MARGEM_DO_PAINEL_NA_LATERAL = 1; // mm entre o painel à direita e a lateral do corpo: fica dentro da parede, sem face no plano da cavidade
export const CHANFRO_DA_PORTA = 2; // mm das arestas da porta: um chanfro pequeno, que é a borda da porta de longe (não é arredondamento)
export const RAIO_DO_PE = 14; // mm: pé de 28 mm de diâmetro, para aparecer de frente
export const RECUO_DO_PE = 30; // mm do pé até a lateral e até a frente do corpo
export const RAIO_DO_GIRATORIO = 15; // mm: diâmetro de 30 mm, o de um botão de forno
export const ALTURA_DO_GIRATORIO = 15; // mm do cilindro que sai do painel
export const SAIA_DO_GIRATORIO = 4; // mm que a saia da base passa do cilindro do botão
export const ALTURA_DA_SAIA = 3; // mm da saia, que sai do painel e sobra abaixo do cilindro
export const RAIO_DO_BOTAO_DE_PRESSAO = 9; // mm
export const ALTURA_DO_BOTAO_DE_PRESSAO = 6; // mm
export const PASSO_DOS_BOTOES = 50; // mm entre dois botões no painel (o diâmetro e a folga)
export const LADOS_DO_BOTAO = 24;
export const LADOS_DO_PE = 16;
export const FRACAO_DO_VISOR = 0.72; // a largura do visor como fração da porta, com o puxador horizontal
export const MOLDURA_DO_VISOR_EM_CIMA = 48; // mm entre o topo da porta e o topo do visor (com o puxador acima dele)
export const MOLDURA_DO_VISOR_EMBAIXO = 24; // mm entre a base da porta e a base do visor
export const FOLGA_DO_VIDRO = 0.5; // mm entre o vidro e a moldura: o vidro é peça própria e não toca a porta
export const ESPESSURA_DO_VIDRO = 2; // mm da placa de vidro
export const ALTURA_DO_PUXADOR = 14; // mm da barra
export const PROFUNDIDADE_DO_PUXADOR = 10; // mm da barra, para fora da porta
export const RECUO_DO_PUXADOR_DA_PORTA = 15; // mm do centro da barra até a face da porta: a barra fica afastada pelos suportes
export const SUPORTE_DO_PUXADOR = 12; // mm de largura de cada suporte
export const PROFUNDIDADE_DO_SUPORTE = RECUO_DO_PUXADOR_DA_PORTA - PROFUNDIDADE_DO_PUXADOR / 2 + 2; // mm, da face da porta até a barra, com 1 mm de sobra em cada ponta
export const RECUO_DO_PUXADOR_EM_CIMA = 36; // mm entre o topo da porta e a base da barra horizontal
export const RECUO_DO_PUXADOR_NA_BORDA = 24; // mm entre a borda esquerda da porta e a barra vertical
export const VAO_DA_GRELHA = 6; // mm de altura de cada barra da grelha
export const ESPESSURA_DA_GRELHA = 10; // mm de profundidade de cada barra da grelha
export const ESPESSURA_DO_INDICADOR = 3; // mm do indicador no topo do botão: sai 1,5 mm do topo

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
  const raio = parametros.raioDoCorpo;

  const k = Math.min(1, painel) * (2 - painel); // 1 com o painel à direita
  const s = Math.max(0, painel - 1); // 1 com o painel em cima
  const botoes = giratorios + pressao;
  const fileiras = parametros.fileirasDosBotoes;
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
    W, H, D, pes, esp, rec, parede, faixa, painel, giratorios, pressao, puxador, visor, raio, k, s, botoes, fileiras, zF,
    x0, x1, y0, y1, Dx, Dy, cx, cy, Vw, Vh, vy0, visorLargo, painelMm, grelhas,
    yTopoDoPainel: painelMm && k ? painelMm.y1 : 0,
    faixaDoPuxadorHorizontal: 0.55 * Dx,
    alturaDoPuxadorVertical: 0.5 * Dy,
    xDoPuxadorVertical: x0 + RECUO_DO_PUXADOR_NA_BORDA,
    zDoPuxador: zF + RECUO_DO_PUXADOR_DA_PORTA,
    zDoSuporte: zF - 1 + PROFUNDIDADE_DO_SUPORTE / 2,
  });
}

/* O centro (x, y) em mm do botão `i` no painel. Os botões enchem a grade por linhas longas: `fileiras` botões atravessam a faixa
   (a largura do painel à direita, a altura do painel em cima) e as linhas longas somam `ceil(botoes / fileiras)`. Com uma
   fileira é a coluna à direita de cima para baixo, ou a linha em cima da esquerda para a direita, como antes. */
export function posicaoDoBotao(g, i) {
  const linhas = Math.ceil(g.botoes / g.fileiras);
  const longo = Math.floor(i / g.fileiras);
  const atravessa = i % g.fileiras;
  const { x0, x1, y0, y1 } = g.painelMm;
  if (g.k) {
    return [x0 + (atravessa + 0.5) * ((x1 - x0) / g.fileiras), y1 - (longo + 0.5) * ((y1 - y0) / linhas)];
  }
  return [x0 + (longo + 0.5) * ((x1 - x0) / linhas), y0 + (atravessa + 0.5) * ((y1 - y0) / g.fileiras)];
}
