import React, { useMemo, useState } from 'react'
import { ScrollBar, Button } from '@/components/ui'
import type { Camera } from './TunnelCameraSetting'
import { apiRemoveCamera } from '@/services/ObserverService'
import type { ServiceType } from '@/@types/common'

/** 항상 tunnel 고정 */
const MAIN_SERVICE_NAME: ServiceType = 'tunnel' as ServiceType

interface TunnelCameraListProps {
  cameras: Camera[]
  mutate: () => Promise<any> | any
  handleEdit: (rows: Camera[]) => void
  setIsEditMode: (d: boolean) => void
  selectedRows: Camera[]
  setSelectedRows: React.Dispatch<React.SetStateAction<Camera[]>>
  setMessage: (msg: string) => void
  setIsAlertOpen: (flag: boolean) => void
}

type SortableFields = 'camera_ip' | 'camera_name' | 'id'
type SortDirection = 'ascending' | 'descending' | 'none'
type SortConfig = { key: SortableFields | ''; direction: SortDirection }

/** 화면에는 ':' 뒤만 보이게 */
const optionLabel = (s: string) => {
  const i = s.lastIndexOf(':')
  const tail = i >= 0 ? s.slice(i + 1).trim() : s
  return tail || s
}

/** 키 비교용: ':' 앞부분 */
const optionKey = (s: string) => {
  const i = s.lastIndexOf(':')
  return (i >= 0 ? s.slice(0, i) : s).trim()
}

const TunnelCameraList = ({
  cameras = [],
  mutate,
  handleEdit,
  setIsEditMode,
  selectedRows,
  setSelectedRows,
  setMessage,
  setIsAlertOpen,
}: TunnelCameraListProps) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: '', direction: 'none' })

  const handleSort = (key: SortableFields) => {
    if (sortConfig.key !== key) {
      setSortConfig({ key, direction: 'ascending' })
      return
    }
    if (sortConfig.direction === 'ascending') {
      setSortConfig({ key, direction: 'descending' })
    } else if (sortConfig.direction === 'descending') {
      setSortConfig({ key: '', direction: 'none' })
    } else {
      setSortConfig({ key, direction: 'ascending' })
    }
  }

  const renderSortIcon = (column: SortableFields) => {
    if (sortConfig.key !== column || sortConfig.direction === 'none') return null
    return sortConfig.direction === 'ascending' ? '↑' : '↓'
  }

  const sortByNewest = (arr: Camera[]) =>
    [...arr].sort((a, b) => (b?.idx ?? 0) - (a?.idx ?? 0))

  const sortedData = useMemo(() => {
    if (!Array.isArray(cameras)) return []
    const base = sortByNewest(cameras)
    if (!sortConfig.key || sortConfig.direction === 'none') return base

    return [...base].sort((a, b) => {
      const getVal = (c: Camera) => {
        if (sortConfig.key === 'id') return (c.access_point || '').split('\n')[0] ?? ''
        return String((c as any)[sortConfig.key] ?? '')
      }
      const av = getVal(a)
      const bv = getVal(b)
      const cmp = String(av).localeCompare(String(bv))
      return sortConfig.direction === 'ascending' ? cmp : -cmp
    })
  }, [cameras, sortConfig])

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? [...cameras] : [])
  }

  const handleSelectRow = (item: Camera) => {
    setSelectedRows(prev =>
      prev.some(r => r.idx === item.idx)
        ? prev.filter(r => r.idx !== item.idx)
        : [...prev, item]
    )
  }

  const handleDeleteClick = async () => {
    if (selectedRows.length === 0) return
    try {
      const idxs = selectedRows.map(r => r.idx)
      await apiRemoveCamera({ idxs, mainServiceName: MAIN_SERVICE_NAME })
      await mutate()
      setSelectedRows([])
      setMessage('개별 카메라 삭제를 성공하였습니다.')
      setIsAlertOpen(true)
    } catch (e: any) {
      console.error(e)
      alert(e?.response?.data?.message ?? '카메라 삭제에 실패했습니다.')
    }
  }

  return (
    <div className="mt-5">
      <h5 className="font-semibold mb-2">개별 카메라 목록</h5>

      <ScrollBar className="max-h-[180px]">
        <table className="w-full min-w-full">
          <thead>
            <tr className="bg-gray-50 select-none">
              <th className="sticky top-0 bg-gray-50 py-2 px-4">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={cameras.length > 0 && selectedRows.length === cameras.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>

              <th className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer" onClick={() => handleSort('camera_ip')}>
                <div className="flex items-center justify-center gap-1">
                  IP address {renderSortIcon('camera_ip')}
                </div>
              </th>

              <th className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer" onClick={() => handleSort('camera_name')}>
                <div className="flex items-center justify-center gap-1">
                  NAME {renderSortIcon('camera_name')}
                </div>
              </th>

              <th className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer" onClick={() => handleSort('id')}>
                <div className="flex items-center justify-center gap-1">
                  ID {renderSortIcon('id')}
                </div>
              </th>

              <th className="sticky top-0 bg-gray-50 py-2 px-4">Password</th>

              {/* 해상도(선택된 profileToken의 라벨만) */}
              <th className="sticky top-0 bg-gray-50 py-2 px-4">해상도</th>
            </tr>
          </thead>

          <tbody>
            {sortedData.map((item) => {
              const parts = (item.access_point || '').split('\n')
              const id = parts[0] || ''
              const optionsCsv = parts[2] || ''
              const selectedHead = (parts[3] || '').trim() // 저장된 값은 ':' 앞부분(키)

              // 옵션 목록에서 head가 일치하는 항목을 찾아 라벨만 표시
              const options = optionsCsv
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)

              const matched = selectedHead
                ? options.find(opt => optionKey(opt) === selectedHead)
                : undefined

              const resolutionLabel = matched ? optionLabel(matched) : '-'

              return (
                <tr key={item.idx} className="hover:bg-gray-50">
                  <td className="py-2 px-4 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={selectedRows.some(s => s.idx === item.idx)}
                      onChange={() => handleSelectRow(item)}
                    />
                  </td>

                  <td className="px-4 py-2 text-center">{item.camera_ip}</td>
                  <td className="px-4 py-2 text-center">{item.camera_name}</td>
                  <td className="px-4 py-2 text-center">{id}</td>
                  <td className="px-4 py-2 text-center">*********</td>
                  <td className="px-4 py-2 text-center">{resolutionLabel}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </ScrollBar>

      <div className="flex justify-end gap-2 mt-6">
        <Button
          type="button"
          className="mt-2 w-[100px] h-[34px] bg-[#aeafb1] rounded"
          size="sm"
          variant="solid"
          onClick={handleDeleteClick}
          disabled={selectedRows.length === 0}
        >
          삭제
        </Button>

        <Button
          type="button"
          className="mr-3 mt-2 w-[100px] h-[34px] bg-[#17A36F] rounded"
          size="sm"
          variant="solid"
          onClick={() => {
            if (selectedRows.length === 1) {
              setIsEditMode(true)
              handleEdit(selectedRows)
            }
          }}
          disabled={selectedRows.length !== 1}
        >
          수정
        </Button>
      </div>
    </div>
  )
}

export default TunnelCameraList
