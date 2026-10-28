/* veiculo-caixa — um veículo de caixas, só para os testes das ferramentas que comparam uma receita com uma fonte de referência (comparar-silhueta,
   folha-comparativa, medidas-da-fonte, vistas-da-receita). Não é peça do acervo. Dois prismas extrudados em x pelo perfil lateral (corpo e cabine), no
   referencial do acervo: y para cima, chão em y = 0, frente em +z, centrado em x e z. `veiculoDeCaixa({ cabineMeiaLargura })` varia a largura da cabine,
   que é o defeito que o envelope por fatia em z não vê e a vista frontal vê. */
const m = (v) => v / 1000;
const area = (l) => l.reduce((s, [a, b], i) => { const [c, d] = l[(i + 1) % l.length]; return s + (a * d - c * b); }, 0) / 2;
const antihorario = (l) => (area(l) < 0 ? [...l].reverse() : l);
/* Mapeamento do núcleo: a extrusão em x leva [u, v] a (y = -u, z = v). */
const perfilLateral = (zy) => antihorario(zy.map(([z, y]) => [-y, z])).map(([u, v]) => [m(u), m(v)]);

export function veiculoDeCaixa({ meiaLargura = 900, cabineMeiaLargura = 900, comprimento = 4000, cintura = 900, teto = 1500 } = {}) {
  const Z = comprimento / 2;
  const corpo = [[-Z, 200], [-Z, cintura], [Z, cintura], [Z, 200]];
  const cabine = [[-Z * 0.6, cintura], [-Z * 0.4, teto], [Z * 0.1, teto], [Z * 0.35, cintura]];
  const PASSOS = [
    ['extrusao', { origemId: 1, eixo: 'x', altura: m(2 * meiaLargura), em: [m(-meiaLargura), 0, 0], perfil: perfilLateral(corpo) }],
    ['extrusao', { origemId: 2, eixo: 'x', altura: m(2 * cabineMeiaLargura), em: [m(-cabineMeiaLargura), 0, 0], perfil: perfilLateral(cabine) }],
    ['parte', { nome: 'corpo', sel: { origem: { op: 'extrusao', id: 1 } } }],
    ['parte', { nome: 'cabine', sel: { origem: { op: 'extrusao', id: 2 } } }],
    ['material', { sel: { origem: { op: 'extrusao', id: 1 } }, usa: 'tinta' }],
    ['material', { sel: { origem: { op: 'extrusao', id: 2 } }, usa: 'tinta' }],
  ];
  return { contatos: [], meta: { nome: 'veiculo-caixa', desc: 'veículo de caixas para teste de ferramenta' }, PARAMS: {}, MATERIAIS: { tinta: { tipo: 'liso', cor: '#3a7bd5' } }, TOPO: { origem: 'chão, no meio do veículo' }, ALIASES: [], PASSOS };
}
export default veiculoDeCaixa();
