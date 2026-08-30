import type { SystemsChallengeNodeId } from "@/lib/challenges/systems/registry";

export interface SimulatedFile {
  content: string;
  executable: boolean;
}

interface SimulatedProcess {
  name: string;
  cpu: number;
  critical: boolean;
  running: boolean;
}

export interface TerminalState {
  cwd: string;
  directories: string[];
  files: Record<string, SimulatedFile>;
  flags: Record<string, boolean>;
  processes: Record<string, SimulatedProcess>;
  venvActive: boolean;
  pyserialInstalled: boolean;
  git: { resolved: boolean; staged: string[]; committed: boolean };
}

export interface CommandResult {
  state: TerminalState;
  output: string;
  error: boolean;
  recognized: boolean;
  completed: boolean;
}

export interface ChecklistItem {
  label: string;
  done: boolean;
}

const HOME = "/home/robot";

export function createTerminalState(nodeId: SystemsChallengeNodeId): TerminalState {
  const base: TerminalState = {
    cwd: HOME,
    directories: [
      HOME,
      `${HOME}/documentos`,
      `${HOME}/descargas`,
      `${HOME}/proyectos`,
      `${HOME}/proyectos/rover`,
      `${HOME}/proyectos/rover/config`,
      `${HOME}/logs`,
      `${HOME}/cache`,
      `${HOME}/cache/sesion`,
    ],
    files: {
      [`${HOME}/README.txt`]: { content: "Sistema de entrenamiento del Semillero de Robótica.", executable: false },
      [`${HOME}/proyectos/rover/config/nombre_robot.txt`]: { content: "SABANABOT-01", executable: false },
      [`${HOME}/logs/telemetria.csv`]: { content: "timestamp,bateria\n08:00,87", executable: false },
      [`${HOME}/cache/sesion/debug.tmp`]: { content: "trace=serial-timeout", executable: false },
      [`${HOME}/start_robot.sh`]: { content: "#!/usr/bin/env bash\necho Robot iniciado correctamente.", executable: false },
    },
    flags: {},
    processes: {
      "410": { name: "ros2_daemon", cpu: 2, critical: true, running: true },
      "622": { name: "vision_node", cpu: 98, critical: false, running: true },
      "701": { name: "motor_safety", cpu: 1, critical: true, running: true },
      "845": { name: "logger", cpu: 4, critical: false, running: true },
    },
    venvActive: false,
    pyserialInstalled: false,
    git: { resolved: false, staged: [], committed: false },
  };

  if (nodeId === "SI2") {
    base.cwd = `${HOME}/controller`;
    base.directories.push(`${HOME}/controller`, `${HOME}/controller/.venv`, `${HOME}/controller/.venv/bin`);
    base.files[`${HOME}/controller/controller.py`] = { content: "import serial\nprint('Controller ready')", executable: false };
  }
  if (nodeId === "SI4") {
    base.cwd = `${HOME}/ros_ws`;
    base.directories.push(`${HOME}/ros_ws`);
  }
  if (nodeId === "SI5") {
    base.cwd = `${HOME}/robot_repo`;
    base.directories.push(`${HOME}/robot_repo`);
    base.files[`${HOME}/robot_repo/controller.py`] = { content: "MAX_SPEED = 0.6", executable: false };
    base.files[`${HOME}/robot_repo/config.yaml`] = { content: "<<<<<<< ours\nmax_speed: 0.6\n=======\nemergency_stop: true\n>>>>>>> theirs", executable: false };
    base.files[`${HOME}/robot_repo/notes.txt`] = { content: "recordatorio personal", executable: false };
  }
  return base;
}

export function terminalPrompt(state: TerminalState): string {
  const display = state.cwd === HOME ? "~" : state.cwd.startsWith(`${HOME}/`) ? `~/${state.cwd.slice(HOME.length + 1)}` : state.cwd;
  return `${state.venvActive ? "(.venv) " : ""}robot@semillero:${display}$`;
}

export function replayTerminal(nodeId: SystemsChallengeNodeId, commands: string[]): TerminalState {
  return commands.reduce((state, command) => executeTerminalCommand(nodeId, state, command).state, createTerminalState(nodeId));
}

