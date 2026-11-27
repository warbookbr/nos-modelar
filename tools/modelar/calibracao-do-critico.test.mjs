/* calibracao-do-critico.test.mjs — o gate `calibracao:check` no formato @2: o conjunto versionado passa, cada coisa que ele confere
   reprova quando muda, o modelo do crítico só avisa, e os comandos que mudam o conjunto só rodam de propósito. Os testes que mudam
   alguma coisa trabalham num conjunto pequeno montado numa pasta temporária, e nenhum despacha o crítico nem abre a bancada. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AGENTE_DO_CRITICO, FAIXAS_DA_NOTA, FORMATO_CALIBRACAO, PASTA_DO_CONJUNTO, RAIZ, aplicarTrocas, avisosDoModelo, caminhoDoConjunto, citaDefeito,
  conferirConjunto, copiar, despachos, faltaNoAgente, hashDasImagens, hashDoAgente, lerCasos, lerConjuntoDoDisco, lerMedicaoDaRodada, materializarPedido,
  medir, modeloDoAgente, pacote, palavraQueNaoConsta, pastaDoPacote, pedidoDoCaso, pontuar, pontuarCaso, principal, recalibrar, registrar, resumo,
} from './calibracao-do-critico.mjs';

const sha = (dado) => `sha256:${createHash('sha256').update(dado).digest('hex')}`;
const saidaFalsa = () => { const linhas = { log: [], error: [] }; return { linhas, log: (t) => linhas.log.push(t), error: (t) => linhas.error.push(t) }; };
const codigos = (r) => r.problemas.map((p) => p.codigo);
const SHA_FALSO = `sha256:${'b'.repeat(64)}`;
const FORMA_ACEITA = `sha256:${'a'.repeat(64)}`;
const FORMA_COM_DEFEITO = `sha256:${'c'.repeat(64)}`;

/* a definição de verdade do crítico, que escreve o vocabulário de defeito e declara `model: sonnet` */
const AGENTE = readFileSync(join(RAIZ, AGENTE_DO_CRITICO), 'utf8');
const ORIGEM = "export const TABELA = { raio: 18 };\nexport const PLANO = { referencias: ['../ref.png'] };\n";
const TROCA_DE_CAMINHO = { de: "'../ref.png'", para: "'procedural/pecas/objeto/ref.png'", porque: 'caminho da referência a partir da raiz' };
const TROCA_DE_DEFEITO = { de: 'raio: 18', para: 'raio: 30', porque: 'a haste com o raio da camisa', defeito: true };
const ACEITE = 'a pessoa, 2026-11-10: pode fixar, seguimos como está';
const FRASE = 'a pessoa julgou a haste: grossa demais, tem de ter pouco mais da metade da camisa';
const PNG = Buffer.from('imagem de mentira');

function escrever(raiz, arquivo, dado) {
  const caminho = join(raiz, arquivo);
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, dado);
}

/* Um conjunto de três casos numa raiz temporária: um controle e um defeito de proporção que chegam ao crítico, com pedido e imagem, e
   um defeito de forma prometida que a medição reprova. */
function montar(raiz) {
  escrever(raiz, AGENTE_DO_CRITICO, AGENTE);
  escrever(raiz, 'procedural/pecas/objeto/partes/haste/receita.js', ORIGEM);
  escrever(raiz, 'procedural/pecas/objeto/ref.png', PNG);
  escrever(raiz, 'procedural/pecas/objeto/montagem.etapas.json', JSON.stringify({ eventos: [{ tipo: 'aceite', instancia: 'haste', aceite: { por: ACEITE }, impressao: { forma: FORMA_ACEITA } }] }));
  escrever(raiz, 'procedural/pecas/objeto/partes/haste/rodadas/rodada-02.json', JSON.stringify({ atrito: ['outra coisa', FRASE] }));
  const caso = (id, nome, grupo, trocas, palavra, extra = {}) => {
    const lida = aplicarTrocas(ORIGEM, trocas);
    const peca = `peca-${id}`;
    escrever(raiz, `tools/fixtures/acervo/${peca}/receita.js`, lida);
    const base = {
      id, nome, grupo, obrigatorio: false, julgamentos: 3, faixaDaNota: [...FAIXAS_DA_NOTA[grupo]],
      fonte: { peca: 'objeto/haste', origem: { arquivo: 'procedural/pecas/objeto/partes/haste/receita.js', sha256: sha(ORIGEM) }, copia: { peca, arquivo: `tools/fixtures/acervo/${peca}/receita.js`, sha256: sha(lida) }, trocas, ...palavra },
      defeitos: grupo === 'controle' ? [] : [{ parte: 'haste', tipo: 'espessura', sentido: 'maior', onde: 'corpo da haste, de ponta a ponta', palavras: ['haste'], aceitos: ['espessura/maior'] }],
      destino: 'critico',
      medicao: { passou: true, comando: `node tools/modelar/rodada-de-modelagem.mjs ${peca} --acao`, receitaSha256: sha(lida), forma: grupo === 'controle' ? FORMA_ACEITA : FORMA_COM_DEFEITO, relatorio: 'medição da receita atual (sha256:abc): passou' },
      ...extra,
    };
    if (base.destino === 'critico') {
      const pedido = `# Pedido ao crítico visual: ${peca}\n\n- referência: <raiz>/procedural/pecas/objeto/ref.png\n- frontal: <pacote>/frontal.png\n`;
      escrever(raiz, `${PASTA_DO_CONJUNTO}/casos/${id}/pedido.txt`, pedido);
      escrever(raiz, `${PASTA_DO_CONJUNTO}/casos/${id}/frontal.png`, PNG);
      base.pedido = { arquivo: `casos/${id}/pedido.txt`, sha256: sha(pedido) };
      base.imagens = [{ arquivo: `casos/${id}/frontal.png`, sha256: sha(PNG) }];
    }
    return base;
  };
  const aceite = { aceite: { registro: 'procedural/pecas/objeto/montagem.etapas.json', instancia: 'haste', por: ACEITE, forma: FORMA_ACEITA } };
  const reprovacao = { reprovacao: { registro: 'procedural/pecas/objeto/partes/haste/rodadas/rodada-02.json', rodada: 2, frase: FRASE } };
  const conj = {
    formato: FORMATO_CALIBRACAO,
    versao: '2.0.0',
    descricao: 'conjunto de prova',
    critico: { agente: { arquivo: AGENTE_DO_CRITICO, sha256: hashDoAgente(AGENTE_DO_CRITICO, raiz) }, modelo: { declarado: 'sonnet', medido: null }, pacote: 'o pedido e as imagens do pacote padrão' },
    faixasDaNota: FAIXAS_DA_NOTA,
    regra: { julgamentos: 3, acerto: 'mediana na faixa e o defeito citado', passa: { minimo: 2, de: 2, obrigatorias: [] } },
    casos: [
      caso('c01', 'controle-da-haste', 'controle', [TROCA_DE_CAMINHO], aceite),
      caso('c02', 'haste-grossa', 'proporcao', [TROCA_DE_CAMINHO, TROCA_DE_DEFEITO], reprovacao),
      caso('c03', 'haste-solta', 'forma-prometida', [TROCA_DE_CAMINHO, { ...TROCA_DE_DEFEITO, para: 'raio: 99' }], { semFrase: 'nenhuma rodada registra a pessoa reprovando este defeito' }, {
        destino: 'medida',
        medicao: { passou: false, comando: 'node tools/modelar/rodada-de-modelagem.mjs peca-c03 --acao', receitaSha256: sha(aplicarTrocas(ORIGEM, [TROCA_DE_CAMINHO, { ...TROCA_DE_DEFEITO, para: 'raio: 99' }])), forma: FORMA_COM_DEFEITO, relatorio: 'medição da receita atual (sha256:abc): reprovou\npróxima ação: modelar — falta o contato' },
      }),
    ],
    resultados: [],
  };
  escrever(raiz, `${PASTA_DO_CONJUNTO}/casos.json`, `${JSON.stringify(lerCasos(conj), null, 2)}\n`);
  return conj;
}

