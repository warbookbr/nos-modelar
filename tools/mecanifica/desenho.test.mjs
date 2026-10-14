/* desenho.test.mjs — a porta `npm run desenho`: resolve e grava os contornos e a vista em traço com a mesma saída byte a byte, não
   grava nos estados que não resolvem, recusa a descrição inválida com o que corrigir, e o arquivo que ela grava é lido sem mudança
   pelo esboço e pela prancha dos contornos, que passa a dizer de onde o desenho veio. */
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { principal } from './desenho.mjs';
import { desenhar } from '../../modulos/desenho-por-restricoes/src/index.js';
import { larguraDoTexto } from '../../modulos/desenho-por-restricoes/src/traco.js';
import { carrinho, carrinhoEmConflito, carrinhoFaltando, chuteEspelhado } from '../../modulos/desenho-por-restricoes/tests/carrinho.js';
import { chapa, placaArredondada } from '../../modulos/desenho-por-restricoes/tests/formas.js';
import { conferirReferenciaNaOpcao, visiveisDoEsboco } from '../../modulos/esboco/src/plano.js';
import { expandirEsboco } from '../../modulos/esboco/src/expandir.js';
import { formatarMedidasDaReferencia, lerContornos, medidasDaReferencia } from '../../modulos/esboco/src/referencia.js';
import { lerReferenciaDeArquivo } from './esboco-referencia.mjs';
import { prancha } from './prancha/prancha.mjs';
import { specDosContornos, roteiroDaPrancha } from './prancha/prancha-dos-contornos.mjs';
import { validarAutoriaPrancha } from './prancha/prancha-autoria.mjs';

const capturar = () => {
  const saida = { out: '', err: '' };
  return { saida, io: { out: (t) => { saida.out += t; }, err: (t) => { saida.err += t; } } };
};
const pasta = () => mkdtempSync(join(tmpdir(), 'desenho-'));
const escrever = (dir, nome, conteudo) => { const f = join(dir, nome); writeFileSync(f, typeof conteudo === 'string' ? conteudo : `${JSON.stringify(conteudo, null, 2)}\n`); return f; };
const rodar = async (argv) => { const { saida, io } = capturar(); const codigo = await principal(argv, io); return { codigo, ...saida }; };
const comOrdem = (d) => ({ ...d, frenteParaFundo: ['pe', 'braco', 'roda', 'cacamba'] });

describe('npm run desenho: o desenho resolvido', () => {
  it('grava os contornos e a vista em traço ao lado da descrição, com o relatório na saída, e sai com 0', async () => {
    const dir = pasta();
    const arquivo = escrever(dir, 'lateral.desenho.json', comOrdem(carrinho()));
    const r = await rodar([arquivo]);
    expect(r.codigo).toBe(0);
    expect(r.err).toBe('');
    expect(r.out).toMatch(/estado resolvido, 0 graus de liberdade/);
    expect(r.out).toMatch(/gravado: lateral\.contornos\.json e lateral\.png/);
    const contornos = JSON.parse(readFileSync(join(dir, 'lateral.contornos.json'), 'utf8'));
    expect(contornos.formato).toBe('mecanifica.contornos@1');
    expect(contornos.origem).toEqual({ desenho: 'lateral.desenho.json', sha256: createHash('sha256').update(readFileSync(arquivo)).digest('hex'), resolvedor: 'planegcs@1.3.0' });
    const png = readFileSync(join(dir, 'lateral.png'));
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.length).toBeGreaterThan(5000);
  }, 120_000);

  it('a mesma entrada dá o mesmo arquivo byte a byte (contornos e PNG), em duas pastas e em duas execuções', async () => {
    const a = pasta(); const b = pasta();
    const texto = `${JSON.stringify(comOrdem(carrinho()), null, 2)}\n`;
    escrever(a, 'lateral.desenho.json', texto); escrever(b, 'lateral.desenho.json', texto);
    const r1 = await rodar([join(a, 'lateral.desenho.json')]);
    const r2 = await rodar([join(b, 'lateral.desenho.json')]);
    const r3 = await rodar([join(a, 'lateral.desenho.json')]);
    expect([r1.codigo, r2.codigo, r3.codigo]).toEqual([0, 0, 0]);
    const primeiro = readFileSync(join(a, 'lateral.contornos.json'));
    const primeiroPng = readFileSync(join(a, 'lateral.png'));
    expect(readFileSync(join(b, 'lateral.contornos.json')).equals(primeiro)).toBe(true);
    expect(readFileSync(join(b, 'lateral.png')).equals(primeiroPng)).toBe(true);
    expect(r1.out).toBe(r2.out);
  }, 120_000);

  it('--so-relatorio não grava nada e --json imprime o relatório em JSON', async () => {
    const dir = pasta();
    const arquivo = escrever(dir, 'lateral.desenho.json', carrinho());
    const r = await rodar([arquivo, '--so-relatorio', '--json']);
    expect(r.codigo).toBe(0);
    expect(JSON.parse(r.out)).toMatchObject({ estado: 'resolvido', grausDeLiberdade: 0, conflitantes: [], redundantes: [] });
    expect(existsSync(join(dir, 'lateral.contornos.json'))).toBe(false);
    expect(existsSync(join(dir, 'lateral.png'))).toBe(false);
  });
});

