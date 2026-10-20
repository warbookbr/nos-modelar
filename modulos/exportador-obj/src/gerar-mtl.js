/* gerar-mtl.js — serializador do arquivo .mtl que liga cada material à sua imagem. Só escreve a referência: não gera nem grava a imagem. */

const num = (v) => String(Number(v.toFixed(4)));

/* brilho (0 a 1, opcional) vira o expoente especular `Ns` (brilho x 200) e o `Ks` cinza (brilho x 0,5); sem brilho a saída é a de antes. */
/* materiais: lista de { material, arquivo }, já ordenada pelo nome do material. */
export function gerarMtlTexto({ nome, materiais }) {
  const linhas = [
    '# Mecanifica MTL v1.0',
    `# Modelo: ${nome}`,
    '',
  ];
  for (const { material, arquivo, brilho } of materiais) {
    linhas.push(`newmtl ${material}`, 'Kd 1 1 1');
    if (brilho !== undefined) {
      const ks = num(brilho * 0.5);
      linhas.push(`Ns ${num(brilho * 200)}`, `Ks ${ks} ${ks} ${ks}`);
    }
    linhas.push(`map_Kd ${arquivo}`, '');
  }
  return linhas.join('\n');
}
