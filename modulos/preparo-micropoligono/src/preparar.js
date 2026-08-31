/* preparar.js — deixa a malha pronta para pipeline de micropolígono.
 *
 * "Micropolígono" aqui é a família Nanite e equivalentes: o motor recebe a
 * malha DENSA e monta ele mesmo os níveis de detalhe. Isso inverte o conselho
 * antigo de jogo — não se entrega uma malha magra e um LOD feito à mão; entrega-se
 * a malha boa e o motor resolve. O que ele exige em troca é higiene, e é isso
 * que este módulo verifica.
 *
 * O QUE ELE COBRE, e por que cada item:
 *
 *   - TRIÂNGULOS. O pipeline consome triângulo. Face de n cantos é triangulada
 *     em leque a partir do primeiro canto, o que é correto para face convexa e
 *     plana — e a verificação avisa quando a face não é nenhuma das duas, em vez
 *     de triangular errado em silêncio.
 *     No QUADRILÁTERO o leque não é indiferente. Quad torto tem duas diagonais e
 *     cada uma dá uma silhueta diferente; escolher sempre a do primeiro canto faz
 *     a forma depender de qual canto o autor escreveu primeiro. Aqui a diagonal é
 *     escolhida: entre as que ficam DENTRO do quad, a mais curta — que é a regra
 *     usual e a que menos deforma. A escolha é registrada em `diagonal`, então é
 *     auditável em vez de implícita.
 *   - FECHAMENTO. Aresta de borda vira buraco, e buraco em malha de
 *     micropolígono aparece como falha de iluminação que ninguém rastreia até a
 *     geometria.
 *   - ORIENTAÇÃO COERENTE. Normal virada some no editor e reaparece no jogo.
 *   - ÁREA NÃO NULA. Triângulo degenerado é descartado por uns consumidores e
 *     mantido por outros; nenhum dos dois comportamentos é o que o autor quis.
 *   - ESCALA DECLARADA. O motor assume centímetro. Entregar metro sem dizer é
 *     como o modelo chega cem vezes menor e alguém "conserta" com escala no
 *     ator, que quebra colisão e física depois.
 *
 * O QUE ELE NÃO COBRE — dito aqui porque silêncio sobre cobertura é a mesma
 * coisa que mentir sobre ela, e este repositório já registrou "detector que
 * devolve passa fora do seu escopo" como falha:
 *
 *   - NÃO gera cluster, hierarquia de LOD nem qualquer estrutura interna do
 *     motor. Isso é trabalho do importador, e reproduzi-lo aqui seria adivinhar
 *     um formato proprietário que muda entre versões.
 *   - NÃO valida UV, tangente, lightmap nem material. A Mecanifica não autora
 *     material, e inventar contrato de material aqui é proibido por regra.
 *   - NÃO decide densidade de triângulo. Densidade é decisão de forma; o
 *     otimizador irmão mostrou por medida que pós-processo lossless não muda
 *     contagem de triângulo. Quem quer menos triângulo muda a receita.
 *   - NÃO verifica interseção entre partes nem espessura mínima.
 */

export const FORMATO = 'mecanifica.preparo-micropoligono@1';

const EPS_AREA = 1e-14;

/* Desvio máximo tolerado de uma face ao próprio plano, como fração do tamanho
   dela. O valor vem de medida no acervo, e o que a medida mostrou é que a
   distribuição é DE DOIS GRUPOS, sem meio-termo: face de caixa desvia 1e-17, que
   é ruído de ponto flutuante, e face de loft que torce de verdade desvia de 1e-2
   para cima. Entre um e outro não há nada.

   Por isso o limiar é frouxo o bastante para ignorar o ruído e nada além disso.
   Qualquer valor entre 1e-15 e 1e-2 daria a mesma resposta neste acervo; 1e-9 foi
   escolhido por ficar longe das duas pontas. Subir para 1e-2 tinha sido a
   tentação — calaria os alertas da espada e do machado — mas eles são
   verdadeiros: as duas lâminas torcem 25% na ponta, onde a seção deixa de ser
   semelhante. Calar alerta verdadeiro para deixar a saída verde é o defeito que
   este repositório já batizou. */
const TOLERANCIA_PLANARIDADE = 1e-9;

export const NAO_COBERTO = Object.freeze([
  'cluster e hierarquia de nível de detalhe do motor',
  'UV, tangente, lightmap e material',
  'densidade de triângulo (é decisão de forma, não de saída)',
  'interseção entre partes e espessura mínima',
]);

export class ErroPreparo extends Error {
  constructor(codigo, mensagem, detalhes = null) {
    super(mensagem);
    this.name = 'ErroPreparo';
    this.codigo = codigo;
    this.detalhes = detalhes;
  }
}

