import { useState, useEffect, useMemo, useRef } from 'react';
import ParkingDetailParent from './ParkingDetailParent';
import ParkingDetailChild from './ParkingDetailChild';
import { apiOutsideInsideTreeList, apiParkingModifyFloor, apiParkingDeleteInSide, apiParkingAddFloor, apiBuildingImageUpload, apiFloorImageUpload } from '@/services/ParkingService';
import { TreeNode, PreviewImage } from '@/@types/parking';
import { Building } from '@/@types/building';
import { TargetEventPayload } from '@/@types/common';
import { useSocketConnection } from '@/utils/hooks/useSocketConnection';
// import { useDataStatusStore } from '@/store/useDataStatusStore';
import Button from '@/components/ui/Button'
import classNames from 'classnames'
import { ModalType } from '@/@types/modal';
import Modal from '../modals/Modal';
import AddFloor from '@/components/common/AddFloor';
import PreviewUploadImage from '../modals/PreviewUploadImage'
import { useParkingBuildingList, useSelectedNode } from '@/utils/hooks/useParkingArea';
import Upload from '@/components/ui/Upload';
import { useParkingStore } from '@/store/parking/useParkingStore';
import { EventPopup } from '@/@types/event';

type Props = {
    seletedBuilding: Building;
    eventPopup: EventPopup | null;
    clearEventPopup: () => void;
};

type uploadResult = {
    file: File,
    message: 'ok' | 'fail';
}

