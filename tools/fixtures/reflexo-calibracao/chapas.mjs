/* chapas.mjs — as chapas de calibração do reflexo: chapas de defeito conhecido, geradas por conta, para provar a continuidade nas emendas,
 * o índice de suavidade e (na fatia 6 do plano do reflexo na bancada) a leitura da zebra.
 *
 * A CHAPA. 600 mm em x por 400 mm em y, 2 mm de espessura (duas peles e a quina), a pele de fora para +z, feita de DUAS folhas que se
 * encontram na EMENDA, a linha x = 300 mm ao longo de y: a folha `esquerda` (x de 0 a 300) e a `direita` (x de 300 a 600), cada uma uma
 * `subdivisao` própria (origem 1 e 2) e uma parte própria. A seção em x é um arco de raio 1,5 m com o topo na emenda (a curvatura de
 * 0,667 1/m atravessa a emenda dos dois lados); a seção em y é reta. A gaiola amostra a altura declarada a cada 10 mm e a subdivisão é de
 * nível 0, de modo que a malha É a altura declarada nos vértices: a subdivisão arredondaria o vinco e o degrau, e o defeito medido seria o
 * que a subdivisão deixou, não o declarado. As duas folhas não são soldadas: a emenda é a borda de uma ao lado da borda da outra.
 *
 * O DEFEITO de cada chapa está em `CHAPAS[nome].defeito`, legível por teste (e reexportado como `DEFEITO` por cada `receita.js`):
 * - `lisa`: nenhum; a emenda é contínua em posição, tangente e curvatura (a de controle);
 * - `degrau` (G0): a folha direita desce `desnivelMm` (1,5 mm) em -z, para dentro; a fresta na emenda é esse desnível;
 * - `vinco` (G1): a folha direita gira `anguloGraus` (6 graus) em torno da linha da emenda, para baixo; posição contínua, tangente quebrada;
 * - `quebra-de-curvatura` (G2): a folha esquerda é um arco de raio 0,5 m e a direita, de 1,5 m, os dois com o topo na emenda; posição e
 *   tangente contínuas, a curvatura salta de 2 para 0,667 1/m, a razão `razaoDeCurvatura` 3;
 * - `ondulada-025`, `ondulada-050`, `ondulada-100`: a chapa lisa com uma ondulação senoidal em x de comprimento de onda 100 mm e amplitude
 *   `amplitudeMm` 0,25, 0,5 e 1 mm (contínua na emenda: o defeito é a ondulação, não a emenda).
 *
 * Dado de teste: fora do acervo publicado, como as chapas de prova de `tools/fixtures/acervo/chapa-de-reflexo-de-prova/`. As receitas
 * ficam em `tools/fixtures/reflexo-calibracao/<nome>/receita.js` e abrem pelo caminho (`npm run bancada -- tools/fixtures/reflexo-calibracao/vinco`). */

export const LARGURA_MM = 600;
export const ALTURA_MM = 400;
export const EMENDA_X_MM = 300;
export const PASSO_MM = 10;
export const ESPESSURA_MM = 2;
export const RAIO_DA_SECAO_MM = 1500;
export const COMPRIMENTO_DE_ONDA_MM = 100;

const arco = (x, raio) => Math.sqrt(raio * raio - (x - EMENDA_X_MM) ** 2) - raio;

/** As chapas, com o defeito declarado e a função que dá o ponto (mm) da pele de fora de cada folha em (x, y) da grade. */
export const CHAPAS = Object.freeze({
  lisa: { defeito: { tipo: 'nenhum', emendaXMm: EMENDA_X_MM } },
  degrau: { defeito: { tipo: 'degrau', continuidade: 'G0', emendaXMm: EMENDA_X_MM, desnivelMm: 1.5, folgaMm: 0, frestaMm: 1.5, lado: 'direita desce, para dentro' } },
  vinco: { defeito: { tipo: 'vinco', continuidade: 'G1', emendaXMm: EMENDA_X_MM, anguloGraus: 6, lado: 'direita gira para baixo em torno da emenda' } },
  'quebra-de-curvatura': { defeito: { tipo: 'quebra-de-curvatura', continuidade: 'G2', emendaXMm: EMENDA_X_MM, raioEsquerdaMm: 500, raioDireitaMm: 1500, curvaturaEsquerda: 2, curvaturaDireita: 2 / 3, razaoDeCurvatura: 3 } },
  'ondulada-025': { defeito: { tipo: 'ondulacao', amplitudeMm: 0.25, comprimentoDeOndaMm: COMPRIMENTO_DE_ONDA_MM, direcao: 'x' } },
  'ondulada-050': { defeito: { tipo: 'ondulacao', amplitudeMm: 0.5, comprimentoDeOndaMm: COMPRIMENTO_DE_ONDA_MM, direcao: 'x' } },
  'ondulada-100': { defeito: { tipo: 'ondulacao', amplitudeMm: 1, comprimentoDeOndaMm: COMPRIMENTO_DE_ONDA_MM, direcao: 'x' } },
});

