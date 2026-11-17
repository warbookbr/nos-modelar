/* placa-de-prova.js — a placa de prova da fatia 3 do plano `docs/modelar/planos/2026-11-16-familia-componentes-eletronicos.md`:
 * uma placa declarada de 100 por 70 mm com um componente de cada encapsulamento da família, quatro furos de fixação e duas
 * peças na face de baixo, para provar a posição, o giro, o lado, os furos dos terminais e as ilhas.
 *
 *   npm run -s bancada -- procedural/familias/componente-eletronico/placa-de-prova.js --vistas=isometrica,topo,inferior --saida=<pasta>
 *
 * Na fileira de trás (z negativo), o regulador em TO-220 no dissipador, o módulo do driver de passo girado de 90 graus, o
 * borne de duas vias com a boca para a borda e o jack de alimentação girado de 180 graus, com a boca na borda direita; na do
 * meio, o DIP-8, o eletrolítico, o resistor, o cerâmico de disco, o TO-92 girado de 180, o LED de 5 mm e o de 3 mm girado de
 * 45; na da frente, a barra de oito vias e o SOIC-8 girado de 90. Na face de baixo, outro SOIC-8 e um resistor girado de 90.
 * As cores são as das pranchas das fatias 1 e 2 (escolha da prova, sem paleta nova), mais a ilha de estanho. */
import { MATERIAIS as MATERIAIS_DAS_PRANCHAS } from './prancha-2.js';
import { placaDeclarada } from './placa.js';

const PRETO = { corpo: 'preto', terminal: 'estanho' };

export const PLACA_DE_PROVA = {
  id: 'placa',
  contorno: { retangulo: { largura: 100, profundidade: 70, cantos: 3 } },
  espessura: 1.6,
  furos: [[-45, -30], [45, -30], [45, 30], [-45, 30]].map((centro) => ({ centro, diametro: 3.2 })),
  pecas: [
    {
      id: 'u1', perfil: 'to-220-no-dissipador', posicao: [-28, -12], materiais: { corpo: 'preto', aba: 'aluminio', terminal: 'estanho' },
      encostaEm: [{ peca: 'hs1', motivo: 'as costas da aba do TO-220 encostam na face de montagem do dissipador, com o furo da aba no furo dele' }],
    },
    { id: 'hs1', perfil: 'dissipador-to-220', posicao: [-28, -12], materiais: { corpo: 'anodizado', terminal: 'estanho' } },
    { id: 'a1', perfil: 'modulo-driver-de-passo', posicao: [-2, -15], giro: 90, materiais: { corpo: 'preto', placa: 'placa-verde', chip: 'preto', terminal: 'estanho' } },
    { id: 'j2', perfil: 'borne-2-vias', posicao: [15, -29], giro: 180, materiais: { corpo: 'azul-borne', parafuso: 'aluminio', terminal: 'estanho' } },
    { id: 'j3', perfil: 'jack-de-alimentacao', posicao: [38, -20], giro: 180, materiais: PRETO },
    { id: 'u2', perfil: 'dip-8', posicao: [-30, 8], materiais: PRETO },
    { id: 'c1', perfil: 'eletrolitico-6-3x11', posicao: [-18, 8], materiais: { corpo: 'azul', topo: 'aluminio', marca: 'cinza-claro', terminal: 'estanho' } },
    { id: 'r1', perfil: 'resistor-1-4w', posicao: [-5, 8], materiais: { corpo: 'bege', terminal: 'estanho', faixas: ['marrom', 'preto', 'laranja', 'dourado'] } },
    { id: 'c2', perfil: 'ceramico-disco-5', posicao: [8, 8], materiais: { corpo: 'ceramica', terminal: 'estanho' } },
    { id: 'q1', perfil: 'to-92', posicao: [18, 8], giro: 180, materiais: PRETO },
    { id: 'd1', perfil: 'led-5', posicao: [28, 8], materiais: { corpo: 'verde', terminal: 'estanho' } },
    { id: 'd2', perfil: 'led-3', posicao: [36, 8], giro: 45, materiais: { corpo: 'vermelho', terminal: 'estanho' } },
    { id: 'j1', perfil: 'barra-1x8', posicao: [-25, 26], materiais: PRETO },
    { id: 'u3', perfil: 'soic-8', posicao: [0, 24], giro: 90, materiais: PRETO },
    { id: 'u4', perfil: 'soic-8', posicao: [15, 24], lado: 'baixo', materiais: PRETO },
    { id: 'r2', perfil: 'resistor-1-4w', posicao: [32, 24], giro: 90, lado: 'baixo', materiais: { corpo: 'bege', terminal: 'estanho', faixas: ['amarelo', 'violeta', 'marrom', 'dourado'] } },
  ],
};

export const MATERIAIS = {
  ...MATERIAIS_DAS_PRANCHAS,
  ilha: { cor: '#c4c7cc', aspereza: 0.3 },
  amarelo: { cor: '#e0c020', aspereza: 0.5 },
  violeta: { cor: '#7a3fa0', aspereza: 0.5 },
};

let gerada = null;
const gerar = (placa) => { if (gerada?.de !== placa) gerada = { de: placa, ...placaDeclarada(placa) }; return gerada; };

export default {
  meta: { nome: 'componente-eletronico/placa-de-prova', desc: 'prova da fatia 3 da família componente-eletronico: a placa declarada com um componente de cada encapsulamento, furos, ilhas e duas peças na face de baixo' },
  PARAMS: { placa: PLACA_DE_PROVA },
  MATERIAIS,
  TOPO: { origem: 'centro da face de cima da placa; y para cima, o plano da placa é xz' },
  get contatos() { return gerar(this.PARAMS.placa).contatos; },
  get ilhas() { return gerar(this.PARAMS.placa).ilhasDaReceita; },
  get PASSOS() { return gerar(this.PARAMS.placa).passos; },
};
