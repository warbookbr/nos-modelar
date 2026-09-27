/* braco-robotico/ombro — o ombro do braço robótico, sobre o anel da cintura:
 * um cilindro vertical de topo reto com uma face achatada vertical do lado do
 * braço, onde o anelOmbro se prende.
 *
 * Terceira etapa da montagem `braco-robotico/montagem.json`. O raio do corpo
 * vem do raio externo do anel da cintura (porta `topo`), por vínculo da
 * montagem no parâmetro `raioDoColar`, menos o degrau do plano. O desenho
 * anterior (colar, corpo em D e tambor) está em `../ombro-tambor`.
 *
 * Direções: Y para cima. Na foto frontal, que olha de +X para -X, o braço fica
 * à esquerda do ombro, e a esquerda dessa vista é +Z; a face achatada fica
 * então em +Z, no plano z = distanciaDaFace.
 *
 * Portas que a receita publica:
 *   apoio        — anel que ocupa, eixo +Y, centro no meio da face de baixo,
 *                  borda de baixo do corpo. Senta no `topo` do anel.
 *   juntaDoOmbro — anel que recebe, eixo +Z, centro no meio da face achatada,
 *                  o maior disco que cabe na face, faixa de 5 mm para dentro.
 *                  O anelOmbro se prende aqui.
 */

export const TABELA = {
  /* Raio externo do anel da cintura; a montagem o entrega por vínculo. */
  raioDoColar: 105,
  /* Degrau do anel para o corpo: o plano pede 200 mm de diâmetro sobre o
     anel de 210 mm. */
  degrauDoAnel: 5,
  altura: 177,
  /* Largura do ombro na foto frontal, do fundo curvo até a face achatada;
     na foto ela é igual à altura. Dá a distância da face ao eixo. */
  larguraNaFrontal: 177,
  filete: 5,
  /* Estações do filete em cada borda e pontos do contorno. */
  estacoesDoFilete: 4,
  pontosDoArco: 44,
  pontosDaFace: 8,
  anguloDoLiso: 30,
};

const m = (mm) => mm / 1000;
const ID = { corpo: 100 };

export function derivar(t = TABELA) {
  const R = m(t.raioDoColar - t.degrauDoAnel);
  const H = m(t.altura);
  const d = m(t.larguraNaFrontal) - R;
  const f = m(t.filete);
  const meiaCorda = Math.sqrt(R * R - d * d);
  return { R, H, d, f, meiaCorda, rJunta: Math.min(meiaCorda - f, H / 2 - f) };
}

/* Contorno em planta (x, z) do círculo de raio r cortado pelo plano z = dz,
   no sentido anti-horário visto de cima. */
function contornoD(r, dz, t) {
  const a0 = Math.asin(dz / r);
  const pts = [];
  const na = t.pontosDoArco, nf = t.pontosDaFace;
  const inicio = Math.PI - a0, fim = 2 * Math.PI + a0;
  for (let k = 0; k < na; k++) {
    const a = inicio + ((fim - inicio) * k) / na;
    pts.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  const xc = r * Math.cos(a0);
  for (let k = 0; k < nf; k++) pts.push([xc - (2 * xc * k) / nf, dz]);
  return pts;
}

export function gerarPassos(t = TABELA) {
  const { R, H, d, f } = derivar(t);
  const passos = [];
  const lados = t.pontosDoArco + t.pontosDaFace;
  /* corpo: loft vertical do contorno em D; nas bordas de cima e de baixo o
     contorno recua pelo quarto de círculo do filete, e as pontas fecham em
     polos no eixo, na mesma altura da última seção, para topo e base planos. */
  const secoes = [];
  const n = t.estacoesDoFilete;
  const anel = (y, recuo) => ({ pos: [0, y, 0], contorno: contornoD(R - recuo, d - recuo, t).map(([x, z]) => [x, z]) });
  const eps = 0.00001;
  secoes.push({ pos: [0, 0, 0], raio: 0 });
  for (let k = 0; k <= n; k++) {
    const a = (Math.PI / 2) * (k / n);
    secoes.push(anel(k === 0 ? eps : f - f * Math.cos(a), f - f * Math.sin(a)));
  }
  for (let k = n; k >= 0; k--) {
    const a = (Math.PI / 2) * (k / n);
    secoes.push(anel(k === 0 ? H - eps : H - f + f * Math.cos(a), f - f * Math.sin(a)));
  }
  secoes.push({ pos: [0, H, 0], raio: 0 });
  passos.push(['loft', { origemId: ID.corpo, lados, orientacao: [1, 0, 0], secoes }]);
  const sel = { origem: { op: 'loft', id: ID.corpo } };
  passos.push(['parte', { nome: 'corpo', sel }]);
  passos.push(['publicarPorta', {
    nome: 'apoio', de: sel.origem,
    interface: { forma: 'anel', papel: 'ocupa', eixo: [0, 1, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: R, inicio: 0, fim: 0.005 },
  }]);
  const { rJunta } = derivar(t);
  passos.push(['publicarPorta', {
    nome: 'juntaDoOmbro', de: sel.origem,
    interface: { forma: 'anel', papel: 'recebe', eixo: [0, 0, 1], centro: [0, H / 2, d], raioInterno: 0, raioExterno: rJunta, inicio: -0.005, fim: 0 },
  }]);
  passos.push(['liso', { sel, angulo: t.anguloDoLiso }]);
  return passos;
}

const receita = {
  meta: { nome: 'braco-robotico/ombro', desc: 'ombro do braço robótico: cilindro com face achatada para o anelOmbro' },
  PARAMS: TABELA,
  TOPO: { origem: 'centro da face de baixo do corpo; y para cima, a face achatada para +Z' },
  PLANO: {
    objeto: 'ombro do braço robótico, desenho novo: gira com a cintura sobre o anel e carrega, na face lateral, o anelOmbro da junta do ombro, de eixo horizontal',
    referencias: [
      '../../referencias/frontal.png',
      '../../referencias/lateral-sem-cabo.png',
      '../../referencias/lateral-sem-cabo.prancha.png',
      '../../referencias/frontal.pacote/mapa-de-partes.png',
    ],
    escala: { medida: 'diâmetro do anel da cintura, onde o ombro assenta', milimetros: 210 },
    partes: [
      { nome: 'corpo', forma: 'cilindro vertical de 200 mm de diâmetro e 177 mm de altura, topo reto, com uma face achatada vertical do lado do braço onde o anelOmbro se prende; filete de 5 mm nas bordas do topo e da base', tecnica: 'revolução com perfil, cortada por um plano vertical na face achatada; filete nas bordas' },
    ],
    criteriosDeReprovacao: [
      'diâmetro do corpo fora de 200 mm com margem de 5 mm',
      'altura do corpo fora de 177 mm com margem de 5 mm',
      'topo que não é plano',
      'face achatada que não é vertical, ou com altura menor que os 164 mm do anelOmbro, ou com o centro fora do eixo horizontal da junta do ombro',
      'corpo que não encosta no anel da cintura ou que o atravessa',
      'bordas do topo e da base em quina viva, sem o filete',
    ],
  },
  contatos: [],
  /* Pontos do plano, em mm no referencial do ombro: diâmetro 200 e altura
     177 com margem de 5 mm; o máximo em Z é a face achatada, em +Z. */
  PONTOS: [
    { nome: 'cantoDeBaixoAtras', parte: 'corpo', medida: 'minimo', em: [-100, 0, -100], toleranciaMm: 5 },
    { nome: 'cantoDeCimaNaFace', parte: 'corpo', medida: 'maximo', em: [100, 177, 77], toleranciaMm: 5 },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
