/* Gera o corpus N3. Não altera receitas nem promove geometria histórica. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { analisarSuperficie, renderizarDiagnosticoSvg, renderizarPainelZebra, superficiesSinteticas } from '../../../tools/mecanifica/percepcao-superficie.mjs';
import { criarCageDireta, espelharCage } from '../prova-cage-direta-r2/cage-direta.mjs';
import { subdividirUmNivel } from '../prova-cage-direta-r2/subdividir.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..', '..', '..');
const destino = path.join(aqui, 'evidencias');
const json = (arquivo) => JSON.parse(readFileSync(arquivo, 'utf8'));
const gravar = (arquivo, conteudo) => writeFileSync(path.join(destino, arquivo), `${conteudo}\n`);

function receitaCupe() {
  const window = {};
  vm.runInNewContext(readFileSync(path.join(raiz, 'laboratorio-isolado', 'cupe-livre-01', 'receita-cupe.js'), 'utf8'), { window });
  return window.RECEITA_CUPE_LIVRE;
}

/* Transcrição literal da parte de loft de carroceria do experimento isolado.
   O recorte é deliberado: C1 mede a pele primária, não rodas ou adereços. */
function corpoCupeDaReceita() {
  const receita = receitaCupe(); const { secoes, amostrasEntreSecoes } = receita.carroceria;
  const suave = (t) => t * t * (3 - 2 * t);
  const amostras = [];
  for (let i = 0; i < secoes.length - 1; i += 1) for (let j = 0; j < amostrasEntreSecoes; j += 1) {
    const a = secoes[i], b = secoes[i + 1], t = suave(j / amostrasEntreSecoes), item = {};
    for (const chave of Object.keys(a)) item[chave] = typeof a[chave] === 'number' ? a[chave] + (b[chave] - a[chave]) * t : a[chave];
    amostras.push(item);
  }
  amostras.push({ ...secoes.at(-1) });
  const perfil = (s) => {
    const mistura = (a, b, t) => a + (b - a) * t;
    const yBaixo = mistura(s.fundo, s.ventre, .54), yFlanco = mistura(s.ventre, s.cintura, .52), ySuperior = mistura(s.cintura, s.topo, .48);
    const wBaixo = mistura(s.wFundo, s.wMax, .72), wFlanco = mistura(s.wMax, s.wOmbro, .54), wCentro = s.wTopo * .42;
    return [[-s.wFundo, s.fundo], [s.wFundo, s.fundo], [wBaixo, yBaixo], [s.wMax, s.ventre], [wFlanco, yFlanco], [s.wOmbro, s.cintura], [s.wTopo, ySuperior], [wCentro, s.topo], [-wCentro, s.topo], [-s.wTopo, ySuperior], [-s.wOmbro, s.cintura], [-wFlanco, yFlanco], [-s.wMax, s.ventre], [-wBaixo, yBaixo]];
  };
  const perfis = amostras.map(perfil), V = perfis.flatMap((pontos, k) => pontos.map(([x, y]) => [x, y, amostras[k].z])); const F = [];
  for (let k = 0; k < amostras.length - 1; k += 1) for (let i = 0; i < 14; i += 1) {
    const j = (i + 1) % 14, a = k * 14 + i, b = k * 14 + j, c = (k + 1) * 14 + j, d = (k + 1) * 14 + i;
    const laterais = i === 0 || (i >= 1 && i <= 4) || (i >= 10 && i <= 13);
    const z = (amostras[k].z + amostras[k + 1].z) / 2; const y = (perfis[k][i][1] + perfis[k][j][1] + perfis[k + 1][i][1] + perfis[k + 1][j][1]) / 4;
    const dentroDoArco = laterais && receita.rodas.some((roda) => { const dz = z - roda.z, raio = roda.raio + .045; return Math.abs(dz) < raio && (i === 0 || y < roda.y + Math.sqrt(raio * raio - dz * dz) + .018); });
    if (!dentroDoArco) F.push([a, b, c, d]);
  }
  for (let i = 1; i < 13; i += 1) F.push([0, i + 1, i]);
  const base = (amostras.length - 1) * 14; for (let i = 1; i < 13; i += 1) F.push([base, base + i, base + i + 1]);
  return { V, F };
}

export function montarCorpusN3() {
  const quarto = json(path.join(raiz, 'autoria-assistida', 'rascunhos-defeituosos', 'prova-cage-quarto-dianteiro', 'evidencias', 'malha-nivel-2.json'));
  return [
    { id: 'esfera-sintetica', vereditoHumano: 'sadio-por-construcao', malha: superficiesSinteticas.esfera() },
    { id: 'toro-sintetico', vereditoHumano: 'sadio-por-construcao', malha: superficiesSinteticas.toro() },
    { id: 'patch-justo-sintetico', vereditoHumano: 'sadio-por-construcao', malha: superficiesSinteticas.patchJusto() },
    { id: 'quebra-sintetica', vereditoHumano: 'reprovado-por-construcao', malha: superficiesSinteticas.patchComQuebra() },
    { id: 'quarto-dianteiro', vereditoHumano: 'reprovado-historico', malha: quarto },
    { id: 'r2b', vereditoHumano: 'reprovado-historico', malha: subdividirUmNivel(espelharCage(criarCageDireta())) },
    { id: 'cupe-livre-corpo', vereditoHumano: 'reprovado-historico', malha: corpoCupeDaReceita() },
  ].map((item) => ({ ...item, analise: analisarSuperficie(item.malha) }));
}

export function gerarEvidenciasN3() {
  mkdirSync(destino, { recursive: true });
  const corpus = montarCorpusN3();
  for (const item of corpus) gravar(`${item.id}.svg`, renderizarDiagnosticoSvg(item.analise, { titulo: item.id }));
  gravar('painel-zebra.svg', renderizarPainelZebra(corpus));
  const saudaveis = corpus.filter((item) => item.vereditoHumano === 'sadio-por-construcao');
  const reprovados = corpus.filter((item) => item.vereditoHumano !== 'sadio-por-construcao');
  const resultado = {
    formato: 'mecanifica.calibracao-c1-n3@1',
    escopo: 'continuidade de superfície; não mede reconhecimento, proporção ou caráter veicular',
    corpus: corpus.map(({ id, vereditoHumano, analise }) => ({ id, vereditoHumano, ...Object.fromEntries(Object.entries(analise).filter(([chave]) => !['malha', 'diedros', 'vizinhos'].includes(chave))) })),
    gate: {
      saudaveisRegulares: saudaveis.every((item) => item.analise.leitura === 'regular-no-canal-c1'),
      reprovadosIrregulares: reprovados.every((item) => item.analise.leitura === 'irregular-no-canal-c1'),
    },
  };
  resultado.gate.passa = resultado.gate.saudaveisRegulares && resultado.gate.reprovadosIrregulares;
  gravar('resultado-c1.json', JSON.stringify(resultado, null, 2));
  return resultado;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(gerarEvidenciasN3(), null, 2));
