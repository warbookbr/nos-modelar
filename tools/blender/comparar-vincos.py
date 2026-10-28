# comparar-vincos.py — compara os vincos de uma candidata com as linhas de feição do pacote cego: as do pacote saem das
# imagens de linhas (ler-linhas), as da candidata saem exatas das arestas dela, projetadas na mesma câmera e só no trecho que
# se vê, como o pacote desenha as dele; e o casamento se mede por vista, no total das vistas e em 3D.
#
# Uso:
#   python3 tools/blender/comparar-vincos.py --pacote <pasta do pacote> --saida <pasta> \
#       (--candidata <cand.obj|.glb|.blend> [--objeto <nome>] [--z-cima] [--blender <executável>] | --vincos-candidata <json>) \
#       [--vista frente,lado] [--passo-mm 1] [--sem-3d] [--tolerancia-3d-mm 3] [--sem-cortes] [--angulo-vinco 40]
#
# Com --candidata, roda olhar-candidata.py no Blender (--blender ou a variável MODELAR_BLENDER) com o pacote, o que recorta
# a candidata pela caixa do pacote e grava em <saida>/candidata-vincos.json o traço preto dela em 3D: as arestas com diedro
# acima do angulo_feicao do pacote, as bordas livres e os vincos que a malha declara (no .blend, as arestas com vinco de
# subdivisão ou marcadas como vivas), trecho a trecho, com o que se vê em cada vista e em alguma delas; com --vincos-candidata,
# usa um vincos.json já feito, sem Blender. O traço preto do pacote reúne os vincos, as dobras e as bordas livres da
# referência, e o da candidata as mesmas classes; a borda de corte da caixa, em cinza, fica fora dos dois.
#
# O limiar de dobra é o da régua (limiares.ANGULO_VINCO, 40 graus; --angulo-vinco o troca, e 25 devolve a medida de todas as
# linhas desenhadas): a candidata só conta como vinco a aresta de feição com diedro acima dele, e a de 25 graus (o
# angulo_feicao do desenho) até o limiar é dobra RASA, que o desenho mostra e a régua não conta. As rasas saem da cobertura e
# da precisão, para a cobertura ser a que a régua dá, e a saída relata quanto comprimento de dobra rasa a candidata tem, em
# 3D e por vista, e as desenha em laranja. A borda livre, a dobra de recorte e o vinco que a malha declara não têm diedro e
# contam sempre. As linhas do pacote não se filtram por ângulo, porque a imagem não o guarda: a referência com dobra rasa
# desenhada tem cobertura menor que a da régua, que não a conta; em 3D, com cortes, a saída conta as curvas do pacote cujo
# ângulo lido nos cortes fica até o limiar (rasas_do_pacote).
#
# Grava <saida>/comparacao-vincos.json com, por vista, no total das vistas e em 3D: o comprimento das linhas do pacote e da
# candidata, a cobertura (fração do traço do pacote a até 2 e 5 mm de uma linha da candidata), a precisão (fração do traço
# da candidata a até 2 e 5 mm de uma linha do pacote), o F1, o desvio (mediana e p90 da distância do pacote à candidata) e o
# excesso (mediana da distância da candidata ao pacote), em mm; por vista, o erro de leitura do traço do pacote, que é o piso
# da medida, e a fração do pacote acima dele. Em 3D, as linhas do pacote são as curvas que as vistas ortogonais casam sem
# ambiguidade (ler-linhas --3d) e que os cortes do pacote confirmam (a curva que atravessa um corte longe do contorno dele
# fica fora; --sem-cortes desliga a conferência), e a candidata é o traço que se vê em alguma vista; a curva que o desenho de linhas não
# decide falta no pacote, e a precisão em 3D é limite de baixo. E grava <saida>/<vista>-vincos.png com a grade da vista, as
# linhas do pacote em preto e as da candidata em vermelho por cima, mais finas: onde as duas coincidem, o traço é preto com
# o miolo vermelho; o preto sozinho é vinco que falta, e o vermelho sozinho, vinco a mais.
import json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image, ImageDraw
import imagens as IM
import leitura as L
from ambiente import do_ambiente
import limiares

AQUI = os.path.dirname(os.path.abspath(__file__))
COR_PACOTE, COR_CAND, COR_RASA = (0, 0, 0), (220, 0, 0), (255, 140, 0)
TOLERANCIAS = (2.0, 5.0)

a = L.argumentos()
for k in ('pacote', 'saida'):
    if k not in a:
        L.erro(f'falta --{k}')
