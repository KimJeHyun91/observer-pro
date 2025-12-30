import { SignInBase } from './components/SignInBase';
import SignInMobile from './components/SignInMobile';
import { useDeviceStore } from '@/store/common/useDeviceStore'

const SignIn = () => {
    const isMobile = useDeviceStore(state => state.isMobile);

    return isMobile ? <SignInMobile /> : <SignInBase />
}

export default SignIn