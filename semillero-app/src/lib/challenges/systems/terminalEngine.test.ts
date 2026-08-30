import { describe, expect, it } from "vitest";
import { createTerminalState, executeTerminalCommand, replayTerminal, terminalPrompt } from "./terminalEngine";
import type { SystemsChallengeNodeId } from "./registry";

function run(nodeId: SystemsChallengeNodeId, commands: string[]) {
  let state = createTerminalState(nodeId);
  let result = executeTerminalCommand(nodeId, state, "help");
  for (const command of commands) {
    result = executeTerminalCommand(nodeId, state, command);
    state = result.state;
  }
  return result;
}

describe("terminalEngine", () => {
  it("mantiene cwd con rutas relativas, absolutas, ~ y ..", () => {
    let state = createTerminalState("SI0");
    let result = executeTerminalCommand("SI0", state, "cd proyectos");
    expect(result.error).toBe(false);
    expect(result.state.cwd).toBe("/home/robot/proyectos");
    expect(terminalPrompt(result.state)).toContain("~/proyectos$");

    state = result.state;
    result = executeTerminalCommand("SI0", state, "cd rover/config");
    expect(result.state.cwd).toBe("/home/robot/proyectos/rover/config");
    result = executeTerminalCommand("SI0", result.state, "cd ..");
    expect(result.state.cwd).toBe("/home/robot/proyectos/rover");
    result = executeTerminalCommand("SI0", result.state, "cd ~");
    expect(result.state.cwd).toBe("/home/robot");
    result = executeTerminalCommand("SI0", result.state, "cd /home/robot/proyectos/rover/config");
    expect(result.state.cwd).toBe("/home/robot/proyectos/rover/config");
  });

  it("no cambia de carpeta si cd falla", () => {
    const state = createTerminalState("SI0");
    const result = executeTerminalCommand("SI0", state, "cd carpeta-inexistente");
    expect(result.error).toBe(true);
    expect(result.output).toContain("no existe");
    expect(result.state.cwd).toBe("/home/robot");
  });

  it("completa SI0 sólo al leer el archivo real", () => {
    const result = run("SI0", ["ls", "cd proyectos", "cd rover/config", "pwd", "cat nombre_robot.txt"]);
    expect(result.output).toBe("SABANABOT-01");
    expect(result.completed).toBe(true);
  });

  it("completa las operaciones de archivos de SI1A", () => {
    const result = run("SI1A", [
      "mkdir entrega",
      "cp logs/telemetria.csv entrega/telemetria.csv",
      "mv entrega/telemetria.csv entrega/datos.csv",
      "find . -name debug.tmp",
      "rm cache/sesion/debug.tmp",
    ]);
    expect(result.completed).toBe(true);
    expect(result.state.files["/home/robot/entrega/datos.csv"]).toBeDefined();
    expect(result.state.files["/home/robot/cache/sesion/debug.tmp"]).toBeUndefined();
  });

  it("exige permisos seguros en SI1B", () => {
    const denied = run("SI1B", ["./start_robot.sh"]);
    expect(denied.error).toBe(true);
    const unsafe = run("SI1B", ["ls -l", "chmod 777 start_robot.sh"]);
    expect(unsafe.error).toBe(true);
    const result = run("SI1B", ["ls -l", "chmod +x start_robot.sh", "./start_robot.sh"]);
    expect(result.completed).toBe(true);
  });

  it("requiere diagnosticar y usar .venv en SI2", () => {
    const globalInstall = run("SI2", ["python -m pip install pyserial"]);
    expect(globalInstall.error).toBe(true);
    const result = run("SI2", [
      "which python3",
      "python3 -m pip list",
      "source .venv/bin/activate",
      "python -m pip install pyserial",
      "python controller.py",
    ]);
    expect(result.completed).toBe(true);
    expect(result.state.venvActive).toBe(true);
  });

  it("protege procesos críticos y completa SI3A con el PID correcto", () => {
    const protectedResult = run("SI3A", ["ps aux", "kill 701"]);
    expect(protectedResult.error).toBe(true);
    expect(protectedResult.state.processes["701"].running).toBe(true);
    const result = run("SI3A", ["top", "kill 622"]);
    expect(result.completed).toBe(true);
  });

  it("completa el diagnóstico de red SI3B sólo con evidencia", () => {
    const premature = run("SI3B", ["diagnose subnet"]);
    expect(premature.error).toBe(true);
    const result = run("SI3B", ["ip addr", "ip route", "ping 192.168.1.52", "diagnose subnet"]);
    expect(result.completed).toBe(true);
  });

  it("completa la investigación ROS 2 de SI4", () => {
    const result = run("SI4", [
      "ros2 node list",
      "ros2 topic list",
      "ros2 topic echo /objects",
      "ros2 topic info /cmd_vel",
      "ros2 node info /planner",
      "diagnose cmd_vell",
    ]);
    expect(result.completed).toBe(true);
  });

  it("impide un commit incompleto y completa SI5 con archivos relevantes", () => {
    const invalid = run("SI5", ["git status", "git add notes.txt"]);
    expect(invalid.error).toBe(true);
    const result = run("SI5", [
      "git status",
      "git diff",
      "git branch",
      "resolve config.yaml",
      "git add controller.py config.yaml",
      "git commit -m \"Corrige configuración de seguridad\"",
    ]);
    expect(result.completed).toBe(true);
    expect(result.state.git.staged).not.toContain("notes.txt");
  });

  it("reproduce el historial sin perder el estado", () => {
    const state = replayTerminal("SI0", ["cd proyectos", "cd rover", "cd config", "cat nombre_robot.txt"]);
    expect(state.cwd).toBe("/home/robot/proyectos/rover/config");
    expect(state.flags.readRobotName).toBe(true);
  });
});
