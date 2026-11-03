/* prancha-conferencias.mjs — as conferências gerais que uma regra de desenho de família nomeia (campo `conferencia` de
   `procedural/criterios/<família>.json`), registradas por nome. O motor não conhece família nem objeto: cada conferência
   mede geometria ou números que a especificação da prancha dá em `conferencias.<nome>` (ou em `medidasNomeadas`), com os
   valores da regra (`parametros`, como o mínimo ou a faixa) vindos do catálogo. A prancha que declara `familia` executa as
   conferências das regras da família cuja condição vale para as camadas dela; um nome que não está aqui falha. */
import { criteriosDe } from '../../../procedural/criterios/index.js';
import { regrasDaFamilia } from '../../../src/autoria/perguntas-do-critico.js';

const r1 = (v) => Math.round(v * 10) / 10;
const TOL = 0.5;

/* Distância de ponto a polilinha, em mm de mundo. */
function distPontoPoli([px, py], pts) {
  let d = Infinity;
  for (let k = 1; k < pts.length; k += 1) {
    const [[ax, ay], [bx, by]] = [pts[k - 1], pts[k]];
    const [dx, dy] = [bx - ax, by - ay];
    const L = dx * dx + dy * dy;
    const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0;
    d = Math.min(d, Math.hypot(px - ax - t * dx, py - ay - t * dy));
  }
  return d;
}

/* A altura da polilinha na abscissa z (a menor, se ela passa mais de uma vez), ou null fora dela. */
function alturaEm(pl, z) {
  let y = null;
  for (let k = 1; k < pl.length; k += 1) {
    const [[z0, y0], [z1, y1]] = [pl[k - 1], pl[k]];
    if ((z0 - z) * (z1 - z) > 0 || z0 === z1) continue;
    const v = y0 + ((y1 - y0) * (z - z0)) / (z1 - z0);
    y = y === null ? v : Math.min(y, v);
  }
  return y;
}

/* Cada conferência recebe (dados da prancha, parâmetros da regra, contexto) e devolve { achados, medidas }: `achados` é a
   lista do que reprova, vazia quando passa. */
