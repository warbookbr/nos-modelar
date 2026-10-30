/* endereco.test.js — o endereço lê os parâmetros da subida, reescreve a URL só quando a consulta muda e copia o endereço. */
import { describe, expect, it, vi } from 'vitest';
import { montarEndereco } from './endereco.js';

describe('endereço da bancada', () => {
  it('lê os parâmetros e não reescreve o histórico com a mesma consulta', () => {
    const local = { search: '?peca=furgao&vista=direita', pathname: '/nos-modelar/bancada.html', href: 'http://x/nos-modelar/bancada.html?peca=furgao' };
    const historico = { replaceState: vi.fn() };
    const navegador = { clipboard: { writeText: vi.fn(async () => {}) } };
    const endereco = montarEndereco({ local, historico, navegador });
    expect(endereco.parametros.get('peca')).toBe('furgao');

    endereco.escrever('peca=furgao&selecionadas=cabine');
    endereco.escrever('peca=furgao&selecionadas=cabine');
    endereco.escrever('');
    expect(historico.replaceState.mock.calls).toEqual([
      [null, '', '/nos-modelar/bancada.html?peca=furgao&selecionadas=cabine'],
      [null, '', '/nos-modelar/bancada.html'],
    ]);
    endereco.copiar();
    expect(navegador.clipboard.writeText).toHaveBeenCalledWith(local.href);
    expect(endereco.href()).toBe(local.href);
  });

  it('sem área de transferência a cópia falha para quem chamou tratar', async () => {
    const endereco = montarEndereco({ local: { search: '', pathname: '/', href: 'http://x/' }, historico: {}, navegador: {} });
    await expect((async () => endereco.copiar())()).rejects.toThrow();
  });
});
