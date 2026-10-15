/* solido-do-esboco.js — o sólido exato de uma forma do esboço, em milímetro, como volume que a Manifold subtrai e interseta.
 *
 * O andaime do nível zero (`tradutor-nivel-zero.js`) perde o que o esboço tem: o recorte (a N2 não subtrai), a inclinação do sólido (a N2
 * não gira em dois eixos), a cavidade da casca do loft e a malha de família, que vira casco convexo. Aqui a forma volta inteira. Cada
 * forma de `formasResolvidas` (`mecanifica.formas-resolvidas@1`, dado puro) vira o sólido que o esboço desenha: a geometria do tipo
 * dela no quadro local, girada pela `matriz` e posta no `centro`, com os moldes de `subtrai` tirados. Quem confere uma peça contra o
 * esboço (`forma-do-esboco.js`) mede a sobreposição de volume entre a malha da parte e este sólido.
 *
 * O QUE VEM DO TRADUTOR. A geometria de caixa (com raio ou chanfro), cilindro (achatado), anel, cone, esfera, revolução, extrusão e tubo
 * é a que `tradutor-nivel-zero.js` já converte para a N2 com os mesmos lados do esboço (`volumeLocalDaForma`, com a matriz identidade),
 * e a malha vem da blocagem N2 do volume. O que a N2 muda na forma não entra. O loft sem inclinação, sem seção ponto e sem casca fica
 * como o tradutor o põe, a superfície de cada ponto ao ponto correspondente da seguinte (a que o esboço desenha e a que o `loft` do núcleo
 * faz); o que tem seção inclinada, seção ponto ou casca sai das seções do esboço, uma faixa por par (o casco convexo dos pontos das duas,
 * com a seção inclinada e a cavidade da casca tirada do externo). A forma de família sai da malha que o provedor entrega, uma parte de
 * cada vez (o aro e o pneu se sobrepõem, e a união de sólidos fechados é definida onde a malha das duas juntas não é). A caixa com furo é
 * a caixa menos os cilindros do furo, e o tubo com canto sem raio de curva é a união de um tubo por trecho e uma esfera por junta. A faixa
 * (`envolve`) não tem sólido ainda e é recusada com o motivo.
 *
 * O RECORTE. `geometria.recorte.cortadores` lista os moldes que a forma subtrai, cada um uma forma da mesma opção (visível ou
 * `cortador`), com a mesma leitura de `recorte.js` do esboço: `folga` engrossa o molde deslocando cada face dele para fora (em canto
 * vivo o vão passa de `folga`), peça convexa por peça convexa, e `profundidade` com `lado` deixa do molde só a fatia que entra
 * `profundidade` mm na forma a partir da face dela nesse lado. A folga só vale para molde convexo ou loft, e o molde que não é nenhum
 * dos dois é recusado.
 *
 * UNIDADES E PRECISÃO. Milímetro, no quadro do esboço. A Manifold trabalha em Float32, e por isso as coordenadas entram relativas a uma
 * `origem` que o chamador escolhe (o centro do que vai medir) e voltam somadas a ela; o erro fica em décimos de micrômetro por metro.
 * Determinístico: as mesmas formas dão os mesmos sólidos.
 *
 * Quem cria um contexto (`criarContextoDeSolidos`) precisa chamar `liberar()` ao fim: os sólidos vivem na memória do WebAssembly. */
import earcut from 'earcut';
import { erroDaCargaDaManifold, manifoldCarregada } from '../../procedural/nucleo/manifold.js';
import { ErroFormaGlobal } from './base-forma-global.js';
import { FORMATO_ANDAIME_GLOBAL, normalizarAndaimeGlobal } from './forma-global.js';
import { compilarAndaime } from './medir-blocagem-nivel-zero.js';
import { ErroDoTradutor, FORMATO_FORMAS_RESOLVIDAS, volumeLocalDaForma } from './tradutor-nivel-zero.js';

export class ErroDoSolido extends Error {
  constructor(mensagem, codigo = 'solido-invalido', forma = null) {
    super(mensagem);
    this.name = 'ErroDoSolido';
    this.codigo = codigo;
    this.forma = forma;
  }
}

