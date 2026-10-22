# comparar-cortes.py — compara os cortes de uma candidata com os cortes do pacote cego: o contorno do pacote sai da
# imagem (ler-corte), o da candidata sai exato dos mesmos planos, e a distância se mede nos dois sentidos, por corte.
#
# Uso:
#   python3 tools/blender/comparar-cortes.py --pacote <pasta do pacote> --saida <pasta> \
#       (--candidata <cand.obj|.glb|.blend> [--objeto <nome>] [--z-cima] [--blender <executável>] | --contornos-candidata <json>) \
#       [--corte nome,nome] [--passo-mm 0.5]
#
# Com --candidata, roda olhar-candidata.py no Blender (--blender ou a variável MECANIFICA_BLENDER) com o pacote, o que
# recorta a candidata pela caixa do pacote, desenha os cortes dela no mesmo quadro (<saida>/candidata-cortes/) e grava o
# contorno exato dela em mm (<saida>/candidata-cortes/contornos.json); com --contornos-candidata, usa um contornos.json já
# feito, sem Blender. Grava <saida>/comparacao.json, com, por corte, a média, o p95 e a máxima da distância do pacote para a
# candidata (o que ela deixa de seguir) e da candidata para o pacote (o que ela põe a mais), em mm, o ponto da máxima e a
# fração acima do erro de leitura do corte, que é o piso da medida: abaixo dele a distância não se separa do erro de ler a
# imagem. E grava <saida>/<corte>-comparacao.png com os dois contornos sobrepostos no quadro do pacote, o do pacote em
# preto e o da candidata em laranja, com a máxima de cada sentido marcada.
import json, math, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image, ImageDraw
import imagens as IM
import leitura as L

AQUI = os.path.dirname(os.path.abspath(__file__))
COR_PACOTE, COR_CAND = (0, 0, 0), (230, 110, 0)

a = L.argumentos()
for k in ('pacote', 'saida'):
    if k not in a:
        L.erro(f'falta --{k}')
os.makedirs(a['saida'], exist_ok=True)
vistas, pasta_cortes = L.pastas_do_pacote(a['pacote'])
arq_q = os.path.join(pasta_cortes, 'quadro.json')
if not os.path.exists(arq_q):
    L.erro(f'{pasta_cortes}: sem quadro.json (o pacote foi feito sem cortes?)')
quadros = json.load(open(arq_q))
nomes = [s for s in a['corte'].split(',') if s] if isinstance(a.get('corte'), str) else list(quadros)

if 'contornos_candidata' in a:
    arq_c = a['contornos_candidata']
elif 'candidata' in a:
    blender = a.get('blender') or os.environ.get('MECANIFICA_BLENDER')
    if not blender or blender is True:
        L.erro('para renderizar a candidata, dê --blender <executável> ou a variável MECANIFICA_BLENDER; ou --contornos-candidata')
    raiz = os.path.dirname(vistas) if os.path.basename(vistas) == 'vistas' else os.path.dirname(pasta_cortes)
    prefixo = os.path.join(os.path.abspath(a['saida']), 'candidata-')
    cmd = [blender, '-b', '--factory-startup', '--python', os.path.join(AQUI, 'olhar-candidata.py'), '--',
           '--candidata', a['candidata'], '--pacote', raiz, '--saida', prefixo]
    if isinstance(a.get('objeto'), str):
        cmd += ['--objeto', a['objeto']]
    if a.get('z_cima'):
        cmd += ['--z-cima']
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        L.erro(f'olhar-candidata.py saiu com {r.returncode}:\n{r.stdout[-2000:]}\n{r.stderr[-2000:]}')
    arq_c = prefixo + 'cortes/contornos.json'
else:
    L.erro('falta --candidata <malha> ou --contornos-candidata <json>')
cand = {c['corte']: c for c in json.load(open(arq_c))['cortes']}
passo = float(a.get('passo_mm', 0.5))


