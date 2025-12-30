import BaseMapLayer, {
    ContextMenuData,
    MarkerData,
    MarkerMenuData,
} from '@/components/map/BaseMapLayer'
import Loading from '@/components/shared/Loading'
import { useAreaStore } from '@/store/Inundation/useAreaStore'
import { customIcons } from '@/views/inundation/MapLayer/InundationMapLayer'

import { HiOutlineSpeakerWave } from 'react-icons/hi2'
import ContextMenu from '@/views/main/modals/ContextMenu'
import React, { Suspense, useEffect, useState } from 'react'
import AddBroadcast from '../modals/AddBroadcast'
import { Dialog, Select } from '@/components/ui'
import { apiCreateArea, apiDeleteArea, apiGetAreaInfo } from '@/services/BroadcastService'
import { useBroadcastAccessToken, useBroadcastArea, useBroadcastSites, useBroadcastSpeakerList } from '@/utils/hooks/useBroadcast'
import ReactDOMServer from 'react-dom/server'
import L from 'leaflet'
import { TbDeviceCctv } from 'react-icons/tb'
import DeleteConfirm from '../modals/DeleteConfirm'
import DetailDevice from '../modals/DetailDevice'
import { IoLocation } from "react-icons/io5";
import { PiSpeakerHigh } from "react-icons/pi";
import _ from 'lodash'
import { apiDeleteCamera, apiModifyCamera } from '@/services/ObserverService'
import { BroadcastAreaResponse } from '@/@types/broadcast'
import { useMinimapStore } from '@/store/minimapStore'
import NavigationMinimap from '@/components/map/MinimapBounds'
import axios from 'axios'
import { useSocketConnection } from '@/utils/hooks/useSocketConnection'
import { apiSetInitialMapPosition } from '@/services/InundationService'



interface AreaInformation {
    areaName: string
    areaLocation: string
    // areaCamera: string
    // areaCrossingGate: string
    areaSpeaker: string
    // areaBillboard: string
    // areaGuardianlite: string
    // areaWaterlevelGauge: string
    leftLocation: string
    topLocation: string
    serviceType: string
}

interface WaterlevelLinkInfo {
    selectedWaterlevel: string
    selectedCamera: string
    leftLocation: string
    topLocation: string
}

interface SelectedObject {
    id: number
    type: string
    name?: string
    position: [number, number]
}

const createSpeakerIcon = (color: string) =>
    L.divIcon({
        className: '',
        html: ReactDOMServer.renderToString(<PiSpeakerHigh size={32} color={color} />),
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });

const createDevicesIcon = (color: string) =>
    L.divIcon({
        className: '',
        html: ReactDOMServer.renderToString(<IoLocation size={32} color={color} />),
        iconSize: [32, 32],
        iconAnchor: [16, 32],
    });

export const CameraIcon = L.divIcon({
    className: '',
    html: ReactDOMServer.renderToString(<TbDeviceCctv size={32} />),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
})

    const createGateIcon = (status: boolean) => L.divIcon({
        className: 'custom-div-icon',
        html: `
      <div style="
        position: relative;
        width: 0;
        height: 0;
        border-left: 15px solid transparent;
        border-right: 15px solid transparent;
        border-top: 45px solid ${status ? '#2563eb' : '#dc2626'};
        filter: drop-shadow(0 1px 2px rgba(0,0,0,0.3));
      ">
        <div style="
          position: absolute;
          top: -40px;
          left: -7px;
          width: 14px;
          text-align: center;
          color: white;
          font-size: 11px;
          font-weight: bold;
          text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        ">${status ? 'O' : 'C'}</div>
      </div>
    `,
        iconSize: [30, 45],
        iconAnchor: [15, 45],
    });


interface BroadcastMapProps {
    onMapClick?: (coordinates: { lat: number; lng: number }) => void
    onObjectSelect?: (d: SelectedObject) => void
}