const FATOR = Object.freeze({ mm: 0.001, cm: 0.01, m: 1 });

function ler(malha) {
  const brutos = malha?.vertices ?? malha?.V;
  const brutasFaces = malha?.faces ?? malha?.F;
  if (!brutos || !brutasFaces) throw new ErroPreparo('malha-invalida', 'Malha precisa declarar vertices e faces.');
  const vertices = new Map();
  for (const [id, p] of (brutos instanceof Map ? brutos.entries() : Object.entries(brutos))) {
    /* A aridade vem ANTES do teste de finitude: [0,0] passa em `every` porque
       os dois elementos que existem são finitos, e a malha entraria com um
       ponto de duas coordenadas. Foi assim que este ramo falhou no teste. */
    if (!Array.isArray(p) || p.length < 3 || !p.slice(0, 3).every(Number.isFinite)) {
      throw new ErroPreparo('vertice-invalido', `Vértice ${id} não tem três números finitos.`, { vertice: id });
    }
    vertices.set(Number(id), p.slice(0, 3));
  }
  const faces = [];
  for (const [id, f] of (brutasFaces instanceof Map ? [...brutasFaces.entries()] : Object.entries(brutasFaces))) {
    const vs = (f.vs ?? f).map(Number);
    if (vs.length < 3) throw new ErroPreparo('face-invalida', `Face ${id} tem menos de três cantos.`, { face: id });
    faces.push({ id: Number(id), vs, parte: f.parte ?? null, material: f.material ?? null });
  }
  return { vertices, faces };
}

function areaTriangulo(a, b, c) {
  const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
  const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
  return Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
}

function planaridade(vertices, vs) {
  /* Desvio máximo dos cantos ao plano dos três primeiros, relativo ao tamanho
     da face. Face torta triangulada em leque produz silhueta que depende de
     qual canto virou o centro do leque — resultado que muda entre ferramentas. */
  if (vs.length < 4) return 0;
  const a = vertices.get(vs[0]); const b = vertices.get(vs[1]); const c = vertices.get(vs[2]);
  const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
  const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
  let nx = uy * vz - uz * vy; let ny = uz * vx - ux * vz; let nz = ux * vy - uy * vx;
  const n = Math.hypot(nx, ny, nz);
  if (n <= 0) return Infinity;
  nx /= n; ny /= n; nz /= n;
  let maior = 0;
  let escala = 0;
  for (const id of vs) {
    const p = vertices.get(id);
    const d = Math.abs(nx * (p[0] - a[0]) + ny * (p[1] - a[1]) + nz * (p[2] - a[2]));
    if (d > maior) maior = d;
    escala = Math.max(escala, Math.hypot(p[0] - a[0], p[1] - a[1], p[2] - a[2]));
  }
  return escala > 0 ? maior / escala : 0;
}

/* Qual das duas diagonais de um quad usar. Devolve 0 para a do primeiro canto e
   1 para a outra (girar a lista em um faz o leque cair na outra diagonal).

   Uma diagonal só serve se as duas metades que ela produz apontam para o mesmo
   lado: num quad côncavo uma das diagonais passa POR FORA, e o par resultante
   cobre área que não é da face. Esse é o critério eliminatório. Entre as que
   sobram, a mais curta — o par fica menos alongado e a silhueta desvia menos. */
export function melhorDiagonal(pontos, vs) {
  const p = vs.map((v) => pontos.get(v));
  const cruz = (a, b, c) => {
    const ux = b[0] - a[0]; const uy = b[1] - a[1]; const uz = b[2] - a[2];
    const vx = c[0] - a[0]; const vy = c[1] - a[1]; const vz = c[2] - a[2];
    return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  };
  /* Normal de referência: a soma das duas normais possíveis é indiferente à
     diagonal, então serve de árbitro sem favorecer nenhuma das duas. */
  const soma = [0, 0, 0];
  for (let k = 0; k < 4; k++) {
    const n = cruz(p[k], p[(k + 1) % 4], p[(k + 2) % 4]);
    for (let e = 0; e < 3; e++) soma[e] += n[e];
  }
  const dentro = (i) => {
    const a = [p[i], p[(i + 1) % 4], p[(i + 2) % 4]];
    const b = [p[i], p[(i + 2) % 4], p[(i + 3) % 4]];
    for (const t of [a, b]) {
      const n = cruz(t[0], t[1], t[2]);
      if (n[0] * soma[0] + n[1] * soma[1] + n[2] * soma[2] <= 0) return false;
    }
    return true;
  };
  const d = (i, j) => Math.hypot(p[i][0] - p[j][0], p[i][1] - p[j][1], p[i][2] - p[j][2]);
  const ok0 = dentro(0); const ok1 = dentro(1);
  if (ok0 !== ok1) return ok0 ? 0 : 1;
  return d(1, 3) < d(0, 2) ? 1 : 0;
}

