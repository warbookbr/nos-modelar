/* Medidas do `plano.medidas` do esboço lidas na blocagem do nível zero. O esboço mede cada medida declarada sobre as próprias
   formas (a caixa que envolve as formas escolhidas, ou a distância entre dois pontos); aqui a mesma expressão é medida sobre a
   blocagem N2 compilada do andaime traduzido, achando as formas citadas pela tabela do tradutor (`tabela`: id do esboço -> id do
   volume). Não importa o módulo do esboço: recebe as medidas já lidas (`{ nome, valor, unidade, origem, tolerancia?, mede }`, com
   `mede` como `{ caixa, formas? }` ou `{ distancia, eixo? }`, ou o nome `alturaTotal`/`larguraTotal`/`profundidadeTotal`) e as
   formas resolvidas (`mecanifica.formas-resolvidas@1`), e devolve por medida o que o esboço devolve (`esperado_mm`, `medido_mm`,
   `desvio_mm`, `tolerancia_mm`, `ok`), com o valor exato, os volumes lidos e as perdas que tocam esses volumes.

   O que a blocagem mede de verdade é o envelope de cada volume (os vértices da malha compilada): a caixa de um eixo e as seis
   faces (`<id>.+y`, `<id>.-x`...), nas quais os outros dois eixos valem o meio da caixa, como no esboço. As outras âncoras (`centro`,
   `inicio`, `fim`, as seções e os pontos-guia) e os pontos nomeados e vetores são posições declaradas, que a malha não revela:
   valem a posição do esboço, e a âncora de uma forma só é aceita se cai dentro do envelope medido do volume dela (com folga do
   erro de envelope declarado e de 1e-3 mm); fora disso a medida não é lida. Uma forma que ficou sem tradução, ou que um
   componente recolhido absorveu (só a forma principal dele tem o envelope), não está na blocagem: numa caixa de eixo ela só deixa
   a medida passar quando a caixa dela no eixo cabe dentro do resultado das outras, porque então não pode mudá-lo; em todos os
   outros casos a medida volta como não lida, com o motivo e as formas.

   A mesma conta sobre a caixa e as âncoras do dado do esboço (`fonte: 'esboco'`) é a leitura de comparação: `compararLeituras`
   diz, por medida, a diferença das duas e se a diferença cabe no que as perdas declaradas do tradutor explicam. Puro e
   determinístico. */
import { medirAndaime } from './medir-blocagem-nivel-zero.js';

export const FORMATO_MEDIDAS_NA_BLOCAGEM = 'mecanifica.medidas-na-blocagem@1';
export const UNIDADES = Object.freeze({ mm: 1, cm: 10, m: 1000 });
const TOTAIS = Object.freeze({ alturaTotal: 'y', larguraTotal: 'x', profundidadeTotal: 'z' });
const EIXOS = ['x', 'y', 'z'];
const LADOS = ['+x', '-x', '+y', '-y', '+z', '-z'];
/* Folga com que uma âncora declarada pode passar do envelope medido do volume, além do erro de envelope das perdas. */
const FOLGA_DA_ANCORA_MM = 1e-3;
const FOLGA_NUMERICA = 1e-9;

const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const r1 = (x) => Math.round(x * 10) / 10;
const r6 = (x) => { const r = Math.round(x * 1e6) / 1e6; return r === 0 ? 0 : r; };

/* Medida que a blocagem (ou o dado) não consegue ler: vira `lida: false` com o motivo, e nunca derruba as outras. */
class NaoLida extends Error {
  constructor(motivo, formas = []) { super(motivo); this.formas = formas; }
}

const casa = (padrao, id) => new RegExp(`^${padrao.split('*').map((t) => t.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`).test(id);

/* Formas visíveis que um id, um padrão (`garfoE.*`) ou o id de uma instância de componente designa. */
function selecionar(entrada, visiveis) {
  const achadas = visiveis.filter((f) => (entrada.includes('*') ? casa(entrada, f.id) : (f.id === entrada || f.origem?.componente?.instancia === entrada)));
  if (achadas.length === 0) throw new NaoLida(`"${entrada}" não é uma forma visível da opção`);
  return achadas;
}

/* ---------- as duas fontes de caixa e âncora ---------- */

/* A fonte do dado do esboço: a caixa e as âncoras que `formasResolvidas` exporta. */
function fonteDoDado() {
  return {
    nome: 'esboco',
    tem: () => true,
    motivoDeFora: () => null,
    caixa: (f) => f.geometria.caixa,
    ancora(f, nome) {
      const c = f.geometria.caixa;
      if (LADOS.includes(nome)) return facePelaCaixa(c, nome);
      if (!Object.hasOwn(f.geometria.ancoras ?? {}, nome)) throw new NaoLida(`a forma "${f.id}" não tem a âncora "${nome}" (âncoras: ${Object.keys(f.geometria.ancoras ?? {}).join(', ')})`);
      return f.geometria.ancoras[nome];
    },
    volume: () => null,
  };
}

