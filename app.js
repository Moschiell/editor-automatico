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
  $('preview').load();
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
    setStatus(j.status==='processing'?`Processando ${done}/${total}...`:`Finalizando ${done}/${total}...`,Math.max(25,Math.round(done/total*100)));
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
$('generate').onclick=async()=>{
  const selected=[...$('videos').files].slice(0,5);
  files=selected;
  if(!selected.length){setStatus('Erro: selecione pelo menos 1 vídeo.',0);return;}
  $('generate').disabled=true;$('results').innerHTML='';setStatus('Conectando ao servidor...',0);
  try{
    const h=await fetch(API+'/health',{cache:'no-store'});
    if(!h.ok)throw Error('Servidor indisponível');
    const form=new FormData();
    for(const file of selected)form.append('videos',file,file.name);
    const wm=$('watermark').files[0];
    if(wm)form.append('watermark',wm,wm.name);
    form.append('template',$('template').value);
    form.append('headline',$('headline').value);
    form.append('caption',$('caption').value);
    form.append('handle',$('handle').value);
    form.append('logoSize',$('logoSize').value);
    form.append('speed',$('speed').value);
    form.append('mirror',$('mirror').checked?'true':'false');
    setStatus(wm?'Enviando vídeo + marca d’água...':'Enviando vídeo...',10);
    // Use the same fetch + FormData pattern that successfully uploaded videos in V6.
    // Do not set Content-Type manually; the browser supplies the multipart boundary.
    const r=await fetch(API+'/api/jobs',{method:'POST',body:form,cache:'no-store'});
    let data={};try{data=await r.json()}catch{}
    if(!r.ok)throw Error(data.error||`Servidor respondeu ${r.status}`);
    if(!data.id)throw Error('Servidor não retornou o ID do lote.');
    setStatus(`Processando 0/${selected.length}...`,25);
    await waitJob(data.id,selected.length);
  }catch(e){setStatus('Erro: '+e.message,0)}finally{$('generate').disabled=false}
};
