/* extensao-chapa-dobrada-origem.test.mjs — a origem estrutural da chapa dobrada: com `origemId` a chapa publica as abas, as
   dobras, os lados de dentro e de fora, as bordas e as tampas, e `sel:{origem}` escolhe cada uma; sem `origemId` a peça
   sai byte a byte como antes (o hash do canônico é o da chapa antes da origem). Tudo medido nos vértices, não na contagem. */
import { describe, expect, it } from 'vitest';
import { REGISTRO_OPERACOES, criarRegistroComExtensoes, neutroCanonico, nucleo } from './entrada.js';
import { EXTENSAO, medidasDaChapa } from '../extensoes/chapa-dobrada/index.js';
import { sha256Hex } from './sha256.js';

const registro = criarRegistroComExtensoes({ registroBase: REGISTRO_OPERACOES, extensoes: [EXTENSAO] });
const rodar = (passos, params = {}) => nucleo(passos, params, {}, {}, null, [], { registroOperacoes: registro });
const motivos = (r) => r.orfaos.map((o) => o.motivo ?? o.mensagem ?? JSON.stringify(o)).join('\n');

const L = { espessura: 2, raioInterno: 2, largura: 30, abas: [{ comprimento: 40, angulo: 90 }, { comprimento: 30 }] };
const U = { espessura: 1.5, raioInterno: 3, largura: 20, abas: [{ comprimento: 25, angulo: 90 }, { comprimento: 50, angulo: 90 }, { comprimento: 25 }] };
const Z = { espessura: 2, raioInterno: 1, largura: 12, abas: [{ comprimento: 30, angulo: 90 }, { comprimento: 20, angulo: -90 }, { comprimento: 30 }] };
const VIVO = { espessura: 2, raioInterno: 0, largura: 12, abas: [{ comprimento: 30, angulo: 90 }, { comprimento: 20 }] };

const OP = 'chapaDobrada';
// executa a chapa com a origem 1 uma vez por citação (seleções sobrepostas não cabem na mesma execução, cada parte roubaria
// faces da outra) e dá a cada citação uma parte própria, para ler de volta quais faces ela escolheu
function escolher(chapa, citacoes, params = {}) {
  const execucoes = Object.fromEntries(Object.entries(citacoes).map(([nome, origem]) => [nome, rodar([[OP, { origemId: 1, ...chapa }], ['parte', { nome, sel: { origem: { op: OP, id: 1, ...origem } } }]], params)]));
  const orfaos = Object.values(execucoes).flatMap((r) => r.orfaos);
  const faces = (nome) => [...execucoes[nome].F.entries()].filter(([, f]) => f.parte === nome).map(([id]) => id);
  const pontos = (nome) => faces(nome).map((id) => execucoes[nome].F.get(id).vs.map((v) => execucoes[nome].V.get(v)));
  const total = Object.values(execucoes)[0].F.size;
  return { r: { orfaos, F: { size: total } }, faces, pontos };
}
const vertices = (pontosDasFaces) => pontosDasFaces.flat();
const perto = (a, b, tolerancia = 1e-6) => Math.abs(a - b) <= tolerancia;
const raioAte = (p, centro) => Math.hypot(p[0] - centro[0], p[1] - centro[1]);

