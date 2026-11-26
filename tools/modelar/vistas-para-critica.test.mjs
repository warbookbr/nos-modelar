/* vistas-para-critica.test.mjs — o pacote que a crítica visual recebe: o prefixo que apaga as imagens velhas pega só as da peça pedida,
   a unidade do alvo sai das formas que o `REFINA.esboco` liga, o pedido sai da receita na ordem combinada, com o lado de cada vista e o
   limite do veredito, e o pacote inteiro, com as capturas trocadas por gravadores de arquivo, junta o alvo, o montado e a sobreposição.
   O pedido de uma receita de prova (o bloco furado, que refina um esboço) e o de uma peça de montagem (o motor do avião) são lidos de
   verdade, e só o que custa navegador é trocado. */
import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { aceitesVigentes } from '../../src/autoria/etapas-pela-impressao.js';
import { lerPergunta } from '../../src/autoria/perguntas-do-critico.js';
import {
  ELEVACOES_DA_LUZ_RASANTE, LIMITE_DO_VEREDITO, PERGUNTA_DO_ALVO, PRAZO_DA_CAPTURA_MONTADA_MS, VISTAS_MONTADAS, ladoDaVista, vistaDaPranchaDesenhada, avisoDasReferenciasIgnoradas, referenciasSemLeitura, montagemDaPeca, montarPedido, pastaDaRodada, prefixoDaPeca, referenciasDoPlano,
  DISTANCIA_DE_PERTO_MM, campoDePertoMm, MOTIVO_SEM_MEDIR, ReceitaReprovada, decidirLuzRasante, imprimir, fracaoVisivelDaPeca, lerReferenciasExternas, lerOrientacaoDaReferencia, LIMITE_DA_ORIENTACAO, AJUDA, imagensDoReflexo, LEITURA_DA_FAIXA, LEITURA_DO_REFLEXO, secaoDoReflexo, MINIMO_DO_REFLEXO, luzRasanteDoPacote, primeiraQuePassa, unidadeDoAlvo, vistaDoArquivo, vistasMontadasVisiveis, vistasParaCritica as pacoteDoCritico, vistasRepetidas,
  ARQUIVO_DO_CONTORNO_SOBREPOSTO, contornosParaSobrepor, etapaFixaDaPeca, lerContornosExternos, lerRegioesDoContorno, motivoDaEtapaFixa,
  ARQUIVO_DAS_PERGUNTAS_FECHADAS, FORMATO_DAS_PERGUNTAS_FECHADAS, NAO_DA_PARA_VER, NAO_VERIFICAVEL, REGRA_DA_NOTA, arquivoDoPedidoFechado, juntarOrdens, lerRespostasFechadas,
  montarPedidoFechado, notaDasRespostas, notaEscrita, normalizarResposta, perguntasFechadas, relatorioDaJuncao, relatorioDasNotas, respostasQueMudaram, variacaoDasNotas,
  ARQUIVO_DOS_DADOS_DO_PEDIDO, afirmacoesDaForma, gravarPedidos, notaPelaRegra, pesosDasPerguntas, refazerPedidos, semMedidas,
  FOLGA_DE_CONTATO_MM, SEM_PARTE, cortesDosEncaixes, ehImpressaoDasPartes, encaixesDoPadrao, impressaoDasPartes, impressaoDasPartesDaReceita, partesCitadasNosDefeitos, partesQueDiferem, registroDaRodada,
  EMPATE_DA_AREA_MONTADA, MONTADAS_DO_PADRAO, PACOTE_COMPLETO, PACOTE_PADRAO, VISTAS_DE_SUPERFICIE_NO_PADRAO, comandoDoCompleto, descricaoDoPacotePadrao, imagensCitadas, impressoesDasPartes, montadasDoPadrao,
  partesComVistaIsolada, ultimaRodadaJulgada,
  FOLGA_DO_ENQUADRAMENTO, PASTA_DO_ANTES_E_DEPOIS, RESOLUCAO_POR_TIPO, antesEDepois, apagarPacotesAntigos, imagensDoPacote, pacotesDaPeca, pastasDoAntesEDepois, relatorioDoAntesEDepois, resolucaoDoPng, tipoDaCaptura,
} from './vistas-para-critica.mjs';
import { extrairVeredito } from '../../src/autoria/calibracao-do-critico.js';
import { lerContornos } from './comparar-contornos.mjs';
import { PNG } from 'pngjs';
import { alvoDoRepositorio, nomeDaPastaDoPacote } from './rodada-de-modelagem.mjs';

const area = mkdtempSync(join(tmpdir(), 'vistas-critica-'));
/* A medição da receita trocada por uma que passa: o pacote mede antes de capturar, e os testes do pacote não pagam a medição real. */
const medirPassa = async () => ({ passou: true, sha256: 'sha256:de-ensaio', relatorio: 'ok' });
afterAll(() => rmSync(area, { recursive: true, force: true }));
/* Os testes de antes do pacote padrão (2026-11-26) conferem o pacote completo, que continua saindo com `completo: true`; o padrão, que é
   o que sai sem opção, tem os testes dele em "o pacote padrão", e quem o quer aqui passa `completo: false`. */
const vistasParaCritica = (peca, opcoes = {}) => pacoteDoCritico(peca, { completo: true, ...opcoes });

describe('imagens antigas da peça', () => {
  it('o prefixo é o nome que a bancada dá às capturas da peça', () => {
    expect(prefixoDaPeca('braco-robotico/ombro')).toBe('bancada-braco-robotico-ombro-');
    expect('bancada-braco-robotico-ombro-traseira-orto.png'.startsWith(prefixoDaPeca('braco-robotico/ombro'))).toBe(true);
    expect('bancada-braco-robotico-ombro-x-traseira.png'.startsWith(prefixoDaPeca('braco-robotico/ombr'))).toBe(false);
  });

  it('a pasta da rodada é uma por peça, ao lado das capturas', () => {
    expect(pastaDaRodada('aviao/motor', '/saida')).toBe(join('/saida', 'critica-aviao-motor'));
    expect(pastaDaRodada('tools/x/receita.js', '/saida')).toBe(join('/saida', 'critica-tools-x-receita.js'));
  });
});

describe('vistas repetidas', () => {
  it('acusa duas vistas com o mesmo conteúdo e deixa passar as diferentes', () => {
    const conteudo = { 'a-direita.png': 'x', 'a-isometrica.png': 'x', 'a-frontal.png': 'y' };
    const ler = (arquivo) => Buffer.from(conteudo[arquivo]);
    expect(vistasRepetidas(Object.keys(conteudo), ler)).toEqual([['a-direita.png', 'a-isometrica.png']]);
    expect(vistasRepetidas(['a-direita.png', 'a-frontal.png'], ler)).toEqual([]);
  });
});

describe('a unidade do alvo', () => {
  const dados = (...pares) => ({ formas: pares.map(([id, unidade]) => ({ id, unidade })) });

  it('as formas ligadas numa unidade só dão essa unidade', () => {
    const r = unidadeDoAlvo(dados(['capo', 'motor'], ['escape-d', 'motor'], ['outra', 'fuselagem']), ['capo', 'escape-d']);
    expect(r).toEqual({ unidade: 'motor', contagem: { motor: 2 }, semUnidade: [], ausentes: [] });
  });

  it('em mais de uma unidade, a que tem mais das formas ligadas', () => {
    const r = unidadeDoAlvo(dados(['a', 'asas'], ['b', 'asas'], ['c', 'fuselagem']), ['a', 'b', 'c']);
    expect(r.unidade).toBe('asas');
    expect(r.contagem).toEqual({ asas: 2, fuselagem: 1 });
  });

  it('no empate, a que vem primeiro pelo nome, sempre a mesma', () => {
    const d = dados(['a', 'zeta'], ['b', 'alfa']);
    expect(unidadeDoAlvo(d, ['a', 'b']).unidade).toBe('alfa');
    expect(unidadeDoAlvo(d, ['b', 'a']).unidade).toBe('alfa');
  });

  it('sem unidade declarada em nenhuma forma ligada, o alvo é o esboço inteiro (unidade nula)', () => {
    const r = unidadeDoAlvo(dados(['bloco', null], ['viga', undefined]), ['bloco', 'viga']);
    expect(r).toEqual({ unidade: null, contagem: {}, semUnidade: ['bloco', 'viga'], ausentes: [] });
  });

  it('a forma sem unidade não conta, e a forma que a opção não tem sai em ausentes', () => {
    const r = unidadeDoAlvo(dados(['a', 'motor'], ['b', null]), ['a', 'b', 'fantasma']);
    expect(r).toEqual({ unidade: 'motor', contagem: { motor: 1 }, semUnidade: ['b'], ausentes: ['fantasma'] });
  });
});

describe('o lado de onde cada vista olha', () => {
  const ORIENTACAO = { frente: '-z', nomeDaFrente: 'a proa', nomeDeTras: 'a cauda' };

  it('cada vista da bancada é a vista do esboço que olha do mesmo lado, e com a orientação diz o lado do objeto', () => {
    expect(ladoDaVista('frontal', ORIENTACAO)).toContain('olha de +z e vê a cauda');
    expect(ladoDaVista('traseira', ORIENTACAO)).toContain('olha de -z e vê a proa');
    expect(ladoDaVista('direita', ORIENTACAO)).toContain('olha de +x e vê o lado direito');
    expect(ladoDaVista('esquerda', ORIENTACAO)).toContain('olha de -x e vê o lado esquerdo');
    expect(ladoDaVista('superior', ORIENTACAO)).toContain('olha de +y');
    expect(ladoDaVista('inferior', ORIENTACAO)).toContain('olha de -y');
  });

  it('sem orientação diz os eixos, e vista que não existe não tem lado', () => {
    expect(ladoDaVista('frontal')).toContain('olha de +z');
    expect(ladoDaVista('lateral')).toBeNull();
  });

  it('a vista de uma captura da bancada sai do nome do arquivo, com ou sem opções, e a peça com nome de vista não confunde', () => {
    const peca = 'aviao/motor';
    expect(vistaDoArquivo('/o/bancada-aviao-motor-isometrica-orto.png', peca)).toBe('isometrica');
    expect(vistaDoArquivo('/o/bancada-aviao-motor-direita-sel-capo-isolar-orto-focado.png', peca)).toBe('direita');
    expect(vistaDoArquivo('/o/bancada-aviao-motor-traseira-orto-raio-x.png', peca)).toBe('traseira');
    expect(vistaDoArquivo('/o/bancada-braco-frontal-superior-orto.png', 'braco/frontal')).toBe('superior');
    expect(vistaDoArquivo('/o/qualquer.png', peca)).toBeNull();
  });
});

describe('as referências do plano', () => {
  const existentes = new Set(['/repo/docs/ref/lateral.png', '/repo/docs/ref/andaime.json', '/repo/docs/mapa.JPG']);
  const existe = (c) => existentes.has(c);

  it('guarda só as imagens, com o caminho absoluto, e diz as que não são imagem e as que faltam', () => {
    const plano = { referencias: ['docs/ref/lateral.png', 'docs/ref/andaime.json', 'docs/mapa.JPG', 'docs/ref/some.png'] };
    expect(referenciasDoPlano(plano, { raiz: '/repo', pastaDaReceita: '/receita', existe })).toEqual({
      imagens: ['/repo/docs/ref/lateral.png', '/repo/docs/mapa.JPG'], pranchas: [], ignoradas: ['docs/ref/andaime.json'], ausentes: ['docs/ref/some.png'], locaisAusentes: [],
    });
  });

  it('o caminho que não existe a partir da raiz vale a partir da pasta da receita', () => {
    const r = referenciasDoPlano({ referencias: ['../andaime.json', '../x.png'] }, { raiz: '/repo', pastaDaReceita: '/receita-pai/filha', existe: (c) => c === '/receita-pai/andaime.json' || c === '/receita-pai/x.png' });
    expect(r).toEqual({ imagens: ['/receita-pai/x.png'], pranchas: [], ignoradas: ['../andaime.json'], ausentes: [], locaisAusentes: [] });
  });

  it('plano ausente não tem referência', () => {
    expect(referenciasDoPlano(null)).toEqual({ imagens: [], pranchas: [], ignoradas: [], ausentes: [], locaisAusentes: [] });
  });
});

describe('a montagem a que a peça pertence', () => {
  it('a peça de uma montagem acha a instância dela, e a que não é de montagem nenhuma não acha', () => {
    expect(montagemDaPeca('aviao/motor')).toMatchObject({ instancia: 'motor', instancias: ['motor'] });
    expect(montagemDaPeca('aviao/motor').arquivo.replaceAll('\\', '/')).toMatch(/procedural\/pecas\/aviao\/montagem\.json$/);
    expect(montagemDaPeca('aviao/nao-existe')).toBeNull();
    expect(montagemDaPeca('peca-solta')).toBeNull();
    expect(montagemDaPeca('tools/fixtures/forma-do-esboco/ok/receita.js')).toBeNull();
  });
});

/* ---------- o pedido ---------- */

