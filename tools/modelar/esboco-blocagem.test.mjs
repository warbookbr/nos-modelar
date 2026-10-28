/* O `--nivel-zero` do esboço: as vistas `--unidade` e `--composta` desenhadas pela blocagem do nível zero, comparadas com o
   desenho das formas (`desenharEsboco`) que as imagens usam por padrão.
   A prova é a silhueta. Para cada esboço da pasta de fixtures do módulo e do banco de provas, opção e vista, a camada do desenho
   pela blocagem é pintada numa grade de um pixel (`esboco-silhueta.mjs`: a união das faces, sem navegador) e comparada com a do
   desenho atual da mesma opção, desenhado só com as formas que a blocagem tem (o que o tradutor declara sem equivalente sai do
   desenho atual, porque não existe na blocagem). A medida é a interseção sobre a união (IoU) e a razão das escalas.

   Três mínimos, cada um com o que o explica:
   - 0,998, contra o desenho atual com os lados do esboço (128 no cilindro, no anel e no cone, 48 no tubo): as duas silhuetas são o
     mesmo polígono, e sobra o arredondamento das coordenadas da blocagem (1e-6 mm) e o polígono de 48 lados do tubo, girado em
     relação ao do desenho atual (a mesma razão da tolerância de envelope do tradutor): todo esboço abaixo de 0,9999 tem tubo, e o
     pior caso medido é a isométrica do chassi de tubos curvos do carrinho, 0,9988. Os esboços só de formas exatas (casa,
     guarda-roupa, cubo, moto sem tubo) dão 1,0000. É a prova do desenhista da blocagem, sem a escolha de facetas do outro.
   - 0,98, contra o desenho que a ferramenta grava (`ladosPorEscala`, que escolhe o menor número de lados cuja flecha fica abaixo de
     0,35 px): o polígono inscrito do desenho atual sai até 0,35 px para dentro do círculo da blocagem, em toda a volta das curvas,
     e a razão disso sobre a área é maior nas formas pequenas na tela. O pior caso medido é a lateral do mancal, 0,9862, com uma
     roda vista de frente; 0,98 fica 0,6 ponto abaixo disso, e a comparação com os lados do esboço (acima) é a que pega um desvio
     de forma.
   - 0,95, só nos esboços em que o tradutor declara a perda `inclinacao` (a caçamba do carrinho, de seção inclinada): a blocagem
     leva o contorno de cada seção ao plano perpendicular ao eixo, e a bacia muda de forma na vista de lado (0,9554 medido,
     igual com os dois tipos de faceta, porque a perda é de forma e não de faceta). O limite só afrouxa quando o relatório de
     perdas traz a causa.
   Os três mínimos valem para o que a blocagem leva. A forma que a blocagem não consegue desenhar na silhueta sai dela como
   `naoTraduzidas` e do desenho atual, e isso inclui a forma de recorte (`subtrai`) de envelope igual cujo cortador vara a forma na
   direção de uma vista e abre um vão que a blocagem pinta (`MUDANCA_MAXIMA_DA_SILHUETA_POR_RECORTE`, 0,1% da silhueta, medido por
   `esboco-blocagem-recorte.mjs`): os arcos de roda que atravessam o chassi do caminhão importado de OpenSCAD davam 0,9807 na
   isométrica e 0,8965 na lateral, e quatro formas recortadas dele saem da blocagem, com o motivo no relatório.
   A escala é conferida junto: a razão entre as escalas do quadro fica em 0,1% (mesmas facetas) e 0,5% (facetas da ferramenta),
   o que mantém a composta com as mesmas proporções e a mesma escala. Com `ESBOCO_TABELA=1` o teste imprime a tabela de IoU.

   Custo. A bateria varre todo esboço do banco de provas e desenha 8 vezes cada opção (4 vistas, com os lados do esboço e os da
   ferramenta), e o avião da segunda rodada e os 8 detalhes dele a levaram de 4 a 8 minutos. Medido em 2026-10-14, em 4 núcleos: 517 s
   com 69 testes; 173 s sem o perfil das fitas dos traços, que a máscara da silhueta não lê (`CAMADA_DA_SILHUETA`, de
   `esboco-silhueta.mjs`); 127 s com o casco convexo do recorte guardado pelos pontos (`cascoConvexo`, `recorte.js`).

   Plano da bateria rápida, fatia 1 (2026-10-28): de 130 s sozinho (medido em 2026-10-27; 159 s em 2026-10-28, com outra bateria na
   máquina) para 52 s e 52 s em duas medidas seguidas, com a máquina dividida com outra bateria (carga de 5 a 6 em 4 processadores). O
   que se tirou, medido por etapa num processo só (142 s de CPU antes, 96 s depois, 46 s deles nos desenhos): o SVG que a máscara
   não lê (`soCamada` em `CAMADA_DA_SILHUETA`, ver `desenharEsboco` e `desenharBlocagem`) e a resolução da mesma opção refeita doze
   vezes por esboço (`resolverOpcaoGuardada`); e a blocagem, os 8 desenhos de cada opção e as 4 máscaras da blocagem passaram para
   processos à parte (`esboco-blocagem-medidas.mjs`), que começam antes dos outros testes e trabalham enquanto eles rodam, com os
   esboços repartidos por fila (o maior primeiro), porque o avião da segunda rodada sozinho leva 20 s e uma divisão fixa deixaria um
   processo com ele. Cada processo repete a decomposição convexa das malhas de família que toca (cerca de 40 s de CPU somados), e
   mesmo assim a soma é menor que a de antes. A medida e a conferência ficaram separadas: o processo devolve IoU, razão das escalas e
   tamanho do quadro, e as conferências abaixo são as mesmas de antes, com os mesmos mínimos e as mesmas mensagens. O mesmo conjunto de
   medidas, antes e depois, é idêntico em todos os 69 esboços (verificado com o desenho e a camada de antes). Esboço novo e grande
   entra na bateria sem ajuste. Se o arquivo voltar a passar de 60 s, medir antes por etapa (resolver, tradução, `furosAbertos`,
   `recortesAbertos`, desenho atual, desenho da blocagem). */
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { desenharEsboco, ErroDeEsboco } from '../../modulos/esboco/src/index.js';
import { planoDeDetalhe } from '../../modulos/esboco/src/condutor.js';
import { COR_DO_VIZINHO, OPACIDADE_DO_VIZINHO, formasVizinhas } from '../../modulos/esboco/src/detalhe.js';
import { desenharBlocagem } from '../../modulos/esboco/src/desenho-da-blocagem.js';
import { blocagemDoEsboco } from './esboco-blocagem.mjs';
import { iniciarMedicao } from './esboco-blocagem-medidas.mjs';
import { compostaArquivo, esbocoIsolado, variante, vistasArquivo, VISTAS_DA_ANALISE } from './esboco.mjs';
import { CAMADA_DA_SILHUETA, iou, mascaraDaCamada } from './esboco-silhueta.mjs';

