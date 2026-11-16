/* vistas-de-superficie.test.mjs — a peça de lataria não fecha a rodada de forma sem a luz rasante e a curvatura da lataria no pacote do
   crítico (decisão da pessoa em 2026-10-30).

   Desde a fatia 6 do plano do reflexo (2026-11-16) as duas vistas saem da bancada (`superficieDaBancada`), e `vistas:critica` monta o
   pacote da peça de lataria sem MODELAR_BLENDER; com `--com-blender` e sem o Blender, recusa antes de qualquer captura. A captura da
   bancada é trocada aqui por uma que grava PNG desenhados por código, para provar a fração iluminada medida no PNG, a recusa abaixo de
   25 %, a vista de quina e a escala escrita na curvatura. Com as vistas (aqui por um gerador que grava arquivos), o
   pedido ganha a seção da superfície e o `pacote.json` diz a versão da receita e as imagens; o registro da rodada recusa o veredito do
   crítico de peça de lataria sem esse pacote, ou com o de outra versão, e grava as imagens quando ele está certo; e a ação do laço não
   dá por fechada a peça de lataria cuja última rodada não as tem. Com MODELAR_BLENDER, as duas vistas da peça de prova saem de verdade,
   com a nervura em cinza na curvatura porque só a chapa nasceu de subdivisão.

   A faixa dos vincos (decisão da pessoa em 2026-10-30): na chapa dobrada num vinco vivo declarado, com um amassado raso ao lado
   (`tools/fixtures/lataria-com-vinco/`), os vincos saem da receita onde a malha os pôs, as vistas obrigatórias os passam à curvatura
   por padrão, e o amassado sai com cor de defeito com a faixa fora da escala e quase branco com ela dentro, medido sem o Blender pela
   conta de `superficie.py` sobre a malha da peça e, com o Blender, no PNG. A dispensa de `PLANO.lataria` aparece como aviso, com o
   motivo, no `descrever` e no resumo do laço. */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { afterAll, beforeEach, describe, expect, it, onTestFinished } from 'vitest';
import { doAmbiente } from '../ambiente.mjs';
import { acaoDaPeca, gravarRodada, lerRodadas, medirReceita, registrarMedida, resumoDoLaco } from './rodada-de-modelagem.mjs';
import {
  LIMIAR_DA_LUZ_RASANTE, MANIFESTO_DO_PACOTE, MINIMO_DE_QUINA, comandoDoPacote, exigirLuzNaSuperficie, fracaoIluminadaDoPng, gravarManifesto, impressaoDoTexto, legendaNaCurvatura, mensagemSemBlender,
  superficieDaBancada, superficieDaPeca, superficieDoPacote, textoParaAFonte, vincosDaMalha, vistasDeSuperficie,
} from './vistas-de-superficie.mjs';
import { FUNDO } from './imagem-de-medida.mjs';
import { montarPedido, prefixoDaPeca, vistasParaCritica } from './vistas-para-critica.mjs';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { altura, linhaDaNervura, pontos } from '../../procedural/nucleo/fixtures/friso-prova.js';
import provaDoVinco, * as VINCO from '../fixtures/lataria-com-vinco/receita.js';
import provaDeLataria from '../fixtures/lataria-de-prova/receita.js';

const PECA = 'tools/fixtures/lataria-de-prova/receita.js';
const COM_VINCO = 'tools/fixtures/lataria-com-vinco/receita.js';
const REPO = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const NAO_LATARIA = 'tools/fixtures/forma-do-esboco/ok/receita.js';
const BLENDER = doAmbiente('BLENDER');
const area = mkdtempSync(join(tmpdir(), 'vistas-superficie-'));
afterAll(() => rmSync(area, { recursive: true, force: true }));

/* A medição da receita trocada por uma que passa: o pacote mede antes de capturar, e este arquivo não paga a medição real. */
const medirPassa = async () => ({ passou: true, sha256: 'sha256:de-ensaio', relatorio: 'ok' });

/* A bancada trocada por um gravador de arquivos, com o nome que ela dá a cada captura. */
function bancadaFalsa(pasta, peca) {
  const chamadas = [];
  const fazer = async (opcoes) => {
    chamadas.push(opcoes);
    const vistas = opcoes.revisar ? ['isometrica', 'frontal', 'direita', 'superior'] : String(opcoes.vistas).split(',');
    const sufixo = [opcoes.selecionadas ? `sel-${opcoes.selecionadas}` : null, opcoes.arame === 'raio-x' ? 'raio-x' : (opcoes.arame ? 'arame' : null), 'orto']
      .filter(Boolean).join('-');
    const arquivos = vistas.map((vista) => {
      const arquivo = join(pasta, `${prefixoDaPeca(peca)}${vista}-${sufixo}.png`);
      writeFileSync(arquivo, arquivo);
      return arquivo;
    });
    return { ok: true, resultado: { arquivos } };
  };
  return { fazer, chamadas };
}

/* As duas vistas trocadas por arquivos com o nome que os scripts do Blender dão. */
function superficieFalsa({ iluminada = () => 0.6, elevacao = null } = {}) {
  const chamadas = [];
  const gerar = async (peca, { pasta, lataria }) => {
    chamadas.push({ peca, pasta, lataria });
    const destino = join(pasta, 'superficie');
    mkdirSync(destino, { recursive: true });
    const gravar = (nome) => { const a = join(destino, nome); writeFileSync(a, nome); return a; };
    return {
      partes: ['chapa'],
      rasante: ['frente', 'lado'].flatMap((vista) => [30, 120].map((azimute) => ({ arquivo: gravar(`peca-${vista}-rasante-az${azimute}.png`), vista, azimute, iluminada: iluminada(vista, azimute), ...(elevacao ? { elevacao } : {}) }))),
      curvatura: ['frente', 'lado'].map((vista) => ({ arquivo: gravar(`peca-${vista}-curvatura-legenda.png`), vista })),
    };
  };
  return { gerar, chamadas };
}

