/* calibracao-do-critico.test.mjs — o gate `calibracao:check`: o conjunto versionado passa, e cada coisa que ele confere reprova quando muda. */
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { medirEsboco } from '../../modulos/esboco/src/descrever.js';
import { perguntasDoEsboco } from '../../modulos/esboco/src/perguntas.js';
import { conferirRazoesDaPeca, normalizarRazoesDaPeca } from '../../src/autoria/razoes-da-peca.js';
import { formasDaPeca } from '../../src/autoria/forma-da-parte.js';
import { medidasEsperadas } from '../../src/autoria/calibracao-do-critico.js';
import {
  RAIZ, ErroDaFonte, brief, briefDaImagem, caminhoDoConjunto, chamadaDaFonte, conferir, conferirConjunto, descreverFonte, esbocoDaFonte, executarChamada,
  faltaNoAgente, hashDaImagem, hashDoAgente, hashDoBrief, hashDoDesenho, idsDaMedidaDaPeca, lerConjuntoDoDisco, linhaDoEstado, migrarImagemDosJulgamentos, modeloDoBrief, prepararImagem,
  prepararImagemGuardada, principal, registrar, resumo, vazamentosDoBrief, vocabularioDoAgente,
} from './calibracao-do-critico.mjs';
import { hashDe } from './aprovacao-da-familia.mjs';
import { linhasDoBriefDoObjeto } from './esboco.mjs';

/* uma cópia do conjunto versionado com `resultados` esvaziado: nenhum teste depende do que já foi julgado */
const conjuntoNovo = () => ({ ...JSON.parse(JSON.stringify(lerConjuntoDoDisco())), resultados: [] });
const conjuntoVazio = conjuntoNovo;
const imagem = (c, nome) => c.imagens.find((i) => i.nome === nome);
const saidaFalsa = () => { const linhas = { log: [], error: [] }; return { linhas, log: (t) => linhas.log.push(t), error: (t) => linhas.error.push(t) }; };
const SHA_FALSO = `sha256:${'b'.repeat(64)}`;
const codigos = (r) => r.problemas.map((p) => p.codigo);

