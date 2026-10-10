/* Para onde cada recusa do esboço aponta: a mensagem "esboço recusado: ...", o gate de contato que reprova e o Portão do
   Condutor que não passa ganham no fim `veja npm run esboco -- --ajuda <tópico>`, com o tópico que resolve, para a IA ler a
   referência quando precisa dela e não antes, por precaução. O módulo `modulos/esboco` não sabe disso (ele não conhece a
   ajuda nem as ferramentas): quem decide o tópico é este arquivo, pela forma da mensagem.
   Os nomes saem do índice de `npm run esboco -- --ajuda`; o teste confere que todo tópico citado aqui existe lá, para o
   apontamento não envelhecer quando o README do módulo mudar de seção. A mensagem que nenhuma regra reconhece sai sem dica,
   e o teste de cobertura mostra quais são para ganharem regra. */

/* Tipo de forma → tópico da ajuda. O `envolve` é descrito no tópico `faixa`. */
export const TOPICO_DO_TIPO = {
  caixa: 'caixa', cilindro: 'cilindro', anel: 'anel', cone: 'cone', esfera: 'esfera', extrusao: 'extrusao',
  loft: 'loft', revolucao: 'revolucao', tubo: 'tubo', envolve: 'faixa',
};

/* O campo desconhecido fora de uma forma: o tópico segue o lugar onde ele estava, que a mensagem diz antes dos dois pontos. */
const TOPICO_DO_LUGAR = [
  [/contato/i, 'contrato'],
  [/plano/i, 'plano'],
  [/estilo/i, 'estilos'],
  [/unidades?\b/i, 'unidades'],
  [/m[óo]dulo/i, 'modulos'],
  [/componente/i, 'componentes'],
];
const TOPICO_DO_CAMPO_NA_RAIZ = 'esquema';

/* As regras, em ordem: a primeira que casa decide. `topico` é o nome do tópico ou uma função da casada; a função declara em
   `valores` os nomes que pode devolver, para o teste conferi-los. */
