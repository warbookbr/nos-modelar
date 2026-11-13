import { describe, expect, it } from 'vitest';
import { ErroMontagemPersistida, lerMontagemPersistida } from './ler-montagem-persistida.js';

/* O campo `manual` da montagem v5 é só texto opcional (nome de exibição e instrução por etapa). */
const base = () => ({
  formato: 'mecanifica.montagem',
  versao: 5,
  id: 'carro',
  instancias: [{ id: 'roda', alvo: { tipo: 'peca', ref: 'carro/roda' } }, { id: 'chassi', alvo: { tipo: 'peca', ref: 'carro/chassi' } }],
  relacoes: [],
  etapas: ['chassi', 'roda'],
  vinculos: [],
  posicoes: [],
});
const comManual = (manual) => ({ ...base(), manual });
function recusa(dado, codigo, caminho) {
  let erro;
  try { lerMontagemPersistida(dado); } catch (capturado) { erro = capturado; }
  expect(erro).toBeInstanceOf(ErroMontagemPersistida);
  expect(erro.codigo).toBe(codigo);
  expect(erro.caminho).toBe(caminho);
}

describe('a leitura de manual na montagem v5', () => {
  it('a montagem sem o campo é lida sem ele, e com ele só acrescenta o campo', () => {
    const sem = lerMontagemPersistida(base());
    expect(Object.hasOwn(sem, 'manual')).toBe(false);
    const manual = { nomes: { 'carro/roda': 'Roda' }, parametros: { posicaoDoEixo: 'posição do eixo' }, etapas: { roda: { instrucao: 'Encaixe no eixo.', avisos: ['Confira o aperto.'] } } };
    const { manual: lido, ...resto } = lerMontagemPersistida(comManual(manual));
    expect(resto).toEqual(sem);
    expect(lido).toEqual(manual);
  });
  it('recusa chave desconhecida, alvo e etapa que não existem, e texto vazio', () => {
    recusa(comManual({ extra: 1 }), 'chave-desconhecida', 'manual');
    recusa(comManual({ nomes: { 'carro/volante': 'Volante' } }), 'manual-invalido', 'manual.nomes.carro/volante');
    recusa(comManual({ parametros: { posicaoDoEixo: '' } }), 'manual-invalido', 'manual.parametros.posicaoDoEixo');
    recusa(comManual({ parametros: [] }), 'estrutura-invalida', 'manual.parametros');
    recusa(comManual({ nomes: { 'carro/roda': '' } }), 'manual-invalido', 'manual.nomes.carro/roda');
    recusa(comManual({ etapas: { volante: { instrucao: 'x' } } }), 'manual-invalido', 'manual.etapas.volante');
    recusa(comManual({ etapas: { roda: { instrucao: 'x', tom: 1 } } }), 'chave-desconhecida', 'manual.etapas.roda');
    recusa(comManual({ etapas: { roda: { avisos: 'texto solto' } } }), 'manual-invalido', 'manual.etapas.roda.avisos');
    recusa(comManual({ etapas: { roda: { avisos: [''] } } }), 'manual-invalido', 'manual.etapas.roda.avisos[0]');
  });
});
