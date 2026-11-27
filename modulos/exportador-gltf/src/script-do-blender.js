/* script-do-blender.js — o script do Blender que monta o cabo vivo (`blender/cabo-vivo.py`), lido do disco para quem o grava ao lado do .glb. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const CAMINHO_DO_SCRIPT_DO_CABO = fileURLToPath(new URL('../blender/cabo-vivo.py', import.meta.url));
export const NOME_DO_SCRIPT_DO_CABO = 'cabo-vivo.py';

export const lerScriptDoCaboVivo = () => readFileSync(CAMINHO_DO_SCRIPT_DO_CABO, 'utf8');
