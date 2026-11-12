/* chassi-aparado.esboco.mjs: o carro inteiro do ciclo 5 com o chassi aparado pela operação `aparar`, e não pelas seções tiradas do alvo.
 *
 * O `carro-inteiro.esboco.mjs` apara os membros que encostam por dentro na lataria (montantes, soleiras, reforço da cintura, travessas, paredes) pela
 * interseção com prismas da seção de dentro, tirada das funções do alvo, em estações a até 100 mm. Aqui cada uma dessas interseções vira um `aparar` do
 * mesmo membro pelas duas chapas da lataria que o limitam, o andar de baixo (subdivisão 1) e a cabine (17), a `FOLGA` mm (0,5) da pele de dentro delas: o
 * molde é a pele de dentro deslocada, e não uma seção amostrada, de modo que o membro segue a chapa onde ela curva. A folga de 2 mm do carro-inteiro não
 * cabe na cabine: o raio local da pele dela é de 3,3 mm nos cantos do teto, e a pele a 3 mm da de fora se dobra sobre si (o passo recusa com o raio). O andar de baixo fecha pelo plano
 * y = 300, abaixo de toda a borda de baixo dele, e a cabine por y = 950, abaixo da borda que a liga ao andar de baixo; o vão de cada janela fecha com uma
 * tampa plana. O que o `carro-inteiro` declara fica como está, menos os contatos entre a lataria e os membros aparados, que são os deste arquivo, com o
 * que a medida deu.
 *
 * `npm run esboco:nucleo -- <este arquivo> --so-montar --estrito` confere o conjunto, e `npm run vao:partes` mede os apoios. */
import carro from './carro-inteiro.esboco.mjs';

const FOLGA = Number(process.env.HD_FOLGA ?? 0.5);
/* a tolerância, em mm, com que o `aparar` desfaz as faces finas do corte (a pele de uma chapa subdividida, cortada pelas paredes do membro, deixa fileiras de tiras de 0,02 a 0,4 mm
   por 80 mm): 0,075 mm, a mesma da limpeza final */
const LIMPAR_DO_APARAR = Number(process.env.HD_LIMPAR_APARAR ?? 0.075);
const original = carro.opcoes[0];
const passos = structuredClone(original.passos);

/* os prismas da seção: as extrusões em z com perfil longo que só o reaparo cria, e as interseções que os usam */
const ehPrisma = (p) => p[0] === 'extrusao' && p[1].eixo === 'z' && Array.isArray(p[1].perfil) && p[1].perfil.length > 20;
const prismas = new Set(passos.filter(ehPrisma).map((p) => p[1].origemId));
const reaparos = new Set();
for (const p of passos) {
  if (p[0] !== 'intersectar') continue;
  const ferramentas = p[1].solidos.slice(1);
  if (ferramentas.length && ferramentas.every((s) => s.origem?.op === 'extrusao' && prismas.has(s.origem.id))) {
    reaparos.add(p[1].origemId);
    p[0] = 'aparar';
    p[1] = { origemId: p[1].origemId, solido: p[1].solidos[0], chapa: [{ op: 'subdivisao', id: 1 }, { op: 'subdivisao', id: 17 }], folga: FOLGA,
      fecha: [{ eixo: 'y', em: 300 }, { eixo: 'y', em: 950 }], limpar: LIMPAR_DO_APARAR };
  }
}
if (!reaparos.size) throw new Error('chassi-aparado: nenhum reaparo por seção no carro-inteiro');
/* as origens que citavam a interseção citam o `aparar`, e os prismas saem */
const trocar = (v) => {
  if (Array.isArray(v)) return v.map(trocar);
  if (!v || typeof v !== 'object') return v;
  if (v.op === 'intersectar' && reaparos.has(v.id)) return { ...v, op: 'aparar' };
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, trocar(x)]));
};
/* o `aparar` limpa, dentro do passo, as faces finas e de área nula que o corte deixa na costura com a pele nova, e não precisa do `limparLascas` depois dele */
const SEM_PRISMAS = passos.filter((p) => !(ehPrisma(p) && prismas.has(p[1].origemId))).map(trocar);
/* a limpeza final de cada membro do chassi, depois de todas as booleanas e dos `parte`: as faces finas que o `aparar` não desfez dentro do passo (a tampa plana do corte que a pele curva
   deixa em tiras, a fresta da união de dois prismas) saem pela vizinhança que só existe com o membro pronto. É a seleção por parte, e a tolerância é de 0,075 mm: o degrau de 0,07 mm da borda da pele (a 0,05 mm o corte deixa tiras de 0,07 por 90 mm), com desvio medido de no máximo 0,045 mm. */
