/* braco-de-prova/elo2 — o segundo elo, outro perfil em U cinza-escuro, de 150 mm do eixo do cotovelo até a ponta, com o
 * eixo do cotovelo e as tampas laranja das juntas.
 *
 * Sétima etapa da montagem `braco-de-prova/montagem.json`. Do alinhamento (opção C do esboço): perfil em U de 150 mm até a
 * ponta. As paredes do segundo elo abraçam o primeiro pelo lado de fora no cotovelo (faces de dentro em z = ±27, 1 mm de
 * folga até as paredes do primeiro elo), e o fundo só começa depois da ponta do primeiro elo, para os dois não se tocarem.
 * O eixo de 8 mm do cotovelo atravessa as quatro paredes e a polia grande; as tampas laranja cobrem as pontas dele.
 *
 * Referencial: o da montagem (ver `../../comum/blocos.mjs`).
 *
 * Portas: `juntaNoCotovelo` (cilindro externo, eixo +z, centro na ponta de trás do eixo do cotovelo), que vai na `juntaDoCotovelo` do primeiro elo;
 * `eixoDaPolia` (cilindro externo, eixo +z, o trecho do eixo dentro da polia grande) e `ponta` (plano, recebe, normal +x, na
 * face de fora da placa da ponta), onde a garra se apoia.
 */
import { passosDasFormas, aliasesDasFormas, porta, origemDa, MATERIAIS as CORES } from '../../../comum/blocos.mjs';

export const TABELA = {
  alturaDoEixo: 140,
  cotovelo: 150,
  /* Do eixo do cotovelo até a face de dentro da placa da ponta; a placa tem 5 mm. */
  comprimento: 150,
  placa: 5,
  /* Quanto a parede passa do eixo do cotovelo para trás. */
  sobraAtras: 30,
  /* Faces de dentro das paredes e espessura delas. */
  meioVao: 27,
  parede: 5,
  baixo: 115,
  alto: 165,
  fundo: 5,
  /* O fundo começa a 50 mm do eixo do cotovelo, fora do círculo que a ponta do primeiro elo varre ao dobrar (46,9 mm). */
  inicioDoFundo: 200,
  raioDoEixo: 4,
  raioDaTampa: 18,
  espessuraDaTampa: 3,
  chanfro: 2,
  /* Os quatro M3 que prendem a garra, passantes na placa da ponta, no quadrado de 24 mm em volta do eixo do braço. */
  passoDosFurosM3: 24,
  raioDoFuroM3: 1.7,
};

export const MATERIAIS = CORES;

export function derivar(t = TABELA) {
  const fim = t.cotovelo + t.comprimento;
  const fora = t.meioVao + t.parede;
  const y = t.alturaDoEixo;
  const passagem = (z0) => ({ eixo: 'z', base: [t.cotovelo, y, z0], comprimento: t.parede + 2, raio: t.raioDoEixo, lados: 18 });
  return [
    { nome: 'paredeDaFrente', material: 'estrutura', chanfro: t.chanfro, caixa: [t.cotovelo - t.sobraAtras, fim, t.baixo, t.alto, t.meioVao, fora], furos: [passagem(t.meioVao - 1)] },
    { nome: 'paredeDeTras', material: 'estrutura', chanfro: t.chanfro, caixa: [t.cotovelo - t.sobraAtras, fim, t.baixo, t.alto, -fora, -t.meioVao], furos: [passagem(-fora - 1)] },
    { nome: 'fundo', material: 'estrutura', chanfro: t.chanfro, caixa: [t.inicioDoFundo, fim, t.baixo, t.baixo + t.fundo, -t.meioVao, t.meioVao] },
    { nome: 'placaDaPonta', material: 'estrutura', chanfro: t.chanfro, caixa: [fim, fim + t.placa, t.baixo, t.alto, -fora, fora],
      furos: [-1, 1].flatMap((sy) => [-1, 1].map((sz) => ({
        eixo: 'x', base: [fim - 1, y + (sy * t.passoDosFurosM3) / 2, (sz * t.passoDosFurosM3) / 2], comprimento: t.placa + 2, raio: t.raioDoFuroM3, lados: 12,
      }))) },
    { nome: 'eixoDoCotovelo', material: 'aco', eixo: 'z', base: [t.cotovelo, y, -fora], comprimento: 2 * fora, raio: t.raioDoEixo, lados: 18 },
    { nome: 'tampaDaFrente', material: 'laranja', eixo: 'z', base: [t.cotovelo, y, fora], comprimento: t.espessuraDaTampa, raio: t.raioDaTampa, lados: 36 },
    { nome: 'tampaDeTras', material: 'laranja', eixo: 'z', base: [t.cotovelo, y, -fora - t.espessuraDaTampa], comprimento: t.espessuraDaTampa, raio: t.raioDaTampa, lados: 36 },
  ];
}

export const ALIASES = aliasesDasFormas(derivar(TABELA));