const PLANO = {
  objeto: 'um bloco furado com uma viga inclinada acima dele, para provar o pedido',
  referencias: [],
  escala: { medida: 'largura do bloco', milimetros: 200 },
  partes: [
    { nome: 'bloco', forma: 'caixa de 200 por 100 mm com um furo passante', tecnica: 'caixa menos cilindro' },
    { nome: 'viga', forma: 'caixa inclinada 30 graus', tecnica: 'caixa girada' },
  ],
  criteriosDeReprovacao: ['o bloco sem o furo', 'a viga sem a inclinação'],
};
const ORIENTACAO = { frente: '-z', nomeDaFrente: 'a proa', nomeDeTras: 'a cauda' };
const DADOS = {
  peca: 'prova/bloco',
  plano: PLANO,
  orientacao: ORIENTACAO,
  alvo: { imagem: '/p/alvo/bloco-unidade-motor-composta.png', unidade: 'motor' },
  referencias: [{ caminho: '/r/lateral.png' }, { caminho: '/r/foto.png' }],
  modelo: [
    { arquivo: '/o/m-isometrica.png', vista: 'isometrica' }, { arquivo: '/o/m-frontal.png', vista: 'frontal' }, { arquivo: '/o/m-direita.png', vista: 'direita' },
  ],
  arame: [{ arquivo: '/o/m-iso-arame.png', vista: 'isometrica', tipo: 'arame' }, { arquivo: '/o/m-tras-raio.png', vista: 'traseira', tipo: 'raio X' }],
  montado: { instancia: 'bloco', imagens: [{ arquivo: '/p/etapas-esquerda.png', vista: 'esquerda' }, { arquivo: '/p/etapas-superior.png', vista: 'superior' }] },
  sobreposicao: { arquivos: ['/p/sobreposicao-x.png', '/p/sobreposicao-y.png', '/p/sobreposicao-z.png'], notas: [] },
  partes: [
    { nome: 'bloco', imagens: [{ arquivo: '/o/p-bloco-direita.png', vista: 'direita' }, { arquivo: '/o/p-bloco-iso.png', vista: 'isometrica' }] },
    { nome: 'viga', imagens: [{ arquivo: '/o/p-viga-direita.png', vista: 'direita' }] },
  ],
  perguntas: ['Qual parte fica presa a quê?', PERGUNTA_DO_ALVO],
};
const titulos = (texto) => [...texto.matchAll(/^## (.+)$/gm)].map((m) => m[1]);

describe('o pedido ao crítico', () => {
  const pedido = montarPedido(DADOS);

  it('a ordem é objeto, alvo, referências, modelo, montado, sobreposição, partes, critérios, perguntas e veredito', () => {
    expect(titulos(pedido)).toEqual(['Objeto', 'Alvo', 'Referências', 'Modelo', 'Montado', 'Sobreposição', 'Partes', 'Critérios de reprovação', 'Perguntas', 'Veredito']);
    expect(pedido.startsWith('# Pedido ao crítico visual: prova/bloco')).toBe(true);
  });

  it('traz o objeto, a escala e cada parte com a forma e a técnica do plano, na ordem do plano', () => {
    expect(pedido).toContain(PLANO.objeto);
    expect(pedido).toContain('Escala: largura do bloco, 200 mm.');
    for (const p of PLANO.partes) {
      expect(pedido).toContain(`### ${p.nome}`);
      expect(pedido).toContain(`Forma prometida: ${p.forma}`);
      expect(pedido).toContain(`Técnica prometida: ${p.tecnica}`);
    }
    expect(pedido.indexOf('### bloco')).toBeLessThan(pedido.indexOf('### viga'));
  });

  it('traz os critérios de reprovação e as perguntas, numeradas, com a pergunta do alvo e a aberta no fim', () => {
    for (const c of PLANO.criteriosDeReprovacao) expect(pedido).toContain(`- ${c}`);
    expect(pedido).toContain('Perguntas de forma deste objeto');
    expect(pedido).toContain('  1. Qual parte fica presa a quê?');
    expect(pedido).toContain(`  2. ${PERGUNTA_DO_ALVO}`);
    expect(pedido).toContain('  3. O que mais, nas imagens, parece estranho');
  });

  it('a pergunta do alvo é uma pergunta de forma que o validador das perguntas aceita', () => {
    expect(lerPergunta(PERGUNTA_DO_ALVO, 'teste')).toBe(PERGUNTA_DO_ALVO);
    expect(PERGUNTA_DO_ALVO).toMatch(/alvo difere da referência real/);
  });

  it('avisa que onde, evidencia e observacao têm até 240 caracteres', () => {
    expect(LIMITE_DO_VEREDITO).toBe(240);
    expect(pedido).toContain('`onde`, `evidencia` e `observacao` têm até 240 caracteres cada');
  });

  it('cita o caminho de todas as imagens que recebeu', () => {
    const caminhos = [
      DADOS.alvo.imagem, ...DADOS.referencias.map((r) => r.caminho), ...DADOS.modelo.map((i) => i.arquivo), ...DADOS.arame.map((i) => i.arquivo),
      ...DADOS.montado.imagens.map((i) => i.arquivo), ...DADOS.sobreposicao.arquivos, ...DADOS.partes.flatMap((p) => p.imagens.map((i) => i.arquivo)),
    ];
    expect(caminhos).toHaveLength(16);
    for (const caminho of caminhos) expect(pedido).toContain(caminho);
  });

  it('diz uma vez, em Modelo, de onde cada vista usada olha, e só das usadas', () => {
    const modelo = pedido.slice(pedido.indexOf('## Modelo'), pedido.indexOf('## Montado'));
    for (const vista of ['isometrica', 'frontal', 'traseira', 'direita', 'esquerda', 'superior']) expect(modelo).toContain(`- ${vista}: ${ladoDaVista(vista, ORIENTACAO)}`);
    expect(modelo).not.toContain('- inferior:');
    /* depois do alvo, que descreve a composta por conta própria, o lado da vista direita aparece uma vez só, e não junto de cada imagem */
    expect(pedido.slice(pedido.indexOf('## Modelo')).match(/olha de \+x e vê o lado direito/g)).toHaveLength(1);
  });

  it('o alvo é a composta da unidade, com o lado de cada vista dela, e a nota é contra ela', () => {
    const alvo = pedido.slice(pedido.indexOf('## Alvo'), pedido.indexOf('## Referências'));
    expect(alvo).toContain('composta da unidade `motor` do esboço aprovado');
    expect(alvo).toContain(`- ${DADOS.alvo.imagem}`);
    expect(alvo).toContain('- lateral: olha de +x e vê o lado direito');
    expect(alvo).toContain('A nota do veredito é a fidelidade do modelo a ela');
    expect(montarPedido({ ...DADOS, alvo: { imagem: '/a.png', unidade: null } })).toContain('composta do esboço inteiro do esboço aprovado');
  });

  it('a referência com o lado no nome diz de onde a imagem olha, e a sem lado só o caminho', () => {
    const refs = pedido.slice(pedido.indexOf('## Referências'), pedido.indexOf('## Modelo'));
    expect(refs).toContain('- lateral.png: /r/lateral.png (o olho da imagem: olha de -x e vê o lado esquerdo');
    expect(refs).toContain('- foto.png: /r/foto.png\n');
    expect(refs).toContain('A nota não é contra elas');
  });

  it('não conta como a peça foi feita: nada de receita, passos, rodada ou mudança', () => {
    expect(pedido).not.toMatch(/\bPASSOS\b|receita|rodada|histórico|mudou|ferramenta/i);
  });

  it('sem esboço, o alvo é a referência; sem montagem e sem sobreposição, essas seções não existem', () => {
    const sem = montarPedido({ ...DADOS, alvo: null, montado: null, sobreposicao: null });
    expect(titulos(sem)).toEqual(['Objeto', 'Alvo', 'Referências', 'Modelo', 'Partes', 'Critérios de reprovação', 'Perguntas', 'Veredito']);
    expect(sem).toContain('A receita não refina um esboço aprovado, e o alvo é a referência da seção seguinte');
    expect(sem).not.toContain('Fora da sobreposição');
    expect(sem).not.toContain('A nota não é contra elas');
  });

  it('sem plano, o pedido sai com o que existe e sem objeto, partes e critérios; sem perguntas não há seção delas', () => {
    const sem = montarPedido({ ...DADOS, plano: null, partes: [], perguntas: [] });
    expect(titulos(sem)).toEqual(['Alvo', 'Referências', 'Modelo', 'Montado', 'Sobreposição', 'Veredito']);
  });

  it('a nota da sobreposição, a forma do esboço sem sólido, vai no pedido', () => {
    const com = montarPedido({ ...DADOS, sobreposicao: { arquivos: ['/p/sobreposicao-x.png'], notas: ["a forma 'faixa' do esboço não tem sólido"] } });
    expect(com).toContain("Fora da sobreposição: a forma 'faixa' do esboço não tem sólido.");
  });

  it('é o mesmo texto para os mesmos dados', () => {
    expect(montarPedido(DADOS)).toBe(montarPedido(structuredClone(DADOS)));
  });
});

/* ---------- o pacote inteiro ---------- */

/* O gravador que faz as vezes da bancada: grava um arquivo diferente por captura, com o nome que a bancada dá. */
function bancadaFalsa(pasta, peca) {
  const chamadas = [];
  const fazer = async (opcoes) => {
    chamadas.push(opcoes);
    const vistas = opcoes.revisar ? ['isometrica', 'frontal', 'direita', 'superior'] : String(opcoes.vistas).split(',');
    const sufixo = [
      opcoes.selecionadas ? `sel-${opcoes.selecionadas}` : null, opcoes.modo ?? null, 'orto', opcoes.focar ? 'focado' : null,
      opcoes.arame === 'raio-x' ? 'raio-x' : (opcoes.arame ? 'arame' : null),
      opcoes.mirar ? `mira-${opcoes.mirar.join('_')}-d${opcoes.distancia}` : null,
    ].filter(Boolean).join('-');
    const arquivos = vistas.map((vista) => {
      const arquivo = join(pasta, `${prefixoDaPeca(peca)}${vista}-${sufixo}.png`);
      writeFileSync(arquivo, `${arquivo}`);
      return arquivo;
    });
    return { ok: true, resultado: { arquivos } };
  };
  return { fazer, chamadas };
}

describe('o pacote padrão: o conjunto de umas dez imagens e as partes que diferem da última rodada julgada', () => {
  const PECA = 'tools/fixtures/forma-do-esboco/ok/receita.js';
  const malha = (partes) => {
    /* um triângulo por parte, com os vértices numerados a partir de `de`: `{ nome: [de, deslocamento] }` */
    const V = new Map();
    const F = new Map();
    let f = 0;
    for (const [nome, [de, dx]] of Object.entries(partes)) {
      [[0, 0, 0], [1, 0, 0], [0, 1, 0]].forEach((p, i) => V.set(de + i, [p[0] + dx, p[1], p[2]]));
      f += 1;
      F.set(f, { id: f, vs: [de, de + 1, de + 2], parte: nome, liso: false });
    }
    return { V, F };
  };

  it('a impressão da malha de uma parte não depende do número dos vértices nem da ordem das faces, e muda com a posição e com o que a face carrega', () => {
    const a = impressoesDasPartes(malha({ bloco: [1, 0], viga: [10, 5] }));
    const renumerada = impressoesDasPartes(malha({ viga: [200, 5], bloco: [50, 0] }));
    expect([...a.keys()].sort()).toEqual(['bloco', 'viga']);
    expect(renumerada.get('bloco')).toBe(a.get('bloco'));
    expect(renumerada.get('viga')).toBe(a.get('viga'));
    expect(impressoesDasPartes(malha({ bloco: [1, 0], viga: [10, 5.001] })).get('viga')).not.toBe(a.get('viga'));
    expect(impressoesDasPartes(malha({ bloco: [1, 0], viga: [10, 5.001] })).get('bloco')).toBe(a.get('bloco'));
    const lisa = malha({ bloco: [1, 0] });
    lisa.F.get(1).liso = true;
    expect(impressoesDasPartes(lisa).get('bloco')).not.toBe(a.get('bloco'));
    /* as faces sem parte entram juntas, com nome próprio, e a malha vazia não tem parte */
    const semParte = malha({ bloco: [1, 0] });
    semParte.F.set(9, { vs: [1, 2, 3] });
    expect([...impressoesDasPartes(semParte).keys()]).toEqual(['bloco', SEM_PARTE]);
    expect(impressoesDasPartes(semParte).get('bloco')).toBe(a.get('bloco'));
    expect(impressoesDasPartes(null).size).toBe(0);
  });

  it('a declaração do material em MATERIAIS entra na impressão da parte que o usa, e só nela', () => {
    const pintada = () => { const m = malha({ bloco: [1, 0], viga: [10, 5] }); m.F.get(1).material = 'aco'; return m; };
    const cinza = impressoesDasPartes(pintada(), { materiais: { aco: { cor: '#888888' }, vidro: { cor: '#aaccff' } } });
    const vermelho = impressoesDasPartes(pintada(), { materiais: { aco: { cor: '#ff0000' }, vidro: { cor: '#aaccff' } } });
    expect(vermelho.get('bloco')).not.toBe(cinza.get('bloco'));
    expect(vermelho.get('viga')).toBe(cinza.get('viga'));
    /* o material que a parte não usa não muda a impressão dela, e a ordem das chaves do dicionário também não */
    expect(impressoesDasPartes(pintada(), { materiais: { vidro: { cor: '#000000' }, aco: { cor: '#888888' } } }).get('bloco')).toBe(cinza.get('bloco'));
    /* sem a declaração (o material só nomeado) vale o nome, que a face já leva */
    expect(impressoesDasPartes(pintada()).get('bloco')).not.toBe(cinza.get('bloco'));
    expect(impressoesDasPartes(pintada(), { materiais: {} }).get('bloco')).toBe(impressoesDasPartes(pintada()).get('bloco'));
  });

  it('a impressão das partes junta a malha e a promessa de cada parte, em ordem de nome, e diz em quais duas impressões diferem', () => {
    const plano = (forma) => ({ partes: [{ nome: 'viga', forma, tecnica: 't' }, { nome: 'bloco', forma: 'caixa', tecnica: 't' }] });
    const a = impressaoDasPartes(malha({ viga: [10, 5], bloco: [1, 0] }), { plano: plano('tubo') });
    expect(Object.keys(a.malhas)).toEqual(['bloco', 'viga']);
    expect(Object.keys(a.promessas)).toEqual(['bloco', 'viga']);
    expect(ehImpressaoDasPartes(a)).toBe(true);
    expect(ehImpressaoDasPartes(JSON.parse(JSON.stringify(a)))).toBe(true);
    for (const ruim of [null, undefined, 'x', [], {}, { malhas: {} }, { malhas: {}, promessas: {}, a: 1 }, { malhas: { bloco: 'curto' }, promessas: {} }, { malhas: [], promessas: {} }, { malhas: {}, promessas: { bloco: 7 } }]) expect(ehImpressaoDasPartes(ruim)).toBe(false);
    expect(partesQueDiferem(a, a)).toEqual([]);
    expect(partesQueDiferem(a, impressaoDasPartes(malha({ viga: [10, 5.5], bloco: [1, 0] }), { plano: plano('tubo') }))).toEqual(['viga']);
    expect(partesQueDiferem(a, impressaoDasPartes(malha({ viga: [10, 5], bloco: [1, 0] }), { plano: plano('tubo oco') }))).toEqual(['viga']);
    expect(partesQueDiferem(a, impressaoDasPartes(malha({ bloco: [1, 2] }), { plano: plano('tubo') }))).toEqual(['bloco', 'viga']);
    expect(partesQueDiferem(a, null)).toEqual(['bloco', 'viga']);
    expect(impressaoDasPartes(malha({ bloco: [1, 0] })).promessas).toEqual({});
  });

  it('as partes citadas nos defeitos de um veredito saem sem repetição, e o defeito sem parte não cita nenhuma', () => {
    expect(partesCitadasNosDefeitos({ defeitos: [{ parte: 'chapa', tipo: 'posicao' }, { parte: 'rebaixoLateral' }, { parte: 'chapa' }, { tipo: 'proporcao' }, { parte: '' }, null] })).toEqual(['chapa', 'rebaixoLateral']);
    expect(partesCitadasNosDefeitos({ defeitos: [] })).toEqual([]);
    expect(partesCitadasNosDefeitos(null)).toEqual([]);
    expect(partesCitadasNosDefeitos({ defeitos: 'nenhum' })).toEqual([]);
  });

  it('entra a parte de malha diferente, a de promessa diferente, a nova, a que a malha não tem e a citada num defeito; sem base, todas', () => {
    const base = { malhas: { a: '1', b: '2', c: '3', e: '5', f: '6' }, promessas: { a: 'p', b: 'tubo', c: 'p', d: 'p', e: 'p', f: 'p' } };
    const atual = { malhas: { a: '1', b: '2', c: '3x', d: '4', f: '6' }, promessas: { a: 'p', b: 'tubo com rebaixo', c: 'p', d: 'p', e: 'p', f: 'p' } };
    expect(partesComVistaIsolada(['a', 'b', 'c', 'd', 'e', 'f'], atual, base)).toEqual({
      comVista: [{ nome: 'b', porque: 'promessa' }, { nome: 'c', porque: 'malha' }, { nome: 'd', porque: 'nova' }, { nome: 'e', porque: 'ausente' }],
      semVista: ['a', 'f'],
    });
    /* a parte que o veredito da rodada cita num defeito entra mesmo igual, e a que já entra pela malha fica com o motivo da malha */
    expect(partesComVistaIsolada(['a', 'b', 'c', 'd', 'e', 'f'], atual, base, { citadas: ['f', 'c'] })).toEqual({
      comVista: [{ nome: 'b', porque: 'promessa' }, { nome: 'c', porque: 'malha' }, { nome: 'd', porque: 'nova' }, { nome: 'e', porque: 'ausente' }, { nome: 'f', porque: 'defeito' }],
      semVista: ['a'],
    });
    /* o defeito que cita um nome fora do plano não diz qual parte ver: todas entram */
    expect(partesComVistaIsolada(['a', 'b'], atual, base, { citadas: ['janela 1D'] })).toEqual({ comVista: [{ nome: 'a', porque: 'defeito-sem-parte' }, { nome: 'b', porque: 'defeito-sem-parte' }], semVista: [] });
    expect(partesComVistaIsolada(['a', 'b'], atual, null, { citadas: ['a'] })).toEqual({ comVista: [{ nome: 'a', porque: 'sem-base' }, { nome: 'b', porque: 'sem-base' }], semVista: [] });
    /* a mesma malha e a mesma promessa: nenhuma parte leva vista isolada */
    expect(partesComVistaIsolada(['a', 'b'], base, base)).toEqual({ comVista: [], semVista: ['a', 'b'] });
    /* a promessa que só um dos lados tem é diferença */
    expect(partesComVistaIsolada(['a'], { malhas: { a: '1' }, promessas: {} }, base).comVista).toEqual([{ nome: 'a', porque: 'promessa' }]);
  });

  it('o registro da rodada se lê pelo número, e o que falta ou não é JSON é null', () => {
    const pasta = mkdtempSync(join(area, 'registros-'));
    writeFileSync(join(pasta, 'rodada-03.json'), JSON.stringify({ numero: 3, veredito: { nota: 6 } }));
    writeFileSync(join(pasta, 'rodada-04.json'), '{ quebrado');
    expect(registroDaRodada(pasta, 3)).toEqual({ numero: 3, veredito: { nota: 6 } });
    expect(registroDaRodada(pasta, 4)).toBeNull();
    expect(registroDaRodada(pasta, 12)).toBeNull();
  });

  it('a última rodada julgada é a de maior número com veredito, e a pasta sem rodada julgada não tem nenhuma', () => {
    const pasta = mkdtempSync(join(area, 'julgadas-'));
    expect(ultimaRodadaJulgada(join(pasta, 'nao-existe'))).toBeNull();
    writeFileSync(join(pasta, 'rodada-01.json'), JSON.stringify({ numero: 1, veredito: { nota: 6 } }));
    writeFileSync(join(pasta, 'rodada-02.json'), JSON.stringify({ numero: 2, veredito: { nota: 7 } }));
    writeFileSync(join(pasta, 'rodada-03.json'), JSON.stringify({ numero: 3, veredito: null }));
    writeFileSync(join(pasta, 'rodada-04.json'), '{ quebrado');
    writeFileSync(join(pasta, 'limite.json'), JSON.stringify({ veredito: {} }));
    expect(ultimaRodadaJulgada(pasta)).toBe(2);
    rmSync(join(pasta, 'rodada-01.json')); rmSync(join(pasta, 'rodada-02.json'));
    expect(ultimaRodadaJulgada(pasta)).toBeNull();
  });

  it('as vistas montadas do padrão são a isométrica e a de maior fração visível, sem a tapada; sem medida, as primeiras', () => {
    expect(montadasDoPadrao({ isometrica: 0.4, frontal: 0.3, traseira: 0, direita: 0.8, esquerda: 0.01, superior: 0.5, inferior: 0.5 })).toEqual(['isometrica', 'direita']);
    /* a isométrica tapada sai, e o empate fica com a que vem antes na lista */
    expect(montadasDoPadrao({ isometrica: 0.01, frontal: 0.3, traseira: 0, direita: 0.3, esquerda: 0.01, superior: 0.5, inferior: 0.5 })).toEqual(['superior', 'inferior']);
    expect(montadasDoPadrao({ isometrica: 0.01, frontal: 0.3, traseira: 0.3 }, { vistas: ['isometrica', 'frontal', 'traseira'] })).toEqual(['frontal', 'traseira']);
    expect(montadasDoPadrao(null)).toEqual(['isometrica', 'frontal']);
    expect(montadasDoPadrao({})).toEqual(['isometrica', 'frontal']);
    /* a vista sem medida vale depois das medidas */
    expect(montadasDoPadrao({ direita: 0.2 })).toEqual(['isometrica', 'direita']);
    expect(montadasDoPadrao(Object.fromEntries(VISTAS_MONTADAS.map((v) => [v, 0.04])))).toEqual([]);
    expect(montadasDoPadrao({ isometrica: 0.05, frontal: 0.05 }, { quantas: 1 })).toEqual(['isometrica']);
    /* com a área medida, vale a vista em que mais área da peça aparece, e não a de maior fração: a peça comprida vista de lado */
    const m = (visivel, areaVisivel) => ({ visivel, areaVisivel });
    expect(montadasDoPadrao({ isometrica: m(0.9, 5), frontal: m(0.95, 1.2), direita: m(0.8, 9), superior: m(0.95, 8.5), inferior: m(0.96, 8.6), traseira: m(0.01, 30) })).toEqual(['isometrica', 'direita']);
    expect(montadasDoPadrao({ isometrica: m(0.01, 5), frontal: m(0.5, 2), direita: m(0.5, 2) })).toEqual(['frontal', 'direita']);
    /* as áreas a menos de 20 % da maior empatam, e fica a que vem antes na ordem: a de lado antes da de cima e da de baixo */
    expect(EMPATE_DA_AREA_MONTADA).toBe(0.2);
    expect(montadasDoPadrao({ isometrica: m(0.91, 8.2), frontal: m(0.94, 2.2), traseira: m(0.35, 0.8), direita: m(0.82, 7.78), esquerda: m(0.81, 7.68), superior: m(0.95, 8.7), inferior: m(0.96, 8.76) })).toEqual(['isometrica', 'direita']);
    expect(montadasDoPadrao({ isometrica: m(0.62, 1.29), frontal: m(0, 0), traseira: m(0.61, 0.83), direita: m(1, 1.63), esquerda: m(1, 1.63), superior: m(1, 2.14), inferior: m(0.83, 1.79) })).toEqual(['isometrica', 'superior']);
    expect(montadasDoPadrao({ frontal: m(0.9, 7.9), direita: m(0.9, 10) }, { vistas: ['frontal', 'direita'], quantas: 1 })).toEqual(['direita']);
    expect(montadasDoPadrao({ frontal: m(0.9, 8), direita: m(0.9, 10) }, { vistas: ['frontal', 'direita'], quantas: 1 })).toEqual(['frontal']);
    const area = fracaoVisivelDaPeca({ foco: [[[0, 0, 0], [2, 0, 0], [0, 2, 0]]], outras: [], olho: [0, 0, 1] });
    expect(area.visivel).toBe(1);
    expect(area.areaVisivel).toBeGreaterThan(1.9);
    expect(area.areaVisivel).toBeLessThan(2.1);
    expect(fracaoVisivelDaPeca({ foco: [], outras: [], olho: [0, 0, 1] })).toEqual({ visivel: null, pixels: 0, areaVisivel: 0 });
  });

  /* O PEDIDO NÃO CONTA A HISTÓRIA DA PEÇA: nem como foi feita, nem o que mudou, nem o que já foi visto antes. O crítico que lê que uma
     parte "já foi julgada" ou "não mudou" a toma por aprovada, e o que lê que ela "difere" procura a diferença em vez de julgar a forma. */
  const HISTORIA = /\bPASSOS\b|receita|rodada|hist[óo]ric|mudou|mudança|mudaram|ferramenta|julgad|julgamento|difere|diferen|anterior|aprovad|conferid|\bantes\b|ainda não|\bjá\b/i;

  it('a descrição do pacote diz cada grupo que entrou e o que ficou de fora, sem contar a história da peça nem por que a parte tem vista', () => {
    const d = descricaoDoPacotePadrao({
      escolha: { comVista: [{ nome: 'viga', porque: 'malha' }, { nome: 'aba', porque: 'promessa' }, { nome: 'pino', porque: 'nova' }, { nome: 'furo', porque: 'ausente' }, { nome: 'chapa', porque: 'defeito' }], semVista: ['bloco', 'tampa'] },
      montadas: { entram: ['isometrica'], fora: ['frontal'] }, cortes: { entram: [{ vizinha: 'a', declarado: false }, { vizinha: 'b', declarado: true }], fora: ['c'], limiarMm: 0.01 },
      superficie: { lataria: false, reflexo: false },
    });
    expect(d.tipo).toBe(PACOTE_PADRAO);
    expect(d.entrou).toEqual([
      'as seis vistas da peça sozinha (isometrica, frontal, direita, superior, traseira e esquerda), para a proporção e a silhueta',
      'a malha em arame na vista isometrica e em raio X na traseira, para a topologia que a sombra esconde, na frente e atrás',
      'a luz rasante numa vista só, a de três quartos',
      'a vista montada isometrica, as em que mais da peça aparece entre as outras, para o contexto e a posição',
      'os cortes dos encaixes com `a` e `b`: todo encaixe com folga até 0,01 mm e os declarados pela peça, onde um cruzamento ou uma peça solta aparece primeiro',
      'a vista isolada das partes `viga`, `aba`, `pino`, `furo` e `chapa`',
    ]);
    expect(d.fora).toEqual([
      'a malha em arame na vista traseira, porque o raio X da mesma vista mostra as mesmas arestas',
      'a luz rasante nas vistas de frente, de lado e de cima',
      'as vistas montadas frontal, em que aparece menos da peça ou ela fica tapada',
      'o corte do encaixe com `c`, de folga maior que 0,01 mm',
      'a vista isolada das partes `bloco` e `tampa`, que aparecem nas vistas da peça inteira',
    ]);
    expect(d.partesSemVista).toEqual(['bloco', 'tampa']);
    const todas = descricaoDoPacotePadrao({ escolha: { comVista: [{ nome: 'bloco', porque: 'sem-base' }], semVista: [] } });
    expect(todas.entrou[2]).toBe('a vista isolada de todas as partes (1)');
    expect(todas.fora).toHaveLength(1);
    const umaSo = descricaoDoPacotePadrao({ escolha: { comVista: [{ nome: 'viga', porque: 'defeito' }], semVista: ['bloco'] } });
    expect(umaSo.entrou[2]).toBe('a vista isolada da parte `viga`');
    expect(umaSo.fora[1]).toBe('a vista isolada da parte `bloco`, que aparece nas vistas da peça inteira');
    /* os cortes: sem encaixe que encoste, o limiar é a menor folga; só declarados; e mais de um de fora */
    const cortes = (c) => descricaoDoPacotePadrao({ escolha: { comVista: [], semVista: [] }, cortes: c });
    expect(cortes({ entram: [{ vizinha: 'a', declarado: false }], fora: ['b', 'c'], limiarMm: 0.5 })).toMatchObject({
      entrou: { 2: 'o corte do encaixe com `a`: todo encaixe com folga até 0,50 mm, onde um cruzamento ou uma peça solta aparece primeiro' },
      fora: { 1: 'os cortes dos encaixes com `b` e `c`, de folga maior que 0,50 mm' },
    });
    expect(cortes({ entram: [{ vizinha: 'a', declarado: true }], fora: [], limiarMm: 0.01 }).entrou[2]).toBe('o corte do encaixe com `a`: os declarados pela peça, onde um cruzamento ou uma peça solta aparece primeiro');
    for (const frase of [...d.entrou, ...d.fora, ...todas.entrou, ...umaSo.entrou, ...umaSo.fora]) expect(frase).not.toMatch(HISTORIA);
    /* a régua pega as formas que o pedido já usou para contar a história */
    for (const frase of ['a malha dela difere da já julgada', 'ela ainda não foi julgada', 'não há julgamento anterior com que comparar', 'com a malha e a forma prometida já julgadas', 'a parte mudou', 'a diferença de malha', 'foi aprovada antes']) expect(frase).toMatch(HISTORIA);
  });

  it('o pedido com o pacote padrão diz o que entrou e o que ficou de fora no cabeçalho, lista as partes sem vista sem dizer que estão certas, e sem ele é o de sempre', () => {
    const pacote = descricaoDoPacotePadrao({ escolha: { comVista: [{ nome: 'viga', porque: 'malha' }], semVista: ['bloco'] } });
    const dados = { ...DADOS, partes: DADOS.partes.filter((p) => p.nome === 'viga'), pacote };
    const pedido = montarPedido(dados);
    expect(titulos(pedido)).toEqual(titulos(montarPedido(DADOS)));
    const cabecalho = pedido.slice(0, pedido.indexOf('## Objeto'));
    expect(cabecalho).toContain('Este pedido traz o conjunto padrão de imagens da peça, e não todas as que ela pode ter. Entraram:');
    for (const frase of [...pacote.entrou, ...pacote.fora]) expect(cabecalho).toContain(`- ${frase}`);
    expect(cabecalho).toContain('O que ficou de fora não é ausência nem defeito. Julgue pelo que veio; a pergunta que depender de uma imagem que não veio se responde `não dá para ver`, dizendo qual imagem faltou.');
    const partes = pedido.slice(pedido.indexOf('## Partes'), pedido.indexOf('## Critérios'));
    const frase = 'Só as partes abaixo têm vista isolada neste pedido. Sem vista isolada: `bloco`. Elas aparecem nas vistas da peça inteira, em Modelo, e se julgam por essas vistas como as outras: a falta da vista isolada não é ausência da parte e não diz que ela está certa.';
    expect(partes).toContain(frase);
    expect(partes).toContain('### viga');
    expect(partes).not.toContain('### bloco');
    /* o que o pacote padrão acrescenta ao pedido não conta a história; o resto do pedido é o de sempre, e não cita receita nem rodada */
    expect(cabecalho.slice(cabecalho.indexOf('Este pedido traz'))).not.toMatch(HISTORIA);
    expect(frase).not.toMatch(HISTORIA);
    expect(pedido).not.toMatch(/\bPASSOS\b|receita|rodada|histórico|mudou|ferramenta/i);
    /* nenhuma parte com vista: a seção continua, só com a frase */
    const nenhuma = montarPedido({ ...DADOS, partes: [], pacote: descricaoDoPacotePadrao({ escolha: { comVista: [], semVista: ['bloco', 'viga'] } }) });
    expect(titulos(nenhuma)).toEqual(titulos(montarPedido(DADOS)));
    expect(nenhuma).toContain('Nenhuma parte tem vista isolada neste pedido. Sem vista isolada: `bloco`, `viga`. Elas aparecem nas vistas da peça inteira');
    expect(nenhuma).not.toContain('Uma vista isolada de cada parte');
    /* os pedidos fechados levam o mesmo cabeçalho e a mesma frase das partes, e a pergunta da parte sem vista continua */
    for (const ordem of ['a', 'b']) {
      const fechado = montarPedidoFechado(dados, ordem);
      expect(fechado).toContain('Este pedido traz o conjunto padrão de imagens da peça');
      expect(fechado).toContain('Sem vista isolada: `bloco`. Elas aparecem nas vistas da peça inteira');
    }
    expect(perguntasFechadas(dados).map((q) => q.origem)).toContain('parte:bloco');
    /* sem `pacote` (o completo, e os dados gravados antes dele) o pedido não muda */
    expect(montarPedido(DADOS)).not.toContain('conjunto padrão');
    expect(imagensCitadas(pedido)).toEqual(['/p/alvo/bloco-unidade-motor-composta.png', '/r/lateral.png', '/r/foto.png', '/o/m-isometrica.png', '/o/m-frontal.png', '/o/m-direita.png', '/o/m-iso-arame.png', '/o/m-tras-raio.png', '/p/etapas-esquerda.png', '/p/etapas-superior.png', '/p/sobreposicao-x.png', '/p/sobreposicao-y.png', '/p/sobreposicao-z.png', '/o/p-viga-direita.png']);
  });

  async function montar({ completo, dependencias = {} } = {}) {
    const base = mkdtempSync(join(area, 'padrao-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const resultado = await pacoteDoCritico(PECA, {
      saida: pasta, pastaDasCapturas: base, ...(completo === undefined ? {} : { completo }),
      dependencias: {
        medirReceita: medirPassa, olharBancada: bancada.fazer, rodadasAnteriores: () => [],
        sobreposicaoDeCortes: async () => ({ arquivos: [], paineis: [], notas: [] }),
        ultimaRodadaJulgada: () => null,
        ...dependencias,
      },
    });
    const capturas = bancada.chamadas.map((c) => (c.revisar ? 'conjunto' : c.selecionadas ?? `${c.vistas}${c.arame === 'raio-x' ? ' raio-x' : c.arame ? ' arame' : ''}`));
    return { pasta, resultado, capturas, chamadas: bancada.chamadas, pedido: readFileSync(join(pasta, 'pedido.md'), 'utf8'), manifesto: JSON.parse(readFileSync(join(pasta, 'pacote.json'), 'utf8')) };
  }
  /* a rodada 2 julgada, com a impressão das partes que ela gravou no registro (a de `daRodada`, tirada da receita de prova com a malha
     trocada), e a malha de agora trocada por um gravador */
  const comBase = (daRodada, deAgora = { bloco: [1, 0], viga: [10, 5] }, { defeitos = [], semImpressao = false } = {}) => {
    const pedidos = [];
    return {
      pedidos,
      dependencias: {
        ultimaRodadaJulgada: (pastaDosRegistros) => { pedidos.push(['julgada', basename(pastaDosRegistros)]); return 2; },
        registroDaRodada: (pastaDosRegistros, numero) => { pedidos.push(['registro', numero]); return { numero, veredito: { nota: 6, defeitos }, ...(semImpressao ? {} : { impressaoDasPartes: daRodada }) }; },
        malhaDaReceita: async () => { pedidos.push(['malha']); if (deAgora instanceof Error) throw deAgora; return malha(deAgora); },
      },
    };
  };
  const impressaoDe = (partes) => impressaoDasPartesDaReceita(resolve(PECA), { malha: async () => malha(partes) });

  it('sem opção sai o padrão: as seis vistas, o arame de três quartos, o raio X de trás e, sem rodada julgada, todas as partes, com o aviso', async () => {
    const { resultado, capturas, chamadas, pedido, manifesto } = await montar();
    expect(capturas).toEqual(['conjunto', 'traseira', 'esquerda', 'isometrica arame', 'traseira raio-x', 'bloco', 'viga']);
    /* as capturas da peça sozinha (as seis vistas, o arame e o raio X) pedem o quadro cheio, na resolução do conjunto; as das partes
       continuam com o foco, que já decide o quadro */
    expect(chamadas.map((c) => Boolean(c.enquadrar))).toEqual([true, true, true, true, true, false, false]);
    expect(chamadas.slice(0, 5).map((c) => c.res)).toEqual(Array(5).fill(chamadas[0].res));
    expect(chamadas.slice(5).every((c) => c.focar === true)).toBe(true);
    expect(resultado.tipo).toBe(PACOTE_PADRAO);
    expect(resultado.baseDasPartes).toBeNull();
    expect(resultado.partesComVista).toEqual([{ nome: 'bloco', porque: 'sem-base' }, { nome: 'viga', porque: 'sem-base' }]);
    expect(resultado.avisos).toContain('todas as partes levam vista isolada: a peça não tem rodada julgada pelo crítico, e não há com que comparar a malha de cada parte.');
    expect(pedido).toContain('- a vista isolada de todas as partes (2)\n');
    expect(pedido).toContain('- a malha em arame na vista traseira, porque o raio X da mesma vista mostra as mesmas arestas');
    /* 6 da peça, 2 da malha, 4 das duas partes e o alvo: o que o crítico abre */
    expect(resultado.imagensNoPedido).toBe(13);
    expect(imagensCitadas(pedido)).toHaveLength(13);
    expect(manifesto.pacote).toEqual({ tipo: PACOTE_PADRAO, partes: { comVista: resultado.partesComVista, semVista: [], comparadasComARodada: null } });
    /* a impressão das partes da receita de prova, executada de verdade, vai ao pacote.json: é o que o registro do veredito confere */
    expect(ehImpressaoDasPartes(manifesto.impressaoDasPartes)).toBe(true);
    expect(manifesto.impressaoDasPartes).toEqual(await impressaoDasPartesDaReceita(resolve(PECA)));
    expect(Object.keys(manifesto.impressaoDasPartes.malhas)).toEqual(['bloco', 'viga']);
    expect(resultado.impressaoDasPartes).toEqual(manifesto.impressaoDasPartes);
    const relatorio = imprimir(resultado);
    expect(relatorio).toContain('  todas as 2 partes levam vista isolada: a peça não tem rodada julgada pelo crítico.');
    expect(relatorio).toContain(`  PACOTE PADRÃO: o pedido cita 13 imagens e diz o que entrou e o que ficou de fora; o pacote completo, com todas as vistas e a vista isolada de todas as partes: \`${comandoDoCompleto(PECA)}\``);
    expect(relatorio).toMatch(/ {2}TEMPO: \d+,\d s \(medição \d+,\d s, comparação das partes \d+,\d s, capturas da bancada \d+,\d s\)/);
  }, 60_000);

  it('com rodada julgada, só a parte de malha diferente da impressão gravada leva vista isolada; o relatório e o pacote.json dizem por quê, e o pedido não', async () => {
    const base = comBase(await impressaoDe({ bloco: [70, 0], viga: [30, 6] }));
    const { resultado, capturas, pedido, manifesto, pasta } = await montar({ dependencias: base.dependencias });
    expect(base.pedidos).toEqual([['malha'], ['julgada', 'rodadas'], ['registro', 2]]);
    expect(capturas).toEqual(['conjunto', 'traseira', 'esquerda', 'isometrica arame', 'traseira raio-x', 'viga']);
    expect(resultado.baseDasPartes).toBe(2);
    expect(resultado.partesComVista).toEqual([{ nome: 'viga', porque: 'malha' }]);
    expect(resultado.partesSemVista).toEqual(['bloco']);
    expect(resultado.avisos.join('\n')).not.toContain('todas as partes levam vista isolada');
    expect(pedido).toContain('- a vista isolada da parte `viga`\n');
    expect(pedido).toContain('- a vista isolada da parte `bloco`, que aparece nas vistas da peça inteira\n');
    expect(pedido).toContain('### viga');
    expect(pedido).not.toContain('### bloco');
    /* o pedido não cita a rodada nem conta a história: isso fica no relatório de quem conduz e no pacote.json */
    expect(pedido.slice(pedido.indexOf('Este pedido traz'), pedido.indexOf('## Objeto'))).not.toMatch(HISTORIA);
    expect(pedido.slice(pedido.indexOf('## Partes'), pedido.indexOf('### viga')).split('\n').slice(0, 3).join('\n')).not.toMatch(HISTORIA);
    expect(manifesto.pacote).toEqual({ tipo: PACOTE_PADRAO, partes: { comVista: [{ nome: 'viga', porque: 'malha' }], semVista: ['bloco'], comparadasComARodada: 2 } });
    expect(manifesto.impressaoDasPartes).toEqual(await impressaoDe({ bloco: [1, 0], viga: [10, 5] }));
    const relatorio = imprimir(resultado);
    expect(relatorio).toContain('  comparadas com a impressão das partes gravada na rodada 2, a última julgada pelo crítico: 1 de 2 partes levam vista isolada.');
    expect(relatorio).toContain('  com vista isolada: viga (a malha difere da gravada na rodada)');
    expect(relatorio).toContain('  sem vista isolada, com a malha e a promessa iguais às da rodada 2 e sem defeito apontado nela: bloco');
    /* a pergunta fechada da parte sem vista continua, e os dados gravados refazem o mesmo pedido */
    expect(JSON.parse(readFileSync(join(pasta, ARQUIVO_DAS_PERGUNTAS_FECHADAS), 'utf8')).perguntas.map((q) => q.origem)).toContain('parte:bloco');
    refazerPedidos(pasta);
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).toBe(pedido);
  }, 60_000);

  it('a mesma malha e a mesma promessa da rodada julgada: nenhuma vista isolada, e a seção das partes diz quais ficaram sem', async () => {
    const { capturas, pedido, resultado } = await montar({ dependencias: comBase(await impressaoDe({ bloco: [70, 0], viga: [30, 5] })).dependencias });
    expect(capturas).toEqual(['conjunto', 'traseira', 'esquerda', 'isometrica arame', 'traseira raio-x']);
    expect(resultado.porParte).toEqual([]);
    expect(pedido).toContain('Nenhuma parte tem vista isolada neste pedido. Sem vista isolada: `bloco`, `viga`.');
    expect(resultado.imagensNoPedido).toBe(9);
  }, 60_000);

  it('a parte citada num defeito do veredito da rodada julgada leva vista isolada mesmo com a malha e a promessa iguais', async () => {
    const igual = await impressaoDe({ bloco: [70, 0], viga: [30, 5] });
    const defeitos = [{ parte: 'bloco', tipo: 'superficie', onde: 'o topo', sentido: 'segmentado', evidencia: 'a luz rasante mostra degraus' }, { parte: 'bloco', tipo: 'posicao' }];
    const { capturas, pedido, resultado, manifesto } = await montar({ dependencias: comBase(igual, undefined, { defeitos }).dependencias });
    expect(capturas).toEqual(['conjunto', 'traseira', 'esquerda', 'isometrica arame', 'traseira raio-x', 'bloco']);
    expect(resultado.partesComVista).toEqual([{ nome: 'bloco', porque: 'defeito' }]);
    expect(resultado.partesSemVista).toEqual(['viga']);
    expect(manifesto.pacote.partes.comVista).toEqual([{ nome: 'bloco', porque: 'defeito' }]);
    expect(pedido).toContain('### bloco');
    expect(pedido).toContain('- a vista isolada da parte `bloco`\n');
    expect(pedido.slice(pedido.indexOf('Este pedido traz'), pedido.indexOf('## Objeto'))).not.toMatch(/defeito apontado|citad/);
    expect(imprimir(resultado)).toContain('  com vista isolada: bloco (o veredito da rodada a cita num defeito)');
  }, 60_000);

  it('com a rodada julgada que não gravou a impressão das partes, ou sem a impressão de agora, todas as partes entram e o aviso diz por quê', async () => {
    const igual = await impressaoDe({ bloco: [70, 0], viga: [30, 5] });
    const sem = await montar({ dependencias: comBase(igual, undefined, { semImpressao: true }).dependencias });
    expect(sem.capturas.slice(-2)).toEqual(['bloco', 'viga']);
    expect(sem.resultado.avisos).toContain('todas as partes levam vista isolada: o registro da rodada 2, a última julgada pelo crítico, não guarda a impressão das partes (o registro a grava desde 2026-11-26, com o veredito), e não há com que comparar a malha de cada parte.');
    expect(sem.resultado.baseDasPartes).toBeNull();
    expect(sem.resultado.partesComVista).toEqual([{ nome: 'bloco', porque: 'sem-base' }, { nome: 'viga', porque: 'sem-base' }]);
    /* a impressão gravada que não tem a forma certa vale como ausente */
    const torta = await montar({ dependencias: comBase({ malhas: igual.malhas }).dependencias });
    expect(torta.resultado.baseDasPartes).toBeNull();
    expect(torta.capturas.slice(-2)).toEqual(['bloco', 'viga']);
    /* o registro que não se lê também */
    const ilegivel = await montar({ dependencias: { ...comBase(igual).dependencias, registroDaRodada: () => null } });
    expect(ilegivel.resultado.baseDasPartes).toBeNull();
    const quebrada = await montar({ dependencias: comBase(igual, new Error('o passo 3 não existe mais\nsegunda linha')).dependencias });
    expect(quebrada.capturas.slice(-2)).toEqual(['bloco', 'viga']);
    expect(quebrada.resultado.avisos).toContain('não tirei a impressão das partes (o passo 3 não existe mais): o pacote.json sai sem ela, e a rodada que registrar este pacote não serve de base para escolher as partes do pacote seguinte.');
    expect(quebrada.resultado.avisos).toContain('todas as partes levam vista isolada: a receita de agora não deu a impressão das partes, e não há com que comparar a malha de cada parte.');
    expect(quebrada.manifesto.impressaoDasPartes).toBeNull();
  }, 120_000);

  it('só o módulo que a receita importa muda desde a rodada julgada: o texto da receita é o mesmo, e a parte de malha mudada leva vista isolada', async () => {
    /* duas pastas dentro do repositório (a receita não se resolve fora dele), com o mesmo `receita.js` e o `modulo.js` que dá o giro da
       viga: 'antes' é o que a rodada 2 julgou, 'depois' é a receita de agora. Nada é trocado na leitura das rodadas nem na execução. */
    const REPO = resolve('.');
    mkdirSync(join(REPO, 'tmp'), { recursive: true });
    const raiz = mkdtempSync(join(REPO, 'tmp', 'teste-do-pacote-'));
    try {
      for (const nome of ['andaime.json', 'bloco.formas.json']) copyFileSync(join(REPO, 'tools/fixtures/forma-do-esboco', nome), join(raiz, nome));
      cpSync(join(REPO, 'tools/fixtures/forma-do-esboco/alvos'), join(raiz, 'alvos'), { recursive: true });
      const TEXTO = `import { receitaDoBloco } from '${join(REPO, 'tools/fixtures/forma-do-esboco/suporte.js')}';\nimport { GRAUS } from './modulo.js';\n\nexport default receitaDoBloco({ graus: GRAUS });\n`;
      const versao = (nome, graus) => {
        mkdirSync(join(raiz, nome, 'rodadas'), { recursive: true });
        writeFileSync(join(raiz, nome, 'receita.js'), TEXTO);
        writeFileSync(join(raiz, nome, 'modulo.js'), `export const GRAUS = ${graus};\n`);
        return join(raiz, nome, 'receita.js');
      };
      const [antes, depois] = [versao('antes', 30), versao('depois', 25)];
      expect(readFileSync(depois, 'utf8')).toBe(readFileSync(antes, 'utf8'));
      const julgada = await impressaoDasPartesDaReceita(antes);
      /* a rodada 2, julgada, grava a impressão das partes; a cópia da receita dela também está lá, com o texto igual ao de agora */
      writeFileSync(join(raiz, 'depois', 'rodadas', 'rodada-02.json'), JSON.stringify({ numero: 2, veredito: { nota: 6, defeitos: [] }, impressaoDasPartes: julgada }));
      writeFileSync(join(raiz, 'depois', 'rodadas', 'receita-02.js'), TEXTO.replace("'./modulo.js'", "'../modulo.js'"));
      const peca = relative(REPO, depois);
      const base = mkdtempSync(join(area, 'modulo-'));
      const bancada = bancadaFalsa(base, peca);
      const resultado = await pacoteDoCritico(peca, {
        saida: join(base, 'rodada'), pastaDasCapturas: base,
        dependencias: { medirReceita: medirPassa, olharBancada: bancada.fazer, rodadasAnteriores: () => [], sobreposicaoDeCortes: async () => ({ arquivos: [], paineis: [], notas: [] }) },
      });
      expect(resultado.baseDasPartes).toBe(2);
      expect(resultado.partesComVista).toEqual([{ nome: 'viga', porque: 'malha' }]);
      expect(resultado.partesSemVista).toEqual(['bloco']);
      expect(bancada.chamadas.map((c) => c.selecionadas).filter(Boolean)).toEqual(['viga']);
      expect(partesQueDiferem(resultado.impressaoDasPartes, julgada)).toEqual(['viga']);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  }, 60_000);

  it('--completo monta o pacote de antes, sem olhar as rodadas, e o valor que não é sim nem não é recusado com o comando', async () => {
    const base = comBase(await impressaoDe({ bloco: [70, 0], viga: [30, 5] }));
    const { capturas, pedido, manifesto, resultado } = await montar({ completo: true, dependencias: base.dependencias });
    /* não olha as rodadas; a malha de agora é executada para a impressão das partes que vai ao pacote.json */
    expect(base.pedidos).toEqual([['malha']]);
    expect(manifesto.impressaoDasPartes).toEqual(await impressaoDe({ bloco: [1, 0], viga: [10, 5] }));
    expect(capturas).toEqual(['conjunto', 'traseira', 'esquerda', 'isometrica,traseira arame', 'traseira raio-x', 'bloco', 'viga']);
    expect(pedido).not.toContain('conjunto padrão');
    expect(manifesto.pacote).toEqual({ tipo: PACOTE_COMPLETO });
    expect(resultado.imagensNoPedido).toBe(14);
    expect(imprimir(resultado)).toContain('  PACOTE COMPLETO (--completo): o pedido cita 14 imagens.');
    await expect(pacoteDoCritico(PECA, { completo: 'sim', dependencias: { medirReceita: async () => { throw new Error('não devia medir'); } } })).rejects.toThrow(
      `'completo' recebido: "sim"; esperado true (o pacote completo) ou false (o padrão). Na linha de comando é a opção --completo, sem valor: \`npm run vistas:critica -- ${PECA} --completo\`.`,
    );
    expect(AJUDA).toContain('  --completo                                o pacote completo: todas as vistas e a vista isolada de todas as partes. Sem ela sai o pacote');
    const r = spawnSync(process.execPath, ['tools/modelar/vistas-para-critica.mjs', PECA, '--completo=sim'], { encoding: 'utf8' });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('[--completo]');
  }, 60_000);
});

describe('o pacote de uma receita que refina um esboço', () => {
  const PECA = 'tools/fixtures/forma-do-esboco/ok/receita.js';

  async function montar({ aoComposta = null } = {}) {
    const base = mkdtempSync(join(area, 'capturas-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const resultado = await vistasParaCritica(PECA, {
      saida: pasta,
      pastaDasCapturas: base,
      dependencias: { medirReceita: medirPassa,
        olharBancada: bancada.fazer,
        sobreposicaoDeCortes: async ({ saida }) => {
          const arquivos = ['x', 'y', 'z'].map((e) => { const a = join(saida, `sobreposicao-${e}.png`); writeFileSync(a, e); return a; });
          return { arquivos, paineis: [{ eixo: 'x', valor: 1, desvioMaximoMm: 1.25 }], notas: [] };
        },
        ...(aoComposta ?? {}),
      },
    });
    return { base, pasta, bancada, resultado };
  }

  it('grava o pedido na pasta da rodada, com as capturas de sempre, o alvo, a sobreposição e as partes do plano', async () => {
    const { pasta, bancada, resultado } = await montar();
    const pedido = readFileSync(join(pasta, 'pedido.md'), 'utf8');
    expect(resultado.pedido).toBe(join(pasta, 'pedido.md'));
    expect(titulos(pedido)).toEqual(['Objeto', 'Alvo', 'Referências', 'Modelo', 'Sobreposição', 'Partes', 'Critérios de reprovação', 'Perguntas', 'Veredito']);
    /* as capturas de hoje continuam, na mesma ordem: o conjunto, a traseira, a esquerda, o arame, o raio X e as vistas de cada parte */
    expect(bancada.chamadas.map((c) => (c.revisar ? 'conjunto' : c.selecionadas ?? `${c.vistas}${c.arame === 'raio-x' ? ' raio-x' : c.arame ? ' arame' : ''}`))).toEqual([
      'conjunto', 'traseira', 'esquerda', 'isometrica,traseira arame', 'traseira raio-x', 'bloco', 'viga',
    ]);
    for (const arquivo of [...resultado.conjunto.resultado.arquivos, ...resultado.traseira.resultado.arquivos, ...resultado.esquerda.resultado.arquivos]) {
      expect(pedido).toContain(arquivo);
    }
    for (const { resultado: r } of resultado.porParte) for (const arquivo of r.resultado.arquivos) expect(pedido).toContain(arquivo);
    for (const e of ['x', 'y', 'z']) expect(pedido).toContain(join(pasta, `sobreposicao-${e}.png`));
    expect(pedido).toContain('### bloco');
    expect(pedido).toContain('### viga');
    expect(pedido).toContain('Forma prometida: caixa de 200 por 100 por 120 mm com um furo passante de 60 mm de diâmetro');
    expect(pedido).toContain(`  1. ${PERGUNTA_DO_ALVO}`);
    /* os dois pedidos fechados saem ao lado, sobre as mesmas imagens, com as perguntas que a junção lê */
    expect(resultado.pedidosFechados.a).toBe(join(pasta, arquivoDoPedidoFechado('a')));
    const fechadoA = readFileSync(resultado.pedidosFechados.a, 'utf8');
    const fechadoB = readFileSync(resultado.pedidosFechados.b, 'utf8');
    for (const { resultado: r } of resultado.porParte) for (const arquivo of r.resultado.arquivos) { expect(fechadoA).toContain(arquivo); expect(fechadoB).toContain(arquivo); }
    const dado = JSON.parse(readFileSync(join(pasta, ARQUIVO_DAS_PERGUNTAS_FECHADAS), 'utf8'));
    expect(dado.formato).toBe(FORMATO_DAS_PERGUNTAS_FECHADAS);
    expect(dado.pedidos).toEqual({ a: resultado.pedidosFechados.a, b: resultado.pedidosFechados.b });
    /* a viga promete "caixa de 300 por 40 por 60 mm girada 30 graus em z, com o centro 400 mm acima do chão": duas afirmações sem medida */
    expect(dado.perguntas.map((q) => q.origem)).toEqual(['alvo', 'parte:bloco', 'parte:viga', 'parte:viga', 'criterio:1', 'criterio:2']);
    expect(dado.perguntas.filter((q) => q.origem === 'parte:viga').map((q) => [q.texto, q.peso])).toEqual([
      ['A parte `viga` mostra isto nas imagens: caixa girada em z?', 0.5], ['A parte `viga` mostra isto nas imagens: com o centro acima do chão?', 0.5],
    ]);
    expect(JSON.parse(readFileSync(join(pasta, ARQUIVO_DOS_DADOS_DO_PEDIDO), 'utf8')).dados.peca).toBe(resultado.peca);
  }, 60_000);

  it('o alvo é a composta guardada com as formas do esboço, copiada para a pasta da rodada, e a unidade é a nula porque nenhuma forma ligada declara unidade', async () => {
    const { pasta, resultado } = await montar();
    expect(resultado.alvo.unidade).toBeNull();
    expect(resultado.alvo.imagem).toBe(join(pasta, 'alvo', 'bloco-composta.png'));
    expect(readFileSync(resultado.alvo.imagem)).toEqual(readFileSync('tools/fixtures/forma-do-esboco/alvos/bloco-composta.png'));
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).toContain(`- ${resultado.alvo.imagem}`);
  }, 60_000);

  it('a peça que não é instância de montagem não tem vista montada, e o pedido não tem a seção', async () => {
    const { resultado, pasta } = await montar();
    expect(resultado.montada).toBeNull();
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).not.toContain('## Montado');
  }, 60_000);

  it('limpa o que a rodada anterior deixou na pasta e só isso: o que é de outro dono fica', async () => {
    const base = mkdtempSync(join(area, 'limpeza-'));
    const pasta = join(base, 'rodada');
    mkdirSync(join(pasta, 'alvo'), { recursive: true });
    for (const velho of ['pedido.md', 'pedido-fechado-b.md', 'perguntas-fechadas.json', 'etapas-x-frontal-orto.png', 'sobreposicao-q.png', 'alvo/velho.png', 'notas.txt']) writeFileSync(join(pasta, velho), 'velho');
    const bancada = bancadaFalsa(base, PECA);
    await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base,
      dependencias: { medirReceita: medirPassa,
        olharBancada: bancada.fazer,
        sobreposicaoDeCortes: async () => ({ arquivos: [], paineis: [], notas: [] }),
      },
    });
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).toContain('# Pedido ao crítico visual');
    expect(readFileSync(join(pasta, 'pedido-fechado-b.md'), 'utf8')).toContain('## Perguntas fechadas');
    expect(readFileSync(join(pasta, 'perguntas-fechadas.json'), 'utf8')).toContain(FORMATO_DAS_PERGUNTAS_FECHADAS);
    expect(existsSync(join(pasta, 'etapas-x-frontal-orto.png'))).toBe(false);
    expect(existsSync(join(pasta, 'sobreposicao-q.png'))).toBe(false);
    expect(existsSync(join(pasta, 'alvo', 'velho.png'))).toBe(false);
    expect(readFileSync(join(pasta, 'notas.txt'), 'utf8')).toBe('velho');
  }, 60_000);

  it('a captura que não deu imagem recusa alto, e não grava pedido', async () => {
    const base = mkdtempSync(join(area, 'falha-'));
    const pasta = join(base, 'rodada');
    await expect(vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base,
      dependencias: { medirReceita: medirPassa, olharBancada: async () => ({ ok: false, erro: { mensagem: 'a bancada caiu' }, resultado: { arquivos: [] } }) },
    })).rejects.toThrow(/a captura do conjunto não produziu imagem: a bancada caiu/);
    expect(existsSync(join(pasta, 'pedido.md'))).toBe(false);
  }, 60_000);

  it('abre a captura compartilhada uma vez, a passa a todas as chamadas e a fecha, e a recusa diz quantas imagens faltavam', async () => {
    const base = mkdtempSync(join(area, 'compartilhada-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const registro = { aberturas: 0, fechamentos: 0, recebidas: [] };
    const compartilhada = { async fechar() { registro.fechamentos += 1; } };
    let chamada = 0;
    const dependencias = { medirReceita: medirPassa,
      abrirCaptura: async () => { registro.aberturas += 1; return compartilhada; },
      olharBancada: async (opcoes) => {
        registro.recebidas.push(opcoes.compartilhada);
        chamada += 1;
        /* a quarta captura (a do arame) cai: as três primeiras já tinham saído */
        if (chamada === 4) return { ok: false, erro: { mensagem: 'prazo' }, resultado: { arquivos: [] } };
        return bancada.fazer(opcoes);
      },
    };
    await expect(vistasParaCritica(PECA, { saida: pasta, pastaDasCapturas: base, dependencias }))
      .rejects.toThrow(/a captura do arame não produziu imagem: prazo\. Do pacote, 6 de \d+ imagens já tinham saído e faltavam \d+/);
    expect(registro.aberturas).toBe(1);
    expect(registro.fechamentos).toBe(1);
    expect(registro.recebidas).toHaveLength(4);
    expect(registro.recebidas.every((c) => c === compartilhada)).toBe(true);
  }, 60_000);

  it('o prazo de carga dado ao pacote chega a toda captura', async () => {
    const base = mkdtempSync(join(area, 'prazo-'));
    const bancada = bancadaFalsa(base, PECA);
    const prazos = [];
    const dependencias = { medirReceita: medirPassa, olharBancada: async (opcoes) => { prazos.push(opcoes.prazoDeCargaMs); return bancada.fazer(opcoes); } };
    await vistasParaCritica(PECA, { saida: join(base, 'rodada'), pastaDasCapturas: base, prazoDeCargaMs: 300_000, dependencias });
    expect(prazos.length).toBeGreaterThan(3);
    expect(prazos.every((p) => p === 300_000)).toBe(true);
  }, 60_000);

  it('a opção que as formas guardadas não são recusa antes de gastar captura', async () => {
    const base = mkdtempSync(join(area, 'opcao-'));
    let capturou = false;
    await expect(vistasParaCritica(PECA, {
      saida: join(base, 'rodada'), pastaDasCapturas: base,
      dependencias: { medirReceita: medirPassa,
        olharBancada: async () => { capturou = true; },
        esbocoDeclarado: async () => ({
          esboco: join(process.cwd(), 'tools/fixtures/forma-do-esboco/bloco.formas.json'), opcao: 2, minimo: 0.9, ligadas: { bloco: ['bloco'] },
        }),
      },
    })).rejects.toThrow(/guarda a opção 1 \(Bloco e viga\) do esboço, e a declaração pede a opção 2/);
    expect(capturou).toBe(false);
  }, 60_000);

  it('a unidade sem composta guardada recusa antes de gastar captura, dizendo as que há', async () => {
    const base = mkdtempSync(join(area, 'sem-alvo-'));
    const bruto = JSON.parse(readFileSync('tools/fixtures/forma-do-esboco/bloco.formas.json', 'utf8'));
    const sem = join(base, 'bloco.formas.json');
    writeFileSync(sem, JSON.stringify({ ...bruto, alvos: {} }));
    let capturou = false;
    await expect(vistasParaCritica(PECA, {
      saida: join(base, 'rodada'), pastaDasCapturas: base,
      dependencias: { medirReceita: medirPassa,
        olharBancada: async () => { capturou = true; },
        esbocoDeclarado: async () => ({ esboco: sem, opcao: 1, minimo: 0.9, ligadas: { bloco: ['bloco'] } }),
      },
    })).rejects.toThrow(/não guardam a composta do esboço inteiro, que é o alvo do crítico desta peça \(guardadas: nenhuma\)/);
    expect(capturou).toBe(false);
  }, 60_000);
});

