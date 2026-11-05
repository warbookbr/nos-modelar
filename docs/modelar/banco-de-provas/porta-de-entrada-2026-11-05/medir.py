import json, glob, os, re, sys, collections
if len(sys.argv) != 2:
    sys.exit('uso: python3 medir.py <diretório das transcrições do projeto, com <sessão>/subagents/agent-*.jsonl>')
base=sys.argv[1].rstrip('/')
arqs=glob.glob(base+'/*/subagents/agent-*.jsonl')
tipo_por=collections.Counter(); bytes_cat=collections.Counter(); n_cat=collections.Counter()
arquivos_lidos=collections.Counter(); bytes_arq=collections.Counter()
total=0; agentes=collections.Counter(); input_tokens=0
def cat_bash(cmd):
    c=cmd
    if re.search(r'npm run (-s )?bancada|olhar-bancada',c): return 'bash: bancada'
    if re.search(r'npm run (-s )?descrever',c): return 'bash: descrever'
    if re.search(r'vistas:critica|vistas-para-critica',c): return 'bash: vistas'
    if re.search(r'guarda:',c): return 'bash: guardas'
    if re.search(r'conferir-pontos',c): return 'bash: conferir-pontos'
    if re.search(r'npm run (-s )?esboco',c): return 'bash: esboco'
    if re.search(r'\bnode -e|python3 -c|node --input-type',c): return 'bash: script na hora'
    if re.search(r'(^|[;&|]\s*)(cd [^;&]+&&\s*)?(node (tools|procedural|src)/|npm run)',c): return 'bash: rodar ferramenta'
    if re.search(r'\b(grep|rg|sed -n|cat|head|tail|awk)\b',c):
        if re.search(r'procedural/nucleo|src/|tools/|modulos/',c): return 'bash: ler código do núcleo/ferramentas'
        if re.search(r'procedural/pecas|receita',c): return 'bash: ler receita/peça'
        if re.search(r'docs/|\.md',c): return 'bash: ler docs'
        return 'bash: ler outro'
    if re.search(r'\bgit\b',c): return 'bash: git'
    if re.search(r'\bls\b|find ',c): return 'bash: listar'
    return 'bash: outro'
def cat_read(p):
    if p.endswith('.png') or p.endswith('.jpg'): return 'read: imagem'
    if '/procedural/nucleo/' in p or '/src/' in p or '/tools/' in p or '/modulos/' in p: return 'read: código núcleo/ferramentas'
    if '/procedural/pecas/' in p: return 'read: receita/peça'
    if p.endswith('.md'): return 'read: docs'
    return 'read: outro'
for f in arqs:
    meta=f.replace('.jsonl','.meta.json')
    tipo='?'
    try: tipo=json.load(open(meta)).get('agentType') or json.load(open(meta)).get('subagent_type') or '?'
    except: pass
    pend={}
    for l in open(f):
        try: e=json.loads(l)
        except: continue
        m=e.get('message') or {}
        u=(m.get('usage') or {})
        if u: input_tokens+=u.get('input_tokens',0)+u.get('cache_read_input_tokens',0)*0
        c=m.get('content')
        if not isinstance(c,list): continue
        for b in c:
            if b.get('type')=='tool_use':
                nome=b['name']; inp=b.get('input',{})
                if nome=='Bash': k=cat_bash(inp.get('command',''))
                elif nome=='Read':
                    k=cat_read(inp.get('file_path','')); arquivos_lidos[inp.get('file_path','')]+=1
                elif nome in('Grep','Glob'): k='grep/glob tool'
                elif nome in('Edit','Write'): k='editar'
                else: k=nome
                pend[b['id']]=(k,inp.get('file_path') if nome=='Read' else None)
                n_cat[k]+=1; agentes[tipo]+=0
            elif b.get('type')=='tool_result':
                k,fp=pend.get(b.get('tool_use_id'),('?',None))
                cont=b.get('content')
                if isinstance(cont,list):
                    tam=sum(len(x.get('text','')) if x.get('type')=='text' else 6000 for x in cont)  # imagem ~ estimada
                else: tam=len(str(cont))
                bytes_cat[k]+=tam; total+=tam
                if fp and not fp.endswith('.png'): bytes_arq[fp]+=tam
    agentes[tipo]+=1
print('transcrições:',len(arqs),'por tipo:',dict(agentes.most_common(8)))
print('texto devolvido pelas ferramentas, total %.1f MB'%(total/1e6))
for k,v in bytes_cat.most_common(18): print(f'  {k:42s} {v/1e6:6.2f} MB {100*v/total:5.1f}%  chamadas {n_cat[k]}')
print('arquivos de texto que mais custaram (lidos com Read):')
for k,v in bytes_arq.most_common(12): print(f'  {v/1e3:7.0f} KB  {arquivos_lidos[k]:4d}x  {k.replace(base,"")[:90]}')
print()
# por tipo de agente: fração de leitura de código
por=collections.defaultdict(collections.Counter); arqcod=collections.Counter(); arqcod_mod=collections.Counter()
for f in arqs:
    try: tipo=json.load(open(f.replace('.jsonl','.meta.json'))).get('agentType','?')
    except: tipo='?'
    pend={}
    for l in open(f):
        try: e=json.loads(l)
        except: continue
        c=(e.get('message') or {}).get('content')
        if not isinstance(c,list): continue
        for b in c:
            if b.get('type')=='tool_use':
                inp=b.get('input',{}); k=cat_bash(inp.get('command','')) if b['name']=='Bash' else (cat_read(inp.get('file_path','')) if b['name']=='Read' else b['name'])
                alvo=None
                if 'código' in k:
                    s=inp.get('command','') or inp.get('file_path','')
                    m=re.findall(r'((?:procedural/nucleo|src|tools|modulos)/[\w./-]+\.(?:js|mjs|ts|py))',s)
                    alvo=m[0] if m else None
                pend[b['id']]=(k,alvo)
            elif b.get('type')=='tool_result':
                k,alvo=pend.get(b.get('tool_use_id'),('?',None)); cont=b.get('content')
                tam=sum(len(x.get('text','')) if x.get('type')=='text' else 6000 for x in cont) if isinstance(cont,list) else len(str(cont))
                por[tipo][k]+=tam
                if alvo:
                    arqcod[alvo]+=tam
                    if tipo=='modelador': arqcod_mod[alvo]+=tam
for t,c in por.items():
    tot=sum(c.values()); cod=sum(v for k,v in c.items() if 'código' in k); img=c['read: imagem']
    print(f'{t:16s} total {tot/1e6:5.1f} MB  código {100*cod/max(tot,1):4.1f}%  imagens {100*img/max(tot,1):4.1f}%  docs {100*(c["bash: ler docs"]+c["read: docs"])/max(tot,1):4.1f}%')
print('modelador: código mais lido')
for k,v in arqcod_mod.most_common(10): print(f'  {v/1e3:6.0f} KB  {k}')
