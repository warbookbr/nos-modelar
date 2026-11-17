/* etapas-do-acervo.test.mjs — a releitura de todo `montagem.etapas.json` do acervo, pela impressão do aceite.
 *
 * A etapa que a pessoa fixou vale pela impressão que ela aceitou: a forma, os parâmetros, a pose, as juntas, as portas que ela cita e a
 * ordem das anteriores. Quem muda a receita de uma parte fixa, ou de uma parte anterior de que ela depende, muda o que foi aceito sem
 * ninguém perceber, e a ferramenta de etapas só acusa quando alguém a roda (em 2026-10-28 o texto do braço e do avião mudou e as etapas
 * só quebraram na leitura seguinte). Este teste lê cada registro como a ferramenta lê, sem gravar, e reprova a etapa com aceite
 * vigente que a leitura não devolve fixa; a mensagem lista a origem de cada impressão (a história do commit do aceite, ou a impressão
 * de agora herdada na migração, com a porta não provada). O acervo foi migrado em 2026-11-17: 52 etapas, 43 pela história e 9 herdadas. */
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

  /* a origem de cada impressão migrada, como a migração a gravou: `commit do aceite` (reconstruída pela árvore do commit, com o hash da
     forma como contraprova) ou `impressão de agora` (a do dia da migração, com a porta citada não provada) */
  const ORIGENS = {
    aviao: { 'impressão de agora': 8 },
    'braco-robotico': { 'commit do aceite': 11, 'impressão de agora': 1 },
    'carrinho-de-mao': { 'commit do aceite': 4 },
    empilhadeira: { 'commit do aceite': 23 },
    'sedan-chassi-e-lataria': { 'commit do aceite': 5 },
  };

  for (const arquivo of MONTAGENS) {
    const nome = arquivo.slice(ACERVO.length + 1).replace(/\/montagem\.json$/, '');
    it(`${nome}: nenhuma etapa com aceite quebra ao ser relida, e a origem de cada impressão é a migrada`, async () => {
      const gravado = JSON.parse(readFileSync(arquivo.replace(/\.json$/, '.etapas.json'), 'utf8'));
      expect(gravado.versao, `${nome}: o registro deve ser da versão 3; migre-o com migrar-etapas-para-impressao.mjs`).toBe(3);
      const { leitura } = await estadoDasEtapas(arquivo);
      const comAceite = new Map(gravado.eventos.filter((e) => e.tipo === 'aceite').map((e) => [e.instancia, e]));
      const naoFixas = leitura.etapas.filter((e) => comAceite.has(e.instancia) && e.estado !== 'fixa');
      const mensagem = naoFixas.map((e) => `etapa '${e.instancia}' da montagem '${nome}' tem aceite (impressão: ${comAceite.get(e.instancia).origem?.via ?? 'dada com o aceite'}) e a releitura a devolve ${e.estado} (${e.motivo ?? 'sem motivo'}): `
        + 'a receita dela ou de uma parte anterior mudou depois do aceite. Reabra a etapa com a pessoa (`npm run etapas -- <montagem.json> --reabrir <instância> --por "<quem, data: motivo>"`) ou desfaça a mudança.').join('\n');
      expect(naoFixas.map((e) => e.instancia), mensagem).toEqual([]);
      const porOrigem = {};
      for (const e of comAceite.values()) porOrigem[e.origem?.via ?? 'dada com o aceite'] = (porOrigem[e.origem?.via ?? 'dada com o aceite'] ?? 0) + 1;
      const listadas = [...comAceite.values()].map((e) => `${e.instancia}: ${e.origem?.via ?? 'dada com o aceite'}${e.origem?.portaNaoProvada ? ' (porta não provada)' : ''}`);
      expect(porOrigem, `as origens das impressões de '${nome}':\n${listadas.join('\n')}`).toEqual(ORIGENS[nome] ?? porOrigem);
      /* reler a montagem do sedã leva 199 s na máquina local (2026-11-13), contra 3 a 11 s das outras: só a carroceria dele, de 174 mil faces com o
         chassi aparado pela lataria, executa em mais de 3 minutos. O limite é o dos outros testes que percorrem o acervo; o custo é da receita do
         sedã, anotado no fechamento da fatia 4c do plano do núcleo, e não deste teste. */
    }, 900_000);
  }
});
