"""Consolida os resultados da sonda do BlendNet: lê resultados-brutos.json e grava resultados.json com os critérios (a) a (e) por objeto e o resumo."""
import json, sys, math, os, collections, statistics
RAIZ = sys.argv[1]
res = json.load(open(RAIZ + '/resultados-brutos.json'))
TOL = 0.02
for r in res:
    nn = f"{r['i']:02d}"
    r['a'] = len(r['recusas']) == 0 and r['esboco'] is not None
    r['verdade_ok'] = r.get('bpy_rc') == 0 and r.get('bpy_erro') is None and r.get('verdade_n', 0) > 0
    mf = f'{RAIZ}/verdade/{nn}.medida.json'
    m = json.load(open(mf)) if os.path.exists(mf) else None
    r['b'] = r['c'] = None; r['iou'] = None; r['diag_mm'] = None; r['c_detalhe'] = None
    if m and r['verdade_ok']:
        vis = [f for f in m['formas'] if not f['cortador'] and not f['oculto']]
        r['b'] = len(vis) == r['verdade_n']
        malha = json.load(open(f'{RAIZ}/verdade/{nn}.malha.json'))['objetos']
        import numpy as np
        mn = np.array([np.array(o['v']).reshape(-1, 3).min(0) for o in malha]).min(0); mx = np.array([np.array(o['v']).reshape(-1, 3).max(0) for o in malha]).max(0)
        diag = float(np.linalg.norm(mx - mn)); r['diag_mm'] = diag
        porNome = {f['rotulo']: f for f in vis}
        piores = []; sem = []
        for o in malha:
            f = porNome.get(o['nome'])
            if not f: sem.append(o['nome']); continue
            v = np.array(o['v']).reshape(-1, 3)
            d = max(np.abs(v.min(0) - np.array(f['caixa']['min'])).max(), np.abs(v.max(0) - np.array(f['caixa']['max'])).max())
            piores.append((float(d), o['nome']))
        r['c'] = (not sem) and all(d <= TOL * diag for d, _ in piores) and len(piores) > 0
        r['c_detalhe'] = {'sem_par': sem[:5], 'n_sem_par': len(sem), 'pior_mm': max(piores)[0] if piores else None, 'pior_nome': max(piores)[1] if piores else None,
                          'pior_pct_diag': 100 * max(piores)[0] / diag if piores else None, 'n_fora': sum(1 for d, _ in piores if d > TOL * diag)}
        r['iou'] = m.get('iou'); r['pulados'] = m.get('pulados'); r['iou_partes'] = m.get('partesNoIou'); r['erroIou'] = m.get('erroIou')
    r['d'] = r.get('valida')
    r['certo'] = bool(r['a'] and r['b'] and r['c'] and r['d'])
json.dump(res, open(RAIZ + '/resultados.json', 'w'), ensure_ascii=False, indent=1)
n = len(res)
cnt = lambda f: sum(1 for r in res if f(r))
print('n', n)
print('(a) sem recusa', cnt(lambda r: r['a']))
print('verdade ok', cnt(lambda r: r['verdade_ok']), ' bpy com erro:', [(r['i'], r.get('bpy_erro')) for r in res if not r['verdade_ok']][:20])
print('preambulo', cnt(lambda r: r.get('preambulo')))
print('(b)', cnt(lambda r: r['b']), '(c)', cnt(lambda r: r['c']), '(d)', cnt(lambda r: r['d']))
print('certos', cnt(lambda r: r['certo']))
print('a&d', cnt(lambda r: r['a'] and r['d']), 'a&verdade', cnt(lambda r: r['a'] and r['verdade_ok']))
tc = collections.Counter(); ex = {}
for r in res:
    for t in {x['tipo'] for x in r['recusas']}: tc[t] += 1; ex.setdefault(t, (r['i'], [x for x in r['recusas'] if x['tipo'] == t][0]))
print('tipos de recusa (objetos):', tc)
for t, (i, x) in ex.items(): print(' ', t, i, x['linha'], x['texto'][:100], '|', x['codigo'][:80])
