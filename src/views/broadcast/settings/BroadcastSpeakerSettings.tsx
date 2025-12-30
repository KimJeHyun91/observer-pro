import { Button, Input, ScrollBar, Spinner } from '@/components/ui';
import { addSite, apiDeleteArea } from '@/services/BroadcastService';
import { useBroadcastArea, useBroadcastSites } from '@/utils/hooks/useBroadcast';
import React, { useEffect, useState } from 'react'
import ConfirmModal from '../modals/ConfirmModal';
import { AlertDialog } from '@/components/shared/AlertDialog';

export type Sites =  {
  id: string,
  name: string,
  address: string,
  lat: number,
  lng: number,
  transmitterCount: number,
  canBroadcast: boolean,
  canSendChime: boolean
}

const BroadcastSpeakerSettings = () => {
  const { mutate, sites, isLoading } = useBroadcastSites()
  const { areaList, mutate: getArea } = useBroadcastArea()
  const [siteId, setSiteId] = useState<string>('')
  const [selectedSite, setSelectedSite] = useState<any>()
  const [isConfirmModal, setIsConfirmModal] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [isAlertModal, setIsAlertModal] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(()=>{
    mutate()
  },[])

  const onSubmitSite = async() => {
    try{
      if(!siteId) return
      setLoading(true)
      const res = await addSite({siteId: siteId})
      if(res.message === 'ok'){
        setLoading(false)
        setStatusMessage('송신기가 등록되었습니다.')
        setIsAlertModal(true)
        setSiteId('')
      }else {
        setLoading(false)
        setStatusMessage(res?.result?.message)
        setIsAlertModal(true)
      }
    }catch(err){
      setLoading(false)
      console.log(err)
    }finally{
      getArea()
    }
  }

  const onDeleteSite = async() => {
    try{  
      if(!selectedSite) return
       await apiDeleteArea({idx: selectedSite.outside_idx})
    }catch(err){
      console.log(err)
    }finally{
      setSelectedSite(null)
      setIsConfirmModal(false)
    }
  }

  const uniqueAreaList = areaList?.result
    ?.filter((item, index, self) =>
      index === self.findIndex((t) => t.outside_idx === item.outside_idx)
    )
    ?.filter((item) => item.outside_site_id !== null);

  return (
    <div className="border rounded-lg">
      <div className="flex justify-between items-center px-3 py-3 border-b-2">
          <p className="font-bold">송신기 설정</p>
        
      </div>

      <div className="flex flex-col items-center max-h-[500px] p-4 space-y-4">
          <div className="w-full">
            <div className="m-2 p-2">
              <p className="font-semibold">송신기 ID</p>
              <Input 
                value={siteId}
                placeholder='송신기 ID를 입력해주세요.'
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full mt-1"
              />
            </div>
          </div>

          <Button
            loading={loading}
            type="submit"
            className="w-[20%] h-[50px] bg-[#17A36F] dark:bg-[#17A36F] text-[1rem] text-white px-4 py-1 rounded hover:bg-[#b0b3b9]"
            onClick={onSubmitSite}
          >
           저장
          </Button>
      </div>
      <div className='p-6 pl-8 w-full'>
        <p className="font-semibold mb-4">등록된 송신기</p>
        
          <ScrollBar className="max-h-[300px]">
            {uniqueAreaList?.length ? (
              <ul className="space-y-2">
              {uniqueAreaList.map((site) => (
                <li key={site.outside_idx} className="border p-2 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-bold">{site.outside_name}</p>
                  <p className="text-sm text-gray-500">{site.outside_location}</p>
                </div>
                <Button
                  className="bg-red-500 dark:bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
                  onClick={() => {
                  setIsConfirmModal(true)
                  setSelectedSite(site)
                  }}
                >
                  삭제
                </Button>
                </li>
              ))}
              </ul>
            ) : (
              <div className="border p-4 rounded-lg">
               <p className="text-center text-gray-500">등록된 송신기가 없습니다.</p>
              </div>
            )}
          </ScrollBar>
       
      </div>
    
      <AlertDialog isOpen={isAlertModal} message={statusMessage} onClose={()=>{setIsAlertModal(false)}} />
      <ConfirmModal show={isConfirmModal} contents={`${selectedSite?.outside_name} 송신기를 삭제 하시겠습니까?`} buttonName='확인' onClose={()=>setIsConfirmModal(false)} onConfirm={onDeleteSite} />
    </div>
  )
}

export default BroadcastSpeakerSettings
