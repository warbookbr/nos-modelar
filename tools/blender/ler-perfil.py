# ler-perfil.py — tira do contorno de um ou mais cortes do pacote cego o PERFIL de um detalhe de borda (cordão, moldura, calha,
# lábio) em relação à chapa em volta, em milímetro, no plano normal à linha de feição, no formato do `perfil` do `friso`. Sem
# malha e sem Blender (Python do sistema com Pillow e numpy). O método e a convenção estão em perfil.py.
#
# Uso (o detalhe se dá por UMA destas três formas):
#   python3 tools/blender/ler-perfil.py --pacote <pasta do pacote ou cortes/> --corte z850,z1000 \
#       --linhas <saída de ler-linhas --3d> (--linha <n> | --perto x,y,z) [--sentido-inverso]
#       A linha de feição 3D (a n-ésima de polilinhas_3d, ou a mais perto do ponto) atravessa o plano de cada corte; a travessia
#       é o ponto do detalhe no corte e a direção da curva ali é a tangente. Com mais de uma travessia no mesmo corte, --perto
#       escolhe (o ponto mais perto, em mm).
#   python3 tools/blender/ler-perfil.py --pacote <pasta> --corte z850 --alvo "z850:u,w;z1000:u,w" [--tangente x,y,z]
#       O ponto do contorno onde o detalhe está, em mm no plano de cada corte; sem tangente, o corte é tomado como normal à linha.
#   python3 tools/blender/ler-perfil.py --pacote <pasta> --caixa "z850:u0,u1,w0,w1;z1000:u0,u1,w0,w1" [--tangente x,y,z]
#       O detalhe é o trecho do contorno dentro de uma caixa no plano do corte, em mm.
#
# Opções: --fora x,y,z (para onde a chapa olha; sem ela, o lado oposto ao centro dos contornos do corte), --ancora
# linha|centro|inicio|fim (onde fica u = 0; padrão: linha com --linhas ou --alvo, centro com --caixa), --janela-mm n (meia janela
# fixa em volta do ponto; sem ela a busca cresce até o contorno voltar à base), --flanco-mm 30 e --folga-mm 3 (as faixas de chapa
# de cada lado que ajustam a base, e o recuo delas), --grau auto|1|2|3 (da base), --fundo-mm 5 (quanto o polígono fechado desce
# abaixo da base), --perto-mm 12 (o quanto o ponto pode estar do contorno), --simplificar-mm (o desvio da simplificação),
# --erro-tangente-graus (a incerteza da tangente dada; com --linhas sai do erro das vistas), --sem-unir (não junta ao contorno as peças que o
# continuam), --imagens <pasta> (um PNG por corte), --saida <arq.json>. Sem --saida, imprime o JSON.
#
# Saída: por corte, o perfil `perfil` (polígono fechado em metro, pronto para o friso), `perfil_mm`, o contorno aberto do detalhe
# (`perfil_aberto_mm`), largura, altura e profundidade em relação à base, a base (grau, resíduo, erro previsto), a projeção
# (obliquidade, fatores de largura e altura, erro da tangente) e o erro total; com mais de um corte, `conjunto` com a variação
# entre eles, o representante e o perfil médio. `perfil_se_a_linha_for_percorrida_ao_contrario` traz o espelho em u; `lacos` traz o lábio
# enrolado que o polígono simples não carrega, com o círculo ajustado em `perfil` (um segundo friso); `resumo` diz o essencial em frases.
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import leitura as L
import perfil as P

a = L.argumentos()
if 'pacote' not in a:
    L.erro('falta --pacote <pasta do pacote ou cortes/>')
_, pasta = L.pastas_do_pacote(a['pacote'])
arq_q = os.path.join(pasta, 'quadro.json')
if not os.path.exists(arq_q):
    L.erro(f'{pasta}: sem quadro.json (o pacote foi feito sem cortes?)')
quadros = json.load(open(arq_q))


def numeros(texto, n, nome):
    try:
        v = [float(s) for s in str(texto).split(',')]
    except ValueError:
        L.erro(f'{nome}: números separados por vírgula, e veio "{texto}"')
    if len(v) != n:
        L.erro(f'{nome}: precisa de {n} números, e veio {len(v)}')
    return v