export function gerarPassos(t = TABELA) {
  const formas = derivar(t);
  const { passos } = passosDasFormas(formas);
  const fora = t.meioVao + t.parede;
  const fim = t.cotovelo + t.comprimento;
  passos.push(porta('juntaNoCotovelo', origemDa(formas, 'eixoDoCotovelo'), {
    forma: 'cilindro', papel: 'externa', eixo: [0, 0, 1], centro: [t.cotovelo, t.alturaDoEixo, -fora], raio: t.raioDoEixo, inicio: 0, fim: 2 * fora,
  }));
  passos.push(porta('eixoDaPolia', origemDa(formas, 'eixoDoCotovelo'), {
    forma: 'cilindro', papel: 'externa', eixo: [0, 0, 1], centro: [t.cotovelo, t.alturaDoEixo, -fora], raio: t.raioDoEixo, inicio: fora - 4, fim: fora + 4,
  }));
  passos.push(porta('ponta', origemDa(formas, 'placaDaPonta'), { forma: 'plano', papel: 'recebe', ponto: [fim + t.placa, t.alturaDoEixo, 0], normal: [1, 0, 0], extensao: [40, 40] }));
  return passos;
}

const receita = {
  meta: { nome: 'braco-de-prova/elo2', desc: 'segundo elo do braço de prova: perfil em U cinza-escuro de 150 mm do cotovelo até a ponta, abraçando o primeiro elo no cotovelo, com o eixo de 8 mm e as tampas laranja da junta' },
  PARAMS: TABELA,
  MATERIAIS,
  ALIASES,
  TOPO: { origem: 'chão, sob o eixo do ombro; y para cima, x ao longo do braço esticado, +z para a frente' },
  PLANO: {
    objeto: 'segundo elo do braço de prova, perfil em U do cotovelo até a ponta, onde a garra se prende',
    referencias: ['../../../../../docs/modelar/banco-de-provas/braco-de-prova-2026-11-23/elos-opcoes.png'],
    escala: { medida: 'distância do eixo do cotovelo à ponta', milimetros: 150 },
    partes: [
      { nome: 'paredeDaFrente', forma: 'parede de 180 × 50 × 5 mm, de z 27 a 32, com o furo do eixo do cotovelo', tecnica: 'caixa chanfrada com furo por subtração' },
      { nome: 'paredeDeTras', forma: 'parede de 180 × 50 × 5 mm, de z −32 a −27, com o furo do eixo do cotovelo', tecnica: 'caixa chanfrada com furo por subtração' },
      { nome: 'fundo', forma: 'fundo de 5 mm entre as paredes, de x 200 até a placa da ponta', tecnica: 'caixa chanfrada' },
      { nome: 'placaDaPonta', forma: 'placa de 5 × 50 × 64 mm que fecha a ponta e recebe a garra por quatro M3', tecnica: 'caixa chanfrada com furos por subtração' },
      { nome: 'eixoDoCotovelo', forma: 'eixo de 8 mm no eixo do cotovelo, de uma tampa à outra', tecnica: 'cilindro' },
      { nome: 'tampaDaFrente', forma: 'tampa laranja de 36 mm por 3 mm na ponta da frente do eixo', tecnica: 'cilindro' },
      { nome: 'tampaDeTras', forma: 'tampa laranja de 36 mm por 3 mm na ponta de trás do eixo', tecnica: 'cilindro' },
    ],
    criteriosDeReprovacao: [
      'distância do eixo do cotovelo à ponta diferente de 150 mm',
      'parede, fundo ou placa com menos de 2 mm',
      'segundo elo encostando no primeiro, no NEMA 17 ou na correia',
      'eixo do cotovelo fora do eixo da polia grande',
      'tampas em outra cor que não o laranja',
    ],
  },
  contatos: [
    { par: ['eixoDoCotovelo', 'paredeDaFrente'], motivo: 'o eixo passa justo pelo furo da parede' },
    { par: ['eixoDoCotovelo', 'paredeDeTras'], motivo: 'o eixo passa justo pelo furo da parede' },
    { par: ['eixoDoCotovelo', 'tampaDaFrente'], motivo: 'a tampa cobre a ponta do eixo' },
    { par: ['eixoDoCotovelo', 'tampaDeTras'], motivo: 'a tampa cobre a ponta do eixo' },
    { par: ['fundo', 'paredeDaFrente'], motivo: 'o fundo fica entre as paredes' },
    { par: ['fundo', 'paredeDeTras'], motivo: 'o fundo fica entre as paredes' },
    { par: ['fundo', 'placaDaPonta'], motivo: 'o fundo chega na placa da ponta' },
    { par: ['paredeDaFrente', 'placaDaPonta'], motivo: 'a placa fecha a ponta das paredes' },
    { par: ['paredeDaFrente', 'tampaDaFrente'], motivo: 'a tampa assenta na face de fora da parede' },
    { par: ['paredeDeTras', 'placaDaPonta'], motivo: 'a placa fecha a ponta das paredes' },
    { par: ['paredeDeTras', 'tampaDeTras'], motivo: 'a tampa assenta na face de fora da parede' },
  ],
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receita;
