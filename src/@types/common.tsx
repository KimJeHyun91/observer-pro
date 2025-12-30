import type { ReactNode, CSSProperties } from 'react'

export interface CommonProps {
    id?: string
    className?: string
    children?: ReactNode
    style?: CSSProperties
}

export type TableQueries = {
    total?: number
    pageIndex?: number
    pageSize?: number
    query?: string
    sort?: {
        order: 'asc' | 'desc' | ''
        key: string | number
    }
}

export type TraslationFn = (
    key: string,
    fallback?: string | Record<string, string | number>,
) => string


export type LogoProps = {
    mode: 'light' | 'dark';
}

export type ViewMode = 'main' | 'dashboard';
export type ServiceType = 'origin' | 'inundation' | 'vehicle' | 'parking' | 'tunnel' | 'broadcast' | 'parkingFee';

export interface ServiceViewProps {
    viewMode?: ViewMode;
    onViewModeChnage?: (mode: ViewMode) => void;
}

export interface ServiceLayoutProps {
    serviceType: ServiceType;
    mainContent: React.ReactNode;
    dashboardContent: React.ReactNode;
    statusContent: React.ReactNode;
}

type AddFloorData = {
    inside_name: string;
    outside_idx: number;
    mapImageUrl : string;
};

type UpdateFloorData = {
    floorId: number;
    updatedFloorName: string;
};

type DeleteFloorData = {
    idx: number;
};

export type TargetEventPayload =
| { action: 'add'; data: AddFloorData }
| { action: 'update'; data: UpdateFloorData }
| { action: 'delete'; data: DeleteFloorData };

export type EventLogType ={
    idx: number;
    event_name?: string;
    description?: string;
    location?: string;
    event_idx?: number;
    event_type_id?: number;
    main_service_name?: string;
    service_type?: string;
    device_type?: string;
    event_occurrence_time: string;
    event_end_time?: string;
    severity_id?: number;
    is_acknowledge: boolean;
    acknowledge_user?: string;
    acknowledged_at?: string;
    sop_idx?: number;
    false_alarm_idx?: number;
    CONNECTION: boolean;
    outside_idx?: number;
    inside_idx?: number;
    water_level_idx?: number;
    device_idx?: number;
    camera_id?: string;
    snapshot_path?: string;
    created_at: Date;
    updated_at: Date;
  }
  