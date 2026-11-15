import {firebaseConfig} from "./firebase-config.js";
const FB="https://www.gstatic.com/firebasejs/10.14.1/", K="chk-v3-", MAXCX=12;
// Lista padrão: n=nome, q=quantidade, a=da caixa, b=até a caixa (vazio = todas as caixas 1 a 12)
const P=(n,q,a,b)=>({n,q,a:a||null,b:b||null});
const PADRAO=[P("Alicate de corte diagonal",2),P("Alicate universal",2),P("Alicate de bico",2),P("Alicate desencapador de terminais",1),P("Alicate crimpador de terminais – ilhós",1),P("Alicate crimpador friso terminal",1),P("Serrinha com arco de serra",1),P("Esquadro",1),P("Alicate rebitador",1),P("Martelo",1),P("Punção",1),P("Chave de fenda ¼”",2),P("Chave de fenda 3/16”",3),P("Chave de fenda 1/8”",2),P("Chave Philips 3/16”",3),P("Chave Philips 1/4”",1,1,7),P("Chave Philips 1/8”",3),P("Trena",1,1,6)];
const $=id=>document.getElementById(id), p=n=>n<10?"0"+n:""+n;
const hoje=()=>{const d=new Date();return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=d=>d?d.split("-").reverse().join("/"):"—";
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const ld=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch(e){return d}};
const novo=()=>({data:hoje(),st:{},ex:[]});
let CAT=ld(K+"cat",null)||PADRAO.map(x=>({...x})), ED=[], HIST=[], LAST={}, cx=Math.min(MAXCX,Math.max(1,+ld(K+"cx",1)||1)), resp=ld(K+"resp",""), D=ld(K+"d"+cx,null)||novo(), L=[], HA=[], fb=null;
const save=()=>{sv(K+"d"+cx,D);sv(K+"resp",resp);sv(K+"cx",cx)};
function toast(t){const m=$("msg");m.textContent=t;m.className="show";setTimeout(()=>m.className="",2200)}

/* ---------- Firebase (opcional) ---------- */
function status(k,t){const b=$("st");b.className="badge "+k;b.textContent=t}
async function initFB(){
 if(!firebaseConfig||String(firebaseConfig.apiKey).startsWith("COLE")){status("local","Modo local (sem Firebase)");return}
 status("local","Conectando…");
 try{
  const [app,fs,au]=await Promise.all([import(FB+"firebase-app.js"),import(FB+"firebase-firestore.js"),import(FB+"firebase-auth.js")]);
  const a=app.initializeApp(firebaseConfig);
  const db=fs.initializeFirestore(a,{localCache:fs.persistentLocalCache({tabManager:fs.persistentMultipleTabManager()})});
  await au.signInAnonymously(au.getAuth(a));
  fb={db,fs};status("online","Firebase conectado");
  fs.onSnapshot(fs.doc(db,"config","catalogo"),sn=>{if(sn.exists()&&Array.isArray(sn.data().itens)){CAT=sn.data().itens;sv(K+"cat",CAT);if($("lista").hidden)render()}},e=>console.error(e));
  loadHist();
 }catch(e){console.error(e);status("erro","Erro: "+(e.code||e.message||"desconhecido"));$("st").title="Salvando só neste aparelho"}
}

/* ---------- Dados da caixa ---------- */
function itens(){const n=+cx;
 return CAT.filter(c=>(!c.a||n>=c.a)&&(!c.b||n<=c.b)).map(c=>({nome:c.n,qtd:c.q,r:D.st[c.n]||(D.st[c.n]={s:null,f:0})}))
  .concat(D.ex.map((e,i)=>({nome:e.nome,qtd:e.qtd,r:e,x:i})))}
const on=it=>it.nome.trim()!=="";
function stats(){const c={tot:0,sim:0,nao:0,pend:0,falta:0,semq:0,lote:0};
 L.forEach(it=>{if(!on(it))return;c.tot++;const r=it.r;if(r.l)c.lote++;
  if(r.s==="sim")c.sim++;else if(r.s==="nao"){c.nao++;c.falta+=r.f||0;if(!r.f)c.semq++}else c.pend++});return c}
function sum(){const c=stats();
 $("sum").innerHTML=`<span><b>${c.sim}</b> completos</span><span><b>${c.nao}</b> incompletos</span><span><b>${c.pend}</b> pendentes</span><span><b>${c.falta}</b> un. em falta</span>`+
 (c.semq?`<span class="warn"><b>${c.semq}</b> sem quantidade em falta</span>`:"")+(c.lote?`<span class="warn"><b>${c.lote}</b> marcado(s) em lote</span>`:"")+
 (c.tot&&!c.pend&&!c.semq?"<span><b>Pronto para finalizar</b></span>":"")}

