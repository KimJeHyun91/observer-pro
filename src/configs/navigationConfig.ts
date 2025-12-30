import { useEffect, useState } from 'react'

const BASE_FEATURES = [
    'observer',     // 메인
    'inundation',   // 침수
    'vehicle',      // 차량관리
    'parking',      // 주차관리
    'broadcast',    // 마을방송
    'tunnel',       // 터널
    'parkingFee'    // 주차요금
]

const ALL_FEATURES = [
    ...BASE_FEATURES,
    ...BASE_FEATURES.map((f) => `m_${f}`), // 모바일 버전 추가 ex) m_observer
]

export function useFeatureConfig(): string[] {
    const [features, setFeatures] = useState<string[]>([])

    const isDev = window.location.hostname === '192.168.4.20' || window.location.hostname === 'localhost' && window.location.port === '5173';
    
    useEffect(() => {
        // 개발 서버 전체 메뉴 반환
        if (isDev) {
            setFeatures(ALL_FEATURES)
            return
        }

        // 운영 서버일 경우: config.json 
        fetch('/config.json') 
            .then((res) => res.json())
            .then((data) => setFeatures(data.features || []))
            .catch(() => setFeatures([]))
    }, [])

    return features
}