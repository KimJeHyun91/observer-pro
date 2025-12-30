import React, { useCallback, useState } from 'react'
import { ScrollBar, Button } from '@/components/ui'
import { apiDeleteBillboard } from '@/services/TunnelService'
import { billboardRequest } from '@/@types/tunnel';
import { useBillboardStore } from '@/store/tunnel/useBillboardStore'

interface TunnelBillboardListProps {
  list: billboardRequest[]
  setList: (list: billboardRequest[]) => void
  handleEdit: (rows: billboardRequest[]) => void
  setIsEditMode: (flag: boolean) => void
  selectedRows: billboardRequest[]
  setSelectedRows: (rows: billboardRequest[]) => void
  setMessage: (msg: string) => void
  setIsAlertOpen: (flag: boolean) => void
  mutate: () => void
}

type SortableFields = 'ip' | 'port' | 'name' | 'row' | 'col' | 'type';

type SortConfig = {
  key: SortableFields | null;
  direction: 'ascending' | 'descending';
};

const columns: { label: string; field: SortableFields }[] = [
  { label: 'IP', field: 'ip' },
  { label: 'PORT', field: 'port' },
  { label: 'NAME', field: 'name' },
  { label: '단', field: 'row' },
  { label: '열', field: 'col' },
  { label: 'TYPE', field: 'type' },
];

const TunnelBillboardList = ({
  list,
  setList,
  handleEdit,
  setIsEditMode,
  selectedRows,
  setSelectedRows,
  setMessage,
  setIsAlertOpen,
  mutate
}: TunnelBillboardListProps) => {
  const { setIsSettingDelete } = useBillboardStore();

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

  const handleSelectRow = (item: billboardRequest) => {
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

  const handleSync = (item: billboardRequest) => {
    setMessage(`전광판 ${item.name} 동기화 완료 (더미)`)
    setIsAlertOpen(true)
  }

  const onDelete = async (idxList: number[]) => {
    try {
      const res = await apiDeleteBillboard(idxList)
      if (res.message === "ok") {
        setIsSettingDelete(true);
        setMessage('전광판이 삭제되었습니다.')
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
      setMessage('전광판 삭제를 실패하였습니다.')
    }

  }

  return (
    <div className="mt-6">
      <h5 className="font-semibold mb-2">전광판 목록</h5>
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
              {columns.map(({ label, field }) => (
                <th
                  key={field}
                  className="p-2 text-sm cursor-pointer hover:bg-gray-100 select-none"
                  onClick={() => handleSort(field)}
                >
                  {label} {renderSortIcon(field)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => (
              <tr key={`${item.ip}-${item.port}`} className="hover:bg-gray-50">
                <td className="text-center p-2">
                  <input
                    type="checkbox"
                    checked={selectedRows.some((r) => r.ip === item.ip && r.port === item.port)}
                    onChange={() => handleSelectRow(item)}
                  />
                </td>
                <td className="text-center p-2">{item.ip}</td>
                <td className="text-center p-2">{item.port}</td>
                <td className="text-center p-2">{item.name}</td>
                <td className="text-center p-2">{item.row}</td>
                <td className="text-center p-2">{item.col}</td>
                <td className="text-center p-2">{item.type}</td>
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

export default TunnelBillboardList
