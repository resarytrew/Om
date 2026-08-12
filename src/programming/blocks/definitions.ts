import * as Blockly from 'blockly';

let registered = false;

const definitionJson = [
  {
    type: 'lab_start',
    message0: 'когда ▶ запущен эксперимент',
    nextStatement: null,
    style: 'event_blocks',
    tooltip: 'Точка запуска программы эксперимента.',
  },
  {
    type: 'lab_connect_standard',
    message0: 'собрать стандартную цепь',
    previousStatement: null,
    nextStatement: null,
    style: 'circuit_blocks',
    tooltip: 'Соединяет источник, резистор, амперметр и вольтметр по эталонной схеме.',
  },
  {
    type: 'lab_clear_measurements',
    message0: 'очистить измерения',
    previousStatement: null,
    nextStatement: null,
    style: 'data_blocks',
  },
  {
    type: 'lab_set_resistance',
    message0: 'установить сопротивление R = %1 Ω',
    args0: [{ type: 'field_number', name: 'VALUE', value: 3, min: 0.5, max: 20, precision: 0.5 }],
    previousStatement: null,
    nextStatement: null,
    style: 'parameter_blocks',
  },
  {
    type: 'lab_sweep_voltage',
    message0: 'изменять U от %1 до %2 В с шагом %3 В %4 выполнить %5',
    args0: [
      { type: 'field_number', name: 'FROM', value: 2, min: 0, max: 12, precision: 0.5 },
      { type: 'field_number', name: 'TO', value: 12, min: 0, max: 12, precision: 0.5 },
      { type: 'field_number', name: 'STEP', value: 2, min: 0.5, max: 12, precision: 0.5 },
      { type: 'input_dummy' },
      { type: 'input_statement', name: 'DO' },
    ],
    previousStatement: null,
    nextStatement: null,
    style: 'control_blocks',
    tooltip: 'Автоматически устанавливает напряжение для каждого значения диапазона.',
  },
  {
    type: 'lab_wait',
    message0: 'ждать %1 с',
    args0: [{ type: 'field_number', name: 'SECONDS', value: 0.15, min: 0, max: 2, precision: 0.05 }],
    previousStatement: null,
    nextStatement: null,
    style: 'control_blocks',
  },
  {
    type: 'lab_measure_current',
    message0: 'измерить силу тока амперметром',
    previousStatement: null,
    nextStatement: null,
    style: 'measurement_blocks',
  },
  {
    type: 'lab_record',
    message0: 'записать измерение U, I, R',
    previousStatement: null,
    nextStatement: null,
    style: 'data_blocks',
  },
  {
    type: 'lab_plot',
    message0: 'построить график I(U)',
    previousStatement: null,
    nextStatement: null,
    style: 'data_blocks',
  },
] as const;

export const physicsLabTheme = Blockly.Theme.defineTheme('physicsLab', {
  base: Blockly.Themes.Classic,
  blockStyles: {
    event_blocks: { colourPrimary: '#28576a', colourSecondary: '#37748b', colourTertiary: '#1c3f4d' },
    circuit_blocks: { colourPrimary: '#34444f', colourSecondary: '#465b68', colourTertiary: '#26333b' },
    parameter_blocks: { colourPrimary: '#1e6174', colourSecondary: '#2d7b90', colourTertiary: '#174858' },
    control_blocks: { colourPrimary: '#55456f', colourSecondary: '#715a91', colourTertiary: '#413653' },
    measurement_blocks: { colourPrimary: '#28634c', colourSecondary: '#398064', colourTertiary: '#1e4b3a' },
    data_blocks: { colourPrimary: '#53643a', colourSecondary: '#6d814e', colourTertiary: '#3e4c2c' },
  },
  componentStyles: {
    workspaceBackgroundColour: '#101419',
    toolboxBackgroundColour: '#13181d',
    toolboxForegroundColour: '#c5d0d7',
    flyoutBackgroundColour: '#151b20',
    flyoutForegroundColour: '#c5d0d7',
    flyoutOpacity: 1,
    scrollbarColour: '#34414b',
    insertionMarkerColour: '#58d7ff',
    insertionMarkerOpacity: 0.35,
    cursorColour: '#58d7ff',
    selectedGlowColour: '#58d7ff',
    selectedGlowOpacity: 0.28,
  },
  fontStyle: {
    family: 'Inter, ui-sans-serif, system-ui, sans-serif',
    weight: '500',
    size: 11,
  },
  startHats: true,
});

export const physicsLabToolbox = {
  kind: 'flyoutToolbox',
  contents: [
    { kind: 'block', type: 'lab_connect_standard' },
    { kind: 'block', type: 'lab_clear_measurements' },
    { kind: 'block', type: 'lab_set_resistance' },
    { kind: 'block', type: 'lab_sweep_voltage' },
    { kind: 'block', type: 'lab_wait' },
    { kind: 'block', type: 'lab_measure_current' },
    { kind: 'block', type: 'lab_record' },
    { kind: 'block', type: 'lab_plot' },
  ],
};

export function registerPhysicsLabBlocks(): void {
  if (registered) return;
  const definitions = Blockly.common.createBlockDefinitionsFromJsonArray([...definitionJson]);
  Blockly.common.defineBlocks(definitions);
  registered = true;
}

export function buildDefaultBlockProgram(workspace: Blockly.WorkspaceSvg): void {
  workspace.clear();

  const start = workspace.newBlock('lab_start');
  const connect = workspace.newBlock('lab_connect_standard');
  const clear = workspace.newBlock('lab_clear_measurements');
  const resistance = workspace.newBlock('lab_set_resistance');
  const sweep = workspace.newBlock('lab_sweep_voltage');
  const wait = workspace.newBlock('lab_wait');
  const measure = workspace.newBlock('lab_measure_current');
  const record = workspace.newBlock('lab_record');
  const plot = workspace.newBlock('lab_plot');

  for (const block of [start, connect, clear, resistance, sweep, wait, measure, record, plot]) {
    block.initSvg();
    block.render();
  }

  start.nextConnection?.connect(connect.previousConnection!);
  connect.nextConnection?.connect(clear.previousConnection!);
  clear.nextConnection?.connect(resistance.previousConnection!);
  resistance.nextConnection?.connect(sweep.previousConnection!);
  sweep.nextConnection?.connect(plot.previousConnection!);
  sweep.getInput('DO')?.connection?.connect(wait.previousConnection!);
  wait.nextConnection?.connect(measure.previousConnection!);
  measure.nextConnection?.connect(record.previousConnection!);

  start.moveBy(36, 28);
  workspace.cleanUp();
}
