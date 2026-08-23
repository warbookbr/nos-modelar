/* Prova caixa-preta N1.2: schemas, cobertura real e diagnóstico sem acesso oculto. */

import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { criarServicoAutoria3DNativa } from '../../prototipos/procedural/v3/servicos/fluxo-autoria.js';

const etapas = [
  'briefing', 'alvo', 'andaime', 'blocagem', 'decomposicao', 'integracao',
  'superficie', 'estados', 'revisao', 'promocao',
];
const classes = [
  'objetivo', 'referencia', 'forma-global', 'semantica', 'montagem',
  'superficie', 'estados', 'validacao', 'publicacao',
];

function objetivo(sobrescrever = {}) {
  return {
    formato: 'mecanifica.objetivo-autoria@1', id: 'cupe-caixa-preta', familia: 'veiculo',
    intencao: 'criar um cupê inteiro reconhecível antes de decompor peças',
    qualidade: 'reconhecivel', unidade: 'mm',
    eixos: { direita: '+x', cima: '+y', frente: '+z' },
    referencias: [{ id: 'briefing', tipo: 'briefing-ficcional', evidencia: 'envelope e proporções declarados' }],
    restricoes: ['entre-eixos permanece fixo'],
    rejeicoes: ['não parece veículo nas vistas globais'], incertezas: [], necessidades: [],
    ...sobrescrever,
  };
}

function provedorFixtureCompleto() {
  return {
    manifesto: {
      formato: 'mecanifica.provedor-autoria@1', id: 'fixture-cobertura-n1', versao: '1.0.0',
      familias: ['*'], etapas, classes,
      efeitos: ['leitura', 'planejamento', 'compilacao', 'validacao', 'revisao', 'publicacao'],
    },
    planejar({ necessidade }) {
      return {
        estado: 'coberta', custo: 1,
        plano: { formato: 'mecanifica.plano-fixture-n1@1', necessidade: necessidade.id },
        lacuna: null, diagnosticos: [],
      };
    },
  };
}

function validadorDosSchemas(indice) {
  const ajv = new Ajv2020({ strict: false, allErrors: true });
  Object.values(indice.contratos).forEach((schema) => ajv.addSchema(schema));
  return (id, valor) => ({ valido: ajv.validate(id, valor), erros: ajv.errors });
}

