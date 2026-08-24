/* Gera a evidência N5 do vencedor; não desenha nem promove um veículo. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analisarSuperficie, renderizarDiagnosticoPng } from '../../../tools/mecanifica/percepcao-superficie.mjs';
import { verificarProcedencia } from '../../../tools/mecanifica/procedencia-check.mjs';
import { buscarBojoN5 } from './busca-bojo.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const destino = path.join(aqui, 'evidencias');
const sha256 = (conteudo) => createHash('sha256').update(conteudo).digest('hex');
const diagnosticos = [
  { tipo: 'zebra', camera: 'isometrica' }, { tipo: 'zebra', camera: 'lateral' }, { tipo: 'zebra', camera: 'frontal' }, { tipo: 'zebra', camera: 'superior' },
  { tipo: 'isofota', camera: 'isometrica' }, { tipo: 'curvatura', camera: 'isometrica' },
];
const assinaturaManifesto = (arquivos) => sha256(JSON.stringify(arquivos.map(({ tipo, camera, sha256: impressao }) => ({ tipo, camera, sha256: impressao }))));

export async function gerarEvidenciasN5() {
  mkdirSync(destino, { recursive: true });
  const fonte = JSON.parse(readFileSync(path.join(aqui, 'fonte-n5.json'), 'utf8'));
  const busca = buscarBojoN5(fonte); const { vencedor } = busca;
  const analise = analisarSuperficie(vencedor.secao.malha); const arquivos = [];
  for (const diagnostico of diagnosticos) {
    const arquivo = `vencedor-${diagnostico.tipo}-${diagnostico.camera}.png`;
    writeFileSync(path.join(destino, arquivo), await renderizarDiagnosticoPng(analise, diagnostico));
    arquivos.push({ ...diagnostico, arquivo, sha256: sha256(readFileSync(path.join(destino, arquivo))) });
  }
  const impressaoManifesto = assinaturaManifesto(arquivos);
  const caminhoInspecao = path.join(destino, 'inspecao-individual.json');
  const inspecao = existsSync(caminhoInspecao) ? JSON.parse(readFileSync(caminhoInspecao, 'utf8')) : null;
  const inspecaoIndividual = Boolean(inspecao?.estado === 'aprovada' && inspecao.impressaoManifesto === impressaoManifesto);
  const resultado = {
    formato: 'mecanifica.sonda-busca-n5@1',
    escopo: 'prova C3 em uma seção sintética; não escolhe o desenho de um carro nem aprova G02',
    liberdadeResidual: busca.intervalo,
    objetivo: busca.objetivo,
    candidatos: { avaliados: busca.candidatos.length, elegiveis: busca.candidatos.filter(({ elegivel }) => elegivel).length },
    vencedor: {
      bojoRelativo: vencedor.bojoRelativo, sagitaMm: vencedor.sagitaMm, erroObjetivoMm: vencedor.erroObjetivoMm,
      restricoes: vencedor.restricoes, c1: vencedor.c1,
    },
    protocoloInspecao: { regra: 'cada imagem é aberta individualmente em tamanho nativo; mosaico não aprova', imagens: diagnosticos, impressaoManifesto, estado: inspecaoIndividual ? 'aprovada-por-inspecao-individual' : 'pendente-de-inspecao-individual' },
    gate: {
      procedencia: verificarProcedencia(fonte).passa,
      dominioResidual: busca.candidatos.every(({ bojoRelativo }) => bojoRelativo >= busca.intervalo.minimo && bojoRelativo <= busca.intervalo.maximo),
      objetivoAtingido: vencedor.erroObjetivoMm <= busca.objetivo.toleranciaMm,
      restricoes: vencedor.elegivel,
      c1Regular: vencedor.c1.leitura === 'regular-no-canal-c1' && vencedor.c1.diedroMaximoGraus <= 19,
      inspecaoIndividual,
    },
    arquivos,
  };
  resultado.gate.passa = Object.values(resultado.gate).every((valor) => valor === true);
  writeFileSync(path.join(destino, 'resultado-n5.json'), `${JSON.stringify(resultado, null, 2)}\n`);
  return resultado;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await gerarEvidenciasN5(), null, 2));
