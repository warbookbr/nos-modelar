/* freio-disco-integridade.test.ts — testes de integridade do primeiro sistema
   mecânico da Mecanifica (Fase 3). Não medem beleza: medem as relações que o
   domínio exige e que uma mudança de parâmetro pode romper em silêncio — a
   pinça abraçando o disco, a folga de repouso das duas pastilhas, o pistão
   encostado na costa da pastilha interna — e o critério de saída da fase:
   toda face tem identidade e toda parte é alcançável pelo NOME.
   Referência das medidas: docs/mecanifica/PRANCHA-FREIO-DISCO.md. */
import { describe, expect, it } from 'vitest';
// @ts-expect-error — núcleo legado em JavaScript, exercitado pela API pública.
import { nucleo } from '../../prototipos/fps/v3/motor/oficina.js';
// @ts-expect-error — peça em JavaScript, exercitada em runtime pelo Vitest.
import * as freio from '../../prototipos/fps/v3/pecas/freio-disco.js';
// @ts-expect-error — adaptador novo em JavaScript.
import { adaptarThree } from '../../src/autoria/adaptar-three.js';
// @ts-expect-error — módulo neutro de medição em JavaScript.
import { caixaDaParte, corposDaParte, descreverPeca } from '../../src/autoria/descrever-partes.js';
// @ts-expect-error — a mesma gramática aritmética que o núcleo usa para os PARAMS derivados.
import { criarResolverNumerico } from '../../prototipos/fps/v3/motor/expressoes.js';

const PARTES = [
  'disco', 'cubo', 'pinca', 'suporte',
  'pistao', 'pastilhaInterna', 'pastilhaExterna', 'flexivel',
];

function montar() {
  const neutro = nucleo(
    freio.PASSOS,
    freio.PARAMS,
    freio.TOPO,
    freio.MATERIAIS,
    null,
    freio.ALIASES,
  );
  /* caixa delimitadora POR NOME de parte — é assim que um agente posterior mede
     o conjunto sem tocar em índice de vértice ou de face. A medição não mora
     mais aqui: saiu para `src/autoria/descrever-partes.js` (módulo neutro, sem
     Three.js), que o CLI `npm run descrever` e a bancada também consomem. */
  const caixa = (parte: string) => caixaDaParte(neutro, parte);
  return { neutro, caixa };
}

const perto = (a: number, b: number) => expect(a).toBeCloseTo(b, 9);

/* Medida DERIVADA em número. `PARAMS.cuboFaceRodaX` é a string '= …': a peça
   guarda a RELAÇÃO, não o valor calculado fora (A-5). Reescrever a conta aqui
   faria o teste repetir a fórmula da peça — o defeito que este arquivo já
   nomeia mais abaixo —, então quem avalia é a mesma gramática do núcleo. */
const medida = (() => {
  const { num } = criarResolverNumerico({ ...freio.PARAMS, ...freio.TOPO });
  return (nome: string): number => num(nome);
})();