const MINIMO_COM_AS_MESMAS_FACETAS = 0.998;
const MINIMO_COM_AS_FACETAS_DA_FERRAMENTA = 0.98;
const MINIMO_COM_INCLINACAO_DECLARADA = 0.95;
const ESCALA_COM_AS_MESMAS_FACETAS = 1e-3;
const ESCALA_COM_AS_FACETAS_DA_FERRAMENTA = 5e-3;

const varrer = (pasta) => readdirSync(pasta, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? varrer(join(pasta, e.name)) : e.name.endsWith('.esboco.json') ? [join(pasta, e.name)] : []));
const raiz = new URL('../../', import.meta.url).pathname;
const arquivos = [...varrer(join(raiz, 'modulos/esboco/tests/fixtures')), ...varrer(join(raiz, 'docs/modelar/banco-de-provas'))].sort((a, b) => a.split('/').pop().localeCompare(b.split('/').pop()));
const nomeDe = (caminho) => caminho.split('/').pop();
const lerJson = (caminho) => JSON.parse(readFileSync(caminho, 'utf8'));

/* O esboço que o próprio desenho recusa (loft vazado com seção côncava, um atrito registrado): a blocagem recusa com a mesma causa. */
const RECUSADOS = ['atrito-loft-vazado.esboco.json'];

