/* gerar-mtl.js — serializador do arquivo .mtl que liga cada material à sua imagem. Só escreve a referência: não gera nem grava a imagem. */

/* materiais: lista de { material, arquivo }, já ordenada pelo nome do material. */
export function gerarMtlTexto({ nome, materiais }) {
  const linhas = [
    '# Mecanifica MTL v1.0',
    `# Modelo: ${nome}`,
    '',
  ];
  for (const { material, arquivo } of materiais) {
    linhas.push(`newmtl ${material}`, 'Kd 1 1 1', `map_Kd ${arquivo}`, '');
  }
  return linhas.join('\n');
}
