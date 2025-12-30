import MenuGroup from '@/components/ui/Menu/MenuGroup'
import MenuItem from '@/components/ui/Menu/MenuItem'
import React, { useState } from 'react'
import BroadcastVmsSettings from './BroadcastVmsSettings'
import BroadcastVmsList from './BroadcastVmsList'
import BroadcastVoiceMsgSetting from './BroadcastVoiceMsgSetting'
import BroadcastEventSettings from './BroadcastEventSettings'
import BroadcastFileUploadSetting from './BroadcastFileUploadSetting'
import BroadcastSpeakerSettings from './BroadcastSpeakerSettings'

const menuList = [
    {
        title: '카메라',
        child: [
            {
                title: 'VMS 설정',
            },
        ],
    },
    {
        title: '스피커',
        child: [
            {
                title: '송신기 설정',
            },
            {
                title: 'TTS 설정',
            },
            {
                title: '음원 파일 설정',
            },
        ],
    },
    {
        title: '이벤트',
        child: [
            {
                title: '이벤트 설정',
            },
        ],
    },
]

const BroadcastSettings = () => {
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
                        className="custom-menu pl-5"
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
            {selectedMenu === '송신기 설정' && (<BroadcastSpeakerSettings /> )}
            {selectedMenu === 'VMS 설정' && (<BroadcastVmsSettings /> )}
            {selectedMenu === 'TTS 설정' && (<BroadcastVoiceMsgSetting /> )}
            {selectedMenu === '음원 파일 설정' && (<BroadcastFileUploadSetting /> )}
            {selectedMenu === '이벤트 설정' && <BroadcastEventSettings />}
            </div>
        </div>
    )
}

export default BroadcastSettings