const gravado = (raiz) => JSON.parse(readFileSync(caminhoDoConjunto(raiz), 'utf8'));
const regravar = (raiz, mudar) => { const conj = gravado(raiz); mudar(conj); writeFileSync(caminhoDoConjunto(raiz), `${JSON.stringify(conj, null, 2)}\n`); return conj; };
const julgamento = (caso, { nota = 9, defeitos = [], modelo = 'modelo-a' } = {}) => ({ nota, defeitos, pedidoSha256: caso.pedido.sha256, imagemSha256: hashDasImagens(caso), modelo, data: '2026-11-26T12:00:00.000Z' });
const defeitoJulgado = (parte, tipo, sentido, onde = 'corpo inteiro da parte') => ({ parte, tipo, onde, sentido, evidencia: 'vista frontal' });
const resposta = (nota, defeitos = []) => `Primeira leitura: uma haste.\n\n\`\`\`json\n${JSON.stringify({ alvo: 'ref.png', nota, defeitos, observacao: 'conjunto coerente' })}\n\`\`\`\n`;

let raiz;
beforeEach(() => { raiz = mkdtempSync(join(tmpdir(), 'calibracao-')); });
afterEach(() => rmSync(raiz, { recursive: true, force: true }));

describe('o gate sobre o conjunto versionado', () => {
  it('passa, e o conjunto é do formato novo, com três julgamentos por caso e a palavra da pessoa em cada fonte', () => {
    const r = conferirConjunto();
    expect(r.problemas).toEqual([]);
    const conj = lerConjuntoDoDisco();
    expect(conj.formato).toBe(FORMATO_CALIBRACAO);
    expect(conj.casos.every((k) => k.julgamentos === 3)).toBe(true);
    for (const caso of conj.casos) {
      expect(palavraQueNaoConsta(caso.fonte), caso.id).toBe(null);
      expect(caso.fonte.copia.arquivo.startsWith('tools/fixtures/acervo/'), caso.id).toBe(true);
      if (caso.grupo === 'controle') expect(caso.medicao.forma, caso.id).toBe(caso.fonte.aceite.forma);
    }
    /* os três grupos da decisão da pessoa estão no conjunto, e o defeito recolocado tem a frase dela onde há */
    expect(new Set(conj.casos.map((k) => k.grupo))).toEqual(new Set(['controle', 'forma-prometida', 'proporcao', 'revolucao-facetada']));
    expect(conj.casos.filter((k) => k.fonte.reprovacao).length).toBeGreaterThanOrEqual(2);
  });

  it('o agente gravado é o de hoje, escreve o vocabulário de defeito e não leva mais o nome antigo do projeto', () => {
    const conj = lerConjuntoDoDisco();
    expect(hashDoAgente(conj.critico.agente.arquivo)).toBe(conj.critico.agente.sha256);
    const lido = readFileSync(join(RAIZ, AGENTE_DO_CRITICO), 'utf8');
    expect(faltaNoAgente(lido)).toEqual([]);
    /* o nome antigo, escrito em duas metades para a régua do nome não o achar neste arquivo */
    expect(lido).not.toContain(['Mecan', 'ifica'].join(''));
  });

  it('o pedido de cada caso não diz o que o caso é, e o crítico o lê fora da pasta do conjunto', () => {
    const conj = lerConjuntoDoDisco();
    for (const caso of conj.casos.filter((k) => k.destino === 'critico')) {
      const lido = readFileSync(join(RAIZ, PASTA_DO_CONJUNTO, caso.pedido.arquivo), 'utf8');
      expect(lido, caso.id).not.toMatch(/calibra/i);
      expect(lido, caso.id).not.toContain(caso.nome);
      expect(pastaDoPacote(caso.fonte.copia.peca), caso.id).not.toMatch(/calibra/i);
    }
  });

  it('o script chama o gate e sai com 0, e a ajuda sai sem mexer em nada', async () => {
    const saida = saidaFalsa();
    expect(await principal(['conferir'], saida)).toBe(0);
    expect(saida.linhas.log[0]).toMatch(/^calibracao:check ok/);
    const ajuda = saidaFalsa();
    expect(await principal(['--ajuda'], ajuda)).toBe(0);
    expect(ajuda.linhas.log.join('\n')).toMatch(/recalibrar --de-proposito/);
    const errada = saidaFalsa();
    expect(await principal(['conferir', '--julgar'], errada)).toBe(2);
    expect(errada.linhas.error.join('\n')).toMatch(/recebida a opção --julgar/);
  });
});

