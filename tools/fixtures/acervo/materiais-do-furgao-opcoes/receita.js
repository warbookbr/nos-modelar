/* materiais-do-furgao-opcoes/receita.js — peça de prova das opções de material dos grupos do furgão ainda em cor chapada (plano de materiais realistas, etapa de materiais do furgão).
 *
 * POR QUE ELA EXISTE. Antes de a receita do furgão ganhar aspereza, verniz ou relevo na borracha, na grade, no aro cinza, na lâmpada, no interior, nos espelhos e nos detalhes,
 * a pessoa escolhe por imagem, como fez em `materiais-de-prova`. Cada grupo é uma fileira de amostras (A, B, C) em formas pequenas parecidas com as do furgão: uma faixa de
 * borracha, um trecho de grade, um aro com a lâmpada, um assento com piso, divisória e painel, um espelho com a carcaça, e uma maçaneta com antena. A opção A de cada grupo é, sempre
 * que possível, o material que o furgão tem hoje. Todas as entradas usam só os campos que `src/autoria/material-da-receita.js` já aceita; não há paleta nova.
 *
 * ELA NÃO É CONTEÚDO. Mora em `tools/fixtures/acervo/` junto das outras receitas de ensaio, fora do acervo publicado.
 *
 * Referencial: Y para cima, o chão em y = 0, de frente para +z; cada grupo ocupa uma faixa de x (900 mm entre grupos) e as opções A, B e C ficam 260 mm entre centros dentro dela. */

const m = (mm) => mm / 1000;

export const TABELA = {
  passo: 260,
  passoDoGrupo: 900,
  /* a faixa de borracha do vão: comprimento, altura e espessura */
  faixaLargura: 180, faixaAltura: 22, faixaEspessura: 10,
  /* o trecho de grade: placa, número de ripas, altura e espessura da ripa, e o quanto a ripa avança */
  grade: { largura: 190, altura: 110, espessura: 8, ripas: 5, ripaAltura: 12, ripaAvanco: 8 },
  /* o aro cinza do farol (revolução) e a lâmpada dentro dele */
  aro: { raioFora: 80, raioDentro: 58, profundidade: 26 },
  lampada: { raio: 30, altura: 44, lados: 40 },
  /* o interior: assento, encosto, piso, divisória, painel e forro */
  assento: { largura: 120, altura: 40, profundidade: 110 },
  encosto: { largura: 120, altura: 110, profundidade: 30 },
  piso: { largura: 200, altura: 6, profundidade: 150 },
  divisoria: { largura: 160, altura: 120, espessura: 8 },
  painel: { largura: 110, altura: 50, espessura: 12 },
  forro: { largura: 70, altura: 6, profundidade: 70 },
  /* o espelho: o vidro (largura, altura, espessura, raio dos cantos), a carcaça atrás e a borda da carcaça em volta do vidro */
  espelho: { largura: 110, altura: 160, espessura: 3, canto: 14, carcacaBorda: 12, carcacaEspessura: 40 },
  /* a maçaneta: alça, pé e placa; a antena: pé e haste */
  alca: { comprimento: 110, altura: 18, fora: 14, espessura: 8 },
  placa: { largura: 140, altura: 50, espessura: 6 },
  antena: { peLargura: 70, peAltura: 18, peProfundidade: 40, hasteAltura: 130, raioBase: 4, raioPonta: 2, lados: 14 },
  lados: 48,
};

export const GRUPOS = ['borracha', 'grade', 'aroCinza', 'lampada', 'interior', 'espelho', 'detalhes'];
export const OPCOES = ['A', 'B', 'C'];

/* o que cada grupo mostra: o nome das partes (sem a letra da opção) */
export const PARTES_DO_GRUPO = {
  borracha: ['faixaDeBorracha'],
  grade: ['placaDaGrade', 'ripa1', 'ripa2', 'ripa3', 'ripa4', 'ripa5'],
  aroCinza: ['aroCinza'],
  lampada: ['aroDeApoio', 'lampada'],
  interior: ['assento', 'encosto', 'piso', 'divisoria', 'painelEscuro', 'forro'],
  espelho: ['carcacaDoEspelho', 'espelhoPlano'],
  detalhes: ['placaDaMacaneta', 'alcaDaMacaneta', 'peDaAntena', 'hasteDaAntena'],
};
export const nomeDaParte = (grupo, opcao, parte) => `${grupo}${opcao}${parte[0].toUpperCase()}${parte.slice(1)}`;

