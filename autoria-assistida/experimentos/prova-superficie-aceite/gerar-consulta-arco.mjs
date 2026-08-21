#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORMATO_CONSULTA_VISUAL, hashDoArquivo, verificarConsultaNoDisco } from './consulta-visual.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..', '..', '..');
const evidencias = path.join(aqui, 'evidencias');
const entrada = (id, classe, nome) => {
  const absoluto = path.join(evidencias, nome);
  return { id, classe, regiao: 'arco-dianteiro', vista: 'lateral', arquivo: `repo://autoria-assistida/experimentos/prova-superficie-aceite/evidencias/${nome}`, sha256: hashDoArquivo(absoluto) };
};
const entradas = [
  entrada('alvo-arco', 'alvo', 'arco-dianteiro-alvo.svg'),
  entrada('modelo-arco', 'modelo', 'arco-dianteiro-modelo.svg'),
  entrada('comparacao-arco', 'comparacao-regional', 'arco-dianteiro-p0-vs-loop.svg'),
];
const consulta = {
  formato: FORMATO_CONSULTA_VISUAL,
  papel: 'modelador',
  proposito: 'comparar',
  regiao: 'arco-dianteiro',
  entradas,
};
const resultado = verificarConsultaNoDisco(consulta, raiz);
if (!resultado.valida) throw new Error(resultado.erros.join('; '));
const consultaDoCritico = { ...consulta, papel: 'critico-visual-independente', proposito: 'revisar', entradas: entradas.map((e) => ({ ...e })) };
const resultadoCritico = verificarConsultaNoDisco(consultaDoCritico, raiz);
if (!resultadoCritico.valida) throw new Error(resultadoCritico.erros.join('; '));
mkdirSync(evidencias, { recursive: true });
writeFileSync(path.join(evidencias, 'consulta-modelador-arco.json'), `${JSON.stringify(consulta, null, 2)}\n`);
writeFileSync(path.join(evidencias, 'consulta-critico-arco.json'), `${JSON.stringify(consultaDoCritico, null, 2)}\n`);
console.log('consulta-modelador-arco.json\nconsulta-critico-arco.json');
