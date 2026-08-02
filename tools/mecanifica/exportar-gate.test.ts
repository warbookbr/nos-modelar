/* exportar-gate.test.ts — A-60, segunda metade: o gate que acusa arquivo velho.

   O `exportar-peca.test.ts` prova que o arquivo NASCE certo. Este prova a coisa
   que de fato vai acontecer um dia: alguém muda a peça, esquece de gerar o
   arquivo de novo, e o produto passa a mostrar a peça de ontem — com a mesma
   cara de sempre, sem erro, sem aviso.

   Nenhum teste do núcleo pega isso, porque do lado do núcleo está tudo certo.
   O defeito mora entre os dois repositórios, que é justamente onde ninguém
   olha. */
import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
// @ts-expect-error — ferramenta em JavaScript, exercitada pela API pública.
import { arquivoDaPeca, arquivoDoManifesto, CAMINHO_DO_LEITOR, conferirPublicadas, FORMATO, gravarPublicadas, hashDoLeitor, PUBLICADAS, VERSAO } from './exportar-peca.mjs';

const ALVO = arquivoDaPeca(PUBLICADAS[0]);
const GUARDA = `${ALVO}.teste-bak`;

/* o teste mexe em arquivo de verdade, então guarda o original e devolve ao
   final, aconteça o que acontecer. */
const salvar = () => { if (existsSync(ALVO)) renameSync(ALVO, GUARDA); };
const devolver = () => {
  if (existsSync(GUARDA)) { rmSync(ALVO, { force: true }); renameSync(GUARDA, ALVO); }
};
afterAll(devolver);

describe('A-60 — o gate do arquivo publicado', () => {
  it('depois de gravar, o gate aprova', async () => {
    await gravarPublicadas();
    expect(await conferirPublicadas()).toEqual([]);
  });

  it('★ acusa quando a peça mudou e o arquivo não foi gerado de novo', async () => {
    /* simulo o esquecimento pelo outro lado: em vez de mexer na peça e gerar,
       mexo no ARQUIVO. O efeito medido é o mesmo — arquivo e receita
       divergem — e não preciso sujar uma peça do acervo para provar. */
    await gravarPublicadas();
    const bom = readFileSync(ALVO, 'utf8');
    salvar();
    writeFileSync(ALVO, bom.replace(/"receita": "[0-9a-f]{16}"/, '"receita": "0000000000000000"'), 'utf8');

    const problemas = await conferirPublicadas();
    expect(problemas.length, 'arquivo divergente tem de reprovar').toBe(1);
    expect(problemas[0].nome).toBe(PUBLICADAS[0]);
    expect(problemas[0].motivo, 'a reprova precisa dizer o que fazer').toMatch(/npm run exportar/);
    devolver();
  });

  it('★ acusa arquivo que sumiu, em vez de aprovar por ausência', async () => {
    /* o modo de falhar mais perigoso: nenhum arquivo, nada para comparar,
       gate verde. Aprovar por ausência é o no-op silencioso da vez. */
    await gravarPublicadas();
    salvar();
    rmSync(ALVO, { force: true });

    const problemas = await conferirPublicadas();
    expect(problemas.length).toBe(1);
    expect(problemas[0].motivo).toMatch(/não existe/);
    devolver();
  });

  it('★ um byte trocado no meio da geometria reprova', async () => {
    /* a marca da receita continuaria igual: a receita não mudou, o ARQUIVO é
       que foi adulterado. Se o gate olhasse só a marca, isto passaria. */
    await gravarPublicadas();
    const bom = readFileSync(ALVO, 'utf8');
    salvar();
    writeFileSync(ALVO, bom.replace('"V": [', '"V": [\n    [999999, 1, 2, 3],'), 'utf8');

    const problemas = await conferirPublicadas();
    expect(problemas.length, 'conteúdo adulterado com marca intacta tem de reprovar').toBe(1);
    devolver();
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
    await gravarPublicadas();
    const m = JSON.parse(readFileSync(arquivoDoManifesto(), 'utf8'));
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
    await gravarPublicadas();
    expect(await conferirPublicadas()).toEqual([]);

    const cru = readFileSync(CAMINHO_DO_LEITOR, 'utf8');
    try {
      writeFileSync(CAMINHO_DO_LEITOR, `${cru}\n/* uma mudança qualquer no leitor. */\n`, 'utf8');
      const problemas = await conferirPublicadas();
      expect(problemas.length, 'o leitor mudou e o manifesto ficou velho').toBeGreaterThan(0);
      expect(problemas.some((p: any) => /leitor/i.test(p.motivo)), 'a reprova precisa dizer que foi o leitor').toBe(true);
      expect(problemas.some((p: any) => /npm run exportar/.test(p.motivo))).toBe(true);
    } finally {
      writeFileSync(CAMINHO_DO_LEITOR, cru, 'utf8');
    }
    await gravarPublicadas();
    expect(await conferirPublicadas(), 'restaurado e regerado, volta a aprovar').toEqual([]);
  });

  it('★ manifesto ausente REPROVA, em vez de aprovar por falta', async () => {
    await gravarPublicadas();
    const guarda = readFileSync(arquivoDoManifesto(), 'utf8');
    try {
      rmSync(arquivoDoManifesto(), { force: true });
      const problemas = await conferirPublicadas();
      expect(problemas.length).toBeGreaterThan(0);
      expect(problemas.some((p: any) => /manifesto/i.test(p.motivo))).toBe(true);
    } finally {
      writeFileSync(arquivoDoManifesto(), guarda, 'utf8');
    }
  });

  it('a lista publicada é declarada, e não "todas as peças"', () => {
    /* 42 peças no acervo, 2 no produto. Se isto virar "todas", o gate passa a
       reprovar por peça que o cliente nunca vê, e alguém vai desligá-lo. */
    expect(PUBLICADAS.length).toBeLessThan(10);
    expect(PUBLICADAS).toContain('freio-disco');
  });
});
