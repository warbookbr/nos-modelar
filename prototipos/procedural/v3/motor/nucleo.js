/* nucleo.js — implementação única da OFICINA procedural (passo 1). Executa a lista de
   PASSOS de uma peça-objeto e devolve o objeto pronto pro visor. Duas camadas
   nítidas (docs/oficina.md "Onde o código mora"): o NÚCLEO neutro monta
   vértices únicos numerados + faces apontando pra ids + atributos por face, e
   devolve NÚMEROS; o ADAPTADOR v3 converte esse neutro nos triângulos soltos do
   motor (8 floats/vértice, cor por face via textura-amostra + UV). SEM
   interface. Determinístico: mesma lista -> mesmo objeto, sempre. A numeração
   de identidade depende só da POSIÇÃO do passo (bloco de BLOCO ids por índice).
   Com `lados` numérico, mudar `raio` não renumera; mudar `lados` (TOPO)
   renumera e os passos pendurados viram órfãos que GRITAM, nunca corrompem.
   O modo explícito `lados:{desvio}` põe o raio na derivação da contagem: nele,
   mudar raio PODE renumerar, por contrato, para conservar a tolerância. */
import { criarResolverNumerico } from './expressoes.js';
import { TIPO_MALHA_POLIGONAL, artefatoDaMalha, criarEstadoDeProcedencia, procedenciaCanonica, registrarProcedencia } from './artefatos.js';
import { criarRegistroOperacoes } from './registro.js';
import { criarOperacoesPrimitivasBasicas } from './operacoes/primitivas-basicas.js';
import { criarOperacoesPrimitivasSuperficie } from './operacoes/primitivas-superficie.js';
import { criarOperacoesEdicaoDireta } from './operacoes/edicao-direta.js';
import { criarOperacoesGeradoresAvancados } from './operacoes/geradores-avancados.js';
import { criarOperacoesTransformacoes } from './operacoes/transformacoes.js';
import { criarOperacoesEstruturais } from './operacoes/estruturais.js';
import { criarOperacoesAtributos } from './operacoes/atributos.js';
import earcut from 'earcut';

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
export function norm3(x, y, z) { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; }

/* Flecha máxima entre um arco circular e cada corda de uma discretização
   uniforme. A forma `2R·sen²(phi/4n)` é a mesma lei de
   `R·(1-cos(phi/2n))`, mas não perde o desvio por cancelamento quando n cresce.
   `phi` é o arco total; no anel completo vale 2π. */
export function flechaDoArco(raio, phi, segmentos) {
  if (!(raio > 0) || !Number.isFinite(raio)) throw new RangeError('raio precisa ser finito e > 0');
  if (!(phi > 0) || !Number.isFinite(phi)) throw new RangeError('phi precisa ser finito e > 0');
  if (!Number.isSafeInteger(segmentos) || segmentos < 1) throw new RangeError('segmentos precisa ser inteiro >= 1');
  const s = Math.sin(phi / (4 * segmentos));
  return 2 * raio * s * s;
}
/* Menor número de cordas cuja flecha atende ao desvio. A forma fechada dá a
   estimativa; os dois laços vizinhos corrigem arredondamento exatamente na
   fronteira, evitando o `ceil` devolver L+1 quando o desvio veio da flecha de L. */
export function contagemPorDesvio(raio, phi, desvio, minimo = 1) {
  if (!(raio > 0) || !Number.isFinite(raio)) throw new RangeError('raio precisa ser finito e > 0');
  if (!(phi > 0) || !Number.isFinite(phi)) throw new RangeError('phi precisa ser finito e > 0');
  if (!(desvio > 0) || !Number.isFinite(desvio)) throw new RangeError('desvio precisa ser finito e > 0');
  if (!Number.isSafeInteger(minimo) || minimo < 1) throw new RangeError('minimo precisa ser inteiro >= 1');
  if (flechaDoArco(raio, phi, minimo) <= desvio) return minimo;

  const meioSeno = Math.sqrt(desvio / (2 * raio));
  const angulo = Math.asin(Math.min(1, meioSeno));
  if (!(angulo > 0)) return Infinity;
  let n = Math.ceil(phi / (4 * angulo));
  if (!Number.isSafeInteger(n)) return Infinity;
  n = Math.max(minimo, n);
  while (n > minimo && flechaDoArco(raio, phi, n - 1) <= desvio) n--;
  while (flechaDoArco(raio, phi, n) > desvio) {
    n++;
    if (!Number.isSafeInteger(n)) return Infinity;
  }
  return n;
}

export function flechaDoAnel(raio, lados) {
  return flechaDoArco(raio, 2 * Math.PI, lados);
}

export function ladosPorDesvio(raio, desvio) {
  return contagemPorDesvio(raio, 2 * Math.PI, desvio, 3);
}

/* `lados` conserva o número antigo ou aceita a frase `{desvio}`. Não grita por
   conta própria para poder ser usado antes de qualquer `addV`: devolve erro ao
   chamador, que o registra no passo e mantém a operação fail-closed. */
function resolverLados(st, valor, raio, padrao = 8) {
  const automatico = valor && typeof valor === 'object' && !Array.isArray(valor);
  if (!automatico) {
    /* O modo numérico conserva a severidade histórica: parâmetro ausente,
       valor não-finito ou tipo inválido lançam alto pelo resolver numérico. */
    const bruto = st.num(valor ?? padrao);
    return { lados: Math.max(3, Math.trunc(bruto)), derivado: false };
  }

  const chaves = Object.keys(valor);
  if (chaves.length !== 1 || chaves[0] !== 'desvio') return { erro: `lados aceita um número ou {desvio}; recebido ${JSON.stringify(valor)}` };
  if (!(raio > 0) || !Number.isFinite(raio)) return { erro: `lados:{desvio} exige raio finito e > 0; recebido ${raio}` };
  let desvio;
  try { desvio = st.num(valor.desvio); } catch (e) { return { erro: `desvio não resolve: ${String(e.message).replace(/^oficina: /, '')}` }; }
  if (!(desvio > 0) || !Number.isFinite(desvio)) return { erro: `desvio precisa ser finito e > 0; recebido ${desvio}` };
  const lados = ladosPorDesvio(raio, desvio);
  if (!Number.isSafeInteger(lados)) return { erro: `o desvio ${desvio} é pequeno demais para produzir uma contagem inteira segura no raio ${raio}` };
  return { lados, derivado: true, desvio };
}

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

/* ---- POSE DE CRIAÇÃO (atrito A-4, otimização O-7) ----
   O atrito medido: nenhum gerador aceitava posição ou orientação, então toda
   primitiva que não morasse na origem custava um passo a mais, e toda peça de
   revolução fora do eixo Y custava DOIS — o trio criar + `rotaciona` +
   `transladar`. No acervo isso somava 128 dos 853 passos (15%), e 29% no freio
   e no drone: quase um passo de encanamento por primitiva criada.

   O custo não é só de tamanho. A posição ficava LONGE da forma (quem lê `cubo`
   não sabe onde ele está), o `origemId` virava obrigatório só para poder
   selecionar a primitiva de volta, e esquecer o passo de transporte deixava o
   corpo silenciosamente empilhado na origem.

   `em` é a translação e `eixo` é a direção do eixo de revolução. As duas são
   transformações rígidas aplicadas aos vértices que o passo criou, na ordem
   GIRA-DEPOIS-MOVE — exatamente o que a receita escrevia à mão:

     ['cilindro', {…}]                                        ['cilindro', {…,
     ['rotaciona', {eixo:'z', graus:-90, pivo:[0,0,0], sel}]  ≡    eixo: 'x',
     ['transladar', {d:[dx,dy,dz], sel}]                           em: [dx,dy,dz]}]

   `eixo:'x'` é −90° em torno de Z e `eixo:'z'` é +90° em torno de X: a mesma
   convenção que as peças já escreviam em helpers locais como `girarParaEixoX`,
   e a mesma `giraPonto` das ops `rotaciona` e `arranja`, para que os dois
   caminhos não possam divergir de sinal.

   Isto NÃO é um `alinhar` relacional (O-8): não encosta, não mede vizinho e não
   resolve pivô por seleção. É o atalho barato do caso comum, e continua sendo
   possível escrever os passos separados quando o pivô não é a origem. */
const GERADORES_COLOCAVEIS = new Set(['cubo', 'cilindro', 'esfera', 'cone', 'plano', 'chamferBox', 'lathe']);
/* Só faz sentido escolher eixo onde existe eixo: `cubo`, `plano`, `esfera` e
   `chamferBox` não são gerados por revolução, e aceitar `eixo` neles seria
   prometer uma orientação que a forma não tem. */
const GERADORES_COM_EIXO = new Set(['cilindro', 'cone', 'lathe']);
const GIRO_DO_EIXO = { x: { ax: 2, graus: -90 }, y: null, z: { ax: 0, graus: 90 } };

/* devolve null (nada a fazer), undefined (inválida, já gritou) ou a pose. */
function lerPoseDeCriacao(st, i, op, a) {
  /* `eixo` é palavra ANTIGA de `rotaciona` e de `arranja`, onde significa o eixo
     do GIRO. Aqui ela só vira pose quando o gerador é de revolução; em qualquer
     outra op o nome continua pertencendo a quem já o usava, e por isso a saída
     rápida testa `op` antes de olhar para o valor. */
  const ehPose = a.em != null || (a.eixo != null && GERADORES_COLOCAVEIS.has(op));
  if (!ehPose) return null;
  if (a.em != null && !GERADORES_COLOCAVEIS.has(op)) {
    grita(st, i, op, 'em', `em posiciona a forma no momento em que ela nasce e só existe nos geradores (${[...GERADORES_COLOCAVEIS].sort().join(', ')}); '${op}' já recebe as coordenadas de onde trabalha`);
    return undefined;
  }
  if (a.eixo != null && GERADORES_COLOCAVEIS.has(op) && !GERADORES_COM_EIXO.has(op)) {
    grita(st, i, op, 'eixo', `'${op}' não é gerado por revolução, então não tem eixo para escolher; use em para posicionar e rotaciona para orientar`);
    return undefined;
  }
  let d = null;
  if (a.em != null) {
    /* aceita ponto nomeado: `em` é um ponto como qualquer outro, e recusar o
       nome aqui obrigaria a peça a escrever três componentes só neste campo. */
    if (typeof a.em !== 'string' && (!Array.isArray(a.em) || a.em.length !== 3)) {
      grita(st, i, op, 'em', `em precisa ser [x,y,z] (3 elementos) ou o nome de um ponto declarado; recebido ${JSON.stringify(a.em)}`);
      return undefined;
    }
    /* Sem conferência de finitude aqui, e isso é escolha: `st.vec` LANÇA em
       valor não-finito, pela mesma rede central que protege `larg`, `raio` e o
       `d` do `transladar`. Um segundo teste depois dela nunca dispararia, e
       validação inalcançável é promessa que ninguém pode cobrar. */
    d = st.vec(a.em);
  }
  let giro = null;
  if (a.eixo != null && GERADORES_COM_EIXO.has(op)) {
    if (!Object.hasOwn(GIRO_DO_EIXO, a.eixo)) {
      grita(st, i, op, 'eixo', `eixo aceita 'x', 'y' ou 'z' (a direção do eixo de revolução da forma; 'y' é como ela já nasce); recebido ${JSON.stringify(a.eixo)}`);
      return undefined;
    }
    giro = GIRO_DO_EIXO[a.eixo];
  }
  return (d || giro) ? { d, giro } : null;
}

function aplicarPoseDeCriacao(st, antes, { d, giro }) {
  const c = giro ? Math.cos((giro.graus * Math.PI) / 180) : 1;
  const s = giro ? Math.sin((giro.graus * Math.PI) / 180) : 0;
  for (const [id, p] of st.V) {
    if (antes.has(id)) continue;             // vértice de passo anterior não se mexe
    const girado = giro ? giraPonto(p, [0, 0, 0], giro.ax, c, s) : p;
    st.V.set(id, d ? [girado[0] + d[0], girado[1] + d[1], girado[2] + d[2]] : girado);
  }
}

