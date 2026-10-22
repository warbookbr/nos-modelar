/* leitura-do-pacote.test.mjs — ler-corte, ler-linhas e comparar-cortes leem só o pacote cego (imagens, quadro.json,
   camera.json e grade.json) e devolvem o traço em milímetro. A prova monta, sem Blender, um pacote desenhado pelo próprio
   imagens.py a partir do prisma de prova (pacote-de-prova.mjs e prisma-de-prova.mjs), cujos cortes e vincos se sabem de forma
   exata: os cortes com as cotas, os anéis e as linhas de ligação por cima do traço, e as vistas de linhas com a grade, o
   título e a barra por cima, com linhas que caem sobre a grade. Só precisa de python3 com Pillow e numpy, e se ignora sem
   eles. A mesma prova sobre um pacote feito pelo Blender está em leitura-blender.test.mjs, e a de comparar-vincos em
   comparar-vincos.test.mjs. */
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { bordaDeCorte, corte, dobras, projetar, secao, visivel, vincos } from './prisma-de-prova.mjs';
import { estatisticas, pontosDe, distancias, distanciasA } from './distancias-de-prova.mjs';
import { CORTES, eixosDaVista, montarPacote, py, temPillow } from './pacote-de-prova.mjs';

describe.skipIf(!temPillow)('leitura do pacote cego desenhado por código', () => {
  let dir;
  const p = (...n) => join(dir, ...n);
  let cams;
  const lidos = {};

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'leitura-pacote-'));
    cams = montarPacote(dir);
    py('ler-corte.py', ['--pacote', p('pacote'), '--saida', p('corte.json')]);
    py('ler-linhas.py', ['--pacote', p('pacote'), '--3d', '--saida', p('linhas.json')]);
    lidos.corte = JSON.parse(readFileSync(p('corte.json'), 'utf8'));
    lidos.linhas = JSON.parse(readFileSync(p('linhas.json'), 'utf8'));
  }, 120000);
  // MECANIFICA_BLENDER_GUARDAR=1 guarda a pasta com o pacote e as leituras para olhar depois
  afterAll(() => {
    if (!dir) return;
    if (process.env.MECANIFICA_BLENDER_GUARDAR) console.log(`saídas em ${dir}`);
    else rmSync(dir, { recursive: true, force: true });
  });

  it('a forma tem os vincos acima de 25 graus e as facetas do arco abaixo', () => {
    const d = dobras();
    const S = secao();
    expect(d.filter((g) => g > 25).length).toBe(6);
    expect(Math.max(...d.filter((g) => g < 25))).toBeLessThan(5);
    expect(S.length).toBe(17);
  });

  it('ler-corte recupera o contorno conhecido a menos de 1 mm, com as cotas por cima do traço', () => {
    const rotulos = JSON.parse(readFileSync(p('pacote', 'cortes', 'rotulos.json'), 'utf8'));
    for (const c of CORTES) {
      const r = lidos.corte.cortes.find((x) => x.corte === c.nome);
      const verdade = corte(c.eixo, c.valor);
      // as cotas existem e o anel delas cruza o traço: a leitura não é sobre um traço limpo
      expect(rotulos[c.nome].length, c.nome).toBeGreaterThanOrEqual(4);
      expect(r.polilinhas.length, c.nome).toBe(verdade.length);
      expect(r.polilinhas.map((q) => q.fechada), c.nome).toEqual(verdade.map((q) => q.fechada));
      const lidoParaVerdade = distancias(pontosDe(r.polilinhas.map((q) => ({ fechada: q.fechada, pontos: q.pontos_mm })), 0.5), verdade);
      const verdadeParaLido = distancias(pontosDe(verdade, 0.5), r.polilinhas.map((q) => ({ fechada: q.fechada, pontos: q.pontos_mm })));
      const a = estatisticas(lidoParaVerdade);
      const b = estatisticas(verdadeParaLido);
      expect(a.maxima, `${c.nome}: lido para verdade ${JSON.stringify(a)}`).toBeLessThan(1);
      expect(b.maxima, `${c.nome}: verdade para lido ${JSON.stringify(b)}`).toBeLessThan(1);
      // o erro estimado cobre o p95 medido, e a escala do desenho é a que o quadro declara
      expect(a.p95, c.nome).toBeLessThanOrEqual(r.erro_mm);
      expect(r.escala_px_por_mm, c.nome).toBeGreaterThan(1);
      expect(r.espessura_traco_px, c.nome).toBeCloseTo(3, 0);
    }
  });

  it('ler-corte repete a mesma saída e aceita a imagem e o quadro avulsos', () => {
    py('ler-corte.py', ['--pacote', p('pacote'), '--saida', p('corte-2.json')]);
    expect(readFileSync(p('corte-2.json'), 'utf8')).toBe(readFileSync(p('corte.json'), 'utf8'));
    const so = JSON.parse(py('ler-corte.py', ['--imagem', p('pacote', 'cortes', 'secao.png'), '--quadro', p('pacote', 'cortes', 'quadro.json'), '--corte', 'secao']));
    expect(so.cortes[0].polilinhas).toEqual(lidos.corte.cortes.find((x) => x.corte === 'secao').polilinhas);
  });

  it('ler-linhas separa o traço preto do cinza e recupera os vincos com cobertura e precisão a 2 mm acima de 0,9', () => {
    for (const [nome, c] of Object.entries(cams)) {
      const r = lidos.linhas.vistas[nome];
      const eixos = eixosDaVista(c);
      expect(r.eixos_uv, nome).toEqual(eixos.map((e) => 'xyz'[e]));
      expect(r.aviso, nome).toBeUndefined();
      for (const [tipo, arestas] of [['feicao', vincos()], ['corte', bordaDeCorte()]]) {
        const todas = arestas.map((a) => ({ fechada: false, pontos: projetar(a.pontos, eixos) }));
        const vistas = arestas.filter((a) => visivel(a, c.direcao)).map((a) => ({ fechada: false, pontos: projetar(a.pontos, eixos) }))
          .filter((q) => Math.hypot(...q.pontos[1].map((v, i) => v - q.pontos[0][i])) > 1);
        const lidas = r[tipo].polilinhas.map((q) => ({ fechada: q.fechada, pontos: q.pontos_mm }));
        if (!vistas.length) {
          expect(lidas.length, `${nome} ${tipo}`).toBe(0);
          continue;
        }
        const precisao = distanciasA(pontosDe(lidas, 1), todas, 2);
        const cobertura = distanciasA(pontosDe(vistas, 1), lidas, 2);
        expect(precisao, `${nome} ${tipo}: precisão`).toBeGreaterThan(0.9);
        expect(cobertura, `${nome} ${tipo}: cobertura`).toBeGreaterThan(0.9);
      }
    }
    // a vista de lado tem o fundo em y = 0 e o corte da caixa em z = 100 mm, os dois sobre linhas da grade
    const lado = lidos.linhas.vistas.lado;
    expect(lado.corte.polilinhas.some((q) => q.pontos_mm.every(([z]) => Math.abs(z - 100) < 1.5))).toBe(true);
    expect(lado.feicao.polilinhas.some((q) => q.pontos_mm.filter(([, y]) => Math.abs(y) < 1.5).length > 500)).toBe(true);
  });

  it('ler-linhas casa as vistas ortogonais em polilinhas 3D sobre os vincos, com a confiança marcada', () => {
    const r3 = lidos.linhas.linhas_3d;
    expect(r3.simetria_x).toBe(true);
    expect(Object.keys(r3.vistas_por_eixo).sort()).toEqual(['x', 'y', 'z']);
    const verdade = vincos().map((a) => ({ fechada: false, pontos: a.pontos.map((q) => q.map((v) => v * 1000)) }));
    const linhas = r3.polilinhas_3d;
    expect(linhas.length).toBeGreaterThan(5);
    for (const l of linhas) expect(['alta', 'media'], JSON.stringify(l.vistas)).toContain(l.confianca);
    const pts = pontosDe(linhas.map((l) => ({ fechada: false, pontos: l.pontos_mm })), 2);
    expect(distanciasA(pts, verdade, r3.tolerancia_mm)).toBeGreaterThan(0.98);
    // os vincos que as três vistas mostram por inteiro saem em 3D: a frente inclinada e as longitudinais
    const cobertura = distanciasA(pontosDe(verdade, 2), linhas.map((l) => ({ fechada: false, pontos: l.pontos_mm })), r3.tolerancia_mm);
    expect(cobertura).toBeGreaterThan(0.85);
  });

  it('comparar-cortes dá zero a menos do erro de leitura para a forma contra ela mesma e o desvio conhecido para a deslocada', () => {
    const contornos = (desloca) => ({ cortes: CORTES.map((c) => ({ corte: c.nome, eixo: c.eixo, valor_mm: c.valor * 1000, eixos_uv: c.eixos_uv,
      polilinhas: corte(c.eixo, c.valor, desloca).map((q) => ({ fechada: q.fechada, pontos_mm: q.pontos })) })) });
    const DESLOCA = [0, 0.003, 0];
    writeFileSync(p('cand-igual.json'), JSON.stringify(contornos([0, 0, 0])));
    writeFileSync(p('cand-deslocada.json'), JSON.stringify(contornos(DESLOCA)));
    py('comparar-cortes.py', ['--pacote', p('pacote'), '--contornos-candidata', p('cand-igual.json'), '--saida', p('cmp-igual')]);
    py('comparar-cortes.py', ['--pacote', p('pacote'), '--contornos-candidata', p('cand-deslocada.json'), '--saida', p('cmp-deslocada')]);
    const igual = JSON.parse(readFileSync(p('cmp-igual', 'comparacao.json'), 'utf8')).cortes;
    const desl = JSON.parse(readFileSync(p('cmp-deslocada', 'comparacao.json'), 'utf8')).cortes;
    for (const c of CORTES) {
      const m = igual[c.nome];
      expect(existsSync(p('cmp-igual', `${c.nome}-comparacao.png`)), c.nome).toBe(true);
      for (const k of ['pacote_para_candidata_mm', 'candidata_para_pacote_mm']) {
        expect(m[k].media, `${c.nome} ${k}`).toBeLessThan(0.3);
        expect(m[k].p95, `${c.nome} ${k}`).toBeLessThanOrEqual(m.erro_leitura_mm);
        expect(m[k].maxima, `${c.nome} ${k}`).toBeLessThan(1);
        expect(m[k].fracao_acima_do_erro, `${c.nome} ${k}`).toBeLessThan(0.05);
      }
      // o desvio esperado sai do contorno exato contra o contorno exato deslocado, pelo mesmo passo de 0,5 mm
      const exato = corte(c.eixo, c.valor);
      const movido = corte(c.eixo, c.valor, DESLOCA);
      const esperado = { pacote_para_candidata_mm: estatisticas(distancias(pontosDe(exato, 0.5), movido)),
        candidata_para_pacote_mm: estatisticas(distancias(pontosDe(movido, 0.5), exato)) };
      for (const k of Object.keys(esperado)) {
        const e = esperado[k];
        const d = desl[c.nome][k];
        expect(e.maxima, `${c.nome} ${k}: a translação de 3 mm aparece`).toBeGreaterThan(2.9);
        expect(Math.abs(d.media - e.media), `${c.nome} ${k}: média ${d.media} contra ${e.media}`).toBeLessThan(0.3);
        expect(Math.abs(d.p95 - e.p95), `${c.nome} ${k}: p95 ${d.p95} contra ${e.p95}`).toBeLessThanOrEqual(desl[c.nome].erro_leitura_mm);
        expect(Math.abs(d.maxima - e.maxima), `${c.nome} ${k}: máxima ${d.maxima} contra ${e.maxima}`).toBeLessThan(1);
      }
    }
  });
});
