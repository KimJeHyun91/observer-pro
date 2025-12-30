import { ModalType } from '@/@types/modal'
import { CanvasObject, ClickObject } from '@/@types/canvas'
import ContextMenuTunnel from './ContextMenuTunnel'

type Props = {
  mapType: 'tunnel'
  fabricObject: CanvasObject | null
  object: ClickObject | null
  onClick: ({ show, type, title }: ModalType) => void
  updateLocation: () => void
  updateCameraAngle: () => void
  cameraAngle: boolean
  isControlIn: boolean
}

export default function ContextMenu({
  object,
  onClick,
  updateLocation,
  updateCameraAngle,
  cameraAngle,
  isControlIn
}: Props) {
  const closeContextMenu = () => {
    const menu = document.getElementById('contextMenu')
    if (menu) menu.style.display = 'none'
  }

  const onClickCb = ({ show, type, title }: ModalType) => {
    onClick({ show, type, title })
    closeContextMenu()
  }

  if (!object) {

    return (
      <>
        <li
          className="cursor-pointer hover:bg-blue-300 p-1.5 font-bold"
          onClick={() =>
            onClickCb({
              show: true,
              type: 'tunnelCamera-add',
              title: '카메라 추가',
            })
          }
        >
          카메라 추가
        </li>
        {!isControlIn && (
          <li
            className="cursor-pointer hover:bg-blue-300 p-1.5 font-bold"
            onClick={() =>
              onClickCb({
                show: true,
                type: 'waterLevelControlIn-add',
                title: '수위계 추가',
              })
            }
          >
            수위계 추가
          </li>
        )}
        <li
          className="cursor-pointer hover:bg-blue-300 p-1.5 font-bold"
          onClick={() =>
            onClickCb({
              show: true,
              type: 'waterLevelControlOut-add',
              title: '외부 수위계 추가',
            })
          }
        >
          외부 수위계 추가
        </li>
      </>
    )
  }

  return (
    <ContextMenuTunnel
      type={object?.type ?? ''}
      onClick={onClickCb}
      updateLocation={updateLocation}
      updateCameraAngle={updateCameraAngle}
      close={closeContextMenu}
      cameraAngle={cameraAngle}
    />
  )
}
