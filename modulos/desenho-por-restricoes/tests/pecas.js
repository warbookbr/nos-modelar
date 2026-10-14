/* pecas.js — duas peças de desenho e uma família sintética que as usa, para os testes de peça e de família. As peças são as formas que
   as notas dos ajustes à referência repetem, desenhadas de novo com medidas inventadas: o arco de roda com aro (um painel com o vão
   da roda, o canto do vão arredondado com o centro nomeado, o aro em volta do vão e a roda como geometria de construção
   concêntrica com o canto) e o anel coaxial (um corpo e um anel sobre o mesmo eixo, a pilha de tambores do braço). */

export const arcoDeRodaComAro = () => ({
  descricao: 'painel de lado com o vão da roda recortado na frente, o aro em volta do vão e a roda concêntrica com o canto do vão',
  parametros: { largura: null, altura: null, vao: null, topoDoArco: null, raio: null, aro: null, folga: 20 },
  pontos: {
    TL: [0, '=altura'], FF: [0, '=topoDoArco'], KF: ['=vao', '=topoDoArco'], PF: ['=vao', 0], BR: ['=largura', 0], TR: ['=largura', '=altura'],
    PF2: ['=vao+aro', 0], KF2: ['=vao+aro', '=topoDoArco+aro'], FF2: [0, '=topoDoArco+aro'],
    E: ['=vao-raio', '=topoDoArco-raio'],
  },
  partes: {
    painel: { poligono: ['TL', 'FF', 'KF', 'PF', 'BR', 'TR'], raioDoCanto: { KF: { raio: '=raio', centro: 'CKF' } } },
    aro: { poligono: ['FF', 'KF', 'PF', 'PF2', 'KF2', 'FF2'], raioDoCanto: { KF: '=raio', KF2: '=raio+aro' } },
  },
  construcao: { roda: { circulo: { centro: 'E' } } },
  relacoes: [
    { nome: 'face a prumo', vertical: ['TL', 'FF'] },
    { nome: 'topo do vão abaixo do topo do painel', distancia: ['FF', 'TL'], mm: '=altura-topoDoArco', eixo: 'v', lado: 'abaixo' },
    { nome: 'topo do vão de nível', horizontal: ['FF', 'KF'] },
    { nome: 'vão', distancia: ['KF', 'FF'], mm: 'vao', eixo: 'h', lado: 'direita' },
    { nome: 'perna do vão a prumo', vertical: ['KF', 'PF'] },
    { nome: 'altura do vão', distancia: ['KF', 'PF'], mm: 'topoDoArco', eixo: 'v', lado: 'acima' },
    { nome: 'saia de nível', horizontal: ['PF', 'BR'] },
    { nome: 'comprimento da saia', distancia: ['BR', 'PF'], mm: '=largura-vao', eixo: 'h', lado: 'direita' },
    { nome: 'traseira a prumo', vertical: ['BR', 'TR'] },
    { nome: 'altura do painel', distancia: ['TR', 'BR'], mm: 'altura', eixo: 'v', lado: 'acima' },
    { nome: 'pé do aro de nível', horizontal: ['PF', 'PF2'] },
    { nome: 'largura do aro', distancia: ['PF2', 'PF'], mm: 'aro', eixo: 'h', lado: 'direita' },
    { nome: 'perna de fora do aro a prumo', vertical: ['PF2', 'KF2'] },
    { nome: 'altura do aro', distancia: ['KF2', 'PF2'], mm: '=topoDoArco+aro', eixo: 'v', lado: 'acima' },
    { nome: 'topo do aro de nível', horizontal: ['KF2', 'FF2'] },
    { nome: 'face do aro a prumo', vertical: ['FF2', 'FF'] },
    { nome: 'roda concêntrica com o vão', coincidente: ['E', 'CKF'] },
    { nome: 'raio da roda', raio: 'roda', mm: '=raio-folga' },
  ],
  ligacoes: { face: 'TL', fundoDaFace: 'FF', traseira: 'TR', roda: 'roda', eixoDaRoda: 'E', painel: 'painel', aro: 'aro' },
  frenteParaFundo: ['aro', 'painel'],
});

export const anelCoaxial = () => ({
  descricao: 'um corpo e um anel mais largo sobre o mesmo eixo',
  parametros: { diametro: null, comprimento: null, diametroDoAnel: '=diametro*1.4', posicaoDoAnel: '=comprimento/4', alturaDoAnel: '=comprimento/5' },
  pontos: { P: [0, 0], Q: [0, '=comprimento'], R1: [0, '=posicaoDoAnel'], R2: [0, '=posicaoDoAnel+alturaDoAnel'] },
  partes: {
    corpo: { barra: ['P', 'Q'], espessura: '=diametro' },
    anel: { barra: ['R1', 'R2'], espessura: '=diametroDoAnel' },
  },
  relacoes: [
    { nome: 'comprimento do corpo', distancia: ['P', 'Q'], mm: 'comprimento' },
    { nome: 'começo do anel no eixo', sobre: ['R1', ['P', 'Q']] },
    { nome: 'fim do anel no eixo', sobre: ['R2', ['P', 'Q']] },
    { nome: 'posição do anel', distancia: ['P', 'R1'], mm: 'posicaoDoAnel' },
    { nome: 'altura do anel', distancia: ['R1', 'R2'], mm: 'alturaDoAnel' },
  ],
  ligacoes: { inicio: 'P', fim: 'Q', corpo: 'corpo', anel: 'anel' },
  frenteParaFundo: ['anel', 'corpo'],
});