describe('npm run desenho: o texto da vista em traço cabe na folha que o Chromium rasteriza', () => {
  it('com um subtítulo, um título e uma legenda mais largos que o desenho, cada texto medido pelo navegador fica dentro do viewBox, e a estimativa nunca fica abaixo da medida', async () => {
    const d = carrinho();
    d.objeto = 'carrinho de mão com caçamba de aço galvanizado e pneu de borracha maciça';
    d.olhando = 'do lado esquerdo, com a roda à esquerda e a caçamba à direita, a coluna de apoio à esquerda e a barra de tração à direita, tudo sobre um piso nivelado de concreto liso WWWW MMMM';
    d.referencias.eixoDaTraseiraDoConjuntoInteiro = { reta: 'vertical', h: 1500 };
    const { svg } = await desenhar(d);
    const { chromium } = (await import('playwright')).default;
    const navegador = await chromium.launch();
    const [, w, h] = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const [largura, altura] = [Number(w), Number(h)];
    let medidas;
    try {
      const pagina = await navegador.newPage({ viewport: { width: Number(w), height: Number(h) } });
      await pagina.setContent(`<body style="margin:0">${svg}</body>`);
      medidas = await pagina.evaluate(() => [...document.querySelectorAll('svg text')].map((t) => {
        const b = t.getBBox();
        return { texto: t.textContent, esquerda: b.x, direita: b.x + b.width, largura: b.width, fundo: b.y + b.height, tamanho: Number(t.getAttribute('font-size') ?? t.ownerSVGElement.getAttribute('font-size')), negrito: t.getAttribute('font-weight') === 'bold' };
      }));
    } finally {
      await navegador.close();
    }
    expect(medidas.length).toBeGreaterThan(10);
    for (const m of medidas) {
      expect(m.esquerda, `"${m.texto}" sai pela esquerda`).toBeGreaterThanOrEqual(0);
      expect(m.direita, `"${m.texto}" passa da largura ${largura}`).toBeLessThanOrEqual(largura);
      expect(m.fundo, `"${m.texto}" passa da altura ${altura}`).toBeLessThanOrEqual(altura);
      expect(larguraDoTexto(m.texto, m.tamanho, m.negrito), `a estimativa de "${m.texto}" ficou abaixo da medida`).toBeGreaterThanOrEqual(m.largura);
    }
  }, 120_000);
});

