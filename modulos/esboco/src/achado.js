/* Imagem de um achado: só as peças envolvidas saem coloridas (a primeira em laranja, a segunda em azul), o resto sai em
   cinza translúcido, sem legenda numerada, sem balões, sem título e sem escala, e o quadro é um zoom no ponto do achado
   (o centro da região em que as duas peças se tocam ou se atravessam, ou o meio do vão entre elas). Puro: devolve o SVG
   e as medidas da janela; a conversão em PNG é da linha de comando. */
import { desenharEsboco, ErroDeEsboco, resolverOpcao, VISTAS } from './index.js';
import { expandirEsboco } from './expandir.js';
import { quisDizer } from './parecido.js';

export const COR_DA_PRIMEIRA = 'laranja';
export const COR_DA_SEGUNDA = 'azul';
export const COR_DO_RESTO = '#c9ced6';
export const OPACIDADE_DO_RESTO = 0.5;
export const LADO_DA_IMAGEM = 640;
const JANELA_MINIMA = 200;
const JANELA_MAXIMA = 700;
const limitar = (x, a, b) => Math.min(b, Math.max(a, x));
const arred = (x) => Math.round(x * 10) / 10;

/* O ponto do achado e o tamanho da janela, em mm, a partir das caixas das peças envolvidas. */
export function pontoDoAchado(resolvidas, pecas) {
  const envolvidas = pecas.map((id) => resolvidas.find((r) => r.id === id)).filter(Boolean);
  const todas = resolvidas;
  const meio = (r) => r.min.map((v, i) => (v + r.max[i]) / 2);
  if (envolvidas.length >= 2) {
    const [a, b] = envolvidas;
    const ponto = [0, 1, 2].map((i) => {
      const lo = Math.max(a.min[i], b.min[i]);
      const hi = Math.min(a.max[i], b.max[i]);
      if (hi >= lo) return (lo + hi) / 2;
      return a.max[i] < b.min[i] ? (a.max[i] + b.min[i]) / 2 : (b.max[i] + a.min[i]) / 2;
    });
    const trecho = [0, 1, 2].map((i) => Math.abs(Math.min(a.max[i], b.max[i]) - Math.max(a.min[i], b.min[i])));
    return { ponto, janela: limitar(6 * Math.max(...trecho), JANELA_MINIMA, JANELA_MAXIMA) };
  }
  if (envolvidas.length === 1) {
    const r = envolvidas[0];
    return { ponto: meio(r), janela: limitar(1.6 * Math.max(...r.max.map((v, i) => v - r.min[i])), JANELA_MINIMA, JANELA_MAXIMA) };
  }
  const min = [0, 1, 2].map((i) => Math.min(...todas.map((r) => r.min[i])));
  const max = [0, 1, 2].map((i) => Math.max(...todas.map((r) => r.max[i])));
  return { ponto: min.map((v, i) => (v + max[i]) / 2), janela: limitar(1.1 * Math.max(...max.map((v, i) => v - min[i])), JANELA_MINIMA, JANELA_MAXIMA) };
}

/* `divergencia`: uma entrada de `medirEsboco(...).divergencias` ({ n, opcao, pecas, ... }). Devolve
   { svg, largura, altura, vista, ponto, janela_mm, escala_px_por_mm, pecas, cores, esboco }. `esboco` é o JSON simples que
   desenhou a imagem (uma opção, formas coloridas). */
export function imagemDoAchado(bruto, divergencia, { vista = 'isometrica', lado = LADO_DA_IMAGEM } = {}) {
  const esboco = expandirEsboco(bruto);
  const opcoes = Array.isArray(esboco.opcoes) ? esboco.opcoes : [];
  const i = opcoes.findIndex((o, k) => (o.titulo ?? `Opção ${k + 1}`) === divergencia.opcao);
  if (i < 0) throw new ErroDeEsboco(`achado: a opção "${divergencia.opcao}" não existe no esboço (opções: ${opcoes.map((o, k) => o.titulo ?? `Opção ${k + 1}`).join(', ')})`);
  if (!VISTAS[vista]) throw new ErroDeEsboco(`achado: a vista "${vista}" não existe${quisDizer(vista, Object.keys(VISTAS))} (vistas: ${Object.keys(VISTAS).join(', ')})`);
  const opcao = opcoes[i];
  const visiveis = resolverOpcao(opcao, `opção ${i + 1}`, esboco.pontos).filter((r) => r.forma.oculto !== true);
  const { ponto, janela } = pontoDoAchado(visiveis, divergencia.pecas);
  const cores = {};
  divergencia.pecas.slice(0, 2).forEach((id, k) => { cores[id] = k === 0 ? COR_DA_PRIMEIRA : COR_DA_SEGUNDA; });
  const formas = opcao.formas.map((f) => {
    const { rotulo, ocultar, linhaCentro, ...resto } = f;
    void rotulo; void ocultar; void linhaCentro;
    const envolvida = Object.hasOwn(cores, f.id);
    return { ...resto, cor: envolvida ? cores[f.id] : COR_DO_RESTO, ...(envolvida ? { opacidade: 1 } : { opacidade: OPACIDADE_DO_RESTO }) };
  });
  const desenho = {
    vista,
    ladosPorEscala: true,
    geometria: true,
    ocultar: ['legendas', 'numeracao', 'marcadores', 'linhasCentro', 'escala', 'titulo', 'nota'],
    ...(esboco.pontos ? { pontos: esboco.pontos } : {}),
    opcoes: [{ titulo: opcao.titulo, ...(opcao.pontos ? { pontos: opcao.pontos } : {}), ...(opcao.giros ? { giros: opcao.giros } : {}), formas }],
  };
  const { svg, geometria, escala } = desenharEsboco(desenho);
  const { cx, cy } = geometria.paineis[0];
  const p = VISTAS[vista].p(ponto);
  const centro = [cx + p[0] * escala, cy + p[1] * escala];
  const lado_px = janela * escala;
  const x = centro[0] - lado_px / 2;
  const y = centro[1] - lado_px / 2;
  const ajustado = svg
    .replace(/^<svg [^>]*>/, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${arred(x)} ${arred(y)} ${arred(lado_px)} ${arred(lado_px)}" width="${lado}" height="${lado}" font-family="Helvetica, Arial, sans-serif">`)
    .replace(/^(<svg [^>]*>)\n<rect [^>]*\/>/, `$1\n<rect x="${arred(x)}" y="${arred(y)}" width="${arred(lado_px)}" height="${arred(lado_px)}" fill="#ffffff"/>`);
  return { svg: ajustado, largura: lado, altura: lado, vista, ponto: ponto.map(arred), janela_mm: arred(janela), escala_px_por_mm: lado / janela, pecas: divergencia.pecas, cores, esboco: desenho };
}