os.makedirs(a['saida'], exist_ok=True)
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
if not nomes:
    L.erro(f'{pasta}: nenhuma vista de linhas (o pacote foi feito antes das vistas de linhas?)')

if 'vincos_candidata' in a:
    arq_v = a['vincos_candidata']
elif 'candidata' in a:
    blender = a.get('blender') or do_ambiente('BLENDER')
    if not blender or blender is True:
        L.erro('para olhar a candidata, dê --blender <executável> ou a variável MODELAR_BLENDER; ou --vincos-candidata')
    raiz = os.path.dirname(pasta)
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
    arq_v = prefixo + 'vincos.json'
else:
    L.erro('falta --candidata <malha> ou --vincos-candidata <json>')
if not os.path.exists(arq_v):
    L.erro(f'{arq_v}: não existe (o olhar-candidata.py é anterior à comparação de vincos?)')
cand = json.load(open(arq_v))
passo = float(a.get('passo_mm', 1.0))
limiar = float(a['angulo_vinco']) if 'angulo_vinco' in a else limiares.ANGULO_VINCO
feicao = float(cand.get('angulo_feicao') or limiares.ANGULO_FEICAO)


def rasa(t):
    """O trecho da candidata é dobra rasa: tem diedro e ele não passa do limiar."""
    return t.get('angulo_graus') is not None and t['angulo_graus'] <= limiar


def sem_rasas(lista):
    return [t for t in lista if not rasa(t)]


def so_rasas(lista):
    return [t for t in lista if rasa(t)]


def polilinhas_3d_mm(lista):
    return [{'fechada': False, 'pontos_mm': (np.asarray(t['pontos_m'], float) * 1000).tolist()} for t in lista]


def metade_positiva(polis, folga_mm=1.0):
    """Os trechos das polilinhas 3D em mm com x >= -folga_mm."""
    out = []
    for p in polis:
        P = np.asarray(p['pontos_mm'], float)
        for T in trechos_ok(P, P[:, 0] >= -folga_mm):
            out.append({'fechada': False, 'pontos_mm': T.tolist()})
    return out


def trechos_ok(P, ok):
    out, i = [], 0
    while i < len(P):
        if not ok[i]:
            i += 1
            continue
        j = i
        while j < len(P) and ok[j]:
            j += 1
        if j - i >= 2:
            out.append(P[i:j])
        i = j
    return out


def comprimento(polis):
    return sum(L.comprimento(np.asarray(p['pontos_mm'], float), p.get('fechada', False)) for p in polis)


def desenhar(nome, mt, lidas, cand_polis, med, rasas=()):
    """As linhas do pacote em preto e as da candidata em vermelho, por cima e mais finas, sobre a grade da vista."""
    im = Image.new('RGB', (mt['W'], mt['H']), 'white')
    reg = IM.desenhar_grade(im, nome, mt, IM.fonte(16))
    d = ImageDraw.Draw(im, 'RGBA')
    for polis, cor, larg in ((lidas, COR_PACOTE, 4), (rasas, COR_RASA, 2), (cand_polis, COR_CAND, 2)):
        for p in polis:
            P = p['pontos_mm'] + (p['pontos_mm'][:1] if p.get('fechada') else [])
            if len(P) >= 2:
                d.line([tuple(q) for q in L.mm_para_px(P, mt)], fill=cor, width=larg, joint='curve')
    f = IM.fonte(15)
    y = (reg.get('titulo') or [0, 0, 0, 24])[3] + 4
    textos = [f'pacote em preto, candidata em vermelho por cima, dobra rasa (até {limiar:g} graus) em laranja']
    if 'cobertura_2mm' in med:
        textos.append(f"cobertura {med['cobertura_2mm']} / {med['cobertura_5mm']}, precisão {med['precisao_2mm']} / "
                      f"{med['precisao_5mm']}, F1 {med['f1_2mm']} / {med['f1_5mm']} a 2 / 5 mm")
        textos.append(f"desvio mediano {med['desvio_mediana_mm']} mm, p90 {med['desvio_p90_mm']} mm; "
                      f"erro de leitura {med.get('erro_leitura_mm')} mm")
    for t in textos:
        bb = d.textbbox((10, y), t, font=f)
        d.rectangle(bb, fill=(255, 255, 255, 220))
        d.text((10, y), t, fill='black', font=f)
        y = bb[3] + 3
    im.save(os.path.join(a['saida'], f'{nome}-vincos.png'))


