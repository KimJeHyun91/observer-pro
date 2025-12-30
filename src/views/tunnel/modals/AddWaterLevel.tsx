import { useForm, Controller, useFormContext } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Button, Input } from '@/components/ui';
import { AlertDialog } from '@/components/shared/AlertDialog'
import { apiGetWaterLevelListSearch, apiAddWaterLevelMappingControlOut } from '@/services/TunnelService'
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { useReactTable, getCoreRowModel, getPaginationRowModel, flexRender, ColumnDef, createColumnHelper } from "@tanstack/react-table";
type Props = {
  onCancel: () => void;
  mutate : () => void;
  outsideIdx: number;
  topLocation: string;
  leftLocation: string;
};

type WaterLevelItem = {
  idx: number;
  name: string;
  ip: string;
};

const tableColumns: ColumnDef<WaterLevelItem>[] = [
  {
    accessorKey: 'name',
    header: 'NAME',
    cell: info => info.getValue(),
  },
  {
    accessorKey: 'location',
    header: 'LOCATION',
    cell: info => info.getValue(),
  },
  {
    accessorKey: 'ip',
    header: 'IP',
    cell: info => info.getValue(),
  },
  {
    accessorKey: 'port',
    header: 'PORT',
    cell: info => info.getValue(),
  },
];

export default function AddWaterLevel({ onCancel,mutate, outsideIdx, topLocation, leftLocation }: Props) {
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState('');
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm({
    defaultValues: {
      name: '',
      ip: '',
      communication: 'control_out'
    },
  })

  const table = useReactTable({
    data: tableData,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 4, // 🔹 페이지당 4개 항목 표시
      },
    },
  });

  useEffect(() => {
    const submitData = { name: '', ip: '', communication: 'control_out' }
    handleSearch(submitData)
  }, []);

  const onSubmit = (data: any) => {
    handleSearch(data);
  };

  const handleSearch = async (submitData: any) => {
    setLoading(true);
    const res = await apiGetWaterLevelListSearch(submitData);
    if (res.message === 'ok') {
      setTableData(res.result);
    }
    setLoading(false);
  }


  const handleMapping = async (waterLevelIdx: number) => {
    try {
      const submitData = {
        'outsideIdx': outsideIdx,
        'waterLevelIdx': waterLevelIdx,
        'topLocation':topLocation,
        'leftLocation':leftLocation,

      }
      const res = await apiAddWaterLevelMappingControlOut(submitData)
      if (res.message === "ok") {
        mutate();
        onCancel();
      }
    } catch (e) {
      console.log(e)
      setMessage('이미 등록된 수위계입니다.');
    }
    setIsAlertOpen(true);
  }

  return (
    <div className='min-h-[350px] z-40'>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 min-h-[101px]">
        <div className="absolute left-0 right-0 border-t border-gray-200 border-2 mt-[-7px] dark:border-gray-500"></div>
        <div className='w-full h-[101px] bg-[#ebecef] dark:bg-gray-500 dark:text-black rounded-md pt-[6px] pl-[10px] relative translate-y-2'>
          <Controller
            name="name"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <div className="flex items-centr">
                <input {...field}
                  placeholder="장치 이름을 입력하세요"
                  className="border px-2 py-[9px] w-[360px] rounded-xl text-black dark:bg-gray-700 dark:text-[#FFFFFF]"
                  value={typeof field.value === 'object' ? '' : field.value}
                />
              </div>
            )}
          />
          <Controller
            name="ip"
            control={control}
            defaultValue=""
            render={({ field }) => (
              <div className="flex items-center mt-[6px]">
                <input {...field}
                  placeholder="ip 주소를 입력하세요"
                  className="border px-2 py-[9px] w-[360px] rounded-xl text-black dark:bg-gray-700 dark:text-[#FFFFFF]"
                  value={typeof field.value === 'object' ? '' : field.value}
                />
              </div>
            )}
          />
          <div className='w-[90px] h-[90px] absolute right-0 top-[50%] -translate-y-[50%] border-l border-gray-300'>
            <button type="submit"
              className="h-[50px] p-2 px-3 w-[52px] bg-[#6f93d3] rounded-lg text-white absolute left-[50%] top-[50%] -translate-x-[50%] -translate-y-[50%]">
              검색
            </button>
          </div>
        </div>
      </form>

      <table className="w-full rounded-lg overflow-hidden shadow-md dark:text-[#FFFFFF] mt-6">
        <thead className="bg-gray-200 dark:bg-gray-500 rounded-t-lg">
          {table.getHeaderGroups().map(headerGroup => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map(header => (
                <th key={header.id} className="p-3 text-center dark:text-black">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-gray-200 transition-colors duration-200 cursor-pointer"
              onClick={() => {
                handleMapping(row.original.idx);
              }}
            >
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="p-2 text-center dark:text-[#FFFFFF]">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(table.getRowModel().rows.length > 0 && !loading) && (
        <div className="flex items-center justify-center gap-4 fixed bottom-0 w-[469px] py-2">
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
      <AlertDialog
        isOpen={isAlertOpen}
        message={message}
        onClose={() => setIsAlertOpen(false)}
      />
    </div>
  );
}
