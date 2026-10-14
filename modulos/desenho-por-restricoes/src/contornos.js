/* contornos.js — a saída no formato `mecanifica.contornos@1`, o mesmo que o contorno da imagem grava, para o esboço, a prancha e o
   crítico lerem como leem o de uma imagem.

   O que muda em relação ao arquivo de uma imagem: no lugar de `imagem` entra `origem` ({ desenho, sha256, resolvedor }), e saem
   `mmPorPx`, `residuo`, `semente` e todos os campos de pixel, que nenhum consumidor lê (a geometria resolvida já é exata, e a
   reta e o arco saem como reta e arco). Fica o que eles leem: `silhueta` com `contornoMm`, `linhaDeForaMm`, `pedacos` e
   `linhasDeForaMm`, e em cada região `contornoMm`, `pedacos`, `areaMm2` e, quando é o caso, `foraDoModelo`.

   Cada parte é a região visível dela: com `frenteParaFundo` declarado, uma parte escondida atrás de outra fica só com o pedaço
   visível, que é como o contorno da imagem define a região e como o esboço e a prancha a medem. Os pedaços saem do maior para o
   menor, o primeiro repete `contornoMm`, e só o anel externo de cada pedaço é gravado (um furo é visível por outra parte à frente
   ou ao fundo, e o contorno da imagem também guarda só o externo). A silhueta é a união das partes que não são `foraDoModelo`.
   Os números saem arredondados a 0,001 mm, as partes em ordem de nome e cada anel começa no menor ponto. */
import { areaDoAnel, deslocar, diferenca, areasDaInterseccao, iniciarNoMenor, uniao } from './booleanas.js';
import { caixaDe, limparAnel, r3 } from './geometria.js';
import { FORMATO_DOS_CONTORNOS, RESOLVEDOR } from './formato.js';

const porNome = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const area2 = (x) => Math.round(x * 100) / 100;
/* Menos que isto, mm², não é sobreposição: é o arredondamento de dois anéis que se encostam. */
const SOBREPOSICAO_MINIMA_MM2 = 0.01;

/* Os pedaços de uma lista de componentes: o anel externo arredondado e a área do pedaço, que é a do anel menos a dos furos (como a
   área de uma região da imagem, que conta só os pixels da parte). */
function pedacosDe(componentes) {
  return componentes
    .map((c) => ({ externo: iniciarNoMenor(limparAnel(c.externo)), furos: c.furos.map((f) => limparAnel(f)) }))
    .filter((c) => c.externo.length >= 3 && Math.abs(areaDoAnel(c.externo)) > 0)
    .map((c) => ({ areaMm2: area2(Math.abs(areaDoAnel(c.externo)) - c.furos.reduce((s, f) => s + Math.abs(areaDoAnel(f)), 0)), contornoMm: c.externo }));
}

export async function contornosDoDesenho(modelo, aneis, { origem } = {}) {
  const nomes = Object.keys(modelo.partes).sort(porNome);
  const ocultas = [];
  const sobrepostas = [];
  const regioes = {};
  const frente = (nome) => (modelo.ordem ? modelo.ordem.slice(0, modelo.ordem.indexOf(nome)) : []);
  for (const nome of nomes) {
    const componentes = await diferenca([aneis[nome]], frente(nome).map((n) => aneis[n]));
    const pedacos = pedacosDe(componentes);
    if (!pedacos.length) { ocultas.push(nome); continue; }
    regioes[nome] = {
      ...(modelo.partes[nome].foraDoModelo ? { foraDoModelo: true } : {}),
      areaMm2: area2(pedacos.reduce((s, p) => s + p.areaMm2, 0)),
      contornoMm: pedacos[0].contornoMm,
      pedacos,
    };
  }
  if (!modelo.ordem) {
    const caixas = Object.fromEntries(nomes.map((n) => [n, caixaDe([aneis[n]])]));
    for (let i = 0; i < nomes.length; i += 1) {
      for (let j = i + 1; j < nomes.length; j += 1) {
        const [a, b] = [caixas[nomes[i]], caixas[nomes[j]]];
        if (a[2] <= b[0] || b[2] <= a[0] || a[3] <= b[1] || b[3] <= a[1]) continue;
        const { intersecao } = await areasDaInterseccao([aneis[nomes[i]]], [aneis[nomes[j]]]);
        if (intersecao > SOBREPOSICAO_MINIMA_MM2) sobrepostas.push({ a: nomes[i], b: nomes[j], areaMm2: area2(intersecao) });
      }
    }
  }
  const dentro = nomes.filter((n) => !modelo.partes[n].foraDoModelo);
  const daSilhueta = dentro.length ? dentro : nomes;
  const componentes = await uniao(daSilhueta.map((n) => aneis[n]));
  const pedacos = pedacosDe(componentes);
  const [h0, v0, h1, v1] = caixaDe(pedacos.map((p) => p.contornoMm));
  /* A linha de fora passa um pouco além da silhueta, para as partes, que tocam a borda, ficarem dentro dela: o equivalente em
     milímetro do pixel que o contorno da imagem usa. */
  const recuo = r3(Math.max(0.5, 0.0025 * Math.max(h1 - h0, v1 - v0)));
  const linhasDeForaMm = [];
  for (const p of pedacos) {
    const maiores = await deslocar([p.contornoMm], recuo);
    linhasDeForaMm.push(iniciarNoMenor(limparAnel(maiores[0].externo)));
  }
  const contornos = {
    formato: FORMATO_DOS_CONTORNOS,
    origem: { desenho: origem?.desenho ?? null, sha256: origem?.sha256 ?? null, resolvedor: RESOLVEDOR },
    silhueta: { contornoMm: pedacos[0].contornoMm, linhaDeForaMm: linhasDeForaMm[0], pedacos, linhasDeForaMm },
    regioes,
  };
  return { contornos, ocultas, sobrepostas, recuoDaLinhaDeForaMm: recuo };
}
