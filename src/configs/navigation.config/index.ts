import {
    NAV_ITEM_TYPE_ITEM,     // 단일 메뉴 항목
    // NAV_ITEM_TYPE_COLLAPSE  // 하위 메뉴를 포함하는 그룹
} from '@/constants/navigation.constant'

import type { NavigationTree } from '@/@types/navigation'
import { useFeatureConfig } from '../navigationConfig'

const baseMenus: NavigationTree[] = [
    {
        key: 'observer',
        path: '/origin',
        title: 'Origin',
        translateKey: 'nav.origin',
        icon: 'origin',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
        category: 'building',
    },
    {
        key: 'inundation',
        path: '/inundation',
        title: '침수우려차단',
        translateKey: 'nav.inundation',
        icon: 'inundation',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
        category: 'disaster',
    },
    {
        key: 'vehicle',
        path: '/vehicle',
        title: '차량관리',
        translateKey: 'nav.vehicle',
        icon: 'vehicle',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
        category: 'parking',
    },
    {
        key: 'parking',
        path: '/parking',
        title: '주차관리',
        translateKey: 'nav.parking',
        icon: 'parking',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
        category: 'parking',
    },
    {
        key: 'broadcast',
        path: '/broadcast',
        title: '마을방송',
        translateKey: 'nav.broadcast',
        icon: 'broadcast',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
        category: 'disaster',
    },
    {
        key: 'tunnel',
        path: '/tunnel',
        title: '터널관리',
        translateKey: 'nav.tunnel',
        icon: 'tunnel',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
        category: 'disaster',
    },
    {
        key: 'parkingFee',
        path: '/parkingFee',
        title: '주차요금',
        translateKey: 'nav.parkingFee',
        icon: 'parkingFee',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [
            // ex) subMenu 작성 예제
            {
                key: 'parkingFee.carManagement',
                path: '/parkingFee/carManagement',
                title: '차량관리',
                translateKey: 'nav.carManagement.',
                icon: 'carManagement',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
            {
                key: 'parkingFee.dashboard',
                path: '/parkingFee/dashboard',
                title: '운영현황',
                translateKey: 'nav.dashboard.',
                icon: 'dashboard',
                type: NAV_ITEM_TYPE_ITEM,
                authority: [],
                subMenu: [],
            },
        ],
        category: 'parking',
    },
]

// 모바일용 메뉴 생성 (PC 메뉴에서 파생)
const mobileMenus: NavigationTree[] = baseMenus.map((menu) => {
    const subMenu = menu.subMenu?.map((sub) => ({
        ...sub,
        key: `m_${sub.key}`,
        path: `/m_${sub.path.replace('/', '')}`,
    })) ?? []

    return {
        ...menu,
        key: `m_${menu.key}`,
        path: `/m_${menu.path.replace('/', '')}`,
        subMenu: subMenu,
    }
})

const fullNavigationConfig: NavigationTree[] = [
    {
        key: 'home',
        path: '/home',
        title: 'Home',
        translateKey: 'nav.home',
        icon: 'home',
        type: NAV_ITEM_TYPE_ITEM,
        authority: [],
        subMenu: [],
    },
    ...baseMenus,
    ...mobileMenus,
]

export const useNavigationConfig = (): NavigationTree[] => {
    const enabledFeatures = useFeatureConfig()

    return fullNavigationConfig.filter((item) => 
        enabledFeatures.includes(item.key)
    )
}
