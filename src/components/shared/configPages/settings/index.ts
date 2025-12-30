import { ServiceType } from '@/@types/common'
import BroadcastSettings from '@/views/broadcast/settings/BroadcastSettings'
import InundationSetting from '@/views/inundation/settings/InundationSetting'
import OriginSetting from '@/views/main/components/OriginalSetting'
import ParkingSetting from '@/views/parking/settings/ParkingSetting'
import TunnelSettings from '@/views/tunnel/settings/TunnelSettings'
import ParkingFeeSetting from '@/views/parkingFee/settings/ParkingFeeSetting'
// import BroadcastSetting from '@/views/inundation/BroadcastSetting';

const ServiceSettings: Record<
    ServiceType,
    React.ComponentType<{ onClose: () => void }>
> = {
    inundation: InundationSetting,
    broadcast: BroadcastSettings,
    vehicle: () => null, // 임시로 빈 컴포넌트
    parking: ParkingSetting,
    tunnel: TunnelSettings,
    origin: OriginSetting,
    parkingFee: ParkingFeeSetting,
}

export { ServiceSettings }
