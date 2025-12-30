import { imageType, driverInfo } from '@/@types/vehicle';

type DriverProps = {
    approvalList : driverInfo[];
    selectedLineInfo : imageType;
}

const VisitHistory = ({approvalList ,selectedLineInfo} : DriverProps) => {
    return  (
        <div className="flex flex-col bg-gray-800 mt-1 h-full rounded-md">
            {/* 그림 영역 */}
            <div className="flex justify-between bg-gray-900 mt-1">
                <div className="flex-1 relative box-border bg-[#343434] text-lg flex items-center justify-center border-r border-gray-600">
                    <img 
                        src={`http://${window.location.hostname}:4200/images/vehicle/car_front.png`} 
                        alt="Front" 
                        className="w-[180px] h-[130px] object-cover p-2" 
                        draggable="false"
                    />
                </div>
                <div className="flex-1 relative box-border  bg-[#343434] text-lg flex items-center justify-center border-r border-gray-600">
                    <img 
                        src={`http://${window.location.hostname}:4200/images/vehicle/car_top.png`} 
                        alt="Top" 
                        className="w-[180px] h-[130px] object-cover p-2" 
                        draggable="false"
                    />
                </div>
                <div className="flex-1 relative box-border bg-[#343434] text-lg flex items-center justify-center ">
                    <img 
                        src={`http://${window.location.hostname}:4200/images/vehicle/car_back.png`} 
                        alt="Back" 
                        className="w-[180px] h-[130px] object-cover p-2" 
                        draggable="false"
                    />
                </div>
            </div>

            {/* 표 영역 */}
            <div>
                <div className="grid grid-cols-7 text-center py-2 text-white font-bold dark:bg-gray-900">
                    <span>No.</span>
                    <span>State</span>
                    <span>Visit Date</span>
                    <span>Entry Time</span>
                    <span>Driver</span>
                    <span>User</span>
                    <span>Progress</span>
                </div>
                {(() => {
                    const filteredList = approvalList
                    .filter((item) => item.carNumber === selectedLineInfo?.driverInfo?.carNumber)

                    return (
                        <div className="scroll-container overflow-y-auto h-[calc(100vh-740px)] bg-[#423d3d] rounded-b-md">
                            {filteredList.map((item, idx) => (
                                <div
                                    key={idx}
                                    className={`grid grid-cols-7 text-center py-2 text-gray-300 hover:bg-gray-800 hover:text-white cursor-pointer transition-colors duration-300
                                        ${ idx !== filteredList.length - 1 ? 'border-b border-gray-600' : ''}
                                        `}
                                >
                                    <span>{idx + 1 || ''}</span>
                                    <div className='flex items-center justify-center'>
                                        {item.type ? (
                                            <div className={`${item.type === 'out' ? 'bg-[#514CE3]' : 'bg-green-600'} text-white rounded-sm h-5 w-10`}>
                                                {item.type}
                                            </div>
                                        ) : (
                                            <span>{item.type || ''}</span>
                                        )}
                                    </div>
                                    <span>{item.visitDate.split(" ")[0] || ''}</span>
                                    <span>{item.visitDate.split(" ")[1] || ''}</span>
                                    <span>{item.driverName || "N/A"}</span>
                                    <span>{item.manager || "N/A"}</span>
                                    <span>{item.visitResult || ''}</span>
                                </div>
                            ))}
                        </div>
                    );
                })()}
            </div>
        </div>
    )
}

export default VisitHistory