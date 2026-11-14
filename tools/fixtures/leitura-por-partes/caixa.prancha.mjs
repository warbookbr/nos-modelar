/* caixa.prancha.mjs — prancha neutra para a leitura por partes: um bloco de 1000 x 400 mm visto de lado, com uma janela e um recorte
 * embaixo, e uma roda fora do contorno. Serve aos testes de `tools/modelar/leitura-por-regioes.test.mjs`. */
export const ESPEC = {
  titulo: 'bloco de prova',
  subtitulo: 'só para teste',
  escala: 0.5,
  tela: { largura: 700, altura: 400 },
  limites: { zMin: -500, zMax: 500, yMax: 400, xMax: 200 },
  vistas: { lateral: { x: 60, y: 80, leitura: 'projecao', rotulo: 'LATERAL' } },
  envelope: { comprimento: 1000, altura: 400 },
  autoria: {
    versao: 'mecanifica.prancha-autoria@1', estado: 'pronta', modo: 'parcial', confianca: 'alta',
    intencao: 'bloco neutro para os testes da leitura por partes',
    procedencias: [{ id: 'teste', tipo: 'medidas-declaradas', evidencia: 'medidas redondas escritas para o teste' }],
    incertezas: [],
  },
  camadas: [
    { vista: 'lateral', contorno: true, nome: 'corpo', tipo: 'poli', fechado: true, pts: [[-500, 100], [500, 100], [500, 400], [-500, 400]] },
    { vista: 'lateral', classe: 'vidro', nome: 'janela', tipo: 'poli', fechado: true, pts: [[100, 250], [400, 250], [400, 370], [100, 370]] },
    { vista: 'lateral', classe: 'painel', nome: 'recorte', tipo: 'poli', fechado: true, pts: [[-400, 130], [-250, 130], [-250, 200], [-400, 200]] },
    { vista: 'lateral', classe: 'roda', nome: 'roda', tipo: 'circulo', centro: [0, 50], raio: 50, foraDoContorno: true, motivoForaDoContorno: 'a roda desce abaixo do corpo' },
  ],
  cotas: [{ vista: 'lateral', de: [-500, 0], ate: [500, 0], desloca: [0, 26], extensao: true, texto: '1.000' }],
  landmarks: [{ id: 'canto', vista: 'lateral', em: [500, 400], rotuloEm: [520, 420] }],
  legenda: { x: 60, y: 340, itens: [['#1c2733', 'contorno']], notas: ['nota'] },
};