resultado, leituras, rasas_por_vista = {}, {}, {}
todos_lc, todos_cl, comp_l, comp_c = [], [], 0.0, 0.0
com_lc, com_cl, com_c = [], [], 0.0   # as mesmas distâncias com as dobras rasas da candidata contadas
for nome in nomes:
    mt = cameras[nome]
    lt = L.ler_vista_de_linhas(os.path.join(pasta, f'{nome}-linhas.png'), nome, mt, grade.get(f'{nome}-linhas'))
    leituras[nome] = lt
    lidas = lt['feicao']['polilinhas']
    if nome not in cand.get('vistas', {}):
        resultado[nome] = {'erro': 'a candidata não tem esta vista (o vincos.json é de outro pacote?)'}
        continue
    projeta = lambda ts: [{'fechada': False, 'pontos_mm': L.projetar_na_vista(t['pontos_m'], mt).tolist()} for t in ts]
    cpol, rpol = projeta(sem_rasas(cand['vistas'][nome])), projeta(so_rasas(cand['vistas'][nome]))
    rasas_por_vista[nome] = round(comprimento(rpol), 1)
    if not lidas and not cpol:
        resultado[nome] = {'erro': 'nem o pacote nem a candidata têm linha de feição nesta vista', 'rasas_candidata_mm': rasas_por_vista[nome]}
        continue
    _, d_lc = L.distancias_entre_linhas(lidas, cpol, passo)
    _, d_cl = L.distancias_entre_linhas(cpol, lidas, passo)
    cl, cc = comprimento(lidas), comprimento(cpol)
    med = {'eixos_uv': lt['eixos_uv'], 'polilinhas_pacote': len(lidas), 'trechos_candidata': len(cpol), 'rasas_candidata_mm': rasas_por_vista[nome],
           **L.medidas_de_casamento(d_lc, d_cl, cl, cc, TOLERANCIAS, lt['feicao']['erro_mm'])}
    if lt.get('aviso'):
        med['aviso'] = lt['aviso']
    # com dobra rasa na candidata, a medida de antes do limiar (todas as linhas desenhadas) vai ao lado, para ver o que elas pesam
    if rpol:
        _, e_lc = L.distancias_entre_linhas(lidas, cpol + rpol, passo)
        _, e_cl = L.distancias_entre_linhas(cpol + rpol, lidas, passo)
        med['contando_as_rasas'] = {k: v for k, v in L.medidas_de_casamento(e_lc, e_cl, cl, cc + comprimento(rpol), TOLERANCIAS).items()
                                    if k.startswith(('cobertura', 'precisao', 'f1'))}
    else:
        e_lc, e_cl = d_lc, d_cl
    com_lc.append(e_lc)
    com_cl.append(e_cl)
    com_c += cc + comprimento(rpol)
    desenhar(nome, mt, lidas, cpol, med, rpol)
    resultado[nome] = med
    todos_lc.append(d_lc)
    todos_cl.append(d_cl)
    comp_l += cl
    comp_c += cc

comp_3d = lambda ts: sum(L.comprimento(np.asarray(t['pontos_m'], float) * 1000) for t in ts)
qualquer = cand.get('qualquer_vista', [])
saida = {'ferramenta': 'comparar-vincos', 'unidade': 'mm', 'passo_mm': passo, 'tolerancias_mm': list(TOLERANCIAS),
         'angulo_vinco': limiar, 'angulo_feicao': cand.get('angulo_feicao'), 'segmentos_candidata': cand.get('segmentos'),
         'rasas': {'faixa_graus': [feicao, limiar], 'comprimento_candidata_3d_mm': round(comp_3d(so_rasas(qualquer)), 1),
                   'comprimento_vincos_candidata_3d_mm': round(comp_3d(sem_rasas(qualquer)), 1), 'por_vista_mm': rasas_por_vista,
                   'nota': (f'dobras da candidata com diedro de {feicao:g} a {limiar:g} graus: o desenho de linhas as mostra e a régua não as conta '
                            f'como vinco; ficam fora da cobertura e da precisão (contando_as_rasas dá a medida com elas) e saem em laranja nas imagens. '
                            f'Para a régua contá-las, a candidata precisa dobrar mais que {limiar:g} graus') if limiar > feicao
                   else 'o limiar de dobra é o do desenho de linhas, e nenhuma dobra fica rasa'},
         'vistas': resultado}
if todos_lc:
    saida['total'] = L.medidas_de_casamento(np.concatenate(todos_lc), np.concatenate(todos_cl), comp_l, comp_c, TOLERANCIAS)
    if any(rasas_por_vista.values()):
        saida['total']['contando_as_rasas'] = {k: v for k, v in L.medidas_de_casamento(
            np.concatenate(com_lc), np.concatenate(com_cl), comp_l, com_c, TOLERANCIAS).items() if k.startswith(('cobertura', 'precisao', 'f1'))}
