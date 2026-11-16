/* chapas.mjs — as chapas de calibração do reflexo: chapas de defeito conhecido, geradas por conta, para provar a continuidade nas emendas,
 * o índice de suavidade e a leitura da zebra (plano do reflexo na bancada, fatias 6 e 7).
 *
 * A CHAPA. 600 mm em x por 400 mm em y, 2 mm de espessura (duas peles e a quina), a pele de fora para +z, numa MALHA SÓ: uma
 * `subdivisao` de nível 0 sobre uma grade de pontos a cada 10 mm, com os vértices compartilhados por todas as faces vizinhas. A seção em
 * x é um arco de raio 1,5 m com o topo em x = 300 mm (a curvatura de 0,667 1/m); a seção em y é reta. A subdivisão é de nível 0 para a
 * malha SER a altura declarada nos vértices: a subdivisão arredondaria o vinco e o degrau, e o defeito medido seria o que ela deixou.
 *
 * A LINHA DO DEFEITO. Nas chapas de emenda (degrau, vinco e quebra de curvatura) o defeito fica na linha x = 300 mm ao longo de y, e a
 * chapa tem duas partes, `esquerda` (x de 0 a 300) e `direita` (x de 300 a 600), sobre a mesma malha soldada: as duas partes
 * compartilham os vértices da linha (no degrau, a parede de 1,5 mm do desnível liga as duas), e a fronteira entre elas é o que a
 * continuidade nas emendas e o índice de suavidade leem como emenda. A lisa e as onduladas são uma parte só, `chapa`, sem emenda
 * nenhuma. Até 2026-11-16 as chapas eram duas folhas não soldadas, e a normal da borda livre de cada uma fazia um dente na faixa da
 * zebra na linha do meio, também na lisa; a prova cega da leitura leu esse dente como defeito (estudo no banco de provas do reflexo).
 *
 * O DEFEITO de cada chapa está em `CHAPAS[nome].defeito`, legível por teste (e reexportado como `DEFEITO` por cada `receita.js`):
 * - `lisa`: nenhum (a de controle);
 * - `degrau` (G0): a parte direita desce `desnivelMm` (1,5 mm) em -z, para dentro, ligada à esquerda pela parede do desnível;
 * - `vinco` (G1): a parte direita gira `anguloGraus` (6 graus) em torno da linha x = 300, para baixo; posição contínua, tangente quebrada;
 * - `quebra-de-curvatura` (G2): a parte esquerda é um arco de raio 0,5 m e a direita, de 1,5 m, os dois com o topo na linha; posição e
 *   tangente contínuas, a curvatura salta de 2 para 0,667 1/m, a razão `razaoDeCurvatura` 3;
 * - `ondulada-025`, `ondulada-050`, `ondulada-100`: a chapa lisa com uma ondulação senoidal em x de comprimento de onda 100 mm e amplitude
 *   `amplitudeMm` 0,25, 0,5 e 1 mm, as cristas em y.
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
  lisa: { defeito: { tipo: 'nenhum' } },
  degrau: { defeito: { tipo: 'degrau', continuidade: 'G0', emendaXMm: EMENDA_X_MM, desnivelMm: 1.5, folgaMm: 0, frestaMm: 1.5, lado: 'direita desce, para dentro' } },
  vinco: { defeito: { tipo: 'vinco', continuidade: 'G1', emendaXMm: EMENDA_X_MM, anguloGraus: 6, lado: 'direita gira para baixo em torno da emenda' } },
  'quebra-de-curvatura': { defeito: { tipo: 'quebra-de-curvatura', continuidade: 'G2', emendaXMm: EMENDA_X_MM, raioEsquerdaMm: 500, raioDireitaMm: 1500, curvaturaEsquerda: 2, curvaturaDireita: 2 / 3, razaoDeCurvatura: 3 } },
  'ondulada-025': { defeito: { tipo: 'ondulacao', amplitudeMm: 0.25, comprimentoDeOndaMm: COMPRIMENTO_DE_ONDA_MM, direcao: 'x' } },
  'ondulada-050': { defeito: { tipo: 'ondulacao', amplitudeMm: 0.5, comprimentoDeOndaMm: COMPRIMENTO_DE_ONDA_MM, direcao: 'x' } },
  'ondulada-100': { defeito: { tipo: 'ondulacao', amplitudeMm: 1, comprimentoDeOndaMm: COMPRIMENTO_DE_ONDA_MM, direcao: 'x' } },
});

/** O ponto [x, y, z] em mm da pele de fora da chapa `nome` no ponto (x, y) da grade, do lado `esquerda` (x até 300) ou `direita` (x de
 * 300 em diante) da linha do defeito; os dois lados dão o mesmo ponto em x = 300, menos no degrau, cuja parede liga os dois. */
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

/** A chapa tem emenda (duas partes sobre a malha soldada) quando o defeito declarado fica numa linha: degrau, vinco e quebra de curvatura. */
export const temEmenda = (nome) => CHAPAS[nome]?.defeito?.emendaXMm !== undefined;

/** O ponto [x, y, z] girado `giroGraus` em torno do eixo z que passa pelo centro da chapa (300, 200), no sentido de x para y. */
export function girarNoPlano([x, y, z], giroGraus) {
  if (!giroGraus) return [x, y, z];
  const a = (giroGraus * Math.PI) / 180; const dx = x - LARGURA_MM / 2; const dy = y - ALTURA_MM / 2;
  return [LARGURA_MM / 2 + dx * Math.cos(a) - dy * Math.sin(a), ALTURA_MM / 2 + dx * Math.sin(a) + dy * Math.cos(a), z];
}

