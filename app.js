const API='https://editor-automatico-ffmpeg-server.onrender.com';
const $=id=>document.getElementById(id);
let previewUrl=null,wmUrl=null,templateUrl=null,templateOverlayUrl=null,templateDataUrl='';
const TEMPLATE_RECT={x:.1007,y:.1276,w:.7986,h:.7311};
function status(text,progress){$('status').textContent=text;if(progress!==undefined)$('progress').value=progress;}
function applyTemplatePreview(){
  const video=$('preview');
  const overlay=$('previewTemplateOverlay');
  const active=!!templateDataUrl;
  video.classList.toggle('template-active',active);
  if(active){
    video.style.left=(TEMPLATE_RECT.x*100)+'%';
    video.style.top=(TEMPLATE_RECT.y*100)+'%';
    video.style.width=(TEMPLATE_RECT.w*100)+'%';
    video.style.height=(TEMPLATE_RECT.h*100)+'%';
    video.style.right='auto';video.style.bottom='auto';
    overlay.hidden=false;
    if(templateOverlayUrl)overlay.src=templateOverlayUrl;
  }else{
    video.style.left='0';video.style.top='0';video.style.width='100%';video.style.height='100%';
    video.style.right='auto';video.style.bottom='auto';
    overlay.hidden=true;overlay.removeAttribute('src');
  }
  $('templatePreviewMeta').textContent=active?'Template aplicado à prévia':'Sem template selecionado';
}
function updatePreview(){
  $('previewTitle').textContent=$('headline').value;
  $('previewCaption').textContent=$('caption').value;
  $('previewHandle').textContent=$('handle').value;
  $('previewTitle').style.display=templateDataUrl?'none':($('headline').value?'block':'none');
  $('previewCaption').style.display=templateDataUrl?'none':($('caption').value?'block':'none');
  $('previewHandle').style.display=templateDataUrl?'none':($('handle').value?'block':'none');
  $('previewWatermark').style.display=wmUrl?'block':'none';
  if(wmUrl)$('previewWatermark').src=wmUrl;
  $('logoSizeValue').textContent=$('logoSize').value;
  $('previewWatermark').style.width=$('logoSize').value+'px';
  applyTemplatePreview();
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
function readDataUrl(file){return new Promise((resolve,reject)=>{if(!file)return resolve('');const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));reader.readAsDataURL(file);});}
async function buildTemplateOverlay(file){
  const data=await readDataUrl(file);
  const img=new Image();
  img.onload=()=>{};
  img.src=data;
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Não foi possível carregar o template.'));});
  const canvas=document.createElement('canvas');
  canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
  const ctx=canvas.getContext('2d');
  ctx.drawImage(img,0,0);
  // Abre a janela central do template de teste, preservando todo o restante da arte.
  ctx.clearRect(Math.round(img.naturalWidth*TEMPLATE_RECT.x),Math.round(img.naturalHeight*TEMPLATE_RECT.y),Math.round(img.naturalWidth*TEMPLATE_RECT.w),Math.round(img.naturalHeight*TEMPLATE_RECT.h));
  return {data,overlay:canvas.toDataURL('image/png'),width:img.naturalWidth,height:img.naturalHeight};
}
$('templateImage').addEventListener('change',async()=>{
  const file=$('templateImage').files&&$('templateImage').files[0];
  if(!file)return;
  try{
    if(templateUrl)URL.revokeObjectURL(templateUrl);
    if(templateOverlayUrl)URL.revokeObjectURL(templateOverlayUrl);
    templateUrl=URL.createObjectURL(file);
    const built=await buildTemplateOverlay(file);
    templateDataUrl=built.data;
    templateOverlayUrl=await new Promise((resolve,reject)=>{const c=document.createElement('canvas');c.width=built.width;c.height=built.height;const ctx=c.getContext('2d');const im=new Image();im.onload=()=>{ctx.drawImage(im,0,0);c.toBlob(blob=>blob?resolve(URL.createObjectURL(blob)):reject(new Error('Não foi possível preparar a prévia do template.')),'image/png');};im.onerror=()=>reject(new Error('Não foi possível preparar a prévia do template.'));im.src=built.overlay;});
    $('templateImagePreview').src=templateUrl;
    $('templateImageName').textContent=file.name;
    $('templateImageMeta').textContent=`${built.width} × ${built.height}px • template aplicado`;
    $('templateReferenceCard').querySelector('.template-upload').hidden=true;
    $('templateReferencePreview').hidden=false;
    updatePreview();
  }catch(e){status(`Erro ao carregar template: ${e.message}`,0);}
});
$('removeTemplate').addEventListener('click',()=>{
  if(templateUrl)URL.revokeObjectURL(templateUrl);
  if(templateOverlayUrl)URL.revokeObjectURL(templateOverlayUrl);
  templateUrl=null;templateOverlayUrl=null;templateDataUrl='';$('templateImage').value='';$('templateImagePreview').removeAttribute('src');
  $('templateReferenceCard').querySelector('.template-upload').hidden=false;$('templateReferencePreview').hidden=true;
  updatePreview();
});
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
    // Mantido exatamente o mesmo mecanismo V7.6/V7.7 que já foi validado.
    for(const file of selected)form.append('videos',file,file.name);
    const wm=$('watermark').files[0];
    if(wm)form.append('watermarkData',await readDataUrl(wm));
    if(templateDataUrl){
      form.append('templateData',templateDataUrl);
      form.append('templateX',String(TEMPLATE_RECT.x));
      form.append('templateY',String(TEMPLATE_RECT.y));
      form.append('templateW',String(TEMPLATE_RECT.w));
      form.append('templateH',String(TEMPLATE_RECT.h));
    }
    form.append('template',$('template').value);
    form.append('headline',$('headline').value);
    form.append('caption',$('caption').value);
    form.append('handle',$('handle').value);
    form.append('logoSize',$('logoSize').value);
    form.append('speed',$('speed').value);
    form.append('mirror',$('mirror').checked?'true':'false');
    status(templateDataUrl?'Enviando vídeos + template...':(wm?'Enviando vídeos + marca d\'água...':'Enviando vídeos...'),10);
    const response=await fetch(API+'/api/jobs',{method:'POST',body:form,cache:'no-store'});
    let data={};try{data=await response.json()}catch{}
    if(!response.ok)throw new Error(data.error||`Servidor respondeu ${response.status}`);
    if(!data.id)throw new Error('Servidor não retornou o ID do lote.');
    status(`Processando 0/${selected.length}...`,25);
    await waitJob(data.id,selected.length);
  }catch(error){status(`Erro: ${error.message}`,0);}finally{$('generate').disabled=false;}
});
updatePreview();
