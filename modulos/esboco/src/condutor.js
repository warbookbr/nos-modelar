/* O Condutor: a máquina de estados do fluxo de um esboço grande. Estágios: Maquete (formas primitivas com dimensões e
   posições certas), Conferência da maquete, Plano de detalhe (agrupa em Unidades de detalhe as formas de acoplamento
   apertado e ordena por dependência), Detalhe por unidade e Montagem. O estado é um objeto simples, gravado pela linha de
   comando em `<arquivo>.condutor.json`, e cada função devolve um estado novo. O Portão de estágio é o que decide se o
   estágio seguinte abre: o gate de contato aprovado, as medidas do plano dentro da tolerância e o contrato de relações
   cumprido (mais o que o estágio pede). O nível de detalhe do plano (`plano.nivel`) liga ou desliga estágios. A cada 25%
   do custo estimado (o número de formas das unidades) o Marco registra "chamar o crítico" no estado; o despacho do
   crítico é da skill. Puro e determinístico: sem data nem sorteio, e sem ler nem gravar arquivo. */
import { ErroDeEsboco } from './index.js';
import { expandirEsboco } from './expandir.js';
import { herdarDoEspelho, lerContato } from './contato.js';
import { medirEsboco } from './descrever.js';
import { lerPlano } from './plano.js';
import { quisDizer } from './parecido.js';

export const ESTAGIOS = {
  maquete: 'Maquete',
  'conferencia-da-maquete': 'Conferência da maquete',
  'plano-de-detalhe': 'Plano de detalhe',
  'detalhe-por-unidade': 'Detalhe por unidade',
  montagem: 'Montagem',
};
export const ORDEM_DOS_ESTAGIOS = Object.keys(ESTAGIOS);
/* O nível de detalhe liga os estágios: um esboço rápido para na Maquete, um médio confere a maquete, e só o detalhado
   agrupa em unidades, detalha cada uma e monta. */
export const ESTAGIOS_POR_NIVEL = {
  esquematico: ['maquete'],
  medio: ['maquete', 'conferencia-da-maquete'],
  detalhado: ORDEM_DOS_ESTAGIOS,
};
export const NIVEL_PADRAO = 'medio';
/* O que cada nível pede do plano antes de o Portão passar. */
export const EXIGENCIAS_POR_NIVEL = {
  esquematico: { medidas: 1, relacoes: 0 },
  medio: { medidas: 3, relacoes: 1 },
  detalhado: { medidas: 5, relacoes: 1 },
};
export const LIMIARES_DO_MARCO = [25, 50, 75, 100];
export const MINIMO_DO_MOTIVO = 15;
export const CONCLUIDO = 'concluido';

export const nomeDoEstagio = (id) => (id === CONCLUIDO ? 'Concluído' : ESTAGIOS[id]);
const clone = (v) => JSON.parse(JSON.stringify(v));
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };

/* Referências (ids de forma) que uma forma cita para se posicionar. `ids` é o conjunto de ids do esboço. */
function referenciasDaForma(f, ids) {
  const brutas = [];
  const ponto = (v) => {
    if (typeof v === 'string') brutas.push(v);
    else if (v && typeof v === 'object' && Array.isArray(v.entre)) v.entre.forEach(ponto);
    else if (v && typeof v === 'object' && typeof v.ancora === 'string') brutas.push(v.ancora);
    else if (v && typeof v === 'object' && v.ponto !== undefined && v.nome !== undefined) ponto(v.ponto);
  };
  if (typeof f.sobre === 'string') brutas.push(f.sobre);
  if (Array.isArray(f.ponta)) brutas.push(f.ponta[0]); else if (f.ponta && typeof f.ponta === 'object') brutas.push(f.ponta.id); else if (typeof f.ponta === 'string') brutas.push(f.ponta);
  if (f.encosta && typeof f.encosta.referencia === 'string') brutas.push(f.encosta.referencia);
  if (f.alinha) ponto(f.alinha.com);
  for (const k of ['centro', 'de', 'para']) if (f[k] !== undefined) ponto(f[k]);
  if (Array.isArray(f.caminho)) f.caminho.forEach(ponto);
  if (f.espelha && typeof f.espelha.forma === 'string') brutas.push(f.espelha.forma);
  if (f.arranjoDe && typeof f.arranjoDe.fonte === 'string') brutas.push(f.arranjoDe.fonte);
  if (f.arranjoDe && typeof f.arranjoDe.centro === 'string') brutas.push(f.arranjoDe.centro);
  const saida = [];
  for (const b of brutas) {
    if (ids.has(b)) { saida.push(b); continue; }
    const i = b.lastIndexOf('.');
    if (i > 0 && ids.has(b.slice(0, i))) saida.push(b.slice(0, i));
  }
  return saida;
}

