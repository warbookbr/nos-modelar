/* espessura-de-parede.mjs — régua de malha: a menor espessura de parede de cada parte (plano "núcleo para quem escreve receita", fatia 6).
 *
 * Do centro de uma face, um raio entra pelo material, no sentido contrário ao da normal. A espessura da parede naquele ponto é a distância até a
 * primeira face da MESMA parte em que o raio SAI do material, isto é, cuja normal aponta no sentido do raio: numa casca fechada é a parede oposta (o
 * fundo do copo, a lateral). Numa face sem parede do outro lado (superfície aberta) o raio não acha saída e a face não conta. A face enterrada num corpo
 * que se sobrepõe a outro (o raio para fora cruza um número ímpar de faces da parte) também não conta: não é parede, é junção. A espessura da parte é a
 * menor das medidas; a face que a deu fica registrada, para o aviso dizer onde olhar. Lê só `neutro.V` e `neutro.F`.
 *
 * O CUSTO É LIMITADO, para o `descrever` não passar do teto de tempo. Cada face medida custa um raio contra todos os triângulos da parte, e a amostra de
 * cada parte tem faces em passo fixo (na ordem dos ids, de modo que a conta é determinística) escolhido para faces × triângulos ficar em torno de
 * `orcamento`; o orçamento da peça, `ORCAMENTO_DA_PECA`, é dividido entre as partes, com no mínimo 1 milhão para cada uma, e por isso a soma das partes pode passar
 * dele. A régua acha parede fina que atravessa muitas faces (um copo, um tubo, uma chapa); a parede fina de uma face só numa parte grande pode escapar da
 * amostra, e `amostras` diz quantas faces foram medidas. */

/** O orçamento de testes de raio contra triângulo da peça inteira, dividido entre as partes (no mínimo 1 milhão para cada uma). */
export const ORCAMENTO_DA_PECA = 1.5e7;
/* Cruzamento a menos de 10 µm não é parede: é a quina viva (o bordo de fuga de uma asa) ou faces coincidentes, e entraria como espessura 0. */
const ANTES_DE_ZERO = 1e-5;

const nomeDaParte = (parte) => (parte === undefined || parte === null || parte === '' ? null : parte);

