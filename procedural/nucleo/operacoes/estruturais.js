/* estruturais.js — operações do grupo, isoladas por serviços explícitos do núcleo. */
export function criarOperacoesEstruturais(servicos) {
  const { BLOCO, baseDoPasso, norm3, resolverLados, indiceDeAxi, giraPonto, transformarInterfaceDaPorta, transformacoesDaOrigemDaPorta, Face, addV, addF, grita, nomeDeParteInvalido, registraOrigem, origensIguais, CONTRATOS_ORIGEM, validarOrigem, textoDeclaracoes, resolverOrigem, faceUnicaEstrutural, resolverAlvosV, poligonoPlano, convexoCCW, margemDentro, bordaAnular, aneisSeSobrepoem, particionar, operacoesEdicaoDireta, resolverInterfaceCilindricaDaPorta } = servicos;
  return {
  publicarPorta(st, a, i) {
    const usaNomeLegado = a.nome !== undefined;
    const usaId = a.id !== undefined;
    if (usaNomeLegado === usaId) return grita(st, i, 'publicarPorta', 'id', 'declare exatamente um identificador: nome (legado) ou id (estável)');
    const chave = usaId ? a.id : a.nome;
    const erroChave = nomeDeParteInvalido(chave);
    if (erroChave) return grita(st, i, 'publicarPorta', usaId ? 'id' : 'nome', `${usaId ? 'id estável' : 'nome da porta'} ${erroChave}`);
    if (usaNomeLegado && a.rotulo !== undefined) return grita(st, i, 'publicarPorta', 'rotulo', 'rotulo só acompanha a forma nova {id, rotulo, de}');
    const rotulo = usaId ? (a.rotulo === undefined ? chave : a.rotulo) : null;
    if (usaId) {
      const erroRotulo = nomeDeParteInvalido(rotulo);
      if (erroRotulo) return grita(st, i, 'publicarPorta', 'rotulo', `rótulo da porta ${erroRotulo}`);
    }
    if (st.portas.has(chave)) return grita(st, i, 'publicarPorta', usaId ? 'id' : 'nome', `porta '${chave}' já foi publicada no passo ${st.portas.get(chave).passo}`);
    const validacao = validarOrigem(a.de);
    if (validacao.erro) return grita(st, i, 'publicarPorta', 'de', `porta exige de:{op,id,...} estrutural válido: ${validacao.erro}`);
    const resultado = resolverOrigem(st, a.de);
    if (resultado.erro) return grita(st, i, 'publicarPorta', 'de', resultado.erro);
    const interfaceResolvida = resolverInterfaceCilindricaDaPorta(st, a.interface);
    if (interfaceResolvida.erro) return grita(st, i, 'publicarPorta', 'interface', interfaceResolvida.erro);
    const derivacao = interfaceResolvida.interface === undefined
      ? { transformacoes: [] }
      : transformacoesDaOrigemDaPorta(st, a.de);
    if (derivacao.erro) return grita(st, i, 'publicarPorta', 'de', derivacao.erro);
    st.portas.set(chave, {
      de: a.de, passo: i,
      interface: transformarInterfaceDaPorta(interfaceResolvida.interface, derivacao.transformacoes),
      ...(usaId ? { id: chave, rotulo } : {}),
    });
  },

  /* ---- edição por id estável ---- */
  ...operacoesEdicaoDireta,

  encostar(st, a, i) {
    if (a.direcao == null) return grita(st, i, 'encostar', 'direcao', 'encostar exige direcao:[x,y,z] — para onde empurrar. Inferir a direção é onde nasceria a ambiguidade que faria a peça deixar de ser reexecutável');
    if (typeof a.direcao !== 'string' && (!Array.isArray(a.direcao) || a.direcao.length !== 3)) return grita(st, i, 'encostar', 'direcao', `direcao precisa ser [x,y,z] (3 elementos) ou o nome de um ponto declarado; recebido ${JSON.stringify(a.direcao)}`);
    const bruta = st.vec(a.direcao);
    const norma = Math.hypot(bruta[0], bruta[1], bruta[2]);
    if (!(norma > 1e-9)) return grita(st, i, 'encostar', 'direcao', `direcao é o vetor nulo (${JSON.stringify(bruta)}) — não aponta para lado nenhum`);
    const u = [bruta[0] / norma, bruta[1] / norma, bruta[2] / norma];

    const folga = a.folga == null ? 0 : st.num(a.folga);
    if (!(folga >= 0)) return grita(st, i, 'encostar', 'folga', `folga precisa ser ≥ 0 (recebido ${JSON.stringify(a.folga)} = ${folga}); folga negativa é interferência declarada, e este passo não a promete — use transladar para invadir de propósito`);

    if (a.referencia == null) return grita(st, i, 'encostar', 'referencia', 'encostar exige referencia:{...} — o lado que NÃO se move, na mesma linguagem de seleção do sel');
    const movidos = resolverAlvosV(st, a.sel, 'encostar', i);
    if (!movidos.size) return grita(st, i, 'encostar', 'sel', 'sel não resolveu vértice nenhum: encostar sem alvo seria um no-op silencioso');
    const referencia = resolverAlvosV(st, a.referencia, 'encostar', i);
    if (!referencia.size) return grita(st, i, 'encostar', 'referencia', 'referencia não resolveu vértice nenhum: sem referência não existe contato a derivar');

    /* Um vértice nos dois lados faria a peça encostar em si mesma: a conta
       ainda daria um número, e o número seria mentira. */
    for (const v of movidos) {
      if (referencia.has(v)) return grita(st, i, 'encostar', 'referencia', `o vértice ${v} está em sel e em referencia ao mesmo tempo — um corpo não encosta em si mesmo; separe as duas seleções`);
    }

    const proj = (v) => { const p = st.V.get(v); return p[0] * u[0] + p[1] * u[1] + p[2] * u[2]; };
    let frenteDoMovel = -Infinity;
    for (const v of movidos) frenteDoMovel = Math.max(frenteDoMovel, proj(v));
    let traseiraDaReferencia = Infinity;
    for (const v of referencia) traseiraDaReferencia = Math.min(traseiraDaReferencia, proj(v));

    const t = traseiraDaReferencia - frenteDoMovel - folga;
    for (const v of movidos) {
      const p = st.V.get(v);
      st.V.set(v, [p[0] + u[0] * t, p[1] + u[1] * t, p[2] + u[2] * t]);
    }
  },

  arranja(st, a, i) {
    const modo = a.modo;
    if (modo !== 'radial' && modo !== 'linear') return grita(st, i, 'arranja', modo, `modo '${modo}' desconhecido (só 'radial' e 'linear')`);

    const total = st.num(a.total ?? 0);
    if (!Number.isSafeInteger(total) || total < 2) return grita(st, i, 'arranja', 'total', `total precisa ser inteiro ≥ 2 (a fonte conta como instância); recebido ${JSON.stringify(a.total ?? null)} = ${total}`);
    const nCopias = total - 1;

    /* ---- NOMES DAS CÓPIAS (atrito A-4 da família de identidade) ----
       Sem isto, a única forma de citar uma cópia é `copia: 2`, uma POSIÇÃO — e
       posição é exatamente o que o repositório proíbe como identidade, porque
       inserir uma instância no meio faz `copia: 2` passar a apontar para outra
       tábua sem erro nenhum. `nomes` dá endereço de autor a cada cópia, igual
       ao `grupo` do `furo`, e é ele que sobrevive a uma inserção.

       A lista é EXATA, não parcial: nomear metade das cópias produziria uma
       peça em que metade dos alvos é estável e a outra metade não, e a receita
       não teria como dizer qual é qual. */
    let nomesDasCopias = null;
    if (a.nomes != null) {
      if (!Array.isArray(a.nomes)) return grita(st, i, 'arranja', 'nomes', `nomes é a lista de endereços das cópias, na ordem em que elas nascem; recebido ${JSON.stringify(a.nomes)}`);
      if (a.nomes.length !== nCopias) return grita(st, i, 'arranja', 'nomes', `nomes tem ${a.nomes.length} entrada(s) e este arranjo cria ${nCopias} cópia(s) (total ${total} conta a fonte): nomear só uma parte deixaria o resto endereçável apenas por posição`);
      const vistos = new Set();
      for (let k = 0; k < a.nomes.length; k++) {
        const erroNome = nomeDeParteInvalido(a.nomes[k]);
        if (erroNome) return grita(st, i, 'arranja', 'nomes', `nomes[${k}] ${erroNome}`);
        if (vistos.has(a.nomes[k])) return grita(st, i, 'arranja', 'nomes', `nomes[${k}] repete '${a.nomes[k]}'; nome é identidade, e duas cópias com o mesmo nome não são endereçáveis`);
        vistos.add(a.nomes[k]);
      }
      nomesDasCopias = a.nomes.slice();
    }

    // ---- parâmetros do modo: um GRITO por ambiguidade, um por ausência ----
    let ax = -1, passoGraus = 0, pivo = [0, 0, 0], d = [0, 0, 0];
    if (modo === 'radial') {
      ax = indiceDeAxi(a.eixo);
      if (ax < 0) return grita(st, i, 'arranja', a.eixo, `eixo '${a.eixo}' desconhecido (só 'x'/'y'/'z')`);
      if (a.d != null) return grita(st, i, 'arranja', 'd', "modo 'radial' não usa d (deslocamento é do modo 'linear')");
      const temVolta = a.volta != null, temGraus = a.graus != null;
      if (temVolta && temGraus) return grita(st, i, 'arranja', 'volta+graus', "volta e graus dizem coisas diferentes (volta = o arco FECHADO da coleção, passo = volta/total; graus = o passo entre instâncias consecutivas) — declare exatamente uma");
      if (!temVolta && !temGraus) return grita(st, i, 'arranja', 'volta+graus', "modo 'radial' exige volta (arco fechado, passo = volta/total) ou graus (passo entre instâncias consecutivas) — exatamente uma");
      passoGraus = temVolta ? st.num(a.volta) / total : st.num(a.graus);
      if (!Number.isFinite(passoGraus)) return grita(st, i, 'arranja', temVolta ? 'volta' : 'graus', 'passo angular não é um número finito');
      for (let k = 1; k <= nCopias; k++) {
        if (k * passoGraus % 360 === 0) return grita(st, i, 'arranja', 'passo', `a cópia ${k - 1} cairia a ${k * passoGraus}° da fonte, um múltiplo exato de 360° — geometria coincidente; nenhuma cópia foi criada`);
      }
      if (a.pivo != null) pivo = st.vec(a.pivo);
    } else {
      if (a.eixo != null || a.volta != null || a.graus != null || a.pivo != null) return grita(st, i, 'arranja', 'eixo/volta/graus/pivo', "modo 'linear' usa só d (eixo, volta, graus e pivo são do modo 'radial')");
      if (a.d == null) return grita(st, i, 'arranja', 'd', "modo 'linear' exige d:[x,y,z], o deslocamento de UMA instância");
      d = st.vec(a.d);
      if (d[0] === 0 && d[1] === 0 && d[2] === 0) return grita(st, i, 'arranja', 'd', 'd nulo põe todas as cópias em cima da fonte — geometria coincidente; nenhuma cópia foi criada');
    }

    // ---- identidade estrutural: obrigatória, e conferida ANTES de tocar na malha ----
    if (a.origemId == null || a.derivaDe == null) return grita(st, i, 'arranja', 'origemId+derivaDe', 'arranja é sempre estrutural: origemId e derivaDe são obrigatórios (sem eles a cópia seria anônima)');
    if (!Number.isSafeInteger(a.origemId) || a.origemId < 0) return grita(st, i, 'arranja', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const declaracoes = st.declaracoesOrigem.get(a.origemId) ?? [];
    if (declaracoes.length > 1) return grita(st, i, 'arranja', 'origemId', textoDeclaracoes(a.origemId, declaracoes));
    const fonteValida = validarOrigem(a.derivaDe);
    if (fonteValida.erro) return grita(st, i, 'arranja', 'derivaDe', `derivaDe inválida: ${fonteValida.erro}`);
    if (a.faces != null || !a.sel || typeof a.sel !== 'object' || Array.isArray(a.sel) || Object.keys(a.sel).length !== 1 || !Object.hasOwn(a.sel, 'origem')) return grita(st, i, 'arranja', 'sel', 'arranja exige sel:{origem:...} direto, sem faces, alias, região ou ids literais');
    const seletor = validarOrigem(a.sel.origem);
    if (seletor.erro || !origensIguais(a.sel.origem, a.derivaDe)) return grita(st, i, 'arranja', 'sel.origem', 'sel.origem precisa ser a mesma origem estrutural declarada em derivaDe');
    const resultado = resolverOrigem(st, a.derivaDe);
    if (resultado.erro) return grita(st, i, 'arranja', 'derivaDe', resultado.erro);

    const faceIds = [...resultado.faces].sort((x, y) => x - y);
    if (!faceIds.length) return grita(st, i, 'arranja', 'derivaDe', 'origem fonte sem face nenhuma');

    // no eixo? (só o radial tem ponto fixo; no linear nada fica parado)
    const noEixo = (p) => modo === 'radial' && p[(ax + 1) % 3] === pivo[(ax + 1) % 3] && p[(ax + 2) % 3] === pivo[(ax + 2) % 3];

    /* completude: a coleção inteira ou nada. Confere TODAS as faces antes de
       reservar id — face sem posição não tem cópia, e face inteiramente sobre o
       eixo teria cópia COINCIDENTE (todos os cantos parados). */
    for (const fid of faceIds) {
      const f = st.F.get(fid);
      if (!f || f.vs.some((v) => !st.V.has(v))) return grita(st, i, 'arranja', fid, 'não foi possível criar a cópia: face ou vértice-fonte inexistente; nenhuma cópia foi criada');
      if (f.vs.every((v) => noEixo(st.V.get(v)))) return grita(st, i, 'arranja', fid, 'face inteiramente sobre o eixo do arranjo — a cópia seria coincidente; nenhuma cópia foi criada');
    }

    const afetados = new Set();
    for (const fid of faceIds) for (const v of st.F.get(fid).vs) afetados.add(v);
    const vertsOrdenados = [...afetados].sort((x, y) => x - y);

    // guarda de overflow (D3): conta ANTES de inserir — vértice no eixo não consome id
    const nVPorCopia = vertsOrdenados.filter((v) => !noEixo(st.V.get(v))).length;
    const nVNovos = nVPorCopia * nCopias, nFNovos = faceIds.length * nCopias;
    if (nVNovos > BLOCO || nFNovos > BLOCO) throw new Error(`oficina: arranja estoura o bloco de ids (${BLOCO}): ${nVNovos} vértice(s) novo(s) / ${nFNovos} face(s) nova(s)`);

    const b = baseDoPasso(i);
    let cursorV = 0, cursorF = 0;
    const copias = [];
    for (let k = 0; k < nCopias; k++) {
      // ângulo DERIVADO do índice, nunca acumulado: (k+1)·passo, sempre a partir da fonte
      const rad = modo === 'radial' ? ((k + 1) * passoGraus * Math.PI) / 180 : 0;
      const c = Math.cos(rad), s = Math.sin(rad);
      const mapa = new Map();
      for (const v of vertsOrdenados) {
        const p = st.V.get(v);
        if (noEixo(p)) { mapa.set(v, v); continue; }   // sobre o eixo: soldado, sem id novo
        const q = modo === 'radial' ? giraPonto(p, pivo, ax, c, s) : [p[0] + (k + 1) * d[0], p[1] + (k + 1) * d[1], p[2] + (k + 1) * d[2]];
        const novo = b + cursorV; cursorV++;
        addV(st, novo, q);
        mapa.set(v, novo);
      }
      const copiaDaFace = new Map();
      for (const fid of faceIds) {
        const f = st.F.get(fid);
        const novo = b + cursorF; cursorF++;
        addF(st, novo, f.vs.map((v) => mapa.get(v)));   // sem reverter: rotação e translação preservam a mão
        copiaDaFace.set(fid, novo);
        const nf = st.F.get(novo);
        nf.cor = f.cor; nf.material = f.material; nf.parte = f.parte; nf.liso = f.liso; nf.solido = f.solido;
      }
      copias.push(copiaDaFace);
    }
    registraOrigem(st, i, 'arranja', a.origemId, {
      derivaDe: a.derivaDe,
      copias,
      nomesDasCopias,
      transformacao: modo === 'radial'
        ? { modo, eixo: ax, passoGraus, pivo: pivo.slice() }
        : { modo, d: d.slice() },
    });
  },

  /* furo (ciclo "Corte e orientação de seção v1") — ABRE VAZIO: um furo
     CILÍNDRICO numa face plana e convexa, PASSANTE (sai por outra face) ou
     CEGO (para numa profundidade). É a operação mais estreita que resolve os
     três casos reais de uma vez: o prisioneiro de roda, o parafuso de móvel e o
     furo de eixo de carroça. Móvel, robô, carroça, instrumento e carro têm
     furo; nada aqui sabe o que é um freio.

     POR QUE ELA EXISTE (RELATO-RODA-REALISTA, "Sem subtração ou corte
     volumétrico"): a linguagem não tinha NENHUMA subtração, e a saída sempre
     foi montar a peça EM VOLTA do vazio — abertura central pelo perfil anular,
     janela deixando o espaço em branco, fixador virando porca sobre o miolo. O
     custo aparece no que não foi modelado: o cubo do freio não tem furo de
     prisioneiro e a roda não tem furo de fixação de verdade.

     POR QUE NÃO É UMA BOOLEANA GENÉRICA, e isto é a decisão central do item:
     uma booleana genérica destrói a identidade de dezenas de faces de uma vez,
     em silêncio — o oposto do que O-6 e O-12 vieram garantir. Aqui o corte
     toca EXATAMENTE as faces que o autor nomeou (a entrada e, no passante, a
     saída), toda face criada nasce endereçável pela origem `furo`, e toda face
     destruída fica registrada em `st.consumidas`, que faz a citação seguinte
     GRITAR em vez de devolver a peça pela metade.

     ARGUMENTOS
       `origemId`      OBRIGATÓRIO. Sem ele as 3·lados faces seriam anônimas —
                       o furo não tem modo legado, como o `arranja`;
       `de`            OBRIGATÓRIO, a origem estrutural da face de ENTRADA
                       (`{op:'cubo', id:1, face:'topo'}`), que precisa resolver
                       para EXATAMENTE uma face. Duas faces = endereço ambíguo,
                       e ambiguidade grita;
       `centro`        `[x,y,z]` dimensional (pode citar PARAM), UM furo. É
                       PROJETADO no plano da entrada — o autor dá o ponto do
                       mundo onde o furo passa, não uma coordenada de face.
                       Sem default: o centroide da face seria um default
                       ESPERTO, e um furo que muda de lugar quando a face muda
                       de forma é a classe de surpresa que este núcleo recusa;
       `centros`       VÁRIOS furos no mesmo passo (F1/A-30), como lista de
                       grupos na ordem escrita. Cada item é:
                         `[x,y,z]` — um ponto que herda raio e profundidade do
                           passo;
                         `{nome?, centro:[x,y,z], raio?, profundidade?}` — um DISCO
                           com medidas próprias opcionais;
                         `{nome?, pivo?, distancia, total, volta|graus, raio?,
                           profundidade?}` — um CÍRCULO de discos, cujas
                           medidas opcionais valem para cada um dos `total`
                           furos. O círculo de topo continua aceito com a mesma
                           gramática. `total`, `volta` e `graus` significam o
                           mesmo que em `arranja`; o círculo mora no plano da
                           entrada e o furo 0 segue a direção `+u` (ou
                           `orientacao`). Assim a peça diz quantos furos há e a
                           que distância, sem seno nem cosseno no formato salvo
                           (A-29).
                       `centro` e `centros` dizem a mesma coisa em número
                       diferente: as duas juntas GRITAM, nenhuma das duas
                       GRITA. `centros` com UM ponto é idêntico a `centro`;
       `raio`          PARAM dimensional > 0, padrão do passo. Pode faltar
                       somente se TODO furo vindo de `centros` declarar o seu
                       próprio raio; `centro` singular sempre usa o padrão;
       `lados`         TOPO (padrão 8, mín 3): número explícito ou
                       `{desvio: medida}`. A frase deriva a menor contagem pela
                       flecha do MAIOR raio deste passo; muda a CONTAGEM, logo
                       renumera quando raio ou desvio cruzam uma fronteira;
       `saida`         a origem estrutural da face de SAÍDA — furo PASSANTE;
       `profundidade`  PARAM dimensional > 0, padrão do passo para furo CEGO.
                       Pode faltar somente se TODO furo vindo de `centros`
                       declarar sua própria profundidade; é proibida no item
                       de um passo PASSANTE. `saida` e a profundidade do passo
                       dizem coisas diferentes e as duas juntas GRITAM;
       `orientacao`    opcional `[x,y,z]`: a direção do mundo para onde aponta o
                       vértice 0 do anel, projetada no plano da entrada — a
                       MESMA chave e a MESMA regra do `loft` deste ciclo. Serve
                       para alinhar a fase de vários furos entre si (um círculo
                       de prisioneiros com a mesma orientação tem os anéis em
                       fase). Ausente, o quadro determinístico de sempre.

     EIXO: o furo desce pela NORMAL da face de entrada, para dentro do material
     (`-N`). Não há chave de direção oblíqua — furo torto é outra operação, e
     inventá-la aqui seria a generalidade traiçoeira que o item excluiu.

     NUMERAÇÃO (formato salvo, travada por teste). Com `L = lados`, `M` anéis e
     `b` a base do passo — o furo `k` ocupa uma corrida contígua, e com `M = 1`
     a conta inteira colapsa na numeração de sempre:
       VÉRTICES  `b+2Lk+j`     (j=0..L-1) o anel do furo k na face de ENTRADA;
                 `b+2Lk+L+j`   o anel do outro lado (a saída, ou o fundo).
                 Total 2LM — nenhum vértice antigo é criado ou removido, e os
                 cantos ORIGINAIS das faces cortadas continuam de pé (é o que
                 impede fenda com as faces vizinhas). A borda de vários anéis
                 também não cria vértice: ela é triangulada sobre os cantos que
                 já existem, para que nenhuma face vizinha fique com um vértice
                 no meio de uma aresta dela.
       FACES     `b+3Lk+j`     a BORDA de entrada j do furo k (contém a aresta
                               j→j+1 do anel k);
                 `b+3Lk+L+j`   a PAREDE j do furo k (normal para o eixo);
                 `b+3Lk+2L+j`  a BORDA de saída j — só PASSANTE;
                 `b+3Lk+2L`    o FUNDO do furo k — só CEGO (uma face só; as
                               faixas `saida` e `fundo` nunca coexistem, por
                               isso partilham a base sem colidir);
                 `b+3LM+t`     o PREENCHIMENTO da entrada — só com M ≥ 2. São
                               `n+2M−2` faces, com `n` cantos do contorno;
                 depois dele, o PREENCHIMENTO DA SAÍDA, com a mesma conta sobre
                 os cantos da face de saída — só PASSANTE com M ≥ 2.
     A borda tem SEMPRE L faces por anel, independentemente de quantos cantos a
     face cortada tinha: mudar `raio` ou `centro` muda a FORMA de cada face da
     borda, nunca o id dela. O preenchimento é a superfície que não toca anel
     nenhum; ele é família, e a posição dentro dela é a ordem da partição.

     HERANÇA: cor, material, parte, liso e solido da face de ENTRADA vão para a
     borda de entrada, para a parede e para o fundo; os da face de SAÍDA vão
     para a borda de saída. É a mesma lei do `espelha`/`arranja`. `tinta`
     (pincel livre) NÃO é herdada: ela é ancorada em coordenada de face, e a
     face mudou de forma — herdar seria carimbar a pincelada em outro lugar.

     COMPLETUDE, a lei do `arranja`: TUDO é conferido antes de reservar um id.
     Face não-plana, face côncava, anel encostando ou saindo do contorno, saída
     que o eixo não atravessa, saída igual à entrada, raio ≤ 0, profundidade
     ≤ 0, DOIS ANÉIS QUE SE CRUZAM OU SE ENCOSTAM (na entrada ou na saída, que
     é onde a projeção oblíqua pode aproximá-los), lista de centros vazia,
     centro de aridade errada e partição que não fecha — cada um GRITA nomeando
     a causa e o passo inteiro aborta com 0 V/0 F. Nunca sobra meio furo, e
     dois furos sobrepostos nunca viram um furo em oito. */
  furo(st, a, i) {
    const b = baseDoPasso(i);

    // ---- identidade estrutural: obrigatória, conferida antes de tocar na malha ----
    if (a.origemId == null) return grita(st, i, 'furo', 'origemId', 'furo é sempre estrutural: origemId é obrigatório (sem ele as faces do corte nasceriam anônimas)');
    if (!Number.isSafeInteger(a.origemId) || a.origemId < 0) return grita(st, i, 'furo', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const declaracoes = st.declaracoesOrigem.get(a.origemId) ?? [];
    if (declaracoes.length > 1) return grita(st, i, 'furo', 'origemId', textoDeclaracoes(a.origemId, declaracoes));

    // ---- modo: exatamente uma palavra, como volta/graus do arranja ----
    const temSaida = a.saida != null, temProfundidade = a.profundidade != null;
    if (temSaida && temProfundidade) return grita(st, i, 'furo', 'saida+profundidade', "saida e profundidade dizem coisas diferentes (saida = a face por onde o furo SAI, passante; profundidade = onde ele PARA, cego) — declare exatamente uma");

    /* ---- QUANTOS furos: `centro` (um) ou `centros` (vários grupos) ---- */
    const temCentro = a.centro != null, temCentros = a.centros != null;
    if (temCentro && temCentros) return grita(st, i, 'furo', 'centro+centros', 'centro e centros dizem a mesma coisa em número diferente (centro = UM furo; centros = vários no mesmo passo) — declare exatamente uma');
    if (!temCentro && !temCentros) return grita(st, i, 'furo', 'centro', 'furo exige centro:[x,y,z] — o ponto do mundo por onde ele passa, projetado no plano da entrada — ou centros, para vários furos no mesmo passo');
    /* `ate` é o segundo centro de UM rasgo, então ele acompanha `centro`. Em
       `centros`, cada rasgo declara o próprio `ate` no seu disco: um `ate` de
       passo alongaria todos os furos da lista de uma vez, e isso é alterar
       geometria que a receita não pediu. */
    if (a.ate != null && temCentros) return grita(st, i, 'furo', 'ate', 'ate alonga UM furo em rasgo e acompanha centro; com centros, declare ate dentro do disco que vira rasgo');
    const conferirPonto = (p, nome) => {
      if (!Array.isArray(p) || p.length !== 3) return `${nome} precisa ser [x,y,z] (3 elementos); recebido ${JSON.stringify(p)}`;
      const v = st.vec(p);
      if (!v.every((n) => Number.isFinite(n))) return `${nome} não é um ponto finito: ${JSON.stringify(v)}`;
      return null;
    };

    /* Cada item vira uma FONTE. A expansão só acontece depois de conhecer o
       quadro da face, mas a ordem das fontes já é a ordem semântica dos furos:
       ponto, disco ou os `total` pontos de um círculo ocupam k=0,1,2… exatamente
       como eram antes. `raio` do item é PARAM; L continua único no passo porque
       é TOPO e decide a numeração do bloco. No modo `{desvio}`, L só é resolvido
       depois dos raios e usa o maior deles. */
    const fontes = [];
    const nomesDeGrupo = new Map();
    const lerNomeDeGrupo = (item, onde) => {
      if (item.nome == null) return { nome: null };
      const erro = nomeDeParteInvalido(item.nome);
      if (erro) return { erro: `${onde} tem nome de grupo inválido: ${erro}` };
      const anterior = nomesDeGrupo.get(item.nome);
      if (anterior != null) return { erro: `${onde} repete o nome de grupo '${item.nome}', já declarado em ${anterior}; grupo é identidade semântica, não posição` };
      nomesDeGrupo.set(item.nome, onde);
      return { nome: item.nome };
    };
    const lerCirculo = (item, nome) => {
      const chaves = ['nome', 'pivo', 'distancia', 'total', 'volta', 'graus', 'raio', 'profundidade'];
      const estranha = Object.keys(item).find((k) => !chaves.includes(k));
      if (estranha) return { erro: `${nome} em círculo usa ${chaves.join(', ')} — '${estranha}' não é palavra desta forma` };
      const grupo = lerNomeDeGrupo(item, nome);
      if (grupo.erro) return grupo;
      const total = st.num(item.total ?? 0);
      if (!Number.isSafeInteger(total) || total < 2) return { erro: `${nome} em círculo precisa de total inteiro ≥ 2 (um círculo de um furo é o próprio centro); recebido ${JSON.stringify(item.total ?? null)} = ${total}` };
      const distancia = st.num(item.distancia ?? 0);
      if (!(distancia > 0) || !Number.isFinite(distancia)) return { erro: `${nome} em círculo precisa de distancia > 0 (o raio do círculo de furos, não o do furo); recebido ${JSON.stringify(item.distancia ?? null)} = ${distancia}` };
      const temVolta = item.volta != null, temGraus = item.graus != null;
      if (temVolta && temGraus) return { erro: 'volta e graus dizem coisas diferentes (volta = o arco FECHADO do círculo, passo = volta/total; graus = o passo entre furos consecutivos) — declare exatamente uma' };
      if (!temVolta && !temGraus) return { erro: `${nome} em círculo exige volta (arco fechado, passo = volta/total) ou graus (passo entre furos consecutivos) — exatamente uma` };
      const passoGraus = temVolta ? st.num(item.volta) / total : st.num(item.graus);
      if (!Number.isFinite(passoGraus)) return { erro: 'o passo angular do círculo não é um número finito' };
      for (let k = 1; k < total; k++) if (k * passoGraus % 360 === 0) return { erro: `o furo ${k} cairia a ${k * passoGraus}° do furo 0, um múltiplo exato de 360° — dois furos no mesmo lugar; nenhum furo foi aberto` };
      let pivo = [0, 0, 0];
      if (item.pivo != null) {
        const erro = conferirPonto(item.pivo, 'pivo');
        if (erro) return { erro };
        pivo = st.vec(item.pivo);
      }
      return { fonte: { tipo: 'circulo', nome: grupo.nome, pivo, distancia, total, passoGraus, raio: item.raio, profundidade: item.profundidade } };
    };
    if (temCentro) {
      const erro = conferirPonto(a.centro, 'centro');
      if (erro) return grita(st, i, 'furo', 'centro', erro);
      let fim = null;
      if (a.ate != null) {
        const erroFim = conferirPonto(a.ate, 'ate');
        if (erroFim) return grita(st, i, 'furo', 'ate', erroFim);
        fim = st.vec(a.ate);
      }
      fontes.push({ tipo: 'ponto', nome: null, ponto: st.vec(a.centro), fim, raio: undefined, profundidade: undefined });
    } else if (Array.isArray(a.centros)) {
      if (!a.centros.length) return grita(st, i, 'furo', 'centros', 'centros é uma lista vazia — um passo que não abre furo nenhum é um no-op silencioso');
      for (let k = 0; k < a.centros.length; k++) {
        const item = a.centros[k];
        if (Array.isArray(item)) {
          const erro = conferirPonto(item, `centros[${k}]`);
          if (erro) return grita(st, i, 'furo', 'centros', erro);
          fontes.push({ tipo: 'ponto', nome: null, ponto: st.vec(item), fim: null, raio: undefined, profundidade: undefined });
        } else if (item && typeof item === 'object' && Object.prototype.hasOwnProperty.call(item, 'centro')) {
          const chaves = ['nome', 'centro', 'ate', 'raio', 'profundidade'];
          const estranha = Object.keys(item).find((nome) => !chaves.includes(nome));
          if (estranha) return grita(st, i, 'furo', 'centros', `centros[${k}] como disco usa ${chaves.join(', ')} — '${estranha}' não é palavra desta forma`);
          const grupo = lerNomeDeGrupo(item, `centros[${k}]`);
          if (grupo.erro) return grita(st, i, 'furo', 'centros', grupo.erro);
          const erro = conferirPonto(item.centro, `centros[${k}].centro`);
          if (erro) return grita(st, i, 'furo', 'centros', erro);
          let fim = null;
          if (item.ate != null) {
            const erroFim = conferirPonto(item.ate, `centros[${k}].ate`);
            if (erroFim) return grita(st, i, 'furo', 'centros', erroFim);
            fim = st.vec(item.ate);
          }
          fontes.push({ tipo: 'ponto', nome: grupo.nome, ponto: st.vec(item.centro), fim, raio: item.raio, profundidade: item.profundidade });
        } else if (item && typeof item === 'object') {
          const r = lerCirculo(item, `centros[${k}]`);
          if (r.erro) return grita(st, i, 'furo', 'centros', r.erro);
          fontes.push(r.fonte);
        } else {
          return grita(st, i, 'furo', 'centros', `centros[${k}] precisa ser [x,y,z], um disco {nome?, centro, ate?, raio?, profundidade?} ou um círculo {nome?, pivo, distancia, total, volta|graus, raio?, profundidade?}; recebido ${JSON.stringify(item)}`);
        }
      }
    } else if (a.centros && typeof a.centros === 'object') {
      const r = lerCirculo(a.centros, 'centros');
      if (r.erro) return grita(st, i, 'furo', 'centros', r.erro);
      fontes.push(r.fonte);
    } else {
      return grita(st, i, 'furo', 'centros', `centros é uma lista [[x,y,z], …] ou um círculo {pivo, distancia, total, volta|graus}; recebido ${JSON.stringify(a.centros)}`);
    }
    let referencia = null;
    if (a.orientacao != null) {
      if (!Array.isArray(a.orientacao) || a.orientacao.length !== 3) return grita(st, i, 'furo', 'orientacao', `orientacao precisa ser [x,y,z] (3 elementos); recebido ${JSON.stringify(a.orientacao)}`);
      const r = st.vec(a.orientacao);
      if (!(Math.hypot(r[0], r[1], r[2]) > 1e-9)) return grita(st, i, 'furo', 'orientacao', `orientacao é o vetor nulo (${JSON.stringify(r)}) — não aponta direção nenhuma`);
      referencia = norm3(r[0], r[1], r[2]);
    }

    // ---- a face de ENTRADA: uma só, endereçada por origem ----
    const entradaId = faceUnicaEstrutural(st, a.de, 'furo', 'de', i);
    if (entradaId == null) return;
    const entrada = poligonoPlano(st, entradaId, referencia);
    if (entrada.erro) return grita(st, i, 'furo', 'de', `entrada: ${entrada.erro}`);
    const concavaEntrada = convexoCCW(entrada.uv);
    if (concavaEntrada) return grita(st, i, 'furo', 'de', `entrada: ${concavaEntrada} — o furo só corta face convexa`);

    // eixo: para DENTRO do material, pela normal da entrada
    const N = entrada.N;
    const eixo = [-N[0], -N[1], -N[2]];

    /* centros PROJETADOS no plano da entrada. A forma por CÍRCULO nasce aqui,
       no quadro (u,w) da face: é por isso que ela não precisa de seno nem
       cosseno no arquivo salvo, e é por isso que `orientacao` decide onde fica
       o furo 0 — a mesma direção que já decide a fase do anel. */
    const projetarNoPlano = (p) => {
      const d = (p[0] - entrada.centro[0]) * N[0] + (p[1] - entrada.centro[1]) * N[1] + (p[2] - entrada.centro[2]) * N[2];
      return [p[0] - N[0] * d, p[1] - N[1] * d, p[2] - N[2] * d];
    };
    const centros = [], fins = [], raiosBrutos = [], profsBrutos = [], grupos = [];
    for (const fonte of fontes) {
      const inicioDoGrupo = centros.length;
      if (fonte.tipo === 'ponto') {
        centros.push(projetarNoPlano(fonte.ponto));
        /* o segundo centro do rasgo é projetado pelo MESMO plano: os dois
           extremos precisam viver na face de entrada, senão o estádio nasceria
           torto e a margem mediria uma sombra. */
        fins.push(fonte.fim == null ? null : projetarNoPlano(fonte.fim));
        raiosBrutos.push(fonte.raio);
        profsBrutos.push(fonte.profundidade);
      } else {
        const p0 = projetarNoPlano(fonte.pivo);
        for (let q = 0; q < fonte.total; q++) {
          const t = (fonte.passoGraus * q * Math.PI) / 180;
          const cu = Math.cos(t) * fonte.distancia, cw = Math.sin(t) * fonte.distancia;
          centros.push([p0[0] + entrada.u[0] * cu + entrada.w[0] * cw, p0[1] + entrada.u[1] * cu + entrada.w[1] * cw, p0[2] + entrada.u[2] * cu + entrada.w[2] * cw]);
          fins.push(null);
          raiosBrutos.push(fonte.raio);
          profsBrutos.push(fonte.profundidade);
        }
      }
      if (fonte.nome != null) grupos.push({ nome: fonte.nome, furos: Array.from({ length: centros.length - inicioDoGrupo }, (_, q) => inicioDoGrupo + q) });
    }
    const M = centros.length;
    const raiosPorFuro = [];
    let maiorRaio = -Infinity;
    for (let k = 0; k < M; k++) {
      const bruto = raiosBrutos[k] ?? a.raio;
      if (bruto == null) return grita(st, i, 'furo', 'raio', `o furo ${k} não tem raio: nem ele declara um, nem o passo declara o raio padrão`);
      const r = st.num(bruto);
      if (!(r > 0) || !Number.isFinite(r)) return grita(st, i, 'furo', 'raio', `o furo ${k} tem raio inválido (recebido ${JSON.stringify(bruto)} = ${r}); raio precisa ser > 0`);
      raiosPorFuro.push(r);
      maiorRaio = Math.max(maiorRaio, r);
    }
    const resolucao = resolverLados(st, a.lados, maiorRaio);
    if (resolucao.erro) return grita(st, i, 'furo', 'lados', resolucao.erro);
    let L = resolucao.lados;

    /* ---- RASGO (abertura oblonga): o comprimento entre os dois centros ----
       O anel do rasgo é um ESTÁDIO: meia-volta em cada extremo, ligadas por
       dois lados retos. Ele gasta os MESMOS `L` pontos do círculo, e é só por
       isso que borda, parede, saída, tampa, preenchimento, margem, partição e
       o bloco de ids seguem valendo sem exceção — a única coisa que muda é
       ONDE os `L` pontos caem.

       Duas recusas nascem aqui porque as duas produziriam uma promessa falsa:
       um rasgo de comprimento zero é um furo redondo com nome de rasgo, e um
       estádio com menos de dois pontos por extremo não fecha meia-volta —
       viraria um losango se passasse calado. */
    const comprimentosRasgo = [];
    let temRasgo = false;
    for (let k = 0; k < M; k++) {
      const fim = fins[k];
      if (fim == null) { comprimentosRasgo.push(0); continue; }
      temRasgo = true;
      const c0 = centros[k];
      const comp = Math.hypot(fim[0] - c0[0], fim[1] - c0[1], fim[2] - c0[2]);
      if (!(comp > 1e-9 * Math.max(1, entrada.escala))) {
        return grita(st, i, 'furo', 'ate', `o rasgo ${k} tem comprimento ${comp.toFixed(9)} entre centro e ate depois de projetar os dois na face de entrada: um rasgo de comprimento zero é um furo redondo com outro nome — use só centro, ou afaste ate`);
      }
      comprimentosRasgo.push(comp);
    }
    if (temRasgo && L < 4) {
      return grita(st, i, 'furo', 'lados', `o rasgo precisa de pelo menos 4 lados para fechar meia-volta em cada extremo (recebido ${L}): com menos que isso o estádio degenera e a parede deixa de acompanhar o raio`);
    }
    /* `desvio` é uma promessa em metros, e o estádio a cumpriria pela metade se
       nada fosse feito aqui: um extremo com `n` pontos cobre meia-volta em
       `n − 1` cordas, então um anel de `L` pontos erra como um círculo de
       `L − 2`. Os dois pontos a mais devolvem exatamente o passo angular que o
       desvio pediu — sem eles, pedir acabamento fino num rasgo entregaria
       acabamento grosso em silêncio, que é a única falha que este passo não
       pode ter. Contagem explícita não é tocada: quem escreve `lados: 16` pediu
       dezesseis pontos, e recebe dezesseis. */
    if (temRasgo && resolucao.derivado) L += 2;
    /* Uma tolerância microscópica não pode alocar arrays gigantes para só
       depois descobrir o orçamento. Esta conta é um piso: a partição pode
       acrescentar preenchimento, nunca reduzir estes vértices/faces. */
    const nVMin = 2 * L * M;
    const nFMin = M * (temSaida ? 3 * L : 2 * L + 1);
    if (resolucao.derivado && (nVMin > BLOCO || nFMin > BLOCO)) {
      return grita(st, i, 'furo', 'lados', `o desvio ${resolucao.desvio} deriva ${L} lados para o maior raio (${maiorRaio}): no mínimo ${nVMin} vértices / ${nFMin} faces estouram o bloco de ids (${BLOCO}) — aumente o desvio`);
    }
    const profsPorFuro = [];
    if (temSaida) {
      const kComProfundidade = profsBrutos.findIndex((prof) => prof != null);
      if (kComProfundidade >= 0) return grita(st, i, 'furo', 'profundidade', `o furo ${kComProfundidade} declara profundidade, mas este passo tem saida: não misture furo CEGO e PASSANTE no mesmo passo`);
    } else {
      for (let k = 0; k < M; k++) {
        const bruto = profsBrutos[k] ?? a.profundidade;
        if (bruto == null) {
          if (!temProfundidade && profsBrutos.every((prof) => prof == null)) return grita(st, i, 'furo', 'saida+profundidade', "furo exige saida (a face por onde ele sai, passante) ou profundidade (onde ele para, cego) — exatamente uma");
          return grita(st, i, 'furo', 'profundidade', `o furo ${k} não tem profundidade: nem ele declara uma, nem o passo declara a profundidade padrão`);
        }
        const prof = st.num(bruto);
        if (!(prof > 0) || !Number.isFinite(prof)) return grita(st, i, 'furo', 'profundidade', `o furo ${k} tem profundidade inválida (recebido ${JSON.stringify(bruto)} = ${prof}); profundidade precisa ser > 0`);
        profsPorFuro.push(prof);
      }
    }

    // um anel por centro, e a margem de cada um conferida contra o contorno
    const aneisEntrada = [], relEntrada = [], anelUVEntrada = [];
    for (let k = 0; k < M; k++) {
      const c0 = centros[k];
      const raio = raiosPorFuro[k];
      const anel = [];
      const pontoNoQuadro = (base, cu, cw) => [
        base[0] + entrada.u[0] * cu + entrada.w[0] * cw,
        base[1] + entrada.u[1] * cu + entrada.w[1] * cw,
        base[2] + entrada.u[2] * cu + entrada.w[2] * cw,
      ];
      if (fins[k] == null) {
        for (let j = 0; j < L; j++) {
          const t = (j / L) * Math.PI * 2;
          anel.push(pontoNoQuadro(c0, Math.cos(t) * raio, Math.sin(t) * raio));
        }
      } else {
        /* ESTÁDIO. `d` é a direção do rasgo no quadro (u,w) da face e `p` é ela
           girada +90° no mesmo quadro: girar no quadro, e não no mundo, é o que
           mantém o sentido do anel IGUAL ao do círculo — o resto do passo
           depende disso para orientar borda e saída.

           A volta é contínua em θ: o extremo de `centro` varre de +90° a +270°
           (bojo apontando para longe de `ate`) e o de `ate` varre de −90° a
           +90° (bojo para o outro lado). As duas retas do rasgo não são pontos
           extras; elas são as arestas que ligam um extremo ao outro. */
        const fim = fins[k];
        const dir = [fim[0] - c0[0], fim[1] - c0[1], fim[2] - c0[2]];
        const bruta = [
          dir[0] * entrada.u[0] + dir[1] * entrada.u[1] + dir[2] * entrada.u[2],
          dir[0] * entrada.w[0] + dir[1] * entrada.w[1] + dir[2] * entrada.w[2],
        ];
        const norma = Math.hypot(bruta[0], bruta[1]);
        const du = bruta[0] / norma, dw = bruta[1] / norma;
        const pu = -dw, pw = du;
        const nA = Math.ceil(L / 2), nB = L - nA;
        const arco = (base, n, inicio) => {
          for (let j = 0; j < n; j++) {
            const t = inicio + (j / (n - 1)) * Math.PI;
            const cos = Math.cos(t) * raio, sen = Math.sin(t) * raio;
            anel.push(pontoNoQuadro(base, cos * du + sen * pu, cos * dw + sen * pw));
          }
        };
        arco(c0, nA, Math.PI / 2);
        arco(fim, nB, -Math.PI / 2);
      }
      const cUV = entrada.proj(c0);
      const uvRel = entrada.uv.map((p) => [p[0] - cUV[0], p[1] - cUV[1]]);
      const anelRel = anel.map((p) => { const q = entrada.proj(p); return [q[0] - cUV[0], q[1] - cUV[1]]; });
      const folga = Math.min(...anelRel.map((p) => margemDentro(uvRel, p)));
      if (!(folga > 1e-9 * Math.max(1, entrada.escala))) return grita(st, i, 'furo', fins[k] == null ? 'raio' : 'ate', `o anel ${k} ${fins[k] == null ? `de raio ${raio}` : `é um rasgo de raio ${raio} e comprimento ${comprimentosRasgo[k].toFixed(6)}`} em ${JSON.stringify(c0.map((n) => +n.toFixed(6)))} não cabe dentro da face de entrada ${entradaId}: sobra ${folga.toFixed(6)} até a borda (precisa ser > 0). Um furo que encosta ou vaza não é furo, é recorte de contorno`);
      aneisEntrada.push(anel); relEntrada.push({ uvRel, anelRel }); anelUVEntrada.push(anel.map(entrada.proj));
    }
    for (let k = 0; k < M; k++) for (let l = k + 1; l < M; l++) {
      const kDentroDeL = anelUVEntrada[k].every((p) => margemDentro(anelUVEntrada[l], p) > 1e-9 * Math.max(1, entrada.escala));
      const lDentroDeK = anelUVEntrada[l].every((p) => margemDentro(anelUVEntrada[k], p) > 1e-9 * Math.max(1, entrada.escala));
      if (kDentroDeL || lDentroDeK) {
        const dentro = kDentroDeL ? k : l, fora = kDentroDeL ? l : k;
        return grita(st, i, 'furo', 'centros', `o anel ${dentro} (raio ${raiosPorFuro[dentro]}) está DENTRO do anel ${fora} (raio ${raiosPorFuro[fora]}) na face de entrada ${entradaId} — furo dentro de furo não é uma superfície que esta operação sabe escrever`);
      }
      if (aneisSeSobrepoem(anelUVEntrada[k], anelUVEntrada[l], entrada.escala)) return grita(st, i, 'furo', 'centros', `os anéis ${k} e ${l} se cruzam ou se encostam na face de entrada ${entradaId} — dois furos sobrepostos não são um furo em oito`);
    }

    // ---- o outro lado: face de SAÍDA (passante) ou plano de FUNDO (cego) ----
    let saidaId = null, saida = null;
    const aneisOutro = [];
    /* a borda de SAÍDA percorre o anel ao CONTRÁRIO: ela é vista do outro lado,
       e um anel que é anti-horário na entrada é horário na saída. `ordemSaida[k]`
       é o índice do anel que ocupa a posição k na volta da saída. */
    const ordemSaida = Array.from({ length: L }, (_, k) => (L - k) % L);
    if (temSaida) {
      saidaId = faceUnicaEstrutural(st, a.saida, 'furo', 'saida', i);
      if (saidaId == null) return;
      if (saidaId === entradaId) return grita(st, i, 'furo', 'saida', `a saída é a MESMA face da entrada (${entradaId}) — um furo passante precisa de duas faces`);
      saida = poligonoPlano(st, saidaId, referencia);
      if (saida.erro) return grita(st, i, 'furo', 'saida', `saída: ${saida.erro}`);
      const concavaSaida = convexoCCW(saida.uv);
      if (concavaSaida) return grita(st, i, 'furo', 'saida', `saída: ${concavaSaida} — o furo só corta face convexa`);
      const denom = saida.N[0] * eixo[0] + saida.N[1] * eixo[1] + saida.N[2] * eixo[2];
      if (!(denom > 1e-9)) return grita(st, i, 'furo', 'saida', `o eixo do furo (${eixo.map((n) => +n.toFixed(3))}) não ATRAVESSA a face de saída ${saidaId} (normal ${saida.N.map((n) => +n.toFixed(3))}): ele é paralelo a ela ou sai pelo lado de dentro`);
      saida.rel = []; saida.anelUV = [];
      for (let k = 0; k < M; k++) {
        const anelOutro = [];
        for (const p of aneisEntrada[k]) {
          const t = ((saida.centro[0] - p[0]) * saida.N[0] + (saida.centro[1] - p[1]) * saida.N[1] + (saida.centro[2] - p[2]) * saida.N[2]) / denom;
          if (!(t > 1e-9)) return grita(st, i, 'furo', 'saida', `a face de saída ${saidaId} está ATRÁS da entrada ao longo do eixo (distância ${t.toFixed(6)}) — o furo sairia antes de entrar`);
          anelOutro.push([p[0] + eixo[0] * t, p[1] + eixo[1] * t, p[2] + eixo[2] * t]);
        }
        const cSaida = saida.proj(anelOutro.reduce((acc, p) => [acc[0] + p[0] / L, acc[1] + p[1] / L, acc[2] + p[2] / L], [0, 0, 0]));
        const uvRel = saida.uv.map((p) => [p[0] - cSaida[0], p[1] - cSaida[1]]);
        const anelRel = anelOutro.map((p) => { const q = saida.proj(p); return [q[0] - cSaida[0], q[1] - cSaida[1]]; });
        const folga = Math.min(...anelRel.map((p) => margemDentro(uvRel, p)));
        if (!(folga > 1e-9 * Math.max(1, saida.escala))) return grita(st, i, 'furo', 'saida', `o anel ${k} não cabe dentro da face de saída ${saidaId}: sobra ${folga.toFixed(6)} até a borda (precisa ser > 0)`);
        aneisOutro.push(anelOutro);
        saida.rel.push({ uvRel, anelRel });
        saida.anelUV.push(anelOutro.map(saida.proj));
      }
      /* NÃO existe uma segunda conferência de sobreposição aqui, e isso é
         medido, não esquecido: `p ↦ p + eixo·((c·N − p·N)/denom)` é AFIM no
         plano de entrada (linear mais constante) e invertível enquanto o eixo
         atravessa a saída — as duas coisas que este passo já exigiu antes de
         chegar aqui. Mapa afim preserva interseção nos dois sentidos, então
         anéis disjuntos na entrada saem disjuntos do outro lado, por mais
         oblíqua que a face de saída seja. Uma conferência que nunca pode falhar
         é promessa sem afirmação que morra; o que fica no lugar dela é o teste
         da saída OBLÍQUA, que mede a separação do outro lado. */
    } else {
      for (let k = 0; k < M; k++) {
        const prof = profsPorFuro[k];
        aneisOutro.push(aneisEntrada[k].map((p) => [p[0] + eixo[0] * prof, p[1] + eixo[1] * prof, p[2] + eixo[2] * prof]));
      }
    }

    /* ---- as bordas, montadas ANTES de reservar id ----
       UM anel: a volta simples de sempre, byte por byte. VÁRIOS: a partição
       por pontes e orelhas, que devolve as mesmas `L` faces por anel mais o
       preenchimento. */
    let bordaE = null, bordaS = null, cheioE = [], cheioS = [];
    if (M === 1) {
      bordaE = bordaAnular(relEntrada[0].uvRel, relEntrada[0].anelRel);
      if (bordaE.erro) return grita(st, i, 'furo', 'de', `entrada: ${bordaE.erro}`);
      bordaE = [bordaE.faces];
      if (temSaida) {
        const r = bordaAnular(saida.rel[0].uvRel, ordemSaida.map((j) => saida.rel[0].anelRel[j]));
        if (r.erro) return grita(st, i, 'furo', 'saida', `saída: ${r.erro}`);
        bordaS = [r.faces];
      }
    } else {
      /* cada LADO da chapa tenta por conta própria: a geometria da entrada e a
         da saída não são a mesma, e uma ordem que fecha num lado pode travar no
         outro. `raiosPorFuro` preserva a ordem declarada; se todos os raios
         empatam, a terceira ordem é igual à declarada e some sozinha. */
      const pE = particionar(entrada.uv, anelUVEntrada, entrada.escala, raiosPorFuro);
      if (pE.erro) return grita(st, i, 'furo', 'de', `entrada: ${pE.erro}`);
      bordaE = pE.bordas; cheioE = pE.preenchimento;
      if (temSaida) {
        const pS = particionar(saida.uv, saida.anelUV.map((anel) => ordemSaida.map((j) => anel[j])), saida.escala, raiosPorFuro);
        if (pS.erro) return grita(st, i, 'furo', 'saida', `saída: ${pS.erro}`);
        bordaS = pS.bordas; cheioS = pS.preenchimento;
      }
    }

    // guarda de overflow (D3), contada antes de inserir
    const nV = 2 * L * M, nF = M * (temSaida ? 3 * L : 2 * L + 1) + cheioE.length + cheioS.length;
    if (nV > BLOCO || nF > BLOCO) {
      const motivo = `furo com ${M} anel(éis) de ${L} lados estoura o bloco de ids (${BLOCO}): ${nV} vértices / ${nF} faces`;
      if (resolucao.derivado) return grita(st, i, 'furo', 'lados', `${motivo} — aumente o desvio`);
      throw new Error(`oficina: ${motivo}`);   // forma numérica preserva o contrato histórico
    }

    // ---- daqui pra baixo nada mais pode falhar: só construção ----
    const E = [], S = [];
    for (let k = 0; k < M; k++) {
      const e = [], s = [];
      for (let j = 0; j < L; j++) { addV(st, b + 2 * L * k + j, aneisEntrada[k][j]); e.push(b + 2 * L * k + j); }
      for (let j = 0; j < L; j++) { addV(st, b + 2 * L * k + L + j, aneisOutro[k][j]); s.push(b + 2 * L * k + L + j); }
      E.push(e); S.push(s);
    }

    const fEntrada = entrada.face, fSaida = saida ? saida.face : null;
    const herda = (id, fonte) => { const nf = st.F.get(id); nf.cor = fonte.cor; nf.material = fonte.material; nf.parte = fonte.parte; nf.liso = fonte.liso; nf.solido = fonte.solido; };
    /* a face da partição vem descrita por CANTOS SEMÂNTICOS (canto do contorno
       ou vértice do anel k), nunca por posição de array na malha */
    const cantoEntrada = (t) => (t.tipo === 'contorno' ? fEntrada.vs[t.i] : E[t.k][t.j]);
    const cantoSaida = (t) => (t.tipo === 'contorno' ? fSaida.vs[t.i] : S[t.k][ordemSaida[t.j]]);

    const furos = [];
    for (let k = 0; k < M; k++) {
      const base = b + 3 * L * k;
      const bordas = [], paredes = [];
      bordaE[k].forEach((desc, j) => {
        const vs = M === 1
          ? [...desc.externos.map((m) => fEntrada.vs[m]), ...desc.anel.map((m) => E[k][m])]
          : desc.cantos.map(cantoEntrada);
        addF(st, base + j, vs); bordas.push(base + j); herda(base + j, fEntrada);
      });
      for (let j = 0; j < L; j++) {
        const n = (j + 1) % L;
        addF(st, base + L + j, [E[k][j], E[k][n], S[k][n], S[k][j]]); paredes.push(base + L + j); herda(base + L + j, fEntrada);
      }
      let saidas = null, fundo = null;
      if (temSaida) {
        saidas = [];
        bordaS[k].forEach((desc, m) => {
          const vs = M === 1
            ? [...desc.externos.map((q) => fSaida.vs[q]), ...desc.anel.map((q) => S[k][ordemSaida[q]])]
            : desc.cantos.map(cantoSaida);
          addF(st, base + 2 * L + m, vs); saidas.push(base + 2 * L + m); herda(base + 2 * L + m, fSaida);
        });
      } else {
        fundo = base + 2 * L;
        addF(st, fundo, S[k].slice()); herda(fundo, fEntrada);
      }
      furos.push({ bordas, paredes, saidas, fundo });
    }
    let cursor = b + 3 * L * M;
    const preenchimento = [], preenchimentoDaSaida = [];
    for (const desc of cheioE) { addF(st, cursor, desc.cantos.map(cantoEntrada)); preenchimento.push(cursor); herda(cursor, fEntrada); cursor++; }
    for (const desc of cheioS) { addF(st, cursor, desc.cantos.map(cantoSaida)); preenchimentoDaSaida.push(cursor); herda(cursor, fSaida); cursor++; }

    // as faces cortadas SOMEM da malha e ENTRAM no registro de consumo
    st.F.delete(entradaId);
    st.consumidas.set(entradaId, { passo: i, op: 'furo' });
    if (saidaId != null) { st.F.delete(saidaId); st.consumidas.set(saidaId, { passo: i, op: 'furo' }); }

    registraOrigem(st, i, 'furo', a.origemId, { furos, grupos, preenchimento, preenchimentoDaSaida });
  },

  /* arredondarAresta (Escopo A do filete v2) — uma faixa de arco com dois ou
     mais painéis, numa aresta manifold de ponta simples. `filete` continua
     logo abaixo, intacto, como o chanfro v1 compatível.

     O raio aqui é raio GEOMÉTRICO: a tangência recua `r/tan(θ/2)` em cada face
     e o centro fica a `r/sin(θ/2)` no bissetor. Antes de escrever V/F a op
     mede a primeira borda que cada recuo encontra nas duas faces; raio que não
     cabe grita sem deixar meia malha. Canto composto ainda não entra aqui: o
     leque de `chamferBox` será Escopo B, com uma partição própria. */
  arredondarAresta(st, a, i) {
    const b = baseDoPasso(i);
    if (a.origemId == null) return grita(st, i, 'arredondarAresta', 'origemId', 'arredondarAresta é sempre estrutural: origemId é obrigatório');
    if (!Number.isSafeInteger(a.origemId) || a.origemId < 0) return grita(st, i, 'arredondarAresta', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const declaracoes = st.declaracoesOrigem.get(a.origemId) ?? [];
    if (declaracoes.length > 1) return grita(st, i, 'arredondarAresta', 'origemId', textoDeclaracoes(a.origemId, declaracoes));

    const faceAId = faceUnicaEstrutural(st, a.de, 'arredondarAresta', 'de', i);
    if (faceAId == null) return;
    const faceA = st.F.get(faceAId);
    const L = faceA.vs.length;
    if (!Number.isSafeInteger(a.aresta) || a.aresta < 0 || a.aresta >= L) return grita(st, i, 'arredondarAresta', 'aresta', `aresta precisa ser um índice inteiro 0..${L - 1} (a face ${faceAId} tem ${L} cantos)`);
    const paineis = st.num(a.paineis ?? 0);
    if (!Number.isSafeInteger(paineis) || paineis < 2) return grita(st, i, 'arredondarAresta', 'paineis', 'paineis precisa ser inteiro >= 2 (um painel é o chanfro filete v1)');
    if (paineis > Math.floor(BLOCO / 2)) return grita(st, i, 'arredondarAresta', 'paineis', `paineis ${paineis} estoura o bloco de ids (${BLOCO})`);
    const raio = st.num(a.raio ?? 0);
    if (!(raio > 0) || !Number.isFinite(raio)) return grita(st, i, 'arredondarAresta', 'raio', `raio precisa ser > 0 (recebido ${JSON.stringify(a.raio ?? null)} = ${raio})`);

    const v0 = faceA.vs[a.aresta], v1 = faceA.vs[(a.aresta + 1) % L];
    let faceBId = null; let reversa = true;
    for (const [fid, f] of st.F) {
      if (fid === faceAId) continue;
      for (let k = 0; k < f.vs.length; k++) {
        const p = f.vs[k], q = f.vs[(k + 1) % f.vs.length];
        if ((p === v1 && q === v0) || (p === v0 && q === v1)) {
          if (faceBId != null) { faceBId = -2; break; }
          faceBId = fid; reversa = p === v1 && q === v0;
        }
      }
      if (faceBId === -2) break;
    }
    if (faceBId == null) return grita(st, i, 'arredondarAresta', 'de', `a aresta ${a.aresta} da face ${faceAId} não é compartilhada por nenhuma outra face`);
    if (faceBId === -2) return grita(st, i, 'arredondarAresta', 'de', `a aresta ${a.aresta} da face ${faceAId} é compartilhada por mais de duas faces — não é manifold`);
    if (!reversa) return grita(st, i, 'arredondarAresta', 'de', `a face ${faceBId} percorre a aresta ${a.aresta} no mesmo sentido de ${faceAId} — winding inválido para malha fechada`);
    const faceB = st.F.get(faceBId);

    const planoA = poligonoPlano(st, faceAId);
    if (planoA.erro) return grita(st, i, 'arredondarAresta', 'de', planoA.erro);
    const planoB = poligonoPlano(st, faceBId);
    if (planoB.erro) return grita(st, i, 'arredondarAresta', 'de', planoB.erro);
    const erroConvexoA = convexoCCW(planoA.uv);
    const erroConvexoB = convexoCCW(planoB.uv);
    if (erroConvexoA || erroConvexoB) return grita(st, i, 'arredondarAresta', 'de', `Escopo A exige duas faces convexas: ${erroConvexoA || erroConvexoB}`);

    const P = st.V.get(v0), Q = st.V.get(v1);
    const eBruto = [Q[0] - P[0], Q[1] - P[1], Q[2] - P[2]];
    const elen = Math.hypot(...eBruto);
    if (!(elen > 1e-9)) return grita(st, i, 'arredondarAresta', 'aresta', 'a aresta tem comprimento ~0');
    const e = eBruto.map((n) => n / elen);
    const centroide = (f) => f.vs.reduce((c, v) => {
      const p = st.V.get(v); return [c[0] + p[0] / f.vs.length, c[1] + p[1] / f.vs.length, c[2] + p[2] / f.vs.length];
    }, [0, 0, 0]);
    const perpendicularInterna = (alvo, quem) => {
      const d = [alvo[0] - P[0], alvo[1] - P[1], alvo[2] - P[2]];
      const proj = d[0] * e[0] + d[1] * e[1] + d[2] * e[2];
      const r = [d[0] - e[0] * proj, d[1] - e[1] * proj, d[2] - e[2] * proj];
      const l = Math.hypot(...r);
      if (!(l > 1e-9)) { grita(st, i, 'arredondarAresta', quem, 'face degenerada: centroide cai sobre a aresta'); return null; }
      return r.map((n) => n / l);
    };
    const dA = perpendicularInterna(centroide(faceA), 'de'); if (!dA) return;
    const dB = perpendicularInterna(centroide(faceB), 'de'); if (!dB) return;
    const cosT = Math.max(-1, Math.min(1, dA[0] * dB[0] + dA[1] * dB[1] + dA[2] * dB[2]));
    const theta = Math.acos(cosT);
    if (!(theta > 1e-6) || !(theta < Math.PI - 1e-6)) return grita(st, i, 'arredondarAresta', 'aresta', 'as duas faces são coplanares ou dobram quase 180° — não há canto arredondável');

    /* Até onde cada canto pode andar na direção de tangência antes de tocar a
       próxima borda da própria face. A conta 2D também cobre o caso em que a
       direção corre exatamente SOBRE a aresta vizinha (caso do cubo). */
    const limiteNoPoligono = (plano, inicio, direcao) => {
      const o = plano.proj(inicio);
      const fim = plano.proj([inicio[0] + direcao[0], inicio[1] + direcao[1], inicio[2] + direcao[2]]);
      const d = [fim[0] - o[0], fim[1] - o[1]];
      const cruz = (u, v) => u[0] * v[1] - u[1] * v[0];
      let limite = Infinity;
      for (let k = 0; k < plano.uv.length; k++) {
        const A = plano.uv[k], B = plano.uv[(k + 1) % plano.uv.length];
        const s = [B[0] - A[0], B[1] - A[1]], w = [A[0] - o[0], A[1] - o[1]];
        const den = cruz(d, s);
        if (Math.abs(den) < 1e-9) {
          if (Math.abs(cruz(w, d)) < 1e-8) for (const X of [A, B]) {
            const t = (X[0] - o[0]) * d[0] + (X[1] - o[1]) * d[1];
            if (t > 1e-8) limite = Math.min(limite, t);
          }
          continue;
        }
        const t = cruz(w, s) / den;
        const u = cruz(w, d) / den;
        if (t > 1e-8 && u >= -1e-8 && u <= 1 + 1e-8) limite = Math.min(limite, t);
      }
      return limite;
    };
    const recuo = raio / Math.tan(theta / 2);
    const limites = [
      limiteNoPoligono(planoA, P, dA), limiteNoPoligono(planoA, Q, dA),
      limiteNoPoligono(planoB, P, dB), limiteNoPoligono(planoB, Q, dB),
    ];
    const maxRecuo = Math.min(...limites);
    if (!(recuo < maxRecuo - 1e-8)) return grita(st, i, 'arredondarAresta', 'raio', `raio ${raio} não cabe nas faces vizinhas (máximo < ${(maxRecuo * Math.tan(theta / 2)).toFixed(6)})`);

    const idx = (f, v) => f.vs.indexOf(v);
    const antes = (f, v) => f.vs[(idx(f, v) - 1 + f.vs.length) % f.vs.length];
    const depois = (f, v) => f.vs[(idx(f, v) + 1) % f.vs.length];
    const prevA = antes(faceA, v0), nextA = depois(faceA, v1), nextB = depois(faceB, v0), prevB = antes(faceB, v1);
    /* Uma ponta simples tem uma face ligando B a A. No chamferBox há duas:
       uma tira de aresta e um canto triangular. A segunda continua com o seu
       id, mas o vértice comum vira o polígono que costura as duas tangências.
       Não é um atalho por valência: a caminhada inteira do leque é conferida. */
    const ponta = (v, nome) => {
      const achadas = [];
      for (const [fid, f] of st.F) if (fid !== faceAId && fid !== faceBId && f.vs.includes(v)) achadas.push(f);
      if (achadas.length === 1) {
        const face = achadas[0];
        const ok = nome === 'v0'
          ? antes(face, v) === nextB && depois(face, v) === prevA
          : antes(face, v) === nextA && depois(face, v) === prevB;
        if (ok) return { tipo: 'simples', face };
      }
      if (achadas.length === 2) {
        if (nome === 'v0') {
          const canto = achadas.find((f) => antes(f, v) === nextB);
          const lateral = achadas.find((f) => f !== canto);
          if (canto && lateral && depois(canto, v) === antes(lateral, v) && depois(lateral, v) === prevA) return { tipo: 'composto', canto };
        } else {
          const canto = achadas.find((f) => depois(f, v) === prevB);
          const lateral = achadas.find((f) => f !== canto);
          if (canto && lateral && antes(canto, v) === depois(lateral, v) && antes(lateral, v) === nextA) return { tipo: 'composto', canto };
        }
      }
      grita(st, i, 'arredondarAresta', 'aresta', `a ponta ${nome} não forma leque simples de costura (recebeu ${achadas.length} face(s) além das duas da aresta)`);
      return null;
    };
    const ponta0 = ponta(v0, 'v0'); if (!ponta0) return;
    const ponta1 = ponta(v1, 'v1'); if (!ponta1) return;

    const bissetor = norm3(dA[0] + dB[0], dA[1] + dB[1], dA[2] + dB[2]);
    const distanciaCentro = raio / Math.sin(theta / 2);
    const ponto = (base, d, escala) => [base[0] + d[0] * escala, base[1] + d[1] * escala, base[2] + d[2] * escala];
    const centroP = ponto(P, bissetor, distanciaCentro), centroQ = ponto(Q, bissetor, distanciaCentro);
    const tangA0 = ponto(P, dA, recuo), tangB0 = ponto(P, dB, recuo);
    const tangA1 = ponto(Q, dA, recuo), tangB1 = ponto(Q, dB, recuo);
    const rad = (tang, centro) => norm3(tang[0] - centro[0], tang[1] - centro[1], tang[2] - centro[2]);
    const rAP = rad(tangA0, centroP), rBP = rad(tangB0, centroP), rAQ = rad(tangA1, centroQ), rBQ = rad(tangB1, centroQ);
    const phi = Math.acos(Math.max(-1, Math.min(1, rAP[0] * rBP[0] + rAP[1] * rBP[1] + rAP[2] * rBP[2])));
    const senoPhi = Math.sin(phi);
    if (!(senoPhi > 1e-8)) return grita(st, i, 'arredondarAresta', 'aresta', 'arco degenerado entre as duas tangências');
    const noArco = (inicio, fim, centro, k) => {
      const t = k / paineis;
      const a0 = Math.sin((1 - t) * phi) / senoPhi, a1 = Math.sin(t * phi) / senoPhi;
      const r = norm3(inicio[0] * a0 + fim[0] * a1, inicio[1] * a0 + fim[1] * a1, inicio[2] * a0 + fim[2] * a1);
      return [centro[0] + r[0] * raio, centro[1] + r[1] * raio, centro[2] + r[2] * raio];
    };

    const Pk = [v0], Qk = [v1];
    for (let k = 1; k <= paineis; k++) {
      const idP = b + (k - 1) * 2, idQ = idP + 1;
      addV(st, idP, noArco(rAP, rBP, centroP, k));
      addV(st, idQ, noArco(rAQ, rBQ, centroQ, k));
      Pk.push(idP); Qk.push(idQ);
    }
    st.V.set(v0, tangA0); st.V.set(v1, tangA1);
    const paineisIds = [];
    for (let k = 1; k <= paineis; k++) {
      const id = b + k - 1;
      addF(st, id, [Pk[k], Qk[k], Qk[k - 1], Pk[k - 1]]);
      const painel = st.F.get(id);
      painel.cor = faceA.cor; painel.material = faceA.material; painel.parte = faceA.parte;
      painel.liso = faceA.liso; painel.solido = faceA.solido;
      paineisIds.push(id);
    }
    faceB.vs = faceB.vs.map((v) => (v === v0 ? Pk[paineis] : v === v1 ? Qk[paineis] : v));
    if (ponta0.tipo === 'simples') {
      ponta0.face.vs = ponta0.face.vs.flatMap((v) => (v === v0 ? [...Pk.slice(1).reverse(), v0] : [v]));
    } else {
      ponta0.canto.vs = ponta0.canto.vs.flatMap((v) => (v === v0 ? [...Pk.slice(1).reverse(), v0] : [v]));
    }
    if (ponta1.tipo === 'simples') {
      ponta1.face.vs = ponta1.face.vs.flatMap((v) => (v === v1 ? [v1, ...Qk.slice(1)] : [v]));
    } else {
      ponta1.canto.vs = ponta1.canto.vs.flatMap((v) => (v === v1 ? [v1, ...Qk.slice(1)] : [v]));
    }
    registraOrigem(st, i, 'arredondarAresta', a.origemId, { paineis: paineisIds });
  },

  /* filete (ciclo "Curva e filete v1") — arredonda UMA ARESTA escolhida por
     IDENTIDADE ESTRUTURAL, ao contrário do `chamferBox` que chanfra a caixa
     inteira. É o precedente do `furo` seguido de perto: `de` endereça a face
     de entrada, o corte grita em toda referência ambígua/vazia, e o que ele
     cria entra em `CONTRATOS_ORIGEM` como mais uma família citável.

     A DIFERENÇA do `furo`: o filete NÃO CONSOME face nenhuma. Todas as faces
     que ele toca continuam vivas com a MESMA identidade (mesmo `f.id`); só a
     forma delas muda. São QUATRO: as duas da aresta e a terceira de cada
     PONTA da aresta.

     COMO O CORTE ANDA (e o erro que este parágrafo corrige). A primeira
     versão tentou não tocar nas pontas: preservava `v0`/`v1` dentro das duas
     faces da aresta e só inseria dois cantos entre eles. O neutro ficava
     fechado e a contagem batia, então nenhum teste do núcleo caía — mas a
     face ficava com um canto EM CIMA da aresta seguinte, um pico de área
     nula. Polígono que se toca. Quem gritava era o ADAPTADOR, ao triangular
     em orelhas, e só quando a op chegou numa peça de verdade. A lição, que
     vale além daqui: malha fechada e contagem certa não provam polígono
     simples.

     O desenho certo é o mínimo que fecha: `v0` e `v1` ANDAM para o lado da
     face de entrada (viram `P0` e `Q0`, mesmos ids — é o mesmo canto da peça,
     recuado pelo corte), nascem `P1`/`Q1` do outro lado, e a TERCEIRA face de
     cada ponta ganha um canto, que é onde a fresta do recuo se fecha, no
     próprio plano dela. Sem triângulo avulso, sem junção em T, sem face
     coplanar sobreposta. A face de entrada não muda de LISTA nenhuma: os
     cantos dela andaram junto com os vértices.

     ARGUMENTOS
       `origemId`   OBRIGATÓRIO — o painel novo nasceria anônimo sem ele, como
                    no `furo`;
       `de`         OBRIGATÓRIO, origem estrutural de UMA face (a face de
                    ENTRADA — só decide de qual lado o autor está olhando; o
                    filete em si é simétrico entre as duas faces da aresta);
       `aresta`     índice LOCAL da aresta dentro do polígono de `de` — a
                    aresta entre o canto `aresta` e o canto `aresta+1` (mód. o
                    número de cantos). Não é id cru: é a POSIÇÃO da aresta
                    dentro da face nomeada, a mesma classe de referência que
                    `face:'topo'` do cubo ou `lado` do cilindro já usam;
       `raio`       PARAM, > 0 — a profundidade do corte, medida perpendicular
                    à aresta, dentro de cada face.

     A ARESTA PRECISA SER MANIFOLD: exatamente DUAS faces a compartilham (a de
     `de` e mais uma). Zero ou mais de uma GRITAM — não há "meio filete".

     GEOMETRIA (medida, travada por teste): sejam `dA`/`dB` os vetores, dentro
     de cada face, PERPENDICULARES à aresta e apontando do canto pro centroide
     da própria face (ambos ⊥ à aresta), e `θ` o ângulo entre eles — para duas
     faces perpendiculares (o caso do `chamferBox`/caixa), `θ = 90°`. O corte
     insere UM painel novo, um retângulo entre `P0 = v0 + raio·dA` / `Q0 = v1 +
     raio·dA` (no plano da face de entrada) e `P1 = v0 + raio·dB` / `Q1 = v1 +
     raio·dB` (no plano da outra face) — o mesmo corte FLAT do `chamferBox`,
     só que numa aresta ESCOLHIDA em vez de nas 12 da caixa inteira (ele É o
     caso de UM corte só da mesma família). O ângulo criado é `θ/2` de cada
     lado — para uma aresta de 90°, os dois nascem a exatamente 45°, o que a
     condição 5 do gate pede (`n=1` painel, `θ/(n+1) = 45°`) e o teste mede.

     SÓ UM PAINEL NESTA RODADA (não é TOPO, não tem parâmetro `segmentos`):
     subdividir o corte em vários painéis foi tentado e MEDIDO — a amostragem
     por interpolação esférica entre `dA` e `dB` produz um painel intermediário
     cuja normal NÃO fica "entre" as normais das duas faces do jeito ingênuo
     (o painel mais perto da face de entrada sai com a normal mais perto da
     OUTRA face, não da própria — verificado numericamente, não hipotético).
     Um filete de vários segmentos exige uma segunda derivação, cuidando dessa
     não-linearidade; ficou de fora, registrado como atrito em vez de entregue
     quebrado.

     A ARESTA PRECISA TER PONTA SIMPLES: em cada ponta, EXATAMENTE UMA face
     além das duas da aresta. Zero (borda aberta) ou duas ou mais (canto
     complexo) GRITAM — o canto de três arestas está declarado fora de escopo
     no gate deste ciclo, e o que está fora de escopo grita em vez de sair
     torto. O sentido de percurso de cada terceira face também é DERIVADO da
     lei da malha fechada, não adivinhado: se não bater, o passo grita.

     NUMERAÇÃO (formato salvo). Com `b` a base do passo: VÉRTICES `b+0`=P1,
     `b+1`=Q1 (os dois do lado da face de saída); FACE (o painel) `b+0`. `P0` e
     `Q0` são os PRÓPRIOS `v0`/`v1`, recuados. Nenhuma face é recriada — `addF`
     roda uma vez só, no painel. Custo fechado: +2 V e +1 F, seja qual for a
     peça.

     HERANÇA: o painel novo herda cor/material/parte/liso/solido da face de
     ENTRADA (a mesma lei do `furo`/`espelha`).

     COMPLETUDE: aresta fora do índice, aresta não-manifold, faces quase
     coplanares (nada para arredondar) ou dobradas quase 180° (canto
     degenerado), raio ≤ 0 ou não-finito — cada um GRITA nomeando a causa; a
     op não constrói nada nesse passo.

     FORA DE ESCOPO (declarado, não escondido): filete de VÁRIOS segmentos
     (ver acima), filete VARIÁVEL ao longo da aresta, filete de CANTO (três
     arestas se encontrando num vértice) e concordância entre CORPOS
     diferentes. O raio não é conferido contra o tamanho das faces vizinhas
     (um raio grande demais pode fazer o painel novo ultrapassar a face) —
     isto é uma responsabilidade do autor, não uma guarda do núcleo;
     registrado como atrito. */
  filete(st, a, i) {
    const b = baseDoPasso(i);
    if (a.origemId == null) return grita(st, i, 'filete', 'origemId', 'filete é sempre estrutural: origemId é obrigatório (sem ele os painéis novos nasceriam anônimos)');
    if (!Number.isSafeInteger(a.origemId) || a.origemId < 0) return grita(st, i, 'filete', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const declaracoes = st.declaracoesOrigem.get(a.origemId) ?? [];
    if (declaracoes.length > 1) return grita(st, i, 'filete', 'origemId', textoDeclaracoes(a.origemId, declaracoes));

    const faceAId = faceUnicaEstrutural(st, a.de, 'filete', 'de', i);
    if (faceAId == null) return;
    const faceA = st.F.get(faceAId);
    const L = faceA.vs.length;
    if (!Number.isSafeInteger(a.aresta) || a.aresta < 0 || a.aresta >= L) return grita(st, i, 'filete', 'aresta', `aresta precisa ser um índice inteiro 0..${L - 1} (a face ${faceAId} tem ${L} cantos); recebido ${JSON.stringify(a.aresta ?? null)}`);
    const v0 = faceA.vs[a.aresta], v1 = faceA.vs[(a.aresta + 1) % L];

    // ---- a OUTRA face que compartilha esta aresta (manifold: exatamente 2) ----
    let faceBId = null, reversa = true;
    for (const [fid, f] of st.F) {
      if (fid === faceAId) continue;
      for (let k = 0; k < f.vs.length; k++) {
        const p = f.vs[k], q = f.vs[(k + 1) % f.vs.length];
        if ((p === v1 && q === v0) || (p === v0 && q === v1)) {
          if (faceBId != null) { faceBId = -2; break; }
          faceBId = fid; reversa = (p === v1 && q === v0);
        }
      }
      if (faceBId === -2) break;
    }
    if (faceBId == null) return grita(st, i, 'filete', 'de', `a aresta ${a.aresta} da face ${faceAId} não é compartilhada por nenhuma outra face (não é uma aresta de MANIFOLD)`);
    if (faceBId === -2) return grita(st, i, 'filete', 'de', `a aresta ${a.aresta} da face ${faceAId} é compartilhada por mais de duas faces — não é manifold, filete exige exatamente 2`);
    const faceB = st.F.get(faceBId);

    const P = st.V.get(v0), Q = st.V.get(v1);
    const ex = Q[0] - P[0], ey = Q[1] - P[1], ez = Q[2] - P[2];
    const elen = Math.hypot(ex, ey, ez);
    if (!(elen > 1e-9)) return grita(st, i, 'filete', 'aresta', `a aresta ${a.aresta} da face ${faceAId} tem comprimento ~0 (v0 e v1 coincidem)`);
    const e = [ex / elen, ey / elen, ez / elen];

    const centroide = (f) => { const c = [0, 0, 0]; for (const v of f.vs) { const p = st.V.get(v); c[0] += p[0] / f.vs.length; c[1] += p[1] / f.vs.length; c[2] += p[2] / f.vs.length; } return c; };
    const perpUnit = (alvo, campo) => {
      const d = [alvo[0] - P[0], alvo[1] - P[1], alvo[2] - P[2]];
      const proj = d[0] * e[0] + d[1] * e[1] + d[2] * e[2];
      const r = [d[0] - e[0] * proj, d[1] - e[1] * proj, d[2] - e[2] * proj];
      const l = Math.hypot(r[0], r[1], r[2]);
      if (!(l > 1e-9)) { grita(st, i, 'filete', campo, 'face degenerada: o centroide cai sobre a própria aresta'); return null; }
      return [r[0] / l, r[1] / l, r[2] / l];
    };
    const dA = perpUnit(centroide(faceA), 'de');
    if (!dA) return;
    const dB = perpUnit(centroide(faceB), 'de');
    if (!dB) return;

    const cosT = Math.max(-1, Math.min(1, dA[0] * dB[0] + dA[1] * dB[1] + dA[2] * dB[2]));
    const theta = Math.acos(cosT);
    if (!(theta > 1e-6)) return grita(st, i, 'filete', 'aresta', 'as duas faces desta aresta são quase coplanares — não há canto para arredondar');
    if (!(theta < Math.PI - 1e-6)) return grita(st, i, 'filete', 'aresta', 'as duas faces desta aresta se dobram quase 180° uma sobre a outra — canto degenerado');

    /* winding não-padrão (faceB percorre a aresta no MESMO sentido de faceA,
       em vez do oposto que toda malha fechada exige) só acontece com uma
       normal virada — provavelmente uma face que passou por `vira`. Consertar
       esse caso pediria uma segunda derivação de winding; fica de fora,
       GRITANDO em vez de fechar a malha torta. */
    if (!reversa) return grita(st, i, 'filete', 'de', `a face do outro lado da aresta ${a.aresta} tem o sentido de percurso invertido em relação a ${faceAId} (normal provavelmente virada) — filete exige as duas no sentido padrão de malha fechada`);

    const raio = st.num(a.raio ?? 0);
    if (!(raio > 0) || !Number.isFinite(raio)) return grita(st, i, 'filete', 'raio', `raio precisa ser > 0 (recebido ${JSON.stringify(a.raio ?? null)} = ${raio})`);

    /* AS PONTAS DA ARESTA. Cada ponta (v0, v1) é um vértice onde chega uma
       TERCEIRA face além das duas da aresta. Ela precisa entrar na conta: se
       o corte só mexer em faceA/faceB, a terceira face continua com a
       quina antiga e a malha fica com uma fresta — ou, pior, com um polígono
       que se toca. MEDIDO, e foi assim que este arquivo saiu errado da
       primeira vez: preservar v0/v1 dentro de faceA deixa a face com um pico
       de área nula (o canto v1 fica EM CIMA da aresta seguinte). O neutro
       continuava fechado e a contagem batia, então nenhum teste do núcleo
       caía; quem gritava era o adaptador, ao tentar triangular a face em
       orelhas — e só quando a op chegou numa peça de verdade.
       Por isso o filete exige EXATAMENTE UMA terceira face em cada ponta.
       Zero (borda aberta) ou duas ou mais (canto complexo) GRITAM: o canto de
       três arestas está declarado fora de escopo no gate deste ciclo, e o que
       está fora de escopo grita em vez de sair torto. */
    const terceiraFace = (v, ponta) => {
      const achadas = [];
      for (const [fid, f] of st.F) {
        if (fid === faceAId || fid === faceBId) continue;
        if (f.vs.includes(v)) achadas.push(fid);
      }
      if (achadas.length !== 1) {
        grita(st, i, 'filete', 'aresta', `a ponta ${ponta} da aresta ${a.aresta} da face ${faceAId} tem ${achadas.length} face(s) além das duas da aresta; o filete precisa de exatamente 1 (canto de três arestas está fora de escopo neste ciclo)`);
        return null;
      }
      return achadas[0];
    };
    const faceCId = terceiraFace(v0, 'v0');
    if (faceCId == null) return;
    const faceDId = terceiraFace(v1, 'v1');
    if (faceDId == null) return;
    const faceC = st.F.get(faceCId), faceD = st.F.get(faceDId);

    /* a ordem em que cada terceira face percorre a ponta é DERIVADA, não
       adivinhada: numa malha fechada faceA vai v0->v1, faceB vai v1->v0, e
       então faceC (na ponta v0) só pode ir `nextB -> v0 -> prevA`. Se não for
       isso, a vizinhança não é a de uma malha fechada padrão e o passo grita
       em vez de escolher um lado. */
    const idx = (f, v) => f.vs.indexOf(v);
    const antes = (f, v) => f.vs[(idx(f, v) - 1 + f.vs.length) % f.vs.length];
    const depois = (f, v) => f.vs[(idx(f, v) + 1) % f.vs.length];
    const prevA = antes(faceA, v0), nextA = depois(faceA, v1);
    const nextB = depois(faceB, v0), prevB = antes(faceB, v1);
    if (antes(faceC, v0) !== nextB || depois(faceC, v0) !== prevA) {
      return grita(st, i, 'filete', 'aresta', `a face ${faceCId}, na ponta v0, não percorre a vizinhança no sentido de malha fechada (esperado ${nextB} -> ${v0} -> ${prevA})`);
    }
    if (antes(faceD, v1) !== nextA || depois(faceD, v1) !== prevB) {
      return grita(st, i, 'filete', 'aresta', `a face ${faceDId}, na ponta v1, não percorre a vizinhança no sentido de malha fechada (esperado ${nextA} -> ${v1} -> ${prevB})`);
    }

    const nV = 2, nF = 1;   // P1 e Q1; 1 painel. v0/v1 são REAPROVEITADOS (ver abaixo)
    if (nV > BLOCO || nF > BLOCO) throw new Error(`oficina: filete estoura o bloco de ids (${BLOCO}): ${nV} vértices / ${nF} faces`);

    /* v0 ANDA para P0 e v1 anda para Q0, em vez de nascerem dois vértices
       novos e os velhos virarem órfãos. A identidade do canto continua sendo
       a mesma: é o MESMO canto da peça, recuado pelo corte. Só o lado de
       faceB precisa de vértice novo (P1, Q1), porque ali o canto se desdobra
       em dois. Custo do corte: +2 V e +1 F, sempre, seja qual for a peça. */
    const idP1 = b, idQ1 = b + 1;
    addV(st, idP1, [P[0] + raio * dB[0], P[1] + raio * dB[1], P[2] + raio * dB[2]]);
    addV(st, idQ1, [Q[0] + raio * dB[0], Q[1] + raio * dB[1], Q[2] + raio * dB[2]]);
    st.V.set(v0, [P[0] + raio * dA[0], P[1] + raio * dA[1], P[2] + raio * dA[2]]);
    st.V.set(v1, [Q[0] + raio * dA[0], Q[1] + raio * dA[1], Q[2] + raio * dA[2]]);

    /* O PAINEL. Winding derivado da lei de sempre — nenhuma aresta é
       percorrida duas vezes no mesmo sentido: faceA percorre P0->Q0, então o
       painel percorre Q0->P0; faceB percorre Q1->P1, então o painel percorre
       P1->Q1. */
    addF(st, b, [idP1, idQ1, v1, v0]);           // P1 -> Q1 -> Q0 -> P0
    const nf = st.F.get(b);
    nf.cor = faceA.cor; nf.material = faceA.material; nf.parte = faceA.parte;
    nf.liso = faceA.liso; nf.solido = faceA.solido;
    const paineis = [b];

    /* faceA não muda de lista NENHUMA: os dois cantos dela já andaram junto
       com v0/v1. faceB troca cada ponta pelo gêmeo do outro lado do corte, e
       cada terceira face GANHA um canto — é ela que fecha a fresta que o
       recuo abriu, no próprio plano dela, sem triângulo avulso e sem junção
       em T com as vizinhas. */
    faceB.vs = faceB.vs.map((v) => (v === v0 ? idP1 : v === v1 ? idQ1 : v));
    faceC.vs = faceC.vs.flatMap((v) => (v === v0 ? [idP1, v0] : [v]));   // nextB -> P1 -> P0 -> prevA
    faceD.vs = faceD.vs.flatMap((v) => (v === v1 ? [v1, idQ1] : [v]));   // nextA -> Q0 -> Q1 -> prevB

    registraOrigem(st, i, 'filete', a.origemId, { paineis });
  },

  /* ---- atributos por face ---- */

  };
}
