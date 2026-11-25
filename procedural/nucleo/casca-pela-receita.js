/* casca-pela-receita.js — a casca de espessura constante de um `loft`, calculada pelas seções da receita e não pela malha.

   A operação `casca` (casca.js) recua as faces da malha e é exata só em sólido de três faces por vértice ou convexo; o
   `loft` de várias seções com cintura ou barriga (carenagem, capô, corpo de bomba) é côncavo e tem vértice de quatro faces,
   e ela o recusa. Aqui a parede sai do mesmo jeito que o sólido foi descrito: a cavidade (ou, para fora, o sólido de fora) é
   outro `loft` com as mesmas posições e o mesmo número de pontos, e cada seção recuada no próprio plano. A casca é o
   `subtrair` dos dois. Função pura sobre números: nada de malha, nada de fora do núcleo.

   O RECUO DE CADA PONTO. O ponto j da seção k anda para dentro da seção pela normal do contorno nesse ponto (a bissetriz
   das normais das duas arestas vizinhas, com o fator de meia-esquadria 1/cos da meia-abertura, para as arestas ficarem
   paralelas às de fora a `espessura` delas). Entre seções, a superfície inclina: o ponto j muda de distância ao eixo da
   seção k−1 para a k+1, e a parede medida na normal da superfície fica espessura · cos φ, com tan φ essa variação pelo
   avanço entre as seções. Por isso o recuo no plano da seção é espessura · √(1 + tan² φ), com φ o do lado mais inclinado
   (a seção é a quina entre o trecho de trás e o da frente, e a parede tem de ter a espessura nas duas faces), e a parede
   sai com a espessura pedida também onde a forma afina ou alarga; do lado menos inclinado da quina ela sai um pouco mais
   grossa. As seções `raio` (círculo) recuam o raio do mesmo jeito.

   AS PONTAS. O `loft` só fecha uma ponta com o polo (seção de raio 0), e por isso a ponta com polo é a fechada: a cavidade
   termina num polo recuado ao longo do eixo o que dá a espessura na normal da ponta, com a inclinação do trecho até a seção
   vizinha. A ponta sem polo é a aberta: a cavidade tem a seção recuada da ponta e passa dela pelo avanço de
   `PASSA_DA_PONTA` do trecho vizinho, para o `subtrair` abrir a boca sem deixar película.

   PARA FORA. Com `para: 'fora'`, as seções andam para fora e o polo da ponta fechada anda para fora do mesmo jeito; o sólido
   de fora é o `loft` novo, e a cavidade é o próprio sólido da receita, com as pontas abertas passadas.

   O QUE ELA NÃO FAZ. As seções têm de ser todas contorno ou todas raio, com o mesmo número de pontos, e o caminho entre elas
   não pode torcer muito (o recuo usa a variação dos pontos de mesmo índice, no quadro de cada seção). Polo (raio 0) só nas pontas, e
   seção de aresta não tem cavidade. O recuo que inverte uma aresta ou cruza o contorno é recusado, com a seção, o ponto e a
   espessura máxima aproximada. Nas quinas vivas entre seções (seções poucas e afastadas), a parede sai até uns 40 % mais
   grossa do lado menos inclinado e até 3 % mais fina; com a forma lisa (muitos pontos e seções), ela fica a 2 % da pedida.

   FICHA passosDaCascaDoLoft
   serve: a casca de espessura constante de um `loft` de várias seções, também o côncavo (cintura, barriga, bico), que a
     operação `casca` pela malha recusa; para dentro ou para fora, com a ponta de polo fechada e a sem polo aberta.
   quando: carenagem, capô, duto, bocal, tanque ou corpo oco descrito por `loft` de seções por contorno ou por raio; a casca
     de revolução é o `lathe` com `espessura`, e a de extrusão é a `extrusao` com `deslocar`.
   unidades: as da receita (metro).
   campos:
     argumentosDoLoft: os argumentos do `loft` ({ secoes, lados, ... }), com polo (raio 0) só nas pontas.
     espessura: a espessura da parede.
     para: 'dentro' (padrão) ou 'fora'.
     origemId: o primeiro origemId dos três passos (padrão 1).
   devolve: { passos, origem } com os dois `loft` e o `subtrair`, e a origem da casca.
   exemplo:
     passosDaCascaDoLoft({ lados: 16, secoes: [{ pos: [0, 0, -0.04], raio: 0 }, { pos: [0, 0, 0], raio: 0.06 }, { pos: [0, 0, 0.12], raio: 0.035 }, { pos: [0, 0, 0.24], raio: 0.06 }] }, { espessura: 0.003 })
   peça: procedural/nucleo/casca-pela-receita.test.mjs (o loft com cintura, facetado e liso).
   FIM DA FICHA */
import { areaDoContorno, ehSimples } from './contorno.js';

export const PASSA_DA_PONTA = 0.05;
/* a tampa quase plana da ponta aberta do sólido de fora: o polo fica a 1 µm além da ponta (o `loft` não aceita polo na
   mesma posição), e a cavidade, que passa da ponta, abre essa tampa e deixa só a borda da parede */
