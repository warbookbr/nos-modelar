#!/usr/bin/env node
/* preparar-prova-cega.mjs — os pedidos da prova cega da leitura do reflexo (plano do reflexo na bancada, fatia 7).
 *
 * Para cada chapa de calibração (`tools/fixtures/reflexo-calibracao/chapas.mjs`), girada 45 graus no próprio plano, gera uma receita de
 * nome neutro, com o PLANO dizendo só "chapa abaulada de prova", captura a zebra com a listra deitada e em pé (`--angulo-da-zebra=90`)
 * e a pintura, enquadradas nas vistas frontal, isometrica e tresquartos, como o pacote de lataria de `vistas:critica` as captura
 * (`CAPTURAS_DO_REFLEXO`), copia as imagens com nomes neutros e escreve um `pedido.md` com a seção Reflexo que esse pedido traz
 * (`secaoDoReflexo`). O nome da chapa e o defeito ficam só no gabarito, fora das pastas dos pedidos.
 *
 * Segunda rodada (2026-11-16): as chapas numa malha só, sem a borda livre na linha do meio, a zebra nas duas direções e as letras
 * embaralhadas de novo. Terceira rodada (2026-11-16): a leitura curta diz que linhas paralelas e igualmente espaçadas são
 * uma onda e separa o degrau do vinco pela direção da faixa dos dois lados, e as letras embaralhadas outra vez.
 *
 * Uso: node docs/modelar/banco-de-provas/reflexo-na-bancada-2026-11-15/preparar-prova-cega.mjs
 *   Saída em tmp/prova-cega/: pedidos/chapa-<letra>/pedido.md e as imagens, e gabarito.json. */
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { comoCLI } from '../../../../tools/modelar/olhar-bancada.mjs';
import { CHAPAS } from '../../../../tools/fixtures/reflexo-calibracao/chapas.mjs';
import { CAPTURAS_DO_REFLEXO, secaoDoReflexo } from '../../../../tools/modelar/vistas-para-critica.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const BASE = join(REPO, 'tmp/prova-cega');
const VISTAS = ['frontal', 'isometrica', 'tresquartos'];
const GIRO = 45;
/* a ordem das letras é fixa e não segue a de CHAPAS, para a letra não dizer a chapa */
const LETRAS = { 'ondulada-050': 'a', vinco: 'b', degrau: 'c', 'ondulada-100': 'd', lisa: 'e', 'quebra-de-curvatura': 'f', 'ondulada-025': 'g' };

/* onde fica a linha do defeito, nas imagens, para o gabarito: a linha do meio da chapa, perpendicular ao arco */
const LUGAR_DA_EMENDA = 'a linha reta pelo centro da chapa que liga o meio dos dois lados maiores: na vista frontal, a diagonal que desce da esquerda para a direita, de perto de (0,3; 0,3) a (0,7; 0,7) do quadro (a linha x = 300 mm da chapa girada 45 graus)';
const lugar = (d) => (d.tipo === 'nenhum' ? 'nenhum' : d.tipo === 'ondulacao'
  ? `a chapa inteira: ${Math.round(600 / d.comprimentoDeOndaMm)} ondas de ${d.comprimentoDeOndaMm} mm de comprimento e ${String(d.amplitudeMm).replace('.', ',')} mm de amplitude, com as cristas paralelas à diagonal do centro`
  : LUGAR_DA_EMENDA);

