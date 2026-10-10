/* articulacao.test.mjs — a articulação como extensão nativa: o manifesto cabe no
   SDK, o contrato de uso é descobrível, o passo não emite geometria e a
   declaração inválida descarta o passo inteiro. A conferência do curso contra
   a montagem é provada em `src/autoria/conferir-articulacao.test.mjs`. */
import { describe, expect, it } from 'vitest';
import { REGISTRO_OPERACOES, buscarCapacidades, catalogoDeCapacidades, criarRegistroComExtensoes, diagnosticarExtensaoAusente, nucleo } from '../../nucleo/entrada.js';
import { MANIFESTO } from './manifesto.js';
import { implementar } from './implementacao.js';
import { ARTICULACAO, PASSOS } from './fixture.js';
import { ErroArticulacao, lerArticulacao } from './declaracao.js';

const registro = () => criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: [{ manifesto: MANIFESTO, implementacao: implementar }] });

describe('extensão nativa de articulação', () => {
  it('entra no registro por combinação explícita e o contrato de uso a descreve', () => {
    const r = registro();
    expect(r.resolver('articulacao')).toMatchObject({ extensao: 'mecanifica.extensao.articulacao', identidade: 'nao-cria' });
    expect(r.resolver('articulacao').uso).toMatchObject({
      formato: 'mecanifica.uso-operacao@1',
      schemaArgumentos: { $id: 'mecanifica.argumentos.articulacao@1', required: ['id', 'tipo', 'fixo', 'movel', 'unidade', 'curso', 'passos', 'folga'] },
      exemplo: { PASSOS },
    });
    expect(buscarCapacidades(catalogoDeCapacidades(r), { efeito: 'confere-movimento' }).operacoes).toEqual([expect.objectContaining({ nome: 'articulacao' })]);
    expect(REGISTRO_OPERACOES.resolver('articulacao')).toBeNull();
    expect(diagnosticarExtensaoAusente(REGISTRO_OPERACOES, 'articulacao')).toMatchObject({ estado: 'ausente', decisao: 'nao-executar' });
    expect(diagnosticarExtensaoAusente(r, 'articulacao')).toBeNull();
  });

  it('o passo não cria geometria e a mesma declaração dá o mesmo resultado', () => {
    const a = nucleo(PASSOS, {}, {}, {}, null, [], { registroOperacoes: registro() });
    expect(a.orfaos).toEqual([]);
    expect(a.V.size).toBe(0);
    expect(a.F.size).toBe(0);
    const contexto = { numero: (n) => n };
    expect(JSON.stringify(implementar(contexto, ARTICULACAO))).toBe(JSON.stringify(implementar(contexto, ARTICULACAO)));
  });

  it('declaração inválida descarta o passo, sem estado parcial', () => {
    const ruim = [['articulacao', { ...ARTICULACAO, unidade: 'mm' }]];
    const n = nucleo(ruim, {}, {}, {}, null, [], { registroOperacoes: registro() });
    expect(n.orfaos).toHaveLength(1);
    expect(n.orfaos[0].motivo).toMatch(/unidade/);
    expect(n.V.size).toBe(0);
  });

  it('lê a declaração em unidades do autor e entrega radiano e metro', () => {
    const { articulacao, si } = lerArticulacao({ ...ARTICULACAO, folga: { valor: 0.5, unidade: 'mm' } });
    expect(articulacao).toMatchObject({ formato: 'mecanifica.articulacao@1', unidade: 'graus', curso: { minimo: 0, maximo: 90 }, acompanham: [], permitidos: [] });
    expect(si.curso.maximo).toBeCloseTo(Math.PI / 2, 12);
    expect(si.folga).toBe(0.0005);
    expect(() => lerArticulacao({ ...ARTICULACAO, movel: ARTICULACAO.fixo })).toThrow(ErroArticulacao);
  });
});
