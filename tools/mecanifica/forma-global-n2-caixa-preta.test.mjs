/* Prova N2 por uma única fachada pública, sem importar a implementação. */
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { criarServicoAutoria3DNativa } from '../../prototipos/procedural/v3/servicos/fluxo-autoria.js';

const ler = (nome) => JSON.parse(readFileSync(new URL(`./fixtures/autoria-n2/${nome}`, import.meta.url), 'utf8'));

describe('N2 — consumidor caixa-preta', () => {
  it('descobre uma única porta para alvo, andaime, blocagem e G01/G02', () => {
    const servico = criarServicoAutoria3DNativa();
    expect(servico.formaGlobal.formato).toBe('mecanifica.servico-forma-global@1');
    expect(Object.keys(servico.formaGlobal).sort()).toEqual([
      'avaliar', 'compilar', 'decidir', 'formato', 'normalizarAlvo', 'normalizarAndaime', 'renderizarPainel', 'renderizarVista',
    ]);
    expect(servico.cobertura('veiculo').totais).toEqual({ etapas: 10, cobertas: 4, lacunas: 6 });
    expect(servico.cobertura('veiculo').etapas.slice(0, 4).map(({ id, estado }) => [id, estado])).toEqual([
      ['briefing', 'coberta'], ['alvo', 'coberta'], ['andaime', 'coberta'], ['blocagem', 'coberta'],
    ]);
  });

  it('executa a prova inteira sem importar implementação geométrica', () => {
    const forma = criarServicoAutoria3DNativa().formaGlobal;
    const alvo = ler('alvo-veiculo-compacto.json'), andaime = ler('andaime-veiculo-compacto.json');
    const blocagem = forma.compilar(alvo, andaime), avaliacao = forma.avaliar(alvo, blocagem);
    const decisao = forma.decidir(avaliacao);
    expect(blocagem.estatisticas).toEqual({ volumes: 6, vertices: 154, triangulos: 284 });
    expect(avaliacao.estado).toBe('aprovado');
    expect(decisao).toMatchObject({ estado: 'bloqueado', gates: { g01: 'aprovado', g02: 'bloqueado' } });
    expect(JSON.stringify({ blocagem, avaliacao, decisao })).not.toMatch(/node:fs|three|function\s*\(|camera|uuid/i);
  });

  it('publica schemas N2 válidos e sincronizáveis com as saídas', () => {
    const servico = criarServicoAutoria3DNativa(), indice = servico.schemas();
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    Object.values(indice.contratos).forEach((schema) => ajv.addSchema(schema));
    const alvo = servico.formaGlobal.normalizarAlvo(ler('alvo-veiculo-compacto.json'));
    const andaime = servico.formaGlobal.normalizarAndaime(ler('andaime-veiculo-compacto.json'));
    const blocagem = servico.formaGlobal.compilar(alvo, andaime);
    const avaliacao = servico.formaGlobal.avaliar(alvo, blocagem), decisao = servico.formaGlobal.decidir(avaliacao);
    for (const [id, valor] of [
      ['mecanifica.alvo-forma-global@1', alvo], ['mecanifica.andaime-global@1', andaime],
      ['mecanifica.blocagem-global@1', blocagem], ['mecanifica.avaliacao-forma-global@1', avaliacao],
      ['mecanifica.decisao-forma-global@1', decisao],
    ]) expect(ajv.validate(id, valor), `${id}: ${ajv.errorsText()}`).toBe(true);
  });

  it('mantém o plano global bloqueado nas capacidades que N2 não implementou', () => {
    const entrada = {
      formato: 'mecanifica.objetivo-autoria@1', id: 'veiculo-compacto-n2', familia: 'veiculo',
      intencao: 'provar blocagem inteira antes da superfície', qualidade: 'reconhecivel', unidade: 'mm',
      eixos: { direita: '+x', cima: '+y', frente: '+z' },
      referencias: [{ id: 'alvo-n2', tipo: 'medidas-declaradas', evidencia: 'fixture N2 com três silhuetas e landmarks' }],
      restricoes: ['sem detalhe'], rejeicoes: ['forma parcial'], incertezas: [], necessidades: [],
    };
    const resultado = criarServicoAutoria3DNativa().planejar(entrada);
    expect(resultado.estado).toBe('bloqueado');
    expect(resultado.plano.escolhas.filter(({ estado }) => estado === 'planejada').map(({ etapa }) => etapa)).toEqual([
      'briefing', 'alvo', 'andaime', 'blocagem',
    ]);
    expect(resultado.plano.escolhas.find(({ etapa }) => etapa === 'decomposicao')).toMatchObject({ estado: 'bloqueada', provedor: null });
  });
});
