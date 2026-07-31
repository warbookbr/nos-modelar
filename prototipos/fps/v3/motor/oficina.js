/* oficina.js — NÚCLEO + ADAPTADOR v3 da OFICINA (passo 1). Executa a lista de
   PASSOS de uma peça-objeto e devolve o objeto pronto pro visor. Duas camadas
   nítidas (docs/oficina.md "Onde o código mora"): o NÚCLEO neutro monta
   vértices únicos numerados + faces apontando pra ids + atributos por face, e
   devolve NÚMEROS; o ADAPTADOR v3 converte esse neutro nos triângulos soltos do
   motor (8 floats/vértice, cor por face via textura-amostra + UV). SEM
   interface. Determinístico: mesma lista -> mesmo objeto, sempre. A numeração
   de identidade depende só da POSIÇÃO do passo (bloco de BLOCO ids por índice),
   nunca dos valores de PARAMS — mudar `raio` não renumera; mudar `lados` (TOPO)
   renumera e os passos pendurados viram órfãos que GRITAM, nunca corrompem. */
import { criarResolverNumerico } from './expressoes.js';

export const FORMATO = { v: 1, tipo: 'objeto' };

/* Largura do bloco de ids por passo. O passo de índice i possui os ids
   [i*BLOCO, i*BLOCO+BLOCO) — tanto no espaço de VÉRTICE quanto no de FACE (dois
   espaços independentes: pode existir vértice 12 e face 12 ao mesmo tempo). É
   isto que torna a numeração POSICIONAL: o passo 4 começa a numerar no mesmo
   lugar hoje ou daqui a um ano, e nenhum PARAM mexe nisso. */
export const BLOCO = 1000;

/* base posicional de um passo (vértice e face partem do mesmo número, espaços
   distintos). Primitivas podem trazer `id` no arquivo — é só o MESMO número,
   escrito à mão pra ficar legível; se divergir da posição, vira aviso (nunca
   uma segunda-verdade silenciosa). */
function baseDoPasso(i) { return i * BLOCO; }

/* ----------------------------------------------------------------------------
   Vetores mínimos (puros, sem dependência do motor — o núcleo roda headless).
---------------------------------------------------------------------------- */
function norm3(x, y, z) { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; }

/* eixo nominal -> índice de coordenada. UMA definição para `rotaciona`,
   `espelha` e `arranja`, que faziam a mesma comparação de três jeitos. */
function indiceDeAxi(eixo) { return eixo === 'x' ? 0 : eixo === 'y' ? 1 : eixo === 'z' ? 2 : -1; }

/* ROTAÇÃO right-handed em torno do eixo `ax`, ao redor de `pivo`, com o cosseno
   e o seno JÁ calculados (o chamador gira muitos pontos pelo mesmo ângulo).
   `p' = pivo + R_eixo(θ)·(p − pivo)` — a MESMA convenção das matrizes de
   animação `mRotX/mRotY/mRotZ` deste arquivo, e o FORMATO SALVO das ops
   `rotaciona` e `arranja`, que dividem esta função exatamente para não poderem
   divergir de sinal (o erro que a skill `criar-peca` já pagou uma vez):
     eixo x: y' = y·cosθ − z·senθ ;  z' = y·senθ + z·cosθ
     eixo y: x' = x·cosθ + z·senθ ;  z' = −x·senθ + z·cosθ
     eixo z: x' = x·cosθ − y·senθ ;  y' = x·senθ + y·cosθ */
function giraPonto(p, pivo, ax, c, s) {
  const dx = p[0] - pivo[0], dy = p[1] - pivo[1], dz = p[2] - pivo[2];
  let rx = dx, ry = dy, rz = dz;
  if (ax === 0) { ry = dy * c - dz * s; rz = dy * s + dz * c; }
  else if (ax === 1) { rx = dx * c + dz * s; rz = -dx * s + dz * c; }
  else { rx = dx * c - dy * s; ry = dx * s + dy * c; }
  return [pivo[0] + rx, pivo[1] + ry, pivo[2] + rz];
}

/* produto vetorial a×b — puro, usado só pela op `loft` (frame de transporte
   paralelo, mais abaixo). */
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

/* Normal de um polígono (n-gon) por Newell — robusto pra face de 3+ cantos e
   independente da triangulação. */
function normalDaFace(V, vs) {
  let nx = 0, ny = 0, nz = 0;
  for (let k = 0; k < vs.length; k++) {
    const c = V.get(vs[k]), n = V.get(vs[(k + 1) % vs.length]);
    if (!c || !n) return [0, 1, 0];
    nx += (c[1] - n[1]) * (c[2] + n[2]);
    ny += (c[2] - n[2]) * (c[0] + n[0]);
    nz += (c[0] - n[0]) * (c[1] + n[1]);
  }
  return norm3(nx, ny, nz);
}

/* ruído de valor 3D determinístico com SEMENTE — usado só pela op `displace` (P8c do
   playground). `hash3` é um hash barato baseado em seno (mesma classe de determinismo
   que sin/cos já usado em lathe/cilindro/esfera: mesmo motor JS, mesma entrada, mesma
   saída sempre — não pretende ser aleatório de verdade, só parecer). `ruido3` amostra
   os 8 cantos do RETICULADO que envolve o ponto e interpola por smoothstep (suave, sem
   quina em cada célula do reticulado) — é "value noise" clássico, devolve sempre
   [0,1). FORMATO SALVO (docs/historico/playground.md regra 4): a fórmula em si é o que faz o
   `displace` de uma peça salva reproduzir o mesmo relevo sempre — mudar hash3/ruido3
   reformaria toda peça que usa `displace`, como renumerar mudaria a malha. */
function hash3(x, y, z, seed) { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 269.5) * 43758.5453123; return s - Math.floor(s); }
function ruido3(x, y, z, seed) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);   // smoothstep — suaviza a transição entre células
  const c000 = hash3(xi, yi, zi, seed), c100 = hash3(xi + 1, yi, zi, seed);
  const c010 = hash3(xi, yi + 1, zi, seed), c110 = hash3(xi + 1, yi + 1, zi, seed);
  const c001 = hash3(xi, yi, zi + 1, seed), c101 = hash3(xi + 1, yi, zi + 1, seed);
  const c011 = hash3(xi, yi + 1, zi + 1, seed), c111 = hash3(xi + 1, yi + 1, zi + 1, seed);
  const x00 = c000 + (c100 - c000) * u, x10 = c010 + (c110 - c010) * u;
  const x01 = c001 + (c101 - c001) * u, x11 = c011 + (c111 - c011) * u;
  const y0 = x00 + (x10 - x00) * v, y1 = x01 + (x11 - x01) * v;
  return y0 + (y1 - y0) * w;
}

/* colapsa cantos repetidos consecutivos (inclusive no fecho do ciclo) — o que
   a mescla deixa pra trás quando dois cantos de uma face viram o mesmo id. */
function colapsaCiclo(vs) {
  const out = [];
  for (let k = 0; k < vs.length; k++) if (vs[k] !== vs[(k + 1) % vs.length]) out.push(vs[k]);
  return out;
}
function distintos(vs) { return new Set(vs).size; }

/* ----------------------------------------------------------------------------
   ESQUELETO (passo 14a) — deformação suave (linear blend skinning). Declarável
   em CÓDIGO (a UI é o 14b): `ESQUELETO = { ossos: [ { nome, pai?, pivo? } ] }`.
   `pai` = nome do osso-pai (hierarquia; raiz sem pai). `pivo` = a cabeça do osso
   no espaço do modelo (passa por `vec`, então pode citar PARAM); default [0,0,0].
   O bind (repouso) é a IDENTIDADE no pivô -> bindGlobal(osso) = T(pivo). Aqui só
   se RESOLVE e VALIDA: pai existe, sem ciclo, dentro do teto. Erro estrutural
   GRITA ALTO (throw) — cedo, como a guarda de overflow do cilindro (D3) e o canal
   desconhecido do 13a; nunca vira segunda-verdade silenciosa. (Referência a osso
   inexistente pela op `pesar` é ÓRFÃO, não throw — grita sem corromper a malha.) */
const TETO_OSSOS = 32;    // teto de ossos por peça: 32 × mat4 = 128 vec4 de uniforme no VS skinado (folga sob o mínimo 256 do WebGL2). Exceder GRITA.
const N_INFLU = 4;        // TOP-N influências por vértice (padrão 4; menos serve pro low-poly, os slots sobrando ficam peso 0)
function resolverEsqueleto(ESQUELETO, vec) {
  const ossos = (ESQUELETO.ossos || []).map((o) => ({
    nome: o.nome,
    pai: o.pai != null ? o.pai : null,
    pivo: o.pivo != null ? vec(o.pivo) : [0, 0, 0],   // dimensional (pode citar PARAM), como os outros pontos
  }));
  if (ossos.length > TETO_OSSOS) throw new Error(`oficina: esqueleto com ${ossos.length} ossos excede o teto de ${TETO_OSSOS} (limite de uniformes do VS skinado)`);
  const nomes = new Set();
  for (const o of ossos) { if (nomes.has(o.nome)) throw new Error(`oficina: osso duplicado '${o.nome}' no ESQUELETO`); nomes.add(o.nome); }
  const idx = new Map(ossos.map((o, i) => [o.nome, i]));
  for (const o of ossos) if (o.pai != null && !idx.has(o.pai)) throw new Error(`oficina: osso '${o.nome}' tem pai '${o.pai}' que não existe no ESQUELETO`);
  // ciclo: subir a cadeia de pais de cada osso; revisitar => ciclo (grita alto)
  for (const raiz of ossos) {
    const visto = new Set();
    let cur = raiz;
    while (cur.pai != null) {
      if (visto.has(cur.nome)) throw new Error(`oficina: ciclo de pai no esqueleto (osso '${raiz.nome}')`);
      visto.add(cur.nome);
      cur = ossos[idx.get(cur.pai)];
    }
  }
  return { ossos, idx };
}

/* ----------------------------------------------------------------------------
   VOCABULÁRIO de operações. Cada uma recebe (st, args, i) e muta o estado
   neutro. Toda referência a um id inexistente é registrada em `orfaos` e o
   passo é PULADO — grita, nunca corrompe (lei do envelope). Passo 1 traz só o
   suficiente pra provar o modelo e as partes difíceis; as ~20 da tabela do doc
   entram depois, cada uma como mais uma entrada aqui.
---------------------------------------------------------------------------- */
function Face(id, vs) { return { id, vs, cor: null, material: null, parte: null, liso: false, solido: false, tinta: [] }; }

function addV(st, id, pos) {
  if (st.V.has(id)) throw new Error(`oficina: colisão de id de vértice ${id} (bloco pequeno? passo mal-formado?)`);
  st.V.set(id, pos);
}
function addF(st, id, vs) {
  if (st.F.has(id)) throw new Error(`oficina: colisão de id de face ${id}`);
  st.F.set(id, Face(id, vs));
}
function grita(st, i, op, ref, motivo) { st.orfaos.push({ passo: i, op, ref, motivo }); }

/* CONTRATO DE IDENTIDADE DE PARTE — a ÚNICA definição de "esta face tem nome".
   Existe porque a revisão da R2 achou TRÊS respostas diferentes para a mesma
   pergunta no mesmo arquivo: a guarda de reatribuição perguntava
   `f.parte != null`, o `neutroCanonico` perguntava `if (f.parte)` e a entrada
   (`a.nome`) não perguntava nada. Um nome falsy-mas-não-nulo (`''`) sumia do
   formato salvo E mesmo assim bloqueava a nomeação seguinte — a peça ficava com
   parte que o arquivo salvo não registra; e um nome não-string (`42`, `true`,
   `['a']`, ou AUSENTE) atravessava tudo até estourar na régua da bancada, ou
   pior, virava a chave literal `"undefined"` em `st.partes` — nomear como no-op
   silencioso, o que o CLAUDE.md proíbe.

   O contrato: nome de parte é STRING com pelo menos um caractere visível.
   `''` e `'   '` são a MESMA identidade vazia para um humano e nenhuma delas é
   citável de volta por `sel:{grupo}` sem armadilha, então as duas são recusadas
   na ENTRADA, com grito. Medido contra as 19 peças do repositório: os 60 nomes
   em uso são todos strings visíveis (`'disco'`, `'faixa-da-alias'`,
   `'palaTraseiroEsquerdoB'`), então o contrato é ADITIVO — nenhuma peça shipada
   muda de hash. Quem valida a entrada é a op `parte`; quem pergunta "tem nome?"
   depois (guarda, canon, adaptador, `sel.grupo`) usa `temNomeDeParte` — uma
   definição só, sem chance de as três discordarem de novo. */
function nomeDeParteInvalido(nome) {
  if (typeof nome !== 'string') return `precisa ser uma string (recebido ${JSON.stringify(nome) ?? String(nome)}, do tipo ${nome === null ? 'null' : typeof nome})`;
  if (nome.trim() === '') return `precisa ter pelo menos um caractere visível (recebido ${JSON.stringify(nome)})`;
  return null;
}
function temNomeDeParte(nome) { return nomeDeParteInvalido(nome) === null; }

/* Fase 2: a identidade é UMA só no objeto, independente do gerador. Cada
   contrato valida e resolve apenas sua coordenada local; o resolvedor comum
   nunca precisa saber qual gerador a publicou. */
const FACES_CUBO = new Set(['fundo', 'topo', 'tras', 'direita', 'frente', 'esquerda']);
function registraOrigem(st, i, op, origemId, contrato) {
  const registros = st.origens.get(origemId) ?? [];
  registros.push({ op, ...contrato });
  st.origens.set(origemId, registros);
}
/* Geradores cuja topologia não expõe uma grade ou faces nominais ainda assim
   precisam publicar UMA origem citável. `faces` é o contrato mínimo: não
   inventa nomes geométricos frágeis, mas torna cada face do resultado
   semanticamente pertencente à primitiva. */
function contratoFaces(op) {
  return {
    validar(origem) {
      return Object.keys(origem).every((k) => k === 'op' || k === 'id')
        ? null : `${op} usa somente op e id`;
    },
    resolver(st, registro, origem) {
      for (const f of registro.faces) {
        const consumo = conferirConsumo(st, f, `a face ${f} da origem ${op}:${origem.id}`);
        if (consumo) return { erro: consumo };
      }
      const faces = registro.faces.filter((f) => st.F.has(f));
      return faces.length ? { faces } : { erro: `origem ${op}:${origem.id} não tem nenhuma face viva` };
    },
  };
}
/* CORTE: uma face CONSUMIDA nunca some em silêncio (ciclo "Corte e orientação
   de seção v1"). Abrir um furo DESTRÓI a face de entrada — ela deixa de ser um
   polígono e vira a borda anular que o corte publica. O perigo é exatamente
   este: uma face endereçada por outra parte da lista (`sel:{origem:{op:'cubo',
   id:1, face:'topo'}}`, uma porta publicada, um alias) apontaria para um id
   morto, e os contratos de origem tratam id morto de dois jeitos, os DOIS
   errados aqui:
     - referência EXPLÍCITA dizia só "foi removida", sem dizer QUEM removeu;
     - referência de UNIÃO (a primitiva inteira, um filtro de progressão) PULA
       o id morto em silêncio — o autor pinta "o cubo inteiro" e recebe cinco
       faces das seis, sem a borda do furo, e a foto fica plausível.
   `st.consumidas` (face -> {passo, op}) é o registro de quem comeu cada face, e
   este helper é a ÚNICA leitura dele. Com ele:
     - a mensagem explícita passa a NOMEAR o corte e o passo;
     - a união PARA de pular: face consumida vira ERRO, com o conserto dito
       (cite a origem que o corte publicou, ou una as duas num alias).
   Remoção por `apagaFace` continua sendo o que sempre foi (o autor mandou
   remover, a união pula): consumo é outra coisa — a face foi SUBSTITUÍDA, e
   quem a citava quase sempre quer o substituto. */
function conferirConsumo(st, fid, contexto) {
  const c = st.consumidas?.get(fid);
  return c ? `${contexto} foi consumida pelo ${c.op} do passo ${c.passo} — a face virou a borda do corte; cite a origem que o corte publicou (ou una as duas num alias)` : null;
}
function consumoDe(st, fid) {
  const c = st.consumidas?.get(fid);
  return c ? ` (consumida pelo ${c.op} do passo ${c.passo})` : '';
}
function origensIguais(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) || Array.isArray(b)) return false;
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => Object.hasOwn(b, k) && origensIguais(a[k], b[k]));
}
/* Fase 3.5, Rodada C: o validador/resolvedor ÚNICO de EIXO — usado nos dois
   eixos do loft (`faixa` e `lado`), pra não duplicar a lógica. Um eixo aceita
   três formas: AUSENTE (todos os índices), um INTEIRO (um índice só) ou um
   FILTRO DE PROGRESSÃO `{passo,fase}` (o índice `k` casa se `k%passo===fase`
   — `{passo:1,fase:0}` é a identidade, todos os índices). A medição que abriu
   esta rodada (docs/rumo/... / PLANO da Fase 3.5) achou 18,6% dos ids da moto
   em progressões de passo 2 escritas à mão (`0,2,4,…`) porque o gate
   `detector-de-banding` exige tom alternado e a linguagem não sabia dizer
   "alternado" — a progressão é o MESMO mecanismo que a IA já executava na
   mão, só que agora declarado uma vez em vez de expandido em lista.

   DECISÃO: `{passo:2}` sem `fase` (ou `{fase:0}` sem `passo`) GRITA — não
   assume `fase:0` por padrão. É o mesmo princípio do `tudo:true` (D-129):
   fail-closed prefere obrigar a palavra explícita a adivinhar em silêncio o
   que a IA quis dizer; um objeto pela metade quase sempre é descuido, não
   intenção, e assumir 0 esconderia esse descuido.

   ARMADILHA (documentar sempre que este vocabulário for citado): paridade
   sobre ÍNDICE só é válida onde a conectividade é REGULAR. É o caso aqui e só
   aqui — os eixos de `sel.origem` SÃO a grade regular do próprio gerador
   (`faixa`/`lado` do loft). Não estender isto para `sel.f` (lista de ids
   quaisquer, sem grade) nem para ids globais (que não têm eixo nenhum).

   A-19 (Endereços semânticos v1): um eixo passa a aceitar mais DUAS formas de
   índice ÚNICO, além do inteiro literal. Antes desta rodada o eixo era o único
   campo dimensional da linguagem que não passava por `st.num` — `faixa: 3`
   continuava VÁLIDA quando alguém aumentava o número de anéis e passava a
   apontar para outra faixa sem diagnóstico nenhum. A referência não ficava
   inválida; ficava ERRADA, que é pior, e o CLAUDE.md proíbe justamente isso.
   As duas formas novas:

   1. STRING que é NOME de PARAM/TOPO (ou expressão `=…`): o MESMO caminho
      `st.num` de `raio`, `altura` e todo campo dimensional. `faixa: 'bulboAneis'`
      acompanha o parâmetro em vez de congelar o número dele;
   2. PALAVRA DE EXTREMIDADE, `'primeira'` ou `'ultima'`, resolvida contra a
      CONTAGEM REAL do gerador naquele passo. "A última faixa" continua sendo a
      última quando a contagem muda — é o caso que motivou o atrito.

   As duas palavras são RESERVADAS. A primeira versão desta rodada dizia "um
   PARAM chamado `ultima` não é alcançável por um eixo (a palavra ganha)", e
   ISSO ERA O DEFEITO: num `plano` com `seg:3` e `PARAMS {ultima: 0}`, escrever
   `faixa: 'ultima'` devolvia a ÚLTIMA linha, não a linha 0, sem diagnóstico
   nenhum. A referência resolvia para OUTRA coisa em silêncio — exatamente a
   classe que o CLAUDE.md proíbe, e a mesma que o A-19 tinha acabado de fechar
   do outro lado. Vocabulário fechado é decisão legítima; precedência silenciosa
   sobre o dicionário do autor não é.

   A regra agora: a palavra continua RESERVADA (ela ganha), mas a COLISÃO GRITA.
   Declarar um PARAM/TOPO com o nome de uma extremidade e citá-lo num eixo é
   erro de referência ambígua, com a causa nomeada e o conserto dito (renomeie o
   parâmetro). Sem colisão nada muda: os dois caminhos seguem como estavam. */
