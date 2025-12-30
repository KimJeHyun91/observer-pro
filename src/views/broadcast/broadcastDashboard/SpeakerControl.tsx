import { Button, Card, ScrollBar, Switcher } from '@/components/ui'
import { useBroadcastSpeakerList } from '@/utils/hooks/useBroadcast'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection'
import React, { ChangeEvent, useEffect, useState } from 'react'


const SpeakerControl = () => {
    const {mutate, speakerList} = useBroadcastSpeakerList()
    const { socketService } = useSocketConnection()
    // const [switcherState, setSwitcherState] = useState([])

    useEffect(() => {
        if (!socketService) {
            return;
        }

        const speakerSocket = socketService.subscribe('vb_speaker-update', (received) => {
            if (received) {
                mutate();
            }
        });

        return () => {
            speakerSocket();
        };
    }, [socketService]);

    // const handleSwitcherChange = (
    //     checked: boolean,
    //     e: ChangeEvent<HTMLInputElement>,
    //     device: string,
    // ) => {
    //     setSwitcherState((prevState) =>
    //         prevState.map((item) =>
    //             item.device === device ? { ...item, isActive: checked } : item,
    //         ),
    //     )
    // }

    return (
        // <Card
        //     className="custom-card w-[55%]"
        //     header={{
        //         content: <h5>스피커 제어</h5>,
        //     }}
        // >
        <ScrollBar className='h-full' >
            <div className="scroll-container overflow-y-auto ">
                {speakerList?.result?.map((el) => {
                    return (
                        <div key={el.speaker_idx} className="">
                            <div
                                className="flex items-center justify-between w-[100%] bg-[#f3f3f5] dark:bg-gray-600 dark:text-white p-2 px-2 mb-2 rounded-md"
                                key={el.speaker_idx}
                            >
                                <div>
                                    <div className='flex items-center mb-2'>
                                        <p className='mr-1 font-bold text-md'>{el.outside_name}</p>
                                        <p className="text-sm">
                                            {el.speaker_name}
                                        </p>
                                    </div>
                                    <p className="text-xs">
                                         {el.speaker_location}
                                    </p>
                                </div>
                                <span className={`text-xs text-center font-bold w-[70px] p-1 py-2 rounded-lg ${el.speaker_status === 'ON' ? 'text-green-500 border-2 border-green-500' : 'text-red-500 border-2 border-red-500'}`}>{el.speaker_status === 'ON' ? '활성화' : '비활성화'}</span>
                            </div>
                         
                        </div>
                    )
                })}
            </div>
          
        </ScrollBar>
    )
}

export default SpeakerControl


