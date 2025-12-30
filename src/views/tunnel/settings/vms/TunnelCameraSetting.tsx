import React, { useState } from 'react'
import { useForm, SubmitHandler, Controller } from 'react-hook-form'
import { AlertDialog } from '@/components/shared/AlertDialog'
import { AxiosError } from 'axios'
import TunnelCameraList from './TunnelCameraList'
import { apiCreateCamera, apiUpdateCamera } from '@/services/ObserverService'
import { useIndependentCameras } from '@/utils/hooks/useCameras'

export type Camera = {
  idx: number
  camera_ip: string
  camera_name: string
  access_point: string // "id\npw\nopt1,opt2,...\nselected"
}

interface FormValues {
  ipAddress: string
  name: string
  id: string
  pw: string
  profileToken?: string
}

type ApiResult = 'Created' | 'OK' | 'No Content'

// ✅ 화면엔 ':' 뒤만 (라벨)
const optionLabel = (s: string) => {
  const i = s.lastIndexOf(':')
  const tail = i >= 0 ? s.slice(i + 1).trim() : s
  return tail || s
}

// ✅ value로 쓸 ':' 앞부분
const valueBeforeColon = (s: string) => {
  const i = s.lastIndexOf(':')
  const head = i >= 0 ? s.slice(0, i).trim() : s.trim()
  return head
}

