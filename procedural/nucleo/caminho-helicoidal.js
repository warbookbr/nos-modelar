/* caminho-helicoidal.js — os pontos e as normais de uma hélice, para o friso varrer um perfil ao longo dela.
 *
 * FICHA caminhoHelicoidal
 * serve: a polilinha de uma hélice de raio, passo e voltas quaisquer, com a normal radial de cada ponto, pronta para o `friso`
 *   (`linha` e `normais`): o fio de uma mola, o filete de uma rosca, a espira de uma bobina, o caracol de um transportador.
 * quando: toda forma que gira em torno de um eixo enquanto anda ao longo dele. O perfil do friso fica com v para fora do eixo e u ao
 *   longo dele, e gira com a hélice; com `pontas` as primeiras e as últimas voltas têm outro passo, como as espiras encostadas da mola.
 * unidades: raio, passo, centro e o passo das pontas em mm; os pontos saem em metro, como a receita.
 * campos:
 *   raio: a distância do eixo à linha da hélice, em mm, maior que zero.
 *   passo: o avanço ao longo do eixo a cada volta, em mm, maior que zero.
 *   voltas: o número de voltas, contando as das pontas, maior que zero (pode ser fracionário).
 *   eixo: 'x', 'y' ou 'z' (padrão 'y'); a hélice sobe no sentido positivo dele, a partir de centro.
 *   centro: [x, y, z] em mm, o ponto do eixo onde a hélice começa (padrão a origem).
 *   sentido: 'direita' (padrão, a rosca comum) ou 'esquerda'.
 *   pontosPorVolta: os pontos a cada volta (padrão 32, de 8 para cima).
 *   inicio: o ângulo do primeiro ponto, em graus, medido a partir do primeiro eixo perpendicular (padrão 0).
 *   pontas: { voltas, passo } as voltas de cada ponta com outro passo, em mm (padrão nenhuma); o passo muda em meia volta, sem degrau.
 * devolve: { pontos, normais, altura, comprimento, friso(opcoes) } com `pontos` em metro, `normais` unitárias e radiais, `altura` (o avanço
 *   total) e `comprimento` (o da linha) em mm. `friso({ origemId, perfil, nome?, ponta? })` dá o passo do friso com o perfil em mm,
 *   lista de [u, v] ou { circulo: { raio } }, e a `ponta` do friso ('aberta' ou 'fechada').
 * exemplo:
 *   caminhoHelicoidal({ raio: 20, passo: 8, voltas: 6, pontas: { voltas: 1, passo: 3 } }).friso({ origemId: 1, perfil: { circulo: { raio: 1.5 } } })
 * peça: tools/fixtures/helice/receita.js (o fio de uma mola de espiras encostadas e o filete de uma rosca sobre um cilindro).
 * FIM DA FICHA
 *
 * Função pura e determinística, sem domínio: a hélice é geometria, e quem a usa dá o nome do objeto. O avanço ao longo do eixo é a
 * soma do passo de cada pedaço de ângulo, com o passo das pontas mudando para o do meio por um cosseno em meia volta; a soma é
 * feita amostra a amostra, na mesma ordem, e dá o mesmo número em toda execução. */

const MM = 1000;
const EIXOS = ['x', 'y', 'z'];

/* a ordem dos eixos para que (a, b, eixo) seja destro: o ponto é cos·a + sen·b + h·eixo */
const BASE = { x: [1, 2, 0], y: [2, 0, 1], z: [0, 1, 2] };

function erro(mensagem) { throw new Error(`caminhoHelicoidal: ${mensagem}`); }
const positivo = (v, campo) => { if (!(Number.isFinite(v) && v > 0)) erro(`${campo} é um número maior que zero em mm (veio ${JSON.stringify(v)})`); return v; };