/* O desenho da carcaça sintética: o painel com o arco de roda na frente (a roda assenta no chão e o painel fica preso a ela pelo
   centro do vão) e um mastro de dois tambores em pé no topo do painel, a `recuo` da traseira. */
export const carcacaSintetica = ({ comprimento = 2200, altura = 700, raioDoArco = 260, vao = 420, topoDoArco = 400, aro = 25, recuo = 300, alturaDoMastro = 400, diametroDoMastro = 100 } = {}) => ({
  formato: 'mecanifica.desenho@3',
  objeto: 'carcaça sintética',
  vista: 'lateral',
  olhando: 'do lado direito, frente à esquerda',
  parametros: { comprimento, altura, raioDoArco, vao, topoDoArco, aro, recuo, alturaDoMastro, diametroDoMastro, folga: '=raioDoArco/10', pe: '=2*raioDoArco-folga-topoDoArco' },
  pecas: { arcoDeRodaComAro: arcoDeRodaComAro(), anelCoaxial: anelCoaxial() },
  usos: {
    arco: {
      peca: 'arcoDeRodaComAro',
      parametros: { largura: 'comprimento', altura: 'altura', vao: 'vao', topoDoArco: 'topoDoArco', raio: 'raioDoArco', aro: 'aro', folga: 'folga' },
      origem: [0, '=pe'],
    },
    mastro: {
      peca: 'anelCoaxial',
      parametros: { diametro: 'diametroDoMastro', comprimento: 'alturaDoMastro' },
      origem: ['=comprimento-recuo', '=pe+altura'],
    },
  },
  referencias: { chao: { reta: 'horizontal', v: 0 }, frente: { reta: 'vertical', h: 0 } },
  relacoes: [
    { nome: 'face na frente do desenho', sobre: ['arco.face', 'frente'] },
    { nome: 'roda no chão', tangente: ['arco.roda', 'chao'], lado: 'acima' },
    { nome: 'mastro a prumo', vertical: ['mastro.inicio', 'mastro.fim'] },
    { nome: 'mastro em pé no topo do painel', sobre: ['mastro.inicio', ['arco.face', 'arco.traseira']] },
    { nome: 'recuo do mastro', distancia: ['mastro.inicio', 'arco.traseira'], mm: 'recuo', eixo: 'h', lado: 'esquerda' },
  ],
  frenteParaFundo: ['mastro', 'arco'],
});

/* A família da carcaça sintética: nove parâmetros com a faixa de cada um e dois perfis. */
export const familiaSintetica = () => {
  const { parametros, ...desenho } = carcacaSintetica();
  const { comprimento, altura, raioDoArco, vao, topoDoArco, aro, recuo, alturaDoMastro, diametroDoMastro, ...derivados } = parametros;
  const faixa = (unidade, minimo, padrao, maximo, medio = padrao) => ({ unidade, padrao, minimo, medio, maximo });
  /* O médio de quatro parâmetros difere do padrão, para a prova do médio ter um conjunto de valores que o padrão não cobre. */
  return {
    formato: 'mecanifica.familia-de-desenho@1',
    id: 'carcaca-sintetica',
    versao: '1.0.0',
    descricao: 'painel de lado com arco de roda, aro e mastro, só para os testes',
    parametros: {
      comprimento: faixa('mm', 1800, 2200, 2600),
      altura: faixa('mm', 600, 700, 900, 750),
      raioDoArco: faixa('mm', 220, 260, 320, 270),
      vao: faixa('mm', 300, 420, 520, 410),
      topoDoArco: faixa('mm', 300, 400, 450),
      aro: faixa('mm', 15, 25, 40),
      recuo: faixa('mm', 150, 300, 500, 320),
      alturaDoMastro: faixa('mm', 200, 400, 600),
      diametroDoMastro: faixa('mm', 60, 100, 160),
    },
    perfis: {
      compacta: { descricao: 'a menor', parametros: { comprimento: 1800, altura: 600, vao: 300, topoDoArco: 300, raioDoArco: 220, recuo: 150 } },
      larga: { parametros: { comprimento: 2600, vao: 520, aro: 40 } },
    },
    desenho: { ...desenho, parametros: derivados },
  };
};