describe('npm run desenho: o que não resolve não é gravado', () => {
  it.each([
    ['conflito', carrinhoEmConflito, /as relações "altura do pegador", "altura do pegador \(de novo\)" não cabem juntas/],
    ['solto', carrinhoFaltando, /estado solto, 1 grau de liberdade/],
    ['lado trocado', chuteEspelhado, /a relação "folga do fundo" pede o ponto "A" acima de "braco", e ele ficou abaixo/],
  ])('%s: sai com 4, imprime o relatório e não escreve contornos nem vista', async (_nome, descricao, esperado) => {
    const dir = pasta();
    const arquivo = escrever(dir, 'lateral.desenho.json', descricao());
    const r = await rodar([arquivo]);
    expect(r.codigo).toBe(4);
    expect(r.out).toMatch(esperado);
    expect(r.out).not.toMatch(/gravado:/);
    expect(existsSync(join(dir, 'lateral.contornos.json'))).toBe(false);
    expect(existsSync(join(dir, 'lateral.png'))).toBe(false);
  });

  it('os arquivos de uma execução anterior ficam como estavam, e a saída avisa que não correspondem a esta descrição', async () => {
    const dir = pasta();
    const arquivo = escrever(dir, 'lateral.desenho.json', carrinho());
    expect((await rodar([arquivo])).codigo).toBe(0);
    const antes = readFileSync(join(dir, 'lateral.contornos.json'));
    escrever(dir, 'lateral.desenho.json', carrinhoEmConflito());
    const r = await rodar([arquivo]);
    expect(r.codigo).toBe(4);
    expect(r.out).toMatch(/nada foi gravado; lateral\.contornos\.json e lateral\.png de uma execução anterior ficou como estava e não corresponde a esta descrição/);
    expect(readFileSync(join(dir, 'lateral.contornos.json')).equals(antes)).toBe(true);
  }, 120_000);
});

describe('npm run desenho: entrada errada', () => {
  it('descrição inválida sai com 3 e lista cada correção', async () => {
    const dir = pasta();
    const d = carrinho();
    delete d.relacoes[4].lado;
    d.vista = 'planta';
    const r = await rodar([escrever(dir, 'carrinho.desenho.json', d)]);
    expect(r.codigo).toBe(3);
    expect(r.err).toMatch(/a descrição do desenho tem 2 erro\(s\)/);
    expect(r.err).toMatch(/"vista" deve ser uma de/);
    expect(r.err).toMatch(/"altura do pegador" \(distancia\) precisa de "lado"/);
    expect(existsSync(join(dir, 'carrinho.contornos.json'))).toBe(false);
  });

  it('o raio de canto que não cabe na aresta resolvida sai com 3 e diz a aresta, e o que cabe grava os contornos com os arcos', async () => {
    const dir = pasta();
    const r = await rodar([escrever(dir, 'frontal.desenho.json', placaArredondada(60))]);
    expect(r.codigo).toBe(3);
    expect(r.err).toMatch(/na parte "placa" o raio de canto não cabe entre "B" e "C": essa aresta mede 100 mm e os dois cantos pedem 120 mm/);
    expect(existsSync(join(dir, 'frontal.contornos.json'))).toBe(false);
    const ok = await rodar([escrever(dir, 'frontal.desenho.json', placaArredondada()), '--so-relatorio']);
    expect(ok.codigo).toBe(0);
    expect(ok.out).toMatch(/cantos arredondados de raio 20 mm \(pontas semicirculares\)/);
  });

  it('o arquivo chamado lateral com a vista "topo" na descrição sai com 3, porque a prancha e o esboço leem a vista pelo nome', async () => {
    const dir = pasta();
    const d = carrinho(); d.vista = 'topo';
    const r = await rodar([escrever(dir, 'lateral.desenho.json', d)]);
    expect(r.codigo).toBe(3);
    expect(r.err).toMatch(/o arquivo se chama lateral\.desenho\.json, mas a descrição declara "vista": "topo".*renomeie o arquivo ou corrija "vista"/);
    expect(existsSync(join(dir, 'lateral.contornos.json'))).toBe(false);
    /* Um nome que não é de vista não é conferido. */
    expect((await rodar([escrever(dir, 'carrinho.desenho.json', d), '--so-relatorio'])).codigo).toBe(0);
  });

  it('arquivo que não existe, JSON quebrado e nome sem .desenho.json saem com 2 e dizem por quê', async () => {
    const dir = pasta();
    expect((await rodar([join(dir, 'lateral.desenho.json')])).err).toMatch(/o arquivo .* não existe/);
    expect((await rodar([escrever(dir, 'lateral.desenho.json', '{ quebrado')])).err).toMatch(/não é um JSON legível/);
    const r = await rodar([escrever(dir, 'lateral.json', carrinho())]);
    expect(r.codigo).toBe(2);
    expect(r.err).toMatch(/deve se chamar <vista>\.desenho\.json/);
  });

  it('--ajuda explica o formato e os comandos, e sem argumento sai com 2 mostrando a ajuda', async () => {
    const ajuda = await rodar(['--ajuda']);
    expect(ajuda.codigo).toBe(0);
    expect(ajuda.out).toMatch(/mecanifica\.desenho@2/);
    expect(ajuda.out).toMatch(/npm run desenho -- razao/);
    const sem = await rodar([]);
    expect(sem.codigo).toBe(2);
    expect(sem.err).toMatch(/COMANDOS/);
  });
});

