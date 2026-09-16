(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  let ffmpeg = null, selected = [], logoFile = null, logoURL = null, previewURL = null, ffmpegLoading = false;
  const CORE_BASE = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";

  function setStatus(text, cls="") { $("ffmpegStatus").textContent=text; $("ffmpegStatus").className="status "+cls; }
  function setProgress(text, cls="") { $("progress").innerHTML=cls==="error"?`<span class="error">${esc(text)}</span>`:cls==="ok"?`<span class="ok">${esc(text)}</span>`:cls==="warn"?`<span class="warn">${esc(text)}</span>`:esc(text); }
  async function toBlobURL(url,mime){const r=await fetch(url,{cache:"force-cache"});if(!r.ok)throw new Error(`Não foi possível carregar o FFmpeg (${r.status}).`);return URL.createObjectURL(new Blob([await r.arrayBuffer()],{type:mime}));}

  async function loadFFmpeg(){
    if(ffmpegLoading||ffmpeg)return; ffmpegLoading=true; $("process").disabled=true; setStatus("FFmpeg: carregando…"); setProgress("Preparando o motor de vídeo…");
    try{
      if(!window.FFmpegWASM?.FFmpeg) throw new Error("Biblioteca FFmpeg não encontrada.");
      ffmpeg=new window.FFmpegWASM.FFmpeg();
      ffmpeg.on("log",({message})=>{if(message&&/frame=|time=|speed=|Output|Input/i.test(message))setProgress(message);});
      ffmpeg.on("progress",({progress})=>{if(Number.isFinite(progress))setProgress(`Processando… ${Math.round(Math.max(0,Math.min(1,progress))*100)}%`);});
      const coreURL=await toBlobURL(`${CORE_BASE}/ffmpeg-core.js`,"text/javascript");
      const wasmURL=await toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`,"application/wasm");
      // Single-thread core: official usage only needs coreURL + wasmURL.
      await ffmpeg.load({coreURL,wasmURL});
      setStatus("FFmpeg: pronto","ok"); setProgress("FFmpeg carregado. O preview já pode ser usado; agora você pode gerar o vídeo.","ok");
    }catch(e){console.error(e);ffmpeg=null;setStatus("FFmpeg: erro","error");setProgress(e?.message||String(e),"error");}
    finally{ffmpegLoading=false;updateButton();}
  }

  function renderQueue(){$("queue").innerHTML=selected.length?selected.map((f,i)=>`<div class="item"><span>${i+1}. ${esc(f.name)}</span><small>${(f.size/1024/1024).toFixed(1)} MB</small></div>`).join(""):"";}
  function updateButton(){$("process").disabled=!selected.length||!ffmpeg||!ffmpeg.loaded;}
  function safeName(name){return name.replace(/\.[^/.]+$/i,"").replace(/[^a-zA-Z0-9_-]+/g,"_")+"_vertical.mp4";}
  function escapeDrawtext(text){return String(text).replace(/\\/g,"\\\\").replace(/:/g,"\\:").replace(/'/g,"\\'").replace(/%/g,"\\%");}

  function syncPreview(){
    const p=$("preview"), v=$("previewVideo"), headline=$("headline").value.trim(), handle=$("handle").value.trim();
    p.classList.toggle("preview-black",$("background").value==="black"); p.classList.toggle("mirrored",$("mirror").checked);
    $("previewHeadline").textContent=headline; $("previewHeadline").style.display=headline?"block":"none";
    const showHandle=$("showHandle").checked && handle; $("previewHandle").textContent=handle; $("previewHandle").style.display=showHandle?"block":"none";
    if(logoURL){$("previewLogo").src=logoURL;$("previewLogo").style.display="block";}else{$("previewLogo").style.display="none";}
    if(previewURL){$("previewEmpty").style.display="none";$("previewPlay").disabled=false;}else{$("previewEmpty").style.display="grid";$("previewPlay").disabled=true;}
    if(v.src&&!v.paused){} else if(v.src){v.currentTime=0;}
  }

  function setPreviewFile(file){
    if(previewURL)URL.revokeObjectURL(previewURL); previewURL=URL.createObjectURL(file); const v=$("previewVideo"); v.src=previewURL; v.load(); $("previewBadge").textContent="Preview do 1º vídeo"; v.onloadedmetadata=()=>{syncPreview();}; syncPreview();
  }

  $("files").addEventListener("change",e=>{selected=[...e.target.files].slice(0,5);renderQueue();if(selected[0])setPreviewFile(selected[0]);updateButton();if(e.target.files.length>5)setProgress("Foram selecionados mais de 5 vídeos; somente os 5 primeiros serão usados.","warn");});
  $("logo").addEventListener("change",e=>{logoFile=e.target.files[0]||null;if(logoURL)URL.revokeObjectURL(logoURL);logoURL=logoFile?URL.createObjectURL(logoFile):null;syncPreview();});
  ["background","mirror","headline","showHandle","handle","speed","sharpen"].forEach(id=>$(id).addEventListener("input",()=>{if(id==="showHandle")$("handle").disabled=!$("showHandle").checked;syncPreview();}));
  $("previewPlay").addEventListener("click",()=>{const v=$("previewVideo");if(v.paused){v.play().catch(()=>{});$("previewPlay").textContent="❚❚ Pausar preview";}else{v.pause();$("previewPlay").textContent="▶ Reproduzir preview";}});
  $("previewVideo").addEventListener("timeupdate",()=>{const v=$("previewVideo");const t=Math.floor(v.currentTime);$("previewTime").textContent=`${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;});
  $("previewVideo").addEventListener("play",()=>$("previewPlay").textContent="❚❚ Pausar preview");
  $("previewVideo").addEventListener("pause",()=>$("previewPlay").textContent="▶ Reproduzir preview");

  async function processOne(file,idx){
    const id=`${Date.now()}_${idx}`, ext=(file.name.split(".").pop()||"mp4").toLowerCase().replace(/[^a-z0-9]/g,"")||"mp4", input=`input_${id}.${ext}`, output=`output_${id}.mp4`; let logoName=null;
    try{
      setProgress(`Carregando ${file.name}…`); await ffmpeg.writeFile(input,new Uint8Array(await file.arrayBuffer()));
      if(logoFile){logoName=`logo_${id}`;await ffmpeg.writeFile(logoName,new Uint8Array(await logoFile.arrayBuffer()));}
      const bgMode=$("background").value, mirror=$("mirror").checked, speed=$("speed").checked, sharpen=$("sharpen").checked, headline=$("headline").value.trim(), handle=$("showHandle").checked?$("handle").value.trim():"";
      const bg=bgMode==="black"?"color=c=black:s=1080x1920:r=30[bg0]":"[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=22[bg0]";
      const speedVideo=speed?"setpts=PTS/1.03,":"", mirrorFilter=mirror?"hflip,":"", sharpFilter=sharpen?"unsharp=5:5:0.35:5:5:0,":"";
      let filters=[bg,`[0:v]${mirrorFilter}${speedVideo}${sharpFilter}scale=980:1742:force_original_aspect_ratio=decrease[fg0]`,`[bg0][fg0]overlay=(W-w)/2:(H-h)/2[v0]`],last="v0";
      if(headline){filters.push(`[${last}]drawtext=text='${escapeDrawtext(headline)}':fontcolor=white:fontsize=62:font='DejaVu Sans':borderw=4:bordercolor=black:x=(w-text_w)/2:y=55[v1]`);last="v1";}
      if(handle){filters.push(`[${last}]drawtext=text='${escapeDrawtext(handle)}':fontcolor=white:fontsize=42:font='DejaVu Sans':borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-95[v2]`);last="v2";}
      let mapVideo=`[${last}]`; if(logoName){filters.push(`[1:v]scale=220:-1[logo0]`);filters.push(`[${last}][logo0]overlay=W-w-35:35[vlogo]`);mapVideo="[vlogo]";}
      const args=["-i",input];if(logoName)args.push("-i",logoName);args.push("-filter_complex",filters.join(";"),"-map",mapVideo,"-map","0:a?","-c:v","libx264","-preset","ultrafast","-crf","28","-pix_fmt","yuv420p","-c:a","aac","-b:a","128k");
      if(speed)args.push("-af","atempo=1.03,aresample=async=1:first_pts=0"); args.push("-movflags","+faststart","-shortest",output); setProgress(`Vídeo ${idx+1}/${selected.length}: processando…`); await ffmpeg.exec(args); const data=await ffmpeg.readFile(output);return new Blob([data instanceof Uint8Array?data:new Uint8Array(data)],{type:"video/mp4"});
    }finally{try{await ffmpeg.deleteFile(input);}catch{}try{await ffmpeg.deleteFile(output);}catch{}if(logoName)try{await ffmpeg.deleteFile(logoName);}catch{}}
  }

  $("process").addEventListener("click",async()=>{if(!ffmpeg||!selected.length)return;$("process").disabled=true;$("outputs").innerHTML="";setProgress("Iniciando lote…");try{for(let i=0;i<selected.length;i++){const blob=await processOne(selected[i],i),url=URL.createObjectURL(blob),name=safeName(selected[i].name),div=document.createElement("div");div.className="out";const video=document.createElement("video");video.controls=true;video.playsInline=true;video.src=url;const title=document.createElement("strong");title.textContent=name;const br=document.createElement("br"),link=document.createElement("a");link.href=url;link.download=name;link.textContent="Baixar vídeo";div.append(title,br,link,video);$("outputs").appendChild(div);}setProgress(`Lote concluído: ${selected.length} vídeo(s).`,"ok");}catch(e){console.error(e);setProgress(`Erro: ${e?.message||String(e)}`,"error");}finally{updateButton();}});
  syncPreview(); loadFFmpeg();
})();
