/* razao.js — a razão interseção/união (IoU) entre dois contornos, para medir um desenho contra uma referência que o desenhista não viu.

   Os dois contornos são o formato `mecanifica.contornos@1` (o arquivo inteiro, ou uma região pelo nome) ou uma lista de anéis em
   milímetro. A razão é calculada sobre os polígonos, sem rasterizar: a área da interseção dividida pela área da união. Como o
   desenho e a referência podem ter origens diferentes, a razão sai de três jeitos:

   - sem alinhar, com as origens como estão;
   - alinhada por um ponto declarado em cada contorno (`alinharPor: { a: [h, v], b: [h, v] }`, por exemplo o canto de baixo da
     base), que leva o ponto de `b` sobre o de `a`;
   - alinhada pela melhor translação, que separa o erro de posição do erro de forma.

   O deslocamento de cada jeito é o que se soma a `b` para ele chegar a `a`, em milímetro. A busca da melhor translação parte do
   alinhamento dos centros, das caixas e do ponto declarado e é determinística.

   Dois jeitos de medir o arquivo inteiro (`medida`):

   - `regioes` (o padrão): a união das regiões, sem as `foraDoModelo`. Cada região é a figura dos anéis dela, lida pelo
     preenchimento par-ímpar (um anel dentro de outro é furo), e o vão que as regiões cercam e nenhuma cobre fica de fora. Uma
     barra fina que fecha um vão (a longarina sob o arco da roda) deixa o vão como vão. O desenho e o contorno da imagem gravam
     hoje só o anel de fora de cada pedaço: o vão entre regiões chega à razão, e o furo de uma região só chega quando o arquivo traz
     o anel de dentro entre os pedaços dela.
   - `silhueta`: o anel de fora da silhueta (`silhueta.pedacos[].contornoMm`), que enche todo vão cercado e por isso dá outro número
     que a união das regiões quando há um. É a medida que a ferramenta tinha antes, e a que fica disponível por opção.

   O resultado diz em `medida` a que foi usada, e em `comparada` a outra com os mesmos campos, quando ela dá outro número, para
   ninguém comparar razões de medidas diferentes sem saber. Uma região pelo nome (`parteA`, `parteB`) e uma lista de anéis não
   mudam com a medida. */
import { areasComDeslocamento, deRegioes, maximizarTranslacao } from './booleanas.js';
import { antiHorario, caixaDe } from './geometria.js';
import { ErroDeDesenho, FORMATO_DOS_CONTORNOS } from './formato.js';

export const MEDIDAS_DA_RAZAO = ['regioes', 'silhueta'];

const ehPonto = (p) => Array.isArray(p) && p.length === 2 && p.every(Number.isFinite);
const ehAnel = (a) => Array.isArray(a) && a.length >= 3 && a.every(ehPonto);

function conferirArquivo(entrada, onde) {
  if (!entrada || typeof entrada !== 'object' || entrada.formato !== FORMATO_DOS_CONTORNOS) throw new ErroDeDesenho(`${onde}: deve ser um arquivo "formato": "${FORMATO_DOS_CONTORNOS}" ou uma lista de anéis`);
}

function fonteDoArquivo(entrada, parte, onde) {
  conferirArquivo(entrada, onde);
  const fonte = parte === null ? entrada.silhueta : entrada.regioes?.[parte];
  if (!fonte) throw new ErroDeDesenho(`${onde}: ${parte === null ? 'falta "silhueta"' : `não há a região ${JSON.stringify(parte)}; as regiões são ${Object.keys(entrada.regioes ?? {}).map((n) => JSON.stringify(n)).join(', ')}`}`);
  return fonte;
}

/* Os anéis de fora de uma fonte (a silhueta ou uma região): os pedaços, ou o `contornoMm` quando o arquivo não traz pedaços. */
function aneisDaFonte(fonte, rotulo, onde) {
  const aneis = Array.isArray(fonte?.pedacos) && fonte.pedacos.length ? fonte.pedacos.map((p) => p?.contornoMm) : [fonte?.contornoMm];
  if (!aneis.every(ehAnel)) throw new ErroDeDesenho(`${onde}: ${rotulo} não traz "contornoMm" com 3 ou mais pontos`);
  return aneis;
}

/* Os anéis de um contorno pelo anel de fora: a silhueta (todos os pedaços), ou a região `parte`. */
export function aneisDoContorno(entrada, parte = null, onde = 'o contorno') {
  if (Array.isArray(entrada)) {
    if (!entrada.every(ehAnel)) throw new ErroDeDesenho(`${onde}: uma lista de anéis deve ser [[[h, v], ...], ...], cada anel com 3 ou mais pontos em milímetro`);
    return entrada;
  }
  return aneisDaFonte(fonteDoArquivo(entrada, parte, onde), parte === null ? 'a silhueta' : `a região ${JSON.stringify(parte)}`, onde);
}

