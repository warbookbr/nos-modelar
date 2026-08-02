/* coord.test.mjs — prova mensagens imutáveis, leitura econômica, confirmações
   independentes e bloqueio de reservas sobrepostas do canal entre agentes. */
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  confirmarMensagem, enviarMensagem, liberar, listarInbox, lerMensagem, reservar,
} from './coord.mjs';

const temporarios = [];
function raiz() {
  const pasta = mkdtempSync(join(tmpdir(), 'mecanifica-coord-'));
  temporarios.push(pasta);
  return pasta;
}
afterEach(() => {
  while (temporarios.length) rmSync(temporarios.pop(), { recursive: true, force: true });
});
describe('coordenação local', () => {
  it('mostra somente cabeçalhos novos e ordena o mais recente primeiro', async () => {
    const root = raiz();
    const antiga = enviarMensagem({ raiz: root, de: 'codex', para: 'claude', tipo: 'estado', assunto: 'primeira' });
    await new Promise((resolve) => setTimeout(resolve, 2));
    const nova = enviarMensagem({ raiz: root, de: 'codex', para: 'claude', tipo: 'entrega', assunto: 'segunda', corpo: 'detalhe longo' });

    expect(listarInbox({ raiz: root, agente: 'claude' }).map((m) => m.id)).toEqual([nova.id, antiga.id]);
    confirmarMensagem({ raiz: root, agente: 'claude', id: nova.id });
    expect(listarInbox({ raiz: root, agente: 'claude' }).map((m) => m.id)).toEqual([antiga.id]);
    expect(lerMensagem({ raiz: root, id: nova.id }).corpo).toBe('detalhe longo');
  });

  it('mantém leitura independente para cada destinatário de uma mensagem geral', () => {
    const root = raiz();
    const mensagem = enviarMensagem({ raiz: root, de: 'codex', tipo: 'decisao', assunto: 'base escolhida' });
    confirmarMensagem({ raiz: root, agente: 'claude', id: mensagem.id });
    expect(listarInbox({ raiz: root, agente: 'claude' })).toHaveLength(0);
    expect(listarInbox({ raiz: root, agente: 'codex' })).toHaveLength(1);
  });

  it('recusa sobreposição por arquivo ou identidade e aceita após liberação', () => {
    const root = raiz();
    const primeira = reservar({ raiz: root, agente: 'codex', repo: 'warbook', arquivos: ['docs/mecanifica'], identidades: ['A-40'] });
    expect(() => reservar({ raiz: root, agente: 'claude', repo: 'brigsd', arquivos: ['docs/mecanifica/PLANO.md'] })).toThrow(/conflita/);
    expect(() => reservar({ raiz: root, agente: 'claude', repo: 'brigsd', identidades: ['A-40'] })).toThrow(/conflita/);
    liberar({ raiz: root, agente: 'codex', id: primeira.id });
    expect(() => reservar({ raiz: root, agente: 'claude', repo: 'brigsd', identidades: ['A-40'] })).not.toThrow();
  });
});