export default function ParkingDetail({ seletedBuilding, eventPopup, clearEventPopup }: Props) {
    const [isParent, setIsParent] = useState<boolean>(true);
    const [treeData, setTreeData] = useState<TreeNode[]>([]);
    const { selectedNode: selectedHooksNode, setSelectedNode: setSelectedHooksNode, selectedNodeRef } = useSelectedNode();
    const [treeToggleState, setTreeToggleState] = useState<Set<number>>(new Set()); // 토글 상태 저장
    const { socketService } = useSocketConnection();
    // const { service } = useDataStatusStore((state) => state.tabs.parking);
    const modalChildRef = useRef<HTMLDivElement>(null);
    const [modal, setModal] = useState<ModalType>({
        show: false,
        type: '',
        title: ''
    });
    const { data: buildingData, isLoading: isLoadingBuilding, error: errorBuilding } = useParkingBuildingList();
    const [previewImage, setPreviewImage] = useState<PreviewImage | null>(null);
    const setParkingBuildingState = useParkingStore(
        (state) => state.setParkingBuildingState
    );
    const [childImageChange, setChildImageChange] = useState(0);
    const [targetAreaDeleteIdx, setTargetAreaDeleteIdx] = useState<number>(0);
    const [selectBuildingIdx, setSelectBuildingIdx] = useState<number>(0);

    if (isLoadingBuilding) {
        console.log('get pm_buildings loading...');
    };
    if (errorBuilding) {
        console.error('get pm_buildings error: ', errorBuilding);
    }

    useEffect(() => {
        getTreeList();
    }, []);

    const filteredTreeData = () => {
        if (selectedHooksNode?.inside_idx) {
            const count = treeData.filter((item) => item.outside_idx === selectedHooksNode.outside_idx).length;
            return count;
        }
        return 0;
    }

    const getTreeList = async () => {

        try {
            const res = await apiOutsideInsideTreeList<TreeNode>();

            if (!res || !res.result) {
                return;
            }

            setTreeData((prevTreeData) => {
                if (JSON.stringify(prevTreeData) === JSON.stringify(res.result)) {
                    return prevTreeData;
                }
                return res.result;
            });

        } catch (error) {
            console.error('주차관리 트리 API 에러: ', error);
        }
    };

    useEffect(() => {
        if (!socketService) {
            return;
        }

        const parkingSocket = socketService.subscribe('pm_area-update', async (received) => {
            if (received) {
                await getTreeList();
            }
        })

        return () => {
            parkingSocket();
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [socketService])

    const groupedData = useMemo(() => {
        const groups: Record<number, { outside_name: string; items: TreeNode[] }> = {};

        treeData.forEach((item) => {
            if (!groups[item.outside_idx]) {
                groups[item.outside_idx] = { outside_name: item.outside_name, items: [] };
            }

            if (item.inside_name !== null) {
                groups[item.outside_idx].items.push(item);
            }
        });

        return Object.entries(groups).map(([key, value]) => {
            const sortItem = value.items.length
                ? [...value.items].sort((a, b) => {
                    const stepA = parseInt(a.step, 10);
                    const stepB = parseInt(b.step, 10);
                    return stepA - stepB;
                })
                : value.items;

            return {
                outside_idx: parseInt(key, 10),
                outside_name: value.outside_name,
                items: sortItem,
            };
        });
    }, [treeData]);

    const toggleBuilding = (outside_idx: number) => {
        setTreeToggleState((prev) => {
            const newExpanded = new Set(prev);
            if (newExpanded.has(outside_idx)) {
                newExpanded.delete(outside_idx);
            } else {
                newExpanded.add(outside_idx);
            }
            return newExpanded;
        });
    };

    const parentAreaMove = (updatedNode: TreeNode) => {
        setSelectedHooksNode(updatedNode);
        setChildImageChange(0);
        setIsParent(false);

        setTreeToggleState((prev) => {
            const newState = new Set(prev);
            newState.add(updatedNode.outside_idx);
            return newState;
        });
    };

    useEffect(() => {
        if (seletedBuilding && treeData.length > 0) {
            const targetBuilding = treeData.find(
                (item) => item.outside_idx === seletedBuilding.idx
            );
    
            if (targetBuilding) {
                const targetFireEvent= eventPopup
                    ? treeData.find(
                        (item) =>
                            item.outside_idx === eventPopup.outsideIdx &&
                            item.inside_idx === eventPopup.insideIdx
                    )
                    : null;
    
                if (targetFireEvent) {
                    setIsParent(false);
                    setSelectedHooksNode(targetFireEvent);
                } else if (!selectedNodeRef.current) {
                    setIsParent(true);
                    setSelectedHooksNode({
                        outside_idx: targetBuilding.outside_idx,
                        outside_name: targetBuilding.outside_name,
                        inside_idx: targetBuilding.inside_idx,
                        inside_name: targetBuilding.inside_name,
                        step: targetBuilding.step
                    });
                } else {
                    const targetSelectedNode = { ...selectedNodeRef.current } as TreeNode;
    
                    if (targetSelectedNode.inside_idx === targetAreaDeleteIdx) {
                        setIsParent(true);
                        setSelectedHooksNode({
                            outside_idx: targetBuilding.outside_idx,
                            outside_name: targetBuilding.outside_name,
                            inside_idx: targetBuilding.inside_idx,
                            inside_name: targetBuilding.inside_name,
                            step: targetBuilding.step
                        });
                        setChildImageChange(0);
                        return;
                    }
    
                    setSelectedHooksNode(null);
                    setSelectedHooksNode(targetSelectedNode);
                }
    
                setChildImageChange(0);
    
                setTreeToggleState((prev) => {
                    const newState = new Set(prev);
                    newState.add(targetBuilding.outside_idx);
                    return newState;
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [seletedBuilding, treeData, eventPopup]);

    const renderTree = useMemo(() => {
        return groupedData.map((group) => (
            <div key={group.outside_idx} className="p-1 rounded-md bg-[#EBECEF]">
                {/* 건물 이름 */}
                <div
                    className={`cursor-pointer font-bold p-1 flex justify-between items-center text-black ${selectedHooksNode?.outside_idx === group.outside_idx && isParent
                        ? 'bg-[#C0CFF3] border rounded-md'
                        : treeToggleState.has(group.outside_idx)
                            ? 'bg-[#FAFBFB] border rounded-md'
                            : 'bg-[#EBECEF]'
                        }`}
                    onClick={() => {
                        setIsParent(true);
                        setSelectedHooksNode(group.items[0] || {
                            outside_idx: group.outside_idx,
                            outside_name: group.outside_name,
                            inside_idx: null,
                            inside_name: null,
                        });
                        setChildImageChange(0);
                        setSelectBuildingIdx(group.outside_idx);
                    }}
                >
                    <span>{group.outside_name}</span>
                    <span
                        className="text-[#8D8D8D]"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleBuilding(group.outside_idx);
                        }}
                    >
                        {treeToggleState.has(group.outside_idx) ? '▲' : '▼'}
                    </span>
                </div>

                {/* 층 리스트 */}
                {treeToggleState.has(group.outside_idx) && group.items.length > 0 && (
                    <div className="mt-1">
                        {group.items.map((item) => (
                            <div
                                key={item.inside_idx}
                                className={`cursor-pointer font-normal w-full p-1 flex items-center text-black pl-5 ${selectedHooksNode?.inside_idx === item.inside_idx && !isParent
                                    ? 'bg-[#C0CFF3] rounded-md border'
                                    : ''
                                    }`}
                                onClick={() => {
                                    setIsParent(false);
                                    setSelectedHooksNode(item);
                                    setChildImageChange(0);
                                    setSelectBuildingIdx(item.outside_idx);
                                }}
                            >
                                - {item.inside_name}
                            </div>
                        ))}
                    </div>
                )}

                {treeToggleState.has(group.outside_idx) && group.items.length === 0 && (
                    <div className="mt-1 font-normal w-full p-1 rounded-md text-black">
                        층 데이터가 없습니다.
                    </div>
                )}
            </div>
        ));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupedData, selectedHooksNode, isParent, treeToggleState]);

    const setModalChild = (type: string) => {
        switch (type) {
            case 'parkingFloor-add':
                return <AddFloor targetEvent={targetEvent} closeModal={closeModal} buildingData={buildingData} type='parking' selectBuildingIdx={selectBuildingIdx} />
            case 'parking-uploadImageChange':
                return <PreviewUploadImage previewData={previewImage} closeModal={closeModal} onSave={uploadImage} />
            default:
                break;
        }
    }

    const targetEvent = async (payload: TargetEventPayload): Promise<boolean> => {
        try {
            if (payload.action === 'update') {
                const data = {
                    idx: payload.data.floorId,
                    insideName: payload.data.updatedFloorName,
                };

                await apiParkingModifyFloor(data);
            } else if (payload.action === 'add') {
                const data = {
                    insideName: payload.data.inside_name,
                    outsideIdx: payload.data.outside_idx,
                    mapImageUrl: ''
                };

                await apiParkingAddFloor(data);
            } else if (payload.action === 'delete') {
                setTargetAreaDeleteIdx(payload.data.idx)
                await apiParkingDeleteInSide(payload.data.idx);
            }

            return true;
        } catch (error) {
            console.error(`API 요청 실패 (${payload.action}):`, error);
            return false;
        }
    };

    const toggleModal = ({ show, title, type }: ModalType) => {
        setModal({
            show,
            title,
            type
        })
    }

    const closeModal = () => {
        toggleModal({
            show: false,
            type: '',
            title: ''
        })
    }

    const uploadImageChange = (file: File[]) => {
        if (file[0]) {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader.result) {
                    setPreviewImage({
                        path: reader.result.toString(),
                        file: file[0],
                    });
                }
            };
            reader.readAsDataURL(file[0]);
        }

        toggleModal({
            show: true,
            title: isParent ? '건물 이미지 변경' : '층 이미지 변경',
            type: 'parking-uploadImageChange',
        });
    };

    const imageTypeCheck = (fileList: FileList | null): boolean => {
        if (fileList) {
            for (const file of Array.from(fileList)) {
                if (!file.type.startsWith('image/')) {
                    alert('이미지 파일만 업로드할 수 있습니다.');
                    return false;
                }
            }
        }

        return true;
    };

    const uploadImage = async () => {
        if (!selectedHooksNode || !previewImage) {
            return;
        }

        const formData = new FormData();
        formData.append("idx", `${isParent ? selectedHooksNode.outside_idx : selectedHooksNode.inside_idx}`);
        formData.append("mapImageUrl", previewImage.file.name);
        formData.append(isParent ? "pm_buildingplan" : "pm_floorplan", previewImage.file);

        try {
            const res = isParent ? await apiBuildingImageUpload<uploadResult>(formData) : await apiFloorImageUpload<uploadResult>(formData);

            if (!res || res.message !== 'ok') {
                return;
            }

            if (isParent) {
                setParkingBuildingState({
                    buildingIdx: selectedHooksNode.outside_idx,
                    floorIdx: 0,
                    mapImageURL: previewImage.file.name ? `http://${window.location.hostname}:4200/images/pm_buildingplan/${previewImage.file.name}` : null,
                });
            } else {
                setChildImageChange((prev) => prev + 1);
            }

            setPreviewImage(null);
            closeModal();
        } catch (error) {
            console.error('주차관리 이미지 변경 API 에러: ', error);
            return;
        }
    }

    return (
        <div className="flex flex-1 h-screen">
            {/* 왼쪽 사이드바 */}
            <div className="w-64 flex-shrink-0 mb-1">
                <div className='flex flex-col h-full bg-white dark:bg-gray-800 shadow-md rounded-lg p-3'>
                    <span className="font-bold text-black dark:text-white mb-2">주차장 건물</span>
                    <li className="flex justify-between border-solid border-b-2 border-[#B8B8B8]" />

                    <div
                        className={`scroll-container mt-2 pr-1 overflow-y-auto flex-1 basis-0`}>
                        <div className="flex-1 space-y-1">
                            {renderTree}
                        </div>
                    </div>

                    <div className="mt-3 border-t border-gray-200 pt-2">
                        <Button
                            className="mr-2 w-full h-[36px] rounded-md"
                            clickFeedback={false}
                            customColorClass={({ active, unclickable }) =>
                                classNames(
                                    'hover:text-gray-800 dark:hover:bg-gray-600 border-0 hover:ring-0',
                                    active ? 'bg-gray-200' : 'bg-gray-100',
                                    unclickable && 'opacity-50 cursor-not-allowed',
                                    !active && !unclickable && 'hover:bg-gray-200',
                                )
                            }
                            onClick={() => toggleModal({ show: true, title: '주차 층 설정', type: 'parkingFloor-add' })}
                        >
                            주차 층 설정
                        </Button>
                    </div>
                </div>
            </div>

            {/* 오른쪽 박스 */}
            <div className="flex-1 flex flex-col gap-2 ml-3">
                {/* 위쪽 박스 */}
                <div className={`flex-[1] basis-1/20 shadow-md rounded-lg p-4 bg-white dark:bg-[#262626]`}>
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-black dark:text-white">
                            {isParent
                                ? selectedHooksNode?.outside_name || '-'
                                : selectedHooksNode?.outside_name + ' ' + selectedHooksNode?.inside_name || '선택 없음'}
                        </h3>

                        <Upload className='mt-[-1px]' accept="image/*" uploadLimit={1} showList={false} beforeUpload={(fileList) => imageTypeCheck(fileList)} onChange={uploadImageChange}>
                            <Button size='xs'>{isParent ? '건물 이미지 변경' : '층 이미지 변경'}</Button>
                        </Upload>
                    </div>
                    <p className="mt-2">
                        건물 정보 (위치 : 테라타워 / 층수 : {' ' + filteredTreeData()}층)
                    </p>
                </div>

                {/* 아래쪽 박스 */}
                <div className={`flex-[19] basis-19/20 shadow-md rounded-lg p-4 mb-1 flex flex-col bg-white dark:bg-[#262626]`}>
                    {isParent ? (
                        <ParkingDetailParent key={selectedHooksNode?.outside_idx || 'parent'} selectedNode={selectedHooksNode} onAreaMove={parentAreaMove} />
                    ) : (
                        <ParkingDetailChild key={selectedHooksNode?.inside_idx || 'child'} selectedNode={selectedHooksNode} childImageChange={childImageChange} eventPopup={eventPopup} clearEventPopup={clearEventPopup}/>
                    )}
                </div>

                <Modal
                    width={modal.type === 'parkingFloor-add' ? 520 : modal.type === 'parking-uploadImageChange' ? 800 : 520}
                    modal={modal} toggle={toggleModal} modalChildRef={modalChildRef}>
                    <div ref={modalChildRef}>
                        {setModalChild(modal.type)}
                    </div>
                </Modal>
            </div>
        </div>
    );
}