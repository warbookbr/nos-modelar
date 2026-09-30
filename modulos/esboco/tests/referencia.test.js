/* Conferência contra a referência: a silhueta do esboço contra um contorno (gerado aqui, sem foto), por vista e por parte, com
   a razão interseção/união e o desvio em mm; as medidas tiradas do contorno; e a entrada na leitura padrão e no Condutor. */
import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import { ErroDeEsboco } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { conferirReferenciaNaOpcao, lerPlano, visiveisDoEsboco } from '../src/plano.js';
import { formatarConferencia, formatarMedidasDaReferencia, lerContornos, medidasDaReferencia } from '../src/referencia.js';
import { formatarResumo, medirEsboco } from '../src/descrever.js';
import { avancar, criarEstado, portaoDoEstagio } from '../src/condutor.js';
import { lerArgumentos, medidasDaReferenciaArquivo, referenciaArquivo } from '../../../tools/mecanifica/esboco.mjs';
import { referenciasDoEsboco } from '../../../tools/mecanifica/esboco-referencia.mjs';

const caixa = (id, centro, l, a, p, extra = {}) => ({ id, tipo: 'caixa', largura: l, altura: a, profundidade: p, centro, ...extra });
/* A base vai de x -50 a 50, y 0 a 100 e z 0 a 400; a coluna, de x 30 a 70, y 100 a 300 e z 300 a 400, pousa sobre a ponta da
   base e sai dela para o lado +x. Nenhuma vista é simétrica em nada, e por isso cada silhueta só serve à orientação certa. */
const esboco = (plano) => ({
  ...(plano ? { plano } : {}),
  opcoes: [{ titulo: 'T', formas: [caixa('base', [0, 50, 200], 100, 100, 400), caixa('coluna', [50, 200, 350], 40, 200, 100)] }],
});
const retangulo = (h0, v0, h1, v1) => [[h0, v0], [h1, v0], [h1, v1], [h0, v1]];
/* a silhueta e as regiões do que aparece de cada parte em cada vista (h para a direita, v para cima; na lateral h é z, e na
   superior v é menos z, com a coluna, mais alta, cobrindo a base onde as duas se sobrepõem) */
const SILHUETAS = {
  frontal: { silhueta: [[-50, 0], [50, 0], [50, 100], [70, 100], [70, 300], [30, 300], [30, 100], [-50, 100]], base: retangulo(-50, 0, 50, 100), coluna: retangulo(30, 100, 70, 300) },
  lateral: { silhueta: [[0, 0], [400, 0], [400, 300], [300, 300], [300, 100], [0, 100]], base: retangulo(0, 0, 400, 100), coluna: retangulo(300, 100, 400, 300) },
  superior: { silhueta: [[-50, -400], [70, -400], [70, -300], [50, -300], [50, 0], [-50, 0]], base: [[-50, -400], [30, -400], [30, -300], [50, -300], [50, 0], [-50, 0]], coluna: retangulo(30, -400, 70, -300) },
};
const deslocar = (pts, dh, dv) => pts.map(([h, v]) => [h + dh, v + dv]);
const contornos = (vista, { dh = 0, dv = 0, sem = [] } = {}) => lerContornos({
  formato: 'mecanifica.contornos@1',
  mmPorPx: 1,
  silhueta: { contornoMm: deslocar(SILHUETAS[vista].silhueta, dh, dv) },
  regioes: Object.fromEntries(['base', 'coluna'].filter((n) => !sem.includes(n)).map((n) => [n, { contornoMm: deslocar(SILHUETAS[vista][n], dh, dv) }])),
});
const conferir = (vista, extra = {}, entrada = {}, e = esboco()) => {
  const x = expandirEsboco(e);
  return conferirReferenciaNaOpcao({ arquivo: 'r.json', vista, tolerancia: 10, iou_min: 0.9, ...entrada }, contornos(vista, extra), x, visiveisDoEsboco(x), 0);
};
const silhueta = (c) => c.resultados.find((r) => r.parte === null);
const parte = (c, nome) => c.resultados.find((r) => r.parte === nome);

