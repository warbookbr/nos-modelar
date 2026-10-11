/* aprovacao-da-familia.test.mjs — a camada mecânica da aprovação de uma família e o hash preso ao `aprovacao.json`.
   A prova: a família de fixture aprovada; a bucha com o raio da porta errado reprovada pela porta; a caixa de parede
   uniforme aprovada e a de entalhe reprovada pela parede da casca; o suporte com chapa e barras lido pelo planificado e
   pelo corte; e a família alterada depois da aprovação reprovada pelo conferir, dizendo qual ponto mudou. */
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { PASSOS as PASSOS_DA_ARTICULACAO } from '../../procedural/extensoes/articulacao/fixture.js';
import {
  REGISTRO_OPERACOES, criarRegistroComExtensoes,
} from '../../procedural/nucleo/entrada.js';
import { definirFamilia } from '../../src/autoria/chamar-familia.js';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { TUBO_DE_PROVA } from '../fixtures/familia-chamavel/familia.js';
import { ID_BARRA, ID_TUBO, COMPOSICOES as COMPOSICOES_DO_TUBO } from '../fixtures/familia-chamavel/composicoes.js';
import { criarSuporte } from '../fixtures/familia-com-chapa-e-barras/familia.js';
import { criarCaixaOca } from '../fixtures/familia-com-casca/familia.js';
import { COMPOSICOES as COMPOSICOES_DA_BUCHA, criarBucha } from '../fixtures/familia-com-porta/familia.js';
import {
  FORMATO_APROVACAO, LIMITE_DA_PAREDE_MAXIMA, aprovarFamilia, conferirAprovacao, extensoesMedidas, medirPonto, pontosDaFamilia, varreduraDaFamilia,
} from './aprovacao-da-familia.mjs';

const raizes = [];
/* a pasta de uma família aprovada: `<tmp>/<id>/familia.json`, como em procedural/familias/<id>/ */
function pastaDa(familia) {
  const raiz = mkdtempSync(join(tmpdir(), 'familia-'));
  raizes.push(raiz);
  const pasta = join(raiz, familia.contrato.id);
  mkdirSync(pasta);
  writeFileSync(join(pasta, 'familia.json'), JSON.stringify(familia.contrato));
  return pasta;
}
afterAll(() => { for (const raiz of raizes) rmSync(raiz, { recursive: true, force: true }); });

const lerAprovacao = (pasta) => JSON.parse(readFileSync(join(pasta, 'aprovacao.json'), 'utf8'));
const codigos = (resultado) => resultado.problemas.map(({ codigo }) => codigo);
/* a família com outro `derivar`, a mesma de resto */
const comOutroDerivar = (familia, mudar) => definirFamilia({ contrato: familia.contrato, composicoes: familia.composicoes, derivar: (parametros) => mudar(familia.derivar(parametros), parametros) });

describe('os pontos e a varredura saem do contrato', () => {
  it('os três pontos são todos os parâmetros no mínimo, no médio e no máximo', () => {
    expect(pontosDaFamilia(TUBO_DE_PROVA.contrato)).toEqual({
      minimo: { comprimento: 20, diametro: 10, lados: 8, parede: 0 },
      medio: { comprimento: 260, diametro: 100, lados: 36, parede: 5 },
      maximo: { comprimento: 500, diametro: 200, lados: 64, parede: 40 },
    });
  });

  it('a varredura leva cada parâmetro aos dois extremos com os outros no padrão', () => {
    const sondas = varreduraDaFamilia(TUBO_DE_PROVA.contrato);
    expect(sondas.map(({ rotulo }) => rotulo)).toEqual(['comprimento=20', 'comprimento=500', 'diametro=10', 'diametro=200', 'lados=8', 'lados=64', 'parede=0', 'parede=40']);
    expect(sondas[3].parametros).toEqual({ comprimento: 120, diametro: 200, lados: 24, parede: 3 });
  });
});

