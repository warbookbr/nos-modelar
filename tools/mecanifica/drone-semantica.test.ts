/* drone-semantica.test.ts — identidade semântica do drone (lente ≠ pouso, nenhuma
   face órfã) e, desde a régua do O-1, a RELAÇÃO entre as partes.

   Por que as duas coisas no mesmo arquivo: a suíte antiga só sabia contar faces
   por nome. Contagem de face é coordenada disfarçada — ela passa verde com a
   lente enterrada, o pouso solto ou uma pá atravessando a fuselagem, porque
   nenhuma dessas montagens muda quantas faces cada parte tem. As asserções de
   relação abaixo são medidas corpo a corpo por `descreverPeca`, a mesma régua do
   `npm run descrever`, e falham quando a MONTAGEM se desmancha. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo e fixture legados em JavaScript.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — fixture legada em JavaScript.
import * as drone from '../../prototipos/fps/v3/pecas/drone-inspecao.js';
// @ts-expect-error — adaptador novo em JavaScript.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
// @ts-expect-error — módulo neutro de medição em JavaScript.
import { caixaDaParte, descreverPeca } from '../../src/autoria/descrever-partes.js';

const P = drone.PARAMS;

/* os quatro conjuntos rotativos, pelo sufixo semântico — nada de índice. */
const CANTOS = ['DianteiroDireito', 'DianteiroEsquerdo', 'TraseiroDireito', 'TraseiroEsquerdo'];

function montar() {
  return nucleo(drone.PASSOS, drone.PARAMS, drone.TOPO, {}, null, drone.ALIASES);
}

/* relações por par `a~b`, na ordem canônica de nome que a régua já usa. */
function relacoes(neutro: any) {
  const mapa = new Map<string, any>();
  for (const r of descreverPeca(neutro).relacoes) mapa.set(`${r.a}~${r.b}`, r);
  return mapa;
}

function perto(valor: number, esperado: number, tolerancia = 1e-9) {
  expect(Math.abs(valor - esperado)).toBeLessThan(tolerancia);
}

/* Um par só é afirmado com o TIPO e a PROFUNDIDADE amarrada ao parâmetro que a
   governa: o número nunca é digitado aqui, ele é recalculado a partir de PARAMS.
   Mexer no parâmetro move o teste junto; desmanchar a montagem quebra. */
function conferirEncaixe(r: Map<string, any>, par: string, eixo: 'x' | 'y' | 'z', profundidade: number) {
  const relacao = r.get(par);
  expect([par, relacao?.tipo]).toEqual([par, 'interpenetra']);
  perto(relacao.porEixo[{ x: 0, y: 1, z: 2 }[eixo]], -profundidade);
}