const EIXOS = ['x', 'y', 'z'];
const LADOS = Object.freeze({ '+x': [1, 0, 0], '-x': [-1, 0, 0], '+y': [0, 1, 0], '-y': [0, -1, 0], '+z': [0, 0, 1], '-z': [0, 0, -1] });
const LADOS_DO_FURO = 128;
const LADOS_DA_ESFERA = 40;
const LADOS_DO_TUBO = 48;
/* O molde do furo de caixa passa da altura por esta folga, de cada lado, para a face não ficar coplanar com a da caixa. */
const SOBRA_DO_FURO_MM = 1;
/* A cavidade da casca passa da boca do loft por esta distância, pelo mesmo motivo. */
const SOBRA_DA_CAVIDADE_MM = 1;
const ESPESSURA_MINIMA_MM = 1e-9;
const VOLUME_MINIMO_MM3 = 1e-9;
const SOLDA_MM = 1e-4;
/* Código de aproximação do tradutor que não muda o sólido do esboço (só o tipo da forma na N2). */
const APROXIMACOES_EXATAS = new Set(['caixa-com-raio-como-extrusao', 'caixa-com-chanfro-como-casco', 'cilindro-achatado-como-extrusao']);

const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const ponto = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const aplicar = (m, p) => [ponto(m[0], p), ponto(m[1], p), ponto(m[2], p)];
const determinante = (m) => ponto(m[0], cruz(m[1], m[2]));
const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/* ---------- malhas: sentido, solda e triangulação ---------- */

/* O volume com sinal de uma malha de triângulos (teorema da divergência): positivo quando as faces olham para fora. */
export function volumeAssinado(vertices, triangulos) {
  let v = 0;
  for (const [a, b, c] of triangulos) v += ponto(vertices[a], cruz(vertices[b], vertices[c])) / 6;
  return v;
}

/* Funde os vértices a menos de `tolerancia`, tira o triângulo que ficou sem área e o vértice que nenhum triângulo usa. Os índices voltam
   compactos, na ordem em que os vértices aparecem nos triângulos. */
export function soldarMalha(vertices, triangulos, tolerancia = SOLDA_MM) {
  const indice = new Map();
  const saida = [];
  const novo = (i) => {
    const p = vertices[i];
    const chave = p.map((c) => Math.round(c / tolerancia)).join(',');
    if (!indice.has(chave)) { indice.set(chave, saida.length); saida.push(p); }
    return indice.get(chave);
  };
  const soldados = [];
  for (const [a, b, c] of triangulos) {
    const t = [novo(a), novo(b), novo(c)];
    if (t[0] !== t[1] && t[1] !== t[2] && t[0] !== t[2]) soldados.push(t);
  }
  const compacto = new Map();
  const vertices2 = [];
  const triangulos2 = soldados.map((t) => t.map((i) => {
    if (!compacto.has(i)) { compacto.set(i, vertices2.length); vertices2.push(saida[i]); }
    return compacto.get(i);
  }));
  return { vertices: vertices2, triangulos: triangulos2 };
}

/* Os polígonos planos (3 ou mais índices, anti-horários vistos de fora) em triângulos com o mesmo sentido. O polígono convexo vira o
   leque do primeiro vértice, que é como o módulo do esboço lê o volume de uma malha, e o côncavo é triangulado por orelhas (`earcut`) no
   plano da normal dele; cada triângulo sai virado para o lado da normal. */
export function triangularPoligonos(vertices, poligonos) {
  const saida = [];
  for (const poligono of poligonos) {
    if (poligono.length === 3) { saida.push([poligono[0], poligono[1], poligono[2]]); continue; }
    const pts = poligono.map((i) => vertices[i]);
    const normal = [0, 0, 0];
    pts.forEach((a, i) => {
      const b = pts[(i + 1) % pts.length];
      normal[0] += (a[1] - b[1]) * (a[2] + b[2]);
      normal[1] += (a[2] - b[2]) * (a[0] + b[0]);
      normal[2] += (a[0] - b[0]) * (a[1] + b[1]);
    });
    const convexo = pts.every((a, i) => {
      const b = pts[(i + 1) % pts.length];
      const c = pts[(i + 2) % pts.length];
      return ponto(cruz(sub(b, a), sub(c, b)), normal) >= -1e-9 * Math.hypot(...normal) * Math.hypot(...sub(b, a)) * Math.hypot(...sub(c, b));
    });
    if (convexo) {
      for (let k = 1; k + 1 < poligono.length; k++) saida.push([poligono[0], poligono[k], poligono[k + 1]]);
      continue;
    }
    const eixo = [0, 1, 2].reduce((m, k) => (Math.abs(normal[k]) > Math.abs(normal[m]) ? k : m), 0);
    const [p, q] = [[1, 2], [0, 2], [0, 1]][eixo];
    const indices = earcut(pts.flatMap((a) => [a[p], a[q]]), null, 2);
    if (indices.length < 3) {
      for (let k = 1; k + 1 < poligono.length; k++) saida.push([poligono[0], poligono[k], poligono[k + 1]]);
      continue;
    }
    for (let t = 0; t < indices.length; t += 3) {
      const tri = [poligono[indices[t]], poligono[indices[t + 1]], poligono[indices[t + 2]]];
      const para = ponto(cruz(sub(vertices[tri[1]], vertices[tri[0]]), sub(vertices[tri[2]], vertices[tri[0]])), normal);
      saida.push(para >= 0 ? tri : [tri[0], tri[2], tri[1]]);
    }
  }
  return saida;
}

