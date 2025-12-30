import authRoute from '@/configs/routes.config/authRoute'
import { useLocation } from 'react-router-dom'
import AuthLayout from './AuthLayout'
import type { CommonProps } from '@/@types/common'
import { useDeviceStore } from '@/store/common/useDeviceStore'

const PreLoginLayout = ({ children }: CommonProps) => {
    const location = useLocation()
    const { pathname } = location
    const isAuthPath = authRoute.some((route) => route.path === pathname)
    const isMobile = useDeviceStore(state => state.isMobile)

    return (
        <div className={isMobile ? '' : 'flex flex-auto flex-col h-[100vh]'}>
            {isAuthPath ? <AuthLayout>{children}</AuthLayout> : children}
        </div>
    )
}

export default PreLoginLayout
