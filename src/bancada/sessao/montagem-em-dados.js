/* montagem-em-dados.js — abre a montagem persistida (`<objeto>/montagem.json`) como modelo da bancada, com as peças nas posições da montagem.
 *
 * O dado é lido e resolvido pelo MESMO leitor da autoria e da auditoria (`lerMontagemPersistida` e
 * `resolverMontagemPersistida`, em `src/autoria/`), que valida o formato, ordena as etapas, deriva os vínculos de medida e
 * posiciona cada instância pelo que a montagem declara (pose, posição por porta). Este módulo só carrega as receitas que a
 * montagem cita, com os mesmos carregadores que a linha de comando usa, e entrega o resultado no formato que a cena
 * entende: cada instância é uma parte da árvore de objetos, e a cena não a distingue de uma peça de um grupo só.
 *
 * A montagem é só para ver. O modelo não leva a malha neutra nem a receita, então as juntas e a edição de malha, que
 * trabalham nelas, ficam de fora, e editar a montagem pela bancada não é escopo. */
import * as THREE from 'three';
import { adaptarMontagemThree } from '../../autoria/adaptar-montagem-three.js';
import { lerMontagemPersistida } from '../../autoria/ler-montagem-persistida.js';
import { resolverMontagemPersistida } from '../../autoria/resolver-montagem-persistida.js';
import { carregadoresDeReceitas } from '../../../tools/modelar/peca-com-parametros.mjs';

/** As receitas das peças que a montagem cita, pelo nome curto, descendo pelas submontagens. */
async function receitasDaMontagem(dado, acervo, receitas = {}, visitadas = new Set()) {
  for (const { alvo } of lerMontagemPersistida(dado).instancias) {
    if (alvo.tipo === 'montagem') {
      if (visitadas.has(alvo.ref)) continue;
      visitadas.add(alvo.ref);
      const filha = acervo.find((entrada) => entrada.emDados && entrada.id === alvo.ref);
      if (!filha) throw new Error(`montagem '${alvo.ref}' não está no acervo.`);
      await receitasDaMontagem(await filha.carregar(), acervo, receitas, visitadas);
      continue;
    }
    if (Object.hasOwn(receitas, alvo.ref)) continue;
    const entrada = acervo.find((candidata) => !candidata.emDados && !candidata.ensaio && candidata.id === alvo.ref);
    if (!entrada) throw new Error(`a peça '${alvo.ref}' que a montagem cita não está no acervo.`);
    const receita = await entrada.carregar();
    if (!Array.isArray(receita?.PASSOS)) throw new Error(`a receita '${alvo.ref}' não expõe PASSOS.`);
    receitas[alvo.ref] = receita;
  }
  return receitas;
}

/** A montagem do acervo resolvida: o mesmo objeto que a auditoria de montagem recebe. */
export async function resolverMontagemDoAcervo(dado, acervo) {
  const receitas = await receitasDaMontagem(dado, acervo);
  return resolverMontagemPersistida(dado, {
    ...carregadoresDeReceitas(receitas),
    carregarMontagem: async (ref) => {
      const filha = acervo.find((entrada) => entrada.emDados && entrada.id === ref);
      if (!filha) throw new Error(`montagem '${ref}' não está no acervo.`);
      return filha.carregar();
    },
  });
}

/**
 * O modelo da bancada de uma montagem resolvida. Cada instância vira um grupo próprio, filho da raiz, que a explosão e o
 * isolar movem sem desfazer a pose da montagem (a pose mora no grupo de dentro). A árvore de objetos lista as instâncias
 * pelo caminho delas.
 */
export function modeloDaMontagem(montagemResolvida, { rotulo = montagemResolvida.id, montagem = null } = {}) {
  const semGeometria = [];
  const adaptado = adaptarMontagemThree(montagemResolvida, {
    aoFalhar: (caminho, erro) => semGeometria.push({ caminho: caminho.join('/'), motivo: erro.message }),
  });
  const raiz = new THREE.Group();
  raiz.name = montagemResolvida.id;
  const partes = new Map();
  const hierarquia = [];
  const facesSemParte = [];
  const soma = { verticesNeutros: 0, facesNeutras: 0, triangulos: 0 };

  for (const { caminho, visual } of adaptado.instancias.values()) {
    const nome = caminho.join('/');
    /* As partes de dentro da instância têm nome próprio (`casco`, `roda`), que a de outra instância pode repetir, e a
       árvore da bancada só conhece as instâncias: o nome de dentro leva o da instância na frente, para o toque numa
       malha nunca cair numa instância que não é a dona dela. */
    visual.raiz.traverse((no) => {
      const interna = no.userData?.identidadeParte;
      if (interna) no.userData = { ...no.userData, identidadeParte: `${nome}:${interna}`, parteDaInstancia: interna };
    });
    const grupo = new THREE.Group();
    grupo.name = nome;
    grupo.userData = {
      tipo: 'parte-semantica',
      identidadeParte: nome,
      paiSemantico: null,
      caminho: caminho.slice(),
      faces: [...visual.partes.values()].flatMap((parte) => parte.userData.faces ?? []),
    };
    grupo.add(visual.raiz);
    raiz.add(grupo);
    partes.set(nome, grupo);
    hierarquia.push({ nome, pai: null });
    facesSemParte.push(...visual.diagnosticos.facesSemParte);
    soma.verticesNeutros += visual.estatisticas.verticesNeutros;
    soma.facesNeutras += visual.estatisticas.facesNeutras;
    soma.triangulos += visual.estatisticas.triangulos;
  }

  raiz.userData = {
    tipo: 'montagem-resolvida',
    id: montagemResolvida.id,
    partes: [...partes.keys()].sort(),
    hierarquia,
    diagnosticos: { facesSemParte: facesSemParte.slice() },
  };
  raiz.updateWorldMatrix(true, true);

  return {
    tipo: 'montagem',
    nome: montagemResolvida.id,
    rotulo,
    medida: { partes: new Map(), facesSemParte, portas: [] },
    estatisticas: { ...soma, partes: partes.size, facesSemParte: facesSemParte.length },
    partes,
    raiz,
    montagem,
    montagemResolvida,
    /* As instâncias que a cena não conseguiu desenhar, com o motivo; a sessão as diz à pessoa. */
    semGeometria,
  };
}

/** Do dado cru da montagem ao modelo da bancada. */
export async function abrirMontagemDoAcervo(dado, acervo, opcoes = {}) {
  const resolvida = await resolverMontagemDoAcervo(dado, acervo);
  return modeloDaMontagem(resolvida, { montagem: dado, ...opcoes });
}