describe('o pacote do crítico de peça de lataria', () => {
  it('sem o Blender, o pacote sai com as vistas da bancada; --com-blender sem ele recusa antes de qualquer captura', async () => {
    const base = mkdtempSync(join(area, 'sem-blender-'));
    const bancada = bancadaFalsa(base, PECA);
    const superficie = superficieFalsa();
    const resultado = await vistasParaCritica(PECA, {
      saida: join(base, 'rodada'), pastaDasCapturas: base, dependencias: { medirReceita: medirPassa, olharBancada: bancada.fazer, blender: null, superficieDaBancada: superficie.gerar },
    });
    expect(superficie.chamadas).toHaveLength(1);
    expect(readFileSync(resultado.pedido, 'utf8')).toContain('## Superfície');
    expect(comandoDoPacote(PECA)).toBe(`npm run vistas:critica -- ${PECA}`);
    const outra = bancadaFalsa(base, PECA);
    await expect(vistasParaCritica(PECA, { saida: join(base, 'conferencia'), pastaDasCapturas: base, comBlender: true, dependencias: { medirReceita: medirPassa, olharBancada: outra.fazer, blender: null } }))
      .rejects.toThrow('--com-blender roda o Blender como conferência e pede MODELAR_BLENDER apontando o executável');
    expect(outra.chamadas).toHaveLength(0);
    expect(existsSync(join(base, 'conferencia', 'pedido.md'))).toBe(false);
  });

  it('com --com-blender, as vistas do Blender saem na pasta da conferência e no pacote.json, e o pedido leva só as da bancada', async () => {
    const base = mkdtempSync(join(area, 'com-blender-'));
    const pasta = join(base, 'rodada');
    const daBancada = superficieFalsa();
    const doBlender = superficieFalsa();
    const resultado = await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base, comBlender: true,
      dependencias: { medirReceita: medirPassa, olharBancada: bancadaFalsa(base, PECA).fazer, blender: '/blender/de/ensaio', superficieDaBancada: daBancada.gerar, vistasDeSuperficie: doBlender.gerar },
    });
    expect(doBlender.chamadas.map((c) => c.pasta)).toEqual([join(pasta, 'conferencia-do-blender')]);
    const manifesto = JSON.parse(readFileSync(join(pasta, MANIFESTO_DO_PACOTE), 'utf8'));
    expect(manifesto.conferenciaDoBlender.curvatura).toEqual(resultado.conferenciaDoBlender.curvatura.map((i) => i.arquivo));
    const pedido = readFileSync(resultado.pedido, 'utf8');
    expect(pedido).not.toContain('conferencia-do-blender');
    expect(pedido).toContain(join(pasta, 'superficie', 'peca-frente-rasante-az30.png'));
  });

  it('com as vistas, o pedido ganha a seção da superfície com todas as imagens, e o pacote.json diz a versão e as imagens', async () => {
    const base = mkdtempSync(join(area, 'com-vistas-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const superficie = superficieFalsa();
    const resultado = await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base, dependencias: { medirReceita: medirPassa, olharBancada: bancada.fazer, superficieDaBancada: superficie.gerar },
    });
    expect(superficie.chamadas).toEqual([{ peca: PECA, pasta, lataria: { lataria: true, luzRasante: true, porque: 'a receita tem superfície livre por subdivisão (PASSOS[0])', partes: null } }]);
    const pedido = readFileSync(join(pasta, 'pedido.md'), 'utf8');
    const titulos = [...pedido.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(titulos).toEqual(['Objeto', 'Alvo', 'Referências', 'Modelo', 'Superfície', 'Reflexo', 'Partes', 'Critérios de reprovação', 'Veredito']);
    const secao = pedido.slice(pedido.indexOf('## Superfície'), pedido.indexOf('## Reflexo'));
    for (const { arquivo } of [...resultado.superficie.rasante, ...resultado.superficie.curvatura]) expect(secao).toContain(arquivo);
    expect(secao).toContain('- lado: olha de +x para -x, com +y para cima');
    expect(secao).not.toContain('- topo:');
    /* o pedido continua sem contar como a peça foi feita */
    expect(secao.replace(/\/\S+/g, '')).not.toMatch(/\bPASSOS\b|receita|rodada|histórico|mudou|ferramenta|subdivis/i);
    const manifesto = JSON.parse(readFileSync(join(pasta, MANIFESTO_DO_PACOTE), 'utf8'));
    expect(manifesto).toMatchObject({ formato: 'modelar.pacote-do-critico', peca: PECA, receita: impressaoDoTexto(readFileSync(PECA, 'utf8')), lataria: { partes: ['chapa'] } });
    expect(superficieDoPacote(PECA, { pasta, sha256: manifesto.receita })).toEqual({
      ok: true, imagens: ['peca-frente-rasante-az30.png', 'peca-frente-rasante-az120.png', 'peca-lado-rasante-az30.png', 'peca-lado-rasante-az120.png', 'peca-frente-curvatura-legenda.png', 'peca-lado-curvatura-legenda.png'],
    });
  }, 60_000);

  it('a peça que não é de lataria segue sem Blender, sem a seção, e o pacote.json diz que não há vista de superfície', async () => {
    const base = mkdtempSync(join(area, 'nao-lataria-'));
    const pasta = join(base, 'rodada');
    const superficie = superficieFalsa();
    await vistasParaCritica(NAO_LATARIA, {
      saida: pasta, pastaDasCapturas: base,
      dependencias: { medirReceita: medirPassa,
        olharBancada: bancadaFalsa(base, NAO_LATARIA).fazer, blender: null, superficieDaBancada: superficie.gerar,
        composta: async (arquivo) => { const destino = arquivo.replace(/\.esboco\.json$/, '-composta.png'); writeFileSync(destino, 'c'); return { destino }; },
        sobreposicaoDeCortes: async () => ({ arquivos: [], paineis: [], notas: [] }),
      },
    });
    expect(superficie.chamadas).toHaveLength(0);
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).not.toContain('## Superfície');
    expect(JSON.parse(readFileSync(join(pasta, MANIFESTO_DO_PACOTE), 'utf8'))).toMatchObject({ peca: NAO_LATARIA, lataria: null, superficie: null });
  }, 60_000);

  it('a luz rasante quase toda escura não derruba o pacote: a imagem sai do pedido com a vista, o azimute e a fração, e sem nenhuma que passe ele é recusado', async () => {
    /* a vista de três quartos da carenagem de prova, com a luz de 30 graus, saía com 0,5 % da peça iluminada */
    const base = mkdtempSync(join(area, 'escura-'));
    const pasta = join(base, 'rodada');
    const superficie = superficieFalsa({ iluminada: (vista, azimute) => (vista === 'lado' && azimute === 30 ? 0.005 : 0.6), elevacao: 40 });
    const tentadas = [];
    const luzMaisAlta = async ({ vista, graus }) => { tentadas.push(`${vista}@${graus}`); return []; };
    const resultado = await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base, dependencias: { medirReceita: medirPassa, olharBancada: bancadaFalsa(base, PECA).fazer, superficieDaBancada: superficie.gerar, luzMaisAlta },
    });
    /* a luz da bancada já é a que ela escolheu pela vista: não se refaz mais alta */
    expect(tentadas).toEqual([]);
    expect(resultado.superficie.rasante.map((i) => `${i.vista}-${i.azimute}`)).toEqual(['frente-30', 'frente-120', 'lado-120']);
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).toContain('Sem imagem: a vista lado ficou sem a luz rasante a 30 graus de azimute: a luz não alcança a peça por esse lado '
      + '(0,5 % da peça iluminada a 40 graus de elevação, abaixo do limiar de 25,0 %)');
    /* a imagem sem a medida também não passa: o limiar não se confere sem ela, e sem nenhuma imagem que passe o pacote é recusado */
    const semMedida = superficieFalsa({ iluminada: () => null });
    await expect(vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base, dependencias: { medirReceita: medirPassa, olharBancada: bancadaFalsa(base, PECA).fazer, superficieDaBancada: semMedida.gerar },
    })).rejects.toThrow(/saiu quase toda escura em 4 imagens.*peca-frente-rasante-az30\.png \(vista frente, luz a 30 graus\) não traz a fração iluminada medida, e o limiar é de 25,0 %/);
    expect(LIMIAR_DA_LUZ_RASANTE).toBe(0.25);
  }, 60_000);
});

/* ---------- as duas vistas pela bancada, com a captura desenhada por código ---------- */

/* Um PNG de auditoria: o fundo da bancada e um retângulo da peça de `largura` por `altura` (em fração do quadro), com a fração `acesa`
   das linhas dele em cinza e o resto em preto, como a luz rasante que não alcança parte da peça. */