/* ---------- o contexto da Manifold ---------- */

/** O contexto em que os sólidos são criados. `origem` (mm) é subtraída de toda coordenada que entra na Manifold. Todo sólido criado
 *  por ele é liberado em `liberar()`. */
export function criarContextoDeSolidos({ origem = [0, 0, 0] } = {}) {
  const wasm = manifoldCarregada();
  if (!wasm) throw new ErroDoSolido(`a Manifold não carregou: ${erroDaCargaDaManifold()?.message ?? 'sem causa registrada'}`, 'manifold-ausente');
  const M = wasm.Manifold;
  const vivos = [];
  const registrar = (m) => { vivos.push(m); return m; };
  const local = (p) => [p[0] - origem[0], p[1] - origem[1], p[2] - origem[2]];

  const contexto = {
    wasm, origem,
    registrar,
    liberar() { while (vivos.length) { try { vivos.pop().delete(); } catch { /* já liberado */ } } },
    volume: (m) => (m.isEmpty() ? 0 : m.volume()),

    /** O sólido de uma malha de triângulos (vértices em mm, anti-horários vistos de fora; a malha ao contrário é virada). `onde` é o
     *  sintagma que nomeia a malha nas recusas ("a malha da parte 'viga'"). */
    daMalha(vertices, triangulos, onde) {
      const area = volumeAssinado(vertices, triangulos);
      if (!(Math.abs(area) > VOLUME_MINIMO_MM3)) throw new ErroDoSolido(`${onde} não tem volume`, 'malha-sem-volume');
      const tris = area < 0 ? triangulos.map(([a, b, c]) => [a, c, b]) : triangulos;
      const props = new Float32Array(vertices.length * 3);
      vertices.forEach((p, i) => props.set(local(p), 3 * i));
      const montar = (fundir) => {
        const malha = new wasm.Mesh({ numProp: 3, vertProperties: props, triVerts: Uint32Array.from(tris.flat()) });
        if (fundir) malha.merge();
        return new M(malha);
      };
      /* a Manifold recusa a malha que não fecha de duas maneiras: o construtor lança, ou o sólido volta com um estado de erro; a segunda
         tentativa funde os vértices coincidentes, que a malha com vértices repetidos precisa */
      let m = null;
      let estado = 'NotManifold';
      for (const fundir of [false, true]) {
        try {
          m = montar(fundir);
          estado = m.status();
        } catch (erro) {
          m = null;
          estado = erro?.message ?? String(erro);
        }
        if (m && estado === 'NoError') break;
        m?.delete();
        m = null;
      }
      if (!m || m.isEmpty()) throw new ErroDoSolido(`${onde} não forma um sólido fechado e orientado (Manifold: ${estado})`, 'malha-aberta');
      return registrar(m);
    },

    /** O casco convexo de uma nuvem de pontos (mm). */
    casco(pontos, onde = 'casco') {
      const m = registrar(M.hull(pontos.map(local)));
      if (m.isEmpty() || !(m.volume() > VOLUME_MINIMO_MM3)) throw new ErroDoSolido(`${onde}: os pontos não formam um sólido`, 'casco-vazio');
      return m;
    },

    uniao: (lista) => (lista.length === 1 ? lista[0] : registrar(M.union(lista))),
    diferenca: (lista) => registrar(M.difference(lista)),
    intersecao: (lista) => registrar(M.intersection(lista)),
    cubo: (lado, centro) => registrar(M.cube([lado, lado, lado], true).translate(local(centro))),
    aparar: (m, normal, deslocamento) => registrar(m.trimByPlane(normal, deslocamento)),

    /** A caixa do sólido, em mm. */
    caixa(m) {
      const { min, max } = m.boundingBox();
      return { min: soma(min, origem), max: soma(max, origem) };
    },
    /** Os triângulos do sólido, com os vértices em mm. */
    malha(m) {
      const { vertProperties, triVerts, numProp } = m.getMesh();
      const vertices = [];
      for (let i = 0; i < vertProperties.length; i += numProp) vertices.push(soma([vertProperties[i], vertProperties[i + 1], vertProperties[i + 2]], origem));
      const triangulos = [];
      for (let i = 0; i < triVerts.length; i += 3) triangulos.push([triVerts[i], triVerts[i + 1], triVerts[i + 2]]);
      return { vertices, triangulos };
    },
  };
  return contexto;
}