describe('chapa dobrada com origemId — o L', () => {
  const { r, faces, pontos } = escolher(L, {
    aba0e: { aba: 0, lado: 'esquerda' }, aba0d: { aba: 0, lado: 'direita' }, aba1e: { aba: 1, lado: 'esquerda' }, aba1d: { aba: 1, lado: 'direita' },
    aba0: { aba: 0 }, dobra: { dobra: 0 }, dentro: { dobra: 0, lado: 'dentro' }, fora: { dobra: 0, lado: 'fora' },
    inicio: { borda: 'inicio' }, fim: { borda: 'fim' }, menos: { tampa: 'menos' }, mais: { tampa: 'mais' },
  });
  it('não deixa órfão e cada citação escolhe as faces do que nomeia', () => {
    expect(r.orfaos).toEqual([]);
    expect(faces('aba0e')).toHaveLength(1);
    expect(faces('aba0d')).toHaveLength(1);
    expect(faces('aba0')).toHaveLength(2);
    expect(faces('dobra')).toHaveLength(12);
    expect(faces('dentro')).toHaveLength(6);
    expect(faces('fora')).toHaveLength(6);
  });
  it('as abas são planas e estão onde a linha média põe: esquerda é o lado do sentido de percurso', () => {
    // a primeira aba segue +x com a esquerda em +y; a segunda sobe em +y com a esquerda em -x, a 3 mm do fim da aba (recuo da dobra)
    expect(vertices(pontos('aba0e')).every((p) => perto(p[1], 1))).toBe(true);
    expect(vertices(pontos('aba0d')).every((p) => perto(p[1], -1))).toBe(true);
    expect(vertices(pontos('aba1e')).every((p) => perto(p[0], 42))).toBe(true);
    expect(vertices(pontos('aba1d')).every((p) => perto(p[0], 44))).toBe(true);
  });
  it('dentro e fora da dobra estão nos raios pedidos em torno do centro do arco', () => {
    const centro = [40, 3];      // o arco começa em (40, 0) na linha média e gira para +y com raio médio 3
    expect(vertices(pontos('dentro')).every((p) => perto(raioAte(p, centro), 2))).toBe(true);
    expect(vertices(pontos('fora')).every((p) => perto(raioAte(p, centro), 4))).toBe(true);
  });
  it('as bordas são a espessura cortada nas pontas e as tampas são as faces das duas larguras', () => {
    expect(vertices(pontos('inicio')).every((p) => perto(p[0], 0))).toBe(true);
    expect(vertices(pontos('inicio')).map((p) => p[1]).sort()).toEqual([-1, -1, 1, 1]);
    expect(vertices(pontos('fim')).every((p) => perto(p[1], 33))).toBe(true);
    expect(vertices(pontos('menos')).every((p) => perto(p[2], -15))).toBe(true);
    expect(vertices(pontos('mais')).every((p) => perto(p[2], 15))).toBe(true);
    expect(faces('menos')).toHaveLength(1);
    expect(faces('mais')).toHaveLength(1);
  });
  it('toda face da peça cai em exatamente um dos quatro tipos: aba, dobra, borda ou tampa', () => {
    const total = ['aba0', 'dobra', 'inicio', 'fim', 'menos', 'mais'].flatMap((n) => faces(n)).concat(faces('aba1e'), faces('aba1d'));
    expect(new Set(total).size).toBe(total.length);
    expect(total.length).toBe(r.F.size);
  });
});

describe('chapa dobrada com origemId — o U, o Z e a ponta viva', () => {
  it('no U as três abas têm dois lados cada e as duas dobras giram para o mesmo lado: dentro é a esquerda das duas', () => {
    const { r, faces } = escolher(U, {
      abas: { aba: { passo: 1, fase: 0 } }, extremas: { aba: { passo: 2, fase: 0 } }, ultima: { aba: 'ultima' }, primeira: { aba: 'primeira' },
      dentro: { lado: 'dentro' }, esquerda: { lado: 'esquerda', dobra: { passo: 1, fase: 0 } },
    });
    expect(r.orfaos).toEqual([]);
    expect(faces('abas')).toHaveLength(6);
    expect(faces('extremas')).toHaveLength(4);
    expect(faces('ultima')).toHaveLength(2);
    expect(faces('primeira')).toHaveLength(2);
    expect(faces('dentro')).toHaveLength(12);
    expect(faces('dentro').sort()).toEqual(faces('esquerda').sort());
  });
  it('no Z a segunda dobra gira ao contrário: o dentro dela é a direita, e cada dentro está no raio interno do seu centro', () => {
    const { r, faces, pontos } = escolher(Z, { dentro0: { dobra: 0, lado: 'dentro' }, dentro1: { dobra: 1, lado: 'dentro' }, direita1: { dobra: 1, lado: 'direita' }, fora1: { dobra: 'ultima', lado: 'fora' } });
    expect(r.orfaos).toEqual([]);
    expect(faces('dentro1').sort()).toEqual(faces('direita1').sort());
    expect(vertices(pontos('dentro0')).every((p) => perto(raioAte(p, [30, 2]), 1))).toBe(true);     // gira à esquerda, centro em (30, 2)
    expect(vertices(pontos('dentro1')).every((p) => perto(raioAte(p, [34, 22]), 1))).toBe(true);    // gira à direita, centro em (34, 22)
    expect(vertices(pontos('fora1')).every((p) => perto(raioAte(p, [34, 22]), 3))).toBe(true);
  });
  it('com raio interno 0 a face de dentro da dobra some (canto vivo) e a de fora fica; citar a de dentro diz isso', () => {
    const { r, faces } = escolher(VIVO, { fora: { dobra: 0, lado: 'fora' }, tudo: { dobra: 0 } });
    expect(r.orfaos).toEqual([]);
    expect(faces('fora')).toHaveLength(6);
    expect(faces('tudo')).toHaveLength(6);
    const dentro = rodar([[OP, { origemId: 1, ...VIVO }], ['parte', { nome: 'x', sel: { origem: { op: OP, id: 1, dobra: 0, lado: 'dentro' } } }]]);
    expect(motivos(dentro)).toMatch(/origem chapaDobrada:1 não tem nenhuma face viva nessa citação/);
  });
  it('o nome de parâmetro resolve o índice da aba, como nos outros contratos de origem', () => {
    const { r, faces } = escolher(U, { meio: { aba: 'qual' } }, { qual: 1 });
    expect(r.orfaos).toEqual([]);
    expect(faces('meio')).toHaveLength(2);
  });
});

