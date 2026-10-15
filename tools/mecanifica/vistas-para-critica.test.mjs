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
  LIMITE_DO_VEREDITO, PERGUNTA_DO_ALVO, PRAZO_DA_CAPTURA_MONTADA_MS, VISTAS_MONTADAS, ladoDaVista, montagemDaPeca, montarPedido, pastaDaRodada, prefixoDaPeca, referenciasDoPlano,
  unidadeDoAlvo, vistaDoArquivo, vistasParaCritica, vistasRepetidas,
} from './vistas-para-critica.mjs';

const area = mkdtempSync(join(tmpdir(), 'vistas-critica-'));
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
  referencias: [{ caminho: '/r/lateral.png' }, { caminho: '/r/sem-lado.png' }],
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
    expect(refs).toContain('- sem-lado.png: /r/sem-lado.png\n');
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
    const chamadasDaComposta = [];
    const resultado = await vistasParaCritica(PECA, {
      saida: pasta,
      pastaDasCapturas: base,
      dependencias: {
        olharBancada: bancada.fazer,
        composta: async (arquivo, opcoes) => {
          chamadasDaComposta.push({ arquivo, opcoes });
          const destino = arquivo.replace(/\.esboco\.json$/, `${opcoes.unidade ? `-unidade-${opcoes.unidade}` : ''}-composta.png`);
          writeFileSync(destino, 'composta');
          return { destino };
        },
        sobreposicaoDeCortes: async ({ saida }) => {
          const arquivos = ['x', 'y', 'z'].map((e) => { const a = join(saida, `sobreposicao-${e}.png`); writeFileSync(a, e); return a; });
          return { arquivos, paineis: [{ eixo: 'x', valor: 1, desvioMaximoMm: 1.25 }], notas: [] };
        },
        ...(aoComposta ?? {}),
      },
    });
    return { base, pasta, bancada, chamadasDaComposta, resultado };
  }

  it('grava o pedido na pasta da rodada, com as capturas de sempre, o alvo, a sobreposição e as partes do plano', async () => {
    const { pasta, bancada, chamadasDaComposta, resultado } = await montar();
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
    expect(chamadasDaComposta).toHaveLength(1);
  }, 60_000);

  it('o alvo é gerado da cópia do esboço declarado, na pasta da rodada, e a unidade é a nula porque nenhuma forma ligada declara unidade', async () => {
    const { pasta, chamadasDaComposta, resultado } = await montar();
    expect(chamadasDaComposta[0].arquivo).toBe(join(pasta, 'alvo', 'bloco.esboco.json'));
    expect(readFileSync(join(pasta, 'alvo', 'bloco.esboco.json'), 'utf8')).toBe(readFileSync('tools/fixtures/forma-do-esboco/bloco.esboco.json', 'utf8'));
    expect(chamadasDaComposta[0].opcoes).toEqual({ unidade: null });
    expect(resultado.alvo.imagem).toBe(join(pasta, 'alvo', 'bloco-composta.png'));
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
      dependencias: {
        olharBancada: bancada.fazer,
        composta: async (arquivo) => { const destino = arquivo.replace(/\.esboco\.json$/, '-composta.png'); writeFileSync(destino, 'c'); return { destino }; },
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
      dependencias: { olharBancada: async () => ({ ok: false, erro: { mensagem: 'a bancada caiu' }, resultado: { arquivos: [] } }) },
    })).rejects.toThrow(/a captura do conjunto não produziu imagem: a bancada caiu/);
    expect(existsSync(join(pasta, 'pedido.md'))).toBe(false);
  }, 60_000);

  it('a opção do esboço que não é a primeira recusa antes de gastar captura', async () => {
    const base = mkdtempSync(join(area, 'opcao-'));
    let capturou = false;
    await expect(vistasParaCritica(PECA, {
      saida: join(base, 'rodada'), pastaDasCapturas: base,
      dependencias: {
        olharBancada: async () => { capturou = true; },
        esbocoDeclarado: async () => ({
          esboco: join(process.cwd(), 'tools/fixtures/forma-do-esboco/bloco.esboco.json'), opcao: 2, minimo: 0.9, ligadas: { bloco: ['bloco'] },
        }),
      },
    })).rejects.toThrow(/primeira opção do esboço/);
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
    const { esbocoDeclarado } = await import('./forma-do-esboco.mjs');
    const declarado = await esbocoDeclarado(PECA);
    const ids = Object.values(declarado.ligadas).flatMap((v) => (Array.isArray(v) ? v : v.formas));
    const resultado = await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base,
      dependencias: {
        olharBancada: bancada.fazer,
        formasDoEsboco: async () => ({ formas: ids.map((id) => ({ id, unidade: 'motor' })) }),
        composta: async (arquivo, opcoes) => { const destino = arquivo.replace(/\.esboco\.json$/, `-unidade-${opcoes.unidade}-composta.png`); writeFileSync(destino, 'c'); return { destino }; },
        sobreposicaoDeCortes: async () => ({ arquivos: [], paineis: [], notas: [] }),
        olharEtapas: async (arquivo, opcoes) => { pedidosDeEtapas.push({ arquivo, opcoes }); return olharEtapas(arquivo, opcoes); },
      },
    });
    return { pasta, resultado, pedidosDeEtapas, ids };
  }

  it('pede as vistas montadas com o quadro na instância, na pasta da rodada, e põe no pedido o que o enquadramento diz', async () => {
    const { pasta, resultado, pedidosDeEtapas } = await montar(async (arquivo, opcoes) => {
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
  }, 60_000);

  it('a unidade do alvo é a das formas ligadas, e a composta é pedida para ela', async () => {
    const { resultado } = await montar(async () => { const e = new Error('sem montado'); e.codigo = 'foco-fora-das-etapas'; throw e; });
    expect(resultado.alvo.unidade).toBe('motor');
    expect(basename(resultado.alvo.imagem)).toBe('aviao-unidade-motor-composta.png');
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
