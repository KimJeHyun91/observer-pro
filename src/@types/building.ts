export type Building = {
  idx: number;
  outside_name: string;
  top_location: string;
  left_location: string;
  service_type: string;
  alarm_status: boolean;
  type?: string;
  map_image_url?: string | null;
}