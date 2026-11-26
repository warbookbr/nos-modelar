/* elo-com-desvio-curso.test.mjs — o curso das duas juntas, de −180° a 180°, de cada peça de prova do elo com desvio (a canela a 25°,
 * a canela no teto de 90° e o elo curto no desvio máximo aceito), conferido contra as malhas: nada colide ao girar. */
import { describe, expect, it } from 'vitest';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { conferirArticulacao } from '../../../src/autoria/conferir-articulacao.js';
import { resolverMontagemDaFamilia } from '../../modelar/montagem-da-familia.mjs';
import { ELO_CURTO_NO_MAXIMO, ELO_DA_CANELA_COM_JOELHO, ELO_DA_CANELA_NO_TETO } from './elo-com-desvio.mjs';
import { montarEloEntreAtuadores } from './elo-entre-atuadores.mjs';

const registro = criarRegistroDeFamilias();
const execucao = { registroOperacoes: registro.registroOperacoes, registroComposicoes: registro.registroComposicoes };
const PECAS = [['a canela com o joelho a 25°', ELO_DA_CANELA_COM_JOELHO], ['a canela no teto de 90°', ELO_DA_CANELA_NO_TETO], ['o elo curto no desvio máximo aceito', ELO_CURTO_NO_MAXIMO]];

describe('curso das juntas do elo com desvio', () => {
  for (const [nome, elo] of PECAS) {
    const gerada = montarEloEntreAtuadores(registro.obter('atuador-de-junta'), registro.obter('elo-entre-juntas'), elo);
    const comoFamilia = { montar: () => gerada };
    let resolvidaDaPeca = null;
    const resolver = () => { resolvidaDaPeca ??= resolverMontagemDaFamilia(comoFamilia, {}, execucao); return resolvidaDaPeca; };
    for (const declaracao of gerada.articulacoes) it(`${nome}: o curso da ${declaracao.id}, de −180° a 180°, passa sem colisão`, () => {
      const { resolvida } = resolver();
      const r = conferirArticulacao(resolvida, declaracao);
      expect(r.recusa).toEqual([]);
      expect(r.ok).toBe(true);
    }, 90000);
  }
});
