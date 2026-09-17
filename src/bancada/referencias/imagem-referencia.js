/* imagem-referencia.js — forma validada e alinhamento lateral de referência visual. */

const FONTES = new Set(['upload', 'url', 'sessao']);
const LADOS = new Set(['esquerda', 'direita']);

function numero(valor, padrao) {
  return Number.isFinite(Number(valor)) ? Number(valor) : padrao;
}

function limitar(valor, minimo, maximo) {
  return Math.min(maximo, Math.max(minimo, valor));
}

/* O GIRO É GUARDADO EM GRAU e dobrado para o intervalo de meia volta para cada
   lado. Grau porque é a unidade em que quem alinha uma foto pensa, e dobrado
   porque somar voltas inteiras não muda a imagem na tela: sem isso o valor
   guardado cresceria sem limite e o controle deslizante ficaria fora da escala
   que ele mesmo declara. */
function emGraus(valor) {
  const bruto = numero(valor, 0);
  const dobrado = ((bruto + 180) % 360 + 360) % 360 - 180;
  return Object.is(dobrado, -0) ? 0 : dobrado;
}

export function normalizarImagemReferencia(entrada) {
  if (!entrada || typeof entrada !== 'object' || !FONTES.has(entrada.fonte)) return null;
  const url = typeof entrada.url === 'string' ? entrada.url.trim() : '';
  const blob = entrada.blob ?? null;
  if (!url && !blob) return null;

  const alinhamentoEntrada = entrada.alinhamento ?? {};
  return {
    id: typeof entrada.id === 'string' && entrada.id.trim() ? entrada.id.trim() : 'imagem-referencia',
    fonte: entrada.fonte,
    ...(url ? { url } : {}),
    ...(blob ? { blob } : {}),
    ...(typeof entrada.mime === 'string' ? { mime: entrada.mime } : {}),
    rotulo: typeof entrada.rotulo === 'string' && entrada.rotulo.trim() ? entrada.rotulo.trim() : 'Imagem de referência',
    alinhamento: {
      x: numero(alinhamentoEntrada.x, 0),
      y: numero(alinhamentoEntrada.y, 0),
      z: numero(alinhamentoEntrada.z, 0),
      largura: Math.max(0.001, numero(alinhamentoEntrada.largura, 1)),
      altura: Math.max(0.001, numero(alinhamentoEntrada.altura, 1)),
      escala: Math.max(0.001, numero(alinhamentoEntrada.escala, 1)),
      opacidade: limitar(numero(alinhamentoEntrada.opacidade ?? entrada.opacidade, 1), 0, 1),
      giro: emGraus(alinhamentoEntrada.giro),
      lado: LADOS.has(alinhamentoEntrada.lado) ? alinhamentoEntrada.lado : 'direita',
    },
  };
}

export function criarAlinhamentoInicial({ caixa, larguraImagem, alturaImagem, lado = 'direita' }) {
  const altura = Math.max(0.001, numero(caixa?.max?.y, 0) - numero(caixa?.min?.y, 0));
  const proporcao = Math.max(0.001, numero(larguraImagem, 1) / Math.max(1, numero(alturaImagem, 1)));
  const largura = altura * proporcao;
  const ladoSeguro = LADOS.has(lado) ? lado : 'direita';
  const minX = numero(caixa?.min?.x, 0);
  const maxX = numero(caixa?.max?.x, 0);
  const margem = Math.max(0.02, (maxX - minX) * 0.05);
  return {
    x: ladoSeguro === 'esquerda' ? minX - margem : maxX + margem,
    y: (numero(caixa?.min?.y, 0) + numero(caixa?.max?.y, 0)) / 2,
    z: (numero(caixa?.min?.z, 0) + numero(caixa?.max?.z, 0)) / 2,
    largura,
    altura,
    escala: 1,
    opacidade: 1,
    giro: 0,
    lado: ladoSeguro,
  };
}
