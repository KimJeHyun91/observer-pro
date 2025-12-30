import { useEffect, useState } from 'react'
import MenuItem from './MenuItem'
import { ServiceType, ViewMode } from '@/@types/common'
import { ServiceSettingsDialog } from './ServiceSettingsDialog'
import { useDataStatusStore } from '@/store/useDataStatusStore'
import { useServiceNavStore } from '@/store/serviceNavStore'
import { useMinimapStore } from '@/store/minimapStore'
import LogDataDialog from './LogDataDialog'
import { FcDoughnutChart } from 'react-icons/fc'

type Props = {
    type: 'service' | 'common' | 'switchingMode'
    onViewModeChange?: (mode: ViewMode) => void
    currentView?: 'main' | 'dashboard'
    serviceType: ServiceType
}

export type menuItems = {
    label: string
    value: string
}

const serviceMenuItems = [
    {
        label: '로그',
        value: 'log',
        checked: false,
    },
    {
        label: '설정',
        value: 'setting',
        checked: false,
    },
]

const commonMenuItems = [
    {
        label: '데이터 메뉴',
        value: 'data',
        checked: true,
    },
    {
        label: '서비스 메뉴',
        value: 'service',
        checked: true,
    },
    {
        label: '미니 맵',
        value: 'minimap',
        checked: true,
    },
]

const switchingModeMenutItem = [
    {
        label: 'Switching',
        value: 'switchingMode',
        checked: true,
    },
]

type MenuItemType =
    | 'log'
    | 'setting'
    | 'data'
    | 'service'
    | 'minimap'
    | 'switchingMode'

const getMenuItems = (type: 'service' | 'common' | 'switchingMode', serviceType: ServiceType) => {
    if (type === 'service') {
        /* 서비스 메뉴에서도 안쓰는 메뉴가 있을 경우 추가 해주면 됨
            ex) if (serviceType === 'parking') {
                    return serviceMenuItems.filter(item => 
                        !['setting'].includes(item.value)
                );
        } */

        if (serviceType === 'parkingFee') {
            return serviceMenuItems.filter(item =>
                !['log'].includes(item.value)
            );
        }

        return serviceMenuItems;
    }

    if (type === 'common') {
        // 커먼에 안쓰는 메뉴가 있을 경우 추가 해주면 됨
        if (serviceType === 'parking') {
            return commonMenuItems.filter(item =>
                !['minimap'].includes(item.value)
            );
        } else if (serviceType === 'parkingFee') {
            return commonMenuItems.filter(item =>
                !['minimap', 'data'].includes(item.value)
            );
        } else if (serviceType === 'tunnel') {
            return commonMenuItems.filter(item =>
                ['service','minimap'].includes(item.value)
            );
        }
        return commonMenuItems;
    }

    return switchingModeMenutItem;
}

