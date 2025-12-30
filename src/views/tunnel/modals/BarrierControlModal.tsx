import React from 'react';

type Props = {
  ip: string;
  location: string;
  onCancel: () => void;
  onControl: (command: '상승' | '정지' | '하강') => void;
};

export default function TunnelBarrierControlModal({ ip, location, onCancel, onControl }: Props) {
  return (
    <div className="p-5 z-40">
      <div className="flex justify-between items-center bg-[#f5f5f5] border rounded shadow p-4 ">
        <div>
          <h4 className="font-bold mb-2 text-xl">터널 차단막</h4>
          <p className="text-xs text-gray-700">{ip}</p>
          <div className="text-[11px] text-gray-500 mt-1">{location}</div>
        </div>

        <div className="flex gap-3">
          <button
            className="w-[100px] h-[60px] bg-green-600 hover:bg-green-700 text-white rounded font-semibold text-sm"
            onClick={() => onControl('상승')}
          >
            상승
          </button>
          <button
            className="w-[100px] h-[60px] bg-gray-600 hover:bg-gray-700 text-white rounded font-semibold text-sm"
            onClick={() => onControl('정지')}
          >
            정지
          </button>
          <button
            className="w-[100px] h-[60px] bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-sm"
            onClick={() => onControl('하강')}
          >
            하강 
          </button>
        </div>
      </div>

      <div className="mt-4 text-right">
        <button onClick={onCancel} className="text-sm text-gray-500 hover:text-black">
          닫기
        </button>
      </div>
    </div>
  );
}