/* ---------- Tabela ---------- */
function row(it,i){const r=it.r,x=it.x!==undefined;
 return `<tr data-i="${i}"><td class="n">${i+1}</td><td>${x?`<input class="cel nm" data-x placeholder="Nome da ferramenta" value="${esc(it.nome)}" aria-label="Nome da ferramenta extra"><button class="rm" data-rm aria-label="Remover">×</button>`:esc(it.nome)}</td>
 <td class="c">${x?`<input class="cel q" type="number" min="1" data-q value="${it.qtd}" aria-label="Quantidade">`:it.qtd}</td>
 <td class="c sg"><button data-s="sim">Sim</button><button data-s="nao">Não</button></td>
 <td class="c"><input class="cel q" type="number" min="0" data-f aria-label="Quantidade em falta"></td></tr>`}
function upd(tr,it){const r=it.r,a=on(it);
 tr.className=a&&r.s||"";
 tr.querySelectorAll("[data-s]").forEach(b=>{b.disabled=!a;b.classList.toggle("on",r.s===b.dataset.s);b.setAttribute("aria-pressed",r.s===b.dataset.s)});
 const f=tr.querySelector("[data-f]");f.disabled=r.s!=="nao";f.value=r.s==="nao"&&r.f?r.f:"";sum()}
function render(){L=itens();$("rows").innerHTML=L.map(row).join("");
 [...$("rows").children].forEach((tr,i)=>upd(tr,L[i]));
 renderCx();$("data").value=D.data;$("resp").value=resp;sum()}
$("rows").onclick=e=>{const t=e.target.closest("button");if(!t)return;const tr=t.closest("tr"),it=L[tr.dataset.i];
 if(t.dataset.rm!==undefined){D.ex.splice(it.x,1);save();render();return}
 const r=it.r;r.s=r.s===t.dataset.s?null:t.dataset.s;r.l=0;if(r.s!=="nao")r.f=0;save();upd(tr,it);
 if(r.s==="nao")tr.querySelector("[data-f]").focus()};
$("rows").oninput=e=>{const t=e.target,tr=t.closest("tr"),it=L[tr.dataset.i];
 if(t.dataset.x!==undefined){it.r.nome=it.nome=t.value;upd(tr,it)}
 else if(t.dataset.q!==undefined){it.r.qtd=it.qtd=Math.max(1,parseInt(t.value,10)||1)}
 else if(t.dataset.f!==undefined){let v=parseInt(t.value,10);if(isNaN(v)||v<0)v=0;if(v>it.qtd){v=it.qtd;t.value=v}it.r.f=v;sum()}
 save()};

/* ---------- Cabeçalho ---------- */
function renderCx(){let h="";for(let n=1;n<=MAXCX;n++){const l=LAST[n],k=!l?"":(l.completa?"ok":"bad");
 h+=`<button class="cxb ${k} ${n===cx?"on":""}" data-n="${n}" aria-label="Caixa ${n}">${p(n)}${l&&!l.completa?`<small>${l.falta}</small>`:""}</button>`}$("cxs").innerHTML=h}
$("cxs").onclick=e=>{const b=e.target.closest("[data-n]");if(!b)return;save();cx=+b.dataset.n;sv(K+"cx",cx);D=ld(K+"d"+cx,null)||novo();render()};
$("data").oninput=function(){D.data=this.value;save()};
$("resp").oninput=function(){resp=this.value;save()};
$("add").onclick=()=>{D.ex.push({nome:"",qtd:1,s:null,f:0});save();render();const i=$("rows").querySelectorAll("[data-x]");i[i.length-1].focus()};
$("allsim").onclick=()=>{const c=stats();if(!c.pend)return toast("Nenhum item pendente");
 if(confirm(`Marcar ${c.pend} item(ns) pendente(s) como SIM sem conferir um por um? Eles ficam registrados como "em lote".`)){L.forEach(it=>{if(on(it)&&!it.r.s){it.r.s="sim";it.r.l=1}});save();render()}};
$("clear").onclick=()=>{if(confirm("Descartar esta conferência? As marcações da caixa "+cx+" serão apagadas.")){D=novo();save();render()}};
$("print").onclick=()=>window.print();