export function caminhoHelicoidal(definicao = {}) {
  const CAMPOS = ['raio', 'passo', 'voltas', 'eixo', 'centro', 'sentido', 'pontosPorVolta', 'inicio', 'pontas'];
  for (const k of Object.keys(definicao)) if (!CAMPOS.includes(k)) erro(`campo "${k}" não existe (aceitos: ${CAMPOS.join(', ')})`);
  const { eixo = 'y', centro = [0, 0, 0], sentido = 'direita', pontosPorVolta = 32, inicio = 0, pontas = null } = definicao;
  const raio = positivo(definicao.raio, 'raio');
  const passo = positivo(definicao.passo, 'passo');
  const voltas = positivo(definicao.voltas, 'voltas');
  if (!EIXOS.includes(eixo)) erro(`eixo é 'x', 'y' ou 'z' (veio ${JSON.stringify(eixo)})`);
  if (!(Array.isArray(centro) && centro.length === 3 && centro.every(Number.isFinite))) erro(`centro é [x, y, z] em mm (veio ${JSON.stringify(centro)})`);
  if (sentido !== 'direita' && sentido !== 'esquerda') erro(`sentido é 'direita' ou 'esquerda' (veio ${JSON.stringify(sentido)})`);
  if (!(Number.isInteger(pontosPorVolta) && pontosPorVolta >= 8)) erro(`pontosPorVolta é um inteiro de 8 para cima (veio ${JSON.stringify(pontosPorVolta)})`);
  if (!Number.isFinite(inicio)) erro(`inicio é um ângulo em graus (veio ${JSON.stringify(inicio)})`);
  let vPonta = 0; let pPonta = passo;
  if (pontas !== null) {
    if (!pontas || typeof pontas !== 'object' || Array.isArray(pontas)) erro('pontas é { voltas, passo }');
    for (const k of Object.keys(pontas)) if (k !== 'voltas' && k !== 'passo') erro(`campo "pontas.${k}" não existe (aceitos: voltas, passo)`);
    vPonta = positivo(pontas.voltas, 'pontas.voltas');
    pPonta = positivo(pontas.passo, 'pontas.passo');
    if (!(2 * vPonta + 1 <= voltas)) erro(`as pontas têm ${vPonta} volta(s) cada e a mudança de passo leva meia volta de cada lado: são precisas ${2 * vPonta + 1} voltas ou mais (veio ${voltas})`);
  }

  /* o passo na volta t (de 0 a voltas): o das pontas até vPonta, o do meio depois de vPonta + 1/2, e um cosseno entre os dois */
  const passoEm = (t) => {
    if (vPonta === 0) return passo;
    const d = Math.min(t, voltas - t);
    if (d <= vPonta) return pPonta;
    if (d >= vPonta + 0.5) return passo;
    const f = (1 - Math.cos(Math.PI * (d - vPonta) / 0.5)) / 2;
    return pPonta + (passo - pPonta) * f;
  };

  const n = Math.ceil(voltas * pontosPorVolta);
  const sinal = sentido === 'direita' ? 1 : -1;
  const [ia, ib, ie] = BASE[eixo];
  const pontos = []; const normais = [];
  let h = 0; let comprimento = 0; let anterior = null;
  for (let k = 0; k <= n; k += 1) {
    const t = (voltas * k) / n;
    if (k > 0) { const t0 = (voltas * (k - 1)) / n; h += ((passoEm(t0) + passoEm(t)) / 2) * (t - t0); }
    const ang = sinal * 2 * Math.PI * t + (inicio * Math.PI) / 180;
    const c = Math.cos(ang); const s = Math.sin(ang);
    const p = [0, 0, 0]; const nr = [0, 0, 0];
    p[ia] = raio * c; p[ib] = raio * s; p[ie] = h;
    nr[ia] = c; nr[ib] = s;
    const mm = p.map((x, j) => x + centro[j]);
    if (anterior) comprimento += Math.hypot(...mm.map((x, j) => x - anterior[j]));
    anterior = mm;
    pontos.push(mm.map((x) => x / MM));
    normais.push(nr);
  }
  const altura = h;

  const friso = ({ origemId, perfil, nome = 'helice', ponta = null, ...resto } = {}) => {
    if (Object.keys(resto).length) erro(`friso: campo "${Object.keys(resto)[0]}" não existe (aceitos: origemId, perfil, nome, ponta)`);
    if (!Number.isInteger(origemId)) erro('friso: origemId é o inteiro do passo');
    let p;
    if (Array.isArray(perfil)) p = perfil.map((q) => q.map((x) => x / MM));
    else if (perfil && perfil.circulo && Number.isFinite(perfil.circulo.raio)) p = { circulo: { raio: perfil.circulo.raio / MM, ...(perfil.circulo.centro ? { centro: perfil.circulo.centro.map((x) => x / MM) } : {}) } };
    else erro('friso: perfil é uma lista de [u, v] em mm ou { circulo: { raio, centro? } }');
    return ['friso', { origemId, linha: { nome, pontos }, normais, perfil: p, ...(ponta ? { ponta } : {}) }];
  };

  return { pontos, normais, altura, comprimento, friso };
}
