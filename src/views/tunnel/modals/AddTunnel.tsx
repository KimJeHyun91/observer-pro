import React, { useEffect, useState } from 'react'
import Dialog from '@/components/ui/Dialog'
import Button from '@/components/ui/Button'
import { Input } from '@/components/ui'
import { useForm, Controller } from 'react-hook-form'
import { TunnelOutsideForm, billboardRequest } from '@/@types/tunnel'
import { useTunnelOutside, useBillboardList } from '@/utils/hooks/useTunnelArea'

type AddTunnelProps = {
  show: boolean
  onModalClose: () => void
  onConfirm: (device: TunnelOutsideForm) => void
}

const AddTunnel = ({ show, onModalClose, onConfirm }: AddTunnelProps) => {
  const { outsideList, mutate } = useTunnelOutside()
  const { billboardList: data, mutate: billboardMutate } = useBillboardList()

  const {
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isValid },
  } = useForm<TunnelOutsideForm>({
    mode: 'onChange',
    defaultValues: {
      name: '',
      location: '',
      barrierIp: '',
      direction: '상행',
      billboardLCSIds: [],
      billboardVMSIds: [],
      /** 🔽 추가: 가디언라이트 IP(선택) */
      guardianLightIp: '', 
    } as any,
  })

  // billboardVMSIds, billboardLCSIds 는 string[] 형태로 관리
  const billboardVMSIds = watch('billboardVMSIds') || []
  const billboardLCSIds = watch('billboardLCSIds') || []

  const [billboardList, setBillboardList] = useState<billboardRequest[]>([])

  useEffect(() => {
    mutate()
    billboardMutate()
  }, [])

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
      }))
      setBillboardList(converted)
    }
  }, [data])

  const billboardListVMS = billboardList.filter(b => b.type === 'VMS')
  const billboardListLCS = billboardList.filter(b => b.type === 'LCS')

  // 중복 선택 방지 필터 (현재 인덱스 제외하고 선택된 값들로 필터링)
  const getFilteredOptions = (
    list: billboardRequest[],
    selected: string[],
    currentIdx: number
  ) => {
    const usedValues = selected.filter((_, idx) => idx !== currentIdx)
    return list.filter(opt => !usedValues.includes(opt.idx?.toString() ?? ''))
  }

  // VMS select 값 변경 핸들러
  const handleVMSChange = (index: number, value: string) => {
    const newArr = [...billboardVMSIds]
    newArr[index] = value
    setValue('billboardVMSIds', newArr, { shouldValidate: true })
  }

  const addVMS = () => {
    // 마지막이 비어있지 않을 때만 추가 가능
    if (billboardVMSIds.length === 0 || billboardVMSIds[billboardVMSIds.length - 1]) {
      if (billboardVMSIds.length < 4) setValue('billboardVMSIds', [...billboardVMSIds, ''])
    }
  }

  const removeVMS = (index: number) => {
    setValue(
      'billboardVMSIds',
      billboardVMSIds.filter((_, i) => i !== index),
      { shouldValidate: true }
    )
  }

  // LCS select 값 변경 핸들러
  const handleLCSChange = (index: number, value: string) => {
    const newArr = [...billboardLCSIds]
    newArr[index] = value
    setValue('billboardLCSIds', newArr, { shouldValidate: true })
  }

  const addLCS = () => {
    if (billboardLCSIds.length === 0 || billboardLCSIds[billboardLCSIds.length - 1]) {
      if (billboardLCSIds.length < 4) setValue('billboardLCSIds', [...billboardLCSIds, ''])
    }
  }

  const removeLCS = (index: number) => {
    setValue(
      'billboardLCSIds',
      billboardLCSIds.filter((_, i) => i !== index),
      { shouldValidate: true }
    )
  }

  // 유효성 검사
  const isFormValid = () => {
    const vmsValid = billboardVMSIds.length === 0 || billboardVMSIds.every(val => val !== '')
    const lcsValid = billboardLCSIds.length === 0 || billboardLCSIds.every(val => val !== '')
    return isValid && vmsValid && lcsValid
  }

  const onSubmit = (formData: TunnelOutsideForm) => {
    const fullName = `${formData.name}`
    onConfirm({ ...formData, name: fullName })
    reset()
    onModalClose()
  }

  return (
    <Dialog
      className="relative"
      isOpen={show}
      contentClassName="pb-3 px-0"
      onClose={() => {
        reset()
        onModalClose()
      }}
    >
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="px-5">
          <h5 className="mt-2">터널 개소 추가</h5>
          <span className="block border my-2"></span>

          {/* 방향 */}
          <div className="flex h-[32px] w-full">
            <p className="w-[110px] leading-[33px] text-right text-gray-500 font-bold text-[15px] pr-[14px]">
              <a className="text-red-500">*</a> 방향
            </p>
            <Controller
              name="direction"
              control={control}
              render={({ field }) => (
                <div className="flex gap-4 w-[370px]">
                  {['상행', '하행'].map(dir => (
                    <label key={dir} className="flex items-center space-x-2">
                      <input type="radio" value={dir} checked={field.value === dir} onChange={field.onChange} />
                      <span>{dir}</span>
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          {/* 개소 명 */}
          <div className="flex mt-4 h-[32px]">
            <p className="w-[110px] text-right leading-[33px] text-gray-500 font-bold text-[15px] pr-[14px]">
              <a className="text-red-500">*</a> 개소 명
            </p>
            <Controller
              name="name"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Input {...field} className="w-[370px] h-[32px] px-2 border border-[#E3E6EB] rounded bg-[#F2F5F9] text-[13px]" placeholder="개소 명을 입력하세요" />
              )}
            />
          </div>

          {/* 개소 위치 */}
          <div className="flex mt-4 h-[32px]">
            <p className="w-[110px] text-right leading-[33px] text-gray-500 font-bold text-[15px] pr-[14px]">
              <a className="text-red-500">*</a> 개소 위치
            </p>
            <Controller
              name="location"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Input {...field} className="w-[370px] h-[32px] px-2 border border-[#E3E6EB] rounded bg-[#F2F5F9] text-[13px]" placeholder="개소 위치를 입력하세요" />
              )}
            />
          </div>

          {/* 차단막 */}
          <div className="flex mt-4 h-[32px]">
            <p className="w-[110px] text-right leading-[33px] text-gray-500 font-bold text-[15px] pr-[14px]">
              <a className="text-red-500">*</a> 차단막
            </p>
            <Controller
              name="barrierIp"
              control={control}
              rules={{ required: true }}
              render={({ field }) => (
                <Input {...field} className="w-[370px] h-[32px] px-2 border border-[#E3E6EB] rounded bg-[#F2F5F9] text-[13px]" placeholder="차단막 IP를 입력하세요" />
              )}
            />
          </div>

             {/* 🔽 추가: 가디언라이트 (선택) */}
          <div className="flex mt-4 h-[32px]">
            <p className="w-[110px] text-right leading-[33px] text-gray-500 font-bold text-[15px] pr-[14px]">
              가디언라이트
            </p>
            <Controller
              name="guardianLightIp"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  className="w-[370px] h-[32px] px-2 border border-[#E3E6EB] rounded bg-[#F2F5F9] text-[13px]"
                  placeholder="가디언라이트 IP를 입력하세요"
                />
              )}
            />
          </div>

          {/* VMS 전광판 */}
          <div className="flex mt-4">
            <p className="w-[110px] text-right leading-[33px] text-gray-500 font-bold text-[15px] pr-[14px]">전광판 (VMS)</p>
            <div className="block w-[370px]">
              {billboardVMSIds.map((val, index) => {
                const options = getFilteredOptions(billboardListVMS, billboardVMSIds, index)
                const isLast = index === billboardVMSIds.length - 1
                return (
                  <div key={index} className="w-full h-[32px] mb-[10px] flex gap-4 items-center">
                    <span className="w-[50px] h-[26px] text-center leading-[26px] bg-[#F2F5F9] rounded-lg text-[12px] text-[#616A79]">{index + 1}차선</span>
                    <select
                      value={val}
                      onChange={e => handleVMSChange(index, e.target.value)}
                      className={`${isLast ? 'w-[260px]' : 'w-[304px]'} h-[32px] px-2 border border-[#E3E6EB] bg-white text-[13px]`}
                    >
                      <option value="">전광판 (VMS) 선택</option>
                      {options.map(opt => (
                        <option key={opt.idx} value={opt.idx}>
                          {opt.name} ({opt.ip})
                        </option>
                      ))}
                    </select>
                    {isLast && (
                      <span
                        onClick={() => removeVMS(index)}
                        className="w-[18px] h-[18px] border-[2px] border-[#D76767] text-center leading-[14px] text-[#D76767] text-[20px] rounded-sm cursor-pointer"
                      >
                        -
                      </span>
                    )}
                  </div>
                )
              })}
              <div
                onClick={addVMS}
                className="w-full h-[26px] bg-[#F7F7F7] text-[#647DB7] text-center leading-[26px] text-[13px] border border-[#D9DCE3] cursor-pointer mt-[3px] relative select-none"
              >
                <a className="absolute left-[120px] top-[0px] leading-6">+</a> VMS 전광판 추가
              </div>
            </div>
          </div>

          {/* LCS 전광판 */}
          <div className="flex mt-4">
            <p className="w-[110px] text-right leading-[33px] text-gray-500 font-bold text-[15px] pr-[14px]">전광판 (LCS)</p>
            <div className="block w-[370px]">
              {billboardLCSIds.map((val, index) => {
                const options = getFilteredOptions(billboardListLCS, billboardLCSIds, index)
                const isLast = index === billboardLCSIds.length - 1
                return (
                  <div key={index} className="w-full h-[32px] mb-[10px] flex gap-4 items-center">
                    <span className="w-[50px] h-[26px] text-center leading-[26px] bg-[#F2F5F9] rounded-lg text-[12px] text-[#616A79]">{index + 1}차선</span>
                    <select
                      value={val}
                      onChange={e => handleLCSChange(index, e.target.value)}
                      className={`${isLast ? 'w-[260px]' : 'w-[304px]'} h-[32px] px-2 border border-[#E3E6EB] bg-white text-[13px]`}
                    >
                      <option value="">전광판 (LCS) 선택</option>
                      {options.map(opt => (
                        <option key={opt.idx} value={opt.idx}>
                          {opt.name} ({opt.ip})
                        </option>
                      ))}
                    </select>
                    {isLast && (
                      <span
                        onClick={() => removeLCS(index)}
                        className="w-[18px] h-[18px] border-[2px] border-[#D76767] text-center leading-[14px] text-[#D76767] text-[20px] rounded-sm cursor-pointer"
                      >
                        -
                      </span>
                    )}
                  </div>
                )
              })}
              <div
                onClick={addLCS}
                className="w-full h-[26px] bg-[#F7F7F7] text-[#647DB7] text-center leading-[26px] text-[13px] border border-[#D9DCE3] cursor-pointer mt-[3px] relative select-none"
              >
                <a className="absolute left-[120px] top-[0px] leading-6">+</a> LCS 전광판 추가
              </div>
            </div>
          </div>


          <span className="block border my-2 mt-6"></span>
        </div>

        <div className="w-full flex justify-end mt-[10px] pr-4">
          <Button
            className="mr-3 w-[100px] h-[34px] bg-[#D9DCE3] rounded-none"
            size="sm"
            type="button"
            onClick={() => {
              reset()
              onModalClose()
            }}
          >
            취소
          </Button>
          <Button
            className="mr-3 w-[100px] h-[34px] bg-[#17A36F] rounded-none text-white disabled:bg-gray-300"
            size="sm"
            type="submit"
            disabled={!isFormValid()}
          >
            저장
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

export default AddTunnel
