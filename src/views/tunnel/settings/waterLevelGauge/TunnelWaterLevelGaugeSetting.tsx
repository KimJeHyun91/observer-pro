import React, { useState, useEffect, } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { AlertDialog } from '@/components/shared/AlertDialog'
import TunnelWaterLevelGaugeList from './TunnelWaterLevelGaugeList'
import { apiAddWaterLevel, apiModifyWaterLevel } from '@/services/TunnelService'
import { useWaterLevelList } from '@/utils/hooks/useTunnelArea'
import { waterLevelRequest } from '@/@types/tunnel';
import { useBillboardStore } from '@/store/tunnel/useBillboardStore'


const TunnelWaterLevelGaugeSetting = () => {
  const [waterLevelList, setWaterLevelList] = useState<waterLevelRequest[]>([])
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<waterLevelRequest[]>([]);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [message, setMessage] = useState('');

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors }
  } = useForm<waterLevelRequest>({
    defaultValues: {
      name: '',
      location: '',
      ip: '',
      port: '',
      id: '',
      password: '',
      communication: 'control_out'
    },
  })

  const { waterLevelList: data, mutate } = useWaterLevelList()

  useEffect(() => {
    if (data?.message === 'ok' && data.result.length > 0 && Array.isArray(data.result)) {
      let listData = data.result.filter(item => item.communication === 'control_out');
      const converted = listData.map(item => ({
        idx: item.idx,
        ip: item.ip,
        port: item.port,
        name: item.name,
        location: item.location,
        id: item.id,
        password: item.password,
        communication: item.communication
      }));
      setWaterLevelList(converted)
    }

  }, [data]);

  const handleEdit = (rows: waterLevelRequest[]) => {
    const item = rows[0]
    setValue('ip', item.ip)
    setValue('port', item.port)
    setValue('name', item.name)
    setValue('location', item.location)
    setValue('id', item.id)
    setValue('password', item.password)
  }

  const onSubmit = (submitData: waterLevelRequest) => {
    if (isEditMode && selectedRows[0]) {

      submitData['idx'] = selectedRows[0].idx as number
      onModify(submitData)
    } else {
      onConfirm(submitData)
    }

    setIsAlertOpen(true)
    setIsEditMode(false)
    reset({
      name: '',
      location: '',
      ip: '',
      port: '',
      id: '',
      password: '',
      communication: 'control_out'
    })
    setSelectedRows([])
  }

  const onConfirm = async (submitData: waterLevelRequest) => {
    try {

      const res = await apiAddWaterLevel(submitData)
      if (res.message === "ok") {
        setMessage('수위계가 등록되었습니다.')
        mutate();
        if (data?.message === 'ok' && data.result.length > 0 && Array.isArray(data.result)) {
          let listData = data.result
          const converted = listData.map(item => ({
            idx: item.idx,
            ip: item.ip,
            port: item.port,
            name: item.name,
            location: item.location,
            id: item.id,
            password: item.password,
            communication: item.communication
          }));
          setWaterLevelList(converted)
        }
      }
    } catch (e) {
      console.log(e)
      setMessage('중복된 ip입니다.\nip 확인 후 재등록해주세요');
    }
  }

  const onModify = async (submitData: waterLevelRequest) => {
    try {

      const res = await apiModifyWaterLevel(submitData)

      if (res.message === "ok") {
        setMessage('수위계 정보가 수정되었습니다.')
        mutate();
        if (data?.message === 'ok' && data.result.length > 0 && Array.isArray(data.result)) {
          let listData = data.result
          const converted = listData.map(item => ({
            idx: item.idx,
            ip: item.ip,
            port: item.port,
            name: item.name,
            location: item.location,
            id: item.id,
            password: item.password,
            communication: item.communication
          }));
          setWaterLevelList(converted);
        }
      }
    } catch (e) {
      console.log(e)
      setMessage('수위계 정보 수정을 실패하였습니다.')
    }

  }

  return (
    <>
      <h5 className="font-semibold mb-2">제어반 외부 수위계 추가</h5>
      <form
        className="flex flex-col gap-3 max-h-[410px] px-7 pt-4 pb-2 border border-gray-200 rounded-sm"
        onSubmit={handleSubmit(onSubmit)}
      >
        {/* 수위계 이름 */}
        <div className="relative">
          <Controller
            name="name"
            control={control}
            rules={{ required: '수위계 이름은 필수입니다.' }}
            render={({ field }) => (
              <input
                {...field}
                placeholder="수위계 이름"
                className={`input ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              />
            )}
          />
        </div>
        {/* 수쉬계 주소 */}
        <div className="relative">
          <Controller
            name="location"
            control={control}
            rules={{ required: '수위계 주소는 필수입니다.' }}
            render={({ field }) => (
              <input
                {...field}
                placeholder="수위계 주소"
                className={`input ${errors.location ? 'border-red-500' : 'border-gray-300'}`}
              />
            )}
          />
        </div>
        {/* ip 주소 */}
        <div className="relative">
          <Controller
            name="ip"
            control={control}
            rules={{ required: 'ip 주소는 필수입니다.' }}
            render={({ field }) => (
              <input
                {...field}
                placeholder="ip 주소"
                className={`input ${errors.ip ? 'border-red-500' : 'border-gray-300'}`}
              />
            )}
          />
        </div>
        {/* port */}
        <div className="relative">
          <Controller
            name="port"
            control={control}
            rules={{ required: 'port는 필수입니다.' }}
            render={({ field }) => (
              <input
                {...field}
                placeholder="port"
                className={`input ${errors.port ? 'border-red-500' : 'border-gray-300'}`}
              />
            )}
          />
        </div>
        {/* id */}
        <div className="relative">
          <Controller
            name="id"
            control={control}
            rules={{ required: 'id는 필수입니다.' }}
            render={({ field }) => (
              <input
                {...field}
                placeholder="id"
                className={`input ${errors.id ? 'border-red-500' : 'border-gray-300'}`}
              />
            )}
          />
        </div>
        {/* password */}
        <div className="relative">
          <Controller
            name="password"
            control={control}
            rules={{ required: 'password는 필수입니다.' }}
            render={({ field }) => (
              <input
                {...field}
                placeholder="password"
                className={`input ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
              />
            )}
          />
        </div>

        <div className="flex justify-end gap-2 ">
          {isEditMode && (
            <button
              type="button"
              className="w-[100px] h-[34px] bg-gray-200 text-black rounded"
              onClick={() => {
                setIsEditMode(false)
                reset()
              }}
            >
              취소
            </button>
          )}
          <button type="submit" className="w-[100px] h-[35px] bg-[#17A36F] text-white rounded">
            <span>{isEditMode ? '수정 완료' : '저장'}</span>
          </button>
        </div>

      </form>

      <TunnelWaterLevelGaugeList
        list={waterLevelList}
        setList={setWaterLevelList}
        handleEdit={handleEdit}
        setIsEditMode={setIsEditMode}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        setMessage={setMessage}
        setIsAlertOpen={setIsAlertOpen}
        mutate={mutate}
      />

      <AlertDialog
        isOpen={isAlertOpen}
        message={message}
        onClose={() => setIsAlertOpen(false)}
      />
    </>
  )
}

export default TunnelWaterLevelGaugeSetting