function pngDeAuditoria({ lado = 100, largura = 0.8, altura = 0.6, acesa = 1, cor = [128, 128, 128] } = {}) {
  const png = new PNG({ width: lado, height: lado });
  const [w, h] = [Math.round(largura * lado), Math.round(altura * lado)];
  const [x0, y0] = [Math.floor((lado - w) / 2), Math.floor((lado - h) / 2)];
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const i = 4 * (y * lado + x);
      const dentro = x >= x0 && x < x0 + w && y >= y0 && y < y0 + h;
      const c = !dentro ? FUNDO : (y - y0) < acesa * h ? cor : [0, 0, 0];
      png.data[i] = c[0]; png.data[i + 1] = c[1]; png.data[i + 2] = c[2]; png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

/* A captura da bancada trocada por uma que grava PNG por código: a vista `direita` sai de quina (3 % da largura), a `frente` com `acesa`
   da peça na luz de `azimute`, e a caixa da visão diz a luz e a escala como a página diz. */
function capturaDesenhada(pasta, { acesa = () => 1, quinas = ['direita'] } = {}) {
  const chamadas = [];
  const capturar = async (quem, opcoes) => {
    chamadas.push({ quem, ...opcoes });
    const vistas = String(opcoes.vistas).split(',');
    const azimute = opcoes.azimute ?? 30;
    const arquivos = vistas.map((v) => {
      const arquivo = join(pasta, `cap-${chamadas.length}-${v}-${opcoes.visao}.png`);
      writeFileSync(arquivo, pngDeAuditoria(quinas.includes(v) ? { largura: 0.03, altura: 0.92 } : { acesa: opcoes.visao === 'luz-rasante' ? acesa(v, azimute) : 1, cor: opcoes.visao === 'curvatura' ? [245, 200, 200] : [128, 128, 128] }));
      return arquivo;
    });
    const enquadramento = (v) => (quinas.includes(v) ? { largura: 0.03, altura: 0.92, area: 0.03 * 0.92 } : { largura: 0.8, altura: 0.6, area: 0.48 });
    const visao = opcoes.visao === 'curvatura'
      ? { id: 'curvatura', dados: { escala: '0.24758' }, titulo: 'Curvatura média da lataria', linhas: ['vermelho: abaulado, azul: afundado, saturam em ±0,248 1/m', 'ocre: até 12 mm dos vincos que a forma desenha (cintura, ombro), fora da escala; ali a cor não mede defeito'] }
      : { id: 'luz-rasante', dados: { azimute: String(azimute), elevacao: '50', segundoAzimute: '120' }, titulo: 'Luz rasante', linhas: [] };
    return { ok: true, resultado: { arquivos, vistas: vistas.map((v) => ({ nome: v, enquadramento: enquadramento(v) })), visao } };
  };
  return { capturar, chamadas };
}

describe('as duas vistas pela bancada', () => {
  const LATARIA = { lataria: true, luzRasante: true, porque: 'subdivisão', partes: ['chapa'] };

  it('a fração iluminada sai do PNG pela regra do Blender: a peça é o que não é o fundo, e acesa a que passa de 8/255', () => {
    expect(fracaoIluminadaDoPng(pngDeAuditoria({ acesa: 1 }))).toBe(1);
    expect(fracaoIluminadaDoPng(pngDeAuditoria({ acesa: 0.2 }))).toBeCloseTo(0.2, 2);
    /* o pixel de luminância 8/255 não conta como aceso, e o de 9/255 conta */
    expect(fracaoIluminadaDoPng(pngDeAuditoria({ acesa: 1, cor: [8, 8, 8] }))).toBe(0);
    expect(fracaoIluminadaDoPng(pngDeAuditoria({ acesa: 1, cor: [9, 9, 9] }))).toBe(1);
    expect(fracaoIluminadaDoPng(pngDeAuditoria({ largura: 0, altura: 0 }))).toBeNull();
  });

  it('a curvatura sai numa captura das quatro vistas, a vista de quina sai das duas, e cada vista tem a luz da bancada e a outra a 90 graus', async () => {
    const base = mkdtempSync(join(area, 'bancada-'));
    const cap = capturaDesenhada(base);
    const feitas = await superficieDaBancada(PECA, { pasta: join(base, 'rodada'), lataria: LATARIA, capturar: cap.capturar });
    expect(cap.chamadas.map((c) => [c.visao, c.vistas, c.azimute ?? null, c.enquadrar, c.projecao])).toEqual([
      ['curvatura', 'frontal,direita,superior,tresquartos', null, true, 'ortografica'],
      ['luz-rasante', 'frontal', null, true, 'ortografica'], ['luz-rasante', 'frontal', 120, true, 'ortografica'],
      ['luz-rasante', 'superior', null, true, 'ortografica'], ['luz-rasante', 'superior', 120, true, 'ortografica'],
      ['luz-rasante', 'tresquartos', null, true, 'ortografica'], ['luz-rasante', 'tresquartos', 120, true, 'ortografica'],
    ]);
    expect(feitas.fonte).toBe('bancada');
    expect(feitas.fora).toEqual([{ vista: 'lado', largura: 0.03, altura: 0.92 }]);
    expect(feitas.rasante.map((i) => [basename(i.arquivo), i.vista, i.azimute, i.elevacao, i.iluminada])).toEqual([
      ['peca-frente-rasante-az30.png', 'frente', 30, 50, 1], ['peca-frente-rasante-az120.png', 'frente', 120, 50, 1],
      ['peca-topo-rasante-az30.png', 'topo', 30, 50, 1], ['peca-topo-rasante-az120.png', 'topo', 120, 50, 1],
      ['peca-tresquartos-rasante-az30.png', 'tresquartos', 30, 50, 1], ['peca-tresquartos-rasante-az120.png', 'tresquartos', 120, 50, 1],
    ]);
    expect(feitas.curvatura.map((i) => basename(i.arquivo))).toEqual(['peca-frente-curvatura-legenda.png', 'peca-topo-curvatura-legenda.png', 'peca-tresquartos-curvatura-legenda.png']);
    expect(feitas.escala).toBeCloseTo(0.24758, 5);
    expect(feitas.faixa).toMatchObject({ larguraMm: 12, vincos: ['cintura', 'ombro'] });
    /* o pacote.json da bancada passa no registro da rodada como o do Blender passava */
    const pasta = join(base, 'rodada');
    gravarManifesto(pasta, { peca: 'lataria-de-ensaio', receita: 'sha256:x', lataria: LATARIA, superficie: feitas });
    const manifesto = JSON.parse(readFileSync(join(pasta, MANIFESTO_DO_PACOTE), 'utf8'));
    expect(manifesto.superficie).toMatchObject({ fonte: 'bancada', fora: ['lado'] });
    expect(manifesto.superficie.luzRasante[0]).toMatchObject({ vista: 'frente', azimute: 30, iluminada: 1, elevacao: 50 });
    expect(superficieDoPacote('lataria-de-ensaio', { pasta, sha256: 'sha256:x' })).toEqual({ ok: true, imagens: [...feitas.rasante, ...feitas.curvatura].map((i) => basename(i.arquivo)) });
    /* o pedido diz a altura da luz de cada imagem e as vistas de quina */
    const secao = montarPedido({ peca: 'p', superficie: feitas });
    expect(secao).toContain('- frente, a luz correndo na direção de 30 graus da imagem (0 para a direita, 90 para cima), com a luz a 50 graus do plano da imagem: ');
    expect(secao).toContain('Ficaram de fora desta seção, porque a peça aparece de quina e ocupa menos de 20 % do quadro num dos lados: lado.');
    expect(secao).not.toContain('- lado:');
    expect(MINIMO_DE_QUINA).toBe(0.2);
  });

  it('a curvatura leva a escala escrita em cima, com a barra de azul a vermelho, e o resto da imagem é o da bancada', () => {
    const original = pngDeAuditoria({ cor: [245, 200, 200] });
    const lida = PNG.sync.read(legendaNaCurvatura(original, { titulo: 'Curvatura média da lataria', vista: 'frente', escala: 0.24758, linhas: ['vermelho: abaulado, azul: afundado, saturam em ±0,248 1/m'] }));
    const bancada = PNG.sync.read(original);
    const faixa = lida.height - bancada.height;
    expect(faixa).toBeGreaterThan(40);
    expect(lida.width).toBe(bancada.width);
    /* a imagem da bancada vem inteira embaixo da faixa */
    expect(Buffer.compare(lida.data.subarray(4 * faixa * lida.width), bancada.data)).toBe(0);
    /* a barra começa azul e termina vermelha, e a faixa tem texto escuro */
    const px = (x, y) => [...lida.data.subarray(4 * (y * lida.width + x), 4 * (y * lida.width + x) + 3)];
    const linhaDaBarra = [...Array(faixa).keys()].find((y) => { const [r, , b] = px(12, y); return b > 150 && r < 150; });
    expect(linhaDaBarra).toBeDefined();
    const fim = px(Math.min(lida.width - 13, 12 + 359), linhaDaBarra);
    expect(fim[0]).toBeGreaterThan(fim[2]);
    expect(textoParaAFonte('saturam em ±0,248 1/m; cinza')).toBe('SATURAM EM +-0,248 1/M, CINZA');
  });

  it('a luz que não alcança a peça é medida em cada imagem, e o pacote recusa sem nenhuma acima de 25 %, dizendo a vista, o azimute e a fração', async () => {
    const base = mkdtempSync(join(area, 'bancada-escura-'));
    const cap = capturaDesenhada(base, { acesa: () => 0.1, quinas: ['direita', 'superior'] });
    const feitas = await superficieDaBancada(PECA, { pasta: join(base, 'rodada'), lataria: LATARIA, capturar: cap.capturar });
    expect(feitas.rasante.map((i) => i.iluminada)).toEqual([0.1, 0.1, 0.1, 0.1]);
    expect(() => exigirLuzNaSuperficie(PECA, feitas)).toThrow(/peca-frente-rasante-az30\.png \(vista frente, luz a 30 graus\) tem 10,0 % da peça iluminada, abaixo do limiar de 25,0 %/);
  });

  it('a peça de emenda sombreada leva só a luz rasante: a primeira luz de cada vista mede a quina, e não há curvatura', async () => {
    const base = mkdtempSync(join(area, 'bancada-emenda-'));
    const cap = capturaDesenhada(base);
    const feitas = await superficieDaBancada(PECA, { pasta: join(base, 'rodada'), lataria: { lataria: false, luzRasante: true, porque: 'emenda' }, capturar: cap.capturar });
    expect(cap.chamadas.map((c) => [c.visao, c.vistas, c.azimute ?? null])).toEqual([
      ['luz-rasante', 'frontal', null], ['luz-rasante', 'direita', null], ['luz-rasante', 'superior', null], ['luz-rasante', 'tresquartos', null],
      ['luz-rasante', 'frontal', 120], ['luz-rasante', 'superior', 120], ['luz-rasante', 'tresquartos', 120],
    ]);
    expect(feitas.curvatura).toEqual([]);
    expect(feitas.fora.map((f) => f.vista)).toEqual(['lado']);
    expect(feitas.rasante).toHaveLength(6);
  });

  it('se todas as vistas estão de quina, fica a de maior área', async () => {
    const base = mkdtempSync(join(area, 'bancada-quinas-'));
    const cap = capturaDesenhada(base, { quinas: ['frontal', 'direita', 'superior', 'tresquartos'] });
    const feitas = await superficieDaBancada(PECA, { pasta: join(base, 'rodada'), lataria: LATARIA, capturar: cap.capturar, vistas: ['frente', 'lado'] });
    expect(feitas.rasante.map((i) => i.vista)).toEqual(['frente', 'frente']);
    expect(feitas.fora.map((f) => f.vista)).toEqual(['lado']);
  });
});


describe('a rodada de forma da peça de lataria', () => {
  const NOME = 'lataria-de-ensaio';
  let pastas;
  beforeEach(() => {
    const base = mkdtempSync(join(area, 'rodadas-'));
    pastas = { rodadas: join(base, 'rodadas'), pacote: join(base, 'pacote') };
    mkdirSync(pastas.pacote, { recursive: true });
  });
  const medir = () => medirReceita(PECA);
  const veredito = { alvo: 'referencias/alvo.md', nota: 9, defeitos: [], observacao: 'a chapa e a nervura leem como prometido' };
  const entrada = (extra = {}) => ({ partes: [{ nome: 'chapa', confere: true }, { nome: 'nervura', confere: true }], notaDePassagem: 'a chapa segue a gaiola medida', ...extra });
  const pacoteCom = (sha256, { superficie = true, iluminada = 0.6 } = {}) => {
    const imagens = ['peca-lado-rasante-az30.png', 'peca-lado-curvatura-legenda.png'].map((nome) => { const a = join(pastas.pacote, nome); writeFileSync(a, nome); return a; });
    gravarManifesto(pastas.pacote, {
      peca: NOME, receita: sha256, lataria: { lataria: true, porque: 'subdivisão' },
      superficie: superficie ? { partes: ['chapa'], rasante: [{ arquivo: imagens[0], vista: 'lado', azimute: 30, iluminada }], curvatura: [{ arquivo: imagens[1] }] } : null,
    });
  };

  it('a medição diz que a peça de prova é de lataria, e a que não tem subdivisão não é', async () => {
    expect((await medir()).lataria).toEqual({ lataria: true, porque: 'a receita tem superfície livre por subdivisão (PASSOS[0])' });
    expect((await medirReceita(NAO_LATARIA)).lataria.lataria).toBe(false);
  });

  it('recusa o veredito sem o pacote das duas vistas, com o comando, e não grava rodada', async () => {
    const recusa = registrarMedida(NOME, entrada({ veredito }), { medir, pasta: pastas.rodadas, pacote: pastas.pacote });
    await expect(recusa).rejects.toThrow(`o veredito do crítico não se registra: '${NOME}' é peça de lataria (a receita tem superfície livre por subdivisão (PASSOS[0])), `
      + `e a pasta da rodada ${pastas.pacote} não tem o pacote.json que o vistas:critica grava com o pacote.`);
    await expect(registrarMedida(NOME, entrada({ veredito }), { medir, pasta: pastas.rodadas, pacote: pastas.pacote }))
      .rejects.toThrow(`gere-o com \`npm run vistas:critica -- ${NOME}\``);
    expect(lerRodadas(NOME, { pasta: pastas.rodadas })).toEqual([]);
  });

  it('recusa o pacote sem as vistas e o de outra versão da receita, e não aceita superficie declarada à mão', async () => {
    const { sha256 } = await medir();
    pacoteCom(sha256, { superficie: false });
    await expect(registrarMedida(NOME, entrada({ veredito }), { medir, pasta: pastas.rodadas, pacote: pastas.pacote }))
      .rejects.toThrow(/não trouxe a luz rasante e a curvatura da lataria/);
    pacoteCom(`sha256:${'0'.repeat(64)}`);
    await expect(registrarMedida(NOME, entrada({ veredito, superficie: { lataria: 'à mão', imagens: ['x.png'] } }), { medir, pasta: pastas.rodadas, pacote: pastas.pacote }))
      .rejects.toThrow(/mostra outra versão da receita \(00000000\) que a medida agora/);
    expect(lerRodadas(NOME, { pasta: pastas.rodadas })).toEqual([]);
  });

  it('recusa o pacote cuja luz rasante saiu quase toda escura, e o de antes da medida, que não traz a fração', async () => {
    const { sha256 } = await medir();
    pacoteCom(sha256, { iluminada: 0.005 });
    await expect(registrarMedida(NOME, entrada({ veredito }), { medir, pasta: pastas.rodadas, pacote: pastas.pacote }))
      .rejects.toThrow(`tem luz rasante quase toda escura: peca-lado-rasante-az30.png (vista lado, luz a 30 graus) tem 0,5 % da peça iluminada, abaixo do limiar de 25,0 %`);
    /* o manifesto gravado antes da medida não traz a fração */
    const arquivo = join(pastas.pacote, MANIFESTO_DO_PACOTE);
    const antigo = JSON.parse(readFileSync(arquivo, 'utf8'));
    delete antigo.superficie.luzRasante;
    writeFileSync(arquivo, JSON.stringify(antigo));
    expect(superficieDoPacote(NOME, { pasta: pastas.pacote, sha256 })).toEqual({
      ok: false, motivo: `o pacote de ${pastas.pacote} tem luz rasante quase toda escura: peca-lado-rasante-az30.png não traz a fração iluminada medida, e o limiar é de 25,0 %`,
    });
    expect(lerRodadas(NOME, { pasta: pastas.rodadas })).toEqual([]);
  });

  it('com o pacote da versão medida, grava as imagens na rodada e a peça fecha; sem veredito, a rodada não pede o pacote', async () => {
    const { rodada: semVeredito } = await registrarMedida(NOME, entrada(), { medir, pasta: pastas.rodadas, pacote: pastas.pacote });
    expect(semVeredito).not.toHaveProperty('superficie');
    const { sha256 } = await medir();
    pacoteCom(sha256);
    const { rodada } = await registrarMedida(NOME, entrada({ veredito }), { medir, pasta: pastas.rodadas, pacote: pastas.pacote });
    expect(rodada.superficie).toEqual({ lataria: 'a receita tem superfície livre por subdivisão (PASSOS[0])', imagens: ['peca-lado-rasante-az30.png', 'peca-lado-curvatura-legenda.png'] });
    const acao = await acaoDaPeca(NOME, { rodadas: lerRodadas(NOME, { pasta: pastas.rodadas }), limite: 6, medir, pasta: pastas.rodadas });
    expect(acao.acao).toBe('parar-fechou');
  });

  it('a rodada fechada sem as vistas, de antes da obrigação, não dá a peça de lataria por fechada', async () => {
    const { texto } = await medir();
    gravarRodada(NOME, { ...entrada({ veredito }), medidas: { passou: true, relatorio: 'ok' } }, { pasta: pastas.rodadas, receitaTexto: texto });
    const acao = await acaoDaPeca(NOME, { rodadas: lerRodadas(NOME, { pasta: pastas.rodadas }), limite: 6, medir, pasta: pastas.rodadas });
    expect(acao.acao).toBe('revisar');
    expect(acao.motivo).toContain('a rodada 1 fechou sem a luz rasante e a curvatura da lataria no pacote do crítico');
    expect(acao.motivo).toContain(`\`npm run vistas:critica -- ${NOME}\``);
  });
});

/* ---------- a faixa dos vincos, sem o Blender ---------- */

/* A malha da peça em triângulos, com os vincos declarados, para a conta de `superficie.py` no python3 do sistema. */
function malhaDaPeca(receita) {
  const executada = executarReceita(receita);
  const ids = [...executada.neutro.V.keys()];
  const indice = new Map(ids.map((id, k) => [id, k]));
  const F = [];
  for (const face of executada.neutro.F.values()) {
    const v = face.vs.map((id) => indice.get(id));
    for (let k = 1; k + 1 < v.length; k++) F.push([v[0], v[k], v[k + 1]]);
  }
  return { V: ids.map((id) => executada.neutro.V.get(id)), F, vincos: vincosDaMalha(receita, executada) };
}

/* O executável do Blender trocado por um que grava o que os dois scripts gravariam, e guarda os argumentos de cada chamada. */
function blenderFalso() {
  const chamadas = [];
  const executar = (_blender, argv) => {
    /* o script vem depois de `--python` e os argumentos dele depois de `--`, onde quer que as opções do Blender os ponham */
    const script = argv[argv.indexOf('--python') + 1].split(/[\\/]/).pop();
    const args = argv.slice(argv.indexOf('--') + 1);
    expect(argv.slice(0, argv.indexOf('--'))).toContain('--python-exit-code');
    const opcao = (nome) => { const i = args.indexOf(nome); return i < 0 ? null : args[i + 1]; };
    chamadas.push({ script, args });
    const prefixo = opcao('--saida');
    const gravar = (nome) => { writeFileSync(`${prefixo}${nome}`, nome); return `${prefixo}${nome}`; };
    if (script === 'luz-rasante.py') {
      writeFileSync(`${prefixo}rasante.json`, JSON.stringify({ imagens: [{ vista: 'topo', azimute: 30, arquivos: { malha: gravar('topo-rasante-az30.png') }, iluminacao: { pixels_da_peca: 1000, pixels_iluminados: 420, fracao: 0.42 } }] }));
    } else {
      const vincos = opcao('--vincos') ? JSON.parse(readFileSync(opcao('--vincos'), 'utf8')).vincos : null;
      writeFileSync(`${prefixo}curvatura.json`, JSON.stringify({
        escala_1_m: 0.45, imagens: [{ vista: 'topo', legenda: gravar('topo-curvatura-legenda.png') }],
        faixa_dos_vincos: vincos ? { largura_mm: Number(opcao('--faixa-mm') ?? 40), vincos: vincos.map((v) => v.nome), vertices: 1, escala_com_a_faixa_1_m: 8.5 } : null,
      }));
    }
    return { status: 0, stdout: '', stderr: '' };
  };
  return { executar, chamadas };
}

describe('a faixa dos vincos na curvatura da lataria, sem o Blender', () => {
  it('os vincos declarados saem da receita onde a malha os pôs, com o nome, e a peça sem vinco não tem nenhum', () => {
    const vincos = vincosDaMalha(provaDoVinco);
    expect(vincos.map(({ passo, nome, viva }) => ({ passo, nome, viva }))).toEqual([{ passo: 0, nome: 'quina', viva: true }]);
    /* oito faces da gaiola ao longo do vinco, em quatro níveis: 8 × 16 arestas, todas sobre a linha z = 200 mm, y = 0, de x = 0 a 800 mm */
    const { segmentos } = vincos[0];
    expect(segmentos).toHaveLength((VINCO.NX - 1) * 16);
    const pontosDoVinco = segmentos.flat();
    for (const [, y, z] of pontosDoVinco) {
      expect(Math.abs(y)).toBeLessThan(1e-12);
      expect(Math.abs(z - VINCO.PASSO * VINCO.J_DO_VINCO)).toBeLessThan(1e-12);
    }
    const comprimento = segmentos.reduce((s, [p, q]) => s + Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]), 0);
    expect(comprimento).toBeCloseTo(VINCO.PASSO * (VINCO.NX - 1), 9);
    expect(vincosDaMalha(provaDeLataria)).toEqual([]);
  });

  it('as vistas obrigatórias passam os vincos à curvatura por padrão, e sem a opção a escala volta a ser a da lataria inteira', async () => {
    const base = mkdtempSync(join(area, 'faixa-falsa-'));
    const ligada = blenderFalso();
    const feitas = await vistasDeSuperficie(COM_VINCO, { pasta: join(base, 'ligada'), blender: '/blender/de/ensaio', executar: ligada.executar });
    const curvatura = ligada.chamadas.find((c) => c.script === 'curvatura-da-lataria.py').args;
    const arquivo = curvatura[curvatura.indexOf('--vincos') + 1];
    expect(JSON.parse(readFileSync(arquivo, 'utf8')).vincos.map((v) => v.nome)).toEqual(['quina']);
    expect(curvatura).not.toContain('--faixa-mm');
    expect(feitas.faixa).toEqual({ larguraMm: 40, vincos: ['quina'], escala: 0.45, escalaComAFaixa: 8.5 });
    /* a fração iluminada que o script mediu chega a cada imagem da luz rasante */
    expect(feitas.rasante).toEqual([{ arquivo: expect.stringMatching(/topo-rasante-az30\.png$/), vista: 'topo', azimute: 30, iluminada: 0.42 }]);
    /* a luz rasante não muda com a faixa */
    expect(ligada.chamadas.find((c) => c.script === 'luz-rasante.py').args).not.toContain('--vincos');

    const larga = blenderFalso();
    expect((await vistasDeSuperficie(COM_VINCO, { pasta: join(base, 'larga'), blender: '/b', faixaMm: 60, executar: larga.executar })).faixa.larguraMm).toBe(60);
    expect(larga.chamadas[1].args.slice(-2)).toEqual(['--faixa-mm', '60']);

    const desligada = blenderFalso();
    const sem = await vistasDeSuperficie(COM_VINCO, { pasta: join(base, 'desligada'), blender: '/b', faixaDosVincos: false, executar: desligada.executar });
    expect(desligada.chamadas[1].args).not.toContain('--vincos');
    expect(sem.faixa).toBeNull();
    /* a peça sem vinco declarado não leva --vincos nem com a opção ligada */
    const semVinco = blenderFalso();
    expect((await vistasDeSuperficie(PECA, { pasta: join(base, 'sem-vinco'), blender: '/b', executar: semVinco.executar })).faixa).toBeNull();
    expect(semVinco.chamadas[1].args).not.toContain('--vincos');
  }, 60_000);

  it('na malha da peça, o amassado sai com cor de defeito com a faixa fora da escala, e quase branco com ela dentro', () => {
    const arquivo = join(mkdtempSync(join(area, 'faixa-py-')), 'malha.json');
    writeFileSync(arquivo, JSON.stringify(malhaDaPeca(provaDoVinco)));
    const codigo = `
import json, sys
sys.path.insert(0, ${JSON.stringify(join(REPO, 'tools/blender'))})
import numpy as np, superficie as S
d = json.load(open(${JSON.stringify(arquivo)}))
V, F = np.array(d['V']), np.array(d['F'])
seg = np.array([s for v in d['vincos'] for s in v['segmentos']], float).reshape(-1, 2, 3)
H, ok = S.curvatura_media(V, F, 0.02)
faixa = S.faixa_dos_vincos(V, seg, 0.04)
fora, dentro = S.escala_da_curvatura(H, 99, 0.1, fora=faixa), S.escala_da_curvatura(H, 99, 0.1)
c = int(np.argmin(((V[:, [0, 2]] - [${VINCO.PASSO * VINCO.AMASSADO.i}, ${VINCO.PASSO * VINCO.AMASSADO.j}]) ** 2).sum(1)))
croma = lambda e: float(np.ptp(S.cor_divergente(H[c:c + 1], e)[0]) * 255)
print(json.dumps({'H': float(H[c]), 'fora': fora, 'dentro': dentro, 'croma_fora': croma(fora), 'croma_dentro': croma(dentro),
  'na_faixa': int(faixa.sum()), 'maior_na_faixa': float(np.nanmax(np.abs(H[faixa]))), 'maior_fora_dela': float(np.nanmax(np.abs(H[~faixa]))),
  'faixa_longe': float(np.abs(V[faixa, 2] - ${VINCO.PASSO * VINCO.J_DO_VINCO}).max())}))`;
    const r = spawnSync('python3', ['-I', '-c', codigo], { encoding: 'utf8', maxBuffer: 64 << 20 });
    expect(r.status, r.stderr).toBe(0);
    const m = JSON.parse(r.stdout);
    /* o amassado afunda: cerca de -0,67 1/m no centro, e a dobra do vinco chega a 8,7 1/m depois da média */
    expect(m.H).toBeLessThan(-0.5);
    expect(m.H).toBeGreaterThan(-1);
    expect(m.maior_na_faixa).toBeGreaterThan(8);
    expect(m.maior_fora_dela).toBeLessThan(1);
    /* a faixa é a lataria a até 40 mm do vinco, e só ela */
    expect(m.na_faixa).toBeGreaterThan(1000);
    expect(m.faixa_longe).toBeLessThan(0.04);
    /* com a faixa dentro, o vinco leva a escala a 8,5 1/m e o amassado sai quase branco; fora, a escala é a do amassado e ele satura */
    expect(m.dentro).toBeGreaterThan(8);
    expect(m.fora).toBeLessThan(1);
    expect(m.croma_dentro).toBeLessThan(20);
    expect(m.croma_fora).toBeGreaterThan(150);
  }, 120_000);

  it('o pedido do crítico diz que a faixa em ocre fica fora da escala e não é defeito, e sem faixa não diz', () => {
    const superficie = {
      rasante: [{ arquivo: '/x/peca-topo-rasante-az30.png', vista: 'topo', azimute: 30 }],
      curvatura: [{ arquivo: '/x/peca-topo-curvatura-legenda.png', vista: 'topo' }],
    };
    const com = montarPedido({ peca: 'p', superficie: { ...superficie, faixa: { larguraMm: 40, vincos: ['linhaDeCintura', 'ombro'] } } });
    expect(com).toContain('Em ocre, a faixa de 40 mm de cada lado dos vincos que a forma desenha (linhaDeCintura, ombro): é a dobra pedida, '
      + 'fica fora da escala e não é defeito; a escala é a do resto da chapa.');
    expect(montarPedido({ peca: 'p', superficie })).not.toContain('ocre');
  });
});

