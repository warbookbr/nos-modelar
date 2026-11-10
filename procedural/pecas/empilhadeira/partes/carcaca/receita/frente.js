/* empilhadeira/carcaca, receita/frente.js — a carcaça inteira em mm num estado { passos, topo, origem }: chassi, paralamas,
 * laterais (com o furo da tampa de combustível e o fundo do túnel), piso com o tapete e os degraus, painel, tampa do motor, colunas,
 * o poço traseiro, e a traseira de `traseira.js`. As medidas são as da `TABELA` da receita, com a fonte de cada uma ao lado dela.
 *
 * A técnica é a da carcaça bruta: a silhueta lateral de cada parte (o contorno em mm da lateral, simplificado) extrudada na largura
 * da parte e cruzada com a planta dela (o contorno da vista de cima), por `extrusao` e `intersectar`; os poços das rodas saem por
 * `subtrair` do cilindro do pneu com folga. O painel, a tampa do motor e a traseira são corpos de laços pelas três vistas,
 * subdivididos (`subdivisao`). */
import { ferramentas, lado } from './ferramentas.js';
import { montarTraseira } from './traseira.js';
import { contornoComArcos } from '../../../../../nucleo/arcos-do-contorno.js';

const L = (pts) => pts.map(([z, y]) => [-z, y]);             // ponto da lateral [z para trás, y] -> [z do modelo, y]
const espelhoX = (xy) => xy.map(([x, y]) => [-x, y]);         // o mesmo perfil do outro lado