describe('o gate sobre o conjunto versionado', () => {
  it('passa, diz quantos defeitos da medida reprovou sem o crítico e que a calibração não foi medida', () => {
    const saida = saidaFalsa();
    expect(conferir({ conjunto: conjuntoVazio() }, saida)).toBe(0);
    expect(saida.linhas.error).toEqual([]);
    expect(saida.linhas.log[0]).toMatch(/^calibracao:check ok — 12 de 12 imagens \(3 controles, 1 de superfície, 6 estruturais\).*4 defeito\(s\) da medida reprovado\(s\) por ela sem chegar ao crítico/);
    expect(saida.linhas.log[1]).toBe('calibração não medida: nenhuma das 12 imagens tem julgamento do crítico (resultados vazio)');
    expect(saida.linhas.log[2]).toMatch(/^pontuação pendente: faltam 44 julgamentos \(c01 3, c02 5, .*\); o gate passa até que estejam todos\.$/);
  }, 120_000);

  it('o conjunto versionado passa o gate com os julgamentos que tem, qualquer que seja o número deles', () => {
    const saida = saidaFalsa();
    expect(conferir({ so: 'c05' }, saida)).toBe(0);
    expect(saida.linhas.error).toEqual([]);
    expect(saida.linhas.log[0]).toMatch(/^calibracao:check ok — 1 de 12 imagens/);
  });

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

  it('o julgamento dado a outra imagem reprova, mesmo com o brief igual, e diz para julgar de novo', () => {
    const c = conjuntoVazio();
    const img = imagem(c, 'controle-cilindro');
    const julgamento = (imagemSha256) => ({ nota: 9, defeitos: [], briefSha256: briefDaImagem(img).sha256, imagemSha256, data: '2026-10-11T15:30:00.000Z' });
    c.resultados = [{ imagem: img.id, agenteSha256: c.critico.agente.sha256, briefSha256: c.critico.brief.sha256, julgamentos: [julgamento(hashDaImagem(img)), julgamento(SHA_FALSO)] }];
    const r = conferirConjunto({ conjunto: c, so: img.id });
    expect(codigos(r)).toEqual(['julgamento-de-outra-imagem']);
    expect(r.problemas[0].mensagem).toMatch(/^1 julgamento\(s\) foram dados a outra imagem.*julgue de novo$/);
    /* a imagem muda quando um PNG gravado muda, e o hash dos julgamentos antigos deixa de ser o dela */
    const trocada = JSON.parse(JSON.stringify(img));
    trocada.vistas.lateral.sha256 = SHA_FALSO;
    expect(hashDaImagem(trocada)).not.toBe(hashDaImagem(img));
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

  it('o controle da roda é o perfil carro: a geometria é a aprovada em mecanica.perfis, e perfil inexistente ou trocado reprova', () => {
    const aprovado = JSON.parse(readFileSync(`${RAIZ}/procedural/familias/roda-pneu/aprovacao.json`, 'utf8')).mecanica.perfis.carro.hash;
    const c = conjuntoNovo();
    const roda = imagem(c, 'controle-roda');
    expect(roda.fonte).toMatchObject({ perfil: 'carro', aprovacao: 'perfil', geometria: aprovado });
    expect(hashDe(executarChamada(...Object.values(chamadaDaFonte(roda.fonte))))).toBe(aprovado);
    expect(descreverFonte(roda.fonte)).toBe('roda-pneu no perfil carro; geometria aprovada do perfil carro');
    expect(conferirConjunto({ conjunto: c, so: 'c02' }).problemas).toEqual([]);
    roda.fonte.perfil = 'bicicleta';
    expect(codigos(conferirConjunto({ conjunto: c, so: 'c02' }))).toContain('geometria-mudou');
    roda.fonte.perfil = 'inexistente';
    const r = conferirConjunto({ conjunto: c, so: 'c02' });
    expect(codigos(r)).toEqual(['fonte-nao-reproduz']);
    expect(r.problemas[0].mensagem).toMatch(/não declara o perfil 'inexistente'; os perfis são: bicicleta, carrinho-de-mao, carro, carroca, rodizio, trator, trem/);
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
    expect(descreverFonte(imagem(c, 'controle-cilindro').fonte)).toContain('geometria aprovada do ponto medio');
    expect(descreverFonte(imagem(c, 'controle-roda').fonte)).toBe('roda-pneu no perfil carro; geometria aprovada do perfil carro');
    expect(hashDoDesenho([{ vista: 'a', r: { largura: 1, altura: 1, svg: 'x' } }])).not.toBe(hashDoDesenho([{ vista: 'a', r: { largura: 1, altura: 1, svg: 'y' } }]));
    expect(caminhoDoConjunto()).toMatch(/calibracao-do-critico\/conjunto\.json$/);
  });
});

/* ---------- o brief exato, o registro e a pontuação ---------- */

const PASTA = 'docs/mecanifica/banco-de-provas/calibracao-do-critico';
const veredito = (nota, defeitos = []) => `Análise: olhei as quatro vistas.\n${JSON.stringify({ alvo: 'brief', nota, defeitos, observacao: 'registro sintético da prova' })}\n`;
const defeitoDito = (parte, tipo) => ({ parte, tipo, onde: 'extremidade da peça', sentido: tipo === 'uniao' ? 'afastado' : 'maior', evidencia: 'visto na vista lateral, na extremidade' });

describe('o brief exato que o crítico cego recebe', () => {
  const c = lerConjuntoDoDisco();

  it('traz o objeto, as perguntas, os quatro caminhos absolutos com o id neutro e a escala da nota, e nada do que conta o defeito', () => {
    for (const img of c.imagens) {
      const b = briefDaImagem(img);
      expect(b.imagens, img.id).toHaveLength(4);
      for (const [i, vista] of ['isometrica', 'frontal', 'lateral', 'superior'].entries()) {
        expect(b.imagens[i]).toBe(`${RAIZ}/${PASTA}/imagens/${img.id}/${vista}.png`);
        expect(b.texto).toContain(b.imagens[i]);
      }
      expect(b.texto, img.id).toContain('Escala: 10: nenhum achado. 8 e 9:');
      expect(b.texto).not.toContain('--- brief');
      expect(b.texto).not.toContain('Despache');
      expect(vazamentosDoBrief(img, b.variavel), img.id).toEqual([]);
    }
    const picape = briefDaImagem(imagem(c, 'picape-baixa')).texto.toLowerCase();
    expect(picape).toContain('objeto: picape: picape de cabine simples');
    expect(picape).not.toContain('picape baixa');
    expect(briefDaImagem(imagem(c, 'haste-grossa')).texto.toLowerCase()).not.toContain('haste grossa');
  });

  it('as perguntas de forma da família entram depois das cinco fixas, com a pergunta aberta no fim; sem perguntas o brief é o fixo', () => {
    const cilindro = briefDaImagem(imagem(c, 'controle-cilindro'));
    expect(cilindro.perguntas.length).toBeGreaterThan(0);
    const linhas = cilindro.texto.trimEnd().split('\n').filter((l) => /^ {2}\d+\. /.test(l));
    expect(linhas).toHaveLength(5 + cilindro.perguntas.length + 1);
    expect(linhas[5]).toContain(cilindro.perguntas[0]);
    expect(linhas.at(-1)).toContain('O que mais, nas imagens, parece estranho');
    /* a mutação não muda a pergunta: o controle e a mutação da mesma família recebem as mesmas */
    expect(briefDaImagem(imagem(c, 'haste-grossa')).perguntas).toEqual(cilindro.perguntas);
    expect(briefDaImagem(imagem(c, 'dobradicas-por-fora')).perguntas.some((p) => /dobradiça/.test(p))).toBe(true);
    expect(briefDaImagem(imagem(c, 'picape-baixa')).perguntas.some((p) => /caçamba/.test(p))).toBe(true);
    const fixo = linhasDoBriefDoObjeto({ objeto: 'x', anterior: [], imagens: [], perguntas: [] }).filter((l) => /^ {2}\d+\. /.test(l));
    expect(fixo).toHaveLength(5);
  });

  it('o mesmo brief sai do `brief <id>` e tem impressão estável; o que vaza é nomeado', () => {
    const saida = saidaFalsa();
    expect(brief({ id: 'c05' }, saida)).toBe(0);
    expect(`${saida.linhas.log[0]}\n`).toBe(briefDaImagem(imagem(c, 'controle-cilindro')).texto);
    expect(briefDaImagem(imagem(c, 'controle-cilindro')).sha256).toBe(briefDaImagem(imagem(c, 'controle-cilindro')).sha256);
    const h = imagem(c, 'haste-grossa');
    expect(vazamentosDoBrief(h, 'Objeto: Cilindro com haste grossa')).toEqual(["o nome da imagem 'haste grossa'"]);
    expect(vazamentosDoBrief(h, 'a restrição haste-grossa-demais')).toContain("a restrição ou a medida do defeito 'haste-grossa-demais'");
    expect(vazamentosDoBrief(h, 'Qual a HASTEPELACAMISA?')).toEqual(["a restrição ou a medida do defeito 'hastePelaCamisa'"]);
    expect(vazamentosDoBrief(imagem(c, 'facetado'), 'Que tubo está facetado?')).toContain("o sentido do defeito 'facetado'");
    expect(vazamentosDoBrief(h, 'Cilindro hidráulico com camisa, haste e olhal')).toEqual([]);
  });

  it('o comando recusa o id que não existe e o gate reprova o objeto que conta o defeito', async () => {
    const saida = saidaFalsa();
    expect(await principal(['brief', 'c99'], saida)).toBe(2);
    expect(await principal(['brief'], saida)).toBe(2);
    expect(saida.linhas.error.join('\n')).toMatch(/'c99' não está no conjunto/);
    const novo = conjuntoNovo();
    imagem(novo, 'haste-grossa').objeto.nota = 'Cilindro com a haste grossa demais.';
    imagem(novo, 'ponta-no-ar').objeto.titulo = 'Dobradiça sem ponta no ar';
    expect(codigos(conferirConjunto({ conjunto: novo, so: 'c01,c04' })).filter((codigo) => codigo === 'brief-vaza')).toHaveLength(2);
  });
});

describe('registrar o julgamento do crítico', () => {
  let raiz;
  const arquivoDe = (texto) => { const caminho = join(raiz, `saida-${Math.random().toString(36).slice(2)}.txt`); writeFileSync(caminho, texto); return caminho; };
  const gravado = () => JSON.parse(readFileSync(caminhoDoConjunto(raiz), 'utf8'));
  const agora = () => new Date('2026-10-11T15:30:00.000Z');

  beforeEach(() => {
    raiz = mkdtempSync(join(tmpdir(), 'calibracao-'));
    mkdirSync(join(raiz, PASTA), { recursive: true });
    mkdirSync(join(raiz, '.claude/agents'), { recursive: true });
    writeFileSync(caminhoDoConjunto(raiz), `${JSON.stringify(conjuntoVazio(), null, 2)}\n`);
    copyFileSync(`${RAIZ}/.claude/agents/critico-visual.md`, join(raiz, '.claude/agents/critico-visual.md'));
  });
  afterEach(() => rmSync(raiz, { recursive: true, force: true }));

  it('grava a nota, os defeitos, os hashes do agente e do brief e a data; o julgamento seguinte entra na mesma imagem', () => {
    const saida = saidaFalsa();
    const img = imagem(lerConjuntoDoDisco(), 'controle-cilindro');
    expect(registrar({ id: 'c05', arquivo: arquivoDe(veredito(9, [defeitoDito('haste', 'uniao')])), raiz, agora }, saida)).toBe(0);
    expect(saida.linhas.log[0]).toMatch(/^c05 controle-cilindro: julgamento 1 de 5 registrado, nota 9, 1 defeito\(s\); brief sha256:/);
    expect(registrar({ id: 'c05', arquivo: arquivoDe(veredito(8)), raiz, agora }, saida)).toBe(0);
    const c = gravado();
    expect(c.resultados).toHaveLength(1);
    expect(c.resultados[0]).toMatchObject({ imagem: 'c05', agenteSha256: c.critico.agente.sha256, briefSha256: c.critico.brief.sha256 });
    expect(c.resultados[0].julgamentos).toHaveLength(2);
    expect(c.resultados[0].julgamentos[0]).toEqual({
      nota: 9, defeitos: [defeitoDito('haste', 'uniao')], briefSha256: briefDaImagem(img).sha256, imagemSha256: hashDaImagem(img), data: '2026-10-11T15:30:00.000Z',
    });
    expect(c.resultados[0].julgamentos[0].defeitos[0]).not.toHaveProperty('alvo');
    expect(Object.keys(c)).toEqual(Object.keys(lerConjuntoDoDisco()));
  });

  it('recusa a resposta sem JSON válido sem tocar o conjunto, o id ou o arquivo que não existem e o sexto julgamento de cinco', () => {
    const antes = readFileSync(caminhoDoConjunto(raiz), 'utf8');
    expect(() => registrar({ id: 'c05', arquivo: arquivoDe('A nota é 9 e não há defeito.'), raiz }, saidaFalsa())).toThrow(/JSON válido/);
    expect(() => registrar({ id: 'c05', arquivo: arquivoDe(`${veredito(9)}\nfim em prosa`), raiz }, saidaFalsa())).toThrow(/JSON válido/);
    expect(() => registrar({ id: 'c05', arquivo: arquivoDe(JSON.stringify({ nota: 99, defeitos: [] })), raiz }, saidaFalsa())).toThrow(/veredito\.nota/);
    expect(() => registrar({ id: 'c99', arquivo: arquivoDe(veredito(9)), raiz }, saidaFalsa())).toThrow(/não está no conjunto/);
    expect(() => registrar({ id: 'c05', arquivo: `${raiz}/nao-existe.txt`, raiz }, saidaFalsa())).toThrow(/não existe/);
    expect(() => registrar({ id: 'c05', raiz }, saidaFalsa())).toThrow(/--arquivo/);
    expect(readFileSync(caminhoDoConjunto(raiz), 'utf8')).toBe(antes);
    for (let i = 0; i < 5; i += 1) registrar({ id: 'c05', arquivo: arquivoDe(veredito(9)), raiz, agora }, saidaFalsa());
    expect(() => registrar({ id: 'c05', arquivo: arquivoDe(veredito(9)), raiz }, saidaFalsa())).toThrow(/já tem 5 de 5/);
  });

  it('recusa registrar a imagem que já tem julgamento dado a outra imagem, e o conjunto fica como estava', () => {
    expect(registrar({ id: 'c05', arquivo: arquivoDe(veredito(9)), raiz, agora }, saidaFalsa())).toBe(0);
    const c = gravado();
    c.resultados[0].julgamentos[0].imagemSha256 = SHA_FALSO;
    writeFileSync(caminhoDoConjunto(raiz), `${JSON.stringify(c, null, 2)}\n`);
    const antes = readFileSync(caminhoDoConjunto(raiz), 'utf8');
    expect(() => registrar({ id: 'c05', arquivo: arquivoDe(veredito(9)), raiz, agora }, saidaFalsa())).toThrow(/outra imagem.*julgue de novo/);
    expect(readFileSync(caminhoDoConjunto(raiz), 'utf8')).toBe(antes);
  });

  it('a migração preenche só o campo que falta, com a impressão das vistas atuais, e uma segunda vez não muda nada', () => {
    registrar({ id: 'c05', arquivo: arquivoDe(veredito(9, [defeitoDito('haste', 'uniao')])), raiz, agora }, saidaFalsa());
    registrar({ id: 'c01', arquivo: arquivoDe(veredito(6)), raiz, agora }, saidaFalsa());
    const c = gravado();
    const esperado = JSON.parse(JSON.stringify(c));
    delete c.resultados[0].julgamentos[0].imagemSha256;
    c.resultados[1].julgamentos[0].imagemSha256 = SHA_FALSO;
    writeFileSync(caminhoDoConjunto(raiz), `${JSON.stringify(c, null, 2)}\n`);
    const saida = saidaFalsa();
    expect(migrarImagemDosJulgamentos({ raiz }, saida)).toBe(0);
    expect(saida.linhas.log[0]).toMatch(/^migrar-imagem: 1 julgamento/);
    const depois = gravado();
    esperado.resultados[1].julgamentos[0].imagemSha256 = SHA_FALSO;
    expect(depois).toEqual(esperado);
    expect(Object.keys(depois.resultados[0].julgamentos[0])).toEqual(['nota', 'defeitos', 'briefSha256', 'imagemSha256', 'data']);
    const texto = readFileSync(caminhoDoConjunto(raiz), 'utf8');
    migrarImagemDosJulgamentos({ raiz }, saidaFalsa());
    expect(readFileSync(caminhoDoConjunto(raiz), 'utf8')).toBe(texto);
  });

  it('recusa registrar quando o agente do crítico mudou desde a calibração', () => {
    writeFileSync(join(raiz, '.claude/agents/critico-visual.md'), `${readFileSync(join(raiz, '.claude/agents/critico-visual.md'), 'utf8')}\nOutra regra.\n`);
    expect(() => registrar({ id: 'c05', arquivo: arquivoDe(veredito(9)), raiz }, saidaFalsa())).toThrow(/mudou desde a calibração/);
  });

  it('o comando lê `--arquivo` com espaço ou com igual', async () => {
    const saida = saidaFalsa();
    expect(await principal(['registrar', 'c99', '--arquivo', '/nada.txt'], saida)).toBe(2);
    expect(await principal(['registrar', 'c05', '--arquivo=/nada-que-nao-existe.txt'], saida)).toBe(2);
    expect(await principal(['registrar', 'c05', '--arquivo', '/nada-que-nao-existe.txt'], saida)).toBe(2);
    expect(await principal(['registrar', 'c05'], saida)).toBe(2);
    expect(saida.linhas.error.filter((e) => /nada-que-nao-existe/.test(e))).toHaveLength(2);
    expect(saida.linhas.error.some((e) => /--arquivo <saida-do-critico\.txt>/.test(e))).toBe(true);
  });

  it('o resumo da imagem que acerta, a que erra e a que ainda falta; o gate reflete o conjunto', () => {
    const c = gravado();
    const jg = (nome, nota, defeitos = []) => ({ nota, defeitos, briefSha256: SHA_FALSO, imagemSha256: SHA_FALSO, data: '2026-10-11T15:30:00.000Z' });
    const entrada = (nome, julgamentos) => ({ imagem: imagem(c, nome).id, agenteSha256: c.critico.agente.sha256, briefSha256: c.critico.brief.sha256, julgamentos });
    const cita = defeitoDito('dobradicas', 'posicao');
    c.resultados = [
      entrada('dobradicas-por-fora', [6, 6, 7, 5, 6].map((n) => jg('dobradicas-por-fora', n, [cita]))),
      entrada('controle-cilindro', [9, 9, 10, 9, 9].map((n, i) => jg('controle-cilindro', n, i < 2 ? [defeitoDito('haste', 'uniao')] : []))),
      entrada('travessia-sem-explicacao', [6, 7].map((n) => jg('travessia-sem-explicacao', n, [defeitoDito('haste', 'uniao')]))),
    ];
    writeFileSync(caminhoDoConjunto(raiz), `${JSON.stringify(c, null, 2)}\n`);
    const saida = saidaFalsa();
    expect(resumo({ raiz }, saida)).toBe(0);
    const texto = saida.linhas.log.join('\n');
    expect(texto).toContain('c07 dobradicas-por-fora (estrutural, nota 5 a 7): 5 de 5 julgamentos; notas 6 6 7 5 6, mediana 6, amplitude 2; acerta');
    expect(texto).toContain("defeito de 'dobradicas' (posicao): citado em 5 de 5 (mínimo 4 de 5) ok");
    expect(texto).toMatch(/c05 controle-cilindro .*amplitude 1; erra/);
    expect(texto).toContain('erra: 2 julgamentos do controle citam defeito estrutural (no máximo 1)');
    expect(texto).toContain('c11 travessia-sem-explicacao (estrutural, nota 5 a 7): 2 de 3 julgamentos; notas 6 7, mediana 6,5, amplitude 1; faltam 1');
    expect(texto).toContain('c01 haste-grossa (estrutural, nota 5 a 7): 0 de 3 julgamentos; faltam 3');
    expect(texto).toContain('pontuação pendente: faltam 32 julgamentos (c01 3, c02 5, c03 5, c04 3, c06 3, c08 3, c09 3, c10 3, c11 1, c12 3)');
  });
});

describe('a pontuação no gate', () => {
  const sintetico = (c, criterio) => {
    c.resultados = c.imagens.map((img) => {
      const brief = briefDaImagem(img).sha256;
      const julgamentos = Array.from({ length: img.julgamentos }, () => {
        const acerta = criterio(img);
        const nota = acerta ? Math.floor((img.faixaDaNota[0] + img.faixaDaNota[1]) / 2) : (img.classe === 'controle' ? 2 : 10);
        const defeitos = acerta ? img.defeitos.filter((d) => d.decide === 'critico').map((d) => defeitoDito(d.parte, d.tipo)) : [];
        return { nota, defeitos, briefSha256: brief, imagemSha256: hashDaImagem(img), data: '2026-10-11T15:30:00.000Z' };
      });
      return { imagem: img.id, agenteSha256: c.critico.agente.sha256, briefSha256: c.critico.brief.sha256, julgamentos };
    });
    return c;
  };

  it('sem julgamentos, e com os que faltam, o gate passa e diz quantos faltam por imagem', () => {
    const vazio = conferirConjunto({ conjunto: conjuntoVazio(), so: null });
    expect(vazio.ok).toBe(true);
    expect(vazio.pontuacao).toMatchObject({ estado: 'nao-medido', faltamNoTotal: 44 });
    expect(linhaDoEstado(vazio.pontuacao)).toBe('pontuação pendente: faltam 44 julgamentos (c01 3, c02 5, c03 5, c04 3, c05 5, c06 3, c07 5, c08 3, c09 3, c10 3, c11 3, c12 3); o gate passa até que estejam todos.');
  }, 120_000);

  it('com todos os julgamentos o gate reprova o conjunto que não acerta, nomeando as imagens e o motivo, e passa o que acerta', () => {
    const errado = sintetico(conjuntoNovo(), () => false);
    const r = conferirConjunto({ conjunto: errado });
    expect(codigos(r)).toEqual(['calibracao-nao-acerta']);
    expect(r.problemas[0].mensagem).toMatch(/^o crítico acerta 0 de 12 imagens \(mínimo 11\), e erra a obrigatória picape-baixa, dobradicas-por-fora: c01 haste-grossa \(mediana 10 fora da faixa 5 a 7;/);

    const um = sintetico(conjuntoNovo(), (img) => img.nome !== 'raios-curtos');
    const passa = conferirConjunto({ conjunto: um });
    expect(passa.ok).toBe(true);
    expect(passa.pontuacao).toMatchObject({ estado: 'passa', acertos: 11 });
    expect(linhaDoEstado(passa.pontuacao)).toBe('pontuação: o crítico acerta 11 de 12 imagens (mínimo 11), com as obrigatórias certas.');

    const obrigatoria = sintetico(conjuntoNovo(), (img) => img.nome !== 'picape-baixa');
    expect(codigos(conferirConjunto({ conjunto: obrigatoria }))).toEqual(['calibracao-nao-acerta']);
  }, 180_000);

  it('o julgamento dado a outro brief que o da imagem reprova', () => {
    const c = sintetico(conjuntoNovo(), () => true);
    c.resultados.find((r) => r.imagem === 'c05').julgamentos[0].briefSha256 = SHA_FALSO;
    const r = conferirConjunto({ conjunto: c, so: 'c05' });
    expect(codigos(r)).toEqual(['julgamento-de-outro-brief']);
  });
});

describe('a imagem preparada guardada', () => {
  it('é a que prepararImagem calcula, na fonte de esboço, na de família e na de família mutada, e outra fonte dá outra imagem', () => {
    const c = conjuntoNovo();
    for (const nome of ['picape-baixa', 'facetado', 'controle-dobradica']) {
      const img = imagem(c, nome);
      const guardada = prepararImagemGuardada(img, c);
      expect(JSON.stringify(guardada)).toBe(JSON.stringify(prepararImagem(img, c)));
      expect(prepararImagemGuardada(structuredClone(img), c)).toBe(guardada);
    }
    const mutada = structuredClone(imagem(c, 'facetado'));
    mutada.fonte.argumentos[0].valor = 16;
    const outra = prepararImagemGuardada(mutada, c);
    expect(outra).not.toBe(prepararImagemGuardada(imagem(c, 'facetado'), c));
    expect(JSON.stringify(outra)).toBe(JSON.stringify(prepararImagem(mutada, c)));
    expect(outra.fonteSha256).not.toBe(prepararImagemGuardada(imagem(c, 'facetado'), c).fonteSha256);
    /* o remendo do esboço entra na chave: o desenho muda com ele */
    const remendada = structuredClone(imagem(c, 'dobradicas-por-fora'));
    const original = prepararImagemGuardada(remendada, c);
    remendada.fonte.remendo = { plano: { familia: 'movel-de-caixa' }, parametros: { alturaPorta: 1700 } };
    expect(prepararImagemGuardada(remendada, c).desenho).not.toBe(original.desenho);
  });
});
