import "dotenv/config";
import { execSync } from "node:child_process";

// Frees the API port before the dev server starts. On Windows a crashed or
// orphaned `node server.js` keeps the socket bound after its terminal is gone,
// and the next `npm run dev` dies with EADDRINUSE.

const port = Number(process.env.PORT) || 5000;

function run(command) {
  try {
    return execSync(command, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    // No match is a non-zero exit for both netstat|findstr and lsof.
    return "";
  }
}

// Only PIDs that are LISTENING on exactly this port - never a client socket
// that happens to mention the number.
function listenerPids() {
  if (process.platform === "win32") {
    return run("netstat -ano -p tcp")
      .split(/\r?\n/)
      .filter((line) => line.includes("LISTENING"))
      .map((line) => line.trim().split(/\s+/))
      .filter((cols) => cols.length >= 5 && cols[1].endsWith(`:${port}`))
      .map((cols) => Number(cols[4]));
  }
  return run(`lsof -ti tcp:${port} -sTCP:LISTEN`)
    .split(/\r?\n/)
    .map(Number);
}

const pids = [...new Set(listenerPids())].filter((pid) => pid > 0 && pid !== process.pid);

if (pids.length === 0) {
  console.log(`Port ${port} is free.`);
} else {
  for (const pid of pids) {
    console.log(`Port ${port} held by pid ${pid} - stopping it.`);
    if (process.platform === "win32") run(`taskkill /PID ${pid} /T /F`);
    else run(`kill -9 ${pid}`);
  }
}
