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

/* O PLANO NASCE ATRÁS DA PEÇA, fora da caixa dela. O `lado` é a vista lateral
   que a imagem mostra, e a câmera dessa vista olha a peça do mesmo lado: a
   vista direita vem de +X, e a isométrica também. O plano ficava em +X, entre
   essas duas câmeras e a lateral, e cobria a peça na vista em que a bancada
   abre. Agora ele fica do lado oposto ao da câmera da vista que a imagem
   mostra, encostado na caixa por uma folga, e a peça fica à frente dele, que é
   o lugar de um plano de fundo. */
export function criarAlinhamentoInicial({ caixa, larguraImagem, alturaImagem, lado = 'direita' }) {
  const altura = Math.max(0.001, numero(caixa?.max?.y, 0) - numero(caixa?.min?.y, 0));
  const proporcao = Math.max(0.001, numero(larguraImagem, 1) / Math.max(1, numero(alturaImagem, 1)));
  const largura = altura * proporcao;
  const ladoSeguro = LADOS.has(lado) ? lado : 'direita';
  const minX = numero(caixa?.min?.x, 0);
  const maxX = numero(caixa?.max?.x, 0);
  const margem = Math.max(0.02, (maxX - minX) * 0.05);
  return {
    x: ladoSeguro === 'esquerda' ? maxX + margem : minX - margem,
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

/* A IMAGEM DE REFERÊNCIA É DA PEÇA. A chave em que a bancada guarda a imagem e
   o alinhamento dela era o `id` do alvo da sessão, e toda peça aberta pela
   janela `Abrir` chega com o mesmo alvo, `sessao-ativa`: a imagem guardada de
   uma peça voltava sobre a seguinte, no lugar medido para a outra caixa, e a
   prancha da peça de prova aparecia atravessando o furgão. A chave agora é o
   nome da peça, e o alvo só vale quando a peça não tem nome; trocar de chave
   tira da cena a imagem da peça anterior, para a imagem da nova (a guardada ou
   a declarada na receita) entrar no lugar dela. */
export function imagemAoTrocarDePeca({ chaveAnterior = null, peca = null, alvo = null, imagemNaCena = false } = {}) {
  const texto = (valor) => (typeof valor === 'string' && valor.trim() ? valor.trim() : null);
  const chave = texto(peca) ?? texto(alvo) ?? chaveAnterior ?? null;
  return { chave, tirarDaCena: Boolean(imagemNaCena) && chave !== chaveAnterior };
}
