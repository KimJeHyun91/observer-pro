export const apiPrefix = '/api'

const endpointConfig = {
    //common
    signIn: '/common/login',
    signOut: '/common/logout',
    signUp: '/common/sign-up',
    forgotPassword: '/forgot-password',
    resetPassword: '/reset-password',
    service: '/common/service',
    observerService: '/common/getServiceTypeList',
    addEventLog: '/common/addEventLog',
    eventLogCheck: '/common/eventLogCheck',
    warningDelete: '/common/warningDelete',
    getWarningBoard: '/common/getWarningBoard',
    checkUseWarningBoard: '/common/checkUseWarningBoard',
    insertWarningBoard: '/common/insertWarningBoard',
    modifySetting: '/common/setting',

    // observer api

    uploadOutdoorImage: '/observer/outdoorplan/upload',

    // building
    addBuilding: '/observer/addBuilding',
    getBuilding: '/observer/getBuilding',
    removeBuilding: '/observer/deleteBuilding',
    modifyBuilding: '/observer/modifyBuilding',
    uploadBuildingImage: '/observer/buildingplan/upload',
    getBuildingImages: '/observer/getBuildingPlan',

    // floor
    addObFloor: '/observer/addFloor',
    getObFloor: '/observer/getFloor',
    removeObFloor: '/observer/deleteFloor',
    modifyObFloor: '/observer/modifyFloor',
    uploadFloorImage: '/observer/floorplan/upload',
    getFloorImages: '/observer/getFloorPlan',

    // camera
    modifyCamera: '/observer/modifyCamera',
    deleteCamera: '/observer/deleteCameraLocation',

    // device

    // 출입통제
    modifyDoor: '/observer/accesscontrolDoor',
    doorLockControl: '/observer/doorLockControl',
    getAcus: '/observer/accesscontrolAcus',
    accessCtlPerson: '/observer/accesscontrolperson',

    // 비상벨
    modifyEbell: '/observer/ebell',

    // 가디언라이트
    addGuardianlite: '/observer/addGuardianlite',
    getGuardianlites: '/observer/getGuardianliteList',
    removeGuardianlite: '/observer/deleteGuardianlite',
    modifyGuardianlite: '/observer/guardianlite',
    modifyGuardianliteLocation: '/observer/guardianlite/location',
    controlGuardianlite: '/observer/guardianlite/channel',

    mdetAPI: '/observer/mdet',

    // PIDS
    PIDS: '/observer/pids',

    // #region parking api 
    //outside(건물) 
    outsideInsideTreeList: '/parking/getOutsideInsideList', // 주차장 건물 트리 
    modifyFieldInfo: '/parking/modifyBuilding', // 주차 필드 수정
    addParkingField: '/parking/addBuilding', // 주차 건물 추가
    removeParkingField: '/parking/deleteBuilding', // 주차 건물 삭제
    buildingImageUpload: '/parking/buildingplan/upload', // 빌딩 이미지 업로드

    // inside(층) 
    floorInfo: '/parking/getFloorInfo', // 층 개별 조회
    floorList: '/parking/getFloorList', // 층 정보 api
    parkingModifyFloor: '/parking/modifyFloor', // 층 이름 변경
    parkingDeleteInSide: '/parking/deleteInSide', // 층 삭제
    parkingAddFloor: '/parking/addFloor', // 층 생성
    floorImageUpload: '/parking/floorplan/upload', // 층 이미지 업로드

    // parking type (일반, 경차 등등)
    parkingTypeList: '/parking/getParkingTypeList', // 파킹 타입 리스트

    // area(주차구역)
    areaList: '/parking/getAreaList', // 층 구역 센서 리스트
    addParkingArea: '/parking/addArea', // 면 구역 추가
    modifyAreaInfo: '/parking/modifyAreaInfo', // 주차 면 수정
    removeParkingArea: '/parking/deleteAreaInfo', // 주차 면 구역 삭제
    parkingTypeCountUsedArea: '/parking/getParkingTypeCountUsedArea', // 현황, 주차관리 최상단메뉴
    parkingTypeCountAreaInfo: '/parking/getParkingTypeCountAreaInfo', // 층, 주차 카운트
    parkingTypeCountAreaList: '/parking/getParkingTypeCountAreaList', // 건물 층별, 주차 카운트
    parkingTypeSumAreaList: '/parking/getParkingTypeSumAreaList', // 건물 층별, 주차 합(그래프)

    // 주차 출입 기록
    vehicleNumberSearchPreview: '/parking/getVehicleNumberSearchPreview', // 차량번호 검색어 자동완성
    vehicleNumberSearch: '/parking/getVehicleNumberSearch', // 차량번호 검색
    accessLogList: '/parking/getAccessLogList', // 차량 출입 기록(전체)
    buildingAccessLogList: '/parking/getBuildingAccessLogList', // 차량 출입 기록(빌딩, outside)
    accessTimeZone: '/parking/getAccessTimeZone', // 시간별 출입 그래프 (전체)

    // 주차센서(device)
    addParkingDevice: '/parking/addDevice',
    modifyParkingDevice: '/parking/modifyDevice',
    deleteDevice: '/parking/deleteDevice',
    deviceIpList: '/parking/getDeviceIpList',

    // 설정(이벤트 설정)
    parkingModifyEventType: '/parking/modifyEventType',
    parkingEventLogList: '/parking/getEventLogList',
    parkingEventLogSearchList: '/parking/parkingEventLogSearchList',

    // 대시보드 트리 데이터
    parkingTreeList: 'parking/getTreeList',

    // #endregion

    // VMS
    addObVms: '/observer/addVms',
    syncObVms: '/observer/syncVms',
    modifyObVms: '/observer/modifyVms',
    deleteObVms: '/observer/deleteVms',

    // event
    getEventsGroupByImportance: '/observer/events/importance',
    getEventsGroupByAck: '/observer/events/byAck',
    getEventsGroupByDevice: '/observer/events/device',
    getEventsGroupByEventName: '/observer/events/name',
    apiAckEvent: '/observer/events/ack',

    // search
    apiSearchEvents: '/observer/events/search',
    apiSearchEventsSOP: '/observer/events/search/SOP',
    apiSearchAccessCtlLog: '/observer/accesscontrollog',

    // SOP
    apiSOP: '/common/SOP',
    apiSOPStage: '/common/SOPStage',
    apiFalseAlarm: '/common/falseAlarm',

    // independent camera
    apiCamera: '/observer/camera',

    // #region parkingFee api
    // outside
    parkingFeeList: '/parkingFee/get/parkingList',           // 주차장(외부) 목록 조회
    parkingFeeInfo: '/parkingFee/set/parkingInfo',           // 주차장(외부) 정보 등록
    parkingFeeDelete: '/parkingFee/delete/parkingInfo',      // 주차장(외부) 정보 삭제
    parkingFeeUpdate: '/parkingFee/update/parkingInfo',      // 주차장(외부) 정보 수정
    
    // inside
    infloorList: '/parkingFee/get/floorList',                 // 특정 주차장의 층 목록 조회
    treeList: '/parkingFee/get/floorLineList',                // 주차장 > 층 > 라인 트리 구조 조회
    addFloorInfo: '/parkingFee/set/floorInfo',                // 층 정보 등록
    updateFloorInfo: '/parkingFee/update/floorInfo',          // 층 정보 수정
    deleteFloorInfo: '/parkingFee/delete/floorInfo',          // 층 정보 삭제

    // line
    lineList: '/parkingFee/get/lineList',                     // 특정 층의 라인 목록 조회
    addLineInfo: '/parkingFee/set/lineInfo',                  // 라인 정보 등록
    updateLineInfo: '/parkingFee/update/lineInfo',            // 라인 정보 수정
    deleteLineInfo: '/parkingFee/delete/lineInfo',            // 라인 정보 삭제

    // 차단기
    addCrossingGateInfo: '/parkingFee/set/crossingGateInfo',                // 차단기 정보 등록 (라인별 IN/OUT)
    updateCrossingGateInfo: '/parkingFee/update/crossingGateInfo',          // 차단기 정보 수정
    deleteCrossingGateInfo: '/parkingFee/delete/crossingGateInfo',          // 차단기 정보 삭제
    crossingGateDirectionList: '/parkingFee/get/crossingGateDirectionList', // 차단기 방향(IN/OUT) 목록 조회

    // 등록차량관리
    // manageSalesList : '/parkingFee/get/manage_sales_list',
    // addManageSalesInfo : '/parkingFee/set/manage_sales_list',
    // updateManageSalesInfo : '/parkingFee/update/manage_sales_list',
    // deleteManageSalesInfo : '/parkingFee/delete/manage_sales_list',

    // 입주사정산기록
    // settlementList : '/parkingFee/get/vehicle_obj_list/update_fee_list_all',
    // updateSettlementInfo : '/parkingFee/update/vehicle_obj_list/update_fee_list',

    // 입주사ID관리
    // managePersonList : '/parkingFee/get/manage_person_list',
    // addManagePersonInfo : '/parkingFee/set/manage_person_list',
    // updateManagePersonInfo : '/parkingFee/update/manage_person_list',
    // deleteManagePersonInfo : '/parkingFee/delete/manage_person_list',

    // 차량 출입 기록
    // vehicleList : '/parkingFee/get/vehicle_obj_list/update_vehicle_obj_list',
    // addVehiclenInfo : '/parkingFee/set/vehicle_obj_list/update_vehicle_obj_list',
    // updateVehicleInfo : '/parkingFee/update/vehicle_obj_list/update_vehicle_obj_list',

    // 주차요금 무인정산기 이용기록
    // paymentList : '/parkingFee/get/vehicle_obj_list/payment_result_list',

    // 감면 정책 조회
    reductionPolicyList: '/parkingFee/get/reduction/policyList', // 감면 정책 목록 조회
    reFeeCalculation: '/parkingFee/get/reFeeCalculation',        // 출차 시 요금 재계산 요청
    lineLPRInfo: '/parkingFee/get/lineLPRInfo',                  // 라인의 최근 차량 출입 데이터 정보 조회 (라인 이동 시 저장 된 데이터 검색)

    // 차량 관리
    VehicleList: '/parkingFee/get/VehicleList',                  // 차량 목록 조회
    CurrentSituation: '/parkingFee/get/current/situation',       // 현재 주차 현황 조회
    paymentDetailList: '/parkingFee/get/paymentDetailList',      // 결제 내역 목록 조회
    paymentDetailInfo: '/parkingFee/get/paymentDetailInfo',      // 결제 상세 정보 조회

    // 운영현황
    dailyRevenue: '/parkingFee/get/daily/revenue',      // 일별 수익 조회
    totalRevenue: '/parkingFee/get/total/revenue',      // 주/월 단위 종합 수익 조회
    pieChart: '/parkingFee/get/daily/lptype/ratio',     // 차량 종류 비율

    // #endregion

    // #region 3D api 
    // 3D 모델 관련
    glbModelsUpload:   '/threed/glbModels/upload',    // GLB 파일(모델) 업로드
    glbDevicesUpload:  '/threed/glbDevices/upload',   // GLB 파일(장비) 업로드
    getGlbModels:      '/threed/getGlbModels',        // 3D 모델 목록 조회
    saveDefaultModel:  '/threed/saveDefaultModel',    // 기본 모델 저장
    savePositionModel: '/threed/savePositionModel',   // 모델 카메라 위치 저장
    deleteModel:       '/threed/deleteModel',         // 3D 모델 삭제
    threedDeleteDevice: '/threed/deleteDevice',       // 3D 장비 삭제
    
    // 장비 매핑 관련 
    threedDeviceList:   '/threed/threedDeviceList',   // 등록 가능한 장비 목록 조회 (일반 디바이스)
    addDeviceMapping:   '/threed/addDeviceMapping',   // 모델에 장비 매핑 등록
    getDeviceMappings:  '/threed/getDeviceMappings',  // 선택된 모델의 장비 매핑 조회
    getAllDeviceMappings:  '/threed/getAllDeviceMappings',  // 전체 장비 매핑 조회
    deleteDeviceMapping:  '/threed/deleteDeviceMapping',  // 선택된 장비 매핑 삭제
    addModelFloors : '/threed/addModelFloors'
    
    // #endregion
}

export default endpointConfig
