/* furgao-realista, receita/farol.js — os contornos das luzes da frente e da grade e das lanternas de trás: o farol, a luz de canto e o pisca lateral (etapa 8,
 * `referencias/luzes.md`) e a grade e as lanternas (etapa 6). Cada luz é um vão aberto na chapa pronta por `aberturaPorContorno`, com a lente recuada: o farol visto pela
 * frente ([x, y] em mm, na camada da frente), a luz de canto pela diagonal da quina e o pisca lateral pelo eixo x. O lado esquerdo (+x) leva o desenho, e o direito o espelha. */

/** O contorno fechado de `curva2d` a partir de pontos [x, y] em mm, levados por `esc` (m, de mm a metro). `raios` é um número para todos os
 *  cantos, ou uma função do ponto que dá o raio (mm) do canto dele; raio 0 deixa o canto vivo. */
export const contornoPorRetos = (pontos, esc, raios = 0) => {
  const raio = (p) => (typeof raios === 'function' ? raios(p) : raios);
  return {
    inicio: pontos[0].map(esc),
    trechos: [...pontos.slice(1), pontos[0]].flatMap((p) => [{ reto: p.map(esc) }, ...(raio(p) ? [{ concordancia: esc(raio(p)) }] : [])]),
  };
};

/** A superfície da frente da chapa na planta (o retângulo de quinas redondas da frente, com o raio, a lateral e a frente de cada altura), para pôr as luzes
 *  sobre ela: `zS(x, y)` é o z da superfície, `ponto(u, y)` o ponto onde a reta do olhar da luz de canto (a diagonal da quina, u = (x - z) / raiz de 2) a atravessa,
 *  e `fimDoArco(y)` o z onde a quina acaba e a lateral começa. */
export function superficieDaFrente(T, f) {
  const dados = (y) => { const R = f.raioFrente(y); const xL = f.xs(y); const zF = f.zF(y); return { R, xL, zF, xc: xL - R, zc: zF - R }; };
  const zS = (x, y) => {
    const { R, xc, zc, zF } = dados(y);
    if (x <= xc) return zF;
    return zc + Math.sqrt(Math.max(0, R * R - Math.min(x - xc, R) ** 2));
  };
  const sdf = (x, z, d) => (x > d.xc && z > d.zc ? Math.hypot(x - d.xc, z - d.zc) - d.R : Math.max(x - d.xL, z - d.zF));
  /* o ponto da superfície na reta [u, y] com direção w = (1, 0, 1) / raiz de 2: x = (u + w) / raiz de 2, z = (w - u) / raiz de 2 */
  const ponto = (u, y) => {
    const d = dados(y);
    const em = (w) => [(u + w) / Math.SQRT2, y, (w - u) / Math.SQRT2];
    let lo = 0; let hi = 6000;
    for (let k = 0; k < 60; k += 1) { const mid = (lo + hi) / 2; const p = em(mid); if (sdf(p[0], p[2], d) < 0) lo = mid; else hi = mid; }
    return em((lo + hi) / 2);
  };
  return { zS, ponto, uDe: (x, z) => (x - z) / Math.SQRT2, fimDoArco: (y) => { const d = dados(y); return [d.xL, d.zc]; } };
}

/** Os dois faróis em mm [x, y]: o esquerdo (+x) é o trapézio da TABELA (lado de dentro vertical, o de fora inclinado com o topo mais curto que a base), e
 *  o direito o espelho, na ordem invertida. */
export function derivarFarois(T) {
  const espelhar = (pts) => pts.map(([x, y]) => [-x, y]).reverse();
  const base = T.farol_x_fora_base - T.farol_x_dentro;
  const xTopo = T.farol_x_fora_base - T.farol_inclinacao * base;
  const f = [[T.farol_x_dentro, T.farol_y_base], [T.farol_x_fora_base, T.farol_y_base], [xTopo, T.farol_y_topo], [T.farol_x_dentro, T.farol_y_topo]];
  return [{ lado: 'Esquerdo', farol: f, raios: f.map(() => T.farol_raio) }, { lado: 'Direito', farol: espelhar(f), raios: f.map(() => T.farol_raio) }];
}

/** As duas luzes de canto, em mm [u, y] no plano da vista pela diagonal da quina (a de +x olha ao longo de [1, 0, 1], com u = (x - z) / raiz de 2; a de -x é o
 *  espelho, com u trocado de sinal): o lado de dentro é o inclinado do farol deslocado pela fresta (a mesma inclinação), o topo e a base são horizontais, a base é curta
 *  e o lado de fora é curvo e entra `luz_canto_entra_lado` mm na lateral. Os pontos de dentro saem da superfície da chapa nas alturas da base e do topo do farol. */
