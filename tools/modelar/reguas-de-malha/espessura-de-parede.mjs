/* espessura-de-parede.mjs — régua de malha: a menor espessura de parede de cada parte (plano "núcleo para quem escreve receita", fatia 6).
 *
 * Do centro de uma face, um raio entra pelo material, no sentido contrário ao da normal, e a distância até a primeira face da MESMA parte que ele
 * cruza é a espessura da parede naquele ponto: numa casca fechada é a parede oposta (o fundo do copo, a lateral), e numa face sem parede do outro lado
 * (superfície aberta) o raio não acha nada e a face não conta. A espessura da parte é a menor das medidas; a face que a deu fica registrada, para
 * o aviso dizer onde olhar. Lê só `neutro.V` e `neutro.F`.
 *
 * O CUSTO É LIMITADO, para o `descrever` não passar do teto de tempo: cada parte gasta no máximo `orcamento` testes (a peça, `ORCAMENTO_DA_PECA` dividido entre as partes) de raio contra triângulo, e a parte
 * grande mede só uma amostra das faces, em passo fixo e na ordem dos ids (a conta é determinística). A régua acha parede fina que atravessa muitas faces
 * (um copo, um tubo, uma chapa); a parede fina de uma face só numa parte grande pode escapar da amostra, e `amostras` diz quantas faces foram medidas. */

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
      const d = [-n[0], -n[1], -n[2]];
      amostras += 1;
      let melhor = Infinity;
      for (let t = 0; t < triangulos.length; t += 1) {
        if (t >= faixa[f][0] && t < faixa[f][1]) continue;
        const T = triangulos[t];
        const e1 = [T[3] - T[0], T[4] - T[1], T[5] - T[2]], e2 = [T[6] - T[0], T[7] - T[1], T[8] - T[2]];
        const h = [d[1] * e2[2] - d[2] * e2[1], d[2] * e2[0] - d[0] * e2[2], d[0] * e2[1] - d[1] * e2[0]];
        const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
        if (Math.abs(det) < 1e-18) continue;
        const s = [o[0] - T[0], o[1] - T[1], o[2] - T[2]];
        const u = (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]) / det;
        if (u < 0 || u > 1) continue;
        const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
        const v = (d[0] * q[0] + d[1] * q[1] + d[2] * q[2]) / det;
        if (v < 0 || u + v > 1) continue;
        const dist = (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]) / det;
        if (dist > ANTES_DE_ZERO && dist < melhor) melhor = dist;
      }
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