export const TAMPA_DA_BOCA = 1e-6;

export class ErroDaCascaPelaReceita extends Error {
  constructor(mensagem) { super(`casca pela receita: ${mensagem}`); this.name = 'ErroDaCascaPelaReceita'; }
}
const recusar = (m) => { throw new ErroDaCascaPelaReceita(m); };

const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const comp3 = (a) => Math.hypot(a[0], a[1], a[2]);
const mistura3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const mistura2 = (a, b, t) => a.map((p, j) => [p[0] + (b[j][0] - p[0]) * t, p[1] + (b[j][1] - p[1]) * t]);

/* a normal de fora de cada ponto do contorno (anti-horário ou horário) e o fator de meia-esquadria */
function normaisDoContorno(c, k) {
  const n = c.length; const sinal = areaDoContorno(c) >= 0 ? 1 : -1;
  const normalDaAresta = (i) => { const a = c[i]; const b = c[(i + 1) % n]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (L < 1e-12) recusar(`a seção ${k} tem os pontos ${i} e ${(i + 1) % n} no mesmo lugar`); return [sinal * (b[1] - a[1]) / L, -sinal * (b[0] - a[0]) / L]; };
  return c.map((_, j) => {
    const e0 = normalDaAresta((j + n - 1) % n); const e1 = normalDaAresta(j);
    const s = [e0[0] + e1[0], e0[1] + e1[1]]; const L = Math.hypot(...s);
    if (L < 1e-9) recusar(`a seção ${k} volta sobre si no ponto ${j}`);
    const v = [s[0] / L, s[1] / L]; const cos = v[0] * e1[0] + v[1] * e1[1];
    return { normal: v, esquadria: 1 / Math.max(cos, 0.2) };
  });
}

/** As seções do `loft` recuado (para dentro) ou avançado (para fora) pela espessura, com as pontas abertas passadas. */
export function secoesDaCasca(secoes, { espessura, para = 'dentro' } = {}) {
  if (!Array.isArray(secoes) || secoes.length < 3) recusar('são precisas ao menos três seções (uma ponta, o corpo e a outra ponta)');
  if (!(espessura > 0)) recusar(`a espessura precisa ser maior que zero (veio ${espessura})`);
  if (!['dentro', 'fora'].includes(para)) recusar(`para precisa ser 'dentro' ou 'fora' (veio '${para}')`);
  const n = secoes.length;
  const ehPolo = (s) => s.raio === 0;
  const corpo = secoes.filter((s, k) => !((k === 0 || k === n - 1) && ehPolo(s)));
  const porRaio = corpo.every((s) => typeof s.raio === 'number' && s.raio > 0);
  const porContorno = corpo.every((s) => Array.isArray(s.contorno));
  if (!porRaio && !porContorno) recusar('o corpo tem de ser todo {pos, raio} ou todo {pos, contorno}, com polo (raio 0) só nas pontas; aresta não tem cavidade');
  const pontos = porContorno ? corpo[0].contorno.length : 0;
  if (porContorno && corpo.some((s) => s.contorno.length !== pontos)) recusar('as seções têm de ter o mesmo número de pontos');
  const sinal = para === 'dentro' ? 1 : -1;
  /* o polo conta, na conta da inclinação, como o contorno todo no centro da seção */
  const valor = (s) => (porRaio ? s.raio : ehPolo(s) ? Array.from({ length: pontos }, () => [0, 0]) : s.contorno);
  const avanco = (a, b) => comp3(sub3(secoes[b].pos, secoes[a].pos));
  /* a inclinação de cada lado da seção (para a vizinha de trás e a da frente): a parede tem de ter a espessura nas duas
     faces que se encontram na seção, e por isso vale o lado mais inclinado */
  const fatorDeInclinacao = (k, j, normal) => {
    const lados = [[Math.max(0, k - 1), k], [k, Math.min(n - 1, k + 1)]].filter(([a, b]) => a !== b);
    return Math.max(...lados.map(([a, b]) => {
      const ds = avanco(a, b); const va = valor(secoes[a]); const vb = valor(secoes[b]);
      const tg = porRaio ? (vb - va) / ds : ((vb[j][0] - va[j][0]) * normal[0] + (vb[j][1] - va[j][1]) * normal[1]) / ds;
      return Math.sqrt(1 + tg * tg);
    }));
  };
  const recuar = (k, atual, pos) => {
    if (porRaio) {
      const f = fatorDeInclinacao(k, 0, null);
      const r = atual - sinal * espessura * f;
      if (!(r > 0)) recusar(`a seção ${k} tem raio ${atual} e a casca de ${espessura} a fecha; aceito: espessura abaixo de ${(atual / f).toFixed(6)}`);
      return { pos, raio: r };
    }
    const normais = normaisDoContorno(atual, k);
    const novo = atual.map((p, j) => {
      const { normal, esquadria } = normais[j];
      const d = sinal * espessura * esquadria * fatorDeInclinacao(k, j, normal);
      return [p[0] - d * normal[0], p[1] - d * normal[1]];
    });
    if (!ehSimples(novo) || Math.sign(areaDoContorno(novo)) !== Math.sign(areaDoContorno(atual)) || (sinal > 0 && Math.abs(areaDoContorno(novo)) >= Math.abs(areaDoContorno(atual)))) {
      recusar(`o recuo de ${espessura} na seção ${k} cruza ou inverte o contorno; diminua a espessura ou arredonde a seção`);
    }
    return { pos, contorno: novo };
  };
  /* a ponta: com polo, fechada, e o polo novo anda na direção do eixo o que dá a espessura na normal da ponta (com tan α o
     menor raio da seção vizinha pelo trecho até ela, o lado mais fechado do cone); sem polo, aberta, e a seção recuada passa da ponta */
  const raioMenor = (s) => (porRaio ? s.raio : Math.min(...s.contorno.map((p) => Math.hypot(p[0], p[1]))));
  const ponta = (k, vizinha) => {
    const L = avanco(Math.min(k, vizinha), Math.max(k, vizinha));
    if (ehPolo(secoes[k])) {
      const rv = raioMenor(secoes[vizinha]); const seno = rv / Math.hypot(rv, L);
      const anda = (sinal * espessura) / seno;
      if (anda >= L) recusar(`a ponta da seção ${k} tem o trecho de ${L} até a vizinha e a tampa pede ${anda}; aceito: espessura abaixo de ${(L * seno).toFixed(6)}`);
      return [{ pos: mistura3(secoes[k].pos, secoes[vizinha].pos, anda / L), raio: 0 }];
    }
    const recuada = recuar(k, valor(secoes[k]), secoes[k].pos);
    /* para fora, a seção avançada é o sólido de fora e fica na ponta; quem passa da ponta é a cavidade (o sólido da receita) */
    if (para === 'fora') return [recuada];
    const passada = { ...recuada, pos: mistura3(secoes[k].pos, secoes[vizinha].pos, -PASSA_DA_PONTA) };
    return [recuada, passada, { pos: mistura3(secoes[k].pos, secoes[vizinha].pos, -2 * PASSA_DA_PONTA), raio: 0 }];
  };
  const meio = secoes.slice(1, n - 1).map((s, i) => recuar(i + 1, valor(s), s.pos));
  /* a ponta aberta sai como [recuada, passada, polo além]; no começo da lista ela vai na ordem inversa */
  return [...ponta(0, 1).reverse(), ...meio, ...ponta(n - 1, n - 2)];
}