/* ---------- Relatório ---------- */
function report(c){const f=[],pe=[];let lote=0;
 c.itens.forEach((it,i)=>{if(it.l)lote++;if(it.s==="nao")f.push(`- ${it.nome} – ${it.f?`faltam ${it.f} de ${it.qtd}`:"quantidade em falta não informada"}`);else if(!it.s)pe.push("- "+it.nome)});
 const L=["CHECK LIST – Caixa de ferramentas","Laboratório Instalações Industriais",`Caixa nº ${c.caixa} | Data: ${fmt(c.data)} | Responsável: ${c.resp||"—"}`,""];
 if(f.length)L.push("FALTANDO:",...f,"");if(pe.length)L.push("NÃO CONFERIDOS:",...pe,"");
 if(!f.length&&!pe.length)L.push("Todas as ferramentas conferidas e completas.");
 if(lote)L.push(`(${lote} item(ns) marcado(s) como SIM em lote)`);return L.join("\n")}
const draft=()=>({caixa:+cx,data:D.data,resp:resp.trim(),itens:L.filter(on).map(it=>({nome:it.nome.trim(),qtd:it.qtd,s:it.r.s,f:it.r.f||0,l:it.r.l?1:0}))});
function copiar(t){try{navigator.clipboard.writeText(t).then(()=>toast("Relatório copiado"),()=>toast("Não foi possível copiar"))}catch(e){toast("Não foi possível copiar")}}
$("copy").onclick=()=>copiar(report(draft()));

/* ---------- Finalizar e histórico ---------- */
$("fin").onclick=()=>{const c=stats();
 if(!resp.trim())return toast("Informe o responsável");
 if(!c.tot)return toast("Nenhuma ferramenta na lista");
 if(c.pend)return toast(c.pend+" item(ns) ainda pendente(s)");
 if(c.semq)return toast("Informe a quantidade em falta nos itens Não");
 const doc={...draft(),falta:c.falta,completa:!c.nao,lote:c.lote};
 if(fb)fb.fs.addDoc(fb.fs.collection(fb.db,"conferencias"),{...doc,criadoEm:fb.fs.serverTimestamp()}).catch(e=>{console.error(e);toast("Falha ao enviar ao Firebase")});
 else{const h=ld(K+"hist",[]);h.unshift({...doc,criadoEm:Date.now()});sv(K+"hist",h.slice(0,200))}
 HIST.unshift({...doc,criadoEm:Date.now()});calcLast();D=novo();save();render();toast(fb?(navigator.onLine?"Conferência salva":"Salva; envia quando houver internet"):"Salva neste aparelho")};
function calcLast(){LAST={};HIST.forEach(c=>{if(!LAST[c.caixa])LAST[c.caixa]=c});renderCx()}
async function loadHist(){let a=[];
 if(fb){try{const q=fb.fs.query(fb.fs.collection(fb.db,"conferencias"),fb.fs.orderBy("criadoEm","desc"),fb.fs.limit(300));
  a=(await fb.fs.getDocs(q)).docs.map(d=>d.data())}catch(e){console.error(e);toast("Não foi possível ler o histórico");return}}
 else a=ld(K+"hist",[]);
 HIST=a;calcLast()}
function drawHist(){let a=HIST;const f=$("fc").value;if(f)a=a.filter(x=>x.caixa==f);window.HA=a;
 $("hl").innerHTML=a.length?a.map((c,i)=>`<details><summary><b>Caixa ${p(c.caixa)}</b> · ${fmt(c.data)} · ${esc(c.resp)} · <span class="${c.completa?"ok":"bad"}">${c.completa?"completa":c.falta+" un. em falta"}</span></summary><pre>${esc(report(c))}</pre><button data-c="${i}">Copiar</button></details>`).join(""):'<p class="nota">Nenhuma conferência salva ainda.</p>'}