/* Ordem topológica estável: cada unidade depois das que ela usa como referência; num ciclo, o resto segue na ordem de
   declaração (e o ciclo vai em `avisos`). */
function ordenar(unidades, dependeDe) {
  const feitas = new Set();
  const ordem = [];
  const restantes = [...unidades];
  while (restantes.length > 0) {
    const k = restantes.findIndex((u) => [...dependeDe.get(u.id)].every((d) => feitas.has(d)));
    const u = restantes.splice(k < 0 ? 0 : k, 1)[0];
    if (k < 0) u.ciclo = true;
    feitas.add(u.id);
    ordem.push(u);
  }
  return ordem;
}

function dependenciasDasUnidades(unidades, formas) {
  const ids = new Set(formas.map((f) => f.id));
  const unidadeDe = new Map();
  for (const u of unidades) for (const m of u.membros) unidadeDe.set(m, u.id);
  const porId = new Map(formas.map((f) => [f.id, f]));
  const dependeDe = new Map(unidades.map((u) => [u.id, new Set()]));
  for (const u of unidades) {
    for (const m of u.membros) {
      for (const r of referenciasDaForma(porId.get(m) ?? {}, ids)) {
        const dono = unidadeDe.get(r);
        if (dono && dono !== u.id) dependeDe.get(u.id).add(dono);
      }
    }
  }
  return dependeDe;
}

function montarUnidades(unidades, formas) {
  const dependeDe = dependenciasDasUnidades(unidades, formas);
  const ordenadas = ordenar(unidades.map((u) => ({ ...u })), dependeDe);
  return ordenadas.map((u) => ({ id: u.id, membros: u.membros, depende: [...dependeDe.get(u.id)], custo: u.membros.length, feito: u.feito === true, ...(u.ciclo ? { ciclo: true } : {}) }));
}

/* As formas visíveis da opção (a primeira, por padrão) e o mapa de acoplamento apertado: `atravessa` declarado (o eixo no
   furo, a coroa na presilha) une as formas; o componente inteiro é uma unidade. */
export function planoDeDetalhe(bruto, { opcao = 0 } = {}) {
  const esboco = expandirEsboco(bruto);
  const o = esboco.opcoes?.[opcao];
  exigir(o && Array.isArray(o.formas), `condutor: a opção ${opcao + 1} não existe ou não tem formas`);
  const formas = o.formas.filter((f) => f.oculto !== true);
  const chaveDe = (f) => f.daInstancia?.id ?? f.id;
  const pai = new Map();
  const raizDe = (k) => { while (pai.get(k) !== k) { pai.set(k, pai.get(pai.get(k))); k = pai.get(k); } return k; };
  for (const f of formas) if (!pai.has(chaveDe(f))) pai.set(chaveDe(f), chaveDe(f));
  const donoDe = new Map(formas.map((f) => [f.id, chaveDe(f)]));
  const raiz = lerContato(esboco.contato, 'esboço');
  const daOpcao = lerContato(o.contato, `opção ${opcao + 1}`);
  const pares = herdarDoEspelho([...(raiz?.pares ?? []), ...(daOpcao?.pares ?? [])], o).filter((p) => p.tipo === 'atravessa');
  for (const p of pares) {
    if (!donoDe.has(p.a) || !donoDe.has(p.b)) continue;
    const a = raizDe(donoDe.get(p.a)); const b = raizDe(donoDe.get(p.b));
    if (a !== b) pai.set(b, a);
  }
  const grupos = new Map();
  for (const f of formas) {
    const r = raizDe(chaveDe(f));
    if (!grupos.has(r)) grupos.set(r, { chaves: [], membros: [] });
    const g = grupos.get(r);
    if (!g.chaves.includes(chaveDe(f))) g.chaves.push(chaveDe(f));
    g.membros.push(f.id);
  }
  const unidades = montarUnidades([...grupos.values()].map((g) => ({ id: g.chaves.join('+'), membros: g.membros })), formas);
  return { opcao: o.titulo ?? `Opção ${opcao + 1}`, unidades, formas: formas.map((f) => f.id) };
}

