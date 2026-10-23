/* leitura-blender.test.mjs — ler-corte, ler-linhas e comparar-cortes sobre um pacote cego feito de verdade pelo
   pacote-cego.py, a partir do prisma de prova (prisma-de-prova.mjs), cujos cortes e vincos se sabem de forma exata: o corte
   lido fica a menos de 1 mm do exato, os vincos lidos nas vistas ortogonais têm cobertura e precisão a 2 mm acima de 0,9, as
   linhas 3D caem sobre os vincos, e comparar-cortes, que renderiza a candidata pelo olhar-candidata.py, dá zero a menos do
   erro de leitura para a forma contra ela mesma e o desvio conhecido para a forma deslocada 3 mm em y; e comparar-vincos,
   que também renderiza a candidata, dá a forma contra o próprio pacote com cobertura e precisão acima de 0,9 por vista, no
   total e em 3D, acusa o vinco do chanfro ausente no lado, no topo e em 3D, e não na frente, acusa o mesmo vinco 5 mm acima
   com o desvio de 5 mm, e conta o vinco que um .blend declara numa forma que não o tem pela dobra.

   Só roda com MECANIFICA_BLENDER apontando o executável do Blender (e python3 com Pillow e numpy); sem a variável, o bloco
   se ignora. A prova sem Blender, sobre um pacote desenhado pelo imagens.py, está em leitura-do-pacote.test.mjs. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CAIXA, bordaDeCorte, corte, meioDoArredondamento, obj, projetar, visivel, vincos } from './prisma-de-prova.mjs';
import { estatisticas, pontosDe, distancias, distanciasA } from './distancias-de-prova.mjs';

const BLENDER = process.env.MECANIFICA_BLENDER;
const AQUI = fileURLToPath(new URL('.', import.meta.url));
const CORTES = [{ nome: 'secao', eixo: 'z', valor: 0.5 }, { nome: 'longitudinal', eixo: 'x', valor: 0.15 }];
const DIRECOES = { frente: [0, 0, -1], lado: [-1, 0, 0], topo: [0, -1, 0] };
const DESLOCA = [0, 0.003, 0];

function rodar(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 256 << 20 });
  if (r.status !== 0) throw new Error(`${args.find((a) => a.endsWith('.py'))} saiu com ${r.status}:\n${r.stdout.slice(-3000)}\n${r.stderr.slice(-3000)}`);
  return r.stdout;
}
const py = (script, args) => rodar('python3', ['-I', join(AQUI, script), ...args]);
const blender = (script, args) => rodar(BLENDER, ['-b', '--factory-startup', '--python', join(AQUI, script), '--', ...args]);
const polis = (lista) => lista.map((q) => ({ fechada: q.fechada, pontos: q.pontos_mm }));

describe.skipIf(!BLENDER)('leitura de um pacote cego feito pelo Blender', () => {
  let dir;
  const p = (...n) => join(dir, ...n);
  let lidoCorte;
  let lidoLinhas;

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'leitura-blender-'));
    writeFileSync(p('forma.obj'), obj());
    writeFileSync(p('deslocada.obj'), obj(DESLOCA));
    writeFileSync(p('sem-vinco.obj'), obj([0, 0, 0], { semVinco: true }));
    writeFileSync(p('vinco-deslocado.obj'), obj([0, 0, 0], { subirVinco: 0.005 }));
    writeFileSync(p('cfg.json'), JSON.stringify({ amostras_render: 1,
      cortes: CORTES.map(({ nome, eixo, valor }) => ({ nome, eixo, valor })) }));
    blender('pacote-cego.py', ['--referencia', p('forma.obj'), '--caixa', CAIXA.join(','), '--simetria-x', '--config', p('cfg.json'),
      '--saida', p('pacote'), '--privado', p('privado')]);
    py('ler-corte.py', ['--pacote', p('pacote'), '--saida', p('corte.json')]);
    py('ler-linhas.py', ['--pacote', p('pacote'), '--vista', 'frente,lado,topo', '--3d', '--saida', p('linhas.json')]);
    lidoCorte = JSON.parse(readFileSync(p('corte.json'), 'utf8'));
    lidoLinhas = JSON.parse(readFileSync(p('linhas.json'), 'utf8'));
  }, 600000);
  // MECANIFICA_BLENDER_GUARDAR=1 guarda a pasta com o pacote e as leituras para olhar depois
  afterAll(() => {
    if (!dir) return;
    if (process.env.MECANIFICA_BLENDER_GUARDAR) console.log(`saídas em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  });

  it('o pacote recorta o fundo pela caixa e desenha os vincos e a borda de corte', () => {
    const pacote = JSON.parse(readFileSync(p('pacote', 'pacote.json'), 'utf8'));
    expect(pacote.contagens.bordas.corte).toBeGreaterThan(0);
    expect(pacote.contagens.bordas.outra).toBe(0);
    expect(pacote.linhas.feicao).toBeGreaterThan(0);
    expect(pacote.cortes.map((c) => c.nome)).toEqual(CORTES.map((c) => c.nome));
  });

  it('ler-corte recupera o contorno exato a menos de 1 mm nos dois sentidos', () => {
    const privado = JSON.parse(readFileSync(p('privado', 'cortes.json'), 'utf8'));
    for (const c of CORTES) {
      const r = lidoCorte.cortes.find((x) => x.corte === c.nome);
      const exato = corte(c.eixo, c.valor);
      const lido = polis(r.polilinhas);
      expect(lido.map((q) => q.fechada), c.nome).toEqual(exato.map((q) => q.fechada));
      const a = estatisticas(distancias(pontosDe(lido, 0.5), exato));
      const b = estatisticas(distancias(pontosDe(exato, 0.5), lido));
      expect(a.maxima, `${c.nome}: lido para exato ${JSON.stringify(a)}`).toBeLessThan(1);
      expect(b.maxima, `${c.nome}: exato para lido ${JSON.stringify(b)}`).toBeLessThan(1);
      expect(a.p95, c.nome).toBeLessThanOrEqual(r.erro_mm);
      // os pontos que o pacote guarda só para a régua também ficam a menos de 1 mm do lido
      const pv = privado.cortes.find((x) => x.nome === c.nome).cadeias.flat().map((q) => [q['xyz'.indexOf(r.eixos_uv[0])] * 1000, q['xyz'.indexOf(r.eixos_uv[1])] * 1000]);
      expect(Math.max(...distancias(pv, lido)), c.nome).toBeLessThan(1);
    }
  });

  it('ler-linhas recupera os vincos e a borda de corte com cobertura e precisão a 2 mm acima de 0,9', () => {
    for (const [nome, direcao] of Object.entries(DIRECOES)) {
      const r = lidoLinhas.vistas[nome];
      expect(r.aviso, nome).toBeUndefined();
      const eixos = r.eixos_uv.map((e) => 'xyz'.indexOf(e));
      for (const [tipo, arestas] of [['feicao', vincos()], ['corte', bordaDeCorte()]]) {
        const todas = arestas.map((a) => ({ fechada: false, pontos: projetar(a.pontos, eixos) }));
        const vistas = arestas.filter((a) => visivel(a, direcao)).map((a) => ({ fechada: false, pontos: projetar(a.pontos, eixos) }))
          .filter((q) => Math.hypot(...q.pontos[1].map((v, i) => v - q.pontos[0][i])) > 1);
        const lidas = polis(r[tipo].polilinhas);
        if (!vistas.length) {
          expect(lidas.length, `${nome} ${tipo}`).toBe(0);
          continue;
        }
        expect(distanciasA(pontosDe(lidas, 1), todas, 2), `${nome} ${tipo}: precisão`).toBeGreaterThan(0.9);
        expect(distanciasA(pontosDe(vistas, 1), lidas, 2), `${nome} ${tipo}: cobertura`).toBeGreaterThan(0.9);
      }
    }
  });

  it('ler-linhas devolve em 3D só curvas sobre os vincos, com a confiança marcada', () => {
    const r3 = lidoLinhas.linhas_3d;
    expect(r3.simetria_x).toBe(true);
    const verdade = vincos().map((a) => ({ fechada: false, pontos: a.pontos.map((q) => q.map((v) => v * 1000)) }));
    const linhas = r3.polilinhas_3d.map((l) => ({ fechada: false, pontos: l.pontos_mm }));
    expect(linhas.length).toBeGreaterThan(3);
    expect(distanciasA(pontosDe(linhas, 2), verdade, r3.tolerancia_mm)).toBeGreaterThan(0.95);
    expect(distanciasA(pontosDe(verdade, 2), linhas, r3.tolerancia_mm)).toBeGreaterThan(0.7);
    // o ângulo da dobra onde a curva atravessa um corte, contra o da aresta exata mais perto
    const medidas = r3.polilinhas_3d.flatMap((l) => l.angulo_travessias || []);
    expect(medidas.length).toBeGreaterThanOrEqual(6);
    for (const m of medidas) {
      let melhor = null;
      for (const a of vincos()) {
        const d = distancias([m.ponto_mm], [{ fechada: false, pontos: a.pontos.map((q) => q.map((v) => v * 1000)) }])[0];
        if (!melhor || d < melhor.d) melhor = { d, graus: (Math.acos(a.normais[0].reduce((s, v, i) => s + v * a.normais[1][i], 0)) * 180) / Math.PI };
      }
      const erro = Math.abs(m.angulo_graus - melhor.graus);
      expect(erro, `${m.corte} ${JSON.stringify(m.ponto_mm)}: ${m.angulo_graus} contra ${melhor.graus.toFixed(2)}`).toBeLessThanOrEqual(m.incerteza_graus);
      expect(erro).toBeLessThan(1.5);
    }
  });

  it('comparar-cortes dá zero a menos do erro de leitura para a forma e o desvio conhecido para a deslocada', { timeout: 600000 }, () => {
    const comparar = (cand, saida) => {
      py('comparar-cortes.py', ['--pacote', p('pacote'), '--candidata', cand, '--blender', BLENDER, '--saida', p(saida)]);
      return JSON.parse(readFileSync(p(saida, 'comparacao.json'), 'utf8')).cortes;
    };
    const igual = comparar(p('forma.obj'), 'cmp-igual');
    const desl = comparar(p('deslocada.obj'), 'cmp-deslocada');
    for (const c of CORTES) {
      const m = igual[c.nome];
      expect(existsSync(p('cmp-igual', `${c.nome}-comparacao.png`)), c.nome).toBe(true);
      expect(existsSync(p('cmp-igual', 'candidata-cortes', `${c.nome}.png`)), c.nome).toBe(true);
      for (const k of ['pacote_para_candidata_mm', 'candidata_para_pacote_mm']) {
        expect(m[k].media, `${c.nome} ${k}`).toBeLessThan(0.3);
        expect(m[k].p95, `${c.nome} ${k}`).toBeLessThanOrEqual(m.erro_leitura_mm);
        expect(m[k].maxima, `${c.nome} ${k}`).toBeLessThan(1);
        expect(m[k].fracao_acima_do_erro, `${c.nome} ${k}`).toBeLessThan(0.05);
      }
      const exato = corte(c.eixo, c.valor);
      const movido = corte(c.eixo, c.valor, DESLOCA);
      const esperado = { pacote_para_candidata_mm: estatisticas(distancias(pontosDe(exato, 0.5), movido)),
        candidata_para_pacote_mm: estatisticas(distancias(pontosDe(movido, 0.5), exato)) };
      for (const [k, e] of Object.entries(esperado)) {
        const d = desl[c.nome][k];
        expect(e.maxima, `${c.nome} ${k}`).toBeGreaterThan(2.9);
        expect(Math.abs(d.media - e.media), `${c.nome} ${k}: média ${d.media} contra ${e.media}`).toBeLessThan(0.3);
        expect(Math.abs(d.p95 - e.p95), `${c.nome} ${k}: p95 ${d.p95} contra ${e.p95}`).toBeLessThanOrEqual(desl[c.nome].erro_leitura_mm);
        expect(Math.abs(d.maxima - e.maxima), `${c.nome} ${k}: máxima ${d.maxima} contra ${e.maxima}`).toBeLessThan(1);
      }
    }
  });

  it('comparar-vincos dá a forma contra o próprio pacote acima de 0,9 e acusa o vinco ausente, o deslocado e o declarado', { timeout: 900000 }, () => {
    // o prisma tem vincos de 33,5 e 39,8 graus, que o pacote desenha (a partir de 25) e o limiar da régua (40) chama de rasos: as
    // provas abaixo medem todas as linhas desenhadas, com --angulo-vinco 25, e o limiar padrão tem a prova própria no fim
    const comparar = (cand, saida, extra = []) => {
      py('comparar-vincos.py', ['--pacote', p('pacote'), '--candidata', cand, '--blender', BLENDER, '--angulo-vinco', '25', '--saida', p(saida), ...extra]);
      return JSON.parse(readFileSync(p(saida, 'comparacao-vincos.json'), 'utf8'));
    };
    const igual = comparar(p('forma.obj'), 'vin-igual');
    const vistas = Object.keys(igual.vistas);
    expect(vistas).toEqual(['frente', 'traseira', 'lado', 'topo', 'tresquartos']);
    for (const [n, m] of [...Object.entries(igual.vistas), ['total', igual.total]]) {
      for (const k of ['cobertura_2mm', 'precisao_2mm', 'cobertura_5mm', 'precisao_5mm']) expect(m[k], `${n} ${k}`).toBeGreaterThan(0.9);
      expect(m.desvio_mediana_mm, n).toBeLessThan(1);
    }
    for (const k of ['cobertura_5mm', 'precisao_5mm']) expect(igual['3d'][k], `3d ${k}`).toBeGreaterThan(0.9);
    for (const n of vistas) expect(existsSync(p('vin-igual', `${n}-vincos.png`)), n).toBe(true);
    // o vincos.json do olhar-candidata.py, reusado sem Blender, dá a mesma medida
    py('comparar-vincos.py', ['--pacote', p('pacote'), '--vincos-candidata', p('vin-igual', 'candidata-vincos.json'), '--angulo-vinco', '25', '--saida', p('vin-reuso')]);
    expect(readFileSync(p('vin-reuso', 'comparacao-vincos.json'), 'utf8')).toBe(readFileSync(p('vin-igual', 'comparacao-vincos.json'), 'utf8'));

    // sem o vinco do chanfro (a quina arredondada em facetas de 10 graus): a perda no lado, no topo e em 3D, e não na frente
    const sem = comparar(p('sem-vinco.obj'), 'vin-sem');
    for (const n of ['lado', 'topo', '3d']) {
      const m = n === '3d' ? sem['3d'] : sem.vistas[n];
      expect(m.cobertura_5mm, n).toBeLessThan(0.85);
      expect(m.precisao_5mm, n).toBeGreaterThan(0.95);
    }
    expect(sem.vistas.frente.cobertura_5mm).toBeGreaterThan(0.95);
    // a quina do chanfro 5 mm acima: o desvio no lado e em 3D; o topo mostra x e z, e o vinco não se move nele
    const desl = comparar(p('vinco-deslocado.obj'), 'vin-desl');
    for (const m of [desl.vistas.lado, desl['3d']]) {
      expect(m.cobertura_2mm).toBeLessThan(0.85);
      expect(m.desvio_p90_mm).toBeGreaterThan(4);
      expect(m.desvio_p90_mm).toBeLessThan(6.5);
    }
    expect(desl.vistas.topo.cobertura_2mm).toBeGreaterThan(0.95);
    // a forma sem o vinco num .blend com a aresta do meio do arredondamento marcada como vinco: o vinco declarado volta
    const [xm, ym] = meioDoArredondamento();
    blender('marcar-vincos-de-prova.py', [p('sem-vinco.obj'), p('sem-vinco.blend'), `${xm},${ym}`, `${-xm},${ym}`]);
    const decl = comparar(p('sem-vinco.blend'), 'vin-declarado', ['--z-cima']);
    expect(decl.segmentos_candidata.declarado).toBe(2);
    for (const n of ['lado', 'topo']) expect(decl.vistas[n].cobertura_5mm, n).toBeGreaterThan(0.95);
    expect(decl['3d'].cobertura_5mm).toBeGreaterThan(0.9);

    // pelo limiar padrão da régua (40 graus) os vincos de 33,5 e 39,8 graus da candidata são dobras rasas: ficam fora da
    // cobertura, que cai onde o pacote os desenha (a imagem não guarda o ângulo, e o pacote não se filtra), e a saída
    // relata o comprimento delas e a medida de antes ao lado
    py('comparar-vincos.py', ['--pacote', p('pacote'), '--vincos-candidata', p('vin-igual', 'candidata-vincos.json'), '--saida', p('vin-padrao-40')]);
    const quarenta = JSON.parse(readFileSync(p('vin-padrao-40', 'comparacao-vincos.json'), 'utf8'));
    expect(quarenta.angulo_vinco).toBe(40);
    expect(quarenta.rasas.faixa_graus).toEqual([25, 40]);
    expect(quarenta.rasas.comprimento_candidata_3d_mm).toBeGreaterThan(1500);
    expect(igual.rasas.comprimento_candidata_3d_mm).toBe(0);
    expect(quarenta.total.cobertura_5mm).toBeLessThan(igual.total.cobertura_5mm - 0.1);
    expect(quarenta.total.precisao_5mm).toBeGreaterThan(0.95);
    expect(quarenta.total.contando_as_rasas.cobertura_5mm).toBeGreaterThan(0.9);
  });
});
