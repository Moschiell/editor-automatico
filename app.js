const { FFmpeg } = FFmpegWASM;
const ffmpeg = new FFmpeg();
const $ = id => document.getElementById(id);
let selected = [];
let logoFile = null;

function esc(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

async function loadFFmpeg(){
  try{
    ffmpeg.on("log", ({message}) => {
      $("progress").textContent = message;
    });
    ffmpeg.on("progress", ({progress}) => {
      if (Number.isFinite(progress)) $("progress").textContent = `Processando… ${Math.round(progress*100)}%`;
    });
    await ffmpeg.load({
      coreURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js",
      wasmURL: "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm"
    });
    $("ffmpegStatus").textContent = "FFmpeg: pronto";
    $("ffmpegStatus").style.color = "#9ae6b4";
    update();
  }catch(e){
    $("ffmpegStatus").textContent = "FFmpeg: erro ao carregar";
    $("progress").innerHTML = `<span class="error">${esc(e.message||String(e))}</span>`;
  }
}

$("files").addEventListener("change", e => {
  selected = [...e.target.files].slice(0,5);
  renderQueue();
  update();
});
$("logo").addEventListener("change", e => { logoFile = e.target.files[0] || null; });
function renderQueue(){
  $("queue").innerHTML = selected.map((f,i)=>`<div class="item"><span>${i+1}. ${esc(f.name)}</span><small>${(f.size/1024/1024).toFixed(1)} MB</small></div>`).join("");
}
function update(){ $("process").disabled = !selected.length || !ffmpeg.loaded; }

function safeName(name){
  return name.replace(/\.[^/.]+$/,"").replace(/[^a-zA-Z0-9_-]+/g,"_")+"_vertical.mp4";
}

async function processOne(file, idx){
  const id = `${Date.now()}_${idx}`;
  const input = `input_${id}.mp4`;
  const output = `output_${id}.mp4`;
  await ffmpeg.writeFile(input, new Uint8Array(await file.arrayBuffer()));

  // 9:16: blurred background + foreground video.
  // This is a clean formatting template, not an anti-detection system.
  const bg = "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=22";
  const fg = "scale=980:1742:force_original_aspect_ratio=decrease";
  const mirror = $("mirror").checked ? "hflip," : "";
  const sharpen = $("sharpen").checked ? "unsharp=5:5:0.35:5:5:0," : "";
  const speed = $("speed").checked ? "setpts=PTS/1.03," : "";

  const filter = `[0:v]${bg}[bg];[0:v]${mirror}${speed}${sharpen}${fg}[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[v]`;
  const args = ["-i", input, "-filter_complex", filter, "-map","[v]","-map","0:a?","-c:v","libx264","-preset","ultrafast","-crf","28","-c:a","aac","-b:a","128k","-movflags","+faststart",output];

  await ffmpeg.exec(args);
  const data = await ffmpeg.readFile(output);
  await ffmpeg.deleteFile(input);
  await ffmpeg.deleteFile(output);
  return new Blob([data.buffer], {type:"video/mp4"});
}

$("process").addEventListener("click", async()=>{
  $("process").disabled = true;
  $("outputs").innerHTML = "";
  $("progress").textContent = "Iniciando…";

  try{
    for(let i=0;i<selected.length;i++){
      $("progress").textContent = `Vídeo ${i+1}/${selected.length}: ${selected[i].name}`;
      const blob = await processOne(selected[i], i);
      const url = URL.createObjectURL(blob);
      const div = document.createElement("div");
      div.className="out";
      div.innerHTML = `<strong>${esc(safeName(selected[i].name))}</strong><br><a href="${url}" download="${esc(safeName(selected[i].name))}">Baixar vídeo</a>`;
      $("outputs").appendChild(div);
    }
    $("progress").textContent = "Lote concluído.";
  }catch(e){
    $("progress").innerHTML = `<span class="error">Erro: ${esc(e.message||String(e))}</span>`;
  }finally{
    update();
  }
});

loadFFmpeg();
