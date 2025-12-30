import { useFeatureConfig } from "./navigationConfig"
import { useDeviceStore } from "@/store/common/useDeviceStore"

export function useAuthenticatedEntryPath(): string {
    const features = useFeatureConfig()
    const isMobile = useDeviceStore((state) => state.isMobile)

    const routerPath: Record<string, string> = {
        observer: 'origin',
        inundation: 'inundation',
        vehicle: 'vehicle',
        parking: 'parking',
        broadcast: 'broadcast',
        parkingFee: 'parkingFee',
        m_observer: 'm_origin',
        m_inundation: 'm_inundation',
        m_vehicle: 'm_vehicle',
        m_parking: 'm_parking',
        m_broadcast: 'm_broadcast',
        m_parkingFee: 'm_parkingFee',
    }

    if (!features.length) return ''

    const targetRouter = features.find((f) =>
        isMobile ? f.startsWith('m_') : !f.startsWith('m_')
    )
    
    const fallback = targetRouter ?? features[0]
    const path = routerPath[fallback] ?? fallback

    return `/${path}`
}