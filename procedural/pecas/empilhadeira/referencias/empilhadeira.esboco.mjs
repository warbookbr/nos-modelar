/* empilhadeira.esboco.mjs — o rascunho da máquina inteira: a carcaça (`carcaca.esboco.mjs`, com a traseira de
 * `carcaca-traseira.esboco.mjs`), os eixos e as rodas (`eixos-rodas.esboco.mjs`), a torre e os garfos (`torre-garfos.esboco.mjs`) e o
 * protetor, o posto e os acessórios (`protetor-posto.esboco.mjs`), montados pela função que cada módulo exporta sobre um estado só.
 * Nenhuma medida mora aqui: cada uma está no módulo da sua parte, com a fonte. As decisões entre as partes (as rodas e os poços, o
 * painel sob as colunas da frente do protetor e o rebaixo dos cilindros de inclinação) estão em `carcaca.esboco.mjs` e no
 * ALINHAMENTO.md, em "Divergências entre as fontes".
 *
 * `contatos` declara os pares que se cruzam ou se tocam por desenho (um corpo encaixado no outro, um rebaixo preenchido, uma chapa
 * sobre a outra), para o relato de contatos de `npm run esboco:nucleo -- <este arquivo> --so-montar` mostrar como NÃO DECLARADA só a
 * travessia de verdade.
 *
 * `GIRAR=1 npm run esboco:nucleo -- <este arquivo> --vista isometrica` gira a máquina 180 graus para os três quartos de trás. */
import { montarCarcaca } from './carcaca.esboco.mjs';
import { montarEixosRodas } from './eixos-rodas.esboco.mjs';
import { montarTorreGarfos } from './torre-garfos.esboco.mjs';
import { montarProtetorPosto } from './protetor-posto.esboco.mjs';

const estado = { passos: [], topo: {}, origem: 0 };
montarCarcaca(estado);
montarEixosRodas(estado);
montarTorreGarfos(estado);
montarProtetorPosto(estado);
if (process.env.GIRAR) estado.passos.push(['rotaciona', { eixo: 'y', graus: 180, pivo: [0, 1000, -700] }]);

const atravessa = (a, b, motivo) => ({ par: [a, b], relacao: 'atravessa', motivo });
/* CARCAÇA: os volumes dela se sobrepõem por construção (a silhueta lateral de cada parte extrudada e cruzada com a planta), e a malha
   rígida é uma peça só na receita */
