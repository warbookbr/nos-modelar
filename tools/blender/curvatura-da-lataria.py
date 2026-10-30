# curvatura-da-lataria.py — pinta a curvatura média da lataria, e só dela, sobre a malha: branco onde a superfície é plana,
# vermelho onde abaula para fora, azul onde afunda, na escala da própria lataria. As peças de borda (frisos, calhas, abas)
# saem em cinza neutro e não entram na conta nem na escala, e a lataria a menos de `raio-mm` da própria borda ou de uma dobra
# viva sai em cinza escuro, sem cor, porque ali a média tem um lado só. É a vista que mostra o amassado largo e raso: a curvatura
# de raio curto dos frisos e das quinas, centenas de vezes maior, esticaria a escala e apagaria uma cova de 1/m. Pela mesma
# razão, com `--vincos` a lataria a menos de `faixa-mm` (o dobro de `raio-mm`, por padrão) de um vinco que a forma declara sai
# em ocre e fica fora da escala: a dobra pedida, de 10 1/m ou mais depois da média, esticava a escala da carenagem de prova a
# 11 1/m e deixava quase branco um amassado de 1 1/m. A legenda diz a faixa e os vincos, e o JSON a escala que a faixa daria.
#
# Uso:
#   blender -b --factory-startup --python tools/blender/curvatura-da-lataria.py -- \
#       --malha <obj|.glb|.gltf|.blend> [--objeto <nome>] [--z-cima] --saida <prefixo> \
#       [--borda friso,calha | --lataria chapa,teto] [--raio-mm 20] [--angulo-borda 60] [--percentil 99] [--piso-1-m 0.1] \
#       [--vincos <vincos.json> [--faixa-mm 40]] \
#       [--escala-1-m <valor>] [--vista frente,lado,topo,tresquartos | --direcao x,y,z [--cima x,y,z]] \
#       [--caixa xmin,xmax,ymin,ymax,zmin,zmax] [--regiao xmin,xmax,ymin,ymax,zmin,zmax] [--resolucao 1400x1050] [--config <cfg.json>]
#
# `--borda` e `--lataria` dizem as partes pelo nome do objeto (`o`) ou do grupo (`g`) do OBJ, como `exportar:obj` as grava (um
# corpo a mais da mesma parte se chama `parte__2` e entra com ela); uma lista dá o complemento da outra, e sem nenhuma a malha
# inteira é lataria. Só o OBJ traz o nome das partes. A curvatura é a média das duas principais, em 1/m, pelo laplaciano por
# cotangentes, média pesada pela área dos vértices a até `raio-mm` que olham para o mesmo lado (superficie.curvatura_media), de
# modo que não depende da triangulação. A escala é o percentil `percentil` (99) de |curvatura| dos vértices com valor, nunca
# abaixo de `piso-1-m`, ou `--escala-1-m`; satura a cor.
#
# `--vincos` é um JSON {"vincos": [{"nome": ..., "segmentos": [[[x, y, z], [x, y, z]], ...]}]}, nas coordenadas da malha, como
# `vincosDaMalha` (tools/modelar/vistas-de-superficie.mjs) o tira dos passos `subdivisao` da receita; as vistas obrigatórias do
# pacote do crítico o passam sempre que a peça tem vinco declarado. Sem ele não há faixa, e a escala é a da lataria inteira.
#
# Grava <prefixo><vista>-curvatura.png (a imagem pura, de que sai o contraste), <prefixo><vista>-curvatura-legenda.png (a mesma,
# com a escala escrita) e <prefixo>curvatura.json com a escala, as contagens (vértices da lataria, da borda, sem dado), os
# extremos da curvatura (numa chapa de duas peles as duas contam, com sinais opostos), a faixa dos vincos (largura, nomes,
# vértices e a escala que ela daria se contasse) e, com --regiao, o contraste da região em cada vista (superficie.contraste_na_regiao).
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy
import comum as C
import superficie as S

a = C.argumentos()
for k in ('malha', 'saida'):
    if k not in a:
        C.erro(f'falta --{k}')
if 'borda' in a and 'lataria' in a:
    C.erro('--borda e --lataria juntas: uma lista dá o complemento da outra; use só uma')