export const CONFERENCIAS = Object.freeze({
  /* Linhas de divisão a uma distância mínima, fora dos encontros: dados [{ vista, camadas, raioDoEncontro? }], parâmetro
     `minimo` em mm. */
  divisoes(dados, { minimo }, { camadas, afastamentoDasDivisoes }) {
    if (!(minimo > 0)) throw new Error('a conferência divisoes precisa do parâmetro minimo, em mm');
    const achados = [];
    const medidas = [];
    for (const d of dados) {
      const r = afastamentoDasDivisoes({ ...d, minimo }, camadas);
      medidas.push(...r.pares.slice(0, 3).map((p) => `${p.a} × ${p.b} ${p.distancia} mm`));
      for (const p of r.pares) if (p.distancia < minimo) achados.push(`${p.a} e ${p.b} ficam a ${p.distancia} mm em (${p.em.join(', ')}), menos que ${minimo}`);
    }
    return { achados, medidas };
  },

  /* Uma faixa cortada pelas aberturas que descem nela: dados [{ nome, faixa: { de, ate, topo }, aberturas: [{ nome, de,
     ate, base }], trechos: [{ de, ate, leva }] }]. Cada abertura que desce abaixo do topo da faixa leva exatamente um trecho,
     com as pontas nas bordas dela; nenhum trecho fixo (`leva` nulo) fica sobre ela; os trechos cobrem a faixa sem buraco. */
  'faixa-cortada-pelas-aberturas'(dados) {
    const achados = [];
    for (const f of dados) {
      const descem = f.aberturas.filter((a) => a.base < f.faixa.topo - TOL && a.ate > f.faixa.de && a.de < f.faixa.ate);
      for (const a of descem) {
        const dela = f.trechos.filter((t) => t.leva === a.nome);
        if (dela.length !== 1 || Math.abs(dela[0].de - a.de) > TOL || Math.abs(dela[0].ate - a.ate) > TOL) achados.push(`${f.nome}: a abertura ${a.nome} (${r1(a.de)} a ${r1(a.ate)}) desce até ${a.base}, abaixo do topo ${f.faixa.topo}, e não leva exatamente um trecho com as pontas nas bordas dela`);
        for (const t of f.trechos.filter((x) => x.leva === null || x.leva === undefined)) {
          if (t.de < a.ate - TOL && t.ate > a.de + TOL) achados.push(`${f.nome}: o trecho fixo de ${r1(t.de)} a ${r1(t.ate)} cobre a abertura ${a.nome}`);
        }
      }
      const ord = [...f.trechos].sort((x, y) => x.de - y.de);
      if (!ord.length || Math.abs(ord[0].de - f.faixa.de) > TOL || Math.abs(ord.at(-1).ate - f.faixa.ate) > TOL || ord.some((t, i) => i > 0 && Math.abs(t.de - ord[i - 1].ate) > TOL)) achados.push(`${f.nome}: os trechos não cobrem a faixa de ${r1(f.faixa.de)} a ${r1(f.faixa.ate)} sem buraco nem sobra`);
    }
    return { achados, medidas: dados.map((f) => `${f.nome}: ${f.trechos.length} trecho(s)`) };
  },

  /* Medidas declaradas pela prancha (`medidasNomeadas`) dentro de uma faixa, absolutas ou em razão de outra: parâmetro
     `medidas` [{ medida, base?, min?, max? }]. */
  'medidas-em-faixa'(dados, { medidas: pedidas }) {
    if (!Array.isArray(pedidas) || !pedidas.length) throw new Error('a conferência medidas-em-faixa precisa do parâmetro medidas');
    const achados = [];
    const medidas = [];
    for (const m of pedidas) {
      const v = dados[m.medida];
      const b = m.base === undefined ? 1 : dados[m.base];
      if (typeof v !== 'number' || typeof b !== 'number' || !(b > 0)) { achados.push(`a prancha não dá a medida ${m.medida}${m.base ? ` ou ${m.base}` : ''}`); continue; }
      const x = v / b;
      const nome = m.base ? `${m.medida}/${m.base}` : m.medida;
      medidas.push(`${nome} = ${Number(x.toFixed(3))}`);
      if ((m.min !== undefined && x < m.min) || (m.max !== undefined && x > m.max)) achados.push(`${nome} = ${Number(x.toFixed(3))}, fora de ${m.min ?? '−∞'} a ${m.max ?? '+∞'}`);
    }
    return { achados, medidas };
  },

  /* Um contorno em volta de um centro que segue inteiro de uma ponta à outra, trocando de peça sem trocar de forma: dados
     [{ nome, de, ate (graus), trechos: [{ peca, de, ate, raio, saida }] }]. Os trechos cobrem de `de` a `ate` sem buraco, e
     dois trechos vizinhos têm o mesmo raio e a mesma saída na passagem. */
  'contorno-continuo'(dados) {
    const achados = [];
    for (const c of dados) {
      const ord = [...c.trechos].sort((x, y) => x.de - y.de);
      let alcance = c.de;
      for (const t of ord) {
        if (t.de > alcance + TOL) achados.push(`${c.nome}: falta o contorno de ${r1(alcance)}° a ${r1(t.de)}°`);
        alcance = Math.max(alcance, t.ate);
      }
      if (alcance < c.ate - TOL) achados.push(`${c.nome}: falta o contorno de ${r1(alcance)}° a ${r1(c.ate)}°`);
      for (let i = 1; i < ord.length; i += 1) {
        const [a, b] = [ord[i - 1], ord[i]];
        if (Math.abs(a.raio - b.raio) > 1 || Math.abs((a.saida ?? 0) - (b.saida ?? 0)) > 1) achados.push(`${c.nome}: o contorno muda de raio ou de saída na passagem de ${a.peca} para ${b.peca}`);
      }
    }
    return { achados, medidas: dados.map((c) => `${c.nome}: ${c.trechos.map((t) => t.peca).join(' + ')}`) };
  },

  /* As pontas de uma linha assentadas em linhas de apoio: dados [{ vista, camada, apoios: [camadas] }]. Cada ponta da
     camada fica a até 3 mm de um apoio, e nenhum ponto dela desce abaixo de um apoio onde os dois se sobrepõem em z. */
  'pontas-assentadas'(dados, _parametros, { camadas }) {
    const achados = [];
    const pega = (vista, nome) => {
      const c = camadas.find((x) => x.vista === vista && x.nome === nome);
      if (!c) throw new Error(`pontas-assentadas: a camada ${nome} não existe na vista ${vista}`);
      return c.pl;
    };
    for (const d of dados) {
      const pl = pega(d.vista, d.camada);
      const apoios = d.apoios.map((n) => ({ nome: n, pl: pega(d.vista, n) }));
      for (const p of [pl[0], pl.at(-1)]) {
        if (!apoios.some((a) => distPontoPoli(p, a.pl) <= 3)) achados.push(`a ponta (${p.map(r1).join(', ')}) de ${d.camada} não assenta em ${d.apoios.join(' nem em ')}`);
      }
      for (const a of apoios) {
        const baixo = pl.find(([z, y]) => { const ya = alturaEm(a.pl, z); return ya !== null && y < ya - 3; });
        if (baixo) achados.push(`${d.camada} desce abaixo de ${a.nome} em (${baixo.map(r1).join(', ')})`);
      }
    }
    return { achados, medidas: dados.map((d) => `${d.camada} sobre ${d.apoios.join(', ')}`) };
  },
});

