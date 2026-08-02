/* exportar-gate.test.ts — A-60, segunda metade: o gate que acusa arquivo velho.

   O `exportar-peca.test.ts` prova que o arquivo NASCE certo. Este prova a coisa
   que de fato vai acontecer um dia: alguém muda a peça, esquece de gerar o
   arquivo de novo, e o produto passa a mostrar a peça de ontem — com a mesma
   cara de sempre, sem erro, sem aviso.

   Nenhum teste do núcleo pega isso, porque do lado do núcleo está tudo certo.
   O defeito mora entre os dois repositórios, que é justamente onde ninguém
   olha. */
import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// @ts-expect-error — ferramenta em JavaScript, exercitada pela API pública.
import { arquivoDaPeca, arquivoDoManifesto, CAMINHO_DO_LEITOR, conferirPublicadas, FORMATO, gravarPublicadas, hashDoLeitor, PUBLICADAS, VERSAO } from './exportar-peca.mjs';

/* PASTA TEMPORÁRIA, E ESTA DECISÃO CUSTOU CARO PARA SER DESCOBERTA.

   A primeira versão destes testes escrevia em `pecas-resolvidas/` DE VERDADE.
   O estrago não era sujar a árvore de quem roda `npm test`: no `ci.yml`,
   `Unit Tests` roda ANTES de `exportar:check`, então a suíte regenerava os
   arquivos e o gate NUNCA podia reprovar. Ele existia, rodava, e passava
   sempre — a condição que não pode falhar, que é o defeito que este projeto
   caça.

   Descobri porque o gate devolveu 0 onde eu esperava 1, e fui atrás em vez de
   aceitar o verde. */
const TMP = mkdtempSync(join(tmpdir(), 'mecanifica-gate-'));
const ALVO = arquivoDaPeca(PUBLICADAS[0], TMP);
const gravar = (nomes = PUBLICADAS) => gravarPublicadas(nomes, TMP);
const conferir = (nomes = PUBLICADAS) => conferirPublicadas(nomes, TMP);
const manifesto = () => arquivoDoManifesto(TMP);
afterAll(() => rmSync(TMP, { recursive: true, force: true }));

