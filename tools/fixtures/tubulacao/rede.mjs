/* rede.mjs — a receita de uma rede de tubos: as peças de `pecasDaRede` postas pelo `instanciaDeFamilia`, uma chamada por
 * peça, com a base encadeada e o nome de cada peça como prefixo das partes. */
import { instanciaDeFamilia } from '../../modelar/instancia-de-familia.mjs';
import { pecasDaRede } from '../../../procedural/familias/tubulacao/rede.js';

export function receitaDaRede(tracado, nome = 'rede') {
  const rede = pecasDaRede(tracado);
  const PASSOS = [];
  let base = 0;
  const partesDe = new Map();
  for (const peca of rede.pecas) {
    const inst = instanciaDeFamilia({ familia: 'tubulacao', parametros: peca.parametros, nomes: peca.nome, id: peca.nome.toLowerCase().replace(/[^a-z0-9-]/g, '-'), portas: true, portaPrefixo: peca.nome.toLowerCase().replace(/[^a-z0-9-]/g, '-'), base, pose: peca.pose });
    PASSOS.push(...inst.passos);
    partesDe.set(peca.nome, inst.partes.map((p) => p.nome));
    base = inst.origem;
  }
  const contatos = rede.encostos.flatMap(([a, b]) => partesDe.get(a).flatMap((pa) => partesDe.get(b).map((pb) => ({ par: [pa, pb], motivo: 'a conexão encosta de topo no tubo, na boca' }))));
  return { receita: { meta: { nome }, PASSOS, contatos }, rede };
}