/* o que o estudo mediu e o crítico pode ler diferente do declarado */
const NOTAS = {
  lisa: 'numa malha só, sem emenda: a zebra e a pintura não têm linha nenhuma no meio (o salto da listra na linha, medido sem comparar com outra chapa, fica abaixo de 1 px de frente); qualquer defeito apontado é engano',
  degrau: 'a faixa atravessa a linha sem salto; o que aparece é a parede do desnível como traço fino na linha do meio nas vistas oblíquas: ler "traço fino na linha do meio, sem salto da faixa" é o acerto',
};
rmSync(BASE, { recursive: true, force: true });
const gabarito = { rodada: 2, giroGraus: GIRO, vistas: VISTAS, zebra: 'deitada (0 grau) e em pé (90 graus)', chapas: {} };
for (const [nome, letra] of Object.entries(LETRAS)) {
  const pasta = join(BASE, 'receitas', `chapa-${letra}`);
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, 'receita.js'), [
    "import { chapaDeCalibracao } from '../../../../tools/fixtures/reflexo-calibracao/chapas.mjs';",
    `const base = chapaDeCalibracao('${nome}', { giroGraus: ${GIRO} });`,
    'export default {',
    '  ...base,',
    `  meta: { nome: 'chapa-${letra}', desc: 'chapa abaulada de prova' },`,
    "  TOPO: { ...base.TOPO, origem: 'canto da chapa, z para fora da pele' },",
    "  PLANO: { objeto: 'chapa abaulada de prova', referencias: [], escala: { medida: 'lado maior da chapa', milimetros: 600 }, partes: base.PLANO.partes.map((p) => ({ nome: p.nome, forma: 'chapa abaulada', tecnica: 'subdivisao' })), criteriosDeReprovacao: [] },",
    '};', '',
  ].join('\n'));
  const saida = join(BASE, 'capturas', `chapa-${letra}`);
  const imagens = {};
  for (const { chave, visao, anguloDaZebra } of CAPTURAS_DO_REFLEXO) {
    const r = await comoCLI([relative(REPO, pasta), `--vistas=${VISTAS.join(',')}`, '--enquadrar', '--sem-contatos', '--res=900x900', `--visao=${visao}`, ...(anguloDaZebra !== null ? [`--angulo-da-zebra=${anguloDaZebra}`] : []), `--saida=${relative(REPO, join(saida, chave))}`]);
    if (r.codigo !== 0) throw new Error(`${letra} ${chave}: ${r.stderr}`);
    const destino = join(BASE, 'pedidos', `chapa-${letra}`);
    mkdirSync(destino, { recursive: true });
    imagens[chave] = VISTAS.map((vista) => {
      const origem = readdirSync(join(saida, chave)).find((f) => f.includes(`-${vista}-`) && f.endsWith('.png'));
      const arquivo = join(destino, `${chave}-${vista}.png`);
      copyFileSync(join(saida, chave, origem), arquivo);
      return { arquivo, vista };
    });
  }
  const pedido = [
    `# Pedido ao crítico visual: chapa-${letra}`, '',
    'Abra com `Read` cada imagem citada abaixo e olhe; não leia nenhum outro arquivo. Todos os caminhos são absolutos.', '',
    '## Objeto', '', 'chapa abaulada de prova', '', 'Escala: lado maior da chapa, 600 mm.', '',
    '## Modelo', '',
    'As vistas olham destes lados: frontal, de frente para a pele de fora da chapa; isometrica, de cima, da direita e da frente; '
    + 'tresquartos, de três quartos pela frente, um pouco de cima.', '',
    ...secaoDoReflexo(Object.fromEntries(Object.entries(imagens).map(([chave, lista]) => [chave, { imagens: lista, fora: [] }]))),
    '## O que responder', '',
    'Diga se a chapa tem defeito de superfície. Para cada defeito: o tipo (degrau, vinco, quebra de curvatura, ondulação, amassado ou '
    + 'outro, dito com as suas palavras), o lugar na chapa (em fração da imagem ou pela forma da chapa: centro, canto, diagonal, borda), '
    + 'a vista e a imagem em que o viu e o que a faixa faz ali. Se não achar defeito, diga isso.', '',
  ];
  writeFileSync(join(BASE, 'pedidos', `chapa-${letra}`, 'pedido.md'), `${pedido.join('\n')}\n`);
  gabarito.chapas[`chapa-${letra}`] = { chapa: nome, defeito: CHAPAS[nome].defeito, lugar: lugar(CHAPAS[nome].defeito), ...(NOTAS[nome] ? { nota: NOTAS[nome] } : {}) };
  process.stderr.write(`pedido chapa-${letra}\n`);
}
writeFileSync(join(BASE, 'gabarito.json'), `${JSON.stringify(gabarito, null, 2)}\n`);
for (const letra of Object.values(LETRAS).sort()) process.stdout.write(`${join(BASE, 'pedidos', `chapa-${letra}`, 'pedido.md')}\n`);
process.stdout.write(`gabarito: ${join(BASE, 'gabarito.json')}\n`);