const DA_CARCACA = [
  ['capo', 'colunas', 'a borda de trás das colunas entra no capô, para não abrir fresta'],
  ['capo', 'contrapeso', 'o contrapeso acaba 12 mm dentro do capô, divisa fechada'],
  ['capo', 'grade', 'a moldura da grade fica no vão do capô'],
  ['capo', 'fundoGrade', 'o fundo da grade fica no vão do capô'],
  ['capo', 'laterais', 'o corpo das laterais vai 36 mm dentro do capô'],
  ['capo', 'pocoTraseiro', 'o fundo do poço traseiro sobe sob o capô'],
  ['capo', 'tampa', 'a aba da tampa desce dentro do capô'],
  ['colunas', 'laterais', 'as colunas assentam no corpo das laterais'],
  ['colunas', 'tampaMotor', 'o encosto da tampa do motor vai até dentro das colunas'],
  ['contrapeso', 'trinco', 'o trinco sai do rebaixo do contrapeso'],
  ['degraus', 'laterais', 'os degraus e a rampa assentam no corpo das laterais'],
  ['degraus', 'piso', 'os degraus encostam no piso pelo lado, 1 mm dentro'],
  ['degraus', 'tampaMotor', 'a rampa do degrau passa sob a tampa do motor'],
  ['fundoGrade', 'grade', 'o fundo escuro é a mesma rampa da moldura, recuada'],
  ['fundoGrade', 'tampa', 'a aba da tampa cobre o alto do fundo da grade'],
  ['furo', 'laterais', 'o fundo do furo da tampa de combustível fica no furo'],
  ['grade', 'tampa', 'a aba da tampa cobre o alto da moldura'],
  ['laterais', 'painel', 'o painel assenta entre as laterais'],
  ['laterais', 'paralamas', 'a aba e a beira do paralama nascem do corpo das laterais'],
  ['laterais', 'piso', 'o piso fica entre as laterais'],
  ['laterais', 'pocoTraseiro', 'o forro do poço traseiro reveste o arco das laterais'],
  ['laterais', 'tampaMotor', 'a tampa do motor assenta no corpo das laterais'],
  ['painel', 'paralamas', 'o pé do painel desce sobre a aba e a faixa'],
  ['painel', 'piso', 'o painel assenta no piso'],
  ['painel', 'tapete', 'o tapete passa sob o painel'],
  ['piso', 'tampaMotor', 'o pé da tampa do motor desce 20 mm no piso'],
  ['piso', 'tapete', 'o tapete é a chapa de cima do piso'],
];
/* AS FRENTES sobre a carcaça e entre si */
const DAS_FRENTES = [
  ['alavancas', 'painel', 'as hastes das alavancas saem da face de cima do painel'],
  ['alcas', 'protetor', 'os braços da alça entram na coluna da frente'],
  ['assento', 'encosto', 'o encosto assenta na almofada'],
  ['assento', 'tampaMotor', 'a base do assento segue a face curva da tampa do motor'],
  ['berco', 'cintas', 'as cintas passam pelos apoios do berço'],
  ['berco', 'tampa', 'a chapa do berço assenta na tampa do capô'],
  ['cilindroGlp', 'cintas', 'as cintas abraçam o cilindro'],
  ['colunaDirecao', 'painel', 'a coluna de direção sai de dentro do painel'],
  ['colunaDirecao', 'piso', 'o pé da coluna de direção fica no corpo do piso sob o painel'],
  ['colunaDirecao', 'volante', 'o eixo da coluna entra no cubo do volante'],
  ['colunas', 'protetor', 'os pés de trás do protetor entram nas colunas da carcaça'],
  ['escape', 'tampa', 'o pé do escape assenta na tampa do capô'],
  ['gradeTeto', 'protetor', 'as barras da grade se apoiam nas travessas do teto'],
  ['lanternas', 'protetor', 'as lanternas ficam na face de trás da travessa'],
  ['luzesTrabalho', 'protetor', 'as luzes ficam presas na face da frente da coluna'],
  ['painel', 'pedais', 'as hastes dos pedais saem da rampa do painel'],
  ['paralamas', 'protetor', 'os pés da frente do protetor assentam na aba do paralama'],
  ['espelho', 'protetor', 'o braço do espelho entra 5 mm na face de trás da coluna da frente'],
  /* os dois abaixo são folga no desenho (os montantes do carro correm a 3 mm da face de dentro dos canais internos); o relato os dá
     como travessia pela caixa, com o sólido inconclusivo, e a declaração diz isso */
  ['canaisExternos', 'placaGarfos', 'folga de desenho dada como travessia pela caixa: o carro corre à frente e dentro dos canais'],
  ['canaisInternos', 'placaGarfos', 'folga de desenho dada como travessia pela caixa: os montantes correm a 3 mm dos canais internos'],
];

export default {
  plano: 'A empilhadeira inteira em rascunho: carcaça, eixos e rodas, torre e garfos, protetor, posto e acessórios, sobre um estado só.',
  vista: 'direita',
  opcoes: [{
    titulo: 'empilhadeira inteira',
    nota: 'rascunho das fatias 1 a 7, com as pendências entre as partes acertadas na carcaça',
    passos: estado.passos,
    topo: estado.topo,
    contatos: [...DA_CARCACA, ...DAS_FRENTES].map(([a, b, m]) => atravessa(a, b, m)),
  }],
};
