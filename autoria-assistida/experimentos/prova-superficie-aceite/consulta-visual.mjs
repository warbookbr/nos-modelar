import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const FORMATO_CONSULTA_VISUAL = 'mecanifica.consulta-visual@1';
const papeis = new Set(['modelador', 'critico-visual-independente']);
const propositos = new Set(['modelar', 'comparar', 'revisar']);
const classes = new Set(['alvo', 'modelo', 'comparacao-regional']);
const sha256 = (arquivo) => createHash('sha256').update(readFileSync(arquivo)).digest('hex');

export function validarConsultaVisual(consulta) {
  const erros = [];
  const erro = (texto) => erros.push(texto);
  if (consulta?.formato !== FORMATO_CONSULTA_VISUAL) erro('formato inválido');
  if (!papeis.has(consulta?.papel)) erro('papel inválido');
  if (!propositos.has(consulta?.proposito)) erro('propósito inválido');
  if (typeof consulta?.regiao !== 'string' || !consulta.regiao) erro('região sem identidade');
  if (!Array.isArray(consulta?.entradas) || !consulta.entradas.length) erro('sem imagens isoladas');
  const ids = new Set();
  for (const entrada of consulta?.entradas ?? []) {
    if (!entrada?.id || ids.has(entrada.id)) erro('id de imagem ausente ou repetido');
    ids.add(entrada?.id);
    if (entrada?.regiao !== consulta?.regiao) erro('imagem de outra região');
    if (!classes.has(entrada?.classe)) erro('imagem composta ou classe inválida');
    if (typeof entrada?.vista !== 'string' || !entrada.vista) erro('vista ausente');
    if (typeof entrada?.arquivo !== 'string' || !entrada.arquivo.startsWith('repo://')) erro('arquivo precisa de repo://');
    if (!/^[a-f0-9]{64}$/.test(entrada?.sha256 ?? '')) erro('hash SHA-256 ausente');
  }
  const presentes = new Set((consulta?.entradas ?? []).map((e) => e.classe));
  if (['comparar', 'revisar'].includes(consulta?.proposito) && !['alvo', 'modelo', 'comparacao-regional'].every((c) => presentes.has(c))) erro('comparação ou revisão exige alvo, modelo e comparação regional');
  return { valida: erros.length === 0, erros };
}

export function verificarConsultaNoDisco(consulta, raiz) {
  const resultado = validarConsultaVisual(consulta);
  if (!resultado.valida) return resultado;
  const erros = [];
  for (const entrada of consulta.entradas) {
    const relativo = entrada.arquivo.slice('repo://'.length);
    const arquivo = path.resolve(raiz, relativo);
    if (!arquivo.startsWith(`${path.resolve(raiz)}${path.sep}`)) { erros.push(`fora da raiz: ${entrada.id}`); continue; }
    try { if (sha256(arquivo) !== entrada.sha256) erros.push(`hash divergente: ${entrada.id}`); } catch { erros.push(`arquivo ausente: ${entrada.id}`); }
  }
  return { valida: erros.length === 0, erros };
}

export function hashDoArquivo(arquivo) { return sha256(arquivo); }
