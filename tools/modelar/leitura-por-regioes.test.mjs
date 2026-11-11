/* leitura-por-regioes.test.mjs — a leitura por regiões: a captura alinhada à caixa da referência, a grade que cobre a vista inteira, as
   folhas iguais a cada execução e a rodada recusada quando alguma região fica sem resposta. */
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  FUNDO_DO_PAINEL, acharPainel, caixaDoObjeto, conferirRespostas, executar, imagem, mesmoTexto, montarLeitura, palavras, paraPng, pedido, regioesDaGrade,
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

  describe('a diferença em campos e a contradição entre rodadas', () => {
    const regioes = regioesDaGrade(800, 480, [2, 2]);
    const dif = (tipo, atributo, referencia, modelo = 'outro', onde = 'embaixo') => ({ tipo, onde, atributo, referencia, modelo });
    const resto = { A2: { igual: true }, B1: { igual: true }, B2: { igual: true } };

    it('aceita a diferença em objeto, conta por tipo e ao lado da frase antiga', () => {
      const r = conferirRespostas(regioes, { regioes: { ...resto, A1: { diferencas: [dif('forma', 'canto do vão', 'redondo'), 'detalhe: embaixo, falta o friso', dif('detalhe', 'friso', 'duplo')] } } });
      expect(r).toEqual({ recusas: [], iguais: ['A2', 'B1', 'B2'], comDiferenca: ['A1'], diferencas: 3, porTipo: { forma: 1, detalhe: 2 } });
    });

    it('recusa o objeto com campo que falta, vazio, longo, a mais ou com tipo errado, dizendo a região e o campo', () => {
      const recusa = (d) => conferirRespostas(regioes, { regioes: { ...resto, A1: { diferencas: ['forma: em cima, ok', d] } } }).recusas;
      const { modelo, ...semModelo } = dif('forma', 'canto', 'vivo');
      expect(modelo).toBe('outro');
      expect(recusa(semModelo)).toEqual(['a região A1, diferença 2: falta o campo "modelo"']);
      expect(recusa(dif('volume', 'canto', 'vivo'))).toEqual(['a região A1, diferença 2: o campo "tipo" vale "volume" e precisa ser "forma" ou "detalhe"']);
      expect(recusa(dif('forma', '  ', 'vivo'))).toEqual(['a região A1, diferença 2: o campo "atributo" precisa ser texto não vazio']);
      expect(recusa(dif('forma', 'canto', 'v'.repeat(81)))).toEqual(['a região A1, diferença 2: o campo "referencia" passa de 80 caracteres']);
      expect(recusa({ ...dif('forma', 'canto', 'vivo'), nota: 'x' })).toEqual(['a região A1, diferença 2: o campo "nota" não é do formato (tipo, onde, atributo, referencia, modelo)']);
      expect(conferirRespostas(regioes, { regioes: { ...resto, A1: { igual: true } }, decididas: { A1: [{ atributo: 'canto', vale: '' }] } }).recusas)
        .toEqual(['"decididas" da região A1, item 1: o campo "vale" precisa ser texto não vazio']);
    });

    it('a regra de comparação ignora caixa, acento, pontuação e artigo, e não conhece sinônimo', () => {
      expect([...palavras('O Canto de baixo, à esquerda, do Laranja')]).toEqual(['canto', 'baixo', 'esquerda', 'laranja']);
      expect(mesmoTexto('canto de baixo do laranja', 'O CANTO DE BAIXO DO LARANJA')).toBe(true);
      expect(mesmoTexto('abaulado', 'Abaulado.')).toBe(true);
      expect(mesmoTexto('canto inferior do laranja', 'canto de baixo do laranja')).toBe(false);
      expect(mesmoTexto('do', 'da')).toBe(false);
    });

    /* um pacote de leitura de verdade, na grade 4x3 da traseira, para registrar rodadas pelo comando */
    function pacote() {
      const pasta = mkdtempSync(join(tmpdir(), 'leitura-contra-'));
      writeFileSync(join(pasta, 'ref.png'), paraPng(referencia())); writeFileSync(join(pasta, 'cap.png'), paraPng(captura()));
      expect(executar([`--referencia=${join(pasta, 'ref.png')}`, '--caixa-ref=30,20,130,80', `--captura=${join(pasta, 'cap.png')}`, `--saida=${join(pasta, 'l')}`, '--grade=4x3']).codigo).toBe(0);
      const nomes = JSON.parse(readFileSync(join(pasta, 'l', 'leitura.json'), 'utf8')).regioes.map((x) => x.nome);
      let n = 0;
      const registrar = (porRegiao, extra = {}) => {
        n += 1;
        const arq = join(pasta, `r${n}.json`);
        writeFileSync(arq, JSON.stringify({ regioes: Object.fromEntries(nomes.map((x) => [x, porRegiao[x] ?? { igual: true }])), ...extra }));
        const r = executar([`--saida=${join(pasta, 'l')}`, `--registrar=${arq}`]);
        expect(r.codigo, r.stderr).toBe(0);
        return { ...r, rodada: JSON.parse(readFileSync(join(pasta, 'l', 'rodadas', `rodada-${String(n).padStart(2, '0')}.json`), 'utf8')) };
      };
      return { registrar };
    }

    /* a região B1 das duas rodadas guardadas da traseira (banco-de-provas/empilhadeira-2026-11-09/leitura-traseira), passada a campos
       aqui e só aqui: na rodada 1 o canto de baixo do laranja era vivo na referência, na rodada 2 abaulado. A frase da moldura do vão
       na rodada 2 não diz como o rascunho é; o campo "modelo" leva o que ela deixa implícito. */
    const B1_RODADA_1 = [
      { tipo: 'forma', onde: 'em cima, à direita', atributo: 'borda do vão', referencia: 'laranja arredondada', modelo: 'recorte anguloso com moldura cinza grossa' },
      { tipo: 'forma', onde: 'embaixo', atributo: 'canto de baixo do laranja', referencia: 'vivo, sobre a faixa cinza', modelo: 'bem redondo' },
      { tipo: 'forma', onde: 'embaixo', atributo: 'ponta da faixa cinza', referencia: 'reta, com friso duplo e rebaixo retangular', modelo: 'redonda, descendo em curva côncava' },
    ];
    const B1_RODADA_2 = [
      { tipo: 'forma', onde: 'à esquerda', atributo: 'canto de baixo do laranja', referencia: 'abaulado', modelo: 'vivo' },
      { tipo: 'detalhe', onde: 'em cima, à direita', atributo: 'moldura do vão', referencia: 'recesso arredondado com friso', modelo: 'lisa' },
      { tipo: 'detalhe', onde: 'embaixo', atributo: 'botão da faixa cinza', referencia: 'em relevo', modelo: 'quadrado quase sem relevo' },
    ];

    it('o caso da traseira: o registro da segunda rodada acusa a contradição do canto de baixo do laranja, grava e diz na próxima ação', () => {
      const { registrar } = pacote();
      const um = registrar({ B1: { diferencas: B1_RODADA_1 } });
      expect(um.rodada.contradicoes).toEqual([]);
      expect(um.stdout).toContain('3 de forma e 0 de detalhe; 3 em campos e 0 em frase');
      expect(um.stdout).toContain('  B1: forma: embaixo, canto de baixo do laranja: vivo, sobre a faixa cinza na referência, bem redondo no rascunho');
      const dois = registrar({ B1: { diferencas: B1_RODADA_2 }, C1: { diferencas: ['forma: embaixo, a sapata é mais larga'] } });
      expect(dois.rodada.contradicoes).toEqual([{ regiao: 'B1', atributo: 'canto de baixo do laranja', antes: 'vivo, sobre a faixa cinza', agora: 'abaulado', rodadaAnterior: 1 }]);
      expect(dois.rodada).toMatchObject({ estruturadas: 3, emFrase: 1, porTipo: { forma: 2, detalhe: 2 } });
      expect(dois.stdout).toContain('3 em campos e 1 em frase');
      expect(dois.stdout).toContain('contradições com rodadas anteriores sobre a referência: 1\n  B1 (folha-02.png), canto de baixo do laranja: a rodada 1 disse "vivo, sobre a faixa cinza" da referência e esta diz "abaulado"');
      expect(dois.stdout).toMatch(/próxima ação: antes de corrigir, olhe a folha de cada região com contradição \(B1 na folha-02\.png\) e decida qual das duas leituras da referência vale, registrando .*"decididas"/);
    });

    it('a mesma leitura repetida não é contradição, e atributos diferentes na mesma região não se cruzam', () => {
      const { registrar } = pacote();
      registrar({ A1: { diferencas: [dif('forma', 'canto de baixo do laranja', 'vivo'), dif('forma', 'borda do vão', 'redonda')] } });
      const r = registrar({ A1: { diferencas: [dif('forma', 'O Canto de Baixo, do laranja', 'Vivo.', 'redondo'), dif('forma', 'moldura do vão', 'reta')] } });
      expect(r.rodada.contradicoes).toEqual([]);
      expect(r.stdout).not.toContain('contradições');
      expect(r.stdout).not.toContain('antes de corrigir');
      /* a mesma coisa em outra região também não cruza */
      expect(registrar({ A2: { diferencas: [dif('forma', 'canto de baixo do laranja', 'abaulado')] } }).rodada.contradicoes).toEqual([]);
    });

    it('a contradição decidida não volta, nem na rodada seguinte à decisão', () => {
      const { registrar } = pacote();
      registrar({ B1: { diferencas: B1_RODADA_1 } });
      expect(registrar({ B1: { diferencas: B1_RODADA_2 } }).rodada.contradicoes).toHaveLength(1);
      const decidida = { B1: [{ atributo: 'canto de baixo do laranja', vale: 'abaulado', motivo: 'na folha 02 o canto é abaulado' }] };
      const tres = registrar({ B1: { diferencas: [dif('forma', 'canto de baixo do laranja', 'vivo')] } }, { decididas: decidida });
      expect(tres.rodada.contradicoes).toEqual([]);
      expect(tres.rodada.decididas).toEqual(decidida);
      expect(registrar({ B1: { diferencas: [dif('forma', 'canto de baixo do laranja', 'abaulado')] } }).rodada.contradicoes).toEqual([]);
      /* pela frase de "aceitas" que cita o atributo, também */
      const outro = pacote();
      outro.registrar({ B1: { diferencas: [dif('forma', 'ponta da faixa cinza', 'reta')] } });
      expect(outro.registrar({ B1: { diferencas: [dif('forma', 'ponta da faixa cinza', 'redonda')] } }, { aceitas: { B1: ['a ponta da faixa cinza é reta: vale a folha 02'] } }).rodada.contradicoes).toEqual([]);
    });

    it('a frase antiga continua aceita e não entra na comparação', () => {
      const { registrar } = pacote();
      registrar({ B1: { diferencas: ['forma: embaixo, o canto de baixo do laranja é vivo na referência'] } });
      const r = registrar({ B1: { diferencas: [dif('forma', 'canto de baixo do laranja', 'abaulado')] } });
      expect(r.rodada.contradicoes).toEqual([]);
      expect(r.stdout).toContain('1 em campos e 0 em frase');
    });

    it('o pedido traz o exemplo do objeto e diz por que referência e modelo vão separados', () => {
      const p = pedido({ pasta: '/p', regioes, folhas: 2 });
      expect(p).toContain('{ "tipo": "forma", "onde": "em cima, à direita", "atributo": "canto do vão", "referencia": "redondo", "modelo": "chanfrado" }');
      expect(p).toContain('`referencia` e `modelo` vão separados porque a referência não muda de uma rodada para a outra');
      expect(p).toContain('cada um com até 80 caracteres');
    });
  });
});
