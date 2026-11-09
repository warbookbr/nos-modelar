/* braco-robotico/braco — o braço superior, rígido da junta do ombro à junta do cotovelo, numa malha única de três tubos.
 *
 * Quarta etapa da montagem `braco-robotico/montagem.json`. Em 2026-11-09 a pessoa decidiu que a coluna e o cotovelo viram uma peça só
 * (seções de 2026-11-03, 2026-11-08 e 2026-11-09 no fim de `../../ALINHAMENTO.md`): eram duas peças encostadas, e os chanfros de 2 mm
 * das duas bordas do encontro faziam um sulco visível. A forma de fora é a de antes: o pé redondo de 190 mm no eixo da junta do ombro,
 * o tubo vertical de 190 mm até o eixo do cotovelo e, no alto, o tubo deitado de 190 mm e 210 mm de comprimento, de eixo paralelo ao do
 * ombro, com a ponta da frente rente à frente do tubo vertical e a saída para trás.
 *
 * Referencial local: o eixo +Z é o eixo da junta do ombro e a origem é o centro do disco do pé que encosta na face do anel da junta; Y
 * para cima. O pé é um cilindro de eixo Z (raio igual ao da coluna, espessura igual ao diâmetro dela), de z = 0 a z = diâmetro. O tubo
 * vertical sobe do eixo da junta, centrado na espessura do pé (x = 0, z = raio), até o eixo do cotovelo, em y = alturaTotal - raio +
 * alturaDoEixo. O tubo deitado, de eixo z nessa altura, corre de z = diâmetro (a frente, rente à do tubo vertical) a diâmetro -
 * comprimento. O fundo do pé fica a `raio` abaixo do eixo da junta do ombro e o topo do conjunto a `alturaTotal + alturaDoEixo` acima
 * do fundo.
 *
 * Os três tubos são `lathe` (o pé de eixo z, o vertical de eixo y, o deitado de eixo z) juntados por `unir`, e as costuras são
 * `arredondarCostura` de raio constante em modo curvo, com `raioMinimo` e `afinarPontas` para o arredondamento sumir onde o encontro
 * fica tangente (a parede do tubo vertical toca a frente do pé e a do tubo deitado). É a técnica da peça de prova
 * `tools/fixtures/uniao-de-tubos/`. O chanfro de 2 mm fica só nas tampas de fora, no próprio perfil de revolução: as duas faces do pé e
 * as duas pontas do tubo deitado. O tubo vertical não tem chanfro: as duas pontas dele ficam dentro dos outros tubos.
 *
 * Três partes nomeadas, uma só malha, porque a região do núcleo recorta por caixa: `coluna` leva tudo e as outras duas a substituem por
 * região. `cotovelo` é o que fica a partir do eixo do cotovelo (a metade de cima do tubo deitado), `pe` é o que fica até `alturaDoPe` (70
 * mm acima do eixo do ombro; a caixa vai de y = -95, o fundo) e `coluna` é o resto: o arco de cima do disco, o tubo vertical, a metade de
 * baixo do tubo deitado e as costuras. O pé para em 70 mm, e não no topo do disco (95), porque o filete do encontro do pé com o tubo vertical
 * sobe além do raio do pé junto da face de trás (até 102 mm do eixo, a menos de 10 mm do plano), e a conferência da porta `juntaNoOmbro`
 * mede o raio em todos os vértices da parte da face dela; com o filete em outra parte, a parte do pé não passa de 95 mm.
 *
 * Portas que a receita publica:
 *   juntaNoOmbro — cilindro interno de eixo +Z, a face do pé que encosta no anel da junta do ombro (um triângulo da tampa de trás do `lathe`
 *                  do pé, em y < 0, que fica na parte `pe`).
 *   saida        — anel que recebe, eixo -Z, centro no meio da face de trás do tubo deitado, face inteira, no eixo da junta do cotovelo.
 *                  O anel do antebraço assenta aqui.
 *
 * Ponta da frente. O tubo vertical e a tampa da frente do tubo deitado são tangentes ao micrômetro, e com isso o `unir` deixa uma fresta de
 * 8 mm de corda no plano da tampa; `avancoDaPonta` põe a tampa 0,05 mm à frente (a partir de 0,01 mm a união fecha). A face de trás, onde
 * está a saída, não muda.
 */
