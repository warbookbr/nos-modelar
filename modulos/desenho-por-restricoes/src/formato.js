/* formato.js — o formato salvo `mecanifica.desenho@2` (`<vista>.desenho.json`) e a validação que diz, em texto, o que corrigir.
   A versão 2 acrescenta à `barra` e ao `poligono` o campo opcional `raioDoCanto`; a versão 1 segue aceita, sem esse campo, e uma
   descrição gravada em 1 dá o mesmo resultado que dava.

   A IA declara a vista de um objeto sem imagem de referência: pontos nomeados com um chute inicial em milímetro (h para a
   direita, v para cima), referências fixas (um chão, um eixo), partes feitas desses pontos e relações com nome entre eles. A
   identidade de tudo é o nome, nunca a posição numa lista: o relatório cita a relação pelo nome que a IA escreveu, e a ordem
   em que as relações aparecem no arquivo não muda o resultado.

   `validarDescricao` não lança: devolve `{ erros, modelo }`, onde `erros` é uma lista de frases (cada uma com o nome do que
   está errado e como corrigir) e `modelo` é a descrição normalizada que o resto do módulo lê, ou null quando há erro. Puro. */

export const FORMATO_DO_DESENHO = 'mecanifica.desenho@2';
export const FORMATO_DO_DESENHO_ANTERIOR = 'mecanifica.desenho@1';
export const FORMATOS_DO_DESENHO = [FORMATO_DO_DESENHO_ANTERIOR, FORMATO_DO_DESENHO];
export const FORMATO_DOS_CONTORNOS = 'mecanifica.contornos@1';
export const RESOLVEDOR = 'planegcs@1.3.0';
export const VISTAS_DO_DESENHO = ['lateral', 'topo', 'frontal'];
export const LADOS = ['acima', 'abaixo', 'esquerda', 'direita'];
export const TOQUES = ['fora', 'dentro'];
export const FECHAMENTOS = ['corda', 'centro'];
export const TIPOS_DE_RELACAO = ['sobre', 'coincidente', 'distancia', 'raio', 'tangente', 'paralela', 'perpendicular', 'vertical', 'horizontal', 'angulo', 'igual'];

const CHAVES_DA_RAIZ = ['formato', 'objeto', 'vista', 'olhando', 'referencias', 'pontos', 'partes', 'frenteParaFundo', 'relacoes'];
const FORMAS_DE_PARTE = ['circulo', 'barra', 'poligono', 'arco'];
const CHAVES_DA_PARTE = [...FORMAS_DE_PARTE, 'espessura', 'fecha', 'foraDoModelo', 'raioDoCanto'];
const CHAVES_DA_RELACAO = [...TIPOS_DE_RELACAO, 'nome', 'mm', 'graus', 'lado', 'por'];

export class ErroDeDesenho extends Error {
  constructor(mensagem, erros = []) {
    super(mensagem);
    this.name = 'ErroDeDesenho';
    this.erros = erros;
  }
}

const objeto = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const numero = (v) => typeof v === 'number' && Number.isFinite(v);
const texto = (v) => typeof v === 'string' && v.trim() !== '' && v === v.trim();
const q = (s) => JSON.stringify(s);
const porNome = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const lista = (nomes) => nomes.map(q).join(', ');

/* Dois pontos chutados no mesmo lugar não formam reta: o resolvedor não tem direção para começar. */
const mesmoLugar = (a, b) => a[0] === b[0] && a[1] === b[1];

