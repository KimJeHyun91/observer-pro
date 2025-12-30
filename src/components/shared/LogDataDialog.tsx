import React, { useState, useEffect, ReactNode } from 'react';
import { Button, Dialog, Spinner } from '../ui';
import { FormProvider, useForm } from 'react-hook-form';
import { CSVLink } from "react-csv";
import { FaRegCirclePlay } from "react-icons/fa6";
import { HiOutlineClipboardList } from "react-icons/hi";
import BroadcastLogDataHeader from '@/views/broadcast/logData/BroadcastLogDataHeader';
import ParkingLogDataHeader from '@/views/parking/logData/ParkingLogDataHeader';
import { MdOutlineFileDownload } from "react-icons/md";
import { useReactTable, getCoreRowModel, getPaginationRowModel, flexRender, ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import InundationLogDataHeader from '@/views/inundation/logData/InundationLogDataHeader';
import { getBroadcastLogList, getEventLogList } from '@/services/BroadcastService';
import { apiGetEventList, apiGetOperationLogList } from '@/services/InundationService';
import { apiParkingEventLogSearchList } from '@/services/ParkingService';
import dayjs from 'dayjs';
import { BroadcastLogData } from '@/@types/broadcast';
import _ from 'lodash';
import { useBroadcastStore } from '@/store/broadcast/useBroadcastStore';
import { Tooltip } from '../ui/Tooltip';
import MainLogDataHeader from '@/views/main/components/log/MainLogDataHeader';
import { apiSearchAccessCtlLog, apiSearchEvents, apiSearchEventsSOP } from '@/services/ObserverService';
import CustomModal from '@/views/main/modals/CustomModal';
import ArchiveVideo from '@/views/main/components/ArchiveVideo';
import ConfirmSOPProcess from '@/views/main/components/ConfirmSOPProcess';
import ConfirmSOPFalseAlarm from '@/views/main/components/ConfirmSOPFalseAlarm';
import TunnelLogDataHeader from '@/views/tunnel/logData/TunnelLogDataHeader'
import { apiTunnelGetEventList } from '@/services/TunnelService'

interface LogDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  serviceType: string;
  width?: number;
  height?: string;
};

type ColumnValue<T> =
  | string
  | {
    header: string;
    cell: (info: unknown) => React.ReactNode;
  };

type ServiceType = "origin" | "broadcast" | "parking" | "inundation";

type BroadcastFormData = {
  id: string;
  type: string;
  method: string;
  locations: number;
  result: string;
  broadcastDate: {
    startDate: string;
    endDate: string;
  };
  startTime: string;
  endTime: string;
  manager: string;
};

type ParkingFormData = {
  id: string;
  event_name?: string;
  eventType?: string;
  device_type?: string;
  device_name?: string;
  device_ip?: string;
  location?: string;
  eventDate?: string;
  eventTime?: string;
  carNumber?: string;
  buildingName?: string;
  floor?: string;
  parkingSpot?: string;
  carType?: string;
  entryDate?: string;
  entryTime?: string;
  event_occurrence_time?: string;
  device_no16?: string;
};

type MainFormData = {
  eventName: string;
  severityId: string;
  occurDate: string;
  occurTime: string;
  location: string;
  deviceType: string;
  deviceName: string;
  deviceIp: string;
  isAck: string;
  ackUser: string;
  ackDate: string;
  ackTime: string;
  sopIdx: string;
  cameraId: ReactNode | string;
};

type MainFormSOPData = {
  eventName: string;
  falseAlarmIdx: number;
  location: string;
  occurDate: string;
  occurTime: string;
  ackUser: string;
  ackDate: string;
  ackTime: string;
  isClearSOPStage: number;
  cameraId: ReactNode | string;
};

type MainFormAccessLogData = {
  logStatusName: string;
  logPersonLastName: string;
  logTitleName: string;
  logDoorName: string;
  logDate: string;
  logTime: string;
  cameraId: ReactNode | string;
};

type InundationFormData = {
  id: number;
  type: string;
  device: string;
  content: string;
  location: string;
  startTime: string;
  endTime: string;
  manager: string;
};

type TunnelFormData = {
  id: number;
  type: string;
  device: string;
  content: string;
  location: string;
  startTime: string;
  endTime: string;
  manager: string;
};

type FormDataType = BroadcastFormData | ParkingFormData | MainFormData | InundationFormData | MainFormSOPData | MainFormAccessLogData | TunnelFormData;

type OpenDialog = {
  show: boolean;
  title: string;
  type: 'archive' | 'SOP' | 'SOP-false' | '';
  width: number;
  height: number;
  params: string;
  rewind?: number;
  close: () => void;
};

type AccessLogData = {
  LogStatusName: string;
  LogPersonLastName: string;
  LogTitleName: string;
  LogDoorName: string;
  LogDate: string;
  LogTime: string;
  camera_id: string | null;
}

