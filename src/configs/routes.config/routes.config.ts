import { lazy } from 'react'
import authRoute from './authRoute'
import othersRoute from './othersRoute'
import type { Routes } from '@/@types/routes'
import { asMetaComponent } from '@/@types/utils'

export const publicRoutes: Routes = [...authRoute]

export const mobileRoutes: Routes = [
    {
        key: 'm_observer',
        path: '/m_origin',
        component: lazy(
            () =>
                import(
                    '@/views/mobile/MobileOriginView'
                ),
        ),
        authority: [],
        meta: {
            device: 'mobile',
        },
    },
    {
        key: 'm_parking',
        path: '/m_parking',
        component: lazy(
            () =>
                import(
                    '@/views/mobile/MobileParkingView'
                ),
        ),
        authority: [],
        meta: {
            device: 'mobile',
        },
    },
    {
        key: 'm_parkingFee',
        path: '/m_parkingFee',
        component: lazy(
            () =>
                import(
                    '@/views/mobile/parkingFee/MobileParkingFeeMain'
                ),
        ),
        authority: [],
        meta: {
            device: 'mobile',
        },
    },
    // {
    //     key: 'm_parkingFee.RegisteredVehicles',
    //     path: '/m_parkingFee/RegisteredVehicles',
    //     component: lazy(
    //         () =>
    //             import(
    //                 '@/views/mobile/parkingFee/MobileRegisteredVehicles'
    //             ),
    //     ),
    //     authority: [],
    //     meta: {
    //         device: 'mobile',
    //     },
    // },
    // {
    //     key: 'm_parkingFee.accessLogs',
    //     path: '/m_parkingFee/accessLogs',
    //     component: lazy(
    //         () =>
    //             import(
    //                 '@/views/mobile/parkingFee/MobileAccessLogs'
    //             ),
    //     ),
    //     authority: [],
    //     meta: {
    //         device: 'mobile',
    //     },
    // },
    // {
    //     key: 'm_parkingFee.settlementLogs',
    //     path: '/m_parkingFee/settlementLogs',
    //     component: lazy(
    //         () =>
    //             import(
    //                 '@/views/mobile/parkingFee/MobileSettlementLogs'
    //             ),
    //     ),
    //     authority: [],
    //     meta: {
    //         device: 'mobile',
    //     },
    // },
    // {
    //     key: 'm_parkingFee.kioskLogs',
    //     path: '/m_parkingFee/kioskLogs',
    //     component: lazy(
    //         () =>
    //             import(
    //                 '@/views/mobile/parkingFee/MobileKioskLogs'
    //             ),
    //     ),
    //     authority: [],
    //     meta: {
    //         device: 'mobile',
    //     },
    // },
    // {
    //     key: 'm_parkingFee.idManagement',
    //     path: '/m_parkingFee/idManagement',
    //     component: lazy(
    //         () =>
    //             import(
    //                 '@/views/mobile/parkingFee/MobileIdManagement'
    //             ),
    //     ),
    //     authority: [],
    //     meta: {
    //         device: 'mobile',
    //     },
    // },
];

export const protectedRoutes: Routes = [
    {
        key: 'home',
        path: '/home',
        component: lazy(() => import('@/views/Home')),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    /** Example purpose only, please remove */
    {
        key: 'singleMenuItem',
        path: '/single-menu-view',
        component: lazy(() => import('@/views/demo/SingleMenuView')),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'collapseMenu.item1',
        path: '/collapse-menu-item-view-1',
        component: lazy(() => import('@/views/demo/CollapseMenuItemView1')),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'collapseMenu.item2',
        path: '/collapse-menu-item-view-2',
        component: lazy(() => import('@/views/demo/CollapseMenuItemView2')),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'groupMenu.single',
        path: '/group-single-menu-item-view',
        component: lazy(() => import('@/views/demo/GroupSingleMenuItemView')),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'groupMenu.collapse.item1',
        path: '/group-collapse-menu-item-view-1',
        component: lazy(
            () => import('@/views/demo/GroupCollapseMenuItemView1'),
        ),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'groupMenu.collapse.item2',
        path: '/group-collapse-menu-item-view-2',
        component: lazy(
            () => import('@/views/demo/GroupCollapseMenuItemView2'),
        ),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'observer',
        path: '/origin',
        component: lazy(() => import('@/views/main/OriginalView')),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'observer.dashboard',
        path: '/main/dashboard',
        component: lazy(
            () =>
                import(
                    '@/views/main/components/Dashboard'
                ),
        ),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'inundation',
        path: '/inundation',
        component: lazy(
            () => import('@/views/inundation/MainView/InundationView'),
        ),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'inundation.dashboard',
        path: '/inundation/dashboard',
        component: lazy(
            () => import('@/views/inundation/Dashboard/InundationDashboard'),
        ),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'vehicle',
        path: '/vehicle',
        component: lazy(() => import('@/views/vehicle/VehicleView')),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'parking',
        path: '/parking',
        component: lazy(() => import('@/views/parking/ParkingView')),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'parking.dashboard',
        path: '/parking/dashboard',
        component: lazy(() => import('@/views/parking/parkingDashboard/ParkingDashboard')),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'broadcast',
        path: '/broadcast',
        component: lazy(() => import('@/views/broadcast/BroadcastView')),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'broadcast.dashboard',
        path: '/broadcast/dashboard',
        component: lazy(
            () =>
                import(
                    '@/views/broadcast/broadcastDashboard/BroadcastDashboard'
                ),
        ),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'tunnel',
        path: '/tunnel',
        component: lazy(() => import('@/views/tunnel/TunnelView')),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'tunnel.dashboard',
        path: '/tunnel/dashboard',
        component: lazy(
            () => import('@/views/tunnel/DashBoard/TunnelDashboard'),
        ),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'parkingFee',
        path: '/parkingFee',
        component: lazy(() => import('@/views/parkingFee/ParkingFeeView')),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'parkingFee.carManagement',
        path: '/parkingFee/carManagement',
        component: asMetaComponent(
            lazy(() => import('@/views/parkingFee/components/CarManagement'))
        ),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    {
        key: 'parkingFee.dashboard',
        path: '/parkingFee/dashboard',
        component: asMetaComponent(
            lazy(() => import('@/views/parkingFee/components/Dashboard'))
        ),
        authority: [],
        meta: {
            device: 'desktop'
        }
    },
    ...mobileRoutes,
    ...othersRoute,
]
