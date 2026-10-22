/* placa-de-prova.mjs — a chapa desenhada por código com que se prova o mapa com sinal, a curvatura comparada e os cortes da
   régua: uma chapa quadrada de 300 mm de lado, em x e z, com a face de cima para +y, que pode ter uma onda senoidal em x, ser
   deslocada para cima ou para baixo, ter a orientação invertida e terminar, na borda x = 300 mm, numa aba que dobra 90 graus
   para cima com o raio de dobra declarado. Em metro, y para cima e frente em +z; nenhum dado vem de referência externa. */

export const LADO = 0.3;
/** A caixa de medida que cobre a chapa e a aba inteiras, com folga: x, y, z. */
export const CAIXA = '0,0.32,-0.05,0.1,-0.01,0.31';

/** O perfil em (x, y) ao longo de x: a chapa até a borda e, com `aba`, o raio da dobra e a altura da aba. */
function perfil({ passo, onda, aba, desloca }) {
  const pontos = [];
  const x1 = aba ? LADO - aba.raio : LADO;
  const n = Math.round(x1 / passo);
  for (let i = 0; i <= n; i++) {
    const x = (x1 * i) / n;
    pontos.push([x, desloca + (onda ? onda.amplitude * Math.sin((2 * Math.PI * x) / onda.comprimento) : 0)]);
  }
  if (aba) {
    for (let k = 1; k <= 8; k++) {
      const t = (k / 8) * (Math.PI / 2);
      pontos.push([x1 + aba.raio * Math.sin(t), desloca + aba.raio * (1 - Math.cos(t))]);
    }
    const m = Math.max(1, Math.round((aba.altura - aba.raio) / 0.0025));
    for (let k = 1; k <= m; k++) pontos.push([LADO, desloca + aba.raio + ((aba.altura - aba.raio) * k) / m]);
  }
  return pontos;
}

/** A chapa em OBJ. Opções: `onda` ({ amplitude, comprimento } em metro, em x), `aba` ({ raio, altura } em metro), `desloca`
 *  (metro, para cima), `inverter` (vira o sentido das faces), `passo` (metro). */
export function obj({ passo = 0.005, onda = null, aba = null, desloca = 0, inverter = false } = {}) {
  const P = perfil({ passo, onda, aba, desloca });
  const nz = Math.round(LADO / passo);
  const V = [];
  for (const [x, y] of P) for (let j = 0; j <= nz; j++) V.push([x, y, (LADO * j) / nz]);
  const id = (i, j) => i * (nz + 1) + j + 1;
  const F = [];
  for (let i = 0; i + 1 < P.length; i++) {
    for (let j = 0; j < nz; j++) {
      const q = [id(i, j), id(i, j + 1), id(i + 1, j + 1), id(i + 1, j)];
      F.push(inverter ? q.reverse() : q);
    }
  }
  return ['o placa', ...V.map((v) => `v ${v.map((c) => c.toFixed(6)).join(' ')}`), ...F.map((f) => `f ${f.join(' ')}`)].join('\n') + '\n';
}
