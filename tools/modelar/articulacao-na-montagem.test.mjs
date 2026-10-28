/* articulacao-na-montagem.test.mjs — a articulação sobre uma montagem v5 real:
   a folha da porta não declara pose, a posição sai do encaixe da porta
   `eixo-da-dobradica` dela na porta do batente, e o eixo do giro é o dessa
   porta no mundo. O batente vem girado e deslocado, e o curso confere os
   mesmos números da porta alinhada aos eixos (110,32 graus onde bate, 60,4 mm
   de penetração em 115). */
import { describe, expect, it } from 'vitest';
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
import { conferirArticulacao } from '../../src/autoria/conferir-articulacao.js';
import { carregadoresDeReceitas } from './peca-com-parametros.mjs';

const porta = (papel) => ['publicarPorta', {
  nome: 'eixo-da-dobradica', de: { op: 'cubo', id: 1 },
  interface: { forma: 'cilindro', papel, eixo: [0, 1, 0], centro: [0, 0, 0], referencia: [1, 0, 0], raio: 0.01, inicio: 0, fim: 1.8 },
}];
const receita = (nome, dimensoes, papel) => ({
  meta: { nome },
  PASSOS: [
    ['cubo', { origemId: 1, ...dimensoes }],
    ['parte', { nome: 'corpo', sel: { origem: { op: 'cubo', id: 1 } } }],
    ['solido', { sel: { grupo: 'corpo' } }],
    porta(papel),
  ],
});
const RECEITAS = {
  batente: receita('batente', { larg: 0.3, alt: 2, prof: 2, em: [-0.45, 0, 0] }, 'externa'),
  folha: receita('folha', { larg: 0.8, alt: 1.8, prof: 0.04, em: [0.41, 0, 0] }, 'interna'),
};

/* quarto de volta em y e deslocamento: o batente não está alinhado aos eixos do mundo.
   As duas portas publicam `referencia`, e é ela que define o giro da folha em
   torno do eixo; sem ela a posição derivada só alinha os eixos. */
const POSE_DO_BATENTE = { rotacao: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], deslocamento: [1, 0, 2] };

const montagem = (pose) => ({
  formato: 'mecanifica.montagem', versao: 5, id: 'porta-de-prova',
  instancias: [
    { id: 'batente', alvo: { tipo: 'peca', ref: 'batente' }, ...(pose ? { pose } : {}) },
    { id: 'folha', alvo: { tipo: 'peca', ref: 'folha' } },
  ],
  relacoes: [], etapas: ['batente', 'folha'], vinculos: [],
  posicoes: [{
    id: 'folhaNaDobradica', instancia: 'folha', porta: 'eixo-da-dobradica',
    em: { instancia: 'batente', porta: 'eixo-da-dobradica' }, unidade: 'mm', afastamento: 0,
  }],
});

const articulacao = (extra = {}) => ({
  id: 'porta-no-batente', tipo: 'revolucao',
  fixo: { caminho: ['batente'], porta: 'eixo-da-dobradica' }, movel: { caminho: ['folha'], porta: 'eixo-da-dobradica' },
  unidade: 'graus', curso: { minimo: 0, maximo: 120 }, passos: 24, folga: { valor: 0, unidade: 'mm' },
  ...extra,
});

const resolver = (pose) => resolverMontagemPersistida(montagem(pose), carregadoresDeReceitas(RECEITAS));

describe('articulação sobre a montagem v5 com posição derivada da porta', () => {
  it('a folha herda o lugar da porta do batente, e o curso confere o mesmo com o batente fora dos eixos', async () => {
    const alinhado = conferirArticulacao(await resolver(), articulacao());
    const girado = conferirArticulacao(await resolver(POSE_DO_BATENTE), articulacao());
    expect(girado.eixo.centro.map((n) => Number(n.toFixed(9)))).toEqual([1, 0, 2]);
    expect(girado.eixo.direcao.map((n) => Number(n.toFixed(9)))).toEqual([0, 1, 0]);
    for (const r of [alinhado, girado]) {
      expect(r.ok).toBe(false);
      expect(r.colisoes.map((c) => c.posicao.valor)).toEqual([115, 120]);
      expect(r.colisoes[0].penetracao).toBeCloseTo(0.0604, 3);
      expect(r.primeirasColisoes[0].livreAte).toBeCloseTo(110.32, 1);
    }
    expect(girado.colisoes[0].penetracao).toBeCloseTo(alinhado.colisoes[0].penetracao, 9);
  });

  it('o curso de 0 a 90 graus passa, e porta inexistente é recusada com as portas da peça', async () => {
    const montada = await resolver(POSE_DO_BATENTE);
    expect(conferirArticulacao(montada, articulacao({ curso: { minimo: 0, maximo: 90 }, passos: 18 })).ok).toBe(true);
    expect(() => conferirArticulacao(montada, articulacao({ movel: { caminho: ['folha'], porta: 'fantasma' } })))
      .toThrow(/não publica a porta 'fantasma'. Portas publicadas: eixo-da-dobradica/);
  });
});