/** As seções do sólido da receita com as pontas abertas (sem polo) passadas, que é a cavidade quando a casca vai para fora. */
export function secoesPassadas(secoes) {
  const n = secoes.length; const aberta = (k) => secoes[k].raio !== 0;
  const passa = (k, vizinha) => [{ ...secoes[k], pos: mistura3(secoes[k].pos, secoes[vizinha].pos, -PASSA_DA_PONTA) }, { pos: mistura3(secoes[k].pos, secoes[vizinha].pos, -2 * PASSA_DA_PONTA), raio: 0 }];
  return [...(aberta(0) ? passa(0, 1).reverse() : []), ...secoes, ...(aberta(n - 1) ? passa(n - 1, n - 2) : [])];
}

/** O sólido com a ponta aberta tampada: o polo a `TAMPA_DA_BOCA` além de cada ponta sem polo. */
export function secoesTampadas(secoes) {
  const n = secoes.length; const aberta = (k) => secoes[k].raio !== 0;
  const tampa = (k, vizinha) => { const L = comp3(sub3(secoes[vizinha].pos, secoes[k].pos)); return { pos: mistura3(secoes[k].pos, secoes[vizinha].pos, -TAMPA_DA_BOCA / L), raio: 0 }; };
  return [...(aberta(0) ? [tampa(0, 1)] : []), ...secoes, ...(aberta(n - 1) ? [tampa(n - 1, n - 2)] : [])];
}

/** Os passos da receita da casca de um `loft`: o sólido de fora, o de dentro e o `subtrair`, a partir do `origemId` dado. */
export function passosDaCascaDoLoft(argumentosDoLoft, { espessura, para = 'dentro', origemId = 1 } = {}) {
  const { secoes, ...resto } = argumentosDoLoft;
  const novas = secoesDaCasca(secoes, { espessura, para });
  const [fora, dentro] = para === 'dentro' ? [secoesTampadas(secoes), novas] : [secoesTampadas(novas), secoesPassadas(secoes)];
  return {
    passos: [
      ['loft', { ...resto, origemId, secoes: fora }],
      ['loft', { ...resto, origemId: origemId + 1, secoes: dentro }],
      ['subtrair', { origemId: origemId + 2, solidos: [{ origem: { op: 'loft', id: origemId } }, { origem: { op: 'loft', id: origemId + 1 } }] }],
    ],
    origem: { op: 'subtrair', id: origemId + 2 },
  };
}
