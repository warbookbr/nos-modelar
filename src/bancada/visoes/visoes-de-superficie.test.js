/* visoes-de-superficie.test.js — a curvatura, a zebra e a luz rasante da bancada sobre a peça na cena, sem navegador.
 *
 * O que se guarda: a cor de cada canto da cena é a que `curvaturaDaLataria` dá ao vértice neutro de que ele nasceu, com a mesma
 * lataria e os mesmos vincos das vistas obrigatórias; a conta acompanha a malha editada (a peça refeita sem a receita, como depois
 * de uma junta); a peça sem lataria tem a curvatura inteira e a legenda diz isso; a seleção não tinge a cor que a visão mede; e
 * desfazer devolve os materiais, as luzes e a sombra como estavam, sem resto. O shader da zebra e o pixel de cada visão são
 * provados no navegador. */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { adaptarThree, idDeOrigem } from '../../autoria/adaptar-three.js';
import { curvaturaDaLataria, malhaDoNeutro } from '../../autoria/curvatura-da-lataria.js';
import { executarReceita } from '../../autoria/executar-receita.js';
import { vincosDaMalha } from '../../autoria/vincos-da-malha.js';
import receitaComVinco from '../../../tools/fixtures/lataria-com-vinco/receita.js';
import receitaSemLataria from '../../../tools/fixtures/acervo/peca-de-prova/receita.js';
import { criarControladorPartes } from '../controlar-partes.js';
import { empacotarNeutro, desempacotarNeutro, impressaoDoNeutro } from './calculo-da-curvatura.js';
import { criarSeletorDeVisao } from './registro-de-visoes.js';
import { estadoDaCurvatura, legendaDaCurvatura } from './visao-curvatura.js';
import { azimuteDaLuzRasante, INTENSIDADE_DA_LUZ } from './visao-luz-rasante.js';
import { superficiesDe } from './materiais-da-visao.js';

function pecaNaCena(receita, { nome, neutro = executarReceita(receita).neutro, comReceita = true } = {}) {
  const adaptado = adaptarThree(neutro, { nome });
  const controlador = criarControladorPartes({ raiz: adaptado.raiz, partes: adaptado.partes });
  const modelo = { nome, neutro, ...(comReceita ? { receita } : {}), ...adaptado };
  return { modelo, controlador, contexto: (ambiente) => ({ grupo: adaptado.raiz, controlador, ambiente, modelo }) };
}

function estudio() {
  const scene = new THREE.Scene();
  const hemisferio = new THREE.HemisphereLight('#ffffff', '#829088', 2.15);
  const principal = new THREE.DirectionalLight('#fff8ec', 4.4);
  principal.castShadow = true;
  const apagadaDeAntes = new THREE.DirectionalLight('#ffffff', 1);
  apagadaDeAntes.visible = false;
  scene.add(hemisferio, principal, apagadaDeAntes);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 100);
  /* de cima, olhando para baixo, com a frente (+z) embaixo da imagem */
  camera.position.set(0.4, 5, 0.3);
  camera.up.set(0, 0, -1);
  camera.lookAt(0.4, 0, 0.3);
  return { scene, camera, luzes: [hemisferio, principal, apagadaDeAntes] };
}

async function esperarConta(ambiente, contas) {
  for (let i = 0; i < 400; i++) {
    const e = estadoDaCurvatura(ambiente);
    if (e.ultimo?.contas >= contas && !e.emVoo && !e.pendente) return e;
    await new Promise((r) => setTimeout(r, 10));
  }
  throw new Error('a conta da curvatura não terminou');
}

/* A cor de cada canto da cena contra a do módulo no vértice neutro de que ele nasceu. */
function conferirCores(grupo, referencia, ids) {
  const indice = new Map(ids.map((id, k) => [id, k]));
  let cantos = 0;
  let maior = 0;
  for (const malha of superficiesDe(grupo)) {
    const cor = malha.geometry.getAttribute('color');
    const origem = malha.geometry.getAttribute('origemVertice');
    for (let i = 0; i < cor.count; i++) {
      const k = indice.get(idDeOrigem(origem, i));
      for (let c = 0; c < 3; c++) maior = Math.max(maior, Math.abs(cor.getComponent(i, c) - referencia.cores[3 * k + c]));
      cantos++;
    }
  }
  return { cantos, maior };
}

