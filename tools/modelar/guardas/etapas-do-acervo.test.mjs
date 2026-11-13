/* etapas-do-acervo.test.mjs — a releitura de todo `montagem.etapas.json` do acervo.
 *
 * A etapa que a pessoa fixou vale pela forma que ela aceitou. Quem muda a receita de uma parte fixa, ou de uma parte anterior de que
 * ela depende, muda o que foi aceito sem ninguém perceber, e a ferramenta de etapas só acusa quando alguém a roda (em 2026-10-28 o
 * texto do braço e do avião mudou e as etapas só quebraram na leitura seguinte). Este teste lê cada registro como a ferramenta lê,
 * sem gravar, e reprova a etapa fixa que a leitura não devolve fixa. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { estadoDasEtapas } from '../etapas-da-montagem.mjs';
import { REPO } from '../resolver-caminho-receita.mjs';

const ACERVO = join(REPO, 'procedural/pecas');
const MONTAGENS = readdirSync(ACERVO).map((objeto) => join(ACERVO, objeto, 'montagem.json'))
  .filter((arquivo) => existsSync(arquivo) && existsSync(arquivo.replace(/\.json$/, '.etapas.json')));

describe('as etapas fixas do acervo seguem fixas na releitura', () => {
  it('o acervo tem registro de etapas para reler', () => {
    expect(MONTAGENS.length).toBeGreaterThan(0);
  });

  for (const arquivo of MONTAGENS) {
    const nome = arquivo.slice(ACERVO.length + 1).replace(/\/montagem\.json$/, '');
    it(`${nome}: nenhuma etapa fixa quebra ao ser relida`, async () => {
      const gravado = JSON.parse(readFileSync(arquivo.replace(/\.json$/, '.etapas.json'), 'utf8'));
      const { registro } = await estadoDasEtapas(arquivo);
      const quebradas = gravado.etapas.filter((e) => e.estado === 'fixa')
        .map((e) => registro.etapas.find((r) => r.instancia === e.instancia))
        .filter((r) => r && r.estado !== 'fixa');
      const mensagem = quebradas.map((r) => `etapa '${r.instancia}' da montagem '${nome}' estava fixa e a releitura a devolve ${r.estado} (${r.motivo ?? 'sem motivo'}): `
        + 'a receita dela ou de uma parte anterior mudou depois do aceite. Reabra a etapa com a pessoa (`npm run etapas -- <montagem.json> --reabrir <instância> --por "<quem, data: motivo>"`) ou desfaça a mudança.').join('\n');
      expect(quebradas.map((r) => r.instancia), mensagem).toEqual([]);
      /* reler a montagem do sedã leva 199 s na máquina local (2026-11-13), contra 3 a 11 s das outras: só a carroceria dele, de 174 mil faces com o
         chassi aparado pela lataria, executa em mais de 3 minutos. O limite é o dos outros testes que percorrem o acervo; o custo é da receita do
         sedã, anotado no fechamento da fatia 4c do plano do núcleo, e não deste teste. */
    }, 900_000);
  }
});
