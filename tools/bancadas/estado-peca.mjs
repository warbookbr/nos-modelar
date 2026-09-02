/* estado-peca.mjs — executa o envelope completo de uma peça procedural para
   que bancadas distintas não percam MATERIAIS, ESQUELETO ou ALIASES. */

export function extrairReceita(modulo) {
  if (!modulo || typeof modulo !== 'object') return null;
  if (Array.isArray(modulo.PASSOS)) return modulo;
  if (modulo.default && Array.isArray(modulo.default.PASSOS)) return modulo.default;
  return Object.values(modulo).find((v) => v && typeof v === 'object' && Array.isArray(v.PASSOS)) ?? null;
}

export function executarNucleoDaPeca(nucleo, modulo) {
  const receita = extrairReceita(modulo) ?? modulo;
  return nucleo(
    receita.PASSOS,
    receita.PARAMS ?? {},
    receita.TOPO ?? {},
    receita.MATERIAIS ?? {},
    receita.ESQUELETO ?? null,
    receita.ALIASES ?? [],
  );
}

