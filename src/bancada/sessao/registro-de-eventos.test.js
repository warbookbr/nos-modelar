/* registro-de-eventos.test.js — prova que a memória curta da bancada guarda a
   sequência certa, junta repetição consecutiva e descarta o antigo, não o
   recente, ao encher. */
import { describe, expect, it } from 'vitest';
import { criarRegistroDeEventos } from './registro-de-eventos.js';

function relogio(inicio = 0) {
  let passo = inicio;
  return () => new Date(Date.UTC(2026, 0, 1, 0, 0, passo++));
}

describe('registro de eventos da bancada', () => {
  it('guarda assunto, detalhe e instante de cada evento', () => {
    const registro = criarRegistroDeEventos({ agora: relogio() });
    registro.registrar('informacao', 'Peça aberta', 'bicicleta-quadro');
    const [evento] = registro.listar();
    expect(evento.assunto).toBe('Peça aberta');
    expect(evento.detalhe).toBe('bicicleta-quadro');
    expect(evento.quando).toBe('2026-01-01T00:00:00.000Z');
    expect(evento.repeticoes).toBe(1);
  });

  it('recusa gravidade desconhecida e assunto vazio', () => {
    const registro = criarRegistroDeEventos({ agora: relogio() });
    expect(() => registro.registrar('grave', 'x')).toThrow(/gravidade desconhecida/);
    expect(() => registro.registrar('erro', '   ')).toThrow(/sem assunto/);
  });

  it('conta a repetição consecutiva em vez de empilhar linhas iguais', () => {
    const registro = criarRegistroDeEventos({ agora: relogio() });
    registro.registrar('erro', 'Erro de sincronia');
    registro.registrar('erro', 'Erro de sincronia');
    registro.registrar('erro', 'Erro de sincronia');
    expect(registro.listar()).toHaveLength(1);
    expect(registro.listar()[0].repeticoes).toBe(3);
    expect(registro.listar()[0].quando).toBe('2026-01-01T00:00:02.000Z');
  });

  it('a repetição só se junta enquanto for consecutiva', () => {
    const registro = criarRegistroDeEventos({ agora: relogio() });
    registro.registrar('erro', 'Erro de sincronia');
    registro.registrar('informacao', 'Sessão conectada');
    registro.registrar('erro', 'Erro de sincronia');
    expect(registro.listar()).toHaveLength(3);
  });

  it('descarta os mais antigos ao passar do limite, e nunca os recentes', () => {
    const registro = criarRegistroDeEventos({ agora: relogio(), limite: 3 });
    for (const n of [1, 2, 3, 4, 5]) registro.registrar('informacao', `evento ${n}`);
    expect(registro.listar().map((e) => e.assunto)).toEqual(['evento 3', 'evento 4', 'evento 5']);
  });

  it('lista do mais recente para o mais antigo quando pedido', () => {
    const registro = criarRegistroDeEventos({ agora: relogio() });
    registro.registrar('informacao', 'primeiro');
    registro.registrar('alerta', 'segundo');
    expect(registro.listarRecentesPrimeiro().map((e) => e.assunto)).toEqual(['segundo', 'primeiro']);
  });

  it('conta por gravidade, que é o que decide mostrar aviso', () => {
    const registro = criarRegistroDeEventos({ agora: relogio() });
    registro.registrar('informacao', 'a');
    registro.registrar('erro', 'b');
    registro.registrar('alerta', 'c');
    expect(registro.contarPorGravidade('erro')).toBe(1);
    expect(registro.contarPorGravidade('informacao')).toBe(1);
  });

  it('devolve cópias, para quem lê não conseguir reescrever o passado', () => {
    const registro = criarRegistroDeEventos({ agora: relogio() });
    registro.registrar('informacao', 'a');
    registro.listar()[0].assunto = 'outro';
    expect(registro.listar()[0].assunto).toBe('a');
  });
});