/** O ponto [x, y, z] em mm da pele de fora da folha (`esquerda` ou `direita`) da chapa `nome`, no ponto (x, y) da grade. */
export function pontoDaChapa(nome, folha, x, y) {
  const d = CHAPAS[nome]?.defeito;
  if (!d) throw new Error(`chapa de calibração '${nome}' não existe; use ${Object.keys(CHAPAS).join(', ')}`);
  if (d.tipo === 'quebra-de-curvatura') return [x, y, arco(x, folha === 'esquerda' ? d.raioEsquerdaMm : d.raioDireitaMm)];
  let z = arco(x, RAIO_DA_SECAO_MM);
  if (d.tipo === 'ondulacao') z += d.amplitudeMm * Math.sin((2 * Math.PI * x) / d.comprimentoDeOndaMm);
  if (folha === 'direita' && d.tipo === 'degrau') z -= d.desnivelMm;
  if (folha === 'direita' && d.tipo === 'vinco') {
    /* gira (x, z) em torno do topo da emenda (300, 0), para baixo */
    const a = (-d.anguloGraus * Math.PI) / 180; const dx = x - EMENDA_X_MM;
    return [EMENDA_X_MM + dx * Math.cos(a) - z * Math.sin(a), y, dx * Math.sin(a) + z * Math.cos(a)];
  }
  return [x, y, z];
}

const m = (mm) => Math.round(mm * 1e6) / 1e9;

/** O ponto [x, y, z] girado `giroGraus` em torno do eixo z que passa pelo centro da chapa (300, 200), no sentido de x para y. */
export function girarNoPlano([x, y, z], giroGraus) {
  if (!giroGraus) return [x, y, z];
  const a = (giroGraus * Math.PI) / 180; const dx = x - LARGURA_MM / 2; const dy = y - ALTURA_MM / 2;
  return [LARGURA_MM / 2 + dx * Math.cos(a) - dy * Math.sin(a), ALTURA_MM / 2 + dx * Math.sin(a) + dy * Math.cos(a), z];
}

/** A receita da chapa `nome`: duas `subdivisao` de nível 0 (uma por folha) com espessura, e uma parte por folha. `passoMm` muda a grade
 * (o teste do índice de suavidade mede a mesma chapa em duas densidades); as receitas da pasta usam o padrão de 10 mm. `giroGraus`
 * gira a chapa no próprio plano, em torno do centro dela: a zebra da bancada é de listras horizontais e lê só a inclinação da normal
 * para cima e para baixo, e a chapa sem giro, com a emenda e a onda variando só em x, não muda a zebra em vista nenhuma (estudo de
 * leitura do plano do reflexo, fatia 7); girada a 45 graus, a emenda corre na diagonal e o defeito aparece na faixa. */
export function chapaDeCalibracao(nome, { passoMm = PASSO_MM, giroGraus = 0 } = {}) {
  const defeito = CHAPAS[nome]?.defeito;
  if (!defeito) throw new Error(`chapa de calibração '${nome}' não existe; use ${Object.keys(CHAPAS).join(', ')}`);
  const TOPO = {};
  const folhas = [['esquerda', 0, EMENDA_X_MM], ['direita', EMENDA_X_MM, LARGURA_MM]].map(([folha, x0, x1], k) => {
    const nx = Math.round((x1 - x0) / passoMm); const ny = Math.round(ALTURA_MM / passoMm);
    const nomeDe = (i, j) => `${folha[0]}${i}_${j}`;
    const vertices = []; const faces = [];
    for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) {
      TOPO[nomeDe(i, j)] = girarNoPlano(pontoDaChapa(nome, folha, x0 + i * passoMm, j * passoMm), giroGraus).map(m);
      vertices.push(nomeDe(i, j));
    }
    for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) faces.push([nomeDe(i, j), nomeDe(i + 1, j), nomeDe(i + 1, j + 1), nomeDe(i, j + 1)]);
    return { folha, passo: ['subdivisao', { origemId: k + 1, vertices, faces, cantos: [nomeDe(0, 0), nomeDe(nx, 0), nomeDe(nx, ny), nomeDe(0, ny)], borda: 'cantos', espessura: m(ESPESSURA_MM), niveis: 0 }] };
  });
  return {
    meta: { nome: `reflexo-calibracao/${nome}`, desc: `chapa de calibração do reflexo: ${defeito.tipo === 'nenhum' ? 'lisa, a de controle' : `com ${defeito.tipo} declarado`}` },
    PARAMS: {},
    TOPO: { origem: 'canto da chapa em x = 0 e y = 0, z para fora da pele; a emenda é x = 0,3', ...TOPO },
    PASSOS: [
      ...folhas.map((f) => f.passo),
      ...folhas.map((f, k) => ['parte', { nome: f.folha, sel: { origem: { op: 'subdivisao', id: k + 1 } } }]),
    ],
    PLANO: {
      objeto: 'chapa de 600 por 400 mm e 2 mm de espessura em duas folhas que se encontram em x = 300 mm, com um defeito declarado',
      referencias: [],
      escala: { medida: 'largura da chapa em x', milimetros: LARGURA_MM },
      partes: folhas.map((f) => ({ nome: f.folha, forma: 'folha da chapa de calibração, arco de raio declarado em x', tecnica: 'subdivisao de nível 0 sobre a altura declarada' })),
      criteriosDeReprovacao: ['a chapa tem defeito diferente do declarado em CHAPAS'],
    },
  };
}
