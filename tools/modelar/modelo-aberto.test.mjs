/* modelo-aberto.test.mjs — as ferramentas de vista da empilhadeira abrindo receita de peça, e não só esboço (plano de conferência, fatia 6).
 *
 * A peça é `peca-de-prova` (tools/fixtures/acervo), que abre pelo nome como o `descrever` a abre: 5 partes, 236 faces, sem custo. O que se prova é a
 * entrada comum (esboço e receita saem na mesma estrutura), o recorte em mm (o quadro da imagem é o da caixa, em número) e as cinco ferramentas
 * lendo a receita sem adaptador. O caso do furgão realista, com o tempo, está no relato da fatia no plano. */
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { executar as conferir } from './conferir-vistas.mjs';
import { executar as casar } from './casamento-da-vista.mjs';
import { dePng, executarComModelo, imagem, paraPng } from './leitura-por-regioes.mjs';
import { executar as linhas } from './linhas-do-modelo.mjs';
import { ErroDoModelo, abrirModelo, faceNoRecorte, lerRecorte, quadroDoRecorte } from './modelo-aberto.mjs';
import { executar as rapida } from './vista-rapida.mjs';

const pasta = mkdtempSync(join(tmpdir(), 'modelo-aberto-'));
const esboco = join(pasta, 'um-cubo.esboco.json');
writeFileSync(esboco, JSON.stringify({ opcoes: [{ titulo: 'um cubo', formas: [{ id: 'bloco', op: 'cubo', args: { larg: 100, alt: 100, prof: 40 }, centro: [0, 50, 0] }] }] }));
const PECA = 'peca-de-prova';
/* o cubo central da peça de prova: x de -67 a 67 e y de -28 a uns 130 mm, na vista frontal */
const RECORTE = '-70,-30,-100,70,130,100';

describe('a entrada comum: esboço e receita saem na mesma estrutura', () => {
  it('a receita abre pelo nome e pelo caminho, e o esboço pelo arquivo, todos com paineis[0].neutro e partes', async () => {
    const porNome = await abrirModelo(PECA);
    const porCaminho = await abrirModelo('tools/fixtures/acervo/peca-de-prova/receita.js');
    const doEsboco = await abrirModelo(esboco);
    expect(porNome).toMatchObject({ origem: 'receita', nome: PECA, recusas: [], parou: null });
    expect(porCaminho.nome).toBe(PECA);
    expect(porNome.paineis).toHaveLength(1);
    expect(porNome.paineis[0].partes).toEqual(['cuboCentral', 'tuboEsquerdo', 'tuboDireito', 'tuboDeitado', 'travessa']);
    expect(porNome.paineis[0].neutro.F.size).toBe(236);
    expect(porCaminho.paineis[0].neutro.F.size).toBe(236);
    expect(doEsboco.origem).toBe('esboco');
    for (const m of [porNome, doEsboco]) {
      expect(m.paineis[0].neutro.F.size).toBeGreaterThan(0);
      expect(Array.isArray(m.paineis[0].partes)).toBe(true);
      expect(typeof m.paineis[0].titulo).toBe('string');
    }
  });

  it('a mesma receita dá a mesma malha (determinismo) e --ate-passo pára a execução no passo pedido', async () => {
    const a = await abrirModelo(PECA); const b = await abrirModelo(PECA);
    expect([...a.paineis[0].neutro.F.values()].map((f) => f.vs.join())).toEqual([...b.paineis[0].neutro.F.values()].map((f) => f.vs.join()));
    const parcial = await abrirModelo(PECA, { ateOPasso: 2 });
    expect(parcial.parou).toMatchObject({ passo: 2 });
    expect(parcial.parou.total).toBeGreaterThan(3);
    expect(parcial.paineis[0].neutro.F.size).toBeLessThan(a.paineis[0].neutro.F.size);
    await expect(abrirModelo(PECA, { ateOPasso: 9999 })).rejects.toThrow(/--ate-passo espera um passo de 0 a/);
    await expect(abrirModelo(esboco, { ateOPasso: 1 })).rejects.toThrow(/só vale para receita/);
  });

  it('o recorte em mm: seis números, caixa com volume, faces que a caixa toca e o quadro dela na câmera', () => {
    expect(lerRecorte(null)).toBeNull();
    expect(lerRecorte('10,0,0,-10,5,4')).toEqual({ min: [-10, 0, 0], max: [10, 5, 4] });
    expect(() => lerRecorte('1,2,3')).toThrow(ErroDoModelo);
    expect(() => lerRecorte('0,0,0,0,5,5')).toThrow(/volume/);
    const caixa = { min: [0, 0, 0], max: [10, 10, 10] };
    expect(faceNoRecorte([[2, 2, 2], [4, 2, 2], [4, 4, 2]], caixa)).toBe(true);
    expect(faceNoRecorte([[-5, 5, 5], [15, 5, 5], [15, 6, 5]], caixa)).toBe(true); // atravessa a caixa sem vértice dentro
    expect(faceNoRecorte([[11, 2, 2], [14, 2, 2], [14, 4, 2]], caixa)).toBe(false);
    expect(quadroDoRecorte({ min: [-70, -30, -100], max: [70, 130, 100] }, { direita: [1, 0, 0], cima: [0, 1, 0] })).toEqual({ u0: -70, u1: 70, v0: -30, v1: 130 });
  });
});