/* ---------- a dispensa de PLANO.lataria ---------- */

describe('a quina por colunas de apoio na faixa dos vincos', () => {
  it('o vinco de nitidez 0 entra só com comQuinasPorApoio, e sem a opção a lista é a de sempre', async () => {
    const { executarReceita } = await import('../../src/autoria/executar-receita.js');
    const { receitaDaDobra } = await import('./fixtures/dobra-por-apoio.mjs');
    const { vincosDaMalha } = await import('../../src/autoria/vincos-da-malha.js');
    const executada = executarReceita(receitaDaDobra({ angulo: 90, apoio: 6, vizinho: 40 }));
    expect(vincosDaMalha(null, executada)).toEqual([]);
    const quinas = vincosDaMalha(null, executada, { comQuinasPorApoio: true });
    expect(quinas.map((v) => [v.nome, v.viva])).toEqual([['quina', false]]);
    /* a faixa entre as duas colunas de apoio, nas 8 estações da chapa, a 6 mm da quina de cada lado e em todos os níveis do refino */
    expect(quinas[0].segmentos.length).toBeGreaterThan(30);
    for (const [p, q] of quinas[0].segmentos) for (const v of [p, q]) expect(Math.hypot(v[0], v[1]) * 1000).toBeLessThan(7);
  });
});

