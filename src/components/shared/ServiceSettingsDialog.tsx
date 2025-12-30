import React, { useState } from 'react';
import { Dialog } from '@/components/ui';
import { ServiceType } from '@/@types/common';
import { ServiceSettings } from './configPages/settings';
import CustomerSupportInquirySetting from './configPages/settings/CustomerSupportInquirySetting';
import { HiOutlineQuestionMarkCircle, HiArrowLeft } from "react-icons/hi2"; 

interface ServiceSettingsDialogProps {
    serviceType: ServiceType;
    isOpen: boolean;
    onClose: () => void;
}

export const ServiceSettingsDialog = ({
    serviceType,
    isOpen,
    onClose,
}: ServiceSettingsDialogProps) => {
    const [showCustomerSupport, setShowCustomerSupport] = useState(false);
    const prevServiceType = React.useRef<ServiceType>(serviceType);
    
    React.useEffect(() => {
        if (prevServiceType.current !== serviceType) {
            setShowCustomerSupport(false);
            prevServiceType.current = serviceType;
        }
    }, [serviceType]);

    const handleCustomerSupportInquiry = () => {
        setShowCustomerSupport(true);
    };

    const handleBackToSettings = () => {
        setShowCustomerSupport(false);
    };

    const renderContent = () => {
        if (showCustomerSupport) {
            return (
                <div className="h-full flex flex-col">
                    <div className="flex items-center mb-4">
                        <button
                            onClick={handleBackToSettings}
                            className="flex items-center text-gray-600 hover:text-gray-900 mr-2"
                        >
                            <HiArrowLeft />
                            <span className="ml-1">설정으로 돌아가기</span>
                        </button>
                    </div>
                    <CustomerSupportInquirySetting />
                </div>
            );
        }

        const SettingsComponent = ServiceSettings[serviceType];
        return SettingsComponent ? (
            <SettingsComponent onClose={onClose} />
        ) : (
            <div>Loading settings...</div>
        );
    };

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            width={980}
            height={830}
            closable={true}
            contentClassName="!p-5"
        >
            <div className="w-full h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h5 className="font-semibold">설정</h5>

                    {!showCustomerSupport && (
                    <div
                        onClick={handleCustomerSupportInquiry}
                        className="cursor-pointer flex items-center text-green-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 mr-12"
                    >
                        고객센터 문의  
                        <div className='ml-2'><HiOutlineQuestionMarkCircle/></div>
                    </div>
                )}
                </div>
                <div className="w-full border-b-2 border-gray-300 dark:border-gray-700" />

                <div className="flex-1 mt-4 ">
                    {renderContent()}
                </div>
            </div>
        </Dialog>
    );
};