describe('cada conferência reprova quando o que ela guarda muda', () => {
  beforeEach(() => { montar(raiz); });

  it('o conjunto montado passa, com o caso da medida fora do julgamento', async () => {
    const r = conferirConjunto({ raiz });
    expect(r.problemas).toEqual([]);
    expect(r.pontuacao.estado).toBe('nao-medido');
    expect(r.pontuacao.faltam).toEqual({ c01: 3, c02: 3 });
    const saida = saidaFalsa();
    expect(await principal(['conferir'], saida, { raiz })).toBe(0);
    expect(saida.linhas.log.join('\n')).toMatch(/2 chegam ao crítico .* 1 a medição da rodada reprova antes \(c03\)/);
  });

  it('o texto do agente mudou: reprova e diz o comando de propósito', () => {
    escrever(raiz, AGENTE_DO_CRITICO, AGENTE.replace('dizer a verdade', 'dizer o que acha'));
    const r = conferirConjunto({ raiz });
    expect(codigos(r)).toEqual(['agente-mudou']);
    expect(r.problemas[0].mensagem).toMatch(/recalibrar --de-proposito/);
  });

  it('a cópia de ensaio, o pedido e a imagem são os arquivos gravados', () => {
    escrever(raiz, 'tools/fixtures/acervo/peca-c02/receita.js', 'export const TABELA = { raio: 31 };\n');
    expect(codigos(conferirConjunto({ raiz }))).toContain('copia-mudou');
    montar(raiz);
    escrever(raiz, `${PASTA_DO_CONJUNTO}/casos/c01/frontal.png`, Buffer.from('outra imagem'));
    expect(codigos(conferirConjunto({ raiz }))).toContain('imagem-diferente');
    rmSync(join(raiz, PASTA_DO_CONJUNTO, 'casos/c01/frontal.png'));
    expect(codigos(conferirConjunto({ raiz }))).toContain('imagem-ausente');
    montar(raiz);
    escrever(raiz, `${PASTA_DO_CONJUNTO}/casos/c02/pedido.txt`, '# outro pedido\n- frontal: <pacote>/frontal.png\n');
    expect(codigos(conferirConjunto({ raiz }))).toContain('pedido-diferente');
    rmSync(join(raiz, 'tools/fixtures/acervo/peca-c03/receita.js'));
    expect(codigos(conferirConjunto({ raiz }))).toContain('copia-ausente');
  });

  it('o pedido que conta o caso, o que não cita a imagem e o que cita referência que não existe', () => {
    const trocar = (id, lido) => { escrever(raiz, `${PASTA_DO_CONJUNTO}/casos/${id}/pedido.txt`, lido); regravar(raiz, (conj) => { conj.casos.find((k) => k.id === id).pedido.sha256 = sha(lido); }); };
    trocar('c02', '# Pedido: a haste grossa\n- frontal: <pacote>/frontal.png\n');
    expect(codigos(conferirConjunto({ raiz }))).toEqual(['pedido-vaza']);
    trocar('c02', '# Pedido\n- frontal: <pacote>/outra.png\n');
    expect(codigos(conferirConjunto({ raiz }))).toEqual(['imagem-fora-do-pedido']);
    trocar('c02', '# Pedido\n- referência: <raiz>/procedural/pecas/objeto/sumiu.png\n- frontal: <pacote>/frontal.png\n');
    expect(codigos(conferirConjunto({ raiz }))).toEqual(['referencia-ausente']);
  });

  it('a palavra da pessoa tem de constar no registro que a fonte cita', () => {
    escrever(raiz, 'procedural/pecas/objeto/montagem.etapas.json', JSON.stringify({ eventos: [{ tipo: 'aceite', instancia: 'haste', aceite: { por: 'a pessoa, 2026-11-10: outra frase' }, impressao: { forma: FORMA_ACEITA } }] }));
    escrever(raiz, 'procedural/pecas/objeto/partes/haste/rodadas/rodada-02.json', JSON.stringify({ atrito: ['outra coisa'] }));
    const r = conferirConjunto({ raiz });
    expect(codigos(r)).toEqual(['palavra-da-pessoa-nao-consta', 'palavra-da-pessoa-nao-consta']);
    expect(r.problemas.map((p) => p.caso)).toEqual(['c01 controle-da-haste', 'c02 haste-grossa']);
  });

  it('o julgamento dado a outro pedido, a outras imagens ou por outro agente reprova', () => {
    regravar(raiz, (conj) => {
      const [c01, c02] = conj.casos;
      conj.resultados = [
        { caso: 'c01', agenteSha256: conj.critico.agente.sha256, julgamentos: [{ ...julgamento(c01), pedidoSha256: SHA_FALSO }, { ...julgamento(c01), imagemSha256: SHA_FALSO }] },
        { caso: 'c02', agenteSha256: SHA_FALSO, julgamentos: [julgamento(c02)] },
      ];
    });
    expect(codigos(conferirConjunto({ raiz })).sort()).toEqual(['julgamento-de-outra-imagem', 'julgamento-de-outro-pedido', 'resultado-de-outro-critico']);
  });
});

