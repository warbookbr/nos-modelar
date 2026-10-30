/* imagem-na-cena.test.js — a imagem que a peça declara fica oferecida na aba e não entra na cena sozinha; ligada, o plano nasce fora da caixa da peça e atrás dela; desligada, sai e guarda o ajuste; e só volta à cena na abertura seguinte se estava nela. */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import receitaDoFurgao from '../../../procedural/pecas/furgao/receita.js';
import receitaDeProva from '../../../tools/fixtures/acervo/peca-de-prova/receita.js';
import receitaDaCarenagem from '../../../procedural/pecas/carenagem-de-prova/receita.js';
import { criarArmazenamentoImagem } from './armazenamento-imagem.js';
import { criarImagemNaCena } from './imagem-na-cena.js';

/* As caixas das duas peças como a bancada as põe no estúdio, medidas na página em 1400×900. */
const PECAS = [
  { nome: 'furgao', receita: receitaDoFurgao, rotulo: 'referencias/fonte-vistas.png', caixa: [[-0.927, 0.08, -1.7], [0.927, 1.749, 1.7]] },
  { nome: 'peca-de-prova', receita: receitaDeProva, rotulo: 'referencias/prova.png', caixa: [[-0.165, 0.08, -1.7], [0.165, 2.366, 1.7]] },
];

function bancoNaMemoria() {
  const dados = new Map();
  return {
    dados,
    put: async (chave, valor) => { dados.set(chave, valor); },
    get: async (chave) => dados.get(chave) ?? null,
    delete: async (chave) => { dados.delete(chave); },
  };
}

function montar(peca, banco = bancoNaMemoria()) {
  const modelo = { nome: peca.nome };
  const scene = new THREE.Scene();
  const canvas = { style: {}, addEventListener() {}, removeEventListener() {}, getBoundingClientRect: () => ({ left: 0, top: 0, width: 1400, height: 900 }) };
  const caixa = new THREE.Box3(new THREE.Vector3(...peca.caixa[0]), new THREE.Vector3(...peca.caixa[1]));
  const imagem = criarImagemNaCena({
    ambiente: { scene, camera: new THREE.PerspectiveCamera() },
    canvas,
    cena: { modelo, caixaDoVisivel: () => caixa.clone() },
    containerReferencias: null,
    carregarImagem: async () => ({ naturalWidth: 1400, naturalHeight: 1050 }),
    carregarTextura: async () => new THREE.Texture(),
    armazenamentoImagem: criarArmazenamentoImagem({ banco }),
  });
  /* a ordem de `sessao-da-bancada.js` ao abrir pela janela Abrir */
  const abrir = async (outra = peca) => {
    modelo.nome = outra.nome;
    imagem.trocarDePeca({ alvo: { id: 'sessao-ativa' } }, { nome: outra.nome });
    await imagem.restaurarDaPeca();
    await imagem.oferecerSobreposicaoDaPeca(outra.nome, outra.receita);
  };
  const plano = () => scene.getObjectByName('__imagem_referencia__') ?? null;
  return { imagem, abrir, plano, caixa, banco };
}

describe.each(PECAS)('imagem de referência de $nome', (peca) => {
  it('a imagem que a peça declara fica oferecida e não entra na cena sozinha', async () => {
    const { imagem, abrir, plano } = montar(peca);
    await abrir();
    expect(plano()).toBeNull();
    expect(imagem.descreverNaCena()).toMatchObject({ id: `${peca.nome}:${peca.rotulo}`, rotulo: peca.rotulo, naCena: false });
  });

  it('ligada, o plano nasce fora da caixa da peça, do lado de lá da câmera da vista direita e da isométrica', async () => {
    const { imagem, abrir, plano, caixa, banco } = montar(peca);
    await abrir();
    const descritor = await imagem.mostrarNaCena(`${peca.nome}:${peca.rotulo}`, true);
    expect(descritor).not.toBeNull();
    const malha = plano();
    expect(malha?.visible).toBe(true);
    malha.updateMatrixWorld(true);
    const doPlano = new THREE.Box3().setFromObject(malha);
    expect(doPlano.intersectsBox(caixa)).toBe(false);
    /* as câmeras da vista direita e da isométrica ficam em +X: o plano fica em -X, atrás da peça */
    expect(doPlano.max.x).toBeLessThan(caixa.min.x);
    expect(imagem.descreverNaCena()).toMatchObject({ naCena: true, comTextura: true });
    expect(banco.dados.get(peca.nome)).toMatchObject({ naCena: true });

    await imagem.mostrarNaCena(`${peca.nome}:${peca.rotulo}`, false);
    expect(plano()).toBeNull();
    expect(banco.dados.get(peca.nome)).toMatchObject({ naCena: false, alinhamento: { x: descritor.alinhamento.x } });
  });

  it('volta à cena na abertura seguinte só se estava na cena; o registro de antes da chave não a põe lá', async () => {
    const banco = bancoNaMemoria();
    const primeira = montar(peca, banco);
    await primeira.abrir();
    await primeira.imagem.mostrarNaCena(`${peca.nome}:${peca.rotulo}`, true);
    const ligada = montar(peca, banco);
    await ligada.abrir();
    expect(ligada.plano()?.visible).toBe(true);

    const { naCena, ...deAntes } = banco.dados.get(peca.nome);
    expect(naCena).toBe(true);
    banco.dados.set(peca.nome, deAntes);
    const semChave = montar(peca, banco);
    await semChave.abrir();
    expect(semChave.plano()).toBeNull();
    expect(semChave.imagem.descreverNaCena()).toMatchObject({ naCena: false });
  });
});

/* A carenagem de prova não declara imagem: abri-la depois do furgão com a folha de vistas na cena tira a folha da cena e
   da aba, e não deixa imagem oferecida. */
describe('imagem de referência ao trocar do furgão para a carenagem de prova', () => {
  it('a imagem do furgão sai da cena e da aba, e a carenagem abre sem imagem', async () => {
    const [furgao] = PECAS;
    const { imagem, abrir, plano } = montar(furgao);
    await abrir();
    await imagem.mostrarNaCena(`furgao:${furgao.rotulo}`, true);
    expect(plano()).not.toBeNull();
    await abrir({ nome: 'carenagem-de-prova', receita: receitaDaCarenagem });
    expect(plano()).toBeNull();
    expect(imagem.descreverNaCena()).toBeNull();
  });
});
