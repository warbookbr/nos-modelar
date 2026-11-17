/* index.js — a família `componente-eletronico` carregada: o contrato `familia.json`, as composições e o `derivar`, e a
   escolha de material por peça.

   Componentes pelo encapsulamento, no referencial da placa (y = 0 na face de cima, os terminais descendo abaixo dela, o
   centro dos furos em x = z = 0): o resistor axial deitado com as faixas de cor, o eletrolítico radial em pé com a faixa de
   polaridade e o topo marcado, o TO-220 em pé com a aba furada, o DIP com o entalhe do pino 1, a barra de pinos de uma ou
   duas fileiras, o capacitor cerâmico de disco, o LED de 3 e 5 mm, o TO-92, o SOIC de montagem em superfície, o borne de
   parafuso de 2 e 3 vias, o jack de alimentação, o módulo de placa (a placa filha com pinos) e o dissipador em canal do
   TO-220, no referencial do TO-220 (`outros-encapsulamentos.js`). A placa declarada (`placa.js`) monta esses componentes numa placa de circuito pela
   posição, pelo giro e pelo lado de cada um. As medidas são as típicas de cada encapsulamento, como estimativa (`geometria.js` e
   `familia.json` dizem a fonte de cada uma). Cada elemento sai com parte e material próprios. */
import contratoJson from './familia.json' with { type: 'json' };
import { definirFamilia } from '../../../src/autoria/chamar-familia.js';
import { ErroFamilia } from '../../../src/autoria/familia.js';
import { ENCAPSULAMENTOS, MATERIAIS_PADRAO, criarComposicoes } from './composicoes.js';
import { derivar } from './derivar.js';

export { ENCAPSULAMENTOS, MATERIAIS_PADRAO };
/* a placa declarada (`placa.js`) e o que ela lê de cada encapsulamento (`terminais.js`): onde cada terminal encontra a placa e a
   altura do assento */
export { PLACA, eixoEAngulo, placaDeclarada } from './placa.js';
export { alturaDoAssento, terminaisDoComponente } from './terminais.js';

export const CONTRATO_DO_COMPONENTE_ELETRONICO = contratoJson;

export const COMPONENTE_ELETRONICO = Object.freeze(definirFamilia({
  contrato: CONTRATO_DO_COMPONENTE_ELETRONICO, composicoes: criarComposicoes(CONTRATO_DO_COMPONENTE_ELETRONICO), derivar,
}));

/* a escolha de material da receita, pelo nome curto do elemento; `faixas` é a lista das cores do resistor, da primeira à última */
const ESCOLHAS = Object.freeze({
  corpo: 'materialDoCorpo', terminal: 'materialDoTerminal', marca: 'materialDaMarca', topo: 'materialDoTopo', aba: 'materialDaAba',
  parafuso: 'materialDoParafuso', placa: 'materialDaPlaca', chip: 'materialDoChip',
});

/**
 * A chamada `chamada` (de `chamar`) com o material de cada elemento escolhido pela receita: `{ corpo, terminal, marca, topo, aba,
 * parafuso, placa, chip, faixas: [...] }`, cada valor um nome de `MATERIAIS` da receita. Recusa o elemento que a variante chamada não tem e a lista de
 * faixas de tamanho diferente do número de faixas do resistor. O que a receita não escolhe fica no padrão (`MATERIAIS_PADRAO`).
 */
export function comMateriais(chamada, escolha = {}) {
  const composicao = COMPONENTE_ELETRONICO.composicoes.find(({ id }) => id === chamada?.composicao);
  const recusar = (campo, valor, aceito) => { throw new ErroFamilia({ familia: 'componente-eletronico', campo, valor, aceito }); };
  if (!composicao) recusar('chamada', chamada?.composicao, 'uma chamada da família componente-eletronico, feita por chamar');
  const textos = Object.keys(composicao.parametros).filter((nome) => composicao.parametros[nome].tipo === 'texto');
  const argumentos = { ...chamada.argumentos };
  for (const [elemento, nome] of Object.entries(escolha)) {
    if (elemento === 'faixas') {
      const faixas = textos.filter((t) => t.startsWith('materialDaFaixa'));
      if (!Array.isArray(nome) || nome.length !== faixas.length) recusar('escolha.faixas', nome, `lista com ${faixas.length} nomes de material, um por faixa de '${composicao.id}'`);
      nome.forEach((cor, k) => { argumentos[`materialDaFaixa${k + 1}`] = cor; });
      continue;
    }
    const argumento = ESCOLHAS[elemento];
    if (!argumento || !textos.includes(argumento)) recusar(`escolha.${elemento}`, nome, `um elemento de '${composicao.id}': ${textos.map((t) => Object.keys(ESCOLHAS).find((k) => ESCOLHAS[k] === t) ?? 'faixas').filter((v, i, a) => a.indexOf(v) === i).join(', ')}`);
    if (typeof nome !== 'string' || !nome) recusar(`escolha.${elemento}`, nome, 'o nome de um material declarado em MATERIAIS');
    argumentos[argumento] = nome;
  }
  return { ...chamada, argumentos };
}
