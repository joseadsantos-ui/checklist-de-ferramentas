import {firebaseConfig} from "./firebase-config.js";
const FB="https://www.gstatic.com/firebasejs/10.14.1/", K="chk-v3-";
// [nome, qtd, caixaInicial, caixaFinal]  (sem faixa = todas as caixas)
const CAT=[["Alicate de corte diagonal",2],["Alicate universal",2],["Alicate de bico",2],["Alicate desencapador de terminais",1],["Alicate crimpador de terminais – ilhós",1],["Alicate crimpador friso terminal",1],["Serrinha com arco de serra",1],["Esquadro",1],["Alicate rebitador",1],["Martelo",1],["Punção",1],["Chave de fenda ¼”",2],["Chave de fenda 3/16”",3],["Chave de fenda 1/8”",2],["Chave Philips 3/16”",3],["Chave Philips 1/4”",1,1,7],["Chave Philips 1/8”",3],["Trena",1,1,6]];
const $=id=>document.getElementById(id), p=n=>n<10?"0"+n:""+n;
const hoje=()=>{const d=new Date();return d.getFullYear()+"-"+p(d.getMonth()+1)+"-"+p(d.getDate())};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmt=d=>d?d.split("-").reverse().join("/"):"—";
const sv=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const ld=(k,d)=>{try{const v=JSON.parse(localStorage.getItem(k));return v??d}catch(e){return d}};
const novo=()=>({data:hoje(),st:{},ex:[]});
let cx=ld(K+"cx",1), resp=ld(K+"resp",""), D=ld(K+"d"+cx,null)||novo(), L=[], HA=[], fb=null;
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
 }catch(e){console.error(e);status("erro","Erro no Firebase – salvando só neste aparelho")}
}

/* ---------- Dados da caixa ---------- */
function itens(){const n=+cx;
 return CAT.filter(c=>!c[2]||(n>=c[2]&&n<=c[3])).map(c=>({nome:c[0],qtd:c[1],r:D.st[c[0]]||(D.st[c[0]]={s:null,f:0})}))
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
 $("caixa").value=cx;$("data").value=D.data;$("resp").value=resp;sum()}
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
$("caixa").onchange=function(){save();cx=Math.max(1,parseInt(this.value,10)||1);sv(K+"cx",cx);D=ld(K+"d"+cx,null)||novo();render()};
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
 D=novo();save();render();toast(fb?(navigator.onLine?"Conferência salva":"Salva; envia quando houver internet"):"Salva neste aparelho")};
async function hist(){let a=[];
 if(fb){try{const q=fb.fs.query(fb.fs.collection(fb.db,"conferencias"),fb.fs.orderBy("criadoEm","desc"),fb.fs.limit(60));
  a=(await fb.fs.getDocs(q)).docs.map(d=>d.data())}catch(e){console.error(e);toast("Não foi possível ler o histórico")}}
 else a=ld(K+"hist",[]);
 const f=$("fc").value;if(f)a=a.filter(x=>x.caixa==f);HA=a;
 $("hl").innerHTML=a.length?a.map((c,i)=>`<details><summary><b>Caixa ${p(c.caixa)}</b> · ${fmt(c.data)} · ${esc(c.resp)} · <span class="${c.completa?"ok":"bad"}">${c.completa?"completa":c.falta+" un. em falta"}</span></summary><pre>${esc(report(c))}</pre><button data-c="${i}">Copiar</button></details>`).join(""):'<p class="nota">Nenhuma conferência salva ainda.</p>'}
$("hl").onclick=e=>{const b=e.target.closest("[data-c]");if(b)copiar(report(HA[b.dataset.c]))};
$("fc").oninput=hist;
function aba(h){$("conf").hidden=h;$("hist").hidden=!h;$("t1").classList.toggle("on",!h);$("t2").classList.toggle("on",h);if(h)hist()}
$("t1").onclick=()=>aba(false);$("t2").onclick=()=>aba(true);

render();initFB();
