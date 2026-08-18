/* Sonda de escala 1.0: sistema exterior ficcional, privado e recursivo. */
import { beforeAll, describe, expect, it } from 'vitest';
import { auditarIntersecoesMontagem } from '../../src/autoria/auditar-intersecoes-montagem.js';
import { derivarImpactoDefinicaoMontagem } from '../../src/autoria/derivar-impacto-montagem.js';
import { descreverMontagemResolvida } from '../../src/autoria/descrever-montagem-resolvida.js';
import { PUBLICADAS } from '../mecanifica/exportar-peca.mjs';
import { capturarMontagem } from '../mecanifica/capturar-montagem.mjs';
import {
  REFERENCIAS,
  carregarEstudoSupercarro,
  carregarPecaSupercarro,
} from '../../autoria-assistida/experimentos/sonda-supercarro-1-0/carregar-estudo.mjs';

const bytes = (valor) => Buffer.byteLength(JSON.stringify(valor));

describe('Mecanifica 1.0 — sonda de escala do supercarro ficcional', () => {
  let estudo;

  beforeAll(async () => {
    estudo = await carregarEstudoSupercarro();
  });

  it('mantém doze definições privadas reproduzíveis sem contaminar o catálogo público', async () => {
    expect(PUBLICADAS).toEqual([]);
    expect(REFERENCIAS).toHaveLength(12);
    const identidades = new Set();
    let vertices = 0;
    let faces = 0;
    let bytesExportados = 0;
    for (const item of estudo.pecas.values()) {
      expect(item.medida).toMatchObject({ ok: true, codigo: 0, stderr: '' });
      expect(item.medida.resultado.descricao.totais).toMatchObject({ orfaos: 0, facesSemParte: 0 });
      expect(item.neutroLido.F.size).toBe(item.exportacao.dado.F.length);
      item.exportacao.dado.partes.forEach((parte) => identidades.add(parte));
      vertices += item.exportacao.dado.V.length;
      faces += item.exportacao.dado.F.length;
      bytesExportados += Buffer.byteLength(item.exportacao.texto);
      const repetida = await carregarPecaSupercarro(item.ref, estudo.configuracao);
      expect(repetida.exportacao.texto).toBe(item.exportacao.texto);
    }
    expect(identidades.size).toBeGreaterThanOrEqual(16);
    expect({ vertices, faces }).toEqual({ vertices: 1428, faces: 1434 });
    expect(bytesExportados).toBeLessThan(400_000);
  });

  it('resolve quatro instâncias da mesma roda e as quatro relações anulares', () => {
    const contexto = descreverMontagemResolvida(estudo.montagem);
    expect(contexto.totais).toEqual({
      pecas: 27, montagens: 4, relacoesDeclaradas: 4, satisfeitas: 4, reprovadas: 0,
    });
    const rodas = contexto.instancias.filter(({ alvo }) => alvo.tipo === 'montagem' && alvo.ref === 'roda');
    expect(rodas.map(({ caminho }) => caminho)).toEqual([
      ['roda-dianteira-direita'], ['roda-dianteira-esquerda'],
      ['roda-traseira-direita'], ['roda-traseira-esquerda'],
    ]);
    for (const roda of rodas) {
      const folhas = contexto.instancias.filter(({ caminho }) => caminho[0] === roda.caminho[0] && caminho.length === 2);
      expect(folhas.map(({ alvo }) => alvo.ref).sort()).toEqual(['aro', 'disco-freio', 'pneu']);
    }
    expect(estudo.montagem.instancias.filter(({ alvo }) => alvo.tipo === 'montagem')
      .every(({ montagem }) => montagem.relacoes[0].satisfeita)).toBe(true);

    const impacto = derivarImpactoDefinicaoMontagem(estudo.montagem, {
      tipo: 'montagem', ref: 'roda',
    });
    expect(impacto.consumidoresDefinicao.map(({ caminho }) => caminho)).toEqual(
      rodas.map(({ caminho }) => caminho),
    );
    expect(impacto.caminhosIniciais).toHaveLength(16);
    expect(impacto.montagensARevalidar.map(({ caminho }) => caminho)).toEqual([
      [],
      ['roda-dianteira-direita'],
      ['roda-dianteira-esquerda'],
      ['roda-traseira-direita'],
      ['roda-traseira-esquerda'],
    ]);
    expect(impacto.limitacoes).toContain('uso-global-fora-da-raiz-nao-verificado');
  });

  it('reduz contexto por subárvore e auditoria interna sem esconder as omissões', () => {
    const global = descreverMontagemResolvida(estudo.montagem);
    const roda = descreverMontagemResolvida(estudo.montagem, { caminho: ['roda-dianteira-esquerda'] });
    expect(bytes(roda)).toBeLessThan(bytes(global) / 4);
    expect(roda.consulta).toMatchObject({ instanciasOmitidas: 27, relacoesOmitidas: 3 });

    const interna = auditarIntersecoesMontagem(estudo.montagem, {
      caminho: ['roda-dianteira-esquerda'], modoFoco: 'interno',
    });
    expect(interna.escopo).toMatchObject({ modoFoco: 'interno', paresOmitidosPorFoco: 348 });
    expect(interna.cobertura).toEqual({
      paresTotais: 351, paresNoEscopo: 3, paresVerificados: 3, inconclusivos: 0, completa: false,
    });
  });

  it('decide todos os pares globais e deixa cada sobreposição visual explicitamente explicada', () => {
    const auditoria = auditarIntersecoesMontagem(estudo.montagem);
    expect(auditoria.cobertura).toEqual({
      paresTotais: 351, paresNoEscopo: 351, paresVerificados: 351, inconclusivos: 0, completa: true,
    });
    const interpenetracoes = auditoria.pares.filter(({ estado }) => estado === 'interpenetram');
    expect(interpenetracoes).toHaveLength(16);
    expect(interpenetracoes.every(({ expectativa }) => expectativa?.id && expectativa?.motivo)).toBe(true);
    const pneusContraCarroceria = auditoria.pares.filter(({ a, b }) => (
      (a[0] === 'carroceria' && b.at(-1) === 'pneu')
      || (b[0] === 'carroceria' && a.at(-1) === 'pneu')
    ));
    expect(pneusContraCarroceria.every(({ estado }) => estado === 'separadas')).toBe(true);
  });

  it('produz frente, traseira, topo, lateral e vistas isoladas válidas e distintas', async () => {
    const alvos = [
      { caminho: [], vistas: ['isometrica', 'direita', 'frontal', 'traseira', 'superior'], instancias: 27 },
      { caminho: ['roda-dianteira-esquerda'], vistas: ['isometrica', 'direita'], instancias: 3 },
      { caminho: ['cabine'], vistas: ['isometrica', 'direita'], instancias: 1 },
      { caminho: ['aerodinamica'], vistas: ['isometrica', 'traseira'], instancias: 1 },
      { caminho: ['porta-esquerda'], vistas: ['isometrica', 'direita'], instancias: 1 },
    ];
    let total = 0;
    for (const alvo of alvos) {
      const captura = await capturarMontagem({
        montagem: estudo.montagem, caminho: alvo.caminho, vistas: alvo.vistas, espera: 0,
      });
      expect(captura.ok).toBe(true);
      expect(captura.resultado.capturas.map(({ nome }) => nome)).toEqual(alvo.vistas);
      for (const vista of captura.resultado.capturas) {
        expect(vista.dados.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
        expect(vista.enquadramento).toMatchObject({ valida: true, cortado: false });
        expect(vista.instancias).toHaveLength(alvo.instancias);
      }
      expect(new Set(captura.resultado.capturas.map(({ dados }) => dados.toString('base64'))).size)
        .toBe(alvo.vistas.length);
      total += alvo.vistas.length;
    }
    expect(total).toBe(13);
  }, 90_000);
});