describe('chapa dobrada com origemId — recusas que dizem o que falta', () => {
  const recusa = (origem, chapa = L, origemId = 1) => motivos(rodar([[OP, { origemId, ...chapa }], ['parte', { nome: 'x', sel: { origem: { op: OP, id: 1, ...origem } } }]]));
  it('aba e dobra fora do limite dizem a faixa', () => {
    expect(recusa({ aba: 5 })).toMatch(/aba 5 fora do limite da origem chapaDobrada:1 \(0\.\.1\)/);
    expect(recusa({ dobra: 1 })).toMatch(/dobra 1 fora do limite da origem chapaDobrada:1 \(0\.\.0\)/);
  });
  it('combinações sem sentido são recusadas na validação', () => {
    expect(recusa({ aba: 0, dobra: 0 })).toMatch(/aba e dobra são faces diferentes/);
    expect(recusa({ aba: 0, lado: 'dentro' })).toMatch(/'dentro' e 'fora' são do lado de uma dobra/);
    expect(recusa({ borda: 'inicio', aba: 0 })).toMatch(/borda não combina com aba, dobra, lado nem tampa/);
    expect(recusa({ tampa: 'menos', lado: 'esquerda' })).toMatch(/tampa não combina com lado/);
    expect(recusa({ tampa: 'menos', aba: 0 })).toMatch(/só existe com tampas:'em-tiras'/);
    expect(recusa({ tampa: 'topo' })).toMatch(/chapaDobrada usa op, id/);
    expect(recusa({ face: 3 })).toMatch(/chapaDobrada usa op, id/);
  });
  it('a chapa sem origemId não publica origem, e citá-la é recusado', () => {
    const r = rodar([[OP, L], ['parte', { nome: 'x', sel: { origem: { op: OP, id: 1 } } }]]);
    expect(motivos(r)).toMatch(/origem chapaDobrada:1 inexistente ou ainda não criada/);
  });
  it('origemId repetido em outro passo é ambíguo e origemId inválido é recusado com o campo', () => {
    expect(motivos(rodar([[OP, { origemId: 1, ...L }], ['cubo', { origemId: 1 }]]))).toMatch(/origemId 1 ambígua/);
    expect(motivos(rodar([[OP, { origemId: -1, ...L }]]))).toMatch(/origemId: veio -1; aceito um inteiro não negativo/);
    expect(motivos(rodar([[OP, { origemId: 1.5, ...L }]]))).toMatch(/origemId: veio 1.5/);
  });
});

