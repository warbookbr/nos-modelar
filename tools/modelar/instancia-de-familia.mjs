/* instancia-de-familia.mjs — uma instância de família procedural por uma chamada, em passos prontos para um esboço 2.0 ou uma receita.
 *
 * FICHA instanciaDeFamilia
 * serve: pôr uma família (roda-pneu, dobradiça, cadeira e as outras de procedural/familias/) numa receita ou num esboço como uma instância, ou várias (as quatro rodas de um carro), por uma chamada: escolhe o perfil, sobrescreve parâmetros, nomeia as partes, soma uma base aos ids, converte de metro para a unidade de saída e põe a instância na pose (posição e giro), com as portas que a família publica.
 * quando: o esboço 2.0 ou a receita precisa de uma peça que a família já sabe fazer. Em vez de copiar a expansão de composição, a conversão de metro para mm, a soma da base aos ids e o renome das partes (o que a roda do carrinho de mão e o rascunho do sedã fizeram, o do sedã quatro vezes), chame esta função uma vez por instância.
 * unidades: a família emite em metro. `unidade: 'm'` entrega os passos como saem (a receita); `unidade: 'mm'` converte as medidas dos passos (o esboço 2.0), e a pose vai na unidade de saída. As portas só saem em `unidade: 'm'`, a do contrato de portas.
 * campos:
 *   familia: o id da família ('roda-pneu') ou a família carregada por definirFamilia.
 *   perfil: o perfil da família (o de familia.json) que preenche os parâmetros; sem ele valem os padrões.
 *   parametros: o que sobrescreve o perfil, na unidade do contrato da família (mm, graus, contagem, proporções); a recusa da família (faixa, restrição) sobe como erro.
 *   nomes: o nome das partes da família: um texto (prefixo, 'dianteiraDir' dá dianteiraDirPneu), uma função (nome) => novoNome, ou um mapa { pneu: 'pneuDianteiro' } (o que falta fica); nome que a família não tem é recusado.
 *   base: o maior id já usado no estado ou na receita; os ids da instância somam a base (padrão 0) e `origem` devolve o maior id depois dela.
 *   unidade: 'm' (padrão) ou 'mm'; em mm só as operações com medida conhecida passam, e a outra é recusada pelo nome.
 *   pose: { posicao: [x, y, z], giro } na unidade de saída; `giro` é { eixo, graus, pivo? } ou uma lista deles, aplicados antes da posição, em torno do pivô (padrão a origem da família); as portas publicadas antes da pose a seguem.
 *   materiais: { usa: '#cor' } troca cada passo `material` por um `pincel` com a cor; sem ele os passos `material` ficam como a família os emite (a receita com MATERIAIS).
 *   liso: { angulo } (ou o número) acrescenta o passo `liso` de cada parte depois da pose.
 *   emitirPartes: false não emite os passos `parte` (o chamador nomeia com o próprio ajudante, a partir de `partes`); padrão true.
 *   portas: true mantém os passos `publicarPorta` (padrão em 'm'); em 'mm' ficam fora.
 *   portaPrefixo: o prefixo do id das portas ('dianteira-dir' dá dianteira-dir-eixo), para várias instâncias na mesma receita.
 *   id: o id da chamada da família (padrão 'instancia').
 *   registro: o registro de criarRegistroDeFamilias (padrão o das famílias do produto).
 * devolve: { passos, partes, portas, origem } com partes [{ nome, nomeNaFamilia, sel }], portas os ids publicados e origem o maior id usado, para a próxima instância.
 * exemplo:
 *   instanciaDeFamilia({ familia: 'roda-pneu', perfil: 'carrinho-de-mao', parametros: { diametroPneu: 340 }, nomes: 'esquerda', base: 20, unidade: 'mm', portas: false, pose: { posicao: [300, 170, 0], giro: { eixo: 'y', graus: 180 } } })
 * peça: procedural/pecas/carrinho-de-mao/partes/roda/receita.js (a roda do carrinho de mão, que copiava estas linhas; a de `montarRoda` sai idêntica por esta chamada).
 * FIM DA FICHA
 *
 * COMO A POSE CHEGA ÀS PORTAS. A interface de uma porta é declarada com números (centro, eixo, plano, padrão de furos) no passo `publicarPorta`,
 * e `rotaciona` e `transladar` não a movem; por isso esta função gira e desloca a interface declarada, com a mesma rotação do núcleo (mão
 * direita, em torno do pivô, o giro antes da posição). O padrão circular de furos, cujo ângulo inicial depende do quadro do plano, sai como a
 * lista dos centros dos furos já na pose. O teste confere o centro de cada porta contra a caixa da parte posta pelo núcleo.
 *
 * O QUE ELA NÃO FAZ. Não escolhe a pose (a posição vem do alinhamento do objeto), não converte parâmetro da família (ele vale na unidade do
 * contrato) e não mede a instância; a medição é da receita ou do esboço que a recebe. */
