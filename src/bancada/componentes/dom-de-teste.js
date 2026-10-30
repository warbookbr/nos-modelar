/* dom-de-teste.js — uma página falsa, mínima, para os testes dos componentes da bancada rodarem no Node sem navegador.
 *
 * Só os testes importam este módulo. Ele cobre o que os componentes usam: elementos com classe, atributos, `dataset`,
 * `hidden`, texto e filhos; `innerHTML` com marcação simples; seletores de classe, de etiqueta e de atributo; eventos
 * com clique e com a fase de captura da janela; e o relógio de quadros, que anda quando o teste manda. */

const VAZIOS = new Set(['input', 'br', 'img']);

function paraDataset(nome) {
  return nome.slice(5).replace(/-([a-z])/g, (_, letra) => letra.toUpperCase());
}

function paraAtributoData(chave) {
  return `data-${chave.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)}`;
}

/* Um seletor simples: etiqueta, classes e um atributo, sem descendência. */
function compilarSeletor(seletor) {
  const partes = { etiqueta: null, classes: [], atributo: null };
  const atributo = seletor.match(/\[([\w-]+)(?:="([^"]*)")?\]/);
  if (atributo) partes.atributo = { nome: atributo[1], valor: atributo[2] ?? null };
  const resto = seletor.replace(/\[[^\]]*\]/g, '');
  const etiqueta = resto.match(/^[a-zA-Z][\w-]*/);
  if (etiqueta) partes.etiqueta = etiqueta[0].toLowerCase();
  for (const [, classe] of resto.matchAll(/\.([\w-]+)/g)) partes.classes.push(classe);
  return (elemento) => {
    if (elemento.nodeType !== 1) return false;
    if (partes.etiqueta && elemento.tagName.toLowerCase() !== partes.etiqueta) return false;
    if (partes.classes.some((classe) => !elemento.classList.contains(classe))) return false;
    if (partes.atributo) {
      if (!elemento.hasAttribute(partes.atributo.nome)) return false;
      if (partes.atributo.valor !== null && elemento.getAttribute(partes.atributo.nome) !== partes.atributo.valor) return false;
    }
    return true;
  };
}

class Ouvintes {
  constructor() { this.lista = []; }

  addEventListener(tipo, funcao, opcoes) {
    const captura = typeof opcoes === 'boolean' ? opcoes : Boolean(opcoes?.capture);
    this.lista.push({ tipo, funcao, captura, uma: Boolean(opcoes?.once) });
  }

  removeEventListener(tipo, funcao, opcoes) {
    const captura = typeof opcoes === 'boolean' ? opcoes : Boolean(opcoes?.capture);
    this.lista = this.lista.filter((o) => !(o.tipo === tipo && o.funcao === funcao && o.captura === captura));
  }

  disparar(evento, { captura }) {
    for (const ouvinte of this.lista.slice()) {
      if (evento.parado) return;
      if (ouvinte.tipo !== evento.type || ouvinte.captura !== captura) continue;
      if (ouvinte.uma) this.removeEventListener(ouvinte.tipo, ouvinte.funcao, ouvinte.captura);
      ouvinte.funcao(evento);
    }
  }
}

export function criarEvento(type, campos = {}) {
  return {
    type,
    defaultPrevented: false,
    parado: false,
    preventDefault() { this.defaultPrevented = true; },
    stopPropagation() { this.propagacaoParada = true; },
    stopImmediatePropagation() { this.parado = true; },
    ...campos,
  };
}

class ElementoFalso extends Ouvintes {
  constructor(documento, etiqueta) {
    super();
    this.nodeType = 1;
    this.ownerDocument = documento;
    this.tagName = etiqueta.toUpperCase();
    this.atributos = new Map();
    this.childNodes = [];
    this.parentNode = null;
    this.hidden = false;
    this.disabled = false;
    this.checked = false;
    this.value = '';
    this.title = '';
    this.type = '';
    this.style = {};
    const elemento = this;
    this.dataset = new Proxy({}, {
      get: (_, chave) => elemento.atributos.get(paraAtributoData(String(chave))),
      set: (_, chave, valor) => { elemento.atributos.set(paraAtributoData(String(chave)), String(valor)); return true; },
      ownKeys: () => [...elemento.atributos.keys()].filter((n) => n.startsWith('data-')).map(paraDataset),
      getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
    });
    this.classList = {
      lista: () => (elemento.atributos.get('class') ?? '').split(/\s+/).filter(Boolean),
      contains: (classe) => elemento.classList.lista().includes(classe),
      add: (...classes) => elemento.setAttribute('class', [...new Set([...elemento.classList.lista(), ...classes])].join(' ')),
      remove: (...classes) => elemento.setAttribute('class', elemento.classList.lista().filter((c) => !classes.includes(c)).join(' ')),
      toggle: (classe, forcar) => {
        const ligar = forcar === undefined ? !elemento.classList.contains(classe) : Boolean(forcar);
        if (ligar) elemento.classList.add(classe); else elemento.classList.remove(classe);
        return ligar;
      },
    };
  }

  get id() { return this.atributos.get('id') ?? ''; }
  set id(valor) { this.atributos.set('id', String(valor)); }
  get className() { return this.atributos.get('class') ?? ''; }
  set className(valor) { this.atributos.set('class', String(valor)); }
  get children() { return this.childNodes.filter((no) => no.nodeType === 1); }
  get isContentEditable() { return false; }