/* As regras da família da prancha que se aplicam às camadas dela e têm conferência, executadas. Devolve [{ id, conferencia,
   ok, achados, medidas, semDados? }]. Família desconhecida ou conferência sem registro falha com a lista do que existe. */
export function conferirRegras(spec, camadas, ajudas) {
  if (spec.familia === undefined) return [];
  const criterios = criteriosDe(spec.familia);
  if (!criterios) throw new Error(`a prancha declara a família '${spec.familia}', que não tem arquivo em procedural/criterios/`);
  const nomes = [...new Set([...camadas.map((c) => c.nome).filter(Boolean), ...(spec.partes ?? [])])];
  const presentes = { componentes: spec.partes ?? [], formas: nomes };
  return executarRegras(regrasDaFamilia(criterios, presentes), spec, camadas, ajudas);
}

/* Executa as conferências de uma lista de regras já filtradas sobre a prancha. */
export function executarRegras(regras, spec, camadas, ajudas = {}) {
  const resultados = [];
  for (const regra of regras) {
    if (!regra.conferencia) continue;
    const conferir = Object.hasOwn(CONFERENCIAS, regra.conferencia) ? CONFERENCIAS[regra.conferencia] : undefined;
    if (!conferir) throw new Error(`a regra ${regra.id}${spec.familia ? ` da família ${spec.familia}` : ''} nomeia a conferência '${regra.conferencia}', que o motor da prancha não tem; as que existem são ${Object.keys(CONFERENCIAS).join(', ')}`);
    const dados = regra.conferencia === 'medidas-em-faixa' ? spec.medidasNomeadas : spec.conferencias?.[regra.conferencia];
    if (dados === undefined) {
      resultados.push({ id: regra.id, conferencia: regra.conferencia, ok: false, semDados: true, achados: [`a regra se aplica às camadas da prancha, e ela não dá os dados da conferência ${regra.conferencia}`], medidas: [] });
      continue;
    }
    const { achados, medidas } = conferir(dados, regra.parametros ?? {}, { camadas, ...ajudas });
    resultados.push({ id: regra.id, conferencia: regra.conferencia, ok: achados.length === 0, achados, medidas });
  }
  return resultados;
}
