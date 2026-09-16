(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

  let ffmpeg = null;
  let selected = [];
  let logoFile = null;
  let logoURL = null;
  let previewURL = null;
  let posterURL = null;
  let ffmpegLoading = false;
  let processing = false;
  let fontReady = false;

  const CORE_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js";
  const WASM_URL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.wasm";

  function setStatus(text, cls = "idle") {
    const el = $("ffmpegStatus");
    el.textContent = text;
    el.className = "status " + cls;
  }

  function setProgress(text, cls = "") {
    const el = $("progress");
    const content = cls === "error" ? `<span class="error">${esc(text)}</span>`
      : cls === "ok" ? `<span class="ok">${esc(text)}</span>`
      : cls === "warn" ? `<span class="warn">${esc(text)}</span>`
      : esc(text);
    el.innerHTML = content;
  }

  async function loadFFmpeg() {
    if (ffmpeg?.loaded) return ffmpeg;
    if (ffmpegLoading) {
      while (ffmpegLoading) await new Promise(r => setTimeout(r, 100));
      if (ffmpeg?.loaded) return ffmpeg;
    }

    ffmpegLoading = true;
    setStatus("FFmpeg: carregando…", "loading");
    setProgress("Preparando o motor de vídeo (~30 MB na primeira vez)…");

    try {
      if (!window.FFmpegLocal) throw new Error("O módulo local do FFmpeg não foi carregado.");

      ffmpeg = new window.FFmpegLocal();
      ffmpeg.on("log", ({ message } = {}) => {
        if (message && /frame=|time=|speed=|Output|Input|Error/i.test(message)) setProgress(message);
      });
      ffmpeg.on("progress", ({ ratio } = {}) => {
        if (Number.isFinite(ratio)) setProgress(`Processando… ${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%`);
      });

      await ffmpeg.load({ coreURL: CORE_URL, wasmURL: WASM_URL });

      const fontResponse = await fetch("DejaVuSans-Bold.ttf?v=20260916-05", { cache: "force-cache" });
      if (!fontResponse.ok) throw new Error("Não foi possível carregar a fonte do texto.");
      await ffmpeg.writeFile("DejaVuSans-Bold.ttf", new Uint8Array(await fontResponse.arrayBuffer()));
      fontReady = true;
      setStatus("FFmpeg: pronto", "ok");
      setProgress("Motor pronto. Gerando vídeo…", "ok");
      return ffmpeg;
    } catch (e) {
      console.error("FFmpeg load error:", e);
      try { ffmpeg?.terminate?.(); } catch {}
      ffmpeg = null;
      setStatus("FFmpeg: erro", "error");
      setProgress(e?.message || String(e), "error");
      throw e;
    } finally {
      ffmpegLoading = false;
      updateButton();
    }
  }

  function renderQueue() {
    $("queue").innerHTML = selected.length
      ? selected.map((f, i) => `<div class="item"><span>${i + 1}. ${esc(f.name)}</span><small>${(f.size / 1024 / 1024).toFixed(1)} MB</small></div>`).join("")
      : `<div class="empty-queue">Nenhum vídeo selecionado.</div>`;
  }

  function updateButton() {
    $("process").disabled = !selected.length || processing;
  }

  function safeName(name) {
    return name.replace(/\.[^/.]+$/i, "").replace(/[^a-zA-Z0-9_-]+/g, "_") + "_vertical.mp4";
  }

  function escapeDrawtext(text) {
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/:/g, "\\:")
      .replace(/'/g, "\\'")
      .replace(/%/g, "\\%");
  }

  function syncPreview() {
    const p = $("preview");
    const v = $("previewVideo");
    const headline = $("headline").value.trim();
    const handle = $("handle").value.trim();

    p.classList.toggle("preview-black", $("background").value === "black");
    p.classList.toggle("mirrored", $("mirror").checked);
    p.style.setProperty("--poster", posterURL ? `url("${posterURL}")` : "#090a0d");

    $("previewHeadline").textContent = headline;
    $("previewHeadline").style.display = headline ? "block" : "none";

    const showHandle = $("showHandle").checked && handle;
    $("previewHandle").textContent = handle;
    $("previewHandle").style.display = showHandle ? "block" : "none";

    if (logoURL) {
      $("previewLogo").src = logoURL;
      $("previewLogo").style.display = "block";
    } else {
      $("previewLogo").removeAttribute("src");
      $("previewLogo").style.display = "none";
    }

    $("previewEmpty").style.display = previewURL ? "none" : "grid";
    $("previewPlay").disabled = !previewURL;
    v.playbackRate = $("speed").checked ? 1.03 : 1;
  }

  function capturePoster() {
    const v = $("previewVideo");
    if (!previewURL || !v.videoWidth || !v.videoHeight) return;
    try {
      const canvas = document.createElement("canvas");
      const w = 360;
      const h = Math.max(1, Math.round(w * v.videoHeight / v.videoWidth));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if ($("mirror").checked) { ctx.translate(w, 0); ctx.scale(-1, 1); }
      ctx.drawImage(v, 0, 0, w, h);
      canvas.toBlob(blob => {
        if (!blob) return;
        if (posterURL) URL.revokeObjectURL(posterURL);
        posterURL = URL.createObjectURL(blob);
        syncPreview();
      }, "image/jpeg", 0.75);
    } catch (e) { console.warn("Não foi possível criar o fundo do preview", e); }
  }

  function setPreviewFile(file) {
    if (previewURL) URL.revokeObjectURL(previewURL);
    previewURL = URL.createObjectURL(file);
    const v = $("previewVideo");
    v.pause();
    v.src = previewURL;
    v.load();
    $("previewBadge").textContent = "Preview do 1º vídeo";
    $("previewTime").textContent = "00:00";
    v.onloadedmetadata = () => { syncPreview(); capturePoster(); };
    v.onseeked = capturePoster;
    syncPreview();
  }

  $("files").addEventListener("change", (e) => {
    const files = Array.from(e.target.files || []);
    selected = files.slice(0, 5);
    renderQueue();
    if (selected[0]) setPreviewFile(selected[0]);
    updateButton();
    if (files.length > 5) setProgress("Foram selecionados mais de 5 vídeos; somente os 5 primeiros serão usados.", "warn");
    else if (selected.length) setProgress(`${selected.length} vídeo(s) selecionado(s). O FFmpeg só será carregado ao gerar.`);
  });

  $("logo").addEventListener("change", (e) => {
    logoFile = e.target.files[0] || null;
    if (logoURL) URL.revokeObjectURL(logoURL);
    logoURL = logoFile ? URL.createObjectURL(logoFile) : null;
    syncPreview();
  });

  ["background", "mirror", "headline", "showHandle", "handle", "speed", "sharpen"].forEach(id => {
    $(id).addEventListener("input", () => {
      if (id === "showHandle") $("handle").disabled = !$("showHandle").checked;
      syncPreview();
      capturePoster();
    });
  });

  $("previewPlay").addEventListener("click", () => {
    const v = $("previewVideo");
    if (v.paused) v.play().catch(() => {}); else v.pause();
  });
  $("previewVideo").addEventListener("timeupdate", () => {
    const v = $("previewVideo");
    const t = Math.floor(v.currentTime);
    $("previewTime").textContent = `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
  });
  $("previewVideo").addEventListener("play", () => $("previewPlay").textContent = "❚❚ Pausar preview");
  $("previewVideo").addEventListener("pause", () => $("previewPlay").textContent = "▶ Reproduzir preview");

  async function fsDelete(name) { try { await ffmpeg.deleteFile(name); } catch {} }

  async function processOne(file, idx, engine) {
    const id = `${Date.now()}_${idx}`;
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
    const input = `input_${id}.${ext}`;
    const output = `output_${id}.mp4`;
    let logoName = null;

    try {
      setProgress(`Carregando ${file.name}…`);
      await engine.writeFile(input, new Uint8Array(await file.arrayBuffer()));

      if (logoFile) {
        const logoExt = (logoFile.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
        logoName = `logo_${id}.${logoExt}`;
        await engine.writeFile(logoName, new Uint8Array(await logoFile.arrayBuffer()));
      }
      if (!fontReady) throw new Error("A fonte do texto não está disponível.");

      const bgMode = $("background").value;
      const mirror = $("mirror").checked;
      const speed = $("speed").checked;
      const sharpen = $("sharpen").checked;
      const headline = $("headline").value.trim();
      const handle = $("showHandle").checked ? $("handle").value.trim() : "";

      const bg = bgMode === "black"
        ? "color=c=black:s=1080x1920:r=30[bg0]"
        : "[0:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=22[bg0]";
      const speedVideo = speed ? "setpts=PTS/1.03," : "";
      const mirrorFilter = mirror ? "hflip," : "";
      const sharpFilter = sharpen ? "unsharp=5:5:0.35:5:5:0," : "";

      const filters = [
        bg,
        `[0:v]${mirrorFilter}${speedVideo}${sharpFilter}scale=980:1742:force_original_aspect_ratio=decrease[fg0]`,
        `[bg0][fg0]overlay=(W-w)/2:(H-h)/2[v0]`
      ];
      let last = "v0";
      if (headline) {
        filters.push(`[${last}]drawtext=text='${escapeDrawtext(headline)}':fontcolor=white:fontsize=62:fontfile=/DejaVuSans-Bold.ttf:borderw=4:bordercolor=black:x=(w-text_w)/2:y=55[v1]`);
        last = "v1";
      }
      if (handle) {
        filters.push(`[${last}]drawtext=text='${escapeDrawtext(handle)}':fontcolor=white:fontsize=42:fontfile=/DejaVuSans-Bold.ttf:borderw=3:bordercolor=black:x=(w-text_w)/2:y=h-95[v2]`);
        last = "v2";
      }

      let mapVideo = `[${last}]`;
      if (logoName) {
        filters.push(`[1:v]scale=220:-1[logo0]`);
        filters.push(`[${last}][logo0]overlay=W-w-35:35[vlogo]`);
        mapVideo = "[vlogo]";
      }

      const args = [
        "-i", input,
        ...(logoName ? ["-loop", "1", "-i", logoName] : []),
        "-filter_complex", filters.join(";"),
        "-map", mapVideo,
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-crf", "28",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k"
      ];
      if (speed) args.push("-af", "atempo=1.03,aresample=async=1:first_pts=0");
      args.push("-movflags", "+faststart", "-shortest", output);

      setProgress(`Vídeo ${idx + 1}/${selected.length}: processando…`);
      const exitCode = await engine.exec(args);
      if (exitCode !== 0) throw new Error(`FFmpeg terminou com código ${exitCode}.`);
      const data = await engine.readFile(output);
      return new Blob([data.buffer], { type: "video/mp4" });
    } finally {
      await fsDelete(input);
      await fsDelete(output);
      if (logoName) await fsDelete(logoName);
    }
  }

  $("process").addEventListener("click", async () => {
    if (!selected.length || processing) return;
    processing = true;
    updateButton();
    $("outputs").innerHTML = "";
    setProgress("Preparando o processamento…");

    try {
      const engine = await loadFFmpeg();
      for (let i = 0; i < selected.length; i++) {
        const blob = await processOne(selected[i], i, engine);
        const url = URL.createObjectURL(blob);
        const name = safeName(selected[i].name);
        // Inicia o download imediatamente. Não abre o MP4 no navegador.
        const link = document.createElement("a");
        link.href = url;
        link.download = name;
        link.rel = "noopener";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        link.remove();

        // Mantém apenas um fallback caso o Chrome bloqueie o download automático.
        const div = document.createElement("div");
        div.className = "out";
        const title = document.createElement("strong");
        title.textContent = `Download iniciado: ${name}`;
        const fallback = document.createElement("a");
        fallback.href = url;
        fallback.download = name;
        fallback.textContent = "Baixar novamente";
        div.append(title, document.createElement("br"), fallback);
        $("outputs").appendChild(div);
        setTimeout(() => URL.revokeObjectURL(url), 10 * 60 * 1000);
      }
      setProgress(`Lote concluído: ${selected.length} vídeo(s).`, "ok");
    } catch (e) {
      console.error(e);
      setProgress(`Não foi possível gerar o vídeo: ${e?.message || String(e)}`, "error");
    } finally {
      processing = false;
      updateButton();
    }
  });

  window.addEventListener("beforeunload", () => {
    if (previewURL) URL.revokeObjectURL(previewURL);
    if (posterURL) URL.revokeObjectURL(posterURL);
    if (logoURL) URL.revokeObjectURL(logoURL);
    try { ffmpeg?.terminate?.(); } catch {}
  });

  renderQueue();
  syncPreview();
})();
