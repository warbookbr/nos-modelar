/* junta-com-cabo-gltf.mjs — a montagem de prova do cabo na junta exportada como glTF: os dois atuadores com as duas juntas (a A de −90° a 90° e a B dentro das peças que a A move) e o cabo do arranjo pedido, na pose de repouso,
 * com o script e o addon do Blender ao lado. Usado pelo teste do glTF (`junta-com-cabo-gltf.test.mjs`) e pelo do Blender (`tools/blender/cabo-vivo.test.mjs`). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { gerarMontagemResolvida, gravarAddonDoCabo, gravarScriptDoCabo } from '../../modelar/exportar-gltf.mjs';
import { ARRANJOS, prepararJuntaComCabo } from './junta-com-cabo.mjs';

/** O glTF do arranjo: `{ resultado, prova, arquivo?, script? }`; com `saida` grava o .glb, o script e o `.zip` do addon ao lado. */
export async function exportarJuntaComCabo({ arranjo = 'passa', saida = null, ambiente = 'estudio' } = {}) {
  const prova = prepararJuntaComCabo({ curso: ARRANJOS[arranjo].curso });
  const resultado = await gerarMontagemResolvida({ resolvida: prova.resolvida, nome: `junta-com-cabo-${arranjo}`, articulacoes: prova.gerada.articulacoes, cabos: [{ ...ARRANJOS[arranjo].pedido, id: 'cabo' }], ambiente, execucao: prova.execucao });
  if (!saida) return { resultado, prova };
  const arquivo = resolve(saida);
  mkdirSync(dirname(arquivo), { recursive: true });
  writeFileSync(arquivo, resultado.bytes);
  return { resultado, prova, arquivo, script: gravarScriptDoCabo(dirname(arquivo)), addon: gravarAddonDoCabo(dirname(arquivo)) };
}
