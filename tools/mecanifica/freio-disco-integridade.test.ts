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
