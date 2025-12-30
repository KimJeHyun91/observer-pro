export type CrossingGateType = {
    idx: number;
    crossing_gate_ip: string;
    crossing_gate_port: string;
    gate_index: string;
    ledd_index: string;
    pt_index: string;
    direction: 'in' | 'out';
    location: string;
    is_used?: boolean;
};

export type LineInfo = {
    idx: number;
    inside_idx: number;
    line_name: string;
    alarm_status: boolean;
    created_at: string;
    updated_at: string;
    types: CrossingGateType[];
};

export type Floor = {
    idx: number;
    inside_name: string;
    alarm_status: boolean;
    created_at: string;
    updated_at: string;
    outside_idx: number;
    lines: LineInfo[];
};

export type parkingFeeOutsideInfo = {
    idx: number;
    outside_name: string;
    outside_ip: string;
    outside_port: string;
    outside_socket_port: string;
    status: string;
    alarm_status : boolean;
}

export type manageSalesInfo = {
    start_time?: string;
    end_time?: string;
    target_lp?: string;
    lp?: string;
    period_start?: string;
    period_end?: string;
    company?: string;
    name?: string;
    contents?: string;
    time? : string;
}

export type settlementInfo = {
    in_time?: string;
    out_time?: string;
    registered?: string;
    lp?: string;
    parking_fee?: string;
    paid_fee?: string;
    discounted_duration?: string;
    coupon?: string;
    pre_paid_fee?: string;
    id?: string;
    location?: string;
    contents?: string;
}

export type lprInfo = {
    kind: string;
    lp: string;
    lp_type: string;
    direction: string;
    location: string;
    image_url: string;
    image_url_header: string;
    fname?: string;
    folder_name?: string;
    loop_event_time: number;
    loop_event_time_person: string;
    ip: string;
    port: number;
    outside_ip: string;
    outside_port?: string;
    parking_location: string;
    outside_idx: number;
    inside_idx: number;
    line_idx: number;
    ledd_ip?: string;
    ledd_port?: string;
    ledd_index?: string;
    pt_ip?: string;
    pt_port?: string;
};

export type FeeCalculationResult = {
    outside_idx: number;
    inside_idx: number;
    line_idx: number;
    ledd_ip: string;
    ledd_port: string;
    ledd_index: string;
    outside_ip: string;
    outside_port: string;
    pt_ip: string;
    pt_port: string;
    location: string;
    lp: string;
    in_time: number;
    in_time_person: string;
    out_time: number;
    out_time_person: string;
    parkingfee: number;
    discountfee: number;
    reduction_name: string;
    feetype: number;
    prepayment: number;
    image_url: string;
};

export type GateStateInfo = {
    crossing_gate_idx: number;
    crossing_gate_ip: string;
    crossing_gate_port: string;
    direction: string;
    location: string;
    inside_idx: number;
    line_idx: number;
    outside_idx: number;
    outside_ip: string;
    state: string;
};

export type managePersonInfo = {
    id?: string;
    pw?: string;
    company?: string;
    name?: string;
    phone1?: string;
    quantity?: string;
    member_id?: string;
}

export type vehicleInfo = {
    loop_event_time_person: string;
    loop_event_time: number;
    type: string;
    location: string;
    direction: string;
    lp: string;
    contents: string;
    image_list: string[];
};

export type paymentInfo = {
    lp: string;
    in_time: string;
    payment_time: string;
    paid_fee: string;
    approvno: string;
    issuer: string;
    location: string;
    image: string;
}

export type ReductionPolicy = {
    idx: number;
    reduction_name: string;
    reduction_ratio: number;
    reduction_minute: number;
    reduction_fee: number;
    contents?: string;
    created_at: string;
    updated_at: string;
};

export type ReFeeCalculationRequest = {
    outside_ip: string;
    port: string;
    crossing_gate_ip: string;
    crossing_gate_port: string;
    lp: string;
    reduction_name: string;
}

export type VehicleInfo = {
    lp: string;
    lp_type: string;
    in_time: number;
    in_time_person: string;
    out_time?: number;
    out_time_person?: string;
    in_image_url?: string;
    out_image_url?: string;
    parking_status: string;
    parking_fee: number;
    pre_parking_fee: number;
    parking_time: string;
};

export type CurrentSituation = {
    in_general_vehicles: number;
    out_general_vehicles: number;
    in_reg_vehicles: number;
    out_reg_vehicles: number;
    in_manual_vehicles: number;
    out_manual_vehicles: number;
    parking_fee: number;
    pre_parking_fee: number;
    cash: number;
};

export type PaymentDetail = {
    lp: string;
    in_time: number;
    issuer: string | null;
    lp_type: string;
    contents: string;
    paydate: string;
    paytime: string;
    parking_fee: number;
};

export type PaymentDetailInfo = {
    lp: string;
    lp_type: string;
    in_time: number;
    in_time_person: string;
    out_time: number | null;
    out_time_person: string | null;
    reduction_policy_idx: number | null;
    reduction_name: string | null;
    contents: string | null;
    parking_fee: number;
    pre_parking_fee: number;
    discount_fee: number;
    parking_time: string;
};

export type DailyRevenueItem = {
    date: string;
    weekday: string;
    fee: number;
};

export type TotalRevenueItem = {
    seq: number;
    week_start: string;
    week_end: string;
    week_parking_fee: number;
    month_start: string;
    month_end: string;
    month_parking_fee: number;
};