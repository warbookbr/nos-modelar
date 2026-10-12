/* De que lado cada vista olha (atritos 12, 21, 31 e 33 do avião): o texto do brief com o eixo e, com `plano.orientacao`, com as
   palavras do objeto; as vistas de outros lados (frontal-oposta, lateral-oposta, inferior) e a unidade que as pede em `vistas`;
   o enquadramento por lista de formas (atrito 9). Tudo sem navegador: o texto e a projeção são medidos nos números. */
import { describe, expect, it } from 'vitest';
import { desenharEsboco, ErroDeEsboco, VISTAS, VISTAS_EXTRAS, VISTAS_TODAS, lerEnquadrar } from '../src/index.js';
import { expandirEsboco } from '../src/expandir.js';
import { ladosDasVistas, lerOrientacao, linhaDaVista } from '../src/lados.js';
import { lerPlano } from '../src/plano.js';

const caixa = (id, centro, extra = {}) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro, ...extra });
const AVIAO = { frente: '-z', nomeDaFrente: 'a proa', nomeDeTras: 'a cauda' };

describe('as vistas de outros lados', () => {
  it('cada uma olha do lado oposto de uma das três de sempre, e é a imagem espelhada dela', () => {
    const par = { 'frontal-oposta': 'frontal', 'lateral-oposta': 'lateral', inferior: 'superior' };
    for (const [extra, base] of Object.entries(par)) {
      expect(VISTAS_EXTRAS[extra].olho).toEqual(VISTAS[base].olho.map((c) => 0 - c || 0));
    }
    /* o ponto em +x sai à direita na frontal e à esquerda na oposta; o em +z, à esquerda na lateral e à direita na oposta; o em -z fica
       em cima na superior e embaixo na inferior */
    expect(VISTAS.frontal.p([100, 0, 0])[0]).toBe(100);
    expect(VISTAS_EXTRAS['frontal-oposta'].p([100, 0, 0])[0]).toBe(-100);
    expect(VISTAS.lateral.p([0, 0, 100])[0]).toBe(-100);
    expect(VISTAS_EXTRAS['lateral-oposta'].p([0, 0, 100])[0]).toBe(100);
    expect(VISTAS.superior.p([0, 0, -100])[1]).toBe(-100);
    expect(VISTAS_EXTRAS.inferior.p([0, 0, -100])[1]).toBe(100);
    /* a altura segue para cima nas duas vistas de lado: y positivo é y negativo na tela */
    expect(VISTAS_EXTRAS['frontal-oposta'].p([0, 50, 0])[1]).toBe(-50);
    expect(VISTAS_EXTRAS['lateral-oposta'].p([0, 50, 0])[1]).toBe(-50);
  });

  it('a imagem de cada uma é destra: direita x cima aponta para o olho, como nas quatro de sempre', () => {
    const tela = (v, e) => VISTAS_TODAS[v].p(e);
    for (const [nome, { olho }] of Object.entries(VISTAS_EXTRAS)) {
      /* os vetores do mundo que caem em "para a direita" e "para cima" da tela: o produto vetorial deles tem de ser o do olho */
      const eixos = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
      const direita = eixos.map((e) => [e, tela(nome, e)]).find(([, t]) => Math.abs(t[0]) === 1 && t[1] === 0);
      const cima = eixos.map((e) => [e, tela(nome, e)]).find(([, t]) => t[0] === 0 && Math.abs(t[1]) === 1);
      const d = direita[0].map((c) => c * direita[1][0]);
      const c = cima[0].map((x) => x * -cima[1][1]);
      const vet = [d[1] * c[2] - d[2] * c[1], d[2] * c[0] - d[0] * c[2], d[0] * c[1] - d[1] * c[0]];
      expect(vet, nome).toEqual(olho);
    }
  });

  it('a vista extra desenha, e as quatro de sempre continuam sendo as que a análise percorre', () => {
    expect(Object.keys(VISTAS)).toEqual(['isometrica', 'frontal', 'lateral', 'superior']);
    for (const vista of Object.keys(VISTAS_EXTRAS)) {
      const r = desenharEsboco({ vista, opcoes: [{ titulo: 'T', formas: [caixa('a', [0, 0, 0])] }] });
      expect(r.svg).toContain('<svg');
    }
    expect(() => desenharEsboco({ vista: 'de-baixo', opcoes: [{ titulo: 'T', formas: [caixa('a', [0, 0, 0])] }] })).toThrow(/"vista" deve ser uma de .*inferior/);
  });
});

