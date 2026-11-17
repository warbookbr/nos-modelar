/* analiticas.mjs — a medida do gate de continuidade da fatia 5 sobre as superfícies analíticas de `chapas.mjs`: a rede de quatro retalhos
 * de `definicaoAnalitica`, montada pelo passo `subdivisao` (`gaiolaDoPasso`, com as cotas aplicadas), e a superfície limite dela avaliada
 * pelo oráculo exato (`superficieLimite`) em 16 pontos por face da gaiola, contra a distância exata à superfície analítica.
 *
 * Devolve, por superfície e opção de continuidade (sem nenhuma, 'G1' e 'G2' nas duas curvas de dentro), a maior distância (mm) à superfície
 * analítica na chapa inteira e a mais de `DENTRO_DA_BORDA_MM` da borda livre, e o maior deslocamento (mm) da superfície limite em relação à
 * mesma rede sem a opção, ponto a ponto no mesmo parâmetro. Uso: node tools/fixtures/correcao-de-superficie/analiticas.mjs */
import { pathToFileURL } from 'node:url';
import { gaiolaPorRede } from '../../../procedural/nucleo/gaiola-por-rede.js';
import { gaiolaDoPasso } from '../../../procedural/nucleo/operacoes/subdivisao.js';
import { superficieLimite } from '../../../procedural/nucleo/subdivisao.js';
import { SUPERFICIES_ANALITICAS, definicaoAnalitica } from './chapas.mjs';

export const OPCOES_DE_CONTINUIDADE = Object.freeze([null, 'G1', 'G2']);
/** duas arestas da gaiola de 25 mm: a faixa da borda livre em que a regra de borda da subdivisão zera a curvatura que atravessa a borda */
export const DENTRO_DA_BORDA_MM = 50;
const PARAMETROS = [0, 0.25, 0.5, 0.75];

/** a superfície limite da rede analítica `nome` com a opção `continuidade`, amostrada: os pontos (mm), na ordem das faces e do parâmetro */
export function amostrasAnaliticas(nome, continuidade, extra = {}) {
  const g = gaiolaPorRede({ ...definicaoAnalitica(nome, { continuidade }), ...extra });
  const r = gaiolaDoPasso(g.passo, { vec: (p) => (typeof p === 'string' ? g.pontos[p] : p), num: Number });
  if (r.erro) throw new Error(r.erro.join(': '));
  const sup = superficieLimite({ ...r.gaiola, borda: 'suave' });
  const pontos = [];
  r.gaiola.faces.forEach((f, fi) => { for (const u of PARAMETROS) for (const v of PARAMETROS) pontos.push(sup.avaliar(fi, u, v).ponto.map((c) => c * 1000)); });
  return { rede: g, pontos };
}

const arred = (x) => Math.round(x * 1e4) / 1e4;

/** medirAnaliticas() -> [{ superficie, continuidade, distanciaMm, distanciaDentroMm, deslocamentoMm }] */
export function medirAnaliticas({ superficies = Object.keys(SUPERFICIES_ANALITICAS), opcoes = OPCOES_DE_CONTINUIDADE } = {}) {
  const saida = [];
  for (const nome of superficies) {
    const S = SUPERFICIES_ANALITICAS[nome];
    const base = amostrasAnaliticas(nome, null).pontos;
    for (const c of opcoes) {
      const { pontos } = c === null ? { pontos: base } : amostrasAnaliticas(nome, c);
      if (pontos.length !== base.length) throw new Error(`${nome} ${c}: a opção mudou a topologia da gaiola`);
      let distancia = 0, dentro = 0, deslocamento = 0;
      pontos.forEach((p, k) => {
        const d = Math.abs(S.distancia(p));
        distancia = Math.max(distancia, d);
        if (S.aBorda(p) >= DENTRO_DA_BORDA_MM) dentro = Math.max(dentro, d);
        deslocamento = Math.max(deslocamento, Math.hypot(p[0] - base[k][0], p[1] - base[k][1], p[2] - base[k][2]));
      });
      saida.push({ superficie: nome, continuidade: c, distanciaMm: arred(distancia), distanciaDentroMm: arred(dentro), deslocamentoMm: arred(deslocamento) });
    }
  }
  return saida;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  for (const m of medirAnaliticas()) console.log(`${m.superficie.padEnd(12)} ${String(m.continuidade ?? 'nenhuma').padEnd(8)} distância ${m.distanciaMm} mm (a ${DENTRO_DA_BORDA_MM} mm da borda, ${m.distanciaDentroMm}), deslocamento pela opção ${m.deslocamentoMm} mm`);
}
