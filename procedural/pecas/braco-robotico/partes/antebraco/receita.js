/* braco-robotico/antebraco — um pé redondo deitado no eixo da junta do cotovelo, o tubo que sai dele na horizontal e, na ponta, a carcaça da junta 4, numa malha única.
 *
 * Sétima etapa da montagem `braco-robotico/montagem.json`. O combinado com a pessoa (2026-11-09) está em `../../ALINHAMENTO.md`,
 * seções "A saída do cotovelo e o antebraço" e "O eixo da junta do cotovelo": o antebraço é o mesmo T que a coluna é no ombro, um pé
 * redondo de 190 mm deitado no eixo da junta, encostado no anel do antebraço, e o tubo de 190 mm saindo dele, perpendicular ao eixo,
 * na horizontal, para +x do mundo (a direita na vista frontal do braço montado), com 253 mm do eixo da junta à ponta
 * (`../../referencias/cotovelo-eixo.png`, `../../referencias/lateral-sem-cabo.prancha.png`). O raio vem da porta `topo` do anel do
 * antebraço, por vínculo da montagem; o valor da TABELA só vale para ver a parte sozinha.
 *
 * Referencial local: origem no centro da face do pé que encosta no anel; x é o eixo da junta, para fora do anel (no mundo, -Z); y
 * para cima; z é o eixo do tubo (no mundo, +X). O pé é um cilindro de eixo x, de raio igual ao do tubo e espessura `espessuraDoPe` (210 mm,
 * 20 mm mais que o diâmetro), e o tubo sai do eixo da junta (z = 0) rente à face de fora do pé (o tubo não passa dela); do lado do
 * anel sobram 20 mm entre o tubo e o plano do anel, para a porta `apoio` medir só o pé (ver a nota em TABELA). O tubo vai de z = 0 a `comprimento`.
 *
 * Técnica da do cotovelo: dois `lathe` unidos por `unir`, com `arredondarCostura` no encontro, e chanfro de 2 mm no próprio perfil
 * das tampas. Duas partes nomeadas, uma só malha: o tubo é o que está além do pé (z a partir do raio) e o pé é o resto.
 *
 * Carcaça da junta 4 (seção "O punho, 2026-11-09" de `../../ALINHAMENTO.md`, esboço `../../referencias/punho-diametro.esboco.json`, formas
 * `carcaca` e `anel4`): um tubo deitado de 190 mm e 210 mm de comprimento, de eixo x local (paralelo ao do cotovelo e ao do ombro),
 * centrado na ponta do tubo (z = `comprimento`, 253 mm do eixo do cotovelo), com a ponta de trás rente às costas do tubo (x = `espessuraDoPe`,
 * o plano de fora do pé) e a face da frente em x = `espessuraDoPe` - `comprimentoDaCarcaca` (no mundo, para +Z, o lado oposto ao da saída do
 * cotovelo). A técnica é a da carcaça do cotovelo no braço superior: `lathe` unido por `unir`, `arredondarCostura` de raio 10 em 144 lados e
 * chanfro de 2 mm nas duas tampas. O tubo termina no centro da carcaça (dentro dela), sem chanfro na ponta. Contornos do núcleo, os mesmos do
 * braço superior: a parede de trás do tubo é tangente à tampa de trás da carcaça, e o `unir` deixaria uma fresta, então `avancoDaPonta` põe
 * essa tampa 0,05 mm além; a porta `apoio` sai da tampa do `lathe` do pé (`lathe` + `faixa`), e não do `unir`, porque a face da frente da carcaça fica no mesmo plano x = 0 e a conferência da porta mediria a carcaça junto; a conferência da porta `saida` mede a parte inteira, então a parte `carcaca` leva só a região da carcaça (o filete
 * do encontro com o tubo, que passa de 95 mm do eixo da carcaça, fica na parte `tubo`).
 *
 * Portas que a receita publica:
 *   apoio — anel que ocupa, eixo +X local, centro no meio da face do pé que encosta, borda dessa face. Senta no `topo` do anel.
 *   saida — anel que recebe, eixo -X local (no mundo +Z), centro no meio da face da frente da carcaça, face inteira. O anel da junta 4
 *           (135 mm) assenta aqui.
 */

