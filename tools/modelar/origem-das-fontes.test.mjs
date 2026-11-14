import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pecasDoAcervo } from './guardas/guarda-acervo.mjs';

/* A tabela fonte -> pacote das 27 referências de veículos (docs/modelar/veiculos-referencias.json) é conferida contra duas coisas que a pessoa ou o agente escrevem à mão:
   o campo `arquivo` de cada `referencias/fonte-partes.json` e a linha de origem de cada `referencias/alvo.md`. A perua chegou a declarar origem autor A
   sendo a Wagon do pacote D; nada acusava. */
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TABELA = JSON.parse(readFileSync(join(REPO, 'docs/modelar/veiculos-referencias.json'), 'utf8'));
const ler = (c) => readFileSync(join(REPO, c), 'utf8');
/* O bloco de origem: da primeira linha que diz "origem" até o próximo título ou até o fim do parágrafo (linha em branco depois de texto). */
function blocoDeOrigem(texto) {
  const l = texto.split('\n'); const i = l.findIndex((x) => /origem/i.test(x) && !/^#\s/.test(x));
  if (i < 0) return '';
  const bloco = [l[i]];
  for (let k = i + 1; k < l.length && !/^#/.test(l[k]); k += 1) { if (l[k].trim() === '' && bloco.some((x) => x.trim() !== '' && !/^#+/.test(x) )) { if (!/^#+\s*origem/i.test(l[i])) break; } bloco.push(l[k]); }
  return bloco.join('\n');
}
const pasta = (peca) => `procedural/pecas/${peca}/referencias`;

/* O primeiro comentário de bloco da receita: é onde ela diz de que modelo e de que pacote foi recriada. */
function cabecalhoDaReceita(texto) {
  const bloco = /^\s*\/\*[\s\S]*?\*\//.exec(texto);
  return bloco ? bloco[0] : '';
}
/* O mesmo contrato do alvo.md: cita o autor que o pacote exige, nenhum autor de outro pacote, e o pacote ou o modelo. Devolve os problemas, vazio se estiver certo. */
function problemasDoCabecalho(cabecalho, p, pacote) {
  const problemas = [];
  if (cabecalho === '') return [`${p.peca}: a receita não abre com um comentário de cabeçalho`];
  for (const exigida of pacote.exige) if (!cabecalho.includes(exigida)) problemas.push(`${p.peca}: o cabeçalho não cita ${exigida}`);
  for (const proibida of pacote.proibe) if (cabecalho.includes(proibida)) problemas.push(`${p.peca}: o cabeçalho cita ${proibida}, de outro pacote`);
  if (!cabecalho.includes(pacote.nome) && !cabecalho.includes(p.modelo)) problemas.push(`${p.peca}: o cabeçalho não cita o pacote "${pacote.nome}" nem o modelo "${p.modelo}"`);
  return problemas;
}

describe('origem das fontes de veículo', () => {
  it('a tabela tem toda peça do acervo que traz fonte-partes.json, sem repetir, cada uma com pacote conhecido', () => {
    /* O número de peças é o que o acervo tem: a peça de veículo que entra com `referencias/fonte-partes.json` e não entra na tabela reprova aqui, e a que sai
       do acervo e fica na tabela reprova no teste seguinte. Era a contagem escrita à mão (27), que mudava a cada peça que entrava ou saía. */
    const comFonte = pecasDoAcervo().filter((peca) => existsSync(join(REPO, pasta(peca), 'fonte-partes.json')));
    expect(TABELA.pecas.map((p) => p.peca).sort()).toEqual(comFonte);
    expect(TABELA.pecas.length).toBeGreaterThan(0);
    expect(new Set(TABELA.pecas.map((p) => p.peca)).size).toBe(TABELA.pecas.length);
    for (const p of TABELA.pecas) expect(TABELA.pacotes[p.pacote], p.peca).toBeTruthy();
  });

  it('cada fonte-partes.json foi gerada do arquivo que a tabela registra', () => {
    for (const p of TABELA.pecas) {
      const arq = join(REPO, pasta(p.peca), 'fonte-partes.json');
      expect(existsSync(arq), `${p.peca}: sem fonte-partes.json`).toBe(true);
      expect(JSON.parse(readFileSync(arq, 'utf8')).arquivo, p.peca).toBe(p.arquivo);
    }
  });

  it('a linha de origem de cada alvo.md cita o autor do pacote certo, o modelo e nenhum outro pacote', () => {
    for (const p of TABELA.pecas) {
      const arq = `${pasta(p.peca)}/alvo.md`;
      if (!existsSync(join(REPO, arq))) continue;
      const texto = ler(arq);
      const alvoOrigem = blocoDeOrigem(texto);
      const pacote = TABELA.pacotes[p.pacote];
      for (const exigida of pacote.exige) expect(alvoOrigem, `${p.peca}: a origem não cita ${exigida}`).toContain(exigida);
      for (const proibida of pacote.proibe) expect(alvoOrigem, `${p.peca}: a origem cita ${proibida}, de outro pacote`).not.toContain(proibida);
      expect(alvoOrigem.includes(pacote.nome) || alvoOrigem.includes(p.modelo), `${p.peca}: a origem não cita o pacote "${pacote.nome}" nem o modelo "${p.modelo}"`).toBe(true);
    }
  });

  it('o cabeçalho de cada receita.js cita o autor do pacote certo, o pacote ou o modelo, e nenhum outro autor', () => {
    for (const p of TABELA.pecas) {
      const problemas = problemasDoCabecalho(cabecalhoDaReceita(ler(`procedural/pecas/${p.peca}/receita.js`)), p, TABELA.pacotes[p.pacote]);
      expect(problemas, problemas.join('; ')).toEqual([]);
    }
  });

  it('o cabeçalho da perua trocado para o pacote A é acusado', () => {
    /* A cópia em fixture é o cabeçalho real da perua com "autor D" e "pacote D" trocados por "autor A" e "pacote A": exatamente o erro que o alvo.md já
       chegou a ter. A perua é do pacote D; o teste acima não pega o cabeçalho da cópia porque ele só lê as receitas do acervo. */
    const perua = TABELA.pecas.find((p) => p.peca === 'carro-perua');
    expect(perua.pacote).toBe('pacote-d');
    const problemas = problemasDoCabecalho(cabecalhoDaReceita(ler('tools/modelar/fixtures/origem-das-fontes/carro-perua-cabecalho-trocado.txt')), perua, TABELA.pacotes[perua.pacote]);
    expect(problemas).toContain('carro-perua: o cabeçalho não cita autor D');
    expect(problemas).toContain('carro-perua: o cabeçalho cita autor A, de outro pacote');
    /* e o cabeçalho de verdade, o da receita do acervo, não tem problema */
    expect(problemasDoCabecalho(cabecalhoDaReceita(ler('procedural/pecas/carro-perua/receita.js')), perua, TABELA.pacotes[perua.pacote])).toEqual([]);
  });

  it('nenhuma peça com referencias/fonte-partes.json fica fora da tabela', () => {
    const registradas = new Set(TABELA.pecas.map((p) => p.peca));
    const comFonte = readdirSync(join(REPO, 'procedural/pecas')).filter((n) => existsSync(join(REPO, pasta(n), 'fonte-partes.json')));
    expect(comFonte.filter((n) => !registradas.has(n))).toEqual([]);
  });

  it('toda fonte registra a frente em +z, com a origem da conferência', () => {
    for (const p of TABELA.pecas) {
      const f = JSON.parse(readFileSync(join(REPO, pasta(p.peca), 'fonte-partes.json'), 'utf8')).frente;
      expect(f?.lado, p.peca).toBe('+z'); expect(['rodas', 'faróis', 'para-brisa', 'declarada'], p.peca).toContain(f?.origem);
    }
  });
});