const LogDataDialog = ({ isOpen, onClose, serviceType, width }: LogDataDialogProps) => {
  const methods = useForm();
  const { handleSubmit, control, reset } = methods;
  const [selectedLog, setSelectedLog] = useState<string>('');
  const [tableColumns, setTableColumns] = useState<ColumnDef<FormDataType>[]>([]);
  const [tableData, setTableData] = useState<FormDataType[]>([]);
  const [tabList, setTabList] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [openDialog, setOpenDialog] = useState<OpenDialog>({
    show: false,
    title: '',
    type: '',
    width: 0,
    height: 0,
    params: '',
    close: () => { }
  });
  const { siteId } = useBroadcastStore();

  const columnHelper = createColumnHelper();

  const closeOpenDialog = () => {
    setOpenDialog({
      show: false,
      title: '',
      type: '',
      width: 0,
      height: 0,
      params: '',
      close: () => { }
    });
  };

  const showOpenDialog = ({ title, type, width, height, params, rewind }: { title: string, type: 'archive' | 'SOP' | 'SOP-false' | '', width: number, height: number, params: string, rewind?: number }) => {
    setOpenDialog({
      show: true,
      title,
      type,
      width,
      height,
      params,
      rewind,
      close: closeOpenDialog
    });
  };

  const broadcastColumn = {
    id: "번호",
    type: "방송타입",
    locations: "방송 송출 개소",
    result: "송출 결과",
    date: "방송 날짜",
    startTime: "방송 시작시간",
    endTime: "방송 종료시간",
    manager: "송출/예약 관리자",
  };
  const broadcastEventColumn = {
    id: "번호",
    type: "이벤트 종류",
    name: "이벤트 이름",
    startTime: "이벤트 업로드 시간",
  };
  const inundationColumns = {
    id: "번호",
    type: "이벤트종류",
    content: "내용",
    location: "위치",
    startTime: "발생시간",
    severity: "심각도",
  };
  const tunnelColumns = {
    type: "이벤트종류",
    deviceType: '장치종류',
    deviceName: "장치 이름",
    content: "내용",
    location: "위치",
    startTime: "발생시간",
    severity: "심각도",
  };
  const operationLogColumns = {
    id: "번호",
    logType: "작업 종류",
    description: "작업 내용",
    operator: "작업자",
    dateTime: "이벤트 시간",
    ip: "요청 IP",
  };

  const mainEventColumn = {
    eventName: "이벤트명",
    severityId: "중요도",
    occurDate: "발생 날짜",
    occurTime: "발생 시간",
    location: "발생 위치",
    deviceType: "장치 종류",
    deviceName: "장치 이름",
    deviceIp: "장치 IP 주소",
    isAck: "확인 여부",
    ackUser: "확인자",
    ackDate: "확인 날짜",
    ackTime: "확인 시간",
    sopIdx: {
      header: "SOP",
      cell: ({ getValue }: { getValue: () => string }) => {
        const value = getValue();
        return value ? '설정' : '미설정';
      },
    },
    cameraId: {
      header: "영상",
      cell: ({ row, getValue }) => {
        const value = getValue();
        if (!value || !value.split(':')[1]) {
          return <FaRegCirclePlay color="gray" />;
        }
        let startDateTime = '';
        let occurDateTime = '';
        if (row.original.occurDate && row.original.occurTime) {
          startDateTime = `${row.original.occurDate.replaceAll('-', '')}T${row.original.occurTime.replaceAll(':', '')}`;
          occurDateTime = `${row.original.occurDate} ${row.original.occurTime}`;
        }
        const location = row.original.location;
        const eventName = row.original.eventName;
        return value ? <FaRegCirclePlay color="green" className='cursor-pointer' onClick={() => showOpenDialog({ title: '영상 다시보기', type: 'archive', width: 680, height: 620, params: `${value}/${startDateTime}/${eventName}&${location}&${occurDateTime}` })} /> : <FaRegCirclePlay color="gray" />;
      },
    },
  };

  const mainSOPColumn = {
    eventName: "이벤트명",
    falseAlarmIdx: {
      header: "정/오탐",
      cell: ({ getValue }: { getValue: () => string }) => {
        const value = getValue();
        return value ? '오탐' : '정탐';
      },
    },
    location: "발생 위치",
    occurDate: "발생 날짜",
    occurTime: "발생 시간",
    ackUser: "확인 관리자",
    ackDate: "확인 날짜",
    ackTime: "확인 시간",
    isClearSOPStage: {
      header: "처리 로그",
      cell: ({ getValue, row }) => {
        const value = getValue();
        const sopIdx = row.original.sopIdx;
        const isFalseAlarm = row.original.falseAlarmIdx;
        const eventIdx = row.original.eventIdx;
        return (isFalseAlarm == null && value !== '') ? (
          <div
            className='flex justify-center items-center bg-[#DCE0EA] border-[#BEC4D2] border-[1px] border-solid rounded-[3px] w-[1.875rem] h-[1.5rem]'
            onClick={() => showOpenDialog({ title: 'SOP 이벤트 처리 로그', type: 'SOP', width: 626, height: 390, params: `${sopIdx}/${value}/${eventIdx}` })}
          >
            <HiOutlineClipboardList color="#716E6E" className='cursor-pointer' size={20} />
          </div>
        ) : isFalseAlarm != null && (
          <div
            className='flex justify-center items-center bg-[#DCE0EA] border-[#BEC4D2] border-[1px] border-solid rounded-[3px] w-[1.875rem] h-[1.5rem]'
            onClick={() => showOpenDialog({ title: 'SOP 이벤트 오탐 사유 확인', type: 'SOP-false', width: 626, height: 390, params: `${isFalseAlarm}/${eventIdx}` })}
          >
            <HiOutlineClipboardList color="#716E6E" className='cursor-pointer' size={20} />
          </div>
        );
      }
    },
    cameraId: {
      header: "영상",
      cell: ({ row, getValue }) => {
        const value = getValue();
        if (!value || !value.split(':')[1]) {
          return <FaRegCirclePlay color="gray" />;
        }
        const startDateTime = `${row.original.occurDate.replaceAll('-', '')}T${row.original.occurTime.replaceAll(':', '')}`;
        const occurDateTime = `${row.original.occurDate} ${row.original.occurTime}`;
        const location = row.original.location;
        const eventName = row.original.eventName;
        return value ? <FaRegCirclePlay color="green" className='cursor-pointer' onClick={() => showOpenDialog({ title: '영상 다시보기', type: 'archive', width: 680, height: 620, params: `${value}/${startDateTime}/${eventName}&${location}&${occurDateTime}` })} /> : <FaRegCirclePlay color="gray" />;
      },
    },
  };

  const mainAccessLogColumn = {
    logStatusName: "종류",
    logPersonLastName: "출입자",
    logTitleName: "직급",
    logDoorName: "출입문 이름",
    logDate: "출입 날짜",
    logTime: "출입 시간",
    cameraId: {
      header: "영상",
      cell: ({ row, getValue }) => {
        const value = getValue();
        if (!value || !value.split(':')[1]) {
          return <FaRegCirclePlay color="gray" />;
        }
        const startDateTime = `${row.original.logDate.replaceAll('-', '')}T${row.original.logTime.replaceAll(':', '')}`;
        const occurDateTime = `${row.original.logDate} ${row.original.logTime}`;
        const personName = row.original.logPersonLastName;
        const location = row.original.logDoorName;
        const eventName = row.original.logStatusName;
        const title = personName ? `${eventName}(${personName})` : eventName;
        return <FaRegCirclePlay color="green" className='cursor-pointer' onClick={() => showOpenDialog({ title: '영상 다시보기', type: 'archive', width: 680, height: 620, params: `${value}/${startDateTime}/${title}&${location}&${occurDateTime}`, rewind: 3 })} />
      },
    },
  };

  const parkingEventLogColumns = {
    id: "번호",
    eventName: "이벤트 이름",
    deviceType: "장치 종류",
    deviceName: "장치 이름",
    deviceIP: "장치 IP 주소",
    location: "위치",
    eventDate: "발생 날짜",
    eventTime: "발생 시간",
  };

  const parkinginoutLogColumns = {
    id: "번호",
    eventType: "이벤트 명",
    carNumber: "차량 번호",
    buildingName: "건물 명",
    floor: "층",
    parkingSpot: "주차 위치",
    carType: "면 타입",
    entryDate: "출입 날짜",
    entryTime: "출입 시간",
  };

  useEffect(() => {
    if (isOpen) {
      setTableData([]);
      setTabList([]);
      handleSearch(methods.getValues());

      if (serviceType === "broadcast") {
        setSelectedLog("방송 로그");
        setTabList(["방송 로그", "이벤트 로그"]);
      } else if (serviceType === "parking") {
        setSelectedLog("이벤트");
        setTabList(["이벤트", "차량 출입기록"]);
      } else if (serviceType === "inundation") {
        setSelectedLog("이벤트");
        setTabList(["이벤트", "관리 로그"]);
      } else if (serviceType === "tunnel") {
        setSelectedLog("이벤트");
        setTabList(["이벤트"]);
      } else if (serviceType === "origin") {
        setSelectedLog("이벤트");
        setTabList(["이벤트", "SOP 이벤트", "출입 기록"]);
      }

    }
    return () => {
      setSelectedLog('');
    }
  }, [serviceType, isOpen]);



  useEffect(() => {
    handleSearch(methods.getValues());
    if (isOpen && selectedLog !== '') {
      setTableColumns(getColumns(serviceType as ServiceType, selectedLog));
    }

  }, [selectedLog, isOpen]);

  let headerComponent = null;
  if (serviceType === 'broadcast') {
    headerComponent = <BroadcastLogDataHeader selectedLog={selectedLog} />;
  } else if (serviceType === 'inundation') {
    headerComponent = <InundationLogDataHeader control={control} selectedLog={selectedLog} />;
  } else if (serviceType === 'parking') {
    headerComponent = <ParkingLogDataHeader selectedLog={selectedLog} />;
  } else if (serviceType === 'origin') {
    headerComponent = <MainLogDataHeader selectedLog={selectedLog} />;
  } else if (serviceType === 'tunnel') {
    headerComponent = <TunnelLogDataHeader selectedLog={selectedLog} />;
  }

  // const createColumns = (columns: Record<string, string>) => {
  //   return Object.entries(columns).map(([key, header]) => columnHelper.accessor(key, { header }));
  // };

  const createColumns = <T extends object>(
    columns: Record<keyof T, ColumnValue>
  ): ColumnDef<T, unknown>[] => {
    return Object.entries(columns).map(([key, value]) => {
      if (typeof value === "object" && value !== null && "header" in value) {
        // 고급 컬럼: header + cell
        return columnHelper.accessor(key as keyof T, {
          header: value.header,
          cell: value.cell,
        });
      } else {
        // 기본 컬럼: header만
        return columnHelper.accessor(key as keyof T, {
          header: value as string,
        });
      }
    });
  };

  const columns = {
    broadcast: {
      "방송 로그": createColumns(broadcastColumn),
      "이벤트 로그": createColumns(broadcastEventColumn),
    },
    parking: {
      "이벤트": createColumns(parkingEventLogColumns),
      "차량 출입기록": createColumns(parkinginoutLogColumns),
    },
    inundation: {
      "이벤트": createColumns(inundationColumns),
      "관리 로그": createColumns(operationLogColumns),
    },
    tunnel: {
      "이벤트": createColumns(tunnelColumns),
    },
    origin: {
      "이벤트": createColumns(mainEventColumn),
      "SOP 이벤트": createColumns(mainSOPColumn),
      "출입 기록": createColumns(mainAccessLogColumn)
    },
  };

  const getColumns = (serviceType: ServiceType, selectedLog: string) => {
    return columns[serviceType]?.[selectedLog as keyof typeof columns[typeof serviceType]] || [];
  };

  const csvHeader = (columns: ColumnDef<FormDataType>[]) => {
    return columns.map((col) => ({
      label: col.header as string,
      key: 'accessorKey' in col ? (col.accessorKey as string) : '',
    }));
  };

  const getEventTypeName = (eventTypeId: number) => {
    const eventTypes = {
      38: "위험 수위 감지(주의)",
      39: "위험 수위 감지(경계)",
      40: "위험 수위 감지(심각)",
      44: "위험 수위 감지(대피)",
      45: "인접 개소 침수 주의",
      47: "수위계 연동 차단기 자동제어",
    };
    return eventTypes[eventTypeId] || "Unknown";
  };

  const getSeverityName = (severityId: 0 | 1 | 2 | 3) => {
    const severities = {
      0: "info",
      1: "minor",
      2: "major",
      3: "critical",
    };
    return severities[severityId] || "Unknown";
  };

  const getDeviceTypeKorean = (deviceType: string) => {
    switch (deviceType) {
      case 'camera':
        return '카메라';
      case 'ebell':
        return '비상벨';
      case 'door':
        return '출입문';
      case 'pids':
        return 'PIDS';
      case 'guardianlite':
        return '가디언라이트';
      case 'vms':
        return 'VMS';
      default:
        return '알 수 없음';
    };
  };

  const formatTimeString = (str: string) => {
    if (!/^\d{6}$/.test(str)) return '잘못된 형식입니다.';

    const hour = str.substring(0, 2);
    const minute = str.substring(2, 4);
    const second = str.substring(4, 6);

    return `${hour}:${minute}:${second}`;
  }


  const handleSearch = async (data: any) => {
    if (serviceType === 'broadcast') {
      setLoading(true);
      try {
        if (selectedLog === '방송 로그') {
          const res = await getBroadcastLogList({
            siteId: siteId[0],
            startTime: _.isEmpty(data.eventTime.startTime) ? null : data.eventTime.startTime,
            endTime: _.isEmpty(data.eventTime.endTime) ? null : data.eventTime.endTime,
            type: data.transmissionMethod.value,
            status: data.status.value,
            start: dayjs(new Date(data.broadcastDate.startDate)).format('YYYY-MM-DD'),
            end: dayjs(new Date(data.broadcastDate.endDate)).format('YYYY-MM-DD'),
          });
          if (res.message === 'ok') {
            const tableData = res.result.map((item: BroadcastLogData, idx: number) => ({
              id: (idx + 1).toString(),
              type: item.type || "Unknown",
              locations: item.broadcastLogs.length.toString() || "Unknown",
              result: item.broadcastLogs[0]?.status || "Unknown",
              date: dayjs(item.createdTime * 1000).format("YYYY-MM-DD"),
              startTime: item.broadcastLogs[0]?.startTime ? dayjs(item.broadcastLogs[0].startTime * 1000).format("HH:mm") : "Unknown",
              endTime: item.broadcastLogs[0]?.endTime ? dayjs(item.broadcastLogs[0].endTime * 1000).format("HH:mm") : "Unknown",
              manager: item.broadcastLogs[0]?.transmitterName || "Unknown",
            }));
            setTableData(tableData);
          }
        } else if (selectedLog === '이벤트 로그') {
          const res = await getEventLogList({
            eventType: data.eventType.value,
            start: dayjs(new Date(data.eventDate.startDate)).format('YYYY-MM-DD'),
            end: dayjs(new Date(data.eventDate.endDate)).format('YYYY-MM-DD'),
            startTime: _.isEmpty(data.eventTime.startTime) ? null : data.eventTime.startTime,
            endTime: _.isEmpty(data.eventTime.endTime) ? null : data.eventTime.endTime,

          })
          if (res.message === 'ok') {
            const tableData = res.result.map((item: any, idx: number) => ({
              id: (idx + 1).toString(),
              type: item.event_type,
              name: item.name,
              startTime: item.created_at,
            }));
            setTableData(tableData);
          }
        }
      } catch (error) {
        console.error('방송 로그 조회 중 오류 발생:', error);
      } finally {
        setLoading(false);
      }
    } else if (serviceType === 'parking') {
      setLoading(true);
      try {
        if (selectedLog === '이벤트') {
          const res = await apiParkingEventLogSearchList(data);

          if (res.message === 'ok') {
            const tableData = res.result.map((item: ParkingFormData, idx: number) => ({
              id: (idx + 1).toString(),
              eventName: item.event_name ? item.event_name : '-',
              deviceType: item.device_type ? item.device_type : '-',
              deviceName: item.device_no16 ? item.device_no16 : '-',
              deviceIP: item.device_ip ? item.device_ip : '-',
              location: item.location ? item.location : '-',
              eventDate: dayjs(item.event_occurrence_time, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD'),
              eventTime: dayjs(item.event_occurrence_time, 'YYYYMMDDTHHmmss').format('HH:mm:ss'),
            }));

            setTableData(tableData);
          }
        } else if (selectedLog === '차량 출입기록') {
          // 차량 출입 기록 플로우 및 기획이 없음 (DB 생성 뿐 아니라 조회 컬럼 조차 X) 
          // const parkingLogDummyData = Array.from({ length: Math.floor(Math.random() * 100) + 1 }, (_, i) => ({
          //   id: `${i + 1}`,
          //   eventType: i % 2 === 0 ? "입차" : "출차",
          //   carNumber: `123가 ${String(1000 + i)}`,
          //   buildingName: `Building ${Math.floor(Math.random() * 5) + 1}`,
          //   floor: `${Math.floor(Math.random() * 10) + 1}층`,
          //   parkingSpot: `P-${Math.floor(Math.random() * 100) + 1}`,
          //   carType: ["일반", "경차", "장애인", "전기차"][Math.floor(Math.random() * 4)],
          //   entryDate: `2025-02-${String(i % 28 + 1).padStart(2, "0")}`,
          //   entryTime: `${String(i % 24).padStart(2, "0")}:${String((i * 2) % 60).padStart(2, "0")}`,
          // }));
          // setTableData(parkingLogDummyData as FormDataType[]);
          console.log('차량 출입기록 조회 : ', data);
        }
      } catch (error) {
        console.error('주차 이벤트 로그 조회 중 오류 발생:', error);
      } finally {
        setLoading(false);
      }
    } else if (serviceType === 'origin') {
      try {
        setLoading(true);
        if (selectedLog === '이벤트') {
          const res = await apiSearchEvents({
            eventName: _.isEmpty(data.eventName?.value) ? null : data.eventName.value,
            severityId: data.severityId?.value === '' ? null : data.severityId?.value,
            startDate: `${data.eventDate.startDate}`,
            endDate: `${data.eventDate.endDate}`,
            startTime: data.eventTime?.startTime?.replace(':', '') ? `${data.eventTime?.startTime?.replace(':', '')}00` : '',
            endTime: data.eventTime?.endTime?.replace(':', '') ? `${data.eventTime?.endTime?.replace(':', '')}59` : '',
            location: data.location,
            isAck: data.isAck?.value != '' ? data.isAck?.value : null,
            deviceType: _.isEmpty(data.deviceType?.value) ? null : data.deviceType?.value === '' ? null : data.deviceType?.value,
            deviceName: data.deviceName ? data.deviceName : null,
            deviceIp: data.deviceIp ? data.deviceIp : null,
          });
          if (res && Array.isArray(res)) {
            const tableData = res.map((item) => ({
              eventName: item.event_name,
              severityId: getSeverityName(item.severity_id),
              occurDate: dayjs(item.event_occurrence_time, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD'),
              occurTime: dayjs(item.event_occurrence_time, 'YYYYMMDDTHHmmss').format('HH:mm:ss'),
              location: item.location || "",
              deviceType: item.device_type ? getDeviceTypeKorean(item.device_type) : '',
              deviceName: item.device_name || "",
              deviceIp: item.device_ip,
              isAck: item.is_acknowledge ? '확인' : '미확인',
              ackUser: item.acknowledge_user || "",
              ackDate: item.acknowledged_at
                ? dayjs(item.acknowledged_at, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD')
                : "",
              ackTime: item.acknowledged_at
                ? dayjs(item.acknowledged_at, 'YYYYMMDDTHHmmss').format('HH:mm:ss')
                : "",
              sopIdx: item.sop_idx || "",
              cameraId: item.camera_id || ''
            }));
            setTableData(tableData as MainFormData[]);
          }

        } else if (selectedLog === 'SOP 이벤트') {
          const res = await apiSearchEventsSOP({
            eventName: _.isEmpty(data.eventName?.value) ? null : data.eventName.value,
            isTruePositive: _.isEmpty(data.isTruePositive?.value) ? null : data.isTruePositive.value,
            startDate: `${data.eventDate.startDate}`,
            endDate: `${data.eventDate.endDate}`,
            startTime: data.eventTime?.startTime?.replace(':', '') ? `${data.eventTime?.startTime?.replace(':', '')}00` : '',
            endTime: data.eventTime?.endTime?.replace(':', '') ? `${data.eventTime?.endTime?.replace(':', '')}59` : '',
            location: data.location ? data.location : null,
          });
          if (res && Array.isArray(res)) {
            const tableData = res.map((item) => ({
              eventIdx: item.event_idx,
              eventName: item.event_name,
              sopIdx: item.sop_idx,
              falseAlarmIdx: item.false_alarm_idx,
              location: item.location || "",
              occurDate: dayjs(item.event_occurrence_time, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD'),
              occurTime: dayjs(item.event_occurrence_time, 'YYYYMMDDTHHmmss').format('HH:mm:ss'),
              ackUser: item.acknowledge_user || "",
              ackDate: item.acknowledged_at
                ? dayjs(item.acknowledged_at, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD')
                : "",
              ackTime: item.acknowledged_at
                ? dayjs(item.acknowledged_at, 'YYYYMMDDTHHmmss').format('HH:mm:ss')
                : "",
              isClearSOPStage: item.is_clear_sop_stage ?? "",
              cameraId: item.camera_id || ''
            }));
            setTableData(tableData as MainFormSOPData[]);
          }
        } else if (selectedLog === '출입 기록') {
          const res = await apiSearchAccessCtlLog<AccessLogData>({
            status: _.isEmpty(data.logStatus?.value) ? null : data.logStatus.value,
            doorId: _.isEmpty(data.logDoorId?.value) ? null : data.logDoorId.value,
            personName: data.logPersonLastName,
            startDate: data.logDate?.startDate?.replaceAll('-', '') || '',
            endDate: data.logDate?.endDate?.replaceAll('-', '') || '',
            startTime: data.logTime?.startTime?.replace(':', '') || '',
            endTime: data.logTime?.endTime?.replace(':', '') || '',
            noLimit: true
          });
          if (Array.isArray(res?.result)) {
            const tableData = res.result.map((item) => ({
              logStatusName: item.LogStatusName,
              logPersonLastName: item.LogPersonLastName,
              logTitleName: item.LogTitleName,
              logDoorName: item.LogDoorName,
              logDate: dayjs(item.LogDate, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD'),
              logTime: formatTimeString(item.LogTime),
              cameraId: item.camera_id
              // cameraId: item.camera_id || ''
            }));
            setTableData(tableData as MainFormAccessLogData[]);
          }
        }
      } catch (error) {
        console.error('이벤트 조회 중 오류 발생:', error);
      } finally {
        setLoading(false);
      }
    } else if (serviceType === 'inundation') {
      try {
        setLoading(true);
        if (selectedLog === '이벤트') {
          const res = await apiGetEventList({
            startTime: _.isEmpty(data.eventTime?.startTime) ? null : data.eventTime.startTime,
            endTime: _.isEmpty(data.eventTime?.endTime) ? null : data.eventTime.endTime,
            type: data.transmissionMethod?.value,
            start: dayjs(new Date(data.eventDate.startDate)).format('YYYY-MM-DD'),
            end: dayjs(new Date(data.eventDate.endDate)).format('YYYY-MM-DD'),
            deviceType: data['장치 종류']?.value,
            eventLocation: data['발생 위치'],
          });
          if (res.message === 'ok') {
            const eventData = res.result.result || res.result;
            const tableData = eventData.map((item, idx) => ({
              id: item.idx || (idx + 1).toString(),
              type: item.event_type_id ? getEventTypeName(item.event_type_id) : "",
              content: item.description || "",
              location: item.location || "",
              startTime: item.event_occurrence_time
                ? dayjs(item.event_occurrence_time, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD HH:mm')
                : "",
              endTime: item.event_end_time
                ? dayjs(item.event_end_time, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD HH:mm')
                : "",
              severity: item.severity_id ? getSeverityName(item.severity_id) : "",
            }));
            setTableData(tableData);
          }
        } else if (selectedLog === '관리 로그') {
          const res = await apiGetOperationLogList({
            start: dayjs(new Date(data.eventDate.startDate)).format('YYYY-MM-DD'),
            end: dayjs(new Date(data.eventDate.endDate)).format('YYYY-MM-DD'),
            logType: data.transmissionMethod?.value || 'all',
          });

          if (res.message === 'ok') {
            const tableData = res.result.result.map((item, idx) => ({
              id: (idx + 1).toString(),
              logType: item.log_type || "",
              description: item.log_description || "",
              operator: item.user_id || "",
              dateTime: dayjs(item.created_at).format("YYYY-MM-DD HH:mm") || "",
              ip: item.req_ip || "",
            }));
            setTableData(tableData);
          }
        }
      } catch (error) {
        console.error('이벤트/관리 로그 조회 중 오류 발생:', error);
      } finally {
        setLoading(false);
      };
    } else if (serviceType === 'tunnel') {
      try {
        setLoading(true);
        if (selectedLog === '이벤트') {
          const res = await apiTunnelGetEventList({
            start: dayjs(new Date(data.eventDate.startDate)).format('YYYY-MM-DD'),
            end: dayjs(new Date(data.eventDate.endDate)).format('YYYY-MM-DD'),
            startTime: _.isEmpty(data.eventTime?.startTime) ? null : data.eventTime.startTime,
            endTime: _.isEmpty(data.eventTime?.endTime) ? null : data.eventTime.endTime,
            eventType: data.eventType?.value,
            deviceType: data.deviceType?.value,
            deviceName: data.deviceName,
            location: data.location
          });

          if (res.message === 'ok') {
            const eventData = res.result.result || res.result;
            const tableData = eventData.map((item, idx) => ({
              type: item.event_type_id ? getEventTypeName(item.event_type_id) : "",
              deviceType: item.device_type === 'crossinggate' ? '차단막' : '수위계',
              deviceName: item.device_name,
              content: item.description || "",
              location: item.location || "",
              startTime: item.event_occurrence_time
                ? dayjs(item.event_occurrence_time, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD HH:mm')
                : "",
              endTime: item.event_end_time
                ? dayjs(item.event_end_time, 'YYYYMMDDTHHmmss').format('YYYY-MM-DD HH:mm')
                : "",
              severity: item.severity_id ? getSeverityName(item.severity_id) : "",
            }));
            setTableData(tableData);
          }
        }
      } catch (error) {
        console.error('이벤트/관리 로그 조회 중 오류 발생:', error);
      } finally {
        setLoading(false);
      };
    };
  };

  const handleButtonClick = (logType: string) => {
    if (selectedLog === logType) return;
    setSelectedLog(logType);
    setTableColumns([]);
    setTableData([]);
    reset();
  };

  const setOpenDialogChild = (type: 'archive' | 'SOP' | 'SOP-false', params: string, rewind?: number) => {
    if (type === 'archive') {
      return (
        <ArchiveVideo params={params} rewind={rewind} />
      );
    } else if (type === 'SOP') {
      return (
        <ConfirmSOPProcess params={params} close={openDialog.close} />
      );
    } else if (type === 'SOP-false') {
      return (
        <ConfirmSOPFalseAlarm params={params} close={openDialog.close} />
      )
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      width={width}
      onClose={onClose}
    >
      <FormProvider {...methods}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h5>데이터 조회</h5>
        </div>
        {serviceType === 'origin' && (
          <div className='w-[93.625rem] bg-[#EDF0F6] h-0.5 mb-3 relative -left-6' />
        )}
        <div className='flex items-center relative h-[50px]'>
          {tabList.length > 0 && (
            tabList.map((item, index) => (
              <Button
                key={index}
                className='w-[110px] rounded-3xl mr-3'
                size='sm'
                style={{
                  backgroundColor: selectedLog === item ? '#6f93d3' : 'transparent',
                  color: selectedLog === item ? "#fff" : 'gray',
                }}
                onClick={() => handleButtonClick(item)}
              >
                {item}
              </Button>
            ))
          )}
          <div className='absolute right-0'>
            <CSVLink className='my-2' filename='데이터 조회' data={tableData} headers={csvHeader(tableColumns)}>
              <Button className='flex items-center text-md px-4 h-[35px] bg-[#dce0ea]'>
                <MdOutlineFileDownload className='mr-1' size={20} />파일 다운로드
              </Button>
            </CSVLink>
          </div>
        </div>
        {serviceType === 'origin' && (
          <div className='w-full bg-[#EDF0F6] h-[1px] my-3' />
        )}
        <form className="flex bg-[#ebecef] dark:bg-gray-500 dark:text-black rounded-md" onSubmit={handleSubmit(handleSearch)}>
          <div className="flex flex-wrap w-[95%] gap-5 p-2">
            {headerComponent}
          </div>
          <div className="border-l border-gray-300 mx-5 my-3"></div>
          <div className="flex justify-end items-center w-[5%] mt-5 mr-5 mb-5">
            <button type="submit" className="h-[50px] p-2 px-3 bg-[#6f93d3] rounded-lg text-white">
              검색
            </button>
          </div>
        </form>
      </FormProvider>

      <div className=''>
        <Table loading={loading} tableData={tableData} tableColumns={tableColumns} serviceType={serviceType} selectedLog={selectedLog} />
      </div>
      {(openDialog.show && openDialog.type) && (
        <CustomModal
          show={openDialog.show}
          title={openDialog.title}
          width={openDialog.width}
          contentClassName={'rounded-md border-2 border-[#D9DCE3] px-0 py-3'}
          titleClassName='px-4 py-1'
          height={openDialog.height}
          close={openDialog.close}
        >
          <div className='bg-[#EDF0F6] w-full h-0.5 my-2' />
          {setOpenDialogChild(openDialog.type, openDialog.params, openDialog.rewind)}
        </CustomModal>
      )}
    </Dialog>
  );
};

interface TableProps {
  loading: boolean;
  tableData: any[];
  tableColumns: ColumnDef<any>[];
  serviceType: string;
  selectedLog?: string
  height?: string;
};

const Table = ({ loading, tableData, tableColumns, serviceType, selectedLog, height = '550px' }: TableProps) => {
  // const table = useReactTable({
  //   data: tableData,
  //   columns: tableColumns,
  //   getCoreRowModel: getCoreRowModel(),
  //   getPaginationRowModel: getPaginationRowModel(),
  // });

  const truncatedFields = ['content', 'description', 'location'];
  const maxLengths = {
    content: 40,
    description: 40,
    location: 25
  };

  const renderTruncatedValue = (value: any, fieldName: string) => {
    if (
      typeof value === 'string' &&
      truncatedFields.includes(fieldName) &&
      value.length > (maxLengths[fieldName] || 40)
    ) {
      const maxLength = maxLengths[fieldName] || 40;
      return (
        <Tooltip title={value} placement="top">
          <span className="cursor-pointer">
            {value.substring(0, maxLength)}...
          </span>
        </Tooltip>
      );
    }
    return value;
  };

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className={`pt-3 h-[${height}] pb-5`}>
      <table className="w-full rounded-lg overflow-hidden shadow-md dark:text-[#FFFFFF]">
        <thead className="bg-gray-200 dark:bg-gray-500 rounded-t-lg">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th key={header.id} className="p-3 text-center dark:text-black">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={table.getAllColumns().length} className="p-3 text-center dark:text-[#FFFFFF]">
                <div className="flex justify-center items-center">
                  <Spinner size={30} />
                </div>
              </td>
            </tr>
          ) : table.getRowModel().rows.length > 0 ? (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-300 dark:text-[#FFFFFF]">
                {row.getVisibleCells().map((cell) => {
                  const value = cell.getValue();
                  const columnId = cell.column.id;

                  let statusStyle = "";
                  if (serviceType === "broadcast" && selectedLog === '방송 로그') {
                    if (value === "Finished") {
                      statusStyle = "w-[100px] py-1 px-2 bg-[#e8f7f1] text-[#138f5b] text-center rounded";
                    } else if (value === "Error" || value === "Unknown") {
                      statusStyle = "w-[100px] py-1 px-2 bg-[#fceceb] text-[#b82a23] text-center rounded";
                    } else if (value === "Ready" || value === "Started") {
                      statusStyle = "w-[100px] py-1 px-2 bg-[#fff7e6] text-[#fa8c16] text-center rounded";
                    } else if (value === "FILE") {
                      statusStyle = "w-[80px] py-1 px-2 bg-[#2db7f5] text-white text-center rounded";
                    } else if (value === "TTS") {
                      statusStyle = "w-[80px] py-1 px-2 bg-[#83ca65] text-white text-center rounded";
                    } else if (value === "PTT") {
                      statusStyle = "w-[80px] py-1 px-2 bg-[#3b5999] text-white text-center rounded";
                    }
                  }

                  return (
                    <td key={cell.id} className="p-2 text-center dark:text-[#FFFFFF]">
                      <div className={`flex justify-center text-center ${statusStyle}`}>
                        {(() => {
                          if (serviceType === 'broadcast' && selectedLog === '방송 로그') {
                            if (value === 'Finished') return '완료';
                            if (value === 'Error') return '오류';
                            if (value === 'Unknown') return '상태 모름';
                            if (value === 'Ready') return '준비 중';
                            if (value === 'Started') return '시작됨';
                            if (value === 'FILE') return 'FILE';
                            if (value === 'TTS') return 'TTS';
                            if (value === 'PTT') return 'PTT';
                            return flexRender(cell.column.columnDef.cell, cell.getContext());
                          }

                          if (truncatedFields.includes(columnId)) {

                            return renderTruncatedValue(value, columnId);
                          }
                          return flexRender(cell.column.columnDef.cell, cell.getContext());
                        })()}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={table.getAllColumns().length} className="p-3 text-center dark:text-[#FFFFFF]">
                데이터가 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {(table.getRowModel().rows.length > 0 && !loading) && (
        <div className="flex items-center justify-center gap-4 fixed bottom-0 w-full py-2">
          <button
            disabled={!table.getCanPreviousPage()}
            className="p-2 rounded-full disabled:opacity-50 dark:text-[#FFFFFF]"
            onClick={() => table.previousPage()}
          >
            <FaChevronLeft size={16} />
          </button>
          <span className="text-gray-700 font-medium dark:text-[#FFFFFF]">
            페이지 {table.getState().pagination.pageIndex + 1} / {table.getPageCount()}
          </span>
          <button
            disabled={!table.getCanNextPage()}
            className="p-2 rounded-full disabled:opacity-50 dark:text-[#FFFFFF]"
            onClick={() => table.nextPage()}
          >
            <FaChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default LogDataDialog