const paraMedir = arquivos.filter((a) => !RECUSADOS.includes(nomeDe(a)));
let medicao;
beforeAll(() => { medicao = iniciarMedicao(paraMedir); });
afterAll(() => medicao?.encerrar());

const PASTA = mkdtempSync(join(tmpdir(), 'esboco-blocagem-'));
afterAll(() => rmSync(PASTA, { recursive: true, force: true }));

const tabela = [];
afterAll(() => { if (process.env.ESBOCO_TABELA) console.log(tabela.join('\n')); });

describe('o isolamento por unidade pela procedência dos volumes', () => {
  const casos = [
    ['moto-parametros.esboco.json', null],
    ['chassi-e-cacamba.esboco.json', ['quadro+manoplaD+manoplaE', 'escoraFrenteD+escoraFrenteE+paFrente', 'pisoCac']],
  ];
  for (const [nome, unidades] of casos) {
    it(`${nome}: cada unidade desenha só as formas dela e as vizinhas, na mesma silhueta do desenho atual`, () => {
      const bruto = lerJson(arquivos.find((a) => nomeDe(a) === nome));
      const todas = planoDeDetalhe(bruto).unidades.filter((u) => unidades === null || unidades.includes(u.id));
      expect(todas.length).toBeGreaterThan(0);
      for (const u of todas) {
        const b = blocagemDoEsboco(bruto, null, { unidade: u.id });
        expect(b.paineis, 'o isolamento de unidade desenha só a primeira opção').toHaveLength(1);
        const vizinhas = formasVizinhas(bruto, null, u.id);
        const { tabela: tab, dados, semEquivalente } = b.opcoes[0];
        const ocultas = semEquivalente.map((x) => x.id);
        /* a procedência: um volume é da unidade ou vizinho conforme as formas de que veio */
        const desenhados = new Map(b.paineis[0].volumes.map((v) => [v.id, v]));
        for (const f of dados.formas) {
          const volume = tab[f.id];
          if (volume === undefined) continue;
          if (u.membros.includes(f.id)) expect(desenhados.has(volume), `${u.id}: o volume de ${f.id} falta`).toBe(true);
        }
        for (const [volume, v] of desenhados) {
          const donas = dados.formas.filter((f) => tab[f.id] === volume).map((f) => f.id);
          const daUnidade = donas.some((id) => u.membros.includes(id));
          expect(daUnidade || donas.some((id) => vizinhas.includes(id)), `${u.id}: o volume ${volume} não é da unidade nem vizinho`).toBe(true);
          if (!daUnidade) expect(v).toMatchObject({ cor: COR_DO_VIZINHO, opacidade: OPACIDADE_DO_VIZINHO });
        }
        const semVizinhos = blocagemDoEsboco(bruto, null, { unidade: u.id, vizinhos: false });
        expect(semVizinhos.vizinhos).toEqual([]);
        expect(semVizinhos.paineis[0].volumes.length).toBeLessThanOrEqual(desenhados.size);
        expect(semVizinhos.paineis[0].volumes.every((v) => v.cor !== COR_DO_VIZINHO)).toBe(true);
        /* a silhueta contra o desenho atual da unidade isolada, com os vizinhos */
        /* o desenho das formas enquadra a unidade e recorta a vizinha na janela; a blocagem da unidade mantém o quadro que inclui as
           vizinhas inteiras, e por isso a silhueta se confere contra o desenho das formas sem esse enquadramento */
        const { isolado: comEnquadre } = esbocoIsolado(bruto, null, u.id, true);
        const isolado = { ...comEnquadre, enquadrar: undefined };
        const escondido = { ...isolado, opcoes: [{ ...isolado.opcoes[0], formas: isolado.opcoes[0].formas.map((f) => (ocultas.includes(f.id) ? { ...f, oculto: true } : f)) }], ladosPorEscala: false };
        for (const vista of VISTAS_DA_ANALISE) {
          const novo = desenharBlocagem({ vista, paineis: b.paineis }, CAMADA_DA_SILHUETA);
          const atual = desenharEsboco(variante(escondido, { vista, legendas: false, centros: false }), CAMADA_DA_SILHUETA);
          const r = iou(mascaraDaCamada(novo.camada), mascaraDaCamada(atual.camada));
          expect(r.iou, `${nome} unidade ${u.id} ${vista}`).toBeGreaterThanOrEqual(MINIMO_COM_AS_MESMAS_FACETAS);
          expect(Math.abs(novo.escala / atual.escala - 1)).toBeLessThanOrEqual(ESCALA_COM_AS_MESMAS_FACETAS);
        }
      }
    }, 240_000);
  }

  it('recusa a unidade que não existe com a mesma mensagem do desenho atual', () => {
    const bruto = lerJson(arquivos.find((a) => nomeDe(a) === 'moto-parametros.esboco.json'));
    expect(() => blocagemDoEsboco(bruto, null, { unidade: 'rodaTrazeira' })).toThrow(/não é uma unidade de detalhe/);
  });
});

