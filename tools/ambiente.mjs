/* ambiente.mjs — lê uma variável de ambiente pelo nome novo (`MODELAR_*`) e aceita o antigo (`MECANIFICA_*`) com aviso.
 *
 * O projeto passou a se chamar Modelar (plano renomear para Modelar, fatia 3), e as variáveis de quem já roda o projeto, no CI
 * e na máquina da pessoa, continuam com o nome antigo até serem trocadas. O nome antigo vale até o fechamento do plano seguinte,
 * e cada nome antigo lido avisa uma vez por processo, na saída de erro, qual é o novo. */
const avisados = new Set();

export const nomeNovo = (sufixo) => `MODELAR_${sufixo}`;
export const nomeAntigo = (sufixo) => `MECANIFICA_${sufixo}`;

/* O valor de `MODELAR_<sufixo>`, ou o de `MECANIFICA_<sufixo>` com aviso, ou `undefined`. `ambiente` é o objeto lido (padrão
   `process.env`); `avisar` recebe o texto do aviso (padrão, a saída de erro). */
export function doAmbiente(sufixo, ambiente = process.env, { avisar = (texto) => process.stderr.write(`${texto}\n`) } = {}) {
  const novo = ambiente?.[nomeNovo(sufixo)];
  if (novo !== undefined && novo !== '') return novo;
  const antigo = ambiente?.[nomeAntigo(sufixo)];
  if (antigo === undefined || antigo === '') return novo;
  if (!avisados.has(sufixo)) {
    avisados.add(sufixo);
    avisar(`aviso: ${nomeAntigo(sufixo)} é o nome antigo; use ${nomeNovo(sufixo)} (o antigo deixa de valer no fechamento do plano seguinte ao da renomeação).`);
  }
  return antigo;
}