/* As opções. A de cada grupo marcada "hoje" é a do furgão como está; as outras são as propostas.
   Os valores de `plastico` e `plasticoLiso` são os da receita do furgão. */
const PLASTICO = { tipo: 'liso', cor: '#141416', aspereza: 0.5, metalicidade: 0, verniz: 0.6, asperezaDoVerniz: 0.35, relevo: { tipo: 'granulado', escala: 0.4, intensidade: 0.35 } };
const PLASTICO_LISO = { tipo: 'liso', cor: '#141416', aspereza: 0.5, metalicidade: 0, verniz: 0.6, asperezaDoVerniz: 0.35 };

export const MATERIAIS = {
  /* borracha de vão (hoje: cor chapada, sem aspereza declarada) */
  borrachaA: { tipo: 'liso', cor: '#26262b' },
  borrachaB: { tipo: 'liso', cor: '#26262b', aspereza: 0.92, metalicidade: 0 },
  borrachaC: { tipo: 'liso', cor: '#26262b', aspereza: 0.92, metalicidade: 0, relevo: { tipo: 'granulado', escala: 0.8, intensidade: 0.5 } },

  /* grade (hoje: cor chapada com aspereza 0,7) */
  gradeA: { tipo: 'liso', cor: '#1d1e21', aspereza: 0.7 },
  gradeB: { ...PLASTICO, cor: '#1d1e21' },
  gradeC: { tipo: 'liso', cor: '#17181a', aspereza: 0.95, metalicidade: 0, relevo: { tipo: 'granulado', escala: 0.6, intensidade: 0.45 } },

  /* aro cinza do farol (hoje: cinza chapado, aspereza 0,6) */
  aroCinzaA: { tipo: 'liso', cor: '#4a4c52', aspereza: 0.6 },
  aroCinzaB: { tipo: 'liso', cor: '#4a4c52', aspereza: 0.45, metalicidade: 0, verniz: 0.5, asperezaDoVerniz: 0.3 },
  aroCinzaC: { tipo: 'metal', acabamento: 'pintado', cor: '#7b7f87', aspereza: 0.3, metalicidade: 0.85, verniz: 0.5, asperezaDoVerniz: 0.35 },
  aroDeApoio: { tipo: 'liso', cor: '#4a4c52', aspereza: 0.6 },

  /* lâmpada do farol (hoje: creme chapado, aspereza 0,35) */
  lampadaA: { tipo: 'liso', cor: '#f6f1da', aspereza: 0.35 },
  lampadaB: { tipo: 'liso', cor: '#f6f1da', mistura: 'transparente', opacidade: 0.55, aspereza: 0.6, metalicidade: 0, verniz: 0.6, asperezaDoVerniz: 0.1 },
  lampadaC: { tipo: 'liso', cor: '#ffe9a8', aspereza: 0.35, emissivo: 2 },

  /* interior: assento, piso, divisória, painel e forro (hoje: tudo cor chapada) */
  bancoA: { tipo: 'liso', cor: '#3d4048' },
  pisoA: { tipo: 'liso', cor: '#2c2d31' },
  divisoriaA: { tipo: 'liso', cor: '#5a5d66' },
  painelEscuroA: { tipo: 'liso', cor: '#26272b' },
  forroA: { tipo: 'liso', cor: '#1b1c1f' },
  /* B: tecido fosco com granulado, e o resto fosco com granulado fino */
  bancoB: { tipo: 'tecido', cor: '#3d4048', aspereza: 0.95, metalicidade: 0, relevo: { tipo: 'granulado', escala: 1.2, intensidade: 0.7 } },
  pisoB: { tipo: 'liso', cor: '#2c2d31', aspereza: 0.9, metalicidade: 0, relevo: { tipo: 'granulado', escala: 0.6, intensidade: 0.45 } },
  divisoriaB: { tipo: 'liso', cor: '#5a5d66', aspereza: 0.85, metalicidade: 0, relevo: { tipo: 'granulado', escala: 0.5, intensidade: 0.35 } },
  painelEscuroB: { tipo: 'liso', cor: '#26272b', aspereza: 0.85, metalicidade: 0, relevo: { tipo: 'granulado', escala: 0.5, intensidade: 0.35 } },
  forroB: { tipo: 'tecido', cor: '#1b1c1f', aspereza: 0.95, metalicidade: 0, relevo: { tipo: 'granulado', escala: 1, intensidade: 0.5 } },
  /* C: assento de courino acetinado, piso emborrachado de granulado grosso, painel e divisória de plástico acetinado, forro fosco liso */
  bancoC: { tipo: 'liso', cor: '#3d4048', aspereza: 0.5, metalicidade: 0, verniz: 0.25, asperezaDoVerniz: 0.3 },
  pisoC: { tipo: 'liso', cor: '#2c2d31', aspereza: 0.92, metalicidade: 0, relevo: { tipo: 'granulado', escala: 2.5, intensidade: 0.7 } },
  divisoriaC: { tipo: 'liso', cor: '#5a5d66', aspereza: 0.5, metalicidade: 0, verniz: 0.5, asperezaDoVerniz: 0.3 },
  painelEscuroC: { tipo: 'liso', cor: '#26272b', aspereza: 0.5, metalicidade: 0, verniz: 0.6, asperezaDoVerniz: 0.35, relevo: { tipo: 'granulado', escala: 0.4, intensidade: 0.35 } },
  forroC: { tipo: 'liso', cor: '#1b1c1f', aspereza: 0.9, metalicidade: 0 },

  /* espelho dos retrovisores (hoje: `refletor`, cromo claro) e a carcaça preta atrás dele (o `plastico` do furgão) */
  espelhoA: { tipo: 'metal', acabamento: 'pintado', cor: '#e8eaed', aspereza: 0.22, metalicidade: 0.75 },
  espelhoB: { tipo: 'metal', acabamento: 'pintado', cor: '#6c727b', aspereza: 0.12, metalicidade: 0.9 },
  espelhoC: { tipo: 'metal', acabamento: 'pintado', cor: '#a9bccb', aspereza: 0.1, metalicidade: 0.85, verniz: 0.4, asperezaDoVerniz: 0.05 },
  carcacaDoEspelho: PLASTICO,

  /* maçaneta e antena (hoje: `plasticoLiso`) e a placa da maçaneta (hoje: o azul da lataria, já aprovado) */
  detalheA: PLASTICO_LISO,
  detalheB: { tipo: 'liso', cor: '#141416', aspereza: 0.85, metalicidade: 0 },
  detalheC: { tipo: 'liso', cor: '#141416', aspereza: 0.3, metalicidade: 0, verniz: 1, asperezaDoVerniz: 0.05 },
  azul: { tipo: 'liso', cor: '#3350b0', aspereza: 0.5, metalicidade: 0.05, verniz: 0.8, asperezaDoVerniz: 0.12 },
};