describe('npm run desenho -- razao', () => {
  it('mede o desenho contra outro contorno: sem alinhar, pelo ponto declarado e pela melhor translação', async () => {
    const dir = pasta();
    const arquivo = escrever(dir, 'lateral.desenho.json', carrinho());
    expect((await rodar([arquivo])).codigo).toBe(0);
    const contornos = JSON.parse(readFileSync(join(dir, 'lateral.contornos.json'), 'utf8'));
    const mover = (anel) => anel.map(([h, v]) => [h + 40, v + 10]);
    const deslocar = (f) => ({ ...f, contornoMm: mover(f.contornoMm), pedacos: f.pedacos.map((p) => ({ ...p, contornoMm: mover(p.contornoMm) })) });
    const outro = { ...contornos, silhueta: deslocar(contornos.silhueta), regioes: Object.fromEntries(Object.entries(contornos.regioes).map(([nome, regiao]) => [nome, deslocar(regiao)])) };
    const b = escrever(dir, 'outro.contornos.json', outro);
    const r = await rodar(['razao', join(dir, 'lateral.contornos.json'), b, '--ponto-a=0,0', '--ponto-b=40,10']);
    expect(r.codigo).toBe(0);
    expect(r.out).toMatch(/razão interseção\/união, união das regiões de lateral\.contornos\.json contra união das regiões de outro\.contornos\.json \(sem as regiões foraDoModelo\)/);
    expect(r.out).toMatch(/sem alinhar \(origens como estão\): 0,\d{4}/);
    expect(r.out).toMatch(/alinhada pelo ponto declarado: 1,0000 \(o segundo contorno deslocado de \[-40,00; -10,00\] mm\)/);
    expect(r.out).toMatch(/alinhada pela melhor translação: 1,0000/);
    /* O carrinho não tem vão cercado: a silhueta dá os mesmos números, e nada sai ao lado. */
    expect(r.out).not.toMatch(/pela silhueta|as duas medidas diferem/);
    const json = await rodar(['razao', join(dir, 'lateral.contornos.json'), b, '--json']);
    expect(JSON.parse(json.out)).toMatchObject({ medida: 'regioes', comparada: null });
    expect(JSON.parse(json.out).melhorTranslacao.iou).toBeCloseTo(1, 4);
    const roda = await rodar(['razao', join(dir, 'lateral.contornos.json'), join(dir, 'lateral.contornos.json'), '--parte-a=roda', '--parte-b=roda', '--json']);
    expect(JSON.parse(roda.out).semAlinhar.iou).toBe(1);
    const parte = await rodar(['razao', join(dir, 'lateral.contornos.json'), join(dir, 'lateral.contornos.json'), '--parte-a=roda', '--parte-b=roda']);
    expect(parte.out).toMatch(/^razão interseção\/união, parte roda de lateral\.contornos\.json contra parte roda de lateral\.contornos\.json\n/);
  }, 120_000);

  describe('a medida: a união das regiões é o padrão, e o anel de fora da silhueta é a opção', () => {
    /* Um corpo sobre dois pés e uma longarina fina: a longarina fecha o vão entre os pés (220 por 90 mm), e a silhueta, só com o anel de fora, o enche. */
    const retangulo = (h0, v0, h1, v1) => [[h0, v0], [h1, v0], [h1, v1], [h0, v1]];
    const regiao = (anel) => ({ contornoMm: anel, pedacos: [{ contornoMm: anel }] });
    const contorno = (regioes, silhueta) => ({ formato: 'mecanifica.contornos@1', silhueta: { contornoMm: silhueta, pedacos: [{ contornoMm: silhueta }] }, regioes });
    const arquivos = () => {
      const dir = pasta();
      const referencia = escrever(dir, 'referencia.contornos.json', contorno({
        corpo: regiao(retangulo(0, 100, 300, 200)), peEsquerdo: regiao(retangulo(0, 10, 40, 100)), peDireito: regiao(retangulo(260, 10, 300, 100)), longarina: regiao(retangulo(0, 0, 300, 10)),
      }, retangulo(0, 0, 300, 200)));
      const cheio = escrever(dir, 'cheio.contornos.json', contorno({ bloco: regiao(retangulo(0, 0, 300, 200)) }, retangulo(0, 0, 300, 200)));
      return { dir, referencia, cheio };
    };

    it('o vão fechado por uma barra fina: a razão padrão não o enche, e a da silhueta, impressa ao lado, o enche', async () => {
      const { referencia, cheio } = arquivos();
      const r = await rodar(['razao', referencia, cheio]);
      expect(r.codigo).toBe(0);
      expect(r.out).toMatch(/^razão interseção\/união, união das regiões de referencia\.contornos\.json contra união das regiões de cheio\.contornos\.json \(sem as regiões foraDoModelo\)\n/);
      expect(r.out).toMatch(/sem alinhar \(origens como estão\): 0,6700 \(pela silhueta: 1,0000\)/);
      expect(r.out).toMatch(/alinhada pela melhor translação: 0,6700 \(pela silhueta: 1,0000\) \(o segundo contorno deslocado de/);
      expect(r.out).toMatch(/áreas: 40200 mm² e 60000 mm² \(pela silhueta: 60000 mm² e 60000 mm²\)/);
      expect(r.out).toMatch(/as duas medidas diferem: .*Razões de medidas diferentes não se comparam; a padrão é a união das regiões e --medida=silhueta escolhe a outra\./);
    });

    it('--medida=silhueta dá a medida antiga e imprime a padrão ao lado; --medida=regioes é o padrão', async () => {
      const { referencia, cheio } = arquivos();
      const antiga = await rodar(['razao', referencia, cheio, '--medida=silhueta']);
      expect(antiga.codigo).toBe(0);
      expect(antiga.out).toMatch(/^razão interseção\/união, silhueta \(anel de fora\) de referencia\.contornos\.json contra silhueta \(anel de fora\) de cheio\.contornos\.json\n/);
      expect(antiga.out).not.toMatch(/foraDoModelo/);
      expect(antiga.out).toMatch(/sem alinhar \(origens como estão\): 1,0000 \(pela união das regiões: 0,6700\)/);
      expect(antiga.out).toMatch(/áreas: 60000 mm² e 60000 mm² \(pela união das regiões: 40200 mm² e 60000 mm²\)/);
      const explicita = await rodar(['razao', referencia, cheio, '--medida=regioes']);
      expect(explicita.out).toBe((await rodar(['razao', referencia, cheio])).out);
    });

    it('--json traz a medida usada e a outra com os mesmos campos', async () => {
      const { referencia, cheio } = arquivos();
      const nova = JSON.parse((await rodar(['razao', referencia, cheio, '--json'])).out);
      expect(nova.medida).toBe('regioes');
      expect(nova.semAlinhar.iou).toBeCloseTo(0.67, 6);
      expect(nova.comparada).toMatchObject({ medida: 'silhueta', areaA: 60000, semAlinhar: { iou: 1 } });
      const antiga = JSON.parse((await rodar(['razao', referencia, cheio, '--medida=silhueta', '--json'])).out);
      expect(antiga).toMatchObject({ medida: 'silhueta', semAlinhar: { iou: 1 }, comparada: { medida: 'regioes' } });
    });

    it('uma medida desconhecida sai com 2 dizendo as que existem, e a ajuda e o uso trazem a opção', async () => {
      const { referencia, cheio } = arquivos();
      const r = await rodar(['razao', referencia, cheio, '--medida=contorno']);
      expect(r.codigo).toBe(2);
      expect(r.err).toMatch(/a medida deve ser "regioes" ou "silhueta" \(--medida=<nome> no comando\), e veio "contorno"/);
      expect((await rodar(['razao', referencia])).err).toMatch(/\[--medida=regioes\|silhueta\]/);
      const ajuda = await rodar(['--ajuda']);
      expect(ajuda.out).toMatch(/\[--medida=regioes\|silhueta\]/);
      expect(ajuda.out).toMatch(/A RAZÃO \(razao\)/);
    });

    it('um arquivo sem regiões é recusado na medida padrão e medido com --medida=silhueta', async () => {
      const dir = pasta();
      const sem = escrever(dir, 'sem.contornos.json', contorno({}, retangulo(0, 0, 100, 50)));
      const r = await rodar(['razao', sem, sem]);
      expect(r.codigo).toBe(2);
      expect(r.err).toMatch(/o primeiro contorno: não traz regiões para somar; a medida "silhueta" mede o anel de fora da silhueta/);
      const ok = await rodar(['razao', sem, sem, '--medida=silhueta']);
      expect(ok.codigo).toBe(0);
      expect(ok.out).toMatch(/sem alinhar \(origens como estão\): 1,0000\n/);
    });
  });

  it('recusa o uso errado dizendo o que falta', async () => {
    const dir = pasta();
    const f = escrever(dir, 'a.contornos.json', { formato: 'mecanifica.contornos@1', silhueta: { contornoMm: [[0, 0], [1, 0], [1, 1]] }, regioes: {} });
    expect((await rodar(['razao', f])).err).toMatch(/uso: npm run desenho -- razao/);
    expect((await rodar(['razao', f, f, '--ponto-a=1,2'])).err).toMatch(/--ponto-a e --ponto-b vêm juntos/);
    expect((await rodar(['razao', f, f, '--parte-a=banco'])).err).toMatch(/não há a região "banco"/);
  });
});

describe('o contorno do desenho é lido sem mudança pelo esboço', () => {
  it('lerContornos e o leitor de arquivo do esboço aceitam o arquivo, sem mmPorPx', async () => {
    const dir = pasta();
    expect((await rodar([escrever(dir, 'lateral.desenho.json', comOrdem(carrinho()))])).codigo).toBe(0);
    const arquivo = join(dir, 'lateral.contornos.json');
    const json = JSON.parse(readFileSync(arquivo, 'utf8'));
    const lido = lerContornos(json);
    expect(Object.keys(lido.regioes)).toEqual(['braco', 'cacamba', 'pe', 'roda']);
    expect(lido.mmPorPx).toBeNull();
    expect(lido.silhueta.caixa[0]).toBeCloseTo(-335.725, 1);
    expect(lido.silhueta.caixa[3]).toBe(900);
    const doArquivo = lerReferenciaDeArquivo({ arquivo }, dir);
    expect(Object.keys(doArquivo.regioes)).toEqual(Object.keys(lido.regioes));
    const medidas = medidasDaReferencia(lido, 'lateral');
    expect(medidas.linhas.map((l) => l.parte)).toEqual([null, 'braco', 'cacamba', 'pe', 'roda']);
    expect(formatarMedidasDaReferencia(medidas, { arquivo: 'lateral.contornos.json' })).toMatch(/parte roda: profundidade 400 mm/);
  }, 120_000);

  it('a conferência do esboço mede o desenho como mede uma imagem: uma caixa de 200 por 100 contra a chapa dá razão 1 e uma de 160 reprova', async () => {
    const { contornos } = await desenhar(chapa());
    const ref = lerContornos(contornos);
    const caixa = (largura) => expandirEsboco({ opcoes: [{ titulo: 'T', formas: [{ id: 'chapa', tipo: 'caixa', largura, altura: 100, profundidade: 10, centro: [largura / 2, 50, 0] }] }] });
    const conferir = (x) => conferirReferenciaNaOpcao({ arquivo: 'frontal.contornos.json', vista: 'frontal', tolerancia: 10, iou_min: 0.9 }, ref, x, visiveisDoEsboco(x), 0);
    const certa = conferir(caixa(200));
    expect(certa.ok).toBe(true);
    expect(certa.resultados.find((r) => r.parte === null).iou).toBeGreaterThan(0.99);
    const curta = conferir(caixa(160));
    expect(curta.ok).toBe(false);
    expect(curta.resultados.find((r) => r.parte === null).iou).toBeCloseTo(0.8, 1);
  });
});

describe('o contorno do desenho é lido sem mudança pela prancha dos contornos, que diz de onde ele veio', () => {
  const imagem = () => ({
    formato: 'mecanifica.contornos@1', mmPorPx: 2.05, imagem: { sha256: 'x', largura: 10, altura: 10 },
    silhueta: { contornoMm: [[0, 0], [100, 0], [100, 50], [0, 50]] },
    regioes: { base: { contornoMm: [[0, 0], [100, 0], [100, 50], [0, 50]] } },
  });

  it('a procedência e o subtítulo dizem desenho por restrições, e não referência raster nem watershed', async () => {
    const { contornos } = await desenhar(comOrdem(carrinho()), { origem: { desenho: 'lateral.desenho.json', sha256: 'a'.repeat(64) } });
    const spec = specDosContornos(contornos, { fonte: 'lateral.contornos.json' });
    expect(spec.autoria.procedencias).toEqual([{ id: 'contornos', tipo: 'medidas-declaradas', evidencia: `desenho por restrições lateral.desenho.json, resolvido por planegcs@1.3.0, sha256 ${'a'.repeat(12)}` }]);
    expect(spec.autoria.intencao).toMatch(/do desenho por restrições, em milímetro/);
    expect(spec.titulo).toBe('Prancha lateral pelo desenho por restrições');
    expect(spec.subtitulo).toBe('Milímetros. 4 partes do desenho por restrições. Parte escondida atrás de outra aparece só no pedaço visível.');
    expect(JSON.stringify(spec)).not.toMatch(/watershed|raster|undefined|pixel/);
    expect(validarAutoriaPrancha(spec).erros).toEqual([]);
  });

  it('a prancha desenha as quatro partes e as duas cotas gerais, sem alerta de parte fora do contorno', async () => {
    const { contornos } = await desenhar(comOrdem(carrinho()));
    const spec = specDosContornos(contornos);
    expect(spec.camadas.filter((c) => !c.contorno).map((c) => c.nome).sort()).toEqual(['braco', 'cacamba', 'pe', 'roda']);
    expect(spec.cotas.map((c) => c.dono)).toEqual(['geral.largura', 'geral.altura']);
    expect(spec.cotas[0].texto).toMatch(/^comprimento 17\d\d$/);
    expect(spec.cotas[1].texto).toBe('altura 900');
    const { relatorio } = prancha(spec);
    expect(relatorio.alertas.filter((a) => /fora do contorno/.test(a))).toEqual([]);
  });

  it('a cota por dois pontos usa 1 mm de tolerância sem mmPorPx, e uma cota de parte sai do contorno exato', async () => {
    const { contornos } = await desenhar(comOrdem(carrinho()));
    const spec = specDosContornos(contornos, { escolhas: { cotas: [
      { parte: 'roda', medida: 'largura', de: [-200, 200], ate: [200, 200] },
      { parte: 'roda', medida: 'altura', em: 0 },
    ] } });
    expect(spec.cotas.find((c) => c.dono === 'roda.largura').texto).toBe('400');
    expect(() => specDosContornos(contornos, { escolhas: { cotas: [{ parte: 'roda', medida: 'largura', de: [-205, 200], ate: [200, 200] }] } })).toThrow(/a 5 mm da borda de 'roda' \(tolerância 1 mm/);
    expect(roteiroDaPrancha({ alvo: 'lateral.png', prancha: 'lateral.prancha.png', spec })).toMatch(/Abra o alvo \(lateral\.png\)/);
  });

  it('o contorno de uma imagem continua dizendo referência raster e watershed, com os mm por pixel', () => {
    const spec = specDosContornos(imagem(), { fonte: 'lateral.contornos.json' });
    expect(spec.autoria.procedencias[0]).toMatchObject({ tipo: 'referencia-raster-derivada', evidencia: 'lateral.contornos.json, 2.05 mm por pixel, calibrada por duas âncoras' });
    expect(spec.subtitulo).toMatch(/pelo watershed com sementes/);
    expect(spec.titulo).toBe('Prancha lateral pelos contornos da imagem');
  });
});
