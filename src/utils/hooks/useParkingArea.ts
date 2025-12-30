import useSWR from 'swr';
import { TreeNode } from "@/@types/parking";
import { useRef, useEffect, useState } from "react";

export function useParkingBuildingList() {
  const { data, error, isLoading, mutate } = useSWR(
    {
      key: 'parkingBuilding',
      url: '/parking/getBuildingList',
      method: 'post',
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      refreshInterval: 0,
    }
  );
  return { data, error, isLoading, mutate };
}

export function useParkingAreaList(outsideIdx: number | null, insideIdx: number | null) {
  const shouldFetch = outsideIdx !== null && insideIdx !== null;

  const { data, error, isLoading, mutate } = useSWR(
    shouldFetch
      ? {
          key: `useParkingAreaList-${outsideIdx}-${insideIdx}`,
          url: '/parking/getAreaList',
          method: 'post',
          data: { outsideIdx, insideIdx },
          revalidateOnFocus: false,
          revalidateIfStale: false,
          shouldRetryOnError: false,
          refreshInterval: 0,
        }
      : null
  );

  return { data, error, isLoading, mutate };
}

export function useParkingEventTypeList() {
  const { data: eventTypeList, error, isLoading, mutate } = useSWR(
    {
      key: 'parkingEventType',
      url: '/parking/getEventTypeList',
      method: 'post',
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
      refreshInterval: 0,
    }
  );

  return { eventTypeList, error, isLoading, mutate }
}

export function useSelectedNode() {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const selectedNodeRef = useRef<TreeNode | null>(null);

  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  return { selectedNode, setSelectedNode, selectedNodeRef };
}