describe('o texto de que lado cada vista olha', () => {
  it('sem orientação diz o eixo de onde olha e onde caem os eixos na imagem', () => {
    expect(linhaDaVista('frontal')).toBe('frontal: olha de +z; +x fica à direita, +y fica em cima');
    expect(linhaDaVista('lateral')).toBe('lateral: olha de +x; +y fica em cima, +z fica à esquerda');
    expect(linhaDaVista('superior')).toBe('superior: olha de +y; +x fica à direita, +z fica embaixo');
    expect(linhaDaVista('isometrica')).toBe('isometrica: olha de [1, 1, 1], do lado positivo de x, de y e de z; +x desce para a direita, +y fica em cima, +z desce para a esquerda');
    expect(linhaDaVista('inferior')).toBe('inferior: olha de -y; +x fica à direita, +z fica em cima');
  });

  it('com a proa em -z, a frontal vê a cauda e a lateral tem a proa à direita (o caso do leme "à frente" da deriva)', () => {
    const o = lerOrientacao(AVIAO);
    expect(linhaDaVista('frontal', o)).toBe('frontal: olha de +z e vê a cauda; a proa (-z) fica longe do olho, atrás do objeto; o lado direito (+x) fica à direita da imagem');
    expect(linhaDaVista('lateral', o)).toBe('lateral: olha de +x e vê o lado direito; a proa (-z) fica à direita da imagem');
    expect(linhaDaVista('superior', o)).toContain('a proa (-z) fica em cima da imagem');
    expect(linhaDaVista('isometrica', o)).toContain('e vê o lado de cima, o lado direito e a cauda');
    expect(linhaDaVista('frontal-oposta', o)).toBe('frontal-oposta: olha de -z e vê a proa; a proa (-z) fica voltada para o olho; o lado direito (+x) fica à esquerda da imagem');
    expect(linhaDaVista('lateral-oposta', o)).toContain('olha de -x e vê o lado esquerdo');
    expect(linhaDaVista('inferior', o)).toContain('vê o lado de baixo');
  });

  it('o lado direito sai da frente e de y para cima: com a frente em +z, a direita é -x', () => {
    const o = lerOrientacao({ frente: '+z' });
    expect(linhaDaVista('frontal', o)).toContain('vê a frente');
    expect(linhaDaVista('frontal', o)).toContain('o lado direito (-x) fica à esquerda da imagem');
    expect(linhaDaVista('lateral', lerOrientacao({ frente: '+x' }))).toContain('olha de +x e vê a frente');
    expect(linhaDaVista('lateral', lerOrientacao({ frente: '+x' }))).toContain('o lado direito (+z) fica à esquerda da imagem');
  });

  it('o bloco abre com a explicação, lista as quatro e diz o que elas não olham', () => {
    const L = ladosDasVistas();
    expect(L[0]).toMatch(/^De que lado cada vista olha .*"olha de \+z" quer dizer/);
    expect(L.slice(1, 5).map((l) => l.trim().split(':')[0])).toEqual(['isometrica', 'frontal', 'lateral', 'superior']);
    expect(L.at(-1)).toMatch(/só olham dos lados positivos .*O que está voltado para -x, -y e -z só aparece nas vistas a mais/);
    const palavras = ladosDasVistas({ orientacao: lerOrientacao(AVIAO) }).at(-1);
    expect(palavras).toContain('-x (o lado esquerdo), -y (o lado de baixo) e -z (a proa)');
  });

  it('com as vistas a mais, elas entram no bloco e saem da lista do que continua sem vista', () => {
    const L = ladosDasVistas({ orientacao: lerOrientacao(AVIAO), extras: ['frontal-oposta', 'inferior'] });
    expect(L.map((l) => l.trim().split(':')[0]).slice(1, 7)).toEqual(['isometrica', 'frontal', 'lateral', 'superior', 'frontal-oposta', 'inferior']);
    expect(L.at(-1)).toContain('-x (o lado esquerdo) continua sem vista, só nos cortes');
    expect(L.at(-1)).not.toContain('-z');
    const todas = ladosDasVistas({ extras: ['frontal-oposta', 'lateral-oposta', 'inferior'] }).at(-1);
    expect(todas).not.toMatch(/continua sem vista/);
    expect(() => ladosDasVistas({ extras: ['de-lado'] })).toThrow(/vista a mais "de-lado" desconhecida/);
  });
});

