/* orientacao.js — a peça usada com a orientação errada.

   A distância só em h ou só em v tem sinal: o resolvedor a obedece mesmo quando o chute dos pontos está do outro lado, e vira a parte
   sem dizer nada. Quando o `lado` ou o `eixo` dela vem de um parâmetro (a orientação que o uso dá à peça), o chute da peça, que
   segue o `angulo` e a `origem` do uso, é a outra metade da mesma intenção, e os dois precisam concordar: o uso que pede a peça
   "abaixo" e a chuta para cima resolve com o desenho do lado que a relação manda e o resto chutado para o outro, e o que se vê é a
   forma errada com zero grau de liberdade. Este conferir olha só o chute e a relação, antes de resolver: diz qual uso, qual peça,
   o lado pedido e o lado em que o chute põe o ponto. Não vale para a relação com o lado escrito direto no arquivo, que é a forma
   documentada de o chute do outro lado não inverter a relação. Puro. */

const aspas = (s) => JSON.stringify(s);
const TOLERANCIA_MM = 1e-6;

/* A frase de um item. `chute` é `null` quando os dois pontos têm a mesma coordenada no eixo, e então o chute não aponta lado nenhum. */
function frase(r, chute) {
  const quem = r.orientada.uso === null ? `a relação ${aspas(r.nome)}` : `a peça ${aspas(r.orientada.peca)} usada em ${aspas(r.orientada.uso)} (relação ${aspas(r.nome)})`;
  const onde = r.eixo === 'h' ? 'na horizontal' : 'na vertical';
  const pedido = `pede o ponto ${aspas(r.a)} ${r.lado} do ponto ${aspas(r.b)} ${onde}`;
  const visto = chute === null ? `o chute põe os dois no mesmo ${r.eixo}, sem lado nenhum` : `o chute põe ${aspas(r.a)} ${chute} dele`;
  return `${quem} está virada: ${pedido}, e ${visto}. O resolvedor segue a relação, mas o resto do desenho foi chutado para o outro lado; ponha no uso o lado e o eixo que a forma pede, ou o "angulo" e a "origem" do mesmo lado.`;
}

/* As relações orientadas por parâmetro cujo chute não concorda com o lado delas, na ordem de nome. Cada item: `{ relacao, uso, peca,
   pedido, chute, mensagem }`. */
export function conferirOrientacao(modelo) {
  const itens = [];
  for (const r of modelo.relacoes) {
    if (r.tipo !== 'distancia' || !r.eixo || !r.orientada) continue;
    const k = r.eixo === 'h' ? 0 : 1;
    const positivo = r.lado === 'direita' || r.lado === 'acima';
    const d = (positivo ? 1 : -1) * (modelo.pontos[r.a][k] - modelo.pontos[r.b][k]);
    if (d > TOLERANCIA_MM) continue;
    const contrario = r.eixo === 'h' ? (positivo ? 'esquerda' : 'direita') : (positivo ? 'abaixo' : 'acima');
    const chute = d < -TOLERANCIA_MM ? contrario : null;
    itens.push({ relacao: r.nome, uso: r.orientada.uso, peca: r.orientada.peca, pedido: r.lado, chute, mensagem: frase(r, chute) });
  }
  return itens;
}