/* o material de cada parte, por grupo e opção */
const MATERIAL_DA_PARTE = (grupo, opcao, parte) => {
  switch (grupo) {
    case 'borracha': return `borracha${opcao}`;
    case 'grade': return `grade${opcao}`;
    case 'aroCinza': return `aroCinza${opcao}`;
    case 'lampada': return parte === 'aroDeApoio' ? 'aroDeApoio' : `lampada${opcao}`;
    case 'interior': return `${parte === 'assento' || parte === 'encosto' ? 'banco' : parte}${opcao}`;
    case 'espelho': return parte === 'carcacaDoEspelho' ? 'carcacaDoEspelho' : `espelho${opcao}`;
    case 'detalhes': return parte === 'placaDaMacaneta' ? 'azul' : `detalhe${opcao}`;
    default: throw new Error(grupo);
  }
};

const retanguloArredondado = (larg, alt, canto, passos = 6) => {
  const pts = [];
  const c = [[larg / 2 - canto, alt / 2 - canto, 0], [-larg / 2 + canto, alt / 2 - canto, 90], [-larg / 2 + canto, -alt / 2 + canto, 180], [larg / 2 - canto, -alt / 2 + canto, 270]];
  for (const [cx, cy, a0] of c) for (let i = 0; i <= passos; i++) {
    const a = ((a0 + (90 * i) / passos) * Math.PI) / 180;
    pts.push([m(cx + canto * Math.cos(a)), m(cy + canto * Math.sin(a))]);
  }
  return pts;
};

