import SidePanel from './SidePanel'
import SidePanelMobile from './SidePanelMobile'
import { useDeviceStore } from '@/store/common/useDeviceStore'
import { createElement } from 'react'

const SidePanelWrapper = () => {
  const isMobile = useDeviceStore(state => state.isMobile)
  const Component = isMobile ? SidePanelMobile : SidePanel
  return createElement(Component)
}

export default SidePanelWrapper
