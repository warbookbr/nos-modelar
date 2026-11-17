/* etapas-reabrir-braco.test.mjs — reabrir a base do braço robótico, com a receita de agora (a caixa lateral com a placa de
   controle e a tampa, plano da família de componentes eletrônicos), sobre o registro de etapas de antes da mudança, guardado em
   `tools/fixtures/reabrir-a-base-do-braco/`. As onze etapas de cima ficam fixas: nenhuma mudou de forma, e o anel da cintura, a
   única que cita uma porta da base, a cita pela junta medida anelSentaNaBase (além do vínculo e da posição), com a medida do
   registro de antes, que não guardava as portas; a reabertura guarda as portas assim provadas.
   O teste não grava o registro. Ele vale enquanto as onze etapas de cima tiverem a forma do aceite guardado na fixture; mudar
   uma delas com aceite da pessoa pede regravar a fixture. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { reabrir } from './etapas-da-montagem.mjs';

const MONTAGEM = fileURLToPath(new URL('../../procedural/pecas/braco-robotico/montagem.json', import.meta.url));
const ANTES = JSON.parse(readFileSync(new URL('../fixtures/reabrir-a-base-do-braco/registro-antes-da-placa.json', import.meta.url), 'utf8'));

describe('reabrir a base do braço com a receita nova', () => {
  it('a base fica aberta e as onze posteriores ficam fixas, cada uma com a prova', async () => {
    const { registro, provas } = await reabrir(MONTAGEM, 'base', 'Tiago, 2026-11-17: placa de controle e tampa transparente na caixa lateral', { anterior: ANTES, comProvas: true });
    expect(registro.etapas[0]).toMatchObject({ instancia: 'base', estado: 'aberta' });
    expect(registro.etapas.slice(1).map((e) => [e.instancia, e.estado])).toEqual(ANTES.etapas.slice(1).map((e) => [e.instancia, 'fixa']));
    expect(provas).toHaveLength(11);
    expect(provas[0]).toBe("anelCintura: forma do aceite, a porta 'assento' provada pela junta 'anelSentaNaBase', com a medida do registro anterior (as portas do aceite não estão guardadas)");
    expect(provas.slice(1).every((p) => p.endsWith(', sem citar porta de etapa reaberta ou não provada'))).toBe(true);
    /* o aceite antigo da base segue em reaberturas, e as portas de agora ficam guardadas para a próxima reabertura */
    expect(registro.etapas[0].reaberturas.at(-2)).toMatchObject({ por: 'leitura do registro', aceite: ANTES.etapas[0].aceite, forma: ANTES.etapas[0].forma });
    expect(Object.keys(registro.etapas[0].portas)).toEqual(['assento']);
    expect(registro.etapas[0].reaberturas.at(-1).portas).toEqual(registro.etapas[0].portas);
  }, 300_000);
});
