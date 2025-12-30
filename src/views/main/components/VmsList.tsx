import { useCallback, useMemo, useState, useEffect } from 'react';
import { ApiResultStatus } from '@/@types/api';
import { ModalConfirmType, ModalType } from '@/@types/modal';
import { VMS } from '@/@types/vms';
import { Button, ScrollBar } from '@/components/ui';
import { apiDeleteObVms, apiSyncObVms } from '@/services/ObserverService';
import { useObVms } from '@/utils/hooks/useObVms';
import Modal from '../modals/ModalConfirm';
import { ServiceType } from '@/@types/common';
import { AxiosError } from 'axios';

type Props = {
  toggleModal: ({ show, title, type }: ModalType, message: string) => void
  setCheckedVms: (array: Array<VMS>) => void;
  onModify: ({ vms_ip, vms_port, vms_id, vms_pw }: FormSchema) => void;
}

type ApiResultStatusWrapper = {
  message: string;
  result: ApiResultStatus;
}

type VMSBodyData = VMS & {
  mainServiceName: ServiceType

}

type FormSchema = {
  vms_ip: string
  vms_port: string
  vms_id: string
  vms_pw: string
}

const buttonStyle = 'w-[100px] h-[32px] rounded-sm flex items-center justify-center border-[#D9DCE3] border-[1px] border-solid';
const tableStyle = 'border-[#D9DCE3] border-b-none border-x-[2px] border-t-[2px] border-solid';
const tableTheadTbodyStyle = 'border-[#D9DCE3] border-b-[1px] border-solid';

export default function VmsList({ toggleModal, setCheckedVms, onModify }: Props) {
  const { isLoading, error, data: vmsList, mutate } = useObVms('origin');
  const [selectedRows, setSelectedRows] = useState<Array<VMS>>([]);
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

  const handleSelectRow = useCallback((vmsInfo: VMS) => {
    setSelectedRows((prev) => {
      const isExist = prev.find((item) => item.vms_name === vmsInfo.vms_name);
      if (isExist) {
        return prev.filter((item) => item.vms_name !== vmsInfo.vms_name)
      } else {
        return [...prev, vmsInfo]
      }
    });
  }, []);

  const handleSynchronizeVms = async (item: VMS) => {
    const vmsData = {
      vms_ip: item.vms_ip,
      vms_port: item.vms_port,
      vms_id: item.vms_id,
      vms_pw: item.vms_pw,
      mainServiceName: 'origin'
    };
    try {
      const result = await apiSyncObVms<ApiResultStatusWrapper>(vmsData as VMSBodyData);
      if (!result || !result.result || !result.result.status) {
        return toggleModal({
          show: true,
          type: 'syncVms',
          title: 'VMS 동기화'
        }, result.result.message);
      }
      return toggleModal({
        show: true,
        type: 'syncVms',
        title: 'VMS 동기화'
      }, result.result.message);
    } catch (error) {
      console.error(error);
      if (error instanceof AxiosError) {
        return toggleModal({
          show: true,
          type: 'syncVms',
          title: 'VMS 동기화'
        }, error.response?.data.message || `에러로 인해 VMS 동기화에 실패했습니다.`);
      }
      toggleModal({
        show: true,
        type: 'syncVms',
        title: 'VMS 동기화'
      }, '에러로 인해 VMS 동기화에 실패했습니다.');
    }
  }

  const toggleModalConfirm = ({ show, title, type }: ModalConfirmType) => {
    setModal({
      show,
      title,
      type
    })
  }

  const handleSelectAll = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(vmsList);
    } else {
      setSelectedRows([]);
    }
  }, [vmsList]);

  const sortedData = useMemo(() => {
    if (!Array.isArray(vmsList)) return [];
    if (!sortConfig.key) return vmsList;

    return [...vmsList].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [vmsList, sortConfig]);

  const handleConfirm = async (type: 'delete' | 'modify' | 'control' | '') => {
    if (type === 'delete') {
      try {
        if (selectedRows.length === 0) {
          return;
        }
        const removeVmsNames = selectedRows.map((row) => row.vms_name);
        const result = await apiDeleteObVms<ApiResultStatusWrapper>(removeVmsNames, 'origin');

        if (result) {
          mutate();
          setSelectedRows([]);
          setConfirmMsg('');
          toggleModal({
            show: true,
            title: 'VMS 삭제',
            type: 'deleteVms'
          }, `VMS ${result.result} 개가 성공적으로 삭제되었습니다.`)
        } else {
          toggleModal({
            show: true,
            title: 'VMS 삭제',
            type: 'deleteVms'
          }, 'VMS 삭제에 실패했습니다..')
        }
        toggleModalConfirm({
          show: false,
          title: '',
          type: ''
        })
      } catch (error) {
        if (error instanceof AxiosError && error.response) {
          toggleModal({
            show: true,
            title: 'VMS 삭제',
            type: 'deleteVms'
          }, `VMS 삭제에 실패했습니다. \n\n ${error.response.data.message}`)
        }
        console.error(error);
      }
    }
  }

  const handleDeleteVms = async () => {
    setConfirmMsg('해당 VMS를 삭제하시겠습니까?');
    setModal({
      show: true,
      title: 'VMS 삭제',
      type: 'delete'
    })
  }

  useEffect(() => {
    setCheckedVms(selectedRows)
  }, [selectedRows, setCheckedVms])

  return (
    <section>
      <h3 className="text-lg font-medium mb-2">VMS 목록</h3>
      <div className='w-[744px] h-[323px]'>
        <ScrollBar className="max-h-[180px]">
          <table className={`w-full min-w-full ${tableStyle}`}>
            <thead className={`${tableTheadTbodyStyle}`}>
              <tr className="bg-gray-50">
                <th className="sticky top-0 bg-gray-50 py-2 px-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={selectedRows.length === vmsList?.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th
                  className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer"
                  onClick={() => handleSort('ipAddress')}
                >
                  <div className="flex items-center justify-center gap-1">
                    IP address
                    {renderSortIcon('ipAddress')}
                  </div>
                </th>
                <th
                  className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer"
                  onClick={() => handleSort('port')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Port
                    {renderSortIcon('port')}
                  </div>
                </th>
                <th
                  className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center justify-center gap-1">
                    ID
                    {renderSortIcon('id')}
                  </div>
                </th>
                <th className="sticky top-0 bg-gray-50 py-2 px-4">Password</th>
                <th className="sticky top-0 bg-gray-50 py-2 px-4">Sync</th>
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
                  <td className="py-2 px-4 text-center">{item.vms_ip}</td>
                  <td className="py-2 px-4 text-center">{item.vms_port}</td>
                  <td className="py-2 px-4 text-center">{item.vms_id}</td>
                  <td className="py-2 px-4 text-center">**********</td>
                  <td className="py-2 px-4 text-center">
                    <button className="p-1" onClick={() => handleSynchronizeVms(item)}>🔄</button>
                  </td>
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
          <Button
            className={`bg-[#17A36F] text-white ${buttonStyle}`}
            disabled={selectedRows.length !== 1}
            onClick={() => onModify(selectedRows[0])}
          >
            수정
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