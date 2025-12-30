import { ServiceType } from "@/@types/common";

export const useViewMode = (serviceType: ServiceType) => {
	const handleViewModeChange = () => {
		window.open(`/${serviceType}/dashboard`, '_blank', 'noopener,noreferrer');
	};

	return { handleViewModeChange };
};