describe('N1.2 — cliente caixa-preta do fluxo de autoria', () => {
  it('descobre schemas e a cobertura real sem promover serviços incompatíveis', () => {
    const servico = criarServicoAutoria3DNativa();
    const schemas = servico.schemas();
    const cobertura = servico.cobertura('veiculo');

    expect(schemas).toMatchObject({
      formato: 'mecanifica.schemas-autoria-3d@1',
      contratos: {
        objetivo: { $id: 'mecanifica.objetivo-autoria@1' },
        receitaAutoral: { $id: 'mecanifica.receita-autoral@1' },
        plano: { $id: 'mecanifica.plano-fluxo-autoria@1' },
        cobertura: { $id: 'mecanifica.cobertura-fluxo-autoria@1' },
      },
    });
    expect(cobertura.totais).toEqual({ etapas: 10, cobertas: 1, lacunas: 9 });
    expect(cobertura.etapas[0]).toEqual({
      id: 'briefing', classe: 'objetivo', estado: 'coberta', provedores: ['contratos-autoria'],
    });
    expect(cobertura.etapas.find(({ id }) => id === 'blocagem')).toMatchObject({ estado: 'lacuna', provedores: [] });
    expect(servico.provedores().map(({ id }) => id)).toEqual(['contratos-autoria', 'procedural-dimensional']);
  });

  it('reutiliza procedural numa necessidade explícita, mas mantém o veículo bloqueado', () => {
    const servico = criarServicoAutoria3DNativa();
    const entrada = objetivo({
      necessidades: [{
        id: 'forma-dimensional', etapa: 'decomposicao', classe: 'procedural',
        artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1'] },
        interfaces: { entra: [], sai: [] }, requisitos: [], obrigatoria: true,
      }],
    });
    const a = servico.planejar(entrada);
    const b = servico.planejar(entrada);
    const escolha = a.plano.escolhas.find(({ necessidade }) => necessidade === 'forma-dimensional');

    expect(a.estado).toBe('bloqueado');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.plano.escolhas.find(({ necessidade }) => necessidade === 'etapa-briefing')).toMatchObject({
      estado: 'planejada', provedor: 'contratos-autoria',
    });
    expect(escolha).toMatchObject({ estado: 'planejada', provedor: 'procedural-dimensional' });
    expect(a.plano.escolhas.find(({ necessidade }) => necessidade === 'etapa-alvo')).toMatchObject({
      estado: 'bloqueada', provedor: null,
    });
    expect(a.diagnosticos.some(({ codigo }) => codigo === 'provedor-ausente')).toBe(true);
    expect(JSON.stringify(a)).not.toMatch(/[A-Z]:\\|file:\/\/|node:fs|function\s*\(/i);
  });

  it('devolve erro estrutural acionável sem lançar ou executar provedor', () => {
    const resultado = criarServicoAutoria3DNativa().planejar({ ...objetivo(), referencias: [] });
    expect(resultado).toMatchObject({
      formato: 'mecanifica.resultado-planejamento-autoria@1', estado: 'invalido', plano: null,
      diagnosticos: [{ codigo: 'referencia-ausente', campo: 'referencias' }],
    });
    expect(resultado.diagnosticos[0]).toEqual(expect.objectContaining({
      causa: expect.any(String), impacto: expect.any(String), proximoPasso: expect.any(String),
    }));
  });

  it('mantém paridade entre schemas dinâmicos, artefato gerado e saídas públicas', () => {
    const servico = criarServicoAutoria3DNativa();
    const indice = servico.schemas();
    const estatico = JSON.parse(readFileSync(new URL('../../docs/mecanifica/gerado/schemas-autoria-3d.json', import.meta.url), 'utf8'));
    const validar = validadorDosSchemas(indice);
    const entrada = objetivo();
    const planejamento = servico.planejar(entrada);
    const cobertura = servico.cobertura('veiculo');

    expect(estatico).toEqual(indice);
    expect(validar('mecanifica.objetivo-autoria@1', entrada)).toMatchObject({ valido: true });
    expect(validar('mecanifica.resultado-planejamento-autoria@1', planejamento)).toMatchObject({ valido: true });
    expect(validar('mecanifica.cobertura-fluxo-autoria@1', cobertura)).toMatchObject({ valido: true });
    for (const manifesto of servico.provedores()) {
      expect(validar('mecanifica.provedor-autoria@1', manifesto)).toMatchObject({ valido: true });
    }
    expect(validar('mecanifica.objetivo-autoria@1', { ...entrada, referencias: [] })).toMatchObject({ valido: false });
  });

  it('valida receita elevada, plano pronto, execução e resultado de etapa', () => {
    const servico = criarServicoAutoria3DNativa({ provedores: [provedorFixtureCompleto()] });
    const validar = validadorDosSchemas(servico.schemas());
    const receita = servico.normalizarReceita({
      formato: 'mecanifica.receita-autoral@1', id: 'cupe-caixa-preta-r1', objetivo: 'cupe-caixa-preta',
      familia: 'veiculo', revisaoPai: null, intencao: 'fonte recompilável para a prova N1',
      coordenadas: { unidade: 'mm', escala: 1, eixos: { direita: '+x', cima: '+y', frente: '+z' } },
      fontes: [{ id: 'andaime', tipo: 'andaime', formato: 'mecanifica.andaime@1', versao: '1.0.0' }],
      semantica: { regioes: [], landmarks: ['eixo-dianteiro'], interfaces: [] }, dependencias: [],
      produtosDerivados: [{
        id: 'malha-inspecao', tipo: 'malha-neutra', estado: 'esperado', assinatura: null,
        provedor: 'fixture-cobertura-n1', versao: '1.0.0',
      }],
      aceite: { gates: [{ id: 'reconhecimento-global', estado: 'pendente' }] },
    });
    const planejamento = servico.planejar(objetivo());
    const execucao = servico.iniciar(planejamento.plano);
    const resultado = {
      etapa: 'briefing', estado: 'aprovada', evidencias: ['evidencia-briefing'],
      diagnosticos: [], decisaoUsuario: null,
    };
    const avancada = servico.registrar(execucao, resultado);

    expect(planejamento.estado).toBe('pronto');
    expect(validar('mecanifica.receita-autoral@1', receita)).toMatchObject({ valido: true });
    expect(validar('mecanifica.plano-fluxo-autoria@1', planejamento.plano)).toMatchObject({ valido: true });
    expect(validar('mecanifica.execucao-fluxo-autoria@1', execucao)).toMatchObject({ valido: true });
    expect(validar('mecanifica.resultado-etapa-autoria@1', resultado)).toMatchObject({ valido: true });
    expect(validar('mecanifica.execucao-fluxo-autoria@1', avancada)).toMatchObject({ valido: true });
    expect(avancada.etapaAtual).toBe('alvo');
  });
});