export const TABELA = {
  /* Vem do anel pela montagem (porta `topo`, medida `raioExterno`); o valor daqui só vale para ver a parte sozinha. */
  raio: 95,
  /* Do eixo da junta do cotovelo ao eixo da junta 4, o centro da carcaça (a ponta do tubo, da prancha). */
  comprimento: 253,
  /* Espessura do pé ao longo do eixo da junta. O tubo fica rente à face de fora e sobra, do lado do anel, um recuo de espessuraDoPe - diâmetro: sem ele o tubo roçaria o plano do anel e a porta `apoio` mediria o tubo como se fosse o pé. */
  espessuraDoPe: 210,
  /* Comprimento da carcaça da junta 4, ao longo do eixo da junta; a ponta de trás fica rente às costas do tubo. */
  comprimentoDaCarcaca: 210,
  /* Quanto a tampa de trás da carcaça passa das costas do tubo, em mm: as duas são tangentes e o `unir` deixaria uma fresta (a partir de 0,01 mm ele fecha). */
  avancoDaPonta: 0.05,
  /* Chanfro estreito das bordas das tampas, como as carcaças do braço. */
  chanfro: 2,
  suaveDoChanfro: 0.8,
  lados: 144,
  /* Arredondamento do encontro: raio nominal, raio mínimo e distância de afinamento até sumir onde o encontro fica tangente (mm). */
  raioDoEncontro: 10,
  raioMinimo: 3,
  afinarPontas: 40,
};

const m = (mm) => mm / 1000;
const ID = { pe: 1, tubo: 2, carcaca: 5, uniao: 3, costura: 4 };

/* a seção de um cilindro, [raio, ao longo do eixo], com chanfro de c nas pontas pedidas */
function seccao(r, h, c, { baixo, cima }) {
  const p = [[0, 0]];
  if (baixo) p.push([r - c, 0], [r, c]); else p.push([r, 0]);
  if (cima) p.push([r, h - c], [r - c, h]); else p.push([r, h]);
  p.push([0, h]);
  return p;
}

export function derivar(t = TABELA) {
  return { R: m(t.raio), L: m(t.comprimento), c: m(t.chanfro), E: m(t.espessuraDoPe), xFrente: m(t.espessuraDoPe - t.comprimentoDaCarcaca), pontos: { xFaceDeFora: t.espessuraDoPe, zEixoDaJunta4: t.comprimento, xFaceDaFrente: t.espessuraDoPe - t.comprimentoDaCarcaca, zInicioDaCarcaca: t.comprimento - t.raio, diametro: 2 * t.raio, comprimentoDaCarcaca: t.comprimentoDaCarcaca } };
}

export function gerarPassos(t = TABELA) {
  const { R, L, c, E, xFrente } = derivar(t);
  const corpo = { origem: { op: 'arredondarCostura', id: ID.costura } };
  return [
    /* O pé: cilindro de eixo x, raio R e espessura E, com chanfro nas duas faces. */
    ['lathe', { origemId: ID.pe, lados: t.lados, eixo: 'x', perfil: seccao(R, E, c, { baixo: true, cima: true }) }],
    /* O tubo: cilindro de eixo z que sai do eixo da junta, rente à face de fora do pé, até o centro da carcaça (a ponta fica dentro dela, sem chanfro). */
    ['lathe', { origemId: ID.tubo, lados: t.lados, eixo: 'z', em: [E - R, 0, 0], perfil: seccao(R, L, c, { baixo: false, cima: false }) }],
    /* A carcaça da junta 4: cilindro de eixo x centrado em z = L, da face da frente (xFrente) até as costas do tubo, que passam 0,05 mm (avancoDaPonta). */
    ['lathe', { origemId: ID.carcaca, lados: t.lados, eixo: 'x', em: [xFrente, 0, L], perfil: seccao(R, m(t.comprimentoDaCarcaca + t.avancoDaPonta), c, { baixo: true, cima: true }) }],
    ['unir', { origemId: ID.uniao, solidos: [{ origem: { op: 'lathe', id: ID.pe } }, { origem: { op: 'lathe', id: ID.tubo } }, { origem: { op: 'lathe', id: ID.carcaca } }] }],
    ['arredondarCostura', { origemId: ID.costura, de: { op: 'unir', id: ID.uniao }, raio: m(t.raioDoEncontro), raioMinimo: m(t.raioMinimo), afinarPontas: m(t.afinarPontas) }],
    ['parte', { nome: 'tubo', sel: { tudo: true } }],
    ['parte', { nome: 'pe', sel: { regiao: { min: [-1, -1, -1], max: [1, 1, R] } }, substituir: true }],
    ['parte', { nome: 'carcaca', sel: { regiao: { min: [-1, -1, L - R], max: [1, 1, 2 * L] } }, substituir: true }],
    ['publicarPorta', {
      nome: 'apoio', de: { op: 'lathe', id: ID.pe, faixa: 0, lado: 36 },
      interface: { forma: 'anel', papel: 'ocupa', eixo: [1, 0, 0], centro: [0, 0, 0], raioInterno: R - 0.010, raioExterno: R, inicio: 0, fim: 0.005 },
    }],
    ['publicarPorta', {
      nome: 'saida', de: { op: 'lathe', id: ID.carcaca, faixa: 0 },
      interface: { forma: 'anel', papel: 'recebe', eixo: [-1, 0, 0], centro: [xFrente, 0, L], raioInterno: 0, raioExterno: R, inicio: -0.005, fim: 0 },
    }],
  ];
}

