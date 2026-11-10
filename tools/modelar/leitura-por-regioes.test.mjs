/* leitura-por-regioes.test.mjs — a leitura por regiões: a captura alinhada à caixa da referência, a grade que cobre a vista inteira, as
   folhas iguais a cada execução e a rodada recusada quando alguma região fica sem resposta. */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FUNDO_DO_PAINEL, acharPainel, caixaDoObjeto, conferirRespostas, executar, imagem, montarLeitura, paraPng, pedido, regioesDaGrade,
} from './leitura-por-regioes.mjs';

const LARANJA = [226, 100, 30]; const CINZA = [90, 95, 100];
function retangulo(im, [x0, y0, x1, y1], cor) {
  for (let y = y0; y < y1; y += 1) for (let x = x0; x < x1; x += 1) { const o = (y * im.largura + x) * 3; im.dados[o] = cor[0]; im.dados[o + 1] = cor[1]; im.dados[o + 2] = cor[2]; }
}
/* a referência: um corpo laranja de 100 x 60 px em (30, 20), com um quadrado cinza de 20 px no canto de cima à direita dele */
function referencia() {
  const im = imagem(160, 100);
  retangulo(im, [30, 20, 130, 80], LARANJA); retangulo(im, [110, 20, 130, 40], CINZA);
  return im;
}
/* a captura: a folha do esboço, com o painel em (16, 46) e o mesmo corpo com o dobro do tamanho; `quadrado` muda de lugar para a prova */
function captura(quadrado = [280, 100, 320, 140]) {
  const im = imagem(480, 400, [244, 242, 238]);
  retangulo(im, [16, 46, 464, 340], FUNDO_DO_PAINEL);
  retangulo(im, [120, 100, 320, 220], LARANJA); retangulo(im, quadrado, CINZA);
  return im;
}
const corEm = (im, x, y) => [...im.dados.slice((y * im.largura + x) * 3, (y * im.largura + x) * 3 + 3)];