/* Fase 2 (Arranjos semânticos v1): a colisão só é detectável com o dicionário
   da peça em mãos, então ele viaja no `st` — leitura, nunca escrita.

   O eixo continua sem aceitar número negativo, fracionário ou fora do limite:
   qualquer um deles GRITA com a causa nomeada, como o resto do núcleo. */
function validarEixo(valor) {
  if (valor == null) return true;
  if (Number.isSafeInteger(valor) && valor >= 0) return true;
  if (typeof valor === 'string') return valor.trim() !== '';   // nome de param, expressão ou extremidade — só resolve com st
  if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
    const chaves = Object.keys(valor);
    if (chaves.length === 2 && chaves.includes('passo') && chaves.includes('fase')) {
      const { passo, fase } = valor;
      return Number.isSafeInteger(passo) && passo >= 1 && Number.isSafeInteger(fase) && fase >= 0 && fase < passo;
    }
  }
  return false;
}
const EXTREMIDADES_EIXO = { primeira: () => 0, ultima: (tamanho) => tamanho - 1 };
/* um eixo já validado aponta para UM índice quando é inteiro (literal) ou string
   (param, expressão, extremidade); `null` e `{passo,fase}` são conjuntos. */
function eixoDeIndiceUnico(valor) { return typeof valor === 'number' || typeof valor === 'string'; }
/* resolve a forma de índice ÚNICO contra o tamanho REAL do eixo. Devolve
   `{idx}` ou `{erro}` — nunca lança: um param inexistente vira diagnóstico de
   órfão (o caminho que as origens já usam) em vez de derrubar a peça inteira. */
function indiceDeEixo(st, valor, tamanho) {
  if (typeof valor === 'number') return { idx: valor };
  if (Object.hasOwn(EXTREMIDADES_EIXO, valor)) {
    if (st.dict && Object.hasOwn(st.dict, valor)) return { erro: `é a palavra reservada de extremidade E também um parâmetro declarado (=${JSON.stringify(st.dict[valor])}) — a palavra ganha, então a citação é ambígua; renomeie o parâmetro` };
    return { idx: EXTREMIDADES_EIXO[valor](tamanho) };
  }
  let bruto;
  try { bruto = st.num(valor); } catch (e) { return { erro: `não resolve: ${String(e.message).replace(/^oficina: /, '')}` }; }
  if (!Number.isSafeInteger(bruto) || bruto < 0) return { erro: `resolveu ${bruto}, que não é índice (inteiro ≥ 0)` };
  return { idx: bruto };
}
// como o eixo aparece no diagnóstico: literal cru; string com o índice que ela resolveu
function textoDeEixo(valor, idx) { return typeof valor === 'number' ? String(valor) : `'${valor}' (=${idx})`; }
// índices de 0..tamanho-1 que casam com um eixo já validado (null=todos, inteiro=um só, {passo,fase}=progressão)
function indicesEixo(valor, tamanho) {
  if (valor == null) { const r = []; for (let k = 0; k < tamanho; k++) r.push(k); return r; }
  if (typeof valor === 'number') return valor < tamanho ? [valor] : [];
  const { passo, fase } = valor;
  const r = []; for (let k = 0; k < tamanho; k++) if (k % passo === fase) r.push(k); return r;
}

/* Fase 4 (drone/torno/lanterna): `loft` e `lathe` compartilham a MESMA estrutura de
   origem — faixas (segmentos consecutivos) × lados —, então o contrato é uma
   FÁBRICA parametrizada só pelo NOME da op (usado nas mensagens de erro), em vez
   de duas cópias da mesma lógica. `registro.faixas` é um array por SEGMENTO
   consecutivo (`faixas[idx]` = lista de ids de face daquele segmento, vazia
   quando o segmento é polo↔polo — não emitiu face e não avança o cursor), a
   mesma forma que o `loft` já monta.

   Fase 3.5, Rodada A: `faixa` era obrigatória — agora é opcional com a MESMA
   semântica que `lado` já tinha (ausente = "todos"). Isso abre, sem sintaxe
   nova: `{faixa}` = o anel (como antes); `{faixa,lado}` = uma face (como
   antes); `{lado}` sem faixa = a COLUNA (uma face por faixa, no mesmo lado);
   `{}` = todas as faces laterais da origem inteira. É ADITIVO: `faixa`
   ausente hoje GRITAVA, então nenhuma peça existente usa essa forma — a
   Prova Zero (`gabarito:selecao`) mede isso, não a argumentação.

   Rodada C: cada eixo (`faixa`, `lado`) aceita também o filtro de progressão
   `{passo,fase}` — ver `validarEixo`/`indicesEixo` acima. */
function contratoFaixaLado(op) {
  return {
    validar(origem) {
      const chaves = ['op', 'id', 'faixa', 'lado'];
      const msg = `${op} usa op, id, faixa opcional e lado opcional — cada eixo aceita inteiro não-negativo, nome de parâmetro ou expressão '=…', a extremidade 'primeira'/'ultima', ausente (todos), ou filtro de progressão {passo,fase} (passo inteiro ≥1, fase inteira em [0,passo), os dois obrigatórios juntos)`;
      if (!Object.keys(origem).every((k) => chaves.includes(k))) return msg;
      if (!validarEixo(origem.faixa)) return msg;
      if (!validarEixo(origem.lado)) return msg;
      return null;
    },
    resolver(st, registro, origem) {
      const totalFaixas = registro.faixas.length;
      if (!totalFaixas) return { erro: `origem ${op}:${origem.id} não tem faixas` };
      const faixaExplicita = eixoDeIndiceUnico(origem.faixa);
      let faixaIdx;
      if (!faixaExplicita) {
        faixaIdx = indicesEixo(origem.faixa, totalFaixas);
        if (typeof origem.faixa === 'object' && origem.faixa != null && !faixaIdx.length) {
          const { passo, fase } = origem.faixa;
          return { erro: `filtro de faixa {passo:${passo},fase:${fase}} não casa nenhum índice em 0..${totalFaixas - 1} na origem ${op}:${origem.id}` };
        }
      } else {
        const r = indiceDeEixo(st, origem.faixa, totalFaixas);
        if (r.erro) return { erro: `faixa '${origem.faixa}' da origem ${op}:${origem.id} ${r.erro}` };
        if (r.idx >= totalFaixas) return { erro: `faixa ${textoDeEixo(origem.faixa, r.idx)} fora do limite da origem ${op}:${origem.id}` };
        faixaIdx = [r.idx];
      }

      const ladoExplicito = eixoDeIndiceUnico(origem.lado);
      const faces = [];
      for (const fi of faixaIdx) {
        const faixa = registro.faixas[fi];
        if (!faixa.length) {
          // faixa degenerada (segmento polo-polo, sem face lateral): explícita
          // GRITA sempre; em união/coluna/filtro é PULADA — nunca escolhida sozinha.
          if (faixaExplicita) return { erro: `faixa ${fi} da origem ${op}:${origem.id} não tem faces laterais` };
          continue;
        }
        if (origem.lado == null) { faces.push(...faixa); continue; }
        if (ladoExplicito) {
          const r = indiceDeEixo(st, origem.lado, faixa.length);
          if (r.erro) return { erro: `lado '${origem.lado}' da faixa ${fi} da origem ${op}:${origem.id} ${r.erro}` };
          if (r.idx >= faixa.length) return { erro: `lado ${textoDeEixo(origem.lado, r.idx)} fora do limite da faixa ${fi} da origem ${op}:${origem.id} (0..${faixa.length - 1})` };
          faces.push(faixa[r.idx]);
        } else {
          const idxLado = indicesEixo(origem.lado, faixa.length);
          if (!idxLado.length) {
            const { passo, fase } = origem.lado;
            return { erro: `filtro de lado {passo:${passo},fase:${fase}} não casa nenhum índice em 0..${faixa.length - 1} na faixa ${fi} da origem ${op}:${origem.id}` };
          }
          for (const li of idxLado) faces.push(faixa[li]);
        }
      }
      if (!faces.length) return { erro: `origem ${op}:${origem.id} não tem nenhuma face lateral correspondente` };
      for (const f of faces) {
        const consumo = conferirConsumo(st, f, `a face ${f} da origem ${op}:${origem.id}`);
        if (consumo) return { erro: consumo };
      }
      return { faces };
    },
  };
}

/* Fase 4 / A-18: `cilindro` e `cone` compartilham a MESMA estrutura de origem —
   um eixo NUMÉRICO `lado` sobre as faces laterais e um eixo NOMINAL `tampa` —,
   então o contrato é uma FÁBRICA como a do loft/lathe, em vez de duas cópias.
   Os dois eixos são INDEPENDENTES (não é uma grade faixa×lado) e UNEM: `lado`
   presente contribui as laterais resolvidas, `tampa` presente contribui aquela
   tampa.

   `tampasValidas` é a lista NOMINAL do gerador (o cilindro tem 'fundo' e
   'topo'; o cone tem só 'fundo', porque o ápice é um VÉRTICE, não uma face —
   nomear um 'topo' que não existe seria prometer região e entregar nada).

   `padraoSemEixo` é a resposta a `{op,id}` sem eixo nenhum, e as duas ops
   respondem DIFERENTE de propósito:
     - 'laterais' (cilindro) — a convenção `{}` do loft/lathe, e o que resolve o
       BLOQUEADO 2 da lanterna ("só a lateral, não as tampas");
     - 'tudo' (cone) — a primitiva INTEIRA, que é o que `{op:'cone',id}` já
       significava antes desta rodada (o contrato mínimo `contratoFaces`
       devolvia todas as faces). Trocar isso por 'laterais' faria toda citação
       de cone já escrita passar a apontar para OUTRO conjunto sem nenhum
       diagnóstico — exatamente a classe de erro que o A-19 condena. A
       aditividade manda mais que a simetria. */
function contratoLadoTampa(op, tampasValidas, padraoSemEixo) {
  const listaTampas = tampasValidas.map((t) => `'${t}'`).join(' ou ');
  return {
    validar(origem) {
      const chaves = ['op', 'id', 'lado', 'tampa'];
      const msg = `${op} usa op, id, lado opcional (eixo numérico sobre as faces laterais: inteiro, nome de parâmetro ou expressão '=…', extremidade 'primeira'/'ultima', ausente = todas, ou filtro de progressão {passo,fase}) e tampa opcional (${listaTampas})`;
      if (!Object.keys(origem).every((k) => chaves.includes(k))) return msg;
      if (!validarEixo(origem.lado)) return msg;
      if (origem.tampa != null && !tampasValidas.includes(origem.tampa)) return msg;
      return null;
    },
    resolver(st, registro, origem) {
      const ladoPresente = origem.lado != null;
      const tampaPresente = origem.tampa != null;
      const semEixo = !ladoPresente && !tampaPresente;
      const faces = [];
      if (ladoPresente || semEixo) {   // explícito, OU nenhum dos dois -> default = todas as laterais
        const totalLaterais = registro.laterais.length;
        if (eixoDeIndiceUnico(origem.lado)) {
          // lado EXPLÍCITO (um índice só): fora do limite ou já removido nomeiam a causa,
          // a mesma distinção do `face` do cubo (índice inválido != face que já existiu e sumiu).
          const r = indiceDeEixo(st, origem.lado, totalLaterais);
          if (r.erro) return { erro: `lado '${origem.lado}' da origem ${op}:${origem.id} ${r.erro}` };
          if (r.idx >= totalLaterais) return { erro: `lado ${textoDeEixo(origem.lado, r.idx)} fora do limite da origem ${op}:${origem.id} (0..${totalLaterais - 1})` };
          const f = registro.laterais[r.idx];
          if (!st.F.has(f)) return { erro: `lado ${textoDeEixo(origem.lado, r.idx)} da origem ${op}:${origem.id} foi removido${consumoDe(st, f)}` };
          faces.push(f);
        } else {
          // ausente (todas) ou filtro {passo,fase}: união silenciosa, pulando lado já removido
          // (a mesma convenção do cubo pra `face` ausente — remover uma lateral é normal, não erro).
          // CONSUMIDA é a exceção (ciclo do corte): substituída não é removida, e pular grita.
          const idxLado = indicesEixo(origem.lado, totalLaterais);
          if (typeof origem.lado === 'object' && origem.lado != null && !idxLado.length) {
            const { passo, fase } = origem.lado;
            return { erro: `filtro de lado {passo:${passo},fase:${fase}} não casa nenhum índice em 0..${totalLaterais - 1} na origem ${op}:${origem.id}` };
          }
          for (const li of idxLado) {
            const f = registro.laterais[li];
            const consumo = conferirConsumo(st, f, `lado ${li} da origem ${op}:${origem.id}`);
            if (consumo) return { erro: consumo };
            if (st.F.has(f)) faces.push(f);
          }
        }
      }
      if (tampaPresente) {
        const f = registro.tampas[origem.tampa];
        if (f == null || !st.F.has(f)) return { erro: `tampa '${origem.tampa}' da origem ${op}:${origem.id} foi removida${f == null ? '' : consumoDe(st, f)}` };
        faces.push(f);
      } else if (semEixo && padraoSemEixo === 'tudo') {
        // a primitiva inteira: laterais acima + as tampas VIVAS, na ordem nominal declarada
        for (const nome of tampasValidas) {
          const f = registro.tampas[nome];
          if (f == null) continue;
          const consumo = conferirConsumo(st, f, `tampa '${nome}' da origem ${op}:${origem.id}`);
          if (consumo) return { erro: consumo };
          if (st.F.has(f)) faces.push(f);
        }
      }
      if (!faces.length) return { erro: `origem ${op}:${origem.id} não tem nenhuma face correspondente` };
      return { faces };
    },
  };
}

/* Fase 4 / A-18: `cubo` e `chamferBox` compartilham as MESMAS 6 faces nominais —
   o chamferBox é o cubo com os cortes de aresta e canto, e as 6 faces originais
   nascem na mesma ordem e com o mesmo significado. A fábrica cobre os dois; o
   chamferBox só acrescenta as duas FAMÍLIAS que a topologia dele tem a mais,
   `aresta` (12) e `canto` (8), cada uma um eixo NUMÉRICO como o `lado` do
   cilindro. Nada de vocabulário novo: `face` continua sendo `face`.

   Os campos presentes UNEM. NENHUM presente = a primitiva inteira, todas as
   famílias que o gerador registrou (6 no cubo, 26 no chamferBox) — que é o que
   as duas ops já respondiam antes desta rodada, então nenhuma peça shipada muda. */
function contratoCaixa(op, familias) {
  const nomesFamilias = Object.keys(familias);   // '' quando é só o cubo
  return {
    validar(origem) {
      const chaves = ['op', 'id', 'face', ...nomesFamilias];
      const extra = nomesFamilias.map((f) => `, ${f} opcional (eixo numérico 0..${familias[f].total - 1}: inteiro, nome de parâmetro ou expressão '=…', extremidade 'primeira'/'ultima', ausente = todas, ou filtro de progressão {passo,fase})`).join('');
      const msg = `${op} usa op, id e face opcional (fundo, topo, tras, direita, frente ou esquerda)${extra}`;
      if (!Object.keys(origem).every((k) => chaves.includes(k))) return msg;
      if (origem.face != null && !FACES_CUBO.has(origem.face)) return msg;
      for (const f of nomesFamilias) if (!validarEixo(origem[f])) return msg;
      return null;
    },
    resolver(st, registro, origem) {
      const faces = [];
      const semEixo = origem.face == null && nomesFamilias.every((f) => origem[f] == null);
      if (origem.face != null) {
        const face = registro.faces[origem.face];
        if (face == null) return { erro: `face '${origem.face}' não existe na origem ${op}:${origem.id}` };
        if (!st.F.has(face)) return { erro: `face '${origem.face}' da origem ${op}:${origem.id} foi removida${consumoDe(st, face)}` };
        faces.push(face);
      } else if (semEixo) {
        for (const nome of FACES_CUBO) {
          const face = registro.faces[nome];
          if (face == null) continue;
          const consumo = conferirConsumo(st, face, `face '${nome}' da origem ${op}:${origem.id}`);
          if (consumo) return { erro: consumo };
          if (st.F.has(face)) faces.push(face);
        }
      }
      for (const familia of nomesFamilias) {
        const eixo = origem[familia];
        if (eixo == null && !semEixo) continue;
        const lista = registro[familias[familia].chave];
        if (eixoDeIndiceUnico(eixo)) {
          const r = indiceDeEixo(st, eixo, lista.length);
          if (r.erro) return { erro: `${familia} '${eixo}' da origem ${op}:${origem.id} ${r.erro}` };
          if (r.idx >= lista.length) return { erro: `${familia} ${textoDeEixo(eixo, r.idx)} fora do limite da origem ${op}:${origem.id} (0..${lista.length - 1})` };
          const f = lista[r.idx];
          if (!st.F.has(f)) return { erro: `${familia} ${textoDeEixo(eixo, r.idx)} da origem ${op}:${origem.id} foi removida${consumoDe(st, f)}` };
          faces.push(f);
        } else {
          const idx = indicesEixo(eixo, lista.length);
          if (typeof eixo === 'object' && eixo != null && !idx.length) {
            const { passo, fase } = eixo;
            return { erro: `filtro de ${familia} {passo:${passo},fase:${fase}} não casa nenhum índice em 0..${lista.length - 1} na origem ${op}:${origem.id}` };
          }
          for (const k of idx) {
            const f = lista[k];
            const consumo = conferirConsumo(st, f, `${familia} ${k} da origem ${op}:${origem.id}`);
            if (consumo) return { erro: consumo };
            if (st.F.has(f)) faces.push(f);
          }
        }
      }
      if (!faces.length) return { erro: `origem ${op}:${origem.id} não tem nenhuma face viva` };
      return { faces };
    },
  };
}