describe('o formato recusa o caso que não é o que diz ser', () => {
  const recusa = (mudar) => { const conj = montar(raiz); mudar(conj); try { lerCasos(conj); return null; } catch (erro) { return erro.message; } };

  it('o controle com troca de defeito, sem as palavras do aceite ou com outra forma que a aceita', () => {
    expect(recusa((conj) => { conj.casos[0].fonte.trocas.push(TROCA_DE_DEFEITO); })).toMatch(/trocas .* nenhuma: o controle é a receita aceita/);
    expect(recusa((conj) => { conj.casos[0].fonte.aceite.por = 'aceito'; })).toMatch(/aceite\.por .*as palavras dela/);
    expect(recusa((conj) => { conj.casos[0].medicao.forma = FORMA_COM_DEFEITO; })).toMatch(/medicao\.forma .* a forma que a pessoa aceitou/);
    expect(recusa((conj) => { conj.casos[0].defeitos = conj.casos[1].defeitos; })).toMatch(/nenhum: o controle não tem defeito/);
  });

  it('o defeito sem troca de defeito, sem frase nem motivo, ou com o sentido fora dos aceitos', () => {
    expect(recusa((conj) => { conj.casos[1].fonte.trocas = [TROCA_DE_CAMINHO]; })).toMatch(/ao menos uma troca com `defeito: true`/);
    expect(recusa((conj) => { delete conj.casos[1].fonte.reprovacao; })).toMatch(/um só de `reprovacao` .* ou `semFrase`/);
    expect(recusa((conj) => { conj.casos[1].fonte.reprovacao.frase = 'curta'; })).toMatch(/a frase da pessoa, copiada do `atrito`/);
    expect(recusa((conj) => { conj.casos[1].defeitos[0].aceitos = ['espessura/menor']; })).toMatch(/aceitos .* que inclui 'espessura\/maior'/);
  });

  it('o lugar do defeito com palavra que não é inteira ou repetida, e o contrário sem lugar, entre os aceitos ou fora do vocabulário', () => {
    expect(recusa((conj) => { conj.casos[1].defeitos[0].lugar = ['junto ao cubo']; })).toMatch(/lugar .*palavras inteiras em minúsculas/);
    expect(recusa((conj) => { conj.casos[1].defeitos[0].lugar = ['cubo', 'cubo']; })).toMatch(/lugar .*sem repetição/);
    expect(recusa((conj) => { conj.casos[1].defeitos[0].lugar = []; })).toMatch(/lugar .*palavras inteiras/);
    expect(recusa((conj) => { conj.casos[1].defeitos[0].contrarios = ['espessura/menor']; })).toMatch(/`contrarios` só vale junto de `lugar`/);
    expect(recusa((conj) => { Object.assign(conj.casos[1].defeitos[0], { lugar: ['cubo'], contrarios: ['espessura/maior'] }); })).toMatch(/contrarios .*fora dos `aceitos`/);
    expect(recusa((conj) => { Object.assign(conj.casos[1].defeitos[0], { lugar: ['cubo'], contrarios: ['espessura/torta'] }); })).toMatch(/contrarios .*do vocabulário/);
    expect(recusa((conj) => { Object.assign(conj.casos[1].defeitos[0], { lugar: ['cubo'], contrarios: ['espessura/menor'] }); })).toBe(null);
  });

  it('o caso que a medida reprova não tem pedido, imagem nem julgamento, e o que passa tem de chegar ao crítico', () => {
    expect(recusa((conj) => { conj.casos[2].pedido = conj.casos[1].pedido; })).toMatch(/nada: o caso que a medida reprova não tem pedido nem imagem/);
    expect(recusa((conj) => { conj.casos[1].destino = 'medida'; })).toMatch(/"critico": a medição passou/);
    expect(recusa((conj) => { conj.resultados = [{ caso: 'c03', agenteSha256: SHA_FALSO, julgamentos: [julgamento(conj.casos[1])] }]; })).toMatch(/o que a medida reprova não tem julgamento/);
    expect(recusa((conj) => { conj.casos[1].medicao.receitaSha256 = SHA_FALSO; })).toMatch(/a medição é da cópia gravada/);
    expect(recusa((conj) => { conj.casos[1].julgamentos = 5; })).toMatch(/julgamentos recebeu 5; aceito: 3/);
    expect(recusa((conj) => { conj.regra.passa.de = 3; })).toMatch(/2, o número de casos que chegam ao crítico/);
  });

  it('a cópia mora fora do acervo e a origem dentro dele', () => {
    expect(recusa((conj) => { conj.casos[1].fonte.copia.arquivo = 'procedural/pecas/peca-c02/receita.js'; })).toMatch(/tools\/fixtures\/acervo\/peca-c02\/receita\.js, fora do acervo/);
    expect(recusa((conj) => { conj.casos[1].fonte.origem.arquivo = 'tools/fixtures/acervo/x/receita.js'; })).toMatch(/a receita de uma peça do acervo/);
  });
});

describe('o modelo do crítico só avisa', () => {
  beforeEach(() => { montar(raiz); });

  it('a linha model: não entra na impressão do agente, e o modelo trocado dá aviso com o gate verde', async () => {
    const antes = hashDoAgente(AGENTE_DO_CRITICO, raiz);
    escrever(raiz, AGENTE_DO_CRITICO, AGENTE.replace('model: sonnet', 'model: opus'));
    expect(hashDoAgente(AGENTE_DO_CRITICO, raiz)).toBe(antes);
    expect(modeloDoAgente(AGENTE_DO_CRITICO, raiz)).toBe('opus');
    const r = conferirConjunto({ raiz });
    expect(r.ok).toBe(true);
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]).toMatch(/declara o modelo 'opus' e o conjunto foi medido com 'sonnet'/);
    expect(r.avisos[0]).toMatch(/de propósito/);
    const saida = saidaFalsa();
    expect(await principal(['conferir'], saida, { raiz })).toBe(0);
    expect(saida.linhas.log.join('\n')).toMatch(/^aviso: a definição do crítico declara o modelo 'opus'/m);
  });

  it('julgamentos de modelos diferentes, ou de outro modelo que o medido, dão aviso e não reprovam', () => {
    const conj = regravar(raiz, (c) => {
      c.critico.modelo.medido = 'modelo-a';
      c.resultados = [{ caso: 'c01', agenteSha256: c.critico.agente.sha256, julgamentos: [julgamento(c.casos[0]), julgamento(c.casos[0], { modelo: 'modelo-b' })] }];
    });
    expect(avisosDoModelo(conj, { raiz })[0]).toMatch(/vieram de 2 modelos \(modelo-a, modelo-b\)/);
    expect(conferirConjunto({ raiz }).ok).toBe(true);
    const outro = regravar(raiz, (c) => { c.resultados[0].julgamentos = [julgamento(c.casos[0], { modelo: 'modelo-b' })]; });
    expect(avisosDoModelo(outro, { raiz })[0]).toMatch(/vieram do modelo 'modelo-b' e o conjunto grava 'modelo-a'/);
    expect(conferirConjunto({ raiz }).ok).toBe(true);
  });

  it('o conjunto antigo que ainda está na pasta é aviso, com o comando que o tira', () => {
    escrever(raiz, `${PASTA_DO_CONJUNTO}/conjunto.json`, '{}');
    const r = conferirConjunto({ raiz });
    expect(r.ok).toBe(true);
    expect(r.avisos.join('\n')).toMatch(/git rm -r docs\/modelar\/banco-de-provas\/calibracao-do-critico\/conjunto\.json/);
  });
});

