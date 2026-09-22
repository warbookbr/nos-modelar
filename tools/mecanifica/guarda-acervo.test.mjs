/* guarda-acervo.test.mjs — a polaridade do veredito de contato.
 *
 * O defeito que este arquivo guarda tem duas faces, e só uma estava coberta.
 * Peça que se atravessa sem declarar já reprovava. Peça que DECLARA solda e
 * entrega espaço entre as partes passava com código zero, e foi assim que uma
 * bicicleta saiu com os balancos soltos no ar sem nada acusar. Declarar um
 * contato é prometer geometria; promessa não cumprida é defeito, não folga.
 */
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { descreverPecaReutilizavel } from './descrever-peca.mjs';
import {
  conferirAcervo, DECLARACAO_DE_VAZIO, emArquivoSolto, pecasDoAcervo, vazioDeclarado,
} from './guarda-acervo.mjs';

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

    /* O ACERVO É LIDO, E NÃO NOMEADO. Fixar o nome de uma peça aqui faz este
       teste depender de conteúdo: o dia em que essa peça sair do acervo, o teste
       quebra por um motivo que nada tem a ver com o que ele afirma. */
    const { reprovadas } = await conferirAcervo(pecasDoAcervo());
    expect(reprovadas).toEqual([]);
  });

  it('REPROVA peça do acervo que não exporta plano nenhum', async () => {
    /* A peça é escrita no acervo de verdade e apagada depois: a guarda mede o
       que está na pasta, e provar isso com um dublê mediria outra coisa. */
    /* A peça de ensaio nasce JÁ NA PASTA: em arquivo solto ela reprovaria pela
       forma antes de chegar ao plano, e o teste mediria outra coisa. */
    const nome = 'ensaio-sem-plano-temporario';
    const pasta = join(ACERVO, nome);
    mkdirSync(pasta, { recursive: true });
    writeFileSync(join(pasta, 'receita.js'), 'export default { meta: { nome: "ensaio" }, '
      + 'PASSOS: [["cubo", { origemId: 10, larg: 0.4, alt: 0.4, prof: 0.4 }], '
      + '["parte", { nome: "unica", sel: { origem: { op: "cubo", id: 10 } } }]] };\n', 'utf8');
    try {
      expect(pecasDoAcervo()).toContain(nome);
      const { reprovadas } = await conferirAcervo([nome]);
      expect(reprovadas).toHaveLength(1);
      expect(reprovadas[0].motivo).toMatch(/SEM PLANO DE MODELAGEM/);
    } finally {
      rmSync(pasta, { recursive: true, force: true });
    }
    expect(pecasDoAcervo()).not.toContain(nome);
  });

  it('REPROVA peça em arquivo solto, e diz qual é a forma certa', async () => {
    /* A recusa entra agora porque a forma antiga ficou sem ocupante: a bicicleta
       já é pasta. Enquanto as duas formas conviviam, permitir era o certo. */
    const nome = 'ensaio-em-arquivo-solto';
    const caminho = join(ACERVO, `${nome}.js`);
    writeFileSync(caminho, 'export default { meta: { nome: "ensaio" }, PASSOS: [] };\n', 'utf8');
    try {
      expect(emArquivoSolto(nome)).toBe(true);
      const { reprovadas } = await conferirAcervo([nome]);
      expect(reprovadas).toHaveLength(1);
      expect(reprovadas[0].motivo).toMatch(/PEÇA EM ARQUIVO SOLTO/);
      expect(reprovadas[0].motivo).toMatch(new RegExp(`${nome}/receita.js`));
    } finally {
      rmSync(caminho, { force: true });
    }
  });

  it('peça em pasta não é acusada de forma antiga', () => {
    for (const peca of pecasDoAcervo()) expect(emArquivoSolto(peca), peca).toBe(false);
    /* Peça que não existe não é acusada: quem reclama de nome inexistente é o
       resolvedor, com a mensagem dele. */
    expect(emArquivoSolto('peca-que-nunca-existiu')).toBe(false);
  });

  it('a guarda varre o acervo e o acervo de hoje passa', async () => {
    /* Quantas peças e quais é assunto do acervo, não deste teste: com peça ou
       sem, o que ele afirma é que nada do que está lá reprova. */
    const { reprovadas } = await conferirAcervo(pecasDoAcervo());
    expect(reprovadas).toEqual([]);
  });

  /* ACERVO VAZIO PRECISA SER DECLARADO. Varredura vazia sai igual quando o
     acervo está sem peça de propósito e quando a listagem quebrou, e aprovar
     calada no segundo caso é gate que passa sem medir. Quem esvazia declara;
     quem põe peça nova apaga a declaração, senão ela mente em silêncio. */
  it('recusa acervo vazio sem declaração e aceita com ela', () => {
    const declaracao = join(ACERVO, DECLARACAO_DE_VAZIO);
    const tinha = existsSync(declaracao);
    const vazio = mkdtempSync(join(tmpdir(), 'acervo-vazio-'));
    try {
      expect(pecasDoAcervo(vazio)).toEqual([]);
      expect(vazioDeclarado({ raiz: vazio })).toBe(false);
      writeFileSync(join(vazio, DECLARACAO_DE_VAZIO), 'sem peça\n', 'utf8');
      expect(vazioDeclarado({ raiz: vazio })).toBe(true);
    } finally {
      rmSync(vazio, { recursive: true, force: true });
    }
    /* O acervo de verdade: ou tem peça e não declara vazio, ou está sem peça e
       declara. Os dois ao mesmo tempo é a declaração mentindo. */
    expect(tinha).toBe(pecasDoAcervo().length === 0);
  });
});
