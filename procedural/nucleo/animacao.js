/* animacao.js — animação rígida e skinning sobre lotes já adaptados. */

/* ----------------------------------------------------------------------------
   PASSO 13a — ANIMAÇÃO RÍGIDA POR PARTE (em laço). Matemática de matriz 4x4 LOCAL
   (funções PURAS, sem Date/Math.random) pra o determinismo ser ABSOLUTO: mesmo T
   -> mesmas matrizes, byte-a-byte, na página e em Node. Coluna-major como o motor
   (mat4.js) e o WebGL esperam — o que casa com o `uniformMatrix4fv(.., false, M)`
   do render.js. Não uso o `ctx.m4` porque ele só tem rotY/translate; escrevo os
   ops que faltam (rotX/rotZ/escala) aqui, LOCAIS ao oficina.js (não toco no motor).
---------------------------------------------------------------------------- */
function mMul(a, b) {   // a·b coluna-major (idêntico ao m4.mul do motor)
  const o = new Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++)
    o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}
function mTranslate(x, y, z) { return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]; }
function mScale(s) { return [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1]; }
function mRotX(a) { const c = Math.cos(a), s = Math.sin(a); return [1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]; }
function mRotY(a) { const c = Math.cos(a), s = Math.sin(a); return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]; }   // == m4.rotY
function mRotZ(a) { const c = Math.cos(a), s = Math.sin(a); return [c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]; }

/* os canais que uma trilha pode dirigir. Canal fora desta lista GRITA (throw) ao
   montar — como uma op desconhecida no núcleo, o erro é ALTO e cedo, nunca silêncio. */
const CANAIS = new Set(['rotX', 'rotY', 'rotZ', 'posX', 'posY', 'posZ', 'escala']);

/* avaliarChaves(chaves, t): interpola as CHAVES `[[tempo,valor],...]` (assumidas
   ORDENADAS por tempo) no instante `t`. SUAVE por padrão: smoothstep por SEGMENTO
   (s = u²(3−2u)) — ease-in/out, derivada 0 nas pontas do segmento, sem overshoot.
   Antes da 1ª chave -> 1º valor; depois da última -> último valor (clamp nas pontas).
   Exportada pra o teste unitário do interpolador bater valores conhecidos. PURA. */
export function avaliarChaves(chaves, t) {
  const n = chaves.length;
  if (!n) return 0;
  if (t <= chaves[0][0]) return chaves[0][1];
  if (t >= chaves[n - 1][0]) return chaves[n - 1][1];
  let i = 0; while (i < n - 1 && t > chaves[i + 1][0]) i++;
  const [t0, v0] = chaves[i], [t1, v1] = chaves[i + 1];
  const dt = t1 - t0;
  const u = dt > 0 ? (t - t0) / dt : 0;
  const s = u * u * (3 - 2 * u);   // smoothstep
  return v0 + (v1 - v0) * s;
}

/* monta a MATRIZ LOCAL de uma parte em torno do pivô: M = T(pos)·T(piv)·R·S·T(−piv),
   com R = Rz·Ry·Rx (ordem fixa) e S escala uniforme. Aplicada como uModel a cada
   vértice LOCAL do lote (o render multiplica uModel·pos). Pura, coluna-major. */
function matrizLocal(a, piv) {
  const R = mMul(mRotZ(a.rotZ), mMul(mRotY(a.rotY), mRotX(a.rotX)));
  let M = mMul(R, mScale(a.escala));               // R·S
  M = mMul(M, mTranslate(-piv[0], -piv[1], -piv[2]));   // R·S·T(−piv)
  M = mMul(mTranslate(piv[0], piv[1], piv[2]), M);      // T(piv)·R·S·T(−piv)
  M = mMul(mTranslate(a.posX, a.posY, a.posZ), M);      // T(pos)·…
  return M;
}

const IDENT16 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/* PASSO 14a — SKINNING (linear blend skinning), determinístico e coluna-major como o
   resto. localAnimBone(a): a transformada LOCAL do OSSO a partir dos canais, SEM o
   pivô (diferente da parte rígida): num esqueleto o pivô do osso É a origem do frame
   local do osso (embutida na cadeia de offsets), então a rotação já gira em torno
   dele. M = T(pos)·Rz·Ry·Rx·S — identidade quando o osso não é animado. */