describe('o pacote de uma peça que é instância de uma montagem', () => {
  const PECA = 'aviao/motor';

  async function montar(olharEtapas, { completo = true, visibilidade = {}, cortes = null } = {}) {
    const base = mkdtempSync(join(area, 'montagem-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const pedidosDeEtapas = [];
    const pedidosDeCortes = [];
    const { esbocoDeclarado } = await import('./forma-do-esboco.mjs');
    const declarado = await esbocoDeclarado(PECA);
    const ids = Object.values(declarado.ligadas).flatMap((v) => (Array.isArray(v) ? v : v.formas));
    const resultado = await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base, completo,
      dependencias: { medirReceita: medirPassa, ultimaRodadaJulgada: () => null,
        olharBancada: bancada.fazer,
        sobreposicaoDeCortes: async () => ({ arquivos: [], paineis: [], notas: [] }),
        olharEtapas: async (arquivo, opcoes) => { pedidosDeEtapas.push({ arquivo, opcoes }); return olharEtapas(arquivo, opcoes); },
        /* os cortes resolvem a montagem inteira; aqui um gravador diz a quem foram pedidos */
        cortesDosEncaixes: async (pedido) => {
          pedidosDeCortes.push(pedido);
          if (cortes) return cortes(pedido);
          const arquivo = join(pedido.pasta, `corte-${pedido.montagem.instancia}-fuselagem.png`);
          writeFileSync(arquivo, 'corte');
          return { cortes: [{ arquivo, vizinha: 'fuselagem', origens: ['posição motorNaFuselagem'], folgaMm: 0.5, folgaNoCorteMm: 0.5, cruzam: false, plano: 'x = 1,0 mm, visto de +x (direita da imagem -z, cima +y)', declarado: false }], aviso: null };
        },
        rodadasAnteriores: () => [],
        visibilidadeDoFoco: async () => visibilidade,
      },
    });
    return { pasta, resultado, pedidosDeEtapas, pedidosDeCortes, ids };
  }

  it('no pacote padrão pede só as duas vistas montadas em que a peça mais aparece e o corte de menor folga, e o pedido diz o que ficou de fora', async () => {
    const olhar = async (arquivo, opcoes) => {
      const arquivos = opcoes.vistas.map((vista) => { const a = join(opcoes.saida, `etapas-aviao-${vista}-orto-foco-motor.png`); writeFileSync(a, vista); return a; });
      return { construidas: ['fuselagem', 'motor'], arquivos, enquadramentos: opcoes.vistas.map((vista) => ({ vista, largura: 0.61, altura: 0.833, cortado: false })), foco: ['motor'] };
    };
    const visibilidade = { isometrica: 0.4, frontal: 0.3, traseira: 0, direita: 0.8, esquerda: 0.01, superior: 0.5, inferior: 0.5 };
    const cortes = async (pedido) => {
      const arquivo = join(pedido.pasta, 'corte-motor-fuselagem.png');
      writeFileSync(arquivo, 'corte');
      return { cortes: [{ arquivo, vizinha: 'fuselagem', origens: ['posição'], folgaMm: 0.5, folgaNoCorteMm: 0.5, cruzam: false, plano: 'x = 1,0 mm', declarado: false }], fora: [{ vizinha: 'asas', folgaMm: 3 }, { vizinha: 'helice', folgaMm: 7 }], limiarMm: 0.5, aviso: null };
    };
    const { pasta, resultado, pedidosDeEtapas, pedidosDeCortes } = await montar(olhar, { completo: false, visibilidade, cortes });
    expect(MONTADAS_DO_PADRAO).toBe(2);
    expect(pedidosDeEtapas).toHaveLength(1);
    expect(pedidosDeEtapas[0].opcoes.vistas).toEqual(['isometrica', 'direita']);
    expect(pedidosDeCortes[0].padrao).toBe(true);
    const pedido = readFileSync(join(pasta, 'pedido.md'), 'utf8');
    expect(pedido).toContain('- as vistas montadas isometrica e direita, as em que mais da peça aparece entre as outras, para o contexto e a posição');
    expect(pedido).toContain('- as vistas montadas frontal, traseira, esquerda, superior e inferior, em que aparece menos da peça ou ela fica tapada');
    expect(pedido).toContain('- o corte do encaixe com `fuselagem`: todo encaixe com folga até 0,50 mm, onde um cruzamento ou uma peça solta aparece primeiro');
    expect(pedido).toContain('- os cortes dos encaixes com `asas` e `helice`, de folga maior que 0,50 mm');
    const montado = pedido.slice(pedido.indexOf('## Montado'), pedido.indexOf('## Encaixes em corte'));
    expect(imagensCitadas(montado).map((a) => basename(a))).toEqual(['etapas-aviao-isometrica-orto-foco-motor.png', 'etapas-aviao-direita-orto-foco-motor.png']);
    expect(resultado.tipo).toBe(PACOTE_PADRAO);
    /* o completo pede as sete e não limita os cortes */
    const inteiro = await montar(olhar, { completo: true, visibilidade });
    expect(inteiro.pedidosDeEtapas[0].opcoes.vistas).toEqual(VISTAS_MONTADAS);
    expect(inteiro.pedidosDeCortes[0]).not.toHaveProperty('padrao');
    expect(readFileSync(join(inteiro.pasta, 'pedido.md'), 'utf8')).not.toContain('conjunto padrão');
  }, 120_000);

  it('no pacote padrão, a peça tapada em todas as vistas montadas não gasta captura montada, e o relatório avisa', async () => {
    const tapada = Object.fromEntries(VISTAS_MONTADAS.map((v) => [v, 0]));
    const { resultado, pedidosDeEtapas, pasta } = await montar(async () => { throw new Error('não devia capturar'); }, { completo: false, visibilidade: tapada });
    expect(pedidosDeEtapas).toHaveLength(0);
    expect(resultado.montada).toBeNull();
    expect(resultado.avisos.join('\n')).toContain("sem vista montada: as outras peças tapam 'motor' em todas as vistas (menos de 5,0 % da silhueta dela visível).");
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).not.toContain('## Montado');
  }, 60_000);

  it('pede as vistas montadas com o quadro na instância, na pasta da rodada, e põe no pedido o que o enquadramento diz', async () => {
    const { pasta, resultado, pedidosDeEtapas, pedidosDeCortes } = await montar(async (arquivo, opcoes) => {
      const arquivos = opcoes.vistas.map((vista) => { const a = join(opcoes.saida, `etapas-aviao-${vista}-orto-foco-motor.png`); writeFileSync(a, vista); return a; });
      return { construidas: ['fuselagem', 'motor'], arquivos, enquadramentos: opcoes.vistas.map((vista) => ({ vista, largura: 0.61, altura: 0.833, cortado: false })), foco: ['motor'] };
    });
    expect(pedidosDeEtapas).toHaveLength(1);
    expect(pedidosDeEtapas[0].arquivo.replaceAll('\\', '/')).toMatch(/procedural\/pecas\/aviao\/montagem\.json$/);
    expect(pedidosDeEtapas[0].opcoes).toMatchObject({ foco: 'motor', saida: pasta, vistas: VISTAS_MONTADAS, largura: 1200, altura: 1000, timeoutMs: PRAZO_DA_CAPTURA_MONTADA_MS });
    expect(VISTAS_MONTADAS).toEqual(['isometrica', 'frontal', 'traseira', 'direita', 'esquerda', 'superior', 'inferior']);
    const pedido = readFileSync(join(pasta, 'pedido.md'), 'utf8');
    const montado = pedido.slice(pedido.indexOf('## Montado'), pedido.indexOf('## Partes'));
    expect(montado).toContain('com a peça `motor` no centro do quadro');
    for (const vista of VISTAS_MONTADAS) expect(montado).toContain(`- ${vista}: ${join(pasta, `etapas-aviao-${vista}-orto-foco-motor.png`)}`);
    expect(resultado.montada.instancia).toBe('motor');
    /* os cortes nos encaixes são pedidos para a instância, na pasta da rodada, e o pedido os lista depois do montado */
    expect(pedidosDeCortes).toHaveLength(1);
    expect(pedidosDeCortes[0]).toMatchObject({ pasta, montagem: { instancia: 'motor' }, cortesDeclarados: [] });
    expect(titulos(pedido)).toContain('Encaixes em corte');
    expect(titulos(pedido).indexOf('Encaixes em corte')).toBe(titulos(pedido).indexOf('Montado') + 1);
    expect(pedido).toContain(`- com \`fuselagem\` (posição motorNaFuselagem): folga de 0,50 mm no corte, 0,50 mm entre as malhas; sem contato declarado para o par: todo cruzamento ou toque entre as duas é achado; plano x = 1,0 mm, visto de +x (direita da imagem -z, cima +y): ${join(pasta, 'corte-motor-fuselagem.png')}`);
    expect(resultado.encaixes).toHaveLength(1);
  }, 60_000);

  it('a unidade do alvo é a das formas ligadas, e o alvo é a composta guardada dela', async () => {
    const { resultado, ids } = await montar(async () => { const e = new Error('sem montado'); e.codigo = 'foco-fora-das-etapas'; throw e; });
    expect(ids.length).toBeGreaterThan(0);
    expect(resultado.alvo.unidade).toBe('motor');
    expect(basename(resultado.alvo.imagem)).toBe('motor-composta.png');
    expect(readFileSync(resultado.alvo.imagem)).toEqual(readFileSync('procedural/pecas/aviao/alvos/motor-composta.png'));
  }, 60_000);

  it('a peça fora das etapas já construídas segue sem vista montada, com o aviso no relatório e sem a seção no pedido', async () => {
    const { pasta, resultado } = await montar(async () => { const e = new Error("a instância 'motor' não está entre as etapas já construídas"); e.codigo = 'foco-fora-das-etapas'; throw e; });
    expect(resultado.montada).toBeNull();
    expect(resultado.avisos).toEqual(["sem vista montada: a instância 'motor' não está entre as etapas já construídas"]);
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).not.toContain('## Montado');
    expect(readdirSync(pasta).filter((n) => n.startsWith('etapas-'))).toEqual([]);
  }, 60_000);

  it('outra falha da vista montada recusa alto', async () => {
    await expect(montar(async () => { throw new Error('o visor caiu'); })).rejects.toThrow(/o visor caiu/);
  }, 60_000);
});

describe('afastamentos declarados no pedido', () => {
  it('lista as partes afastadas do esboço de propósito, com o motivo, e cala as que não se afastam', async () => {
    const { afastamentosDeclarados, montarPedido } = await import('./vistas-para-critica.mjs');
    const declarado = { ligadas: { roda: { formas: ['roda'], deslocamento: [0, -17, 0], motivo: 'a roda encosta no chão' }, perna: 'perna', pistao: { formas: ['pistao'], minimo: 0.84, alongamento: { '-y': 17 }, motivo: 'o pistão alonga até o chão' } } };
    const afastamentos = afastamentosDeclarados(declarado);
    expect(afastamentos.map((a) => a.parte)).toEqual(['pistao', 'roda']);
    expect(afastamentos[1].texto).toBe('deslocada [0, -17, 0] mm; motivo: a roda encosta no chão');
    const pedido = montarPedido({ peca: 'x/y', alvo: { imagem: '/alvo.png', unidade: 'y' }, afastamentos });
    expect(pedido).toContain('se afastam do alvo de propósito');
    expect(pedido).toContain('- roda: deslocada [0, -17, 0] mm; motivo: a roda encosta no chão');
    expect(afastamentosDeclarados(null)).toEqual([]);
    expect(montarPedido({ peca: 'x/y', alvo: { imagem: '/alvo.png', unidade: 'y' } })).not.toContain('de propósito');
  });
});

describe('partes novas no pedido', () => {
  it('lista a parte de REFINA.novas com o motivo', async () => {
    const { novasDeclaradas } = await import('./vistas-para-critica.mjs');
    expect(novasDeclaradas({ REFINA: { novas: { casulo: 'a pessoa pediu o casulo da referência' } } }))
      .toEqual([{ parte: 'casulo', texto: 'parte nova, que o alvo não tem; motivo: a pessoa pediu o casulo da referência' }]);
    expect(novasDeclaradas({ REFINA: {} })).toEqual([]);
  });
});

/* ---------- a referência que vale para cada vista ---------- */

