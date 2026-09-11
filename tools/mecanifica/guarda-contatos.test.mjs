/* guarda-contatos.test.mjs — a polaridade do veredito de contato.
 *
 * O defeito que este arquivo guarda tem duas faces, e só uma estava coberta.
 * Peça que se atravessa sem declarar já reprovava. Peça que DECLARA solda e
 * entrega espaço entre as partes passava com código zero, e foi assim que uma
 * bicicleta saiu com os balancos soltos no ar sem nada acusar. Declarar um
 * contato é prometer geometria; promessa não cumprida é defeito, não folga.
 */
import { describe, expect, it } from 'vitest';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import { pecasDoAcervo, conferirContatosDoAcervo } from './guarda-contatos.mjs';

const MOTIVO = 'as duas metades são soldadas uma na outra';

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

  it('a guarda varre o acervo e o acervo de hoje passa', async () => {
    const pecas = pecasDoAcervo();
    expect(pecas).toContain('bicicleta-quadro');
    const { reprovadas } = await conferirContatosDoAcervo(pecas);
    expect(reprovadas).toEqual([]);
  });
});