function localAnimBone(a) {
  const R = mMul(mRotZ(a.rotZ), mMul(mRotY(a.rotY), mRotX(a.rotX)));
  let M = mMul(R, mScale(a.escala));                     // R·S em torno da ORIGEM (= o pivô do osso, no frame local)
  M = mMul(mTranslate(a.posX, a.posY, a.posZ), M);       // T(pos)·R·S
  return M;
}

/* calcularSkin(esqueleto, accOf) -> Float32Array de N mat4s: a matriz de SKIN de cada
   osso, NA ORDEM do ESQUELETO (= a ordem do boneIndex que o adaptarV3 gravou no mesh).
   LBS padrão, com o bind (repouso) = IDENTIDADE no pivô:
     bindGlobal(osso)     = T(pivo)                                   (offsets telescopam)
     globalCorrente(osso) = globalCorrente(pai) · T(pivo−pivoPai) · localAnim(osso)
     skin(osso)           = globalCorrente(osso) · inverse(bindGlobal) = globalCorrente · T(−pivo)
   Sem animação -> localAnim=I -> globalCorrente=T(pivo) -> skin=I (bind pose, deforma 0).
   Osso-filho girado R -> skin = T(pivo)·R·T(−pivo): gira EM TORNO do pivô (a junta); os
   vértices do pai (skin=I) ficam. inverse(bindGlobal) é T(−pivo) EXATO (bind é translação
   pura) — sem inversa geral 4x4, sem erro numérico. globalDe é memoizado + recursivo: a
   ordem de declaração não importa (ciclo já barrado no resolverEsqueleto). PURA. */
function calcularSkin(esqueleto, accOf) {
  const ossos = esqueleto.ossos, idx = esqueleto.idx;
  const globalCache = new Array(ossos.length).fill(null);
  const globalDe = (bi) => {
    if (globalCache[bi]) return globalCache[bi];
    const o = ossos[bi];
    const paiIdx = o.pai != null ? idx.get(o.pai) : -1;
    const paiG = paiIdx >= 0 ? globalDe(paiIdx) : IDENT16;
    const paiPivo = paiIdx >= 0 ? ossos[paiIdx].pivo : [0, 0, 0];
    const off = mTranslate(o.pivo[0] - paiPivo[0], o.pivo[1] - paiPivo[1], o.pivo[2] - paiPivo[2]);   // rest-relative ao pai
    const a = accOf(o.nome);
    const g = mMul(paiG, mMul(off, a ? localAnimBone(a) : IDENT16));
    globalCache[bi] = g;
    return g;
  };
  const out = new Float32Array(ossos.length * 16);
  for (let bi = 0; bi < ossos.length; bi++) {
    const o = ossos[bi];
    const sk = mMul(globalDe(bi), mTranslate(-o.pivo[0], -o.pivo[1], -o.pivo[2]));   // skin = global · T(−pivo)
    for (let k = 0; k < 16; k++) out[bi * 16 + k] = sk[k];
  }
  return out;
}

/* bind pose (N identidades): o L.ossos inicial de um lote skinado — o que o render sobe
   quando a peça NÃO tem `animar` (deforma 0 = repouso). Float32Array pra subir direto. */
export function bindPoseOssos(n) { const out = new Float32Array(n * 16); for (let i = 0; i < n; i++) out.set(IDENT16, i * 16); return out; }

/* montarAnimar(ANIMACOES, infoPorLote, partes) -> função `animar(T, lotes)` (ou
   undefined se ANIMACOES vazio). ANIMACOES é uma seção da peça (como MATERIAIS):
   `{ nome: { duracao, repete, trilhas:[{parte,canal,chaves}] } }`.

   COMO CASA parte<->lote SEM TOCAR NO render.js: o render mapeia `peca.lotes` 1:1 na
   MESMA ORDEM e chama `animar(T, lotes)` a cada quadro (cada lote tem `.matriz`=uModel).
   Então capturo no closure `infoPorLote` — um array PARALELO aos lotes (infoPorLote[i]
   = nome-da-parte-do-lote-i, ou null) — e caso POR ÍNDICE. NUNCA leio um campo novo dos
   lotes do render (o render nem copia `.parte`).

   Por quadro, pra cada animação: tempo local `lt = repete ? (dur>0 ? T%dur : 0) :
   min(T,dur)`. Pra cada trilha: avalia as chaves em `lt` (SUAVE) e ACUMULA por parte —
   rotX.Y.Z e posX.Y.Z SOMAM (0 default), `escala` MULTIPLICA (1 default, pra compor sem zerar).
   Monta a matriz da parte em torno do pivô (parte.pivo ?? centroide, já resolvido no
   adaptarV3) e escreve em TODO lote i cuja parte casa. Partes/lotes não animados ficam
   com a identidade que o executar já pôs (nunca escrevo neles). Determinístico. */
