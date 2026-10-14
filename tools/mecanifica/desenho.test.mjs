/* desenho.test.mjs — a porta `npm run desenho`: resolve e grava os contornos e a vista em traço com a mesma saída byte a byte, não
   grava nos estados que não resolvem, recusa a descrição inválida com o que corrigir, e o arquivo que ela grava é lido sem mudança
   pelo esboço e pela prancha dos contornos, que passa a dizer de onde o desenho veio. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { principal } from './desenho.mjs';
import { desenhar, especializarFamilia, lerCatalogoDePecas, lerFamiliaDeDesenho, valoresDaFamilia } from '../../modulos/desenho-por-restricoes/src/index.js';
import { larguraDoTexto } from '../../modulos/desenho-por-restricoes/src/traco.js';
import { carrinho, carrinhoEmConflito, carrinhoFaltando, chuteEspelhado } from '../../modulos/desenho-por-restricoes/tests/carrinho.js';
import { chapa, placaArredondada } from '../../modulos/desenho-por-restricoes/tests/formas.js';
import { anelCoaxial, arcoDeRodaComAro, carcacaSintetica, familiaSintetica } from '../../modulos/desenho-por-restricoes/tests/pecas.js';
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
    expect(ajuda.out).toMatch(/mecanifica\.desenho@3/);
    expect(ajuda.out).toMatch(/npm run desenho -- razao/);
    expect(ajuda.out).toMatch(/npm run desenho -- familia <f\.familia-de-desenho\.json> --provar/);
    expect(ajuda.out).toMatch(/O AJUSTE \(familia --ajustar\)/);
    expect(ajuda.out).toMatch(/--partes/);
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

describe('npm run desenho -- razao --partes', () => {
  const dois = async () => {
    const dir = pasta();
    expect((await rodar([escrever(dir, 'lateral.desenho.json', carrinho())])).codigo).toBe(0);
    const outro = carrinho();
    outro.relacoes.find((r) => r.nome === 'comprimento do fundo').mm = 600;
    const sub = join(dir, 'outro');
    mkdirSync(sub);
    expect((await rodar([escrever(sub, 'lateral.desenho.json', outro)])).codigo).toBe(0);
    return { a: join(dir, 'lateral.contornos.json'), b: join(sub, 'lateral.contornos.json') };
  };

  it('depois da razão geral, a razão de cada região que os dois contornos têm pelo nome, da pior para a melhor', async () => {
    const { a, b } = await dois();
    const r = await rodar(['razao', a, b, '--partes']);
    expect(r.codigo).toBe(0);
    expect(r.out).toMatch(/^razão interseção\/união, união das regiões de lateral\.contornos\.json/);
    expect(r.out).toMatch(/por região, da pior para a melhor \(cada região medida sozinha, como --parte-a=<nome> --parte-b=<nome>\):\n {2}região +sem alinhar +melhor translação +deslocamento\n/);
    const linhas = r.out.split('\n').filter((l) => /^ {2}(braco|cacamba|pe|roda) /.test(l));
    expect(linhas).toHaveLength(4);
    const numeros = linhas.map((l) => Number(l.trim().split(/\s+/)[1].replace(',', '.')));
    expect(numeros).toEqual([...numeros].sort((x, y) => x - y));
    expect(linhas.find((l) => l.startsWith('  roda'))).toMatch(/1,0000 +1,0000/);
    expect(linhas.find((l) => l.startsWith('  cacamba'))).not.toMatch(/ 1,0000 /);
  }, 120_000);

  it('--json acrescenta porParte à razão geral, e --partes não combina com --parte-a', async () => {
    const { a, b } = await dois();
    const json = JSON.parse((await rodar(['razao', a, b, '--partes', '--json'])).out);
    expect(json.medida).toBe('regioes');
    expect(json.porParte.partes.map((p) => p.nome).sort()).toEqual(['braco', 'cacamba', 'pe', 'roda']);
    expect(json.porParte.soEmA).toEqual([]);
    const junto = await rodar(['razao', a, b, '--partes', '--parte-a=roda']);
    expect(junto.codigo).toBe(2);
    expect(junto.err).toMatch(/--partes mede todas as regiões .* não combina com --parte-a nem --parte-b/);
  }, 120_000);
});

describe('npm run desenho -- familia', () => {
  const comArquivo = (familia = familiaSintetica()) => { const dir = pasta(); return { dir, arquivo: escrever(dir, 'carcaca.familia-de-desenho.json', familia) }; };

  it('--provar resolve a família nos extremos e no médio, lista cada conjunto de valores e sai com 0', async () => {
    const { arquivo } = comArquivo();
    const r = await rodar(['familia', arquivo, '--provar']);
    expect(r.codigo).toBe(0);
    expect(r.out).toMatch(/^família "carcaca-sintetica" 1\.0\.0: 100 conjuntos de valores \(todos no mínimo.*; cada par de parâmetros nos extremos cruzados; cada perfil\), dos quais 2 fora das relações de ordem da família\n/);
    expect(r.out).toMatch(/\n {2}ok {5}padrão +vista 2200 x 1100 mm\n/);
    expect(r.out).toMatch(/\n {2}ok {5}todos no máximo +vista 2600 x 1500 mm\n/);
    expect(r.out).toMatch(/\n {2}ok {5}perfil larga +vista 2600 x 1100 mm\n/);
    expect(r.out).toMatch(/\n {2}ok {5}altura no mínimo e vao no máximo +vista /);
    /* o par em que o arco de 320 de raio fica com o recorte de 300 não é da família: sai como recusa, com a relação que ele fere */
    expect(r.out).toMatch(/\n {2}recusa raioDoArco no máximo e vao no mínimo +fere "arco-cabe-no-vao"\n/);
    expect(r.out).toMatch(/\n {2}recusa raioDoArco no máximo e topoDoArco no mínimo +fere "arco-cabe-no-topo"\n/);
    expect(r.out).toMatch(/\n2 conjuntos ferem a relação de ordem "arco-cabe-no-topo", "arco-cabe-no-vao" da família e não foram desenhados: /);
    expect(r.out).toMatch(/98 de 98 resolvem, com zero grau de liberdade, sem conflito, sem lado trocado, sem polígono cruzado, sem parte escondida e sem peça virada\.\n$/);
    expect(r.out).not.toMatch(/FALHOU/);
    const json = JSON.parse((await rodar(['familia', arquivo, '--provar', '--json'])).out);
    expect(json).toMatchObject({ ok: true, desenhados: 98, recusados: 2 });
    expect(json.casos.filter((c) => c.recusado).map((c) => c.feridas)).toEqual([['arco-cabe-no-topo'], ['arco-cabe-no-vao']]);
  }, 120_000);

  it('--provar de uma família que quebra num extremo sai com 4 e diz o conjunto, os valores que mudam e o motivo', async () => {
    const f = familiaSintetica();
    f.parametros.raioDoArco.maximo = 480;
    /* sem as relações de ordem que dizem que o raio cabe nas arestas, o conjunto é desenhado e falha */
    f.restricoes = [];
    const { arquivo } = comArquivo(f);
    const r = await rodar(['familia', arquivo, '--provar']);
    expect(r.codigo).toBe(4);
    expect(r.out).toMatch(/\n {2}FALHOU todos no máximo/);
    expect(r.out).toMatch(/\n {9}valores: .*raioDoArco = 480 mm/);
    expect(r.out).toMatch(/\n {9}recusado: .*o raio de canto não cabe entre/);
    expect(r.out).toMatch(/\n {2}ok {5}padrão/);
    expect(r.out).toMatch(/\n\d+ de 100 falharam: todos no máximo; raioDoArco no máximo; /);
    const json = JSON.parse((await rodar(['familia', arquivo, '--provar', '--json'])).out);
    expect(json.ok).toBe(false);
    expect(json.casos.filter((c) => !c.ok).map((c) => c.rotulo).slice(0, 2)).toEqual(['todos no máximo', 'raioDoArco no máximo']);
    expect(json.casos[0]).toMatchObject({ rotulo: 'padrão', ok: true, estado: 'resolvido' });
  }, 120_000);

  it('sem --grava desenha para os valores dados e imprime o relatório, sem escrever nada: o padrão, o perfil e --valores por cima', async () => {
    const { dir, arquivo } = comArquivo();
    const padrao = await rodar(['familia', arquivo]);
    expect(padrao.codigo).toBe(0);
    expect(padrao.out).toMatch(/estado resolvido, 0 graus de liberdade/);
    expect(padrao.out).toMatch(/parâmetros: altura = 700, alturaDoMastro = 400, aro = 25, comprimento = 2200,/);
    const larga = await rodar(['familia', arquivo, '--perfil=larga', '--valores=altura=800,recuo=200']);
    expect(larga.codigo).toBe(0);
    expect(larga.out).toMatch(/altura = 800, alturaDoMastro = 400, aro = 40, comprimento = 2600,/);
    expect(larga.out).toMatch(/recuo = 200,/);
    expect(readdirSync(dir)).toEqual(['carcaca.familia-de-desenho.json']);
    expect(JSON.parse((await rodar(['familia', arquivo, '--json'])).out)).toMatchObject({ estado: 'resolvido', parametros: { vao: 420 } });
  }, 120_000);

  it('--grava escreve <vista>.desenho.json com as peças dentro, os contornos e a vista em traço, e o desenho gravado se resolve sozinho com os mesmos bytes', async () => {
    const { dir, arquivo } = comArquivo();
    const saida = join(dir, 'saida');
    const r = await rodar(['familia', arquivo, '--perfil=compacta', `--grava=${saida}`]);
    expect(r.codigo).toBe(0);
    expect(r.out).toMatch(/^gravado: lateral\.desenho\.json \(a família "carcaca-sintetica" 1\.0\.0 para os valores acima, com as peças dentro\)\n/);
    expect(r.out).toMatch(/gravado: lateral\.contornos\.json e lateral\.png/);
    expect(readdirSync(saida).sort()).toEqual(['lateral.contornos.json', 'lateral.desenho.json', 'lateral.png']);
    const gravado = JSON.parse(readFileSync(join(saida, 'lateral.desenho.json'), 'utf8'));
    expect(gravado.formato).toBe('mecanifica.desenho@3');
    expect(gravado.parametros).toMatchObject({ comprimento: 1800, vao: 300, raioDoArco: 220 });
    expect(Object.keys(gravado.pecas)).toEqual(['arcoDeRodaComAro', 'anelCoaxial']);
    const contornos = readFileSync(join(saida, 'lateral.contornos.json'));
    expect(JSON.parse(contornos).origem).toMatchObject({ desenho: 'lateral.desenho.json', resolvedor: 'planegcs@1.3.0' });
    /* o desenho gravado, sozinho, dá o mesmo arquivo que a família deu */
    const outra = join(dir, 'outra');
    mkdirSync(outra);
    writeFileSync(join(outra, 'lateral.desenho.json'), readFileSync(join(saida, 'lateral.desenho.json')));
    expect((await rodar([join(outra, 'lateral.desenho.json')])).codigo).toBe(0);
    expect(readFileSync(join(outra, 'lateral.contornos.json')).equals(contornos)).toBe(true);
  }, 180_000);

  it('--ajustar acha os valores da família mais próximos da referência, diz o que ficou no limite ou fora da faixa e, com --grava, grava o ajuste e o desenho', async () => {
    const { dir, arquivo } = comArquivo();
    const f = lerFamiliaDeDesenho(familiaSintetica()).familia;
    const alvo = (await desenhar(especializarFamilia(f, { ...valoresDaFamilia(f).valores, comprimento: 2900 }))).contornos;
    const referencia = escrever(dir, 'referencia.contornos.json', alvo);
    const dentro = await rodar(['familia', arquivo, `--ajustar=${referencia}`, '--soltos=comprimento']);
    expect(dentro.codigo).toBe(0);
    expect(dentro.out).toMatch(/^ajuste da família "carcaca-sintetica" 1\.0\.0 a referencia\.contornos\.json, dentro das faixas: razão 0,8904 pela melhor translação \(era 0,7448 no início;/);
    expect(dentro.out).toMatch(/\n {2}comprimento = 2600 mm {2}no máximo da faixa\n/);
    expect(dentro.out).toMatch(/1 parâmetro\(s\) no limite da faixa: a referência pode pedir mais que a faixa; --abrir=0\.4 mostra quanto\.\n--valores=altura=700,/);
    expect(dentro.err).toMatch(/ {2}comprimento = 2\d+(,\d+)? -> 0,\d{4} \(passo/);
    const saida = join(dir, 'ajuste');
    const aberta = await rodar(['familia', arquivo, `--ajustar=${referencia}`, '--soltos=comprimento', '--abrir=0.4', `--grava=${saida}`]);
    expect(aberta.codigo).toBe(0);
    expect(aberta.out).toMatch(/com a busca 0,4 vez o médio além de cada faixa/);
    expect(aberta.out).toMatch(/comprimento = 2\d{3}(,\d+)? mm {2}fora da faixa \(1800 a 2600\)/);
    expect(aberta.out).toMatch(/gravado: ajuste\.json e lateral\.desenho\.json \(a família "carcaca-sintetica" 1\.0\.0 nos valores do ajuste, fora da faixa dela\)\ngravados também lateral\.contornos\.json e lateral\.png\n$/);
    expect(readdirSync(saida).sort()).toEqual(['ajuste.json', 'lateral.contornos.json', 'lateral.desenho.json', 'lateral.png']);
    const ajuste = JSON.parse(readFileSync(join(saida, 'ajuste.json'), 'utf8'));
    expect(ajuste).toMatchObject({ familia: 'carcaca-sintetica', versao: '1.0.0', abrir: 0.4, soltos: ['comprimento'], medida: 'regioes' });
    expect(ajuste.sha256DaReferencia).toBe(createHash('sha256').update(readFileSync(referencia)).digest('hex'));
    expect(Math.abs(ajuste.valores.comprimento - 2900)).toBeLessThan(20);
    expect(ajuste.foraDaFaixa).toEqual([{ parametro: 'comprimento', valor: ajuste.valores.comprimento, minimo: 1800, maximo: 2600, unidade: 'mm' }]);
    expect(JSON.parse(readFileSync(join(saida, 'lateral.desenho.json'), 'utf8')).parametros.comprimento).toBe(ajuste.valores.comprimento);
    const json = JSON.parse((await rodar(['familia', arquivo, `--ajustar=${referencia}`, '--soltos=comprimento', '--json'])).out);
    expect(json).toMatchObject({ noLimite: ['comprimento'], foraDaFaixa: [], valores: { comprimento: 2600 } });
    expect((await rodar(['familia', arquivo, `--ajustar=${referencia}`, '--abrir=-1'])).codigo).toBe(2);
    expect((await rodar(['familia', arquivo, '--ajustar='])).codigo).toBe(2);
    const semParametro = await rodar(['familia', arquivo, `--ajustar=${referencia}`, '--soltos=largura']);
    expect(semParametro.codigo).toBe(3);
    expect(semParametro.err).toMatch(/o parâmetro "largura" não existe na família/);
  }, 120_000);

  it('o valor fora da faixa e o perfil que não existe saem com 3 dizendo a faixa, e --valores malformado sai com 2', async () => {
    const { arquivo } = comArquivo();
    const fora = await rodar(['familia', arquivo, '--valores=vao=900']);
    expect(fora.codigo).toBe(3);
    expect(fora.err).toMatch(/o parâmetro "vao" vale 900 mm, fora da faixa da família \(de 300 a 520 mm\)/);
    const perfil = await rodar(['familia', arquivo, '--perfil=enorme']);
    expect(perfil.codigo).toBe(3);
    expect(perfil.err).toMatch(/o perfil "enorme" não existe na família \(os perfis são "compacta", "larga"; "minimo", "medio", "maximo" existem em toda família/);
    const mal = await rodar(['familia', arquivo, '--valores=vao']);
    expect(mal.codigo).toBe(2);
    expect(mal.err).toMatch(/--valores deve ser nome=número separados por vírgula/);
  });

  it('a família inválida sai com 3 e lista cada erro; sem arquivo sai com 2 mostrando o uso; arquivo que não existe sai com 2', async () => {
    const f = familiaSintetica();
    f.parametros.vao.padrao = 100;
    const { arquivo, dir } = comArquivo(f);
    const r = await rodar(['familia', arquivo, '--provar']);
    expect(r.codigo).toBe(3);
    expect(r.err).toMatch(/a família carcaca\.familia-de-desenho\.json tem 1 erro\(s\):\n- o parâmetro "vao" tem o padrão 100 fora da faixa de 300 a 520 mm\n/);
    const g = familiaSintetica();
    g.parametros.corDaTinta = { unidade: 'razao', padrao: 1, minimo: 0, medio: 1, maximo: 1 };
    expect((await rodar(['familia', comArquivo(g).arquivo])).err).toMatch(/o parâmetro "corDaTinta" não é lido por nenhum campo do desenho/);
    expect((await rodar(['familia'])).err).toMatch(/uso: npm run desenho -- familia <f\.familia-de-desenho\.json>/);
    const sem = await rodar(['familia', join(dir, 'nao-existe.familia-de-desenho.json')]);
    expect(sem.codigo).toBe(2);
    expect(sem.err).toMatch(/o arquivo .* não existe/);
  });

  it('--pecas lê o catálogo de peças: a família sem peças dentro resolve com ele, e o catálogo ilegível sai com 2, o malformado e o repetido com 3', async () => {
    const f = familiaSintetica();
    delete f.desenho.pecas;
    const { dir, arquivo } = comArquivo(f);
    const catalogo = escrever(dir, 'pecas.json', { formato: 'mecanifica.pecas-de-desenho@1', pecas: { arcoDeRodaComAro: arcoDeRodaComAro(), anelCoaxial: anelCoaxial() } });
    expect((await rodar(['familia', arquivo])).codigo).toBe(3);
    const r = await rodar(['familia', arquivo, `--pecas=${catalogo}`, '--provar']);
    expect(r.codigo).toBe(0);
    expect(r.out).toMatch(/98 de 98 resolvem/);
    expect((await rodar(['familia', arquivo, `--pecas=${join(dir, 'nao-existe.json')}`])).codigo).toBe(2);
    const vazio = await rodar(['familia', arquivo, '--pecas']);
    expect(vazio.codigo).toBe(2);
    expect(vazio.err).toMatch(/--pecas precisa de um ou mais arquivos de catálogo/);
    const ruim = escrever(dir, 'ruim.json', { formato: 'mecanifica.pecas-de-desenho@1', pecas: { x: { pontos: {} } } });
    const mal = await rodar(['familia', arquivo, `--pecas=${ruim}`]);
    expect(mal.codigo).toBe(3);
    expect(mal.err).toMatch(/1 erro\(s\) no catálogo ruim\.json:\n- a peça "x": "ligacoes" deve ser um objeto/);
    const repetido = escrever(dir, 'repetido.json', { formato: 'mecanifica.pecas-de-desenho@1', pecas: { anelCoaxial: anelCoaxial() } });
    const dupla = await rodar(['familia', arquivo, `--pecas=${catalogo},${repetido}`]);
    expect(dupla.codigo).toBe(3);
    expect(dupla.err).toMatch(/a peça "anelCoaxial" está em mais de um catálogo/);
  }, 120_000);
});

describe('npm run desenho -- familia: o catálogo declarado e os perfis da faixa', () => {
  const catalogoDeTeste = { formato: 'mecanifica.pecas-de-desenho@1', pecas: { arcoDeRodaComAro: arcoDeRodaComAro(), anelCoaxial: anelCoaxial() } };
  /* A família sem as peças dentro, com o catálogo ao lado declarado em "catalogo". */
  const familiaComCatalogo = (catalogo = 'pecas.json') => { const f = familiaSintetica(); delete f.desenho.pecas; f.catalogo = catalogo; return f; };

  it('a família que declara "catalogo" desenha, prova e grava sem --pecas, e o caminho é relativo ao arquivo dela e não a quem roda', async () => {
    const dir = pasta();
    mkdirSync(join(dir, 'familias'));
    mkdirSync(join(dir, 'catalogos'));
    escrever(join(dir, 'catalogos'), 'pecas.json', catalogoDeTeste);
    const arquivo = escrever(join(dir, 'familias'), 'carcaca.familia-de-desenho.json', familiaComCatalogo('../catalogos/pecas.json'));
    const desenhado = await rodar(['familia', arquivo]);
    expect(desenhado.codigo).toBe(0);
    expect(desenhado.out).toMatch(/estado resolvido, 0 graus de liberdade/);
    const prova = await rodar(['familia', arquivo, '--provar']);
    expect(prova.codigo).toBe(0);
    expect(prova.out).toMatch(/98 de 98 resolvem/);
    const saida = join(dir, 'saida');
    expect((await rodar(['familia', arquivo, '--perfil=compacta', `--grava=${saida}`])).codigo).toBe(0);
    expect(Object.keys(JSON.parse(readFileSync(join(saida, 'lateral.desenho.json'), 'utf8')).pecas)).toEqual(['anelCoaxial', 'arcoDeRodaComAro']);
    /* --pecas segue aceito, e o mesmo arquivo dito nos dois lugares não conta duas vezes */
    const mesmo = await rodar(['familia', arquivo, `--pecas=${join(dir, 'catalogos', 'pecas.json')}`, '--provar']);
    expect(mesmo.codigo).toBe(0);
    /* um catálogo a mais com o nome de uma peça que já veio do declarado é o erro de sempre */
    const repetido = escrever(dir, 'repetido.json', { formato: 'mecanifica.pecas-de-desenho@1', pecas: { anelCoaxial: anelCoaxial() } });
    const dupla = await rodar(['familia', arquivo, `--pecas=${repetido}`]);
    expect(dupla.codigo).toBe(3);
    expect(dupla.err).toMatch(/a peça "anelCoaxial" está em mais de um catálogo/);
  }, 180_000);

  it('o catálogo declarado que não existe sai com 2 dizendo que a família o declara, o malformado com 3, e o declarado errado com 3 dizendo o campo', async () => {
    const dir = pasta();
    const arquivo = escrever(dir, 'carcaca.familia-de-desenho.json', familiaComCatalogo());
    const falta = await rodar(['familia', arquivo, '--provar']);
    expect(falta.codigo).toBe(2);
    expect(falta.err).toMatch(/o catálogo de peças que a família declara em "catalogo", .*pecas\.json não existe/);
    escrever(dir, 'pecas.json', { formato: 'mecanifica.pecas-de-desenho@1', pecas: { x: { pontos: {} } } });
    const mal = await rodar(['familia', arquivo, '--provar']);
    expect(mal.codigo).toBe(3);
    expect(mal.err).toMatch(/1 erro\(s\) no catálogo pecas\.json/);
    const absoluto = escrever(dir, 'absoluto.familia-de-desenho.json', familiaComCatalogo('/tmp/pecas.json'));
    const r = await rodar(['familia', absoluto, '--provar']);
    expect(r.codigo).toBe(3);
    expect(r.err).toMatch(/a família absoluto\.familia-de-desenho\.json tem 1 erro\(s\):\n- o "catalogo" "\/tmp\/pecas\.json" é um caminho absoluto/);
  });

  it('--perfil=minimo, medio e maximo põem todos os parâmetros naquele ponto da faixa, e gravam o mesmo desenho que os valores escritos um a um', async () => {
    const dir = pasta();
    escrever(dir, 'pecas.json', catalogoDeTeste);
    const arquivo = escrever(dir, 'carcaca.familia-de-desenho.json', familiaComCatalogo());
    const f = familiaSintetica();
    const faixa = (campo) => Object.entries(f.parametros).map(([n, p]) => `${n}=${p[campo]}`).join(',');
    for (const campo of ['minimo', 'medio', 'maximo']) {
      const a = join(dir, `perfil-${campo}`); const b = join(dir, `valores-${campo}`);
      const porPerfil = await rodar(['familia', arquivo, `--perfil=${campo}`, `--grava=${a}`]);
      const porValores = await rodar(['familia', arquivo, `--valores=${faixa(campo)}`, `--grava=${b}`]);
      expect([porPerfil.codigo, porValores.codigo], campo).toEqual([0, 0]);
      expect(readFileSync(join(a, 'lateral.desenho.json')).equals(readFileSync(join(b, 'lateral.desenho.json'))), campo).toBe(true);
      expect(readFileSync(join(a, 'lateral.contornos.json')).equals(readFileSync(join(b, 'lateral.contornos.json'))), campo).toBe(true);
    }
    const minimo = JSON.parse(readFileSync(join(dir, 'perfil-minimo', 'lateral.desenho.json'), 'utf8'));
    expect(minimo.parametros).toMatchObject({ comprimento: 1800, altura: 600, vao: 300 });
    const maximo = JSON.parse(readFileSync(join(dir, 'perfil-maximo', 'lateral.desenho.json'), 'utf8'));
    expect(maximo.parametros).toMatchObject({ comprimento: 2600, altura: 900, vao: 520 });
    /* o valor dado vale por cima do perfil, e a relação de ordem recusa o conjunto que a fere antes de desenhar */
    const por = await rodar(['familia', arquivo, '--perfil=maximo', '--valores=vao=300']);
    expect(por.codigo).toBe(3);
    expect(por.err).toMatch(/esses valores ferem a relação de ordem "arco-cabe-no-vao" \(raioDoArco <= vao\) não vale: o lado esquerdo vale 320 e o direito 300/);
  }, 180_000);

  it('a peça virada aparece no relatório da família do braço: com "angulo": 90 nos usos tamborPunho e punho, o punho sai para cima contra o sentido "abaixo" do uso, e o aviso diz qual uso', async () => {
    const D = 'procedural/familias-de-desenho/braco-colaborativo';
    const { erros, pecas } = lerCatalogoDePecas(JSON.parse(readFileSync(`${D}/pecas.json`, 'utf8')));
    expect(erros).toEqual([]);
    const { erros: e, familia } = lerFamiliaDeDesenho(JSON.parse(readFileSync(`${D}/braco-colaborativo.familia-de-desenho.json`, 'utf8')), { pecas });
    expect(e).toEqual([]);
    const certo = await desenhar(especializarFamilia(familia, valoresDaFamilia(familia).valores, { pecas }));
    expect(certo.relatorio.estado).toBe('resolvido');
    expect(certo.relatorio.orientacao).toEqual([]);
    expect(certo.relatorio.avisos).toEqual([]);
    const virada = { ...familia, desenho: JSON.parse(JSON.stringify(familia.desenho)) };
    virada.desenho.usos.tamborPunho.parametros.angulo = 90;
    virada.desenho.usos.punho.parametros.angulo = 90;
    const r = await desenhar(especializarFamilia(virada, valoresDaFamilia(virada).valores, { pecas }));
    expect(r.relatorio.orientacao).toHaveLength(1);
    expect(r.relatorio.orientacao[0]).toMatchObject({ relacao: 'tamborPunho.comprimento', uso: 'tamborPunho', peca: 'anelCoaxial', pedido: 'abaixo', chute: 'acima' });
    expect(r.texto).toMatch(/aviso: a peça "anelCoaxial" usada em "tamborPunho" \(relação "tamborPunho\.comprimento"\) está virada/);
  }, 120_000);
});

describe('npm run desenho -- conferir', () => {
  /* Uma pasta de famílias com uma só, que tem o perfil `referencia` e o catálogo ao lado, e a pasta `referencia/` gravada pelo próprio comando. */
  const montar = async () => {
    const raiz = pasta();
    const dir = join(raiz, 'carcaca');
    mkdirSync(dir);
    escrever(dir, 'pecas.json', { formato: 'mecanifica.pecas-de-desenho@1', pecas: { arcoDeRodaComAro: arcoDeRodaComAro(), anelCoaxial: anelCoaxial() } });
    const f = familiaSintetica();
    delete f.desenho.pecas;
    f.catalogo = 'pecas.json';
    f.perfis.referencia = { descricao: 'o ponto médio', parametros: { altura: 750, raioDoArco: 270, vao: 410, recuo: 320 } };
    const arquivo = escrever(dir, 'carcaca.familia-de-desenho.json', f);
    expect((await rodar(['familia', arquivo, '--perfil=referencia', `--grava=${join(dir, 'referencia')}`])).codigo).toBe(0);
    return { raiz, dir, arquivo, familia: f };
  };

  it('prova a família e confere que a pasta referencia/ é o que ela gera: sai com 0 e diz os números', async () => {
    const { raiz } = await montar();
    const r = await rodar(['conferir', raiz]);
    expect(r.err).toBe('');
    expect(r.codigo).toBe(0);
    expect(r.out).toMatch(/carcaca\.familia-de-desenho\.json: família "carcaca-sintetica" 1\.0\.0\n/);
    expect(r.out).toMatch(/\n {2}prova: 197 conjuntos desenhados \(a prova de pares e um sorteio de 100\), 3 fora das relações de ordem, todos resolvem\n/);
    expect(r.out).toMatch(/\n {2}referencia\/: igual ao que a família gera \(desenho e contornos\)\n/);
    expect(r.out).toMatch(/\n1 família\(s\) conferida\(s\): a prova passa e as pastas de perfil gravadas são as que elas geram\.\n$/);
    const json = JSON.parse((await rodar(['conferir', raiz, '--json'])).out);
    expect(json.ok).toBe(true);
    expect(json.familias[0]).toMatchObject({ id: 'carcaca-sintetica', prova: { total: 200, desenhados: 197, recusados: 3 }, falhas: [] });
    expect(json.familias[0].pastas).toEqual([{ perfil: 'referencia', falhas: [] }]);
  }, 180_000);

  it('confere também as pastas minimo/, medio/ e maximo/ quando existem ao lado da família', async () => {
    const { raiz, dir, arquivo } = await montar();
    expect((await rodar(['familia', arquivo, '--perfil=minimo', `--grava=${join(dir, 'minimo')}`])).codigo).toBe(0);
    const r = await rodar(['conferir', raiz]);
    expect(r.codigo).toBe(0);
    expect(r.out).toMatch(/\n {2}minimo\/: igual ao que a família gera/);
    expect(r.out).not.toMatch(/medio\/|maximo\//);
    writeFileSync(join(dir, 'minimo', 'lateral.contornos.json'), readFileSync(join(dir, 'minimo', 'lateral.contornos.json'), 'utf8').replace('1800', '1801'));
    const ruim = await rodar(['conferir', raiz]);
    expect(ruim.codigo).toBe(4);
    expect(ruim.out).toMatch(/\n {2}minimo\/: DIFERENTE do que a família gera\n/);
    expect(ruim.out).toMatch(/\n {2}referencia\/: igual/);
  }, 180_000);

  it('a pasta referencia/ que a família já não gera sai com 4 dizendo o arquivo, a linha e o comando que regrava', async () => {
    const { raiz, dir, arquivo, familia } = await montar();
    /* mudar um valor do perfil referencia muda o desenho especializado e os contornos */
    familia.perfis.referencia.parametros.altura = 760;
    escrever(dir, 'carcaca.familia-de-desenho.json', familia);
    const r = await rodar(['conferir', raiz]);
    expect(r.codigo).toBe(4);
    expect(r.out).toMatch(/\n {2}referencia\/: DIFERENTE do que a família gera\n/);
    expect(r.out).toMatch(/lateral\.desenho\.json não é o que a família gera para o perfil "referencia" \(primeira diferença na linha \d+: a família gera "\\"altura\\": 760,?" e o arquivo tem "\\"altura\\": 750,?"\)/);
    expect(r.out).toMatch(/lateral\.contornos\.json não é o que a família gera/);
    expect(r.out).toMatch(/regrave com npm run desenho -- familia .*carcaca\.familia-de-desenho\.json --perfil=referencia --grava=.*referencia/);
    expect(r.out).toMatch(/\n1 de 1 família\(s\) com problema: .*carcaca\.familia-de-desenho\.json\.\n$/);
    /* regravada, volta a passar */
    expect((await rodar(['familia', arquivo, '--perfil=referencia', `--grava=${join(dir, 'referencia')}`])).codigo).toBe(0);
    expect((await rodar(['conferir', raiz])).codigo).toBe(0);
  }, 180_000);

  it('a família com perfil referencia e sem a pasta sai com 4, a que não prova sai com 4 dizendo o conjunto, a inválida com 3 e a pasta sem família com 2', async () => {
    const { raiz, dir, familia } = await montar();
    rmSync(join(dir, 'referencia'), { recursive: true });
    const sem = await rodar(['conferir', raiz]);
    expect(sem.codigo).toBe(4);
    expect(sem.out).toMatch(/\n {2}referencia\/: DIFERENTE do que a família gera\n {4}falta a pasta .*referencia; grave com npm run desenho -- familia .* --perfil=referencia --grava=/);

    /* sem as relações de ordem, o raio de 480 do arco não cabe e a prova reprova */
    const quebrada = JSON.parse(JSON.stringify(familia));
    quebrada.restricoes = []; quebrada.parametros.raioDoArco.maximo = 480; delete quebrada.perfis.referencia;
    escrever(dir, 'carcaca.familia-de-desenho.json', quebrada);
    const prova = await rodar(['conferir', raiz]);
    expect(prova.codigo).toBe(4);
    expect(prova.out).toMatch(/\n {2}prova: 200 conjuntos desenhados \(a prova de pares e um sorteio de 100\); \d+ FALHARAM\n {4}FALHOU todos no máximo: recusado: /);

    const invalida = JSON.parse(JSON.stringify(familia));
    invalida.parametros.vao.padrao = 100;
    escrever(dir, 'carcaca.familia-de-desenho.json', invalida);
    const mal = await rodar(['conferir', raiz]);
    expect(mal.codigo).toBe(3);
    expect(mal.out).toMatch(/: INVÁLIDA\n {2}- o parâmetro "vao" tem o padrão 100 fora da faixa de 300 a 520 mm\n/);

    /* o catálogo que a família declara e não existe deixa a família inválida para o gate, e a mensagem diz qual arquivo */
    rmSync(join(dir, 'pecas.json'));
    escrever(dir, 'carcaca.familia-de-desenho.json', familia);
    const semCatalogo = await rodar(['conferir', raiz]);
    expect(semCatalogo.codigo).toBe(3);
    expect(semCatalogo.err).toMatch(/o catálogo de peças que a família declara em "catalogo", .*pecas\.json não existe/);
    expect(semCatalogo.out).toMatch(/: INVÁLIDA\n/);

    const vazia = pasta();
    const nenhuma = await rodar(['conferir', vazia]);
    expect(nenhuma.codigo).toBe(2);
    expect(nenhuma.err).toMatch(/nenhuma família \(\*\.familia-de-desenho\.json\) sob .*; um gate que não confere nada não passa/);
    expect((await rodar(['conferir', join(vazia, 'nao-existe')])).codigo).toBe(2);
  }, 180_000);
});

describe('npm run desenho: o desenho com peças e parâmetros', () => {
  it('um desenho @3 com peças resolve, e com um catálogo de fora grava o hash do catálogo na origem do contorno', async () => {
    const dir = pasta();
    const d = carcacaSintetica();
    expect((await rodar([escrever(dir, 'lateral.desenho.json', d)])).codigo).toBe(0);
    const proprio = JSON.parse(readFileSync(join(dir, 'lateral.contornos.json'), 'utf8'));
    expect(proprio.origem.pecas).toBeUndefined();
    expect(Object.keys(proprio.regioes)).toEqual(['arco.aro', 'arco.painel', 'mastro.anel', 'mastro.corpo']);

    const fora = pasta();
    delete d.pecas;
    const catalogoTexto = `${JSON.stringify({ formato: 'mecanifica.pecas-de-desenho@1', pecas: { arcoDeRodaComAro: arcoDeRodaComAro(), anelCoaxial: anelCoaxial() } }, null, 2)}\n`;
    const catalogo = escrever(fora, 'pecas.json', catalogoTexto);
    const r = await rodar([escrever(fora, 'lateral.desenho.json', d), `--pecas=${catalogo}`]);
    expect(r.codigo).toBe(0);
    const doCatalogo = JSON.parse(readFileSync(join(fora, 'lateral.contornos.json'), 'utf8'));
    expect(doCatalogo.origem.pecas).toEqual({ 'pecas.json': createHash('sha256').update(catalogoTexto).digest('hex') });
    expect(doCatalogo.regioes).toEqual(proprio.regioes);
    const sem = await rodar([join(fora, 'lateral.desenho.json')]);
    expect(sem.codigo).toBe(3);
    expect(sem.err).toMatch(/o uso "arco": a peça "arcoDeRodaComAro" não existe/);
  }, 180_000);
});
