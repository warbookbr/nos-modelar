/* Provas executáveis da R00: identidade, estados, obsolescência e concorrência. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — contrato JavaScript público, exercitado pela R00.
import { criarCampanhaRevalidacao, ErroContratoRevalidacao, registrarResultado, transicionarItem } from '../../src/autoria/protocolo-revalidacao.js';
// @ts-expect-error — serviço JavaScript público.
import { consultarImpactoGlobal } from '../../src/autoria/consultar-impacto-global.js';
// @ts-expect-error — serviço JavaScript público.
import { derivarMapaDependencias } from '../../src/autoria/derivar-mapa-dependencias.js';
// @ts-expect-error — serviço JavaScript público.
import { criarSnapshotUniversoAutoria, serializarCanonico } from '../../src/autoria/snapshot-universo-autoria.js';
// @ts-expect-error — adaptador Node JavaScript usado pela fixture.
import { criarCarregadoresUniverso, sha256Canonico } from './universo-autoria.mjs';

const raiz = new URL('./fixtures/mapa-dependencias/', import.meta.url);
const ler = (nome: string) => JSON.parse(readFileSync(new URL(nome, raiz), 'utf8'));

async function contexto() {
  const carregadores = criarCarregadoresUniverso({
    raizMontagens: fileURLToPath(new URL('montagens/', raiz)),
    raizPecas: fileURLToPath(new URL('pecas/', raiz)),
  });
  const snapshot = await criarSnapshotUniversoAutoria({ universo: ler('universo.json'), ...carregadores, hash: sha256Canonico });
  const mapa = derivarMapaDependencias(snapshot);
  const impacto = consultarImpactoGlobal(mapa, { tipo: 'peca', id: 'peca-compartilhada' });
  const causa = mapa.entidades.find((item: any) => item.tipo === 'peca' && item.id === 'peca-compartilhada').proveniencia;
  return { mapa, impacto, causa, mapaSha256: sha256Canonico(serializarCanonico(mapa)) };
}

describe('protocolo de revalidação em cascata — R00', () => {
  it('deriva campanha retomável com identidade semântica e revisão observada', async () => {
    const base = await contexto();
    const campanha = criarCampanhaRevalidacao({ ...base, causa: { tipo: 'peca', id: 'peca-compartilhada', ...base.causa } });

    expect(campanha.chave).toContain('peca-compartilhada');
    expect(campanha.itens.map((item: any) => item.chave)).toEqual([
      'montagem:subconjunto-compartilhado', 'montagem:sistema-a', 'montagem:sistema-b',
    ]);
    expect(campanha.itens.every((item: any) => item.estado === 'pendente' && item.versao === 0)).toBe(true);
    expect(campanha.itens.every((item: any) => item.revisaoObservada.sha256)).toBe(true);
  });

  it('mantém a mesma identidade apesar da ordem física do mapa', async () => {
    const base = await contexto();
    const causa = { tipo: 'peca', id: 'peca-compartilhada', ...base.causa };
    const a = criarCampanhaRevalidacao({ ...base, causa });
    const mapa = { ...base.mapa, entidades: [...base.mapa.entidades].reverse() };
    const b = criarCampanhaRevalidacao({ mapa, impacto: base.impacto, causa, mapaSha256: base.mapaSha256 });
    expect(b.chave).toBe(a.chave);
    expect(b.itens.map((item: any) => item.chave)).toEqual(a.itens.map((item: any) => item.chave));
  });

  it('recusa snapshot misto e causa com revisão divergente', async () => {
    const base = await contexto();
    const causa = { tipo: 'peca', id: 'peca-compartilhada', ...base.causa };
    expect(() => criarCampanhaRevalidacao({ ...base, causa: { ...causa, sha256: 'sha256:outra' } })).toThrowError(ErroContratoRevalidacao);
    expect(() => criarCampanhaRevalidacao({ ...base, impacto: { ...base.impacto, cobertura: { ...base.impacto.cobertura, universo: 'outro' } }, causa })).toThrow(/mesmo universo/);
  });

  it('prova transições válidas, obsolescência e falha fechada de concorrência', async () => {
    const base = await contexto();
    const campanha = criarCampanhaRevalidacao({ ...base, causa: { tipo: 'peca', id: 'peca-compartilhada', ...base.causa } });
    const item = campanha.itens[0];
    const emValidacao = transicionarItem(item, { esperadoVersao: 0, proximoEstado: 'em-validacao', revisaoAtual: item.revisaoObservada });
    const resultado = { revisao: item.revisaoObservada.revisao, sha256: item.revisaoObservada.sha256, gates: ['contrato'] };
    const aprovado = transicionarItem(emValidacao, { esperadoVersao: 1, proximoEstado: 'aprovado', revisaoAtual: item.revisaoObservada, resultado });
    expect(aprovado.estado).toBe('aprovado');
    expect(() => transicionarItem(emValidacao, { esperadoVersao: 1, proximoEstado: 'aprovado', revisaoAtual: { ...item.revisaoObservada, sha256: 'sha256:nova' }, resultado })).toThrow(/revisão diferente/);
    expect(() => transicionarItem(item, { esperadoVersao: 1, proximoEstado: 'em-validacao', revisaoAtual: item.revisaoObservada })).toThrow(/mudou/);
    const obsoleto = transicionarItem(aprovado, { esperadoVersao: 2, proximoEstado: 'obsoleto', revisaoAtual: { ...item.revisaoObservada, sha256: 'sha256:nova' } });
    expect(obsoleto.estado).toBe('obsoleto');
  });

  it('torna repetição de resultado idempotente e conflito explícito', async () => {
    const base = await contexto();
    const campanha = criarCampanhaRevalidacao({ ...base, causa: { tipo: 'peca', id: 'peca-compartilhada', ...base.causa } });
    const item = campanha.itens[0];
    const resultado = {
      formato: 'mecanifica.resultado-revalidacao', versao: 1,
      item: item.alvo, revisaoValidada: item.revisaoObservada, estado: 'aprovado',
      gates: ['contrato'], diagnostico: null,
    };
    const uma = registrarResultado([], resultado);
    const duas = registrarResultado(uma.historico, resultado);
    expect(uma.idempotente).toBe(false);
    expect(duas.idempotente).toBe(true);
    expect(duas.historico).toHaveLength(1);
    expect(() => registrarResultado(duas.historico, { ...resultado, estado: 'reprovado' })).toThrow(/outro resultado/);
  });
});