describe('a dispensa de PLANO.lataria', () => {
  const MOTIVO = 'é um estofado de espuma, e não chapa de lataria';
  const dispensada = { ...provaDeLataria, PLANO: { ...provaDeLataria.PLANO, lataria: { dispensa: MOTIVO } } };
  const AVISO = `PLANO.lataria dispensa a luz rasante e a curvatura da lataria no pacote do crítico: ${MOTIVO}.`;

  it('aparece como aviso, com o motivo, no descrever, que não reprova por ela', async () => {
    const r = await descreverPecaReutilizavel({ peca: 'lataria-dispensada', modulo: dispensada });
    const antes = await descreverPecaReutilizavel({ peca: 'lataria-de-prova', modulo: provaDeLataria });
    expect(r.stderr).toContain(`AVISO: ${AVISO}`);
    expect(r.stdout).toContain(`LATARIA DISPENSADA\n  ${AVISO}`);
    expect(r.resultado.avisoDaLataria).toContain(MOTIVO);
    expect(r.codigo).toBe(antes.codigo);
    expect(antes.stderr).not.toContain('PLANO.lataria dispensa');
    expect(antes.resultado.avisoDaLataria).toBeNull();
  }, 60_000);

  it('aparece como aviso, com o motivo, no resumo do laço de modelagem', async () => {
    /* dentro do repositório (em tmp/, fora do commit), porque o confinamento de caminhos recusa receita fora da árvore */
    mkdirSync(join(REPO, 'tmp'), { recursive: true });
    const pasta = mkdtempSync(join(REPO, 'tmp', 'teste-lataria-dispensada-'));
    onTestFinished(() => rmSync(pasta, { recursive: true, force: true }));
    cpSync(join(REPO, 'tools/fixtures/lataria-de-prova/referencias'), join(pasta, 'referencias'), { recursive: true });
    const receita = join(pasta, 'receita.js');
    writeFileSync(receita, `import base from ${JSON.stringify(pathToFileURL(join(REPO, PECA)).href)};\n`
      + `export default { ...base, PLANO: { ...base.PLANO, lataria: { dispensa: ${JSON.stringify(MOTIVO)} } } };\n`);
    const medicao = await medirReceita(receita);
    expect(medicao.lataria).toEqual({ lataria: false, porque: `PLANO.lataria dispensa: ${MOTIVO}` });
    expect(medicao.avisos).toEqual([expect.stringContaining(AVISO)]);
    const decisao = await acaoDaPeca('lataria-dispensada', { rodadas: [], limite: 6, medir: async () => medicao });
    const resumo = resumoDoLaco('lataria-dispensada', { rodadas: [], decisao });
    expect(resumo).toMatch(new RegExp(`medição da receita atual \\(sha256:[0-9a-f]{8}\\): (passou|reprovou)\\naviso: ${AVISO.replace(/[.()]/g, '\\$&')}`));
    /* a peça sem dispensa não tem aviso no resumo */
    const semDispensa = await medirReceita(PECA);
    expect(semDispensa.avisos).toEqual([]);
    expect(resumoDoLaco('lataria-de-prova', { rodadas: [], decisao: { acao: 'modelar', motivo: 'm', medicao: semDispensa } })).not.toContain('aviso:');
  }, 120_000);
});