describe('a silhueta do esboço contra o contorno de referência', () => {
  it.each(['frontal', 'lateral', 'superior'])('o esboço igual ao contorno passa, na silhueta e nas partes, na vista %s', (vista) => {
    const c = conferir(vista);
    expect(c.ok).toBe(true);
    expect(silhueta(c).iou).toBeGreaterThan(0.99);
    expect(silhueta(c).desvio_mm).toBeLessThanOrEqual(2 * c.celula_mm);
    for (const nome of ['base', 'coluna']) {
      expect(parte(c, nome).ok).toBe(true);
      expect(parte(c, nome).iou).toBeGreaterThan(0.98);
    }
    expect(c.semParte).toEqual([]);
  });

  it.each([['frontal', 30, 0], ['frontal', 0, -30], ['lateral', 30, 0], ['lateral', 0, 30], ['superior', 30, 0], ['superior', 0, 30]])('o contorno deslocado na vista %s (%i, %i mm) reprova com o desvio em mm', (vista, dh, dv) => {
    const c = conferir(vista, { dh, dv });
    expect(c.ok).toBe(false);
    const s = silhueta(c);
    expect(s.ok).toBe(false);
    expect(Math.abs(s.desvio_mm - Math.hypot(dh, dv))).toBeLessThanOrEqual(2 * c.celula_mm);
    expect(s.iou).toBeLessThan(0.9);
    /* o esboço menos a referência: o centro do esboço fica do lado oposto ao do deslocamento do contorno */
    expect(s.diferenca.centro_mm[0]).toBeCloseTo(-dh, 0);
    expect(s.diferenca.centro_mm[1]).toBeCloseTo(-dv, 0);
    expect(s.texto).toContain(`na vista ${vista}, a silhueta do esboço desvia `);
    expect(s.texto).toMatch(/mm da referência \(desvio médio .* mm\) e a razão interseção\/união é 0,\d\d \(tolerância 10 mm, razão interseção\/união mínima 0,90\)/);
  });

  it('a orientação é a da referência: na lateral a frente (z maior) fica à direita, e o contorno espelhado reprova', () => {
    const espelhado = lerContornos({ formato: 'mecanifica.contornos@1', silhueta: { contornoMm: SILHUETAS.lateral.silhueta.map(([h, v]) => [400 - h, v]) }, regioes: {} });
    const x = expandirEsboco(esboco());
    const c = conferirReferenciaNaOpcao({ arquivo: 'r.json', vista: 'lateral', tolerancia: 10 }, espelhado, x, visiveisDoEsboco(x), 0);
    expect(silhueta(c).ok).toBe(false);
    expect(silhueta(c).iou).toBeLessThan(0.7);
  });

  it('uma tolerância maior que o desvio aprova, mas a razão interseção/união mínima ainda reprova', () => {
    const folgado = conferir('frontal', { dh: 12 }, { tolerancia: 20, iou_min: 0.5 });
    expect(silhueta(folgado).desvio_mm).toBeGreaterThan(10);
    expect(silhueta(folgado).ok).toBe(true);
    const exigente = conferir('frontal', { dh: 12 }, { tolerancia: 20, iou_min: 0.95 });
    expect(silhueta(exigente).desvio_mm).toBeLessThanOrEqual(20);
    expect(silhueta(exigente).iou).toBeLessThan(0.95);
    expect(silhueta(exigente).ok).toBe(false);
  });

  it('sem limites declarados valem 3% da maior dimensão (mínimo 5 mm) e 0,85, e o texto diz que são padrões', () => {
    const c = conferir('lateral', { dv: 40 }, { tolerancia: undefined, iou_min: undefined });
    const s = silhueta(c);
    expect(s.tolerancia_mm).toBe(12);
    expect(s.tolerancia_declarada).toBe(false);
    expect(s.iou_min).toBe(0.85);
    expect(s.texto).toContain('tolerância 12 mm (padrão)');
    expect(s.texto).toContain('razão interseção/união mínima 0,85 (padrão)');
  });

  it('uma parte é comparada com o que aparece dela: de cima a coluna cobre a base, e a região completa da base no contorno não a cobre', () => {
    const c = conferir('superior');
    expect(parte(c, 'base').iou).toBeGreaterThan(0.98);
    expect(parte(c, 'coluna').iou).toBeGreaterThan(0.98);
    const x = expandirEsboco(esboco());
    const completa = lerContornos({ formato: 'mecanifica.contornos@1', silhueta: { contornoMm: SILHUETAS.superior.silhueta }, regioes: { base: { contornoMm: retangulo(-50, -400, 50, 0) } } });
    const l = conferirReferenciaNaOpcao({ arquivo: 'r.json', vista: 'superior', tolerancia: 10 }, completa, x, visiveisDoEsboco(x), 0);
    /* o retângulo inteiro tem 10000 mm² de sobra que a coluna cobre: a razão cai de 1 para cerca de 0,95 */
    expect(parte(l, 'base').iou).toBeGreaterThan(0.9);
    expect(parte(l, 'base').iou).toBeLessThan(0.97);
  });

  it('mapeia a região ao id do esboço pelo nome, por plano.referencia.partes e por padrão, e diz as regiões sem forma', () => {
    const x = expandirEsboco(esboco());
    const v = visiveisDoEsboco(x);
    const ref = lerContornos({ formato: 'mecanifica.contornos@1', silhueta: { contornoMm: SILHUETAS.frontal.silhueta }, regioes: { base: { contornoMm: SILHUETAS.frontal.base }, apoio: { contornoMm: SILHUETAS.frontal.base }, topo: { contornoMm: SILHUETAS.frontal.coluna }, fantasma: { contornoMm: SILHUETAS.frontal.coluna } } });
    const c = conferirReferenciaNaOpcao({ arquivo: 'r.json', vista: 'frontal', tolerancia: 10, partes: { apoio: ['base'], topo: ['col*'] } }, ref, x, v, 0);
    expect(c.resultados.map((r) => `${r.parte}:${r.formas}`)).toEqual(['null:base,coluna', 'base:base', 'apoio:base', 'topo:coluna']);
    expect(c.semParte).toEqual(['fantasma']);
    expect(c.ok).toBe(true);
    expect(formatarConferencia({ arquivo: 'r.json' }, c)).toContain('regiões sem forma correspondente (declare plano.referencia.partes): fantasma');
    expect(() => conferirReferenciaNaOpcao({ arquivo: 'r.json', vista: 'frontal', partes: { apoio: ['nao-existe'] } }, ref, x, v, 0)).toThrow(/"nao-existe" não é uma forma visível da opção/);
    expect(() => conferirReferenciaNaOpcao({ arquivo: 'r.json', vista: 'frontal', partes: { inexistente: ['base'] } }, ref, x, v, 0)).toThrow(/cita a região "inexistente", que o arquivo não tem \(regiões: base, apoio, topo, fantasma\)/);
  });

  it('é determinística', () => {
    expect(JSON.stringify(conferir('lateral', { dh: 7, dv: 3 }))).toBe(JSON.stringify(conferir('lateral', { dh: 7, dv: 3 })));
  });
});