/* ---------- a geometria do tipo, no quadro local ---------- */

const CABECALHO_DO_ANDAIME = Object.freeze({
  formato: FORMATO_ANDAIME_GLOBAL, id: 'solido-do-esboco', objetivo: 'solido-do-esboco', alvo: 'solido-do-esboco', familia: 'peca-mecanica',
  intencao: 'compilar o sólido de uma forma do esboço', unidade: 'mm', eixos: { direita: '+x', cima: '+y', frente: '+z' },
  envelope: { min: [0, 0, 0], max: [1, 1, 1] }, landmarks: [{ id: 'origem', posicao: [0, 0, 0] }],
});

/* A malha, em milímetro, de um volume da N2 (sem id, com `centro` próprio), pela blocagem que a N2 compilaria para ele. A N2 é quem decide
   se o volume vale (lados, perfil simples, raio de curva...), e o que ela recusa volta como `ErroDoSolido` de código `n2-recusa`. */
function malhaDoVolumeN2(volume, forma) {
  let blocagem;
  try {
    blocagem = compilarAndaime(normalizarAndaimeGlobal({ ...CABECALHO_DO_ANDAIME, volumes: [{ id: 'volume', regioes: ['sem-regiao'], ...volume }] }));
  } catch (e) {
    if (e instanceof ErroFormaGlobal) throw new ErroDoSolido(`forma "${forma.id}" (${forma.tipo}): a N2 recusa o volume: ${e.message}`, 'n2-recusa', forma.id);
    throw e;
  }
  const { malha, volumes } = blocagem;
  const { inicioVertice, quantidadeVertices } = volumes[0];
  const vertices = malha.vertices.slice(inicioVertice, inicioVertice + quantidadeVertices).map((p) => [...p]);
  const triangulos = malha.faces.map((f) => f.vertices.map((i) => i - inicioVertice));
  return { vertices, triangulos };
}

/* Gira e põe no lugar: mundo = centro + matriz · local. A matriz com determinante negativo (o espelho) vira a malha do avesso, e os
   triângulos trocam de sentido para a normal continuar saindo. */
function paraOMundo(malha, { matriz, centro }, girar = true) {
  const vertices = malha.vertices.map((p) => soma(centro, girar ? aplicar(matriz, p) : p));
  const espelhada = girar && determinante(matriz) < 0;
  return { vertices, triangulos: espelhada ? malha.triangulos.map(([a, b, c]) => [a, c, b]) : malha.triangulos };
}

const indiceDoEixo = (nome) => EIXOS.indexOf(nome);

/* O ponto (u, v, w) de uma seção de loft no quadro local: o eixo da forma leva `w` e os do perfil levam `u` e `v`. A seção inclinada traz
   o `w` de cada ponto como terceiro valor. */
function pontoDaSecao(g, secao, q) {
  const p = [0, 0, 0];
  p[indiceDoEixo(g.eixosDoPerfil[0])] = q[0];
  p[indiceDoEixo(g.eixosDoPerfil[1])] = q[1];
  p[indiceDoEixo(g.eixo)] = q.length > 2 ? q[2] : secao.w;
  return p;
}

