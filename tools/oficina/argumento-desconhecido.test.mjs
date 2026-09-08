/* Argumento fora do contrato da operação GRITA, e o passo não roda.
 *
 * O caso que abriu isto: modelando a bicicleta, `['transladar', { por: [...] }]`
 * transladou por ZERO. Sem erro, sem órfão, sem uma linha. A peça saiu no lugar
 * errado e `descrever --estrito` ficou verde, porque a malha estava perfeita —
 * só estava no sítio errado. */
import { readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { executarReceita } from '../../src/autoria/executar-receita.js';
import { usoDaOperacao } from '../../prototipos/procedural/v3/motor/uso-operacoes.js';
import { receitaDoModulo } from '../mecanifica/importar-receita.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RAIZ_RECEITAS = join(REPO, 'prototipos/procedural/v3');
const PASTAS = ['pecas', 'maquinas', 'armas', 'extensoes'];

const MATERIAIS = { m: { cor: '#888888' } };
const cilindro = ['cilindro', { origemId: 1, raio: 0.05, altura: 0.4, em: [0, 0, 0] }];
const selCilindro = { origem: { op: 'cilindro', id: 1 } };

function executar(passos) {
  return executarReceita({ PARAMS: {}, MATERIAIS, PASSOS: passos }).neutro;
}

describe('argumento desconhecido em passo', () => {
  it('grita nomeando o argumento certo, em vez de transladar por zero', () => {
    const neutro = executar([
      cilindro,
      ['transladar', { por: [1, 0, 0], sel: selCilindro }],
      ['parte', { nome: 'tubo', sel: selCilindro }],
      ['material', { usa: 'm', sel: { tudo: true } }],
    ]);
    const achado = neutro.orfaos.find((o) => o.op === 'transladar');
    expect(achado).toBeDefined();
    expect(achado.ref).toBe('por');
    expect(achado.motivo).toContain("argumento desconhecido 'por'");
    /* A lista do que a operação aceita vem junto: sem ela, o grito troca um
       silêncio por uma caça. Aqui não há sugestão, e é o certo — `por` está a
       três edições de `d`, então não é typo, é palavra errada; adivinhar ali
       seria chutar a intenção de quem escreveu. */
    expect(achado.motivo).toContain('aceita: d, sel, faces');
    expect(achado.motivo).not.toContain('Você quis dizer');
  });

  it('sugere o nome certo quando o erro É um typo', () => {
    const neutro = executar([
      cilindro,
      ['rotaciona', { eixo: 'z', grau: 30, sel: selCilindro }],
      ['parte', { nome: 'tubo', sel: selCilindro }],
      ['material', { usa: 'm', sel: { tudo: true } }],
    ]);
    const achado = neutro.orfaos.find((o) => o.ref === 'grau');
    expect(achado.motivo).toContain("Você quis dizer 'graus'?");
  });

  it('aborta o passo em vez de rodar pela metade', () => {
    /* Com `d` certo o cilindro anda; com a chave errada ele fica onde estava e
       o órfão explica por quê. O que não pode existir é o terceiro caso: ficar
       parado sem ninguém dizer nada. */
    const certo = executar([
      cilindro,
      ['transladar', { d: [1, 0, 0], sel: selCilindro }],
      ['parte', { nome: 'tubo', sel: selCilindro }],
      ['material', { usa: 'm', sel: { tudo: true } }],
    ]);
    const xCerto = [...certo.V.values()].map((p) => p[0]);
    expect(Math.min(...xCerto)).toBeGreaterThan(0.9);

    const errado = executar([
      cilindro,
      ['transladar', { por: [1, 0, 0], sel: selCilindro }],
      ['parte', { nome: 'tubo', sel: selCilindro }],
      ['material', { usa: 'm', sel: { tudo: true } }],
    ]);
    const xErrado = [...errado.V.values()].map((p) => p[0]);
    expect(Math.max(...xErrado)).toBeLessThan(0.1);
    expect(errado.orfaos.length).toBeGreaterThan(0);
  });

  it('não inventa contrato: só recusa o que a operação declara não aceitar', () => {
    /* Argumento válido continua válido, e operação sem contrato publicado
       continua aceitando o que quiser — recusar ali seria inventar uma regra. */
    const neutro = executar([
      cilindro,
      ['rotaciona', { eixo: 'z', graus: 30, pivo: [0, 0, 0], sel: selCilindro }],
      ['parte', { nome: 'tubo', sel: selCilindro }],
      ['material', { usa: 'm', sel: { tudo: true } }],
    ]);
    expect(neutro.orfaos).toHaveLength(0);
    expect(usoDaOperacao('rotaciona').schemaArgumentos.properties).toHaveProperty('graus');
  });

  it('o acervo inteiro está dentro do contrato — nenhuma peça muda por esta porta', async () => {
    /* Este é o gate da mudança, não uma curiosidade. Medido antes de ligar a
       validação: 15 receitas, 593 passos, zero chaves fora do contrato. Se
       alguém escrever uma chave inventada numa receita, este teste acusa antes
       de a peça sair torta em silêncio. */
    const alvos = [];
    for (const pasta of PASTAS) {
      let entradas;
      try { entradas = readdirSync(join(RAIZ_RECEITAS, pasta), { withFileTypes: true }); } catch { continue; }
      for (const entrada of entradas) {
        if (entrada.isDirectory()) {
          const montagem = join(RAIZ_RECEITAS, pasta, entrada.name, 'montagem.js');
          try { if (statSync(montagem).isFile()) alvos.push(montagem); } catch { /* sem montagem */ }
        } else if (entrada.name.endsWith('.js')) {
          alvos.push(join(RAIZ_RECEITAS, pasta, entrada.name));
        }
      }
    }
    expect(alvos.length).toBeGreaterThanOrEqual(15);

    const fora = [];
    let passosConferidos = 0;
    for (const caminho of alvos) {
      const receita = receitaDoModulo(await import(pathToFileURL(caminho).href));
      const passos = Array.isArray(receita?.PASSOS) ? receita.PASSOS : [];
      for (const [op, args = {}] of passos) {
        passosConferidos += 1;
        const propriedades = usoDaOperacao(op)?.schemaArgumentos?.properties;
        if (!propriedades) continue;
        for (const chave of Object.keys(args)) {
          if (!(chave in propriedades)) fora.push(`${caminho.split(/[\\/]/).pop()}: ${op}.${chave}`);
        }
      }
    }
    expect(passosConferidos).toBeGreaterThan(500);
    expect(fora).toEqual([]);
  }, 60_000);
});
