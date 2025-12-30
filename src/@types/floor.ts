export type Floor = {
  idx: number;
  inside_name: string;
  outside_name: string;
  outside_idx: number;
  map_image_url: string | null;
  alarm_status: boolean;
  three_d_model_id: number | null;
}