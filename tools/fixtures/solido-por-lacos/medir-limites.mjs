#!/usr/bin/env node
/* medir-limites.mjs — imprime, em JSON, as medidas do plano do sólido por laços nas peças de teste: a ondulação de
 * `tools/modelar/ondulacao-da-superficie.mjs` (falhas e faces viradas) no L de referência, no corpo do ombro feito à mão, em cada
 * variante de `variantes/variantes.js` que o ajudante monta e na dobra em U com e sem compensação; o desvio do L e da variante
 * compensada contra o ombro, e o de cada variante contra o L; o canto da seção no corte z = 0 contra o do `arredondarAresta`; o raio
 * das curvas da dobra no corte x = 0; os avisos do ajudante; e a mensagem com que ele recusa as variantes dos limites 1 e 2. Leva
 * perto de 90 s, quase tudo na ondulação; o teste ao lado trava as medidas.
 *
 *   node tools/fixtures/solido-por-lacos/medir-limites.mjs */
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { ondulacaoDaReceita } from '../../modelar/ondulacao-da-superficie.mjs';
import receita from './receita.js';
import dobra, { TABELA as TABELA_DA_DOBRA, derivar as derivarDobra } from './dobra-em-u.js';
import arestaArredondada from './aresta-arredondada.js';
import ombro from '../../../procedural/pecas/braco-robotico/partes/ombro/receita.js';
import { TABELA, derivar } from './forma.js';
import { VARIANTES, comTabela } from './variantes/variantes.js';
import { cantoDaSecao, desvioEntreMalhas, malhaDaParte, menorDistanciaEntrePlanos, raioDaDobra } from './medir.mjs';

const arred = (x, n = 3) => Number(x.toFixed(n));

function ondulacao(rec) {
  const s = ondulacaoDaReceita(rec).superficies[0];
  const linha = (f) => ({ tipo: f.tipo, amplitudeMm: f.amplitudeMm, posicaoMm: f.posicaoMm });
  return { falhas: s.falhas.map(linha), facesViradas: s.facesViradas };
}
const avisos = (d) => d.avisos.map((a) => ({ ref: a.ref, onde: a.trechos ?? a.lacos, laco: a.laco, razao: a.razao }));
const desvio = (a, b) => { const d = desvioEntreMalhas(a, b, { teto: 8 }); return { maximoMm: arred(d.maximo), ondeA: d.ondeA, ondeB: d.ondeB }; };

const doOmbro = malhaDaParte(executarReceita(ombro).neutro, 'pescoco');
const base = malhaDaParte(executarReceita(receita).neutro, 'corpo');
const saida = {
  referencia: {
    planos: derivar(TABELA).planos.length,
    menorDistanciaEntrePlanosMm: arred(menorDistanciaEntrePlanos(TABELA)),
    avisos: avisos(derivar(TABELA)),
    desvioContraOOmbro: desvio(base, doOmbro),
    canto: cantoDaSecao(base, TABELA),
    ondulacao: ondulacao(receita),
  },
  ombro: { canto: cantoDaSecao(doOmbro, TABELA), ondulacao: ondulacao(ombro) },
  arredondarAresta: { canto: cantoDaSecao(malhaDaParte(executarReceita(arestaArredondada).neutro), TABELA) },
};
for (const [nome, T] of Object.entries(VARIANTES)) {
  let d;
  try { d = derivar(T); } catch (e) { saida[nome] = { recusa: e.message }; continue; }
  const rec = comTabela(T, nome);
  const malha = malhaDaParte(executarReceita(rec).neutro, 'corpo');
  saida[nome] = {
    planos: d.planos.length,
    avisos: avisos(d),
    compensacao: d.compensacao,
    desvioContraAReferencia: desvio(malha, base),
    desvioContraOOmbro: desvio(malha, doOmbro),
    canto: cantoDaSecao(malha, T),
    ondulacao: ondulacao(rec),
  };
}
const TU = { ...TABELA_DA_DOBRA, compensarCurva: true };
const dobraCom = Object.defineProperties({}, Object.getOwnPropertyDescriptors(dobra));
dobraCom.PARAMS = TU;
saida.dobraEmU = {
  avisos: avisos(derivarDobra(TABELA_DA_DOBRA)),
  semCompensar: { raio: raioDaDobra(malhaDaParte(executarReceita(dobra).neutro, 'dobra'), TABELA_DA_DOBRA), ondulacao: ondulacao(dobra) },
  compensada: { compensacao: derivarDobra(TU).compensacao, raio: raioDaDobra(malhaDaParte(executarReceita(dobraCom).neutro, 'dobra'), TU), ondulacao: ondulacao(dobraCom) },
};
process.stdout.write(`${JSON.stringify(saida, null, 2)}\n`);