export const TABELA = {
  /* Vem do ombro pela montagem (porta `juntaDoOmbro`); o valor daqui só vale
     para ver a parte sozinha. Limita o raio do pé: o pé não passa do anel. */
  raioDaJunta: 95,
  diametroDaColuna: 190,
  /* Do fundo do pé ao topo da coluna (onde antes assentava o cotovelo); o tubo deitado sobe `alturaDoEixo` além dele. */
  alturaTotal: 502,
  /* Altura do eixo da junta do cotovelo acima do topo da coluna. */
  alturaDoEixo: 117,
  /* Comprimento do tubo deitado; a ponta da frente fica rente à frente do tubo vertical. Com 208 ou menos a porta `saida` mede o tubo vertical. */
  comprimento: 210,
  /* Quanto a tampa da frente do tubo deitado passa da frente do tubo vertical, em mm. Com as duas rentes ao micrômetro o `unir` deixa uma
     fresta de 8 mm de corda na tangência (a parede do tubo vertical toca a tampa em linha); a partir de 0,01 mm ele fecha. */
  avancoDaPonta: 0.05,
  /* Até que altura (y, a partir do eixo da junta do ombro) vai a parte `pe`. */
  alturaDoPe: 70,
  /* Chanfro estreito das tampas de fora, em mm. */
  chanfro: 2,
  /* Lados dos três cilindros de revolução. */
  lados: 144,
  /* Arredondamento das costuras: raio nominal, raio mínimo e distância de afinamento até sumir nas pontas (mm). */
  raioDoEncontro: 10,
  raioMinimo: 3,
  afinarPontas: 40,
};

const m = (mm) => mm / 1000;
const ID = { pe: 1, coluna: 2, deitado: 3, uniao: 4, costura: 5 };

/* a seção de um cilindro, [raio, ao longo do eixo], com chanfro de c nas pontas pedidas */
function seccao(r, h, c, { baixo, cima }) {
  const p = [[0, 0]];
  if (baixo) p.push([r - c, 0], [r, c]); else p.push([r, 0]);
  if (cima) p.push([r, h - c], [r - c, h]); else p.push([r, h]);
  p.push([0, h]);
  return p;
}

export function derivar(t = TABELA) {
  const rc = t.diametroDaColuna / 2;
  if (rc > t.raioDaJunta) throw new Error('a coluna não cabe no anel da junta: o pé passaria da borda dele.');
  const esp = 2 * rc;
  /* Eixo da junta do ombro em y = 0; o fundo do pé em -rc; o topo da coluna em alturaTotal - rc; o eixo do cotovelo acima dele. */
  const yTopoDaColuna = t.alturaTotal - rc;
  const yEixo = yTopoDaColuna + t.alturaDoEixo;
  const zFace = esp - t.comprimento;
  return {
    rc, esp, yTopoDaColuna, yEixo, zFace, c: t.chanfro,
    pontos: { fundo: -rc, topoDaColuna: yTopoDaColuna, alturaDoEixo: yEixo, topo: yEixo + rc, zFrente: esp, zFace },
  };
}

export function gerarPassos(t = TABELA) {
  const { rc, esp, yEixo, zFace } = derivar(t);
  const r = m(rc);
  const c = m(t.chanfro);
  const corpo = { origem: { op: 'arredondarCostura', id: ID.costura } };
  return [
    ['lathe', { origemId: ID.pe, lados: t.lados, eixo: 'z', perfil: seccao(r, m(esp), c, { baixo: true, cima: true }) }],
    ['lathe', { origemId: ID.coluna, lados: t.lados, eixo: 'y', em: [0, 0, r], perfil: seccao(r, m(yEixo), c, { baixo: false, cima: false }) }],
    ['lathe', { origemId: ID.deitado, lados: t.lados, eixo: 'z', em: [0, m(yEixo), m(zFace)], perfil: seccao(r, m(t.comprimento + t.avancoDaPonta), c, { baixo: true, cima: true }) }],
    ['unir', { origemId: ID.uniao, solidos: [{ origem: { op: 'lathe', id: ID.pe } }, { origem: { op: 'lathe', id: ID.coluna } }, { origem: { op: 'lathe', id: ID.deitado } }] }],
    ['arredondarCostura', { origemId: ID.costura, de: { op: 'unir', id: ID.uniao }, raio: m(t.raioDoEncontro), raioMinimo: m(t.raioMinimo), afinarPontas: m(t.afinarPontas) }],
    ['parte', { nome: 'coluna', sel: { tudo: true } }],
    ['parte', { nome: 'pe', sel: { regiao: { min: [-1, -1, -1], max: [1, m(t.alturaDoPe), 1] } }, substituir: true }],
    ['parte', { nome: 'cotovelo', sel: { regiao: { min: [-1, m(yEixo), -1], max: [1, 2, 1] } }, substituir: true }],
    ['publicarPorta', {
      nome: 'juntaNoOmbro', de: { op: 'lathe', id: ID.pe, faixa: 0, lado: 36 },
      interface: { forma: 'cilindro', papel: 'interna', eixo: [0, 0, 1], centro: [0, 0, 0], raio: r, inicio: 0, fim: 0.005 },
    }],
    ['publicarPorta', {
      nome: 'saida', de: { op: 'lathe', id: ID.deitado, faixa: 0 },
      interface: { forma: 'anel', papel: 'recebe', eixo: [0, 0, -1], centro: [0, m(yEixo), m(zFace)], raioInterno: 0, raioExterno: r, inicio: -0.005, fim: 0 },
    }],
  ];
}

