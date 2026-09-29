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
  const { BLOCO, baseDoPasso, normalDaFace, addV, addF, grita, registraOrigem, textoDeclaracoes, resolverSelecao, manifoldCarregada, erroDaCargaDaManifold } = servicos;

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

  /* O adaptador desenha a face em leque a partir do canto 0. Com canto
     colinear (o que a costura deixa na borda de um pedaço), um leque que
     começa ao lado dele gera triângulo sem área. O pedaço começa pelo canto
     cujo leque tem o MAIOR menor triângulo; empate fica com o primeiro. */
  function melhorInicio(pos, P) {
    let melhor = 0, valor = -Infinity;
    for (let s = 0; s < P.length; s++) {
      let menor = Infinity;
      const o = pos(P[s]);
      for (let k = 1; k < P.length - 1; k++) {
        const a = pos(P[(s + k) % P.length]), b = pos(P[(s + k + 1) % P.length]);
        menor = Math.min(menor, tamanho(cruz(sub(a, o), sub(b, o))));
      }
      if (menor > valor) { valor = menor; melhor = s; }
    }
    return [...P.slice(melhor), ...P.slice(0, melhor)];
  }

  function pedacosConvexos(pos, triangulos, n, piso = 0) {
    const pecas = triangulos.map((t) => t.slice());
    let mudou = true;
    while (mudou) {
      mudou = false;
      for (let p = 0; p < pecas.length && !mudou; p++) {
        for (let q = p + 1; q < pecas.length; q++) {
          const m = fundir(pecas[p], pecas[q]);
          /* pedaço sem área (lasca) se funde mesmo sem convexidade exata: ele não
             ocupa área, e sozinho sairia degenerado na tela */
          if (m && (convexo(pos, m, n) || areaDe(pos, pecas[p]) < piso || areaDe(pos, pecas[q]) < piso)) { pecas[p] = m; pecas.splice(q, 1); mudou = true; break; }
        }
      }
    }
    return pecas.map((P) => melhorInicio(pos, P));
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

  /* identidade estrutural e Manifold carregada: a abertura comum de toda op
     deste arquivo. Devolve a instância, ou null depois de gritar. */
  function abertura(st, a, i, op) {
    if (a.origemId == null) { grita(st, i, op, 'origemId', `${op} é sempre estrutural: origemId é obrigatório (sem ele a costura nasceria anônima)`); return null; }
    if (!Number.isSafeInteger(a.origemId) || a.origemId < 0) { grita(st, i, op, 'origemId', 'origemId precisa ser inteiro não-negativo'); return null; }
    const declaracoes = st.declaracoesOrigem.get(a.origemId) ?? [];
    if (declaracoes.length > 1) { grita(st, i, op, 'origemId', textoDeclaracoes(a.origemId, declaracoes)); return null; }
    const wasm = manifoldCarregada();
    if (!wasm) { grita(st, i, op, null, `${op} precisa da biblioteca Manifold, que não carregou: ${erroDaCargaDaManifold()?.message ?? 'motivo desconhecido'} (o núcleo a carrega sozinho em procedural/nucleo/manifold.js; confira se o servidor entrega manifold-3d e o .wasm)`); return null; }
    return wasm;
  }

  function booleana(st, a, i, op) {
    const wasm = abertura(st, a, i, op);
    if (!wasm) return;

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
    return nucleoBooleano(st, i, op, wasm, a.origemId, operandos, null);
  }

  /* O CAMINHO COMUM: sólidos do núcleo entram na Manifold, o resultado volta
     com a identidade. `extra` é o gancho do `arredondarCostura`: ele calcula
     o resultado a partir dos sólidos já convertidos e devolve junto um sólido
     AUXILIAR (o material do arredondamento), cujas faces não vêm de face
     nenhuma do núcleo e por isso nascem todas com id novo. */
  function nucleoBooleano(st, i, op, wasm, origemId, operandos, extra) {
    const b = baseDoPasso(i);

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
      if (abertas) { liberar(); return grita(st, i, op, `solidos[${k}]`, `o sólido ${k} não é fechado: ${abertas} aresta(s) dirigida(s) sem par oposto depois de soldar os cantos coincidentes; ${op} só aceita superfície fechada e orientada.${extra ? '' : " Confira se a seleção cobre o sólido inteiro: {op:'cilindro',id} sem eixo resolve só as laterais (una laterais e tampas num alias), e loft ou lathe só fecham com as pontas em raio 0"}`); }
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
    let resultado, auxID = null;
    if (extra) {
      const r = extra.calcular(M, manifolds, local);
      if (r.erro) { liberar(); return grita(st, i, op, extra.ref, r.erro); }
      ({ resultado, auxID } = r);
    } else resultado = op === 'unir' ? M.union(manifolds) : op === 'subtrair' ? M.difference(manifolds) : M.intersection(manifolds);
    if (resultado.isEmpty()) {
      resultado.delete(); liberar();
      return grita(st, i, op, 'solidos', op === 'intersectar'
        ? 'os sólidos não têm volume em comum: a interseção é vazia e apagaria todas as faces das entradas'
        : op === 'subtrair' ? 'a subtração não deixa nada da peça: o resultado é vazio e apagaria todas as faces das entradas'
          : 'a união saiu vazia');
    }
    const malha = resultado.getMesh();
    resultado.delete();
    const nP = malha.numProp, VP = malha.vertProperties, TV = malha.triVerts;
    const nVert = VP.length / nP;
    /* índice de face efetivo por triângulo: 0..E-1 são as faces do núcleo
       (o faceID que entrou); E.. são as faces do sólido AUXILIAR, numeradas na
       ordem em que aparecem na saída. O auxiliar é reconhecido pela corrida
       (`runOriginalID`), porque o faceID dele é da Manifold e colide com os
       nossos. */
    const E = entradas.length;
    const FID = Uint32Array.from(malha.faceID);
    if (auxID != null) {
      const auxIndice = new Map();
      for (let r = 0; r < malha.runOriginalID.length; r++) {
        if (malha.runOriginalID[r] !== auxID) continue;
        for (let t = malha.runIndex[r] / 3; t < malha.runIndex[r + 1] / 3; t++) {
          const f = malha.faceID[t];
          if (!auxIndice.has(f)) auxIndice.set(f, E + auxIndice.size);
          FID[t] = auxIndice.get(f);
        }
      }
    }
    const operandoDe = (e) => (e < E ? operandoDaEntrada[e] : operandos.length);

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
    const apelido = new Map();         // vértice novo soldado -> vértice que fica
    const idDe = (j) => { const v = idDoGrupo.get(raiz(j)); return apelido.get(v) ?? v; };
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
      const k = operandoDe(e);
      if (k > 0 && e < E) {
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
      for (const e of [FID[t], faceDoTri[t]]) if (e < E) planosDoVertice.get(v).add(e);   // plano do auxiliar não é exato: não entra
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

    /* ---- SOLDA DOS VÉRTICES NOVOS ----
       Dois vértices que a Manifold separou podem cair no mesmo ponto depois
       do recálculo pelos planos (ou ficar a um erro de Float32 de um canto
       que já existia), e as tampas de dois prismas vizinhos do
       `arredondarCostura`, que não coincidem quando o canto não é reto, deixam
       cantos a poucos milionésimos um do outro. Separados, eles dão polígono
       com dois cantos no mesmo lugar e triângulo sem área na tela. Vértice
       novo a menos de 2^-15 da meia-caixa (3e-5 do tamanho) de outro vira o
       outro: o original, se houver, senão o novo mais antigo. O valor foi
       medido: com 2^-21 o braço inclinado a 10° e raio 0,05 ainda deixava
       dois cantos a 1,4e-5 um do outro. Detalhe NOVO menor que isso some. */
    const tolSolda = Math.max(meiaCaixa, 1e-9) * 2 ** -15;
    const grade = new Map();
    const celula = (p) => p.map((c) => Math.floor(c / tolSolda));
    const inserir = (v, p) => { const k = celula(p).join(','); if (!grade.has(k)) grade.set(k, []); grade.get(k).push(v); };
    const vizinhoPerto = (p) => {
      const [cx, cy, cz] = celula(p);
      let melhor = null;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        for (const w of grade.get(`${cx + dx},${cy + dy},${cz + dz}`) ?? []) {
          if (tamanho(sub(pos(w), p)) <= tolSolda && (melhor == null || (w >= 0) > (melhor >= 0) || ((w >= 0) === (melhor >= 0) && Math.abs(w) < Math.abs(melhor)))) melhor = w;
        }
      }
      return melhor;
    };
    const originaisUsados = new Set();
    for (let t = 0; t < nTri; t++) for (const v of triDe(t)) if (v >= 0) originaisUsados.add(v);
    /* todos os cantos das entradas, e não só os que a saída usa: a Manifold
       pode devolver um canto antigo só pela cópia do sólido auxiliar, com
       outra marca, e ele precisa voltar a ser o canto antigo */
    for (const v of reps) originaisUsados.add(v);
    for (const v of [...originaisUsados].sort((x, y) => x - y)) inserir(v, st.V.get(v));
    for (const v of [...posNova.keys()].sort((x, y) => y - x)) {
      const w = vizinhoPerto(posNova.get(v));
      if (w != null) apelido.set(v, w); else inserir(v, posNova.get(v));
    }

    /* ---- LASCA: triângulo sem área ----
       Onde duas superfícies quase coplanares se encontram (a tampa de um
       prisma do `arredondarCostura` sobre a face do sólido, arredondada em
       Float32), a Manifold devolve triângulos de área abaixo do piso que a
       guarda de malha recusa (1e-9·escala²). Face feita só deles sai
       degenerada. A lasca passa para a face do vizinho pela aresta mais
       longa dela: vira um canto colinear no polígono do vizinho, e a malha
       continua fechada porque nenhuma aresta muda. */
    /* escala pelo TAMANHO do sólido, não pela distância à origem: a mesma
       peça em x=3000 tem as mesmas lascas que na origem */
    const escalaDaPeca = Math.max(1e-9, 2 * meiaCaixa);
    const piso = 1e-9 * escalaDaPeca * escalaDaPeca;
    const triPorAresta = new Map();
    for (let t = 0; t < nTri; t++) {
      const tri = triDe(t);
      for (let k = 0; k < 3; k++) {
        const x = tri[k], y = tri[(k + 1) % 3], chave = x < y ? `${x}_${y}` : `${y}_${x}`;
        if (!triPorAresta.has(chave)) triPorAresta.set(chave, []);
        triPorAresta.get(chave).push(t);
      }
    }
    const areaDoTri = (t) => { const [p0, p1, p2] = triDe(t).map(pos); return tamanho(cruz(sub(p1, p0), sub(p2, p0))) / 2; };
    for (let passada = 0; passada < 4; passada++) {
      let mudou = false;
      for (let t = 0; t < nTri; t++) {
        if (areaDoTri(t) >= piso) continue;
        const tri = triDe(t);
        let longa = 0, maior = -1;
        for (let k = 0; k < 3; k++) { const l = tamanho(sub(pos(tri[(k + 1) % 3]), pos(tri[k]))); if (l > maior) { maior = l; longa = k; } }
        const x = tri[longa], y = tri[(longa + 1) % 3];
        const vizinho = (triPorAresta.get(x < y ? `${x}_${y}` : `${y}_${x}`) ?? []).find((o) => o !== t);
        if (vizinho != null && faceDoTri[vizinho] !== faceDoTri[t]) { faceDoTri[t] = faceDoTri[vizinho]; mudou = true; }
      }
      if (!mudou) break;
    }

    // ---- triângulos por face de origem ----
    const trisDaEntrada = new Map();
    const operandoDoTri = [];
    const vivos = new Set();
    for (let t = 0; t < nTri; t++) {
      const tri = triDe(t);
      const e = faceDoTri[t];
      operandoDoTri.push(operandoDe(e));
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
    for (const e of trisDaEntrada.keys()) if (e < E) temFace[operandoDaEntrada[e]] = true;
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
      const pecas = comps.flatMap((c) => pedacosConvexos(pos, c, n, piso));
      let maior = 0;
      for (let k = 1; k < pecas.length; k++) if (areaDe(pos, pecas[k]) > areaDe(pos, pecas[maior])) maior = k;
      cortadas.push([fid, pecas[maior]]);
      pecas.forEach((P, k) => { if (k !== maior) pedacosNovos.push([fid, P, false]); });
    }
    /* faces do sólido auxiliar: todas novas, em pedaços convexos, herdando
       os atributos da face que `extra.herdaDe` indica. */
    const auxChaves = [...trisDaEntrada.keys()].filter((e) => e >= E).sort((x, y) => x - y);
    for (const e of auxChaves) {
      const tris = trisDaEntrada.get(e);
      const [p0, p1, p2] = tris[0].map(pos);
      const c = cruz(sub(p1, p0), sub(p2, p0)), l = tamanho(c) || 1;
      const n = c.map((x) => x / l);
      for (const comp of componentes(tris)) for (const P of pedacosConvexos(pos, comp, n, piso)) pedacosNovos.push([extra.herdaDe, P, true]);
    }
    if (pedacosNovos.length > BLOCO) return grita(st, i, op, 'solidos', `a costura partiu faces em ${pedacosNovos.length} pedaços a mais, mais que o bloco de ${BLOCO} ids do passo; divida a operação em passos menores`);

    /* ---- CANTO QUASE COLINEAR ----
       Vértice novo usado por exatamente duas faces, e que nas duas é um canto
       quase reto (o triângulo com os vizinhos tem área abaixo do piso), está
       no meio de uma aresta reta: tirá-lo das duas faces não abre fenda, e
       deixá-lo faz o adaptador cortar uma orelha sem área. Canto novo usado
       por três faces ou mais é quina de verdade e fica. */
    const poligonos = [...cortadas.map((c) => c[1]), ...pedacosNovos.map((c) => c[1])];
    for (let passada = 0; passada < 4; passada++) {
      const usos = new Map();
      for (const P of poligonos) for (const v of P) if (v < 0) usos.set(v, (usos.get(v) ?? 0) + 1);
      let tirou = false;
      for (const [v, n] of usos) {
        if (n !== 2) continue;
        const donos = poligonos.filter((P) => P.includes(v));
        const reto = donos.every((P) => {
          if (P.length <= 3) return false;
          const k = P.indexOf(v), a = pos(P[(k + P.length - 1) % P.length]), c = pos(P[(k + 1) % P.length]);
          return tamanho(cruz(sub(pos(v), a), sub(c, a))) / 2 < piso;
        });
        if (!reto) continue;
        for (const P of donos) P.splice(P.indexOf(v), 1);
        tirou = true;
      }
      if (!tirou) break;
    }

    /* O canto quase colinear que fica (usado por três faces: a ponta de uma
       tangência sobre a quina de um sólido) parte o pedaço por uma diagonal
       a partir dele, até o canto mais afastado da reta dos vizinhos. Nos dois
       pedaços ele deixa de ser colinear, e os dois continuam convexos. Partir
       um canto que não era colinear só custa um pedaço a mais. */
    const areaTri = (a, b, c) => tamanho(cruz(sub(pos(b), pos(a)), sub(pos(c), pos(a)))) / 2;
    const semColinear = (P) => {
      if (P.length <= 3) return [P];
      for (let k = 0; k < P.length; k++) {
        const a = P[(k + P.length - 1) % P.length], v = P[k], c = P[(k + 1) % P.length];
        if (areaTri(a, v, c) >= 10 * piso) continue;   // 10× o piso: a guarda mede a escala pela distância à origem, que pode ser maior que o tamanho
        let melhor = -1, valor = -Infinity;
        for (let j = 0; j < P.length; j++) {
          if (j === k || j === (k + 1) % P.length || j === (k + P.length - 1) % P.length) continue;
          const d = areaTri(a, c, P[j]);
          if (d > valor) { valor = d; melhor = j; }
        }
        if (melhor < 0) return [P];
        const um = [], dois = [];
        for (let t = k; ; t = (t + 1) % P.length) { um.push(P[t]); if (t === melhor) break; }
        for (let t = melhor; ; t = (t + 1) % P.length) { dois.push(P[t]); if (t === k) break; }
        return [...semColinear(um), ...semColinear(dois)];
      }
      return [P];
    };
    for (let k = 0; k < cortadas.length; k++) {
      const partes = semColinear(cortadas[k][1]).map((P) => melhorInicio(pos, P));
      let maior = 0;
      for (let j = 1; j < partes.length; j++) if (areaDe(pos, partes[j]) > areaDe(pos, partes[maior])) maior = j;
      cortadas[k][1] = partes[maior];
      partes.forEach((P, j) => { if (j !== maior) pedacosNovos.push([cortadas[k][0], P, false]); });
    }
    for (let k = pedacosNovos.length - 1; k >= 0; k--) {
      const [fid, P, aux] = pedacosNovos[k];
      const partes = semColinear(P).map((Q) => melhorInicio(pos, Q));
      pedacosNovos.splice(k, 1, ...partes.map((Q) => [fid, Q, aux]));
    }
    /* última rede: pedaço que ainda saiu sem área (a solda ou a retirada de
       um canto colinear o encolheu) se funde a um vizinho pela aresta comum,
       de preferência da mesma face de origem. */
    {
      const todos = [...cortadas.map((c) => ({ dono: c[0], ref: c, cortada: true })), ...pedacosNovos.map((c) => ({ dono: c[0], ref: c, cortada: false }))];
      for (const item of todos) {
        if (item.morto || areaDe(pos, item.ref[1]) >= piso) continue;
        const candidatos = todos.filter((o) => o !== item && !o.morto).sort((x, y) => (x.dono === item.dono ? 0 : 1) - (y.dono === item.dono ? 0 : 1));
        for (const o of candidatos) {
          const m = fundir(o.ref[1], item.ref[1]);
          if (!m) continue;
          o.ref[1] = melhorInicio(pos, m);
          item.morto = true;
          break;
        }
      }
      for (let k = pedacosNovos.length - 1; k >= 0; k--) if (todos.find((t) => t.ref === pedacosNovos[k])?.morto) pedacosNovos.splice(k, 1);
      for (let k = cortadas.length - 1; k >= 0; k--) {
        if (!todos.find((t) => t.ref === cortadas[k])?.morto) continue;
        /* a face cortada que sumiu na fusão passa o id a um pedaço dela, se houver */
        const [fid] = cortadas[k];
        const j = pedacosNovos.findIndex((p) => p[0] === fid && !p[2]);
        if (j >= 0) { cortadas[k] = [fid, pedacosNovos[j][1]]; pedacosNovos.splice(j, 1); }
        else { cortadas.splice(k, 1); consumidas.push(fid); }
      }
    }
    if (pedacosNovos.length > BLOCO) return grita(st, i, op, 'solidos', `a costura partiu faces em ${pedacosNovos.length} pedaços a mais, mais que o bloco de ${BLOCO} ids do passo; divida a operação em passos menores`);

    // ---- ids definitivos dos vértices novos: só os usados, em ordem ----
    if (extra && !auxChaves.length) return grita(st, i, op, extra.ref, 'o material do arredondamento não sobrou em face nenhuma do resultado');
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
    const facesAux = [];
    pedacosNovos.forEach(([fid, P, aux], k) => {
      const id = b + k, f = st.F.get(fid);
      addF(st, id, P.map(idFinal));
      const nf = st.F.get(id);
      nf.cor = f.cor; nf.material = f.material; nf.parte = f.parte; nf.liso = f.liso; nf.solido = f.solido;
      if (aux && extra.liso != null) nf.liso = extra.liso;
      if (st.parteAtribuidaEm?.has(fid)) st.parteAtribuidaEm.set(id, st.parteAtribuidaEm.get(fid));
      faces.push(id);
      if (aux) facesAux.push(id);
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
    registraOrigem(st, i, op, origemId, {
      faces: (extra ? facesAux : faces).sort((x, y) => x - y),
      costura: facesDaCostura.sort((x, y) => x - y),
      arestas,
      passo: i,
    });
  }

  /* arredondarCostura (fatia 4 do plano "União de sólidos") — arredonda com
     raio declarado o encontro côncavo que uma booleana criou.

     POR QUE NÃO O `arredondarAresta`: ele arredonda UMA aresta entre duas
     faces convexas, com leque simples nas pontas. A costura de uma booleana é
     uma poligonal de muitas arestas entre pedaços triangulados, e as pontas
     dela terminam em cantos de três ou mais faces. Nenhuma das três condições
     do `arredondarAresta` vale ali.

     POR QUE NÃO O FECHAMENTO MORFOLÓGICO (dilatar e erodir por uma bola, na
     Manifold): foi medido e recusado. Na fixture de coluna e braço, com bola
     de 32 lados, a erosão levou 12 s e o material a mais saiu com 4192
     triângulos, 1660 pedaços de face, acima do bloco de 1000 ids. Com 16 lados
     ainda eram 2 s.

     O CÁLCULO: cada aresta CÔNCAVA da costura (a face de um lado sobe à frente
     da face do outro) ganha um prisma de concordância. A seção dele, no plano
     perpendicular à aresta, é o canto P, as duas tangências a
     `r/tan(θ/2)` de P em cada face e o arco de raio `r` entre elas, com o
     centro no bissetor a `r/sin(θ/2)`: a mesma geometria do
     `arredondarAresta`, do lado de fora do canto. As pontas do prisma são
     cortadas em meia-esquadria (o plano bissetor das duas arestas da costura
     que se encontram ali), e aresta com ponta solta fecha reta. A união dos
     prismas entra na Manifold como sólido AUXILIAR e é unida ao sólido pelo
     mesmo caminho do `unir`, então as faces tocadas mantêm id.

     LIMITE, dito e não escondido: onde a costura dobra em torno de uma quina
     CONVEXA de um dos sólidos (a quina do braço que entra na coluna), a bola
     rolando faria um pedaço de toro; aqui os dois prismas se encontram em
     meia-esquadria, e fica um vinco no plano bissetor. Aresta convexa da
     costura não ganha material. O raio também não é conferido contra o
     tamanho das faces vizinhas: raio maior que a face faz o prisma sair dela.

     ARGUMENTOS
       `origemId`   OBRIGATÓRIO: a origem das faces novas do arredondamento;
       `de`         a origem `{op:'unir'|'subtrair'|'intersectar', id}` cuja
                    costura se arredonda. O sólido é o conjunto das faces vivas
                    dessa origem, e precisa continuar fechado;
       `raio`       PARAM dimensional > 0;
       `paineis`    TOPO, inteiro de 2 a 64, padrão 8: faixas do arco. Muda a
                    contagem de faces, então renumera.

     IDENTIDADE: a mesma do `unir`. As faces do sólido que o prisma encosta
     mantêm o id no maior pedaço; as faces do arredondamento são todas novas,
     no bloco do passo, e herdam cor, material e parte da primeira face da
     costura; o `liso` delas é 45° (o arco fica liso e a quina com a face plana
     vizinha continua nítida). A origem `{op:'arredondarCostura', id}` devolve
     as faces do arredondamento. Costura sem aresta côncava grita. */
  function arredondarCostura(st, a, i) {
    const op = 'arredondarCostura';
    const wasm = abertura(st, a, i, op);
    if (!wasm) return;
    const de = a.de;
    if (!de || typeof de !== 'object' || !['unir', 'subtrair', 'intersectar'].includes(de.op) || !Number.isSafeInteger(de.id) || Object.keys(de).some((k) => k !== 'op' && k !== 'id')) {
      return grita(st, i, op, 'de', "de precisa ser a origem de uma booleana: {op:'unir'|'subtrair'|'intersectar', id}");
    }
    const registros = st.origens.get(de.id) ?? [];
    if (registros.length !== 1 || registros[0].op !== de.op) return grita(st, i, op, 'de', `origem ${de.op}:${de.id} inexistente, ainda não criada ou declarada por outra operação`);
    const registro = registros[0];
    /* Diagnóstico com a causa, e não o sintoma. Arredondar de novo a mesma
       costura, ou depois de um passo que cortou faces dessa origem, deixava o
       sólido aberto, e o passo gritava "não é fechado" com o conselho do
       cilindro, que não tinha nada a ver (achado da revisão de 2026-09-29). */
    if (registro.arredondadaEm != null) return grita(st, i, op, 'de', `a costura de ${de.op}:${de.id} já foi arredondada pelo arredondarCostura do passo ${registro.arredondadaEm}; mude o raio daquele passo em vez de arredondar de novo`);
    for (const f of registro.faces) {
      if (st.F.has(f)) continue;
      const c = st.consumidas.get(f);
      return grita(st, i, op, 'de', c
        ? `a face ${f} da origem ${de.op}:${de.id} foi consumida pelo ${c.op} do passo ${c.passo}, e o sólido dessa origem ficou aberto; arredonde a costura antes do passo ${c.passo}`
        : `a face ${f} da origem ${de.op}:${de.id} foi removida depois que ela nasceu, e o sólido dessa origem ficou aberto; arredonde a costura antes de remover a face`);
    }
    const faces = registro.faces.filter((f) => st.F.has(f));
    if (!faces.length) return grita(st, i, op, 'de', `origem ${de.op}:${de.id} não tem face viva`);
    {
      /* sólido que um passo posterior abriu (um `subtrair` que cortou a
         origem, por exemplo): as faces novas dele pertencem à origem DELE. */
      const dirigidas = new Set();
      for (const f of faces) { const vs = st.F.get(f).vs; vs.forEach((v, k) => dirigidas.add(`${v}>${vs[(k + 1) % vs.length]}`)); }
      const soltas = [...dirigidas].filter((c) => { const [x, y] = c.split('>'); return !dirigidas.has(`${y}>${x}`); });
      if (soltas.length) {
        const [x, y] = soltas[0].split('>').map(Number);
        const vizinha = [...st.F.values()].find((f) => f.vs.some((v, k) => v === y && f.vs[(k + 1) % f.vs.length] === x));
        let quem = null, origemDeQuem = null;
        if (vizinha) for (const [id, regs] of st.origens) for (const r of regs) if (Array.isArray(r.faces) && r.faces.includes(vizinha.id) && ['unir', 'subtrair', 'intersectar', 'arredondarCostura'].includes(r.op)) { quem = `${r.op}:${id}${r.passo != null ? ` do passo ${r.passo}` : ''}`; origemDeQuem = `${r.op}:${id}`; }
        return grita(st, i, op, 'de', `o sólido da origem ${de.op}:${de.id} não é mais fechado (${soltas.length} aresta(s) solta(s)): ${quem ? `o ${quem} cortou faces dele, e as faces novas pertencem àquela origem` : 'um passo posterior mexeu nas faces dele'}; arredonde a costura antes disso${origemDeQuem ? `, ou arredonde a costura de ${origemDeQuem}` : ''}`);
      }
    }
    let raio, paineis;
    try { raio = st.num(a.raio ?? 0); paineis = st.num(a.paineis ?? 8); }
    catch (e) { return grita(st, i, op, 'raio', e.message); }
    if (!(raio > 0) || !Number.isFinite(raio)) return grita(st, i, op, 'raio', `raio precisa ser > 0 (recebido ${JSON.stringify(a.raio ?? null)} = ${raio})`);
    if (!Number.isSafeInteger(paineis) || paineis < 2 || paineis > 64) return grita(st, i, op, 'paineis', `paineis precisa ser inteiro de 2 a 64 (recebido ${paineis})`);

    /* RAIO MÍNIMO: 1/64 da meia-caixa do sólido. Abaixo disso as tampas dos
       prismas vizinhos, que não coincidem quando o canto não é reto, deixam
       cantos a poucos milionésimos um do outro, e a malha sai com triângulos
       abaixo do piso de área da guarda. Medido com o braço inclinado de 10°
       a 35° numa peça de meia-caixa 0,6: 0,01 sai limpo em todos, 0,005 e
       0,003 não. Um arredondamento de 1/64 da peça já é quase invisível. */
    {
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      for (const f of faces) for (const v of st.F.get(f).vs) st.V.get(v).forEach((c, k) => { lo[k] = Math.min(lo[k], c); hi[k] = Math.max(hi[k], c); });
      const minimo = Math.max(...[0, 1, 2].map((k) => (hi[k] - lo[k]) / 2)) / 64;
      if (raio < minimo) return grita(st, i, op, 'raio', `raio ${raio} é pequeno demais para este sólido: o mínimo é 1/64 da meia-caixa, ${minimo}; abaixo disso as tampas dos prismas deixam triângulos sem área`);
    }

    // ---- arestas côncavas da costura, com as duas faces de cada uma ----
    const noSolido = new Set(faces);
    const facesDaAresta = new Map();
    for (const fid of faces) {
      const vs = st.F.get(fid).vs;
      for (let k = 0; k < vs.length; k++) {
        const x = vs[k], y = vs[(k + 1) % vs.length];
        const chave = x < y ? `${x}-${y}` : `${y}-${x}`;
        if (!facesDaAresta.has(chave)) facesDaAresta.set(chave, []);
        facesDaAresta.get(chave).push(fid);
      }
    }
    const centroide = (fid) => {
      const vs = st.F.get(fid).vs;
      return [0, 1, 2].map((c) => vs.reduce((s, v) => s + st.V.get(v)[c], 0) / vs.length);
    };
    const concavas = [];
    for (const [x, y] of registro.arestas) {
      const fs = facesDaAresta.get(`${x}-${y}`) ?? [];
      if (fs.length !== 2 || !fs.every((f) => noSolido.has(f))) continue;
      const P = st.V.get(x), Q = st.V.get(y);
      const e = sub(Q, P), l = tamanho(e);
      if (!(l > 0)) continue;
      const u = e.map((c) => c / l);
      const para = (fid) => {       // direção dentro da face, perpendicular à aresta
        const d = sub(centroide(fid), P), s = ponto(d, u);
        const r = [d[0] - s * u[0], d[1] - s * u[1], d[2] - s * u[2]], m = tamanho(r);
        return r.map((c) => c / m);
      };
      const [fA, fB] = fs;
      const dA = para(fA), dB = para(fB);
      const nA = normalDaFace(st.V, st.F.get(fA).vs);
      if (!(ponto(nA, dB) > 1e-9)) continue;                  // convexa ou plana: sem material
      const theta = Math.acos(Math.max(-1, Math.min(1, ponto(dA, dB))));
      if (!(theta > 1e-6 && theta < Math.PI - 1e-6)) continue;
      concavas.push({ x, y, u, dA, dB, theta, nA, nB: normalDaFace(st.V, st.F.get(fB).vs), pA: ponto(nA, P), pB: ponto(normalDaFace(st.V, st.F.get(fB).vs), P) });
    }
    if (!concavas.length) return grita(st, i, op, 'de', `a costura de ${de.op}:${de.id} não tem aresta côncava: não há encontro a arredondar`);

    // ---- meia-esquadria: o plano de corte em cada ponta ----
    const vizinhas = new Map();
    for (const c of concavas) for (const v of [c.x, c.y]) { if (!vizinhas.has(v)) vizinhas.set(v, []); vizinhas.get(v).push(c); }
    /* O CORTE entre dois prismas vizinhos. As duas arestas da costura que se
       encontram no canto `v` têm uma face em comum (a face do sólido que o
       outro atravessa) e cada uma tem a sua outra face; essas duas outras
       faces se cruzam na quina L do sólido que atravessa. O corte é o plano
       por `v` que contém L e a bissetriz das duas arestas da costura: assim a
       tangência de cada prisma na sua face termina exatamente na quina L, e
       não passa dela.

       A primeira tentativa cortava pelo plano bissetor das duas arestas, e a
       segunda pelo plano onde os dois cilindros se cruzariam. As duas coincidem
       com esta no canto reto; com o braço inclinado a 35°, as duas deixavam a
       tangência 35% do recuo além da borda da face (achado da revisão de
       2026-09-29). Nos dois cortes, o que não coincide entre as tampas dos
       dois prismas vizinhos é o vinco da limitação acima. Ponta solta, ou
       canto sem face comum, corta reto. */
    const mesmoPlano = (n1, p1, n2, p2) => ponto(n1, n2) > 1 - 1e-9 && Math.abs(p1 - p2) < 1e-9 * Math.max(1, Math.abs(p1));
    const corte = (c, v) => {
      const reto = { m: c.u, X: st.V.get(v) };
      const outras = vizinhas.get(v).filter((o) => o !== c);
      if (outras.length !== 1) return reto;
      const o = outras[0];
      const planosC = [[c.nA, c.pA], [c.nB, c.pB]], planosO = [[o.nA, o.pA], [o.nB, o.pB]];
      let proprioC = null, proprioO = null;
      for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) if (mesmoPlano(planosC[j][0], planosC[j][1], planosO[k][0], planosO[k][1])) { proprioC = planosC[1 - j][0]; proprioO = planosO[1 - k][0]; }
      if (!proprioC) return reto;
      const L = cruz(proprioC, proprioO);
      const sai1 = v === c.x ? c.u : c.u.map((k) => -k), sai2 = v === o.x ? o.u : o.u.map((k) => -k);
      const bis = [sai1[0] + sai2[0], sai1[1] + sai2[1], sai1[2] + sai2[2]];
      const m = cruz(L, bis), l = tamanho(m);
      if (!(l > 1e-9 * tamanho(L) * tamanho(bis)) || !(Math.abs(ponto(m, c.u)) > 1e-6 * l)) return reto;
      return { m: m.map((k) => k / l), X: st.V.get(v) };
    };
    /* seção do prisma no plano perpendicular à aresta, no canto P: [P,
       tangência A, arco…, tangência B] */
    const secao = (c, P) => {
      const recuo = raio / Math.tan(c.theta / 2);
      const bis = [c.dA[0] + c.dB[0], c.dA[1] + c.dB[1], c.dA[2] + c.dB[2]], lb = tamanho(bis);
      const centro = P.map((k, j) => k + (bis[j] / lb) * raio / Math.sin(c.theta / 2));
      const tA = P.map((k, j) => k + c.dA[j] * recuo), tB = P.map((k, j) => k + c.dB[j] * recuo);
      const rA = sub(tA, centro).map((k) => k / raio), rB = sub(tB, centro).map((k) => k / raio);
      const phi = Math.acos(Math.max(-1, Math.min(1, ponto(rA, rB)))), sp = Math.sin(phi);
      const pts = [P];
      for (let k = 0; k <= paineis; k++) {
        const t = k / paineis, a0 = Math.sin((1 - t) * phi) / sp, a1 = Math.sin(t * phi) / sp;
        pts.push(centro.map((q, j) => q + raio * (rA[j] * a0 + rB[j] * a1)));
      }
      return pts;
    };
    /* a seção deslizada ao longo da aresta até o plano de corte da ponta `v`:
       é a tampa REAL do prisma, a mesma usada na checagem e na construção. */
    const ponta = (c, v) => {
      const P = st.V.get(v), { m, X } = corte(c, v);
      return secao(c, P).map((q) => {
        const t = -ponto(m, sub(q, X)) / ponto(m, c.u);
        return q.map((k, j) => k + c.u[j] * t);
      });
    };

    /* O RAIO PRECISA CABER: nas duas tampas de cada prisma (já cortadas em
       meia-esquadria), as duas tangências têm de cair sobre uma face do sólido
       no mesmo plano da face que tangenciam. Senão o prisma sairia da face (o
       braço de 0,3 numa coluna de 0,4 deixa 0,05 de face de cada lado, e um
       raio de 0,1 passaria disso). A primeira versão conferia a tangência
       PERPENDICULAR à aresta, antes do corte: num braço inclinado o canto não
       é reto, esse ponto cai fora da face vizinha e qualquer raio, até 0,001,
       era recusado. */
    /* quanto `q` fica FORA das faces do sólido coplanares a `fRef` (0 se cai
       dentro de alguma, Infinity se nem está no plano) */
    const foraDaFace = (q, fRef) => {
      const nRef = normalDaFace(st.V, st.F.get(fRef).vs), dRef = ponto(nRef, st.V.get(st.F.get(fRef).vs[0]));
      const escala = Math.max(1, tamanho(q));
      if (Math.abs(ponto(nRef, q) - dRef) > 1e-7 * escala) return Infinity;
      let melhor = Infinity;
      for (const fid of faces) {
        const vs = st.F.get(fid).vs, n = normalDaFace(st.V, vs);
        if (ponto(n, nRef) < 1 - 1e-9 || Math.abs(ponto(n, st.V.get(vs[0])) - dRef) > 1e-7 * escala) continue;
        let fora = 0;
        for (let k = 0; k < vs.length; k++) {                   // convexa: distância além da aresta mais violada
          const p0 = st.V.get(vs[k]), p1 = st.V.get(vs[(k + 1) % vs.length]);
          const e = sub(p1, p0), l = tamanho(e);
          fora = Math.max(fora, -ponto(cruz(e, sub(q, p0)), n) / l);
        }
        melhor = Math.min(melhor, Math.max(0, fora));
      }
      return melhor;
    };
    /* com o corte pela quina L, a tangência termina na borda da face; a
       folga é só numérica, nas pontas livres e nas cortadas. */
    for (const c of concavas) {
      const [fA, fB] = facesDaAresta.get(`${c.x}-${c.y}`);
      const recuo = raio / Math.tan(c.theta / 2);
      for (const v of [c.x, c.y]) {
        const tampa = ponta(c, v);
        const folga = 1e-9 * Math.max(1, tamanho(st.V.get(v)));
        const fora = Math.max(foraDaFace(tampa[1], fA), foraDaFace(tampa[tampa.length - 1], fB));
        if (fora > folga) return grita(st, i, op, 'raio', `o raio ${raio} não cabe na aresta ${c.x}-${c.y} da costura, na ponta ${v} em ${JSON.stringify(st.V.get(v))}: a tangência, a ${recuo} do canto, sai ${fora} da face vizinha; diminua o raio ou afaste a costura da borda da face`);
      }
    }
    const herdaDe = registro.costura.find((f) => st.F.has(f)) ?? faces[0];

    const calcular = (M, manifolds, local) => {
      const S = manifolds[0];
      const prismas = [];
      for (const c of concavas) {
        const s0 = ponta(c, c.x), s1 = ponta(c, c.y), m = s0.length;
        const props = new Float32Array(2 * m * 3);
        [...s0, ...s1].forEach((q, k) => props.set(local(q), 3 * k));
        const tri = [];
        for (let k = 1; k < m - 1; k++) { tri.push(0, k + 1, k); tri.push(m, m + k, m + k + 1); }
        for (let k = 0; k < m; k++) { const n = (k + 1) % m; tri.push(k, n, m + n); tri.push(k, m + n, m + k); }
        let prisma = new M(new wasm.Mesh({ numProp: 3, vertProperties: props, triVerts: Uint32Array.from(tri) }));
        if (prisma.status() !== 'NoError' || prisma.volume() < 0) {
          prisma.delete();
          for (let k = 0; k < tri.length; k += 3) [tri[k + 1], tri[k + 2]] = [tri[k + 2], tri[k + 1]];
          try { prisma = new M(new wasm.Mesh({ numProp: 3, vertProperties: props, triVerts: Uint32Array.from(tri) })); }
          catch (e) { for (const p of prismas) p.delete(); return { erro: `o prisma da aresta ${c.x}-${c.y} não fechou: ${e?.message ?? e}` }; }
        }
        prismas.push(prisma);
      }
      const juntos = M.union(prismas);
      for (const p of prismas) p.delete();
      const marcado = juntos.setProperties(4, (novo, pos) => { novo[0] = pos[0]; novo[1] = pos[1]; novo[2] = pos[2]; novo[3] = -1; });
      juntos.delete();
      const auxiliar = marcado.asOriginal();
      marcado.delete();
      const auxID = auxiliar.originalID();
      const resultado = M.union([S, auxiliar]);
      auxiliar.delete();
      return { resultado, auxID };
    };
    const antes = st.orfaos.length;
    nucleoBooleano(st, i, op, wasm, a.origemId, [faces], { calcular, herdaDe, liso: 45, ref: 'de' });
    if (st.orfaos.length === antes) registro.arredondadaEm = i;
  }

  /* a forma `nome(st, a, i)` é a que o mapa estático do motor
     (tools/arquitetura/mapear-motor-procedural.mjs) reconhece como operação. */
  return {
  unir(st, a, i) { return booleana(st, a, i, 'unir'); },
  subtrair(st, a, i) { return booleana(st, a, i, 'subtrair'); },
  intersectar(st, a, i) { return booleana(st, a, i, 'intersectar'); },
  arredondarCostura(st, a, i) { return arredondarCostura(st, a, i); },
  };
}