import { chamar, criarRegistroDeFamilias } from '../../procedural/familias/index.js';
import { expandirChamadasDeComposicao } from '../../procedural/nucleo/composicoes.js';

const erro = (texto) => { throw new Error(`instanciaDeFamilia: ${texto}`); };

/* Os campos de medida (em metro, na saída da família) de cada operação que as famílias emitem; as outras operações com medida não passam em mm. */
const MEDIDAS = {
  lathe: ['perfil', 'em'], cubo: ['larg', 'alt', 'prof', 'em'], chamferBox: ['larg', 'alt', 'prof', 'chanfro', 'em'], cilindro: ['raio', 'altura', 'em'],
  arranja: ['d', 'pivo'], casca: ['espessura'], rotaciona: ['pivo'], transladar: ['d'], espelha: ['pos'],
};
const SEM_MEDIDA = new Set(['subtrair', 'unir', 'parte', 'material', 'solido', 'liso', 'publicarPorta']);

const emMm = (v) => (typeof v === 'number' ? Math.round(v * 1e7) / 1e4 : Array.isArray(v) ? v.map(emMm) : v);
/* os ids da família são locais: no estado inteiro cada um soma a base */
const comBase = (v, base) => {
  if (Array.isArray(v)) return v.map((x) => comBase(x, base));
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, (k === 'origemId' || (k === 'id' && typeof v.op === 'string')) && typeof x === 'number' ? x + base : comBase(x, base)]));
  }
  return v;
};

function renomeador(nomes, existentes) {
  if (nomes === null || nomes === undefined) return (n) => n;
  if (typeof nomes === 'string') {
    if (!/^[a-z][A-Za-z0-9]*$/.test(nomes)) erro(`nomes '${nomes}' não é prefixo em letras e dígitos, começando por minúscula`);
    return (n) => nomes + n[0].toUpperCase() + n.slice(1);
  }
  if (typeof nomes === 'function') return nomes;
  if (typeof nomes !== 'object' || Array.isArray(nomes)) erro('nomes é um prefixo, uma função ou um mapa { nome da família: nome novo }');
  const fora = Object.keys(nomes).filter((n) => !existentes.includes(n));
  if (fora.length) erro(`nomes cita ${fora.map((n) => `'${n}'`).join(', ')}, que a família não nomeia; as partes dela são ${existentes.join(', ')}`);
  return (n) => (Object.hasOwn(nomes, n) ? nomes[n] : n);
}

/* A rotação do núcleo (`giraPonto` de nucleo.js): mão direita, em torno de `pivo`; `v` é um ponto, ou uma direção com o pivô na origem. */
function girar(v, { eixo, graus, pivo = [0, 0, 0] }) {
  const rad = (graus * Math.PI) / 180;
  const c = Math.cos(rad); const s = Math.sin(rad);
  const [dx, dy, dz] = [v[0] - pivo[0], v[1] - pivo[1], v[2] - pivo[2]];
  const [rx, ry, rz] = eixo === 'x' ? [dx, dy * c - dz * s, dy * s + dz * c] : eixo === 'y' ? [dx * c + dz * s, dy, -dx * s + dz * c] : [dx * c - dy * s, dx * s + dy * c, dz];
  return [pivo[0] + rx, pivo[1] + ry, pivo[2] + rz];
}
const limpa = (v) => v.map((n) => (Math.abs(n) < 1e-15 ? 0 : n));

