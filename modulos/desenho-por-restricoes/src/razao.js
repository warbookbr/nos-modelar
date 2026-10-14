/* razao.js — a razão interseção/união (IoU) entre dois contornos, para medir um desenho contra uma referência que o desenhista não viu.

   Os dois contornos são o formato `mecanifica.contornos@1` (a silhueta, ou uma região pelo nome) ou uma lista de anéis em
   milímetro. A razão é calculada sobre os polígonos, sem rasterizar: a área da interseção dividida pela área da união. Como o
   desenho e a referência podem ter origens diferentes, a razão sai de três jeitos:

   - sem alinhar, com as origens como estão;
   - alinhada por um ponto declarado em cada contorno (`alinharPor: { a: [h, v], b: [h, v] }`, por exemplo o canto de baixo da
     base), que leva o ponto de `b` sobre o de `a`;
   - alinhada pela melhor translação, que separa o erro de posição do erro de forma.

   O deslocamento de cada jeito é o que se soma a `b` para ele chegar a `a`, em milímetro. A busca da melhor translação parte do
   alinhamento dos centros, das caixas e do ponto declarado e é determinística. */
import { areaDoAnel, areasComDeslocamento, maximizarTranslacao } from './booleanas.js';
import { caixaDe } from './geometria.js';
import { ErroDeDesenho, FORMATO_DOS_CONTORNOS } from './formato.js';

const ehPonto = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const ehAnel = (a) => Array.isArray(a) && a.length >= 3 && a.every(ehPonto);

/* Os anéis de um contorno: a silhueta (todos os pedaços), ou a região `parte`. */
export function aneisDoContorno(entrada, parte = null, onde = 'o contorno') {
  if (Array.isArray(entrada)) {
    if (!entrada.every(ehAnel)) throw new ErroDeDesenho(`${onde}: uma lista de anéis deve ser [[[h, v], ...], ...], cada anel com 3 ou mais pontos em milímetro`);
    return entrada;
  }
  if (!entrada || typeof entrada !== 'object' || entrada.formato !== FORMATO_DOS_CONTORNOS) throw new ErroDeDesenho(`${onde}: deve ser um arquivo "formato": "${FORMATO_DOS_CONTORNOS}" ou uma lista de anéis`);
  const fonte = parte === null ? entrada.silhueta : entrada.regioes?.[parte];
  if (!fonte) throw new ErroDeDesenho(`${onde}: ${parte === null ? 'falta "silhueta"' : `não há a região ${JSON.stringify(parte)}; as regiões são ${Object.keys(entrada.regioes ?? {}).map((n) => JSON.stringify(n)).join(', ')}`}`);
  const aneis = Array.isArray(fonte.pedacos) && fonte.pedacos.length ? fonte.pedacos.map((p) => p.contornoMm) : [fonte.contornoMm];
  if (!aneis.every(ehAnel)) throw new ErroDeDesenho(`${onde}: ${parte === null ? 'a silhueta' : `a região ${JSON.stringify(parte)}`} não traz "contornoMm" com 3 ou mais pontos`);
  return aneis;
}

const centro = (aneis) => {
  let a = 0; let h = 0; let v = 0;
  for (const anel of aneis) {
    for (let i = 0; i < anel.length; i += 1) {
      const [ah, av] = anel[i]; const [bh, bv] = anel[(i + 1) % anel.length];
      const c = ah * bv - bh * av;
      a += c; h += (ah + bh) * c; v += (av + bv) * c;
    }
  }
  return a === 0 ? [0, 0] : [h / (3 * a), v / (3 * a)];
};

const r6 = (x) => Math.round(x * 1e6) / 1e6 || 0;
const razao = (m) => r6(m.intersecao / m.uniao);

export async function razaoInterseccaoUniao(a, b, { parteA = null, parteB = null, alinharPor = null } = {}) {
  const A = aneisDoContorno(a, parteA, 'o primeiro contorno');
  const B = aneisDoContorno(b, parteB, 'o segundo contorno');
  if (alinharPor && !(ehPonto(alinharPor.a) && ehPonto(alinharPor.b))) throw new ErroDeDesenho('"alinharPor" deve ser { a: [h, v], b: [h, v] }, um ponto de cada contorno em milímetro');
  const medir = async (d) => { const m = await areasComDeslocamento(A, B, d); return { iou: razao(m), deslocamento: d.map(r6) }; };
  const areaA = Math.abs(A.reduce((s, an) => s + areaDoAnel(an), 0)); const areaB = Math.abs(B.reduce((s, an) => s + areaDoAnel(an), 0));
  const semAlinhar = await medir([0, 0]);
  const porPonto = alinharPor ? await medir([alinharPor.a[0] - alinharPor.b[0], alinharPor.a[1] - alinharPor.b[1]]) : null;

  const cA = centro(A); const cB = centro(B);
  const [a0, a1, a2, a3] = caixaDe(A); const [b0, b1, b2, b3] = caixaDe(B);
  const inicios = [
    [cA[0] - cB[0], cA[1] - cB[1]],
    [(a0 + a2) / 2 - (b0 + b2) / 2, (a1 + a3) / 2 - (b1 + b3) / 2],
    [a0 - b0, a1 - b1], [a2 - b2, a1 - b1], [a0 - b0, a3 - b3], [a2 - b2, a3 - b3],
    ...(alinharPor ? [[alinharPor.a[0] - alinharPor.b[0], alinharPor.a[1] - alinharPor.b[1]]] : []),
    [0, 0],
  ];
  const tamanho = Math.max(a2 - a0, a3 - a1, b2 - b0, b3 - b1) || 1;
  const achada = await maximizarTranslacao(A, B, inicios, tamanho / 20, tamanho * 1e-6);
  const melhorTranslacao = await medir(achada.deslocamento.map(r6));
  return { areaA: r6(areaA), areaB: r6(areaB), semAlinhar, porPonto, melhorTranslacao };
}