function facePelaCaixa(caixa, lado) {
  const k = EIXOS.indexOf(lado[1]);
  const meio = caixa.min.map((v, i) => (v + caixa.max[i]) / 2);
  return meio.map((v, i) => (i === k ? (lado[0] === '+' ? caixa.max[k] : caixa.min[k]) : v));
}

/* A fonte da blocagem: o envelope de cada volume sai dos vértices da malha compilada do andaime. */
function fonteDaBlocagem(dados, traducao) {
  const { andaime, tabela, naoTraduzidas = [], perdas = [] } = traducao;
  const medidos = medirAndaime(andaime, andaime.volumes);
  const recolhidos = new Map(perdas.filter((p) => p.tipo === 'componente').map((p) => [p.volumeId, p]));
  const erroDoVolume = new Map(perdas.map((p) => [p.volumeId, p.erroEnvelope.mm]));
  const semTraducao = new Map(naoTraduzidas.map((n) => [n.id, n.motivo]));
  const principalDe = (f) => f.origem?.componente?.principal === true;
  const temComPrincipal = new Set(dados.formas.filter((f) => f.oculto !== true && principalDe(f)).map((f) => tabela[f.id]).filter(Boolean));
  const motivoDeFora = (f) => {
    if (semTraducao.has(f.id)) return `a forma "${f.id}" (${f.tipo}) não tem tradução: ${semTraducao.get(f.id)}`;
    const volume = tabela[f.id];
    if (volume === undefined) return `a forma "${f.id}" não está na tabela do tradutor`;
    if (recolhidos.has(volume) && temComPrincipal.has(volume) && !principalDe(f)) {
      return `a forma "${f.id}" foi recolhida com o componente ${recolhidos.get(volume).id} ao envelope da forma principal, e a blocagem só tem o envelope dela`;
    }
    return null;
  };
  const caixaDoVolume = (volume) => {
    const m = medidos.get(volume);
    return { min: m.min, max: m.max };
  };
  return {
    nome: 'blocagem',
    tem: (f) => motivoDeFora(f) === null,
    motivoDeFora,
    caixa(f) {
      const motivo = motivoDeFora(f);
      if (motivo) throw new NaoLida(motivo, [f.id]);
      return caixaDoVolume(tabela[f.id]);
    },
    ancora(f, nome) {
      const motivo = motivoDeFora(f);
      if (motivo) throw new NaoLida(motivo, [f.id]);
      const caixa = caixaDoVolume(tabela[f.id]);
      if (LADOS.includes(nome)) return facePelaCaixa(caixa, nome);
      if (!Object.hasOwn(f.geometria.ancoras ?? {}, nome)) throw new NaoLida(`a forma "${f.id}" não tem a âncora "${nome}" (âncoras: ${Object.keys(f.geometria.ancoras ?? {}).join(', ')})`);
      const ponto = f.geometria.ancoras[nome];
      const folga = FOLGA_DA_ANCORA_MM + (erroDoVolume.get(tabela[f.id]) ?? 0);
      const fora = ponto.findIndex((c, i) => c < caixa.min[i] - folga || c > caixa.max[i] + folga);
      if (fora >= 0) throw new NaoLida(`a âncora "${f.id}.${nome}" fica fora do envelope medido do volume ${tabela[f.id]} no eixo ${EIXOS[fora]} (${r6(ponto[fora])} contra ${r6(caixa.min[fora])} a ${r6(caixa.max[fora])})`, [f.id]);
      return ponto;
    },
    volume: (f) => tabela[f.id] ?? null,
    perdas,
  };
}

/* ---------- uma medida ---------- */

function pontoDaMedida(ref, visiveis, pontos, fonte, usadas) {
  if (Array.isArray(ref)) return ref;
  if (Object.hasOwn(pontos, ref)) return pontos[ref];
  const i = typeof ref === 'string' ? ref.lastIndexOf('.') : -1;
  if (i <= 0) throw new NaoLida(`"${ref}" não é um ponto nomeado nem "<id>.<ancora>"`);
  const forma = visiveis.find((f) => f.id === ref.slice(0, i));
  if (!forma) throw new NaoLida(`"${ref}" aponta para a forma "${ref.slice(0, i)}", que não é visível na opção`);
  usadas.push(forma);
  return fonte.ancora(forma, ref.slice(i + 1));
}