/* ---------- com o Blender ---------- */

function pixel(cam, p) {
  const d = p.map((v, k) => v - cam.centro[k]);
  const dot = (a) => a[0] * d[0] + a[1] * d[1] + a[2] * d[2];
  return [Math.round(cam.W / 2 + (dot(cam.x_cam) / cam.escala) * cam.W), Math.round(cam.H / 2 - (dot(cam.y_cam) / cam.escala) * cam.W)];
}
const croma = (png, [x, y]) => {
  const i = (y * png.width + x) * 4;
  return Math.max(png.data[i], png.data[i + 1], png.data[i + 2]) - Math.min(png.data[i], png.data[i + 1], png.data[i + 2]);
};

/* A fração da peça iluminada em cada imagem da luz rasante, medida aqui por uma conta independente da do script: a peça é o que a
   curvatura da mesma vista (mesma câmera, fundo preto) pinta, e iluminado é o pixel da luz rasante acima de 8/255. */
function fracaoIluminadaIndependente(pasta, { vista, arquivo }) {
  const lum = (png, k) => (0.2126 * png.data[k] + 0.7152 * png.data[k + 1] + 0.0722 * png.data[k + 2]) / 255;
  const mascara = PNG.sync.read(readFileSync(join(pasta, 'superficie', `peca-${vista}-curvatura.png`)));
  const luz = PNG.sync.read(readFileSync(arquivo));
  let peca = 0;
  let acesos = 0;
  for (let k = 0; k < luz.data.length; k += 4) {
    if (lum(mascara, k) <= 10 / 255) continue;
    peca++;
    if (lum(luz, k) > 8 / 255) acesos++;
  }
  return acesos / peca;
}