describe('a cópia de ensaio e a medição da rodada', () => {
  beforeEach(() => { montar(raiz); });

  it('a troca vale quando o trecho aparece uma vez só', () => {
    expect(aplicarTrocas('a = 1; b = 2;', [{ de: 'a = 1', para: 'a = 3' }])).toBe('a = 3; b = 2;');
    expect(() => aplicarTrocas('a = 1; a = 1;', [{ de: 'a = 1', para: 'a = 3' }])).toThrow(/aparece 2 vez\(es\)/);
    expect(() => aplicarTrocas('b = 2;', [{ de: 'a = 1', para: 'a = 3' }])).toThrow(/aparece 0 vez\(es\)/);
  });

  it('copiar refaz a cópia igual à gravada, e recusa a origem que mudou enquanto a cópia existe', () => {
    const saida = saidaFalsa();
    expect(copiar({ raiz }, saida)).toBe(0);
    expect(saida.linhas.log.every((l) => /igual à gravada/.test(l))).toBe(true);
    expect(conferirConjunto({ raiz }).ok).toBe(true);
    escrever(raiz, 'procedural/pecas/objeto/partes/haste/receita.js', ORIGEM.replace('raio: 18', 'raio: 20'));
    expect(() => copiar({ id: 'c01', raiz }, saidaFalsa())).toThrow(/mudou desde que a cópia foi escrita/);
    /* a receita do acervo mudou e o gate continua verde: a cópia gravada é a que o crítico viu */
    expect(conferirConjunto({ raiz }).ok).toBe(true);
  });

  it('a saída do --acao é lida nos dois sentidos, com a razão da reprovação', () => {
    const passou = lerMedicaoDaRodada('peca-c01: descrever: executando\n0 rodada(s) registrada(s)\nmedição da receita atual (sha256:abcd): passou\npróxima ação: revisar — falta o crítico\ndefeitos em aberto: nenhum.');
    expect(passou.passou).toBe(true);
    const reprovou = lerMedicaoDaRodada('medição da receita atual (sha256:abcd): reprovou\npróxima ação: modelar — reprovou: guarda:acervo\n  a parte sai do envelope\ndefeitos em aberto: nenhum.');
    expect(reprovou).toEqual({ passou: false, relatorio: 'medição da receita atual (sha256:abcd): reprovou\npróxima ação: modelar — reprovou: guarda:acervo\n  a parte sai do envelope' });
    expect(lerMedicaoDaRodada('rodada-de-modelagem: erro qualquer')).toBe(null);
  });

  it('o caso que a medição reprova sai do julgamento, perde o pedido e as imagens e a regra acompanha', async () => {
    const rodar = () => ({ codigo: 0, texto: 'medição da receita atual (sha256:abcd): reprovou\npróxima ação: modelar — falta o contato\ndefeitos em aberto: nenhum.' });
    expect(await medir({ id: 'c02', raiz, rodar, forma: async () => FORMA_COM_DEFEITO }, saidaFalsa())).toBe(0);
    const conj = gravado(raiz);
    expect(conj.casos[1].destino).toBe('medida');
    expect(conj.casos[1].pedido).toBeUndefined();
    expect(conj.casos[1].imagens).toBeUndefined();
    expect(conj.casos[1].medicao.relatorio).toMatch(/falta o contato/);
    expect(conj.regra.passa).toEqual({ minimo: 1, de: 1, obrigatorias: [] });
    expect(conferirConjunto({ raiz }).ok).toBe(true);
  });

  it('o caso já julgado que a medição passa a reprovar leva os julgamentos e a pasta do pedido, e o medir diz quantos saíram', async () => {
    regravar(raiz, (conj) => { conj.resultados.push({ caso: 'c02', agenteSha256: conj.critico.agente.sha256, julgamentos: [julgamento(conj.casos[1]), julgamento(conj.casos[1])] }); });
    expect(existsSync(join(raiz, PASTA_DO_CONJUNTO, 'casos/c02/pedido.txt'))).toBe(true);
    const rodar = () => ({ codigo: 0, texto: 'medição da receita atual (sha256:abcd): reprovou\npróxima ação: modelar — promessa do PLANO que a malha não cumpre\ndefeitos em aberto: nenhum.' });
    const saida = saidaFalsa();
    expect(await medir({ id: 'c02', raiz, rodar, forma: async () => FORMA_COM_DEFEITO }, saida)).toBe(0);
    expect(saida.linhas.log.join('\n')).toMatch(/2 julgamento\(s\) dele saem do conjunto; o pedido e as imagens em .*casos\/c02\/ saíram com ele/);
    expect(gravado(raiz).resultados).toEqual([]);
    expect(existsSync(join(raiz, PASTA_DO_CONJUNTO, 'casos/c02'))).toBe(false);
    /* o caso que continua passando fica com a pasta e com os julgamentos */
    expect(existsSync(join(raiz, PASTA_DO_CONJUNTO, 'casos/c01/pedido.txt'))).toBe(true);
    expect(conferirConjunto({ raiz }).ok).toBe(true);
  });

  it('o controle que reprova, ou cuja forma não é a do aceite, é recusado, e a saída sem a linha da medição também', async () => {
    const reprova = () => ({ codigo: 0, texto: 'medição da receita atual (sha256:abcd): reprovou\npróxima ação: modelar — x' });
    const passa = () => ({ codigo: 0, texto: 'medição da receita atual (sha256:abcd): passou\npróxima ação: revisar — x' });
    await expect(medir({ id: 'c01', raiz, rodar: reprova, forma: async () => FORMA_ACEITA }, saidaFalsa())).rejects.toThrow(/o controle reprovou na medição da rodada/);
    await expect(medir({ id: 'c01', raiz, rodar: passa, forma: async () => FORMA_COM_DEFEITO }, saidaFalsa())).rejects.toThrow(/a cópia não é mais a etapa aceita/);
    await expect(medir({ id: 'c02', raiz, rodar: () => ({ codigo: 13, texto: 'Warning: unsettled' }), forma: async () => FORMA_COM_DEFEITO }, saidaFalsa())).rejects.toThrow(/saiu com 13 sem a linha da medição/);
    expect(await medir({ id: 'c01', raiz, rodar: passa, forma: async () => FORMA_ACEITA }, saidaFalsa())).toBe(0);
  });
});