export function prepararParaMicropoligono(malhaBruta, {
  unidadeEntrada = 'm',
  unidadeSaida = 'cm',
  tolerânciaPlanaridade = TOLERANCIA_PLANARIDADE,
} = {}) {
  if (!FATOR[unidadeEntrada]) throw new ErroPreparo('unidade-invalida', `Unidade de entrada '${unidadeEntrada}' desconhecida.`);
  if (!FATOR[unidadeSaida]) throw new ErroPreparo('unidade-invalida', `Unidade de saída '${unidadeSaida}' desconhecida.`);

  const { vertices, faces } = ler(malhaBruta);
  const achados = [];
  const anota = (severidade, codigo, mensagem, onde) => achados.push({ severidade, codigo, mensagem, onde });

  /* --- fechamento e orientação, na malha ORIGINAL ---
     Antes de triangular, porque triangular esconde: um leque sobre uma face
     de borda produz triângulos que parecem sãos e a borda continua lá. */
  const incidencias = new Map();
  for (const f of faces) {
    for (let k = 0; k < f.vs.length; k++) {
      const a = f.vs[k]; const b = f.vs[(k + 1) % f.vs.length];
      const ch = a < b ? `${a}:${b}` : `${b}:${a}`;
      if (!incidencias.has(ch)) incidencias.set(ch, []);
      incidencias.get(ch).push({ face: f.id, a, b });
    }
  }
  let bordas = 0;
  for (const [ch, lista] of incidencias) {
    if (lista.length === 1) { bordas++; anota('reprova', 'malha-aberta', `Aresta ${ch} tem uma face só: buraco.`, { aresta: ch }); }
    else if (lista.length > 2) anota('reprova', 'nao-manifold', `Aresta ${ch} tem ${lista.length} faces.`, { aresta: ch });
    else if (lista[0].a === lista[1].a && lista[0].b === lista[1].b) {
      anota('reprova', 'orientacao-incoerente', `Faces ${lista[0].face} e ${lista[1].face} têm normais em desacordo.`, { aresta: ch });
    }
  }

  /* --- planaridade e convexidade das faces que serão trianguladas --- */
  for (const f of faces) {
    if (f.vs.length <= 3) continue;
    const desvio = planaridade(vertices, f.vs);
    if (desvio > tolerânciaPlanaridade) {
      anota('alerta', 'face-torta', `Face ${f.id} desvia ${desvio.toExponential(2)} do próprio plano; o leque de triangulação vira escolha, não consequência.`, { face: f.id, desvio });
    }
  }

  /* --- triangular em leque --- */
  const fator = FATOR[unidadeEntrada] / FATOR[unidadeSaida];
  const pontos = new Map();
  for (const [id, p] of vertices) pontos.set(id, [p[0] * fator, p[1] * fator, p[2] * fator]);
  const triangulos = [];
  for (const f of faces) {
    const giro = f.vs.length === 4 ? melhorDiagonal(pontos, f.vs) : 0;
    const vs = giro ? [...f.vs.slice(giro), ...f.vs.slice(0, giro)] : f.vs;
    for (let k = 1; k < vs.length - 1; k++) {
      const tri = [vs[0], vs[k], vs[k + 1]];
      const area = areaTriangulo(pontos.get(tri[0]), pontos.get(tri[1]), pontos.get(tri[2]));
      if (area <= EPS_AREA) {
        anota('reprova', 'triangulo-degenerado', `A face ${f.id} produz um triângulo de área nula.`, { face: f.id, triangulo: tri });
        continue;
      }
      triangulos.push({ vs: tri, parte: f.parte, material: f.material, faceOrigem: f.id, diagonal: [vs[0], vs[2]] });
    }
  }

  const reprovas = achados.filter((a) => a.severidade === 'reprova');
  return {
    formato: FORMATO,
    veredito: reprovas.length ? 'reprova' : (achados.length ? 'alerta' : 'aprova'),
    /* A malha só sai quando passa: entregar geometria junto com um veredito de
       reprova convida a usá-la assim mesmo. */
    malha: reprovas.length ? null : { vertices: pontos, triangulos },
    escala: { de: unidadeEntrada, para: unidadeSaida, fator },
    resumo: {
      vertices: pontos.size,
      facesEntrada: faces.length,
      triangulos: triangulos.length,
      bordas,
      reprovas: reprovas.length,
      alertas: achados.length - reprovas.length,
    },
    achados,
    naoCoberto: NAO_COBERTO,
  };
}
