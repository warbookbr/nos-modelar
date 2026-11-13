/* vistas-para-critica.test.mjs — o pacote que a crítica visual recebe: o prefixo que apaga as imagens velhas pega só as da peça pedida,
   a unidade do alvo sai das formas que o `REFINA.esboco` liga, o pedido sai da receita na ordem combinada, com o lado de cada vista e o
   limite do veredito, e o pacote inteiro, com as capturas trocadas por gravadores de arquivo, junta o alvo, o montado e a sobreposição.
   O pedido de uma receita de prova (o bloco furado, que refina um esboço) e o de uma peça de montagem (o motor do avião) são lidos de
   verdade, e só o que custa navegador é trocado. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { lerPergunta } from '../../src/autoria/perguntas-do-critico.js';
import {
  ELEVACOES_DA_LUZ_RASANTE, LIMITE_DO_VEREDITO, PERGUNTA_DO_ALVO, PRAZO_DA_CAPTURA_MONTADA_MS, VISTAS_MONTADAS, ladoDaVista, montagemDaPeca, montarPedido, pastaDaRodada, prefixoDaPeca, referenciasDoPlano,
  DISTANCIA_DE_PERTO_MM, campoDePertoMm, MOTIVO_SEM_MEDIR, ReceitaReprovada, decidirLuzRasante, imprimir, fracaoVisivelDaPeca, lerReferenciasExternas, luzRasanteDoPacote, primeiraQuePassa, unidadeDoAlvo, vistaDoArquivo, vistasMontadasVisiveis, vistasParaCritica, vistasRepetidas,
} from './vistas-para-critica.mjs';

const area = mkdtempSync(join(tmpdir(), 'vistas-critica-'));
/* A medição da receita trocada por uma que passa: o pacote mede antes de capturar, e os testes do pacote não pagam a medição real. */
const medirPassa = async () => ({ passou: true, sha256: 'sha256:de-ensaio', relatorio: 'ok' });
afterAll(() => rmSync(area, { recursive: true, force: true }));

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
      imagens: ['/repo/docs/ref/lateral.png', '/repo/docs/mapa.JPG'], ignoradas: ['docs/ref/andaime.json'], ausentes: ['docs/ref/some.png'],
    });
  });

  it('o caminho que não existe a partir da raiz vale a partir da pasta da receita', () => {
    const r = referenciasDoPlano({ referencias: ['../andaime.json', '../x.png'] }, { raiz: '/repo', pastaDaReceita: '/receita-pai/filha', existe: (c) => c === '/receita-pai/andaime.json' || c === '/receita-pai/x.png' });
    expect(r).toEqual({ imagens: ['/receita-pai/x.png'], ignoradas: ['../andaime.json'], ausentes: [] });
  });

  it('plano ausente não tem referência', () => {
    expect(referenciasDoPlano(null)).toEqual({ imagens: [], ignoradas: [], ausentes: [] });
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
    for (const velho of ['pedido.md', 'etapas-x-frontal-orto.png', 'sobreposicao-q.png', 'alvo/velho.png', 'notas.txt']) writeFileSync(join(pasta, velho), 'velho');
    const bancada = bancadaFalsa(base, PECA);
    await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base,
      dependencias: { medirReceita: medirPassa,
        olharBancada: bancada.fazer,
        sobreposicaoDeCortes: async () => ({ arquivos: [], paineis: [], notas: [] }),
      },
    });
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).toContain('# Pedido ao crítico visual');
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

  async function montar(olharEtapas) {
    const base = mkdtempSync(join(area, 'montagem-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const pedidosDeEtapas = [];
    const pedidosDeCortes = [];
    const { esbocoDeclarado } = await import('./forma-do-esboco.mjs');
    const declarado = await esbocoDeclarado(PECA);
    const ids = Object.values(declarado.ligadas).flatMap((v) => (Array.isArray(v) ? v : v.formas));
    const resultado = await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base,
      dependencias: { medirReceita: medirPassa,
        olharBancada: bancada.fazer,
        sobreposicaoDeCortes: async () => ({ arquivos: [], paineis: [], notas: [] }),
        olharEtapas: async (arquivo, opcoes) => { pedidosDeEtapas.push({ arquivo, opcoes }); return olharEtapas(arquivo, opcoes); },
        /* os cortes resolvem a montagem inteira; aqui um gravador diz a quem foram pedidos */
        cortesDosEncaixes: async (pedido) => {
          pedidosDeCortes.push(pedido);
          const arquivo = join(pedido.pasta, `corte-${pedido.montagem.instancia}-fuselagem.png`);
          writeFileSync(arquivo, 'corte');
          return { cortes: [{ arquivo, vizinha: 'fuselagem', origens: ['posição motorNaFuselagem'], folgaMm: 0.5, folgaNoCorteMm: 0.5, cruzam: false, plano: 'x = 1,0 mm, visto de +x (direita da imagem -z, cima +y)', declarado: false }], aviso: null };
        },
        rodadasAnteriores: () => [],
        visibilidadeDoFoco: async () => ({}),
      },
    });
    return { pasta, resultado, pedidosDeEtapas, pedidosDeCortes, ids };
  }

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
