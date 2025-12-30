import { useCallback, useMemo, useState, useEffect } from 'react';
import { AxiosError } from 'axios';
import { ModalConfirmType, ModalType } from '@/@types/modal';
import { Button, ScrollBar } from '@/components/ui';
import { apiRemoveCamera } from '@/services/ObserverService';
import Modal from '../modals/ModalConfirm';
import { ServiceType } from '@/@types/common';
import { CameraIndependent } from '@/@types/camera';
import { useIndependentCameras } from '@/utils/hooks/useCameras';

type Props = {
  toggleModal: ({ show, title, type }: ModalType, message: string) => void
  setCheckedCamera: (array: Array<CameraIndependent>) => void;
  mainServiceName: ServiceType;
  onModify: ({ idx, camera_ip, camera_name, access_point }: CameraIndependent) => void;
  resetForm: () => void;
  updateForm: Date;
}

type ApiResult = 'No Content' | 'Bad Request' | 'Internal Server Error';

const buttonStyle = 'w-[100px] h-[32px] rounded-sm flex items-center justify-center border-[#D9DCE3] border-[1px] border-solid';
const tableStyle = 'border-[#D9DCE3] border-b-none border-x-[2px] border-t-[2px] border-solid';
const tableTheadTbodyStyle = 'border-[#D9DCE3] border-b-[1px] border-solid';

const getProfileTokenLabel = (profileTokens: string, profileToken: string) => {
  if (!profileTokens) {
    return null;
  };
  const profileTokensAndNames = profileTokens.split(',').map((token) => {
    const [value, label] = token.split(':');
    return { value, label };
  });
  if (!profileToken) {
    return profileTokensAndNames[0].label;
  }
  return profileTokensAndNames.find((tokenAndName) => tokenAndName.value === profileToken)?.label;
}

export default function CameraUndependentList({
  toggleModal,
  setCheckedCamera,
  onModify,
  mainServiceName,
  resetForm,
  updateForm
}: Props) {
  const { isLoading, error, cameras, mutate } = useIndependentCameras('origin');
  const [selectedRows, setSelectedRows] = useState<Array<CameraIndependent>>([]);
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

  const handleSelectRow = useCallback((cameraInfo: CameraIndependent) => {
    setSelectedRows((prev) => {
      const isExist = prev.find((item) => item.idx === cameraInfo.idx);
      if (isExist) {
        return prev.filter((item) => item.idx !== cameraInfo.idx)
      } else {
        return [...prev, cameraInfo];
      }
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
      setSelectedRows(cameras);
    } else {
      setSelectedRows([]);
    }
  }, [cameras]);

  const sortedData = useMemo(() => {
    if (!Array.isArray(cameras)) return [];
    if (!sortConfig.key) return cameras;

    return [...cameras].sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  }, [cameras, sortConfig]);

  const handleConfirm = async (type: 'delete' | 'modify' | 'control' | '') => {
    if (type === 'delete') {
      try {
        if (selectedRows.length === 0) {
          return;
        }
        const removeCameras = selectedRows.map((row) => row.idx);
        const result = await apiRemoveCamera<ApiResult>({
          idxs: removeCameras,
          mainServiceName
        });
        if (result) {
          toggleModal({
            show: true,
            title: '카메라 삭제',
            type: 'deleteCamera'
          }, '카메라 삭제에 실패했습니다..')
        } else {
          mutate();
          resetForm();
          setSelectedRows([]);
          setConfirmMsg('');
          toggleModal({
            show: true,
            title: '카메라 삭제',
            type: 'deleteCamera'
          }, `카메라 ${selectedRows.length}개가 성공적으로 삭제되었습니다.`);
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
            title: '카메라 삭제',
            type: 'deleteCamera'
          }, `카메라 삭제에 실패했습니다. \n\n ${error.response.data.message}`)
        }
        console.error(error);
      };
    };
  };

  const handleDeleteCamera = async () => {
    setConfirmMsg('해당 카메라를 삭제하시겠습니까?');
    setModal({
      show: true,
      title: '카메라 삭제',
      type: 'delete'
    })
  }

  useEffect(() => {
    setCheckedCamera(selectedRows);
  }, [selectedRows, setCheckedCamera]);

  useEffect(() => {
    setSelectedRows([]);
  }, [updateForm]);
  return (
    <section className='mt-3'>
      <h3 className="text-lg font-medium mb-2">카메라 목록</h3>
      <div className='w-[46.5rem] h-1/3'>
        <ScrollBar className="max-h-[180px]">
          <table className={`w-full min-w-full ${tableStyle}`}>
            <thead className={`${tableTheadTbodyStyle}`}>
              <tr className="bg-gray-50">
                <th className="sticky top-0 bg-gray-50 py-2 px-4">
                  <input
                    type="checkbox"
                    className="w-4 h-4"
                    checked={selectedRows.length === cameras?.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th
                  className="sticky top-0 bg-gray-50 py-2 px-4 cursor-pointer"
                  onClick={() => handleSort('ipAddress')}
                >
                  <div className="flex items-center justify-center gap-1">
                    IP 주소
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
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center justify-center gap-1">
                    ID
                    {renderSortIcon('id')}
                  </div>
                </th>
                <th className="sticky top-0 bg-gray-50 py-2 px-4">Password</th>
                <th className="sticky top-0 bg-gray-50 py-2 px-4">영상 프로파일</th>
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
                  <td className="py-2 px-4 text-center">{item.camera_ip}</td>
                  <td className="py-2 px-4 text-center">{item.camera_name}</td>
                  <td className="py-2 px-4 text-center">{item.access_point.split('\n')[0]}</td>
                  <td className="py-2 px-4 text-center">********</td>
                  <td className="py-2 px-4 text-center">
                    {
                      getProfileTokenLabel(item.access_point.split('\n')[2], item.access_point.split('\n')[3])
                    }
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
            onClick={handleDeleteCamera}
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