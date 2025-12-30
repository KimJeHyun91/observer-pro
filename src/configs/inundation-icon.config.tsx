import { 
	PiCheckCircle,
	PiVideoCameraFill,
	PiSpeakerSimpleLowFill,
	PiTextAlignLeftFill,
	PiPowerFill, 
	PiBarricadeFill,
	PiInfoLight,
	PiSpeakerHigh,
	PiWarningLight
} from 'react-icons/pi'

export type InundationIcons = Record<string, JSX.Element>;

const inundationIcon: InundationIcons = {
	warningIcon: <PiWarningLight />,
	checkIcon: <PiCheckCircle />,
	cameraIcon: <PiVideoCameraFill />,
	infoIcon: <PiInfoLight />,
	speakerIcon: <PiSpeakerHigh />,
	billboardIcon: <PiTextAlignLeftFill />,
	guardianliteIcon: <PiPowerFill />,
	crossingGateIcon: <PiBarricadeFill />
};

export default inundationIcon;