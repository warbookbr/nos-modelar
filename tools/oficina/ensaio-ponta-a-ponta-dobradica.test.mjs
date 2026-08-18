/* Primeira sonda 1.0: autoria, composição, exportação, montagem e revisão. */
import { beforeAll, describe, expect, it } from 'vitest';
import {
  REGISTRO_OPERACOES,
  buscarCapacidades,
  catalogoDeCapacidades,
  classificarLacunaCapacidade,
  criarLacunaCapacidade,
  diagnosticarExtensaoAusente,
  hipergrafoDeCapacidades,
  nucleo,
  planejarCapacidades,
} from '../../prototipos/procedural/v3/motor/oficina.js';
import { PASSOS as PASSOS_PRISMA } from '../../prototipos/procedural/v3/extensoes/prisma-triangular/fixture.js';
import { auditarIntersecoesMontagem } from '../../src/autoria/auditar-intersecoes-montagem.js';
import { descreverMontagemResolvida } from '../../src/autoria/descrever-montagem-resolvida.js';
import { capturarMontagem } from '../mecanifica/capturar-montagem.mjs';
import {
  REFERENCIAS,
  carregarEstudoDobradica,
  carregarPecaDobradica,
  criarConfiguracaoDobradica,
} from '../../autoria-assistida/experimentos/ensaio-ponta-a-ponta-dobradica/carregar-estudo.mjs';

describe('Mecanifica 1.0 — ensaio ponta a ponta da dobradiça', () => {
  let estudo;

  beforeAll(async () => {
    estudo = await carregarEstudoDobradica();
  });

  it('descobre e planeja capacidades pela configuração explícita', () => {
    const catalogo = catalogoDeCapacidades(estudo.configuracao.registroOperacoes);
    expect(catalogo.operacoes).toHaveLength(33);
    expect(buscarCapacidades(catalogo, { efeito: 'publica-porta' }).operacoes)
      .toEqual([expect.objectContaining({ nome: 'publicarPorta' })]);
    const hipergrafo = hipergrafoDeCapacidades(catalogo);
    expect(hipergrafo.hiperarestas).toHaveLength(33);
    const plano = planejarCapacidades(catalogo, {
      artefatos: { entra: [], sai: ['mecanifica.porta@1'] },
      interfaces: { entra: [], sai: [] },
      requisitos: [],
      maxCadeias: 3,
    });
    expect(plano.cadeias).toHaveLength(3);
    expect(plano.cadeias.every(({ operacoes }) => operacoes.at(-1).id === 'mecanifica.operacao.publicarPorta')).toBe(true);

    const lacuna = criarLacunaCapacidade({
      id: 'mecanifica.lacuna.movimento-articulado',
      objetivo: 'validar espaço varrido de uma articulação',
      artefatos: { entra: ['mecanifica.malha-poligonal@1'], sai: ['mecanifica.movimento-validado@1'] },
      interfaces: { entra: [], sai: [] },
      requisitos: [], candidatas: [],
      requisitoAusente: { tipo: 'representacao', id: 'mecanifica.trajetoria@1' },
      contorno: null, recorrencia: 1, classificacao: null,
    });
    expect(classificarLacunaCapacidade(catalogo, lacuna)).toMatchObject({
      classificacao: 'representacao',
    });
  });

  it('executa, mede, exporta e relê três receitas compostas sem adaptador manual', async () => {
    expect([...estudo.pecas.keys()]).toEqual(REFERENCIAS);
    for (const { medida, exportacao, neutroLido } of estudo.pecas.values()) {
      expect(medida).toMatchObject({ ok: true, codigo: 0, stderr: '' });
      expect(medida.resultado.descricao.totais).toMatchObject({ orfaos: 0, facesSemParte: 0 });
      expect(exportacao.expansao.procedencia.formato).toBe('mecanifica.procedencia-composicao@1');
      expect(exportacao.dado.partes.length).toBeGreaterThan(0);
      expect(neutroLido.F.size).toBe(exportacao.dado.F.length);
      const repetida = await carregarPecaDobradica(exportacao.dado.peca, estudo.configuracao);
      expect(repetida.exportacao.texto).toBe(exportacao.texto);
    }
  });

  it('resolve três encaixes declarados e audita todos os pares', () => {
    const contexto = descreverMontagemResolvida(estudo.montagem);
    expect(contexto.totais).toEqual({
      pecas: 3, montagens: 0, relacoesDeclaradas: 3, satisfeitas: 3, reprovadas: 0,
    });
    for (const relacao of estudo.montagem.relacoes) {
      expect(relacao).toMatchObject({ satisfeita: true, medidas: { folgaRadial: 0.00019999999999999966 } });
      expect(relacao.diagnosticos).toEqual([]);
    }
    const auditoria = auditarIntersecoesMontagem(estudo.montagem);
    expect(auditoria.cobertura).toEqual({
      paresTotais: 3, paresNoEscopo: 3, paresVerificados: 3, inconclusivos: 0, completa: true,
    });
    expect(auditoria.pares).toEqual([
      expect.objectContaining({ a: ['folha-batente'], b: ['folha-porta'], estado: 'encostam' }),
      expect.objectContaining({ a: ['folha-batente'], b: ['parafuso-central'], estado: 'encostam' }),
      expect.objectContaining({ a: ['folha-porta'], b: ['parafuso-central'], estado: 'encostam' }),
    ]);
  });

  it('diagnostica a extensão removida e não publica geometria parcial', () => {
    expect(diagnosticarExtensaoAusente(REGISTRO_OPERACOES, 'prismaTriangular'))
      .toMatchObject({ estado: 'ausente', capacidade: 'prismaTriangular' });
    const tentativa = nucleo(PASSOS_PRISMA);
    expect(tentativa.orfaos).toHaveLength(1);
    expect(tentativa.V.size).toBe(0);
    expect(tentativa.F.size).toBe(0);
    expect(criarConfiguracaoDobradica().registroOperacoes.resolver('prismaTriangular')).not.toBeNull();
  });

  it('produz duas vistas válidas, distintas e não cortadas por alvo', async () => {
    const alvos = [
      { caminho: [], vistas: ['isometrica', 'frontal'], instancias: 3 },
      { caminho: ['folha-batente'], vistas: ['isometrica', 'frontal'], instancias: 1 },
      { caminho: ['folha-porta'], vistas: ['isometrica', 'frontal'], instancias: 1 },
      { caminho: ['parafuso-central'], vistas: ['isometrica', 'frontal'], instancias: 1 },
    ];
    for (const alvo of alvos) {
      const captura = await capturarMontagem({
        montagem: estudo.montagem,
        caminho: alvo.caminho,
        vistas: alvo.vistas,
        espera: 0,
      });
      expect(captura.ok).toBe(true);
      expect(captura.resultado.capturas.map(({ nome }) => nome)).toEqual(alvo.vistas);
      for (const vista of captura.resultado.capturas) {
        expect(vista.dados.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
        expect(vista.enquadramento).toMatchObject({ valida: true, cortado: false });
        expect(vista.instancias).toHaveLength(alvo.instancias);
      }
      expect(captura.resultado.capturas[0].dados.equals(captura.resultado.capturas[1].dados)).toBe(false);
    }
  }, 60_000);
});