export default function MenuBox({
    type,
    onViewModeChange,
    currentView,
    serviceType,
}: Props) {
    const [menuItems, setMenuItems] = useState(
        getMenuItems(type, serviceType)
    )
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [logDataOpen, setLogDataOpen] = useState(false)
    const { setNavServiceState } = useServiceNavStore()
    const { setMinimapServiceState } = useMinimapStore()
    const tabState = useDataStatusStore((state) => state.tabs[serviceType])
    const setTabState = useDataStatusStore((state) => state.setTabState)

    useEffect(() => {
        if (tabState) {
            setMenuItems((prevItems) =>
                prevItems.map((menuItem) => ({
                    ...menuItem,
                    checked:
                        tabState[menuItem.value as keyof typeof tabState] ??
                        menuItem.checked,
                })),
            )
        }
    }, [tabState])

    useEffect(() => {
        if (tabState && currentView !== 'dashboard') {
            const serviceChecked = tabState['service'] ?? false
            const minimapChecked = tabState['minimap'] ?? false

            setNavServiceState(!serviceChecked)
            setMinimapServiceState(!minimapChecked)
        }
    }, [tabState, setNavServiceState, setMinimapServiceState, currentView])

    const onClick = (value: MenuItemType) => {
        if (tabState) {
            if (value === 'switchingMode' && onViewModeChange) {
                onViewModeChange(
                    currentView === 'main' ? 'dashboard' : ('main' as ViewMode),
                )
            } else if (value === 'setting') {
                setSettingsOpen(!settingsOpen)
            } else if (value === 'log') {
                setLogDataOpen(!logDataOpen)
            }

            if (currentView === 'dashboard' && value === 'service') {
                return;
            }
            const newState = { [value]: !tabState[value] }
            const key = Object.keys(newState)[0]
            const checked = newState[key]
            setMenuItems(
                menuItems.map((menuItem) => {
                    if (menuItem.value === key) {
                        menuItem.checked = checked

                        if (value === 'service' && currentView !== 'dashboard') {
                            setNavServiceState(!checked)
                        } else if (value === 'minimap') {
                            setMinimapServiceState(!checked)
                        }
                    }
                    return menuItem
                }),
            )

            setTabState(serviceType, newState)
        }
    }

    const closeSettingDialog = () => {
        const newState = { setting: !tabState['setting'] }
        const checked = newState['setting']

        setMenuItems(
            menuItems.map((menuItem) => {
                if (menuItem.value === 'setting') {
                    menuItem.checked = checked
                }
                return menuItem
            }),
        )
        setTabState(serviceType, newState)
        setSettingsOpen(false)
    }

    const closeLogDataDialog = () => {
        setMenuItems((prev) =>
            prev.map((menuItem) => ({
                ...menuItem,
                checked: menuItem.value === 'log' ? false : menuItem.checked
            }))
        );

        setTabState(serviceType, { log: false })
        setLogDataOpen(false)
    }

    return (
        <div className="flex items-center gap-3">
            {type === 'service' && (
                <div className="bg-gray-200 dark:bg-gray-800 rounded-md border border-gray-300 py-1 px-1 flex gap-1 mr-2">
                    {menuItems.map((menu) => (
                        <MenuItem
                            key={menu.label}
                            label={menu.label}
                            active={menu.checked}
                            value={menu.value}
                            onClick={(value) => onClick(value as MenuItemType)}
                        />
                    ))}
                </div>
            )}

            {type === 'common' && currentView !== 'dashboard' && (
                <div className="flex gap-1">
                    <div className="bg-gray-200 rounded-md border border-gray-300 py-1 px-1 flex gap-1 mr-2 dark:bg-gray-800">
                        {menuItems.map((menu) => (
                            <MenuItem
                                key={menu.label}
                                label={menu.label}
                                active={menu.checked}
                                value={menu.value}
                                onClick={(value) => onClick(value as MenuItemType)}
                            />
                        ))}
                    </div>
                </div>
            )}

            {type === 'switchingMode' && (
                <button
                    onClick={() => onClick('switchingMode')}
                    className={`
                        h-9
                        px-4
                        flex items-center gap-2
                        bg-white
                        rounded-md
                        border border-gray-300
                        hover:bg-gray-50
                        transition-colors
                        ml-auto
                        dark:bg-gray-700
                        
                    `}
                >
                    <span className="text-gray-700 dark:text-white font-semibold">
                        {currentView === 'main' ? '대시보드' : 'Main'}
                    </span>
                    <span className="text-2xl">
                        <FcDoughnutChart />
                    </span>
                </button>
            )}

            <ServiceSettingsDialog
                serviceType={serviceType}
                isOpen={settingsOpen}
                onClose={closeSettingDialog}
            />

            <LogDataDialog
                // onSearch={handleSearchForm} 
                serviceType={serviceType}
                isOpen={logDataOpen}
                width={serviceType === 'origin' ? 1500 : 1300}
                onClose={closeLogDataDialog}
            />
        </div>
    );
}