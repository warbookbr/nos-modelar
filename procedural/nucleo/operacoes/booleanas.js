/* booleanas.js — `unir`, `subtrair` e `intersectar`: dois ou mais SÓLIDOS
   fechados viram uma superfície fechada só, sem face interna.

   POR QUE AGORA EXISTE O QUE O `furo` RECUSOU. O comentário do `furo` explica
   por que o núcleo não tinha booleana genérica: ela destrói a identidade de
   dezenas de faces de uma vez, em silêncio. O ombro do braço pediu o canto
   reto, e o único jeito era enfiar uma coluna num braço — duas malhas que se
   atravessam, com vinco e sombra no encontro (plano 2026-09-28, união de
   sólidos). A resposta é a mesma lei do `furo`, aplicada à malha inteira:
   nenhuma face perde a identidade em silêncio.

   O CÁLCULO É DA MANIFOLD (`manifold.js`). O núcleo só converte a malha na
   entrada e na saída e grava a identidade. A Manifold devolve cada triângulo
   com o `faceID` que entrou, e esse número reagrupa os triângulos na face de
   antes. A LEI DA IDENTIDADE, travada por teste:
     - face que a operação NÃO toca fica com id, cantos, origem, parte e
       material — a lista de cantos volta a ser a original, byte a byte;
     - face CORTADA pela costura fica com o id dela no pedaço de MAIOR área que
       sobra (empate: o primeiro na ordem da saída), com cantos novos;
     - só os pedaços A MAIS de uma face cortada (a face partida em duas, ou um
       pedaço côncavo que o leque do adaptador não desenharia) ganham id novo,
       no bloco do passo: `b+0, b+1, …` na ordem da saída;
     - face que some (ficou dentro do outro sólido, ou fora da interseção) é
       CONSUMIDA: sai da malha e entra em `st.consumidas`, como no `furo`, e
       quem a citar depois recebe o erro com o conserto;
     - vértice que a costura cria ganha id novo no bloco do passo (`b+0, …`,
       espaço de vértice); vértice das entradas que nenhuma face usa mais sai.
   Por isso a união de dois lofts de 1000 faces não estoura o bloco: quase
   toda face continua com o id que já tinha.

   PEDAÇO CONVEXO. O adaptador desenha cada face em LEQUE a partir do primeiro
   canto, então uma face côncava sairia errada na tela. Uma face cortada vira
   uma ou mais faces CONVEXAS: os triângulos da Manifold são fundidos dois a
   dois pela aresta comum enquanto o resultado continua convexo (Hertel e
   Mehlhorn). Um pedaço em L vira dois retângulos, não um L.

   ARGUMENTOS
     `origemId`  OBRIGATÓRIO, como no `furo`: sem ele a costura seria anônima;
     `solidos`   lista de DUAS ou mais seleções (`sel` completa: origem, alias,
                 grupo, tudo…), uma por sólido. No `unir` e no `intersectar` a
                 ordem não muda a forma; no `subtrair` o PRIMEIRO é a peça e os
                 demais são tirados dela. Cada seleção precisa formar um sólido
                 FECHADO (toda aresta usada por exatamente duas faces, em
                 sentidos opostos), depois de soldar os cantos coincidentes; e
                 duas seleções não podem dividir face.

   A ORDEM DOS OPERANDOS DEFINE A IDENTIDADE. Trocar a ordem em `solidos`
   não muda a forma do `unir` nem do `intersectar`, mas muda quem vence na face
   coplanar sobreposta (vence o primeiro), a ordem em que a Manifold devolve
   os triângulos e, com ela, os ids `b+k` dos pedaços e vértices novos. Mesma
   lista, mesma ordem, mesmo resultado; ordem trocada é outra receita.

   ORIGEM PUBLICADA `{op, id}`: todas as faces do resultado (as que sobraram e
   as novas). `{op, id, costura: true}`: só as faces que tocam a COSTURA — a
   aresta onde um sólido encontra o outro. As arestas da costura ficam
   guardadas no registro (`arestas`, pares de vértice) para o arredondamento
   da fatia 4 do plano.

   HERANÇA: o pedaço a mais herda cor, material, parte, liso e sólido da face
   de onde veio (lei do `furo`/`espelha`). `tinta` NÃO: ela é ancorada na
   forma da face, e a face mudou de forma — a face cortada e os pedaços perdem
   a tinta, a face não tocada a mantém. `pesos` de esqueleto não são
   interpolados para os vértices novos da costura.

   RESULTADO VAZIO GRITA. Interseção sem volume comum, ou subtração que come a
   peça inteira, apagariam todas as faces das entradas de uma vez — o no-op
   destrutivo que este núcleo recusa. O passo aborta e diz a causa.

   COMPLETUDE, a lei do `arranja`: tudo é conferido e calculado ANTES de
   reservar um id. Manifold não carregada, seleção vazia, sólido aberto,
   seleções que dividem face, resultado vazio e estouro do bloco GRITAM, e o
   passo inteiro aborta com 0 V/0 F. */
