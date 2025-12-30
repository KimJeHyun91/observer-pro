export type imageData = {
    line? : string,
    front? : string,
    top? : string,
    back? : string,
}

export type imageType = {
    idx : string
    type : string,
    date : string,
    event : boolean,
    status : string,
    loading : boolean,
    images : imageData,
    driverInfo? : driverInfo
}

export type driverInfo = {
    idx : number            // 드라이버 idx
    driverName : string,    // Ethan, Oliver, Lucas, Henry, Benjamin, Mason, Samuel, Jack 중 랜덤
    driverPhoneNo : string, // 010-4자리랜덤-4자리랜덤
    carNumber : string,     // Add에서 입력받은 carNumber
    type : string,          // Add에선 입력받은 in or out 타입
    visitDate : string,     // Add에서 입력한 당일 날짜 YY/MM/DD HH:mm
    manager : string,       // Leo, Mia, Eli, Zoe, Noah, Luna, Kai, Jackson 중 랜덤
    blackList : boolean,    // true or false 중 랜덤
    regType : string,       // Local or Guest 중 랜덤
    refInfo : string        // Ford 15t, Ford 8t, DumpTruck 중 랜덤 
    visitResult : string    // 방문 결과 Approval or Retrun
}