cfg = C.configuracao(a, exige_caixa=False)
raio = float(a.get('raio_mm', 20)) / 1000
angulo_borda = float(a.get('angulo_borda', 60))
percentil = float(a.get('percentil', 99))
piso = float(a.get('piso_1_m', 0.1))
if raio <= 0:
    C.erro('--raio-mm precisa ser positivo')
faixa_m = float(a.get('faixa_mm', 2 * raio * 1000)) / 1000
if 'faixa_mm' in a and 'vincos' not in a:
    C.erro('--faixa-mm só vale com --vincos, que diz onde ficam os vincos')
if faixa_m <= 0:
    C.erro('--faixa-mm precisa ser positiva')
vincos, segmentos = [], np.zeros((0, 2, 3))
if 'vincos' in a:
    try:
        vincos = json.load(open(a['vincos']))['vincos']
        segmentos = np.array([s for v in vincos for s in v['segmentos']], float).reshape(-1, 2, 3)
    except (OSError, ValueError, KeyError, TypeError) as e:
        C.erro(f'--vincos {a["vincos"]}: o JSON precisa ser {{"vincos": [{{"nome", "segmentos": [[[x, y, z], [x, y, z]], ...]}}]}} ({e})')
z_cima = bool(a.get('z_cima'))
V, F, P = C.ler_malha(a['malha'], a.get('objeto'), z_cima)

# as peças de borda
borda_tri = np.zeros(len(F), bool)
for chave in ('borda', 'lataria'):
    if chave not in a:
        continue
    nomes = C.nomes_dos_poligonos(a['malha'])
    if nomes is None or a.get('objeto') is not None:
        C.erro(f'--{chave}: só OBJ sem --objeto traz o nome das partes (o e g); {a["malha"]} não serve')
    por_poligono = np.array(nomes)
    existentes = sorted(set(nomes))
    pedidas = [s for s in str(a[chave]).split(',') if s]
    faltam = [n for n in pedidas if n not in {e.split('__')[0] for e in existentes} | set(existentes)]
    if faltam:
        C.erro(f'--{chave} {faltam}: as partes do OBJ são {existentes}')
    base = np.array([n.split('__')[0] for n in por_poligono])
    na_lista = np.isin(por_poligono, pedidas) | np.isin(base, pedidas)
    borda_tri = na_lista[P] if chave == 'borda' else ~na_lista[P]
if borda_tri.all():
    C.erro('nenhuma lataria: todas as faces são de peça de borda')

# a curvatura só da lataria
usados = np.unique(F[~borda_tri])
mapa = -np.ones(len(V), int)
mapa[usados] = np.arange(len(usados))
H_l, valido_l = S.curvatura_media(V[usados], mapa[F[~borda_tri]], raio, angulo_borda)
na_faixa = S.faixa_dos_vincos(V[usados], segmentos, faixa_m) if vincos else np.zeros(len(usados), bool)
escala = float(a['escala_1_m']) if 'escala_1_m' in a else S.escala_da_curvatura(H_l, percentil, piso, fora=na_faixa)
if escala <= 0:
    C.erro('--escala-1-m precisa ser positiva')
cores = np.full((len(V), 3), S.CINZA_SEM_DADO)
if borda_tri.any():
    cores[np.unique(F[borda_tri])] = S.CINZA_DA_BORDA
c_l = S.cor_divergente(H_l, escala)
com_valor = np.isfinite(H_l)
cores[usados[com_valor]] = c_l[com_valor]
cores[usados[~com_valor]] = S.CINZA_SEM_DADO
cores[usados[com_valor & na_faixa]] = S.COR_DA_FAIXA
faixa = None
if vincos:
    nomes_dos_vincos = sorted({str(v.get('nome')) for v in vincos})
    faixa = {'largura_mm': round(faixa_m * 1000, 3), 'vincos': nomes_dos_vincos, 'vertices': int((com_valor & na_faixa).sum()),
             'escala_com_a_faixa_1_m': round(S.escala_da_curvatura(H_l, percentil, piso), 5)}
    citados = ', '.join(nomes_dos_vincos[:6]) + (f' e mais {len(nomes_dos_vincos) - 6}' if len(nomes_dos_vincos) > 6 else '')
    legenda_da_faixa = (f"\nocre: até {faixa['largura_mm']:.3g} mm dos vincos que a forma desenha ({citados}), fora da escala; "
                        'ali a cor não mede defeito')
