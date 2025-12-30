import {  Checkbox, Dialog, Input, ScrollBar } from '@/components/ui'
import React, { useEffect, useState } from 'react'
import _ from 'lodash';
import { apiAddDeviceGroup, apiDeleteDeviceGroup, apiDetailDeviceGroup } from '@/services/BroadcastService';
import { useBroadcastArea, useBroadcastDeviceGroupList } from '@/utils/hooks/useBroadcast';
import DeleteConfirm from './DeleteConfirm';
import { BroadcastAreaResponse, DeviceGroup } from '@/@types/broadcast';
import { FaArrowRightLong, FaArrowLeftLong } from "react-icons/fa6";
import { HiArrowLongRight, HiArrowLongLeft } from "react-icons/hi2";


interface DeviceGroupingProps {
    isOpen: boolean
    onClose: ()=>void
}

 const DeviceGrouping = ({isOpen, onClose}: DeviceGroupingProps) => {
    const [selectedDevice, setSelectedDevice] = useState<number[]>([])
    const [addedDevice, setAddedDevice] = useState<number[]>([]);
    const [previousAddedDevice, setPreviousAddedDevice] = useState<number[]>([]); 
    const [selectedGroup, setSelectedGroup] = useState<{
        group_idx: number;
        name: string;
      } | null>(null); 
    const [groupName, setGroupName] = useState<string>(''); 
    const [isDeleteGroup, setIsDeleteGroup] = useState(false)
    const [isEmptyGroupName, setIsEmptyGroupName] = useState(false)
    const [isEmptyDevice, setIsEmptyDevice] = useState(false)

    const {areaList} = useBroadcastArea()
    const {groupList, mutate} = useBroadcastDeviceGroupList()
    
    useEffect(()=>{
        mutate()
    },[])

    const handleSelectedDeviceGroup = async(groupIdx:number) => {
       try{

        const res = await apiDetailDeviceGroup({groupIdx})
        if(res.message === 'ok'){
            setAddedDevice(res.result.map(device => device.outside_idx)); 
        }
       }catch(err){
            console.log(err)
       }finally{

       }
    }
   

    const handleEditGroup = (group: any) => {
        setSelectedGroup(group);
        handleSelectedDeviceGroup(group.group_idx)
        setGroupName(group.group_name); 
    };

    const remainingDevices: BroadcastAreaResponse[] = _.uniqBy(areaList?.result, 'outside_idx')?.filter(
        (device :BroadcastAreaResponse) => !addedDevice.includes(device.outside_idx)
    );

    const filteredDevices: BroadcastAreaResponse[] = _.uniqBy(areaList?.result, 'outside_idx')?.filter((device: BroadcastAreaResponse) =>
      addedDevice.includes(device.outside_idx)
    );

    const handleAddDevices = () => {
        setPreviousAddedDevice(addedDevice);
        setAddedDevice((prev) => [...prev, ...selectedDevice]);
        setSelectedDevice([]);
    };

    const handleRemoveDevices = () => {
        setPreviousAddedDevice(addedDevice);
        setAddedDevice((prev) => prev.filter((id) => !selectedDevice.includes(id)));
        setSelectedDevice([]);

    };

    const handleCancel = () => {
        // setAddedDevice(previousAddedDevice); // 이전 상태로 복구
        setAddedDevice([])
        setSelectedDevice([]); // 선택 상태 초기화
        setSelectedGroup(null)
        setGroupName(''); // 그룹 이름 초기화
    };

    useEffect(()=>{
        if(_.isEmpty(addedDevice)){
            setIsEmptyDevice(true);  
        }else {
            setIsEmptyDevice(false)
        }
    },[addedDevice])

    const handleDeviceGroupSave = async () => {
        try {
  
          if (!groupName ) {
            if (!groupName) {
              setIsEmptyGroupName(true);  
            } else {
              setIsEmptyGroupName(false); 
            }
      
            // if (_.isEmpty(addedDevice)) {
            //   setIsEmptyDevice(true); 
            // } else {
            //   setIsEmptyDevice(false); 
            // }
      
            return; 
          }
      

          setIsEmptyGroupName(false);
          setIsEmptyDevice(false);
      
          // 개소 그룹 수정
          if (selectedGroup) {
            await apiAddDeviceGroup({
              groupIdx: selectedGroup.group_idx,
              groupName: groupName,
              outsideIdxArray: addedDevice
            });
            handleResetDeviceInfo()
          } else {
            if(_.isEmpty(addedDevice)) {
                return setIsEmptyDevice(true)
            }
            // 개소 신규 그룹 추가
            await apiAddDeviceGroup({
              groupName: groupName,
              outsideIdxArray: addedDevice
            });
            handleResetDeviceInfo()
          }
      
        } catch (err) {
          console.log( err);
    
        } finally {
          mutate(); 
        //   setAddedDevice([])
        //   setGroupName("")
        }
      };
      

    const handleDeleteDeviceGroup = async(group:any) => {
        try{
            setIsDeleteGroup(true)
            setSelectedGroup(group)
            setGroupName(group.group_name)
       await handleSelectedDeviceGroup(group.group_idx)

         
        }catch(err){
            console.log(err)
        }finally{
            // mutate()
        }
    }

    const onConfirm = async() => {
        try{
            if(!selectedGroup) return
            await apiDeleteDeviceGroup({groupIdx: selectedGroup.group_idx})
           mutate()
          
        }catch(err){
            console.log(err)
        }finally{
            setIsDeleteGroup(false)
            handleResetDeviceInfo()
        }
       
    }

    const handleResetDeviceInfo = () => {
        setGroupName('')
        setAddedDevice([])
    }

  return (
    <>
    <Dialog isOpen={isOpen} onClose={()=>{
        onClose()
        handleCancel()
    }} width={600}>
      <h5 className='mb-5'>개소 그룹 관리</h5>

    <div className='flex flex-col gap-9 mt-7'>
      <div className='h-[220px]' title="그룹 목록">
        <p className='text-[16px] font-bold mb-2 pl-3 dark:text-white'>그룹 목록</p>
        <ScrollBar className={`border-2 border-gray-300 h-[200px] p-5 rounded-lg`}>
            {_.isEmpty(groupList?.result) ? 
              <div className='flex flex-col justify-center items-center h-[155px] bg-[#f5f5f5] dark:bg-gray-600 rounded-md'>
                <p>그룹 목록이 없습니다.</p>
                <p>하단 그룹 관리에서 그룹을 생성하세요.</p>
              </div>
            : groupList?.result?.map((device: DeviceGroup)=>{
                return <div className={`flex bg-[#e7ebf1] dark:bg-gray-600 dark:text-white rounded-lg mb-2 p-1 px-4 ${selectedGroup?.group_idx === device?.group_idx && 'border-2 border-[#9daadd]  py-2'}`}>
                    <div className='flex w-[75%]'>
                        <p className='w-[40%] text-[1rem] font-bold'>{device.group_name}</p>
                        <p className=''>개소{device.outside_count}개</p>
                    </div>
                    <div className='flex justify-end w-[30%] gap-5'>
                        <button className='bg-white dark:bg-gray-400 dark:text-white px-3' onClick={()=>handleEditGroup(device)}>수정</button>
                        <button className='bg-[#d76767] px-3 text-white' onClick={()=>handleDeleteDeviceGroup(device)}>삭제</button>
                    </div>
                </div>
            })}
        </ScrollBar>
      </div>

      <div>
        <p className='text-[16px] font-bold mb-2 pl-3 dark:text-white'>그룹 설정</p>
        <div className=' h-[350px] border-2 border-gray-300 rounded-lg'>
            <div className='flex gap-3'>
                <div className='flex flex-col justify-between w-[50%] h-[270px] rounded-md mt-5 bg-[#f2f5f9] dark:bg-gray-600 dark:text-white ml-2'>
                    <div className='bg-[#d9dce3] dark:bg-gray-700 p-2  rounded-t-md'>
                        <p className='text-center font-bold text-[1rem]'>전체 개소</p>
                    </div>
                    <ScrollBar className='h-[180px] p-2'>
                    {remainingDevices?.map((device) => (
                        <div className="flex items-center gap-2 mb-2" key={device.outside_idx}>
                        <input
                            type='checkbox'
                            className='w-[18px] h-[18px] border-none rounded-xl'
                            onChange={() =>
                            setSelectedDevice((prev: number[]) => {
                                if (prev.includes(device.outside_idx)) {
                                return prev.filter((id) => id !== device.outside_idx);
                                } else {
                                return [...prev, device.outside_idx];
                                }
                            })
                            }
                            checked={selectedDevice.includes(device.outside_idx)}
                        />
                        <p>{device.outside_name}</p>
                        </div>
                    ))}

                   </ScrollBar>
                    <div className='flex justify-center mb-2'>
                        <button  className='w-[80%] bg-[#efeff1] dark:bg-gray-300 dark:text-gray-700 p-2 font-bold border border-gray-300 rounded-md' onClick={handleAddDevices} >추가</button>
                    </div>
                </div>

                <div className='m-auto'>
                    <HiArrowLongRight size={25}/>
                    <HiArrowLongLeft size={25} />
                </div>

                <div className='flex flex-col justify-between w-[50%] h-[270px] mt-5 bg-[#f2f5f9] dark:bg-gray-600 mr-2 rounded-md'>
                <div className='bg-[#d9dce3] dark:bg-gray-700 p-2 rounded-t-md'>
                        <Input className={`${isEmptyGroupName && 'border border-red-500'} dark:bg-gray-500`} size='xs' placeholder='그룹 명을 설정해주세요.' value={groupName} onChange={(e) => setGroupName(e.target.value)}  /> 
                    </div>
                  <ScrollBar className='flex flex-col items-start h-[170px] p-2'>
                    {isEmptyDevice && <div className='flex justify-center items-center mt-16'><p>개소를 추가해 주세요.</p></div>}
                    {filteredDevices?.map((device)=>{
                        return <div className="flex items-center gap-2 mb-2 dark:text-white">
                              <input
                                type='checkbox'
                                className='w-[18px] h-[18px] border rounded-xl' 
                                onChange={() =>
                                setSelectedDevice((prev: number[]) => {
                                    if (prev.includes(device.outside_idx)) {
                                    return prev.filter((id) => id !== device.outside_idx);
                                    } else {
                                    return [...prev, device.outside_idx];
                                    }
                                })
                            }
                            checked={selectedDevice.includes(device.outside_idx)}
                        />
                        <p>{device.outside_name}</p>
                        </div>
                    })}
                  </ScrollBar>
                    <div className='flex justify-center mb-2'>
                        <button  className='w-[80%] bg-[#efeff1] dark:bg-gray-300 dark:text-gray-700 font-bold p-2 border border-gray-300 rounded-md' onClick={handleRemoveDevices} >삭제</button>
                    </div>
                </div>
            </div>
            <div className='flex justify-end mr-2 mt-3 gap-3'>
                 {selectedGroup && <button className='w-[100px] h-[35px]  bg-[#edf0f6] border border-gray-300 font-bold rounded-md' onClick={handleCancel}>취소</button>}
                <button className='w-[100px] h-[35px] bg-[#17a36f] text-white font-bold rounded-md' onClick={handleDeviceGroupSave}>저장</button>
            </div>
        </div>
      </div>
    </div>
    </Dialog>
    <DeleteConfirm show={isDeleteGroup} title={'개소 그룹'} contents={groupName}
         onClose={()=>{setIsDeleteGroup(false)
                    handleResetDeviceInfo()} }
         onConfirm={onConfirm} />
    </>
  )
}



export default DeviceGrouping