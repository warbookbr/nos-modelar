/* ajuste-de-junta.js — arrastar o canto onde as partes se encontram.
 *
 * O gesto que a bancada não comportava. Arrastar a seta de uma parte escrevia um
 * parâmetro no instante do arrasto, e num quadro em treliça nenhum parâmetro
 * empurra um tubo inteiro: puxar o balanço pelo comprimento estica os quatro
 * balanços, porque todos terminam no mesmo eixo traseiro. A pessoa queria mexer
 * no CANTO, e o canto não tinha punho.
 *
 * Aqui o canto é primeira classe. Uma junta é o lugar onde vértices de partes
 * diferentes se encontram — a ponteira onde balanço inferior e superior se
 * juntam, a caixa do movimento central onde chegam três tubos. Arrastar uma
 * junta deforma só as partes que passam por ela, presas na outra ponta: o
 * vértice em cima da junta anda o arrasto inteiro, o vértice mais distante da
 * parte não anda, e o meio anda proporcional à distância. É o mesmo efeito que
 * mexer no comprimento produz, com a diferença de que a pessoa aponta onde.
 *
 * NADA AQUI ESCREVE PARÂMETRO. A saída é malha deformada, e quem transforma
 * malha deformada em receita organizada é a rodada de absorção, depois, com
 * `alvo-do-ajuste.js` medindo se ela chegou lá. Separar as duas coisas é o ponto
 * do plano: durante o gesto a pessoa não precisa saber que número existe.
 *
 * IDENTIDADE. Junta não é identificada por id de vértice, que muda a cada
 * reexecução da receita. É identificada pelos NOMES das partes que se encontram
 * ali, e por um ordinal quando as mesmas partes se encontram em mais de um
 * lugar — ordinal atribuído pela posição, em ordem estável. */

const MINIMO = 1e-12;

/* Dois vértices de partes diferentes a menos disto um do outro estão na mesma
 * junta. Vinte milímetros cobre a solda de um tubo de quadro sem juntar cantos
 * que a peça mantém separados; quem tiver peça em outra escala declara o seu. */
export const RAIO_DE_JUNTA_PADRAO = 0.02;

const distancia = (a, b) => Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);

/** Vértices de cada parte, por nome, a partir das faces. */
function verticesPorParte(neutro) {
  const porParte = new Map();
  for (const face of neutro.F.values()) {
    if (!face?.parte) continue;
    let conjunto = porParte.get(face.parte);
    if (!conjunto) porParte.set(face.parte, (conjunto = new Set()));
    for (const v of face.vs) conjunto.add(v);
  }
  return porParte;
}

/**
 * Onde partes diferentes se encontram.
 *
 * Devolve juntas ordenadas por nome, cada uma com as partes que passam por ela e
 * a posição média dos vértices que a formam.
 */