$("hl").onclick=e=>{const b=e.target.closest("[data-c]");if(b)copiar(report(window.HA[b.dataset.c]))};
$("fc").oninput=drawHist;
function faltando(){const tot={};let h="";
 for(let n=1;n<=MAXCX;n++){const l=LAST[n];
  if(!l){h+=`<details><summary><b>Caixa ${p(n)}</b> · <span class="mut">sem conferência</span></summary></details>`;continue}
  const m=l.itens.filter(i=>i.s==="nao");m.forEach(i=>tot[i.nome]=(tot[i.nome]||0)+(i.f||0));
  h+=`<details ${m.length?"open":""}><summary><b>Caixa ${p(n)}</b> · ${fmt(l.data)} · ${esc(l.resp)} · <span class="${m.length?"bad":"ok"}">${m.length?l.falta+" un. em falta":"completa"}</span></summary>${m.length?"<ul>"+m.map(i=>`<li>${esc(i.nome)}: faltam <b>${i.f||"?"}</b> de ${i.qtd}</li>`).join("")+"</ul>":""}</details>`}
 const t=Object.entries(tot);
 $("fl").innerHTML=(t.length?`<div class="tot"><b>Total geral em falta</b><ul>${t.map(([k,v])=>`<li>${esc(k)}: ${v}</li>`).join("")}</ul></div>`:"")+h}
/* ---------- Editor da lista ---------- */
function edRender(){$("ed").innerHTML=ED.map((c,i)=>`<div class="er" data-i="${i}"><input class="cel" data-k="n" value="${esc(c.n)}" placeholder="Ferramenta" aria-label="Nome"><input class="cel q" type="number" min="1" data-k="q" value="${c.q}" aria-label="Quantidade"><input class="cel q" type="number" min="1" max="${MAXCX}" data-k="a" value="${c.a||""}" placeholder="todas" aria-label="Da caixa"><input class="cel q" type="number" min="1" max="${MAXCX}" data-k="b" value="${c.b||""}" placeholder="todas" aria-label="Até a caixa"><button data-up title="Inserir linha nova acima">＋↑</button><button data-del title="Remover">×</button></div>`).join("")}
const foco=i=>{const e=$("ed").querySelectorAll('[data-k="n"]')[i];if(e)e.focus()};
$("ed").oninput=e=>{const t=e.target,i=t.closest(".er").dataset.i,k=t.dataset.k;if(!k)return;
 ED[i][k]=k==="n"?t.value:(parseInt(t.value,10)||(k==="q"?1:null))};
$("ed").onclick=e=>{const t=e.target.closest("button");if(!t)return;const i=+t.closest(".er").dataset.i;
 if(t.dataset.up!==undefined){ED.splice(i,0,{n:"",q:1,a:null,b:null});edRender();foco(i)}
 else if(t.dataset.del!==undefined&&(!ED[i].n.trim()||confirm("Remover \""+ED[i].n+"\" da lista?"))){ED.splice(i,1);edRender()}};
$("addfim").onclick=()=>{ED.push({n:"",q:1,a:null,b:null});edRender();foco(ED.length-1)};
$("padrao").onclick=()=>{if(confirm("Voltar para a lista padrão? Só vale depois de tocar em Salvar lista.")){ED=PADRAO.map(x=>({...x}));edRender()}};
$("salvarlista").onclick=()=>{const L2=ED.filter(c=>c.n.trim()).map(c=>({n:c.n.trim(),q:Math.max(1,c.q||1),a:c.a||null,b:c.b||null})),nm=new Set(L2.map(c=>c.n.toLowerCase()));
 if(!L2.length)return toast("A lista não pode ficar vazia");
 if(nm.size!==L2.length)return toast("Há nomes repetidos na lista");
 if(L2.some(c=>(c.a&&(c.a>MAXCX||c.a<1))||(c.b&&(c.b>MAXCX||c.b<1))||(c.a&&c.b&&c.a>c.b)))return toast("Confira 'Da cx' e 'Até cx' (1 a "+MAXCX+", início ≤ fim)");
 CAT=L2;sv(K+"cat",CAT);
 if(fb)fb.fs.setDoc(fb.fs.doc(fb.db,"config","catalogo"),{itens:CAT,atualizadoEm:fb.fs.serverTimestamp()}).catch(e=>{console.error(e);toast("Falha ao enviar a lista ao Firebase")});
 render();toast(fb?"Lista salva":"Lista salva neste aparelho")};
/* ---------- Abas ---------- */
function aba(t){["conf","falt","lista","hist"].forEach(k=>$(k).hidden=k!==t);
 document.querySelectorAll(".tabs button").forEach(b=>b.classList.toggle("on",b.dataset.t===t));
 if(t==="lista"){ED=CAT.map(x=>({...x}));edRender()}
 if(t==="falt"){faltando();loadHist().then(faltando)}
 if(t==="hist"){drawHist();loadHist().then(drawHist)}}
document.querySelectorAll(".tabs button").forEach(b=>b.onclick=()=>aba(b.dataset.t));

render();loadHist();initFB();