describe('curvatura na bancada', () => {
  it('pinta cada canto com a cor do módulo no vértice neutro, refaz na malha editada e desfaz sem resto', async () => {
    const ambiente = estudio();
    const peca = pecaNaCena(receitaComVinco, { nome: 'lataria-com-vinco' });
    const original = superficiesDe(peca.modelo.raiz).map((m) => m.material);
    const seletor = criarSeletorDeVisao();
    seletor.prender(peca.contexto(ambiente));
    seletor.escolher('curvatura');

    const material = superficiesDe(peca.modelo.raiz)[0].material;
    expect(material.isMeshBasicMaterial).toBe(true);
    expect(material.vertexColors).toBe(true);
    expect(material.toneMapped).toBe(false);

    let estado = await esperarConta(ambiente, 1);
    /* a referência é a das vistas obrigatórias: a lataria do plano, os vincos da receita e os triângulos do estado neutro */
    const executada = executarReceita(receitaComVinco);
    const malha = malhaDoNeutro(executada.neutro);
    const referencia = curvaturaDaLataria({ ...malha, lataria: ['chapa'], vincos: vincosDaMalha(receitaComVinco, executada) });
    expect(estado.resultado.escala).toBe(referencia.escala);
    expect(estado.resultado.semLataria).toBe(false);
    expect(estado.resultado.vincos).toEqual(['quina']);
    expect(estado.resultado.contagens).toEqual(referencia.contagens);
    const conferido = conferirCores(peca.modelo.raiz, referencia, malha.ids);
    expect(conferido.cantos).toBeGreaterThan(0);
    expect(conferido.maior).toBe(0);

    /* a seleção marca pelo fantasma das outras partes e não tinge a cor que a visão mede */
    peca.controlador.selecionar('chapa');
    expect(material.color.getHexString()).toBe('ffffff');
    expect(material.emissive).toBeUndefined();

    /* a peça refeita com a malha editada (como depois de um arrasto de junta) chega sem a receita e com o mesmo nome */
    const editado = { V: new Map([...executada.neutro.V].map(([id, p]) => [id, [p[0], p[1] + 0.02 * Math.sin(8 * p[0]) * p[2], p[2]]])), F: executada.neutro.F };
    const refeita = pecaNaCena(receitaComVinco, { nome: 'lataria-com-vinco', neutro: editado, comReceita: false });
    seletor.prender(refeita.contexto(ambiente));
    estado = await esperarConta(ambiente, 2);
    const malhaEditada = malhaDoNeutro(editado);
    const referenciaEditada = curvaturaDaLataria({
      ...malhaEditada, lataria: ['chapa'], vincos: vincosDaMalha(receitaComVinco, { entrada: executada.entrada, neutro: editado }),
    });
    expect(estado.resultado.escala).toBe(referenciaEditada.escala);
    expect(estado.resultado.escala).not.toBe(referencia.escala);
    expect(conferirCores(refeita.modelo.raiz, referenciaEditada, malhaEditada.ids).maior).toBe(0);

    seletor.escolher('solida');
    for (const m of superficiesDe(refeita.modelo.raiz)) {
      expect(m.material.isMeshStandardMaterial).toBe(true);
      expect(m.geometry.getAttribute('color')).toBeUndefined();
    }
    expect(estadoDaCurvatura(ambiente).ativa).toBe(false);
    /* a primeira peça saiu da cena com a visão ligada; os materiais dela não voltam, e ninguém os desenha mais */
    expect(original.every((m) => m.isMeshStandardMaterial)).toBe(true);
  });

  it('a peça sem lataria tem a curvatura da peça inteira, e a legenda diz isso', async () => {
    const ambiente = estudio();
    const peca = pecaNaCena(receitaSemLataria, { nome: 'peca-de-prova' });
    const seletor = criarSeletorDeVisao({ inicial: 'curvatura' });
    seletor.prender(peca.contexto(ambiente));
    const estado = await esperarConta(ambiente, 1);
    expect(estado.resultado.semLataria).toBe(true);
    const malha = malhaDoNeutro(peca.modelo.neutro);
    expect(conferirCores(peca.modelo.raiz, curvaturaDaLataria(malha), malha.ids).maior).toBe(0);
    const legenda = legendaDaCurvatura(estado.resultado);
    expect(legenda.titulo).toMatch(/peça inteira/);
    expect(legenda.linhas.map((l) => l.texto).join(' ')).toMatch(/não tem lataria/);
    seletor.escolher('solida');
  });

  it('o estado neutro empacotado volta igual, e a impressão muda quando um vértice anda', () => {
    const { neutro } = executarReceita(receitaComVinco);
    const volta = desempacotarNeutro(empacotarNeutro(neutro));
    expect(malhaDoNeutro(volta)).toEqual(malhaDoNeutro(neutro));
    const antes = impressaoDoNeutro(neutro);
    const [id, p] = [...neutro.V][100];
    neutro.V.set(id, [p[0], p[1] + 1e-4, p[2]]);
    expect(impressaoDoNeutro(neutro)).not.toBe(antes);
  });
});

