/* geradores-avancados.js — operações do grupo, isoladas por serviços explícitos do núcleo. */
export function criarOperacoesGeradoresAvancados(servicos) {
  const { BLOCO, norm3, cross3, addV, addF, grita, registraOrigem, contratoFaixaLado, confereId, quadroLoft, transportaLoft, expandirConcordancias } = servicos;
  return {
  lathe(st, a, i) {
    const b = confereId(st, i, 'lathe', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'lathe', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const perfil = a.perfil ?? [];
    if (perfil.length < 2) return grita(st, i, 'lathe', perfil.length, `perfil precisa de ao menos 2 pontos (tem ${perfil.length})`);
    const L = Math.max(3, st.num(a.lados ?? 8) | 0);   // TOPO (pra TODO o perfil): muda a CONTAGEM

    /* resolve + valida CADA ponto ANTES de criar qualquer vértice (raio/y — e o
       3º elemento opcional, a concordância — podem citar PARAM, como os outros
       campos dimensionais da Oficina). FAIL-CLOSED (D-115): um ponto que não
       seja [raio,y] (2 elementos, canto reto) ou [raio,y,concordancia]
       (3 elementos — Ciclo 5, a alça de curva que era RESERVADA) — aridade
       diferente, ou não-array — GRITA e ABORTA o passo inteiro (0 V/0 F), como
       o raio<0. Nunca constrói malha "quase" que mudaria de figura depois. */
    let pontoInvalido = false;
    const brutos = perfil.map((pt, j) => {
      if (!Array.isArray(pt) || (pt.length !== 2 && pt.length !== 3)) { grita(st, i, 'lathe', j, `ponto ${j} do perfil precisa ser [raio,y] (canto reto) ou [raio,y,concordancia] (2 ou 3 elementos); recebido ${Array.isArray(pt) ? `${pt.length} elemento(s)` : 'não-array'}`); pontoInvalido = true; return [0, 0]; }
      // st.num NÃO é protegido por try/catch de propósito: valor não-finito ou
      // não-numérico é a MESMA lei de todo campo dimensional da Oficina — THROW
      // alto, mata a peça inteira (a rede central de `criarResolverNumerico`).
      const raio = st.num(pt[0]), y = st.num(pt[1]);
      const alca = pt[2];
      return pt.length === 3
        ? [raio, y, alca && typeof alca === 'object' && !Array.isArray(alca) ? alca : st.num(alca)]
        : [raio, y];
    });
    if (pontoInvalido) return;   // algum ponto inválido (aridade errada) -> nada construído neste passo

    const segmentosCurva = Math.max(1, st.num(a.segmentosCurva ?? 8) | 0);   // discretização das concordâncias deste passo
    const exp = expandirConcordancias(st, i, 'lathe', brutos, { fechado: false, segmentosCurva });
    if (exp.erro) return;   // concordância inválida -> nada construído neste passo (grita já registrado)

    // classifica polo/anel SOBRE O EXPANDIDO (um arco pode expor raio<0 se a concordância vaza o eixo)
    let pontoInvalido2 = false;
    const pontos = exp.pontos.map((p, j) => {
      const raio = p[0], y = p[1];
      if (raio < 0) { grita(st, i, 'lathe', j, `raio negativo (${raio}) no ponto ${j} do perfil expandido — não dá pra classificar polo/anel`); pontoInvalido2 = true; }
      return { raio, y, polo: raio === 0 };
    });
    if (pontoInvalido2) return;

    /* PERFIL FECHADO — o último ponto no MESMO lugar do primeiro.
       Uma receita que escreve isso está dizendo "a seção dá a volta e fecha":
       é assim que se descreve anel de vedação, pneu e qualquer toroide. Até
       aqui o passo tratava o perfil como polilinha SEMPRE aberta, e o ponto
       repetido virava um segundo anel de vértices coincidentes com o primeiro —
       colados no espaço, separados na topologia. Visualmente fechava; a malha
       tinha uma costura, e `meta.fechada:false` era o único lugar onde isso
       aparecia.

       Agora o último ponto REUSA os vértices do primeiro. A superfície fecha de
       verdade, e a última faixa liga o penúltimo anel de volta ao anel inicial.

       A comparação é EXATA de propósito. Um limiar aproximado faria dois pontos
       quase iguais fecharem o laço em silêncio, mudando a topologia de uma peça
       cujo autor não pediu isso — e o autor que quer fechar consegue escrever a
       mesma coordenada, porque ela vem do mesmo PARAM. */
    const ultimo = pontos.length - 1;
    const fechado = pontos.length >= 3
      && pontos[0].raio === pontos[ultimo].raio
      && pontos[0].y === pontos[ultimo].y;

    // guarda de overflow (D3): soma EXATA — segmento polo<->polo não soma face — ANTES de inserir
    let nV = 0; for (const p of pontos) nV += p.polo ? 1 : L;
    if (fechado) nV -= pontos[ultimo].polo ? 1 : L;   // o último ponto não aloca: ele reusa o primeiro
    let nF = 0; for (let idx = 0; idx < pontos.length - 1; idx++) if (!(pontos[idx].polo && pontos[idx + 1].polo)) nF += L;
    if (nV > BLOCO || nF > BLOCO) throw new Error(`oficina: lathe com ${perfil.length} pontos × lados=${L} estoura o bloco de ids (${BLOCO}): ${nV} vértices / ${nF} faces`);

    // VÉRTICES — anda o cursor (a fórmula documentada acima)
    let cursor = 0;
    const info = [];
    for (let idx = 0; idx < pontos.length; idx++) {
      if (fechado && idx === ultimo) { info.push(info[0]); continue; }   // solda: nenhum id novo
      const p = pontos[idx];
      if (p.polo) {
        const id = b + cursor;
        addV(st, id, [0, p.y, 0]);
        cursor += 1;
        info.push({ polo: true, id });
        continue;
      }
      const ids = [];
      for (let j = 0; j < L; j++) { const t = (j / L) * Math.PI * 2; const id = b + cursor + j; addV(st, id, [Math.cos(t) * p.raio, p.y, Math.sin(t) * p.raio]); ids.push(id); }
      cursor += L;
      info.push({ polo: false, ids });
    }

    // FACES — cursor de face análogo, por segmento consecutivo (i,i+1)
    let fCursor = 0;
    // origemId (Fase 4): faixas[idx] = ids de face do segmento idx (vazia se polo↔polo) — a MESMA forma que o loft já monta, ver `contratoFaixaLado`.
    const faixas = Array.from({ length: info.length - 1 }, () => []);
    for (let idx = 0; idx < info.length - 1; idx++) {
      const A = info[idx], B = info[idx + 1];
      if (A.polo && B.polo) { grita(st, i, 'lathe', idx, 'polo↔polo adjacente — perfil degenerado, sem face neste segmento'); continue; }   // 0 faces, cursor não avança
      if (!A.polo && !B.polo) {
        for (let j = 0; j < L; j++) { const n = (j + 1) % L, fid = b + fCursor + j; addF(st, fid, [A.ids[j], B.ids[j], B.ids[n], A.ids[n]]); faixas[idx].push(fid); }   // anel<->anel: quads (a faixa da esfera)
      } else if (A.polo) {
        for (let j = 0; j < L; j++) { const n = (j + 1) % L, fid = b + fCursor + j; addF(st, fid, [A.id, B.ids[j], B.ids[n]]); faixas[idx].push(fid); }   // polo embaixo -> anel em cima: leque SUL
      } else {
        for (let j = 0; j < L; j++) { const n = (j + 1) % L, fid = b + fCursor + j; addF(st, fid, [B.id, A.ids[n], A.ids[j]]); faixas[idx].push(fid); }   // anel embaixo -> polo em cima: leque NORTE (invertido)
      }
      fCursor += L;
    }
    if (a.origemId != null) registraOrigem(st, i, 'lathe', a.origemId, { faixas });
  },

  /* loft — P4 do playground: uma sequência de SEÇÕES (círculo de raio variável)
     encadeada ao longo de um CAMINHO 3D arbitrário — tubo/casco/galho/membro.
     O `lathe` acima é o TEMPLATE: reusa EXATAMENTE o esquema cursor/polo/
     anel/leque/guarda dele; a única peça NOVA é o FRAME que orienta cada anel,
     porque não existe mais um eixo fixo (o Y do lathe) pra jogar cos/sin em
     cima — o frame tem que ACOMPANHAR o caminho sem torcer.

     ARGS: `secoes: [{pos:[x,y,z], raio}, ...]` (≥2, senão GRITA e ABORTA, como
     o perfil curto do lathe) + `lados` (TOPO, mín 3, pra TODA seção de uma vez
     — como o lathe). `pos` passa por `st.vec`, `raio` por `st.num` (podem
     citar PARAM). Nome `secoes` (não `perfis`, que a linha especulativa do
     doc citava): `perfil` já é do `lathe` com outra FORMA (`[raio,y]` 2D);
     reusar o nome confundiria os dois.

     CONTORNO explícito (P5, docs/historico/playground.md) — substitui `raio` por
     `contorno: [[u,w], ...]` com EXATAMENTE `lados` pontos no plano LOCAL do
     anel (os eixos `fr.u`/`fr.w` do transporte paralelo, o mesmo `ca,sa` que
     o círculo calculava de `cos/sin·raio`) — destrava seção NÃO-circular
     (estrela, hexágono, perfil de I) sem tocar em NADA da numeração/faces/
     overflow, que só enxergam "polo ou anel de `lados` vértices", nunca a
     ORIGEM das coordenadas. `raio` e `contorno` são MUTUAMENTE EXCLUSIVOS
     numa seção (os dois juntos GRITA — ambíguo); nenhum dos dois GRITA
     também. Cada ponto do contorno é `[u,w]` (canto reto) ou
     `[u,w,concordancia]` (Ciclo 5 — a alça de curva no 3º elemento, um raio
     de fillet expandido ANTES de contar os `lados` pontos; ver
     `expandirConcordancias`). Contagem, DEPOIS de expandir (≠ `lados`) GRITA
     e ABORTA — sem concordância nenhuma é a mesma contagem de sempre.
     Winding OBRIGATORIAMENTE CCW (ângulo crescente no círculo já É CCW em
     u,w) — validado por ÁREA COM SINAL (shoelace): CW ou degenerado (área
     ~0) GRITA e ABORTA, porque silenciosamente produziria normal invertida
     ou nula (a classe do achado adversarial do P3, não pega pelo manifold).
     Nunca vira polo (polo é só `raio:0` explícito). **Não confundir com
     `MATERIAIS[nome].contorno`** (passo 12a) — homônimo só de nome; aquele é
     um número (força do rim-light), este é uma lista de pontos, e os dois
     nunca se tocam (objetos diferentes, chaves diferentes).

     Seção malformada — não-objeto, sem `pos`, ou `pos` com aridade ≠ 3 —
     GRITA e ABORTA igual (não dá pra numerar uma seção que não sabe se é
     polo ou anel).

     POLO vs ANEL (idêntico ao lathe, só pra `raio`): RESOLVIDO `=== 0` vira
     POLO (1 vértice, bem em cima de `pos` — a ponta); `> 0` vira ANEL de
     `lados` vértices; `< 0` não dá pra classificar -> GRITA e ABORTA o passo
     inteiro (0 V/0 F), o mesmo tratamento do `raio<0` do lathe. SEM tampas
     automáticas: fechar uma ponta é terminar a seção com `raio:0`.

     SEGMENTO DE COMPRIMENTO ZERO (formato salvo, fail-closed): duas seções
     CONSECUTIVAS na MESMA `pos` resolvida (comparação EXATA por eixo) fazem a
     tangente do trecho ficar indefinida — sem uma direção, o frame (abaixo)
     não tem o que transportar. GRITA e ABORTA O PASSO INTEIRO (0 V/0 F),
     verificado ANTES de montar qualquer frame — nunca deixa passar um vetor
     degenerado que corromperia (ou colapsaria) a malha em silêncio.

     FRAME POR TRANSPORTE PARALELO (a peça NOVA vs. o lathe; formato salvo,
     travada por teste) — reimplementado ACIMA (`quadroLoft`/`transportaLoft`),
     byte-equivalente ao `quadro`/`transporta` de `arvore-cartoon.js` (a
     convenção já provada no `galhoSeca`), mas LOCAL ao núcleo:
       tangente da seção i = a direção do ÚNICO segmento que toca a ponta
       (i=0 -> direção do segmento 0->1; i=última -> direção do último
       segmento) OU, no INTERIOR do caminho, a MÉDIA normalizada das direções
       dos DOIS segmentos vizinhos (i-1->i e i->i+1) — suaviza o frame numa
       quina, em vez de saltar pra direção de só um lado.
       semente do frame: `t0 = tangente(0)`; `u0 = quadroLoft(t0)[0]`
       (internamente: `ref = |t0[1]|>0.9 ? [1,0,0] : [0,1,0]`, evita cross
       quase-nulo quando o caminho é quase vertical; `u0 = norm(cross(ref,t0))`).
       propagação (seção i>0): `u_i = transportaLoft(u_{i-1}, t_i)` — projeta
       `u_{i-1}` PRA FORA da tangente nova e renormaliza; se degenerar refaz
       com `quadroLoft(t_i)[0]`. `w_i = cross(u_i,t_i)`. É ISSO que impede o
       tubo de TORCER numa curva: o frame acompanha a tangente pelo caminho
       mais curto (sem componente rotacional em torno do próprio eixo), ao
       contrário de recalcular `quadroLoft(t_i)` do zero em toda seção (que
       reintroduziria uma torção arbitrária toda vez que o `ref` trocar de
       [1,0,0] pra [0,1,0] ou vice-versa).
       ANEL: vértice j (j=0..lados-1) = `pos + u·cos(a)·raio + w·sin(a)·raio`,
       `a = j/lados·2π` — a MESMA fórmula do lathe/esfera/cone
       (`[cos(t)·raio, y, sin(t)·raio]`), só que `u`/`w` (o frame local, girado
       pelo transporte paralelo) substituem os eixos fixos X/Z. Um caminho RETO
       no eixo Y (t=[0,1,0] sempre) dá o MESMO tubo do lathe — um círculo com a
       normal radial pra fora, mesmo sentido de giro —, só que `quadroLoft`
       escolhe `u0=[0,0,1]`/`w0=[-1,0,0]` (não `[1,0,0]`/`[0,0,1]` do lathe): a
       ponta j=0 sai numa FASE 90° diferente (não é byte-idêntico ponto-a-
       ponto), mas a FORMA/ORIENTAÇÃO é a mesma — o lathe é o caso degenerado
       de caminho reto; o loft generaliza pro caminho curvo.

     ⚠ CAMINHO SIMÉTRICO **NÃO** GERA MALHA SIMÉTRICA (D-128, achado pelo
     experimento do TETO — docs/historico/TETO.md). Consequência direta do transporte
     paralelo descrito acima: o frame de cada anel é PROPAGADO a partir da
     PRIMEIRA seção, então ele depende do HISTÓRICO do caminho, não só da
     posição da seção. Um caminho cujos `pos` são simétricos em torno de um
     plano (ex.: x = −0.28 → −0.23 → +0.23 → +0.28) produz anéis com fases
     DIFERENTES nas duas metades, porque a tangente das pontas não é o eixo
     puro e as duas metades herdam frames girados um em relação ao outro.
     O `loft` só preserva simetria quando a tangente é CONSTANTE ao longo de
     todo o caminho (todas as seções no mesmo plano perpendicular).
       Medido: o guidão da `pecas/moto.js` (caminho simétrico em x, 12 anéis)
       tem os 12 vértices SEM par espelhado da peça — desvio máx 4.45e-3, e a
       peça inteira tem 480/492 com par EXATO. As rodas da mesma peça escapam
       porque todas as seções delas têm o mesmo y e o mesmo z (tangente
       (1,0,0) constante).
       O desvio é pequeno demais pra aparecer no render (4,5 mm numa moto de
       2,8 m) — então PRECISA de régua: o `auditar` tem um crítico de simetria
       (D-128) justamente porque nenhum gate pegava isso.
     PRA GARANTIR SIMETRIA: modele UMA metade e use `espelha` (que é exato por
     construção — reflete coordenada e solda no plano), em vez de confiar num
     caminho simétrico.

     NUMERAÇÃO DE VÉRTICE (formato salvo, travada por teste) — cursor IDÊNTICO
     ao lathe: seção POLO consome 1 id (`b+cursor`), seção ANEL consome
     `lados` ids (`b+cursor+j`); o cursor soma o que acabou de consumir a cada
     seção, na ORDEM das seções.

     FACES entre seções consecutivas (i,i+1) — cursor de face PRÓPRIO,
     ANÁLOGO ao lathe (começa em 0, cada segmento soma só o que produziu):
       anel<->anel : `lados` QUADS — [A[j], B[j], B[n], A[n]] (a MESMA faixa
                     do lathe/esfera, n=(j+1)%lados);
       polo->anel  : `lados` triângulos — leque SUL do lathe, [polo, B[j],
                     B[n]] (o polo é a seção DE TRÁS no caminho);
       anel->polo  : `lados` triângulos — leque NORTE do lathe (invertido),
                     [polo, A[n], A[j]] (o polo é a seção DA FRENTE);
       polo<->polo : GRITA ("seção degenerada") e ZERO faces neste segmento —
                     o cursor de face NÃO avança aqui, mas os segmentos
                     vizinhos seguem normais (não corrompe o resto), o MESMO
                     tratamento do lathe.
     Winding pra FORA: reusa a lei do lathe (seções em ORDEM ao longo do
     caminho, raio>=0) — a mesma faixa/leque, só orientada pelo frame local em
     vez do eixo Y fixo.

     Guarda de overflow (D3, por-passo): soma EXATA de vértices e de faces
     (segmento polo<->polo não conta face) calculada ANTES de montar frame ou
     inserir qualquer vértice — throw como o lathe. */
  loft(st, a, i) {
    const b = confereId(st, i, 'loft', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'loft', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const secoesArg = a.secoes ?? [];
    if (secoesArg.length < 2) return grita(st, i, 'loft', secoesArg.length, `secoes precisa de ao menos 2 (tem ${secoesArg.length})`);
    const L = Math.max(3, st.num(a.lados ?? 8) | 0);   // TOPO (pra TODA seção): muda a CONTAGEM
    const segmentosCurva = Math.max(1, st.num(a.segmentosCurva ?? 8) | 0);   // discretização das concordâncias (Ciclo 5), uma vez por passo

    /* ORIENTAÇÃO DECLARADA DA SEÇÃO (`orientacao`, opcional, `[x,y,z]` via
       `st.vec` — pode citar PARAM, como `pos`/`d`/`pivo`). É a resposta ao
       atrito "frame implícito do loft" (RELATO-RODA-REALISTA): sem ela, quem
       decide para onde aponta o eixo +u de cada anel é o TRANSPORTE PARALELO,
       isto é, o HISTÓRICO do caminho — então um contorno retangular não
       conserva "largura" e "espessura" entre dois caminhos de direções
       diferentes, e a peça acaba remontando o contorno caminho a caminho.
       Com `orientacao`, o AUTOR declara essa direção uma vez:
         u_i = norm(orientacao − t_i·(orientacao·t_i))   (projeção no plano da seção)
         w_i = cross(u_i, t_i)
       O `[u,w]` do `contorno` (e a fase do círculo do `raio`) passam a ser
       lidos contra ESSA referência. Ex.: num raio de roda, `orientacao` = o
       eixo do cubo faz o +u do contorno ser SEMPRE o axial, em qualquer
       direção radial do braço. Serve igual a cabo, tubo, corrimão, correia e
       trilho — a referência é uma direção do mundo, não um conceito de roda.
       DETERMINISMO: cada seção projeta a MESMA referência na PRÓPRIA tangente.
       Nada é propagado, então não há rotação acumulada ao longo do caminho e o
       frame não depende de por onde o caminho passou (ao contrário do
       transporte paralelo, ver D-128 mais acima). Caminho simétrico com
       `orientacao` declarada dá anéis em fase.
       DEGENERADO GRITA, nunca escolhe sozinho: referência PARALELA à tangente
       de alguma seção deixa a projeção nula — não existe plano de seção, e
       qualquer desempate seria a escolha interna voltando pela janela. GRITA
       citando a seção e ABORTA o passo (0 V/0 F). Vetor nulo e aridade ≠ 3
       idem. Conferido em TODAS as seções antes de montar frame ou inserir
       vértice (fail-closed, a lei do lathe/D-115).
       AUSENTE: o transporte paralelo de sempre, byte a byte — toda peça
       gravada antes desta chave segue idêntica. */
    let orientacao = null;
    if (a.orientacao != null) {
      if (!Array.isArray(a.orientacao) || a.orientacao.length !== 3) return grita(st, i, 'loft', 'orientacao', `orientacao precisa ser [x,y,z] (3 elementos); recebido ${JSON.stringify(a.orientacao)}`);
      const r = st.vec(a.orientacao);
      if (!(Math.hypot(r[0], r[1], r[2]) > 1e-9)) return grita(st, i, 'loft', 'orientacao', `orientacao é o vetor nulo (${JSON.stringify(r)}) — não aponta direção nenhuma`);
      orientacao = norm3(r[0], r[1], r[2]);
    }

    /* resolve + valida CADA seção ANTES de criar qualquer vértice — a forma
       (objeto com pos + raio OU contorno) primeiro; FAIL-CLOSED (a mesma lei
       da alça de curva do lathe, D-115): qualquer problema ABORTA O PASSO
       INTEIRO (0 V/0 F), nunca constrói "quase". */
    let invalido = false;
    const secoes = secoesArg.map((s, j) => {
      if (typeof s !== 'object' || s === null || Array.isArray(s)) { grita(st, i, 'loft', j, `seção ${j} precisa ser um objeto {pos,raio} ou {pos,contorno} (recebido ${Array.isArray(s) ? 'array' : typeof s})`); invalido = true; return { pos: [0, 0, 0], raio: 0, contorno: null, polo: true }; }
      if (s.pos == null) { grita(st, i, 'loft', j, `seção ${j} sem 'pos'`); invalido = true; return { pos: [0, 0, 0], raio: 0, contorno: null, polo: true }; }
      /* ARIDADE do pos (a mesma lei do ponto do perfil no lathe, D-115): sem
         isto, `pos: [0,1]` construía com z=undefined -> coordenada NaN e 0
         órfãos, e `pos: {x:0}` estourava throw cru. O `st.vec` também barra
         (rede central), mas só a checagem AQUI diz QUAL seção — e mantém a
         lei do fail-closed por PASSO em vez de matar a peça inteira. */
      if (!Array.isArray(s.pos) || s.pos.length !== 3) { grita(st, i, 'loft', j, `pos da seção ${j} precisa ser [x,y,z] (3 elementos); recebido ${JSON.stringify(s.pos)}`); invalido = true; return { pos: [0, 0, 0], raio: 0, contorno: null, polo: true }; }
      const pos = st.vec(s.pos);
      const temRaio = Object.hasOwn(s, 'raio'), temContorno = Object.hasOwn(s, 'contorno');
      if (temRaio && temContorno) { grita(st, i, 'loft', j, `seção ${j} tem 'raio' E 'contorno' — ambíguo, escolha um (círculo OU contorno explícito)`); invalido = true; return { pos, raio: 0, contorno: null, polo: true }; }
      if (!temRaio && !temContorno) { grita(st, i, 'loft', j, `seção ${j} sem 'raio' nem 'contorno'`); invalido = true; return { pos, raio: 0, contorno: null, polo: true }; }

      if (temRaio) {
        const raio = st.num(s.raio);
        if (raio < 0) { grita(st, i, 'loft', j, `raio negativo (${raio}) na seção ${j} — não dá pra classificar polo/anel`); invalido = true; }
        return { pos, raio, contorno: null, polo: raio === 0 };
      }

      /* CONTORNO explícito (P5): substitui o círculo por um polígono no plano
         LOCAL do anel (os mesmos eixos fr.u/fr.w do transporte paralelo) que,
         DEPOIS de expandir as concordâncias (Ciclo 5), tem EXATAMENTE `lados`
         pontos [u,w] — a contagem/numeração/faces do anel não mudam em NADA
         (só a origem das coordenadas de cada vértice), então toda a guarda de
         overflow e o cursor de face seguem intactos. Nunca é polo (polo é só
         raio:0 explícito). Ponto malformado (aridade ≠ 2 e ≠ 3 — o 3º elemento
         é a alça de concordância, mesma lei do lathe) e contagem EXPANDIDA
         errada GRITAM e ABORTAM. Autor sem concordância continua escrevendo
         EXATAMENTE `lados` pontos de 2 elementos, byte a byte como antes
         (nenhum ponto tem alça -> expansão é identidade). */
      if (!Array.isArray(s.contorno) || s.contorno.length < 1) { grita(st, i, 'loft', j, `contorno da seção ${j} precisa ser uma lista de pontos [u,w] ou [u,w,concordancia] (recebido ${Array.isArray(s.contorno) ? `${s.contorno.length} ponto(s)` : typeof s.contorno})`); invalido = true; return { pos, raio: 0, contorno: null, polo: true }; }
      let pontoInvalido = false;
      const brutosContorno = s.contorno.map((pt, k) => {
        if (!Array.isArray(pt) || (pt.length !== 2 && pt.length !== 3)) { grita(st, i, 'loft', j, `ponto ${k} do contorno da seção ${j} precisa ser [u,w] ou [u,w,concordancia] (2 ou 3 elementos); recebido ${Array.isArray(pt) ? `${pt.length} elemento(s)` : 'não-array'}`); pontoInvalido = true; return [0, 0]; }
        // st.num sem try/catch de propósito — mesma lei do lathe: valor
        // dimensional não-finito/inválido é THROW alto, nunca grita macia.
        const u = st.num(pt[0]), w = st.num(pt[1]);
        const alca = pt[2];
        return pt.length === 3
          ? [u, w, alca && typeof alca === 'object' && !Array.isArray(alca) ? alca : st.num(alca)]
          : [u, w];
      });
      if (pontoInvalido) { invalido = true; return { pos, raio: 0, contorno: null, polo: true }; }
      const expC = expandirConcordancias(st, i, 'loft', brutosContorno, { fechado: true, segmentosCurva });
      if (expC.erro) { invalido = true; return { pos, raio: 0, contorno: null, polo: true }; }
      if (expC.pontos.length !== L) { grita(st, i, 'loft', j, `contorno da seção ${j}, depois de expandir as concordâncias, tem ${expC.pontos.length} pontos — precisa ter exatamente 'lados' (${L})`); invalido = true; return { pos, raio: 0, contorno: null, polo: true }; }
      const pts = expC.pontos;

      /* winding CCW obrigatório (shoelace) — a MESMA convenção do círculo
         (ângulo crescente = CCW em u,w): CW ou degenerado (área ~0) seria
         normal invertida ou NULA silenciosa, a classe do achado do P3. */
      let area2 = 0;
      for (let k = 0; k < L; k++) { const p = pts[k], q = pts[(k + 1) % L]; area2 += p[0] * q[1] - q[0] * p[1]; }
      if (area2 <= 1e-9) { grita(st, i, 'loft', j, `contorno da seção ${j} não é CCW ou é degenerado (área assinada ${(area2 / 2).toFixed(6)}) — normal ficaria invertida ou nula`); invalido = true; return { pos, raio: 0, contorno: null, polo: true }; }
      return { pos, raio: 0, contorno: pts, polo: false };
    });
    if (invalido) return;   // alguma seção inválida -> nada construído neste passo (grita já registrado por seção)

    // segmento de comprimento zero: tangente indefinida -> GRITA e ABORTA (fail-closed), ANTES de montar frame
    let comprimentoZero = false;
    for (let idx = 0; idx < secoes.length - 1; idx++) {
      const A = secoes[idx].pos, B = secoes[idx + 1].pos;
      if (A[0] === B[0] && A[1] === B[1] && A[2] === B[2]) { grita(st, i, 'loft', idx, `segmento ${idx}->${idx + 1} tem comprimento zero (seções na mesma posição) — tangente indefinida`); comprimentoZero = true; }
    }
    if (comprimentoZero) return;

    // guarda de overflow (D3): soma EXATA — segmento polo<->polo não soma face — ANTES de montar frame/inserir
    let nV = 0; for (const s of secoes) nV += s.polo ? 1 : L;
    let nF = 0; for (let idx = 0; idx < secoes.length - 1; idx++) if (!(secoes[idx].polo && secoes[idx + 1].polo)) nF += L;
    if (nV > BLOCO || nF > BLOCO) throw new Error(`oficina: loft com ${secoes.length} seções × lados=${L} estoura o bloco de ids (${BLOCO}): ${nV} vértices / ${nF} faces`);

    // TANGENTES por seção: ponta = direção do único segmento; interior = média normalizada dos dois vizinhos
    const ultimo = secoes.length - 1;
    const dirSeg = [];
    for (let idx = 0; idx < ultimo; idx++) { const A = secoes[idx].pos, B = secoes[idx + 1].pos; dirSeg.push(norm3(B[0] - A[0], B[1] - A[1], B[2] - A[2])); }
    /* CAMINHO FECHADO — a última seção no MESMO lugar da primeira, com a mesma
       forma. É assim que se descreve mangueira que volta em si, aro fechado e
       qualquer tubo em laço; até aqui virava um anel coincidente e não soldado,
       a mesma costura que o `lathe` tinha.

       A detecção vem ANTES da tangente porque ela MUDA a tangente. Num caminho
       aberto, a ponta só conhece o segmento que chega nela; num laço, a ponta é
       um ponto interior como qualquer outro, e a tangente ali é a média do
       segmento que fecha com o que abre. Sem isso, a emenda herdaria a direção
       de um lado só e os dois anéis se encontrariam girados — no anel de 12
       seções, exatamente os 30° de um segmento. */
    const mesmaSecao = (a1, b1) => a1.pos.every((n, k) => n === b1.pos[k])
      && !a1.polo && !b1.polo
      && (a1.contorno ? JSON.stringify(a1.contorno) === JSON.stringify(b1.contorno) : a1.raio === b1.raio);
    const fechado = secoes.length >= 3 && mesmaSecao(secoes[0], secoes[ultimo]);
    const tangenteDaEmenda = fechado
      ? norm3(dirSeg[ultimo - 1][0] + dirSeg[0][0], dirSeg[ultimo - 1][1] + dirSeg[0][1], dirSeg[ultimo - 1][2] + dirSeg[0][2])
      : null;
    const tangente = (idx) => (fechado && (idx === 0 || idx === ultimo) ? tangenteDaEmenda
      : idx === 0 ? dirSeg[0] : idx === ultimo ? dirSeg[ultimo - 1] : norm3(dirSeg[idx - 1][0] + dirSeg[idx][0], dirSeg[idx - 1][1] + dirSeg[idx][1], dirSeg[idx - 1][2] + dirSeg[idx][2]));

    // CUSP (dobra ~180°): num interior, a soma dos dois segmentos vizinhos é ~zero -> a tangente
    // fica indefinida (norm3 devolve [0,0,0] pelo guarda `||1`) e w = cross(u,0) = 0 -> o anel
    // COLAPSA numa linha (degenerado SILENCIOSO, não-NaN). GRITA e ABORTA (fail-closed), como o
    // comprimento-zero acima. (O `galhoSeca` de arvore-cartoon.js nunca cai aqui: o `desviar` dele
    // só faz desvios PEQUENOS, jamais antiparalelos; o loft aceita caminho arbitrário e precisa da
    // guarda explícita — foi o achado adversarial do P4.)
    let cusp = false;
    for (let idx = 1; idx < ultimo; idx++) {
      const p = dirSeg[idx - 1], q = dirSeg[idx];
      if (Math.hypot(p[0] + q[0], p[1] + q[1], p[2] + q[2]) < 1e-6) { grita(st, i, 'loft', idx, `seção ${idx} é um cusp (o caminho dobra ~180°) — tangente indefinida, o anel colapsaria numa linha`); cusp = true; }
    }
    if (cusp) return;

    /* FRAME — dois modos, escolhidos pela PRESENÇA de `orientacao`:
       DECLARADO (`orientacao` presente): cada seção projeta a referência do
       autor na própria tangente. Sem propagação, sem acumulação; paralelismo
       GRITA e aborta, conferido em TODA seção ANTES de qualquer vértice.
       IMPLÍCITO (ausente): o TRANSPORTE PARALELO de sempre — semente em
       quadroLoft(tangente(0)), propaga com transportaLoft (a fórmula
       documentada acima). Este ramo é literalmente o código anterior à chave,
       por isso peça sem `orientacao` fica byte a byte igual. */
    const frames = [];
    if (orientacao) {
      let paralela = false;
      for (let idx = 0; idx <= ultimo; idx++) {
        const t = tangente(idx);
        const dot = orientacao[0] * t[0] + orientacao[1] * t[1] + orientacao[2] * t[2];
        const px = orientacao[0] - t[0] * dot, py = orientacao[1] - t[1] * dot, pz = orientacao[2] - t[2] * dot;
        if (Math.hypot(px, py, pz) < 1e-4) { grita(st, i, 'loft', idx, `orientacao ${JSON.stringify(orientacao.map((n) => +n.toFixed(6)))} é paralela à tangente da seção ${idx} — a projeção no plano da seção é nula, não há orientação a declarar; escolha uma referência transversal ao caminho`); paralela = true; continue; }
        const u = norm3(px, py, pz);
        frames.push({ u, w: cross3(u, t) });
      }
      if (paralela) return;   // fail-closed: 0 V / 0 F, nenhum frame chutado
    } else {
      let u = quadroLoft(tangente(0))[0];
      for (let idx = 0; idx <= ultimo; idx++) { const t = tangente(idx); u = idx === 0 ? u : transportaLoft(u, t); frames.push({ u, w: cross3(u, t) }); }
    }

    /* CAMINHO FECHADO — a última seção no MESMO lugar da primeira, com a mesma
       forma. É assim que se descreve mangueira que volta em si, aro fechado e
       qualquer tubo em laço; até aqui virava um anel coincidente e não soldado,
       a mesma costura que o `lathe` tinha.

       O `loft` tem uma condição que o `lathe` não tem: o quadro que orienta
       cada anel é TRANSPORTADO ao longo do caminho, e num laço ele não volta
       necessariamente igual ao inicial — sobra um giro (holonomia). Soldar sem
       olhar para isso costuraria dois anéis girados um em relação ao outro, e a
       superfície fecharia TORCIDA sem nada avisar. Por isso o giro residual é
       medido, e passa do limiar GRITA em vez de entregar a torção calada. */
    if (fechado) {
      const f0 = frames[0], fn = frames[ultimo];
      const cos = Math.max(-1, Math.min(1, f0.u[0] * fn.u[0] + f0.u[1] * fn.u[1] + f0.u[2] * fn.u[2]));
      const giroResidual = Math.acos(cos) * 180 / Math.PI;
      if (giroResidual > 1e-6) {
        return grita(st, i, 'loft', 'secoes', `o caminho fecha, mas o quadro transportado volta girado ${giroResidual.toFixed(6)}° em relação ao inicial: soldar assim costuraria dois anéis torcidos um contra o outro e a superfície fecharia torcida sem avisar. Ajuste o caminho, ou declare orientacao para fixar o quadro`);
      }
    }

    // VÉRTICES — anda o cursor (a fórmula documentada acima)
    let cursor = 0;
    const info = [];
    for (let idx = 0; idx < secoes.length; idx++) {
      if (fechado && idx === ultimo) { info.push(info[0]); continue; }   // solda: nenhum id novo
      const s = secoes[idx];
      if (s.polo) {
        const id = b + cursor;
        addV(st, id, s.pos);
        cursor += 1;
        info.push({ polo: true, id });
        continue;
      }
      const fr = frames[idx];
      const ids = [];
      for (let j = 0; j < L; j++) {
        /* CONTORNO explícito (P5) usa o ponto [u,w] direto no lugar de
           cos/sin·raio — a MESMA fórmula de posição abaixo, só a origem de
           ca/sa muda; toda a estrutura de cursor/faces é cega a essa troca. */
        const [ca, sa] = s.contorno ? s.contorno[j] : [Math.cos((j / L) * Math.PI * 2) * s.raio, Math.sin((j / L) * Math.PI * 2) * s.raio];
        const id = b + cursor + j;
        addV(st, id, [s.pos[0] + fr.u[0] * ca + fr.w[0] * sa, s.pos[1] + fr.u[1] * ca + fr.w[1] * sa, s.pos[2] + fr.u[2] * ca + fr.w[2] * sa]);
        ids.push(id);
      }
      cursor += L;
      info.push({ polo: false, ids });
    }

    // FACES — cursor de face análogo, por segmento consecutivo (i,i+1) — idêntico ao lathe
    let fCursor = 0;
    const faixas = Array.from({ length: info.length - 1 }, () => []);
    for (let idx = 0; idx < info.length - 1; idx++) {
      const A = info[idx], B = info[idx + 1];
      if (A.polo && B.polo) { grita(st, i, 'loft', idx, 'polo↔polo adjacente — seção degenerada, sem face neste segmento'); continue; }   // 0 faces, cursor não avança
      if (!A.polo && !B.polo) {
        for (let j = 0; j < L; j++) { const n = (j + 1) % L, fid = b + fCursor + j; addF(st, fid, [A.ids[j], B.ids[j], B.ids[n], A.ids[n]]); faixas[idx].push(fid); }   // anel<->anel: quads (a faixa da esfera)
      } else if (A.polo) {
        for (let j = 0; j < L; j++) { const n = (j + 1) % L, fid = b + fCursor + j; addF(st, fid, [A.id, B.ids[j], B.ids[n]]); faixas[idx].push(fid); }   // polo atrás -> anel na frente: leque SUL
      } else {
        for (let j = 0; j < L; j++) { const n = (j + 1) % L, fid = b + fCursor + j; addF(st, fid, [B.id, A.ids[n], A.ids[j]]); faixas[idx].push(fid); }   // anel atrás -> polo na frente: leque NORTE (invertido)
      }
      fCursor += L;
    }
    if (a.origemId != null) {
      registraOrigem(st, i, 'loft', a.origemId, { faixas });
    }
  },

  /* inflate — P6 do playground: DOIS contornos 2D (`contornoLado`, plano z×y;
     `contornoTopo`, plano z×x — a convenção do doc "Aba Desenho": y pra cima,
     lado é z×y, cima é z×x) viram VOLUME 3D — a interseção dos dois PRISMAS
     (extrusão do lado ao longo de X; extrusão do topo ao longo de Y). Ao
     contrário do lathe/loft (fórmula fechada: cursor soma exatamente o que
     cada seção precisa), NÃO existe fórmula fechada pro nº de vértices/faces
     de uma interseção de silhuetas arbitrárias — a numeração aqui EMERGE de
     um SCAN determinístico (o mesmo espírito não-fechado do `espelha`, que
     numera por mapa determinístico em vez de fórmula), documentado abaixo e
     travado por teste igual a tudo mais.

     MÉTODO (robusto, watertight POR CONSTRUÇÃO — o motivo de não usar CSG
     geral): GRADE DE VOXEL, não interseção exata de malha. Ponto (x,y,z) do
     centro de um voxel está DENTRO se a projeção (z,y) cai dentro do
     `contornoLado` E a projeção (z,x) cai dentro do `contornoTopo` (par-ímpar
     por varredura — o mesmo teste ponto-em-polígono do `rasterizarContorno`
     da bancada de gabarito, reimplementado local ao núcleo). Uma face só é
     emitida entre um voxel DENTRO e um vizinho FORA (ou fora da grade) — toda
     parede interna (dentro↔dentro) nunca aparece — por isso a superfície é
     SEMPRE um 2-manifold fechado, por construção topológica, não por sorte.
     O modo histórico `grade` continua BLOCKY (facetado pelos voxels). O modo
     opcional `secoes` cruza os intervalos dos dois contornos em estações de Z e
     liga superelipses transversais. Ele serve a volumes cuja lateral e planta
     têm exatamente UM intervalo por estação (carenagem, casco, cabo, móvel,
     corpo estilizado). Contorno com ilhas ou cavidades é ambíguo nesse método e
     GRITA indicando `grade` ou envelopes separados; nunca escolhe uma ilha em
     silêncio. Não é CSG nem união entre os envelopes.

     ARGS: `contornoLado`/`contornoTopo`: `[[a,b],...]` ou `[[a,b,concordancia],
     ...]` (≥3 pontos cada, PARAM via `st.num`) — a MESMA lei do `contorno` do
     loft: cada ponto pode ter um raio de concordância no 3º elemento (Ciclo
     5), expandido em arco ANTES do teste ponto-em-polígono; aridade ≠ 2 e ≠ 3
     GRITA e ABORTA o passo inteiro (fail-closed, D-115). `divisoes` (TOPO, mín 2): subdivide o EIXO MAIS
     LONGO da caixa combinada em `divisoes` voxels; os outros dois eixos ganham
     a MESMA aresta de voxel (proporcional, não igual contagem) — um voxel
     cúbico, não um grid distorcido.

     CAIXA COMBINADA: `contornoLado` dá (zMinL,zMaxL,yMin,yMax);
     `contornoTopo` dá (zMinT,zMaxT,xMin,xMax); Z tem que CASAR entre os dois
     (é o mesmo eixo físico nas duas vistas) — a caixa usa a UNIÃO dos dois
     intervalos de Z. Se os contornos não têm NENHUM Z em comum na prática (ou
     não se cruzam de jeito nenhum), a grade inteira fica fora -> 0 faces ->
     GRITA e ABORTA (resultado vazio nunca é o que o autor queria — a mesma
     lei do `polo↔polo` do loft, mas aqui pro passo inteiro).

     NUMERAÇÃO (formato salvo, travada por teste): SCAN em ix,iy,iz (ordem
     fixa, aninhada); pra cada voxel DENTRO, as 6 direções de face em ORDEM
     FIXA [-x,+x,-y,+y,-z,+z]; pra cada face emitida, os 4 CANTOS da grade em
     ordem CCW vista de fora (tabela fixa abaixo). Cada CANTO ganha um id na
     PRIMEIRA vez que uma face o referencia (Map local, não fórmula) — cantos
     nunca tocados por nenhuma face NÃO ganham id (não desperdiça espaço de
     bloco). Guarda de overflow (D3): a malha é montada numa estrutura LOCAL
     (nunca toca `st.V`/`st.F`) até o scan terminar; só então os totais reais
     são comparados a `BLOCO` e, se couber, tudo é commitado de uma vez — a
     mesma disciplina "nunca constrói quase" do resto do núcleo, adaptada pra
     um caso sem fórmula fechada. Guarda de SANIDADE separada (throw, antes
     até de rodar o scan): grade com mais de 200.000 voxels — sanity contra
     `divisoes` absurdo travar a sessão, independente do bloco de ids. */
  inflate(st, a, i) {
    const b = confereId(st, i, 'inflate', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'inflate', 'origemId', 'origemId precisa ser inteiro não-negativo');

    const segmentosCurva = Math.max(1, st.num(a.segmentosCurva ?? 8) | 0);   // discretização das concordâncias (Ciclo 5), uma vez por passo

    /* pontos [a,b] (canto reto, como sempre) ou [a,b,concordancia] (Ciclo 5 —
       a alça de curva que era RESERVADA): expande as concordâncias ANTES do
       teste ponto-em-polígono — o contorno em si nunca vira vértice/face
       (inflate não tem fórmula fechada, é a grade de voxel), então arredondar
       um canto aqui é só melhorar a SILHUETA que `dentroPoligono` enxerga. Sem
       concordância nenhuma, a expansão é identidade — byte a byte como antes. */
    const validaContorno = (pontosBrutos, nome) => {
      if (!Array.isArray(pontosBrutos) || pontosBrutos.length < 3) { grita(st, i, 'inflate', nome, `${nome} precisa de ao menos 3 pontos (tem ${Array.isArray(pontosBrutos) ? pontosBrutos.length : typeof pontosBrutos})`); return null; }
      let ruim = false;
      const brutos = pontosBrutos.map((pt, k) => {
        if (!Array.isArray(pt) || (pt.length !== 2 && pt.length !== 3)) { grita(st, i, 'inflate', `${nome}[${k}]`, `ponto ${k} de ${nome} precisa ser [a,b] ou [a,b,concordancia] (2 ou 3 elementos); recebido ${Array.isArray(pt) ? `${pt.length} elemento(s)` : 'não-array'}`); ruim = true; return [0, 0]; }
        // st.num sem try/catch de propósito — mesma lei do lathe/loft: valor
        // dimensional não-finito/inválido é THROW alto, nunca grita macia.
        const x = st.num(pt[0]), y = st.num(pt[1]);
        const alca = pt[2];
        return pt.length === 3
          ? [x, y, alca && typeof alca === 'object' && !Array.isArray(alca) ? alca : st.num(alca)]
          : [x, y];
      });
      if (ruim) return null;
      const exp = expandirConcordancias(st, i, 'inflate', brutos, { fechado: true, segmentosCurva });
      return exp.erro ? null : exp.pontos;
    };
    const lado = validaContorno(a.contornoLado, 'contornoLado');
    const topo = validaContorno(a.contornoTopo, 'contornoTopo');
    if (!lado || !topo) return;   // grita já registrado por contorno inválido

    const modo = a.modo ?? 'grade';
    if (!['grade', 'secoes'].includes(modo)) return grita(st, i, 'inflate', 'modo', `modo precisa ser 'grade' ou 'secoes'; recebido ${JSON.stringify(modo)}`);
    const divisoes = Math.max(2, st.num(a.divisoes ?? 8) | 0);   // TOPO: muda a CONTAGEM

    const dentroPoligono = (px, py, pontos) => {
      let dentro = false;
      for (let k = 0, j = pontos.length - 1; k < pontos.length; j = k++) {
        const [xk, yk] = pontos[k], [xj, yj] = pontos[j];
        if ((yk > py) !== (yj > py) && px < (xj - xk) * (py - yk) / (yj - yk) + xk) dentro = !dentro;
      }
      return dentro;
    };
    const bboxDe = (pontos) => { let mnA = Infinity, mxA = -Infinity, mnB = Infinity, mxB = -Infinity; for (const [pA, pB] of pontos) { if (pA < mnA) mnA = pA; if (pA > mxA) mxA = pA; if (pB < mnB) mnB = pB; if (pB > mxB) mxB = pB; } return [mnA, mxA, mnB, mxB]; };

    const [zMinL, zMaxL, yMin, yMax] = bboxDe(lado);
    const [zMinT, zMaxT, xMin, xMax] = bboxDe(topo);

    if (modo === 'secoes') {
      /* INTERVALO DE UMA SILHUETA numa estação. A regra meio-aberta evita
         contar um vértice compartilhado duas vezes. Duplicatas numéricas são
         consolidadas; qualquer resultado diferente de dois limites revela
         vazio, ilha ou cavidade que uma única superelipse não representa. */
      const intervaloNaEstacao = (pontos, z, nome, estacao) => {
        const cruzamentos = [];
        for (let k = 0, j = pontos.length - 1; k < pontos.length; j = k++) {
          const [zk, qk] = pontos[k], [zj, qj] = pontos[j];
          if ((zk > z) !== (zj > z)) cruzamentos.push(qj + (z - zj) * (qk - qj) / (zk - zj));
        }
        cruzamentos.sort((p, q) => p - q);
        const unicos = cruzamentos.filter((valor, indice) => indice === 0
          || Math.abs(valor - cruzamentos[indice - 1]) > Math.max(1, Math.abs(valor)) * 1e-9);
        if (unicos.length !== 2 || !(unicos[1] - unicos[0] > 1e-9)) {
          grita(st, i, 'inflate', estacao, `modo 'secoes': ${nome} precisa formar exatamente um intervalo na estação ${estacao} (z=${z.toFixed(9)}); encontrou ${unicos.length} limite(s). Use modo:'grade' para silhueta com cavidades/ilhas ou divida a forma em envelopes`);
          return null;
        }
        return unicos;
      };

      const zMin = Math.max(zMinL, zMinT), zMax = Math.min(zMaxL, zMaxT);
      if (!(zMax - zMin > 1e-9)) return grita(st, i, 'inflate', null, `modo 'secoes': contornoLado e contornoTopo não compartilham extensão positiva em Z (${zMin}..${zMax})`);
      const lados = Math.max(3, st.num(a.lados ?? 12) | 0);
      const expoente = st.num(a.expoenteSecao ?? 2);
      if (!(expoente > 0)) return grita(st, i, 'inflate', 'expoenteSecao', `expoenteSecao precisa ser positivo; recebido ${expoente}`);
      const potencia = 2 / expoente;
      const epsilonZ = (zMax - zMin) * 1e-9;
      const aneis = [];
      let invalido = false;
      for (let estacao = 0; estacao <= divisoes; estacao++) {
        const t = estacao / divisoes;
        const zGeometrico = zMin + (zMax - zMin) * t;
        const zAmostra = estacao === 0 ? zMin + epsilonZ : estacao === divisoes ? zMax - epsilonZ : zGeometrico;
        const iy = intervaloNaEstacao(lado, zAmostra, 'contornoLado', estacao);
        const ix = intervaloNaEstacao(topo, zAmostra, 'contornoTopo', estacao);
        if (!iy || !ix) { invalido = true; continue; }
        aneis.push({ z: zGeometrico, x0: ix[0], x1: ix[1], y0: iy[0], y1: iy[1] });
      }
      if (invalido) return;   // diagnósticos já registrados; fail-closed

      const nV = aneis.length * lados + 2;
      const nF = divisoes * lados + 2 * lados;
      if (nV > BLOCO || nF > BLOCO) throw new Error(`oficina: inflate modo='secoes' (${divisoes} divisões × lados=${lados}) estoura o bloco de ids (${BLOCO}): ${nV} vértices / ${nF} faces`);

      const idsAneis = [];
      let cursorV = 0;
      for (const anel of aneis) {
        const cx = (anel.x0 + anel.x1) / 2, rx = (anel.x1 - anel.x0) / 2;
        const cy = (anel.y0 + anel.y1) / 2, ry = (anel.y1 - anel.y0) / 2;
        const ids = [];
        for (let ladoIdx = 0; ladoIdx < lados; ladoIdx++) {
          const angulo = ladoIdx / lados * Math.PI * 2;
          const c = Math.cos(angulo), s = Math.sin(angulo);
          const x = cx + rx * Math.sign(c) * Math.abs(c) ** potencia;
          const y = cy + ry * Math.sign(s) * Math.abs(s) ** potencia;
          const id = b + cursorV++;
          addV(st, id, [x, y, anel.z]);
          ids.push(id);
        }
        idsAneis.push(ids);
      }
      const centroInicio = b + cursorV++, centroFim = b + cursorV;
      const primeiro = aneis[0], ultimo = aneis[aneis.length - 1];
      addV(st, centroInicio, [(primeiro.x0 + primeiro.x1) / 2, (primeiro.y0 + primeiro.y1) / 2, primeiro.z]);
      addV(st, centroFim, [(ultimo.x0 + ultimo.x1) / 2, (ultimo.y0 + ultimo.y1) / 2, ultimo.z]);

      let cursorF = 0;
      for (let estacao = 0; estacao < divisoes; estacao++) {
        const A = idsAneis[estacao], B = idsAneis[estacao + 1];
        for (let ladoIdx = 0; ladoIdx < lados; ladoIdx++) {
          const proximo = (ladoIdx + 1) % lados;
          addF(st, b + cursorF++, [A[ladoIdx], A[proximo], B[proximo], B[ladoIdx]]);
        }
      }
      const anelInicio = idsAneis[0], anelFim = idsAneis[idsAneis.length - 1];
      for (let ladoIdx = 0; ladoIdx < lados; ladoIdx++) {
        const proximo = (ladoIdx + 1) % lados;
        addF(st, b + cursorF++, [centroInicio, anelInicio[proximo], anelInicio[ladoIdx]]);
      }
      for (let ladoIdx = 0; ladoIdx < lados; ladoIdx++) {
        const proximo = (ladoIdx + 1) % lados;
        addF(st, b + cursorF++, [centroFim, anelFim[ladoIdx], anelFim[proximo]]);
      }
      if (a.origemId != null) registraOrigem(st, i, 'inflate', a.origemId, { faces: Array.from({ length: nF }, (_, k) => b + k) });
      return;
    }

    const zMin = Math.min(zMinL, zMinT), zMax = Math.max(zMaxL, zMaxT);
    const dx = xMax - xMin, dy = yMax - yMin, dz = zMax - zMin;
    const maior = Math.max(dx, dy, dz);
    if (!(maior > 0)) { grita(st, i, 'inflate', null, 'contornoLado/contornoTopo degenerados — a caixa combinada tem extensão zero em todos os eixos'); return; }
    const s = maior / divisoes;
    const nx = Math.max(1, Math.round(dx / s)), ny = Math.max(1, Math.round(dy / s)), nz = Math.max(1, Math.round(dz / s));
    if (nx * ny * nz > 200000) throw new Error(`oficina: inflate com divisoes=${divisoes} pede uma grade de ${nx}×${ny}×${nz} voxels (>200000) — sanidade de performance, independe do bloco de ids`);

    const dentroDaGrade = (ix, iy, iz) => {
      if (ix < 0 || iy < 0 || iz < 0 || ix >= nx || iy >= ny || iz >= nz) return false;
      const x = xMin + (ix + 0.5) * dx / nx, y = yMin + (iy + 0.5) * dy / ny, z = zMin + (iz + 0.5) * dz / nz;
      return dentroPoligono(z, y, lado) && dentroPoligono(z, x, topo);
    };

    /* 6 direções de face [normal] com os 4 cantos (offset 0/1 em x,y,z) EM
       ORDEM CCW vista de fora — tabela fixa, verificada por Newell no teste. */
    const FACES = [
      { n: [-1, 0, 0], c: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
      { n: [1, 0, 0], c: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]] },
      { n: [0, -1, 0], c: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
      { n: [0, 1, 0], c: [[0, 1, 0], [0, 1, 1], [1, 1, 1], [1, 1, 0]] },
      { n: [0, 0, -1], c: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]] },
      { n: [0, 0, 1], c: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    ];

    /* MONTA LOCAL primeiro — nunca toca st.V/st.F até o overflow ser conferido
       (D3): sem fórmula fechada, só dá pra saber o total rodando o scan. */
    const cornerId = new Map();   // "cx,cy,cz" -> id LOCAL (0-based)
    const posLocal = [];          // id LOCAL -> [x,y,z]
    const facesLocais = [];       // cada uma: [id,id,id,id] em ids LOCAIS
    const cornerPos = (cx, cy, cz) => [xMin + cx * dx / nx, yMin + cy * dy / ny, zMin + cz * dz / nz];
    const getCorner = (cx, cy, cz) => {
      const k = `${cx},${cy},${cz}`;
      let id = cornerId.get(k);
      if (id === undefined) { id = posLocal.length; cornerId.set(k, id); posLocal.push(cornerPos(cx, cy, cz)); }
      return id;
    };
    for (let ix = 0; ix < nx; ix++) for (let iy = 0; iy < ny; iy++) for (let iz = 0; iz < nz; iz++) {
      if (!dentroDaGrade(ix, iy, iz)) continue;
      for (const face of FACES) {
        const [dxn, dyn, dzn] = face.n;
        if (dentroDaGrade(ix + dxn, iy + dyn, iz + dzn)) continue;   // vizinho dentro -> parede interna, não emite
        facesLocais.push(face.c.map(([ox, oy, oz]) => getCorner(ix + ox, iy + oy, iz + oz)));
      }
    }

    if (facesLocais.length === 0) { grita(st, i, 'inflate', null, 'contornoLado e contornoTopo não se cruzam em NENHUM voxel — volume vazio (revise as posições/tamanhos dos dois contornos)'); return; }

    const nV = posLocal.length, nF = facesLocais.length;
    if (nV > BLOCO || nF > BLOCO) throw new Error(`oficina: inflate (${nx}×${ny}×${nz} voxels) estoura o bloco de ids (${BLOCO}): ${nV} vértices / ${nF} faces`);

    // COMMIT: ids LOCAIS -> ids GLOBAIS (b + local), só agora toca st.V/st.F
    posLocal.forEach((p, id) => addV(st, b + id, p));
    facesLocais.forEach((ids, fid) => addF(st, b + fid, ids.map((id) => b + id)));
    if (a.origemId != null) registraOrigem(st, i, 'inflate', a.origemId, { faces: Array.from({ length: nF }, (_, k) => b + k) });
  },

  /* A forma antiga `{nome,...}` continua aceita e conserva exatamente sua
     saída; a nova `{id,rotulo,...}` separa a chave citável do texto exibido. */

  };
}