describe('plano.referencia no esquema', () => {
  const ref = { arquivo: 'r.json', vista: 'lateral' };
  const recusa = (r, trecho) => { expect(() => lerPlano({ referencia: r })).toThrow(ErroDeEsboco); expect(() => lerPlano({ referencia: r })).toThrow(trecho); };

  it('aceita uma entrada ou uma lista, e guarda os campos', () => {
    expect(lerPlano({ referencia: { ...ref, tolerancia: 25, iou_min: 0.8 } }).referencia).toEqual([{ ...ref, tolerancia: 25, iou_min: 0.8 }]);
    expect(lerPlano({ referencia: [ref, { ...ref, vista: 'frontal' }] }).referencia.map((r) => r.vista)).toEqual(['lateral', 'frontal']);
    expect(lerPlano({ medidas: [] }).referencia).toEqual([]);
    expect(lerPlano('texto').referencia).toEqual([]);
  });

  it('recusa o que falta e o que não serve, dizendo o campo e o exemplo', () => {
    recusa({ vista: 'lateral' }, /falta o "arquivo"/);
    recusa({ arquivo: 'r.json' }, /falta a "vista" que o arquivo mostra/);
    recusa({ ...ref, vista: 'isometrica' }, /a vista "isometrica" não serve à referência \(válidas: frontal, lateral, superior/);
    recusa({ ...ref, tolerancia: 0 }, /"tolerancia" \(em mm\) deve ser um número maior que zero/);
    recusa({ ...ref, iou_min: 1.5 }, /"iou_min" deve ser uma fração/);
    recusa({ ...ref, tolerancai: 3 }, /o campo "tolerancai" não existe \(quis dizer "tolerancia"\?\)/);
    recusa({ ...ref, partes: { a: [] } }, /"partes" deve ser/);
  });

  it('o plano aceita a origem "referencia" numa medida e recusa um envelope mal escrito', () => {
    expect(lerPlano({ medidas: [{ nome: 'm', valor: 10, unidade: 'mm', origem: 'referencia', mede: 'alturaTotal' }] }).medidas[0].origem).toBe('referencia');
    expect(lerPlano({ envelope: {} }).envelope).toEqual({});
    expect(lerPlano({ envelope: { tolerancia: 3 } }).envelope).toEqual({ tolerancia: 3 });
    expect(() => lerPlano({ envelope: { tolerancia: -1 } })).toThrow(/"plano.envelope.tolerancia"/);
    expect(() => lerPlano({ envelope: { folga: 1 } })).toThrow(/o campo "folga" não existe/);
  });
});

describe('a divergência da referência na leitura padrão e no Condutor', () => {
  const plano = (extra = {}) => ({ nivel: 'medio', referencia: { arquivo: 'r.json', vista: 'lateral', tolerancia: 10, iou_min: 0.9, ...extra }, medidas: [{ nome: 'c', valor: 400, unidade: 'mm', origem: 'referencia', tolerancia: 5, mede: 'profundidadeTotal' }, { nome: 'l', valor: 100, unidade: 'mm', origem: 'referencia', tolerancia: 5, mede: { caixa: 'x', formas: ['base'] } }, { nome: 'a', valor: 300, unidade: 'mm', origem: 'referencia', tolerancia: 5, mede: 'alturaTotal' }], contrato: { tocam: [['base', 'coluna']] } });
  const comGate = (p) => ({ ...esboco(p), contato: { usar: true, tolerancia: 2, penetracao: 2, folga: 100 } });
  const mapa = (vista, extra) => new Map([['r.json', contornos(vista, extra)]]);

  it('o contorno igual não gera divergência, e o deslocado entra como classe "referencia" depois de todas as outras', () => {
    const bom = medirEsboco(comGate(plano()), { projecao: false, referencias: mapa('lateral') });
    expect(bom.divergencias).toEqual([]);
    const mau = medirEsboco(comGate(plano()), { projecao: false, referencias: mapa('lateral', { dv: 30 }) });
    expect(mau.divergencias.map((d) => d.classe)).toEqual(['referencia', 'referencia', 'referencia']);
    expect(mau.divergencias[0]).toMatchObject({ n: 1, tipo: 'referencia-fora', pecas: [] });
    expect(mau.divergencias[1].pecas).toEqual(['base']);
    const texto = formatarResumo(mau.descricao, mau.divergencias);
    expect(texto).toContain('divergências (3, da mais grave para a menos):');
    expect(texto).toMatch(/\[1\] referencia: na vista lateral, a silhueta do esboço desvia (29|30|31)(,\d)? mm da referência/);
    expect(mau.plano.resumo.referencias).toBe(1);
  });

  it('a referência declarada e não carregada é uma divergência, e não um silêncio', () => {
    const d = medirEsboco(comGate(plano()), { projecao: false });
    expect(d.divergencias).toHaveLength(1);
    expect(d.divergencias[0].texto).toContain('a referência "r.json" (vista lateral) não foi carregada');
  });

  it('o Portão cobra a referência na Conferência da maquete, e não na Maquete', () => {
    const e = comGate(plano());
    const referencias = mapa('lateral', { dv: 30 });
    let s = criarEstado(e, 'x.esboco.json');
    expect(s.estagios).toEqual(['maquete', 'conferencia-da-maquete']);
    const maquete = portaoDoEstagio(e, s, { referencias });
    expect(maquete.passa).toBe(true);
    s = avancar(e, s, { referencias }).estado;
    expect(s.atual).toBe('conferencia-da-maquete');
    const conferencia = portaoDoEstagio(e, s, { referencias });
    expect(conferencia.passa).toBe(false);
    expect(conferencia.falta.some((f) => /referencia: na vista lateral, a silhueta do esboço desvia/.test(f))).toBe(true);
    expect(avancar(e, s, { referencias }).ok).toBe(false);
    const limpo = avancar(e, s, { referencias: mapa('lateral') });
    expect(limpo.ok).toBe(true);
    expect(limpo.estado.atual).toBe('concluido');
    /* o esquemático não tem Conferência: a referência vale na Maquete */
    const rapido = comGate({ ...plano(), nivel: 'esquematico' });
    expect(portaoDoEstagio(rapido, criarEstado(rapido, 'x'), { referencias }).passa).toBe(false);
  });
});

describe('--referencia e --medidas-da-referencia na linha de comando', () => {
  const pasta = () => mkdtempSync(join(tmpdir(), 'referencia-'));
  const gravar = (dir, nome, obj) => { writeFileSync(join(dir, nome), JSON.stringify(obj)); return join(dir, nome); };
  const json = (vista, extra) => ({ formato: 'mecanifica.contornos@1', mmPorPx: 1, silhueta: { contornoMm: deslocar(SILHUETAS[vista].silhueta, extra?.dh ?? 0, extra?.dv ?? 0) }, regioes: { base: { contornoMm: deslocar(SILHUETAS[vista].base, extra?.dh ?? 0, extra?.dv ?? 0) }, coluna: { contornoMm: deslocar(SILHUETAS[vista].coluna, extra?.dh ?? 0, extra?.dv ?? 0) } } });

  it('lê a vista do nome do arquivo, usa os limites do plano e sai com código 1 quando reprova, com o desvio em mm', () => {
    const dir = pasta();
    const arq = gravar(dir, 'm.esboco.json', esboco({ referencia: { arquivo: 'lateral.contornos.json', vista: 'lateral', tolerancia: 10, iou_min: 0.9 } }));
    gravar(dir, 'lateral.contornos.json', json('lateral'));
    const bom = referenciaArquivo(arq, join(dir, 'lateral.contornos.json'));
    expect(bom.codigo).toBe(0);
    expect(bom.texto).toContain('(vista lateral, célula de');
    expect(bom.texto).toContain('tolerância 10 mm, razão interseção/união mínima 0,90), opção 1 (T): aprovada');
    expect(bom.texto).toContain('conferência contra a referência: aprovada');
    gravar(dir, 'lateral.contornos.json', json('lateral', { dv: 25 }));
    const mau = referenciaArquivo(arq, join(dir, 'lateral.contornos.json'));
    expect(mau.codigo).toBe(1);
    expect(mau.texto).toMatch(/silhueta: desvio 2[45],\d mm \(médio .* mm\), razão interseção\/união 0,\d\d: reprova/);
    expect(mau.texto).toContain('parte base:');
    expect(mau.texto).toContain('conferência contra a referência: reprovada');
  });

  it('sem entrada no plano diz a vista ou a pede, e mede com os padrões', () => {
    const dir = pasta();
    const arq = gravar(dir, 'm.esboco.json', esboco());
    const r = gravar(dir, 'contorno.json', json('frontal'));
    expect(() => referenciaArquivo(arq, r)).toThrow(/diga a vista que ".*contorno.json" mostra \(--vista frontal, lateral ou superior\)/);
    const c = referenciaArquivo(arq, r, { vista: 'frontal' });
    expect(c.codigo).toBe(0);
    expect(c.texto).toContain('(padrão)');
    expect(() => referenciaArquivo(arq, join(dir, 'nao-existe-lateral.json'))).toThrow(/o arquivo não existe/);
  });

  it('uma imagem com duas âncoras vale como silhueta, e o esboço deslocado reprova', () => {
    const dir = pasta();
    /* 2 mm por pixel: a silhueta lateral em L (z 0 a 400, y 0 a 300) desenhada em preto sobre branco, y para baixo */
    const png = new PNG({ width: 260, height: 180 });
    png.data.fill(255);
    const pintar = (z0, y0, z1, y1) => { for (let y = 0; y < 180; y++) for (let x = 0; x < 260; x++) { const z = x * 2; const h = 340 - y * 2; if (z >= z0 && z < z1 && h >= y0 && h < y1) { const k = (y * 260 + x) * 4; png.data[k] = png.data[k + 1] = png.data[k + 2] = 0; } } };
    pintar(0, 0, 400, 100); pintar(300, 100, 400, 300);
    writeFileSync(join(dir, 'lateral.png'), PNG.sync.write(png));
    /* o pixel (x, y) é z = 2x e altura = 340 - 2y, e as duas âncoras dão a escala de 2 mm/px */
    gravar(dir, 'ancoras.json', { ancoras: [{ nome: 'a', px: [0, 170], mm: [0, 0] }, { nome: 'b', px: [200, 70], mm: [400, 200] }] });
    const arq = gravar(dir, 'm.esboco.json', esboco());
    const ok = referenciaArquivo(arq, join(dir, 'lateral.png'), { ancoras: join(dir, 'ancoras.json') });
    expect(ok.conferencias[0].resultados[0].iou).toBeGreaterThan(0.97);
    expect(ok.codigo).toBe(0);
    const desloc = esboco();
    desloc.opcoes[0].formas.forEach((f) => { f.centro = [f.centro[0], f.centro[1], f.centro[2] + 60]; });
    const arq2 = gravar(dir, 'n.esboco.json', desloc);
    const mau = referenciaArquivo(arq2, join(dir, 'lateral.png'), { ancoras: join(dir, 'ancoras.json') });
    expect(mau.codigo).toBe(1);
    expect(mau.conferencias[0].resultados[0].desvio_mm).toBeGreaterThan(50);
    expect(() => referenciaArquivo(arq, join(dir, 'lateral.png'))).toThrow(/uma imagem precisa das âncoras/);
  });

  it('o plano que declara a referência é lido pela leitura, com o arquivo relativo ao esboço', () => {
    const dir = pasta();
    gravar(dir, 'lateral.contornos.json', json('lateral'));
    const e = esboco({ referencia: { arquivo: 'lateral.contornos.json', vista: 'lateral', tolerancia: 10 } });
    expect([...referenciasDoEsboco(e, dir).keys()]).toEqual(['lateral.contornos.json']);
    expect(() => referenciasDoEsboco(e, join(dir, 'outra'))).toThrow(/o arquivo não existe/);
    expect(referenciasDoEsboco(esboco(), dir).size).toBe(0);
  });

  it('as medidas da referência dão a caixa em mm por eixo e parte, e as linhas sugeridas são um plano.medidas válido', () => {
    const dir = pasta();
    const r = gravar(dir, 'lateral.contornos.json', json('lateral'));
    const { texto, medidas } = medidasDaReferenciaArquivo(r);
    expect(medidas.vista).toBe('lateral');
    expect(texto).toContain('vista lateral: horizontal é profundidade (z), vertical é altura (y)');
    expect(texto).toContain('silhueta: profundidade 400 mm (z de 0 a 400); altura 300 mm (y de 0 a 300)');
    expect(texto).toContain('parte coluna: profundidade 100 mm (z de 300 a 400); altura 200 mm (y de 100 a 300)');
    expect(medidas.sugestoes.every((s) => s.origem === 'referencia' && s.unidade === 'mm')).toBe(true);
    expect(medidas.sugestoes.find((s) => s.nome === 'silhueta.altura')).toMatchObject({ valor: 300, mede: 'alturaTotal' });
    expect(medidas.sugestoes.find((s) => s.nome === 'coluna.profundidade')).toMatchObject({ valor: 100, mede: { caixa: 'z', formas: ['coluna'] } });
    /* as linhas entram no plano como estão e o gate as confere contra o esboço: o esboço igual ao contorno as cumpre */
    const plano = { medidas: medidas.sugestoes };
    expect(lerPlano(plano).medidas).toHaveLength(medidas.sugestoes.length);
    const d = medirEsboco(esboco(plano), { projecao: false });
    expect(d.divergencias).toEqual([]);
    /* de cima o vertical da referência é menos z: a faixa sai em z, de 0 a 400, e não de -400 a 0 */
    const cima = medidasDaReferenciaArquivo(gravar(dir, 'superior.contornos.json', json('superior'))).medidas;
    expect(cima.linhas[0].eixos.map((x) => `${x.eixo}:${x.de}..${x.ate}`)).toEqual(['x:-50..70', 'z:0..400']);
    expect(() => medidasDaReferenciaArquivo(r, { vista: 'isometrica' })).toThrow(/não serve à referência/);
    expect(() => medidasDaReferenciaArquivo(join(dir, 'x.png'), { vista: 'lateral' })).toThrow(/lê o JSON de contornos/);
  });

  it('com o esboço, as linhas sugeridas usam as formas que plano.referencia.partes dá a cada parte', () => {
    const dir = pasta();
    const r = gravar(dir, 'lateral.contornos.json', json('lateral'));
    const e = gravar(dir, 'm.esboco.json', esboco({ referencia: { arquivo: 'lateral.contornos.json', vista: 'lateral', partes: { coluna: ['coluna'], base: ['base', 'coluna'] } } }));
    const { medidas } = medidasDaReferenciaArquivo(r, { esboco: e });
    expect(medidas.sugestoes.find((s) => s.nome === 'base.altura').mede).toEqual({ caixa: 'y', formas: ['base', 'coluna'] });
  });

  it('formata a leitura das medidas com as linhas em JSON', () => {
    const m = medidasDaReferencia(contornos('frontal'), 'frontal');
    const t = formatarMedidasDaReferencia(m, { arquivo: 'f.json' });
    expect(t).toContain('medidas de f.json (vista frontal: horizontal é largura (x), vertical é altura (y), 1 mm por pixel):');
    expect(t).toMatch(/\{"nome":"silhueta.largura","valor":120,"unidade":"mm","origem":"referencia","tolerancia":2,"mede":"larguraTotal"\},/);
  });

  it('as flags novas levam os valores certos, e --envelope leva dois', () => {
    const a = lerArgumentos(['m.esboco.json', '--envelope', 'tanque', 'detalhe.esboco.json', '--referencia', 'r.json', '--vista', 'lateral', '--ancoras', 'a.json']);
    expect(a.alvo).toBe('m.esboco.json');
    expect([a.valor('--envelope'), a.valor('--envelope', 1), a.valor('--referencia'), a.valor('--vista'), a.valor('--ancoras')]).toEqual(['tanque', 'detalhe.esboco.json', 'r.json', 'lateral', 'a.json']);
    const b = lerArgumentos(['--medidas-da-referencia', 'c.json', 'm.esboco.json']);
    expect(b.valor('--medidas-da-referencia')).toBe('c.json');
    expect(b.alvo).toBe('m.esboco.json');
  });
});
