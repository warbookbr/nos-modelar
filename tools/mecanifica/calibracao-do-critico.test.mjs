/* calibracao-do-critico.test.mjs — o gate `calibracao:check`: o conjunto versionado passa, e cada coisa que ele confere reprova quando muda. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { medirEsboco } from '../../modulos/esboco/src/descrever.js';
import { perguntasDoEsboco } from '../../modulos/esboco/src/perguntas.js';
import { conferirRazoesDaPeca, normalizarRazoesDaPeca } from '../../src/autoria/razoes-da-peca.js';
import { formasDaPeca } from '../../src/autoria/forma-da-parte.js';
import { medidasEsperadas } from '../../src/autoria/calibracao-do-critico.js';
import {
  RAIZ, ErroDaFonte, caminhoDoConjunto, chamadaDaFonte, conferir, conferirConjunto, descreverFonte, esbocoDaFonte, executarChamada, faltaNoAgente,
  hashDoAgente, hashDoBrief, hashDoDesenho, idsDaMedidaDaPeca, lerConjuntoDoDisco, modeloDoBrief, principal, vocabularioDoAgente,
} from './calibracao-do-critico.mjs';

const conjuntoNovo = () => JSON.parse(JSON.stringify(lerConjuntoDoDisco()));
const imagem = (c, nome) => c.imagens.find((i) => i.nome === nome);
const saidaFalsa = () => { const linhas = { log: [], error: [] }; return { linhas, log: (t) => linhas.log.push(t), error: (t) => linhas.error.push(t) }; };
const codigos = (r) => r.problemas.map((p) => p.codigo);

describe('o gate sobre o conjunto versionado', () => {
  it('passa, diz quantos defeitos da medida reprovou sem o crítico e que a calibração não foi medida', () => {
    const saida = saidaFalsa();
    expect(conferir({}, saida)).toBe(0);
    expect(saida.linhas.error).toEqual([]);
    expect(saida.linhas.log[0]).toMatch(/^calibracao:check ok — 12 de 12 imagens \(3 controles, 1 de superfície, 8 estruturais\).*4 defeito\(s\) da medida reprovado\(s\) por ela sem chegar ao crítico/);
    expect(saida.linhas.log[1]).toBe('calibração não medida: nenhuma das 12 imagens tem julgamento do crítico (resultados vazio)');
  }, 120_000);

  it('o script chama o gate e sai com 0', async () => {
    const saida = saidaFalsa();
    expect(await principal(['conferir', '--so=c05'], saida)).toBe(0);
    expect(await principal(['conferir', '--so=c99'], saida)).toBe(2);
    expect(await principal(['conferir', 'x'], saida)).toBe(0);
    expect(await principal(['nada'], saida)).toBe(2);
    expect(saida.linhas.error.join('\n')).toMatch(/--so cita c99/);
  });

  it('os controles são a geometria aprovada: as três famílias têm o ponto médio no aprovacao.json', () => {
    const r = conferirConjunto({ so: 'c02,c05,c09' });
    expect(r.ok).toBe(true);
  });
});

describe('cada conferência reprova quando o que ela guarda muda', () => {
  it('o agente do crítico mudou: o hash gravado deixa de bater', () => {
    const c = conjuntoNovo();
    c.critico.agente.sha256 = `sha256:${'0'.repeat(64)}`;
    const r = conferirConjunto({ conjunto: c, so: 'c05' });
    expect(codigos(r)).toContain('agente-mudou');
    expect(r.problemas.find((p) => p.codigo === 'agente-mudou').mensagem).toMatch(/meça de novo/);
  });

  it('o texto do brief mudou: o hash do modelo deixa de bater', () => {
    const c = conjuntoNovo();
    c.critico.brief.sha256 = `sha256:${'1'.repeat(64)}`;
    expect(codigos(conferirConjunto({ conjunto: c, so: 'c05' }))).toContain('brief-mudou');
  });

  it('o resultado medido com outro crítico reprova', () => {
    const c = conjuntoNovo();
    c.resultados = [{ imagem: 'c05', agenteSha256: `sha256:${'2'.repeat(64)}`, briefSha256: c.critico.brief.sha256, julgamentos: [{ nota: 9 }] }];
    expect(codigos(conferirConjunto({ conjunto: c, so: 'c05' }))).toContain('resultado-de-outro-critico');
  });

  it('o desenho da fonte mudou: a mutação de uma imagem muda a impressão e a geometria', () => {
    const c = conjuntoNovo();
    imagem(c, 'facetado').fonte.argumentos[0].valor = 16;
    const r = conferirConjunto({ conjunto: c, so: 'c06' });
    expect(codigos(r)).toEqual(expect.arrayContaining(['desenho-mudou', 'geometria-mudou']));
  });

  it('o arquivo do esboço mudou ou o remendo mudou o desenho', () => {
    const c = conjuntoNovo();
    imagem(c, 'picape-baixa').fonte.arquivoSha256 = `sha256:${'3'.repeat(64)}`;
    expect(codigos(conferirConjunto({ conjunto: c, so: 'c03' }))).toContain('esboco-mudou');
    const d = conjuntoNovo();
    imagem(d, 'dobradicas-por-fora').fonte.remendo = { plano: { familia: 'movel-de-caixa' }, parametros: { alturaPorta: 1700 } };
    expect(codigos(conferirConjunto({ conjunto: d, so: 'c07' }))).toContain('desenho-mudou');
  });

  it('o PNG gravado não é o arquivo: o sha256 do arquivo é conferido', () => {
    const c = conjuntoNovo();
    imagem(c, 'controle-dobradica').vistas.frontal.sha256 = `sha256:${'4'.repeat(64)}`;
    const r = conferirConjunto({ conjunto: c, so: 'c09' });
    expect(codigos(r)).toEqual(['imagem-diferente']);
  });

  it('o controle que deixa de ser o ponto aprovado, e a mutação que não muda nada', () => {
    const c = conjuntoNovo();
    const controle = imagem(c, 'controle-cilindro');
    controle.fonte.base = 'minimo';
    controle.fonte.aprovacao = 'medio';
    expect(codigos(conferirConjunto({ conjunto: c, so: 'c05' }))).toContain('controle-nao-e-o-aprovado');
    const d = conjuntoNovo();
    imagem(d, 'facetado').fonte.argumentos = [{ nome: 'lados', valor: 32 }];
    expect(codigos(conferirConjunto({ conjunto: d, so: 'c06' }))).toContain('mutacao-sem-efeito');
  });

  it('a fonte que viola restrição sem nomeá-la, ou nomeia a que não viola, não se reproduz', () => {
    const c = conjuntoNovo();
    imagem(c, 'haste-grossa').fonte.viola = ['haste-abaixo-do-embolo'];
    const r = conferirConjunto({ conjunto: c, so: 'c01' });
    expect(codigos(r)).toEqual(['fonte-nao-reproduz']);
    expect(r.problemas[0].mensagem).toMatch(/violam as restrições \[haste-abaixo-do-embolo, haste-grossa-demais\] e a fonte declara \[haste-abaixo-do-embolo\]/);
    const d = conjuntoNovo();
    imagem(d, 'facetado').fonte.argumentos = [{ nome: 'naoExiste', valor: 1 }];
    expect(conferirConjunto({ conjunto: d, so: 'c06' }).problemas[0].mensagem).toMatch(/'naoExiste' não é argumento/);
  });
});

describe('decide vale dos dois lados', () => {
  it('o defeito da medida que a medida não reprova, e a medida que reprova o que ninguém cita', () => {
    const c = conjuntoNovo();
    imagem(c, 'haste-grossa').fonte.parametros = { haste: 60 };
    imagem(c, 'haste-grossa').fonte.viola = ['haste-abaixo-do-embolo', 'haste-grossa-demais'].slice(0, 0);
    delete imagem(c, 'haste-grossa').fonte.viola;
    const r = conferirConjunto({ conjunto: c, so: 'c01' });
    expect(codigos(r)).toContain('medida-nao-decide');
    expect(r.problemas.find((p) => p.codigo === 'medida-nao-decide').mensagem).toMatch(/não reprova razao:hastePelaCamisa/);

    const d = conjuntoNovo();
    const h = imagem(d, 'haste-grossa');
    h.defeitos[0] = { ...h.defeitos[0], decide: 'critico', palavras: ['haste'] };
    delete h.defeitos[0].medida;
    const sobra = conferirConjunto({ conjunto: d, so: 'c01' });
    expect(sobra.problemas.find((p) => p.codigo === 'medida-nao-decide').mensagem).toMatch(/reprova razao:hastePelaCamisa, que nenhum defeito cita/);
  });

  it('a picape: a razão reprova pelo `--medidas` do esboço, e só ela', () => {
    const c = lerConjuntoDoDisco();
    const { bruto } = esbocoDaFonte(imagem(c, 'picape-baixa').fonte);
    const medido = medirEsboco(bruto, { projecao: false });
    expect(medido.plano.achados.map((a) => `${a.tipo}:${a.nome}`)).toEqual(['medida-fora:alturaPeloComprimento']);
    expect(medido.plano.opcoes[0].medidas.find((m) => m.nome === 'alturaPeloComprimento')).toMatchObject({ tipo: 'razao', medido: 0.28, a_mm: 1400, b_mm: 5000, faixa: [0.3, 0.4], ok: false });
    expect(medidasEsperadas(imagem(c, 'picape-baixa'))).toEqual(['esboco-medida:alturaPeloComprimento']);
  });

  it('o pneu maciço reprova pela forma e a haste grossa pela razão, e nenhuma outra imagem de família reprova', () => {
    const c = lerConjuntoDoDisco();
    const medidasDe = (nome) => {
      const { fonte } = imagem(c, nome);
      const { familia, chamada } = chamadaDaFonte(fonte);
      return idsDaMedidaDaPeca(executarChamada(familia, chamada), c.medidas.familias[fonte.familia]);
    };
    expect(medidasDe('pneu-macico')).toEqual(['forma:pneu']);
    expect(medidasDe('haste-grossa')).toEqual(['razao:hastePelaCamisa']);
    expect(medidasDe('raios-curtos')).toEqual(['razao:discoAlcancaOAro']);
    for (const nome of ['controle-roda', 'controle-cilindro', 'facetado', 'travessia-sem-explicacao', 'peca-fora-do-lugar']) expect(medidasDe(nome), nome).toEqual([]);
  });

  it('a roda raiada sem a mutação dos raios passa a mesma medida: a razão separa o raio que chega ao aro do que não chega', () => {
    const c = lerConjuntoDoDisco();
    const suite = c.medidas.familias['roda-pneu'];
    for (const base of ['padrao', 'maximo']) {
      const { familia, chamada } = chamadaDaFonte({ tipo: 'familia', familia: 'roda-pneu', base, ...(base === 'padrao' ? { parametros: { tipo: 1 } } : {}) });
      const neutro = executarChamada(familia, chamada);
      const razao = conferirRazoesDaPeca({ razoes: normalizarRazoesDaPeca(suite.razoes), neutro });
      expect(razao.ok, base).toBe(true);
      expect(formasDaPeca(neutro, { formas: suite.formas }).divergentes).toEqual([]);
    }
  }, 120_000);
});

describe('o crítico: o agente e o brief', () => {
  const agente = () => readFileSync(`${RAIZ}/.claude/agents/critico-visual.md`, 'utf8');

  it('o agente escreve todo tipo e sentido de defeito que o conjunto aceita', () => {
    expect(faltaNoAgente(agente())).toEqual([]);
    const vocabulario = vocabularioDoAgente(agente());
    expect([...vocabulario.superficie].sort()).toEqual(expect.arrayContaining(['anguloso', 'facetado', 'segmentado']));
    expect([...vocabulario.uniao].sort()).toEqual(['afastado', 'atravessando']);
  });

  it('o vocabulário que falta no agente é nomeado', () => {
    expect(faltaNoAgente(agente().replace('`segmentado`', '`outro`'))).toEqual(['sentido superficie/segmentado']);
    expect(faltaNoAgente(agente().replace('- **uniao**', '- **juncao**'))).toEqual(['tipo uniao']);
  });

  it('o hash do agente ignora a quebra de linha do Windows e o do brief cobre o texto fixo e as perguntas', () => {
    expect(hashDoAgente('.claude/agents/critico-visual.md')).toMatch(/^sha256:[0-9a-f]{64}$/);
    const modelo = modeloDoBrief();
    expect(modelo.objeto.join('\n')).toContain('Responda, olhando só as imagens:');
    expect(modelo.comPerguntas.length).toBeGreaterThan(modelo.objeto.length);
    expect(modelo.bloco).toContain('Perguntas de forma deste objeto');
    expect(hashDoBrief()).toBe(hashDoBrief());
    expect(ErroDaFonte).toBeTypeOf('function');
  });

  it('o guarda-roupa remendado com a família entra no brief novo com a pergunta da dobradiça e da porta', () => {
    const c = lerConjuntoDoDisco();
    const { bruto } = esbocoDaFonte(imagem(c, 'dobradicas-por-fora').fonte);
    const perguntas = perguntasDoEsboco(bruto).todas;
    expect(perguntas.some((p) => /dobradiça/.test(p))).toBe(true);
    expect(perguntas.some((p) => /gaveta/.test(p))).toBe(true);
  });
});

describe('a descrição das fontes e a impressão do desenho', () => {
  it('descreve a mutação de cada fonte numa frase e a impressão não depende da ordem das vistas lidas', () => {
    const c = lerConjuntoDoDisco();
    expect(descreverFonte(imagem(c, 'haste-grossa').fonte)).toBe('cilindro-hidraulico no ponto medio; haste=110; viola haste-abaixo-do-embolo, haste-grossa-demais');
    expect(descreverFonte(imagem(c, 'raios-curtos').fonte)).toContain('noDoAro* × 0.75 nas componentes 1,2');
    expect(descreverFonte(imagem(c, 'controle-roda').fonte)).toContain('geometria aprovada do ponto medio');
    expect(hashDoDesenho([{ vista: 'a', r: { largura: 1, altura: 1, svg: 'x' } }])).not.toBe(hashDoDesenho([{ vista: 'a', r: { largura: 1, altura: 1, svg: 'y' } }]));
    expect(caminhoDoConjunto()).toMatch(/calibracao-do-critico\/conjunto\.json$/);
  });
});
