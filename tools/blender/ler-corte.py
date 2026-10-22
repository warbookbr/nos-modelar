# ler-corte.py — lê o desenho de um corte do pacote cego e devolve o contorno em milímetro no plano do corte, sem malha e
# sem Blender (Python do sistema com Pillow e numpy).
#
# Uso:
#   python3 tools/blender/ler-corte.py --pacote <pasta do pacote ou cortes/> [--corte nome,nome] [--passo-mm 1] [--saida <arq.json>]
#   python3 tools/blender/ler-corte.py --imagem <corte.png> --quadro <quadro.json> --corte <nome> [--saida <arq.json>]
#
# Lê cortes/<nome>.png com o quadro de cortes/quadro.json (u0, v0, escala em px por metro, eixos do plano) e devolve, para
# cada corte, as polilinhas do contorno em mm em (u, v) do plano, ordenadas da mais longa à mais curta, cada uma com os
# pontos em ordem ao longo do traço e se é fechada. A grade, clara e colorida, os rótulos dos eixos e o título, fora do quadro
# de desenho, e as marcas vermelhas das cotas (anel, linha de ligação e texto) não entram; onde a marca cruza o traço, a falha
# se fecha. Cada ponto sai em nível exato, no meio das duas bordas do traço ao longo da normal, e não por faixas. O erro
# estimado (erro_mm) é meio pixel de quantização mais metade do desvio da espessura medida, levado a mm pela escala do quadro;
# o desenho do pacote não tem antisserrilhado, e o traço reto alinhado a um eixo não se lê melhor que meio pixel.
# Sem --saida, imprime o JSON.
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import leitura as L

a = L.argumentos()
falha = float(a.get('falha_px', 10.0))
minimo = float(a['minimo_px']) if 'minimo_px' in a else None
if 'imagem' in a:
    if 'quadro' not in a or 'corte' not in a:
        L.erro('com --imagem, dê também --quadro e --corte')
    quadros = json.load(open(a['quadro']))
    if a['corte'] not in quadros:
        L.erro(f'{a["quadro"]}: sem o corte {a["corte"]}; há {sorted(quadros)}')
    alvos = [(a['corte'], a['imagem'], quadros[a['corte']])]
elif 'pacote' in a:
    _, pasta = L.pastas_do_pacote(a['pacote'])
    arq = os.path.join(pasta, 'quadro.json')
    if not os.path.exists(arq):
        L.erro(f'{pasta}: sem quadro.json (o pacote foi feito sem cortes?)')
    quadros = json.load(open(arq))
    nomes = [s for s in a['corte'].split(',') if s] if isinstance(a.get('corte'), str) else list(quadros)
    falta = [n for n in nomes if n not in quadros]
    if falta:
        L.erro(f'cortes que o quadro não tem: {falta}; há {sorted(quadros)}')
    alvos = [(n, os.path.join(pasta, f'{n}.png'), quadros[n]) for n in nomes]
else:
    L.erro('falta --pacote <pasta> ou --imagem <png> --quadro <json> --corte <nome>')

saida = []
for nome, img, q in alvos:
    r = L.ler_corte(img, q, nome, falha_max=falha, minimo_px=minimo)
    if 'passo_mm' in a:
        passo = float(a['passo_mm'])
        for p in r['polilinhas']:
            P = L.reamostrar(np.array(p['pontos_mm']), passo, p['fechada'])
            if p['fechada'] and len(P) > 2:
                P = P[:-1]
            p['pontos_mm'] = np.round(P, 2).tolist()
    saida.append(r)
L.gravar_json({'ferramenta': 'ler-corte', 'unidade': 'mm', 'cortes': saida}, a.get('saida'))
