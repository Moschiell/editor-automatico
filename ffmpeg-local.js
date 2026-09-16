(() => {
  "use strict";
  class LocalFFmpeg {
    constructor() {
      this.worker = null;
      this.loaded = false;
      this.nextId = 1;
      this.pending = new Map();
      this.logHandlers = [];
      this.progressHandlers = [];
    }

    on(event, callback) {
      if (event === "log") this.logHandlers.push(callback);
      if (event === "progress") this.progressHandlers.push(callback);
    }

    off(event, callback) {
      const list = event === "log" ? this.logHandlers : this.progressHandlers;
      const i = list.indexOf(callback);
      if (i >= 0) list.splice(i, 1);
    }

    _ensureWorker() {
      if (this.worker) return;
      this.worker = new Worker(`ffmpeg-worker.js?v=20260916-08`);
      this.worker.onmessage = (event) => {
        const { id, type, data } = event.data || {};
        if (type === "LOG") {
          this.logHandlers.forEach(fn => { try { fn(data); } catch (_) {} });
          return;
        }
        if (type === "PROGRESS") {
          this.progressHandlers.forEach(fn => { try { fn(data); } catch (_) {} });
          return;
        }
        const p = this.pending.get(id);
        if (!p) return;
        this.pending.delete(id);
        if (type === "ERROR") p.reject(new Error(data));
        else p.resolve(data);
      };
      this.worker.onerror = (event) => {
        const msg = event?.message || "Erro no Worker do FFmpeg.";
        for (const [id, p] of this.pending) {
          this.pending.delete(id);
          p.reject(new Error(msg));
        }
      };
    }

    _send(type, data, transfer = []) {
      this._ensureWorker();
      const id = this.nextId++;
      return new Promise((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        try {
          this.worker.postMessage({ id, type, data }, transfer);
        } catch (e) {
          this.pending.delete(id);
          reject(e);
        }
      });
    }

    async load(config = {}) {
      if (this.loaded) return false;
      this._ensureWorker();
      const first = await this._send("LOAD", config);
      this.loaded = true;
      return first;
    }

    writeFile(path, data) {
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
      return this._send("WRITE_FILE", { path, data: bytes }, [bytes.buffer]);
    }

    readFile(path, encoding = "binary") {
      return this._send("READ_FILE", { path, encoding });
    }

    deleteFile(path) {
      return this._send("DELETE_FILE", { path });
    }

    exec(args, timeout = -1, duration = 0) {
      return this._send("EXEC", { args, timeout, duration });
    }

    terminate() {
      for (const [id, p] of this.pending) {
        this.pending.delete(id);
        p.reject(new Error("FFmpeg foi encerrado."));
      }
      try { this.worker?.terminate(); } catch (_) {}
      this.worker = null;
      this.loaded = false;
    }
  }
  window.FFmpegLocal = LocalFFmpeg;
})();
