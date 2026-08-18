/* primitivas-superficie.js — primitivas fechadas que recebem serviços explícitos do núcleo. */
export function criarOperacoesPrimitivasSuperficie({ BLOCO, confereId, grita, resolverLados, addV, addF, registraOrigem, norm3, normalDaFace }) {
  return {
  esfera(st, a, i) {
    const b = confereId(st, i, 'esfera', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'esfera', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const r = st.num(a.raio ?? 0.5);
    const A = Math.max(2, st.num(a.aneis ?? 6) | 0);   // TOPO: muda a CONTAGEM
    const L = Math.max(3, st.num(a.lados ?? 8) | 0);   // TOPO: muda a CONTAGEM
    const nV = 2 + (A - 1) * L, nF = A * L;
    if (nV > BLOCO || nF > BLOCO) throw new Error(`oficina: esfera com aneis=${A}, lados=${L} estoura o bloco de ids (${BLOCO}): ${nV} vértices / ${nF} faces`);   // guarda de overflow (D3)
    const anel = (k, j) => b + 1 + (k - 1) * L + j;    // id do vértice j do anel k (1..aneis-1)
    addV(st, b, [0, 0, 0]);                            // polo sul (b+0)
    for (let k = 1; k < A; k++) {
      const f = (k / A) * Math.PI;                     // ângulo polar a partir do sul
      const rk = Math.sin(f) * r, y = (1 - Math.cos(f)) * r;
      for (let j = 0; j < L; j++) { const t = (j / L) * Math.PI * 2; addV(st, anel(k, j), [Math.cos(t) * rk, y, Math.sin(t) * rk]); }
    }
    const norte = b + 1 + (A - 1) * L;
    addV(st, norte, [0, 2 * r, 0]);                    // polo norte
    for (let j = 0; j < L; j++) { const n = (j + 1) % L; addF(st, b + j, [b, anel(1, j), anel(1, n)]); }   // leque do sul
    for (let k = 1; k < A - 1; k++) for (let j = 0; j < L; j++) { const n = (j + 1) % L; addF(st, b + k * L + j, [anel(k, j), anel(k + 1, j), anel(k + 1, n), anel(k, n)]); }   // faixas de quads
    for (let j = 0; j < L; j++) { const n = (j + 1) % L; addF(st, b + (A - 1) * L + j, [norte, anel(A - 1, n), anel(A - 1, j)]); }   // leque do norte
    if (a.origemId != null) registraOrigem(st, i, 'esfera', a.origemId, { faixas: Array.from({ length: A }, (_, k) => Array.from({ length: L }, (_, j) => b + k * L + j)) });
  },

  /* cone — base no chão como o cilindro: anel em y=0, ápice em y=altura. `raio` e
     `altura` são PARAMS; `lados` (mín 3) é TOPO.
     VÉRTICES (formato salvo, travado por teste): anel da base = b+0..b+lados-1
     (mesmo ângulo do cilindro: j=0 em +x, crescendo pra +z), ápice = b+lados.
     Total: lados+1.
     FACES (formato salvo, travado por teste): laterais = b+j, triângulo
     [b+j, ápice, b+j+1] — a lateral do cilindro com o anel de cima colapsado no
     ápice (normal pra fora); tampa da base = b+lados, polígono [b+0..b+lados-1]
     no MESMO winding da tampa de fundo do cilindro (ângulo crescente — normal -y).
     Total: lados+1. */
  cone(st, a, i) {
    const b = confereId(st, i, 'cone', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'cone', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const r = st.num(a.raio ?? 0.5);
    const h = st.num(a.altura ?? 1);
    const resolucao = resolverLados(st, a.lados, r);
    if (resolucao.erro) return grita(st, i, 'cone', 'lados', resolucao.erro);
    const L = resolucao.lados;   // TOPO: número explícito ou derivado de {desvio}
    if (L + 1 > BLOCO) {
      const motivo = `cone com ${L} lados estoura o bloco de ids (${BLOCO}); máx ${BLOCO - 1}`;
      if (resolucao.derivado) return grita(st, i, 'cone', 'lados', `${motivo} — aumente o desvio`);
      throw new Error(`oficina: ${motivo}`);   // forma numérica preserva o contrato histórico
    }
    for (let k = 0; k < L; k++) { const t = (k / L) * Math.PI * 2; addV(st, b + k, [Math.cos(t) * r, 0, Math.sin(t) * r]); }
    addV(st, b + L, [0, h, 0]);                                                                       // ápice
    for (let k = 0; k < L; k++) { const n = (k + 1) % L; addF(st, b + k, [b + k, b + L, b + n]); }    // laterais (normal pra fora)
    const fundo = []; for (let k = 0; k < L; k++) fundo.push(b + k); addF(st, b + L, fundo);          // tampa da base (-y, o winding do fundo do cilindro)
    /* origemId (A-18): a MESMA forma do cilindro — `laterais[k]` é a face
       lateral k (0..L-1, o eixo numérico `lado`) e `tampas` tem a única face
       nominal do cone, a base ('fundo'). O ápice não entra: é vértice. */
    if (a.origemId != null) registraOrigem(st, i, 'cone', a.origemId, { laterais: Array.from({ length: L }, (_, k) => b + k), tampas: { fundo: b + L } });
  },

  /* plano — grade no plano XZ, y=0, CENTRADA na origem (o chão). `largura` (eixo x)
     e `profundidade` (eixo z) são PARAMS; `seg` (mín 1) é TOPO: (seg+1)² vértices,
     seg² quads.
     VÉRTICES (formato salvo, travado por teste), LINHA A LINHA: linha iz
     (iz=0..seg, de -z pra +z), coluna ix (ix=0..seg, de -x pra +x) ->
     b + iz·(seg+1) + ix. Total: (seg+1)².
     FACES (formato salvo, travado por teste): o quad da célula (ix, iz)
     (ix,iz=0..seg-1) = b + iz·seg + ix, cantos
     [v(ix,iz), v(ix,iz+1), v(ix+1,iz+1), v(ix+1,iz)] — normal +y (o MESMO ciclo
     da tampa de cima do cubo). Total: seg². */
  plano(st, a, i) {
    const b = confereId(st, i, 'plano', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'plano', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const lx = st.num(a.largura ?? 1), lz = st.num(a.profundidade ?? 1);
    const S = Math.max(1, st.num(a.seg ?? 1) | 0);     // TOPO: muda a CONTAGEM
    const nV = (S + 1) * (S + 1);
    if (nV > BLOCO) throw new Error(`oficina: plano com seg=${S} estoura o bloco de ids (${BLOCO}): ${nV} vértices; máx seg=30`);   // guarda de overflow (D3); faces = seg² < (seg+1)², coberto
    const v = (ix, iz) => b + iz * (S + 1) + ix;
    for (let iz = 0; iz <= S; iz++) for (let ix = 0; ix <= S; ix++) addV(st, v(ix, iz), [(ix / S - 0.5) * lx, 0, (iz / S - 0.5) * lz]);
    for (let iz = 0; iz < S; iz++) for (let ix = 0; ix < S; ix++) addF(st, b + iz * S + ix, [v(ix, iz), v(ix, iz + 1), v(ix + 1, iz + 1), v(ix + 1, iz)]);
    /* origemId (A-18): a grade do plano É a estrutura faixa×lado do loft —
       `faixas[iz][ix]` é o quad da célula (ix,iz), a numeração `b + iz·seg + ix`
       documentada acima. Faixa = linha em z; lado = coluna em x. */
    if (a.origemId != null) registraOrigem(st, i, 'plano', a.origemId, { faixas: Array.from({ length: S }, (_, iz) => Array.from({ length: S }, (_, ix) => b + iz * S + ix)) });
  },

  /* chamferBox — P8b do playground: o `cubo` com CANTOS E ARESTAS chanfrados (o corte
     de UM nível só — a versão "flat", sem arredondar; suavizar/arredondar é a mesma
     classe do "lathe só reto por enquanto", fica pra quando o caso real pedir). Chão
     embaixo como o cubo: `larg`/`alt`/`prof` (ou `lado`, os três) definem a mesma caixa
     x∈[-larg/2,larg/2], y∈[0,alt], z∈[-prof/2,prof/2]; `chanfro` é a distância do corte,
     em unidade de mundo, IGUAL pras 12 arestas.

     VALIDADE: `chanfro` precisa ser `> 0` e `< min(larg/2, prof/2, alt/2)` — cortes de
     CANTOS OPOSTOS da mesma aresta não podem se cruzar (uma aresta de comprimento L leva
     um corte de `chanfro` em CADA ponta, sobra `L − 2·chanfro`; a mais curta entre as 3
     famílias de aresta manda). No limite EXATO a malha já degenera (medido: normal
     zerada, arestas soltas) — por isso o teste é estrito. Fora da faixa GRITA e a op
     não constrói nada neste passo (0 vértices/faces) — o mesmo tratamento do perfil
     inválido do lathe: mais seguro que adivinhar quantos ids um corte inválido ocuparia.

     TOPOLOGIA (formato salvo, travada por teste) — SEM parâmetro TOPO, a contagem é
     SEMPRE 24 vértices / 26 faces (bem abaixo do bloco; sem guarda de overflow, não tem
     como estourar). Cada um dos 8 CANTOS do cubo reto (mesma ordem de sinal do `cubo`:
     0..3 no chão CCW-de-cima, 4..7 no topo) vira 3 vértices — um por EIXO — porque as 3
     faces que se encontravam ali (X, Y, Z) cada uma ENCOLHE por conta própria: o vértice
     "do eixo X" fica com a coordenada X no valor CHEIO do canto (ele mora na face X) e
     as OUTRAS duas (Y, Z) encolhidas por `chanfro` pra dentro — é CANTELAÇÃO (cada FACE
     encolhe), não truncagem de canto (cada canto vira 1 corte só) — as duas são
     chanfros válidos mas com topologia diferente; truncagem dava hexágono/octógono nas
     faces originais em vez de quad menor (confundi as duas na primeira derivação desta
     op — provado errado por característica de Euler, V−E+F≠2, antes de escrever
     qualquer linha aqui: a lição de sempre, medir em vez de recontar de cabeça).
     Vértice do canto k, eixo X/Y/Z: id `b + k*3 + {0,1,2}`.

     FACES: `b+0..5` as 6 faces originais (MESMO padrão de canto do `cubo`, cada uma só
     trocando pelo vértice-do-eixo-certo); `b+6..17` os 12 retângulos de aresta (4 por
     eixo, na ordem X,Y,Z — cada retângulo cobre a aresta cortada, ligando o vértice dos
     DOIS OUTROS eixos nas duas pontas); `b+18..25` os 8 triângulos de canto (ordem de
     k, ligando os 3 vértices daquele canto). Winding: ao contrário do cilindro/esfera
     (uma superfície de revolução com um giro só, então um sentido só resolve tudo), o
     chanfro não tem simetria rotacional — CADA face nasce numa ordem fixa e se
     AUTO-ORIENTA contra o CENTRO real da caixa (normal de Newell · direção do centro
     pro centroide da face; inverte se apontar pra dentro) em vez de uma tabela de sinal
     por canto decorada à mão (mais fácil de errar decorando do que deixando a própria
     geometria decidir) — verificado por teste nas 26 faces, não numa amostra. */
  chamferBox(st, a, i) {
    const b = confereId(st, i, 'chamferBox', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'chamferBox', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const lx = st.num(a.larg ?? a.lado ?? 1) / 2;
    const ly = st.num(a.alt ?? a.lado ?? 1);
    const lz = st.num(a.prof ?? a.lado ?? 1) / 2;
    const c = st.num(a.chanfro ?? 0.1);
    const lim = Math.min(lx, lz, ly / 2);
    if (!(c > 0) || !(c < lim)) return grita(st, i, 'chamferBox', c, `chanfro precisa ser > 0 e < ${lim} (o menor entre metade da largura, metade da profundidade e metade da altura) — senão os cortes de pontas opostas da mesma aresta se cruzam`);

    const CANTOS = [[-1, 0, -1], [1, 0, -1], [1, 0, 1], [-1, 0, 1], [-1, 1, -1], [1, 1, -1], [1, 1, 1], [-1, 1, 1]];   // mesma ordem de sinal do cubo
    const loc = new Map();   // local (0..23) -> posição, construído ANTES de tocar st (o padrão do inflate)
    const X = (k) => k * 3, Y = (k) => k * 3 + 1, Z = (k) => k * 3 + 2;
    CANTOS.forEach(([sx, sy, sz], k) => {
      const oy = sy ? -1 : 1;   // "pra dentro" no y: chão (sy=0) empurra +y, topo (sy=1) empurra -y
      loc.set(X(k), [sx * lx, sy * ly + oy * c, sz * (lz - c)]);
      loc.set(Y(k), [sx * (lx - c), sy * ly, sz * (lz - c)]);
      loc.set(Z(k), [sx * (lx - c), sy * ly + oy * c, sz * lz]);
    });

    const centro = [0, ly / 2, 0];   // centro REAL da caixa (y não é centrado em 0 — chão embaixo, como o cubo)
    const orienta = (vs) => {
      const n = normalDaFace(loc, vs);
      let cx = 0, cy = 0, cz = 0;
      for (const id of vs) { const p = loc.get(id); cx += p[0]; cy += p[1]; cz += p[2]; }
      const dir = norm3(cx / vs.length - centro[0], cy / vs.length - centro[1], cz / vs.length - centro[2]);
      const dot = n[0] * dir[0] + n[1] * dir[1] + n[2] * dir[2];
      return dot < 0 ? vs.slice().reverse() : vs;
    };

    const faces = [];
    faces.push(orienta([Y(0), Y(1), Y(2), Y(3)]));   // fundo -y — padrão do cubo
    faces.push(orienta([Y(7), Y(6), Y(5), Y(4)]));   // topo  +y
    faces.push(orienta([Z(1), Z(0), Z(4), Z(5)]));   // -z
    faces.push(orienta([X(2), X(1), X(5), X(6)]));   // +x
    faces.push(orienta([Z(3), Z(2), Z(6), Z(7)]));   // +z
    faces.push(orienta([X(0), X(3), X(7), X(4)]));   // -x

    const achaCanto = (sx, sy, sz) => CANTOS.findIndex(([a2, b2, c2]) => a2 === sx && b2 === sy && c2 === sz);
    for (const [sy, sz] of [[0, -1], [0, 1], [1, -1], [1, 1]]) { const k1 = achaCanto(-1, sy, sz), k2 = achaCanto(1, sy, sz); faces.push(orienta([Y(k1), Y(k2), Z(k2), Z(k1)])); }   // 4 arestas-X
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const k1 = achaCanto(sx, 0, sz), k2 = achaCanto(sx, 1, sz); faces.push(orienta([X(k1), X(k2), Z(k2), Z(k1)])); }   // 4 arestas-Y
    for (const [sx, sy] of [[-1, 0], [1, 0], [1, 1], [-1, 1]]) { const k1 = achaCanto(sx, sy, -1), k2 = achaCanto(sx, sy, 1); faces.push(orienta([X(k1), X(k2), Y(k2), Y(k1)])); }   // 4 arestas-Z
    for (let k = 0; k < 8; k++) faces.push(orienta([X(k), Y(k), Z(k)]));   // 8 triângulos de canto

    loc.forEach((p, id) => addV(st, b + id, p));
    faces.forEach((vs, k) => addF(st, b + k, vs.map((id) => b + id)));
    /* origemId (A-18): as 6 primeiras faces são as MESMAS do cubo, na mesma
       ordem e com o mesmo nome; as 12 seguintes são as arestas (X,Y,Z) e as 8
       últimas os cantos. É a numeração que o cabeçalho desta op já documenta e
       o teste já trava — aqui ela só passa a ser citável. */
    if (a.origemId != null) registraOrigem(st, i, 'chamferBox', a.origemId, {
      faces: { fundo: b, topo: b + 1, tras: b + 2, direita: b + 3, frente: b + 4, esquerda: b + 5 },
      arestas: Array.from({ length: 12 }, (_, k) => b + 6 + k),
      cantos: Array.from({ length: 8 }, (_, k) => b + 18 + k),
    });
  },

  /* lathe — P2 do playground: um perfil 2D `[[raio,y],...]` GIRADO em torno do
     eixo Y (superfície de revolução). GENERALIZA o esquema da esfera acima —
     formalmente, a esfera É um lathe de uma meia-circunferência (polo->anéis->
     polo); aqui o perfil é ARBITRÁRIO, não só um arco. `raio`/`y` de CADA ponto
     passam por st.num() (podem citar PARAM, como o raio da esfera); `lados`
     (mín 3, mesmo Math.max das outras primitivas) é TOPO pra TODO o perfil —
     muda a CONTAGEM de todo anel de uma vez.

     O PONTO DE PERFIL — RESERVA DE CURVA (formato salvo, IRREVERSÍVEL, ver
     docs/oficina.md "Aba Desenho"): um ponto é `[raio,y]`, SEMPRE 2 elementos =
     SEMPRE um canto RETO (produz exatamente 1 anel/polo — nunca muda, nem
     quando a curva chegar). Um 3º elemento é a alça de curva reservada pra uma
     rodada futura. HOJE não existe suporte: o ponto ainda constrói RETO (como
     se o 3º elemento não estivesse lá) — mas GRITA (órfão), nunca ignora em
     silêncio, senão a peça salva hoje renderizaria reta e mudaria de figura
     sozinha no dia em que a curva for implementada.

     POLO vs ANEL (a topologia, formato salvo): o teste é `raio RESOLVIDO ===
     0` -> POLO (1 vértice EM CIMA do eixo, y do ponto — como o polo da
     esfera); `raio > 0` -> ANEL de `lados` vértices (mesmo ângulo/sentido do
     cilindro/esfera: j=0 em +x, crescendo pra +z). Logo um PARAM usado como
     raio de perfil que cruze 0<->não-zero muda a TOPOLOGIA e renumera (mesma
     classe que mudar `lados`); polos típicos são `0` LITERAL. `raio < 0` não
     dá pra classificar polo/anel — GRITA e a op inteira não constrói NADA
     neste passo (0 vértices/faces), o mesmo tratamento de "perfil com menos de
     2 pontos": mais seguro que adivinhar quantos ids um ponto inválido
     ocuparia (o que quebraria a fórmula de numeração abaixo pros pontos
     seguintes). Nunca corrompe — só não constrói.

     NUMERAÇÃO DE VÉRTICE (formato salvo, travada por teste): anda o perfil com
     um CURSOR que começa em 0. Ponto i POLO consome 1 id (b+cursor); ponto i
     ANEL consome `lados` ids (b+cursor+j, j=0..lados-1). O cursor SOMA o que
     acabou de consumir a cada ponto. Só depende de QUAIS pontos são polo (a
     ESTRUTURA do perfil) + `lados` — nunca do VALOR de raio/y (PARAM não
     renumera, só muda posição).

     FACES entre pontos consecutivos (i,i+1) — cursor de face ANÁLOGO (começa
     em 0, cada segmento soma só o que ele de fato produziu, em ORDEM):
       anel<->anel : `lados` QUADS, winding EXATAMENTE a faixa da esfera —
                     [baixo[j], cima[j], cima[j+1], baixo[j+1]];
       polo->anel  : `lados` triângulos, EXATAMENTE o leque SUL da esfera —
                     [polo, anel[j], anel[j+1]] (o polo é o ponto DE BAIXO);
       anel->polo  : `lados` triângulos, EXATAMENTE o leque NORTE da esfera —
                     [polo, anel[j+1], anel[j]] (ordem invertida — o polo é o
                     ponto DE CIMA, o mesmo giro que inverte a tampa de cima);
       polo<->polo : GRITA ("perfil degenerado") e ZERO faces neste segmento —
                     o cursor de face não avança aqui, mas os pontos e
                     segmentos seguintes seguem normais (não corrompe o resto).
     Winding sempre pra FORA — reusa EXATAMENTE o esquema da esfera (perfil
     ORDENADO de baixo pra cima, raio>=0 -> normais pra fora); é essa ordem que
     faz o leque polo->anel e o leque anel->polo precisarem de sentido oposto,
     idêntico a por que a tampa de baixo e a de cima do cilindro giram opostas.

     SEM tampas automáticas — superfície de revolução PURA. Fechar uma ponta é
     terminar o perfil no eixo (raio 0 = polo): o leque do polo VIRA a tampa,
     de graça (ex.: uma coluna com tampas chatas é só `[[0,0],[R,0],[R,h],
     [0,h]]` — polo embaixo -> anel -> anel -> polo em cima). Nenhum conceito
     de "cap" à parte.

     Perfil é só ABERTO (polilinha): não fecha loop mesmo se o último ponto ==
     o primeiro (pneu/torus fica FORA do escopo do P2 — um perfil assim só
     produz dois pontos normais, sem segmento extra ligando o fim ao começo).

     Guarda de overflow (D3, por-passo): soma EXATA de vértices e de faces
     (segmento polo<->polo não conta face nenhuma) calculada ANTES de inserir
     qualquer vértice — throw como a esfera/cone/plano. */
  };
}
