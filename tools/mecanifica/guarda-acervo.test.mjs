/* guarda-acervo.test.mjs — a polaridade do veredito de contato.
 *
 * O defeito que este arquivo guarda tem duas faces, e só uma estava coberta.
 * Peça que se atravessa sem declarar já reprovava. Peça que DECLARA solda e
 * entrega espaço entre as partes passava com código zero, e foi assim que uma
 * bicicleta saiu com os balancos soltos no ar sem nada acusar. Declarar um
 * contato é prometer geometria; promessa não cumprida é defeito, não folga.
 */
import { rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { pecasDoAcervo, conferirAcervo } from './guarda-acervo.mjs';

const MOTIVO = 'as duas metades são soldadas uma na outra';
const ACERVO = resolve(fileURLToPath(new URL('../..', import.meta.url)), 'prototipos/procedural/v3/pecas');

/* Dois cubos no eixo x, com a distância entre eles como parâmetro: em 0.4 eles
   se encostam, em 3 há um vão de um metro. */
function duasPartes({ distancia, contatos }) {
  return {
    default: {
      meta: { nome: 'par de ensaio' },
      PASSOS: [
        ['cubo', { origemId: 10, larg: 0.4, alt: 0.4, prof: 0.4 }],
        ['cubo', { origemId: 20, larg: 0.4, alt: 0.4, prof: 0.4, em: [distancia, 0, 0] }],
        ['parte', { nome: 'esquerda', sel: { origem: { op: 'cubo', id: 10 } } }],
        ['parte', { nome: 'direita', sel: { origem: { op: 'cubo', id: 20 } } }],
      ],
      ...(contatos ? { contatos } : {}),
    },
  };
}

const medir = (modulo) => descreverPecaReutilizavel({ peca: 'par-de-ensaio', modulo });

describe('veredito de contato do acervo', () => {
  it('REPROVA contato declarado que não acontece, e nomeia o par', async () => {
    const medida = await medir(duasPartes({
      distancia: 3,
      contatos: [{ par: ['esquerda', 'direita'], motivo: MOTIVO }],
    }));
    expect(medida.ok).toBe(false);
    expect(medida.codigo).toBe(1);
    expect(medida.stderr).toMatch(/DECLARADO\(S\) QUE NÃO ACONTECEM/);
    expect(medida.stderr).toMatch(/direita ↔ esquerda/);
  });

  it('APROVA o mesmo par quando a geometria cumpre a declaração', async () => {
    const medida = await medir(duasPartes({
      distancia: 0.4,
      contatos: [{ par: ['esquerda', 'direita'], motivo: MOTIVO }],
    }));
    expect(medida.ok).toBe(true);
    expect(medida.resultado.contatos.declaradosSemContato).toEqual([]);
  });

  it('continua reprovando contato que acontece sem ter sido declarado', async () => {
    const medida = await medir(duasPartes({ distancia: 0.4, contatos: null }));
    expect(medida.ok).toBe(false);
    expect(medida.stderr).toMatch(/NÃO DECLARADO/);
  });

  it('REPROVA parte prometida no plano e não entregue pela peça', async () => {
    const modulo = duasPartes({ distancia: 0.4, contatos: [{ par: ['esquerda', 'direita'], motivo: MOTIVO }] });
    modulo.default.PLANO = {
      objeto: 'par de ensaio com tres partes prometidas',
      referencias: ['docs/mecanifica/referencias/README.md'],
      escala: { medida: 'lado do cubo', milimetros: 400 },
      partes: [
        { nome: 'esquerda', forma: 'cubo de quatrocentos milimetros de lado', tecnica: 'cubo' },
        { nome: 'direita', forma: 'cubo de quatrocentos milimetros de lado', tecnica: 'cubo' },
        { nome: 'meio', forma: 'cubo que deveria existir entre os dois outros', tecnica: 'cubo' },
      ],
      criteriosDeReprovacao: ['alguma das tres partes ausente da peça'],
    };
    const medida = await medir(modulo);
    expect(medida.ok).toBe(false);
    expect(medida.stderr).toMatch(/PROMETIDA\(S\) E NÃO ENTREGUE/);
    expect(medida.stderr).toMatch(/meio/);
  });

  it('REPROVA parte entregue que o plano não prometeu', async () => {
    const modulo = duasPartes({ distancia: 0.4, contatos: [{ par: ['esquerda', 'direita'], motivo: MOTIVO }] });
    modulo.default.PLANO = {
      objeto: 'par de ensaio com uma parte prometida a menos',
      referencias: ['docs/mecanifica/referencias/README.md'],
      escala: { medida: 'lado do cubo', milimetros: 400 },
      partes: [{ nome: 'esquerda', forma: 'cubo de quatrocentos milimetros de lado', tecnica: 'cubo' }],
      criteriosDeReprovacao: ['peça com parte que o plano não descreve'],
    };
    const medida = await medir(modulo);
    expect(medida.ok).toBe(false);
    expect(medida.stderr).toMatch(/SEM PROMESSA/);
    expect(medida.stderr).toMatch(/direita/);
  });

  it('peça de ensaio sem plano continua mensurável; o acervo é que exige plano', async () => {
    const medida = await medir(duasPartes({
      distancia: 0.4, contatos: [{ par: ['esquerda', 'direita'], motivo: MOTIVO }],
    }));
    expect(medida.ok).toBe(true);
    expect(medida.resultado.plano).toBe(null);

    const { reprovadas } = await conferirAcervo(['bicicleta-quadro']);
    expect(reprovadas).toEqual([]);
  });

  it('REPROVA peça do acervo que não exporta plano nenhum', async () => {
    /* A peça é escrita no acervo de verdade e apagada depois: a guarda mede o
       que está na pasta, e provar isso com um dublê mediria outra coisa. */
    const nome = 'ensaio-sem-plano-temporario';
    const caminho = join(ACERVO, `${nome}.js`);
    writeFileSync(caminho, 'export default { meta: { nome: "ensaio" }, '
      + 'PASSOS: [["cubo", { origemId: 10, larg: 0.4, alt: 0.4, prof: 0.4 }], '
      + '["parte", { nome: "unica", sel: { origem: { op: "cubo", id: 10 } } }]] };\n', 'utf8');
    try {
      expect(pecasDoAcervo()).toContain(nome);
      const { reprovadas } = await conferirAcervo([nome]);
      expect(reprovadas).toHaveLength(1);
      expect(reprovadas[0].motivo).toMatch(/SEM PLANO DE MODELAGEM/);
    } finally {
      rmSync(caminho, { force: true });
    }
    expect(pecasDoAcervo()).not.toContain(nome);
  });

  it('a guarda varre o acervo e o acervo de hoje passa', async () => {
    const pecas = pecasDoAcervo();
    expect(pecas).toContain('bicicleta-quadro');
    const { reprovadas } = await conferirAcervo(pecas);
    expect(reprovadas).toEqual([]);
  });
});
