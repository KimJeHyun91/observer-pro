import endpointConfig from '@/configs/endpoint.config'
import ApiService from './ApiService'
import { ApiResultObjectArray } from '@/@types/api';
// import { 
//     manageSalesInfo
// } from '@/@types/parkingFee'

export async function getParkingFeeList<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingFeeList,
        method: 'post'
    });
}

export async function setParkingFeeInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingFeeInfo,
        method: 'post',
        data: data,
    });
}

export async function deleteParkingFeeInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingFeeDelete,
        method: 'post',
        data: data,
    });
}

export async function updateParkingFeeInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.parkingFeeUpdate,
        method: 'post',
        data: data,
    });
}

export async function getFloorLineList<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.treeList,
        method: 'post',
        data: data,
    });
}

export async function getFloorList<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.infloorList,
        method: 'post',
        data: data,
    });
}

export async function setFloorInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.addFloorInfo,
        method: 'post',
        data: data,
    });
}

export async function updateFloorInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.updateFloorInfo,
        method: 'post',
        data: data,
    });
}

export async function deleteFloorInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.deleteFloorInfo,
        method: 'post',
        data: data,
    });
}

export async function getLineList<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.lineList,
        method: 'post',
        data: data,
    });
}

export async function setLineInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.addLineInfo,
        method: 'post',
        data: data,
    });
}

export async function updateLineInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.updateLineInfo,
        method: 'post',
        data: data,
    });
}

export async function deleteLineInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.deleteLineInfo,
        method: 'post',
        data: data,
    });
}

export async function addDeviceInfo<T extends Record<string, unknown>>({ data }: { data: T }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.addCrossingGateInfo,
        method: 'post',
        data: data,
    });
}

export async function updateDeviceInfo<T extends Record<string, unknown>>({ data }: { data: T }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.updateCrossingGateInfo,
        method: 'post',
        data: data,
    });
}

export async function deleteDeviceInfo<T extends Record<string, unknown>>({ data }: { data: T }) {
    return ApiService.fetchDataWithAxios<T>({
        url: endpointConfig.deleteCrossingGateInfo,
        method: 'post',
        data: data,
    });
}

export async function crossingGateDirectionList<T = unknown>({ data }: { data: Record<string, unknown> }): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.crossingGateDirectionList,
        method: 'post',
        data,
    });
}

export async function getReductionPolicyList<T>(): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.reductionPolicyList,
        method: 'post'
    });
}

export async function reFeeCalculation<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.reFeeCalculation,
        method: 'post',
        data: data,
    });
}

export async function getLineLPRInfo<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.lineLPRInfo,
        method: 'post',
        data: data,
    });
}

export async function getVehicleList<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.VehicleList,
        method: 'post',
        data: data,
    });
}

export async function getCurrentSituation<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.CurrentSituation,
        method: 'post',
        data: data,
    });
}

export async function getPaymentDetailList<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.paymentDetailList,
        method: 'post',
        data: data,
    });
}

export async function getPaymentDetailInfo<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.paymentDetailInfo,
        method: 'post',
        data: data,
    });
}

export async function getDailyRevenue<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.dailyRevenue,
        method: 'post',
        data: data,
    });
}

export async function getTotalRevenue<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.totalRevenue,
        method: 'post',
        data: data,
    });
}

export async function getPieChartItem<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
    return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
        url: endpointConfig.pieChart,
        method: 'post',
        data: data,
    });
}

// -------------------------------------------------
// export async function getManageSalesList<T extends Record<string, unknown>>(data: manageSalesInfo): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.manageSalesList,
//         method: 'post',
//         data: data,
//     });
// }

// export async function getSettlementList<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.settlementList,
//         method: 'post',
//         data: data,
//     });
// }

// export async function updateSettlementInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.updateSettlementInfo,
//         method: 'post',
//         data: data,
//     });
// }

// export async function setManageSalesInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.addManageSalesInfo,
//         method: 'post',
//         data: data,
//     });
// }

// export async function updateManageSalesInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.updateManageSalesInfo,
//         method: 'post',
//         data: data,
//     });
// }

// export async function deleteManageSalesInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.deleteManageSalesInfo,
//         method: 'post',
//         data: data,
//     });
// }

// export async function getManagePersonList<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.managePersonList,
//         method: 'post',
//         data: data,
//     });
// }

// export async function setManagePersonInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.addManagePersonInfo,
//         method: 'post',
//         data: data,
//     });
// }

// export async function updateManagePersonInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.updateManagePersonInfo,
//         method: 'post',
//         data: data,
//     });
// }

// export async function deleteManagePersonInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.deleteManagePersonInfo,
//         method: 'post',
//         data: data,
//     });
// }

// export async function getVehiclenList<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.vehicleList,
//         method: 'post',
//         data: data,
//     });
// }

// export async function setVehiclenInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.addVehiclenInfo,
//         method: 'post',
//         data: data,
//     });
// }

// export async function updateVehiclenInfo<T extends Record<string, unknown>>(data: T): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.updateVehicleInfo,
//         method: 'post',
//         data: data,
//     });
// }

// export async function getPaymentList<T extends Record<string, unknown>>(data: Record<string, unknown> ): Promise<ApiResultObjectArray<T>> {
//     return ApiService.fetchDataWithAxios<ApiResultObjectArray<T>>({
//         url: endpointConfig.paymentList,
//         method: 'post',
//         data: data,
//     });
// }