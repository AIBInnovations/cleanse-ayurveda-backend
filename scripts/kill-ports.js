/**
 * Kill processes running on microservice ports (3000-3005)
 * Works on Windows, macOS, and Linux
 */

import { execSync, spawn } from "child_process";

const PORTS = [3000, 3001, 3002, 3003, 3004, 3005];
const isWindows = process.platform === "win32";

function getProcessOnPort(port) {
  try {
    if (isWindows) {
      const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      const lines = output.trim().split("\n");
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== "0") {
          pids.add(pid);
        }
      }
      return Array.from(pids);
    } else {
      const output = execSync(`lsof -ti :${port}`, {
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      });
      return output.trim().split("\n").filter(Boolean);
    }
  } catch {
    return [];
  }
}

function killProcess(pid) {
  try {
    if (isWindows) {
      execSync(`taskkill /F /PID ${pid}`, {
        stdio: ["pipe", "pipe", "pipe"],
      });
    } else {
      execSync(`kill -9 ${pid}`, {
        stdio: ["pipe", "pipe", "pipe"],
      });
    }
    return true;
  } catch {
    return false;
  }
}

function main() {
  console.log("> Checking for processes on microservice ports...\n");

  let killedAny = false;

  for (const port of PORTS) {
    const pids = getProcessOnPort(port);
    if (pids.length > 0) {
      for (const pid of pids) {
        console.log(`> Port ${port}: Found process PID ${pid}`);
        const killed = killProcess(pid);
        if (killed) {
          console.log(`> Port ${port}: Killed process PID ${pid}`);
          killedAny = true;
        } else {
          console.log(`> Port ${port}: Failed to kill process PID ${pid}`);
        }
      }
    }
  }

  if (killedAny) {
    console.log("\n> Cleanup complete. Ports should now be available.");
  } else {
    console.log("> No processes found on microservice ports. All ports are available.");
  }
}

main();
