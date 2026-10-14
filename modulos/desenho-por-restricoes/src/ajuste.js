/* ajuste.js — a família de desenho ajustada a uma referência: os valores dos parâmetros que dão a maior razão interseção/união contra
   o contorno dela, e quais deles ficam no limite da faixa ou fora dela.

   A prova da família numa empilhadeira nova mostrou que a família feita de uma referência só não cobre outra da mesma classe, e
   que separar o que a família alcança do que uma descrição deu pede o ajuste direto à referência. O ajuste também diz de quanto a
   faixa precisa crescer para a família cobrir uma referência nova: com a faixa aberta (`abrir`), o valor que sai de um parâmetro
   fora da faixa é o que a faixa precisa alcançar.

   A busca é uma descida por coordenada, determinística: cada parâmetro solto anda um passo para cima e para baixo, fica o primeiro
   passo que aumenta a razão, e o passo cai à metade quando nenhum parâmetro melhora. O passo é uma fração da largura da busca de
   cada parâmetro, de `passoInicial` a `passoMinimo`, e o valor anda numa grade de um milésimo dessa largura, arredondada para a
   casa decimal. A razão é a da ferramenta (`razao.js`), contra a união das regiões, pela melhor translação: a primeira avaliação
   procura a translação a partir dos centros e das caixas, e as seguintes partem da melhor anterior. O conjunto que fere uma
   relação de ordem da família, que o desenho recusa ou que a prova reprovaria (não resolve, cruza um polígono, esconde uma parte,
   vira uma peça) não entra.

   A busca de cada parâmetro vai da faixa da família, ou, com `abrir`, da faixa alargada de `abrir` vezes o médio dele (a largura da
   faixa, quando o médio é zero) para cada lado. A descida acha um máximo local: o início (`inicio`, um conjunto de valores) decide
   qual, e começar de outro perfil pode dar outro. Puro, sem ler nem gravar arquivo. */
import { maximizarTranslacao } from './booleanas.js';
import { desenhar } from './desenhar.js';
import { casasDaFaixa, especializarFamilia, problemasDoDesenho, restricoesFeridas } from './familia.js';
import { ErroDeDesenho } from './formato.js';
import { formaDoContorno, razaoInterseccaoUniao } from './razao.js';
import { caixaDe } from './geometria.js';

const q = (s) => JSON.stringify(s);

/* A faixa da busca de um parâmetro: a da família, ou ela alargada de `abrir` vezes o médio para cada lado. */
function limitesDaBusca(p, abrir) {
  if (!abrir) return [p.minimo, p.maximo];
  const r = abrir * (Math.abs(p.medio) || p.maximo - p.minimo);
  return [p.minimo - r, p.maximo + r];
}

const naGrade = (v, casas) => Number(v.toFixed(casas));

/* Ajusta a família ao contorno `alvo` (um arquivo `mecanifica.contornos@1`). Devolve `{ iou, deslocamento, valores, avaliacoes,
   recusados, noLimite, foraDaFaixa, inicio }`: a razão pela melhor translação, a translação do desenho até o alvo em milímetro, os
   valores de todos os parâmetros, quantos conjuntos foram desenhados e quantos não entraram, os parâmetros que ficaram no mínimo
   ou no máximo da faixa da família, os que ficaram fora dela (só com `abrir`) e a razão do início. `aoMelhorar` recebe cada passo
   que melhora, para o comando mostrar o andamento. */
export async function ajustarFamilia(familia, alvo, {
  pecas = {}, inicio = null, soltos = null, abrir = 0, medida = 'regioes',
  passoInicial = 0.15, passoMinimo = 0.004, maxAvaliacoes = 1500, aoMelhorar = null,
} = {}) {
  if (!(Number.isFinite(abrir) && abrir >= 0)) throw new ErroDeDesenho(`"abrir" deve ser um número maior ou igual a zero (a fração do médio que a busca alarga cada faixa para cada lado), e veio ${q(abrir)}`);
  const P = familia.parametros;
  const nomes = soltos ?? Object.keys(P);
  for (const n of nomes) if (!Object.hasOwn(P, n)) throw new ErroDeDesenho(`o parâmetro ${q(n)} não existe na família (os parâmetros são ${Object.keys(P).map(q).join(', ')})`);
  const limites = Object.fromEntries(nomes.map((n) => [n, limitesDaBusca(P[n], abrir)]));
  const casas = Object.fromEntries(nomes.map((n) => [n, casasDaFaixa(limites[n][1] - limites[n][0])]));
  let valores = { ...Object.fromEntries(Object.entries(P).map(([n, p]) => [n, p.padrao])), ...(inicio ?? {}) };
  const A = formaDoContorno(alvo, { medida }, 'o contorno da referência');
  const caixaA = caixaDe((Array.isArray(A) ? A : A.regioes.flat()));
  const tamanho = Math.max(caixaA[2] - caixaA[0], caixaA[3] - caixaA[1]) || 1;

  let avaliacoes = 0; let recusados = 0; let deslocamento = null;
  async function medir(v) {
    avaliacoes += 1;
    if (restricoesFeridas(familia, v).length) { recusados += 1; return null; }
    let r;
    try { r = await desenhar(especializarFamilia(familia, v, { pecas })); } catch (e) {
      if (!(e instanceof ErroDeDesenho)) throw e;
      recusados += 1; return null;
    }
    if (!r.contornos || problemasDoDesenho(r.relatorio).length) { recusados += 1; return null; }
    if (!deslocamento) {
      const m = await razaoInterseccaoUniao(alvo, r.contornos, { medida });
      return { iou: m.melhorTranslacao.iou, deslocamento: m.melhorTranslacao.deslocamento };
    }
    const achada = await maximizarTranslacao(A, formaDoContorno(r.contornos, { medida }), [deslocamento], tamanho / 100, tamanho * 2e-4);
    return { iou: achada.iou, deslocamento: achada.deslocamento };
  }

  let melhor = await medir(valores);
  if (!melhor) throw new ErroDeDesenho('o conjunto de início não desenha: ele fere uma relação de ordem da família ou a prova o reprovaria; comece de um perfil que a prova desenha');
  deslocamento = melhor.deslocamento;
  const noInicio = melhor.iou;
  let passo = passoInicial;
  while (passo >= passoMinimo && avaliacoes < maxAvaliacoes) {
    let melhorou = false;
    for (const n of nomes) {
      const [lo, hi] = limites[n];
      for (const sinal of [1, -1]) {
        const v = Math.min(hi, Math.max(lo, naGrade(valores[n] + sinal * passo * (hi - lo), casas[n])));
        if (v === valores[n]) continue;
        const candidato = { ...valores, [n]: v };
        const m = await medir(candidato);
        if (m && m.iou > melhor.iou + 1e-6) {
          valores = candidato; melhor = m; deslocamento = m.deslocamento; melhorou = true;
          aoMelhorar?.({ parametro: n, valor: v, iou: m.iou, passo, avaliacoes });
          break;
        }
      }
    }
    if (!melhorou) passo /= 2;
  }
  const noLimite = Object.keys(P).filter((n) => valores[n] === P[n].minimo || valores[n] === P[n].maximo);
  const foraDaFaixa = Object.keys(P).filter((n) => valores[n] < P[n].minimo || valores[n] > P[n].maximo)
    .map((n) => ({ parametro: n, valor: valores[n], minimo: P[n].minimo, maximo: P[n].maximo, unidade: P[n].unidade }));
  return { iou: melhor.iou, deslocamento: melhor.deslocamento, valores, avaliacoes, recusados, noLimite, foraDaFaixa, inicio: noInicio, medida, abrir };
}
