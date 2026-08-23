/* Provas executáveis da N1.1: contratos, provedores, fluxo e falha segura. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — contratos JavaScript puros exercitados pela prova TypeScript.
import { criarRegistroProvedoresAutoria, FORMATO_OBJETIVO_AUTORIA, FORMATO_PROVEDOR_AUTORIA, FORMATO_RECEITA_AUTORAL, normalizarObjetivoAutoria, normalizarReceitaAutoral } from '../../src/autoria/contrato-autoria-3d.js';
// @ts-expect-error — orquestrador JavaScript puro da N1.
import { criarExecucaoFluxoAutoria, planejarFluxoAutoria, registrarResultadoEtapa } from '../../src/autoria/orquestrar-fluxo-autoria.js';
// @ts-expect-error — adaptador puro do serviço procedural existente.
import { criarProvedorProceduralAutoria } from '../../prototipos/procedural/v3/servicos/provedor-autoria.js';

const classesFluxo = [
  'objetivo', 'referencia', 'forma-global', 'semantica', 'montagem',
  'superficie', 'estados', 'validacao', 'publicacao',
];
const etapasFluxo = [
  'briefing', 'alvo', 'andaime', 'blocagem', 'decomposicao', 'integracao',
  'superficie', 'estados', 'revisao', 'promocao',
];

function objetivo(sobrescrever: Record<string, unknown> = {}) {
  return {
    formato: FORMATO_OBJETIVO_AUTORIA,
    id: 'cupe-prova',
    familia: 'veiculo',
    intencao: 'criar um cupê inteiro reconhecível antes da decomposição',
    qualidade: 'reconhecivel',
    unidade: 'mm',
    eixos: { direita: '+x', cima: '+y', frente: '+z' },
    referencias: [{ id: 'briefing', tipo: 'briefing-ficcional', evidencia: 'envelope e proporções declarados no objetivo' }],
    restricoes: ['entre-eixos permanece fixo'],
    rejeicoes: ['não parece um carro em vistas globais'],
    incertezas: [],
    necessidades: [],
    ...sobrescrever,
  };
}

function provedorFluxo() {
  return {
    manifesto: {
      formato: FORMATO_PROVEDOR_AUTORIA,
      id: 'plataforma-existente',
      versao: '1.0.0',
      familias: ['*'],
      etapas: etapasFluxo,
      classes: classesFluxo,
      efeitos: ['leitura', 'planejamento', 'compilacao', 'validacao', 'revisao', 'publicacao'],
    },
    planejar({ necessidade }: any) {
      return {
        estado: 'coberta', custo: 2,
        plano: { formato: 'mecanifica.prova-plano@1', necessidade: necessidade.id },
        diagnosticos: [],
      };
    },
  };
}

function resultado(etapa: string, decisaoUsuario: 'aprovar' | 'reprovar' | null = null) {
  return { etapa, estado: 'aprovada', evidencias: [`evidencia-${etapa}`], diagnosticos: [], decisaoUsuario };
}

describe('N1 — contratos e orquestração de autoria 3D', () => {
  it('canonicaliza objetivo e falha fechado em eixo, runtime e referência inválidos', () => {
    const invertido = objetivo({
      restricoes: ['volume íntegro', 'entre-eixos permanece fixo'],
      referencias: [
        { id: 'prancha', tipo: 'prancha-medida', evidencia: 'quatro vistas coerentes' },
        { id: 'briefing', tipo: 'briefing-ficcional', evidencia: 'envelope e proporções declarados no objetivo' },
      ],
    });
    const normalizado: any = normalizarObjetivoAutoria(invertido);
    expect(normalizado.referencias.map(({ id }: any) => id)).toEqual(['briefing', 'prancha']);
    expect(normalizado.restricoes).toEqual(['entre-eixos permanece fixo', 'volume íntegro']);
    expect(Object.isFrozen(normalizado)).toBe(true);
    expect(() => normalizarObjetivoAutoria({ ...objetivo(), camera: 'frontal' })).toThrow(/camera/);
    expect(() => normalizarObjetivoAutoria({ ...objetivo(), eixos: { direita: '+x', cima: '-x', frente: '+z' } })).toThrow(/distintos/);
    expect(() => normalizarObjetivoAutoria({ ...objetivo(), referencias: [] })).toThrow(/referência/);
  });

  it('separa fonte editável de produto derivado na receita elevada', () => {
    const receita: any = normalizarReceitaAutoral({
      formato: FORMATO_RECEITA_AUTORAL,
      id: 'cupe-prova-r1', objetivo: 'cupe-prova', familia: 'veiculo', revisaoPai: null,
      intencao: 'manter a fonte do cupê recompilável e semanticamente endereçável',
      coordenadas: { unidade: 'mm', escala: 1, eixos: { direita: '+x', cima: '+y', frente: '+z' } },
      fontes: [
        { id: 'pele', tipo: 'superficie-semantica', formato: 'mecanifica.superficie-semantica@1', versao: '1.0.0' },
        { id: 'andaime', tipo: 'andaime', formato: 'mecanifica.andaime@1', versao: '1.0.0' },
      ],
      semantica: { regioes: ['cabine', 'capo'], landmarks: ['eixo-dianteiro'], interfaces: ['arco-dianteiro'] },
      dependencias: [{ tipo: 'montagem', id: 'chassi', revisao: null }],
      produtosDerivados: [{
        id: 'malha-inspecao', tipo: 'malha-neutra', estado: 'esperado', assinatura: null,
        provedor: 'compilador-superficie', versao: '1.0.0',
      }],
      aceite: { gates: [{ id: 'reconhecimento-global', estado: 'pendente' }] },
    });
    expect(receita.fontes.map(({ id }: any) => id)).toEqual(['andaime', 'pele']);
    expect(receita.produtosDerivados[0]).toMatchObject({ estado: 'esperado', assinatura: null });
    expect(() => normalizarReceitaAutoral({
      ...receita,
      fontes: [{ id: 'malha', tipo: 'malha-densa', formato: 'mecanifica.malha@1', versao: '1.0.0' }],
    })).toThrow(/produto derivado/);
    expect(() => normalizarReceitaAutoral({
      ...receita,
      produtosDerivados: [{ ...receita.produtosDerivados[0], estado: 'compilado', assinatura: null }],
    })).toThrow(/sha256/);
  });

  it('reutiliza a descoberta procedural atual antes de considerar lacuna', () => {
    const necessidade = {
      id: 'forma-dimensional', etapa: 'decomposicao', classe: 'procedural',
      artefatos: { entra: [], sai: ['mecanifica.malha-poligonal@1'] },
      interfaces: { entra: [], sai: [] }, requisitos: [], obrigatoria: true,
    };
    const registro = criarRegistroProvedoresAutoria([provedorFluxo(), criarProvedorProceduralAutoria()]);
    const plano: any = planejarFluxoAutoria({ objetivo: objetivo({ necessidades: [necessidade] }), provedores: registro });
    const escolha = plano.escolhas.find(({ necessidade: id }: any) => id === necessidade.id);
    expect(plano.estado).toBe('pronto');
    expect(escolha).toMatchObject({ estado: 'planejada', provedor: 'procedural-dimensional', lacuna: null });
    expect(escolha.plano.cadeia.operacoes.length).toBeGreaterThan(0);
  });

  it('bloqueia necessidade não coberta e preserva a classificação da lacuna', () => {
    const necessidade = {
      id: 'representacao-superficie', etapa: 'superficie', classe: 'procedural',
      artefatos: { entra: [], sai: ['mecanifica.superficie-semantica@1'] },
      interfaces: { entra: [], sai: [] }, requisitos: [], obrigatoria: true,
    };
    const registro = criarRegistroProvedoresAutoria([provedorFluxo(), criarProvedorProceduralAutoria()]);
    const plano: any = planejarFluxoAutoria({ objetivo: objetivo({ necessidades: [necessidade] }), provedores: registro });
    const escolha = plano.escolhas.find(({ necessidade: id }: any) => id === necessidade.id);
    expect(plano.estado).toBe('bloqueado');
    expect(escolha.estado).toBe('bloqueada');
    expect(escolha.lacuna.classificacao.classificacao).toBe('operacao-nativa');
    expect(JSON.stringify(escolha.lacuna)).not.toContain('instalar');
  });

  it('não confunde o provedor procedural real com o fluxo completo de veículo', () => {
    const registro = criarRegistroProvedoresAutoria([criarProvedorProceduralAutoria()]);
    const plano: any = planejarFluxoAutoria({ objetivo: objetivo(), provedores: registro });
    expect(plano.estado).toBe('bloqueado');
    expect(plano.escolhas.find(({ necessidade }: any) => necessidade === 'etapa-blocagem')).toMatchObject({
      estado: 'bloqueada', provedor: null,
    });
    expect(plano.diagnosticos.some(({ codigo }: any) => codigo === 'provedor-ausente')).toBe(true);
  });

  it('produz plano determinístico e diagnóstico acionável quando falta provedor', () => {
    const completo = criarRegistroProvedoresAutoria([provedorFluxo()]);
    const a: any = planejarFluxoAutoria({ objetivo: objetivo(), provedores: completo });
    const b: any = planejarFluxoAutoria({ objetivo: objetivo(), provedores: completo });
    expect(a.estado).toBe('pronto');
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.etapas.map(({ id }: any) => id)).toEqual(etapasFluxo);

    const vazio = criarRegistroProvedoresAutoria([]);
    const bloqueado: any = planejarFluxoAutoria({ objetivo: objetivo(), provedores: vazio });
    expect(bloqueado.estado).toBe('bloqueado');
    expect(bloqueado.diagnosticos[0]).toEqual(expect.objectContaining({
      codigo: 'provedor-ausente', campo: expect.any(String), causa: expect.any(String),
      impacto: expect.any(String), proximoPasso: expect.any(String),
    }));
    expect(() => criarExecucaoFluxoAutoria(bloqueado)).toThrow(/bloqueado/);
  });

  it('recusa plano de provedor não serializável em vez de apagar campos silenciosamente', () => {
    const invalido: any = provedorFluxo();
    invalido.planejar = () => ({
      estado: 'coberta', custo: 1, plano: { executar() {} }, diagnosticos: [],
    });
    const plano: any = planejarFluxoAutoria({ objetivo: objetivo(), provedores: criarRegistroProvedoresAutoria([invalido]) });
    expect(plano.estado).toBe('bloqueado');
    expect(plano.diagnosticos.some(({ codigo }: any) => codigo === 'falha-de-provedor')).toBe(true);
  });

  it('interrompe antes dos provedores quando a referência tem bloqueio explícito', () => {
    let chamadas = 0;
    const provedor: any = provedorFluxo();
    provedor.planejar = () => { chamadas += 1; return { estado: 'coberta', custo: 1, plano: {}, diagnosticos: [] }; };
    const registro = criarRegistroProvedoresAutoria([provedor]);
    const plano: any = planejarFluxoAutoria({
      objetivo: objetivo({
        incertezas: [{ id: 'escala', sobre: 'dimensões', motivo: 'não há medida independente', efeito: 'bloqueia', referencia: 'briefing' }],
      }),
      provedores: registro,
    });
    expect(plano).toMatchObject({ estado: 'bloqueado', etapas: [], escolhas: [] });
    expect(plano.diagnosticos[0].codigo).toBe('referencia-bloqueada');
    expect(chamadas).toBe(0);
  });

  it('impede salto, passe sem evidência e promoção sem decisão do usuário', () => {
    const plano = planejarFluxoAutoria({ objetivo: objetivo(), provedores: criarRegistroProvedoresAutoria([provedorFluxo()]) });
    let execucao: any = criarExecucaoFluxoAutoria(plano);
    expect(() => registrarResultadoEtapa(execucao, resultado('alvo'))).toThrow(/esperado 'briefing'/);
    expect(() => registrarResultadoEtapa(execucao, { ...resultado('briefing'), evidencias: [] })).toThrow(/sem evidência/);

    for (const etapa of etapasFluxo.slice(0, -1)) {
      const decisao = etapa === 'blocagem' ? 'aprovar' : null;
      execucao = registrarResultadoEtapa(execucao, resultado(etapa, decisao));
    }
    expect(execucao).toMatchObject({ estado: 'em-execucao', etapaAtual: 'promocao' });
    expect(() => registrarResultadoEtapa(execucao, resultado('promocao'))).toThrow(/aceite explícito/);
    execucao = registrarResultadoEtapa(execucao, resultado('promocao', 'aprovar'));
    expect(execucao).toMatchObject({ estado: 'concluido', etapaAtual: null });
    expect(execucao.historico).toHaveLength(etapasFluxo.length);
    expect(() => registrarResultadoEtapa(execucao, resultado('promocao', 'aprovar'))).toThrow(/não aceita/);
  });

  it('torna reprovação terminal e exige diagnóstico em vez de silêncio verde', () => {
    const plano = planejarFluxoAutoria({ objetivo: objetivo(), provedores: criarRegistroProvedoresAutoria([provedorFluxo()]) });
    const execucao = criarExecucaoFluxoAutoria(plano);
    expect(() => registrarResultadoEtapa(execucao, {
      etapa: 'briefing', estado: 'reprovada', evidencias: [], diagnosticos: [], decisaoUsuario: null,
    })).toThrow(/diagnóstico/);
    expect(() => registrarResultadoEtapa(execucao, {
      etapa: 'briefing', estado: 'reprovada', evidencias: [], decisaoUsuario: 'aprovar',
      diagnosticos: [{ codigo: 'x', campo: 'x', causa: 'x', impacto: 'x', proximoPasso: 'x' }],
    })).toThrow(/contradiz/);
    const reprovada: any = registrarResultadoEtapa(execucao, {
      etapa: 'briefing', estado: 'reprovada', evidencias: [], decisaoUsuario: null,
      diagnosticos: [{
        codigo: 'briefing-contraditorio', campo: 'objetivo', causa: 'duas escalas incompatíveis',
        impacto: 'não há alvo único', proximoPasso: 'resolver a escala antes de modelar',
      }],
    });
    expect(reprovada).toMatchObject({ estado: 'reprovado', etapaAtual: 'briefing' });
    expect(() => registrarResultadoEtapa(reprovada, resultado('briefing'))).toThrow(/não aceita/);
  });
});