/** @returns {{ partes: Array<{ parte: string, minima: number, face: number, centro: number[], amostras: number, faces: number }> }} */
export function medirEspessuraDaParede(neutro, { orcamento } = {}) {
  const porParte = new Map();
  for (const face of [...neutro.F.values()].sort((a, b) => a.id - b.id)) {
    const nome = nomeDaParte(face.parte);
    if (nome === null || !Array.isArray(face.vs) || face.vs.length < 3) continue;
    if (!porParte.has(nome)) porParte.set(nome, []);
    porParte.get(nome).push(face);
  }
  const partes = [];
  const porParteOrcamento = orcamento ?? Math.max(1e6, ORCAMENTO_DA_PECA / Math.max(1, porParte.size));
  for (const [parte, faces] of porParte) {
    const triangulos = [];       // [ax, ay, az, bx, by, bz, cx, cy, cz] por triângulo, em leque a partir do primeiro canto
    const faixa = [];            // por face: [primeiro triângulo, último triângulo + 1]
    const normais = [];
    for (const face of faces) {
      const pontos = face.vs.map((v) => neutro.V.get(v));
      if (pontos.some((p) => !p)) { faixa.push(null); normais.push(null); continue; }
      const ini = triangulos.length;
      for (let k = 1; k < pontos.length - 1; k += 1) triangulos.push([...pontos[0], ...pontos[k], ...pontos[k + 1]]);
      faixa.push([ini, triangulos.length]);
      let x = 0, y = 0, z = 0;
      for (let k = 0; k < pontos.length; k += 1) {
        const a = pontos[k], b = pontos[(k + 1) % pontos.length];
        x += (a[1] - b[1]) * (a[2] + b[2]); y += (a[2] - b[2]) * (a[0] + b[0]); z += (a[0] - b[0]) * (a[1] + b[1]);
      }
      const n = Math.hypot(x, y, z);
      normais.push(n > 0 ? [x / n, y / n, z / n] : null);
    }
    const passo = Math.max(1, Math.ceil((faces.length * triangulos.length) / porParteOrcamento));
    let minima = Infinity, faceDaMinima = null, centroDaMinima = null, amostras = 0;
    for (let f = 0; f < faces.length; f += passo) {
      const n = normais[f];
      if (!n || !faixa[f]) continue;
      const pontos = faces[f].vs.map((v) => neutro.V.get(v));
      const o = [0, 1, 2].map((c) => pontos.reduce((s, p) => s + p[c], 0) / pontos.length);
      /* o centro de um quadrilátero cai sobre a diagonal do leque das faces vizinhas, e o raio que acerta a aresta de dois triângulos conta duas vezes; um deslocamento de 0,3 µm no plano da face, fixo, tira o raio da aresta */
      const w = [n[1] * 0.7571 - n[2] * 0.3011, n[2] * 0.5773 - n[0] * 0.7571, n[0] * 0.3011 - n[1] * 0.5773];
      const nw = Math.hypot(...w) || 1;
      for (let c = 0; c < 3; c += 1) o[c] += (w[c] / nw) * 3e-7;
      const d = [-n[0], -n[1], -n[2]];
      let melhor = Infinity, fora = 0;
      for (let t = 0; t < triangulos.length; t += 1) {
        if (t >= faixa[f][0] && t < faixa[f][1]) continue;
        const T = triangulos[t];
        const e1 = [T[3] - T[0], T[4] - T[1], T[5] - T[2]], e2 = [T[6] - T[0], T[7] - T[1], T[8] - T[2]];
        const h = [n[1] * e2[2] - n[2] * e2[1], n[2] * e2[0] - n[0] * e2[2], n[0] * e2[1] - n[1] * e2[0]];
        const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
        if (Math.abs(det) < 1e-18) continue;
        const s = [o[0] - T[0], o[1] - T[1], o[2] - T[2]];
        const u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det;
        if (u < 0 || u > 1) continue;
        const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
        const v = (n[0] * q[0] + n[1] * q[1] + n[2] * q[2]) / det;
        if (v < 0 || u + v > 1) continue;
        const dist = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det;   // com sinal, ao longo da normal da face
        if (dist > ANTES_DE_ZERO) { fora += 1; continue; }
        if (dist >= -ANTES_DE_ZERO) continue;
        /* o raio vai para dentro (contra a normal): só conta o cruzamento em que ele SAI do material, o da face atingida cuja normal aponta no sentido do raio */
        const nt = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];
        if (nt[0] * n[0] + nt[1] * n[1] + nt[2] * n[2] < 0 && -dist < melhor) melhor = -dist;
      }
      /* um número ímpar de cruzamentos para fora diz que o centro da face está dentro de outro corpo da parte (face enterrada, de corpos que se sobrepõem): não é parede */
      if (fora % 2 === 1) continue;
      amostras += 1;
      if (melhor < minima) { minima = melhor; faceDaMinima = faces[f].id; centroDaMinima = o; }
    }
    if (Number.isFinite(minima)) partes.push({ parte, minima, face: faceDaMinima, centro: centroDaMinima, amostras, faces: faces.length });
  }
  return { partes };
}

/** As partes cuja menor espessura fica abaixo de `limite` (em metro), da mais fina para a mais grossa. */
export function partesComParedeFina(neutro, { limite = 0.001, orcamento } = {}) {
  return medirEspessuraDaParede(neutro, { orcamento }).partes.filter((p) => p.minima < limite).sort((a, b) => a.minima - b.minima || (a.parte < b.parte ? -1 : 1));
}
