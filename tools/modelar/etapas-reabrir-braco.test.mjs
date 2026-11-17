/* etapas-reabrir-braco.test.mjs — reabrir a base do braço robótico sobre o registro v3 do acervo (migrado das impressões dos
   commits dos aceites): reabrir só acrescenta um evento, e as onze etapas de cima seguem fixas pela impressão delas; aceitar a base
   de novo devolve as doze. O teste não grava o registro. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { registrarRodada } from '../../src/autoria/laco-de-modelagem.js';
import { arquivoDoRegistro, estadoDasEtapas, fixarComLeitura, reabrir } from './etapas-da-montagem.mjs';

const MONTAGEM = fileURLToPath(new URL('../../procedural/pecas/braco-robotico/montagem.json', import.meta.url));

describe('reabrir a base do braço pela impressão do aceite', () => {
  it('reabrir a base acrescenta um evento e a leitura devolve as onze fixas; fixar de novo devolve as doze', async () => {
    const v3 = JSON.parse(readFileSync(arquivoDoRegistro(MONTAGEM), 'utf8'));
    const ordem = v3.eventos.map((e) => e.instancia);
    expect(v3.eventos).toHaveLength(12);
    const reaberto = await reabrir(MONTAGEM, 'base', 'pessoa, 2026-11-17: prova da fatia 2', { anterior: v3 });
    expect(reaberto.eventos).toHaveLength(13);
    expect(reaberto.eventos.slice(0, 12)).toEqual(v3.eventos);
    const depois = await estadoDasEtapas(MONTAGEM, { anterior: reaberto });
    expect(depois.leitura.etapas.map((e) => [e.instancia, e.estado])).toEqual(ordem.map((id) => [id, id === 'base' ? 'aberta' : 'fixa']));
    const rodada = (peca) => registrarRodada({ peca, numero: 1, medidas: { passou: true, relatorio: 'ok' }, partes: [{ nome: 'corpo', confere: true }],
      veredito: { alvo: 'referencias/x.png', nota: 9, defeitos: [], observacao: 'a peça bate com a referência nas quatro vistas' }, notaDePassagem: 'nota' });
    const refeito = await fixarComLeitura(MONTAGEM, 'base', { por: 'pessoa, 2026-11-17' }, { anterior: reaberto, rodadasDe: (ref) => [rodada(ref)] });
    expect(refeito.leitura.etapas.every((e) => e.estado === 'fixa')).toBe(true);
    expect(refeito.avisos).toEqual([]);
    expect(refeito.registro.eventos).toHaveLength(14);
  }, 400_000);
});

