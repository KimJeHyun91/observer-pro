export type PIDS = {
  idx: number;
  pids_id: string;
  pids_ip: string;
  pids_name: string;
  pids_location: string;
  linked_status: boolean;
  alarm_status: boolean;
  camera_id: string | null;
  line_x1: string;
  line_x2: string;
  line_y1: string;
  line_y2: string;
  type: 'pids';
}