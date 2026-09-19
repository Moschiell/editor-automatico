const API='https://editor-automatico-ffmpeg-server.onrender.com';
const $=id=>document.getElementById(id);
let previewUrl=null,wmUrl=null;
function status(text,progress){$('status').textContent=text;if(progress!==undefined)$('progress').value=progress;}
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
$('videos').addEventListener('change',()=>{
  const selected=[...$('videos').files].slice(0,5);
  $('info').textContent=selected.length?`${selected.length} vídeo(s) selecionado(s).`:'Nenhum vídeo selecionado.';
  if(previewUrl)URL.revokeObjectURL(previewUrl);
  previewUrl=selected[0]?URL.createObjectURL(selected[0]):null;
  $('preview').src=previewUrl||'';
  $('preview').load();
});
$('watermark').addEventListener('change',()=>{
  if(wmUrl)URL.revokeObjectURL(wmUrl);
  const f=$('watermark').files[0];
  wmUrl=f?URL.createObjectURL(f):null;
  updatePreview();
});
function readDataUrl(file){return new Promise((resolve,reject)=>{if(!file)return resolve('');const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('Não foi possível ler a marca d\'água.'));reader.readAsDataURL(file);});}
async function waitJob(id,total){
  while(true){
    const r=await fetch(API+'/api/jobs/'+encodeURIComponent(id),{cache:'no-store'});
    if(!r.ok){let e={};try{e=await r.json()}catch{}throw new Error(e.error||`Não foi possível consultar o lote (${r.status})`);}
    const j=await r.json();
    const done=j.completed||0;
    status(j.status==='processing'?`Processando ${done}/${total}...`:`Finalizando ${done}/${total}...`,25+Math.round((done/total)*75));
    for(const v of j.videos||[]){
      if(v.status==='done'&&!document.querySelector(`[data-vid="${v.id}"]`)){
        const row=document.createElement('div');row.className='result';row.dataset.vid=v.id;
        const a=document.createElement('a');a.href=API+v.downloadUrl;a.textContent='BAIXAR MP4';a.setAttribute('download','');
        row.append(document.createTextNode(`${v.name} — `),a);$('results').appendChild(row);
      }
    }
    if(j.status!=='processing'){
      if(j.videos?.some(v=>v.status==='error'))throw new Error(j.videos.filter(v=>v.status==='error').map(v=>v.error).join('\n')||'Um ou mais vídeos falharam no servidor.');
      status('Lote concluído.',100);return;
    }
    await new Promise(resolve=>setTimeout(resolve,1200));
  }
}
$('generate').addEventListener('click',async()=>{
  const selected=[...$('videos').files].slice(0,5);
  if(!selected.length){status('Erro: selecione pelo menos 1 vídeo.',0);return;}
  $('generate').disabled=true;$('results').innerHTML='';status('Verificando servidor...',0);
  try{
    const health=await fetch(API+'/health',{cache:'no-store'});
    if(!health.ok)throw new Error('Servidor indisponível.');
    const form=new FormData();
    // Este é deliberadamente o mesmo padrão que funcionou na V6.
    for(const file of selected)form.append('videos',file,file.name);
    const wm=$('watermark').files[0];
    if(wm)form.append('watermarkData',await readDataUrl(wm));
    form.append('template',$('template').value);
    form.append('headline',$('headline').value);
    form.append('caption',$('caption').value);
    form.append('handle',$('handle').value);
    form.append('logoSize',$('logoSize').value);
    form.append('speed',$('speed').value);
    form.append('mirror',$('mirror').checked?'true':'false');
    status(wm?'Enviando vídeos + marca d\'água...':'Enviando vídeos...',10);
    const response=await fetch(API+'/api/jobs',{method:'POST',body:form,cache:'no-store'});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||`Servidor respondeu ${response.status}`);
    if(!data.id)throw new Error('Servidor não retornou o ID do lote.');
    status(`Processando 0/${selected.length}...`,25);
    await waitJob(data.id,selected.length);
  }catch(error){status(`Erro: ${error.message}`,0);}finally{$('generate').disabled=false;}
});
updatePreview();