const sha = (buf) => createHash('sha256').update(buf).digest('hex');

describe('--nivel-zero na composta e nas vistas', () => {
  const ARQUIVO = join(PASTA, 'mancal.esboco.json');
  writeFileSync(ARQUIVO, readFileSync(arquivos.find((a) => nomeDe(a) === 'mancal-eixo.esboco.json')));
  const CASA = join(PASTA, 'casa.esboco.json');
  writeFileSync(CASA, readFileSync(arquivos.find((a) => nomeDe(a) === 'casa.esboco.json')));

  it('a composta sai com o mesmo tamanho e a mesma disposição do desenho atual, e quase os mesmos pixels (casa, sem perda)', async () => {
    mkdirSync(join(PASTA, 'a'));
    mkdirSync(join(PASTA, 'b'));
    const atual = await compostaArquivo(CASA, { saida: join(PASTA, 'a') });
    const novo = await compostaArquivo(CASA, { saida: join(PASTA, 'b'), nivelZero: true });
    expect(novo.destino).toBe(join(PASTA, 'b', 'casa-nivel-zero-composta.png'));
    expect([novo.largura, novo.altura, novo.celula]).toEqual([atual.largura, atual.altura, atual.celula]);
    expect(novo.texto).toContain('pela blocagem do nível zero (11 de 11 volumes)');
    const A = PNG.sync.read(readFileSync(atual.destino));
    const B = PNG.sync.read(readFileSync(novo.destino));
    let diferem = 0;
    for (let i = 0; i < A.data.length; i += 4) {
      if (Math.max(Math.abs(A.data[i] - B.data[i]), Math.abs(A.data[i + 1] - B.data[i + 1]), Math.abs(A.data[i + 2] - B.data[i + 2])) > 40) diferem++;
    }
    /* medido: 0,17% dos pixels (a sombra das faces e a ponta dos traços); 1% deixa folga sem aceitar uma peça fora do lugar */
    expect(diferem / (A.width * A.height)).toBeLessThan(0.01);
  }, 120_000);

  it('a mesma entrada dá a mesma imagem, byte a byte, e a composta diz o que ficou sem equivalente', async () => {
    mkdirSync(join(PASTA, 'c'));
    mkdirSync(join(PASTA, 'd'));
    const a = await compostaArquivo(ARQUIVO, { saida: join(PASTA, 'c'), nivelZero: true });
    const b = await compostaArquivo(ARQUIVO, { saida: join(PASTA, 'd'), nivelZero: true });
    expect(sha(readFileSync(a.destino))).toBe(sha(readFileSync(b.destino)));
    expect(a.texto).toContain('3 de 3 volumes');
    expect(a.texto).toContain('aproximado: ponta_chaveta');
    expect(a.texto).toContain('sem equivalente e fora da imagem: base');
  }, 120_000);

  it('as vistas isoladas levam -nivel-zero no nome, reaproveitam a imagem que não mudou e recusam corte, explosão, zoom e prévia', async () => {
    const pasta = join(PASTA, 'e');
    mkdirSync(pasta);
    const primeira = await vistasArquivo(ARQUIVO, { vista: 'frontal', saida: pasta, nivelZero: true });
    expect(primeira.destinos).toEqual([join(pasta, 'mancal-nivel-zero-frontal.png')]);
    expect(primeira.reaproveitadas).toEqual([false]);
    const segunda = await vistasArquivo(ARQUIVO, { vista: 'frontal', saida: pasta, nivelZero: true });
    expect(segunda.reaproveitadas).toEqual([true]);
    const lado = await vistasArquivo(ARQUIVO, { vista: 'frontal', saida: pasta });
    expect(lado.destinos).toEqual([join(pasta, 'mancal-frontal.png')]);
    for (const opcao of [{ corte: { eixo: 'x', valor: 0 } }, { explosao: { eixo: 'x', distancia: 10 } }, { previa: true }, { zoomForma: { formas: 'eixo' } }]) {
      await expect(vistasArquivo(ARQUIVO, { vista: 'frontal', saida: pasta, nivelZero: true, ...opcao })).rejects.toThrow(/ficam no desenho das formas/);
    }
  }, 120_000);
});

