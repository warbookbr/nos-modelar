/* contatos-da-peca.test.mjs — a medida só vale se ela REPROVAR alguma coisa.
 *
 * Um gate que nunca foi visto vermelho não decide nada, e um que reprova a peça
 * correta ensina a ignorar reprovação. Por isso as fixtures vêm em par: a mesma
 * geometria com e sem declaração, e o caso engolido que nenhuma vista mostra.
 */
import { describe, expect, it } from 'vitest';
import { executarReceita } from './executar-receita.js';
import {
  MINIMO_DO_MOTIVO,
  contatosDaPeca,
  lerContatosDeclarados,
  solidosPorParte,
} from './contatos-da-peca.js';

const RAIZ_FIXTURES = '../../tools/mecanifica/fixtures/contatos';

async function medir(nome) {
  const mod = await import(`${RAIZ_FIXTURES}/${nome}.js`);
  const receita = {
    meta: mod.meta,
    PASSOS: mod.PASSOS,
    ...(mod.contatos ? { contatos: mod.contatos } : {}),
  };
  const { neutro } = executarReceita(receita);
  return { receita, neutro, resultado: contatosDaPeca(neutro, receita) };
}

describe('contatosDaPeca', () => {
  it('a MESMA geometria passa declarada e reprova sem declaração', async () => {
    const comDeclaracao = await medir('fixture-contato-declarado');
    const semDeclaracao = await medir('fixture-contato-nao-declarado');

    /* O par medido é idêntico nas duas: o que muda é só a receita ter dito. */
    expect(comDeclaracao.resultado.paresEmContato).toHaveLength(1);
    expect(semDeclaracao.resultado.paresEmContato).toHaveLength(1);
    expect(comDeclaracao.resultado.paresEmContato[0].estado)
      .toBe(semDeclaracao.resultado.paresEmContato[0].estado);

    expect(comDeclaracao.resultado.naoDeclarados).toEqual([]);
    expect(semDeclaracao.resultado.naoDeclarados).toHaveLength(1);
    expect(semDeclaracao.resultado.naoDeclarados[0].par).toEqual(['direita', 'esquerda']);
  });

  it('parte ENGOLIDA pela outra é acusada, e por contenção', async () => {
    /* É o defeito da roda em miniatura: o miolo não aparece em vista nenhuma,
       e nenhuma superfície fica de fora para denunciar. */
    const { resultado } = await medir('fixture-parte-engolida');
    expect(resultado.naoDeclarados).toHaveLength(1);
    expect(resultado.naoDeclarados[0].par).toEqual(['casca', 'miolo']);
    expect(resultado.naoDeclarados[0].estado).toBe('interpenetram');
    expect(resultado.naoDeclarados[0].metodo).toBe('contencao-e-malha');
  });

  it('mede contra o SÓLIDO: partes distantes não entram em contato', async () => {
    const { resultado } = await medir('fixture-contato-declarado');
    expect(resultado.cobertura.completa).toBe(true);
    expect(resultado.cobertura.inconclusivos).toEqual([]);
  });

  it('divide a peça em um sólido FECHADO por parte', async () => {
    const mod = await import(`${RAIZ_FIXTURES}/fixture-contato-declarado.js`);
    const { neutro } = executarReceita({ meta: mod.meta, PASSOS: mod.PASSOS });
    const { solidos, facesSemParte } = solidosPorParte(neutro);
    expect(solidos.map((s) => s.nome)).toEqual(['direita', 'esquerda']);
    expect(solidos.every((s) => s.fechada)).toBe(true);
    expect(facesSemParte).toBe(0);
  });
});

describe('lerContatosDeclarados', () => {
  const partes = ['a', 'b'];

  it('aceita ausência de declaração como lista vazia', () => {
    expect(lerContatosDeclarados({}, partes).size).toBe(0);
  });

  it('recusa motivo curto, que é declaração que ninguém confere', () => {
    const receita = { contatos: [{ par: ['a', 'b'], motivo: 'ok' }] };
    expect(() => lerContatosDeclarados(receita, partes))
      .toThrow(new RegExp(`pelo menos ${MINIMO_DO_MOTIVO} caracteres`));
  });

  it('recusa parte inexistente NOMEANDO as disponíveis, em vez de virar no-op', () => {
    const receita = { contatos: [{ par: ['a', 'fantasma'], motivo: 'motivo suficientemente longo' }] };
    expect(() => lerContatosDeclarados(receita, partes)).toThrow(/não tem parte 'fantasma'/);
    expect(() => lerContatosDeclarados(receita, partes)).toThrow(/Partes disponíveis: a, b/);
  });

  it('recusa par repetido e par que cita a mesma parte duas vezes', () => {
    const motivo = 'motivo suficientemente longo';
    expect(() => lerContatosDeclarados({ contatos: [{ par: ['a', 'a'], motivo }] }, partes))
      .toThrow(/duas vezes/);
    expect(() => lerContatosDeclarados({
      contatos: [{ par: ['a', 'b'], motivo }, { par: ['b', 'a'], motivo }],
    }, partes)).toThrow(/já foi declarado/);
  });

  it('recusa campo desconhecido em vez de ignorar em silêncio', () => {
    const receita = { contatos: [{ par: ['a', 'b'], motivo: 'motivo suficientemente longo', folga: 1 }] };
    expect(() => lerContatosDeclarados(receita, partes)).toThrow(/campo desconhecido 'folga'/);
  });
});

