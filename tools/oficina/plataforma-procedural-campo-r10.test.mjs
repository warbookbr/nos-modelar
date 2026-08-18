/* Campo R10: três famílias, composição, extensão, montagem e duas vistas por alvo. */
import { describe, expect, it } from 'vitest';
import { auditarIntersecoesMontagem } from '../../src/autoria/auditar-intersecoes-montagem.js';
import { descreverMontagemResolvida } from '../../src/autoria/descrever-montagem-resolvida.js';
import { diagnosticarExtensaoAusente, nucleo, REGISTRO_OPERACOES } from '../../prototipos/procedural/v3/motor/oficina.js';
import { PASSOS as PASSOS_PRISMA } from '../../prototipos/procedural/v3/extensoes/prisma-triangular/fixture.js';
import { capturarMontagem } from '../mecanifica/capturar-montagem.mjs';
import { carregarEstudoR10 } from '../../autoria-assistida/experimentos/plataforma-procedural-r10/carregar-estudo.mjs';

describe('plataforma procedural — estudo de campo R10', () => {
  it('modela três famílias e preserva a procedência do subgrafo e da extensão', async () => {
    const { configuracao, pecas } = await carregarEstudoR10();
    expect([...pecas.values()].map(({ familia }) => familia).sort()).toEqual([
      'extensao-nativa', 'prismatica', 'revolucao',
    ]);

    const apoio = pecas.get('apoio-prismatico');
    const nervura = pecas.get('nervura-triangular');
    expect(apoio.expansao.procedencia.nos.map(({ caminho }) => caminho))
      .toContain('receita:apoio/mecanifica.composicao.r10-apoio-prismatico/volume');
    expect(nervura.expansao.procedencia.nos.map(({ caminho }) => caminho))
      .toContain('receita:nervura/mecanifica.composicao.r10-nervura-triangular/volume-nativo');
    expect(nervura.bruto.procedencia.passos.map(({ operacao }) => operacao))
      .toContain('mecanifica.operacao.prismaTriangular');
    expect(configuracao.registroOperacoes.resolver('prismaTriangular')).not.toBeNull();
    for (const peca of pecas.values()) {
      expect(peca.bruto.orfaos).toEqual([]);
      expect(peca.dado.partes).toHaveLength(1);
    }
  });

  it('resolve e revisa a montagem inteira sem cobertura inconclusiva', async () => {
    const { montagem } = await carregarEstudoR10();
    const contexto = descreverMontagemResolvida(montagem);
    const auditoria = auditarIntersecoesMontagem(montagem);
    expect(contexto.totais).toEqual({
      pecas: 3, montagens: 0, relacoesDeclaradas: 0, satisfeitas: 0, reprovadas: 0,
    });
    expect(auditoria.cobertura).toEqual({
      paresTotais: 3, paresNoEscopo: 3, paresVerificados: 3, inconclusivos: 0, completa: true,
    });
    expect(auditoria.pares).toEqual([
      expect.objectContaining({ a: ['apoio'], b: ['nervura'], estado: 'encostam' }),
      expect.objectContaining({ a: ['apoio'], b: ['pino'], estado: 'encostam' }),
      expect.objectContaining({ a: ['nervura'], b: ['pino'], estado: 'separadas' }),
    ]);
  });

  it('remove a extensão com diagnóstico explícito e sem estado parcial', () => {
    expect(diagnosticarExtensaoAusente(REGISTRO_OPERACOES, 'prismaTriangular'))
      .toMatchObject({ estado: 'ausente', capacidade: 'prismaTriangular' });
    const tentativa = nucleo(PASSOS_PRISMA);
    expect(tentativa.orfaos).toHaveLength(1);
    expect(tentativa.V.size).toBe(0);
    expect(tentativa.F.size).toBe(0);
  });

  it('produz duas vistas PNG distintas por peça e para o conjunto', async () => {
    const { montagem } = await carregarEstudoR10();
    const alvos = [
      { caminho: [], vistas: ['frontal', 'superior'] },
      { caminho: ['apoio'], vistas: ['isometrica', 'frontal'] },
      { caminho: ['nervura'], vistas: ['isometrica', 'direita'] },
      { caminho: ['pino'], vistas: ['isometrica', 'direita'] },
    ];
    for (const { caminho, vistas } of alvos) {
      const captura = await capturarMontagem({
        montagem,
        caminho,
        vistas,
        espera: 0,
      });
      expect(captura.ok).toBe(true);
      expect(captura.resultado.capturas.map(({ nome }) => nome)).toEqual(vistas);
      for (const vista of captura.resultado.capturas) {
        expect(vista.dados.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
        expect(vista.enquadramento).toMatchObject({ valida: true, cortado: false });
        expect(vista.instancias.length).toBe(caminho.length ? 1 : 3);
      }
      expect(captura.resultado.capturas[0].dados.equals(captura.resultado.capturas[1].dados)).toBe(false);
    }
  }, 60_000);
});
