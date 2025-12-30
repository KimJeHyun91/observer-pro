import { CommonProps } from '@/@types/common'
import LayoutBase from '@/components/template/LayoutBase'
import { LAYOUT_MOBILE } from '@/constants/theme.constant'
import Header from '@/components/template/Header'
import UserProfileDropdown from '@/components//template/UserProfileDropdown'
import SidePanel from '@/components/template/SidePanel'
import Logo from '@/components/template/Logo'

const MobileLayout = ({ children }: CommonProps) => {
    
    return (
        <LayoutBase type={LAYOUT_MOBILE}>
            <Header
                className="shadow dark:shadow-2xl"
                headerStart={
                    <>
                       <Logo type="streamline"  logoWidth={30} imgClass="mx-auto rounded-lg" />
                    </>
                }
                headerEnd={
                    <>
                        <SidePanel />
                        <UserProfileDropdown hoverable={false} />
                    </>
                }
            />
            
            <div className="p-3">
                {children}
            </div>
        </LayoutBase>
    )
}

export default MobileLayout