describe('a referência que vale para cada vista do modelo', () => {
  const VISTAS = ['isometrica', 'frontal', 'direita', 'esquerda', 'traseira', 'superior'];
  const modelo = VISTAS.map((vista) => ({ arquivo: `/o/m-${vista}.png`, vista }));
  const referencias = [{ caminho: '/r/frente.ia.png' }, { caminho: '/r/tras.ia.png' }, { caminho: '/r/cima.ia.png' }];
  const trecho = (pedido) => pedido.slice(pedido.indexOf('A referência que vale para cada vista'), pedido.indexOf('## Modelo'));

  it('o lado de uma referência sai das palavras do nome, e nome com dois lados ou nenhum não diz', async () => {
    const { ladoDoNome } = await import('./vistas-para-critica.mjs');
    expect(['frente.ia.png', 'carcaca-tras.ia.png', 'carcaca-lado.ia.png', 'cima.ia.png', 'Vista_Lateral.png', 'topo.jpg'].map(ladoDoNome))
      .toEqual(['frontal', 'traseira', 'lateral', 'superior', 'lateral', 'superior']);
    expect(['maquete.png', 'frente-e-tras.png', 'bilateral.png'].map(ladoDoNome)).toEqual([null, null, null]);
  });

  it('cada vista diz a referência do mesmo lado, a do lado oposto só para o contorno, e a vista de lado sem referência de lado não se compara com as de frente e de trás', () => {
    const texto = trecho(montarPedido({ peca: 'x/y', referencias, modelo }));
    expect(texto).toContain('Compare cada vista só com a referência que olha do mesmo lado');
    expect(texto).toContain('- frontal: compare com `frente.ia.png`; `tras.ia.png` olha do lado oposto e vale só para o contorno, espelhado');
    expect(texto).toContain('- traseira: compare com `tras.ia.png`; `frente.ia.png` olha do lado oposto');
    expect(texto).toContain('- superior: compare com `cima.ia.png`.');
    expect(texto).toContain('- direita: nenhuma referência olha deste lado; não compare esta vista com as referências de outro lado.');
    expect(texto).toContain('- isometrica: nenhuma referência olha deste lado; use esta vista para a forma em volume');
  });

  it('a referência de lado vale para a vista de lado, e a orientação do esboço põe a de frente na vista que olha a frente do objeto', () => {
    const texto = trecho(montarPedido({ peca: 'x/y', orientacao: ORIENTACAO, referencias: [...referencias, { caminho: '/r/lado.png' }], modelo }));
    expect(texto).toContain('- esquerda: compare com `lado.png`.');
    expect(texto).toContain('- direita: `lado.png` olha do lado oposto');
    /* a frente do objeto em -z: a foto de frente é a da vista traseira da bancada */
    expect(texto).toContain('- traseira: compare com `frente.ia.png`');
  });

  it('o lado declarado vale mais que o nome', () => {
    const texto = trecho(montarPedido({ peca: 'x/y', referencias: [{ caminho: '/r/foto-1.png', lado: 'direita' }], modelo }));
    expect(texto).toContain('- direita: compare com `foto-1.png`.');
    expect(montarPedido({ peca: 'x/y', referencias: [{ caminho: '/r/foto-1.png', lado: 'direita' }], modelo })).toContain('foto-1.png: /r/foto-1.png (o olho da imagem: olha de +x');
  });

  it('com contornos em mm de um lado, o pedido diz que a medida daquele lado vem deles', () => {
    const contornos = [{ arquivo: '/r/lateral.contornos.json', lado: 'lateral', deImagem: null }];
    const texto = trecho(montarPedido({ peca: 'x/y', referencias, contornos, modelo }));
    expect(texto).toContain('- direita: nenhuma imagem do pacote olha deste lado, e a referência dele são os contornos em mm de `lateral.contornos.json`, tirados de uma imagem deste lado que não vai no pacote: a medida deste lado vem deles, e não da proporção de uma imagem; não compare esta vista com as imagens de outro lado.');
    const comImagem = trecho(montarPedido({
      peca: 'x/y', referencias: [{ caminho: '/r/carcaca-lado.ia.png' }], contornos: [{ arquivo: '/r/carcaca-lado.ia.contornos.json', lado: 'lateral', deImagem: '/r/carcaca-lado.ia.png' }], modelo,
    }));
    expect(comImagem).toContain('- esquerda: compare com `carcaca-lado.ia.png`; a medida deste lado vem dos contornos em mm de `carcaca-lado.ia.contornos.json`, tirados de `carcaca-lado.ia.png`, e não da proporção da imagem.');
  });

  it('os contornos são os citados, os que acompanham uma imagem citada e os sem imagem na pasta das imagens, com o lado no nome', async () => {
    const { contornosDasReferencias } = await import('./vistas-para-critica.mjs');
    const pasta = mkdtempSync(join(area, 'refs-'));
    for (const nome of ['carcaca-lado.ia.png', 'carcaca-lado.ia.contornos.json', 'lateral.contornos.json', 'cima.ia.png', 'frente.ia.png', 'frente.ia.contornos.json', 'maquete.contornos.json']) writeFileSync(join(pasta, nome), '{}');
    const outra = mkdtempSync(join(area, 'citada-'));
    writeFileSync(join(outra, 'topo.contornos.json'), '{}');
    const achados = contornosDasReferencias({ imagens: [join(pasta, 'carcaca-lado.ia.png'), join(pasta, 'cima.ia.png')], citadas: [join(outra, 'topo.contornos.json')] });
    expect(achados).toEqual([
      { arquivo: join(outra, 'topo.contornos.json'), lado: 'superior', deImagem: null },
      { arquivo: join(pasta, 'carcaca-lado.ia.contornos.json'), lado: 'lateral', deImagem: join(pasta, 'carcaca-lado.ia.png') },
      { arquivo: join(pasta, 'lateral.contornos.json'), lado: 'lateral', deImagem: null },
    ]);
  });

  it('CRITICA declara o lado de uma referência e o plano de um corte, e recusa o que não entende', async () => {
    const { lerCritica } = await import('./vistas-para-critica.mjs');
    expect(lerCritica(undefined)).toEqual({ referencias: {}, cortes: [] });
    const corte = { vizinha: 'carcaca', ponto: [0, 400, 50], normal: [1, 0, 0], motivo: 'o plano da chapa do chassi' };
    expect(lerCritica({ referencias: { 'foto.png': 'lateral' }, cortes: [corte] })).toEqual({ referencias: { 'foto.png': 'lateral' }, cortes: [corte] });
    expect(() => lerCritica({ referencias: { 'foto.png': 'de lado' } })).toThrow(/lado 'de lado' desconhecido/);
    expect(() => lerCritica({ cortes: [{ ...corte, normal: [0, 0, 0] }] })).toThrow(/normal' não nula/);
    expect(() => lerCritica({ cortes: [{ ...corte, motivo: 'x' }] })).toThrow(/motivo/);
    expect(() => lerCritica({ outra: 1 })).toThrow(/campo desconhecido 'outra'/);
    expect(lerCritica({ pranchas: { 'superior.prancha.svg': { girar: 90 } } }).pranchas).toEqual({ 'superior.prancha.svg': { girar: 90 } });
    expect(() => lerCritica({ pranchas: { 'x.prancha.svg': { girar: 45 } } })).toThrow(/aceita só \{ girar/);
  });
});

/* ---------- os pontos que rodadas anteriores já atribuíram ---------- */

describe('os pontos já atribuídos em rodadas anteriores', () => {
  const RODADAS = [
    { numero: 2, atrito: [
      'rodada 2, cubo liso sem porca: atribuido ao plano; o PLANO promete flange e tampa',
      'o relato do modelador desta rodada veio em prosa, e a rodada foi montada a mao',
    ] },
    { numero: 1, atrito: [
      'rodada 1, assento curto e deslocado: a junta medida passa; atribuido a ferramenta, a vista montada nao mostra o entalhe',
      'rodada 1, contorno em 48 lados: atribuido ao modelador, vai a rodada 2',
      'rodada 1, pino ausente no nicho: atribuído ao crítico',
      'familia roda-pneu limita o ombro a 9 mm',
      { nao: 'texto' },
    ] },
  ];

  it('levam só as frases atribuídas ao plano, à ferramenta ou ao crítico, na ordem das rodadas, e nada do que o modelador mudou', async () => {
    const { pontosJaAtribuidos } = await import('./vistas-para-critica.mjs');
    expect(pontosJaAtribuidos(RODADAS)).toEqual([
      { numero: 1, atribuicoes: ['ferramenta'], texto: RODADAS[1].atrito[0] },
      { numero: 1, atribuicoes: ['critico'], texto: RODADAS[1].atrito[2] },
      { numero: 2, atribuicoes: ['plano'], texto: RODADAS[0].atrito[0] },
    ]);
    expect(pontosJaAtribuidos([])).toEqual([]);
  });

  it('o pedido os lista numa seção curta antes do veredito, pede evidência nova para repetir e não traz a frase do modelador', async () => {
    const { pontosJaAtribuidos } = await import('./vistas-para-critica.mjs');
    const pedido = montarPedido({ ...DADOS, anteriores: pontosJaAtribuidos(RODADAS) });
    expect(titulos(pedido).slice(-2)).toEqual(['Pontos já atribuídos', 'Veredito']);
    const secao = pedido.slice(pedido.indexOf('## Pontos já atribuídos'), pedido.indexOf('## Veredito'));
    expect(secao).toContain('Não os repita como defeito sem evidência nova numa imagem deste pacote');
    expect(secao).toContain('- rodada 1, atribuído à ferramenta: assento curto e deslocado: a junta medida passa; atribuido a ferramenta, a vista montada nao mostra o entalhe');
    expect(secao).toContain('- rodada 1, atribuído ao crítico: pino ausente no nicho: atribuído ao crítico');
    expect(secao).toContain('- rodada 2, atribuído ao plano: cubo liso sem porca');
    expect(secao).not.toMatch(/48 lados|modelador|ombro/);
    expect(montarPedido(DADOS)).not.toContain('## Pontos já atribuídos');
  });

  it('os registros saem da pasta das rodadas, e o ilegível fica fora', async () => {
    const { rodadasDaPasta } = await import('./vistas-para-critica.mjs');
    const pasta = mkdtempSync(join(area, 'rodadas-'));
    writeFileSync(join(pasta, 'rodada-01.json'), JSON.stringify({ numero: 1, atrito: ['a'] }));
    writeFileSync(join(pasta, 'rodada-02.json'), '{ quebrado');
    writeFileSync(join(pasta, 'receita-01.js'), '');
    expect(rodadasDaPasta(pasta)).toEqual([{ numero: 1, atrito: ['a'] }]);
    expect(rodadasDaPasta(join(pasta, 'nao-existe'))).toEqual([]);
  });
});

/* ---------- a vista em corte nos encaixes ---------- */

/* Uma caixa fechada como peça neutra, em metro: seis faces quadradas, com as normais para fora. */
function caixaNeutra([x0, y0, z0], [x1, y1, z1], parte = 'corpo') {
  const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
  const faces = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 4, 7, 3]];
  return { V: new Map(v.map((p, i) => [i, p])), F: new Map(faces.map((vs, i) => [i, { id: i, vs, parte }])) };
}
const POSE = { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0, 0] };
const folha = (id, neutro, pose = POSE) => ({ caminho: [id], neutro, pose });

describe('a vista em corte nos encaixes', () => {
  /* a peça, um bloco de 100 mm, e uma tampa 0,5 mm acima dela; uma viga ao lado, a 40 mm, longe do alcance; um pino que entra 2 mm */
  const bloco = caixaNeutra([0, 0, 0], [0.1, 0.1, 0.1]);
  const tampa = caixaNeutra([0, 0.1005, 0], [0.1, 0.12, 0.1]);
  const viga = caixaNeutra([0.14, 0, 0], [0.2, 0.1, 0.1]);
  const pino = caixaNeutra([0.04, -0.03, 0.04], [0.06, 0.002, 0.06]);

  it('os dois pontos mais próximos dão a folga, e o plano contém a direção entre eles no plano de eixo mais perto', async () => {
    const { maisPerto, planoDoEncaixe, triangulosNoMundo, textoDoPlano } = await import('./vistas-para-critica.mjs');
    const perto = maisPerto(triangulosNoMundo(bloco, POSE), triangulosNoMundo(tampa, POSE));
    expect(perto.folgaMm).toBeCloseTo(0.5, 6);
    expect(perto.naPeca[1]).toBeCloseTo(100, 6);
    expect(perto.naVizinha[1]).toBeCloseTo(100.5, 6);
    const plano = planoDoEncaixe(perto);
    expect(plano.eixo).toBe('x');
    expect(plano.ponto[1]).toBeCloseTo(100.25, 6);
    expect(textoDoPlano(plano)).toMatch(/^x = \d+,\d mm, visto de \+x \(direita da imagem -z, cima \+y\)$/);
    expect(maisPerto(triangulosNoMundo(bloco, POSE), triangulosNoMundo(viga, POSE))).toBeNull();
  });

  it('a direção oblíqua dá um plano oblíquo que a contém', async () => {
    const { planoDoEncaixe } = await import('./vistas-para-critica.mjs');
    const plano = planoDoEncaixe({ folgaMm: 1, naPeca: [0, 0, 0], naVizinha: [Math.SQRT1_2, Math.SQRT1_2, 0], normal: [0, 1, 0] });
    /* z é o eixo mais perpendicular à direção, e o plano de normal z já a contém */
    expect(plano.eixo).toBe('z');
    const torto = planoDoEncaixe({ folgaMm: 1, naPeca: [0, 0, 0], naVizinha: [0.6, 0.6, 0.529], normal: [0, 1, 0] });
    expect(torto.eixo).toBeNull();
    const d = [0.6, 0.6, 0.529];
    expect(Math.abs(torto.normal.reduce((s, c, i) => s + c * d[i], 0))).toBeLessThan(1e-9);
  });

  it('o corte dá a folga entre as duas seções, e a peça que entra na outra sai como cruzamento', async () => {
    const { planoDoEncaixe, planoQueCorta, maisPerto, triangulosNoMundo } = await import('./vistas-para-critica.mjs');
    const A = triangulosNoMundo(bloco, POSE);
    const T = triangulosNoMundo(tampa, POSE);
    const { folga, daPeca, daVizinha } = planoQueCorta(planoDoEncaixe(maisPerto(A, T)), A, T, 50);
    expect(daPeca.length).toBeGreaterThan(0);
    expect(daVizinha.length).toBeGreaterThan(0);
    expect(folga.cruzam).toBe(false);
    expect(folga.folgaMm).toBeCloseTo(0.5, 6);
    /* o pino fura a face de baixo do bloco: a aresta dele cruza a face, e a folga é zero */
    const P = triangulosNoMundo(pino, POSE);
    const perto = maisPerto(A, P);
    expect(perto.folgaMm).toBe(0);
    expect(planoQueCorta(planoDoEncaixe(perto), A, P, 50).folga).toMatchObject({ cruzam: true, folgaMm: 0 });
  });

  it('os encaixes são as vizinhas declaradas ou ao alcance, os de menor folga primeiro e no máximo quatro, com o plano declarado quando há', async () => {
    const { encaixesDaPeca, vizinhasDeclaradas } = await import('./vistas-para-critica.mjs');
    const dado = {
      relacoes: [{ id: 'pinoNoBloco', tipo: 'encaixaCilindrico', referencia: { caminho: ['bloco'] }, movel: { caminho: ['pino'] } }],
      posicoes: [{ id: 'tampaNoBloco', instancia: 'tampa', em: { instancia: 'bloco' } }, { id: 'vigaNoChao', instancia: 'viga', em: { instancia: 'chao' } }],
      vinculos: [{ id: 'larguraDaTampa', alvo: { instancia: 'tampa' }, de: { instancia: 'bloco' } }],
      auditoriaIntersecoes: { expectativas: [{ id: 'pinoEntra', a: { caminho: ['pino'] }, b: { caminho: ['bloco'] } }] },
    };
    const declaradas = vizinhasDeclaradas(dado, 'bloco');
    expect([...declaradas.entries()]).toEqual([
      ['pino', ['relação pinoNoBloco (encaixaCilindrico)', 'contato declarado pinoEntra']],
      ['tampa', ['posição tampaNoBloco', 'vínculo larguraDaTampa']],
    ]);
    const folhas = [folha('bloco', bloco), folha('tampa', tampa), folha('viga', viga), folha('pino', pino), folha('lado', caixaNeutra([0.1 + 0.003, 0, 0], [0.13, 0.05, 0.05]))];
    const encaixes = encaixesDaPeca({ folhas, instancia: 'bloco', declaradas });
    expect(encaixes.map((e) => [e.vizinha, Number(e.folgaMm.toFixed(3))])).toEqual([['pino', 0], ['tampa', 0.5], ['lado', 3]]);
    expect(encaixes[2].origens).toEqual(['a menos de 25 mm, sem declaração na montagem']);
    expect(encaixesDaPeca({ folhas, instancia: 'bloco', declaradas, limite: 2 })).toHaveLength(2);
    /* o plano declarado manda: um corte em z pela tampa */
    const [declarado] = encaixesDaPeca({ folhas: folhas.slice(0, 2), instancia: 'bloco', cortesDeclarados: [{ vizinha: 'tampa', ponto: [50, 100, 50], normal: [0, 0, 1], motivo: 'o plano do meio da tampa' }] });
    expect(declarado).toMatchObject({ vizinha: 'tampa', declarado: true, plano: { eixo: 'z' } });
    expect(declarado.folga.folgaMm).toBeCloseTo(0.5, 6);
  });

  it('no pacote padrão entram todos os encaixes que encostam ou cruzam e os declarados, e o empate de folga não tira nenhum', async () => {
    const { encaixesDaPeca } = await import('./vistas-para-critica.mjs');
    /* o bloco, um apoio que encosta por cima (folga zero, toque) e um pino que o fura por baixo (folga zero, cruza), mais uma vizinha a 3 mm */
    const apoio = caixaNeutra([0, 0.1, 0], [0.1, 0.12, 0.1]);
    const fura = caixaNeutra([0.04, -0.03, 0.04], [0.06, 0.002, 0.06]);
    const longe = caixaNeutra([0.1 + 0.003, 0, 0], [0.13, 0.05, 0.05]);
    const folhas = [folha('bloco', bloco), folha('apoio', apoio), folha('fura', fura), folha('longe', longe)];
    const encaixes = encaixesDaPeca({ folhas, instancia: 'bloco', limite: Infinity });
    expect(encaixes.map((e) => [e.vizinha, Number(e.folgaMm.toFixed(3))])).toEqual([['apoio', 0], ['fura', 0], ['longe', 3]]);
    expect(FOLGA_DE_CONTATO_MM).toBe(0.01);
    const padrao = encaixesDoPadrao(encaixes);
    expect(padrao.entram.map((e) => e.vizinha)).toEqual(['apoio', 'fura']);
    expect(padrao.fora.map((e) => e.vizinha)).toEqual(['longe']);
    expect(padrao.limiarMm).toBe(FOLGA_DE_CONTATO_MM);
    for (const e of padrao.fora) expect(e.folgaMm).toBeGreaterThan(padrao.limiarMm);
    /* o corte declarado entra com a folga que tiver */
    const comDeclarado = encaixesDoPadrao(encaixesDaPeca({ folhas, instancia: 'bloco', limite: Infinity, cortesDeclarados: [{ vizinha: 'longe', ponto: [101, 25, 25], normal: [0, 0, 1], motivo: 'a folga lateral' }] }));
    expect(comDeclarado.entram.map((e) => [e.vizinha, e.declarado])).toEqual([['apoio', false], ['fura', false], ['longe', true]]);
    expect(comDeclarado.fora).toEqual([]);
    /* sem nenhum que encoste, entra o de menor folga com os que empatam com ele, e o limiar é essa folga */
    const soltos = [{ vizinha: 'a', folgaMm: 0.5, declarado: false }, { vizinha: 'b', folgaMm: 0.5, declarado: false }, { vizinha: 'c', folgaMm: 0.6, declarado: false }, { vizinha: 'd', folgaMm: 9, declarado: true }];
    expect(encaixesDoPadrao(soltos)).toEqual({ entram: [soltos[0], soltos[1], soltos[3]], fora: [soltos[2]], limiarMm: 0.5 });
    /* a folga no limite do contato entra, e a logo acima fica de fora */
    const noLimite = [{ vizinha: 'a', folgaMm: 0, declarado: false }, { vizinha: 'b', folgaMm: 0.01, declarado: false }, { vizinha: 'c', folgaMm: 0.011, declarado: false }];
    expect(encaixesDoPadrao(noLimite).entram.map((e) => e.vizinha)).toEqual(['a', 'b']);
    expect(encaixesDoPadrao([])).toEqual({ entram: [], fora: [], limiarMm: FOLGA_DE_CONTATO_MM });
  });

  it('os cortes do padrão, desenhados de verdade: os dois encaixes de folga zero e o declarado de folga maior saem em imagem, e sem a declaração ele fica de fora', async () => {
    const { cortesDasFolhas } = await import('./vistas-para-critica.mjs');
    const apoio = caixaNeutra([0, 0.1, 0], [0.1, 0.12, 0.1]);
    const fura = caixaNeutra([0.04, -0.03, 0.04], [0.06, 0.002, 0.06]);
    const longe = caixaNeutra([0.1 + 0.003, 0, 0], [0.13, 0.05, 0.05]);
    const folhas = [folha('bloco', bloco), folha('apoio', apoio), folha('fura', fura), folha('longe', longe)];
    const pasta = mkdtempSync(join(area, 'cortes-'));
    const semDeclarar = cortesDasFolhas({ folhas, instancia: 'bloco', pasta, padrao: true });
    expect(semDeclarar.cortes.map((c) => [c.vizinha, c.declarado, basename(c.arquivo)])).toEqual([['apoio', false, 'corte-bloco-apoio.png'], ['fura', false, 'corte-bloco-fura.png']]);
    expect(semDeclarar.fora.map((f) => [f.vizinha, Number(f.folgaMm.toFixed(3))])).toEqual([['longe', 3]]);
    expect(semDeclarar.limiarMm).toBe(FOLGA_DE_CONTATO_MM);
    expect(readdirSync(pasta).sort()).toEqual(['corte-bloco-apoio.png', 'corte-bloco-fura.png']);
    /* a descrição do pedido, feita do que saiu daqui, não chama de folga maior nenhum dos que empataram */
    const descricao = descricaoDoPacotePadrao({ escolha: { comVista: [], semVista: [] }, cortes: { entram: semDeclarar.cortes, fora: semDeclarar.fora.map((f) => f.vizinha), limiarMm: semDeclarar.limiarMm } });
    expect(descricao.entrou[2]).toBe('os cortes dos encaixes com `apoio` e `fura`: todo encaixe com folga até 0,01 mm, onde um cruzamento ou uma peça solta aparece primeiro');
    expect(descricao.fora[1]).toBe('o corte do encaixe com `longe`, de folga maior que 0,01 mm');
    /* com o corte declarado pela peça, a vizinha de folga maior é desenhada */
    const declarado = cortesDasFolhas({ folhas, instancia: 'bloco', pasta, padrao: true, cortesDeclarados: [{ vizinha: 'longe', ponto: [101, 25, 25], normal: [0, 0, 1], motivo: 'a folga lateral' }] });
    expect(declarado.cortes.map((c) => [c.vizinha, c.declarado])).toEqual([['apoio', false], ['fura', false], ['longe', true]]);
    expect(declarado.fora).toEqual([]);
    expect(PNG.sync.read(readFileSync(join(pasta, 'corte-bloco-longe.png'))).width).toBeGreaterThan(100);
    /* sem `padrao` (o pacote completo) saem os de sempre, sem lista de fora nem limiar */
    const completo = cortesDasFolhas({ folhas, instancia: 'bloco', pasta });
    expect(completo.cortes.map((c) => c.vizinha)).toEqual(['apoio', 'fura', 'longe']);
    expect(completo.fora).toEqual([]);
    expect(completo.limiarMm).toBeNull();
  });

  it('numa montagem do acervo, sem dublê, o padrão desenha todo encaixe que encosta: a fuselagem do avião tem cinco, e antes saía um', async () => {
    const montagem = { arquivo: resolve('procedural/pecas/aviao/montagem.json'), instancia: 'fuselagem' };
    const pasta = mkdtempSync(join(area, 'cortes-do-aviao-'));
    const feitos = await cortesDosEncaixes({ montagem, pasta, padrao: true });
    expect(feitos.aviso).toBeNull();
    expect(feitos.limiarMm).toBe(FOLGA_DE_CONTATO_MM);
    expect(feitos.cortes.length).toBeGreaterThan(1);
    for (const c of feitos.cortes) { expect(c.folgaMm).toBeLessThanOrEqual(feitos.limiarMm); expect(existsSync(c.arquivo)).toBe(true); }
    for (const f of feitos.fora) expect(f.folgaMm).toBeGreaterThan(feitos.limiarMm);
  }, 60_000);

  it('o contato declarado na montagem chega ao encaixe com o motivo, e o par sem declaração sai sem contato', async () => {
    const { encaixesDaPeca, contatosDeclaradosDaMontagem } = await import('./vistas-para-critica.mjs');
    const dado = { auditoriaIntersecoes: { expectativas: [
      { id: 'pinoEntra', a: { caminho: ['pino'] }, b: { caminho: ['bloco'] }, motivo: 'o pino entra 2 mm no bloco, onde é colado' },
      { id: 'vigaComChao', a: { caminho: ['viga'] }, b: { caminho: ['chao'] }, motivo: 'a viga assenta no chão' },
    ] } };
    const contatos = contatosDeclaradosDaMontagem(dado, 'bloco');
    expect([...contatos.entries()]).toEqual([['pino', [{ id: 'pinoEntra', motivo: 'o pino entra 2 mm no bloco, onde é colado' }]]]);
    const encaixes = encaixesDaPeca({ folhas: [folha('bloco', bloco), folha('tampa', tampa), folha('pino', pino)], instancia: 'bloco', contatos });
    expect(encaixes.find((e) => e.vizinha === 'pino').contatos).toEqual([{ id: 'pinoEntra', motivo: 'o pino entra 2 mm no bloco, onde é colado' }]);
    expect(encaixes.find((e) => e.vizinha === 'tampa').contatos).toEqual([]);
  });

  it('o pedido diz, na linha do corte, o motivo do contato declarado e que o toque dele é o esperado; sem declaração, que todo cruzamento é achado', () => {
    const base = { arquivo: '/p/c.png', origens: ['posição x'], folgaMm: 0, folgaNoCorteMm: 0, cruzam: true, plano: 'x = 1,0 mm, visto de +x', declarado: false };
    const com = montarPedido({ peca: 'x/y', encaixes: [{ ...base, vizinha: 'carroceria', contatos: [{ id: 'a', motivo: 'o vidro encosta por dentro na borda do vão' }] }] });
    expect(com).toContain('contato declarado, motivo escrito na declaração: «o vidro encosta por dentro na borda do vão»; o cruzamento ou o toque que esse motivo descreve é o esperado, e só é defeito o que passa do declarado');
    expect(com).not.toContain('sem contato declarado');
    const sem = montarPedido({ peca: 'x/y', encaixes: [{ ...base, vizinha: 'tampa' }] });
    expect(sem).toContain('sem contato declarado para o par: todo cruzamento ou toque entre as duas é achado');
  });

  it('a caixa de cada parte sai em mm, x y z, da malha executada, e o pedido a põe junto da forma prometida', async () => {
    const { caixasDasPartes } = await import('./vistas-para-critica.mjs');
    const roda = caixaNeutra([0, 0, 0], [0.0116, 0.466, 0.466], 'disco');
    const aro = caixaNeutra([0, 0, 0], [0.0044, 0.466, 0.466], 'aro');
    const neutro = { V: new Map([...roda.V].map(([i, p]) => [i, p]).concat([...aro.V].map(([i, p]) => [i + 8, p]))), F: new Map([...roda.F.values()].map((f) => [f.id, f]).concat([...aro.F.values()].map((f) => [f.id + 6, { ...f, id: f.id + 6, vs: f.vs.map((v) => v + 8) }]))) };
    const caixas = caixasDasPartes(neutro);
    expect([...caixas.keys()]).toEqual(['disco', 'aro']);
    expect(caixas.get('disco')[0]).toBeCloseTo(11.6, 6);
    expect(caixas.get('disco')[1]).toBeCloseTo(466, 6);
    expect(caixas.get('aro')[0]).toBeCloseTo(4.4, 6);
    const pedido = montarPedido({ ...DADOS, partes: [{ nome: 'bloco', caixaMm: caixas.get('disco'), imagens: [{ arquivo: '/o/p.png', vista: 'direita' }] }, { nome: 'viga', imagens: [] }] });
    const bloco = pedido.slice(pedido.indexOf('### bloco'), pedido.indexOf('### viga'));
    expect(bloco).toContain('Forma prometida: caixa de 200 por 100 mm com um furo passante');
    expect(bloco).toContain('Caixa da parte na malha executada: 11,6 por 466,0 por 466,0 mm (x, y, z)');
    expect(pedido.slice(pedido.indexOf('### viga'))).not.toContain('Caixa da parte');
  });

  it('a imagem do corte é um PNG com a peça e a vizinha em cores diferentes', async () => {
    const { encaixesDaPeca, imagemDoCorte, COR_DA_PECA, COR_DA_VIZINHA } = await import('./vistas-para-critica.mjs');
    const { dePng } = await import('./leitura-por-regioes.mjs');
    const [e] = encaixesDaPeca({ folhas: [folha('bloco', bloco), folha('tampa', tampa)], instancia: 'bloco' });
    const png = imagemDoCorte({ peca: 'bloco', vizinha: 'tampa', plano: e.plano, daPeca: e.daPeca, daVizinha: e.daVizinha, folga: e.folga, folgaMm: e.folgaMm });
    const im = dePng(png);
    const conta = (cor) => { let n = 0; for (let i = 0; i < im.dados.length; i += 3) if (im.dados[i] === cor[0] && im.dados[i + 1] === cor[1] && im.dados[i + 2] === cor[2]) n++; return n; };
    expect(conta(COR_DA_PECA.fundo)).toBeGreaterThan(10_000);
    expect(conta(COR_DA_VIZINHA.fundo)).toBeGreaterThan(10_000);
    /* o mesmo corte dá os mesmos bytes */
    expect(imagemDoCorte({ peca: 'bloco', vizinha: 'tampa', plano: e.plano, daPeca: e.daPeca, daVizinha: e.daVizinha, folga: e.folga, folgaMm: e.folgaMm })).toEqual(png);
  });

  it('o pedido lista cada corte com a vizinha, de onde veio a declaração, a folga e o plano, e diz o que a imagem mostra', () => {
    const encaixes = [
      { arquivo: '/p/corte-bloco-tampa.png', vizinha: 'tampa', origens: ['posição tampaNoBloco'], folgaMm: 0.354, folgaNoCorteMm: 0.354, cruzam: false, plano: 'x = 50,0 mm, visto de +x (direita da imagem -z, cima +y)', declarado: false },
      { arquivo: '/p/corte-bloco-pino.png', vizinha: 'pino', origens: ['contato declarado pinoEntra'], folgaMm: 0, folgaNoCorteMm: 0, cruzam: true, plano: 'z = 50,0 mm, visto de +z (direita da imagem +x, cima +y)', declarado: true, contatos: [{ id: 'pinoEntra', motivo: 'o pino entra 2 mm no bloco' }] },
    ];
    const pedido = montarPedido({ ...DADOS, encaixes });
    expect(titulos(pedido)).toEqual(['Objeto', 'Alvo', 'Referências', 'Modelo', 'Montado', 'Encaixes em corte', 'Sobreposição', 'Partes', 'Critérios de reprovação', 'Perguntas', 'Veredito']);
    const secao = pedido.slice(pedido.indexOf('## Encaixes em corte'), pedido.indexOf('## Sobreposição'));
    expect(secao).toContain('As vistas montadas não decidem a profundidade de um encaixe');
    expect(secao).toContain('a peça em laranja, a vizinha em azul, roxo onde as duas se cruzam');
    expect(secao).toContain('- com `tampa` (posição tampaNoBloco): folga de 0,35 mm no corte, 0,35 mm entre as malhas; sem contato declarado para o par: todo cruzamento ou toque entre as duas é achado; plano x = 50,0 mm, visto de +x (direita da imagem -z, cima +y): /p/corte-bloco-tampa.png');
    expect(secao).toContain('- com `pino` (contato declarado pinoEntra): as duas se cruzam ou se tocam no corte, 0,00 mm entre as malhas; contato declarado, motivo escrito na declaração: «o pino entra 2 mm no bloco»; o cruzamento ou o toque que esse motivo descreve é o esperado, e só é defeito o que passa do declarado; plano z = 50,0 mm, visto de +z (direita da imagem +x, cima +y), declarado: /p/corte-bloco-pino.png');
  });
});