describe('o pacote padrão e o pedido que o crítico recebe', () => {
  beforeEach(() => { montar(raiz); });

  /* o pacote de mentira grava na pasta o que o `vistas:critica` gravaria: o pedido com caminhos absolutos e as imagens */
  const pacoteDeMentira = (titulo = 'peca-c02') => (peca, pasta) => {
    escrever(pasta, 'frontal.png', PNG);
    escrever(pasta, 'superficie/rasante.png', PNG);
    escrever(pasta, 'sobra.png', PNG);
    writeFileSync(join(pasta, 'pedido.md'), `# Pedido ao crítico visual: ${titulo}\n\n- referência: ${raiz}/procedural/pecas/objeto/ref.png\n- frontal: ${pasta}/frontal.png\n- rasante: ${pasta}/superficie/rasante.png\n`);
    return { codigo: 0, texto: 'TEMPO: 1 s' };
  };

  it('grava o pedido sem caminho desta máquina e só as imagens que ele cita', () => {
    expect(pacote({ id: 'c02', raiz, rodar: pacoteDeMentira() }, saidaFalsa())).toBe(0);
    const caso = gravado(raiz).casos[1];
    const lido = readFileSync(join(raiz, PASTA_DO_CONJUNTO, caso.pedido.arquivo), 'utf8');
    expect(lido).toBe('# Pedido ao crítico visual: peca-c02\n\n- referência: <raiz>/procedural/pecas/objeto/ref.png\n- frontal: <pacote>/frontal.png\n- rasante: <pacote>/superficie/rasante.png\n');
    expect(caso.imagens.map((im) => im.arquivo)).toEqual(['casos/c02/frontal.png', 'casos/c02/superficie/rasante.png']);
    expect(existsSync(join(raiz, PASTA_DO_CONJUNTO, 'casos/c02/sobra.png'))).toBe(false);
    expect(conferirConjunto({ raiz }).ok).toBe(true);
  });

  it('recusa o pedido que conta o caso, o caso que a medida reprova e o que já tem julgamento', () => {
    expect(() => pacote({ id: 'c02', raiz, rodar: pacoteDeMentira('haste grossa') }, saidaFalsa())).toThrow(/o pedido conta o que o caso é \('haste grossa'\)/);
    expect(() => pacote({ id: 'c03', raiz, rodar: pacoteDeMentira() }, saidaFalsa())).toThrow(/a medição da rodada reprovou o caso/);
    expect(() => pacote({ id: 'c02', raiz, rodar: () => ({ codigo: 1, texto: 'receita reprovada' }) }, saidaFalsa())).toThrow(/saiu com 1 e não gravou o pedido\.md/);
    regravar(raiz, (c) => { c.resultados = [{ caso: 'c02', agenteSha256: c.critico.agente.sha256, julgamentos: [julgamento(c.casos[1])] }]; });
    expect(() => pacote({ id: 'c02', raiz, rodar: pacoteDeMentira() }, saidaFalsa())).toThrow(/já tem julgamentos/);
  });

  it('o pedido do pacote vale em outra cópia do repositório: a pasta e a raiz viram marcas', () => {
    const lido = (r) => `- ref: ${r}/procedural/x.png\n- frontal: ${r}/tools/bancadas/out/critica-peca-c02/rodada-01/frontal.png\n`;
    const a = pedidoDoCaso(lido('/repo/a'), { pasta: '/repo/a/tools/bancadas/out/critica-peca-c02/rodada-01', raiz: '/repo/a' });
    const b = pedidoDoCaso(lido('/outra/copia'), { pasta: '/outra/copia/tools/bancadas/out/critica-peca-c02/rodada-01', raiz: '/outra/copia' });
    expect(a).toEqual(b);
    expect(a).toEqual({ pedido: '- ref: <raiz>/procedural/x.png\n- frontal: <pacote>/frontal.png\n', imagens: ['frontal.png'] });
  });

  it('o crítico recebe o pedido com caminhos absolutos, na pasta de pacote de uma rodada, e os despachos dizem o que falta', () => {
    const caso = gravado(raiz).casos[0];
    const pronto = materializarPedido(caso, { raiz });
    expect(pronto.pasta).toBe(join(raiz, 'tools/bancadas/out/critica-peca-c01/rodada-01'));
    const lido = readFileSync(pronto.pedido, 'utf8');
    expect(lido).toContain(`- frontal: ${pronto.pasta}/frontal.png`);
    expect(lido).toContain(`- referência: ${raiz}/procedural/pecas/objeto/ref.png`);
    expect(lido).not.toMatch(/<raiz>|<pacote>|calibracao-do-critico/);
    expect(readFileSync(join(pronto.pasta, 'frontal.png'))).toEqual(PNG);
    const saida = saidaFalsa();
    expect(despachos({ raiz }, saida)).toBe(0);
    const dito = saida.linhas.log.join('\n');
    expect(dito).toMatch(/c01: faltam 3 de 3 julgamentos/);
    expect(dito).toMatch(/registro: npm run calibracao -- registrar c02 --arquivo=<resposta do crítico> --modelo=<modelo que julgou>/);
    expect(dito).toMatch(/c03: fora do julgamento/);
    expect(dito).toMatch(/6 despacho\(s\) do agente critico-visual a fazer; a definição dele declara o modelo 'sonnet'/);
  });
});