/* A forma que a razão mede de um contorno: uma lista de anéis (a que veio, ou o anel de fora da silhueta quando a medida é
   `silhueta`) ou uma forma de regiões. Uma região pelo nome é a figura dos anéis dela, com o furo que ela traga. Sem região pelo
   nome, o arquivo inteiro é a união das regiões que não são `foraDoModelo`; se todas forem, a união delas todas, como a silhueta
   que o desenho grava. */
export function formaDoContorno(entrada, { parte = null, medida = 'regioes' } = {}, onde = 'o contorno') {
  if (Array.isArray(entrada)) return aneisDoContorno(entrada, null, onde);
  if (parte !== null) return deRegioes([aneisDaFonte(fonteDoArquivo(entrada, parte, onde), `a região ${JSON.stringify(parte)}`, onde)]);
  if (medida === 'silhueta') return aneisDoContorno(entrada, null, onde);
  conferirArquivo(entrada, onde);
  const nomes = Object.keys(entrada.regioes ?? {});
  if (!nomes.length) throw new ErroDeDesenho(`${onde}: não traz regiões para somar; a medida "silhueta" mede o anel de fora da silhueta, que o arquivo traz`);
  const dentro = nomes.filter((n) => !entrada.regioes[n]?.foraDoModelo);
  return deRegioes((dentro.length ? dentro : nomes).map((n) => aneisDaFonte(entrada.regioes[n], `a região ${JSON.stringify(n)}`, onde)));
}

const aneisDaForma = (forma) => (Array.isArray(forma) ? forma : forma.regioes.flat()).map(antiHorario);

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

/* As três razões de duas formas. As áreas são as das formas, com os furos descontados. */
async function medirFormas(A, B, alinharPor) {
  const medir = async (d) => { const m = await areasComDeslocamento(A, B, d); return { m, iou: razao(m), deslocamento: d.map(r6) }; };
  const semAlinhar = await medir([0, 0]);
  const porPonto = alinharPor ? await medir([alinharPor.a[0] - alinharPor.b[0], alinharPor.a[1] - alinharPor.b[1]]) : null;

  const planosA = aneisDaForma(A); const planosB = aneisDaForma(B);
  const cA = centro(planosA); const cB = centro(planosB);
  const [a0, a1, a2, a3] = caixaDe(planosA); const [b0, b1, b2, b3] = caixaDe(planosB);
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
  const resultado = ({ iou, deslocamento }) => ({ iou, deslocamento });
  return {
    areaA: r6(semAlinhar.m.a), areaB: r6(semAlinhar.m.b),
    semAlinhar: resultado(semAlinhar), porPonto: porPonto && resultado(porPonto), melhorTranslacao: resultado(melhorTranslacao),
  };
}

/* Duas medidas dão outro número quando alguma das razões difere na quarta casa, a que o comando imprime. A área sozinha não conta:
   com a mesma razão não há número de medida diferente a confundir. */
const casa4 = (x) => Math.round(x * 1e4);
const difere = (p, q) => casa4(p.semAlinhar.iou) !== casa4(q.semAlinhar.iou)
  || casa4(p.melhorTranslacao.iou) !== casa4(q.melhorTranslacao.iou)
  || (p.porPonto && casa4(p.porPonto.iou) !== casa4(q.porPonto.iou));

const arquivoInteiro = (entrada, parte) => !Array.isArray(entrada) && parte === null;

export async function razaoInterseccaoUniao(a, b, { parteA = null, parteB = null, alinharPor = null, medida = 'regioes' } = {}) {
  if (!MEDIDAS_DA_RAZAO.includes(medida)) throw new ErroDeDesenho(`a medida deve ser ${MEDIDAS_DA_RAZAO.map((m) => `"${m}"`).join(' ou ')} (--medida=<nome> no comando), e veio ${JSON.stringify(medida)}`);
  const formas = (m) => [formaDoContorno(a, { parte: parteA, medida: m }, 'o primeiro contorno'), formaDoContorno(b, { parte: parteB, medida: m }, 'o segundo contorno')];
  const [A, B] = formas(medida);
  if (alinharPor && !(ehPonto(alinharPor.a) && ehPonto(alinharPor.b))) throw new ErroDeDesenho('"alinharPor" deve ser { a: [h, v], b: [h, v] }, um ponto de cada contorno em milímetro');
  const principal = await medirFormas(A, B, alinharPor);

  /* A outra medida só existe quando algum lado é o arquivo inteiro. Se ela não puder ser calculada (o arquivo não traz regiões),
     fica sem a comparação: a principal já validou o resto da entrada. */
  let comparada = null;
  if (arquivoInteiro(a, parteA) || arquivoInteiro(b, parteB)) {
    const outra = medida === 'regioes' ? 'silhueta' : 'regioes';
    let medidaOutra = null;
    try { medidaOutra = await medirFormas(...formas(outra), alinharPor); } catch (e) { if (!(e instanceof ErroDeDesenho)) throw e; }
    if (medidaOutra && difere(principal, medidaOutra)) comparada = { medida: outra, ...medidaOutra };
  }
  return { medida, ...principal, comparada };
}