describe('a ordem é por GRAVIDADE, porque quem consome tem orçamento', () => {
  it('interpenetração vem antes de encosto', async () => {
    /* A bancada captura só os primeiros pares acusados. Se a ordem fosse
       alfabética, o defeito grave poderia ficar fora do teto — foi o que
       aconteceu na primeira versão, medida na bicicleta. */
    const mod = await import(`${RAIZ_FIXTURES}/fixture-parte-engolida.js`);
    const { neutro } = executarReceita({ meta: mod.meta, PASSOS: mod.PASSOS });
    const resultado = contatosDaPeca(neutro, {});
    const estados = resultado.paresEmContato.map((p) => p.estado);
    const primeiroEncosto = estados.indexOf('encostam');
    const ultimaInvasao = estados.lastIndexOf('interpenetram');
    if (primeiroEncosto !== -1 && ultimaInvasao !== -1) {
      expect(ultimaInvasao).toBeLessThan(primeiroEncosto);
    }
    expect(estados[0]).toBe('interpenetram');
  });
});

describe('o veredito sai no CÓDIGO DE SAÍDA, que filtro nenhum descarta', () => {
  /* O defeito original sobreviveu porque a acusação era texto no stdout e um
     `grep` a descartou. Estes testes olham `codigo`, nunca a mensagem: se
     amanhã o texto mudar, o contrato que importa continua provado. */
  async function estrito(nome) {
    const modulo = await import(`${RAIZ_FIXTURES}/${nome}.js`);
    const { descreverPecaReutilizavel } = await import('../../tools/mecanifica/descrever-peca.mjs');
    return descreverPecaReutilizavel({ peca: nome, modulo, estrito: true });
  }

  it('contato declarado sai com código 0', async () => {
    const r = await estrito('fixture-contato-declarado');
    expect(r.codigo).toBe(0);
    expect(r.ok).toBe(true);
  });

  it('contato NÃO declarado sai com código 1', async () => {
    const r = await estrito('fixture-contato-nao-declarado');
    expect(r.codigo).toBe(1);
    expect(r.ok).toBe(false);
  });

  it('parte engolida sai com código 1', async () => {
    const r = await estrito('fixture-parte-engolida');
    expect(r.codigo).toBe(1);
    expect(r.ok).toBe(false);
  });

  /* SEM BANDEIRA NENHUMA TAMBÉM REPROVA. Este teste já existiu com a afirmação
     oposta, de que sem `--estrito` o contato não era medido. A bandeira estava
     pedida apenas no texto de duas skills e obrigada por gate nenhum, então com
     um pedido curto ninguém a digitava e a peça atravessada saía com código 0.
     Esquecer precisa falhar. */
  it('sem bandeira nenhuma, o contato não declarado reprova', async () => {
    const modulo = await import(`${RAIZ_FIXTURES}/fixture-parte-engolida.js`);
    const { descreverPecaReutilizavel } = await import('../../tools/mecanifica/descrever-peca.mjs');
    const r = await descreverPecaReutilizavel({ peca: 'fixture-parte-engolida', modulo });
    expect(r.codigo).toBe(1);
    expect(r.resultado.contatos).not.toBeNull();
  });

  it('--estrito continua aceito e não muda mais nada', async () => {
    const modulo = await import(`${RAIZ_FIXTURES}/fixture-parte-engolida.js`);
    const { descreverPecaReutilizavel } = await import('../../tools/mecanifica/descrever-peca.mjs');
    const comBandeira = await descreverPecaReutilizavel({ peca: 'fixture-parte-engolida', modulo, estrito: true });
    const semBandeira = await descreverPecaReutilizavel({ peca: 'fixture-parte-engolida', modulo });
    expect(comBandeira.codigo).toBe(semBandeira.codigo);
  });

  /* Desligar o veredito é legítimo, e por isso mesmo não pode se parecer com
     uma aprovação: a execução relaxada se anuncia na própria saída. */
  it('--sem-veredito aprova, não mede, e diz na saída que não mediu', async () => {
    const modulo = await import(`${RAIZ_FIXTURES}/fixture-parte-engolida.js`);
    const { descreverPecaReutilizavel } = await import('../../tools/mecanifica/descrever-peca.mjs');
    const r = await descreverPecaReutilizavel({ peca: 'fixture-parte-engolida', modulo, semVeredito: true });
    expect(r.codigo).toBe(0);
    expect(r.resultado.contatos).toBeNull();
    expect(r.stdout).toContain('VEREDITO DESLIGADO');
  });
});

describe('a declaração é contrato, não escapatória', () => {
  it('declaração que não corresponde a contato aparece, sem reprovar', async () => {
    const mod = await import(`${RAIZ_FIXTURES}/fixture-contato-declarado.js`);
    const { neutro } = executarReceita({ meta: mod.meta, PASSOS: mod.PASSOS });
    /* Uma parte declarada em contato com outra que ela nem encosta: a lista
       descreve algo que não existe, e isso precisa ficar visível. */
    const receita = {
      contatos: [{ par: ['esquerda', 'direita'], motivo: 'as duas metades se encostam na face comum' }],
    };
    const resultado = contatosDaPeca(neutro, receita, { toleranciaNumerica: 0 });
    expect(resultado.declaradosSemContato).toEqual([]);
    expect(resultado.naoDeclarados).toEqual([]);
  });
});
