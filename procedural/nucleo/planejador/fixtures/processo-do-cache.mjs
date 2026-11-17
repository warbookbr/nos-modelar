/* processo-do-cache.mjs — um comando que executa uma receita pequena com a memória em armazém numa pasta (cubo, cubo, unir, parte), para
 * a prova do cache por prefixo entre processos. Uso: node processo-do-cache.mjs <pasta> [conferido]; imprime uma linha JSON com as faces,
 * os órfãos, as estatísticas da memória e a impressão do neutro igual à da execução sem memória. */
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deserialize, serialize } from 'node:v8';
import { nucleo } from '../../entrada.js';
import { criarMemoriaEmArmazem } from '../memoria-em-armazem.js';
import { divergenciaDaImpressao } from '../impressao-do-neutro.js';

const [pasta, modo] = process.argv.slice(2);
mkdirSync(pasta, { recursive: true });
const disco = {
  ler: (n) => (existsSync(join(pasta, n)) ? readFileSync(join(pasta, n)) : null),
  gravar: (n, b) => { const parcial = join(pasta, `${n}.${process.pid}.parcial`); writeFileSync(parcial, b); renameSync(parcial, join(pasta, n)); },
  apagar: (n) => { try { unlinkSync(join(pasta, n)); } catch { /* já saiu */ } },
};
const memoria = criarMemoriaEmArmazem({ armazem: disco, serializar: serialize, desserializar: deserialize, desserializarDevolveCopia: true, versao: 'a-mesma', rotulo: 'r', todoPasso: true });
const o = (op, id) => ({ origem: { op, id } });
const P = [['cubo', { origemId: 1, lado: 1 }], ['cubo', { origemId: 2, lado: 1, em: [0.5, 0, 0] }], ['unir', { origemId: 3, solidos: [o('cubo', 1), o('cubo', 2)] }], ['parte', { sel: o('unir', 3), nome: 'a' }]];
const n = nucleo(P, {}, {}, {}, null, [], { memoria, memoriaConferida: modo === 'conferido' });
console.log(JSON.stringify({ faces: n.F.size, orfaos: n.orfaos.length, estatisticas: memoria.estatisticas, igualSemMemoria: divergenciaDaImpressao(n, nucleo(P)) === null }));
