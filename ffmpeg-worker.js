const CORE_URL_DEFAULT = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js";
let core = null;

const TYPES = {
  LOAD: "LOAD", EXEC: "EXEC", WRITE_FILE: "WRITE_FILE", READ_FILE: "READ_FILE",
  DELETE_FILE: "DELETE_FILE", ERROR: "ERROR", PROGRESS: "PROGRESS", LOG: "LOG"
};

async function loadCore(data = {}) {
  if (core) return false;
  let coreURL = data.coreURL || CORE_URL_DEFAULT;
  let wasmURL = data.wasmURL || coreURL.replace(/\.js$/i, ".wasm");
  try {
    importScripts(coreURL);
  } catch (firstErr) {
    const fallbackCore = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/ffmpeg-core.js";
    if (coreURL !== fallbackCore) {
      coreURL = fallbackCore;
      wasmURL = fallbackCore.replace(/\.js$/i, ".wasm");
      try { importScripts(coreURL); }
      catch (secondErr) { throw new Error(`Não foi possível carregar o FFmpeg Core: ${secondErr?.message || secondErr}`); }
    } else {
      throw new Error(`Não foi possível carregar o FFmpeg Core: ${firstErr?.message || firstErr}`);
    }
  }
  if (typeof self.createFFmpegCore !== "function") {
    throw new Error("FFmpeg Core carregou, mas createFFmpegCore não foi encontrado.");
  }
  core = await self.createFFmpegCore({
    mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL }))}`
  });
  core.setLogger(data => self.postMessage({ type: TYPES.LOG, data }));
  core.setProgress(data => self.postMessage({ type: TYPES.PROGRESS, data }));
  return true;
}

self.onmessage = async (event) => {
  const { id, type, data } = event.data || {};
  try {
    let result;
    switch (type) {
      case TYPES.LOAD:
        result = await loadCore(data);
        break;
      case TYPES.WRITE_FILE:
        if (!core) throw new Error("FFmpeg não foi carregado.");
        core.FS.writeFile(data.path, data.data);
        result = true;
        break;
      case TYPES.READ_FILE:
        if (!core) throw new Error("FFmpeg não foi carregado.");
        result = core.FS.readFile(data.path, { encoding: data.encoding || "binary" });
        break;
      case TYPES.DELETE_FILE:
        if (!core) throw new Error("FFmpeg não foi carregado.");
        try { core.FS.unlink(data.path); } catch (_) {}
        result = true;
        break;
      case TYPES.EXEC:
        if (!core) throw new Error("FFmpeg não foi carregado.");
        core.setTimeout(data.timeout ?? -1);
        core.exec(...data.args);
        result = core.ret;
        core.reset();
        if (result !== 0) throw new Error(`FFmpeg terminou com código ${result}.`);
        break;
      default:
        throw new Error(`Tipo de mensagem desconhecido: ${type}`);
    }
    const transfer = result instanceof Uint8Array ? [result.buffer] : [];
    self.postMessage({ id, type, data: result }, transfer);
  } catch (err) {
    self.postMessage({ id, type: TYPES.ERROR, data: err?.message || String(err) });
  }
};
