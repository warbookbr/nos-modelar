/* atalhos.test.js — registro de atalhos de teclado da bancada.
 *
 * O caso que este teste guarda é a transferência silenciosa: alguém atribui a
 * uma vista a tecla que já enquadra a cena, o enquadramento para de funcionar,
 * e nada na tela diz o que aconteceu. Colisão precisa recusar e dizer quem
 * ocupa, porque atalho perdido é a classe de defeito que ninguém reporta como
 * defeito — a pessoa só acha que a bancada travou. */
import { describe, expect, it } from 'vitest';
import { criarRegistroAtalhos, normalizarCombinacao } from './atalhos.js';

const PADRAO = { 'vista-frontal': '1', enquadrar: 'f' };

function memoria() {
  const dados = new Map();
  return {
    getItem: (chave) => dados.get(chave) ?? null,
    setItem: (chave, valor) => dados.set(chave, valor),
  };
}

describe('registro de atalhos', () => {
  it('começa nos padrões e resolve a combinação de volta para o comando', () => {
    const registro = criarRegistroAtalhos({ padrao: PADRAO, armazenamento: memoria() });
    expect(registro.obter()).toEqual(PADRAO);
    expect(registro.comandoDaCombinacao('1')).toBe('vista-frontal');
    expect(registro.comandoDaCombinacao('F')).toBe('enquadrar');
    expect(registro.comandoDaCombinacao('q')).toBe(null);
  });

  it('RECUSA a tecla já ocupada, diz quem ocupa e não altera nada', () => {
    const registro = criarRegistroAtalhos({ padrao: PADRAO, armazenamento: memoria() });
    expect(registro.atribuir('vista-frontal', 'f')).toEqual({
      ok: false, motivo: 'ocupado', comandoOcupante: 'enquadrar',
    });
    expect(registro.obter()['vista-frontal']).toBe('1');
    expect(registro.obter().enquadrar).toBe('f');
  });

  it('aceita tecla livre, persiste e um registro novo lê o que ficou', () => {
    const armazenamento = memoria();
    const registro = criarRegistroAtalhos({ padrao: PADRAO, armazenamento });
    expect(registro.atribuir('vista-frontal', 'q')).toEqual({ ok: true, combinacao: 'q' });

    const outro = criarRegistroAtalhos({ padrao: PADRAO, armazenamento });
    expect(outro.obter()['vista-frontal']).toBe('q');
    expect(outro.comandoDaCombinacao('q')).toBe('vista-frontal');
    expect(outro.comandoDaCombinacao('1')).toBe(null);
  });

  it('restaura os padrões e apaga o que estava guardado', () => {
    const armazenamento = memoria();
    const registro = criarRegistroAtalhos({ padrao: PADRAO, armazenamento });
    registro.atribuir('enquadrar', 'e');
    expect(registro.restaurarPadroes()).toEqual(PADRAO);
    expect(criarRegistroAtalhos({ padrao: PADRAO, armazenamento }).obter()).toEqual(PADRAO);
  });

  it('recusa comando desconhecido e tecla que é só modificador', () => {
    const registro = criarRegistroAtalhos({ padrao: PADRAO, armazenamento: memoria() });
    expect(registro.atribuir('comando-que-nao-existe', 'q').motivo).toBe('comando-desconhecido');
    expect(registro.atribuir('enquadrar', 'Shift').motivo).toBe('combinacao-invalida');
    expect(registro.atribuir('enquadrar', '').motivo).toBe('combinacao-invalida');
  });

  it('normaliza caixa e preserva Shift como parte da combinação', () => {
    expect(normalizarCombinacao({ key: 'F', shiftKey: false })).toBe('f');
    expect(normalizarCombinacao({ key: '!', shiftKey: true, code: 'Digit1' })).toBe('Shift+1');
    expect(normalizarCombinacao({ key: 'Shift', shiftKey: true })).toBe(null);
    /* Guardar a mesma tecla com e sem Shift precisa dar chaves diferentes,
       senão ⇧1 rouba o 1 sem ninguém pedir. */
    expect(normalizarCombinacao({ key: '1', shiftKey: false, code: 'Digit1' }))
      .not.toBe(normalizarCombinacao({ key: '!', shiftKey: true, code: 'Digit1' }));
  });

  it('ignora atalho quando o foco está em campo de texto ou em captura', () => {
    const registro = criarRegistroAtalhos({ padrao: PADRAO, armazenamento: memoria() });
    expect(registro.deveIgnorar({ tagName: 'INPUT' })).toBe(true);
    expect(registro.deveIgnorar({ tagName: 'TEXTAREA' })).toBe(true);
    expect(registro.deveIgnorar({ tagName: 'SELECT' })).toBe(true);
    expect(registro.deveIgnorar({ tagName: 'DIV', isContentEditable: true })).toBe(true);
    expect(registro.deveIgnorar({ tagName: 'BUTTON' })).toBe(false);
    registro.iniciarCaptura();
    expect(registro.deveIgnorar({ tagName: 'BUTTON' })).toBe(true);
    registro.cancelarCaptura();
    expect(registro.deveIgnorar({ tagName: 'BUTTON' })).toBe(false);
  });
});
