/* porta-confere-forma.js — a porta que a receita declara está na forma da peça.

   O resolvedor da montagem encaixa as peças pelo centro, eixo e raio que cada
   porta declara, e a relação compara porta com porta. Nada olhava a malha:
   uma porta posta alguns milímetros fora da face passava, e a peça ficava
   flutuando ou enterrada na vizinha sem aviso.

   A conferência mede duas coisas na peça executada. Primeiro, o plano: alguma
   face de onde a porta sai (`de`) precisa ter vértice no plano que passa pelo
   centro, perpendicular ao eixo. Segundo, o raio: a face que assenta (as faces
   da origem da porta que estão no plano, mais as coplanares ligadas a elas por
   aresta, e que cabem no círculo declarado) tem de caber no raio declarado (`raioExterno` do anel, `raio` do
   cilindro), e o raio declarado tem de ser alcançado por ela ou, quando a
   borda tem chanfro ou filete, por um vértice das faces vizinhas a até
   `FAIXA_DO_RAIO` do plano que não passe do raio: o anel da base do braço tem
   a face plana até 103,5 mm e o corpo em 105 mm, e a porta declara, com razão,
   o raio do corpo. Nada fora dessa face é medido: o filete e o tubo de uma
   peça em T passam perto do plano sem assentar nele, e o tambor do ombro
   desce até perto do plano do colar.

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

/* A face que assenta: as faces da porta que ficam no plano (todos os vértices a `TOLERANCIA` dele) e as coplanares ligadas a elas por aresta.
   `vizinhos` são os vértices das faces ligadas a ela por aresta, dentro da faixa do plano (chanfro, filete), e só servem para alcançar o raio do corpo. */
function faceDaPorta(neutro, faces, centro, eixo, raio) {
  const noPlano = (face) => face.vs.every((v) => Math.abs(medir(neutro.V.get(v), centro, eixo).t) <= TOLERANCIA);
  const porAresta = new Map();
  for (const [id, face] of neutro.F) {
    const n = face.vs.length;
    for (let i = 0; i < n; i++) {
      const a = face.vs[i], b = face.vs[(i + 1) % n];
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (!porAresta.has(k)) porAresta.set(k, []);
      porAresta.get(k).push(id);
    }
  }
  const vizinhasDe = (id) => {
    const face = neutro.F.get(id);
    const saida = [];
    const n = face.vs.length;
    for (let i = 0; i < n; i++) {
      const a = face.vs[i], b = face.vs[(i + 1) % n];
      for (const o of porAresta.get(a < b ? `${a}|${b}` : `${b}|${a}`) ?? []) if (o !== id) saida.push(o);
    }
    return saida;
  };
  /* a região cresce só por faces coplanares que cabem no círculo declarado: o tubo da peça em T tem a face rente à da porta e outro raio */
  const cabe = (face) => face.vs.every((v) => medir(neutro.V.get(v), centro, eixo).r <= raio + TOLERANCIA);
  const dentro = new Set();
  const fila = [];
  for (const f of faces) if (neutro.F.has(f) && noPlano(neutro.F.get(f))) { dentro.add(f); fila.push(f); }
  while (fila.length) {
    for (const o of vizinhasDe(fila.pop())) if (!dentro.has(o) && noPlano(neutro.F.get(o)) && cabe(neutro.F.get(o))) { dentro.add(o); fila.push(o); }
  }
  /* a borda: das faces da região para fora, as faces ligadas por aresta que ficam inteiras na faixa do plano (o chanfro e as bordas suavizadas dele) */
  const naFaixa = (face) => face.vs.every((v) => Math.abs(medir(neutro.V.get(v), centro, eixo).t) <= FAIXA_DO_RAIO);
  const vizinhasFora = new Set();
  const borda = [...dentro];
  while (borda.length) {
    for (const o of vizinhasDe(borda.pop())) if (!dentro.has(o) && !vizinhasFora.has(o) && naFaixa(neutro.F.get(o))) { vizinhasFora.add(o); borda.push(o); }
  }
  const regiao = new Set();
  for (const f of dentro) for (const v of neutro.F.get(f).vs) regiao.add(v);
  const vizinhos = new Set();
  for (const f of vizinhasFora) for (const v of neutro.F.get(f).vs) vizinhos.add(v);
  return { regiao, vizinhos };
}