describe('a luz rasante que não alcança a peça', () => {
  const img = (vista, azimute, iluminada) => ({ arquivo: `/p/${vista}-az${azimute}.png`, vista, azimute, iluminada });
  const superficie = (rasante) => ({ obj: '/p/peca.obj', rasante, curvatura: [] });

  it('decide pelas frações: a abaixo do limiar, ou sem medida, é escura, e a primeira elevação que passa fica', () => {
    const rasante = [img('topo', 30, 0.172), img('topo', 120, 0.6), img('lado', 30, null)];
    const { aceitas, escuras } = decidirLuzRasante(rasante, 0.25);
    expect(aceitas).toEqual([rasante[1]]);
    expect(escuras).toEqual([rasante[0], rasante[2]]);
    expect(primeiraQuePassa([{ elevacao: 20, iluminada: 0.2 }, { elevacao: 30, iluminada: 0.31 }, { elevacao: 45, iluminada: 0.5 }], 0.25)).toEqual({ elevacao: 30, iluminada: 0.31 });
    expect(primeiraQuePassa([{ elevacao: 20, iluminada: 0.2 }], 0.25)).toBeNull();
  });

  it('a vista escura é refeita com a luz mais alta e usa a primeira elevação que passa, dizendo o ângulo no pedido', async () => {
    const chamadas = [];
    const tentar = async ({ vista, azimutes, graus }) => {
      chamadas.push({ vista, azimutes, graus });
      return azimutes.map((azimute) => ({ azimute, arquivo: `/p/${vista}-el${graus}-az${azimute}.png`, iluminada: graus >= 30 ? 0.4 : 0.2 }));
    };
    const { superficie: nova, semLuz } = await luzRasanteDoPacote('x', superficie([img('topo', 30, 0.172), img('topo', 120, 0.6)]), { tentar });
    expect(chamadas).toEqual([{ vista: 'topo', azimutes: [30], graus: 20 }, { vista: 'topo', azimutes: [30], graus: 30 }]);
    expect(semLuz).toEqual([]);
    expect(nova.rasante).toEqual([{ arquivo: '/p/topo-el30-az30.png', vista: 'topo', azimute: 30, iluminada: 0.4, elevacao: 30 }, img('topo', 120, 0.6)]);
    const pedido = montarPedido({ peca: 'x', superficie: nova });
    expect(pedido).toContain('com a luz a 30 graus do plano da imagem, mais alta que nas outras');
  });

  it('a que nenhuma elevação salva sai do pedido com a frase da vista, e o pacote fica com as demais', async () => {
    const tentar = async ({ azimutes }) => azimutes.map((azimute) => ({ azimute, arquivo: '/p/x.png', iluminada: 0.2 }));
    const { superficie: nova, semLuz } = await luzRasanteDoPacote('x', superficie([img('topo', 30, 0.172), img('lado', 30, 0.7)]), { tentar });
    expect(nova.rasante).toEqual([img('lado', 30, 0.7)]);
    expect(semLuz).toHaveLength(1);
    expect(semLuz[0].texto).toMatch(/a vista topo ficou sem a luz rasante a 30 graus de azimute.*17,2 % da peça iluminada a 10 graus.*20,0 % no melhor de 20, 30, 45 graus.*limiar de 25,0 %.*saiu do pedido/);
    expect(montarPedido({ peca: 'x', superficie: nova })).toContain('Sem imagem: a vista topo ficou sem a luz rasante');
    expect(ELEVACOES_DA_LUZ_RASANTE).toEqual([20, 30, 45]);
  });

  it('sem nenhuma imagem de luz rasante que passe, o pacote continua recusado', async () => {
    const tentar = async ({ azimutes }) => azimutes.map((azimute) => ({ azimute, arquivo: '/p/x.png', iluminada: 0.1 }));
    await expect(luzRasanteDoPacote('x', superficie([img('topo', 30, 0.1), img('topo', 120, 0.1)]), { tentar })).rejects.toThrow(/a luz rasante de 'x' saiu quase toda escura em 2 imagens/);
  });

  it('o pacote que já passa não tenta nada', async () => {
    const tentar = async () => { throw new Error('não devia tentar'); };
    const original = superficie([img('topo', 30, 0.5)]);
    expect((await luzRasanteDoPacote('x', original, { tentar })).superficie).toBe(original);
  });
});

describe('a referência externa trazida por quem conduz', () => {
  const existe = (c) => ['/fora/foto.png', '/fora/nota.txt'].includes(c);

  it('lê o caminho com a vista opcional e marca a imagem como externa', () => {
    expect(lerReferenciasExternas(['/fora/foto.png@lateral'.replace('lateral', 'direita'), '/fora/foto.png'.replace('foto', 'foto')].slice(0, 1), { existe }))
      .toEqual([{ caminho: '/fora/foto.png', lado: 'direita', externa: true }]);
    expect(lerReferenciasExternas(['/fora/foto.png'], { existe })).toEqual([{ caminho: '/fora/foto.png', externa: true }]);
  });

  it('recusa o caminho relativo, o inexistente, o que não é imagem, a vista desconhecida e a repetição', () => {
    expect(() => lerReferenciasExternas(['foto.png'], { existe })).toThrow(/deve ser absoluto/);
    expect(() => lerReferenciasExternas(['/fora/some.png'], { existe })).toThrow(/não existe/);
    expect(() => lerReferenciasExternas(['/fora/nota.txt'], { existe })).toThrow(/não é imagem/);
    expect(() => lerReferenciasExternas(['/fora/foto.png@diagonal'], { existe })).toThrow(/vista 'diagonal'.*frontal, direita/);
    expect(() => lerReferenciasExternas(['/fora/foto.png', '/fora/foto.png@frontal'], { existe })).toThrow(/mais de uma vez/);
  });

  it('o pedido a põe na seção de referências, com a vista e a origem, e o alvo sem referência pede "sem alvo"', () => {
    const referencias = lerReferenciasExternas(['/fora/foto.png@direita'], { existe });
    const pedido = montarPedido({ peca: 'x', referencias });
    const secao = pedido.slice(pedido.indexOf('## Referências'), pedido.indexOf('## Modelo'));
    expect(secao).toContain('foto.png: /fora/foto.png (referência externa, trazida por quem conduz; vale para a vista direita)');
    expect(secao).not.toContain('O plano não cita imagem de referência');
    expect(pedido).toContain('A receita não refina um esboço aprovado, e o alvo é a referência da seção seguinte');
    expect(montarPedido({ peca: 'x' })).toContain('`alvo` do veredito leva o texto `sem alvo: <motivo>`');
  });
  it('sem orientação dita, o pedido avisa que a referência externa pode estar girada e que os lados não foram declarados', () => {
    const referencias = lerReferenciasExternas(['/fora/foto.png'], { existe });
    const pedido = montarPedido({ peca: 'x', referencias });
    expect(pedido).toContain('pode estar girada ou espelhada');
    expect(pedido).toContain('a correspondência de lados não foi declarada');
    expect(pedido).not.toContain('orientação da imagem, dita por quem conduz');
  });

  it('a orientação dita casa com a referência pela posição, entra no pedido no lugar da frase dos eixos e manda girar a imagem', () => {
    const existem = (c) => ['/fora/foto.png', '/fora/outra.png'].includes(c);
    const referencias = lerReferenciasExternas(['/fora/foto.png@direita', '/fora/outra.png'], { existe: existem, orientacoes: ['foto em diagonal, a ponta para cima e à direita, o dorso para a esquerda', null] });
    expect(referencias[0].orientacaoDita).toBe('foto em diagonal, a ponta para cima e à direita, o dorso para a esquerda');
    expect(referencias[1].orientacaoDita).toBeUndefined();
    const secao = montarPedido({ peca: 'x', referencias }).split('\n').filter((l) => l.includes('/fora/'));
    expect(secao[0]).toContain('orientação da imagem, dita por quem conduz: foto em diagonal, a ponta para cima e à direita, o dorso para a esquerda');
    expect(secao[0]).toContain('Gire a imagem mentalmente');
    expect(secao[0]).not.toContain('o olho da imagem');
    expect(secao[0]).not.toContain('pode estar girada');
    expect(secao[1]).toContain('pode estar girada ou espelhada');
  });

  it('recusa a orientação vazia, de várias linhas ou acima do limite, dizendo o que veio e o que se espera', () => {
    expect(() => lerOrientacaoDaReferencia('   ')).toThrow(/veio vazia/);
    expect(() => lerOrientacaoDaReferencia('a\nb')).toThrow(/uma linha/);
    expect(() => lerOrientacaoDaReferencia('x'.repeat(LIMITE_DA_ORIENTACAO + 1))).toThrow(new RegExp(`${LIMITE_DA_ORIENTACAO + 1} caracteres, e o limite é ${LIMITE_DA_ORIENTACAO}`));
    expect(lerOrientacaoDaReferencia('x'.repeat(LIMITE_DA_ORIENTACAO))).toHaveLength(LIMITE_DA_ORIENTACAO);
    expect(() => lerReferenciasExternas(['/fora/foto.png'], { existe, orientacoes: [''] })).toThrow(/imagem \/fora\/foto.png.*veio vazia/);
  });
});

describe('a linha de comando', () => {
  const rodar = (...args) => spawnSync(process.execPath, [join(import.meta.dirname, 'vistas-para-critica.mjs'), ...args], { encoding: 'utf8', timeout: 20_000 });

  it('--ajuda imprime o uso, com as opções de referência e orientação, e sai com 0', () => {
    const r = rodar('--ajuda');
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(AJUDA);
    for (const opcao of ['--referencia=', '--orientacao-da-referencia=', '--sem-medir', '--saida=', '--prazo=', '--ajuda']) expect(r.stdout).toContain(opcao);
  });

  it('a orientação sem referência anterior, ou repetida para a mesma referência, é recusada com o uso', () => {
    const antes = rodar('x/y', '--orientacao-da-referencia=em diagonal');
    expect(antes.status).toBe(2);
    expect(antes.stderr).toContain('veio antes de qualquer --referencia');
    const duas = rodar('x/y', '--referencia=/fora/foto.png', '--orientacao-da-referencia=a', '--orientacao-da-referencia=b');
    expect(duas.status).toBe(2);
    expect(duas.stderr).toContain('duas vezes para a mesma referência');
  });

  it('--regioes-do-contorno vale para o --contorno anterior, e sem ele ou repetida é recusada com o uso', () => {
    expect(AJUDA).toContain('--contorno=<caminho>[@<lado>]');
    expect(AJUDA).toContain('--regioes-do-contorno=<nome>');
    const antes = rodar('x/y', '--regioes-do-contorno=selim');
    expect(antes.status).toBe(2);
    expect(antes.stderr).toContain('veio antes de qualquer --contorno');
    const duas = rodar('x/y', '--contorno=/fora/lateral.contornos.json', '--regioes-do-contorno=selim', '--regioes-do-contorno=canote');
    expect(duas.status).toBe(2);
    expect(duas.stderr).toContain('duas vezes para o mesmo contorno');
  });
});

describe('a lataria sem o Blender', () => {
  it('o pacote de uma peça de lataria sem Blender não é mais recusado: a luz rasante e a curvatura vêm da bancada', async () => {
    const base = mkdtempSync(join(area, 'sem-blender-'));
    const peca = 'tools/fixtures/lataria-com-vinco/receita.js';
    const chamadas = [];
    const superficieDaBancada = async (p, { pasta, lataria, capturar }) => {
      chamadas.push({ p, lataria: lataria.lataria, capturar: typeof capturar });
      const arquivo = join(pasta, 'superficie', 'peca-frente-rasante-az30.png');
      mkdirSync(dirname(arquivo), { recursive: true });
      writeFileSync(arquivo, 'x');
      return { fonte: 'bancada', partes: [], rasante: [{ arquivo, vista: 'frente', azimute: 30, elevacao: 10, iluminada: 0.9 }], curvatura: [{ arquivo, vista: 'frente' }], faixa: null, fora: [] };
    };
    const resultado = await vistasParaCritica(peca, { saida: join(base, 'rodada'), pastaDasCapturas: base, dependencias: { medirReceita: medirPassa, blender: null, olharBancada: bancadaFalsa(base, peca).fazer, superficieDaBancada, rodadasAnteriores: () => [] } });
    expect(chamadas).toEqual([{ p: peca, lataria: true, capturar: 'function' }]);
    expect(readFileSync(resultado.pedido, 'utf8')).toContain('com a luz a 10 graus do plano da imagem');
  }, 60_000);
});

describe('a peça em foco tapada na vista montada', () => {
  const caixa = ([x0, y0, z0], [x1, y1, z1]) => {
    const p = (x, y, z) => [x, y, z];
    const q = (a, b, c, d) => [[a, b, c], [a, c, d]];
    const v = [p(x0, y0, z0), p(x1, y0, z0), p(x1, y1, z0), p(x0, y1, z0), p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1)];
    return [q(v[0], v[1], v[2], v[3]), q(v[4], v[5], v[6], v[7]), q(v[0], v[1], v[5], v[4]), q(v[3], v[2], v[6], v[7]), q(v[0], v[3], v[7], v[4]), q(v[1], v[2], v[6], v[5])].flat();
  };
  const pe = caixa([0, 0, 0], [1, 1, 1]);
  const cacamba = caixa([-1, 2, -1], [2, 3, 2]);

  it('mede a fração dos pixels da peça que as outras deixam à vista', () => {
    expect(fracaoVisivelDaPeca({ foco: pe, outras: [], olho: [0, 1, 0] }).visivel).toBe(1);
    expect(fracaoVisivelDaPeca({ foco: pe, outras: cacamba, olho: [0, 1, 0] }).visivel).toBe(0);
    expect(fracaoVisivelDaPeca({ foco: pe, outras: cacamba, olho: [0, -1, 0] }).visivel).toBe(1);
    const metade = caixa([0.5, 2, -1], [2, 3, 2]);
    expect(fracaoVisivelDaPeca({ foco: pe, outras: metade, olho: [0, 1, 0] }).visivel).toBeCloseTo(0.5, 1);
  });

  it('a vista tapada fica fora das imagens do pedido, dita nele, e a sem medida entra', () => {
    const imagens = [{ arquivo: 'a.png', vista: 'superior' }, { arquivo: 'b.png', vista: 'frontal' }, { arquivo: 'c.png', vista: 'direita' }];
    const { entram, fora } = vistasMontadasVisiveis(imagens, { superior: 0, frontal: 0.8 });
    expect(entram.map((i) => i.vista)).toEqual(['frontal', 'direita']);
    expect(fora).toEqual([{ vista: 'superior', visivel: 0 }]);
    const pedido = montarPedido({ peca: 'x', montado: { instancia: 'pes', imagens: entram, fora } });
    expect(pedido).toContain('Ficaram de fora, porque as outras peças tapam a peça em foco: superior (a peça aparece em 0 % da silhueta dela).');
  });
});

