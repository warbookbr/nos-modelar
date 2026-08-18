/* transformacoes.js — operações do grupo, isoladas por serviços explícitos do núcleo. */
export function criarOperacoesTransformacoes(servicos) {
  const { FORMATO, BLOCO, baseDoPasso, norm3, indiceDeAxi, giraPonto, normalDaFace, ruido3, Face, addV, addF, grita, registraOrigem, origensIguais, CONTRATOS_ORIGEM, validarOrigem, textoDeclaracoes, resolverOrigem, resolverSelecao, resolverAlvosV, resolverAlvosF } = servicos;
  return {
  displace(st, a, i) {
    const alvos = resolverAlvosV(st, a.sel, 'displace', i);
    if (!alvos.size) return;
    const amplitude = st.num(a.amplitude ?? 0.1);
    const frequencia = st.num(a.frequencia ?? 1);
    const semente = st.num(a.semente ?? 0);

    // normal média por vértice: soma as normais (Newell) de TODAS as faces atuais que
    // tocam cada vértice — UMA passada sobre st.F, medida antes de mover qualquer coisa
    const somaN = new Map();   // vid -> [nx,ny,nz,contagem]
    for (const f of st.F.values()) {
      const n = normalDaFace(st.V, f.vs);
      for (const v of f.vs) {
        let acc = somaN.get(v);
        if (!acc) { acc = [0, 0, 0, 0]; somaN.set(v, acc); }
        acc[0] += n[0]; acc[1] += n[1]; acc[2] += n[2]; acc[3]++;
      }
    }

    for (const v of alvos) {
      const p = st.V.get(v);
      if (!p) continue;   // defensivo (nunca deveria faltar — veio de st.V.keys() ou de um canto de face já validado)
      const acc = somaN.get(v);
      if (!acc || !acc[3]) { grita(st, i, 'displace', v, 'vértice sem face nenhuma — sem normal pra seguir (apagaFace deixou solto?)'); continue; }
      const nrm = norm3(acc[0], acc[1], acc[2]);
      const r = ruido3(p[0] * frequencia, p[1] * frequencia, p[2] * frequencia, semente);   // [0,1)
      const d = (r * 2 - 1) * amplitude;   // remapeia pra [-amplitude, +amplitude]
      st.V.set(v, [p[0] + nrm[0] * d, p[1] + nrm[1] * d, p[2] + nrm[2] * d]);
    }
  },

  /* ---- P3 do playground: espelha + rotaciona — as duas transformam uma SELEÇÃO,
     mas de jeitos opostos (docs/historico/playground.md): `rotaciona` é SIMPLES (só move
     posição, nunca cria id); `espelha` é MEATY (duplica a seleção refletida,
     ids NOVOS — formato salvo). Juntas destravam objeto bilateral (metade
     modelada + espelho vira o todo; uma parte pode nascer torta/rodada). ---- */

  /* transladar — SOMA um deslocamento `d` a uma SELEÇÃO. O IRMÃO EXATO do
     `rotaciona` abaixo: mesma semântica de seleção, mesma promessa de só mexer
     em POSIÇÃO (`st.V.set` in-place) — NUNCA cria vértice/face, NUNCA renumera,
     NÃO consome o bloco de ids do passo. Determinístico (só soma).

     POR QUE ELA EXISTE (D-128, o achado do experimento do TETO — docs/historico/TETO.md):
     o vocabulário sabia GIRAR a malha inteira (`rotaciona` com `sel` ausente)
     mas não sabia TRANSLADAR nada maior que UMA face — `moveV` move 1 vértice,
     `moveF` 1 face, `moveA` 1 aresta. E das 9 primitivas, 7 nascem PRESAS à
     origem (`cubo`/`cilindro`/`esfera`/`cone`/`plano`/`chamferBox` centrados com
     a base em y=0; `lathe` sempre em torno de Y) — nenhuma aceita posição. Sem
     esta op, pôr um cilindro fora da origem custava um `moveV` POR VÉRTICE (32+
     passos pra uma roda de `lados:16`), então compor com primitiva era
     proibitivo na prática: a moto do TETO usou 7 das 25 ops e virou tudo `loft`,
     o único gerador que aceita `pos` por seção. Esta op devolve as outras 7 ao
     vocabulário — é a assimetria que faltava fechar, não uma conveniência.

     SELEÇÃO (`sel`, opcional, via `resolverAlvosV` — P8 do playground): AUSENTE
     = a malha INTEIRA (todos os vértices atuais de `st.V`) — é ESTE o caso que
     posiciona uma primitiva recém-criada. Presente = `{tudo:true}` (a peça
     inteira, explícito) e/ou `{v:[ids]}` e/ou `{f:[ids]}` (cantos da face)
     e/ou `{regiao:{min,max}}` e/ou `{grupo:'nome'}` (as faces daquele
     `f.parte`) — os campos presentes se UNEM, DEDUPLICADOS num Set. Referência
     inválida GRITA (órfão) e é ignorada — nunca corrompe (lei do envelope).
     Seleção vazia é no-op determinístico.

     DESLOCAMENTO (`d`, `[x,y,z]`, via `st.vec` — pode citar PARAM, como todo
     ponto dimensional): `p' = p + d`, ADITIVO como o `moveV` (acompanha a base
     — mexer no PARAM remodela sem tocar em passo nenhum). Ausente = `[0,0,0]`,
     que é no-op silencioso, a mesma lei do `moveV`/`moveF`/`moveA`. Não tem
     PIVÔ de propósito: translação não depende de pivô. */
  /* encostar (atrito A-6) — o contato deixa de ser um número digitado e passa a
     ser DERIVADO da geometria, a cada execução.

     O QUE ISSO CONSERTA. Até aqui, encostar uma peça na outra era calcular a
     coordenada à mão e escrevê-la. O número não sabe de onde veio: quando uma
     espessura muda, o contato se desfaz e NADA avisa — a peça continua válida,
     os gates continuam verdes e a foto continua plausível.

     POR QUE A DIREÇÃO É DECLARADA, E NÃO INFERIDA. O O-8 avisa que o difícil
     aqui é determinismo: relação precisa de desempate estável, e ambiguidade
     precisa gritar em vez de escolher. Exigir `direcao` ELIMINA esse risco em
     vez de administrá-lo — sem busca de par de faces não há empate a desempatar,
     e a operação vira aritmética pura sobre as posições, determinística por
     construção.

     O QUE ELA NÃO É, e isto fica escrito porque o nome é sugestivo: contato por
     EXTENSÃO na direção declarada. Ela não descobre o que encosta em quê, não
     resolve interpenetração lateral, não é solver de encaixe e não é colisão.

       `sel`         o que se move (as mesmas seleções de sempre);
       `referencia`  o lado que NÃO se move — o mesmo par de papéis que as
                     relações de montagem já nomeiam por `movel`/`referencia`,
                     e não `em`, que nos geradores já significa pose de criação;
       `direcao`  para onde empurrar, `[x,y,z]`, não-nula;
       `folga`    distância que sobra no fim (ausente = 0, encosta de fato).

     A conta: com `u` a direção normalizada, leva a frente do que move até a
     traseira da referência, menos a folga —
       `t = min(ref·u) − max(mov·u) − folga`
     e translada `sel` por `t·u`. `t` negativo é legítimo: a operação POSICIONA
     em contato, não avança até o contato, então ela conserta tanto o corpo que
     ficou longe quanto o que passou do ponto. */
  transladar(st, a, i) {
    const d = st.vec(a.d ?? [0, 0, 0]);

    // seleção -> conjunto de ids de vértice afetados (AUSENTE = malha inteira) — o MESMO resolverAlvosV do rotaciona
    const alvos = resolverAlvosV(st, a.sel, 'transladar', i);
    if (!alvos.size) return;   // nada pra mover (seleção vazia, ou só ids órfãos) — no-op determinístico

    for (const v of alvos) {
      const p = st.V.get(v);
      if (!p) continue;   // defensivo (nunca deveria faltar — veio de st.V.keys() ou de um canto de face já validado)
      st.V.set(v, [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);   // in-place — NUNCA cria vértice novo
    }
  },

  /* rotaciona — gira uma SELEÇÃO em torno de um EIXO (x/y/z) por `graus`, ao
     redor de um PIVÔ. SIMPLES: só desloca as posições dos vértices AFETADOS
     (`st.V.set` in-place) — NUNCA cria vértice/face nem renumera, o oposto do
     `espelha` abaixo. Determinístico (seno/cosseno de sempre, sem aleatório).

     SELEÇÃO (`sel`, opcional, via `resolverAlvosV` — P8 do playground):
     AUSENTE = a malha INTEIRA (todos os vértices atuais de `st.V`). Presente
     = `{tudo:true}` (a peça inteira, explícito) e/ou `{v:[ids]}` e/ou
     `{f:[ids]}` (cantos da face) e/ou `{regiao:{min,max}}` (caixa
     delimitadora) e/ou `{grupo:'nome'}` (as faces daquele `f.parte`) — os
     campos presentes se UNEM, DEDUPLICADOS num Set. Referência inválida
     (vértice/face/grupo) GRITA (órfão) e é ignorada — nunca corrompe (lei do
     envelope).

     PIVÔ (`pivo`, opcional `[x,y,z]`, via `st.vec` — pode citar PARAM):
     AUSENTE = o CENTROIDE dos vértices AFETADOS (a média das posições, medida
     ANTES de girar — o mesmo default que a op `parte` usa pro pivô de
     animação). Seleção vazia (nenhum vértice afetado) é no-op determinístico
     (nada pra girar).

     ROTAÇÃO (formato salvo, travada por teste): pra cada vértice afetado,
     `p' = pivo + R_eixo(graus)·(p − pivo)`, com R_eixo a rotação padrão
     right-handed em torno do eixo — a MESMA convenção das matrizes de
     animação `mRotX/mRotY/mRotZ` já existentes neste arquivo (graus
     convertidos pra radiano), aplicada direto (sem montar matriz 4x4, x/y/z
     abaixo já são o vetor RELATIVO ao pivô, p−pivo):
       eixo 'x': y' = y·cosθ − z·senθ ;  z' = y·senθ + z·cosθ
       eixo 'y': x' = x·cosθ + z·senθ ;  z' = −x·senθ + z·cosθ
       eixo 'z': x' = x·cosθ − y·senθ ;  y' = x·senθ + y·cosθ
     `graus`/`pivo` passam por `st.num`/`st.vec` (aceitam nome de PARAM, como
     as outras ops dimensionais). Eixo desconhecido GRITA (não é erro
     estrutural de bloco — é valor de argumento, como o `modo` do pincel). */
  rotaciona(st, a, i) {
    const eixo = a.eixo;
    const ax = indiceDeAxi(eixo);
    if (ax < 0) return grita(st, i, 'rotaciona', eixo, `eixo '${eixo}' desconhecido (só 'x'/'y'/'z')`);
    const graus = st.num(a.graus ?? 0);

    // seleção -> conjunto de ids de vértice afetados (AUSENTE = malha inteira) — resolverAlvosV, P8
    const alvos = resolverAlvosV(st, a.sel, 'rotaciona', i);
    if (!alvos.size) return;   // nada pra girar (seleção vazia, ou só ids órfãos) — no-op determinístico

    // pivô: explícito (st.vec — pode citar PARAM) OU o centroide dos afetados, medido ANTES de girar
    let pivo;
    if (a.pivo != null) pivo = st.vec(a.pivo);
    else {
      let cx = 0, cy = 0, cz = 0, n = 0;
      for (const v of alvos) { const p = st.V.get(v); if (!p) continue; cx += p[0]; cy += p[1]; cz += p[2]; n++; }
      pivo = n ? [cx / n, cy / n, cz / n] : [0, 0, 0];
    }

    const rad = (graus * Math.PI) / 180, c = Math.cos(rad), s = Math.sin(rad);
    for (const v of alvos) {
      const p = st.V.get(v);
      if (!p) continue;   // defensivo (nunca deveria faltar — veio de st.V.keys() ou de um canto de face já validado)
      st.V.set(v, giraPonto(p, pivo, ax, c, s));   // in-place — NUNCA cria vértice novo
    }
  },

  /* espelha — DUPLICA uma seleção de FACES espelhada num plano perpendicular a
     `eixo` (a coordenada NEGADA) na posição `pos` — o jeito de modelar só
     METADE de um objeto bilateral e completar o resto. MEATY: ao contrário do
     `rotaciona` acima, CRIA vértices/faces NOVOS (ids do BLOCO do passo) — é
     FORMATO SALVO, travado por teste.

     SELEÇÃO (`sel`, opcional): AUSENTE = TODAS as faces atuais (`st.F`).
     Presente usa a semântica uniforme de `resolverSelecao`: `f`/`grupo`
     apontam faces; `v` pega as faces que tocam algum vértice; `regiao` pega
     só as faces inteiramente dentro da caixa. Espelhar continua operando em
     CICLOS de face (os cantos vêm junto para reverter o winding). A forma
     antiga `sel:{f:[ids]}` permanece byte-idêntica.

     REFLEXÃO: só a coordenada do EIXO muda — `coord' = 2·pos − coord` (as
     outras duas ficam intactas). `pos` (default 0) passa por `st.num` (pode
     citar PARAM, como as outras ops dimensionais).

     WELD — decisão fixa, IRREVERSÍVEL (formato salvo): um vértice cuja
     coordenada no eixo é EXATAMENTE `pos` (a reflexão dele == ele mesmo) é
     COMPARTILHADO — a face espelhada reusa o id ORIGINAL, sem copiar. Solda
     a costura sozinho pra quem modela a metade com a borda encostada no
     plano (o MESMO truque do polo `raio===0` do `lathe`: teste de igualdade
     EXATA, não uma tolerância). Vértice fora do plano ganha uma CÓPIA com id
     NOVO. Um vértice QUASE-no-plano (ruído de ponto-flutuante) NÃO solda —
     vira um par coincidente-mas-distinto; pra soldar de propósito, ponha a
     borda em `pos` LITERAL na malha original, ou solde depois com `mescla`.
     (Idem: um vértice FORA do plano cuja reflexão cai EXATAMENTE sobre um
     vértice EXISTENTE não-afetado ganha CÓPIA nova — o weld só olha o plano,
     não faz merge geral; solde com `mescla` se quiser.)

     NUMERAÇÃO DE VÉRTICE (formato salvo, travada por teste): reúne os
     vértices AFETADOS (os cantos de TODAS as faces da seleção, cada id
     DEDUPLICADO uma vez) e ordena por id ORIGINAL crescente; anda um cursor
     de vértice que começa em 0: vértice NO plano -> mapeia pra SI MESMO
     (soldado, não consome id novo); vértice FORA -> mapeia pra `b+cursor`
     (b = baseDoPasso(i)) e o cursor avança 1.

     NUMERAÇÃO DE FACE (formato salvo, travada por teste): as faces da
     seleção, em ORDEM CRESCENTE de id ORIGINAL, cada uma vira UMA face nova
     — um cursor de face PRÓPRIO que começa em 0 (`b+cursor`, cursor avança 1
     por face) — com os CANTOS = mapa(cantos originais) em ordem REVERTIDA.
     Reverter desfaz a troca de mão que a reflexão introduz (um espelho troca
     o sentido de giro visto de fora), mantendo a normal pra FORA — o mesmo
     raciocínio da tampa de cima invertida do cilindro (D1; provado por
     Newell no teste). Atributos (cor/liso/material/parte/solido) são
     HERDADOS do original — só `vs` muda. (A tinta do pincel macio, se
     houver, NÃO é copiada — fica de fora da herança por ora, documentado
     aqui pra não virar surpresa silenciosa se um dia importar.)

     Guarda de overflow (D3, por-passo, calculada ANTES de inserir qualquer
     vértice/face): vértices NOVOS (só os NÃO-soldados contam) ≤ BLOCO e
     faces NOVAS ≤ BLOCO. Eixo desconhecido GRITA (valor de argumento, como o
     `modo` do pincel — não é erro estrutural de bloco). */
  espelha(st, a, i) {
    const eixo = a.eixo;
    const ax = indiceDeAxi(eixo);
    if (ax < 0) return grita(st, i, 'espelha', eixo, `eixo '${eixo}' desconhecido (só 'x'/'y'/'z')`);
    const pos = st.num(a.pos ?? 0);
    const b = baseDoPasso(i);
    const estrutural = a.origemId != null || a.derivaDe != null;
    let derivaDe = null;
    let faceIdsEstruturais = null;
    if (estrutural) {
      if (a.origemId == null || a.derivaDe == null) return grita(st, i, 'espelha', 'origemId+derivaDe', 'modo estrutural exige origemId e derivaDe juntos');
      if (!Number.isSafeInteger(a.origemId) || a.origemId < 0) return grita(st, i, 'espelha', 'origemId', 'origemId precisa ser inteiro não-negativo');
      const declaracoes = st.declaracoesOrigem.get(a.origemId) ?? [];
      if (declaracoes.length > 1) return grita(st, i, 'espelha', 'origemId', textoDeclaracoes(a.origemId, declaracoes));
      const fonte = validarOrigem(a.derivaDe);
      if (fonte.erro) return grita(st, i, 'espelha', 'derivaDe', `derivaDe inválida: ${fonte.erro}`);
      if (a.faces != null || !a.sel || typeof a.sel !== 'object' || Array.isArray(a.sel) || Object.keys(a.sel).length !== 1 || !Object.hasOwn(a.sel, 'origem')) return grita(st, i, 'espelha', 'sel', 'modo estrutural exige sel:{origem:...} direto, sem faces, alias, região ou ids literais');
      const seletor = validarOrigem(a.sel.origem);
      if (seletor.erro || !origensIguais(a.sel.origem, a.derivaDe)) return grita(st, i, 'espelha', 'sel.origem', 'sel.origem precisa ser a mesma origem estrutural declarada em derivaDe');
      const resultado = resolverOrigem(st, a.derivaDe);
      if (resultado.erro) return grita(st, i, 'espelha', 'derivaDe', resultado.erro);
      derivaDe = a.derivaDe;
      faceIdsEstruturais = [...resultado.faces].sort((x, y) => x - y);
    }

    // seleção uniforme de faces (AUSENTE = todas); dedup + ordem original crescente
    const faceIds = estrutural ? faceIdsEstruturais : [...resolverAlvosF(st, a, 'espelha', i, { todasQuandoAusente: true })].sort((x, y) => x - y);
    if (!faceIds.length) return;

    /* A saída estrutural é uma origem completa, nunca um subconjunto acidental
       da fonte. Antes de reservar qualquer id ou tocar na malha, confira TODAS
       as faces: uma face sem posição ou inteiramente no plano não tem cópia
       estrutural válida. O espelho legado conserva abaixo o comportamento
       histórico de gritar e pular somente a face degenerada. */
    if (estrutural) {
      for (const fid of faceIds) {
        const f = st.F.get(fid);
        if (!f || f.vs.some((v) => !st.V.has(v))) return grita(st, i, 'espelha', fid, 'não foi possível criar a cópia estrutural: face ou vértice-fonte inexistente');
        if (f.vs.every((v) => st.V.get(v)[ax] === pos)) return grita(st, i, 'espelha', fid, 'face inteiramente no plano do espelho — a saída estrutural seria incompleta; nenhuma cópia foi criada');
      }
    }

    // vértices afetados (cantos das faces selecionadas), deduplicados, ordem de id ORIGINAL crescente
    const afetados = new Set();
    for (const fid of faceIds) for (const v of st.F.get(fid).vs) afetados.add(v);
    const vertsOrdenados = [...afetados].sort((x, y) => x - y);

    // guarda de overflow (D3): conta ANTES de inserir — só vértice NÃO-soldado consome id novo
    let nVNovos = 0;
    for (const v of vertsOrdenados) { const p = st.V.get(v); if (p && p[ax] !== pos) nVNovos++; }
    if (nVNovos > BLOCO || faceIds.length > BLOCO) throw new Error(`oficina: espelha estoura o bloco de ids (${BLOCO}): ${nVNovos} vértice(s) novo(s) / ${faceIds.length} face(s) nova(s)`);

    // mapa orig -> espelho (soldado = mapeia pra si mesmo; fora = novo id do bloco, em ordem)
    const mapa = new Map();
    let cursorV = 0;
    for (const v of vertsOrdenados) {
      const p = st.V.get(v);
      if (!p) { mapa.set(v, v); continue; }              // defensivo (canto sem posição — nunca corrompe)
      if (p[ax] === pos) { mapa.set(v, v); continue; }   // NO plano: soldado, sem id novo
      const q = p.slice(); q[ax] = 2 * pos - p[ax];
      const novo = b + cursorV; cursorV++;
      addV(st, novo, q);
      mapa.set(v, novo);
    }

    // faces novas: cursor de face PRÓPRIO, cantos revertidos (desfaz a troca de mão do espelho)
    let cursorF = 0;
    const copias = new Map();
    for (const fid of faceIds) {
      const f = st.F.get(fid);
      // face INTEIRAMENTE no plano (TODOS os cantos soldados): a espelhada teria os MESMOS cantos
      // revertidos = uma face COINCIDENTE de normal OPOSTA no mesmo lugar (z-fight; e o teste de
      // manifold é CEGO a ela — as arestas se pareiam). GRITA e PULA (0 face, cursor NÃO avança),
      // o mesmo tratamento do `polo↔polo` degenerado do lathe.
      if (!estrutural && f.vs.every((v) => mapa.get(v) === v)) { grita(st, i, 'espelha', fid, 'face inteiramente no plano do espelho — degenerado (a espelhada seria coincidente), pulada'); continue; }
      const vs = f.vs.map((v) => mapa.get(v)).reverse();
      const novo = b + cursorF; cursorF++;
      addF(st, novo, vs);
      if (estrutural) copias.set(fid, novo);
      const nf = st.F.get(novo);
      nf.cor = f.cor; nf.material = f.material; nf.parte = f.parte; nf.liso = f.liso; nf.solido = f.solido;
    }
    if (estrutural) registraOrigem(st, i, 'espelha', a.origemId, {
      derivaDe, copias, transformacao: { tipo: 'espelho', eixo: ax, pos },
    });
  },

  /* arranja (O-13) — REPETE uma origem estrutural N vezes, em torno de um eixo
     (`modo:'radial'`) ou ao longo de um deslocamento (`modo:'linear'`). MEATY
     como o `espelha`: cria vértices e faces NOVOS, ids do BLOCO do passo, é
     FORMATO SALVO.

     POR QUE ELA EXISTE (O-13, medido em RELATO-RODA-REALISTA.md): o único
     mecanismo de repetição do núcleo era o `espelha`, que resolve simetria de
     duas vias e nada mais. Toda outra repetição era desenrolada à mão — para
     declarar dez braços em cinco pares em torno do eixo X, a roda experimental
     gerou CEM parâmetros de coordenada e terminou com 141, dos quais só uma
     fração é decisão dimensional. A intenção "cinco pares em torno do eixo X"
     não existia em lugar nenhum do arquivo; existia a expansão dela. O custo
     aparece no que NÃO foi modelado: o cubo do freio não tem prisioneiro de
     roda e o disco não tem aleta de ventilação — círculo de parafusos e arranjo
     radial, as duas figuras mecânicas mais comuns que existem.

     ESTRUTURAL SEMPRE, sem modo legado. O `espelha` tem um modo antigo que
     copia sem publicar identidade, porque ele é anterior ao O-6; esta op nasce
     depois e não repete o erro — `origemId`, `derivaDe` e `sel:{origem:…}` são
     OBRIGATÓRIOS, e é por construção que não existe cópia anônima. Endereçar a
     coleção e cada cópia é o contrato `CONTRATOS_ORIGEM.arranja`, acima.

     CONTAGEM (`total`, dimensional — pode citar PARAM): quantas instâncias a
     coleção tem CONTANDO A FONTE. "Cinco braços" é `total:5`, e a op cria 4
     cópias. Escolhido assim porque `total` é a palavra que o autor mecânico já
     usa ("seis prisioneiros", "doze aletas"); contar cópias obrigaria a
     escrever 5 para dizer seis, que é a mesma aritmética escondida que o item
     veio matar. `total` precisa ser inteiro ≥ 2 — `1` seria "arranjo de um
     elemento", isto é, um passo que não faz nada, e no-op silencioso é o que o
     CLAUDE.md proíbe.

     PASSO ANGULAR (`modo:'radial'`), EXATAMENTE UMA das duas palavras — dar as
     duas GRITA, não dar nenhuma GRITA:
       `volta`  graus varridos pela coleção FECHADA; o passo é `volta/total`.
                `volta:360, total:6` = seis a cada 60°, e a sexta NÃO volta em
                cima da fonte. É a forma do círculo de parafusos;
       `graus`  o passo entre instâncias consecutivas, direto, como no
                `rotaciona`. A coleção varre `graus·(total−1)`. É a forma do
                arco aberto ("cinco aletas a cada 15°").
     As duas dizem coisas diferentes e nenhuma é derivável da outra sem eu
     ADIVINHAR se o arco fecha; ambiguidade grita, nunca escolhe.

     DETERMINISMO DO ÂNGULO (formato salvo): o ângulo da cópia `k` é
     `(k+1)·passo`, DERIVADO da contagem — nunca acumulado somando o passo
     sucessivamente, que faria o erro de ponto flutuante crescer com o índice e
     entrar no arquivo salvo. Cada cópia é gerada da posição ORIGINAL da fonte,
     não da cópia anterior: 359,99999° não existe aqui.

     PIVÔ (`pivo`, opcional `[x,y,z]`, dimensional): AUSENTE = `[0,0,0]`, a
     origem do mundo. É DIFERENTE do `rotaciona`, cujo default é o centroide dos
     afetados, e a diferença é deliberada: um arranjo radial gira em torno do
     EIXO DA PEÇA (onde toda primitiva deste núcleo nasce), e um default que
     dependesse da seleção poria o centro do arranjo no meio do próprio braço —
     silenciosamente errado, e plausível na foto. Default declarado ganha de
     default esperto.

     DESLOCAMENTO (`modo:'linear'`): `d` (`[x,y,z]`, dimensional) é o passo de
     UMA instância, a mesma palavra e o mesmo significado do `transladar`; a
     cópia `k` fica em `p + (k+1)·d`. `d` nulo GRITA (cópias coincidentes).

     COINCIDÊNCIA GRITA: no radial, uma cópia cujo ângulo é múltiplo exato de
     360° cai em cima da fonte (`graus:180, total:3` põe a segunda cópia de
     volta na origem). Isso é geometria duplicada no mesmo lugar, invisível na
     foto e cega para o teste de manifold — a mesma classe do degenerado do
     `espelha`. Grita e NÃO cria nada.

     SOLDA NO EIXO (radial, decisão fixa, formato salvo): um vértice cujas DUAS
     coordenadas fora do eixo são EXATAMENTE as do pivô está SOBRE o eixo — a
     rotação não o move —, então toda cópia REUSA o id original em vez de
     empilhar N vértices no mesmo ponto. É o mesmo teste de igualdade EXATA (não
     tolerância) do weld do `espelha` e do polo `raio===0` do `lathe`. No linear
     não há ponto fixo, então não há solda.

     NUMERAÇÃO (formato salvo, travada por teste): as faces da fonte em ordem
     CRESCENTE de id; os vértices afetados (cantos dessas faces, deduplicados)
     em ordem CRESCENTE de id. Um cursor de vértice e um cursor de face, os dois
     começando em 0 e andando na ordem cópia 0, cópia 1, … — vértice soldado no
     eixo não consome id. Cada cópia ocupa uma corrida contígua de faces. Os
     cantos NÃO são revertidos (rotação e translação preservam a mão; só o
     espelho a troca), e cor/material/parte/liso/solido são HERDADOS da face
     fonte, como no `espelha`.

     COMPLETUDE: como no `espelha` estrutural, a saída é uma origem INTEIRA ou
     não é nada. Face sem posição, ou face inteiramente sobre o eixo, aborta o
     passo ANTES de reservar qualquer id — nunca sobra meia coleção endereçável. */

  };
}
