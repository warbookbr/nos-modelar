/* ponteira.esboco.mjs — três formas da ponteira de escapamento do furgão, em mm, na bancada neutra. O apoio é um pedaço do
 * para-choque traseiro (600 x 260 x 140 mm, a traseira do furgão em -z, a face de trás em z -70, o fundo em y 0). A ponteira é
 * um tubo de aço de 55 mm de diâmetro e 3 mm de parede, que sai por baixo do para-choque, com a boca 50 mm atrás da face de
 * trás dele, a 180 mm do meio em x. Em todas as opções fica igual: o para-choque, o diâmetro e a posição do tubo.
 * (a) o tubo reto, virado para trás; (b) a ponta cortada em bisel de 35 graus, com a boca virada para baixo; (c) o tubo que
 * faz uma curva de raio 90 mm e termina virado para baixo.
 * Escrito em passos crus do núcleo (o atalho de formas não corta a ponta nem curva o tubo). */
const X = 180; const R = 27.5; const PAREDE = 3; const YC = -R; /* o tubo toca o fundo do para-choque */
const Z_FRENTE = 150; const Z_BOCA = -120; /* a boca do tubo reto */

const parachoque = [['chamferBox', { origemId: 1, larg: 600, alt: 260, prof: 140, chanfro: 20, em: [0, 0, 0] }]];
const tuboReto = (zBoca, id = 2) => ['extrusao', { origemId: id, eixo: 'z', altura: Z_FRENTE - zBoca, perfil: { circulo: { raio: R } }, furos: [{ circulo: { raio: R - PAREDE } }], em: [X, YC, zBoca] }];
const partes = (...p) => p.map(([nome, op, id]) => ['parte', { nome, sel: { origem: { op, id } } }]);

/* (a) */
const reta = { titulo: '(a) tubo reto, virado para trás', nota: 'Tubo de 55 mm que sai por baixo do para-choque e termina reto, 50 mm atrás dele.',
  passos: [...parachoque, tuboReto(Z_BOCA), ...partes(['parachoque', 'chamferBox', 1], ['ponteira', 'extrusao', 2])] };

/* (b) o corte: um cubo de 300 mm cuja face de frente passa pelo ponto de cima da boca, inclinada 35 graus */
const ANGULO = 35; const T = [X, YC + R, Z_BOCA]; const LADO = 300;
const n = [0, -Math.sin(ANGULO * Math.PI / 180), -Math.cos(ANGULO * Math.PI / 180)];
const centroDoCorte = T.map((t, i) => t + n[i] * (LADO / 2));
const bisel = { titulo: '(b) ponta cortada em bisel para baixo', nota: 'O tubo da (a), cortado em 35 graus: a boca fica virada para trás e para baixo, e o lado de cima passa 38 mm do de baixo.',
  passos: [...parachoque, tuboReto(Z_BOCA),
    ['cubo', { origemId: 3, larg: LADO, alt: LADO, prof: LADO, em: [0, -LADO / 2, 0] }],
    ['rotaciona', { eixo: 'x', graus: -ANGULO, pivo: [0, 0, 0], sel: { origem: { op: 'cubo', id: 3 } } }],
    ['transladar', { d: centroDoCorte, sel: { origem: { op: 'cubo', id: 3 } } }],
    ['subtrair', { origemId: 4, solidos: [{ origem: { op: 'extrusao', id: 2 } }, { origem: { op: 'cubo', id: 3 } }] }],
    ...partes(['parachoque', 'chamferBox', 1], ['ponteira', 'subtrair', 4])] };

/* (c) o tubo reto até z -85 e um cotovelo de raio 90 mm, de um quarto de volta, que desce. O cotovelo é um toro de revolução
 * (seção do tubo em volta do eixo y), cortado no quadrante x > 0, z < 0 e girado 90 graus em z para o eixo ficar em x. */
const RC = 90; const Z_CURVA = -85;
const circulo = (r, cx, k = 24) => Array.from({ length: k }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / k), r * Math.sin((2 * Math.PI * i) / k)]);
const curva = { titulo: '(c) virada para baixo, curva', nota: 'O tubo da (a) até 15 mm atrás do para-choque, e daí uma curva de raio 90 mm de um quarto de volta, com a boca para baixo.',
  passos: [...parachoque, tuboReto(Z_CURVA),
    ['lathe', { origemId: 3, eixo: 'y', lados: 32, perfil: circulo(R, RC), furos: [circulo(R - PAREDE, RC)] }],
    ['cubo', { origemId: 4, larg: RC + 60, alt: 200, prof: RC + 60, em: [(RC + 60) / 2, -100, -(RC + 60) / 2] }],
    ['intersectar', { origemId: 5, solidos: [{ origem: { op: 'lathe', id: 3 } }, { origem: { op: 'cubo', id: 4 } }] }],
    ['rotaciona', { eixo: 'z', graus: 90, pivo: [0, 0, 0], sel: { origem: { op: 'intersectar', id: 5 } } }],
    ['transladar', { d: [X, YC - RC, Z_CURVA], sel: { origem: { op: 'intersectar', id: 5 } } }],
    ...partes(['parachoque', 'chamferBox', 1], ['tubo', 'extrusao', 2], ['curva', 'intersectar', 5])] };

export default { formato: 'esboco-nucleo@1', opcoes: [reta, bisel, curva] };