export function derivarLuzesDeCanto(T, f) {
  const S = superficieDaFrente(T, f);
  const y0 = T.farol_y_base; const y1 = T.farol_y_topo; const ym = (y0 + y1) / 2;
  const [farol] = derivarFarois(T);
  const xFb = farol.farol[1][0]; const xFt = farol.farol[2][0];
  const uBi = S.uDe(xFb + T.luz_canto_fresta, S.zS(xFb + T.luz_canto_fresta, y0));
  const uTi = S.uDe(xFt + T.luz_canto_fresta, S.zS(xFt + T.luz_canto_fresta, y1));
  const fim = (y) => { const [xL, zc] = S.fimDoArco(y); return S.uDe(xL, zc - T.luz_canto_entra_lado); };
  const uTo = fim(y1);
  const uBo = uBi + T.luz_canto_base_razao * (uTo - uTi);
  const uMo = (uBo + uTo) / 2 + T.luz_canto_barriga;
  const poly = [[uBi, y0], [uBo, y0], [uMo, ym], [uTo, y1], [uTi, y1]];
  const raios = [T.farol_raio, ...T.luz_canto_raios, T.farol_raio];
  const espelhar = (pts) => pts.map(([u, y]) => [-u, y]).reverse();
  return [
    { lado: 'Esquerda', vista: [1, 0, 1], contorno: poly, raios },
    { lado: 'Direita', vista: [-1, 0, 1], contorno: espelhar(poly), raios: [...raios].reverse() },
  ];
}

/** Os dois piscas laterais em mm [u, y] na vista pelo eixo x (a de +x olha ao longo de [1, 0, 0], com u = -z; a de -x ao longo de [-1, 0, 0], com u = z): a pílula
 *  de `pisca_lateral_z` por `pisca_lateral_y`, com a ponta da frente mais baixa (`pisca_lateral_afinamento`) e as pontas redondas. */
export function derivarPiscasLaterais(T) {
  const [z0, z1] = T.pisca_lateral_z; const [y0, y1] = T.pisca_lateral_y; const af = T.pisca_lateral_afinamento;
  const esq = [[-z1, y0 + af], [-z0, y0], [-z0, y1], [-z1, y1 - af]];
  const dir = esq.map(([u, y]) => [-u, y]).reverse();
  const raios = esq.map(() => T.pisca_lateral_raio);
  return [{ lado: 'Esquerdo', vista: [1, 0, 0], contorno: esq, raios }, { lado: 'Direito', vista: [-1, 0, 0], contorno: dir, raios }];
}

/** O raio de cada canto como função do ponto (pela identidade do array), para `contornoPorRetos`. */
export const raiosDoContorno = (pontos, raios) => { const mapa = new Map(pontos.map((p, k) => [p, raios[k]])); return (p) => mapa.get(p) ?? 0; };

/** A grade, em mm [x, y]: o retângulo de `grade_meia_largura` de lado a lado, do topo do para-choque, menos `grade_embutido` (por trás da pele dele), a `grade_topo_y`, com os
 *  cantos de cima de raio `grade_raio_topo` e os de baixo vivos; e as barras, uma por altura de `grade_barras_y`. */
export function derivarGrade(T) {
  const w = T.grade_meia_largura; const y0 = T.secao_parachoque_dianteiro.at(-1)[1] - T.grade_embutido; const y1 = T.grade_topo_y;
  const contorno = [[-w, y0], [w, y0], [w, y1], [-w, y1]];
  return { contorno, raio: (p) => (p[1] === y1 ? T.grade_raio_topo : 0), barras: T.grade_barras_y.map((y) => ({ y })) };
}

/** As duas lanternas de trás, em mm [u, v] no plano da vista pela diagonal da quina (a opção 1 de `referencias/lanterna-traseira.esboco.json`):
 *  um vão só por lanterna, de `lanterna_base_y` a `lanterna_topo_y`, da borda de dentro na face de trás (x `lanterna_x_dentro`), dobrando a
 *  quina e entrando `lanterna_entra_lado` mm na lateral além do fim do arco. Na quina de +x (a esquerda) a vista olha ao longo de [1, 0, -1],
 *  com u = -(x + z) / raiz de 2 e v = y; na de -x a vista é [-1, 0, -1] e o desenho é o espelho (u troca de sinal). A face de trás e a
 *  lateral são lidas na altura do meio do vão, onde a lateral ainda é vertical. */
export function derivarLanternas(T, f) {
  const yMeio = (T.lanterna_base_y + T.lanterna_topo_y) / 2;
  const zTras = f.zR(yMeio); const xLado = f.xBordaTraseira(yMeio) + T.raio_planta_tras;
  const u = (x, z) => -(x + z) / Math.SQRT2;
  const uDentro = u(T.lanterna_x_dentro, zTras);
  const uFora = u(xLado, zTras + T.raio_planta_tras + T.lanterna_entra_lado);
  const y0 = T.lanterna_base_y; const y1 = T.lanterna_topo_y;
  const retangulo = (lo, hi) => [[lo, y0], [hi, y0], [hi, y1], [lo, y1]];
  return [
    { lado: 'Esquerda', vista: [1, 0, -1], contorno: retangulo(uFora, uDentro) },
    { lado: 'Direita', vista: [-1, 0, -1], contorno: retangulo(-uDentro, -uFora) },
  ];
}