describe('a família de fixture aprovada', () => {
  const pasta = pastaDa(TUBO_DE_PROVA);
  const resultado = aprovarFamilia(TUBO_DE_PROVA, { pasta, data: '2026-10-11' });

  it('passa nos três pontos e na varredura, e a recusa pela restrição declarada vira resposta, não defeito', () => {
    expect(resultado.problemas).toEqual([]);
    expect(resultado.aprovada).toBe(true);
    expect(Object.values(resultado.pontos).map(({ estado }) => estado)).toEqual(['ok', 'ok', 'ok']);
    const recusadas = resultado.varredura.filter(({ estado }) => estado === 'recusa-declarada');
    expect(recusadas.map(({ rotulo, restricao }) => `${rotulo}:${restricao}`)).toEqual([
      'comprimento=20:mais-comprido-que-largo', 'diametro=200:mais-comprido-que-largo', 'parede=40:parede-nao-fecha-o-furo',
    ]);
  });

  it('grava a camada mecânica com o hash da geometria dos três pontos e a data, e as outras camadas vazias', () => {
    const aprovacao = lerAprovacao(pasta);
    expect(aprovacao).toMatchObject({ formato: FORMATO_APROVACAO, familia: 'tubo-de-prova', versao: '1.0.0', critico: null, pessoa: null });
    expect(aprovacao.mecanica.data).toBe('2026-10-11');
    expect(Object.keys(aprovacao.mecanica.pontos)).toEqual(['minimo', 'medio', 'maximo']);
    const hashes = Object.values(aprovacao.mecanica.pontos).map(({ hash }) => hash);
    for (const hash of hashes) expect(hash).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(new Set(hashes).size).toBe(3);
    expect(aprovacao.mecanica.pontos.maximo.parametros).toEqual({ comprimento: 500, diametro: 200, lados: 64, parede: 40 });
    expect(aprovacao.mecanica.varredura.sondas).toBe(8);
    expect(aprovacao.mecanica.varredura.recusasDeclaradas).toHaveLength(3);
  });

  it('aprovar de novo dá os mesmos hashes (determinismo) e mantém as camadas do crítico e da pessoa da mesma geometria', () => {
    const antes = lerAprovacao(pasta);
    writeFileSync(join(pasta, 'aprovacao.json'), JSON.stringify({ ...antes, critico: { nota: 9 }, pessoa: { assinou: true } }));
    const outra = aprovarFamilia(TUBO_DE_PROVA, { pasta, data: '2026-10-12' });
    const depois = lerAprovacao(pasta);
    expect(outra.esvaziou).toBe(false);
    expect(Object.values(depois.mecanica.pontos).map(({ hash }) => hash)).toEqual(Object.values(antes.mecanica.pontos).map(({ hash }) => hash));
    expect(depois).toMatchObject({ critico: { nota: 9 }, pessoa: { assinou: true } });
    expect(depois.mecanica.data).toBe('2026-10-12');
    writeFileSync(join(pasta, 'aprovacao.json'), `${JSON.stringify(antes, null, 2)}\n`);
  });

  it('o conferir passa com a aprovação gravada', () => {
    expect(conferirAprovacao(TUBO_DE_PROVA, { pasta })).toEqual({ ok: true, familia: 'tubo-de-prova', problemas: [] });
  });
});