describe('integridade do freio a disco', () => {
  it('não tem órfão e nenhuma face fica sem identidade', () => {
    const { neutro } = montar();
    expect(neutro.orfaos).toEqual([]);
    const semParte = [...neutro.F.values()].filter((f: any) => !f.parte);
    expect(semParte).toEqual([]);
  });

  it('expõe as oito partes do sistema pelo nome, e só elas', () => {
    const { neutro } = montar();
    const nomes = new Set<string>();
    for (const face of neutro.F.values()) nomes.add(face.parte);
    expect([...nomes].sort()).toEqual([...PARTES].sort());

    const convertido = adaptarThree(neutro, { nome: freio.meta.nome });
    expect(convertido.diagnosticos).toEqual({ facesSemParte: [], semanticaIntegra: true });
    for (const parte of PARTES) expect(convertido.partes.has(parte)).toBe(true);
  });

  it('a pinça abraça o disco: a ponte passa por fora do raio e as garras ficam nos dois lados', () => {
    const { caixa } = montar();
    const disco = caixa('disco');
    const pinca = caixa('pinca');
    const P = freio.PARAMS;

    // a ponte passa POR CIMA do topo do disco, com a folga declarada
    perto(disco.max[1], P.discoRaio);
    perto(pinca.max[1], P.discoRaio + P.folgaPonte + P.pincaPonteAltura);
    expect(pinca.max[1]).toBeGreaterThan(disco.max[1]);

    // e a pinça atravessa o plano do disco de lado a lado
    expect(pinca.min[0]).toBeLessThan(-P.discoEspessura / 2);
    expect(pinca.max[0]).toBeGreaterThan(P.discoEspessura / 2);
  });

  it('as pastilhas ficam uma de cada lado do disco, com a folga de repouso', () => {
    const { caixa } = montar();
    const P = freio.PARAMS;
    const faceInterna = -P.discoEspessura / 2;
    const faceExterna = P.discoEspessura / 2;
    const interna = caixa('pastilhaInterna');
    const externa = caixa('pastilhaExterna');

    perto(faceInterna - interna.max[0], P.folgaPastilha);
    perto(externa.min[0] - faceExterna, P.folgaPastilha);
    perto(interna.max[0] - interna.min[0], P.pastilhaEspessura);
    perto(externa.max[0] - externa.min[0], P.pastilhaEspessura);

    // mesma faixa radial nos dois lados, e ela cabe dentro do disco
    perto(interna.min[1], externa.min[1]);
    perto(interna.max[1], externa.max[1]);
    expect(interna.max[1]).toBeLessThan(P.discoRaio);
  });

  it('o pistão empurra a pastilha interna: encosta na costa dela e vem de dentro', () => {
    const { caixa } = montar();
    const pistao = caixa('pistao');
    const interna = caixa('pastilhaInterna');

    perto(pistao.max[0], interna.min[0]);          // encosta, sem vão e sem invadir
    expect(pistao.min[0]).toBeLessThan(interna.min[0]);   // vem do lado de dentro
    // e está centrado na altura da pastilha
    perto((pistao.min[1] + pistao.max[1]) / 2, (interna.min[1] + interna.max[1]) / 2);
  });

  it('o suporte fica atrás da garra interna, do lado de dentro do carro', () => {
    const { caixa } = montar();
    const suporte = caixa('suporte');
    const pinca = caixa('pinca');
    perto(suporte.max[0], pinca.min[0]);
    expect(suporte.min[0]).toBeLessThan(pinca.min[0]);
  });

  /* As asserções acima afirmam COORDENADA (`perto(pistao.max[0], interna.min[0])`)
     e por isso passam verdes por construção: elas repetem a fórmula da peça em
     vez de julgar a montagem. As três abaixo afirmam RELAÇÃO, medida corpo a
     corpo pela mesma régua do `npm run descrever`, e é essa régua que acusou
     peça fixa atravessando peça rotativa em código já shipado. */
  const relacoes = () => {
    const { neutro } = montar();
    const mapa = new Map<string, any>();
    for (const r of descreverPeca(neutro).relacoes) mapa.set(`${r.a}~${r.b}`, r);
    return mapa;
  };

  it('nenhuma peça FIXA atravessa peça que GIRA com a roda', () => {
    const P = freio.PARAMS;
    const r = relacoes();
    /* o suporte é parafusado na manga de eixo; o cubo e o disco giram com a
       roda. Interpenetração aqui não é montagem apertada, é impossibilidade
       física — e uma demonstração que existe para ensinar o freio ensinaria
       errado. A folga vem do parâmetro, não de um número digitado no teste. */
    for (const par of ['cubo~suporte', 'disco~suporte']) {
      expect([par, r.get(par).tipo]).toEqual([par, 'folga']);
    }
    /* o chapéu é o maior raio que gira ao lado da placa: é ele que decide */
    perto(r.get('disco~suporte').distancia, P.folgaSuporte);
    expect(r.get('cubo~suporte').distancia).toBeGreaterThan(P.folgaSuporte);
  });

  it('nada que GIRA encosta no que deveria estar livre dele em repouso', () => {
    const P = freio.PARAMS;
    const r = relacoes();
    /* A conversão do suporte não bastava. `perto(faceInterna - interna.max[0],
       P.folgaPastilha)` afirma que a peça obedece ao próprio parâmetro — é
       verdade por construção e continua verde com `folgaPastilha: 0`, isto é,
       com a pastilha ARRASTANDO no disco. Justamente a falha que esta
       demonstração existe para explicar ao cliente.
       A lei que faltava não é a igualdade, é a POSITIVIDADE: em repouso o disco
       gira livre, então pastilha e ponte não podem tocá-lo. Afirmamos as duas —
       o tipo e o sinal — para que nem a montagem nem o parâmetro possam mentir. */
    for (const par of ['disco~pastilhaInterna', 'disco~pastilhaExterna']) {
      expect([par, r.get(par).tipo]).toEqual([par, 'folga']);
      expect([par, r.get(par).distancia > 0]).toEqual([par, true]);
      perto(r.get(par).distancia, P.folgaPastilha);
    }
    /* a ponte passa POR FORA do raio do disco: se raspar, o freio trava */
    expect(['disco~pinca', r.get('disco~pinca').tipo]).toEqual(['disco~pinca', 'folga']);
    expect(r.get('disco~pinca').distancia).toBeGreaterThan(0);
    perto(r.get('disco~pinca').distancia, P.folgaPonte);
  });

  it('o suporte continua sustentando a garra interna inteira, e não só a evitando', () => {
    const P = freio.PARAMS;
    /* a placa é escolhida pelo que ela É — o único corpo do suporte que cruza o
       plano central do eixo; as duas orelhas ficam nos lados. Nada de índice. */
    const noPlanoCentral = corposDaParte(montar().neutro, 'suporte')
      .filter((c: any) => c.min[2] <= 0 && c.max[2] >= 0);
    expect(noPlanoCentral).toHaveLength(1);
    const [placa] = noPlanoCentral;
    const garraTopo = P.pincaGarraBaseY + P.pincaGarraAltura;

    // afastar a placa do eixo não pode soltar a pinça no ar: a placa cobre toda
    // a faixa radial da garra que ela ancora, nos dois extremos
    expect(placa.min[1]).toBeLessThanOrEqual(P.pincaGarraBaseY);
    expect(placa.max[1]).toBeGreaterThanOrEqual(garraTopo);
    perto(placa.max[1] - garraTopo, P.suporteSobraGarra);
    // e continua encostada atrás dela, sustentando de fato
    expect(relacoes().get('pinca~suporte').tipo).toBe('encosta');
  });

  it('as sobreposições que RESTAM são montagem, e cada uma tem um porquê mecânico', () => {
    const r = relacoes();
    /* Registradas como intencionais para que a próxima rodada não as "conserte":
       o pistão mora no alojamento da garra; a mangueira entra na pinça pelo
       banjo; o cubo fica dentro do chapéu porque nem o chapéu tem cavidade nem
       o disco tem furo central neste modelo — e o flange precisa atravessar o
       plano do disco para chegar à roda. */
    for (const par of ['pinca~pistao', 'flexivel~pinca', 'cubo~disco']) {
      expect([par, r.get(par).tipo]).toEqual([par, 'interpenetra']);
    }
    // e nenhum outro par se invade
    const invasores = [...r.values()].filter((x: any) => x.tipo === 'interpenetra')
      .map((x: any) => `${x.a}~${x.b}`).sort();
    expect(invasores).toEqual(['cubo~disco', 'flexivel~pinca', 'pinca~pistao']);
  });

  it('o conjunto é determinístico: a mesma entrada dá a mesma malha', () => {
    const a = montar().neutro;
    const b = montar().neutro;
    expect(a.V.size).toBe(b.V.size);
    expect(a.F.size).toBe(b.F.size);
    for (const [id, p] of a.V) expect(b.V.get(id)).toEqual(p);
  });
});

