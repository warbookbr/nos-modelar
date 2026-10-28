"""3 vistas lado a lado: bpy (esquerda) x esboço traduzido (direita). Uso: imagens.py <raiz> <indice>..."""
import sys, json, subprocess
import numpy as np
from PIL import Image, ImageDraw
RAIZ = sys.argv[1]; sys.path.insert(0, RAIZ + '/scripts')
from stl_vistas_lib import render
VISTAS = {'frontal': np.eye(3), 'lateral': np.array([[0, 0, -1], [0, 1, 0], [1, 0, 0]], float), 'superior': np.array([[1, 0, 0], [0, 0, -1], [0, 1, 0]], float)}
res = json.load(open(RAIZ + '/resultados.json'))
for i in map(int, sys.argv[2:]):
    r = res[i]; nn = f'{i:02d}'
    malha = json.load(open(f'{RAIZ}/verdade/{nn}.malha.json'))['objetos']
    T = []
    for o in malha:
        v = np.array(o['v']).reshape(-1, 3); t = np.array(o['t']).reshape(-1, 3)
        T.append(v[t])
    A = np.concatenate(T)
    q = subprocess.run(['node', RAIZ + '/scripts/exportar_malha.mjs', '/home/user/nos-mecanifica', r['esboco'], f'{RAIZ}/verdade/{nn}.esb-malha.json'], capture_output=True, text=True, cwd='/home/user/nos-mecanifica')
    ex = json.load(open(f'{RAIZ}/verdade/{nn}.esb-malha.json'))
    B = np.array(ex['tris'], float) if ex['tris'] else np.zeros((0, 3, 3))
    ref = A.reshape(-1, 3)
    linhas = []
    W = 520
    for nome, M in VISTAS.items():
        ia = render(A, M, W, ref=ref)
        ib = render(B, M, W, ref=ref) if len(B) else Image.new('L', ia.size, 235)
        h = max(ia.size[1], ib.size[1])
        lin = Image.new('L', (2 * W + 10, h + 22), 255)
        lin.paste(ia, (0, 22)); lin.paste(ib, (W + 10, 22))
        d = ImageDraw.Draw(lin); d.text((6, 4), f'{nome} - bpy (verdade)', fill=0); d.text((W + 16, 4), f'{nome} - esboco traduzido', fill=0)
        linhas.append(lin)
    H = sum(l.size[1] for l in linhas) + 24
    im = Image.new('L', (2 * W + 10, H), 255)
    d = ImageDraw.Draw(im)
    estado = 'CERTO' if r['certo'] else 'ERRADO'
    d.text((6, 6), f"{nn} {r['nome']} [{estado}]  formas {r['formas']} x verdade {r.get('verdade_n')}  recusas: {sorted({x['tipo'] for x in r['recusas']}) or 'nenhuma'}" + (f"  (como circulo: {ex['comoCirculo']})" if ex['comoCirculo'] else ''), fill=0)
    y = 24
    for l in linhas: im.paste(l, (0, y)); y += l.size[1]
    import os; os.makedirs(RAIZ + '/imagens', exist_ok=True)
    nome_arq = f"{RAIZ}/imagens/{nn}-{r['nome'].replace(' ', '_')}-{'certo' if r['certo'] else 'errado'}.png"
    im.save(nome_arq); print(nome_arq, 'falhas', ex['falhasAposRetentativa'])