describe('a geometria alterada depois da aprovação', () => {
  const pasta = pastaDa(TUBO_DE_PROVA);
  aprovarFamilia(TUBO_DE_PROVA, { pasta, data: '2026-10-11' });

  it('reprova dizendo qual ponto mudou: aqui só o máximo, onde o derivar passa a engrossar o diâmetro', () => {
    const alterada = comOutroDerivar(TUBO_DE_PROVA, (derivado, parametros) => (parametros.diametro === 200
      ? { ...derivado, argumentos: { ...derivado.argumentos, raio: derivado.argumentos.raio + 0.001 } }
      : derivado));
    const conferido = conferirAprovacao(alterada, { pasta });
    expect(conferido.ok).toBe(false);
    expect(conferido.problemas.map(({ codigo, ponto }) => `${ponto}:${codigo}`)).toEqual(['maximo:geometria-mudou']);
    expect(conferido.problemas[0].mensagem).toMatch(/geometria do ponto 'maximo' mudou desde a aprovação.*npm run familia -- aprovar tubo-de-prova/);
  });

  it('reprova os três pontos quando a mudança vale para todos', () => {
    const alterada = comOutroDerivar(TUBO_DE_PROVA, (derivado) => ({ ...derivado, argumentos: { ...derivado.argumentos, comprimento: derivado.argumentos.comprimento + 0.001 } }));
    const conferido = conferirAprovacao(alterada, { pasta });
    expect(conferido.problemas.map(({ ponto }) => ponto)).toEqual(['minimo', 'medio', 'maximo']);
  });

  it('reprova a faixa que o contrato mudou depois da aprovação, dizendo o ponto', () => {
    const contrato = JSON.parse(JSON.stringify(TUBO_DE_PROVA.contrato));
    contrato.parametros.comprimento.maximo = 600;
    const alterada = definirFamilia({ contrato, composicoes: TUBO_DE_PROVA.composicoes, derivar: TUBO_DE_PROVA.derivar });
    const conferido = conferirAprovacao(alterada, { pasta, exigirNomeDaPasta: false });
    expect(conferido.problemas.filter(({ codigo }) => codigo === 'ponto-mudou-de-parametros').map(({ ponto }) => ponto)).toEqual(['maximo']);
  });

  it('reprova a família sem aprovação e a pasta com outro nome', () => {
    expect(codigos(conferirAprovacao(criarBucha(), { pasta: pastaDa(criarBucha()) }))).toEqual(['sem-aprovacao']);
    const conferido = conferirAprovacao(TUBO_DE_PROVA, { pasta: join(pasta, '..', '..') });
    expect(codigos(conferido)).toContain('pasta-com-outro-nome');
  });

  it('o familia.json da pasta tem de ser o contrato carregado', () => {
    const outra = pastaDa(TUBO_DE_PROVA);
    aprovarFamilia(TUBO_DE_PROVA, { pasta: outra });
    const contrato = JSON.parse(readFileSync(join(outra, 'familia.json'), 'utf8'));
    contrato.versao = '1.0.1';
    writeFileSync(join(outra, 'familia.json'), JSON.stringify(contrato));
    expect(codigos(conferirAprovacao(TUBO_DE_PROVA, { pasta: outra }))).toEqual(['contrato-diferente-do-carregado']);
  });
});

describe('a porta que não confere com a malha', () => {
  it('a bucha com a porta no raio certo passa, com a porta declarada publicada e conferida', () => {
    const resultado = aprovarFamilia(criarBucha(), { gravar: false });
    expect(resultado.problemas).toEqual([]);
    expect(resultado.pontos.medio.portas).toEqual(['assento']);
    expect(resultado.varredura.filter(({ estado }) => estado === 'recusa-declarada').map(({ rotulo }) => rotulo)).toEqual(['diametro=30']);
  });

  it('a bucha com o raio da porta 2 mm acima do raio da peça é reprovada pela porta, nos três pontos, e não grava', () => {
    const familia = criarBucha({ erroDoRaioMm: 2 });
    const pasta = pastaDa(familia);
    const resultado = aprovarFamilia(familia, { pasta });
    expect(resultado.aprovada).toBe(false);
    expect(resultado.gravada).toBe(false);
    expect(resultado.problemas.filter(({ ponto }) => ['minimo', 'medio', 'maximo'].includes(ponto)).map(({ ponto, codigo }) => `${ponto}:${codigo}`))
      .toEqual(['minimo:porta-com-raio-errado', 'medio:porta-com-raio-errado', 'maximo:porta-com-raio-errado']);
    expect(resultado.problemas[2].mensagem).toMatch(/declara raio 62\.00 mm, e a peça junto do plano dela chega a 60\.00 mm do eixo/);
    expect(() => lerAprovacao(pasta)).toThrow(/ENOENT/);
  });

  it('a porta declarada que a receita não publica é reprovada como ausente, e a de outro papel como outro papel', () => {
    const bucha = criarBucha();
    const contrato = JSON.parse(JSON.stringify(bucha.contrato));
    contrato.portas = [{ id: 'encosto', tipo: 'anel', papel: 'ocupa' }];
    const ausente = aprovarFamilia(definirFamilia({ contrato, composicoes: COMPOSICOES_DA_BUCHA, derivar: bucha.derivar }), { gravar: false });
    expect(codigos(ausente)).toContain('porta-ausente');
    contrato.portas = [{ id: 'assento', tipo: 'anel', papel: 'recebe' }];
    const papel = medirPonto(definirFamilia({ contrato, composicoes: COMPOSICOES_DA_BUCHA, derivar: bucha.derivar }), pontosDaFamilia(contrato).medio);
    expect(papel.problemas.map(({ codigo }) => codigo)).toEqual(['porta-de-outro-papel']);
    contrato.portas = [{ id: 'assento', tipo: 'cilindro', papel: 'externa' }];
    const tipo = medirPonto(definirFamilia({ contrato, composicoes: COMPOSICOES_DA_BUCHA, derivar: bucha.derivar }), pontosDaFamilia(contrato).medio);
    expect(tipo.problemas.map(({ codigo }) => codigo)).toEqual(['porta-de-outro-tipo']);
  });

  it('a porta publicada e não declarada aparece como informação, sem reprovar', () => {
    const bucha = criarBucha();
    const contrato = JSON.parse(JSON.stringify(bucha.contrato));
    contrato.portas = [];
    const ponto = medirPonto(definirFamilia({ contrato, composicoes: COMPOSICOES_DA_BUCHA, derivar: bucha.derivar }), pontosDaFamilia(contrato).medio);
    expect(ponto.estado).toBe('ok');
    expect(ponto.portasNaoDeclaradas).toEqual(['assento']);
  });
});