/** Os centros do padrão circular de furos no quadro que o núcleo usa (`u` e `v` do plano, a partir da normal), antes de qualquer pose. */
function centrosDoPadraoCircular({ padrao, plano }) {
  const [nx, ny, nz] = plano.normal;
  const t = Math.hypot(nx, ny, nz);
  const n = [nx / t, ny / t, nz / t];
  const apoio = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const w = cruz(n, apoio);
  const tw = Math.hypot(...w);
  const u = w.map((x) => x / tw);
  const v = cruz(n, u);
  const centro = padrao.centro ?? plano.ponto;
  const inicial = ((padrao.anguloInicial ?? 0) * Math.PI) / 180;
  return Array.from({ length: padrao.quantidade }, (_, k) => {
    const theta = inicial + (2 * Math.PI * k) / padrao.quantidade;
    return centro.map((c, i) => c + (u[i] * Math.cos(theta) + v[i] * Math.sin(theta)) * padrao.raio);
  });
}

/** A interface declarada de uma porta, girada e depois deslocada. Os pontos (`centro`, `ponto`, `centros`, `origem`) giram em torno do pivô e
 *  somam a posição; as direções (`eixo`, `normal`, `referencia`, `direcao`) só giram. */
function posarInterface(interfaceDeclarada, rotacoes, posicao) {
  if (!rotacoes.length && !posicao) return interfaceDeclarada;
  const ponto = (p) => { let q = p; for (const g of rotacoes) q = girar(q, g); return limpa(posicao ? q.map((c, i) => c + posicao[i]) : q); };
  const direcao = (d) => { let q = d; for (const g of rotacoes) q = girar(q, { ...g, pivo: [0, 0, 0] }); return limpa(q); };
  const feita = { ...interfaceDeclarada };
  if (feita.padrao?.tipo === 'circular') {
    feita.centros = centrosDoPadraoCircular({ padrao: feita.padrao, plano: feita.plano ?? { ponto: feita.ponto ?? feita.centro, normal: feita.normal ?? feita.eixo } });
    delete feita.padrao;
  }
  for (const k of ['centro', 'ponto']) if (feita[k]) feita[k] = ponto(feita[k]);
  for (const k of ['eixo', 'normal', 'referencia']) if (feita[k]) feita[k] = direcao(feita[k]);
  if (feita.centros) feita.centros = feita.centros.map(ponto);
  if (feita.plano) feita.plano = { ponto: ponto(feita.plano.ponto), normal: direcao(feita.plano.normal) };
  if (feita.padrao?.tipo === 'linear') feita.padrao = { ...feita.padrao, ...(feita.padrao.origem ? { origem: ponto(feita.padrao.origem) } : {}), direcao: direcao(feita.padrao.direcao) };
  return feita;
}

const giros = (giro) => (giro === undefined || giro === null ? [] : Array.isArray(giro) ? giro : [giro]);

/**
 * Os passos de uma instância da família, na ordem: os da família (ids somados à base, medidas na unidade de saída, partes renomeadas), e por
 * parte o giro, a posição e o `liso`. Ver a FICHA acima para os campos.
 */
