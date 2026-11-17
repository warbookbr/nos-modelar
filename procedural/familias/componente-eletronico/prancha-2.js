/* prancha-2.js — a peça de prova da fatia 2 da família `componente-eletronico`: os encapsulamentos restantes e o dissipador lado a
 * lado numa placa, para a prancha que a pessoa aprova (fatia 2 do plano `docs/modelar/planos/2026-11-16-familia-componentes-eletronicos.md`).
 *
 *   npm run -s bancada -- procedural/familias/componente-eletronico/prancha-2.js --vistas=superior --sem-contatos --saida=<pasta>
 *
 * Da esquerda para a direita: o cerâmico de disco de 5 mm, o LED de 3 mm e o de 5 mm, o TO-92, o SOIC de 8 e o de 16 pinos, o
 * borne de 2 e o de 3 vias, o jack de alimentação, o módulo do driver de passo, o do microcontrolador e o TO-220 no dissipador
 * em canal (as duas chamadas no mesmo lugar: o TO-220 a 5,38 mm da placa, com o furo da aba na altura do furo do dissipador).
 * Cada um é uma chamada da família com o perfil dele e o material de cada elemento escolhido aqui, pela mesma montagem de
 * `prancha.js`. As cores são escolha desta prancha, a das peças comuns de mercado, sem paleta nova de projeto. */
import { MATERIAIS as MATERIAIS_DA_FATIA_1, receitaDaPrancha } from './prancha.js';

export const TABELA = {
  vao: 30,
  margem: 10,
  espessuraDaPlaca: 1.6,
  profundidadeDaPlaca: 60,
  componentes: [
    { id: 'disco', perfil: 'ceramico-disco-5', largura: 5.6, materiais: { corpo: 'ceramica', terminal: 'estanho' } },
    { id: 'led-3', perfil: 'led-3', largura: 3.2, materiais: { corpo: 'vermelho', terminal: 'estanho' } },
    { id: 'led-5', perfil: 'led-5', largura: 5.9, materiais: { corpo: 'verde', terminal: 'estanho' } },
    { id: 'to-92', perfil: 'to-92', largura: 5.6, materiais: { corpo: 'preto', terminal: 'estanho' } },
    { id: 'soic-8', perfil: 'soic-8', largura: 6, materiais: { corpo: 'preto', terminal: 'estanho' } },
    { id: 'soic-16', perfil: 'soic-16', largura: 9.9, materiais: { corpo: 'preto', terminal: 'estanho' } },
    { id: 'borne-2', perfil: 'borne-2-vias', largura: 10.2, materiais: { corpo: 'azul-borne', parafuso: 'aluminio', terminal: 'estanho' } },
    { id: 'borne-3', perfil: 'borne-3-vias', largura: 15.2, materiais: { corpo: 'azul-borne', parafuso: 'aluminio', terminal: 'estanho' } },
    { id: 'jack', perfil: 'jack-de-alimentacao', largura: 14.4, materiais: { corpo: 'preto', terminal: 'estanho' } },
    { id: 'driver', perfil: 'modulo-driver-de-passo', largura: 20.3, materiais: { corpo: 'preto', placa: 'placa-verde', chip: 'preto', terminal: 'estanho' } },
    { id: 'mcu', perfil: 'modulo-microcontrolador', largura: 54.3, materiais: { corpo: 'preto', placa: 'placa-preta', chip: 'aluminio', terminal: 'estanho' } },
    {
      id: 'to-220', perfil: 'to-220-no-dissipador', largura: 25.4, materiais: { corpo: 'preto', aba: 'aluminio', terminal: 'estanho' },
      com: [{ id: 'dissipador', perfil: 'dissipador-to-220', materiais: { corpo: 'anodizado', terminal: 'estanho' } }],
    },
  ],
};

export const MATERIAIS = {
  ...MATERIAIS_DA_FATIA_1,
  ceramica: { cor: '#c9772f', aspereza: 0.6 },
  vermelho: { cor: '#c8262a', aspereza: 0.25 },
  verde: { cor: '#2f9e47', aspereza: 0.25 },
  'azul-borne': { cor: '#2d5fa8', aspereza: 0.6 },
  'placa-verde': { cor: '#24804a', aspereza: 0.7 },
  'placa-preta': { cor: '#2a2d33', aspereza: 0.7 },
  anodizado: { cor: '#2c2f35', aspereza: 0.55 },
};

export default receitaDaPrancha({
  nome: 'componente-eletronico/prancha-2',
  desc: 'prova da fatia 2 da família componente-eletronico: cerâmico de disco, LED de 3 e 5 mm, TO-92, SOIC-8 e 16, borne de 2 e 3 vias, jack, os dois módulos de placa e o TO-220 no dissipador',
  tabela: TABELA, materiais: MATERIAIS,
});
