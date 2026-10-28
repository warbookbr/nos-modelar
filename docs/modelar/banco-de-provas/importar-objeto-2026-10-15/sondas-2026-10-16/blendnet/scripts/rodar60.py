"""Orquestra as 60: traduz, roda o bpy (um processo por objeto), grava a malha da verdade no quadro do esboço, valida e mede."""
import json, sys, time, subprocess, os, concurrent.futures as cf
import numpy as np
RAIZ = sys.argv[1]; REPO = '/home/user/nos-mecanifica'
sys.path.insert(0, RAIZ + '/scripts')
import traduzir as T
amostra = json.load(open(RAIZ + '/amostra.json'))
VENV = RAIZ + '/venv-bpy/bin/python'
os.makedirs(RAIZ + '/traduzidos', exist_ok=True); os.makedirs(RAIZ + '/verdade', exist_ok=True)

def uma(i):
    r = amostra[i]; nn = f'{i:02d}'; res = {'i': i, 'id': r['id'], 'nome': r['name'], 'categoria': r['category']}
    t = time.perf_counter(); tr = T.traduzir(r['script'], f"{nn}-{r['name']}"); res['t_traducao_s'] = time.perf_counter() - t
    res['recusas'] = tr['recusas']; res['avisos'] = tr['avisos']; res['formas'] = tr['formas']; res['cortadores'] = tr['cortadores']; res['nomes'] = tr['nomes']
    res['nomes_padrao'] = tr['nomes_padrao']; res['nao_malha'] = tr['nao_malha']
    esb = f'{RAIZ}/traduzidos/{nn}.esboco.json'
    if tr['esboco']: json.dump(tr['esboco'], open(esb, 'w'), ensure_ascii=False, indent=1)
    res['esboco'] = esb if tr['esboco'] else None
    # verdade
    pref = f'{RAIZ}/verdade/{nn}'
    t = time.perf_counter()
    try:
        p = subprocess.run([VENV, '-I', RAIZ + '/scripts/verdade_bpy.py', f'{RAIZ}/exec/{nn}.py', pref], capture_output=True, text=True, timeout=120, cwd=RAIZ + '/verdade')
        res['bpy_rc'] = p.returncode; res['bpy_stderr'] = p.stderr[-300:]
    except subprocess.TimeoutExpired:
        res['bpy_rc'] = 'timeout'
    res['t_bpy_processo_s'] = time.perf_counter() - t
    if res.get('bpy_rc') == 0:
        v = json.load(open(pref + '.json')); z = np.load(pref + '.npz')
        res['bpy_erro'] = v['erro']; res['bpy_erro_original'] = v['erro_original']; res['preambulo'] = v['preambulo']; res['t_bpy_exec_s'] = v['tempo_exec_s']
        objs = []
        for o in v['objetos']:
            if o['oculto'] or o['n_vertices'] == 0: continue
            w = z[o['chave'] + '_v'] * T.MM
            e = np.stack([w[:, 0], w[:, 2], -w[:, 1]], 1)    # (x,y,z)_blender -> (x,z,-y)
            objs.append({'nome': o['nome'], 'v': e.ravel().round(4).tolist(), 't': z[o['chave'] + '_t'].ravel().tolist(), 'pai': o['pai']})
        res['verdade_n'] = len(objs); res['verdade_nomes'] = [o['nome'] for o in objs]; res['pais'] = [o['nome'] for o in objs if o['pai']]
        json.dump({'objetos': objs}, open(pref + '.malha.json', 'w'))
    return res

def medir(res):
    if not res['esboco']: return res
    nn = f"{res['i']:02d}"
    # (d) validação pela CLI
    t = time.perf_counter()
    p = subprocess.run(['node', 'tools/modelar/esboco.mjs', res['esboco'], '--descrever'], capture_output=True, text=True, cwd=REPO, timeout=300)
    res['t_validacao_s'] = time.perf_counter() - t
    res['valida'] = p.returncode == 0 and 'recusado' not in (p.stdout + p.stderr)
    res['validacao_saida'] = (p.stdout + p.stderr)[:600]
    # medidas
    malha = f'{RAIZ}/verdade/{nn}.malha.json' if res.get('bpy_rc') == 0 else '-'
    q = subprocess.run(['node', RAIZ + '/scripts/medir.mjs', REPO, res['esboco'], malha, f'{RAIZ}/verdade/{nn}.medida.json'], capture_output=True, text=True, cwd=REPO, timeout=300)
    res['medir_rc'] = q.returncode; res['medir_stderr'] = q.stderr[-300:]
    return res

if __name__ == '__main__':
    n = len(amostra)
    out = [uma(i) for i in range(n)]
    with cf.ThreadPoolExecutor(4) as ex: out = list(ex.map(medir, out))
    json.dump(out, open(RAIZ + '/resultados-brutos.json', 'w'), ensure_ascii=False, indent=1)
    print('feito', len(out))
