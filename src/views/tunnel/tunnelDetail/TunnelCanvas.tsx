import React, { useEffect, useState } from 'react';
import MiniMap from '@/views/tunnel/tunnelMap/MiniMap';
import { SelectedObject } from '@/@types/tunnel';
import { useBillboardStore } from '@/store/tunnel/useBillboardStore';
import GuardianliteModal from '@/views/tunnel/modals/guardianliteModal'
// 이미지 경로
import downArrow from '@/assets/styles/images/LCS/down_arrow.png';
import leftArrow from '@/assets/styles/images/LCS/left_arrow.png';
import rightArrow from '@/assets/styles/images/LCS/right_arrow.png';
import noEntry from '@/assets/styles/images/LCS/no_entry.png';
import downArrowEffect from '@/assets/styles/images/LCS/down_arrow_Effect.gif';
import noEntryEffect from '@/assets/styles/images/LCS/no_entry_effect.gif';
import num30 from '@/assets/styles/images/LCS/30.png';
import num40 from '@/assets/styles/images/LCS/40.png';
import num50 from '@/assets/styles/images/LCS/50.png';
import num60 from '@/assets/styles/images/LCS/60.png';
import num70 from '@/assets/styles/images/LCS/70.png';
import num80 from '@/assets/styles/images/LCS/80.png';
import num90 from '@/assets/styles/images/LCS/90.png';

interface Props {
  data: SelectedObject;
  viewMode: 'canvas' | 'map';
  toggleViewMode: () => void;
  canvasContainerRef: React.RefObject<HTMLDivElement>;
  cameraAngle: boolean;
  toggleCameraAngle: () => void;
  fabricObject: any;
  clickObject: any;
  handleUpdateLocation: () => void;
  handleUpdateCameraAngle: () => void;
  modal: any;
  toggleModal: (modal: any) => void;
  ContextMenu: React.FC<any>;
  isControlIn: boolean;
}

const TunnelCanvasSection = ({
  data,
  viewMode,
  toggleViewMode,
  canvasContainerRef,
  cameraAngle,
  toggleCameraAngle,
  fabricObject,
  clickObject,
  handleUpdateLocation,
  handleUpdateCameraAngle,
  modal,
  toggleModal,
  ContextMenu,
  isControlIn,
}: Props) => {
  const { lcsMsgs } = useBillboardStore();
  const LCSImgSrc = {
    "8001": downArrow,
    "8002": leftArrow,
    "8003": rightArrow,
    "8007": noEntry,
    "8006": downArrowEffect,
    "8008": noEntryEffect,
    "8009": num30,
    "8010": num40,
    "8011": num50,
    "8012": num60,
    "8013": num70,
    "8014": num80,
    "8015": num90
  }

  const [isGuardianliteModalOpen, setIsGuardianliteModalOpen] = useState(false);
  return (
    <section className="w-[1210px] bg-white dark:bg-gray-800 border dark:border-gray-600 rounded shadow p-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {data.name}{' '}
          <span className="text-gray-500 dark:text-gray-400">({data.location})</span>
        </h2>
        <div>
          <button
            className="px-4 py-1 text-sm border rounded bg-blue-500 text-white hover:bg-blue-600"
            onClick={() => {
              setIsGuardianliteModalOpen(true);
            }}
          >
            가디언라이트
          </button>
          <button
            onClick={toggleViewMode}
            className="px-4 py-1 text-sm border rounded bg-blue-500 text-white hover:bg-blue-600 ml-[10px]"
          >
            {viewMode === 'canvas' ? '지도 보기' : '캔버스 보기'}
          </button>
        </div>
      </div>

      {/* 캔버스 영역 */}
      <div
        ref={canvasContainerRef}
        className={`relative w-full h-[250px] bg-gray-100 dark:bg-gray-700 rounded border dark:border-gray-600 ${viewMode === 'canvas' ? 'block' : 'hidden'
          }`}
      >
        <canvas id="mainCanvas" className="w-full h-full" />
        <button
          className="w-[76px] h-[26px] border-[#C5D0E8] bg-[#ADB2BD] dark:bg-gray-500 dark:border-gray-400 rounded-md absolute top-4 left-4 text-white text-[0.75rem]"
          onClick={toggleCameraAngle}
        >
          카메라 화각
        </button>
        <ul
          id="contextMenu"
          className="absolute hidden z-10 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded shadow p-2 w-[10rem]"
        >
          <ContextMenu
            mapType="tunnel"
            fabricObject={fabricObject}
            object={clickObject}
            updateLocation={handleUpdateLocation}
            updateCameraAngle={handleUpdateCameraAngle}
            onClick={toggleModal}
            cameraAngle={cameraAngle}
            isControlIn={isControlIn}
          />
        </ul>

        {/* ajy add LCS 전광판 값 추가 */}
        {lcsMsgs?.length > 0 && lcsMsgs.every((msg) => msg !== '') && (
          <div className="absolute top-1 right-2 h-[62px] bg-white rounded-md flex justify-between items-center gap-4 px-4">
            {lcsMsgs.map((msg, index) => (
              <ul key={index} className="w-[46px]">
                <li className="w-[46px] h-[12px] text-center leading-[12px] bg-[#EBECEF] mb-1">
                  {index + 1}차선
                </li>
                <li className="ml-[6px] h-[34px]">
                  {msg !== 'delete' && (
                    <img
                      src={LCSImgSrc[msg as keyof typeof LCSImgSrc]}
                      alt={`${index + 1}차선 이미지`}
                    />
                  )}
                </li>
              </ul>
            ))}
          </div>
        )}
      </div>

      {/* 미니맵 */}
      <div className={`w-full h-[250px] ${viewMode === 'map' ? 'block' : 'hidden'}`}>
        {viewMode === 'map' && (
          <MiniMap
            key={`${data.position[0]}-${data.position[1]}`}
            position={data.position}
            markerType={data.type}
            direction={data.direction}           // ✅ 추가
            barrierStatus={data.barrier_status}  // ✅ 추가
          />
        )}
      </div>

      {/* 가디언라이트 */}
      {isGuardianliteModalOpen && (
        <GuardianliteModal
          guardianLightIp={data?.guardianlite_ip ?? ''}   // ← undefined면 ''로
          onClose={() => setIsGuardianliteModalOpen(false)} 
        />
      )}
    </section>
  );
};

export default TunnelCanvasSection;
