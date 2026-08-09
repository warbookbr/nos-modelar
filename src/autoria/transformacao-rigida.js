/* transformacao-rigida.js — contrato neutro de transformações rígidas. */

const identidade3 = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];

const produto = (a, b) => a.reduce((soma, n, i) => soma + n * b[i], 0);
const transpor = (matriz) => matriz[0].map((_, coluna) => matriz.map((linha) => linha[coluna]));
const multiplicarMatrizes = (a, b) => a.map((linha) => b[0].map((_, coluna) => produto(linha, b.map((outra) => outra[coluna]))));
const aplicarMatriz = (matriz, valor) => matriz.map((linha) => produto(linha, valor));
const somar = (a, b) => a.map((n, i) => n + b[i]);
const subtrair = (a, b) => a.map((n, i) => n - b[i]);
const multiplicar = (a, n) => a.map((x) => x * n);
const comprimento = (a) => Math.sqrt(produto(a, a));
const vetorProduto = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

function falhar(quem, mensagem) {
  throw new Error(`${quem}: ${mensagem}`);
}

function vetor(valor, quem) {
  if (!Array.isArray(valor) || valor.length !== 3 || valor.some((n) => !Number.isFinite(n))) {
    falhar(quem, 'precisa ser vetor finito [x,y,z].');
  }
  return valor.slice();
}

function escalar(valor, quem, { positivo = false } = {}) {
  if (!Number.isFinite(valor) || (positivo && !(valor > 0))) {
    falhar(quem, `precisa ser número finito${positivo ? ' > 0' : ''}.`);
  }
  return Object.is(valor, -0) ? 0 : valor;
}

function matrizDeRotacao(valor, quem) {
  if (valor === undefined) return identidade3();
  if (!Array.isArray(valor) || valor.length !== 3) falhar(quem, 'precisa ser matriz 3×3.');
  const matriz = valor.map((linha, indice) => vetor(linha, `${quem}[${indice}]`));
  for (let i = 0; i < 3; i += 1) {
    if (Math.abs(comprimento(matriz[i]) - 1) > 1e-9) falhar(quem, 'precisa ter linhas unitárias.');
    for (let j = i + 1; j < 3; j += 1) {
      if (Math.abs(produto(matriz[i], matriz[j])) > 1e-9) falhar(quem, 'precisa ter linhas perpendiculares.');
    }
  }
  const determinante = produto(matriz[0], vetorProduto(matriz[1], matriz[2]));
  if (Math.abs(determinante - 1) > 1e-9) falhar(quem, 'precisa ser rotação própria (determinante +1); reflexões não entram neste recorte.');
  return matriz;
}

export function identidadeTransformacaoRigida() {
  return { escala: 1, rotacao: identidade3(), deslocamento: [0, 0, 0] };
}

export function validarTransformacaoRigida(valor, quem, { aceitarEscala = true } = {}) {
  if (valor === undefined) return identidadeTransformacaoRigida();
  if (!valor || typeof valor !== 'object' || Array.isArray(valor)) falhar(quem, 'precisa ser objeto de transformação.');
  const permitidas = new Set([...(aceitarEscala ? ['escala'] : []), 'rotacao', 'deslocamento']);
  const extras = Object.keys(valor).filter((chave) => !permitidas.has(chave));
  if (extras.length) falhar(quem, `tem chave(s) desconhecida(s): ${extras.sort().join(', ')}.`);
  return {
    escala: escalar(valor.escala ?? 1, `${quem}.escala`, { positivo: true }),
    rotacao: matrizDeRotacao(valor.rotacao, `${quem}.rotacao`),
    deslocamento: vetor(valor.deslocamento ?? [0, 0, 0], `${quem}.deslocamento`),
  };
}

export function comporTransformacoesRigidas(referencial, local) {
  return {
    escala: referencial.escala * local.escala,
    rotacao: multiplicarMatrizes(referencial.rotacao, local.rotacao),
    deslocamento: somar(
      multiplicar(aplicarMatriz(referencial.rotacao, local.deslocamento), referencial.escala),
      referencial.deslocamento,
    ),
  };
}

export function localDaTransformacaoRigida(referencial, mundo) {
  const inversa = transpor(referencial.rotacao);
  return {
    escala: mundo.escala / referencial.escala,
    rotacao: multiplicarMatrizes(inversa, mundo.rotacao),
    deslocamento: multiplicar(
      aplicarMatriz(inversa, subtrair(mundo.deslocamento, referencial.deslocamento)),
      1 / referencial.escala,
    ),
  };
}
