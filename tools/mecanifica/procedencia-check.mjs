#!/usr/bin/env node
/* Gate N3: contrato reduzido e explícito de procedência da fonte de restrições. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ORIGENS_VALIDAS = new Set(['medido', 'derivado', 'resolvido', 'declarado']);
export const CAMPOS_ESTRUTURAIS_VEICULO = new Set(['envelope.comprimento', 'envelope.largura', 'envelope.altura', 'landmark.nariz', 'eixo.dianteiro', 'eixo.traseiro', 'cabine.inicio', 'cabine.fim', 'cabine.pico', 'ombro.esquerdo', 'ombro.direito', 'massa-primaria.contorno']);

export function verificarProcedencia(fonte) {
  const valores = fonte?.valores;
  const erros = [];
  if (!Array.isArray(valores) || !valores.length) return { passa: false, erros: ['fonte precisa conter valores não vazios'], resumo: null };
  const porId = new Map();
  for (const valor of valores) {
    if (!valor?.id || !valor?.campo || !valor?.origem?.tipo) { erros.push('valor sem id, campo ou origem.tipo'); continue; }
    if (porId.has(valor.id)) erros.push(`id duplicado: ${valor.id}`);
    porId.set(valor.id, valor);
    if (!ORIGENS_VALIDAS.has(valor.origem.tipo)) erros.push(`origem inválida em ${valor.id}`);
    if (valor.origem.tipo === 'declarado' && !valor.origem.justificativa?.trim()) erros.push(`declarado sem justificativa em ${valor.id}`);
    if (CAMPOS_ESTRUTURAIS_VEICULO.has(valor.campo) && !['medido', 'derivado'].includes(valor.origem.tipo)) erros.push(`campo estrutural sem medida/derivação: ${valor.campo}`);
  }
  const declarados = valores.filter((v) => v?.origem?.tipo === 'declarado').length;
  if (declarados > valores.length / 5) erros.push(`declarados excedem 1/5 (${declarados}/${valores.length})`);
  for (const valor of valores.filter((v) => v?.origem?.tipo === 'resolvido')) {
    const fontes = valor.origem.fontes;
    if (!Array.isArray(fontes) || !fontes.length) { erros.push(`resolvido sem fontes em ${valor.id}`); continue; }
    const tipos = fontes.map((id) => porId.get(id)?.origem?.tipo);
    if (tipos.some((tipo) => !['medido', 'derivado'].includes(tipo))) erros.push(`resolvido sem cadeia medida/derivada em ${valor.id}`);
  }
  return { passa: !erros.length, erros, resumo: { valores: valores.length, declarados, limiteDeclarados: Math.floor(valores.length / 5), estruturais: valores.filter((v) => CAMPOS_ESTRUTURAIS_VEICULO.has(v?.campo)).length } };
}

function executarCli() {
  const arquivo = process.argv[2];
  if (!arquivo) { console.error('uso: node tools/mecanifica/procedencia-check.mjs fonte.json'); process.exitCode = 2; return; }
  let fonte;
  try { fonte = JSON.parse(readFileSync(arquivo, 'utf8')); } catch (erro) { console.error(`procedencia:check: ${erro.message}`); process.exitCode = 2; return; }
  const resultado = verificarProcedencia(fonte); console.log(JSON.stringify(resultado, null, 2)); if (!resultado.passa) process.exitCode = 1;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) executarCli();