function unicos(pontos) {
  const vistos = new Set();
  return pontos.filter((p) => {
    const chave = p.map((c) => Math.round(c * 1e6)).join(',');
    if (vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });
}

/* O sólido de uma lista de seções de loft: uma peça convexa por faixa entre duas seções consecutivas, o casco dos pontos das duas, como o
   esboço desenha (e como a faixa torcida de uma seção inclinada fica convexa). A faixa de espessura nula, o degrau, não tem volume. */
function pecasDeSecoes(contexto, g, forma, secoes, mundo, onde) {
  const pecas = [];
  for (let k = 0; k + 1 < secoes.length; k++) {
    const a = secoes[k];
    const b = secoes[k + 1];
    if (b.w - a.w <= ESPESSURA_MINIMA_MM) continue;
    const pts = unicos([...a.perfil.map((q) => mundo(pontoDaSecao(g, a, q))), ...b.perfil.map((q) => mundo(pontoDaSecao(g, b, q)))]);
    try {
      pecas.push(contexto.casco(pts, `${onde}, faixa ${k + 1}`));
    } catch (e) {
      if (!(e instanceof ErroDoSolido) || e.codigo !== 'casco-vazio') throw e;
    }
  }
  if (pecas.length === 0) throw new ErroDoSolido(`${onde}: o loft não tem faixa com volume`, 'loft-sem-volume', forma.id);
  return pecas;
}

/* O loft sem inclinação, sem seção ponto e sem casca como o tradutor o põe na N2 (`casco-secoes`: a superfície entre as seções é a de
   cada ponto ao ponto correspondente da seguinte, que é o que o esboço desenha e o que a receita faz com `loft`), ou `null` quando a N2
   muda a forma ou recusa o volume. */
function loftReglado(contexto, forma) {
  let traduzida;
  try {
    traduzida = volumeLocalDaForma(forma);
  } catch (e) {
    if (e instanceof ErroDoTradutor) return null;
    throw e;
  }
  if (traduzida.volume.tipo !== 'casco-secoes' || (traduzida.aproximacao?.perdido ?? []).length > 0) return null;
  let malha;
  try {
    malha = malhaDoVolumeN2({ centro: [0, 0, 0], ...traduzida.volume }, forma);
  } catch (e) {
    if (e instanceof ErroDoSolido && e.codigo === 'n2-recusa') return null;
    throw e;
  }
  const mundo = paraOMundo(malha, forma.geometria);
  return contexto.daMalha(mundo.vertices, mundo.triangulos, `a malha da forma "${forma.id}" (loft)`);
}

function solidoDoLoft(contexto, forma) {
  const g = forma.geometria;
  const onde = `forma "${forma.id}" (loft)`;
  if (!Array.isArray(g.secoes) || g.secoes.length < 2) throw new ErroDoSolido(`${onde}: o loft não traz as seções`, 'loft-sem-secoes', forma.id);
  const mundo = (p) => soma(g.centro, aplicar(g.matriz, p));
  /* as peças convexas, uma por faixa (o casco dos pontos das duas seções), que a folga de um molde engrossa uma a uma e que o loft de seção
     inclinada, de seção ponto ou com casca usa inteiras; o loft `suave` traz as estações da curva, e o desenho passa por elas */
  let convexas = null;
  const pecas = () => { convexas ??= pecasDeSecoes(contexto, g, forma, g.estacoes ?? g.secoes, mundo, onde); return convexas; };
  if (!g.casca) {
    const reglado = loftReglado(contexto, forma);
    if (reglado) return { m: reglado, pecas };
  }
  const externo = contexto.uniao(pecas());
  if (!g.casca) return { m: externo, pecas };
  /* a casca é o sólido externo menos a cavidade (as seções da parede de dentro), e a cavidade passa da boca para a abertura ficar aberta */
  const cavidade = g.casca.cavidade;
  const aberta = g.casca.aberta === 'inicio' ? cavidade[0] : cavidade[cavidade.length - 1];
  const sinal = g.casca.aberta === 'inicio' ? -1 : 1;
  const prolongada = { ...aberta, w: aberta.w + sinal * SOBRA_DA_CAVIDADE_MM, perfil: aberta.perfil.map((q) => (q.length > 2 ? [q[0], q[1], q[2] + sinal * SOBRA_DA_CAVIDADE_MM] : [q[0], q[1]])) };
  const secoesDaCavidade = g.casca.aberta === 'inicio' ? [prolongada, ...cavidade] : [...cavidade, prolongada];
  const vazio = contexto.uniao(pecasDeSecoes(contexto, g, forma, secoesDaCavidade, mundo, `${onde}, cavidade`));
  return { m: contexto.diferenca([externo, vazio]), pecas: null };
}

/* A forma de família: a malha que o provedor entrega, uma parte por vez. `malhaDaFamilia(forma)` devolve `{ vertices, faces, partes }`
   com os vértices relativos ao centro da caixa dela e as faces anti-horárias vistas de fora (a `Malha` do módulo do esboço); o sólido é
   essa malha girada pela matriz da forma e posta no centro dela. */
function solidoDaFamilia(contexto, forma, malhaDaFamilia) {
  const onde = `forma "${forma.id}" (família ${forma.geometria.familia})`;
  if (typeof malhaDaFamilia !== 'function') {
    throw new ErroDoSolido(`${onde}: a forma é de família e esta leitura não recebeu o provedor da malha dela`, 'familia-sem-provedor', forma.id);
  }
  const malha = malhaDaFamilia(forma);
  const grupos = (malha.partes?.length ? malha.partes : [{ nome: null, de: 0, ate: malha.faces.length }]);
  const pecas = grupos.map((parte) => {
    const faces = malha.faces.slice(parte.de, parte.ate);
    const triangulos = triangularPoligonos(malha.vertices, faces);
    const mundo = paraOMundo({ vertices: malha.vertices, triangulos }, forma.geometria);
    const soldada = soldarMalha(mundo.vertices, mundo.triangulos);
    return contexto.daMalha(soldada.vertices, soldada.triangulos, `a malha ${parte.nome ? `da parte "${parte.nome}" ` : ''}da forma "${forma.id}" (família ${forma.geometria.familia})`);
  });
  return { m: contexto.uniao(pecas), pecas: null };
}

/* O tubo com canto sem raio de curva: o esboço põe uma esfera na junta, e o sólido é um tubo por trecho e uma esfera por junta. */
function solidoDoTuboComCantoVivo(contexto, forma) {
  const g = forma.geometria;
  const relativo = g.caminho.map((q) => sub(q, g.centro));
  const raio = g.diametro / 2;
  const partes = [];
  for (let i = 0; i + 1 < relativo.length; i++) {
    partes.push(malhaDoVolumeN2({ tipo: 'tubo', centro: [0, 0, 0], caminho: [relativo[i], relativo[i + 1]], raio, raioCurva: 0, segmentos: LADOS_DO_TUBO }, forma));
  }
  for (let i = 1; i + 1 < relativo.length; i++) partes.push(malhaDoVolumeN2({ tipo: 'esfera', centro: relativo[i], raio, segmentos: LADOS_DA_ESFERA }, forma));
  const solidos = partes.map((p, k) => {
    const mundo = paraOMundo(p, g, false);
    return contexto.daMalha(mundo.vertices, mundo.triangulos, `a malha da peça ${k + 1} da forma "${forma.id}" (tubo)`);
  });
  return { m: contexto.uniao(solidos), pecas: null };
}

/* A caixa com furo passante: a caixa inteira menos um cilindro por furo, no eixo da altura (y local). */
function solidoDaCaixaComFuro(contexto, forma) {
  const g = forma.geometria;
  const { furos, ...semFuros } = g;
  const base = solidoDaTradutor(contexto, { ...forma, geometria: semFuros });
  const cilindros = furos.map((f, k) => {
    const centro = f.centro ?? [0, 0];
    const malha = malhaDoVolumeN2({ tipo: 'cilindro', eixo: 'y', centro: [centro[0], 0, centro[1]], raio: f.diametro / 2, comprimento: g.altura + 2 * SOBRA_DO_FURO_MM, segmentos: LADOS_DO_FURO }, forma);
    const mundo = paraOMundo(malha, g);
    return contexto.daMalha(mundo.vertices, mundo.triangulos, `a malha do furo ${k + 1} da forma "${forma.id}" (caixa)`);
  });
  return { m: contexto.diferenca([base.m, ...cilindros]), pecas: null };
}

/* Os tipos que o tradutor converte com a geometria do esboço (a N2 só muda o tipo): a malha vem da blocagem do volume local. */
function solidoDaTradutor(contexto, forma) {
  let traduzida;
  try {
    traduzida = volumeLocalDaForma(forma);
  } catch (e) {
    if (e instanceof ErroDoTradutor) throw new ErroDoSolido(`forma "${forma.id}" (${forma.tipo}): ${e.message}`, 'tipo-sem-solido', forma.id);
    throw e;
  }
  const codigo = traduzida.aproximacao?.codigo ?? null;
  if (codigo !== null && !APROXIMACOES_EXATAS.has(codigo)) {
    throw new ErroDoSolido(`forma "${forma.id}" (${forma.tipo}): a N2 só a aproxima (${codigo}) e o sólido exato dela não está implementado`, 'tipo-sem-solido', forma.id);
  }
  const volume = { centro: [0, 0, 0], ...traduzida.volume };
  const girar = forma.tipo !== 'tubo';
  const mundo = paraOMundo(malhaDoVolumeN2(volume, forma), forma.geometria, girar);
  return { m: contexto.daMalha(mundo.vertices, mundo.triangulos, `a malha da forma "${forma.id}" (${forma.tipo})`), pecas: null };
}

/* ---------- o recorte ---------- */

/* As peças convexas de `m`, ou nenhuma se `m` não é convexo (o casco dos vértices tem volume maior que o dele). */
function ehConvexo(contexto, m) {
  const { vertices } = contexto.malha(m);
  const casco = contexto.casco(vertices, 'casco do molde');
  return Math.abs(contexto.volume(casco) - contexto.volume(m)) <= 1e-6 * contexto.volume(m);
}

/* Os planos distintos (normal unitária e distância à origem do contexto) das faces de um sólido convexo. */
function planosDe(contexto, m) {
  const { vertProperties, triVerts, numProp } = m.getMesh();
  const p = (i) => [vertProperties[i * numProp], vertProperties[i * numProp + 1], vertProperties[i * numProp + 2]];
  const planos = new Map();
  for (let t = 0; t < triVerts.length; t += 3) {
    const [a, b, c] = [p(triVerts[t]), p(triVerts[t + 1]), p(triVerts[t + 2])];
    const n = cruz(sub(b, a), sub(c, a));
    const tamanho = Math.hypot(...n);
    if (!(tamanho > 1e-12)) continue;
    const u = n.map((x) => x / tamanho);
    const d = ponto(u, a);
    planos.set(`${u.map((x) => Math.round(x * 1e5)).join(',')}|${Math.round(d * 1e2)}`, { n: u, d });
  }
  return [...planos.values()];
}

/* A peça convexa com cada face deslocada `folga` mm para fora: a interseção dos semiespaços deslocados, recortada de um cubo grande. */
function engrossarPeca(contexto, peca, folga) {
  const { min, max } = contexto.caixa(peca);
  const centro = [0, 1, 2].map((i) => (min[i] + max[i]) / 2);
  const lado = 2 * (Math.max(...[0, 1, 2].map((i) => max[i] - min[i])) + 4 * folga) + 10;
  let q = contexto.cubo(lado, centro);
  for (const { n, d } of planosDe(contexto, peca)) {
    /* o semiespaço n·x <= d + folga, no quadro do contexto (a origem já foi subtraída), é o lado do plano de normal -n */
    q = contexto.aparar(q, [-n[0], -n[1], -n[2]], -(d + folga));
  }
  return q;
}

function engrossar(contexto, solido, folga, onde) {
  let pecas = typeof solido.pecas === 'function' ? solido.pecas() : solido.pecas;
  if (!pecas) {
    if (!ehConvexo(contexto, solido.m)) {
      throw new ErroDoSolido(`${onde}: a folga de ${folga} mm só vale para molde convexo ou loft, e este molde não é nenhum dos dois`, 'folga-sem-molde-convexo');
    }
    pecas = [solido.m];
  }
  return contexto.uniao(pecas.map((p) => engrossarPeca(contexto, p, folga)));
}

/* O molde de um cortador, com a folga e a fatia de profundidade que o `subtrai` pede. `alvo` é o sólido inteiro da forma recortada. */
function moldeDo(contexto, forma, cortador, molde, alvo) {
  const onde = `forma "${forma.id}", molde "${cortador.id}"`;
  let m = molde.m;
  if (cortador.folga) m = engrossar(contexto, molde, cortador.folga, onde);
  if (cortador.profundidade !== undefined) {
    const u = LADOS[cortador.lado];
    const { min, max } = contexto.caixa(alvo);
    /* a face da forma inteira no lado: o maior valor de u·x entre os vértices dela, que num eixo do mundo é a face da caixa */
    const face = Math.max(...[0, 1, 2].map((i) => (u[i] > 0 ? u[i] * max[i] : u[i] < 0 ? u[i] * min[i] : -Infinity)));
    const deslocamento = face - cortador.profundidade - ponto(u, contexto.origem);
    m = contexto.aparar(m, u, deslocamento);
  }
  return m;
}

/* ---------- as formas de uma opção ---------- */

/** Os sólidos das formas de `dados` (a saída de `formasResolvidas`), criados quando pedidos. `malhaDaFamilia(forma)` devolve a malha
 *  da forma de família (ver `solidoDaFamilia`). `solido(id)` devolve a Manifold da forma com o recorte aplicado, que o contexto libera. */
export function criarSolidosDoEsboco(dados, { contexto, malhaDaFamilia = null } = {}) {
  if (!objeto(dados) || dados.formato !== FORMATO_FORMAS_RESOLVIDAS || !Array.isArray(dados.formas)) {
    throw new ErroDoSolido(`o sólido do esboço lê "${FORMATO_FORMAS_RESOLVIDAS}" (a saída de formasResolvidas), com "formas"`, 'dados-invalidos');
  }
  if (!contexto) throw new ErroDoSolido('o sólido do esboço precisa do contexto da Manifold (criarContextoDeSolidos)', 'sem-contexto');
  const porId = new Map(dados.formas.map((f) => [f.id, f]));
  const prontos = new Map();
  const emConstrucao = new Set();

  function inteiro(forma) {
    const g = forma.geometria;
    if (forma.tipo === 'loft') return solidoDoLoft(contexto, forma);
    if (forma.tipo === 'familia') return solidoDaFamilia(contexto, forma, malhaDaFamilia);
    if (forma.tipo === 'envolve') throw new ErroDoSolido(`forma "${forma.id}" (envolve): a faixa que contorna círculos ainda não tem sólido`, 'tipo-sem-solido', forma.id);
    if (forma.tipo === 'tubo' && g.caminho.length > 2 && !(g.raioCurva > 0)) return solidoDoTuboComCantoVivo(contexto, forma);
    if (forma.tipo === 'caixa' && Array.isArray(g.furos) && g.furos.length > 0) return solidoDaCaixaComFuro(contexto, forma);
    return solidoDaTradutor(contexto, forma);
  }

  function construir(id) {
    if (prontos.has(id)) return prontos.get(id);
    const forma = porId.get(id);
    if (!forma) throw new ErroDoSolido(`a forma "${id}" não existe nesta opção (formas: ${[...porId.keys()].join(', ')})`, 'forma-desconhecida', id);
    if (emConstrucao.has(id)) throw new ErroDoSolido(`o recorte é circular em "${id}"`, 'recorte-circular', id);
    emConstrucao.add(id);
    try {
      let solido = inteiro(forma);
      const recorte = forma.geometria.recorte;
      if (recorte?.cortadores?.length) {
        const moldes = recorte.cortadores.map((c) => moldeDo(contexto, forma, c, construir(c.id), solido.m));
        const recortado = contexto.diferenca([solido.m, ...moldes]);
        if (contexto.volume(recortado) <= VOLUME_MINIMO_MM3) throw new ErroDoSolido(`forma "${id}": o recorte remove a forma inteira`, 'recorte-total', id);
        solido = { m: recortado, pecas: null };
      }
      prontos.set(id, solido);
      return solido;
    } finally {
      emConstrucao.delete(id);
    }
  }

  return {
    ids: [...porId.keys()],
    tem: (id) => porId.has(id),
    /** A forma `id` como Manifold, com o recorte. */
    solido: (id) => construir(id).m,
    /** A forma `id` sem o recorte (o que o tradutor leva ao andaime, mas com a geometria do esboço). */
    solidoInteiro(id) {
      const forma = porId.get(id);
      if (!forma) throw new ErroDoSolido(`a forma "${id}" não existe nesta opção`, 'forma-desconhecida', id);
      return inteiro(forma).m;
    },
  };
}