export function criarOperacoesBooleanas(servicos) {
  const { BLOCO, baseDoPasso, normalDaFace, addV, addF, grita, registraOrigem, textoDeclaracoes, resolverSelecao, manifoldCarregada } = servicos;

  /* Solda: cantos a menos de 1e-9 um do outro (na grade) são o MESMO ponto. O
     representante é o menor id, então a solda não depende da ordem dos
     passos. É o que deixa um `lathe` com costura de vértices repetidos entrar
     como sólido fechado. */
  const chaveDoPonto = (p) => p.map((c) => Math.round(c * 1e9)).join(',');

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const tamanho = (a) => Math.hypot(a[0], a[1], a[2]);

  function areaDe(pos, P) {
    let s = [0, 0, 0];
    const o = pos(P[0]);
    for (let k = 1; k < P.length - 1; k++) {
      const c = cruz(sub(pos(P[k]), o), sub(pos(P[k + 1]), o));
      s = [s[0] + c[0], s[1] + c[1], s[2] + c[2]];
    }
    return tamanho(s) / 2;
  }

  /* convexo em relação à normal da face de origem: nenhuma curva para o lado
     de dentro. Cantos colineares (curva zero) são aceitos — são os cantos que
     a face vizinha usa, e tirá-los abriria fenda. */
  function convexo(pos, P, n) {
    for (let k = 0; k < P.length; k++) {
      const a = pos(P[k]), b = pos(P[(k + 1) % P.length]), c = pos(P[(k + 2) % P.length]);
      const e1 = sub(b, a), e2 = sub(c, b);
      const tol = 1e-7 * tamanho(e1) * tamanho(e2);
      if (ponto(cruz(e1, e2), n) < -tol) return false;
    }
    return true;
  }

  /* funde P e Q pela aresta comum (u→v em P, v→u em Q). Devolve null se não
     houver exatamente uma aresta comum com só os dois cantos em comum. */
  function fundir(P, Q) {
    const comuns = P.filter((v) => Q.includes(v));
    if (comuns.length !== 2) return null;
    for (let k = 0; k < P.length; k++) {
      const u = P[k], v = P[(k + 1) % P.length];
      const j = Q.indexOf(v);
      if (j < 0 || Q[(j + 1) % Q.length] !== u) continue;
      const Pr = [], Qr = [];
      for (let t = 0; t < P.length; t++) Pr.push(P[(k + 1 + t) % P.length]);   // v … u
      for (let t = 0; t < Q.length; t++) Qr.push(Q[(j + 1 + t) % Q.length]);   // u … v
      return [...Pr, ...Qr.slice(1, -1)];
    }
    return null;
  }

  function pedacosConvexos(pos, triangulos, n) {
    const pecas = triangulos.map((t) => t.slice());
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (let p = 0; p < pecas.length && !mudou; p++) {
        for (let q = p + 1; q < pecas.length; q++) {
          const m = fundir(pecas[p], pecas[q]);
          if (m && convexo(pos, m, n)) { pecas[p] = m; pecas.splice(q, 1); mudou = true; break; }
        }
      }
    }
    return pecas;
  }

  /* ciclo da borda de um componente, se for UM laço simples; senão null. */
  function cicloDaBorda(triangulos) {
    const dirigidas = new Set();
    for (const t of triangulos) for (let k = 0; k < 3; k++) dirigidas.add(`${t[k]}>${t[(k + 1) % 3]}`);
    const prox = new Map();
    for (const t of triangulos) for (let k = 0; k < 3; k++) {
      const a = t[k], b = t[(k + 1) % 3];
      if (dirigidas.has(`${b}>${a}`)) continue;
      if (prox.has(a)) return null;
      prox.set(a, b);
    }
    if (!prox.size) return null;
    const inicio = prox.keys().next().value;
    const ciclo = [inicio];
    for (let v = prox.get(inicio); v !== inicio; v = prox.get(v)) {
      if (v == null || ciclo.length > prox.size) return null;
      ciclo.push(v);
    }
    return ciclo.length === prox.size ? ciclo : null;
  }

  function mesmoCiclo(a, b) {
    if (a.length !== b.length) return false;
    const k0 = b.indexOf(a[0]);
    if (k0 < 0) return false;
    return a.every((v, k) => b[(k0 + k) % b.length] === v);
  }

  /* componentes conexos por aresta, na ordem do menor triângulo. */
  function componentes(triangulos) {
    const pai = triangulos.map((_, k) => k);
    const raiz = (k) => { while (pai[k] !== k) { pai[k] = pai[pai[k]]; k = pai[k]; } return k; };
    const dono = new Map();
    triangulos.forEach((t, k) => {
      for (let e = 0; e < 3; e++) {
        const a = t[e], b = t[(e + 1) % 3];
        const chave = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (dono.has(chave)) { const r1 = raiz(dono.get(chave)), r2 = raiz(k); if (r1 !== r2) pai[Math.max(r1, r2)] = Math.min(r1, r2); }
        else dono.set(chave, k);
      }
    });
    const grupos = new Map();
    triangulos.forEach((t, k) => { const r = raiz(k); if (!grupos.has(r)) grupos.set(r, []); grupos.get(r).push(t); });
    return [...grupos.values()];
  }

  function booleana(st, a, i, op) {
    const b = baseDoPasso(i);

    // ---- identidade estrutural obrigatória ----
    if (a.origemId == null) return grita(st, i, op, 'origemId', `${op} é sempre estrutural: origemId é obrigatório (sem ele a costura nasceria anônima)`);
    if (!Number.isSafeInteger(a.origemId) || a.origemId < 0) return grita(st, i, op, 'origemId', 'origemId precisa ser inteiro não-negativo');
    const declaracoes = st.declaracoesOrigem.get(a.origemId) ?? [];
    if (declaracoes.length > 1) return grita(st, i, op, 'origemId', textoDeclaracoes(a.origemId, declaracoes));

    const wasm = manifoldCarregada();
    if (!wasm) return grita(st, i, op, null, `${op} precisa da biblioteca Manifold carregada: chame await carregarManifold() (procedural/nucleo/manifold.js) antes de executar a receita`);

    if (!Array.isArray(a.solidos) || a.solidos.length < 2) return grita(st, i, op, 'solidos', `${op} exige solidos: uma lista de duas ou mais seleções, uma por sólido${op === 'subtrair' ? ' (o primeiro é a peça; os demais são tirados dela)' : ''}`);

    // ---- os sólidos: faces de cada seleção, sem face dividida ----
    const operandos = [];
    const donoDaFace = new Map();
    for (let k = 0; k < a.solidos.length; k++) {
      const antes = st.orfaos.length;
      const r = resolverSelecao(st, a.solidos[k], op, i);
      if (st.orfaos.length > antes) return;
      const faces = [...r.faces].sort((x, y) => x - y);
      if (!faces.length) return grita(st, i, op, `solidos[${k}]`, `a seleção do sólido ${k} não tem face nenhuma`);
      for (const f of faces) {
        if (donoDaFace.has(f)) return grita(st, i, op, `solidos[${k}]`, `a face ${f} está no sólido ${donoDaFace.get(f)} e no sólido ${k}; cada face pertence a um sólido só`);
        donoDaFace.set(f, k);
      }
      operandos.push(faces);
    }

    // ---- solda dos cantos coincidentes (representante = menor id) ----
    /* A solda vale ENTRE operandos também: dois cubos idênticos entram com os
       mesmos oito representantes, e é isso que permite à política de face
       coplanar (abaixo) devolver a face do primeiro com os cantos dele. */
    const idsDasEntradas = [...new Set(operandos.flat().flatMap((f) => st.F.get(f).vs))].sort((x, y) => x - y);
    const repPorChave = new Map(), repDe = new Map();
    for (const v of idsDasEntradas) {
      const chave = chaveDoPonto(st.V.get(v));
      if (!repPorChave.has(chave)) repPorChave.set(chave, v);
      repDe.set(v, repPorChave.get(chave));
    }
    const reps = [...new Set(repPorChave.values())].sort((x, y) => x - y);
    const indiceDoRep = new Map(reps.map((v, k) => [v, k]));
    const cicloRep = (vs) => {
      const c = [];
      for (const v of vs) { const r = repDe.get(v); if (c[c.length - 1] !== r) c.push(r); }
      while (c.length > 1 && c[0] === c[c.length - 1]) c.pop();
      return c;
    };

    /* ---- PRECISÃO: a Manifold trabalha em Float32 ----
       As coordenadas entram LOCAIS, relativas ao centro da caixa dos
       operandos: isso tira o deslocamento da peça do erro (uma peça em x=3000
       tem o mesmo erro que na origem). O que sobra é a razão entre o tamanho
       da caixa e a menor aresta: com 2^-20 (≈1e-6) da meia-caixa maior que a
       menor aresta, o Float32 funde cantos e um operando pode sumir sem erro
       nenhum. Aí o passo GRITA em vez de devolver a peça sem o operando. */
    const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
    for (const v of reps) { const p = st.V.get(v); for (let c = 0; c < 3; c++) { if (!Number.isFinite(p[c])) return grita(st, i, op, 'solidos', `o vértice ${v} tem coordenada não finita`); min[c] = Math.min(min[c], p[c]); max[c] = Math.max(max[c], p[c]); } }
    const centro = [0, 1, 2].map((c) => (min[c] + max[c]) / 2);
    const meiaCaixa = Math.max(...[0, 1, 2].map((c) => (max[c] - min[c]) / 2));
    let menorAresta = Infinity;
    for (const faces of operandos) for (const fid of faces) {
      const c = cicloRep(st.F.get(fid).vs);
      if (c.length < 3) continue;
      for (let e = 0; e < c.length; e++) menorAresta = Math.min(menorAresta, tamanho(sub(st.V.get(c[e]), st.V.get(c[(e + 1) % c.length]))));
    }
    if (meiaCaixa * 2 ** -20 > menorAresta) return grita(st, i, op, 'solidos', `fora da precisão útil da Manifold (Float32): a caixa dos operandos mede ${meiaCaixa * 2} e a menor aresta ${menorAresta}, razão acima de 2^20; aproxime os sólidos ou faça a booleana em partes menores`);
    const local = (p) => [p[0] - centro[0], p[1] - centro[1], p[2] - centro[2]];

    // ---- conferência de sólido fechado e montagem da entrada da Manifold ----
    const entradas = [];            // faceID da Manifold -> id da face do núcleo
    const operandoDaEntrada = [];
    const degeneradas = [];
    const manifolds = [];
    const liberar = () => { for (const m of manifolds) m.delete(); };
    for (let k = 0; k < operandos.length; k++) {
      const dirigidas = new Map();
      const tris = [], idsFace = [];
      for (const fid of operandos[k]) {
        const c = cicloRep(st.F.get(fid).vs);
        if (new Set(c).size < 3) { degeneradas.push(fid); continue; }
        for (let e = 0; e < c.length; e++) {
          const chave = `${c[e]}>${c[(e + 1) % c.length]}`;
          dirigidas.set(chave, (dirigidas.get(chave) ?? 0) + 1);
        }
        const faceID = entradas.length;
        entradas.push(fid); operandoDaEntrada.push(k);
        for (let t = 1; t < c.length - 1; t++) { tris.push(c[0], c[t], c[t + 1]); idsFace.push(faceID); }   // leque, o mesmo do adaptador
      }
      let abertas = 0;
      for (const [chave, n] of dirigidas) {
        const [x, y] = chave.split('>');
        if (n !== 1 || dirigidas.get(`${y}>${x}`) !== 1) abertas++;
      }
      if (abertas) { liberar(); return grita(st, i, op, `solidos[${k}]`, `o sólido ${k} não é fechado: ${abertas} aresta(s) dirigida(s) sem par oposto depois de soldar os cantos coincidentes; ${op} só aceita superfície fechada e orientada. Confira se a seleção cobre o sólido inteiro: {op:'cilindro',id} sem eixo resolve só as laterais (una laterais e tampas num alias), e loft ou lathe só fecham com as pontas em raio 0`); }
      // vértices deste sólido em coordenada local, com o índice do representante como 4ª propriedade
      const locais = [...new Set(tris)].sort((x, y) => x - y);
      const indice = new Map(locais.map((v, t) => [v, t]));
      const props = new Float32Array(locais.length * 4);
      locais.forEach((v, t) => { props.set([...local(st.V.get(v)), indiceDoRep.get(v)], t * 4); });
      const mesh = new wasm.Mesh({ numProp: 4, vertProperties: props, triVerts: Uint32Array.from(tris, (v) => indice.get(v)), faceID: Uint32Array.from(idsFace) });
      try { manifolds.push(new wasm.Manifold(mesh)); }
      catch (e) { liberar(); return grita(st, i, op, `solidos[${k}]`, `a Manifold recusou o sólido ${k}: ${e?.message ?? e}`); }
      const estado = manifolds[k].status();
      if (estado !== 'NoError') { liberar(); return grita(st, i, op, `solidos[${k}]`, `a Manifold recusou o sólido ${k}: ${estado}`); }
    }

    // ---- o cálculo ----
    const M = wasm.Manifold;
    const resultado = op === 'unir' ? M.union(manifolds) : op === 'subtrair' ? M.difference(manifolds) : M.intersection(manifolds);
    if (resultado.isEmpty()) {
      resultado.delete(); liberar();
      return grita(st, i, op, 'solidos', op === 'intersectar'
        ? 'os sólidos não têm volume em comum: a interseção é vazia e apagaria todas as faces das entradas'
        : op === 'subtrair' ? 'a subtração não deixa nada da peça: o resultado é vazio e apagaria todas as faces das entradas'
          : 'a união saiu vazia');
    }
    const malha = resultado.getMesh();
    resultado.delete();
    const nP = malha.numProp, VP = malha.vertProperties, TV = malha.triVerts, FID = malha.faceID;
    const nVert = VP.length / nP;

    // ---- planos das faces de entrada, em double ----
    const planos = entradas.map((fid) => {
      const vs = st.F.get(fid).vs;
      const n = normalDaFace(st.V, vs);
      return { n, d: ponto(n, st.V.get(vs[0])), vs };
    });

    // ---- vértices da saída -> ids do núcleo ----
    /* vértice NOVO nasce com id provisório negativo; só os que alguma face
       final usa ganham id do bloco, no fim, em ordem crescente do provisório. */
    const pai = Array.from({ length: nVert }, (_, k) => k);
    const raiz = (k) => { while (pai[k] !== k) { pai[k] = pai[pai[k]]; k = pai[k]; } return k; };
    for (let k = 0; k < (malha.mergeFromVert?.length ?? 0); k++) {
      const r1 = raiz(malha.mergeFromVert[k]), r2 = raiz(malha.mergeToVert[k]);
      if (r1 !== r2) pai[Math.max(r1, r2)] = Math.min(r1, r2);
    }
    const original = (j) => {
      const k = VP[j * nP + 3];
      if (!Number.isInteger(k) || k < 0 || k >= reps.length) return null;
      const p = local(st.V.get(reps[k]));
      for (let c = 0; c < 3; c++) if (Math.fround(p[c]) !== VP[j * nP + c]) return null;
      return reps[k];
    };
    const idDoGrupo = new Map();          // raiz -> id do núcleo (ou provisório < 0)
    for (let j = 0; j < nVert; j++) {
      const orig = original(j), r = raiz(j);
      if (orig != null && (!idDoGrupo.has(r) || orig < idDoGrupo.get(r))) idDoGrupo.set(r, orig);
    }
    const posNova = new Map();
    for (let j = 0; j < nVert; j++) {
      const r = raiz(j);
      if (idDoGrupo.has(r)) continue;
      const id = -1 - posNova.size;
      idDoGrupo.set(r, id);
      posNova.set(id, [VP[r * nP] + centro[0], VP[r * nP + 1] + centro[1], VP[r * nP + 2] + centro[2]]);
    }
    const pos = (v) => posNova.get(v) ?? st.V.get(v);
    const idDe = (j) => idDoGrupo.get(raiz(j));
    const nTri = TV.length / 3;
    const triDe = (t) => [idDe(TV[3 * t]), idDe(TV[3 * t + 1]), idDe(TV[3 * t + 2])];

    /* ---- POLÍTICA DE FACE COPLANAR SOBREPOSTA ----
       Duas faces de operandos diferentes no mesmo plano, com a mesma normal,
       dividem a mesma superfície, e a Manifold entrega os triângulos de uma e
       de outra misturados. Vence a face do PRIMEIRO operando (o de menor índice
       em `solidos`): o triângulo cujo centro cai dentro de uma face coplanar de
       um operando anterior passa a ser dela. A face perdedora que fica sem
       triângulo vai para consumidas. Dois cubos idênticos unidos voltam a ser o
       primeiro cubo, 6 faces e 8 cantos. */
    const escalaTol = Math.max(meiaCaixa, 1) * 1e-6;
    const dentroDoPoligono = (c, pl) => {
      const n = pl.n;
      const ax = Math.abs(n[0]) >= Math.abs(n[1]) && Math.abs(n[0]) >= Math.abs(n[2]) ? 0 : Math.abs(n[1]) >= Math.abs(n[2]) ? 1 : 2;
      const u = (ax + 1) % 3, w = (ax + 2) % 3;
      let dentro = false;
      const P = pl.vs.map((v) => st.V.get(v));
      for (let k = 0, m = P.length - 1; k < P.length; m = k++) {
        if ((P[k][w] > c[w]) !== (P[m][w] > c[w]) && c[u] < (P[m][u] - P[k][u]) * (c[w] - P[k][w]) / (P[m][w] - P[k][w]) + P[k][u]) dentro = !dentro;
      }
      return dentro;
    };
    const faceDoTri = [];
    for (let t = 0; t < nTri; t++) {
      let e = FID[t];
      const k = operandoDaEntrada[e];
      if (k > 0) {
        const tri = triDe(t).map(pos);
        const c = [0, 1, 2].map((x) => (tri[0][x] + tri[1][x] + tri[2][x]) / 3);
        const n = planos[e].n;
        for (let e2 = 0; e2 < entradas.length && operandoDaEntrada[e2] < k; e2++) {
          const pl = planos[e2];
          if (ponto(pl.n, n) > 1 - 1e-9 && Math.abs(ponto(pl.n, c) - pl.d) < escalaTol && dentroDoPoligono(c, pl)) { e = e2; break; }
        }
      }
      faceDoTri.push(e);
    }

    /* ---- VÉRTICE NOVO EM DOUBLE ----
       A Manifold devolve o vértice da costura em Float32 (0.10000000149… ao
       lado de 0.1), e a face cortada deixaria de ser plana. Cada vértice novo
       é recalculado pelos planos das faces de entrada que se encontram nele:
       com três planos independentes é a interseção exata; com dois (o vértice
       numa aresta de entrada), a menor correção que o põe nos dois. */
    const planosDoVertice = new Map();
    for (let t = 0; t < nTri; t++) for (const v of triDe(t)) if (v < 0) {
      if (!planosDoVertice.has(v)) planosDoVertice.set(v, new Set());
      planosDoVertice.get(v).add(FID[t]); planosDoVertice.get(v).add(faceDoTri[t]);
    }
    for (const [v, conjunto] of [...planosDoVertice].sort((x, y) => y[0] - x[0])) {
      const p0 = posNova.get(v);
      const base = [];
      for (const e of [...conjunto].sort((x, y) => x - y)) {
        const n = planos[e].n;
        let r = n.slice();
        for (const q of base) { const s = ponto(r, q.o); r = [r[0] - s * q.o[0], r[1] - s * q.o[1], r[2] - s * q.o[2]]; }
        const l = tamanho(r);
        if (l > 1e-6) base.push({ o: r.map((x) => x / l), n, d: planos[e].d });
        if (base.length === 3) break;
      }
      // x = p0 + Nᵀλ, com (N Nᵀ) λ = d − N p0
      const m = base.length;
      const A = base.map((q) => base.map((r) => ponto(q.n, r.n)));
      const y = base.map((q) => q.d - ponto(q.n, p0));
      for (let c = 0; c < m; c++) {
        let piv = c;
        for (let r = c + 1; r < m; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
        [A[c], A[piv]] = [A[piv], A[c]]; [y[c], y[piv]] = [y[piv], y[c]];
        for (let r = c + 1; r < m; r++) { const f = A[r][c] / A[c][c]; for (let q = c; q < m; q++) A[r][q] -= f * A[c][q]; y[r] -= f * y[c]; }
      }
      const lambda = new Array(m).fill(0);
      for (let c = m - 1; c >= 0; c--) { let s = y[c]; for (let q = c + 1; q < m; q++) s -= A[c][q] * lambda[q]; lambda[c] = s / A[c][c]; }
      const x = p0.slice();
      base.forEach((q, k) => { for (let c = 0; c < 3; c++) x[c] += lambda[k] * q.n[c]; });
      posNova.set(v, x);
    }

    // ---- triângulos por face de origem ----
    const trisDaEntrada = new Map();
    const operandoDoTri = [];
    const vivos = new Set();
    for (let t = 0; t < nTri; t++) {
      const tri = triDe(t);
      const e = faceDoTri[t];
      operandoDoTri.push(operandoDaEntrada[e]);
      for (const v of tri) vivos.add(v);
      if (new Set(tri).size < 3) continue;
      if (!trisDaEntrada.has(e)) trisDaEntrada.set(e, []);
      trisDaEntrada.get(e).push(tri);
    }

    /* ---- OPERANDO QUE SOME ----
       Na união, um operando só pode ficar sem face se estiver CONTIDO nos
       outros (o volume da interseção com a união dos demais é o volume dele).
       No subtrair, a peça (o primeiro) nunca pode sumir. Qualquer outro
       sumiço é erro numérico, e grita em vez de devolver a peça sem ele. */
    const temFace = operandos.map(() => false);
    for (const e of trisDaEntrada.keys()) temFace[operandoDaEntrada[e]] = true;
    let sumico = null;
    if (op === 'subtrair' && !temFace[0]) sumico = 'a peça (sólido 0) não deixou face nenhuma no resultado';
    if (op === 'unir') for (let k = 0; k < operandos.length && !sumico; k++) {
      if (temFace[k]) continue;
      const outros = M.union(manifolds.filter((_, q) => q !== k));
      const comum = M.intersection([manifolds[k], outros]);
      const vk = manifolds[k].volume(), vc = comum.volume();
      outros.delete(); comum.delete();
      if (Math.abs(vk - vc) > 1e-6 * Math.max(vk, 1e-30)) sumico = `o sólido ${k} não está contido nos outros e mesmo assim não deixou face nenhuma na união`;
    }
    liberar();
    if (sumico) return grita(st, i, op, 'solidos', `${sumico}; erro numérico da Manifold, nada foi alterado`);

    // ---- costura: aresta entre triângulos de sólidos diferentes ----
    const donoDaAresta = new Map(), costura = new Set();
    for (let t = 0; t < nTri; t++) {
      const tri = triDe(t);
      for (let e = 0; e < 3; e++) {
        const x = tri[e], y = tri[(e + 1) % 3];
        if (x === y) continue;
        const chave = x < y ? `${x}_${y}` : `${y}_${x}`;
        const outro = donoDaAresta.get(chave);
        if (outro == null) donoDaAresta.set(chave, operandoDoTri[t]);
        else if (outro !== operandoDoTri[t]) costura.add(chave);
      }
    }

    // ---- faces: mantida, cortada (id no maior pedaço), pedaço a mais, consumida ----
    /* Face degenerada (menos de três cantos depois da solda, o polo de um
       lathe) não entra na Manifold. Ela fica como estava se todos os cantos
       dela sobreviveram; se algum sumiu, foi comida junto e é consumida. */
    const consumidas = degeneradas.filter((fid) => !cicloRep(st.F.get(fid).vs).every((v) => vivos.has(v)));
    const mantidas = [], cortadas = [], pedacosNovos = [];
    for (let e = 0; e < entradas.length; e++) {
      const fid = entradas[e];
      const tris = trisDaEntrada.get(e);
      if (!tris) { consumidas.push(fid); continue; }
      const f = st.F.get(fid);
      const comps = componentes(tris);
      if (comps.length === 1) {
        const ciclo = cicloDaBorda(comps[0]);
        if (ciclo && mesmoCiclo(ciclo, cicloRep(f.vs))) { mantidas.push(fid); continue; }
      }
      const n = planos[e].n;
      const pecas = comps.flatMap((c) => pedacosConvexos(pos, c, n));
      let maior = 0;
      for (let k = 1; k < pecas.length; k++) if (areaDe(pos, pecas[k]) > areaDe(pos, pecas[maior])) maior = k;
      cortadas.push([fid, pecas[maior]]);
      pecas.forEach((P, k) => { if (k !== maior) pedacosNovos.push([fid, P]); });
    }
    if (pedacosNovos.length > BLOCO) return grita(st, i, op, 'solidos', `a costura partiu faces em ${pedacosNovos.length} pedaços a mais, mais que o bloco de ${BLOCO} ids do passo; divida a operação em passos menores`);

    // ---- ids definitivos dos vértices novos: só os usados, em ordem ----
    const usadosNovos = new Set();
    for (const [, P] of [...cortadas, ...pedacosNovos]) for (const v of P) if (v < 0) usadosNovos.add(v);
    const provisorios = [...usadosNovos].sort((x, y) => y - x);   // -1, -2, … = ordem da saída
    if (provisorios.length > BLOCO) return grita(st, i, op, 'solidos', `a costura criou ${provisorios.length} vértices, mais que o bloco de ${BLOCO} ids do passo; divida a operação em passos menores`);
    const definitivo = new Map(provisorios.map((v, k) => [v, b + k]));
    const idFinal = (v) => definitivo.get(v) ?? v;

    // ---- daqui em diante nada pode falhar: aplica ----
    for (const v of provisorios) addV(st, definitivo.get(v), posNova.get(v));
    const faces = [...mantidas];
    for (const [fid, P] of cortadas) {
      const f = st.F.get(fid);
      f.vs = P.map(idFinal); f.tinta = [];
      faces.push(fid);
    }
    pedacosNovos.forEach(([fid, P], k) => {
      const id = b + k, f = st.F.get(fid);
      addF(st, id, P.map(idFinal));
      const nf = st.F.get(id);
      nf.cor = f.cor; nf.material = f.material; nf.parte = f.parte; nf.liso = f.liso; nf.solido = f.solido;
      if (st.parteAtribuidaEm?.has(fid)) st.parteAtribuidaEm.set(id, st.parteAtribuidaEm.get(fid));
      faces.push(id);
    });
    for (const fid of consumidas) { st.F.delete(fid); st.consumidas.set(fid, { passo: i, op }); }
    const usados = new Set();
    for (const f of st.F.values()) for (const v of f.vs) usados.add(v);
    for (const v of idsDasEntradas) if (!usados.has(v)) st.V.delete(v);

    const arestas = [];
    const costuraFinal = new Set();
    for (const c of costura) {
      const [x, y] = c.split('_').map(Number).map(idFinal);
      if (!usados.has(x) || !usados.has(y)) continue;
      const par = x < y ? [x, y] : [y, x];
      arestas.push(par); costuraFinal.add(`${par[0]}-${par[1]}`);
    }
    arestas.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const facesDaCostura = faces.filter((fid) => {
      const vs = st.F.get(fid).vs;
      return vs.some((v, k) => { const w = vs[(k + 1) % vs.length]; return costuraFinal.has(v < w ? `${v}-${w}` : `${w}-${v}`); });
    });
    registraOrigem(st, i, op, a.origemId, {
      faces: faces.sort((x, y) => x - y),
      costura: facesDaCostura.sort((x, y) => x - y),
      arestas,
    });
  }

  /* a forma `nome(st, a, i)` é a que o mapa estático do motor
     (tools/arquitetura/mapear-motor-procedural.mjs) reconhece como operação. */
  return {
  unir(st, a, i) { return booleana(st, a, i, 'unir'); },
  subtrair(st, a, i) { return booleana(st, a, i, 'subtrair'); },
  intersectar(st, a, i) { return booleana(st, a, i, 'intersectar'); },
  };
}
