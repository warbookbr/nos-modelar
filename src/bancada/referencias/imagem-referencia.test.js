/* imagem-referencia.test.js — contrato do descritor e alinhamento lateral. */
import { describe, expect, it } from 'vitest';
import { criarAlinhamentoInicial, imagemAoTrocarDePeca, normalizarImagemReferencia } from './imagem-referencia.js';

/* O caso guardado é o do furgão: toda peça aberta pela janela `Abrir` chegava com
   o alvo `sessao-ativa`, a imagem guardada de uma peça voltava sobre a seguinte no
   lugar medido para a outra, e a prancha atravessava o furgão. */
describe('imagem de referência ao trocar de peça', () => {
  it('guarda a imagem pelo nome da peça, e não pelo alvo comum da sessão', () => {
    expect(imagemAoTrocarDePeca({ peca: 'furgao', alvo: 'sessao-ativa' }).chave).toBe('furgao');
    expect(imagemAoTrocarDePeca({ peca: 'peca-de-prova', alvo: 'sessao-ativa' }).chave).toBe('peca-de-prova');
    expect(imagemAoTrocarDePeca({ peca: '', alvo: 'alvo-da-ia' }).chave).toBe('alvo-da-ia');
  });

  it('tira da cena a imagem da peça anterior e mantém a da mesma peça recarregada', () => {
    expect(imagemAoTrocarDePeca({
      chaveAnterior: 'peca-de-prova', peca: 'furgao', alvo: 'sessao-ativa', imagemNaCena: true,
    })).toEqual({ chave: 'furgao', tirarDaCena: true });
    expect(imagemAoTrocarDePeca({
      chaveAnterior: 'furgao', peca: 'furgao', alvo: 'sessao-ativa', imagemNaCena: true,
    })).toEqual({ chave: 'furgao', tirarDaCena: false });
    expect(imagemAoTrocarDePeca({ chaveAnterior: 'peca-de-prova', peca: 'furgao' }).tirarDaCena).toBe(false);
  });
});

describe('imagem de referência', () => {
  it('calcula o plano YZ no centro da peça, com proporção e lado solicitados', () => {
    const alinhamento = criarAlinhamentoInicial({
      caixa: { min: { x: -0.1, y: 0, z: -1 }, max: { x: 0.1, y: 2, z: 1 } },
      larguraImagem: 2000,
      alturaImagem: 1000,
      lado: 'esquerda',
    });

    expect(alinhamento.y).toBe(1);
    expect(alinhamento.largura).toBe(4);
    expect(alinhamento.escala).toBeGreaterThan(0);
    expect(alinhamento.lado).toBe('esquerda');
  });

  it('recusa fonte ausente e limita opacidade a um intervalo visível', () => {
    expect(normalizarImagemReferencia({ fonte: 'url', url: '  ' })).toBeNull();
    expect(normalizarImagemReferencia({ fonte: 'url', url: 'https://exemplo.test/bike.jpg', opacidade: 2 }))
      .toMatchObject({ fonte: 'url', alinhamento: { opacidade: 1 } });
  });
});

describe('giro da imagem de referência', () => {
  const base = { fonte: 'url', url: 'http://exemplo/ref.png' };

  it('nasce em zero quando ninguém declara', () => {
    expect(normalizarImagemReferencia(base).alinhamento.giro).toBe(0);
  });

  it('guarda o grau declarado', () => {
    expect(normalizarImagemReferencia({ ...base, alinhamento: { giro: -37 } }).alinhamento.giro).toBe(-37);
  });

  it('dobra volta inteira para o intervalo de meia volta para cada lado', () => {
    const dobrado = (g) => normalizarImagemReferencia({ ...base, alinhamento: { giro: g } }).alinhamento.giro;
    expect(dobrado(370)).toBe(10);
    expect(dobrado(-370)).toBe(-10);
    expect(dobrado(540)).toBe(-180);
    expect(dobrado(0)).toBe(0);
  });

  it('valor que não é número vira zero, e não NaN na cena', () => {
    expect(normalizarImagemReferencia({ ...base, alinhamento: { giro: 'torto' } }).alinhamento.giro).toBe(0);
  });

  it('o alinhamento inicial da peça também traz o giro', () => {
    const inicial = criarAlinhamentoInicial({
      caixa: { min: { x: -1, y: 0, z: -1 }, max: { x: 1, y: 2, z: 1 } },
      larguraImagem: 100,
      alturaImagem: 50,
    });
    expect(inicial.giro).toBe(0);
  });
});