/* Mede o esboço para o Portão: divergências (gate, soltas, atravessamentos, medidas, contrato) e o que o nível pede do plano. */
function medirParaOPortao(bruto, nivel) {
  const { descricao, divergencias, plano } = medirEsboco(bruto, { projecao: false });
  const falta = [];
  for (const o of descricao.opcoes) if (!o.gate.declarado && o.formas.length >= 4) falta.push(`o gate de contato não está ligado na opção "${o.titulo}" (contato.usar: true; a política liga a partir de 4 formas)`);
  for (const d of divergencias) falta.push(`[${d.n}] ${d.classe}: ${d.texto}`);
  const exige = EXIGENCIAS_POR_NIVEL[nivel];
  if (plano.resumo.medidas < exige.medidas) falta.push(`o plano declara ${plano.resumo.medidas} medida${plano.resumo.medidas === 1 ? '' : 's'} nomeada${plano.resumo.medidas === 1 ? '' : 's'} e o nível ${nivel} pede pelo menos ${exige.medidas} (plano.medidas: nome, valor, unidade, origem e mede)`);
  if (plano.resumo.relacoes < exige.relacoes) falta.push(`o nível ${nivel} pede o contrato de relações declarado (plano.contrato: tocam, livres, simetricas) e ele está vazio`);
  return { falta, divergencias, resumo: plano.resumo };
}

/* Custo estimado: o número de formas das unidades (feito e total). */
export function custoDe(estado) {
  const unidades = estado.unidades ?? [];
  const total = unidades.reduce((s, u) => s + u.custo, 0);
  const feito = unidades.filter((u) => u.feito).reduce((s, u) => s + u.custo, 0);
  return { total, feito, percentual: total === 0 ? 0 : Math.round((feito / total) * 1000) / 10 };
}

function estagiosDoNivel(nivel) { return [...ESTAGIOS_POR_NIVEL[nivel]]; }

/* Estado novo, no primeiro estágio do nível do plano (`medio` se o plano não declara). */
export function criarEstado(bruto, arquivo) {
  const plano = lerPlano(bruto?.plano);
  const nivel = plano?.nivel ?? NIVEL_PADRAO;
  return { versao: 1, esboco: arquivo, nivel, nivelDoPlano: plano?.nivel !== undefined, estagios: estagiosDoNivel(nivel), atual: estagiosDoNivel(nivel)[0], historico: [], unidades: [], alteracoes: [], marcos: [], avisos: [] };
}

/* O nível declarado no plano pode mudar entre uma chamada e outra: os estágios seguem o nível, e se o estágio atual saiu
   da lista o estado vai para o próximo que continua ligado. */
function sincronizarNivel(estado, bruto) {
  const plano = lerPlano(bruto?.plano);
  const nivel = plano?.nivel ?? estado.nivel;
  if (nivel === estado.nivel) return estado;
  const novo = clone(estado);
  novo.avisos.push(`o nível mudou de ${estado.nivel} para ${nivel}: os estágios ligados passam a ser ${estagiosDoNivel(nivel).map(nomeDoEstagio).join(', ')}`);
  novo.nivel = nivel; novo.nivelDoPlano = true; novo.estagios = estagiosDoNivel(nivel);
  if (novo.atual !== CONCLUIDO && !novo.estagios.includes(novo.atual)) {
    const depois = ORDEM_DOS_ESTAGIOS.slice(ORDEM_DOS_ESTAGIOS.indexOf(novo.atual) + 1).find((e) => novo.estagios.includes(e));
    novo.atual = depois ?? CONCLUIDO;
  }
  return novo;
}

/* O Portão do estágio atual: { estagio, passa, falta }. `falta` diz, em frases, o que impede o próximo estágio. */
export function portaoDoEstagio(bruto, estadoBruto) {
  const estado = sincronizarNivel(estadoBruto, bruto);
  if (estado.atual === CONCLUIDO) return { estagio: CONCLUIDO, passa: true, falta: [] };
  const { falta, divergencias, resumo } = medirParaOPortao(bruto, estado.nivel);
  if (['plano-de-detalhe', 'detalhe-por-unidade', 'montagem'].includes(estado.atual)) {
    const atuais = planoDeDetalhe(bruto).formas;
    const nas = new Set(estado.unidades.flatMap((u) => u.membros));
    const novas = atuais.filter((id) => !nas.has(id));
    const saidas = [...nas].filter((id) => !atuais.includes(id));
    if (novas.length || saidas.length) falta.push(`as formas mudaram desde o Plano de detalhe (${novas.length ? `sem unidade: ${novas.join(', ')}` : ''}${novas.length && saidas.length ? '; ' : ''}${saidas.length ? `que não existem mais: ${saidas.join(', ')}` : ''}); refaça o agrupamento com --replanejar e um "motivo" de pelo menos ${MINIMO_DO_MOTIVO} caracteres`);
  }
  if (estado.atual === 'detalhe-por-unidade') {
    const pendentes = estado.unidades.filter((u) => !u.feito).map((u) => u.id);
    if (pendentes.length) falta.push(`${pendentes.length} ${pendentes.length === 1 ? 'unidade' : 'unidades'} de detalhe sem marcar como feita (--feito <unidade>): ${pendentes.join(', ')}`);
  }
  return { estagio: estado.atual, passa: falta.length === 0, falta, divergencias, resumo };
}

