import { execSync } from 'node:child_process';

const isWindows = process.platform === 'win32';

/**
 * Reads the full command line of a process. Prefers the PowerShell CIM query
 * because wmic was removed in recent Windows versions.
 */
export function readCommandLine(pid) {
  const attempts = isWindows
    ? [
        `powershell -NoProfile -Command "(Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}').CommandLine"`,
        `wmic process where processid=${pid} get CommandLine /value`,
        `ps -p ${pid} -o command=`,
      ]
    : [`ps -p ${pid} -o command=`];

  for (const command of attempts) {
    try {
      const output = execSync(command, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (output) return output.replace(/^CommandLine=/, '').trim();
    } catch {
      /* try the next strategy */
    }
  }

  return '';
}

/**
 * Finds the processes listening on a TCP port, with the project they belong to
 * so the developer can tell which application is holding it.
 */
export function findPortOwners(port) {
  let pids = [];

  try {
    const output = execSync(
      isWindows ? `netstat -ano -p tcp | findstr LISTENING | findstr :${port}` : `lsof -ti :${port}`,
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );

    pids = isWindows
      ? output
          .split('\n')
          .filter(Boolean)
          .map((line) => Number(line.trim().split(/\s+/).pop()))
          .filter((pid) => Number.isFinite(pid) && pid > 0 && pid !== process.pid)
      : output
          .split('\n')
          .map((value) => Number(value.trim()))
          .filter((pid) => Number.isFinite(pid) && pid > 0 && pid !== process.pid);
  } catch {
    return [];
  }

  return [...new Set(pids)].map((pid) => {
    const commandLine = readCommandLine(pid);
    const match = commandLine.match(/Proyectos[\\/]+[^\\/"]+[\\/]+([^\\/"]+)/);
    const inner = commandLine.match(/Proyectos[\\/]+([^\\/"]+)[\\/]+([^\\/"]+)/);

    return {
      pid,
      commandLine,
      project: inner ? `${inner[1]}/${inner[2]}` : (match?.[1] ?? 'programa desconocido'),
    };
  });
}

export { isWindows };
