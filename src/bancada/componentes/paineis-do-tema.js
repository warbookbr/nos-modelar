/* paineis-do-tema.js — os painéis que o tema deixa abrir sobre a cena (a árvore das partes e o painel da direita), quem os abre e fecha, e a regra que recolhe um quando o outro abre.
 *
 * Lê do estado central `tema` e `paineis` e escreve `paineis`. Um tema que declara `paineis` (`temas/temas.js`) tem a
 * cena na tela inteira e os painéis flutuando por cima, abertos ou não pelo atributo `data-aberto`; o que não declara
 * (a arrumação clássica) deixa os painéis fixos e o recolher de sempre, e este componente não mexe neles.
 *
 * A regra é a do gate 6 do plano: a cena fica com ao menos 70% da largura da janela. Abrir um painel que, somado aos
 * abertos, passaria disso recolhe os outros; na largura de hoje do Foco (240 e 272 pixels, mais as margens) os dois só
 * cabem juntos a partir de 1920 pixels, e abaixo disso abrir um recolhe o outro. Encolher a janela aplica a mesma regra,
 * e fica aberto o último que a pessoa abriu.
 *
 * Um painel fixo, que não flutua sobre a cena e sim a empurra (o tema Bancada), declara `margem: 0`; sem `margem` vale a
 * do painel flutuante. Os painéis que o tema abre ao nascer, na subida e na troca de tema, passam pela mesma regra: ficam
 * abertos, na ordem da declaração, os que cabem, e o resto nasce recolhido. */
import { temaPorId } from '../temas/temas.js';

/** A margem de cada lado de um painel flutuante, em pixels (`--e4`). */
export const MARGEM_DO_PAINEL = 16;
export const FRACAO_MINIMA_DA_CENA = 0.7;

/** A largura que os painéis `abertos` tiram da cena, com a margem dos dois lados de cada um. */
export function larguraOcupada(abertos, paineis) {
  return Object.entries(abertos)
    .filter(([nome, aberto]) => aberto && paineis[nome])
    .reduce((soma, [nome]) => soma + paineis[nome].largura + 2 * (paineis[nome].margem ?? MARGEM_DO_PAINEL), 0);
}

/**
 * Os painéis `abertos` que ficam abertos numa janela de `larguraDaJanela`: na ordem da declaração do tema, cada um fica
 * se a cena ainda tem a fração mínima da largura com ele e com os que já ficaram.
 */
export function paineisQueCabem({ abertos, paineis, larguraDaJanela, fracaoMinima = FRACAO_MINIMA_DA_CENA }) {
  const ficam = Object.fromEntries(Object.keys(abertos).map((nome) => [nome, false]));
  for (const nome of Object.keys(paineis)) {
    if (!abertos[nome]) continue;
    const comEle = { ...ficam, [nome]: true };
    if (larguraDaJanela - larguraOcupada(comEle, paineis) >= fracaoMinima * larguraDaJanela) ficam[nome] = true;
  }
  return ficam;
}

/**
 * Os painéis abertos depois de abrir `abrir` numa janela de `larguraDaJanela`: os outros continuam abertos se a cena
 * ainda fica com a fração mínima da largura, e recolhem se não.
 */
export function paineisAoAbrir({ abertos, abrir, paineis, larguraDaJanela, fracaoMinima = FRACAO_MINIMA_DA_CENA }) {
  const proximos = { ...abertos, [abrir]: true };
  if (larguraDaJanela - larguraOcupada(proximos, paineis) >= fracaoMinima * larguraDaJanela) return proximos;
  for (const nome of Object.keys(proximos)) if (nome !== abrir) proximos[nome] = false;
  return proximos;
}

export function montarPaineisDoTema({ elementos, estado, abrirAba = () => {}, janela = globalThis }) {
  const { paineis: elementosDosPaineis = {}, abridores = [], fechadores = [] } = elementos;
  let ultimoAberto = null;

  const declarados = () => temaPorId(estado.obter('tema')).paineis;
  const larguraDaJanela = () => janela.innerWidth ?? 1400;

  /** Os painéis que o tema abre ao nascer e que cabem na janela de agora. */
  function paineisAoNascer(paineis) {
    if (!paineis) return {};
    const abertos = Object.fromEntries(Object.entries(paineis).map(([nome, painel]) => [nome, painel.abertoAoNascer]));
    return paineisQueCabem({ abertos, paineis, larguraDaJanela: larguraDaJanela() });
  }

  function refletir({ tema, paineis: abertos }) {
    const doTema = temaPorId(tema).paineis;
    for (const [nome, painel] of Object.entries(elementosDosPaineis)) {
      if (!painel) continue;
      if (!doTema?.[nome]) painel.removeAttribute('data-aberto');
      else painel.dataset.aberto = String(Boolean(abertos[nome]));
    }
    for (const abridor of abridores) {
      abridor.setAttribute('aria-expanded', String(Boolean(abertos[abridor.dataset.abrirPainel])));
    }
  }

  function abrir(nome, { aba } = {}) {
    const paineis = declarados();
    if (!paineis?.[nome]) return false;
    ultimoAberto = nome;
    estado.definir({
      paineis: paineisAoAbrir({ abertos: estado.obter('paineis'), abrir: nome, paineis, larguraDaJanela: larguraDaJanela() }),
    });
    if (aba) abrirAba(aba);
    return true;
  }

  function fechar(nome) {
    estado.definir({ paineis: { ...estado.obter('paineis'), [nome]: false } });
  }

  function alternar(nome) {
    if (estado.obter('paineis')[nome]) fechar(nome);
    else abrir(nome);
  }

  estado.assinar(['tema', 'paineis'], (valores, mudadas) => {
    if (mudadas.includes('tema')) {
      /* Trocar de tema devolve os painéis ao que o tema novo declara ao nascer. */
      const iniciais = paineisAoNascer(temaPorId(valores.tema).paineis);
      if (JSON.stringify(iniciais) !== JSON.stringify(valores.paineis)) {
        estado.definir({ paineis: iniciais });
        return;
      }
    }
    refletir(valores);
  });

  for (const abridor of abridores) abridor.addEventListener('click', () => alternar(abridor.dataset.abrirPainel));
  for (const fechador of fechadores) fechador.addEventListener('click', () => fechar(fechador.dataset.fecharPainel));

  janela.addEventListener('resize', () => {
    const paineis = declarados();
    if (!paineis) return;
    const abertos = estado.obter('paineis');
    const largura = larguraDaJanela();
    if (largura - larguraOcupada(abertos, paineis) >= FRACAO_MINIMA_DA_CENA * largura) return;
    /* Fica o último que a pessoa abriu; se ela não abriu nenhum, ficam os que o tema abriu ao nascer e ainda cabem. */
    if (abertos[ultimoAberto]) {
      estado.definir({ paineis: Object.fromEntries(Object.keys(abertos).map((nome) => [nome, nome === ultimoAberto])) });
      return;
    }
    estado.definir({ paineis: paineisQueCabem({ abertos, paineis, larguraDaJanela: largura }) });
  });

  estado.definir({ paineis: paineisAoNascer(declarados()) });
  refletir(estado.ler());

  return { abrir, fechar, alternar };
}