describe('registrar o julgamento do crítico', () => {
  const agora = () => new Date('2026-11-26T15:30:00.000Z');
  const arquivoDe = (lido) => { const caminho = join(raiz, `resposta-${createHash('md5').update(lido).digest('hex')}.txt`); writeFileSync(caminho, lido); return caminho; };
  beforeEach(() => { montar(raiz); });

  it('grava a nota, os defeitos, as impressões, o modelo e a data, e o primeiro modelo vira o medido', () => {
    const saida = saidaFalsa();
    expect(registrar({ id: 'c02', arquivo: arquivoDe(resposta(6, [defeitoJulgado('haste', 'espessura', 'maior')])), modelo: 'modelo-a', raiz, agora }, saida)).toBe(0);
    const conj = gravado(raiz);
    expect(conj.critico.modelo.medido).toBe('modelo-a');
    expect(conj.resultados).toEqual([{ caso: 'c02', agenteSha256: conj.critico.agente.sha256, julgamentos: [{
      nota: 6, defeitos: [defeitoJulgado('haste', 'espessura', 'maior')], pedidoSha256: conj.casos[1].pedido.sha256, imagemSha256: hashDasImagens(conj.casos[1]), modelo: 'modelo-a', data: '2026-11-26T15:30:00.000Z',
    }] }]);
    expect(saida.linhas.log[0]).toMatch(/julgamento 1 de 3 registrado, nota 6, 1 defeito\(s\), modelo modelo-a/);
    expect(conferirConjunto({ raiz }).ok).toBe(true);
  });

  it('o modelo diferente do medido é gravado e avisado, e o quarto julgamento é recusado', () => {
    for (const modelo of ['modelo-a', 'modelo-a']) registrar({ id: 'c01', arquivo: arquivoDe(resposta(9)), modelo, raiz, agora }, saidaFalsa());
    const saida = saidaFalsa();
    expect(registrar({ id: 'c01', arquivo: arquivoDe(resposta(9)), modelo: 'modelo-b', raiz, agora }, saida)).toBe(0);
    expect(saida.linhas.log[1]).toMatch(/aviso: este julgamento veio do modelo 'modelo-b' e o conjunto foi medido com 'modelo-a'/);
    expect(() => registrar({ id: 'c01', arquivo: arquivoDe(resposta(9)), modelo: 'modelo-a', raiz, agora }, saidaFalsa())).toThrow(/já tem 3 de 3 julgamentos/);
    expect(conferirConjunto({ raiz }).ok).toBe(true);
  });

  it('recusa sem o modelo, sem a resposta, sem JSON, o caso da medida e o agente que mudou, sem tocar o conjunto', async () => {
    const antes = readFileSync(caminhoDoConjunto(raiz), 'utf8');
    const boa = arquivoDe(resposta(9));
    const saida = saidaFalsa();
    expect(await principal(['registrar', 'c01', `--arquivo=${boa}`], saida, { raiz })).toBe(2);
    expect(saida.linhas.error.join('\n')).toMatch(/falta o modelo em que o crítico rodou; esperado --modelo=/);
    expect(await principal(['registrar', 'c01', '--modelo=modelo-a'], saidaFalsa(), { raiz })).toBe(2);
    expect(await principal(['registrar', 'c09', `--arquivo=${boa}`, '--modelo=modelo-a'], saidaFalsa(), { raiz })).toBe(2);
    expect(await principal(['registrar', 'c01', '--arquivo', arquivoDe('sem veredito'), '--modelo', 'modelo-a'], saidaFalsa(), { raiz })).toBe(1);
    expect(await principal(['registrar', 'c03', `--arquivo=${boa}`, '--modelo=modelo-a'], saidaFalsa(), { raiz })).toBe(1);
    escrever(raiz, AGENTE_DO_CRITICO, AGENTE.replace('dizer a verdade', 'dizer o que acha'));
    const mudou = saidaFalsa();
    expect(await principal(['registrar', 'c01', `--arquivo=${boa}`, '--modelo=modelo-a'], mudou, { raiz })).toBe(1);
    expect(mudou.linhas.error.join('\n')).toMatch(/o agente do crítico mudou desde a calibração/);
    expect(readFileSync(caminhoDoConjunto(raiz), 'utf8')).toBe(antes);
  });

  it('recalibrar só de propósito: sem a opção recusa e diz o que apagaria; com ela apaga, grava o agente e o modelo de agora e lista os despachos', async () => {
    registrar({ id: 'c01', arquivo: arquivoDe(resposta(9)), modelo: 'modelo-a', raiz, agora }, saidaFalsa());
    escrever(raiz, AGENTE_DO_CRITICO, AGENTE.replace('model: sonnet', 'model: opus').replace('dizer a verdade', 'dizer o que acha'));
    const sem = saidaFalsa();
    expect(await principal(['recalibrar'], sem, { raiz })).toBe(2);
    expect(sem.linhas.error.join('\n')).toMatch(/recalibrar apaga 1 julgamento\(s\) gravado\(s\) e pede 6 despachos novos do crítico; recebido sem --de-proposito/);
    expect(gravado(raiz).resultados).toHaveLength(1);
    const com = saidaFalsa();
    expect(recalibrar({ deProposito: true, raiz }, com)).toBe(0);
    const conj = gravado(raiz);
    expect(conj.resultados).toEqual([]);
    expect(conj.critico.modelo).toEqual({ declarado: 'opus', medido: null });
    expect(conj.critico.agente.sha256).toBe(hashDoAgente(AGENTE_DO_CRITICO, raiz));
    expect(com.linhas.log.join('\n')).toMatch(/6 despacho\(s\) do agente critico-visual a fazer/);
    expect(conferirConjunto({ raiz })).toMatchObject({ ok: true, avisos: [] });
  });
});

