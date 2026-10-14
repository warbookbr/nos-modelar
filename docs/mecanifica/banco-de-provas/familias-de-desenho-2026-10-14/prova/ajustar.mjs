/* ajustar.mjs — a família da carcaça ajustada ao contorno da foto, para separar o que a família alcança do que a descrição deu.

   Descida por coordenada sobre os quinze parâmetros: cada um anda um passo para cima e para baixo, fica o que aumenta a razão
   interseção/união pela melhor translação (a união das regiões, como `npm run desenho -- razao`), e o passo cai à metade quando
   nenhum melhora. O conjunto que fere uma relação de ordem da família, não resolve ou cruza uma parte é recusado. No modo `faixa`
   cada parâmetro fica na faixa da família; no modo `aberta`, de 0,6 a 1,4 vez o médio (15 a 65 graus na rampa), para ver até onde
   a forma da família chega sem a faixa. É determinístico. Grava `<pasta>/ajuste.json` e `<pasta>/lateral.desenho.json`; depois
   `npm run desenho -- <pasta>/lateral.desenho.json` grava os contornos e a vista.

   Uso, da raiz do repositório:
   node docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/prova/ajustar.mjs faixa <pasta> [inicio/ajuste.json]
   node docs/mecanifica/banco-de-provas/familias-de-desenho-2026-10-14/prova/ajustar.mjs aberta <pasta> [inicio/ajuste.json] */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const raiz = process.cwd();
const modulo = (p) => import(pathToFileURL(resolve(raiz, p)).href);
const M = await modulo('modulos/desenho-por-restricoes/src/index.js');
const { formaDoContorno } = await modulo('modulos/desenho-por-restricoes/src/razao.js');
const { maximizarTranslacao } = await modulo('modulos/desenho-por-restricoes/src/booleanas.js');

const [modo, pasta, inicio] = process.argv.slice(2);
if (!['faixa', 'aberta'].includes(modo) || !pasta) { console.error('uso: node ajustar.mjs <faixa|aberta> <pasta> [inicio/ajuste.json]'); process.exit(2); }
const arquivoDaFamilia = resolve(raiz, 'procedural/familias-de-desenho/carcaca-empilhadeira/carcaca-empilhadeira.familia-de-desenho.json');
const json = JSON.parse(readFileSync(arquivoDaFamilia, 'utf8'));
const { pecas } = M.lerCatalogoDePecas(JSON.parse(readFileSync(resolve(dirname(arquivoDaFamilia), json.catalogo), 'utf8')));
const { erros, familia } = M.lerFamiliaDeDesenho(json, { pecas });
if (erros.length) throw new Error(erros.join('\n'));
const foto = JSON.parse(readFileSync(resolve(raiz, 'docs/mecanifica/banco-de-provas/empilhadeira-2026-10-14/referencias/empilhadeira_lateral.contornos.json'), 'utf8'));
const A = formaDoContorno(foto);

const P = familia.parametros;
const nomes = Object.keys(P);
const limite = Object.fromEntries(nomes.map((n) => [n, modo === 'faixa' ? [P[n].minimo, P[n].maximo]
  : P[n].unidade === 'graus' ? [15, 65] : [P[n].medio * 0.6, P[n].medio * 1.4]]));
let valores = inicio ? JSON.parse(readFileSync(resolve(raiz, inicio), 'utf8')).valores : Object.fromEntries(nomes.map((n) => [n, P[n].padrao]));
let deslocamento = [270, 40];
let avaliacoes = 0;

async function medir(v) {
  avaliacoes += 1;
  if (M.restricoesFeridas(familia, v).length) return null;
  let r;
  try { r = await M.desenhar(M.especializarFamilia(familia, v, { pecas })); } catch { return null; }
  if (!r.relatorio.resolvido || !r.contornos || r.relatorio.cruzadas.length) return null;
  return maximizarTranslacao(A, formaDoContorno(r.contornos), [deslocamento], 20, 0.5);
}

let melhor = await medir(valores);
if (!melhor) throw new Error('o conjunto de início não desenha');
deslocamento = melhor.deslocamento;
console.log(`início ${melhor.iou.toFixed(4)}`);
let passo = 0.15;
while (passo > 0.004 && avaliacoes < 900) {
  let melhorou = false;
  for (const n of nomes) {
    const largura = limite[n][1] - limite[n][0];
    for (const sinal of [1, -1]) {
      const v = Math.min(limite[n][1], Math.max(limite[n][0], valores[n] + sinal * passo * largura));
      if (v === valores[n]) continue;
      const candidato = { ...valores, [n]: Math.round(v * 10) / 10 };
      const q = await medir(candidato);
      if (q && q.iou > melhor.iou + 1e-5) {
        valores = candidato; melhor = q; deslocamento = q.deslocamento; melhorou = true;
        console.log(`${n} = ${candidato[n]} -> ${q.iou.toFixed(4)} (passo ${passo.toFixed(3)}, avaliação ${avaliacoes})`);
        break;
      }
    }
  }
  if (!melhorou) passo /= 2;
}

const noLimite = nomes.filter((n) => valores[n] <= P[n].minimo || valores[n] >= P[n].maximo);
const foraDaFaixa = nomes.filter((n) => valores[n] < P[n].minimo || valores[n] > P[n].maximo)
  .map((n) => ({ parametro: n, valor: valores[n], minimo: P[n].minimo, maximo: P[n].maximo }));
mkdirSync(resolve(raiz, pasta), { recursive: true });
writeFileSync(resolve(raiz, pasta, 'ajuste.json'), `${JSON.stringify({ modo, iou: melhor.iou, deslocamento: melhor.deslocamento, avaliacoes, valores, noLimite, foraDaFaixa }, null, 1)}\n`);
writeFileSync(resolve(raiz, pasta, 'lateral.desenho.json'), `${JSON.stringify(M.especializarFamilia(familia, valores, { pecas }), null, 1)}\n`);
console.log(`fim ${melhor.iou.toFixed(4)} em ${avaliacoes} avaliações; no limite da faixa: ${noLimite.join(', ') || 'nenhum'}`);
