/* farol-opcoes.capturar.mjs — captura as três opções de `farol-opcoes.esboco.mjs` com os materiais do furgão (vidro, cromo, plástico
 * escuro), que o esboço do 2.0 não declara (a forma só aceita `cor` lisa). Monta as opções pelo `montarOpcoes` do esboço, acrescenta
 * a cada receita os materiais e a atribuição por parte, e usa o `capturarLadoALado` da ferramenta, com a mesma câmera em todas.
 *
 *   node docs/modelar/banco-de-provas/furgao-realista-2026-10-30/detalhes/farol-opcoes.capturar.mjs [pasta de saída]
 *
 * Grava `farol-opcoes-frontal.png` e `farol-opcoes-tres-quartos.png` (padrão: tools/bancadas/out/). */
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerArquivoDeEsboco, montarOpcoes, capturarLadoALado, diferencaDeCamera } from '../../../../../tools/modelar/esboco-nucleo.mjs';
import { MATERIAIS_DO_FURGAO } from '../../../../../procedural/pecas/furgao-realista/receita.js';
import { SELECAO_DAS_PARTES, materialDaParte } from './farol-opcoes.esboco.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(AQUI, '../../../../..');
const saida = resolve(process.argv[2] ?? join(REPO, 'tools/bancadas/out'));

/* o vidro do furgão claro, liso e sem relevo (o `vidro` dos cristais, com transmissão e tom verde, escurecia e esverdeava o fundo da lente) */
const MATERIAIS = { ...MATERIAIS_DO_FURGAO, vidroDoFarol: { tipo: 'liso', cor: '#f4f8fa', mistura: 'transparente', opacidade: 0.08, aspereza: 0.03, metalicidade: 0 },
  /* o `refletor` do furgão (metal espelhado) sai preto na bancada, que não tem o que refletir de frente: aqui, cromo claro e menos espelhado */
  refletor: { tipo: 'metal', acabamento: 'pintado', cor: '#e8eaed', aspereza: 0.22, metalicidade: 0.75 } };

const esboco = await lerArquivoDeEsboco(join(AQUI, 'farol-opcoes.esboco.mjs'));
const r = montarOpcoes(esboco, { nome: 'farol-opcoes', relato: false });
if (r.recusas.length) { console.error(r.recusas.map((q) => `${q.opcao}: ${q.motivo}`).join('\n')); process.exit(1); }

const paineis = r.paineis.map((p) => {
  const usados = {};
  const passos = [...p.receita.PASSOS];
  for (const nome of p.partes) {
    const usa = materialDaParte(nome);
    if (!usa) throw new Error(`a parte ${nome} não tem material em MATERIAL_DAS_PARTES`);
    usados[usa] = MATERIAIS[usa];
    passos.push(['material', { sel: SELECAO_DAS_PARTES[nome] ?? { grupo: nome }, usa }]);
  }
  return { ...p, receita: { ...p.receita, PASSOS: passos, MATERIAIS: usados } };
});

for (const [vista, arquivo] of [['frontal', 'farol-opcoes-frontal.png'], ['isometrica', 'farol-opcoes-tres-quartos.png']]) {
  const res = await capturarLadoALado({
    paineis, vista, saida: join(saida, arquivo), titulo: `farol dianteiro, três opções (vista ${vista === 'frontal' ? 'frontal' : 'em três quartos'})`, largura: 760, cores: false,
    rodape: 'Mesma câmera nas três opções, ortográfica. Materiais do furgão: vidro, cromo, plástico escuro e aro cinza; chapa azul.',
    logger: (t) => console.log(`  ${t}`),
  });
  console.log(`${vista}: câmera difere ${diferencaDeCamera(res.telas).toExponential(2)}; ${res.saida} (${res.largura}x${res.altura})`);
}
