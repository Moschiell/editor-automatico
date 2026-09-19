const API='https://editor-automatico-ffmpeg-server.onrender.com';
const $=id=>document.getElementById(id);
let files=[],previewUrl=null,wmUrl=null;
function setStatus(t,p){$('status').textContent=t;if(p!==undefined)$('progress').value=p}
function updatePreview(){
  $('previewTitle').textContent=$('headline').value;
  $('previewCaption').textContent=$('caption').value;
  $('previewHandle').textContent=$('handle').value;
  $('previewTitle').style.display=$('headline').value?'block':'none';
  $('previewCaption').style.display=$('caption').value?'block':'none';
  $('previewHandle').style.display=$('handle').value?'block':'none';
  $('previewWatermark').style.display=wmUrl?'block':'none';
  if(wmUrl)$('previewWatermark').src=wmUrl;
  $('logoSizeValue').textContent=$('logoSize').value;
  $('previewWatermark').style.width=$('logoSize').value+'px';
}
['headline','caption','handle','template','logoSize'].forEach(id=>$(id).addEventListener('input',updatePreview));
$('videos').onchange=e=>{
  files=[...e.target.files].slice(0,5);
  $('info').textContent=files.length+' vídeo(s) selecionado(s).';
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=files[0]?URL.createObjectURL(files[0]):null;
  $('preview').src=previewUrl||'';
};
$('watermark').onchange=e=>{
  if(wmUrl)URL.revokeObjectURL(wmUrl);
  wmUrl=e.target.files[0]?URL.createObjectURL(e.target.files[0]):null;
  updatePreview();
};
updatePreview();
async function waitJob(id,total){
  while(true){
    const r=await fetch(API+'/api/jobs/'+encodeURIComponent(id),{cache:'no-store'});
    if(!r.ok)throw Error('Não foi possível consultar o lote ('+r.status+')');
    const j=await r.json();
    const done=j.completed||0;
    setStatus(j.status==='processing'?`Processando ${done}/${total}...`:`Finalizando ${done}/${total}...`,Math.round(done/total*100));
    for(const v of j.videos||[])if(v.status==='done'&&!document.querySelector(`[data-vid="${v.id}"]`)){
      const x=document.createElement('div');x.className='result';x.dataset.vid=v.id;
      const a=document.createElement('a');a.href=API+v.downloadUrl;a.textContent='BAIXAR MP4';a.setAttribute('download','');
      x.append(document.createTextNode(v.name+' — '),a);$('results').appendChild(x);
    }
    if(j.status!=='processing'){
      if(j.videos?.some(v=>v.status==='error'))throw Error(j.videos.filter(v=>v.status==='error').map(v=>v.error).join('\n')||'Um ou mais vídeos falharam no servidor.');
      setStatus('Lote concluído.',100);return;
    }
    await new Promise(r=>setTimeout(r,1200));
  }
}
function uploadForm(form,total){
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();
    xhr.open('POST',API+'/api/jobs',true);
    xhr.setRequestHeader('Accept','application/json');
    xhr.upload.onprogress=e=>{if(e.lengthComputable)setStatus(`Enviando ${Math.round(e.loaded/e.total*100)}%...`,Math.round(e.loaded/e.total*25))};
    xhr.onerror=()=>reject(new Error('Falha de conexão com o servidor.'));
    xhr.ontimeout=()=>reject(new Error('Tempo de envio esgotado.'));
    xhr.timeout=10*60*1000;
    xhr.onload=()=>{
      let data={};try{data=JSON.parse(xhr.responseText||'{}')}catch{}
      if(xhr.status<200||xhr.status>=300)return reject(new Error(data.error||`Servidor respondeu ${xhr.status}`));
      if(!data.id)return reject(new Error('Servidor não retornou o ID do lote.'));
      resolve(data);
    };
    xhr.send(form);
  });
}
$('generate').onclick=async()=>{
  const selected=[...$('videos').files].slice(0,5);
  files=selected;
  if(!selected.length){setStatus('Erro: selecione pelo menos 1 vídeo.',0);return;}
  $('generate').disabled=true;$('results').innerHTML='';setStatus('Conectando ao servidor...',0);
  try{
    const h=await fetch(API+'/health',{cache:'no-store'});
    if(!h.ok)throw Error('Servidor indisponível');
    const form=new FormData();
    // Recria cada File como Blob para evitar problemas de File/Blob no navegador móvel.
    for(const file of selected){
      const buf=await file.arrayBuffer();
      const blob=new Blob([buf],{type:file.type||'video/mp4'});
      form.append('videos',blob,file.name||'video.mp4');
    }
    const wm=$('watermark').files[0];
    if(wm){
      const buf=await wm.arrayBuffer();
      const blob=new Blob([buf],{type:wm.type||'image/jpeg'});
      form.append('watermark',blob,wm.name||'watermark.jpg');
    }
    ['template','headline','caption','handle','logoSize','speed'].forEach(id=>form.append(id,$(id).value));
    form.append('mirror',$('mirror').checked?'true':'false');
    setStatus(wm?'Preparando vídeo + marca d’água...':'Preparando vídeos...',0);
    const j=await uploadForm(form,selected.length);
    setStatus(`Processando 0/${selected.length}...`,25);
    await waitJob(j.id,selected.length);
  }catch(e){setStatus('Erro: '+e.message,0)}finally{$('generate').disabled=false}
};
