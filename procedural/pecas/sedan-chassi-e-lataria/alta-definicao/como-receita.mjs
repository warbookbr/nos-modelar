/* como-receita.mjs: a receita em metro de um dos dois esboços deste ciclo, para as ferramentas que só leem receita (`npm run ondulacao`,
 * `npm run malha:lascas`, `npm run vistas:superficie`). `HD_CAMINHO=a` ou `b` escolhe o esboço. O rascunho mora no esboço 2.0; este
 * arquivo só o converte, com `receitaDaOpcao`, e não é peça do acervo.
 *
 * Uso: HD_CAMINHO=a npm run ondulacao -- procedural/pecas/sedan-chassi-e-lataria/alta-definicao/como-receita.mjs */
import { receitaDaOpcao } from '../../../../modulos/esboco-nucleo/src/opcao.js';

const ARQUIVO = { a: './caminho-a-gaiola-da-casca.esboco.mjs', b: './caminho-b-rede-de-curvas.esboco.mjs' }[process.env.HD_CAMINHO];
if (!ARQUIVO) throw new Error('como-receita.mjs: escolha o caminho com HD_CAMINHO=a ou HD_CAMINHO=b');
const { default: esboco } = await import(ARQUIVO);
const { receita } = receitaDaOpcao(esboco.opcoes[0], { nome: `sedan-alta-definicao-caminho-${process.env.HD_CAMINHO}` });
export default { ...receita, PARAMS: receita.PARAMS ?? {} };