export function validarDescricao(d) {
  const erros = [];
  const falha = (msg) => erros.push(msg);
  if (!objeto(d)) return { erros: ['a descrição deve ser um objeto JSON com "formato", "objeto", "vista", "pontos", "partes" e "relacoes"'], modelo: null };
  for (const k of Object.keys(d)) {
    if (!CHAVES_DA_RAIZ.includes(k)) falha(`campo desconhecido ${q(k)} na raiz; os campos aceitos são ${lista(CHAVES_DA_RAIZ)}. Confira a grafia (sem acento nos nomes dos campos)`);
  }
  if (!FORMATOS_DO_DESENHO.includes(d.formato)) falha(`"formato" deve ser ${q(FORMATO_DO_DESENHO)} (ou ${q(FORMATO_DO_DESENHO_ANTERIOR)}, para uma descrição sem "raioDoCanto") e veio ${q(d.formato)}`);
  if (!texto(d.objeto)) falha('"objeto" deve ser o nome do objeto desenhado, em texto não vazio');
  if (!VISTAS_DO_DESENHO.includes(d.vista)) falha(`"vista" deve ser uma de ${lista(VISTAS_DO_DESENHO)} e veio ${q(d.vista)}`);
  if (d.olhando !== undefined && !texto(d.olhando)) falha('"olhando" é opcional e, se vier, deve ser um texto não vazio dizendo de que lado se olha (por exemplo "do lado esquerdo, roda à esquerda")');

  /* Os três nomes vivem num espaço só, porque as relações citam pontos, referências e partes pelo mesmo campo. */
  const donoDoNome = new Map();
  const registrar = (nome, classe) => {
    if (donoDoNome.has(nome)) falha(`o nome ${q(nome)} aparece em ${donoDoNome.get(nome)} e em ${classe}; as relações citam os três pelo nome, então cada nome vale um só. Renomeie um deles`);
    else donoDoNome.set(nome, classe);
  };

  /* referências */
  const referencias = {};
  if (d.referencias !== undefined && !objeto(d.referencias)) falha('"referencias" deve ser um objeto { nome: { "reta": "horizontal", "v": 0 } } ou { nome: { "reta": "vertical", "h": 0 } }');
  for (const nome of Object.keys(objeto(d.referencias) ? d.referencias : {}).sort(porNome)) {
    const r = d.referencias[nome];
    registrar(nome, 'referencias');
    if (!texto(nome)) falha(`a referência ${q(nome)} tem nome vazio ou com espaço nas pontas`);
    if (!objeto(r)) { falha(`a referência ${q(nome)} deve ser { "reta": "horizontal", "v": <mm> } ou { "reta": "vertical", "h": <mm> }`); continue; }
    if (r.reta === 'horizontal' && numero(r.v) && Object.keys(r).every((k) => k === 'reta' || k === 'v')) referencias[nome] = { reta: 'horizontal', valor: r.v };
    else if (r.reta === 'vertical' && numero(r.h) && Object.keys(r).every((k) => k === 'reta' || k === 'h')) referencias[nome] = { reta: 'vertical', valor: r.h };
    else falha(`a referência ${q(nome)} deve ser { "reta": "horizontal", "v": <mm> } (altura do chão, por exemplo) ou { "reta": "vertical", "h": <mm> } (um eixo), só com esses campos`);
  }

  /* pontos */
  const pontos = {};
  if (!objeto(d.pontos) || Object.keys(d.pontos).length === 0) falha('"pontos" deve ser um objeto { nome: [h, v] } com ao menos um ponto: o chute inicial de cada ponto, em milímetro, h para a direita e v para cima');
  for (const nome of Object.keys(objeto(d.pontos) ? d.pontos : {}).sort(porNome)) {
    const p = d.pontos[nome];
    registrar(nome, 'pontos');
    if (!texto(nome)) falha(`o ponto ${q(nome)} tem nome vazio ou com espaço nas pontas`);
    if (Array.isArray(p) && p.length === 2 && p.every(numero)) pontos[nome] = [p[0], p[1]];
    else falha(`o ponto ${q(nome)} deve ser [h, v], dois números em milímetro (o chute inicial), e veio ${JSON.stringify(p)}`);
  }
  const ehPonto = (n) => typeof n === 'string' && Object.hasOwn(pontos, n);
  const usados = new Set();

  /* partes */
  const partes = {};
  if (!objeto(d.partes) || Object.keys(d.partes).length === 0) falha('"partes" deve ser um objeto { nome: forma } com ao menos uma parte: cada parte tem uma forma de "circulo", "barra", "poligono" ou "arco" sobre os pontos');
  for (const nome of Object.keys(objeto(d.partes) ? d.partes : {}).sort(porNome)) {
    const p = d.partes[nome];
    registrar(nome, 'partes');
    if (!texto(nome)) falha(`a parte ${q(nome)} tem nome vazio ou com espaço nas pontas`);
    if (!objeto(p)) { falha(`a parte ${q(nome)} deve ser um objeto com uma forma ("circulo", "barra", "poligono" ou "arco")`); continue; }
    for (const k of Object.keys(p)) if (!CHAVES_DA_PARTE.includes(k)) falha(`a parte ${q(nome)} tem o campo desconhecido ${q(k)}; os aceitos são ${lista(CHAVES_DA_PARTE)}`);
    const formas = FORMAS_DE_PARTE.filter((f) => p[f] !== undefined);
    if (formas.length !== 1) { falha(`a parte ${q(nome)} deve ter exatamente uma forma entre ${lista(FORMAS_DE_PARTE)}, e tem ${formas.length === 0 ? 'nenhuma' : lista(formas)}`); continue; }
    if (p.foraDoModelo !== undefined && typeof p.foraDoModelo !== 'boolean') falha(`a parte ${q(nome)} declara "foraDoModelo" que não é verdadeiro ou falso`);
    const foraDoModelo = p.foraDoModelo === true;
    const forma = formas[0];
    const nomesDosPontos = (cands, minimo, exato) => {
      const ok = Array.isArray(cands) && cands.every((c) => typeof c === 'string') && (exato ? cands.length === minimo : cands.length >= minimo);
      if (!ok) { falha(`a parte ${q(nome)} deve listar ${exato ? 'exatamente' : 'ao menos'} ${minimo} pontos pelo nome, e veio ${JSON.stringify(cands)}`); return null; }
      const faltam = cands.filter((c) => !ehPonto(c));
      if (faltam.length) { falha(`a parte ${q(nome)} cita ${faltam.length === 1 ? 'o ponto inexistente' : 'os pontos inexistentes'} ${lista(faltam)}; declare ${faltam.length === 1 ? 'o ponto' : 'os pontos'} em "pontos" ou corrija o nome`); return null; }
      if (new Set(cands).size !== cands.length) { falha(`a parte ${q(nome)} repete um ponto na lista ${lista(cands)}; cada ponto entra uma vez`); return null; }
      return cands;
    };
    if (forma !== 'arco' && p.fecha !== undefined) falha(`a parte ${q(nome)} declara "fecha", que só vale para "arco"`);
    if (forma !== 'barra' && p.espessura !== undefined) falha(`a parte ${q(nome)} declara "espessura", que só vale para "barra"`);
    if (p.raioDoCanto !== undefined && forma !== 'barra' && forma !== 'poligono') falha(`a parte ${q(nome)} declara "raioDoCanto", que só vale para "barra" e "poligono" (o círculo e o arco já são curvos)`);
    else if (p.raioDoCanto !== undefined && d.formato === FORMATO_DO_DESENHO_ANTERIOR) falha(`a parte ${q(nome)} declara "raioDoCanto", que existe a partir de ${q(FORMATO_DO_DESENHO)}; troque o "formato" da descrição`);
    const raioValido = (v) => numero(v) && v > 0;
    if (forma === 'poligono') {
      const ps = nomesDosPontos(p.poligono, 3, false);
      let raiosDosCantos = null;
      const rc = p.raioDoCanto;
      if (rc !== undefined && ps) {
        if (raioValido(rc)) raiosDosCantos = ps.map(() => rc);
        else if (objeto(rc) && Object.keys(rc).length > 0 && Object.entries(rc).every(([k, v]) => ps.includes(k) && raioValido(v))) raiosDosCantos = ps.map((x) => rc[x] ?? 0);
        else falha(`o "raioDoCanto" do polígono ${q(nome)} deve ser um número em milímetro maior que zero (todos os cantos) ou { "<ponto do polígono>": <mm>, ... } (só os cantos citados), e veio ${JSON.stringify(rc)}`);
      }
      if (ps && (rc === undefined || raiosDosCantos)) { partes[nome] = { tipo: 'poligono', pontos: ps, foraDoModelo, ...(raiosDosCantos ? { raiosDosCantos } : {}) }; ps.forEach((x) => usados.add(x)); }
    } else if (forma === 'barra') {
      const ps = nomesDosPontos(p.barra, 2, true);
      const rc = p.raioDoCanto;
      if (!numero(p.espessura) || p.espessura <= 0) falha(`a barra ${q(nome)} precisa de "espessura" em milímetro, maior que zero: a largura do retângulo em volta do eixo`);
      else if (rc !== undefined && !raioValido(rc)) falha(`o "raioDoCanto" da barra ${q(nome)} deve ser um número em milímetro maior que zero, e veio ${JSON.stringify(rc)}`);
      else if (rc !== undefined && rc > p.espessura / 2) falha(`o "raioDoCanto" ${rc} da barra ${q(nome)} passa da metade da espessura (${p.espessura / 2} mm); com a metade exata a ponta fica semicircular (uma cápsula), e mais que isso não cabe`);
      else if (ps) {
        if (mesmoLugar(pontos[ps[0]], pontos[ps[1]])) falha(`a barra ${q(nome)} tem os dois pontos ${lista(ps)} no mesmo chute; afaste-os para o resolvedor ter a direção do eixo`);
        else { partes[nome] = { tipo: 'barra', pontos: ps, espessura: p.espessura, foraDoModelo, ...(rc !== undefined ? { raioDoCanto: rc } : {}) }; ps.forEach((x) => usados.add(x)); }
      }
    } else if (forma === 'circulo') {
      const c = p.circulo;
      if (!objeto(c) || !ehPonto(c.centro) || !Object.keys(c).every((k) => k === 'centro' || k === 'chute')) falha(`o círculo ${q(nome)} deve ser { "centro": "<ponto>" }, com "chute" opcional (o raio inicial em milímetro), e o centro deve ser um ponto declarado`);
      else if (c.chute !== undefined && (!numero(c.chute) || c.chute <= 0)) falha(`o "chute" do raio do círculo ${q(nome)} deve ser um número em milímetro maior que zero`);
      else { partes[nome] = { tipo: 'circulo', centro: c.centro, chute: c.chute, foraDoModelo }; usados.add(c.centro); }
    } else {
      const a = p.arco;
      const ok = objeto(a) && ehPonto(a.centro) && ehPonto(a.inicio) && ehPonto(a.fim) && Object.keys(a).every((k) => ['centro', 'inicio', 'fim'].includes(k));
      if (!ok) falha(`o arco ${q(nome)} deve ser { "centro": "<ponto>", "inicio": "<ponto>", "fim": "<ponto>" }, com os três pontos declarados; o arco vai do início ao fim no sentido anti-horário`);
      else if (new Set([a.centro, a.inicio, a.fim]).size !== 3) falha(`o arco ${q(nome)} precisa de três pontos diferentes (centro, início e fim)`);
      else if (p.fecha !== undefined && !FECHAMENTOS.includes(p.fecha)) falha(`o arco ${q(nome)} declara "fecha" ${q(p.fecha)}; use ${lista(FECHAMENTOS)} (a corda fecha o segmento, o centro fecha o setor)`);
      else {
        partes[nome] = { tipo: 'arco', centro: a.centro, inicio: a.inicio, fim: a.fim, fecha: p.fecha ?? 'corda', foraDoModelo };
        [a.centro, a.inicio, a.fim].forEach((x) => usados.add(x));
      }
    }
  }

  /* profundidade */
  let ordem = null;
  if (d.frenteParaFundo !== undefined) {
    const nomes = Object.keys(partes);
    const l = d.frenteParaFundo;
    if (!Array.isArray(l) || !l.every((n) => typeof n === 'string')) falha('"frenteParaFundo" deve ser a lista dos nomes das partes, da que fica à frente para a que fica ao fundo');
    else {
      const desconhecidas = l.filter((n) => !Object.hasOwn(partes, n));
      const repetidas = l.filter((n, i) => l.indexOf(n) !== i);
      const faltam = nomes.filter((n) => !l.includes(n));
      if (desconhecidas.length) falha(`"frenteParaFundo" cita ${lista(desconhecidas)}, que não ${desconhecidas.length === 1 ? 'é uma parte' : 'são partes'}; corrija o nome`);
      else if (repetidas.length) falha(`"frenteParaFundo" repete ${lista([...new Set(repetidas)])}; cada parte entra uma vez`);
      else if (faltam.length) falha(`"frenteParaFundo" não cita ${lista(faltam)}; ou liste todas as partes, ou tire o campo (sem ele, as partes não escondem umas às outras)`);
      else ordem = [...l];
    }
  }

  /* relações */
  const relacoes = [];
  if (!Array.isArray(d.relacoes) || d.relacoes.length === 0) falha('"relacoes" deve ser uma lista com ao menos uma relação { "nome": "...", "<tipo>": ..., ... }; sem relações o desenho não tem medida');
  const nomesDeRelacao = new Set();
  const barra = (n) => partes[n]?.tipo === 'barra';
  const circular = (n) => partes[n]?.tipo === 'circulo' || partes[n]?.tipo === 'arco';
  const classeDe = (n) => (ehPonto(n) ? 'ponto' : Object.hasOwn(referencias, n) ? 'referência' : Object.hasOwn(partes, n) ? `${{ circulo: 'círculo', barra: 'barra', poligono: 'polígono', arco: 'arco' }[partes[n].tipo]}` : 'nome desconhecido');
  (Array.isArray(d.relacoes) ? d.relacoes : []).forEach((r, i) => {
    if (!objeto(r)) { falha(`a relação na posição ${i + 1} deve ser um objeto { "nome": "...", "<tipo>": ... }`); return; }
    const onde = texto(r.nome) ? `a relação ${q(r.nome)}` : `a relação na posição ${i + 1}`;
    if (!texto(r.nome)) { falha(`${onde} não tem "nome": dê a cada relação um nome em texto (é por ele que o relatório diz qual relação está em conflito)`); }
    else if (nomesDeRelacao.has(r.nome)) { falha(`o nome de relação ${q(r.nome)} aparece duas vezes; cada relação tem um nome só, para o relatório saber qual delas conflita`); return; }
    else nomesDeRelacao.add(r.nome);
    for (const k of Object.keys(r)) if (!CHAVES_DA_RELACAO.includes(k)) falha(`${onde} tem o campo desconhecido ${q(k)}; os aceitos são ${lista(CHAVES_DA_RELACAO)}`);
    const tipos = TIPOS_DE_RELACAO.filter((t) => r[t] !== undefined);
    if (tipos.length !== 1) { falha(`${onde} deve ter exatamente um tipo entre ${lista(TIPOS_DE_RELACAO)}, e tem ${tipos.length === 0 ? 'nenhum' : lista(tipos)}`); return; }
    const tipo = tipos[0];
    const arg = r[tipo];
    const mm = r.mm; const graus = r.graus; const lado = r.lado; const por = r.por;
    const lerPonto = (n, papel) => {
      if (ehPonto(n)) { usados.add(n); return n; }
      falha(`${onde} (${tipo}) espera ${papel} um ponto declarado em "pontos", e ${q(n)} é ${classeDe(n) === 'nome desconhecido' ? 'um nome desconhecido' : `${classeDe(n)}, não um ponto`}`);
      return null;
    };
    /* Uma reta é uma referência, uma barra (o eixo dela) ou dois pontos [P, Q], na ordem que dá o sentido da reta. */
    const lerLinha = (a, papel) => {
      if (typeof a === 'string') {
        if (Object.hasOwn(referencias, a)) return { classe: 'linha', via: 'referencia', nome: a };
        if (barra(a)) return { classe: 'linha', via: 'barra', nome: a };
        falha(`${onde} (${tipo}) espera ${papel} uma reta, e ${q(a)} é ${classeDe(a)}; uma reta é uma referência, uma barra ou dois pontos ["P", "Q"]${partes[a]?.tipo === 'poligono' ? ` (para a aresta de ${q(a)} cite os dois pontos dela)` : ''}`);
        return null;
      }
      if (Array.isArray(a) && a.length === 2 && a.every((x) => typeof x === 'string')) {
        if (a[0] === a[1]) { falha(`${onde} (${tipo}) cita a reta [${lista(a)}] com o mesmo ponto nas duas pontas`); return null; }
        const ps = a.map((x) => lerPonto(x, papel));
        if (ps.some((x) => x === null)) return null;
        if (mesmoLugar(pontos[a[0]], pontos[a[1]])) { falha(`${onde} (${tipo}) cita a reta [${lista(a)}] com os dois pontos no mesmo chute; afaste-os`); return null; }
        return { classe: 'linha', via: 'par', pontos: [a[0], a[1]] };
      }
      falha(`${onde} (${tipo}) espera ${papel} uma reta: o nome de uma referência ou de uma barra, ou dois pontos ["P", "Q"]; veio ${JSON.stringify(a)}`);
      return null;
    };
    const lerCircular = (a, papel, soCirculo = false) => {
      if (typeof a === 'string' && (soCirculo ? partes[a]?.tipo === 'circulo' : circular(a))) return { classe: 'circular', parte: a, tipo: partes[a].tipo };
      falha(`${onde} (${tipo}) espera ${papel} ${soCirculo ? 'um círculo' : 'um círculo ou um arco'}, e ${q(a)} é ${classeDe(a)}`);
      return null;
    };
    const par = (n) => {
      if (Array.isArray(arg) && arg.length === n) return true;
      falha(`${onde} (${tipo}) deve listar ${n} itens, e veio ${JSON.stringify(arg)}`);
      return false;
    };
    const proibir = (campos) => campos.forEach(([nomeDoCampo, valor]) => { if (valor !== undefined) falha(`${onde} (${tipo}) declara "${nomeDoCampo}", que não vale para este tipo de relação`); });
    const exigirMm = () => {
      if (!numero(mm) || mm <= 0) { falha(`${onde} (${tipo}) precisa de "mm", a medida em milímetro, maior que zero${tipo === 'distancia' ? ' (para distância zero use "sobre" ou "coincidente")' : ''}`); return false; }
      return true;
    };
    const exigirLado = (alvoLinha) => {
      if (!LADOS.includes(lado)) { falha(`${onde} (${tipo}) precisa de "lado", porque a distância de um ponto a uma reta não tem sinal e o resolvedor poderia escolher o lado errado: diga de que lado ${tipo === 'tangente' ? 'da reta o círculo fica' : 'da reta o ponto fica'}, com ${lista(LADOS)} (acima é o lado de v maior, direita o de h maior)`); return false; }
      if (alvoLinha?.via === 'referencia') {
        const ref = referencias[alvoLinha.nome];
        if (ref.reta === 'horizontal' && (lado === 'esquerda' || lado === 'direita')) { falha(`${onde} (${tipo}) usa o lado ${q(lado)} com a referência horizontal ${q(alvoLinha.nome)}; uma reta horizontal tem acima e abaixo`); return false; }
        if (ref.reta === 'vertical' && (lado === 'acima' || lado === 'abaixo')) { falha(`${onde} (${tipo}) usa o lado ${q(lado)} com a referência vertical ${q(alvoLinha.nome)}; uma reta vertical tem esquerda e direita`); return false; }
      }
      return true;
    };
    /* `posicao` só desempata qual de duas relações equivalentes o relatório chama de repetida (a escrita por último); não é identidade. */
    const base = { nome: r.nome, tipo, posicao: i };
    const guardar = (extra) => relacoes.push({ ...base, ...extra });
    if (tipo === 'sobre') {
      proibir([['mm', mm], ['graus', graus], ['lado', lado], ['por', por]]);
      if (!par(2)) return;
      const ponto = lerPonto(arg[0], 'no primeiro lugar');
      const alvo = typeof arg[1] === 'string' && circular(arg[1]) ? lerCircular(arg[1], 'no segundo lugar') : lerLinha(arg[1], 'no segundo lugar');
      if (ponto && alvo) guardar({ ponto, alvo });
    } else if (tipo === 'coincidente') {
      proibir([['mm', mm], ['graus', graus], ['lado', lado], ['por', por]]);
      if (!par(2)) return;
      const a = lerPonto(arg[0], 'no primeiro lugar'); const b = lerPonto(arg[1], 'no segundo lugar');
      if (a && b && a === b) falha(`${onde} (coincidente) cita o ponto ${q(a)} duas vezes`);
      else if (a && b) guardar({ a, b });
    } else if (tipo === 'distancia') {
      proibir([['graus', graus], ['por', por]]);
      if (!par(2)) return;
      const a = lerPonto(arg[0], 'no primeiro lugar');
      const ok = exigirMm();
      if (typeof arg[1] === 'string' && ehPonto(arg[1])) {
        proibir([['lado', lado]]);
        const b = lerPonto(arg[1], 'no segundo lugar');
        if (a && b && a === b) falha(`${onde} (distancia) cita o ponto ${q(a)} duas vezes`);
        else if (a && b && ok) guardar({ a, b, mm });
      } else {
        const linha = lerLinha(arg[1], 'no segundo lugar');
        if (linha && !exigirLado(linha)) return;
        if (linha?.via === 'par' && linha.pontos.includes(a)) falha(`${onde} (distancia) mede o ponto ${q(a)} até uma reta que passa por ele mesmo; use outro ponto ou outra reta`);
        else if (a && linha && ok) guardar({ a, linha, mm, lado });
      }
    } else if (tipo === 'raio') {
      proibir([['graus', graus], ['lado', lado], ['por', por]]);
      const c = lerCircular(arg, 'no lugar do alvo');
      if (c && exigirMm()) guardar({ alvo: c, mm });
    } else if (tipo === 'tangente') {
      proibir([['mm', mm], ['graus', graus]]);
      if (!par(2)) return;
      const c = lerCircular(arg[0], 'no primeiro lugar', true);
      if (typeof arg[1] === 'string' && partes[arg[1]]?.tipo === 'circulo') {
        proibir([['lado', lado]]);
        const c2 = lerCircular(arg[1], 'no segundo lugar', true);
        if (!TOQUES.includes(por)) falha(`${onde} (tangente entre círculos) precisa de "por", porque dois círculos podem se tocar de dois jeitos: ${lista(TOQUES)} ("fora" quando um fica ao lado do outro, "dentro" quando um fica dentro do outro)`);
        else if (c && c2 && c.parte === c2.parte) falha(`${onde} (tangente) cita o círculo ${q(c.parte)} duas vezes`);
        else if (c && c2) guardar({ a: c, b: c2, por });
      } else {
        proibir([['por', por]]);
        const linha = lerLinha(arg[1], 'no segundo lugar');
        if (linha && !exigirLado(linha)) return;
        if (c && linha) guardar({ a: c, linha, lado });
      }
    } else if (tipo === 'paralela' || tipo === 'perpendicular') {
      proibir([['mm', mm], ['graus', graus], ['lado', lado], ['por', por]]);
      if (!par(2)) return;
      const a = lerLinha(arg[0], 'no primeiro lugar'); const b = lerLinha(arg[1], 'no segundo lugar');
      if (a && b) guardar({ a, b });
    } else if (tipo === 'vertical' || tipo === 'horizontal') {
      proibir([['mm', mm], ['graus', graus], ['lado', lado], ['por', por]]);
      if (!par(2)) return;
      const a = lerPonto(arg[0], 'no primeiro lugar'); const b = lerPonto(arg[1], 'no segundo lugar');
      if (a && b && a === b) falha(`${onde} (${tipo}) cita o ponto ${q(a)} duas vezes`);
      else if (a && b) guardar({ a, b });
    } else if (tipo === 'angulo') {
      proibir([['mm', mm], ['lado', lado], ['por', por]]);
      if (!par(2)) return;
      const a = lerLinha(arg[0], 'no primeiro lugar'); const b = lerLinha(arg[1], 'no segundo lugar');
      if (!numero(graus) || graus <= -360 || graus >= 360) falha(`${onde} (angulo) precisa de "graus", o ângulo da primeira reta para a segunda no sentido anti-horário, entre -360 e 360 (exclusive)`);
      else if (a && b) guardar({ a, b, graus });
    } else if (tipo === 'igual') {
      proibir([['mm', mm], ['graus', graus], ['lado', lado], ['por', por]]);
      if (!par(2)) return;
      if (typeof arg[0] === 'string' && circular(arg[0])) {
        const a = lerCircular(arg[0], 'no primeiro lugar'); const b = lerCircular(arg[1], 'no segundo lugar');
        if (a && b && a.parte === b.parte) falha(`${onde} (igual) cita ${q(a.parte)} duas vezes`);
        else if (a && b) guardar({ a, b });
      } else {
        const a = lerLinha(arg[0], 'no primeiro lugar'); const b = lerLinha(arg[1], 'no segundo lugar');
        if (a && b) guardar({ a, b });
      }
    }
  });

  /* O raio de um círculo precisa de um valor: por uma relação "raio" ou pelo chute. */
  for (const [nome, p] of Object.entries(partes)) {
    if (p.tipo !== 'circulo') continue;
    const comRaio = relacoes.some((r) => r.tipo === 'raio' && r.alvo.parte === nome);
    if (!comRaio && p.chute === undefined) falha(`o círculo ${q(nome)} não tem raio: acrescente uma relação { "nome": "raio de ${nome}", "raio": ${q(nome)}, "mm": <valor> } (ou, para deixar o raio solto de propósito, "chute" no círculo)`);
  }
  for (const nome of Object.keys(pontos)) {
    if (!usados.has(nome)) falha(`o ponto ${q(nome)} não é usado por nenhuma parte nem relação; apague-o ou use-o (um ponto sem relação ficaria solto no desenho)`);
  }

  if (erros.length) return { erros, modelo: null };
  const modelo = {
    objeto: d.objeto, vista: d.vista, olhando: d.olhando ?? null,
    referencias, pontos, partes, ordem,
    relacoes: relacoes.sort((a, b) => porNome(a.nome, b.nome)),
  };
  return { erros, modelo };
}

/* Valida e devolve o modelo, ou lança com todas as frases de correção. */
export function modeloDaDescricao(descricao) {
  const { erros, modelo } = validarDescricao(descricao);
  if (erros.length) throw new ErroDeDesenho(`a descrição do desenho tem ${erros.length} erro(s):\n${erros.map((e) => `- ${e}`).join('\n')}`, erros);
  return modelo;
}
