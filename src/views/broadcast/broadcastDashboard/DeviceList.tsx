import { BroadcastAreaResponse } from "@/@types/broadcast";
import { useEffect, useState } from "react";
import { MdError } from "react-icons/md";
import ScrollBar from 'simplebar-react';
import 'simplebar-react/dist/simplebar.min.css';

interface TreeNode {
    label: string;
    status?: string;
    type?: string;
    children?: TreeNode[];
}

interface DeviceListProps {
    viewMode: 'device' | 'location';
    areaList: BroadcastAreaResponse[] | undefined;
}

// 샘플 데이터
const locationBasedData = [
    {
        label: '개소 1',
        children: [
            { type: '카메라', label: '카메라', status: 'warning' },
            { type: '스피커', label: '스피커' }
        ],
    },
    {
        label: '개소 2',
        children: [
            {
                label: '1222',
                children: [
                    { type: '카메라', label: '카메라 1' },
                    { type: '스피커', label: '스피커 1' }
                ],
            },
            {
                label: '12222',
                children: [
                    { type: '카메라', label: '카메라 2' },
                    { type: '스피커', label: '스피커 2' }
                ],
            },
        ],
    },
    {
        label: '개소 3',
        children: [
            { type: '카메라', label: '카메라 3', status: 'warning' },
            { type: '스피커', label: '스피커 3' }
        ],
    },
];

export function DeviceList({ viewMode, areaList }: DeviceListProps) {

    const transformData = (result: BroadcastAreaResponse[] ) => {
        const locationMap = new Map();
console.log(result)
        result.forEach(item => {
        
            if (!locationMap.has(item.outside_idx)) {
                locationMap.set(item.outside_idx, {
                    label: item.outside_name,
                    children: []
                });
            }
            
      
            if (item.camera_ip) {
                const status = item.camera_linked_status ? undefined : "warning";
                locationMap.get(item.outside_idx).children.push({
                    type: "카메라",
                    label: `${item.camera_name?.trim()} (카메라)`,
                    ...(status && { status })
                });
            }
            
            if (item.speaker_ip) {
                const status = item.speaker_status === "OFF" ? "warning" : undefined;
                const labelPrefix = item.outside_site_id === null ? item.speaker_ip : item.speaker_name?.trim();
                locationMap.get(item.outside_idx).children.push({
                    type: "스피커",
                    label: `${labelPrefix} (스피커)`,
                    ...(status && { status }),
                });
            }
          
        });
    
        return Array.from(locationMap.values());
    }
    
    const transformedData = areaList && transformData(areaList);

    return (
        <div className="flex flex-col h-full">
            <ScrollBar className="h-full">
                <div className="flex-1 space-y-0.5">
                    <Tree tree={transformedData} viewMode={viewMode} />
                </div>
            </ScrollBar>
        </div>
    );
}

interface TreeProps {
    tree: TreeNode[];
    viewMode: 'device' | 'location';
}

function Tree({ tree, viewMode }: TreeProps) {
    const [toggleState, setToggleState] = useState(new Set());

    // useEffect(() => {
    //     const initialState = new Set(tree.map((_, index) => index));
    //     setToggleState(initialState);
    // }, [tree]);

    useEffect(() => {
        const initialState = new Set();
        const traverseTree = (nodes: TreeNode[], parentKey = "") => {
            nodes?.forEach((node, index) => {
                const key = `${parentKey}-${index}`;
                initialState.add(key); 
                if (node.children) {
                    traverseTree(node.children, key); 
                }
            });
        };
        traverseTree(tree);
        setToggleState(initialState); 
    }, [tree]);

    const toggleItem = (key: string) => {
        setToggleState((prev) => {
            const newState = new Set(prev);
            if (newState.has(key)) newState.delete(key);
            else newState.add(key);
            return newState;
        });
    };

    const transformTree = (nodes: TreeNode[]) => {
        if (viewMode === 'device') {
            const transformedNodes: TreeNode[] = [];
            const typeGroups: Record<string, TreeNode[]> = {};
    
            const addChildToGroup = (node: TreeNode) => {
                const type = node.type || "기타"; 
                if (!typeGroups[type]) {
                    typeGroups[type] = [];
                }
                typeGroups[type].push(node);
            };
    
            nodes.forEach(node => {
                if (node.type) {
                    addChildToGroup(node);
                }
    
                if (node.children) {
                    node.children.forEach(child => {
                        if (child.type) {
                            addChildToGroup(child);
                        } else if (child.children) {
                            child.children.forEach(grandchild => {
                                if (grandchild.type) {
                                    addChildToGroup(grandchild);
                                } else {
                                    addChildToGroup(grandchild);  
                                }
                            });
                        } else {
                            addChildToGroup(child); 
                        }
                    });
                } else {
                    addChildToGroup(node); 
                }
            });
    
            Object.keys(typeGroups).forEach(type => {
                console.log(typeGroups[type])
                transformedNodes.push({
                    label: type,
                    children: typeGroups[type].map(child => ({
                        ...child,
                        label: child.label.replace(' (스피커)', '').replace(' (카메라)', ''),
                    })),
                });
            });
    
            return transformedNodes;
        }
    
        return nodes;
    };
    
    const renderTree = (nodes: TreeNode[], parentKey = "") => {
        return (
            <ul>
                {nodes?.map((node, index) => {
                    const key = `${parentKey}-${index}`;
                    const hasChildren = node.children && node.children.length > 0;
                    const isLeaf = !hasChildren;

                    return (
                        <li key={key} className={`p-1 text-black bg-[#ebecef] dark:bg-gray-600 dark:text-white rounded-lg ${isLeaf ? 'mb-0' : 'mb-2'}`}>
                            <div
                                className={`cursor-pointer flex justify-between items-center p-0 px-2 rounded-md ${hasChildren ? "font-bold py-1" : ""} ${toggleState.has(key) ? isLeaf ? '': "bg-[#FAFBFB] dark:bg-gray-800 dark:border-none border border-gray-300 py-1" : ""}`}
                                onClick={() => hasChildren && toggleItem(key)}
                            >
                                <span className={`${node.status === 'warning' && 'text-red-500'}`}>{node.label}</span>
                                <span>{node.status === 'warning' && <MdError color="#ef4444" size={19} />}</span>
                                {hasChildren && (
                                    <span className="text-[#8D8D8D]">
                                        {toggleState.has(key) ? "▲" : "▼"}
                                    </span>
                                )}
                            </div>
                            {hasChildren && toggleState.has(key) && (
                                <div className="ml-3 pl-2 space-y-0.5">
                                    {renderTree(node.children, key)}
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        );
    };

    return <>{renderTree(transformTree(tree))}</>;
}