export function instanciaDeFamilia({
  familia, perfil = null, parametros = {}, nomes = null, base = 0, unidade = 'm', pose = null, materiais, liso = null,
  emitirPartes = true, portas, portaPrefixo = null, id = 'instancia', registro = criarRegistroDeFamilias(),
} = {}) {
  if (unidade !== 'm' && unidade !== 'mm') erro(`unidade '${unidade}' não é 'm' nem 'mm'`);
  if (!Number.isFinite(base) || base < 0) erro(`base ${base} não é um id (número de 0 para cima)`);
  const comPortas = portas ?? unidade === 'm';
  if (comPortas && unidade === 'mm') erro("as portas são em metro, a unidade do contrato de portas; use unidade 'm' numa receita, ou portas: false num esboço em mm");
  const carregada = typeof familia === 'string' ? registro.obter(familia) : familia;
  if (!carregada?.contrato) erro('familia é o id de uma família registrada ou a família carregada por definirFamilia');
  const chamada = chamar(carregada, id, { ...(perfil ? { perfil } : {}), ...parametros });
  const daFamilia = expandirChamadasDeComposicao(registro.registroComposicoes, [chamada]).passos;
  const existentes = daFamilia.filter(([op]) => op === 'parte').map(([, a]) => a.nome);
  const renomear = renomeador(nomes, existentes);
  const cor = (usa) => {
    const c = materiais?.[usa];
    const valor = typeof c === 'string' ? c : c?.cor;
    if (typeof valor !== 'string') erro(`materiais não tem a cor do material '${usa}' que a família usa`);
    return valor;
  };
  const rotacoes = giros(pose?.giro);
  for (const g of rotacoes) {
    if (!['x', 'y', 'z'].includes(g?.eixo) || !Number.isFinite(g?.graus)) erro(`giro ${JSON.stringify(g)} não é { eixo: 'x' | 'y' | 'z', graus }`);
  }
  if (pose?.posicao !== undefined && !(Array.isArray(pose.posicao) && pose.posicao.length === 3 && pose.posicao.every(Number.isFinite))) erro('pose.posicao é [x, y, z] com três números');
  const passos = [];
  const partes = [];
  const publicadas = [];
  let maior = base;
  for (const passo of daFamilia) {
    const [op, args] = comBase(passo, base);
    if (Number.isFinite(args.origemId)) maior = Math.max(maior, args.origemId);
    if (op === 'publicarPorta') {
      if (!comPortas) continue;
      const nome = args.id ?? args.nome;
      const novo = portaPrefixo ? `${portaPrefixo}-${nome}` : nome;
      publicadas.push(novo);
      passos.push([op, { ...args, ...(args.id !== undefined ? { id: novo } : { nome: novo }), ...(args.interface ? { interface: posarInterface(args.interface, rotacoes, pose?.posicao) } : {}) }]);
      continue;
    }
    if (op === 'material' && materiais) { passos.push(['pincel', { modo: 'face', sel: args.sel, cor: cor(args.usa) }]); continue; }
    if (op === 'parte') {
      const nome = renomear(args.nome);
      if (typeof nome !== 'string' || !nome) erro(`o nome novo da parte '${args.nome}' é '${nome}'; espera-se um texto`);
      partes.push({ nome, nomeNaFamilia: args.nome, sel: args.sel });
      if (emitirPartes) passos.push([op, { ...args, nome }]);
      continue;
    }
    if (unidade === 'mm' && !SEM_MEDIDA.has(op) && !MEDIDAS[op]) {
      erro(`a operação '${op}' da família '${carregada.contrato.id}' não tem as medidas em milímetro conhecidas; use unidade 'm' ou acrescente a operação ao quadro de MEDIDAS`);
    }
    const campos = unidade === 'mm' ? MEDIDAS[op] ?? [] : [];
    passos.push([op, Object.fromEntries(Object.entries(args).map(([k, v]) => [k, campos.includes(k) ? emMm(v) : v]))]);
  }
  const angulo = typeof liso === 'number' ? liso : liso?.angulo;
  for (const { sel } of partes) {
    for (const g of rotacoes) passos.push(['rotaciona', { eixo: g.eixo, graus: g.graus, pivo: g.pivo ?? [0, 0, 0], sel }]);
    if (pose?.posicao) passos.push(['transladar', { d: pose.posicao, sel }]);
    if (angulo !== undefined && angulo !== null) passos.push(['liso', { sel, angulo }]);
  }
  return { passos, partes, portas: publicadas, origem: maior };
}
