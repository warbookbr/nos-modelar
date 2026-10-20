import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* A tabela fonte -> pacote das 27 referências de veículos (docs/mecanifica/veiculos-referencias.json) é conferida contra três coisas que a pessoa ou o agente escrevem à mão:
   a tabela do plano, o campo `arquivo` de cada `referencias/fonte-partes.json` e a linha de origem de cada `referencias/alvo.md`. A perua chegou a declarar origem autor A
   sendo a Wagon do pacote D; nada acusava. */
const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TABELA = JSON.parse(readFileSync(join(REPO, 'docs/mecanifica/veiculos-referencias.json'), 'utf8'));
const NOME_DO_PLANO = '2026-10-20-veiculos-de-referencia-livre.md';
const PLANO = [join(REPO, 'docs/mecanifica/planos', NOME_DO_PLANO), join(REPO, 'docs/mecanifica/planos/encerrados', NOME_DO_PLANO)].find((c) => existsSync(c));
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

describe('origem das fontes de veículo', () => {
  it('a tabela tem as 27 peças, cada uma com pacote conhecido', () => {
    expect(TABELA.pecas).toHaveLength(27);
    expect(new Set(TABELA.pecas.map((p) => p.peca)).size).toBe(27);
    for (const p of TABELA.pecas) expect(TABELA.pacotes[p.pacote], p.peca).toBeTruthy();
  });

  it('a tabela do plano diz o mesmo que a tabela de fontes, peça a peça', () => {
    expect(PLANO, 'plano de veículos não encontrado').toBeTruthy();
    const linhas = readFileSync(PLANO, 'utf8').split('\n').filter((l) => /^\| [a-z0-9-]+ \| /.test(l)).map((l) => l.split('|').map((c) => c.trim()));
    const doPlano = Object.fromEntries(linhas.map(([, peca, origem]) => [peca, origem]));
    for (const p of TABELA.pecas) expect(doPlano[p.peca], `${p.peca} no plano`).toBe(p.origemNoPlano);
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