describe('a pontuação', () => {
  let conj;
  beforeEach(() => { conj = montar(raiz); });

  it('o defeito é citado pela parte ou pelo lugar junto com o tipo e o sentido aceitos, e o sentido contrário não cita', () => {
    const esperado = conj.casos[1].defeitos[0];
    const com = (d) => ({ defeitos: [d] });
    expect(citaDefeito(com(defeitoJulgado('hasteElevacao', 'espessura', 'maior')), esperado)).toBe(true);
    expect(citaDefeito(com(defeitoJulgado('cilindro', 'espessura', 'maior', 'trecho da HASTE acima da camisa')), esperado)).toBe(true);
    expect(citaDefeito(com(defeitoJulgado('haste', 'espessura', 'menor')), esperado)).toBe(false);
    expect(citaDefeito(com(defeitoJulgado('camisa', 'espessura', 'maior')), esperado)).toBe(false);
    expect(citaDefeito({ defeitos: [] }, esperado)).toBe(false);
  });

  it('o defeito que declara o lugar é citado pela parte e pelo lugar com outro tipo, e não pelo lugar errado, pela parte errada nem pelo contrário', () => {
    const esperado = { ...conj.casos[1].defeitos[0], parte: 'raios', palavras: ['raio', 'par'], lugar: ['par', 'fenda', 'cubo'], contrarios: ['espessura/menor'] };
    const com = (d) => ({ defeitos: [d] });
    /* o mesmo defeito por outro tipo: a fenda curta junto ao cubo no lugar do raio largo */
    expect(citaDefeito(com(defeitoJulgado('raios', 'comprimento', 'menor', 'fenda entre os dois raios de cada par, a partir do cubo')), esperado)).toBe(true);
    expect(citaDefeito(com(defeitoJulgado('Raios', 'superficie', 'anguloso', 'junto ao CUBO')), esperado)).toBe(true);
    /* a parte certa no lugar errado, com tipo fora dos aceitos */
    expect(citaDefeito(com(defeitoJulgado('raios', 'uniao', 'atravessando', 'pontas externas, junto ao lábio do aro')), esperado)).toBe(false);
    /* a palavra do lugar só vale inteira: parede e parte não são par */
    expect(citaDefeito(com(defeitoJulgado('raios', 'superficie', 'anguloso', 'parede de fora, na parte de cima')), esperado)).toBe(false);
    /* o lugar certo em outra parte */
    expect(citaDefeito(com(defeitoJulgado('aro', 'comprimento', 'menor', 'fenda junto ao cubo')), esperado)).toBe(false);
    /* o contrário do defeito não o cita nem no lugar certo */
    expect(citaDefeito(com(defeitoJulgado('raios', 'espessura', 'menor', 'cada raio do par, junto ao cubo')), esperado)).toBe(false);
    /* a regra do tipo continua valendo sozinha, e o defeito sem `lugar` não ganha a regra nova */
    expect(citaDefeito(com(defeitoJulgado('raios', 'espessura', 'maior', 'corpo inteiro')), esperado)).toBe(true);
    const semLugar = conj.casos[1].defeitos[0];
    expect(citaDefeito(com(defeitoJulgado('haste', 'comprimento', 'menor', 'corpo da haste')), semLugar)).toBe(false);
  });

  it('o resumo do conjunto versionado conta o par fechado da roda descrito por dois tipos, sem julgamento novo', () => {
    const real = lerConjuntoDoDisco();
    const roda = real.casos.find((k) => k.defeitos.some((d) => d.lugar));
    const julgamentos = real.resultados.find((res) => res.caso === roda.id).julgamentos;
    const citam = julgamentos.map((j) => citaDefeito(j, roda.defeitos[0]));
    expect(citam.filter(Boolean).length).toBe(2);
    const semLugar = { ...roda.defeitos[0] }; delete semLugar.lugar; delete semLugar.contrarios;
    expect(julgamentos.filter((j) => citaDefeito(j, semLugar)).length).toBe(1);
    expect(pontuar(real).casos.find((k) => k.id === roda.id).acerta).toBe(true);
  });

  it('o caso com defeito acerta citado em dois de três e sem nota 10, e erra quando o crítico não o cita', () => {
    const caso = conj.casos[1];
    const cita = (nota) => julgamento(caso, { nota, defeitos: [defeitoJulgado('haste', 'espessura', 'maior')] });
    expect(pontuarCaso(caso, [cita(8), cita(6)]).acerta).toBe(null);
    expect(pontuarCaso(caso, [cita(8), cita(6), julgamento(caso, { nota: 9 })])).toMatchObject({ acerta: true, mediana: 8, amplitude: 3 });
    const errou = pontuarCaso(caso, [cita(8), julgamento(caso, { nota: 10 }), julgamento(caso, { nota: 10 })]);
    expect(errou.acerta).toBe(false);
    expect(errou.motivos).toEqual(['mediana 10 fora da faixa 0 a 9', '2 julgamentos fora da faixa (no máximo 1)', "o defeito de 'haste' foi citado em 1 de 3 julgamentos (mínimo 2)"]);
  });

  it('o controle acerta de 8 a 10 com no máximo um julgamento citando defeito estrutural', () => {
    const caso = conj.casos[0];
    const limpo = (nota) => julgamento(caso, { nota });
    const estrutural = (nota) => julgamento(caso, { nota, defeitos: [defeitoJulgado('haste', 'uniao', 'afastado')] });
    expect(pontuarCaso(caso, [limpo(9), limpo(10), estrutural(8)]).acerta).toBe(true);
    const errou = pontuarCaso(caso, [limpo(9), estrutural(6), estrutural(7)]);
    expect(errou.acerta).toBe(false);
    expect(errou.motivos).toEqual(['mediana 7 fora da faixa 8 a 10', '2 julgamentos fora da faixa (no máximo 1)', '2 julgamentos do controle citam defeito estrutural (no máximo 1)']);
  });

  it('o gate passa enquanto faltam julgamentos, reprova o conjunto completo que não acerta e passa o que acerta', async () => {
    const completo = (c, notaDoControle) => {
      const [c01, c02] = c.casos;
      c.critico.modelo.medido = 'modelo-a';
      c.resultados = [
        { caso: 'c01', agenteSha256: c.critico.agente.sha256, julgamentos: [1, 2, 3].map(() => julgamento(c01, { nota: notaDoControle })) },
        { caso: 'c02', agenteSha256: c.critico.agente.sha256, julgamentos: [1, 2, 3].map(() => julgamento(c02, { nota: 7, defeitos: [defeitoJulgado('haste', 'espessura', 'maior')] })) },
      ];
    };
    regravar(raiz, (c) => { completo(c, 9); c.resultados[1].julgamentos.pop(); });
    expect(conferirConjunto({ raiz })).toMatchObject({ ok: true, pontuacao: { estado: 'pendente', faltam: { c02: 1 } } });
    regravar(raiz, (c) => completo(c, 5));
    const r = conferirConjunto({ raiz });
    expect(codigos(r)).toEqual(['calibracao-nao-acerta']);
    expect(r.problemas[0].mensagem).toMatch(/acerta 1 de 2 casos \(mínimo 2\): c01 controle-da-haste \(mediana 5 fora da faixa 8 a 10/);
    const saida = saidaFalsa();
    expect(resumo({ raiz }, saida)).toBe(1);
    expect(saida.linhas.log.join('\n')).toMatch(/c03 haste-solta \(forma-prometida\): fora do julgamento/);
    regravar(raiz, (c) => completo(c, 9));
    expect(pontuar(gravado(raiz))).toMatchObject({ estado: 'passa', acertos: 2 });
    expect(await principal(['conferir'], saidaFalsa(), { raiz })).toBe(0);
    expect(resumo({ raiz }, saidaFalsa())).toBe(0);
  });

  it('o caso obrigatório errado reprova o conjunto mesmo com o mínimo de acertos', () => {
    regravar(raiz, (c) => {
      const [c01, c02] = c.casos;
      c02.obrigatorio = true;
      c.regra.passa = { minimo: 1, de: 2, obrigatorias: ['haste-grossa'] };
      c.resultados = [
        { caso: 'c01', agenteSha256: c.critico.agente.sha256, julgamentos: [1, 2, 3].map(() => julgamento(c01, { nota: 9 })) },
        { caso: 'c02', agenteSha256: c.critico.agente.sha256, julgamentos: [1, 2, 3].map(() => julgamento(c02, { nota: 9 })) },
      ];
    });
    const r = conferirConjunto({ raiz });
    expect(codigos(r)).toEqual(['calibracao-nao-acerta']);
    expect(r.problemas[0].mensagem).toMatch(/erra o obrigatório haste-grossa/);
  });
});
