import {
    parkingFeeOutsideInfo,
} from '@/@types/parkingFee'
import DailyChart from './chart/DailyChart'
import TotalChart from './chart/TotalChart'
import MovingCarChart from './chart/MovingCarChart'
import CarTypePieChart from './chart/CarTypePieChart'
import TimeFlowChart from './chart/TimeFlowChart'
import MonthlyUsageChart from './chart/MonthUseChart'

type Props = {
    selectedParking: parkingFeeOutsideInfo
}

const Dashboard = ({ selectedParking }: Props) => {
    console.log(selectedParking);
    return (
        <div className="h-full flex flex-col gap-4 mb-2">
            <div className="grid grid-cols-6 gap-4 h-1/2">
                <DashboardBox title="일일 종합 수익" className="col-span-1">
                    <DailyChart />
                </DashboardBox>
                <DashboardBox title="종합 수익 보고" className="col-span-3">
                    <TotalChart />
                </DashboardBox>
                <DashboardBox title="유동 차량" className="col-span-2">
                    <MovingCarChart />
                </DashboardBox>
            </div>

            <div className="grid grid-cols-6 gap-4 h-1/2">
                <DashboardBox title="차량 종류 비율" className="col-span-1">
                    <CarTypePieChart />
                </DashboardBox>
                <DashboardBox title="시간대별 입출차 흐름" className="col-span-2">
                    <TimeFlowChart />
                </DashboardBox>
                <DashboardBox title="당월 이용률" className="col-span-3">
                    <MonthlyUsageChart />
                </DashboardBox>
            </div>
        </div>
    );
};

export default Dashboard;

const DashboardBox = ({
    title,
    children,
    className = "",
}: {
    title: string;
    children?: React.ReactNode;
    className?: string;
}) => {
    return (
        <div
            className={
                "relative rounded-r rounded-b p-4 flex flex-col bg-white dark:bg-[#2B2B2B] border border-gray-300 dark:border-none " +
                className
            }
        >
            <div
                className="absolute top-0 left-0 w-0 h-0 
                border-l-[35px] border-l-[#8BC53F]
                border-b-[20px] border-b-transparent"
            />

            <div className="font-bold mb-8 text-[#8BC53F] text-[18px]">
                {title}
            </div>

            <div className="flex-1 flex flex-col">
                {children ? (
                    children
                ) : (
                    <div
                        className="
                            flex-1 rounded flex items-center justify-center 
                            bg-gray-300 text-gray-600
                            dark:bg-[#3A3A3A] dark:text-gray-300
                        "
                    >
                        
                    </div>
                )}
            </div>
        </div>
    );
};