/* porta-confere-forma.js — a porta que a receita declara está na forma da peça.

   O resolvedor da montagem encaixa as peças pelo centro, eixo e raio que cada
   porta declara, e a relação compara porta com porta. Nada olhava a malha:
   uma porta posta alguns milímetros fora da face passava, e a peça ficava
   flutuando ou enterrada na vizinha sem aviso.

   A conferência mede duas coisas na peça executada. Primeiro, o plano: alguma
   face de onde a porta sai (`de`) precisa ter vértice no plano que passa pelo
   centro, perpendicular ao eixo. Segundo, o raio: entre os vértices das
   partes de onde a porta sai que ficam a até `FAIXA_DO_RAIO` desse plano, o
   mais afastado do eixo precisa estar no raio declarado (`raioExterno` do
   anel, `raio` do cilindro). A faixa existe porque a borda costuma ter chanfro ou filete: o
   anel da base do braço tem a face plana até 103,5 mm e o corpo em 105 mm, e
   a porta declara, com razão, o raio do corpo. A medida fica nas partes da
   origem porque outra parte da mesma peça pode passar perto do plano: o tambor
   do ombro desce até perto do plano do colar.

   Recebe o resultado do núcleo, com `facesDasPortas`, e devolve os achados. */
export const TOLERANCIA = 0.0001;
export const FAIXA_DO_RAIO = 0.010;

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mm = (m) => `${(m * 1000).toFixed(2)} mm`;

function medir(ponto, centro, eixo) {
  const d = sub(ponto, centro);
  const t = dot(d, eixo);
  return { t, r: Math.hypot(d[0] - t * eixo[0], d[1] - t * eixo[1], d[2] - t * eixo[2]) };
}

export function conferirPortasNaForma(neutro) {
  const achados = [];
  const facesDasPortas = neutro.facesDasPortas ?? new Map();
  for (const [id, porta] of neutro.portas ?? new Map()) {
    const I = porta.interface;
    if (!I || (I.forma !== 'anel' && I.forma !== 'cilindro')) continue;
    const n = Math.hypot(...I.eixo);
    const eixo = I.eixo.map((x) => x / n);
    const raio = I.forma === 'anel' ? I.raioExterno : I.raio;
    const faces = facesDasPortas.get(id) ?? [];
    const daOrigem = new Set();
    const partes = new Set();
    for (const f of faces) {
      const face = neutro.F.get(f);
      if (!face) continue;
      partes.add(face.parte);
      for (const v of face.vs) daOrigem.add(v);
    }
    if (!daOrigem.size) {
      achados.push({ porta: id, codigo: 'porta-sem-face', mensagem: `a porta '${id}' não resolve para nenhuma face da peça.` });
      continue;
    }
    let distancia = Infinity;
    for (const v of daOrigem) distancia = Math.min(distancia, Math.abs(medir(neutro.V.get(v), I.centro, eixo).t));
    if (distancia > TOLERANCIA) {
      achados.push({ porta: id, codigo: 'porta-fora-do-plano', mensagem: `a porta '${id}' declara o plano no centro ${JSON.stringify(I.centro)}, e a face mais perto da origem dela está a ${mm(distancia)} dele.`, desvio: distancia });
      continue;
    }
    const daParte = new Set();
    for (const face of neutro.F.values()) if (partes.has(face.parte)) for (const v of face.vs) daParte.add(v);
    let maior = 0;
    for (const v of daParte) {
      const { t, r } = medir(neutro.V.get(v), I.centro, eixo);
      if (Math.abs(t) <= FAIXA_DO_RAIO && r > maior) maior = r;
    }
    if (Math.abs(maior - raio) > TOLERANCIA) {
      achados.push({ porta: id, codigo: 'porta-com-raio-errado', mensagem: `a porta '${id}' declara raio ${mm(raio)}, e a peça junto do plano dela chega a ${mm(maior)} do eixo.`, desvio: maior - raio });
    }
  }
  return achados;
}
