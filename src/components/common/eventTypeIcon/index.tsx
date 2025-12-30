import React from "react";
import { icons } from './icons';

type IconType = {
  src?: string;
  alt?: string;
  component?: React.FC<{ size: number; color: string }>;
  props?: { size: number; color: string };
};

type Props = {
  eventTypeId: number;
  size?: number;
};

// 이벤트 타입 아이콘 데이터
const EVENT_TYPE_ICONS: Record<number, IconType> = {
  1: { src: icons.imageIcons.FireIcon, alt: '화재 감지' },
  2: { src: icons.imageIcons.SmokeIcon, alt: '연기 감지' },
  3: { src: icons.imageIcons.MotionIcon, alt: '움직임 감지' },
  4: { src: icons.imageIcons.LoiterIcon, alt: '배회 감지' },
  5: { src: icons.imageIcons.AbandonIcon, alt: '유기물 감지' },
  6: { src: icons.imageIcons.TrespassIcon, alt: '침입 감지' },
  7: { src: icons.imageIcons.LeaveIcon, alt: '이탈 감지' },
  8: { src: icons.imageIcons.LinecrossIcon, alt: '선 통과 감지' },
  9: { src: icons.imageIcons.QueueIcon, alt: '줄서기 감지' },
  10: { src: icons.imageIcons.FallIcon, alt: '낙상 감지' },
  11: { src: icons.imageIcons.SittingPoseIcon, alt: '앉은 자세 감지' },
  12: { src: icons.imageIcons.StopIcon, alt: '정지 감지' },
  13: { src: icons.imageIcons.MoveIcon, alt: '이동 감지' },
  14: { src: icons.imageIcons.PeoplecountIcon, alt: '인원 수 감지' },
  15: { src: icons.imageIcons.ShortDistanceIcon, alt: '근거리 감지' },
  16: { src: icons.imageIcons.HandrailIcon, alt: '손잡이 감지' },
  17: { src: icons.imageIcons.HandupIcon, alt: '손 올림 감지' },
  18: { src: icons.imageIcons.FaceIcon, alt: '얼굴 감지' },
  19: { src: icons.imageIcons.EbellIcon, alt: '전자벨 감지' },
  20: { component: icons.reactIcons.TbNetworkOff, props: { size: 25, color: 'white' } },
  21: { src: icons.imageIcons.BlackListIcon, alt: '블랙리스트 감지' },
  22: { src: icons.imageIcons.WhiteListIcon, alt: '화이트리스트 감지' },
  23: { src: icons.imageIcons.SignalFire, alt: '비상 화재 감지' },
  24: { src: icons.imageIcons.UnregistAccess, alt: '미등록 접근 감지' },
  25: { src: icons.imageIcons.DoorBreaching, alt: '강제 출입 감지' },
  26: { component: icons.reactIcons.GiHumanTarget, props: { size: 30, color: 'white' } },
  27: { component: icons.reactIcons.MdOutlineCarCrash, props: { size: 30, color: 'white' } },
  28: { src: icons.imageIcons.SafetyHelmet, alt: '안전모 감지' },
  29: { component: icons.reactIcons.LuUnplug, props: { size: 25, color: 'white' } },
  30: { component: icons.reactIcons.PiPlugsConnectedBold, props: { size: 25, color: 'white' } },
  31: { src: icons.imageIcons.CctvRecordErr, alt: 'CCTV 기록 오류' },
  32: { component: icons.reactIcons.TbDeviceCctvOff, props: { size: 25, color: 'white' } },
  33: { src: icons.imageIcons.LostVMSServer, alt: 'VMS 서버 손실' },
  34: { src: icons.imageIcons.ArchiveErr, alt: '아카이브 오류' },
  35: { component: icons.reactIcons.BsSignNoParking, props: { size: 25, color: 'white' } },
  36: { component: icons.reactIcons.PiBroadcastBold, alt: '마을 예약 방송', props: { size: 30, color: 'white' } },
  37: { component: icons.reactIcons.PiBroadcastBold, alt: '마을 정기 방송', props: { size: 30, color: 'white' } },
  38: { src: icons.imageIcons.DetectWaterlevel, alt: '위험 수위 감지 (주의)' },
  39: { src: icons.imageIcons.DetectWaterlevel, alt: '위험 수위 감지 (경계)' },
  40: { src: icons.imageIcons.DetectWaterlevel, alt: '위험 수위 감지 (심각)' },
  41: { component: icons.reactIcons.RiSensorLine, props: { size: 30, color: 'white' } },
  42: { component: icons.reactIcons.TbBroadcast, alt: '실시간 방송', props: { size: 30, color: 'white' } },
  44: { src: icons.imageIcons.DetectWaterlevel, alt: '위험 수위 감지 (대피)' },
  45: { src: icons.imageIcons.AlertNearby, alt: '인접 개소 침수 주의' },
  46: { component: icons.reactIcons.MdSensors, props: { size: 30, color: 'white' } },
  47: { src: icons.imageIcons.AutoCrossinggate, alt: '수위계 연동 차단기 자동제어' },
  48: { component: icons.reactIcons.BsPersonFillExclamation, alt: 'Anti-Passback(Soft)', props: { size: 30, color: 'white' } },
  49: { component: icons.reactIcons.BsPersonFillDash, alt: 'Anti-Passback(Timed)', props: { size: 30, color: 'white' } },
  50: { component: icons.reactIcons.BsPersonFillSlash, alt: 'Anti-Passback(Hard)', props: { size: 30, color: 'white' } },
  51: { component: icons.reactIcons.FaDoorOpen, alt: '장시간 문 열림', props: { size: 30, color: 'white' } },
  52: { component: icons.reactIcons.FaDoorClosed, alt: '장시간 문 열림 종료', props: { size: 30, color: 'white' } },
  53: { component: icons.reactIcons.BsPersonSlash, alt: '재인증 횟수초과', props: { size: 30, color: 'white' } },
  54: { component: icons.reactIcons.BsPersonSlash, alt: '미승인 리더 출입시도', props: { size: 30, color: 'white' } },
  55: { component: icons.reactIcons.BsPersonSlash, alt: '출입제한 시간에 출입시도', props: { size: 30, color: 'white' } },
  56: { component: icons.reactIcons.BsPersonSlash, alt: '리더 출입제한 시간', props: { size: 30, color: 'white' } },
};

const EventTypeIcon: React.FC<Props> = ({ eventTypeId, size }) => {
  const iconData = EVENT_TYPE_ICONS[eventTypeId];

  if (!iconData) {
    return <div></div>;
  }

  return iconData.src ? (
    <img src={iconData.src} alt={iconData.alt || "이벤트 아이콘"} className={`${size} ? 'w-${size}px h-${size}px':'w-6 h-6'`} />
  ) : (
    iconData.component && <iconData.component {...(iconData.props as { size: number; color: string })} size={size || 30} />
  );
};

export default EventTypeIcon;