def por_corte(texto, n, nome):
    """'z850:1,2;z1000:3,4' como {corte: [números]}."""
    out = {}
    for par in [s for s in str(texto).split(';') if s.strip()]:
        c, _, v = par.partition(':')
        if not v:
            L.erro(f'{nome}: use corte:números separados por vírgula, como z850:' + ','.join(['0'] * n))
        out[c.strip()] = numeros(v, n, f'{nome} {c.strip()}')
    return out


fontes = [k for k in ('linhas', 'alvo', 'caixa') if k in a]
if len(fontes) != 1:
    L.erro('dê o detalhe por uma só forma: --linhas (com --linha ou --perto), --alvo ou --caixa')
fonte = fontes[0]
alvos = por_corte(a['alvo'], 2, '--alvo') if fonte == 'alvo' else {}
caixas = por_corte(a['caixa'], 4, '--caixa') if fonte == 'caixa' else {}
if 'corte' in a and isinstance(a['corte'], str):
    nomes = [s for s in a['corte'].split(',') if s]
elif fonte == 'linhas':
    nomes = list(quadros)
else:
    nomes = list(alvos or caixas)
falta = [n for n in nomes if n not in quadros]
if falta:
    L.erro(f'cortes que o quadro não tem: {falta}; há {sorted(quadros)}')
cortes = {n: L.ler_corte(os.path.join(pasta, f'{n}.png'), quadros[n], n) for n in nomes}

curva, tol3d, err_tangente = None, None, None
if fonte == 'linhas':
    d = json.load(open(a['linhas']))
    d = d.get('linhas_3d', d)
    curvas = [np.asarray(p['pontos_mm'], float) for p in d.get('polilinhas_3d', [])]
    if not curvas:
        L.erro(f'{a["linhas"]}: sem polilinhas_3d (rode ler-linhas com --3d)')
    perto = numeros(a['perto'], 3, '--perto') if isinstance(a.get('perto'), str) else None
    if 'linha' in a:
        k = int(a['linha'])
        if not 0 <= k < len(curvas):
            L.erro(f'--linha {k}: o arquivo tem {len(curvas)} linhas (0 a {len(curvas) - 1})')
    elif perto is not None:
        dist = [float(np.linalg.norm(c - np.asarray(perto), axis=1).min()) for c in curvas]
        k = int(np.argmin(dist))
        if dist[k] > 25.0:
            L.erro(f'--perto {perto}: a linha mais perto fica a {dist[k]:.0f} mm; dê --linha <n>')
    else:
        L.erro('com --linhas, dê --linha <n> ou --perto x,y,z')
    curva = curvas[k]
    tol3d = d.get('tolerancia_mm')
    err_tangente = math.degrees(math.atan2(2.0 * (tol3d / 3.0 if tol3d else 2.0), 100.0))
tangente_dada = numeros(a['tangente'], 3, '--tangente') if isinstance(a.get('tangente'), str) else None
fora = numeros(a['fora'], 3, '--fora') if isinstance(a.get('fora'), str) else None
if 'erro_tangente_graus' in a:
    err_tangente = float(a['erro_tangente_graus'])
opcoes = dict(fora=fora, ancora=a.get('ancora'), janela_mm=float(a['janela_mm']) if 'janela_mm' in a else None,
              flanco_mm=float(a.get('flanco_mm', 30.0)), folga_mm=float(a.get('folga_mm', 3.0)),
              grau=('auto' if a.get('grau', 'auto') == 'auto' else int(a['grau'])), fundo_mm=float(a.get('fundo_mm', 5.0)),
              perto_mm=float(a.get('perto_mm', 12.0)), unir=not a.get('sem_unir'), simplificar_mm=float(a['simplificar_mm']) if 'simplificar_mm' in a else None)

