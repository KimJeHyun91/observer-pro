import { useCallback, useMemo, useState } from 'react';
import { ApiResultStatus } from '@/@types/api';
import { ModalConfirmType, ModalType } from '@/@types/modal';
import { Button, ScrollBar } from '@/components/ui';
import { apiRemovePIDS } from '@/services/ObserverService';
import Modal from '../modals/ModalConfirm';
import { AxiosError } from 'axios';
import { usePIDSRoot } from '@/utils/hooks/main/usePIDSRoot';

type Props = {
  toggleModal: ({ show, title, type }: ModalType, message: string) => void
}

type ApiResultStatusWrapper = {
  message: string;
  result: ApiResultStatus;
};

type PIDS = {
  idx: number;
};

const buttonStyle = 'w-[100px] h-[32px] rounded-sm flex items-center justify-center border-[#D9DCE3] border-[1px] border-solid';
const tableStyle = 'border-[#D9DCE3] border-b-none border-x-[2px] border-t-[2px] border-solid';
const tableTheadTbodyStyle = 'border-[#D9DCE3] border-b-[1px] border-solid';

export default function PIDSList({ toggleModal }: Props) {
  const { isLoading, error, pidsRootList, mutate } = usePIDSRoot();
  const [selectedRows, setSelectedRows] = useState<Array<PIDS>>([]);
  const [sortConfig, setSortConfig] = useState({
    key: '',
    direction: 'ascending'
  });
  const [confirmMsg, setConfirmMsg] = useState('');
  const [modal, setModal] = useState<ModalConfirmType>({
    show: false,
    title: '',
    type: ''
  });

  if (isLoading) {
    console.log('get vms list loading...');
  };
  if (error) {
    console.error('get vms list error: ', error);
  }
  const renderSortIcon = (column: string) => {
    if (sortConfig.key !== column) {
      return <span className="text-gray-400">↑</span>;
    }
    return sortConfig.direction === 'ascending'
      ? <span>↑</span>
      : <span>↓</span>;
  };

  const handleSort = (key: string) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectRow = useCallback((PIDS: PIDS) => {
    setSelectedRows((prev) => {
      const isExist = prev.find((item) => item.idx === PIDS.idx);
      if (isExist) {
        return prev.filter((item) => item.idx !== PIDS.idx);
      } else {
        return [...prev, PIDS];
      };
    });
  }, []);

  const toggleModalConfirm = ({ show, title, type }: ModalConfirmType) => {
    setModal({
      show,
      title,
      type
    })
  }

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(pidsRootList);
    } else {
      setSelectedRows([]);
    }
  }, [pidsRootList]);

  const sortedData = useMemo(() => {
    if (!Array.isArray(pidsRootList)) return [];
    if (!sortConfig.key) return pidsRootList;

    return [...pidsRootList].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [pidsRootList, sortConfig]);

  const handleConfirm = async () => {
    try {
      if (selectedRows.length === 0) {
        return;
      };
      const removedCount = selectedRows.length;
      const result = await apiRemovePIDS<ApiResultStatusWrapper>({ idxs: selectedRows.map((row) => row.idx) });
      if (result) {
        toggleModal({
          show: true,
          title: 'PIDS 삭제',
          type: 'deletePIDS'
        }, 'PIDS 삭제에 실패했습니다..')
      };
      mutate();
      setSelectedRows([]);
      setConfirmMsg('');
      toggleModal({
        show: true,
        title: 'PIDS 삭제',
        type: 'deletePIDS'
      }, `PIDS ${removedCount} 개가 성공적으로 삭제되었습니다.`)
      toggleModalConfirm({
        show: false,
        title: '',
        type: ''
      });
    } catch (error) {
      if (error instanceof AxiosError && error.response) {
        toggleModal({
          show: true,
          title: 'PIDS 삭제',
          type: 'deletePIDS'
        }, `PIDS 삭제에 실패했습니다. \n\n ${error.response.data.message}`)
      };
      console.error(error);
    };
  };

  const handleDeleteVms = async () => {
    setConfirmMsg('해당 PIDS를 삭제하시겠습니까?');
    setModal({
      show: true,
      title: 'PIDS 삭제',
      type: 'delete'
    });
  };

  return (
    <section>
      <h3 className="text-lg font-medium mb-2">PIDS 목록</h3>
      <div className='w-[744px] h-[323px]'>
        <ScrollBar className="max-h-[180px]">
          <table className={`w-full min-w-full ${tableStyle}`}>
            <thead className={`${tableTheadTbodyStyle}`}>
              <tr className="bg-gray-50">
                <th className="sticky top-0 bg-gray-50 py-2 px-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={selectedRows.length === pidsRootList?.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th
                  className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer"
                  onClick={() => handleSort('ipAddress')}
                >
                  <div className="flex items-center justify-center gap-1">
                    IP주소
                    {renderSortIcon('ipAddress')}
                  </div>
                </th>
                <th
                  className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center justify-center gap-1">
                    이름
                    {renderSortIcon('name')}
                  </div>
                </th>
                <th
                  className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer"
                  onClick={() => handleSort('location')}
                >
                  <div className="flex items-center justify-center gap-1">
                    위치
                    {renderSortIcon('location')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className={`scroll-container overflow-y-auto`}>
              {sortedData.map((item) => (
                <tr key={item.idx} className="hover:bg-gray-50">
                  <td className="py-2 px-4 text-center">
                    <input
                      type="checkbox"
                      className="w-4 h-4"
                      checked={selectedRows.includes((item))}
                      onChange={() => handleSelectRow(item)}
                    />
                  </td>
                  <td className="py-2 px-4 text-center">{item.device_ip}</td>
                  <td className="py-2 px-4 text-center">{item.device_name}</td>
                  <td className="py-2 px-4 text-center">{item.device_location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollBar>
        <div className={`flex justify-end gap-2 p-2 border-x-[2px] border-b-[2px] border-t-[1px]`}>
          <Button
            color="warning"
            className={`bg-[#EDF0F6] text-[#696C72] ${buttonStyle}`}
            disabled={selectedRows.length === 0}
            onClick={handleDeleteVms}
          >
            삭제
          </Button>
        </div>
      </div>
      <Modal
        modal={modal}
        toggle={toggleModalConfirm}
        confirm={handleConfirm}
      >
        <p>{confirmMsg}</p>
      </Modal>
    </section >
  );
}