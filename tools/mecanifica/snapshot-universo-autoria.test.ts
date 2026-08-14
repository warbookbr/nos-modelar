/* snapshot-universo-autoria.test.ts — provas da R01. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — contrato JavaScript público, exercitado pela prova TypeScript.
import { criarSnapshotUniversoAutoria } from '../../src/autoria/snapshot-universo-autoria.js';
// @ts-expect-error — adaptador Node da bancada.
import { criarCarregadoresUniverso, sha256Canonico } from './universo-autoria.mjs';

const raizFixture = new URL('./fixtures/mapa-dependencias/', import.meta.url);
const lerJson = (nome: string) => JSON.parse(readFileSync(new URL(nome, raizFixture), 'utf8'));
const universo = () => lerJson('universo.json');

function carregadores(provedores: any = undefined) {
  return criarCarregadoresUniverso({
    raizMontagens: fileURLToPath(new URL('montagens/', raizFixture)),
    raizPecas: fileURLToPath(new URL('pecas/', raizFixture)),
    ...(provedores ? { provedores } : {}),
  });
}

describe('snapshot do universo de autoria — R01', () => {
  it('carrega o universo completo, confinado e sem caminhos públicos', async () => {
    const fontes = carregadores();
    const snapshot = await criarSnapshotUniversoAutoria({
      universo: universo(),
      ...fontes,
      hash: sha256Canonico,
    });

    expect(snapshot.formato).toBe('mecanifica.snapshot-universo-autoria');
    expect(snapshot.cobertura).toMatchObject({ completa: true, entidades: 8, tentativas: 1 });
    expect(snapshot.pecas).toHaveLength(4);
    expect(snapshot.montagens).toHaveLength(4);
    expect(snapshot.pecas.every((item: any) => item.fonte === 'base-estatica')).toBe(true);
    expect(snapshot.montagens.every((item: any) => item.sha256.match(/^sha256:[0-9a-f]{64}$/))).toBe(true);
    expect(JSON.stringify(snapshot)).not.toContain('montagens/');
    expect(JSON.stringify(snapshot)).not.toContain('pecas/');
  });

  it('sobrepõe somente a entidade ativa e mantém fallback estático explícito', async () => {
    const ativa = lerJson('montagens/sistema-a.json');
    ativa.instancias = [ativa.instancias[1]];
    const ativaPeca = lerJson('pecas/peca-a.json');
    const provedores = {
      async carregarMontagem(id: string) { return id === 'sistema-a' ? ativa : null; },
      async carregarPeca(id: string) { return id === 'peca-a' ? ativaPeca : null; },
      async estado() {
        return {
          formato: 'mecanifica.autoria-ativa', versao: 1,
          montagens: [{ id: 'sistema-a', revisao: 'r01-ativa', fonte: 'revisao-ativa' }],
          receitas: [{ id: 'peca-a', revisao: 'r01-receita', fonte: 'revisao-ativa' }],
        };
      },
    };
    const snapshot = await criarSnapshotUniversoAutoria({
      universo: universo(), ...carregadores(provedores), hash: sha256Canonico,
    });
    const sistemaA = snapshot.montagens.find((item: any) => item.id === 'sistema-a');
    const sistemaB = snapshot.montagens.find((item: any) => item.id === 'sistema-b');
    const pecaA = snapshot.pecas.find((item: any) => item.id === 'peca-a');
    expect(sistemaA).toMatchObject({ fonte: 'revisao-ativa', revisao: 'r01-ativa' });
    expect(sistemaB).toMatchObject({ fonte: 'base-estatica', revisao: null });
    expect(pecaA).toMatchObject({ fonte: 'revisao-ativa', revisao: 'r01-receita' });
  });

  it('recusa mistura quando uma fonte muda entre as duas leituras', async () => {
    const base = carregadores();
    let leituras = 0;
    const mutavel = {
      ...base,
      async carregarMontagem(entrada: any) {
        const fonte = await base.carregarMontagem(entrada);
        const valor = { ...fonte.valor, instancias: fonte.valor.instancias.map((item: any) => ({ ...item })) };
        if (entrada.id === 'sistema-a') {
          leituras += 1;
          if (leituras > 1) valor.instancias[0].id = `alterada-${leituras}`;
        }
        return { ...fonte, valor };
      },
    };
    await expect(criarSnapshotUniversoAutoria({
      universo: universo(), ...mutavel, hash: sha256Canonico, tentativas: 1,
    })).rejects.toMatchObject({ codigo: 'universo-alterado' });
  });

  it('recusa uma mudança de revisão observada durante a leitura', async () => {
    let estados = 0;
    const provedores = {
      async carregarMontagem() { return null; },
      async carregarPeca() { return null; },
      async estado() {
        estados += 1;
        return {
          formato: 'mecanifica.autoria-ativa', versao: 1,
          montagens: [{ id: 'sistema-a', revisao: estados < 2 ? 'r-a' : 'r-b', fonte: 'revisao-ativa' }], receitas: [],
        };
      },
    };
    const fontes = criarCarregadoresUniverso({
      raizMontagens: fileURLToPath(new URL('montagens/', raizFixture)),
      raizPecas: fileURLToPath(new URL('pecas/', raizFixture)),
      provedores,
    });
    await expect(criarSnapshotUniversoAutoria({
      universo: universo(), ...fontes, hash: sha256Canonico, tentativas: 1,
    })).rejects.toMatchObject({ codigo: 'universo-alterado' });
  });
});