def desenhar(nome, q, lido, cand_polis, med):
    """Os dois contornos sobrepostos no quadro do pacote, com grade, legenda e a máxima de cada sentido."""
    W, H, M = q['W'], q['H'], IM.CORTE_M
    esc = q['escala_px_m'] / 1000
    px = lambda P: [(M + (u - q['u0'] * 1000) * esc, H - M - (v - q['v0'] * 1000) * esc) for u, v in P]
    im = Image.new('RGB', (W, H), 'white')
    d = ImageDraw.Draw(im, 'RGBA')
    passo_g = IM.passo_do_corte(q)
    U, Vn = q['eixos_uv']
    for k in range(math.floor(q['u0'] * 1000 / passo_g), math.ceil((q['u0'] * 1000 + (W - M) / esc) / passo_g) + 1):
        x = px([(k * passo_g, 0)])[0][0]
        d.line([(x, 0), (x, H - M)], fill=(*IM.COR_X, 70 if k % 2 == 0 else 30))
        if k % 2 == 0:
            d.text((x - 14, H - M + 6), f'{U}={k * passo_g:g}', fill=(0, 60, 160), font=IM.fonte(14))
    for k in range(math.floor(q['v0'] * 1000 / passo_g), math.ceil((q['v0'] * 1000 + (H - M) / esc) / passo_g) + 1):
        y = px([(0, k * passo_g)])[0][1]
        d.line([(M, y), (W, y)], fill=(*IM.COR_Y, 70 if k % 2 == 0 else 30))
        if k % 2 == 0:
            d.text((4, y - 8), f'{Vn}={k * passo_g:g}', fill=(20, 100, 20), font=IM.fonte(14))
    for polis, cor, larg in ((lido, COR_PACOTE, 2), (cand_polis, COR_CAND, 2)):
        for p in polis:
            P = p['pontos_mm'] + (p['pontos_mm'][:1] if p.get('fechada') else [])
            if len(P) >= 2:
                d.line(px(P), fill=cor, width=larg)
    for chave, cor in (('pacote_para_candidata_mm', COR_PACOTE), ('candidata_para_pacote_mm', COR_CAND)):
        p = med[chave].get('ponto_da_maxima')
        if p:
            x, y = px([p])[0]
            d.ellipse([x - 9, y - 9, x + 9, y + 9], outline=cor, width=2)
    f = IM.fonte(16)
    pc, cp = med['pacote_para_candidata_mm'], med['candidata_para_pacote_mm']
    linhas = [f'corte {nome}: pacote lido em preto, candidata em laranja; grade de {passo_g:g} mm; erro de leitura {med["erro_leitura_mm"]} mm',
              f'pacote para candidata: média {pc.get("media")} / p95 {pc.get("p95")} / máxima {pc.get("maxima")} mm (círculo preto)',
              f'candidata para pacote: média {cp.get("media")} / p95 {cp.get("p95")} / máxima {cp.get("maxima")} mm (círculo laranja)']
    for i, t in enumerate(linhas):
        bb = d.textbbox((10, 6 + 20 * i), t, font=f)
        d.rectangle(bb, fill=(255, 255, 255, 220))
        d.text((10, 6 + 20 * i), t, fill='black', font=f)
    im.save(os.path.join(a['saida'], f'{nome}-comparacao.png'))


resultado = {}
for nome in nomes:
    if nome not in quadros:
        L.erro(f'o pacote não tem o corte {nome}; há {sorted(quadros)}')
    q = quadros[nome]
    lido = L.ler_corte(os.path.join(pasta_cortes, f'{nome}.png'), q, nome)
    if nome not in cand:
        resultado[nome] = {'erro': 'a candidata não tem este corte (nenhuma face dela cruza o plano dentro da caixa?)'}
        continue
    med = L.comparar_contornos(lido['polilinhas'], cand[nome]['polilinhas'], erro_mm=lido['erro_mm'], passo=passo)
    med = {'erro_leitura_mm': lido['erro_mm'], 'escala_px_por_mm': lido['escala_px_por_mm'],
           'polilinhas_pacote': len(lido['polilinhas']), 'polilinhas_candidata': len(cand[nome]['polilinhas']), **med}
    desenhar(nome, q, lido['polilinhas'], cand[nome]['polilinhas'], med)
    resultado[nome] = med
L.gravar_json({'ferramenta': 'comparar-cortes', 'unidade': 'mm', 'passo_mm': passo, 'cortes': resultado},
              os.path.join(a['saida'], 'comparacao.json'))
print('COMPARACAO', json.dumps({n: {k: r[k].get('media') for k in ('pacote_para_candidata_mm', 'candidata_para_pacote_mm')}
                                for n, r in resultado.items() if 'erro' not in r}, ensure_ascii=False))