const BroadcastMap = ({ onMapClick, onObjectSelect }: BroadcastMapProps) => {
    const [markers, setMarkers] = useState<MarkerData[]>([])
    const [speakers, setSpeakers] = useState<MarkerData[]>([])
    const [contextMenu, setContextMenu] = useState<ContextMenuData | null>(null)
    const [contextMenuOpen, setContextMenuOpen] = useState(false)

    const [broadcastDeviceMenuOpen, setBroadcastDeviceMenuOpen] = useState<boolean>(false)
    const [areaInformation, setAreaInformation] = useState<AreaInformation>({
        areaName: '',
        areaLocation: '',
        areaSpeaker: '',
        // areaCamera: '',
        // areaCrossingGate: '',
        // areaBillboard: '',
        // areaGuardianlite: '',
        // areaWaterlevelGauge: '',
        leftLocation: '',
        topLocation: '',
        serviceType: 'boardcast',
    })
    const [waterlevelLinkInfo, setWaterlevelLinkInfo] =
        useState<WaterlevelLinkInfo>({
            leftLocation: '',
            topLocation: '',
            selectedWaterlevel: '',
            selectedCamera: '',
        })
    const [deviceDeleteMenuOpen, setDeviceDeleteMenuOpen] = useState(false)
    const [detailDeviceOpen, setDetailDeviceOpen] = useState(false)
    const [detailDevice, setDetailDevice] = useState<BroadcastAreaResponse>()
    const [deviceCameraIdx, setDeviceCamerIdx] = useState<number | null>(null)
    
    const {socketService} = useSocketConnection()

    const minimapState = useMinimapStore((state) => state.use);
    const {speakerList, mutate: getSpeaker} = useBroadcastSpeakerList()
    const { areaList, mutate } = useBroadcastArea()
  

    useEffect(() => {
        if(!socketService) return

        const reserveSocket = socketService.subscribe('vb_areaList-update', (received) => {
            if (received) {
                mutate()
                getSpeaker()
            }
        })

        return () =>{
            reserveSocket()
        }
       
    }, [socketService])


    const handleMarkerClick = async(marker: MarkerData) => {
        const res = await apiGetAreaInfo({idx: Number(marker.outside_idx)})

        if (res?.result[0]?.site_id)  return  // 실내 스피커 상세 화면 제외

        setDetailDeviceOpen(true)
        setDetailDevice(res.result[0])
    }

    const handleMapClick = (coordinates: { lat: number; lng: number }) => {
        setContextMenuOpen(false)
        setAreaInformation((prev) => ({
            ...prev,
            leftLocation: String(coordinates.lng),
            topLocation: String(coordinates.lat),
        }))
    }

    const [deviceId, setDeviceId] = useState<number | null>(null)

    const handleMarkerContextMenu = (data: MarkerMenuData) => {
        if (data === null) {
            setContextMenuOpen(false)
            return
        }
        setDeviceId(data.markerId)
        setContextMenuOpen(true)
    }

    const contextMenuContent = (
        <>
            <div
                onClick={() => {
                    setBroadcastDeviceMenuOpen(true)
                    setContextMenuOpen(false)
                }}
                className="cursor-pointer hover:bg-blue-300 p-1.5 font-bold"
            >
                개소 추가
            </div>
        </>
    )

    const markerMenuContent = (
        <div>
            {/* <div className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' onClick={()=>{
                    setBroadcastDeviceMenuOpen(true)
                    setContextMenuOpen(false)
            }}>장치 추가</div> */}
            <div
                className='cursor-pointer hover:bg-blue-300 p-1.5 font-bold' 
                onClick={async() => {
                    setDeviceDeleteMenuOpen(true)
                    setContextMenuOpen(false)

                    const res = await apiGetAreaInfo({idx: Number(deviceId)})
                    if(res.message === 'ok'){
                        setDeviceCamerIdx(res.result[0].outside_camera_id)
                    }
                 
                }}
            >
                개소 삭제
            </div>
            
        </div>
    )




    const onConfirm = async (device: any, selectedCameraData?: any) => {
        try {
            if (!device) return

            const res = await apiCreateArea({
                outsideName: device.name,
                location: device.location,
                cameraIdx: selectedCameraData?.camera_id,
                vmsName: selectedCameraData?.vms_name,
                useStatus: selectedCameraData?.use_status,
                speakerIp: device.speaker,
                guardianliteIp: device.guardianLight,
                leftLocation: areaInformation.leftLocation,
                topLocation: areaInformation.topLocation,
                service_type: 'broadcast',
            })

            // if(!_.isEmpty(device.camera)){
            //     const vms_name = device.camera.split(':')[1];
            //     const camera_id = device.camera.split(':')[2];
            //     // const res = await apiModifyCamera({
            //     //     camera_id,
            //     //     vms_name,
            //     //     top_location: areaInformation.topLocation,
            //     //     left_location: areaInformation.leftLocation,
            //     //     mainServiceName: 'broadcast',
            //     //     outside_idx: 0,
            //     //     inside_idx: 0
            //     // })

            //  }
           

            if (res.result.status) {
                // mutate()
                setBroadcastDeviceMenuOpen(false)
            } else {
                alert(res.result.message)
            }

            mutate()
        } catch {
        }
    }



    const handleDeleteDevice = async() =>{
        if(!deviceId) return
         await apiDeleteArea({idx: Number(deviceId)})
         if(deviceCameraIdx){
            await apiDeleteCamera({idx: deviceCameraIdx, mainServiceName: 'broadcast'})

         }
         mutate() 
         setDeviceDeleteMenuOpen(false)
    }

    const getMarkerIcon = (type: string, gateStatus: boolean, waterlevel?: { curr_water_level?: string; threshold?: string },linked_status?: boolean,broadcast_device?: {device_name?:string; device_status?: boolean}, speaker_status?: string) => {

        return type === 'broadcast' ? speaker_status ? createSpeakerIcon('green') : createSpeakerIcon('red') : createDevicesIcon('green')
    };

    const [outsideMarkers, setOutsideMarkers] = useState<any>([])

    useEffect(() => {
        // if (areaList?.result?.length > 0) {

            const newMarkers = areaList?.result
                .filter(
                    (area: any) =>
                        area.outside_site_id === null
                )
                .map((area: any): any => {
                    return {
                    ...area,
                    id: area.outside_idx.toString(),
                    position: [
                        parseFloat(area.outside_top_location),
                        parseFloat(area.outside_left_location),
                    ],
                    name: area.outside_name,
                    address: area.outside_location,
                    type: 'broadcast_devices',
                    gateStatus: false,
                    broadcast_device:{
                        device_name: '???',
                        device_status: true
                    },
                    speaker_status: area.speaker_status 
                }})

                setOutsideMarkers(newMarkers)
                // areaList?.result.map((data)=>{
                    
                //     getMarkerIcon(data.speaker_status)
                // })

            // setMarkers(newMarkers)
        // }
    }, [areaList])

    useEffect(() => {
        if (!_.isEmpty(areaList?.result)) {

            const newMarkers = areaList?.result
                .filter(
                    (area: any) =>
                        area.outside_site_id  && area.speaker_left_location && area.speaker_top_location
                )
                .map((item: any): any => {
                    return {
                    ...item,
                    id: item.speaker_idx.toString(),
                    position: [
                        parseFloat(item.speaker_top_location),
                        parseFloat(item.speaker_left_location),
                    ],
                    name: item.outside_name,
                    address: item.speaker_location,
                    type: 'broadcast',
                    gateStatus: false,
                    speaker_name: item.speaker_name,
                    speaker_status: item.speaker_status 
                }})

                 setMarkers(newMarkers)
        }else {
            setMarkers([])
        }
    }, [areaList, speakerList])



    return (
        <>
            <BaseMapLayer
                markers={[...markers, ...(outsideMarkers || [])]}
                customIcons={customIcons}
                getMarkerIcon={getMarkerIcon}
                onMarkerClick={handleMarkerClick}
                onMapClick={handleMapClick}
                onContextMenu={(data) => {
                    setContextMenu(data)
                    setContextMenuOpen(true) 
                    setWaterlevelLinkInfo((prev) => ({
                        ...prev,
                        leftLocation: String(data.latlng.lng),
                        topLocation: String(data.latlng.lat),
                    }))
                    setAreaInformation((prev) => ({
                        ...prev,
                        leftLocation: String(data.latlng.lng),
                        topLocation: String(data.latlng.lat),
                    }))
                }}
                onMarkerContextMenu={handleMarkerContextMenu}
                isContextMenuOpen={contextMenuOpen}
                // contextMenuContent={contextMenuOpen ? contextMenuContent : null}
                // markerMenuContent={contextMenuOpen ? markerMenuContent : null}
            >
                 {minimapState && <NavigationMinimap
                    position="topright"
                    zoomLevelOffset={-3}
                    width={250}
                    height={200}
                />}
            </BaseMapLayer>
           
            {broadcastDeviceMenuOpen && (
                <AddBroadcast
                    show={broadcastDeviceMenuOpen}
                    broadcastMenuOpen={broadcastDeviceMenuOpen}
                    onModalClose={() => setBroadcastDeviceMenuOpen(false)}
                    onConfirm={onConfirm}
                />
            )}
            <DeleteConfirm show={deviceDeleteMenuOpen} title="개소" contents='개소' onClose={() => setDeviceDeleteMenuOpen(false)} onConfirm={()=>handleDeleteDevice()} />
            {detailDeviceOpen && detailDevice && <DetailDevice show={detailDeviceOpen} detailData={detailDevice} onModalClose={() => setDetailDeviceOpen(false)} />}
        </>
    )
}

export default BroadcastMap