function medirExpressao(mede, visiveis, pontos, fonte) {
  const usadas = [];
  if (typeof mede === 'string') {
    if (!Object.hasOwn(TOTAIS, mede)) throw new NaoLida(`"${mede}" não é uma expressão de medida`);
    mede = { caixa: TOTAIS[mede] };
  }
  if (!objeto(mede)) throw new NaoLida('expressão de medida inválida');
  if (mede.caixa !== undefined) {
    const k = EIXOS.indexOf(mede.caixa);
    if (k < 0) throw new NaoLida(`"${mede.caixa}" não é um eixo`);
    const selecionadas = mede.formas ? [...new Set(mede.formas.flatMap((q) => selecionar(q, visiveis)))] : visiveis;
    const dentro = selecionadas.filter((f) => fonte.tem(f));
    const fora = selecionadas.filter((f) => !fonte.tem(f));
    if (dentro.length === 0) throw new NaoLida(`nenhuma das ${selecionadas.length} forma(s) da medida está na blocagem: ${fonte.motivoDeFora(fora[0])}`, fora.map((f) => f.id));
    const caixas = dentro.map((f) => fonte.caixa(f));
    const menor = Math.min(...caixas.map((c) => c.min[k]));
    const maior = Math.max(...caixas.map((c) => c.max[k]));
    /* uma forma que a blocagem não tem só deixa passar se o esboço dela cabe no resultado: então não pode mudá-lo */
    const passam = fora.filter((f) => f.geometria.caixa.min[k] < menor - FOLGA_NUMERICA || f.geometria.caixa.max[k] > maior + FOLGA_NUMERICA);
    if (passam.length > 0) throw new NaoLida(`${fonte.motivoDeFora(passam[0])}, e a caixa dela em ${mede.caixa} (${r6(passam[0].geometria.caixa.min[k])} a ${r6(passam[0].geometria.caixa.max[k])}) passa de ${r6(menor)} a ${r6(maior)}, o que as outras formas medem`, passam.map((f) => f.id));
    return { mm: maior - menor, formas: dentro.map((f) => f.id), foraDoAndaime: fora.map((f) => f.id), usadas: dentro };
  }
  if (!Array.isArray(mede.distancia) || mede.distancia.length !== 2) throw new NaoLida('a distância precisa de dois pontos');
  const [a, b] = mede.distancia.map((q) => pontoDaMedida(q, visiveis, pontos, fonte, usadas));
  const k = mede.eixo === undefined ? -1 : EIXOS.indexOf(mede.eixo);
  if (mede.eixo !== undefined && k < 0) throw new NaoLida(`"${mede.eixo}" não é um eixo`);
  const mm = k >= 0 ? Math.abs(b[k] - a[k]) : Math.hypot(...b.map((x, i) => x - a[i]));
  return { mm, formas: [...new Set(usadas.map((f) => f.id))], foraDoAndaime: [], usadas };
}

/* A medida lida na fonte: o que o esboço devolve em `conferirPlano`, mais o valor exato e o que foi lido. */
function lerMedida(m, visiveis, pontos, fonte) {
  const esperado = m.valor * (UNIDADES[m.unidade] ?? NaN);
  const tolerancia = m.tolerancia ?? Math.max(1, esperado * 0.02);
  const base = { nome: m.nome, origem: m.origem, esperado_mm: r1(esperado), tolerancia_mm: r1(tolerancia) };
  try {
    if (!Number.isFinite(esperado)) throw new NaoLida(`a unidade ${JSON.stringify(m.unidade)} não é mm, cm nem m`);
    const { mm, formas, foraDoAndaime, usadas } = medirExpressao(m.mede, visiveis, pontos, fonte);
    const desvio = mm - esperado;
    const volumes = [...new Set(usadas.map((f) => fonte.volume(f)).filter(Boolean))].sort();
    const perdas = (fonte.perdas ?? []).filter((p) => volumes.includes(p.volumeId));
    return {
      ...base, lida: true, medido_mm: r1(mm), desvio_mm: r1(desvio), ok: Math.abs(desvio) <= tolerancia + 1e-9,
      exato_mm: r6(mm), desvioExato_mm: r6(desvio), formas: [...formas].sort(),
      ...(fonte.nome === 'blocagem' ? { volumes, perdas: perdas.map((p) => p.id).sort(), limiteDasPerdas_mm: r6(perdas.reduce((s, p) => s + p.erroEnvelope.mm, 0)) } : {}),
      ...(foraDoAndaime.length ? { foraDoAndaime: [...foraDoAndaime].sort() } : {}),
    };
  } catch (e) {
    if (!(e instanceof NaoLida)) throw e;
    return { ...base, lida: false, motivo: e.message, formas: [...e.formas].sort() };
  }
}

