import React, { useCallback, useState } from 'react'
import { ScrollBar, Button } from '@/components/ui'
import { apiDeleteWaterLevel } from '@/services/TunnelService'
import { waterLevelRequest } from '@/@types/tunnel';

interface TunnelWaterLevelListProps {
  list: waterLevelRequest[]
  setList: (list: waterLevelRequest[]) => void
  handleEdit: (rows: waterLevelRequest[]) => void
  setIsEditMode: (flag: boolean) => void
  selectedRows: waterLevelRequest[]
  setSelectedRows: (rows: waterLevelRequest[]) => void
  setMessage: (msg: string) => void
  setIsAlertOpen: (flag: boolean) => void
  mutate: () => void
}

type SortableFields = 'name' | 'location' | 'ip' | 'port' | 'id';

type SortConfig = {
  key: SortableFields | null;
  direction: 'ascending' | 'descending';
};

const TunnelWaterLevelGaugeList = ({
  list,
  setList,
  handleEdit,
  setIsEditMode,
  selectedRows,
  setSelectedRows,
  setMessage,
  setIsAlertOpen,
  mutate
}: TunnelWaterLevelListProps) => {

  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: null,
    direction: 'ascending',
  });



  const sortedData = React.useMemo(() => {
    if (!Array.isArray(list)) return [];
    if (!sortConfig.key) return list;

    return [...list].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      const aString = String(aValue);
      const bString = String(bValue);

      if (sortConfig.direction === 'ascending') {
        return aString.localeCompare(bString);
      } else {
        return bString.localeCompare(aString);
      }
    });
  }, [list, sortConfig]);

  const handleSort = useCallback((key: SortableFields) => {
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'ascending') {
        setSortConfig({ key, direction: 'descending' });
      } else if (sortConfig.direction === 'descending') {
        setSortConfig({ key: null, direction: 'ascending' }); // 초기화
      }
    } else {
      setSortConfig({ key, direction: 'ascending' });
    }
  }, [sortConfig]);

  const renderSortIcon = (column: string | null) => {
    if (sortConfig.key !== column) return null;

    return sortConfig.direction === 'ascending' ? '↑' : '↓';
  };


  const handleSelectRow = (item: waterLevelRequest) => {
    const exists = selectedRows.some((row) => row.idx === item.idx)
    setSelectedRows(exists ? selectedRows.filter((r) => r !== item) : [...selectedRows, item])

  }

  const handleSelectAll = (checked: boolean) => {
    setSelectedRows(checked ? [...list] : [])
  }

  const handleDelete = () => {
    const idxList = selectedRows.map((item) => item.idx);
    onDelete(idxList as number[])
  }

  const handleSync = (item: waterLevelRequest) => {
    setMessage(`수위계 ${item.name} 동기화 완료 (더미)`)
    setIsAlertOpen(true)
  }

  const onDelete = async (idxList: number[]) => {
    try {
      const res = await apiDeleteWaterLevel(idxList)
      if (res.message === "ok") {
        setMessage('수위계가 삭제되었습니다.')
        const filtered = list.filter((item) =>
          !selectedRows.some((sel) => sel.ip === item.ip && sel.port === item.port)
        )
        setList(filtered)
        setIsAlertOpen(true)
        setSelectedRows([])
        mutate();
      }
    } catch (e) {
      console.log(e)
      setMessage('수위계 삭제를 실패하였습니다.')
    }

  }

  return (
    <div className="mt-6">
      <h5 className="font-semibold mb-2">제어반 외부 수위계 목록</h5>
      <ScrollBar className="max-h-[180px]">
        <table className="w-full border text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2">
                <input
                  type="checkbox"
                  checked={selectedRows.length === list.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              {(['name', 'location', 'ip', 'port', 'id', 'password'] as SortableFields[]).map((key) => (
                <th key={key} className="p-2 text-sm  cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort(key)}
                >{key.toUpperCase()}{renderSortIcon(key)}</th>
              ))}

            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => (
              <tr key={`${item.ip}-${item.port}`} className="hover:bg-gray-50">
                <td className="text-center p-2 ">
                  <input
                    type="checkbox"
                    checked={selectedRows.some((r) => r.ip === item.ip && r.port === item.port)}
                    onChange={() => handleSelectRow(item)}
                  />
                </td>
                <td className="text-center p-2">{item.name}</td>
                <td className="text-center p-2">{item.location}</td>
                <td className="text-center p-2">{item.ip}</td>
                <td className="text-center p-2">{item.port}</td>
                <td className="text-center p-2">{item.id}</td>
                <td className="text-center p-2">{item.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollBar>

      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={handleDelete} disabled={selectedRows.length === 0}>삭제</Button>
        <Button
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

export default TunnelWaterLevelGaugeList