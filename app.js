const API="https://editor-automatico-ffmpeg-server.onrender.com";
const $=id=>document.getElementById(id);
let files=[],previewUrl=null,pollTimer=null;
function status(t,p){$("status").textContent=t;if(p!==undefined)$("progress").value=p}
$("videos").onchange=e=>{files=[...e.target.files].slice(0,5);$("info").textContent=files.length+" vídeo(s) selecionado(s).";if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=files[0]?URL.createObjectURL(files[0]):null;$("preview").src=previewUrl||""};
async function waitJob(id,total){
  while(true){
    const r=await fetch(API+"/api/jobs/"+encodeURIComponent(id),{cache:"no-store"});
    if(!r.ok)throw Error("Não foi possível consultar o lote ("+r.status+")");
    const j=await r.json();
    const done=j.completed||0;
    status(j.status==="processing"?`Processando ${done}/${total}...`:`Finalizando ${done}/${total}...`,Math.round(done/total*100));
    if(j.videos){
      for(const v of j.videos){
        if(v.status==="done" && !document.querySelector(`[data-vid="${v.id}"]`)){
          const x=document.createElement("div");x.className="result";x.dataset.vid=v.id;
          const a=document.createElement("a");a.href=API+v.downloadUrl;a.textContent="BAIXAR MP4";a.setAttribute("download","");
          x.append(document.createTextNode(v.name+" — "),a);$("results").appendChild(x);
        }
      }
    }
    if(j.status!=="processing"){
      if(j.videos?.some(v=>v.status==="error"))throw Error("Um ou mais vídeos falharam no servidor.");
      status("Lote concluído.",100);return;
    }
    await new Promise(r=>setTimeout(r,1500));
  }
}
$("generate").onclick=async()=>{
  if(!files.length)return alert("Selecione pelo menos 1 vídeo.");
  $("generate").disabled=true;$("results").innerHTML="";status("Conectando ao servidor...",0);
  try{
    const h=await fetch(API+"/health",{cache:"no-store"});
    if(!h.ok)throw Error("Servidor /health indisponível");
    const f=new FormData();
    for(const file of files)f.append("videos",file,file.name);
    f.append("headline",$("headline").value);f.append("handle",$("handle").value);f.append("mirror",$("mirror").checked?"true":"false");f.append("speed",$("speed").value);
    status("Enviando vídeos ao servidor...",0);
    const r=await fetch(API+"/api/jobs",{method:"POST",body:f});
    if(!r.ok){let msg="Servidor respondeu "+r.status;try{const e=await r.json();if(e.error)msg=e.error}catch{}throw Error(msg)}
    const j=await r.json();await waitJob(j.id,files.length);
  }catch(e){status("Erro: "+e.message,0)}finally{$("generate").disabled=false}
};