const REGRAS = [
  { re: /: o campo "[^"]*" não existe em (\w+)/, topico: (m) => TOPICO_DO_TIPO[m[1]] ?? 'formas', valores: Object.values(TOPICO_DO_TIPO) },
  { re: /: (caixa|cilindro|anel|cone|esfera|extrusao|loft|revolucao|tubo|envolve) (?:precisa|deve|não)/, topico: (m) => TOPICO_DO_TIPO[m[1]], valores: Object.values(TOPICO_DO_TIPO) },
  { re: /"tipo" com o valor "[^"]*" deve ser um de|tipo "[^"]*" desconhecido/, topico: 'formas' },
  { re: /^([^"]*?): o campo "[^"]*" (?:não existe|não é do componente)/, topico: (m) => TOPICO_DO_LUGAR.find(([re]) => re.test(m[1]))?.[1] ?? TOPICO_DO_CAMPO_NA_RAIZ, valores: [TOPICO_DO_CAMPO_NA_RAIZ, ...TOPICO_DO_LUGAR.map(([, t]) => t)] },
  { re: /: porta: |A porta não o justifica|"porta" deve ser|a porta não tem o campo|o papel da porta|a classe de ajuste da porta|a face da porta|declaram classes de ajuste diferentes/, topico: 'portas' },
  { re: /↔|contato\.pares|contato\.usar|"contato"|precisa dizer por que a exceção/, topico: 'contrato' },
  { re: /\bjuntas?\b/, topico: 'juntas' },
  { re: /^editar:|--editar|--remover|--adicionar/, topico: 'editar' },
  { re: /--feito|unidade de detalhe|Plano de detalhe|--mover|--replanejar/, topico: 'unidades' },
  { re: /Envelope|--envelope/, topico: 'envelope' },
  { re: /^integrar:|--integrar|--detalhar/, topico: 'detalhar' },
  { re: /veredito|nota do crítico|brief|crítico/, topico: 'critico' },
  { re: /^condutor:|Condutor/, topico: 'condutor' },
  { re: /--corte|--lado|--explodir|--zoom-forma|--previa|vista desconhecida/, topico: 'vistas-ia' },
  { re: /--referencia|--medidas-da-referencia|referência/, topico: 'conferencia' },
  { re: /--achado/, topico: 'imagem' },
  { re: /--ligacoes/, topico: 'ligacoes' },
  { re: /ciclo de módulos|"modulos"|módulo|"ligar"|ligação|"encaixa"/, topico: 'modulos' },
  { re: /componente|instância|"usa"|"espelha"/, topico: 'componentes' },
  { re: /parâmetro|expressão válida|ciclo de parâmetros/, topico: 'parametros' },
  { re: /"casca"|"arredondado"|"cantos"|"segmentosPorCanto"|"inclinacao"/, topico: 'loft' },
  { re: /plano\.|"mede"|"plano"/, topico: 'plano' },
  { re: /estilo|"simetrico"|"funcao"/, topico: 'estilos' },
  { re: /âncora|"sobre"|"encosta"|"ponta"|"alinha"|"lado"/, topico: 'posicionamento' },
  { re: /precisa de um valor|--largura|--saida/, topico: 'como-rodar' },
  { re: /deve ser|campos válidos|a seção|"perfil"|"secoes"/, topico: 'esquema' },
];

/* O tópico que resolve a mensagem de recusa, ou null quando nenhuma regra a reconhece. `erro` é o erro lançado: um JSON
   ilegível (SyntaxError) ou um arquivo que não existe (ENOENT) apontam para o arquivo e a raiz do JSON. */
export function topicoDaRecusa(mensagem, erro = null) {
  if (erro instanceof SyntaxError || erro?.code === 'ENOENT') return 'como-escrever';
  const texto = String(mensagem);
  for (const { re, topico } of REGRAS) {
    const m = re.exec(texto);
    if (m) return typeof topico === 'function' ? topico(m) : topico;
  }
  return null;
}

/* O gate de contato reprovado: `conserto` quando ele propôs um conserto, `portas` quando só reprovou pares lidos pelas portas,
   `contato` quando só relata. */
export function topicoDoContato(contato) {
  const achados = contato?.achados ?? [];
  if (achados.some((a) => a.sugestao)) return 'conserto';
  return achados.length > 0 && achados.every((a) => a.tipo === 'porta-fora') ? 'portas' : 'contato';
}

/* O Portão que não passa, pelo que falta: o Envelope, as unidades, o crítico, o gate de contato (quando o que falta é peça
   solta ou atravessando) ou, no resto, o Condutor. */
export function topicoDoPortao(falta = [], texto = '') {
  const linhas = [...falta, texto].join('\n');
  if (/Envelope/.test(linhas)) return 'envelope';
  if (/unidades? de detalhe|Plano de detalhe|--feito/.test(linhas)) return 'unidades';
  if (/crítico|veredito|nota/.test(linhas)) return 'critico';
  if (falta.some((f) => /^\[\d+\] (?:atravessa|solto|ponta):/.test(f))) return 'contato';
  return 'condutor';
}

/* Todos os tópicos que as regras e os dois gates podem citar, para o teste conferir contra o índice. */
export const TOPICOS_DAS_RECUSAS = new Set([
  'como-escrever', 'contato', 'portas', 'conserto', 'condutor', 'unidades', 'envelope', 'critico',
  ...REGRAS.flatMap((r) => (typeof r.topico === 'string' ? [r.topico] : r.valores)),
]);

export const dica = (topico) => `veja npm run esboco -- --ajuda ${topico}`;

/* O texto da recusa na saída de erro: a linha "esboço recusado: ..." e, quando há tópico, a dica na linha seguinte. */
export function textoDaRecusa(mensagem, erro = null) {
  const topico = topicoDaRecusa(mensagem, erro);
  return { topico, texto: `esboço recusado: ${mensagem}\n${topico ? `${dica(topico)}\n` : ''}` };
}
