/* estado-peca.mjs — executa o envelope completo de uma peça procedural para
   que bancadas distintas não percam MATERIAIS, ESQUELETO ou ALIASES. */

export function executarNucleoDaPeca(nucleo, modulo) {
  return nucleo(
    modulo.PASSOS,
    modulo.PARAMS ?? {},
    modulo.TOPO ?? {},
    modulo.MATERIAIS ?? {},
    modulo.ESQUELETO ?? null,
    modulo.ALIASES ?? [],
  );
}