describe('A-60 — o gate do arquivo publicado', () => {
  it('depois de gravar, o gate aprova', async () => {
    await gravar();
    expect(await conferir()).toEqual([]);
  });

  it('★ acusa quando a peça mudou e o arquivo não foi gerado de novo', async () => {
    /* simulo o esquecimento pelo outro lado: em vez de mexer na peça e gerar,
       mexo no ARQUIVO. O efeito medido é o mesmo — arquivo e receita
       divergem — e não preciso sujar uma peça do acervo para provar. */
    await gravar();
    const bom = readFileSync(ALVO, 'utf8');
    writeFileSync(ALVO, bom.replace(/"receita": "[0-9a-f]{16}"/, '"receita": "0000000000000000"'), 'utf8');

    const problemas = await conferir();
    expect(problemas.length, 'arquivo divergente tem de reprovar').toBe(1);
    expect(problemas[0].nome).toBe(PUBLICADAS[0]);
    expect(problemas[0].motivo, 'a reprova precisa dizer o que fazer').toMatch(/npm run exportar/);
  });

  it('★ acusa arquivo que sumiu, em vez de aprovar por ausência', async () => {
    /* o modo de falhar mais perigoso: nenhum arquivo, nada para comparar,
       gate verde. Aprovar por ausência é o no-op silencioso da vez. */
    await gravar();
    rmSync(ALVO, { force: true });

    const problemas = await conferir();
    expect(problemas.length).toBe(1);
    expect(problemas[0].motivo).toMatch(/não existe/);
  });

  it('★ um byte trocado no meio da geometria reprova', async () => {
    /* a marca da receita continuaria igual: a receita não mudou, o ARQUIVO é
       que foi adulterado. Se o gate olhasse só a marca, isto passaria. */
    await gravar();
    const bom = readFileSync(ALVO, 'utf8');
    writeFileSync(ALVO, bom.replace('"V": [', '"V": [\n    [999999, 1, 2, 3],'), 'utf8');

    const problemas = await conferir();
    expect(problemas.length, 'conteúdo adulterado com marca intacta tem de reprovar').toBe(1);
  });

  it('★ o manifesto grava a impressão digital do LEITOR', async () => {
    /* O BURACO QUE ISTO FECHA. `src/autoria/ler-peca-resolvida.js` existe nos
       DOIS repositórios, por cópia. O teste de ida-e-volta prova que escritor e
       leitor concordam DENTRO desta oficina; ele não diz nada sobre a cópia que
       roda no navegador do cliente.

       Sem trava, o modo de falhar é silencioso e demorado: alguém muda o
       formato aqui, atualiza as duas pontas daqui, todos os gates ficam verdes,
       a entrega passa. A cópia do produto continua velha, lê com regra antiga
       um arquivo escrito com regra nova, e desenha errado — sem exceção,
       porque as duas regras são válidas, só não são a mesma. */
    await gravar();
    const m = JSON.parse(readFileSync(manifesto(), 'utf8'));
    expect(m.formato).toBe(FORMATO);
    expect(m.versao).toBe(VERSAO);
    expect(m.leitor.arquivo).toBe('src/autoria/ler-peca-resolvida.js');
    expect(m.leitor.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(m.leitor.sha256).toBe(hashDoLeitor());
    expect(m.pecas).toEqual([...PUBLICADAS].sort());
  });

  it('★ o hash do leitor NÃO muda por causa de fim de linha', async () => {
    /* um clone no Windows traz CRLF. Sem normalizar, o hash mudaria sozinho e
       o produto reprovaria por um `\r` — o mesmo defeito que já derrubou o
       `mapa:check` e o `docs:toc:check` deste repositório sem uma linha de
       código ter mudado. */
    const antes = hashDoLeitor();
    const cru = readFileSync(CAMINHO_DO_LEITOR, 'utf8');
    try {
      writeFileSync(CAMINHO_DO_LEITOR, cru.replace(/\n/g, '\r\n'), 'utf8');
      expect(hashDoLeitor(), 'CRLF não pode virar defeito de produto').toBe(antes);
    } finally {
      writeFileSync(CAMINHO_DO_LEITOR, cru, 'utf8');
    }
    expect(hashDoLeitor()).toBe(antes);
  });

  it('★ leitor alterado sem manifesto novo REPROVA', async () => {
    await gravar();
    expect(await conferir()).toEqual([]);

    const cru = readFileSync(CAMINHO_DO_LEITOR, 'utf8');
    try {
      writeFileSync(CAMINHO_DO_LEITOR, `${cru}\n/* uma mudança qualquer no leitor. */\n`, 'utf8');
      const problemas = await conferir();
      expect(problemas.length, 'o leitor mudou e o manifesto ficou velho').toBeGreaterThan(0);
      expect(problemas.some((p: any) => /leitor/i.test(p.motivo)), 'a reprova precisa dizer que foi o leitor').toBe(true);
      expect(problemas.some((p: any) => /npm run exportar/.test(p.motivo))).toBe(true);
    } finally {
      writeFileSync(CAMINHO_DO_LEITOR, cru, 'utf8');
    }
    await gravar();
    expect(await conferir(), 'restaurado e regerado, volta a aprovar').toEqual([]);
  });

  it('★ manifesto ausente REPROVA, em vez de aprovar por falta', async () => {
    await gravar();
    const guarda = readFileSync(manifesto(), 'utf8');
    try {
      rmSync(manifesto(), { force: true });
      const problemas = await conferir();
      expect(problemas.length).toBeGreaterThan(0);
      expect(problemas.some((p: any) => /manifesto/i.test(p.motivo))).toBe(true);
    } finally {
      writeFileSync(manifesto(), guarda, 'utf8');
    }
  });

  it('★★ rodar a suíte NÃO regenera `pecas-resolvidas/` de verdade', async () => {
    /* A TRAVA DO DEFEITO QUE ESTE ARQUIVO JÁ TEVE. Enquanto os testes
       escreviam na pasta real, o `exportar:check` do CI era decorativo:
       `Unit Tests` roda antes dele e deixava tudo em dia.

       Este caso suja a pasta REAL, roda tudo que os outros casos rodam, e
       exige que a sujeira continue lá. Se alguém voltar a chamar
       `gravarPublicadas()` sem destino, a sujeira some e este caso cai. */
    const real = arquivoDaPeca(PUBLICADAS[0]);
    const bom = readFileSync(real, 'utf8');
    try {
      writeFileSync(real, `${bom}\n`, 'utf8');
      const sujoAntes = readFileSync(real, 'utf8');

      await gravar();
      await conferir();

      expect(readFileSync(real, 'utf8'), 'a suíte mexeu no arquivo publicado de verdade')
        .toBe(sujoAntes);
    } finally {
      writeFileSync(real, bom, 'utf8');
    }
    /* e a pasta temporária é mesmo outra. */
    expect(arquivoDaPeca(PUBLICADAS[0], TMP)).not.toBe(real);
  });

  it('a lista publicada é declarada, e não "todas as peças"', () => {
    /* 42 peças no acervo, 2 no produto. Se isto virar "todas", o gate passa a
       reprovar por peça que o cliente nunca vê, e alguém vai desligá-lo. */
    expect(PUBLICADAS.length).toBeLessThan(10);
    expect(PUBLICADAS).toContain('freio-disco');
  });
});