export function executeTerminalCommand(nodeId: SystemsChallengeNodeId, current: TerminalState, rawCommand: string): CommandResult {
  const command = rawCommand.trim().replace(/\s+/g, " ");
  const state = cloneState(current);
  let output = "";
  let error = false;
  let recognized = true;
  const fail = (message: string) => { output = `Error: ${message}`; error = true; };

  if (!command) fail("escribe un comando.");
  else if (command === "help") output = helpFor(nodeId);
  else if (command === "clear") output = "";
  else if (command === "pwd") output = state.cwd;
  else if (/^cd(?:\s|$)/.test(command)) {
    const target = command.slice(2).trim() || "~";
    const path = resolvePath(state.cwd, target);
    if (!state.directories.includes(path)) fail(`cd: ${target}: no existe el directorio`);
    else state.cwd = path;
  } else if (/^ls(?:\s|$)/.test(command)) {
    const args = command.slice(2).trim().split(" ").filter(Boolean);
    const long = args.includes("-l") || args.includes("-la") || args.includes("-al");
    const pathArg = args.find((arg) => !arg.startsWith("-"));
    const target = resolvePath(state.cwd, pathArg ?? ".");
    if (!state.directories.includes(target)) fail(`ls: ${pathArg ?? target}: no existe el directorio`);
    else output = listDirectory(state, target, long);
    if (nodeId === "SI1B" && target === HOME && long) state.flags.inspectedPermissions = true;
  } else if (/^cat\s+/.test(command)) {
    const target = resolvePath(state.cwd, command.slice(4).trim());
    const file = state.files[target];
    if (!file) fail(`cat: ${command.slice(4).trim()}: no existe el archivo`);
    else {
      output = file.content;
      if (nodeId === "SI0" && target === `${HOME}/proyectos/rover/config/nombre_robot.txt`) state.flags.readRobotName = true;
    }
  } else if (/^mkdir\s+/.test(command)) {
    const args = command.slice(6).trim().split(" ");
    const recursive = args[0] === "-p";
    const targetArg = recursive ? args[1] : args[0];
    if (!targetArg) fail("mkdir: falta el nombre del directorio");
    else {
      const target = resolvePath(state.cwd, targetArg);
      const parent = dirname(target);
      if (!recursive && !state.directories.includes(parent)) fail(`mkdir: no existe el directorio padre ${parent}`);
      else if (state.directories.includes(target)) fail(`mkdir: ${targetArg}: el directorio ya existe`);
      else {
        if (recursive) addDirectoryTree(state, target);
        else state.directories.push(target);
        output = `Directorio creado: ${target}`;
      }
    }
  } else if (/^(cp|mv)\s+/.test(command)) {
    const operation = command.slice(0, 2) as "cp" | "mv";
    const [sourceArg, destinationArg, ...extra] = command.slice(3).trim().split(" ");
    if (!sourceArg || !destinationArg || extra.length) fail(`${operation}: usa ${operation} origen destino`);
    else {
      const source = resolvePath(state.cwd, sourceArg);
      let destination = resolvePath(state.cwd, destinationArg);
      const file = state.files[source];
      if (!file) fail(`${operation}: ${sourceArg}: no existe el archivo`);
      else {
        if (state.directories.includes(destination)) destination = `${destination}/${basename(source)}`;
        if (!state.directories.includes(dirname(destination))) fail(`${operation}: no existe el directorio de destino`);
        else {
          state.files[destination] = { ...file };
          if (operation === "mv") delete state.files[source];
          output = `${operation === "cp" ? "Archivo copiado" : "Archivo movido"}: ${destination}`;
        }
      }
    }
  } else if (/^find(?:\s|$)/.test(command)) {
    const match = command.match(/^find(?:\s+(\S+))?\s+-name\s+["']?([^"']+)["']?$/);
    if (!match) fail("find: usa find <ruta> -name <archivo>");
    else {
      const start = resolvePath(state.cwd, match[1] ?? ".");
      if (!state.directories.includes(start)) fail(`find: ${match[1]}: no existe el directorio`);
      else {
        const matches = Object.keys(state.files).filter((path) => path.startsWith(`${start}/`) && basename(path) === match[2]);
        output = matches.length ? matches.map((path) => relativeDisplay(state.cwd, path)).join("\n") : "";
        if (nodeId === "SI1A" && match[2] === "debug.tmp" && matches.length) state.flags.foundDebug = true;
      }
    }
  } else if (/^rm\s+/.test(command)) {
    const targetArg = command.slice(3).trim();
    const target = resolvePath(state.cwd, targetArg);
    if (!state.files[target]) fail(`rm: ${targetArg}: no existe el archivo`);
    else {
      delete state.files[target];
      output = `Archivo eliminado: ${target}`;
    }
  } else if (/^chmod\s+/.test(command)) {
    const [mode, targetArg, ...extra] = command.slice(6).trim().split(" ");
    const target = resolvePath(state.cwd, targetArg ?? "");
    if (!mode || !targetArg || extra.length) fail("chmod: usa chmod +x archivo");
    else if (!state.files[target]) fail(`chmod: ${targetArg}: no existe el archivo`);
    else if (mode === "777") fail("chmod 777 concede permisos innecesarios; aplica sólo el permiso de ejecución.");
    else if (mode === "+x" || /^[0-7]{2}[157]$/.test(mode)) {
      state.files[target].executable = true;
      output = `Permiso de ejecución añadido a ${targetArg}.`;
      if (nodeId === "SI1B" && target === `${HOME}/start_robot.sh`) state.flags.safeExecutable = true;
    } else fail(`modo ${mode} no permitido en esta prueba`);
  } else if (command.startsWith("./")) {
    const target = resolvePath(state.cwd, command.slice(2));
    const file = state.files[target];
    if (!file) fail(`${command}: no existe el archivo`);
    else if (!file.executable) fail(`${command}: Permission denied`);
    else {
      output = "Robot iniciado correctamente.";
      if (nodeId === "SI1B" && target === `${HOME}/start_robot.sh`) state.flags.startedRobot = true;
    }
  } else if (command === "which python3") {
    output = state.venvActive ? `${state.cwd}/.venv/bin/python3` : "/usr/bin/python3";
    if (nodeId === "SI2") state.flags.checkedPython = true;
  } else if (command === "python3 --version" || command === "python --version") output = "Python 3.12.4";
  else if (/^(?:python3\s+-m\s+pip|python\s+-m\s+pip|pip)\s+list$/.test(command)) {
    output = `Package  Version\npip      25.1${state.pyserialInstalled ? "\npyserial 3.5" : "\n(pyserial no está instalado)"}`;
    if (nodeId === "SI2") state.flags.checkedPackages = true;
  } else if (/^source\s+/.test(command)) {
    const targetArg = command.slice(7).trim();
    const target = resolvePath(state.cwd, targetArg.replace(/\/activate$/, ""));
    if (!targetArg.endsWith("/activate") || !state.directories.includes(target)) fail(`source: ${targetArg}: no existe el entorno`);
    else {
      state.venvActive = true;
      output = "Entorno virtual .venv activado.";
    }
  } else if (/^(?:python|python3)\s+-m\s+pip\s+install\s+pyserial$/.test(command)) {
    if (!state.venvActive) fail("instalación global bloqueada; activa .venv primero");
    else {
      state.pyserialInstalled = true;
      output = "Successfully installed pyserial-3.5";
    }
  } else if (command === "python controller.py" || command === "python3 controller.py") {
    if (!state.files[resolvePath(state.cwd, "controller.py")]) fail("controller.py no existe en este directorio");
    else if (!state.venvActive || !state.pyserialInstalled) fail("ModuleNotFoundError: No module named 'serial'");
    else {
      output = "Controller ready. Serial port connected.";
      state.flags.ranController = true;
    }
  } else if (/^(ps aux|top|htop)$/.test(command)) {
    output = processTable(state);
    if (nodeId === "SI3A") state.flags.inspectedProcesses = true;
  } else if (/^kill\s+\d+$/.test(command)) {
    const pid = command.split(" ")[1];
    const process = state.processes[pid];
    if (!process || !process.running) fail(`kill: PID ${pid} no existe`);
    else if (process.critical) fail(`${process.name} es un servicio crítico y la prueba bloqueó la acción`);
    else {
      process.running = false;
      output = `${process.name} (PID ${pid}) detenido.`;
      if (nodeId === "SI3A" && pid === "622") state.flags.stoppedCpuHog = true;
    }
  } else if (command === "ip addr") {
    output = "2: eth0: <UP>\n    inet 192.168.0.23/24 scope global eth0";
    if (nodeId === "SI3B") state.flags.checkedAddress = true;
  } else if (command === "ip route") {
    output = "default via 192.168.0.1 dev eth0\n192.168.0.0/24 dev eth0";
    if (nodeId === "SI3B") state.flags.checkedRoute = true;
  } else if (/^ping\s+/.test(command)) {
    const host = command.slice(5).trim();
    output = host === "192.168.1.52" ? "From 192.168.0.23: Destination Host Unreachable" : `PING ${host}: host desconocido en esta simulación`;
    if (nodeId === "SI3B" && host === "192.168.1.52") state.flags.pingedRobot = true;
  } else if (command === "diagnose subnet") {
    if (!state.flags.checkedAddress || !state.flags.checkedRoute || !state.flags.pingedRobot) fail("reúne primero evidencia con ip addr, ip route y ping");
    else {
      output = "Diagnóstico confirmado: los equipos están en subredes distintas y no existe una ruta entre ellas.";
      state.flags.diagnosedSubnet = true;
    }
  } else if (command === "ros2 node list") {
    output = "/camera\n/detector\n/planner\n/motor_driver";
    if (nodeId === "SI4") state.flags.listedNodes = true;
  } else if (command === "ros2 topic list") output = "/camera/image_raw\n/objects\n/cmd_vel\n/cmd_vell";
  else if (command === "ros2 topic echo /objects") {
    output = "class: obstacle\ndistance: 0.84";
    if (nodeId === "SI4") state.flags.readObjects = true;
  } else if (command === "ros2 topic info /cmd_vel") {
    output = "Type: geometry_msgs/msg/Twist\nPublisher count: 0\nSubscription count: 1";
    if (nodeId === "SI4") state.flags.inspectedCmdVel = true;
  } else if (command === "ros2 node info /planner") output = "Publishers:\n  /cmd_vell [geometry_msgs/msg/Twist]\nSubscribers:\n  /objects";
  else if (command === "diagnose cmd_vell") {
    if (!state.flags.listedNodes || !state.flags.readObjects || !state.flags.inspectedCmdVel) fail("reúne evidencia de nodos, /objects y /cmd_vel antes de diagnosticar");
    else {
      output = "Diagnóstico confirmado: planner publica en /cmd_vell; debe publicar en /cmd_vel.";
      state.flags.diagnosedRosTypo = true;
    }
  } else if (command === "git status") {
    output = `On branch feature/safety\n${state.git.resolved ? "modified: config.yaml" : "both modified: config.yaml"}\nmodified: controller.py\nuntracked: notes.txt`;
    if (nodeId === "SI5") state.flags.checkedGitStatus = true;
  } else if (command === "git diff" || command.startsWith("git diff ")) {
    output = state.git.resolved ? "config.yaml\n  max_speed: 0.6\n  emergency_stop: true" : state.files[`${HOME}/robot_repo/config.yaml`]?.content ?? "";
    if (nodeId === "SI5") state.flags.checkedGitDiff = true;
  } else if (command === "git branch") {
    output = "* feature/safety\n  main";
    if (nodeId === "SI5") state.flags.checkedGitBranch = true;
  } else if (command === "resolve config.yaml") {
    const path = resolvePath(state.cwd, "config.yaml");
    if (!state.files[path]) fail("config.yaml no existe en este directorio");
    else {
      state.files[path].content = "max_speed: 0.6\nemergency_stop: true";
      state.git.resolved = true;
      output = "Conflicto resuelto conservando max_speed y emergency_stop.";
    }
  } else if (/^git add\s+/.test(command)) {
    const files = command.slice(8).trim().split(" ").filter(Boolean);
    if (!files.length) fail("git add: indica los archivos");
    else if (files.includes("notes.txt") || files.includes(".")) fail("notes.txt es personal; prepara sólo controller.py y config.yaml");
    else if (files.some((file) => !state.files[resolvePath(state.cwd, file)])) fail("git add: uno de los archivos no existe");
    else if (files.includes("config.yaml") && !state.git.resolved) fail("resuelve config.yaml antes de prepararlo");
    else {
      state.git.staged = [...new Set([...state.git.staged, ...files])];
      output = `Preparados: ${state.git.staged.join(", ")}`;
    }
  } else if (/^git commit\s+-m\s+/.test(command)) {
    const message = command.slice("git commit -m ".length).replace(/^["']|["']$/g, "").trim();
    const relevantReady = state.git.resolved && ["controller.py", "config.yaml"].every((file) => state.git.staged.includes(file));
    if (!message) fail("git commit: el mensaje no puede estar vacío");
    else if (!relevantReady) fail("el commit requiere resolver y preparar controller.py y config.yaml");
    else {
      state.git.committed = true;
      output = `[feature/safety a61f0d2] ${message}\n2 files changed`;
    }
  } else {
    recognized = false;
    fail("comando no reconocido en este escenario. Escribe help.");
  }

  return { state, output, error, recognized, completed: isScenarioComplete(nodeId, state) };
}

export function scenarioChecklist(nodeId: SystemsChallengeNodeId, state: TerminalState): ChecklistItem[] {
  if (nodeId === "SI0") return [{ label: "Encontrar y leer nombre_robot.txt", done: Boolean(state.flags.readRobotName) }];
  if (nodeId === "SI1A") return [
    { label: "Crear el directorio entrega", done: state.directories.includes(`${HOME}/entrega`) },
    { label: "Guardar entrega/datos.csv", done: Boolean(state.files[`${HOME}/entrega/datos.csv`]) },
    { label: "Encontrar debug.tmp", done: Boolean(state.flags.foundDebug) },
    { label: "Eliminar debug.tmp", done: !state.files[`${HOME}/cache/sesion/debug.tmp`] },
  ];
  if (nodeId === "SI1B") return [
    { label: "Inspeccionar permisos", done: Boolean(state.flags.inspectedPermissions) },
    { label: "Añadir sólo ejecución", done: Boolean(state.flags.safeExecutable) },
    { label: "Iniciar el robot", done: Boolean(state.flags.startedRobot) },
  ];
  if (nodeId === "SI2") return [
    { label: "Revisar intérprete y paquetes", done: Boolean(state.flags.checkedPython && state.flags.checkedPackages) },
    { label: "Activar .venv", done: state.venvActive },
    { label: "Instalar pyserial en .venv", done: state.pyserialInstalled },
    { label: "Ejecutar controller.py", done: Boolean(state.flags.ranController) },
  ];
  if (nodeId === "SI3A") return [
    { label: "Inspeccionar procesos", done: Boolean(state.flags.inspectedProcesses) },
    { label: "Detener sólo el proceso anómalo", done: Boolean(state.flags.stoppedCpuHog) },
  ];
  if (nodeId === "SI3B") return [
    { label: "Inspeccionar IP y rutas", done: Boolean(state.flags.checkedAddress && state.flags.checkedRoute) },
    { label: "Probar conexión con el robot", done: Boolean(state.flags.pingedRobot) },
    { label: "Confirmar la causa", done: Boolean(state.flags.diagnosedSubnet) },
  ];
  if (nodeId === "SI4") return [
    { label: "Listar nodos", done: Boolean(state.flags.listedNodes) },
    { label: "Verificar /objects", done: Boolean(state.flags.readObjects) },
    { label: "Inspeccionar /cmd_vel", done: Boolean(state.flags.inspectedCmdVel) },
    { label: "Diagnosticar el tópico incorrecto", done: Boolean(state.flags.diagnosedRosTypo) },
  ];
  if (nodeId === "SI5") return [
    { label: "Inspeccionar estado, cambios y rama", done: Boolean(state.flags.checkedGitStatus && state.flags.checkedGitDiff && state.flags.checkedGitBranch) },
    { label: "Resolver config.yaml", done: state.git.resolved },
    { label: "Preparar sólo archivos relevantes", done: ["controller.py", "config.yaml"].every((file) => state.git.staged.includes(file)) },
    { label: "Crear un commit descriptivo", done: state.git.committed },
  ];
  return [];
}

function isScenarioComplete(nodeId: SystemsChallengeNodeId, state: TerminalState): boolean {
  if (nodeId === "SI6") return false;
  const items = scenarioChecklist(nodeId, state);
  return items.length > 0 && items.every((item) => item.done);
}

function cloneState(state: TerminalState): TerminalState {
  return {
    ...state,
    directories: [...state.directories],
    files: Object.fromEntries(Object.entries(state.files).map(([path, file]) => [path, { ...file }])),
    flags: { ...state.flags },
    processes: Object.fromEntries(Object.entries(state.processes).map(([pid, process]) => [pid, { ...process }])),
    git: { ...state.git, staged: [...state.git.staged] },
  };
}

function resolvePath(cwd: string, input: string): string {
  const expanded = input === "~" ? HOME : input.startsWith("~/") ? `${HOME}/${input.slice(2)}` : input;
  const source = expanded.startsWith("/") ? expanded : `${cwd}/${expanded || "."}`;
  const parts: string[] = [];
  for (const part of source.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") parts.pop();
    else parts.push(part);
  }
  return `/${parts.join("/")}`;
}

function dirname(path: string): string {
  const parts = path.split("/").filter(Boolean);
  parts.pop();
  return `/${parts.join("/")}` || "/";
}

function basename(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? "";
}

function addDirectoryTree(state: TerminalState, target: string) {
  const parts = target.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    if (!state.directories.includes(current)) state.directories.push(current);
  }
}

function listDirectory(state: TerminalState, target: string, long: boolean): string {
  const prefix = `${target}/`;
  const directories = state.directories.filter((path) => path.startsWith(prefix) && !path.slice(prefix.length).includes("/")).map(basename);
  const files = Object.entries(state.files).filter(([path]) => dirname(path) === target).map(([path, file]) => ({ name: basename(path), file }));
  if (!long) return [...directories, ...files.map(({ name }) => name)].sort().join("  ");
  return [
    ...directories.map((name) => `drwxr-xr-x 2 robot robot 4096 ${name}`),
    ...files.map(({ name, file }) => `${file.executable ? "-rwxr-xr-x" : "-rw-r--r--"} 1 robot robot ${file.content.length.toString().padStart(4)} ${name}`),
  ].sort().join("\n");
}

function relativeDisplay(cwd: string, path: string): string {
  return path.startsWith(`${cwd}/`) ? `./${path.slice(cwd.length + 1)}` : path;
}

function processTable(state: TerminalState): string {
  const rows = Object.entries(state.processes).filter(([, process]) => process.running).map(([pid, process]) => `${pid.padEnd(5)} ${`${process.cpu}%`.padEnd(5)} ${process.name}`);
  return ["PID   CPU   COMMAND", ...rows].join("\n");
}

function helpFor(nodeId: SystemsChallengeNodeId): string {
  const common = "Ayuda: pwd, ls [-l] [ruta], cd [ruta], cat <archivo>, help y clear.";
  const specific: Partial<Record<SystemsChallengeNodeId, string>> = {
    SI1A: "También: mkdir, cp, mv, find y rm.",
    SI1B: "También: chmod +x <archivo> y ./<archivo>.",
    SI2: "También: which python3, pip list, source, python -m pip install y python.",
    SI3A: "También: ps aux, top, htop y kill <PID>.",
    SI3B: "También: ip addr, ip route, ping y diagnose subnet.",
    SI4: "También: ros2 node list, ros2 topic list/echo/info y diagnose cmd_vell.",
    SI5: "También: git status/diff/branch/add/commit y resolve config.yaml.",
  };
  return `${common}${specific[nodeId] ? `\n${specific[nodeId]}` : ""}`;
}
