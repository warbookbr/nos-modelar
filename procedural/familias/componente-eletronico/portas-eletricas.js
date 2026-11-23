/* portas-eletricas.js — o tipo elétrico de cada terminal de um componente da família, no vocabulário de portas da ficha da ponte
   com a mecatrônica (versão 1.1): alimentacao, terra, sinal-digital, sinal-analogico, barramento, fase-de-motor e passivo.

   A tabela só fixa o que o componente fixa sozinho. Pelo encapsulamento: o resistor, o cerâmico, o eletrolítico e o LED têm
   terminais passivos (sem papel elétrico fixo; a polaridade do eletrolítico e do LED está no nome do terminal), e o dissipador não
   tem terminal elétrico, porque as aletas só seguram. Pelo perfil, quando ele nomeia uma peça de pinagem padronizada: a placa
   portadora do driver de passo de 16 pinos, que segue o formato comum dessas placas (de um lado habilita, as três seleções de
   micropasso, reinício, repouso, passo e direção; do outro terra, alimentação da lógica, as quatro fases do motor, terra e
   alimentação do motor). O que depende do circuito (o pino de um microcontrolador, de um regulador em TO-220, de um conector) não
   está aqui: a declaração da ponte do objeto diz, e o terminal que ninguém tipa fica fora da ficha e é contado no relatório.

   A tensão vai no formato de medida da ficha; a que o componente não fixa sai ausente, com o motivo. A posição do terminal é a do
   componente (mm), onde ele encontra a placa. Puro e determinístico. */

const TIPOS = ['alimentacao', 'terra', 'sinal-digital', 'sinal-analogico', 'barramento', 'fase-de-motor', 'passivo'];
const ausente = (motivo) => ({ ausente: true, motivo });
const PASSIVO = { tipo: 'passivo', tensao: ausente('terminal passivo, sem papel elétrico fixo') };

/* os encapsulamentos cujos terminais são todos passivos, e os que não têm terminal elétrico */
const PASSIVOS = new Set(['resistor-axial', 'ceramico-de-disco', 'eletrolitico-radial', 'led']);
const SEM_ELETRICA = new Set(['dissipador-to-220']);

const DRIVER_DE_PASSO = (() => {
  const nivel = ausente('o nível lógico segue a alimentação da lógica (pino 10) da placa portadora');
  const sinal = { tipo: 'sinal-digital', tensao: nivel };
  const fase = { tipo: 'fase-de-motor', tensao: ausente('a tensão de fase vem do driver e da alimentação do motor') };
  return {
    1: sinal, 2: sinal, 3: sinal, 4: sinal, 5: sinal, 6: sinal, 7: sinal, 8: sinal,
    9: { tipo: 'terra', tensao: { valor: 0, origem: 'declarado' } },
    10: { tipo: 'alimentacao', tensao: ausente('a lógica aceita a tensão do microcontrolador; a do circuito vem da rede ligada') },
    11: fase, 12: fase, 13: fase, 14: fase,
    15: { tipo: 'terra', tensao: { valor: 0, origem: 'declarado' } },
    16: { tipo: 'alimentacao', tensao: ausente('a alimentação do motor vem da fonte do objeto') },
  };
})();

/* os perfis de pinagem padronizada: terminal → { tipo, tensao } */
const PERFIS = { 'modulo-driver-de-passo': DRIVER_DE_PASSO };

/** O tipo fixo de um terminal pelo componente, ou null quando o componente não o fixa; `false` quando o terminal não é elétrico. */
export function tipoFixo(componente, terminal) {
  if (SEM_ELETRICA.has(componente.tipo)) return false;
  if (PASSIVOS.has(componente.tipo)) return PASSIVO;
  return PERFIS[componente.variante]?.[terminal] ?? null;
}

function lerDeclarados(id, blocos) {
  const porTerminal = new Map();
  (blocos ?? []).forEach((b, k) => {
    const onde = `portas.${id}[${k}]`;
    if (!TIPOS.includes(b?.tipo)) throw new Error(`${onde}.tipo: recebi ${JSON.stringify(b?.tipo)}; aceito ${TIPOS.join(', ')}.`);
    if (!Array.isArray(b.terminais) || !b.terminais.length) throw new Error(`${onde}.terminais: recebi ${JSON.stringify(b.terminais)}; aceito a lista dos terminais, como ["1", "2"].`);
    const origem = b.origem ?? 'declarado';
    const tensao = b.tipo === 'passivo' ? PASSIVO.tensao
      : typeof b.tensao === 'number' ? { valor: b.tensao, origem, ...(b.nota ? { nota: b.nota } : {}) }
        : ausente(b.motivoDaTensao ?? 'a declaração da ponte não diz a tensão');
    for (const t of b.terminais) {
      if (porTerminal.has(String(t))) throw new Error(`${onde}: o terminal ${t} já foi declarado em outro bloco de ${id}.`);
      porTerminal.set(String(t), { tipo: b.tipo, tensao });
    }
  });
  return porTerminal;
}

/**
 * As portas elétricas de um componente posto pela placa declarada (`{ id, tipo, variante, terminais: [{ id, posicao }] }`), com os
 * blocos declarados na ponte do objeto (`[{ terminais, tipo, tensao?, origem?, nota?, motivoDaTensao? }]`), que valem acima da
 * tabela. Devolve `{ portas: [{ peca, id, tipo, posicao, tensao }], semTipo: [terminal] }`, na ordem dos terminais; recusa o
 * bloco que cita terminal que o componente não tem.
 */
export function portasDoComponente(componente, declarados = []) {
  const porTerminal = lerDeclarados(componente.id, declarados);
  const existentes = new Set(componente.terminais.map((t) => t.id));
  for (const t of porTerminal.keys()) {
    if (!existentes.has(t)) throw new Error(`portas.${componente.id}: o terminal ${t} não existe; ${componente.id} (${componente.variante}) tem ${[...existentes].join(', ')}.`);
  }
  const portas = []; const semTipo = [];
  for (const t of componente.terminais) {
    const fixo = tipoFixo(componente, t.id);
    if (fixo === false && !porTerminal.has(t.id)) continue;
    const tipo = porTerminal.get(t.id) ?? fixo;
    if (!tipo) { semTipo.push(t.id); continue; }
    portas.push({ peca: componente.id, id: t.id, tipo: tipo.tipo, posicao: { valor: t.posicao, origem: 'medido', nota: 'onde o terminal encontra a placa, no referencial do componente' }, tensao: tipo.tensao });
  }
  return { portas, semTipo };
}