/* a folga, em m, das caixas que separam as duas partes: menor que um passo da grade e maior que o que a espessura move a pele de dentro */
const FOLGA_DA_PARTE_M = 0.005;
const FOLGA_DA_PAREDE_M = 0.002;

/** A receita da chapa `nome`: uma `subdivisao` de nível 0 com espessura sobre a grade inteira, e as partes (uma, `chapa`, ou duas,
 * `esquerda` e `direita`, separadas por caixa em x antes do giro). `passoMm` muda a grade (o teste do índice de suavidade mede a mesma
 * chapa em duas densidades); as receitas da pasta usam o padrão de 10 mm. `giroGraus` gira a chapa no próprio plano, em torno do centro
 * dela, com um `rotaciona` no fim: com a listra da zebra no ângulo padrão (horizontal), a chapa sem giro, com a linha do defeito e a onda
 * variando só em x, quase não muda a zebra; girada a 45 graus, a linha corre na diagonal e o defeito aparece na faixa (estudo de leitura
 * do plano do reflexo, fatia 7). */
export function chapaDeCalibracao(nome, { passoMm = PASSO_MM, giroGraus = 0 } = {}) {
  const defeito = CHAPAS[nome]?.defeito;
  if (!defeito) throw new Error(`chapa de calibração '${nome}' não existe; use ${Object.keys(CHAPAS).join(', ')}`);
  const emenda = temEmenda(nome);
  /* as colunas da grade em x, com o lado de cada uma; o degrau tem duas colunas em x = 300, a de cima (esquerda) e a de baixo (direita),
     e as faces entre elas são a parede do desnível */
  const nE = Math.round(EMENDA_X_MM / passoMm); const nD = Math.round((LARGURA_MM - EMENDA_X_MM) / passoMm); const ny = Math.round(ALTURA_MM / passoMm);
  const colunas = [];
  for (let i = 0; i <= nE; i++) colunas.push(['esquerda', i * passoMm]);
  for (let i = defeito.tipo === 'degrau' ? 0 : 1; i <= nD; i++) colunas.push(['direita', EMENDA_X_MM + i * passoMm]);
  const nomeDe = (c, j) => `v${c}_${j}`;
  const TOPO = {}; const vertices = []; const faces = [];
  colunas.forEach(([lado, x], c) => {
    for (let j = 0; j <= ny; j++) { TOPO[nomeDe(c, j)] = pontoDaChapa(nome, lado, x, j * passoMm).map(m); vertices.push(nomeDe(c, j)); }
  });
  for (let c = 0; c + 1 < colunas.length; c++) for (let j = 0; j < ny; j++) faces.push([nomeDe(c, j), nomeDe(c + 1, j), nomeDe(c + 1, j + 1), nomeDe(c, j + 1)]);
  const ultima = colunas.length - 1;
  const caixa = (x0, x1) => ({ regiao: { min: [x0, -1, -1], max: [x1, 1, 1] } });
  const xm = m(EMENDA_X_MM);
  /* a parede do degrau é uma parte à parte: a normal dela é perpendicular à da chapa, e no ajuste de um lado da continuidade nas emendas
     os vértices dela entrariam como se fossem da folha; a caixa de cada parte seguinte toma do dono anterior só as faces que ela contém */
  const partes = emenda
    ? [
      ['esquerda', caixa(-1, xm + FOLGA_DA_PARTE_M)],
      ['direita', caixa(xm - FOLGA_DA_PARTE_M, 1)],
      ...(defeito.tipo === 'degrau' ? [['parede', caixa(xm - FOLGA_DA_PAREDE_M, xm + FOLGA_DA_PAREDE_M)]] : []),
    ]
    : [['chapa', { tudo: true }]];
  const centro = [m(LARGURA_MM / 2), m(ALTURA_MM / 2), 0];
  return {
    meta: { nome: `reflexo-calibracao/${nome}`, desc: `chapa de calibração do reflexo: ${defeito.tipo === 'nenhum' ? 'lisa, a de controle' : `com ${defeito.tipo} declarado`}` },
    PARAMS: {},
    TOPO: { origem: 'canto da chapa em x = 0 e y = 0, z para fora da pele; a linha do defeito é x = 0,3', ...TOPO },
    PASSOS: [
      ['subdivisao', { origemId: 1, vertices, faces, cantos: [nomeDe(0, 0), nomeDe(ultima, 0), nomeDe(ultima, ny), nomeDe(0, ny)], borda: 'cantos', espessura: m(ESPESSURA_MM), niveis: 0 }],
      ...partes.map(([parte, sel], k) => ['parte', { nome: parte, sel, ...(k ? { substituir: true } : {}) }]),
      ...(giroGraus ? [['rotaciona', { eixo: 'z', graus: giroGraus, pivo: centro }]] : []),
    ],
    PLANO: {
      objeto: `chapa de 600 por 400 mm e 2 mm de espessura numa malha só${emenda ? ', em duas partes que se encontram em x = 300 mm' : ''}, com um defeito declarado`,
      referencias: [],
      escala: { medida: 'largura da chapa em x', milimetros: LARGURA_MM },
      partes: partes.map(([parte]) => ({ nome: parte, forma: parte === 'parede' ? 'a parede do desnível do degrau, em x = 300 mm' : 'chapa de calibração, arco de raio declarado em x', tecnica: 'subdivisao de nível 0 sobre a altura declarada' })),
      criteriosDeReprovacao: ['a chapa tem defeito diferente do declarado em CHAPAS'],
    },
  };
}