/* Cada imagem da luz rasante fica acima do limiar, pelo script e pela conta daqui, que concordam, e os dois azimutes de cada vista
   ficam a 90 graus um do outro. */
function conferirLuz(pasta, feitas) {
  expect(feitas.rasante.map((i) => i.vista)).toEqual(['frente', 'frente', 'lado', 'lado', 'topo', 'topo', 'tresquartos', 'tresquartos']);
  for (let k = 0; k < feitas.rasante.length; k += 2) expect((feitas.rasante[k + 1].azimute - feitas.rasante[k].azimute + 360) % 360).toBe(90);
  const medidas = feitas.rasante.map((i) => ({ imagem: `${i.vista}-az${i.azimute}`, script: i.iluminada, aqui: fracaoIluminadaIndependente(pasta, i) }));
  if (doAmbiente('BLENDER_GUARDAR')) console.log(JSON.stringify(medidas));
  for (const m of medidas) {
    expect(m.script, m.imagem).toBeGreaterThanOrEqual(LIMIAR_DA_LUZ_RASANTE);
    expect(Math.abs(m.script - m.aqui), m.imagem).toBeLessThan(0.02);
  }
}

describe.skipIf(!BLENDER)('as duas vistas da peça de prova, no Blender', () => {
  it('saem a luz rasante nas quatro vistas e dois azimutes e a curvatura nas quatro, com a nervura em cinza e a chapa em cor', { timeout: 600_000 }, async () => {
    const pasta = mkdtempSync(join(area, 'blender-'));
    const feitas = await vistasDeSuperficie(PECA, { pasta, blender: BLENDER });
    expect(feitas.partes).toEqual(['chapa']);
    conferirLuz(pasta, feitas);
    expect(feitas.curvatura.map((i) => i.vista)).toEqual(['frente', 'lado', 'topo', 'tresquartos']);
    for (const { arquivo } of [...feitas.rasante, ...feitas.curvatura]) expect(existsSync(arquivo)).toBe(true);
    /* na curvatura de cima, o meio da nervura é cinza (peça de borda) e a chapa ao lado dela tem cor */
    const cam = JSON.parse(readFileSync(join(pasta, 'superficie', 'peca-curvatura.json'), 'utf8')).camera.topo;
    const png = PNG.sync.read(readFileSync(join(pasta, 'superficie', 'peca-topo-curvatura.png')));
    const [, , z] = pontos()[linhaDaNervura()[3]];
    expect(croma(png, pixel(cam, [0.4, altura(0.4, z) + 0.004, z]))).toBeLessThanOrEqual(1);
    expect(croma(png, pixel(cam, [0.15, altura(0.15, 0.15), 0.15]))).toBeGreaterThan(10);
  });
});

describe.skipIf(!BLENDER)('a luz rasante da carenagem de prova, no Blender', () => {
  it('cai no lado que a câmera vê em todas as vistas: a três quartos não sai mais preta com a luz de 30 graus', { timeout: 600_000 }, async () => {
    /* com 30 e 120 graus em toda vista, a de três quartos a 30 graus saía com 0,5 % da peça iluminada */
    const pasta = mkdtempSync(join(area, 'blender-carenagem-'));
    const feitas = await vistasDeSuperficie('carenagem-de-prova', { pasta, blender: BLENDER });
    conferirLuz(pasta, feitas);
    expect(feitas.rasante.filter((i) => i.vista === 'tresquartos').map((i) => i.azimute)).not.toContain(30);
  });
});

