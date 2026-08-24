/* Gera as duas seções N4 e suas evidências C1, sem produzir veículo. */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analisarSuperficie, renderizarDiagnosticoPng } from '../../../tools/mecanifica/percepcao-superficie.mjs';
import { verificarProcedencia } from '../../../tools/mecanifica/procedencia-check.mjs';
import { ENUNCIADO_N4, resolverN4 } from './restricoes-secao.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const destino = path.join(aqui, 'evidencias');
const fonte = path.join(aqui, 'fonte-n4.json');
const caminhoInspecao = path.join(destino, 'inspecao-individual.json');
const sha256 = (conteudo) => createHash('sha256').update(conteudo).digest('hex');
const assinaturaManifesto = (arquivos) => sha256(JSON.stringify(arquivos.map(({ caso, tipo, camera, sha256: impressao }) => ({ caso, tipo, camera, sha256: impressao }))));
const diagnosticos = [
  { tipo: 'zebra', camera: 'isometrica' }, { tipo: 'zebra', camera: 'lateral' }, { tipo: 'zebra', camera: 'frontal' }, { tipo: 'zebra', camera: 'superior' },
  { tipo: 'isofota', camera: 'isometrica' }, { tipo: 'curvatura', camera: 'isometrica' },
];

export async function gerarEvidenciasN4() {
  mkdirSync(destino, { recursive: true });
  const dados = JSON.parse(readFileSync(fonte, 'utf8')); const secoes = resolverN4(dados);
  const procedencia = verificarProcedencia(dados); const arquivos = [];
  for (const secao of secoes) {
    const analise = analisarSuperficie(secao.malha);
    secao.c1 = { diedroP95Graus: analise.diedroP95Graus, diedroMaximoGraus: analise.diedroMaximoGraus, parcelaAbrupta: analise.parcelaAbrupta, leitura: analise.leitura };
    for (const diagnostico of diagnosticos) {
      const arquivo = `${secao.id}-${diagnostico.tipo}-${diagnostico.camera}.png`;
      writeFileSync(path.join(destino, arquivo), await renderizarDiagnosticoPng(analise, diagnostico));
      arquivos.push({ caso: secao.id, ...diagnostico, arquivo, sha256: sha256(readFileSync(path.join(destino, arquivo))) });
    }
    delete secao.malha;
  }
  const duasFormasDistintas = JSON.stringify(secoes[0].perfil) !== JSON.stringify(secoes[1].perfil);
  const impressaoManifesto = assinaturaManifesto(arquivos);
  const inspecao = existsSync(caminhoInspecao) ? JSON.parse(readFileSync(caminhoInspecao, 'utf8')) : null;
  const inspecaoIndividual = Boolean(inspecao?.estado === 'aprovada' && inspecao.impressaoManifesto === impressaoManifesto);
  const resultado = {
    formato: 'mecanifica.sonda-restricoes-n4@1',
    escopo: 'prova C2 com seção limpa; não é carro e não aprova G02',
    enunciado: ENUNCIADO_N4,
    protocoloInspecao: { regra: 'cada imagem é aberta individualmente em tamanho nativo; mosaico não aprova', imagensPorSecao: diagnosticos, impressaoManifesto, estado: inspecaoIndividual ? 'aprovada-por-inspecao-individual' : 'pendente-de-inspecao-individual' },
    secoes,
    gate: {
      procedencia: procedencia.passa,
      duasFormasDoMesmoEnunciado: duasFormasDistintas,
      restricoes: secoes.every((secao) => secao.passa),
      c1Regular: secoes.every((secao) => secao.c1.leitura === 'regular-no-canal-c1' && secao.c1.diedroMaximoGraus <= 19),
      inspecaoIndividual,
    },
    arquivos,
  };
  resultado.gate.passa = Object.values(resultado.gate).every((valor) => valor === true);
  writeFileSync(path.join(destino, 'resultado-n4.json'), `${JSON.stringify(resultado, null, 2)}\n`);
  return resultado;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await gerarEvidenciasN4(), null, 2));
