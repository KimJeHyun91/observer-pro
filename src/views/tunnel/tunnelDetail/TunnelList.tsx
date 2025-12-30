import { SelectedObject, TunnelOutsideResponse } from '@/@types/tunnel';
import { useTunnelOutside } from '@/utils/hooks/useTunnelArea';
import React, { useEffect, useMemo, useState } from 'react';

type TunnelItem = {
  id: string;
  name: string;
  children: {
    idx: number;
    name: string;
    location: string;
    position: [number, number];
    top_location: number;
    left_location: number;
  }[];
};

interface Props {
  data: any;
  onObjectSelect: (data: SelectedObject) => void;
  setSelectedCameraData: (data: SelectedObject | null) => void;
}

const TunnelList = ({
  data,
  onObjectSelect,
  setSelectedCameraData
}: Props) => {
  const { outsideList, mutate: mutateOutsideList } = useTunnelOutside()
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTunnelId, setSelectedTunnelId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const treeList = useMemo(() => {
    const grouped: Record<string, TunnelItem> = {};

    (outsideList?.result as TunnelOutsideResponse[]).forEach((item) => {
      // 1depth 
      const baseName = item.outside_name.replace(/(상행|하행)$/, '').trim();

      if (!grouped[baseName]) {
        grouped[baseName] = {
          id: baseName,
          name: baseName,
          children: [],
        };
      }

      grouped[baseName].children.push({
        idx: item.idx,
        name: item.direction,
        location: item.location ?? '',
        position: [Number(item.top_location), Number(item.left_location)],
        top_location: Number(item.top_location),
        left_location: Number(item.left_location),
      });
    });

    // 2depth 상행, 하행행
    Object.values(grouped).forEach((group) => {
      group.children.sort((a, b) => {
        if (a.name === '상행') return -1;
        if (b.name === '상행') return 1;
        return 0;
      });
    });


    return Object.values(grouped).filter((tunnel) =>
      tunnel.name.includes(searchKeyword) ||
      tunnel.children.some((child) => child.name.includes(searchKeyword))
    );
  }, [outsideList, searchKeyword]);



  useEffect(() => {
    if (data?.id) {
      setSelectedTunnelId(Number(data.id));
    }
  }, [data]);

  useEffect(() => {
    const allIds = new Set((outsideList?.result as TunnelOutsideResponse[]).map((item) => item.outside_name.replace(/(상행|하행)$/, '').trim()));
    setExpandedIds(allIds);
  }, [outsideList]);

  const handleSelect = () => {
    
    const selected = treeList
      .flatMap((t) => t.children)
      .find((child) => child.idx === selectedTunnelId);
    if (selected) {
      const raw = (outsideList?.result as TunnelOutsideResponse[]).find((item) => item.idx === selected.idx);

      if (raw) {
        onObjectSelect?.({
          ...raw,
          id: raw.idx,
          name: raw.outside_name,
          location: raw.location ?? '',
          position: [selected.top_location, selected.left_location],
          type: 'tunnel',
        });
      }

      setSelectedCameraData(null)
    }

  };

  const toggleExpand = (id) => {
    setExpandedIds((prev) => {
      const copy = new Set(prev);
      copy.has(id) ? copy.delete(id) : copy.add(id);
      return copy;
    });
  };

  return (
    <div className="w-[280px] h-full bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow flex flex-col">
      <div className="p-4 border-b dark:border-gray-700 h-[110px] shrink-0">
        <h4 className="font-bold text-lg mb-3 text-gray-800 dark:text-gray-100">터널 검색</h4>
        <input
          type="text"
          placeholder="터널 이름 검색"
          className="w-full border border-gray-300 dark:border-gray-600 px-3 py-2 text-sm rounded focus:outline-none focus:ring-2 focus:ring-blue-400 dark:bg-gray-700 dark:text-white placeholder:text-gray-400"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />
      </div>

      <div className="scroll-container overflow-y-auto overflow-x-hidden px-3 py-3 scrollbar-hidden" style={{ height: 'calc(100% - 184px)' }}>
        {/* ajy max-h-[571px] 추가 */}
        <ul className="space-y-3 text-base max-h-[571px]">
          {treeList.map((tunnel) => {
            const isExpanded = expandedIds.has(tunnel.id);
            return (
              <li key={tunnel.id}>
                <div
                  onClick={() => toggleExpand(tunnel.id)}
                  className="cursor-pointer font-semibold text-base flex justify-between items-center px-3 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                >
                  <span className="text-gray-800 dark:text-gray-100">{tunnel.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{isExpanded ? '▲' : '▼'}</span>
                </div>

                {isExpanded && (
                  <ul className="ml-4 mt-2 space-y-2">
                    {tunnel.children.map((child) => (
                      <li
                        key={child.idx}
                        onClick={() => setSelectedTunnelId(child.idx)}
                        className={`flex items-center px-3 py-2 rounded cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition ${selectedTunnelId === child.idx ? 'bg-blue-100 dark:bg-blue-900' : ''
                          }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTunnelId === child.idx}
                          onChange={() => setSelectedTunnelId(child.idx)}
                          className="mr-2 accent-blue-600"
                        />
                        <span
                          className={`truncate ${selectedTunnelId === child.idx
                              ? 'font-bold text-blue-600 dark:text-blue-400'
                              : 'text-gray-700 dark:text-gray-300'
                            }`}
                        >
                          {child.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div className="p-3 pt-5 border-t dark:border-gray-700 h-[40px] shrink-0">
        <button
          onClick={handleSelect}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm font-semibold disabled:opacity-50"
          disabled={selectedTunnelId === null}
        >
          확인
        </button>
      </div>
    </div>

  );
};

export default TunnelList;
