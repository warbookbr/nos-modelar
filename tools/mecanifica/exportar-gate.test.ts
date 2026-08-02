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
import { arquivoDaPeca, conferirPublicadas, gravarPublicadas, PUBLICADAS } from './exportar-peca.mjs';

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

  it('a lista publicada é declarada, e não "todas as peças"', () => {
    /* 42 peças no acervo, 2 no produto. Se isto virar "todas", o gate passa a
       reprovar por peça que o cliente nunca vê, e alguém vai desligá-lo. */
    expect(PUBLICADAS.length).toBeLessThan(10);
    expect(PUBLICADAS).toContain('freio-disco');
  });
});
