import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Dialog, ScrollBar } from '@/components/ui';
import { DialogState } from '@/@types/inundation';
import { CommonAlertDialog } from '../../modals/CommonAlertDialog';
import { useAreaStore } from '@/store/Inundation/useAreaStore';
import { apiGetAllAreaGroup, apiSaveAreaGroup, apiDeleteAreaGroup } from '@/services/InundationService';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';

interface GroupManagerProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface Area {
  idx: string;
  name: string;
  outside_name?: string;
}

interface Group {
  id?: string;
  name: string;
  areas: string[];
}

export function GroupManager({ isOpen, onClose }: GroupManagerProps) {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    type: 'alert',
    title: '',
    message: '',
    onConfirm: undefined,
    onCancel: undefined,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  const { areas } = useAreaStore();
  const { socketService } = useSocketConnection();
  const dialogRef = useRef<((value: boolean) => void) | null>(null);

  const showDialog = useCallback((dialogConfig: Partial<DialogState>) => {
    setDialogState((prev) => ({
      ...prev,
      isOpen: true,
      ...dialogConfig,
    }));
  }, []);

  const closeDialog = useCallback(() => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
    if (dialogRef.current) {
      dialogRef.current(false);
      dialogRef.current = null;
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      const response = await apiGetAllAreaGroup();
      if (Array.isArray(response.result)) {
        setGroups(response.result);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
      showDialog({
        type: 'alert',
        title: '오류',
        message: '그룹 데이터를 불러오는 중 오류가 발생했습니다.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [showDialog]);

  useEffect(() => {
    if (isOpen) {
      fetchGroups();
      setSelectedGroup(null);
      setGroupName('');
      setSelectedAreas([]);
    }
  }, [isOpen, fetchGroups]);

  useEffect(() => {
    if (!socketService) return;

    const unsubscribeGroup = socketService.subscribe('fl_areaGroup-update', (data) => {
      fetchGroups();
    });

    return () => {
      unsubscribeGroup();
    };
  }, [socketService, fetchGroups]);

  const handleAreaSelect = useCallback((areaIdx: string) => {
    setSelectedAreas((prevSelected) => {
      const isSelected = prevSelected.includes(areaIdx);
      const newSelected = isSelected
        ? prevSelected.filter(idx => idx !== areaIdx)
        : [...prevSelected, areaIdx];
      return newSelected;
    });
  }, []);

  const handleGroupDelete = useCallback((groupId: string) => {
    showDialog({
      type: 'confirm',
      title: '그룹 삭제',
      message: '해당 그룹을 삭제하시겠습니까?',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          const response = await apiDeleteAreaGroup({ groupId: groupId });
          if (response.message === 'ok') {
            setGroups(prev => prev.filter(g => g.id !== groupId));
            if (selectedGroup?.id === groupId) {
              setSelectedGroup(null);
              setGroupName('');
              setSelectedAreas([]);
            }
            setDialogState({
              isOpen: true,
              type: 'alert',
              title: '성공',
              message: '그룹이 삭제되었습니다.',
              onConfirm: closeDialog,
            });
          } else {
            throw new Error('서버 응답 오류');
          }
        } catch (error) {
          showDialog({
            type: 'alert',
            title: '오류',
            message: '그룹 삭제 중 오류가 발생했습니다.',
          });
        } finally {
          setIsLoading(false);
        }
      },
      onCancel: closeDialog,
    });
  }, [selectedGroup, showDialog, closeDialog]);

  const handleAreaRemove = useCallback((areaIdx: string) => {
    setSelectedAreas(prev => {
      const updated = prev.filter(idx => idx !== areaIdx);
      return updated;
    });
  }, [selectedAreas]);

  const handleGroupSelect = useCallback((group: Group) => {
    setSelectedGroup(group);
    setGroupName(group.name);

    const ascGroup = group.areas.sort((a, b) => {
			const regex = /^([^\d]*)(\d*)$/;
			const [, textA, numA] = a.outside_name.match(regex) || ["", "", "0"];
			const [, textB, numB] = b.outside_name.match(regex) || ["", "", "0"];

			if (textA !== textB) {
				return textA.localeCompare(textB);
			}

			return parseInt(numA || "0") - parseInt(numB || "0");
		});

    const areaIds = ascGroup.map(area => {
      if (typeof area === 'object' && area.outside_idx) {
        return area.outside_idx;
      } else {
        return area;
      }
    });

    setSelectedAreas(areaIds);
  }, []);

  const handleSave = async () => {
    if (!groupName.trim()) {
      showDialog({ type: 'alert', title: '알림', message: '그룹 이름을 입력해주세요.' });
      return;
    }
    if (selectedAreas.length === 0) {
      showDialog({ type: 'alert', title: '알림', message: '최소 한 개 이상의 개소를 선택해주세요.' });
      return;
    }

    try {
      setIsLoading(true);
      const groupData: Group = {
        name: groupName,
        areas: [...selectedAreas],
        ...(selectedGroup?.id && { id: selectedGroup.id }),
      };

      const response = await apiSaveAreaGroup(groupData);
      if (response.message !== 'ok') {
        throw new Error('서버 응답 오류');
      }

      const updatedGroup = { ...groupData, id: selectedGroup?.id || response.result?.id };
      if (selectedGroup?.id) {
        setGroups(prev => prev.map(g => (g.id === updatedGroup.id ? updatedGroup : g)));
      } else {
        setGroups(prev => [...prev, updatedGroup]);
      }

      setSelectedGroup(null);
      setGroupName('');
      setSelectedAreas([]);
      showDialog({ type: 'alert', title: '성공', message: '그룹이 성공적으로 저장되었습니다.' });
    } catch (error) {
      showDialog({ type: 'alert', title: '오류', message: '그룹 저장 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalClose = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  return (
    <>
      {dialogState.isOpen && (
        <CommonAlertDialog
          isOpen={dialogState.isOpen}
          onClose={closeDialog}
          message={dialogState.message}
          title={dialogState.title}
          type={dialogState.type}
          onConfirm={dialogState.onConfirm}
        />
      )}
      <div className="relative transform translate-y-1/2">
        <ScrollBar>
          {isOpen && (
            <Dialog
              isOpen={isOpen}
              height="700px"
              width="800px"
              className="z-[50]"
              contentClassName="dialog-content-GroupManager"
              onClose={handleModalClose}
            >
              <div className="flex flex-col h-full p-4 bg-white dark:bg-gray-700 rounded-lg" style={{ fontFamily: 'Noto Sans KR, sans-serif' }}>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">그룹</h3>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800" style={{ height: '130px', overflowY: 'auto' }}>
                    {isLoading ? (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">로딩 중...</div>
                    ) : groups.length > 0 ? (
                      groups.map((group) => (
                        <div
                          key={group.id}
                          className="flex items-center justify-between p-2 rounded-md transition-colors hover:bg-gray-200 dark:hover:bg-gray-600"
                        >
                          <div
                            className={`flex-1 cursor-pointer ${selectedGroup?.id === group.id
                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                : 'dark:text-gray-200'
                              }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGroupSelect(group);
                            }}
                          >
                            {group.name}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (group.id) handleGroupDelete(group.id);
                            }}
                            className="text-red-500 hover:text-red-700 transition-colors"
                            disabled={isLoading}
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500 dark:text-gray-400">등록된 그룹이 없습니다.</div>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">개소 목록</h3>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 h-[340px] overflow-y-auto">
                      {isLoading ? (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">로딩 중...</div>
                      ) : areas.length > 0 ? (
                        (() => {
                          const availableAreas = areas.filter((area) => !selectedAreas.includes(area.outside_idx));

                          if (availableAreas.length === 0) {
                            return (
                              <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                모든 개소가 이미 선택되었습니다.
                              </div>
                            );
                          }

                          return availableAreas.map((area) => (
                            <div key={area.outside_idx} className="flex items-center p-2 hover:bg-gray-100 dark:hover:bg-gray-600">
                              <input
                                type="checkbox"
                                id={`area-${area.outside_idx}`}
                                checked={false}
                                onChange={() => handleAreaSelect(area.outside_idx)}
                                className="mr-2 h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
                              />
                              <label htmlFor={`area-${area.outside_idx}`} className="text-gray-600 dark:text-gray-200 cursor-pointer flex-1">
                                {area.outside_name}
                              </label>
                            </div>
                          ));
                        })()
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">등록된 개소가 없습니다.</div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-100">그룹 편집</h3>
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-800 h-[340px] flex flex-col">
                      <div className="mb-3">
                        <input
                          type="text"
                          value={groupName}
                          onChange={(e) => setGroupName(e.target.value)}
                          placeholder="그룹 이름"
                          className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                          disabled={isLoading}
                        />
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {selectedAreas.length > 0 ? (
                          (() => {

                            return selectedAreas.map((selectedArea) => {
                              if (typeof selectedArea === 'number') {
                                const area = areas.find((a) => a.outside_idx === selectedArea);
                                return area ? (
                                  <div key={`selected-${area.outside_idx}`} className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-600">
                                    <span className="text-gray-600 dark:text-gray-200">{area.outside_name || ''}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleAreaRemove(selectedArea)}
                                      className="text-red-500 hover:text-red-700 transition-colors"
                                      disabled={isLoading}
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : null;
                              } else {
                                return null;
                              }
                            }).filter(Boolean);
                          })()
                        ) : (
                          <div className="text-center py-4 text-gray-500 dark:text-gray-400">선택된 개소가 없습니다.</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <Button
                    onClick={handleSave}
                    className="mr-3 w-[100px] h-[34px] bg-[#17A36F] hover:bg-[#138a5b] text-white rounded-md transition-colors"
                    size="sm"
                    variant="solid"
                    disabled={isLoading}
                  >
                    {isLoading ? '저장 중...' : '저장'}
                  </Button>
                  <Button
                    onClick={handleModalClose}
                    className="mr-3 w-[100px] h-[34px] bg-gray-200 dark:bg-gray-600 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    size="sm"
                    variant="solid"
                    disabled={isLoading}
                  >
                    닫기
                  </Button>
                </div>
              </div>
            </Dialog>
          )}
        </ScrollBar>
      </div>
    </>
  );
}
