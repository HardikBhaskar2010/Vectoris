import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";

const home = os.homedir();
const mingwBin = `${home}\\scoop\\apps\\mingw\\current\\bin`;
const cargoBin = `${home}\\.cargo\\bin`;

const currentPath = process.env.PATH || "";
const extraPaths = [mingwBin, cargoBin].filter((p) => existsSync(p));
const newPath = [...extraPaths, currentPath].join(";");

const args = process.argv.slice(2);
const isWin = process.platform === "win32";
const cmd = isWin ? "tauri.cmd" : "tauri";

const proc = spawn(cmd, args, {
  stdio: "inherit",
  env: {
    ...process.env,
    PATH: newPath,
  },
  shell: true,
});

proc.on("exit", (code) => {
  process.exit(code ?? 0);
});
