import type { ExperimentProgram, ExperimentStatement } from './types';

function indent(level: number): string {
  return '    '.repeat(level);
}

function statementToPython(statement: ExperimentStatement, level: number): string[] {
  const pad = indent(level);
  switch (statement.type) {
    case 'connect-standard':
      return [`${pad}experiment.connect_standard()`];
    case 'clear-measurements':
      return [`${pad}experiment.clear_measurements()`];
    case 'set-resistance':
      return [`${pad}resistor.resistance = ${statement.value}`];
    case 'sweep-voltage': {
      const lines = [
        `${pad}for voltage in np.arange(${statement.from}, ${statement.to} + ${statement.step} / 2, ${statement.step}):`,
        `${pad}    source.voltage = float(voltage)`,
      ];
      if (statement.body.length === 0) lines.push(`${pad}    pass`);
      for (const child of statement.body) lines.push(...statementToPython(child, level + 1));
      return lines;
    }
    case 'wait':
      return [`${pad}wait(${statement.seconds})`];
    case 'measure-current':
      return [`${pad}current = ammeter.read()`];
    case 'record':
      return [`${pad}experiment.record()`];
    case 'plot':
      return [`${pad}experiment.plot("${statement.x}", "${statement.y}")`];
  }
}

export function experimentProgramToPython(program: ExperimentProgram): string {
  const lines = ['from physics_lab import *', 'import numpy as np', ''];
  for (const statement of program.statements) lines.push(...statementToPython(statement, 0));
  return `${lines.join('\n')}\n`;
}
