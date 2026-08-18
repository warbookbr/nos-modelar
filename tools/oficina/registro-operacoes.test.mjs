/* registro-operacoes.test.mjs — prova configuração explícita e despacho determinístico da R02. */
import { describe, expect, it } from 'vitest';
import { OPS, REGISTRO_OPERACOES, criarContratoUsoOperacao, criarRegistroOperacoes, ErroRegistroOperacoes, nucleo } from '../../prototipos/procedural/v3/motor/oficina.js';

const op = (id, nome = id, versao = '1.0.0') => ({ id, nome, versao, executar() {} });
const modulo = (id, operacoes, requer = []) => ({ id, versao: '1.0.0', requer, operacoes });

describe('registro explícito de operações — R02', () => {
  it('registra as 32 operações sem alterar os nomes usados por receitas', () => {
    expect(REGISTRO_OPERACOES.listar().map((x) => x.nome).sort()).toEqual(Object.keys(OPS).sort());
    expect(REGISTRO_OPERACOES.resolver('cubo').id).toBe('mecanifica.operacao.cubo');
    expect(REGISTRO_OPERACOES.resolver('cubo').artefatos.sai).toEqual(['mecanifica.malha-poligonal@1']);
    expect(REGISTRO_OPERACOES.resolver('parte').identidade).toBe('declara-semantica');
    expect(REGISTRO_OPERACOES.resolver('cubo', '2.0.0')).toBeNull();
    expect(nucleo([['cubo', { lado: 1 }]], {}, {}).orfaos).toEqual([]);
  });

  it('recusa duplicidade, ausência e versão incompatível antes da execução', () => {
    expect(() => criarRegistroOperacoes({ modulos: [modulo('a', [op('a')]), modulo('b', [op('a')])] })).toThrow(ErroRegistroOperacoes);
    expect(() => criarRegistroOperacoes({ modulos: [modulo('a', [], [{ id: 'ausente', versao: '1.0.0' }])] })).toThrow(/ausente/);
    expect(() => criarRegistroOperacoes({ modulos: [modulo('a', [op('a')], [{ id: 'b', versao: '2.0.0' }]), modulo('b', [])] })).toThrow(/major compatível/);
  });

  it('tem assinatura canônica independente da ordem de módulos e operações', () => {
    const a = criarRegistroOperacoes({ modulos: [modulo('b', [op('b'), op('a')]), modulo('a', [op('c')])] });
    const b = criarRegistroOperacoes({ modulos: [modulo('a', [op('c')]), modulo('b', [op('a'), op('b')])] });
    expect(a.assinatura).toBe(b.assinatura);
    expect(a.assinatura).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(a.manifesto).toEqual(b.manifesto);
  });

  it('isola manifesto e contrato de uso de mutações posteriores do chamador', () => {
    const uso = JSON.parse(JSON.stringify(criarContratoUsoOperacao('prova', {
      intencao: 'Provar isolamento do contrato.', campos: { valor: ['escalar', 'Valor de prova.'] },
      passos: [['prova', { valor: 1 }]],
    })));
    const artefatos = { entra: [], sai: ['mecanifica.prova@1'] };
    const registro = criarRegistroOperacoes({ modulos: [modulo('prova.modulo', [{ ...op('prova.operacao', 'prova'), artefatos, uso }])] });
    artefatos.sai.push('mutacao'); uso.intencao = 'mutado';
    expect(registro.resolver('prova')).toMatchObject({
      artefatos: { sai: ['mecanifica.prova@1'] }, uso: { intencao: 'Provar isolamento do contrato.' },
    });
    expect(Object.isFrozen(registro.manifesto[0].operacoes[0].uso.schemaArgumentos.properties)).toBe(true);
  });
});