describe('vista:rapida e linhas:modelo abrem a receita e recortam', () => {
  it('a vista rápida da receita enquadra o recorte: o quadro é a caixa em mm, a largura manda os mm por px, e o sidecar diz o painel', async () => {
    const saida = join(pasta, 'rapida.png');
    const r = await rapida([PECA, '--vista=frontal', `--saida=${saida}`, '--largura=300', `--recorte=${RECORTE}`]);
    expect(r.stderr).toBe(''); expect(r.codigo).toBe(0);
    expect(r.stdout).toMatch(/^receita peca-de-prova: 5 partes, 236 faces, executada em [\d.]+ s\n300 x 343 px, 0\.47 mm por px \(recorte /);
    const lado = JSON.parse(readFileSync(`${saida}.rapida.json`, 'utf8'));
    expect(lado).toMatchObject({ formato: 'modelar.vista-rapida@1', origem: 'receita', vista: 'frontal', largura: 300, altura: 343, painel: [0, 0, 300, 343] });
    expect(lado.quadroMm.u1 - lado.quadroMm.u0).toBeCloseTo(140, 6);
    expect(lado.quadroMm.v1 - lado.quadroMm.v0).toBeCloseTo(160, 0);
    /* a peça inteira, na mesma largura, tem a escala bem maior: o recorte aproximou */
    const inteira = await rapida([PECA, '--vista=frontal', `--saida=${join(pasta, 'inteira.png')}`, '--largura=300']);
    expect(Number(/([\d.]+) mm por px/.exec(inteira.stdout)[1])).toBeGreaterThan(0.9);
    /* o recorte que não toca nada, e o passo em esboço, recusam com a mensagem */
    const longe = await rapida([PECA, '--vista=frontal', `--saida=${join(pasta, 'x.png')}`, '--recorte=5000,5000,5000,6000,6000,6000']);
    expect(longe.codigo).toBe(1); expect(longe.stderr).toMatch(/nada dentro do recorte/);
    const ruim = await rapida([PECA, '--vista=frontal', `--saida=${join(pasta, 'x.png')}`, '--recorte=1,2,3']);
    expect(ruim.codigo).toBe(2); expect(ruim.stderr).toMatch(/seis números/);
    const ate = await rapida([esboco, '--vista=frontal', `--saida=${join(pasta, 'x.png')}`, '--ate-passo=1']);
    expect(ate.codigo).toBe(2); expect(ate.stderr).toMatch(/só vale para receita/);
    const sem = await rapida(['nao-existe-peca', '--vista=frontal', `--saida=${join(pasta, 'x.png')}`]);
    expect(sem.codigo).toBe(2); expect(sem.stderr).toMatch(/não achei/);
  });

  it('o esboço segue saindo como antes: sem linha da receita e sem recorte', async () => {
    const r = await rapida([esboco, '--vista=frontal', `--saida=${join(pasta, 'esb.png')}`, '--largura=300']);
    expect(r.codigo).toBe(0);
    expect(r.stdout).toMatch(/^300 x \d+ px, [\d.]+ mm por px\ncores:/);
  });

  it('as linhas da receita saem no quadro do recorte, o mesmo da vista rápida', async () => {
    const saida = join(pasta, 'linhas.png');
    const r = await linhas([PECA, '--vista=frontal', `--saida=${saida}`, '--largura=300', `--recorte=${RECORTE}`]);
    expect(r.stderr).toBe(''); expect(r.codigo).toBe(0);
    expect(r.stdout).toMatch(/^receita peca-de-prova: 5 partes/);
    const im = dePng(readFileSync(saida));
    const lado = JSON.parse(readFileSync(`${join(pasta, 'rapida.png')}.rapida.json`, 'utf8'));
    expect(im.largura).toBe(300);
    expect(Math.abs(im.altura - lado.altura)).toBeLessThanOrEqual(1);
    const conta = /contorno (\d+), divisa (\d+), quina (\d+), dobra (\d+) px/.exec(r.stdout);
    expect(Number(conta[1]) + Number(conta[2])).toBeGreaterThan(0);
    const longe = await linhas([PECA, '--vista=frontal', `--saida=${saida}`, '--recorte=5000,5000,5000,6000,6000,6000']);
    expect(longe.codigo).toBe(1);
  });
});

describe('leitura:regioes: o painel da vista rápida e o modelo como entrada', () => {
  const referencia = join(pasta, 'ref.png');
  const im = imagem(120, 120);
  for (let y = 10; y < 110; y += 1) for (let x = 10; x < 110; x += 1) im.dados.set([226, 100, 30], (y * 120 + x) * 3);
  writeFileSync(referencia, paraPng(im));

  it('com a vista rápida ao lado, o painel e o fundo vêm dela e não do achado pelas linhas de fundo, que a peça ocupando o quadro deixa sem painel', async () => {
    const { executar } = await import('./leitura-por-regioes.mjs');
    const captura = join(pasta, 'cheia.png');
    expect((await rapida([PECA, '--vista=frontal', `--saida=${captura}`, '--largura=120', '--margem=0.01'])).codigo).toBe(0);
    const imagemDaCaptura = dePng(readFileSync(captura));
    const saida = join(pasta, 'leitura-lado');
    const r = executar([`--referencia=${referencia}`, '--caixa-ref=10,10,110,110', `--captura=${captura}`, `--saida=${saida}`]);
    expect(r.codigo).toBe(0);
    expect(r.stdout).toMatch(/^painel e fundo da vista rápida, de /);
    expect(JSON.parse(readFileSync(join(saida, 'leitura.json'), 'utf8')).painel).toEqual([0, 0, imagemDaCaptura.largura, imagemDaCaptura.altura]);
    /* --painel à mão continua mandando */
    const mao = executar([`--referencia=${referencia}`, '--caixa-ref=10,10,110,110', `--captura=${captura}`, `--saida=${join(pasta, 'leitura-mao')}`, '--painel=0,0,100,100']);
    expect(mao.stdout).not.toMatch(/vista rápida/);
  });

  it('--modelo tira a captura e as linhas da receita, no recorte, e monta a leitura num comando só', async () => {
    const saida = join(pasta, 'leitura-modelo');
    const r = await executarComModelo([`--referencia=${referencia}`, '--caixa-ref=10,10,110,110', `--modelo=${PECA}`, '--vista=frontal', `--recorte=${RECORTE}`, '--largura=120', `--saida=${saida}`]);
    expect(r.stderr).toBe(''); expect(r.codigo).toBe(0);
    expect(r.stdout).toMatch(/^receita peca-de-prova: 5 partes/);
    for (const f of ['captura.png', 'linhas.png', 'indice.png', 'folha-01.png', 'pedido.md', 'leitura.json']) expect(existsSync(join(saida, f)), f).toBe(true);
    const leitura = JSON.parse(readFileSync(join(saida, 'leitura.json'), 'utf8'));
    expect(leitura.painel).toEqual([0, 0, 120, leitura.painel[3]]);
    expect(readFileSync(join(saida, 'pedido.md'), 'utf8')).toMatch(/LINHAS|linhas/);
    expect((await executarComModelo([`--referencia=${referencia}`, '--caixa-ref=10,10,110,110', `--modelo=${PECA}`, `--saida=${saida}`])).stderr).toMatch(/falta --vista/);
    expect((await executarComModelo([`--referencia=${referencia}`, '--caixa-ref=10,10,110,110', `--modelo=${PECA}`, '--vista=frontal', `--captura=${join(saida, 'captura.png')}`, `--saida=${saida}`])).stderr).toMatch(/se contradizem/);
  });
});

describe('casamento:vista e conferir:vistas abrem a receita', () => {
  const ref = join(pasta, 'ref-duas-cores.png');
  const im = imagem(100, 260);
  for (let y = 5; y < 255; y += 1) for (let x = 5; x < 95; x += 1) im.dados.set(y < 125 ? [226, 100, 30] : [107, 112, 116], (y * 100 + x) * 3);
  writeFileSync(ref, paraPng(im));
  const partes = 'cuboCentral:laranja,tuboEsquerdo:cinza,tuboDireito:cinza,tuboDeitado:cinza,travessa:cinza';

  it('o casamento da vista mede a receita pelo nome das partes dela', async () => {
    const saida = join(pasta, 'casamento');
    const r = await casar([PECA, '--vista=frontal', `--referencia=${ref}`, '--caixa-ref=5,5,95,255', '--cores=laranja:#e2641e,cinza:#6b7074', `--partes=${partes}`, '--largura=100', `--saida=${saida}`]);
    expect(r.stderr).toBe(''); expect(r.codigo).toBe(0);
    expect(r.stdout).toMatch(/^receita peca-de-prova: 5 partes/);
    expect(existsSync(join(saida, 'casamento.json'))).toBe(true);
    const sem = await casar([PECA, '--vista=frontal', `--referencia=${ref}`, '--caixa-ref=5,5,95,255', '--cores=laranja:#e2641e,cinza:#6b7074', `--partes=${partes}`, '--largura=100', '--opcao=2']);
    expect(sem.codigo).toBe(2); expect(sem.stderr).toMatch(/a receita tem uma opção só/);
  });

  it('a rodada de conferência monta a receita uma vez e usa a vista rápida; a bancada lado a lado é do esboço e recusa', async () => {
    const config = join(pasta, 'config.json');
    writeFileSync(config, JSON.stringify({
      objeto: 'peça de prova', cores: { laranja: '#e2641e', cinza: '#6b7074' }, partes: Object.fromEntries(partes.split(',').map((p) => p.split(':'))), largura: 100, tresQuartos: false,
      vistas: { frontal: { referencia: 'ref-duas-cores.png', caixaRef: [5, 5, 95, 255], grade: [2, 2], visto: 'de frente' } },
    }));
    const saida = join(pasta, 'rodada');
    const r = await conferir([PECA, `--config=${config}`, `--saida=${saida}`]);
    expect(r.stderr).toBe(''); expect(r.codigo).toBe(0);
    const resumo = JSON.parse(readFileSync(join(saida, 'resumo.json'), 'utf8'));
    expect(resumo).toMatchObject({ formato: 'modelar.conferir-vistas@1', titulo: PECA, captura: 'rapida' });
    expect(resumo.vistas.frontal.captura).toMatchObject({ feita: true, origem: 'rapida' });
    expect(existsSync(join(saida, 'frontal', 'captura.png'))).toBe(true);
    const bancada = await conferir([PECA, `--config=${config}`, `--saida=${join(pasta, 'rodada-b')}`, '--captura=bancada']);
    expect(bancada.codigo).toBe(2); expect(bancada.stderr).toMatch(/não abre receita de peça/);
    const falta = await conferir(['nao-existe-peca', `--config=${config}`, `--saida=${join(pasta, 'rodada-c')}`]);
    expect(falta.codigo).toBe(2); expect(falta.stderr).toMatch(/não existe/);
  });
});