export function conferirPortasNaForma(neutro) {
  const achados = [];
  const facesDasPortas = neutro.facesDasPortas ?? new Map();
  for (const [id, porta] of neutro.portas ?? new Map()) {
    const I = porta.interface;
    if (!I) continue;
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

    if (I.forma === 'anel' || I.forma === 'cilindro') {
      const n = Math.hypot(...I.eixo);
      const eixo = I.eixo.map((x) => x / n);
      const raio = I.forma === 'anel' ? I.raioExterno : I.raio;
      let distancia = Infinity;
      for (const v of daOrigem) distancia = Math.min(distancia, Math.abs(medir(neutro.V.get(v), I.centro, eixo).t));
      if (distancia > TOLERANCIA) {
        achados.push({ porta: id, codigo: 'porta-fora-do-plano', mensagem: `a porta '${id}' declara o plano no centro ${JSON.stringify(I.centro)}, e a face mais perto da origem dela está a ${mm(distancia)} dele.`, desvio: distancia });
        continue;
      }
      const { regiao, vizinhos } = faceDaPorta(neutro, faces, I.centro, eixo, raio);
      let maior = 0;
      for (const v of regiao) maior = Math.max(maior, medir(neutro.V.get(v), I.centro, eixo).r);
      /* a porta que sai de uma face lateral (o rolo da chapa, a parede de um cilindro) não tem face no plano: valem os vértices dela que estão nele */
      for (const v of daOrigem) {
        const { t, r } = medir(neutro.V.get(v), I.centro, eixo);
        if (Math.abs(t) <= TOLERANCIA) maior = Math.max(maior, r);
      }
      /* a borda chanfrada ou com filete: o raio declarado pode ser o do corpo, que só as faces vizinhas à face plana alcançam */
      let alcance = maior;
      for (const v of vizinhos) {
        const { t, r } = medir(neutro.V.get(v), I.centro, eixo);
        if (Math.abs(t) <= FAIXA_DO_RAIO && r <= raio + TOLERANCIA) alcance = Math.max(alcance, r);
      }
      if (maior > raio + TOLERANCIA || raio - alcance > TOLERANCIA) {
        const visto = maior > raio + TOLERANCIA ? maior : alcance;
        achados.push({ porta: id, codigo: 'porta-com-raio-errado', mensagem: `a porta '${id}' declara raio ${mm(raio)}, e a peça junto do plano dela chega a ${mm(visto)} do eixo.`, desvio: visto - raio });
      }
    } else if (I.forma === 'plano') {
      const normal = I.normal ?? I.eixo;
      const n = Math.hypot(...normal);
      const eixo = normal.map((x) => x / n);
      const ponto = I.ponto ?? I.centro;
      let distancia = Infinity;
      for (const v of daOrigem) distancia = Math.min(distancia, Math.abs(medir(neutro.V.get(v), ponto, eixo).t));
      if (distancia > TOLERANCIA) {
        achados.push({ porta: id, codigo: 'porta-fora-do-plano', mensagem: `a porta '${id}' declara o plano no ponto ${JSON.stringify(ponto)}, e a face mais perto da origem dela está a ${mm(distancia)} dele.`, desvio: distancia });
      }
    } else if (I.forma === 'padraoFuros') {
      const normal = I.normal ?? I.plano?.normal ?? I.eixo;
      const n = Math.hypot(...normal);
      const eixo = normal.map((x) => x / n);
      const ponto = I.ponto ?? I.plano?.ponto ?? I.centro;
      let distancia = Infinity;
      for (const v of daOrigem) distancia = Math.min(distancia, Math.abs(medir(neutro.V.get(v), ponto, eixo).t));
      if (distancia > TOLERANCIA) {
        achados.push({ porta: id, codigo: 'porta-fora-do-plano', mensagem: `a porta '${id}' declara o plano dos furos em ${JSON.stringify(ponto)}, e a face mais perto da origem dela está a ${mm(distancia)} dele.`, desvio: distancia });
        continue;
      }
      const raio = I.raio ?? (I.diametro / 2);
      const daParte = new Set();
      for (const face of neutro.F.values()) if (partes.has(face.parte)) for (const v of face.vs) daParte.add(v);
      for (let k = 0; k < I.centros.length; k++) {
        const c = I.centros[k];
        let maisPertoDoRaio = Infinity;
        let menorRaioObservado = Infinity;
        for (const v of daParte) {
          const { t, r } = medir(neutro.V.get(v), c, eixo);
          if (Math.abs(t) <= FAIXA_DO_RAIO) {
            const desvio = Math.abs(r - raio);
            if (desvio < maisPertoDoRaio) {
              maisPertoDoRaio = desvio;
              menorRaioObservado = r;
            }
          }
        }
        if (maisPertoDoRaio > TOLERANCIA) {
          achados.push({ porta: id, codigo: 'porta-com-raio-errado', mensagem: `a porta '${id}' declara furo ${k} com raio ${mm(raio)}, e a peça junto dele chega a ${mm(menorRaioObservado)}.`, desvio: menorRaioObservado - raio });
          break;
        }
      }
    } else if (I.forma === 'trilho') {
      const n = Math.hypot(...I.eixo);
      const eixo = I.eixo.map((x) => x / n);
      const centro = I.centro ?? I.ponto;
      let distanciaAoEixo = Infinity;
      for (const v of daOrigem) {
        const { r } = medir(neutro.V.get(v), centro, eixo);
        distanciaAoEixo = Math.min(distanciaAoEixo, r);
      }
      const raioEsperado = Math.max(I.largura ?? I.perfil.largura, I.altura ?? I.perfil.altura) / 2;
      if (distanciaAoEixo > raioEsperado + TOLERANCIA) {
        achados.push({ porta: id, codigo: 'porta-fora-do-eixo', mensagem: `a porta '${id}' declara trilho com eixo em ${JSON.stringify(centro)}, e a face da origem está a ${mm(distanciaAoEixo)} dele.`, desvio: distanciaAoEixo });
      }
    }
  }
  return achados;
}
