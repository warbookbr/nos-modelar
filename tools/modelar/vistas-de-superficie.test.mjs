/* vistas-de-superficie.test.mjs — a peça de lataria não fecha a rodada de forma sem a luz rasante e a curvatura da lataria no pacote do
   crítico (decisão da pessoa em 2026-10-30).

   Sem o Blender roda o caminho da revisão: `vistas:critica` recusa o pacote da peça de lataria quando MODELAR_BLENDER não aponta o
   executável, antes de qualquer captura e com o comando que gera as vistas; com as vistas (aqui por um gerador que grava arquivos), o
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
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PNG } from 'pngjs';
import { afterAll, beforeEach, describe, expect, it, onTestFinished } from 'vitest';
import { doAmbiente } from '../ambiente.mjs';
import { acaoDaPeca, gravarRodada, lerRodadas, medirReceita, registrarMedida, resumoDoLaco } from './rodada-de-modelagem.mjs';
import {
  MANIFESTO_DO_PACOTE, comandoDoPacote, gravarManifesto, impressaoDoTexto, superficieDoPacote, vincosDaMalha, vistasDeSuperficie,
} from './vistas-de-superficie.mjs';
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
    const script = argv[3].split('/').pop();
    const args = argv.slice(5);
    const opcao = (nome) => { const i = args.indexOf(nome); return i < 0 ? null : args[i + 1]; };
    chamadas.push({ script, args });
    const prefixo = opcao('--saida');
    const gravar = (nome) => { writeFileSync(`${prefixo}${nome}`, nome); return `${prefixo}${nome}`; };
    if (script === 'luz-rasante.py') {
      writeFileSync(`${prefixo}rasante.json`, JSON.stringify({ imagens: [{ vista: 'topo', azimute: 30, arquivos: { malha: gravar('topo-rasante-az30.png') } }] }));
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
