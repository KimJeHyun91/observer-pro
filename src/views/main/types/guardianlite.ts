export type ObGuardianliteLocationData = {
  guardianlite_ip: string;
  top_location: string;
  left_location: string;
  dimension_type?: '2d' | '3d';
}

export type ObGuardianliteUpdateData = {
  guardianlite_ip: string;
  new_guardianlite_ip: string;
  guardianlite_name: string;
  ch1_label?: string;
  ch2_label?: string;
  ch3_label?: string;
  ch4_label?: string;
  ch5_label?: string;
}

export type ObGuardianlitePopup = {
  show: boolean;
  status: boolean;
  on_event?: boolean;
  name: string;
  ip: string;
  id: string;
  password: string;
  ch1: string | null;
  ch2: string | null;
  ch3: string | null;
  ch4: string | null;
  ch5: string | null;
  ch1_label: string | null;
  ch2_label: string | null;
  ch3_label: string | null;
  ch4_label: string | null;
  ch5_label: string | null;
  temper: string | null;
  top_location: string;
  left_location: string;
  icon_width: number;
  icon_height: number;
  canvas_width: number;
  canvas_height: number;
  map_type?: 'indoor' | 'outdoor';
}

type CmdGuardianliteControl = 'ON' | 'OFF';

export type MutateGuardianlitePopup = {
  ip: string,
  name: string,
  ch1: CmdGuardianliteControl,
  ch2: CmdGuardianliteControl,
  ch3: CmdGuardianliteControl,
  ch4: CmdGuardianliteControl,
  ch5: CmdGuardianliteControl,
  ch1_label: string;
  ch2_label: string;
  ch3_label: string;
  ch4_label: string;
  ch5_label: string;
  temper: string;
  status: boolean;
}
