/* primitivas-basicas.js — geradores fundamentais registrados pelo núcleo, sem estado global. */
export function criarOperacoesPrimitivasBasicas({ BLOCO, confereId, grita, resolverLados, addV, addF, registraOrigem }) {
  return {
  cubo(st, a, i) {
    const b = confereId(st, i, 'cubo', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'cubo', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const lx = st.num(a.larg ?? a.lado ?? 1) / 2;
    const ly = st.num(a.alt ?? a.lado ?? 1);
    const lz = st.num(a.prof ?? a.lado ?? 1) / 2;
    const P = [
      [-lx, 0, -lz], [lx, 0, -lz], [lx, 0, lz], [-lx, 0, lz],   // 0..3 base (y=0)
      [-lx, ly, -lz], [lx, ly, -lz], [lx, ly, lz], [-lx, ly, lz], // 4..7 topo (y=ly)
    ];
    P.forEach((p, k) => addV(st, b + k, p));
    const q = (fid, ...c) => addF(st, fid, c.map((k) => b + k));   // ordem = normal pra FORA (mesma convenção do geo.box)
    q(b + 0, 0, 1, 2, 3);   // fundo  -y
    q(b + 1, 7, 6, 5, 4);   // topo   +y
    q(b + 2, 1, 0, 4, 5);   // -z
    q(b + 3, 2, 1, 5, 6);   // +x
    q(b + 4, 3, 2, 6, 7);   // +z
    q(b + 5, 0, 3, 7, 4);   // -x
    if (a.origemId != null) registraOrigem(st, i, 'cubo', a.origemId, { faces: { fundo: b, topo: b + 1, tras: b + 2, direita: b + 3, frente: b + 4, esquerda: b + 5 } });
  },

  cilindro(st, a, i) {
    const b = confereId(st, i, 'cilindro', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'cilindro', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const r = st.num(a.raio ?? 0.5);
    const h = st.num(a.altura ?? 1);
    const resolucao = resolverLados(st, a.lados, r);
    if (resolucao.erro) return grita(st, i, 'cilindro', 'lados', resolucao.erro);
    const L = resolucao.lados;   // TOPO: número explícito ou derivado de {desvio}
    if (2 * L > BLOCO) {
      const motivo = `cilindro com ${L} lados estoura o bloco de ids (${BLOCO}); máx ${(BLOCO / 2) | 0}`;
      if (resolucao.derivado) return grita(st, i, 'cilindro', 'lados', `${motivo} — aumente o desvio`);
      throw new Error(`oficina: ${motivo}`);   // forma numérica preserva o contrato histórico
    }
    for (let k = 0; k < L; k++) { const t = (k / L) * Math.PI * 2; addV(st, b + k, [Math.cos(t) * r, 0, Math.sin(t) * r]); }
    for (let k = 0; k < L; k++) { const t = (k / L) * Math.PI * 2; addV(st, b + L + k, [Math.cos(t) * r, h, Math.sin(t) * r]); }
    const laterais = [];
    for (let k = 0; k < L; k++) { const n = (k + 1) % L; addF(st, b + k, [b + k, b + L + k, b + L + n, b + n]); laterais.push(b + k); } // lados (normal radial pra fora)
    // tampas: MESMO winding do cubo (fundo pra-frente -> normal -y; topo revertido -> +y). Inverter apaga a luz da tampa — era o bug D1.
    const fundo = []; for (let k = 0; k < L; k++) fundo.push(b + k); addF(st, b + L, fundo);          // -y
    const topo = []; for (let k = L - 1; k >= 0; k--) topo.push(b + L + k); addF(st, b + L + 1, topo); // +y
    /* origemId (Fase 4): `laterais[k]` é a face lateral k (0..L-1), o eixo
       numérico `lado`; `tampas` dá as duas faces nominais `fundo`/`topo`. */
    if (a.origemId != null) registraOrigem(st, i, 'cilindro', a.origemId, { laterais, tampas: { fundo: b + L, topo: b + L + 1 } });
  },

  /* ---- P1 do playground: esfera / cone / plano — geradores novos, mesmas leis ----
     NUMERAÇÃO É FORMATO SALVO (docs/historico/playground.md, regra 4): a numeração de vértice
     e de face de cada op abaixo está documentada AQUI e travada por teste — depois
     de shipada, NUNCA muda (peça salva depende dela). Winding sempre com a normal
     pra FORA (a convenção do cubo/cilindro — a lição D1 das tampas). Guarda de
     overflow por-passo como no cilindro (D3): estourar o bloco GRITA ALTO (throw). */

  /* esfera — UV-sphere APOIADA no chão como as outras primitivas: polo sul em y=0,
     centro em y=raio, polo norte em y=2·raio. `raio` é PARAM (mudar não renumera);
     `aneis` (mín 2) e `lados` (mín 3) são TOPO — mudam a CONTAGEM.
     VÉRTICES (formato salvo, travado por teste): polo sul = b+0; anel k
     (k=1..aneis-1, do sul pro norte, ângulo polar k·π/aneis), vértice j
     (j=0..lados-1, mesmo ângulo do cilindro: j=0 em +x, crescendo pra +z) =
     b + 1 + (k-1)·lados + j; polo norte = b + 1 + (aneis-1)·lados.
     Total: 2 + (aneis-1)·lados.
     FACES (formato salvo, travado por teste) — contíguas por FAIXA, do sul pro
     norte; a faixa k (k=0..aneis-1) tem `lados` faces e a face j dela é
     b + k·lados + j:
       faixa 0         = leque do polo sul, triângulo [polo, anel1[j], anel1[j+1]]
                         (ângulo crescente, como a tampa de fundo do cilindro — normal pra baixo/fora);
       faixa 1..aneis-2 = quad [anelK[j], anelK+1[j], anelK+1[j+1], anelK[j+1]]
                         (o MESMO winding da lateral do cilindro — normal radial pra fora);
       faixa aneis-1   = leque do polo norte, triângulo [polo, anelÚlt[j+1], anelÚlt[j]]
                         (ângulo decrescente, como a tampa de cima — normal pra cima/fora).
     Total: aneis·lados. */
  };
}