/* Portas de montagem vivem nas coordenadas da geometria que lhes deu origem.
   Quando `espelha` ou `arranja` cria essa geometria, a interface declarada no
   original precisa acompanhá-la — e não ficar plausível, mas parada, no lugar
   antigo. Não guardamos matriz nem id runtime: só a transformação explícita do
   próprio passo estrutural, resolvida de novo a cada replay. */
function normalizarVetorDaInterface(v) {
  const tamanho = Math.hypot(...v);
  return v.map((n) => {
    const normalizado = n / tamanho;
    return Math.abs(normalizado) < 1e-15 ? 0 : normalizado;
  });
}

function transformarInterfaceDaPorta(interfaceResolvida, transformacoes) {
  if (interfaceResolvida === undefined || !transformacoes.length) return interfaceResolvida;
  let centro = interfaceResolvida.centro.slice();
  let eixo = interfaceResolvida.eixo.slice();
  let referencia = interfaceResolvida.referencia?.slice();
  let mao = 'direta';
  for (const transformacao of transformacoes) {
    if (transformacao.tipo === 'espelho') {
      centro[transformacao.eixo] = 2 * transformacao.pos - centro[transformacao.eixo];
      eixo[transformacao.eixo] = -eixo[transformacao.eixo];
      if (referencia) referencia[transformacao.eixo] = -referencia[transformacao.eixo];
      mao = mao === 'direta' ? 'espelhada' : 'direta';
    } else if (transformacao.modo === 'radial') {
      const rad = transformacao.graus * Math.PI / 180;
      const c = Math.cos(rad), s = Math.sin(rad);
      centro = giraPonto(centro, transformacao.pivo, transformacao.eixo, c, s);
      eixo = giraPonto(eixo, [0, 0, 0], transformacao.eixo, c, s);
      if (referencia) referencia = giraPonto(referencia, [0, 0, 0], transformacao.eixo, c, s);
    } else {
      centro = centro.map((n, indice) => n + transformacao.d[indice]);
    }
  }
  return {
    ...interfaceResolvida,
    centro: centro.map((n) => Math.abs(n) < 1e-15 ? 0 : n),
    eixo: normalizarVetorDaInterface(eixo),
    ...(referencia === undefined ? {} : { referencia: normalizarVetorDaInterface(referencia) }),
    ...(mao === 'direta' ? {} : { mao }),
  };
}

function registroDaOrigem(st, origem) {
  const registros = st.origens.get(origem.id) ?? [];
  return registros.length === 1 && registros[0].op === origem.op ? registros[0] : null;
}

/* A porta pode citar uma cópia de outra cópia. A sequência abaixo segue a
   cadeia declarada (fonte -> derivação), em vez de tentar reconstruir posição
   por ids de face, ordem de passos ou ordem de arrays. `arranja` só serve de
   interface quando `copia` resolve UMA cópia; a coleção inteira não tem um
   único quadro a publicar. */
function transformacoesDaOrigemDaPorta(st, origem) {
  if (origem.op !== 'espelha' && origem.op !== 'arranja') return { transformacoes: [] };
  const registro = registroDaOrigem(st, origem);
  if (!registro) return { erro: `origem ${origem.op}:${origem.id} não tem registro estrutural único` };
  const fonte = transformacoesDaOrigemDaPorta(st, origem.de);
  if (fonte.erro) return fonte;
  if (origem.op === 'espelha') {
    return { transformacoes: [...fonte.transformacoes, registro.transformacao] };
  }
  if (!eixoDeIndiceUnico(origem.copia)) {
    return { erro: `interface sob arranja:${origem.id} exige copia única (inteiro, PARAM, expressão, 'primeira' ou 'ultima'); coleção ou filtro publicam mais de um quadro` };
  }
  const indice = indiceDeEixo(st, origem.copia, registro.copias.length);
  if (indice.erro || indice.idx >= registro.copias.length) {
    return { erro: indice.erro ?? `copia ${textoDeEixo(origem.copia, indice.idx)} fora do limite da origem arranja:${origem.id}` };
  }
  const transformacao = registro.transformacao.modo === 'radial'
    ? { ...registro.transformacao, graus: (indice.idx + 1) * registro.transformacao.passoGraus }
    : { ...registro.transformacao, d: registro.transformacao.d.map((n) => n * (indice.idx + 1)) };
  return { transformacoes: [...fonte.transformacoes, transformacao] };
}

/* produto vetorial a×b — puro, usado só pela op `loft` (frame de transporte
   paralelo, mais abaixo). */
function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }

/* Normal de um polígono (n-gon) por Newell — robusto pra face de 3+ cantos e
   independente da triangulação. */