function lerComFonte(fonte, { dados, medidas }) {
  const visiveis = dados.formas.filter((f) => f.oculto !== true);
  const pontos = dados.pontos ?? {};
  const lidas = medidas.map((m) => lerMedida(m, visiveis, pontos, fonte));
  return {
    formato: FORMATO_MEDIDAS_NA_BLOCAGEM, fonte: fonte.nome, opcao: dados.opcao, medidas: lidas,
    resumo: { total: lidas.length, lidas: lidas.filter((l) => l.lida).length, naoLidas: lidas.filter((l) => !l.lida).length, reprovadas: lidas.filter((l) => l.lida && !l.ok).length },
  };
}

/* ---------- a interface ---------- */

/* As medidas lidas na blocagem compilada do andaime. `dados` é `formasResolvidas(esboco, opcao)`; `traducao` é o resultado de
   `traduzirFormasParaAndaime(dados)` (`andaime`, `tabela`, `naoTraduzidas`, `perdas`); `medidas` são as do plano que valem
   para a opção, no formato de `lerPlano`, com os pontos `<instancia>.<ancora>` já trocados pelos da forma real. */
export function lerMedidasNaBlocagem({ dados, traducao, medidas }) {
  return lerComFonte(fonteDaBlocagem(dados, traducao), { dados, medidas });
}

/* As mesmas medidas, pela mesma conta, sobre a caixa e as âncoras do dado do esboço: a leitura que a blocagem tem de reproduzir. */
export function lerMedidasNoDado({ dados, medidas }) {
  return lerComFonte(fonteDoDado(), { dados, medidas });
}

/* Compara a leitura na blocagem com a do dado, por medida (na ordem delas). Uma medida concorda quando as duas foram lidas, os
   valores diferem até `tolerancia_mm` e o veredito é o mesmo. `explicada` diz se a diferença cabe no que as perdas declaradas
   do tradutor das formas lidas explicam (a soma do `erroEnvelope.mm` delas), mais `tolerancia_mm` para o polígono inscrito. */
export function compararLeituras(naBlocagem, noDado, { tolerancia_mm: tolerancia = 0.05 } = {}) {
  return naBlocagem.medidas.map((b, i) => {
    const d = noDado.medidas[i];
    if (!b.lida || !d.lida) {
      return { nome: b.nome, concordam: false, lidaNaBlocagem: b.lida, lidaNoDado: d.lida, ...(b.lida ? {} : { motivo: b.motivo }) };
    }
    const diferenca = r6(Math.abs(b.exato_mm - d.exato_mm));
    const desvioIgual = r6(Math.abs(b.desvioExato_mm - d.desvioExato_mm));
    const limite = b.limiteDasPerdas_mm + tolerancia;
    return {
      nome: b.nome, lidaNaBlocagem: true, lidaNoDado: true, blocagem_mm: b.exato_mm, esboco_mm: d.exato_mm, diferenca_mm: diferenca,
      desvioIgual_mm: desvioIgual, mesmoVeredito: b.ok === d.ok, perdas: b.perdas, limiteDasPerdas_mm: b.limiteDasPerdas_mm,
      concordam: diferenca <= tolerancia && b.ok === d.ok,
      explicada: diferenca <= limite + FOLGA_NUMERICA,
    };
  });
}

const pt = (x) => String(x).replace('.', ',');

/* O resumo em texto, uma linha por medida, no formato do `--medidas` do esboço (declarado, medido, desvio e tolerância), com a
   forma não lida e o motivo. */
export function descreverMedidasNaBlocagem(leitura) {
  const linhas = [`medidas na blocagem${leitura.opcao?.numero ? ` (opção ${leitura.opcao.numero}${leitura.opcao.titulo ? `, ${leitura.opcao.titulo}` : ''})` : ''}: ${leitura.resumo.lidas} lida(s), ${leitura.resumo.naoLidas} não lida(s), ${leitura.resumo.reprovadas} fora da tolerância`];
  for (const m of leitura.medidas) {
    linhas.push(m.lida
      ? `  ${m.nome}: declarado ${pt(m.esperado_mm)} mm, medido ${pt(m.medido_mm)} mm, desvio ${pt(m.desvio_mm)} mm (tolerância ${pt(m.tolerancia_mm)} mm), ${m.ok ? 'dentro' : 'fora'}${m.perdas.length ? `; perdas que tocam: ${m.perdas.join(', ')}` : ''}`
      : `  ${m.nome}: não lida (${m.motivo})`);
  }
  return linhas.join('\n');
}