const receita = {
  meta: { nome: 'braco-robotico/antebraco', desc: 'antebraço do braço robótico: pé redondo de 190 mm no eixo da junta do cotovelo, tubo de 190 mm na horizontal para +x e carcaça da junta 4 (210 mm, eixo paralelo ao do cotovelo) na ponta, numa malha só' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro da face do pé que encosta no anel; x é o eixo da junta (no mundo -Z), y para cima, z ao longo do tubo (no mundo +X)', ...derivar(this.PARAMS).pontos }; },
  PLANO: {
    objeto: 'antebraço do braço robótico: pé redondo no eixo da junta do cotovelo, encostado no anel, o tubo de 190 mm que sai dele na horizontal para +x do mundo e, na ponta, a carcaça da junta 4, um tubo deitado de eixo paralelo ao do cotovelo',
    referencias: ['../../referencias/cotovelo-eixo.png', '../../referencias/cotovelo-lado.png', '../../referencias/antebraco-opcoes.png', '../../referencias/lateral-sem-cabo.prancha.png'],
    escala: { medida: 'diâmetro do tubo e do pé, igual ao do cotovelo e da coluna', milimetros: 190 },
    partes: [
      { nome: 'pe', forma: 'disco redondo de eixo da junta do cotovelo (-Z no mundo), 190 mm de diâmetro e 210 mm de espessura, com a face de dentro encostada no anel do antebraço e a de fora rente ao tubo, fundido ao tubo com concordância no encontro: uma peça só', tecnica: 'lathe de eixo x unido ao tubo por unir; arredondarCostura de raio constante em modo curvo, com raioMinimo e afinarPontas; chanfro de 2 mm nas duas faces do perfil' },
      { nome: 'tubo', forma: 'cilindro reto de 190 mm que sai do eixo da junta, perpendicular a ele, na horizontal para +x do mundo, sem degrau, rente à face de fora do pé, até o centro da carcaça da junta 4 (253 mm do eixo do cotovelo), onde entra nela', tecnica: 'lathe de eixo z unido ao pé e à carcaça por unir, sem chanfro na ponta (que fica dentro da carcaça); o arredondamento afina até sumir onde o encontro é tangente' },
      { nome: 'carcaca', forma: 'tubo deitado de 190 mm e 210 mm de comprimento, eixo z do mundo, centrado na ponta do tubo, ponta de trás rente às costas dele; face da frente plana com chanfro de 2 mm, para +Z, é a saída do anel da junta 4; fundido ao tubo', tecnica: 'lathe de eixo x com chanfro de 2 mm no perfil, unido ao tubo por unir; arredondarCostura de raio 10, modo curvo; avancoDaPonta de 0,05 mm na tampa de trás; parte por região' },
    ],
    criteriosDeReprovacao: [
      'tubo que não saia na horizontal para +x do mundo (por exemplo, seguindo o eixo da junta, para trás)',
      'pé fora do eixo da junta do cotovelo, ou não encostado no anel do antebraço',
      'diâmetro do tubo ou do pé diferente de 190 mm',
      'distância do eixo da junta do cotovelo ao eixo da carcaça diferente de 253 mm',
      'eixo da carcaça que não seja paralelo ao da junta do cotovelo e do ombro (eixo z do mundo)',
      'face da frente da carcaça (a saída) voltada para o mesmo lado da saída do cotovelo (-Z do mundo), em vez do oposto (+Z)',
      'carcaça de diâmetro diferente de 190 mm ou de comprimento diferente de 210 mm, ou com a ponta de trás fora de rente às costas do tubo',
      'fresta, emenda, degrau ou sulco entre o tubo e a carcaça, ou quina viva no encontro: precisa ser uma peça só',
      'tubo afunilado, ou com degrau depois do pé ou na entrada da carcaça',
      'tubo passando da face de fora do pé, em vez de rente a ela',
      'quina viva ou faixa de sombra no encontro do pé com o tubo, ou fresta, emenda ou parafuso entre eles: precisa ser uma peça só',
      'aresta viva nas bordas das tampas, sem o chanfro estreito de 2 mm',
    ],
  },
  /* Uma malha só: o pé e o tubo se tocam por construção; o contato com o anel é a relação de assento da montagem. */
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
