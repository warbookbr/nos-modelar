/* prova-memoria-do-sedan.mjs — a memória de execução na carroceria do sedã: o tempo e o neutro bit a bit.
 * Uso, da raiz do repositório (cada modo leva de 3 a 4 minutos; rode um por vez):
 *   node --max-old-space-size=8192 <este arquivo> original   a execução sem memória
 *   node --max-old-space-size=8192 <este arquivo> mudada     a execução sem memória, com o passo 232 mudado (cubo larg 0,072 -> 0,074)
 *   node --max-old-space-size=8192 <este arquivo> com        a fria com memória, a mudada e a igual, na mesma memória
 * O hash cobre o neutro canônico, V, F, a procedência, os avisos, as chapas, as aberturas, os frisos, as portas, as partes e as origens;
 * os hashes de `com` têm de ser iguais aos de `original` (fria e igual) e de `mudada` (mudada com memória). */
import { createHash } from 'node:crypto';
import { importarReceita, receitaDoModulo } from '../../../../tools/modelar/importar-receita.mjs';
import { resolverCaminhoReceita } from '../../../../tools/modelar/resolver-caminho-receita.mjs';
import { entradaDaReceita } from '../../../../src/autoria/executar-receita.js';
import { criarMemoriaDeExecucao, neutroCanonico, nucleo } from '../../../../procedural/nucleo/entrada.js';

const modo = process.argv[2];
const e = entradaDaReceita(receitaDoModulo(await importarReceita(resolverCaminhoReceita('sedan-chassi-e-lataria/carroceria'))));
const mudada = e.PASSOS.map((p) => structuredClone(p));
mudada[232][1].larg = 0.074;
const impressao = (n) => createHash('sha256').update(JSON.stringify({ c: neutroCanonico(n), V: [...n.V], F: [...n.F], p: n.procedencia, a: n.avisos, ch: n.chapas, ab: n.aberturas, fr: n.frisos, po: [...n.facesDasPortas], pa: n.partes, o: [...n.origens] })).digest('hex');
const rodar = (passos, memoria) => {
  const inicio = performance.now();
  const n = nucleo(passos, e.PARAMS, e.TOPO, e.MATERIAIS, e.ESQUELETO, e.ALIASES, memoria ? { memoria } : undefined);
  return { segundos: ((performance.now() - inicio) / 1000).toFixed(1), hash: impressao(n), faces: n.F.size };
};
const dizer = (rotulo, medida, memoria) => console.log(rotulo, JSON.stringify(medida), memoria ? JSON.stringify(memoria.estatisticas) : '');
if (modo === 'original') dizer('original sem memória', rodar(e.PASSOS, null));
else if (modo === 'mudada') dizer('mudada sem memória', rodar(mudada, null));
else if (modo === 'com') {
  const memoria = criarMemoriaDeExecucao();
  dizer('fria com memória', rodar(e.PASSOS, memoria), memoria);
  dizer('mudada com memória', rodar(mudada, memoria), memoria);
  dizer('igual com memória', rodar(e.PASSOS, memoria), memoria);
} else { console.error('modo: original, mudada ou com'); process.exitCode = 2; }