const CONTRATOS_ORIGEM = {
  loft: contratoFaixaLado('loft'),
  /* lathe — MESMA estrutura de faixas × lados que o loft (o `lathe` é o TEMPLATE
     de que o `loft` generalizou, ver o comentário da op `lathe` mais abaixo);
     reusa a fábrica acima em vez de duplicar validar/resolver. */
  lathe: contratoFaixaLado('lathe'),
  /* cilindro — dois eixos INDEPENDENTES (não uma grade faixa×lado como o
     loft/lathe): `lado` é numérico sobre as L faces LATERAIS; `tampa` é
     NOMINAL ('fundo'|'topo'), como o `face` do cubo — sem filtro de
     progressão (não é um eixo de índice regular, são só duas faces). Os dois
     UNEM: `lado` presente contribui as laterais resolvidas; `tampa` presente
     contribui aquela tampa; NENHUM dos dois presente = todas as LATERAIS,
     sem tampa nenhuma (a convenção `{}` do loft/lathe, e o que resolve o
     BLOQUEADO 2 da lanterna — "só a lateral, não as tampas"). */
  cilindro: contratoLadoTampa('cilindro', ['fundo', 'topo'], 'laterais'),
  cubo: contratoCaixa('cubo', {}),
  esfera: contratoFaixaLado('esfera'),
  /* cone — A-18: a MESMA estrutura do cilindro (lado + tampa), porque a
     topologia é a mesma menos o anel de cima: `lado` são as L laterais
     triangulares (b+0..b+L-1) e a única tampa é a base ('fundo', b+L). Não
     existe 'topo': o ápice é um VÉRTICE. `{op,id}` sem eixo continua sendo a
     primitiva inteira, como era com o contrato mínimo. */
  cone: contratoLadoTampa('cone', ['fundo'], 'tudo'),
  /* plano — A-18: a grade é literalmente `faixa` × `lado`, a MESMA estrutura do
     loft/lathe/esfera, então reusa a fábrica sem vocabulário novo: a faixa é a
     LINHA em z (iz, de -z pra +z) e o lado é a COLUNA em x (ix, de -x pra +x),
     a numeração `b + iz·seg + ix` que a op já documenta linha a linha. */
  plano: contratoFaixaLado('plano'),
  /* chamferBox — A-18: as 6 faces originais são as MESMAS do cubo (mesma ordem,
     mesmo significado), e o chanfro acrescenta duas famílias que a op já
     documenta e trava por teste: 12 retângulos de aresta (b+6..b+17, na ordem
     X,Y,Z) e 8 triângulos de canto (b+18..b+25, na ordem dos CANTOS). */
  chamferBox: contratoCaixa('chamferBox', { aresta: { chave: 'arestas', total: 12 }, canto: { chave: 'cantos', total: 8 } }),
  /* inflate — o ÚNICO gerador que fica no contrato mínimo, e isso é DECISÃO
     medida, não omissão (A-18): a malha dele sai de um scan de voxels, sem
     fórmula fechada de face — não existe grade nem face nominal honesta para
     endereçar. Publicar `{linha,coluna}` aqui seria prometer região e entregar
     ordem de varredura. Enquanto a topologia for essa, o contrato certo é
     citar a primitiva inteira. */
  inflate: contratoFaces('inflate'),
  espelha: {
    validar(origem) {
      const chaves = ['op', 'id', 'de'];
      if (!Object.keys(origem).every((k) => chaves.includes(k)) || !Object.hasOwn(origem, 'de')) return 'espelha usa op, id e de';
      const fonte = validarOrigem(origem.de);
      return fonte.erro ? `espelha exige de estrutural válido: ${fonte.erro}` : null;
    },
    resolver(st, registro, origem) {
      if (!origensIguais(origem.de, registro.derivaDe)) return { erro: `origem espelha:${origem.id} foi derivada de outra seleção estrutural` };
      const fonte = resolverOrigem(st, origem.de);
      if (fonte.erro) return { erro: `origem derivada inválida: ${fonte.erro}` };
      const faces = [];
      for (const original of fonte.faces) {
        const copia = registro.copias.get(original);
        if (copia == null || !st.F.has(copia)) return { erro: `cópia da face ${original} da origem derivada não existe` };
        faces.push(copia);
      }
      return { faces };
    },
  },
  /* arranja (O-13) — a MESMA forma de origem derivada do `espelha` (`{op,id,de}`,
     com `de` apontando para a fonte), mais UM eixo: `copia`. É esse eixo que
     impede a cópia anônima, o risco central do item: um arranjo de 5 cópias
     publica UMA identidade endereçável de seis jeitos —
       `{op:'arranja', id}`                  a COLEÇÃO inteira, na ordem de cópia;
       `{op:'arranja', id, copia: 2}`        a terceira cópia;
       `{op:'arranja', id, copia: 'nBracos'} o índice que acompanha o PARAM;
       `{op:'arranja', id, copia: 'ultima'}` a última, mude a contagem que mudar;
       `{op:'arranja', id, copia: {passo,fase}}` uma progressão (alternadas);
     e NENHUM deles cita id de face, índice de passo ou posição na lista.

     ORDEM: as faces saem cópia a cópia e, dentro de cada uma, na ordem da
     origem fonte. É construção determinística, e está dito aqui como o que é —
     NENHUM consumidor do núcleo distingue hoje essa ordem (todo caminho de
     `sel` deduplica num Set e a canon reordena por id), então ela não tem
     afirmação em teste e não vale como promessa medida. Trocar a ordem hoje não
     muda peça nenhuma; no dia em que uma op passar a depender dela, o teste
     nasce junto com a op.

     A NUMERAÇÃO das cópias é 0..total−2 e conta CÓPIAS, não instâncias: a fonte
     NÃO é cópia (ela já tem a identidade dela, a origem citada em `de`), e o
     arranjo só responde pelo que ele criou — a mesma lei do `espelha`, que
     resolve para a imagem e nunca para o original. A cópia `k` está a `k+1`
     passos da fonte; quem quer as duas coisas junta as duas origens num ALIAS
     `unir`, que é o mecanismo que já existe para isso. */
  arranja: {
    validar(origem) {
      const chaves = ['op', 'id', 'de', 'copia'];
      const msg = "arranja usa op, id, de e copia opcional (eixo numérico sobre as cópias 0..total−2: inteiro, nome de parâmetro ou expressão '=…', extremidade 'primeira'/'ultima', ausente = a coleção inteira, ou filtro de progressão {passo,fase})";
      if (!Object.keys(origem).every((k) => chaves.includes(k)) || !Object.hasOwn(origem, 'de')) return msg;
      if (!validarEixo(origem.copia)) return msg;
      const fonte = validarOrigem(origem.de);
      return fonte.erro ? `arranja exige de estrutural válido: ${fonte.erro}` : null;
    },
    resolver(st, registro, origem) {
      if (!origensIguais(origem.de, registro.derivaDe)) return { erro: `origem arranja:${origem.id} foi derivada de outra seleção estrutural` };
      const fonte = resolverOrigem(st, origem.de);
      if (fonte.erro) return { erro: `origem derivada inválida: ${fonte.erro}` };
      const nCopias = registro.copias.length;
      let indices;
      if (eixoDeIndiceUnico(origem.copia)) {
        const r = indiceDeEixo(st, origem.copia, nCopias);
        if (r.erro) return { erro: `copia '${origem.copia}' da origem arranja:${origem.id} ${r.erro}` };
        if (r.idx >= nCopias) return { erro: `copia ${textoDeEixo(origem.copia, r.idx)} fora do limite da origem arranja:${origem.id} (0..${nCopias - 1})` };
        indices = [r.idx];
      } else {
        indices = indicesEixo(origem.copia, nCopias);
        if (typeof origem.copia === 'object' && origem.copia != null && !indices.length) {
          const { passo, fase } = origem.copia;
          return { erro: `filtro de copia {passo:${passo},fase:${fase}} não casa nenhum índice em 0..${nCopias - 1} na origem arranja:${origem.id}` };
        }
      }
      const faces = [];
      for (const k of indices) {
        const mapa = registro.copias[k];
        for (const original of fonte.faces) {
          const copia = mapa.get(original);
          if (copia == null || !st.F.has(copia)) return { erro: `copia ${k} da face ${original} da origem derivada não existe` };
          faces.push(copia);
        }
      }
      return { faces };
    },
  },
  /* furo (ciclo "Corte e orientação de seção v1") — a origem que impede a face
     ANÔNIMA no único lugar onde ela seria mais cara: um corte cria 3·lados
     faces de uma vez, e sem endereço nenhuma delas seria citável de volta.
     Três famílias NUMÉRICAS, todas com `lados` elementos e o mesmo índice `j`
     do anel (a `parede j` fica embaixo da `borda j`), mais uma tampa NOMINAL:
       `{op:'furo', id}`                    o furo INTEIRO (borda + parede + saída/fundo);
       `{op:'furo', id, borda: 2}`          a terceira aba da borda de entrada;
       `{op:'furo', id, parede: {passo:2,fase:0}} as paredes alternadas;
       `{op:'furo', id, parede: 'ultima'}`  a última parede, mude `lados` que mudar;
       `{op:'furo', id, saida: 0}`          a borda do outro lado (só PASSANTE);
       `{op:'furo', id, tampa:'fundo'}`     o fundo do furo (só CEGO).
     As famílias UNEM, como no cubo e no cilindro. Citar `saida` num furo cego,
     ou `tampa:'fundo'` num passante, GRITA nomeando o modo — a família não
     existe naquele furo, e devolver vazio seria prometer região e entregar
     nada. */
  furo: {
    validar(origem) {
      const chaves = ['op', 'id', 'borda', 'parede', 'saida', 'tampa'];
      const msg = "furo usa op, id, borda/parede/saida opcionais (eixo numérico sobre os `lados` do anel: inteiro, nome de parâmetro ou expressão '=…', extremidade 'primeira'/'ultima', ausente = todas, ou filtro de progressão {passo,fase}) e tampa opcional ('fundo', só no furo cego)";
      if (!Object.keys(origem).every((k) => chaves.includes(k))) return msg;
      for (const familia of ['borda', 'parede', 'saida']) if (!validarEixo(origem[familia])) return msg;
      if (origem.tampa != null && origem.tampa !== 'fundo') return msg;
      return null;
    },
    resolver(st, registro, origem) {
      const passante = registro.saidas != null;
      if (origem.saida != null && !passante) return { erro: `origem furo:${origem.id} é um furo CEGO — não tem saída; o fundo dele é tampa:'fundo'` };
      if (origem.tampa != null && passante) return { erro: `origem furo:${origem.id} é um furo PASSANTE — não tem fundo; a borda do outro lado é o eixo 'saida'` };
      const semEixo = origem.borda == null && origem.parede == null && origem.saida == null && origem.tampa == null;
      const faces = [];
      const familias = [['borda', registro.bordas], ['parede', registro.paredes], ['saida', registro.saidas]];
      for (const [nome, lista] of familias) {
        if (lista == null) continue;
        const eixo = origem[nome];
        if (eixo == null && !semEixo) continue;
        if (eixoDeIndiceUnico(eixo)) {
          const r = indiceDeEixo(st, eixo, lista.length);
          if (r.erro) return { erro: `${nome} '${eixo}' da origem furo:${origem.id} ${r.erro}` };
          if (r.idx >= lista.length) return { erro: `${nome} ${textoDeEixo(eixo, r.idx)} fora do limite da origem furo:${origem.id} (0..${lista.length - 1})` };
          const f = lista[r.idx];
          if (!st.F.has(f)) return { erro: `${nome} ${textoDeEixo(eixo, r.idx)} da origem furo:${origem.id} foi removida${consumoDe(st, f)}` };
          faces.push(f);
        } else {
          const idx = indicesEixo(eixo, lista.length);
          if (typeof eixo === 'object' && eixo != null && !idx.length) {
            const { passo, fase } = eixo;
            return { erro: `filtro de ${nome} {passo:${passo},fase:${fase}} não casa nenhum índice em 0..${lista.length - 1} na origem furo:${origem.id}` };
          }
          for (const k of idx) {
            const f = lista[k];
            const consumo = conferirConsumo(st, f, `${nome} ${k} da origem furo:${origem.id}`);
            if (consumo) return { erro: consumo };
            if (st.F.has(f)) faces.push(f);
          }
        }
      }
      if (registro.fundo != null && (origem.tampa != null || semEixo)) {
        const consumo = conferirConsumo(st, registro.fundo, `tampa 'fundo' da origem furo:${origem.id}`);
        if (consumo) return { erro: consumo };
        if (!st.F.has(registro.fundo)) {
          if (origem.tampa != null) return { erro: `tampa 'fundo' da origem furo:${origem.id} foi removida` };
        } else faces.push(registro.fundo);
      }
      if (!faces.length) return { erro: `origem furo:${origem.id} não tem nenhuma face correspondente` };
      return { faces };
    },
  },
};
function validarOrigem(origem) {
  if (!origem || typeof origem !== 'object' || Array.isArray(origem) || !Object.hasOwn(origem, 'op') || !Object.hasOwn(origem, 'id')) return { erro: 'origem precisa ser um objeto com op e id' };
  const contrato = CONTRATOS_ORIGEM[origem.op];
  if (!contrato) return { erro: `op de origem '${origem.op}' desconhecida` };
  if (!Number.isSafeInteger(origem.id) || origem.id < 0) return { erro: 'id da origem precisa ser inteiro não-negativo' };
  const erro = contrato.validar(origem);
  return erro ? { erro } : { contrato };
}
function textoDeclaracoes(origemId, declaracoes) {
  return `origemId ${origemId} ambígua: duplicado nas declarações dos passos ${declaracoes.map((d) => `${d.passo} (${d.op})`).join(', ')}`;
}
function mapearDeclaracoesOrigem(PASSOS) {
  const declaracoes = new Map();
  PASSOS.forEach((passo, i) => {
    const [op, args = {}] = Array.isArray(passo) ? passo : [];
    if (!CONTRATOS_ORIGEM[op] || !args || !Number.isSafeInteger(args.origemId) || args.origemId < 0) return;
    const lista = declaracoes.get(args.origemId) ?? [];
    lista.push({ passo: i, op }); declaracoes.set(args.origemId, lista);
  });
  return declaracoes;
}
/* COMPLETUDE DE ALIAS (A-7 / O-11) — só DIAGNÓSTICO, não muda resolução.
   Um alias é resolvido no momento da CITAÇÃO, mas o autor pensa nele como
   COISA: escreve `sel:{alias:'discoInteiro'}` num passo em que só metade do
   disco nasceu e recebe `origem cilindro:302 inexistente ou ainda não criada`
   — correto e inútil, porque não diz que basta ESPERAR. A informação já existe
   no núcleo: `mapearDeclaracoesOrigem` varre a lista inteira ANTES de executar
   e sabe em que passo cada origemId nasce. Daqui sai o passo em que o alias
   fica completo (o MAIOR passo entre as origens que ele une e que ainda não
   existem) e a lista do que falta. `null` = não é caso de completude (a origem
   não é declarada em passo nenhum, ou já nasceu — aí o erro é outro, e a
   mensagem genérica é a certa).

   NÃO resolve tarde de propósito: exigir completude só no fim da lista é
   mudança de SEMÂNTICA do formato salvo (Faixa 3 do plano), e mudar semântica
   junto com diagnóstico esconderia qual dos dois resolveu a dor.

   CONSELHO SÓ SE FOR VERDADE. "Espere o alias fechar" só está certo se TODO
   termo do alias ou já resolve, ou nasce num passo à frente COM A MESMA op. O
   primeiro desenho perguntava só `st.origens.has(origem.id)` — tratava "id
   registrado" como "termo resolvido" — e por isso mandava esperar um alias que
   nunca fecharia: `{op:'cilindro', id:7}` com o 7 declarado por um `cubo`
   falha em QUALQUER passo (`origem 7 foi declarada por 'cubo', não por
   'cilindro'`). Conselho errado ao lado do diagnóstico certo é pior que
   silêncio, porque a próxima IA segue a instrução e perde a rodada inteira. O
   termo permanentemente inválido agora tem mensagem PRÓPRIA: 'nunca fecha, e
   por quê'. */
function completudeDoAlias(st, termos, i) {
  let passoCompleto = -1;
  const pendentes = [];
  const nunca = [];   // termos que falham em QUALQUER passo: esperar não resolve
  for (const termo of termos) {
    const origem = origemDoTermoDeAlias(termo);
    if (!origem) { nunca.push('um termo do alias não é {origem:{op,id}} (aliases não encadeiam)'); continue; }
    const validacao = validarOrigem(origem);
    if (validacao.erro) { nunca.push(`o termo ${JSON.stringify(origem)} é inválido em qualquer passo: ${validacao.erro}`); continue; }
    const declaracoes = st.declaracoesOrigem.get(origem.id) ?? [];
    if (declaracoes.length > 1) { nunca.push(`${origem.op}:${origem.id} — ${textoDeclaracoes(origem.id, declaracoes)}`); continue; }
    const registros = st.origens.get(origem.id) ?? [];
    if (registros.length) {
      /* já nasceu — só continua segurando o alias se nasceu ERRADA (outra op, ou
         mais de um gerador na mesma identidade); nesse caso nunca vai casar. */
      if (registros.length !== 1) nunca.push(`${origem.op}:${origem.id} — a origem ${origem.id} tem ${registros.length} geradores declarando a mesma identidade`);
      else if (registros[0].op !== origem.op) nunca.push(`${origem.op}:${origem.id} — a origem ${origem.id} foi declarada por '${registros[0].op}', não por '${origem.op}'`);
      continue;
    }
    for (const d of declaracoes) {
      if (d.passo <= i) continue;              // declarada antes e mesmo assim ausente: outra causa (op abortou), mensagem genérica basta
      if (d.op !== origem.op) { nunca.push(`${origem.op}:${origem.id} — o passo ${d.passo} declara a origem ${origem.id} por '${d.op}', não por '${origem.op}'`); continue; }
      if (d.passo > passoCompleto) passoCompleto = d.passo;
      pendentes.push(`${d.op}:${origem.id} (nasce no passo ${d.passo})`);
    }
  }
  if (nunca.length) return { tipo: 'nunca', motivos: nunca };
  return passoCompleto < 0 ? null : { tipo: 'espera', passo: passoCompleto, pendentes };
}

/* forma de um termo de alias: EXATAMENTE `{origem:{...}}`. Uma definição só,
   usada pela resolução (que grita) e pelo diagnóstico de completude (que
   precisa saber se o termo é insalvável antes de mandar esperar). */
function origemDoTermoDeAlias(termo) {
  if (!termo || typeof termo !== 'object' || Array.isArray(termo)) return null;
  if (termo.alias != null || termo.origem == null) return null;
  if (Object.keys(termo).some((k) => k !== 'origem')) return null;
  return termo.origem;
}

function resolverOrigem(st, origem) {
  const validacao = validarOrigem(origem);
  if (validacao.erro) return { erro: `origem inválida: ${validacao.erro}` };
  const declaracoes = st.declaracoesOrigem.get(origem.id) ?? [];
  if (declaracoes.length > 1) return { erro: textoDeclaracoes(origem.id, declaracoes) };
  const registros = st.origens.get(origem.id) ?? [];
  if (!registros.length) return { erro: `origem ${origem.op}:${origem.id} inexistente ou ainda não criada` };
  if (registros.length !== 1) return { erro: `origem ${origem.id} ambígua: ${registros.length} geradores declararam esta identidade` };
  if (registros[0].op !== origem.op) return { erro: `origem ${origem.id} foi declarada por '${registros[0].op}', não por '${origem.op}'` };
  return validacao.contrato.resolver(st, registros[0], origem);
}

/* UMA face, endereçada por origem estrutural. É o que o `furo` exige de `de` e
   de `saida`: um corte precisa saber EXATAMENTE qual face ele abre, e uma
   origem que resolve para duas faces é endereço ambíguo, não escolha a fazer. */
function faceUnicaEstrutural(st, origem, op, campo, i) {
  const validacao = validarOrigem(origem);
  if (validacao.erro) { grita(st, i, op, campo, `${campo} exige uma origem estrutural {op,id,…}: ${validacao.erro}`); return null; }
  const r = resolverOrigem(st, origem);
  if (r.erro) { grita(st, i, op, campo, r.erro); return null; }
  const faces = [...new Set(r.faces)];
  if (faces.length !== 1) { grita(st, i, op, campo, `${campo} precisa resolver para EXATAMENTE uma face: ${JSON.stringify(origem)} resolveu para ${faces.length} (${faces.slice(0, 8).join(', ')}${faces.length > 8 ? ', …' : ''})`); return null; }
  return faces[0];
}

function resolverPorta(st, nome) {
  const porta = st.portas.get(nome);
  if (!porta) return { erro: `porta '${nome}' inexistente ou ainda não publicada` };
  const resultado = resolverOrigem(st, porta.de);
  return resultado.erro ? { erro: `porta '${nome}' inválida: ${resultado.erro}` } : resultado;
}

/* valida o `id` opcional de uma primitiva contra a base posicional: se o
   arquivo escreveu um id que não bate com a posição, é um aviso alto (não muda
   a numeração — a POSIÇÃO manda sempre). */
function confereId(st, i, op, args) {
  const b = baseDoPasso(i);
  if (typeof args.id === 'number' && args.id !== b) grita(st, i, op, args.id, `id ${args.id} ≠ base da posição ${b} — a posição manda`);
  return b;
}

