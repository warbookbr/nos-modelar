/* O curso de um mecanismo no esboço: `curso` na raiz declara, por mecanismo, o parâmetro que o move, de onde até onde ele vai e
   em quantos passos. O trem de pouso do avião gira por um parâmetro (`tnCurso`, 0 estendido e 95 recolhido), e saber onde o curso
   atravessa o capô pediu copiar o detalhe, tirar o `oculto` das vizinhas e rodar quinze `--editar` à mão (atritos 38 e 42); o
   brief do crítico mostrou as posições que o esbocista escolheu, 45 e 80 graus, e a travessia a 95 ficou fora do julgamento
   (atrito 40). Declarado o curso, `--curso` varre as posições (`curso-varredura.js`) e o brief da unidade que o curso move traz
   as poses inteiras, o fim incluso.

       "curso": {
         "recolhe": { "parametro": "tnCurso", "de": 0, "ate": 95, "passos": 10, "rotulo": "o trem do nariz recolhendo" },
         "abre":    { "parametro": "angPorta", "de": 0, "ate": 70, "passos": 7,
                      "formas": ["porta", "macaneta"], "gira": { "eixo": "y", "centro": "dobradicaPorta" } }
       }

   `parametro` é um parâmetro do esboço (na raiz ou nas opções), `de` e `ate` os valores dele nas pontas do curso (`passos`
   intervalos iguais, `passos + 1` posições, as duas pontas incluídas; padrão 8) e `rotulo` o texto que o brief diz ao crítico.
   Quando as formas já dependem do parâmetro (a perna, o amortecedor e a roda seguem `tnCurso` por ponto nomeado), declara-se
   só o parâmetro. Quando não dependem, `formas` lista as que se movem com ele (ids, instâncias de componente ou padrões como
   `porta*`) e `gira` diz em torno de quê: `eixo` de mundo (`x`, `y` ou `z`), `centro` (um ponto: `[x, y, z]`, ponto nomeado ou
   `<forma>.<ancora>`, lido com o grupo na pose de repouso) e `sinal` (1 ou -1, padrão 1); o valor do parâmetro é o ângulo em
   graus, e o grupo gira junto, como um corpo só (`giro.js`). Puro. */
import { ErroDeEsboco } from './index.js';
import { quisDizer } from './parecido.js';

const objeto = (v) => v && typeof v === 'object' && !Array.isArray(v);
const exigir = (cond, msg) => { if (!cond) throw new ErroDeEsboco(msg); };
export const CAMPOS_DO_CURSO = ['parametro', 'de', 'ate', 'passos', 'rotulo', 'formas', 'gira'];
export const CAMPOS_DO_GIRO = ['eixo', 'centro', 'sinal'];
export const PASSOS_PADRAO = 8;
export const PASSOS_MAXIMOS = 200;
const EXEMPLO = '{ "parametro": "tnCurso", "de": 0, "ate": 95, "passos": 10, "rotulo": "o trem do nariz recolhendo" }';

/* Os nomes de parâmetro que o esboço bruto declara, na raiz e nas opções. */
function parametrosDeclarados(esboco) {
  const nomes = new Set();
  for (const c of [esboco, ...(Array.isArray(esboco?.opcoes) ? esboco.opcoes : [])]) if (objeto(c) && objeto(c.parametros)) for (const n of Object.keys(c.parametros)) nomes.add(n);
  return [...nomes];
}