/* Avança se o Portão passa. Devolve { ok, estado, portao }; sem passar o estado não muda e `portao.falta` diz o que falta. */
export function avancar(bruto, estadoBruto) {
  const estado = sincronizarNivel(estadoBruto, bruto);
  const portao = portaoDoEstagio(bruto, estado);
  if (estado.atual === CONCLUIDO) return { ok: false, estado, portao, concluido: true };
  if (!portao.passa) return { ok: false, estado, portao };
  const novo = clone(estado);
  const i = novo.estagios.indexOf(novo.atual);
  const proximo = novo.estagios[i + 1] ?? CONCLUIDO;
  novo.historico.push({ passo: novo.historico.length + 1, de: novo.atual, para: proximo });
  novo.atual = proximo;
  if (proximo === 'plano-de-detalhe') {
    const p = planoDeDetalhe(bruto);
    novo.opcao = p.opcao;
    novo.unidades = p.unidades;
    novo.alteracoes = [];
    novo.marcos = [];
    const ciclos = p.unidades.filter((u) => u.ciclo).map((u) => u.id);
    if (ciclos.length) novo.avisos.push(`dependência circular entre unidades (${ciclos.join(', ')}): a ordem segue a declaração`);
  }
  return { ok: true, estado: novo, portao };
}

const validarMotivo = (motivo, o) => {
  const m = typeof motivo === 'string' ? motivo.trim() : '';
  exigir(m.length >= MINIMO_DO_MOTIVO, `condutor: ${o} exige "motivo" de pelo menos ${MINIMO_DO_MOTIVO} caracteres${motivo === undefined ? ' (falta o campo)' : ` (veio ${m.length})`}; diga por que o agrupamento muda`);
  return m;
};

/* Muda o agrupamento: a forma vai para outra Unidade de detalhe (uma existente, ou uma nova com o nome dado). Só no
   estágio Plano de detalhe e com `motivo` de pelo menos 15 caracteres. */
export function moverForma(bruto, estadoBruto, { forma, para, motivo }) {
  const estado = sincronizarNivel(estadoBruto, bruto);
  exigir(estado.atual === 'plano-de-detalhe', `condutor: o agrupamento só muda no estágio Plano de detalhe (o estágio atual é ${nomeDoEstagio(estado.atual)})`);
  const m = validarMotivo(motivo, 'mudar o agrupamento');
  const membros = estado.unidades.flatMap((u) => u.membros);
  exigir(membros.includes(forma), `condutor: "${forma}" não é uma forma de nenhuma unidade${quisDizer(forma, membros)} (formas: ${membros.join(', ')})`);
  exigir(typeof para === 'string' && para, 'condutor: --mover <forma> --para <unidade> precisa da unidade de destino (uma existente ou um nome novo)');
  const de = estado.unidades.find((u) => u.membros.includes(forma)).id;
  exigir(de !== para, `condutor: "${forma}" já está na unidade "${para}"`);
  const brutas = estado.unidades.map((u) => ({ id: u.id, membros: u.membros.filter((x) => x !== forma), feito: u.feito }));
  const destino = brutas.find((u) => u.id === para);
  if (destino) destino.membros.push(forma); else brutas.push({ id: para, membros: [forma], feito: false });
  const visiveis = expandirEsboco(bruto).opcoes[0].formas.filter((f) => f.oculto !== true);
  const novo = clone(estado);
  novo.unidades = montarUnidades(brutas.filter((u) => u.membros.length > 0), visiveis);
  novo.alteracoes.push({ forma, de, para, motivo: m });
  return novo;
}

