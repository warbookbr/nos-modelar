/* mesa-linear.mjs — a mesa linear de prova do plano de elementos de máquina, em milímetro na montagem e metro na receita.
 *
 * Sobre uma chapa de base, dois perfis de alumínio ranhurado 40 ao longo de y levam as duas guias de tamanho 15; os dois
 * carros levam a mesa. Entre os perfis, o fuso Tr10x2 corre em dois mancais com o rolamento 6000, e a castanha empurra a
 * mesa por um suporte que desce da mesa até a face do flange dela. A chapa, a mesa e o suporte são blocos da prova; o
 * resto sai das famílias pelo `instanciaDeFamilia`. `posicao` é o avanço da mesa ao longo de y. */
import { instanciaDeFamilia } from '../../modelar/instancia-de-familia.mjs';
import { criarRegistroDeFamilias } from '../../../procedural/familias/index.js';
import { parametrosDoPerfil } from '../../../procedural/familias/perfil-estrutural/tabela.js';
import { parametrosDaGuia } from '../../../procedural/familias/guia-linear/tabela.js';
import { parametrosDoRolamento } from '../../../procedural/familias/rolamento/tabela.js';
import { parametrosDoFuso } from '../../../procedural/familias/fuso/tabela.js';
import { regraDasEsferas } from '../../../procedural/familias/rolamento/geometria.js';

export const COMPRIMENTO = 600;
const m = (mm) => mm / 1000;
const ponto = (v) => v.map(m);

export function receitaDaMesa({ posicao = 200, nome = 'mesa-linear' } = {}) {
  const registro = criarRegistroDeFamilias();
  const L = COMPRIMENTO;
  const perfil = parametrosDoPerfil('ALUMINIO', 40, { comprimento: L });
  const guia = parametrosDaGuia(15, { comprimento: L, posicaoDoCarro: posicao });
  const rolamento = parametrosDoRolamento(6000, 3);
  const alturaDoEixo = 0.8 * rolamento.diametroExterno;
  const fuso = parametrosDoFuso('Tr10x2', { comprimento: L, posicaoDaCastanha: posicao + 15 });
  const topoDoCarro = perfil.altura + guia.alturaDeMontagem;
  const PASSOS = [];
  let base = 0;
  const partes = {};
  const por = (familia, parametros, nomes, pose) => {
    const inst = instanciaDeFamilia({ familia, registro, parametros, nomes, id: nomes.toLowerCase(), portas: true, portaPrefixo: nomes.toLowerCase(), base, pose: { ...pose, posicao: ponto(pose.posicao) } });
    PASSOS.push(...inst.passos);
    partes[nomes] = inst.partes.map((p) => p.nome);
    base = inst.origem;
  };
  for (const [lado, x] of [['A', -80], ['B', 80]]) {
    por('perfil-estrutural', perfil, `perfil${lado}`, { posicao: [x, 0, perfil.altura / 2] });
    por('guia-linear', guia, `guia${lado}`, { posicao: [x, 0, perfil.altura] });
  }
  por('rolamento', rolamento, 'mancalA', { posicao: [0, 10, alturaDoEixo] });
  por('rolamento', rolamento, 'mancalB', { posicao: [0, L - 10 - rolamento.largura, alturaDoEixo] });
  por('fuso', fuso, 'fuso', { posicao: [0, 0, alturaDoEixo] });
  /* os blocos da prova: extrusões em y de um retângulo em [x, z] */
  const bloco = (nomeDaParte, [x0, x1], [z0, z1], [y0, y1], furos) => {
    base += 1;
    PASSOS.push(['extrusao', { origemId: base, perfil: [[m(x0), m(z0)], [m(x1), m(z0)], [m(x1), m(z1)], [m(x0), m(z1)]], altura: m(y1 - y0), em: [0, m(y0), 0], ...(furos ? { furos } : {}) }]);
    PASSOS.push(['parte', { nome: nomeDaParte, sel: { origem: { op: 'extrusao', id: base } } }]);
    partes[nomeDaParte] = [nomeDaParte];
  };
  bloco('chapa', [-130, 130], [-10, 0], [0, L]);
  bloco('mesa', [-110, 110], [topoDoCarro, topoDoCarro + 12], [posicao, posicao + guia.comprimentoDoCarro]);
  const yN = fuso.posicaoDaCastanha;
  bloco('suporte', [-19, 19], [alturaDoEixo - 19, topoDoCarro], [yN - 10, yN], [{ circulo: { raio: m(6), centro: [0, m(alturaDoEixo)] } }]);
  const par = (a, b, motivo) => ({ par: [a, b], motivo });
  const contatos = [];
  for (const lado of ['A', 'B']) {
    contatos.push(par('chapa', `perfil${lado}Perfil`, 'o perfil de alumínio assenta na chapa de base'));
    contatos.push(par(`perfil${lado}Perfil`, `guia${lado}Trilho`, 'o trilho da guia é parafusado no topo do perfil'));
    contatos.push(par(`guia${lado}Carro`, `guia${lado}Trilho`, 'o carro apoia no topo do trilho'));
    contatos.push(par(`guia${lado}Carro`, 'mesa', 'a mesa é parafusada no topo do carro'));
    contatos.push(par('chapa', `mancal${lado}Mancal`, 'o pé do mancal assenta na chapa de base'));
    contatos.push(par(`mancal${lado}AnelExterno`, `mancal${lado}Mancal`, 'o anel externo assenta no alojamento do mancal'));
  }
  for (const lado of ['A', 'B']) contatos.push(par('fusoFilete', `mancal${lado}AnelInterno`, 'a crista do filete apoia no furo do rolamento; a ponta usinada do fuso fica fora da família'));
  contatos.push(par('fusoFilete', 'fusoFuso', 'o filete cosmético assenta no núcleo, como a rosca do fixador'));
  contatos.push(par('mesa', 'suporte', 'o suporte é preso embaixo da mesa'));
  contatos.push(par('fusoCastanha', 'suporte', 'o flange da castanha é parafusado no suporte'));
  return { receita: { meta: { nome }, PASSOS, contatos }, partes, esferasPorRolamento: regraDasEsferas(rolamento).esferas };
}