/* resolverSelecao (D-129, `tudo` na Rodada B): a ÚNICA semântica de `sel` da
   Oficina. Devolve os dois alvos que uma op pode precisar: vértices e faces.
   `tudo:true` seleciona TODOS os vértices e TODAS as faces vivas — é a única
   forma EXPLÍCITA de dizer "a peça inteira" (ver comentário no corpo: por que
   não é `sel` ausente); `v` seleciona os vértices literais E toda face que
   toca algum deles; `f` seleciona as faces literais; `grupo` seleciona as
   faces cuja `f.parte` tem aquele nome; e `regiao` seleciona os vértices
   dentro da caixa INCLUSIVA e as faces segundo `modo` (abaixo).
   Campos presentes se UNEM. Assim uma região não vaza meia face para uma
   operação de atributo, mas rotaciona/transladar preservam exatamente a
   regra antiga: movem os vértices dentro da caixa.

   ASSIMETRIA de `regiao`, agora dita em voz alta (era implícita e custava
   caro; é o O-3 de docs/mecanifica/OFICINA-OTIMIZACOES.md): um VÉRTICE entra
   se ELE estiver dentro da caixa — o eixo de vértice
   sempre leu a região como "toca". Uma FACE, até aqui, só entrava com TODOS
   os cantos dentro (`f.vs.every(dentro)`). A MESMA caixa selecionava, então,
   conjuntos diferentes conforme a op fosse de vértice (`transladar`) ou de
   face (`pincel`), e NADA no formato salvo dizia isso — é a origem clássica
   do ciclo "alarga a caixa, refotografa". `modo` torna a regra da FACE
   explícita: `contem` (DEFAULT — byte-compatível com toda peça já shipada) =
   face inteira dentro; `toca` = pelo menos um canto dentro. Valor diferente
   dos dois GRITA.

   O eixo de VÉRTICE não muda com `modo`: em `toca` a face entra, mas só os
   cantos DENTRO da caixa entram como vértice. É deliberado — se `toca`
   arrastasse os cantos de fora, ele mudaria em silêncio o que
   `transladar`/`rotaciona` movem, que é exatamente a classe de surpresa que
   este item veio matar. Quem quer a face inteira como alvo de vértice usa
   `sel:{f}`/`{origem}`/`{alias}`, que passam por `adicionaFace` e levam os
   cantos junto.

   A seleção é formato salvo: nunca ignora uma chave, uma referência ou uma
   seleção vazia. `grita` leva op + tipo + causa; a lista continua executando
   sem corromper o neutro. Só as ops que JÁ documentavam seleção vazia como
   no-op (vértice) passam `vazioNoop`.

   Os SETE seletores vivem numa LISTA SÓ (`SELETORES`, logo abaixo). Eram três
   listas escritas à mão e uma delas — a de seleção vazia — ensinava SEIS,
   omitindo justamente `alias`: o núcleo imprimindo a mesma omissão que o O-0
   tinha acabado de corrigir na skill, na hora em que o autor mais precisa da
   lista certa. Com lista única, um oitavo seletor entra nas três mensagens de
   uma vez e nenhuma pode envelhecer sozinha. */
const SELETORES = ['tudo', 'v', 'f', 'grupo', 'regiao', 'origem', 'porta', 'alias'];
const SELETOR = new Set(SELETORES);

function resolverSelecao(st, sel, op, i, { vazioNoop = false, soVertices = false } = {}) {
  if (sel == null) return { vertices: new Set(st.V.keys()), faces: new Set(st.F.keys()) };
  if (typeof sel !== 'object' || Array.isArray(sel)) {
    grita(st, i, op, 'sel', `seleção inválida: sel precisa ser um objeto com ${SELETORES.join(', ')}`);
    return { vertices: new Set(), faces: new Set() };
  }
  for (const chave of Object.keys(sel)) if (!SELETOR.has(chave)) grita(st, i, op, `sel.${chave}`, `seleção desconhecida '${chave}' (só ${SELETORES.join(', ')})`);

  const vertices = new Set(), faces = new Set();
  const adicionaFace = (fid) => {
    const f = st.F.get(fid);
    if (!f) { grita(st, i, op, fid, 'face inexistente na seleção'); return; }
    faces.add(fid); for (const v of f.vs) vertices.add(v);
  };
  let teveChave = false;
  /* `tudo` (D-129/Rodada B): a única forma EXPLÍCITA de dizer "a peça inteira".
     Só aceita `true` literal — `tudo:false`/`1`/`'sim'` GRITAM, porque um valor
     estranho aceito em silêncio ensinaria a próxima IA a escrever besteira que
     passa. UNE com as outras chaves, como todo campo de `sel` já faz (redundante
     com outra chave não é erro). Isto é DELIBERADAMENTE diferente de `sel`
     ausente, que continua gritando: ausência nunca vira "tudo" por acidente —
     só a palavra explícita `tudo:true` significa a peça inteira. */
  if (sel.tudo != null) {
    teveChave = true;
    if (sel.tudo !== true) grita(st, i, op, 'sel.tudo', "seleção tudo inválida: só aceita o literal true");
    else { for (const v of st.V.keys()) vertices.add(v); for (const fid of st.F.keys()) faces.add(fid); }
  }
  if (sel.v != null) {
    teveChave = true;
    if (!Array.isArray(sel.v)) grita(st, i, op, 'sel.v', 'seleção v inválida: precisa ser uma lista de ids de vértice');
    else for (const v of sel.v) {
      if (!st.V.has(v)) { grita(st, i, op, v, 'vértice inexistente na seleção'); continue; }
      vertices.add(v);
      for (const f of st.F.values()) if (f.vs.includes(v)) faces.add(f.id);
    }
  }
  if (sel.f != null) {
    teveChave = true;
    if (!Array.isArray(sel.f)) grita(st, i, op, 'sel.f', 'seleção f inválida: precisa ser uma lista de ids de face');
    else for (const fid of sel.f) adicionaFace(fid);
  }
  if (sel.grupo != null) {
    teveChave = true;
    /* MESMO contrato da op `parte` (`temNomeDeParte`): o que não pode ser
       criado como identidade também não pode ser citado como grupo. */
    const erroGrupo = nomeDeParteInvalido(sel.grupo);
    if (erroGrupo) grita(st, i, op, 'sel.grupo', `seleção grupo inválida: nome de parte ${erroGrupo}`);
    else {
      let achou = false;
      for (const f of st.F.values()) if (f.parte === sel.grupo) { achou = true; adicionaFace(f.id); }
      if (!achou) grita(st, i, op, sel.grupo, `grupo '${sel.grupo}' não tem nenhuma face válida (nome errado, ou a op 'parte' ainda não rodou)`);
    }
  }
  if (sel.regiao != null) {
    teveChave = true;
    const r = sel.regiao;
    if (typeof r !== 'object' || Array.isArray(r) || r == null || Object.keys(r).some((k) => k !== 'min' && k !== 'max' && k !== 'modo') || !Object.hasOwn(r, 'min') || !Object.hasOwn(r, 'max')) {
      grita(st, i, op, 'sel.regiao', 'seleção regiao inválida: precisa ter min E max (e no máximo mais modo), os dois [x,y,z] finitos');
    } else if (r.modo != null && r.modo !== 'contem' && r.modo !== 'toca') {
      /* `modo` é chave do FORMATO SALVO: o conjunto de valores é fechado e
         valor estranho GRITA — 'contido'/'dentro'/true aceitos em silêncio
         cairiam no default e o autor juraria ter pedido `toca`. */
      grita(st, i, op, 'sel.regiao', `seleção regiao inválida: modo só aceita 'contem' (face inteira dentro, default) ou 'toca' (pelo menos um canto dentro); recebido ${JSON.stringify(r.modo)}`);
    } else if (r.modo != null && soVertices) {
      /* `modo` governa o eixo de FACE, e esta op consome só VÉRTICE: escrever
         `modo` aqui não muda NADA. Era engolido em silêncio — `toca`, `contem`
         e a ausência davam canon byte-idêntico em `transladar`, enquanto no
         `pincel` a MESMA caixa pinta 1 face contra 5. Ou seja, a chave
         funcionava numa op e evaporava na outra, e o autor que copiasse o
         `sel` de um exemplo de `pincel` para um `transladar` recebia calado o
         comportamento antigo — a malha rasgando de novo, que é justamente o
         ciclo que este item veio matar.

         Escolhi GRITAR em vez de fazer `modo` mover vértice: sob `toca` os
         cantos de FORA da caixa entrariam no arrasto, o que muda em silêncio o
         que `transladar`/`rotaciona` movem em toda peça futura — trocar um
         no-op mudo por uma mudança SILENCIOSA de semântica não é conserto. E `contem`
         também grita: o eixo de vértice sempre foi "toca" (um ponto ou está
         dentro ou não está), então `contem` numa op de vértice é igualmente
         inerte e igualmente mentiroso. Fail-closed como o `modo` inválido acima
         — a região não seleciona nada e o diagnóstico diz a saída. */
      grita(st, i, op, 'sel.regiao', `seleção regiao inválida: modo só governa o eixo de FACE, e '${op}' consome só vértices — um vértice entra sempre que estiver DENTRO da caixa, então modo:${JSON.stringify(r.modo)} aqui não teria efeito nenhum. Tire o modo (a seleção de vértice não muda), ou aplique a caixa numa op de face (pincel/parte/material/solido); para arrastar a face inteira use sel:{f}/{origem}/{alias}, que levam os cantos junto.`);
    } else {
      let min, max;
      try { min = st.vec(r.min); max = st.vec(r.max); }
      catch (e) { grita(st, i, op, 'sel.regiao', `seleção regiao inválida: ${e.message}`); }
      if (min && max) {
        if (min.some((v, k) => v > max[k])) grita(st, i, op, 'sel.regiao', 'seleção regiao inválida: min não pode ser maior que max');
        else {
          const dentro = (p) => p[0] >= min[0] && p[0] <= max[0] && p[1] >= min[1] && p[1] <= max[1] && p[2] >= min[2] && p[2] <= max[2];
          const toca = r.modo === 'toca';
          for (const [v, p] of st.V) if (dentro(p)) vertices.add(v);
          // `contem` = every (regra histórica, o default); `toca` = some. O eixo de VÉRTICE acima é o mesmo nos dois.
          for (const f of st.F.values()) if (toca ? f.vs.some((v) => dentro(st.V.get(v))) : f.vs.every((v) => dentro(st.V.get(v)))) faces.add(f.id);
        }
      }
    }
  }
  if (sel.origem != null) {
    teveChave = true;
    const origem = sel.origem;
    const resultado = resolverOrigem(st, origem);
    if (resultado.erro) grita(st, i, op, 'sel.origem', resultado.erro);
    else for (const fid of resultado.faces) adicionaFace(fid);
  }
  if (sel.porta != null) {
    teveChave = true;
    if (nomeDeParteInvalido(sel.porta)) grita(st, i, op, 'sel.porta', "seleção porta inválida: precisa ser um nome semântico visível");
    else {
      const resultado = resolverPorta(st, sel.porta);
      if (resultado.erro) grita(st, i, op, 'sel.porta', resultado.erro);
      else for (const fid of resultado.faces) adicionaFace(fid);
    }
  }
  if (sel.alias != null) {
    teveChave = true;
    const nome = sel.alias;
    const def = st.aliases.get(nome);
    if (typeof nome !== 'string' || !def) grita(st, i, op, 'sel.alias', `alias '${nome}' inexistente`);
    else {
      const termos = def.unir ?? [def];
      if (!Array.isArray(termos) || !termos.length) grita(st, i, op, 'sel.alias', `alias '${nome}' inválido: precisa apontar para origem ou unir`);
      else {
        const antes = st.orfaos.length;
        for (const termo of termos) {
          if (!origemDoTermoDeAlias(termo)) { grita(st, i, op, 'sel.alias', `alias '${nome}' inválido: aliases não encadeiam e só aceitam origem`); continue; }
          const r = resolverSelecao(st, termo, op, i, { soVertices });
          for (const v of r.vertices) vertices.add(v); for (const f of r.faces) faces.add(f);
        }
        if (st.orfaos.length > antes) {
          /* O-11: além da causa (que já gritou acima), dizer QUANDO o alias
             fica citável. Uma mensagem por CITAÇÃO, não por termo. */
          const completude = completudeDoAlias(st, termos, i);
          if (completude && completude.tipo === 'espera') grita(st, i, op, 'sel.alias', `alias '${nome}' fica completo no passo ${completude.passo}; você citou no passo ${i} — falta ${completude.pendentes.join(', ')}. Espere o alias fechar (cite depois desse passo) ou use um alias por primitiva nas operações intermediárias.`);
          else if (completude && completude.tipo === 'nunca') grita(st, i, op, 'sel.alias', `alias '${nome}' NUNCA fica completo — esperar não resolve: ${completude.motivos.join('; ')}. Corrija a definição do alias.`);
          vertices.clear(); faces.clear();
        }
      }
    }
  }
  /* a lista dos SETE, igual à da chave desconhecida logo acima: o núcleo estava
     ensinando seis e escondendo justamente `alias` — a mesma omissão que o O-0
     acabou de corrigir na skill, impressa pela própria ferramenta. */
  if (!teveChave) grita(st, i, op, 'sel', `seleção vazia: informe ${SELETORES.join(', ')}`);
  if (!vertices.size && !faces.size && !vazioNoop) grita(st, i, op, 'sel', 'seleção vazia: nenhum alvo válido foi encontrado');
  return { vertices, faces };
}

/* `soVertices`: quem entra por aqui (displace/transladar/rotaciona) descarta as
   faces resolvidas. É essa informação que deixa `sel.regiao.modo` — chave que só
   governa o eixo de face — gritar em vez de evaporar. */
function resolverAlvosV(st, sel, op, i) { return resolverSelecao(st, sel, op, i, { vazioNoop: true, soVertices: true }).vertices; }

/* A assinatura histórica `faces:[ids]` continua igual. `faces` e `sel` na
   mesma op seriam duas fontes concorrentes, então GRITAM em vez de unir por
   acidente. Operações por face não têm seleção vazia documentada como no-op. */
function resolverAlvosF(st, a, op, i, { todasQuandoAusente = false } = {}) {
  if (a.faces != null && a.sel != null) {
    grita(st, i, op, 'faces+sel', 'seleção ambígua: use faces:[ids] (legado) OU sel:{...}, nunca os dois');
    return new Set();
  }
  if (a.faces != null) {
    if (!Array.isArray(a.faces)) { grita(st, i, op, 'faces', 'seleção faces inválida: precisa ser uma lista de ids de face'); return new Set(); }
    const faces = new Set();
    for (const fid of a.faces) {
      if (!st.F.has(fid)) { grita(st, i, op, fid, 'face inexistente na seleção'); continue; }
      faces.add(fid);
    }
    if (!faces.size) grita(st, i, op, 'faces', 'seleção vazia: nenhum id de face válido foi encontrado');
    return faces;
  }
  if (a.sel != null) {
    const faces = resolverSelecao(st, a.sel, op, i).faces;
    // Uma região pode conter vértice(s) mas nenhuma face INTEIRA; para uma op
    // de atributo isso ainda é seleção vazia, nunca um no-op silencioso.
    if (!faces.size) grita(st, i, op, 'sel', 'seleção vazia para faces: nenhum alvo de face válido foi encontrado');
    return faces;
  }
  if (todasQuandoAusente) return new Set(st.F.keys());
  grita(st, i, op, 'seleção', 'seleção ausente: use faces:[ids] (legado) ou sel:{...}');
  return new Set();
}

/* ----------------------------------------------------------------------------
   Frame de TRANSPORTE PARALELO — usado só pela op `loft` abaixo. Reimplementado
   AQUI, byte-equivalente ao `quadro`/`transporta` de motor/arvore-cartoon.js (a
   convenção já provada no `galhoSeca` daquele arquivo): MESMA matemática, MESMA
   ordem de operações — mas LOCAL, porque o núcleo não importa do motor de
   árvores (fica autocontido). `quadroLoft(t)` monta a semente do frame a partir
   de uma tangente `t` (um eixo de referência quase-perpendicular evita produto
   vetorial quase-nulo); `transportaLoft(uPrev, t)` propaga o `u` anterior pra
   uma tangente NOVA projetando fora a componente ao longo dela (`u = uPrev −
   t·(uPrev·t)`) e renormalizando — e, se isso degenerar (tangente ~oposta à
   anterior), refaz do zero com `quadroLoft(t)`. É isto que faz o `loft` não
   TORCER numa curva: o `u` acompanha a tangente pelo caminho mais curto. */
function quadroLoft(t) {
  const ref = Math.abs(t[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const c = cross3(ref, t);
  const u = norm3(c[0], c[1], c[2]);
  return [u, cross3(u, t)];
}
function transportaLoft(uPrev, t) {
  const dot = uPrev[0] * t[0] + uPrev[1] * t[1] + uPrev[2] * t[2];
  let u = [uPrev[0] - t[0] * dot, uPrev[1] - t[1] * dot, uPrev[2] - t[2] * dot];
  if (Math.hypot(u[0], u[1], u[2]) < 1e-4) u = quadroLoft(t)[0];
  return norm3(u[0], u[1], u[2]);
}

/* ----------------------------------------------------------------------------
   CORTE — as peças de geometria plana que o `furo` usa. Ficam aqui, fora da op,
   porque cada uma é uma pergunta com resposta objetiva e testável isolada.
---------------------------------------------------------------------------- */

/* Uma face vista como POLÍGONO PLANO: normal (Newell), quadro 2D (u,w) com
   `cross(u,w) === N`, e os cantos já projetados nesse quadro. `u` vem de
   `referencia` (projetada no plano, a MESMA regra da `orientacao` do loft)
   quando ela é dada; senão do quadro determinístico do `quadroLoft`.
   Devolve `{erro}` quando a face não é plana: um furo numa face torta não tem
   plano de entrada, e furar "mais ou menos no plano médio" seria a escolha
   interna voltando pela janela. */
function poligonoPlano(st, fid, referencia) {
  const f = st.F.get(fid);
  const P = f.vs.map((v) => st.V.get(v));
  if (P.some((p) => !p)) return { erro: `a face ${fid} tem canto sem posição` };
  if (P.length < 3) return { erro: `a face ${fid} tem ${P.length} canto(s) — um polígono precisa de 3` };
  const N = normalDaFace(st.V, f.vs);
  const c = [0, 0, 0];
  for (const p of P) { c[0] += p[0] / P.length; c[1] += p[1] / P.length; c[2] += p[2] / P.length; }
  let escala = 0;
  for (const p of P) escala = Math.max(escala, Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]));
  const tol = 1e-6 * Math.max(1, escala);
  for (let k = 0; k < P.length; k++) {
    const d = (P[k][0] - c[0]) * N[0] + (P[k][1] - c[1]) * N[1] + (P[k][2] - c[2]) * N[2];
    if (Math.abs(d) > tol) return { erro: `a face ${fid} não é plana: o canto ${f.vs[k]} está a ${d.toFixed(6)} do plano médio (tolerância ${tol.toExponential(1)})` };
  }
  let u;
  if (referencia) {
    const dot = referencia[0] * N[0] + referencia[1] * N[1] + referencia[2] * N[2];
    const px = referencia[0] - N[0] * dot, py = referencia[1] - N[1] * dot, pz = referencia[2] - N[2] * dot;
    if (Math.hypot(px, py, pz) < 1e-4) return { erro: `orientacao ${JSON.stringify(referencia.map((n) => +n.toFixed(6)))} é paralela à normal da face ${fid} — a projeção no plano da face é nula, não há orientação a declarar` };
    u = norm3(px, py, pz);
  } else {
    u = quadroLoft(N)[0];
  }
  const w = cross3(N, u);
  const proj = (p) => [(p[0] - c[0]) * u[0] + (p[1] - c[1]) * u[1] + (p[2] - c[2]) * u[2], (p[0] - c[0]) * w[0] + (p[1] - c[1]) * w[1] + (p[2] - c[2]) * w[2]];
  return { face: f, N, u, w, centro: c, P, uv: P.map(proj), proj, escala };
}

