import type * as Blockly from 'blockly';
import { ExperimentProgramError, type ExperimentProgram, type ExperimentStatement } from '../ast/types';

function numberField(block: Blockly.Block, name: string): number {
  const value = Number(block.getFieldValue(name));
  if (!Number.isFinite(value)) throw new ExperimentProgramError(`Поле ${name} должно быть числом.`, block.id);
  return value;
}

function parseChain(first: Blockly.Block | null): ExperimentStatement[] {
  const statements: ExperimentStatement[] = [];
  let block = first;
  const visited = new Set<string>();

  while (block) {
    if (visited.has(block.id)) throw new ExperimentProgramError('Обнаружен цикл соединений блоков.', block.id);
    visited.add(block.id);
    const sourceBlockId = block.id;

    switch (block.type) {
      case 'lab_start':
        break;
      case 'lab_connect_standard':
        statements.push({ type: 'connect-standard', sourceBlockId });
        break;
      case 'lab_clear_measurements':
        statements.push({ type: 'clear-measurements', sourceBlockId });
        break;
      case 'lab_set_resistance':
        statements.push({ type: 'set-resistance', value: numberField(block, 'VALUE'), sourceBlockId });
        break;
      case 'lab_sweep_voltage': {
        const from = numberField(block, 'FROM');
        const to = numberField(block, 'TO');
        const step = numberField(block, 'STEP');
        if (step <= 0) throw new ExperimentProgramError('Шаг напряжения должен быть больше нуля.', block.id);
        if (from > to) throw new ExperimentProgramError('В первой версии диапазон напряжения должен возрастать.', block.id);
        const input = block.getInputTargetBlock('DO');
        statements.push({
          type: 'sweep-voltage',
          from,
          to,
          step,
          body: parseChain(input),
          sourceBlockId,
        });
        break;
      }
      case 'lab_wait':
        statements.push({ type: 'wait', seconds: numberField(block, 'SECONDS'), sourceBlockId });
        break;
      case 'lab_measure_current':
        statements.push({ type: 'measure-current', sourceBlockId });
        break;
      case 'lab_record':
        statements.push({ type: 'record', sourceBlockId });
        break;
      case 'lab_plot':
        statements.push({ type: 'plot', x: 'U', y: 'I', sourceBlockId });
        break;
      default:
        throw new ExperimentProgramError(`Неизвестный блок: ${block.type}`, block.id);
    }

    block = block.getNextBlock();
  }
  return statements;
}

export function workspaceToExperimentProgram(workspace: Blockly.Workspace): ExperimentProgram {
  const starts = workspace
    .getTopBlocks(true)
    .filter((block) => block.type === 'lab_start');

  if (starts.length === 0) {
    throw new ExperimentProgramError('Добавьте стартовый блок «когда запущен эксперимент».');
  }
  if (starts.length > 1) {
    throw new ExperimentProgramError('В программе должен быть только один стартовый блок.', starts[1]?.id);
  }

  const start = starts[0];
  if (!start) throw new ExperimentProgramError('Стартовый блок не найден.');
  return {
    version: 1,
    statements: parseChain(start.getNextBlock()),
  };
}