export function gerarPassos(t = TABELA) {
  const passos = [];
  let id = 100;
  const xDe = (g, o) => m(GRUPOS.indexOf(g) * t.passoDoGrupo + (OPCOES.indexOf(o) - 1) * t.passo);
  const parte = (grupo, opcao, nome, sel) => {
    passos.push(['parte', { nome: nomeDaParte(grupo, opcao, nome), sel }]);
    passos.push(['material', { sel, usa: MATERIAL_DA_PARTE(grupo, opcao, nome) }]);
  };
  const caixa = (grupo, opcao, nome, larg, alt, prof, dx, y, z) => {
    const origemId = id++;
    passos.push(['cubo', { origemId, larg: m(larg), alt: m(alt), prof: m(prof), em: [xDe(grupo, opcao) + m(dx), m(y), m(z)] }]);
    parte(grupo, opcao, nome, { origem: { op: 'cubo', id: origemId } });
  };
  const revolucao = (grupo, opcao, nome, perfil, dx, y, z, lados, angulo) => {
    const origemId = id++;
    passos.push(['lathe', { origemId, lados, em: [xDe(grupo, opcao) + m(dx), m(y), m(z)], perfil }]);
    if (angulo) passos.push(['liso', { angulo, sel: { origem: { op: 'lathe', id: origemId } } }]);
    parte(grupo, opcao, nome, { origem: { op: 'lathe', id: origemId } });
  };

  for (const o of OPCOES) {
    /* borracha: a faixa do vão */
    caixa('borracha', o, 'faixaDeBorracha', t.faixaLargura, t.faixaAltura, t.faixaEspessura, 0, 0, 0);

    /* grade: a placa de fundo e as ripas que avançam dela */
    const g = t.grade;
    caixa('grade', o, 'placaDaGrade', g.largura, g.altura, g.espessura, 0, 0, 0);
    for (let i = 0; i < g.ripas; i++) {
      const folga = (g.altura - g.ripas * g.ripaAltura) / (g.ripas + 1);
      caixa('grade', o, `ripa${i + 1}`, g.largura, g.ripaAltura, g.ripaAvanco, 0, folga + i * (g.ripaAltura + folga), (g.espessura + g.ripaAvanco) / 2);
    }

    /* aro cinza: revolução com o eixo em y, deitada por um passo de revolução e posta de pé pelo perfil; aqui o eixo é y e a boca olha para cima, então o aro fica de pé em uma base baixa */
    const a = t.aro;
    revolucao('aroCinza', o, 'aroCinza', [[m(a.raioDentro), 0], [m(a.raioFora), 0], [m(a.raioFora), m(a.profundidade)], [m(a.raioDentro), m(a.profundidade)], [m(a.raioDentro), 0]], 0, 0, 0, t.lados, 60);

    /* lâmpada: o aro de apoio (cinza como está) com a lâmpada de revolução dentro dele */
    revolucao('lampada', o, 'aroDeApoio', [[m(a.raioDentro), 0], [m(a.raioFora), 0], [m(a.raioFora), m(a.profundidade)], [m(a.raioDentro), m(a.profundidade)], [m(a.raioDentro), 0]], 0, 0, 0, t.lados, 60);
    const l = t.lampada;
    const perfilLampada = [[0, 0], [m(l.raio * 0.55), 0], [m(l.raio * 0.55), m(l.altura * 0.25)], [m(l.raio * 0.98), m(l.altura * 0.45)]];
    for (let i = 1; i <= 8; i++) { const k = (i / 8) * (Math.PI / 2); perfilLampada.push([m(l.raio) * Math.cos(k), m(l.altura * 0.45) + m(l.altura * 0.55) * Math.sin(k)]); }
    perfilLampada[perfilLampada.length - 1][0] = 0;
    revolucao('lampada', o, 'lampada', perfilLampada, 0, 0, 0, t.lados, 75);

    /* interior: o assento com o encosto atrás, o piso embaixo, a divisória e o painel atrás, o forro ao lado */
    const as = t.assento; const en = t.encosto; const pi = t.piso; const di = t.divisoria; const pa = t.painel; const fo = t.forro;
    caixa('interior', o, 'piso', pi.largura, pi.altura, pi.profundidade, 0, 0, 0);
    caixa('interior', o, 'assento', as.largura, as.altura, as.profundidade, 0, pi.altura, 15);
    caixa('interior', o, 'encosto', en.largura, en.altura, en.profundidade, 0, pi.altura + as.altura, -as.profundidade / 2 + 15 - en.profundidade / 2 + 15);
    caixa('interior', o, 'divisoria', di.largura, di.altura, di.espessura, 0, pi.altura, -pi.profundidade / 2 - di.espessura / 2);
    caixa('interior', o, 'painelEscuro', pa.largura, pa.altura, pa.espessura, 0, pi.altura + di.altura + 6, -pi.profundidade / 2 - pa.espessura / 2);
    caixa('interior', o, 'forro', fo.largura, fo.altura, fo.profundidade, 0, pi.altura + di.altura + pa.altura + 18, -pi.profundidade / 2 + 20);
    void fo;

    /* espelho: a carcaça preta (uma caixa de borda larga em volta do vidro) e o vidro rebaixado na frente dela */
    const e = t.espelho;
    caixa('espelho', o, 'carcacaDoEspelho', e.largura + 2 * e.carcacaBorda, e.altura + 2 * e.carcacaBorda, e.carcacaEspessura, 0, 0, 0);
    {
      const origemId = id++;
      passos.push(['extrusao', {
        origemId, eixo: 'z', altura: m(e.espessura), perfil: retanguloArredondado(e.largura, e.altura, e.canto),
        em: [xDe('espelho', o), m(e.altura / 2 + e.carcacaBorda), m(e.carcacaEspessura / 2 - 2)],
      }]);
      parte('espelho', o, 'espelhoPlano', { origem: { op: 'extrusao', id: origemId } });
    }

    /* maçaneta e antena: a placa (azul), a alça fora dela, o pé da antena e a haste */
    const al = t.alca; const pl = t.placa; const an = t.antena;
    caixa('detalhes', o, 'placaDaMacaneta', pl.largura, pl.altura, pl.espessura, 0, 0, 0);
    caixa('detalhes', o, 'alcaDaMacaneta', al.comprimento, al.altura, al.espessura, 0, (pl.altura - al.altura) / 2, pl.espessura / 2 + al.fora / 2);
    caixa('detalhes', o, 'peDaAntena', an.peLargura, an.peAltura, an.peProfundidade, 0, pl.altura + 30, 0);
    revolucao('detalhes', o, 'hasteDaAntena', [[0, 0], [m(an.raioBase), 0], [m(an.raioPonta), m(an.hasteAltura)], [0, m(an.hasteAltura)]], 0, pl.altura + 30 + an.peAltura - 6, 0, an.lados, 40);
  }
  return passos;
}

export const receitaMateriaisDoFurgaoOpcoes = {
  meta: {
    nome: 'Opções de material do furgão',
    versao: '1.0.0',
    autor: 'Modelar',
    desc: 'ensaio das opções A, B e C de material dos grupos do furgão ainda em cor chapada (borracha de vão, grade, aro cinza, lâmpada, interior, espelho dos retrovisores, maçaneta e antena), em amostras pequenas lado a lado; não é conteúdo do acervo',
  },
  PARAMS: TABELA,
  MATERIAIS,
  get PASSOS() { return gerarPassos(this.PARAMS); },
};

export default receitaMateriaisDoFurgaoOpcoes;