describe('leitura por regiões', () => {
  it('acha o painel da folha do esboço e a caixa do objeto dentro dele', () => {
    const c = captura();
    expect(acharPainel(c)).toEqual([16, 46, 464, 340]);
    expect(caixaDoObjeto(c, [16, 46, 464, 340], FUNDO_DO_PAINEL)).toEqual([120, 100, 320, 220]);
    expect(acharPainel(referencia())).toBeNull();
    expect(() => caixaDoObjeto(c, [16, 46, 100, 90], FUNDO_DO_PAINEL)).toThrow('não tem nada além do fundo');
  });

  it('a grade cobre a vista inteira, com sobreposição, e nomeia as regiões por linha e coluna', () => {
    const r = regioesDaGrade(1000, 600, [4, 3]);
    expect(r.map((x) => x.nome)).toEqual(['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4', 'C1', 'C2', 'C3', 'C4']);
    expect(r[0]).toMatchObject({ x: 0, y: 0 });
    expect(r[3].x + r[3].largura).toBe(1000);
    expect(r[11].y + r[11].altura).toBe(600);
    expect(r[1].x).toBeLessThan(r[0].x + r[0].largura);
    expect(() => regioesDaGrade(1000, 600, [0, 3])).toThrow('grade 0x3 fora do aceito');
  });

  it('leva a caixa da captura à caixa da referência: o mesmo ponto do objeto cai no mesmo lugar das duas metades da folha', () => {
    const r = montarLeitura({ referencia: referencia(), captura: captura(), caixaRef: [30, 20, 130, 80], grade: [2, 2], margem: 5 });
    expect(r.painel).toEqual([16, 46, 464, 340]);
    expect(r.caixaDaCaptura).toEqual([120, 100, 320, 220]);
    expect(r.proporcao.referencia).toBeCloseTo(0.6, 6);
    expect(r.proporcao.rascunho).toBeCloseTo(0.6, 6);
    expect(r.regioes.map((x) => x.nome)).toEqual(['A1', 'A2', 'B1', 'B2']);
    /* a região A2 (em cima, à direita) traz o quadrado cinza nas duas metades, no mesmo lugar */
    const folha = r.folhas[0]; const pw = (folha.largura - 50) / 2;
    const noQuadrado = [Math.round(pw * 0.72), 10 + 40 + Math.round(((folha.altura - 10) / 3 - 50) * 0.25) + ((folha.altura - 10) / 3) * 1];
    expect(corEm(folha, 10 + noQuadrado[0], noQuadrado[1])).toEqual(CINZA);
    expect(corEm(folha, 10 + pw + 30 + noQuadrado[0], noQuadrado[1])).toEqual(CINZA);
    /* com o quadrado no lugar errado no rascunho, a mesma posição mostra laranja de um lado e cinza do outro */
    const errado = montarLeitura({ referencia: referencia(), captura: captura([120, 180, 160, 220]), caixaRef: [30, 20, 130, 80], grade: [2, 2], margem: 5 }).folhas[0];
    expect(corEm(errado, 10 + noQuadrado[0], noQuadrado[1])).toEqual(CINZA);
    expect(corEm(errado, 10 + pw + 30 + noQuadrado[0], noQuadrado[1])).toEqual(LARANJA);
  });

  it('com o desenho das linhas do modelo, cada região ganha o terceiro painel e o pedido pergunta por elas', () => {
    /* o desenho ocupa a caixa do objeto: uma linha vermelha vertical a um quarto da largura */
    const linhas = imagem(200, 120);
    retangulo(linhas, [50, 0, 52, 120], [220, 0, 40]);
    const sem = montarLeitura({ referencia: referencia(), captura: captura(), caixaRef: [30, 20, 130, 80], grade: [2, 2], margem: 5 });
    const com = montarLeitura({ referencia: referencia(), captura: captura(), caixaRef: [30, 20, 130, 80], grade: [2, 2], margem: 5, linhas });
    expect(sem.comLinhas).toBe(false); expect(com.comLinhas).toBe(true);
    const pw = (sem.folhas[0].largura - 50) / 2;
    expect(com.folhas[0].largura).toBe(3 * pw + 80);
    /* na região A1, a linha cai a (5 + 25) px da referência da borda esquerda da vista: no terceiro painel há vermelho nessa coluna */
    const x = 10 + 2 * (pw + 30) + 30 * 8 + 4; const y = 10 + 40 + 100;
    expect(corEm(com.folhas[0], x, y)).toEqual([220, 0, 40]);
    expect(pedido({ pasta: '/p', regioes: com.regioes, folhas: 2, linhas: true })).toContain('4. No painel LINHAS');
    expect(pedido({ pasta: '/p', regioes: com.regioes, folhas: 2 })).not.toContain('LINHAS');
  });

  it('a proporção do objeto inteiro sai no relato, porque cada eixo é ajustado em separado', () => {
    const largo = imagem(480, 400, FUNDO_DO_PAINEL);
    retangulo(largo, [100, 100, 340, 220], LARANJA);
    const r = montarLeitura({ referencia: referencia(), captura: largo, caixaRef: [30, 20, 130, 80], painel: [0, 0, 480, 400], grade: [2, 2] });
    expect(r.proporcao.rascunho).toBeCloseTo(0.5, 6);
    expect(() => montarLeitura({ referencia: referencia(), captura: largo, caixaRef: [30, 20, 200, 80] })).toThrow('não cabe na referência');
  });

  it('recusa a rodada em que alguma região ficou sem resposta, e conta as diferenças da que está inteira', () => {
    const regioes = regioesDaGrade(800, 480, [2, 2]);
    const falta = conferirRespostas(regioes, { regioes: { A1: { igual: true }, A2: { diferencas: [] }, B1: { igual: true, diferencas: ['forma: x'] }, Z9: { igual: true } } });
    expect(falta.recusas).toEqual(['a região "Z9" não é da grade (A1 a B2)', 'a região A2 não diz "igual": true nem lista diferenças',
      'a região B1 diz "igual": true e lista diferenças', 'a região B2 ficou sem resposta']);
    const inteira = conferirRespostas(regioes, { regioes: { A1: { igual: true }, A2: { diferencas: ['forma: em cima, a quina é viva na referência e redonda no rascunho', 'detalhe: embaixo, falta o friso'] },
      B1: { igual: true }, B2: { diferencas: ['forma: à direita, o vão é mais largo'] } }, aceitas: { B2: ['o eixo não é desta peça'] } });
    expect(inteira).toEqual({ recusas: [], iguais: ['A1', 'B1'], comDiferenca: ['A2', 'B2'], diferencas: 3, porTipo: { forma: 2, detalhe: 1 } });
    expect(conferirRespostas(regioes, { regioes: { A1: { diferencas: ['em cima: sem tipo'] }, A2: { igual: true }, B1: { igual: true }, B2: { igual: true } } }).recusas)
      .toEqual(['a região A1 tem uma diferença que não começa por "forma:" ou "detalhe:"']);
    expect(conferirRespostas(regioes, { regioes: { A1: { diferencas: ['x'.repeat(241)] }, A2: { igual: true }, B1: { igual: true }, B2: { igual: true } } }).recusas)
      .toEqual(['a região A1 tem uma diferença vazia ou com mais de 240 caracteres']);
    expect(conferirRespostas(regioes, {}).recusas).toHaveLength(1);
  });

  it('o comando grava o pacote igual a cada execução, registra a rodada e leva o aceito ao pedido seguinte', () => {
    const pasta = mkdtempSync(join(tmpdir(), 'leitura-'));
    writeFileSync(join(pasta, 'ref.png'), paraPng(referencia())); writeFileSync(join(pasta, 'cap.png'), paraPng(captura()));
    const args = [`--referencia=${join(pasta, 'ref.png')}`, '--caixa-ref=30,20,130,80', `--captura=${join(pasta, 'cap.png')}`, `--saida=${join(pasta, 'l')}`, '--grade=2x2', '--objeto=um bloco, visto de frente'];
    const a = executar(args);
    expect(a.codigo).toBe(0);
    expect(a.stdout).toContain('4 regiões em 2 folhas');
    expect(a.stdout).toContain('altura sobre largura: referência 0.600, rascunho 0.600 (+0.0%)');
    const antes = ['indice.png', 'folha-01.png', 'folha-02.png', 'pedido.md', 'leitura.json'].map((f) => readFileSync(join(pasta, 'l', f)));
    executar(args);
    ['indice.png', 'folha-01.png', 'folha-02.png', 'pedido.md', 'leitura.json'].forEach((f, i) => expect(readFileSync(join(pasta, 'l', f)).equals(antes[i]), f).toBe(true));
    expect(antes[3].toString()).toContain('(um bloco, visto de frente)');
    expect(antes[3].toString()).toContain('Para CADA região (A1 a B2)');

    writeFileSync(join(pasta, 'r.json'), JSON.stringify({ regioes: { A1: { igual: true } } }));
    const recusa = executar([`--saida=${join(pasta, 'l')}`, `--registrar=${join(pasta, 'r.json')}`]);
    expect(recusa.codigo).toBe(1);
    expect(recusa.stderr).toContain('a região A2 ficou sem resposta');
    writeFileSync(join(pasta, 'r.json'), JSON.stringify({ regioes: { A1: { igual: true }, A2: { diferencas: ['forma: em cima, o quadrado é menor'] }, B1: { igual: true }, B2: { igual: true } },
      aceitas: { A2: ['o quadrado fica para a fatia de detalhe'] } }));
    const ok = executar([`--saida=${join(pasta, 'l')}`, `--registrar=${join(pasta, 'r.json')}`]);
    expect(ok.codigo).toBe(0);
    expect(ok.stdout).toContain('rodada 1: 3 regiões iguais, 1 com diferença, 1 de forma e 0 de detalhe');
    expect(ok.stdout).toContain('  A2: forma: em cima, o quadrado é menor');
    executar(args);
    expect(readFileSync(join(pasta, 'l', 'pedido.md'), 'utf8')).toContain('- A2: o quadrado fica para a fatia de detalhe');

    expect(executar(['--saida=x']).codigo).toBe(2);
    expect(executar(['--ajuda']).stdout).toContain('npm run leitura:regioes');
    expect(pedido({ pasta: '/p', regioes: regioesDaGrade(80, 48, [2, 2]), folhas: 2 })).not.toContain('Já aceito');
    expect(pedido({ pasta: '/p', regioes: regioesDaGrade(80, 48, [2, 2]), folhas: 2, fora: 'o eixo e as rodas' })).toContain('Não é do corpo modelado, e você não cita: o eixo e as rodas.');
  });
});
