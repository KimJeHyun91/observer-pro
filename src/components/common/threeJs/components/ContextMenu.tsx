import { 
    ThreedDeviceMappingMixInfo 
} from "@/@types/threeD";

type ContextMenuProps = {
    data: {
        visible: boolean;
        x: number;
        y: number;
        clickedDevice: ThreedDeviceMappingMixInfo | null;
    };
    rightClickedGroupName: string | null;
    onDeleteDevice: () => void;
    onNavigateModel: () => void;
    onAdd: (type: '장비 등록') => void
    onOpenFloorList: (groupName: string) => void
}

export default function ContextMenu({ data, rightClickedGroupName, onDeleteDevice, onNavigateModel, onAdd, onOpenFloorList }: ContextMenuProps) {
    if (!data.visible) return null;

    return (
        <div
            id='3d-context-menu'
            className="absolute bg-white border border-gray-300 rounded-md shadow-lg z-[1000] flex flex-col p-1 text-black"
            style={{ top: data.y, left: data.x }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* 등록 메뉴 */}
            {!data.clickedDevice && (
                <>
                    <button
                        className="px-4 py-2 hover:bg-gray-200 whitespace-nowrap"
                        onClick={() => onAdd('장비 등록')} 
                    >
                        장비 등록
                    </button>
                    {rightClickedGroupName && (
                        <button
                            className={`px-4 py-2 whitespace-nowrap rounded-sm hover:bg-gray-200`}
                            onClick={() => onOpenFloorList(rightClickedGroupName)}
                        >
                            층 목록
                        </button>
                    )}
                </>
            )}

            {/* 삭제/좌표/이동 */}
            {data.clickedDevice && (
                <>
                    {data.clickedDevice.linked_model_id && (
                        <button
                            className="px-4 py-2 hover:bg-gray-200 whitespace-nowrap"
                            onClick={onNavigateModel}
                        >
                            모델로 이동
                        </button>
                    )}
                    <button
                        className="px-4 py-2 hover:bg-gray-200 whitespace-nowrap"
                        onClick={onDeleteDevice}
                    >
                        장비 삭제
                    </button>
                </>
            )}
        </div>
    );
}