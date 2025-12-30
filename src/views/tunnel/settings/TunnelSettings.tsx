import MenuGroup from '@/components/ui/Menu/MenuGroup'
import MenuItem from '@/components/ui/Menu/MenuItem'
import React, { useState } from 'react'
import TunnelVmsSetting from './vms/TunnelVmsSetting'
import TunnelCameraSetting from './vms/TunnelCameraSetting'
import TunnelWaterLevelGaugeSetting from './waterLevelGauge/TunnelWaterLevelGaugeSetting'
import TunnelWaterLevelMapping from './waterLevelGauge/TunnelWaterLevelMapping'
import TunnelWaterLevelThreshold from './waterLevelGauge/TunnelWaterLevelThreshold'
import TunnelBillboardSetting from './billboard/TunnelBillboardSetting'
import TunnelEventSetting from './event/TunnelEventSetting'
import TunnelOutsideSetting from './outside/TunnelOutsideSetting'

const menuList = [
    {
        title: '카메라',
        child: [
            {
                title: 'VMS 설정',
            },
            {
                title: '개별 카메라 설정',
            },
        ],
    },
    {
        title: '차단막',
        child: [
            {
                title: '차단막 설정',
            }
        ]
    },
    {
        title: '수위계',
        child: [
            {
                title: '수위계 설정',
            },
            {
                title: '연동 차단기 확인',
            },
            {
                title: '임계치 설정',
            }
        ]
    },
    {
        title: '전광판',
        child: [
            {
                title: '전광판 설정',
            }
        ]
    },
    {
        title: '이벤트',
        child: [
            {
                title: '이벤트 설정',
            }
        ]
    }


]

const TunnelSettings = () => {
    const [selectedMenu, setSelectedMenu] = useState<string>('VMS 설정')

    return (
        <div className="flex divide-x-2 divide-gray-200 dark:divide-gray-700">
            <div className="">
                {menuList.map((menu) => (
                    <MenuGroup
                        // className="bg-gray-100"
                        key={menu.title}
                        label={
                            <div className="font-semibold bg-gray-100 dark:bg-gray-700 dark:text-white px-1 py-1">
                                {menu.title}
                            </div>
                        }
                    >
                        {menu.child.map((item) => {
                            const eventKey = item.title
                            // .toLowerCase()
                            // .replace(/\s/g, '_')

                            return (
                                <MenuItem
                                    className="custom-menu pl-5 min-w-[140px]"
                                    key={item.title}
                                    eventKey={eventKey}
                                    isActive={selectedMenu === eventKey}
                                    onSelect={() => {
                                        setSelectedMenu(eventKey)
                                    }}
                                >
                                    <span className="">{item.title}</span>
                                </MenuItem>
                            )
                        })}
                    </MenuGroup>
                ))}
            </div>


            <div className="flex-1 p-6 h-[740px]">
                {selectedMenu === 'VMS 설정' && (<TunnelVmsSetting />)}
                {selectedMenu === '개별 카메라 설정' && (<TunnelCameraSetting />)}

                {selectedMenu === '차단막 설정' && (<TunnelOutsideSetting />)}

                {selectedMenu === '수위계 설정' && (<TunnelWaterLevelGaugeSetting />)}
                {selectedMenu === '연동 차단기 확인' && (<TunnelWaterLevelMapping />)}
                {selectedMenu === '임계치 설정' && (<TunnelWaterLevelThreshold />)}

                {selectedMenu === '전광판 설정' && (<TunnelBillboardSetting />)}

                {selectedMenu === '이벤트 설정' && (<TunnelEventSetting />)}
            </div>
        </div>
    )
}

export default TunnelSettings
