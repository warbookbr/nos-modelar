#!/usr/bin/env node
/* medir-limites.mjs — imprime, em JSON, as medidas dos quatro limites da gaiola de laços na peça de teste do sólido por laços:
 * a ondulação de `tools/modelar/ondulacao-da-superficie.mjs` (falhas, as de junto das feições, faces viradas) na forma de
 * referência e em cada variante de `variantes/variantes.js`, o desvio de cada variante contra a forma de referência, o canto da
 * seção no corte z = 0 contra o do `arredondarAresta`, a menor distância entre planos de corte e a maior razão entre dois
 * trechos vizinhos do laço do meio. Leva perto de 80 s, quase tudo na ondulação; o teste ao lado trava só as medidas rápidas.
 *
 *   node tools/fixtures/solido-por-lacos/medir-limites.mjs */
import { executarReceita } from '../../../src/autoria/executar-receita.js';
import { ondulacaoDaReceita } from '../../modelar/ondulacao-da-superficie.mjs';
import receita from './receita.js';
import arestaArredondada from './aresta-arredondada.js';
import { TABELA, derivar } from './forma.js';
import { VARIANTES, comTabela } from './variantes/variantes.js';
import { cantoDaSecao, desvioEntreMalhas, malhaDaParte, razaoDeAmostragem, menorDistanciaEntrePlanos } from './medir.mjs';

const arred = (x, n = 3) => Number(x.toFixed(n));

function ondulacao(rec) {
  const s = ondulacaoDaReceita(rec).superficies[0];
  const linha = (f) => ({ tipo: f.tipo, amplitudeMm: f.amplitudeMm, posicaoMm: f.posicaoMm, espacamentoMm: f.espacamentoMm, pontos: (f.pontos ?? []).slice(0, 3).map((p) => p.nome) });
  return { falhas: s.falhas.map(linha), junto: s.junto.map(linha).slice(0, 4), facesViradas: s.facesViradas, desvioMm: s.desvioMm };
}

const base = malhaDaParte(executarReceita(receita).neutro, 'corpo');
const saida = {
  referencia: {
    planos: derivar(TABELA).planos.length,
    menorDistanciaEntrePlanosMm: arred(menorDistanciaEntrePlanos(TABELA)),
    amostragem: razaoDeAmostragem(TABELA),
    canto: cantoDaSecao(base, TABELA),
    ondulacao: ondulacao(receita),
  },
  arredondarAresta: { canto: cantoDaSecao(malhaDaParte(executarReceita(arestaArredondada).neutro), TABELA) },
};
for (const [nome, T] of Object.entries(VARIANTES)) {
  const rec = comTabela(T, nome);
  const malha = malhaDaParte(executarReceita(rec).neutro, 'corpo');
  const d = desvioEntreMalhas(malha, base);
  saida[nome] = {
    planos: derivar(T).planos.length,
    menorDistanciaEntrePlanosMm: arred(menorDistanciaEntrePlanos(T)),
    desvioContraAReferenciaMm: arred(d.maximo),
    canto: cantoDaSecao(malha, T),
    ondulacao: ondulacao(rec),
  };
}
process.stdout.write(`${JSON.stringify(saida, null, 2)}\n`);