describe('a parede da casca', () => {
  it('a caixa de parede uniforme passa, com a parede medida igual à pedida', () => {
    const resultado = aprovarFamilia(criarCaixaOca(), { gravar: false });
    expect(resultado.problemas).toEqual([]);
    const [casca] = resultado.pontos.maximo.medidas;
    expect(casca).toMatchObject({ ferramenta: 'casca', espessura: 0.01 });
    expect(casca.espessuraMinima).toBeCloseTo(0.01, 9);
    expect(casca.espessuraMaxima).toBeCloseTo(0.01, 9);
  });

  it(`a caixa com entalhe engrossa a parede até 2 vezes a pedida, acima do limite de ${LIMITE_DA_PAREDE_MAXIMA}, e é reprovada pela medida`, () => {
    const familia = criarCaixaOca({ comEntalhe: true });
    const pasta = pastaDa(familia);
    const resultado = aprovarFamilia(familia, { pasta });
    expect(resultado.aprovada).toBe(false);
    expect(resultado.problemas.map(({ ponto, codigo }) => `${ponto}:${codigo}`)).toEqual(['maximo:parede-acima-do-limite', 'varredura entalhe=1:parede-acima-do-limite']);
    expect(resultado.problemas[0].mensagem).toMatch(/engrossa até 0\.02, 2\.00 vezes a pedida \(0\.01\); o limite é 1\.5 vezes/);
    expect(resultado.pontos.maximo.medidas[0].espessuraMaxima / resultado.pontos.maximo.medidas[0].espessura).toBeCloseTo(2, 6);
    expect(resultado.pontos.minimo.estado).toBe('ok');
    expect(() => lerAprovacao(pasta)).toThrow(/ENOENT/);
  });
});

describe('a chapa e as barras', () => {
  const resultado = aprovarFamilia(criarSuporte(), { gravar: false });

  it('a família com chapa e barras passa', () => {
    expect(resultado.problemas).toEqual([]);
  });

  it('o planificado da chapa é a soma dos trechos retos com o desenvolvimento das dobras', () => {
    const [chapa] = resultado.pontos.minimo.medidas;
    expect(chapa.ferramenta).toBe('chapaDobrada');
    expect(chapa.comprimentoReto).toBeCloseTo(0.06, 9);
    expect(chapa.comprimentoPlanificado).toBeCloseTo(chapa.comprimentoReto + chapa.desenvolvimentoDasDobras, 9);
    expect(chapa.areaPlanificada).toBeCloseTo(chapa.comprimentoPlanificado * 0.03, 9);
  });

  it('o corte de cada barra sai da lista de corte da extensão', () => {
    const [quadro] = resultado.pontos.maximo.medidas;
    expect(quadro.ferramenta).toBe('estruturaDeBarras');
    expect(quadro.cortes).toEqual([
      { barra: 'base', comprimentoEntreNos: 1000, comprimentoDeCorte: 1040 },
      { barra: 'direita', comprimentoEntreNos: 500, comprimentoDeCorte: 540 },
      { barra: 'topo', comprimentoEntreNos: 1000, comprimentoDeCorte: 1040 },
      { barra: 'esquerda', comprimentoEntreNos: 500, comprimentoDeCorte: 540 },
    ]);
  });
});