const TunnelCameraSetting = () => {
  const { isLoading, error, cameras = [], mutate } = useIndependentCameras('tunnel')

  const [vmsMessage, setVmsMessage] = useState('')
  const [isAlertMsgOpen, setIsAlertMsgOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Camera[]>([])
  const [profileOptions, setProfileOptions] = useState<string[]>([])

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      ipAddress: '',
      name: '',
      id: '',
      pw: '',
      profileToken: '',
    },
  })

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    try {
      // 옵션 배열 → "a,b,c" CSV (그대로 유지)
      const safeProfileTokens = (profileOptions || [])
        .map((s) => s.trim())
        .filter(Boolean)
        .join(',')

      // ✅ 선택값은 ':' 앞부분(이미 폼 value가 head만 담고 있음)
      const selectedToken = (data.profileToken || '').trim()

      if (isEditMode) {
        const target = selectedRows[0]
        await apiUpdateCamera<ApiResult>({
          idx: target.idx,
          ipAddress: data.ipAddress,
          name: data.name,
          id: data.id,
          pw: data.pw,
          profileTokens: safeProfileTokens,  // CSV
          profileToken: selectedToken,       // head만 전송
          mainServiceName: 'tunnel',
        })

        setVmsMessage('개별 카메라 수정을 성공하였습니다.')
        setIsAlertMsgOpen(true)

        await mutate()
        setIsEditMode(false)
        setSelectedRows([])
        reset({ ipAddress: '', name: '', id: '', pw: '', profileToken: '' })
        setProfileOptions([])
      } else {
        await apiCreateCamera<ApiResult>({
          ipAddress: data.ipAddress,
          name: data.name,
          id: data.id,
          pw: data.pw,
          mainServiceName: 'tunnel',
        })

        setVmsMessage('개별 카메라 등록을 성공하였습니다.')
        setIsAlertMsgOpen(true)

        await mutate()
        reset({ ipAddress: '', name: '', id: '', pw: '', profileToken: '' })
        setProfileOptions([])
      }
    } catch (err) {
      if (err instanceof AxiosError) {
        setVmsMessage('개별 카메라 등록에 실패하였습니다.')
      } else {
        console.error('Unknown error:', err)
        setVmsMessage('개별 카메라 등록에 실패하였습니다.')
      }
      setIsAlertMsgOpen(true)
    }
  }

  /** 리스트에서 '수정' 누르면 폼 채워넣기 */
  const handleEdit = (rows: Camera[]) => {
    const item = rows[0]
    const parts = (item.access_point || '').split('\n')

    const id = parts[0] || ''
    const pw = parts[1] || ''
    const options = parts[2]
      ? parts[2].split(',').map((s) => s.trim()).filter(Boolean)
      : []
    const selectedRaw = (parts[3] || '').trim() // 원본(라벨 포함 가능)

    setValue('ipAddress', item.camera_ip)
    setValue('name', item.camera_name)
    setValue('id', id)
    setValue('pw', pw)
    setValue('profileToken', valueBeforeColon(selectedRaw)) // ✅ value는 ':' 앞부분만
    setProfileOptions(options)         // 원본 옵션(라벨 포함) 배열
    setIsEditMode(true)
  }

  return (
    <>
      <h5 className="font-semibold mb-2">개별 카메라 추가</h5>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-5 px-7 py-4 border border-gray-200 rounded-sm"
      >
        {/* IP Address */}
        <div className="relative flex items-center">
          <label htmlFor="ipAddress" className="min-w-[90px] mb-1 font-medium">
            IP Address
          </label>
          <Controller
            name="ipAddress"
            control={control}
            rules={{ required: 'IP 주소를 입력하세요.' }}
            render={({ field }) => (
              <input
                {...field}
                className="w-full border rounded px-3 py-2"
                placeholder="IP 주소를 입력하세요."
              />
            )}
          />
        </div>

        {/* NAME */}
        <div className="relative flex items-center">
          <label htmlFor="name" className="min-w-[90px] mb-1 font-medium">
            NAME
          </label>
          <Controller
            name="name"
            control={control}
            rules={{ required: '카메라명을 입력하세요.' }}
            render={({ field }) => (
              <input
                {...field}
                className="w-full border rounded px-3 py-2"
                placeholder="카메라명을 입력하세요."
              />
            )}
          />
        </div>

        {/* ID */}
        <div className="relative flex items-center">
          <label htmlFor="id" className="min-w-[90px] mb-1 font-medium">
            ID
          </label>
          <Controller
            name="id"
            control={control}
            rules={{ required: 'ID를 입력하세요.' }}
            render={({ field }) => (
              <input
                {...field}
                className="w-full border rounded px-3 py-2"
                placeholder="ID를 입력하세요."
              />
            )}
          />
        </div>

        {/* Password */}
        <div className="relative flex items-center">
          <label htmlFor="pw" className="min-w-[90px] mb-1 font-medium">
            Password
          </label>
          <Controller
            name="pw"
            control={control}
            rules={{ required: '비밀번호를 입력하세요.' }}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="비밀번호를 입력하세요."
              />
            )}
          />
        </div>

        {/* 해상도 (프로필 토큰) */}
        <div className="relative flex items-center">
          <label htmlFor="profileToken" className="min-w-[90px] mb-1 font-medium">
            해상도
          </label>
          <Controller
            name="profileToken"
            control={control}
            render={({ field }) => {
              // 폼의 value(= head)와 옵션 목록(= 원본 문자열들)을 매핑
              const val = (field.value || '').trim()

              // 원본 옵션들을 {value: head, label: tail}로 변환 + value 중복 제거
              const mapped = (profileOptions || []).map((opt) => ({
                value: valueBeforeColon(opt),
                label: optionLabel(opt),
              }))
              const uniqByValue = Array.from(
                new Map(mapped.map(o => [o.value, o])).values()
              )

              // 현재 value가 목록에 없다면 임시로 추가(라벨 없으면 value 그대로 표시)
              if (val && !uniqByValue.some(o => o.value === val)) {
                uniqByValue.unshift({ value: val, label: val })
              }

              return (
                <select
                  {...field}
                  className="w-[250px] border rounded pl-1 py-2 pr-10"
                >
                  <option value="">선택 안 함</option>
                  {uniqByValue.map(({ value, label }) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              )
            }}
          />
        </div>

        <div className="flex justify-end gap-2">
          {isEditMode && (
            <button
              type="button"
              className="w-[100px] h-[34px] mt-2 bg-[#edf0f6] text-black px-4 py-2 rounded hover:bg-[#80d8b8]"
              onClick={() => {
                setIsEditMode(false)
                setSelectedRows([])
                reset({ ipAddress: '', name: '', id: '', pw: '', profileToken: '' })
                setProfileOptions([]) // 옵션도 초기화 → '선택 안 함'만 보임
              }}
            >
              취소
            </button>
          )}
          <button
            type="submit"
            className="w-[100px] h-[34px] mt-2 bg-[#17A36F] text-white px-4 py-2 rounded hover:bg-[#80d8b8]"
          >
            {isEditMode ? '수정 완료' : '저장'}
          </button>
        </div>
      </form>

      <TunnelCameraList
        cameras={cameras}
        mutate={mutate}
        handleEdit={handleEdit}
        setIsEditMode={setIsEditMode}
        selectedRows={selectedRows}
        setSelectedRows={setSelectedRows}
        setMessage={setVmsMessage}
        setIsAlertOpen={setIsAlertMsgOpen}
      />

      <AlertDialog
        isOpen={isAlertMsgOpen}
        message={vmsMessage}
        onClose={() => setIsAlertMsgOpen(false)}
      />
    </>
  )
}

export default TunnelCameraSetting
