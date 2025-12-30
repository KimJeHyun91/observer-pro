import { useState, useRef } from 'react';
import Header from '@/components/shared/Header';
import Button from '@/components/ui/Button'
import Modal from './modals/Modal';
import { ModalType } from '@/@types/modal';
import { imageType, driverInfo } from '@/@types/vehicle';
import CarInOutAdd from './modals/CarInOutAdd';
import DriverAdd from './modals/DriverAdd';
import DriverModify from './modals/DriverModify';
import LineImage from './components/LineImage';
import DeviceList from './components/DeviceList';
import VisitHistory from './components/VisitHistory';
import Driver from './components/Driver';
import Information from './components/Information';
import dayjs from 'dayjs'

const defaultDriverInfo : driverInfo = {
    idx : 0,
    driverName : '',   
    driverPhoneNo : '',
    carNumber : '',    
    type : '',         
    visitDate : '',  
    manager : '',      
    blackList : false,   
    regType : '',      
    refInfo : '',
    visitResult :''   
}

const defaultImageType : imageType = {
    idx: '',
    type: '',
    date: '',
    event: false,
    loading : false,
    status : '',
    images: {
        line: '',
        front: '',
        top: '',
        back: '',
    },
    driverInfo: defaultDriverInfo 
}

const ParkingView = () => {
    const modalChildRef = useRef<HTMLDivElement>(null);
    const [lineImages, setLineImages] = useState<imageType[]>([
        { 
            idx : '1',
            type: 'in', 
            date: '2024-01-12 08:54:06',
            event: false,
            loading : false,
            status: 'close',
            images : {
                line : `http://${window.location.hostname}:4200/images/vehicle/in_line1.png`,
                front : `http://${window.location.hostname}:4200/images/vehicle/car_front.png`,
                top : `http://${window.location.hostname}:4200/images/vehicle/car_top.png`,
                back : `http://${window.location.hostname}:4200/images/vehicle/car_back.png`,
            },
        },
        { 
            idx : '2',
            type: 'in', 
            date: '2025-01-05 15:17:32',
            event: false,
            loading : false,
            status: 'close',
            images : {
                line : `http://${window.location.hostname}:4200/images/vehicle/in_line2.png`,
                front : `http://${window.location.hostname}:4200/images/vehicle/car_front.png`,
                top : `http://${window.location.hostname}:4200/images/vehicle/car_top.png`,
                back : `http://${window.location.hostname}:4200/images/vehicle/car_back.png`,
            }
        },
        { 
            idx : '3',
            type: 'out', 
            date: '2024-12-07 23:17:25',
            event: false,
            loading : false,
            status: 'close',
            images : {
                line : `http://${window.location.hostname}:4200/images/vehicle/out_line1.png`,
                front : `http://${window.location.hostname}:4200/images/vehicle/car_front.png`,
                top : `http://${window.location.hostname}:4200/images/vehicle/car_top.png`,
                back : `http://${window.location.hostname}:4200/images/vehicle/car_back.png`,
            }
        },
        { 
            idx : '4',
            type: 'out', 
            date: '2025-02-03 03:17:11',
            event: false,
            loading : false,
            status: 'close',
            images : {
                line : `http://${window.location.hostname}:4200/images/vehicle/out_line2.png`,
                front : `http://${window.location.hostname}:4200/images/vehicle/car_front.png`,
                top : `http://${window.location.hostname}:4200/images/vehicle/car_top.png`,
                back : `http://${window.location.hostname}:4200/images/vehicle/car_back.png`,

            }
        },
    ]);
    const [modal, setModal] = useState<ModalType>({
        show: false,
        type: '',
        title: '',
    });
    const [selectedItem, setSelectedItem] = useState<imageType>(defaultImageType);
    const [targetCCTV, setTargetCCTV] = useState<'front' | 'top' | 'back' | undefined>(undefined);
    const [addDriverInfoList, setAddDriverInfoList] = useState<driverInfo[]>([]);
    const [selectedLine, setSelectedLine] = useState<string | null>(null);
    const [driverIdx , setDriverIdx] = useState<number>(1);
    const [newDriverInfo , setNewDriverInfo] = useState<driverInfo>();
    const [targetModifyInfo , setTargetModifyInfo] = useState<driverInfo>();
    const [modalWidth , setModalWidth] = useState<number>(500);
    const [approvalList, setApprovalList] = useState<driverInfo[]>([]);
    const [visitDriverList, setVisitDriverList] = useState<driverInfo[]>([]);
    const [checkboxState, setCheckboxState] = useState<boolean>(false);
    const selectedLineInfo = lineImages.find((line) => line.idx === selectedLine) as imageType;

    const toggleModal = ({ show, title, type }: ModalType) => {
        if(type !== 'driverAdd' && type !== 'driverModify'){
            setModalWidth(500);
        }

        setModal({
            show,
            title,
            type
        })
    }
    
    const addConfirm = (carNumber: string, selectedItem: imageType) => {
        const visitDate = dayjs().format('YY-MM-DD HH:mm:ss');
        
        const isDuplicate = lineImages.some(
            (line) => line.driverInfo?.carNumber === carNumber 
        );
    
        if (isDuplicate) {
            alert("같은 차량이 이미 다른 라인에 등록되어 있습니다.");
            return; 
        }
        
        const randomNames = ['Ethan', 'Oliver', 'Lucas', 'Henry', 'Benjamin', 'Mason', 'Samuel', 'Jack'];
        const randomManagers = ['Leo', 'Mia', 'Eli', 'Zoe', 'Noah', 'Luna', 'Kai', 'Jackson'];
        const randomRefInfo = ['Ford 15t', 'Ford 8t', 'DumpTruck'];
        const checkDriver = visitDriverList.filter((item)=> item.carNumber === carNumber);

        const driver: driverInfo = {
            idx : driverIdx + 1,
            driverName: checkDriver.length > 0 ? checkDriver[0].driverName : randomNames[Math.floor(Math.random() * randomNames.length)],
            driverPhoneNo: checkDriver.length > 0 ? checkDriver[0].driverPhoneNo : `010-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
            carNumber,
            type : selectedItem.type,
            visitDate: visitDate,
            manager: randomManagers[Math.floor(Math.random() * randomManagers.length)],
            blackList: checkDriver.length > 0 ? checkDriver[0].blackList : false,
            regType: checkDriver.length > 0 ? checkDriver[0].regType : Math.random() < 0.5 ? 'Local' : 'Guest',
            refInfo: checkDriver.length > 0 ? checkDriver[0].refInfo : randomRefInfo[Math.floor(Math.random() * randomRefInfo.length)],
            visitResult :''
        };
        
        setDriverIdx(driverIdx + 1);
        
        setVisitDriverList((prev) => {
            const updatedList = [...prev, driver]; 

            return updatedList.sort((a, b) => {
                const dateA = parseCustomDate(a.visitDate);
                const dateB = parseCustomDate(b.visitDate);
                return dateB.getTime() - dateA.getTime();
            });
        });

        setLineImages((prev) => 
            prev.map((item) => 
                item.idx === selectedItem.idx ? { ...item, event: true, loading: true, driverInfo : driver } : item
            )
        );
    
        setSelectedLine(selectedItem.idx);

        setTimeout(() => {
            setLineImages((prev) => 
                prev.map((item) => 
                    item.idx === selectedItem.idx ? { ...item, loading: false } : item
                )
            );
        }, 1000);
    
        closeModal();
    };

    const newDriverAdd = (line: imageType | undefined) => {
        if (!line?.driverInfo) {
            return;
        }
        
        const newLineDriverInfo = line.driverInfo;
        const isDuplicate = addDriverInfoList.some((driver) => driver.carNumber === newLineDriverInfo.carNumber);

        if (isDuplicate) {
            alert("같은 차량이 이미 등록되어 있습니다.");
            return;
        }

        setNewDriverInfo(line.driverInfo);
        setModalWidth(650);
        toggleModal({
            show: true,
            title: `New Car Registration`,
            type: 'driverAdd',
        });
    };
    
    const driverAdd = (carNumber: string, type: string, driverName: string, driverPhoneNo: string) => {     
        const checkDriver = visitDriverList.filter((item)=> item.carNumber === newDriverInfo?.carNumber);

        const updatedDriverInfo: driverInfo = {
            ...newDriverInfo!,
            carNumber,
            type,
            driverPhoneNo,
            driverName,
            blackList : checkDriver.length > 0 ? checkDriver[0].blackList : false
        };
        
        const isDuplicateAdd = addDriverInfoList.some((driver) => driver.carNumber === updatedDriverInfo?.carNumber);

        if (isDuplicateAdd) {
            alert("같은 차량이 이미 등록되어 있습니다.");
            return;
        }

        setAddDriverInfoList((prev) => [...prev, updatedDriverInfo]);
        setVisitDriverList((prev) => {
            if (prev.length === 0) return prev;
        
            const updatedList = [...prev];
        
            const filteredIndexes = updatedList
                .map((driver, index) => ({ driver, index }))
                .filter(({ driver }) => driver.carNumber === newDriverInfo?.carNumber);
        
            if (filteredIndexes.length > 0) {
                const firstIndex = filteredIndexes[0].index;
                updatedList[firstIndex] = { ...updatedList[firstIndex], ...updatedDriverInfo };

                updatedList.forEach((driver, index) => {
                    if (driver.carNumber === newDriverInfo?.carNumber && index !== firstIndex) {
                        driver.blackList = false;
                    }
                });
            }
            
            return updatedList;
        });
        
        setApprovalList((prev) =>
            prev.map((item) =>
                item.carNumber === newDriverInfo?.carNumber
                    ? { ...item, carNumber: carNumber }
                    : item
            )
        );
 
        setLineImages((prev) =>
            prev.map((line) =>
                line.idx === selectedLine ? { ...line, driverInfo: updatedDriverInfo } : line
            )
        );

        setNewDriverInfo(updatedDriverInfo);
        setTargetModifyInfo(updatedDriverInfo);
        closeModal();
    }

    const deleteConfirm = () => {
        if (selectedItem) {
          setLineImages((prev) =>
            prev.map((item) =>
              item.idx === selectedItem.idx ? { ...item, event: false, loading: false, driverInfo : undefined } : item
            )
          );

          setSelectedLine(null);
        }
        closeModal();
    };
      
    const toggleStatusConfirm = () => {
        if (selectedItem) {
            setLineImages((prev) =>
                prev.map((item) =>
                    item.idx === selectedItem.idx
                        ? { ...item, status: item.status === 'close' ? 'open' : 'close' }
                        : item
                )
            );
            closeModal();
        }
    };

    const driverModify = (line: imageType | undefined) => {
        if (!line?.driverInfo) {
            return;
        }
        
        setTargetModifyInfo(line.driverInfo);
        setModalWidth(650);
        toggleModal({
            show: true,
            title: `Driver Modify`,
            type: 'driverModify',
        });
    };

    const driverModifyConfirm = (carNumber: string, type: string, driverName: string, driverPhoneNo: string) => {     
        const checkDriver = visitDriverList.filter((item)=> item.carNumber === targetModifyInfo?.carNumber);

        const updatedDriverInfo: driverInfo = {
            ...targetModifyInfo!,
            carNumber,
            type,
            driverPhoneNo,
            driverName,
            blackList : checkDriver.length > 0 ? checkDriver[0].blackList : false
        };

        const isDuplicateAdd = addDriverInfoList.some((driver) => driver.carNumber === updatedDriverInfo?.carNumber);
        const isDuplicateApproval = approvalList.some((driver) => driver.carNumber === updatedDriverInfo?.carNumber);
        
        if (isDuplicateAdd || isDuplicateApproval) {
            alert("같은 차량이 이미 등록되어 있습니다.");
            return;
        }

        setVisitDriverList((prev) => {
            if (prev.length === 0) return prev;
        
            const updatedList = [...prev];
            
            const filteredIndexes = updatedList
                .map((driver, index) => ({ driver, index }))
                .filter(({ driver }) => driver.carNumber === targetModifyInfo?.carNumber);
            
            if (filteredIndexes.length > 0) {
                const firstIndex = filteredIndexes[0].index;
                updatedList[firstIndex] = { ...updatedList[firstIndex], ...updatedDriverInfo };
                
                updatedList.forEach((driver, index) => {
                    if (driver.carNumber === targetModifyInfo?.carNumber && index !== firstIndex) {
                        driver.blackList = false;
                    }
                });
            }

            return updatedList;
        });
        
        setApprovalList((prev) =>
            prev.map((item) =>
                item.carNumber === targetModifyInfo?.carNumber
                    ? { ...item, carNumber: carNumber }
                    : item
            )
        );
 
        setLineImages((prev) =>
            prev.map((line) =>
                line.idx === selectedLine ? { ...line, driverInfo: updatedDriverInfo } : line
            )
        );

        setTargetModifyInfo(updatedDriverInfo);

        closeModal();
    }
    
    const setModalChild = (type: string) => {
        switch (type) {
            case 'inOutAdd':
                return (
                    <CarInOutAdd 
                        selectedItem={selectedItem}
                        setSelectedItem={setSelectedItem}
                        lineImages={lineImages}
                        addConfirm={addConfirm}
                        closeModal={closeModal}
                    />
                );
            case 'delete':
                return (
                    <>
                        <p>Line에서 삭제 하시겠습니까?</p>

                        <div className="flex space-x-4 mt-4">
                            <Button 
                                className="w-[65px] h-full z-10 rounded dark:bg-opacity-100 bg-green-500 text-white dark:bg-green-700 dark:hover:bg-green-900"
                                size="sm"
                                variant="default"
                                onClick={deleteConfirm}
                            >
                                확인
                            </Button>
                            <Button 
                                className="w-[65px] h-full bg-gray-400 rounded text-white z-10 dark:bg-opacity-100 dark:bg-gray-600" 
                                size="sm"
                                onClick={closeModal}
                            >
                                취소
                            </Button>
                        </div>
                    </>
                );
            case 'cctv':
                return (
                    <>
                        {targetCCTV ? (
                            <img
                                src={selectedItem.images[targetCCTV]}
                                alt={`CCTV ${targetCCTV}`}
                                className="w-full h-full object-contain rounded-lg"
                                draggable="false"
                            />
                        ) : (
                            <p>No CCTV Image</p>
                        )}
                    </>
                )
            case 'statusChange':
                return (
                    <>
                        <span className='dark:text-[#FFFFFF]'>
                            {selectedItem.type.toUpperCase()} {selectedItem.idx} LANE {' '}
                            <strong>{selectedItem.status === 'close' ? 'OPEN' : 'CLOSE'}?</strong>
                        </span>

                        <div className="flex space-x-4 mt-4">
                            <Button 
                                className="w-[65px] h-full z-10 rounded dark:bg-opacity-100 bg-green-500 text-white dark:bg-green-700 dark:hover:bg-green-900"
                                size="sm"
                                variant="default"
                                onClick={toggleStatusConfirm}
                            >
                                확인
                            </Button>
                            <Button 
                                className="w-[65px] h-full bg-gray-400 rounded text-white z-10 dark:bg-opacity-100 dark:bg-gray-600" 
                                size="sm"
                                onClick={closeModal}
                            >
                                취소
                            </Button>
                        </div>
                    </>
                )
            case 'driverAdd':
                return (
                    <>
                        <DriverAdd
                            driverAdd={driverAdd}
                            closeModal={closeModal}
                            newDriverInfo={
                                newDriverInfo || defaultDriverInfo
                            }
                        />
                    </>
                )

            case 'blackList':
                return (
                    <>
                        <p>WatchList에 {checkboxState ? '추가' : '삭제'} 하시겠습니까?</p>

                        <div className="flex space-x-4 mt-4">
                            <Button 
                                className="w-[65px] h-full z-10 rounded dark:bg-opacity-100 bg-green-500 text-white dark:bg-green-700 dark:hover:bg-green-900"
                                size="sm"
                                variant="default"
                                onClick={() => updateBlacklistState(true)}
                            >
                                확인
                            </Button>
                            <Button 
                                className="w-[65px] h-full bg-gray-400 rounded text-white z-10 dark:bg-opacity-100 dark:bg-gray-600" 
                                size="sm"
                                onClick={closeModal}
                            >
                                취소
                            </Button>
                        </div>
                    </>
                )

            case 'driverModify':
                    return (
                        <>
                           <DriverModify
                                driverModifyConfirm={driverModifyConfirm}
                                closeModal={closeModal}
                                targetModifyInfo={
                                    targetModifyInfo || defaultDriverInfo
                                }
                           />
                        </>
                    )
            default:
            return null;
        }
    };

    const parseCustomDate = (dateStr : string) => {
        const [day, month, yearTime] = dateStr.split('-');
        const [year, time] = yearTime.split(' ');
        const [hour, minute, second] = time.split(':');
    
        return new Date(
            `20${year}-${month}-${day}T${hour}:${minute}:${second}`
        );
    };

    const driverHistory = (line: imageType | undefined, visitResult : string) => {
        if (!line?.driverInfo) {
            return;
        }

        setApprovalList((prev) => {
            const updatedList = [
                ...prev,
                { ...line.driverInfo, visitResult } as driverInfo,
            ];
            
            return updatedList.sort((a, b) => {
                const dateA = parseCustomDate(a.visitDate);
                const dateB = parseCustomDate(b.visitDate);
                return dateB.getTime() - dateA.getTime();
            });
        });

        setLineImages((prev) =>
            prev.map((item) =>
                item.idx === line.idx ? { ...item, event : false, driverInfo: undefined } : item
            )
        );
        setSelectedLine(null);
    };

    const blackListState = (isChecked: boolean) => {
        toggleModal({
            show: true,
            title: `BlackList`,
            type: 'blackList',
        });
    
        setCheckboxState(isChecked);
    };

    const updateBlacklistState = (confirmed: boolean) => {
        if (confirmed) {
            setLineImages((prev) =>
                prev.map((line) =>
                    line.idx === selectedLineInfo?.idx
                        ? {
                                ...line,
                                driverInfo: {
                                    ...line.driverInfo,
                                    blackList: checkboxState,
                                },
                            } as imageType
                        : line
                )
            );
            
            setVisitDriverList((prev) => {
                if (prev.length === 0) return prev;
            
                return prev.map((driver) => {
                    if (driver.idx === selectedLineInfo?.driverInfo?.idx) {
                        return {
                            ...driver,
                            blackList: checkboxState,
                        };
                    }
                    return driver;
                });
            });
        }
        closeModal();
    };

    const closeModal = () => {
        setCheckboxState(false);
        setNewDriverInfo(undefined);
        setTargetModifyInfo(undefined);
        setSelectedItem(defaultImageType);
        toggleModal({
          show: false,
          type: '',
          title: '',
        });
        setModalWidth(500);
    };

    return (
        <section className="h-full flex flex-col">
           <Header 
                currentView='dashboard' 
                serviceType='vehicle' 
                onViewModeChange={()=>{}} 
            >
                <></>
            </Header>

            <div className="flex flex-1 overflow-hidden h-full">
                <div className="flex-1 h-full flex">
                    {/* 왼쪽 영역 */}
                    <div className="flex-[2] flex flex-col">
                        {/* 이미지 영역 */}
                        <div className="flex-[7] flex rounded-lg gap-4 justify-between">
                            <LineImage 
                                setSelectedItem={setSelectedItem}
                                setSelectedLine={setSelectedLine}
                                lineImages={lineImages}
                                toggleModal={toggleModal}
                                selectedLine={selectedLine}
                                addDriverInfoList={addDriverInfoList}
                                visitDriverList={visitDriverList}
                            />
                        </div>

                        {/* Device List 영역 */}
                        <div className="flex-[3] flex flex-col p-2 bg-white dark:bg-gray-800 shadow-md rounded-lg my-2 mr-2">
                            <span className="font-bold text-black dark:text-white">Device List</span>
                            <div className="w-full border-solid border-b-2 border-[#B8B8B8] " />
                            <div className="flex-[7] flex rounded-lg gap-4 justify-between ">
                                <DeviceList 
                                    setSelectedItem={setSelectedItem}
                                    lineImages={lineImages}
                                    toggleModal={toggleModal}
                                    setTargetCCTV={setTargetCCTV}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 오른쪽 영역 */}
                    <div className="flex-[1] flex flex-col">
                        {/* Information 영역 */}
                        <div className="flex-[2.5] flex flex-col p-2 bg-white dark:bg-gray-800 shadow-md rounded-lg mb-2">
                            <span className="font-bold text-black dark:text-white">Information</span>
                            <div className="w-full border-solid border-b-2 border-[#B8B8B8] " />
                            <Information
                                selectedLineInfo={selectedLineInfo}
                                addDriverInfoList={addDriverInfoList}
                                blackListState={blackListState}
                                driverModify={driverModify}
                                newDriverAdd={newDriverAdd}
                            />
                        </div>

                        {/* Driver 영역 */}
                        <div className="flex-[2.5] flex flex-col p-2 bg-white dark:bg-gray-800 shadow-md rounded-lg mb-2">
                            <span className="font-bold text-black dark:text-white">Driver</span>
                            <div className="w-full border-solid border-b-2 border-[#B8B8B8] " />
                            <Driver 
                                driverHistory={driverHistory}
                                selectedLineInfo={selectedLineInfo}
                            />
                        </div>

                        {/* Visit History 영역 */}
                        <div className="flex-[5] flex flex-col p-2 bg-white dark:bg-gray-800 shadow-md mb-2 rounded-md">
                            <span className="font-bold text-black dark:text-white">Visit History</span>
                            <div className="w-full border-solid border-b-2 border-[#B8B8B8]" />
                            <VisitHistory 
                                approvalList={approvalList}
                                selectedLineInfo={selectedLineInfo}
                            />
                        </div>
                    </div>
                </div>
            </div>

            <Modal width={modalWidth} modal={modal} toggle={toggleModal} modalChildRef={modalChildRef}>
                <div ref={modalChildRef}>
                    {setModalChild(modal.type)}
                </div>
            </Modal>
        </section>
    )
}

export default ParkingView