/* Refaz o Plano de detalhe do zero (as formas do esboço mudaram); descarta as alterações de agrupamento, e por isso exige `motivo`. */
export function replanejar(bruto, estadoBruto, { motivo }) {
  const estado = sincronizarNivel(estadoBruto, bruto);
  exigir(['plano-de-detalhe', 'detalhe-por-unidade', 'montagem'].includes(estado.atual), `condutor: só há Plano de detalhe a refazer depois dele (o estágio atual é ${nomeDoEstagio(estado.atual)})`);
  const m = validarMotivo(motivo, 'refazer o Plano de detalhe');
  const p = planoDeDetalhe(bruto);
  const feitas = new Set(estado.unidades.filter((u) => u.feito).map((u) => u.id));
  const novo = clone(estado);
  novo.unidades = p.unidades.map((u) => ({ ...u, feito: feitas.has(u.id) }));
  novo.alteracoes.push({ replanejado: true, motivo: m });
  return novo;
}

/* Marca uma unidade como detalhada e registra os Marcos (25%, 50%, 75%, 100% do custo estimado) que ela cruzou. */
export function marcarFeito(bruto, estadoBruto, unidade) {
  const estado = sincronizarNivel(estadoBruto, bruto);
  exigir(estado.atual === 'detalhe-por-unidade', `condutor: --feito vale no estágio Detalhe por unidade (o estágio atual é ${nomeDoEstagio(estado.atual)})`);
  const ids = estado.unidades.map((u) => u.id);
  exigir(ids.includes(unidade), `condutor: "${unidade}" não é uma unidade de detalhe${quisDizer(unidade, ids)} (unidades: ${ids.join(', ')})`);
  const novo = clone(estado);
  const u = novo.unidades.find((x) => x.id === unidade);
  const novosMarcos = [];
  if (!u.feito) {
    u.feito = true;
    const { total, feito, percentual } = custoDe(novo);
    for (const limiar of LIMIARES_DO_MARCO) {
      if (percentual >= limiar - 1e-9 && !novo.marcos.some((m) => m.limiar === limiar)) {
        const marco = { limiar, custoFeito: feito, custoTotal: total, unidades: novo.unidades.filter((x) => x.feito).map((x) => x.id), chamar: 'critico', imagens: 'limpas' };
        novo.marcos.push(marco); novosMarcos.push(marco);
      }
    }
  }
  return { estado: novo, novosMarcos };
}

/* Texto da situação: estágio, Portão e o que falta, unidades e custo. */
export function formatarSituacao(estado, portao) {
  const n = (x) => String(x).replace('.', ',');
  const L = [];
  L.push(`condutor de ${estado.esboco}: nível ${estado.nivel}${estado.nivelDoPlano ? '' : ' (padrão; declare plano.nivel)'}`);
  L.push(`estágios: ${estado.estagios.map((e) => (e === estado.atual ? `[${nomeDoEstagio(e)}]` : nomeDoEstagio(e))).join(' > ')}${estado.atual === CONCLUIDO ? ' > [Concluído]' : ''}`);
  if (estado.atual === CONCLUIDO) L.push('o fluxo terminou: todos os Portões dos estágios ligados passaram');
  else L.push(`Portão de ${nomeDoEstagio(estado.atual)}: ${portao.passa ? 'passa (--proximo avança)' : 'não passa, falta:'}`);
  if (estado.atual !== CONCLUIDO && !portao.passa) for (const f of portao.falta) L.push(`  - ${f}`);
  if (estado.unidades.length > 0) {
    const c = custoDe(estado);
    L.push(`unidades de detalhe (${estado.unidades.length}, custo estimado ${c.total} formas, feito ${c.feito}, ${n(c.percentual)}%), na ordem de dependência:`);
    estado.unidades.forEach((u, i) => L.push(`  ${i + 1}. ${u.id}: ${u.custo} ${u.custo === 1 ? 'forma' : 'formas'}${u.depende.length ? `, depende de ${u.depende.join(', ')}` : ''}${u.feito ? ' [feita]' : ''}${u.ciclo ? ' [ciclo]' : ''}`));
  }
  for (const m of estado.marcos ?? []) L.push(`marco de ${m.limiar}%: chamar o crítico visual sem contexto, com imagens limpas (registrado; o despacho é da skill)`);
  for (const a of estado.alteracoes ?? []) if (!a.replanejado) L.push(`agrupamento alterado: ${a.forma} de ${a.de} para ${a.para} (${a.motivo})`);
  for (const a of estado.avisos ?? []) L.push(`aviso: ${a}`);
  return `${L.join('\n')}\n`;
}

