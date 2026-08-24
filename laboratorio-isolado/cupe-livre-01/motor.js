/* Motor WebGL autocontido do experimento. Sem dependências, imports ou assets. */
(function () {
  'use strict';

  const receita = window.RECEITA_CUPE_LIVRE;
  if (!receita) throw new Error('receita-cupe.js precisa ser carregada antes de motor.js');

  const canvas = document.getElementById('cena');
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, premultipliedAlpha: false });
  if (!gl) throw new Error('WebGL2 não está disponível neste navegador.');

  const VERTEX = `#version 300 es
    precision highp float;
    layout(location=0) in vec3 aPosicao;
    layout(location=1) in vec3 aNormal;
    uniform mat4 uVistaProjecao;
    out vec3 vPosicao;
    out vec3 vNormal;
    void main(){
      vPosicao=aPosicao;
      vNormal=aNormal;
      gl_Position=uVistaProjecao*vec4(aPosicao,1.0);
    }`;

  const FRAGMENT = `#version 300 es
    precision highp float;
    in vec3 vPosicao;
    in vec3 vNormal;
    uniform vec3 uCamera;
    uniform vec3 uCor;
    uniform float uMetalico;
    uniform float uRugosidade;
    uniform float uAlfa;
    uniform float uEmissao;
    out vec4 saida;
    void main(){
      vec3 N=normalize(vNormal);
      if(!gl_FrontFacing) N=-N;
      vec3 V=normalize(uCamera-vPosicao);
      vec3 L1=normalize(vec3(-3.5,6.0,5.0)-vPosicao);
      vec3 L2=normalize(vec3(4.0,2.8,-4.0)-vPosicao);
      float d1=max(dot(N,L1),0.0);
      float d2=max(dot(N,L2),0.0);
      vec3 H=normalize(L1+V);
      float expo=mix(120.0,10.0,uRugosidade);
      float spec=pow(max(dot(N,H),0.0),expo)*mix(0.32,1.25,uMetalico);
      float fres=pow(1.0-max(dot(N,V),0.0),5.0);
      vec3 ambiente=uCor*vec3(0.10,0.115,0.14);
      vec3 difusa=uCor*(d1*0.78+d2*0.24);
      vec3 reflexo=mix(vec3(0.92),uCor,uMetalico)*(spec+fres*(0.08+uMetalico*0.20));
      vec3 cor=ambiente+difusa+reflexo+uCor*uEmissao;
      cor=cor/(cor+vec3(1.0));
      cor=pow(cor,vec3(1.0/2.2));
      saida=vec4(cor,uAlfa);
    }`;

  function shader(tipo, fonte) {
    const s = gl.createShader(tipo); gl.shaderSource(s, fonte); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const programa = gl.createProgram();
  gl.attachShader(programa, shader(gl.VERTEX_SHADER, VERTEX));
  gl.attachShader(programa, shader(gl.FRAGMENT_SHADER, FRAGMENT));
  gl.linkProgram(programa);
  if (!gl.getProgramParameter(programa, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(programa));
  gl.useProgram(programa);

  const uniformes = Object.fromEntries(['uVistaProjecao', 'uCamera', 'uCor', 'uMetalico', 'uRugosidade', 'uAlfa', 'uEmissao']
    .map((nome) => [nome, gl.getUniformLocation(programa, nome)]));

  const grupos = new Map();
  function grupo(material) {
    if (!grupos.has(material)) grupos.set(material, { material, posicoes: [], indices: [] });
    return grupos.get(material);
  }
  function inserir(material, posicoes, indices) {
    const g = grupo(material), base = g.posicoes.length / 3;
    g.posicoes.push(...posicoes); g.indices.push(...indices.map((i) => i + base));
  }

  const mix = (a, b, t) => a + (b - a) * t;
  const suave = (t) => t * t * (3 - 2 * t);
  const normalizar = (v) => { const n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; };
  const cruz = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

  function interpolarSecoes(secoes, subdivisoes) {
    const saida = [];
    for (let i = 0; i < secoes.length - 1; i++) {
      const a = secoes[i], b = secoes[i + 1], chaves = Object.keys(a);
      for (let j = 0; j < subdivisoes; j++) {
        const t = suave(j / subdivisoes), item = {};
        for (const chave of chaves) item[chave] = typeof a[chave] === 'number' ? mix(a[chave], b[chave], t) : a[chave];
        saida.push(item);
      }
    }
    saida.push({ ...secoes.at(-1) });
    return saida;
  }

  function perfilCarroceria(s) {
    const yBaixo = mix(s.fundo, s.ventre, 0.54);
    const yFlanco = mix(s.ventre, s.cintura, 0.52);
    const ySuperior = mix(s.cintura, s.topo, 0.48);
    const wBaixo = mix(s.wFundo, s.wMax, 0.72);
    const wFlanco = mix(s.wMax, s.wOmbro, 0.54);
    const wCentro = s.wTopo * 0.42;
    return [
      [-s.wFundo, s.fundo], [s.wFundo, s.fundo], [wBaixo, yBaixo],
      [s.wMax, s.ventre], [wFlanco, yFlanco], [s.wOmbro, s.cintura],
      [s.wTopo, ySuperior], [wCentro, s.topo], [-wCentro, s.topo],
      [-s.wTopo, ySuperior], [-s.wOmbro, s.cintura], [-wFlanco, yFlanco],
      [-s.wMax, s.ventre], [-wBaixo, yBaixo],
    ];
  }
  function perfilCabine(s) {
    const yCurva = mix(s.ombro, s.teto, 0.58);
    const wCurva = mix(s.wOmbro, s.wTeto, 0.58);
    return [
      [-s.wBase, s.base], [s.wBase, s.base], [s.wOmbro, s.ombro],
      [wCurva, yCurva], [s.wTeto, s.teto], [-s.wTeto, s.teto],
      [-wCurva, yCurva], [-s.wOmbro, s.ombro],
    ];
  }
  function criarLoft(secoes, perfil, material, subdivisoes, opcoes = {}) {
    const amostras = interpolarSecoes(secoes, subdivisoes), pos = [], ind = [];
    const perfis = amostras.map(perfil), n = perfis[0].length;
    for (let k = 0; k < amostras.length; k++) for (const [x, y] of perfis[k]) pos.push(x, y, amostras[k].z);
    for (let k = 0; k < amostras.length - 1; k++) for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a = k * n + i, b = k * n + j, c = (k + 1) * n + j, d = (k + 1) * n + i;
      if (opcoes.recortarRodas) {
        const arestasLaterais = i === 0 || (i >= 1 && i <= 4) || (i >= 10 && i <= 13);
        if (arestasLaterais) {
          const z = (amostras[k].z + amostras[k + 1].z) / 2;
          const y = (perfis[k][i][1] + perfis[k][j][1] + perfis[k + 1][i][1] + perfis[k + 1][j][1]) / 4;
          const dentroDoArco = receita.rodas.some((roda) => {
            const dz = z - roda.z, raio = roda.raio + 0.045;
            return Math.abs(dz) < raio && (i === 0 || y < roda.y + Math.sqrt(raio * raio - dz * dz) + 0.018);
          });
          if (dentroDoArco) continue;
        }
      }
      ind.push(a, b, c, a, c, d);
    }
    for (let i = 1; i < n - 1; i++) ind.push(0, i + 1, i);
    const base = (amostras.length - 1) * n;
    for (let i = 1; i < n - 1; i++) ind.push(base, base + i, base + i + 1);
    inserir(material, pos, ind);
  }

  function transformarPonto(p, centro, rotacao) {
    let [x, y, z] = p;
    const [rx, ry, rz] = rotacao || [0, 0, 0];
    if (rx) { const c = Math.cos(rx), s = Math.sin(rx), ny = y * c - z * s; z = y * s + z * c; y = ny; }
    if (ry) { const c = Math.cos(ry), s = Math.sin(ry), nx = x * c + z * s; z = -x * s + z * c; x = nx; }
    if (rz) { const c = Math.cos(rz), s = Math.sin(rz), nx = x * c - y * s; y = x * s + y * c; x = nx; }
    return [x + centro[0], y + centro[1], z + centro[2]];
  }

  function caixa(material, centro, tamanho, rotacao = [0, 0, 0]) {
    const [x, y, z] = tamanho.map((v) => v / 2);
    const p = [[-x,-y,-z],[x,-y,-z],[x,y,-z],[-x,y,-z],[-x,-y,z],[x,-y,z],[x,y,z],[-x,y,z]]
      .flatMap((v) => transformarPonto(v, centro, rotacao));
    const i = [0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,3,7,6,3,6,2,0,4,7,0,7,3,1,2,6,1,6,5];
    inserir(material, p, i);
  }

  function prismaZ(material, centroZ, profundidade, pontosXY) {
    const pos = [], ind = [], metade = profundidade / 2, n = pontosXY.length;
    for (const z of [centroZ - metade, centroZ + metade]) for (const [x, y] of pontosXY) pos.push(x, y, z);
    for (let i = 1; i < n - 1; i++) ind.push(0, i + 1, i, n, n + i, n + i + 1);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n; ind.push(i, j, n + j, i, n + j, n + i);
    }
    inserir(material, pos, ind);
  }

  function prismaX(material, centroX, profundidade, pontosYZ) {
    const pos = [], ind = [], metade = profundidade / 2, n = pontosYZ.length;
    for (const x of [centroX - metade, centroX + metade]) for (const [y, z] of pontosYZ) pos.push(x, y, z);
    for (let i = 1; i < n - 1; i++) ind.push(0, i, i + 1, n, n + i + 1, n + i);
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n; ind.push(i, n + i, n + j, i, n + j, j);
    }
    inserir(material, pos, ind);
  }

  function perfilTeto(s) {
    const e = 0.022;
    return [[-s.w, s.y - e], [s.w, s.y - e], [s.w, s.y], [-s.w, s.y]];
  }

  function cilindroX(material, centro, raio, largura, segmentos = 40) {
    const pos = [], ind = [], metade = largura / 2;
    for (const x of [-metade, metade]) for (let i = 0; i < segmentos; i++) {
      const a = 2 * Math.PI * i / segmentos; pos.push(centro[0] + x, centro[1] + Math.sin(a) * raio, centro[2] + Math.cos(a) * raio);
    }
    const ca = pos.length / 3; pos.push(centro[0] - metade, centro[1], centro[2]);
    const cb = pos.length / 3; pos.push(centro[0] + metade, centro[1], centro[2]);
    for (let i = 0; i < segmentos; i++) {
      const j = (i + 1) % segmentos;
      ind.push(ca, j, i, cb, segmentos + i, segmentos + j, i, j, segmentos + j, i, segmentos + j, segmentos + i);
    }
    inserir(material, pos, ind);
  }

  function cilindroZ(material, centro, raio, profundidade, segmentos = 32) {
    const pos = [], ind = [], metade = profundidade / 2;
    for (const z of [-metade, metade]) for (let i = 0; i < segmentos; i++) {
      const a = 2 * Math.PI * i / segmentos; pos.push(centro[0] + Math.cos(a) * raio, centro[1] + Math.sin(a) * raio, centro[2] + z);
    }
    const ca = pos.length / 3; pos.push(centro[0], centro[1], centro[2] - metade);
    const cb = pos.length / 3; pos.push(centro[0], centro[1], centro[2] + metade);
    for (let i = 0; i < segmentos; i++) {
      const j = (i + 1) % segmentos;
      ind.push(ca, i, j, cb, segmentos + j, segmentos + i, i, segmentos + i, segmentos + j, i, segmentos + j, j);
    }
    inserir(material, pos, ind);
  }

  function toroX(material, centro, raioMaior, raioTubo, larguraVisual, segA = 44, segB = 12) {
    const pos = [], ind = [];
    for (let a = 0; a < segA; a++) for (let b = 0; b < segB; b++) {
      const u = 2 * Math.PI * a / segA, v = 2 * Math.PI * b / segB;
      const tuboX = Math.sin(v) * raioTubo * larguraVisual;
      const r = raioMaior + Math.cos(v) * raioTubo;
      pos.push(centro[0] + tuboX, centro[1] + Math.sin(u) * r, centro[2] + Math.cos(u) * r);
    }
    for (let a = 0; a < segA; a++) for (let b = 0; b < segB; b++) {
      const an = (a + 1) % segA, bn = (b + 1) % segB;
      const p = a * segB + b, q = an * segB + b, r = an * segB + bn, s = a * segB + bn;
      ind.push(p, q, r, p, r, s);
    }
    inserir(material, pos, ind);
  }

  function elipsoide(material, centro, raios, segmentosU = 24, segmentosV = 12, rotacao = [0, 0, 0]) {
    const pos = [], ind = [];
    for (let v = 0; v <= segmentosV; v++) for (let u = 0; u < segmentosU; u++) {
      const tv = Math.PI * v / segmentosV, tu = 2 * Math.PI * u / segmentosU;
      pos.push(...transformarPonto([
        Math.sin(tv) * Math.cos(tu) * raios[0],
        Math.cos(tv) * raios[1],
        Math.sin(tv) * Math.sin(tu) * raios[2],
      ], centro, rotacao));
    }
    for (let v = 0; v < segmentosV; v++) for (let u = 0; u < segmentosU; u++) {
      const un = (u + 1) % segmentosU, a = v * segmentosU + u, b = v * segmentosU + un;
      const c = (v + 1) * segmentosU + un, d = (v + 1) * segmentosU + u; ind.push(a, b, c, a, c, d);
    }
    inserir(material, pos, ind);
  }

  function arcoLama(material, lado, roda) {
    const pos = [], ind = [], segmentos = 32, interno = roda.raio + 0.026, externo = interno + 0.038;
    const xFrente = lado * (roda.x + roda.largura / 2 + 0.009), xTras = xFrente - lado * 0.032;
    for (const x of [xTras, xFrente]) for (let i = 0; i <= segmentos; i++) {
      const a = Math.PI * i / segmentos;
      for (const r of [interno, externo]) pos.push(x, roda.y + Math.sin(a) * r, roda.z + Math.cos(a) * r);
    }
    const faixa = (segmentos + 1) * 2;
    for (let camada = 0; camada < 2; camada++) for (let i = 0; i < segmentos; i++) {
      const b = camada * faixa + i * 2, n = b + 2;
      ind.push(b, n, n + 1, b, n + 1, b + 1);
    }
    for (let i = 0; i < segmentos; i++) for (const borda of [0, 1]) {
      const a = i * 2 + borda, b = a + 2, c = faixa + b, d = faixa + a; ind.push(a, d, c, a, c, b);
    }
    inserir(material, pos, ind);
  }

  function criarRoda(roda, lado) {
    const x = lado * roda.x, centro = [x, roda.y, roda.z];
    const tuboPneu = roda.raio * 0.205;
    toroX('pneu', centro, roda.raio - tuboPneu, tuboPneu, roda.largura / (2 * tuboPneu), 56, 16);
    cilindroX('freio', centro, roda.aro * 0.72, roda.largura * 0.16, 44);
    const faceX = x + lado * (roda.largura * 0.36 + 0.008);
    toroX('aluminio', [faceX, roda.y, roda.z], roda.aro * 0.87, roda.aro * 0.085, 0.42, 48, 10);
    caixa('pinca', [x + lado * roda.largura * 0.18, roda.y + roda.aro * 0.08, roda.z - roda.aro * 0.59],
      [roda.largura * 0.16, roda.aro * 0.34, roda.aro * 0.16], [0.18, 0, 0]);
    for (let s = 0; s < 5; s++) {
      const a = 2 * Math.PI * s / 5 + 0.12;
      for (const abertura of [-0.085, 0.085]) {
        const angulo = a + abertura;
        caixa('aluminio', [faceX, roda.y + Math.sin(angulo) * roda.aro * 0.46, roda.z + Math.cos(angulo) * roda.aro * 0.46],
          [0.022, 0.025, roda.aro * 0.72], [-angulo, 0, 0]);
      }
    }
    cilindroX('carroceriaEscura', [faceX + lado * 0.012, roda.y, roda.z], roda.aro * 0.15, 0.032, 28);
    arcoLama('carroceria', lado, roda);
  }

  criarLoft(receita.carroceria.secoes, perfilCarroceria, 'carroceria', receita.carroceria.amostrasEntreSecoes, { recortarRodas: true });
  criarLoft(receita.cabine.secoes, perfilCabine, 'vidro', receita.cabine.amostrasEntreSecoes);
  criarLoft(receita.teto.secoes, perfilTeto, 'carroceria', receita.teto.amostrasEntreSecoes);

  for (const roda of receita.rodas) for (const lado of [-1, 1]) criarRoda(roda, lado);

  /* Soleiras, lâminas aerodinâmicas e separadores de vidro. */
  for (const lado of [-1, 1]) {
    caixa('carbono', [lado * 0.965, 0.145, -0.05], [0.075, 0.085, 2.15]);
    caixa('carroceria', [lado * 0.63, 1.165, -0.18], [0.07, 0.035, 1.02], [0, 0.02 * lado, 0]);
    caixa('carroceriaEscura', [lado * 0.755, 0.91, 0.70], [0.045, 0.055, 0.46], [0.40, 0, 0]);
    caixa('carroceriaEscura', [lado * 0.72, 0.93, -1.01], [0.045, 0.055, 0.38], [-0.52, 0, 0]);
  }
  caixa('carbono', [0, 0.13, 2.08], [1.64, 0.07, 0.48]);
  caixa('carbono', [0, 0.15, -2.10], [1.72, 0.10, 0.42]);
  caixa('carroceriaEscura', [0, 0.43, 2.245], [1.10, 0.20, 0.035]);
  caixa('carbono', [0, 0.31, -2.255], [1.28, 0.22, 0.035]);
  caixa('carroceria', [0, 1.185, -0.18], [0.14, 0.028, 1.35]);

  for (const item of receita.detalhes.farois) {
    caixa('farol', item.centro, item.tamanho, [0, item.inclinacao, 0.03 * item.lado]);
    caixa('carbono', [item.centro[0], item.centro[1] - 0.055, item.centro[2] - 0.02], [item.tamanho[0] * 1.12, 0.035, item.tamanho[2] * 1.32], [0, item.inclinacao, 0.03 * item.lado]);
  }
  for (const item of receita.detalhes.lanternas) cilindroZ('lanterna', item.centro, item.raio, 0.045, 36);
  for (const item of receita.detalhes.entradasLaterais) caixa('carbono', item.centro, item.tamanho, [0, 0, -0.20 * item.lado]);
  for (const item of receita.detalhes.espelhos) {
    caixa('carroceriaEscura', [item.centro[0] * 0.92, item.centro[1] - 0.04, item.centro[2] - 0.02], [0.035, 0.24, 0.045], [0, 0, -0.45 * item.lado]);
    elipsoide('carroceria', item.centro, [0.16, 0.075, 0.115], 24, 10);
    elipsoide('vidro', [item.centro[0] + item.lado * 0.018, item.centro[1], item.centro[2] - 0.018], [0.13, 0.055, 0.085], 20, 8);
  }
  for (const lado of [-1, 1]) cilindroZ('aluminio', [lado * 0.27, 0.37, -2.28], 0.075, 0.08, 28);

  /* Piso neutro da prova. */
  caixa('piso', [0, -0.035, 0], [12, 0.04, 12]);

  function normaisSuaves(posicoes, indices) {
    const n = new Float32Array(posicoes.length);
    for (let i = 0; i < indices.length; i += 3) {
      const ia = indices[i] * 3, ib = indices[i + 1] * 3, ic = indices[i + 2] * 3;
      const ab = [posicoes[ib] - posicoes[ia], posicoes[ib + 1] - posicoes[ia + 1], posicoes[ib + 2] - posicoes[ia + 2]];
      const ac = [posicoes[ic] - posicoes[ia], posicoes[ic + 1] - posicoes[ia + 1], posicoes[ic + 2] - posicoes[ia + 2]];
      const f = cruz(ab, ac);
      for (const base of [ia, ib, ic]) { n[base] += f[0]; n[base + 1] += f[1]; n[base + 2] += f[2]; }
    }
    for (let i = 0; i < n.length; i += 3) {
      const v = normalizar([n[i], n[i + 1], n[i + 2]]); n[i] = v[0]; n[i + 1] = v[1]; n[i + 2] = v[2];
    }
    return n;
  }

  const materiais = { ...receita.materiais, piso: { cor: [0.065, 0.075, 0.085], metalico: 0.03, rugosidade: 0.86 } };
  const desenhos = [];
  for (const g of grupos.values()) {
    const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
    const pos = new Float32Array(g.posicoes), ind = new Uint32Array(g.indices), nor = normaisSuaves(pos, ind);
    const bp = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bp); gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    const bn = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bn); gl.bufferData(gl.ARRAY_BUFFER, nor, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    const bi = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bi); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ind, gl.STATIC_DRAW);
    desenhos.push({ vao, quantidade: ind.length, material: materiais[g.material], nome: g.material, transparente: (materiais[g.material].alfa ?? 1) < 1 });
  }
  desenhos.sort((a, b) => Number(a.transparente) - Number(b.transparente));

  function matPerspectiva(fov, aspecto, perto, longe) {
    const f = 1 / Math.tan(fov / 2), nf = 1 / (perto - longe);
    return [f/aspecto,0,0,0, 0,f,0,0, 0,0,(longe+perto)*nf,-1, 0,0,2*longe*perto*nf,0];
  }
  function matOlhar(olho, alvo, cima) {
    const z = normalizar([olho[0]-alvo[0], olho[1]-alvo[1], olho[2]-alvo[2]]);
    const x = normalizar(cruz(cima, z)), y = cruz(z, x);
    return [x[0],y[0],z[0],0, x[1],y[1],z[1],0, x[2],y[2],z[2],0,
      -(x[0]*olho[0]+x[1]*olho[1]+x[2]*olho[2]), -(y[0]*olho[0]+y[1]*olho[1]+y[2]*olho[2]), -(z[0]*olho[0]+z[1]*olho[1]+z[2]*olho[2]),1];
  }
  function matMul(a, b) {
    const o = new Array(16).fill(0);
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c*4+r] += a[k*4+r] * b[c*4+k];
    return o;
  }

  const camera = { yaw: -0.68, pitch: 0.30, distancia: 6.4, alvo: [0, 0.56, 0], auto: false };
  let arrastando = false, px = 0, py = 0;
  canvas.addEventListener('pointerdown', (e) => { arrastando = true; px = e.clientX; py = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { arrastando = false; });
  canvas.addEventListener('pointermove', (e) => {
    if (!arrastando) return;
    camera.yaw -= (e.clientX - px) * 0.008; camera.pitch = Math.max(-0.12, Math.min(1.48, camera.pitch + (e.clientY - py) * 0.006)); px = e.clientX; py = e.clientY;
  });
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); camera.distancia = Math.max(3.8, Math.min(10, camera.distancia * Math.exp(e.deltaY * 0.001))); }, { passive: false });

  const presets = {
    isometrica: [-0.68, 0.30, 6.4], frontal: [0, 0.06, 6.0], traseira: [Math.PI, 0.06, 6.0],
    direita: [Math.PI / 2, 0.06, 6.0], superior: [-0.35, 1.47, 6.9],
  };
  document.querySelectorAll('[data-vista]').forEach((botao) => botao.addEventListener('click', () => {
    const [yaw, pitch, distancia] = presets[botao.dataset.vista]; Object.assign(camera, { yaw, pitch, distancia, auto: false });
    document.querySelectorAll('[data-vista]').forEach((b) => b.classList.toggle('ativo', b === botao));
  }));
  document.getElementById('auto').addEventListener('click', (e) => { camera.auto = !camera.auto; e.currentTarget.classList.toggle('ativo', camera.auto); });

  const totalTriangulos = desenhos.reduce((n, d) => n + d.quantidade / 3, 0);
  document.getElementById('estatisticas').textContent = `${totalTriangulos.toLocaleString('pt-BR')} triângulos · ${desenhos.length} materiais/grupos`;

  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.disable(gl.CULL_FACE);
  let anterior = performance.now();
  function quadro(agora) {
    const dt = Math.min(0.05, (agora - anterior) / 1000); anterior = agora;
    if (camera.auto && !arrastando) camera.yaw += dt * 0.24;
    const largura = Math.max(1, Math.floor(canvas.clientWidth * devicePixelRatio)), altura = Math.max(1, Math.floor(canvas.clientHeight * devicePixelRatio));
    if (canvas.width !== largura || canvas.height !== altura) { canvas.width = largura; canvas.height = altura; }
    gl.viewport(0, 0, largura, altura); gl.clearColor(0.018, 0.024, 0.032, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    const cp = Math.cos(camera.pitch), olho = [
      camera.alvo[0] + Math.sin(camera.yaw) * cp * camera.distancia,
      camera.alvo[1] + Math.sin(camera.pitch) * camera.distancia,
      camera.alvo[2] + Math.cos(camera.yaw) * cp * camera.distancia,
    ];
    const vp = matMul(matPerspectiva(Math.PI / 5.4, largura / altura, 0.05, 50), matOlhar(olho, camera.alvo, [0, 1, 0]));
    gl.useProgram(programa); gl.uniformMatrix4fv(uniformes.uVistaProjecao, false, vp); gl.uniform3fv(uniformes.uCamera, olho);
    for (const d of desenhos) {
      const m = d.material; gl.depthMask(!d.transparente); gl.bindVertexArray(d.vao);
      gl.uniform3fv(uniformes.uCor, m.cor); gl.uniform1f(uniformes.uMetalico, m.metalico ?? 0);
      gl.uniform1f(uniformes.uRugosidade, m.rugosidade ?? 0.5); gl.uniform1f(uniformes.uAlfa, m.alfa ?? 1); gl.uniform1f(uniformes.uEmissao, m.emissao ?? 0);
      gl.drawElements(gl.TRIANGLES, d.quantidade, gl.UNSIGNED_INT, 0);
    }
    gl.depthMask(true); requestAnimationFrame(quadro);
  }
  requestAnimationFrame(quadro);
}());