describe('semântica do drone de inspeção', () => {
  it('não mistura lente e pouso e não deixa faces sem identidade', () => {
    const neutro = montar();
    const contagem = new Map<string, number>();
    for (const face of neutro.F.values()) {
      contagem.set(face.parte, (contagem.get(face.parte) ?? 0) + 1);
    }

    expect(neutro.orfaos).toHaveLength(0);
    expect(contagem.get(undefined as any)).toBeUndefined();
    expect(contagem.get('lente')).toBe(14);
    expect(contagem.get('pousoDireito')).toBe(18);
    expect(contagem.get('pousoEsquerdo')).toBe(18);
    expect(contagem.has('pouso')).toBe(false);

    const convertido = adaptarThree(neutro, { nome: drone.meta.nome });
    expect(convertido.diagnosticos).toEqual({
      facesSemParte: [],
      semanticaIntegra: true,
    });
    expect(convertido.partes.has('estrutura-sem-nome')).toBe(false);
    expect(convertido.estatisticas).toMatchObject({
      partes: 23,
      facesSemParte: 0,
    });
  });

  it('cada braço é ancorado DENTRO da fuselagem, na espessura inteira', () => {
    const r = relacoes(montar());
    /* um braço de quadricóptero não é colado na casca: ele entra no chassi e é
       parafusado lá dentro, senão o esforço do rotor arranca a junta. A raiz
       cruza a parede da fuselagem em x/z, e em y o braço fica INTEIRO dentro da
       faixa do corpo — daí a profundidade mínima ser a espessura do braço. */
    for (const canto of CANTOS) {
      conferirEncaixe(r, `braco${canto}~corpo`, 'y', P.espessuraBracos);
    }
  });

  it('o mastro da câmera entra na fuselagem, e o trem de pouso é parafusado nela', () => {
    const r = relacoes(montar());
    /* o mastro loftado sobe do bico da câmera até dentro do piso do corpo: sem
       essa penetração ele ficaria pendurado no ar. A ponta chega a
       `suporteY + suportePontaY`, e o que passa de `corpoY` é o embutimento. */
    conferirEncaixe(r, 'corpo~suporteCamera', 'y', P.suporteY + P.suportePontaY - P.corpoY);

    /* mesma lógica no trem de pouso: as duas colunas de cada esqui sobem até
       `pousoSuporteY + alturaSuportePouso` e entram no assoalho. Um esqui que
       só encostasse por baixo cairia no primeiro pouso. */
    const entradaDoPouso = P.pousoSuporteY + P.alturaSuportePouso - P.corpoY;
    expect(entradaDoPouso).toBeGreaterThan(0);
    conferirEncaixe(r, 'corpo~pousoDireito', 'y', entradaDoPouso);
    conferirEncaixe(r, 'corpo~pousoEsquerdo', 'y', entradaDoPouso);
  });

  it('as duas pás de cada rotor são coplanares e se cruzam no eixo', () => {
    const r = relacoes(montar());
    /* pá A é longa em x, pá B é longa em z, e as duas nascem na MESMA altura:
       é assim que um rotor de duas pás em cruz se monta. A sobreposição vale
       exatamente a espessura da pá — isto é, elas ocupam o mesmo plano, não uma
       por cima da outra. Empilhar uma acima da outra desequilibraria o rotor, e
       este teste é quem acusa. */
    for (const canto of CANTOS) {
      conferirEncaixe(r, `pala${canto}A~pala${canto}B`, 'y', P.espessuraPas);
    }
  });

  it('a lente está encaixada na carcaça da câmera — e ENTERRADA nela (defeito registrado)', () => {
    const r = relacoes(montar());
    /* Que a lente invada a carcaça é montagem: o cilindro entra no alojamento
       frontal. O que NÃO é montagem é a profundidade: a invasão em z vale
       `lenteProfundidade` INTEIRA, ou seja, nenhum milímetro da lente sai do
       alojamento — ela nem alcança a face dianteira da câmera. Uma lente que não
       chega à frente da carcaça não enxerga nada; numa peça feita para explicar
       um drone de inspeção, ensina errado.
       Congelado de propósito, com o porquê escrito: consertar isso é JULGAMENTO
       novo sobre a peça, não conversão de teste. O dia em que alguém puxar a
       lente para fora, este caso fica vermelho e obriga a atualizar o registro. */
    conferirEncaixe(r, 'camera~lente', 'z', P.lenteProfundidade);

    const camera = caixaDaParte(montar(), 'camera');
    const lente = caixaDaParte(montar(), 'lente');
    expect(lente.max[2]).toBeLessThan(camera.max[2]);   // não alcança a frente
    expect(lente.min[1]).toBeLessThan(camera.min[1]);   // e vaza por baixo
  });

  it('as pás não estão presas a nada: folga acima do cubo e raspando o teto (defeito registrado)', () => {
    const neutro = montar();
    const r = relacoes(neutro);
    const topoDoCubo = P.rotorY + P.alturaRotor;

    for (const canto of CANTOS) {
      /* a pá flutua ACIMA do cubo do rotor — nem encosta nele. Uma pá que não
         toca o cubo não tem por onde receber torque: o conjunto rotativo está
         desmontado, e só a régua de relação enxerga isso. A altura da pá é um
         literal cru no PASSO (`d: [..., 0.60, ...]`), não um parâmetro nomeado,
         por isso a folga é medida e não pode ser amarrada a PARAMS — o remédio
         é nomear essa altura, e isso é mudança de PEÇA. */
      const paA = caixaDaParte(neutro, `pala${canto}A`);
      const relacaoComCubo = r.get(`pala${canto}A~rotor${canto}`);
      expect([canto, relacaoComCubo.tipo]).toEqual([canto, 'folga']);
      perto(relacaoComCubo.porEixo[1], paA.min[1] - topoDoCubo);
      expect(paA.min[1]).toBeGreaterThan(topoDoCubo);

      /* e a pá longa em x passa rente ao teto da fuselagem: contato exato, sem
         nenhuma folga de segurança. Pá girando encostada no chassi raspa. */
      expect([canto, r.get(`corpo~pala${canto}A`).tipo]).toEqual([canto, 'encosta']);
    }
    perto(caixaDaParte(neutro, 'corpo').max[1], P.corpoY + P.alturaCorpo);
  });

  it('toda sobreposição da peça é uma das declaradas acima, e nenhuma outra', () => {
    /* a rede: qualquer par novo que passe a se invadir cai aqui sem porquê
       escrito, e o teste obriga a julgá-lo antes de shipar. */
    const invasores = [...relacoes(montar()).values()]
      .filter((x: any) => x.tipo === 'interpenetra')
      .map((x: any) => `${x.a}~${x.b}`)
      .sort();
    expect(invasores).toEqual([
      ...CANTOS.map((canto) => `braco${canto}~corpo`).sort(),
      'camera~lente',
      'corpo~pousoDireito',
      'corpo~pousoEsquerdo',
      'corpo~suporteCamera',
      ...CANTOS.map((canto) => `pala${canto}A~pala${canto}B`).sort(),
    ].sort());
  });
});