describe('chapa dobrada com origemId — tampas em tiras', () => {
  const EM_TIRAS = { ...L, tampas: 'em-tiras' };
  const { r, faces, pontos } = escolher(EM_TIRAS, {
    menos: { tampa: 'menos' }, mais: { tampa: 'mais' }, aba0menos: { aba: 0, tampa: 'menos' }, aba1mais: { aba: 'ultima', tampa: 'mais' }, dobraMenos: { dobra: 0, tampa: 'menos' },
  });
  it('cada tampa é uma tira de quadriláteros convexos, uma por par de estações, e a peça continua fechada e do mesmo volume', () => {
    expect(r.orfaos).toEqual([]);
    // 1 estação de ponta + 7 do arco + 1 de ponta de cada lado da linha média = 9 estações, 8 tiras por tampa
    expect(faces('menos')).toHaveLength(8);
    expect(faces('mais')).toHaveLength(8);
    const inteira = rodar([[OP, L]]), tiras = rodar([[OP, EM_TIRAS]]);
    const volume = (n) => [...n.F.values()].reduce((v, f) => {
      const p = f.vs.map((id) => n.V.get(id));
      for (let i = 1; i < p.length - 1; i++) { const [a, b, c] = [p[0], p[i], p[i + 1]]; v += (a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6; }
      return v;
    }, 0);
    expect(perto(volume(tiras), volume(inteira), 1e-6)).toBe(true);
    const arestas = new Map();
    for (const f of tiras.F.values()) f.vs.forEach((a, i) => { const k = `${a}>${f.vs[(i + 1) % f.vs.length]}`; arestas.set(k, (arestas.get(k) ?? 0) + 1); });
    expect([...arestas].every(([k, c]) => c === 1 && arestas.has(k.split('>').reverse().join('>')))).toBe(true);
  });
  it('as tiras de uma aba ou de uma dobra são as que ficam sob ela', () => {
    expect(faces('aba0menos')).toHaveLength(1);
    expect(faces('aba1mais')).toHaveLength(1);
    expect(faces('dobraMenos')).toHaveLength(6);
    expect(vertices(pontos('aba0menos')).every((p) => perto(p[2], -15))).toBe(true);
    expect(vertices(pontos('dobraMenos')).every((p) => perto(raioAte(p, [40, 3]), 2) || perto(raioAte(p, [40, 3]), 4))).toBe(true);
  });
  it('tampas inválidas são recusadas dizendo o aceito', () => {
    expect(motivos(rodar([[OP, { ...L, tampas: 'abertas' }]]))).toMatch(/tampas: veio "abertas"; aceito um destes: 'inteiras', 'em-tiras'/);
  });
});

describe('chapa dobrada com origemId — a peça sem ela não muda', () => {
  const hash = (chapa) => sha256Hex(JSON.stringify(neutroCanonico(rodar([[OP, chapa]]))));
  it('o canônico de L, U, Z e da ponta viva sem origemId tem o hash de antes da origem', () => {
    expect(hash(L)).toBe('0855fdb55dd96e4e369fd02268e01dabd2353c1242c8842ac48ee6456f49eeec');
    expect(hash(U)).toBe('8c3396b78d907ea20615429c3561be3c0c0f12475a2389ba1186dce6523816ae');
    expect(hash(Z)).toBe('d1f16efd401d85b45a6a11919878eb69e84f356da81dbedf40cab9f1e9ccce6e');
    expect(hash(VIVO)).toBe('addf25a26d899d0a8079c01830912c9135a99833fef397b327151ebe6e0dbe73');
  });
  it('com origemId a malha é a mesma, vértice por vértice e face por face, e as medidas também', () => {
    for (const chapa of [L, U, Z, VIVO]) {
      const sem = rodar([[OP, chapa]]), com = rodar([[OP, { origemId: 7, ...chapa }]]);
      expect([...com.V]).toEqual([...sem.V]);
      expect([...com.F.entries()].map(([id, f]) => [id, f.vs])).toEqual([...sem.F.entries()].map(([id, f]) => [id, f.vs]));
      expect(medidasDaChapa({ origemId: 7, ...chapa })).toEqual(medidasDaChapa(chapa));
    }
  });
  it('mesma receita com origemId, mesmo hash', () => {
    const feito = () => sha256Hex(JSON.stringify(neutroCanonico(rodar([[OP, { origemId: 1, ...U }], ['parte', { nome: 'a', sel: { origem: { op: OP, id: 1, aba: 1 } } }]]))));
    expect(feito()).toBe(feito());
  });
});