/* Convexidade + área positiva no quadro (u,w). O `furo` só corta polígono
   CONVEXO, e isso é DECISÃO, não omissão: num polígono côncavo "dentro da
   face" deixa de ser decidível por produto vetorial de aresta, o anel pode
   ficar dentro do fecho e fora da face, e a borda anular sairia com faces
   sobrepostas — silenciosamente errado e plausível na foto. Côncavo GRITA. */
function convexoCCW(uv) {
  let area = 0;
  const n = uv.length;
  for (let k = 0; k < n; k++) { const p = uv[k], q = uv[(k + 1) % n]; area += p[0] * q[1] - q[0] * p[1]; }
  if (!(area > 0)) return `o polígono tem área ${(area / 2).toExponential(2)} no próprio plano — degenerado ou com winding invertido`;
  const esc = Math.sqrt(Math.abs(area));
  for (let k = 0; k < n; k++) {
    const p = uv[k], q = uv[(k + 1) % n], r = uv[(k + 2) % n];
    const cruz = (q[0] - p[0]) * (r[1] - q[1]) - (q[1] - p[1]) * (r[0] - q[0]);
    if (cruz < -1e-9 * esc * esc) return `o canto ${(k + 1) % n} é reflexo — o polígono é CÔNCAVO`;
  }
  return null;
}

/* Margem do ponto para DENTRO do polígono convexo CCW: a menor distância
   assinada até as retas das arestas. Positiva = estritamente dentro. */
function margemDentro(uv, ponto) {
  let menor = Infinity;
  for (let k = 0; k < uv.length; k++) {
    const p = uv[k], q = uv[(k + 1) % uv.length];
    const ex = q[0] - p[0], ey = q[1] - p[1];
    const len = Math.hypot(ex, ey) || 1;
    menor = Math.min(menor, (ex * (ponto[1] - p[1]) - ey * (ponto[0] - p[0])) / len);
  }
  return menor;
}

/* A BORDA ANULAR: a lista de faces que preenche o espaço entre o contorno
   externo (os cantos ORIGINAIS da face, que continuam existindo — é por isso
   que o corte não abre fenda com a vizinhança) e o anel do furo.

   REGRA (formato salvo): são SEMPRE `lados` faces, uma por ARESTA do anel, e a
   face `j` é a que contém a aresta do anel `j → j+1`. Essa contagem não depende
   de geometria nenhuma: mudar `raio`, `centro` ou o número de cantos da face
   NÃO renumera a borda. O que a geometria escolhe é só QUANTOS cantos externos
   cada face abraça: o canto `k` entra na face `j` cujo setor angular (em torno
   do centro do furo, no quadro (u,w)) o contém. Um polígono convexo com o
   centro dentro tem os cantos em ordem angular crescente, então o casamento é
   cíclico e monótono, cada aresta externa é usada UMA vez, e as faces vizinhas
   compartilham exatamente o corte radial que as separa (malha fechada).

   Escolher o canto por ÂNGULO, e não por índice (`floor(j·n/lados)`), foi
   medido: o casamento por índice produz quadriláteros REFLEXOS num quadrado
   com furo central e `lados:8` — planos, mas côncavos, e o leque de
   triangulação do visor os preenche torto. */
function bordaAnular(uv, anelUV) {
  const n = uv.length, L = anelUV.length;
  const TAU = Math.PI * 2;
  const ang = (p) => { const t = Math.atan2(p[1], p[0]); return t < 0 ? t + TAU : t; };
  const theta = uv.map(ang);
  const ancora = [];
  for (let j = 0; j < L; j++) {
    const phi = ang(anelUV[j]);
    let melhor = 0, melhorDist = Infinity;
    for (let k = 0; k < n; k++) {
      const d = (phi - theta[k] + TAU) % TAU;
      if (d < melhorDist) { melhorDist = d; melhor = k; }
    }
    ancora.push(melhor);
  }
  const faces = [];
  let arestasUsadas = 0;
  for (let j = 0; j < L; j++) {
    const de = ancora[j], ate = ancora[(j + 1) % L];
    const externos = [de];
    let k = de, passos = 0;
    while (k !== ate) { k = (k + 1) % n; externos.push(k); if (++passos > n) return { erro: 'casamento angular do anel não fechou o contorno externo' }; }
    arestasUsadas += passos;
    faces.push({ externos, anel: [(j + 1) % L, j] });
  }
  if (arestasUsadas !== n) return { erro: `a borda usaria ${arestasUsadas} aresta(s) do contorno de ${n} — o casamento angular não é uma volta` };
  return { faces };
}

/* exportado (P7 do playground, D-120): o MANIFESTO de capacidades da Oficina
   sai daqui — `Object.keys(OPS)` é a lista de ops IMPLEMENTADAS de verdade,
   nunca precisa ser copiada à mão num doc que pode desatualizar. A bancada
   `criar.mjs` cruza isso contra a tabela da skill `criar-peca` e avisa se
   divergir (op no núcleo sem doc, ou doc citando op que não existe mais). */