/* Valida o `curso` do esboço bruto (roda no esquema, antes de resolver parâmetros). Lança ErroDeEsboco na primeira divergência. */
export function validarCurso(esboco) {
  const curso = esboco?.curso;
  if (curso === undefined) return;
  exigir(objeto(curso) && Object.keys(curso).length > 0, `esboço: "curso" deve ser { "<mecanismo>": ${EXEMPLO} } com pelo menos um mecanismo`);
  const parametros = parametrosDeclarados(esboco);
  for (const [nome, c] of Object.entries(curso)) {
    const onde = `esboço: curso "${nome}"`;
    exigir(nome.trim() !== '', 'esboço: o nome de um mecanismo em "curso" não pode ser vazio');
    exigir(objeto(c), `${onde} deve ser ${EXEMPLO}`);
    for (const k of Object.keys(c)) exigir(CAMPOS_DO_CURSO.includes(k), `${onde}: o campo "${k}" não existe${quisDizer(k, CAMPOS_DO_CURSO)}; campos válidos: ${CAMPOS_DO_CURSO.join(', ')}`);
    exigir(typeof c.parametro === 'string' && c.parametro, `${onde}: "parametro" deve ser o nome do parâmetro do esboço que move o mecanismo (parâmetros: ${parametros.join(', ') || 'nenhum declarado'})`);
    exigir(parametros.includes(c.parametro), `${onde}: o parâmetro "${c.parametro}" não existe${quisDizer(c.parametro, parametros)} (parâmetros: ${parametros.join(', ') || 'nenhum declarado'}); declare-o em "parametros"`);
    for (const k of ['de', 'ate']) exigir(Number.isFinite(c[k]), `${onde}: "${k}" deve ser um número, o valor de "${c.parametro}" ${k === 'de' ? 'no começo' : 'no fim'} do curso (veio ${JSON.stringify(c[k])})`);
    exigir(c.de !== c.ate, `${onde}: "de" e "ate" são o mesmo valor (${c.de}); o curso precisa ir de um valor a outro`);
    exigir(c.passos === undefined || (Number.isInteger(c.passos) && c.passos >= 1 && c.passos <= PASSOS_MAXIMOS), `${onde}: "passos" deve ser um inteiro de 1 a ${PASSOS_MAXIMOS}, o número de intervalos entre "de" e "ate" (veio ${JSON.stringify(c.passos)}; sem ele valem ${PASSOS_PADRAO})`);
    exigir(c.rotulo === undefined || (typeof c.rotulo === 'string' && c.rotulo.trim()), `${onde}: "rotulo" deve ser um texto que diz o que o mecanismo faz (o brief do crítico o imprime)`);
    if (c.formas === undefined) {
      exigir(c.gira === undefined, `${onde}: "gira" diz como as "formas" se movem; sem "formas" o parâmetro "${c.parametro}" já move as formas que dependem dele e não há o que girar`);
      continue;
    }
    exigir(Array.isArray(c.formas) && c.formas.length > 0 && c.formas.every((x) => typeof x === 'string' && x.trim()), `${onde}: "formas" deve ser a lista (não vazia) de ids, instâncias ou padrões das formas que se movem com o parâmetro`);
    exigir(objeto(c.gira), `${onde}: com "formas" falta "gira": { "eixo": "y", "centro": "<ponto>" } (o eixo de mundo e o ponto em torno de que elas giram; o valor de "${c.parametro}" é o ângulo em graus)`);
    for (const k of Object.keys(c.gira)) exigir(CAMPOS_DO_GIRO.includes(k), `${onde}: gira: o campo "${k}" não existe${quisDizer(k, CAMPOS_DO_GIRO)}; campos válidos: ${CAMPOS_DO_GIRO.join(', ')}`);
    exigir(['x', 'y', 'z'].includes(c.gira.eixo), `${onde}: gira.eixo deve ser "x", "y" ou "z" (veio ${JSON.stringify(c.gira.eixo)})`);
    const centro = c.gira.centro;
    exigir((Array.isArray(centro) && centro.length === 3) || (typeof centro === 'string' && centro.trim()), `${onde}: gira.centro deve ser [x, y, z], um ponto nomeado ou "<forma>.<ancora>" (veio ${JSON.stringify(centro)})`);
    exigir(c.gira.sinal === undefined || c.gira.sinal === 1 || c.gira.sinal === -1, `${onde}: gira.sinal deve ser 1 ou -1 (veio ${JSON.stringify(c.gira.sinal)})`);
  }
}

/* Os cursos declarados: [{ nome, parametro, de, ate, passos, rotulo?, formas?, gira? }], com o passo padrão posto. */
export function lerCurso(bruto) {
  validarCurso(bruto);
  return Object.entries(objeto(bruto?.curso) ? bruto.curso : {}).map(([nome, c]) => ({ nome, ...c, passos: c.passos ?? PASSOS_PADRAO }));
}

/* O curso pelo nome, ou ErroDeEsboco com os nomes declarados. */
export function cursoPorNome(cursos, nome) {
  const achado = cursos.find((c) => c.nome === nome);
  if (achado) return achado;
  const nomes = cursos.map((c) => c.nome);
  throw new ErroDeEsboco(`--curso: "${nome}" não é um mecanismo declarado em "curso"${quisDizer(nome, nomes)} (mecanismos: ${nomes.join(', ') || 'nenhum'})`);
}

/* Os valores do parâmetro nas `passos + 1` posições do curso, de `de` a `ate`, as duas pontas incluídas. */
export function posicoesDoCurso(c) {
  const passos = c.passos ?? PASSOS_PADRAO;
  return Array.from({ length: passos + 1 }, (_, k) => (k === passos ? c.ate : Number((c.de + ((c.ate - c.de) * k) / passos).toFixed(9))));
}

/* As posições que o brief do crítico mostra: todas se cabem em `maximo`, e senão `maximo` delas espaçadas por igual, com as duas
   pontas (a do fim do curso é a que o crítico não pode deixar de ver). */
export function posesDoBrief(c, maximo = 6) {
  const todas = posicoesDoCurso(c);
  if (todas.length <= maximo) return todas;
  const indices = new Set(Array.from({ length: maximo }, (_, k) => Math.round((k * (todas.length - 1)) / (maximo - 1))));
  return todas.filter((_, i) => indices.has(i));
}

/* O esboço bruto com o parâmetro do curso no valor da pose, onde ele está declarado (na raiz e nas opções); o resto fica como é. */
export function aplicarPose(bruto, c, valor) {
  const pose = JSON.parse(JSON.stringify(bruto));
  let achou = false;
  for (const dono of [pose, ...(Array.isArray(pose.opcoes) ? pose.opcoes : [])]) {
    if (objeto(dono) && objeto(dono.parametros) && Object.hasOwn(dono.parametros, c.parametro)) { dono.parametros[c.parametro] = valor; achou = true; }
  }
  exigir(achou, `curso "${c.nome}": o parâmetro "${c.parametro}" não existe no esboço`);
  return pose;
}

/* O nome de uma pose para nome de arquivo: `<mecanismo>-<valor>`, sem caractere que o sistema de arquivos estranhe. */
export const nomeDaPose = (c, valor) => `${c.nome}-${String(valor).replace('-', 'menos').replace('.', 'v')}`.replace(/[^A-Za-z0-9_-]+/g, '-');

/* Um número em texto, com vírgula decimal e sem zeros à direita. */
export const numeroDoCurso = (x) => String(Math.round(x * 1000) / 1000).replace('.', ',');