describe.skipIf(!BLENDER)('a faixa dos vincos na curvatura, no Blender', () => {
  it('na chapa dobrada, o amassado sai azul com a faixa fora da escala e quase branco sem ela, e a faixa sai em ocre com a legenda', { timeout: 600_000 }, async () => {
    const pasta = mkdtempSync(join(area, 'blender-vinco-'));
    const feitas = await vistasDeSuperficie(COM_VINCO, { pasta, blender: BLENDER });
    expect(feitas.faixa).toMatchObject({ larguraMm: 40, vincos: ['quina'] });
    expect(feitas.faixa.escala).toBeLessThan(1);
    expect(feitas.faixa.escalaComAFaixa).toBeGreaterThan(8);
    /* a mesma malha, sem --vincos: a escala da lataria inteira */
    const sem = join(pasta, 'sem-faixa-');
    const r = spawnSync(BLENDER, ['-b', '--factory-startup', '--python', join(REPO, 'tools/blender/curvatura-da-lataria.py'), '--',
      '--malha', feitas.obj, '--saida', sem, '--vista', 'topo', '--lataria', 'chapa'], { encoding: 'utf8', maxBuffer: 256 << 20 });
    expect(r.status, r.stderr.slice(-2000)).toBe(0);
    const resumoSem = JSON.parse(readFileSync(`${sem}curvatura.json`, 'utf8'));
    expect(resumoSem.faixa_dos_vincos).toBeNull();
    expect(resumoSem.escala_1_m).toBeCloseTo(feitas.faixa.escalaComAFaixa, 3);

    const cam = JSON.parse(readFileSync(join(pasta, 'superficie', 'peca-curvatura.json'), 'utf8')).camera.topo;
    const com = PNG.sync.read(readFileSync(join(pasta, 'superficie', 'peca-topo-curvatura.png')));
    const semPng = PNG.sync.read(readFileSync(`${sem}topo-curvatura.png`));
    const amassado = pixel(cam, [VINCO.PASSO * VINCO.AMASSADO.i, VINCO.altura(VINCO.PASSO * VINCO.AMASSADO.j), VINCO.PASSO * VINCO.AMASSADO.j]);
    expect(croma(com, amassado)).toBeGreaterThan(100);
    expect(croma(semPng, amassado)).toBeLessThan(20);
    /* sobre o vinco: ocre com a faixa (vermelho e verde acima do azul, sem saturar), vermelho sem ela */
    const noVinco = pixel(cam, [0.4, 0, VINCO.PASSO * VINCO.J_DO_VINCO]);
    const rgb = (png, [x, y]) => { const i = (y * png.width + x) * 4; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
    const [vr, vg, vb] = rgb(com, noVinco);
    expect(vr - vb).toBeGreaterThan(50);
    expect(vg - vb).toBeGreaterThan(40);
    const [sr, sg] = rgb(semPng, noVinco);
    expect(sr - sg).toBeGreaterThan(80);
    expect(feitas.curvatura.every((i) => existsSync(i.arquivo))).toBe(true);
  });
});

/* ---------- a luz rasante da peça de emenda sombreada ---------- */

describe('a luz rasante da peça com sombreamento suave sobre a emenda de uma fusão', () => {
  const NOME = 'emenda-de-ensaio';
  const EMENDA = { lataria: false, luzRasante: true, porque: 'sombreamento suave (liso em PASSOS[1]) sobre a emenda de uma fusão', partes: null };
  let pastas;
  beforeEach(() => {
    const base = mkdtempSync(join(area, 'emenda-'));
    pastas = { rodadas: join(base, 'rodadas'), pacote: join(base, 'pacote'), base };
    mkdirSync(pastas.pacote, { recursive: true });
  });
  const medir = async () => ({ ...(await medirReceita(NAO_LATARIA)), lataria: { lataria: false, porque: EMENDA.porque }, luzRasante: { luzRasante: true, porque: EMENDA.porque } });
  const veredito = { alvo: 'referencias/alvo.md', nota: 9, defeitos: [], observacao: 'a emenda lê limpa nas vistas de luz rasante' };
  const entrada = (extra = {}) => ({ partes: [{ nome: 'corpo', confere: true }], notaDePassagem: 'a emenda segue a fusão medida', ...extra });
  const pacoteDaEmenda = (sha256, { rasante = true } = {}) => {
    const imagem = join(pastas.pacote, 'peca-lado-rasante-az30.png');
    writeFileSync(imagem, 'png');
    gravarManifesto(pastas.pacote, {
      peca: NOME, receita: sha256, lataria: EMENDA,
      superficie: rasante ? { partes: [], rasante: [{ arquivo: imagem, vista: 'lado', azimute: 30, iluminada: 0.6 }], curvatura: [] } : null,
    });
  };

  it('a vista sai sem a curvatura da lataria: o Blender roda só a luz rasante, e o pacote traz só as imagens dela', async () => {
    const falso = blenderFalso();
    const feitas = await vistasDeSuperficie(NAO_LATARIA, { pasta: join(pastas.base, 'vista'), blender: '/b', lataria: EMENDA, executar: falso.executar });
    expect(falso.chamadas.map((c) => c.script)).toEqual(['luz-rasante.py']);
    expect(feitas.curvatura).toEqual([]);
    expect(feitas.rasante).toHaveLength(1);
    /* a peça sem a decisão, chamada para olhar, segue gerando as duas */
    const as_duas = blenderFalso();
    await vistasDeSuperficie(NAO_LATARIA, { pasta: join(pastas.base, 'duas'), blender: '/b', executar: as_duas.executar });
    expect(as_duas.chamadas.map((c) => c.script)).toEqual(['luz-rasante.py', 'curvatura-da-lataria.py']);
  });

  it('o pedido da emenda traz a seção da luz rasante, sem a curvatura da lataria', () => {
    const rasante = [{ arquivo: '/p/peca-lado-rasante-az30.png', vista: 'lado', azimute: 30, iluminada: 0.6 }];
    const pedido = montarPedido({ peca: 'p', superficie: { rasante, curvatura: [] } });
    const secao = pedido.slice(pedido.indexOf('## Superfície'), pedido.indexOf('## Veredito'));
    expect(secao).toContain('sombreamento suave sobre a emenda de sólidos fundidos');
    expect(secao).toContain('/p/peca-lado-rasante-az30.png');
    expect(secao).not.toMatch(/curvatura|chapa/);
  });

  it('sem o Blender a recusa diz que a peça leva a luz rasante, e não fala da curvatura', () => {
    const texto = mensagemSemBlender(NOME, EMENDA);
    expect(texto).toContain(`a peça '${NOME}' tem ${EMENDA.porque}`);
    expect(texto).toContain('leva a luz rasante, que sai do Blender');
    expect(texto).not.toContain('curvatura');
  });

  it('o pacote só com a luz rasante basta à emenda, e o de lataria sem a curvatura continua recusado', async () => {
    const { sha256 } = await medir();
    pacoteDaEmenda(sha256);
    expect(superficieDoPacote(NOME, { pasta: pastas.pacote, sha256 })).toEqual({ ok: true, imagens: ['peca-lado-rasante-az30.png'] });
    pacoteDaEmenda(sha256, { rasante: false });
    expect(superficieDoPacote(NOME, { pasta: pastas.pacote, sha256 })).toEqual({ ok: false, motivo: `o pacote de ${pastas.pacote} não trouxe a luz rasante` });
    const imagem = join(pastas.pacote, 'peca-lado-rasante-az30.png');
    gravarManifesto(pastas.pacote, { peca: NOME, receita: sha256, lataria: { lataria: true, porque: 'subdivisão' }, superficie: { rasante: [{ arquivo: imagem, vista: 'lado', azimute: 30, iluminada: 0.6 }], curvatura: [] } });
    expect(superficieDoPacote(NOME, { pasta: pastas.pacote, sha256 }).ok).toBe(false);
  });

  it('o registro da rodada cobra a luz rasante como cobra da lataria: recusa o veredito sem o pacote e grava com ele', async () => {
    await expect(registrarMedida(NOME, entrada({ veredito }), { medir, pasta: pastas.rodadas, pacote: pastas.pacote }))
      .rejects.toThrow(`'${NOME}' tem emenda sombreada (${EMENDA.porque}), e a pasta da rodada ${pastas.pacote} não tem o pacote.json`);
    expect(lerRodadas(NOME, { pasta: pastas.rodadas })).toEqual([]);
    const { sha256 } = await medir();
    pacoteDaEmenda(sha256);
    const { rodada } = await registrarMedida(NOME, entrada({ veredito }), { medir, pasta: pastas.rodadas, pacote: pastas.pacote });
    expect(rodada.superficie).toEqual({ lataria: EMENDA.porque, imagens: ['peca-lado-rasante-az30.png'] });
  });

  it('a rodada fechada sem a luz rasante não dá a peça por fechada, e o motivo fala da emenda', async () => {
    const { texto } = await medir();
    gravarRodada(NOME, { ...entrada({ veredito }), medidas: { passou: true, relatorio: 'ok' } }, { pasta: pastas.rodadas, receitaTexto: texto });
    const acao = await acaoDaPeca(NOME, { rodadas: lerRodadas(NOME, { pasta: pastas.rodadas }), limite: 6, medir, pasta: pastas.rodadas });
    expect(acao.acao).toBe('revisar');
    expect(acao.motivo).toContain('fechou sem a luz rasante no pacote do crítico, e a peça tem emenda sombreada');
  });
});

describe('a emenda sombreada e a etapa fixa', () => {
  const RECEITA = { PASSOS: [['unir', { origemId: 3, solidos: [{ origem: { op: 'cubo', id: 1 } }, { origem: { op: 'cubo', id: 2 } }] }], ['liso', { sel: { origem: { op: 'unir', id: 3 } }, angulo: 45 }]] };
  const montar = (estado) => {
    const raiz = mkdtempSync(join(area, 'acervo-'));
    mkdirSync(join(raiz, 'objeto'), { recursive: true });
    writeFileSync(join(raiz, 'objeto/montagem.json'), JSON.stringify({ instancias: [{ id: 'corpo', alvo: { tipo: 'peca', ref: 'objeto/corpo' } }] }));
    if (estado) writeFileSync(join(raiz, 'objeto/montagem.etapas.json'), JSON.stringify({ etapas: [{ instancia: 'corpo', estado }] }));
    return raiz;
  };

  it('a etapa fixa por aceite da pessoa não é reaberta pela regra, e a aberta, a quebrada e a peça fora de montagem levam a luz rasante', () => {
    expect(superficieDaPeca('objeto/corpo', RECEITA, null, { raiz: montar('fixa') })).toMatchObject({ lataria: false, luzRasante: false, porque: expect.stringContaining('a etapa da peça está fixa') });
    for (const estado of ['aberta', 'quebrada', null]) expect(superficieDaPeca('objeto/corpo', RECEITA, null, { raiz: montar(estado) }).luzRasante).toBe(true);
    expect(superficieDaPeca('solta/peca', RECEITA, null, { raiz: montar('fixa') }).luzRasante).toBe(true);
    /* a lataria não ganha a folga */
    expect(superficieDaPeca('objeto/corpo', { PASSOS: [{ op: 'subdivisao' }] }, null, { raiz: montar('fixa') })).toMatchObject({ lataria: true, luzRasante: true });
  });
});