describe('a medição da receita antes do pacote', () => {
  const PECA = 'tools/fixtures/forma-do-esboco/ok/receita.js';
  const sobreposicaoDeCortes = async () => ({ arquivos: [], paineis: [], notas: [] });

  it('a receita que reprova não captura nada, não grava pedido e devolve o relatório e o comando que repete a medição', async () => {
    const base = mkdtempSync(join(area, 'reprova-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const medidas = [];
    const medirReprova = async (p) => { medidas.push(p); return { passou: false, sha256: 'sha256:x', relatorio: 'peça nova de chapa de lataria com 337 face(s) fina(s)' }; };
    const erro = await vistasParaCritica(PECA, { saida: pasta, pastaDasCapturas: base, dependencias: { olharBancada: bancada.fazer, sobreposicaoDeCortes, medirReceita: medirReprova } }).catch((e) => e);
    expect(erro).toBeInstanceOf(ReceitaReprovada);
    expect(erro.message).toContain('337 face(s) fina(s)');
    expect(erro.message).toContain('O crítico só julga receita que passa nas medidas');
    expect(erro.message).toContain(`node tools/modelar/rodada-de-modelagem.mjs ${PECA} --acao`);
    expect(medidas).toEqual([PECA]);
    expect(bancada.chamadas).toHaveLength(0);
    expect(existsSync(join(pasta, 'pedido.md'))).toBe(false);
  });

  it('a receita que passa segue como antes, e o relatório e o pedido dizem a medição e o hash medido', async () => {
    const base = mkdtempSync(join(area, 'passa-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const resultado = await vistasParaCritica(PECA, { saida: pasta, pastaDasCapturas: base, dependencias: { olharBancada: bancada.fazer, sobreposicaoDeCortes, medirReceita: medirPassa } });
    expect(bancada.chamadas.length).toBeGreaterThan(0);
    expect(resultado.medicao).toEqual({ passou: true, sha256: 'sha256:de-ensaio' });
    expect(imprimir(resultado)).toContain('MEDIÇÃO DA RECEITA: passou (sha256:de-ensaio)');
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).toContain('Medição da receita: passou (sha256:de-ensaio).');
  }, 60_000);

  it('--sem-medir monta o pacote sem medir, e o relatório e o pedido dizem que saiu sem medição', async () => {
    const base = mkdtempSync(join(area, 'sem-medir-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const medirProibida = async () => { throw new Error('não devia medir'); };
    const resultado = await vistasParaCritica(PECA, { saida: pasta, pastaDasCapturas: base, semMedir: true, dependencias: { olharBancada: bancada.fazer, sobreposicaoDeCortes, medirReceita: medirProibida } });
    expect(bancada.chamadas.length).toBeGreaterThan(0);
    expect(resultado.medicao).toEqual({ passou: false, motivo: MOTIVO_SEM_MEDIR });
    expect(imprimir(resultado)).toContain('MEDIÇÃO DA RECEITA: NÃO FEITA');
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).toContain(`Medição da receita: NÃO FEITA: ${MOTIVO_SEM_MEDIR}.`);
  }, 60_000);
});

describe('a prancha desenhada em mm que o plano cita (e o aviso do que o pacote não leva)', () => {
  const PECA = 'tools/fixtures/comparar-com-prancha/receita.js';
  const SVG = join(dirname(new URL(import.meta.url).pathname), '../fixtures/comparar-com-prancha/referencias/lateral.prancha.svg');
  const COORD = { tipo: 'coordenadas', caixaMm: [-230, -30, 30, 330], cobertura: 0.97 };

  /* a bancada de prancha trocada por um gravador: uma chamada, as duas imagens */
  const gravador = (alinhamento = COORD, extra = {}) => {
    const pedidos = [];
    const fazer = async (pedido) => {
      pedidos.push(pedido);
      const outra = pedido.sobreposta;
      writeFileSync(pedido.saida, 'png');
      writeFileSync(outra, 'png');
      return {
        arquivo: pedido.saida, json: pedido.saida.replace(/\.png$/, '.json'), tambem: { disposicao: 'sobreposto', arquivo: outra, json: outra.replace(/\.png$/, '.json') },
        lidas: [{ caminho: pedido.pranchas[0].caminho, vista: pedido.pranchas[0].vista, larguraMm: 400, alturaMm: 300, pxPorMm: 0.5, alinhamento }], recusadas: [], ...extra,
      };
    };
    return { fazer, pedidos };
  };

  async function montar(pranchar) {
    const base = mkdtempSync(join(area, 'prancha-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const g = gravador();
    const resultado = await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base,
      dependencias: { medirReceita: medirPassa, olharBancada: bancada.fazer, rodadasAnteriores: () => [], prancharDesenhadas: pranchar ?? g.fazer },
    });
    return { resultado, pasta, pedidos: g.pedidos, pedido: readFileSync(join(pasta, 'pedido.md'), 'utf8') };
  }

  it('a referência citada que não é imagem nem prancha sai como aviso na saída e no pedido, e não em silêncio', async () => {
    const { resultado, pedido } = await montar();
    expect(resultado.referencias.ignoradas).toEqual(['referencias/alvo.md']);
    expect(resultado.avisos.join('\n')).toMatch(/PLANO\.referencias cita um arquivo que não entra no pacote do crítico.*referencias\/alvo\.md/);
    expect(imprimir(resultado)).toMatch(/AVISO: PLANO\.referencias cita um arquivo que não entra/);
    expect(pedido).toContain('O plano cita também referencias/alvo.md, que não é imagem nem prancha desenhada e por isso não entra neste pedido');
  });

  it('o .contornos.json citado não é referência ignorada, porque o pacote o lê', () => {
    expect(referenciasSemLeitura(['x/alvo.md', 'x/lateral.contornos.json'])).toEqual(['x/alvo.md']);
    expect(avisoDasReferenciasIgnoradas(['x/lateral.contornos.json'])).toBeNull();
  });

  it('a prancha SVG vira duas imagens de uma captura só, na vista declarada, e o pedido a chama de desenho cotado e põe o .prancha.svg do repositório no alvo', async () => {
    const { resultado, pasta, pedidos, pedido } = await montar();
    expect(referenciasDoPlano({ referencias: ['referencias/lateral.prancha.svg'] }, { pastaDaReceita: dirname(SVG).replace(/referencias$/, '') }).pranchas).toEqual([SVG]);
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].pranchas[0]).toMatchObject({ vista: 'esquerda', girar: 0 });
    expect(basename(pedidos[0].sobreposta)).toBe('prancha-desenhada-sobreposta.png');
    expect(resultado.pranchaDesenhada.imagens.map((i) => i.disposicao)).toEqual(['lado', 'sobreposta']);
    const secao = pedido.slice(pedido.indexOf('## Prancha desenhada'), pedido.indexOf('## Modelo'));
    expect(secao).toContain('não uma foto nem o objeto real em outra escala');
    expect(secao).toContain(`sobreposta: ${join(pasta, 'prancha-desenhada-sobreposta.png')}`);
    expect(secao).toContain(`${SVG}: vista esquerda do modelo`);
    expect(secao).not.toContain('tolerância do plano');
    expect(secao).toContain('o plano não declara uma tolerância');
    expect(secao).not.toContain('não foi declarado');
    expect(pedido).not.toContain('O plano não cita imagem de referência.');
    expect(JSON.parse(readFileSync(join(pasta, 'pacote.json'), 'utf8')).pranchaDesenhada.linhas[0]).toMatchObject({ vista: 'esquerda', presumida: false });
    expect(imprimir(resultado)).toContain('PRANCHA DESENHADA');
    /* o alvo do pedido é o desenho do repositório, e o registro da rodada o aceita: nenhuma imagem de tools/bancadas/out */
    const alvo = pedido.slice(pedido.indexOf('## Alvo'), pedido.indexOf('## Referências'));
    expect(alvo).toContain(`leva o caminho do desenho que o plano cita, no repositório`);
    expect(alvo).toContain(SVG);
    expect(alvo).not.toContain('prancha-desenhada-lado.png');
    expect(alvoDoRepositorio(SVG)).toBe('tools/fixtures/comparar-com-prancha/referencias/lateral.prancha.svg');
  });

  it('com a origem em mm o pedido diz que o desenho foi recortado pela caixa do modelo, sem "undefined", e sem ela diz o motivo do centro e avisa', async () => {
    const certo = await montar(gravador({ tipo: 'coordenadas', caixaMm: [-230, -30, 30, 330], cobertura: 0.97 }).fazer);
    expect(certo.pedido).toContain('recortado pela caixa do modelo (-230, -30, 30, 330 mm: h mín, v mín, h máx, v máx) e sobreposto pelas coordenadas; 97% da silhueta do modelo cai dentro');
    expect(certo.pedido).not.toContain('undefined');
    expect(certo.resultado.avisos.join('\n')).not.toMatch(/centro das extensões|cai dentro do contorno do desenho \(o limite/);
    const centro = await montar(gravador({ tipo: 'centro', motivo: 'o modelo passa da caixa do desenho: 120 mm à direita' }).fazer);
    expect(centro.pedido).toContain('alinhado pelo centro das extensões, e não pelas coordenadas: o modelo passa da caixa do desenho: 120 mm à direita');
    expect(centro.resultado.avisos.join('\n')).toMatch(/lateral\.prancha\.svg: o desenho não foi sobreposto pelas coordenadas em mm, e saiu alinhado pelo centro das extensões \(o modelo passa da caixa do desenho: 120 mm à direita\)/);
  });

  it('a silhueta do modelo fora do contorno do desenho (lado ou giro errados) vira aviso e consta do pedido', async () => {
    const { resultado, pedido } = await montar(gravador({ tipo: 'coordenadas', caixaMm: [0, 0, 1, 1], cobertura: 0.41 }).fazer);
    expect(resultado.avisos.join('\n')).toMatch(/só 41% da silhueta do modelo cai dentro do contorno do desenho \(o limite é 85%\): o lado declarado ou o giro \(0 graus\) podem estar errados/);
    expect(pedido).toContain('Fora da prancha desenhada: lateral.prancha.svg: só 41%');
  });

  it('o contorno aberto do desenho vira aviso que diz que o contorno não fecha, sem culpar lado nem giro', async () => {
    const { resultado } = await montar(gravador({ tipo: 'coordenadas', caixaMm: [0, 0, 1, 1], cobertura: 0.016, contornoAberto: true }).fazer);
    const avisos = resultado.avisos.join('\n');
    expect(avisos).toMatch(/lateral\.prancha\.svg: o contorno do desenho não fecha/);
    expect(avisos).not.toMatch(/só 2% da silhueta/);
  });

  it('a prancha recusada entre as lidas vai ao aviso e não derruba a outra', async () => {
    const { resultado } = await montar(gravador(COORD, { recusadas: ['superior.prancha.svg: o contorno mede 1 px'] }).fazer);
    expect(resultado.avisos.join('\n')).toMatch(/prancha desenhada: prancha recusada, superior\.prancha\.svg: o contorno mede 1 px/);
    expect(resultado.pranchaDesenhada.imagens).toHaveLength(2);
  });

  it('a prancha que não sai é aviso e consta do pedido, e o pacote segue', async () => {
    const { resultado, pedido } = await montar(async () => { throw new Error('o navegador não abriu'); });
    expect(resultado.pranchaDesenhada).toBeNull();
    expect(resultado.avisos.join('\n')).toMatch(/a prancha desenhada não saiu: o navegador não abriu/);
    expect(resultado.avisos.join('\n')).toMatch(/lateral\.prancha\.svg e a prancha desenhada não entrou no pacote/);
    expect(pedido).not.toContain('## Prancha desenhada');
  });

  it('sem declaração o lado sai do nome do arquivo, inclusive lateral-direita, e o pedido diz que foi presumido', () => {
    expect(vistaDaPranchaDesenhada('/x/lateral.prancha.svg')).toEqual({ vista: 'esquerda', presumida: true });
    expect(vistaDaPranchaDesenhada('/x/lateral-direita.prancha.svg')).toEqual({ vista: 'esquerda', presumida: true });
    expect(vistaDaPranchaDesenhada('/x/lateral.prancha.svg', { referencias: {} }, { frente: '+z', direita: '-x' })).toMatchObject({ presumida: true });
    expect(vistaDaPranchaDesenhada('/x/traseira.prancha.svg', { referencias: {} })).toMatchObject({ vista: 'traseira' });
    expect(vistaDaPranchaDesenhada('/x/lateral.prancha.svg', { referencias: { 'lateral.prancha.svg': 'direita' } })).toEqual({ vista: 'direita', presumida: false });
    expect(vistaDaPranchaDesenhada('/x/iso.prancha.svg')).toBeNull();
  });

  it('CRITICA.pranchas leva girar e referencial até a captura da prancha', async () => {
    const { pranchaDoPlano } = await import('./vistas-para-critica.mjs');
    const g = gravador();
    await pranchaDoPlano({ pranchas: [SVG], peca: 'x', pasta: area, critica: { referencias: {}, pranchas: { 'lateral.prancha.svg': { girar: 90, referencial: true } } }, orientacao: null, prancharDesenhadas: g.fazer });
    expect(g.pedidos[0].pranchas[0]).toMatchObject({ girar: 90, referencial: true });
  });

  it('o pedido fechado ganha uma pergunta por vista da prancha, com o nome da vista', () => {
    const dados = { plano: null, pranchaDesenhada: { linhas: [{ vista: 'superior', caminho: '/x/superior.prancha.svg' }], imagens: [{ disposicao: 'lado', arquivo: '/p/l.png' }], fora: [] } };
    const textos = perguntasFechadas(dados).map((p) => p.texto);
    expect(textos.some((t) => /Na vista superior do modelo, a silhueta segue a da prancha desenhada `superior\.prancha\.svg`/.test(t))).toBe(true);
    expect(textos.join(' ')).not.toContain('silhueta de lado');
    expect(montarPedidoFechado({ peca: 'x', ...dados }, 'a')).toContain('## Prancha desenhada');
  });
});

describe('a vista de perto da feição pequena (dePerto da parte no PLANO)', () => {
  async function pacote(peca) {
    const base = mkdtempSync(join(area, 'de-perto-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, peca);
    const resultado = await vistasParaCritica(peca, { saida: pasta, pastaDasCapturas: base, dependencias: { medirReceita: medirPassa, olharBancada: bancada.fazer, rodadasAnteriores: () => [] } });
    return { resultado, pasta, chamadas: bancada.chamadas, pedido: readFileSync(join(pasta, 'pedido.md'), 'utf8'), manifesto: JSON.parse(readFileSync(join(pasta, 'pacote.json'), 'utf8')) };
  }

  it('o quadro de perto é o do campo de 38 graus: 220 mm de distância enquadram uns 150 mm', () => {
    expect(DISTANCIA_DE_PERTO_MM).toBe(220);
    expect(campoDePertoMm(DISTANCIA_DE_PERTO_MM)).toBe(152);
    expect(campoDePertoMm(120)).toBe(83);
  });

  it('sem o campo, o pacote não tem captura de perto, linha de perto nem dado no pacote.json', async () => {
    const { chamadas, pedido, manifesto, resultado } = await pacote('tools/fixtures/referencia-do-plano/presente/receita.js');
    expect(chamadas.filter((c) => c.mirar)).toEqual([]);
    expect(resultado.dePerto).toEqual([]);
    expect(pedido).not.toContain('- de perto,');
    expect(pedido).not.toContain('Vistas de perto');
    expect(Object.hasOwn(manifesto, 'dePerto')).toBe(false);
  });

  it('com o campo, captura cada entrada mirando o ponto com a parte e as vizinhas, e o pedido e o pacote.json dizem o que olhar, o ponto, a escala e o caminho', async () => {
    const { chamadas, pedido, manifesto, resultado } = await pacote('tools/fixtures/de-perto/receita.js');
    const perto = chamadas.filter((c) => c.mirar);
    expect(perto.map((c) => ({ mirar: c.mirar, distancia: c.distancia, selecionadas: c.selecionadas, modo: c.modo, focar: c.focar ?? false }))).toEqual([
      { mirar: [100, 300, 200], distancia: 120, selecionadas: 'bloco', modo: 'contexto', focar: false },
      { mirar: [-100, 0, -200], distancia: 220, selecionadas: 'bloco', modo: 'contexto', focar: false },
    ]);
    expect(resultado.dePerto.map((d) => [d.campoMm, basename(d.arquivo)])).toEqual([
      [83, expect.stringContaining('mira-100_300_200-d120')], [152, expect.stringContaining('mira--100_0_-200-d220')],
    ]);
    const partes = pedido.slice(pedido.indexOf('## Partes'), pedido.indexOf('## Critérios'));
    expect(partes).toContain('Feição menor que uns 10 mm só se julga pela vista de perto');
    expect(partes.indexOf('Vistas de perto')).toBeGreaterThan(partes.indexOf('-isolar-orto-focado.png'));
    expect(partes).toContain(`- de perto, a quina de cima: aresta viva de caixa: ponto [100; 300; 200] mm (x, y, z da peça), a imagem cobre 83 mm de largura: ${resultado.dePerto[0].arquivo}`);
    expect(partes).toContain(`- de perto, a quina de baixo, do outro lado: ponto [-100; 0; -200] mm (x, y, z da peça), a imagem cobre 152 mm de largura: ${resultado.dePerto[1].arquivo}`);
    expect(manifesto.dePerto).toEqual(resultado.dePerto);
    expect(manifesto.dePerto[0]).toMatchObject({ parte: 'bloco', ponto: [100, 300, 200], distanciaMm: 120, campoMm: 83 });
    expect(imprimir(resultado)).toContain('DE PERTO');
  });
});

describe('o reflexo da bancada no pacote da peça de lataria', () => {
  const PECA = 'chapa-de-reflexo-de-prova';
  /* a enquadração que a bancada mediu na chapa de prova de frente para +z (`npm run bancada -- chapa-de-reflexo-de-prova --visao=zebra
     --enquadrar`): a direita e a superior a veem de quina */
  const ENQUADRADA = { isometrica: [0.81, 0.92], frontal: [0.92, 0.56], direita: [0.03, 0.92], superior: [0.92, 0.02] };

  async function pacote({ completo = true } = {}) {
    const base = mkdtempSync(join(area, 'reflexo-'));
    const pasta = join(base, 'rodada');
    const chamadas = [];
    const pedidosDeSuperficie = [];
    const olharBancada = async (opcoes) => {
      chamadas.push(opcoes);
      const vistas = opcoes.revisar ? ['isometrica', 'frontal', 'direita', 'superior'] : String(opcoes.vistas).split(',');
      const sufixo = [opcoes.selecionadas ? `sel-${opcoes.selecionadas}` : null, opcoes.arame ? `arame-${opcoes.arame}` : null, opcoes.visao ? `visao-${opcoes.visao}` : null, opcoes.anguloDaZebra != null ? `a${opcoes.anguloDaZebra}` : null, opcoes.enquadrar ? 'enquadrado' : 'orto'].filter(Boolean).join('-');
      const arquivos = vistas.map((v) => { const a = join(base, `${prefixoDaPeca(PECA)}${v}-${sufixo}.png`); writeFileSync(a, a); return a; });
      const medidas = opcoes.visao ? vistas.map((v) => ({ nome: v, enquadramento: { largura: ENQUADRADA[v][0], altura: ENQUADRADA[v][1], area: ENQUADRADA[v][0] * ENQUADRADA[v][1] } })) : undefined;
      return { ok: true, resultado: { arquivos, ...(medidas ? { vistas: medidas } : {}) } };
    };
    const img = (vista, azimute) => ({ arquivo: join(base, `rasante-${vista}-${azimute}.png`), vista, azimute, iluminada: 0.6 });
    const superficieDaBancada = async (_peca, opcoes) => { pedidosDeSuperficie.push(opcoes.vistas ?? null); return { fonte: 'bancada', partes: [], rasante: [img('frente', 30)], curvatura: [{ arquivo: join(base, 'curv-frente.png'), vista: 'frente' }], faixa: null, fora: [] }; };
    const resultado = await vistasParaCritica(PECA, { saida: pasta, pastaDasCapturas: base, completo, dependencias: { medirReceita: medirPassa, blender: null, olharBancada, superficieDaBancada, rodadasAnteriores: () => [] } });
    return { resultado, chamadas, pedidosDeSuperficie, pedido: readFileSync(join(pasta, 'pedido.md'), 'utf8'), manifesto: JSON.parse(readFileSync(join(pasta, 'pacote.json'), 'utf8')) };
  }

  it('no pacote padrão a peça de lataria leva a zebra nas duas direções, a curvatura e a luz rasante numa vista só, a de três quartos, sem a pintura', async () => {
    const { chamadas, pedidosDeSuperficie, pedido, resultado } = await pacote({ completo: false });
    expect(chamadas.filter((c) => c.visao).map((c) => [c.visao, c.anguloDaZebra ?? null, c.vistas])).toEqual([['zebra', null, 'isometrica'], ['zebra', 90, 'isometrica']]);
    expect(pedidosDeSuperficie).toEqual([VISTAS_DE_SUPERFICIE_NO_PADRAO]);
    expect(VISTAS_DE_SUPERFICIE_NO_PADRAO).toEqual(['tresquartos']);
    expect(pedido).toContain('- a superfície da chapa numa vista só, a de três quartos, que mostra a frente, o lado e o topo de uma vez: a curvatura e a luz rasante, e a zebra nas duas direções da listra na vista isometrica, que olha do mesmo lado');
    expect(pedido).toContain('- a superfície da chapa nas vistas de frente, de lado e de cima, e a pintura, que repetem o que a de três quartos mostra');
    expect(pedido).toContain('Com a listra deitada (0 grau):');
    expect(pedido).not.toContain('A pintura: verniz');
    expect(Object.keys(resultado.reflexo)).toEqual(['zebra', 'zebra-em-pe']);
    /* o completo não diz as vistas à superfície, que sai nas quatro de sempre */
    expect((await pacote()).pedidosDeSuperficie).toEqual([null]);
  }, 60_000);

  it('no pacote padrão, a luz rasante toda escura na vista de três quartos recusa o pacote com o comando do completo, que tenta as quatro vistas', async () => {
    const base = mkdtempSync(join(area, 'escura-'));
    const bancada = bancadaFalsa(base, PECA);
    const olharBancada = async (opcoes) => bancada.fazer({ ...opcoes, vistas: opcoes.vistas ?? 'isometrica' });
    const escura = { arquivo: join(base, 'rasante-tresquartos-290.png'), vista: 'tresquartos', azimute: 290, iluminada: 0.02 };
    const superficieDaBancada = async () => ({ fonte: 'bancada', partes: [], rasante: [escura], curvatura: [{ arquivo: join(base, 'curv.png'), vista: 'tresquartos' }], faixa: null, fora: [] });
    const montar = (completo) => pacoteDoCritico(PECA, { saida: join(base, 'rodada'), pastaDasCapturas: base, completo, dependencias: { medirReceita: medirPassa, blender: null, olharBancada, superficieDaBancada, rodadasAnteriores: () => [], ultimaRodadaJulgada: () => null } }).then(() => null, (e) => e.message);
    const recusa = await montar(false);
    expect(recusa).toContain(`a luz rasante de '${PECA}' saiu quase toda escura em uma imagem`);
    expect(recusa).toContain(`O pacote padrão recebeu a luz rasante só da vista tresquartos; esperado ao menos uma imagem em que a luz alcance a peça. O pacote completo tenta as quatro vistas de superfície: \`npm run vistas:critica -- ${PECA} --completo\`.`);
    /* no completo a recusa é a de sempre, sem a frase do padrão */
    const doCompleto = await montar(true);
    expect(doCompleto).toContain('saiu quase toda escura');
    expect(doCompleto).not.toContain('O pacote padrão recebeu');
  }, 60_000);

  it('captura a zebra nas duas direções e a pintura enquadradas e as lista no pedido, com a frase da faixa, sem a vista de quina', async () => {
    const { resultado, chamadas, pedido, manifesto } = await pacote();
    const visoes = chamadas.filter((c) => c.visao);
    const VISTAS = 'isometrica,frontal,direita,superior';
    expect(visoes.map((c) => [c.visao, c.anguloDaZebra ?? null, c.enquadrar, c.vistas])).toEqual([['zebra', null, true, VISTAS], ['zebra', 90, true, VISTAS], ['pintura', null, true, VISTAS]]);
    expect(titulos(pedido)).toContain('Reflexo');
    expect(titulos(pedido).indexOf('Reflexo')).toBe(titulos(pedido).indexOf('Superfície') + 1);
    const secao = pedido.slice(pedido.indexOf('## Reflexo'), pedido.indexOf('## Partes'));
    expect(secao).toContain(LEITURA_DA_FAIXA);
    /* a leitura curta do guia vai inteira, item a item, e cabe num pedido */
    for (const linha of LEITURA_DO_REFLEXO) expect(secao).toContain(`- ${linha}`);
    for (const [chave, sufixo] of [['zebra', 'zebra'], ['zebra-em-pe', 'zebra-a90'], ['pintura', 'pintura']]) {
      for (const vista of ['isometrica', 'frontal']) expect(secao).toContain(`- ${vista}: ${join(resultado.pasta, `${prefixoDaPeca(PECA)}${vista}-visao-${sufixo}-enquadrado.png`)}`);
      expect(secao).not.toContain(`direita-visao-${sufixo}`);
      expect(manifesto.reflexo[chave]).toEqual({ imagens: resultado.reflexo[chave].imagens.map((i) => i.arquivo), fora: ['direita', 'superior'] });
    }
    /* as duas direções da zebra, cada uma com o seu título, a deitada antes */
    expect(secao.indexOf('Com a listra deitada (0 grau):')).toBeGreaterThan(-1);
    expect(secao.indexOf('Com a listra deitada (0 grau):')).toBeLessThan(secao.indexOf('Com a listra em pé (90 graus):'));
    expect(secao).toContain('Ficaram de fora, porque a peça aparece de quina e ocupa menos de 20 % do quadro num dos lados: direita, superior.');
    /* a luz rasante e a curvatura, também da bancada, continuam no pedido */
    expect(pedido).toContain('rasante-frente-30.png');
    expect(imprimir(resultado)).toContain('REFLEXO DA BANCADA');
  }, 60_000);

  it('a peça que não é de lataria não captura reflexo nem ganha a seção', async () => {
    const base = mkdtempSync(join(area, 'sem-reflexo-'));
    const peca = 'tools/fixtures/referencia-do-plano/presente/receita.js';
    const bancada = bancadaFalsa(base, peca);
    const resultado = await vistasParaCritica(peca, { saida: join(base, 'rodada'), pastaDasCapturas: base, dependencias: { medirReceita: medirPassa, olharBancada: bancada.fazer, rodadasAnteriores: () => [] } });
    expect(bancada.chamadas.filter((c) => c.visao)).toEqual([]);
    expect(resultado.reflexo).toBeNull();
    expect(readFileSync(resultado.pedido, 'utf8')).not.toContain('## Reflexo');
  }, 60_000);

  it('a vista de quina sai, a captura sem medida entra, e com todas de quina fica a de maior área', () => {
    const r = (vistas) => ({ resultado: { arquivos: vistas.map(([v]) => `/o/${prefixoDaPeca(PECA)}${v}-visao-zebra.png`), vistas: vistas.map(([v, l, a]) => ({ nome: v, enquadramento: l === undefined ? undefined : { largura: l, altura: a, area: l * a } })) } });
    expect(imagensDoReflexo(r([['frontal', 0.9, 0.5], ['direita', 0.03, 0.9]]), PECA).imagens.map((i) => i.vista)).toEqual(['frontal']);
    expect(imagensDoReflexo(r([['frontal'], ['direita', 0.03, 0.9]]), PECA).imagens.map((i) => i.vista)).toEqual(['frontal']);
    const quina = imagensDoReflexo(r([['direita', 0.03, 0.9], ['superior', 0.9, 0.1]]), PECA);
    expect(quina.imagens.map((i) => i.vista)).toEqual(['superior']);
    expect(quina.fora.map((f) => f.vista)).toEqual(['direita']);
    expect(MINIMO_DO_REFLEXO).toBe(0.2);
  });
});

describe('a leitura curta do reflexo no pedido', () => {
  it('cabe em até 12 linhas, diz o que cada defeito faz com a faixa e que uma direção da zebra vê o que a outra não vê, e a seção a traz antes das imagens', () => {
    expect(LEITURA_DO_REFLEXO.length).toBeLessThanOrEqual(12);
    const texto = LEITURA_DO_REFLEXO.join(' ');
    for (const termo of ['Degrau', 'Vinco', 'Quebra de curvatura', 'Ondulação', 'Amassado', 'deitada (0 grau)', 'em pé (90 graus)', 'uma vê o que a outra não vê', 'pintura']) expect(texto).toContain(termo);
    expect(texto).toContain(LEITURA_DA_FAIXA);
    const secao = secaoDoReflexo({ zebra: { imagens: [{ arquivo: '/z.png', vista: 'frontal' }], fora: [] }, pintura: { imagens: [], fora: [] } });
    expect(secao[0]).toBe('## Reflexo');
    expect(secao.indexOf(`- ${LEITURA_DO_REFLEXO[0]}`)).toBeLessThan(secao.indexOf('- frontal: /z.png'));
    expect(secao.join('\n')).not.toMatch(/se parte numa linha mostra uma quina ou um degrau/);
  });
});

describe('o contorno medido sobre o modelo', () => {
  const contorno = {
    formato: 'mecanifica.contornos@1',
    silhueta: { contornoMm: [[-100, 0], [100, 0], [100, 200], [-100, 200]] },
    regioes: { ombro: { contornoMm: [[-50, 300], [50, 300], [50, 400], [-50, 400]] }, braco: { contornoMm: [[0, 0], [10, 0], [10, 10]] } },
  };
  const lidos = new Map([['/r/frontal.contornos.json', lerContornos(contorno)]]);

  it('na peça sozinha, desenha a silhueta e as regiões com nome de parte, no referencial da peça', () => {
    const { entradas, fora } = contornosParaSobrepor({ contornos: [{ arquivo: '/r/frontal.contornos.json', lado: 'frontal' }], lidos, nomes: ['ombro'] });
    expect(fora).toEqual([]);
    expect(entradas).toHaveLength(1);
    expect(entradas[0].vista).toBe('frontal');
    expect(entradas[0].aneis.map((a) => a.nome)).toEqual(['silhueta', 'ombro']);
    expect(entradas[0].aneis[0].pontosMm[0]).toEqual([[-100, 0, 0], [100, 0, 0], [100, 200, 0], [-100, 200, 0]]);
  });

  it('no objeto de várias partes, só a região da instância, levada ao referencial da peça pela pose', () => {
    const pose = { rotacao: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], deslocamento: [0, 0.245, 0] };
    const { entradas } = contornosParaSobrepor({ contornos: [{ arquivo: '/r/frontal.contornos.json', lado: 'frontal' }], lidos, nomes: ['ombro'], pose, deObjeto: true });
    expect(entradas[0].aneis.map((a) => a.nome)).toEqual(['ombro']);
    const [p0] = entradas[0].aneis[0].pontosMm[0];
    expect(p0[0]).toBeCloseTo(-50, 9);
    expect(p0[1]).toBeCloseTo(55, 9);
    expect(entradas[0].rotulo).toContain('pela pose dela na montagem');
  });

  it('a pose girada gira a vista, e a lateral sem orientação olha da esquerda', () => {
    /* girada 90 graus em torno de y: o +z do mundo é o -x da peça */
    const pose = { rotacao: [[0, 0, 1], [0, 1, 0], [-1, 0, 0]], deslocamento: [0, 0, 0] };
    const { entradas } = contornosParaSobrepor({ contornos: [{ arquivo: '/r/frontal.contornos.json', lado: 'frontal' }], lidos, nomes: ['ombro'], pose, deObjeto: true });
    expect(entradas[0].vista).toBe('esquerda');
    const lateral = contornosParaSobrepor({ contornos: [{ arquivo: '/r/frontal.contornos.json', lado: 'lateral' }], lidos, nomes: [] });
    expect(lateral.entradas[0].vista).toBe('esquerda');
    expect(lateral.entradas[0].aneis[0].pontosMm[0][0]).toEqual([0, 0, -100]);
  });

  it('diz o que fica de fora e por quê', () => {
    const { entradas, fora } = contornosParaSobrepor({
      contornos: [{ arquivo: '/r/frontal.contornos.json', lado: 'frontal' }, { arquivo: '/r/tras.contornos.json', lado: 'traseira' }, { arquivo: '/r/x.contornos.json', lado: 'superior' }],
      lidos: new Map([...lidos, ['/r/x.contornos.json', new Error('falta "silhueta.contornoMm"')]]), nomes: ['pescoco'], deObjeto: true,
    });
    expect(entradas).toEqual([]);
    expect(fora).toEqual([
      'frontal.contornos.json fica fora do contorno sobreposto: é contorno do objeto, e nenhuma região dele tem o nome da instância ou de uma parte do plano (pescoco).',
      'tras.contornos.json fica fora do contorno sobreposto: o lado traseira não é um dos que o contorno em mm mede (frontal, lateral, superior).',
      'x.contornos.json fica fora do contorno sobreposto: falta "silhueta.contornoMm".',
    ]);
  });

  it('a região marca como encontro o lado que divide com outra região, e a silhueta não leva encontro', () => {
    const partido = {
      formato: 'mecanifica.contornos@1', mmPorPx: 1.5,
      silhueta: { contornoMm: [[-100, 0], [100, 0], [100, 200], [-100, 200]] },
      regioes: { ombro: { contornoMm: [[-100, 100], [100, 100], [100, 200], [-100, 200]] }, cintura: { contornoMm: [[-100, 0], [100, 0], [100, 100], [-100, 100]] } },
    };
    const { entradas } = contornosParaSobrepor({ contornos: [{ arquivo: '/r/p.contornos.json', lado: 'frontal' }], lidos: new Map([['/r/p.contornos.json', lerContornos(partido)]]), nomes: ['ombro'] });
    const [silhueta, ombro] = entradas[0].aneis;
    expect(silhueta.encontros).toBeUndefined();
    expect(ombro.encontros).toHaveLength(1);
    expect(ombro.encontros[0]).toHaveLength(ombro.pontosMm[0].length);
    /* o lado de y = 100 é o da cintura; os outros três são silhueta */
    const i = ombro.pontosMm[0].findIndex((p, k, a) => p[1] === 100 && a[(k + 1) % a.length][1] === 100);
    ombro.encontros[0].forEach((l, k) => expect(l).toEqual(k === i ? { encontro: true, vizinha: 'cintura' } : { encontro: false, vizinha: null }));
  });

  it('o pedido diz que o trecho tracejado é encontro e não serve de medida, e que lado da caixa cai nele', () => {
    const pedido = montarPedido({
      peca: 'p', contornoSobreposto: {
        arquivo: '/x/contorno-sobreposto.png',
        linhas: [{ vista: 'frontal', rotulo: 'r', modelo: { extensaoMm: [190, 210] }, contornos: [{ nome: 'ombro', extensaoMm: [202, 177], cantoMenosModeloMm: [-2, 33], encontro: { vizinhas: ['anelCintura', 'anelOmbro'], comprimentoMm: 376.2, ladosDaCaixa: ['de baixo'] } }] }],
      },
    });
    expect(pedido).toMatch(/O trecho tracejado do contorno de uma região é encontro com outra região do mapa/);
    expect(pedido).toMatch(/Esse trecho não serve de medida, e a distância entre ele e o modelo não é defeito/);
    expect(pedido).toContain('contorno ombro 202 x 177 mm, canto de baixo à esquerda a -2 e 33 mm do canto do modelo (tracejado: 376,2 mm de encontro com anelCintura, anelOmbro, não é borda da peça; o lado de baixo da caixa cai no encontro e não mede a peça)');
  });

  it('o pedido traz a seção com a imagem e as extensões, antes do modelo', () => {
    const pedido = montarPedido({
      peca: 'p', contornoSobreposto: {
        arquivo: '/x/contorno-sobreposto.png', fora: ['a.contornos.json fica fora do contorno sobreposto: motivo.'],
        linhas: [{ vista: 'frontal', rotulo: 'o contorno frontal de a.json', modelo: { extensaoMm: [190, 210.5] }, contornos: [{ nome: 'ombro', extensaoMm: [202, 177], cantoMenosModeloMm: [-6, 33.5] }] }],
      },
    });
    expect(titulos(pedido).indexOf('Contorno medido sobre o modelo')).toBe(titulos(pedido).indexOf('Modelo') - 1);
    expect(pedido).toContain('- contorno sobreposto: /x/contorno-sobreposto.png');
    expect(pedido).toContain('- vista frontal, o contorno frontal de a.json: modelo 190 x 210,5 mm; contorno ombro 202 x 177 mm, canto de baixo à esquerda a -6 e 33,5 mm do canto do modelo');
    expect(pedido).toContain('Fora do contorno sobreposto: a.contornos.json fica fora do contorno sobreposto: motivo.');
    expect(montarPedido({ peca: 'p' })).not.toContain('Contorno medido');
  });

  it('a peça com contorno na pasta sai com a prancha do contorno no pacote, pedida na sessão da bancada', async () => {
    const PECA = 'tools/fixtures/refina-forma-global/contorno-ok/receita.js';
    const base = mkdtempSync(join(area, 'contorno-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const pedidos = [];
    const resultado = await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base,
      dependencias: {
        medirReceita: medirPassa, olharBancada: bancada.fazer, rodadasAnteriores: () => [],
        contornoSobreposto: async (opcoes, injetar) => {
          pedidos.push(opcoes);
          await injetar.olhar({ peca: opcoes.peca, vistas: ['frontal'], marca: 'do-contorno' });
          writeFileSync(opcoes.arquivo, 'png');
          return { arquivo: opcoes.arquivo, json: opcoes.arquivo.replace(/png$/, 'json'), medidas: { linhas: [{ vista: 'frontal', rotulo: 'o contorno frontal de frontal.contornos.json', modelo: { extensaoMm: [200, 200] }, contornos: [{ nome: 'silhueta', extensaoMm: [200, 200], cantoMenosModeloMm: [0, 0] }] }] } };
        },
      },
    });
    expect(pedidos).toHaveLength(1);
    expect(pedidos[0].arquivo).toBe(join(pasta, ARQUIVO_DO_CONTORNO_SOBREPOSTO));
    expect(pedidos[0].contornos[0].aneis.map((a) => a.nome)).toEqual(['silhueta', 'coluna', 'sapata']);
    expect(bancada.chamadas.some((c) => c.marca === 'do-contorno')).toBe(true);
    expect(resultado.contornoSobreposto.arquivo).toBe(join(pasta, ARQUIVO_DO_CONTORNO_SOBREPOSTO));
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).toContain(`- contorno sobreposto: ${join(pasta, ARQUIVO_DO_CONTORNO_SOBREPOSTO)}`);
    expect(JSON.parse(readFileSync(resultado.manifesto, 'utf8')).contornoSobreposto.imagem).toBe(join(pasta, ARQUIVO_DO_CONTORNO_SOBREPOSTO));
  }, 60_000);

  /* o contorno de fora do repositório, como `npm run contorno --fora-do-repositorio` o grava */
  const deFora = (imagem = { foraDoRepositorio: { motivo: 'foto de terceiro, fica em tmp', encerrada: false }, sha256: 'ab', largura: 10, altura: 10 }) => ({
    formato: 'mecanifica.contornos@1', mmPorPx: 1, ...(imagem ? { imagem } : {}),
    silhueta: { contornoMm: [[-100, 0], [100, 0], [100, 200], [-100, 200]] },
    regioes: { coluna: { contornoMm: [[-40, 20], [40, 20], [40, 200], [-40, 200]] }, base: { contornoMm: [[-100, 0], [100, 0], [100, 20], [-100, 20]] } },
  });
  const gravarContorno = (pasta, nome, json) => { mkdirSync(pasta, { recursive: true }); const f = join(pasta, nome); writeFileSync(f, JSON.stringify(json)); return f; };

  it('--contorno lê o lado pelo nome ou pelo @, e recusa o contorno sem a origem da imagem ou de referência encerrada', () => {
    const pasta = mkdtempSync(join(area, 'contorno-externo-'));
    const lateral = gravarContorno(pasta, 'lateral.contornos.json', deFora());
    expect(lerContornosExternos([lateral])).toEqual([{ arquivo: lateral, lado: 'lateral', externo: true }]);
    const semNome = gravarContorno(pasta, 'medido.contornos.json', deFora());
    expect(lerContornosExternos([`${semNome}@superior`], { regioes: [['coluna']] })).toEqual([{ arquivo: semNome, lado: 'superior', regioes: ['coluna'], externo: true }]);
    expect(() => lerContornosExternos([semNome])).toThrow(/o nome do arquivo não diz o lado.*diga o lado com --contorno=.*@lateral/);
    expect(() => lerContornosExternos([`${lateral}@traseira`])).toThrow(/o lado 'traseira' não é um dos que o contorno em mm mede \(frontal, lateral, superior\)/);
    expect(() => lerContornosExternos([join(pasta, 'some', 'lateral.contornos.json')])).toThrow(/não existe/);
    expect(() => lerContornosExternos([lateral, `${lateral}@lateral`])).toThrow(/veio mais de uma vez/);
    const semOrigem = gravarContorno(join(pasta, 'sem'), 'lateral.contornos.json', deFora(null));
    expect(() => lerContornosExternos([semOrigem])).toThrow(/não entra sem a declaração de origem da imagem: o contorno não diz de onde veio a imagem/);
    const semMotivo = gravarContorno(join(pasta, 'motivo'), 'lateral.contornos.json', deFora({ foraDoRepositorio: { motivo: ' ', encerrada: false } }));
    expect(() => lerContornosExternos([semMotivo])).toThrow(/imagem.foraDoRepositorio não diz o motivo/);
    const encerrada = gravarContorno(join(pasta, 'encerrada'), 'lateral.contornos.json', deFora({ foraDoRepositorio: { motivo: 'a foto saiu', encerrada: true } }));
    expect(() => lerContornosExternos([encerrada])).toThrow(/encerrada é true \(a foto saiu\).*não entra como medida/);
    expect(() => lerContornosExternos([lateral], { regioes: [['selim']] })).toThrow(/a região selim não existe no contorno; ele tem base, coluna/);
    expect(lerRegioesDoContorno('selim, canote')).toEqual(['selim', 'canote']);
    expect(() => lerRegioesDoContorno('selim,,canote')).toThrow(/nomes de região separados por vírgula/);
    expect(() => lerRegioesDoContorno('selim,selim')).toThrow(/mais de uma vez/);
  });

  it('as regiões pedidas são as únicas desenhadas, sem a silhueta, e a que falta fica de fora com o motivo', () => {
    const lidos = new Map([['/r/lateral.contornos.json', lerContornos(deFora())]]);
    const { entradas } = contornosParaSobrepor({ contornos: [{ arquivo: '/r/lateral.contornos.json', lado: 'lateral', regioes: ['coluna'] }], lidos, nomes: ['coluna', 'base'] });
    expect(entradas[0].vista).toBe('esquerda');
    expect(entradas[0].aneis.map((a) => a.nome)).toEqual(['coluna']);
    const falta = contornosParaSobrepor({ contornos: [{ arquivo: '/r/lateral.contornos.json', lado: 'lateral', regioes: ['selim'] }], lidos, nomes: [] });
    expect(falta.entradas).toEqual([]);
    expect(falta.fora).toEqual(['lateral.contornos.json fica fora do contorno sobreposto: não tem a região selim (tem base, coluna).']);
  });

  it('o pacote desenha o contorno de --contorno e o cita como medida do lado, tirado da --referencia de mesmo nome', async () => {
    const PECA = 'tools/fixtures/refina-forma-global/contorno-ok/receita.js';
    const base = mkdtempSync(join(area, 'contorno-de-fora-'));
    const pasta = join(base, 'rodada');
    const fotos = join(base, 'fotos');
    const contorno = gravarContorno(fotos, 'lateral.contornos.json', deFora());
    writeFileSync(join(fotos, 'lateral.png'), 'png');
    const bancada = bancadaFalsa(base, PECA);
    const pedidos = [];
    await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base,
      referenciasExternas: [`${join(fotos, 'lateral.png')}@esquerda`], contornosExternos: [contorno], regioesDosContornos: [['coluna']],
      dependencias: {
        medirReceita: medirPassa, olharBancada: bancada.fazer, rodadasAnteriores: () => [],
        contornoSobreposto: async (opcoes) => {
          pedidos.push(opcoes);
          writeFileSync(opcoes.arquivo, 'png');
          return { arquivo: opcoes.arquivo, json: opcoes.arquivo.replace(/png$/, 'json'), medidas: { linhas: [] } };
        },
      },
    });
    expect(pedidos[0].contornos.map((c) => [c.vista, c.aneis.map((a) => a.nome)])).toEqual([['esquerda', ['coluna']], ['frontal', ['silhueta', 'coluna', 'sapata']]]);
    expect(pedidos[0].contornos[0].arquivo).toBe(contorno);
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).toContain('a medida deste lado vem dos contornos em mm de `lateral.contornos.json`, tirados de `lateral.png`');
    const semOrigem = gravarContorno(join(base, 'sem'), 'lateral.contornos.json', deFora(null));
    const recusa = await vistasParaCritica(PECA, { saida: pasta, pastaDasCapturas: base, contornosExternos: [semOrigem], dependencias: { medirReceita: medirPassa, olharBancada: bancada.fazer } }).catch((e) => e);
    expect(recusa.message).toMatch(/não entra sem a declaração de origem/);
  }, 60_000);

  it('a etapa fixa vem do registro de etapas: toda instância da peça fixa, e nada fora de montagem', () => {
    const montagem = { arquivo: '/m/montagem.json', instancia: 'ombro', instancias: ['ombro'] };
    const registro = { etapas: [{ instancia: 'base', estado: 'fixa' }, { instancia: 'ombro', estado: 'fixa', aceite: { por: 'pessoa, 2026-11-05' } }] };
    expect(etapaFixaDaPeca(montagem, registro)).toEqual({ instancia: 'ombro', por: 'pessoa, 2026-11-05' });
    expect(etapaFixaDaPeca(montagem, { etapas: [{ instancia: 'ombro', estado: 'aberta' }] })).toBeNull();
    expect(etapaFixaDaPeca(montagem, { etapas: [{ instancia: 'ombro', estado: 'quebrada' }] })).toBeNull();
    expect(etapaFixaDaPeca({ ...montagem, instancias: ['ombro', 'outro'] }, registro)).toBeNull();
    expect(etapaFixaDaPeca(null, registro)).toBeNull();
    expect(etapaFixaDaPeca(montagem, null)).toBeNull();
  });

  it('o ombro do braço robótico tem aceite vigente no registro gravado, e com o registro já medido o contorno dele fica de fora', () => {
    /* medir a montagem do braço inteira leva uns 26 s: o registro medido entra pronto, e que as doze fixas são fixas pela leitura nova
       é prova da guarda do acervo (`etapas-do-acervo.test.mjs`) e de `etapas-consumidores-v3.test.mjs`, que medem de verdade */
    const montagem = montagemDaPeca('braco-robotico/ombro');
    const gravado = JSON.parse(readFileSync(montagem.arquivo.replace(/\.json$/, '.etapas.json'), 'utf8'));
    const medido = { etapas: [...aceitesVigentes(gravado)].map(([instancia, aceite]) => ({ instancia, estado: 'fixa', aceite })) };
    expect(etapaFixaDaPeca(montagem, medido)?.instancia).toBe('ombro');
    expect(etapaFixaDaPeca(montagem, { etapas: medido.etapas.map((e) => (e.instancia === 'ombro' ? { ...e, estado: 'quebrada' } : e)) })).toBeNull();
  });

  it('o pedido sem prancha diz que nenhum contorno foi desenhado, e por quê', () => {
    const motivo = motivoDaEtapaFixa({ instancia: 'ombro', por: 'pessoa' }, [{ arquivo: '/r/frontal.contornos.json' }, { arquivo: '/r/lateral.contornos.json' }], join(dirname(dirname(import.meta.dirname)), 'm/montagem.json'));
    expect(motivo).toBe('frontal.contornos.json, lateral.contornos.json ficam fora do pacote, sem desenho nem citação como medida.');
    /* o pedido não conta ao crítico o aceite nem a aprovação da peça */
    expect(motivo).not.toMatch(/aceite|aprovad|fixa|pessoa/);
    const pedido = montarPedido({ peca: 'p', contornoSobreposto: { arquivo: null, fora: [motivo] } });
    expect(pedido).toContain('Nenhum contorno medido foi desenhado sobre o modelo neste pacote.');
    expect(pedido).toContain(`Fora do contorno sobreposto: ${motivo}`);
    expect(pedido).not.toContain('contorno sobreposto: null');
  });

  it('a peça com a etapa fixa sai sem a prancha do contorno e sem citá-lo como medida, com o motivo no pedido', async () => {
    const PECA = 'tools/fixtures/refina-forma-global/contorno-ok/receita.js';
    const base = mkdtempSync(join(area, 'contorno-fixo-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const pedidos = [];
    const resultado = await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base,
      dependencias: {
        medirReceita: medirPassa, olharBancada: bancada.fazer, rodadasAnteriores: () => [],
        montagemDaPeca: () => ({ arquivo: join(base, 'montagem.json'), instancia: 'peca', instancias: ['peca'] }),
        registroDasEtapas: () => ({ etapas: [{ instancia: 'peca', estado: 'fixa', aceite: { por: 'pessoa, 2026-11-17' } }] }),
        poseDaInstancia: async () => { throw new Error('a pose não é pedida para peça fixa'); },
        olharEtapas: async () => { throw Object.assign(new Error('fora das etapas'), { codigo: 'foco-fora-das-etapas' }); },
        cortesDosEncaixes: async () => ({ cortes: [] }),
        contornoSobreposto: async (opcoes) => { pedidos.push(opcoes); return null; },
      },
    });
    expect(pedidos).toEqual([]);
    expect(resultado.contornoSobreposto).toBeNull();
    const pedido = readFileSync(join(pasta, 'pedido.md'), 'utf8');
    expect(pedido).toContain('Fora do contorno sobreposto: frontal.contornos.json fica fora do pacote, sem desenho nem citação como medida.');
    expect(pedido).not.toMatch(/aceite: pessoa|já aprovada/);
    expect(pedido).not.toMatch(/a medida deste lado vem dos contornos/);
  }, 60_000);
});