export function normalDaFace(V, vs) {
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
export const N_INFLU = 4;        // TOP-N influências por vértice (padrão 4; menos serve pro low-poly, os slots sobrando ficam peso 0)
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
function contextoNativo(st, i) {
  const vertices = new Map(), faces = new Map(), base = baseDoPasso(i);
  const local = (id, tipo) => { if (!Number.isSafeInteger(id) || id < 0 || id >= BLOCO) throw new Error(`${tipo} local precisa ser inteiro entre 0 e ${BLOCO - 1}`); return id; };
  return Object.freeze({
    numero: (valor) => st.num(valor), vetor: (valor) => st.vec(valor),
    emitirVertice(id, ponto) { id = local(id, 'vértice'); if (vertices.has(id)) throw new Error(`vértice local ${id} duplicado`); vertices.set(id, st.vec(ponto)); },
    emitirFace(id, vs) { id = local(id, 'face'); if (faces.has(id) || !Array.isArray(vs) || vs.length < 3 || new Set(vs).size !== vs.length || vs.some((v) => !vertices.has(v))) throw new Error(`face local ${id} inválida`); faces.set(id, vs.slice()); },
    publicar() { for (const [id, ponto] of vertices) addV(st, base + id, ponto); for (const [id, vs] of faces) addF(st, base + id, vs.map((v) => base + v)); },
  });
}

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
export function temNomeDeParte(nome) { return nomeDeParteInvalido(nome) === null; }

/* A geometria pode declarar filho antes de declarar o pai: a ordem dos passos
   descreve a fabricação, não a árvore conceitual. Por isso `parte.pai` só é
   aplicado depois de todos os passos. Se uma declaração não fecha, nenhuma
   hierarquia parcial é publicada — uma árvore incompleta é ambígua para quem
   vier depois, mesmo que a malha permaneça útil para diagnosticar o erro. */
function aplicarHierarquiaDasPartes(st) {
  const declaracoes = [...st.paisDasPartes.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0);
  const invalidas = [];
  for (const [filho, declaracao] of declaracoes) {
    if (!st.partes[filho]) invalidas.push({ filho, ...declaracao, motivo: `parte '${filho}' não existe no fim da receita` });
    else if (!st.partes[declaracao.pai]) invalidas.push({ filho, ...declaracao, motivo: `pai '${declaracao.pai}' não existe no fim da receita` });
  }

  const pais = new Map(declaracoes.map(([filho, declaracao]) => [filho, declaracao.pai]));
  for (const [filho, declaracao] of declaracoes) {
    const vistos = new Set([filho]);
    let cursor = declaracao.pai;
    while (pais.has(cursor)) {
      if (vistos.has(cursor)) {
        invalidas.push({ filho, ...declaracao, motivo: `pai '${declaracao.pai}' cria ciclo de hierarquia` });
        break;
      }
      vistos.add(cursor);
      cursor = pais.get(cursor);
    }
  }
  if (invalidas.length) {
    for (const invalida of invalidas) grita(st, invalida.passo, 'parte', 'pai', invalida.motivo);
    return;
  }
  for (const [filho, declaracao] of declaracoes) st.partes[filho].pai = declaracao.pai;
}

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
     `unir`, que é o mecanismo que já existe para isso.

     `de` É A FONTE, OU UM RECORTE DELA (ciclo "Corte e orientação de seção
     v1", A-28). Até esta rodada o portão era a IGUALDADE da origem declarada:
     `de` tinha de ser, chave por chave, o `derivaDe` do passo. A consequência
     não estava escrita em lugar nenhum e só apareceu ao compor as duas
     capacidades do ciclo: `furo` exige que `de` resolva para UMA face, e a
     origem do arranjo só sabia devolver a cópia INTEIRA — então um círculo de
     furos sobre uma coleção arranjada era impossível, e a saída seria escrever
     cada instância à mão, com o seno e o cosseno do ângulo virando parâmetro de
     coordenada (exatamente o que o ciclo 3 tirou da roda).
     Agora o portão é a PERTINÊNCIA: `de` pode ser qualquer origem cujas faces
     sejam faces da fonte deste arranjo — `{op:'chamferBox', id:S, face:'direita'}`
     recorta uma face só de cada cópia. Citar algo que este arranjo não copiou
     continua GRITANDO, e o grito agora nomeia a face e a fonte, em vez de dizer
     só "outra seleção estrutural". É estritamente mais permissivo do que a
     igualdade (origem igual resolve para todas as faces da fonte, todas no
     mapa), então nenhuma citação já escrita muda de significado.
     O que ele NÃO afrouxa: as faces continuam sendo procuradas no mapa da
     cópia, uma a uma. Uma face fora da fonte não vira cópia por acidente, e
     face da fonte já CONSUMIDA por um corte faz o próprio `de` gritar antes,
     pela regra de consumo do gerador dela — por isso, numa peça que fura a
     fonte E as cópias, a fonte é a ÚLTIMA a ser furada. */
  arranja: {
    validar(origem) {
      const chaves = ['op', 'id', 'de', 'copia', 'nome'];
      const msg = "arranja usa op, id, de, e depois copia OU nome (copia é o eixo numérico sobre as cópias 0..total−2: inteiro, nome de parâmetro ou expressão '=…', extremidade 'primeira'/'ultima', ausente = a coleção inteira, ou filtro de progressão {passo,fase}; nome é o endereço declarado em `nomes` no passo)";
      if (!Object.keys(origem).every((k) => chaves.includes(k)) || !Object.hasOwn(origem, 'de')) return msg;
      /* `copia` e `nome` apontam para a mesma cópia por caminhos diferentes.
         Aceitar os dois juntos obrigaria a decidir qual vence quando
         discordassem, e a resposta certa não existe: um deles estaria errado e
         a peça não diria qual. */
      if (origem.copia != null && origem.nome != null) return "arranja usa copia (posição) ou nome (endereço declarado), nunca os dois — se discordassem, um dos dois estaria errado e a peça não diria qual";
      if (origem.nome != null && nomeDeParteInvalido(origem.nome)) return `nome da origem arranja ${nomeDeParteInvalido(origem.nome)}`;
      if (!validarEixo(origem.copia)) return msg;
      const fonte = validarOrigem(origem.de);
      return fonte.erro ? `arranja exige de estrutural válido: ${fonte.erro}` : null;
    },
    resolver(st, registro, origem) {
      const fonte = resolverOrigem(st, origem.de);
      if (fonte.erro) return { erro: `de da origem arranja:${origem.id} não resolve: ${fonte.erro}` };
      const nCopias = registro.copias.length;
      let indices;
      if (origem.nome != null) {
        const nomes = registro.nomesDasCopias;
        if (!nomes) return { erro: `origem arranja:${origem.id} não nomeou suas cópias; declare nomes no passo do arranjo ou cite copia` };
        const idx = nomes.indexOf(origem.nome);
        if (idx < 0) return { erro: `origem arranja:${origem.id} não tem cópia chamada '${origem.nome}'; os nomes deste passo são ${nomes.map((n) => `'${n}'`).join(', ')}` };
        indices = [idx];
      } else if (eixoDeIndiceUnico(origem.copia)) {
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
          /* PERTINÊNCIA: a face citada por `de` tem de ser uma face da fonte
             DESTE arranjo. `de` que aponta para outra primitiva cai aqui. */
          if (copia == null) return { erro: `a face ${original}, citada por de, não pertence à fonte da origem arranja:${origem.id} (a fonte declarada é ${JSON.stringify(registro.derivaDe)}) — este arranjo não copiou face nenhuma dela` };
          if (!st.F.has(copia)) return { erro: `copia ${k} da face ${original} da origem derivada não existe${consumoDe(st, copia)}` };
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
     nada.

     VÁRIOS FUROS NO MESMO PASSO (ciclo "Furo v2", A-26) — o eixo `furo`, que é
     o que impede a segunda face anônima: um passo com quatro centros publica
     quatro furos DISTINGUÍVEIS entre si, e não um borrão de 4·3·lados faces.
       `{op:'furo', id, furo: 2}`            o TERCEIRO furo inteiro;
       `{op:'furo', id, furo: 2, parede: 0}` a parede 0 daquele furo;
       `{op:'furo', id, parede: 0}`          a parede 0 de TODOS os furos — o
                                             eixo ausente é "todos", a mesma
                                             lei das outras famílias, e é isso
                                             que faz o furo de UM centro
                                             continuar respondendo palavra por
                                             palavra como sempre respondeu;
       `{op:'furo', id, preenchimento: 0}`   a superfície da face que não toca
                                             anel nenhum, só existe com DOIS
                                             anéis ou mais (com um anel a borda
                                             é a volta inteira, e citá-lo GRITA
                                             em vez de devolver vazio);
       `{op:'furo', id, preenchimentoDaSaida: 'ultima'}` o mesmo do outro lado.
     `furo` fora do limite, como todo eixo daqui, nomeia a faixa e GRITA.

     GRUPO (F1/A-30) é a identidade do autor sobre uma fonte de centros:
       `{op:'furo', id, grupo:'parafusos'}`      todos os furos desse grupo;
       `{op:'furo', id, grupo:'parafusos', furo:0}` o primeiro DELE.
     O nome nunca é índice; com `grupo`, o eixo `furo` conta só o grupo. O
     preenchimento fica de fora porque pertence à FACE, não a um anel.

     RASGO / ABERTURA OBLONGA — `ate` é o segundo centro, e o anel deixa de ser
     um círculo para ser um ESTÁDIO: meia-volta de raio `raio` em cada extremo,
     ligadas por dois lados retos. O rasgo NÃO é uma família nova de endereço:
     ele gasta os mesmos `lados` pontos, então `borda`, `parede`, `saida`,
     `tampa`, `preenchimento`, `furo` e `grupo` continuam valendo palavra por
     palavra, e uma receita que endereçava furo redondo continua endereçando.
       `{op:'furo', id, parede: 0}`   a parede 0 do rasgo, como em qualquer furo.
     Duas formas declaram o rasgo:
       `{op:'furo', …, centro:[…], ate:[…], raio}`               um rasgo;
       `centros: [{nome:'guia', centro:[…], ate:[…], raio}]`     rasgo na lista.
     `ate` acompanha `centro`; dentro de `centros` cada disco declara o seu.
     A LARGURA do rasgo é exata (`2·raio`, os lados retos caem em ±raio); o
     COMPRIMENTO é inscrito, como o diâmetro de um furo redondo. Comprimento
     zero GRITA — seria um furo redondo com nome de rasgo — e `lados` abaixo de
     4 GRITA, porque meia-volta precisa de dois pontos para existir. */
  furo: {
    validar(origem) {
      const chaves = ['op', 'id', 'grupo', 'furo', 'borda', 'parede', 'saida', 'tampa', 'preenchimento', 'preenchimentoDaSaida'];
      const msg = "furo usa op, id, grupo opcional (nome semântico visível), furo/borda/parede/saida/preenchimento/preenchimentoDaSaida opcionais (eixo numérico: inteiro, nome de parâmetro ou expressão '=…', extremidade 'primeira'/'ultima', ausente = todos, ou filtro de progressão {passo,fase}) e tampa opcional ('fundo', só no furo cego)";
      if (!Object.keys(origem).every((k) => chaves.includes(k))) return msg;
      if (origem.grupo != null && nomeDeParteInvalido(origem.grupo)) return msg;
      if (origem.grupo != null && (origem.preenchimento != null || origem.preenchimentoDaSaida != null)) return msg;
      for (const familia of ['furo', 'borda', 'parede', 'saida', 'preenchimento', 'preenchimentoDaSaida']) if (!validarEixo(origem[familia])) return msg;
      if (origem.tampa != null && origem.tampa !== 'fundo') return msg;
      return null;
    },
    resolver(st, registro, origem) {
      const furos = registro.furos;
      const M = furos.length;
      const passante = furos[0].saidas != null;
      const grupo = origem.grupo == null ? null : (registro.grupos ?? []).find((g) => g.nome === origem.grupo);
      if (origem.grupo != null && !grupo) {
        const nomes = (registro.grupos ?? []).map((g) => `'${g.nome}'`);
        return { erro: nomes.length
          ? `origem furo:${origem.id} não tem grupo '${origem.grupo}'; os grupos deste passo são ${nomes.join(', ')}`
          : `origem furo:${origem.id} não tem grupos nomeados neste passo` };
      }
      if (origem.saida != null && !passante) return { erro: `origem furo:${origem.id} é um furo CEGO — não tem saída; o fundo dele é tampa:'fundo'` };
      if (origem.tampa != null && passante) return { erro: `origem furo:${origem.id} é um furo PASSANTE — não tem fundo; a borda do outro lado é o eixo 'saida'` };
      if (origem.preenchimento != null && !registro.preenchimento.length) return { erro: `origem furo:${origem.id} abriu UM anel só — a borda dá a volta inteira e não sobra preenchimento; o preenchimento existe a partir de dois anéis no mesmo passo` };
      if (origem.preenchimentoDaSaida != null && !passante) return { erro: `origem furo:${origem.id} é um furo CEGO — não tem preenchimento de saída; o outro lado dele é a tampa 'fundo'` };
      if (origem.preenchimentoDaSaida != null && !registro.preenchimentoDaSaida.length) return { erro: `origem furo:${origem.id} abriu UM anel só — a borda de saída dá a volta inteira e não sobra preenchimento; o preenchimento existe a partir de dois anéis no mesmo passo` };

      /* quais FUROS: o eixo `furo` ausente é "todos", como as famílias. */
      const furosDoAlvo = grupo ? grupo.furos : Array.from({ length: M }, (_, k) => k);
      const Q = furosDoAlvo.length;
      let indicesLocais;
      if (eixoDeIndiceUnico(origem.furo)) {
        const r = indiceDeEixo(st, origem.furo, Q);
        if (r.erro) return { erro: `furo '${origem.furo}' da origem furo:${origem.id} ${r.erro}` };
        if (r.idx >= Q) return { erro: `furo ${textoDeEixo(origem.furo, r.idx)} fora do limite ${grupo ? `do grupo '${grupo.nome}' ` : ''}da origem furo:${origem.id} (0..${Q - 1})` };
        indicesLocais = [r.idx];
      } else {
        indicesLocais = indicesEixo(origem.furo, Q);
        if (typeof origem.furo === 'object' && origem.furo != null && !indicesLocais.length) {
          const { passo, fase } = origem.furo;
          return { erro: `filtro de furo {passo:${passo},fase:${fase}} não casa nenhum índice em 0..${Q - 1} ${grupo ? `no grupo '${grupo.nome}' ` : ''}na origem furo:${origem.id}` };
        }
      }
      const semFamilia = origem.borda == null && origem.parede == null && origem.saida == null && origem.tampa == null
        && origem.preenchimento == null && origem.preenchimentoDaSaida == null;

      const faces = [];
      /* Um passo de UM furo não tem por que dizer "do furo 0" em cada
         diagnóstico: com M = 1 o texto é o de sempre, palavra por palavra. */
      const alvoDo = (k, local) => {
        if (grupo) return `do furo ${local} do grupo '${grupo.nome}' da origem furo:${origem.id}`;
        return M === 1 ? `da origem furo:${origem.id}` : `do furo ${k} da origem furo:${origem.id}`;
      };
      const colher = (nome, lista, eixo, alvo) => {
        if (eixoDeIndiceUnico(eixo)) {
          const r = indiceDeEixo(st, eixo, lista.length);
          if (r.erro) return { erro: `${nome} '${eixo}' ${alvo} ${r.erro}` };
          if (r.idx >= lista.length) return { erro: `${nome} ${textoDeEixo(eixo, r.idx)} fora do limite ${alvo} (0..${lista.length - 1})` };
          const f = lista[r.idx];
          if (!st.F.has(f)) return { erro: `${nome} ${textoDeEixo(eixo, r.idx)} ${alvo} foi removida${consumoDe(st, f)}` };
          faces.push(f);
          return null;
        }
        const idx = indicesEixo(eixo, lista.length);
        if (typeof eixo === 'object' && eixo != null && !idx.length) {
          const { passo, fase } = eixo;
          return { erro: `filtro de ${nome} {passo:${passo},fase:${fase}} não casa nenhum índice em 0..${lista.length - 1} na origem furo:${origem.id}` };
        }
        for (const k of idx) {
          const f = lista[k];
          const consumo = conferirConsumo(st, f, `${nome} ${k} ${alvo}`);
          if (consumo) return { erro: consumo };
          if (st.F.has(f)) faces.push(f);
        }
        return null;
      };

      for (const local of indicesLocais) {
        const k = furosDoAlvo[local];
        const registroDoFuro = furos[k];
        const alvo = alvoDo(k, local);
        const familias = [['borda', registroDoFuro.bordas], ['parede', registroDoFuro.paredes], ['saida', registroDoFuro.saidas]];
        for (const [nome, lista] of familias) {
          if (lista == null) continue;
          const eixo = origem[nome];
          if (eixo == null && !semFamilia) continue;
          const erro = colher(nome, lista, eixo, alvo);
          if (erro) return erro;
        }
        if (registroDoFuro.fundo != null && (origem.tampa != null || semFamilia)) {
          const consumo = conferirConsumo(st, registroDoFuro.fundo, `tampa 'fundo' ${alvo}`);
          if (consumo) return { erro: consumo };
          if (!st.F.has(registroDoFuro.fundo)) {
            if (origem.tampa != null) return { erro: `tampa 'fundo' ${alvo} foi removida` };
          } else faces.push(registroDoFuro.fundo);
        }
      }

      /* O preenchimento é da FACE, não de um furo: ele entra quando a origem
         cita a peça inteira (sem eixo nenhum) ou quando é citado por nome.
         `{furo: k}` sozinho é "o furo k", e o furo k não tem preenchimento. */
      const inteira = semFamilia && origem.furo == null && origem.grupo == null;
      for (const [nome, lista] of [['preenchimento', registro.preenchimento], ['preenchimentoDaSaida', registro.preenchimentoDaSaida]]) {
        if (!lista.length) continue;
        const eixo = origem[nome];
        if (eixo == null && !inteira) continue;
        const erro = colher(nome, lista, eixo, `da origem furo:${origem.id}`);
        if (erro) return erro;
      }
      if (!faces.length) return { erro: `origem furo:${origem.id} não tem nenhuma face correspondente` };
      return { faces };
    },
  },
  /* filete (ciclo "Curva e filete v1") — a origem que a op `filete` publica: os
     `n` PAINÉIS novos que substituem a aresta escolhida, um eixo NUMÉRICO só
     (`painel`, 0..n-1, mesma gramática dos outros eixos — inteiro, nome de
     PARAM/expressão, extremidade 'primeira'/'ultima', ausente = todos, ou
     filtro de progressão {passo,fase}). Não existe família nominal: a face de
     ENTRADA (`de`) e a face do outro lado da aresta continuam vivas com a
     IDENTIDADE que já tinham antes do filete (o filete não as consome — ver
     comentário da op), então elas seguem citáveis pela origem ANTIGA delas;
     só os painéis novos são desta origem. */
  filete: {
    validar(origem) {
      const chaves = ['op', 'id', 'painel'];
      const msg = "filete usa op, id e painel opcional (eixo numérico sobre os N painéis novos: inteiro, nome de parâmetro ou expressão '=…', extremidade 'primeira'/'ultima', ausente = todos, ou filtro de progressão {passo,fase})";
      if (!Object.keys(origem).every((k) => chaves.includes(k))) return msg;
      if (!validarEixo(origem.painel)) return msg;
      return null;
    },
    resolver(st, registro, origem) {
      const lista = registro.paineis;
      if (!lista.length) return { erro: `origem filete:${origem.id} não tem painéis` };
      if (eixoDeIndiceUnico(origem.painel)) {
        const r = indiceDeEixo(st, origem.painel, lista.length);
        if (r.erro) return { erro: `painel '${origem.painel}' da origem filete:${origem.id} ${r.erro}` };
        if (r.idx >= lista.length) return { erro: `painel ${textoDeEixo(origem.painel, r.idx)} fora do limite da origem filete:${origem.id} (0..${lista.length - 1})` };
        const f = lista[r.idx];
        if (!st.F.has(f)) return { erro: `painel ${textoDeEixo(origem.painel, r.idx)} da origem filete:${origem.id} foi removido${consumoDe(st, f)}` };
        return { faces: [f] };
      }
      const idx = indicesEixo(origem.painel, lista.length);
      if (typeof origem.painel === 'object' && origem.painel != null && !idx.length) {
        const { passo, fase } = origem.painel;
        return { erro: `filtro de painel {passo:${passo},fase:${fase}} não casa nenhum índice em 0..${lista.length - 1} na origem filete:${origem.id}` };
      }
      const faces = [];
      for (const k of idx) {
        const f = lista[k];
        const consumo = conferirConsumo(st, f, `painel ${k} da origem filete:${origem.id}`);
        if (consumo) return { erro: consumo };
        if (st.F.has(f)) faces.push(f);
      }
      if (!faces.length) return { erro: `origem filete:${origem.id} não tem nenhum painel vivo` };
      return { faces };
    },
  },
  /* `arredondarAresta` é o sucessor do chanfro `filete`: o eixo mantém a
     mesma gramática, mas cada face publicada é uma faixa da aproximação do
     arco. A operação não reaproveita o nome do v1 justamente para não fazer
     `painel:1` mudar de significado em conteúdo salvo. */
  arredondarAresta: {
    validar(origem) {
      const chaves = ['op', 'id', 'painel'];
      const msg = "arredondarAresta usa op, id e painel opcional (eixo numérico sobre os painéis do arco: inteiro, nome de parâmetro ou expressão '=…', extremidade 'primeira'/'ultima', ausente = todos, ou filtro de progressão {passo,fase})";
      if (!Object.keys(origem).every((k) => chaves.includes(k))) return msg;
      if (!validarEixo(origem.painel)) return msg;
      return null;
    },
    resolver(st, registro, origem) {
      const lista = registro.paineis;
      if (!lista.length) return { erro: `origem arredondarAresta:${origem.id} não tem painéis` };
      if (eixoDeIndiceUnico(origem.painel)) {
        const r = indiceDeEixo(st, origem.painel, lista.length);
        if (r.erro) return { erro: `painel '${origem.painel}' da origem arredondarAresta:${origem.id} ${r.erro}` };
        if (r.idx >= lista.length) return { erro: `painel ${textoDeEixo(origem.painel, r.idx)} fora do limite da origem arredondarAresta:${origem.id} (0..${lista.length - 1})` };
        const f = lista[r.idx];
        if (!st.F.has(f)) return { erro: `painel ${textoDeEixo(origem.painel, r.idx)} da origem arredondarAresta:${origem.id} foi removido${consumoDe(st, f)}` };
        return { faces: [f] };
      }
      const idx = indicesEixo(origem.painel, lista.length);
      if (typeof origem.painel === 'object' && origem.painel != null && !idx.length) {
        const { passo, fase } = origem.painel;
        return { erro: `filtro de painel {passo:${passo},fase:${fase}} não casa nenhum índice em 0..${lista.length - 1} na origem arredondarAresta:${origem.id}` };
      }
      const faces = [];
      for (const k of idx) {
        const f = lista[k];
        const consumo = conferirConsumo(st, f, `painel ${k} da origem arredondarAresta:${origem.id}`);
        if (consumo) return { erro: consumo };
        if (st.F.has(f)) faces.push(f);
      }
      if (!faces.length) return { erro: `origem arredondarAresta:${origem.id} não tem nenhum painel vivo` };
      return { faces };
    },
  },
};

/* Fonte canônica curta para ferramentas e documentação de autoria. A lista é
   derivada dos contratos que `sel:{origem}` realmente resolve; não é uma
   segunda tabela mantida à mão. */
export const OPERACOES_COM_ORIGEM = Object.freeze(Object.keys(CONTRATOS_ORIGEM).sort());

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
   caro; é o O-3 de docs/mecanifica/historico/OFICINA-OTIMIZACOES.md): um VÉRTICE entra
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

/* SEPARAÇÃO ENTRE ANÉIS (ciclo "Furo v2") — dois anéis do MESMO passo não podem
   se tocar. Teorema do eixo separador entre dois convexos: se existe um eixo
   (normal de alguma aresta de um dos dois) em que as projeções não se
   encostam, eles são disjuntos. Encostar conta como cruzar: dois furos que se
   tocam num ponto produziriam uma borda com vértice pinçado, e o resultado é
   plausível na foto e errado na malha. Sem tolerância cega: a folga exigida
   acompanha a escala da face. */
function aneisSeSobrepoem(A, B, escala) {
  const folga = 1e-9 * Math.max(1, escala);
  for (const [P, Q] of [[A, B], [B, A]]) {
    for (let k = 0; k < P.length; k++) {
      const p = P[k], q = P[(k + 1) % P.length];
      const ex = q[0] - p[0], ey = q[1] - p[1];
      const len = Math.hypot(ex, ey);
      if (!(len > 0)) continue;
      const nx = -ey / len, ny = ex / len;
      let maxP = -Infinity, minP = Infinity, maxQ = -Infinity, minQ = Infinity;
      for (const r of P) { const t = r[0] * nx + r[1] * ny; maxP = Math.max(maxP, t); minP = Math.min(minP, t); }
      for (const r of Q) { const t = r[0] * nx + r[1] * ny; maxQ = Math.max(maxQ, t); minQ = Math.min(minQ, t); }
      if (minQ - maxP > folga || minP - maxQ > folga) return false;
    }
  }
  return true;
}

/* --- primitivas de triangulação, usadas só pela borda de VÁRIOS anéis --- */
function cruz2(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
function dentroEstrito(A, B, C, P, eps) {
  return cruz2(A, B, P) > eps && cruz2(B, C, P) > eps && cruz2(C, A, P) > eps;
}
/* Cruzamento PRÓPRIO de dois segmentos: os interiores se encontram. Tocar por
   um extremo compartilhado não conta — é assim que uma ponte encosta no
   contorno sem ser recusada por encostar nele. */
function segmentosCruzam(a, b, c, d, eps) {
  const d1 = cruz2(c, d, a), d2 = cruz2(c, d, b), d3 = cruz2(a, b, c), d4 = cruz2(a, b, d);
  if (((d1 > eps && d2 < -eps) || (d1 < -eps && d2 > eps)) && ((d3 > eps && d4 < -eps) || (d3 < -eps && d4 > eps))) return true;
  return false;
}
function pontoNoSegmento(a, b, p, eps) {
  if (Math.abs(cruz2(a, b, p)) > eps) return false;
  const t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2 || 1);
  return t > 1e-9 && t < 1 - 1e-9;
}
function areaPoligono(P) {
  let a = 0;
  for (let k = 0; k < P.length; k++) { const p = P[k], q = P[(k + 1) % P.length]; a += p[0] * q[1] - q[0] * p[1]; }
  return a / 2;
}

/* Fallback completo para polígono com buracos. Ele recebe somente anéis já
   validados por `furo`, não cria pontos e ainda passa pelas mesmas provas de
   área, borda e famílias semânticas que protegem o caminho de pontes. */
function triangularComEarcut(contorno, aneis) {
  const pts = [], tags = [], plano = [], indicesDosAneis = [], baseAnel = [];
  const incluir = (p, tag) => { pts.push(p); tags.push(tag); plano.push(p[0], p[1]); };
  contorno.forEach((p, i) => incluir(p, { tipo: 'contorno', i }));
  aneis.forEach((anel, k) => {
    indicesDosAneis.push(pts.length); baseAnel.push(pts.length);
    anel.forEach((p, j) => incluir(p, { tipo: 'anel', k, j }));
  });
  const saida = earcut(plano, indicesDosAneis, 2);
  if (saida.length % 3) return { erro: 'o fallback de triangulação devolveu uma lista incompleta de triângulos' };
  const tri = [];
  for (let i = 0; i < saida.length; i += 3) {
    const t = [saida[i], saida[i + 1], saida[i + 2]];
    if (cruz2(pts[t[0]], pts[t[1]], pts[t[2]]) < 0) [t[1], t[2]] = [t[2], t[1]];
    tri.push(t);
  }

  const esperado = contorno.length + aneis.reduce((s, r) => s + r.length, 0) + 2 * aneis.length - 2;
  if (tri.length !== esperado) return { erro: `a partição saiu com ${tri.length} triângulo(s) e a contagem fechada é ${esperado}` };
  let area = 0;
  for (const [a, b, d] of tri) { const t = cruz2(pts[a], pts[b], pts[d]) / 2; if (!(t > 0)) return { erro: 'a partição criou um triângulo de área nula ou invertida' }; area += t; }
  const alvo = areaPoligono(contorno) - aneis.reduce((s, r) => s + areaPoligono(r), 0);
  if (Math.abs(area - alvo) > 1e-9 * Math.max(1, Math.abs(alvo))) return { erro: `a partição cobre ${area} de área e a região tem ${alvo}` };
  const conta = new Map();
  for (const [a, b, d] of tri) for (const [x, y] of [[a, b], [b, d], [d, a]]) conta.set(`${x}>${y}`, (conta.get(`${x}>${y}`) ?? 0) + 1);
  const borda = new Set();
  for (let i = 0; i < contorno.length; i++) borda.add(`${i}>${(i + 1) % contorno.length}`);
  aneis.forEach((anel, k) => { for (let j = 0; j < anel.length; j++) borda.add(`${baseAnel[k] + (j + 1) % anel.length}>${baseAnel[k] + j}`); });
  for (const [chave, n] of conta) {
    const [x, y] = chave.split('>');
    if (borda.has(chave)) { if (n !== 1) return { erro: `a aresta de borda ${chave} aparece ${n} vezes` }; continue; }
    if (n !== 1 || (conta.get(`${y}>${x}`) ?? 0) !== 1) return { erro: `a aresta interna ${chave} não é compartilhada por exatamente dois triângulos` };
  }
  for (const chave of borda) if ((conta.get(chave) ?? 0) !== 1) return { erro: `a aresta de borda ${chave} ficou sem triângulo` };

  const bordas = aneis.map((anel) => new Array(anel.length).fill(null));
  const preenchimento = [];
  tri.forEach((t) => {
    const desc = { cantos: t.map((v) => tags[v]) };
    let dono = null;
    for (let e = 0; e < 3; e++) {
      const x = tags[t[e]], y = tags[t[(e + 1) % 3]];
      if (x.tipo === 'anel' && y.tipo === 'anel' && x.k === y.k && y.j === (x.j + aneis[x.k].length - 1) % aneis[x.k].length) { dono = { k: x.k, j: y.j }; break; }
    }
    if (dono) bordas[dono.k][dono.j] = desc; else preenchimento.push(desc);
  });
  for (let k = 0; k < bordas.length; k++) for (let j = 0; j < bordas[k].length; j++) if (!bordas[k][j]) return { erro: `a aresta ${j} do anel ${k} não caiu em triângulo nenhum` };
  return { bordas, preenchimento };
}

/* A BORDA DE VÁRIOS ANÉIS (ciclo "Furo v2") — a partição do polígono quando o
   passo abre MAIS DE UM furo na mesma face. A borda anular de um anel só (a
   `bordaAnular` acima) é a volta simples entre um contorno e um anel; com dois
   anéis ela não existe, e foi exatamente isso que A-26 registrou.

   A REGRA, e por que ela é esta: triangular a região (contorno menos os anéis)
   SEM CRIAR VÉRTICE NENHUM. Nenhum ponto novo aparece no contorno, então
   nenhuma face vizinha da peça fica com um vértice no meio de uma aresta dela
   (junção em T, que é fenda de malha). Foi por isso que a partição por células
   (uma célula por furo, cortada pelos eixos radicais) foi RECUSADA: além da
   junção em T no contorno, o centro radical de três furos é um ponto que três
   células calculam por três contas diferentes, e costurar isso exige solda por
   tolerância — a régua que este núcleo já recusou no `arranja`.

   A saída é uma triangulação por PONTES e ORELHAS: cada anel é ligado ao
   polígono corrente pela ponte mais curta que não cruza nada (empate desfeito
   pelo menor índice, então é determinística), e o polígono simples resultante
   é cortado por orelhas. Contagem FECHADA, derivada de Euler e conferida:
   `n + M·L + 2M − 2` triângulos, com `n` cantos do contorno, `M` anéis de `L`
   lados. Como toda aresta de anel é aresta de BORDA da região, ela cai em
   EXATAMENTE um triângulo: é isso que dá ao anel `k` as suas `L` faces de
   borda, indexadas pela aresta `j → j+1` do anel, do mesmo jeito que no furo
   de um anel só. O que sobra é o PREENCHIMENTO, a superfície da face que não
   toca anel nenhum.

   Nada aqui é aceito no escuro: a saída passa por três provas antes de virar
   face — a soma das áreas bate com contorno menos anéis, toda aresta de borda
   é usada uma vez e toda aresta interna exatamente duas (em direções opostas),
   e cada anel tem as suas `L` faces. Falhar qualquer uma GRITA.

   DITO NA CARA: essas três provas são de ESTADO IMPOSSÍVEL, e não têm teste
   que as dispare — desligar qualquer uma delas não mata teste nenhum, e isso
   foi MEDIDO por mutação. Elas ficam porque o preço de uma partição errada é
   malha aberta plausível na foto, mas ninguém deve lê-las como promessa
   conferida: se uma disparar, o defeito é do núcleo, não do arquivo da peça.

   E JÁ DISPAROU UMA VEZ, o que vale mais que a frase acima: o flange do freio
   (tampa de 16 lados, 4 anéis de 12 a 90°) fazia a prova de área gritar. A
   causa era a orelha aceitar vértice EM CIMA de uma aresta sua — corrigido
   abaixo, com a família de simetrias em teste. A afirmação de que "não há
   entrada aceita que as faça falhar" era, na data em que foi escrita, falsa. */
function triangularComAneis(contorno, aneis, escala, ordem = aneis.map((_, k) => k), desvioDePonte = null) {
  const eps = 1e-12 * Math.max(1, escala * escala);
  const pts = [], tags = [];
  contorno.forEach((p, i) => { pts.push(p); tags.push({ tipo: 'contorno', i }); });
  const baseAnel = [];
  aneis.forEach((anel, k) => { baseAnel.push(pts.length); anel.forEach((p, j) => { pts.push(p); tags.push({ tipo: 'anel', k, j }); }); });

  let ciclo = contorno.map((_, i) => i);
  const pendentes = aneis.map((_, k) => k);
  /* `ordem` é a sequência de FUSÃO dos anéis, e não mexe em nada além disso: o
     anel `k` continua sendo o anel `k` na saída. O padrão é a ordem declarada
     pelo autor, que é a de sempre, byte por byte. */
  for (let etapaDaPonte = 0; etapaDaPonte < ordem.length; etapaDaPonte++) {
    const k = ordem[etapaDaPonte];
    const L = aneis[k].length;
    const noDoAnel = (m, j) => baseAnel[m] + ((j % aneis[m].length) + aneis[m].length) % aneis[m].length;
    /* arestas que a ponte não pode cruzar: o polígono corrente e todo anel
       ainda não fundido (inclusive o próprio, fora das duas incidentes) */
    const arestas = [];
    for (let t = 0; t < ciclo.length; t++) arestas.push([ciclo[t], ciclo[(t + 1) % ciclo.length]]);
    for (const m of pendentes) for (let j = 0; j < aneis[m].length; j++) arestas.push([noDoAnel(m, j), noDoAnel(m, j + 1)]);

    const candidatas = [];
    for (let p = 0; p < ciclo.length; p++) {
      for (let j = 0; j < L; j++) {
        const a = ciclo[p], b = noDoAnel(k, j);
        const A = pts[a], B = pts[b];
        const comp = Math.hypot(B[0] - A[0], B[1] - A[1]);
        let livre = true;
        for (const [x, y] of arestas) {
          if (x === a || y === a || x === b || y === b) continue;
          if (segmentosCruzam(A, B, pts[x], pts[y], eps)) { livre = false; break; }
        }
        if (livre) for (let v = 0; v < pts.length && livre; v++) { if (v !== a && v !== b && pontoNoSegmento(A, B, pts[v], eps)) livre = false; }
        if (livre) {
          const meio = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
          if (!(margemDentro(contorno, meio) > 0)) livre = false;
          for (const m of pendentes) if (livre && margemDentro(aneis[m], meio) > 0) livre = false;
        }
        if (livre) candidatas.push({ p, j, comp });
      }
    }
    candidatas.sort((x, y) => (x.comp - y.comp) || (x.p - y.p) || (x.j - y.j));
    const rank = desvioDePonte && desvioDePonte.etapa === etapaDaPonte ? desvioDePonte.rank : 0;
    const melhor = candidatas[rank];
    if (!melhor) return { erro: `não há ponte livre entre o contorno e o anel ${k} — os anéis não repartem a face` };
    const seq = [];
    for (let t = 0; t <= L; t++) seq.push(noDoAnel(k, melhor.j - t));   // o anel percorrido AO CONTRÁRIO: buraco é borda horária
    ciclo = [...ciclo.slice(0, melhor.p + 1), ...seq, ciclo[melhor.p], ...ciclo.slice(melhor.p + 1)];
    pendentes.splice(pendentes.indexOf(k), 1);
  }

  // ---- orelhas ----
  const tri = [];
  const c = ciclo.slice();
  while (c.length > 3) {
    let cortou = false;
    for (let i = 0; i < c.length; i++) {
      const a = c[(i + c.length - 1) % c.length], b = c[i], d = c[(i + 1) % c.length];
      if (a === d || a === b || b === d) continue;
      const A = pts[a], B = pts[b], D = pts[d];
      if (!(cruz2(A, B, D) > eps)) continue;
      let livre = true;
      for (const v of c) {
        if (v === a || v === b || v === d) continue;
        /* DENTRO não basta, e a diferença é o defeito que o flange do freio
           achou: um vértice EM CIMA de uma aresta da orelha não está DENTRO
           dela, mas separa a região em duas do mesmo jeito. Cortar assim
           engole a lasca do outro lado da aresta e deixa o resto do polígono
           com orientação invertida — e o erro só aparece lá adiante, na prova
           de área, sem dizer onde nasceu. Uma face de 16 lados com 4 anéis de
           12 a 90° põe três desses vértices em cima da aresta, por simetria:
           16, 12 e 4 são todos múltiplos de 4. */
        if (dentroEstrito(A, B, D, pts[v], eps)
          || pontoNoSegmento(A, B, pts[v], eps)
          || pontoNoSegmento(B, D, pts[v], eps)
          || pontoNoSegmento(D, A, pts[v], eps)) { livre = false; break; }
      }
      if (!livre) continue;
      tri.push([a, b, d]);
      c.splice(i, 1);
      cortou = true;
      break;
    }
    if (!cortou) return { erro: `a partição do polígono travou com ${c.length} cantos por cortar — nenhuma orelha livre` };
  }
  tri.push([c[0], c[1], c[2]]);

  // ---- as três provas ----
  const esperado = contorno.length + aneis.reduce((s, r) => s + r.length, 0) + 2 * aneis.length - 2;
  if (tri.length !== esperado) return { erro: `a partição saiu com ${tri.length} triângulo(s) e a contagem fechada é ${esperado}` };
  let area = 0;
  for (const [a, b, d] of tri) { const t = cruz2(pts[a], pts[b], pts[d]) / 2; if (!(t > 0)) return { erro: 'a partição criou um triângulo de área nula ou invertida' }; area += t; }
  const alvo = areaPoligono(contorno) - aneis.reduce((s, r) => s + areaPoligono(r), 0);
  if (Math.abs(area - alvo) > 1e-9 * Math.max(1, Math.abs(alvo))) return { erro: `a partição cobre ${area} de área e a região tem ${alvo}` };
  const conta = new Map();
  for (const [a, b, d] of tri) for (const [x, y] of [[a, b], [b, d], [d, a]]) conta.set(`${x}>${y}`, (conta.get(`${x}>${y}`) ?? 0) + 1);
  const borda = new Set();
  for (let i = 0; i < contorno.length; i++) borda.add(`${i}>${(i + 1) % contorno.length}`);
  aneis.forEach((anel, k) => { for (let j = 0; j < anel.length; j++) borda.add(`${baseAnel[k] + (j + 1) % anel.length}>${baseAnel[k] + j}`); });
  for (const [chave, n] of conta) {
    const [x, y] = chave.split('>');
    if (borda.has(chave)) { if (n !== 1) return { erro: `a aresta de borda ${chave} aparece ${n} vezes` }; continue; }
    if (n !== 1 || (conta.get(`${y}>${x}`) ?? 0) !== 1) return { erro: `a aresta interna ${chave} não é compartilhada por exatamente dois triângulos` };
  }
  for (const chave of borda) if ((conta.get(chave) ?? 0) !== 1) return { erro: `a aresta de borda ${chave} ficou sem triângulo` };

  // ---- famílias: uma borda por aresta de anel, o resto é preenchimento ----
  const bordas = aneis.map((anel) => new Array(anel.length).fill(null));
  const preenchimento = [];
  tri.forEach((t) => {
    const desc = { cantos: t.map((v) => tags[v]) };
    let dono = null;
    for (let e = 0; e < 3; e++) {
      const x = tags[t[e]], y = tags[t[(e + 1) % 3]];
      if (x.tipo === 'anel' && y.tipo === 'anel' && x.k === y.k && y.j === (x.j + aneis[x.k].length - 1) % aneis[x.k].length) { dono = { k: x.k, j: y.j }; break; }
    }
    if (dono) bordas[dono.k][dono.j] = desc; else preenchimento.push(desc);
  });
  for (let k = 0; k < bordas.length; k++) for (let j = 0; j < bordas[k].length; j++) if (!bordas[k][j]) return { erro: `a aresta ${j} do anel ${k} não caiu em triângulo nenhum` };
  return { bordas, preenchimento };
}

/* ----------------------------------------------------------------------------
   AS TRÊS ORDENS DE PONTE (A-30)

   `triangularComAneis` liga cada anel ao polígono corrente pela ponte mais
   curta que não cruza nada. Isso é determinístico, mas não é completo: a ordem
   em que os anéis são fundidos MUDA quais pontes ainda existem depois, e uma
   ordem pode travar onde outra fecha. Medido na varredura do A-30: com uma
   ordem só, 2 981 de 11 305 figuras válidas gritam — 1 em cada 4. Com as três
   ordens abaixo, 108.

   As três são FIXAS, nesta sequência, e a primeira que fecha vence. Não há
   quarta tentativa e não há aleatoriedade: a mesma entrada dá a mesma saída,
   hoje e daqui a um ano.

   1. a ordem ESCRITA pelo autor. É a de sempre, byte por byte. Enquanto ela
      fechar, nada nesta seção muda o resultado de peça nenhuma — é isso que
      `canon-linha-de-base.test.ts` cobra.
   2. o anel mais PERTO do contorno primeiro. Um anel encostado na borda é o
      que tem menos ponte livre disponível, então ele escolhe antes de os
      outros gastarem o espaço.
   3. o MENOR RAIO DECLARADO primeiro. Anel pequeno cabe em fresta que anel
      grande não alcança.

   Duas regras de chave que não são detalhe:

   - a distância é AO QUADRADO, sem `sqrt` e sem `Math.hypot`. A precisão de
     `Math.hypot` é definida pela implementação em ECMAScript, e chave de
     ordenação não pode depender de motor: a mesma peça sairia diferente em
     dois navegadores. Comparar quadrados dá a mesma ordem sem a raiz.
   - o raio é o número que o AUTOR ESCREVEU, resolvido por `st.num`. Nunca um
     raio recalculado da geometria, que traria erro de ponto flutuante para
     dentro da chave.

   Empate nas duas: pelo índice de declaração. */

/** distância AO QUADRADO do ponto `p` ao SEGMENTO a→b, em 2D. Sem raiz. */
function d2AoSegmento(p, a, b) {
  const abx = b[0] - a[0], aby = b[1] - a[1];
  const apx = p[0] - a[0], apy = p[1] - a[1];
  const l2 = abx * abx + aby * aby;
  if (l2 === 0) return apx * apx + apy * apy;
  let t = (apx * abx + apy * aby) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const dx = apx - abx * t, dy = apy - aby * t;
  return dx * dx + dy * dy;
}

/** as três ordens, na sequência fixa, já sem repetidas. */
function ordensDePonte(contorno, aneis, raios) {
  const declarada = aneis.map((_, k) => k);
  if (aneis.length < 2) return [declarada];

  const porChave = (chaveDe) => declarada
    .map((k) => ({ k, chave: chaveDe(k) }))
    .sort((x, y) => (x.chave - y.chave) || (x.k - y.k))
    .map((o) => o.k);

  const pertoDoContorno = porChave((k) => {
    let menor = Infinity;
    for (const ponto of aneis[k]) {
      for (let t = 0; t < contorno.length; t++) {
        const d2 = d2AoSegmento(ponto, contorno[t], contorno[(t + 1) % contorno.length]);
        if (d2 < menor) menor = d2;
      }
    }
    return menor;
  });

  /* sem raio declarado (o passo tem um raio só), esta ordem É a declarada. */
  const menorRaio = porChave((k) => (raios ? raios[k] : 0));

  const vistas = new Set(), fora = [];
  for (const ordem of [declarada, pertoDoContorno, menorRaio]) {
    const chave = ordem.join(',');
    if (vistas.has(chave)) continue;
    vistas.add(chave); fora.push(ordem);
  }
  return fora;
}

/**
 * Reparte a face tentando as três ordens. A primeira que fecha vence. Se
 * nenhuma fechar, devolve o erro da PRIMEIRA — a da ordem escrita pelo autor —
 * para a mensagem continuar falando da figura que ele escreveu, e não de uma
 * reordenação interna que ele nunca pediu.
 */
function particionar(contorno, aneis, escala, raios) {
  let primeiro = null;
  const ordens = ordensDePonte(contorno, aneis, raios);
  for (const ordem of ordens) {
    const r = triangularComAneis(contorno, aneis, escala, ordem);
    if (!r.erro) return r;
    if (!primeiro) primeiro = r;
  }
  /* A poda não era o único ponto guloso: a ponte mais curta pode fechar uma
     fresta que só outro anel alcançaria. Depois de preservar todas as escolhas
     históricas, tente UMA ponte alternativa por vez, nas oito próximas posições
     da ordem estável de candidatas. A árvore completa cresce exponencialmente;
     este orçamento fixo é explícito e determinístico. Se ele não bastar, o passo
     continua falhando fechado em vez de transformar uma peça em travamento. */
  for (const ordem of ordens) {
    for (let etapa = 0; etapa < ordem.length; etapa++) {
      for (let rank = 1; rank <= 8; rank++) {
        const r = triangularComAneis(contorno, aneis, escala, ordem, { etapa, rank });
        if (!r.erro) return r;
      }
    }
  }
  /* Só depois de esgotar todas as escolhas legadas e o orçamento explícito de
     pontes, use um triangulador completo. A guarda de entrada continua sendo
     nossa e a saída atravessa as mesmas provas antes de virar face. */
  const fallback = triangularComEarcut(contorno, aneis);
  return fallback.erro ? primeiro : fallback;
}

/* ----------------------------------------------------------------------------
   CONCORDÂNCIA (curva de perfil) — Ciclo 5 "Curva e filete v1". A alça de
   curva reservada no 3º elemento de um ponto 2D (perfil do lathe, contorno do
   loft, contornos do inflate) é um RAIO DE CONCORDÂNCIA (fillet): substitui a
   quina que aquele ponto faz entre o segmento anterior e o seguinte por um
   ARCO analítico tangente aos dois, no MESMO plano 2D do ponto.

   POR QUE ARCO (e não tangente solta, nem Bézier quadrática) — decidido por
   MEDIÇÃO, não por gosto, porque é o próprio crivo do gate (condição 2: "sai
   a menos de 1% do raio em toda amostra"): um arco de raio r é a ÚNICA das
   três formas em que TODO ponto amostrado fica a distância EXATAMENTE r do
   centro, por construção — o erro medido é só arredondamento de ponto
   flutuante (~1e-13), não erro de método. Uma Bézier quadrática *aproxima*
   um círculo mas não é um: o erro de raio cresce com o ângulo da curva, não
   dá pra prometer <1% em qualquer amostra sem medir caso a caso. Uma
   tangente sozinha não é uma curva, é só uma direção — não teria "raio" pra
   medir contra. E nenhuma trigonometria entra no FORMATO SALVO: o autor
   escreve só o número do raio (`[a, b, raio]` — "raio de concordância de
   8 mm" é a frase, sem seno nem cosseno); todo cos/sin fica dentro do
   núcleo, na hora de gerar a amostra.

   FORMATO: ponto = [a,b] (canto reto), [a,b,raio] (alça com a discretização
   do passo) ou [a,b,{raio,segmentos}] (alça com discretização local). `raio`
   e `segmentos` resolvem por `st.num`, então podem citar PARAM. `raio` 0 é
   reto — byte-idêntico ao comportamento sem alça. Forma, raio ou segmentos
   inválidos GRITAM e ABORTAM (fail-closed).

   SÓ FAZ SENTIDO num ponto com vizinho dos DOIS lados: num caminho ABERTO
   (perfil do lathe), a alça na PRIMEIRA ou na ÚLTIMA posição GRITA — não há
   segmento anterior/seguinte para concordar. Num polígono FECHADO (contorno
   do loft, contornos do inflate), todo ponto tem os dois vizinhos (o
   anterior e o seguinte ciclam), então qualquer ponto pode ter alça.

   DISCRETIZAÇÃO: `segmentosCurva` (PARAM, inteiro >=1, default 8) é o padrão
   DO PASSO. A forma objeto pode substituí-lo só naquele ponto. O número local
   é topológico: mudar a contagem pode renumerar o restante do passo.

   GEOMETRIA (ponto B com vizinhos A,C, coordenadas [x,y] resolvidas):
     u1 = norm(A-B), u2 = norm(C-B)            direções unitárias
     theta = ângulo(u1,u2)                     ângulo interno em B
     t = raio / tan(theta/2)                   distância de B às tangências
     TA = B + u1*t, TC = B + u2*t               pontos de tangência
     bis = norm(u1+u2)                          bissetriz interna
     centro = B + bis * (raio / sin(theta/2))
   O arco vai de TA a TC (o arco menor, do lado de B), amostrado em
   `segmentosCurva` sub-segmentos ⇒ `segmentosCurva+1` pontos, incluindo as
   duas pontas — TA exatamente no primeiro, TC exatamente no último. O ponto
   B ORIGINAL é SUBSTITUÍDO pela sequência do arco (nunca aparece na saída).

   VALIDAÇÃO (fail-closed — GRITA e ABORTA O PASSO, nunca escolhe sozinho):
   segmento adjacente de comprimento ~zero; ângulo ~0 ou ~π (degenerado —
   quina já reta, nada a arredondar); `t` não-finito, <=0, ou maior que o
   comprimento do PRÓPRIO segmento adjacente; e — checagem por SEGMENTO, não
   só por ponto — a SOMA dos `t` das duas concordâncias que dividem o mesmo
   segmento (uma de cada ponta) não pode passar do comprimento dele, senão
   as duas tangências se cruzariam em silêncio. */
function normalizar2(dx, dy) { const l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; }

function arcoDeConcordancia(A, B, C, raio) {
  const len1 = Math.hypot(A[0] - B[0], A[1] - B[1]);
  const len2 = Math.hypot(C[0] - B[0], C[1] - B[1]);
  if (!(len1 > 1e-9) || !(len2 > 1e-9)) return { erro: 'segmento adjacente de comprimento zero — sem direção pra tangenciar' };
  const u1 = normalizar2(A[0] - B[0], A[1] - B[1]);
  const u2 = normalizar2(C[0] - B[0], C[1] - B[1]);
  const cosT = Math.max(-1, Math.min(1, u1[0] * u2[0] + u1[1] * u2[1]));
  const theta = Math.acos(cosT);
  if (theta < 1e-6 || theta > Math.PI - 1e-6) return { erro: `ângulo degenerado (${(theta * 180 / Math.PI).toFixed(3)}°) — concordância não tem quina pra arredondar` };
  const t = raio / Math.tan(theta / 2);
  if (!(t > 0) || !Number.isFinite(t)) return { erro: `distância de tangência inválida (t=${t})` };
  if (t > len1 || t > len2) return { erro: `raio de concordância (${raio}) grande demais: a tangência (${t.toFixed(6)}) ultrapassa o segmento adjacente (mín ${Math.min(len1, len2).toFixed(6)})` };
  const bisLen = Math.hypot(u1[0] + u2[0], u1[1] + u2[1]);
  if (!(bisLen > 1e-9)) return { erro: 'bissetriz degenerada' };
  const bux = (u1[0] + u2[0]) / bisLen, buy = (u1[1] + u2[1]) / bisLen;
  const distCentro = raio / Math.sin(theta / 2);
  const centro = [B[0] + bux * distCentro, B[1] + buy * distCentro];
  const TA = [B[0] + u1[0] * t, B[1] + u1[1] * t];
  const TC = [B[0] + u2[0] * t, B[1] + u2[1] * t];
  return { t, TA, TC, centro, raio };
}

function resolverAlcaDeConcordancia(st, i, op, k, valor, segmentosPadrao) {
  const objeto = valor && typeof valor === 'object' && !Array.isArray(valor);
  if (!objeto) return { raio: st.num(valor), segmentos: segmentosPadrao };

  const chaves = Object.keys(valor);
  if (!Object.prototype.hasOwnProperty.call(valor, 'raio')) {
    /* Antes da forma objeto, qualquer objeto no terceiro elemento era valor
       dimensional inválido e lançava alto. Manter isso evita transformar uma
       peça inválida antiga em órfão macio só porque a sintaxe nova existe. */
    return { raio: st.num(valor), segmentos: segmentosPadrao };
  }
  const extras = chaves.filter((chave) => chave !== 'raio' && chave !== 'segmentos');
  if (extras.length) {
    grita(st, i, op, k, `forma da concordância no ponto ${k} tem chave(s) desconhecida(s): ${extras.join(', ')}; use {raio,segmentos}`);
    return { erro: true };
  }
  const raio = st.num(valor.raio);
  const segmentos = valor.segmentos == null ? segmentosPadrao : st.num(valor.segmentos);
  if (!Number.isSafeInteger(segmentos) || segmentos < 1) {
    grita(st, i, op, k, `segmentos da concordância no ponto ${k} precisa ser inteiro >= 1; recebido ${segmentos}`);
    return { erro: true };
  }
  if (segmentos > BLOCO) {
    grita(st, i, op, k, `segmentos da concordância no ponto ${k} (${segmentos}) estoura o orçamento de discretização (${BLOCO})`);
    return { erro: true };
  }
  return { raio, segmentos };
}

/* Expande uma lista de pontos 2D (cada um `[a,b]` ou `[a,b,raio]`) numa lista
   PLANA de `[a,b]` prontos para o algoritmo de cursor/faces existente — o
   lathe/loft/inflate continuam com EXATAMENTE o mesmo código de numeração de
   sempre, cego a se um ponto veio direto do autor ou de um arco. `fechado`
   diz se os vizinhos do primeiro/último ponto se ciclam (contorno/polígono)
   ou não (perfil aberto do lathe). Devolve `{pontos}` ou `{erro:true}` (já
   gritado) — nunca os dois; erro aborta o passo inteiro, sem construir nada
   (fail-closed, a mesma lei de todo ponto malformado no núcleo). */
function expandirConcordancias(st, i, op, pontosBrutos, { fechado, segmentosCurva }) {
  const n = pontosBrutos.length;
  const arcos = new Array(n).fill(null);
  for (let k = 0; k < n; k++) {
    const pt = pontosBrutos[k];
    const alca = pt.length === 3
      ? resolverAlcaDeConcordancia(st, i, op, k, pt[2], segmentosCurva)
      : { raio: 0, segmentos: segmentosCurva };
    if (alca.erro) return { erro: true };
    const { raio, segmentos } = alca;
    if (!(raio >= 0)) { grita(st, i, op, k, `raio de concordância negativo ou inválido (${raio}) no ponto ${k}`); return { erro: true }; }
    if (raio === 0) continue;
    const temVizinhos = fechado || (k > 0 && k < n - 1);
    if (!temVizinhos) { grita(st, i, op, k, `ponto ${k} tem raio de concordância mas é uma PONTA do caminho aberto (sem vizinho dos dois lados) — concordância só faz sentido num ponto interior`); return { erro: true }; }
    const A = fechado ? pontosBrutos[(k - 1 + n) % n] : pontosBrutos[k - 1];
    const C = fechado ? pontosBrutos[(k + 1) % n] : pontosBrutos[k + 1];
    const arco = arcoDeConcordancia(A, pt, C, raio);
    if (arco.erro) { grita(st, i, op, k, `concordância do ponto ${k}: ${arco.erro}`); return { erro: true }; }
    arcos[k] = { ...arco, segmentos };
  }
  // soma de `t` por SEGMENTO (concordâncias vizinhas não podem se sobrepor)
  const limite = fechado ? n : n - 1;
  for (let k = 0; k < limite; k++) {
    const k2 = (k + 1) % n;
    const segLen = Math.hypot(pontosBrutos[k2][0] - pontosBrutos[k][0], pontosBrutos[k2][1] - pontosBrutos[k][1]);
    const tA = arcos[k] ? arcos[k].t : 0, tB = arcos[k2] ? arcos[k2].t : 0;
    if (tA + tB > segLen + 1e-9) { grita(st, i, op, k, `concordâncias dos pontos ${k} e ${k2} disputam o mesmo segmento (${(tA + tB).toFixed(6)} > ${segLen.toFixed(6)}) — reduza os raios`); return { erro: true }; }
  }
  const pontos = [];
  for (let k = 0; k < n; k++) {
    const arco = arcos[k];
    if (!arco) { pontos.push([pontosBrutos[k][0], pontosBrutos[k][1]]); continue; }
    const angA = Math.atan2(arco.TA[1] - arco.centro[1], arco.TA[0] - arco.centro[0]);
    const angC = Math.atan2(arco.TC[1] - arco.centro[1], arco.TC[0] - arco.centro[0]);
    let delta = angC - angA;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    for (let s = 0; s <= arco.segmentos; s++) {
      const ang = angA + delta * (s / arco.segmentos);
      pontos.push([arco.centro[0] + Math.cos(ang) * arco.raio, arco.centro[1] + Math.sin(ang) * arco.raio]);
    }
  }
  return { pontos };
}

/* exportado (P7 do playground, D-120): o MANIFESTO de capacidades da Oficina
   sai daqui — `Object.keys(OPS)` é a lista de ops IMPLEMENTADAS de verdade,
   nunca precisa ser copiada à mão num doc que pode desatualizar. A bancada
   `criar.mjs` cruza isso contra a tabela da skill `criar-peca` e avisa se
   divergir (op no núcleo sem doc, ou doc citando op que não existe mais). */
const operacoesPrimitivasBasicas = criarOperacoesPrimitivasBasicas({ BLOCO, confereId, grita, resolverLados, addV, addF, registraOrigem });

const operacoesPrimitivasSuperficie = criarOperacoesPrimitivasSuperficie({ BLOCO, confereId, grita, resolverLados, addV, addF, registraOrigem, norm3, normalDaFace });

const operacoesEdicaoDireta = criarOperacoesEdicaoDireta({ baseDoPasso, grita, normalDaFace, addV, addF, colapsaCiclo, distintos, resolverSelecao });

const operacoesGeradoresAvancados = criarOperacoesGeradoresAvancados({ BLOCO, norm3, cross3, addV, addF, grita, registraOrigem, contratoFaixaLado, confereId, quadroLoft, transportaLoft, expandirConcordancias });
const operacoesTransformacoes = criarOperacoesTransformacoes({ FORMATO, BLOCO, baseDoPasso, norm3, indiceDeAxi, giraPonto, normalDaFace, ruido3, Face, addV, addF, grita, registraOrigem, origensIguais, CONTRATOS_ORIGEM, validarOrigem, textoDeclaracoes, resolverOrigem, resolverSelecao, resolverAlvosV, resolverAlvosF });
const operacoesEstruturais = criarOperacoesEstruturais({ BLOCO, baseDoPasso, norm3, resolverLados, indiceDeAxi, giraPonto, transformarInterfaceDaPorta, transformacoesDaOrigemDaPorta, Face, addV, addF, grita, nomeDeParteInvalido, registraOrigem, origensIguais, CONTRATOS_ORIGEM, validarOrigem, textoDeclaracoes, resolverOrigem, faceUnicaEstrutural, resolverAlvosV, poligonoPlano, convexoCCW, margemDentro, bordaAnular, aneisSeSobrepoem, particionar, operacoesEdicaoDireta, resolverInterfaceCilindricaDaPorta });
const operacoesAtributos = criarOperacoesAtributos({ FORMATO, Face, grita, nomeDeParteInvalido, temNomeDeParte, resolverAlvosF, neutroCanonico });

const OPS_IMPLEMENTADAS = {
  ...operacoesPrimitivasBasicas,
  ...operacoesPrimitivasSuperficie,
  /* ---- primitivas: criam vértices únicos + faces a partir da base do passo ---- */
  ...operacoesGeradoresAvancados,
  ...operacoesEstruturais,
  ...operacoesTransformacoes,
  ...operacoesAtributos,

};

/* Configuração explícita do módulo que preserva os nomes curtos das receitas.
   A lista é contrato do registro; o teste exige cobertura exata de `OPS`. */
const NOMES_DAS_OPERACOES = [
  'cubo', 'cilindro', 'esfera', 'cone', 'plano', 'chamferBox', 'lathe', 'loft',
  'inflate', 'publicarPorta', 'moveV', 'extruda', 'mescla', 'moveF', 'moveA',
  'vira', 'apagaFace', 'displace', 'encostar', 'transladar', 'rotaciona',
  'espelha', 'arranja', 'furo', 'arredondarAresta', 'filete', 'pincel',
  'solido', 'liso', 'material', 'parte', 'pesar',
];
export const OPS = Object.freeze(Object.fromEntries(NOMES_DAS_OPERACOES.map((nome) => [nome, OPS_IMPLEMENTADAS[nome]])));

const PRIMITIVAS = new Set(['cubo', 'cilindro', 'esfera', 'cone', 'plano', 'chamferBox', 'lathe', 'loft', 'inflate']);
const ATRIBUTOS = new Set(['pincel', 'solido', 'liso', 'material']);
function contratoDaOperacao(nome) {
  if (nome === 'publicarPorta') return { artefatos: { entra: [TIPO_MALHA_POLIGONAL], sai: ['mecanifica.porta@1'] }, efeitos: ['publica-porta'], identidade: 'declara-semantica' };
  if (nome === 'parte') return { artefatos: { entra: [TIPO_MALHA_POLIGONAL], sai: ['mecanifica.parte@1'] }, efeitos: ['nomeia-faces'], identidade: 'declara-semantica' };
  if (nome === 'pesar') return { artefatos: { entra: [TIPO_MALHA_POLIGONAL], sai: ['mecanifica.pesos@1'] }, efeitos: ['anota-pesos'], identidade: 'por-vertice' };
  if (PRIMITIVAS.has(nome)) return { artefatos: { entra: [], sai: [TIPO_MALHA_POLIGONAL] }, efeitos: ['cria-geometria'], identidade: 'cria-por-passo' };
  if (ATRIBUTOS.has(nome)) return { artefatos: { entra: [TIPO_MALHA_POLIGONAL], sai: [TIPO_MALHA_POLIGONAL] }, efeitos: ['anota-face'], identidade: 'preserva' };
  return { artefatos: { entra: [TIPO_MALHA_POLIGONAL], sai: [TIPO_MALHA_POLIGONAL] }, efeitos: ['transforma-malha'], identidade: 'preserva-ou-deriva' };
}

export const REGISTRO_OPERACOES = criarRegistroOperacoes({ modulos: [{
  id: 'mecanifica.motor.nucleo', versao: '1.0.0', requer: [],
  operacoes: NOMES_DAS_OPERACOES.map((nome) => ({
    id: `mecanifica.operacao.${nome}`, nome, versao: '1.0.0', categoria: 'procedural', executar: OPS[nome], ...contratoDaOperacao(nome),
  })),
}] });

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
/* Interface de porta de AUT-05. O Recorte A usava eixo/centro para MEDIR; o
   Recorte B admite `referencia` opcional, vetor perpendicular ao eixo que
   completa o quadro quando uma relação precisa derivar pose. `centro` é um
   ponto no eixo e `inicio`/`fim` são distâncias assinadas a partir dele. Não há
   matriz, Three.js, escolha por proximidade nem posição de passo: a porta só
   transporta dados declarados e o módulo neutro decide se o quadro é necessário. */
function resolverInterfaceAnularDaPorta(st, interfaceDeclarada) {
  const obrigatorias = ['forma', 'papel', 'eixo', 'centro', 'raioInterno', 'raioExterno', 'inicio', 'fim'];
  const aceitas = new Set([...obrigatorias, 'parte']);
  const extras = Object.keys(interfaceDeclarada).filter((chave) => !aceitas.has(chave));
  if (extras.length) return { erro: `interface tem chave(s) desconhecida(s): ${extras.sort().join(', ')}` };
  for (const chave of obrigatorias) if (!Object.hasOwn(interfaceDeclarada, chave)) return { erro: `interface exige '${chave}'` };
  if (interfaceDeclarada.papel !== 'recebe' && interfaceDeclarada.papel !== 'ocupa') {
    return { erro: "interface anel.papel precisa ser 'recebe' ou 'ocupa'" };
  }
  if (interfaceDeclarada.parte !== undefined && (typeof interfaceDeclarada.parte !== 'string' || !interfaceDeclarada.parte)) {
    return { erro: 'interface anel.parte precisa ser nome não vazio quando declarada' };
  }
  let eixo, centro, raioInterno, raioExterno, inicio, fim;
  try {
    eixo = st.vec(interfaceDeclarada.eixo);
    centro = st.vec(interfaceDeclarada.centro);
    raioInterno = st.num(interfaceDeclarada.raioInterno);
    raioExterno = st.num(interfaceDeclarada.raioExterno);
    inicio = st.num(interfaceDeclarada.inicio);
    fim = st.num(interfaceDeclarada.fim);
  } catch (erro) {
    return { erro: `interface anel inválida: ${erro.message}` };
  }
  const comprimento = Math.hypot(...eixo);
  if (!(comprimento > 0) || !Number.isFinite(comprimento)) return { erro: 'interface anel.eixo precisa ter comprimento finito > 0' };
  if (!(raioInterno >= 0) || !(raioExterno > raioInterno) || !Number.isFinite(raioExterno)) {
    return { erro: 'interface anel exige 0 <= raioInterno < raioExterno finitos' };
  }
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || !(fim > inicio)) {
    return { erro: 'interface anel.inicio e interface anel.fim precisam ser finitos, com fim > inicio' };
  }
  return {
    interface: {
      forma: 'anel', papel: interfaceDeclarada.papel, eixo: eixo.map((n) => n / comprimento), centro,
      raioInterno, raioExterno, inicio, fim,
      ...(interfaceDeclarada.parte === undefined ? {} : { parte: interfaceDeclarada.parte }),
    },
  };
}

function resolverInterfaceCilindricaDaPorta(st, interfaceDeclarada) {
  if (interfaceDeclarada === undefined) return { interface: undefined };
  if (!interfaceDeclarada || typeof interfaceDeclarada !== 'object' || Array.isArray(interfaceDeclarada)) {
    return { erro: 'interface precisa ser objeto {forma, papel, eixo, centro, raio, inicio, fim, referencia?}' };
  }
  if (interfaceDeclarada.forma === 'anel') return resolverInterfaceAnularDaPorta(st, interfaceDeclarada);
  const obrigatorias = ['forma', 'papel', 'eixo', 'centro', 'raio', 'inicio', 'fim'];
  const aceitas = new Set([...obrigatorias, 'referencia']);
  const extras = Object.keys(interfaceDeclarada).filter((chave) => !aceitas.has(chave));
  if (extras.length) return { erro: `interface tem chave(s) desconhecida(s): ${extras.sort().join(', ')}` };
  for (const chave of obrigatorias) if (!Object.hasOwn(interfaceDeclarada, chave)) return { erro: `interface exige '${chave}'` };
  if (interfaceDeclarada.forma !== 'cilindro') return { erro: "interface.forma só aceita 'cilindro' neste recorte" };
  if (interfaceDeclarada.papel !== 'externa' && interfaceDeclarada.papel !== 'interna') {
    return { erro: "interface.papel precisa ser 'externa' ou 'interna'" };
  }
  let eixo, centro, raio, inicio, fim, referencia;
  try {
    eixo = st.vec(interfaceDeclarada.eixo);
    centro = st.vec(interfaceDeclarada.centro);
    raio = st.num(interfaceDeclarada.raio);
    inicio = st.num(interfaceDeclarada.inicio);
    fim = st.num(interfaceDeclarada.fim);
    if (interfaceDeclarada.referencia !== undefined) referencia = st.vec(interfaceDeclarada.referencia);
  } catch (erro) {
    return { erro: `interface inválida: ${erro.message}` };
  }
  const comprimento = Math.hypot(...eixo);
  if (!(comprimento > 0) || !Number.isFinite(comprimento)) return { erro: 'interface.eixo precisa ter comprimento finito > 0' };
  if (!(raio > 0) || !Number.isFinite(raio)) return { erro: 'interface.raio precisa ser finito e > 0' };
  if (!Number.isFinite(inicio) || !Number.isFinite(fim) || !(fim > inicio)) {
    return { erro: 'interface.inicio e interface.fim precisam ser finitos, com fim > inicio' };
  }
  const eixoUnitario = eixo.map((n) => n / comprimento);
  if (referencia !== undefined) {
    const tamanhoReferencia = Math.hypot(...referencia);
    if (!(tamanhoReferencia > 0) || !Number.isFinite(tamanhoReferencia)) {
      return { erro: 'interface.referencia precisa ter comprimento finito > 0' };
    }
    const referenciaUnitaria = referencia.map((n) => n / tamanhoReferencia);
    const projecao = eixoUnitario.reduce((soma, n, indice) => soma + n * referenciaUnitaria[indice], 0);
    if (Math.abs(projecao) > 1e-9) return { erro: 'interface.referencia precisa ser perpendicular ao eixo' };
    referencia = referenciaUnitaria;
  }
  return {
    interface: {
      forma: 'cilindro',
      papel: interfaceDeclarada.papel,
      eixo: eixoUnitario,
      centro,
      raio,
      inicio,
      fim,
      ...(referencia === undefined ? {} : { referencia }),
    },
  };
}

function portasDoNucleo(portas) {
  const ids = [...portas.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  return new Map(ids.map((id) => {
    const porta = portas.get(id);
    const interfaceResolvida = porta.interface === undefined
      ? undefined
      : JSON.parse(JSON.stringify(porta.interface));
    const publicada = {
      de: JSON.parse(JSON.stringify(porta.de)),
      passo: porta.passo,
      ...(interfaceResolvida === undefined ? {} : { interface: interfaceResolvida }),
    };
    /* A forma histórica não ganha campo novo: artefatos antigos permanecem
       idênticos. A forma nova sempre expõe id e rótulo. */
    return [id, porta.id === undefined ? { nome: id, ...publicada } : {
      id: porta.id, rotulo: porta.rotulo, ...publicada,
    }];
  }));
}

/* ----------------------------------------------------------------------------
   NÚCLEO: roda a lista e devolve o NEUTRO em números. Não sabe desenhar.
   `dict` funde PARAMS e TOPO — os passos citam o NOME (raio: 'troncoR'), então
   trocar o valor reconstrói sem tocar em número nenhum da lista.
---------------------------------------------------------------------------- */
export function nucleo(PASSOS, PARAMS = {}, TOPO = {}, MATERIAIS = {}, ESQUELETO = null, ALIASES = [], OPCOES = {}) {
  const dict = { ...PARAMS, ...TOPO };
  const { num } = criarResolverNumerico(dict);
  /* ponto 3D SEMPRE: sem a guarda de aridade, `[0,1]` passava e o z virava
     `undefined` -> NaN calado; não-array estourava `a.map is not a function`
     (throw cru, sem diagnóstico). Rede CENTRAL — a op ainda valida por conta
     pra GRITAR dizendo QUAL seção/ponto errou (a lei do lathe, D-115). */
  /* PONTO NOMEADO (atrito A-8, otimização O-9). Até aqui só se nomeava escalar,
     e o preço estava medido: 18 dos 61 parâmetros do freio existiam só para
     nomear 6 pontos do caminho da mangueira — três nomes por ponto, e o ponto
     em si sem nome nenhum. Não dava para dizer "o apoio da pinça"; dava para
     dizer "apoioX, apoioY, apoioZ", que é a mesma coisa escrita três vezes e
     alterável em duas por engano.

     Um nome pode agora guardar o ponto inteiro. O valor nomeado é uma lista de
     três componentes, e cada componente continua passando por `num` — então
     PARAM dentro de ponto nomeado, expressão e TOPO seguem valendo, sem regra
     nova. Um ponto nomeado NÃO pode citar outro ponto nomeado: um nível é o que
     resolve o atrito, e a recursão traria ciclo para dentro da rede central. */
  const vec = (a) => {
    if (typeof a === 'string') {
      if (!Object.hasOwn(dict, a)) {
        throw new Error(`oficina: ponto '${a}' não está em PARAMS nem em TOPO; um ponto nomeado precisa existir no dicionário da peça`);
      }
      const valor = dict[a];
      if (!Array.isArray(valor) || valor.length !== 3) {
        throw new Error(`oficina: '${a}' foi citado como ponto, mas guarda ${JSON.stringify(valor)}; ponto nomeado guarda [x,y,z] (3 componentes)`);
      }
      if (valor.some((c) => typeof c === 'string' && Object.hasOwn(dict, c) && Array.isArray(dict[c]))) {
        throw new Error(`oficina: o ponto nomeado '${a}' cita outro ponto nomeado como componente; um componente é escalar (número, nome de escalar ou expressão)`);
      }
      return valor.map(num);
    }
    if (!Array.isArray(a) || a.length !== 3) throw new Error(`oficina: ponto precisa ser [x,y,z] (3 elementos) ou o nome de um ponto declarado; recebido ${JSON.stringify(a)}`);
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
  const st = { V: new Map(), F: new Map(), orfaos: orfaosIniciais, merges: [], partes: {}, paisDasPartes: new Map(), origens: new Map(), portas: new Map(), declaracoesOrigem, aliases, dict, num, vec, materiais: MATERIAIS, esqueleto, ossoSet, pesos: new Map(), parteAtribuidaEm: new Map(), consumidas: new Map(), procedencia: criarEstadoDeProcedencia() };

  PASSOS.forEach((passo, i) => {
    const [op, args = {}] = passo;
    const registro = OPCOES.registroOperacoes ?? REGISTRO_OPERACOES;
    if (!registro || typeof registro.resolver !== 'function') throw new Error('oficina: registro de operações inválido');
    const registrada = registro.resolver(op);
    if (!registrada) { grita(st, i, op, null, `operação desconhecida '${op}'`); return; }
    const fn = registrada.executar;
    /* POSE DE CRIAÇÃO (A-4/O-7): `em` e `eixo` são lidos AQUI, no despacho, e
       não dentro de cada gerador. Oito geradores implementando a mesma
       translação seriam oito chances de divergir de sinal ou de ordem; o
       despacho aplica a MESMA transformação rígida sobre os vértices que o
       passo acabou de criar, seja qual for o gerador. */
    const antesV = new Map([...st.V].map(([id, p]) => [id, JSON.stringify(p)]));
    const antesF = new Map([...st.F].map(([id, f]) => [id, JSON.stringify(f)]));
    const antesPortas = new Set(st.portas.keys()), antesPartes = new Set(Object.keys(st.partes));
    const pose = lerPoseDeCriacao(st, i, op, args);
    if (pose === undefined) return;          // inválida: já gritou, nada construído
    const antes = pose ? new Set(st.V.keys()) : null;
    if (fn.nativaMecanifica) { try { const contexto = contextoNativo(st, i); fn(contexto, args); contexto.publicar(); } catch (erro) { grita(st, i, op, null, `extensão nativa recusou: ${erro.message}`); return; } }
    else fn(st, args, i);
    if (pose) aplicarPoseDeCriacao(st, antes, pose);
    const mudou = (antes, depois) => [...depois].filter(([id, valor]) => antes.get(id) !== JSON.stringify(valor)).map(([id]) => id).sort((a, b) => typeof a === 'number' ? a - b : a < b ? -1 : a > b ? 1 : 0);
    registrarProcedencia(st.procedencia, {
      passo: i, operacao: registrada.id,
      saidas: {
        vertices: mudou(antesV, st.V), faces: mudou(antesF, st.F),
        portas: [...st.portas.keys()].filter((id) => !antesPortas.has(id)).sort(),
        partes: Object.keys(st.partes).filter((id) => !antesPartes.has(id)).sort(),
      },
    });
  });
  aplicarHierarquiaDasPartes(st);

  /* `materiais` faz parte do estado neutro: a face só guarda o NOME, mas uma
     revisão sem o dicionário não conseguiria dizer se uma alteração de cor ou
     aspereza mudou a peça. O núcleo continua sem saber de renderizador; ele
     apenas preserva a declaração já usada pela op `material`. */
  const neutro = { V: st.V, F: st.F, orfaos: st.orfaos, merges: st.merges, partes: st.partes, esqueleto: st.esqueleto, pesos: st.pesos, portas: portasDoNucleo(st.portas), materiais: st.materiais };
  return { ...neutro, artefato: artefatoDaMalha(neutro), procedencia: procedenciaCanonica(st.procedencia) };
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
