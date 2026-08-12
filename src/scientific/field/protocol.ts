export interface ChargedPlateParameters {
  readonly width: number;
  readonly height: number;
  readonly sigma: number;
  readonly nx: number;
  readonly ny: number;
  readonly probe_z: number;
  readonly sample_x_count?: number;
  readonly sample_z_count?: number;
  readonly sample_z_min?: number;
  readonly sample_z_max?: number;
}

export interface FieldSample {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly ex: number;
  readonly ey: number;
  readonly ez: number;
  readonly magnitude: number;
  readonly potential: number;
}

export interface ProbeField {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly ex: number;
  readonly ey: number;
  readonly ez: number;
  readonly magnitude: number;
}

export interface FieldValidation {
  readonly axis_analytic_ez: number;
  readonly axis_numeric_ez: number;
  readonly axis_refined_ez: number;
  readonly relative_error: number;
  readonly refined_relative_error: number;
  readonly convergence_delta: number;
  readonly transverse_symmetry_ratio: number;
  readonly far_z: number;
  readonly far_numeric_ez: number;
  readonly far_point_charge_ez: number;
  readonly far_relative_error: number;
}

export interface ChargedPlateResult {
  readonly parameters: Required<Pick<ChargedPlateParameters, 'width' | 'height' | 'sigma' | 'nx' | 'ny' | 'probe_z'>>;
  readonly samples: readonly FieldSample[];
  readonly probe: ProbeField;
  readonly validation: FieldValidation;
}

export type FieldWorkerRequest =
  | { readonly type: 'init'; readonly id: number }
  | { readonly type: 'solve'; readonly id: number; readonly parameters: ChargedPlateParameters };

export type FieldWorkerResponse =
  | { readonly type: 'ready'; readonly id: number; readonly pyodideVersion: string }
  | { readonly type: 'result'; readonly id: number; readonly result: ChargedPlateResult }
  | { readonly type: 'error'; readonly id: number; readonly error: string };
