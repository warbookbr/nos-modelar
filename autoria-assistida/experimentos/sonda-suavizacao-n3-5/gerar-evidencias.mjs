/* Gera a sonda N3.5 sem alterar a receita ou a malha histórica de entrada. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analisarSuperficie, renderizarDiagnosticoPng } from '../../../tools/mecanifica/percepcao-superficie.mjs';
import { medirRegiaoSuave, suavizarGuiadoPorC1 } from './suavizar-c1.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..', '..', '..');
const destino = path.join(aqui, 'evidencias');
const fonte = path.join(raiz, 'autoria-assistida', 'rascunhos-defeituosos', 'prova-cage-quarto-dianteiro', 'evidencias', 'malha-nivel-2.json');
const diagnosticos = [
  { tipo: 'zebra', camera: 'isometrica' }, { tipo: 'zebra', camera: 'lateral' }, { tipo: 'zebra', camera: 'frontal' }, { tipo: 'zebra', camera: 'superior' },
  { tipo: 'isofota', camera: 'isometrica' }, { tipo: 'curvatura', camera: 'isometrica' },
];
const gravar = (arquivo, conteudo) => writeFileSync(path.join(destino, arquivo), conteudo);

export async function gerarEvidenciasN35() {
  mkdirSync(destino, { recursive: true });
  const antes = JSON.parse(readFileSync(fonte, 'utf8'));
  const fonteImutavel = JSON.stringify(antes);
  const sonda = suavizarGuiadoPorC1(antes);
  if (JSON.stringify(antes) !== fonteImutavel) throw new Error('N3.5 alterou a malha histórica de entrada');
  const analiseAntes = analisarSuperficie(antes), analiseDepois = analisarSuperficie(sonda.malha);
  const suaveAntes = medirRegiaoSuave(antes), suaveDepois = medirRegiaoSuave(sonda.malha);
  const arquivos = [];
  for (const [rotulo, analise] of [['antes', analiseAntes], ['depois', analiseDepois]]) for (const diagnostico of diagnosticos) {
    const arquivo = `${rotulo}-${diagnostico.tipo}-${diagnostico.camera}.png`;
    gravar(arquivo, await renderizarDiagnosticoPng(analise, diagnostico));
    arquivos.push({ rotulo, ...diagnostico, arquivo });
  }
  const reducaoRelativaP95 = (suaveAntes.diedroSuaveP95Graus - suaveDepois.diedroSuaveP95Graus) / (suaveAntes.diedroSuaveP95Graus || 1);
  /* Sonda não pode converter ruído numérico em aprovação: exige redução
     material da região livre e não permite aumentar ruptura abrupta global. */
  const melhoraMaterial = reducaoRelativaP95 >= .1;
  const semRegressaoAbrupta = analiseDepois.parcelaAbrupta <= analiseAntes.parcelaAbrupta;
  const resultado = {
    formato: 'mecanifica.sonda-suavizacao-n3-5@1',
    escopo: 'quarto dianteiro reprovado; suavização C1 sem busca, sem receita nova e sem promoção de artefato',
    fonte: 'rascunhos-defeituosos/prova-cage-quarto-dianteiro/evidencias/malha-nivel-2.json',
    parametros: sonda.parametros,
    antes: { c1: { diedroP95Graus: analiseAntes.diedroP95Graus, parcelaAbrupta: analiseAntes.parcelaAbrupta }, regiaoSuave: suaveAntes },
    depois: { c1: { diedroP95Graus: analiseDepois.diedroP95Graus, parcelaAbrupta: analiseDepois.parcelaAbrupta }, regiaoSuave: suaveDepois },
    preservacao: sonda.preservacao,
    gate: { passa: melhoraMaterial && semRegressaoAbrupta && sonda.preservacao.deslocamentoMaximoMm <= 20, reducaoRelativaP95: Number(reducaoRelativaP95.toFixed(4)), melhoraMaterial, semRegressaoAbrupta, topologiaPreservada: antes.V.length === sonda.malha.V.length && antes.F.length === sonda.malha.F.length, motivo: 'sonda não aprova veículo; só passa com redução material da rugosidade livre, sem criar ruptura abrupta nem mover bordas/quinas protegidas' },
    arquivos,
  };
  gravar('resultado-n3-5.json', Buffer.from(`${JSON.stringify(resultado, null, 2)}\n`));
  return resultado;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await gerarEvidenciasN35(), null, 2));