const MEMBROS = /^(assoalho|tunel|longarina|travessa|suporte|parede|anteparo|caixaDeRoda|soleiraDoChassi|montante|reforco)/;
const LIMPAR_FINAL = Number(process.env.HD_LIMPAR_FINAL ?? 0.075);
const PASSOS = [...SEM_PRISMAS, ...SEM_PRISMAS.filter((p) => p[0] === 'parte' && MEMBROS.test(p[1].nome)).map((p) => ['limparLascas', { sel: { grupo: p[1].nome }, tolerancia: LIMPAR_FINAL }])];

/* os contatos da lataria com os membros aparados: o apoio é a folga de FOLGA mm, e a travessia rasa do carro-inteiro (a seção ficava até 2 mm dentro da
   chapa alisada) já não se declara; o relato diz o que a malha dá */
const apoios = new Set(original.contatos.filter((c) => c.relacao === 'folga' && String(c.motivo).includes('apoio: o membro, reaparado')).map((c) => c.par.join('|')));
const rasos = new Set(original.contatos.filter((c) => c.relacao === 'atravessa' && String(c.motivo).startsWith('o membro, reaparado pela seção')).map((c) => c.par.join('|')));
/* os apoios cujo vão de borda a borda o `vao:partes` mede em 0,5 mm (p05 de 0,499 a 0,500, p95 de até 0,504, nos dois lados): o teto sobre os montantes A, B e C e sobre a
   travessa do painel. Nos outros o aparar dá a folga de 0,5 mm entre as peles (distância 3D de 0,46 a 0,5), mas a borda do membro fica a mais que isso da borda da chapa
   (de 2 a 12 mm), e a faixa larga do rascunho continua */
const MEDIDOS_EM_MEIO_MM = new Set(['montanteA', 'montanteB', 'montanteC'].flatMap((m) => ['Dir', 'Esq'].map((L) => `teto|${m}${L}`)).concat(['teto|travessaDoPainel']));
const contatos = original.contatos.filter((c) => !rasos.has(c.par.join('|'))).map((c) => (apoios.has(c.par.join('|'))
  ? { ...c, folga: { esperada: FOLGA, tolerancia: MEDIDOS_EM_MEIO_MM.has(c.par.join('|')) ? 0.05 : Number(process.env.HD_TOLERANCIA ?? 0.5) }, motivo: `apoio: o membro, aparado pelo lado de dentro da chapa a ${FOLGA} mm da pele de dentro, e a cola de estrutura entre os dois fica fora do esboço` }
  : c));
/* a travessa da cabine acaba em z -1311, o plano do corte do teto com a tampa do porta-malas, e o canto dela toca a parede do corte do teto em 8 pares de triângulos de
   até 7 mm (as duas peles ficam a 0,47 mm uma da outra, e nenhuma aresta de uma atravessa a outra): a medida de contatos a chama de travessia pelo encontro de superfícies */
contatos.push({ par: ['teto', 'travessaDaCabine'], relacao: 'atravessa', motivo: 'o fim da travessa, em z -1311, fica no plano do corte do teto com a tampa, e o canto dela toca a parede do corte do teto (as peles ficam a 0,47 mm, sem aresta que atravesse)' });

export { PASSOS };
export default {
  plano: 'Quinto ciclo de alta definição do sedã com o chassi aparado pela operação aparar, a folga da pele de dentro da lataria.',
  vista: original.vista ?? carro.vista,
  opcoes: [{
    ...original,
    titulo: 'caminho A, ciclo 5: o carro inteiro com o chassi aparado',
    nota: 'lataria por gaiolas com simetria, para-choques por laços, chassi aparado pela pele de dentro e rodas do rascunho',
    passos: PASSOS,
    contatos,
  }],
};
