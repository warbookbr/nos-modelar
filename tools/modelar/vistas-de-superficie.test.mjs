/* vistas-de-superficie.test.mjs — a peça de lataria não fecha a rodada de forma sem a luz rasante e a curvatura da lataria no pacote do
   crítico (decisão da pessoa em 2026-10-30).

   Sem o Blender roda o caminho da revisão: `vistas:critica` recusa o pacote da peça de lataria quando MODELAR_BLENDER não aponta o
   executável, antes de qualquer captura e com o comando que gera as vistas; com as vistas (aqui por um gerador que grava arquivos), o
   pedido ganha a seção da superfície e o `pacote.json` diz a versão da receita e as imagens; o registro da rodada recusa o veredito do
   crítico de peça de lataria sem esse pacote, ou com o de outra versão, e grava as imagens quando ele está certo; e a ação do laço não
   dá por fechada a peça de lataria cuja última rodada não as tem. Com MODELAR_BLENDER, as duas vistas da peça de prova saem de verdade,
   com a nervura em cinza na curvatura porque só a chapa nasceu de subdivisão. */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { doAmbiente } from '../ambiente.mjs';
import { acaoDaPeca, gravarRodada, lerRodadas, medirReceita, registrarMedida } from './rodada-de-modelagem.mjs';
import {
  MANIFESTO_DO_PACOTE, comandoDoPacote, gravarManifesto, impressaoDoTexto, superficieDoPacote, vistasDeSuperficie,
} from './vistas-de-superficie.mjs';
import { prefixoDaPeca, vistasParaCritica } from './vistas-para-critica.mjs';
import { altura, linhaDaNervura, pontos } from '../../procedural/nucleo/fixtures/friso-prova.js';

const PECA = 'tools/fixtures/lataria-de-prova/receita.js';
const NAO_LATARIA = 'tools/fixtures/forma-do-esboco/ok/receita.js';
const BLENDER = doAmbiente('BLENDER');
const area = mkdtempSync(join(tmpdir(), 'vistas-superficie-'));
afterAll(() => rmSync(area, { recursive: true, force: true }));

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
function superficieFalsa() {
  const chamadas = [];
  const gerar = async (peca, { pasta, lataria }) => {
    chamadas.push({ peca, pasta, lataria });
    const destino = join(pasta, 'superficie');
    mkdirSync(destino, { recursive: true });
    const gravar = (nome) => { const a = join(destino, nome); writeFileSync(a, nome); return a; };
    return {
      partes: ['chapa'],
      rasante: ['frente', 'lado'].flatMap((vista) => [30, 120].map((azimute) => ({ arquivo: gravar(`peca-${vista}-rasante-az${azimute}.png`), vista, azimute }))),
      curvatura: ['frente', 'lado'].map((vista) => ({ arquivo: gravar(`peca-${vista}-curvatura-legenda.png`), vista })),
    };
  };
  return { gerar, chamadas };
}

describe('o pacote do crítico de peça de lataria', () => {
  it('sem o Blender, recusa antes de qualquer captura, dizendo que a peça é de lataria e o comando que gera as vistas', async () => {
    const base = mkdtempSync(join(area, 'sem-blender-'));
    const bancada = bancadaFalsa(base, PECA);
    await expect(vistasParaCritica(PECA, { saida: join(base, 'rodada'), pastaDasCapturas: base, dependencias: { olharBancada: bancada.fazer, blender: null } }))
      .rejects.toThrow(`a peça '${PECA}' é de lataria (a receita tem superfície livre por subdivisão (PASSOS[0])), e o pacote do crítico de peça de lataria `
        + `leva a luz rasante e a curvatura da lataria, que saem do Blender; MODELAR_BLENDER não aponta o executável. Rode \`${comandoDoPacote(PECA)}\``);
    expect(bancada.chamadas).toHaveLength(0);
    expect(existsSync(join(base, 'rodada', 'pedido.md'))).toBe(false);
  });

  it('com as vistas, o pedido ganha a seção da superfície com todas as imagens, e o pacote.json diz a versão e as imagens', async () => {
    const base = mkdtempSync(join(area, 'com-vistas-'));
    const pasta = join(base, 'rodada');
    const bancada = bancadaFalsa(base, PECA);
    const superficie = superficieFalsa();
    const resultado = await vistasParaCritica(PECA, {
      saida: pasta, pastaDasCapturas: base, dependencias: { olharBancada: bancada.fazer, blender: '/blender/de/ensaio', vistasDeSuperficie: superficie.gerar },
    });
    expect(superficie.chamadas).toEqual([{ peca: PECA, pasta, lataria: { lataria: true, porque: 'a receita tem superfície livre por subdivisão (PASSOS[0])', partes: null } }]);
    const pedido = readFileSync(join(pasta, 'pedido.md'), 'utf8');
    const titulos = [...pedido.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
    expect(titulos).toEqual(['Objeto', 'Alvo', 'Referências', 'Modelo', 'Superfície', 'Partes', 'Critérios de reprovação', 'Veredito']);
    const secao = pedido.slice(pedido.indexOf('## Superfície'), pedido.indexOf('## Partes'));
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
      dependencias: {
        olharBancada: bancadaFalsa(base, NAO_LATARIA).fazer, blender: null, vistasDeSuperficie: superficie.gerar,
        composta: async (arquivo) => { const destino = arquivo.replace(/\.esboco\.json$/, '-composta.png'); writeFileSync(destino, 'c'); return { destino }; },
        sobreposicaoDeCortes: async () => ({ arquivos: [], paineis: [], notas: [] }),
      },
    });
    expect(superficie.chamadas).toHaveLength(0);
    expect(readFileSync(join(pasta, 'pedido.md'), 'utf8')).not.toContain('## Superfície');
    expect(JSON.parse(readFileSync(join(pasta, MANIFESTO_DO_PACOTE), 'utf8'))).toMatchObject({ peca: NAO_LATARIA, lataria: null, superficie: null });
  }, 60_000);
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
  const pacoteCom = (sha256, { superficie = true } = {}) => {
    const imagens = ['peca-lado-rasante-az30.png', 'peca-lado-curvatura-legenda.png'].map((nome) => { const a = join(pastas.pacote, nome); writeFileSync(a, nome); return a; });
    gravarManifesto(pastas.pacote, {
      peca: NOME, receita: sha256, lataria: { lataria: true, porque: 'subdivisão' },
      superficie: superficie ? { partes: ['chapa'], rasante: [{ arquivo: imagens[0] }], curvatura: [{ arquivo: imagens[1] }] } : null,
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
      .rejects.toThrow(`gere-o com \`MODELAR_BLENDER=<caminho do Blender> npm run vistas:critica -- ${NOME}\``);
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
    expect(acao.motivo).toContain(`\`MODELAR_BLENDER=<caminho do Blender> npm run vistas:critica -- ${NOME}\``);
  });
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

describe.skipIf(!BLENDER)('as duas vistas da peça de prova, no Blender', () => {
  it('saem a luz rasante nas quatro vistas e dois azimutes e a curvatura nas quatro, com a nervura em cinza e a chapa em cor', { timeout: 600_000 }, async () => {
    const pasta = mkdtempSync(join(area, 'blender-'));
    const feitas = await vistasDeSuperficie(PECA, { pasta, blender: BLENDER });
    expect(feitas.partes).toEqual(['chapa']);
    expect(feitas.rasante.map((i) => `${i.vista}-${i.azimute}`)).toEqual(['frente-30', 'frente-120', 'lado-30', 'lado-120', 'topo-30', 'topo-120', 'tresquartos-30', 'tresquartos-120']);
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