/* A silhueta de cada esboço do banco de provas e das fixtures. A medida (a blocagem e os 8 desenhos de cada opção) é a parte pesada e
   roda em processos à parte, que começam antes dos outros testes do arquivo e trabalham enquanto eles rodam; aqui ficam as conferências,
   com os mesmos mínimos e a mesma mensagem de antes. */
describe('a silhueta pela blocagem coincide com a do desenho atual', () => {
  for (const caminho of paraMedir) {
    it(`${nomeDe(caminho)}: as quatro vistas de cada opção`, async () => {
      const resposta = await medicao.promessas.get(caminho);
      if (resposta.erro) throw new Error(resposta.erro);
      const m = resposta.medida;
      expect(m.paineis).toBe(m.opcoesDoEsboco);
      m.opcoes.forEach((opcao, i) => {
        const { inclinada } = opcao;
        const linha = [];
        for (const { vista, area, medidas: porLados } of opcao.vistas) {
          expect(area, `${nomeDe(caminho)} opção ${i + 1} ${vista}: a blocagem não pintou nada`).toBeGreaterThan(0);
          const medidas = [];
          for (const [lados, minimo, tolEscala] of [[false, inclinada ? MINIMO_COM_INCLINACAO_DECLARADA : MINIMO_COM_AS_MESMAS_FACETAS, ESCALA_COM_AS_MESMAS_FACETAS], [true, inclinada ? MINIMO_COM_INCLINACAO_DECLARADA : MINIMO_COM_AS_FACETAS_DA_FERRAMENTA, ESCALA_COM_AS_FACETAS_DA_FERRAMENTA]]) {
            const r = porLados.find((x) => x.lados === lados);
            medidas.push(r.iou.toFixed(4));
            expect(r.iou, `${nomeDe(caminho)} opção ${i + 1} ${vista} (${lados ? 'facetas da ferramenta' : 'lados do esboço'})`).toBeGreaterThanOrEqual(minimo);
            expect(Math.abs(r.razaoDasEscalas - 1), `${nomeDe(caminho)} opção ${i + 1} ${vista}: razão das escalas`).toBeLessThanOrEqual(tolEscala);
            expect(r.mesmaLargura).toBe(true);
            expect(r.mesmaAltura).toBe(true);
          }
          linha.push(`${vista.slice(0, 4)} ${medidas[0]} / ${medidas[1]}`);
        }
        tabela.push(`${nomeDe(caminho)} opção ${i + 1}${inclinada ? ' (inclinação declarada)' : ''}: ${linha.join(' | ')}`);
      });
    }, 240_000);
  }

  it('recusa o esboço que o desenho atual também recusa, com a mesma causa', () => {
    for (const nome of RECUSADOS) {
      const bruto = lerJson(arquivos.find((a) => nomeDe(a) === nome));
      let causaAtual;
      try { desenharEsboco(bruto); } catch (e) { causaAtual = e.message; }
      expect(causaAtual).toBeTruthy();
      expect(() => blocagemDoEsboco(bruto)).toThrow(ErroDeEsboco);
      expect(() => blocagemDoEsboco(bruto)).toThrow(causaAtual);
    }
  });
});
