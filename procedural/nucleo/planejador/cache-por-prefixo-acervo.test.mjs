/* cache-por-prefixo-acervo.test.mjs — o gate 1 do plano do cache por passo: a malha de toda receita do acervo é a mesma com e sem o
 * cache por prefixo. Cada receita roda uma vez inteira, guardando o estado depois do passo do meio na memória em armazém (serializado
 * com `v8`, como no disco), e uma segunda vez com a mesma memória, recomeçando dali; a impressão do neutro das duas tem de ser a mesma,
 * e a segunda tem de ter executado só a metade de trás. Lento: executa o acervo inteiro uma vez e meia. */
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serialize, deserialize } from 'node:v8';
import { describe, expect, it } from 'vitest';
import { importarReceita, receitaDoModulo } from '../../../tools/modelar/importar-receita.mjs';
import { REGISTRO_DA_RECEITA, entradaDaReceita } from '../../../src/autoria/executar-receita.js';
import { nucleo } from '../entrada.js';
import { criarMemoriaEmArmazem } from './memoria-em-armazem.js';
import { divergenciaDaImpressao } from './impressao-do-neutro.js';

const PECAS = resolve(dirname(fileURLToPath(import.meta.url)), '../../pecas');
const receitas = [];
for (const d of readdirSync(PECAS, { withFileTypes: true }).filter((x) => x.isDirectory()).sort((a, b) => (a.name < b.name ? -1 : 1))) {
  if (existsSync(join(PECAS, d.name, 'receita.js'))) receitas.push(join(PECAS, d.name, 'receita.js'));
  const partes = join(PECAS, d.name, 'partes');
  if (existsSync(partes)) for (const p of readdirSync(partes).sort()) if (existsSync(join(partes, p, 'receita.js'))) receitas.push(join(partes, p, 'receita.js'));
}

describe('o cache por prefixo no acervo inteiro', () => {
  it('o acervo tem receitas', () => { expect(receitas.length).toBeGreaterThan(100); });
  for (const caminho of receitas) {
    it(relative(PECAS, caminho), async () => {
      const e = entradaDaReceita(receitaDoModulo(await importarReceita(caminho)));
      const meio = Math.floor(e.PASSOS.length / 2);
      const arquivos = new Map();
      const memoria = criarMemoriaEmArmazem({
        armazem: { ler: (n) => arquivos.get(n) ?? null, gravar: (n, b) => { arquivos.set(n, b); }, apagar: (n) => { arquivos.delete(n); } },
        serializar: serialize, desserializar: deserialize, versao: 'acervo', rotulo: caminho, passosGuardados: [meio],
      });
      const rodar = () => { let executados = 0; const n = nucleo(e.PASSOS, e.PARAMS, e.TOPO, e.MATERIAIS, e.ESQUELETO, e.ALIASES, { registroOperacoes: REGISTRO_DA_RECEITA, memoria, aoRastrear: () => { executados += 1; } }); return { n, executados }; };
      const inteira = rodar();
      expect(inteira.executados).toBe(e.PASSOS.length);
      const doMeio = rodar();
      expect(divergenciaDaImpressao(doMeio.n, inteira.n)).toBeNull();
      /* a receita vazia (as partes ainda sem passo de um objeto em alinhamento) não tem ponto */
      if (!e.PASSOS.length) { expect(memoria.estatisticas).toMatchObject({ guardados: 0, lidos: 0, falhas: 0 }); return; }
      /* toda receita do acervo tem a chave e o estado serializáveis: o ponto do meio foi guardado e lido, e a segunda execução fez só a metade de trás */
      expect(memoria.estatisticas).toMatchObject({ guardados: 1, lidos: 1, falhas: 0 });
      expect(doMeio.executados).toBe(e.PASSOS.length - meio - 1);
    }, 900_000);
  }
});