/** Monta a carcaça inteira no estado e devolve as medidas que as outras frentes da máquina usam. */
export function montarCarcaca(estado, T, contornos) {
  const { extX, extY, extZ, booleana, parte, corpo, arredondar, nomear } = ferramentas(estado);
  const unir = (...s) => booleana('unir', s);
  const cortar = (a, ...s) => booleana('subtrair', [a, ...s]);
  const cruzar = (...s) => booleana('intersectar', s);
  const COR = T.cores;
  const LADOS = T.ladosDoCirculo; const FORA = T.alemDoLado;
  const circulo = (cz, cy, r, n = LADOS) => Array.from({ length: n }, (_, k) => [cz + r * Math.cos(2 * Math.PI * k / n), cy + r * Math.sin(2 * Math.PI * k / n)]);
  /* os pontos do círculo c de p0 a p1, pelo lado em que fica pm, com passo de 360/LADOS graus */
  function arcoDoCirculo([cz, cy, r], p0, p1, pm) {
    const ang = ([z, y]) => Math.atan2(y - cy, z - cz);
    const a0 = ang(p0); let d = ang(p1) - a0;
    const norm = (t) => Math.atan2(Math.sin(t), Math.cos(t));
    d = norm(d); const dm = norm(ang(pm) - a0);
    if (Math.sign(dm) !== Math.sign(d) || Math.abs(dm) > Math.abs(d)) d -= Math.sign(d) * 2 * Math.PI;
    const n = Math.max(2, Math.ceil(Math.abs(d) / (2 * Math.PI / LADOS)));
    return Array.from({ length: n + 1 }, (_, k) => [cz + r * Math.cos(a0 + d * k / n), cy + r * Math.sin(a0 + d * k / n)]);
  }
  /* o contorno lateral da parte com os trechos em arco trocados pelo círculo ajustado aos pontos do contorno bruto; `ajuste` acerta um
     ponto [z, y] da lateral, depois dos arcos, e pode devolver vários. Devolve [z do modelo, y] e os círculos usados. */
  function ladoSuave(contorno, arcos, ajuste = (p) => p) {
    const { pontos: c, circulos: cs } = contornoComArcos(contorno, { arcos });
    const circulos = cs.map(({ centro, raio }) => [centro[0], centro[1], raio]);
    const a = c.flatMap((p) => { const q = ajuste(p); return Array.isArray(q[0]) ? q : [q]; });
    const limpo = a.filter((p, i) => { const q = a[(i + a.length - 1) % a.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 0.5; });
    return { zy: limpo.map(([z, y]) => [-z, y]), circulos };
  }
  /* o canto de raio r de um polígono em planta, de a0 a a1 graus, com o centro em (cx, cz) */
  const arco = (cx, cz, r, a0, a1, n = 5) => Array.from({ length: n + 1 }, (_, k) => {
    const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180;
    return [cx + r * Math.cos(a), cz + r * Math.sin(a)];
  });
  const W = T.larguras;
  const PLACA = W.chapas; const ABA = W.aba;

  const RD = T.rodas.dianteira;
  const POCO_D = { z: RD.z, y: RD.y, r: RD.raio + T.folgaDoPoco, de: RD.xDentro - T.folgaDoPoco };
  const pocos = (p) => [extX(circulo(p.z, p.y, p.r), p.de, FORA), extX(circulo(p.z, p.y, p.r), -FORA, -p.de)];

  /* chassi: as duas chapas com a silhueta lateral, até a frente delas, e a travessa da frente entre as chapas */
  const CH = T.chassi;
  const ALMA = -CH.ateAFrente.z[1] + CH.almaDaFrente.espessura;
  const { zy: chapas } = ladoSuave(contornos.chassi, CH.arcos,
    ([z, y]) => (z < ALMA && y > CH.almaDaFrente.y[0] && y < CH.almaDaFrente.y[1] ? [ALMA, y] : [z, y]));
  const ateAFrente = extZ(CH.ateAFrente.secao, CH.ateAFrente.z[0], CH.ateAFrente.z[1]);
  const chassi = unir(
    cruzar(unir(extX(chapas, PLACA[0], PLACA[1]), extX(chapas, -PLACA[1], -PLACA[0])), ateAFrente),
    extX(CH.travessa, -PLACA[0] - CH.travessaAlemDasChapas, PLACA[0] + CH.travessaAlemDasChapas),
  );
  parte('chassi', chassi, COR.cinza);

  /* paralamas: as duas abas, a faixa da frente e a beira que segue o arco de fora da frente das laterais */
  const PA = T.paralamas;
  const plantaAba = (s) => {
    const [a, b] = ABA; const zf = PA.frenteDaAba; const zt = PA.trasDaAba;
    const rf = PA.cantoDeFora; const rd = PA.cantoDeDentro;
    const p = [[a, zt], [b, zt], ...arco(b - rf, zf - rf, rf, 0, 90), ...arco(a + rd, zf - rd, rd, 90, 180)];
    return s > 0 ? p : p.map(([x, z]) => [-x, z]).reverse();
  };
  const ladoAba = lado(contornos.paralama);
  const [yPonta0, yPonta1] = PA.chapa; const rPonta = (yPonta1 - yPonta0) / 2; const yPontaMeio = (yPonta0 + yPonta1) / 2;
  const [xSecao, ySecao0, ySecao1] = PA.secao;
  const PONTA_ABA = [[xSecao, ySecao0], [ABA[1] - rPonta, ySecao0], ...Array.from({ length: 13 }, (_, k) => {
    const a = -Math.PI / 2 + Math.PI * k / 12; return [ABA[1] - rPonta + rPonta * Math.cos(a), yPontaMeio + rPonta * Math.sin(a)];
  }), [ABA[1] - rPonta, ySecao1], [xSecao, ySecao1]];
  const abas = [1, -1].map((s) => cruzar(extX(ladoAba, s > 0 ? ABA[0] - 1 : -ABA[1] - 1, s > 0 ? ABA[1] + 1 : -ABA[0] + 1), extY(plantaAba(s), PA.alturaDaPlanta[0], PA.alturaDaPlanta[1]),
    extZ(s > 0 ? PONTA_ABA : espelhoX(PONTA_ABA), PA.comprimentoDaSecao[0], PA.comprimentoDaSecao[1])));
  const faixa = extX(L(PA.faixa), -PA.meiaFaixa, PA.meiaFaixa);
  const LA = T.laterais;
  const { zy: ladoFrente, circulos: [ARCO_FRENTE] } = ladoSuave(contornos.frenteLateral, LA.arcosDaFrente);
  const BE = PA.beira;
  const ladoBeira = [...arcoDoCirculo(ARCO_FRENTE, BE.de, BE.ate, BE.meio),
    ...arcoDoCirculo([ARCO_FRENTE[0], ARCO_FRENTE[1], ARCO_FRENTE[2] - (yPonta1 - yPonta0)], BE.ate, BE.de, BE.meio)];
  const beiras = [extX(L(ladoBeira), BE.x[0], BE.x[1]), extX(L(ladoBeira), -BE.x[1], -BE.x[0])];
  parte('paralamas', unir(...abas, faixa, ...beiras), COR.laranja);

  /* laterais: o corpo laranja do meio, a frente em volta da roda dianteira e o arco da roda traseira, numa malha só */
  const PERFIL_FRENTE = [[ABA[0], LA.perfilDaFrente[0][1]], ...LA.perfilDaFrente, [ABA[0], LA.perfilDaFrente[LA.perfilDaFrente.length - 1][1]]];
  const frentes = [1, -1].map((s) => cruzar(
    extX(ladoFrente, s > 0 ? ABA[0] : -LA.meiaLarguraBruta, s > 0 ? LA.meiaLarguraBruta : -ABA[0]),
    extZ(s > 0 ? PERFIL_FRENTE : espelhoX(PERFIL_FRENTE), LA.comprimentoDaFrente[0], LA.comprimentoDaFrente[1]),
  ));
  const plantaLateral = [[W.lateralFrente, -LA.planta[0]], [W.lateralTras, -LA.planta[1]], [-W.lateralTras, -LA.planta[1]], [-W.lateralFrente, -LA.planta[0]]];
  const PB = LA.peDeBaixo;
  const peDeBaixo = Array.from({ length: PB.trechos + 1 }, (_, k) => {
    const t = k / PB.trechos;
    return [0, 1].map((e) => (1 - t) ** 2 * PB.de[e] + 2 * t * (1 - t) * PB.quina[e] + t ** 2 * PB.ate[e]);
  });
  const PE = [...LA.pe, ...peDeBaixo];
  const peLateral = [...PE, ...espelhoX([...PE].reverse())];
  const AJ = LA.ajusteDoArco;
  const { zy: ladoLateral, circulos: [ARCO_TRAS] } = ladoSuave(contornos.lateral, LA.arcosDoCorpo,
    ([z, y]) => {
      if (z > AJ.pe.z[0] && z < AJ.pe.z[1] && y > AJ.pe.y[0] && y <= AJ.pe.y[1]) return [[z, y], AJ.pe.para];
      return z >= AJ.traseira.zDe && y > AJ.traseira.yAcima ? [LA.planta[1], y] : [z, y];
    });
  const meioVivo = cruzar(extX(ladoLateral, -LA.meiaLarguraBruta, LA.meiaLarguraBruta), extY(plantaLateral, LA.alturaDaPlanta[0], LA.alturaDaPlanta[1]),
    extZ(peLateral, LA.comprimentoDoMeio[0], LA.comprimentoDoMeio[1]));
  /* a borda de cima quebrada; o corpo do meio e a concordância seguem juntos, pelo nome da parte, para a união com a frente */
  const BC = LA.bordaDeCima;
  const meio = nomear('laterais', meioVivo, arredondar(meioVivo, { raio: BC.raio, paineis: BC.paineis, arestas: 'convexas', regiao: BC.regiao }));
  const aro = extX(lado(contornos.aroTraseiro), -W.lateralTras, W.lateralTras);
  const POCO_DE = LA.pocoTraseiroDe;
  const pocoTras = [extX(circulo(-ARCO_TRAS[0], ARCO_TRAS[1], ARCO_TRAS[2]), POCO_DE, FORA), extX(circulo(-ARCO_TRAS[0], ARCO_TRAS[1], ARCO_TRAS[2]), -FORA, -POCO_DE)];
  const TU = LA.tunel;
  const TUNEL = [[-TU.meia, TU.y[0]], [TU.meia, TU.y[0]], [TU.meia, TU.y[1]], [-TU.meia, TU.y[1]]];
  const FU = LA.furo;
  const FURO = circulo(-FU.centro[0], FU.centro[1], 1, FU.lados).map(([z, y]) => [-FU.centro[0] + (z + FU.centro[0]) * FU.semieixos[0], FU.centro[1] + (y - FU.centro[1]) * FU.semieixos[1]]);
  const PS = LA.peSobOContrapeso;
  const xT = T.rodas.traseira.xDentro;
  const peSobOContrapeso = extZ([[-xT, PS.y[0]], [xT, PS.y[0]], [xT, PS.y[1]], [-xT, PS.y[1]]], PS.z[0], PS.z[1]);
  const laterais = cortar(unir(meio, ...frentes, aro), ...pocos(POCO_D), ...pocoTras, extX(FURO, FU.corte[0], FU.corte[1]), extZ(TUNEL, TU.z[0], TU.z[1]), peSobOContrapeso);
  parte('laterais', laterais, COR.laranja);
  parte('furo', extX(FURO, FU.fundo[0], FU.fundo[1]), COR.escuro);
  parte('tunel', extZ(TUNEL, TU.z[0], TU.fundoAte), COR.escuro);

  /* piso: o corpo cinza no meio, o tapete escuro por cima e os degraus cinza dos lados, com o rebaixo dos cilindros de inclinação */
  const PI = T.piso;
  const RB = PI.rebaixoDosCilindros;
  const caixaDoRebaixo = [[RB.z[0], RB.y[0]], [RB.z[1], RB.y[0]], [RB.z[1], RB.y[1]], [RB.z[0], RB.y[1]]];
  const rebaixos = [1, -1].map((s) => extX(caixaDoRebaixo, s > 0 ? RB.x[0] : -RB.x[1], s > 0 ? RB.x[1] : -RB.x[0]));
  const rebaixosDoPiso = [1, -1].map((s) => extX(caixaDoRebaixo, s > 0 ? RB.x[0] : -RB.x[1], s > 0 ? RB.x[1] : -RB.x[0]));
  const RS = PI.ressalto;
  parte('piso', cortar(extX(lado(contornos.piso, ([z, y]) => (z > RS.z[0] && z < RS.z[1] && y > RS.y ? [z, RS.y] : [z, y])), -W.tapete, W.tapete), ...rebaixosDoPiso), COR.cinza);
  parte('tapete', extX(L(PI.tapete), -W.tapete + PI.recuoDoTapete, W.tapete - PI.recuoDoTapete), COR.escuroPiso);
  const degrau = L(PI.degrau);
  const rampa = L(PI.rampa);
  const RAMPA = [[W.tapete - 1, PI.plantaDaRampa[0][1]], ...PI.plantaDaRampa, [W.tapete - 1, PI.plantaDaRampa[PI.plantaDaRampa.length - 1][1]]];
  const rampas = [1, -1].map((s) => cruzar(extX(rampa, s > 0 ? W.tapete - 1 : -PI.meiaDaRampaBruta, s > 0 ? PI.meiaDaRampaBruta : -W.tapete + 1), extY(s > 0 ? RAMPA : espelhoX(RAMPA), PI.alturaDaRampa[0], PI.alturaDaRampa[1])));
  parte('degraus', unir(extX(degrau, W.tapete - 1, W.degrau), extX(degrau, -W.degrau, -W.tapete + 1), ...rampas), COR.cinza);

  /* painel: o anteparo inclinado, com os cantos da frente recolhidos sob os pés do protetor e o rebaixo dos cilindros de inclinação */
  const PN = T.painel;
  const PLANTA_PAINEL = PN.planta;
  const painel = corpo('painel', {
    lado: L(PN.lado),
    perfil: PN.perfil,
    planta: [[-PLANTA_PAINEL[0][0], PLANTA_PAINEL[0][1]], ...PLANTA_PAINEL, ...espelhoX([...PLANTA_PAINEL].reverse()).slice(0, -1)],
    estacoes: PN.estacoes,
  }, { vincos: [{ nome: 'base', laco: 'primeiro', nitidez: 'viva' }] });
  const CA = PN.cantos;
  const cantos = [1, -1].map((s) => extY([[CA.x[0], CA.z[0]], [CA.x[1], CA.z[0]], [CA.x[1], CA.z[1]], [CA.x[0], CA.z[1]]].map(([x, z]) => [s * x, z]), CA.y[0], CA.y[1]));
  parte('painel', cortar(painel, ...rebaixos, ...cantos), COR.escuroPiso);

  /* tampa do motor: a base do banco, com o nariz redondo da frente e o recolhimento para trás */
  const TM = T.tampaMotor;
  const FRENTE_TM = -TM.frente; const TRAS_TM = -TM.tras;
  const ladoNariz = TM.nariz.map(([dz, w]) => [w, FRENTE_TM - dz]);
  const RECOLHE_TM = [...TM.recolhe, [TM.recolhe[TM.recolhe.length - 1][0], TRAS_TM]];
  const tampaMotor = corpo('tampaMotor', {
    lado: L(TM.lado),
    perfil: TM.perfil,
    planta: [...[...RECOLHE_TM].reverse(), ...[...ladoNariz].reverse(), ...ladoNariz.slice(1).map(([x, z]) => [-x, z]), ...espelhoX(RECOLHE_TM)],
    estacoes: TM.estacoes,
  }, { vincos: [{ nome: 'base', laco: 'primeiro', nitidez: 'viva' },
    { nome: 'trasDir', entre: ['inicio', 'direita'], nitidez: 'viva' }, { nome: 'trasEsq', entre: ['esquerda', 'inicio'], nitidez: 'viva' }] });
  parte('tampaMotor', tampaMotor, COR.cinza);

  /* colunas: o bloco atrás da tampa do motor, com a borda de trás dentro do capô */
  const CO = T.colunas;
  parte('colunas', extX(lado(contornos.coluna, ([z, y]) => (z >= CO.trasDe && y < CO.abaixoDe ? [CO.tras, y] : [z, y])), -W.colunas, W.colunas), COR.cinza);

  /* o fundo escuro do poço traseiro e o forro de 15 mm por dentro do arco da roda traseira */
  const PT = T.pocoTraseiro;
  const anel = [...circulo(-ARCO_TRAS[0], ARCO_TRAS[1], ARCO_TRAS[2] + 1)];
  const anelDentro = circulo(-ARCO_TRAS[0], ARCO_TRAS[1], ARCO_TRAS[2] - PT.forro);
  const caixaDoForro = () => extZ([[-PT.caixa.meia, PT.caixa.y[0]], [PT.caixa.meia, PT.caixa.y[0]], [PT.caixa.meia, PT.caixa.y[1]], [-PT.caixa.meia, PT.caixa.y[1]]], PT.caixa.z[0], PT.caixa.z[1]);
  const forro = [1, -1].map((s) => cruzar(cortar(extX(anel, s > 0 ? POCO_DE : -PT.forroAte, s > 0 ? PT.forroAte : -POCO_DE),
    extX(anelDentro, s > 0 ? POCO_DE - 1 : -PT.forroAte - 1, s > 0 ? PT.forroAte + 1 : -POCO_DE + 1)), caixaDoForro(),
    extZ(peLateral, PT.secaoDoForro[0], PT.secaoDoForro[1])));
  parte('pocoTraseiro', unir(extX(L(PT.fundo), -PT.meiaDoFundo, PT.meiaDoFundo), ...forro), COR.escuro);

  /* a traseira: capô, grade, tampa e contrapeso, com o poço da roda traseira no contrapeso */
  const RT = T.rodas.traseira;
  montarTraseira(estado, T, contornos, { pocoDaRoda: { z: RT.z, y: RT.y, r: RT.raio + T.folgaDoPoco, de: RT.xDentro - T.folgaDoPoco } });
  return { PLACA, ABA, COLUNAS: W.colunas };
}
