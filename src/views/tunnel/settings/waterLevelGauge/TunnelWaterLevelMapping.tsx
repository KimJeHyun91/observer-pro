import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useWaterLevelList, useWaterLevelMappingOutsideList } from '@/utils/hooks/useTunnelArea'
import { waterLevelRequest } from '@/@types/tunnel'

type SortableField = 'name' | 'ip' | 'location' | 'communication'
type MappingSortableField = 'outside_name' | 'barrier_ip' | 'location' | 'water_level_name'

type SortConfig = {
  key: SortableField | null
  direction: 'ascending' | 'descending'
}

type MappingSortConfig = {
  key: MappingSortableField | null
  direction: 'ascending' | 'descending'
}

const TunnelWaterLevelMapping = () => {
  const [waterLevelList, setWaterLevelList] = useState<waterLevelRequest[]>([])
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'ascending' })
  const [mappingSortConfig, setMappingSortConfig] = useState<MappingSortConfig>({ key: null, direction: 'ascending' })

  const { waterLevelList: wData } = useWaterLevelList()
  const [selectedWaterLevelIdx, setSelectedWaterLevelIdx] = useState<number | null>(null)
  const { data: mappingData } = useWaterLevelMappingOutsideList(selectedWaterLevelIdx ?? -1)

  useEffect(() => {
    if (wData?.message === 'ok' && Array.isArray(wData.result)) {
      const converted = wData.result.map(item => ({
        idx: item.idx,
        ip: item.ip,
        port: item.port,
        name: item.name,
        location: item.location,
        id: item.id,
        password: item.password,
        communication: item.communication,
      }))
      setWaterLevelList(converted)
    }
  }, [wData])

  const handleSort = useCallback((key: SortableField) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'ascending') return { key, direction: 'descending' }
        if (prev.direction === 'descending') return { key: null, direction: 'ascending' }
      }
      return { key, direction: 'ascending' }
    })
  }, [])

  const handleMappingSort = useCallback((key: MappingSortableField) => {
    setMappingSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'ascending') return { key, direction: 'descending' }
        if (prev.direction === 'descending') return { key: null, direction: 'ascending' }
      }
      return { key, direction: 'ascending' }
    })
  }, [])

  const renderSortIcon = (column: string, currentConfig: SortConfig | MappingSortConfig) => {
    if (currentConfig.key !== column) return null
    return currentConfig.direction === 'ascending' ? ' ↑' : ' ↓'
  }

  const sortedList = useMemo(() => {
    if (!sortConfig.key) return waterLevelList
    return [...waterLevelList].sort((a, b) => {
      const aVal = a[sortConfig.key!]
      const bVal = b[sortConfig.key!]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const aStr = String(aVal), bStr = String(bVal)
      return sortConfig.direction === 'ascending'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })
  }, [waterLevelList, sortConfig])

  const selectedWaterLevel = useMemo(
    () => waterLevelList.find(w => w.idx === selectedWaterLevelIdx),
    [selectedWaterLevelIdx, waterLevelList]
  )

  const sortedMappingList = useMemo(() => {
    if (!mappingSortConfig.key || !mappingData?.result) return mappingData?.result || []
    const sorted = [...mappingData.result].sort((a, b) => {
      let aVal: any
      let bVal: any

      if (mappingSortConfig.key === 'water_level_name') {
        aVal = selectedWaterLevel?.name ?? ''
        bVal = selectedWaterLevel?.name ?? ''
      } else {
        aVal = a[mappingSortConfig.key!]
        bVal = b[mappingSortConfig.key!]
      }

      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      const aStr = String(aVal)
      const bStr = String(bVal)
      return mappingSortConfig.direction === 'ascending' ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr)
    })
    return sorted
  }, [mappingData, mappingSortConfig, selectedWaterLevel])

  return (
    <>
      <h5 className="font-semibold mb-2">수위계 목록</h5>
      <div className="rounded border border-gray-200 overflow-hidden max-h-[300px]">
        <div className="max-h-[240px] overflow-y-auto scroll-container">
          <table className="min-w-full border-separate border-spacing-0">
            <thead className="bg-gray-100 sticky top-0 z-10">
              <tr>
                {(['name', 'ip', 'location', 'communication'] as SortableField[]).map(h => (
                  <th
                    key={h}
                    onClick={() => handleSort(h)}
                    className="px-4 py-2 text-sm font-bold text-gray-600 uppercase tracking-wider cursor-pointer sticky top-0 bg-gray-100 text-center select-none"
                  >
                    {h.toUpperCase()}
                    {renderSortIcon(h, sortConfig)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedList.length > 0 ? (
                sortedList.map((item, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 cursor-pointer text-center"
                    onClick={() => setSelectedWaterLevelIdx(item.idx ?? null)}
                  >
                    <td className="px-4 py-2 text-sm">{item.name}</td>
                    <td className="px-4 py-2 text-sm">{item.ip}</td>
                    <td className="px-4 py-2 text-sm">{item.location}</td>
                    <td className="px-4 py-2 text-sm">
                      {item.communication === 'control_in' ? '제어반 수위계' : '외부 수위계'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-sm text-gray-500 text-center">
                    수위계 데이터 없음
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <h5 className="font-semibold mt-12 mb-2">연동 차단기 목록</h5>
      <div className="overflow-auto rounded border-gray-200 border max-h-[240px] scroll-container">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-gray-100 sticky top-0 z-10">
            <tr>
              {(['outside_name', 'barrier_ip', 'location', 'water_level_name'] as MappingSortableField[]).map(h => (
                <th
                  key={h}
                  onClick={() => handleMappingSort(h)}
                  className="px-4 py-2 text-sm font-bold text-gray-600 uppercase tracking-wider text-center sticky top-0 bg-gray-100 select-none cursor-pointer"
                >
                  {h.replace(/_/g, ' ').toUpperCase()}
                  {renderSortIcon(h, mappingSortConfig)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {selectedWaterLevelIdx != null &&
              mappingData?.message === 'ok' &&
              Array.isArray(sortedMappingList) &&
              sortedMappingList.length > 0 ? (
              sortedMappingList.map((rec: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50 text-center">
                  <td className="px-4 py-2 text-sm">{rec.outside_name}</td>
                  <td className="px-4 py-2 text-sm">{rec.barrier_ip}</td>
                  <td className="px-4 py-2 text-sm">{rec.location}</td>
                  <td className="px-4 py-2 text-sm">{selectedWaterLevel?.name || '-'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-4 text-sm text-gray-500 text-center">
                  연동된 차단기 없음
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default TunnelWaterLevelMapping