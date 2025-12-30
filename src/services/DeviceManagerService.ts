import ApiService from './ApiService'

// 제품검색
export async function apiGetDeviceListSearch(
  data: { deviceName: string, location?: string, serviceType: string, deviceType: string },
): Promise<{ message: string; result: [] }> {
  return ApiService.fetchDataWithAxios
    ({
      url: '/productManager/product/find',
      method: 'post',
      data
    })
}

// 제품검색 화면에서 정보 다중 수정
export async function apiModifyDeviceListSearch(
  data: { idxList: number[], vendor?: string, firmwareVersion?: string, maintenanceEndDate?: string },
): Promise<{ message: string; }> {
  return ApiService.fetchDataWithAxios
    ({
      url: '/productManager/product/bulkModify',
      method: 'put',
      data
    })
}

// 사용자 화면 제품 검색
export async function apiGetDeviceListSearchUser(
  data: { deviceName: string, sortColum: string, serviceType: string, deviceType: string},
): Promise<{ message: string; result: [] }> {
  return ApiService.fetchDataWithAxios
    ({
      url: '/productManager/product/findAllWithSummuries',
      method: 'post',
      data
    })
}

// 셀렉트 박스 리스트 뽑아오기
export async function apiGetSelectBox(
  data: { requestType: string },
): Promise<{ message: string; result: [] }> {
  return ApiService.fetchDataWithAxios({
    url: '/productManager/product/findTypes',
    method: 'post',
    data,
  })
}

// 유지보수 남은 기간 셀렉트 박스 리스트 뽑아오기
export async function apiGetSelectBoxPeriod(
): Promise<{ message: string; result: [] }> {
  return ApiService.fetchDataWithAxios({
    url: '/productManager/product/findNotificationLabel',
    method: 'get'
  })
}

// 제품 상세 정보 수정
export async function apiModifyDeviceDetail(
  data: {
    idx: number, vendor: string, modelName: string,
    modelNumber: string, firmwareVersion?: string,
    notes?: { time: string, content: string }[], installationDate?: string, maintenanceEndDate?: string
  },
): Promise<{ message: string; result: [] }> {
  return ApiService.fetchDataWithAxios({
    url: '/productManager/product/modify',
    method: 'put',
    data,
  })
}

// 설치내역 수정
export async function apiModifyInstallHistory(
  data: { fieldManagerName: string, completionDate: string, relatedCompanies: string },
): Promise<{ message: string; result: [] }> {
  return ApiService.fetchDataWithAxios({
    url: '/productManager/field/modify',
    method: 'put',
    data,
  })
}

// 설치내역 조회
export async function apiGetInstallHistory():
  Promise<{ message: string; result: [] }> {
  return ApiService.fetchDataWithAxios({
    url: '/productManager/field/find',
    method: 'get',

  })
}

// 유지보수 내역 조회
export async function apiGetWorkLogSearch(
  data: { title?: string, department?: string; workerName?: string, visitDateStart?: string, visitDateEnd?: string },
): Promise<{ message: string; result: [] }> {
  return ApiService.fetchDataWithAxios
    ({
      url: '/productManager/maintenanceHistory/find',
      method: 'post',
      data
    })
}

// 유지보수 내역 등록
export async function apiInstallWorkLog(
  data: {
    serviceRequestDate: string, visitDate: string,
    workerName: string, workDetail: string, notes: string, title: string, department: string
  },
): Promise<{ message: string; result: [] }> {
  return ApiService.fetchDataWithAxios({
    url: '/productManager/maintenanceHistory/enroll',
    method: 'post',
    data,
  })
}

// 유지보수 내역 수정
export async function apiModifyWorkLogDeatil(
  data: {
    idx: number, serviceRequestDate: string, visitDate: string,
    workerName: string, workDetail: string, notes: string, title: string, department: string
  },
): Promise<{ message: string; result: [] }> {
  return ApiService.fetchDataWithAxios({
    url: '/productManager/maintenanceHistory/modify',
    method: 'put',
    data,
  })
}

// 유지보수 내역 삭제
export async function apiDeleteWorkLogDeatil(
  data: { idx: number },
): Promise<{ message: string; result: [] }> {
  return ApiService.fetchDataWithAxios({
    url: '/productManager/maintenanceHistory/delete',
    method: 'post',
    data,
  })
}

// 유지보수 내역 Excel/pdf 다운로드
export async function apiDownloadWorkLogDeatil(
  data: { idx: number, form:'xlsx'|'pdf' },
): Promise<{ message: string; result: [] }> {
  return ApiService.fetchDataWithAxios({
    url: '/productManager/maintenanceHistory/downloadReports',
    method: 'post',
    data,
    responseType: 'blob'
  })
}