/* ---------------------------------------------------------------------------
   FLANGE DE RODA — o furo de prisioneiro (ciclo "Corte e orientação de seção
   v1"). O plano registrava a omissão com estas palavras: "o cubo do freio
   continua sem prisioneiro". Ela foi fechada com as duas capacidades do ciclo
   juntas — o ARRANJO radial põe os assentos em volta do eixo da roda, o CORTE
   abre o furo de cada um.

   Estas afirmações existem para morrer quando o valor muda. Contar face não
   basta: um furo no lugar errado, um furo cego no lugar de um passante ou um
   assento sem furo dariam a MESMA contagem, e a foto do conjunto inteiro é
   pequena demais para acusar 13 mm.
   --------------------------------------------------------------------------- */
describe('flange de roda: os quatro furos de prisioneiro', () => {
  /* as famílias do corte, endereçadas pelos ALIASES que a peça publica — nada
     de id de face. A sonda reatribui `parte`, por isso `substituir`. */
  const comSonda = () => nucleo(
    [
      ...freio.PASSOS,
      ['parte', { nome: 'paredesSonda', sel: { alias: 'paredesDosPrisioneiros' }, substituir: true }],
      ['parte', { nome: 'assentosSonda', sel: { alias: 'assentosDeRoda' }, substituir: true }],
    ],
    freio.PARAMS, freio.TOPO, freio.MATERIAIS, null, freio.ALIASES,
  );

  it('há um furo por prisioneiro declarado, e cada um é um corpo separado', () => {
    const neutro = comSonda();
    expect(neutro.orfaos).toEqual([]);
    const paredes = [...neutro.F.values()].filter((f: any) => f.parte === 'paredesSonda');
    /* uma parede por lado do anel, em cada furo: mudar `prisioneiros` sem
       escrever o furo do assento novo derruba esta conta. */
    expect(paredes.length).toBe(freio.TOPO.prisioneiros * freio.TOPO.ladosFuroPrisioneiro);
    expect(corposDaParte(neutro, 'paredesSonda').length).toBe(freio.TOPO.prisioneiros);
  });

  it('cada furo ATRAVESSA o assento de lado a lado — é passante, não cego', () => {
    const P = freio.PARAMS;
    for (const corpo of corposDaParte(comSonda(), 'paredesSonda')) {
      perto(corpo.min[0], medida('cuboFaceRodaX'));
      perto(corpo.max[0], medida('cuboFaceRodaX') + P.prisioneiroSedeEspessura);
    }
  });

  it('os furos ficam no círculo de prisioneiros, a 90° um do outro', () => {
    const P = freio.PARAMS;
    const centros = corposDaParte(comSonda(), 'paredesSonda')
      .map((c: any) => [(c.min[1] + c.max[1]) / 2, (c.min[2] + c.max[2]) / 2]);
    // todos no MESMO raio, e é o raio que o parâmetro nomeia
    for (const [y, z] of centros) perto(Math.hypot(y, z), medida('prisioneiroOrbita'));
    // e nos quatro pontos cardeais: é isso que `volta:360` com `total:4` promete
    const chave = (p: number[]) => p.map((n) => +n.toFixed(9)).join(',');
    const R = +medida('prisioneiroOrbita').toFixed(9);
    expect(centros.map(chave).sort()).toEqual(
      [[R, 0], [-R, 0], [0, R], [0, -R]].map(chave).sort(),
    );
  });

  it('o furo tem o diâmetro do parâmetro que o nomeia, e sobra assento em volta', () => {
    const P = freio.PARAMS;
    for (const corpo of corposDaParte(comSonda(), 'paredesSonda')) {
      perto(corpo.max[1] - corpo.min[1], 2 * P.prisioneiroFuroRaio);
      perto(corpo.max[2] - corpo.min[2], 2 * P.prisioneiroFuroRaio);
    }
    /* e o furo não come o assento inteiro: um furo que encosta na borda deixa
       de ser furo e vira recorte de contorno. A relação é entre PARÂMETROS, não
       entre o parâmetro e ele mesmo. */
    expect(2 * P.prisioneiroFuroRaio)
      .toBeLessThan(P.prisioneiroSedeLargura - 2 * P.prisioneiroSedeChanfro);
    expect(2 * P.prisioneiroFuroRaio)
      .toBeLessThan(P.prisioneiroSedeAltura - 2 * P.prisioneiroSedeChanfro);
  });

  it('os quatro anéis saem EM FASE: a parede 0 de cada furo é sempre a de cima', () => {
    /* `orientacao:[0,1,0]` é a segunda capacidade do ciclo, e a única promessa
       dela que se pode medir num furo de 12 lados: o CONJUNTO de vértices do
       anel é o mesmo com qualquer fase, mas QUEM é a parede 0 muda. Com a
       orientação declarada, o vértice 0 de todo anel aponta para +Y, então a
       parede 0 é a mais alta do próprio furo — nos quatro assentos, inclusive
       nos que o arranjo girou de 90°, 180° e 270°.
       Sem a chave, a fase vem do quadro interno da face e a parede 0 cai em
       outro lugar: aí `{op:'furo', id, parede:0}` deixa de nomear a mesma
       região física em furos diferentes, que é exatamente o atrito do frame
       implícito. */
    const furos = freio.PASSOS
      .filter((p: any) => p[0] === 'furo')
      .map((p: any) => p[1].origemId);
    expect(furos.length).toBe(freio.TOPO.prisioneiros);

    /* uma sonda por citação: as duas famílias se sobrepõem (a parede 0 está
       dentro de "todas as paredes"), e `substituir` faria a segunda apagar a
       primeira no mesmo neutro. */
    const alturaDe = (origem: Record<string, unknown>) => {
      const neutro = nucleo(
        [...freio.PASSOS, ['parte', { nome: 'sonda', sel: { origem }, substituir: true }]],
        freio.PARAMS, freio.TOPO, freio.MATERIAIS, null, freio.ALIASES,
      );
      expect(neutro.orfaos).toEqual([]);
      const ys = [...neutro.F.values()]
        .filter((f: any) => f.parte === 'sonda')
        .flatMap((f: any) => f.vs.map((v: number) => neutro.V.get(v)![1]));
      expect(ys.length).toBeGreaterThan(0);
      return Math.max(...ys);
    };

    for (const id of furos) {
      perto(
        alturaDe({ op: 'furo', id, parede: 0 }),
        alturaDe({ op: 'furo', id, parede: { passo: 1, fase: 0 } }),
      );
    }
  });

  it('o assento não passa do raio do cubo: a roda ainda encosta no flange', () => {
    const P = freio.PARAMS;
    const neutro = comSonda();
    const cubo = caixaDaParte(neutro, 'cubo');
    // o flange avança PARA FORA do carro, além da face do cubo
    perto(cubo.max[0], medida('cuboFaceRodaX') + P.prisioneiroSedeEspessura);
    expect(cubo.max[0]).toBeGreaterThan(medida('cuboFaceRodaX'));
    // e o assento termina rente ao cubo, sem crescer o envelope radial
    perto(cubo.max[1], P.cuboRaio);
    perto(medida('prisioneiroOrbita') + P.prisioneiroSedeAltura / 2, P.cuboRaio);
  });

  it('a face em que a roda encosta continua existindo depois do corte', () => {
    /* o corte CONSOME a face de entrada. O que sobra é a borda que o furo
       publicou, e é ela que o alias `assentosDeRoda` endereça — se o alias
       parasse de resolver, a peça perderia a superfície de apoio da roda sem
       perder uma única face. */
    const neutro = comSonda();
    const assentos = [...neutro.F.values()].filter((f: any) => f.parte === 'assentosSonda');
    expect(assentos.length).toBe(freio.TOPO.prisioneiros * freio.TOPO.ladosFuroPrisioneiro);
    for (const f of assentos) expect(f.material).toBe('acoCubo');
  });
});
