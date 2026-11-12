/* custo-por-peca.test.mjs — os números da tabela de custo numa fixture de duas peças, a rodada incompleta e a saída estável. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { contarAtribuicoes, custoDoObjeto, emTexto, rodar } from './custo-por-peca.mjs';

const raiz = mkdtempSync(join(tmpdir(), 'custo-por-peca-'));
afterAll(() => rmSync(raiz, { recursive: true, force: true }));

const defeitos = (n) => Array.from({ length: n }, (_, i) => ({ parte: `p${i}`, tipo: 'superficie' }));
function rodada(pasta, peca, numero, campos) {
  const dir = join(pasta, 'partes', peca, 'rodadas');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `rodada-${String(numero).padStart(2, '0')}.json`),
    JSON.stringify({ formato: 'mecanifica.rodada-de-modelagem', versao: 1, peca: `obj/${peca}`, numero, ...campos }));
}

const objeto = join(raiz, 'objeto');
rodada(objeto, 'simples', 1, { veredito: { nota: 8, defeitos: [] }, atrito: ['nada a registrar'], registradaEm: '2026-11-01T10:00:00.000Z' });
rodada(objeto, 'dificil', 1, {
  veredito: { nota: 6, defeitos: defeitos(4) },
  atrito: ['rodada 1, cantos em quina: atribuidos ao modelador, vao a rodada 2', 'rodada 1, abas: atribuido ao plano, fica para a pessoa'],
  data: '2026-11-01',
});
rodada(objeto, 'dificil', 2, {
  veredito: { nota: 6, defeitos: defeitos(3) },
  atrito: ['rodada 2, facetas: atribuído à ferramenta', 'rodada 2, sombra lida como fresta: atribuido ao critico'],
  data: '2026-11-02',
});
rodada(objeto, 'dificil', 3, {
  veredito: { nota: 7, defeitos: defeitos(2) },
  atrito: ['rodada 3, raio do aro: atribuido a familia; rodada 3, borda: atribuido ao modelador', 'sem atribuição aqui'],
  data: '2026-11-03',
});
writeFileSync(join(objeto, 'montagem.json'), JSON.stringify({
  instancias: [{ id: 'dificilEsquerda', alvo: { tipo: 'peca', ref: 'obj/dificil' } }, { id: 'simples', alvo: { tipo: 'peca', ref: 'obj/simples' } }],
}));
writeFileSync(join(objeto, 'montagem.etapas.json'), JSON.stringify({
  etapas: [
    { instancia: 'simples', estado: 'fixa', aceite: { por: 'a pessoa, 2026-11-04: fixa' } },
    { instancia: 'dificilEsquerda', estado: 'fixa', aceite: { por: 'a pessoa, 2026-11-05: aceito', defeitosAceitos: ['a', 'b'] } },
  ],
}));

describe('custo por peça', () => {
  it('dá os números da fixture de duas peças', () => {
    const c = custoDoObjeto(objeto);
    const [dificil, simples] = c.pecas;
    expect(simples).toMatchObject({ peca: 'simples', rodadas: 1, notas: [8], notaFinal: 8, defeitos: [0], defeitosAbertos: 0, fecho: 'critico',
      primeiraRodada: '2026-11-01', ultimaRodada: '2026-11-01' });
    expect(dificil).toMatchObject({ peca: 'dificil', rodadas: 3, notas: [6, 6, 7], notaFinal: 7, defeitos: [4, 3, 2], defeitosNaUltima: 2,
      defeitosAbertos: 2, defeitosAceitos: 2, fecho: 'aceite', dataDoAceite: '2026-11-05', primeiraRodada: '2026-11-01', ultimaRodada: '2026-11-03' });
    expect(dificil.atribuicoes).toEqual({ modelador: 2, plano: 1, ferramenta: 1, critico: 1, familia: 1 });
    expect(c.resumo).toEqual({
      pecas: 2, rodadas: 4, mediaDeRodadas: 2, fecharamNaPrimeira: 1, notasFinais: { 7: 1, 8: 1 },
      fechos: { aceite: 1, critico: 1 }, defeitosAbertos: 2, atribuicoes: { modelador: 2, plano: 1, ferramenta: 1, critico: 1, familia: 1 },
      primeiraData: '2026-11-01', ultimaData: '2026-11-03',
    });
    expect(emTexto(c)).toContain('datas das rodadas: 2026-11-01 a 2026-11-03');
  });

  it('não inventa atribuição sem palavra-chave', () => {
    expect(contarAtribuicoes(['o crítico leu a fresta', 'a ferramenta suaviza', 42, null])).toEqual(
      { modelador: 0, plano: 0, ferramenta: 0, critico: 0, familia: 0 });
    expect(contarAtribuicoes(undefined).plano).toBe(0);
  });

  it('rodada com campo ausente ou ilegível não quebra, e peça de arquivo único vale', () => {
    const unica = join(raiz, 'unica');
    mkdirSync(join(unica, 'rodadas'), { recursive: true });
    writeFileSync(join(unica, 'rodadas', 'rodada-01.json'), JSON.stringify({ numero: 1 }));
    writeFileSync(join(unica, 'rodadas', 'rodada-02.json'), '{ quebrado');
    const c = custoDoObjeto(unica);
    expect(c.pecas).toHaveLength(1);
    expect(c.pecas[0]).toMatchObject({ peca: 'unica', rodadas: 2, notas: [null, null], defeitos: [null, null], fecho: 'sem veredito',
      defeitosAceitos: null, primeiraRodada: null, ilegiveis: [2] });
    expect(c.resumo.notasFinais).toEqual({ 'sem nota': 1 });
    expect(emTexto(c)).toContain('sem veredito');
    /* a rodada antiga, sem data, continua lida, e o resumo diz que não há data */
    expect(c.resumo).toMatchObject({ primeiraData: null, ultimaData: null });
    expect(emTexto(c)).toContain('datas das rodadas: sem data registrada');
  });

  it('a mesma entrada dá a mesma saída, e pasta sem rodada é recusada', () => {
    expect(rodar([objeto, '--json']).texto).toBe(rodar([objeto, '--json']).texto);
    expect(rodar([objeto]).texto).toBe(rodar([objeto]).texto);
    expect(rodar([raiz + '/nada']).codigo).toBe(2);
    expect(rodar([objeto, '--x']).codigo).toBe(2);
  });
});

describe('as duas escritas da atribuição', async () => {
  const { contarAtribuicoes } = await import('./custo-por-peca.mjs');
  it('conta "atribuição: plano" como "atribuído ao plano", com o núcleo na ferramenta e a instrução no plano', () => {
    expect(contarAtribuicoes([
      'defeito 1 segue os braços; atribuição: plano, que não diz isso ao crítico',
      'emenda da varredura; atribuição: núcleo, a confirmar',
      'sem MODELAR_BLENDER; atribuição: instrução de despacho',
      'vem da família; atribuição: família',
      'sem atribuição aqui',
    ])).toEqual({ modelador: 0, plano: 2, ferramenta: 1, critico: 0, familia: 1 });
  });
});