const receita = {
  meta: { nome: 'braco-robotico/braco', desc: 'braço superior do braço robótico: pé redondo de 190 mm no eixo da junta do ombro, tubo vertical e tubo deitado no eixo da junta do cotovelo, numa malha só' },
  PARAMS: TABELA,
  get TOPO() { return { origem: 'centro do disco do pé que encosta no anel da junta; +Z é o eixo da junta, y para cima, o tubo vertical à frente (z de 0 a 190), a saída do cotovelo para -z', ...derivar(this.PARAMS).pontos }; },
  PLANO: {
    objeto: 'braço superior do braço robótico, rígido da junta do ombro à do cotovelo: pé redondo, tubo vertical de 190 mm e tubo deitado de 190 mm com a saída redonda do antebraço',
    referencias: ['../../referencias/coluna-reta.png', '../../referencias/coluna-reta-lado.png', '../../referencias/cotovelo-opcao3.png'],
    escala: { medida: 'diâmetro dos três tubos, igual ao da coluna', milimetros: 190 },
    partes: [
      { nome: 'pe', forma: 'disco redondo de eixo Z (o da junta do ombro), 190 mm de diâmetro e de espessura, encostado na face do anel da junta, fundido ao tubo vertical; faces planas com chanfro de 2 mm; a parte é o disco até 70 mm acima do eixo', tecnica: 'lathe de eixo z unido aos outros dois tubos por unir; arredondarCostura de raio 10 em 144 lados, modo curvo, com raioMinimo e afinarPontas; chanfro de 2 mm no perfil; parte por região' },
      { nome: 'coluna', forma: 'tubo vertical redondo e reto de 190 mm, do pé até o eixo da junta do cotovelo, sem degrau nem emenda no encontro com o tubo deitado; inclui o arco de cima do pé, a metade de baixo do tubo deitado e as costuras', tecnica: 'lathe de eixo y sem chanfro, unido ao pé e ao tubo deitado por unir; arredondarCostura de raio 10 em modo curvo' },
      { nome: 'cotovelo', forma: 'metade de cima do tubo deitado de 190 mm e 210 mm de comprimento, eixo z paralelo ao do ombro; ponta da frente rente à frente do tubo vertical; face de trás plana com chanfro de 2 mm, que é a saída', tecnica: 'lathe de eixo z, tampas planas com chanfro de 2 mm no perfil, unido ao tubo vertical por unir; o arredondamento afina até sumir na tampa da frente' },
    ],
    criteriosDeReprovacao: [
      'tubo vertical que afunila, engrossa ou tem diâmetro diferente de 190 mm em algum trecho, ou tubo deitado de diâmetro diferente de 190 mm',
      'altura do fundo do pé ao topo do conjunto diferente de 714 mm (502 mm até o topo da coluna mais 117 mm até o eixo do cotovelo mais 95 mm)',
      'pé que não é redondo em volta do eixo da junta, ou de diâmetro diferente do da coluna',
      'fresta, emenda, degrau, sulco ou parafuso em qualquer encontro dos três tubos: precisa ser uma peça só',
      'pé afastado da face do anel da junta ou entrando nele',
      'qualquer ponto do pé e do tubo vertical atrás do plano da face do anel (z menor que 0 no referencial da peça): atravessaria o bloco do ombro',
      'junta do cotovelo com eixo que não seja paralelo ao da junta do ombro (+Z), ou saída para o mesmo lado da saída do ombro em vez do oposto (-Z)',
      'ponta da frente do tubo deitado além da frente do tubo vertical, ou recuada dela',
      'quina viva ou faixa de sombra no encontro do pé com o tubo vertical ou no dos dois tubos',
      'saída fora do eixo do tubo deitado, ou sem a face redonda plana de eixo z (-Z)',
      'bordas vivas nas tampas de fora, sem o chanfro de 2 mm, ou chanfro nas bordas do encontro',
      'curso declarado além do que a geometria permite: nenhum toque com ombro, anel da cintura ou base em ângulo algum; cerca de 141 graus da vertical para cada lado até o chão (eixo a 360 mm)',
    ],
  },
  /* Uma malha só: os tubos são partes da mesma superfície e se tocam por construção; a medida de contato não decide esses pares. */
  contatos: [],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