describe('a articulação', () => {
  it('a declaração é anotada com o curso, sem ser dada como conferida contra a montagem', () => {
    const coletor = [];
    const registroOperacoes = criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: extensoesMedidas(coletor) });
    executarReceita({ PASSOS: PASSOS_DA_ARTICULACAO, PARAMS: {}, TOPO: {}, ALIASES: [], MATERIAIS: {} }, { registroOperacoes });
    expect(coletor).toEqual([{ ferramenta: 'articulacao', id: 'porta-no-batente', tipo: 'revolucao', unidade: 'graus', curso: { minimo: 0, maximo: 90 }, passos: 18 }]);
  });
});

describe('o que reprova um ponto', () => {
  const tubo = TUBO_DE_PROVA;
  const medio = pontosDaFamilia(tubo.contrato).medio;

  it('recusa que a família não declara como restrição', () => {
    const quebrada = comOutroDerivar(tubo, () => ({ composicao: 'prova.inexistente', argumentos: {} }));
    const ponto = medirPonto(quebrada, medio);
    expect(ponto.estado).toBe('reprovado');
    expect(ponto.problemas.map(({ codigo }) => codigo)).toEqual(['recusa-fora-das-restricoes']);
    expect(ponto.problemas[0].mensagem).toMatch(/uma composição da família/);
  });

  it('passo que não faz efeito (órfão): a casca recusada pela extensão', () => {
    const grossa = comOutroDerivar(criarCaixaOca(), (derivado) => ({ ...derivado, argumentos: { ...derivado.argumentos, parede: 1 } }));
    const ponto = medirPonto(grossa, pontosDaFamilia(grossa.contrato).medio);
    expect(ponto.problemas.map(({ codigo }) => codigo)).toContain('orfaos');
  });

  it('geometria que muda entre duas execuções', () => {
    let chamadas = 0;
    const instavel = comOutroDerivar(tubo, (derivado) => {
      chamadas += 1;
      return chamadas % 2 ? { ...derivado, argumentos: { ...derivado.argumentos, comprimento: derivado.argumentos.comprimento + chamadas * 0.001 } } : derivado;
    });
    const ponto = medirPonto(instavel, medio);
    expect(ponto.problemas.map(({ codigo }) => codigo)).toContain('nao-deterministico');
  });

  it('malha aberta: o perfil de revolução que não volta ao eixo', () => {
    const aberta = definirFamilia({
      contrato: tubo.contrato,
      composicoes: COMPOSICOES_DO_TUBO.map((c) => (c.id === ID_BARRA
        ? { ...c, nos: c.nos.map((no) => (no.operacao === 'lathe' ? { ...no, argumentos: { ...no.argumentos, perfil: no.argumentos.perfil.slice(0, 3) } } : no)) }
        : c)),
      derivar: tubo.derivar,
    });
    const ponto = medirPonto(aberta, { ...medio, parede: 0 });
    expect(ponto.problemas.map(({ codigo }) => codigo)).toContain('malha-aberta');
    expect(ID_TUBO).toBe('prova.tubo-de-parede');
  });

  it('ponto aprovado recusado por restrição reprova a aprovação', () => {
    const contrato = JSON.parse(JSON.stringify(tubo.contrato));
    contrato.restricoes.push({ id: 'diametro-pequeno', expressao: 'diametro < 150', motivo: 'o diâmetro máximo da família passou do que a restrição aceita' });
    const resultado = aprovarFamilia(definirFamilia({ contrato, composicoes: tubo.composicoes, derivar: tubo.derivar }), { gravar: false });
    expect(resultado.aprovada).toBe(false);
    expect(resultado.problemas.map(({ ponto, codigo }) => `${ponto}:${codigo}`)).toContain('maximo:ponto-aprovado-recusado');
  });
});
