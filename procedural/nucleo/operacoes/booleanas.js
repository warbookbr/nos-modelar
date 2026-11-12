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
import { areaDe, fundir, fundirCoplanares, melhorInicio, pedacosConvexos } from '../pedacos-convexos.js';
import { moldeDeDentro, ErroDoMolde } from '../molde-de-dentro.js';
import { areaMinimaDe, limparNoEstado } from './limpar-lascas.js';

/* Fusão dos pedaços coplanares da booleana comum: o quanto, em fração do tamanho da peça, o polígono fundido pode sair do
   próprio plano, e o seno da curva para dentro que ainda se aceita num canto dele. */
const PLANO_DA_FUSAO = 1e-9;
const SENO_DA_FUSAO = 1e-9;

export function criarOperacoesBooleanas(servicos) {
  const { BLOCO, FAIXA_ESTENDIDA, idDoPasso, baseDoPasso, normalDaFace, addV, addF, grita, registraOrigem, textoDeclaracoes, resolverSelecao, manifoldCarregada, erroDaCargaDaManifold } = servicos;

  /* Solda: cantos a menos de 1e-9 um do outro (na grade) são o MESMO ponto. O
     representante é o menor id, então a solda não depende da ordem dos
     passos. É o que deixa um `lathe` com costura de vértices repetidos entrar
     como sólido fechado. */
  const chaveDoPonto = (p) => p.map((c) => Math.round(c * 1e9)).join(',');

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const tamanho = (a) => Math.hypot(a[0], a[1], a[2]);

  /* (A + mu·I) λ = y por eliminação de Gauss com pivô parcial, sem alterar A nem y. */
  const resolverAmortecido = (A, y, mu) => {
    const k = y.length;
    const M = A.map((linha, r) => linha.map((v, c) => (r === c ? v + mu : v)));
    const b = y.slice();
    for (let c = 0; c < k; c++) {
      let piv = c;
      for (let r = c + 1; r < k; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      [M[c], M[piv]] = [M[piv], M[c]]; [b[c], b[piv]] = [b[piv], b[c]];
      for (let r = c + 1; r < k; r++) { const f = M[r][c] / M[c][c]; for (let q = c; q < k; q++) M[r][q] -= f * M[c][q]; b[r] -= f * b[c]; }
    }
    const lambda = new Array(k).fill(0);
    for (let c = k - 1; c >= 0; c--) { let acc = b[c]; for (let q = c + 1; q < k; q++) acc -= M[c][q] * lambda[q]; lambda[c] = acc / M[c][c]; }
    return lambda;
  };
  /* |Nᵀλ|, o quanto o vértice anda: λᵀ(N Nᵀ)λ = λᵀAλ. */
  const passoDe = (A, lambda) => Math.sqrt(Math.max(0, lambda.reduce((acc, li, r) => acc + li * A[r].reduce((s2, a, c) => s2 + a * lambda[c], 0), 0)));

  /* qual pedaço fica com o id da face cortada: o de maior área; áreas a menos
     de 1e-9 uma da outra empatam (dois pedaços simétricos), e o empate vai
     para o pedaço com o menor id de canto, para que a peça transladada, com
     a área mudando na última casa, escolha o mesmo */
  function maiorPedaco(pos, P, Q) {
    const a = areaDe(pos, P), b = areaDe(pos, Q);
    if (Math.abs(a - b) > 1e-9 * Math.max(a, b)) return a > b;
    return Math.min(...P) < Math.min(...Q);
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

  /* casca fechada e manifold, sobre polígonos de ids: devolve null ou o texto
     do defeito */
  function cascaAberta(poligonos) {
    if (!poligonos.length) return 'sem nenhuma face (casca vazia)';
    const dirigidas = new Map(), vinculo = new Map();
    for (const P of poligonos) for (let k = 0; k < P.length; k++) {
      const a = P[k], b = P[(k + 1) % P.length], ant = P[(k + P.length - 1) % P.length];
      dirigidas.set(`${a}>${b}`, (dirigidas.get(`${a}>${b}`) ?? 0) + 1);
      if (!vinculo.has(a)) vinculo.set(a, []);
      vinculo.get(a).push([ant, b]);
    }
    let semPar = 0;
    for (const [c, n] of dirigidas) { const [a, b] = c.split('>'); if (n !== 1 || dirigidas.get(`${b}>${a}`) !== 1) semPar++; }
    let naoManifold = 0;
    for (const lista of vinculo.values()) {
      const prox = new Map(lista.map(([p, q]) => [q, p]));
      if (prox.size !== lista.length || lista.length < 3) { naoManifold++; continue; }
      let c = lista[0][1], passos = 0;
      do { c = prox.get(c); passos++; } while (c !== undefined && c !== lista[0][1] && passos <= lista.length);
      if (passos !== lista.length) naoManifold++;
    }
    if (!semPar && !naoManifold) return null;
    return `aberto ou não-manifold: ${semPar} aresta(s) dirigida(s) sem par, ${naoManifold} vértice(s) com vínculo que não é um laço só`;
  }

  /* potência de dois perto de 2^-20 do tamanho: a mesma para a peça em
     qualquer lugar, a não ser que o tamanho caia exatamente numa fronteira */
  const gradeDoTamanho = (t) => 2 ** Math.floor(Math.log2(Math.max(t, 1e-12) * 2 ** -20));

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
    /* as faces que uma booleana recebeu como operando: o aviso da cópia no lugar que ninguém usou lê este conjunto */
    const usadas = (st.facesDeOperando ??= new Set());
    for (const faces of operandos) for (const f of faces) usadas.add(f);
    return nucleoBooleano(st, i, op, wasm, a.origemId, operandos, null);
  }

  /* O CAMINHO COMUM: sólidos do núcleo entram na Manifold, o resultado volta
     com a identidade. `extra` é o gancho do `arredondarCostura`: ele calcula
     o resultado a partir dos sólidos já convertidos e devolve junto um sólido
     AUXILIAR (o material do arredondamento), cujas faces não vêm de face
     nenhuma do núcleo e por isso nascem todas com id novo. */
  function nucleoBooleano(st, i, op, wasm, origemId, operandos, extra) {

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
    /* o arredondamento curvo já calculou o tubo num referencial local; o
       centro tem de ser o mesmo, bit a bit, para o tubo entrar sem ser
       reconvertido */
    const centro = extra?.centro ?? [0, 1, 2].map((c) => (min[c] + max[c]) / 2);
    const meiaCaixa = Math.max(...[0, 1, 2].map((c) => (max[c] - min[c]) / 2));
    let menorAresta = Infinity;
    for (const faces of operandos) for (const fid of faces) {
      const c = cicloRep(st.F.get(fid).vs);
      if (c.length < 3) continue;
      for (let e = 0; e < c.length; e++) menorAresta = Math.min(menorAresta, tamanho(sub(st.V.get(c[e]), st.V.get(c[(e + 1) % c.length]))));
    }
    if (meiaCaixa * 2 ** -20 > menorAresta) return grita(st, i, op, 'solidos', `fora da precisão útil da Manifold (Float32): a caixa dos operandos mede ${meiaCaixa * 2} e a menor aresta ${menorAresta}, razão acima de 2^20; aproxime os sólidos ou faça a booleana em partes menores`);
    /* GRADE: a coordenada local vai para uma grade de potência de dois, 2^-20
       do tamanho. A mesma peça transladada chega com erro de arredondamento
       da posição absoluta (1e-13 em x = 500), e um zero vira 1,6e-12 que o
       Float32 guarda: a Manifold recebia números diferentes e a topologia
       mudava (uma face a mais ou a menos). Na grade, os dois casos entram
       com os mesmos números. Só a entrada da Manifold passa pela grade; os
       cantos originais voltam com a posição em double. */
    const passoDaGrade = extra?.grade ?? gradeDoTamanho(2 * meiaCaixa);
    const local = (p) => [0, 1, 2].map((c) => Math.round((p[c] - centro[c]) / passoDaGrade) * passoDaGrade);

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
    /* sem volume: a Manifold devolve às vezes uma casca degenerada (faces encostadas,
       área zero) que não é "vazia"; sem esta checagem ela cairia no gate de casca
       fechada como "defeito do cálculo" ou apagaria a peça em silêncio */
    const semVolume = !resultado.isEmpty() && !(resultado.volume() > (2 * meiaCaixa) ** 3 * 1e-12);
    if (resultado.isEmpty() || semVolume) {
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
        if (auxID instanceof Set ? !auxID.has(malha.runOriginalID[r]) : malha.runOriginalID[r] !== auxID) continue;
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
       numa aresta de entrada), a menor correção que o põe nos dois.

       A CORREÇÃO TEM TETO. A posição da Manifold já está na superfície das
       entradas, com erro de Float32 e de grade (até 2^-20 da meia-caixa); a
       correção só devolve a planaridade que esse erro tirou. Uma face de
       entrada empenada (a casca de um loft, com faces de 840 mm e 0,26 mm de
       empeno) não é um plano, e o plano que a representa erra a superfície
       real por esse empeno. Dois planos de faces vizinhas a uma fração de grau
       um do outro se cortam numa reta que desliza ao longo da casca, de
       dezenas de milímetros a metros, quando um deles muda de 0,26 mm: a
       interseção exata dos três planos dava o vértice a centenas de milímetros
       do corte, fora da caixa de quem o produziu, e a face cortada ganhava um
       canto solto. O vértice novo não anda da posição da Manifold mais que
       `tetoDaCorrecao`, 2^-15 da meia-caixa: o mesmo valor da tolerância da solda
       (abaixo), que também é o menor detalhe novo que o núcleo guarda, mas as duas
       constantes são independentes e cada uma se ajusta sozinha. Dentro do
       teto o resultado é o de antes, bit a bit. Acima dele, a correção é a de
       mínimos quadrados amortecidos (Levenberg e Marquardt) que cabe no teto: o
       vértice se ajusta aos planos bem condicionados e fica onde a Manifold o
       pôs na direção em que os planos quase paralelos não o determinam. O que
       sobra de planaridade é o empeno da entrada, que nenhum ponto corrige. */
    const tetoDaCorrecao = Math.max(meiaCaixa, 1e-9) * 2 ** -15;
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
      // x = p0 + Nᵀλ, com (N Nᵀ + mu·I) λ = d − N p0, e mu = 0 salvo quando o passo passaria do teto
      const A = base.map((q) => base.map((r) => ponto(q.n, r.n)));
      const y = base.map((q) => q.d - ponto(q.n, p0));
      let lambda = resolverAmortecido(A, y, 0);
      if (!(passoDe(A, lambda) <= tetoDaCorrecao)) {
        /* o passo cai com mu (cada direção própria de A anda a/(a+mu)): acha-se o menor mu que cabe no teto */
        let baixo = 0, alto = 1;
        while (passoDe(A, resolverAmortecido(A, y, alto)) > tetoDaCorrecao && alto < 1e12) alto *= 10;
        for (let rodada = 0; rodada < 60 && alto - baixo > alto * 1e-9; rodada++) {
          const meio = (baixo + alto) / 2;
          if (passoDe(A, resolverAmortecido(A, y, meio)) > tetoDaCorrecao) baixo = meio; else alto = meio;
        }
        lambda = resolverAmortecido(A, y, alto);
      }
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
    /* A solda só vale quando não belisca a casca: ou o outro vértice não é
       usado por triângulo nenhum (canto antigo que só voltou pela cópia),
       ou os dois são ligados por uma aresta e têm exatamente dois vizinhos
       em comum (o colapso de aresta que mantém a malha manifold). Soldar
       dois vértices sem aresta entre eles, ou com mais vizinhos em comum,
       deixa quatro faces numa aresta: foi o que o portão de casca fechada
       pegou no braço inclinado (revisão de 2026-09-29). */
    const vizinhos = new Map();
    const liga = (a, b) => { if (!vizinhos.has(a)) vizinhos.set(a, new Set()); vizinhos.get(a).add(b); };
    for (let t = 0; t < nTri; t++) { const tri = triDe(t); for (let k = 0; k < 3; k++) { const a = tri[k], b = tri[(k + 1) % 3]; if (a !== b) { liga(a, b); liga(b, a); } } }
    const podeSoldar = (v, w) => {
      const nw = vizinhos.get(w);
      if (!nw || !nw.size) return true;
      const nv = vizinhos.get(v) ?? new Set();
      if (!nv.has(w)) return false;
      let comuns = 0;
      for (const x of nv) if (x !== w && nw.has(x)) comuns++;
      return comuns === 2;
    };
    for (const v of [...posNova.keys()].sort((x, y) => y - x)) {
      const w = vizinhoPerto(posNova.get(v));
      if (w != null && podeSoldar(v, w)) {
        apelido.set(v, w);
        const nv = vizinhos.get(v) ?? new Set();
        for (const x of nv) { if (x === w) continue; liga(w, x); const nx = vizinhos.get(x); nx.delete(v); nx.add(w); }
        vizinhos.get(w)?.delete(v);
        vizinhos.delete(v);
      } else inserir(v, posNova.get(v));
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
    /* escala pelo TAMANHO do sólido, não pela distância à origem: a mesma
       peça em x=3000 tem as mesmas lascas que na origem. O piso é o dobro do
       da guarda de malha (1e-9·escala²), que mede a peça inteira e por isso
       pode ter escala um pouco maior que a deste sólido; mais que o dobro já
       funde face legítima pequena (o cubo de 0,5 mm do teste da peça
       deslocada). */
    const escalaDaPeca = Math.max(1e-9, 2 * meiaCaixa);
    const piso = 2e-9 * escalaDaPeca * escalaDaPeca;
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
    /* O subtrair (ou o intersectar) que não muda o sólido, pela topologia: nenhuma face da peça (sólido 0) foi cortada nem consumida e nenhum pedaço novo entrou (no
       subtrair, por ferramenta: a que não deixou face nenhuma no resultado não tocou a peça). Não depende do volume, que se perderia num corte pequeno e real. Aqui
       só se mede, com as Manifolds ainda vivas, se a ferramenta que não deixou face tem volume em comum com a peça (o corte que some na grade); o veredito vem depois
       de classificadas as faces. */
    const sobreposicao = new Map();   // ferramenta que não deixou face -> { caixa: as caixas se sobrepõem, fino: há volume em comum medido sem a grade }
    if (!extra && op === 'subtrair') {
      /* a caixa em double, dos cantos originais: a da Manifold já passou pela grade e um corte mais fino que ela viria de espessura zero */
      const caixaDe = (k) => {
        const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
        for (const fid of operandos[k]) for (const v of st.F.get(fid).vs) { const p = st.V.get(v); for (let c = 0; c < 3; c++) { lo[c] = Math.min(lo[c], p[c]); hi[c] = Math.max(hi[c], p[c]); } }
        return { lo, hi };
      };
      /* o volume em comum de duas seleções, em Manifolds refeitas sem a grade e centradas na caixa comum (só no caso raro do aviso): o corte que a grade come de fato
         tem volume aqui, e a ferramenta que passa por um vão da peça não tem */
      const volumeSemGrade = (k, centro) => {
        const feitas = [];
        try {
          const duas = [0, k].map((q) => {
            const indice = new Map(), props = [], tris = [];
            for (const fid of operandos[q]) {
              const c = cicloRep(st.F.get(fid).vs);
              if (new Set(c).size < 3) continue;
              for (let t = 1; t < c.length - 1; t++) for (const v of [c[0], c[t], c[t + 1]]) {
                if (!indice.has(v)) { indice.set(v, indice.size); props.push(...sub(st.V.get(v), centro)); }
                tris.push(indice.get(v));
              }
            }
            const m = new wasm.Manifold(new wasm.Mesh({ numProp: 3, vertProperties: Float32Array.from(props), triVerts: Uint32Array.from(tris) }));
            feitas.push(m);
            return m;
          });
          const comum = M.intersection(duas);
          feitas.push(comum);
          return comum.isEmpty() ? 0 : comum.volume();
        } catch { return 0; } finally { for (const m of feitas) m.delete(); }
      };
      const caixa0 = caixaDe(0);
      for (let k = 1; k < operandos.length; k++) {
        const caixa = caixaDe(k);
        const sobrepoe = [0, 1, 2].every((c) => Math.min(caixa0.hi[c], caixa.hi[c]) - Math.max(caixa0.lo[c], caixa.lo[c]) > 1e-12 * Math.max(meiaCaixa, 1e-9));
        if (!sobrepoe) { sobreposicao.set(k, { caixa: false, fino: false }); continue; }
        if (temFace[k]) continue;
        const centro = [0, 1, 2].map((c) => (Math.max(caixa0.lo[c], caixa.lo[c]) + Math.min(caixa0.hi[c], caixa.hi[c])) / 2);
        sobreposicao.set(k, { caixa: true, fino: volumeSemGrade(k, centro) > 0 });
      }
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
      for (let k = 1; k < pecas.length; k++) if (maiorPedaco(pos, pecas[k], pecas[maior])) maior = k;
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
    if (pedacosNovos.length > BLOCO + FAIXA_ESTENDIDA) return grita(st, i, op, 'solidos', `a costura partiu faces em ${pedacosNovos.length} pedaços a mais, mais que os ${BLOCO + FAIXA_ESTENDIDA} ids do passo (bloco mais faixa estendida); divida a operação em passos menores`);

    /* ---- CANTO QUASE COLINEAR ----
       Vértice novo usado por exatamente duas faces, e que nas duas é um canto
       quase reto (o triângulo com os vizinhos tem área abaixo do piso), está
       no meio de uma aresta reta: tirá-lo das duas faces não abre fenda, e
       deixá-lo faz o adaptador cortar uma orelha sem área. Canto novo usado
       por três faces ou mais é quina de verdade e fica. */
    /* O canto tirado pode estar no meio de uma aresta da costura (o diedro de 135° que a faceta de um tubo faz com a face do outro sai partido em
       dois triângulos pela sopa da Manifold, com o canto do meio sobre a reta). As duas arestas que chegam nele estão em `costura`, e ao tirar o
       canto elas viram uma só, entre os vizinhos: sem isto o laço de ids definitivos descarta as duas metades, o registro perde o trecho (9 trechos de uns 4 mm, 18 metades,
       na peça de prova dos dentes; 50, 66, 40 e 72 arestas nas partes do braço) e o `arredondarCostura`, vendo o buraco entre arestas registradas de 0,1 mm,
       faz de cada resto um tubo curto com tampa, que são os dentes no fim do arredondamento. */
    const religaCostura = (v, donosDoCanto) => {
      const vizinhos = donosDoCanto.map((P) => { const k = P.indexOf(v); return [P[(k + P.length - 1) % P.length], P[(k + 1) % P.length]]; });
      const [a, c] = vizinhos[0];
      if (!vizinhos.every(([x, y]) => (x === a && y === c) || (x === c && y === a))) return;
      const k = (x, y) => (x < y ? `${x}_${y}` : `${y}_${x}`);
      if (costura.has(k(a, v)) && costura.has(k(v, c))) costura.add(k(a, c));
    };
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
        religaCostura(v, donos);
        for (const P of donos) P.splice(P.indexOf(v), 1);
        tirou = true;
      }
      if (!tirou) break;
    }

    /* ---- ACABAMENTO DOS PEDAÇOS, em laço até parar de mudar ----
       Duas regras que se alimentam, e por isso rodam juntas:
         - pedaço sem área (a solda ou a retirada de um canto colinear o
           encolheu) se funde ao vizinho pela aresta MAIS LONGA dele: o canto
           do meio vira canto colinear do vizinho, sem abrir bico;
         - canto quase colinear que fica (usado por três faces: a ponta de uma
           tangência sobre a quina de um sólido, ou o canto que a fusão
           acabou de pôr) parte o pedaço por uma diagonal a partir dele, até o
           canto mais afastado da reta dos vizinhos. Nos dois pedaços ele deixa
           de ser colinear, e os dois continuam convexos. Partir um canto que
           não era colinear só custa um pedaço a mais. */
    /* a face mantida entra no acabamento pelos cantos SOLDADOS (os mesmos da
       saída da Manifold), para as arestas casarem com as dos pedaços */
    const cicloRepDasMantidas = (fid) => cicloRep(st.F.get(fid).vs);
    const areaTri = (a, b, c) => tamanho(cruz(sub(pos(b), pos(a)), sub(pos(c), pos(a)))) / 2;
    /* a metade que a diagonal deixa só pode ter a área que o adaptador do visor aceita (`adaptarThree` recusa a face de dobro da área até 1e-12 m²), com o
       dobro de folga, e não só o milésimo do piso, que em peça de menos de 0,7 m fica abaixo disso: o dente do elo do punho 5, três cantos de um anel de
       0,02 a 0,05 mm em linha, saía como face de 9,9e-13 m² */
    const semArea = Math.max(piso * 1e-3, 1e-12);
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
        /* a diagonal que deixa uma das metades sem área de verdade (a do portão de face degenerada; dois cantos de tubos a poucos micrômetros um do outro, onde a
           geratriz de um cilindro cruza a do outro) devolve o pedaço sem área que a fusão acabou de absorver, e o
           laço do acabamento oscila até desistir; o canto colinear fica, e `melhorInicio` põe o leque longe dele */
        if (areaDe(pos, um) < semArea || areaDe(pos, dois) < semArea) continue;
        return [...semColinear(um), ...semColinear(dois)];
      }
      return [P];
    };
    const arestaMaisLonga = (P) => {
      let melhor = 0, l = -1;
      for (let k = 0; k < P.length; k++) { const d = tamanho(sub(pos(P[(k + 1) % P.length]), pos(P[k]))); if (d > l) { l = d; melhor = k; } }
      return [P[melhor], P[(melhor + 1) % P.length]];
    };
    for (let volta = 0; volta < 6; volta++) {
      let mudou = false;
      /* a face mantida também é candidata: uma lasca pode ter a aresta longa
         sobre ela, e aí ela passa a cortada (ganha o canto colinear, que a
         partição seguinte resolve) */
      const todos = [...cortadas.map((c) => ({ dono: c[0], ref: c })), ...pedacosNovos.map((c) => ({ dono: c[0], ref: c })),
        ...mantidas.map((fid) => ({ dono: fid, ref: [fid, cicloRepDasMantidas(fid)], mantida: true }))];
      for (const item of todos) {
        if (item.morto || areaDe(pos, item.ref[1]) >= piso) continue;
        const [x, y] = arestaMaisLonga(item.ref[1]);
        const temLonga = (o) => o.ref[1].some((v, k, P) => v === y && P[(k + 1) % P.length] === x);
        const candidatos = todos.filter((o) => o !== item && !o.morto)
          .sort((p, q) => (temLonga(p) ? 0 : 2) + (p.dono === item.dono ? 0 : 1) - (temLonga(q) ? 0 : 2) - (q.dono === item.dono ? 0 : 1));
        for (const o of candidatos) {
          const m = fundir(o.ref[1], item.ref[1]);
          if (!m) continue;
          o.ref[1] = melhorInicio(pos, m);
          if (o.mantida) { o.mantida = false; mantidas.splice(mantidas.indexOf(o.dono), 1); cortadas.push(o.ref); }
          item.morto = true; mudou = true;
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
      for (let k = 0; k < cortadas.length; k++) {
        const partes = semColinear(cortadas[k][1]).map((P) => melhorInicio(pos, P));
        if (partes.length > 1) mudou = true;
        let maior = 0;
        for (let j = 1; j < partes.length; j++) if (maiorPedaco(pos, partes[j], partes[maior])) maior = j;
        cortadas[k][1] = partes[maior];
        partes.forEach((P, j) => { if (j !== maior) pedacosNovos.push([cortadas[k][0], P, false]); });
      }
      for (let k = pedacosNovos.length - 1; k >= 0; k--) {
        const [fid, P, aux] = pedacosNovos[k];
        const partes = semColinear(P).map((Q) => melhorInicio(pos, Q));
        if (partes.length > 1) mudou = true;
        pedacosNovos.splice(k, 1, ...partes.map((Q) => [fid, Q, aux]));
      }
      if (!mudou) break;
    }
    /* ---- VÉRTICE DE VALÊNCIA DOIS ----
       Vértice novo que só duas faces usam, com os mesmos dois vizinhos nas
       duas, está no meio de uma aresta entre elas, torto ou não: numa casca
       fechada nenhuma quina de verdade tem só duas faces. Ele sai das duas
       (a face que vira dois cantos some, e a aresta dela passa à outra), e o
       vínculo de cada vértice volta a ser um laço de três ou mais faces, que é
       o que o teste de contato exige de malha fechada. */
    for (let volta = 0; volta < 4; volta++) {
      const lista = [...cortadas, ...pedacosNovos];
      const usos = new Map();
      for (const item of lista) for (const v of item[1]) if (v < 0) { if (!usos.has(v)) usos.set(v, []); usos.get(v).push(item); }
      let tirou = false;
      for (const [v, donos] of usos) {
        if (donos.length !== 2) continue;
        const vizinhos = donos.map(([, P]) => { const k = P.indexOf(v); return new Set([P[(k + P.length - 1) % P.length], P[(k + 1) % P.length]]); });
        if (![...vizinhos[0]].every((w) => vizinhos[1].has(w))) continue;
        religaCostura(v, donos.map((item) => item[1]));
        for (const item of donos) item[1] = item[1].filter((w) => w !== v);
        tirou = true;
      }
      for (let k = pedacosNovos.length - 1; k >= 0; k--) if (pedacosNovos[k][1].length < 3) pedacosNovos.splice(k, 1);
      for (let k = cortadas.length - 1; k >= 0; k--) {
        if (cortadas[k][1].length >= 3) continue;
        const [fid] = cortadas[k];
        const j = pedacosNovos.findIndex((q) => q[0] === fid && !q[2]);
        if (j >= 0) { cortadas[k] = [fid, pedacosNovos[j][1]]; pedacosNovos.splice(j, 1); }
        else { cortadas.splice(k, 1); consumidas.push(fid); }
      }
      if (!tirou) break;
    }
    /* ---- FUSÃO DOS PEDAÇOS COPLANARES (só a booleana comum) ----
       Os pedaços acima saem partidos além do necessário por duas causas. A face de um sólido subtraído volta da Manifold
       virada para dentro do buraco, ao contrário da normal da face de entrada, e a fusão em `pedacosConvexos` mede a
       convexidade contra essa normal, então a faceta de um cilindro subtraído ficava em triângulos. E o acabamento parte
       o polígono no canto colinear que uma face vizinha usa, para o leque do primeiro canto não ter triângulo sem área,
       o que `triangularSemDegenerado` já resolve; sobravam tiras de 8 mm por 2 m ao lado do canto. Aqui, por último, os
       pedaços de uma mesma face de entrada que formam juntos um polígono plano e convexo, com o canto colinear mantido,
       voltam a ser um só. Nenhum canto some e nenhuma outra face muda, então a casca continua fechada, e a superfície é a
       mesma a até 1e-9 do tamanho da peça: o polígono fundido tem de ser plano a esse tanto, o que deixa de fora a face
       torta de um loft, onde fundir mudaria a forma. A face cortada guarda o id, e o pedaço unido deixa de consumir id do
       bloco. O arredondamento (`extra`) não passa por aqui. */
    if (!extra) {
      const valencia = new Map();
      for (const P of [...mantidas.map((fid) => cicloRep(st.F.get(fid).vs)), ...cortadas.map((c) => c[1]), ...pedacosNovos.map((c) => c[1])]) {
        for (const v of new Set(P)) valencia.set(v, (valencia.get(v) ?? 0) + 1);
      }
      const porFace = new Map();
      for (const item of cortadas) porFace.set(item[0], [{ ref: item, lista: cortadas, prioridade: true }]);
      for (const item of pedacosNovos) {
        if (!porFace.has(item[0])) porFace.set(item[0], []);
        porFace.get(item[0]).push({ ref: item, lista: pedacosNovos, prioridade: false });
      }
      for (const grupo of porFace.values()) {
        if (grupo.length < 2) continue;
        for (const [, sai] of fundirCoplanares(pos, grupo, { plano: PLANO_DA_FUSAO * escalaDaPeca, seno: SENO_DA_FUSAO, valencia })) {
          sai.lista.splice(sai.lista.indexOf(sai.ref), 1);
        }
      }
    }
    for (const item of [...cortadas, ...pedacosNovos]) item[1] = melhorInicio(pos, item[1]);
    if (pedacosNovos.length > BLOCO + FAIXA_ESTENDIDA) return grita(st, i, op, 'solidos', `a costura partiu faces em ${pedacosNovos.length} pedaços a mais, mais que os ${BLOCO + FAIXA_ESTENDIDA} ids do passo (bloco mais faixa estendida); divida a operação em passos menores`);

    /* ---- PORTÃO DE FACE DEGENERADA ----
       Face que sai com área zero (três cantos colineares, ou um polígono
       que a retirada de cantos colineares fechou sobre si) o adaptador do
       visor recusa, e a receita já teria sido aceita. Tudo o que o acabamento
       acima podia consertar já foi consertado (pedaço sem área funde-se ao
       vizinho pela aresta mais longa); o que sobra aqui não tem conserto local
       e grita com a face de origem, em vez de seguir para a tela. O limite é
       mil vezes menor que o piso das lascas: só pega área que é ruído. */
    {
      const semArea = [
        ...mantidas.map((fid) => [fid, cicloRep(st.F.get(fid).vs)]),
        ...cortadas, ...pedacosNovos.map((c) => [c[0], c[1]]),
      ].filter(([, P]) => new Set(P).size >= 3 && areaDe(pos, P) < piso * 1e-3);
      if (semArea.length) {
        const [fid, P] = semArea[0];
        if (extra) return grita(st, i, op, extra.ref, `o arredondamento deixaria ${semArea.length} face(s) sem área (cantos colineares), a primeira vinda da face ${fid}: o raio não combina com o tamanho das faces deste encaixe; tente um raio diferente, começando por um menor (raioMinimo e regiao não mudam a tampa que gera a lasca); nada foi alterado`);
        return grita(st, i, op, 'solidos', `o resultado teria ${semArea.length} face(s) degenerada(s) (área zero: os cantos ficam colineares), a primeira vinda da face ${fid} com ${P.length} cantos; laterais coplanares entre os sólidos costumam causar isto. Afaste as laterais (uma delas 1 mm menor) ou una os sólidos por outra partição; nada foi alterado`);
      }
    }

    /* ---- PORTÃO DE LASCA (só nas classes novas do arredondamento) ----
       O triângulo do leque de uma face de saída com área abaixo de 1e-9·escala²
       (o piso do `conferirMalha`, com o tamanho da caixa no lugar do maior |v|) cintila na tela. O portão
       de cima só pega a face inteira sem área; aqui a lasca dentro de uma face
       com área também grita. */
    if (extra?.estrito) {
      const escala = escalaDaPeca;   // o tamanho da peça, e não a distância à origem: a peça deslocada tem as mesmas lascas
      const lasca = [...cortadas, ...pedacosNovos].filter(([, P]) => { for (let k = 1; k < P.length - 1; k++) if (areaDe(pos, [P[0], P[k], P[k + 1]]) < 1e-9 * escala * escala) return true; return false; });
      if (lasca.length) return grita(st, i, op, extra.ref, `o arredondamento deixaria ${lasca.length} face(s) com triângulo sem área (lasca que cintila na tela), a primeira vinda da face ${lasca[0][0]}: o raio não combina com o tamanho das faces deste encaixe; tente um raio diferente, começando por um menor (raioMinimo e regiao não mudam a tampa que gera a lasca); nada foi alterado`);
    }

    const semEfeitos = [];
    if (!extra && (op === 'subtrair' || op === 'intersectar')) {
      const mantidasSet = new Set(mantidas);
      const pecaIntacta = operandos[0].every((fid) => mantidasSet.has(fid) || (degeneradas.includes(fid) && !consumidas.includes(fid)));
      /* no intersectar a peça inteira dentro dos outros não deixa face deles no resultado: a face de outro sólido que sobra (a cavidade de uma casca oca) é mudança */
      if (op === 'intersectar') { if (pecaIntacta && !temFace.slice(1).some(Boolean)) semEfeitos.push({ ferramenta: null, tipo: 'dentro' }); }
      else {
        for (const [k, sob] of sobreposicao) {
          const tipo = !sob.caixa ? 'longe' : !sob.fino ? 'vao' : pecaIntacta ? 'grade' : 'dentroDeOutra';
          semEfeitos.push({ ferramenta: operandos.length > 2 ? k : null, tipo });
        }
      }
    }
    /* ---- CANTOS COINCIDENTES DE OPERANDOS DIFERENTES ----
       Dois cantos que coincidem (o canto do aro de um tubo e o polo da tampa de outro, quando a frente de um fica rente à tampa do outro) entram na Manifold como
       um só, o representante, e os pedaços cortados saem com ele. A face que o passo mantém inteira continua com o id que escreveu a entrada, e se um vizinho
       cortado usa o representante a aresta entre os dois fica aberta (a peça de prova frente-rente-a-tampa media 4). A troca vale só onde o id antigo deixaria
       aresta aberta, e então para todas as faces mantidas que o usam, com os cantos repetidos que ela causa fundidos e as quebras de sombra levadas pelo mesmo mapa:
       onde nada fica aberto a face mantém os ids de sempre. O portão abaixo confere os ids que o passo escreve. */
    const trocaDeCanto = new Map(), vsDaMantida = new Map();
    {
      const abertos = (listas) => {
        const dirigidas = new Map();
        for (const P of listas) for (let k = 0; k < P.length; k++) {
          const x = P[k], y = P[(k + 1) % P.length];
          if (x !== y) dirigidas.set(`${x}>${y}`, (dirigidas.get(`${x}>${y}`) ?? 0) + 1);
        }
        const vs = new Set();
        for (const [chave, n] of dirigidas) {
          const [x, y] = chave.split('>');
          if (n !== 1 || dirigidas.get(`${y}>${x}`) !== 1) { vs.add(Number(x)); vs.add(Number(y)); }
        }
        return vs;
      };
      const escritas = () => [...mantidas.map((fid) => vsDaMantida.get(fid) ?? st.F.get(fid).vs), ...cortadas.map((c) => c[1]), ...pedacosNovos.map((c) => c[1])].filter((P) => new Set(P).size >= 3);
      const abertas = abertos(escritas());
      if (abertas.size) {
        for (const [v, r] of repDe) if (v !== r && (abertas.has(v) || abertas.has(r))) trocaDeCanto.set(v, r);
        for (const fid of mantidas) {
          const vs = st.F.get(fid).vs;
          if (!vs.some((v) => trocaDeCanto.has(v))) continue;
          const c = [];
          for (const v of vs) { const r = trocaDeCanto.get(v) ?? v; if (c[c.length - 1] !== r) c.push(r); }
          while (c.length > 1 && c[0] === c[c.length - 1]) c.pop();
          if (c.length >= 3) vsDaMantida.set(fid, c);
        }
      }
    }
    /* ---- PORTÃO DE CASCA FECHADA ----
       O resultado (faces mantidas, cortadas e pedaços) tem de ser uma casca
       fechada e manifold: toda aresta dirigida com exatamente uma oposta, e o
       vínculo de todo vértice um laço só. Antes deste portão uma costura mista
       (caixa com cilindro facetado) saía com 46 arestas sem par e nenhum grito
       (achado da revisão, 2026-09-29). Aqui a falha GRITA e o passo aborta
       com 0 V/0 F. */
    {
      /* duas conferências: a dos cantos soldados (os representantes, como sempre), que acha o contato não-manifold geométrico (dois cubos que só se tocam num canto ou numa
         aresta têm ids distintos no ponto de contato, e só o ciclo de representantes o vê), e a dos ids que o passo escreve, que acha a fresta que a solda escondia */
      const depois = [...cortadas.map((c) => c[1]), ...pedacosNovos.map((c) => c[1])];
      const porRepresentante = [...mantidas.map((fid) => cicloRep(st.F.get(fid).vs)), ...depois].filter((P) => new Set(P).size >= 3);
      const porIdEscrito = [...mantidas.map((fid) => vsDaMantida.get(fid) ?? st.F.get(fid).vs), ...depois].filter((P) => new Set(P).size >= 3);
      const casca = porRepresentante;
      const falha = cascaAberta(porRepresentante) ?? cascaAberta(porIdEscrito);
      if (falha && extra?.tentativa) return { falhouCasca: falha };
      /* na tentativa (os prismas em meia-esquadria), pedaço sem área também
         reprova: é o sinal de tampas vizinhas que não coincidem, e o modo por
         fatias não tem tampa no meio da costura */
      if (extra?.tentativa && casca.some((P) => areaDe(pos, P) < piso)) return { falhouCasca: 'com pedaço sem área' };
      if (falha) return grita(st, i, op, extra ? extra.ref : 'solidos', `o resultado sairia ${falha}; é defeito do cálculo, não da receita, e nada foi alterado`);
    }

    // ---- ids definitivos dos vértices novos: só os usados, em ordem ----
    if (extra && !auxChaves.length) return grita(st, i, op, extra.ref, 'o material do arredondamento não sobrou em face nenhuma do resultado');
    const usadosNovos = new Set();
    for (const [, P] of [...cortadas, ...pedacosNovos]) for (const v of P) if (v < 0) usadosNovos.add(v);
    const provisorios = [...usadosNovos].sort((x, y) => y - x);   // -1, -2, … = ordem da saída
    if (provisorios.length > BLOCO + FAIXA_ESTENDIDA) return grita(st, i, op, 'solidos', `a costura criou ${provisorios.length} vértices, mais que os ${BLOCO + FAIXA_ESTENDIDA} ids do passo (bloco mais faixa estendida); divida a operação em passos menores`);
    const definitivo = new Map(provisorios.map((v, k) => [v, idDoPasso(i, k)]));   // do id 1000 em diante, a faixa estendida do passo
    const idFinal = (v) => definitivo.get(v) ?? v;

    // ---- daqui em diante nada pode falhar: aplica ----
    for (const v of provisorios) addV(st, definitivo.get(v), posNova.get(v));
    const faces = [...mantidas];
    /* a troca de cantos coincidentes, calculada antes do portão de casca fechada, vale só onde o id antigo deixaria aresta aberta */
    for (const [fid, vs] of vsDaMantida) {
      const f = st.F.get(fid);
      if (f.quebras) f.quebras = f.quebras.map(([x, y]) => [trocaDeCanto.get(x) ?? x, trocaDeCanto.get(y) ?? y]).filter(([x, y]) => x !== y);
      if (f.quebras && !f.quebras.length) delete f.quebras;
      f.vs = vs;
    }
    /* a quebra de sombra (`face.quebras`, o vinco vivo da subdivisão) é uma aresta da face de entrada. O corte apaga ou
       reparte essa aresta, e o par de ids antigo ficava apontando vértice que não existe mais. Cada pedaço fica com os
       trechos da aresta original que continuam na borda dele, com os vértices dele; as posições das pontas são lidas
       aqui, antes de o passo apagar os vértices que saem. */
    const pontasDasQuebras = new Map();
    for (const fid of new Set([...cortadas.map((c) => c[0]), ...pedacosNovos.filter((c) => !c[2]).map((c) => c[0])])) {
      const q = st.F.get(fid)?.quebras;
      if (!Array.isArray(q) || !q.length) continue;
      pontasDasQuebras.set(fid, q.filter(([a, b]) => st.V.has(a) && st.V.has(b)).map(([a, b]) => [st.V.get(a), st.V.get(b)]));
    }
    const sobreOTrecho = (p, [a, b]) => {
      const ab = sub(b, a), ap = sub(p, a), t = ponto(ap, ab) / (ponto(ab, ab) || 1);
      if (t < -1e-9 || t > 1 + 1e-9) return false;
      const d = sub(ap, [ab[0] * t, ab[1] * t, ab[2] * t]);
      return ponto(d, d) <= 1e-14;
    };
    const quebrasDoPedaco = (fid, vs) => {
      const pontas = pontasDasQuebras.get(fid);
      if (!pontas?.length) return [];
      const saem = [];
      vs.forEach((v, k) => {
        const w = vs[(k + 1) % vs.length];
        if (v === w) return;
        const pv = st.V.get(v), pw = st.V.get(w);
        if (pontas.some((trecho) => sobreOTrecho(pv, trecho) && sobreOTrecho(pw, trecho))) saem.push([v, w]);
      });
      return saem;
    };
    const porQuebras = (f, quebras) => { if (quebras.length) f.quebras = quebras; else delete f.quebras; };
    for (const [fid, P] of cortadas) {
      const f = st.F.get(fid);
      f.vs = P.map(idFinal); f.tinta = [];
      if (f.quebras) porQuebras(f, quebrasDoPedaco(fid, f.vs));
      faces.push(fid);
    }
    const facesAux = [], pedacosDeEntrada = [];
    /* qual operando (índice em `solidos`) deu cada face final: o
       `arredondarCostura` com `arestas:'internas'` precisa saber que duas
       faces são da MESMA ferramenta. Vale só para a booleana; o registro do
       arredondamento não tem operandos. */
    const operandoDaFace = new Map(entradas.map((fid, e) => [fid, operandoDaEntrada[e]]));
    const donos = {};
    if (!extra) for (const fid of [...mantidas, ...cortadas.map((c) => c[0])]) donos[fid] = operandoDaFace.get(fid);
    pedacosNovos.forEach(([fid, P, aux], k) => {
      if (!extra && !aux) donos[idDoPasso(i, k)] = operandoDaFace.get(fid);
      const id = idDoPasso(i, k), f = st.F.get(fid);
      addF(st, id, P.map(idFinal));
      const nf = st.F.get(id);
      nf.cor = f.cor; nf.material = f.material; nf.parte = f.parte; nf.liso = f.liso; nf.solido = f.solido;
      if (aux && extra.liso != null) nf.liso = extra.liso;
      if (!aux) porQuebras(nf, quebrasDoPedaco(fid, nf.vs));
      if (st.parteAtribuidaEm?.has(fid)) st.parteAtribuidaEm.set(id, st.parteAtribuidaEm.get(fid));
      (st.pedacosDe ??= new Map()).set(id, fid);
      faces.push(id);
      if (aux) facesAux.push(id); else pedacosDeEntrada.push(id);
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
    if (extra?.aoAplicar) extra.aoAplicar({ pedacosDeEntrada, consumidas: [...consumidas] });
    const MOTIVOS_DO_SEM_EFEITO = {
      longe: (q) => `${q} não toca a peça ou só encosta nela: nenhuma face da peça foi cortada nem consumida e nenhum pedaço novo entrou; confira a posição e o tamanho da ferramenta`,
      vao: (q) => `${q} fica dentro da caixa da peça mas não a cruza (passa por um vão dela): nenhuma face da peça foi cortada; confira a posição da ferramenta`,
      grade: (q) => `${q} cruza a peça, mas o corte some na precisão da grade da Manifold (2^-20 do tamanho da caixa dos operandos) e nenhuma face da peça mudou; aumente a ferramenta ou confira a escala`,
      dentroDeOutra: (q) => `${q} não deixou face no resultado: está inteira dentro do corte de outra ferramenta e não muda mais nada`,
      dentro: () => 'a interseção não mudou nenhuma face da peça (sólido 0) e nenhuma face dos outros sólidos ficou no resultado: a peça está inteira dentro dos outros; confira a posição e o tamanho dos sólidos',
    };
    for (const e of semEfeitos) {
      const quem = e.ferramenta == null ? 'a ferramenta' : `a ferramenta ${e.ferramenta}`;
      st.avisos.push({ passo: i, op, ref: 'semEfeito', origemId, ...(e.ferramenta == null ? {} : { ferramenta: e.ferramenta }), motivo: MOTIVOS_DO_SEM_EFEITO[e.tipo](quem) });
    }
    registraOrigem(st, i, op, origemId, {
      faces: (extra ? facesAux : faces).sort((x, y) => x - y),
      costura: facesDaCostura.sort((x, y) => x - y),
      arestas,
      passo: i,
      ...(extra ? {} : { donos }),
      ...(extra?.registroExtra ?? {}),
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
     meia-esquadria, e fica um vinco no plano bissetor. O raio também não é
     conferido contra o tamanho das faces vizinhas: raio maior que a face faz
     o prisma sair dela.

     ARESTAS (fatia 7b do plano): `arestas` escolhe o que ganha raio, e o
     padrão, 'concavas', é tudo o que está dito acima, sem mudar nada.
       'convexas'  a borda CONVEXA da costura (a beira de um rebaixo, de um
                   rasgo, de um corte, de um intersectar). O prisma é o mesmo,
                   com o centro do arco do lado de dentro do sólido, e ele é
                   SUBTRAÍDO: o arredondamento tira o material entre a quina
                   e o arco;
       'internas'  só em `subtrair`: as arestas CÔNCAVAS entre duas faces da
                   mesma ferramenta que a booleana deixou na peça (o fundo e
                   os cantos de um rebaixo), fora da costura e com dobra de
                   45° ou mais (abaixo disso é o facetamento de uma parede
                   curva). Ganham material, como as côncavas;
       'todas'     as três classes, cada uma só onde a dobra é de 45° ou mais;
       lista       as classes nomeadas, sem esse corte (['convexas',
                   'internas']).
     As classes de um passo saem no MESMO cálculo (primeiro o que enche, depois
     o que tira), porque um segundo passo sobre a mesma origem recusa: a origem
     `de` só tem as faces da booleana, e as do primeiro arredondamento são de
     outra origem. Duas concordâncias de tipos diferentes numa face, em arestas
     paralelas, que se sobrepõem ou se encostam (a borda e o fundo de um
     rebaixo mais raso que a soma dos raios) gritam.
     No modo plano os prismas de classes diferentes têm meia-esquadria só com
     os da mesma classe. Onde três arestas do mesmo tipo se encontram (o canto
     do fundo de um rebaixo) as pontas ficam retas, e o canto sai como a união
     de três cilindros, sem esfera.

     MODO POR FATIAS nas classes novas. O modo plano recusa quando a tangência
     sai da face; nas classes novas isso manda para o modo por fatias, que
     também é o único que aceita `regiao`. Nele a costura vira um grafo:
     trechos entre vértices de valência diferente de dois, e lacos. Onde o
     trecho dobra mais de 20° (uma quina do laço) ou termina, o anel da última
     estação da aresta é DESLIZADO ao longo dela até o plano de corte do
     vértice, o mesmo da meia-esquadria do modo plano (corte reto na ponta); os
     dois trechos de uma quina partem do MESMO anel, e as duas tampas
     coincidem. A superfície de transição entre esse anel e o da estação
     seguinte não é de nenhum dos dois cilindros: dentro de um raio de cada
     quina o raio medido pode diferir: 3,5e-3 (7%) num corte a 53° do cilindro,
     e, medido num rebaixo girado, cerca de 22% a 24% do raio a 15° e 41% a 33°.
     Rebaixo girado também produz lascas nos cantos do fundo, e o portão de
     lasca (triângulo do leque abaixo de 1e-9·escala²) grita nas classes
     novas em vez de entregá-las; a contagem de faces varia muito com o raio
     porque o modo plano falha a casca e cai no modo por fatias Nas classes novas o
     círculo do Newton também tem de ENCOSTAR: se o ponto mais perto é uma
     quina que dobra mais de 45° (a parede de um rebaixo mais curta que o
     raio), ou as duas faces se fecham em cunha, o passo grita. Onde o raio não
     cabe, `raioMinimo` (PARAM em (0, raio]) faz o raio local cair em passos de
     3/4 até esse mínimo, e o tubo afina só ali; sem ele a recusa é a de
     sempre, e a mensagem diz a distância, o raio que a face comporta e as
     duas saídas (`raioMinimo` e `regiao`). A redução é DECLARADA em
     `neutro.avisos` (propriedade fora da enumeração: `raioPedido`, `raioMenor`,
     `estacoes`); com costura plana `raioMinimo` não tem efeito e o aviso diz
     isso. A checagem de sobreposição entre classes usa sempre o raio pleno.

     ARGUMENTOS
       `origemId`   OBRIGATÓRIO: a origem das faces novas do arredondamento;
       `de`         a origem `{op:'unir'|'subtrair'|'intersectar', id}` cuja
                    costura se arredonda. O sólido é o conjunto das faces vivas
                    dessa origem, e precisa continuar fechado;
       `raio`       PARAM dimensional > 0;
       `paineis`    TOPO, inteiro de 2 a 64, padrão 8: faixas do arco. Muda a
                    contagem de faces, então renumera;
       `arestas`    'concavas' (padrão), 'convexas', 'internas', 'todas' ou
                    lista dessas;
       `raioMinimo` opcional, em (0, raio], só tem efeito no modo por fatias;
       `aparar`     só com `regiao`: fora da regiao a seção não é medida, o anel
                    da última estação medida é levado ao longo da costura,
                    girado com a direção dela, e o tubo é intersectado com o
                    corte. O corte é uma caixa {min,max} do mundo ou
                    {solido: <seleção>}, um sólido da receita que o passo
                    consome (o molde: a peça com o chanfro da borda prolongado,
                    por exemplo, para o arredondamento terminar acompanhando o
                    chanfro). Face do corte em cima de face ou aresta do sólido
                    deixa triângulo sem área na união: afaste o corte uma
                    fração de milímetro para dentro;
       `afinarPontas` opcional, comprimento > 0, só no modo por fatias: na ponta
                    solta de um trecho que a `regiao` cortou, o raio cai em
                    linha até 15% ao longo desse comprimento, em vez de o tubo
                    fechar com o raio pleno e uma tampa reta;
       `regiao`     caixa {min,max} do mundo: só os vértices e estações dentro
                    dela. Na costura côncava de sempre só vale no modo por
                    fatias e grita no plano; nas classes novas leva ao modo por
                    fatias.

     IDENTIDADE: a mesma do `unir`. As faces do sólido que o prisma encosta
     mantêm o id no maior pedaço; as faces do arredondamento são todas novas,
     no bloco do passo (ou na faixa estendida, se passarem dele), e herdam cor,
     material e parte da primeira face da costura; o `liso` delas é 45° (o arco
     fica liso e a quina com a face plana vizinha continua nítida). A origem
     `{op:'arredondarCostura', id}` devolve as faces do arredondamento. Classe
     sem aresta grita, e a mensagem diz quais classes a costura tem. O registro
     da booleana guarda `donos` (face → índice do operando) para o 'internas'. */
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
    if (registro.arredondadaEm != null) return grita(st, i, op, 'de', `a costura de ${de.op}:${de.id} já foi arredondada pelo arredondarCostura do passo ${registro.arredondadaEm}; mude o raio daquele passo, ou peça as outras classes de arestas nele (arestas:'todas' ou uma lista), em vez de arredondar de novo`);
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
    /* `regiao` {min,max}: só os vértices da costura dentro da caixa são
       arredondados. Serve para arredondar um trecho do encontro (o de baixo
       do ombro) e deixar outro vivo (o de cima, onde as faces ficam rentes e
       a bola não cabe). Só vale na costura curva; na plana os prismas são
       por aresta inteira e a caixa grita. */
    let regiao = null;
    if (a.regiao != null) {
      const r = a.regiao;
      if (!r || typeof r !== 'object' || Array.isArray(r) || Object.keys(r).some((k) => k !== 'min' && k !== 'max') || r.min == null || r.max == null) return grita(st, i, op, 'regiao', 'regiao precisa ser {min:[x,y,z], max:[x,y,z]}');
      try { regiao = { min: st.vec(r.min), max: st.vec(r.max) }; } catch (e) { return grita(st, i, op, 'regiao', e.message); }
      if (regiao.min.some((c, k) => !(c <= regiao.max[k]))) return grita(st, i, op, 'regiao', 'regiao: min não pode passar de max');
    }
    let aparar = null, facesDoMolde = null;
    if (a.aparar != null) {
      const r = a.aparar;
      if (!regiao) return grita(st, i, op, 'aparar', 'aparar só vale com regiao: a regiao diz onde a seção é medida, e fora dela o tubo segue a costura até o corte');
      if (r && typeof r === 'object' && !Array.isArray(r) && Object.keys(r).length === 1 && r.solido != null) {
        /* MOLDE: um sólido da receita, que o passo consome. O tubo fica só com
           o que está dentro dele, e o sólido some da peça junto com o passo. */
        const antes = st.orfaos.length;
        const sel = resolverSelecao(st, r.solido, op, i);
        if (st.orfaos.length > antes) return;
        facesDoMolde = [...sel.faces].sort((x, y) => x - y);
        if (!facesDoMolde.length) return grita(st, i, op, 'aparar', 'aparar.solido não tem face nenhuma');
        const daPeca = new Set(faces);
        if (facesDoMolde.some((f) => daPeca.has(f))) return grita(st, i, op, 'aparar', 'aparar.solido precisa ser um sólido à parte, fora da peça que se arredonda');
        aparar = { molde: true };
      } else {
        if (!r || typeof r !== 'object' || Array.isArray(r) || Object.keys(r).some((k) => k !== 'min' && k !== 'max') || r.min == null || r.max == null) return grita(st, i, op, 'aparar', 'aparar precisa ser {min:[x,y,z], max:[x,y,z]} ou {solido: <seleção>}');
        try { aparar = { min: st.vec(r.min), max: st.vec(r.max) }; } catch (e) { return grita(st, i, op, 'aparar', e.message); }
        if (aparar.min.some((c, k) => !(c < aparar.max[k]))) return grita(st, i, op, 'aparar', 'aparar: min precisa ficar abaixo de max em cada eixo');
      }
    }

    /* `arestas`: quais arestas ganham raio. 'concavas' (padrão) é o encontro
       côncavo da costura, como sempre foi; 'convexas' é a borda convexa da
       costura (a beira do rebaixo, do rasgo, do corte); 'internas' é o
       encontro côncavo entre duas faces da MESMA ferramenta de um `subtrair`
       (o fundo e os cantos do rebaixo). 'todas' junta as três, e uma lista
       junta as que ela nomear: as classes de um passo saem no mesmo cálculo,
       porque um segundo passo sobre a mesma origem recusa. */
    const CLASSES = ['concavas', 'internas', 'convexas'];
    let classes;
    const soQuinas = a.arestas === 'todas';   // 'todas' só pega quina franca (dobra de 45° ou mais); a lista e o nome de uma classe pegam qualquer dobra
    {
      const pedido = a.arestas ?? 'concavas';
      const lista = pedido === 'todas' ? CLASSES : Array.isArray(pedido) ? pedido : [pedido];
      if (!lista.length || lista.some((c) => !CLASSES.includes(c)) || new Set(lista).size !== lista.length) {
        return grita(st, i, op, 'arestas', `arestas precisa ser 'concavas', 'convexas', 'internas', 'todas' ou uma lista sem repetição dessas (recebido ${JSON.stringify(pedido)})`);
      }
      classes = CLASSES.filter((c) => lista.includes(c));
    }
    const restrito = !(classes.length === 1 && classes[0] === 'concavas');   // as classes novas ganham as recusas novas; a costura côncava de sempre não muda
    let raioMinimo = null;
    if (a.raioMinimo != null) {
      try { raioMinimo = st.num(a.raioMinimo); } catch (e) { return grita(st, i, op, 'raioMinimo', e.message); }
      if (!(raioMinimo > 0) || !(raioMinimo <= raio)) return grita(st, i, op, 'raioMinimo', `raioMinimo precisa estar em (0, raio] (recebido ${raioMinimo}, com raio ${raio})`);
    }
    let afinarPontas = null;
    if (a.afinarPontas != null) {
      try { afinarPontas = st.num(a.afinarPontas); } catch (e) { return grita(st, i, op, 'afinarPontas', e.message); }
      if (!(afinarPontas > 0) || !Number.isFinite(afinarPontas)) return grita(st, i, op, 'afinarPontas', `afinarPontas precisa ser um comprimento > 0 (recebido ${JSON.stringify(a.afinarPontas)} = ${afinarPontas})`);
    }
    if (classes.includes('internas') && de.op !== 'subtrair') {
      return grita(st, i, op, 'arestas', `arestas:'internas' só vale num subtrair, onde a ferramenta deixa faces próprias na peça; ${de.op}:${de.id} não tem ferramenta (tire 'internas' da lista, ou arredonde as arestas do operando antes da booleana)`);
    }

    // ---- as arestas de cada classe, com as duas faces de cada uma ----
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
    /* `sinal` +1: aresta côncava, o arredondamento ACRESCENTA material (une o
       prisma); -1: aresta convexa, o arredondamento TIRA material (subtrai o
       prisma). A seção, os recuos e o centro do arco são os mesmos nos dois:
       o bissetor entra no vazio numa e no sólido na outra. */
    const arestaDe = (x, y, sinal, quina = false) => {
      const fs = facesDaAresta.get(`${x}-${y}`) ?? [];
      if (fs.length !== 2 || !fs.every((f) => noSolido.has(f))) return null;
      const P = st.V.get(x), Q = st.V.get(y);
      const e = sub(Q, P), l = tamanho(e);
      if (!(l > 0)) return null;
      const u = e.map((c) => c / l);
      const para = (fid) => {       // direção dentro da face, perpendicular à aresta
        const d = sub(centroide(fid), P), s = ponto(d, u);
        const r = [d[0] - s * u[0], d[1] - s * u[1], d[2] - s * u[2]], m = tamanho(r);
        return r.map((c) => c / m);
      };
      const [fA, fB] = fs;
      const dA = para(fA), dB = para(fB);
      const nA = normalDaFace(st.V, st.F.get(fA).vs);
      const frente = ponto(nA, dB);
      if (sinal > 0 ? !(frente > 1e-9) : !(frente < -1e-9)) return null;   // do outro tipo, ou plana
      const theta = Math.acos(Math.max(-1, Math.min(1, ponto(dA, dB))));
      if (!(theta > 1e-6 && theta < Math.PI - 1e-6)) return null;
      const nB = normalDaFace(st.V, st.F.get(fB).vs);
      if (quina && !(ponto(nA, nB) <= Math.SQRT1_2 + 1e-9)) return null;
      return { x, y, u, dA, dB, theta, nA, nB, pA: ponto(nA, P), pB: ponto(nB, P), sinal, fA, fB };
    };
    const arestasDaCostura = registro.arestas;
    const naCostura = new Set(arestasDaCostura.map(([x, y]) => `${x}-${y}`));
    /* aresta INTERNA: fora da costura, entre duas faces do mesmo operando que
       é ferramenta (índice 1 em diante) e com dobra franca. Abaixo de 45° a
       aresta é o facetamento de uma parede curva (o cilindro que faz o fundo
       de um rasgo), e não um canto: arredondá-la não tem sentido. */
    const internas = [];
    if (de.op === 'subtrair') {
      const donos = registro.donos ?? {};
      for (const [chave, fs] of facesDaAresta) {
        if (naCostura.has(chave) || fs.length !== 2) continue;
        const [d1, d2] = fs.map((f) => donos[f]);
        if (d1 == null || d1 !== d2 || d1 < 1) continue;
        if (!(ponto(normalDaFace(st.V, st.F.get(fs[0]).vs), normalDaFace(st.V, st.F.get(fs[1]).vs)) <= Math.SQRT1_2 + 1e-9)) continue;
        internas.push(chave.split('-').map(Number));
      }
      internas.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    }
    const porClasse = {
      concavas: arestasDaCostura.map(([x, y]) => arestaDe(x, y, 1, soQuinas)).filter(Boolean),
      convexas: arestasDaCostura.map(([x, y]) => arestaDe(x, y, -1, soQuinas)).filter(Boolean),
      internas: internas.map(([x, y]) => arestaDe(x, y, 1)).filter(Boolean),
    };
    const concavas = classes.flatMap((c) => porClasse[c]);   // todas as arestas a arredondar, de qualquer classe
    if (!concavas.length) {
      const existe = { concavas: porClasse.concavas.length, convexas: porClasse.convexas.length, internas: porClasse.internas.length };
      const outras = CLASSES.filter((c) => !classes.includes(c) && existe[c] > 0).map((c) => `${existe[c]} ${c === 'concavas' ? 'côncava(s) da costura' : c === 'convexas' ? 'convexa(s) da costura' : 'interna(s) da ferramenta'} (arestas:'${c}')`);
      const rotulo = classes.map((c) => (c === 'concavas' ? 'côncava' : c === 'convexas' ? 'convexa' : 'interna')).join(' nem ');
      return grita(st, i, op, 'de', `a costura de ${de.op}:${de.id} não tem aresta ${rotulo}: não há encontro a arredondar${outras.length ? `; ela tem ${outras.join(' e ')}; peça essas em arestas, ou 'todas'` : "; confira que a booleana deixou costura (os sólidos se cruzam) e, para 'internas', que é um subtrair de ferramenta com paredes próprias"}`);
    }

    /* Duas concordâncias de tipos diferentes na MESMA face, em arestas
       paralelas (a borda e o fundo de um rebaixo, na parede dele), se
       sobrepõem quando os dois recuos somam mais que a distância entre as
       arestas: a borda tira material do que o fundo acabou de pôr, e a forma
       sai sem ser nenhuma das duas. Grita em vez de sair assim. */
    {
      const rChecado = raio;   // a concordância que a geometria constrói é a de raio pleno; raioMinimo só afina onde a face não comporta, e não resolve sobreposição
      const recuoDe = (c) => rChecado / Math.tan(c.theta / 2);
      for (let p = 0; p < concavas.length; p++) for (let q = p + 1; q < concavas.length; q++) {
        const c = concavas[p], d = concavas[q];
        if (c.sinal === d.sinal) continue;
        /* a face em comum pode estar partida em pedaços de ids diferentes:
           vale o plano, e não o id */
        const comum = [[c.nA, c.pA, c.fA], [c.nB, c.pB, c.fB]].find(([n1, p1]) => [[d.nA, d.pA], [d.nB, d.pB]].some(([n2, p2]) => ponto(n1, n2) > 1 - 1e-9 && Math.abs(p1 - p2) < 1e-9 * Math.max(1, Math.abs(p1))))?.[2];
        if (comum == null || tamanho(cruz(c.u, d.u)) > 1e-6) continue;
        const w = sub(st.V.get(d.x), st.V.get(c.x)), s0 = ponto(w, c.u);
        const dist = tamanho([w[0] - s0 * c.u[0], w[1] - s0 * c.u[1], w[2] - s0 * c.u[2]]);
        if (dist <= (recuoDe(c) + recuoDe(d)) * (1 + 1e-6)) {   // encostar já deixa a face entre elas sem altura
          return grita(st, i, op, 'raio', `o raio ${rChecado} faz a concordância da aresta ${c.sinal < 0 ? c.x + '-' + c.y : d.x + '-' + d.y} (convexa) e a da aresta ${c.sinal < 0 ? d.x + '-' + d.y : c.x + '-' + c.y} (côncava) se sobreporem ou se encostarem na face ${comum}: as duas ficam a ${dist} uma da outra e os recuos somam ${recuoDe(c) + recuoDe(d)}; diminua o raio (raioMinimo não resolve isto), ou arredonde só uma das classes em arestas`);
        }
      }
    }

    /* RAIO MÍNIMO, LOCAL: 1/64 da meia-extensão da própria costura (a caixa dos
       vértices das arestas côncavas), e não da caixa do sólido inteiro. Abaixo
       disso as tampas dos prismas vizinhos, que não coincidem quando o canto
       não é reto, deixam cantos a poucos milionésimos um do outro, e a malha
       sai com triângulos abaixo do piso de área da guarda. Medido com o braço
       inclinado de 10° a 35° numa costura de meia-extensão 0,6: 0,01 sai limpo
       em todos, 0,005 e 0,003 não. Com a régua na costura, uma peça grande com
       um encontro pequeno aceita o raio que a escala do encontro comporta, e
       um encontro grande continua exigindo o mesmo piso. */
    {
      const lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
      for (const c of concavas) for (const v of [c.x, c.y]) st.V.get(v).forEach((q, k) => { lo[k] = Math.min(lo[k], q); hi[k] = Math.max(hi[k], q); });
      const minimo = Math.max(...[0, 1, 2].map((k) => (hi[k] - lo[k]) / 2)) / 64;
      if (raio < minimo) return grita(st, i, op, 'raio', `raio ${raio} é pequeno demais para esta costura: o mínimo é 1/64 da meia-extensão dela, ${minimo}; abaixo disso as tampas dos prismas deixam triângulos sem área`);
    }

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
      const outras = vizinhas.get(v).filter((o) => o !== c && o.sinal === c.sinal);   // o corte é entre prismas da mesma classe: um enche e o outro tira
      if (outras.length !== 1) return reto;
      const o = outras[0];
      const planosC = [[c.nA, c.pA], [c.nB, c.pB]], planosO = [[o.nA, o.pA], [o.nB, o.pB]];
      let proprioC = null, proprioO = null;
      for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) if (mesmoPlano(planosC[j][0], planosC[j][1], planosO[k][0], planosO[k][1])) { proprioC = planosC[1 - j][0]; proprioO = planosO[1 - k][0]; }
      const sai1c = v === c.x ? c.u : c.u.map((k) => -k), sai2c = v === o.x ? o.u : o.u.map((k) => -k);
      if (!proprioC) {
        /* Sem face comum (costura sobre superfície curva facetada: cada aresta
           da costura tem um par de facetas diferente), corta pelo plano
           bissetor das duas arestas no canto. Os prismas vizinhos diferem só
           pela mudança de faceta, e o degrau entre as tampas é da ordem do
           facetamento. */
        const mm = [sai1c[0] - sai2c[0], sai1c[1] - sai2c[1], sai1c[2] - sai2c[2]], lm = tamanho(mm);
        return lm > 1e-9 ? { m: mm.map((k) => k / lm), X: st.V.get(v) } : reto;
      }
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
      /* o ponto de trás da seção fica DENTRO do sólido, a um raio atrás do
         canto, e não no canto: um prisma com aresta sobre a costura belisca
         a casca no canto (vértice de vínculo não-manifold), o que o portão de
         casca fechada pegou no braço inclinado */
      const atras = sub(P, centro).map((k) => k / tamanho(sub(P, centro)));
      const pts = [P.map((k, j) => k + atras[j] * raio)];
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

    /* face que faz parte de uma superfície curva facetada: tem uma vizinha
       de aresta, não coplanar, dobrada a menos de 45° */
    const vizinhaCurva = (fid) => {
      const vs = st.F.get(fid).vs, n = normalDaFace(st.V, vs);
      for (let k = 0; k < vs.length; k++) {
        const x = vs[k], y = vs[(k + 1) % vs.length];
        for (const g of facesDaAresta.get(x < y ? `${x}-${y}` : `${y}-${x}`) ?? []) {
          if (g === fid) continue;
          const d = ponto(n, normalDaFace(st.V, st.F.get(g).vs));
          if (d < 1 - 1e-9 && d > Math.cos(Math.PI / 4)) return true;
        }
      }
      return false;
    };

    /* ---- COSTURA CURVA: arredondamento por fatias ----
       Em cada vértice P da costura, o sólido é fatiado pelo plano
       perpendicular à costura. A fatia dá as duas curvas da casca que saem de
       P (uma de cada lado do encontro), como poligonais sobre as facetas reais.
       O círculo de raio `raio` tangente às duas é achado por Newton sobre a
       distância às duas poligonais, partindo do círculo dos planos locais: é a
       bola rolando, medida na casca facetada e não num plano só. A seção é o
       arco entre as duas tangências, fechado por um ponto Q dentro do sólido
       (atrás de P, a um raio), e as seções de vértices vizinhos da costura são
       ligadas num tubo. Onde a costura fica plana ou convexa (o topo e os
       lados do braço, rentes à coluna) não há seção, e o tubo termina: ali o
       recuo tende a zero e o arredondamento some sozinho.

       Recusas, com a causa: a tangência passar do trecho percorrido da fatia
       (o raio não cabe), ou a fatia dobrar mais de 45° entre P e a tangência
       (a bola teria de passar por uma quina, e isso não é concordância). */
    const tuboCurvo = (lista, sinal) => {
      /* tolerâncias da fatia pelo TAMANHO do sólido (diagonal da caixa), não
         pela distância à origem: a mesma peça de 5 mm em x = 500 m tinha eps
         de 0,5 mm, maior que a própria costura, e o passo gritava (achado da
         revisão, 2026-09-29). A parada do Newton acompanha também a precisão
         da coordenada, que cresce com |P|. */
      const cxMin = [Infinity, Infinity, Infinity], cxMax = [-Infinity, -Infinity, -Infinity];
      for (const f of faces) for (const v of st.F.get(f).vs) st.V.get(v).forEach((c, k) => { cxMin[k] = Math.min(cxMin[k], c); cxMax[k] = Math.max(cxMax[k], c); });
      const escalaP = Math.max(1e-12, tamanho(sub(cxMax, cxMin)));
      /* tudo em coordenada LOCAL, relativa ao centro da caixa: a conta dá o
         mesmo número com a peça em qualquer lugar, e transladar a peça não
         muda a topologia do arredondamento (achado da revisão: o ombro
         transladado saía com uma face a menos) */
      const centroT = cxMin.map((c, k) => (c + cxMax[k]) / 2);
      const gradeT = gradeDoTamanho(2 * Math.max(...[0, 1, 2].map((k) => (cxMax[k] - cxMin[k]) / 2)));
      const pl = (v) => sub(st.V.get(v), centroT).map((c) => Math.round(c / gradeT) * gradeT);   // na grade da entrada: a mesma peça transladada entra com os mesmos números
      const eps = 1e-9 * escalaP;
      const chaveP = (q) => q.map((c) => Math.round(c / (1e3 * eps))).join(',');   // em coordenada local: transladar não muda a chave
      const vizinhosDaCostura = new Map();
      for (const [x, y] of lista) {
        if (!st.V.has(x) || !st.V.has(y)) continue;
        for (const [p0, p1] of [[x, y], [y, x]]) { if (!vizinhosDaCostura.has(p0)) vizinhosDaCostura.set(p0, []); vizinhosDaCostura.get(p0).push(p1); }
      }
      const fatia = (P, u) => {
        const segs = [];
        for (const fid of faces) {
          const vs = st.F.get(fid).vs, pts = vs.map((v) => pl(v)), d = pts.map((q) => ponto(u, sub(q, P)));
          const cortes = [];
          for (let k = 0; k < pts.length; k++) {
            const j = (k + 1) % pts.length;
            if (Math.abs(d[k]) <= eps) cortes.push(pts[k]);
            if ((d[k] > eps && d[j] < -eps) || (d[k] < -eps && d[j] > eps)) { const t = d[k] / (d[k] - d[j]); cortes.push(pts[k].map((c, w) => c + (pts[j][w] - c) * t)); }
          }
          const unicos = [];
          for (const q of cortes) if (!unicos.some((w) => tamanho(sub(w, q)) <= 1e3 * eps)) unicos.push(q);
          if (unicos.length === 2) segs.push({ a: unicos[0], b: unicos[1], n: normalDaFace(st.V, vs) });
        }
        const adj = new Map();
        for (const sgm of segs) for (const [x, y] of [[sgm.a, sgm.b], [sgm.b, sgm.a]]) {
          const k = chaveP(x); if (!adj.has(k)) adj.set(k, []);
          if (!adj.get(k).some((o) => tamanho(sub(o.p, y)) <= 1e3 * eps)) adj.get(k).push({ p: y, n: sgm.n });
        }
        return adj;
      };
      /* FACE PLANA QUE LIMITA O SÓLIDO (só no arredondamento que enche, classe côncava de sempre). Onde a superfície que a bola rola acaba numa face
         plana que dobra mais de 45° (a tampa de um tubo, rente à parede do outro) e o plano dessa face deixa o sólido inteiro de um lado só, o raio
         não pode passar da borda: o círculo que não cabe tem o raio reduzido de forma contínua, até o maior que cabe, e o arredondamento afina até
         sumir na borda (`secaoEm`), em vez de cair em passos até o `raioMinimo` e terminar em fatias degeneradas sobre o plano da face. */
      let locaisDoSolido = null;
      const planosLimitantes = [];
      const planoLimitante = (n, X) => {
        const d = ponto(n, X);
        const conhecido = planosLimitantes.find((c) => ponto(c.n, n) > 1 - 1e-9 && Math.abs(c.d - d) <= 1e3 * eps);
        if (conhecido) return conhecido.limita;
        if (!locaisDoSolido) { const vistos = new Set(); for (const f of faces) for (const v of st.F.get(f).vs) vistos.add(v); locaisDoSolido = [...vistos].map((v) => pl(v)); }
        const limita = !locaisDoSolido.some((q) => ponto(n, q) - d > 1e3 * eps);
        planosLimitantes.push({ n, d, limita });
        return limita;
      };
      const caminhar = (adj, P, primeiro, comprimento) => {
        const pts = [P, primeiro.p], normais = [primeiro.n];
        let total = tamanho(sub(primeiro.p, P));
        let naFace = false;
        while (total < comprimento) {
          const cur = pts[pts.length - 1], ant = pts[pts.length - 2];
          const prox = (adj.get(chaveP(cur)) ?? []).filter((o) => tamanho(sub(o.p, ant)) > 1e3 * eps);
          if (prox.length !== 1) break;
          if (!restrito && sinal > 0 && ponto(prox[0].n, normais[normais.length - 1]) < Math.cos(Math.PI / 4) && planoLimitante(prox[0].n, cur)) naFace = true;
          pts.push(prox[0].p); normais.push(prox[0].n);
          total += tamanho(sub(prox[0].p, cur));
        }
        return { pts, normais, total, naFace };
      };
      const maisPerto = (curva, C) => {
        let melhor = null;
        for (let k = 0; k < curva.pts.length - 1; k++) {
          const a0 = curva.pts[k], e = sub(curva.pts[k + 1], a0), ll = ponto(e, e);
          const t = ll > 0 ? Math.max(0, Math.min(1, ponto(sub(C, a0), e) / ll)) : 0;
          const q = a0.map((c, j) => c + e[j] * t), d = tamanho(sub(C, q));
          if (!melhor || d < melhor.d) melhor = { q, d, k, t };
        }
        return melhor;
      };
      /* sentido: percorre cada componente da costura a partir do menor id e
         guarda, por vértice, [de onde veio, para onde vai] */
      const sentido = new Map();
      for (const inicio of [...vizinhosDaCostura.keys()].sort((x, y) => x - y)) {
        if (sentido.has(inicio)) continue;
        const pontas = (vizinhosDaCostura.get(inicio) ?? []).length === 1;
        let ant = null, cur = inicio;
        if (!pontas) {
          // se não é ponta, anda até achar uma ponta (cadeia aberta) ou voltar ao início (laço)
          let a0 = null, c0 = inicio;
          for (let passos = 0; passos < vizinhosDaCostura.size; passos++) {
            const viz = vizinhosDaCostura.get(c0) ?? [];
            if (viz.length !== 2) break;
            const prox = viz[0] === a0 ? viz[1] : viz[0];
            if (prox === inicio) break;
            a0 = c0; c0 = prox;
            if ((vizinhosDaCostura.get(c0) ?? []).length === 1) { cur = c0; break; }
          }
        }
        while (cur != null && !sentido.has(cur)) {
          const viz = vizinhosDaCostura.get(cur) ?? [];
          const prox = viz.filter((w) => w !== ant && !sentido.has(w)).sort((x, y) => x - y)[0] ?? null;
          sentido.set(cur, [ant ?? (viz.length === 2 ? viz.find((w) => w !== prox) : null), prox ?? (viz.length === 2 ? viz.find((w) => w !== ant) : null)]);
          if (viz.length > 2) break;
          ant = cur; cur = prox;
        }
      }
      /* Seção num ponto P da costura (local), com a direção u da costura ali. */
      let ultimaNaFace = false;
      const secaoDoRaio = (P, u, onde, raio) => {
        const adj = fatia(P, u);
        const saidas = adj.get(chaveP(P)) ?? [];
        if (saidas.length !== 2) return { pula: true };
        let [A, B] = saidas;
        let dA = sub(A.p, P), dB = sub(B.p, P);
        dA = dA.map((c) => c / tamanho(dA)); dB = dB.map((c) => c / tamanho(dB));
        if (ponto(cruz(dA, dB), u) < 0) { [A, B] = [B, A]; [dA, dB] = [dB, dA]; }
        const theta = Math.acos(Math.max(-1, Math.min(1, ponto(dA, dB))));
        const bis = [dA[0] + dB[0], dA[1] + dB[1], dA[2] + dB[2]];
        if (!(tamanho(bis) > 1e-9) || theta > Math.PI - Math.PI / 90) return { pula: true };   // acima de 178° o encontro é plano: a concordância termina ali, com recuo de 2% do raio
        const b = bis.map((c) => c / tamanho(bis));
        if (sinal > 0 ? !(ponto(b, A.n) > 0 && ponto(b, B.n) > 0) : !(ponto(b, A.n) < 0 && ponto(b, B.n) < 0)) return { pula: true };   // o bissetor entra no sólido (encontro convexo) ao arredondar côncavo, ou sai dele (encontro côncavo) ao arredondar convexo
        const recuo = raio / Math.tan(theta / 2);
        const comprimento = 3 * recuo + 2 * raio;
        const cA = caminhar(adj, P, A, comprimento), cB = caminhar(adj, P, B, comprimento);
        ultimaNaFace = cA.naFace || cB.naFace;
        // Newton no plano da fatia
        const e1 = dA, e2 = cruz(u, e1);
        let C = P.map((c, j) => c + b[j] * raio / Math.sin(theta / 2));
        let na = null, nb = null, ok = false;
        for (let it = 0; it < 40; it++) {
          na = maisPerto(cA, C); nb = maisPerto(cB, C);
          const fa = na.d - raio, fb = nb.d - raio;
          const parada = 1e-12 * escalaP;   // P é local: a precisão da coordenada acompanha o tamanho
          if (Math.abs(fa) < parada && Math.abs(fb) < parada) { ok = true; break; }
          const ga = sub(C, na.q).map((c) => c / na.d), gb = sub(C, nb.q).map((c) => c / nb.d);
          const j11 = ponto(ga, e1), j12 = ponto(ga, e2), j21 = ponto(gb, e1), j22 = ponto(gb, e2);
          const det = j11 * j22 - j12 * j21;
          if (!(Math.abs(det) > 1e-12)) break;
          const x1 = (-fa * j22 + fb * j12) / det, x2 = (-fb * j11 + fa * j21) / det;
          C = C.map((c, j) => c + x1 * e1[j] + x2 * e2[j]);
        }
        if (!ok) {
          if (restrito) {
            const ate = (curva) => { let d = 0; for (let k = 0; k < curva.pts.length - 1; k++) { d += tamanho(sub(curva.pts[k + 1], curva.pts[k])); if (k + 2 < curva.pts.length && ponto(sub(curva.pts[k + 1], curva.pts[k]), sub(curva.pts[k + 2], curva.pts[k + 1])) < Math.cos(Math.PI / 4) * tamanho(sub(curva.pts[k + 1], curva.pts[k])) * tamanho(sub(curva.pts[k + 2], curva.pts[k + 1]))) return d; } return null; };
            const dA = ate(cA), dB = ate(cB), pede = recuo + raio;
            const lado = (d) => (d == null ? 'sem dobra dentro do trecho medido' : `dobra mais de 45° a ${d}`);
            return { erro: `o raio ${raio} não cabe ${onde}: não existe círculo desse raio tangente às duas superfícies; uma ${lado(dA)} e a outra ${lado(dB)} do canto, e o círculo pede ${pede} (recuo mais raio) de cada lado; diminua o raio, declare raioMinimo para ele diminuir onde não cabe, ou restrinja o trecho com regiao:{min,max}` };
          }
          return { erro: `o arredondamento de raio ${raio} não achou o círculo tangente às duas superfícies ${onde}` };
        }
        for (const [curva, perto] of [[cA, na], [cB, nb]]) {
          if (perto.k === curva.pts.length - 2 && perto.t > 1 - 1e-9) return { erro: `o raio ${raio} não cabe ${onde}: a tangência passa do fim da superfície fatiada (${curva.total} percorridos); diminua o raio, declare raioMinimo para ele diminuir só onde não cabe, ou restrinja o trecho com regiao:{min,max}` };
          for (let k = 1; k <= perto.k && k < curva.pts.length - 1; k++) {
            const e0 = sub(curva.pts[k], curva.pts[k - 1]), e1b = sub(curva.pts[k + 1], curva.pts[k]);
            if (ponto(e0, e1b) < Math.cos(Math.PI / 4) * tamanho(e0) * tamanho(e1b)) return { erro: `o raio ${raio} não cabe ${onde}: entre o canto e a tangência a superfície dobra mais de 45°, e a bola teria de passar por uma quina; restrinja o trecho com regiao:{min,max}, ou declare raioMinimo para o raio diminuir onde não cabe` };
          }
        }
        /* Nas classes novas, o círculo tem de ENCOSTAR na superfície, e não
           passar por uma quina dela: se o ponto mais perto é o vértice entre
           dois segmentos que dobram mais de 45° (a parede de um rebaixo mais
           curta que o raio, e o fundo logo depois), o círculo do Newton
           tangencia outra coisa e o arredondamento sairia errado. */
        if (restrito || cA.naFace || cB.naFace) {
          for (const [curva, perto] of [[cA, na], [cB, nb]]) {
            if (!restrito && !curva.naFace) continue;   // fora das classes novas, só a superfície que chega a uma face plana que limita o sólido
            const seg = (k) => sub(curva.pts[k + 1], curva.pts[k]);
            const cos45 = Math.cos(Math.PI / 4);
            const quina = (k) => ponto(seg(k - 1), seg(k)) < cos45 * tamanho(seg(k - 1)) * tamanho(seg(k));
            const noFim = perto.t >= 1 - 1e-9 && perto.k + 1 < curva.pts.length - 1 && quina(perto.k + 1);
            const noComeco = perto.t <= 1e-9 && perto.k > 0 && quina(perto.k);
            if (noFim || noComeco) {
              const k = noFim ? perto.k + 1 : perto.k;
              let dist = 0; for (let q = 0; q < k; q++) dist += tamanho(seg(q));
              return { erro: `o raio ${raio} não cabe ${onde}: a bola encostaria numa quina da superfície (dobra de mais de 45°) a ${dist} do canto, em vez de rolar sobre ela; diminua o raio, declare raioMinimo para ele diminuir onde não cabe, ou restrinja o trecho com regiao:{min,max}` };
            }
          }
        }
        const rA = sub(na.q, C).map((c) => c / raio), rB = sub(nb.q, C).map((c) => c / raio);
        const phi = Math.acos(Math.max(-1, Math.min(1, ponto(rA, rB)))), sp = Math.sin(phi);
        /* cunha: as duas faces se fecham num ângulo tão agudo que o círculo
           tangente nas duas fica longe do canto (recuo r/tan(θ/2)), e o Newton
           acaba num círculo que encosta no próprio canto, com as duas
           tangências no mesmo ponto: o arco sairia sem extensão */
        if (!(sp > 1e-6) || (restrito && (tamanho(sub(na.q, P)) < 0.25 * recuo || tamanho(sub(nb.q, P)) < 0.25 * recuo))) {
          return { erro: `o raio ${raio} não cabe ${onde}: as duas superfícies se fecham em ${(theta * 180 / Math.PI).toFixed(1)}° (uma cunha), e o círculo tangente às duas pediria recuo de ${recuo} do canto; diminua o raio, declare raioMinimo, ou restrinja o trecho com regiao:{min,max}` };
        }
        /* o arco desce MERGULHO na direção do canto: a bola tangente só
           encosta na casca, e a Manifold separa o contato tangente em cantos
           duplicados, com vértice de vínculo não-manifold (o teste de contato
           recusa). Afundado, o arco corta a casca de verdade perto das
           tangências, e a superfície visível muda menos que o mergulho. */
        const mergulho = 1e-3 * raio;   // 1e-3 do raio: medido de 8 a 30 mm no ombro, sem lasca nem vínculo aberto (5e-4 deixava lasca em 25 mm; zero, vínculo aberto em 15 e 20 mm)
        const paraOCanto = sub(P, C).map((c) => c / tamanho(sub(P, C)));
        const Cm = C.map((c, j) => c + paraOCanto[j] * mergulho);
        const arco = [];
        for (let k = 0; k <= paineis; k++) {
          const t = k / paineis, a0 = Math.sin((1 - t) * phi) / sp, a1 = Math.sin(t * phi) / sp;
          const r0 = [0, 1, 2].map((j) => rA[j] * a0 + rB[j] * a1), lr = tamanho(r0);
          arco.push(Cm.map((c, j) => c + raio * r0[j] / lr));
        }
        const atras = sub(P, Cm).map((c) => c / tamanho(sub(P, Cm)));
        const Q = P.map((c, j) => c + atras[j] * raio);
        return { anel: [Q, ...arco], C: C.map((c, j) => c + centroT[j]) };   // anel local, centro no mundo
      };

      const secaoComRaio = (P, u, onde, raio) => {
        ultimaNaFace = false;
        const r = secaoDoRaio(P, u, onde, raio);
        return r.erro ? { ...r, naFace: ultimaNaFace } : r;
      };

      /* onde o raio pedido não cabe (a tangência passa do fim da superfície,
         ou ela dobra mais de 45° antes dela), com `raioMinimo` o raio LOCAL
         cai em passos de 3/4 até o mínimo, e o tubo afina naquele trecho; sem
         ele a recusa é a de sempre. */
      const reducoes = [];   // as estações em que o raio caiu, para o aviso do passo
      const aoLimite = [];   // as estações em que o raio caiu até caber antes da borda de uma face plana que limita o sólido
      const secaoEm = (P, u, onde) => {
        const primeira = secaoComRaio(P, u, onde, raio);
        if (primeira.erro && primeira.naFace) {
          /* o maior raio que cabe antes da borda da face plana: reduz pela metade até caber e refina por bisseção; sem raio que caiba, a estação sai
             (a costura chegou à borda) */
          let bom = null, ruim = raio;
          for (let r = raio / 2; r >= raio * 1e-3; r /= 2) { const sec = secaoComRaio(P, u, onde, r); if (!sec.erro) { bom = { r, sec }; break; } ruim = r; }
          if (!bom) return { pula: true };
          for (let k = 0; k < 14; k++) {
            const meio = (bom.r + ruim) / 2, sec = secaoComRaio(P, u, onde, meio);
            if (sec.erro) ruim = meio; else bom = { r: meio, sec };
          }
          if (bom.r < raio * 0.05) return { pula: true };   // abaixo de 5% do raio o arredondamento já sumiu: a estação sai, e o tubo termina na anterior
          aoLimite.push({ onde, raio: bom.r });
          return bom.sec;
        }
        if (!primeira.erro || raioMinimo == null) return primeira;
        for (let r = raio * 0.75; ; r *= 0.75) {
          const rr = Math.max(r, raioMinimo);
          const sec = secaoComRaio(P, u, onde, rr);
          if (!sec.erro) { reducoes.push({ onde, raio: rr }); return sec; }
          if (rr <= raioMinimo) break;
        }
        return { erro: `${primeira.erro}; nem o raioMinimo ${raioMinimo} coube` };
      };

      /* ESTAÇÕES: além dos vértices da costura, pontos no meio de cada aresta
         dela, a no máximo um raio um do outro. Numa costura de faces planas
         as arestas são longas (o lado inteiro de um bloco), e com seção só nos
         cantos o tubo ficava torto entre eles. */
      const componentes = [];
      const visto = new Set();
      for (const inicio of [...vizinhosDaCostura.keys()].sort((x, y) => x - y)) {
        if (visto.has(inicio)) continue;
        // começa numa ponta, se houver; senão é laço
        let comeco = inicio;
        const [antesI] = sentido.get(inicio) ?? [];
        if (antesI != null) { let c = inicio, a0 = null; for (let k = 0; k < vizinhosDaCostura.size; k++) { const [ant] = sentido.get(c) ?? []; if (ant == null || ant === inicio || visto.has(ant)) break; a0 = c; c = ant; } comeco = c; }
        const lista = [];
        let cur = comeco;
        while (cur != null && !visto.has(cur)) {
          visto.add(cur); lista.push(cur);
          const viz = vizinhosDaCostura.get(cur) ?? [];
          if (viz.length > 2) break;
          const [, depois] = sentido.get(cur) ?? [];
          cur = depois;
        }
        const fechado = lista.length > 2 && (vizinhosDaCostura.get(lista[lista.length - 1]) ?? []).includes(lista[0]) && (vizinhosDaCostura.get(lista[0]) ?? []).length === 2;
        componentes.push({ lista, fechado });
      }
      /* NÓ DE GRAU 4 NO MODO CURVO (o oito que dois tubos tangentes fazem: o elo do punho 5, com os nós nos dois pontos de tangência). O percurso acima parte do
         menor id e volta pelo `sentido`, que num nó de grau 4 escolhe um vizinho qualquer: o tubo saía partido no meio de um laço, com tampa reta nas duas
         pontas (um tubo de 3 estações e 8,3 mm só num quadrante da peça simétrica). Aqui cada nó de grau par é atravessado pelo par de arestas mais reto
         (as duas que formam o maior ângulo entre si), os lacos são percorridos inteiros, e o laço que passa por um nó começa nele, que é onde a costura
         chega à borda da tampa e o tubo termina de qualquer forma. Só vale quando todo nó tem grau 2 ou 4 e nenhum laço repete vértice; senão fica o percurso de cima. */
      if (!restrito && [...vizinhosDaCostura.values()].some((v) => v.length > 2)) {
        const viz = (v) => [...(vizinhosDaCostura.get(v) ?? [])].sort((x, y) => x - y);
        const nos = [...vizinhosDaCostura.keys()].filter((v) => viz(v).length > 2).sort((x, y) => x - y);
        const reto = new Map();   // `${nó}>${de onde chega}` → para onde segue
        let valido = nos.every((v) => viz(v).length === 4) && [...vizinhosDaCostura.keys()].every((v) => viz(v).length === 2 || viz(v).length === 4);
        if (valido) {
          for (const v of nos) {
            const P = pl(v), ds = viz(v).map((w) => { const d = sub(pl(w), P), l = tamanho(d) || 1; return d.map((c) => c / l); });
            const pares = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
            let melhor = null, nota = Infinity;
            for (const par of pares) { const n = par.reduce((t, [a, b]) => t + ponto(ds[a], ds[b]), 0); if (n < nota - 1e-12) { nota = n; melhor = par; } }
            const w = viz(v);
            for (const [a, b] of melhor) { reto.set(`${v}>${w[a]}`, w[b]); reto.set(`${v}>${w[b]}`, w[a]); }
          }
        }
        const lacos = [];
        if (valido) {
          const feita = new Set();
          const chaveA = (p0, p1) => (p0 < p1 ? `${p0}-${p1}` : `${p1}-${p0}`);
          const chaves = [...vizinhosDaCostura.keys()].sort((x, y) => x - y);
          const percorre = (v0, w0) => {
            const lista = [v0];
            let ant = v0, cur = w0;
            feita.add(chaveA(v0, w0));
            while (cur !== v0) {
              lista.push(cur);
              const vz = viz(cur);
              const prox = vz.length === 2 ? vz.find((w) => w !== ant) : reto.get(`${cur}>${ant}`);
              if (prox == null || lista.length > vizinhosDaCostura.size * 2 + 2) return null;
              feita.add(chaveA(cur, prox));
              ant = cur; cur = prox;
            }
            if (viz(v0).length > 2 && reto.get(`${v0}>${ant}`) !== w0) return null;   // voltou ao nó por outro par: o laço o repete
            return lista;
          };
          for (const v of chaves) for (const w of viz(v)) {
            if (feita.has(chaveA(v, w))) continue;
            const lista = percorre(v, w);
            if (!lista || new Set(lista).size !== lista.length) { valido = false; break; }
            lacos.push(lista);
          }
        }
        if (valido && lacos.length) {
          componentes.length = 0;
          for (const l of lacos) {
            const k = l.findIndex((v) => viz(v).length > 2);
            componentes.push({ lista: k > 0 ? [...l.slice(k), ...l.slice(0, k)] : l, fechado: true });
          }
        }
      }
      /* Nas classes novas a costura é um GRAFO de arestas e não uma cadeia
         só: um canto de rebaixo tem três arestas do mesmo tipo. Os trechos
         são os caminhos entre vértices de valência diferente de dois (cada
         aresta em um trecho só) e, sobrando aresta, os lacos puros. */
      if (restrito) {
        componentes.length = 0;
        const usada = new Set();
        const chaveA = (p0, p1) => (p0 < p1 ? `${p0}-${p1}` : `${p1}-${p0}`);
        const vizinhosOrdenados = (v) => [...(vizinhosDaCostura.get(v) ?? [])].sort((x, y) => x - y);
        const anda = (v0, w0) => {
          const lista = [v0, w0];
          usada.add(chaveA(v0, w0));
          let ant = v0, cur = w0;
          while (vizinhosOrdenados(cur).length === 2 && cur !== v0) {
            const prox = vizinhosOrdenados(cur).find((w) => w !== ant);
            if (usada.has(chaveA(cur, prox))) break;
            usada.add(chaveA(cur, prox));
            lista.push(prox); ant = cur; cur = prox;
          }
          return lista;
        };
        const chaves = [...vizinhosDaCostura.keys()].sort((x, y) => x - y);
        for (const v of chaves) {
          if (vizinhosOrdenados(v).length === 2) continue;
          for (const w of vizinhosOrdenados(v)) if (!usada.has(chaveA(v, w))) componentes.push({ lista: anda(v, w), fechado: false });
        }
        for (const v of chaves) {
          for (const w of vizinhosOrdenados(v)) {
            if (usada.has(chaveA(v, w))) continue;
            const lista = anda(v, w);
            const fim = lista.pop();   // o laço volta ao começo: o último vértice repete o primeiro
            componentes.push({ lista: fim === v ? lista : [...lista, fim], fechado: fim === v });
          }
        }
      }
      const cadeias = [];
      const porPar = new Map(concavas.map((c) => [`${c.x}-${c.y}`, c]));
      const registroDaAresta = (v, w) => porPar.get(v < w ? `${v}-${w}` : `${w}-${v}`);
      /* QUINA e PONTA (só nas classes novas). Onde a costura dobra mais de 20°
         num vértice, ou termina (a borda de um bloco, a junção com três
         arestas), a fatia perpendicular à média das arestas cortaria o tubo em
         viés e o arco sairia com raio menor que o declarado. Ali a cadeia se
         parte: cada trecho termina com o anel da última estação da aresta
         DESLIZADO ao longo dela até o plano de corte do vértice (a meia-
         esquadria do modo plano, ou o corte reto na ponta). Os dois trechos de
         uma quina compartilham o plano, e no canto plano os dois anéis são o
         mesmo. */
      const deslizar = (sec, dir, plano) => {
        const den = ponto(plano.m, dir);
        if (!(Math.abs(den) > 1e-9)) return null;
        const desloca = (q) => { const t = -ponto(plano.m, sub(q, plano.X)) / den; return q.map((c, j) => c + dir[j] * t); };
        return { anel: sec.anel.map(desloca), C: sec.C };
      };
      const planoDoCorte = (rec, v) => {
        const { m, X } = corte(rec, v);
        return { m, X: pl(v), mundo: X };
      };
      for (const comp of componentes) {
        let { lista, fechado } = comp;
        const n0 = lista.length;
        const posL = lista.map((v) => pl(v));
        const dobraEm = (k) => {
          const antes = k > 0 ? posL[k - 1] : fechado ? posL[n0 - 1] : null;
          const depois = k < n0 - 1 ? posL[k + 1] : fechado ? posL[0] : null;
          if (!antes || !depois) return null;
          const a1 = sub(posL[k], antes), a2 = sub(depois, posL[k]);
          return Math.acos(Math.max(-1, Math.min(1, ponto(a1, a2) / (tamanho(a1) * tamanho(a2))))) * 180 / Math.PI;
        };
        // tipo de cada vértice do percurso: 'liso' (estação de fatia), 'quina' ou 'ponta' (fim de trecho)
        let seq = lista.map((v, k) => ({ v, tipo: restrito ? (dobraEm(k) == null ? 'ponta' : dobraEm(k) > 20 ? 'quina' : 'liso') : 'liso', k }));
        let aberto = !fechado;
        if (restrito && fechado && seq.some((q) => q.tipo === 'quina')) {
          // laço com quina: começa numa quina e volta a ela no fim, e o percurso vira aberto
          const k0 = seq.findIndex((q) => q.tipo === 'quina');
          seq = [...seq.slice(k0), ...seq.slice(0, k0), seq[k0]];
          aberto = true;
        }
        const nSeq = seq.length, arestas = aberto ? nSeq - 1 : nSeq;
        const posDe = (q) => pl(q.v);
        const estacoes = [];
        for (let k = 0; k < nSeq; k++) {
          const q = seq[k], v = q.v, P = posDe(q);
          const ant = k > 0 ? seq[k - 1] : !aberto ? seq[nSeq - 1] : null, dep = k < nSeq - 1 ? seq[k + 1] : !aberto ? seq[0] : null;
          const antes = ant ? posDe(ant) : null, depois = dep ? posDe(dep) : null;
          const mundoV = st.V.get(v);
          if (q.tipo !== 'liso') {
            const chegada = ant ? { dir: sub(P, antes).map((c, j, w) => c / tamanho(w)), rec: registroDaAresta(ant.v, v) } : null;
            const saida = dep ? { dir: sub(depois, P).map((c, j, w) => c / tamanho(w)), rec: registroDaAresta(v, dep.v) } : null;
            estacoes.push({ fim: true, v, mundo: mundoV, chegada, saida, P });
          } else {
            let u = [0, 0, 0];
            if (antes) { const a1 = sub(P, antes); u = u.map((c, j) => c + a1[j] / tamanho(a1)); }
            if (depois) { const a2 = sub(depois, P); u = u.map((c, j) => c + a2[j] / tamanho(a2)); }
            estacoes.push({ P, u, mundo: mundoV, onde: `no vértice ${v} da costura, em ${JSON.stringify(mundoV)}` });
          }
          if (k < arestas) {
            const Q2 = depois, L = tamanho(sub(Q2, P));
            const nasPontas = q.tipo !== 'liso' || dep.tipo !== 'liso';
            const partes = Math.min(64, Math.max(nasPontas ? 2 : 1, Math.ceil(L / raio)));
            const dir = sub(Q2, P).map((c) => c / L);
            for (let j = 1; j < partes; j++) {
              const t = j / partes, Pj = P.map((c, w) => c + (Q2[w] - c) * t);
              estacoes.push({ P: Pj, u: dir, mundo: Pj.map((c, w) => c + centroT[w]), onde: `no meio da aresta ${v}-${dep.v} da costura` });
            }
          }
        }
        /* PONTA AFINADA (`afinarPontas`): a ponta solta de um trecho (o fim da
           regiao) fechava com o anel de raio pleno e uma tampa reta, que
           aparecia como um dente na sombra. Com o comprimento declarado, as
           estações a menos dele dessa ponta refazem a seção com o raio caindo em
           linha até 15% do pedido, e o tubo some aos poucos. Não afinam a ponta
           em que o encontro fica plano (ali o tubo já some sozinho) nem a que
           continua em outro trecho (a quina). */
        const afinarAsPontas = (lista, inicioSolto, fimSolto) => {
          const pos = lista.map((s) => s.estacao?.P ?? null);
          const dist = [0];
          for (let k = 1; k < lista.length; k++) dist.push(dist[k - 1] + (pos[k] && pos[k - 1] ? tamanho(sub(pos[k], pos[k - 1])) : 0));
          const total = dist[dist.length - 1];
          for (let k = 0; k < lista.length; k++) {
            const e = lista[k].estacao;
            if (!e) continue;
            let fator = 1;
            if (inicioSolto) fator = Math.min(fator, Math.max(0.15, dist[k] / afinarPontas));
            if (fimSolto) fator = Math.min(fator, Math.max(0.15, (total - dist[k]) / afinarPontas));
            if (!(fator < 1)) continue;
            const sec = secaoComRaio(e.P, e.u.map((c) => c / tamanho(e.u)), e.onde, raio * fator);
            if (sec.anel) lista[k] = { ...sec, estacao: e };
          }
        };
        let atual = [], pendente = null, deV = null, ateV = null;
        const criadas = [];
        let inicioNaRegiao = false, antesForaDaRegiao = false;
        /* TUBO APARADO (`aparar`): fora da regiao a seção não é medida (ali a
           fatia encosta numa face que corta o canto, e o círculo sairia
           errado); o anel da última estação medida é LEVADO ao longo da
           costura, girado com a direção dela, até o fim, e o tubo inteiro é
           depois intersectado com a caixa de aparar. Assim o arredondamento
           chega à face que corta o canto e fica rente a ela, em vez de parar
           antes. */
        const levar = (sec, para) => {
          const de = sec.estacao, u0 = de.u.map((c) => c / tamanho(de.u)), u1 = para.u.map((c) => c / tamanho(para.u));
          const eixo = cruz(u0, u1), s = tamanho(eixo), c = ponto(u0, u1);
          const girar = (v) => {
            if (!(s > 1e-12)) return v;
            const k = eixo.map((w) => w / s), kv = cruz(k, v), kk = ponto(k, v);
            return v.map((w, j) => w * c + kv[j] * s + k[j] * kk * (1 - c));
          };
          const anel = sec.anel.map((q) => { const d = girar(sub(q, de.P)); return para.P.map((w, j) => w + d[j]); });
          const Cl = sub(sec.C, centroT), dC = girar(sub(Cl, de.P));
          return { anel, C: para.P.map((w, j) => w + dC[j] + centroT[j]), estacao: para, levado: true };
        };
        let antesDaPrimeira = [];
        const fecharCadeia = (laco, fimNaRegiao = false) => {
          if (afinarPontas != null && !laco && atual.length >= 2) afinarAsPontas(atual, inicioNaRegiao && deV == null, fimNaRegiao && ateV == null);
          if (atual.length >= 2) { const c = { aneis: atual.map((e) => e.anel), centros: atual.map((e) => e.C), fechada: laco, sinal, deV, ateV }; cadeias.push(c); criadas.push(c); }
          atual = []; deV = null; ateV = null;
        };
        let todas = true;
        const semCorte = (v, mundo) => ({ erro: `o corte do vértice ${v} da costura, em ${JSON.stringify(mundo)}, não é transversal à aresta; use regiao:{min,max} para deixar esse trecho de fora` });
        for (const e of estacoes) {
          if (e.fim) {
            const dentro = !regiao || e.mundo.every((c, k) => c >= regiao.min[k] && c <= regiao.max[k]);
            /* o anel do fim do trecho que chega é o anel DE PARTIDA do trecho que
               sai (o mesmo objeto): as duas tampas da quina coincidem bit a
               bit, e a Manifold funde a face comum sem deixar lasca */
            let anelDaQuina = null;
            if (atual.length && e.chegada && e.chegada.rec && dentro) {
              const desl = deslizar(atual[atual.length - 1], e.chegada.dir, planoDoCorte(e.chegada.rec, e.v));
              if (!desl) return semCorte(e.v, e.mundo);
              atual.push(desl);
              anelDaQuina = desl;
              ateV = e.v;
            }
            todas = false; fecharCadeia(false);
            pendente = dentro && e.saida && e.saida.rec ? { dir: e.saida.dir, plano: planoDoCorte(e.saida.rec, e.v), v: e.v, mundo: e.mundo, anel: anelDaQuina } : null;
            continue;
          }
          if (regiao && !e.mundo.every((c, k) => c >= regiao.min[k] && c <= regiao.max[k])) {   // a caixa é do mundo
            if (aparar && tamanho(e.u) > 0) {
              const base = [...atual].reverse().find((s) => s.estacao && !s.levado);
              if (base) { atual.push(levar(base, e)); continue; }
              if (!atual.length) { antesDaPrimeira.push(e); continue; }
            }
            todas = false; pendente = null; fecharCadeia(false, true); antesForaDaRegiao = true; continue;
          }
          if (!(tamanho(e.u) > 0)) { todas = false; pendente = null; fecharCadeia(false); continue; }
          const sec = secaoEm(e.P, e.u.map((c) => c / tamanho(e.u)), e.onde);
          if (sec.erro) return sec;
          if (sec.pula) { todas = false; pendente = null; fecharCadeia(false); antesForaDaRegiao = false; antesDaPrimeira = []; continue; }
          if (pendente && !atual.length) {
            const desl = pendente.anel ?? deslizar(sec, pendente.dir, pendente.plano);
            if (!desl) return semCorte(pendente.v, pendente.mundo);
            atual.push(desl);
            deV = pendente.v;
          }
          pendente = null;
          if (!atual.length) inicioNaRegiao = antesForaDaRegiao;
          antesForaDaRegiao = false;
          const medida = { ...sec, estacao: e };
          if (!atual.length && antesDaPrimeira.length) for (const f of antesDaPrimeira) atual.push(levar(medida, f));
          antesDaPrimeira = [];
          atual.push(medida);
        }
        fecharCadeia(fechado && todas);
        /* laço com quina que recomeça na mesma quina em que termina: o
           primeiro trecho parte do anel em que o último chega */
        if (restrito && fechado && aberto && criadas.length >= 2) {
          const primeira = criadas[0], ultima = criadas[criadas.length - 1];
          if (primeira.deV != null && primeira.deV === ultima.ateV) primeira.aneis[0] = ultima.aneis[ultima.aneis.length - 1];
        }
      }
      if (!cadeias.length) return { vazio: `a costura de ${de.op}:${de.id} não tem aresta ${classes.map((c) => (c === 'concavas' ? 'côncava' : c === 'convexas' ? 'convexa' : 'interna')).join(' nem ')} a arredondar dentro da regiao pedida ou com o raio pedido; confira arestas, regiao e raio` };
      return { cadeias, centro: centroT, grade: gradeT, reducoes, aoLimite };
    };

    /* O RAIO PRECISA CABER: nas duas tampas de cada prisma (já cortadas em
       meia-esquadria), as duas tangências têm de cair sobre uma face do sólido
       no mesmo plano da face que tangenciam. Senão o prisma sairia da face (o
       braço de 0,3 numa coluna de 0,4 deixa 0,05 de face de cada lado, e um
       raio de 0,1 passaria disso). A primeira versão conferia a tangência
       PERPENDICULAR à aresta, antes do corte: num braço inclinado o canto não
       é reto, esse ponto cai fora da face vizinha e qualquer raio, até 0,001,
       era recusado. */
    const foraDaFace = (q, fRef) => {
      const nRef = normalDaFace(st.V, st.F.get(fRef).vs), dRef = ponto(nRef, st.V.get(st.F.get(fRef).vs[0]));
      const escala = Math.max(1, tamanho(q));
      if (Math.abs(ponto(nRef, q) - dRef) > 1e-7 * escala) return Infinity;
      let melhor = Infinity;
      for (const fid of faces) {
        const vs = st.F.get(fid).vs, n = normalDaFace(st.V, vs);
        if (ponto(n, nRef) < 1 - 1e-9 || Math.abs(ponto(n, st.V.get(vs[0])) - dRef) > 1e-7 * escala) continue;
        let fora = 0;
        for (let k = 0; k < vs.length; k++) {
          const p0 = st.V.get(vs[k]), p1 = st.V.get(vs[(k + 1) % vs.length]);
          const e = sub(p1, p0), l = tamanho(e);
          fora = Math.max(fora, -ponto(cruz(e, sub(q, p0)), n) / l);
        }
        melhor = Math.min(melhor, Math.max(0, fora));
      }
      return melhor;
    };
    /* A costura é PLANA quando toda tangência cai numa face do mesmo plano da
       face que ela tangencia: é o caso de blocos, e aí valem os prismas em
       meia-esquadria, exatos. Quando alguma tangência sai da face mas para uma
       faceta VIZINHA que não é coplanar (superfície curva facetada, como a
       coluna de superelipse do ombro), a costura é CURVA e o arredondamento é
       feito por fatias (`tuboCurvo`, abaixo). Quando a tangência sai para uma
       face coplanar ausente, isto é, passa da borda de uma face plana, o raio
       não cabe. */
    let modo = 'plano', recusa = null;
    for (const c of concavas) {
      const [fA, fB] = facesDaAresta.get(`${c.x}-${c.y}`);
      const recuo = raio / Math.tan(c.theta / 2);
      for (const v of [c.x, c.y]) {
        const tampa = ponta(c, v);
        const folga = 1e-9 * Math.max(1, tamanho(st.V.get(v)));
        for (const [q, f] of [[tampa[1], fA], [tampa[tampa.length - 1], fB]]) {
          const fora = foraDaFace(q, f);
          if (fora <= folga) continue;
          if (vizinhaCurva(f)) modo = 'curvo';
          else recusa ??= `o raio ${raio} não cabe na aresta ${c.x}-${c.y} da costura, na ponta ${v} em ${JSON.stringify(st.V.get(v))}: a tangência, a ${recuo} do canto, sai ${fora} da face vizinha; diminua o raio ou afaste a costura da borda da face`;
        }
      }
    }
    /* nas classes novas, onde o modo plano recusa (a tangência sai da face) ou
       não aceita a regiao, o modo por fatias é a saída, e ele diz por que não
       coube, se não couber */
    const recusaDoPlano = recusa;
    if (restrito && modo === 'plano' && (recusa || regiao)) modo = 'curvo';
    if (modo === 'plano' && recusa) return grita(st, i, op, 'raio', recusa);
    if (modo === 'plano' && regiao) return grita(st, i, op, 'regiao', 'regiao só vale na costura curva; na costura plana o arredondamento é por aresta inteira');
    /* o modo curvo por classe de sinal: as arestas que enchem (côncavas e
       internas) numa cadeia de tubos, as que tiram (convexas) noutra */
    const construirCurvo = () => {
      const partes = [];
      for (const sinal of [1, -1]) {
        const lista = concavas.filter((c) => c.sinal === sinal).map((c) => [c.x, c.y]);
        if (!lista.length) continue;
        const r = tuboCurvo(lista, sinal);
        if (r.erro) return r;
        partes.push(r);
      }
      const cheias = partes.filter((p) => !p.vazio);
      if (!cheias.length) return { erro: partes[0].vazio };
      return { cadeias: cheias.flatMap((p) => p.cadeias), centro: cheias[0].centro, grade: cheias[0].grade, reducoes: cheias.flatMap((p) => p.reducoes), aoLimite: cheias.flatMap((p) => p.aoLimite ?? []) };
    };
    let curvo = null;
    if (modo === 'curvo') {
      curvo = construirCurvo();
      if (curvo.erro) return grita(st, i, op, 'raio', `${curvo.erro}${recusaDoPlano ? `; no modo plano: ${recusaDoPlano}` : ''}`);
    }
    const herdaDe = registro.costura.find((f) => st.F.has(f)) ?? faces[0];

    const calcular = (M, manifolds, local) => {
      const S = manifolds[0];
      const prismas = [];
      const fechar = (props, tri, nome, fids = null) => {
        let solido = null;
        const idReservado = fids ? M.reserveIDs(1) : null;
        const opcoes = () => (fids
          ? { numProp: 4, vertProperties: props, triVerts: Uint32Array.from(tri), faceID: Uint32Array.from(fids), runIndex: Uint32Array.from([0, tri.length]), runOriginalID: Uint32Array.from([idReservado]) }
          : { numProp: 3, vertProperties: props, triVerts: Uint32Array.from(tri) });
        try { solido = new M(new wasm.Mesh(opcoes())); } catch (e) { return { erro: `${nome} não fechou: ${e?.message ?? e}` }; }
        if (solido.status() !== 'NoError' || solido.volume() < 0) {
          solido.delete();
          for (let k = 0; k < tri.length; k += 3) [tri[k + 1], tri[k + 2]] = [tri[k + 2], tri[k + 1]];
          try { solido = new M(new wasm.Mesh(opcoes())); } catch (e) { return { erro: `${nome} não fechou: ${e?.message ?? e}` }; }
        }
        return { solido, idReservado };
      };
      /* Cada faixa do tubo (o quadrilátero entre dois anéis) entra com um
         `faceID` próprio, e cada tubo com um id reservado. Sem isso a
         Manifold agrupava por coplanaridade, e como a faixa entre dois anéis
         é torcida, cada triângulo virava uma face: o ombro de 48 lados saía
         com 1149 pedaços. Com o agrupamento, 978 (medido na rodada do ombro). */
      const idsAux = new Set();
      let faixa = 0;
      const enchem = [], tiram = [];   // sólidos auxiliares: os que se unem à peça e os que se subtraem dela
      const apaga = () => { for (const p of [...enchem, ...tiram]) p.delete(); };
      if (curvo) for (const [n, cad] of curvo.cadeias.entries()) {
        const m = cad.aneis[0].length, N = cad.aneis.length;
        const props = new Float32Array(N * m * 4);
        cad.aneis.forEach((anel, r) => anel.forEach((q, k) => props.set([q[0], q[1], q[2], -1], 4 * (r * m + k))));
        const tri = [], fids = [];
        const ultimo = cad.fechada ? N : N - 1;
        for (let r = 0; r < ultimo; r++) {
          const r2 = (r + 1) % N;
          for (let k = 0; k < m; k++) { const k2 = (k + 1) % m; tri.push(r * m + k, r * m + k2, r2 * m + k2, r * m + k, r2 * m + k2, r2 * m + k); fids.push(faixa, faixa); faixa++; }
        }
        if (!cad.fechada) {
          for (let k = 1; k < m - 1; k++) { tri.push(0, k + 1, k); fids.push(faixa); } faixa++;
          for (let k = 1; k < m - 1; k++) { tri.push((N - 1) * m, (N - 1) * m + k, (N - 1) * m + k + 1); fids.push(faixa); } faixa++;
        }
        const r = fechar(props, tri, `o tubo ${n} do arredondamento`, fids);
        if (r.erro) { apaga(); return r; }
        idsAux.add(r.idReservado);
        if (aparar) {
          /* a caixa (ou o molde) entra como sólido auxiliar: as faces do corte
             nascem com o id dele, que é do arredondamento */
          let marcada;
          if (aparar.molde) marcada = manifolds[1].asOriginal();
          else {
            const lo = local(aparar.min), hi = local(aparar.max);
            const cubo = M.cube(hi.map((c, j) => c - lo[j]), false);
            const caixa = cubo.translate(lo);
            cubo.delete();
            marcada = caixa.asOriginal();
            caixa.delete();
          }
          idsAux.add(marcada.originalID());
          const aparado = M.intersection([r.solido, marcada]);
          r.solido.delete(); marcada.delete();
          if (aparado.isEmpty()) { aparado.delete(); continue; }
          (cad.sinal > 0 ? enchem : tiram).push(aparado);
          continue;
        }
        (cad.sinal > 0 ? enchem : tiram).push(r.solido);
      }
      if (!curvo) for (const c of concavas) {
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
          catch (e) { apaga(); return { erro: `o prisma da aresta ${c.x}-${c.y} não fechou: ${e?.message ?? e}` }; }
        }
        (c.sinal > 0 ? enchem : tiram).push(prisma);
      }
      /* Os prismas do plano (união deles, marcada como sólido auxiliar: as
         faces dele nascem todas com id novo) e os tubos do modo curvo (já
         marcados, um id reservado cada) entram do mesmo jeito: primeiro o que
         enche, depois o que tira. A Manifold devolve as faces do sólido
         subtraído com a mesma marca de origem. */
      const marcar = (lista) => {
        if (curvo) return lista;
        const juntos = M.union(lista);
        for (const p of lista) p.delete();
        const marcado = juntos.setProperties(4, (novo, pos) => { novo[0] = pos[0]; novo[1] = pos[1]; novo[2] = pos[2]; novo[3] = -1; });
        juntos.delete();
        const auxiliar = marcado.asOriginal();
        marcado.delete();
        idsAux.add(auxiliar.originalID());
        return [auxiliar];
      };
      const encher = enchem.length ? marcar(enchem) : [], tirar = tiram.length ? marcar(tiram) : [];
      let resultado = M.union([S, ...encher]);
      for (const p of encher) p.delete();
      if (tirar.length) {
        const menos = M.difference([resultado, ...tirar]);
        resultado.delete();
        for (const p of tirar) p.delete();
        resultado = menos;
      }
      return { resultado, auxID: idsAux };
    };
    const antes = st.orfaos.length;
    /* O arredondamento continua sendo o MESMO sólido da origem que ele
       arredonda: os pedaços a mais das faces que ele cortou entram na origem
       `de`, e as faces que ele cobriu inteiras saem dela. Assim `{op:'unir',
       id}` depois do arredondamento é a casca inteira menos a concordância
       (que é a origem do arredondamento), e uma `parte` ou um `liso` sobre a
       união não deixam pedaço sem nome nem gritam pela face coberta. */
    const aoAplicar = ({ pedacosDeEntrada, consumidas }) => {
      const fora = new Set(consumidas);
      registro.faces = [...registro.faces.filter((f) => !fora.has(f)), ...pedacosDeEntrada].sort((x, y) => x - y);
      registro.costura = registro.costura.filter((f) => !fora.has(f));
    };
    const rodar = (tentativa) => nucleoBooleano(st, i, op, wasm, a.origemId, facesDoMolde ? [faces, facesDoMolde] : [faces], { calcular, herdaDe, liso: 45, ref: 'de', aoAplicar, estrito: restrito, centro: curvo?.centro, grade: curvo?.grade, tentativa, registroExtra: curvo ? { eixos: curvo.cadeias.map((c) => c.centros) } : {} });
    /* Os prismas em meia-esquadria são exatos no canto reto, mas no canto
       torto as tampas vizinhas não coincidem e podem deixar a casca aberta
       (o braço inclinado a 20° com raio 0,01). O portão de casca fechada
       devolve a falha em vez de gritar, e o arredondamento refaz a costura
       inteira pelo modo curvo, por fatias, que acompanha qualquer canto. */
    const r1 = rodar(!curvo);
    if (r1?.falhouCasca) {
      curvo = construirCurvo();
      if (curvo.erro) return grita(st, i, op, 'raio', curvo.erro);
      rodar(false);
    }
    if (st.orfaos.length === antes) {
      registro.arredondadaEm = i;
      /* o raio reduzido por `raioMinimo` é DECLARADO: o passo entrega o que
         coube, e o aviso diz quanto (fora da forma canônica, em `neutro.avisos`) */
      if (!curvo && raioMinimo != null) {
        st.avisos.push({ passo: i, op, ref: 'raioMinimo', raioPedido: raio, raioMinimo, raioMenor: raio, estacoes: 0,
          motivo: `raioMinimo não teve efeito: a costura é plana, cada aresta cabe no raio pedido ${raio} e todas saíram com ele` });
      }
      if (curvo?.aoLimite?.length) {
        const menor = Math.min(...curvo.aoLimite.map((q) => q.raio));
        st.avisos.push({ passo: i, op, ref: 'faceLimite', raioPedido: raio, raioMenor: menor, estacoes: curvo.aoLimite.length,
          motivo: `o raio ${raio} passaria da borda de uma face plana que limita o sólido em ${curvo.aoLimite.length} estação(ões) da costura; o raio caiu até o maior que cabe antes da borda (no mínimo ${menor}) e o arredondamento afina até sumir nela` });
      }
      if (curvo?.reducoes?.length) {
        const menor = Math.min(...curvo.reducoes.map((q) => q.raio));
        st.avisos.push({ passo: i, op, ref: 'raioMinimo', raioPedido: raio, raioMinimo, raioMenor: menor, estacoes: curvo.reducoes.length,
          motivo: `o raio ${raio} não coube em ${curvo.reducoes.length} estação(ões) da costura e foi reduzido, no mínimo a ${menor} (raioMinimo ${raioMinimo}); o resto da costura saiu com o raio pedido` });
      }
    }
  }

  /* aparar — o sólido que fica por dentro de uma ou mais chapas subdivididas, a `folga` da pele de dentro delas. O molde de cada chapa
     (`molde-de-dentro.js`) é o volume aquém da pele deslocada, fechado por paredes e uma tampa plana no plano de `fecha` (e por uma tampa plana em
     cada vão); com mais de uma chapa o molde é a união dos volumes, e a borda que passa do plano é cortada por um semiespaço, os dois na Manifold.
     O molde entra no estado com ids da faixa estendida do passo, longe dos que a booleana dá aos pedaços novos, e a interseção do sólido com ele
     é a do `intersectar`, com a mesma lei de identidade: as faces do molde que sobram na peça são as de dentro dela, e as que ficam fora do sólido
     somem. A chapa é lida do que a `subdivisao` guardou (`st.chapas[].pele`), e não das faces vivas, porque uma booleana já pode tê-la cortado
     (as portas, os vãos). */
  const DESLOCAMENTO_DO_MOLDE = BLOCO + (FAIXA_ESTENDIDA >> 1);
  function aparar(st, a, i) {
    const wasm = abertura(st, a, i, 'aparar');
    if (!wasm) return;
    if (a.solido == null) return grita(st, i, 'aparar', 'solido', 'aparar exige solido: a seleção do sólido fechado a aparar');
    const chapas = Array.isArray(a.chapa) ? a.chapa : [a.chapa];
    if (!chapas.length || chapas.some((c) => !c || typeof c !== 'object' || c.op !== 'subdivisao' || !Number.isSafeInteger(c.id) || Object.keys(c).some((k) => k !== 'op' && k !== 'id'))) return grita(st, i, 'aparar', 'chapa', "chapa precisa ser a origem de uma subdivisão, { op: 'subdivisao', id }, ou uma lista delas");
    const folga = st.num(a.folga);
    if (!Number.isFinite(folga) || folga < 0) return grita(st, i, 'aparar', 'folga', `folga precisa ser um número maior ou igual a zero, na unidade da peça, e veio ${JSON.stringify(a.folga)}`);
    const planos = Array.isArray(a.fecha) ? a.fecha : [a.fecha];
    /* limpar: as faces de área nula que o corte deixa na costura com a pele nova saem pelo `limparLascas`, dentro do passo; true (o padrão) usa a tolerância de 6e-6 da
       diagonal do sólido, um número a dele, e false não limpa */
    if (a.limpar != null && typeof a.limpar !== 'boolean' && !(Number.isFinite(st.num(a.limpar)) && st.num(a.limpar) > 0)) return grita(st, i, 'aparar', 'limpar', `limpar é true, false ou a tolerância, um número maior que zero na unidade da peça, e veio ${JSON.stringify(a.limpar)}`);
    const fechas = planos.map((f) => (f && typeof f === 'object' && !Array.isArray(f) ? { eixo: f.eixo, em: st.num(f.em), extra: Object.keys(f).some((k) => k !== 'eixo' && k !== 'em') } : null));
    if (fechas.length !== chapas.length || fechas.some((f) => !f || f.extra || !['x', 'y', 'z'].includes(f.eixo) || !Number.isFinite(f.em))) return grita(st, i, 'aparar', 'fecha', `fecha precisa ser { eixo: 'x' | 'y' | 'z', em: número }, o plano da tampa que fecha a abertura da chapa, um por chapa (${chapas.length} chapa(s), ${planos.length} plano(s))`);
    const guardadas = chapas.map((c) => (st.chapas ?? []).find((g) => g.origemId === c.id));
    const faltando = chapas.findIndex((_, k) => !guardadas[k]);
    if (faltando >= 0) return grita(st, i, 'aparar', 'chapa', `a origem subdivisao:${chapas[faltando].id} não existe antes deste passo; aparar usa a superfície que a subdivisão guardou`);
    const antes = st.orfaos.length;
    const r = resolverSelecao(st, a.solido, 'aparar', i);
    if (st.orfaos.length > antes) return;
    const faces = [...r.faces].sort((x, y) => x - y);
    if (!faces.length) return grita(st, i, 'aparar', 'solido', 'a seleção do sólido não tem face nenhuma');
    const moldes = [];
    for (let k = 0; k < chapas.length; k += 1) {
      try { moldes.push(moldeDeDentro({ vertices: guardadas[k].pele.vertices, faces: guardadas[k].pele.faces, espessura: guardadas[k].espessura ?? 0, lado: guardadas[k].lado, folga, fecha: { eixo: fechas[k].eixo, em: fechas[k].em } })); } catch (e) {
        if (e instanceof ErroDoMolde) return grita(st, i, 'aparar', 'chapa', `${chapas.length > 1 ? `chapa subdivisao:${chapas[k].id}: ` : ''}${e.message.replace(/^aparar: /, '')}`);
        throw e;
      }
    }
    let molde = moldes[0];
    if (moldes.length > 1 || molde.corte) {
      const unido = unirMoldes(wasm, moldes);
      if (unido.erro) return grita(st, i, 'aparar', 'chapa', unido.erro);
      molde = unido;
    }
    if (molde.vertices.length >= FAIXA_ESTENDIDA >> 1 || molde.triangulos.length >= FAIXA_ESTENDIDA >> 1) return grita(st, i, 'aparar', 'chapa', `o molde tem ${molde.vertices.length} vértices e ${molde.triangulos.length} faces, acima do que o passo comporta (${FAIXA_ESTENDIDA >> 1})`);
    const idsV = molde.vertices.map((_, k) => idDoPasso(i, DESLOCAMENTO_DO_MOLDE + k));
    const idsF = molde.triangulos.map((_, k) => idDoPasso(i, DESLOCAMENTO_DO_MOLDE + k));
    molde.vertices.forEach((p, k) => addV(st, idsV[k], p));
    molde.triangulos.forEach((t, k) => addF(st, idsF[k], t.map((v) => idsV[v])));
    const usadas = (st.facesDeOperando ??= new Set());
    for (const f of faces) usadas.add(f);
    const caixaDoSolido = [Infinity, Infinity, Infinity, -Infinity, -Infinity, -Infinity];
    for (const f of faces) for (const v of st.F.get(f).vs) { const p = st.V.get(v); for (let k = 0; k < 3; k += 1) { caixaDoSolido[k] = Math.min(caixaDoSolido[k], p[k]); caixaDoSolido[k + 3] = Math.max(caixaDoSolido[k + 3], p[k]); } }
    const diagonalDoSolido = Math.hypot(caixaDoSolido[3] - caixaDoSolido[0], caixaDoSolido[4] - caixaDoSolido[1], caixaDoSolido[5] - caixaDoSolido[2]);
    nucleoBooleano(st, i, 'aparar', wasm, a.origemId, [faces, idsF], null);
    /* o passo que gritou não deixa o molde no estado */
    if (st.orfaos.length > antes) {
      for (const f of idsF) st.F.delete(f);
      const usados = new Set();
      for (const f of st.F.values()) for (const v of f.vs) usados.add(v);
      for (const v of idsV) if (!usados.has(v)) st.V.delete(v);
      return;
    }
    if (a.limpar !== false) {
      const tolerancia = typeof a.limpar === 'boolean' || a.limpar == null ? 6e-6 * diagonalDoSolido : st.num(a.limpar);
      const feitas = resolverSelecao(st, { origem: { op: 'aparar', id: a.origemId } }, 'aparar', i);
      if (st.orfaos.length === antes && feitas.faces.size) limparNoEstado(st, feitas.faces, { tolerancia, areaMinima: areaMinimaDe(st, feitas.faces), i, op: 'aparar' });
    }
  }

  /* os moldes numa Manifold só: cada um recortado pelo semiespaço de `corte`, se tem, e depois a união; devolve { vertices, triangulos } ou { erro } */
  function unirMoldes(wasm, moldes) {
    const M = wasm.Manifold;
    const todos = moldes.flatMap((m) => m.vertices);
    const lo = [0, 1, 2].map((c) => Math.min(...todos.map((p) => p[c]))); const hi = [0, 1, 2].map((c) => Math.max(...todos.map((p) => p[c])));
    const centro = [0, 1, 2].map((c) => (lo[c] + hi[c]) / 2);
    const aberto = [];
    const liberar = () => { for (const m of aberto) m.delete(); };
    const solido = (vertices, triangulos, nome) => {
      const props = new Float32Array(vertices.length * 3);
      vertices.forEach((p, k) => props.set([p[0] - centro[0], p[1] - centro[1], p[2] - centro[2]], 3 * k));
      let m;
      try { m = new M(new wasm.Mesh({ numProp: 3, vertProperties: props, triVerts: Uint32Array.from(triangulos.flat()) })); } catch (e) { return { erro: `a Manifold recusou ${nome}: ${e?.message ?? e}` }; }
      aberto.push(m);
      if (m.status() !== 'NoError') return { erro: `a Manifold recusou ${nome}: ${m.status()}` };
      return { m };
    };
    const partes = [];
    for (const [k, molde] of moldes.entries()) {
      const nome = `o molde da chapa ${k + 1}`;
      const r = solido(molde.vertices, molde.triangulos, nome);
      if (r.erro) { liberar(); return r; }
      let parte = r.m;
      if (molde.corte) {
        const e = { x: 0, y: 1, z: 2 }[molde.corte.eixo];
        const lo2 = molde.vertices.reduce((m, p) => m.map((c, q) => Math.min(c, p[q])), [Infinity, Infinity, Infinity]); const hi2 = molde.vertices.reduce((m, p) => m.map((c, q) => Math.max(c, p[q])), [-Infinity, -Infinity, -Infinity]);
        const margem = Math.max(...[0, 1, 2].map((c) => hi2[c] - lo2[c])) + 1;
        const min = lo2.map((c) => c - margem); const max = hi2.map((c) => c + margem);
        if (molde.corte.sentido > 0) min[e] = molde.corte.em; else max[e] = molde.corte.em;
        const [x0, y0, z0] = min; const [x1, y1, z1] = max;
        const caixa = solido([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
          [[0, 1, 5], [0, 5, 4], [3, 7, 6], [3, 6, 2], [0, 3, 2], [0, 2, 1], [4, 5, 6], [4, 6, 7], [0, 4, 7], [0, 7, 3], [1, 2, 6], [1, 6, 5]], `o semiespaço do plano da chapa ${k + 1}`);
        if (caixa.erro) { liberar(); return caixa; }
        parte = M.intersection([r.m, caixa.m]); aberto.push(parte);
      }
      partes.push(parte);
    }
    const unido = partes.length > 1 ? M.union(partes) : partes[0];
    if (unido !== partes[0]) aberto.push(unido);
    if (unido.isEmpty()) { liberar(); return { erro: 'o molde saiu vazio: a pele deslocada e o plano da tampa não deixam volume' }; }
    const malha = unido.getMesh();
    const vertices = []; for (let k = 0; k < malha.vertProperties.length; k += malha.numProp) vertices.push([malha.vertProperties[k] + centro[0], malha.vertProperties[k + 1] + centro[1], malha.vertProperties[k + 2] + centro[2]]);
    const triangulos = []; for (let k = 0; k < malha.triVerts.length; k += 3) triangulos.push([malha.triVerts[k], malha.triVerts[k + 1], malha.triVerts[k + 2]]);
    liberar();
    return { vertices, triangulos };
  }

  /* a forma `nome(st, a, i)` é a que o mapa estático do motor
     (tools/arquitetura/mapear-motor-procedural.mjs) reconhece como operação. */
  return {
  unir(st, a, i) { return booleana(st, a, i, 'unir'); },
  subtrair(st, a, i) { return booleana(st, a, i, 'subtrair'); },
  intersectar(st, a, i) { return booleana(st, a, i, 'intersectar'); },
  aparar(st, a, i) { return aparar(st, a, i); },
  arredondarCostura(st, a, i) { return arredondarCostura(st, a, i); },
  };
}
