/* O Condutor lendo o nível zero por uma porta de injeção: o módulo não importa o núcleo, e quem chama passa a função
   `nivelZero(bruto)`. Aqui a porta é uma função de mentira, para provar o que o Condutor faz com o que ela devolve: as medidas do
   plano vêm da leitura na blocagem (a que a porta não leu continua no esboço), o andaime que não compila reprova a Maquete, as
   perdas aparecem na situação, só os estágios Maquete e Conferência da maquete consultam a porta e, sem ela, nada muda. A prova
   com o adaptador de verdade (moto, `--medidas`, REFINA) está em tools/mecanifica/esboco-condutor-nivel-zero.test.mjs. */
import { describe, expect, it } from 'vitest';
import { avancar, criarEstado, formatarSituacao, LINHAS_DE_PERDA_POR_OPCAO, portaoDoEstagio, textoDoNivelZero } from '../src/condutor.js';

const caixa = (id, centro) => ({ id, tipo: 'caixa', largura: 20, altura: 20, profundidade: 20, centro });
const medida = (extra) => ({ nome: 'altura', valor: 20, unidade: 'mm', origem: 'ficha', tolerancia: 1, mede: 'alturaTotal', ...extra });
const esboco = () => ({
  contato: { usar: true, tolerancia: 1, penetracao: 1, folga: 100 },
  plano: { nivel: 'detalhado', medidas: [medida(), medida({ nome: 'largura', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l2', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l3', valor: 80, mede: 'larguraTotal' }), medida({ nome: 'l4', valor: 80, mede: 'larguraTotal' })], contrato: { tocam: [['a', 'b']] } },
  opcoes: [{ titulo: 'T', formas: [caixa('a', [10, 10, 0]), caixa('b', [30, 10, 0]), caixa('c', [50, 10, 0]), caixa('d', [70, 10, 0])] }],
});
const opcao = (extra = {}) => ({ titulo: 'T', volumes: 4, aproximadas: 0, semEquivalente: 0, linhas: [], medidas: [], ...extra });
const lida = (nome, exato_mm) => ({ nome, lida: true, exato_mm, formas: ['a', 'b'] });
const portaCom = (o) => { const chamadas = []; const porta = (bruto) => { chamadas.push(bruto); return { opcoes: [o] }; }; porta.chamadas = chamadas; return porta; };

describe('o Condutor lê o nível zero pela porta de injeção', () => {
  it('sem a porta o Portão é o de sempre e não traz o nível zero', () => {
    const e = esboco();
    const p = portaoDoEstagio(e, criarEstado(e, 'x'));
    expect(p.passa).toBe(true);
    expect(p).not.toHaveProperty('nivelZero');
  });

  it('a medida lida na blocagem vale no lugar da do esboço, com o desvio dela e a mesma tolerância', () => {
    const e = esboco();
    const porta = portaCom(opcao({ medidas: [lida('altura', 27.4)] }));
    const p = portaoDoEstagio(e, criarEstado(e, 'x'), { nivelZero: porta });
    expect(p.passa).toBe(false);
    expect(p.falta).toEqual(['[1] medida: medida "altura" fora da tolerância: a blocagem do andaime mede 27,4 mm e o plano declara 20 mm (origem: ficha), desvio de +7,4 mm com tolerância de 1 mm']);
    expect(p.divergencias[0]).toMatchObject({ classe: 'medida', tipo: 'medida-fora', mm: 7.4, pecas: ['a', 'b'] });
    expect(porta.chamadas).toHaveLength(1);
  });

  it('a medida que a blocagem não leu é medida no esboço e aparece como não lida, com o motivo', () => {
    const e = esboco();
    const porta = portaCom(opcao({ medidas: [lida('altura', 20), { nome: 'largura', lida: false, motivo: 'a forma "a" não tem tradução', formas: ['a'] }] }));
    const p = portaoDoEstagio(e, criarEstado(e, 'x'), { nivelZero: porta });
    expect(p.passa).toBe(true);
    expect(p.nivelZero.naoLidas).toEqual([{ opcao: 'T', nome: 'largura', motivo: 'a forma "a" não tem tradução' }]);
    expect(formatarSituacao(criarEstado(e, 'x'), p)).toContain('medida "largura" da opção T não lida na blocagem (a forma "a" não tem tradução); o esboço a mediu no lugar');
  });

  it('o andaime que não compila reprova a Maquete, com a opção e o motivo', () => {
    const e = esboco();
    const p = portaoDoEstagio(e, criarEstado(e, 'x'), { nivelZero: portaCom(opcao({ volumes: 0, erro: 'nenhuma forma visível se traduz' })) });
    expect(p.passa).toBe(false);
    expect(p.falta).toEqual(['o andaime do nível zero da opção "T" não compila, e a Maquete responde por ele: nenhuma forma visível se traduz']);
  });

  it('só a Maquete e a Conferência da maquete consultam a porta', () => {
    const e = esboco();
    const porta = portaCom(opcao({ medidas: [lida('altura', 20), lida('largura', 80), lida('l2', 80)] }));
    let s = criarEstado(e, 'x');
    for (let i = 0; i < 2; i++) { const r = avancar(e, s, { nivelZero: porta }); expect(r.ok).toBe(true); s = r.estado; }
    expect(s.atual).toBe('plano-de-detalhe');
    expect(porta.chamadas).toHaveLength(2);
    expect(portaoDoEstagio(e, s, { nivelZero: porta })).not.toHaveProperty('nivelZero');
    expect(porta.chamadas).toHaveLength(2);
  });

  it('o estado do Condutor não ganha campo: a versão é a mesma e quem tem um estado antigo continua nele', () => {
    const e = esboco();
    const antes = criarEstado(e, 'x');
    const r = avancar(e, antes, { nivelZero: portaCom(opcao({ medidas: [lida('altura', 20), lida('largura', 80), lida('l2', 80)] })) });
    expect(r.estado.versao).toBe(1);
    expect(Object.keys(r.estado).sort()).toEqual(Object.keys(antes).sort());
    expect(Object.keys(r.estado.historico[0]).sort()).toEqual(['de', 'para', 'passo']);
  });

  it('as perdas aparecem na situação, até o limite por opção, e o resto vira uma linha de contagem', () => {
    const e = esboco();
    const linhas = Array.from({ length: LINHAS_DE_PERDA_POR_OPCAO + 3 }, (_, i) => `aproximado f${i} (loft, loft-como-casco): volume +0,1%`);
    const p = portaoDoEstagio(e, criarEstado(e, 'x'), { nivelZero: portaCom(opcao({ volumes: 9, aproximadas: linhas.length, linhas, medidas: [lida('altura', 20), lida('largura', 80), lida('l2', 80)] })) });
    const texto = textoDoNivelZero(p.nivelZero);
    expect(texto[0]).toBe(`nível zero, opção T: 9 volumes no andaime compilado, ${linhas.length} aproximados, 0 sem equivalente (o que a blocagem perde em relação ao esboço):`);
    expect(texto).toHaveLength(1 + LINHAS_DE_PERDA_POR_OPCAO + 1);
    expect(texto.at(-1)).toBe('  e mais 3 linhas de perda');
    expect(formatarSituacao(criarEstado(e, 'x'), p)).toContain(texto[1]);
  });
});