export function detectarJuntas(neutro, { raio = RAIO_DE_JUNTA_PADRAO } = {}) {
  const porParte = verticesPorParte(neutro);
  const nomes = [...porParte.keys()].sort();

  /* Pontos de contato: o meio entre dois vértices de partes diferentes que estão
     perto. Um mesmo canto produz dezenas deles, um por par de vértices da solda. */
  const contatos = [];
  for (let i = 0; i < nomes.length; i += 1) {
    const a = [...porParte.get(nomes[i])].sort((x, y) => x - y);
    for (let j = i + 1; j < nomes.length; j += 1) {
      const b = [...porParte.get(nomes[j])].sort((x, y) => x - y);
      for (const va of a) {
        const pa = neutro.V.get(va);
        for (const vb of b) {
          const pb = neutro.V.get(vb);
          if (distancia(pa, pb) > raio) continue;
          contatos.push({ posicao: [0, 1, 2].map((k) => (pa[k] + pb[k]) / 2), partes: [nomes[i], nomes[j]] });
        }
      }
    }
  }

  /* LIGAÇÃO SIMPLES, E NÃO DISTÂNCIA AO CENTRO QUE ANDA. Comparar cada contato
     com a média corrente do aglomerado partia um canto em sete: a média se
     desloca conforme os pontos entram, e o oitavo ponto do mesmo canto já não
     alcançava o centro. Dois contatos a menos de `raio` um do outro são o mesmo
     canto, e a relação é transitiva — é isso que junta a solda inteira. */
  const pai = contatos.map((_, i) => i);
  const raizDe = (i) => (pai[i] === i ? i : (pai[i] = raizDe(pai[i])));
  for (let i = 0; i < contatos.length; i += 1) {
    for (let j = i + 1; j < contatos.length; j += 1) {
      if (distancia(contatos[i].posicao, contatos[j].posicao) > raio) continue;
      const [ri, rj] = [raizDe(i), raizDe(j)];
      if (ri !== rj) pai[ri] = rj;
    }
  }

  const grupos = new Map();
  contatos.forEach((contato, i) => {
    const raizAtual = raizDe(i);
    let grupo = grupos.get(raizAtual);
    if (!grupo) grupos.set(raizAtual, (grupo = { partes: new Set(), soma: [0, 0, 0], quantos: 0 }));
    for (const parte of contato.partes) grupo.partes.add(parte);
    grupo.soma = grupo.soma.map((s, k) => s + contato.posicao[k]);
    grupo.quantos += 1;
  });

  const juntas = [...grupos.values()].map((g) => ({
    partes: [...g.partes].sort(),
    posicao: g.soma.map((s) => s / g.quantos),
  }));

  /* Nome pelos nomes das partes. Quando as mesmas partes se encontram em mais de
     um lugar, um ordinal desempata — atribuído pela posição, para não depender
     da ordem em que os vértices foram varridos. */
  const porChave = new Map();
  for (const junta of juntas) {
    const chave = junta.partes.join('+');
    if (!porChave.has(chave)) porChave.set(chave, []);
    porChave.get(chave).push(junta);
  }
  const nomeadas = [];
  for (const [chave, lista] of porChave) {
    lista.sort((a, b) => a.posicao[2] - b.posicao[2] || a.posicao[1] - b.posicao[1] || a.posicao[0] - b.posicao[0]);
    lista.forEach((junta, indice) => {
      nomeadas.push({ ...junta, nome: lista.length === 1 ? chave : `${chave}#${indice + 1}` });
    });
  }
  return nomeadas.sort((a, b) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0));
}

/**
 * Move as juntas pedidas e devolve a malha deformada.
 *
 * `ajustes` é uma lista de `{ junta, deslocamento: [dx, dy, dz] }` em metro. A
 * malha de entrada não é tocada: a peça original continua disponível para a
 * pessoa desfazer o gesto.
 *
 * Cada vértice anda o deslocamento multiplicado pelo peso, que vale um em cima
 * da junta e zero no vértice mais distante da mesma parte. Vértice de parte que
 * não passa pela junta não anda. Vértice que pertence a duas partes que passam
 * pela junta anda pelo maior dos dois pesos, senão a solda abriria.
 */
export function aplicarAjusteDeJunta(neutro, ajustes = [], { raio = RAIO_DE_JUNTA_PADRAO } = {}) {
  if (!Array.isArray(ajustes)) throw new Error('aplicarAjusteDeJunta: `ajustes` precisa ser uma lista');
  const juntas = new Map(detectarJuntas(neutro, { raio }).map((j) => [j.nome, j]));
  const porParte = verticesPorParte(neutro);

  const deslocamentoDe = new Map();
  for (const ajuste of ajustes) {
    const junta = juntas.get(ajuste?.junta);
    if (!junta) throw new Error(`aplicarAjusteDeJunta: junta desconhecida: ${ajuste?.junta}`);
    const d = ajuste.deslocamento;
    if (!Array.isArray(d) || d.length !== 3 || !d.every((n) => Number.isFinite(n))) {
      throw new Error(`aplicarAjusteDeJunta: deslocamento inválido em ${junta.nome}`);
    }

    for (const parte of junta.partes) {
      const vertices = porParte.get(parte);
      const alcance = Math.max(...[...vertices].map((v) => distancia(neutro.V.get(v), junta.posicao)));
      if (!(alcance > MINIMO)) continue;
      for (const v of vertices) {
        const peso = Math.max(0, 1 - distancia(neutro.V.get(v), junta.posicao) / alcance);
        const atual = deslocamentoDe.get(v);
        const proposto = d.map((c) => c * peso);
        if (!atual) { deslocamentoDe.set(v, proposto); continue; }
        const norma = (p) => p[0] ** 2 + p[1] ** 2 + p[2] ** 2;
        if (norma(proposto) > norma(atual)) deslocamentoDe.set(v, proposto);
      }
    }
  }

  const V = new Map();
  for (const [id, p] of neutro.V) {
    const d = deslocamentoDe.get(id);
    V.set(id, d ? [p[0] + d[0], p[1] + d[1], p[2] + d[2]] : [...p]);
  }
  return { ...neutro, V };
}