else:
    legenda_da_faixa = ''

if 'caixa' in cfg:
    regiao = cfg['caixa']
else:
    regiao = np.stack([V.min(0), V.max(0)], 1)
caixa_da_regiao = None
if 'regiao' in a:
    caixa_da_regiao = [float(s) for s in str(a['regiao']).split(',')]
    if len(caixa_da_regiao) != 6:
        C.erro('--regiao pede seis números: xmin,xmax,ymin,ymax,zmin,zmax (m)')
vistas = C.vistas_da_linha(a, cfg, regiao)

pasta = os.path.dirname(os.path.abspath(a['saida'] + 'x'))
os.makedirs(pasta, exist_ok=True)
C.limpar_cena(cfg['amostras_render'])
C.fundo_escuro(0.0)
C.camera()
obj = C.malha_de_arrays('malha', V, F, cores=cores)
imagens, pedido = [], []
for v in vistas:
    arq = f"{a['saida']}{v['nome']}-curvatura.png"
    C.renderizar([obj], 'cor', v, arq, cfg['avesso'])
    legenda = f"{a['saida']}{v['nome']}-curvatura-legenda.png"
    pj = f"{a['saida']}{v['nome']}-curvatura-legenda.json"
    json.dump({'saida': legenda, 'px_por_mm': v['W'] / (v['escala'] * 1000), 'fundo': 0,
               'paineis': [{'arquivo': arq, 'titulo': f"curvatura média da lataria, {v['nome']}",
                            'subtitulo': f"vermelho: abaulado, azul: afundado, saturam em ±{escala:.3g} 1/m; cinza claro: peça de borda; cinza escuro: sem dado"
                                           + legenda_da_faixa}]},
              open(pj, 'w'))
    C.imagens('lado_a_lado', pj)
    os.unlink(pj)
    imagens.append({'vista': v['nome'], 'arquivo': arq, 'legenda': legenda})
    if caixa_da_regiao:
        pedido.append({'chave': v['nome'], 'arquivo': arq, 'retangulo': list(S.regiao_em_pixels(caixa_da_regiao, v))})
if pedido:
    entrada, saida = f"{a['saida']}contraste-pedido.json", f"{a['saida']}contraste-resultado.json"
    json.dump({'itens': pedido}, open(entrada, 'w'))
    C.imagens('contraste', entrada, saida)
    medidas = json.load(open(saida))
    os.unlink(entrada)
    os.unlink(saida)
    for i in imagens:
        i['contraste'] = medidas[i['vista']]
h = H_l[com_valor]
camera = {v['nome']: {k: v[k] for k in ('centro', 'escala', 'W', 'H', 'x_cam', 'y_cam', 'z_cam', 'direcao', 'cima')} for v in vistas}
resumo = {'escala_1_m': round(escala, 5), 'percentil': percentil, 'piso_1_m': piso, 'raio_mm': round(raio * 1000, 3),
          'angulo_borda': angulo_borda, 'vertices_da_lataria': int(len(usados)), 'vertices_sem_dado': int((~com_valor).sum()),
          'vertices_de_borda': int(len(np.unique(F[borda_tri]))) if borda_tri.any() else 0,
          'curvatura_1_m': {'minima': round(float(h.min()), 4), 'maxima': round(float(h.max()), 4)} if len(h) else None,
          'faixa_dos_vincos': faixa, 'regiao': caixa_da_regiao, 'camera': camera, 'imagens': imagens}
json.dump(resumo, open(f"{a['saida']}curvatura.json", 'w'), indent=1)
print('CURVATURA', json.dumps({k: resumo[k] for k in ('escala_1_m', 'vertices_da_lataria', 'vertices_sem_dado', 'vertices_de_borda', 'curvatura_1_m', 'faixa_dos_vincos')}))