describe('plano.orientacao', () => {
  it('é lido no plano, com os nomes de reserva "a frente" e "a traseira"', () => {
    expect(lerPlano({ texto: 'x', orientacao: AVIAO }).orientacao).toEqual(AVIAO);
    expect(lerPlano({ texto: 'x', orientacao: { frente: '-x' } }).orientacao).toEqual({ frente: '-x', nomeDaFrente: 'a frente', nomeDeTras: 'a traseira' });
    expect(lerPlano({ texto: 'x' }).orientacao).toBeUndefined();
  });

  it('recusa a frente que não é um eixo horizontal, o campo que não existe e o nome vazio', () => {
    expect(() => lerPlano({ orientacao: { frente: '+y' } })).toThrow(/"frente" com o valor "\+y".*um de \+x, -x, \+z, -z.*Exemplo/);
    expect(() => lerPlano({ orientacao: { frente: '-z', proa: 'a proa' } })).toThrow(/o campo "proa" não existe/);
    expect(() => lerPlano({ orientacao: { frente: '-z', nomeDaFrente: ' ' } })).toThrow(/"nomeDaFrente" deve ser o nome com o artigo/);
    expect(() => lerPlano({ orientacao: 'z' })).toThrow(ErroDeEsboco);
  });
});

describe('unidades.<id>.vistas', () => {
  const com = (vistas) => ({ unidades: { u: { vistas } }, opcoes: [{ titulo: 'T', formas: [caixa('a', [0, 0, 0], { unidade: 'u' })] }] });

  it('aceita as vistas de outros lados', () => {
    expect(() => expandirEsboco(com(['inferior', 'frontal-oposta']))).not.toThrow();
  });

  it('recusa a vista de sempre, a repetida, a vazia e o nome parecido, dizendo as que existem', () => {
    expect(() => expandirEsboco(com(['frontal']))).toThrow(/unidades\.u: "vistas" deve ser uma lista.*frontal-oposta, lateral-oposta, inferior/);
    expect(() => expandirEsboco(com(['inferior', 'inferior']))).toThrow(/sem repetir/);
    expect(() => expandirEsboco(com([]))).toThrow(/"vistas" deve ser uma lista/);
    expect(() => expandirEsboco(com(['inferor']))).toThrow(/quis dizer "inferior"/);
  });
});

describe('o enquadramento por lista de formas', () => {
  const esboco = (enquadrar) => ({
    vista: 'frontal',
    opcoes: [{ titulo: 'T', nota: 'a nota da opção', formas: [caixa('a', [0, 0, 0]), caixa('b', [100, 0, 0]), { ...caixa('longe', [5000, 0, 0]), largura: 4000 }] }],
    ...(enquadrar ? { enquadrar } : {}),
  });

  it('aceita uma lista e `aviso: false`, e recusa a lista vazia ou com o que não é nome', () => {
    expect(lerEnquadrar({ formas: ['a', 'b'], aviso: false })).toEqual({ formas: ['a', 'b'], aviso: false });
    expect(lerEnquadrar({ formas: 'a' })).toEqual({ formas: 'a' });
    expect(() => lerEnquadrar({ formas: [] })).toThrow(/"enquadrar" deve ser/);
    expect(() => lerEnquadrar({ formas: ['a', 3] })).toThrow(/"enquadrar" deve ser/);
    expect(() => lerEnquadrar({ formas: 'a', aviso: 'não' })).toThrow(/"aviso" de "enquadrar"/);
  });

  it('o quadro fecha na união das formas da lista: a escala sobe quando a forma grande fica fora', () => {
    const inteiro = desenharEsboco(esboco());
    const cortado = desenharEsboco(esboco({ formas: ['a', 'b'], aviso: false }));
    expect(cortado.escala / inteiro.escala).toBeGreaterThan(10);
    /* a mesma lista por um padrão dá o mesmo quadro */
    expect(desenharEsboco(esboco({ formas: ['a', 'b'] })).escala).toBeCloseTo(cortado.escala, 6);
  });

  it('`aviso: false` tira o "zoom em ..." do subtítulo e o quadro tracejado; sem ele os dois ficam', () => {
    const com = desenharEsboco(esboco({ formas: ['a', 'b'] })).svg;
    const sem = desenharEsboco(esboco({ formas: ['a', 'b'], aviso: false })).svg;
    expect(com).toContain('zoom em a, b');
    expect(com).toContain('stroke-dasharray="4,3"');
    expect(sem).not.toContain('zoom em');
    expect(sem).not.toContain('stroke-dasharray="4,3"');
  });

  it('o nome que não existe continua recusado, com o nome na mensagem', () => {
    expect(() => desenharEsboco(esboco({ formas: ['nada'] }))).toThrow(/"enquadrar": "nada" não é uma forma visível/);
  });
});
