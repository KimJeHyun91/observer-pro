export type Service = {
  id: number;
  main_service_name: 'Observer' | '침수차단' | '차량관리' | '주차관리' | '터널관리' | '마을방송' | '주차요금'
  main_service_url?: string;
  use_service: boolean;
}

export type ObService = {
  id: number;
  service_type: 'observer' | 'mgist' | 'ebell' | 'accesscontrol' | 'guradianlite' | 'pids' | 'anpr' | 'ndoctor';
  service_type_kr: '옵저버' | 'MGIST' | '비상벨' | '출입통제' | '가디언라이트' | 'PIDS' | 'ANPR' | 'NDoctor';
  service_type_image?: string;
  use_service_type: boolean;
}