if not a.get('sem_3d'):
    pacote_json = os.path.join(os.path.dirname(pasta), 'pacote.json')
    simetria = bool(json.load(open(pacote_json)).get('simetria_x')) if os.path.exists(pacote_json) else False
    tol = float(a['tolerancia_3d_mm']) if 'tolerancia_3d_mm' in a else None
    # as curvas 3D do pacote são conferidas contra os cortes dele, como em ler-linhas: a curva que o casamento das vistas
    # monta fora da pele não entra como vinco da referência
    arq_q = os.path.join(pasta_cortes, 'quadro.json')
    cortes = []
    if os.path.exists(arq_q) and not a.get('sem_cortes'):
        cortes = [L.ler_corte(os.path.join(pasta_cortes, f'{n}.png'), q, n) for n, q in json.load(open(arq_q)).items()
                  if os.path.exists(os.path.join(pasta_cortes, f'{n}.png'))]
    l3 = L.linhas_3d(leituras, cameras, tol_mm=tol, simetria_x=simetria, cortes=cortes or None)
    # a curva do pacote que os cortes mostram abaixo do limiar de dobra só se relata: a régua não a contaria, mas entra na
    # cobertura porque a vista de linhas não guarda o ângulo e o ângulo lido nos cortes tem incerteza
    pacote_rasas = []
    if cortes:
        L.com_angulos(l3, cortes)
        L.classificar_dobras(l3, limiar, feicao)
        pacote_rasas = [p for p in l3['polilinhas_3d'] if p.get('classe') == 'rasa']
    lidas3 = [{'fechada': False, 'pontos_mm': p['pontos_mm']} for p in l3['polilinhas_3d']]
    c3 = polilinhas_3d_mm(sem_rasas(qualquer))
    if simetria:
        # com simetria, a medida em 3D fica na metade x >= 0, como a régua: a leitura casa a curva da metade x < 0 pelo
        # espelho, e a candidata pode não ter vista que a mostre (o lado olha de +x)
        lidas3, c3 = metade_positiva(lidas3), metade_positiva(c3)
    if lidas3:
        _, d_lc = L.distancias_entre_linhas(lidas3, c3, passo)
        _, d_cl = L.distancias_entre_linhas(c3, lidas3, passo)
        saida['3d'] = {'curvas_pacote': len(lidas3), 'ambiguas': l3['ambiguas'], 'tolerancia_leitura_mm': l3['tolerancia_mm'],
                       'vistas_por_eixo': l3['vistas_por_eixo'],
                       'recusadas_pelos_cortes': len(l3.get('recusadas_pelos_cortes', [])) if cortes else None,
                       'rasas_do_pacote': {'curvas': len(pacote_rasas), 'comprimento_mm': round(sum(L.comprimento(np.asarray(p['pontos_mm'], float)) for p in pacote_rasas), 1),
                                           'nota': 'curvas do pacote com ângulo lido nos cortes até o limiar: contam na cobertura, que fica abaixo da da régua por elas'},
                       'nota': 'só as curvas que as vistas casam sem ambiguidade; a precisão em 3D é limite de baixo',
                       **L.medidas_de_casamento(d_lc, d_cl, comprimento(lidas3), comprimento(c3), TOLERANCIAS)}
    else:
        saida['3d'] = {'erro': 'as vistas do pacote não casam nenhuma curva 3D sem ambiguidade', 'ambiguas': l3['ambiguas']}
L.gravar_json(saida, os.path.join(a['saida'], 'comparacao-vincos.json'))
resumo = {n: {k: r.get(k) for k in ('cobertura_5mm', 'precisao_5mm', 'desvio_mediana_mm')} for n, r in resultado.items() if 'erro' not in r}
for k in ('total', '3d'):
    if k in saida and 'erro' not in saida[k]:
        resumo[k] = {c: saida[k].get(c) for c in ('cobertura_5mm', 'precisao_5mm', 'desvio_mediana_mm')}
print('VINCOS', json.dumps(resumo, ensure_ascii=False))
print('RASAS', json.dumps({'faixa_graus': saida['rasas']['faixa_graus'], 'candidata_3d_mm': saida['rasas']['comprimento_candidata_3d_mm'],
                           'por_vista_mm': rasas_por_vista}, ensure_ascii=False))