  setAttribute(nome, valor) {
    this.atributos.set(nome, String(valor));
    if (nome === 'hidden') this.hidden = true;
    if (nome === 'disabled') this.disabled = true;
    if (nome === 'title') this.title = String(valor);
    if (nome === 'type') this.type = String(valor);
    if (nome === 'value') this.value = String(valor);
  }

  getAttribute(nome) { return this.atributos.has(nome) ? this.atributos.get(nome) : null; }
  hasAttribute(nome) { return this.atributos.has(nome); }

  get textContent() { return this.childNodes.map((no) => no.textContent).join(''); }
  set textContent(texto) {
    this.replaceChildren();
    if (texto !== '' && texto !== null && texto !== undefined) this.append(String(texto));
  }

  set innerHTML(marcacao) {
    this.replaceChildren();
    const pilha = [this];
    for (const [, fechando, etiqueta, atributos, texto] of String(marcacao).matchAll(/<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g)) {
      const topo = pilha[pilha.length - 1];
      if (texto !== undefined) { topo.append(texto); continue; }
      if (fechando) { pilha.pop(); continue; }
      const novo = this.ownerDocument.createElement(etiqueta);
      for (const [, nome, valor] of atributos.matchAll(/([\w-:]+)(?:="([^"]*)")?/g)) novo.setAttribute(nome, valor ?? '');
      topo.append(novo);
      if (!VAZIOS.has(etiqueta.toLowerCase())) pilha.push(novo);
    }
  }

  append(...nos) {
    for (const no of nos) {
      const filho = typeof no === 'string' ? { nodeType: 3, textContent: no, parentNode: null } : no;
      filho.parentNode?.childNodes?.splice(filho.parentNode.childNodes.indexOf(filho), 1);
      filho.parentNode = this;
      this.childNodes.push(filho);
    }
  }

  appendChild(no) { this.append(no); return no; }

  replaceChildren(...nos) {
    for (const no of this.childNodes) no.parentNode = null;
    this.childNodes = [];
    this.append(...nos);
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.childNodes.splice(this.parentNode.childNodes.indexOf(this), 1);
    this.parentNode = null;
  }

  *descendentes() {
    for (const filho of this.children) {
      yield filho;
      yield* filho.descendentes();
    }
  }

  querySelectorAll(seletor) {
    const casa = compilarSeletor(seletor);
    return [...this.descendentes()].filter(casa);
  }

  querySelector(seletor) { return this.querySelectorAll(seletor)[0] ?? null; }

  closest(seletor) {
    const casa = compilarSeletor(seletor);
    for (let cursor = this; cursor && cursor.nodeType === 1; cursor = cursor.parentNode) if (casa(cursor)) return cursor;
    return null;
  }

  dispatchEvent(evento) {
    evento.target ??= this;
    this.disparar(evento, { captura: false });
    return !evento.defaultPrevented;
  }

  click() { return this.dispatchEvent(criarEvento('click')); }
  focus() { this.ownerDocument.activeElement = this; }
}

/**
 * A página falsa: `documento` com os elementos de `marcacao` dentro do corpo e `janela` com os ouvintes da janela.
 * `janela.teclar(campos)` dispara um keydown com a fase de captura antes da de borbulha, como o navegador faz, e quem
 * para a propagação na captura tira a borbulha da janela; o alvo é o corpo, a menos que `campos.target` diga outro.
 */
export function criarPagina(marcacao = '') {
  const documento = {
    activeElement: null,
    createElement: (etiqueta) => new ElementoFalso(documento, etiqueta),
    getElementById: (id) => [...documento.body.descendentes()].find((el) => el.id === id) ?? null,
    querySelector: (seletor) => documento.body.querySelector(seletor),
    querySelectorAll: (seletor) => documento.body.querySelectorAll(seletor),
  };
  documento.body = new ElementoFalso(documento, 'body');
  documento.body.innerHTML = marcacao;

  const porEtiqueta = (etiqueta) => ({ [Symbol.hasInstance]: (valor) => valor?.tagName === etiqueta });
  const quadros = new Map();
  let proximoQuadro = 0;
  const janela = new Ouvintes();
  Object.assign(janela, {
    HTMLInputElement: porEtiqueta('INPUT'),
    HTMLTextAreaElement: porEtiqueta('TEXTAREA'),
    HTMLSelectElement: porEtiqueta('SELECT'),
    requestAnimationFrame: (funcao) => { proximoQuadro += 1; quadros.set(proximoQuadro, funcao); return proximoQuadro; },
    cancelAnimationFrame: (id) => { quadros.delete(id); },
    /** Roda os quadros pedidos até aqui; os que eles pedirem ficam para a próxima chamada. */
    avancarQuadro() {
      const agora = [...quadros.values()];
      quadros.clear();
      for (const funcao of agora) funcao();
      return agora.length;
    },
    quadrosPendentes: () => quadros.size,
    teclar(campos) {
      const evento = criarEvento('keydown', { target: documento.body, ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, ...campos });
      janela.disparar(evento, { captura: true });
      if (!evento.parado && !evento.propagacaoParada) janela.disparar(evento, { captura: false });
      return evento;
    },
    apontar(alvo) {
      const evento = criarEvento('pointerdown', { target: alvo });
      janela.disparar(evento, { captura: true });
      if (!evento.parado && !evento.propagacaoParada) janela.disparar(evento, { captura: false });
      return evento;
    },
  });
  return { documento, janela, $: (id) => documento.getElementById(id) };
}
