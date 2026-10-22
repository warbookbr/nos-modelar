# ler-linhas.py — lê as vistas de linhas de feição do pacote cego e devolve os vincos e as bordas como polilinhas em
# milímetro no plano de cada vista e, com --3d, as polilinhas 3D que as vistas ortogonais casam sem ambiguidade. Sem malha e
# sem Blender (Python do sistema com Pillow e numpy).
#
# Uso:
#   python3 tools/blender/ler-linhas.py --pacote <pasta do pacote ou vistas/> [--vista frente,lado,topo] [--3d]
#       [--simetria-x | --sem-simetria] [--tolerancia-mm 3] [--sem-angulo] [--saida <arq.json>]
#
# Lê vistas/<vista>-linhas.png com a câmera de vistas/camera.json. A grade, o título e a barra de escala saem por
# redesenho: a grade de cada vista depende só da câmera, e a leitura a redesenha (imagens.desenhar_grade) sobre um fundo
# branco, um preto e um cinza, dando a cada pixel o fundo que a explica; o que nenhum fundo explica (a letra e a barra,
# opacas) fica desconhecido e se fecha onde cruza o traço. Separa o traço preto (feicao: vincos, dobras e bordas livres) do
# cinza fino (corte: a borda sobre um plano da caixa), lê cada um em nível exato, junta os trechos que se seguem e descarta o
# que é mais curto que três espessuras. Na vista alinhada a dois eixos, (u, v) são as coordenadas do mundo desses eixos, como
# na grade; na oblíqua, a projeção nos eixos da câmera.
#
# Com --3d, cada par de vistas alinhadas de direções diferentes (a primeira de cada eixo, ou as de --vista) casa os trechos
# de traço preto pelo eixo comum, e a terceira vista confere a curva candidata (leitura.linhas_3d); sai a confiança 'alta'
# (única dos dois lados e conferida) ou 'media', e as ambíguas só se contam. A simetria em x vem de pacote.json, se houver;
# --simetria-x e --sem-simetria a forçam. Se o pacote tem cortes, cada curva 3D que atravessa um corte ganha o ângulo da
# dobra naquele ponto (leitura.com_angulos): o canto que o contorno do corte faz ali dá a direção das duas faces no plano, e
# a dobra sai delas e da tangente da curva, com a incerteza em graus; a curva que não atravessa corte fica sem o campo, e
# --sem-angulo não o calcula. Sem --saida, imprime o JSON.
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import leitura as L

a = L.argumentos()
if 'pacote' not in a:
    L.erro('falta --pacote <pasta do pacote ou vistas/>')
pasta, pasta_cortes = L.pastas_do_pacote(a['pacote'])
arq_cam = os.path.join(pasta, 'camera.json')
if not os.path.exists(arq_cam):
    L.erro(f'{pasta}: sem camera.json')
cameras = json.load(open(arq_cam))
grade = json.load(open(os.path.join(pasta, 'grade.json'))) if os.path.exists(os.path.join(pasta, 'grade.json')) else {}
nomes = [s for s in a['vista'].split(',') if s] if isinstance(a.get('vista'), str) else \
    [v for v in cameras if os.path.exists(os.path.join(pasta, f'{v}-linhas.png'))]
falta = [v for v in nomes if v not in cameras or not os.path.exists(os.path.join(pasta, f'{v}-linhas.png'))]
if falta:
    L.erro(f'vistas sem câmera ou sem imagem de linhas: {falta}')
falha = float(a.get('falha_px', 10.0))
minimo = float(a['minimo_px']) if 'minimo_px' in a else None
leituras = {v: L.ler_vista_de_linhas(os.path.join(pasta, f'{v}-linhas.png'), v, cameras[v], grade.get(f'{v}-linhas'),
                                     falha_max=falha, minimo_px=minimo) for v in nomes}
saida = {'ferramenta': 'ler-linhas', 'unidade': 'mm', 'vistas': leituras}
if a.get('3d'):
    pacote_json = os.path.join(os.path.dirname(pasta), 'pacote.json')
    simetria = bool(json.load(open(pacote_json)).get('simetria_x')) if os.path.exists(pacote_json) else False
    if a.get('simetria_x'):
        simetria = True
    if a.get('sem_simetria'):
        simetria = False
    tol = float(a['tolerancia_mm']) if 'tolerancia_mm' in a else None
    saida['linhas_3d'] = L.linhas_3d(leituras, cameras, tol_mm=tol, simetria_x=simetria)
    arq_q = os.path.join(pasta_cortes, 'quadro.json')
    if not a.get('sem_angulo') and os.path.exists(arq_q):
        quadros = json.load(open(arq_q))
        cortes = [L.ler_corte(os.path.join(pasta_cortes, f'{n}.png'), q, n) for n, q in quadros.items()
                  if os.path.exists(os.path.join(pasta_cortes, f'{n}.png'))]
        L.com_angulos(saida['linhas_3d'], cortes)
L.gravar_json(saida, a.get('saida'))
