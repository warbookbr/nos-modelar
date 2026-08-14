/* R05: estudo de campo sobre uma peça compartilhada em duas raízes. */
import { mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — serviço JavaScript público.
import { criarSnapshotUniversoAutoria, serializarCanonico } from '../../src/autoria/snapshot-universo-autoria.js';
// @ts-expect-error — serviço JavaScript público.
import { consultarImpactoGlobal } from '../../src/autoria/consultar-impacto-global.js';
// @ts-expect-error — serviço JavaScript público.
import { derivarMapaDependencias } from '../../src/autoria/derivar-mapa-dependencias.js';
// @ts-expect-error — resolvedor persistido existente.
import { resolverMontagemPersistida } from '../../src/autoria/resolver-montagem-persistida.js';
// @ts-expect-error — adaptador Node da fixture.
import { criarCarregadoresUniverso, sha256Canonico } from './universo-autoria.mjs';
// @ts-expect-error — provedores de revisão ativa/inativa.
import { criarProvedoresAutoriaAtiva, criarProvedoresAutoriaInativa } from './autoria-ativa.mjs';
// @ts-expect-error — ponte Node JavaScript pública.
import { derivarCampanhaDeImpacto } from './derivar-campanha-revalidacao.mjs';
// @ts-expect-error — persistência transacional existente.
import { lerCampanhaRevalidacao, persistirCampanhaRevalidacao } from './repositorio-revalidacao.mjs';
// @ts-expect-error — persistência transacional existente.
import { materializarRevisaoAutoria } from './repositorio-autoria.mjs';
// @ts-expect-error — autoria declarativa existente.
import { planejarAutoriaReceita } from './autoria-receita.mjs';
// @ts-expect-error — porta MCP Agent-First.
import { criarFerramentasRevalidacao } from '../mcp/perfis/revalidacao.mjs';
// @ts-expect-error — receita declarativa usada como nova revisão real.
import * as EIXO from '../../autoria-assistida/experimentos/autoria-geometrica-do-zero/receitas/eixo-guia.js';

const raizFixture = new URL('./fixtures/mapa-dependencias/', import.meta.url);
const raizMontagens = fileURLToPath(new URL('montagens/', raizFixture));
const raizPecas = fileURLToPath(new URL('pecas/', raizFixture));
const ler = (nome: string) => JSON.parse(readFileSync(new URL(nome, raizFixture), 'utf8'));
const lerMontagem = (id: string) => JSON.parse(readFileSync(join(raizMontagens, `${id}.json`), 'utf8'));
const lerPeca = (id: string) => JSON.parse(readFileSync(join(raizPecas, `${id}.json`), 'utf8'));

function receitaNova() {
  const fim = EIXO.PARAMS.fim + 0.005;
  return {
    formato: 'mecanifica.receita-declarativa', versao: 1, id: 'peca-compartilhada',
    params: { ...EIXO.PARAMS, fim, comprimento: fim - EIXO.PARAMS.inicio },
    topo: EIXO.TOPO, passos: EIXO.PASSOS, materiais: EIXO.MATERIAIS, aliases: EIXO.ALIASES,
    meta: { nome: 'peca-compartilhada', desc: 'revisão de campo da peça compartilhada' },
  };
}

async function mapaCom(provedores: any) {
  const carregadores = criarCarregadoresUniverso({ raizMontagens, raizPecas, provedores });
  const snapshot = await criarSnapshotUniversoAutoria({
    universo: ler('universo.json'), ...carregadores, hash: sha256Canonico,
  });
  return derivarMapaDependencias(snapshot);
}

function contextoCampanha(mapa: any) {
  const alvo = { tipo: 'peca', id: 'peca-compartilhada' };
  const impacto = consultarImpactoGlobal(mapa, alvo);
  const entidade = mapa.entidades.find((item: any) => item.tipo === alvo.tipo && item.id === alvo.id);
  return {
    mapa, impacto,
    causa: { tipo: alvo.tipo, id: alvo.id, ...entidade.proveniencia },
    mapaSha256: sha256Canonico(serializarCanonico(mapa)),
  };
}

async function validarRaizes(provedores: any) {
  const chamadas: any[] = [];
  const carregarPeca = async (id: string) => (await provedores.carregarPeca(id)) ?? lerPeca(id);
  const carregarMontagem = async (id: string) => lerMontagem(id);
  for (const id of ['sistema-a', 'sistema-b', 'sistema-isolado']) {
    const resolvida = await resolverMontagemPersistida(lerMontagem(id), { carregarPeca, carregarMontagem });
    chamadas.push({ id, estado: 'aprovado', instancias: resolvida.instancias.length });
  }
  return chamadas;
}

function ferramenta(ferramentas: any[], nome: string) {
  const encontrada = ferramentas.find((item) => item.nome === nome);
  if (!encontrada) throw new Error(`ferramenta ausente: ${nome}`);
  return encontrada;
}

describe('estudo de campo R05 — cascata persistida', () => {
  it('rederiva campanha, obsoleta a anterior e retoma resultados em nova sessão', async () => {
    const raiz = await mkdtemp(join(tmpdir(), 'mecanifica-r05-campo-'));
    try {
      const mapaAntigo = await mapaCom(criarProvedoresAutoriaInativa());
      const antiga = derivarCampanhaDeImpacto(contextoCampanha(mapaAntigo));
      await persistirCampanhaRevalidacao({ raiz, campanha: antiga });

      const falhaValidacao = await resolverMontagemPersistida(lerMontagem('subconjunto-compartilhado'), {
        carregarPeca: async (id: string) => id === 'peca-compartilhada' ? null : lerPeca(id),
        carregarMontagem: async (id: string) => lerMontagem(id),
      }).then(() => null, (erro: any) => erro);
      expect(falhaValidacao?.codigo).toBe('referencia-ausente');
      const sessaoFalha = criarFerramentasRevalidacao({ raizRepositorio: raiz, podeEscrever: true });
      const registrarFalha = ferramenta(sessaoFalha, 'registrar_resultado_revalidacao');
      const resultadoFalho = await registrarFalha.executar({
        identidade: antiga.identidade,
        versaoEsperada: antiga.itens[0].versao,
        resultado: {
          formato: 'mecanifica.resultado-revalidacao', versao: 1, item: antiga.itens[0].alvo,
          revisaoValidada: antiga.itens[0].revisaoObservada, estado: 'reprovado',
          gates: ['resolver-montagem-persistida'], diagnostico: { codigo: falhaValidacao.codigo },
        },
      });
      expect(resultadoFalho).toMatchObject({ ok: true });

      const plano = planejarAutoriaReceita({ receita: receitaNova() });
      const publicada = await materializarRevisaoAutoria({ raiz, plano: plano.repositorio });
      expect(publicada.commit).toMatch(/^[a-f0-9]{64}$/);

      const provedoresAtivos = criarProvedoresAutoriaAtiva({
        raizRepositorio: raiz,
        receitasAutorizadas: ['peca-compartilhada'],
      });
      const mapaNovo = await mapaCom(provedoresAtivos);
      const validacoes = await validarRaizes(provedoresAtivos);
      const nova = derivarCampanhaDeImpacto(contextoCampanha(mapaNovo));
      await persistirCampanhaRevalidacao({ raiz, campanha: nova });

      expect(nova.identidade).not.toEqual(antiga.identidade);
      expect(antiga.alcance).toEqual({ raizesAfetadas: ['sistema-a', 'sistema-b'], raizesNaoAfetadas: ['sistema-isolado'] });
      expect(nova.alcance).toEqual(antiga.alcance);
      expect(nova.causa.revisao).toBe(publicada.commit);
      expect(nova.causa.revisao).not.toBe(antiga.causa.revisao);
      expect(validacoes).toHaveLength(3);
      expect(validacoes.every((item) => item.estado === 'aprovado')).toBe(true);

      const sessaoAutoria = criarFerramentasRevalidacao({ raizRepositorio: raiz, podeEscrever: true });
      const obsoletar = ferramenta(sessaoAutoria, 'obsoletar_campanha_revalidacao');
      const obsoleta = await obsoletar.executar({
        identidade: antiga.identidade,
        identidadeSubstituta: nova.identidade,
        motivo: 'causa-compartilhada-revisada',
      });
      expect(obsoleta).toMatchObject({ ok: true, resultado: { idempotente: false } });
      const obsoletaDeNovo = await obsoletar.executar({
        identidade: antiga.identidade,
        identidadeSubstituta: nova.identidade,
        motivo: 'causa-compartilhada-revisada',
      });
      expect(obsoletaDeNovo).toMatchObject({ ok: true, resultado: { idempotente: true } });

      const leituraNovaSessao = criarFerramentasRevalidacao({ raizRepositorio: raiz });
      const consulta = ferramenta(leituraNovaSessao, 'consultar_campanha_revalidacao');
      const antigaRelida = await consulta.executar(antiga.identidade);
      expect(antigaRelida.resultado.totais.obsoletos).toBe(antiga.itens.length);
      expect(antigaRelida.resultado.resultados).toBe(1);
      expect(antigaRelida.resultado.itens.find((item: any) => item.ultimoResultado)?.ultimoResultado.estado).toBe('reprovado');

      const escritaNovaSessao = criarFerramentasRevalidacao({ raizRepositorio: raiz, podeEscrever: true });
      const registrar = ferramenta(escritaNovaSessao, 'registrar_resultado_revalidacao');
      for (const item of nova.itens) {
        const resultado = await registrar.executar({
          identidade: nova.identidade,
          versaoEsperada: item.versao,
          resultado: {
            formato: 'mecanifica.resultado-revalidacao', versao: 1, item: item.alvo,
            revisaoValidada: item.revisaoObservada, estado: 'aprovado',
            gates: ['resolver-montagem-persistida'], diagnostico: null,
          },
        });
        expect(resultado).toMatchObject({ ok: true });
      }

      const novaRelida = await consulta.executar(nova.identidade);
      expect(novaRelida.resultado.totais).toMatchObject({ total: nova.itens.length, aprovados: nova.itens.length, pendentes: 0 });
      expect(novaRelida.resultado.resultados).toBe(nova.itens.length);
      expect(Buffer.byteLength(JSON.stringify(novaRelida.resultado), 'utf8')).toBeLessThan(Buffer.byteLength(JSON.stringify(nova), 'utf8'));
      expect(JSON.stringify({ antigaRelida, novaRelida })).not.toContain(raiz);
      expect(JSON.stringify(novaRelida)).not.toContain('caminhos');
    } finally {
      await rm(raiz, { recursive: true, force: true });
    }
  });
});