/* ---------- o pedido por perguntas fechadas ---------- */

describe('o pedido por perguntas fechadas, em duas ordens', () => {
  const perguntas = perguntasFechadas(DADOS);
  const A = montarPedidoFechado(DADOS, 'a');
  const B = montarPedidoFechado(DADOS, 'b');
  const ids = (texto) => [...texto.matchAll(/^- (P\d+)\. /gm)].map((m) => m[1]);

  it('as perguntas saem do que a receita declara: o alvo, a referência do mesmo lado, cada parte e cada critério, numeradas na ordem A', () => {
    expect(perguntas.map((p) => p.id)).toEqual(perguntas.map((_, i) => `P${i + 1}`));
    expect(perguntas.map((p) => p.origem)).toEqual(['alvo', 'referencia:esquerda', 'parte:bloco', 'parte:viga', 'criterio:1', 'criterio:2']);
    expect(perguntas.find((p) => p.origem === 'referencia:esquerda').texto).toBe('Na vista esquerda do modelo, a silhueta e o lugar de cada parte seguem os de `lateral.png`?');
    expect(perguntas.find((p) => p.origem === 'parte:bloco')).toMatchObject({ texto: 'A parte `bloco` mostra isto nas imagens: caixa com um furo passante?', peso: 1 });
    expect(perguntas.find((p) => p.origem === 'parte:viga').texto).toBe('A parte `viga` mostra isto nas imagens: caixa inclinada?');
    expect(perguntas.find((p) => p.origem === 'criterio:1')).toMatchObject({ grupo: 'criterio', defeitoSe: 'sim', texto: 'As imagens mostram isto: o bloco sem o furo?' });
    expect(perguntas.filter((p) => p.grupo === 'forma').every((p) => p.defeitoSe === 'não')).toBe(true);
    expect(perguntasFechadas(structuredClone(DADOS))).toEqual(perguntas);
  });

  it('a ordem A tem as imagens na ordem de hoje e a B põe o modelo e as partes antes do alvo e das referências; os critérios viram perguntas', () => {
    expect(titulos(A)).toEqual(['Objeto', 'Alvo', 'Referências', 'Modelo', 'Montado', 'Sobreposição', 'Partes', 'Perguntas fechadas', 'Perguntas', 'Respostas e veredito']);
    expect(titulos(B)).toEqual(['Objeto', 'Modelo', 'Montado', 'Sobreposição', 'Partes', 'Alvo', 'Referências', 'Perguntas fechadas', 'Perguntas', 'Respostas e veredito']);
    expect(A).not.toContain('## Critérios de reprovação');
    expect(A).not.toContain('Diga, em uma linha por parte');
    expect(A).toContain('As perguntas fechadas de forma comparam o modelo a ela');
  });

  it('as duas ordens citam as mesmas imagens e as mesmas perguntas, com os mesmos números, e a B as lista de trás para a frente', () => {
    const caminhos = (texto) => [...texto.matchAll(/\/[a-z]\/[\w.-]+\.png/g)].map((m) => m[0]).sort();
    expect(caminhos(B)).toEqual(caminhos(A));
    expect(caminhos(A)).toEqual(caminhos(montarPedido(DADOS)));
    expect(ids(A)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
    expect(ids(B)).toEqual(['P6', 'P5', 'P4', 'P3', 'P2', 'P1']);
    expect(A.indexOf('Perguntas de forma (`não` é defeito de forma)')).toBeLessThan(A.indexOf('Perguntas dos critérios de reprovação (`sim` é defeito estrutural)'));
    expect(B.indexOf('Perguntas dos critérios de reprovação')).toBeLessThan(B.indexOf('Perguntas de forma'));
  });

  it('o pedido pede o bloco de respostas antes do veredito, com a imagem citada, e escreve a regra da nota', () => {
    for (const texto of [A, B]) {
      expect(texto).toContain('```respostas');
      expect(texto).toContain(REGRA_DA_NOTA);
      expect(texto).toContain('`sim`, `não` ou `não dá para ver`');
      expect(texto).toContain('Estas perguntas são abertas e não entram na regra da nota');
      expect(texto).toContain('Medida não se responde a olho.');
      expect(texto).toContain('- P3. A parte `bloco` mostra isto nas imagens: caixa com um furo passante? (o `não` tira 1)');
      expect(texto).not.toContain('Forma prometida:');
      expect(texto).toContain('Técnica prometida: caixa menos cilindro');
      expect(texto).not.toMatch(/\bPASSOS\b|receita|rodada|histórico|mudou|ferramenta/i);
    }
    expect(montarPedido(DADOS)).toContain(`Forma prometida: ${PLANO.partes[0].forma}`);
    expect(montarPedidoFechado(DADOS, 'a')).toBe(A);
    expect(() => montarPedidoFechado(DADOS, 'c')).toThrow(/ordem do pedido fechado 'c' desconhecida/);
  });

  const resposta = (itens, nota = 7) => `texto\n\n\`\`\`respostas\n${JSON.stringify(itens)}\n\`\`\`\n\n\`\`\`json\n${JSON.stringify({ alvo: '/r/lateral.png', nota, defeitos: [], observacao: 'conjunto' })}\n\`\`\``;
  const todas = (r) => perguntas.map((p) => ({ id: p.id, resposta: r[p.id] ?? (p.grupo === 'criterio' ? 'não' : 'sim'), imagem: 'm-direita.png', evidencia: 'visto' }));

  it('lê as respostas do bloco, normaliza as três e o "não aparece nas vistas", e o veredito JSON continua lido no fim', () => {
    expect(['Sim', 'NAO', 'Não dá para ver.', 'não aparece nas vistas', 'talvez'].map(normalizarResposta)).toEqual(['sim', 'não', NAO_DA_PARA_VER, NAO_DA_PARA_VER, null]);
    const texto = resposta([...todas({}).slice(0, 5), { id: 'P6', resposta: 'não', evidencia: 'sem imagem' }]);
    const lidas = lerRespostasFechadas(texto, perguntas);
    expect(lidas.respostas).toEqual({ P1: 'sim', P2: 'sim', P3: 'sim', P4: 'sim', P5: 'não', P6: 'não' });
    expect(lidas.semImagem).toEqual(['P6']);
    expect(extrairVeredito(texto).nota).toBe(7);
    expect(notaEscrita(texto)).toBe(7);
  });

  it('recusa o bloco que falta, o id desconhecido ou repetido, a resposta fora das três e a pergunta sem resposta', () => {
    expect(() => lerRespostasFechadas('sem bloco', perguntas)).toThrow(/não traz o bloco ```respostas/);
    expect(() => lerRespostasFechadas('```respostas\n{ nao é json\n```', perguntas)).toThrow(/não é JSON/);
    expect(() => lerRespostasFechadas(resposta([...todas({}), { id: 'P9', resposta: 'sim' }]), perguntas)).toThrow(/id "P9", que não é pergunta deste pedido/);
    expect(() => lerRespostasFechadas(resposta([...todas({}), { id: 'P1', resposta: 'sim' }]), perguntas)).toThrow(/P1 foi respondida duas vezes/);
    expect(() => lerRespostasFechadas(resposta(todas({ P2: 'talvez' })), perguntas)).toThrow(/P2 respondeu "talvez"/);
    expect(() => lerRespostasFechadas(resposta(todas({}).slice(0, 4)), perguntas)).toThrow(/sem resposta para P5, P6/);
  });

  it('a nota sai das respostas pela regra: cada parte tira até um ponto, o primeiro critério 3 e os seguintes 1, sem saturar, e "não dá para ver" não conta', () => {
    const base = { P1: 'sim', P2: 'sim', P3: 'sim', P4: 'sim', P5: 'não', P6: 'não' };
    const nota = (mudanca) => notaDasRespostas(perguntas, { ...base, ...mudanca }).nota;
    expect(nota({})).toBe(10);
    expect(nota({ P3: 'não' })).toBe(9);
    expect(nota({ P3: 'não', P4: 'não' })).toBe(8);
    /* a regra de antes dava 8 a dois, três ou quatro defeitos de forma; esta os separa */
    expect(nota({ P1: 'não', P2: 'não', P3: 'não', P4: 'não' })).toBe(6);
    expect(nota({ P5: 'sim' })).toBe(7);
    expect(nota({ P5: 'sim', P3: 'não' })).toBe(6);
    expect(nota({ P5: 'sim', P6: 'sim' })).toBe(6);
    expect(nota({ P1: NAO_DA_PARA_VER, P6: NAO_DA_PARA_VER })).toBe(10);
    expect(notaDasRespostas(perguntas, { ...base, P3: 'não', P5: 'sim' })).toMatchObject({ forma: ['P3'], criterio: ['P5'], tira: { forma: 1, criterio: 1 } });
    const tres = [...perguntas, { id: 'P7', grupo: 'criterio', defeitoSe: 'sim' }];
    expect(notaDasRespostas(tres, { ...base, P5: 'sim', P6: 'sim', P7: 'sim' }).nota).toBe(5);
    expect([notaPelaRegra(0, 0), notaPelaRegra(2.5, 0), notaPelaRegra(0, 0.5), notaPelaRegra(8, 3)]).toEqual([10, 7.5, 8.5, 0]);
  });

  it('a parte de várias afirmações reparte o ponto entre elas, e a pergunta gravada sem peso vale pela origem', () => {
    const dados = { ...DADOS, plano: { ...PLANO, partes: [{ nome: 'garfo', forma: 'garfo reto: cabeça larga e arredondada, duas pernas que afinam, e coluna coaxial à caixa de direção', tecnica: 'loft' }] } };
    const ps = perguntasFechadas(dados).filter((p) => p.origem === 'parte:garfo');
    expect(ps.map((p) => p.texto)).toEqual([
      'A parte `garfo` mostra isto nas imagens: garfo reto?',
      'A parte `garfo` (garfo reto) mostra isto nas imagens: cabeça larga e arredondada?',
      'A parte `garfo` (garfo reto) mostra isto nas imagens: pernas que afinam?',
      'A parte `garfo` (garfo reto) mostra isto nas imagens: coluna coaxial à caixa de direção?',
    ]);
    expect(ps.every((p) => p.peso === 0.25)).toBe(true);
    const todasAs = perguntasFechadas(dados);
    const r = Object.fromEntries(todasAs.map((p) => [p.id, p.grupo === 'criterio' ? 'não' : 'sim']));
    expect(notaDasRespostas(todasAs, { ...r, [ps[1].id]: 'não' }).nota).toBe(9.8);
    expect(montarPedidoFechado(dados, 'a')).toContain(`${ps[1].id}. A parte \`garfo\` (garfo reto) mostra isto nas imagens: cabeça larga e arredondada? (o \`não\` tira 0,25)`);
    const semPeso = [{ id: 'P1', grupo: 'forma', origem: 'parte:a' }, { id: 'P2', grupo: 'forma', origem: 'parte:a' }, { id: 'P3', grupo: 'forma', origem: 'parte:b' }, { id: 'P4', grupo: 'criterio', origem: 'criterio:1' }];
    expect([...pesosDasPerguntas(semPeso).values()]).toEqual([0.5, 0.5, 1, 1]);
  });

  it('a resposta que muda entre as duas ordens sai como não verificável e tira metade do peso na nota das duas', () => {
    const a = { P1: 'sim', P2: 'não', P3: 'sim', P4: 'sim', P5: 'sim', P6: 'não' };
    const b = { P1: 'sim', P2: 'não', P3: 'não', P4: 'sim', P5: 'não', P6: 'não' };
    const j = juntarOrdens(perguntas, a, b);
    expect(j.linhas.filter((l) => l.final === NAO_VERIFICAVEL).map((l) => l.id)).toEqual(['P3', 'P5']);
    expect(j).toMatchObject({ nota: 7, forma: ['P2'], criterio: [], naoVerificaveis: ['P3', 'P5'], porOrdem: { a: 6, b: 8 }, tira: { forma: 1.5, criterio: 0.5 } });
  });

  it('as perguntas que mudam não sobem a nota das duas acima das ordens: dois defeitos em cada, todos diferentes, dão 8 e não 10', () => {
    const ok = { P1: 'sim', P2: 'sim', P3: 'sim', P4: 'sim', P5: 'não', P6: 'não' };
    const j = juntarOrdens(perguntas, { ...ok, P3: 'não', P4: 'não' }, { ...ok, P1: 'não', P2: 'não' });
    expect(j.naoVerificaveis).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(j.forma).toEqual([]);
    expect(j).toMatchObject({ nota: 8, porOrdem: { a: 8, b: 8 } });
    expect(juntarOrdens(perguntas, { ...ok, P3: 'não' }, { ...ok, P3: NAO_DA_PARA_VER }).nota).toBe(9.5);
  });

  it('a variação de cinco notas e as perguntas cuja resposta final mudou entre repetições', () => {
    expect(variacaoDasNotas([5, 7, 5, 6, 7])).toEqual({ notas: [5, 7, 5, 6, 7], minimo: 5, maximo: 7, amplitude: 2, media: 6, desvio: 0.89 });
    const sim = Object.fromEntries(perguntas.map((p) => [p.id, p.grupo === 'criterio' ? 'não' : 'sim']));
    const j1 = juntarOrdens(perguntas, sim, sim);
    const j2 = juntarOrdens(perguntas, sim, { ...sim, P4: 'não' });
    expect(respostasQueMudaram(perguntas, [j1, j2, j1])).toEqual([{ id: 'P4', contagem: { sim: 2, [NAO_VERIFICAVEL]: 1 } }]);
  });

  it('o relatório da junção dá a nota de cada repetição e a variação, e o das notas a do pedido de hoje', () => {
    const a = { arquivo: 'a1.md', texto: resposta(todas({ P3: 'não' }), 9) };
    const b = { arquivo: 'b1.md', texto: resposta(todas({ P3: 'sim' }), 8) };
    const texto = relatorioDaJuncao(perguntas, [{ a, b }, { a, b: a }]);
    expect(texto).toContain('nota pela regra, com as duas ordens: 9,5 (só a ordem A: 9; só a B: 10; o crítico escreveu 9 e 8)');
    expect(texto).toContain('não verificáveis (a resposta mudou entre as ordens): P3 (A não, B sim)');
    expect(texto).toContain('VARIAÇÃO EM 2 REPETIÇÕES');
    expect(texto).toContain('nota pela regra, com as duas ordens: 9,5 / 9; amplitude 0,5');
    expect(relatorioDasNotas([a, b, a])).toContain('VARIAÇÃO EM 3 RESPOSTAS: 9 / 8 / 9; amplitude 1');
    expect(() => relatorioDasNotas([{ arquivo: 'x.md', texto: 'sem veredito' }])).toThrow(/x.md não termina com o veredito JSON/);
  });

  it('--juntar lê as perguntas da pasta e os pares de respostas, e recusa número ímpar de respostas', () => {
    const pasta = mkdtempSync(join(area, 'juntar-'));
    writeFileSync(join(pasta, ARQUIVO_DAS_PERGUNTAS_FECHADAS), JSON.stringify({ formato: FORMATO_DAS_PERGUNTAS_FECHADAS, peca: 'prova/bloco', perguntas }));
    writeFileSync(join(pasta, 'a.md'), resposta(todas({})));
    writeFileSync(join(pasta, 'b.md'), resposta(todas({ P5: 'sim' })));
    const cli = (...args) => spawnSync(process.execPath, [join(import.meta.dirname, 'vistas-para-critica.mjs'), ...args], { encoding: 'utf8', timeout: 20_000 });
    const r = cli(`--juntar=${pasta}`, join(pasta, 'a.md'), join(pasta, 'b.md'));
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('nota pela regra, com as duas ordens: 8,5 (só a ordem A: 10; só a B: 7');
    expect(r.stdout).toContain('P5 (A não, B sim)');
    const impar = cli(`--juntar=${pasta}`, join(pasta, 'a.md'));
    expect(impar.status).toBe(2);
    expect(impar.stderr).toContain('aceito pares, a da ordem A antes da B');
    const notas = cli('--notas', join(pasta, 'a.md'), join(pasta, 'b.md'));
    expect(notas.status).toBe(0);
    expect(notas.stdout).toContain('VARIAÇÃO EM 2 RESPOSTAS: 7 / 7; amplitude 0');
  });

  it('o pacote grava os dados do pedido, e --refazer-pedidos refaz os três pedidos e as perguntas por eles, sem capturar', () => {
    const pasta = mkdtempSync(join(area, 'refazer-'));
    const gravado = gravarPedidos(pasta, DADOS);
    expect(gravado.pedidosFechados.quantas).toBe(perguntas.length);
    const nomes = ['pedido.md', 'pedido-fechado-a.md', 'pedido-fechado-b.md', ARQUIVO_DAS_PERGUNTAS_FECHADAS];
    const antes = nomes.map((n) => readFileSync(join(pasta, n), 'utf8'));
    expect(antes[1]).toBe(A);
    for (const n of nomes) rmSync(join(pasta, n));
    refazerPedidos(pasta);
    expect(nomes.map((n) => readFileSync(join(pasta, n), 'utf8'))).toEqual(antes);
    const cli = spawnSync(process.execPath, [join(import.meta.dirname, 'vistas-para-critica.mjs'), `--refazer-pedidos=${pasta}`], { encoding: 'utf8', timeout: 20_000 });
    expect(cli.status).toBe(0);
    expect(cli.stdout).toContain(`(${perguntas.length} perguntas fechadas)`);
    const vazia = mkdtempSync(join(area, 'refazer-vazia-'));
    expect(() => refazerPedidos(vazia)).toThrow(new RegExp(`não achei .*${ARQUIVO_DOS_DADOS_DO_PEDIDO}`));
  });
});

/* ---------- a forma prometida em afirmações ---------- */

describe('a forma prometida em afirmações que se veem, sem medida nem contagem', () => {
  it('tira a medida com unidade, a coordenada, o intervalo e a contagem antes do nome', () => {
    expect(semMedidas('pneu de 48 mm de largura e 42 mm de altura, com sulcos, assentado no aro')).toBe('pneu, com sulcos, assentado no aro');
    expect(semMedidas('pinhão de 16 dentes no cubo traseiro, no plano da coroa')).toBe('pinhão com dentes no cubo traseiro, no plano da coroa');
    expect(semMedidas('ligando a coroa à catraca por dois trechos retos e dois enrolamentos')).toBe('ligando a coroa à catraca por trechos retos e enrolamentos');
    expect(semMedidas('placa clara de 618 por 265 por 88 mm, de y 309 a 574, saindo do para-choque até z 3044')).toBe('placa clara, saindo do para-choque');
    expect(semMedidas('sai da mesa subindo em cerca de 30 graus por uns 70 mm e segue subindo suave, uns 6 graus, até as pontas')).toBe('sai da mesa subindo e segue subindo suave, até as pontas');
    expect(semMedidas('a fresta de 6 mm em 380 entre ele e a parte presa')).toBe('a fresta entre ele e a parte presa');
    expect(semMedidas('bulbo de 6 mm de raio e 30 de comprimento com flange')).toBe('bulbo com flange');
    expect(semMedidas('coroa e catraca fora do mesmo plano x')).toBe('coroa e catraca fora do mesmo plano x');
  });

  it('parte nas vírgulas de fora dos parênteses, junta o pedaço curto ao vizinho e põe o nome antes dos dois-pontos primeiro', () => {
    expect(afirmacoesDaForma('pneu de 48 mm de largura e 42 mm de altura, com sulcos, assentado no aro da roda dianteira').afirmacoes)
      .toEqual(['pneu, com sulcos', 'assentado no aro da roda dianteira']);
    expect(afirmacoesDaForma('tubos redondos: superior, inferior (mais grosso), do selim, caixa de direção grossa')).toEqual({
      nome: 'tubos redondos', afirmacoes: ['tubos redondos', 'superior, inferior (mais grosso), do selim', 'caixa de direção grossa'],
    });
    expect(afirmacoesDaForma('eixo com tampa e dois braços opostos, achatados e afunilados, no movimento central').afirmacoes)
      .toEqual(['eixo com tampa e braços opostos, achatados e afunilados, no movimento central']);
    expect(afirmacoesDaForma('cubo com porcas, 36 raios cruzados e aro, centrados entre as pernas do garfo').afirmacoes)
      .toEqual(['cubo com porcas', 'raios cruzados e aro', 'centrados entre as pernas do garfo']);
    expect(afirmacoesDaForma('30,4 por 23,6 por 2 mm, cantos de 3 mm, x 202,9 a 233,3, y 287,7 a 311,3')).toEqual({ nome: null, afirmacoes: [] });
    expect(afirmacoesDaForma('cubo com porcas, 36 raios cruzados e aro')).toEqual(afirmacoesDaForma('cubo com porcas, 36 raios cruzados e aro.'));
  });

  it('a parte só de medidas vira a pergunta de que ela aparece, e o critério sai sem medida', () => {
    const dados = { ...DADOS, plano: { ...PLANO, partes: [{ nome: 'botao', forma: '30,4 por 23,6 por 2 mm, x 202,9 a 233,3', tecnica: 'caixa' }], criteriosDeReprovacao: ['guidão diferente da vista frontal: largura perto de 722 mm, pontas subindo', 'folga de 2 mm'] } };
    const ps = perguntasFechadas(dados);
    expect(ps.find((p) => p.origem === 'parte:botao').texto).toBe('A parte `botao` aparece nas imagens?');
    expect(ps.filter((p) => p.grupo === 'criterio').map((p) => p.texto)).toEqual([
      'As imagens mostram isto: guidão diferente da vista frontal: largura, pontas subindo?', 'As imagens mostram isto: folga de 2 mm?',
    ]);
  });
});

/* ---------- a pasta por rodada, a resolução e a câmera no pacote, e o antes e depois (plano das ferramentas das rodadas, fatia 4) ---------- */

/** Um PNG de uma cor só, do tamanho dado. */
function pngLiso(largura, altura, cor = [10, 200, 30]) {
  const png = new PNG({ width: largura, height: altura });
  for (let i = 0; i < png.data.length; i += 4) { png.data[i] = cor[0]; png.data[i + 1] = cor[1]; png.data[i + 2] = cor[2]; png.data[i + 3] = 255; }
  return PNG.sync.write(png);
}

/* a bancada falsa que grava PNG de verdade, na resolução pedida (ou na de `forcar`), e devolve a vista e o enquadramento de cada um */
function bancadaDePng(pasta, peca, { forcar = null } = {}) {
  const chamadas = [];
  let feitas = 0;
  const fazer = async (opcoes) => {
    chamadas.push(opcoes);
    const vistas = opcoes.revisar ? ['isometrica', 'frontal', 'direita', 'superior'] : String(opcoes.vistas).split(',');
    const [largura, altura] = (forcar ?? opcoes.res).split('x').map(Number);
    const sufixo = [opcoes.selecionadas ? `sel-${opcoes.selecionadas}` : null, opcoes.modo ?? null, opcoes.projecao === 'ortografica' ? 'orto' : null, opcoes.focar ? 'focado' : null,
      opcoes.arame === 'raio-x' ? 'raio-x' : (opcoes.arame ? 'arame' : null)].filter(Boolean).join('-');
    const arquivos = vistas.map((vista) => {
      const arquivo = join(pasta, `${prefixoDaPeca(peca)}${vista}${sufixo ? `-${sufixo}` : ''}.png`);
      /* cada imagem de uma cor: a ferramenta recusa duas vistas iguais byte a byte */
      feitas += 1;
      writeFileSync(arquivo, pngLiso(largura, altura, [feitas, 200, 30]));
      return arquivo;
    });
    return { ok: true, resultado: { arquivos, vistas: vistas.map((nome) => ({ nome, enquadramento: { valida: true, largura: 0.8, altura: 0.5, area: 0.4, cortado: false } })) } };
  };
  return { fazer, chamadas };
}

describe('a pasta do pacote por rodada', () => {
  const PECA = 'tools/fixtures/referencia-do-plano/presente/receita.js';
  const montar = (base, extra = {}, bancada = bancadaDePng(base, PECA)) => vistasParaCritica(PECA, {
    pastaDasCapturas: base, ...extra, dependencias: { medirReceita: medirPassa, olharBancada: bancada.fazer, rodadasAnteriores: () => [], numeroDaRodada: async () => 3, ...(extra.dependencias ?? {}) },
  }).then((resultado) => ({ resultado, bancada }));

  it('grava o pacote inteiro em critica-<peça>/rodada-NN, guarda a anterior, apaga as mais antigas e não toca no que não é pasta de rodada', async () => {
    const base = mkdtempSync(join(area, 'numerada-'));
    const daPeca = pastaDaRodada(PECA, base);
    for (const n of ['rodada-01', 'rodada-02']) { mkdirSync(join(daPeca, n), { recursive: true }); writeFileSync(join(daPeca, n, 'pedido.md'), n); }
    /* o que não é pasta de rodada fica: uma pasta de outro nome e um arquivo chamado como rodada */
    mkdirSync(join(daPeca, 'guardado'));
    writeFileSync(join(daPeca, 'guardado', 'nota.txt'), 'fica');
    writeFileSync(join(daPeca, 'rodada-00'), 'arquivo, e não pasta');
    /* o pacote solto na pasta da peça, de antes da pasta por rodada, e a pasta de outra peça ao lado */
    writeFileSync(join(daPeca, 'pedido.md'), 'pedido velho');
    const vizinha = join(base, 'critica-outra-peca', 'rodada-01');
    mkdirSync(vizinha, { recursive: true });
    const { resultado } = await montar(base);
    const pasta = join(daPeca, 'rodada-03');
    expect(resultado.pasta).toBe(pasta);
    expect(resultado.rodada).toBe(3);
    expect(resultado.pedido).toBe(join(pasta, 'pedido.md'));
    expect(resultado.manifesto).toBe(join(pasta, 'pacote.json'));
    expect(resultado.pacoteAnterior).toBe(join(daPeca, 'rodada-02'));
    expect(readdirSync(daPeca).sort()).toEqual(['guardado', 'rodada-00', 'rodada-02', 'rodada-03']);
    expect(readFileSync(join(daPeca, 'rodada-02', 'pedido.md'), 'utf8')).toBe('rodada-02');
    expect(existsSync(vizinha)).toBe(true);
    /* nenhuma captura da peça ficou na pasta comum, e o pedido cita as da pasta da rodada */
    expect(readdirSync(base).filter((n) => n.startsWith(prefixoDaPeca(PECA)))).toEqual([]);
    const pedido = readFileSync(resultado.pedido, 'utf8');
    for (const arquivo of resultado.conjunto.resultado.arquivos) { expect(dirname(arquivo)).toBe(pasta); expect(existsSync(arquivo)).toBe(true); expect(pedido).toContain(arquivo); }
    const relato = imprimir(resultado);
    expect(relato).toContain('PASTA DO PACOTE (rodada 3, a próxima a registrar');
    expect(relato).toContain(`a anterior ficou em ${join(daPeca, 'rodada-02')}`);
    /* a segunda vez na mesma rodada refaz a pasta dela e não apaga a anterior */
    const outra = await montar(base);
    expect(outra.resultado.pasta).toBe(pasta);
    expect(readdirSync(daPeca).sort()).toEqual(['guardado', 'rodada-00', 'rodada-02', 'rodada-03']);
  }, 60_000);

  it('a primeira rodada não tem anterior, e a pasta de número maior que a próxima a registrar fica, com aviso', async () => {
    const base = mkdtempSync(join(area, 'primeira-'));
    const daPeca = pastaDaRodada(PECA, base);
    mkdirSync(join(daPeca, 'rodada-07'), { recursive: true });
    const { resultado } = await montar(base, { dependencias: { numeroDaRodada: async () => 1 } });
    expect(resultado.pasta).toBe(join(daPeca, 'rodada-01'));
    expect(resultado.pacoteAnterior).toBeNull();
    expect(existsSync(join(daPeca, 'rodada-07'))).toBe(true);
    expect(resultado.avisos.join('\n')).toContain('tem pacote de rodada de número maior que a 1');
    expect(imprimir(resultado)).toContain('não há pacote de rodada anterior desta peça');
  }, 60_000);

  it('--saida continua valendo: o pacote inteiro vai para ela, sem número, e nenhuma pasta de rodada é apagada', async () => {
    const base = mkdtempSync(join(area, 'saida-'));
    const daPeca = pastaDaRodada(PECA, base);
    for (const n of ['rodada-01', 'rodada-02', 'rodada-03']) mkdirSync(join(daPeca, n), { recursive: true });
    const pasta = join(base, 'onde-eu-quis');
    const { resultado } = await montar(base, { saida: pasta, dependencias: { numeroDaRodada: async () => { throw new Error('com --saida o número não é pedido'); } } });
    expect(resultado.pasta).toBe(pasta);
    expect(resultado.rodada).toBeNull();
    expect(readdirSync(daPeca).sort()).toEqual(['rodada-01', 'rodada-02', 'rodada-03']);
    expect(readdirSync(base).filter((n) => n.startsWith(prefixoDaPeca(PECA)))).toEqual([]);
    expect(readdirSync(pasta).filter((n) => n.startsWith(prefixoDaPeca(PECA))).length).toBe(resultado.imagens.filter((i) => i.tipo !== 'outra').length);
    expect(JSON.parse(readFileSync(resultado.manifesto, 'utf8')).rodada).toBeNull();
    expect(imprimir(resultado)).toContain('PASTA DO PACOTE (a de --saida');
  }, 60_000);

  it('apagarPacotesAntigos e pacotesDaPeca só veem pastas rodada-NN', () => {
    const daPeca = mkdtempSync(join(area, 'antigos-'));
    for (const n of ['rodada-02', 'rodada-05', 'rodada-06', 'rodada-10', 'rodada-x', 'superficie']) mkdirSync(join(daPeca, n));
    expect(pacotesDaPeca(daPeca).map((p) => p.numero)).toEqual([2, 5, 6, 10]);
    expect(pacotesDaPeca(join(daPeca, 'nao-existe'))).toEqual([]);
    const feito = apagarPacotesAntigos(daPeca, 7);
    expect(feito.anterior.numero).toBe(6);
    expect(feito.apagadas.map((p) => p.numero)).toEqual([2, 5]);
    expect(feito.adiante.map((p) => p.numero)).toEqual([10]);
    expect(readdirSync(daPeca).sort()).toEqual(['rodada-06', 'rodada-10', 'rodada-x', 'superficie']);
  });
});

describe('a resolução e a câmera de cada imagem no pacote', () => {
  const PECA = 'tools/fixtures/referencia-do-plano/presente/receita.js';

  it('o tipo da captura sai das opções dela, e cada tipo tem uma resolução só', () => {
    expect(tipoDaCaptura({ revisar: true })).toBe('conjunto');
    expect(tipoDaCaptura({ vistas: 'traseira', projecao: 'ortografica' })).toBe('conjunto');
    expect(tipoDaCaptura({ arame: true })).toBe('arame');
    expect(tipoDaCaptura({ arame: 'raio-x' })).toBe('raio-x');
    expect(tipoDaCaptura({ selecionadas: 'bloco', modo: 'isolar' })).toBe('parte');
    expect(tipoDaCaptura({ selecionadas: 'bloco', mirar: [0, 0, 0] })).toBe('de-perto');
    expect(tipoDaCaptura({ visao: 'zebra' })).toBe('reflexo');
    expect(tipoDaCaptura({ visao: 'pintura' })).toBe('reflexo');
    expect(tipoDaCaptura({ visao: 'luz-rasante' })).toBe('superficie');
    expect(tipoDaCaptura({ visao: 'curvatura' })).toBe('superficie');
    expect(RESOLUCAO_POR_TIPO).toEqual({ conjunto: '1100x1450', arame: '1100x1450', 'raio-x': '1100x1450', parte: '900x900', 'de-perto': '900x900', reflexo: '900x900', superficie: '900x900', montada: '1200x1000' });
    expect(Object.isFrozen(RESOLUCAO_POR_TIPO)).toBe(true);
  });

  it('a resolução é lida do cabeçalho do PNG, e o que não é PNG fica sem ela', () => {
    expect(resolucaoDoPng(pngLiso(7, 5))).toEqual({ largura: 7, altura: 5 });
    expect(resolucaoDoPng(Buffer.from('não é imagem, é texto de mais de vinte e quatro bytes'))).toBeNull();
    expect(resolucaoDoPng(Buffer.alloc(3))).toBeNull();
  });

  it('cada captura sai na resolução do tipo, e o pacote.json grava a resolução medida e a câmera de cada imagem', async () => {
    const base = mkdtempSync(join(area, 'resolucao-'));
    const bancada = bancadaDePng(base, PECA);
    const resultado = await vistasParaCritica(PECA, { saida: join(base, 'rodada'), pastaDasCapturas: base, dependencias: { medirReceita: medirPassa, olharBancada: bancada.fazer, rodadasAnteriores: () => [] } });
    for (const c of bancada.chamadas) expect(c.res).toBe(RESOLUCAO_POR_TIPO[tipoDaCaptura(c)]);
    const manifesto = JSON.parse(readFileSync(resultado.manifesto, 'utf8'));
    expect(manifesto.resolucoes).toEqual({ ...RESOLUCAO_POR_TIPO });
    expect(manifesto.imagens).toEqual(resultado.imagens);
    const capturadas = bancada.chamadas.flatMap((c) => (c.revisar ? ['isometrica', 'frontal', 'direita', 'superior'] : String(c.vistas).split(',')));
    expect(manifesto.imagens.length).toBe(capturadas.length);
    for (const i of manifesto.imagens) {
      expect(existsSync(join(resultado.pasta, i.arquivo))).toBe(true);
      expect(`${i.resolucao.largura}x${i.resolucao.altura}`).toBe(RESOLUCAO_POR_TIPO[i.tipo]);
      expect(i.pedida).toBe(RESOLUCAO_POR_TIPO[i.tipo]);
      expect(i.camera.vista).toBe(i.vista);
      expect(i.camera.enquadramento).toEqual({ largura: 0.8, altura: 0.5, area: 0.4, cortado: false });
    }
    const frontal = manifesto.imagens.find((i) => i.arquivo === `${prefixoDaPeca(PECA)}frontal.png`);
    expect(frontal).toMatchObject({ tipo: 'conjunto', vista: 'frontal', resolucao: { largura: 1100, altura: 1450 }, camera: { vista: 'frontal', revisar: true } });
    const arame = manifesto.imagens.find((i) => i.tipo === 'arame' && i.vista === 'traseira');
    expect(arame.camera).toMatchObject({ projecao: 'ortografica', arame: true });
    expect(manifesto.imagens.find((i) => i.tipo === 'raio-x').camera.arame).toBe('raio-x');
    expect(resultado.avisos.filter((a) => a.includes('saiu em'))).toEqual([]);
  }, 60_000);

  it('a imagem que sai fora da resolução do tipo vira aviso, com as duas resoluções', async () => {
    const base = mkdtempSync(join(area, 'fora-da-resolucao-'));
    const bancada = bancadaDePng(base, PECA, { forcar: '8x6' });
    const resultado = await vistasParaCritica(PECA, { saida: join(base, 'rodada'), pastaDasCapturas: base, dependencias: { medirReceita: medirPassa, olharBancada: bancada.fazer, rodadasAnteriores: () => [] } });
    expect(resultado.avisos.join('\n')).toContain(`a imagem ${prefixoDaPeca(PECA)}frontal.png saiu em 8x6, e a resolução do tipo 'conjunto' é 1100x1450`);
  }, 60_000);

  it('as vistas de superfície, as montadas e a conferência do Blender entram com a câmera, e o resto da pasta como outra', () => {
    const pasta = mkdtempSync(join(area, 'imagens-'));
    mkdirSync(join(pasta, 'superficie'));
    mkdirSync(join(pasta, 'conferencia-do-blender', 'superficie'), { recursive: true });
    mkdirSync(join(pasta, PASTA_DO_ANTES_E_DEPOIS));
    const por = (nome, l, a) => { const arquivo = join(pasta, nome); writeFileSync(arquivo, pngLiso(l, a)); return arquivo; };
    const superficie = { rasante: [{ arquivo: por('superficie/peca-lado-rasante-az30.png', 9, 9), vista: 'lado', azimute: 30, elevacao: 10 }], curvatura: [{ arquivo: por('superficie/peca-lado-curvatura-legenda.png', 9, 12), vista: 'lado' }] };
    const conferenciaDoBlender = { rasante: [{ arquivo: por('conferencia-do-blender/superficie/peca-lado-rasante-az30.png', 16, 12), vista: 'lado', azimute: 30 }], curvatura: [] };
    const montada = { instancia: 'motor', arquivos: [por('etapas-frontal.png', 12, 10)], enquadramentos: [{ vista: 'frontal', largura: 0.5, altura: 0.4, cortado: false }] };
    por('sobreposicao-x.png', 5, 4);
    por(`${PASTA_DO_ANTES_E_DEPOIS}/feita-antes.png`, 5, 4);
    writeFileSync(join(pasta, 'pedido.md'), 'texto');
    const imagens = imagensDoPacote({ pasta, peca: 'x/y', superficie, montada, conferenciaDoBlender });
    expect(imagens).toEqual([
      { arquivo: 'superficie/peca-lado-rasante-az30.png', tipo: 'superficie', vista: 'lado', camera: { vista: 'lado', visao: 'luz-rasante', azimuteDaLuz: 30, elevacaoDaLuz: 10 }, resolucao: { largura: 9, altura: 9 } },
      { arquivo: 'superficie/peca-lado-curvatura-legenda.png', tipo: 'superficie', vista: 'lado', camera: { vista: 'lado', visao: 'curvatura' }, resolucao: { largura: 9, altura: 12 } },
      { arquivo: 'conferencia-do-blender/superficie/peca-lado-rasante-az30.png', tipo: 'blender', vista: 'lado', camera: { vista: 'lado', visao: 'luz-rasante', azimuteDaLuz: 30 }, resolucao: { largura: 16, altura: 12 } },
      { arquivo: 'etapas-frontal.png', tipo: 'montada', vista: 'frontal', pedida: '1200x1000', camera: { vista: 'frontal', foco: 'motor', enquadramento: { largura: 0.5, altura: 0.4, cortado: false } }, resolucao: { largura: 12, altura: 10 } },
      { arquivo: 'sobreposicao-x.png', tipo: 'outra', vista: null, camera: null, resolucao: { largura: 5, altura: 4 } },
    ]);
  });
});

describe('o antes e depois de uma imagem entre a rodada atual e a anterior', () => {
  const PECA = 'carro-de-ensaio/lataria';
  const IMAGEM = 'bancada-carro-de-ensaio-lataria-direita-visao-zebra-enquadrado.png';
  const CAMERA = { vista: 'direita', visao: 'zebra', enquadrar: true, enquadramento: { largura: 0.9, altura: 0.4, area: 0.36, cortado: false } };
  const VERDE = [10, 200, 30];
  const AZUL = [20, 40, 220];

  /* dois pacotes numerados de uma peça, com a mesma imagem em cores diferentes; `mudar` altera o manifesto de um deles antes de gravar */
  function pacotes({ mudarAnterior = (d) => d, mudarAtual = (d) => d, tamanhoAnterior = [8, 6], tamanhoAtual = [8, 6] } = {}) {
    const base = mkdtempSync(join(area, 'par-'));
    const daPeca = pastaDaRodada(PECA, base);
    const um = (numero, cor, [l, a], mudar) => {
      const pasta = join(daPeca, nomeDaPastaDoPacote(numero));
      mkdirSync(pasta, { recursive: true });
      writeFileSync(join(pasta, IMAGEM), pngLiso(l, a, cor));
      writeFileSync(join(pasta, 'outra-direita-visao-zebra.png'), pngLiso(l, a, cor));
      const dado = mudar({
        formato: 'modelar.pacote-do-critico', versao: 1, peca: PECA, receita: `sha256:${String(numero).repeat(8)}abcdef`, rodada: numero,
        imagens: [
          { arquivo: IMAGEM, tipo: 'reflexo', vista: 'direita', pedida: '900x900', camera: CAMERA, resolucao: { largura: l, altura: a } },
          { arquivo: 'outra-direita-visao-zebra.png', tipo: 'outra', vista: null, camera: null, resolucao: { largura: l, altura: a } },
        ],
      });
      if (dado !== null) writeFileSync(join(pasta, 'pacote.json'), typeof dado === 'string' ? dado : JSON.stringify(dado));
      return pasta;
    };
    const anterior = um(6, VERDE, tamanhoAnterior, mudarAnterior);
    const atual = um(7, AZUL, tamanhoAtual, mudarAtual);
    return { base, daPeca, anterior, atual };
  }
  const feito = (p, imagem = IMAGEM) => antesEDepois(PECA, { ...pastasDoAntesEDepois(PECA, { base: p.base }), imagem });
  const recusa = (p, imagem = IMAGEM) => { try { feito(p, imagem); } catch (erro) { return erro.message; } return null; };
  const corEm = (png, x, y) => { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };

  it('põe a anterior à esquerda e a atual à direita, com o nome e a receita de cada uma, e grava no pacote atual', () => {
    const p = pacotes();
    expect(pastasDoAntesEDepois(PECA, { base: p.base })).toEqual({ atual: p.atual, anterior: p.anterior });
    const r = feito(p);
    expect(r.arquivo).toBe(join(p.atual, PASTA_DO_ANTES_E_DEPOIS, IMAGEM));
    expect(r.antes).toMatchObject({ pasta: p.anterior, nome: 'rodada-06', receita: 'sha256:66666666abcdef' });
    expect(r.depois).toMatchObject({ pasta: p.atual, nome: 'rodada-07', receita: 'sha256:77777777abcdef' });
    expect(r.resolucao).toEqual({ largura: 8, altura: 6 });
    expect(r.camera).toEqual({ vista: 'direita', visao: 'zebra', enquadrar: true });
    expect(r.avisos).toEqual([]);
    const png = PNG.sync.read(readFileSync(r.arquivo));
    /* duas imagens de 8 por 6, três margens de 16 e a faixa dos nomes de 64 em cima */
    expect([png.width, png.height]).toEqual([8 + 8 + 3 * 16, 64 + 6 + 16]);
    expect(corEm(png, 16 + 3, 64 + 3)).toEqual(VERDE);
    expect(corEm(png, 16 + 8 + 16 + 3, 64 + 3)).toEqual(AZUL);
    expect(corEm(png, 16 + 8 + 4, 64 + 3)).toEqual([255, 255, 255]);
    /* os nomes estão escritos: há tinta na faixa de cima, dos dois lados */
    const tinta = (x0, x1) => { let n = 0; for (let y = 30; y < 60; y++) for (let x = x0; x < x1; x++) if (corEm(png, x, y).join() !== '255,255,255') n += 1; return n; };
    expect(tinta(16, 24)).toBeGreaterThan(0);
    expect(tinta(40, 48)).toBeGreaterThan(0);
    const relato = relatorioDoAntesEDepois(PECA, r);
    expect(relato).toContain(`antes (à esquerda): ${p.anterior}, receita sha256:66666666abcdef; a peça ocupa 90 % da largura e 40 % da altura do quadro`);
    expect(relato).toContain(`depois (à direita): ${p.atual}`);
    expect(relato).toContain('8x6 cada lado');
    /* o trecho que só uma imagem tem vale como o nome inteiro, e o nome exato ganha do trecho */
    expect(feito(p, 'lataria-direita').imagem).toBe(IMAGEM);
    expect(feito(p, 'outra-direita-visao-zebra.png').imagem).toBe('outra-direita-visao-zebra.png');
  });

  it('as pastas dadas ganham das numeradas, e o antes e depois já feito não entra no pacote seguinte como imagem', () => {
    const p = pacotes();
    const fora = mkdtempSync(join(area, 'guardado-'));
    for (const n of readdirSync(p.anterior)) writeFileSync(join(fora, n), readFileSync(join(p.anterior, n)));
    expect(pastasDoAntesEDepois(PECA, { base: p.base, anterior: fora })).toEqual({ atual: p.atual, anterior: fora });
    expect(pastasDoAntesEDepois(PECA, { base: join(p.base, 'vazia'), atual: p.atual, anterior: fora })).toEqual({ atual: p.atual, anterior: fora });
    const r = antesEDepois(PECA, { atual: p.atual, anterior: fora, imagem: IMAGEM });
    expect(r.antes.nome).toBe(basename(fora));
    expect(imagensDoPacote({ pasta: p.atual, peca: PECA }).map((i) => i.arquivo)).toEqual([IMAGEM, 'outra-direita-visao-zebra.png']);
  });

  it('avisa quando o enquadramento mudou entre as duas, porque a escala das imagens deixa de ser a mesma', () => {
    const maior = { ...CAMERA, enquadramento: { ...CAMERA.enquadramento, altura: CAMERA.enquadramento.altura + 2 * FOLGA_DO_ENQUADRAMENTO } };
    const p = pacotes({ mudarAtual: (d) => ({ ...d, imagens: d.imagens.map((i) => (i.camera ? { ...i, camera: maior } : i)) }) });
    const r = feito(p);
    expect(r.avisos).toEqual(['a peça ocupava 90 % da largura e 40 % da altura do quadro antes e ocupa 90 % da largura e 42 % da altura depois: a bancada enquadra pela caixa da peça, a caixa mudou, e a escala das duas imagens não é a mesma.']);
    expect(relatorioDoAntesEDepois(PECA, r)).toContain('AVISO: a peça ocupava');
  });

  it('recusa quando a anterior não existe, dizendo o que achou e o comando', () => {
    const p = pacotes();
    rmSync(p.anterior, { recursive: true });
    expect(() => pastasDoAntesEDepois(PECA, { base: p.base })).toThrow(`achou só o pacote de ${p.atual}, e a anterior não existe em ${p.daPeca}; esperado dois pacotes`);
    expect(() => pastasDoAntesEDepois(PECA, { base: p.base })).toThrow(`npm run vistas:critica -- ${PECA} --antes-e-depois=<imagem> --pacote-anterior=<pasta>`);
    /* a pasta de número maior que a atual dada não serve de anterior */
    expect(() => pastasDoAntesEDepois(PECA, { base: p.base, atual: join(p.base, 'avulsa') })).not.toThrow();
  });

  it('recusa quando a peça não tem pacote numerado nenhum', () => {
    const base = mkdtempSync(join(area, 'sem-pacote-'));
    expect(() => pastasDoAntesEDepois(PECA, { base })).toThrow(`não achou pacote em ${pastaDaRodada(PECA, base)} (nenhuma pasta rodada-NN); esperado o pacote desta rodada e o da anterior`);
  });

  it('recusa a pasta sem pacote.json, o pacote.json que não é JSON e o pacote gravado antes de listar as imagens', () => {
    expect(recusa(pacotes({ mudarAnterior: () => null }))).toContain('como pacote anterior a pasta');
    expect(recusa(pacotes({ mudarAnterior: () => null }))).toContain('que não tem pacote.json; esperado o pacote que o vistas:critica grava');
    expect(recusa(pacotes({ mudarAtual: () => '{ quebrado' }))).toContain('que não é JSON válido');
    const antigo = recusa(pacotes({ mudarAnterior: ({ imagens: _fora, ...resto }) => resto }));
    expect(antigo).toContain('o pacote anterior em');
    expect(antigo).toContain('não lista as imagens com a resolução e a câmera');
    expect(antigo).toContain(`npm run vistas:critica -- ${PECA}`);
    expect(recusa(pacotes({ mudarAtual: (d) => ({ ...d, formato: 'outro' }) }))).toContain('o pacote atual em');
  });

  it('recusa o pacote de outra peça', () => {
    const m = recusa(pacotes({ mudarAnterior: (d) => ({ ...d, peca: 'outra/peca' }) }));
    expect(m).toContain(`é da peça 'outra/peca', e o antes e depois foi pedido para '${PECA}'; esperado dois pacotes da mesma peça`);
    expect(m).toContain('--pacote-anterior=<pasta>');
  });

  it('recusa a imagem que o pacote atual não tem, listando as que tem, e o trecho que casa com mais de uma', () => {
    const p = pacotes();
    const falta = recusa(p, 'frontal-visao-zebra');
    expect(falta).toContain('recebeu a imagem "frontal-visao-zebra", que o pacote atual');
    expect(falta).toContain(`não tem; esperado o nome de uma destas, ou um trecho que só uma tenha:\n  ${IMAGEM}\n  outra-direita-visao-zebra.png`);
    const vazia = recusa(p, '');
    expect(vazia).toContain('recebeu a imagem ""');
    const duas = recusa(p, 'direita-visao-zebra');
    expect(duas).toContain('recebeu "direita-visao-zebra", que casa com 2 imagens do pacote atual; esperado um trecho que só uma tenha');
    expect(duas).toContain(`  ${IMAGEM}\n  outra-direita-visao-zebra.png`);
  });

  it('recusa a imagem que a rodada anterior não capturou', () => {
    const m = recusa(pacotes({ mudarAnterior: (d) => ({ ...d, imagens: d.imagens.slice(1) }) }));
    expect(m).toContain(`recebeu a imagem ${IMAGEM}, e o pacote anterior`);
    expect(m).toContain('a rodada anterior não capturou essa vista, ou a capturou com outro nome e outra câmera');
  });

  it('recusa quando a câmera difere, dizendo as duas, e o enquadramento medido não conta como câmera', () => {
    const girada = { ...CAMERA, anguloDaZebra: 90 };
    const m = recusa(pacotes({ mudarAnterior: (d) => ({ ...d, imagens: d.imagens.map((i) => (i.camera ? { ...i, camera: girada } : i)) }) }));
    expect(m).toContain(`o antes e depois de ${IMAGEM} recebeu duas câmeras diferentes: a anterior foi tirada com {"anguloDaZebra":90,"enquadrar":true,"visao":"zebra","vista":"direita"} e a atual com {"enquadrar":true,"visao":"zebra","vista":"direita"}`);
    expect(m).toContain('esperado a mesma câmera nas duas');
    /* a luz que a bancada escolheu também é câmera */
    const outraLuz = recusa(pacotes({ mudarAtual: (d) => ({ ...d, imagens: d.imagens.map((i) => (i.camera ? { ...i, camera: { ...CAMERA, azimuteDaLuz: 120 } } : i)) }) }));
    expect(outraLuz).toContain('recebeu duas câmeras diferentes');
  });

  it('recusa quando a resolução difere, dizendo as duas e a do tipo', () => {
    const resolucao = (l, a) => (d) => ({ ...d, imagens: d.imagens.map((i) => ({ ...i, resolucao: { largura: l, altura: a } })) });
    const m = recusa(pacotes({ tamanhoAnterior: [12, 6], mudarAnterior: resolucao(12, 6) }));
    expect(m).toContain(`o antes e depois de ${IMAGEM} recebeu duas resoluções diferentes: a anterior tem 12x6 e a atual 8x6; esperado a mesma resolução nas duas (a do tipo 'reflexo', 900x900)`);
    const semMedida = recusa(pacotes({ mudarAnterior: (d) => ({ ...d, imagens: d.imagens.map((i) => ({ ...i, resolucao: null })) }) }));
    expect(semMedida).toContain('a anterior tem sem resolução lida e a atual 8x6');
  });

  it('recusa a imagem que o pacote cita e sumiu do disco', () => {
    const p = pacotes();
    rmSync(join(p.anterior, IMAGEM));
    expect(recusa(p)).toContain(`que o pacote.json de ${p.anterior} cita e não existe mais no disco`);
  });

  describe('pela linha de comando', () => {
    const rodar = (...args) => spawnSync(process.execPath, [join(import.meta.dirname, 'vistas-para-critica.mjs'), ...args], { encoding: 'utf8', timeout: 30_000 });

    it('monta o par com as duas pastas dadas e sai com 0; a recusa sai com 1 e o uso errado com 2', () => {
      const p = pacotes();
      const r = rodar(PECA, `--antes-e-depois=${IMAGEM}`, `--pacote-atual=${p.atual}`, `--pacote-anterior=${p.anterior}`);
      expect(r.stderr).toBe('');
      expect(r.status).toBe(0);
      expect(r.stdout).toContain(join(p.atual, PASTA_DO_ANTES_E_DEPOIS, IMAGEM));
      expect(existsSync(join(p.atual, PASTA_DO_ANTES_E_DEPOIS, IMAGEM))).toBe(true);
      const recusada = rodar(PECA, '--antes-e-depois=nao-ha', `--pacote-atual=${p.atual}`, `--pacote-anterior=${p.anterior}`);
      expect(recusada.status).toBe(1);
      expect(recusada.stderr).toContain('que o pacote atual');
      const errada = rodar(PECA, '--antes-e-depois');
      expect(errada.status).toBe(2);
      expect(errada.stderr).toContain('--antes-e-depois=<imagem>');
      expect(AJUDA).toContain('--antes-e-depois=<imagem> [--pacote-atual=<pasta>] [--pacote-anterior=<pasta>]');
    }, 90_000);
  });
});