export function montarAnimar(ANIMACOES = {}, infoPorLote = [], partes = {}, esqueleto = null) {
  const nomes = Object.keys(ANIMACOES || {});
  if (!nomes.length) return undefined;

  /* índices de lote por parte, do MAPA paralelo (a fonte da verdade do casamento). */
  const lotesDaParte = new Map();
  infoPorLote.forEach((p, i) => { if (!p) return; let a = lotesDaParte.get(p); if (!a) { a = []; lotesDaParte.set(p, a); } a.push(i); });

  /* PASSO 14a — esqueleto: o alvo de uma trilha pode ser um OSSO (nome no ESQUELETO) ou
     uma PARTE (13a). `ossoSet` resolve os dois: alvo em ossoSet dirige o SKINNING (as
     matrizes de osso do quadro, escritas em L.ossos de TODO lote skinado); alvo fora
     dele segue a parte rígida (L.matriz). Sem esqueleto (1..13), ossoSet vazio -> tudo
     idêntico ao 13a. */
  const ossoSet = esqueleto ? new Set(esqueleto.ossos.map((o) => o.nome)) : new Set();

  /* pré-processa: valida canais (GRITA cedo), ordena as chaves, deriva a duração
     (default = maior tempo de chave da animação). Feito UMA vez, não por quadro. */
  const anims = nomes.map((nome) => {
    const A = ANIMACOES[nome] || {};
    const trilhas = (A.trilhas || []).map((tr) => {
      if (!CANAIS.has(tr.canal)) throw new Error(`oficina: canal '${tr.canal}' desconhecido na animação '${nome}' (parte '${tr.parte}') — só ${[...CANAIS].join('/')}`);
      const chaves = (tr.chaves || []).slice().sort((x, y) => x[0] - y[0]);
      return { parte: tr.parte, canal: tr.canal, chaves };
    });
    let maxT = 0; for (const tr of trilhas) if (tr.chaves.length) maxT = Math.max(maxT, tr.chaves[tr.chaves.length - 1][0]);
    return { repete: !!A.repete, duracao: A.duracao != null ? +A.duracao : maxT, trilhas };
  });

  return function animar(T, lotes) {
    const acc = new Map();   // parte -> {rotX,rotY,rotZ,posX,posY,posZ,escala}, ZERADO por quadro (determinismo)
    const getAcc = (p) => { let a = acc.get(p); if (!a) { a = { rotX: 0, rotY: 0, rotZ: 0, posX: 0, posY: 0, posZ: 0, escala: 1 }; acc.set(p, a); } return a; };
    for (const A of anims) {
      const lt = A.repete ? (A.duracao > 0 ? T % A.duracao : 0) : Math.min(T, A.duracao);
      for (const tr of A.trilhas) {
        const v = avaliarChaves(tr.chaves, lt);
        const a = getAcc(tr.parte);
        if (tr.canal === 'escala') a.escala *= v; else a[tr.canal] += v;
      }
    }
    for (const [parte, a] of acc) {
      if (ossoSet.has(parte)) continue;   // 14a: alvo é um OSSO -> vai pelo skinning abaixo, não como parte rígida
      const idx = lotesDaParte.get(parte);
      if (!idx || !idx.length) continue;   // trilha aponta pra parte sem lote (nenhuma face) -> nada a mover
      const piv = (partes[parte] && partes[parte].pivo) || [0, 0, 0];
      const M = matrizLocal(a, piv);
      for (const i of idx) if (lotes[i]) lotes[i].matriz = M;   // escreve por ÍNDICE; o render lê L.matriz como uModel
    }
    /* 14a: as matrizes de osso do quadro (mesmo que NENHUM osso seja animado — a bind
       pose = identidades) num Float32Array, escrito em L.ossos de TODO lote skinado. O
       render sobe L.ossos em uOssos[] e usa o programa skinado. accOf lê o acc por NOME
       de osso (undefined = osso não animado -> localAnim identidade). */
    if (esqueleto) {
      const skinBuf = calcularSkin(esqueleto, (nome) => acc.get(nome));
      for (let i = 0; i < infoPorLote.length; i++) if (lotes[i]) lotes[i].ossos = skinBuf;   // todo lote de peça skinada é skinado
    }
  };
}