resultados, recusados = [], []
for nome in nomes:
    c = cortes[nome]
    try:
        t, alvo = tangente_dada, None
        if fonte == 'linhas':
            trav = P.travessias_da_linha(c, curva, perto)
            if not trav:
                raise P.ErroDoPerfil(f'a linha de feição não atravessa o plano do corte {nome}')
            if len(trav) > 1 and perto is None:
                raise P.ErroDoPerfil(f'a linha atravessa o plano do corte {nome} em {len(trav)} pontos '
                                     f'({[np.round(x, 0).tolist() for x, _ in trav]}); escolha um com --perto x,y,z')
            X, tg = trav[0]
            _, iu, iw = P._indices(c)
            alvo = X[[iu, iw]]
            t = (-tg if a.get('sentido_inverso') else tg).tolist() if t is None else t
        elif fonte == 'alvo':
            if nome not in alvos:
                raise P.ErroDoPerfil(f'--alvo sem o corte {nome}')
            alvo = alvos[nome]
        caixa = caixas.get(nome) if fonte == 'caixa' else None
        if fonte == 'caixa' and caixa is None:
            raise P.ErroDoPerfil(f'--caixa sem o corte {nome}')
        r = P.perfil_do_corte(c, alvo=alvo, caixa=caixa, tangente=t, erro_tangente_graus=err_tangente if t is not None else None, **opcoes)
        resultados.append(r)
        if r.get('detalhe') and a.get('imagens'):
            P.desenhar(r, c, os.path.join(a['imagens'], f'perfil-{nome}.png'))
    except P.ErroDoPerfil as e:
        recusados.append({'corte': nome, 'erro': str(e)})
if not resultados:
    L.erro('nenhum corte deu perfil: ' + '; '.join(f"{r['corte']}: {r['erro']}" for r in recusados))

conjunto = P.combinar(resultados, opcoes['fundo_mm']) if len(resultados) > 1 or resultados[0].get('detalhe') else None
saida = {'ferramenta': 'ler-perfil', 'unidade': 'mm', 'fonte': fonte,
         'convencao': ('perfil do friso: [u, v] em metro, v pela normal da chapa (para fora) com v = 0 na base sob a âncora, u = normal x '
                       'tangente, e a tangente é a direção em que a linha é percorrida; o polígono fecha abaixo da base por fundo_mm; '
                       'a projeção ao longo da tangente leva o contorno do plano do corte ao plano normal à linha'),
         'cortes': P.sem_interno(resultados), 'recusados': recusados}
if fonte == 'linhas':
    saida['linha'] = {'indice': k, 'comprimento_mm': round(L.comprimento(curva), 1), 'tolerancia_mm': tol3d,
                      'sentido_inverso': bool(a.get('sentido_inverso'))}
if conjunto:
    saida['conjunto'] = P.sem_interno(conjunto)
linhas_do_resumo = []
for r in saida['cortes']:
    if not r.get('detalhe'):
        linhas_do_resumo.append(f"{r['corte']}: nenhum desvio acima do erro de leitura ({r['erro_leitura_mm']} mm); o detalhe não aparece neste corte")
        continue
    e = r['erro_mm']
    linhas_do_resumo.append(
        f"{r['corte']}: largura {r['largura_mm']} mm (u de {r['u_min_mm']} a {r['u_max_mm']}), altura {r['altura_mm']} mm sobre a base"
        + (f", {r['abaixo_da_chapa_mm']} mm abaixo dela" if r['abaixo_da_chapa_mm'] > 0 else '')
        + (f", {len(r['lacos'])} laço(s) enrolado(s) de raio {', '.join(str(l['raio_mm']) for l in r['lacos'])} mm" if r['lacos'] else '')
        + f"; erro {e['total']} mm (leitura {e['leitura']}, base {e['base']}, projeção {e['projecao']}); o corte atravessa a linha a "
        + f"{r['projecao']['obliquidade_graus']} graus da normal; {len(r['avisos'])} aviso(s)")
if conjunto and len(conjunto['cortes']) > 1:
    linhas_do_resumo.append(
        f"entre os {len(conjunto['cortes'])} cortes: a largura varia {conjunto['largura_mm']['variacao']} mm, a altura {conjunto['altura_mm']['variacao']} mm e os contornos "
        f"ficam a até {conjunto['distancia_maxima_entre_perfis_mm']} mm um do outro (erro de leitura {conjunto['erro_de_leitura_mm']} mm); "
        + ('a variação passa do erro: o detalhe muda ao longo da linha' if conjunto['variacao_acima_do_erro'] else 'a variação cabe no erro: um perfil serve aos cortes')
        + f"; representante {conjunto['representante']}")
saida['resumo'] = linhas_do_resumo
L.gravar_json(saida, a.get('saida'))
