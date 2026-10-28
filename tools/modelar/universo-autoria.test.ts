/* universo-autoria.test.ts — contrato estrutural e fixture adversarial da R00. */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error — contrato JavaScript público, exercitado pela prova TypeScript.
import { ErroUniversoAutoria, lerUniversoAutoria, validarUniversoAutoria } from '../../src/autoria/ler-universo-autoria.js';

const lerJson = (nome: string) => JSON.parse(readFileSync(new URL(`./fixtures/mapa-dependencias/${nome}`, import.meta.url), 'utf8'));
const universo = () => lerJson('universo.json');
const carregar = async (ref: string) => JSON.parse(readFileSync(new URL(`./fixtures/mapa-dependencias/montagens/${ref}.json`, import.meta.url), 'utf8'));

async function recusar(dado: any, codigo: string, carregador = carregar) {
  await expect(validarUniversoAutoria(dado, { carregarMontagem: carregador })).rejects.toBeInstanceOf(ErroUniversoAutoria);
  await expect(validarUniversoAutoria(dado, { carregarMontagem: carregador })).rejects.toMatchObject({ codigo });
}

describe('universo de autoria v1 — R00', () => {
  it('valida duas raízes compartilhadas e preserva o ramo isolado', async () => {
    const resultado = await validarUniversoAutoria(universo(), { carregarMontagem: carregar });
    expect(resultado.cobertura).toEqual({ completa: true, entidades: 8 });
    expect(resultado.dependencias).toEqual([
      { montagem: 'sistema-a', alvos: ['subconjunto-compartilhado'] },
      { montagem: 'sistema-b', alvos: ['subconjunto-compartilhado'] },
      { montagem: 'sistema-isolado', alvos: [] },
      { montagem: 'subconjunto-compartilhado', alvos: [] },
    ]);
    expect(resultado.universo.raizes).toEqual(['sistema-a', 'sistema-b', 'sistema-isolado']);
  });

  it('ordena e copia o manifesto sem mutar a autoria', () => {
    const dado = universo();
    dado.raizes.reverse();
    dado.montagens.reverse();
    const antes = JSON.stringify(dado);
    const lido = lerUniversoAutoria(dado);
    expect(JSON.stringify(dado)).toBe(antes);
    expect(lido.montagens.map(({ id }: any) => id)).toEqual([
      'sistema-a', 'sistema-b', 'sistema-isolado', 'subconjunto-compartilhado',
    ]);
    expect(lido.raizes).toEqual(['sistema-a', 'sistema-b', 'sistema-isolado']);
  });

  it.each([
    ['pecas', 'id-duplicado', (dado: any) => { dado.pecas[1].id = dado.pecas[0].id; }],
    ['montagens', 'referencia-ambigua', (dado: any) => { dado.montagens[1].ref = dado.montagens[0].ref; }],
    ['raiz', 'raiz-ausente', (dado: any) => { dado.raizes[0] = 'raiz-inexistente'; }],
  ])('recusa %s inválido', async (_nome, codigo, alterar) => {
    const dado = universo();
    alterar(dado);
    await recusar(dado, codigo);
  });

  it('recusa referência de composição que não foi enumerada', async () => {
    await recusar(universo(), 'referencia-nao-enumerada', async (ref: string) => {
      const documento = await carregar(ref);
      if (ref === 'sistema-a') documento.instancias[0].alvo.ref = 'montagem-ausente';
      return documento;
    });
  });

  it('recusa identidade divergente e ciclo entre montagens', async () => {
    await recusar(universo(), 'identidade-divergente', async (ref: string) => {
      const documento = await carregar(ref);
      if (ref === 'sistema-a') documento.id = 'outro-id';
      return documento;
    });
    await recusar(universo(), 'ciclo', async (ref: string) => {
      const documento = await carregar(ref);
      if (ref === 'sistema-a') documento.instancias[0].alvo.ref = 'sistema-b';
      if (ref === 'sistema-b') documento.instancias[0].alvo.ref = 'sistema-a';
      return documento;
    });
  });
});