export const OPS = {
  /* ---- primitivas: criam vértices únicos + faces a partir da base do passo ---- */
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
    const L = Math.max(3, st.num(a.lados ?? 8) | 0);   // `lados` é TOPO: muda a CONTAGEM
    if (2 * L > BLOCO) throw new Error(`oficina: cilindro com ${L} lados estoura o bloco de ids (${BLOCO}); máx ${(BLOCO / 2) | 0}`);   // D3: guarda de overflow por-passo
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
    const L = Math.max(3, st.num(a.lados ?? 8) | 0);   // TOPO: muda a CONTAGEM
    if (L + 1 > BLOCO) throw new Error(`oficina: cone com ${L} lados estoura o bloco de ids (${BLOCO}); máx ${BLOCO - 1}`);   // guarda de overflow (D3): lados+1 vértices E lados+1 faces
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
  lathe(st, a, i) {
    const b = confereId(st, i, 'lathe', a);
    if (a.origemId != null && (!Number.isSafeInteger(a.origemId) || a.origemId < 0)) return grita(st, i, 'lathe', 'origemId', 'origemId precisa ser inteiro não-negativo');
    const perfil = a.perfil ?? [];
    if (perfil.length < 2) return grita(st, i, 'lathe', perfil.length, `perfil precisa de ao menos 2 pontos (tem ${perfil.length})`);
    const L = Math.max(3, st.num(a.lados ?? 8) | 0);   // TOPO (pra TODO o perfil): muda a CONTAGEM

    /* resolve + valida CADA ponto ANTES de criar qualquer vértice (raio/y podem
       citar PARAM, como os outros pontos dimensionais da Oficina). FAIL-CLOSED
       (D-115): um ponto que não seja EXATAMENTE [raio, y] (2 elementos) — 3+
       (a alça de curva RESERVADA, ainda não implementada) ou <2 (malformado) —
       GRITA e ABORTA o passo inteiro (0 V/0 F), como o raio<0. Nunca constrói
       malha "plausível-porém-reservada" que mudaria de figura quando a curva
       chegar: reserva de formato salvo é fail-closed, não fail-open. */
    let pontoInvalido = false;
    const pontos = perfil.map((pt, j) => {
      if (!Array.isArray(pt) || pt.length !== 2) { grita(st, i, 'lathe', j, `ponto ${j} do perfil precisa ser [raio, y] (2 elementos); recebido ${Array.isArray(pt) ? `${pt.length} elemento(s)` : 'não-array'} — a alça de curva (3º elemento) está RESERVADA, ainda não implementada`); pontoInvalido = true; return { raio: 0, y: 0, polo: true }; }
      const raio = st.num(pt[0]), y = st.num(pt[1]);
      if (raio < 0) { grita(st, i, 'lathe', j, `raio negativo (${raio}) no ponto ${j} do perfil — não dá pra classificar polo/anel`); pontoInvalido = true; }
      return { raio, y, polo: raio === 0 };
    });
    if (pontoInvalido) return;   // algum ponto inválido (aridade ≠ 2, ou raio<0) -> nada construído neste passo (grita já registrado por ponto)

    // guarda de overflow (D3): soma EXATA — segmento polo<->polo não soma face — ANTES de inserir
    let nV = 0; for (const p of pontos) nV += p.polo ? 1 : L;
    let nF = 0; for (let idx = 0; idx < pontos.length - 1; idx++) if (!(pontos[idx].polo && pontos[idx + 1].polo)) nF += L;
    if (nV > BLOCO || nF > BLOCO) throw new Error(`oficina: lathe com ${perfil.length} pontos × lados=${L} estoura o bloco de ids (${BLOCO}): ${nV} vértices / ${nF} faces`);

    // VÉRTICES — anda o cursor (a fórmula documentada acima)
    let cursor = 0;
    const info = pontos.map((p) => {
      if (p.polo) {
        const id = b + cursor;
        addV(st, id, [0, p.y, 0]);
        cursor += 1;
        return { polo: true, id };
      }
      const ids = [];
      for (let j = 0; j < L; j++) { const t = (j / L) * Math.PI * 2; const id = b + cursor + j; addV(st, id, [Math.cos(t) * p.raio, p.y, Math.sin(t) * p.raio]); ids.push(id); }
      cursor += L;
      return { polo: false, ids };
    });

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
     também. Cada ponto do contorno é `[u,w]` (2 elementos); a alça de curva
     é RESERVADA no 3º elemento — GRITA e ABORTA, a mesma lei do ponto do
     perfil no lathe (D-115). Contagem errada (≠ `lados`) GRITA e ABORTA.
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

      /* CONTORNO explícito (P5): substitui o círculo por EXATAMENTE `lados`
         pontos [u,w] no plano LOCAL do anel (os mesmos eixos fr.u/fr.w do
         transporte paralelo) — a contagem/numeração/faces do anel não mudam
         em NADA (só a origem das coordenadas de cada vértice), então toda a
         guarda de overflow e o cursor de face seguem intactos. Nunca é polo
         (polo é só raio:0 explícito). Ponto malformado (aridade ≠ 2 — a alça
         de curva reservada seria o 3º elemento, mesma lei do lathe/D-115) e
         contorno com contagem errada GRITAM e ABORTAM. */
      if (!Array.isArray(s.contorno) || s.contorno.length !== L) { grita(st, i, 'loft', j, `contorno da seção ${j} precisa ter exatamente 'lados' (${L}) pontos [u,w] (tem ${Array.isArray(s.contorno) ? s.contorno.length : typeof s.contorno})`); invalido = true; return { pos, raio: 0, contorno: null, polo: true }; }
      let pontoInvalido = false;
      const pts = s.contorno.map((pt, k) => {
        if (!Array.isArray(pt) || pt.length !== 2) { grita(st, i, 'loft', j, `ponto ${k} do contorno da seção ${j} precisa ser [u,w] (2 elementos); a alça de curva (3º elemento) está RESERVADA, ainda não implementada`); pontoInvalido = true; return [0, 0]; }
        return [st.num(pt[0]), st.num(pt[1])];
      });
      if (pontoInvalido) { invalido = true; return { pos, raio: 0, contorno: null, polo: true }; }

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
    const tangente = (idx) => (idx === 0 ? dirSeg[0] : idx === ultimo ? dirSeg[ultimo - 1] : norm3(dirSeg[idx - 1][0] + dirSeg[idx][0], dirSeg[idx - 1][1] + dirSeg[idx][1], dirSeg[idx - 1][2] + dirSeg[idx][2]));

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

    // VÉRTICES — anda o cursor (a fórmula documentada acima)
    let cursor = 0;
    const info = secoes.map((s, idx) => {
      if (s.polo) {
        const id = b + cursor;
        addV(st, id, s.pos);
        cursor += 1;
        return { polo: true, id };
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
      return { polo: false, ids };
    });

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
     LIMITAÇÃO HONESTA: o resultado é BLOCKY (facetado pelos voxels), não
     suave — a mesma classe do "lathe só reto por enquanto" (D-115): útil hoje,
     suavizar (ex. marching cubes) fica pra quando o caso real pedir.

     ARGS: `contornoLado`/`contornoTopo`: `[[a,b],...]` (≥3 pontos cada, PARAM
     via `st.num`) — a MESMA lei do `contorno` do loft (D-118): ponto com
     aridade ≠ 2 é a alça de curva RESERVADA, GRITA e ABORTA o passo inteiro
     (fail-closed, D-115). `divisoes` (TOPO, mín 2): subdivide o EIXO MAIS
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

    const validaContorno = (pontos, nome) => {
      if (!Array.isArray(pontos) || pontos.length < 3) { grita(st, i, 'inflate', nome, `${nome} precisa de ao menos 3 pontos (tem ${Array.isArray(pontos) ? pontos.length : typeof pontos})`); return null; }
      let ruim = false;
      const out = pontos.map((pt, k) => {
        if (!Array.isArray(pt) || pt.length !== 2) { grita(st, i, 'inflate', `${nome}[${k}]`, `ponto ${k} de ${nome} precisa ser [a,b] (2 elementos); a alça de curva (3º elemento) está RESERVADA, ainda não implementada`); ruim = true; return [0, 0]; }
        return [st.num(pt[0]), st.num(pt[1])];
      });
      return ruim ? null : out;
    };
    const lado = validaContorno(a.contornoLado, 'contornoLado');
    const topo = validaContorno(a.contornoTopo, 'contornoTopo');
    if (!lado || !topo) return;   // grita já registrado por contorno inválido

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

  /* Publica uma porta por nome do autor. Ela guarda a origem estrutural, nunca
     faces resolvidas: por isso a mesma porta continua correta depois de mover,
     rotacionar ou pintar a primitiva. */
  publicarPorta(st, a, i) {
    const erroNome = nomeDeParteInvalido(a.nome);
    if (erroNome) return grita(st, i, 'publicarPorta', 'nome', `nome da porta ${erroNome}`);
    if (st.portas.has(a.nome)) return grita(st, i, 'publicarPorta', 'nome', `porta '${a.nome}' já foi publicada no passo ${st.portas.get(a.nome).passo}`);
    const validacao = validarOrigem(a.de);
    if (validacao.erro) return grita(st, i, 'publicarPorta', 'de', `porta exige de:{op,id,...} estrutural válido: ${validacao.erro}`);
    const resultado = resolverOrigem(st, a.de);
    if (resultado.erro) return grita(st, i, 'publicarPorta', 'de', resultado.erro);
    st.portas.set(a.nome, { de: a.de, passo: i });
  },

  /* ---- edição por id estável ---- */
  moveV(st, a, i) {
    const v = a.v;
    if (!st.V.has(v)) return grita(st, i, 'moveV', v, 'vértice inexistente');
    const d = st.vec(a.d ?? [0, 0, 0]);
    const p = st.V.get(v);
    st.V.set(v, [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);   // SEMPRE por deslocamento (acompanha a base)
  },

  /* extruda (modo face): a prova da numeração de meio-de-caminho. Cria um anel
     NOVO de vértices (base = POSIÇÃO do passo), levanta a face por `dist` na
     normal, e ergue as paredes laterais. */
  extruda(st, a, i) {
    const fid = a.face;
    const f = st.F.get(fid);
    if (!f) return grita(st, i, 'extruda', fid, 'face inexistente');
    const anel = f.vs.slice();
    for (const v of anel) if (!st.V.has(v)) return grita(st, i, 'extruda', v, 'canto da face inexistente');
    const dist = st.num(a.dist ?? 0);
    const N = normalDaFace(st.V, anel);
    const b = baseDoPasso(i);                 // vértices novos: numerados pela posição
    const novo = anel.map((v, k) => { const p = st.V.get(v); const id = b + k; addV(st, id, [p[0] + N[0] * dist, p[1] + N[1] * dist, p[2] + N[2] * dist]); return id; });
    for (let k = 0; k < anel.length; k++) { const n = (k + 1) % anel.length; addF(st, b + k, [anel[k], anel[n], novo[n], novo[k]]); } // paredes
    f.vs = novo;                              // a face-tampa sobe pro anel novo (mantém o id)
  },

  /* mescla (de:[ids] -> para:id): a interação mais delicada. Some os `de`, faz
     as faces apontarem pro `para`, colapsa cantos repetidos e apaga a face que
     virou área-zero (<3 cantos distintos). Não abre buraco no motor — o solto é
     re-gerado na exportação. `de`/`para` ficam gravados no passo. */
  mescla(st, a, i) {
    const para = a.para;
    if (!st.V.has(para)) return grita(st, i, 'mescla', para, 'destino inexistente');
    const rem = new Set();
    for (const d of a.de ?? []) {
      if (d === para) continue;
      if (!st.V.has(d)) { grita(st, i, 'mescla', d, 'origem inexistente'); continue; }
      rem.add(d);
    }
    if (!rem.size) return;
    for (const f of st.F.values()) {
      const trocado = f.vs.map((v) => (rem.has(v) ? para : v));
      f.vs = colapsaCiclo(trocado);
    }
    for (const [id, f] of [...st.F]) {
      const dist = distintos(f.vs);
      if (dist < 3) { st.F.delete(id); continue; }   // área zero (merge de cantos adjacentes): some quieto, o doc prevê
      if (dist < f.vs.length) { grita(st, i, 'mescla', id, `face ${id} ficou com canto repetido (bowtie) — removida`); st.F.delete(id); }   // D2: dup não-consecutivo -> grita + remove (lei "órfão grita, nunca corrompe")
    }
    for (const d of rem) st.V.delete(d);
    st.merges.push({ de: [...rem].sort((x, y) => x - y), para });
  },

  /* ---- P8 do playground: edição restante — moveF/moveA/vira/apagaFace/displace
     são id-estável puro (como moveV/extruda/mescla acima: nunca criam id, nunca
     renumeram); nenhuma tem numeração própria pra documentar. ---- */

  /* moveF: move TODOS os cantos de uma face pelo mesmo delta — ADITIVO
     (`p+d`), a mesma lei do moveV. Um canto COMPARTILHADO com outra face
     move JUNTO (não existe "vértice exclusivo da face" na malha — é o
     comportamento normal de mover uma face num editor: desloca a geometria,
     não desconecta nada; pra deslocar sem afetar vizinho, use `extruda`
     antes). Face inexistente GRITA (órfão), nunca corrompe. */
  moveF(st, a, i) {
    const fid = a.face;
    const f = st.F.get(fid);
    if (!f) return grita(st, i, 'moveF', fid, 'face inexistente');
    const d = st.vec(a.d ?? [0, 0, 0]);
    for (const v of new Set(f.vs)) {   // Set: um canto REPETIDO na mesma face (não deveria existir — mescla já limpa bowtie) nunca aplica o delta 2×
      const p = st.V.get(v);
      if (!p) { grita(st, i, 'moveF', v, 'canto da face inexistente'); continue; }   // defensivo — nunca deveria faltar
      st.V.set(v, [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
    }
  },

  /* moveA: move as DUAS pontas de uma aresta (`a`,`b`) pelo mesmo delta —
     açúcar sobre dois moveV (mesma lei ADITIVA), como UM passo só na lista
     (uma aresta é uma ação, não duas). NÃO exige que `a`/`b` estejam de fato
     ligados por alguma face — mover dois vértices juntos nunca corrompe
     nada, então checar conectividade só atrapalharia um uso legítimo. Cada
     ponta inexistente GRITA (órfão) e é ignorada — a outra ainda move. */
  moveA(st, a, i) {
    const d = st.vec(a.d ?? [0, 0, 0]);
    for (const v of [a.a, a.b]) {
      const p = st.V.get(v);
      if (!p) { grita(st, i, 'moveA', v, 'ponta da aresta inexistente'); continue; }
      st.V.set(v, [p[0] + d[0], p[1] + d[1], p[2] + d[2]]);
    }
  },

  /* vira: INVERTE o winding de uma face — reverte a ORDEM dos cantos (`f.vs`),
     o que vira a normal (Newell) pro lado oposto. Não cria nem apaga
     vértice/face, só a ORDEM. Face inexistente GRITA. Conserta uma face que
     nasceu de costas sem reconstruir o passo inteiro.

     CARACTERÍSTICA (não é bug — é a natureza de uma ferramenta cirúrgica,
     medida no teste): virar uma face que já estava CONSISTENTE com as
     vizinhas QUEBRA o pareamento de arestas do teste de manifold — a
     vizinha continua no sentido antigo, então a aresta compartilhada passa a
     andar no MESMO sentido dos dois lados em vez de opostos (medido: 4
     arestas soltas ao virar o topo já-correto de um cubo). O uso responsável
     é o oposto: consertar uma face que JÁ estava de costas (aí virar
     RESTAURA o pareamento, não quebra). `vira` não valida consistência com
     vizinhas — é uma ferramenta pontual, não uma correção automática de
     malha inteira. */
  vira(st, a, i) {
    const fid = a.face;
    const f = st.F.get(fid);
    if (!f) return grita(st, i, 'vira', fid, 'face inexistente');
    f.vs = f.vs.slice().reverse();
  },

  /* apagaFace: remove uma face de `st.F`. Os VÉRTICES dela continuam
     existindo (podem estar em uso por outra face, ou não — um vértice sem
     face nenhuma não é erro, é normal ao abrir um buraco de propósito: porta,
     janela, ou preparo pra composição manual). Face inexistente GRITA. */
  apagaFace(st, a, i) {
    if (a.face != null && a.sel != null) return grita(st, i, 'apagaFace', 'face+sel', 'seleção ambígua: use face:id (legado) OU sel:{...}, nunca os dois');
    if (a.sel != null) {
      const diagnosticosAntes = st.orfaos.length;
      const faces = resolverSelecao(st, a.sel, 'apagaFace', i).faces;
      if (st.orfaos.length !== diagnosticosAntes) return;
      if (faces.size !== 1) {
        if (faces.size > 1) grita(st, i, 'apagaFace', 'sel', 'seleção ambígua: apagaFace exige exatamente uma face');
        return;
      }
      st.F.delete(faces.values().next().value);
      return;
    }
    const fid = a.face;
    if (!st.F.has(fid)) return grita(st, i, 'apagaFace', fid, 'face inexistente');
    st.F.delete(fid);
  },

  /* displace — P8c do playground: desloca uma SELEÇÃO de vértices ao longo da própria
     NORMAL (a média das normais de Newell — `normalDaFace` — de TODAS as faces ATUAIS
     que tocam aquele vértice, medida ANTES de mover qualquer um, como o centroide do
     `rotaciona`) por uma distância de RUÍDO 3D seedado (`ruido3`, acima) amostrado na
     posição do vértice × `frequencia`. Determinístico: a mesma peça com o mesmo
     `semente` sempre desloca pro MESMO lugar (a razão de existir uma semente — sem
     ela não daria pra reproduzir a peça salva, a mesma lei do resto do formato).

     SELEÇÃO (`sel`, opcional, via `resolverAlvosV` — P8): AUSENTE = malha inteira,
     como o `rotaciona`. `amplitude` (padrão 0,1) é o desvio MÁXIMO (mundo); `ruido3`
     devolve [0,1), remapeado pra [−amplitude,+amplitude] antes de multiplicar a
     normal. `frequencia` (padrão 1) escala a posição ANTES de amostrar o ruído — mais
     alta = relevo mais fino (as células do reticulado do ruído cabem mais vezes no
     mesmo espaço); não passa por validação própria (qualquer finito serve, `st.num`
     já barra o resto). Vértice SEM NENHUMA face (ex.: sobrou solto de um `apagaFace`)
     não tem normal pra seguir — GRITA (órfão) e fica no lugar, nunca desloca às
     cegas. Amplitude 0 é no-op determinístico (desvio sempre 0, mas ainda soma —
     não é atalho, só o resultado natural da fórmula). */
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
    if (estrutural) registraOrigem(st, i, 'espelha', a.origemId, { derivaDe, copias });
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
  arranja(st, a, i) {
    const modo = a.modo;
    if (modo !== 'radial' && modo !== 'linear') return grita(st, i, 'arranja', modo, `modo '${modo}' desconhecido (só 'radial' e 'linear')`);

    const total = st.num(a.total ?? 0);
    if (!Number.isSafeInteger(total) || total < 2) return grita(st, i, 'arranja', 'total', `total precisa ser inteiro ≥ 2 (a fonte conta como instância); recebido ${JSON.stringify(a.total ?? null)} = ${total}`);
    const nCopias = total - 1;

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
    registraOrigem(st, i, 'arranja', a.origemId, { derivaDe: a.derivaDe, copias });
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
       `centro`        OBRIGATÓRIO, `[x,y,z]` dimensional (pode citar PARAM). É
                       PROJETADO no plano da entrada — o autor dá o ponto do
                       mundo onde o furo passa, não uma coordenada de face.
                       Sem default: o centroide da face seria um default
                       ESPERTO, e um furo que muda de lugar quando a face muda
                       de forma é a classe de surpresa que este núcleo recusa;
       `raio`          OBRIGATÓRIO, > 0, dimensional;
       `lados`         TOPO (padrão 8, mín 3): muda a CONTAGEM, logo renumera;
       `saida`         a origem estrutural da face de SAÍDA — furo PASSANTE;
       `profundidade`  distância > 0 ao longo do eixo — furo CEGO;
                       `saida` e `profundidade` dizem coisas diferentes e
                       nenhuma é derivável da outra: as duas juntas GRITAM,
                       nenhuma das duas GRITA;
       `orientacao`    opcional `[x,y,z]`: a direção do mundo para onde aponta o
                       vértice 0 do anel, projetada no plano da entrada — a
                       MESMA chave e a MESMA regra do `loft` deste ciclo. Serve
                       para alinhar a fase de vários furos entre si (um círculo
                       de prisioneiros com a mesma orientação tem os anéis em
                       fase). Ausente, o quadro determinístico de sempre.

     EIXO: o furo desce pela NORMAL da face de entrada, para dentro do material
     (`-N`). Não há chave de direção oblíqua — furo torto é outra operação, e
     inventá-la aqui seria a generalidade traiçoeira que o item excluiu.

     NUMERAÇÃO (formato salvo, travada por teste). Com `L = lados` e `b` a base
     do passo:
       VÉRTICES  `b+j`      (j=0..L-1) o anel na face de ENTRADA;
                 `b+L+j`    o anel do outro lado (a saída, ou o fundo do cego).
                 Total 2L, sempre — nenhum vértice antigo é criado ou removido,
                 e os cantos ORIGINAIS das faces cortadas continuam de pé (é o
                 que impede fenda com as faces vizinhas).
       FACES     `b+j`      a BORDA de entrada j (contém a aresta j→j+1 do anel);
                 `b+L+j`    a PAREDE j (o cilindro do furo, normal para o eixo);
                 `b+2L+j`   a BORDA de saída j — só PASSANTE;
                 `b+2L`     o FUNDO — só CEGO (uma face só; as faixas `saida`
                            e `fundo` nunca coexistem, por isso partilham a
                            base sem colidir).
     A borda tem SEMPRE L faces, independentemente de quantos cantos a face
     cortada tinha: mudar `raio` ou `centro` muda a FORMA de cada face da borda,
     nunca o id dela.

     HERANÇA: cor, material, parte, liso e solido da face de ENTRADA vão para a
     borda de entrada, para a parede e para o fundo; os da face de SAÍDA vão
     para a borda de saída. É a mesma lei do `espelha`/`arranja`. `tinta`
     (pincel livre) NÃO é herdada: ela é ancorada em coordenada de face, e a
     face mudou de forma — herdar seria carimbar a pincelada em outro lugar.

     COMPLETUDE, a lei do `arranja`: TUDO é conferido antes de reservar um id.
     Face não-plana, face côncava, anel encostando ou saindo do contorno, saída
     que o eixo não atravessa, saída igual à entrada, raio ≤ 0, profundidade
     ≤ 0 — cada um GRITA nomeando a causa e o passo inteiro aborta com 0 V/0 F.
     Nunca sobra meio furo. */
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
    if (!temSaida && !temProfundidade) return grita(st, i, 'furo', 'saida+profundidade', "furo exige saida (a face por onde ele sai, passante) ou profundidade (onde ele para, cego) — exatamente uma");

    // ---- dimensões ----
    const raio = st.num(a.raio ?? 0);
    if (!(raio > 0) || !Number.isFinite(raio)) return grita(st, i, 'furo', 'raio', `raio precisa ser > 0 (recebido ${JSON.stringify(a.raio ?? null)} = ${raio}); raio 0 seria um furo que não abre nada`);
    const L = Math.max(3, st.num(a.lados ?? 8) | 0);   // TOPO: muda a CONTAGEM
    if (a.centro == null) return grita(st, i, 'furo', 'centro', 'furo exige centro:[x,y,z] — o ponto do mundo por onde ele passa, projetado no plano da entrada');
    if (!Array.isArray(a.centro) || a.centro.length !== 3) return grita(st, i, 'furo', 'centro', `centro precisa ser [x,y,z] (3 elementos); recebido ${JSON.stringify(a.centro)}`);
    const centro = st.vec(a.centro);
    if (!centro.every((n) => Number.isFinite(n))) return grita(st, i, 'furo', 'centro', `centro não é um ponto finito: ${JSON.stringify(centro)}`);
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

    // centro PROJETADO no plano da entrada, e o anel em torno dele
    const dCentro = (centro[0] - entrada.centro[0]) * N[0] + (centro[1] - entrada.centro[1]) * N[1] + (centro[2] - entrada.centro[2]) * N[2];
    const c0 = [centro[0] - N[0] * dCentro, centro[1] - N[1] * dCentro, centro[2] - N[2] * dCentro];
    const anelEntrada = [];
    for (let j = 0; j < L; j++) {
      const t = (j / L) * Math.PI * 2;
      const cu = Math.cos(t) * raio, cw = Math.sin(t) * raio;
      anelEntrada.push([c0[0] + entrada.u[0] * cu + entrada.w[0] * cw, c0[1] + entrada.u[1] * cu + entrada.w[1] * cw, c0[2] + entrada.u[2] * cu + entrada.w[2] * cw]);
    }
    // margem: o anel INTEIRO precisa caber estritamente dentro do contorno
    const cUV = entrada.proj(c0);
    const uvRelEntrada = entrada.uv.map((p) => [p[0] - cUV[0], p[1] - cUV[1]]);
    const anelUVEntrada = anelEntrada.map((p) => { const q = entrada.proj(p); return [q[0] - cUV[0], q[1] - cUV[1]]; });
    const folgaEntrada = Math.min(...anelUVEntrada.map((p) => margemDentro(uvRelEntrada, p)));
    if (!(folgaEntrada > 1e-9 * Math.max(1, entrada.escala))) return grita(st, i, 'furo', 'raio', `o anel de raio ${raio} em ${JSON.stringify(centro)} não cabe dentro da face de entrada ${entradaId}: sobra ${folgaEntrada.toFixed(6)} até a borda (precisa ser > 0). Um furo que encosta ou vaza não é furo, é recorte de contorno`);

    // ---- o outro lado: face de SAÍDA (passante) ou plano de FUNDO (cego) ----
    let saidaId = null, saida = null, anelOutro = [];
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
      for (const p of anelEntrada) {
        const t = ((saida.centro[0] - p[0]) * saida.N[0] + (saida.centro[1] - p[1]) * saida.N[1] + (saida.centro[2] - p[2]) * saida.N[2]) / denom;
        if (!(t > 1e-9)) return grita(st, i, 'furo', 'saida', `a face de saída ${saidaId} está ATRÁS da entrada ao longo do eixo (distância ${t.toFixed(6)}) — o furo sairia antes de entrar`);
        anelOutro.push([p[0] + eixo[0] * t, p[1] + eixo[1] * t, p[2] + eixo[2] * t]);
      }
      const cSaida = saida.proj(anelOutro.reduce((acc, p) => [acc[0] + p[0] / L, acc[1] + p[1] / L, acc[2] + p[2] / L], [0, 0, 0]));
      const uvRelSaida = saida.uv.map((p) => [p[0] - cSaida[0], p[1] - cSaida[1]]);
      const anelUVSaida = anelOutro.map((p) => { const q = saida.proj(p); return [q[0] - cSaida[0], q[1] - cSaida[1]]; });
      const folgaSaida = Math.min(...anelUVSaida.map((p) => margemDentro(uvRelSaida, p)));
      if (!(folgaSaida > 1e-9 * Math.max(1, saida.escala))) return grita(st, i, 'furo', 'saida', `o anel não cabe dentro da face de saída ${saidaId}: sobra ${folgaSaida.toFixed(6)} até a borda (precisa ser > 0)`);
      saida.uvRel = uvRelSaida; saida.anelUV = anelUVSaida;
    } else {
      const prof = st.num(a.profundidade);
      if (!(prof > 0) || !Number.isFinite(prof)) return grita(st, i, 'furo', 'profundidade', `profundidade precisa ser > 0 (recebido ${JSON.stringify(a.profundidade)} = ${prof}); um furo cego sem profundidade não abre nada`);
      for (const p of anelEntrada) anelOutro.push([p[0] + eixo[0] * prof, p[1] + eixo[1] * prof, p[2] + eixo[2] * prof]);
    }

    // ---- as bordas anulares, montadas ANTES de reservar id ----
    const bordaE = bordaAnular(uvRelEntrada, anelUVEntrada);
    if (bordaE.erro) return grita(st, i, 'furo', 'de', `entrada: ${bordaE.erro}`);
    /* a borda de SAÍDA percorre o anel ao CONTRÁRIO: ela é vista do outro lado,
       e um anel que é anti-horário na entrada é horário na saída. `ordemSaida[k]`
       é o índice do anel que ocupa a posição k na volta da saída. */
    const ordemSaida = Array.from({ length: L }, (_, k) => (L - k) % L);
    let bordaS = null;
    if (temSaida) {
      bordaS = bordaAnular(saida.uvRel, ordemSaida.map((j) => saida.anelUV[j]));
      if (bordaS.erro) return grita(st, i, 'furo', 'saida', `saída: ${bordaS.erro}`);
    }

    // guarda de overflow (D3), contada antes de inserir
    const nV = 2 * L, nF = temSaida ? 3 * L : 2 * L + 1;
    if (nV > BLOCO || nF > BLOCO) throw new Error(`oficina: furo com ${L} lados estoura o bloco de ids (${BLOCO}): ${nV} vértices / ${nF} faces`);

    // ---- daqui pra baixo nada mais pode falhar: só construção ----
    const E = [], S = [];
    for (let j = 0; j < L; j++) { addV(st, b + j, anelEntrada[j]); E.push(b + j); }
    for (let j = 0; j < L; j++) { addV(st, b + L + j, anelOutro[j]); S.push(b + L + j); }

    const fEntrada = entrada.face, fSaida = saida ? saida.face : null;
    const herda = (id, fonte) => { const nf = st.F.get(id); nf.cor = fonte.cor; nf.material = fonte.material; nf.parte = fonte.parte; nf.liso = fonte.liso; nf.solido = fonte.solido; };

    const bordas = [];
    bordaE.faces.forEach((desc, j) => {
      const vs = [...desc.externos.map((k) => fEntrada.vs[k]), ...desc.anel.map((k) => E[k])];
      addF(st, b + j, vs); bordas.push(b + j); herda(b + j, fEntrada);
    });
    const paredes = [];
    for (let j = 0; j < L; j++) {
      const n = (j + 1) % L;
      addF(st, b + L + j, [E[j], E[n], S[n], S[j]]); paredes.push(b + L + j); herda(b + L + j, fEntrada);
    }
    let saidas = null, fundo = null;
    if (temSaida) {
      saidas = [];
      bordaS.faces.forEach((desc, k) => {
        const vs = [...desc.externos.map((m) => fSaida.vs[m]), ...desc.anel.map((m) => S[ordemSaida[m]])];
        addF(st, b + 2 * L + k, vs); saidas.push(b + 2 * L + k); herda(b + 2 * L + k, fSaida);
      });
    } else {
      fundo = b + 2 * L;
      addF(st, fundo, S.slice()); herda(fundo, fEntrada);
    }

    // as faces cortadas SOMEM da malha e ENTRAM no registro de consumo
    st.F.delete(entradaId);
    st.consumidas.set(entradaId, { passo: i, op: 'furo' });
    if (saidaId != null) { st.F.delete(saidaId); st.consumidas.set(saidaId, { passo: i, op: 'furo' }); }

    registraOrigem(st, i, 'furo', a.origemId, { bordas, paredes, saidas, fundo });
  },

  /* ---- atributos por face ---- */
  pincel(st, a, i) {
    const modo = a.modo ?? 'face';
    if (modo === 'face') {   // passo 9: preenche faces INTEIRAS de uma cor chapada (f.cor).
      for (const fid of resolverAlvosF(st, a, 'pincel', i)) st.F.get(fid).cor = a.cor ?? null;
      return;
    }
    if (modo === 'livre') {
      /* passo 11b — PINCEL MACIO: cada ponto é um DAB (pincelada radial) numa FACE,
         ancorado à posição FACE-LOCAL {a,b} — as coords s,t da projeção do atlas em
         [0,1] (`s=(p[pa]-aMin)/aSpan`), NÃO um texel cru. É isso que faz a tinta
         ACOMPANHAR a face: mover um vértice depois muda a projeção/o UV, mas o dab
         segue no mesmo {a,b} (não desliza pra outro texel). `raio`/`dureza` são do
         pincel (a mesma pincelada) — gravados POR dab pra a face ficar auto-contida e
         o replay ser determinístico. Ordem de `pontos`/dos pushes = ordem de PINTURA
         (o rasterizador compõe mais nova por cima). Ponto com face inexistente GRITA
         (órfão), nunca corrompe (lei do envelope). */
      if (a.sel != null || a.faces != null) return grita(st, i, 'pincel', 'seleção', "modo 'livre' usa pontos:[{f,a,b}], não faces/sel");
      const cor = a.cor ?? null, raio = st.num(a.raio ?? 0), dureza = st.num(a.dureza ?? 0);
      for (const pt of a.pontos ?? []) {
        const f = st.F.get(pt.f);
        if (!f) { grita(st, i, 'pincel', pt.f, 'face inexistente'); continue; }
        f.tinta.push({ a: st.num(pt.a ?? 0), b: st.num(pt.b ?? 0), cor, raio, dureza });
      }
      return;
    }
    return grita(st, i, 'pincel', modo, `modo '${modo}' desconhecido (só 'face' e 'livre')`);
  },
  solido(st, a, i) { for (const fid of resolverAlvosF(st, a, 'solido', i)) st.F.get(fid).solido = true; },
  liso(st, a, i) { for (const fid of resolverAlvosF(st, a, 'liso', i)) st.F.get(fid).liso = true; },

  /* material (passo 12a): seta f.material = NOME de um material DECLARADO em
     MATERIAIS (a peça-nível, como PARAMS/TOPO). Só o NOME entra na face — mudar o
     material muda TODAS as faces dele de uma vez (um dono só, a regra do doc); os
     params (cor/emissivo/aspereza/semLuz/contorno) o adaptarV3 resolve em MATERIAIS
     e o render aplica POR LOTE (padrão do uRim). Grita se `usa` não é um material
     declarado, ou se a face não existe — nunca corrompe (lei do envelope). Face SEM
     material segue idêntica (o lote PADRÃO no-op). `hasOwn` (não `in`) pra um nome
     como 'toString' não passar pela cadeia de protótipos. */
  material(st, a, i) {
    const usa = a.usa;
    if (!Object.hasOwn(st.materiais, usa)) return grita(st, i, 'material', usa, `material '${usa}' não existe em MATERIAIS`);
    for (const fid of resolverAlvosF(st, a, 'material', i)) st.F.get(fid).material = usa;
  },

  /* parte (passo 13a): dá NOME a um conjunto de faces (`f.parte = nome`) — é o ALVO
     que a ANIMAÇÃO (e no futuro o material) usam pra mover/deformar aquele pedaço
     como peça sólida. Registra a parte no neutro (`st.partes[nome] = {pivo}`): `pivo`
     (opcional `[x,y,z]`) é o ponto em torno do qual ela gira/escala — dimensional
     (passa por `st.vec`, então pode citar um PARAM, como os outros pontos); AUSENTE,
     o adaptarV3 usa o CENTROIDE da parte como default. Identidade posicional: face
     inexistente GRITA (órfão), como as outras ops — nunca corrompe (lei do envelope).

     Uma face pertence a NO MÁXIMO uma parte. Até o O-2 (R2 do plano em
     docs/mecanifica/OFICINA-OTIMIZACOES.md) reatribuir era SILENCIOSO
     ("última atribuição vence"), e essa era a pior classe de defeito do
     vocabulário: resultado ERRADO que PASSA. Duas seleções sobrepostas (duas
     caixas de `regiao`, um alias que engloba outro) e a parte declarada antes
     perde faces sem nada reclamar — a bancada mostra a contagem de faces SEM
     nome, nunca as roubadas. Agora reatribuir para OUTRA parte GRITA e a face
     fica com o dono ANTIGO (a op nova é a suspeita, não a lista já escrita),
     salvo `substituir: true` explícito no passo. Renomear para a MESMA parte
     segue mudo: é seleção redundante, não conflito (medido: as 18 peças do
     repositório fazem isso 8 vezes e reatribuem 0 face para outra parte, então
     o diagnóstico é ADITIVO — nenhuma peça shipada muda de hash).

     `neutroCanonico` anexa `f.parte` (replay determinístico); o pivô é metadado
     de animação, não muda a MALHA. */
  parte(st, a, i) {
    const nome = a.nome;
    /* A IDENTIDADE entra primeiro e FECHADA: `nome` é o que o canon anexa, o
       que `sel:{grupo}` cita, o que a régua mede e o que a animação move. Sem
       contrato, `nome: 42`/`true`/`['a']` atravessava tudo e só estourava na
       bancada, e `nome` AUSENTE gravava a chave literal `"undefined"` em
       `st.partes` — nomear virava no-op silencioso. Recusa aqui, com grito, e
       NENHUMA face é tocada (fail-closed): meia atribuição com identidade
       inválida seria pior que nenhuma. */
    const erroNome = nomeDeParteInvalido(nome);
    if (erroNome) {
      grita(st, i, 'parte', 'nome', `nome de parte inválido: ${erroNome} — a identidade da parte é FORMATO SALVO (o canon a anexa, sel:{grupo} a cita, a régua mede por ela)`);
      return;
    }
    /* `substituir` é chave do FORMATO SALVO: só o literal `true` passa, como o
       `tudo:true` do `sel` (D-129). `substituir:'sim'`/`1` aceito em silêncio
       ensinaria a próxima IA a escrever besteira que passa — e ainda por cima
       desligaria justamente a rede que este item instalou. Valor estranho GRITA
       e a op segue ESTRITA (fail-closed). */
    if (a.substituir != null && a.substituir !== true) grita(st, i, 'parte', 'substituir', `substituir inválido: só aceita o literal true (recebido ${JSON.stringify(a.substituir)})`);
    const substituir = a.substituir === true;
    const alvos = resolverAlvosF(st, a, 'parte', i);
    if (!alvos.size) return;
    const pivo = a.pivo != null ? st.vec(a.pivo) : null;   // avaliado ANTES de atribuir: ponto malformado segue estourando alto, como antes
    let atribuiu = false;
    for (const fid of alvos) {
      const f = st.F.get(fid);
      // `temNomeDeParte`, não `!= null`: a guarda e o canon precisam concordar
      // sobre o que é identidade, senão um nome invisível no arquivo salvo
      // bloqueia a nomeação seguinte (a regressão que a revisão da R2 achou).
      if (temNomeDeParte(f.parte) && f.parte !== nome && !substituir) {
        const antes = st.parteAtribuidaEm.get(fid);
        grita(st, i, 'parte', fid, `face já pertence à parte '${f.parte}'${antes != null ? ` (nomeada no passo ${antes})` : ''} e viraria '${nome}': seleções sobrepostas roubam faces em silêncio — separe as seleções ou escreva substituir: true`);
        continue;
      }
      f.parte = nome; st.parteAtribuidaEm.set(fid, i); atribuiu = true;
    }
    if (!atribuiu) return;   // toda a seleção foi recusada: não registra parte fantasma (nome sem nenhuma face)
    st.partes[nome] = { pivo };   // registro nome->{pivo}; pivo null => centroide (no adaptador)
  },

  /* pesar (passo 14a): soma `peso` de influência do OSSO aos VÉRTICES dados (`vs`)
     ou aos vértices das `faces`. Ops `pesar` ACUMULAM por (vértice, osso) — o
     adaptarV3 depois NORMALIZA (somam 1) e mantém as TOP-N (N=4) influências. O
     peso viaja com o ID do vértice (V): toda cópia dele no mesh loose herda o
     mesmo índice+peso. Identidade posicional (lei do envelope): osso fora do
     ESQUELETO GRITA (órfão), vértice/face inexistente GRITA (órfão) — nunca
     corrompe. Vértice SEM peso nenhum fica preso à IDENTIDADE (bind pose, não
     deforma) — o default seguro, resolvido no shader. `neutroCanonico` anexa o
     peso do vértice (replay determinístico); vértice sem peso => canon intacta. */
  pesar(st, a, i) {
    const osso = a.osso;
    if (!st.ossoSet || !st.ossoSet.has(osso)) return grita(st, i, 'pesar', osso, st.ossoSet ? `osso '${osso}' não existe em ESQUELETO` : 'peça sem ESQUELETO (nenhum osso pra pesar)');
    const peso = st.num(a.peso ?? 0);
    const alvos = new Set();
    for (const v of a.vs ?? []) { if (!st.V.has(v)) { grita(st, i, 'pesar', v, 'vértice inexistente'); continue; } alvos.add(v); }
    for (const fid of a.faces ?? []) { const f = st.F.get(fid); if (!f) { grita(st, i, 'pesar', fid, 'face inexistente'); continue; } for (const v of f.vs) if (st.V.has(v)) alvos.add(v); }
    for (const v of alvos) { let m = st.pesos.get(v); if (!m) { m = new Map(); st.pesos.set(v, m); } m.set(osso, (m.get(osso) || 0) + peso); }   // ACUMULA por (vértice, osso)
  },
};

/* A-20 — uma porta publicada precisa existir FORA do núcleo. Até esta rodada
   `st.portas` só vivia enquanto a lista de passos rodava: nem a régua, nem a
   bancada, nem o adaptador sabiam que a peça publicou `peDoCaule`, e provar que
   `sel:{porta}` sobrevive a uma transformação exigia marcar cada porta com um
   material próprio e ler a marca de volta — prova indireta, sobre `f.material`.
   O núcleo passa a DEVOLVER as portas.

   Forma: Map nome -> {nome, de, passo}, ORDENADO por nome (comparação de
   código de ponto, não `localeCompare`, que depende de locale — determinismo
   antes de estética). `de` sai CLONADO, para que quem lê não consiga mexer nos
   argumentos do passo por referência. Só o que foi DECLARADO: nome, origem e
   passo de publicação. As faces resolvidas não entram — elas dependem do
   momento da citação, e congelar o fim da lista faria a porta mentir sobre
   passos anteriores.

   Isto NÃO entra em `neutroCanonico`: a porta é contrato de autoria, não
   geometria, e mexer no canônico mudaria o hash de peça já shipada. */
function portasDoNucleo(portas) {
  const nomes = [...portas.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return new Map(nomes.map((nome) => {
    const porta = portas.get(nome);
    return [nome, { nome, de: JSON.parse(JSON.stringify(porta.de)), passo: porta.passo }];
  }));
}

/* ----------------------------------------------------------------------------
   NÚCLEO: roda a lista e devolve o NEUTRO em números. Não sabe desenhar.
   `dict` funde PARAMS e TOPO — os passos citam o NOME (raio: 'troncoR'), então
   trocar o valor reconstrói sem tocar em número nenhum da lista.
---------------------------------------------------------------------------- */
export function nucleo(PASSOS, PARAMS = {}, TOPO = {}, MATERIAIS = {}, ESQUELETO = null, ALIASES = []) {
  const dict = { ...PARAMS, ...TOPO };
  const { num } = criarResolverNumerico(dict);
  /* ponto 3D SEMPRE: sem a guarda de aridade, `[0,1]` passava e o z virava
     `undefined` -> NaN calado; não-array estourava `a.map is not a function`
     (throw cru, sem diagnóstico). Rede CENTRAL — a op ainda valida por conta
     pra GRITAR dizendo QUAL seção/ponto errou (a lei do lathe, D-115). */
  const vec = (a) => {
    if (!Array.isArray(a) || a.length !== 3) throw new Error(`oficina: ponto precisa ser [x,y,z] (3 elementos); recebido ${JSON.stringify(a)}`);
    return a.map(num);
  };
  /* materiais: o dicionário POR NOME (a peça declara em MATERIAIS) que a op
     `material` valida contra e o adaptarV3 lê pra montar os params por lote. Como
     PARAMS/TOPO, é dado da peça — o padrão {} deixa toda peça sem material intacta. */
  /* partes (13a): registro nome->{pivo} que a op `parte` preenche e o adaptarV3
     lê pra resolver o pivô (explícito) ou cair no centroide da parte. */
  /* ESQUELETO (14a): resolvido+validado ANTES dos passos (o `pesar` valida `osso`
     contra `ossoSet`). Ausente (o caso de 1..13 e do jogo) => esqueleto null,
     pesos vazio -> canon e mesh byte-idênticos ao de antes (compat inegociável). */
  const esqueleto = ESQUELETO ? resolverEsqueleto(ESQUELETO, vec) : null;
  const ossoSet = esqueleto ? new Set(esqueleto.ossos.map((o) => o.nome)) : null;
  const aliases = new Map();
  /* Fase 2: ALIASES entra antes dos PASSOS para que uma definição malformada
     nunca deixe a peça executar parcialmente. Cada termo usa o contrato local
     do gerador, sem IDs globais escondidos. */
  if (!Array.isArray(ALIASES)) throw new Error('oficina: ALIASES precisa ser uma lista');
  for (const ent of ALIASES) {
    if (!Array.isArray(ent) || ent.length !== 2 || typeof ent[0] !== 'string' || !ent[0]) throw new Error('oficina: alias inválido');
    if (aliases.has(ent[0])) throw new Error(`oficina: alias duplicado '${ent[0]}'`);
    const direto = (x) => x && typeof x === 'object' && !Array.isArray(x) && Object.keys(x).length === 1 && !validarOrigem(x.origem).erro;
    const composto = ent[1] && typeof ent[1] === 'object' && !Array.isArray(ent[1]) && Object.keys(ent[1]).length === 1 && Array.isArray(ent[1].unir) && ent[1].unir.length && ent[1].unir.every(direto);
    if (!direto(ent[1]) && !composto) throw new Error(`oficina: alias '${ent[0]}' inválido: só origem ou unir de origens`);
    aliases.set(ent[0], ent[1]);
  }
  const declaracoesOrigem = mapearDeclaracoesOrigem(PASSOS);
  const orfaosIniciais = [];
  for (const [origemId, declaracoes] of declaracoesOrigem) if (declaracoes.length > 1) {
    const motivo = textoDeclaracoes(origemId, declaracoes);
    for (const declaracao of declaracoes.slice(1)) orfaosIniciais.push({ passo: declaracao.passo, op: declaracao.op, ref: origemId, motivo });
  }
  /* parteAtribuidaEm: face -> índice do passo que a nomeou. É PROCEDÊNCIA de
     diagnóstico (não sai no neutro, não vira formato salvo): serve pro `parte`
     dizer QUEM nomeou a face antes, quando uma segunda seleção tenta roubá-la. */
  const st = { V: new Map(), F: new Map(), orfaos: orfaosIniciais, merges: [], partes: {}, origens: new Map(), portas: new Map(), declaracoesOrigem, aliases, dict, num, vec, materiais: MATERIAIS, esqueleto, ossoSet, pesos: new Map(), parteAtribuidaEm: new Map(), consumidas: new Map() };

  PASSOS.forEach((passo, i) => {
    const [op, args = {}] = passo;
    const fn = OPS[op];
    if (!fn) { grita(st, i, op, null, `operação desconhecida '${op}'`); return; }
    fn(st, args, i);
  });

  return { V: st.V, F: st.F, orfaos: st.orfaos, merges: st.merges, partes: st.partes, esqueleto: st.esqueleto, pesos: st.pesos, portas: portasDoNucleo(st.portas) };
}

/* forma canônica e ORDENADA do neutro — a base de toda comparação (replay da
   bancada, testes de determinismo). Ids crescentes; posições e atributos
   explícitos. JSON dela ida-e-volta é idêntico bit-a-bit quando o objeto é o
   mesmo. */
export function neutroCanonico(neutro) {
  const pesos = neutro.pesos;   // 14a: Map(vid -> Map(osso -> peso ACUMULADO)); ausente/vazio => nada muda
  return {
    /* V ganha uma CAUDA opcional (o peso do vértice) só quando ele TEM peso — o
       mesmo padrão do tinta/parte na F. Vértice sem peso => linha [id,x,y,z] de 4,
       BYTE-idêntica ao de antes (peças/testes de 1..13 e o toco não mudam de canon).
       O peso viaja na canon como pares [osso,peso] ORDENADOS por nome do osso
       (determinístico e independente da ordem do ESQUELETO); é o peso CRU acumulado
       (o efeito do replay das ops `pesar`), não o normalizado (isso é do adaptador). */
    V: [...neutro.V.entries()].sort((a, b) => a[0] - b[0]).map(([id, p]) => {
      const row = [id, p[0], p[1], p[2]];
      const pw = pesos && pesos.get(id);
      if (pw && pw.size) row.push([...pw.entries()].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)));
      return row;
    }),
    F: [...neutro.F.values()].sort((a, b) => a.id - b.id).map((f) => {
      const row = [f.id, f.vs.slice(), f.cor ?? null, f.material ?? null, !!f.liso, !!f.solido];
      /* tinta (pincel macio, 11b): só entra quando a face TEM dab. Assim toda peça
         sem pincel livre (o passo 1..11a inteiro, incl. o toco) canoniza BYTE-idêntico
         ao de antes — a compat pra trás é inegociável. Forma fixa [a,b,cor,raio,dureza]
         por dab, na ordem de pintura, pra o JSON ir-e-voltar igual (determinismo). */
      if (f.tinta && f.tinta.length) row.push(f.tinta.map((t) => [t.a, t.b, t.cor ?? null, t.raio, t.dureza]));
      /* parte (13a): mesmo padrão do tinta — só anexa quando a face TEM parte. Face
         SEM parte => linha byte-idêntica ao de antes (peças/testes de 1..12b não mudam
         de canon). Vem DEPOIS do tinta (o outro opcional-de-cauda): tinta é array, parte
         é string — tipos disjuntos, sem ambiguidade. É f.parte (o nome) que entra na
         canon do replay; o pivô é metadado de animação, não muda a MALHA.
         `temNomeDeParte` é a MESMA pergunta que a guarda da op `parte` faz — o
         canon e a trava não podem discordar sobre o que conta como identidade. */
      if (temNomeDeParte(f.parte)) row.push(f.parte);
      return row;
    }),
    orfaos: neutro.orfaos.map((o) => ({ passo: o.passo, op: o.op, ref: o.ref ?? null, motivo: o.motivo })),
    merges: neutro.merges.map((m) => ({ de: m.de.slice(), para: m.para })),
  };
}

/* ----------------------------------------------------------------------------
   ADAPTADOR v3: neutro -> formato do motor. É a ÚNICA peça que muda de mundo
   pra mundo (outro motor = outro adaptador). Monta os triângulos soltos (pos3
   uv2 nrm3), e a cor por face chega via TEXTURA + UV — o formato de vértice
   ainda não tem cor (reservada no passo 0), então NÃO se inventa atributo de
   cor no vértice. Chapado por padrão (normal por face); face `liso` usa a média
   das normais das faces lisas vizinhas.

   PASSO 11a — a FUNDAÇÃO da textura pintável: o antigo SWATCH (uma fita de cores
   distintas, faces da mesma cor compartilhando UM texel) vira um ATLAS POR FACE.
   Cada face ganha uma ILHA própria num quadriculado ~quadrado (N faces ->
   cols=ceil(√N)); o UV de cada canto sai por PROJEÇÃO EM CAIXA *daquela* face (o
   eixo dominante da normal manda; projeta as OUTRAS duas coordenadas de mundo —
   a "caixa" do doc, docs/oficina.md "Pintura: projeção em caixa desde o começo")
   normalizada pela bbox 2D da face e mapeada pro retângulo interno da ilha. Como
   nenhuma cor é compartilhada, o furo da projeção em caixa GLOBAL some: topo (+y)
   e fundo (-y) de um cilindro — que na caixa global empilhariam no MESMO pedaço
   da textura (ambos projetam em XZ) — caem em ilhas DISTINTAS. Pintar um não
   pinta o outro: é a base sem-sobreposição que o pincel macio (passo 11b) exige.
   Em 11a o conteúdo é cor CHAPADA: a ilha inteira é a cor da face, então a face
   renderiza IGUAL ao swatch de hoje (mesmo pixel na tela; provado por medição).
   O mapa por face (retângulo da ilha + a projeção) sai ANEXADO em `atlas` pro
   11b converter superfície (face + ponto de mundo) -> texel e pintar. */
const COR_PADRAO = '#9a8f80';   // madeira neutra pra face sem pincel
function hexRGB(h) {
  const s = String(h).replace('#', '');
  const n = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  return [parseInt(n.slice(0, 2), 16) || 0, parseInt(n.slice(2, 4), 16) || 0, parseInt(n.slice(4, 6), 16) || 0];
}

/* atlas: tamanho da ILHA (bloco de texels por face) e do GUTTER (borda de folga
   entre ilhas). O motor amostra em NEAREST — não há sangramento por
   interpolação —, então o gutter é MARGEM: mantém todo UV a >= GUTTER texels da
   borda da célula (nenhum canto encosta na vizinha) e sobra a moldura pro pincel
   do 11b dilatar a cor pra fora sem vazar. Ilha chapada em 11a => a moldura é a
   própria cor da face. */
const ATLAS_TILE = 32, ATLAS_GUTTER = 2;

/* eixo dominante da normal (0=x, 1=y, 2=z: o maior |componente|) e os DOIS eixos
   de projeção — os outros dois, em ordem crescente. É a "caixa" do doc, privada
   por face: normal pra cima (y) projeta em (x,z); pro lado (x) em (y,z); pra
   frente (z) em (x,y). */
function eixoDominante(n) {
  const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
  if (ax >= ay && ax >= az) return 0;
  if (ay >= az) return 1;
  return 2;
}
const OUTROS_EIXOS = [[1, 2], [0, 2], [0, 1]];   // eixos de projeção por eixo dominante

export function adaptarV3(neutro, ctx, MATERIAIS = {}) {
  const { V, F } = neutro;
  const faces = [...F.values()].sort((a, b) => a.id - b.id);

  /* normais: por face (chapado) e, pra `liso`, média por vértice das faces
     lisas que o tocam. (Intocado do swatch — o 11a só troca a textura+UV.) */
  const nFace = new Map();
  for (const f of faces) nFace.set(f.id, normalDaFace(V, f.vs));
  const acc = new Map();
  for (const f of faces) if (f.liso) { const n = nFace.get(f.id); for (const v of f.vs) { const s = acc.get(v) || [0, 0, 0]; acc.set(v, [s[0] + n[0], s[1] + n[1], s[2] + n[2]]); } }
  const nSuave = new Map();
  for (const [v, s] of acc) nSuave.set(v, norm3(s[0], s[1], s[2]));

  /* GRADE de ilhas: uma por face (ordem por id), quadriculado ~quadrado. Cada
     ilha ocupa um bloco TILE×TILE; o UV endereça só o retângulo INTERNO (inset
     de GUTTER em todo lado), então nenhum canto toca a borda da célula. */
  const N = faces.length || 1;
  const cols = Math.max(1, Math.ceil(Math.sqrt(N)));
  const rows = Math.max(1, Math.ceil(N / cols));
  const W = cols * ATLAS_TILE, H = rows * ATLAS_TILE;

  /* PROJEÇÃO POR FACE, pré-calculada por ilha: eixo dominante, bbox 2D dos cantos
     no plano dos outros dois eixos, e o retângulo interno da ilha (em UV 0..1 do
     atlas). `projeta(pontoMundo) -> [u,v]` é a FONTE ÚNICA do UV: o mesh e o mapa
     do 11b saem dela, então nunca divergem. bbox degenerada (área ~0 num eixo —
     face de fio, ou canto pendurado) cai no CENTRO daquele eixo: sem divisão por
     zero, e com a ilha chapada a cor sai a mesma. */
  const EPS = 1e-9;
  const atlasFace = new Map();
  faces.forEach((f, i) => {
    const col = i % cols, row = (i / cols) | 0;
    const ix = col * ATLAS_TILE + ATLAS_GUTTER, iy = row * ATLAS_TILE + ATLAS_GUTTER;   // canto do retângulo interno (texels)
    const iw = ATLAS_TILE - 2 * ATLAS_GUTTER, ih = ATLAS_TILE - 2 * ATLAS_GUTTER;
    const u0 = ix / W, v0 = iy / H, u1 = (ix + iw) / W, v1 = (iy + ih) / H;             // o mesmo em UV 0..1 do atlas
    const dom = eixoDominante(nFace.get(f.id));
    const [pa, pb] = OUTROS_EIXOS[dom];
    let aMin = Infinity, aMax = -Infinity, bMin = Infinity, bMax = -Infinity;
    for (const v of f.vs) { const p = V.get(v); if (!p) continue; if (p[pa] < aMin) aMin = p[pa]; if (p[pa] > aMax) aMax = p[pa]; if (p[pb] < bMin) bMin = p[pb]; if (p[pb] > bMax) bMax = p[pb]; }
    const aSpan = aMax - aMin, bSpan = bMax - bMin;   // bbox 2D da face no plano dominante
    const projeta = (p) => {
      const s = aSpan > EPS ? (p[pa] - aMin) / aSpan : 0.5;   // 0..1 na bbox (degenerada -> centro)
      const t = bSpan > EPS ? (p[pb] - bMin) / bSpan : 0.5;
      return [u0 + s * (u1 - u0), v0 + t * (v1 - v0)];        // -> retângulo interno da ilha (UV do atlas)
    };
    atlasFace.set(f.id, { ilha: { x: ix, y: iy, w: iw, h: ih }, dom, projeta });
  });

  /* TEXTURA do atlas: base = cor CHAPADA da célula (`f.cor ?? COR_PADRAO`, o 11a),
     célula INTEIRA (miolo + gutter) preenchida; POR CIMA, os DABS do pincel macio
     daquela face. Célula sem face (sobra da última linha) fica na madeira neutra. */
  const corIlha = faces.map((f) => hexRGB(f.cor ?? COR_PADRAO));
  const corVazia = hexRGB(COR_PADRAO);

  /* PINCEL MACIO (11b): pré-computa por ilha (índice = ordem da face) os dabs que a
     face vai rasterizar — o {a,b} FACE-LOCAL vira centro em TEXELS dentro do retângulo
     interno (a MESMA conta que o UV do mesh: texel = ix + a·iw), o `raio` face-local
     vira raio em TEXELS (× a largura da ilha; a ilha é quadrada, iw==ih), e a `dureza`
     vira a fração do raio 100% opaca (o "núcleo duro"). Ordem preservada = ordem de
     pintura. raio 0/inválido -> dab no-op (defensivo, não corrompe). */
  const dabsIlha = faces.map((f) => {
    const il = atlasFace.get(f.id).ilha;
    return (f.tinta || []).map((t) => ({
      cx: il.x + t.a * il.w, cy: il.y + t.b * il.h,        // {a,b}∈[0,1] -> centro no retângulo interno da ilha
      rT: t.raio * il.w,                                    // raio face-local -> texels (ilha quadrada)
      nucleo: Math.min(1, Math.max(0, t.dureza)),           // dureza = fração do raio de opacidade cheia
      rgb: hexRGB(t.cor ?? COR_PADRAO),
    })).filter((d) => d.rT > 0);
  });

  const tex = ctx.tex.texCanvas(W, H, (x, y) => {
    const col = (x / ATLAS_TILE) | 0, row = (y / ATLAS_TILE) | 0, i = row * cols + col;
    if (i >= corIlha.length) return corVazia;               // célula sem face
    const dabs = dabsIlha[i];
    if (!dabs.length) return corIlha[i];                    // face chapada -> IDÊNTICO ao 11a (compat byte-a-byte)
    /* compõe os dabs SÓ desta face (o texel é de UMA célula): o dab fica PRESO na
       célula, nunca vaza pra ilha vizinha — o gutter é a folga pra ele dilatar sem
       clipar. Falloff: q=dist/raio em [0..1]; dentro do núcleo (q<=dureza) opacidade
       cheia, e do núcleo à borda um ombro macio (smoothstep) até 0. Dureza alta =
       núcleo grande + borda curta; baixa = degradê largo. Alpha OVER, mais nova por cima. */
    let r = corIlha[i][0], g = corIlha[i][1], b = corIlha[i][2];
    for (const d of dabs) {
      const q = Math.hypot(x + 0.5 - d.cx, y + 0.5 - d.cy) / d.rT;
      if (q >= 1) continue;                                 // fora do dab
      let a;
      if (q <= d.nucleo) a = 1;                             // núcleo duro
      else { const tt = (1 - q) / (1 - d.nucleo); a = tt * tt * (3 - 2 * tt); }   // ombro macio até 0 na borda
      r += (d.rgb[0] - r) * a; g += (d.rgb[1] - g) * a; b += (d.rgb[2] - b) * a;
    }
    return [Math.round(r), Math.round(g), Math.round(b)];
  });

  /* PASSO 12a — LOTES POR MATERIAL. Triângulos soltos (leque por face; UV da PRÓPRIA
     ilha, normal chapada ou suave em `liso`) AGRUPADOS por f.material: faces do MESMO
     material (o nome que a op `material` pôs) caem num só lote; faces SEM material vão
     pro lote PADRÃO (params no-op). Todos DIVIDEM a MESMA textura-atlas — cada lote é
     só o subconjunto de triângulos do seu grupo. Peça sem NENHUM material => um único
     grupo (null), na ORDEM de id => mesh BYTE-idêntico ao 11a (compat inegociável). */
  /* PASSO 13a — agrupa pela DUPLA (parte, material). Cada parte nomeada vira lote(s)
     próprio(s) (pra ganhar MATRIZ própria na animação); cada material segue com seus
     params. A chave junta os dois com um separador (\u0000) que nenhum nome contém.
     COMPAT INEGOCIÁVEL: face SEM parte E SEM material => chave '\u0000' pra TODAS =>
     UM só grupo, na ordem de id => mesh BYTE-idêntico ao 12b/11a (a ordem por id se
     mantém — `faces` já vem ordenado). O grupo carrega `parte` (nome|null) pro lote. */
  /* PASSO 14a — ESQUELETO (ADITIVO). SEM esqueleto (todo o jogo + peças de 1..13):
     `skin` é false, o mesh sai em 8 floats/vértice pela MESMA linha de push de antes
     -> BYTE-idêntico (a compat inegociável). COM esqueleto: o mesh ganha 8 floats a
     mais por vértice (índice+peso de OSSO, 4 influências cada) -> 16 floats, e todo
     lote é marcado `esqueleto` pro render usar o caminho skinado SEPARADO. O peso
     viaja com o ID do vértice: `infoV(v)` dá as MESMAS 4 influências pra toda cópia
     dele no mesh loose. boneIndex = posição do osso no ESQUELETO (a MESMA ordem que
     o animador usa). Vértice sem peso -> tudo 0 (o shader cai na identidade = bind
     pose, não deforma — o default seguro). */
  const skin = !!neutro.esqueleto;
  const nOssos = skin ? neutro.esqueleto.ossos.length : 0;
  let infoV = () => null;
  if (skin) {
    const ordemOsso = new Map(neutro.esqueleto.ossos.map((o, k) => [o.nome, k]));
    const infoOssoPorV = new Map();
    for (const [vid, m] of (neutro.pesos || new Map())) {
      const arr = [...m.entries()].filter(([, w]) => w > 0)
        .sort((a, b) => (b[1] - a[1]) || (ordemOsso.get(a[0]) - ordemOsso.get(b[0])));   // maior peso 1º; empate -> ordem do osso (determinístico)
      const top = arr.slice(0, N_INFLU);
      let soma = 0; for (const [, w] of top) soma += w;
      const idx = [0, 0, 0, 0], w = [0, 0, 0, 0];
      if (soma > 0) top.forEach(([osso, wt], k) => { idx[k] = ordemOsso.get(osso); w[k] = wt / soma; });   // TOP-N + NORMALIZA (somam 1)
      infoOssoPorV.set(vid, { idx, w });
    }
    const ZERO = { idx: [0, 0, 0, 0], w: [0, 0, 0, 0] };
    infoV = (v) => infoOssoPorV.get(v) || ZERO;
  }

  const grupos = new Map();   // chave `${parte}\u0000${material}` -> { parte, mat, mesh:{v} }
  for (const f of faces) {
    if (f.vs.some((v) => !V.has(v))) continue;   // defensivo: nunca desenha canto pendurado
    const ch = `${f.parte || ''}\u0000${f.material || ''}`;
    let g = grupos.get(ch);
    if (!g) { g = { parte: f.parte || null, mat: f.material || null, mesh: { v: [] } }; grupos.set(ch, g); }
    const projeta = atlasFace.get(f.id).projeta;
    const nf = nFace.get(f.id);
    const c0 = f.vs[0];
    for (let k = 1; k < f.vs.length - 1; k++) {   // leque a partir do primeiro canto
      for (const v of [c0, f.vs[k], f.vs[k + 1]]) {
        const p = V.get(v);
        const uv = projeta(p);
        const n = f.liso && nSuave.has(v) ? nSuave.get(v) : nf;
        g.mesh.v.push(p[0], p[1], p[2], uv[0], uv[1], n[0], n[1], n[2]);   // 8 floats — INTOCADO (byte-idêntico sem esqueleto)
        if (skin) { const iw = infoV(v); g.mesh.v.push(iw.idx[0], iw.idx[1], iw.idx[2], iw.idx[3], iw.w[0], iw.w[1], iw.w[2], iw.w[3]); }   // +8 floats de OSSO (índice×4, peso×4)
      }
    }
  }

  /* cada grupo -> um lote com a mesh do subconjunto + os PARAMS do material (ausentes
     no grupo padrão -> render no-op). `cor` do material MULTIPLICA a textura (corMul em
     0..1 -> uCorMul); `contorno` é o uRim POR MATERIAL; emissivo/aspereza/semLuz seguem
     o padrão do uRim no render.js (default = efeito nenhum). Os nomes CASAM os uniforms.
     PASSO 12b — MISTURA: `mistura:'transparente'` marca o lote (`transparente:true` +
     `opacidade` 0..1, default 1) pra o render desenhar numa PASSADA EXTRA (blend alpha,
     ordenada de trás pra frente). `opaco`/`recorte`/ausente = opaco como hoje: o lote NÃO
     ganha esses campos, então o render o mantém no passe de cena — byte-idêntico. */
  const lotes = [];
  for (const g of grupos.values()) {
    const L = { mesh: g.mesh, parte: g.parte || null };   // 13a: o NOME da parte do lote (null = sem parte). O render IGNORA (não lê .parte); a animação casa POR ÍNDICE via infoPorLote.
    const m = g.mat ? (MATERIAIS[g.mat] || {}) : null;
    if (m) {
      if (m.cor) L.corMul = hexRGB(m.cor).map((c) => c / 255);
      if (m.emissivo) L.emissivo = +m.emissivo;
      if (m.aspereza) L.aspereza = +m.aspereza;
      if (m.semLuz) L.semLuz = 1;
      if (m.contorno) L.rim = +m.contorno;
      if (m.mistura === 'transparente') { L.transparente = true; L.opacidade = m.opacidade == null ? 1 : Math.min(1, Math.max(0, +m.opacidade)); }   // 12b: só 'transparente' pede a passada extra
    }
    if (skin) { L.esqueleto = true; L.nOssos = nOssos; }   // 14a: lote skinado (mesh 16 floats) -> render usa o caminho skinado SEPARADO
    lotes.push(L);
  }

  /* PASSO 13a — PARTES resolvidas (nome -> {pivo}) pra a animação. O pivô é o EXPLÍCITO
     (`neutro.partes[nome].pivo`, do arquivo) OU, ausente, o CENTROIDE da parte: a média
     das posições dos vértices DISTINTOS de todas as faces dela, no espaço LOCAL do modelo
     (o mesmo espaço do mesh, antes do uModel). É metadado de animação — NÃO entra no mesh
     nem na canon; peça sem parte devolve {} (compat: nenhum consumidor de hoje lê isto). */
  const registro = neutro.partes || {};
  const vertsParte = new Map();   // nome -> Set(ids distintos)
  // `temNomeDeParte`: a mesma pergunta da guarda e do canon (uma definição só).
  for (const f of faces) if (temNomeDeParte(f.parte)) { let s = vertsParte.get(f.parte); if (!s) { s = new Set(); vertsParte.set(f.parte, s); } for (const v of f.vs) s.add(v); }
  const partes = {};
  for (const nome of new Set([...Object.keys(registro), ...vertsParte.keys()])) {
    let pivo = registro[nome] && registro[nome].pivo;   // explícito (já passado por vec no núcleo)
    if (!pivo) {   // default: centroide da parte
      let cx = 0, cy = 0, cz = 0, n = 0;
      for (const v of (vertsParte.get(nome) || [])) { const p = V.get(v); if (!p) continue; cx += p[0]; cy += p[1]; cz += p[2]; n++; }
      pivo = n ? [cx / n, cy / n, cz / n] : [0, 0, 0];
    }
    partes[nome] = { pivo };
  }

  /* atlas: o mapa por face pro passo 11b (superfície -> texel). `daFace(id)` dá a
     ILHA (retângulo interno em texels: {x,y,w,h}, a região pintável) e
     `projeta(pontoMundo) -> [u,v]` no atlas 0..1 (o MESMO UV do mesh). O 11b
     converte pra texel por (round(u*W), round(v*H)) e prende dentro da ilha (a
     pincelada nunca escapa pra vizinha). Anexado ao retorno; `executar`/a peça
     consomem {mesh,tex} e ignoram este campo. */
  const atlas = { W, H, cols, rows, tile: ATLAS_TILE, gutter: ATLAS_GUTTER, daFace: (id) => atlasFace.get(id) };
  return { lotes, tex, atlas, partes, esqueleto: neutro.esqueleto || null };   // 14a: o esqueleto resolvido (ou null) segue pro executar/montarAnimar
}

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

/* ----------------------------------------------------------------------------
   API pública que a PEÇA usa.
---------------------------------------------------------------------------- */
/* executar: roda a lista e devolve o objeto pronto pro visor
   ({lotes:[{mesh:{v}, tex, matriz, ...params-de-material}], animar?, camera}). É núcleo
   + adaptador. MATERIAIS (12a) e ANIMACOES (13a) são dados da peça, como PARAMS/TOPO —
   vêm por ÚLTIMO e opcionais: {} deixa toda peça sem material com UM lote só (byte-idêntico
   ao 11a) e ANIMACOES vazio -> `animar` undefined -> o render vê `peca.animar||null`=null
   -> byte-idêntico (nenhuma peça de hoje anima). Cada lote ganha a SUA identidade (não uma
   compartilhada) pra a animação sobrescrever o lote certo sem alias; `animar` casa
   parte<->lote por ÍNDICE via `infoPorLote`, PARALELO aos lotes que o render vai mapear. */
export function executar(PASSOS, PARAMS, TOPO, ctx, MATERIAIS = {}, ANIMACOES = {}, ESQUELETO = null, ALIASES = []) {
  const neutro = nucleo(PASSOS, PARAMS, TOPO, MATERIAIS, ESQUELETO, ALIASES);
  if (!ctx || !ctx.tex || !ctx.tex.texCanvas) throw new Error('oficina.executar precisa de ctx {tex,...} do motor v3');
  if (neutro.orfaos.length && typeof console !== 'undefined') console.warn(`oficina: ${neutro.orfaos.length} órfão(s) —`, neutro.orfaos);
  const { lotes, tex, atlas, partes, esqueleto } = adaptarV3(neutro, ctx, MATERIAIS);
  const infoPorLote = lotes.map((L) => L.parte || null);   // PARALELO aos lotes (mesma ordem que o render mapeia)
  const animar = montarAnimar(ANIMACOES, infoPorLote, partes, esqueleto);   // 14a: esqueleto resolvido -> trilhas de OSSO viram L.ossos
  const ident = () => (ctx.m4 ? ctx.m4.ident() : undefined);
  /* 14a: lote skinado nasce na BIND POSE (L.ossos = N identidades) — o render sobe isso
     e a peça renderiza em repouso mesmo SEM `animar`. Com `animar`, ele sobrescreve por
     quadro. Lote sem esqueleto não ganha L.ossos (o render nem olha). */
  /* `atlas` (tamanho de célula/gutter do atlas por face, D-90) sai ANEXADO ao retorno —
     campo NOVO, ninguém que já lia {lotes,animar,camera} quebra. É pra ferramenta de
     auditoria (detector-de-banding) saber o tamanho de CÉLULA sem duplicar o número
     mágico ATLAS_TILE num segundo lugar; a peça/render seguem ignorando o campo. */
  return { lotes: lotes.map((L) => ({ ...L, tex, matriz: ident(), ...(L.esqueleto ? { ossos: bindPoseOssos(L.nOssos) } : {}) })), animar, camera: { e: 1.05, r: 2.9 }, atlas };
}

/* colisaoDe: SÓ a geometria (sem adaptador/textura/pincel) -> descritor de
   colisão encaixado na malha FINAL (depois das extrusões). Roda no CARREGAMENTO
   do módulo, então é barato e tem um dono só (nada de número medido e guardado).
   Encaixa nas faces `solido` se houver; senão, na malha toda. */
export function colisaoDe(PASSOS, PARAMS, TOPO, MATERIAIS = {}, ALIASES = []) {
  const { V, F } = nucleo(PASSOS, PARAMS, TOPO, MATERIAIS, null, ALIASES);
  let ids = new Set();
  for (const f of F.values()) if (f.solido) for (const v of f.vs) ids.add(v);
  if (!ids.size) ids = new Set(V.keys());
  let raio = 0, minY = Infinity, maxY = -Infinity;
  for (const v of ids) { const p = V.get(v); if (!p) continue; raio = Math.max(raio, Math.hypot(p[0], p[2])); if (p[1] < minY) minY = p[1]; if (p[1] > maxY) maxY = p[1]; }
  if (!Number.isFinite(minY)) { minY = 0; maxY = 0; }
  return { forma: 'cilindro', raio, altura: maxY - minY, base: minY };
}
