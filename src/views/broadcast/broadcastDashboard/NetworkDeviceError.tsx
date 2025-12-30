import { Card, ScrollBar } from '@/components/ui'
import { getNetworkStatus } from '@/services/BroadcastService'
import React, { useEffect, useState } from 'react'
import { MdError } from 'react-icons/md'


const NetworkDeviceError = ({siteId}: {siteId: string[]}) => {

    const [networkErrors, setNetworkErrors] = useState()

    useEffect(()=>{
        const fetchData = async() => {
            const res = await getNetworkStatus()
            if(res.message === 'ok'){
                setNetworkErrors(res.result)
            }
        }
        fetchData()
    },[siteId])

    return (
      
            <ScrollBar className="h-full">
                {networkErrors?.speakers?.map((el) => {
                    return (
                        <div
                            className="bg-[#f3f3f5] dark:bg-gray-600 dark:text-white p-2 mb-2 rounded-md"
                            key={el.name}
                        >
                            <div className='flex items-center '>
                                <p className="text-red-500 text-md font-bold mr-1 text-md">
                                    {el.outsideName}
                                </p>
                                <p className="text-red-500 text-md font-bold text-sm ">
                                    {el.name}
                                </p>
                            </div>
                            <span className="text-xs text-red-500">{el.location}</span>
                        </div>
                    )
                })}
            </ScrollBar>

    )
}

export default NetworkDeviceError