describe('zebra e luz rasante na bancada', () => {
  it('a zebra troca o material pelo das listras, acompanha a seleção sem tingir e desfaz sem resto', () => {
    const ambiente = estudio();
    const peca = pecaNaCena(receitaComVinco, { nome: 'lataria-com-vinco' });
    const doAutor = superficiesDe(peca.modelo.raiz).map((m) => m.material);
    const seletor = criarSeletorDeVisao();
    seletor.prender(peca.contexto(ambiente));
    seletor.escolher('zebra');
    const zebra = superficiesDe(peca.modelo.raiz)[0].material;
    expect(zebra.customProgramCacheKey()).toBe('visao-zebra');
    expect(zebra.toneMapped).toBe(false);
    /* o shader troca a cor pela listra do reflexo */
    const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader };
    zebra.onBeforeCompile(shader);
    expect(shader.fragmentShader).toMatch(/reflect\(zebraOlhar, zebraNormal\)/);
    expect(shader.vertexShader).toMatch(/vZebraNormal = normalize/);
    expect(shader.uniforms.uZebraFrequencia.value).toBe(40);

    peca.controlador.selecionar('chapa');
    peca.controlador.definirModo('isolar');
    expect(zebra.color.getHexString()).toBe('ffffff');
    /* isolada, a parte escolhida sai sem destaque; com todas à vista, ela é a destacada */
    peca.controlador.definirModo('todas');
    seletor.escolher('solida');
    expect(superficiesDe(peca.modelo.raiz).map((m) => m.material)).toEqual(doAutor);
    /* o material do autor recebe a seleção em vigor ao voltar */
    expect(doAutor[0].emissiveIntensity).toBeCloseTo(0.55, 6);
  });

  it('a luz rasante apaga o estúdio, acende um sol com sombra que a peça nova reaproveita, e desfaz como estava', () => {
    const ambiente = estudio();
    const visiveisAntes = ambiente.luzes.map((l) => l.visible);
    const filhosAntes = ambiente.scene.children.length;
    const peca = pecaNaCena(receitaComVinco, { nome: 'lataria-com-vinco' });
    const seletor = criarSeletorDeVisao();
    seletor.prender(peca.contexto(ambiente));
    seletor.escolher('luz-rasante');

    const sois = () => ambiente.scene.children.filter((o) => o.isDirectionalLight && o.name === '__luz_rasante__');
    expect(ambiente.luzes.map((l) => l.visible)).toEqual([false, false, false]);
    expect(sois()).toHaveLength(1);
    expect(sois()[0].castShadow).toBe(true);
    expect(sois()[0].intensity).toBeCloseTo(INTENSIDADE_DA_LUZ, 12);
    const fosco = superficiesDe(peca.modelo.raiz)[0].material;
    expect(fosco.isMeshLambertMaterial).toBe(true);
    expect(fosco.toneMapped).toBe(false);
    /* a chapa vista de cima: a direção sai da escolha pela vista, e fica com a peça refeita */
    const azimute = azimuteDaLuzRasante(ambiente);
    expect(Number.isFinite(azimute)).toBe(true);
    const refeita = pecaNaCena(receitaComVinco, { nome: 'lataria-com-vinco', neutro: peca.modelo.neutro, comReceita: false });
    seletor.prender(refeita.contexto(ambiente));
    expect(sois()).toHaveLength(1);
    expect(azimuteDaLuzRasante(ambiente)).toBe(azimute);
    expect(ambiente.luzes.map((l) => l.visible)).toEqual([false, false, false]);

    seletor.escolher('solida');
    expect(sois()).toHaveLength(0);
    expect(ambiente.scene.children.length).toBe(filhosAntes);
    expect(ambiente.luzes.map((l) => l.visible)).toEqual(visiveisAntes);
    expect(superficiesDe(refeita.modelo.raiz).every((m) => m.material.isMeshStandardMaterial)).toBe(true);
  });

  it('a captura suspende a visão de superfície e a retoma depois, sem herdar nada', () => {
    const ambiente = estudio();
    const peca = pecaNaCena(receitaComVinco, { nome: 'lataria-com-vinco' });
    const seletor = criarSeletorDeVisao({ inicial: 'luz-rasante' });
    seletor.prender(peca.contexto(ambiente));
    seletor.suspender();
    expect(ambiente.scene.children.some((o) => o.name === '__luz_rasante__')).toBe(false);
    expect(ambiente.luzes[0].visible).toBe(true);
    expect(superficiesDe(peca.modelo.raiz).every((m) => m.material.isMeshStandardMaterial)).toBe(true);
    seletor.retomar();
    expect(ambiente.scene.children.some((o) => o.name === '__luz_rasante__')).toBe(true);
    seletor.escolher('solida');
  });
});
