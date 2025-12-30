import { BroadcastAreaResponse } from '@/@types/broadcast';
import { getDeviceStatus } from '@/services/BroadcastService';
import { useBroadcastStore } from '@/store/broadcast/useBroadcastStore';
import { useBroadcastArea } from '@/utils/hooks/useBroadcast';
import _ from 'lodash';
import React, { useEffect, useState } from 'react';

interface DeviceData {
  status: '전체' | '활성화' | '비활성화';
  camera: number;
  transmitter: number;
  receiver: number;
  power: number;
}

interface Column {
  header: string;
  accessorKey: keyof DeviceData; 
}

const DeviceStatusTable = ({siteId}: {siteId: string[]}) => {
  const [deviceData, setDeviceData] = useState<DeviceData[]>([]);


  useEffect(() => {
    // if (_.isEmpty(siteId)) return;

    const fetchDeviceStatus = async () => {
      try {
        const response = await getDeviceStatus({siteId: siteId[0]});
        
        const data: any = response.result;
        
        const formattedData: DeviceData[] = [
          {
            status: '전체',
            camera: data.camera.total,
            transmitter: data.transmitter.total,
            receiver: data.receiver.total,
            power: data.power.total
          },
          {
            status: '활성화',
            camera: data.camera.active,
            transmitter: data.transmitter.active,
            receiver: data.receiver.active,
            power: data.power.active
          },
          {
            status: '비활성화',
            camera: data.camera.disconnected,
            transmitter: data.transmitter.disconnected,
            receiver: data.receiver.disconnected,
            power: data.power.disconnected
          }
        ];

        setDeviceData(formattedData);
      } catch (error) {
        console.error(error);
      }
    };

    fetchDeviceStatus();
  }, [siteId]);

  const columns: Column[] = [
    { header: '상태', accessorKey: 'status' },
    { header: '카메라', accessorKey: 'camera' },
    { header: '송신기', accessorKey: 'transmitter' },
    { header: '수신기', accessorKey: 'receiver' },
    { header: '전원 장치', accessorKey: 'power' },
  ];

  const getStatusStyles = (status: DeviceData['status']) => {
    switch (status) {
      case '활성화':
        return 'bg-green-100 text-green-600';
      case '비활성화':
        return 'bg-red-100 text-red-600';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="w-full h-full overflow-x-auto">
      <div className="grid grid-cols-5 gap-1 mb-1">
        {columns.map((column) => (
          <div
            key={column.header}
            className="font-semibold text-center py-1 text-sm bg-gray-200 border-b border-gray-300 rounded-t-lg flex items-center justify-center"
          >
            {column.header}
          </div>
        ))}
      </div>
      {deviceData.map((row, index) => (
        <div key={index} className="grid grid-cols-5 gap-1 mb-1">
          {columns.map((column) => (
            <div
              key={column.header}
              className={`text-center py-1 text-sm border border-gray-300 rounded-lg ${getStatusStyles(row.status)} flex items-center justify-center`}
            >
              {row[column.accessorKey]}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default DeviceStatusTable;
