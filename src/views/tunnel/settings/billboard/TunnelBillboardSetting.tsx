import React, { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { AlertDialog } from '@/components/shared/AlertDialog'
import TunnelBillboardList from './TunnelBillboardList'
import { apiAddBillboard, apiModifyBillboard } from '@/services/TunnelService'
import { useBillboardList } from '@/utils/hooks/useTunnelArea'
import { billboardRequest } from '@/@types/tunnel'
import { useBillboardStore } from '@/store/tunnel/useBillboardStore'

const TunnelBillboardSetting = () => {
  const [billboardList, setBillboardList] = useState<billboardRequest[]>([])
  const [message, setMessage] = useState('')
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedRows, setSelectedRows] = useState<billboardRequest[]>([])

  const { setIsSettingUpdate } = useBillboardStore()
  const { billboardList: data, mutate } = useBillboardList()

  useEffect(() => {
    if (data?.message === 'ok' && Array.isArray(data.result)) {
      const converted = data.result.map(item => ({
        idx: item.idx,
        ip: item.ip,
        port: item.port,
        name: item.name,
        row: item.row.toString(),
        col: item.col.toString(),
        type: item.type,
        manufacturer: item.manufacturer
      }))
      setBillboardList(converted)
    }
  }, [data])

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    watch,
    formState: { errors }
  } = useForm<billboardRequest>({
    defaultValues: {
      ip: '',
      port: '',
      name: '',
      row: '',
      col: '',
      type: '',
      manufacturer: ''
    },
  })

  const typeValue = watch('type')

  const onSubmit = (submitData: billboardRequest) => {
    if (typeValue !== 'VMS') {
      submitData.row = ''
      submitData.col = ''
    }

    if (isEditMode && selectedRows[0]) {
      submitData['idx'] = selectedRows[0].idx as number
      onModify(submitData)
      setMessage('전광판 정보가 수정되었습니다.')
    } else {
      onConfirm(submitData)
    }

    setIsAlertOpen(true)
    setIsEditMode(false)
    reset({
      ip: '',
      port: '',
      name: '',
      row: '',
      col: '',
      type: '',
      manufacturer: ''
    })
    setSelectedRows([])
  }

  const handleEdit = (rows: billboardRequest[]) => {
    const item = rows[0]

    setValue('ip', item.ip)
    setValue('port', item.port)
    setValue('name', item.name)
    setValue('row', item.row)
    setValue('col', item.col)
    setValue('type', item.type)
    setValue('manufacturer', item.manufacturer)
  }

  const onConfirm = async (submitData: billboardRequest) => {
    try {
      const res = await apiAddBillboard(submitData)
      if (res.message === 'ok') {
        setMessage('전광판이 등록되었습니다.')
        mutate()
      }
    } catch (e) {
      console.log(e)
      setMessage('전광판 등록을 실패하였습니다.\n동일한 IP가 있는지 확인해주세요');
    }
  }

  const onModify = async (submitData: billboardRequest) => {
    try {
      const res = await apiModifyBillboard(submitData)
      setIsSettingUpdate(true)
      if (res.message === 'ok') {
        setMessage('전광판이 수정되었습니다.')
        mutate()
      }
    } catch (e) {
      console.log(e)
      setMessage('전광판 수정을 실패하였습니다.')
    }
  }

  return (
    <>
      <h5 className="font-semibold mb-2">전광판 추가</h5>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-3 max-h-[370px] px-7 pt-4 pb-2 border border-gray-200 rounded-sm"
      >
        <div className="relative">
          <Controller
            name="name"
            control={control}
            rules={{ required: '전광판 이름은 필수입니다.' }}
            render={({ field }) => (
              <input
                {...field}
                placeholder="전광판 이름"
                className={`input ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              />
            )}
          />
        </div>

        <div className="relative">
          <Controller
            name="ip"
            control={control}
            rules={{ required: 'IP 주소는 필수입니다.' }}
            render={({ field }) => (
              <input
                {...field}
                placeholder="IP 주소"
                className={`input ${errors.ip ? 'border-red-500' : 'border-gray-300'}`}
              />
            )}
          />
        </div>

        <div className="relative">
          <Controller
            name="port"
            control={control}
            rules={{ required: '포트 번호는 필수입니다.' }}
            render={({ field }) => (
              <input
                {...field}
                placeholder="포트 번호"
                className={`input ${errors.port ? 'border-red-500' : 'border-gray-300'}`}
              />
            )}
          />
        </div>

        <div className="relative">
          <Controller
            name="manufacturer"
            control={control}
            rules={{ required: '제조사 선택은 필수입니다.' }}
            render={({ field }) => (
              <select
                {...field}
                className={`input ${errors.manufacturer ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">제조사 선택</option>
                <option value="Y-Control">Y-Control</option>
                <option value="D-Control">D-Control</option>
              </select>
            )}
          />
        </div>

        <div className="relative">
          <Controller
            name="type"
            control={control}
            rules={{ required: '타입 선택은 필수입니다.' }}
            render={({ field }) => (
              <select
                {...field}
                className={`input ${errors.type ? 'border-red-500' : 'border-gray-300'}`}
              >
                <option value="">타입 선택</option>

                <option value="LCS">LCS</option>
                <option value="VMS">VMS</option>
              </select>
            )}
          />
        </div>

        {typeValue === 'VMS' && (
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Controller
                name="row"
                control={control}
                rules={{
                  required: '행(row)은 필수입니다.',
                  min: { value: 1, message: '최소 1 이상 입력해주세요.' },
                  max: { value: 10, message: '최대 10까지만 입력할 수 있습니다.' }
                }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    min={1}
                    max={10}
                    placeholder="단 (행)"
                    className={`input ${errors.row ? 'border-red-500' : 'border-gray-300'}`}
                  />
                )}
              />
            </div>

            <div className="relative">
              <Controller
                name="col"
                control={control}
                rules={{ required: '열(col)은 필수입니다.' }}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    placeholder="열 (열)"
                    className={`input ${errors.col ? 'border-red-500' : 'border-gray-300'}`}
                  />
                )}
              />
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
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

      <TunnelBillboardList
        list={billboardList}
        setList={setBillboardList}
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

export default TunnelBillboardSetting
